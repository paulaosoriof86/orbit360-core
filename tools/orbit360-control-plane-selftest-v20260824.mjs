#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const expectedLedger=Number(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER||0);
const expectedPackage=Number(process.env.ORBIT360_SELFTEST_EXPECTED_PACKAGE||0);
const EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716';
const P={
  contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
  workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
  noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
  preflight:'tools/orbit360-macro3-mechanism-preflight-v20260823.mjs',
  sourcePrecheck:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',
  workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
  owner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
  delegatedOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
  projection:'tools/orbit360-continuity-projection-atomic-v20260820.mjs',
  evidenceLifecycle:'tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs',
  register:'tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs',
  gateRouter:'tools/orbit360-validar-gate-contracts-v20260717.mjs'
};
const A=(root,p)=>path.join(root,p);
const text=(root,p)=>fs.readFileSync(A(root,p),'utf8').replace(/^\uFEFF/,'');
const json=(root,p)=>JSON.parse(text(root,p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
const git=(root,args)=>String(execFileSync('git',['-C',root,...args],{encoding:'utf8'})).trim();
const run=(root,rel,args=[],env={})=>spawnSync(process.execPath,[A(root,rel),...args],{cwd:root,encoding:'utf8',env:{...process.env,...env}});
const parseJson=s=>{try{return JSON.parse(String(s||'').trim());}catch{return null;}};
const runJson=(root,rel,args=[],env={})=>{const r=run(root,rel,args,env);const obj=parseJson(r.stdout);return{result:r,json:obj};};
const repoChanges=root=>{
  const out=[];
  for(const args of [['diff','--name-only'],['diff','--cached','--name-only'],['ls-files','--others','--exclude-standard']]){
    const s=git(root,args);if(s)out.push(...s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean));
  }
  return [...new Set(out)].sort();
};
const evidenceChanges=root=>repoChanges(root).filter(p=>p===EVIDENCE_DIR||p.startsWith(`${EVIDENCE_DIR}/`));
const requireSuccess=(root,rel,args=[],env={},code='COMMAND_FAIL')=>{
  const r=run(root,rel,args,env);if(r.status!==0)throw new Error(`${code}:${String(r.stderr||r.stdout||'').slice(-700)}`);return r;
};
const snapshot=(root,paths)=>Object.fromEntries(paths.map(p=>[p,text(root,p)]));
const snapshotEqual=(root,snap)=>Object.entries(snap).every(([p,v])=>text(root,p)===v);

for(const p of Object.values(P))need(fs.existsSync(A(ROOT,p)),`MISSING:${p}`);
let sourcePathExecuted=false,classWidePreAuthPass=false,classWideTerminalPass=false,arbitraryFilenamePass=false;
let candidateBindingDynamic=false,semanticPreflightPass=false,scratchBehavioralTransitionsPass=false,negativeRegressionSuitePass=false,preProviderGatePathPass=false,projectionImmutabilityPass=false,remoteCASReadbackPass=false,secondAttemptStopRetryPass=false;
let workflowProviderUngatedNegativePass=false,workflowCandidateHardcodeNegativePass=false,workflowOperationalRevisionHardcodeNegativePass=false,sourceRewriteMutationNegativePass=false;
let authPublicationSurfacePass=false,runtimeRunIdBindingSimulationPass=false,runtimeRegisterReadOnlyPass=false,routerNativeRuntimeContractPass=false;
let semanticContract={};

if(!failures.length){
  const L=json(ROOT,P.ledger),contract=json(ROOT,P.contract),registry=json(ROOT,P.registry),candidate=L.successorCandidate||{};
  semanticContract=contract;
  need(expectedLedger>0&&L.revision===expectedLedger,'LEDGER_REVISION_MISMATCH');
  need(expectedPackage>0&&Number(L.productionReopeningPackage?.revision)===expectedPackage,'PACKAGE_REVISION_MISMATCH');
  need(contract.active===true&&contract.candidateBinding==='DYNAMIC_FROM_CANONICAL_LEDGER','SEMANTIC_CONTRACT_NOT_ACTIVE');
  need(contract.behavioralContractPolicy?.runtimeRegisterMustBeReadOnly===true,'SEMANTIC_CONTRACT_REGISTER_READONLY_MISSING');
  need(contract.behavioralContractPolicy?.runtimeRouterMustSupportF2V3Natively===true,'SEMANTIC_CONTRACT_NATIVE_ROUTER_MISSING');
  need(contract.behavioralContractPolicy?.activeSourceFileWritesForbidden===true,'SEMANTIC_CONTRACT_SOURCE_WRITE_FORBIDDEN_MISSING');
  need(contract.behavioralSelftestRequirements?.workflowOperationalRevisionHardcodeNegativeTest===true,'SEMANTIC_CONTRACT_REVISION_NEGATIVE_TEST_MISSING');
  need(contract.behavioralSelftestRequirements?.sourceRewriteMutationNegativeTest===true,'SEMANTIC_CONTRACT_SOURCE_REWRITE_NEGATIVE_TEST_MISSING');
  need(contract.behavioralSelftestRequirements?.authPublicationSurfaceIncludesCanonicalStateOwner===true,'SEMANTIC_CONTRACT_AUTH_SURFACE_OWNER_MISSING');
  need(contract.behavioralSelftestRequirements?.runtimeRunIdBindingSimulation===true,'SEMANTIC_CONTRACT_RUNTIME_RUN_BINDING_MISSING');
  need(contract.behavioralSelftestRequirements?.runtimeRegisterReadOnlyBehavioralTest===true,'SEMANTIC_CONTRACT_REGISTER_BEHAVIOR_TEST_MISSING');
  need(contract.behavioralSelftestRequirements?.nativeRuntimeRouterBehavioralTest===true,'SEMANTIC_CONTRACT_ROUTER_BEHAVIOR_TEST_MISSING');
  candidateBindingDynamic=Number.isInteger(Number(candidate.artifactId))&&Number(candidate.artifactId)>0&&/^[a-f0-9]{40}$/.test(String(candidate.sourceHead||''))&&/^sha256:[a-f0-9]{64}$/.test(String(candidate.artifactDigest||''));
  need(candidateBindingDynamic,'DYNAMIC_CANDIDATE_INVALID');
  const hardeningOpen=L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY'&&['CONTROL_PLANE_FALSE_PASS_INVALIDATED','CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY'].includes(L.activeState?.status);
  const hardeningClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
  need(hardeningOpen||hardeningClosed,'SELFTEST_PHASE_NOT_HARDENING_OR_CLOSED');
  need(L.activeState?.runtimeAuthorized===false&&L.activeState?.runtimeReplayAllowed===false,'SELFTEST_RUNTIME_NOT_CLOSED');
  need(L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.activeRequestPath==null&&L.authorizationBoundary?.authorizationRecordPath==null&&(L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'SELFTEST_AUTH_REQUEST_NOT_INERT');
  need(Number(L.progress?.productionRouteProgressPct)===75&&L.progress?.f2TerminalPass===false,'SELFTEST_PROGRESS_NOT_FAIL_CLOSED');

  const nr=runJson(ROOT,P.noRewrite);need(nr.result.status===0&&nr.json?.ok===true&&nr.json?.scopeMode==='MACHINE_READABLE_CONTRACT_DERIVED'&&nr.json?.sourceWritePatternsForbidden===true,'NO_SOURCE_REWRITE_GUARD_FAIL');
  const wa=runJson(ROOT,P.workflowAudit);need(wa.result.status===0&&wa.json?.ok===true&&Number(wa.json?.totalWorkflowFiles)===1,'WORKFLOW_SURFACE_AUDIT_FAIL');
  const mp=runJson(ROOT,P.preflight,[],{ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(ROOT,P.workflow)});
  semanticPreflightPass=mp.result.status===0&&mp.json?.ok===true&&mp.json?.sourceShapeValidationUsed===false&&mp.json?.candidateBinding==='DYNAMIC_FROM_CANONICAL_LEDGER';
  need(semanticPreflightPass,'MECHANISM_SEMANTIC_PREFLIGHT_FAIL');

  const source=runJson(ROOT,P.sourcePrecheck,[L.gateId],{ORBIT360_EXPECTED_REQUEST_VERSION:'NONE_PENDING_FRESH_AUTHORIZATION',ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(ROOT,P.workflow)});
  sourcePathExecuted=true;
  need(source.result.status===0&&source.json?.ok===true&&source.json?.status==='PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE'&&source.json?.executionAuthorized===false&&source.json?.runtimeAuthorized===false&&source.json?.browserAuthorized===false,'EXACT_F2_SOURCE_PRECHECK_FAIL');
  need(evidenceChanges(ROOT).length>=1,'EXACT_F2_SOURCE_PRECHECK_DID_NOT_EXERCISE_EVIDENCE_SURFACE');
  const preAuth=runJson(ROOT,P.evidenceLifecycle,['--phase','pre-auth']);
  classWidePreAuthPass=preAuth.result.status===0&&preAuth.json?.ok===true&&Array.isArray(preAuth.json?.remaining)&&preAuth.json.remaining.length===0;
  need(classWidePreAuthPass,'CLASS_WIDE_PRE_AUTH_CLEANUP_FAIL');
  need(evidenceChanges(ROOT).length===0,'PRE_AUTH_EVIDENCE_SURFACE_NOT_CLEAN');

  const token=`${process.pid}${Date.now()}`;
  const transientA=`${EVIDENCE_DIR}/__selftest-transient-a-${token}.json`;
  const transientB=`${EVIDENCE_DIR}/__selftest-future-unknown-name-${token}.json`;
  const terminal=`${EVIDENCE_DIR}/f2-runtime-terminal-inline-${token}.json`;
  for(const p of [transientA,transientB,terminal])fs.writeFileSync(A(ROOT,p),JSON.stringify({selftest:true,path:p})+'\n','utf8');
  const preTerminal=runJson(ROOT,P.evidenceLifecycle,['--phase','pre-terminal','--preserve',terminal]);
  classWideTerminalPass=preTerminal.result.status===0&&preTerminal.json?.ok===true&&JSON.stringify(preTerminal.json?.remaining)===JSON.stringify([terminal]);
  arbitraryFilenamePass=Array.isArray(preTerminal.json?.cleaned)&&preTerminal.json.cleaned.includes(transientA)&&preTerminal.json.cleaned.includes(transientB);
  need(classWideTerminalPass,'CLASS_WIDE_PRE_TERMINAL_SURFACE_FAIL');
  need(arbitraryFilenamePass,'ARBITRARY_FUTURE_FILENAME_NOT_CLEANED');
  fs.rmSync(A(ROOT,terminal),{force:true});
  need(evidenceChanges(ROOT).length===0,'SELFTEST_EVIDENCE_SURFACE_DIRTY_AFTER_TERMINAL_SIMULATION');

  try{
    execFileSync('git',['fetch','--no-tags','origin',contract.branch],{cwd:ROOT,stdio:'ignore'});
    const live=git(ROOT,['rev-parse','FETCH_HEAD']),head=git(ROOT,['rev-parse','HEAD']);
    remoteCASReadbackPass=live===head;
    need(remoteCASReadbackPass,'REMOTE_HEAD_CAS_READBACK_MISMATCH');
  }catch(error){need(false,`REMOTE_HEAD_CAS_READBACK_FAIL:${String(error?.message||error).slice(0,200)}`);}

  const tempParent=process.env.RUNNER_TEMP?path.resolve(process.env.RUNNER_TEMP):path.resolve(ROOT,'..');
  const scratch=path.join(tempParent,`orbit360-control-plane-selftest-${token}`);
  try{
    fs.rmSync(scratch,{recursive:true,force:true});
    execFileSync('git',['worktree','add','--detach',scratch,'HEAD'],{cwd:ROOT,stdio:'ignore'});
    git(scratch,['config','user.name','orbit360-control-plane-selftest']);
    git(scratch,['config','user.email','orbit360-control-plane-selftest@users.noreply.github.com']);
    const scratchContract=json(scratch,P.contract),scratchRegistry=json(scratch,P.registry),scratchL=json(scratch,P.ledger),scratchCandidate=scratchL.successorCandidate;
    if(hardeningClosed){
      scratchL.activeState={...scratchL.activeState,phase:'MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY',status:'CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY',rootCauseStatus:'SELFTEST_SYNTHETIC_OPEN_FIXTURE',productFrozen:true,dataFrozen:true,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
      scratchL.authorizationBoundary={...scratchL.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:true,authorizationBlockedByHardeningPackage:true,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,currentBoundaryStatus:'STOP_RETRY_CONTROL_PLANE_REGRESSION_OPEN',activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null};
      scratchL.productionReopeningPackage={...scratchL.productionReopeningPackage,status:'OPEN_BLOCKED_CONTROL_PLANE_REGRESSION',firstIncompleteStep:'CONTROL-PLANE-FULL-PATH-REGRESSION',nextActionExact:'RUN_EXACT_F2_SOURCE_PATH_CLASSWIDE_EVIDENCE_SELFTEST',runtimeAllowed:false,authorizationAllowed:false,requestMaterializationAllowed:false};
      scratchL.nextAction={id:'RUN_EXACT_F2_SOURCE_PATH_CLASSWIDE_EVIDENCE_SELFTEST',description:'Synthetic selftest fixture: revalidate control-plane before any authorization.',runtimeAllowed:false};
      scratchL.continuityControl={...scratchL.continuityControl,status:'CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',compositeInvariantStatus:'CONTROL_PLANE_REGRESSION_REQUIRES_FULL_PATH_REVALIDATION',evidenceFreshnessValidated:false,workflowHandshakeValidated:false,semanticBehavioralSelftestValidated:false,negativeRegressionSuiteValidated:false,preProviderScratchValidated:false,projectionImmutabilityValidated:false};
      fs.writeFileSync(A(scratch,P.ledger),JSON.stringify(scratchL,null,2)+'\n','utf8');
      requireSuccess(scratch,P.projection,['--expected-revision',String(scratchL.revision)],{},'SCRATCH_CLOSED_STATE_FIXTURE_PROJECTION_FAIL');
      git(scratch,['add','-A']);git(scratch,['commit','-m','selftest: normalize closed canonical state to synthetic open fixture']);
      need(repoChanges(scratch).length===0,'SCRATCH_CLOSED_STATE_FIXTURE_NOT_CLEAN');
    }
    need(scratchContract.candidateBinding==='DYNAMIC_FROM_CANONICAL_LEDGER','SCRATCH_CONTRACT_CANDIDATE_NOT_DYNAMIC');
    need(typeof scratchRegistry.sourceOfTruth==='string'&&scratchRegistry.sourceOfTruth===P.ledger,'SCRATCH_CANONICAL_STATE_OWNER_DRIFT');
    const immutablePaths=Array.isArray(scratchContract.runtimePreProviderImmutablePaths)?scratchContract.runtimePreProviderImmutablePaths:[];
    need(immutablePaths.length>=7&&immutablePaths.every(p=>fs.existsSync(A(scratch,p))),'SCRATCH_RUNTIME_IMMUTABLE_SURFACE_INVALID');

    const originalWorkflow=text(scratch,P.workflow);
    const providerRx=/(^\s*-\s*id:\s*provider\s*$[\s\S]*?^\s*if:\s*)([^\n]+)(\n)/m;
    const providerMatch=providerRx.exec(originalWorkflow);
    if(!providerMatch)throw new Error('NEGATIVE_PROVIDER_FIXTURE_NOT_FOUND');
    fs.writeFileSync(A(scratch,P.workflow),originalWorkflow.replace(providerRx,`${providerMatch[1]}always()${providerMatch[3]}`),'utf8');
    const ungated=runJson(scratch,P.workflowAudit);
    workflowProviderUngatedNegativePass=ungated.result.status!==0&&Array.isArray(ungated.json?.offenders)&&ungated.json.offenders.some(x=>x.reason==='PROVIDER_NOT_EXPLICITLY_GATED');
    fs.writeFileSync(A(scratch,P.workflow),originalWorkflow,'utf8');
    need(workflowProviderUngatedNegativePass,'NEGATIVE_PROVIDER_UNGATED_NOT_DETECTED');

    const candidateInjected=originalWorkflow.replace(/^env:\s*$/m,`env:\n  F2_ARTIFACT_ID: ${Number(scratchCandidate.artifactId)}`);
    fs.writeFileSync(A(scratch,P.workflow),candidateInjected,'utf8');
    const hardcoded=runJson(scratch,P.workflowAudit);
    workflowCandidateHardcodeNegativePass=hardcoded.result.status!==0&&Array.isArray(hardcoded.json?.offenders)&&hardcoded.json.offenders.some(x=>x.reason==='CANDIDATE_ARTIFACT_HARDCODED_IN_WORKFLOW');
    fs.writeFileSync(A(scratch,P.workflow),originalWorkflow,'utf8');
    need(workflowCandidateHardcodeNegativePass,'NEGATIVE_CANDIDATE_HARDCODE_NOT_DETECTED');

    const revisionInjected=originalWorkflow.replace(/run:\s*\|\n/,`run: |\n          jq -e '.revision==999999' \"$LEDGER\" >/dev/null\n`);
    if(revisionInjected===originalWorkflow)throw new Error('NEGATIVE_REVISION_FIXTURE_NOT_FOUND');
    fs.writeFileSync(A(scratch,P.workflow),revisionInjected,'utf8');
    const revisionHardcoded=runJson(scratch,P.workflowAudit);
    workflowOperationalRevisionHardcodeNegativePass=revisionHardcoded.result.status!==0&&Array.isArray(revisionHardcoded.json?.offenders)&&revisionHardcoded.json.offenders.some(x=>x.reason==='OPERATIONAL_REVISION_HARDCODED_IN_WORKFLOW');
    fs.writeFileSync(A(scratch,P.workflow),originalWorkflow,'utf8');
    need(workflowOperationalRevisionHardcodeNegativePass,'NEGATIVE_OPERATIONAL_REVISION_HARDCODE_NOT_DETECTED');

    const originalRegister=text(scratch,P.register);
    const mutationCall=`${['fs','writeFileSync'].join('.')}(${JSON.stringify(P.gateRouter)},'tamper');`;
    fs.writeFileSync(A(scratch,P.register),`${originalRegister}\n${mutationCall}\n`,'utf8');
    const rewriteProbe=runJson(scratch,P.noRewrite);
    sourceRewriteMutationNegativePass=rewriteProbe.result.status!==0&&Array.isArray(rewriteProbe.json?.failures)&&rewriteProbe.json.failures.some(x=>String(x).startsWith(`ACTIVE_SOURCE_REWRITE_FORBIDDEN:${P.register}:`));
    fs.writeFileSync(A(scratch,P.register),originalRegister,'utf8');
    need(sourceRewriteMutationNegativePass,'NEGATIVE_SOURCE_REWRITE_NOT_DETECTED');
    need(repoChanges(scratch).length===0,'NEGATIVE_FIXTURES_NOT_CLEAN');

    const baseHead=git(scratch,['rev-parse','HEAD']);
    const latestRegression=Number(scratchL.continuityControl?.latestControlPlaneRegression?.runId||0);
    const handshakeRun=latestRegression+1000000;
    const handshakeRel=`${EVIDENCE_DIR}/__selftest-handshake-${token}.json`;
    fs.writeFileSync(A(scratch,handshakeRel),JSON.stringify({
      schemaVersion:'orbit360-control-plane-selftest-handshake-v2-full-path',ok:true,status:'CONTROL_PLANE_SELFTEST_HANDSHAKE_PASS',classification:'PASS',controlPlaneSelftestPass:true,
      runId:handshakeRun,jobId:1,technicalPullRequest:0,canonicalBaseHead:baseHead,intentHead:baseHead,expectedLedgerRevision:Number(scratchL.revision),expectedPackageRevision:Number(scratchL.productionReopeningPackage?.revision),
      candidateArtifactId:Number(scratchCandidate.artifactId),candidateSourceHead:scratchCandidate.sourceHead,exactF2SourcePathExecuted:true,classWidePreAuthEvidenceLifecyclePass:true,classWidePreTerminalEvidenceLifecyclePass:true,arbitraryFutureFilenameCleanupPass:true,
      authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,replayAllowed:false,containsPII:false,containsSecrets:false
    },null,2)+'\n','utf8');
    requireSuccess(scratch,P.owner,['--transition','CONTROL_PLANE_HARDENING_CLOSE','--expected-revision',String(scratchL.revision),'--expected-package-revision',String(scratchL.productionReopeningPackage.revision),'--control-plane-evidence',handshakeRel],{},'SCRATCH_HARDENING_CLOSE_FAIL');
    fs.rmSync(A(scratch,handshakeRel),{force:true});
    let state=json(scratch,P.ledger);
    need(state.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS'&&state.productionReopeningPackage?.authorizationAllowed===true,'SCRATCH_HARDENING_CLOSE_STATE_INVALID');
    git(scratch,['add','-A']);git(scratch,['commit','-m','selftest: close control plane in scratch']);

    const ledgerBeforeProjection=text(scratch,P.ledger);
    requireSuccess(scratch,P.projection,['--expected-revision',String(state.revision)],{},'SCRATCH_PROJECTION_FAIL');
    projectionImmutabilityPass=text(scratch,P.ledger)===ledgerBeforeProjection;
    need(projectionImmutabilityPass,'PROJECTION_MUTATED_LEDGER');
    need(repoChanges(scratch).length===0,'PROJECTION_NOT_IDEMPOTENT_AFTER_CLOSE');

    const authIdentity=state.authorizationBoundary?.preparedAuthorizationIdentityDigest;
    requireSuccess(scratch,P.delegatedOwner,['--transition','F2_RUNTIME_AUTHORIZATION_PERSIST','--expected-revision',String(state.revision),'--expected-package-revision',String(state.productionReopeningPackage.revision),'--authorization-identity',authIdentity],{},'SCRATCH_AUTH_PERSIST_FAIL');
    state=json(scratch,P.ledger);
    const closedHead=git(scratch,['rev-parse','HEAD']);
    requireSuccess(scratch,P.delegatedOwner,['--transition','F2_RUNTIME_REQUEST_MATERIALIZE','--expected-revision',String(state.revision),'--expected-package-revision',String(state.productionReopeningPackage.revision),'--authorization-identity',authIdentity,'--parent-head',closedHead],{},'SCRATCH_REQUEST_MATERIALIZE_FAIL');
    state=json(scratch,P.ledger);
    const runtimeRun=handshakeRun+1;
    requireSuccess(scratch,P.delegatedOwner,['--transition','F2_RUNTIME_ATTEMPT_ACCEPT','--expected-revision',String(state.revision),'--expected-package-revision',String(state.productionReopeningPackage.revision),'--runtime-run-id',String(runtimeRun)],{},'SCRATCH_ATTEMPT_ACCEPT_FAIL');
    state=json(scratch,P.ledger);
    const second=run(scratch,P.delegatedOwner,['--transition','F2_RUNTIME_ATTEMPT_ACCEPT','--expected-revision',String(state.revision),'--expected-package-revision',String(state.productionReopeningPackage.revision),'--runtime-run-id',String(runtimeRun)]);
    secondAttemptStopRetryPass=second.status!==0&&`${second.stdout||''}\n${second.stderr||''}`.includes('RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY');
    need(secondAttemptStopRetryPass,'SECOND_ATTEMPT_STOP_RETRY_NOT_ENFORCED');

    const allowed=new Set([scratchRegistry.sourceOfTruth,...(scratchRegistry.projectionTargets||[]),state.authorizationBoundary?.authorizationRecordPath,state.authorizationBoundary?.activeRequestPath].filter(Boolean));
    const changedAfterAccept=repoChanges(scratch),unauthorized=changedAfterAccept.filter(p=>!allowed.has(p));
    authPublicationSurfacePass=changedAfterAccept.length>0&&unauthorized.length===0&&allowed.has(scratchRegistry.sourceOfTruth);
    need(authPublicationSurfacePass,`AUTH_PUBLICATION_SURFACE_NOT_CANONICAL:${JSON.stringify(unauthorized)}`);
    need(evidenceChanges(scratch).length===0,'AUTH_PUBLICATION_SURFACE_CONTAINS_TRANSIENT_EVIDENCE');
    git(scratch,['add','-A']);git(scratch,['commit','-m','selftest: accept one-shot in scratch']);

    state=json(scratch,P.ledger);
    const requestPath=state.authorizationBoundary?.activeRequestPath;
    const gateEnv={ORBIT360_F2_WORKFLOW_SOURCE_FILE:A(scratch,P.workflow),ORBIT360_REQUEST_FILE:requestPath,ORBIT360_EXPECTED_REQUEST_VERSION:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3',GITHUB_RUN_ID:String(runtimeRun)};
    const acceptedRequest=json(scratch,requestPath);
    runtimeRunIdBindingSimulationPass=Number(acceptedRequest.runtimeRunId)===runtimeRun&&Number(gateEnv.GITHUB_RUN_ID)===runtimeRun;
    need(runtimeRunIdBindingSimulationPass,'SCRATCH_RUNTIME_RUN_BINDING_SIMULATION_INVALID');

    const beforeRegister=snapshot(scratch,immutablePaths);
    const registerResult=runJson(scratch,P.register,[],gateEnv);
    runtimeRegisterReadOnlyPass=registerResult.result.status===0&&registerResult.json?.ok===true&&registerResult.json?.status==='F2_RUNTIME_REGISTER_READ_ONLY_VALIDATED_V4'&&registerResult.json?.registerMode==='READ_ONLY_VALIDATOR'&&registerResult.json?.persistentSourceChanged===false&&snapshotEqual(scratch,beforeRegister)&&repoChanges(scratch).length===0;
    need(runtimeRegisterReadOnlyPass,`SCRATCH_RUNTIME_REGISTER_NOT_READ_ONLY:${JSON.stringify(repoChanges(scratch))}`);

    const gateResult=run(scratch,P.gateRouter,[state.gateId],gateEnv);
    const gateEvidenceRel=`${EVIDENCE_DIR}/preflight-sanitizado.json`;
    const gateEvidence=fs.existsSync(A(scratch,gateEvidenceRel))?json(scratch,gateEvidenceRel):{};
    routerNativeRuntimeContractPass=gateResult.status===0&&gateEvidence.nativeRouterRuntimeContract===true&&gateEvidence.registerMode==='READ_ONLY_VALIDATOR'&&snapshotEqual(scratch,beforeRegister);
    need(routerNativeRuntimeContractPass,'SCRATCH_NATIVE_RUNTIME_ROUTER_CONTRACT_FAIL');
    preProviderGatePathPass=gateResult.status===0&&gateEvidence.ok===true&&gateEvidence.status==='GO_GATE_CONTRACT'&&gateEvidence.runtimeAttemptAccepted===true&&gateEvidence.executionAuthorized===true&&gateEvidence.secretAccessAuthorized===true&&gateEvidence.firestoreReadAuthorized===true&&gateEvidence.runtimeAuthorized===true&&gateEvidence.browserAuthorized===true&&gateEvidence.writeAuthorized===false&&gateEvidence.deployAuthorized===false&&gateEvidence.productionAuthorized===false;
    need(preProviderGatePathPass,'SCRATCH_PRE_PROVIDER_GATE_PATH_FAIL');
    git(scratch,['reset','--hard','HEAD']);
    runJson(scratch,P.evidenceLifecycle,['--phase','pre-auth']);
    need(evidenceChanges(scratch).length===0,'SCRATCH_GATE_EVIDENCE_CLEANUP_FAIL');

    state=json(scratch,P.ledger);
    const terminalRel=`${EVIDENCE_DIR}/f2-runtime-terminal-inline-${runtimeRun}.json`;
    fs.writeFileSync(A(scratch,terminalRel),JSON.stringify({
      schemaVersion:'orbit360-f2-terminal-v7-publication-aware',ok:false,status:'F2_PRODUCTIVE_ACCEPTANCE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:'PIPELINE_MECHANISM_FAILURE:SELFTEST_SYNTHETIC_PREPUBLICATION_FAILURE',error:'PIPELINE_MECHANISM_FAILURE:SELFTEST_SYNTHETIC_PREPUBLICATION_FAILURE',runId:runtimeRun,browserRunId:0,integrityRunId:0,request:requestPath,candidateArtifactId:Number(scratchCandidate.artifactId),runtimeAttemptAccepted:true,allowedExecutions:0,browserMatrixPass:false,integrityBeforeAfterPass:false,zeroCrossTenant:false,zeroUnexpectedWrites:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionHostingTouched:false,containsPII:false,containsSecrets:false
    },null,2)+'\n','utf8');
    requireSuccess(scratch,P.delegatedOwner,['--transition','F2_RUNTIME_TERMINAL_RECONCILE_GENERIC','--expected-revision',String(state.revision),'--expected-package-revision',String(state.productionReopeningPackage.revision),'--terminal-evidence',terminalRel],{},'SCRATCH_TERMINAL_REDUCER_FAIL');
    const reduced=json(scratch,P.ledger);
    scratchBehavioralTransitionsPass=reduced.activeState?.status==='F2_TERMINAL_RECONCILED_NO_REPLAY'&&reduced.authorizationBoundary?.activeRuntimeAuthorization===false&&reduced.authorizationBoundary?.activeRequestPath==null&&reduced.authorizationBoundary?.authorizationRecordPath==null&&reduced.activeState?.runtimeReplayAllowed===false&&reduced.nextAction?.id==='DIAGNOSE_ROOT_CAUSE_BEFORE_ANY_FRESH_AUTHORIZATION'&&Number(reduced.progress?.productionRouteProgressPct)===75;
    need(scratchBehavioralTransitionsPass,'SCRATCH_TERMINAL_REDUCER_STATE_INVALID');

    negativeRegressionSuitePass=workflowProviderUngatedNegativePass&&workflowCandidateHardcodeNegativePass&&workflowOperationalRevisionHardcodeNegativePass&&sourceRewriteMutationNegativePass&&secondAttemptStopRetryPass&&projectionImmutabilityPass&&authPublicationSurfacePass&&runtimeRunIdBindingSimulationPass&&runtimeRegisterReadOnlyPass&&routerNativeRuntimeContractPass;
    need(negativeRegressionSuitePass,'NEGATIVE_REGRESSION_SUITE_FAIL');
  }catch(error){need(false,`SCRATCH_BEHAVIORAL_SIMULATION_FAIL:${String(error?.message||error).slice(0,700)}`);}
  finally{
    try{execFileSync('git',['worktree','remove','--force',scratch],{cwd:ROOT,stdio:'ignore'});}catch{}
    try{fs.rmSync(scratch,{recursive:true,force:true});}catch{}
  }
}

const out={
  schemaVersion:'orbit360-control-plane-selftest-v13-native-runtime-router-readonly-register',
  ok:false,
  status:'CONTROL_PLANE_SELFTEST_FAIL',
  classification:'PIPELINE_MECHANISM_FAILURE',
  failures:[],
  expectedLedgerRevision:expectedLedger,
  expectedPackageRevision:expectedPackage,
  candidateBindingDynamic,
  semanticPreflightPass,
  exactF2SourcePathExecuted:sourcePathExecuted,
  classWidePreAuthEvidenceLifecyclePass:classWidePreAuthPass,
  classWidePreTerminalEvidenceLifecyclePass:classWideTerminalPass,
  arbitraryFutureFilenameCleanupPass:arbitraryFilenamePass,
  scratchBehavioralTransitionsPass,
  preProviderGatePathPass,
  projectionImmutabilityPass,
  remoteCASReadbackPass,
  secondAttemptStopRetryPass,
  workflowProviderUngatedNegativePass,
  workflowCandidateHardcodeNegativePass,
  workflowOperationalRevisionHardcodeNegativePass,
  sourceRewriteMutationNegativePass,
  authPublicationSurfacePass,
  runtimeRunIdBindingSimulationPass,
  runtimeRegisterReadOnlyPass,
  routerNativeRuntimeContractPass,
  negativeRegressionSuitePass,
  validatorMode:'MACHINE_READABLE_CONTRACT_PLUS_BEHAVIORAL_EXECUTION',
  sourceShapeValidationUsed:false,
  durableHandshakeMustBePublishedByCanonicalWorkflow:true,
  prepublicationFailureMustBeCanonicallyReduced:true,
  canonicalOwner:'tools/orbit360-continuity-transition-owner-v20260824.mjs',
  authorizationMaterialized:false,
  requestMaterialized:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
for(const field of Array.isArray(semanticContract.selftestRequiredTrueFields)?semanticContract.selftestRequiredTrueFields:[]){
  if(out[field]!==true)failures.push(`SEMANTIC_REQUIRED_SELFTEST_FIELD_NOT_TRUE:${field}`);
}
out.failures=[...new Set(failures)];
out.ok=out.failures.length===0;
out.status=out.ok?'CONTROL_PLANE_SELFTEST_PASS':'CONTROL_PLANE_SELFTEST_FAIL';
out.classification=out.ok?'PASS':'PIPELINE_MECHANISM_FAILURE';
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);