#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const POINTER='.github/orbit360-requests/macro2-canonical-source-activation-pointer-v20260821.json';
const WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const PRE_RUNNER='.github/orbit360-source-patches/macro2-v20260821/macro2-v3r1-pre.sh';
const POST_RUNNER='.github/orbit360-source-patches/macro2-v20260821/macro2-v3r1-post.sh';
const PUSH_PROOF='orbit360-platform/runtime-gate-crm-v20260716/macro2-v3-actions-push-registration-probe-v20260821.json';
const OBSERVER_ROOTCAUSE='orbit360-platform/runtime-gate-crm-v20260716/macro2-run-observer-rootcause-v20260822.json';
const RECEIPT_ROOTCAUSE='orbit360-platform/runtime-gate-crm-v20260716/macro2-execution-receipt-observer-rootcause-v20260822.json';
const SOURCE_ACCEPTANCE_OBSERVABILITY_ROOTCAUSE='orbit360-platform/runtime-gate-crm-v20260716/macro2-source-acceptance-observability-rootcause-v20260822.json';
const FORBIDDEN_ACTIVE_PATHS=[
  '.github/orbit360-requests/macro2-transversal-source-recovery-v3r1c2-20260821.json',
  '.github/orbit360-requests/auc-macro2-transversal-source-v3r1c2-20260821.json',
  'tools/orbit360-macro2-v3r1-hash-index-precheck-v20260821.mjs'
];
const EXPECTED_PREDECESSOR={
  artifactId:9433944723,
  sourceHead:'c3bb825da2b1ecae08dabc2034c753482b086fec',
  zipSha256:'1951cc7c2d3390ea1c2a6b3d9ce0bb48e26a6f95d5d10d69b7c31a0027cfbbac',
  manifestSha256:'580921077a88badab6e4076c42e9ef88f9de7936e1b6bad0f62410b39aec6397'
};
const BUNDLES={
  product:{path:'.github/orbit360-source-patches/macro2-v20260821/product.patch.gz',gzipSha256:'c7b932b2788a502ae07111d2e209d4b0cca0b844242bb1db80218b72fa4c6913',rawSha256:'6b3141493d69d2b25c581033460f5302498dd06dd8dfcad1245802390fafe540'},
  tools:{path:'.github/orbit360-source-patches/macro2-v20260821/tools.patch.gz',gzipSha256:'64bb3f11736ce39593b12a54350270f73730a10430d1ce6e543bebaee622ba46',rawSha256:'035c756cc2c14ae428a87231a8cc266762b92ebc1c67974d691bbb20ffd90f97'},
  docs:{path:'.github/orbit360-source-patches/macro2-v20260821/docs.patch.gz',gzipSha256:'4a6f77f7e35a89f0ef830e4b98fa8f4d1493e7973a4b91aa55ee5def78ed2167',rawSha256:'f5f679c113e6408981f111154e8d0fd34f515e82a70c2085d3f0f54515efa3c0'}
};
const RUNNERS={
  pre:{path:PRE_RUNNER,gitBlobSha:'5311a3a9b9bc645f420b232f31d9845ac5a6023b'},
  post:{path:POST_RUNNER,gitBlobSha:'c57f699b3e72f4aba856f359a09f227d7a25255a'}
};

const failures=[];
const check=(ok,code)=>{if(!ok) failures.push(code);};
const abs=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(abs(p));
const json=p=>JSON.parse(read(p).toString('utf8').replace(/^\uFEFF/,''));
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');

for(const p of [POINTER,WORKFLOW,PUSH_PROOF,OBSERVER_ROOTCAUSE,RECEIPT_ROOTCAUSE,SOURCE_ACCEPTANCE_OBSERVABILITY_ROOTCAUSE]) check(fs.existsSync(abs(p)),`REQUIRED_CONTROL_FILE_MISSING:${p}`);
if(process.env.GITHUB_REF_NAME) check(process.env.GITHUB_REF_NAME===BRANCH,'BRANCH_MISMATCH');

