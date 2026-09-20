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
const I64_RECEIPT='artifacts/orbit360-recovery/release-control/I6_4_POLIZAS_RIESGOS_LIVE_PASS_20260918.json';
const I65_SOURCE='artifacts/orbit360-recovery/release-control/I6_5_RECIBOS_CARTERA_SOURCE_INTAKE_20260918.json';
const I65_MINI='artifacts/orbit360-recovery/release-control/I6_5_MINI_CIERRE_OPERATIVO_DECISION_LOCK_20260918.json';
const I65_SELF_ADMIN='artifacts/orbit360-recovery/release-control/I6_5_BLOCK_A_D_SELF_ADMINISTRATION_LOCK_20260918.json';
const I65_ANTI_DRIFT='artifacts/orbit360-recovery/release-control/I6_5_CONTINUITY_ANTI_DRIFT_LOCK_20260918.json';
const I65_RELEASE_SYNC='artifacts/orbit360-recovery/release-control/I6_RELEASE_MECHANISM_ANTI_DESYNC_LOCK_20260918.json';
const I65_FORENSIC_AUDIT='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_AUDIT_20260919.json';
const I65_FORENSIC_PLAN='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_REMEDIATION_PLAN_LOCK_20260919.json';
const I65_FORENSIC_ADDENDUM='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_REMEDIATION_ADDENDUM_20260919.md';
const I65_PAYMENT_INFERENCE='artifacts/orbit360-recovery/release-control/I6_5_I6_6_PAYMENT_INFERENCE_RECONCILIATION_LOCK_20260919.json';
const I65_FORENSIC_B1='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const I65_SYNC='artifacts/orbit360-recovery/release-control/I6_5_SYNC_COMPOSITION_PREFLIGHT_20260918.json';
const I65_DIFF='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_DIFF_20260918.json';
const I65_APPLY_ENC='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_APPLY_PAYLOAD_20260918.enc.json';
const I65_APPLY_AUTH='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_APPLY_AUTH_LOCK_20260918.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const exists=p=>fs.existsSync(p);
const stable=v=>{if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const sameJson=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

need(MODE==='governance'||MODE==='i6','I6_GUARD_MODE_INVALID:'+MODE);
for(const p of [CONTROL,STATUS_LEDGER,AUTH_RECEIPT,I6_ADDENDUM,I6_PLAN_LOCK,V5_MANIFEST,DATA_UPDATE_PLAN,DATA_UPDATE_DISCIPLINE,DATA_UPDATE_REGISTRY,ACTIVE_SOURCE_INTAKE,I63_SOURCE,I63_RECEIPT,I64_SOURCE,I64_RECEIPT,I65_SOURCE,I65_SYNC,I65_FORENSIC_AUDIT,I65_FORENSIC_PLAN,I65_FORENSIC_ADDENDUM,I65_PAYMENT_INFERENCE,I65_FORENSIC_B1]) need(exists(p),'I6_REQUIRED_FILE_MISSING:'+p);
const C=readJson(CONTROL),S=readJson(STATUS_LEDGER),A=readJson(AUTH_RECEIPT),M=readJson(V5_MANIFEST),FRA=readJson(I65_FORENSIC_AUDIT),FRP=readJson(I65_FORENSIC_PLAN),PAY=readJson(I65_PAYMENT_INFERENCE),B1=readJson(I65_FORENSIC_B1);
const P=readJson(DATA_UPDATE_PLAN),D=readJson(DATA_UPDATE_DISCIPLINE),RGT=readJson(DATA_UPDATE_REGISTRY),SRC=readJson(ACTIVE_SOURCE_INTAKE),SRC3=readJson(I63_SOURCE),R63=readJson(I63_RECEIPT),SRC4=readJson(I64_SOURCE),R64=readJson(I64_RECEIPT),SRC5=readJson(I65_SOURCE),SYNC5=readJson(I65_SYNC);
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
const activeI65Sync=g.I6?.status==='I6_5_RECIBOS_CARTERA_SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK'&&g.I6?.activeSubgate==='I6.5';
const activeI65V5=g.I6?.status==='I6_5_DATA_UPDATE_V5_ACTIVE'&&g.I6?.activeSubgate==='I6.5';
const activeI65=activeI65Sync||activeI65V5;
need(activeI60||frozenI60||frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5||activeI65,'I6_GATE_STATE_INVALID');

need(C.i6Execution?.authorized===true,'I6_NOT_AUTHORIZED');
need(C.i6Execution?.authorizationReceiptPath===AUTH_RECEIPT,'I6_AUTH_RECEIPT_PATH_MISMATCH');
need((activeI60&&C.i6Execution?.activeSubgate==='I6.0')||(frozenI60&&C.i6Execution?.activeSubgate==='I6.1')||((frozenI61||activeI62V5)&&C.i6Execution?.activeSubgate==='I6.2')||((waitingI63||activeI63V5)&&C.i6Execution?.activeSubgate==='I6.3')||(activeI64V5&&C.i6Execution?.activeSubgate==='I6.4')||(activeI65&&C.i6Execution?.activeSubgate==='I6.5'),'I6_EXECUTION_SUBGATE_INVALID');
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
const i64VisualCorrection=C.i64VisualCorrection||{};
const i64VisualCorrectionPending=activeI64V5&&i64VisualCorrection.status==='AUTHORIZED_PENDING_APPLY';
const i64CodeDefect=C.i64CodeDefect||{};
const i64DefectPending=activeI64V5&&i64CodeDefect.status==='I6_4_CODE_DEFECT_CANDIDATE_PENDING_BUILD';
const i64DefectLive=activeI64V5&&String(i64CodeDefect.status||'').startsWith('I6_4_CODE_DEFECT_SUCCESSOR_LIVE_PASS');
const i65SyncCodeDefect=C.i65SyncCodeDefect||{};
const i65HydrationDefect=C.i65HydrationDefect||{};
const i65HydrationDiagnosticPending=activeI65&&i65HydrationDefect.status==='I6_5_HYDRATION_DIAGNOSTIC_PENDING';
const i65HydrationDiagnosticPass=activeI65&&i65HydrationDefect.status==='I6_5_HYDRATION_DIAGNOSTIC_PASS';
const i65HydrationDefectPending=activeI65&&i65HydrationDefect.status==='I6_5_HYDRATION_CODE_DEFECT_CANDIDATE_PENDING_BUILD';
const i65HydrationDefectLive=activeI65&&String(i65HydrationDefect.status||'').startsWith('I6_5_HYDRATION_CODE_DEFECT_SUCCESSOR_LIVE_PASS');
const i65OperationalClosure=C.i65OperationalClosureDefect||{};
const i65OperationalClosurePending=activeI65&&i65OperationalClosure.status==='I6_5_OPERATIONAL_CLOSURE_CODE_DEFECT_CANDIDATE_PENDING_BUILD';
const i65OperationalClosureLive=activeI65&&String(i65OperationalClosure.status||'').startsWith('I6_5_OPERATIONAL_CLOSURE_CODE_DEFECT_SUCCESSOR_LIVE_PASS');
const i65SyncDefectPending=activeI65Sync&&i65SyncCodeDefect.status==='I6_5_SYNC_CODE_DEFECT_CANDIDATE_PENDING_BUILD';
const i65SyncDefectLive=activeI65&&String(i65SyncCodeDefect.status||'').startsWith('I6_5_SYNC_CODE_DEFECT_SUCCESSOR_LIVE_PASS');
const dataCorrectionPending=i63DataCorrectionPending||i64VisualCorrectionPending;
need(!(i63NameCasePending&&i63IdentityMergePending),'I6_3_MULTIPLE_DATA_CORRECTIONS_FORBIDDEN');
need(!(i63DataCorrectionPending&&i64VisualCorrectionPending),'I6_MULTIPLE_GATE_DATA_CORRECTIONS_FORBIDDEN');
need(dataCorrectionPending?C.i6Execution?.dataMutationAuthorized===true:C.i6Execution?.dataMutationAuthorized===false,'I6_DATA_CORRECTION_AUTH_INVALID');
need(dataCorrectionPending?g.I6?.dataMutationAuthorized===true:g.I6?.dataMutationAuthorized===false,'I6_DATA_CORRECTION_GATE_AUTH_INVALID');
if(i63NameCasePending){
 need(i63NameCase.userAuthorized===true&&Number(i63NameCase.targetCount)===12&&i63NameCase.field==='nombre'&&i63NameCase.transform==='UPPERCASE_ONLY','I6_3_NAME_CASE_SCOPE_INVALID');
 need(i63NameCase.writePath==='orbit360ProductOperationalCommand'&&i63NameCase.reimportAuthorized===false&&i63NameCase.deletesAuthorized===false&&i63NameCase.unrelatedFieldsAuthorized===false,'I6_3_NAME_CASE_BOUNDARY_INVALID');
}
if(i63IdentityMergePending){
 need(i63IdentityMerge.userAuthorized===true&&Array.isArray(i63IdentityMerge.groups)&&i63IdentityMerge.groups.length===3,'I6_3_IDENTITY_MERGE_SCOPE_INVALID');
 need(Number(i63IdentityMerge.expectedWrites)===6&&Number(i63IdentityMerge.expectedActiveClientsAfter)===439&&Number(i63IdentityMerge.expectedTombstones)===3,'I6_3_IDENTITY_MERGE_COUNTS_INVALID');
 need(i63IdentityMerge.writePath==='orbit360ProductOperationalCommand'&&i63IdentityMerge.physicalDeleteAuthorized===false&&i63IdentityMerge.reimportAuthorized===false&&i63IdentityMerge.unrelatedFieldsAuthorized===false&&i63IdentityMerge.rollbackRequired===true,'I6_3_IDENTITY_MERGE_BOUNDARY_INVALID');
}
if(i64VisualCorrectionPending){
 need(i64VisualCorrection.userAuthorized===true&&Number(i64VisualCorrection.expectedDomiciliadoPolicies)===319&&Number(i64VisualCorrection.expectedUniquePolicyWrites)===320&&Number(i64VisualCorrection.expectedCountryCurrencyCorrections)===2,'I6_4_VISUAL_CORRECTION_SCOPE_INVALID');
 need(i64VisualCorrection.writePath==='orbit360ProductOperationalCommand'&&i64VisualCorrection.reimportAuthorized===false&&i64VisualCorrection.deletesAuthorized===false&&i64VisualCorrection.receiptsWritesAuthorized===false&&i64VisualCorrection.carteraWritesAuthorized===false&&i64VisualCorrection.cobrosWritesAuthorized===false&&i64VisualCorrection.commissionWritesAuthorized===false&&i64VisualCorrection.rollbackRequired===true,'I6_4_VISUAL_CORRECTION_BOUNDARY_INVALID');
}
need((i63DefectPending||i64DefectPending||i65SyncDefectPending||i65HydrationDefectPending||i65OperationalClosurePending)?C.i6Execution?.productMutationAuthorized===true:C.i6Execution?.productMutationAuthorized===false,'I6_PRODUCT_MUTATION_AUTH_STATE_INVALID');
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
  const expectedI64Action=i64DefectPending?'I6_4_CODE_DEFECT_SUCCESSOR_RELEASE':actionByCursor[cursor];
  need(C.nextAction===expectedI64Action,'I6_4_NEXT_ACTION_INVALID');
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

if(activeI65){
  const p=C.postproductionExitProgress||{},seal=C.i6Execution?.i6_4||{},cursor=SRC5.execution?.cursorState||'SOURCE_PINNED';
  need(C.i65MiniClosurePlan?.path===I65_MINI&&C.i65MiniClosurePlan?.status==='FROZEN_ACTIVE'&&C.i65MiniClosurePlan?.conversationDependent===false&&C.i65MiniClosurePlan?.structuralPlanImmutable===true,'I6_5_MINIPLAN_AUTHORITY_INVALID');
  need(git('hash-object',I65_MINI)===C.i65MiniClosurePlan?.blobSha,'I6_5_MINIPLAN_BLOB_DRIFT');
  need(C.i65SelfAdministrationClosure?.path===I65_SELF_ADMIN&&C.i65SelfAdministrationClosure?.status==='FROZEN_ACTIVE'&&C.i65SelfAdministrationClosure?.conversationDependent===false&&C.i65SelfAdministrationClosure?.noHardcodedIdentities===true&&C.i65SelfAdministrationClosure?.backendCommitRequired===true,'I6_5_SELF_ADMIN_AUTHORITY_INVALID');
  need(git('hash-object',I65_SELF_ADMIN)===C.i65SelfAdministrationClosure?.blobSha,'I6_5_SELF_ADMIN_BLOB_DRIFT');
  const SA=readJson(I65_SELF_ADMIN);
  need(SA.status==='FROZEN_ACTIVE'&&SA.parentMicroplanBlobSha===C.i65MiniClosurePlan?.blobSha&&SA.acceptance?.users==='NO_HARDCODED_IDENTITIES; CREATE_EDIT_DELETE_ACTIVATE_DEACTIVATE; SERVER_COMMIT; CANONICAL_READBACK; RECORDS_AND_SESSION_PERSIST_AFTER_REFRESH','I6_5_SELF_ADMIN_BINDING_INVALID');
  need(C.i65ContinuityAntiDrift?.path===I65_ANTI_DRIFT&&C.i65ContinuityAntiDrift?.status==='FROZEN_ACTIVE'&&C.i65ContinuityAntiDrift?.conversationAsAuthority===false&&C.i65ContinuityAntiDrift?.parallelPlanForbidden===true,'I6_5_ANTI_DRIFT_AUTHORITY_INVALID');
  need(git('hash-object',I65_ANTI_DRIFT)===C.i65ContinuityAntiDrift?.blobSha,'I6_5_ANTI_DRIFT_BLOB_DRIFT');
  need(C.i65ReleaseMechanismAntiDesync?.path===I65_RELEASE_SYNC&&C.i65ReleaseMechanismAntiDesync?.status==='FROZEN_ACTIVE'&&C.i65ReleaseMechanismAntiDesync?.duplicateJobIdsResolved===true&&C.i65ReleaseMechanismAntiDesync?.previewReferenceCheckResolved===true&&C.i65ReleaseMechanismAntiDesync?.proofRoleSurfaceResolved===true&&C.i65ReleaseMechanismAntiDesync?.noHardcodedIdentities===true&&C.i65ReleaseMechanismAntiDesync?.dataMutationAuthorized===false&&C.i65ReleaseMechanismAntiDesync?.deterministicApplyRepeatAuthorized===false,'I6_5_RELEASE_ANTI_DESYNC_INVALID');
  need(git('hash-object',I65_RELEASE_SYNC)===C.i65ReleaseMechanismAntiDesync?.blobSha,'I6_5_RELEASE_ANTI_DESYNC_BLOB_DRIFT');
  const FR=C.i65ForensicRemediationPlan||{};
  need(FR.status==='FROZEN_ACTIVE'&&FR.planPath===I65_FORENSIC_PLAN&&FR.addendumPath===I65_FORENSIC_ADDENDUM&&FR.forensicAuditPath===I65_FORENSIC_AUDIT&&FR.paymentInferenceLockPath===I65_PAYMENT_INFERENCE,'I6_5_FORENSIC_AUTHORITY_INVALID');
  need(git('hash-object',I65_FORENSIC_PLAN)===FR.planBlobSha&&git('hash-object',I65_FORENSIC_ADDENDUM)===FR.addendumBlobSha&&git('hash-object',I65_FORENSIC_AUDIT)===FR.forensicAuditBlobSha&&git('hash-object',I65_PAYMENT_INFERENCE)===FR.paymentInferenceBlobSha,'I6_5_FORENSIC_BLOB_DRIFT');
  need(FRP.status==='FROZEN_ACTIVE'&&FRP.candidateRule==='ONE_ACCUMULATIVE_INCREMENTAL_CANDIDATE_ONLY'&&FRP.visualizationRule.includes('EVERY_BLOCK'),'I6_5_FORENSIC_PLAN_INVALID');
  need(FRA.status==='PASS_WITH_BLOCKING_FINDINGS'&&FRA.mode==='READ_ONLY_AUDIT_NO_PRODUCT_OR_DATA_WRITES','I6_5_FORENSIC_AUDIT_INVALID');
  need(PAY.status==='FROZEN_ACTIVE'&&PAY.autoCommitPolicy?.enabled===true&&PAY.backfillBehavior?.createMissingConfirmedCobrosForPriorInstallments===true,'I6_5_PAYMENT_INFERENCE_LOCK_INVALID');
  need(FR.b1ExecutionLockPath===I65_FORENSIC_B1&&git('hash-object',I65_FORENSIC_B1)===FR.b1ExecutionLockBlobSha,'I6_5_B1_LOCK_DRIFT');
  need(B1.block==='B1'&&B1.conversationDependent===false&&B1.boundaries?.dataMutationAuthorized===false&&B1.boundaries?.reimportAuthorized===false&&B1.boundaries?.liveHostingPromotionAuthorized===false,'I6_5_B1_BOUNDARY_INVALID');

  const AD=readJson(I65_ANTI_DRIFT);
  need(AD.status==='FROZEN_ACTIVE'&&AD.authority?.microplan?.blobSha===C.i65MiniClosurePlan?.blobSha&&AD.authority?.sourceIntake?.path===I65_SOURCE&&AD.authority?.sourceIntake?.mutableExecutionSnapshotAllowed===true,'I6_5_ANTI_DRIFT_BINDING_INVALID');
  need(/^[0-9a-f]{40}$/.test(String(AD.authority?.sourceIntake?.baselineBlobSha||'')),'I6_5_ANTI_DRIFT_BASELINE_BLOB_INVALID');
  need(AD.authority?.sourceIntake?.sourceBundleSha256===SRC5.sourceBundle?.sha256&&C.i65ContinuityAntiDrift?.sourceBundleSha256===SRC5.sourceBundle?.sha256,'I6_5_ANTI_DRIFT_SOURCE_BUNDLE_INVALID');
  need(SRC5.repinVerification20260918?.status==='EXACT_MATCH_8_OF_8'&&SRC5.repinVerification20260918?.sourceBundleSemanticIdentityUnchanged===true&&SRC5.repinVerification20260918?.sourceBundleSha256===SRC5.sourceBundle?.sha256,'I6_5_SOURCE_REPIN_EVIDENCE_INVALID');
  const frozenContract=AD.sourceContract||{};
  need(sameJson(frozenContract.sourceBundle,SRC5.sourceBundle),'I6_5_SOURCE_BUNDLE_STRUCTURE_DRIFT');
  need(sameJson(frozenContract.coverage,SRC5.coverage),'I6_5_SOURCE_COVERAGE_DRIFT');
  need(sameJson(frozenContract.temporalScope,SRC5.temporalScope),'I6_5_SOURCE_TEMPORAL_SCOPE_DRIFT');
  need(sameJson(frozenContract.sourcePrecedence,SRC5.sourcePrecedence),'I6_5_SOURCE_PRECEDENCE_DRIFT');
  need(sameJson(frozenContract.invariants,SRC5.invariants),'I6_5_SOURCE_INVARIANTS_DRIFT');
  const nextByCursor={SOURCE_PINNED:'LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'APPLY_DETERMINISTIC_DELTA_ONLY',DETERMINISTIC_APPLY_DONE:'POST_WRITE_READBACK_AND_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'NEXT_MODULE'};
  const actionByCursor={SOURCE_PINNED:'I6_5_LIVE_READBACK_CURRENT_STATE',LIVE_READBACK_PASS:'I6_5_DETERMINISTIC_DIFF',DETERMINISTIC_DIFF_READY:'I6_5_APPLY_DETERMINISTIC_DELTA',DETERMINISTIC_APPLY_DONE:'I6_5_POST_WRITE_READBACK_INTEGRITY',POST_WRITE_READBACK_INTEGRITY_PASS:'I6_5_USER_VISUAL_REFRESH_CHECK',PENDING_USER_VISUAL:'I6_5_USER_VISUAL_REFRESH_CHECK',LIVE_PASS:'I6_6_REQUEST_CURRENT_SOURCE'};
  need(G.lastFormallyCompletedMiniGate==='I6.4'&&g.I6?.lastFrozenMiniGate==='I6.4','I6_5_LAST_MINIGATE_INVALID');
  need(p.formalPercent===50&&p.frozenMiniGates===5&&p.totalMiniGates===10&&p.lastFrozenMiniGate==='I6.4'&&p.activeMiniGate==='I6.5','I6_5_PROGRESS_INVALID');
  need(C.i6Execution?.activeModule==='RECIBOS_CARTERA','I6_5_MODULE_INVALID');
  need(C.i6Execution?.activeSourceIntakePath===I65_SOURCE&&C.postproductionDataUpdateControl?.activeSourceIntakePath===I65_SOURCE,'I6_5_SOURCE_PATH_MISMATCH');
  need(git('hash-object',I65_SOURCE)===C.i6Execution?.activeSourceIntakeBlobSha&&git('hash-object',I65_SOURCE)===C.postproductionDataUpdateControl?.activeSourceIntakeBlobSha,'I6_5_SOURCE_BLOB_DRIFT');
  need(SRC5.module==='RECIBOS_CARTERA','I6_5_SOURCE_MODULE_INVALID');
  if(i65SyncDefectPending){
    need(activeI65Sync&&SRC5.status==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK'&&cursor==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_PREFLIGHT_SOURCE_CURSOR_INVALID');
    need(C.postproductionDataUpdateControl?.executionCursor==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_PREFLIGHT_CONTROL_CURSOR_INVALID');
    need(RGT.modules?.RECIBOS_CARTERA?.sourceState==='CURRENT_SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_PREFLIGHT_REGISTRY_INVALID');
    need(C.nextAction==='I6_5_SYNC_CODE_DEFECT_SUCCESSOR_RELEASE','I6_5_SYNC_RELEASE_ACTION_INVALID');
  }else if(i65SyncDefectLive){
    need(SRC5.status==='PINNED_FOR_V5_DELTA'&&Object.prototype.hasOwnProperty.call(nextByCursor,cursor),'I6_5_SOURCE_CURSOR_INVALID');
    need(SRC5.execution?.nextRequiredStep===nextByCursor[cursor],'I6_5_SOURCE_NEXT_STEP_INVALID');
    const preApply=['SOURCE_PINNED','LIVE_READBACK_PASS','DETERMINISTIC_DIFF_READY'].includes(cursor);
    if(preApply)need(SRC5.execution?.writeApplied===false&&Number(SRC5.execution?.writes||0)===0,'I6_5_PREAPPLY_WRITE_STATE_INVALID');
    need(C.postproductionDataUpdateControl?.activeModule==='RECIBOS_CARTERA'&&C.postproductionDataUpdateControl?.executionCursor===cursor&&C.postproductionDataUpdateControl?.nextRequiredStep===nextByCursor[cursor],'I6_5_CONTROL_CURSOR_INVALID');
    need(RGT.modules?.RECIBOS_CARTERA?.sourceState==='CURRENT_SOURCE_PINNED'&&RGT.modules?.RECIBOS_CARTERA?.resumeCursor===cursor,'I6_5_REGISTRY_CURSOR_INVALID');
    const expectedI65Action=i65OperationalClosurePending?'I6_5_OPERATIONAL_CLOSURE_SUCCESSOR_RELEASE':(i65HydrationDiagnosticPending?'I6_5_HYDRATION_DIAGNOSTIC':(i65HydrationDefectPending?'I6_5_HYDRATION_CODE_DEFECT_SUCCESSOR_RELEASE':(i65HydrationDiagnosticPass?'I6_5_HYDRATION_CODE_FIX':actionByCursor[cursor])));
    const forensicBlock=String(FR.currentBlock||'');
    if(FR.status==='FROZEN_ACTIVE'&&forensicBlock==='B1'){
      need(FR.currentReadinessPercent===70&&FR.nextTargetPercent===80&&FR.previewAfterEveryBlockRequired===true&&FR.sameArtifactPreviewToLiveRequired===true,'I6_5_FORENSIC_B1_STATE_INVALID');
      need(['I6_5_FORENSIC_REMEDIATION_B1_PREVIEW','I6_5_FORENSIC_REMEDIATION_B1_VISUAL','I6_5_FORENSIC_REMEDIATION_B1_R3_ROOT_CAUSE'].includes(C.nextAction),'I6_5_FORENSIC_B1_ACTION_INVALID');
    }else{
      need(C.nextAction===expectedI65Action,'I6_5_NEXT_ACTION_INVALID');
    }
  }else{
    need(activeI65Sync&&SRC5.status==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK'&&cursor==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_PREFLIGHT_SOURCE_CURSOR_INVALID');
    need(C.postproductionDataUpdateControl?.executionCursor==='SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_CONTROL_CURSOR_INVALID');
    need(RGT.modules?.RECIBOS_CARTERA?.sourceState==='CURRENT_SOURCE_PINNED_SYNC_PREFLIGHT_BLOCK','I6_5_REGISTRY_SOURCE_NOT_PINNED');
    need(C.nextAction==='I6_5_FIX_READ_PATH_COMPOSITION_NO_DATA_WRITES','I6_5_FIX_ACTION_INVALID');
  }
  need(SRC5.sourceBundle?.sha256===C.postproductionDataUpdateControl?.sourceSha256,'I6_5_SOURCE_SHA_MISMATCH');
  need(git('hash-object',DATA_UPDATE_REGISTRY)===C.i6Execution?.mechanismRegistryBlobSha&&git('hash-object',DATA_UPDATE_REGISTRY)===C.postproductionDataUpdateControl?.mechanismRegistryBlobSha,'I6_5_REGISTRY_BLOB_DRIFT');
  need(RGT.modules?.RECIBOS_CARTERA?.sourceIntakePath===I65_SOURCE,'I6_5_REGISTRY_SOURCE_PATH_INVALID');
  need(R64.status==='I6_4_POLIZAS_RIESGOS_LIVE_PASS'&&R64.humanAcceptance?.status==='ACCEPTED'&&seal.status==='I6_4_POLIZAS_RIESGOS_LIVE_PASS','I6_4_ACCEPTANCE_NOT_FROZEN');
  need(SYNC5.status==='BLOCKING_CAUSAL_DESYNC_FOUND_BEFORE_DATA_WRITE'&&SYNC5.decision==='FAIL_CLOSED_NO_I6_5_DATA_WRITES'&&Number(SYNC5.operationalWrites)===0,'I6_5_SYNC_PREFLIGHT_INVALID');
  const DA=C.i65DeterministicApply||{};
  if(['DETERMINISTIC_DIFF_READY','DETERMINISTIC_APPLY_DONE','POST_WRITE_READBACK_INTEGRITY_PASS','PENDING_USER_VISUAL','LIVE_PASS'].includes(cursor)){
    need(exists(I65_DIFF)&&git('hash-object',I65_DIFF)===DA.deterministicDiffBlobSha&&DA.deterministicDiffSha256==='c1cf6d0c62d4dd30bfa80c70abfa7a8751e58630c2ffcc3484e5544d76e55749','I6_5_APPLY_DIFF_BINDING_INVALID');
    need(exists(I65_APPLY_ENC)&&git('hash-object',I65_APPLY_ENC)===DA.encryptedPayloadBlobSha&&C.i65ApplyPayload?.encryptedPayloadBlobSha===DA.encryptedPayloadBlobSha,'I6_5_APPLY_ENCRYPTED_PAYLOAD_BINDING_INVALID');
    need(DA.expectedOperationalWrites===2227&&DA.legacyWritesAuthorized===false&&DA.cobrosWritesAuthorized===false&&DA.broadDataMutationAuthorized===false&&DA.rollbackRequired===true,'I6_5_APPLY_SCOPE_INVALID');
    need(Array.isArray(DA.allowedCanonicalCollections)&&DA.allowedCanonicalCollections.length===2&&DA.allowedCanonicalCollections.includes('recibosEsperados')&&DA.allowedCanonicalCollections.includes('carteraPrimas'),'I6_5_APPLY_ALLOWED_COLLECTIONS_INVALID');
    if(cursor==='DETERMINISTIC_DIFF_READY'){
      need(DA.status==='AUTHORIZED_PENDING_APPLY'&&DA.userAuthorized===true&&DA.conversationDependent===false,'I6_5_APPLY_AUTH_STATE_INVALID');
      need(exists(I65_APPLY_AUTH)&&git('hash-object',I65_APPLY_AUTH)===DA.authorizationLockBlobSha,'I6_5_APPLY_AUTH_LOCK_DRIFT');
      const AL=readJson(I65_APPLY_AUTH);need(AL.status==='AUTHORIZED_PENDING_APPLY'&&AL.userAuthorized===true&&AL.conversationDependent===false&&AL.scope?.operationalWrites===2227&&AL.scope?.legacyWritesAuthorized===false,'I6_5_APPLY_AUTH_LOCK_INVALID');
      need(C.i65ApplyPayload?.status==='ENCRYPTED_PAYLOAD_READY'&&C.i65ApplyPayload?.narrowApplyAuthorized===true&&C.i65ApplyPayload?.dataWritesAuthorized===false,'I6_5_APPLY_PAYLOAD_STATE_INVALID');
    }else{
      need(['TECHNICAL_PASS_PENDING_USER_VISUAL','LIVE_PASS'].includes(DA.status),'I6_5_APPLY_POSTWRITE_STATE_INVALID');
      need(DA.userAuthorized===false,'I6_5_APPLY_POSTWRITE_AUTH_NOT_REVOKED');
    }
  }
  if(i65HydrationDiagnosticPending||i65HydrationDiagnosticPass||i65HydrationDefectPending||i65HydrationDefectLive){
    need(i65HydrationDefect.classification==='CODE_DEFECT'&&i65HydrationDefect.dataMutationAuthorized===false&&i65HydrationDefect.cobrosWritesAuthorized===false&&i65HydrationDefect.reimportAuthorized===false,'I6_5_HYDRATION_BOUNDARY_INVALID');
    if(i65HydrationDiagnosticPending||i65HydrationDiagnosticPass||i65HydrationDefectPending)need(cursor==='LIVE_READBACK_PASS','I6_5_HYDRATION_CURSOR_INVALID');
    if(i65HydrationDefectLive)need(['LIVE_READBACK_PASS','DETERMINISTIC_DIFF_READY','DETERMINISTIC_APPLY_DONE','POST_WRITE_READBACK_INTEGRITY_PASS','PENDING_USER_VISUAL','LIVE_PASS'].includes(cursor),'I6_5_HYDRATION_SUCCESSOR_CURSOR_INVALID');
  }
}

const R=C.certifiedCandidate||{};
if(activeI65&&i65OperationalClosurePending){need(R.sourceSha===i65OperationalClosure.previousCertifiedSourceSha,'I6_5_OPERATIONAL_PREVIOUS_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i65OperationalClosure.previousCertifiedBuildId,'I6_5_OPERATIONAL_PREVIOUS_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i65OperationalClosure.previousCertifiedArtifactId),'I6_5_OPERATIONAL_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');}
else if(activeI65&&i65OperationalClosureLive){need(R.sourceSha===i65OperationalClosure.sourceSha,'I6_5_OPERATIONAL_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i65OperationalClosure.buildId,'I6_5_OPERATIONAL_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i65OperationalClosure.artifactId),'I6_5_OPERATIONAL_CERTIFIED_ARTIFACT_DRIFT');}
else if(activeI65&&i65HydrationDefectPending&&i65HydrationDefect.previousCertifiedSourceSha){
  need(R.sourceSha===i65HydrationDefect.previousCertifiedSourceSha,'I6_5_HYDRATION_PREVIOUS_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i65HydrationDefect.previousCertifiedBuildId,'I6_5_HYDRATION_PREVIOUS_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i65HydrationDefect.previousCertifiedArtifactId),'I6_5_HYDRATION_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');
}
else if(activeI65&&i65HydrationDefectLive){
  need(R.sourceSha===i65HydrationDefect.sourceSha,'I6_5_HYDRATION_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i65HydrationDefect.buildId,'I6_5_HYDRATION_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i65HydrationDefect.artifactId),'I6_5_HYDRATION_CERTIFIED_ARTIFACT_DRIFT');
}
else if(activeI65&&i65SyncDefectPending&&i65SyncCodeDefect.previousCertifiedSourceSha){
  need(R.sourceSha===i65SyncCodeDefect.previousCertifiedSourceSha,'I6_5_PREVIOUS_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i65SyncCodeDefect.previousCertifiedBuildId,'I6_5_PREVIOUS_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i65SyncCodeDefect.previousCertifiedArtifactId),'I6_5_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');
}
else if(activeI65&&i65SyncDefectLive){need(R.sourceSha===i65SyncCodeDefect.sourceSha,'I6_5_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i65SyncCodeDefect.buildId,'I6_5_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i65SyncCodeDefect.artifactId),'I6_5_CERTIFIED_ARTIFACT_DRIFT');}
else if(activeI64V5&&i64DefectPending&&i64CodeDefect.previousCertifiedSourceSha){
  need(R.sourceSha===i64CodeDefect.previousCertifiedSourceSha,'I6_4_PREVIOUS_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i64CodeDefect.previousCertifiedBuildId,'I6_4_PREVIOUS_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i64CodeDefect.previousCertifiedArtifactId),'I6_4_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');
}
else if(activeI64V5&&i64DefectLive){need(R.sourceSha===i64CodeDefect.sourceSha,'I6_4_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i64CodeDefect.buildId,'I6_4_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i64CodeDefect.artifactId),'I6_4_CERTIFIED_ARTIFACT_DRIFT');}
else if(activeI63V5&&i63DefectPending&&i63CodeDefect.previousCertifiedSourceSha){
  need(R.sourceSha===i63CodeDefect.previousCertifiedSourceSha,'I6_3_PREVIOUS_CERTIFIED_SOURCE_DRIFT');
  need(R.buildId===i63CodeDefect.previousCertifiedBuildId,'I6_3_PREVIOUS_CERTIFIED_BUILD_DRIFT');
  need(Number(R.artifactId)===Number(i63CodeDefect.previousCertifiedArtifactId),'I6_3_PREVIOUS_CERTIFIED_ARTIFACT_DRIFT');
}
else if((activeI63V5||activeI64V5)&&i63DefectLive){need(R.sourceSha===i63CodeDefect.sourceSha,'I6_3_CERTIFIED_SOURCE_DRIFT');need(R.buildId===i63CodeDefect.buildId,'I6_3_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(i63CodeDefect.artifactId),'I6_3_CERTIFIED_ARTIFACT_DRIFT');}
else if(frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5||activeI65Sync){need(R.sourceSha===C.i61LiveSeal?.sourceSha,'I6_CERTIFIED_SOURCE_DRIFT');need(R.buildId===C.i61LiveSeal?.buildId,'I6_CERTIFIED_BUILD_DRIFT');need(Number(R.artifactId)===Number(C.i61LiveSeal?.artifactId),'I6_CERTIFIED_ARTIFACT_DRIFT');}
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
const allowedI64Product=new Set((i64DefectPending||i64DefectLive)&&Array.isArray(i64CodeDefect.allowedProductFiles)?i64CodeDefect.allowedProductFiles:[]);
const allowedI65Product=new Set((i65SyncDefectPending||i65SyncDefectLive)&&Array.isArray(i65SyncCodeDefect.allowedProductFiles)?i65SyncCodeDefect.allowedProductFiles:[]);
const allowedI65HydrationProduct=new Set((i65HydrationDefectPending||i65HydrationDefectLive)&&Array.isArray(i65HydrationDefect.allowedProductFiles)?i65HydrationDefect.allowedProductFiles:[]);
const allowedI65OperationalProduct=new Set((i65OperationalClosurePending||i65OperationalClosureLive)&&Array.isArray(i65OperationalClosure.allowedProductFiles)?i65OperationalClosure.allowedProductFiles:[]);
const b1Active=activeI65&&C.i65ForensicRemediationPlan?.currentBlock==='B1'&&['PREPARED_FOR_CANDIDATE','CANDIDATE_PENDING_PREVIEW','PREVIEW_TECHNICAL_PASS_PENDING_PAULA_VISUAL','VISUAL_REJECTED_R2_ROOT_CAUSE_REQUIRED'].includes(String(B1.status||''));
const allowedI65ForensicB1Product=new Set(b1Active&&Array.isArray(B1.allowedProductFiles)?B1.allowedProductFiles:[]);
const forbidden=changed.filter(p=>!allowedPrefixes.some(prefix=>p.startsWith(prefix))&&!allowedSuccessorProduct.has(p)&&!allowedI63Product.has(p)&&!allowedI64Product.has(p)&&!allowedI65Product.has(p)&&!allowedI65HydrationProduct.has(p)&&!allowedI65OperationalProduct.has(p)&&!allowedI65ForensicB1Product.has(p));
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
if(i64DefectPending||i64DefectLive){
 need(i64CodeDefect.classification==='CODE_DEFECT','I6_4_DEFECT_CLASS_INVALID');
 need(i64CodeDefect.parentCertifiedSourceSha===C.preI64CertifiedCandidate?.sourceSha||i64CodeDefect.parentCertifiedSourceSha===C.certifiedCandidate?.sourceSha||i64CodeDefect.parentCertifiedSourceSha===i64CodeDefect.previousCertifiedSourceSha,'I6_4_DEFECT_PARENT_INVALID');
 need(Array.isArray(i64CodeDefect.allowedProductFiles)&&i64CodeDefect.allowedProductFiles.length===5,'I6_4_DEFECT_SCOPE_INVALID');
 need(i64CodeDefect.allowedProductFiles.includes('orbit360-platform/modules/polizas.js'),'I6_4_DEFECT_POLIZAS_OWNER_MISSING');
 need(i64CodeDefect.allowedProductFiles.includes('orbit360-platform/modules/cliente360.js'),'I6_4_DEFECT_CLIENTE360_OWNER_MISSING');
 need(i64CodeDefect.allowedProductFiles.includes('orbit360-platform/modules/policy-receipts-v1199-bridge.js'),'I6_4_DEFECT_RUNTIME_BRIDGE_OWNER_MISSING');
 need(i64CodeDefect.allowedProductFiles.includes('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'),'I6_4_DEFECT_DETAIL_GUARD_OWNER_MISSING');
 need(i64CodeDefect.allowedProductFiles.includes('orbit360-platform/core/pwa.js'),'I6_4_DEFECT_PWA_FRESHNESS_OWNER_MISSING');
 need(i64CodeDefect.reimportAuthorized===false&&i64CodeDefect.dataMutationAuthorized===false,'I6_4_DEFECT_DATA_BOUNDARY_INVALID');
 if(i64DefectLive){need(/^[0-9a-f]{40}$/.test(String(i64CodeDefect.sourceSha||'')),'I6_4_DEFECT_SOURCE_INVALID');need(i64CodeDefect.productionReadbackExact===true&&i64CodeDefect.functionalPass===true,'I6_4_DEFECT_LIVE_PROOF_INVALID');}
}
if(i65SyncDefectPending||i65SyncDefectLive){
 need(i65SyncCodeDefect.classification==='CODE_DEFECT','I6_5_SYNC_DEFECT_CLASS_INVALID');
 need(i65SyncCodeDefect.parentCertifiedSourceSha===i65SyncCodeDefect.previousCertifiedSourceSha,'I6_5_SYNC_DEFECT_PARENT_INVALID');
 need(Array.isArray(i65SyncCodeDefect.allowedProductFiles)&&i65SyncCodeDefect.allowedProductFiles.length===4,'I6_5_SYNC_DEFECT_SCOPE_INVALID');
 for(const p of ['orbit360-platform/index.html','orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js','orbit360-platform/modules/polizas.js','orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'])need(i65SyncCodeDefect.allowedProductFiles.includes(p),'I6_5_SYNC_DEFECT_OWNER_MISSING:'+p);
 need(i65SyncCodeDefect.reimportAuthorized===false&&i65SyncCodeDefect.dataMutationAuthorized===false&&i65SyncCodeDefect.cobrosWritesAuthorized===false,'I6_5_SYNC_DEFECT_DATA_BOUNDARY_INVALID');
 if(i65SyncDefectLive){need(/^[0-9a-f]{40}$/.test(String(i65SyncCodeDefect.sourceSha||'')),'I6_5_SYNC_DEFECT_SOURCE_INVALID');need(i65SyncCodeDefect.productionReadbackExact===true&&i65SyncCodeDefect.functionalPass===true,'I6_5_SYNC_DEFECT_LIVE_PROOF_INVALID');}
}
if(i65HydrationDefectPending||i65HydrationDefectLive){
 need(i65HydrationDefect.classification==='CODE_DEFECT','I6_5_HYDRATION_DEFECT_CLASS_INVALID');
 need(i65HydrationDefect.parentCertifiedSourceSha===i65HydrationDefect.previousCertifiedSourceSha,'I6_5_HYDRATION_DEFECT_PARENT_INVALID');
 need(Array.isArray(i65HydrationDefect.allowedProductFiles)&&i65HydrationDefect.allowedProductFiles.length===1,'I6_5_HYDRATION_DEFECT_SCOPE_INVALID');
 need(i65HydrationDefect.allowedProductFiles[0]==='orbit360-platform/product-runtime-config.js','I6_5_HYDRATION_OWNER_INVALID');
 need(i65HydrationDefect.reimportAuthorized===false&&i65HydrationDefect.dataMutationAuthorized===false&&i65HydrationDefect.cobrosWritesAuthorized===false,'I6_5_HYDRATION_DEFECT_DATA_BOUNDARY_INVALID');
 if(i65HydrationDefectLive){need(/^[0-9a-f]{40}$/.test(String(i65HydrationDefect.sourceSha||'')),'I6_5_HYDRATION_DEFECT_SOURCE_INVALID');need(i65HydrationDefect.productionReadbackExact===true&&i65HydrationDefect.functionalPass===true&&Number(i65HydrationDefect.receiptCount)>0&&Number(i65HydrationDefect.portfolioCount)>0,'I6_5_HYDRATION_DEFECT_LIVE_PROOF_INVALID');}
}
if(b1Active){
 need(B1.allowedProductFiles.length===30,'I6_5_B1_SCOPE_COUNT_INVALID');
 const b1Required=["orbit360-platform/index.html","orbit360-platform/core/public-tenant-branding.js","orbit360-platform/data/tenant-public-branding-index.js","orbit360-platform/modules/configuracion.js","orbit360-platform/modules/equipo.js","orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js","orbit360-platform/core/product-runtime-browser-providers-p0.js","orbit360-platform/core/auth-product-runtime-p0.js","orbit360-platform/core/auth-password-change-v20260805.js","functions/tenant-branding.js","functions/bootstrap.js","functions/package.json","orbit360-platform/assets/tenant/alianzas-soluciones/logo-oficial-360.png","orbit360-platform/assets/tenant/alianzas-soluciones/logo-bolita-96.png","orbit360-platform/core/tenant-access-policy-effective-p0.js","orbit360-platform/data/store-firestore-product-readonly-p0.js","functions/user-onboarding.js","functions/product-operational-domain.js","orbit360-platform/core/backend-product-readonly-bootstrap-p0.js","orbit360-platform/product-runtime-config.js","orbit360-platform/core/product-hydration-required-optional-p0.js","orbit360-platform/core/user-onboarding.js","orbit360-platform/styles/infra.css","orbit360-platform/core/tenant-access-policy-product-p0.js","orbit360-platform/modules/equipo-credential-admin-v20260805-bridge.js","orbit360-platform/core/access-role-session-owner-v20260728.js","orbit360-platform/core/access-scope.js","orbit360-platform/core/router.js","orbit360-platform/core/tenant-domain-config-client.js","functions/tenant-domain-config.js"];
 need(b1Required.every(p=>B1.allowedProductFiles.includes(p)),'I6_5_B1_SCOPE_INVALID');
 need(Array.isArray(B1.backend?.deployTargets)&&['orbit360TenantBranding','orbit360ProductOperationalCommand','orbit360ProvisionTeamAccess','orbit360TenantDomainConfig'].every(x=>B1.backend.deployTargets.includes(x))&&B1.backend?.deployExactCurrentSource===true&&B1.brandingConfig?.publicReadOwner==='orbit360TenantBranding'&&B1.brandingConfig?.authenticatedWriteOwner==='orbit360TenantBranding','I6_5_B1_OWNER_INVALID');
}
if(i65OperationalClosurePending||i65OperationalClosureLive){
 need(i65OperationalClosure.classification==='CODE_DEFECT'&&i65OperationalClosure.scope==='I6_5_OPERATIONAL_CLOSURE_MINIFIX','I6_5_OPERATIONAL_CLASS_INVALID');
 need(i65OperationalClosure.parentCertifiedSourceSha===i65OperationalClosure.previousCertifiedSourceSha,'I6_5_OPERATIONAL_PARENT_INVALID');
 const required=['orbit360-platform/core/policy-receipts-engine.js','orbit360-platform/modules/cliente360.js','orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js','orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js','orbit360-platform/core/pwa.js','orbit360-platform/index.html','orbit360-platform/data/store-firestore-product-operational-p0.js','orbit360-platform/modules/equipo.js','orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js','orbit360-platform/core/user-onboarding.js','orbit360-platform/data/tenant-public-branding-index.js','orbit360-platform/core/public-tenant-branding.js','orbit360-platform/assets/tenant/alianzas-soluciones/logo-bolita-96.png','orbit360-platform/modules/policy-receipts-v1199-bridge.js','orbit360-platform/modules/aseguradoras.js'];
 need(Array.isArray(i65OperationalClosure.allowedProductFiles)&&i65OperationalClosure.allowedProductFiles.length===required.length&&required.every(p=>i65OperationalClosure.allowedProductFiles.includes(p)),'I6_5_OPERATIONAL_SCOPE_INVALID');
 need(i65OperationalClosure.dataMutationAuthorized===false&&i65OperationalClosure.reimportAuthorized===false&&i65OperationalClosure.cobrosWritesAuthorized===false&&i65OperationalClosure.sourceDataApplyAuthorized===false,'I6_5_OPERATIONAL_DATA_BOUNDARY_INVALID');
 if(i65OperationalClosureLive)need(i65OperationalClosure.productionReadbackExact===true&&i65OperationalClosure.functionalPass===true&&i65OperationalClosure.globalPortfolioCount===1283&&i65OperationalClosure.globalCobrosCount===5,'I6_5_OPERATIONAL_LIVE_PROOF_INVALID');
}

if(successor){
 need(frozenI60||frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5||activeI65,'I6_1_SUCCESSOR_OUTSIDE_ACTIVE_SUBGATE');
 need(/^[0-9a-f]{40}$/.test(String(successor.sourceSha||'')),'I6_1_SUCCESSOR_SHA_INVALID');
 need(successor.parentCertifiedSourceSha===(frozenI61||activeI62V5||waitingI63||activeI63V5||activeI64V5||activeI65?C.preI61CertifiedCandidate?.sourceSha:R.sourceSha),'I6_1_SUCCESSOR_PARENT_MISMATCH');
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
