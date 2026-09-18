import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const STATUS_LEDGER='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const AUTH_RECEIPT='artifacts/orbit360-recovery/release-control/I6_EXPLICIT_AUTHORIZATION_RECEIPT_20260914.json';
const I6_ADDENDUM='artifacts/orbit360-recovery/release-control/FASE_A_POSTSALIDA_I6_ADDENDUM_20260914.md';
const I6_PLAN_LOCK='artifacts/orbit360-recovery/release-control/I6_POSTSALIDA_PLAN_LOCK_20260914.json';
const V5_MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v5/08_MANIFIESTO_FUENTES_EVERGREEN_V5.json';
const DATA_UPDATE_PLAN='artifacts/orbit360-recovery/release-control/POSTPROD_DATA_UPDATE_OPERATING_PLAN_LOCK_20260917.json';
const DATA_UPDATE_DISCIPLINE='artifacts/orbit360-recovery/release-control/I6_DATA_UPDATE_EXECUTION_DISCIPLINE_LOCK_20260917.json';
const DATA_UPDATE_REGISTRY='artifacts/orbit360-recovery/release-control/DATA_UPDATE_MECHANISM_REGISTRY.json';
const ACTIVE_SOURCE_INTAKE='artifacts/orbit360-recovery/release-control/I6_2_DIRECTORIO_SOURCE_INTAKE_20260917.json';
const I62_RECEIPT='artifacts/orbit360-recovery/release-control/I6_2_DIRECTORIO_LIVE_PASS_20260918.json';
const I63_SOURCE='artifacts/orbit360-recovery/release-control/I6_3_CLIENTES_SOURCE_INTAKE_20260918.json';
const I63_RECEIPT='artifacts/orbit360-recovery/release-control/I6_3_CLIENTES_LIVE_PASS_20260918.json';
const I64_SOURCE='artifacts/orbit360-recovery/release-control/I6_4_POLIZAS_RIESGOS_SOURCE_INTAKE_20260918.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const exists=p=>fs.existsSync(p);

need(MODE==='governance'||MODE==='i6','I6_GUARD_MODE_INVALID:'+MODE);
for(const p of [CONTROL,STATUS_LEDGER,AUTH_RECEIPT,I6_ADDENDUM,I6_PLAN_LOCK,V5_MANIFEST,DATA_UPDATE_PLAN,DATA_UPDATE_DISCIPLINE,DATA_UPDATE_REGISTRY,ACTIVE_SOURCE_INTAKE,I63_SOURCE,I63_RECEIPT,I64_SOURCE]) need(exists(p),'I6_REQUIRED_FILE_MISSING:'+p);
const C=readJson(CONTROL),S=readJson(STATUS_LEDGER),A=readJson(AUTH_RECEIPT),M=readJson(V5_MANIFEST);
const P=readJson(DATA_UPDATE_PLAN),D=readJson(DATA_UPDATE_DISCIPLINE),RGT=readJson(DATA_UPDATE_REGISTRY),SRC=readJson(ACTIVE_SOURCE_INTAKE),SRC3=readJson(I63_SOURCE),R63=readJson(I63_RECEIPT),SRC4=readJson(I64_SOURCE);
need(C.schemaVersion==='gravicentra-control-plane-v2','I6_CONTROL_SCHEMA_INVALID');
need(C.controlPlaneId==='GRAVICENTRA-INSURANCE-FASE-A','I6_CONTROL_ID_INVALID');
need(C.repository==='paulaosoriof86/orbit360-core','I6_REPOSITORY_INVALID');
need(C.branch==='recovery/fase-a-clean-20260831','I6_BRANCH_INVALID');
need(C.status==='PRODUCTION_ACCEPTED','I6_BASELINE_PRODUCTION_STATUS_INVALID');
need(C.environmentState?.productionAccepted===true,'I6_PRODUCTION_NOT_ACCEPTED');
need(C.environmentState?.dataCutoff==='2026-07-31','I6_BASELINE_DATA_CUTOFF_DRIFT');
need(C.environmentState?.augustRefresh==='HOLD','I6_AUGUST_MUST_REMAIN_HOLD_WITHOUT_APPLY_AUTH');

