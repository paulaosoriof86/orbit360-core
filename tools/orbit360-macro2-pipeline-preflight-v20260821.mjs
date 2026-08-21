#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const R=process.cwd();
const wfPath=process.env.ORBIT360_MACRO2_WORKFLOW||'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const reqPath=process.env.ORBIT360_MACRO2_REQUEST||'.github/orbit360-requests/macro2-transversal-source-recovery-v3-20260821.json';
const regPath=process.env.ORBIT360_ACTIONS_REGISTRATION_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3-actions-push-registration-probe-v20260821.json';
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const EXEC_WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const OWNER_SAFE_HEAD='961e74e2aa24af744ae9026b9e68624993fe6f57';
const REG_TRIGGER_SHA='5da25bf227fbe7fab40eb83aeb2a93e9e4da9aee';
const REG_RUN_ID='32527157212';
const read=p=>fs.readFileSync(path.join(R,p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(read(p));
const req=J(reqPath),wf=read(wfPath),reg=J(regPath),F=[];
const n=(x,c)=>{if(!x)F.push(c);};

n(reg.ok===true&&reg.status==='ACTIONS_PUSH_REGISTRATION_PROBE_PASS','ACTIONS_REGISTRATION_PROBE_NOT_PASS');
n(reg.classification==='PIPELINE_MECHANISM_DIAGNOSTIC_PASS','ACTIONS_REGISTRATION_CLASSIFICATION_INVALID');
n(reg.eventName==='push'&&reg.branch===BRANCH,'ACTIONS_REGISTRATION_EVENT_OR_BRANCH_INVALID');
n(reg.triggerSha===REG_TRIGGER_SHA,'ACTIONS_REGISTRATION_TRIGGER_SHA_MISMATCH');
n(String(reg.runId)===REG_RUN_ID&&String(reg.runAttempt)==='1','ACTIONS_REGISTRATION_RUN_BINDING_INVALID');
n(reg.productTouched===false&&reg.runtimeExecuted===false&&reg.browserExecuted===false&&reg.secretAccess===false&&reg.firestoreRead===false&&Number(reg.writes)===0&&reg.deployExecuted===false&&reg.productionTouched===false,'ACTIONS_REGISTRATION_PROBE_NOT_SOURCE_ONLY');

n(req.sourceOnly===true&&req.allowedExecutions===1&&!req.consumed&&!req.historical&&!req.replayAllowed,'REQUEST_NOT_ACTIVE_ONE_SHOT');
for(const k of ['runtime','browser','secrets','firestoreRead','writes','deploy','production','main','merge'])n(req[k]===false,'CAPABILITY_OPEN:'+k);
n(req.rootCauseResolved===true,'ROOT_CAUSE_NOT_RESOLVED');
n(req.rootCauseResolution==='WORKFLOW_TRIGGER_REGISTRATION_HANDSHAKE_REQUIRED','ROOT_CAUSE_RESOLUTION_INVALID');
n(req.registrationEvidencePath===regPath,'REGISTRATION_EVIDENCE_BINDING_MISMATCH');
n(String(req.registrationRunId||'')===REG_RUN_ID,'REGISTRATION_RUN_ID_MISMATCH');
n(req.registrationTriggerSha===REG_TRIGGER_SHA,'REGISTRATION_TRIGGER_SHA_MISMATCH');
n(req.triggerMechanism==='WORKFLOW_FILE_SELF_REGISTERING_PUSH','TRIGGER_MECHANISM_NOT_SELF_REGISTERING');
n(/^[a-f0-9]{40}$/.test(req.expectedParentHead||''),'EXPECTED_PARENT_INVALID');
n(req.ownerSafeHead===OWNER_SAFE_HEAD,'OWNER_SAFE_HEAD_INVALID');

n(wf.includes("push:"),'SELF_REGISTERING_PUSH_MISSING');
n(wf.includes(BRANCH),'SELF_REGISTERING_BRANCH_MISSING');
n(wf.includes("- '"+EXEC_WF+"'"),'SELF_REGISTERING_WORKFLOW_PATH_MISSING');
n(!wf.includes("- '"+reqPath+"'"),'LEGACY_REQUEST_PATH_TRIGGER_PRESENT');
n(wf.includes(reqPath),'REQUEST_BINDING_MISSING');
n(!wf.includes('git push origin'),'WORKFLOW_MUST_DELEGATE_WRITES');
n(!wf.includes('actions: write'),'ACTIONS_WRITE_PRESENT');

const sets=[...(req.patchSets||[]),...(req.runnerScripts||[])];
for(const s of sets){
  const p=path.join(R,s.gzipPath||'');
  n(fs.existsSync(p),'BUNDLE_MISSING:'+String(s.name||s.role));
  if(!fs.existsSync(p))continue;
  const gz=fs.readFileSync(p),g=crypto.createHash('sha256').update(gz).digest('hex');
  n(g===s.gzipSha256,'GZIP_SHA:'+String(s.name||s.role));
  try{
    const raw=zlib.gunzipSync(gz),h=crypto.createHash('sha256').update(raw).digest('hex');
    n(h===s.sha256,'RAW_SHA:'+String(s.name||s.role));
    if(s.role){
      const t=raw.toString('utf8');
      if(s.role==='pre'){
        n(!/\$PRI\b/.test(t),'LEGACY_PRI');
        n(!t.includes('git pull --rebase'),'REBASE');
        n(t.includes("jq -r '.expectedParentHead'"),'DYNAMIC_PARENT_BINDING_MISSING');
        n(t.includes("jq -r '.ownerSafeHead'"),'OWNER_SAFE_BINDING_MISSING');
        n(t.includes('git rev-parse HEAD^'),'ACTIVATION_PARENT_PROOF_MISSING');
        n(t.includes('Publish accepted source commit before candidate build'),'SOURCE_STAGE');
        n(t.includes('git show "$OWNER_SAFE_HEAD:.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml"'),'OWNER_RESTORE_MISSING');
        n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===1,'PRE_PUSH_COUNT');
      }else{
        n(t.includes('sha256:$ARTIFACT_DIGEST_RAW'),'DIGEST_NORMALIZATION');
        n(t.includes('Persist candidate artifact metadata before promotion'),'META_STAGE');
        n(t.indexOf('Persist candidate artifact metadata before promotion')<t.indexOf('Promote candidate and prepare inert fresh authorization boundary'),'META_BEFORE_PROMOTION');
        n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===2,'POST_PUSH_COUNT');
      }
    }
  }catch{n(false,'GZIP_INVALID:'+String(s.name||s.role));}
}

const out={
  ok:F.length===0,
  status:F.length?'MACRO2_PIPELINE_PREFLIGHT_FAIL':'MACRO2_PIPELINE_PREFLIGHT_PASS',
  classification:F.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  failures:F,
  stopRetryReopenValidated:F.length===0,
  actionsRegistrationHandshakeValidated:F.length===0,
  registrationRunId:reg.runId||null,
  registrationTriggerSha:reg.triggerSha||null,
  triggerMechanism:req.triggerMechanism||null,
  durableSourceBeforeArtifact:true,
  durableArtifactMetadataBeforePromotion:true,
  artifactDigestContractNormalized:true,
  sourceOnly:true,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  writes:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(out,null,2));
if(F.length)process.exit(41);
