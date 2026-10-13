import {env} from 'cloudflare:workers';
import bcrypt from 'bcryptjs';
import {sampleCampus} from '../../../lib/sample';
import {applyAction,makePlan,questionFor,ProductError} from '../../../lib/engine';
import {authenticate,signSession} from '../../../lib/auth';
import {authorize,scopedCampus} from '../../../lib/access';
import type {Account,Principal} from '../../../lib/access-types';
import {emptyAcademic,applyAcademic,previewPlacement} from '../../../lib/academic';
import type {AcademicAction} from '../../../lib/academic-types';
export const dynamic='force-dynamic';
// Owner-private, read-only probe. All learning/auth fixtures are disposable;
// no institutional account, password, token or student record is persisted.
export async function GET(){try{
 if(!env.DB||!env.UNIADAPT_AUTH_SECRET)throw new Error('Storage or authentication binding missing');
 const expected=['campuses','accounts','institutions','auth_tokens','auth_limits','security_audit','academic_institutes','academic_departments','academic_programs','academic_batches','academic_semesters','academic_sections','academic_subjects','academic_units','academic_offerings','academic_assignments','academic_placements','academic_enrollments','academic_operations','academic_placement_history','academic_unit_policies','academic_calendars','academic_calendar_versions','academic_timetables','academic_exams'];
 const tables=await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${expected.map(()=>'?').join(',')})`).bind(...expected).all();if(tables.results.length!==expected.length)throw new Error('Storage migration missing');
 const now=new Date();let c=sampleCampus('Runtime check',now);c=applyAction(c,{type:'startAttempt',learnerId:'learner-me',courseId:'programming',topicId:'values',mode:'practice'},now);
 const user:Principal={id:'probe',campusId:'probe',role:'STUDENT',name:'Probe',email:'probe@example.invalid',learnerId:'learner-me',courseIds:[],tokenVersion:0};
 const view=scopedCampus(c,user,now);if(view.courses[0].questions.some(q=>Object.hasOwn(q,'correct')))throw new Error('Student answer key isolation failed');let blocked=false;try{authorize(c,user,{type:'addCourse'});}catch(e){blocked=e instanceof ProductError&&e.status===403;}if(!blocked)throw new Error('Role enforcement failed');
 while(c.attempts[0].status==='active'){const a=c.attempts[0],q=questionFor(c,a)!;c=applyAction(c,{type:'answer',attemptId:a.id,questionId:q.id,answer:q.correct},now);}
 const plan=makePlan(c,'learner-me',now);if(c.evidence.length!==3||new Set(plan.slots.map(s=>s.date+s.time)).size!==plan.slots.length)throw new Error('Learning check failed');
 const hash=await bcrypt.hash('Readonly probe password',10);if(!await bcrypt.compare('Readonly probe password',hash))throw new Error('Password verification failed');
 const account:Account={id:'probe',campus_id:'probe',role:'STUDENT',name:'Probe',email:'probe@example.invalid',learner_id:'learner-me',course_ids:'[]',active:1,token_version:0,password_hash:hash,created_at:now.toISOString()};
 const fixtureDb={prepare(){return {bind(){return {async first(){return account;}};}};}} as unknown as D1Database;
 const config={secret:env.UNIADAPT_AUTH_SECRET,issuer:'uniadapt-learning'},token=await signSession(account,config,now);if((await authenticate(fixtureDb,token,config,now)).role!=='STUDENT')throw new Error('Session verification failed');
 const fixture=sampleCampus('Academic probe',now);let academic={data:emptyAcademic('probe',fixture),campus:fixture};const admin:Principal={...user,id:'probe-admin',role:'ADMIN',learnerId:null},teacher=[{id:'probe-teacher',name:'Probe Teacher',active:1}],today=now.toISOString().slice(0,10),end=new Date(now.getTime()+90*86400000).toISOString().slice(0,10),year=now.getUTCFullYear();
 const step=async(action:AcademicAction)=>{academic=await applyAcademic(academic.data,academic.campus,admin,action,0,'probe-operation',teacher,now);};
 await step({type:'saveDepartment',code:'PROBE',name:'Probe'});await step({type:'saveProgram',departmentId:academic.data.departments[0].id,code:'PROBE',name:'Probe',durationSemesters:8});await step({type:'saveBatch',programId:academic.data.programs[0].id,code:'PROBE',startYear:year,endYear:year+4});await step({type:'saveSemester',batchId:academic.data.batches[0].id,number:1,startDate:today,endDate:end});await step({type:'saveSection',semesterId:academic.data.semesters[0].id,name:'Probe',capacity:1});await step({type:'saveSubject',programId:academic.data.programs[0].id,semesterNo:1,code:'PROBE',name:'Probe',credits:1,subjectType:'CORE_THEORY',units:[{name:'Probe Unit',weight:100}]});await step({type:'saveOffering',subjectId:academic.data.subjects[0].id,sectionId:academic.data.sections[0].id,exam:end,capacity:1,status:'ACTIVE',primaryTeacherId:'probe-teacher',teacherIds:['probe-teacher'],ownerTeacherId:'probe-teacher'});
 const action:AcademicAction={type:'previewPlacement',learnerId:'learner-me',rollNo:'PROBE',sectionId:academic.data.sections[0].id,electiveSubjectIds:[]},preview=await previewPlacement(academic.data,academic.campus,admin,action,0);await step({...action,type:'confirmPlacement',previewHash:preview.hash});if(academic.data.enrollments.length!==1||academic.campus.learners[0].courseIds[0]!==academic.data.offerings[0].courseId)throw new Error('Academic enrollment check failed');
 await step({type:'saveCalendar',semesterId:academic.data.semesters[0].id,workingDays:[0,1,2,3,4,5,6],holidays:[],windows:[{type:'UNIVERSITY',startDate:today,endDate:end}]});await step({type:'saveExams',offeringId:academic.data.offerings[0].id,exams:[{type:'UNIVERSITY',startLocal:end+'T11:00',endLocal:end+'T12:00'}]});if(academic.data.calendarVersions?.length!==2||!academic.data.offerings[0].exams?.length)throw new Error('Calendar check failed');
 return Response.json({status:'ready',storage:'connected',assessment:'passed',planning:'passed',roles:'passed',authentication:'passed',academicEnrollment:'passed',calendar:'passed'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({status:'unavailable',error:e instanceof Error?e.message:'Health check failed'},{status:503,headers:{'Cache-Control':'no-store'}});}}
