import type {AuthConfig} from './access-types.ts';
import {supabasePasswordProvider,type SupabaseSettings} from './supabase-auth.ts';
import {ProductError} from './engine.ts';
export function runtimeAuth(settings:SupabaseSettings&{UNIADAPT_AUTH_SECRET?:string;UNIADAPT_LOCAL_AUTH?:string},development=false):AuthConfig{
 const config={secret:settings.UNIADAPT_AUTH_SECRET||'',issuer:'uniadapt-learning'};
 if(config.secret.length<32)throw new ProductError('Institution sessions are not configured.',503);
 // Local passwords are allowed only by an explicit development setting.
 // Every production build requires the managed password provider.
 if(development&&settings.UNIADAPT_LOCAL_AUTH==='true')return config;
 return {...config,provider:supabasePasswordProvider(settings)};
}