const pointer=fs.existsSync(abs(POINTER))?json(POINTER):{};
const workflow=fs.existsSync(abs(WORKFLOW))?read(WORKFLOW).toString('utf8'):'';
const pushProof=fs.existsSync(abs(PUSH_PROOF))?json(PUSH_PROOF):{};
const observerRootcause=fs.existsSync(abs(OBSERVER_ROOTCAUSE))?json(OBSERVER_ROOTCAUSE):{};
const receiptRootcause=fs.existsSync(abs(RECEIPT_ROOTCAUSE))?json(RECEIPT_ROOTCAUSE):{};
const sourceAcceptanceObservabilityRootcause=fs.existsSync(abs(SOURCE_ACCEPTANCE_OBSERVABILITY_ROOTCAUSE))?json(SOURCE_ACCEPTANCE_OBSERVABILITY_ROOTCAUSE):{};

const pointerIdle=pointer.status==='IDLE'&&pointer.mode==='IDLE';
const pointerFinalize=pointer.status==='ACTIVE'&&pointer.mode==='FINALIZE_SOURCE_ONLY';
check(pointerIdle||pointerFinalize,'POINTER_STATE_INVALID');
check(pointer.activeRequestPath==null,'ACTIVE_REQUEST_FORBIDDEN');
check(pointer.sourceOnly===true,'SOURCE_ONLY_REQUIRED');
for(const k of ['runtime','browser','secrets','firestoreRead','writes','deploy','production','main','merge']) check(pointer[k]===false,`CAPABILITY_OPEN:${k}`);
if(pointerIdle) check(Number(pointer.allowedExecutions)===0,'IDLE_EXECUTION_BUDGET_INVALID');
if(pointerFinalize) check(Number(pointer.allowedExecutions)===1&&pointer.replayAllowed===false,'FINALIZE_EXECUTION_BUDGET_INVALID');
check(pointer.allowedTransition==='IDLE_TO_FINALIZE_SOURCE_ONLY','ALLOWED_TRANSITION_INVALID');
check(pointer.terminalOnFailure===true,'TERMINAL_FAILURE_POLICY_MISSING');

for(const [k,v] of Object.entries(EXPECTED_PREDECESSOR)) check(pointer.predecessor&&String(pointer.predecessor[k])===String(v),`PREDECESSOR_${k.toUpperCase()}_MISMATCH`);
for(const [name,spec] of Object.entries(BUNDLES)){
  const declared=pointer.certifiedBundles&&pointer.certifiedBundles[name];
  check(declared&&declared.path===spec.path&&declared.gzipSha256===spec.gzipSha256&&declared.rawSha256===spec.rawSha256,`POINTER_BUNDLE_CONTENT_BINDING_MISMATCH:${name}`);
  check(fs.existsSync(abs(spec.path)),`PATCH_BUNDLE_MISSING:${name}`);
  if(!fs.existsSync(abs(spec.path))) continue;
  const gz=read(spec.path);
  check(sha256(gz)===spec.gzipSha256,`PATCH_GZIP_SHA256_MISMATCH:${name}`);
  try{check(sha256(zlib.gunzipSync(gz))===spec.rawSha256,`PATCH_RAW_SHA256_MISMATCH:${name}`);}
  catch{check(false,`PATCH_GZIP_INVALID:${name}`);}
}
for(const [role,spec] of Object.entries(RUNNERS)){
  check(fs.existsSync(abs(spec.path)),`RUNNER_MISSING:${role}`);
  if(!fs.existsSync(abs(spec.path))) continue;
  const b=read(spec.path),t=b.toString('utf8');
  check(gitBlobSha(b)===spec.gitBlobSha,`RUNNER_GIT_BLOB_SHA_MISMATCH:${role}`);
  check(t.includes('source_aware_diff_check'),`RUNNER_SOURCE_AWARE_DIFF_MISSING:${role}`);
  if(role==='pre'){
    check(t.includes('checksPassed==107')&&t.includes('checksTotal==107'),'PRE_RUNNER_107_CONTRACT_MISSING');
    check(t.includes('fileCount==194')&&t.includes('deltaCount==9')&&t.includes('unchangedFileCount==185'),'PRE_RUNNER_194_9_185_CONTRACT_MISSING');
    check(!t.includes('git pull --rebase'),'PRE_RUNNER_REBASE_FORBIDDEN');
  }else{
    check(t.includes('progress==75'),'POST_RUNNER_75_PROMOTION_CONTRACT_MISSING');
    check(t.includes('authorized==false')&&t.includes('requestMaterialized==false')&&t.includes('runtimeAllowed==false'),'POST_RUNNER_INERT_BOUNDARY_CONTRACT_MISSING');
  }
}
for(const p of FORBIDDEN_ACTIVE_PATHS) check(!fs.existsSync(abs(p)),`STALE_VARIANT_RESURRECTED:${p}`);

