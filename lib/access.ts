import type {Principal} from './access-types.ts';
import type {Campus,Action,AcademicSession} from './types.ts';
import {ProductError,applyAction,makePlan,mastery,localDate} from './engine.ts';
function denied():never{throw new ProductError('You do not have permission for this operation.',403);}
const teacherActions=new Set(['addTopic','editTopic','addQuestion','approveCurriculum','approveBank','coverage','nudge','createCheckpoint','releaseFeedback']);
const adminActions=new Set(['addCourse','editCourse','updateCampus','addLearner','enroll','assignTeachers','createPrerequisite']);
const studentActions=new Set(['availability','completeSlot','startAttempt','answer','submitAttempt','helper']);
export function normalizeCampus(campus:Campus){campus.sessions??=[];campus.termStart??=localDate(new Date());for(const c of campus.courses){c.teacherIds??=[];c.ownerTeacherId??=null;}return campus;}
const assigned=(campus:Campus,user:Principal)=>campus.courses.filter(c=>!c.catalogueOnly&&c.teacherIds?.includes(user.id)).map(c=>c.id);
export function authorize(campus:Campus,user:Principal,action:Action){
 const type=action.type;
 if(user.role==='ADMIN'){
  if(!adminActions.has(type))denied();if(campus.instituteCode&&['addCourse','updateCampus','assignTeachers'].includes(type))throw new ProductError('Manage Institute, catalogue and Teacher assignments in Academic structure.',403);if(campus.instituteCode&&(type==='enroll'||type==='addLearner'&&Array.isArray(action.courseIds)&&action.courseIds.length))throw new ProductError('Authoritative enrollment requires an academic placement preview.',403);
  if(type==='enroll'&&campus.learners.find(l=>l.id===action.learnerId)?.sectionId)throw new ProductError('Manage this Student’s authoritative subjects through Academic structure → Student placement.',403);
  if((type==='enroll'||type==='addLearner')&&Array.isArray(action.courseIds)&&action.courseIds.some(id=>campus.courses.some(c=>c.id===id&&(c.subjectId||c.catalogueOnly))))throw new ProductError('Academic offerings require a confirmed Student placement.',403);
  const c=campus.courses.find(c=>c.id===action.courseId);
  if(c?.subjectId&&type==='assignTeachers')throw new ProductError('Manage this offering’s Teachers in Academic structure.',403);
  if(c?.subjectId&&type==='editCourse'&&(action.exam!==c.exam||JSON.stringify(action.classBlocks)!==JSON.stringify(c.classBlocks)))throw new ProductError('Manage this offering’s exam dates and timetable in Academic structure.',403);
  return;
 }
 if(user.role==='TEACHER'){
  if(!teacherActions.has(type))denied();const ids=assigned(campus,user);
  if(type==='nudge'){const learner=campus.learners.find(l=>l.id===action.learnerId);const c=campus.courses.find(c=>c.topics.some(t=>t.id===action.topicId));if(!learner||!c||!ids.includes(c.id)||!learner.courseIds.includes(c.id))denied();return;}
  const courseId=type==='releaseFeedback'?campus.sessions?.find(s=>s.id===action.sessionId)?.courseId:action.courseId;
  const c=campus.courses.find(c=>c.id===courseId);if(!c||!ids.includes(c.id))denied();if(c.sectionActive===false||c.subjectActive===false)throw new ProductError('This academic scope is inactive. Historical records are read-only.',403);
  if(['approveCurriculum','approveBank'].includes(type)&&c.ownerTeacherId!==user.id)denied();return;
 }
 if(user.role!=='STUDENT'||!studentActions.has(type)||!user.learnerId)denied();
 if(['availability','completeSlot','startAttempt','helper'].includes(type)&&action.learnerId!==user.learnerId)denied();
 if(['answer','submitAttempt'].includes(type)){const a=campus.attempts.find(a=>a.id===action.attemptId);if(!a||a.learnerId!==user.learnerId)denied();}
 if(['startAttempt','helper'].includes(type)){const l=campus.learners.find(l=>l.id===user.learnerId);if(!l?.courseIds.includes(String(action.courseId)))denied();}
 if(type==='startAttempt'&&action.mode!=='practice'){
  const s=campus.sessions?.find(s=>s.id===action.sessionId);if(!s||s.courseId!==action.courseId||!s.learnerIds.includes(user.learnerId))denied();
 }
}
export function scopedCampus(campus:Campus,user:Principal,now=new Date()):Campus{
 if(user.role==='ADMIN')return structuredClone(campus);
 const self=campus.learners.find(l=>l.id===user.learnerId);
 const ids=user.role==='TEACHER'?assigned(campus,user):[...new Set([...(self?.courseIds||[]),...(self?.historicalCourseIds||[])])];
 const learners=campus.learners.filter(l=>user.role==='STUDENT'?l.id===user.learnerId:[...l.courseIds,...(l.historicalCourseIds||[])].some(id=>ids.includes(id))).map(l=>({...l,courseIds:l.courseIds.filter(id=>ids.includes(id)),historicalCourseIds:l.historicalCourseIds?.filter(id=>ids.includes(id))}));
 const learnerIds=new Set(learners.map(l=>l.id));const attempts=campus.attempts.filter(a=>learnerIds.has(a.learnerId)&&ids.includes(a.courseId));
 const sessions=(campus.sessions||[]).filter(s=>ids.includes(s.courseId)&&(user.role==='TEACHER'||s.learnerIds.includes(user.learnerId!))).map(s=>({...s,learnerIds:user.role==='STUDENT'?[user.learnerId!]:s.learnerIds.filter(id=>learnerIds.has(id)),questionIds:user.role==='STUDENT'?[]:s.questionIds}));
 const result:Campus={questionDifficulty:user.role==='TEACHER'?campus.questionDifficulty:undefined,name:campus.name,department:campus.department,timezone:campus.timezone,termStart:campus.termStart,courses:[],learners,attempts:structuredClone(attempts),sessions,evidence:campus.evidence.filter(e=>learnerIds.has(e.learnerId)&&ids.includes(e.courseId)),plans:campus.plans.filter(p=>learnerIds.has(p.learnerId)).map(p=>({...p,slots:p.slots.filter(s=>ids.includes(s.courseId)),unscheduled:p.unscheduled.filter(s=>ids.includes(s.courseId))})),interventions:campus.interventions.filter(i=>learnerIds.has(i.learnerId)&&campus.courses.some(c=>ids.includes(c.id)&&c.topics.some(t=>t.id===i.topicId))),audit:[],revisionCrossings:campus.revisionCrossings.filter(r=>learnerIds.has(r.learnerId)&&campus.courses.some(c=>ids.includes(c.id)&&c.topics.some(t=>t.id===r.topicId)))};
 result.courses=campus.courses.filter(c=>ids.includes(c.id)).map(c=>{const copy=structuredClone(c);if(user.role==='TEACHER'){if(copy.draftTopics){copy.topics=copy.draftTopics;copy.curriculumApproved=false;if(copy.pendingUnitPolicy)copy.units=copy.pendingUnitPolicy.units;}if(copy.draftQuestions){copy.questions=copy.draftQuestions;copy.bankApproved=false;}return copy;}delete copy.draftTopics;delete copy.draftQuestions;delete copy.artifactHistory;delete copy.pendingUnitPolicy;
  const ownAttempts=attempts.filter(a=>a.courseId===c.id);const revealedIds=new Set(ownAttempts.filter(a=>a.status!=='active'&&(!a.sessionId||campus.sessions?.find(s=>s.id===a.sessionId)?.releaseResults)).flatMap(a=>a.responses.map(r=>r.questionId)));
  const activeIds=new Set(ownAttempts.filter(a=>a.status==='active').map(a=>a.currentQuestionId));
  copy.questions=copy.questions.filter(q=>revealedIds.has(q.id)||activeIds.has(q.id)).map(q=>{if(!revealedIds.has(q.id)){delete (q as unknown as Record<string,unknown>).correct;delete (q as unknown as Record<string,unknown>).explanation;}return q;});
  if(!copy.curriculumApproved)copy.topics=[];copy.teacherIds=[];copy.ownerTeacherId=null;return copy;
 });
 if(user.role==='STUDENT'){
  result.masterySummaries={};for(const c of result.courses)for(const t of c.topics)result.masterySummaries[t.id]=mastery(campus,user.learnerId!,t.id,now);
  result.gradedAnswerCount=campus.evidence.filter(e=>e.learnerId===user.learnerId).length;
  result.attempts=result.attempts.map(a=>{const released=a.status!=='active'&&(!a.sessionId||campus.sessions?.find(s=>s.id===a.sessionId)?.releaseResults);a.feedbackReleased=!!released;if(!released)a.responses=a.responses.map(r=>{delete (r as unknown as Record<string,unknown>).correct;return r;});return a;});
  // Students receive their computed progress, not the bank or unreleased keys.
  result.evidence=[];
 }
 return result;
}
function createSession(campus:Campus,user:Principal,action:Action,now:Date){
 const c=campus.courses.find(c=>c.id===action.courseId);if(!c||!c.curriculumApproved||!c.bankApproved)throw new ProductError('Approved curriculum and a READY question bank are required.');
 if(c.offeringStatus==='DRAFT'||c.catalogueOnly)throw new ProductError('Activate this Section offering before opening assessments.');
 const kind=action.type==='createPrerequisite'?'PREREQ':'CHECKPOINT';const topicIds=action.topicIds;if(!Array.isArray(topicIds)||!topicIds.length||topicIds.length>5||!topicIds.every(id=>c.topics.some(t=>t.id===id)))throw new ProductError('Choose one to five valid topics.');
 const topicScope=c.topics.filter(t=>topicIds.includes(t.id));if(kind==='CHECKPOINT'&&topicScope.some(t=>!['COVERED','REVISED'].includes(t.coverage)))throw new ProductError('Checkpoints may only use COVERED or REVISED topics.');
 if(kind==='PREREQ'){const elapsed=(Date.parse(localDate(now,campus.timezone))-Date.parse(c.termStart||campus.termStart!))/86400000;if(elapsed<0||elapsed>=14)throw new ProductError('Prerequisite diagnostics may open only in the first 14 semester days.');if(campus.sessions?.some(s=>s.kind==='PREREQ'&&s.courseId===c.id))throw new ProductError('This offering already has a prerequisite diagnostic.');}
 const duration=Number(action.durationMinutes),max=Number(action.maxItems);if(!Number.isInteger(duration)||duration<10||duration>60||!Number.isInteger(max)||max<3*topicIds.length||max>40)throw new ProductError('Use 10–60 minutes and 3–40 items, with at least three items per topic.');
 const open=new Date(String(action.openAt)),close=new Date(String(action.closeAt));if(!Number.isFinite(open.getTime())||!Number.isFinite(close.getTime())||close<=open)throw new ProductError('Choose a valid opening and closing window.');
 const minimum=action.supervised?5:6;for(const t of topicScope)if(c.questions.filter(q=>q.topicId===t.id).length<minimum)throw new ProductError(`${t.title} requires at least ${minimum} questions before this diagnostic can open.`);
 const learnerIds=campus.learners.filter(l=>l.courseIds.includes(c.id)).map(l=>l.id);if(!learnerIds.length)throw new ProductError('Assign students to this offering first.');
 const s:AcademicSession={id:crypto.randomUUID(),courseId:c.id,kind,topicIds:topicIds as string[],learnerIds,createdBy:user.id,openAt:open.toISOString(),closeAt:close.toISOString(),durationMinutes:duration,maxItems:max,supervised:!!action.supervised,releaseResults:false,questionIds:c.questions.map(q=>q.id)};campus.sessions!.push(s);campus.audit.unshift({date:now.toISOString(),action:`${user.role} ${user.id} opened a ${kind} session for ${c.code}.`});return campus;
}
export function applyAuthorized(campus:Campus,user:Principal,action:Action,now=new Date()):Campus{
 authorize(campus,user,action);const type=action.type;
 if(type==='createCheckpoint'||type==='createPrerequisite')return createSession(normalizeCampus(structuredClone(campus)),user,action,now);
 if(type==='releaseFeedback'){const next=structuredClone(campus),s=next.sessions!.find(s=>s.id===action.sessionId)!;if(Date.parse(s.closeAt)>now.getTime())throw new ProductError('Wait until the assessment window closes before releasing answers.');s.releaseResults=true;next.audit.unshift({date:now.toISOString(),action:`Teacher ${user.id} released assessment feedback.`});return next;}
 if(['addTopic','editTopic','addQuestion'].includes(type)){
  const original=campus.courses.find(c=>c.id===action.courseId)!;
  if(type==='addQuestion'&&original.draftTopics)throw new ProductError('The Subject Owner must approve the pending curriculum before bank changes.');
  if(original.curriculumApproved&&(type==='addTopic'||type==='editTopic')||original.bankApproved&&type==='addQuestion'){
   const work=structuredClone(campus),draft=work.courses.find(c=>c.id===action.courseId)!;draft.topics=structuredClone(original.draftTopics||original.topics);draft.questions=structuredClone(original.draftQuestions||original.questions);if(original.pendingUnitPolicy)draft.units=structuredClone(original.pendingUnitPolicy.units);
   const next=applyAction(work,action,now),edited=next.courses.find(c=>c.id===action.courseId)!;const changedTopics=edited.topics,changedQuestions=edited.questions;
   Object.assign(edited,structuredClone(original));if(type==='addQuestion')edited.draftQuestions=changedQuestions;else edited.draftTopics=changedTopics;
   syncSharedMaterial(next,original.id);next.plans=next.learners.map(l=>makePlan(next,l.id,now));next.audit.unshift({date:now.toISOString(),action:`Teacher ${user.id} created a replacement draft; active content unchanged.`});return next;
  }
 }
 if(['approveCurriculum','approveBank'].includes(type)){
  const original=campus.courses.find(c=>c.id===action.courseId)!;if(type==='approveBank'&&original.draftTopics)throw new ProductError('Approve the pending curriculum first.');
  const work=structuredClone(campus),candidate=work.courses.find(c=>c.id===action.courseId)!;
  if(type==='approveCurriculum'&&candidate.draftTopics)candidate.topics=structuredClone(candidate.draftTopics);if(type==='approveCurriculum'&&candidate.pendingUnitPolicy){candidate.units=structuredClone(candidate.pendingUnitPolicy.units);candidate.curriculumUnitPolicyVersion=candidate.pendingUnitPolicy.version;delete candidate.pendingUnitPolicy;}
  if(type==='approveBank'&&candidate.draftQuestions)candidate.questions=structuredClone(candidate.draftQuestions);
  const next=applyAction(work,action,now),active=next.courses.find(c=>c.id===action.courseId)!;
  if(original.curriculumApproved||original.bankApproved){active.artifactHistory??=[];active.artifactHistory.push({id:crypto.randomUUID(),date:now.toISOString(),approvedBy:original.activatedBy||null,topics:structuredClone(original.topics),questions:structuredClone(original.questions),units:structuredClone(original.units||[]),unitPolicyVersion:original.curriculumUnitPolicyVersion||1});}
  if(type==='approveCurriculum'){delete active.draftTopics;active.bankApproved=original.bankApproved;}else delete active.draftQuestions;
  active.activatedBy=user.id;active.activatedAt=now.toISOString();syncSharedMaterial(next,active.id);next.plans=next.learners.map(l=>makePlan(next,l.id,now));return next;
 }
 if(type==='startAttempt'&&action.mode!=='practice'){
  const s=campus.sessions!.find(s=>s.id===action.sessionId)!;if(Date.parse(s.openAt)>now.getTime()||Date.parse(s.closeAt)<=now.getTime())throw new ProductError('This assessment is not open.');
  if(campus.attempts.some(a=>a.learnerId===user.learnerId&&a.sessionId===s.id))throw new ProductError('You have already started this assigned assessment.');
  const next=applyAction(campus,{...action,sessionTopicIds:s.topicIds,enforceExposure:true},now),a=next.attempts.at(-1)!;a.expiresAt=new Date(Math.min(Date.parse(s.closeAt),now.getTime()+s.durationMinutes*60000)).toISOString();return next;
 }
 const next=applyAction(campus,type==='startAttempt'?{...action,sessionId:undefined,enforceExposure:true}:action,now);if(['addTopic','editTopic','addQuestion'].includes(type)){syncSharedMaterial(next,String(action.courseId));next.plans=next.learners.map(l=>makePlan(next,l.id,now));}next.audit.unshift({date:now.toISOString(),action:`Authorized ${user.role} action ${type} by account ${user.id}.`});return next;
}
function syncSharedMaterial(campus:Campus,courseId:string){
 const source=campus.courses.find(c=>c.id===courseId);if(!source?.subjectId)return;
 for(const target of campus.courses.filter(c=>c.subjectId===source.subjectId&&c.id!==source.id)){
  const actual=new Map(target.topics.map(t=>[t.id,{coverage:t.coverage,pin:t.pin}]));
  target.topics=source.topics.map(t=>({...structuredClone(t),...(actual.get(t.id)||{coverage:'NOT_STARTED' as const,pin:false})}));
  for(const key of ['questions','draftTopics','draftQuestions','artifactHistory','curriculumApproved','bankApproved','activatedBy','activatedAt','units','unitPolicyVersion','curriculumUnitPolicyVersion','pendingUnitPolicy'] as const){const value=source[key];if(value===undefined)delete (target as unknown as Record<string,unknown>)[key];else (target as unknown as Record<string,unknown>)[key]=structuredClone(value);}
 }
}
