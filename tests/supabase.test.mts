import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {database,NOW} from './foundation-helpers.mts';
import {initializeInstitution} from '../lib/bootstrap.ts';
import {login,authenticate,logout,createInvitation,acceptInvitation,signSession} from '../lib/auth.ts';
import {runtimeAuth} from '../lib/runtime-auth.ts';
import {supabaseConfig,supabasePasswordProvider} from '../lib/supabase-auth.ts';
import {saveAccount} from '../lib/account-admin.ts';
import type {PasswordProvider,Account,AuthConfig} from '../lib/access-types.ts';

const secret='synthetic-session-signing-secret-for-provider-tests';
const setupToken='synthetic-bootstrap-authorization-token-for-provider-tests';
const password='Synthetic provider password 2026';
class FakeProvider implements PasswordProvider{
 users=new Map<string,{email:string;password:string;generation:string}>();fail=false;rejectVerification=false;
 beforeProvision?:()=>Promise<void>;beforeVerify?:()=>Promise<void>;
 async provision(id:string,email:string,value:string,generation:string){await this.beforeProvision?.();if(this.fail)throw new Error('Synthetic provider offline');const created=!this.users.has(id);this.users.set(id,{email,password:value,generation});return {id,created};}
 async verify(id:string,email:string,value:string,generation:string){await this.beforeVerify?.();if(this.fail)throw new Error('Synthetic provider offline');const u=this.users.get(id);return !this.rejectVerification&&!!u&&u.email===email&&u.password===value&&u.generation===generation;}
 async remove(id:string){this.users.delete(id);}
}
async function fixture(){const storage=database(),provider=new FakeProvider(),config:AuthConfig={secret,issuer:'uniadapt-learning',provider};const result=await initializeInstitution(storage.db,config,setupToken,{bootstrapToken:setupToken,name:'Provider Admin',email:'admin@example.invalid',password},NOW);return {...storage,provider,config,admin:result.user};}

