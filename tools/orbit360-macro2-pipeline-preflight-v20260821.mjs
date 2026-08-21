#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const R=process.cwd();
const wfPath=process.env.ORBIT360_MACRO2_WORKFLOW||'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const reqPath=process.env.ORBIT360_MACRO2_REQUEST||'.github/orbit360-requests/macro2-transversal-source-recovery-v3r1-20260821.json';
const regPath=process.env.ORBIT360_ACTIONS_REGISTRATION_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3-actions-push-registration-probe-v20260821.json';
const scopePath=process.env.ORBIT360_PRE_RUNNER_SCOPE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3r1-pre-runner-same-step-env-failure-v20260821.json';
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const EXEC_WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const OWNER_SAFE_HEAD='961e74e2aa24af744ae9026b9e68624993fe6f57';
const REG_TRIGGER_SHA='5da25bf227fbe7fab40eb83aeb2a93e9e4da9aee';
const REG_RUN_ID='32527157212';
const read=p=>fs.readFileSync(path.join(R,p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(read(p));
const req=J(reqPath),wf=read(wfPath),reg=J(regPath),scope=J(scopePath),F=[];
const n=(x,c)=>{if(!x)F.push(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');

n(reg.ok===true&&reg.status==='ACTIONS_PUSH_REGISTRATION_PROBE_PASS','ACTIONS_REGISTRATION_PROBE_NOT_PASS');
n(reg.classification==='PIPELINE_MECHANISM_DIAGNOSTIC_PASS','ACTIONS_REGISTRATION_CLASSIFICATION_INVALID');
n(reg.eventName==='push'&&reg.branch===BRANCH,'ACTIONS_REGISTRATION_EVENT_OR_BRANCH_INVALID');
n(reg.triggerSha===REG_TRIGGER_SHA,'ACTIONS_REGISTRATION_TRIGGER_SHA_MISMATCH');
n(String(reg.runId)===REG_RUN_ID&&String(reg.runAttempt)==='1','ACTIONS_REGISTRATION_RUN_BINDING_INVALID');
n(reg.productTouched===false&&reg.runtimeExecuted===false&&reg.browserExecuted===false&&reg.secretAccess===false&&reg.firestoreRead===false&&Number(reg.writes)===0&&reg.deployExecuted===false&&reg.productionTouched===false,'ACTIONS_REGISTRATION_PROBE_NOT_SOURCE_ONLY');

n(scope.status==='STOP_RETRY_ROOT_CAUSE_CLOSED_SOURCE_ONLY','PRE_RUNNER_SCOPE_ROOT_CAUSE_NOT_CLOSED');
n(scope.classification==='PIPELINE_MECHANISM_FAILURE','PRE_RUNNER_SCOPE_CLASSIFICATION_INVALID');
n(scope.failureCode==='PIPELINE_MECHANISM_FAILURE:PRE_RUNNER_GITHUB_ENV_SAME_STEP_VISIBILITY','PRE_RUNNER_SCOPE_FAILURE_CODE_INVALID');
n(scope.rootCauseResolution==='PRE_RUNNER_LOCAL_SCOPE_ASSIGNMENTS_REQUIRED','PRE_RUNNER_SCOPE_RESOLUTION_INVALID');
n(scope.requestConsumed===true&&scope.requestHistorical===true&&scope.requestReplayAllowed===false,'FAILED_V3R1_NOT_SEALED');
n(scope.durableSourceMaterialized===false&&scope.candidatePublished===false,'FAILED_V3R1_DURABLE_EFFECT_UNEXPECTED');
n(scope.workflowRestoredDispatchOnly===true,'FAILED_V3R1_WORKFLOW_NOT_RESTORED');
n(scope.runtimeExecuted===false&&scope.browserExecuted===false&&scope.secretAccess===false&&scope.firestoreRead===false&&Number(scope.writes)===0&&scope.deployExecuted===false&&scope.productionTouched===false,'FAILED_V3R1_NOT_SOURCE_ONLY');

n(req.sourceOnly===true&&req.allowedExecutions===1&&!req.consumed&&!req.historical&&!req.replayAllowed,'REQUEST_NOT_ACTIVE_ONE_SHOT');
for(const k of ['runtime','browser','secrets','firestoreRead','writes','deploy','production','main','merge'])n(req[k]===false,'CAPABILITY_OPEN:'+k);
n(req.rootCauseResolved===true,'ROOT_CAUSE_NOT_RESOLVED');
n(req.rootCauseResolution==='PRE_RUNNER_LOCAL_SCOPE_ASSIGNMENTS_REQUIRED','ROOT_CAUSE_RESOLUTION_INVALID');
n(req.registrationEvidencePath===regPath,'REGISTRATION_EVIDENCE_BINDING_MISMATCH');
n(req.preRunnerScopeEvidencePath===scopePath,'PRE_RUNNER_SCOPE_EVIDENCE_BINDING_MISMATCH');
n(String(req.registrationRunId||'')===REG_RUN_ID,'REGISTRATION_RUN_ID_MISMATCH');
n(req.registrationTriggerSha===REG_TRIGGER_SHA,'REGISTRATION_TRIGGER_SHA_MISMATCH');
n(req.triggerMechanism==='WORKFLOW_FILE_SELF_REGISTERING_PUSH','TRIGGER_MECHANISM_NOT_SELF_REGISTERING');
n(req.activationParentBinding==='GITHUB_EVENT_BEFORE_HEAD_PARENT','ACTIVATION_PARENT_BINDING_INVALID');
n(req.expectedParentMode==='GITHUB_EVENT_BEFORE','EXPECTED_PARENT_MODE_INVALID');
n(!Object.prototype.hasOwnProperty.call(req,'expectedParentHead'),'STATIC_EXPECTED_PARENT_FORBIDDEN');
n(req.ownerSafeHead===OWNER_SAFE_HEAD,'OWNER_SAFE_HEAD_INVALID');

n(typeof req.activationWorkflowTemplatePath==='string'&&req.activationWorkflowTemplatePath.length>0,'ACTIVATION_TEMPLATE_PATH_MISSING');
n(/^[a-f0-9]{64}$/.test(req.activationWorkflowTemplateSha256||''),'ACTIVATION_TEMPLATE_SHA_INVALID');
if(typeof req.activationWorkflowTemplatePath==='string'&&req.activationWorkflowTemplatePath.length>0){
  const tp=path.join(R,req.activationWorkflowTemplatePath);
  n(fs.existsSync(tp),'ACTIVATION_TEMPLATE_MISSING');
  if(fs.existsSync(tp)){
    const tb=fs.readFileSync(tp);
    n(sha(tb)===req.activationWorkflowTemplateSha256,'ACTIVATION_TEMPLATE_SHA_MISMATCH');
    n(tb.toString('utf8')===wf,'ACTIVATION_TEMPLATE_WORKFLOW_MISMATCH');
  }
}

n(wf.includes('push:'),'SELF_REGISTERING_PUSH_MISSING');
n(wf.includes(BRANCH),'SELF_REGISTERING_BRANCH_MISSING');
n(wf.includes("- '"+EXEC_WF+"'"),'SELF_REGISTERING_WORKFLOW_PATH_MISSING');
n(!wf.includes("- '"+reqPath+"'"),'LEGACY_REQUEST_PATH_TRIGGER_PRESENT');
n(wf.includes(reqPath),'REQUEST_BINDING_MISSING');
n(wf.includes('ORBIT360_EVENT_BEFORE: ${{ github.event.before }}'),'EVENT_BEFORE_WORKFLOW_BINDING_MISSING');
n(!wf.includes('git push origin'),'WORKFLOW_MUST_DELEGATE_WRITES');
n(!wf.includes('actions: write'),'ACTIONS_WRITE_PRESENT');

for(const s of (req.patchSets||[])){
  const p=path.join(R,s.gzipPath||'');
  n(fs.existsSync(p),'PATCH_BUNDLE_MISSING:'+String(s.name));
  if(!fs.existsSync(p))continue;
  const gz=fs.readFileSync(p);
  n(sha(gz)===s.gzipSha256,'PATCH_GZIP_SHA:'+String(s.name));
  try{
    const raw=zlib.gunzipSync(gz);
    n(sha(raw)===s.sha256,'PATCH_RAW_SHA:'+String(s.name));
  }catch{
    n(false,'PATCH_GZIP_INVALID:'+String(s.name));
  }
}

for(const s of (req.runnerScripts||[])){
  n(s.encoding==='plain','RUNNER_ENCODING_NOT_PLAIN:'+String(s.role));
  const p=path.join(R,s.path||'');
  n(fs.existsSync(p),'RUNNER_MISSING:'+String(s.role));
  if(!fs.existsSync(p))continue;
  const raw=fs.readFileSync(p);
  if(s.gitBlobSha){
    n(/^[a-f0-9]{40}$/.test(s.gitBlobSha),'RUNNER_GIT_BLOB_SHA_INVALID:'+String(s.role));
    n(gitBlobSha(raw)===s.gitBlobSha,'RUNNER_GIT_BLOB_SHA:'+String(s.role));
  }else{
    n(/^[a-f0-9]{64}$/.test(s.sha256||''),'RUNNER_SHA256_INVALID:'+String(s.role));
    n(sha(raw)===s.sha256,'RUNNER_SHA:'+String(s.role));
  }
  const t=raw.toString('utf8');
  if(s.role==='pre'){
    n(!/\$PRI\b/.test(t),'LEGACY_PRI');
    n(!t.includes('git pull --rebase'),'REBASE');
    n(t.includes('ORBIT360_EVENT_BEFORE'),'EVENT_BEFORE_RUNNER_BINDING_MISSING');
    n(t.includes('git rev-parse HEAD^'),'ACTIVATION_PARENT_PROOF_MISSING');
    n(t.includes('git rev-parse HEAD)'),'ACTIVATION_SHA_PROOF_MISSING');
    n(t.includes('GITHUB_SHA'),'GITHUB_SHA_PROOF_MISSING');
    n(t.includes("jq -r '.ownerSafeHead'"),'OWNER_SAFE_BINDING_MISSING');
    n(t.includes('START_HEAD=$(git rev-parse HEAD)'),'LOCAL_START_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('MACRO2_PRE="$PRE"'),'LOCAL_MACRO2_PRE_ASSIGNMENT_MISSING');
    n(t.includes('MACRO2_BASE_MANIFEST="$RUNNER_TEMP/base-manifest.json"'),'LOCAL_MACRO2_BASE_MANIFEST_ASSIGNMENT_MISSING');
    n((t.match(/SOURCE_HEAD=\$\(git rev-parse HEAD\)/g)||[]).length>=1,'LOCAL_SOURCE_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('SOURCE_PUBLISHED_HEAD="$SOURCE_HEAD"'),'LOCAL_SOURCE_PUBLISHED_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('SUCCESSOR_DIR="$OUT"'),'LOCAL_SUCCESSOR_DIR_ASSIGNMENT_MISSING');
    n(t.includes('SUCCESSOR_ZIP="$RUNNER_TEMP/orbit360-macro2-transversal-${SOURCE_HEAD:0:12}.zip"'),'LOCAL_SUCCESSOR_ZIP_ASSIGNMENT_MISSING');
    n(t.includes('SUCCESSOR_ZIP_SHA=$(sha256sum "$SUCCESSOR_ZIP"'),'LOCAL_SUCCESSOR_ZIP_SHA_ASSIGNMENT_MISSING');
    n(t.includes('SUCCESSOR_MANIFEST_SHA=$(sha256sum "$OUT/orbit360-package-manifest.json"'),'LOCAL_SUCCESSOR_MANIFEST_SHA_ASSIGNMENT_MISSING');
    n(t.includes('Publish accepted source commit before candidate build'),'SOURCE_STAGE');
    n(t.includes('git show "$OWNER_SAFE_HEAD:.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml"'),'OWNER_RESTORE_MISSING');
    n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===1,'PRE_PUSH_COUNT');
  }else if(s.role==='post'){
    n(t.includes('sha256:$ARTIFACT_DIGEST_RAW'),'DIGEST_NORMALIZATION');
    n(t.includes('NORMALIZED_ARTIFACT_DIGEST="$ARTIFACT_DIGEST"'),'LOCAL_NORMALIZED_DIGEST_ASSIGNMENT_MISSING');
    n(t.includes('CANDIDATE_METADATA_HEAD=$(git rev-parse HEAD)'),'LOCAL_CANDIDATE_METADATA_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('FINAL_HEAD=$(git rev-parse HEAD)'),'LOCAL_FINAL_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('Persist candidate artifact metadata before promotion'),'META_STAGE');
    n(t.indexOf('Persist candidate artifact metadata before promotion')<t.indexOf('Promote candidate and prepare inert fresh authorization boundary'),'META_BEFORE_PROMOTION');
    n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===2,'POST_PUSH_COUNT');
  }else{
    n(false,'RUNNER_ROLE_INVALID:'+String(s.role));
  }
}

const out={
  ok:F.length===0,
  status:F.length?'MACRO2_PIPELINE_PREFLIGHT_FAIL':'MACRO2_PIPELINE_PREFLIGHT_PASS',
  classification:F.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  failures:F,
  stopRetryReopenValidated:F.length===0,
  actionsRegistrationHandshakeValidated:F.length===0,
  preRunnerScopeRootCauseValidated:F.length===0,
  activationParentBindingValidated:F.length===0,
  workflowTemplateBound:F.length===0,
  runnerPlainTextValidated:F.length===0,
  runnerLocalScopeValidated:F.length===0,
  runnerGitBlobBindingSupported:true,
  registrationRunId:reg.runId||null,
  registrationTriggerSha:reg.triggerSha||null,
  triggerMechanism:req.triggerMechanism||null,
  activationParentBinding:req.activationParentBinding||null,
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
