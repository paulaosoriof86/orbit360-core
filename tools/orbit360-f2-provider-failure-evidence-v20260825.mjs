#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

export const PROVIDER_CLASSES=Object.freeze(['DATA_CONTRACT_FAILURE','ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE']);
const text=v=>String(v==null?'':v).trim();
const sanitize=v=>text(v).replace(/[A-Za-z0-9_\-/.+=]{30,}/g,'[redacted]').slice(0,300);

export function classifyProviderError(error={}){
  const message=text(error?.message||error),prefix=message.split(':')[0],code=text(error?.code).toLowerCase();
  if(PROVIDER_CLASSES.includes(prefix))return prefix;
  if(/permission|forbidden|unauthenticated|insufficient|denied/.test(code+' '+message.toLowerCase()))return 'SECURITY_FAILURE';
  if(/credential|service.account|project|network|unavailable|deadline|timeout|dns|socket|econn|fetch/.test(code+' '+message.toLowerCase()))return 'ENVIRONMENT_FAILURE';
  return 'ENVIRONMENT_FAILURE';
}

export function buildProviderFailureEvidence({error,providerRunId='',secretAccess=false,authReadAttempted=false,authReadCompleted=false,firestoreReadAttempted=false,firestoreReadCompleted=false}={}){
  const classification=classifyProviderError(error),raw=text(error?.message||error),explicit=PROVIDER_CLASSES.includes(raw.split(':')[0]),code=explicit?raw:`${classification}:F2_PROVIDER_EXTERNAL_FAILURE`;
  return {
    schemaVersion:'orbit360-f2-provider-failure-evidence-v1-causal-monotonic',ok:false,status:'F2_PROVIDER_BINDING_FAIL_CAUSAL',classification,failureCode:sanitize(code),error:sanitize(code),providerRunId:text(providerRunId)||null,
    providerExecuted:true,secretAccess:secretAccess===true,authReadAttempted:authReadAttempted===true,authRead:authReadCompleted===true,firestoreReadAttempted:firestoreReadAttempted===true,firestoreRead:firestoreReadCompleted===true,
    browserExecuted:false,runtimeExecuted:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
  };
}

export function validateProviderFailureEvidence(evidence={},expectedRunId=''){
  const run=text(expectedRunId),cls=text(evidence.classification);
  return evidence.ok===false&&evidence.status==='F2_PROVIDER_BINDING_FAIL_CAUSAL'&&PROVIDER_CLASSES.includes(cls)&&text(evidence.failureCode).startsWith(cls+':')&&evidence.providerExecuted===true&&(!run||text(evidence.providerRunId)===run)&&typeof evidence.secretAccess==='boolean'&&typeof evidence.authReadAttempted==='boolean'&&typeof evidence.authRead==='boolean'&&typeof evidence.firestoreReadAttempted==='boolean'&&typeof evidence.firestoreRead==='boolean'&&!(evidence.authRead===true&&evidence.authReadAttempted!==true)&&!(evidence.firestoreRead===true&&evidence.firestoreReadAttempted!==true)&&Number(evidence.firestoreWrites||0)===0&&Number(evidence.authWrites||0)===0&&Number(evidence.operationalWrites||0)===0&&evidence.browserExecuted===false&&evidence.deployExecuted===false&&evidence.productionTouched===false&&evidence.containsPII===false&&evidence.containsSecrets===false;
}

export function writeRuntimeFailureEnvelope({identityEvidencePath,evidence}={}){
  if(!identityEvidencePath||!evidence||!validateProviderFailureEvidence(evidence,evidence.providerRunId))return null;
  const base=path.basename(identityEvidencePath),match=/^f2-identity-run-(\d+)\.json$/.exec(base);if(!match||match[1]!==text(evidence.providerRunId))return null;
  const target=path.join(path.dirname(identityEvidencePath),`f2-browser-run-${match[1]}.json`);
  const envelope={...evidence,schemaVersion:'orbit360-f2-runtime-stage-failure-envelope-v1-provider-before-browser',status:'F2_PROVIDER_BINDING_FAIL_BEFORE_BROWSER',runId:undefined,browserRunId:0,providerFailureReducedForTerminal:true,compatibilitySlot:'CURRENT_RUN_RUNTIME_STAGE_CAUSAL_ENVELOPE'};
  fs.writeFileSync(target,JSON.stringify(envelope,null,2)+'\n','utf8');return target;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const denied=buildProviderFailureEvidence({error:Object.assign(new Error('permission denied'),{code:'permission-denied'}),providerRunId:'42',secretAccess:true,authReadAttempted:true});
  const unavailable=buildProviderFailureEvidence({error:Object.assign(new Error('socket unavailable'),{code:'unavailable'}),providerRunId:'42',secretAccess:true,authReadAttempted:true});
  const explicit=buildProviderFailureEvidence({error:new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_MATCH_0'),providerRunId:'42',secretAccess:true,authReadAttempted:true,authReadCompleted:true,firestoreReadAttempted:true,firestoreReadCompleted:true});
  const ok=validateProviderFailureEvidence(denied,'42')&&validateProviderFailureEvidence(unavailable,'42')&&validateProviderFailureEvidence(explicit,'42')&&denied.classification==='SECURITY_FAILURE'&&unavailable.classification==='ENVIRONMENT_FAILURE'&&explicit.classification==='DATA_CONTRACT_FAILURE'&&explicit.firestoreRead===true&&explicit.firestoreReadAttempted===true;
  const out={schemaVersion:'orbit360-f2-provider-failure-evidence-selftest-v1',ok,status:ok?'F2_PROVIDER_FAILURE_EVIDENCE_SELFTEST_PASS':'F2_PROVIDER_FAILURE_EVIDENCE_SELFTEST_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',causalClassificationPass:ok,observationMonotonicPass:ok,unknownExternalFailureFailsClosedAs:'ENVIRONMENT_FAILURE',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.log(JSON.stringify(out,null,2));if(!ok)process.exit(41);
}
