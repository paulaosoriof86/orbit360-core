#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {GoogleAuth} from 'google-auth-library';
const ROOT=process.cwd(),ART=path.join(ROOT,'orbit360-artifacts/fase-a-product');
const OUT=path.join(ART,'product-runtime-config.js');
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-runtime-config-materialized-v20260813.json');
const HYDRATION_SOURCE_REL='orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js';
const HYDRATION_SOURCE=path.join(ROOT,HYDRATION_SOURCE_REL);
const projectId=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const tenantId=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
function need(ok,code){if(!ok)throw new Error(code);}
function unique(values){const out=[];for(const value of Array.isArray(values)?values:[]){const clean=String(value||'').trim();if(clean&&!out.includes(clean))out.push(clean);}return out;}
function hydrationContract(){
 need(fs.existsSync(HYDRATION_SOURCE),'PRODUCT_HYDRATION_SOURCE_MISSING');
 const src=fs.readFileSync(HYDRATION_SOURCE,'utf8');
 function extract(kind){
  const out=[];const re=new RegExp(kind+'\\s*:\\s*\\[([^\\]]*)\\]','g');let match;
  while((match=re.exec(src))){const body=match[1]||'';const q=/['"]([^'"]+)['"]/g;let item;while((item=q.exec(body)))out.push(item[1]);}
  return unique(out);
 }
 const required=extract('required');
 const optional=extract('optional').filter(name=>!required.includes(name));
 const versionMatch=src.match(/var\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
 need(required.length>0,'PRODUCT_REQUIRED_COLLECTIONS_EMPTY');
 need(!required.includes('notificaciones')&&!optional.includes('notificaciones'),'PRODUCT_UNCONTRACTED_NOTIFICACIONES_PRESENT');
 return {version:versionMatch?versionMatch[1]:'unversioned',source:HYDRATION_SOURCE_REL,required,optional,collections:required.concat(optional)};
}
async function getJson(url,token){const r=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});need(r.ok,'FIREBASE_MANAGEMENT_HTTP_'+r.status);return r.json();}
let report={schemaVersion:'orbit360-fase-a-product-runtime-config-materializer-v2',ok:false,status:'FASE_A_PRODUCT_RUNTIME_CONFIG_FAIL',projectBound:false,tenantBound:false,webAppsObserved:0,selectedWebApp:true,writeAuthorized:false,secretAccess:true,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
try{
 need(projectId&&tenantId,'PRODUCT_RUNTIME_SCOPE_REQUIRED');
 const hydration=hydrationContract();
 const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/firebase.readonly']});
 const client=await auth.getClient();const access=await client.getAccessToken();const token=typeof access==='string'?access:access&&access.token;need(token,'FIREBASE_MANAGEMENT_TOKEN_REQUIRED');
 const list=await getJson('https://firebase.googleapis.com/v1beta1/projects/'+encodeURIComponent(projectId)+'/webApps?pageSize=100',token);
 const apps=(Array.isArray(list.apps)?list.apps:[]).filter(a=>String(a&&a.state||'').toUpperCase()!=='DELETED').sort((a,b)=>String(a.appId||'').localeCompare(String(b.appId||'')));
 report.webAppsObserved=apps.length;need(apps.length>0,'NO_ACTIVE_FIREBASE_WEB_APP');
 const app=apps[0];need(app&&app.name&&app.appId,'FIREBASE_WEB_APP_INVALID');
 const cfg=await getJson('https://firebase.googleapis.com/v1beta1/'+app.name+'/config',token);
 need(String(cfg.projectId||'')===projectId,'FIREBASE_CONFIG_PROJECT_MISMATCH');need(cfg.appId&&cfg.apiKey&&cfg.authDomain,'FIREBASE_WEB_CONFIG_INCOMPLETE');
 const publicCfg={enabled:true,environmentRef:'firebase-product-readonly',projectId:cfg.projectId,authDomain:cfg.authDomain,appId:cfg.appId,apiKey:cfg.apiKey,storageBucket:cfg.storageBucket||'',tenantHint:tenantId,collections:hydration.collections,requiredCollections:hydration.required,optionalCollections:hydration.optional,hydrationContractVersion:hydration.version,hydrationContractSource:hydration.source};
 const js='/* Generated in CI runner from Firebase Management API; public web configuration only. */\nwindow.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ = Object.freeze('+JSON.stringify(publicCfg,null,2)+');\n';
 fs.writeFileSync(OUT,js,'utf8');const digest=crypto.createHash('sha256').update(js).digest('hex');
 report.ok=true;report.status='FASE_A_PRODUCT_RUNTIME_CONFIG_PASS';report.projectBound=true;report.tenantBound=true;report.configSha256=digest;report.secretAccess=false;report.hydrationContractVersion=hydration.version;report.hydrationContractSource=hydration.source;report.requiredCollectionCount=hydration.required.length;report.optionalCollectionCount=hydration.optional.length;report.totalCollectionCount=hydration.collections.length;report.uncontractedNotificaciones=false;
}catch(e){report.error=String(e&&e.message||e).slice(0,240);}
fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(41);
