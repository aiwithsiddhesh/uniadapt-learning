import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {authenticate,institution,readCookie,sessionCookie,clearCookie,login,logout,acceptInvitation,passwordHash,signSession,principal,cleanEmail,checkPassword} from '../../../lib/auth';
import type {AuthConfig,Account} from '../../../lib/access-types';
import {openCampus,saveCampus} from '../../../lib/store';
import {ProductError} from '../../../lib/engine';
export const dynamic='force-dynamic';
const config=():AuthConfig=>({secret:env.UNIADAPT_AUTH_SECRET||'',issuer:'uniadapt-learning'});
const json=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(request:Request){try{if(!env.DB)return json({error:'Storage unavailable.'},503);const native=await getChatGPTUser();if(!native)return json({error:'Sign in with ChatGPT to access this private Site.'},401);const root=await institution(env.DB);let user=null;try{user=await authenticate(env.DB,readCookie(request),config());}catch{}return json({user,needsSetup:!root,ownerName:native.fullName||'Campus administrator',ownerEmail:native.email});}catch{return json({error:'Unable to open sign-in.'},503);}}
export async function POST(request:Request){try{
 if(!env.DB)throw new ProductError('Storage unavailable.',503);const native=await getChatGPTUser();if(!native)throw new ProductError('Sign in with ChatGPT to access this private Site.',401);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new ProductError('Invalid origin.',403);
 const raw=await request.text();if(raw.length>8000)throw new ProductError('Request is too large.');const body=JSON.parse(raw) as {action:string;email?:unknown;password?:unknown;name?:unknown;token?:unknown};const ip=request.headers.get('cf-connecting-ip')||'private';let result;
 if(body.action==='login')result=await login(env.DB,body.email,body.password,config(),ip);
 else if(body.action==='accept')result=await acceptInvitation(env.DB,body.token,body.password,config(),ip);
 else if(body.action==='logout'){const user=await authenticate(env.DB,readCookie(request),config());await logout(env.DB,user);return json({user:null},200,clearCookie());}
 else if(body.action==='bootstrap'){
  if(await institution(env.DB))throw new ProductError('The institution has already been initialized.',409);const stored=await openCampus(env.DB,native.userId,native.fullName||'My learner profile');
  checkPassword(body.password);const account:Account={id:crypto.randomUUID(),campus_id:native.userId,email:cleanEmail(body.email||native.email),name:typeof body.name==='string'&&body.name.trim()?body.name.trim().slice(0,100):native.fullName||'Administrator',role:'ADMIN',password_hash:await passwordHash(body.password),active:1,token_version:0,learner_id:null,course_ids:'[]',created_at:new Date().toISOString()};
  if(!stored.state)throw new ProductError('Campus data is unavailable.',503);
  const reviewed=structuredClone(stored.state);for(const course of reviewed.courses){if(!course.ownerTeacherId){course.curriculumApproved=false;course.bankApproved=false;}}
  await saveCampus(env.DB,native.userId,stored.revision,reviewed);
  await env.DB.batch([env.DB.prepare('INSERT INTO institutions (id,campus_id,created_by,created_at) VALUES (?,?,?,?)').bind('default',native.userId,native.userId,account.created_at),env.DB.prepare('INSERT INTO accounts (id,campus_id,email,name,role,password_hash,active,token_version,learner_id,course_ids,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(account.id,account.campus_id,account.email,account.name,account.role,account.password_hash,1,0,null,'[]',account.created_at)]);result={user:principal(account),token:await signSession(account,config())};
 }else throw new ProductError('Unknown sign-in action.');
 return json({user:result.user},200,sessionCookie(result.token));
 }catch(e){return json({error:e instanceof ProductError?e.message:'Unable to sign in. Check your details and retry.'},e instanceof ProductError?e.status:400);}}
