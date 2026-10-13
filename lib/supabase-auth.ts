import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {PasswordProvider} from './access-types.ts';
import {ProductError} from './engine.ts';

export type SupabaseSettings={SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;SUPABASE_SECRET_KEY?:string};
type ProviderUser={id:string;email:string};
type Reply={user?:ProviderUser;id?:string;email?:string;access_token?:string};
const keySets=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
const unavailable=()=>new ProductError('Authentication service is unavailable. Retry shortly; account access remains protected.',503);
export function supabaseConfig(settings:SupabaseSettings){
 try{
  const url=new URL(settings.SUPABASE_URL||'');
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.origin!==settings.SUPABASE_URL||!/^([a-z0-9]{20})\.supabase\.co$/.test(url.hostname))return null;
  if(!settings.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')||!settings.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))return null;
  return {url:url.origin,publishable:settings.SUPABASE_PUBLISHABLE_KEY,secret:settings.SUPABASE_SECRET_KEY};
 }catch{return null;}
}

// Supabase handles passwords. The application never accepts provider metadata
// as a role, and never returns provider access/refresh tokens to the browser.
export function supabasePasswordProvider(settings:SupabaseSettings,options:{fetch?:typeof fetch;keys?:Parameters<typeof jwtVerify>[1];now?:()=>Date}={}):PasswordProvider{
 const config=supabaseConfig(settings);if(!config)throw new ProductError('Supabase authentication is not configured.',503);
 const transport=options.fetch||fetch;
 let remote=keySets.get(config.url);
 if(!remote){remote=createRemoteJWKSet(new URL(config.url+'/auth/v1/.well-known/jwks.json'),{timeoutDuration:8000,cacheMaxAge:300000,cooldownDuration:30000});keySets.set(config.url,remote);}
 const keys=options.keys||remote;
 const providerId=(id:string)=>{if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))throw unavailable();return id;};
 async function request(path:string,method:string,body:unknown,admin:boolean){
  try{
   const response=await transport(config!.url+'/auth/v1'+path,{method,headers:{apikey:admin?config!.secret:config!.publishable,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000),redirect:'error'});
   const reader=response.body?.getReader();const chunks:Uint8Array[]=[];let length=0;
   if(reader)for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>65536){await reader.cancel();throw unavailable();}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const reply=length?JSON.parse(new TextDecoder().decode(bytes)) as Reply:{};
   if(!reply||typeof reply!=='object'||Array.isArray(reply))throw unavailable();
   return {status:response.status,ok:response.ok,reply};
  }catch{throw unavailable();}
 }
 const user=(reply:Reply):ProviderUser=>{const u=reply.user||reply;if(typeof u.id!=='string'||typeof u.email!=='string')throw unavailable();return {id:u.id,email:u.email.toLowerCase()};};
 async function lookup(id:string){const r=await request('/admin/users/'+providerId(id),'GET',undefined,true);if(r.status===404)return null;if(!r.ok)throw unavailable();const u=user(r.reply);if(u.id!==id)throw unavailable();return u;}
 return {
  async provision(id,email,password,generation){
   providerId(id);providerId(generation);const existing=await lookup(id);let created=false;
   if(!existing){
    const r=await request('/admin/users','POST',{id,email,password,email_confirm:true,app_metadata:{uniadapt_credential_generation:generation}},true);
    if(r.ok){const u=user(r.reply);if(u.id!==id||u.email!==email.toLowerCase())throw unavailable();created=true;}
    else if(r.status===409||r.status===422){if(!await lookup(id))throw unavailable();}
    else throw unavailable();
   }
   // Retrying after a lost response is safe because the ID is reserved in D1.
   if(!created){const r=await request('/admin/users/'+id,'PUT',{email,password,email_confirm:true,app_metadata:{uniadapt_credential_generation:generation}},true);if(!r.ok||user(r.reply).id!==id)throw unavailable();}
   return {id,created};
  },
  async verify(id,email,password,generation){
   providerId(generation);
   const existing=await lookup(id);if(!existing)return false;
   // Identity edits are authoritative in D1. Sync this known ID before login;
   // never discover/link an unrelated provider account by its email address.
   if(existing.email!==email.toLowerCase()){const r=await request('/admin/users/'+id,'PUT',{email,email_confirm:true},true);if(!r.ok||user(r.reply).id!==id)throw unavailable();}
   const r=await request('/token?grant_type=password','POST',{email,password},false);
   if(r.status===400||r.status===401||r.status===422)return false;if(!r.ok)throw unavailable();
   if(typeof r.reply.access_token!=='string'||r.reply.access_token.length>16384)throw unavailable();
   try{
    const {payload}=await jwtVerify(r.reply.access_token,keys!,{issuer:config!.url+'/auth/v1',audience:'authenticated',algorithms:['ES256','RS256'],requiredClaims:['sub','exp','iat','email'],currentDate:options.now?.()});
    const metadata=payload.app_metadata;
    return payload.sub===id&&typeof payload.email==='string'&&payload.email.toLowerCase()===email.toLowerCase()&&user(r.reply).id===id&&!!metadata&&typeof metadata==='object'&&!Array.isArray(metadata)&&(metadata as Record<string,unknown>).uniadapt_credential_generation===generation;
   }catch{throw unavailable();}
  },
  async remove(id){const r=await request('/admin/users/'+providerId(id),'DELETE',undefined,true);if(!r.ok&&r.status!==404)throw unavailable();}
 };
}