const G=C.gateState||{},g=G.gates||{};
for(const k of ['I0','I1','I2','I3','I4A','I4B','I5']) need(String(g[k]?.status||'').startsWith('PASS'),'I6_PRIOR_GATE_NOT_PASS:'+k);
need(G.lastFormallyCompletedIteration===5,'I6_LAST_COMPLETED_ITERATION_INVALID');
need(G.lastFormallyCompletedGate==='I5','I6_LAST_COMPLETED_GATE_INVALID');
need(G.nextFrozenIteration==='I6','I6_NEXT_ITERATION_INVALID');
const activeI60=g.I6?.status==='IN_PROGRESS_I6_0_BASELINE'&&g.I6?.activeSubgate==='I6.0';
const frozenI60=g.I6?.status==='I6_0_BASELINE_FROZEN'&&g.I6?.activeSubgate==='I6.1';
const frozenI61=g.I6?.status==='I6_1_PRODUCT_GAPS_FROZEN'&&g.I6?.activeSubgate==='I6.2';
const activeI62V5=g.I6?.status==='I6_2_DATA_UPDATE_V5_ACTIVE'&&g.I6?.activeSubgate==='I6.2';
const waitingI63=g.I6?.status==='I6_3_WAITING_FOR_CURRENT_SOURCE'&&g.I6?.activeSubgate==='I6.3';
const activeI63V5=g.I6?.status==='I6_3_DATA_UPDATE_V5_ACTIVE'&&g.I6?.activeSubgate==='I6.3';
const activeI64V5=g.I6?.status==='I6_4_DATA_UPDATE_V5_ACTIVE'&&g.I6?.activeSubgate==='I6.4';
need(activeI60||frozenI60||frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5,'I6_GATE_STATE_INVALID');

need(C.i6Execution?.authorized===true,'I6_NOT_AUTHORIZED');
need(C.i6Execution?.authorizationReceiptPath===AUTH_RECEIPT,'I6_AUTH_RECEIPT_PATH_MISMATCH');
need((activeI60&&C.i6Execution?.activeSubgate==='I6.0')||(frozenI60&&C.i6Execution?.activeSubgate==='I6.1')||((frozenI61||activeI62V5)&&C.i6Execution?.activeSubgate==='I6.2')||((waitingI63||activeI63V5)&&C.i6Execution?.activeSubgate==='I6.3')||(activeI64V5&&C.i6Execution?.activeSubgate==='I6.4'),'I6_EXECUTION_SUBGATE_INVALID');
need(C.i6Execution?.dryRunPrepared===false,'I6_DRYRUN_PREPARED_STATE_INVALID');
const dataUpdateCursor=SRC.execution?.cursorState||'SOURCE_PINNED';
const postDiffCursor=['DETERMINISTIC_DIFF_READY','DETERMINISTIC_APPLY_DONE','POST_WRITE_READBACK_INTEGRITY_PASS','PENDING_USER_VISUAL','LIVE_PASS'].includes(dataUpdateCursor);
need(postDiffCursor||C.i6Execution?.dataMutationAuthorized===false,'I6_DATA_MUTATION_AUTHORIZED_TOO_EARLY');
const i63CodeDefect=C.i63CodeDefect||{};
const i63DefectPending=activeI63V5&&i63CodeDefect.status==='I6_3_CODE_DEFECT_CANDIDATE_PENDING_BUILD';
const i63DefectLive=(activeI63V5||activeI64V5)&&String(i63CodeDefect.status||'').startsWith('I6_3_CODE_DEFECT_SUCCESSOR_LIVE_PASS');
const i63NameCase=C.i63NameCaseNormalization||{};
const i63NameCasePending=activeI63V5&&i63NameCase.status==='AUTHORIZED_PENDING_APPLY';
const i63IdentityMerge=C.i63IdentityMerge||{};
const i63IdentityMergePending=activeI63V5&&i63IdentityMerge.status==='AUTHORIZED_PENDING_APPLY';
const i63DataCorrectionPending=i63NameCasePending||i63IdentityMergePending;
need(!(i63NameCasePending&&i63IdentityMergePending),'I6_3_MULTIPLE_DATA_CORRECTIONS_FORBIDDEN');
need(i63DataCorrectionPending?C.i6Execution?.dataMutationAuthorized===true:C.i6Execution?.dataMutationAuthorized===false,'I6_3_DATA_CORRECTION_AUTH_INVALID');
need(i63DataCorrectionPending?g.I6?.dataMutationAuthorized===true:g.I6?.dataMutationAuthorized===false,'I6_3_DATA_CORRECTION_GATE_AUTH_INVALID');
if(i63NameCasePending){
 need(i63NameCase.userAuthorized===true&&Number(i63NameCase.targetCount)===12&&i63NameCase.field==='nombre'&&i63NameCase.transform==='UPPERCASE_ONLY','I6_3_NAME_CASE_SCOPE_INVALID');
 need(i63NameCase.writePath==='orbit360ProductOperationalCommand'&&i63NameCase.reimportAuthorized===false&&i63NameCase.deletesAuthorized===false&&i63NameCase.unrelatedFieldsAuthorized===false,'I6_3_NAME_CASE_BOUNDARY_INVALID');
}
if(i63IdentityMergePending){
 need(i63IdentityMerge.userAuthorized===true&&Array.isArray(i63IdentityMerge.groups)&&i63IdentityMerge.groups.length===3,'I6_3_IDENTITY_MERGE_SCOPE_INVALID');
 need(Number(i63IdentityMerge.expectedWrites)===6&&Number(i63IdentityMerge.expectedActiveClientsAfter)===439&&Number(i63IdentityMerge.expectedTombstones)===3,'I6_3_IDENTITY_MERGE_COUNTS_INVALID');
 need(i63IdentityMerge.writePath==='orbit360ProductOperationalCommand'&&i63IdentityMerge.physicalDeleteAuthorized===false&&i63IdentityMerge.reimportAuthorized===false&&i63IdentityMerge.unrelatedFieldsAuthorized===false&&i63IdentityMerge.rollbackRequired===true,'I6_3_IDENTITY_MERGE_BOUNDARY_INVALID');
}
need(i63DefectPending?C.i6Execution?.productMutationAuthorized===true:C.i6Execution?.productMutationAuthorized===false,'I6_PRODUCT_MUTATION_AUTH_STATE_INVALID');
need(postDiffCursor||C.i6Execution?.sourceDataApplyAuthorized===false,'I6_SOURCE_APPLY_AUTHORIZED_TOO_EARLY');
need(C.i6Execution?.requiresDiff===true&&C.i6Execution?.requiresDeduplication===true,'I6_DIFF_DEDUP_CONTRACT_INVALID');
need(C.i6Execution?.requiresAudit===true&&C.i6Execution?.requiresRollback===true,'I6_AUDIT_ROLLBACK_CONTRACT_INVALID');
need(A.schemaVersion==='gravicentra-i6-explicit-authorization-receipt-v1','I6_AUTH_RECEIPT_SCHEMA_INVALID');
need(A.authorization?.decision==='AUTHORIZED_BY_OWNER','I6_AUTH_RECEIPT_DECISION_INVALID');
need(A.authorization?.dataMutationAuthorized===false&&A.authorization?.augustRefreshApplyAuthorized===false,'I6_AUTH_RECEIPT_OVERREACH');

