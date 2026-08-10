#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ID=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const OUT=process.env.ORBIT360_V34_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v34-logging-iam-capability-sanitized-v20260810.json';
const REQUIRED=['logging.logEntries.list','logging.privateLogEntries.list'];

function persist(payload){
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
}
function base(){return {
  schemaVersion:'orbit360-v34-logging-iam-capability-diagnostic-v1',
  projectIdClass:'EXPECTED_LAB_PROJECT',
  permissionCount:2,
  loggingLogEntriesList:false,
  loggingPrivateLogEntriesList:false,
  iamPolicyBindingsRead:false,
  auditLogEntriesRead:false,
  targetClientDataRead:false,
  iamWrites:0,
  operationalWrites:0,
  firestoreReads:0,
  firestoreWrites:0,
  authReads:0,
  authWrites:0,
  rawPrincipalPersisted:false,
  credentialsPersisted:false,
  containsPII:false,
  containsSecrets:false
};}

async function runtime(){
  const out=base();
  try{
    if(PROJECT_ID!=='ays-orbit-360-lab') throw new Error('PROJECT_ID_MISMATCH');
    const {GoogleAuth}=await import('google-auth-library');
    const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform.read-only']});
    const client=await auth.getClient();
    const headers=await client.getRequestHeaders();
    const url=`https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}:testIamPermissions`;
    const response=await fetch(url,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({permissions:REQUIRED})});
    if(!response.ok) throw new Error(`TEST_IAM_PERMISSIONS_HTTP_${response.status}`);
    const body=await response.json();
    const granted=new Set(Array.isArray(body.permissions)?body.permissions:[]);
    out.loggingLogEntriesList=granted.has('logging.logEntries.list');
    out.loggingPrivateLogEntriesList=granted.has('logging.privateLogEntries.list');
    out.decision=out.loggingLogEntriesList&&out.loggingPrivateLogEntriesList?'IAM_LOGGING_CAPABILITY_PRESENT':'IAM_LOGGING_CAPABILITY_GAP';
    out.classification=out.decision==='IAM_LOGGING_CAPABILITY_PRESENT'?'ENVIRONMENT_CAPABILITY_PRESENT':'ENVIRONMENT_FAILURE';
    out.rootCause=out.decision==='IAM_LOGGING_CAPABILITY_PRESENT'?'AUDIT_ACCESS_FAILURE_REQUIRES_NON_IAM_DIAGNOSIS':'REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE';
    out.ok=true;
    persist(out);
    console.log(JSON.stringify({decision:out.decision,loggingLogEntriesList:out.loggingLogEntriesList,loggingPrivateLogEntriesList:out.loggingPrivateLogEntriesList,iamWrites:0,ok:true}));
  }catch(error){
    Object.assign(out,{decision:'STOP_RETRY',classification:'ENVIRONMENT_FAILURE',rootCause:String(error?.message||error).slice(0,160),ok:false});
    persist(out);console.log(JSON.stringify({decision:out.decision,classification:out.classification,rootCause:out.rootCause,iamWrites:0,ok:false}));process.exitCode=42;
  }
}

if(process.env.ORBIT360_SOURCE_ONLY==='1'){
  const out={...base(),schemaVersion:'orbit360-v34-logging-iam-capability-source-v1',decision:'SOURCE_ONLY_READY',classification:'ENVIRONMENT_FAILURE_IAM_CAPABILITY_DIAGNOSTIC_SOURCE_READY',requiredPermissions:REQUIRED,networkAccess:false,secretAccess:false,ok:true};
  persist(out);console.log(JSON.stringify(out));
}else{
  await runtime();
}
