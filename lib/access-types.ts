export type Role='ADMIN'|'TEACHER'|'STUDENT';
export type Account={id:string;campus_id:string;email:string;name:string;role:Role;password_hash:string|null;active:number;token_version:number;learner_id:string|null;course_ids:string;created_at:string;department_id?:string|null;username?:string|null};
export type Principal={id:string;campusId:string;email:string;name:string;role:Role;learnerId:string|null;courseIds:string[];tokenVersion:number};
export type AuthConfig={secret:string;issuer:string};
export type Institution={id:string;campus_id:string;created_by:string;created_at:string};