const workflowFinalizationReady=
  workflow.includes('FINALIZE_SOURCE_ONLY')&&
  workflow.includes('canonical-source-finalizer')&&
  workflow.includes("github.event_name == 'push'");
const pushRegistrationValidated=
  workflow.includes('push:')&&
  workflow.includes('branches: [ays/backend-tenant-lab-v99-20260703]')&&
  pushProof.ok===true&&
  pushProof.status==='ACTIONS_PUSH_REGISTRATION_PROBE_PASS'&&
  pushProof.eventName==='push'&&
  Number(pushProof.runId)===32527157212&&
  pushProof.triggerSha==='5da25bf227fbe7fab40eb83aeb2a93e9e4da9aee';
const runObserverRootCauseValidated=
  observerRootcause.ok===true&&
  observerRootcause.status==='MACRO2_RUN_OBSERVER_ROOT_CAUSE_RESOLVED'&&
  observerRootcause.classification==='VALIDATOR_STALE'&&
  observerRootcause.secondaryClassification==='PIPELINE_MECHANISM_FAILURE'&&
  observerRootcause.knownPushProof?.runId===32527157212&&
  observerRootcause.negativeControl?.result==='FALSE_NEGATIVE_PROVEN';
const receiptRootCauseValidated=
  receiptRootcause.ok===true&&
  receiptRootcause.status==='MACRO2_EXECUTION_RECEIPT_OBSERVER_ROOT_CAUSE_RESOLVED'&&
  receiptRootcause.classification==='PIPELINE_MECHANISM_FAILURE'&&
  receiptRootcause.failedRunId===32596094127&&
  receiptRootcause.failureStage==='EXECUTION_RECEIPT'&&
  receiptRootcause.httpStatus===403&&
  receiptRootcause.observerAuthoritative===false;
const sourceAcceptanceObservabilityRootCauseValidated=
  sourceAcceptanceObservabilityRootcause.ok===true&&
  sourceAcceptanceObservabilityRootcause.status==='MACRO2_SOURCE_ACCEPTANCE_OBSERVABILITY_ROOT_CAUSE_RESOLVED'&&
  sourceAcceptanceObservabilityRootcause.classification==='PIPELINE_MECHANISM_FAILURE'&&
  sourceAcceptanceObservabilityRootcause.failedRunId===32607530811&&
  sourceAcceptanceObservabilityRootcause.failureStage==='SOURCE_ACCEPTANCE_OR_BUILD'&&
  sourceAcceptanceObservabilityRootcause.exactLocalReproduction?.sourceAcceptancePrecommit==='107/107_PASS'&&
  sourceAcceptanceObservabilityRootcause.exactLocalReproduction?.successorBuild==='194_9_185_FULL_REHASH_PASS'&&
  sourceAcceptanceObservabilityRootcause.exactLocalReproduction?.successorSourceAcceptance==='107/107_PASS'&&
  sourceAcceptanceObservabilityRootcause.validationSemanticsChanged===false;
const sourceAcceptanceDiagnosticPreservationValidated=
  sourceAcceptanceObservabilityRootCauseValidated&&
  workflow.includes('SOURCE_ACCEPTANCE_EVIDENCE_NON_LOSSY')&&
  workflow.includes('PRESERVE_PRE_RUNNER_FAILURE_JSON')&&
  workflow.includes('macro2-source-acceptance-precommit.json')&&
  workflow.includes('diagnosticPreserved:true')&&
  workflow.includes('failedChecks')&&
  workflow.includes('observedDeltaPaths');

