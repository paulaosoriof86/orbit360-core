#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OLD = Object.freeze({
  artifactId: 9345207863,
  sourceHead: '29caae94a3db1f1626bdde2ea6ee9a21799f9df6',
  zipSha256: '493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac',
  manifestSha256: '29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761',
  manifestStatus: 'FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED',
  zipName: 'orbit360-fase-a-product-f1-4c-successor-29caae94a3db.zip'
});
const NEXT = Object.freeze({
  artifactId: 9385306424,
  evidenceArtifactId: 9385307587,
  sourceHead: 'b94b2ae86d26586a68d33be9edba8715e956b02e',
  zipSha256: '81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4',
  manifestSha256: 'cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef',
  manifestStatus: 'FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED',
  zipName: 'orbit360-fase-a-product-f2-request06-rootfix-successor-b94b2ae86d26.zip',
  fileCount: 194,
  deltaCount: 1,
  deltaPaths: ['core/queries.js'],
  buildRunId: 32307750282,
  buildSourceRequest: '78d73bb0d93a1fee463d0676455143f358d4262c'
});
const GATE = 'f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION = 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const CONTRACT_VERSION = '2.1.0';
const VALIDATOR_REVISION = 'f2-productive-acceptance-exact-successor-rebind-v2-20260819';
const ROUTER_VERSION = 'v10.6-f2-successor-rebind-source-pending';
const ROOTFIX = 'F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3';
const UPDATED_AT = '2026-08-19T22:35:00.000Z';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
const write = (rel, content) => { const abs=path.join(ROOT,rel); fs.mkdirSync(path.dirname(abs),{recursive:true}); fs.writeFileSync(abs,content,'utf8'); };
const json = rel => JSON.parse(read(rel));
const writeJson = (rel, value) => write(rel, JSON.stringify(value,null,2)+'\n');
const need = (ok, code) => { if (!ok) throw new Error(code); };
const replaceOnce = (text, from, to, code) => { const n=text.split(from).length-1; need(n===1,`${code}:${n}`); return text.replace(from,to); };
const replaceAllRequired = (text, from, to, minCount, code) => { const n=text.split(String(from)).length-1; need(n>=minCount,`${code}:${n}`); return text.split(String(from)).join(String(to)); };

const sourceOldPath='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260818.json';
const runtimeOldPath='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260818.json';
const engineOldPath='tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260818.mjs';
const stableOldPath='tools/orbit360-f2-stable-boundary-contract-v20260818.mjs';
const candidateOldPath='tools/orbit360-f2-exact-candidate-source-validator-v20260818.mjs';
const registerOldPath='tools/orbit360-register-f2-productive-acceptance-runtime-v20260818.mjs';
const sourceNewPath='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json';
const runtimeNewPath='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const engineNewPath='tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs';
const stableNewPath='tools/orbit360-f2-stable-boundary-contract-v20260819.mjs';
const candidateNewPath='tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs';
const registerNewPath='tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs';
const routerPath='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const runtimeWorkflowPath='.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml';
const registryPath='tools/orbit360-gate-contract-registry-v20260717.json';
const livePath='orbit360-platform/docs/orbit360-live-state-v1.json';
const indexPath='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';

// Preconditions: historical owner remains exactly bound to Request06 predecessor.
const sourceOld=json(sourceOldPath), runtimeOld=json(runtimeOldPath);
for (const o of [sourceOld.guards,runtimeOld.guards]) {
  need(Number(o?.candidateArtifactId)===OLD.artifactId,'VALIDATOR_STALE_REBIND_PRECONDITION_ARTIFACT');
  need(o?.candidateSourceHead===OLD.sourceHead,'VALIDATOR_STALE_REBIND_PRECONDITION_SOURCE');
  need(o?.candidateZipSha256===OLD.zipSha256,'VALIDATOR_STALE_REBIND_PRECONDITION_ZIP');
  need(o?.candidateManifestSha256===OLD.manifestSha256,'VALIDATOR_STALE_REBIND_PRECONDITION_MANIFEST');
}

const nextGuards = base => ({
  ...base,
  candidateArtifactId:NEXT.artifactId,
  candidateZipSha256:NEXT.zipSha256,
  candidateManifestSha256:NEXT.manifestSha256,
  candidateSourceHead:NEXT.sourceHead,
  candidateManifestStatus:NEXT.manifestStatus,
  candidateFileCount:NEXT.fileCount,
  predecessorArtifactId:OLD.artifactId,
  sourceOnlyClosedRequiredForRuntime:true
});

