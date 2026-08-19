#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateF2StableBoundary, selfTestF2StableBoundary } from './orbit360-f2-stable-boundary-contract-v20260819.mjs';

const ROOT=process.cwd(),GATE='f2-productive-acceptance-exact-successor-v20260818',gateArg=String(process.argv[2]||'').trim();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const SOURCE_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json',RUNTIME_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',RUNTIME_WORKFLOW='.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml',RUNTIME_EXECUTOR='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs',CANDIDATE_VALIDATOR='tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',STABLE_BOUNDARY='tools/orbit360-f2-stable-boundary-contract-v20260819.mjs',LIVE='orbit360-platform/docs/orbit360-live-state-v1.json',INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',F1D='tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-f1-4d-v20260818.json';
const EXPECT={artifactId:9385306424,sourceHead:'b94b2ae86d26586a68d33be9edba8715e956b02e',zipSha256:'81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4',manifestSha256:'cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef',manifestStatus:'FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED',fileCount:194,requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1'};
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,'')),text=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8'),need=(ok,code)=>{if(!ok)throw new Error(code);};
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));}
function guards(o){return Number(o?.candidateArtifactId)===EXPECT.artifactId&&o?.candidateSourceHead===EXPECT.sourceHead&&o?.candidateZipSha256===EXPECT.zipSha256&&o?.candidateManifestSha256===EXPECT.manifestSha256&&o?.candidateManifestStatus===EXPECT.manifestStatus&&Number(o?.candidateFileCount)===EXPECT.fileCount;}