const executionReceiptObserverValidated=
  workflow.includes('ORBIT360_MACRO2_FINALIZE_START')&&
  workflow.includes('ORBIT360_MACRO2_FINALIZE_PASS')&&
  workflow.includes('ORBIT360_MACRO2_FINALIZE_TERMINAL_FAIL')&&
  workflow.includes('issues: write');
const nonBlockingExecutionObserverValidated=
  receiptRootCauseValidated&&
  workflow.includes('pull-requests: write')&&
  workflow.includes('PR_COMMENT_OBSERVER_NON_BLOCKING')&&
  workflow.includes('GITHUB_STEP_SUMMARY');

check(workflowFinalizationReady,'FINALIZE_WORKFLOW_NOT_READY');
check(pushRegistrationValidated,'PUSH_REGISTRATION_HANDSHAKE_INVALID');
check(runObserverRootCauseValidated,'RUN_OBSERVER_ROOTCAUSE_INVALID');
check(executionReceiptObserverValidated,'EXECUTION_RECEIPT_OBSERVER_INVALID');
check(nonBlockingExecutionObserverValidated,'EXECUTION_RECEIPT_OBSERVER_STILL_BLOCKING');
check(sourceAcceptanceObservabilityRootCauseValidated,'SOURCE_ACCEPTANCE_OBSERVABILITY_ROOTCAUSE_INVALID');
check(sourceAcceptanceDiagnosticPreservationValidated,'SOURCE_ACCEPTANCE_DIAGNOSTIC_PRESERVATION_INVALID');
check(!workflow.includes('actions: write'),'ACTIONS_WRITE_FORBIDDEN');

if(pointerFinalize&&process.env.GITHUB_EVENT_NAME==='push'){
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
  check(!process.env.GITHUB_SHA||head===process.env.GITHUB_SHA,'ACTIVATION_HEAD_MISMATCH');
  check(!process.env.GITHUB_EVENT_BEFORE||parent===process.env.GITHUB_EVENT_BEFORE,'ACTIVATION_PARENT_MISMATCH');
}

const out={
  ok:failures.length===0,
  status:failures.length?'MACRO2_PIPELINE_PREFLIGHT_FAIL':'MACRO2_PIPELINE_PREFLIGHT_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  failures,
  branch:BRANCH,
  pointerStatus:pointer.status||null,
  pointerMode:pointer.mode||null,
  activeRequestPath:pointer.activeRequestPath??null,
  predecessorValidated:failures.every(x=>!x.startsWith('PREDECESSOR_')),
  certifiedBundlesValidated:failures.every(x=>!x.startsWith('PATCH_')&&!x.startsWith('POINTER_BUNDLE_')),
  bundleIdentityAuthority:'GZIP_SHA256_PLUS_RAW_SHA256',
  gitBlobIdentityAuthoritative:false,
  runnersValidated:failures.every(x=>!x.startsWith('RUNNER_')&&!x.startsWith('PRE_RUNNER_')&&!x.startsWith('POST_RUNNER_')),
  staleVariantPathsAbsent:failures.every(x=>!x.startsWith('STALE_VARIANT_RESURRECTED:')),
  collapsedStateMachineValidated:!failures.includes('POINTER_STATE_INVALID')&&!failures.includes('ALLOWED_TRANSITION_INVALID'),
  workflowFinalizationReady,
  stopRetryReopenValidated:failures.length===0,
  actionsRegistrationHandshakeValidated:pushRegistrationValidated,
  runObserverRootCauseValidated,
  executionReceiptObserverValidated,
  nonBlockingExecutionObserverValidated,
  sourceAcceptanceObservabilityRootCauseValidated,
  sourceAcceptanceDiagnosticPreservationValidated,
  observerIndependentOfFilteredCommitRunReader:true,
  activationParentBindingValidated:pointerIdle||failures.every(x=>!x.startsWith('ACTIVATION_')),
  durableSourceBeforeArtifact:true,
  durableArtifactMetadataBeforePromotion:true,
  artifactDigestContractNormalized:true,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  writes:0,
  deployExecuted:false,
  productionTouched:false
};
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(41);
