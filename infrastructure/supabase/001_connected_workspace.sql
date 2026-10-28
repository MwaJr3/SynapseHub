-- Additive migration. All functions execute with caller RLS, never service-role privileges.
create table public.sh_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2000000),
  updated_at timestamptz not null default now()
);
alter table public.sh_workspaces enable row level security;
create policy sh_workspace_owner on public.sh_workspaces for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create table public.sh_documents (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  sha256 text not null,
  pdf bytea not null check (octet_length(pdf) <= 5242880),
  pages integer not null check (pages between 1 and 100),
  created_at timestamptz not null default now(),
  unique(owner_id, sha256), unique(id, owner_id)
);
alter table public.sh_documents enable row level security;
create policy sh_document_owner on public.sh_documents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create table public.sh_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  owner_id uuid not null default auth.uid(),
  page integer not null check (page between 1 and 100),
  ordinal integer not null,
  text text not null check (length(text) between 1 and 2000),
  search tsvector generated always as (to_tsvector('english', text)) stored,
  foreign key(document_id, owner_id) references public.sh_documents(id, owner_id) on delete cascade
);
create index sh_chunks_search on public.sh_chunks using gin(search);
create index sh_chunks_owner_document on public.sh_chunks(owner_id, document_id);
alter table public.sh_chunks enable row level security;
create policy sh_chunk_owner on public.sh_chunks for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create function public.sh_save_workspace(expected_revision bigint, new_payload jsonb)
returns setof public.sh_workspaces language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.sh_workspaces(owner_id, revision, payload)
    values(auth.uid(), 0, '{"version":1,"revision":0,"items":[],"relations":[]}') on conflict do nothing;
  return query update public.sh_workspaces set payload = new_payload, revision = revision + 1, updated_at = now()
    where owner_id = auth.uid() and revision = expected_revision returning *;
end;
$$;

create function public.sh_ingest_pdf(doc_id uuid, doc_title text, digest text, pdf_base64 text, page_count integer, chunks jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(chunks) <> 'array' or jsonb_array_length(chunks) > 2000 then raise exception 'invalid chunks'; end if;
  insert into public.sh_documents(id, title, sha256, pdf, pages)
    values(doc_id, doc_title, digest, decode(pdf_base64, 'base64'), page_count)
    on conflict(owner_id, sha256) do nothing returning id into result;
  if result is null then
    select id into result from public.sh_documents where owner_id = auth.uid() and sha256 = digest;
    return result;
  end if;
  insert into public.sh_chunks(document_id, page, ordinal, text)
    select result, (value->>'page')::integer, (value->>'ordinal')::integer, value->>'text'
    from jsonb_array_elements(chunks);
  return result;
end;
$$;
create function public.sh_search_chunks(question text, selected_sources uuid[])
returns table(id uuid, document_id uuid, page integer, text text, title text, rank real)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.document_id, c.page, c.text, d.title,
    ts_rank_cd(c.search, websearch_to_tsquery('english', question)) as rank
  from public.sh_chunks c join public.sh_documents d on d.id = c.document_id
  where c.owner_id = auth.uid() and d.owner_id = auth.uid()
    and c.document_id = any(selected_sources)
    and c.search @@ websearch_to_tsquery('english', question)
  order by rank desc, c.id limit 8;
$$;
revoke all on public.sh_workspaces, public.sh_documents, public.sh_chunks from anon;
grant select, insert, update, delete on public.sh_workspaces, public.sh_documents, public.sh_chunks to authenticated;
revoke all on function public.sh_save_workspace(bigint,jsonb), public.sh_ingest_pdf(uuid,text,text,text,integer,jsonb), public.sh_search_chunks(text,uuid[]) from public, anon;
grant execute on function public.sh_save_workspace(bigint,jsonb), public.sh_ingest_pdf(uuid,text,text,text,integer,jsonb), public.sh_search_chunks(text,uuid[]) to authenticated;
