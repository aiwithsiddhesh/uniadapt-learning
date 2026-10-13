import {env} from 'cloudflare:workers';
import {authenticate,institution,readCookie,sessionCookie,clearCookie,login,logout,acceptInvitation} from '../../../lib/auth';
import {runtimeAuth} from '../../../lib/runtime-auth';
import {initializeInstitution} from '../../../lib/bootstrap';
import {ProductError} from '../../../lib/engine';
export const dynamic='force-dynamic';
const config=()=>runtimeAuth(env,import.meta.env.DEV);
const json=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(request:Request){try{if(!env.DB)return json({error:'Storage unavailable.'},503);const root=await institution(env.DB);let user=null;try{user=await authenticate(env.DB,readCookie(request),config());}catch{}return json({user,needsSetup:!root,ownerName:'',ownerEmail:''});}catch{return json({error:'Unable to open sign-in.'},503);}}
export async function POST(request:Request){try{
 if(!env.DB)throw new ProductError('Storage unavailable.',503);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new ProductError('Invalid origin.',403);
 const raw=await request.text();if(raw.length>8000)throw new ProductError('Request is too large.');const body=JSON.parse(raw) as {action:string;email?:unknown;password?:unknown;name?:unknown;token?:unknown;bootstrapToken?:unknown};const ip=request.headers.get('cf-connecting-ip')||'private';let result;
 if(body.action==='login')result=await login(env.DB,body.email,body.password,config(),ip);
 else if(body.action==='accept')result=await acceptInvitation(env.DB,body.token,body.password,config(),ip);
 else if(body.action==='logout'){const user=await authenticate(env.DB,readCookie(request),config());await logout(env.DB,user);return json({user:null},200,clearCookie());}
 else if(body.action==='bootstrap'){result=await initializeInstitution(env.DB,config(),env.UNIADAPT_BOOTSTRAP_TOKEN,body); }else throw new ProductError('Unknown sign-in action.');
 return json({user:result.user},200,sessionCookie(result.token));
 }catch(e){return json({error:e instanceof ProductError?e.message:'Unable to sign in. Check your details and retry.'},e instanceof ProductError?e.status:400);}}
