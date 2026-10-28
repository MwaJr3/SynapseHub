-- Run as migration owner against a development Supabase database.
-- All fixtures, including auth users, are rolled back. No email is sent.
begin;
create temporary table sh_security_fixture as
select gen_random_uuid() as owner_id, gen_random_uuid() as other_id,
       gen_random_uuid() as doc_id, gen_random_uuid() as other_doc_id;
grant select on sh_security_fixture to authenticated;
insert into auth.users(id)
  select owner_id from sh_security_fixture union all select other_id from sh_security_fixture;
insert into public.sh_documents(id,owner_id,title,sha256,pdf,pages)
  select doc_id,owner_id,'Owner fixture','owner-fixture',decode('255044462d','hex'),1 from sh_security_fixture
  union all select other_doc_id,other_id,'Other fixture','other-fixture',decode('255044462d','hex'),1 from sh_security_fixture;
insert into public.sh_chunks(document_id,owner_id,page,ordinal,text)
  select doc_id,owner_id,1,0,'Voltage is measured in volts.' from sh_security_fixture
  union all select other_doc_id,other_id,1,0,'Private voltage passage.' from sh_security_fixture;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',(select owner_id::text from sh_security_fixture),'role','authenticated')::text,true);
do $$
declare n integer;
begin
  select count(*) into n from public.sh_documents;
  if n <> 1 then raise exception 'Document RLS failed'; end if;
  select count(*) into n from public.sh_chunks;
  if n <> 1 then raise exception 'Chunk RLS failed'; end if;
  select count(*) into n from public.sh_search_chunks('voltage',array[(select other_doc_id from sh_security_fixture)]);
  if n <> 0 then raise exception 'Cross-user source leaked'; end if;
  select count(*) into n from public.sh_search_chunks('voltage',array[(select doc_id from sh_security_fixture)]);
  if n <> 1 then raise exception 'Own retrieval failed'; end if;
  select count(*) into n from public.sh_save_workspace(0,'{"version":1,"revision":0,"items":[],"relations":[]}');
  if n <> 1 then raise exception 'Initial CAS write failed'; end if;
  select count(*) into n from public.sh_save_workspace(0,'{"version":1,"revision":0,"items":[],"relations":[]}');
  if n <> 0 then raise exception 'Stale CAS write accepted'; end if;
end $$;
rollback;
