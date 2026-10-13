import {env} from 'cloudflare:workers';
import {authenticate,readCookie} from '../../../lib/auth';
import {openCampus} from '../../../lib/store';
import {readAcademic,academicTeachers,runAcademic} from '../../../lib/academic-store';
import {requireAcademicAdmin} from '../../../lib/academic';
import {studentImport} from '../../../lib/student-import';
import {ProductError} from '../../../lib/engine';
import type {AcademicAction} from '../../../lib/academic-types';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function actor(request:Request){if(!env.DB)throw new ProductError('Academic storage is unavailable.',503);const user=await authenticate(env.DB,readCookie(request),{secret:env.UNIADAPT_AUTH_SECRET||'',issuer:'uniadapt-learning'});requireAcademicAdmin(user,user.campusId);return user;}
function failure(e:unknown){if(e instanceof ProductError)return json({error:e.message},e.status);console.error('Academic request failed',e instanceof Error?e.message:'unknown');return json({error:'Academic changes could not be saved. Please retry.'},500);}
export async function GET(request:Request){try{const user=await actor(request),stored=await openCampus(env.DB!,user.campusId,user.name);const results=await Promise.allSettled([readAcademic(env.DB!,user.campusId,stored.state),academicTeachers(env.DB!,user.campusId)]);const values=results.map(r=>{if(r.status==='rejected')throw r.reason;return r.value;});return json({academic:values[0],teachers:values[1],revision:stored.revision});}catch(e){return failure(e);}}
export async function POST(request:Request){try{const user=await actor(request),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ProductError('Request origin is not allowed.',403);const raw=await request.text();if(raw.length>2100000)throw new ProductError('Request is too large.',413);let body:{revision:number;action:AcademicAction};try{body=JSON.parse(raw);}catch{throw new ProductError('Invalid request.');}if(!Number.isInteger(body.revision)||!body.action||typeof body.action.type!=='string')throw new ProductError('Invalid academic action or revision.');if(body.action.type==='importStudent')return json(await studentImport(env.DB!,user,body.revision,body.action.csv,body.action.confirmHash));return json(await runAcademic(env.DB!,user,body.revision,body.action));}catch(e){return failure(e);}}
