#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const A=(root,p)=>path.join(root,p);
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const PACKAGE='orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json';
const OWNER='tools/orbit360-continuity-transition-owner-v20260824.mjs';
const ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const REGISTER='tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs';
const CONVERGENCE='tools/orbit360-control-plane-evidence-convergence-v20260822.mjs';
const WORKFLOW_AUDIT='tools/orbit360-workflow-operational-surface-audit-v20260820.mjs';
const NO_REWRITE='tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs';
const EVIDENCE_LIFECYCLE='tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs';
const WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3';
const EXPECTED_PHASE='F2_PRE_RISK_FAILURE_AWAITING_SOURCE_ONLY_ROOT_CAUSE_WITH_AUTH_PRESERVED';
const EXPECTED_STATUS='F2_PRE_RISK_FAILURE_AUTHORIZATION_PRESERVED';
const TEST_RUN=9916345049;
const failures=[];const need=(v,c)=>{if(!v)failures.push(c);};
const json=(root,p)=>JSON.parse(fs.readFileSync(A(root,p),'utf8').replace(/^\uFEFF/,''));
const parse=s=>{try{return JSON.parse(String(s||'').trim());}catch{return null;}};
const lastJson=s=>{const text=String(s||'').trim();if(!text)return null;const direct=parse(text);if(direct)return direct;const starts=[];for(let i=0;i<text.length;i++){if(text[i]==='{')starts.push(i);}for(let i=starts.length-1;i>=0;i--){const candidate=text.slice(starts[i]).trim();const parsed=parse(candidate);if(parsed)return parsed;}return null;};
const run=(root,rel,args=[],extraEnv={})=>{const r=spawnSync(process.execPath,[A(root,rel),...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,ORBIT360_ROOT:root,...extraEnv}});return{status:r.status,json:lastJson(r.stdout)||{},stdout:String(r.stdout||''),stderr:String(r.stderr||'')}};
const git=(args,opts={})=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],...opts}).trim();
const candidateMatches=(x,c)=>Number(x?.candidateArtifactId)===Number(c?.artifactId)&&String(x?.candidateSourceHead||'')===String(c?.sourceHead||'')&&String(x?.candidateArtifactDigest||'')===String(c?.artifactDigest||'');
const reusableAuth=(x,identity,c)=>x?.schemaVersion==='orbit360-f2-runtime-authorization-v4-risk-boundary'&&x?.status==='PRE_RISK_FAIL_AUTHORIZATION_REUSABLE'&&x?.approved===true&&x?.authorizationIdentityDigest===identity&&x?.allowedExecutions===1&&x?.consumed===false&&x?.authorizationFrozen===true&&x?.replayAllowed===false&&x?.historical===false&&x?.runtimeAttemptAccepted===false&&x?.runtimeAttemptReserved===false&&x?.privilegedRiskBoundaryEntered===false&&Number(x?.runtimeAttemptCount)===0&&x?.runtimeRunId==null&&Boolean(x?.lastPreRiskFailure)&&candidateMatches(x,c);
const reusableRequest=(x,identity,authPath,c)=>x?.schemaVersion==='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v4-risk-boundary'&&x?.status==='PRE_RISK_FAIL_REQUEST_REUSABLE'&&x?.approved===true&&x?.authorizationIdentityDigest===identity&&x?.authorizationRecordPath===authPath&&x?.allowedExecutions===1&&x?.consumed===false&&x?.authorizationFrozen===true&&x?.replayAllowed===false&&x?.historical===false&&x?.runtimeAttemptAccepted===false&&x?.runtimeAttemptReserved===false&&x?.privilegedRiskBoundaryEntered===false&&Number(x?.runtimeAttemptCount)===0&&x?.runtimeRunId==null&&Boolean(x?.lastPreRiskFailure)&&candidateMatches(x,c);