const sourceNew={
  ...sourceOld,
  gateContractVersion:CONTRACT_VERSION,
  validatorLifecycleRevision:'phase-capability-contract-v2-source-rebind',
  f2ValidatorRevision:VALIDATOR_REVISION,
  status:'F2_SOURCE_ONLY_REBIND_PENDING',
  currentPhase:'F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY',
  authorization:{...sourceOld.authorization,activeRequest:false,allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false},
  guards:nextGuards(sourceOld.guards),
  sourceOnlyResult:{
    ok:false,
    status:'PENDING_REBIND_SOURCE_ONLY',
    classification:'VALIDATOR_STALE',
    rootCause:'F2_GATE_OWNERS_PINNED_PREDECESSOR_AFTER_REQUEST06_FUNCTIONAL_ROOTFIX',
    predecessorArtifactId:OLD.artifactId,
    candidateArtifactId:NEXT.artifactId,
    candidateSourceHead:NEXT.sourceHead,
    candidateZipSha256:NEXT.zipSha256,
    candidateManifestSha256:NEXT.manifestSha256,
    candidateManifestStatus:NEXT.manifestStatus,
    candidateFileCount:NEXT.fileCount,
    canonicalRouterRegistered:true,
    fullRehashPass:false,
    runtimeWorkflowPrepared:true,
    requestCreated:false,
    runtimeExecuted:false,
    browserExecuted:false,
    secretAccess:false,
    dataAccess:false,
    writes:0,
    deployExecuted:false,
    publicationExecuted:false,
    productionTouched:false
  }
};
const runtimeNew={
  ...runtimeOld,
  gateContractVersion:CONTRACT_VERSION,
  validatorLifecycleRevision:'phase-capability-contract-v2-source-rebind',
  f2ValidatorRevision:VALIDATOR_REVISION,
  status:'F2_RUNTIME_BLOCKED_PENDING_SOURCE_REBIND',
  authorization:{...runtimeOld.authorization,activeRequest:false,allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false},
  guards:nextGuards(runtimeOld.guards)
};
writeJson(sourceNewPath,sourceNew); writeJson(runtimeNewPath,runtimeNew);

const stable = `#!/usr/bin/env node\n'use strict';\n\nconst REQUEST_VERSION='${REQUEST_VERSION}';\nfunction runtimeMode(){return String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION')!=='NONE_PENDING_FRESH_AUTHORIZATION';}\nexport function evaluateF2StableBoundary({ live, index, gateId, artifactId, requestVersion }) {\n  const runtime=runtimeMode();\n  const liveStatus=String(live?.f2SourceOnly?.status||'');\n  const indexStatus=String(index?.operationalCurrent?.f2SourceOnlyStatus||'');\n  const sourceClosed=liveStatus==='CLOSED_PASS'&&indexStatus==='CLOSED_PASS';\n  const sourceRebindPending=liveStatus==='PENDING_REBIND_SOURCE_ONLY'&&indexStatus==='PENDING_REBIND_SOURCE_ONLY';\n  const sourceBoundaryAccepted=(runtime?sourceClosed:(sourceClosed||sourceRebindPending))&&live?.f2SourceOnly?.gateId===gateId&&Number(live?.f2SourceOnly?.candidateArtifactId)===Number(artifactId);\n  const phaseStillF2=live?.frozenPlan?.currentPhase==='F2'&&Array.isArray(live?.frozenPlan?.goLiveRoute?.remainingPhases)&&live.frozenPlan.goLiveRoute.remainingPhases.includes('F2');\n  const nextActionBound=live?.nextActionExact?.gateId===gateId&&live?.nextActionExact?.requestVersion===requestVersion&&Number(live?.nextActionExact?.candidateArtifactId)===Number(artifactId);\n  const indexBound=Number(index?.operationalCurrent?.successorCandidateArtifactId)===Number(artifactId)&&index?.operationalCurrent?.f2SourceOnlyGateId===gateId&&String(index?.operationalCurrent?.nextAuthorizationBoundary||'').includes(requestVersion)&&String(index?.operationalCurrent?.nextAuthorizationBoundary||'').includes(String(artifactId))&&(runtime?indexStatus==='CLOSED_PASS':['PENDING_REBIND_SOURCE_ONLY','CLOSED_PASS'].includes(indexStatus));\n  const stable=sourceBoundaryAccepted&&phaseStillF2&&nextActionBound&&indexBound;\n  return {ok:stable,sourceClosed,sourceRebindPending,sourceBoundaryAccepted,runtimeMode:runtime,phaseStillF2,nextActionBound,indexBound,narrativeAuthorizationStatusObserved:String(live?.authorization?.f2AuthorizationStatus||''),narrativeGoLiveStatusObserved:String(live?.goLive?.status||''),narrativeStatusesAuthoritative:false};\n}\nexport function selfTestF2StableBoundary(args){const baseline=evaluateF2StableBoundary(args);const mutated=structuredClone(args.live);mutated.authorization={...(mutated.authorization||{}),f2AuthorizationStatus:'ARBITRARY_ATTEMPT_STATUS_MUST_NOT_INVALIDATE_F2_BOUNDARY'};mutated.goLive={...(mutated.goLive||{}),status:'ARBITRARY_F2_ATTEMPT_NARRATIVE_STATUS'};mutated.phase='ARBITRARY_F2_NARRATIVE_PHASE_LABEL';const narrativeMutation=evaluateF2StableBoundary({...args,live:mutated});return {ok:baseline.ok===true&&narrativeMutation.ok===true,baseline,narrativeMutation,provesNarrativeAttemptStatusIsNonAuthoritative:baseline.ok===true&&narrativeMutation.ok===true};}\nexport const F2_STABLE_BOUNDARY_REVISION='${ROOTFIX}';\nexport const F2_REQUEST_VERSION=REQUEST_VERSION;\n`;
write(stableNewPath,stable);

