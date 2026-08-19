#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const LIVE_REL='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX_REL='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const CHECKPOINT_REL='orbit360-platform/docs/CHECKPOINT-F2-RULES01-DEPLOY-PASS-PROBE-ROOTFIX-PASS-20260818.md';
const RULES01_REL='.github/orbit360-requests/f2-firestore-rules-parity-repair-lab-v20260818-01.json';
const ROOTCAUSE_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-probe-validator-stale-rootcause-v20260818.json';
const ROOTFIX_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-probe-validator-rootfix-source-only-v2-20260818.json';
const PIPELINE_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-probe-rootfix-persistence-pipeline-failure-v20260818.json';
const PROBE_WORKFLOW_REL='.github/workflows/orbit360-f2-rules01-postdeploy-probe-readonly-v20260818.yml';
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const writeJson=(rel,obj)=>fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(obj,null,2)+'\n','utf8');
const need=(v,c)=>{if(!v)throw new Error(c);};
const now=new Date().toISOString();

const live=readJson(LIVE_REL);
const index=readJson(INDEX_REL);
const rules01=readJson(RULES01_REL);
const rootcause=readJson(ROOTCAUSE_REL);
const rootfix=readJson(ROOTFIX_REL);
const pipeline=readJson(PIPELINE_REL);

need(rules01.status==='CONSUMED_VALIDATOR_STALE_AFTER_RULES_DEPLOY_PASS','RULES01_NOT_FROZEN');
need(rules01?.execution?.rulesDeploy?.ok===true&&rules01?.execution?.rulesDeploy?.exitCode===0,'RULES01_DEPLOY_NOT_PASS');
need(rules01?.execution?.integrity?.beforeAfterPass===true,'RULES01_INTEGRITY_NOT_PASS');
need(rootcause.canonicalClassification==='VALIDATOR_STALE'&&rootcause.canonicalCode==='F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID','RULES01_ROOTCAUSE_NOT_CANONICAL');
need(rootfix.ok===true&&rootfix.status==='F2_RULES01_PROBE_VALIDATOR_ROOTFIX_SOURCE_ONLY_V2_PASS','RULES01_ROOTFIX_NOT_PASS');
need(rootfix.rulesRedeployRequired===false&&rootfix.postdeployProbeRequestCreated===false&&rootfix.request06Created===false,'RULES01_ROOTFIX_BOUNDARY_INVALID');
need(pipeline.classification==='PIPELINE_MECHANISM_FAILURE'&&pipeline.code==='ROOTFIX_EVIDENCE_PERSIST_REBASE_BLOCKED_BY_UNSTAGED_CANONICAL_PREFLIGHT','RULES01_PIPELINE_HISTORY_MISSING');
need(fs.existsSync(path.join(ROOT,PROBE_WORKFLOW_REL)),'POSTDEPLOY_PROBE_WORKFLOW_MISSING');
need(!fs.existsSync(path.join(ROOT,'.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json')),'POSTDEPLOY_PROBE_REQUEST_ALREADY_EXISTS');
need(!fs.existsSync(path.join(ROOT,'.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-06.json')),'REQUEST06_ALREADY_EXISTS');

const phase='F2_RULES01_DEPLOY_PASS_PROBE_VALIDATOR_STALE_ROOTFIX_PASS_POSTDEPLOY_PROBE_AUTHORIZATION_PENDING';
const checkpoint=CHECKPOINT_REL;
const nextBoundary='F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1 / BEFORE F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 REQUEST06 / EXACT_ARTIFACT_9345207863 / FRESH_AUTHORIZATION_REQUIRED';

