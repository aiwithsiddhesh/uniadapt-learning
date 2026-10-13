import {createRemoteJWKSet,jwtVerify} from 'jose';
type AccessSettings={UNIADAPT_ACCESS_ISSUER?:string;UNIADAPT_ACCESS_AUDIENCE?:string;UNIADAPT_ALLOWED_EMAILS?:string};
const keySets=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
const denied=(status:number,message:string)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export function accessConfig(settings:AccessSettings){
 const issuer=settings.UNIADAPT_ACCESS_ISSUER||'',audience=settings.UNIADAPT_ACCESS_AUDIENCE||'',emails=(settings.UNIADAPT_ALLOWED_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
 try{const url=new URL(issuer);if(url.protocol!=='https:'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(url.hostname)||issuer!==url.origin||!audience||!emails.length||emails.some(e=>e.includes('*')||!/^\S+@\S+\.\S+$/.test(e)))return null;return {issuer,audience,emails};}catch{return null;}
}
export async function verifyPrivateToken(token:string,settings:AccessSettings,keySet:Parameters<typeof jwtVerify>[1],now=new Date()){
 const config=accessConfig(settings);if(!config)throw new Error('Private access is not configured.');
 if(!token||token.length>16384)throw new Error('Private access required.');
 const {payload}=await jwtVerify(token,keySet,{issuer:config.issuer,audience:config.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],currentDate:now});
 if(typeof payload.iat!=='number'||payload.iat>Math.floor(now.getTime()/1000)+30||typeof payload.email!=='string'||!config.emails.includes(payload.email.trim().toLowerCase()))throw new Error('Private access required.');
 return payload;
}
export async function privateAccess(request:Request,settings:AccessSettings,development=false){
 const url=new URL(request.url);
 if(development&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))return null;
 const config=accessConfig(settings);if(!config)return denied(503,'Private access is not configured. Contact the deployment owner.');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return denied(403,'Private access required.');
 try{
  let keys=keySets.get(config.issuer);if(!keys){keys=createRemoteJWKSet(new URL('/cdn-cgi/access/certs',config.issuer),{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:300000});keySets.set(config.issuer,keys);}
  await verifyPrivateToken(token,settings,keys);return null;
 }catch{return denied(403,'Private access required.');}
}