let engine=read(engineOldPath);
engine=replaceOnce(engine,"./orbit360-f2-stable-boundary-contract-v20260818.mjs","./orbit360-f2-stable-boundary-contract-v20260819.mjs",'ENGINE_STABLE_PATH_COUNT');
engine=replaceAllRequired(engine,sourceOldPath,sourceNewPath,1,'ENGINE_SOURCE_PATH_COUNT');
engine=replaceAllRequired(engine,runtimeOldPath,runtimeNewPath,1,'ENGINE_RUNTIME_PATH_COUNT');
engine=replaceAllRequired(engine,candidateOldPath,candidateNewPath,1,'ENGINE_CANDIDATE_PATH_COUNT');
engine=replaceAllRequired(engine,stableOldPath,stableNewPath,1,'ENGINE_STABLE_OWNER_COUNT');
engine=replaceOnce(engine,"const EXPECT={artifactId:9345207863,sourceHead:'29caae94a3db1f1626bdde2ea6ee9a21799f9df6',zipSha256:'493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac',manifestSha256:'29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761',manifestStatus:'FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED',fileCount:194,requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1'};",`const EXPECT={artifactId:${NEXT.artifactId},sourceHead:'${NEXT.sourceHead}',zipSha256:'${NEXT.zipSha256}',manifestSha256:'${NEXT.manifestSha256}',manifestStatus:'${NEXT.manifestStatus}',fileCount:${NEXT.fileCount},requestVersion:'${REQUEST_VERSION}'};`,'ENGINE_EXPECT_COUNT');
engine=replaceAllRequired(engine,"contractVersion:'2.0.0'",`contractVersion:'${CONTRACT_VERSION}'`,2,'ENGINE_CONTRACT_VERSION_COUNT');
engine=replaceAllRequired(engine,"validatorRootfix:'F2_STABLE_BOUNDARY_CONTRACT_V2'",`validatorRootfix:'${ROOTFIX}'`,2,'ENGINE_ROOTFIX_COUNT');
engine=replaceOnce(engine,'const boundaryEvidence={stableBoundaryContract:true,sourceClosed:boundary.sourceClosed,phaseStillF2:boundary.phaseStillF2,nextActionBound:boundary.nextActionBound,indexBoundaryCurrent:boundary.indexBound,narrativeStatusesAuthoritative:false,narrativeAttemptStatusMutationPass:boundarySelfTest.provesNarrativeAttemptStatusIsNonAuthoritative};','const boundaryEvidence={stableBoundaryContract:true,sourceClosed:boundary.sourceClosed,sourceRebindPending:boundary.sourceRebindPending,sourceBoundaryAccepted:boundary.sourceBoundaryAccepted,runtimeBoundaryMode:boundary.runtimeMode,phaseStillF2:boundary.phaseStillF2,nextActionBound:boundary.nextActionBound,indexBoundaryCurrent:boundary.indexBound,narrativeStatusesAuthoritative:false,narrativeAttemptStatusMutationPass:boundarySelfTest.provesNarrativeAttemptStatusIsNonAuthoritative};','ENGINE_BOUNDARY_EVIDENCE_COUNT');
write(engineNewPath,engine);

