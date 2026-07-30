#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {GoogleAuth} from 'google-auth-library';
const ROOT=process.cwd();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const LIVE_URL=String(process.env.ORBIT360_PRODUCT_URL||'').trim();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m6-root-cause-diagnostic-summary.json');
const scopes=['https://www.googleapis.com/auth/cloud-platform.read-only','https://www.googleapis.com/auth/firebase.readonly','https://www.googleapis.com/auth/devstorage.read_only'];
const normalize=s=>String(s==null?'':s).replace(/\r\n/g,'\n').trim()+'\n';
const hash=s=>crypto.createHash('sha256').update(normalize(s)).digest('hex');
const localHash=rel=>hash(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const safeError=e=>String(e&&((e.response&&e.response.status)||e.code||e.message)||e||'').replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').replace(/https?:\/\/[^\s]+/g,'').slice(0,220);
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n');}
async function request(client,opts){try{return{ok:true,data:(await client.request(opts)).data,status:200,error:''}}catch(e){return{ok:false,data:null,status:Number(e&&e.response&&e.response.status||0),error:safeError(e)}}}
async function main(){
  if(PROJECT!=='ays-orbit-360-lab'||!/^https:\/\//.test(LIVE_URL)||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('PIPELINE_MECHANISM_FAILURE:DIAGNOSTIC_IDENTITY_NOT_BOUND');
  const auth=new GoogleAuth({scopes});const client=await auth.getClient();
  const local={firestoreReadonly:localHash('firestore.product-readonly.rules'),firestoreDeny:localHash('firestore.product-deny-all.rules'),firestoreLegacy:localHash('firestore.rules'),storageReadonly:localHash('storage.product-readonly.rules'),storageDeny:localHash('storage.product-deny-all.rules')};
  const webApps=await request(client,{url:`https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps`});
  let bucket='';
  if(webApps.ok){const apps=[].concat(webApps.data&&webApps.data.apps||[]).filter(x=>String(x.state||'').toUpperCase()!=='DELETED').sort((a,b)=>String(a.appId||'').localeCompare(String(b.appId||'')));if(apps[0]){const cfg=await request(client,{url:`https://firebase.googleapis.com/v1beta1/${apps[0].name}/config`});if(cfg.ok)bucket=String(cfg.data&&cfg.data.storageBucket||'').trim();}}
  const bucketMeta=bucket?await request(client,{url:`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`}):{ok:false,status:0,error:'STORAGE_BUCKET_NOT_DECLARED'};
  const requestedPermissions=['firebaserules.rulesets.create','firebaserules.rulesets.get','firebaserules.releases.create','firebaserules.releases.get','firebaserules.releases.update','firebasehosting.sites.get','firebasehosting.versions.create','firebasehosting.releases.create'];
  const iam=await request(client,{url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,method:'POST',data:{permissions:requestedPermissions}});
  const granted=iam.ok?new Set([].concat(iam.data&&iam.data.permissions||[])):new Set();const missingPermissions=iam.ok?requestedPermissions.filter(p=>!granted.has(p)):[];
  const releases=await request(client,{url:`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases?pageSize=100`});
  const remote={firestore:{present:false,kind:'missing',hash:''},storage:{present:false,kind:'missing',hash:''},releaseReadOk:releases.ok,releaseReadStatus:releases.status};
  if(releases.ok){
    for(const rel of [].concat(releases.data&&releases.data.releases||[]).slice(0,40)){
      const rulesetName=String(rel&&rel.rulesetName||'');if(!rulesetName)continue;
      const rs=await request(client,{url:`https://firebaserules.googleapis.com/v1/${rulesetName}`});if(!rs.ok)continue;
      const files=[].concat(rs.data&&rs.data.source&&rs.data.source.files||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
      const source=files.map(f=>String(f.content||'')).join('\n');const h=hash(source);
      if(/service\s+cloud\.firestore/.test(source)){remote.firestore.present=true;remote.firestore.hash=h;remote.firestore.kind=h===local.firestoreReadonly?'product_readonly':h===local.firestoreDeny?'deny_all':h===local.firestoreLegacy?'legacy':'other';}
      if(/service\s+firebase\.storage/.test(source)){remote.storage.present=true;remote.storage.hash=h;remote.storage.kind=h===local.storageReadonly?'product_readonly':h===local.storageDeny?'deny_all':'other';}
    }
  }
  let hosting={httpOk:false,status:0,productShell:false,rollbackShell:false,labShell:false};
  try{const res=await fetch(LIVE_URL,{redirect:'follow',headers:{'cache-control':'no-cache','pragma':'no-cache'}});const body=await res.text();hosting={httpOk:res.ok,status:res.status,productShell:body.includes('auth-product-runtime-p0.js')&&body.includes('Orbit.productAppP0.init();'),rollbackShell:body.includes('La plataforma no está disponible temporalmente'),labShell:/backend-lab-loader|store-firestore-lab|data\/seed\.js/.test(body)};}catch(e){hosting.error=safeError(e)}
  const productApplied=hosting.productShell&&remote.firestore.kind==='product_readonly'&&remote.storage.kind==='product_readonly';
  const rollbackApplied=hosting.rollbackShell&&remote.firestore.kind==='deny_all'&&remote.storage.kind==='deny_all';
  const anyProduct=hosting.productShell||remote.firestore.kind==='product_readonly'||remote.storage.kind==='product_readonly';
  const anyRollback=hosting.rollbackShell||remote.firestore.kind==='deny_all'||remote.storage.kind==='deny_all';
  let classification='PIPELINE_MECHANISM_FAILURE',rootCause='FIREBASE_CLI_FAILURE_REQUIRES_CORRECTIVE_MECHANISM';
  if(!bucket||bucketMeta.status===404||(!remote.storage.present&&releases.ok)){classification='ENVIRONMENT_FAILURE';rootCause='STORAGE_TARGET_NOT_READY_FOR_RULES_DEPLOY';}
  else if(iam.ok&&missingPermissions.some(p=>p.startsWith('firebaserules.'))){classification='SECURITY_FAILURE';rootCause='SERVICE_ACCOUNT_MISSING_FIREBASE_RULES_DEPLOY_PERMISSIONS';}
  else if(productApplied){classification='PIPELINE_MECHANISM_FAILURE';rootCause='DEPLOY_APPLIED_BUT_WORKFLOW_POST_DEPLOY_VERIFICATION_FAILED';}
  else if(rollbackApplied){classification='PIPELINE_MECHANISM_FAILURE';rootCause='ROLLBACK_APPLIED_BUT_WORKFLOW_ROLLBACK_VERIFICATION_FAILED';}
  else if(anyProduct||anyRollback){classification='PIPELINE_MECHANISM_FAILURE';rootCause='PARTIAL_REMOTE_STATE_AFTER_FIREBASE_CLI_FAILURE';}
  const diagnosticComplete=Boolean(webApps.ok&&hosting.status>0&&(iam.ok||releases.ok||bucketMeta.ok));
  write({schemaVersion:'orbit360-m6-root-cause-diagnostic-v1',gateId:'block6-go-live-product-v20260730',contractVersion:'6.1.1',failedRunId:30516109429,ok:diagnosticComplete,status:diagnosticComplete?'M6_ROOT_CAUSE_DIAGNOSTIC_COMPLETE':'M6_ROOT_CAUSE_DIAGNOSTIC_INCOMPLETE',classification,rootCause,projectIdentityMatches:true,storageBucketDeclared:Boolean(bucket),storageBucketReadable:bucketMeta.ok,storageBucketReadStatus:bucketMeta.status,iamTestCompleted:iam.ok,requestedPermissionCount:requestedPermissions.length,grantedPermissionCount:granted.size,missingPermissions,rulesReleaseReadOk:releases.ok,rulesReleaseReadStatus:releases.status,remoteRules:{firestore:{present:remote.firestore.present,kind:remote.firestore.kind},storage:{present:remote.storage.present,kind:remote.storage.kind}},hosting,remoteState:{productApplied,rollbackApplied,partialState:(anyProduct||anyRollback)&&!productApplied&&!rollbackApplied},dataWrites:0,firestoreWrites:0,operationalWrites:0,deployExecuted:false,rulesApplied:false,productionMutation:false,secretValuesEmitted:false});
  if(!diagnosticComplete)process.exitCode=41;
}
main().catch(error=>{write({schemaVersion:'orbit360-m6-root-cause-diagnostic-v1',gateId:'block6-go-live-product-v20260730',contractVersion:'6.1.1',failedRunId:30516109429,ok:false,status:'M6_ROOT_CAUSE_DIAGNOSTIC_INCOMPLETE',classification:'PIPELINE_MECHANISM_FAILURE',rootCause:'DIAGNOSTIC_EXECUTION_FAILURE',error:safeError(error),dataWrites:0,firestoreWrites:0,operationalWrites:0,deployExecuted:false,rulesApplied:false,productionMutation:false});process.exitCode=41;});
