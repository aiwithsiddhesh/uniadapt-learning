'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Plus,Copy,Check,Users,ShieldCheck} from 'lucide-react';
import type {Campus,Course} from '../lib/types';
type Row={id:string;email:string;name:string;role:string;active:number;learner_id:string|null};
type Response={accounts:Row[];setupUrl?:string;expiresAt?:string;error?:string};
export {default} from './account-controls';
export function TeacherAssignment({course,onSave,busy}:{course:Course;onSave:(ids:string[],owner:string)=>Promise<boolean>;busy:boolean}){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/accounts',{cache:'no-store'}).then(r=>r.json() as Promise<Response>).then(b=>setRows((b.accounts||[]).filter(r=>r.role==='TEACHER'))).catch(()=>setError('Unable to load Teachers.'));},[]);
 return <details className="teacher-assignment"><summary><ShieldCheck size={14}/> Teacher and Subject Owner assignment</summary>{error&&<p className="form-error">{error}</p>}<form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await onSave(f.getAll('teacherIds') as string[],String(f.get('ownerTeacherId')));}}><fieldset className="course-assignment"><legend>Assigned Teachers (PRIMARY/CO)</legend>{rows.length?rows.map(r=><label key={r.id}><input name="teacherIds" type="checkbox" value={r.id} defaultChecked={course.teacherIds?.includes(r.id)}/>{r.name} · {r.active?'active':'setup pending'}</label>):<p>Create a Teacher account in User accounts first.</p>}</fieldset><label className="field">PRIMARY Subject Owner<select name="ownerTeacherId" required defaultValue={course.ownerTeacherId||''}><option value="">Choose an assigned Teacher</option>{rows.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label><button className="outline-btn" disabled={busy||!rows.length}><Check size={14}/> Save assignment</button></form></details>;
}