let candidate=read(candidateOldPath);
candidate=replaceOnce(candidate,"const EXPECT={artifactId:9345207863,sourceHead:'29caae94a3db1f1626bdde2ea6ee9a21799f9df6',zipSha256:'493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac',manifestSha256:'29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761',status:'FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED',fileCount:194};",`const EXPECT={artifactId:${NEXT.artifactId},sourceHead:'${NEXT.sourceHead}',zipSha256:'${NEXT.zipSha256}',manifestSha256:'${NEXT.manifestSha256}',status:'${NEXT.manifestStatus}',fileCount:${NEXT.fileCount}};`,'CANDIDATE_EXPECT_COUNT');
candidate=replaceOnce(candidate,"  'core/router.js','core/router-tenant-config-product-bootstrap-p0.js','core/legal.js','core/pwa.js','core/access-scope.js',","  'core/router.js','core/router-tenant-config-product-bootstrap-p0.js','core/legal.js','core/pwa.js','core/access-scope.js','core/queries.js',",'CANDIDATE_QUERIES_REQUIRED_COUNT');
candidate=replaceOnce(candidate,"  const store=read('data/store-firestore-product-readonly-p0.js');\n  need(store.includes(\"writeEnabled: false\")&&store.includes(\"noFallback: true\")&&store.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'SECURITY_FAILURE:F2_READONLY_STORE_GUARD_INVALID');",`  const store=read('data/store-firestore-product-readonly-p0.js');\n  need(store.includes(\"writeEnabled: false\")&&store.includes(\"noFallback: true\")&&store.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'SECURITY_FAILURE:F2_READONLY_STORE_GUARD_INVALID');\n  const queries=read('core/queries.js');\n  for(const token of ['metaDisponible','Number.isFinite(metaPrima)','Number.isFinite(rawPct)','metaPrima: metaDisponible ? metaPrima : 0']) need(queries.includes(token),\`FUNCTIONAL_DEFECT:F2_INICIO_FINITE_ROOTFIX_TOKEN_MISSING:\${token}\`);`,'CANDIDATE_FINITE_GUARD_COUNT');
candidate=replaceOnce(candidate,'readOnlyStoreGuardPass:true,browserExecuted:false','readOnlyStoreGuardPass:true,inicioFiniteRootfixPass:true,browserExecuted:false','CANDIDATE_PASS_PAYLOAD_COUNT');
write(candidateNewPath,candidate);

let register=read(registerOldPath);
register=replaceAllRequired(register,sourceOldPath,sourceNewPath,1,'REGISTER_SOURCE_COUNT');
register=replaceAllRequired(register,runtimeOldPath,runtimeNewPath,1,'REGISTER_RUNTIME_COUNT');
write(registerNewPath,register);

let router=read(routerPath);
router=replaceOnce(router,"const ROUTER_VERSION = 'v10.5-f2-stable-boundary-contract';",`const ROUTER_VERSION = '${ROUTER_VERSION}';`,'ROUTER_VERSION_COUNT');
const oldBlock=`  ['${GATE}']: {\n    contractVersion: '2.0.0',\n    lifecycle: '${sourceOldPath}',\n    engine: '${engineOldPath}',`;
const newBlock=`  ['${GATE}']: {\n    contractVersion: '${CONTRACT_VERSION}',\n    lifecycle: '${sourceNewPath}',\n    engine: '${engineNewPath}',`;
router=replaceOnce(router,oldBlock,newBlock,'ROUTER_F2_BLOCK_COUNT');
write(routerPath,router);

let runtimeWf=read(runtimeWorkflowPath);
runtimeWf=replaceAllRequired(runtimeWf,String(OLD.artifactId),String(NEXT.artifactId),4,'RUNTIME_WF_ARTIFACT_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,OLD.zipName,NEXT.zipName,1,'RUNTIME_WF_ZIP_NAME_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,OLD.zipSha256,NEXT.zipSha256,1,'RUNTIME_WF_ZIP_SHA_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,OLD.manifestSha256,NEXT.manifestSha256,1,'RUNTIME_WF_MANIFEST_SHA_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,OLD.sourceHead,NEXT.sourceHead,1,'RUNTIME_WF_SOURCE_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,registerOldPath,registerNewPath,2,'RUNTIME_WF_REGISTER_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,engineOldPath,engineNewPath,1,'RUNTIME_WF_ENGINE_COUNT');
runtimeWf=replaceAllRequired(runtimeWf,candidateOldPath,candidateNewPath,1,'RUNTIME_WF_CANDIDATE_COUNT');
write(runtimeWorkflowPath,runtimeWf);

