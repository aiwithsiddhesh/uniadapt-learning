import handler from 'vinext/server/fetch-handler';
import {privateAccess} from '../lib/private-access';

export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const blocked=await privateAccess(request,env,import.meta.env.DEV);
  if(blocked)return blocked;
  return handler.fetch(request,env,ctx);
 }
};
