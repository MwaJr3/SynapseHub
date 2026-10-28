import { loadEnvConfig } from '@next/env';
import cases from '../samples/evaluation.json';
import { seedDemo } from '../lib/documents/seed';
import { withUser } from '../lib/db';
import { runRag } from '../lib/rag/pipeline';
loadEnvConfig(process.cwd());
async function main() {
  const owner=await seedDemo();const rows=[];
  for(const item of cases) {
    const collection=await withUser(owner,async tx=>(await tx.query('SELECT id FROM collections WHERE owner_id=$1 AND name=$2',[owner,item.collection])).rows[0]);
    if(!collection) throw new Error(`Missing sample collection: ${item.collection}`);
    const result=await runRag(owner,collection.id,item.question);
    const matches=result.chunks.filter(c=>c.filename===item.expectedDocument);
    const sectionHit=matches.some(c=>c.section_title===item.expectedSection);
    rows.push({question:item.question,expectedDocument:item.expectedDocument,retrieved:result.chunks.length,precision:result.chunks.length?matches.length/result.chunks.length:0,documentRecall:matches.length?1:0,sectionHit,validCitationReferences:result.used.length ? result.used.every(n=>!!result.chunks[n-1]) : null,latencyMs:result.timings.totalMs,model:result.model});
  }
  console.log(JSON.stringify({dataset:'fictional-v1',limitations:'Document-level recall with one expected source per question. Citation reference validity is not faithfulness. Human review is required.',results:rows,meanPrecision:rows.reduce((s,r)=>s+r.precision,0)/rows.length,meanDocumentRecall:rows.reduce((s,r)=>s+r.documentRecall,0)/rows.length},null,2));
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1)});