const registry=json(registryPath);
need(Array.isArray(registry.gates),'REGISTRY_GATES_NOT_ARRAY');
const regEntry={gateId:GATE,contractVersion:CONTRACT_VERSION,diagnosticRevision:'f2-successor-rebind-source-pending-v1',runtimeVersion:'20260819-1',block:'F2',status:'ACTIVE_SOURCE_REBIND',classification:'VALIDATOR_STALE',rootCause:'F2 gate owners remained pinned to Request06 predecessor after certified one-file functional rootfix successor was built.',candidate:{artifactId:NEXT.artifactId,sourceHead:NEXT.sourceHead,zipSha256:NEXT.zipSha256,manifestSha256:NEXT.manifestSha256,manifestStatus:NEXT.manifestStatus,fileCount:NEXT.fileCount},sourceLifecycle:sourceNewPath,runtimeLifecycle:runtimeNewPath,engine:engineNewPath,stableBoundary:stableNewPath,candidateValidator:candidateNewPath,sourceStatus:'PENDING_REBIND_SOURCE_ONLY',runtimeStatus:'BLOCKED_PENDING_SOURCE_REBIND',runtimeAuthorization:false,writesAllowed:false,deployAllowed:false,productionAllowed:false};
const ri=registry.gates.findIndex(g=>g?.gateId===GATE); if(ri>=0) registry.gates[ri]=regEntry; else registry.gates.push(regEntry);
registry.issuedAt='2026-08-19'; writeJson(registryPath,registry);

const live=json(livePath);
const predecessor=structuredClone(live.f2SourceOnly||{});
live.stateVersion='20260819.f2.request06-rootfix-successor-rebind-source-pending.current'; live.updatedAt=UPDATED_AT; live.phase='F2_SUCCESSOR_REBIND_SOURCE_ONLY_PENDING';
live.f2PredecessorSourceClosure={status:'HISTORICAL_CLOSED_PASS_PRESERVED',artifactId:OLD.artifactId,sourceHead:OLD.sourceHead,sourceOnly:predecessor};
live.f2Request06RootfixSuccessor={status:'CERTIFIED_UNPUBLISHED_PENDING_SOURCE_REBIND',buildRunId:NEXT.buildRunId,buildRequestCommit:NEXT.buildSourceRequest,artifactId:NEXT.artifactId,evidenceArtifactId:NEXT.evidenceArtifactId,sourceHead:NEXT.sourceHead,zipName:NEXT.zipName,zipSha256:NEXT.zipSha256,manifestSha256:NEXT.manifestSha256,manifestStatus:NEXT.manifestStatus,fileCount:NEXT.fileCount,deltaCount:NEXT.deltaCount,deltaPaths:NEXT.deltaPaths,finiteRegressionPass:true,fullRehashPass:true,productionTouched:false};
live.f2SourceOnly={...predecessor,status:'PENDING_REBIND_SOURCE_ONLY',gateId:GATE,contractVersion:CONTRACT_VERSION,validatorLifecycleRevision:'phase-capability-contract-v2-source-rebind',f2ValidatorRevision:VALIDATOR_REVISION,canonicalRouterVersion:ROUTER_VERSION,candidateArtifactId:NEXT.artifactId,candidateSourceHead:NEXT.sourceHead,candidateZipSha256:NEXT.zipSha256,candidateManifestSha256:NEXT.manifestSha256,candidateManifestStatus:NEXT.manifestStatus,candidateFileCount:NEXT.fileCount,fullRehashPass:false,runtimeWorkflowPrepared:true,requestCreated:false,runtimeAuthorized:false,browserAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,validatorRootfix:ROOTFIX,predecessorArtifactId:OLD.artifactId};
live.nextActionExact={...(live.nextActionExact||{}),action:'VALIDATE_F2_SUCCESSOR_SOURCE_ONLY',gateId:GATE,requestVersion:REQUEST_VERSION,candidateArtifactId:NEXT.artifactId,candidateSourceHead:NEXT.sourceHead,status:'PENDING_REBIND_SOURCE_ONLY',runtimeAuthorizationRequiredAfterSourcePass:true};
live.rootCauseState=live.rootCauseState||{}; live.rootCauseState.f2Request06FunctionalDefect={classification:'FUNCTIONAL_DEFECT',code:'F2_UNDEFINED_NAN_VISIBLE_DESKTOP_DIRECTION_INICIO',status:'ROOTFIX_CERTIFIED_IN_SUCCESSOR',rootCause:'OPTIONAL_ADVISOR_PROJECTION_WITHOUT_META_PRIMA_RENDERED_NON_FINITE_PERCENTAGE',successorArtifactId:NEXT.artifactId,productAffected:true,dataAffected:false};
live.rootCauseState.f2SuccessorGateRebind={classification:'VALIDATOR_STALE',code:'F2_GATE_OWNERS_PINNED_REQUEST06_PREDECESSOR',status:'PENDING_SOURCE_ONLY_REBIND',productAffected:false,dataAffected:false,preflightBeforeRebindRunId:32309043863};
live.rootCauseState.currentBlockingFact={code:'F2_SUCCESSOR_REBIND_SOURCE_ONLY_REQUIRED',status:'PENDING_REBIND_SOURCE_ONLY'};
if(live.authorization) live.authorization.f2AuthorizationStatus='NOT_AUTHORIZED_SUCCESSOR_RUNTIME_BLOCKED_PENDING_SOURCE_ONLY';
if(live.goLive) live.goLive.status='BLOCKED_F2_SUCCESSOR_SOURCE_ONLY_PENDING';
writeJson(livePath,live);