test('runtime refuses missing provider settings and local passwords in every production build',()=>{
 assert.throws(()=>runtimeAuth({UNIADAPT_AUTH_SECRET:secret,UNIADAPT_LOCAL_AUTH:'true'},false),/Supabase/);
 assert.throws(()=>runtimeAuth({UNIADAPT_AUTH_SECRET:secret},true),/Supabase/);
 assert.equal(runtimeAuth({UNIADAPT_AUTH_SECRET:secret,UNIADAPT_LOCAL_AUTH:'true'},true).provider,undefined);
 assert.throws(()=>runtimeAuth({UNIADAPT_AUTH_SECRET:'short',UNIADAPT_LOCAL_AUTH:'true'},true),/sessions/);
 for(const url of ['http://abcdefghijklmnopqrst.supabase.co','https://abcdefghijklmnopqrst.supabase.co/','https://user@abcdefghijklmnopqrst.supabase.co','https://abcdefghijklmnopqrst.supabase.co:8443','https://attacker.example.com'])assert.equal(supabaseConfig({SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'}),null);
});
test('managed first Admin and username sign-in preserve four-hour sessions without a D1 password hash',async()=>{
 const f=await fixture();const row=f.sql.prepare('SELECT * FROM accounts').get()!;assert.equal(row.password_hash,null);assert.equal(row.auth_provider_user_id,f.admin.id);
 f.sql.prepare('UPDATE accounts SET username = ? WHERE id = ?').run('admin-alias',f.admin.id);
 const result=await login(f.db,'ADMIN-ALIAS',password,f.config,'test-ip',NOW);assert.equal(result.user.role,'ADMIN');
 await assert.rejects(login(f.db,'admin-alias','wrong',f.config,'test-ip',NOW),/Invalid email or password/);
 assert.equal((await authenticate(f.db,result.token,f.config,new Date(NOW.getTime()+14399000))).id,f.admin.id);
 await assert.rejects(authenticate(f.db,result.token,f.config,new Date(NOW.getTime()+14400000)));
 await logout(f.db,result.user,NOW);await assert.rejects(authenticate(f.db,result.token,f.config,NOW));f.sql.close();
});
test('managed bootstrap DB failure compensates only the newly created provider identity',async()=>{
 const {db,sql}=database(),provider=new FakeProvider();const broken={...db,async batch(){throw new Error('Synthetic database failure');}} as unknown as D1Database;
 await assert.rejects(initializeInstitution(broken,{secret,issuer:'uniadapt-learning',provider},setupToken,{bootstrapToken:setupToken,name:'Admin',email:'admin@example.invalid',password},NOW),/database failure/);
 assert.equal(provider.users.size,0);assert.equal(sql.prepare('SELECT count(*) AS count FROM accounts').get()!.count,0);sql.close();
});
test('a lost bootstrap response after commit retains the real Admin provider identity',async()=>{
 const {db,sql}=database(),provider=new FakeProvider();const uncertain={...db,async batch(statements:D1PreparedStatement[]){await db.batch(statements);throw new Error('Lost commit response');}} as unknown as D1Database;
 const result=await initializeInstitution(uncertain,{secret,issuer:'uniadapt-learning',provider},setupToken,{bootstrapToken:setupToken,name:'Admin',email:'admin@example.invalid',password},NOW);
 assert.equal(provider.users.size,1);assert.ok(provider.users.has(result.user.id));assert.equal(sql.prepare('SELECT count(*) AS count FROM accounts').get()!.count,1);sql.close();
});
test('concurrent managed bootstrap leaves one institution and one linked provider Admin',async()=>{
 const {db,sql}=database(),provider=new FakeProvider();const config={secret,issuer:'uniadapt-learning',provider},input={bootstrapToken:setupToken,name:'Admin',email:'admin@example.invalid',password};
 const results=await Promise.allSettled([initializeInstitution(db,config,setupToken,input,NOW),initializeInstitution(db,config,setupToken,input,NOW)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(provider.users.size,1);assert.equal(sql.prepare('SELECT count(*) AS count FROM campuses').get()!.count,1);sql.close();
});
test('Teacher setup provisions a linked identity, consumes the private link once and uses the D1 role',async()=>{
 const f=await fixture();const id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER',username:'teacher-alias'},NOW);
 const link=await createInvitation(f.db,f.admin,id,'setup',NOW);const ready=await acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW);
 assert.equal(ready.user.role,'TEACHER');assert.equal(f.sql.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(id)!.password_hash,null);
 assert.equal((await login(f.db,'teacher-alias',password,f.config,'test-ip',NOW)).user.id,id);
 await assert.rejects(acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),/invalid or expired/);f.sql.close();
});
test('provider failure during reset leaves access revoked, permits retry and preserves academic records',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW);
 const setup=await createInvitation(f.db,f.admin,id,'setup',NOW);const active=await acceptInvitation(f.db,setup.token,password,f.config,'test-ip',NOW);
 const reset=await createInvitation(f.db,f.admin,id,'reset',NOW);f.provider.fail=true;
 await assert.rejects(acceptInvitation(f.db,reset.token,'A different synthetic password',f.config,'test-ip',NOW),/offline/);
 assert.equal(f.sql.prepare('SELECT active FROM accounts WHERE id = ?').get(id)!.active,0);assert.equal(f.sql.prepare('SELECT claim_id FROM auth_tokens WHERE account_id = ?').get(id)!.claim_id,null);
 await assert.rejects(authenticate(f.db,active.token,f.config,NOW));f.provider.fail=false;
 const ready=await acceptInvitation(f.db,reset.token,'A different synthetic password',f.config,'test-ip',NOW);assert.equal(ready.user.id,id);assert.equal(f.sql.prepare('SELECT count(*) AS count FROM campuses').get()!.count,1);f.sql.close();
});
test('simultaneous use of a managed setup link provisions only one successful account session',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW),link=await createInvitation(f.db,f.admin,id,'setup',NOW);
 f.provider.beforeProvision=()=>new Promise(resolve=>setTimeout(resolve,10));
 const results=await Promise.allSettled([acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.sql.prepare('SELECT count(*) AS count FROM auth_tokens').get()!.count,0);f.sql.close();
});
test('Admin deactivation while the provider works cannot be undone by setup completion',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW),link=await createInvitation(f.db,f.admin,id,'setup',NOW);
 f.provider.beforeProvision=async()=>{await f.db.batch([f.db.prepare('UPDATE accounts SET active = 0, token_version = token_version + 1 WHERE id = ?').bind(id),f.db.prepare('DELETE FROM auth_tokens WHERE account_id = ?').bind(id)]);};
 await assert.rejects(acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),/Account changed/);assert.equal(f.sql.prepare('SELECT active FROM accounts WHERE id = ?').get(id)!.active,0);f.sql.close();
});
test('Admin revocation during remote login rejects the stale sign-in result',async()=>{
 const f=await fixture();f.provider.beforeVerify=async()=>{f.sql.prepare('UPDATE accounts SET token_version = token_version + 1 WHERE id = ?').run(f.admin.id);};
 await assert.rejects(login(f.db,f.admin.email,password,f.config,'test-ip',NOW),/Account changed/);f.sql.close();
});
test('token expiry during managed password work prevents activation and session issuance',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW),link=await createInvitation(f.db,f.admin,id,'setup',NOW);
 f.sql.prepare('UPDATE auth_tokens SET expires_at = ? WHERE account_id = ?').run(NOW.getTime()+1,id);f.provider.beforeProvision=()=>new Promise(resolve=>setTimeout(resolve,10));
 await assert.rejects(acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),/expired during setup/);assert.equal(f.sql.prepare('SELECT active FROM accounts WHERE id = ?').get(id)!.active,0);f.sql.close();
});