let L={},P={},identity='',authPath='',requestPath='',scratch='',sourceGate={},runtimeRegister={},runtimeGate={},convergence={},workflowAudit={},preAuthLifecycle={},preTerminalLifecycle={};
let behavioralReusePass=false,arbitraryFutureFilenameCleanupPass=false,canonicalWorktreeUnchanged=false;
const beforeStatus=git(['status','--porcelain']);
need(beforeStatus==='','CANONICAL_WORKTREE_NOT_CLEAN_BEFORE_REUSE_READINESS');
try{
  L=json(ROOT,LEDGER);P=json(ROOT,PACKAGE);
  const expectedLedger=Number(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER||L.revision),expectedPackage=Number(process.env.ORBIT360_SELFTEST_EXPECTED_PACKAGE||L.productionReopeningPackage?.revision);
  need(Number(L.revision)===expectedLedger,'LEDGER_REVISION_MISMATCH');
  need(Number(P.revision)===expectedPackage&&Number(L.productionReopeningPackage?.revision)===expectedPackage,'PACKAGE_REVISION_MISMATCH');
  need(L.branch==='ays/backend-tenant-lab-v99-20260703'&&Number(L.pullRequest)===5,'CANONICAL_BRANCH_OR_PR_DRIFT');
  need(L.activeState?.phase===EXPECTED_PHASE&&L.activeState?.status===EXPECTED_STATUS,'PRE_RISK_PRESERVED_STATE_INVALID');
  need(L.activeState?.runtimeAuthorized===false&&L.activeState?.runtimeReplayAllowed===false,'RUNTIME_BOUNDARY_OPEN');
  need(Number(L.progress?.productionRouteProgressPct)===75&&L.progress?.f2TerminalPass===false,'PRODUCTION_ROUTE_STATE_INVALID');
  const b=L.authorizationBoundary||{};identity=String(b.preparedAuthorizationIdentityDigest||'');authPath=String(b.reusableAuthorizationRecordPath||'');requestPath=String(b.reusableRequestPath||'');
  need(/^[a-f0-9]{64}$/.test(identity),'PRESERVED_AUTHORIZATION_IDENTITY_INVALID');
  need(b.activeRuntimeAuthorization===false&&b.activeRequestPath==null&&b.authorizationRecordPath==null&&(b.runtimeAttemptAccepted??false)===false,'PRESERVED_BOUNDARY_NOT_INERT');
  need(b.freshAuthorizationRequired===false&&b.preRiskAuthorizationReuseAllowed===true&&b.privilegedRiskBoundaryEntered===false,'PRESERVED_REUSE_POLICY_INVALID');
  need(L.productionReopeningPackage?.authorizationAllowed===true&&L.productionReopeningPackage?.authorizationReuseAllowed===true&&L.productionReopeningPackage?.runtimeAllowed===false,'PRESERVED_PACKAGE_REUSE_POLICY_INVALID');
  need(authPath&&fs.existsSync(A(ROOT,authPath)),'REUSABLE_AUTHORIZATION_RECORD_MISSING');
  need(requestPath&&fs.existsSync(A(ROOT,requestPath)),'REUSABLE_REQUEST_RECORD_MISSING');
  if(authPath&&fs.existsSync(A(ROOT,authPath)))need(reusableAuth(json(ROOT,authPath),identity,L.successorCandidate),'REUSABLE_AUTHORIZATION_RECORD_SEMANTICS_INVALID');
  if(requestPath&&fs.existsSync(A(ROOT,requestPath)))need(reusableRequest(json(ROOT,requestPath),identity,authPath,L.successorCandidate),'REUSABLE_REQUEST_RECORD_SEMANTICS_INVALID');
  for(const rel of [OWNER,ROUTER,REGISTER,CONVERGENCE,WORKFLOW_AUDIT,NO_REWRITE,EVIDENCE_LIFECYCLE])need(spawnSync(process.execPath,['--check',A(ROOT,rel)],{cwd:ROOT}).status===0,`NODE_CHECK_FAIL:${rel}`);
  if(failures.length)throw new Error('CANONICAL_PRECONDITIONS_FAILED');

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-f2-prerisk-reuse-'));scratch=path.join(temp,'repo');
  execFileSync('git',['worktree','add','--detach',scratch,'HEAD'],{cwd:ROOT,stdio:'ignore'});
  const wf=A(scratch,WORKFLOW);
  const wa=run(scratch,WORKFLOW_AUDIT,[],{ORBIT360_WORKFLOW_SOURCE_FILE:wf});workflowAudit=wa.json;need(wa.status===0&&workflowAudit.ok===true&&workflowAudit.status==='WORKFLOW_CONTROL_SURFACE_AUDIT_PASS'&&workflowAudit.executingSnapshotBound===true,'WORKFLOW_SURFACE_AUDIT_FAIL');
  const nr=run(scratch,NO_REWRITE);need(nr.status===0&&nr.json?.ok===true,'SOURCE_REWRITE_GUARD_FAIL');
  const pa=run(scratch,EVIDENCE_LIFECYCLE,['--phase','pre-auth','--assert-only']);preAuthLifecycle=pa.json;need(pa.status===0&&preAuthLifecycle.ok===true,'EVIDENCE_LIFECYCLE_PREAUTH_ASSERT_FAIL');
  const unknown='orbit360-platform/runtime-gate-crm-v20260716/__prerisk-reuse-unknown.json';fs.writeFileSync(A(scratch,unknown),'{}\n','utf8');const cleanup=run(scratch,EVIDENCE_LIFECYCLE,['--phase','pre-auth']);arbitraryFutureFilenameCleanupPass=cleanup.status===0&&cleanup.json?.ok===true&&!fs.existsSync(A(scratch,unknown));need(arbitraryFutureFilenameCleanupPass,'EVIDENCE_LIFECYCLE_UNKNOWN_CLEANUP_FAIL');
  const terminal='orbit360-platform/runtime-gate-crm-v20260716/f2-runtime-terminal-inline-99999999998.json';fs.writeFileSync(A(scratch,terminal),'{}\n','utf8');const pt=run(scratch,EVIDENCE_LIFECYCLE,['--phase','pre-terminal','--preserve',terminal,'--assert-only']);preTerminalLifecycle=pt.json;need(pt.status===0&&preTerminalLifecycle.ok===true&&Array.isArray(preTerminalLifecycle.remaining)&&preTerminalLifecycle.remaining.length===1&&preTerminalLifecycle.remaining[0]===terminal,'EVIDENCE_LIFECYCLE_PRETERMINAL_ASSERT_FAIL');fs.rmSync(A(scratch,terminal),{force:true});run(scratch,EVIDENCE_LIFECYCLE,['--phase','pre-auth']);
  const sg=run(scratch,ROUTER,[GATE],{ORBIT360_EXPECTED_REQUEST_VERSION:'NONE_PENDING_FRESH_AUTHORIZATION',ORBIT360_REQUEST_FILE:'',ORBIT360_F2_WORKFLOW_SOURCE_FILE:wf});sourceGate=sg.json;need(sg.status===0&&sourceGate.ok===true&&sourceGate.status==='PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE'&&sourceGate.executionAuthorized===false&&sourceGate.runtimeAuthorized===false&&sourceGate.browserAuthorized===false,'F2_SOURCE_GATE_FAIL');
  run(scratch,EVIDENCE_LIFECYCLE,['--phase','pre-auth']);

  let sL=json(scratch,LEDGER),sP=json(scratch,PACKAGE);
  const ap=run(scratch,OWNER,['--transition','F2_RUNTIME_AUTHORIZATION_PERSIST','--expected-revision',String(sL.revision),'--expected-package-revision',String(sP.revision),'--authorization-identity',identity],{ORBIT360_PUBLICATION_CLASS:'F2_AUTH_ACCEPT'});need(ap.status===0&&ap.json?.ok===true&&ap.json?.authorizationReused===true,'SCRATCH_REUSE_AUTHORIZATION_PERSIST_FAIL');
  sL=json(scratch,LEDGER);sP=json(scratch,PACKAGE);
  const parent=git(['rev-parse','HEAD']);
  const rm=run(scratch,OWNER,['--transition','F2_RUNTIME_REQUEST_MATERIALIZE','--expected-revision',String(sL.revision),'--expected-package-revision',String(sP.revision),'--authorization-identity',identity,'--parent-head',parent],{ORBIT360_PUBLICATION_CLASS:'F2_AUTH_ACCEPT'});need(rm.status===0&&rm.json?.ok===true&&rm.json?.requestReused===true,'SCRATCH_REUSE_REQUEST_MATERIALIZE_FAIL');
  sL=json(scratch,LEDGER);sP=json(scratch,PACKAGE);
  const aa=run(scratch,OWNER,['--transition','F2_RUNTIME_ATTEMPT_ACCEPT','--expected-revision',String(sL.revision),'--expected-package-revision',String(sP.revision),'--runtime-run-id',String(TEST_RUN)],{ORBIT360_PUBLICATION_CLASS:'F2_AUTH_ACCEPT'});need(aa.status===0&&aa.json?.ok===true&&aa.json?.attemptReserved===true&&aa.json?.oneShotConsumed===false&&Number(aa.json?.allowedExecutions)===1,'SCRATCH_REUSE_ATTEMPT_RESERVATION_FAIL');
  sL=json(scratch,LEDGER);const active=String(sL.authorizationBoundary?.activeRequestPath||'');need(active===requestPath,'SCRATCH_REUSED_REQUEST_PATH_DRIFT');
  const rr=run(scratch,REGISTER,[],{ORBIT360_REQUEST_FILE:active,ORBIT360_EXPECTED_REQUEST_VERSION:VERSION,GITHUB_RUN_ID:String(TEST_RUN),ORBIT360_F2_WORKFLOW_SOURCE_FILE:wf});runtimeRegister=rr.json;need(rr.status===0&&runtimeRegister.ok===true&&runtimeRegister.status==='F2_RUNTIME_REGISTER_READ_ONLY_VALIDATED_V4'&&runtimeRegister.oneShotConsumed===false&&Number(runtimeRegister.allowedExecutions)===1,'SCRATCH_RUNTIME_REGISTER_V4_FAIL');
  const cv=run(scratch,CONVERGENCE,['--repo-only']);convergence=cv.json;need(cv.status===0&&convergence.ok===true&&convergence.validationMode==='CLOSED_OR_RUNTIME_STATE'&&convergence.authorized===true&&convergence.requestMaterialized===true&&convergence.runtimeAttemptAccepted===true&&convergence.runtimeAllowed===false&&convergence.invariantReadOnly===true,'SCRATCH_RESERVED_CONVERGENCE_FAIL');
  const rg=run(scratch,ROUTER,[GATE],{ORBIT360_REQUEST_FILE:active,ORBIT360_EXPECTED_REQUEST_VERSION:VERSION,GITHUB_RUN_ID:String(TEST_RUN),ORBIT360_F2_WORKFLOW_SOURCE_FILE:wf});runtimeGate=rg.json;need(rg.status===0&&runtimeGate.ok===true&&runtimeGate.status==='GO_GATE_CONTRACT'&&runtimeGate.runtimeAttemptReserved===true&&runtimeGate.oneShotConsumed===false&&Number(runtimeGate.allowedExecutions)===1&&runtimeGate.executionAuthorized===true&&runtimeGate.runtimeAuthorized===true&&runtimeGate.browserAuthorized===true&&runtimeGate.writeAuthorized===false&&runtimeGate.deployAuthorized===false&&runtimeGate.productionAuthorized===false,'SCRATCH_RUNTIME_SEMANTIC_GATE_V4_FAIL');
  behavioralReusePass=failures.length===0;
} catch(error){if(!failures.length)failures.push(`PRE_RISK_REUSE_READINESS_EXCEPTION:${String(error?.message||error).slice(0,300)}`);} finally {
  if(scratch){try{execFileSync('git',['worktree','remove','--force',scratch],{cwd:ROOT,stdio:'ignore'});}catch{}try{fs.rmSync(path.dirname(scratch),{recursive:true,force:true});}catch{}}
  try{canonicalWorktreeUnchanged=git(['status','--porcelain'])===beforeStatus;need(canonicalWorktreeUnchanged,'CANONICAL_WORKTREE_CHANGED_BY_REUSE_READINESS');}catch{need(false,'CANONICAL_WORKTREE_READBACK_FAIL');}
}
const out={schemaVersion:'orbit360-f2-prerisk-reuse-readiness-v2-last-json-20260826',ok:failures.length===0,status:failures.length?'F2_PRE_RISK_REUSE_READINESS_FAIL':'F2_PRE_RISK_REUSE_READINESS_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],controllerMode:'ACTUAL_PRESERVED_AUTHORIZATION_BEHAVIORAL_SCRATCH_REUSE',preRiskAuthorizationReusePass:behavioralReusePass,authorizationIdentityDigest:identity||null,reusableAuthorizationRecordPath:authPath||null,reusableRequestPath:requestPath||null,exactF2SourcePathExecuted:sourceGate.ok===true,classWidePreAuthEvidenceLifecyclePass:preAuthLifecycle.ok===true,classWidePreTerminalEvidenceLifecyclePass:preTerminalLifecycle.ok===true,arbitraryFutureFilenameCleanupPass,workflowSurfaceAuditPass:workflowAudit.ok===true,runtimeRegisterReadOnlyPass:runtimeRegister.ok===true,runtimeSemanticGateV4Pass:runtimeGate.ok===true,reservationDoesNotConsumePass:runtimeGate.oneShotConsumed===false&&Number(runtimeGate.allowedExecutions)===1,canonicalConvergencePass:convergence.ok===true,invariantReadOnlyPass:convergence.invariantReadOnly===true,canonicalWorktreeUnchanged,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
