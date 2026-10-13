import {env} from 'cloudflare:workers';
import {authenticate,readCookie} from '../../../lib/auth';
import {readRoleCampus} from '../../../lib/scoped-store';
import {openCampus,saveCampus} from '../../../lib/store';
import {authorize,applyAuthorized,scopedCampus,normalizeCampus} from '../../../lib/access';
import {courseHelper,ProductError,makePlan} from '../../../lib/engine';
import type {Action} from '../../../lib/types';
import type {Account} from '../../../lib/access-types';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function failure(error:unknown){if(error instanceof ProductError)return json({error:error.message},error.status);console.error('Campus request failed',error instanceof Error?error.message:'unknown');return json({error:'Your request could not be saved. Please retry.'},500);}
async function userFor(request:Request){if(!env.DB)throw new ProductError('Campus storage is unavailable.',503);return authenticate(env.DB,readCookie(request),{secret:env.UNIADAPT_AUTH_SECRET||'',issuer:'uniadapt-learning'});}
export async function GET(request:Request){try{const user=await userFor(request);const stored=await readRoleCampus(env.DB!,user);const state=normalizeCampus(stored.state);return json({state:scopedCampus(state,user),revision:stored.revision,user});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 const user=await userFor(request);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Request origin is not allowed.'},403);
 const raw=await request.text();if(raw.length>150000)return json({error:'This request is too large.'},413);let body:{revision:number;action:Action};try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!body.action||typeof body.action.type!=='string'||!Number.isInteger(body.revision))return json({error:'Invalid action or revision.'},400);
 const visible=await readRoleCampus(env.DB!,user);const institute=await env.DB!.prepare('SELECT code,active FROM academic_institutes WHERE id = ?').bind(user.campusId).first<{code:string;active:number}>();if(institute){visible.state.instituteCode=institute.code;if(!institute.active&&user.role!=='ADMIN')throw new ProductError('The Institute is inactive. Historical records remain available.',403);}authorize(normalizeCampus(visible.state),user,body.action);const stored=await openCampus(env.DB!,user.campusId,user.name),campus=normalizeCampus(stored.state);
 if(body.action.type==='helper')return json(courseHelper(campus,String(body.action.learnerId),String(body.action.courseId),String(body.action.query||'')));
 if(stored.revision!==body.revision)return json({error:'The campus changed in another session. Latest authorized data loaded; retry your action.',state:scopedCampus(campus,user),revision:stored.revision},409);
 let state;
 if(body.action.type==='assignTeachers'){
  const c=campus.courses.find(c=>c.id===body.action.courseId);const ids=body.action.teacherIds;if(!c||!Array.isArray(ids)||!ids.length||!ids.includes(body.action.ownerTeacherId))throw new ProductError('Assign Teachers and choose exactly one Subject Owner.');
  const teachers:Account[]=[];for(const id of ids){const teacher=await env.DB!.prepare('SELECT * FROM accounts WHERE campus_id = ? AND id = ? AND role = ?').bind(user.campusId,id,'TEACHER').first<Account>();if(!teacher)throw new ProductError('Choose valid Teacher accounts.');teachers.push(teacher);}
  c.teacherIds=ids as string[];c.ownerTeacherId=String(body.action.ownerTeacherId);c.teacher=teachers.map(t=>t.name).join(', ');state=campus;state.audit.unshift({date:new Date().toISOString(),action:`Admin assigned Teachers and Subject Owner to ${c.code}.`});
 }else state=applyAuthorized(campus,user,body.action);
 const revision=await saveCampus(env.DB!,user.campusId,stored.revision,state);return json({state:scopedCampus(state,user),revision,user});
 }catch(error){return failure(error);}}
