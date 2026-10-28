import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { database, withUser } from '../db';
import { putObject } from '../storage';
import { processDocument } from './processor';
import { SAMPLE_COLLECTIONS, SAMPLES } from './samples';
import { hashPassword } from '../auth';
export const DEMO_EMAIL = 'alex@contextvault.demo';
declare global { var __contextvaultSeed: Promise<string> | undefined; }
export function demoEnabled() { return process.env.DEMO_MODE === 'true' || (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false'); }
export async function seedDemo():Promise<string> {
  if (!globalThis.__contextvaultSeed) globalThis.__contextvaultSeed = (async () => {
    const db = await database(); const existing = (await db.query('SELECT id FROM users WHERE email=$1',[DEMO_EMAIL])).rows[0];
    if (existing) return existing.id;
    const owner = randomUUID();
    await db.query(`INSERT INTO users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'developer')`,[owner,DEMO_EMAIL,'Alex Morgan',await hashPassword(randomBytes(32).toString('hex'))]);
    const collectionIds:string[] = [];
    for (const c of SAMPLE_COLLECTIONS) {
      const id=randomUUID(); collectionIds.push(id);
      await withUser(owner, async tx => { await tx.query('INSERT INTO collections(id,owner_id,name,description,color) VALUES($1,$2,$3,$4,$5)',[id,owner,c.name,c.description,c.color]); });
    }
    for (const [index,sample] of SAMPLES.entries()) {
      const id = randomUUID(), bytes = Buffer.from(sample.text), key=`${owner}/${id}`;
      await putObject(key,bytes,'text/markdown');
      await withUser(owner, async tx => { await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum,tags,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()-($10 * interval '1 day'))`,[id,owner,collectionIds[sample.collection],sample.filename,'text/markdown',bytes.length,key,createHash('sha256').update(bytes).digest('hex'),sample.tags,index+1]); });
      await processDocument(owner,id);
    }
    return owner;
  })().catch(error => { globalThis.__contextvaultSeed = undefined; throw error; });
  return globalThis.__contextvaultSeed;
}