const settings={SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_synthetic'};
const uid='00000000-0000-4000-8000-000000000001';
const generation='00000000-0000-4000-8000-000000000003';
test('Supabase adapter verifies signed identity, rejects foreign identity and ignores role metadata',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('ES256'),jwk=await exportJWK(publicKey);jwk.kid='test';const keys=createLocalJWKSet({keys:[jwk]});
 let identity=uid;
 const fake=async(_url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(_url).includes('/admin/users/')){assert.equal(new Headers(init?.headers).get('apikey'),settings.SUPABASE_SECRET_KEY);return Response.json({id:uid,email:'teacher@example.invalid'});}
  assert.equal(new Headers(init?.headers).get('apikey'),settings.SUPABASE_PUBLISHABLE_KEY);assert.equal(new Headers(init?.headers).get('authorization'),null);
  const jwt=await new SignJWT({email:'teacher@example.invalid',role:'ADMIN',user_metadata:{role:'ADMIN'},app_metadata:{uniadapt_credential_generation:generation}}).setProtectedHeader({alg:'ES256',kid:'test'}).setIssuer(settings.SUPABASE_URL+'/auth/v1').setAudience('authenticated').setSubject(identity).setIssuedAt(Math.floor(NOW.getTime()/1000)).setExpirationTime(Math.floor(NOW.getTime()/1000)+3600).sign(privateKey);
  return Response.json({access_token:jwt,user:{id:identity,email:'teacher@example.invalid'}});
 };
 const provider=supabasePasswordProvider(settings,{fetch:fake,keys,now:()=>NOW});assert.equal(await provider.verify(uid,'teacher@example.invalid',password,generation),true);
 identity='00000000-0000-4000-8000-000000000002';assert.equal(await provider.verify(uid,'teacher@example.invalid',password,generation),false);
});
test('Supabase provider errors and oversized responses are bounded and redacted',async()=>{
 for(const fake of [async()=>Response.json({error:'secret provider detail'},{status:500}),async()=>new Response('x'.repeat(70000)),async()=>{throw new Error('secret transport detail');}]){
  const provider=supabasePasswordProvider(settings,{fetch:fake});await assert.rejects(provider.verify(uid,'teacher@example.invalid',password,generation),(error:unknown)=>error instanceof Error&&/service is unavailable/.test(error.message)&&!error.message.includes('secret'));
 }
});
test('provider identity mappings are unique without deleting legacy account hashes',async()=>{
 const f=await fixture();assert.throws(()=>f.sql.prepare('INSERT INTO accounts (id,campus_id,email,name,role,password_hash,active,created_at,auth_provider_user_id) VALUES (?,?,?,?,?,?,?,?,?)').run('duplicate',f.admin.campusId,'other@example.invalid','Other','TEACHER','legacy-hash',1,NOW.toISOString(),f.admin.id),/UNIQUE/);
 const row=f.sql.prepare('PRAGMA table_info(accounts)').all();assert.ok(row.some(c=>c.name==='password_hash'));f.sql.close();
});

