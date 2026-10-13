import {cleanEmail,passwordHash,principal,signSession,tokenHash,institution} from './auth.ts';
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
 const hash=await passwordHash(input.password),campusId=crypto.randomUUID(),id=crypto.randomUUID();
 const account:Account={id,campus_id:campusId,email,name,role:'ADMIN',password_hash:hash,active:1,token_version:0,learner_id:null,course_ids:'[]',created_at:now.toISOString()};
 const campus=sampleCampus('Demo learner',now);campus.plans=[];
 for(const course of campus.courses){course.curriculumApproved=false;course.bankApproved=false;}
 try{await db.batch([
  db.prepare('INSERT INTO campuses (owner_id,state,revision,updated_at) VALUES (?,?,0,?)').bind(campusId,JSON.stringify(campus),account.created_at),
  db.prepare('INSERT INTO institutions (id,campus_id,created_by,created_at) VALUES (?,?,?,?)').bind('default',campusId,id,account.created_at),
  db.prepare('INSERT INTO accounts (id,campus_id,email,name,role,password_hash,active,token_version,learner_id,course_ids,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,campusId,email,name,'ADMIN',hash,1,0,null,'[]',account.created_at),
  db.prepare('INSERT INTO security_audit (id,campus_id,actor_id,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),campusId,id,'Initialized the institution through the protected bootstrap flow.',account.created_at)
 ]);}catch(error){if(await institution(db))throw new ProductError('The institution has already been initialized.',409);throw error;}
 return {user:principal(account),token:await signSession(account,config,now)};
}
