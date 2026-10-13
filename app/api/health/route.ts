import {env} from 'cloudflare:workers';
import {runtimeAuth} from '../../../lib/runtime-auth';
export const dynamic='force-dynamic';
// Cheap readiness only. Full M01–M04 behavior is verified by release tests,
// rather than expensive synthetic password/learning work on every health call.
export async function GET(){try{
 if(!env.DB||!env.UNIADAPT_AUTH_SECRET||env.UNIADAPT_AUTH_SECRET.length<32)throw new Error('Storage or authentication binding missing');
 const config=runtimeAuth(env,import.meta.env.DEV);
 const expected=['campuses','accounts','institutions','auth_tokens','auth_limits','security_audit','academic_institutes','academic_departments','academic_programs','academic_batches','academic_semesters','academic_sections','academic_subjects','academic_units','academic_offerings','academic_assignments','academic_placements','academic_enrollments','academic_operations','academic_placement_history','academic_unit_policies','academic_calendars','academic_calendar_versions','academic_timetables','academic_exams'];
 const tables=await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${expected.map(()=>'?').join(',')})`).bind(...expected).all();
 if(tables.results.length!==expected.length)throw new Error('Storage migration missing');
 const columns=await env.DB.prepare('PRAGMA table_info(accounts)').all<{name:string}>();if(!['auth_provider_user_id','auth_provider_generation'].every(name=>columns.results.some(c=>c.name===name)))throw new Error('Authentication migration missing');
 return Response.json({status:'ready',storage:'connected',authentication:config.provider?'supabase-configured':'local-development',foundation:'M01–M04',verification:'Release tests and role acceptance are separate from readiness.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',error:'Check authentication settings, database binding and migrations.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