const index=json(indexPath); index.updatedAt=UPDATED_AT; index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{f2SourceOnlyStatus:'PENDING_REBIND_SOURCE_ONLY',f2SourceOnlyGateId:GATE,successorCandidateArtifactId:NEXT.artifactId,successorCandidateSourceHead:NEXT.sourceHead,successorCandidateZipSha256:NEXT.zipSha256,successorCandidateManifestSha256:NEXT.manifestSha256,successorCandidateManifestStatus:NEXT.manifestStatus,successorCandidateFileCount:NEXT.fileCount,nextAuthorizationBoundary:`BLOCKED_PENDING_SOURCE_ONLY_PASS:${REQUEST_VERSION}:EXACT_ARTIFACT_${NEXT.artifactId}`});
index.f2SuccessorRebind={status:'PENDING_REBIND_SOURCE_ONLY',classification:'VALIDATOR_STALE',gateId:GATE,contractVersion:CONTRACT_VERSION,candidateArtifactId:NEXT.artifactId,predecessorArtifactId:OLD.artifactId,sourceLifecycle:sourceNewPath,runtimeLifecycle:runtimeNewPath,engine:engineNewPath,candidateValidator:candidateNewPath,stableBoundary:stableNewPath,runtimeAuthorized:false,productionTouched:false};
writeJson(indexPath,index);

write('orbit360-platform/docs/CHECKPOINT-F2-REQUEST06-ROOTFIX-SUCCESSOR-REBIND-PENDING-20260819.md',`# Orbit 360 — F2 Request06 rootfix successor rebind\n\nFecha: 2026-08-19\nGate único: \`${GATE}\`\nClasificación: \`VALIDATOR_STALE\`\n\n## Evidencia antes del rebind\nEl router canónico fue ejecutado primero en run \`32309043863\` y dio PASS exclusivamente sobre el predecessor artifact \`${OLD.artifactId}\`. Esto confirma que el gate histórico estaba sano pero seguía fijado al candidato anterior.\n\n## Candidata sucesora\n- artifact: \`${NEXT.artifactId}\`\n- source: \`${NEXT.sourceHead}\`\n- ZIP SHA256: \`${NEXT.zipSha256}\`\n- manifest SHA256: \`${NEXT.manifestSha256}\`\n- manifest status: \`${NEXT.manifestStatus}\`\n- archivos: ${NEXT.fileCount}\n- delta: \`core/queries.js\`\n- build run: \`${NEXT.buildRunId}\`\n\n## Estado\n\`PENDING_REBIND_SOURCE_ONLY\`. No es PASS todavía. Runtime, secrets, Firebase, browser, writes, deploy y producción permanecen bloqueados. La evidencia histórica del artifact ${OLD.artifactId} se preserva y no se reescribe.\n\n## Siguiente acción\nEjecutar una sola validación SOURCE-only del mismo gate sobre artifact ${NEXT.artifactId}. Solo si PASS se sella \`CLOSED_PASS\` y se abre la frontera de autorización de Request07.\n`);
write('orbit360-platform/docs/ACADEMIA-DELTA-F2-VALIDATOR-STALE-REBIND-20260819.md',`# Academia Orbit 360 — delta F2 2026-08-19\n\nCaso reusable: diferenciar un \`FUNCTIONAL_DEFECT\` del producto de un \`VALIDATOR_STALE\` posterior. Request06 ejecutó y encontró un valor visible no finito en Inicio; el producto se corrigió en una candidata sucesora. El gate histórico seguía validando correctamente al predecessor, por lo que no estaba roto: quedó obsoleto para la nueva candidata.\n\nPatrón: ejecutar primero el gate canónico vigente; preservar la evidencia histórica; versionar owners del mismo gate; usar un estado intermedio \`PENDING_REBIND_SOURCE_ONLY\`; mantener runtime bloqueado hasta \`CLOSED_PASS\`; no tocar datos, Auth o Firebase para corregir una referencia de candidato.\n`);

