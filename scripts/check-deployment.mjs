import {readFileSync} from 'node:fs';
import {accessConfig} from '../lib/private-access.ts';
const uploadOnly=process.argv.includes('--upload-only');
const config=JSON.parse(readFileSync(new URL('../dist/server/wrangler.json',import.meta.url),'utf8'));
const fail=message=>{console.error(message);process.exit(1);};
const db=config.d1_databases?.find(d=>d.binding==='DB');
if(!db||!db.database_id||db.database_id==='00000000-0000-4000-8000-000000000000')fail('Build with the real client D1 configuration before deployment.');
if(config.preview_urls!==false||config.assets?.run_worker_first!==true)fail('Preview URLs must be disabled and all asset requests must pass through the private Worker.');
if(config.routes?.length)fail('Custom routes require a separate private-access review.');
if(uploadOnly){
 if(config.workers_dev!==false)fail('Initial upload must have workers_dev=false.');
 console.log('Initial hidden-upload configuration passed. The app is not ready for a visitor URL until Access and server secrets are configured.');
}else{
 if(!accessConfig(config.vars||{}))fail('Set the Cloudflare Access issuer, audience and explicit allowed email list before enabling private access.');
 console.log('Private gateway and real D1 deployment configuration passed. Confirm the owner-only Cloudflare Access policy and both server secrets in the account before deploying.');
}
