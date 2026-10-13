import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,exportJWK,createLocalJWKSet} from 'jose';
import {readFileSync} from 'node:fs';
import {database,NOW} from './foundation-helpers.mts';
import {initializeInstitution} from '../lib/bootstrap.ts';
import {authenticate,login} from '../lib/auth.ts';
import {privateAccess,accessConfig,verifyPrivateToken} from '../lib/private-access.ts';
const config={secret:'synthetic-signing-secret-for-tests-32-characters',issuer:'uniadapt-learning'};
const setupToken='synthetic-bootstrap-secret-for-tests-32-characters';
const input={name:'Test Admin',email:'admin@example.invalid',password:'Synthetic standalone password',bootstrapToken:setupToken};
test('standalone bootstrap rejects missing/incorrect setup authorization without creating any records',async()=>{
 const {db,sql}=database();
 for(const token of [undefined,'wrong'])await assert.rejects(initializeInstitution(db,config,setupToken,{...input,bootstrapToken:token},NOW),/setup token/);
 await assert.rejects(initializeInstitution(db,config,undefined,input,NOW),/not configured/);
 await assert.rejects(initializeInstitution(db,{...config,secret:''},setupToken,input,NOW),/not configured/);
 assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM campuses').get()!.count,0);assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM accounts').get()!.count,0);sql.close();
});
test('standalone first Admin initializes atomically and logs in without any Sites identity',async()=>{
 const {db,sql}=database();const result=await initializeInstitution(db,config,setupToken,input,NOW);
 assert.equal(result.user.role,'ADMIN');assert.equal((await authenticate(db,result.token,config,NOW)).id,result.user.id);
 const logged=await login(db,input.email,input.password,config,'127.0.0.1',NOW);assert.equal(logged.user.id,result.user.id);
 await assert.rejects(initializeInstitution(db,config,setupToken,input,NOW),/already been initialized/);
 assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM accounts').get()!.count,1);
 const row=sql.prepare('SELECT state FROM campuses').get()!;const state=JSON.parse(String(row.state));assert.ok(state.courses.every((c:{curriculumApproved:boolean;bankApproved:boolean})=>!c.curriculumApproved&&!c.bankApproved));assert.deepEqual(state.plans,[]);sql.close();
});
test('standalone bootstrap failure rolls back the campus, institution, account and audit',async()=>{
 const {db,sql}=database();sql.exec("CREATE TRIGGER block_bootstrap BEFORE INSERT ON accounts BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
 await assert.rejects(initializeInstitution(db,config,setupToken,input,NOW),/synthetic failure/);
 for(const table of ['campuses','institutions','accounts','security_audit'])assert.equal(sql.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count,0);sql.close();
});
test('concurrent standalone initialization creates exactly one Admin and no orphan campus',async()=>{
 const {db,sql}=database();const results=await Promise.allSettled([initializeInstitution(db,config,setupToken,input,NOW),initializeInstitution(db,config,setupToken,{...input,email:'second@example.invalid'},NOW)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);for(const table of ['campuses','institutions','accounts','security_audit'])assert.equal(sql.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count,1);sql.close();
});
test('private gateway fails closed in production and only bypasses loopback in development',async()=>{
 assert.equal((await privateAccess(new Request('https://example.workers.dev/'),{}))!.status,503);
 assert.equal((await privateAccess(new Request('http://localhost/'),{}))!.status,503);
 assert.equal(await privateAccess(new Request('http://localhost/'),{},true),null);
 assert.equal((await privateAccess(new Request('https://example.workers.dev/'),{},true))!.status,503);
 const settings={UNIADAPT_ACCESS_ISSUER:'https://test.cloudflareaccess.com',UNIADAPT_ACCESS_AUDIENCE:'test-app',UNIADAPT_ALLOWED_EMAILS:'owner@example.invalid'};
 const spoof=new Request('https://example.workers.dev/api/health',{headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'owner@example.invalid'}});
 assert.equal((await privateAccess(spoof,settings))!.status,403);
 for(const issuer of ['http://test.cloudflareaccess.com','https://attacker.invalid','https://test.cloudflareaccess.com/other','https://test.cloudflareaccess.com?query=x'])assert.equal(accessConfig({...settings,UNIADAPT_ACCESS_ISSUER:issuer}),null);
});
test('private gateway verifies signature, issuer, audience, expiry, algorithm and explicit email allowlist',async()=>{
 const settings={UNIADAPT_ACCESS_ISSUER:'https://test.cloudflareaccess.com',UNIADAPT_ACCESS_AUDIENCE:'test-app',UNIADAPT_ALLOWED_EMAILS:'owner@example.invalid'};
 const {privateKey,publicKey}=await generateKeyPair('RS256');const key=await exportJWK(publicKey);key.kid='test';key.alg='RS256';const keys=createLocalJWKSet({keys:[key]});const seconds=Math.floor(NOW.getTime()/1000);
 const sign=async(overrides:Record<string,unknown>={})=>new SignJWT({sub:'account',email:'owner@example.invalid',iat:seconds,exp:seconds+3600,iss:settings.UNIADAPT_ACCESS_ISSUER,aud:settings.UNIADAPT_ACCESS_AUDIENCE,...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(privateKey);
 assert.equal((await verifyPrivateToken(await sign(),settings,keys,NOW)).email,'owner@example.invalid');
 for(const values of [{email:'other@example.invalid'},{aud:'other-app'},{iss:'https://other.cloudflareaccess.com'},{exp:seconds-1},{iat:seconds+120},{email:undefined}])await assert.rejects(verifyPrivateToken(await sign(values),settings,keys,NOW));
 const {privateKey:wrong}=await generateKeyPair('RS256');const badSignature=await new SignJWT({sub:'account',email:'owner@example.invalid',iat:seconds,exp:seconds+3600,iss:settings.UNIADAPT_ACCESS_ISSUER,aud:settings.UNIADAPT_ACCESS_AUDIENCE}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(wrong);await assert.rejects(verifyPrivateToken(badSignature,settings,keys,NOW));
 const hmac=await new SignJWT({sub:'account',email:'owner@example.invalid',iat:seconds,exp:seconds+3600}).setProtectedHeader({alg:'HS256'}).sign(new TextEncoder().encode(config.secret));await assert.rejects(verifyPrivateToken(hmac,settings,keys,NOW));
});
test('default Worker config disables public and preview URLs and protects static asset requests',()=>{
 const wrangler=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url),'utf8'));assert.equal(wrangler.workers_dev,false);assert.equal(wrangler.preview_urls,false);assert.equal(wrangler.assets.run_worker_first,true);
 assert.equal(wrangler.main,'build/uniadapt-worker.ts');assert.equal(wrangler.vars.UNIADAPT_ALLOWED_EMAILS,'');
});