const sourceValidationWorkflow=`name: Orbit360 F2 Successor Source Validation 20260819\non:\n  push:\n    branches: [ays/backend-tenant-lab-v99-20260703]\n    paths:\n      - '.github/orbit360-requests/f2-successor-source-validation-runbound-*.json'\npermissions:\n  contents: read\n  actions: read\nconcurrency:\n  group: orbit360-f2-successor-source-validation-20260819\n  cancel-in-progress: false\nenv:\n  ORBIT360_GATE_ID: ${GATE}\n  ORBIT360_CANDIDATE_ARTIFACT_ID: '${NEXT.artifactId}'\n  ORBIT360_CANDIDATE_ZIP_NAME: ${NEXT.zipName}\n  ORBIT360_CANDIDATE_ZIP_SHA256: ${NEXT.zipSha256}\n  ORBIT360_CANDIDATE_MANIFEST_SHA256: ${NEXT.manifestSha256}\n  ORBIT360_CANDIDATE_SOURCE_HEAD: ${NEXT.sourceHead}\n  EVIDENCE_DIR: orbit360-platform/runtime-gate-crm-v20260716\njobs:\n  source_only:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.sha }}\n          fetch-depth: 0\n          persist-credentials: false\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - name: Validate immutable SOURCE-only request\n        shell: bash\n        run: |\n          set -euo pipefail\n          test "$GITHUB_RUN_ATTEMPT" = '1'\n          mapfile -t CHANGED < <(git diff-tree --no-commit-id --name-only -r HEAD)\n          test "\${#CHANGED[@]}" = '1'\n          REQUEST_FILE="\${CHANGED[0]}"\n          case "$REQUEST_FILE" in .github/orbit360-requests/f2-successor-source-validation-runbound-*.json) ;; *) exit 41 ;; esac\n          jq -e '.schemaVersion=="orbit360-f2-successor-source-validation-request-v1" and .gateId=="${GATE}" and .candidateArtifactId==${NEXT.artifactId} and .status=="SOURCE_ONLY_ONCE" and .allowedExecutions==1 and .consumed==false and .replayAllowed==false and .scope.secrets==false and .scope.firestoreRead==false and .scope.browser==false and .scope.runtime==false and .scope.writes==false and .scope.deploy==false and .scope.production==false' "$REQUEST_FILE" >/dev/null\n          test "$(jq -r '.parentHead' "$REQUEST_FILE")" = "$(git rev-parse HEAD^)"\n      - name: Canonical gate before candidate download\n        shell: bash\n        run: |\n          set -euo pipefail\n          rm -f "$EVIDENCE_DIR/preflight-sanitizado.json"\n          node tools/orbit360-validar-gate-contracts-v20260717.mjs "$ORBIT360_GATE_ID"\n          cp "$EVIDENCE_DIR/preflight-sanitizado.json" "$EVIDENCE_DIR/f2-successor-source-gate-run-\${GITHUB_RUN_ID}.json"\n          jq -e '.ok==true and .status=="PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE" and .candidateArtifactId==${NEXT.artifactId} and .sourceRebindPending==true and .sourceBoundaryAccepted==true and .runtimeAuthorized==false and .browserAuthorized==false and .writeAuthorized==false and .productionAuthorized==false' "$EVIDENCE_DIR/f2-successor-source-gate-run-\${GITHUB_RUN_ID}.json" >/dev/null\n      - name: Download and fully validate exact successor SOURCE-only\n        env:\n          GH_TOKEN_SOURCE: \${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          OUTER="$RUNNER_TEMP/f2-source-outer.zip"; OUTER_DIR="$RUNNER_TEMP/f2-source-outer"; CANDIDATE_DIR="$RUNNER_TEMP/f2-source-candidate"\n          rm -rf "$OUTER" "$OUTER_DIR" "$CANDIDATE_DIR"; mkdir -p "$OUTER_DIR" "$CANDIDATE_DIR"\n          curl -L --fail --retry 3 -H "Authorization: Bearer $GH_TOKEN_SOURCE" -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/\${GITHUB_REPOSITORY}/actions/artifacts/\${ORBIT360_CANDIDATE_ARTIFACT_ID}/zip" -o "$OUTER"\n          unzip -q "$OUTER" -d "$OUTER_DIR"\n          mapfile -t FILES < <(find "$OUTER_DIR" -maxdepth 1 -type f -printf '%f\\n' | sort); test "\${#FILES[@]}" = '1'; test "\${FILES[0]}" = "$ORBIT360_CANDIDATE_ZIP_NAME"\n          INNER="$OUTER_DIR/$ORBIT360_CANDIDATE_ZIP_NAME"; test "$(sha256sum "$INNER" | awk '{print $1}')" = "$ORBIT360_CANDIDATE_ZIP_SHA256"\n          unzip -q "$INNER" -d "$CANDIDATE_DIR"\n          test "$(sha256sum "$CANDIDATE_DIR/orbit360-package-manifest.json" | awk '{print $1}')" = "$ORBIT360_CANDIDATE_MANIFEST_SHA256"\n          ORBIT360_F2_CANDIDATE_DIR="$CANDIDATE_DIR" ORBIT360_F2_CANDIDATE_SOURCE_EVIDENCE="$EVIDENCE_DIR/f2-successor-candidate-source-run-\${GITHUB_RUN_ID}.json" node ${candidateNewPath}\n          jq -e '.ok==true and .status=="F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS" and .candidateArtifactId==${NEXT.artifactId} and .fullRehashPass==true and .inicioFiniteRootfixPass==true and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .productionTouched==false' "$EVIDENCE_DIR/f2-successor-candidate-source-run-\${GITHUB_RUN_ID}.json" >/dev/null\n      - name: Build sanitized SOURCE terminal evidence\n        shell: bash\n        run: |\n          set -euo pipefail\n          jq -n --arg run "$GITHUB_RUN_ID" '{schemaVersion:"orbit360-f2-successor-source-terminal-v1",ok:true,status:"F2_SUCCESSOR_SOURCE_ONLY_PASS",classification:"PASS",runId:$run,gateId:"${GATE}",candidateArtifactId:${NEXT.artifactId},candidateSourceHead:"${NEXT.sourceHead}",candidateZipSha256:"${NEXT.zipSha256}",candidateManifestSha256:"${NEXT.manifestSha256}",fileCount:${NEXT.fileCount},fullRehashPass:true,inicioFiniteRootfixPass:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false}' > "$EVIDENCE_DIR/f2-successor-source-terminal-run-\${GITHUB_RUN_ID}.json"\n      - name: Upload sanitized SOURCE evidence\n        uses: actions/upload-artifact@v4\n        with:\n          name: orbit360-f2-successor-source-evidence-\${{ github.run_id }}\n          path: |\n            orbit360-platform/runtime-gate-crm-v20260716/f2-successor-source-gate-run-\${{ github.run_id }}.json\n            orbit360-platform/runtime-gate-crm-v20260716/f2-successor-candidate-source-run-\${{ github.run_id }}.json\n            orbit360-platform/runtime-gate-crm-v20260716/f2-successor-source-terminal-run-\${{ github.run_id }}.json\n          if-no-files-found: error\n          retention-days: 30\n`;
write('.github/workflows/orbit360-f2-successor-source-validation-v20260819.yml',sourceValidationWorkflow);

