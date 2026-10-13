import {cleanEmail,checkPassword,passwordHash,principal,signSession,tokenHash,institution} from './auth.ts';
import {sampleCampus} from './sample.ts';
import {ProductError} from './engine.ts';
import type {Account,AuthConfig} from './access-types.ts';

export async function initializeInstitution(db:D1Database,config:AuthConfig,expectedToken:string|undefined,input:{bootstrapToken?:unknown;email?:unknown;name?:unknown;password?:unknown},now=new Date()){
 if(config.secret.length<32)throw new ProductError('Authentication is not configured.',503);
 if(!expectedToken||expectedToken.length<32)throw new ProductError('Institution initialization is not configured.',503);
 if(await institution(db))throw new ProductError('The institution has already been initialized.',409);
 const supplied=typeof input.bootstrapToken==='string'&&input.bootstrapToken.length<=256?input.bootstrapToken:'';
 const a=await tokenHash(expectedToken),b=await tokenHash(supplied);let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 if(difference)throw new ProductError('Invalid institution setup token.',403);
 const email=cleanEmail(input.email),name=typeof input.name==='string'?input.name.trim():'';
 if(!name||name.length>100)throw new ProductError('Enter an Admin name of at most 100 characters.');
 if(typeof input.password!=='string')throw new ProductError('Enter a valid password.');
 checkPassword(input.password);const campusId=crypto.randomUUID(),id=crypto.randomUUID(),generation=crypto.randomUUID();
 const provisioned=config.provider?await config.provider.provision(id,email,input.password,generation):null;
 if(provisioned&&provisioned.id!==id)throw new ProductError('Authentication identity does not match initialization.',503);
 const hash=config.provider?null:await passwordHash(input.password);
 const account:Account={id,campus_id:campusId,email,name,role:'ADMIN',password_hash:hash,auth_provider_user_id:provisioned?.id||null,auth_provider_generation:provisioned?generation:null,active:1,token_version:0,learner_id:null,course_ids:'[]',created_at:now.toISOString()};
 const campus=sampleCampus('Demo learner',now);campus.plans=[];
 for(const course of campus.courses){course.curriculumApproved=false;course.bankApproved=false;}
 try{
  // Do not activate an institution whose password or signed provider identity
  // cannot actually be verified (including incompatible JWT signing settings).
  if(config.provider&&!await config.provider.verify(id,email,input.password,generation))throw new ProductError('Authentication identity could not be verified.',503);
  await db.batch([
  db.prepare('INSERT INTO campuses (owner_id,state,revision,updated_at) VALUES (?,?,0,?)').bind(campusId,JSON.stringify(campus),account.created_at),
  db.prepare('INSERT INTO institutions (id,campus_id,created_by,created_at) VALUES (?,?,?,?)').bind('default',campusId,id,account.created_at),
  db.prepare('INSERT INTO accounts (id,campus_id,email,name,role,password_hash,active,token_version,learner_id,course_ids,created_at,auth_provider_user_id,auth_provider_generation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,campusId,email,name,'ADMIN',hash,1,0,null,'[]',account.created_at,account.auth_provider_user_id,account.auth_provider_generation),
  db.prepare('INSERT INTO security_audit (id,campus_id,actor_id,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),campusId,id,'Initialized the institution through the protected bootstrap flow.',account.created_at)
 ]);}catch(error){
  const root=await institution(db);
  // A lost response after commit must not delete the real Admin identity.
  if(root?.created_by===id&&root.campus_id===campusId)return {user:principal(account),token:await signSession(account,config,now)};
  if(provisioned?.created)try{await config.provider!.remove(provisioned.id);}catch{console.error('UniAdapt bootstrap compensation needs operator review; no unlinked identity can access institution data.');}
  if(root)throw new ProductError('The institution has already been initialized.',409);throw error;
 }
 return {user:principal(account),token:await signSession(account,config,now)};
}
