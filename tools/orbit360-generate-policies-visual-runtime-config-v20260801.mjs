#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {GoogleAuth} from 'google-auth-library';
const ROOT=process.cwd();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
const OUT=path.join(ROOT,'orbit360-platform/product-runtime-config.js');
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-visual-runtime-config-summary.json');
const COLLECTIONS=Object.freeze(['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros']);
const text=v=>String(v==null?'':v).trim();
const safe=v=>text(v).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,180);
function write(payload){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');}
async function resolve(){
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform.read-only']});
  const client=await auth.getClient();
  const list=await client.request({url:`https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(PROJECT)}/webApps`});
  const apps=[].concat(list.data&&list.data.apps||[]).filter(a=>text(a.state).toUpperCase()!=='DELETED').sort((a,b)=>text(a.appId).localeCompare(text(b.appId)));
  if(!apps.length)throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_APP_NOT_FOUND');
  const response=await client.request({url:`https://firebase.googleapis.com/v1beta1/${apps[0].name}/config`});
  const c=response.data||{};
  if(text(c.projectId)!==PROJECT||!text(c.apiKey)||!text(c.appId)||!text(c.authDomain))throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_CONFIG_INCOMPLETE');
  return {config:c,webAppCount:apps.length};
}
try{
  if(PROJECT!=='ays-orbit-360-lab'||TENANT!=='alianzas-soluciones')throw new Error('ENVIRONMENT_FAILURE:VISUAL_TARGET_NOT_BOUND');
  const {config,webAppCount}=await resolve();
  const runtime={enabled:true,environmentRef:'firebase-existing-project-readonly-policies-visual',projectId:text(config.projectId),apiKey:text(config.apiKey),appId:text(config.appId),authDomain:text(config.authDomain),storageBucket:text(config.storageBucket),tenantHint:TENANT,collections:COLLECTIONS.slice(),visualReviewRole:'Dirección',visualReviewModule:'polizas',writeAuthorized:false};
  fs.writeFileSync(OUT,'/* Generated in authorized policies visual runner. Public Firebase Web config; no secret material. */\nwindow.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ = Object.freeze('+JSON.stringify(runtime,null,2)+');\n','utf8');
  write({ok:true,status:'POLICIES_VISUAL_RUNTIME_CONFIG_DERIVED',projectIdentityMatches:true,tenantBound:true,webConfigDerivedReadOnly:true,webAppCount,collections:COLLECTIONS.slice(),collectionCount:COLLECTIONS.length,visualReviewRole:'Dirección',writeAuthorized:false,configWrittenToRunnerWorkspace:true,configCommitted:false,secretAccess:false,firestoreRead:false,operationalWrites:0});
}catch(error){write({ok:false,status:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',classification:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',error:safe(error&&error.message||error),configWrittenToRunnerWorkspace:false,configCommitted:false,secretAccess:false,firestoreRead:false,operationalWrites:0});process.exitCode=41;}
