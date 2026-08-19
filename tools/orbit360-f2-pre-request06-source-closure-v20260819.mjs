#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assemblePostdeployEvidence,POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,POSTDEPLOY_ARTIFACT_DIGEST} from './orbit360-f2-postdeploy-evidence-contract-v20260819.mjs';

const ROOT=process.cwd();
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const RUN_ID=32272580947, RUN_ARTIFACT_ID=9372746151, CANDIDATE=9345207863;
const OUT={
  selftest:'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json',
  composite:'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-composite-evidence-v20260819.json',
  rootfix:'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-cross-tenant-validator-stale-rootfix-source-only-v20260819.json',
  postsync:'orbit360-platform/runtime-gate-crm-v20260716/f2-pre-request06-postsync-source-only-v20260819.json',
  preflight:'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json'
};
const arg=n=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:'';};
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
const write=(p,v)=>{const q=path.resolve(ROOT,p);fs.mkdirSync(path.dirname(q),{recursive:true});fs.writeFileSync(q,JSON.stringify(v,null,2)+'\n','utf8');};
const run=(file,args=[],env={})=>execFileSync(process.execPath,[file,...args],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,...env},maxBuffer:16*1024*1024});

try{
  const terminalPath=arg('--terminal'),probePath=arg('--probe'),integrityPath=arg('--integrity');
  need(terminalPath&&probePath&&integrityPath,'PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_ARTIFACT_PATHS_REQUIRED');
  need(!fs.existsSync(path.join(ROOT,'.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-06.json')),'DATA_CONTRACT_FAILURE:REQUEST06_ALREADY_EXISTS');

  const request=read('.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json');
  need(request.status==='CONSUMED_PASS'&&request.consumed===true&&request.allowedExecutions===0&&request.replayAllowed===false,'DATA_CONTRACT_FAILURE:POSTDEPLOY_REQUEST_NOT_CONSUMED_PASS');
  need(Number(request.terminal?.runId)===RUN_ID&&request.terminal?.crossTenantDenied===true&&request.terminal?.integrityBeforeAfterPass===true,'DATA_CONTRACT_FAILURE:POSTDEPLOY_REQUEST_TERMINAL_MISMATCH');

  // Apply the rootfix to the actual full-runtime owners in the checked-out tree.
  const patchOut=run('tools/orbit360-f2-full-runtime-cross-tenant-rootfix-v20260819.mjs');
  need(patchOut.includes('F2_FULL_RUNTIME_CROSS_TENANT_VALIDATOR_STALE_ROOTFIX_APPLIED'),'PIPELINE_MECHANISM_FAILURE:FULL_RUNTIME_ROOTFIX_DID_NOT_APPLY');

  // Independently re-audit every blocker that previously consumed an F2 iteration.
  run('tools/orbit360-test-f2-postdeploy-evidence-contract-v20260819.mjs');
  run('tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',[],{ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE:OUT.selftest});
  const selftest=read(OUT.selftest);
  need(selftest.ok===true&&selftest.status==='F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS','VALIDATOR_STALE:KNOWN_ROOTFIX_SOURCE_AUDIT_NOT_PASS');
  need(selftest.crossTenant?.reservedIdAbsent===true&&selftest.crossTenant?.sharedContractBound===true,'VALIDATOR_STALE:CROSS_TENANT_SHARED_CONTRACT_NOT_BOUND');
  need(selftest.roleView?.superAdminResolvesDirection===true&&selftest.roleView?.adminTenantRejectedForDirection===true,'VALIDATOR_STALE:ROLE_VIEW_ROOTFIX_NOT_PROVEN');
  need(selftest.legalGate?.detachQuietWindowRootfixBound===true,'VALIDATOR_STALE:LEGAL_ROOTFIX_NOT_PROVEN');
  need(selftest.requestLifecycle?.dynamicRunbound===true&&selftest.requestLifecycle?.ordinalCoupling===false,'VALIDATOR_STALE:DYNAMIC_REQUEST_LIFECYCLE_NOT_PROVEN');
  need(selftest.pwa?.buildsMatch===true&&selftest.auth?.passwordSignInProviderPresent===true,'VALIDATOR_STALE:FROZEN_SUCCESSOR_AUTH_OR_PWA_CONTRACT_NOT_PROVEN');
  need(selftest.runtimeWorkflow?.deployCommandPresent===false&&selftest.request06Created===false,'SECURITY_FAILURE:RUNTIME_WORKFLOW_SCOPE_NOT_READONLY');

  // Compose evidence only from the three real producers inside the immutable PASS artifact.
  const composite={...assemblePostdeployEvidence({terminal:read(terminalPath),probe:read(probePath),integrity:read(integrityPath)}),generatedAt:new Date().toISOString()};
  need(composite.evidenceContractVersion===POSTDEPLOY_EVIDENCE_CONTRACT_VERSION&&composite.runId===RUN_ID&&composite.artifactId===RUN_ARTIFACT_ID&&composite.artifactDigest===POSTDEPLOY_ARTIFACT_DIGEST&&composite.candidateArtifactId===CANDIDATE,'PIPELINE_MECHANISM_FAILURE:COMPOSITE_EVIDENCE_BOUNDARY_MISMATCH');
  write(OUT.composite,composite);

  // Synchronize the living state from validated evidence, then run the canonical gate after sync.
  const docs=run('tools/orbit360-f2-pre-request06-docsync-v2-20260819.mjs',['--composite',OUT.composite]);
  need(docs.includes('F2_PRE_REQUEST06_DOCSYNC_V2_PREPARED'),'PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_DOCSYNC_NOT_PREPARED');
  try{fs.rmSync(path.join(ROOT,OUT.preflight),{force:true});}catch{}
  const gateOut=run('tools/orbit360-validar-gate-contracts-v20260717.mjs',[GATE],{ORBIT360_REQUEST_FILE:'',ORBIT360_EXPECTED_REQUEST_VERSION:''});
  need(gateOut.includes('PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE'),'DATA_CONTRACT_FAILURE:PRE_REQUEST06_CANONICAL_GATE_NOT_PASS');
  const preflight=read(OUT.preflight);
  need(preflight.ok===true&&preflight.status==='PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE','DATA_CONTRACT_FAILURE:PRE_REQUEST06_PREFLIGHT_NOT_PASS');
  need(preflight.stableBoundaryContract===true&&preflight.sourceClosed===true&&preflight.phaseStillF2===true&&preflight.nextActionBound===true&&preflight.indexBoundaryCurrent===true,'DATA_CONTRACT_FAILURE:PRE_REQUEST06_STABLE_BOUNDARY_NOT_PASS');
  for(const k of ['executionAuthorized','secretAccessAuthorized','firestoreReadAuthorized','browserAuthorized','deployAuthorized','productionAuthorized']) need(preflight[k]===false,`SECURITY_FAILURE:PRE_REQUEST06_UNEXPECTED_AUTHORIZATION:${k}`);

  const now=new Date().toISOString();
  write(OUT.rootfix,{schemaVersion:'orbit360-f2-pre-request06-source-closure-v1',ok:true,status:'F2_PRE_REQUEST06_KNOWN_ROOTFIXES_SOURCE_ONLY_PASS',classification:'PASS',sourceGateMarker:'PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE',rootCauseClosed:{classification:'VALIDATOR_STALE',code:'F2_FULL_RUNTIME_CROSS_TENANT_PROBE_STILL_USES_RESERVED_INVALID_DOCUMENT_ID_AFTER_RULES01_VALID_PATH_ROOTFIX',sharedContract:'F2_CROSS_TENANT_PROBE_VALID_PATH_V2'},pipelineRootCausesClosed:[{classification:'PIPELINE_MECHANISM_FAILURE',code:'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD'},{classification:'PIPELINE_MECHANISM_FAILURE',code:'POSTDEPLOY_CLOSURE_INFERRED_ARTIFACT_SCHEMA_INSTEAD_OF_PRODUCER_CONTRACT'},{classification:'PIPELINE_MECHANISM_FAILURE',code:'NEW_WORKFLOW_SELF_CREATION_DID_NOT_ESTABLISH_PUSH_TRIGGER'}],evidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,postdeployProof:{runId:RUN_ID,artifactId:RUN_ARTIFACT_ID,httpStatus:403,errorStatus:'PERMISSION_DENIED',crossTenantDenied:true,integrityBeforeAfterPass:true,replayed:false,rulesRedeployed:false},auditedKnownContracts:['authentication_product_browser_provider','legal_detach_quiet_window','role_view_direction_superadmin','actual_route_topology','cross_tenant_valid_path_v2','dynamic_runbound_lifecycle','pwa_service_worker_build_parity','exact_artifact_binding','zero_deploy_runtime_workflow'],request06Created:false,request06Authorized:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,rulesDeploy:false,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,mainMerge:false,containsPII:false,containsSecrets:false,generatedAt:now});
  write(OUT.postsync,{schemaVersion:'orbit360-f2-pre-request06-postsync-source-only-v1',ok:true,status:'F2_PRE_REQUEST06_POSTSYNC_CANONICAL_GATE_PASS',classification:'SOURCE_CONTRACT_PASS',gateMarker:'PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE',evidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,knownRootfixAuditPass:true,boundary:{requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1',requestOrdinal:6,request06Created:false,request06Authorized:false,candidateArtifactId:CANDIDATE,successorPublished:false,productionOperationalDeclared:false},scope:{browser:false,runtime:false,secrets:false,firestoreRead:false,writes:0,rulesDeploy:false,hosting:false,functions:false,rebuild:false,publication:false,production:false},containsPII:false,containsSecrets:false,generatedAt:now});

  // Retire only the superseded failed closure mechanisms, never the proven workflow vehicle.
  for(const p of [
    'tools/orbit360-f2-rules01-postdeploy-pass-docsync-v20260819.mjs',
    'orbit360-platform/tools/orbit360-f2-rules01-postdeploy-pass-docsync-v20260819.mjs',
    '.github/workflows/orbit360-f2-rules01-postdeploy-pass-docsync-source-only-v20260819.yml',
    '.github/workflows/orbit360-f2-pre-request06-known-rootfixes-source-only-v20260819.yml',
    '.github/workflows/orbit360-f2-pre-request06-known-rootfixes-source-only-v2-20260819.yml',
    '.github/workflows/orbit360-f2-pre-request06-producer-contract-source-only-v3-20260819.yml',
    '.github/orbit360-observers/f2-pre-request06-producer-contract-source-only-v3-trigger-v20260819.json'
  ]){try{fs.rmSync(path.join(ROOT,p),{force:true});}catch{}}

  console.log(JSON.stringify({ok:true,status:'F2_PRE_REQUEST06_SOURCE_CLOSURE_PASS',gateMarker:'PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE',knownRootfixAuditPass:true,evidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,request06Created:false,successorPublished:false,writes:0},null,2));
}catch(error){
  console.error(String(error?.message||error));
  process.exitCode=41;
}
