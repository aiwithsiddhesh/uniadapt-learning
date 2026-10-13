import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,NOW,admin} from './foundation-helpers.mts';
import {openCampus,saveCampus} from '../lib/store.ts';
import {readRoleCampus} from '../lib/scoped-store.ts';
import type {AcademicAction,PlacementPreview} from '../lib/academic-types.ts';
test('M01 a historical Teacher query cannot read the Student’s new Section, preferences or other-subject deficit',async()=>{const f=await setup();await f.db.prepare('INSERT INTO accounts (id,campus_id,email,name,role,active,created_at) VALUES (?,?,?,?,?,1,?)').bind('other','college','other@example.invalid','Other','TEACHER',NOW.toISOString()).run();const b=f.data.offerings[1];await f.act({type:'saveOffering',id:b.id,subjectId:b.subjectId,sectionId:b.sectionId,exam:b.exam,capacity:b.capacity,status:'ACTIVE',teacherIds:['other'],primaryTeacherId:'other',ownerTeacherId:'teacher'});
 for(const index of [0,1]){const a:AcademicAction={type:'previewPlacement',learnerId:'learner-me',rollNo:'ROLL',sectionId:f.data.sections[index].id,electiveSubjectIds:[]},p=await f.act(a) as {preview:PlacementPreview};await f.act({...a,type:'confirmPlacement',previewHash:p.preview.hash});}
 await f.act({type:'saveSection',id:f.data.sections[1].id,semesterId:f.data.sections[1].semesterId,name:'SECRET NEW SECTION',capacity:2000,active:true});const stored=await openCampus(f.db,'college','x',NOW);stored.state.learners[0].blackouts=['2029-09-09'];stored.state.plans[0].requiredHours=98765;stored.state.plans[0].deadlines=[{date:'2030-11-11',requiredHours:98765,availableHours:1234}];await saveCampus(f.db,'college',stored.revision,stored.state,NOW);const view=(await readRoleCampus(f.db,{...admin,id:'teacher',role:'TEACHER'},NOW)).state,json=JSON.stringify(view);assert.equal(view.courses.length,1);assert.ok(!json.includes('SECRET NEW SECTION'));assert.ok(!json.includes('2029-09-09'));assert.ok(!json.includes('98765'));assert.ok(!json.includes('2030-11-11'));
});
