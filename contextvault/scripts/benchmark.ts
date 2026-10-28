import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { performance } from 'node:perf_hooks';

// A reproducible smoke benchmark, NOT a production sizing or quality claim.
const count=Math.max(100,Math.min(Number(process.env.BENCHMARK_ROWS||500),10000));
const queries=Math.max(1,Math.min(Number(process.env.BENCHMARK_QUERIES||10),100));
let state=123456789; function random() { state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296; }
function makeVector() { const v=Array.from({length:1536},()=>random()*2-1);const norm=Math.sqrt(v.reduce((sum,n)=>sum+n*n,0));return v.map(n=>Number((n/norm).toFixed(6))); }
function literal(v:number[]) { return `[${v.join(',')}]`; }
function percentile(a:number[],p:number){return [...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];}
async function main(){
  const db=await PGlite.create('memory://',{extensions:{vector}});await db.exec('CREATE EXTENSION vector; CREATE TABLE bench(id integer PRIMARY KEY,embedding vector(1536));');
  const samples:number[][]=[];
  for(let i=0;i<count;i++){const v=makeVector();if(i<queries)samples.push(v);await db.query('INSERT INTO bench VALUES($1,$2::vector)',[i,literal(v)]);}
  const start=performance.now();await db.exec('CREATE INDEX bench_hnsw ON bench USING hnsw(embedding vector_cosine_ops) WITH (m=16,ef_construction=64);');const buildMs=performance.now()-start;
  const approx:number[]=[],exact:number[]=[];const recalls:number[]=[]; let indexPlan='';
  for(const v of samples){const q=literal(v);await db.exec('SET enable_seqscan=off; SET enable_indexscan=on; SET hnsw.ef_search=40;');if (!indexPlan) { const plan=await db.query('EXPLAIN SELECT id FROM bench ORDER BY embedding <=> $1::vector LIMIT 5',[q]); indexPlan=plan.rows.map((r:any)=>r['QUERY PLAN']).join(' '); if(!indexPlan.includes('Index Scan')) throw new Error('HNSW index was not used by the benchmark query.'); } let t=performance.now();const ann=(await db.query<{id:number}>('SELECT id FROM bench ORDER BY embedding <=> $1::vector LIMIT 5',[q])).rows.map(r=>r.id);approx.push(performance.now()-t);
    await db.exec('SET enable_seqscan=on; SET enable_indexscan=off; SET enable_bitmapscan=off;');t=performance.now();const truth=(await db.query<{id:number}>('SELECT id FROM bench ORDER BY embedding <=> $1::vector LIMIT 5',[q])).rows.map(r=>r.id);exact.push(performance.now()-t);recalls.push(ann.filter(id=>truth.includes(id)).length/truth.length);}
  console.log(JSON.stringify({engine:'PGlite + pgvector, in-memory',dataset:`${count} seeded random vectors, 1536 dimensions`,queries:samples.length,topK:5,indexUsed:indexPlan.includes('bench_hnsw'),hnswBuildMs:Math.round(buildMs),approximateP50Ms:percentile(approx,.5),approximateP95Ms:percentile(approx,.95),exactP95Ms:percentile(exact,.95),meanRecallAt5:recalls.reduce((a,b)=>a+b,0)/recalls.length,warning:'Synthetic small-scale smoke test; filtered recall, production load, memory and real embeddings require separate measurement.'},null,2));await db.close();
}
main().catch(error=>{console.error(error);process.exit(1)});