live.stateVersion='20260818.f2.rules01-deploy-pass.probe-validator-stale.rootfix-pass.postdeploy-probe-auth-pending.current';
live.updatedAt=now;
live.phase=phase;
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.currentBlockingFact={code:'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_REQUIRED',status:'FRESH_AUTHORIZATION_PENDING'};
live.rootCauseState.f2Rules01ProbeValidatorStale={classification:'VALIDATOR_STALE',code:'F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID',status:'CLOSED_SOURCE_ONLY_ROOTFIX_PASS_RUN_32212655647',productAffected:false,rulesSourceAffected:false,rulesRedeployRequired:false};
live.rootCauseState.f2Rules01RootfixPersistence={classification:'PIPELINE_MECHANISM_FAILURE',code:'ROOTFIX_EVIDENCE_PERSIST_REBASE_BLOCKED_BY_UNSTAGED_CANONICAL_PREFLIGHT',status:'CLOSED_BY_SERIALIZED_V2_RUN_32212655647',productAffected:false};
live.lanes=live.lanes||{};
live.lanes.A_frontend_UX='FROZEN_NO_CHANGES';
live.lanes.B_backend_security_gates=phase;
live.lanes.C_real_data_migration='UNTOUCHED_ZERO_CHANGES';
live.authorization=live.authorization||{};
live.authorization.f2AuthorizationStatus='RULES01_DEPLOY_PASS_PROBE_ROOTFIX_PASS_POSTDEPLOY_PROBE_AUTH_REQUIRED';
live.authorization.rulesDeployAuthorizedNow=false;
live.authorization.securityRepairAuthorizedNow=false;
live.authorization.browserAuthorizedNow=false;
live.goLive=live.goLive||{};
live.goLive.status=phase;
live.nextActionExact={...(live.nextActionExact||{}),stage:'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_AUTHORIZATION_BOUNDARY',gateId:'f2-productive-acceptance-exact-successor-v20260818',requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1',probeRequestVersion:'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1',runtimeRequestOrdinalAfterRepair:6,candidateArtifactId:9345207863,authorizationRequired:true,rulesRedeployAllowed:false,postdeployProbeRequestCreated:false,request06Created:false,request06AllowedBeforeProbePass:false};
live.f2Rules01={status:'RULES_DEPLOY_PASS_PROBE_VALIDATOR_STALE_ROOTFIX_PASS_POSTDEPLOY_PROBE_AUTH_PENDING',requestPath:RULES01_REL,requestCommit:'8d68f36182453ac70f2e68823e194db5a83c71f4',runId:32211779285,runAttempt:1,terminalArtifactId:9351002966,requestConsumed:true,replayAllowed:false,sourceRulesBlob:'35fba451bbbeb97dbae3f08303b786ddbcbdd29f',rulesDeploy:{executed:true,ok:true,exitCode:0,category:'ok',redeployRequired:false,redeployAuthorized:false},historicalProbe:{httpStatus:400,errorStatus:'INVALID_ARGUMENT',securityVerdictProduced:false,canonicalClassification:'VALIDATOR_STALE',canonicalCode:'F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID'},validatorRootfix:{status:'CLOSED_SOURCE_ONLY_PASS',runId:32212655647,contract:'F2_CROSS_TENANT_PROBE_VALID_PATH_V2',validProbePath:'tenants/orbit360-f2-cross-tenant-probe/system/config'},integrity:{beforeAfterPass:true,countsIdentical:true,digestsIdentical:true,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0},postdeployProbe:{workflowPrepared:true,requestCreated:false,authorized:false,rulesRedeployAllowed:false},request06Created:false,evidence:{rootCause:ROOTCAUSE_REL,rootfix:ROOTFIX_REL,pipeline:PIPELINE_REL,checkpoint}};
if(live.current){live.current.currentCheckpoint=checkpoint;live.current.transactionStatus=phase;}
if(live.pointers){live.pointers.currentCheckpoint=checkpoint;live.pointers.transactionStatus=phase;}
if(live.currentEvidence){live.currentEvidence.F2_rules01_deploy='PASS_RUN_32211779285';live.currentEvidence.F2_rules01_probe_validator_stale='CLOSED_VALIDATOR_STALE';live.currentEvidence.F2_rules01_probe_rootfix='CLOSED_SOURCE_ONLY_PASS_RUN_32212655647';}
if(Array.isArray(live.requiredResumeProtocol)) live.requiredResumeProtocol=[
  'Read current documentation index and live-state before any action',
  'Do not rerun Request01-Request05 or RULES01',
  'RULES01 Firestore rules deployment already PASS on run 32211779285; do not redeploy',
  'Historical RULES01 400/INVALID_ARGUMENT was VALIDATOR_STALE because probe used a reserved Firestore ID',
  'Probe rootfix F2_CROSS_TENANT_PROBE_VALID_PATH_V2 is source-only PASS on run 32212655647',
  'Do not create Request06 before corrected postdeploy cross-tenant probe PASS',
  'Fresh explicit authorization is required only for the prepared postdeploy read-only probe',
  'After authorization, run exactly one corrected forced-server probe with integrity before/after and zero writes'
];

index.updatedAt=now;
index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{
  resumePointer:checkpoint,
  latestRuntimeEvidence:ROOTCAUSE_REL,
  latestTerminalEvidence:ROOTCAUSE_REL,
  latestPreflightEvidence:ROOTFIX_REL,
  latestRequestConsumptionEvidence:ROOTCAUSE_REL,
  currentCheckpoint:checkpoint,
  currentPhase:phase,
  currentPhaseInternalPercent:0,
  currentPhaseInternalMethod:'rules01_deploy_pass_probe_validator_stale_rootfix_pass_postdeploy_probe_authorization_pending',
  goLiveRoutePercentClosed:50,
  integratedProgramPercentClosed:25,
  currentBlocker:'RULES01 rules deploy is PASS; corrected server-forced cross-tenant probe is pending fresh authorization. Rules redeploy is prohibited.',
  nextAuthorizationBoundary:nextBoundary,
  firestoreRulesSourceBlobSha:'35fba451bbbeb97dbae3f08303b786ddbcbdd29f',
  firestoreRulesSourceMutationRequired:false,
  firestoreRulesDeployAuthorized:false,
  firestoreRulesDeployExecuted:true,
  firestoreRulesDeployRunId:'32211779285',
  firestoreRulesDeployStatus:'PASS',
  f2Rules01Status:'DEPLOY_PASS_PROBE_VALIDATOR_STALE_ROOTFIX_PASS_POSTDEPLOY_PROBE_AUTH_PENDING',
  f2Rules01RunId:'32211779285',
  f2Rules01TerminalArtifactId:'9351002966',
  f2Rules01ReplayAllowed:false,
  f2Rules01ProbeRootfixRunId:'32212655647',
  f2Rules01ProbeRootfixStatus:'CLOSED_SOURCE_ONLY_PASS',
  f2Rules01RulesRedeployRequired:false,
  f2PostdeployProbeRequestCreated:false,
  f2PostdeployProbeAuthorizationGranted:false,
  request06Created:false
});
index.requiredResumeProtocol=[
  'Read this index',
  'Read orbit360-live-state-v1.json',
  'Confirm actual HEAD and PR #5 draft/open',
  'Read RULES01 root-cause, rootfix V2 and checkpoint evidence',
  'Do not rerun Request01-Request05 or RULES01',
  'Do not redeploy firestore.rules: RULES01 deploy already PASS on run 32211779285',
  'Treat the historical 400/INVALID_ARGUMENT as VALIDATOR_STALE, not a security verdict',
  'Do not create Request06 before corrected postdeploy cross-tenant probe PASS',
  'Require fresh explicit authorization for F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1',
  'Postdeploy probe must force a server read to tenants/orbit360-f2-cross-tenant-probe/system/config and PASS only on 403/PERMISSION_DENIED with integrity unchanged'
];

