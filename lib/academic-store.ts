import type {AcademicAction,AcademicData,Subject,Offering} from './academic-types.ts';
import type {Campus} from './types.ts';
import type {Principal} from './access-types.ts';
import {emptyAcademic,applyAcademic,previewPlacement,previewBulkPlacement,previewOfferingActivation,previewPlacementClosure,requireAcademicAdmin,type AcademicTeacher} from './academic.ts';
import {openCampus} from './store.ts';
import {ProductError} from './engine.ts';
type Row=Record<string,unknown>;
const specs=[
 ['departments','academic_departments',{id:'id',code:'code',name:'name',active:'active'}],
 ['programs','academic_programs',{id:'id',departmentId:'department_id',code:'code',name:'name',durationSemesters:'duration_semesters',active:'active'}],
 ['batches','academic_batches',{id:'id',programId:'program_id',code:'code',startYear:'start_year',endYear:'end_year',active:'active'}],
 ['semesters','academic_semesters',{id:'id',batchId:'batch_id',number:'number',startDate:'start_date',endDate:'end_date',active:'active'}],
 ['sections','academic_sections',{id:'id',semesterId:'semester_id',name:'name',capacity:'capacity',active:'active'}],
 ['subjects','academic_subjects',{id:'id',programId:'program_id',semesterNo:'semester_no',code:'code',name:'name',credits:'credits',type:'type',group:'elective_group',groupRequired:'group_required',contentCourseId:'content_course_id',ownerTeacherId:'owner_teacher_id',active:'active'}],
 ['offerings','academic_offerings',{id:'id',subjectId:'subject_id',sectionId:'section_id',courseId:'course_id',exam:'exam',status:'status',capacity:'capacity'}],
 ['placements','academic_placements',{id:'id',rollNo:'roll_no',sectionId:'section_id',electiveSubjectIds:'electives',active:'active'}],
 ['enrollments','academic_enrollments',{id:'id',learnerId:'learner_id',offeringId:'offering_id',status:'status',effectiveAt:'effective_at',endedAt:'ended_at',autoAllocated:'auto_allocated'}],
 ['history','academic_placement_history',{id:'id',learnerId:'learner_id',fromSectionId:'from_section_id',toSectionId:'to_section_id',operationId:'operation_id',date:'date',actorId:'actor_id',previousCourseIds:'previous_course_ids',event:'event'}],
 ['calendars','academic_calendars',{id:'id',semesterId:'semester_id',version:'version',workingDays:'working_days',holidays:'holidays',windows:'windows'}],
 ['timetables','academic_timetables',{id:'id',sectionId:'section_id',offeringId:'offering_id',day:'day',startTime:'start_time',endTime:'end_time',kind:'kind',teacherIds:'teacher_ids',startDate:'start_date',endDate:'end_date'}],
 ['unitPolicies','academic_unit_policies',{id:'id',subjectId:'subject_id',version:'version',units:'units',createdBy:'created_by',createdAt:'created_at'}],
 ['calendarVersions','academic_calendar_versions',{id:'id',semesterId:'semester_id',version:'version',calendar:'calendar',createdBy:'created_by',createdAt:'created_at'}],
] as const;
const jsonFields=new Set(['electiveSubjectIds','previousCourseIds','workingDays','holidays','windows','units','calendar','teacherIds']);
const boolFields=new Set(['active','groupRequired','autoAllocated']);
function decode(row:Row,map:Readonly<Record<string,string>>){return Object.fromEntries(Object.entries(map).map(([key,column])=>[key,jsonFields.has(key)?JSON.parse(String(row[column])):boolFields.has(key)?!!row[column]:row[column]]));}
function encode(value:unknown,key:string){return jsonFields.has(key)?JSON.stringify(value):boolFields.has(key)?Number(key==='active'?value!==false:!!value):key==='event'?(value||'PLACEMENT'):value??null;}
export async function readAcademic(db:D1Database,campusId:string,campus:Campus):Promise<AcademicData>{
 const tables=[...specs.map(s=>s[1]),'academic_units','academic_assignments','academic_exams'];
 const results=await Promise.allSettled(tables.map(table=>db.prepare(`SELECT * FROM ${table} WHERE campus_id = ? ORDER BY rowid`).bind(campusId).all<Row>()));
 const rows=results.map(r=>{if(r.status==='rejected')throw r.reason;return r.value.results;});const data=emptyAcademic(campusId,campus);
 specs.forEach(([key,,map],i)=>{(data as unknown as Row)[key]=rows[i].map(r=>decode(r,map));});
 for(const subject of data.subjects){subject.units=rows[specs.length].filter(r=>r.subject_id===subject.id).map(r=>({id:String(r.id),name:String(r.name),weight:Number(r.weight)}));subject.policyVersion=Math.max(1,...(data.unitPolicies||[]).filter(p=>p.subjectId===subject.id).map(p=>p.version));}
 for(const o of data.offerings){const assigned=rows[specs.length+1].filter(r=>r.offering_id===o.id);o.teacherIds=assigned.map(r=>String(r.teacher_id));o.primaryTeacherIds=assigned.filter(r=>r.role==='PRIMARY').map(r=>String(r.teacher_id));o.primaryTeacherId=o.primaryTeacherIds[0]||null;o.exams=rows[specs.length+2].filter(r=>r.offering_id===o.id).map(r=>({id:String(r.id),offeringId:o.id,type:String(r.type) as 'IA'|'PRACTICAL'|'UNIVERSITY',startAt:String(r.start_at),endAt:String(r.end_at)}));}
 return data;
}
export async function academicTeachers(db:D1Database,campusId:string){const rows=await db.prepare("SELECT id,name,active FROM accounts WHERE campus_id = ? AND role = 'TEACHER' ORDER BY name").bind(campusId).all<AcademicTeacher>();return rows.results;}
function changedRows(data:AcademicData,key:string){return ((data as unknown as Row)[key]||[]) as Row[];}
function units(data:AcademicData){return data.subjects.flatMap(s=>s.units.map(u=>({...u,subjectId:s.id})));}
function assignments(data:AcademicData){return data.offerings.flatMap(o=>o.teacherIds.map(id=>({id:o.id+':'+id,offeringId:o.id,teacherId:id,role:(o.primaryTeacherIds||[o.primaryTeacherId]).includes(id)?'PRIMARY':'CO'})));}
// One D1 transaction writes academic records and the learning-state cache.
// A unique operation marker is inserted only if the expected revision matches.
// Every later statement is gated by that marker, so a stale writer changes nothing.
export async function commitAcademic(db:D1Database,user:Principal,revision:number,before:AcademicData,after:AcademicData,campus:Campus,action:AcademicAction,operationId:string,now=new Date(),extra:(guard:string)=>D1PreparedStatement[]=()=>[]){
 requireAcademicAdmin(user,before.institute.id);const state=JSON.stringify(campus);if(new TextEncoder().encode(state).length>1500000)throw new ProductError('Campus learning storage limit reached.',413);
 const guard='EXISTS (SELECT 1 FROM academic_operations WHERE id = ? AND campus_id = ?)';
 const statements:D1PreparedStatement[]=[
  db.prepare('INSERT OR IGNORE INTO academic_institutes (id,name,timezone) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM campuses WHERE owner_id = ? AND revision = ?)').bind(user.campusId,campus.name,campus.timezone,user.campusId,revision),
  db.prepare('INSERT INTO academic_operations (id,campus_id,actor_id,action,revision,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM campuses WHERE owner_id = ? AND revision = ?)').bind(operationId,user.campusId,user.id,action.type,revision,now.toISOString(),user.campusId,revision),
  db.prepare(`UPDATE academic_institutes SET name = ?, timezone = ?, code = ?, active = ?, auth_policy = ? WHERE id = ? AND ${guard}`).bind(campus.name,campus.timezone,after.institute.code||'UNIADAPT',Number(after.institute.active!==false),JSON.stringify(after.institute.authPolicy||{accountAttempts:5,ipAttempts:20,windowSeconds:900}),user.campusId,operationId,user.campusId),
 ];
 const saveRows=(table:string,map:Readonly<Record<string,string>>,oldRows:Row[],newRows:Row[])=>{
  const oldById=new Map(oldRows.map(r=>[r.id,r])),changed=newRows.filter(r=>!oldById.has(r.id)||JSON.stringify(oldById.get(r.id))!==JSON.stringify(r));if(!changed.length)return;
  changed.sort((a,b)=>Number(oldById.has(b.id))-Number(oldById.has(a.id)));
  const keys=Object.keys(map),columns=keys.map(k=>map[k]),rows=changed.map(row=>Object.fromEntries(keys.map(k=>[k,encode(row[k],k)])));
  const fields=keys.filter(k=>k!=='id'),values=keys.map(k=>`json_extract(j.value, '$.${k}')`);
  statements.push(db.prepare(`INSERT INTO ${table} (${columns.join(', ')}, campus_id) SELECT ${values.join(', ')}, ? FROM json_each(?) j WHERE ${guard} ORDER BY CAST(j.key AS INTEGER) ON CONFLICT(id) DO UPDATE SET ${fields.map(k=>map[k]+' = excluded.'+map[k]).join(', ')} WHERE ${table}.campus_id = ?`).bind(user.campusId,JSON.stringify(rows),operationId,user.campusId,user.campusId));
 };
 // Parent rows, placements and enrollments are ordered by their foreign keys.
 for(const [key,table,map] of specs.filter(s=>s[0]!=='enrollments'&&s[0]!=='history'))saveRows(table,map,changedRows(before,key),changedRows(after,key));
 for(const [table,map,oldRows,newRows] of [
  ['academic_units',{id:'id',subjectId:'subject_id',name:'name',weight:'weight'},units(before),units(after)],
  ['academic_assignments',{id:'id',offeringId:'offering_id',teacherId:'teacher_id',role:'role'},assignments(before),assignments(after)],
  ['academic_exams',{id:'id',offeringId:'offering_id',type:'type',startAt:'start_at',endAt:'end_at'},before.offerings.flatMap(o=>o.exams||[]),after.offerings.flatMap(o=>o.exams||[])],
 ] as const){for(const row of oldRows)if(!newRows.some(r=>r.id===row.id))statements.push(db.prepare(`DELETE FROM ${table} WHERE id = ? AND campus_id = ? AND ${guard}`).bind(row.id,user.campusId,operationId,user.campusId));saveRows(table,map,oldRows as Row[],newRows as Row[]);}
 for(const [key,table,map] of specs.filter(s=>s[0]==='enrollments'||s[0]==='history'))saveRows(table,map,changedRows(before,key),changedRows(after,key));
 for(const row of before.timetables||[])if(!after.timetables?.some(s=>s.id===row.id))statements.push(db.prepare(`DELETE FROM academic_timetables WHERE id = ? AND campus_id = ? AND ${guard}`).bind(row.id,user.campusId,operationId,user.campusId));
 statements.push(db.prepare(`UPDATE accounts SET department_id = (SELECT pr.department_id FROM academic_placements pl JOIN academic_sections se ON se.id = pl.section_id JOIN academic_semesters sm ON sm.id = se.semester_id JOIN academic_batches ba ON ba.id = sm.batch_id JOIN academic_programs pr ON pr.id = ba.program_id WHERE pl.id = accounts.learner_id AND pl.active = 1) WHERE role = 'STUDENT' AND campus_id = ? AND EXISTS (SELECT 1 FROM academic_placements pl WHERE pl.id = accounts.learner_id AND pl.active = 1) AND ${guard}`).bind(user.campusId,operationId,user.campusId));
 statements.push(...extra(guard));
 statements.push(db.prepare(`UPDATE campuses SET state = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ? AND ${guard} RETURNING revision`).bind(state,now.toISOString(),user.campusId,revision,operationId,user.campusId));
 const results=await db.batch<{revision:number}>(statements),saved=results.at(-1)?.results?.[0];if(!saved)throw new ProductError('Academic data changed in another session. Reload and preview the action again.',409);return saved.revision;
}
export async function runAcademic(db:D1Database,user:Principal,revision:number,action:AcademicAction,now=new Date()){
 requireAcademicAdmin(user,user.campusId);const stored=await openCampus(db,user.campusId,user.name,now);if(stored.revision!==revision)throw new ProductError('The campus changed. Reload academic setup and preview again.',409);
 const data=await readAcademic(db,user.campusId,stored.state);
 if(action.type==='previewPlacement')return {preview:await previewPlacement(data,stored.state,user,action,revision),revision};
 if(action.type==='previewBulkPlacement'){const p=await previewBulkPlacement(data,stored.state,user,action,revision);return {bulkPreview:{rows:p.rows,hash:p.hash,revision},revision};}
 if(action.type==='previewPlacementClosure'){const p=await previewPlacementClosure(data,stored.state,user,action,revision);return {bulkPreview:{rows:p.rows,hash:p.hash,revision},revision};}
 if(action.type==='previewOfferingActivation'){const p=await previewOfferingActivation(data,stored.state,user,action,revision);return {bulkPreview:{rows:p.rows,hash:p.hash,revision},revision};}
 const teachers=await academicTeachers(db,user.campusId),operationId=crypto.randomUUID(),next=await applyAcademic(data,stored.state,user,action,revision,operationId,teachers,now);
 const saved=await commitAcademic(db,user,revision,data,next.data,next.campus,action,operationId,now);return {academic:next.data,revision:saved,teachers};
}