test('unverifiable bootstrap identity is compensated before any institution is activated',async()=>{
 const {db,sql}=database(),provider=new FakeProvider();provider.rejectVerification=true;
 await assert.rejects(initializeInstitution(db,{secret,issuer:'uniadapt-learning',provider},setupToken,{bootstrapToken:setupToken,name:'Admin',email:'admin@example.invalid',password},NOW),/could not be verified/);
 assert.equal(provider.users.size,0);assert.equal(sql.prepare('SELECT count(*) AS count FROM institutions').get()!.count,0);sql.close();
});
test('unverifiable setup stays inactive and a fresh Admin link recovers an abandoned claim',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW),link=await createInvitation(f.db,f.admin,id,'setup',NOW);
 f.provider.rejectVerification=true;await assert.rejects(acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),/could not be verified/);
 assert.equal(f.sql.prepare('SELECT active FROM accounts WHERE id = ?').get(id)!.active,0);
 // Simulate process termination with a persisted claim and no cleanup handler.
 f.sql.prepare('UPDATE auth_tokens SET claim_id = ? WHERE account_id = ?').run('abandoned-request',id);
 const replacement=await createInvitation(f.db,f.admin,id,'setup',NOW);f.provider.rejectVerification=false;
 assert.equal((await acceptInvitation(f.db,replacement.token,password,f.config,'test-ip',NOW)).user.id,id);
 await assert.rejects(acceptInvitation(f.db,link.token,password,f.config,'test-ip',NOW),/invalid or expired/);f.sql.close();
});
test('Supabase provision creates only the reserved UUID, safely retries it and removes it idempotently',async()=>{
 const users=new Map<string,{id:string;email:string}>(),requests:string[]=[];
 const fake=async(url:RequestInfo|URL,init?:RequestInit)=>{
  const path=new URL(String(url)).pathname,method=init?.method||'GET';requests.push(method+' '+path);
  assert.equal(new Headers(init?.headers).get('apikey'),settings.SUPABASE_SECRET_KEY);assert.equal(new Headers(init?.headers).get('authorization'),null);
  const body=init?.body?JSON.parse(String(init.body)):{};
  if(method==='GET')return users.has(uid)?Response.json(users.get(uid)):Response.json({message:'not found'},{status:404});
  if(method==='POST'){assert.equal(body.id,uid);assert.equal(body.email_confirm,true);assert.equal(body.app_metadata.uniadapt_credential_generation,generation);users.set(uid,{id:uid,email:body.email});return Response.json(users.get(uid));}
  if(method==='PUT'){assert.equal(path,'/auth/v1/admin/users/'+uid);users.set(uid,{id:uid,email:body.email});return Response.json(users.get(uid));}
  if(method==='DELETE'){const existed=users.delete(uid);return Response.json({}, {status:existed?200:404});}
  throw new Error('Unexpected request');
 };
 const provider=supabasePasswordProvider(settings,{fetch:fake});
 assert.deepEqual(await provider.provision(uid,'teacher@example.invalid',password,generation),{id:uid,created:true});
 assert.deepEqual(await provider.provision(uid,'renamed@example.invalid',password,generation),{id:uid,created:false});
 await provider.remove(uid);await provider.remove(uid);assert.equal(users.size,0);assert.equal(requests.filter(x=>x.startsWith('POST')).length,1);
});

test('a late password write from a revoked link cannot authenticate after replacement reset activation',async()=>{
 const f=await fixture(),id=await saveAccount(f.db,f.admin,{action:'create',name:'Teacher',email:'teacher@example.invalid',role:'TEACHER'},NOW);
 const oldLink=await createInvitation(f.db,f.admin,id,'setup',NOW);
 let entered!:()=>void,release!:()=>void;
 const started=new Promise<void>(resolve=>{entered=resolve;}),held=new Promise<void>(resolve=>{release=resolve;});
 f.provider.beforeProvision=async()=>{entered();await held;};
 const stale=acceptInvitation(f.db,oldLink.token,password,f.config,'test-ip',NOW);
 const rejected=assert.rejects(stale,/Account changed/);
 await started;f.provider.beforeProvision=undefined;
 const currentLink=await createInvitation(f.db,f.admin,id,'reset',NOW);
 const current=await acceptInvitation(f.db,currentLink.token,'Replacement verification password',f.config,'test-ip',NOW);
 release();await rejected;
 assert.equal((await authenticate(f.db,current.token,f.config,NOW)).id,id);
 // The remote write finished late; its signed credential generation differs
 // from D1's activated generation, so the revoked password fails closed.
 await assert.rejects(login(f.db,'teacher@example.invalid',password,f.config,'test-ip',NOW),/Invalid email or password/);
 const recovery=await createInvitation(f.db,f.admin,id,'reset',NOW);
 await acceptInvitation(f.db,recovery.token,'Recovered verification password',f.config,'test-ip',NOW);
 assert.equal((await login(f.db,'teacher@example.invalid','Recovered verification password',f.config,'test-ip',NOW)).user.id,id);f.sql.close();
});
