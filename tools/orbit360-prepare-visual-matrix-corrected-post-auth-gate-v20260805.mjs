#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const GATE = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const CONTRACT = '2.7.8';
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const VALIDATOR = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-visual-matrix-corrected-post-auth-lab-v20260805.mjs';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const PREFLIGHT = 'tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh';
const RUNNER = 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v20260805.sh';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';
const REGISTRATION = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-gate-registration-sanitized-v20260805.json';
const PLAN = 'orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md';
const ACADEMIA = 'orbit360-platform/docs/ACADEMIA-GATE-MATRIZ-VISUAL-CORREGIDA-POST-AUTH-20260805.md';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n', 'utf8');
};
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2));
const syntaxOk = file => spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status === 0;

const caps = {
  secrets: true,
  firestoreRead: true,
  writes: false,
  runtime: true,
  browser: true,
  deploy: true,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
};
const browserMatrix = [
  { role: 'Direccion', width: 1440, height: 1000, routes: ['inicio','cliente360','polizas','cobros','ops','leads','conciliaciones','cancelaciones'] },
  { role: 'Operativo', width: 1024, height: 768, routes: ['inicio','cliente360','polizas','cobros','ops','leads','conciliaciones','cancelaciones'] },
  { role: 'Asesor', width: 390, height: 844, routes: ['inicio','cliente360','polizas','cobros','ops','leads'] }
];

