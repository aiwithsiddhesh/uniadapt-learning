import type {Campus} from './types.ts';
import {sampleCampus} from './sample.ts';
import {makePlan,expireAttempts,ProductError} from './engine.ts';
export type Stored = {state:Campus;revision:number};
export async function openCampus(db:D1Database,ownerId:string,name:string,now=new Date()):Promise<Stored>{
 let row=await db.prepare('SELECT state, revision FROM campuses WHERE owner_id = ?').bind(ownerId).first<{state:string;revision:number}>();
 if(!row){const initial=sampleCampus(name,now);initial.plans=initial.learners.map(l=>makePlan(initial,l.id,now));await db.prepare('INSERT OR IGNORE INTO campuses (owner_id, state, revision, updated_at) VALUES (?, ?, 0, ?)').bind(ownerId,JSON.stringify(initial),now.toISOString()).run();row=await db.prepare('SELECT state, revision FROM campuses WHERE owner_id = ?').bind(ownerId).first<{state:string;revision:number}>();}
 if(!row)throw new ProductError('Your campus could not be opened. Please retry.',503);
 const state=JSON.parse(row.state) as Campus;const before=JSON.stringify(state);expireAttempts(state,now);
 const localToday=new Intl.DateTimeFormat('en-CA',{timeZone:state.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(state.plans.some(p=>new Intl.DateTimeFormat('en-CA',{timeZone:state.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(p.generatedAt))!==localToday))state.plans=state.learners.filter(l=>l.availability.length||state.plans.some(p=>p.learnerId===l.id)).map(l=>makePlan(state,l.id,now));
 if(JSON.stringify(state)!==before){try{const revision=await saveCampus(db,ownerId,row.revision,state,now);return {state,revision};}catch(error){if(!(error instanceof ProductError&&error.status===409))throw error;return openCampus(db,ownerId,name,now);}}
 return {state,revision:row.revision};
}
export async function saveCampus(db:D1Database,ownerId:string,revision:number,state:Campus,now=new Date()):Promise<number>{
 const serialized=JSON.stringify(state);if(new TextEncoder().encode(serialized).length>1500000)throw new ProductError('Your campus has reached this version’s storage limit. Export your records before adding more material.',413);
 const row=await db.prepare('UPDATE campuses SET state = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ? RETURNING revision').bind(serialized,now.toISOString(),ownerId,revision).first<{revision:number}>();
 if(!row)throw new ProductError('Your campus changed in another tab. The latest data has been loaded; try your action again.',409);
 return row.revision;
}