try{
  need(gateArg===GATE,'PIPELINE_MECHANISM_FAILURE:F2_GATE_ID_MISMATCH');
  for(const rel of [SOURCE_LIFECYCLE,RUNTIME_LIFECYCLE,RUNTIME_WORKFLOW,RUNTIME_EXECUTOR,CANDIDATE_VALIDATOR,STABLE_BOUNDARY,LIVE,INDEX,F1D]) need(fs.existsSync(path.join(ROOT,rel)),`PIPELINE_MECHANISM_FAILURE:F2_OWNER_MISSING:${rel}`);
  const source=readJson(SOURCE_LIFECYCLE),runtime=readJson(RUNTIME_LIFECYCLE),live=readJson(LIVE),index=readJson(INDEX),f1d=readJson(F1D);
  need(source.gateId===GATE&&source.currentPhase==='F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY','VALIDATOR_STALE:F2_SOURCE_LIFECYCLE_INVALID');
  need(runtime.gateId===GATE&&runtime.currentPhase==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY','VALIDATOR_STALE:F2_RUNTIME_LIFECYCLE_INVALID');
  need(guards(source.guards)&&guards(runtime.guards),'VALIDATOR_STALE:F2_CANDIDATE_GUARDS_INVALID');
  need(f1d.status==='F1_4D_CONSUMED_PASS'&&f1d.executionResult?.ok===true&&f1d.authorization?.allowedExecutions===0&&f1d.authorization?.consumed===true,'DATA_CONTRACT_FAILURE:F2_F1_4D_NOT_CLOSED');

  const boundary=evaluateF2StableBoundary({live,index,gateId:GATE,artifactId:EXPECT.artifactId,requestVersion:EXPECT.requestVersion});
  const boundarySelfTest=selfTestF2StableBoundary({live,index,gateId:GATE,artifactId:EXPECT.artifactId,requestVersion:EXPECT.requestVersion});
  need(boundary.ok===true,'VALIDATOR_STALE:F2_STABLE_BOUNDARY_CONTRACT_FAILED');
  need(boundarySelfTest.ok===true,'VALIDATOR_STALE:F2_STABLE_BOUNDARY_SELFTEST_FAILED');
  need(text(LIVE).includes(String(EXPECT.artifactId)),'DATA_CONTRACT_FAILURE:F2_LIVE_STATE_CANDIDATE_MISMATCH');

  const wf=text(RUNTIME_WORKFLOW),exec=text(RUNTIME_EXECUTOR),cv=text(CANDIDATE_VALIDATOR);
  for(const token of ['Mandatory canonical F2 gate before artifact or provider/browser','Download and fully verify exact F2 candidate after GO','Bind provider after F2 GO','Execute F2 complete browser acceptance']) need(wf.includes(token),`VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_BOUNDARY_MISSING:${token}`);
  for(const token of ["['desktopDirection','Dirección'","['tabletOperativo','Operativo'","['mobileAsesor','Asesor'",'cliente360','aseguradoras','ops','leads','polizas','cobros','orbit-policy-fullpage','orbit-vehicle-fullpage','recibosEsperados','crossTenantDenied','serviceWorker','integrityBeforeAfter']) need(exec.includes(token),`VALIDATOR_STALE:F2_RUNTIME_EXECUTOR_MATRIX_MISSING:${token}`);
  need(cv.includes('F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS')&&cv.includes('fullRehashPass:true'),'VALIDATOR_STALE:F2_CANDIDATE_SOURCE_VALIDATOR_INVALID');

  need(wf.includes('orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'),'VALIDATOR_STALE:F2_RUNTIME_KNOWN_ROOTFIX_SELFTEST_NOT_BOUND');
  need(exec.includes("from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs'")&&exec.includes('validateProbeDocumentPath(PROBE_DOCUMENT_PATH)')&&!exec.includes('__orbit360_f2_cross_tenant_probe__'),'VALIDATOR_STALE:F2_FULL_RUNTIME_CROSS_TENANT_PROBE_CONTRACT_NOT_BOUND');

  const expectedRequest=String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION'),runtimeMode=expectedRequest!=='NONE_PENDING_FRESH_AUTHORIZATION';
  const boundaryEvidence={stableBoundaryContract:true,sourceClosed:boundary.sourceClosed,sourceRebindPending:boundary.sourceRebindPending,sourceBoundaryAccepted:boundary.sourceBoundaryAccepted,runtimeBoundaryMode:boundary.runtimeMode,phaseStillF2:boundary.phaseStillF2,nextActionBound:boundary.nextActionBound,indexBoundaryCurrent:boundary.indexBound,narrativeStatusesAuthoritative:false,narrativeAttemptStatusMutationPass:boundarySelfTest.provesNarrativeAttemptStatusIsNonAuthoritative};

  if(!runtimeMode){
    need(source.authorization?.activeRequest===false&&source.authorization?.allowedExecutions===0,'SECURITY_FAILURE:F2_SOURCE_AUTHORIZATION_NOT_CLOSED');
    write({schemaVersion:'orbit360-f2-gate-contract-preflight-v1',ok:true,status:'PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE',classification:'PASS',gateId:GATE,contractVersion:'2.1.0',validatorRootfix:'F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3',sourceOnly:true,candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,candidateZipSha256:EXPECT.zipSha256,candidateManifestSha256:EXPECT.manifestSha256,candidateManifestStatus:EXPECT.manifestStatus,candidateFileCount:EXPECT.fileCount,f1Closed:true,f1_4dConsumedPass:true,...boundaryEvidence,exactCandidateBound:true,surfaceTopologyBound:true,runtimeWorkflowPrepared:true,authorizationRequiredForRuntime:true,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,customTokenMintAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,membershipWriteAuthorized:false,dataWriteAuthorized:false,packageRebuildAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
    process.exit(0);
  }

  need(expectedRequest===EXPECT.requestVersion,'SECURITY_FAILURE:F2_REQUEST_VERSION_INVALID');
  const requestRel=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
  need(/^\.github\/orbit360-requests\/f2-productive-acceptance-runtime-browser-readonly-runbound-[^/]+\.json$/.test(requestRel),'SECURITY_FAILURE:F2_REQUEST_PATH_INVALID');
  const request=readJson(requestRel);
  need(request.requestVersion===EXPECT.requestVersion&&request.status==='AUTHORIZED_ONCE'&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false,'SECURITY_FAILURE:F2_REQUEST_NOT_ACTIVE');
  need(Number(request.candidateArtifactId)===EXPECT.artifactId&&request.candidateSourceHead===EXPECT.sourceHead&&request.candidateZipSha256===EXPECT.zipSha256&&request.candidateManifestSha256===EXPECT.manifestSha256,'SECURITY_FAILURE:F2_REQUEST_CANDIDATE_MISMATCH');
  need(request.scope?.runtime===true&&request.scope?.browser===true&&request.scope?.firestoreRead===true&&request.scope?.secrets===true,'SECURITY_FAILURE:F2_REQUEST_READ_CAPABILITIES_MISSING');
  need(request.scope?.writes===false&&request.scope?.authWrites===false&&request.scope?.membershipWrites===false&&request.scope?.dataWrites===false&&request.scope?.deploy===false&&request.scope?.publication===false&&request.scope?.productionMutation===false,'SECURITY_FAILURE:F2_REQUEST_EXCESS_CAPABILITY');

  write({schemaVersion:'orbit360-f2-gate-contract-preflight-v1',ok:true,status:'GO_GATE_CONTRACT',classification:'GO_F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',gateId:GATE,contractVersion:'2.1.0',validatorRootfix:'F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3',sourceOnly:false,candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,candidateZipSha256:EXPECT.zipSha256,candidateManifestSha256:EXPECT.manifestSha256,candidateManifestStatus:EXPECT.manifestStatus,candidateFileCount:EXPECT.fileCount,...boundaryEvidence,exactCandidateBound:true,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,customTokenMintAuthorized:true,runtimeAuthorized:true,browserAuthorized:true,writeAuthorized:false,authWriteAuthorized:false,membershipWriteAuthorized:false,dataWriteAuthorized:false,packageRebuildAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}catch(error){
  write({schemaVersion:'orbit360-f2-gate-contract-preflight-v1',ok:false,status:'VALIDATOR_STALE',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',gateId:GATE,contractVersion:'2.1.0',validatorRootfix:'F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3',error:String(error?.message||error).slice(0,900),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,writeAuthorized:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
  process.exitCode=41;
}