const lifecycle = {
  schemaVersion: 'orbit360-validator-lifecycle-contract-v1',
  validatorLifecycleRevision: 'phase-capability-contract-v1',
  gateId: GATE,
  gateContractVersion: CONTRACT,
  owner: 'orbit360-visual-matrix-corrected-post-auth-v20260805',
  ownerVersion: '20260805.1-authorized-once-pending-exclusive-request',
  status: 'AUTHORIZED_ONCE_PENDING_PREFLIGHT',
  classification: 'AUTHORIZED_VISUAL_MATRIX_CORRECTED_POST_AUTH',
  patternClassification: 'REPLICABLE_CLAUDE_INMEDIATO',
  rcId: 'RC-AYS-LAB-CANONICA-01',
  branch: BRANCH,
  pullRequest: 5,
  projectId: 'ays-orbit-360-lab',
  tenantId: 'alianzas-soluciones',
  currentPhase: 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION',
  executionProfile: { mode: 'LAB_HOSTING_OBSERVABLE_READONLY_BROWSER', phase: 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION', capabilities: caps },
  hostingTarget: 'ays-orbit-360-lab',
  hostingDeploysMaximum: 1,
  hostingBackupCloneAuthorized: true,
  hostingRollbackCloneAuthorizedOnFailure: true,
  hostingBackupChannelPrefix: 'visual-matrix-corrected-backup-',
  functionsDeploysMaximum: 0,
  rulesDeploysMaximum: 0,
  browserMatrix,
  sourcePrerequisites: {
    rootfixStaticEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-source-test-sanitized-v20260805.json',
    rootfixStaticChecks: 28,
    hydrationSourceEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-direct-source-validation-sanitized-v20260805.json',
    hydrationSourceChecks: 24,
    captureSourceEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-capture-v2-sourcefix-sanitized-v20260805.json',
    captureSourceChecks: 20,
    wrapperSourceEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-readonly-wrapper-sourcefix-sanitized-v20260805.json',
    wrapperSourceChecks: 15,
    previousRuntimeEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-governing-stop-sanitized-v20260805.json',
    previousStoppedRun: '31067506016',
    previousExactCheckpoint: 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
    previousAuthorizationConsumed: true,
    previousReplayAllowed: false,
    authorizationRequest: REQUEST
  },
  executionOrder: ['VERIFY_EXCLUSIVE_AUTHORIZATION_REQUEST','GO_GATE_CONTRACT','RESOLVE_LAB_CREDENTIAL','INSTALL_REPRODUCIBLE_RUNTIME','HOSTING_BACKUP_CLONE','ONE_HOSTING_LAB_DEPLOY','OBSERVABLE_PRECHECK','FULL_MATRIX_ONLY_IF_PRECHECK_PASS','ROLLBACK_ON_ANY_POST_DEPLOY_FAILURE','SNAPSHOT_INTEGRITY','CONSUME_REQUEST'],
  activeRequest: true,
  requestConsumed: false,
  authorizationReserved: true,
  replayAllowed: false,
  allowedExecutions: 1,
  executionAuthorized: true,
  secretAccessAuthorized: true,
  firestoreReadAuthorized: true,
  writeAuthorized: false,
  browserAuthorized: true,
  hostingDeployAuthorized: true,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false,
  mainAuthorized: false,
  mergeAuthorized: false,
  protectedState: {
    firestoreWritesAuthorized: 0,
    authWritesAuthorized: 0,
    operationalWritesAuthorized: 0,
    functionsDeploysAuthorized: 0,
    rulesDeploysAuthorized: 0,
    reimportAuthorized: false,
    productionAuthorized: false,
    currentLabRestoredToPreviousVersion: true,
    correctedRootfixHostingLive: false,
    passVisualPostAuth: false
  },
  stopRetryOnAnyFailure: true,
  rollbackRequiredOnAnyPostDeployFailure: true,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  nextAction: 'CREATE_EXCLUSIVE_AUTHORIZATION_REQUEST_THEN_RUN_CANONICAL_GATE_BEFORE_SECRETS'
};
writeJson(LIFECYCLE, lifecycle);

const engine = `#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const ROOT=process.cwd();
const GATE='${GATE}';
const CONTRACT='${CONTRACT}';
const LIFECYCLE='${LIFECYCLE}';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
const text=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const exists=f=>!!f&&fs.existsSync(path.join(ROOT,f));
const syntax=f=>spawnSync(process.execPath,['--check',path.join(ROOT,f)],{encoding:'utf8'}).status===0;
const emit=o=>{fs.mkdirSync(path.dirname(path.join(ROOT,OUT)),{recursive:true});fs.writeFileSync(path.join(ROOT,OUT),JSON.stringify(o,null,2)+'\\n');console.log(JSON.stringify(o,null,2));};
try{
 const lc=read(LIFECYCLE), req=read(REQUEST);
 const root=read('orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-source-test-sanitized-v20260805.json');
 const hyd=read('orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-direct-source-validation-sanitized-v20260805.json');
 const cap=read('orbit360-platform/runtime-gate-crm-v20260716/visual-capture-v2-sourcefix-sanitized-v20260805.json');
 const wrap=read('orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-readonly-wrapper-sourcefix-sanitized-v20260805.json');
 const prev=read('orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-governing-stop-sanitized-v20260805.json');
 const matrix=text('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
 const expected=${JSON.stringify(caps)};
 const checks={
  gateArgument:process.argv[2]===GATE,
  lifecycleIdentity:lc.gateId===GATE&&lc.gateContractVersion===CONTRACT&&lc.validatorLifecycleRevision==='phase-capability-contract-v1',
  lifecyclePhase:lc.currentPhase==='VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION',
  exactCapabilities:JSON.stringify(lc.executionProfile.capabilities)===JSON.stringify(expected),
  authorizedOnce:lc.status==='AUTHORIZED_ONCE_PENDING_PREFLIGHT'&&lc.allowedExecutions===1&&lc.requestConsumed===false&&lc.replayAllowed===false&&lc.executionAuthorized===true&&lc.secretAccessAuthorized===true&&lc.firestoreReadAuthorized===true&&lc.writeAuthorized===false&&lc.browserAuthorized===true&&lc.hostingDeployAuthorized===true,
  requestPath:REQUEST==='${REQUEST}',
  requestSchema:req.schemaVersion==='orbit360-visual-matrix-corrected-post-auth-request-v1',
  requestScope:req.gateId===GATE&&req.contractVersion===CONTRACT&&req.rcId==='RC-AYS-LAB-CANONICA-01'&&req.branch==='${BRANCH}'&&req.pullRequest===5&&req.projectId==='ays-orbit-360-lab'&&req.tenantId==='alianzas-soluciones',
  requestAuthorization:req.status==='AUTHORIZED_ONCE'&&req.approved===true&&req.allowedExecutions===1&&req.consumed===false&&req.replayAllowed===false,
  requestCapabilities:JSON.stringify(req.capabilities)===JSON.stringify(expected),
  requestBoundaries:req.scope&&req.scope.hostingDeploysMaximum===1&&req.scope.hostingOnly===true&&req.scope.hostingBackupClone===true&&req.scope.hostingRollbackCloneOnFailure===true&&req.scope.precheckRequiredBeforeMatrix===true&&req.scope.functionsDeploy===false&&req.scope.rulesDeploy===false&&req.scope.firestoreWrites===false&&req.scope.authWrites===false&&req.scope.operationalWrites===false&&req.scope.reimport===false&&req.scope.production===false&&req.scope.main===false&&req.scope.merge===false&&req.scope.directionDesktop===true&&req.scope.operationalTablet===true&&req.scope.advisorMobile===true,
  requestParent:req.parentHead&&typeof req.parentHead==='string'&&req.parentHead.length===40,
  rootfixSourcePass:root.status==='PASS_VISUAL_RUNTIME_ROOTFIX_SOURCE'&&root.total===28&&root.failed===0&&root.ok===true,
  hydrationSourcePass:hyd.status==='PASS_DIRECT_SOURCE_VALIDATION'&&hyd.total===24&&hyd.failed===0&&hyd.ok===true,
  captureSourcePass:cap.status==='PASS_VISUAL_CAPTURE_SOURCEFIX'&&cap.total===20&&cap.failed===0&&cap.ok===true&&cap.browserExecuted===false&&cap.deployExecuted===false,
  wrapperSourcePass:wrap.status==='PASS_READONLY_MODULE_WRAPPER_SOURCEFIX'&&wrap.total===15&&wrap.failed===0&&wrap.ok===true&&wrap.browserExecuted===false&&wrap.deployExecuted===false,
  previousRunConsumed:prev.runId==='31067506016'&&prev.decision==='STOP_RETRY'&&prev.authorizationConsumed===true&&prev.replayAllowed===false&&prev.exactFailureCheckpoint==='DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
  correctedCapture:matrix.includes('fullPage: false')&&!matrix.includes('fullPage: true')&&matrix.includes('CAPTURE_TIMEOUT_MS = 12000')&&matrix.includes('blocking: false'),
  sourceFilesExist:['orbit360-platform/core/visual-runtime-rootfix-v20260805.js','orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js','tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs','tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs','${RUNNER}','${SEALER}'].every(exists),
  sourceSyntax:['orbit360-platform/core/visual-runtime-rootfix-v20260805.js','orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js','tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs','tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs','${SEALER}'].every(syntax),
  browserMatrix:Array.isArray(lc.browserMatrix)&&lc.browserMatrix.length===3&&lc.browserMatrix.some(x=>x.role==='Direccion'&&x.width===1440&&x.height===1000)&&lc.browserMatrix.some(x=>x.role==='Operativo'&&x.width===1024&&x.height===768)&&lc.browserMatrix.some(x=>x.role==='Asesor'&&x.width===390&&x.height===844),
  hostingBoundary:lc.hostingTarget==='ays-orbit-360-lab'&&lc.hostingDeploysMaximum===1&&lc.hostingBackupCloneAuthorized===true&&lc.hostingRollbackCloneAuthorizedOnFailure===true&&lc.functionsDeploysMaximum===0&&lc.rulesDeploysMaximum===0,
  protectedWritesZero:lc.protectedState.firestoreWritesAuthorized===0&&lc.protectedState.authWritesAuthorized===0&&lc.protectedState.operationalWritesAuthorized===0&&lc.protectedState.functionsDeploysAuthorized===0&&lc.protectedState.rulesDeploysAuthorized===0
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const out={schemaVersion:'orbit360-visual-matrix-corrected-post-auth-preflight-v1',gateId:GATE,contractVersion:CONTRACT,status:failed.length?'STOP_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'DATA_CONTRACT_FAILURE':'GO_VISUAL_MATRIX_CORRECTED_POST_AUTH',total:Object.keys(checks).length,passed:Object.values(checks).filter(Boolean).length,failed:failed.length,failedCheckIds:failed,checks,executionAuthorized:!failed.length,secretAccessAuthorized:!failed.length,firestoreReadAuthorized:!failed.length,writeAuthorized:false,runtimeAuthorized:!failed.length,browserAuthorized:!failed.length,deployAuthorized:!failed.length,hostingDeployAuthorized:!failed.length,hostingTarget:'ays-orbit-360-lab',hostingDeploysMaximum:1,hostingBackupCloneAuthorized:!failed.length,hostingRollbackCloneAuthorizedOnFailure:!failed.length,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,dataAccess:false,secretAccess:false,firestoreReads:0,firestoreWrites:0,authWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,containsPasswords:false,ok:failed.length===0};emit(out);process.exit(out.ok?0:41);
}catch(error){const out={schemaVersion:'orbit360-visual-matrix-corrected-post-auth-preflight-v1',gateId:GATE,contractVersion:CONTRACT,status:'STOP_GATE_CONTRACT',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,700),dataAccess:false,secretAccess:false,firestoreReads:0,firestoreWrites:0,authWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,containsPasswords:false,ok:false};emit(out);process.exit(41);}
`;
write(ENGINE, engine);

const sealer = `#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const read=f=>f&&fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null;
const PREFLIGHT=process.env.ORBIT360_PREFLIGHT_EVIDENCE;
const PRECHECK=process.env.ORBIT360_PRECHECK_EVIDENCE;
const MATRIX=process.env.ORBIT360_MATRIX_EVIDENCE;
const FINAL=process.env.ORBIT360_FINAL_EVIDENCE;
const LIFECYCLE=process.env.ORBIT360_LIFECYCLE;
const CLOSURE=process.env.ORBIT360_CLOSURE;
const preflight=read(PREFLIGHT),precheck=read(PRECHECK),matrix=read(MATRIX),lc=read(LIFECYCLE);
const outcomes={registration:process.env.REGISTRATION_OUTCOME||'skipped',preflight:process.env.PREFLIGHT_OUTCOME||'skipped',credential:process.env.CREDENTIAL_OUTCOME||'skipped',runtimeInstall:process.env.RUNTIME_OUTCOME||'skipped',backup:process.env.BACKUP_OUTCOME||'skipped',deploy:process.env.DEPLOY_OUTCOME||'skipped',precheck:process.env.PRECHECK_OUTCOME||'skipped',matrix:process.env.MATRIX_OUTCOME||'skipped',rollback:process.env.ROLLBACK_OUTCOME||'skipped'};
const deployAttempted=process.env.DEPLOY_ATTEMPTED==='1';
const precheckPass=outcomes.precheck==='success'&&precheck&&precheck.ok===true&&precheck.stage==='PASS_VISUAL_BROWSER_PRECHECK';
const matrixPass=outcomes.matrix==='success'&&matrix&&matrix.ok===true&&matrix.stage==='PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX'&&matrix.snapshotIntegrity==='VERIFIED_UNCHANGED'&&matrix.totalRoleFailures===0;
const pass=preflight&&preflight.status==='GO_GATE_CONTRACT'&&outcomes.registration==='success'&&outcomes.preflight==='success'&&outcomes.credential==='success'&&outcomes.runtimeInstall==='success'&&outcomes.backup==='success'&&outcomes.deploy==='success'&&precheckPass&&matrixPass;
const rollbackRequired=deployAttempted&&!pass,rollbackRestored=rollbackRequired&&outcomes.rollback==='success';
function failure(){if(pass)return{checkpoint:'MATRIX_COMPLETE',classification:'PASS_VISUAL_POST_AUTH'};if(outcomes.registration!=='success')return{checkpoint:'GATE_REGISTRATION_NOT_PASS',classification:'VALIDATOR_STALE'};if(outcomes.preflight!=='success'||!preflight||preflight.status!=='GO_GATE_CONTRACT')return{checkpoint:preflight&&preflight.status||'GO_GATE_CONTRACT_NOT_PASS',classification:preflight&&preflight.classification||'DATA_CONTRACT_FAILURE'};if(outcomes.credential!=='success')return{checkpoint:'LAB_CREDENTIAL_RESOLUTION_FAILED',classification:'ENVIRONMENT_FAILURE'};if(outcomes.runtimeInstall!=='success')return{checkpoint:'RUNTIME_INSTALL_FAILED',classification:'ENVIRONMENT_FAILURE'};if(outcomes.backup!=='success')return{checkpoint:'HOSTING_BACKUP_FAILED',classification:'PIPELINE_MECHANISM_FAILURE'};if(outcomes.deploy!=='success')return{checkpoint:rollbackRequired&&!rollbackRestored?'HOSTING_DEPLOY_FAILED_ROLLBACK_FAILED':'HOSTING_DEPLOY_FAILED',classification:'PIPELINE_MECHANISM_FAILURE'};if(!precheckPass)return{checkpoint:rollbackRequired&&!rollbackRestored?'PRECHECK_FAILED_ROLLBACK_FAILED':precheck&&(precheck.checkpoint||precheck.currentCheckpoint)||'OBSERVABLE_PRECHECK_FAILED',classification:precheck&&precheck.classification||'ENVIRONMENT_FAILURE'};if(!matrixPass)return{checkpoint:rollbackRequired&&!rollbackRestored?'MATRIX_FAILED_ROLLBACK_FAILED':matrix&&(matrix.currentCheckpoint||matrix.checkpoint)||'VISUAL_MATRIX_FAILED',classification:matrix&&matrix.classification||'FUNCTIONAL_DEFECT'};return{checkpoint:'PIPELINE_UNKNOWN',classification:'PIPELINE_MECHANISM_FAILURE'};}
const failed=failure();
const roles=matrix&&Array.isArray(matrix.roles)?matrix.roles:[];
const final={schemaVersion:'orbit360-visual-matrix-corrected-post-auth-final-v1',gateId:'${GATE}',contractVersion:'${CONTRACT}',runId:process.env.GITHUB_RUN_ID||'',attempt:Number(process.env.GITHUB_RUN_ATTEMPT||1),stage:pass?'PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE':'STOP_RETRY_VISUAL_MATRIX_CORRECTED_POST_AUTH',decision:pass?'PASS_VISUAL_POST_AUTH':'STOP_RETRY',classification:failed.classification,checkpoint:failed.checkpoint,preflightStatus:preflight&&preflight.status||'MISSING',preflightChecks:preflight&&preflight.total||0,outcomes,authorizationConsumed:true,secretAccessed:outcomes.credential!=='skipped',hostingBackupClone:outcomes.backup==='success',hostingDeployAttempted:deployAttempted,hostingDeploys:outcomes.deploy==='success'?1:0,hostingRollbackRequired:rollbackRequired,hostingRollbackRestored:rollbackRestored,precheckStage:precheck&&precheck.stage||'NOT_EXECUTED',precheckCheckpoint:precheck&&(precheck.checkpoint||precheck.currentCheckpoint)||'NOT_EXECUTED',matrixStage:matrix&&matrix.stage||'NOT_EXECUTED',matrixCheckpoint:matrix&&(matrix.currentCheckpoint||matrix.checkpoint)||'NOT_EXECUTED',roleResults:roles,totalRoleFailures:matrix&&matrix.totalRoleFailures!=null?matrix.totalRoleFailures:null,totalWarnings:matrix&&matrix.totalWarnings!=null?matrix.totalWarnings:null,captureWarnings:matrix&&matrix.captureWarnings||[],snapshotIntegrity:matrix&&matrix.snapshotIntegrity||'NOT_VERIFIED',firestoreReads:Number(precheck&&precheck.firestoreReads||0)+Number(matrix&&matrix.firestoreReads||0),firestoreWrites:0,authWrites:0,operationalWrites:0,functionsDeploys:0,rulesDeploys:0,reimports:0,productionTouched:false,mainTouched:false,mergeExecuted:false,containsPII:false,containsSecrets:false,containsPasswords:false,ok:pass};
fs.mkdirSync(path.dirname(FINAL),{recursive:true});fs.writeFileSync(FINAL,JSON.stringify(final,null,2)+'\\n');
if(!lc)throw new Error('PIPELINE_MECHANISM_FAILURE_LIFECYCLE_MISSING');lc.ownerVersion='20260805.2-runtime-consumed';lc.status=pass?'CONSUMED_PASS':'CONSUMED_STOP_RETRY';lc.classification=final.classification;lc.currentPhase=pass?'LIVE_VISUAL_VERIFIED':'CONSUMED_STOP_RETRY';lc.activeRequest=false;lc.requestConsumed=true;lc.authorizationReserved=false;lc.allowedExecutions=0;lc.executionAuthorized=false;lc.secretAccessAuthorized=false;lc.firestoreReadAuthorized=false;lc.writeAuthorized=false;lc.browserAuthorized=false;lc.hostingDeployAuthorized=false;lc.functionsDeployAuthorized=false;lc.rulesDeployAuthorized=false;lc.productionAuthorized=false;lc.runtimeResult={runId:final.runId,attempt:final.attempt,result:pass?'PASS':'STOP_RETRY',classification:final.classification,checkpoint:final.checkpoint,hostingDeploys:final.hostingDeploys,rollbackRestored:final.hostingRollbackRestored,snapshotIntegrity:final.snapshotIntegrity,totalRoleFailures:final.totalRoleFailures};lc.protectedState.currentLabRestoredToPreviousVersion=rollbackRestored;lc.protectedState.correctedRootfixHostingLive=pass;lc.protectedState.passVisualPostAuth=pass;lc.nextAction=pass?'RESUME_COBROS_4_1_AND_PREPARE_PLATFORM_NATIVE_CRUD_GATE':'CLOSE_EXACT_CHECKPOINT_ROOT_CAUSE_WITHOUT_RETRY';fs.writeFileSync(LIFECYCLE,JSON.stringify(lc,null,2)+'\\n');
const lines=['# CIERRE MATRIZ VISUAL CORREGIDA POST-AUTH — 2026-08-05','','```text','run: '+final.runId,'stage: '+final.stage,'classification: '+final.classification,'checkpoint: '+final.checkpoint,'preflight: '+final.preflightStatus+' · '+final.preflightChecks,'Hosting deploys: '+final.hostingDeploys,'rollback required: '+final.hostingRollbackRequired,'rollback restored: '+final.hostingRollbackRestored,'precheck: '+final.precheckStage+' · '+final.precheckCheckpoint,'matrix: '+final.matrixStage+' · '+final.matrixCheckpoint,'snapshot: '+final.snapshotIntegrity,'role failures: '+String(final.totalRoleFailures),'capture warnings: '+String(final.captureWarnings.length),'Firestore/Auth/operational writes: 0','Functions/Rules/reimport/production/main/merge: 0','```','',pass?'Salida: \\`PASS_VISUAL_POST_AUTH\\`.':'Salida: \\`STOP_RETRY\\`; no se repite la ejecución.'];fs.writeFileSync(CLOSURE,lines.join('\\n')+'\\n');console.log(JSON.stringify(final,null,2));
`;
write(SEALER, sealer);

const runner = `#!/usr/bin/env bash
set -uo pipefail
BRANCH='${BRANCH}'
PROJECT='ays-orbit-360-lab'
TENANT='alianzas-soluciones'
DIR='orbit360-platform/runtime-gate-crm-v20260716'
REGISTRATION='${REGISTRATION}'
PREFLIGHT="$DIR/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json"
PRECHECK="$DIR/visual-matrix-corrected-post-auth-precheck-sanitized-v20260805.json"
MATRIX="$DIR/visual-matrix-corrected-post-auth-matrix-sanitized-v20260805.json"
FINAL="$DIR/visual-matrix-corrected-post-auth-final-sanitized-v20260805.json"
LIFECYCLE='${LIFECYCLE}'
CLOSURE='orbit360-platform/docs/CIERRE-MATRIZ-VISUAL-CORREGIDA-POST-AUTH-20260805.md'
ARTIFACT_DIR='orbit360-visual-matrix-corrected-artifacts'
LAB_URL='https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2'
REGISTRATION_OUTCOME='success';PREFLIGHT_OUTCOME='success';CREDENTIAL_OUTCOME='skipped';RUNTIME_OUTCOME='skipped';BACKUP_OUTCOME='skipped';DEPLOY_OUTCOME='skipped';PRECHECK_OUTCOME='skipped';MATRIX_OUTCOME='skipped';ROLLBACK_OUTCOME='skipped';DEPLOY_ATTEMPTED=0;BACKUP_CHANNEL=''
persist(){ export REGISTRATION_OUTCOME PREFLIGHT_OUTCOME CREDENTIAL_OUTCOME RUNTIME_OUTCOME BACKUP_OUTCOME DEPLOY_OUTCOME PRECHECK_OUTCOME MATRIX_OUTCOME ROLLBACK_OUTCOME DEPLOY_ATTEMPTED;export ORBIT360_PREFLIGHT_EVIDENCE="$PREFLIGHT" ORBIT360_PRECHECK_EVIDENCE="$PRECHECK" ORBIT360_MATRIX_EVIDENCE="$MATRIX" ORBIT360_FINAL_EVIDENCE="$FINAL" ORBIT360_LIFECYCLE="$LIFECYCLE" ORBIT360_CLOSURE="$CLOSURE";node '${SEALER}'||true;git config user.name orbit360-gate-bot;git config user.email orbit360-gate-bot@users.noreply.github.com;files=("$PREFLIGHT" "$LIFECYCLE" "$FINAL" "$CLOSURE");[[ -f "$PRECHECK" ]]&&files+=("$PRECHECK");[[ -f "$MATRIX" ]]&&files+=("$MATRIX");git add "${files[@]}" 2>/dev/null||true;if ! git diff --cached --quiet;then git commit -m 'runtime: persist corrected post-auth visual matrix result [skip ci]'||true;git push origin "HEAD:$BRANCH"||true;fi;}
rollback_if_needed(){ if [[ "$DEPLOY_ATTEMPTED" == '1' && "$ROLLBACK_OUTCOME" != 'success' ]];then if [[ -n "$BACKUP_CHANNEL" && "$BACKUP_OUTCOME" == 'success' ]];then npx firebase hosting:clone "$PROJECT:$BACKUP_CHANNEL" "$PROJECT:live" --project "$PROJECT" --non-interactive&&ROLLBACK_OUTCOME='success'||ROLLBACK_OUTCOME='failure';else ROLLBACK_OUTCOME='failure';fi;fi;}
stop(){ rollback_if_needed;persist;exit 42;}
[[ "${GITHUB_REF_NAME:-}" == "$BRANCH" ]]||{ PREFLIGHT_OUTCOME='failure';stop; }
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]]||{ PREFLIGHT_OUTCOME='failure';stop; }
[[ -f "$PREFLIGHT" && -f "$REGISTRATION" ]]||{ PREFLIGHT_OUTCOME='failure';stop; }
jq -e '.status=="PASS_GATE_REGISTRATION" and .contractVersion=="${CONTRACT}" and .failed==0 and .ok==true and .secretsRead==false and .browserExecuted==false and .deployExecuted==false' "$REGISTRATION" >/dev/null||{ REGISTRATION_OUTCOME='failure';stop; }
jq -e '.status=="GO_GATE_CONTRACT" and .contractVersion=="${CONTRACT}" and .failed==0 and .ok==true and .executionAuthorized==true and .secretAccessAuthorized==true and .firestoreReadAuthorized==true and .writeAuthorized==false and .browserAuthorized==true and .hostingDeployAuthorized==true and .hostingDeploysMaximum==1 and .functionsDeployAuthorized==false and .rulesDeployAuthorized==false and .productionAuthorized==false and .firestoreWritesAuthorized==0 and .authWritesAuthorized==0 and .operationalWritesAuthorized==0 and .secretAccess==false and .runtimeExecuted==false and .browserExecuted==false and .deployExecuted==false' "$PREFLIGHT" >/dev/null||{ PREFLIGHT_OUTCOME='failure';stop; }
SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB:-${FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB:-${FIREBASE_SERVICE_ACCOUNT:-}}}";[[ -n "$SERVICE_ACCOUNT" ]]||{ CREDENTIAL_OUTCOME='failure';stop; }
KEY="$RUNNER_TEMP/orbit360-visual-matrix-corrected-service-account.json";printf '%s' "$SERVICE_ACCOUNT">"$KEY";chmod 600 "$KEY";[[ "$(jq -r '.project_id // empty' "$KEY" 2>/dev/null)" == "$PROJECT" ]]||{ CREDENTIAL_OUTCOME='failure';stop; };export GOOGLE_APPLICATION_CREDENTIALS="$KEY";CREDENTIAL_OUTCOME='success'
npm install --no-save --package-lock=false firebase-admin@13.10.0 firebase-tools@15.25.1 playwright@1.55.0 >/dev/null&&npx playwright install --with-deps chromium >/dev/null&&RUNTIME_OUTCOME='success'||{ RUNTIME_OUTCOME='failure';stop; }
BACKUP_CHANNEL="visual-matrix-corrected-backup-${GITHUB_RUN_ID}";npx firebase hosting:clone "$PROJECT:live" "$PROJECT:$BACKUP_CHANNEL" --project "$PROJECT" --non-interactive&&BACKUP_OUTCOME='success'||{ BACKUP_OUTCOME='failure';stop; }
DEPLOY_ATTEMPTED=1;npx firebase deploy --project "$PROJECT" --only hosting --non-interactive&&DEPLOY_OUTCOME='success'||{ DEPLOY_OUTCOME='failure';stop; }
mkdir -p "$ARTIFACT_DIR";export ORBIT360_PROJECT_ID="$PROJECT" ORBIT360_TENANT_ID="$TENANT" ORBIT360_LAB_URL="$LAB_URL" ORBIT360_GATE_ID='${GATE}' ORBIT360_CONTRACT_VERSION='${CONTRACT}' ORBIT360_BROWSER_PRECHECK_EVIDENCE="$PRECHECK" ORBIT360_BROWSER_PRECHECK_SCREENSHOT="$ARTIFACT_DIR/precheck-failure.png"
node tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs&&jq -e '.stage=="PASS_VISUAL_BROWSER_PRECHECK" and .classification=="GO_FULL_VISUAL_MATRIX" and .ok==true and .checkpoint=="INICIO_READY_PASS" and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .productionTouched==false' "$PRECHECK" >/dev/null&&PRECHECK_OUTCOME='success'||{ PRECHECK_OUTCOME='failure';stop; }
export ORBIT360_VISUAL_EVIDENCE="$MATRIX" ORBIT360_VISUAL_ARTIFACT_DIR="$ARTIFACT_DIR";node tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs&&jq -e '.stage=="PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX" and .classification=="PASS_VISUAL_POST_AUTH" and .ok==true and .totalRoleFailures==0 and .snapshotIntegrity=="VERIFIED_UNCHANGED" and (.roles|length)==3 and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .functionsDeploys==0 and .rulesDeploys==0 and .productionTouched==false' "$MATRIX" >/dev/null&&MATRIX_OUTCOME='success'||{ MATRIX_OUTCOME='failure';stop; }
ROLLBACK_OUTCOME='skipped';persist;jq -e '.ok==true and .stage=="PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE" and .decision=="PASS_VISUAL_POST_AUTH" and .checkpoint=="MATRIX_COMPLETE" and .hostingDeploys==1 and .hostingRollbackRequired==false and .snapshotIntegrity=="VERIFIED_UNCHANGED" and .totalRoleFailures==0 and .firestoreWrites==0 and .authWrites==0 and .operationalWrites==0 and .functionsDeploys==0 and .rulesDeploys==0 and .productionTouched==false and .mainTouched==false and .mergeExecuted==false' "$FINAL" >/dev/null
`;
write(RUNNER, runner);

const preflight = `#!/usr/bin/env bash
set -euo pipefail
BRANCH='${BRANCH}'
REQUEST='${REQUEST}'
GATE='${GATE}'
REGISTRATION='${REGISTRATION}'
OUT='orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json'
[[ "${GITHUB_REF_NAME:-}" == "$BRANCH" ]]
[[ "${GITHUB_RUN_ATTEMPT:-1}" == '1' ]]
[[ -f "$REQUEST" && -f "$REGISTRATION" ]]
mapfile -t H < <(git log --format=%H -- "$REQUEST");[[ "${#H[@]}" == '1' ]];REQ_COMMIT="${H[0]}";PARENT="$(git rev-parse "$REQ_COMMIT^")";mapfile -t C < <(git diff-tree --no-commit-id --name-only -r "$REQ_COMMIT");[[ "${#C[@]}" == '1' && "${C[0]}" == "$REQUEST" ]];[[ "$(git rev-parse HEAD)" == "$REQ_COMMIT" ]];jq -e --arg parent "$PARENT" '.schemaVersion=="orbit360-visual-matrix-corrected-post-auth-request-v1" and .gateId=="${GATE}" and .contractVersion=="${CONTRACT}" and .status=="AUTHORIZED_ONCE" and .approved==true and .allowedExecutions==1 and .consumed==false and .replayAllowed==false and .parentHead==$parent' "$REQUEST" >/dev/null
export ORBIT360_REQUEST_FILE="$REQUEST";node tools/orbit360-validar-gate-contracts-v20260717.mjs "$GATE";cp orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json "$OUT";jq -e '.status=="GO_GATE_CONTRACT" and .contractVersion=="${CONTRACT}" and .failed==0 and .ok==true and .secretAccess==false and .browserExecuted==false and .deployExecuted==false' "$OUT" >/dev/null
if [[ -n "${GITHUB_OUTPUT:-}" ]];then echo 'go=true'>>"$GITHUB_OUTPUT";fi
`;
write(PREFLIGHT, preflight);

let validator = read(VALIDATOR);
const anchor = '  "block2.7-visual-observable-rootfix-v2-lab-v20260805":{contractVersion:"2.7.5",lifecycle:"tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-visual-observable-rootfix-v2-lab-v20260805.mjs"},';
const entry = '  "'+GATE+'":{contractVersion:"'+CONTRACT+'",lifecycle:"'+LIFECYCLE+'",engine:"'+ENGINE+'"},';
if (!validator.includes(entry)) {
  if (!validator.includes(anchor)) throw new Error('VALIDATOR_STALE_ANCHOR_MISSING');
  validator = validator.replace(anchor, entry+'\n'+anchor);
  write(VALIDATOR, validator);
}

const registrationChecks = {
  validatorRegisteredOnce: read(VALIDATOR).split('"'+GATE+'"').length - 1 === 1,
  lifecycleWritten: fs.existsSync(LIFECYCLE),
  engineWritten: fs.existsSync(ENGINE),
  preflightWritten: fs.existsSync(PREFLIGHT),
  runnerWritten: fs.existsSync(RUNNER),
  sealerWritten: fs.existsSync(SEALER),
  engineSyntax: syntaxOk(ENGINE),
  sealerSyntax: syntaxOk(SEALER),
  validatorSyntax: syntaxOk(VALIDATOR),
  sourceFixesStillPass: JSON.parse(read('orbit360-platform/runtime-gate-crm-v20260716/visual-capture-v2-sourcefix-sanitized-v20260805.json')).ok === true && JSON.parse(read('orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-readonly-wrapper-sourcefix-sanitized-v20260805.json')).ok === true
};
const failedCheckIds = Object.entries(registrationChecks).filter(([,ok])=>!ok).map(([id])=>id);
writeJson(REGISTRATION, {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-gate-registration-v1',
  gateId: GATE,
  contractVersion: CONTRACT,
  status: failedCheckIds.length ? 'FAIL_GATE_REGISTRATION' : 'PASS_GATE_REGISTRATION',
  classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CLOSED',
  total: Object.keys(registrationChecks).length,
  passed: Object.values(registrationChecks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks: registrationChecks,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
});
if (failedCheckIds.length) throw new Error('GATE_REGISTRATION_FAILED:'+failedCheckIds.join(','));

const planSection = `\n\n## Matriz visual corregida post-Auth · gate 2.7.8 · 2026-08-05\n\n- gate nuevo y no superpuesto: \\`${GATE}\\`;\n- autorización: una ejecución; request exclusivo pendiente;\n- sourcefix de capturas: 20/20 PASS;\n- wrapper de módulos inmutables: 15/15 PASS;\n- orden obligatorio: GO_GATE_CONTRACT → backup → máximo un Hosting LAB → precheck → matriz;\n- captura de viewport acotada y no bloqueante;\n- cero Functions, Rules, Firestore/Auth/operational writes, reimportación, producción, main o merge;\n- rollback y STOP_RETRY ante cualquier fallo;\n- el run 31067506016 no se reutiliza ni se repite.\n`;
let plan = read(PLAN);
if (!plan.includes('Matriz visual corregida post-Auth · gate 2.7.8')) write(PLAN, plan.trimEnd()+planSection);
write(ACADEMIA, `# Academia — gate de matriz visual corregida post-Auth\n\n## Qué enseña\n\n1. Un defecto funcional de producto no es igual a un fallo del capturador o del pipeline.\n2. El gate debe emitirse antes de secretos y separar preflight, runtime y evidencia.\n3. Una captura es evidencia auxiliar: su fallo no debe reemplazar el resultado funcional.\n4. Un request consumido no se repite; se crea un gate nuevo, no superpuesto y autorizado una sola vez.\n5. El rollback protege Hosting LAB cuando una etapa posterior al deploy falla.\n\n## Roles y viewports\n\n- Dirección: 1440 × 1000.\n- Operativo: 1024 × 768.\n- Asesor: 390 × 844.\n\n## Clasificación reusable\n\n\\`REPLICABLE_CLAUDE_INMEDIATO\\`: patrón de capturas acotadas/no bloqueantes y separación entre defecto funcional, validador obsoleto y fallo del pipeline.\n`);

console.log(JSON.stringify({ status:'PASS_GATE_2_7_8_PREPARATION_SOURCE_ONLY', gateId:GATE, contractVersion:CONTRACT, registrationChecks:Object.keys(registrationChecks).length, secretsRead:false, browserExecuted:false, deployExecuted:false, ok:true }, null, 2));
