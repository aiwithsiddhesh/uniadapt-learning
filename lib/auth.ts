import bcrypt from 'bcryptjs';
import type {Account,Principal,AuthConfig,Institution,Role} from './access-types.ts';
import {ProductError} from './engine.ts';
import type {AuthPolicy} from './academic-types.ts';
export const SESSION_COOKIE='uniadapt_session';
const roles:Role[]=['ADMIN','TEACHER','STUDENT'];
const enc=new TextEncoder();
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const bytes=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
export function cleanEmail(value:unknown){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value.trim()))throw new ProductError('Enter a valid email address.');return value.trim().toLowerCase();}
export function checkPassword(value:unknown):asserts value is string{if(typeof value!=='string'||value.length<12||enc.encode(value).length>72)throw new ProductError('Use a password with at least 12 characters and at most 72 UTF-8 bytes.');}
export const passwordHash=async(value:string)=>{checkPassword(value);return bcrypt.hash(value,10);};
export const tokenHash=async(value:string)=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));
export const randomToken=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
function key(config:AuthConfig){if(config.secret.length<32)throw new ProductError('Authentication is not configured.',503);return crypto.subtle.importKey('raw',enc.encode(config.secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export function principal(account:Account):Principal{return {id:account.id,campusId:account.campus_id,email:account.email,name:account.name,role:account.role,learnerId:account.learner_id,courseIds:JSON.parse(account.course_ids),tokenVersion:account.token_version};}
export async function signSession(account:Account,config:AuthConfig,now=new Date()){
 const iat=Math.floor(now.getTime()/1000);const payload={sub:account.id,role:account.role,tv:account.token_version,campus:account.campus_id,iss:config.issuer,aud:'uniadapt',iat,exp:iat+4*3600};const unsigned=b64(enc.encode(JSON.stringify({alg:'HS256',typ:'JWT'})))+'.'+b64(enc.encode(JSON.stringify(payload)));const signature=await crypto.subtle.sign('HMAC',await key(config),enc.encode(unsigned));return unsigned+'.'+b64(new Uint8Array(signature));
}
export function readCookie(request:Request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1)||null;}
export function sessionCookie(token:string){return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400`;}
export const clearCookie=()=>`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function authenticate(db:D1Database,token:string|null,config:AuthConfig,now=new Date()):Promise<Principal>{
 try{
  if(!token||token.length>4096)throw new Error();const parts=token.split('.');if(parts.length!==3)throw new Error();const header=JSON.parse(new TextDecoder().decode(bytes(parts[0])));if(header.alg!=='HS256'||header.typ!=='JWT')throw new Error();
  if(!await crypto.subtle.verify('HMAC',await key(config),bytes(parts[2]),enc.encode(parts[0]+'.'+parts[1])))throw new Error();
  const p=JSON.parse(new TextDecoder().decode(bytes(parts[1])));const t=Math.floor(now.getTime()/1000);if(p.iss!==config.issuer||p.aud!=='uniadapt'||typeof p.sub!=='string'||!roles.includes(p.role)||!Number.isInteger(p.tv)||!Number.isInteger(p.iat)||!Number.isInteger(p.exp)||p.iat>t+30||p.exp<=t||p.exp-p.iat!==14400)throw new Error();
  const account=await db.prepare('SELECT * FROM accounts WHERE id = ? AND campus_id = ?').bind(p.sub,p.campus).first<Account>();if(!account||!account.active||(account.role==='STUDENT'&&!account.learner_id)||account.role!==p.role||account.token_version!==p.tv)throw new Error();return principal(account);
 }catch(error){if(error instanceof ProductError&&error.status===503)throw error;throw new ProductError('Sign in to your UniAdapt account.',401);}
}
export async function institution(db:D1Database){return db.prepare("SELECT * FROM institutions WHERE id = 'default'").first<Institution>();}
export async function authAudit(db:D1Database,campusId:string,actorId:string|null,action:string,now=new Date()){await db.prepare('INSERT INTO security_audit (id,campus_id,actor_id,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),campusId,actorId,action,now.toISOString()).run();}
async function buckets(email:string,ip:string){return ['account:'+await tokenHash(email),'ip:'+await tokenHash(ip||'private-site')];}
export async function checkThrottle(db:D1Database,email:string,ip:string,now=new Date()){
 const policy=await throttlePolicy(db);for(const k of await buckets(email,ip)){const row=await db.prepare('SELECT count,window_start FROM auth_limits WHERE key = ?').bind(k).first<{count:number;window_start:number}>();if(row&&now.getTime()-row.window_start<policy.windowSeconds*1000&&row.count>=(k.startsWith('account:')?policy.accountAttempts:policy.ipAttempts))throw new ProductError(`Too many attempts. Try again after ${policy.windowSeconds} seconds.`,429);}
}
async function throttlePolicy(db:D1Database):Promise<AuthPolicy>{const root=await institution(db),row=root?await db.prepare('SELECT auth_policy FROM academic_institutes WHERE id = ?').bind(root.campus_id).first<{auth_policy:string}>():null;return row?JSON.parse(row.auth_policy):{accountAttempts:5,ipAttempts:20,windowSeconds:900};}
async function failed(db:D1Database,email:string,ip:string,now:Date){const window=(await throttlePolicy(db)).windowSeconds*1000;for(const k of await buckets(email,ip))await db.prepare('INSERT INTO auth_limits (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN ? - window_start >= ? THEN 1 ELSE count + 1 END, window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END').bind(k,now.getTime(),now.getTime(),window,now.getTime(),window,now.getTime()).run();}
export async function login(db:D1Database,emailValue:unknown,passwordValue:unknown,config:AuthConfig,ip:string,now=new Date()){
 const identity=typeof emailValue==='string'&&emailValue.trim().length<=254?emailValue.trim().toLowerCase():'invalid@example.invalid',password=typeof passwordValue==='string'?passwordValue:'',root=await institution(db);
 const account=root?await db.prepare('SELECT * FROM accounts WHERE campus_id = ? AND (email = ? OR username = ?)').bind(root.campus_id,identity,identity).first<Account>():null;
 const email=account?.email||identity;await checkThrottle(db,email,ip,now);
 let valid=false;
 if(config.provider){if(account?.active&&account.auth_provider_user_id&&account.auth_provider_generation&&enc.encode(password).length<=72)valid=await config.provider.verify(account.auth_provider_user_id,account.email,password,account.auth_provider_generation);}
 else{const hash=account?.password_hash||'$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';valid=enc.encode(password).length<=72&&await bcrypt.compare(password,hash);}
 if(!account||!account.active||!valid){await failed(db,email,ip,now);throw new ProductError('Invalid email or password.',401);}
 // An Admin may edit/revoke the account while the remote provider is working.
 const current=await db.prepare('SELECT * FROM accounts WHERE id = ? AND campus_id = ?').bind(account.id,account.campus_id).first<Account>();
 if(!current||!current.active||current.token_version!==account.token_version||current.email!==account.email||current.auth_provider_user_id!==account.auth_provider_user_id||current.auth_provider_generation!==account.auth_provider_generation)throw new ProductError('Account changed while signing in. Sign in again.',401);
 await db.prepare('DELETE FROM auth_limits WHERE key = ?').bind('account:'+await tokenHash(email)).run();await authAudit(db,current.campus_id,current.id,'Successful institutional sign-in.',now);return {user:principal(current),token:await signSession(current,config,now)};
}
export async function logout(db:D1Database,user:Principal,now=new Date()){await db.prepare('UPDATE accounts SET token_version = token_version + 1 WHERE id = ?').bind(user.id).run();await authAudit(db,user.campusId,user.id,'Signed out and revoked existing sessions.',now);}
export async function createInvitation(db:D1Database,user:Principal,accountId:string,purpose:'setup'|'reset',now=new Date()){
 if(user.role!=='ADMIN')throw new ProductError('Admin permission is required.',403);const account=await db.prepare('SELECT * FROM accounts WHERE id = ? AND campus_id = ?').bind(accountId,user.campusId).first<Account>();if(!account)throw new ProductError('Account not found.',404);
 const token=randomToken(),hash=await tokenHash(token),expires=now.getTime()+24*3600000;
 await db.batch([db.prepare('DELETE FROM auth_tokens WHERE account_id = ?').bind(account.id),db.prepare('INSERT INTO auth_tokens (hash,account_id,purpose,expires_at,created_at) VALUES (?,?,?,?,?)').bind(hash,account.id,purpose,expires,now.toISOString())]);await authAudit(db,user.campusId,user.id,`Created a single-use ${purpose} link for account ${account.id}.`,now);return {token,accountId:account.id,expiresAt:new Date(expires).toISOString()};
}
export async function acceptInvitation(db:D1Database,tokenValue:unknown,passwordValue:unknown,config:AuthConfig,ip:string,now=new Date()){
 const token=typeof tokenValue==='string'?tokenValue:'',hash=await tokenHash(token);
 const row=await db.prepare('SELECT t.account_id,t.purpose,t.expires_at,a.email FROM auth_tokens t JOIN accounts a ON a.id = t.account_id WHERE t.hash = ?').bind(hash).first<{account_id:string;purpose:string;expires_at:number;email:string}>();const identity=row?.email||'token:'+hash;await checkThrottle(db,identity,ip,now);
 if(!row||row.expires_at<=now.getTime()){await failed(db,identity,ip,now);throw new ProductError('This setup/reset link is invalid or expired.',400);}try{checkPassword(passwordValue);}catch(e){await failed(db,identity,ip,now);throw e;}
 if(config.provider)return acceptProviderInvitation(db,hash,row.account_id,passwordValue,config,now);
 const password=await passwordHash(passwordValue);
 const operation=crypto.randomUUID(),guard='EXISTS (SELECT 1 FROM security_audit WHERE id = ?)';
 const results=await db.batch<Account>([db.prepare('INSERT INTO security_audit (id,campus_id,actor_id,action,created_at) SELECT ?,a.campus_id,a.id,?,? FROM accounts a JOIN auth_tokens t ON t.account_id = a.id WHERE t.hash = ? AND t.expires_at > ?').bind(operation,'Completed account setup/reset; existing sessions revoked.',now.toISOString(),hash,now.getTime()),db.prepare(`UPDATE accounts SET password_hash = ?, active = 1, token_version = token_version + 1 WHERE id = ? AND ${guard} RETURNING *`).bind(password,row.account_id,operation),db.prepare(`DELETE FROM auth_tokens WHERE account_id = ? AND ${guard}`).bind(row.account_id,operation)]);
 const account=results[1]?.results?.[0];if(!account){await failed(db,identity,ip,now);throw new ProductError('This setup/reset link is invalid or expired.',400);}return {user:principal(account),token:await signSession(account,config,now)};
}

async function acceptProviderInvitation(db:D1Database,hash:string,accountId:string,password:string,config:AuthConfig,now:Date){
 const started=Date.now(),claim=crypto.randomUUID(),account=await db.prepare('SELECT * FROM accounts WHERE id = ?').bind(accountId).first<Account>();
 if(!account)throw new ProductError('This setup/reset link is invalid or expired.',400);
 const providerId=account.auth_provider_user_id||account.id;
 const claimed=await db.batch<Account>([
  db.prepare('UPDATE auth_tokens SET claim_id = ?, claim_version = ? WHERE hash = ? AND expires_at > ? AND claim_id IS NULL AND EXISTS (SELECT 1 FROM accounts WHERE id = ? AND token_version = ?)').bind(claim,account.token_version+1,hash,now.getTime(),account.id,account.token_version),
  db.prepare('UPDATE accounts SET active = 0, token_version = token_version + 1, auth_provider_user_id = ? WHERE id = ? AND EXISTS (SELECT 1 FROM auth_tokens WHERE hash = ? AND claim_id = ?) RETURNING *').bind(providerId,account.id,hash,claim)
 ]);
 const pending=claimed[1]?.results?.[0];if(!pending)throw new ProductError('This setup/reset link is invalid, expired or already being used.',400);
 try{
  const result=await config.provider!.provision(providerId,pending.email,password,claim);
  if(result.id!==providerId)throw new ProductError('Authentication identity does not match this account.',503);
  if(!await config.provider!.verify(providerId,pending.email,password,claim))throw new ProductError('Authentication identity could not be verified.',503);
  const completed=new Date(now.getTime()+Math.max(0,Date.now()-started)),operation=crypto.randomUUID();
  const guard='EXISTS (SELECT 1 FROM security_audit WHERE id = ?)';
  const rows=await db.batch<Account>([
   db.prepare('INSERT INTO security_audit (id,campus_id,actor_id,action,created_at) SELECT ?,a.campus_id,a.id,?,? FROM accounts a JOIN auth_tokens t ON t.account_id = a.id WHERE t.hash = ? AND t.claim_id = ? AND t.expires_at > ? AND a.token_version = t.claim_version').bind(operation,'Completed managed account setup/reset; earlier sessions revoked.',completed.toISOString(),hash,claim,completed.getTime()),
   db.prepare(`UPDATE accounts SET password_hash = NULL, active = 1, token_version = token_version + 1, auth_provider_generation = ? WHERE id = ? AND token_version = ? AND ${guard} RETURNING *`).bind(claim,account.id,pending.token_version,operation),
   db.prepare(`DELETE FROM auth_tokens WHERE account_id = ? AND ${guard}`).bind(account.id,operation)
  ]);
  const ready=rows[1]?.results?.[0];if(!ready)throw new ProductError('Account changed or the link expired during setup. Ask your Admin for a new link.',409);
  return {user:principal(ready),token:await signSession(ready,config,completed)};
 }catch(error){
  // A provider timeout may occur after its password was changed. Keep the
  // account inactive and old sessions revoked; release the claim for a retry.
  // Admin edits/deactivation delete the token and cannot be undone here.
  await db.prepare('UPDATE auth_tokens SET claim_id = NULL, claim_version = NULL WHERE hash = ? AND claim_id = ?').bind(hash,claim).run();
  throw error;
 }
}