// Static consistency checks on the generated owner set.
for(const rel of [sourceNewPath,runtimeNewPath,engineNewPath,stableNewPath,candidateNewPath,registerNewPath,routerPath,runtimeWorkflowPath,registryPath,livePath,indexPath,'.github/workflows/orbit360-f2-successor-source-validation-v20260819.yml']) need(fs.existsSync(path.join(ROOT,rel)),`GENERATED_OWNER_MISSING:${rel}`);
need(read(routerPath).includes(sourceNewPath)&&read(routerPath).includes(engineNewPath),'ROUTER_REBIND_NOT_PRESENT');
need(read(runtimeWorkflowPath).includes(String(NEXT.artifactId))&&!read(runtimeWorkflowPath).includes(String(OLD.artifactId)),'RUNTIME_WORKFLOW_CANDIDATE_NOT_REBOUND');
const l2=json(livePath),i2=json(indexPath); need(l2.f2SourceOnly?.status==='PENDING_REBIND_SOURCE_ONLY'&&Number(l2.f2SourceOnly?.candidateArtifactId)===NEXT.artifactId,'LIVE_REBIND_INVALID'); need(i2.operationalCurrent?.f2SourceOnlyStatus==='PENDING_REBIND_SOURCE_ONLY'&&Number(i2.operationalCurrent?.successorCandidateArtifactId)===NEXT.artifactId,'INDEX_REBIND_INVALID');
console.log(JSON.stringify({ok:true,status:'F2_VALIDATOR_STALE_SUCCESSOR_REBIND_APPLIED_PENDING_SOURCE_ONLY',classification:'VALIDATOR_STALE',gateId:GATE,contractVersion:CONTRACT_VERSION,candidateArtifactId:NEXT.artifactId,predecessorArtifactId:OLD.artifactId,runtimeAuthorized:false,secrets:false,dataAccess:false,writes:false,deploy:false,production:false},null,2));
