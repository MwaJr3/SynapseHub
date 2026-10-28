import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from './db';
const scrypt = promisify(scryptCallback);
export const COOKIE = 'cv_session';
export interface SessionUser { id:string; email:string; display_name:string; role:'user'|'developer' }
export async function hashPassword(password:string):Promise<string> {
  const salt = randomBytes(16).toString('hex'); const key = await scrypt(password,salt,64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password:string, stored:string):Promise<boolean> {
  const [salt,hex] = stored.split(':'); if (!salt || !hex) return false;
  const expected = Buffer.from(hex,'hex'); const actual = await scrypt(password,salt,64) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected,actual);
}
export function cookieValue(request:Request, name:string):string | null {
  const cookies = request.headers.get('cookie') || '';
  return cookies.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length+1) || null;
}
export async function createSession(userId:string):Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await (await database()).query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[createHash('sha256').update(token).digest('hex'),userId]);
  return token;
}
export async function getUser(request:Request):Promise<SessionUser | null> {
  const token = cookieValue(request,COOKIE); if (!token || token.length > 100) return null;
  const hash = createHash('sha256').update(token).digest('hex');
  return (await (await database()).query<SessionUser>(`SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash])).rows[0] || null;
}
export async function deleteSession(request:Request) {
  const token = cookieValue(request,COOKIE); if (token) await (await database()).query('DELETE FROM sessions WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);
}
export function sameOrigin(request:Request) {
  const origin = request.headers.get('origin'); if (!origin) return; // non-browser API clients
  let host:string; try { host = new URL(origin).host; } catch { throw new Error('Invalid request origin.'); }
  const allowed = [request.headers.get('host'),request.headers.get('x-forwarded-host'),new URL(request.url).host].filter(Boolean);
  if (!allowed.includes(host)) throw new Error('Invalid request origin.');
}
export async function rateLimit(request:Request, scope:string, limit:number) {
  // Configure the reverse proxy to overwrite X-Forwarded-For in production.
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const row = (await (await database()).query(`INSERT INTO rate_limits(key,count,window_start) VALUES($1,1,now())
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start < now()-interval '1 minute' THEN 1 ELSE rate_limits.count+1 END,
    window_start=CASE WHEN rate_limits.window_start < now()-interval '1 minute' THEN now() ELSE rate_limits.window_start END RETURNING count`,[key])).rows[0];
  if (row.count > limit) throw new Error('Too many requests. Please try again in a minute.');
}
