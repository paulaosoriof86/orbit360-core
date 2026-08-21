#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const R=process.cwd();
const wfPath=process.env.ORBIT360_MACRO2_WORKFLOW||'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const reqPath=process.env.ORBIT360_MACRO2_REQUEST||'.github/orbit360-requests/macro2-transversal-source-recovery-v3r1c2-20260821.json';
const regPath=process.env.ORBIT360_ACTIONS_REGISTRATION_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3-actions-push-registration-probe-v20260821.json';
const scopePath=process.env.ORBIT360_PRE_RUNNER_SCOPE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3r1-pre-runner-same-step-env-failure-v20260821.json';
const markdownPath=process.env.ORBIT360_MARKDOWN_VALIDATOR_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-v3r1c1-markdown-whitespace-validator-stale-v20260821.json';
const listenerPath=process.env.ORBIT360_PERMANENT_LISTENER_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/macro2-permanent-listener-terminal-v20260821.json';
const pointerPath='.github/orbit360-requests/macro2-canonical-source-activation-pointer-v20260821.json';
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const EXEC_WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const REG_TRIGGER_SHA='5da25bf227fbe7fab40eb83aeb2a93e9e4da9aee';
const REG_RUN_ID='32527157212';
const read=p=>fs.readFileSync(path.join(R,p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(read(p));
const req=J(reqPath),wf=read(wfPath),reg=J(regPath),scope=J(scopePath),markdown=J(markdownPath),listener=J(listenerPath),pointer=J(pointerPath),F=[];
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

n(markdown.status==='VALIDATOR_STALE_ROOT_CAUSE_CLOSED','MARKDOWN_VALIDATOR_ROOT_CAUSE_NOT_CLOSED');
n(markdown.classification==='VALIDATOR_STALE','MARKDOWN_VALIDATOR_CLASSIFICATION_INVALID');
n(markdown.failureCode==='VALIDATOR_STALE:MARKDOWN_HARD_BREAK_TRAILING_SPACES_BLOCK_SOURCE_ACCEPTANCE','MARKDOWN_VALIDATOR_FAILURE_CODE_INVALID');
n(markdown.rootCauseResolution==='SOURCE_AWARE_DIFF_CHECK_ALLOW_EXACT_TWO_SPACE_MARKDOWN_HARD_BREAKS','MARKDOWN_VALIDATOR_RESOLUTION_INVALID');
n(markdown.productDefect===false,'MARKDOWN_VALIDATOR_MISCLASSIFIED_AS_PRODUCT');
n(Array.isArray(markdown.offenders)&&markdown.offenders.length===4&&markdown.offenders.every(x=>Number(x.trailingSpaces)===2&&x.semantic==='Markdown hard break'),'MARKDOWN_VALIDATOR_OFFENDERS_INVALID');

n(listener.ok===true&&listener.status==='FIRST_STAGE_DIAGNOSTIC_PASS','PERMANENT_LISTENER_FIRST_STAGE_NOT_PASS');
n(listener.classification==='PASS'&&listener.listenerPermanent===true&&listener.workflowModifiedByRun===false,'PERMANENT_LISTENER_TERMINAL_INVALID');
n(listener.failedStage==='NONE','PERMANENT_LISTENER_FAILED_STAGE_PRESENT');
n(listener.patchBundleCheck==='success'&&listener.patchApplySyntax==='success'&&listener.predecessorArtifact==='success'&&listener.sourceAcceptance107==='success','FIRST_STAGE_DIAGNOSTIC_STAGES_NOT_ALL_PASS');
n(listener.runtimeExecuted===false&&listener.browserExecuted===false&&listener.secretAccess===false&&listener.firestoreRead===false&&Number(listener.writes)===0&&listener.deployExecuted===false&&listener.productionTouched===false,'FIRST_STAGE_DIAGNOSTIC_NOT_SOURCE_ONLY');

n(pointer.status==='IDLE'&&pointer.mode==='NONE'&&Number(pointer.allowedExecutions)===0&&pointer.consumed===true&&pointer.replayAllowed===false,'CANONICAL_POINTER_NOT_INERT');
n(pointer.sourceOnly===true&&pointer.runtime===false&&pointer.browser===false&&pointer.secrets===false&&pointer.firestoreRead===false&&pointer.writes===false&&pointer.deploy===false&&pointer.production===false&&pointer.main===false&&pointer.merge===false,'CANONICAL_POINTER_CAPABILITY_OPEN');

n(req.schemaVersion==='orbit360-macro2-source-recovery-request-v3r1c2','REQUEST_SCHEMA_INVALID');
n(req.sourceOnly===true&&req.allowedExecutions===1&&!req.consumed&&!req.historical&&!req.replayAllowed,'REQUEST_NOT_ACTIVE_ONE_SHOT');
for(const k of ['runtime','browser','secrets','firestoreRead','writes','deploy','production','main','merge'])n(req[k]===false,'CAPABILITY_OPEN:'+k);
n(req.rootCauseResolved===true,'ROOT_CAUSE_NOT_RESOLVED');
n(req.rootCauseResolution==='SOURCE_AWARE_DIFF_CHECK_ALLOW_EXACT_TWO_SPACE_MARKDOWN_HARD_BREAKS','ROOT_CAUSE_RESOLUTION_INVALID');
n(req.registrationEvidencePath===regPath,'REGISTRATION_EVIDENCE_BINDING_MISMATCH');
n(req.preRunnerScopeEvidencePath===scopePath,'PRE_RUNNER_SCOPE_EVIDENCE_BINDING_MISMATCH');
n(req.markdownValidatorEvidencePath===markdownPath,'MARKDOWN_VALIDATOR_EVIDENCE_BINDING_MISMATCH');
n(req.permanentListenerEvidencePath===listenerPath,'PERMANENT_LISTENER_EVIDENCE_BINDING_MISMATCH');
n(String(req.registrationRunId||'')===REG_RUN_ID,'REGISTRATION_RUN_ID_MISMATCH');
n(Number(req.firstStageDiagnosticRunId||0)===Number(listener.runId||0),'FIRST_STAGE_DIAGNOSTIC_RUN_BINDING_MISMATCH');
n(req.firstStageDiagnosticPassed===true,'FIRST_STAGE_DIAGNOSTIC_PASS_NOT_BOUND');
n(req.triggerMechanism==='PERMANENT_CANONICAL_FAIL_CLOSED_LISTENER_POINTER','TRIGGER_MECHANISM_NOT_PERMANENT_LISTENER');
n(req.activationParentBinding==='CANONICAL_POINTER_DATA_DRIVEN','ACTIVATION_PARENT_BINDING_INVALID');
n(req.activationPointerPath===pointerPath,'ACTIVATION_POINTER_BINDING_INVALID');

n(wf.includes('PERMANENT CANONICAL FAIL-CLOSED LISTENER'),'PERMANENT_LISTENER_MARKER_MISSING');
n(wf.includes('canonical-source-router'),'CANONICAL_SOURCE_ROUTER_MISSING');
n(wf.includes("POINTER: "+pointerPath),'CANONICAL_POINTER_WORKFLOW_BINDING_MISSING');
n(wf.includes('push:'),'PERMANENT_LISTENER_PUSH_MISSING');
n(wf.includes(BRANCH),'PERMANENT_LISTENER_BRANCH_MISSING');
n(wf.includes("- '"+EXEC_WF+"'"),'PERMANENT_LISTENER_SELF_PATH_MISSING');
n(!wf.includes('actions: write'),'ACTIONS_WRITE_PRESENT');

for(const s of (req.patchSets||[])){
  const p=path.join(R,s.gzipPath||'');
  n(fs.existsSync(p),'PATCH_BUNDLE_MISSING:'+String(s.name));
  if(!fs.existsSync(p))continue;
  const gz=fs.readFileSync(p);
  n(sha(gz)===s.gzipSha256,'PATCH_GZIP_SHA:'+String(s.name));
  try{const raw=zlib.gunzipSync(gz);n(sha(raw)===s.sha256,'PATCH_RAW_SHA:'+String(s.name));}
  catch{n(false,'PATCH_GZIP_INVALID:'+String(s.name));}
}

for(const s of (req.runnerScripts||[])){
  n(s.encoding==='plain','RUNNER_ENCODING_NOT_PLAIN:'+String(s.role));
  const p=path.join(R,s.path||'');
  n(fs.existsSync(p),'RUNNER_MISSING:'+String(s.role));
  if(!fs.existsSync(p))continue;
  const raw=fs.readFileSync(p);
  n(/^[a-f0-9]{40}$/.test(s.gitBlobSha||''),'RUNNER_GIT_BLOB_SHA_INVALID:'+String(s.role));
  n(gitBlobSha(raw)===s.gitBlobSha,'RUNNER_GIT_BLOB_SHA:'+String(s.role));
  const t=raw.toString('utf8');
  n(t.includes('source_aware_diff_check'),'SOURCE_AWARE_DIFF_CHECK_MISSING:'+String(s.role));
  n(t.includes("':(exclude,glob)**/*.md'"),'NON_MARKDOWN_DIFF_CHECK_EXCLUSION_MISSING:'+String(s.role));
  n(t.includes("m[0] !== '  '"),'MARKDOWN_EXACT_TWO_SPACE_RULE_MISSING:'+String(s.role));
  n(t.includes('/[ \\t]+$/'),'MARKDOWN_TAB_OR_SPACE_REJECTION_MISSING:'+String(s.role));
  if(s.role==='pre'){
    n(!/\$PRI\b/.test(t),'LEGACY_PRI');
    n(!t.includes('git pull --rebase'),'REBASE');
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
    n(!t.includes('git show "$OWNER_SAFE_HEAD:.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml"'),'EPHEMERAL_OWNER_RESTORE_FORBIDDEN');
    n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===1,'PRE_PUSH_COUNT');
    n(t.includes('source_aware_diff_check worktree')&&t.includes('source_aware_diff_check staged'),'PRE_SOURCE_AWARE_CHECKS_INCOMPLETE');
  }else if(s.role==='post'){
    n(t.includes('sha256:$ARTIFACT_DIGEST_RAW'),'DIGEST_NORMALIZATION');
    n(t.includes('NORMALIZED_ARTIFACT_DIGEST="$ARTIFACT_DIGEST"'),'LOCAL_NORMALIZED_DIGEST_ASSIGNMENT_MISSING');
    n(t.includes('CANDIDATE_METADATA_HEAD=$(git rev-parse HEAD)'),'LOCAL_CANDIDATE_METADATA_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('FINAL_HEAD=$(git rev-parse HEAD)'),'LOCAL_FINAL_HEAD_ASSIGNMENT_MISSING');
    n(t.includes('Persist candidate artifact metadata before promotion'),'META_STAGE');
    n(t.indexOf('Persist candidate artifact metadata before promotion')<t.indexOf('Promote candidate and prepare inert fresh authorization boundary'),'META_BEFORE_PROMOTION');
    n((t.match(/git push origin "HEAD:\$ORBIT360_BRANCH"/g)||[]).length===2,'POST_PUSH_COUNT');
    n(t.includes('source_aware_diff_check worktree')&&t.includes('source_aware_diff_check staged'),'POST_SOURCE_AWARE_CHECKS_INCOMPLETE');
  }else n(false,'RUNNER_ROLE_INVALID:'+String(s.role));
}

const out={
  ok:F.length===0,
  status:F.length?'MACRO2_PIPELINE_PREFLIGHT_FAIL':'MACRO2_PIPELINE_PREFLIGHT_PASS',
  classification:F.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  failures:F,
  stopRetryReopenValidated:F.length===0,
  actionsRegistrationHandshakeValidated:F.length===0,
  preRunnerScopeRootCauseValidated:F.length===0,
  markdownValidatorRootCauseValidated:F.length===0,
  permanentListenerValidated:F.length===0,
  firstStageDiagnosticValidated:F.length===0,
  activationPointerValidated:F.length===0,
  runnerPlainTextValidated:F.length===0,
  runnerLocalScopeValidated:F.length===0,
  sourceAwareWhitespaceValidated:F.length===0,
  runnerGitBlobBindingSupported:true,
  registrationRunId:reg.runId||null,
  firstStageDiagnosticRunId:listener.runId||null,
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