need(C.projectSources?.activePackage==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V5','I6_PROJECT_SOURCES_NOT_V5');
need(C.projectSources?.activeVersion===5,'I6_PROJECT_SOURCES_VERSION_INVALID');
need(C.projectSources?.manifestPath===V5_MANIFEST,'I6_PROJECT_SOURCES_MANIFEST_INVALID');
need(C.projectSources?.staticSourceUpdateRequired===false,'I6_PROJECT_SOURCE_UPDATE_FLAG_MUST_BE_CLOSED');
need(C.projectSources?.reason==null,'I6_PROJECT_SOURCE_UPDATE_REASON_MUST_BE_NULL');
need(M.packageId===C.projectSources.activePackage&&M.version===5,'I6_V5_MANIFEST_BINDING_INVALID');
need(git('hash-object',V5_MANIFEST)===C.projectSources.manifestBlobSha,'I6_V5_MANIFEST_BLOB_DRIFT');

if(activeI62V5){
  need(C.i6Execution?.requiresDryRun===false,'I6_V5_DRYRUN_MUST_NOT_BE_MANDATORY');
  need(C.i6Execution?.perBlockApplyRequiresExplicitAuthorization===false,'I6_V5_PER_BLOCK_AUTH_MUST_BE_FALSE');
  need(C.i6Execution?.dataUpdateMode==='EVERGREEN_V5_DELTA_FIRST','I6_V5_DATA_UPDATE_MODE_INVALID');
  need(C.postproductionDataUpdateControl?.status==='FROZEN_ACTIVE','I6_V5_POSTPROD_CONTROL_NOT_FROZEN');
  need(C.postproductionDataUpdateControl?.conversationAsAuthority===false,'I6_V5_CONVERSATION_AUTHORITY_FORBIDDEN');
  need(C.postproductionDataUpdateControl?.requestCurrentSourceBeforeEveryNewModule===true,'I6_V5_SOURCE_REQUEST_RULE_MISSING');
  need(C.postproductionDataUpdateControl?.liveVisualRefreshRequiredForClosure===true,'I6_V5_LIVE_VISUAL_RULE_MISSING');
  need(C.postproductionDataUpdateControl?.pureDataUpdateRequiresBuildOrDeploy===false,'I6_V5_PURE_DATA_RELEASE_RULE_INVALID');
  need(C.postproductionDataUpdateControl?.reimportForVisibilityFailureForbidden===true,'I6_V5_REIMPORT_VISIBILITY_RULE_MISSING');
  need(P.status==='FROZEN_ACTIVE'&&P.resumeContract?.conversationMayOverride===false,'I6_V5_OPERATING_PLAN_INVALID');
  need(D.status==='FROZEN_ACTIVE_V5_DATA_UPDATE_DISCIPLINE'&&D.dataUpdateDiscipline?.askPaulaForCurrentSourceBeforeEachNewModule===true,'I6_V5_DISCIPLINE_INVALID');
  need(RGT.status==='FROZEN_OPERATIONAL_REGISTRY'&&RGT.rules?.neverInventWritePath===true,'I6_V5_REGISTRY_INVALID');
  const cursorNext={
    SOURCE_PINNED:'LIVE_READBACK_CURRENT_STATE',
    LIVE_READBACK_PASS:'DETERMINISTIC_DIFF',
    DETERMINISTIC_DIFF_READY:'APPLY_DETERMINISTIC_DELTA_ONLY',
    DETERMINISTIC_APPLY_DONE:'POST_WRITE_READBACK_AND_INTEGRITY',
    POST_WRITE_READBACK_INTEGRITY_PASS:'USER_VISUAL_REFRESH_CHECK',
    PENDING_USER_VISUAL:'USER_VISUAL_REFRESH_CHECK',
    LIVE_PASS:'NEXT_MODULE'
  };
  need(SRC.status==='PINNED_FOR_V5_DELTA'&&Object.prototype.hasOwnProperty.call(cursorNext,dataUpdateCursor),'I6_V5_ACTIVE_SOURCE_CURSOR_INVALID');
  need(SRC.execution?.nextRequiredStep===cursorNext[dataUpdateCursor],'I6_V5_ACTIVE_SOURCE_NEXT_STEP_INVALID');
  need(C.postproductionDataUpdateControl?.executionCursor===dataUpdateCursor,'I6_V5_CONTROL_CURSOR_MISMATCH');
  need(C.postproductionDataUpdateControl?.nextRequiredStep===SRC.execution?.nextRequiredStep,'I6_V5_CONTROL_NEXT_STEP_MISMATCH');
  for(const [pathKey,blobKey,expectedPath] of [
    ['operatingPlanPath','operatingPlanBlobSha',DATA_UPDATE_PLAN],
    ['executionDisciplinePath','executionDisciplineBlobSha',DATA_UPDATE_DISCIPLINE],
    ['mechanismRegistryPath','mechanismRegistryBlobSha',DATA_UPDATE_REGISTRY],
    ['activeSourceIntakePath','activeSourceIntakeBlobSha',ACTIVE_SOURCE_INTAKE]
  ]){
    need(C.i6Execution?.[pathKey]===expectedPath,'I6_V5_CONTROL_PATH_MISMATCH:'+pathKey);
    need(git('hash-object',expectedPath)===C.i6Execution?.[blobKey],'I6_V5_CONTROL_BLOB_DRIFT:'+blobKey);
  }
  const controlNextByCursor={
    SOURCE_PINNED:'I6_2_LIVE_READBACK_CURRENT_STATE',
    LIVE_READBACK_PASS:'I6_2_DETERMINISTIC_DIFF',
    DETERMINISTIC_DIFF_READY:'I6_2_APPLY_DETERMINISTIC_DELTA',
    DETERMINISTIC_APPLY_DONE:'I6_2_POST_WRITE_READBACK_INTEGRITY',
    POST_WRITE_READBACK_INTEGRITY_PASS:'I6_2_USER_VISUAL_REFRESH_CHECK',
    PENDING_USER_VISUAL:'I6_2_USER_VISUAL_REFRESH_CHECK',
    LIVE_PASS:'I6_3_REQUEST_CURRENT_SOURCE'
  };
  need(C.nextAction===controlNextByCursor[dataUpdateCursor],'I6_V5_NEXT_ACTION_INVALID');
  need(G.lastFormallyCompletedMiniGate==='I6.1','I6_V5_LAST_MINIGATE_INVALID');
}
if(waitingI63){
  const p=C.postproductionExitProgress||{},seal=C.i6Execution?.i6_2||{};
  need(G.lastFormallyCompletedMiniGate==='I6.2'&&g.I6?.lastFrozenMiniGate==='I6.2','I6_2_LAST_MINIGATE_INVALID');
  need(p.formalPercent===30&&p.frozenMiniGates===3&&p.totalMiniGates===10&&p.lastFrozenMiniGate==='I6.2'&&p.activeMiniGate==='I6.3','I6_2_PROGRESS_INVALID');
  need(C.nextAction==='I6_3_REQUEST_CURRENT_CLIENTES_SOURCE','I6_3_NEXT_ACTION_INVALID');
  need(C.i6Execution?.activeModule==='CLIENTES'&&C.i6Execution?.activeModuleStatus==='WAITING_FOR_PAULA_SOURCE','I6_3_MODULE_STATE_INVALID');
  need(C.postproductionDataUpdateControl?.activeModule==='CLIENTES'&&C.postproductionDataUpdateControl?.executionCursor==='WAITING_FOR_SOURCE'&&C.postproductionDataUpdateControl?.nextRequiredStep==='REQUEST_CURRENT_SOURCE_FROM_PAULA','I6_3_CONTROL_CURSOR_INVALID');
  need(SRC.status==='I6_2_DIRECTORIO_LIVE_PASS'&&SRC.execution?.cursorState==='LIVE_PASS'&&SRC.execution?.nextRequiredStep==='MODULE_CLOSED','I6_2_SOURCE_CURSOR_NOT_CLOSED');
  need(exists(I62_RECEIPT)&&seal.status==='I6_2_DIRECTORIO_LIVE_PASS'&&seal.closed===true&&seal.receiptPath===I62_RECEIPT,'I6_2_RECEIPT_MISSING');
  need(git('hash-object',I62_RECEIPT)===seal.receiptBlobSha,'I6_2_RECEIPT_BLOB_DRIFT');
}
if(activeI63V5){
  const p=C.postproductionExitProgress||{},seal=C.i6Execution?.i6_2||{},cursor=SRC3.execution?.cursorState||'SOURCE_PINNED';
  const nextByCursor={SOURCE_PINNED:'LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'APPLY_DETERMINISTIC_DELTA_ONLY',DETERMINISTIC_APPLY_DONE:'POST_WRITE_READBACK_AND_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'NEXT_MODULE'};
  const actionByCursor={SOURCE_PINNED:'I6_3_LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'I6_3_DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'I6_3_APPLY_DETERMINISTIC_DELTA',DETERMINISTIC_APPLY_DONE:'I6_3_POST_WRITE_READBACK_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'I6_3_USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'I6_3_USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'I6_4_REQUEST_CURRENT_SOURCE'};
  need(G.lastFormallyCompletedMiniGate==='I6.2'&&g.I6?.lastFrozenMiniGate==='I6.2','I6_3_LAST_MINIGATE_INVALID');
  need(p.formalPercent===30&&p.frozenMiniGates===3&&p.totalMiniGates===10&&p.lastFrozenMiniGate==='I6.2'&&p.activeMiniGate==='I6.3','I6_3_PROGRESS_INVALID');
  need(Object.prototype.hasOwnProperty.call(nextByCursor,cursor),'I6_3_SOURCE_CURSOR_INVALID');
  const expectedI63Action=i63DefectPending?'I6_3_CODE_DEFECT_SUCCESSOR_RELEASE':actionByCursor[cursor];
  need(C.nextAction===expectedI63Action,'I6_3_NEXT_ACTION_INVALID');
  need(C.i6Execution?.activeModule==='CLIENTES','I6_3_MODULE_INVALID');
  need(C.postproductionDataUpdateControl?.activeModule==='CLIENTES'&&C.postproductionDataUpdateControl?.executionCursor===cursor&&C.postproductionDataUpdateControl?.nextRequiredStep===nextByCursor[cursor],'I6_3_CONTROL_CURSOR_INVALID');
  need(SRC3.status==='PINNED_FOR_V5_DELTA'&&SRC3.module==='CLIENTES'&&SRC3.execution?.nextRequiredStep===nextByCursor[cursor],'I6_3_SOURCE_STATE_INVALID');
  need(C.i6Execution?.activeSourceIntakePath===I63_SOURCE&&C.postproductionDataUpdateControl?.activeSourceIntakePath===I63_SOURCE,'I6_3_SOURCE_PATH_MISMATCH');
  need(git('hash-object',I63_SOURCE)===C.i6Execution?.activeSourceIntakeBlobSha&&git('hash-object',I63_SOURCE)===C.postproductionDataUpdateControl?.activeSourceIntakeBlobSha,'I6_3_SOURCE_BLOB_DRIFT');
  need(SRC3.source?.sha256===C.postproductionDataUpdateControl?.sourceSha256,'I6_3_SOURCE_SHA_MISMATCH');
  need(git('hash-object',DATA_UPDATE_REGISTRY)===C.i6Execution?.mechanismRegistryBlobSha&&git('hash-object',DATA_UPDATE_REGISTRY)===C.postproductionDataUpdateControl?.mechanismRegistryBlobSha,'I6_3_REGISTRY_BLOB_DRIFT');
  need(RGT.modules?.CLIENTES?.sourceState==='CURRENT_SOURCE_PINNED'&&RGT.modules?.CLIENTES?.sourceIntakePath===I63_SOURCE,'I6_3_REGISTRY_SOURCE_NOT_PINNED');
  need(C.moduleHandoffControl?.current?.paulaVisualAcceptance==='ACCEPTED'&&C.moduleHandoffControl?.current?.nextSourceRequestBlocked===false,'I6_2_PAULA_VISUAL_HANDOFF_NOT_ACCEPTED');
  need(exists(I62_RECEIPT)&&seal.status==='I6_2_DIRECTORIO_LIVE_PASS'&&seal.closed===true,'I6_2_RECEIPT_MISSING');
}


if(activeI64V5){
  const p=C.postproductionExitProgress||{},seal=C.i6Execution?.i6_3||{},cursor=SRC4.execution?.cursorState||'SOURCE_PINNED';
  const nextByCursor={SOURCE_PINNED:'LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'APPLY_DETERMINISTIC_DELTA_ONLY',DETERMINISTIC_APPLY_DONE:'POST_WRITE_READBACK_AND_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'NEXT_MODULE'};
  const actionByCursor={SOURCE_PINNED:'I6_4_LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'I6_4_DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'I6_4_APPLY_DETERMINISTIC_DELTA',DETERMINISTIC_APPLY_DONE:'I6_4_POST_WRITE_READBACK_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'I6_4_USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'I6_4_USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'I6_5_REQUEST_CURRENT_SOURCE'};
  need(G.lastFormallyCompletedMiniGate==='I6.3'&&g.I6?.lastFrozenMiniGate==='I6.3','I6_4_LAST_MINIGATE_INVALID');
  need(p.formalPercent===40&&p.frozenMiniGates===4&&p.totalMiniGates===10&&p.lastFrozenMiniGate==='I6.3'&&p.activeMiniGate==='I6.4','I6_4_PROGRESS_INVALID');
  need(Object.prototype.hasOwnProperty.call(nextByCursor,cursor),'I6_4_SOURCE_CURSOR_INVALID');
  need(C.nextAction===actionByCursor[cursor],'I6_4_NEXT_ACTION_INVALID');
  need(C.i6Execution?.activeModule==='POLIZAS_RIESGOS_VEHICULOS','I6_4_MODULE_INVALID');
  need(C.postproductionDataUpdateControl?.activeModule==='POLIZAS_RIESGOS_VEHICULOS'&&C.postproductionDataUpdateControl?.executionCursor===cursor&&C.postproductionDataUpdateControl?.nextRequiredStep===nextByCursor[cursor],'I6_4_CONTROL_CURSOR_INVALID');
  need(SRC4.status==='PINNED_FOR_V5_DELTA'&&SRC4.module==='POLIZAS_RIESGOS_VEHICULOS'&&SRC4.execution?.nextRequiredStep===nextByCursor[cursor],'I6_4_SOURCE_STATE_INVALID');
  need(C.i6Execution?.activeSourceIntakePath===I64_SOURCE&&C.postproductionDataUpdateControl?.activeSourceIntakePath===I64_SOURCE,'I6_4_SOURCE_PATH_MISMATCH');
  need(git('hash-object',I64_SOURCE)===C.i6Execution?.activeSourceIntakeBlobSha&&git('hash-object',I64_SOURCE)===C.postproductionDataUpdateControl?.activeSourceIntakeBlobSha,'I6_4_SOURCE_BLOB_DRIFT');
  need(SRC4.sourceBundle?.sha256===C.postproductionDataUpdateControl?.sourceSha256,'I6_4_SOURCE_SHA_MISMATCH');
  need(git('hash-object',DATA_UPDATE_REGISTRY)===C.i6Execution?.mechanismRegistryBlobSha&&git('hash-object',DATA_UPDATE_REGISTRY)===C.postproductionDataUpdateControl?.mechanismRegistryBlobSha,'I6_4_REGISTRY_BLOB_DRIFT');
  need(RGT.modules?.POLIZAS_RIESGOS_VEHICULOS?.sourceState==='CURRENT_SOURCE_PINNED'&&RGT.modules?.POLIZAS_RIESGOS_VEHICULOS?.sourceIntakePath===I64_SOURCE,'I6_4_REGISTRY_SOURCE_NOT_PINNED');
  need(SRC3.status==='I6_3_CLIENTES_LIVE_PASS'&&SRC3.execution?.cursorState==='LIVE_PASS'&&SRC3.execution?.nextRequiredStep==='MODULE_CLOSED','I6_3_SOURCE_CURSOR_NOT_CLOSED');
  need(R63.status==='I6_3_CLIENTES_LIVE_PASS'&&seal.status==='I6_3_CLIENTES_LIVE_PASS'&&seal.closed===true&&seal.receiptPath===I63_RECEIPT,'I6_3_RECEIPT_MISSING');
  need(git('hash-object',I63_RECEIPT)===seal.receiptBlobSha,'I6_3_RECEIPT_BLOB_DRIFT');
}

const R=C.certifiedCandidate||{};
if(activeI63V5&&i63DefectPending&&i63CodeDefect.previousCertifiedSourceSha){
  need(R.sourceSha===i63CodeDefect.previousCertifiedSourceSha,'I6_3_PREVIOUS_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i63CodeDefect.previousCertifiedBuildId,'I6_3_PREVIOUS_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i63CodeDefect.previousCertifiedArtifactId),'I6_3_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');
}
else if((activeI63V5||activeI64V5)&&i63DefectLive){need(R.sourceSha===i63CodeDefect.sourceSha,'I6_3_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i63CodeDefect.buildId,'I6_3_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i63CodeDefect.artifactId),'I6_3_CERTIFIED_ARTIFACT_DRIFT');}
else if(frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5){need(R.sourceSha===C.i61LiveSeal?.sourceSha,'I6_CERTIFIED_SOURCE_DRIFT');need(R.buildId===C.i61LiveSeal?.buildId,'I6_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(C.i61LiveSeal?.artifactId),'I6_CERTIFIED_ARTIFACT_DRIFT');}
else{need(R.sourceSha==='16f174d087024085eff18079c486f717ef98d691','I6_CERTIFIED_SOURCE_DRIFT');need(R.buildId==='gi-i3-16f174d08702-57f234755dc1','I6_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===10183074943,'I6_CERTIFIED_ARTIFACT_DRIFT');}
need(S.schemaVersion==='gravicentra-capability-status-ledger-v1','I6_LEDGER_SCHEMA_INVALID');
need(Array.isArray(S.capabilities)&&S.capabilities.length===15,'I6_LEDGER_COUNT_INVALID');
need(S.capabilities.every(x=>x.liveAcceptance?.status==='LATEST_APPROVED_VERSION_LIVE_PASS'),'I6_PRIOR_LIVE_PASS_NOT_PRESERVED');
need(S.releaseBinding?.sourceSha===R.sourceSha&&S.releaseBinding?.buildId===R.buildId&&Number(S.releaseBinding?.artifactId)===Number(R.artifactId),'I6_LEDGER_RELEASE_BINDING_MISMATCH');

// I6_0_MATERIAL_FREEZE_GUARD_V1
if(frozenI60){
 const seal=C.i6BaselineSeal||{},p=C.postproductionExitProgress||{},root=seal.evidenceRoot,sh=f=>execFileSync('sha256sum',[f],{encoding:'utf8'}).trim().split(/\s+/)[0];
 need(G.lastFormallyCompletedMiniGate==='I6.0'&&p.formalPercent===10&&p.frozenMiniGates===1&&p.totalMiniGates===10&&p.lastFrozenMiniGate==='I6.0'&&p.activeMiniGate==='I6.1','I6_0_PROGRESS_INVALID');
 need(['I6_1_FUNCTIONAL_CLOSURE','I6_1_AUTHENTICATED_HUMAN_PREVIEW_ACCEPTANCE','AUTHORIZE_I6_1_SUCCESSOR_PRODUCTION_PROMOTION'].includes(C.nextAction)&&seal.status==='I6_0_BASELINE_FROZEN'&&seal.executorPath==='.github/workflows/gravicentra-material-baseline-freeze.yml'&&C.postI5Governance?.i6ExecutorPath==='.github/workflows/gravicentra-material-baseline-freeze.yml','I6_0_EXECUTOR_OR_NEXT_INVALID');
 need(seal.sourceSha===R.sourceSha&&seal.sourceTree===R.sourceTree&&seal.buildId===R.buildId&&Number(seal.artifactId)===Number(R.artifactId)&&seal.artifactArchiveDigest===R.artifactArchiveDigest,'I6_0_RELEASE_BINDING_MISMATCH');
 const z=root+'/zero-writes.json',sn=root+'/snapshot-readback.json',rb=root+'/rollback.json',integ=root+'/integrity.json',arc=root+'/rollback/accepted-i3-actions-artifact.zip';for(const f of [z,sn,rb,integ,arc])need(exists(f),'I6_0_EVIDENCE_MISSING:'+f);
 need(sh(z)===seal.zeroWritesSha256&&sh(sn)===seal.snapshotReadbackSha256&&sh(rb)===seal.rollbackReceiptSha256&&sh(integ)===seal.integritySha256&&sh(arc)===seal.rollbackArchiveSha256,'I6_0_EVIDENCE_HASH_DRIFT');
 const Z=readJson(z),SN=readJson(sn),RB=readJson(rb),IN=readJson(integ);need(Z.status==='PASS'&&Z.operationalWritesExecuted===0&&Z.firestoreStateStable===true,'I6_0_ZERO_WRITES_INVALID');need(SN.status==='PASS'&&SN.firestoreStableDuringExecutor===true&&SN.productionHostedReadbackExact===true,'I6_0_SNAPSHOT_INVALID');need(RB.status==='MATERIAL_ROLLBACK_PACKAGE_READY'&&RB.rollbackArchiveMatchesCertifiedArtifact===true&&seal.rollbackArchiveSha256===String(R.artifactArchiveDigest).replace(/^sha256:/,''),'I6_0_ROLLBACK_INVALID');need(IN.status==='PASS'&&IN.releaseBindingCoherent===true&&IN.rollbackArchiveMatchesCertifiedArtifact===true&&IN.operationalWritesExecuted===0,'I6_0_INTEGRITY_INVALID');for(const [rel,h] of Object.entries(IN.evidenceHashesSha256||{}))need(exists(root+'/'+rel)&&sh(root+'/'+rel)===h,'I6_0_INTEGRITY_MEMBER_DRIFT:'+rel);
 if(seal.postGuardPass===true){need(exists(seal.postGuardReceiptPath)&&sh(seal.postGuardReceiptPath)===seal.postGuardReceiptSha256,'I6_0_POST_GUARD_RECEIPT_INVALID');need(readJson(seal.postGuardReceiptPath).status==='PASS','I6_0_POST_GUARD_NOT_PASS');}
}
const current=git('rev-parse','HEAD');
try{execFileSync('git',['merge-base','--is-ancestor',R.sourceSha,current],{stdio:'ignore'});}catch{throw new Error('I6_CERTIFIED_SOURCE_NOT_ANCESTOR');}
const allowedPrefixes=['.github/workflows/gravicentra-','.github/i6-ephemeral/','tools/gravicentra-','artifacts/orbit360-recovery/release-control/','artifacts/orbit360-recovery/project-sources-v2/'];
const changed=git('diff','--name-only',R.sourceSha+'..'+current).split(/\r?\n/).filter(Boolean);
const successor=C.nextCandidate&&C.nextCandidate.gate==='I6.1'?C.nextCandidate:null;
const allowedSuccessorProduct=new Set(successor&&Array.isArray(successor.allowedProductFiles)?successor.allowedProductFiles:[]);
const allowedI63Product=new Set((i63DefectPending||i63DefectLive)&&Array.isArray(i63CodeDefect.allowedProductFiles)?i63CodeDefect.allowedProductFiles:[]);
const forbidden=changed.filter(p=>!allowedPrefixes.some(prefix=>p.startsWith(prefix))&&!allowedSuccessorProduct.has(p)&&!allowedI63Product.has(p));
need(forbidden.length===0,'I6_PRODUCT_SOURCE_DRIFT_OUTSIDE_BOUND_SUCCESSOR:'+forbidden.slice(0,20).join(','));
if(i63DefectPending||i63DefectLive){
 need(i63CodeDefect.classification==='CODE_DEFECT','I6_3_DEFECT_CLASS_INVALID');
 need(i63CodeDefect.parentCertifiedSourceSha===C.i61LiveSeal?.sourceSha,'I6_3_DEFECT_PARENT_INVALID');
 need(Array.isArray(i63CodeDefect.allowedProductFiles)&&i63CodeDefect.allowedProductFiles.length===3,'I6_3_DEFECT_SCOPE_INVALID');
 need(i63CodeDefect.allowedProductFiles.includes('orbit360-platform/core/tenant-access-policy-contract-p0.js'),'I6_3_DEFECT_POLICY_OWNER_MISSING');
 need(i63CodeDefect.allowedProductFiles.includes('orbit360-platform/core/access-scope.js'),'I6_3_DEFECT_SCOPE_OWNER_MISSING');
 need(i63CodeDefect.allowedProductFiles.includes('orbit360-platform/modules/cliente360.js'),'I6_3_DEFECT_UI_OWNER_MISSING');
 need(i63CodeDefect.reimportAuthorized===false&&i63CodeDefect.dataMutationAuthorized===false,'I6_3_DEFECT_DATA_BOUNDARY_INVALID');
 if(i63DefectLive){need(/^[0-9a-f]{40}$/.test(String(i63CodeDefect.sourceSha||'')),'I6_3_DEFECT_SOURCE_INVALID');need(i63CodeDefect.productionReadbackExact===true&&i63CodeDefect.functionalPass===true,'I6_3_DEFECT_LIVE_PROOF_INVALID');}
}
if(successor){
 need(frozenI60||frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5,'I6_1_SUCCESSOR_OUTSIDE_ACTIVE_SUBGATE');
 need(/^[0-9a-f]{40}$/.test(String(successor.sourceSha||'')),'I6_1_SUCCESSOR_SHA_INVALID');
 need(successor.parentCertifiedSourceSha===(frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5?C.preI61CertifiedCandidate?.sourceSha:R.sourceSha),'I6_1_SUCCESSOR_PARENT_MISMATCH');
 need(['PREVIEW_TECHNICAL_PASS_AWAITING_AUTHENTICATED_HUMAN_ACCEPTANCE','I6_1_PRODUCT_SUCCESSOR_PREVIEW_PASS','I6_1_PRODUCT_SUCCESSOR_LIVE_PASS'].includes(successor.status),'I6_1_SUCCESSOR_STATUS_INVALID');
 need(successor.readbackExact===true&&Number(successor.readbackFileCount)>0,'I6_1_SUCCESSOR_READBACK_INVALID');
 try{execFileSync('git',['merge-base','--is-ancestor',successor.sourceSha,current],{stdio:'ignore'});}catch{throw new Error('I6_1_SUCCESSOR_NOT_ANCESTOR');}
}

console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
console.log('CONTROL_STATUS='+C.status);
console.log('I6_GATE='+g.I6.status);
console.log('I6_SUBGATE='+g.I6.activeSubgate);
console.log('I6_AUTHORIZED=true');
console.log('DATA_MUTATION_AUTHORIZED='+String(C.i6Execution.dataMutationAuthorized===true));
console.log('AUGUST_REFRESH='+C.environmentState.augustRefresh);
console.log('PROJECT_SOURCES='+C.projectSources.activePackage);
console.log('DATA_UPDATE_MODE='+String(C.i6Execution.dataUpdateMode||''));
console.log('PRODUCT_SOURCE_DRIFT=false');