writeJson(LIVE_REL,live);
writeJson(INDEX_REL,index);
const md=`# CHECKPOINT — F2 RULES01 DEPLOY PASS · PROBE ROOTFIX PASS\n\nFecha: 2026-08-18\nRama: \`ays/backend-tenant-lab-v99-20260703\`\nPR: #5 draft/open\nArtifact F2 bloqueado: \`9345207863\`\n\n## RULES01 — consumido\n\nRULES01 commit \`8d68f36182453ac70f2e68823e194db5a83c71f4\`, run \`32211779285\`, attempt 1, artifact \`9351002966\`. El deploy exclusivo de \`firestore.rules\` al proyecto LAB terminó PASS con blob \`35fba451bbbeb97dbae3f08303b786ddbcbdd29f\`. No hubo writes de documentos Firestore/Auth/membership/datos, Hosting/Functions deploy, rebuild, publicación ni producción. Integridad before/after: counts y digests idénticos. RULES01 está consumido y no se repite.\n\n## Probe histórico — VALIDATOR_STALE\n\nEl probe de RULES01 recibió \`400 INVALID_ARGUMENT\` porque utilizó el ID reservado \`__orbit360_f2_cross_tenant_probe__\`. Ese response no produjo un veredicto de autorización válido. Causa canónica: \`VALIDATOR_STALE / F2_CROSS_TENANT_PROBE_USED_RESERVED_FIRESTORE_ID\`. No es un defecto de producto ni de las reglas desplegadas. No corresponde redeploy.\n\n## Rootfix\n\nContrato \`F2_CROSS_TENANT_PROBE_VALID_PATH_V2\`: ruta válida \`tenants/orbit360-f2-cross-tenant-probe/system/config\`; 403/PERMISSION_DENIED=PASS; 400/INVALID_ARGUMENT=VALIDATOR_STALE; 404/200=SECURITY_FAILURE. Rootfix source-only V2 run \`32212655647\`: PASS, sin secretos/Firestore/browser/runtime/deploy.\n\nEl primer intento de persistencia source-only, run \`32212371446\`, tuvo \`PIPELINE_MECHANISM_FAILURE / ROOTFIX_EVIDENCE_PERSIST_REBASE_BLOCKED_BY_UNSTAGED_CANONICAL_PREFLIGHT\`; contenido y self-test habían pasado. V2 corrigió el mecanismo restaurando la evidencia efímera antes del rebase.\n\n## Estado\n\nF2 sigue abierto. Ruta inmediata: 50%. Programa integral: 25%. Carril A congelado; Carril B pendiente únicamente del probe postdeploy read-only corregido; Carril C sin cambios. Request06 no existe.\n\n## Siguiente frontera exacta\n\n\`F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1\` — autorización fresca requerida. El workflow ya está preparado y **no contiene deploy de reglas**. Debe ejecutar un único probe server-forced con integridad before/after y cero writes. Solo PASS si Firestore devuelve 403/PERMISSION_DENIED. Si devuelve 404/200, clasificar SECURITY_FAILURE y detener.\n\nDespués de ese PASS, y solo entonces, se habilita la frontera de Request06.\n\n## Reuso / Academia\n\n\`BACKEND_PROTEGIDO_NO_CLAUDE\`: reglas Firestore, credenciales y enforcement real.  \n\`REPLICABLE_CLAUDE_ACUMULADO\`: patrón de paridad source→policy desplegada y probe negativo con IDs válidos del proveedor.  \n\`ACADEMIA_ACTUALIZAR\`: un gate de seguridad debe distinguir errores de construcción del probe de un permiso realmente concedido; un 400 de recurso inválido no demuestra autorización ni denegación.\n`;
fs.writeFileSync(path.join(ROOT,CHECKPOINT_REL),md,'utf8');
console.log(JSON.stringify({ok:true,status:'F2_RULES01_DOCSYNC_PREPARED',phase,checkpoint,nextBoundary,rulesRedeployRequired:false,postdeployProbeRequestCreated:false,request06Created:false},null,2));
