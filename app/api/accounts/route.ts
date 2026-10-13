import {env} from 'cloudflare:workers';
import {authenticate,readCookie,cleanEmail,createInvitation,authAudit} from '../../../lib/auth';
import {openCampus,saveCampus} from '../../../lib/store';
import {applyAction,ProductError} from '../../../lib/engine';
import {saveAccount} from '../../../lib/account-admin';
import type {Account} from '../../../lib/access-types';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function admin(request:Request){if(!env.DB)throw new ProductError('Storage unavailable.',503);const user=await authenticate(env.DB,readCookie(request),{secret:env.UNIADAPT_AUTH_SECRET||'',issuer:'uniadapt-learning'});if(user.role!=='ADMIN')throw new ProductError('Admin permission is required.',403);return user;}
async function list(campusId:string){const result=await env.DB!.prepare('SELECT id,email,name,role,active,learner_id,course_ids,created_at,department_id,username FROM accounts WHERE campus_id = ? ORDER BY created_at').bind(campusId).all();return result.results;}
export async function GET(request:Request){try{const user=await admin(request);return json({accounts:await list(user.campusId)});}catch(e){return json({error:e instanceof ProductError?e.message:'Unable to load accounts.'},e instanceof ProductError?e.status:500);}}
export async function POST(request:Request){try{
 const user=await admin(request);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new ProductError('Invalid origin.',403);const body=await request.json() as {action:string;email?:unknown;name?:unknown;role?:unknown;learnerId?:unknown;accountId?:unknown;active?:unknown;departmentId?:unknown;username?:unknown};let link;
 if(body.action==='create'||body.action==='update'){
  const id=await saveAccount(env.DB!,user,body);if(body.action==='create')link=await createInvitation(env.DB!,user,id,'setup');
 }else if(body.action==='reset')link=await createInvitation(env.DB!,user,String(body.accountId),'reset');
 else if(body.action==='revoke'){const id=String(body.accountId);const account=await env.DB!.prepare('SELECT id FROM accounts WHERE id = ? AND campus_id = ?').bind(id,user.campusId).first();if(!account)throw new ProductError('Account not found.',404);await env.DB!.batch([env.DB!.prepare('UPDATE accounts SET token_version = token_version + 1 WHERE id = ?').bind(id),env.DB!.prepare('DELETE FROM auth_tokens WHERE account_id = ?').bind(id)]);await authAudit(env.DB!,user.campusId,user.id,`Revoked all sessions and setup tokens for ${id}.`);}
 else if(body.action==='setActive'){
  if(typeof body.active!=='boolean')throw new ProductError('Active state must be true or false.');const account=await env.DB!.prepare('SELECT * FROM accounts WHERE campus_id = ? AND id = ?').bind(user.campusId,body.accountId).first<Account>();if(!account||account.role==='ADMIN')throw new ProductError('Admin account changes are not permitted here.');await env.DB!.batch([env.DB!.prepare('UPDATE accounts SET active = ?, token_version = token_version + 1 WHERE id = ?').bind(body.active?1:0,account.id),env.DB!.prepare('DELETE FROM auth_tokens WHERE account_id = ?').bind(account.id)]);await authAudit(env.DB!,user.campusId,user.id,`${body.active?'Activated':'Deactivated'} account ${account.id}; sessions revoked.`);
 }else throw new ProductError('Unknown account action.');
 return json({accounts:await list(user.campusId),...(link?{setupAccountId:link.accountId,setupUrl:new URL(request.url).origin+'/#setup='+link.token,expiresAt:link.expiresAt}:{})});
 }catch(e){return json({error:e instanceof ProductError?e.message:'Unable to update this account. It may already be linked to another account.'},e instanceof ProductError?e.status:400);}}
