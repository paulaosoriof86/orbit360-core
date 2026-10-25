import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const STATUS_LEDGER='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const AUTH_RECEIPT='artifacts/orbit360-recovery/release-control/I6_EXPLICIT_AUTHORIZATION_RECEIPT_20260914.json';
const I6_ADDENDUM='artifacts/orbit360-recovery/release-control/FASE_A_POSTSALIDA_I6_ADDENDUM_20260914.md';
const I6_PLAN_LOCK='artifacts/orbit360-recovery/release-control/I6_POSTSALIDA_PLAN_LOCK_20260914.json';
const V5_MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v5/08_MANIFIESTO_FUENTES_EVERGREEN_V5.json';
const V6_MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v6/10_MANIFIESTO_FUENTES_EVERGREEN_V6.json';
const V6_ADDENDUM='artifacts/orbit360-recovery/project-sources-v2/v6/09_ADDENDUM_COMPOSICION_CANONICA_Y_LEDGER_HALLAZGOS_EVERGREEN_V6_2026-09-24.md';
const V7_MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v7/12_MANIFIESTO_FUENTES_EVERGREEN_V7.json';
const V7_ADDENDUM='artifacts/orbit360-recovery/project-sources-v2/v7/11_ADDENDUM_PAGOS_COBROS_CONCILIACION_FECHAS_INFERENCIA_EVERGREEN_V7_2026-09-26.md';
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
const I65_FORENSIC_B2='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const I65_FORENSIC_B3='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B3_EXECUTION_LOCK_20260929.json';
const I65_FORENSIC_B4='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json';
const I6_CANONICAL_COMPOSITION='artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json';
const I6_FINDINGS_LEDGER='artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json';
const I65_FORENSIC_PLAN_V2='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_REMEDIATION_PLAN_LOCK_V2_20260924.json';
const I65_B2_REJECTION='artifacts/orbit360-recovery/release-control/I6_5_B2_PAULA_VISUAL_REJECTION_20260924.json';
const I65_B2_ROOT_CAUSE='artifacts/orbit360-recovery/release-control/I6_5_B2_REJECTION_ROOT_CAUSE_MATRIX_20260924.json';
const I65_SYNC='artifacts/orbit360-recovery/release-control/I6_5_SYNC_COMPOSITION_PREFLIGHT_20260918.json';
const I65_DIFF='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_DIFF_20260918.json';
const I65_APPLY_ENC='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_APPLY_PAYLOAD_20260918.enc.json';
const I65_APPLY_AUTH='artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_APPLY_AUTH_LOCK_20260918.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const physicalGit=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
// A newer, independently byte-checked successor must not rewrite historical
// receipt expectations. The four pinned pre-successor hashes are used only
// for prior proofs; the new successor is checked against actual disk bytes.
let latencyHistoricBlobs=new Map();
// Only the three amended insurer product paths use their verified 24-Oct
// predecessor blobs in earlier proof assertions. Current composition checks
// use physicalGit at the active candidate and must never use this map.
let historicalInsurerProductBlobs=new Map();
let dualHistoricBlobs=new Map();
const realGit=(...args)=>args[0]==='hash-object'&&CORRECTIVE_SOURCE_PREVIOUS.has(args[1])
 ?CORRECTIVE_SOURCE_PREVIOUS.get(args[1]):
 args[0]==='hash-object'&&historicalInsurerProductBlobs.has(args[1])
 ?historicalInsurerProductBlobs.get(args[1]):
 args[0]==='hash-object'&&latencyHistoricBlobs.has(args[1])
 ?latencyHistoricBlobs.get(args[1]):
 args[0]==='hash-object'&&dualHistoricBlobs.has(args[1])
 ?dualHistoricBlobs.get(args[1]):physicalGit(...args);
// Historical receipts are verified against their exact already-committed
// predecessor tree. A newer source successor is verified separately against
// the actual working tree, never substituted into an older signed receipt.
// Only files explicitly listed and byte-pinned by the current successor may
// use the predecessor view in historic assertions.
let predecessorSourceBlobs=new Map();
let diagnosticPreviousBlobs=new Map();
const git=(...args)=>args[0]==='hash-object'&&predecessorSourceBlobs.has(args[1])?
 predecessorSourceBlobs.get(args[1]):args[0]==='hash-object'&&diagnosticPreviousBlobs.has(args[1])?
 diagnosticPreviousBlobs.get(args[1]):realGit(...args);
const exists=p=>fs.existsSync(p);
const stable=v=>{if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const sameJson=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

need(MODE==='governance'||MODE==='i6','I6_GUARD_MODE_INVALID:'+MODE);
for(const p of [CONTROL,STATUS_LEDGER,AUTH_RECEIPT,I6_ADDENDUM,I6_PLAN_LOCK,V5_MANIFEST,V6_MANIFEST,V6_ADDENDUM,V7_MANIFEST,V7_ADDENDUM,DATA_UPDATE_PLAN,DATA_UPDATE_DISCIPLINE,DATA_UPDATE_REGISTRY,ACTIVE_SOURCE_INTAKE,I63_SOURCE,I63_RECEIPT,I64_SOURCE,I64_RECEIPT,I65_SOURCE,I65_SYNC,I65_FORENSIC_AUDIT,I65_FORENSIC_PLAN,I65_FORENSIC_ADDENDUM,I65_PAYMENT_INFERENCE,I65_FORENSIC_B1,I65_FORENSIC_B2,I65_FORENSIC_B3,I65_FORENSIC_B4,I6_CANONICAL_COMPOSITION,I6_FINDINGS_LEDGER,I65_FORENSIC_PLAN_V2,I65_B2_REJECTION,I65_B2_ROOT_CAUSE]) need(exists(p),'I6_REQUIRED_FILE_MISSING:'+p);
const C=readJson(CONTROL);
const ACTIVE_I65_FORENSIC_B4=String(C.i65ForensicRemediationPlan?.b4?.executionLockPath||I65_FORENSIC_B4);
need(exists(ACTIVE_I65_FORENSIC_B4),'I6_5_B4_ACTIVE_LOCK_MISSING:'+ACTIVE_I65_FORENSIC_B4);
const S=readJson(STATUS_LEDGER),A=readJson(AUTH_RECEIPT),M5=readJson(V5_MANIFEST),M6=readJson(V6_MANIFEST),M=readJson(V7_MANIFEST),FRA=readJson(I65_FORENSIC_AUDIT),FRP=readJson(I65_FORENSIC_PLAN),PAY=readJson(I65_PAYMENT_INFERENCE),B1=readJson(I65_FORENSIC_B1),B2=readJson(I65_FORENSIC_B2),B3=readJson(I65_FORENSIC_B3),B4=readJson(ACTIVE_I65_FORENSIC_B4);
const COMP=readJson(I6_CANONICAL_COMPOSITION),FIND=readJson(I6_FINDINGS_LEDGER),FRP2=readJson(I65_FORENSIC_PLAN_V2),REJ=readJson(I65_B2_REJECTION),RCM=readJson(I65_B2_ROOT_CAUSE);
// The 24-Oct dual-host source is an independently pinned successor, never a
// rewrite of preceding authenticated/Preview receipts. Earlier expectations
// use the committed predecessor bytes; this change must match disk bytes.
const CORRECTIVE_SOURCE=C.b4003CorrectiveSourceFix20261025||{};
const CORRECTIVE_SOURCE_ACTIVE=CORRECTIVE_SOURCE.status==='SOURCE_STAGED_SYNTHETIC_QA_PENDING_EXACT_PREVIEW_SECURITY_HOLD';
const CORRECTIVE_SOURCE_PREVIOUS=new Map();
const DUAL_HOST=C.b4003DualHostProtectedTransport20261024||{};
const DUAL_HOST_ACTIVE=DUAL_HOST.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD'&&!CORRECTIVE_SOURCE_ACTIVE;
const DUAL_PREVIOUS=new Map();
if(CORRECTIVE_SOURCE_ACTIVE){
 const D=CORRECTIVE_SOURCE,R=readJson(D.receiptPath);
 const S=C.b4003CorrectiveSourceSuccessor20261025||{};
 const SR=readJson(S.receiptPath||'');
 const PREVIEW=C.b4003CorrectiveSourcePreviewSuccessorDispatch20261025||{};
 const PR=readJson(PREVIEW.receiptPath||'');
 const BL=B4.b4003CorrectiveSourceFix20261025||{};
 const CL=COMP.b4003CorrectiveSourceFix20261025||{};
 const historicalSourceQa=Object.assign({},R.sourceBlobsAfter||{},R.qaBlobsAfter||{});
 const successorSourceQa=Object.assign({},SR.sourceBlobsAfter||{},SR.qaBlobsAfter||{});
 const POLIZAS_SUCCESSOR=C.b4003PolizasContextCacheSuccessor20261025||{};
 const POLIZAS_SR=exists(POLIZAS_SUCCESSOR.receiptPath||'')?readJson(POLIZAS_SUCCESSOR.receiptPath):{};
 const expectedProductBlobs={...(SR.sourceBlobsAfter||{}),...(POLIZAS_SR.sourceBlobsAfter||{})};
 const expectedQaBlobs={...(SR.qaBlobsAfter||{}),...(POLIZAS_SR.qaBlobsAfter||{})};
 need(D.gate==='I6.5/B4-003'&&D.authority==='PAULA_EXPLICIT_CORRECTIVE_AUTHORIZATION'&&
  D.parentHead==='2278ab067ace6e6bdaa4d35e7c0728f4a4160682'&&
  physicalGit('merge-base',D.parentHead,'HEAD')===D.parentHead&&
  R.schema==='GI_I65_B4003_CORRECTIVE_SOURCE_FIX_V1'&&R.gate===D.gate&&
  R.authority===D.authority&&R.parentHead===D.parentHead&&R.status===D.status&&
  D.receiptBlobSha===physicalGit('hash-object',D.receiptPath)&&
  BL.receiptBlobSha===D.receiptBlobSha&&CL.receiptBlobSha===D.receiptBlobSha&&
  sameJson(D.sourceBlobsAfter,R.sourceBlobsAfter)&&sameJson(D.qaBlobsAfter,R.qaBlobsAfter)&&
  sameJson(BL.sourceBlobsAfter,R.sourceBlobsAfter)&&sameJson(BL.qaBlobsAfter,R.qaBlobsAfter)&&
  sameJson(CL.sourceBlobsAfter,R.sourceBlobsAfter)&&sameJson(CL.qaBlobsAfter,R.qaBlobsAfter)&&
  Object.keys(R.sourceBlobsAfter||{}).length===7&&Object.keys(R.qaBlobsAfter||{}).length===2&&
  Object.entries(historicalSourceQa).every(([p,sha])=>/^[0-9a-f]{40}$/.test(sha)&&(()=>{try{physicalGit('cat-file','-e',sha);return true;}catch(_){return false;}})())&&
  Object.keys(R.sourceBlobsAfter||{}).every(p=>(C.b4003CorrectiveSourceSecurityAuthorization20261024?.allowedSourcePaths||[]).includes(p))&&
  Object.keys(R.qaBlobsAfter||{}).every(p=>(B4.boundaries?.allowedQaFiles||[]).includes(p))&&
  D.compositionBlobSha===POLIZAS_SUCCESSOR.predecessorCompositionBlobSha&&
  BL.compositionBlobSha===D.compositionBlobSha&&CL.receiptBlobSha===D.receiptBlobSha&&
  R.findingsPreserved===295&&R.frozenTasksPreserved===86&&
  R.firestoreRulesDeployAuthorized===false&&R.dataMutationAuthorized===false&&
  R.realBusinessWritesAuthorized===false&&R.livePromotionAuthorized===false&&
  D.firestoreRulesDeployAuthorized===false&&D.dataMutationAuthorized===false&&
  D.realBusinessWritesAuthorized===false&&D.livePromotionAuthorized===false&&
  S.status==='SOURCE_SUCCESSOR_RECONCILED_PENDING_EXACT_PREVIEW'&&S.gate===D.gate&&S.authority===D.authority&&
  S.receiptBlobSha===physicalGit('hash-object',S.receiptPath)&&C.b4003CorrectiveSourceSuccessor20261025?.receiptBlobSha===S.receiptBlobSha&&
  C.b4003CorrectiveSourceSuccessor20261025?.receiptPath===S.receiptPath&&
  SR.historicalSourceFix?.blobSha===D.receiptBlobSha&&
  SR.historicalSourceFix?.parentHead===D.parentHead&&
  SR.historicalSourceFix?.sourceBlobsAfter?.['functions/bootstrap.js']===R.sourceBlobsAfter?.['functions/bootstrap.js']&&
  SR.sourceCommit==='15588c3c8ebeb11eac630cce624d136723bcf534'&&
  physicalGit('rev-parse',SR.sourceCommit+':functions/bootstrap.js')===SR.sourceBlobsAfter?.['functions/bootstrap.js']&&
  physicalGit('merge-base',SR.sourceCommit,'HEAD')===SR.sourceCommit&&
  Object.keys(SR.sourceBlobsAfter||{}).length===7&&Object.keys(SR.qaBlobsAfter||{}).length===2&&
  Object.entries(successorSourceQa).every(([p,sha])=>physicalGit('hash-object',p)===sha)&&
  Object.keys(S.sourceBlobsAfter||{}).every(p=>(C.b4003CorrectiveSourceSecurityAuthorization20261024?.allowedSourcePaths||[]).includes(p))&&
  Object.keys(S.qaBlobsAfter||{}).every(p=>(B4.boundaries?.allowedQaFiles||[]).includes(p))&&
  S.packagerReceiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_PREVIEW_PACKAGER_DUPLICATE_EXPORT_ROOTFIX_20261025.json'&&S.packagerReceiptBlobSha===physicalGit('hash-object',S.packagerReceiptPath)&&SR.packagerReceipt?.path===S.packagerReceiptPath&&SR.packagerReceipt?.blobSha===S.packagerReceiptBlobSha&&
  SR.authorizationReceipt?.path==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CORRECTIVE_SOURCE_SECURITY_AUTH_20261024.json'&&SR.authorizationReceipt?.blobSha===physicalGit('hash-object',SR.authorizationReceipt.path)&&
  SR.scope?.functions?.join(',')==='orbit360ScopedPolicyReadPreview'&&SR.scope?.sharedFirestoreRules===false&&
  SR.scope?.dataMutation===false&&SR.scope?.livePromotion===false&&S.findingsPreserved===295&&S.frozenTasksPreserved===86&&SR.findingsPreserved===295&&SR.frozenTasksPreserved===86&&
  PREVIEW.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW_PENDING_DISPATCH'&&
  PREVIEW.receiptBlobSha===physicalGit('hash-object',PREVIEW.receiptPath)&&
  C.b4003CorrectiveSourcePreviewSuccessorDispatch20261025?.receiptBlobSha===PREVIEW.receiptBlobSha&&
  PR.schema==='GI_I65_B4_003_PREVIEW_DISPATCH_SUCCESSOR_V1'&&PR.status===PREVIEW.status&&
  PR.triggerSubject==='build(i6.5 B4-003): verify authorized corrective source in isolated Preview'&&PR.baseHead===physicalGit('rev-parse','HEAD^^')&&
  PREVIEW.receiptBlobSha===physicalGit('rev-parse','HEAD^:'+PREVIEW.receiptPath)&&
  PR.sourceFixReceiptBlobSha===D.receiptBlobSha&&PR.sourceSuccessorReceiptBlobSha===S.receiptBlobSha&&
  PR.packagerFixReceiptBlobSha===S.packagerReceiptBlobSha&&
  POLIZAS_SUCCESSOR.status==='COMPOSITION_SUCCESSOR_BOUND_PENDING_EXACT_PREVIEW'&&
  POLIZAS_SUCCESSOR.receiptBlobSha===physicalGit('hash-object',POLIZAS_SUCCESSOR.receiptPath)&&
  PR.polizasCompositionSuccessorReceiptPath===POLIZAS_SUCCESSOR.receiptPath&&
  PR.polizasCompositionSuccessorReceiptBlobSha===POLIZAS_SUCCESSOR.receiptBlobSha&&
  PR.compositionBlobSha===physicalGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  PR.executionLockBlobSha===physicalGit('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  JSON.stringify(PR.expectedProductBlobs)===JSON.stringify(expectedProductBlobs)&&
  JSON.stringify(PR.expectedQaBlobs)===JSON.stringify(expectedQaBlobs)&&
  PR.scope?.sharedFirestoreRules===false&&PR.scope?.otherFunctions===false&&PR.scope?.dataMutation===false&&
  PR.scope?.livePromotion===false&&PR.scope?.functions?.join(',')==='orbit360ScopedPolicyReadPreview'&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_CORRECTIVE_SOURCE_SUCCESSOR_INVALID');
 for(const [p,sha] of Object.entries(historicalSourceQa)){
  try{physicalGit('cat-file','-e',D.parentHead+':'+p);CORRECTIVE_SOURCE_PREVIOUS.set(p,physicalGit('rev-parse',D.parentHead+':'+p));}
  catch(_){throw new Error('B4_003_CORRECTIVE_PARENT_MISSING_FILE:'+p);}
 }
 const priorSourceQa=Object.assign({},readJson(DUAL_HOST.receiptPath).sourceBlobsAfter||{},readJson(DUAL_HOST.receiptPath).qaBlobsAfter||{});
 for(const p of Object.keys(priorSourceQa)){
  if(p==='tools/gravicentra-b4-003-dual-host-protected-transport.test.cjs')continue;
  try{physicalGit('cat-file','-e',DUAL_HOST.parentHead+':'+p);DUAL_PREVIOUS.set(p,physicalGit('rev-parse',DUAL_HOST.parentHead+':'+p));}
  catch(_){/* Original dual-host proof did not include this path in its parent. */}
 }
 console.log('B4_003_CORRECTIVE_SOURCE=HISTORICAL_SHA_PRESERVED_SUCCESSOR_EXACT_BLOBS_SYNTHETIC_QA_PENDING_PREVIEW_SECURITY_HOLD');
}
if(DUAL_HOST_ACTIVE){
 const D=DUAL_HOST,R=readJson(D.receiptPath);
 const BL=B4.b4003DualHostProtectedTransport20261024||{};
 const CL=COMP.b4003DualHostProtectedTransport20261024||{};
 const sourceQa=Object.assign({},R.sourceBlobsAfter||{},R.qaBlobsAfter||{});
 need(D.parentHead==='833d859b7c2b2885aaf37e8775ff9f465b307e3e'&&
  physicalGit('merge-base',D.parentHead,'HEAD')===D.parentHead&&
  D.gate==='I6.5/B4-003'&&R.schema==='GI_I65_B4003_DUAL_HOST_PROTECTED_TRANSPORT_SOURCE_V1'&&
  R.authority===D.authority&&R.status===D.status&&R.gate===D.gate&&R.parentHead===D.parentHead&&
  D.receiptBlobSha===physicalGit('hash-object',D.receiptPath)&&
  BL.receiptBlobSha===D.receiptBlobSha&&CL.receiptBlobSha===D.receiptBlobSha&&
  sameJson(D,BL)&&sameJson(D.sourceBlobsAfter,R.sourceBlobsAfter)&&
  sameJson(D.qaBlobsAfter,R.qaBlobsAfter)&&
  Object.keys(R.sourceBlobsAfter||{}).length===4&&Object.keys(R.qaBlobsAfter||{}).length===2&&
  Object.entries(sourceQa).every(([p,sha])=>physicalGit('hash-object',p)===sha)&&
  D.compositionBlobSha===physicalGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  R.stagedBackendExports?.join(',')==='orbit360ScopedPolicyReadPreview,orbit360ScopedPolicyRead'&&
  R.liveProtectedReaderDeployed===false&&
  R.authenticatedNewPreviewUatAccepted===false&&
  ['sharedFirestoreRulesDeployAuthorized','operationalWritesAuthorized','syntheticQaWritesAuthorized',
   'realUserImpersonationAuthorized','livePromotionAuthorized','reimportAuthorized','refreshAugustAuthorized']
   .every(k=>D[k]===false&&R[k]===false)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_DUAL_HOST_PROTECTED_SOURCE_INVALID');
 for(const p of Object.keys(sourceQa)){
  if(p==='tools/gravicentra-b4-003-dual-host-protected-transport.test.cjs')continue;
  try{
   physicalGit('cat-file','-e',D.parentHead+':'+p);
   DUAL_PREVIOUS.set(p,physicalGit('rev-parse',D.parentHead+':'+p));
  }catch(_){/* New QA test did not exist in the predecessor tree. */}
 }
 console.log('B4_003_DUAL_HOST_PROTECTED_SOURCE=EXACT_SOURCE_QA_PASS_SECURITY_HOLD');
}
const preDualPhysicalHash=p=>CORRECTIVE_SOURCE_PREVIOUS.get(p)||DUAL_PREVIOUS.get(p)||physicalGit('hash-object',p);
dualHistoricBlobs=DUAL_PREVIOUS;
const LATENCY_REPAIR=C.b4003PostAuthClientPagingLatencySuccessor20261023||{};
const LATENCY_REPAIR_ACTIVE=LATENCY_REPAIR.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_AUTHENTICATED_UAT_HOLD';
if(LATENCY_REPAIR_ACTIVE){
 const L=LATENCY_REPAIR,R=readJson(L.receiptPath);
 const BL=B4.b4003PostAuthClientPagingLatencySuccessor20261023||{};
 const CL=COMP.b4003PostAuthClientPagingLatencySuccessor20261023||{};
 const expectedSource=[
  'functions/b4-003-scoped-related-reader.js',
  'orbit360-platform/core/product-app-p0.js'
 ].sort();
 const expectedQa=[
  'tools/gravicentra-b4-003-post-auth-bootstrap-diagnostic.test.cjs',
  'tools/gravicentra-b4-003-scoped-related-reader.test.cjs'
 ].sort();
 const exactPaths=expectedSource.concat(expectedQa);
 const pairs=Object.assign({},R.sourceFiles||{},R.qaFiles||{});
 const samePredecessorTree=physicalGit('rev-parse','HEAD^{tree}')===
  physicalGit('rev-parse',L.parentHead+'^{tree}');
 const parentAncestor=physicalGit('merge-base',L.parentHead,'HEAD')===L.parentHead;
 need(L.gate==='I6.5/B4-003'&&L.parentHead==='84516b718a312ca2993c33c1512f31977fa8b5f5'&&
  (samePredecessorTree||parentAncestor)&&
  L.authority==='PAULA_CONTINUE_EXISTING_I65_B4003_AFTER_AUTHENTICATED_LOGIN_FAIL_20261023'&&
  R.schema==='GI_I65_B4003_POST_AUTH_CLIENT_PAGING_LATENCY_SUCCESSOR_V1'&&
  R.gate===L.gate&&R.authority===L.authority&&R.status===L.status&&R.parentHead===L.parentHead&&
  L.receiptBlobSha===physicalGit('hash-object',L.receiptPath)&&
  BL.receiptBlobSha===L.receiptBlobSha&&CL.receiptBlobSha===L.receiptBlobSha&&
  sameJson(Object.keys(R.sourceFiles||{}).sort(),expectedSource)&&
  sameJson(Object.keys(R.qaFiles||{}).sort(),expectedQa)&&
  exactPaths.every(p=>pairs[p]?.before===physicalGit('rev-parse',L.parentHead+':'+p)&&
   pairs[p]?.after===preDualPhysicalHash(p)&&pairs[p].after!==pairs[p].before)&&
  expectedSource.every(p=>CL.sourceBlobsAfter?.[p]===pairs[p].after)&&
  expectedQa.every(p=>CL.qaBlobsAfter?.[p]===pairs[p].after)&&
  R.observedAuthenticatedUat?.result==='FAIL_READONLY_BOOTSTRAP_BLOCKED'&&
  R.observedAuthenticatedUat?.failureCode==='STORE_READINESS_TIMEOUT'&&
  R.observedAuthenticatedUat?.firstRealUatAfterThisChangePending===true&&
  R.changes?.previewOnlyStoreReadinessBudgetMs===24000&&
  R.changes?.legacyStoreReadinessBudgetMs===8000&&
  R.changes?.scopedCallableTimeoutMs===16000&&
  R.changes?.clientRawLookaheadMax===201&&
  R.verification?.postAuthDiagnosticVm==='PASS'&&
  R.verification?.scopedRelatedReaderSynthetic==='PASS_442_ROWS_THREE_BOUNDED_PAGES'&&
  R.verification?.realAuthenticatedRoleCountryUat==='PENDING'&&
  R.verification?.productionAcceptance===false&&
  R.boundaries?.realOperationalBusinessWrites===0&&
  R.boundaries?.authenticatedUatAccepted===false&&
  R.boundaries?.findingsPreserved===295&&
  R.boundaries?.formalI6Percent===50&&R.boundaries?.productionPathPercent===20&&
  ['sharedFirestoreRulesDeploymentAuthorized','operationalWriterDeploymentAuthorized',
   'productionPromotionAuthorized','dataReimportAuthorized','gateAdvanceAuthorized']
   .every(k=>R.boundaries?.[k]===false)&&
  BL.gate===L.gate&&BL.parentHead===L.parentHead&&BL.authenticatedUatAccepted===false&&
  CL.gate===L.gate&&CL.parentHead===L.parentHead&&CL.authenticatedUatAccepted===false&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_POST_AUTH_CLIENT_PAGING_LATENCY_SUCCESSOR_INVALID');
 latencyHistoricBlobs=new Map(exactPaths.map(p=>[p,pairs[p].before]));
 console.log('B4_003_POST_AUTH_CLIENT_PAGING_LATENCY=BOUNDED_SYNTHETIC_QA_PASS_REAL_UAT_PENDING_LIVE_HOLD');
}
const ACTIVE_INSURER=C.b4003ActiveInsurerReadinessPreviewAuthorization20261024||{};
const ACTIVE_INSURER_ACTIVE=ACTIVE_INSURER.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW';
const INSURER_POLICY_COUNT=C.b4003InsurerPolicyCountSourceSuccessor20261024||{};
const INSURER_POLICY_COUNT_ACTIVE=INSURER_POLICY_COUNT.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD';
const historicalInsurerPredecessorComposition=()=>ACTIVE_INSURER_ACTIVE?
 physicalGit('rev-parse',ACTIVE_INSURER.sourceParentCommit+':'+I6_CANONICAL_COMPOSITION):
 physicalGit('hash-object',I6_CANONICAL_COMPOSITION);
const LATENCY_PREVIEW=C.b4003PostAuthClientPagingLatencyPreviewAuthorization20261023||{};
if(LATENCY_PREVIEW.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW'){
 const P=LATENCY_PREVIEW,R=readJson(P.receiptPath);
 const B=B4.b4003PostAuthClientPagingLatencyPreviewAuthorization20261023||{};
 const L=LATENCY_REPAIR;
 const sourceFiles=Object.assign({},R.sourceBlobs||{},R.qaBlobs||{});
 const sourceAncestor=physicalGit('merge-base',P.sourceCommit,'HEAD')===P.sourceCommit;
 const localMatchesParent=physicalGit('rev-parse','HEAD^{tree}')===
  physicalGit('rev-parse',L.parentHead+'^{tree}');
 need(LATENCY_REPAIR_ACTIVE&&P.gate==='I6.5/B4-003'&&
  P.authority==='PAULA_CONTINUE_EXISTING_I65_B4003_AFTER_AUTHENTICATED_LOGIN_FAIL_20261023'&&
  P.triggerSubject==='build(i6.5 B4-003): post-auth client paging latency Preview'&&
  P.sourceCommit==='a0220a39cdf91ff71d3ef44212c215a5c4623903'&&
  (sourceAncestor||localMatchesParent)&&sameJson(P,B)&&
  R.schema==='GI_I65_B4003_POST_AUTH_CLIENT_PAGING_LATENCY_PREVIEW_AUTH_V1'&&
  R.gate===P.gate&&R.status===P.status&&R.authority===P.authority&&
  R.triggerSubject===P.triggerSubject&&R.sourceCommit===P.sourceCommit&&
  P.receiptBlobSha===physicalGit('hash-object',P.receiptPath)&&
  P.sourceReceiptBlobSha===L.receiptBlobSha&&
  R.sourceReceiptPath===L.receiptPath&&R.sourceReceiptBlobSha===L.receiptBlobSha&&
  L.receiptBlobSha===physicalGit('hash-object',L.receiptPath)&&
  sameJson(Object.keys(sourceFiles).sort(),Object.keys({...readJson(L.receiptPath).sourceFiles,...readJson(L.receiptPath).qaFiles}).sort())&&
  Object.entries(sourceFiles).every(([p,sha])=>sha===preDualPhysicalHash(p)&&
    sha===physicalGit('rev-parse',P.sourceCommit+':'+p))&&
  P.compositionBlobSha===historicalInsurerPredecessorComposition()&&
  R.compositionBlobSha===P.compositionBlobSha&&
  P.rosterSourceBlobSha===physicalGit('hash-object','functions/assignable-advisor-roster.js')&&
  R.rosterSourceBlobSha===P.rosterSourceBlobSha&&
  sameJson(P.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  sameJson(R.onlyReadOnlyFunctions,P.onlyReadOnlyFunctions)&&
  R.previousAuthenticatedUatStatus==='FAIL_WAITING_SNAPSHOTS_STORE_READINESS_TIMEOUT'&&
  R.nextRealAuthenticatedUatStatus==='PENDING'&&
  ['onlyIsolatedHosting','authenticatedRoleCountryUatRequired','previewEvidenceNotProductionAcceptance']
   .every(k=>P[k]===true&&R[k]===true)&&
  ['sharedFirestoreRulesDeployAuthorized','otherFunctionsDeployAuthorized',
   'operationalWriterDeployAuthorized','businessWritesAuthorized','syntheticQaWritesAuthorized',
   'realUserImpersonationAuthorized','livePromotionAuthorized','dataRefreshAuthorized','reimportAuthorized']
   .every(k=>P[k]===false&&R[k]===false)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_POST_AUTH_CLIENT_PAGING_LATENCY_PREVIEW_AUTH_INVALID');
 console.log('B4_003_POST_AUTH_CLIENT_PAGING_LATENCY_PREVIEW_AUTH=EXACT_READONLY_SECURITY_HOLD');
}
// Current diagnostic is a separate, narrowly pinned source successor. Map
// historical receipt assertions back to the previously certified f570 tree;
// the successor itself is checked against today's real working-tree bytes.
const SAFE_DIAG=C.b4003SafePostAuthDiagnosticSuccessor20261023||{};
const SAFE_DIAG_ACTIVE=SAFE_DIAG.status==='SOURCE_STAGED_SAFE_DIAGNOSTIC_QA_PASS_SECURITY_HOLD';
const SAFE_DIAG_FILES=[
 'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
 'orbit360-platform/core/product-app-p0.js',
 'tools/gravicentra-b4-003-protected-hydration.test.cjs',
 'tools/gravicentra-b4-003-post-auth-bootstrap-diagnostic.test.cjs'
];
if(SAFE_DIAG_ACTIVE)diagnosticPreviousBlobs=new Map(SAFE_DIAG_FILES.map(p=>[
 p,realGit('rev-parse',SAFE_DIAG.parentHead+':'+p)
]));
const historicalDiagnosticHash=p=>diagnosticPreviousBlobs.get(p)||realGit('hash-object',p);
if(SAFE_DIAG_ACTIVE){
 const D=SAFE_DIAG,R=readJson(D.receiptPath);
 const BL=B4.b4003SafePostAuthDiagnosticSuccessor20261023||{};
 const CL=COMP.b4003SafePostAuthDiagnosticSuccessor20261023||{};
 const head=realGit('rev-parse','HEAD');
 const parentReachable=realGit('merge-base',D.parentHead,head)===D.parentHead||
  realGit('rev-parse',D.parentHead+'^{tree}')===realGit('rev-parse',head+'^{tree}');
 const files=Object.assign({},R.sourceFiles,R.qaFiles);
 need(D.gate==='I6.5/B4-003'&&D.parentHead==='f5704a38e6b5d1b91b251ca69375042a58e99034'&&
  parentReachable&&D.authority==='PAULA_CONTINUE_EXISTING_I65_B4003_AFTER_AUTHENTICATED_LOGIN_FAIL_20261023'&&
  R.schema==='GI_I65_B4003_SAFE_POST_AUTH_DIAGNOSTIC_SUCCESSOR_V1'&&
  R.gate===D.gate&&R.status===D.status&&R.authority===D.authority&&R.parentHead===D.parentHead&&
  D.receiptBlobSha===realGit('hash-object',D.receiptPath)&&
  BL.receiptBlobSha===D.receiptBlobSha&&CL.receiptBlobSha===D.receiptBlobSha&&
  sameJson(Object.keys(files).sort(),SAFE_DIAG_FILES.slice().sort())&&
  Object.entries(files).every(([p,v])=>v.before===historicalDiagnosticHash(p)&&
    v.after===realGit('hash-object',p)&&v.before!==v.after)&&
  R.verification?.protectedHydrationSynthetic==='PASS'&&
  R.verification?.safePostAuthDiagnosticVm==='PASS'&&
  R.verification?.privacyClassificationOnly===true&&
  R.verification?.authenticatedUatAccepted===false&&
  R.boundaries?.operationalBusinessWrites===0&&
  ['sharedFirestoreRulesDeploymentAuthorized','operationalWriterDeploymentAuthorized',
   'productionPromotionAuthorized','realUserImpersonationAuthorized','dataReimportAuthorized',
   'gateAdvanceAuthorized'].every(k=>R.boundaries?.[k]===false)&&
  D.authenticatedUatAccepted===false&&D.livePromotionAuthorized===false&&
  D.sharedFirestoreRulesDeploymentAuthorized===false&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&
  FIND.findings.length===295,
  'B4_003_SAFE_POST_AUTH_DIAGNOSTIC_SUCCESSOR_INVALID');
 console.log('B4_003_SAFE_POST_AUTH_DIAGNOSTIC=VM_PASS_REAL_AUTH_FAILURE_RETAINED_RELEASE_HOLD');
}
// Scope the new browser diagnostic strictly to the verified source successor
// and isolated read-only Preview. It is never a security or production PASS.
const SAFE_DIAG_PREVIEW=C.b4003SafePostAuthDiagnosticPreviewAuthorization20261023||{};
if(SAFE_DIAG_PREVIEW.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW'){
 const P=SAFE_DIAG_PREVIEW,R=readJson(P.receiptPath);
 const B=B4.b4003SafePostAuthDiagnosticPreviewAuthorization20261023||{};
 const sourceFiles=Object.assign({},R.sourceBlobs,R.qaBlobs);
 const parent=realGit('merge-base',P.sourceCommit,'HEAD');
 need(P.gate==='I6.5/B4-003'&&
  P.authority==='PAULA_CONTINUE_EXISTING_I65_B4003_AFTER_AUTHENTICATED_LOGIN_FAIL_20261023'&&
  P.triggerSubject==='build(i6.5 B4-003): safe post-auth diagnostic Preview'&&
  P.sourceCommit==='23d3a012b77e98927b8dd9219953d0cfaffca14b'&&parent===P.sourceCommit&&
  sameJson(P,B)&&
  R.schema==='GI_I65_B4003_SAFE_POST_AUTH_DIAGNOSTIC_PREVIEW_AUTH_V1'&&
  R.status===P.status&&R.gate===P.gate&&R.authority===P.authority&&
  R.triggerSubject===P.triggerSubject&&R.sourceCommit===P.sourceCommit&&
  P.receiptBlobSha===realGit('hash-object',P.receiptPath)&&
  R.sourceReceiptPath===SAFE_DIAG.receiptPath&&
  R.sourceReceiptBlobSha===SAFE_DIAG.receiptBlobSha&&
  P.sourceReceiptBlobSha===SAFE_DIAG.receiptBlobSha&&
  P.sourceReceiptBlobSha===realGit('hash-object',SAFE_DIAG.receiptPath)&&
  sameJson(Object.keys(sourceFiles).sort(),SAFE_DIAG_FILES.slice().sort())&&
  Object.entries(sourceFiles).every(([p,sha])=>sha===realGit('hash-object',p)&&
   sha===realGit('rev-parse',P.sourceCommit+':'+p))&&
  R.compositionBlobSha===P.compositionBlobSha&&
  P.compositionBlobSha===(LATENCY_REPAIR_ACTIVE?
    physicalGit('rev-parse',LATENCY_REPAIR.parentHead+':'+I6_CANONICAL_COMPOSITION):
    realGit('hash-object',I6_CANONICAL_COMPOSITION))&&
  R.rosterSourceBlobSha===P.rosterSourceBlobSha&&
  P.rosterSourceBlobSha===realGit('hash-object','functions/assignable-advisor-roster.js')&&
  sameJson(P.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  sameJson(R.onlyReadOnlyFunctions,P.onlyReadOnlyFunctions)&&
  ['onlyIsolatedHosting','authenticatedRoleCountryUatRequired','previewEvidenceNotProductionAcceptance']
   .every(k=>P[k]===true&&R[k]===true)&&
  ['sharedFirestoreRulesDeployAuthorized','otherFunctionsDeployAuthorized',
   'operationalWriterDeployAuthorized','businessWritesAuthorized','syntheticQaWritesAuthorized',
   'realUserImpersonationAuthorized','livePromotionAuthorized','dataRefreshAuthorized','reimportAuthorized']
   .every(k=>P[k]===false&&R[k]===false)&&
  R.previousAuthenticatedUatStatus==='FAIL_READONLY_BOOTSTRAP_BLOCKED'&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.livePromotionAuthorized===false&&
  B4.boundaries?.realOperationalWritesAuthorized===false,
  'B4_003_SAFE_POST_AUTH_DIAGNOSTIC_PREVIEW_AUTH_INVALID');
 console.log('B4_003_SAFE_POST_AUTH_DIAGNOSTIC_PREVIEW_AUTH=EXACT_ISOLATED_READONLY_SECURITY_HOLD');
}
// The writer security successor is a new, exact source version. Preserve the
// 22-Oct signed country/rules receipt against the bytes committed before this
// successor, while validating today's live working bytes independently below.
const WRITER_COUNTRY=C.b4003WriterCountryFailClosedSuccessor20261023||{};
const WRITER_COUNTRY_ACTIVE=WRITER_COUNTRY.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD';
const PROTECTED_STORE_TRANSPORT=C.b4003ProtectedStoreTransportSuccessor20261023||{};
const PROTECTED_STORE_TRANSPORT_ACTIVE=PROTECTED_STORE_TRANSPORT.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD';
const historicalRoleRecoveryHash=p=>ACTIVE_INSURER_ACTIVE&&[
 'orbit360-platform/data/store-firestore-product-readonly-p0.js',
 'orbit360-platform/index.html'
].includes(p)?realGit('rev-parse',ACTIVE_INSURER.sourceParentCommit+':'+p):
 physicalGit('hash-object',p);
const historicalRoleRecoveryComposition=()=>ACTIVE_INSURER_ACTIVE?
 realGit('rev-parse',ACTIVE_INSURER.sourceParentCommit+':'+I6_CANONICAL_COMPOSITION):
 physicalGit('hash-object',I6_CANONICAL_COMPOSITION);
const ROLE_RECOVERY=C.b4003RoleContextRecoveryPreviewAuthorization20261023||{};
const ROLE_RECOVERY_ACTIVE=ROLE_RECOVERY.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW';
if(ROLE_RECOVERY_ACTIVE){
 const P=ROLE_RECOVERY,B=B4.b4003RoleContextRecoveryPreviewAuthorization20261023||{};
 need(exists(P.receiptPath),'B4_003_ROLE_RECOVERY_RECEIPT_MISSING');
 const R=readJson(P.receiptPath);
 const source=['orbit360-platform/data/store-firestore-product-readonly-p0.js','orbit360-platform/index.html'];
 const qa=['tools/gravicentra-b4-003-role-context-recovery.test.cjs'];
 const deny=['sharedFirestoreRulesDeployAuthorized','otherFunctionsDeployAuthorized',
  'operationalWriterDeployAuthorized','businessWritesAuthorized','syntheticQaWritesAuthorized',
  'realUserImpersonationAuthorized','livePromotionAuthorized','dataRefreshAuthorized','reimportAuthorized'];
 need(P.gate==='I6.5/B4-003'&&P.sourceParentCommit==='a52a2d891d1d478933a9cec16f4b4470fbf316d2'&&
  P.triggerSubject==='build(i6.5 B4-003): guarded role context recovery Preview'&&
  sameJson(P,B)&&P.receiptBlobSha===physicalGit('hash-object',P.receiptPath)&&
  R.schema==='GI_I65_B4003_ROLE_CONTEXT_RECOVERY_PREVIEW_AUTH_V1'&&
  R.gate===P.gate&&R.status===P.status&&R.authority===P.authority&&
  R.sourceParentCommit===P.sourceParentCommit&&R.triggerSubject===P.triggerSubject&&
  R.observedAuthenticatedUat?.directionAllToAdvisorColombiaToDirectionAll==='FAIL_REPRODUCED'&&
  R.observedAuthenticatedUat?.serverTransportFailureCause==='NOT_YET_CONFIRMED'&&
  sameJson(Object.keys(R.sourceBlobs||{}).sort(),source.slice().sort())&&
  sameJson(Object.keys(R.qaBlobs||{}).sort(),qa)&&
  source.every(p=>R.sourceBlobs[p]===historicalRoleRecoveryHash(p)&&
   B4.boundaries?.allowedProductFiles?.includes(p))&&
  qa.every(p=>R.qaBlobs[p]===physicalGit('hash-object',p)&&
   B4.boundaries?.allowedQaFiles?.includes(p))&&
  source.every(p=>R.sourceBlobs[p]!==physicalGit('rev-parse',
   'a0220a39cdf91ff71d3ef44212c215a5c4623903:'+p))&&
  R.compositionBlobSha===P.compositionBlobSha&&
  R.compositionBlobSha===historicalRoleRecoveryComposition()&&
  R.rosterSourceBlobSha===P.rosterSourceBlobSha&&
  R.rosterSourceBlobSha===physicalGit('hash-object','functions/assignable-advisor-roster.js')&&
  R.authenticatedSuccessorUatRequired===true&&P.authenticatedSuccessorUatRequired===true&&
  sameJson(P.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  sameJson(R.onlyReadOnlyFunctions,P.onlyReadOnlyFunctions)&&
  P.onlyIsolatedHosting===true&&R.onlyIsolatedHosting===true&&
  P.previewEvidenceNotProductionAcceptance===true&&R.previewEvidenceNotProductionAcceptance===true&&
  deny.every(k=>P[k]===false&&R[k]===false)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false,
  'B4_003_ROLE_RECOVERY_EXACT_PREVIEW_AUTH_INVALID');
 console.log('B4_003_ROLE_RECOVERY=EXACT_SOURCE_QA_PREVIEW_ONLY_SECURITY_HOLD');
}

if(ACTIVE_INSURER_ACTIVE){
 const P=ACTIVE_INSURER,B=B4.b4003ActiveInsurerReadinessPreviewAuthorization20261024||{};
 const R=readJson(P.receiptPath);
 const M=COMP.b4003ActiveInsurerRouteReadiness20261024||{};
 // This already-accepted evidence belongs to the exact pre-successor tree.
 // Only the new successor below may bind the current product bytes.
 const priorComposition=INSURER_POLICY_COUNT_ACTIVE?
  JSON.parse(physicalGit('show',INSURER_POLICY_COUNT.parentHead+':'+I6_CANONICAL_COMPOSITION)):COMP;
 const priorCompositionBlob=INSURER_POLICY_COUNT_ACTIVE?
  physicalGit('rev-parse',INSURER_POLICY_COUNT.parentHead+':'+I6_CANONICAL_COMPOSITION):
  realGit('hash-object',I6_CANONICAL_COMPOSITION);
 const sources=[
  'orbit360-platform/data/store-firestore-product-readonly-p0.js',
  'orbit360-platform/modules/aseguradoras.js',
  'orbit360-platform/index.html'
 ],qa='tools/gravicentra-b4-003-active-insurer-readiness.test.cjs';
 const expectedPrevious=realGit('rev-parse',P.sourceParentCommit);
 need(P.gate==='I6.5/B4-003'&&P.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW'&&
  P.sourceParentCommit==='aeabc4000c5c311ff2eab7e2c576c075ca7cd266'&&
  realGit('merge-base',expectedPrevious,realGit('rev-parse','HEAD'))===expectedPrevious&&
  P.triggerSubject==='build(i6.5 B4-003): active insurer role readiness Preview'&&
  sameJson(P,B)&&P.receiptBlobSha===realGit('hash-object',P.receiptPath)&&
  R.schema==='GI_I65_B4003_ACTIVE_INSURER_READINESS_PREVIEW_AUTH_V1'&&
  R.status===P.status&&R.gate===P.gate&&R.authority===P.authority&&
  R.sourceParentCommit===P.sourceParentCommit&&R.triggerSubject===P.triggerSubject&&
  R.compositionBlobSha===priorCompositionBlob&&
  P.compositionBlobSha===R.compositionBlobSha&&
  M.status==='SOURCE_PATCH_STAGED_SYNTHETIC_VM_PASS_AUTHENTICATED_UAT_PENDING'&&
  M.parentHead===P.sourceParentCommit&&M.qaBlobSha===R.qaBlobs?.[qa]&&
  sameJson(Object.keys(R.sourceBlobs||{}).sort(),sources.slice().sort())&&
  sameJson(Object.keys(R.qaBlobs||{}),[qa])&&
  sources.every(p=>R.sourceBlobs[p]===(INSURER_POLICY_COUNT_ACTIVE?
   physicalGit('rev-parse',INSURER_POLICY_COUNT.parentHead+':'+p):realGit('hash-object',p))&&
   M.sourceBlobs?.[p]===R.sourceBlobs[p]&&
   priorComposition.productFileBlobs?.[p]===R.sourceBlobs[p]&&
   COMP.productFiles.includes(p)&&B4.boundaries?.allowedProductFiles?.includes(p)&&
   R.sourceBlobs[p]!==realGit('rev-parse',P.sourceParentCommit+':'+p))&&
  R.qaBlobs?.[qa]===(INSURER_POLICY_COUNT_ACTIVE?
   physicalGit('rev-parse',INSURER_POLICY_COUNT.parentHead+':'+qa):realGit('hash-object',qa))&&
  B4.boundaries?.allowedQaFiles?.includes(qa)&&
  P.rosterSourceBlobSha===realGit('hash-object','functions/assignable-advisor-roster.js')&&
  P.rosterSourceBlobSha===R.rosterSourceBlobSha&&
  R.syntheticVmResult==='PASS_ACTIVE_ROUTE_BEFORE_STARTUP_NO_DIRECT_FIRESTORE'&&
  R.authenticatedRoleCountryUatRequired===true&&P.authenticatedRoleCountryUatRequired===true&&
  P.onlyIsolatedHosting===true&&R.onlyIsolatedHosting===true&&
  sameJson(P.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  sameJson(R.onlyReadOnlyFunctions,P.onlyReadOnlyFunctions)&&
  ['sharedFirestoreRulesDeployAuthorized','otherFunctionsDeployAuthorized',
   'operationalWriterDeployAuthorized','businessWritesAuthorized',
   'syntheticQaWritesAuthorized','realUserImpersonationAuthorized',
   'livePromotionAuthorized','dataRefreshAuthorized','reimportAuthorized']
   .every(k=>P[k]===false&&R[k]===false)&&
  C.currentB4?.compositionLockBlobSha===realGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===realGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  B4.compositionLockBlobSha===realGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.currentB4?.executionLockBlobSha===realGit('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===realGit('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_ACTIVE_INSURER_READINESS_SCOPE_OR_PROOF_INVALID');
 // Historical proof window only; no grant and no production artifact alias.
 historicalInsurerProductBlobs=new Map((INSURER_POLICY_COUNT_ACTIVE?
  sources.concat('orbit360-platform/core/router.js'):sources).map(p=>[
   p,physicalGit('rev-parse',P.sourceParentCommit+':'+p)
 ]));
 console.log('B4_003_ACTIVE_INSURER_READINESS=EXACT_SCOPED_SOURCE_VM_PASS_AUTH_UAT_HOLD');
}

if(INSURER_POLICY_COUNT_ACTIVE){
 const P=INSURER_POLICY_COUNT,R=readJson(P.receiptPath);
 const BL=B4.b4003InsurerPolicyCountSourceSuccessor20261024||{};
 const CL=COMP.b4003InsurerPolicyCountSourceSuccessor20261024||{};
 const source=[
  'orbit360-platform/core/router.js',
  'orbit360-platform/index.html',
  'orbit360-platform/modules/aseguradoras.js'
 ].sort();
 const qa=[
  '.github/workflows/gravicentra-b4-003-executor.yml',
  'tools/gravicentra-b4-003-active-insurer-readiness.test.cjs',
  'tools/gravicentra-i6-control-plane-guard-v1.mjs'
 ].sort();
 const pairs={...R.sourceFiles,...R.qaFiles};
 // Validate the insurer policy-count receipt against its immutable QA hashes.
 // The guard itself has advanced since that receipt; current guard execution is
 // still exercised below, while historical receipt bytes remain pinned here.
 const policyCountHistoricalHash=p=>qa.includes(p)
  ?P.qaBlobsAfter?.[p]:preDualPhysicalHash(p);
 need(P.parentHead==='695a467dec5369a0860b64b361d226cde26ea074'&&
  physicalGit('merge-base',P.parentHead,'HEAD')===P.parentHead&&
  P.gate==='I6.5/B4-003'&&
  P.authority==='PAULA_EXPLICIT_INSURER_POLICY_COUNT_CODE_AND_ISOLATED_PREVIEW_20261024'&&
  P.receiptBlobSha===physicalGit('hash-object',P.receiptPath)&&
  R.schema==='GI_I65_B4003_INSURER_POLICY_COUNT_SUCCESSOR_V1'&&
  R.status===P.status&&R.gate===P.gate&&R.authority===P.authority&&
  R.parentHead===P.parentHead&&
  P.sourceBlobsAfter&&P.qaBlobsAfter&&
  sameJson(Object.keys(R.sourceFiles||{}).sort(),source)&&
  sameJson(Object.keys(R.qaFiles||{}).sort(),qa)&&
  [...source,...qa].every(p=>pairs[p]?.before===physicalGit('rev-parse',P.parentHead+':'+p)&&
   pairs[p]?.after===policyCountHistoricalHash(p)&&pairs[p].before!==pairs[p].after)&&
  source.every(p=>P.sourceBlobsAfter[p]===pairs[p].after&&
   BL.sourceBlobsAfter[p]===pairs[p].after&&CL.sourceBlobsAfter[p]===pairs[p].after&&
   COMP.productFiles.includes(p)&&COMP.productFileBlobs[p]===pairs[p].after&&
   B4.boundaries?.allowedProductFiles?.includes(p))&&
  qa.every(p=>P.qaBlobsAfter[p]===pairs[p].after&&
   BL.qaBlobsAfter[p]===pairs[p].after&&CL.qaBlobsAfter[p]===pairs[p].after&&
   B4.boundaries?.allowedQaFiles?.includes(p))&&
  P.receiptBlobSha===BL.receiptBlobSha&&P.receiptBlobSha===CL.receiptBlobSha&&
  R.verification?.activeInsurerMock==='PASS'&&
  R.verification?.protectedHydrationMock==='PASS'&&
  R.verification?.roleRecoveryMock==='PASS'&&
  R.verification?.authenticatedCrossUidSecurity==='HOLD'&&
  R.verification?.humanAcceptance==='HOLD'&&
  R.boundaries?.isolatedHostingOnly===true&&
  ['sharedRulesDeployAuthorized','operationalWritesAuthorized','syntheticQaWritesAuthorized',
   'livePromotionAuthorized','reimportAuthorized','realUserImpersonationAuthorized']
   .every(k=>R.boundaries[k]===false)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&
  C.currentB4?.compositionLockBlobSha===physicalGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===physicalGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  B4.compositionLockBlobSha===physicalGit('hash-object',I6_CANONICAL_COMPOSITION)&&
  FIND.findings.length===295,'B4_003_INSURER_POLICY_COUNT_SUCCESSOR_INVALID');
 console.log('B4_003_INSURER_POLICY_COUNT=EXACT_CAUSAL_SOURCE_AND_QA_BOUND_UAT_HOLD');
}

// Historical proof snapshots are read from the exact predecessor tree that
// the active source successor was approved against. This is NOT the release
// composition; the final source manifest remains COMP and is verified below
// against physical working-tree blob SHAs without historical hash adapters.
const HISTORIC_PRE_INSURER_COMPOSITION=ACTIVE_INSURER_ACTIVE?
 JSON.parse(physicalGit('show',ACTIVE_INSURER.sourceParentCommit+':'+I6_CANONICAL_COMPOSITION)):
 COMP;
const roleRecoveryPredecessor=p=>ROLE_RECOVERY_ACTIVE&&[
 'orbit360-platform/data/store-firestore-product-readonly-p0.js',
 'orbit360-platform/index.html'
].includes(p)?realGit('rev-parse','a0220a39cdf91ff71d3ef44212c215a5c4623903:'+p):null;
const protectedStorePreviousHash=p=>PROTECTED_STORE_TRANSPORT_ACTIVE&&[
  'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
  'tools/gravicentra-b4-003-protected-hydration.test.cjs'
 ].includes(p)?realGit('rev-parse',PROTECTED_STORE_TRANSPORT.parentHead+':'+p):
  roleRecoveryPredecessor(p)||git('hash-object',p);
const protectedStoreHistoricCompositionBlob=p=>PROTECTED_STORE_TRANSPORT_ACTIVE&&
 p==='orbit360-platform/core/backend-product-readonly-bootstrap-p0.js'
 ?protectedStorePreviousHash(p):HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[p];
const writerPreviousHash=p=>WRITER_COUNTRY_ACTIVE&&[
  'functions/product-operational-domain.js',
  'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs'
 ].includes(p)?realGit('rev-parse',WRITER_COUNTRY.parentHead+':'+p):protectedStorePreviousHash(p);
// An exact B4-003 cumulative source successor is subordinate to the same
// release/security HOLD. It does not rewrite, pass or waive prior approvals.
const COUNTRY_RULES=C.b4003RulesCountryHydrationSourceSuccessor20261022||{};
if(COUNTRY_RULES.status==='SOURCE_STAGED_QA_PASS_RELEASE_HOLD'){
 const receipt=readJson(COUNTRY_RULES.receiptPath);
 const source=Object.keys(receipt.sourceFiles||{}).sort(),qa=Object.keys(receipt.qaFiles||{}).sort();
 const expectedSource=[
  'firestore.b4-003-scoped-candidate.rules','functions/product-operational-domain.js',
  'orbit360-platform/core/product-app-p0.js','orbit360-platform/data/store-firestore-product-readonly-p0.js',
  'orbit360-platform/index.html','orbit360-platform/styles/infra.css'
 ].sort();
 const expectedQa=[
  'tools/gravicentra-b4-003-firestore-emulator.test.cjs',
  'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs',
  'tools/gravicentra-b4-003-protected-hydration.test.cjs',
  'tools/gravicentra-b4-003-role-first-paint-and-team-regression.test.cjs'
 ].sort();
 const narrowOutsideSource=['firestore.b4-003-scoped-candidate.rules','functions/product-operational-domain.js'].sort();
 const narrowOutsideQa=['tools/gravicentra-b4-003-firestore-emulator.test.cjs',
  'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs'].sort();
 const head=COUNTRY_RULES.parentHead;
 // Bind the historical before-image to the exact canonical manifest in the
 // source receipt's parent commit, not to the later live composition.
 const historicalCountryComposition=JSON.parse(realGit('show',head+':'+I6_CANONICAL_COMPOSITION));
 need(COUNTRY_RULES.gate==='I6.5/B4-003'&&
  receipt.schema==='GI_I65_B4003_EXACT_CUMULATIVE_SOURCE_SUCCESSOR_V1'&&
  receipt.status===COUNTRY_RULES.status&&
  receipt.authority==='PAULA_CONTINUE_SYNC_RECONCILE_WITHIN_B4_003_20261022'&&
  head==='d89e2a3d5739dba32e7a794556e58c2acd9e1546'&&
  receipt.parentHead===head&&
  COUNTRY_RULES.receiptBlobSha===realGit('hash-object',COUNTRY_RULES.receiptPath)&&
  COUNTRY_RULES.sourceChanged===true&&COUNTRY_RULES.qaIsolatedPass===true&&
  COUNTRY_RULES.authenticatedUatAccepted===false&&
  COUNTRY_RULES.isolatedPreview?.status==='AUTHORIZED_EXISTING_B4_003_READONLY_HOSTING_PREVIEW_ONLY'&&
  COUNTRY_RULES.isolatedPreview?.triggerSubject==='build(i6.5 B4-003): exact protected rules-country source Preview'&&
  sameJson(COUNTRY_RULES.isolatedPreview?.onlyReadOnlyFunctions,
   ['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  COUNTRY_RULES.isolatedPreview?.realUserImpersonationAuthorized===false&&
  COUNTRY_RULES.isolatedPreview?.syntheticQaWritesAuthorized===false&&
  COUNTRY_RULES.isolatedPreview?.sharedFirestoreRulesDeploymentAuthorized===false&&
  COUNTRY_RULES.isolatedPreview?.operationalWriterDeploymentAuthorized===false&&
  COUNTRY_RULES.isolatedPreview?.productionPromotionAuthorized===false&&
  COUNTRY_RULES.sharedFirestoreRulesDeploymentAuthorized===false&&
  COUNTRY_RULES.operationalWriterDeploymentAuthorized===false&&
  COUNTRY_RULES.productionPromotionAuthorized===false&&
  COUNTRY_RULES.gateAdvanceAuthorized===false&&
  sameJson(source,expectedSource)&&sameJson(qa,expectedQa)&&
  sameJson(receipt.exactOutsideFrozenB4SourceList?.slice().sort(),narrowOutsideSource)&&
  sameJson(receipt.exactOutsideFrozenB4QaList?.slice().sort(),narrowOutsideQa)&&
  source.every(p=>{
    const pair=receipt.sourceFiles[p];
    return pair.before===realGit('rev-parse',head+':'+p)&&
      pair.before===historicalCountryComposition.productFileBlobs?.[p]&&
      historicalCountryComposition.productFiles.includes(p)&&COMP.productFiles.includes(p)&&
      pair.after===writerPreviousHash(p)&&pair.after!==pair.before&&
      (B4.boundaries?.allowedProductFiles?.includes(p)||narrowOutsideSource.includes(p));
  })&&qa.every(p=>{
    const pair=receipt.qaFiles[p];
    return pair.before===realGit('rev-parse',head+':'+p)&&
      pair.after===writerPreviousHash(p)&&pair.after!==pair.before&&
      (B4.boundaries?.allowedQaFiles?.includes(p)||narrowOutsideQa.includes(p));
  })&&receipt.verification?.firestoreEmulatorSyntheticDenialsPass===true&&
  receipt.verification?.operationalWriteCasesPassed===27&&
  receipt.verification?.firstPaintRoleCountryChecksPassed===120&&
  receipt.verification?.authenticatedUatAccepted===false&&
  receipt.boundaries?.operationalBusinessWrites===0&&
  receipt.boundaries?.sharedFirestoreRulesDeploymentAuthorized===false&&
  receipt.boundaries?.operationalWriterDeploymentAuthorized===false&&
  receipt.boundaries?.productionPromotionAuthorized===false&&
  receipt.boundaries?.gateAdvanceAuthorized===false&&
  C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&
  FIND.findings.length===295,
  'B4_003_CUMULATIVE_SUCCESSOR_SOURCE_QA_OR_BOUNDARY_INVALID');
 predecessorSourceBlobs=new Map(source.map(p=>[p,receipt.sourceFiles[p].before])
  .concat(qa.map(p=>[p,receipt.qaFiles[p].before])));
 console.log('B4_003_CUMULATIVE_SUCCESSOR=EXACT_SOURCE_AND_QA_BOUND_LIVE_HOLD');
}
if(WRITER_COUNTRY_ACTIVE){
 const R=readJson(WRITER_COUNTRY.receiptPath);
 const B=B4.b4003WriterCountryFailClosedSuccessor20261023||{};
 const P=COMP.b4003WriterCountryFailClosedSuccessor20261023||{};
 const source='functions/product-operational-domain.js';
 const qa='tools/gravicentra-b4-003-operational-write-security-regression.test.cjs';
 const current=realGit('rev-parse','HEAD');
 const parentMatches=realGit('merge-base',WRITER_COUNTRY.parentHead,current)===WRITER_COUNTRY.parentHead;
 const receiptSha=realGit('hash-object',WRITER_COUNTRY.receiptPath);
 need(parentMatches&&
  WRITER_COUNTRY.parentHead==='8e187a7bb1b788d886d021658846003b2756a995'&&
  WRITER_COUNTRY.gate==='I6.5/B4-003'&&
  WRITER_COUNTRY.authority==='PAULA_EXPLICIT_FIX_AND_DEPLOY_REQUEST_WITHIN_B4_003_20261023'&&
  R.schema==='GI_I65_B4003_WRITER_COUNTRY_FAIL_CLOSED_SUCCESSOR_V1'&&
  R.gate===WRITER_COUNTRY.gate&&R.status===WRITER_COUNTRY.status&&
  R.parentHead===WRITER_COUNTRY.parentHead&&R.authority===WRITER_COUNTRY.authority&&
  WRITER_COUNTRY.receiptBlobSha===receiptSha&&
  sameJson(Object.keys(R.sourceFiles||{}),[source])&&
  sameJson(Object.keys(R.qaFiles||{}),[qa])&&
  R.sourceFiles[source]?.before===realGit('rev-parse',WRITER_COUNTRY.parentHead+':'+source)&&
  R.sourceFiles[source]?.after===realGit('hash-object',source)&&
  R.sourceFiles[source]?.before!==R.sourceFiles[source]?.after&&
  R.qaFiles[qa]?.before===realGit('rev-parse',WRITER_COUNTRY.parentHead+':'+qa)&&
  R.qaFiles[qa]?.after===realGit('hash-object',qa)&&
  R.qaFiles[qa]?.before!==R.qaFiles[qa]?.after&&
  WRITER_COUNTRY.sourceBlobSha===R.sourceFiles[source]?.after&&
  WRITER_COUNTRY.qaBlobSha===R.qaFiles[qa]?.after&&
  B.sourceBlobSha===WRITER_COUNTRY.sourceBlobSha&&P.sourceBlobSha===WRITER_COUNTRY.sourceBlobSha&&
  B.qaBlobSha===WRITER_COUNTRY.qaBlobSha&&P.qaBlobSha===WRITER_COUNTRY.qaBlobSha&&
  B.receiptBlobSha===receiptSha&&P.receiptBlobSha===receiptSha&&
  B.gate===WRITER_COUNTRY.gate&&P.gate===WRITER_COUNTRY.gate&&
  B.parentHead===WRITER_COUNTRY.parentHead&&P.parentHead===WRITER_COUNTRY.parentHead&&
  R.verification?.syntheticWriteCasesPassedAfterFix===30&&
  WRITER_COUNTRY.syntheticWriteCasesPassed===30&&B.syntheticWriteCasesPassed===30&&
  R.verification?.syntheticNoNetworkTestsPassed===true&&
  sameJson(R.verification?.negativeCasesFailedBeforeFix,
    ['missing_member_country_denied','missing_document_country_denied'])&&
  R.verification?.authenticatedRoleCountryUatAccepted===false&&
  R.verification?.effectiveFirestoreRulesVerifiedSecure===false&&
  R.verification?.productionSecurityAccepted===false&&
  R.boundaries?.operationalBusinessWrites===0&&
  R.boundaries?.firebaseRulesChanged===false&&
  R.boundaries?.sharedDataModified===false&&
  R.boundaries?.sharedFirestoreRulesDeploymentAuthorized===false&&
  R.boundaries?.operationalWriterDeploymentAuthorized===false&&
  R.boundaries?.livePromotionAuthorized===false&&
  R.boundaries?.productionAccepted===false&&
  R.boundaries?.gateAdvanceAuthorized===false&&
  WRITER_COUNTRY.sharedFirestoreRulesDeploymentAuthorized===false&&
  WRITER_COUNTRY.operationalWriterDeploymentAuthorized===false&&
  WRITER_COUNTRY.livePromotionAuthorized===false&&
  WRITER_COUNTRY.productionReadinessUnchanged===true&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false,
  'B4_003_WRITER_COUNTRY_FAIL_CLOSED_SOURCE_SUCCESSOR_INVALID');
 console.log('B4_003_WRITER_COUNTRY_FAIL_CLOSED=EXACT_SOURCE_SYNTHETIC_QA_PASS_RELEASE_HOLD');
}
// Latest narrowly scoped Preview transport hardening. Historical hashes are
// checked at the committed parent, while the single cumulative composition
// is pinned to the new working bytes. No change to shared Rules or LIVE.
if(PROTECTED_STORE_TRANSPORT_ACTIVE){
 const T=PROTECTED_STORE_TRANSPORT;
 const R=readJson(T.receiptPath);
 const B=B4.b4003ProtectedStoreTransportSuccessor20261023||{};
 const P=COMP.b4003ProtectedStoreTransportSuccessor20261023||{};
 const source='orbit360-platform/core/backend-product-readonly-bootstrap-p0.js';
 const qa='tools/gravicentra-b4-003-protected-hydration.test.cjs';
 const exactParent=realGit('rev-parse',T.parentHead);
 const current=realGit('rev-parse','HEAD');
 const parentIsReachable=realGit('merge-base',exactParent,current)===exactParent;
 const receiptBlob=realGit('hash-object',T.receiptPath);
 const sourceAfter=historicalDiagnosticHash(source),qaAfter=historicalDiagnosticHash(qa);
 const currentComp=realGit('hash-object',I6_CANONICAL_COMPOSITION);
 const currentB4=realGit('hash-object',ACTIVE_I65_FORENSIC_B4);
 need(T.gate==='I6.5/B4-003'&&T.parentHead==='9fa65116e5ddf9a3a0009d5befbf904d4aa1ddbc'&&
  (current===T.parentHead||parentIsReachable)&&
  T.authority==='PAULA_CONTINUE_SCOPED_SOURCE_SECURITY_CORRECTION_20261023'&&
  R.schema==='GI_I65_B4003_PROTECTED_STORE_TRANSPORT_SUCCESSOR_V1'&&
  R.gate===T.gate&&R.status===T.status&&R.authority===T.authority&&R.parentHead===T.parentHead&&
  T.receiptBlobSha===receiptBlob&&B.receiptBlobSha===receiptBlob&&P.receiptBlobSha===receiptBlob&&
  sameJson(Object.keys(R.sourceFiles||{}),[source])&&sameJson(Object.keys(R.qaFiles||{}),[qa])&&
  R.sourceFiles[source]?.before===realGit('rev-parse',T.parentHead+':'+source)&&
  R.qaFiles[qa]?.before===realGit('rev-parse',T.parentHead+':'+qa)&&
  R.sourceFiles[source]?.after===sourceAfter&&R.qaFiles[qa]?.after===qaAfter&&
  R.sourceFiles[source]?.before!==sourceAfter&&R.qaFiles[qa]?.before!==qaAfter&&
  T.sourceBlobSha===sourceAfter&&B.sourceBlobSha===sourceAfter&&P.sourceBlobSha===sourceAfter&&
  T.qaBlobSha===qaAfter&&B.qaBlobSha===qaAfter&&P.qaBlobSha===qaAfter&&
  HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[source]===sourceAfter&&COMP.productFiles.includes(source)&&
  B4.boundaries?.allowedProductFiles?.includes(source)&&B4.boundaries?.allowedQaFiles?.includes(qa)&&
  realGit('rev-parse',T.parentHead+':'+I6_CANONICAL_COMPOSITION)==='fc705b9f80fd9d20d67cfc79ff89116e520382dc'&&
  realGit('rev-parse',T.parentHead+':'+ACTIVE_I65_FORENSIC_B4)==='57d5ea416cc00c27e7d7e8577e84b5d2c2475308'&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===currentComp&&
  B4.compositionLockBlobSha===currentComp&&
  C.currentB4?.compositionLockBlobSha===currentComp&&
  C.currentB4?.executionLockBlobSha===currentB4&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===currentB4&&
  R.verification?.transportDependencyAcquisitionInProtectedMode===0&&
  sameJson(R.verification?.protectedStoreDependencyKeys,['protectedReadPage'])&&
  R.verification?.legacyUnprotectedTransportUnchanged===true&&
  R.verification?.focusedTestsPassed===5&&B.syntheticQaPass===true&&T.syntheticQaPass===true&&
  R.verification?.authenticatedRoleCountryUatAccepted===false&&
  R.verification?.effectiveDeployedFirestoreRulesSecure===false&&
  R.verification?.productionSecurityAccepted===false&&
  R.boundaries?.operationalBusinessWrites===0&&R.boundaries?.firebaseRulesChanged===false&&
  R.boundaries?.sharedDataModified===false&&
  R.boundaries?.sharedFirestoreRulesDeploymentAuthorized===false&&
  R.boundaries?.operationalWriterDeploymentAuthorized===false&&
  R.boundaries?.livePromotionAuthorized===false&&R.boundaries?.productionAccepted===false&&
  R.boundaries?.gateAdvanceAuthorized===false&&
  T.sharedFirestoreRulesDeploymentAuthorized===false&&
  T.operationalWriterDeploymentAuthorized===false&&T.livePromotionAuthorized===false&&
  T.productionReadinessUnchanged===true&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false,
  'B4_003_PROTECTED_STORE_TRANSPORT_SUCCESSOR_INVALID');
 console.log('B4_003_PROTECTED_STORE_TRANSPORT=CALLABLE_ONLY_SYNTHETIC_QA_PASS_RELEASE_HOLD');
}
// This authorization exists solely to certify the exact source successor on
// isolated read-only Preview. It must never weaken the shared Rules/LIVE hold.
const PROTECTED_STORE_PREVIEW=C.b4003ProtectedStorePreviewAuthorization20261023||{};
if(PROTECTED_STORE_PREVIEW.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW'){
 const P=PROTECTED_STORE_PREVIEW;
 const R=readJson(P.receiptPath);
 const B=B4.b4003ProtectedStorePreviewAuthorization20261023||{};
 const T=C.b4003ProtectedStoreTransportSuccessor20261023||{};
 const ancestor=realGit('merge-base',P.sourceCommit,'HEAD');
 need(P.gate==='I6.5/B4-003'&&
  P.authority==='PAULA_CONTINUE_WITHIN_CURRENT_I65_B4003_20261023'&&
  P.triggerSubject==='build(i6.5 B4-003): exact protected store transport Preview'&&
  sameJson(P,B)&&P.sourceCommit===R.sourceCommit&&ancestor===P.sourceCommit&&
  R.schema==='GI_I65_B4003_PROTECTED_STORE_READONLY_PREVIEW_AUTH_V1'&&
  R.gate===P.gate&&R.status===P.status&&R.authority===P.authority&&R.triggerSubject===P.triggerSubject&&
  P.receiptBlobSha===realGit('hash-object',P.receiptPath)&&
  R.sourceReceiptPath===T.receiptPath&&P.sourceReceiptBlobSha===T.receiptBlobSha&&
  P.sourceReceiptBlobSha===realGit('hash-object',T.receiptPath)&&
  R.sourceReceiptBlobSha===P.sourceReceiptBlobSha&&
  R.sourcePath==='orbit360-platform/core/backend-product-readonly-bootstrap-p0.js'&&
  R.qaPath==='tools/gravicentra-b4-003-protected-hydration.test.cjs'&&
  P.sourceBlobSha===T.sourceBlobSha&&P.sourceBlobSha===R.sourceBlobSha&&
  P.sourceBlobSha===historicalDiagnosticHash(R.sourcePath)&&
  realGit('rev-parse',P.sourceCommit+':'+R.sourcePath)===P.sourceBlobSha&&
  P.qaBlobSha===T.qaBlobSha&&P.qaBlobSha===R.qaBlobSha&&
  P.qaBlobSha===historicalDiagnosticHash(R.qaPath)&&
  P.compositionBlobSha===R.compositionBlobSha&&
  P.compositionBlobSha===(SAFE_DIAG_ACTIVE?realGit('rev-parse',SAFE_DIAG.parentHead+':'+I6_CANONICAL_COMPOSITION):realGit('hash-object',I6_CANONICAL_COMPOSITION))&&
  P.rosterSourceBlobSha===R.rosterSourceBlobSha&&
  P.rosterSourceBlobSha===realGit('hash-object','functions/assignable-advisor-roster.js')&&
  sameJson(P.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  sameJson(R.onlyReadOnlyFunctions,P.onlyReadOnlyFunctions)&&
  ['onlyIsolatedHosting','authenticatedRoleCountryUatRequired','previewEvidenceNotProductionAcceptance']
   .every(k=>P[k]===true&&R[k]===true)&&
  ['sharedFirestoreRulesDeployAuthorized','otherFunctionsDeployAuthorized',
   'operationalWriterDeployAuthorized','businessWritesAuthorized','syntheticQaWritesAuthorized',
   'realUserImpersonationAuthorized','livePromotionAuthorized','dataRefreshAuthorized','reimportAuthorized']
   .every(k=>P[k]===false&&R[k]===false)&&
  C.currentB4?.status==='B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL'&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false&&
  C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
  B4.boundaries?.previewMutationAuthorized===true&&B4.boundaries?.functionDeploymentAuthorized===true&&
  B4.boundaries?.realOperationalWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false,
  'B4_003_PROTECTED_STORE_PREVIEW_AUTH_INVALID');
 console.log('B4_003_PROTECTED_STORE_PREVIEW_AUTH=EXACT_READONLY_HOSTING_ONLY_LIVE_HOLD');
}
// B4-003: A successor never rewrites the certified blobs of an older Preview.
// Its source is checked against the parent commit, the canonical composition,
// and the exact QA artifacts; historical receipts remain independently sealed.
const UAT_FIX=C.b4003AuthenticatedUatCausalFix20261022||{};
const UAT_FIX_ACTIVE=UAT_FIX.status==='SOURCE_FIXED_LOCAL_QA_PASS_PREVIEW_PENDING';
const preUatFixBlob=p=>UAT_FIX_ACTIVE?git('rev-parse',UAT_FIX.parentHead+':'+p):git('hash-object',p);
const preUatFixComposition=UAT_FIX_ACTIVE?UAT_FIX.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION);
const preUatFixExecution=UAT_FIX_ACTIVE?UAT_FIX.previousExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4);
// A new successor is checked against its exact predecessor commit. Preserve
// the earlier UAT receipt at that committed parent; later updates never
// retroactively change the historical composition or execution lock blobs.
const afterUatCountry=C.b4003WhatsappPortalCountrySuccessor20261023||{};
const uatSealAt=afterUatCountry.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD'?
 afterUatCountry.parentHead:'';
const uatFixSealedComposition=uatSealAt?
 realGit('rev-parse',uatSealAt+':'+I6_CANONICAL_COMPOSITION):git('hash-object',I6_CANONICAL_COMPOSITION);
const uatFixSealedExecution=uatSealAt?
 realGit('rev-parse',uatSealAt+':'+ACTIVE_I65_FORENSIC_B4):git('hash-object',ACTIVE_I65_FORENSIC_B4);
if(UAT_FIX_ACTIVE){
 const receipt=readJson(UAT_FIX.receiptPath),locked=B4.b4003AuthenticatedUatCausalFix20261022||{};
 const staged=COMP.b4003AuthenticatedUatCausalFix20261022||{};
 const source=Object.keys(receipt.sourceFiles||{}),qa=Object.keys(receipt.qaFiles||{});
 need(UAT_FIX.gate==='I6.5/B4-003'&&UAT_FIX.approval===locked.approval&&
   UAT_FIX.parentHead==='d9e2cd656b4e9e2895605df5a1116c6e95055226'&&
   UAT_FIX.sourceCommit==='8c7e3c00874e43211b880014baa19ea45e455717'&&
   UAT_FIX.previousCompositionBlobSha==='9e08066da7f338690e18fac987842c969f418d4f'&&
   UAT_FIX.previousExecutionLockBlobSha==='13907e432e6de488bb1ecc10149e69935c4ca982'&&
   UAT_FIX.receiptBlobSha===git('hash-object',UAT_FIX.receiptPath)&&
   receipt.status===UAT_FIX.status&&receipt.approval===UAT_FIX.approval&&
   receipt.parentHead===UAT_FIX.parentHead&&receipt.sourceCommit===UAT_FIX.sourceCommit&&
   receipt.previousCompositionBlobSha===preUatFixComposition&&
   receipt.previousExecutionLockBlobSha===preUatFixExecution&&
   UAT_FIX.compositionBlobSha===uatFixSealedComposition&&
   UAT_FIX.executionLockBlobSha===uatFixSealedExecution&&
   locked.compositionBlobSha===UAT_FIX.compositionBlobSha&&
   locked.receiptBlobSha===UAT_FIX.receiptBlobSha&&
   B4.compositionLockBlobSha===realGit('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===realGit('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.currentB4?.executionLockBlobSha===realGit('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===realGit('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   source.length===3&&qa.length===2&&
   sameJson(receipt.sourceFiles,Object.fromEntries(source.map(p=>[p,{before:staged.sourceBlobsBefore?.[p],after:staged.sourceBlobsAfter?.[p]}])))&&
   source.every(p=>receipt.sourceFiles[p].before===preUatFixBlob(p)&&
     receipt.sourceFiles[p].after===git('hash-object',p)&&
     receipt.sourceFiles[p].after===HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[p]&&
     COMP.productFiles.includes(p)&&B4.boundaries?.allowedProductFiles?.includes(p))&&
   sameJson(receipt.qaFiles,UAT_FIX.qaFiles)&&
   qa.every(p=>receipt.qaFiles[p]===git('hash-object',p)&&
     B4.boundaries?.allowedQaFiles?.includes(p))&&
   receipt.qa.testedLocally===true&&receipt.qa.focusedTestsFailed===0&&
   receipt.historicalProof.untouched===true&&receipt.historicalProof.noRetroactivePass===true&&
   receipt.boundaries.operationalBusinessWrites===0&&
   receipt.boundaries.firestoreRulesDeployAuthorized===false&&
   receipt.boundaries.livePromotionAuthorized===false&&
   receipt.boundaries.productionAccepted===false&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   FIND.findings.length===295&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false,
   'B4_003_UAT_CAUSAL_SUCCESSOR_SOURCE_OR_LINEAGE_INVALID');
 console.log('B4_003_UAT_CAUSAL_SUCCESSOR=PASS_SOURCE_QA_PREVIEW_PENDING_SECURITY_HOLD');
}
const UAT_FIX_PREVIEW=C.b4003AuthenticatedUatPreviewAuthorization20261022||{};
if(UAT_FIX_PREVIEW.status==='AUTHORIZED_EXACT_SCOPED_READONLY_PREVIEW'){
 const locked=B4.b4003AuthenticatedUatPreviewAuthorization20261022||{};
 const successor=COMP.b4003AuthenticatedUatCausalFix20261022||{};
 need(UAT_FIX_ACTIVE&&sameJson(UAT_FIX_PREVIEW,locked)&&
   UAT_FIX_PREVIEW.gate==='I6.5/B4-003'&&
   UAT_FIX_PREVIEW.approval===UAT_FIX.approval&&
   UAT_FIX_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact authenticated UAT causal fixes Preview'&&
   UAT_FIX_PREVIEW.sourceCommit===UAT_FIX.sourceCommit&&
   UAT_FIX_PREVIEW.sourceReceiptBlobSha===UAT_FIX.receiptBlobSha&&
   UAT_FIX_PREVIEW.compositionBlobSha===uatFixSealedComposition&&
   UAT_FIX_PREVIEW.configQaBlobSha===git('hash-object','tools/gravicentra-b4-003-config-users-owner.test.cjs')&&
   UAT_FIX_PREVIEW.financeQaBlobSha===git('hash-object','tools/gravicentra-b4-003-portfolio-verified-receipt-amount.test.cjs')&&
   Object.entries(successor.sourceBlobsAfter||{}).length===3&&
   Object.entries(successor.sourceBlobsAfter).every(([p,sha])=>
     sha===git('rev-parse',UAT_FIX_PREVIEW.sourceCommit+':'+p)&&sha===git('hash-object',p))&&
   UAT_FIX_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
   sameJson(UAT_FIX_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
   UAT_FIX_PREVIEW.onlyIsolatedHosting===true&&
   UAT_FIX_PREVIEW.sharedRulesDeployAuthorized===false&&
   UAT_FIX_PREVIEW.otherFunctionsDeployAuthorized===false&&
   UAT_FIX_PREVIEW.businessWritesAuthorized===false&&
   UAT_FIX_PREVIEW.syntheticQaWritesAuthorized===false&&
   UAT_FIX_PREVIEW.realUserImpersonationAuthorized===false&&
   UAT_FIX_PREVIEW.livePromotionAuthorized===false&&
   UAT_FIX_PREVIEW.reimportAuthorized===false&&
   UAT_FIX_PREVIEW.authenticatedUatRequired===true&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   B4.boundaries?.previewMutationAuthorized===true&&
   B4.boundaries?.functionDeploymentAuthorized===true&&
   B4.boundaries?.businessWritesAuthorized===false&&
   B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false,
   'B4_003_UAT_CAUSAL_EXACT_PREVIEW_AUTH_INVALID');
 console.log('B4_003_UAT_CAUSAL_EXACT_PREVIEW_AUTH=PASS_READONLY_LIVE_HOLD');
}
// Oct 23 successor: never replace UAT evidence with current bytes. Bind the
// two exact product paths, the QA test and the preexisting source ancestry.
// Explicit publication authority does not waive the Firestore security HOLD.
const PORTAL_COUNTRY=C.b4003WhatsappPortalCountrySuccessor20261023||{};
if(PORTAL_COUNTRY.status==='SOURCE_STAGED_SYNTHETIC_QA_PASS_SECURITY_HOLD'){
 const BOUND=B4.b4003WhatsappPortalCountrySuccessor20261023||{};
 const STAGED=COMP.b4003WhatsappPortalCountrySuccessor20261023||{};
 const R=readJson(PORTAL_COUNTRY.receiptPath);
 const product=[
  'orbit360-platform/modules/notificaciones.js',
  'orbit360-platform/modules/portal.js'
 ];
 const qa='tools/gravicentra-b4-003-whatsapp-portal-country-policy.test.cjs';
 const compBlob=realGit('hash-object',I6_CANONICAL_COMPOSITION);
 const b4Blob=realGit('hash-object',ACTIVE_I65_FORENSIC_B4);
 const portalSealedComp=WRITER_COUNTRY_ACTIVE?
  realGit('rev-parse',WRITER_COUNTRY.parentHead+':'+I6_CANONICAL_COMPOSITION):compBlob;
 const portalSealedB4=WRITER_COUNTRY_ACTIVE?
  realGit('rev-parse',WRITER_COUNTRY.parentHead+':'+ACTIVE_I65_FORENSIC_B4):b4Blob;
 need(PORTAL_COUNTRY.gate==='I6.5/B4-003'&&
   PORTAL_COUNTRY.authority==='PAULA_EXPLICIT_PUBLISH_DEPLOY_WITHIN_CURRENT_GATE_20261023'&&
   PORTAL_COUNTRY.parentHead==='20181b1d01c1adfd077f6e635cff1d47179451f0'&&
   PORTAL_COUNTRY.sourceCommit==='0983f0cfde6eeb516ebc0133e1c43633af68f474'&&
   realGit('rev-parse',PORTAL_COUNTRY.sourceCommit+'^')===PORTAL_COUNTRY.parentHead&&
   realGit('rev-parse',PORTAL_COUNTRY.parentHead+':'+I6_CANONICAL_COMPOSITION)===PORTAL_COUNTRY.previousCompositionBlobSha&&
   PORTAL_COUNTRY.receiptBlobSha===realGit('hash-object',PORTAL_COUNTRY.receiptPath)&&
   R.schema==='GI_I65_B4003_WHATSAPP_PORTAL_COUNTRY_SOURCE_SUCCESSOR_V1'&&
   R.status===PORTAL_COUNTRY.status&&R.gate===PORTAL_COUNTRY.gate&&
   R.authority===PORTAL_COUNTRY.authority&&
   R.parentHead===PORTAL_COUNTRY.parentHead&&
   R.sourceCommit===PORTAL_COUNTRY.sourceCommit&&
   R.previousCompositionBlobSha===PORTAL_COUNTRY.previousCompositionBlobSha&&
   sameJson(Object.keys(R.sourceFiles||{}).sort(),product.slice().sort())&&
   sameJson(Object.keys(R.qaFiles||{}),[qa])&&
   product.every(p=>{
     const pair=R.sourceFiles[p];
     return pair.before===realGit('rev-parse',PORTAL_COUNTRY.parentHead+':'+p)&&
       pair.after===realGit('rev-parse',PORTAL_COUNTRY.sourceCommit+':'+p)&&
       pair.after===realGit('hash-object',p)&&pair.after!==pair.before&&
       pair.after===HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[p]&&COMP.productFiles.includes(p)&&
       pair.after===STAGED.sourceBlobsAfter?.[p];
   })&&
   R.qaFiles[qa]===realGit('rev-parse',PORTAL_COUNTRY.sourceCommit+':'+qa)&&
   R.qaFiles[qa]===realGit('hash-object',qa)&&R.qaFiles[qa]===STAGED.qaBlobSha&&
   R.verification?.syntheticNoNetworkTestsPassed===true&&
   R.verification?.authenticatedRoleCountryUatAccepted===false&&
   R.verification?.effectiveFirestoreRulesVerifiedSecure===false&&
   R.boundaries?.operationalBusinessWrites===0&&
   R.boundaries?.firebaseRulesChanged===false&&
   R.boundaries?.firestoreRulesDeployAuthorized===false&&
   R.boundaries?.sharedDataModified===false&&
   R.boundaries?.livePromotionAuthorized===false&&
   R.boundaries?.productionAccepted===false&&
   R.boundaries?.gateAdvanceAuthorized===false&&
   BOUND.gate===PORTAL_COUNTRY.gate&&BOUND.status===PORTAL_COUNTRY.status&&
   BOUND.authority===PORTAL_COUNTRY.authority&&
   BOUND.parentHead===PORTAL_COUNTRY.parentHead&&
   BOUND.sourceCommit===PORTAL_COUNTRY.sourceCommit&&
   BOUND.receiptPath===PORTAL_COUNTRY.receiptPath&&
   BOUND.receiptBlobSha===PORTAL_COUNTRY.receiptBlobSha&&
   BOUND.compositionBlobSha===portalSealedComp&&
   BOUND.authenticatedUatAccepted===false&&
   BOUND.sharedRulesDeployAuthorized===false&&
   BOUND.productionPromotionAuthorized===false&&
   STAGED.status===PORTAL_COUNTRY.status&&STAGED.gate===PORTAL_COUNTRY.gate&&
   STAGED.parentHead===PORTAL_COUNTRY.parentHead&&
   STAGED.sourceCommit===PORTAL_COUNTRY.sourceCommit&&
   STAGED.receiptPath===PORTAL_COUNTRY.receiptPath&&
   STAGED.receiptBlobSha===PORTAL_COUNTRY.receiptBlobSha&&
   STAGED.previousCompositionBlobSha===PORTAL_COUNTRY.previousCompositionBlobSha&&
   STAGED.authenticatedUatAccepted===false&&
   STAGED.noSharedRulesDeploy===true&&STAGED.noLivePromotion===true&&
   PORTAL_COUNTRY.compositionBlobSha===portalSealedComp&&
   PORTAL_COUNTRY.executionLockBlobSha===portalSealedB4&&
   B4.compositionLockBlobSha===compBlob&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===compBlob&&
   C.currentB4?.compositionLockBlobSha===compBlob&&
   C.currentB4?.executionLockBlobSha===b4Blob&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===b4Blob&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   C.b4003SecurityReleaseHold?.livePromotionAuthorized===false&&
   FIND.findings.length===295,
   'B4_003_WHATSAPP_PORTAL_COUNTRY_SOURCE_OR_AUTH_INVALID');
 console.log('B4_003_WHATSAPP_PORTAL_COUNTRY_SUCCESSOR=EXACT_SOURCE_QA_BOUND_SECURITY_HOLD');
}
const MOCK_ALIGNMENT=C.b4003InicioSyntheticHarnessAlignment20261022||{};
if(MOCK_ALIGNMENT.status==='SOURCE_QA_FIX_LOCAL_PASS_CI_RERUN_PENDING'){
 need(MOCK_ALIGNMENT.gate==='I6.5/B4-003'&&
   MOCK_ALIGNMENT.failedGuardRunId===39881999468&&
   MOCK_ALIGNMENT.qaPath==='tools/gravicentra-b4-003-inicio-personal-recaudo.test.cjs'&&
   MOCK_ALIGNMENT.qaBlobSha===git('hash-object',MOCK_ALIGNMENT.qaPath)&&
   B4.boundaries?.allowedQaFiles?.includes(MOCK_ALIGNMENT.qaPath)&&
   MOCK_ALIGNMENT.productSourceChanged===false&&MOCK_ALIGNMENT.unitTestLocalPass===true&&
   MOCK_ALIGNMENT.securityHoldPreserved===true&&MOCK_ALIGNMENT.operationalWrites===0&&
   MOCK_ALIGNMENT.livePromotion===false&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE',
   'B4_003_INICIO_MOCK_ALIGNMENT_SOURCE_DRIFT');
 execFileSync(process.execPath,[MOCK_ALIGNMENT.qaPath],{stdio:'inherit'});
 console.log('B4_003_INICIO_MOCK_ALIGNMENT=PASS_CI_RERUN_REQUIRED');
}
// B4-003 2026-10-22: an exact, scoped SOURCE successor to the technical
// Preview; the historical run 39634567135 must retain its original hashes.
const POST_AUTH=C.b4003PostAuthReadOnlyDiagnostic20261022||{};
const POST_AUTH_ACTIVE=POST_AUTH.status==='SOURCE_FIXED_SYNTHETIC_QA_PASS_EXACT_PREVIEW_PENDING';
const postAuthOriginalComposition=POST_AUTH_ACTIVE?POST_AUTH.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION);
const postAuthOriginalExecution=POST_AUTH_ACTIVE?
 git('rev-parse',POST_AUTH.parentHead+':'+ACTIVE_I65_FORENSIC_B4):git('hash-object',ACTIVE_I65_FORENSIC_B4);
if(POST_AUTH_ACTIVE){
 const receipt=exists(POST_AUTH.receiptPath)?readJson(POST_AUTH.receiptPath):{};
 const scoped=B4.b4003PostAuthReadOnlyDiagnostic20261022||{};
 const composition=COMP.b4003PostAuthReadOnlyDiagnostic20261022||{};
 const expected=[
   'orbit360-platform/core/auth-product-runtime-p0.js',
   'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
   'orbit360-platform/core/product-app-p0.js'
 ];
 need(POST_AUTH.gate==='I6.5/B4-003'&&POST_AUTH.parentHead==='9be9de0512e42016ba4d1200880523c89a59fd9e'&&
   POST_AUTH.previousCompositionBlobSha==='06161d34a25954d92e11efd98c4226488a0bb704'&&
   postAuthOriginalExecution==='b30dc6bfd17cdedd32f023839ab9c5ab41e17a6a'&&
   POST_AUTH.receiptBlobSha===git('hash-object',POST_AUTH.receiptPath)&&
   receipt.status===POST_AUTH.status&&receipt.approval===scoped.approval&&
   scoped.status===POST_AUTH.status&&composition.status===POST_AUTH.status&&
   POST_AUTH.compositionBlobSha===preUatFixComposition&&
   scoped.compositionBlobSha===POST_AUTH.compositionBlobSha&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   POST_AUTH.executionLockBlobSha===preUatFixExecution&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   expected.length===Object.keys(receipt.sourceFiles||{}).length&&
   sameJson(receipt.sourceFiles, Object.fromEntries(expected.map(p=>[p,{
     before:composition.sourceBlobsBefore?.[p],after:composition.sourceBlobsAfter?.[p]
   }])))&&
   expected.every(p=>
     receipt.sourceFiles[p].before===git('rev-parse',POST_AUTH.parentHead+':'+p)&&
     receipt.sourceFiles[p].after===protectedStoreHistoricCompositionBlob(p)&&
     receipt.sourceFiles[p].after===protectedStorePreviousHash(p)&&
     COMP.productFiles.includes(p)&&B4.boundaries?.allowedProductFiles?.includes(p))&&
   receipt.qa.path===POST_AUTH.qaPath&&receipt.qa.blobSha===POST_AUTH.qaBlobSha&&
   POST_AUTH.qaBlobSha===git('hash-object',POST_AUTH.qaPath)&&
   scoped.qaBlobSha===POST_AUTH.qaBlobSha&&composition.qaBlobSha===POST_AUTH.qaBlobSha&&
   B4.boundaries?.allowedQaFiles?.includes(POST_AUTH.qaPath)&&
   receipt.qa.result==='PASS'&&receipt.qa.noNetwork===true&&
   receipt.boundaries.productionAuthBehaviorUnchanged===true&&
   receipt.boundaries.livePromotionAuthorized===false&&
   receipt.boundaries.sharedFirestoreRulesDeploymentAuthorized===false&&
   receipt.boundaries.realOperationalWritesAuthorized===false&&
   receipt.planImpact.findingIdsPreserved===295&&FIND.findings.length===295&&
   POST_AUTH.authenticatedUatAccepted===false&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   C.i6Execution?.productMutationAuthorized===false&&
   B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false,
   'B4_003_POST_AUTH_SCOPED_SOURCE_AND_IMMUTABLE_HISTORY_INVALID');
 console.log('B4_003_POST_AUTH_DIAGNOSTIC_SOURCE=PASS_SYNTHETIC_UAT_HOLD');
}
const POST_AUTH_PREVIEW=C.b4003PostAuthPreviewAuthorization20261022||{};
if(POST_AUTH_PREVIEW.status==='AUTHORIZED_ISOLATED_READONLY_PREVIEW'){
 const lock=B4.b4003PostAuthPreviewAuthorization20261022||{};
 need(POST_AUTH_ACTIVE&&sameJson(POST_AUTH_PREVIEW,lock)&&
   POST_AUTH_PREVIEW.gate==='I6.5/B4-003'&&
   POST_AUTH_PREVIEW.approval==='PAULA_EXPLICIT_SCOPED_B4_003_POST_AUTH_REPAIR_20261022'&&
   POST_AUTH_PREVIEW.triggerSubject==='build(i6.5 B4-003): post-auth read-only diagnostic Preview'&&
   POST_AUTH_PREVIEW.sourceReceiptBlobSha===POST_AUTH.receiptBlobSha&&
   POST_AUTH_PREVIEW.compositionBlobSha===preUatFixComposition&&
   POST_AUTH_PREVIEW.qaPath===POST_AUTH.qaPath&&
   POST_AUTH_PREVIEW.qaBlobSha===git('hash-object',POST_AUTH_PREVIEW.qaPath)&&
   POST_AUTH_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
   sameJson(POST_AUTH_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
   POST_AUTH_PREVIEW.onlyIsolatedHosting===true&&
   POST_AUTH_PREVIEW.sharedRulesDeployAuthorized===false&&
   POST_AUTH_PREVIEW.otherFunctionsDeployAuthorized===false&&
   POST_AUTH_PREVIEW.businessWritesAuthorized===false&&
   POST_AUTH_PREVIEW.syntheticQaWritesAuthorized===false&&
   POST_AUTH_PREVIEW.realUserImpersonationAuthorized===false&&
   POST_AUTH_PREVIEW.livePromotionAuthorized===false&&
   POST_AUTH_PREVIEW.reimportAuthorized===false&&
   POST_AUTH_PREVIEW.authenticatedUatRequired===true&&
   B4.boundaries?.previewMutationAuthorized===true&&B4.boundaries?.functionDeploymentAuthorized===true&&
   B4.boundaries?.syntheticQaWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false&&
   C.currentB4?.status==='B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL',
   'B4_003_POST_AUTH_EXACT_PREVIEW_AUTH_INVALID');
 console.log('B4_003_POST_AUTH_PREVIEW_AUTH=PASS_READONLY_LIVE_HOLD');
}
// Source-only successor: verify the new security-context index and preserve the old
// aging Preview proof at its ORIGINAL immutable source/composition identity.
// Exact source-backed I6.5 B4-003 financial amount read-model correction.
// Historical Preview/QA evidence stays bound to the old source SHA.
const FPRE=C.b4003CanonicalCarteraTechnicalPreview20261021||{};
if(FPRE.status==='EXACT_TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'){
 const doc=exists(FPRE.receiptPath)?readJson(FPRE.receiptPath):{};
 const lock=B4.b4003CanonicalCarteraTechnicalPreview20261021||{};
 need(sameJson(FPRE,lock)&&FPRE.receiptBlobSha===git('hash-object',FPRE.receiptPath)&&
 doc.schema==='GRAVICENTRA_B4003_CARTERA_TECHNICAL_PREVIEW_20261021_V1'&&
 doc.sourceSha==='8a9fe4ca6a3c68a389a8ecfb2c5c6a2ea7bd90f1'&&
 doc.runId===39634567135&&doc.buildId==='gi-i65-b4-8a9fe4ca6a3c-57f234755dc1'&&
 doc.url==='https://ays-orbit-360-lab--gi-i65-b4-39634567135-zqik09mk.web.app'&&
 doc.artifactId===12360847575&&
 doc.archiveDigest===FPRE.artifactArchiveDigest&&
 doc.hostedPayloadDigest===FPRE.hostedPayloadDigest&&
 doc.backendSourceDigest===FPRE.backendSourceDigest&&
 doc.bundleDigest===FPRE.bundleDigest&&
 doc.compositionBlobSha===postAuthOriginalComposition&&
 doc.productBlobSha===preUatFixBlob('orbit360-platform/core/queries.js')&&
 doc.qaBlobSha===preUatFixBlob('tools/gravicentra-b4-003-portfolio-verified-receipt-amount.test.cjs')&&
 sameJson(doc.previewOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
 doc.technicalWorkflowConclusion==='success'&&doc.hostingReadbackExact===true&&doc.publicSmoke===true&&
 doc.anonymousStatus===401&&doc.authenticatedUat==='HOLD'&&doc.differentUidsSecurityProof==='SKIPPED'&&
 doc.firestoreEmulator==='SKIPPED'&&doc.dataWrites===0&&doc.firestoreRulesDeployed===false&&
 doc.liveDeployment===false&&doc.reimport===false&&doc.securityP0Closed===false&&doc.humanAccepted===false&&
 doc.findingsPreserved===295&&
 C.currentB4?.latestExactScopedTechnicalPreview20261021?.receiptBlobSha===FPRE.receiptBlobSha&&
 C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.b4003PolizasContextCacheFix20261020?.executionLockBlobSha===postAuthOriginalExecution&&
 C.b4003CanonicalPortfolioAmountFix20261021?.executionLockBlobSha===postAuthOriginalExecution&&
 C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
 B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
 FIND.findings.length===295,'B4_003_CARTERA_EXACT_PREVIEW_PROOF_INVALID');
 console.log('B4_003_CARTERA_EXACT_PREVIEW=TECH_PASS_AUTH_UAT_HOLD');
}
const MISSING_MONEY=C.b4003CanonicalPortfolioAmountFix20261021||{};
const MISSING_MONEY_ACTIVE=MISSING_MONEY.status==='SOURCE_ONLY_QA_PENDING_GUARD';
if(MISSING_MONEY_ACTIVE){
 const locked=B4.b4003CanonicalPortfolioAmountFix20261021||{};
 const manifest=COMP.b4003CanonicalPortfolioAmountFix20261021||{};
 const receiptPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CO_CARTERA_SOURCE_FIX_20261021.json';
 const receipt=exists(receiptPath)?readJson(receiptPath):{};
 need(
  MISSING_MONEY.sourcePath==='orbit360-platform/core/queries.js'&&
  MISSING_MONEY.sourceBlobBefore==='0f3f540a71e98ccdca8c040f937d18a169e52396'&&
  MISSING_MONEY.sourceBlobAfter===preUatFixBlob(MISSING_MONEY.sourcePath)&&
  MISSING_MONEY.qaPath==='tools/gravicentra-b4-003-portfolio-verified-receipt-amount.test.cjs'&&
  MISSING_MONEY.qaBlobSha===preUatFixBlob(MISSING_MONEY.qaPath)&&
  MISSING_MONEY.receiptPath===receiptPath&&
  MISSING_MONEY.receiptBlobSha===git('hash-object',receiptPath)&&
  receipt.schema==='GRAVICENTRA_I6_5_B4_003_CO_CARTERA_VERIFIED_READMODEL_FIX_V1'&&
  receipt.oldSourceBlob===MISSING_MONEY.sourceBlobBefore&&
  receipt.newSourceBlob===MISSING_MONEY.sourceBlobAfter&&
  receipt.qaBlobSha===MISSING_MONEY.qaBlobSha&&
  receipt.realBusinessWrites===0&&receipt.uatFunctionalAcceptance===false&&
  receipt.realSourceEvidence.runId===39627038822&&
  receipt.realSourceEvidence.id===12357866713&&
  receipt.realSourceEvidence.archiveDigest==='sha256:7dfe1a74d2542e671fb735f7858daca816d58d0a781aac3f5959a429e08d7c24'&&
  MISSING_MONEY.parentHead==='4734917b25fdf45e1dac3fe6481071fee5603ab6'&&
  MISSING_MONEY.previousCompositionBlobSha==='dbe96631d74bfd009d7bd86e40495e40ebe1ee3e'&&
  MISSING_MONEY.previousExecutionLockBlobSha==='bc8bd56c6ffe4836bfcfbfac47c664ccfbf1049d'&&
  MISSING_MONEY.compositionBlobSha===postAuthOriginalComposition&&
  MISSING_MONEY.executionLockBlobSha===postAuthOriginalExecution&&
  locked.status==='SOURCE_ONLY_QA_PENDING_GUARD'&&
  locked.sourceBlobAfter===MISSING_MONEY.sourceBlobAfter&&
  locked.qaBlobSha===MISSING_MONEY.qaBlobSha&&
  locked.receiptBlobSha===MISSING_MONEY.receiptBlobSha&&
  locked.compositionBlobSha===MISSING_MONEY.compositionBlobSha&&
  manifest.sourceAfter===MISSING_MONEY.sourceBlobAfter&&
  manifest.qaBlobSha===MISSING_MONEY.qaBlobSha&&
  HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[MISSING_MONEY.sourcePath]===(UAT_FIX_ACTIVE?COMP.b4003AuthenticatedUatCausalFix20261022?.sourceBlobsAfter?.[MISSING_MONEY.sourcePath]:MISSING_MONEY.sourceBlobAfter)&&
  COMP.productFiles.includes(MISSING_MONEY.sourcePath)&&
  B4.boundaries?.allowedProductFiles?.includes(MISSING_MONEY.sourcePath)&&
  B4.boundaries?.allowedQaFiles?.includes(MISSING_MONEY.qaPath)&&
  B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.businessWritesAuthorized===false&&
  B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
  MISSING_MONEY.operationalDataWritesAuthorized===false&&MISSING_MONEY.livePromotionAuthorized===false&&
  FIND.findings.length===295,
  'B4_003_CO_PORTFOLIO_MONEY_SOURCE_OR_GOVERNANCE_DRIFT');
 execFileSync(process.execPath,[MISSING_MONEY.qaPath],{stdio:'inherit'});
 console.log('B4_003_CO_PORTFOLIO_MONEY_SOURCE_QA_PASS_SYNTHETIC_UAT_HOLD');
}
// I6.5 B4-003 documentary synchronization, prior exact-UAT rejection and
// narrowly authorized current cumulative Preview. Historical SHA remain fixed.
const NEW_MONEY_AUTH=C.b4003CanonicalPortfolioAmountPreviewAuth20261021||{};
if(NEW_MONEY_AUTH.status==='AUTHORIZED_EXACT_ISOLATED_READONLY_PREVIEW'){
 const lock=B4.b4003CanonicalPortfolioAmountPreviewAuth20261021||{};
 const ar=exists('artifacts/orbit360-recovery/release-control/I6_5_B4_003_CANONICAL_PORTFOLIO_PREVIEW_AUTH_20261021.json')?readJson('artifacts/orbit360-recovery/release-control/I6_5_B4_003_CANONICAL_PORTFOLIO_PREVIEW_AUTH_20261021.json'):{};
 const dr=exists('artifacts/orbit360-recovery/release-control/I6_5_B4_003_EVERGREEN_AND_UAT_SYNCHRONIZATION_20261021.json')?readJson('artifacts/orbit360-recovery/release-control/I6_5_B4_003_EVERGREEN_AND_UAT_SYNCHRONIZATION_20261021.json'):{};
 const u=C.b4003Uat20261021||{},d=C.b4003DocSync20261021||{};
 need(sameJson(NEW_MONEY_AUTH,lock)&&
   NEW_MONEY_AUTH.gate==='I6.5/B4-003'&&
   NEW_MONEY_AUTH.triggerSubject==='build(i6.5 B4-003): exact canonical cartera amount Preview'&&
   NEW_MONEY_AUTH.sourceFixReceiptBlobSha===MISSING_MONEY.receiptBlobSha&&
   NEW_MONEY_AUTH.productOwner===MISSING_MONEY.sourcePath&&
   NEW_MONEY_AUTH.productOwnerBlobSha===preUatFixBlob(NEW_MONEY_AUTH.productOwner)&&
   NEW_MONEY_AUTH.qaPath===MISSING_MONEY.qaPath&&
   NEW_MONEY_AUTH.qaBlobSha===preUatFixBlob(NEW_MONEY_AUTH.qaPath)&&
   NEW_MONEY_AUTH.compositionBlobSha===postAuthOriginalComposition&&
   NEW_MONEY_AUTH.preAuthB4Sha==='f8a5b3b82f641bbc2df2a2b3e49402b5b32085f2'&&
   NEW_MONEY_AUTH.priorGuardRunId===39629585062&&NEW_MONEY_AUTH.priorGuardConclusion==='success'&&
   NEW_MONEY_AUTH.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
   NEW_MONEY_AUTH.authReceiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CANONICAL_PORTFOLIO_PREVIEW_AUTH_20261021.json'&&
   NEW_MONEY_AUTH.authReceiptBlobSha===git('hash-object','artifacts/orbit360-recovery/release-control/I6_5_B4_003_CANONICAL_PORTFOLIO_PREVIEW_AUTH_20261021.json')&&
   ar.schema==='GRAVICENTRA_I65_B4003_CANONICAL_CARTERA_EXACT_PREVIEW_AUTH_V1'&&
   ar.productOwnerBlobSha===NEW_MONEY_AUTH.productOwnerBlobSha&&
   sameJson(ar.allowedFunctions,NEW_MONEY_AUTH.functions)&&
   sameJson(NEW_MONEY_AUTH.functions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
   NEW_MONEY_AUTH.onlyIsolatedHosting===true&&
   NEW_MONEY_AUTH.sharedRulesDeployAuthorized===false&&NEW_MONEY_AUTH.otherFunctionsDeployAuthorized===false&&
   NEW_MONEY_AUTH.operationalWritesAuthorized===false&&NEW_MONEY_AUTH.configWritesAuthorized===false&&
   NEW_MONEY_AUTH.syntheticQaWritesAuthorized===false&&NEW_MONEY_AUTH.realUserImpersonationAuthorized===false&&
   NEW_MONEY_AUTH.livePromotionAuthorized===false&&NEW_MONEY_AUTH.reimportAuthorized===false&&
   NEW_MONEY_AUTH.authUatRequired===true&&
   u.status==='REJECTED_PRIOR_PREVIEW_NOT_LATEST'&&u.runId===39503173099&&
   u.sourceSha==='ca08bbde10e93be4506ca3e0105d5265e6021e7b'&&
   u.fileBlobSha===git('hash-object',u.filePath)&&
   d.receiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_EVERGREEN_AND_UAT_SYNCHRONIZATION_20261021.json'&&d.receiptBlobSha===git('hash-object',d.receiptPath)&&
   dr.uat.sourceFileBlobSha===u.fileBlobSha&&dr.authority.ledgerCount===295&&
   C.currentB4?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.projectSources?.staticSourceUpdateRequired===true&&
   C.projectSources?.pendingNormativeChange?.status==='NEEDS_INSURER_COUNTRY_MULTICOUNTRY_EXCEPTION_RECONCILIATION'&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
   'B4_003_DOC_SYNC_OR_CARTE RA_AUTH_DRIFT'.replace('CARTE RA','CARTERA'));
 console.log('B4_003_DOC_SYNCHRONIZATION_PENDING_V6_V7_UAT_REJECTED_PREVIOUS_PREVIEW_NEW_AUTH_READONLY_PASS');
}
const PCACHE=C.b4003PolizasContextCacheFix20261020||{};
const PCACHE_SUCCESSOR=C.b4003PolizasContextCacheSuccessor20261025||{};
const PCACHE_ACTIVE=PCACHE.status==='SOURCE_ONLY_COMPOSED_NODE_QA_REGISTERED_RUN_REQUIRED';
if(PCACHE_ACTIVE){
 const L=B4.b4003PolizasContextCacheFix20261020||{},T=COMP.b4003PolizasContextCacheFix20261020||{};
 const LS=B4.b4003PolizasContextCacheSuccessor20261025||{},TS=COMP.b4003PolizasContextCacheSuccessor20261025||{};
 const expected='artifacts/orbit360-recovery/release-control/I6_5_B4_003_POLIZAS_CONTEXT_CACHE_SOURCE_FIX_20261020.json';
 const R=exists(expected)?readJson(expected):{};
 const successorPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_POLIZAS_CONTEXT_CACHE_COMPOSITION_SUCCESSOR_20261025.json';
 const SR=exists(successorPath)?readJson(successorPath):{};
 need(PCACHE.gate==='I6.5/B4-003'&&
  PCACHE.parentHead==='ced800e580d50e5254c3f16b5f06e4de72c0a6f3'&&
  PCACHE.sourcePath==='orbit360-platform/modules/polizas.js'&&
  PCACHE.qaPath==='tools/gravicentra-b4-003-polizas-context-cache.test.cjs'&&
  PCACHE.sourceBlobBefore==='3c3c1bc42bcbf03a88cea985d2101392a1c47c4d'&&
  PCACHE.sourceBlobAfter===R.sourceBlobAfter&&
  PCACHE.qaBlobSha===R.qaBlobSha&&
  PCACHE.receiptPath===expected&&PCACHE.receiptBlobSha===git('hash-object',expected)&&
  R.schema==='GRAVICENTRA_I6_5_B4_003_POLIZAS_CONTEXT_CACHE_SOURCE_FIX_V1'&&
  R.parentHead===PCACHE.parentHead&&R.sourceBlobAfter===PCACHE.sourceBlobAfter&&
  R.sourceBlobBefore===PCACHE.sourceBlobBefore&&R.qaBlobSha===PCACHE.qaBlobSha&&
  PCACHE.previousCompositionBlobSha==='da8ffd0c253db638666059d34193cd3275d6e870'&&
  PCACHE.previousExecutionLockBlobSha==='72e7ed7f07804c295f79ff245dce322cdc33c63a'&&
  PCACHE.compositionBlobSha===(MISSING_MONEY_ACTIVE?MISSING_MONEY.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
  PCACHE.executionLockBlobSha===postAuthOriginalExecution&&
  L.status==='SCOPED_CONTEXT_CACHE_SOURCE_FIXED_QA_RUN_BY_GUARD_NO_PREVIEW_AUTH'&&
  L.sourceBlobAfter===PCACHE.sourceBlobAfter&&L.qaBlobSha===PCACHE.qaBlobSha&&
  L.receiptBlobSha===PCACHE.receiptBlobSha&&
  L.compositionBlobSha===PCACHE.compositionBlobSha&&
  T.sourceAfter===PCACHE.sourceBlobAfter&&T.qaBlobSha===PCACHE.qaBlobSha&&
  HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[PCACHE.sourcePath]===PCACHE.sourceBlobAfter&&
  COMP.productFiles.includes(PCACHE.sourcePath)&&
  B4.boundaries?.allowedProductFiles?.includes(PCACHE.sourcePath)&&
  B4.boundaries?.allowedQaFiles?.includes(PCACHE.qaPath)&&
  B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&
  B4.boundaries?.businessWritesAuthorized===false&&
  B4.boundaries?.dataMutationAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&
  PCACHE.operationalWritesAuthorized===false&&PCACHE.livePromotionAuthorized===false&&
  PCACHE.authenticatedUatAccepted===false&&PCACHE.previewDispatchAuthorized===false&&
  PCACHE_SUCCESSOR.status==='COMPOSITION_SUCCESSOR_BOUND_PENDING_EXACT_PREVIEW'&&
  PCACHE_SUCCESSOR.gate==='I6.5/B4-003'&&PCACHE_SUCCESSOR.authority==='PAULA_EXPLICIT_SUCCESSOR_BINDING_AUTHORIZATION'&&
  PCACHE_SUCCESSOR.sourcePath===PCACHE.sourcePath&&PCACHE_SUCCESSOR.predecessorSourceBlobSha===PCACHE.sourceBlobAfter&&
  PCACHE_SUCCESSOR.sourceBlobSha===git('hash-object',PCACHE_SUCCESSOR.sourcePath)&&
  PCACHE_SUCCESSOR.qaPath===PCACHE.qaPath&&PCACHE_SUCCESSOR.predecessorQaBlobSha===PCACHE.qaBlobSha&&
  PCACHE_SUCCESSOR.qaBlobSha===git('hash-object',PCACHE_SUCCESSOR.qaPath)&&
  PCACHE_SUCCESSOR.predecessorCompositionBlobSha===SR.predecessorCompositionBlobSha&&
  PCACHE_SUCCESSOR.predecessorSourceReceiptCompositionBlobSha===PCACHE.compositionBlobSha&&
  PCACHE_SUCCESSOR.receiptPath===successorPath&&PCACHE_SUCCESSOR.receiptBlobSha===git('hash-object',successorPath)&&
  SR.schema==='GRAVICENTRA_I6_5_B4_003_POLIZAS_CONTEXT_CACHE_COMPOSITION_SUCCESSOR_V1'&&
  SR.sourceCommit===PCACHE_SUCCESSOR.sourceCommit&&SR.sourceBlobSha===PCACHE_SUCCESSOR.sourceBlobSha&&
  SR.sourceBlobsAfter?.[PCACHE_SUCCESSOR.sourcePath]===PCACHE_SUCCESSOR.sourceBlobSha&&
  SR.predecessorSourceBlobSha===PCACHE_SUCCESSOR.predecessorSourceBlobSha&&
  SR.qaBlobSha===PCACHE_SUCCESSOR.qaBlobSha&&SR.qaBlobsAfter?.[PCACHE_SUCCESSOR.qaPath]===PCACHE_SUCCESSOR.qaBlobSha&&
  SR.predecessorQaBlobSha===PCACHE_SUCCESSOR.predecessorQaBlobSha&&
  SR.successorCompositionBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  PCACHE_SUCCESSOR.successorCompositionBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  SR.findingsPreserved===295&&SR.frozenTasksPreserved===86&&
  SR.boundaries?.dataMutation===false&&SR.boundaries?.businessWrites===false&&
  SR.boundaries?.sharedFirestoreRules===false&&SR.boundaries?.livePromotion===false&&
  LS.receiptBlobSha===PCACHE_SUCCESSOR.receiptBlobSha&&LS.sourceBlobSha===PCACHE_SUCCESSOR.sourceBlobSha&&
  LS.successorCompositionBlobSha===PCACHE_SUCCESSOR.successorCompositionBlobSha&&
  TS.sourceBlobSha===PCACHE_SUCCESSOR.sourceBlobSha&&TS.qaBlobSha===PCACHE_SUCCESSOR.qaBlobSha&&
  COMP.productFileBlobs?.[PCACHE_SUCCESSOR.sourcePath]===PCACHE_SUCCESSOR.sourceBlobSha&&
  C.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.currentB4?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  FIND.findings.length===295,
  'B4_003_POLIZAS_CONTEXT_CACHE_SOURCE_LINEAGE_OR_RELEASE_BOUNDARY_INVALID');
 execFileSync(process.execPath,[PCACHE.qaPath],{stdio:'inherit'});
 console.log('B4_003_POLIZAS_CONTEXT_CACHE_QA_PASS_SYNTHETIC_NO_FIRESTORE_NO_PREVIEW');
}
const PCACHE_PREVIEW=C.b4003PolizasContextCachePreviewAuthorization20261020||{};
if(PCACHE_PREVIEW.status==='AUTHORIZED_EXACT_READONLY_PREVIEW'){
 const locked=B4.b4003PolizasContextCachePreviewAuthorization20261020||{};
 const path='artifacts/orbit360-recovery/release-control/I6_5_B4_003_POLIZAS_CONTEXT_CACHE_PREVIEW_AUTH_20261020.json';
 const receipt=exists(path)?readJson(path):{};
 need(sameJson(PCACHE_PREVIEW,locked)&&PCACHE_PREVIEW.gate==='I6.5/B4-003'&&
 PCACHE_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact Polizas context cache Preview'&&
 PCACHE_PREVIEW.sourceFixReceiptBlobSha===PCACHE.receiptBlobSha&&
 PCACHE_PREVIEW.sourcePath===PCACHE.sourcePath&&PCACHE_PREVIEW.qaPath===PCACHE.qaPath&&
 PCACHE_PREVIEW.sourceBlobSha===git('hash-object',PCACHE.sourcePath)&&
 PCACHE_PREVIEW.qaBlobSha===git('hash-object',PCACHE.qaPath)&&
 PCACHE_PREVIEW.compositionBlobSha===(MISSING_MONEY_ACTIVE?MISSING_MONEY.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
 PCACHE_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
 PCACHE_PREVIEW.preAuthExecutionLockBlobSha==='d820357a91536b14577a516e8f592ad5f4f5ff81'&&
 PCACHE_PREVIEW.priorGuardRunId===39536893703&&PCACHE_PREVIEW.priorGuardConclusion==='success'&&
 PCACHE_PREVIEW.authorizationReceiptPath===path&&PCACHE_PREVIEW.authorizationReceiptBlobSha===git('hash-object',path)&&
 receipt.schema==='GRAVICENTRA_I65_B4003_POLIZAS_CONTEXT_CACHE_EXACT_PREVIEW_AUTH_V1'&&
 receipt.authorization?.triggerSubject===PCACHE_PREVIEW.triggerSubject&&
 receipt.authorization?.sourceBlobSha===PCACHE_PREVIEW.sourceBlobSha&&
 receipt.authorization?.qaBlobSha===PCACHE_PREVIEW.qaBlobSha&&
 receipt.guardRunId===PCACHE_PREVIEW.priorGuardRunId&&
 sameJson(PCACHE_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
 PCACHE_PREVIEW.onlyIsolatedHosting===true&&PCACHE_PREVIEW.sharedRulesDeployAuthorized===false&&
 PCACHE_PREVIEW.otherFunctionsDeployAuthorized===false&&PCACHE_PREVIEW.operationalWritesAuthorized===false&&
 PCACHE_PREVIEW.configWritesAuthorized===false&&PCACHE_PREVIEW.syntheticQaWritesAuthorized===false&&
 PCACHE_PREVIEW.realUserImpersonationAuthorized===false&&PCACHE_PREVIEW.livePromotionAuthorized===false&&
 PCACHE_PREVIEW.reimportAuthorized===false&&PCACHE_PREVIEW.authenticatedUatRequired===true&&
 PCACHE_PREVIEW.wholeCapabilityAccepted===false&&
 C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
 C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
 B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
 B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
 FIND.findings.length===295,'B4_003_POLIZAS_CTX_EXACT_PREVIEW_AUTH_INVALID');
 console.log('B4_003_POLIZAS_CTX_EXACT_PREVIEW_AUTH_PASS_READONLY_LIVE_HOLD');
}
const PCACHE_PROOF=C.b4003PolizasContextCachePreviewProof20261020||{};
if(PCACHE_PROOF.status==='EXACT_TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'){
 const lock=B4.b4003PolizasContextCachePreviewProof20261020||{};
 const d=C.b4003PolizasContextCachePreviewDispatch20261020||{};
 const p='artifacts/orbit360-recovery/release-control/I6_5_B4_003_POLIZAS_CONTEXT_CACHE_EXACT_TECHNICAL_PREVIEW_READBACK_20261020.json';
 const R=exists(p)?readJson(p):{};
 need(sameJson(PCACHE_PROOF,lock)&&PCACHE_PROOF.gate==='I6.5/B4-003'&&
  PCACHE_PROOF.receiptPath===p&&PCACHE_PROOF.receiptBlobSha===git('hash-object',p)&&
  R.schema==='GRAVICENTRA_I6_5_B4_003_POLIZAS_CONTEXT_CACHE_EXACT_TECHNICAL_PREVIEW_V1'&&
  R.status===PCACHE_PROOF.status&&R.sourceSha===PCACHE_PROOF.sourceSha&&
  R.sourceBlobSha===git('hash-object','orbit360-platform/modules/polizas.js')&&
  R.qaBlobSha===git('hash-object','tools/gravicentra-b4-003-polizas-context-cache.test.cjs')&&
  R.compositionBlobSha===(MISSING_MONEY_ACTIVE?MISSING_MONEY.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
  R.runId===39537641686&&R.channelId==='gi-i65-b4-'+R.runId&&
  R.buildId==='gi-i65-b4-'+R.sourceSha.slice(0,12)+'-57f234755dc1'&&
  R.previewUrl===PCACHE_PROOF.previewUrl&&
  /^https:\/\/ays-orbit-360-lab--gi-i65-b4-[a-z0-9-]+\.web\.app$/.test(R.previewUrl)&&
  R.artifactId===12317498144&&
  R.artifactArchiveDigest===PCACHE_PROOF.artifactArchiveDigest&&
  /^sha256:[0-9a-f]{64}$/.test(R.artifactArchiveDigest)&&
  R.hostedPayloadDigest===PCACHE_PROOF.hostedPayloadDigest&&
  R.backendSourceDigest===PCACHE_PROOF.backendSourceDigest&&
  R.bundleDigest===PCACHE_PROOF.bundleDigest&&
  R.buildBoundAssetCount===138&&R.hostedFileCount===218&&R.backendFileCount===33&&
  R.guardRunId===39537641730&&R.guardConclusion==='success'&&R.workflowConclusion==='success'&&
  R.buildMaterialized===true&&R.isolatedHostingDeployed===true&&R.exactHostingReadback===true&&
  R.publicSmoke===true&&R.unauthenticatedCallableStatus===401&&
  sameJson(R.previewReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  R.actualRoleCountryReadback==='SKIPPED_NO_REAL_USER_TOKEN_AUTHORIZATION'&&
  R.actualAuthenticatedChromeUat==='HOLD'&&R.authenticatedAcceptance===false&&
  R.securityP0Closed===false&&R.humanFunctionalAccepted===false&&
  R.wholeCapabilityAccepted===false&&
  R.sharedFirestoreRulesDeployed===false&&R.otherFunctionsDeployed===false&&
  R.liveProductionChanged===false&&R.productionPromotion===false&&
  R.operationalWrites===0&&R.syntheticWrites===0&&R.realUserTokensIssued===0&&
  R.reimport===false&&R.findingsTotalPreserved===295&&
  PCACHE_PROOF.sourceBlobSha===R.sourceBlobSha&&PCACHE_PROOF.qaBlobSha===R.qaBlobSha&&
  PCACHE_PROOF.compositionBlobSha===R.compositionBlobSha&&
  PCACHE_PROOF.buildId===R.buildId&&PCACHE_PROOF.runId===R.runId&&
  PCACHE_PROOF.channelId===R.channelId&&PCACHE_PROOF.artifactId===R.artifactId&&
  PCACHE_PROOF.guardRunId===R.guardRunId&&PCACHE_PROOF.exactHostingReadback===true&&
  PCACHE_PROOF.humanFunctionalAccepted===false&&PCACHE_PROOF.authenticatedRoleCountryPass===false&&
  PCACHE_PROOF.securityP0Closed===false&&
  d.status===PCACHE_PROOF.status&&d.sourceSha===R.sourceSha&&
  d.buildId===R.buildId&&d.runId===R.runId&&d.previewUrl===R.previewUrl&&
  d.proofReceiptPath===p&&d.proofReceiptBlobSha===PCACHE_PROOF.receiptBlobSha&&
  d.newBuildProofPending===false&&d.exactReadbackPending===false&&
  d.authenticatedChromeUatPending===true&&
  C.currentB4?.latestExactScopedTechnicalPreview20261020?.receiptBlobSha===PCACHE_PROOF.receiptBlobSha&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003PolizasContextCacheFix20261020?.executionLockBlobSha===postAuthOriginalExecution&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  C.b4003CobrosAgingVariancePreviewProof20261020?.sourceSha===R.formerCobrosAgingPreviewRetained.sourceSha&&
  C.b4003CobrosAgingVariancePreviewProof20261020?.runId===R.formerCobrosAgingPreviewRetained.runId&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_POLIZAS_CONTEXT_CACHE_EXACT_TECHNICAL_PREVIEW_PROOF_INVALID');
 console.log('B4_003_POLIZAS_CONTEXT_CACHE_EXACT_TECHNICAL_PREVIEW=PASS_AUTHENTICATED_UAT_HOLD');
}
const AGING_PROOF=C.b4003CobrosAgingVariancePreviewProof20261020||{};
if(AGING_PROOF.status==='EXACT_TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'){
 const lock=B4.b4003CobrosAgingVariancePreviewProof20261020||{};
 const receipt=exists(AGING_PROOF.receiptPath)?readJson(AGING_PROOF.receiptPath):{};
 need(sameJson(AGING_PROOF,lock)&&
  AGING_PROOF.receiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_COBROS_AGING_VARIANCE_TECHNICAL_PREVIEW_READBACK_20261020.json'&&
  AGING_PROOF.receiptBlobSha===git('hash-object',AGING_PROOF.receiptPath)&&
  receipt.schema==='GRAVICENTRA_I6_5_B4_003_COBROS_AGING_VARIANCE_TECHNICAL_PREVIEW_V1'&&
  receipt.runId===39503173099&&receipt.sourceSha==='ca08bbde10e93be4506ca3e0105d5265e6021e7b'&&
  receipt.channelId==='gi-i65-b4-39503173099'&&
  receipt.buildId===AGING_PROOF.buildId&&receipt.previewUrl===AGING_PROOF.previewUrl&&
  receipt.artifactId===AGING_PROOF.artifactId&&receipt.artifactArchiveDigest===AGING_PROOF.artifactArchiveDigest&&
  receipt.cobrosSourceBlobSha===git('hash-object','orbit360-platform/modules/cobros.js')&&
  receipt.qaBlobSha===git('hash-object','tools/gravicentra-b4-003-cobros-aging-variance.test.cjs')&&
  receipt.githubActionsConclusion==='success'&&receipt.exactHostingReadback===true&&
  receipt.publicSmoke===true&&receipt.authenticatedChromeFunctionalProof===false&&
  receipt.realRoleCountryBackendAuthorizationProved===false&&
  receipt.realDataWritesExecuted===0&&receipt.sharedRulesDeployed===false&&
  receipt.productionPromotionAuthorized===false&&receipt.productionAccepted===false&&
  receipt.humanUatAccepted===false&&
  sameJson(receipt.previewReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_COBROS_AGING_VARIANCE_PREVIEW_PROOF_INVALID');
 console.log('GI_B4_003_AGING_VARIANCE_EXACT_PREVIEW=PASS_AUTHENTICATED_UAT_HOLD');
}
const AGING_PREVIEW=C.b4003CobrosAgingVariancePreviewAuthorization20261020||{};
const AGING_PREVIEW_ACTIVE=AGING_PREVIEW.status==='AUTHORIZED_EXACT_READONLY_PREVIEW';
if(AGING_PREVIEW_ACTIVE){
 const locked=B4.b4003CobrosAgingVariancePreviewAuthorization20261020||{};
 const receipt=exists(AGING_PREVIEW.authorizationReceiptPath)?readJson(AGING_PREVIEW.authorizationReceiptPath):{};
 need(sameJson(AGING_PREVIEW,locked)&&AGING_PREVIEW.gate==='I6.5/B4-003'&&
  AGING_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact Cobros aging variance Preview'&&
  AGING_PREVIEW.sourceParentHead==='8b8942b1412e38bcd8c053d7797f2f2d6d9ab013'&&
  AGING_PREVIEW.sourcePath==='orbit360-platform/modules/cobros.js'&&
  AGING_PREVIEW.qaPath==='tools/gravicentra-b4-003-cobros-aging-variance.test.cjs'&&
  AGING_PREVIEW.sourceFixReceiptBlobSha===C.b4003CobrosAgingVarianceFix20261020?.receiptBlobSha&&
  AGING_PREVIEW.sourceBlobSha===git('hash-object',AGING_PREVIEW.sourcePath)&&
  AGING_PREVIEW.qaBlobSha===git('hash-object',AGING_PREVIEW.qaPath)&&
  AGING_PREVIEW.compositionBlobSha===(PCACHE_ACTIVE?PCACHE.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  AGING_PREVIEW.preAuthExecutionLockBlobSha===C.b4003CobrosAgingVarianceFix20261020?.executionLockBlobSha&&
  AGING_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
  AGING_PREVIEW.authorizationReceiptBlobSha===git('hash-object',AGING_PREVIEW.authorizationReceiptPath)&&
  receipt.schema==='GRAVICENTRA_I6_5_B4_003_COBROS_AGING_VARIANCE_EXACT_PREVIEW_AUTH_V1'&&
  receipt.authorization.sourceBlobSha===AGING_PREVIEW.sourceBlobSha&&
  AGING_PREVIEW.priorGuardRunId===39502197076&&AGING_PREVIEW.priorGuardConclusion==='success'&&
  sameJson(AGING_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  AGING_PREVIEW.onlyIsolatedHosting===true&&AGING_PREVIEW.sharedRulesDeployAuthorized===false&&
  AGING_PREVIEW.otherFunctionsDeployAuthorized===false&&AGING_PREVIEW.operationalWritesAuthorized===false&&
  AGING_PREVIEW.configWritesAuthorized===false&&AGING_PREVIEW.syntheticQaWritesAuthorized===false&&
  AGING_PREVIEW.livePromotionAuthorized===false&&AGING_PREVIEW.realUserImpersonationAuthorized===false&&
  AGING_PREVIEW.reimportAuthorized===false&&AGING_PREVIEW.authenticatedUatRequired===true&&
  AGING_PREVIEW.wholeCapabilityAccepted===false&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.businessWritesAuthorized===false&&
  B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
  FIND.findings.length===295,
  'B4_003_AGING_VARIANCE_PREVIEW_AUTHORIZATION_DRIFT');
 console.log('B4_003_AGING_VARIANCE_PREVIEW_AUTH_PASS_READONLY_LIVE_HOLD');
}
const AGING=C.b4003CobrosAgingVarianceFix20261020||{};
const AGING_ACTIVE=AGING.status==='SCOPED_COBROS_AGING_VARIANCE_SOURCE_FIXED_QA_PENDING_PREVIEW';
if(AGING_ACTIVE){
 const locked=B4.b4003CobrosAgingVarianceFix20261020||{},manifest=COMP.b4003CobrosAgingVarianceFix20261020||{};
 const receipt=exists(AGING.receiptPath)?readJson(AGING.receiptPath):{};
 need(AGING.gate==='I6.5/B4-003'&&AGING.approval==='USER_UAT6_HANDOFF_IN_EXISTING_B4_003'&&
   AGING.parentHead==='80408604052a14d3a19294e4e2bb88e16fcba89b'&&
   AGING.sourcePath==='orbit360-platform/modules/cobros.js'&&
   AGING.qaPath==='tools/gravicentra-b4-003-cobros-aging-variance.test.cjs'&&
   AGING.sourceBlobBefore==='6b3892ab83ef7974fbae20e0b1ee15b32d62f08f'&&
   AGING.previousCompositionBlobSha==='45352e79f74d9f5ed35b1b2e1b22ef52ac800039'&&
   AGING.previousExecutionLockBlobSha==='c821fd7628b7e1fadad243c42f7bfd9b9d3c97df'&&
   AGING.receiptBlobSha===git('hash-object',AGING.receiptPath)&&
   receipt.schema==='GRAVICENTRA_I6_5_B4_003_COBROS_AGING_VARIANCE_CAUSAL_SOURCE_V1'&&
   receipt.parentHead===AGING.parentHead&&receipt.sourceBefore===AGING.sourceBlobBefore&&
   receipt.sourceAfter===AGING.sourceBlobAfter&&receipt.qaBlobSha===AGING.qaBlobSha&&
   receipt.dataWrites===0&&receipt.moduleFunctionalPass===false&&receipt.technicalPreviewRequired===true&&
   AGING.sourceBlobAfter===git('hash-object',AGING.sourcePath)&&
   AGING.qaBlobSha===git('hash-object',AGING.qaPath)&&
   HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[AGING.sourcePath]===AGING.sourceBlobAfter&&
   COMP.productFiles.includes(AGING.sourcePath)&&
   B4.boundaries?.allowedProductFiles?.includes(AGING.sourcePath)&&
   B4.boundaries?.allowedQaFiles?.includes(AGING.qaPath)&&
   manifest.sourceBlobAfter===AGING.sourceBlobAfter&&locked.sourceBlobAfter===AGING.sourceBlobAfter&&
   AGING.compositionBlobSha===(PCACHE_ACTIVE?PCACHE.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
   AGING.executionLockBlobSha===(AGING_PREVIEW_ACTIVE?AGING_PREVIEW.preAuthExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4))&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   C.i6Execution?.productMutationAuthorized===false&&B4.boundaries?.productMutationAuthorized===false&&
   B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false&&AGING.operationalWritesAuthorized===false&&
   AGING.sharedRulesDeployAuthorized===false&&AGING.livePromotionAuthorized===false&&
   FIND.findings.length===295,
   'B4_003_COBROS_AGING_VARIANCE_SCOPE_OR_SOURCE_LINEAGE_DRIFT');
 execFileSync(process.execPath,[AGING.qaPath],{stdio:'inherit'});
 console.log('GI_B4_003_COBROS_AGING_VARIANCE_CAUSAL_SOURCE_QA_PASS_AUTH_UAT_HOLD');
}

const COUNTRY_PREVIEW=C.b4003CountryFinancePreviewAuthorization20261020||{};
const COUNTRY_PREVIEW_ACTIVE=COUNTRY_PREVIEW.status==='AUTHORIZED_EXACT_READONLY_PREVIEW';
if(COUNTRY_PREVIEW_ACTIVE){
 const locked=B4.b4003CountryFinancePreviewAuthorization20261020||{};
 const receipt=exists(COUNTRY_PREVIEW.authorizationReceiptPath)?readJson(COUNTRY_PREVIEW.authorizationReceiptPath):{};
 const paths=Object.keys(COUNTRY_PREVIEW.sourceBlobs||{}).sort();
 need(sameJson(COUNTRY_PREVIEW,locked)&&COUNTRY_PREVIEW.gate==='I6.5/B4-003'&&
   COUNTRY_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact country finance parity Preview'&&
   COUNTRY_PREVIEW.sourceParentHead==='6d956fe21fc2064333034a79fa68156c147c3f77'&&
   COUNTRY_PREVIEW.centralGuardRunId===39489212214&&COUNTRY_PREVIEW.centralGuardConclusion==='success'&&
   COUNTRY_PREVIEW.sourceFixReceiptBlobSha===C.b4003CountryFinanceParityFix20261020?.receiptBlobSha&&
   COUNTRY_PREVIEW.compositionBlobSha===(AGING_ACTIVE?AGING.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   COUNTRY_PREVIEW.preAuthExecutionLockBlobSha===C.b4003CountryFinanceParityFix20261020?.executionLockBlobSha&&
   COUNTRY_PREVIEW.authorizationReceiptBlobSha===git('hash-object',COUNTRY_PREVIEW.authorizationReceiptPath)&&
   receipt.schema==='GI_B4_003_COUNTRY_FINANCE_EXACT_PREVIEW_AUTH_20261020_V1'&&
   receipt.authorization?.sourceFixReceiptBlobSha===COUNTRY_PREVIEW.sourceFixReceiptBlobSha&&
   sameJson(paths,['orbit360-platform/core/queries.js','orbit360-platform/modules/cobros.js'])&&
   paths.every(path=>COUNTRY_PREVIEW.sourceBlobs[path]===(MISSING_MONEY_ACTIVE&&path===MISSING_MONEY.sourcePath?MISSING_MONEY.sourceBlobBefore:(AGING_ACTIVE&&path===AGING.sourcePath?AGING.sourceBlobBefore:git('hash-object',path)))&&
     B4.boundaries?.allowedProductFiles?.includes(path))&&
   Object.keys(COUNTRY_PREVIEW.qaBlobs||{}).length===1&&
   Object.entries(COUNTRY_PREVIEW.qaBlobs||{}).every(([path,sha])=>sha===git('hash-object',path)&&
     B4.boundaries?.allowedQaFiles?.includes(path))&&
   COUNTRY_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
   sameJson(COUNTRY_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
   COUNTRY_PREVIEW.isolatedHostingOnly===true&&COUNTRY_PREVIEW.sharedRulesDeployAuthorized===false&&
   COUNTRY_PREVIEW.otherFunctionsDeployAuthorized===false&&COUNTRY_PREVIEW.operationalWritesAuthorized===false&&
   COUNTRY_PREVIEW.configWritesAuthorized===false&&COUNTRY_PREVIEW.syntheticQaWritesAuthorized===false&&
   COUNTRY_PREVIEW.livePromotionAuthorized===false&&COUNTRY_PREVIEW.realUserImpersonationAuthorized===false&&
   COUNTRY_PREVIEW.reimportAuthorized===false&&COUNTRY_PREVIEW.authenticatedUatRequired===true&&
   COUNTRY_PREVIEW.wholeCapabilityAccepted===false&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.businessWritesAuthorized===false&&
   B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
   FIND.findings.length===295,
   'B4_003_COUNTRY_FINANCE_EXACT_PREVIEW_AUTHORIZATION_INVALID');
 console.log('B4_003_COUNTRY_FINANCE_EXACT_PREVIEW_AUTH=PASS_READONLY_SECURITY_HOLD');
}
const COUNTRY_FIX=C.b4003CountryFinanceParityFix20261020||{};
const COUNTRY_ACTIVE=COUNTRY_FIX.status==='COUNTRY_PARENT_FINANCE_SOURCE_FIXED_QA_PENDING_EXACT_PREVIEW';
if(COUNTRY_ACTIVE){
 const receipt=exists(COUNTRY_FIX.receiptPath)?readJson(COUNTRY_FIX.receiptPath):{};
 const stageLock=B4.b4003CountryFinanceParityFix20261020||{},stageComp=COMP.b4003CountryFinanceParityFix20261020||{};
 const source=Object.keys(COUNTRY_FIX.sourceBlobsAfter||{}).sort(),expect=['orbit360-platform/core/queries.js','orbit360-platform/modules/cobros.js'].sort();
 need(COUNTRY_FIX.gate==='I6.5/B4-003'&&COUNTRY_FIX.approval==='USER_CONTINUE_FAST_WITHIN_EXISTING_I6_5_B4_003'&&
   COUNTRY_FIX.previousCompositionBlobSha==='4563979caadd63cb4897304c60df7a087cac024c'&&
   COUNTRY_FIX.previousExecutionLockBlobSha==='063c848deca0138cb5ce230ab12d6599b4a251cb'&&
   COUNTRY_FIX.parentHead==='710f392ec129b689f4797be1350611c43852ab39'&&
   COUNTRY_FIX.receiptBlobSha===git('hash-object',COUNTRY_FIX.receiptPath)&&
   receipt.schema==='GI_B4_003_COUNTRY_FINANCE_PARENT_PARITY_SOURCE_20261020_V1'&&
   receipt.parentHead===COUNTRY_FIX.parentHead&&receipt.operationalWrites===0&&
   source.length===2&&sameJson(source,expect)&&
   sameJson(COUNTRY_FIX.sourceBlobsBefore,receipt.sourceBlobsBefore)&&sameJson(COUNTRY_FIX.sourceBlobsAfter,receipt.sourceBlobsAfter)&&
   sameJson(COUNTRY_FIX.sourceBlobsAfter,stageLock.sourceBlobsAfter)&&sameJson(COUNTRY_FIX.sourceBlobsAfter,stageComp.sourceBlobsAfter)&&
   source.every(path=>COUNTRY_FIX.sourceBlobsAfter[path]===(MISSING_MONEY_ACTIVE&&path===MISSING_MONEY.sourcePath?MISSING_MONEY.sourceBlobBefore:(AGING_ACTIVE&&path===AGING.sourcePath?AGING.sourceBlobBefore:git('hash-object',path)))&&
     HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[path]===git('hash-object',path)&&COMP.productFiles.includes(path)&&B4.boundaries.allowedProductFiles.includes(path))&&
   COUNTRY_FIX.qaBlobSha===git('hash-object',COUNTRY_FIX.qaPath)&&receipt.qaBlobSha===COUNTRY_FIX.qaBlobSha&&B4.boundaries.allowedQaFiles.includes(COUNTRY_FIX.qaPath)&&
   COUNTRY_FIX.compositionBlobSha===(AGING_ACTIVE?AGING.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
   COUNTRY_FIX.executionLockBlobSha===(COUNTRY_PREVIEW_ACTIVE?COUNTRY_PREVIEW.preAuthExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4))&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   C.i6Execution?.productMutationAuthorized===false&&B4.boundaries?.productMutationAuthorized===false&&
   B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false&&COUNTRY_FIX.sharedRulesDeployAuthorized===false&&
   COUNTRY_FIX.operationalWritesAuthorized===false&&COUNTRY_FIX.livePromotionAuthorized===false&&
   receipt.authenticatedFunctionalPass===false&&FIND.findings.length===295,
   'B4_003_COUNTRY_FINANCE_SOURCE_CAUSAL_LINEAGE_DRIFT');
 execFileSync(process.execPath,[COUNTRY_FIX.qaPath],{stdio:'inherit'});
 console.log('B4_003_COUNTRY_FINANCE_PARENT_SCOPE_SYNTHETIC_PASS_UAT_HOLD');
}
const CACHE_PROOF=C.b4003CobrosCachePreviewProof20261020||{};
if(CACHE_PROOF.status==='EXACT_TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'){
 const locked=B4.b4003CobrosCachePreviewProof20261020||{};
 const readback=exists(CACHE_PROOF.receiptPath)?readJson(CACHE_PROOF.receiptPath):{};
 need(sameJson(CACHE_PROOF,locked)&&
  CACHE_PROOF.receiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_COBROS_SCOPE_CACHE_TECHNICAL_PREVIEW_READBACK_20261020.json'&&
  CACHE_PROOF.receiptBlobSha===git('hash-object',CACHE_PROOF.receiptPath)&&
  readback.schema==='GRAVICENTRA_I6_5_B4_003_COBROS_SCOPE_CACHE_PREVIEW_READBACK_20261020_V1'&&
  readback.runId===39438090400&&readback.sourceSha==='7240d02621526921035a2125b41ccc8f2d6ff0b8'&&
  readback.previewChannelId==='gi-i65-b4-39438090400'&&
  readback.buildId===CACHE_PROOF.buildId&&
  readback.previewUrl===CACHE_PROOF.previewUrl&&
  readback.artifactId===CACHE_PROOF.artifactId&&
  readback.artifactArchiveDigest===CACHE_PROOF.artifactArchiveDigest&&
  readback.backendSourceDigest===CACHE_PROOF.backendSourceDigest&&
  readback.sourceProductBlobSha===(COUNTRY_ACTIVE?COUNTRY_FIX.sourceBlobsBefore['orbit360-platform/modules/cobros.js']:git('hash-object','orbit360-platform/modules/cobros.js'))&&
  readback.qaTestBlobSha===git('hash-object','tools/gravicentra-b4-003-cobros-scope-cache.test.cjs')&&
  readback.workflowConclusion==='success'&&readback.hostingReadbackExact===true&&
  readback.publicAndEmulatorSmoke===true&&
  sameJson(readback.deployedPreviewFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  CACHE_PROOF.hostedReadbackExact===true&&CACHE_PROOF.publicAndEmulatorSmoke===true&&
  CACHE_PROOF.authenticatedRoleCountryE2E===false&&CACHE_PROOF.humanFunctionalAccepted===false&&
  readback.authenticatedRoleCountryE2E===false&&readback.humanFunctionalAccepted===false&&
  readback.operationalBusinessWritesExecuted===0&&readback.productionPromotionAuthorized===false&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
  B4.boundaries?.livePromotionAuthorized===false&&FIND.findings.length===295,
  'B4_003_COBROS_CACHE_EXACT_PREVIEW_PROOF_MISMATCH');
 console.log('B4_003_COBROS_CACHE_EXACT_TECHNICAL_PREVIEW=PASS_AUTHENTICATED_UAT_HOLD');
}
const CACHE_PREVIEW=C.b4003CobrosCachePreviewAuthorization20261020||{};
if(CACHE_PREVIEW.status==='AUTHORIZED_EXACT_READONLY_PREVIEW'){
 const locked=B4.b4003CobrosCachePreviewAuthorization20261020||{};
 const authorization=exists(CACHE_PREVIEW.authorizationReceiptPath)?readJson(CACHE_PREVIEW.authorizationReceiptPath):{};
 need(sameJson(CACHE_PREVIEW,locked)&&CACHE_PREVIEW.gate==='I6.5/B4-003'&&
  CACHE_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact Cobros scoped finance Preview'&&
  CACHE_PREVIEW.sourcePath==='orbit360-platform/modules/cobros.js'&&
  CACHE_PREVIEW.sourceBlobSha===(COUNTRY_ACTIVE?COUNTRY_FIX.sourceBlobsBefore[CACHE_PREVIEW.sourcePath]:git('hash-object',CACHE_PREVIEW.sourcePath))&&
  CACHE_PREVIEW.qaBlobSha===git('hash-object',CACHE_PREVIEW.qaPath)&&
  CACHE_PREVIEW.centralGuardRunId===39436838311&&CACHE_PREVIEW.centralGuardConclusion==='success'&&
  CACHE_PREVIEW.sourceFixReceiptBlobSha===C.b4003CobrosScopeCacheFix20261020?.receiptBlobSha&&
  CACHE_PREVIEW.sourceBlobSha===C.b4003CobrosScopeCacheFix20261020?.sourceBlobAfter&&
  CACHE_PREVIEW.compositionBlobSha===(COUNTRY_ACTIVE?COUNTRY_FIX.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
  C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
  CACHE_PREVIEW.authorizationReceiptBlobSha===git('hash-object',CACHE_PREVIEW.authorizationReceiptPath)&&
  authorization.schema==='GI_B4_003_COBROS_SCOPE_CACHE_EXACT_PREVIEW_AUTH_V1'&&
  authorization.authorization?.sourceBlobSha===CACHE_PREVIEW.sourceBlobSha&&
  CACHE_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
  sameJson(CACHE_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
  CACHE_PREVIEW.isolatedHostingOnly===true&&CACHE_PREVIEW.sharedRulesDeployAuthorized===false&&
  CACHE_PREVIEW.otherFunctionsDeployAuthorized===false&&CACHE_PREVIEW.operationalWritesAuthorized===false&&
  CACHE_PREVIEW.configWritesAuthorized===false&&CACHE_PREVIEW.syntheticQaWritesAuthorized===false&&
  CACHE_PREVIEW.livePromotionAuthorized===false&&CACHE_PREVIEW.realUserImpersonationAuthorized===false&&
  CACHE_PREVIEW.reimportAuthorized===false&&CACHE_PREVIEW.authenticatedUatRequired===true&&
  CACHE_PREVIEW.wholeCapabilityAccepted===false&&
  C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
  C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
  B4.boundaries?.productMutationAuthorized===false&&B4.boundaries?.businessWritesAuthorized===false&&
  B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
  FIND.findings.length===295,
  'B4_003_COBROS_CACHE_EXACT_READONLY_PREVIEW_AUTH_DRIFT');
 console.log('B4_003_COBROS_CACHE_EXACT_READONLY_PREVIEW_AUTH_PASS_LIVE_HOLD');
}
const CACHE_FIX=C.b4003CobrosScopeCacheFix20261020||{};
const CACHE_FIX_ACTIVE=CACHE_FIX.status==='SCOPED_COBROS_SCOPE_CACHE_SOURCE_FIXED_QA_PENDING_EXACT_PREVIEW';
if(CACHE_FIX_ACTIVE){
 const locked=B4.b4003CobrosScopeCacheFix20261020||{},manifest=COMP.b4003CobrosScopeCacheFix20261020||{};
 const receipt=exists(CACHE_FIX.receiptPath)?readJson(CACHE_FIX.receiptPath):{};
 const sourceSha=COUNTRY_ACTIVE?COUNTRY_FIX.sourceBlobsBefore[CACHE_FIX.productPath]:git('hash-object',CACHE_FIX.productPath),qaSha=git('hash-object',CACHE_FIX.qaPath);
 need(CACHE_FIX.gate==='I6.5/B4-003'&&CACHE_FIX.approval==='USER_CONTINUE_ACTIVE_GATE_20261020_CAUSAL_SCOPE'&&
   CACHE_FIX.productPath==='orbit360-platform/modules/cobros.js'&&CACHE_FIX.qaPath==='tools/gravicentra-b4-003-cobros-scope-cache.test.cjs'&&
   CACHE_FIX.sourceOnly===true&&CACHE_FIX.globalProductMutationAuthorized===false&&
   CACHE_FIX.previousCompositionBlobSha==='e100a88bc817a80a9fcbcaf2ff9356ab0eb58b3f'&&
   CACHE_FIX.previousExecutionLockBlobSha==='ec57c71a784dc986dbaf480e69c9e3d68ff566d9'&&
   CACHE_FIX.receiptBlobSha===git('hash-object',CACHE_FIX.receiptPath)&&
   receipt.schema==='GI_B4_003_COBROS_SCOPE_CACHE_CAUSAL_REPAIR_V1'&&receipt.parentHead==='dfc1dc6d6024b51fa130e2ec1cf0dd391caa8703'&&
   receipt.before===CACHE_FIX.sourceBlobBefore&&receipt.after===CACHE_FIX.sourceBlobAfter&&
   receipt.testSha===CACHE_FIX.qaBlobSha&&receipt.syntheticNoWrites===true&&receipt.sourceOnly===true&&
   receipt.productionPromotionAuthorized===false&&receipt.sharedRulesDeployAuthorized===false&&
   CACHE_FIX.sourceBlobBefore==='ceb666bc1016c5365e420ad6791f112a947966a4'&&
   sourceSha===CACHE_FIX.sourceBlobAfter&&qaSha===CACHE_FIX.qaBlobSha&&
   manifest.productPath===CACHE_FIX.productPath&&manifest.sourceBlobAfter===sourceSha&&
   locked.sourceBlobAfter===sourceSha&&locked.qaBlobSha===qaSha&&
   CACHE_FIX.compositionBlobSha===(COUNTRY_ACTIVE?COUNTRY_FIX.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
   CACHE_FIX.executionLockBlobSha===(COUNTRY_ACTIVE?COUNTRY_FIX.previousExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4))&&
   HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[CACHE_FIX.productPath]===(AGING_ACTIVE?AGING.sourceBlobAfter:COUNTRY_ACTIVE?COUNTRY_FIX.sourceBlobsAfter[CACHE_FIX.productPath]:sourceSha)&&COMP.productFiles.includes(CACHE_FIX.productPath)&&
   B4.boundaries?.allowedProductFiles?.includes(CACHE_FIX.productPath)&&B4.boundaries?.allowedQaFiles?.includes(CACHE_FIX.qaPath)&&
   C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
   B4.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
   C.i6Execution?.productMutationAuthorized===false&&B4.boundaries?.productMutationAuthorized===false&&
   B4.boundaries?.businessWritesAuthorized===false&&B4.boundaries?.dataMutationAuthorized===false&&
   B4.boundaries?.livePromotionAuthorized===false&&CACHE_FIX.livePromotionAuthorized===false&&
   CACHE_FIX.sharedRulesDeployAuthorized===false&&CACHE_FIX.operationalWritesAuthorized===false&&FIND.findings.length===295,
   'B4_003_COBROS_SCOPE_CACHE_SOURCE_AUTHORITY_OR_SECURITY_DRIFT');
 execFileSync(process.execPath,[CACHE_FIX.qaPath],{stdio:'inherit'});
 console.log('B4_003_COBROS_SCOPE_CACHE_SYNTHETIC_QA_PASS_AUTH_UAT_HOLD');
}
// Historical UAT5 receipt is immutable. A later exact owner repair does not
// erase those proofs or authorize LIVE / Firestore Rules changes.
const INS=C.b4003InsurerKnowledgeSourcePatch20261020||{};
const INS_ACTIVE=INS.status==='SCOPED_INSURER_KNOWLEDGE_SOURCE_QA_PENDING_PREVIEW';
if(INS_ACTIVE){
 const lock=B4.b4003InsurerKnowledgeSourcePatch20261020||{};
 const manifest=COMP.b4003InsurerKnowledgeSourcePatch20261020||{};
 const receipt=exists(INS.receiptPath)?readJson(INS.receiptPath):{};
 const source=Object.keys(INS.sourceFiles||{}).sort(),tests=Object.keys(INS.qaBlobs||{}).sort();
 need(INS.gate==='I6.5/B4-003'&&INS.sourceOnly===true&&INS.productSourceFixAuthorized===true&&
 INS.previousCompositionBlobSha==='93ee0f0e259d82477f82512ff04ad6dd56f6cbd4'&&
 INS.previousExecutionLockBlobSha==='683178c87067b8d743e7f574b1589b717ae2d2f5'&&
 INS.receiptBlobSha===git('hash-object',INS.receiptPath)&&
 receipt.schema==='GI_I65_B4003_INSURER_KNOWLEDGE_EXACT_SOURCE_REMEDIATION_V1'&&
 receipt.parentHead==='ebd8b6e6641737d19ee93b17b8ded5201de066e3'&&
 INS.compositionBlobSha===(CACHE_FIX_ACTIVE?CACHE_FIX.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
 C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
 C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 INS.executionLockBlobSha===(CACHE_FIX_ACTIVE?CACHE_FIX.previousExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4))&&
 sameJson(INS.sourceFiles,lock.sourceFiles)&&sameJson(INS.sourceFiles,manifest.sourceFiles)&&
 source.length===2&&tests.length===1&&
 source.every(path=>receipt.sourceFiles?.[path]?.before===INS.sourceFiles[path].before&&
 receipt.sourceFiles?.[path]?.after===INS.sourceFiles[path].after&&
 HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[path]===INS.sourceFiles[path].after&&
 COMP.productFiles.includes(path)&&B4.boundaries?.allowedProductFiles?.includes(path)&&
 git('hash-object',path)===INS.sourceFiles[path].after)&&
 tests.every(path=>INS.qaBlobs[path]===receipt.qaFiles?.[path]?.after&&
 git('hash-object',path)===INS.qaBlobs[path]&&B4.boundaries?.allowedQaFiles?.includes(path))&&
 C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
 C.i6Execution?.productMutationAuthorized===false&&B4.boundaries?.productMutationAuthorized===false&&
 B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
 B4.boundaries?.businessWritesAuthorized===false&&FIND.findings.length===295,
 'B4_003_INSURER_KNOWLEDGE_SOURCE_LINEAGE_OR_RELEASE_BOUNDARY_INVALID');
 execFileSync(process.execPath,['tools/gravicentra-b4-003-insurer-source-catalog.test.cjs'],{stdio:'inherit'});
 console.log('B4_003_INSURER_KNOWLEDGE_SOURCE_QA_PASS_PREVIEW_AND_LIVE_HOLD');
}
const INS_PREVIEW=C.b4003InsurerKnowledgePreviewAuthorization20261020||{};
if(INS_PREVIEW.status==='AUTHORIZED_EXACT_READONLY_PREVIEW'){
 const lockPreview=B4.b4003InsurerKnowledgePreviewAuthorization20261020||{};
 const receipt=exists(INS.receiptPath)?readJson(INS.receiptPath):{};
 const paths=Object.keys(INS_PREVIEW.sourceBlobs||{}).sort();
 need(INS_ACTIVE&&sameJson(INS_PREVIEW,lockPreview)&&
 INS_PREVIEW.gate==='I6.5/B4-003'&&
 INS_PREVIEW.triggerSubject==='build(i6.5 B4-003): exact insurer knowledge Preview'&&
 INS_PREVIEW.sourceReceiptBlobSha===INS.receiptBlobSha&&
 INS_PREVIEW.compositionBlobSha===(CACHE_FIX_ACTIVE?CACHE_FIX.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
 paths.length===2&&
 paths.every(path=>INS_PREVIEW.sourceBlobs[path]===INS.sourceFiles[path]?.after&&
 git('hash-object',path)===INS_PREVIEW.sourceBlobs[path])&&
 sameJson(INS_PREVIEW.qaBlobs,INS.qaBlobs)&&
 INS_PREVIEW.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
 sameJson(INS_PREVIEW.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
 INS_PREVIEW.sharedRulesDeployAuthorized===false&&INS_PREVIEW.operationalWritesAuthorized===false&&
 INS_PREVIEW.configWritesAuthorized===false&&INS_PREVIEW.livePromotionAuthorized===false&&
 INS_PREVIEW.realUserImpersonationAuthorized===false&&INS_PREVIEW.reimportAuthorized===false&&
 INS_PREVIEW.authenticatedUatRequired===true&&INS_PREVIEW.previewIsolated===true&&
 C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
 B4.boundaries?.dataMutationAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false&&
 FIND.findings.length===295,
 'B4_003_INSURER_EXACT_PREVIEW_AUTHORIZATION_OR_SECURITY_INVALID');
 console.log('B4_003_INSURER_EXACT_PREVIEW_AUTH=PASS_READONLY_LIVE_HOLD');
}
const FIX=C.b4003Uat5CausalSourcePatch20261019||{};
const FIX_ACTIVE=FIX.status==='SCOPED_SOURCE_FIXED_QA_PENDING_EXACT_PREVIEW';
if(FIX_ACTIVE){
 const lf=B4.b4003Uat5CausalSourcePatch20261019||{};
 const cf=COMP.b4003Uat5CausalSourcePatch20261019||{};
 const receipt=exists(FIX.receiptPath)?readJson(FIX.receiptPath):{};
 const productPaths=Object.keys(FIX.sourceBlobs||{}).sort(),qaPaths=Object.keys(FIX.qaBlobs||{}).sort();
 need(FIX.gate==='I6.5/B4-003'&&FIX.sourceOnly===true&&FIX.approval==='USER_DIRECT_EXACT_SCOPED_B4_003'&&
 FIX.previousCompBlobSha==='37fc6586672d9570c2affd4177d0da5dd5762c1b'&&
 FIX.priorSourceSha==='7833d38452f2be4ed6d1dff4ec8ae91f0081665f'&&
 receipt.uat5Source===FIX.priorSourceSha&&
 FIX.receiptBlobSha===git('hash-object',FIX.receiptPath)&&
 FIX.compositionBlobSha===(INS_ACTIVE?INS.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
 FIX.executionLockBlobSha===(INS_ACTIVE?INS.previousExecutionLockBlobSha:git('hash-object',ACTIVE_I65_FORENSIC_B4))&&
 C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
 C.currentB4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 C.i65ForensicRemediationPlan?.b4?.executionLockBlobSha===git('hash-object',ACTIVE_I65_FORENSIC_B4)&&
 sameJson(FIX.sourceBlobs,lf.sourceBlobs)&&sameJson(FIX.sourceBlobs,cf.sourceBlobs)&&
 productPaths.length===8&&qaPaths.length===1&&
 productPaths.every(path=>FIX.beforeBlobs[path]===receipt.sourceFiles?.[path]?.before&&
 FIX.sourceBlobs[path]===receipt.sourceFiles?.[path]?.after&&
 HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[path]===(INS_ACTIVE&&INS.sourceFiles?.[path]?.after||FIX.sourceBlobs[path])&&
 // The UAT5 receipt and predecessor composition pin historical bytes; current product bytes are checked against COMP below.
 COMP.productFiles.includes(path)&&B4.boundaries.allowedProductFiles.includes(path))&&
 qaPaths.every(path=>FIX.qaBeforeBlobs[path]===receipt.qaFiles?.[path]?.before&&
 FIX.qaBlobs[path]===receipt.qaFiles?.[path]?.after&&
 // Receipt and allowlist pin historical QA; current corrective QA bytes are checked by CORRECTIVE_SOURCE above.
 B4.boundaries.allowedQaFiles.includes(path))&&
 C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
 C.i6Execution?.productMutationAuthorized===false&&B4.boundaries.productMutationAuthorized===false&&
 B4.boundaries.dataMutationAuthorized===false&&B4.boundaries.businessWritesAuthorized===false&&
 B4.boundaries.livePromotionAuthorized===false&&FIND.findings.length===295,
 'B4_003_UAT5_SCOPED_SOURCE_BOUNDARY_OR_BLOB_DRIFT');
 console.log('B4_003_UAT5_SCOPED_SOURCE_VERIFIED_QA_PENDING_UAT_NO_LIVE');
}

const PREVIEW_AUTH=C.b4003Uat5CausalPreviewAuthorization20261019;
if(PREVIEW_AUTH){
 const p=PREVIEW_AUTH, q=B4.b4003Uat5CausalPreviewAuthorization20261019||{};
 const product=Object.entries(p.productBlobs||{});
 need(sameJson(p,q)&&p.status==='AUTHORIZED_EXACT_READONLY_PREVIEW'&&p.gate==='I6.5/B4-003'&&
   p.triggerSubject==='build(i6.5 B4-003): cumulative UAT5 causal read-only Preview'&&
   p.sourceFixReceiptBlobSha===FIX.receiptBlobSha&&
   p.compositionBlobSha===(INS_ACTIVE?INS.previousCompositionBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
   p.onlyExistingPreviewHosting===true&&
   // Exact historical Preview blobs are pinned by the source receipt; current bytes are independently checked against COMP.
 product.length===8&&product.every(([path,sha])=>sha===FIX.sourceBlobs[path])&&
   sameJson(p.qaBlobs,FIX.qaBlobs)&&
   p.rosterSourceBlobSha===git('hash-object','functions/assignable-advisor-roster.js')&&
   sameJson(p.onlyReadOnlyFunctions,['orbit360ScopedPolicyReadPreview','orbit360AssignableAdvisorRosterPreview'])&&
   p.sharedRulesDeployAuthorized===false&&p.otherFunctionsDeployAuthorized===false&&
   p.operationalWritesAuthorized===false&&p.configWritesAuthorized===false&&
   p.livePromotionAuthorized===false&&p.realUserImpersonationAuthorized===false&&p.reimportAuthorized===false&&
   p.authenticatedUatRequired===true&&
   B4.boundaries?.previewMutationAuthorized===true&&B4.boundaries?.functionDeploymentAuthorized===true&&
   C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE',
   'B4_003_UAT5_NEW_EXACT_READONLY_PREVIEW_AUTH_INVALID');
 console.log('B4_003_UAT5_EXACT_PREVIEW_AUTH=PASS_READONLY_LIVE_HOLD');
}

// Security release hold is subordinate to the same CONTROL_PLANE and B4 lock.
// Historical PRODUCTION_ACCEPTED refers to an older certified artifact.
// It never authorizes promotion of the current B4 candidate or overrides the
// current unapproved product/rules mutation boundaries.
if(String(C.i65ForensicRemediationPlan?.currentBlock||'')==='B4' &&
   C.currentB4?.status==='B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL'){
 const hold=C.b4003SecurityReleaseHold||{};
 need(hold.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE' &&
   hold.gate==='I6.5/B4-003' &&
   hold.originatingFindingId==='B4-003-P0-20261012-PERSONAL-COLLECTION',
   'I65_B4_003_SECURITY_RELEASE_HOLD_MISSING');
 need(hold.observedProof?.negativeServerGetRunId===38415321605 &&
   hold.observedProof?.rulesSecurityFailRunId===38419629377 &&
   hold.observedProof?.actualActiveRulesEqualLegacySource===true,
   'I65_B4_003_SECURITY_READBACK_PROOF_MISSING');
 need(hold.sourceReceiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_R26_JULY_POSITIVE_AND_OWN_SCOPE_FORENSIC_20261012.json' &&
   exists(hold.sourceReceiptPath) &&
   git('hash-object',hold.sourceReceiptPath)===hold.sourceReceiptBlobSha,
   'I65_B4_003_SECURITY_EVIDENCE_BLOB_DRIFT');
 need(FIND.findings.length===295 &&
   FIND.findings.some(x=>x.id===hold.originatingFindingId&&x.status==='OPEN_P0_NOT_ACCEPTED') &&
   Array.isArray(hold.additionalP0)&&hold.additionalP0.length===5 &&
   hold.additionalP0.every(id=>FIND.findings.some(x=>x.id===id&&x.status==='OPEN_P0_NOT_ACCEPTED')),
   'I65_B4_003_SECURITY_FINDING_LOSS');
 need(C.i6Execution?.productMutationAuthorized===false &&
   C.i6Execution?.dataMutationAuthorized===false &&
   C.i6Execution?.livePromotionAuthorized===false &&
   B4.boundaries?.productMutationAuthorized===false &&
   B4.boundaries?.dataMutationAuthorized===false &&
   B4.boundaries?.livePromotionAuthorized===false &&
   hold.dataWritesAuthorized===false &&
   hold.productSourceWritesAuthorized===false &&
   hold.firestoreRulesDeployAuthorized===false &&
   hold.livePromotionAuthorized===false &&
   C.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_TARGETED_PAULA_VISUAL',
   'I65_B4_003_SECURITY_RELEASE_HOLD_BYPASS');
 const rtext=fs.readFileSync('firestore.rules','utf8');
 need(rtext.includes('match /tenants/{tenantId}/data/{document=**}') &&
   rtext.includes('allow read, write: if isTenantMember(tenantId);'),
   'I65_B4_003_SECURITY_SOURCE_RULES_CHANGED_WITHOUT_NEW_GATE');
 console.log('SECURITY_RELEASE_HOLD=ACTIVE_FAIL_CLOSED');
 const scoped=C.b4003LegacyWorkflowCountrySourceStage20261014;
 if(scoped?.status==='SOURCE_PATCH_COMMITTED_QA_PENDING_NO_DEPLOY'){
   const exact=B4.b4003LegacyWorkflowCountryExactSourceAuthorization20261014||{};
   const owner='functions/b4-003-scoped-related-reader.js';
   need(exact.mode==='SCOPED_SOURCE_PATCH_ONLY_GENERAL_MUTATION_AND_RELEASE_STILL_HOLD' &&
     exact.file===owner && exact.fromBlob==='20569cfb3890f37a3e0c2cdf6faf79bbfa10062f' &&
     exact.toBlob===git('hash-object',owner) &&
     HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[owner]===exact.toBlob &&
     scoped.stagedCandidate?.toGitBlob===exact.toBlob &&
     scoped.stagedCandidate?.committedIntoBranch===true &&
     scoped.stagedCandidate?.backendDeployed===false &&
     scoped.productionPromotionAuthorized===false &&
     scoped.firestoreRulesDeploymentAuthorized===false &&
     B4.boundaries?.productMutationAuthorized===false &&
     hold.productSourceWritesAuthorized===false,
     'I65_B4_003_SCOPED_SOURCE_AUTHORIZATION_DRIFT');
   console.log('B4_003_SCOPED_SOURCE_PATCH=QA_PENDING_NOT_RELEASE_ACCEPTED');
 }
 const rescue=C.b4003FunctionalContractRestore20261014;
 if(rescue?.status==='SOURCE_COMMITTED_QA_PENDING_NOT_ACCEPTED'){
   const lock=B4.b4003FunctionalContractRestore20261014||{};
   need(lock.status===rescue.status && rescue.noFirestoreRulesChanged===true &&
     rescue.noLivePromotion===true && rescue.noOperationalDataMutation===true &&
     rescue.releaseAccepted===false && B4.boundaries?.productMutationAuthorized===false &&
     lock.sharedRulesAuthorized===false && lock.liveAuthorized===false,
     'I65_B4_003_RESCUE_SCOPE_OR_RELEASE_BYPASS');
   for(const [owner,bound] of Object.entries(rescue.sourceFiles||{})){
     need(HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[owner]===bound.to &&
       git('hash-object',owner)===bound.to &&
       lock.sourceFiles?.[owner]?.to===bound.to,
       'I65_B4_003_RESCUE_PRODUCT_BLOB_DRIFT:'+owner);
   }
   for(const [path,bound] of Object.entries(rescue.qaFiles||{})){
     need(git('hash-object',path)===bound.to,
       'I65_B4_003_RESCUE_QA_BLOB_DRIFT:'+path);
   }
   console.log('B4_003_RESCUE_SOURCE=PREVIEW_QA_PENDING_RELEASE_BLOCKED');
 }

 const clientRepair=C.b4003LoginStartupScopedRepair20261019;
 if(clientRepair){
  const scoped=B4.b4003LoginStartupScopedRepair20261019||{};
  const exact=[
   'orbit360-platform/data/store-firestore-product-readonly-p0.js',
   'functions/b4-003-scoped-related-reader.js'
  ];
  const qa=[
   'tools/gravicentra-b4-003-protected-hydration.test.cjs',
   'tools/gravicentra-b4-003-scoped-related-reader.test.cjs'
  ];
  need(['SOURCE_STAGED_QA_PENDING_EXACT_PREVIEW','TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'].includes(clientRepair.status)&&
       scoped.status===clientRepair.status&&clientRepair.gate==='I6.5/B4-003'&&
       clientRepair.syntheticReproduction===true&&
       clientRepair.authenticatedLivePass===false&&
       clientRepair.previousPreviewIncludesFix===false,
       'B4_003_P0_LOGIN_REMEDIATION_STATE_INVALID');
  need(Object.keys(clientRepair.sourceBlobs||{}).length===2 &&
       Object.keys(scoped.sourceBlobs||{}).length===2 &&
       exact.every(p=>clientRepair.sourceBlobs[p]===(FIX_ACTIVE?FIX.beforeBlobs[p]:git('hash-object',p))&&
          scoped.sourceBlobs[p]===clientRepair.sourceBlobs[p]&&
          HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs?.[p]===(FIX_ACTIVE?FIX.sourceBlobs[p]:clientRepair.sourceBlobs[p])&&

          scoped.beforeBlobs?.[p]&&scoped.beforeBlobs[p]!==clientRepair.sourceBlobs[p]),
       'B4_003_P0_LOGIN_OWNER_BLOB_NOT_PINNED');
  need(qa.every(p=>clientRepair.qaBlobs?.[p]===(FIX_ACTIVE?(FIX.qaBeforeBlobs[p]||git('hash-object',p)):git('hash-object',p))&&
       scoped.qaBlobs?.[p]===clientRepair.qaBlobs[p]&&
       (FIX_ACTIVE||git('hash-object',p)===clientRepair.qaBlobs[p])),
       'B4_003_P0_LOGIN_QA_BLOB_NOT_PINNED');
  need(clientRepair.compositionBlobSha===(FIX_ACTIVE?FIX.previousCompBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))&&
       C.canonicalAccumulationControl?.compositionLockBlobSha===git('hash-object',I6_CANONICAL_COMPOSITION)&&
       scoped.compositionBlobSha===clientRepair.compositionBlobSha &&
       C.i6Execution?.productMutationAuthorized===false&&
       B4.boundaries?.productMutationAuthorized===false&&
       C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false&&
       clientRepair.productionPromotionAuthorized===false&&
       clientRepair.dataWrites===0&&clientRepair.rulesDeployed===false,
       'B4_003_P0_LOGIN_SOURCE_SCOPE_RELEASE_BARRIER');

  if(clientRepair.status==='TECHNICAL_PREVIEW_PASS_AUTHENTICATED_UAT_HOLD'){
   const preview=clientRepair.previewProof||{};
   const verified=preview.receiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_LOGIN_STARTUP_PREVIEW_TECHNICAL_READBACK_20261019.json'&&exists(preview.receiptPath)?readJson(preview.receiptPath):{};
   need(preview.status===clientRepair.status&&
      preview.receiptPath==='artifacts/orbit360-recovery/release-control/I6_5_B4_003_LOGIN_STARTUP_PREVIEW_TECHNICAL_READBACK_20261019.json'&&
      /^[a-f0-9]{40}$/.test(String(preview.sourceSha||''))&&
      /^[0-9]+$/.test(String(preview.runId||''))&&
      preview.sourceSha===verified.sourceSha&&
      preview.runId===verified.runId&&
      preview.buildId===verified.buildId&&
      preview.previewUrl===verified.previewUrl&&
      preview.receiptBlobSha===git('hash-object',preview.receiptPath)&&
      scoped.previewProof?.receiptBlobSha===preview.receiptBlobSha&&
      (C.b4003Uat5PriorPreviewProof20261019||C.b4003CurrentCumulativePreviewProof)?.sourceSha===preview.sourceSha&&
      C.b4003CurrentCumulativePreviewProof?.humanFunctionalAccepted===false&&
      preview.authenticatedPositiveNegativeAccepted===false&&
      preview.sharedRulesDeployed===false&&
      preview.productionPromoted===false,
      'B4_003_P0_LOGIN_NEW_PREVIEW_TECHNICAL_RECEIPT_INVALID');
  }
  console.log('B4_003_P0_LOGIN_STARTUP_SCOPED_SOURCE_BOUND_QA_NOT_AUTHENTICATED_PASS');
 }

 // UAT4 2026-10-19 source-backed rejection is subordinate to B4-003.
 // A Chrome route/UI PASS is not module/write/security/production acceptance.
 if(C.b4003Uat4Chrome20261019){
  const uat=C.b4003Uat4Chrome20261019||{},lock=B4.b4003Uat4Chrome20261019||{};
  const reportPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CHROME_UAT_READONLY_20261019.md';
  const receiptPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_UAT4_CHROME_CAUSAL_RECONCILIATION_20261019.json';
  need(uat.status==='AUTHENTICATED_PREVIEW_UAT_REJECTED_SOURCE_CAUSAL_READBACK'&&
       lock.status===uat.status&&
       uat.gate==='I6.5/B4-003'&&
       uat.userReportBlobSha===git('hash-object',reportPath)&&
       uat.userReportBlobSha===lock.userReportBlobSha&&
       createHash('sha256').update(fs.readFileSync(reportPath)).digest('hex')===uat.userReportSha256&&
       uat.receiptPath===receiptPath&&uat.receiptBlobSha===git('hash-object',receiptPath)&&
       uat.receiptBlobSha===lock.receiptBlobSha,
       'B4_003_UAT4_EXACT_HUMAN_REPORT_OR_RECEIPT_DRIFT');
  const uat4=readJson(receiptPath);
  const rc=uat4.sourceBackedReconciliation||{};
  need(uat4.status==='AUTHENTICATED_CHROME_UAT_REJECTED_P1_CAUSES_PARTIAL_RECONCILIATION'&&
       uat4.canonicalUat?.rows===26&&
       Array.isArray(uat4.matrix)&&uat4.matrix.length===26&&
       uat4.matrix.every(x=>x.wholeCapabilityAccepted===false)&&
       uat4.canonicalUat?.humanFunctionalAccepted===false&&
       uat4.canonicalUat?.byteExactGitBlobSha===uat.userReportBlobSha&&
       uat4.canonicalUat?.originalUploadedSha256===uat.userReportSha256&&
       rc.cliente360Customers?.raw===443&&
       rc.cliente360Customers?.uiVisibleTotal===434&&
       rc.polizas?.rawTotal===1425&&
       rc.polizas?.client360Total===1413&&
       rc.polizas?.client360Active===218&&
       rc.polizas?.excludedActive===12&&
       rc.polizas?.excludedLinkedToInvalidCountry===9&&
       rc.polizas?.excludedOrphanClient===3&&
       rc.goldenPolicyAUTO39012?.rawPolicyTotalGTQ===2116.8&&
       rc.cobrosConciliaciones?.canonicalConciliacionesProposals===0&&
       rc.cobrosConciliaciones?.canonicalConciliacionesPrimasProposals===0,
       'B4_003_UAT4_SOURCE_CAUSAL_CONTRACT_INVALID');
  need(C.currentB4?.status==='B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL'&&
       C.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_TARGETED_PAULA_VISUAL'&&
       (C.b4003Uat5PriorPreviewProof20261019||C.b4003CurrentCumulativePreviewProof)?.sourceSha==='125a3f314cb23aa128951ad714c95f143de64abb'&&
       (C.b4003Uat5PriorPreviewProof20261019||C.b4003CurrentCumulativePreviewProof)?.runId===39324152069&&
       C.b4003CurrentCumulativePreviewProof?.humanFunctionalAccepted===false&&
       C.b4003CurrentCumulativePreviewProof?.signedInRoleProof===false&&
       C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
       C.i6Execution?.productMutationAuthorized===false&&
       B4.boundaries?.productMutationAuthorized===false&&
       B4.boundaries?.dataMutationAuthorized===false&&
       B4.boundaries?.businessWritesAuthorized===false&&
       B4.boundaries?.livePromotionAuthorized===false&&
       FIND.findings.length===295&&
       uat4.retainedGovernance?.existingFindingsCount===295&&
       uat4.retainedGovernance?.productionPathProgress?.percent===20&&
       uat4.retainedGovernance?.formalI6Progress?.percent===50&&
       uat.livePromotionAuthorized===false&&
       uat.dataWrites===0&&
       lock.livePromotionAuthorized===false&&lock.dataWrites===0,
       'B4_003_UAT4_REJECTION_CANNOT_BYPASS_SECURITY_OR_PRODUCT_GATE');
  console.log('B4_003_UAT4_EXACT_CHROME_EVIDENCE_CAUSAL_PARITY=PASS_UAT_REJECTED_NO_RELEASE');
 }
 const stage=C.b4003Uat5ScopedSource20261019;
 if(stage){
 const fields=Object.keys(stage.sourceBlobs||{});
 need(['EXACT_SCOPED_SOURCE_QA_PENDING_PREVIEW','EXACT_TECHNICAL_PREVIEW_PASS_FUNCTIONAL_UAT_HOLD'].includes(stage.status)
 &&fields.length===6
 &&fields.every(p=>{
   const historical=PCACHE_ACTIVE&&p===PCACHE.sourcePath?PCACHE.sourceBlobBefore:
     CACHE_FIX_ACTIVE&&p===CACHE_FIX.productPath?CACHE_FIX.sourceBlobBefore:
     (FIX_ACTIVE?(FIX.beforeBlobs[p]||HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[p]):HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[p]);
   const current=PCACHE_ACTIVE&&p===PCACHE.sourcePath?PCACHE.sourceBlobAfter:
     AGING_ACTIVE&&p===AGING.sourcePath?AGING.sourceBlobAfter:
     (COUNTRY_ACTIVE&&p===CACHE_FIX.productPath?COUNTRY_FIX.sourceBlobsAfter[p]:
     (CACHE_FIX_ACTIVE&&p===CACHE_FIX.productPath?CACHE_FIX.sourceBlobAfter:
     (INS_ACTIVE&&INS.sourceFiles?.[p]?.after||(FIX_ACTIVE?(FIX.sourceBlobs[p]||stage.sourceBlobs[p]):stage.sourceBlobs[p]))));
   return stage.sourceBlobs[p]===historical&&HISTORIC_PRE_INSURER_COMPOSITION.productFileBlobs[p]===current&&git('hash-object',p)===current;
  })
 &&stage.compositionBlobSha===(FIX_ACTIVE?FIX.previousCompBlobSha:git('hash-object',I6_CANONICAL_COMPOSITION))
 &&stage.qaBlobSha===git('hash-object','tools/gravicentra-b4-003-uat5-display-contract.test.cjs')
 &&B4.boundaries.productMutationAuthorized===false
 &&C.b4003CurrentCumulativePreviewProof?.humanFunctionalAccepted===false
 &&C.b4003SecurityReleaseHold?.firestoreRulesDeployAuthorized===false
 &&FIND.findings.length===295,'B4_003_UAT5_SCOPED_SOURCE_DRIFT');
 if(stage.status==='EXACT_TECHNICAL_PREVIEW_PASS_FUNCTIONAL_UAT_HOLD'){
  const proof=stage.previewProof||{};
  const path='artifacts/orbit360-recovery/release-control/I6_5_B4_003_UAT5_EXACT_PREVIEW_TECHNICAL_READBACK_20261019.json';
  const receipt=readJson(path);
  need(proof.status===stage.status&&
       proof.receiptPath===path&&
       proof.receiptBlobSha===git('hash-object',path)&&
       receipt.status===proof.status&&
       receipt.sourceSha===proof.sourceSha&&
       receipt.buildId===proof.buildId&&
       receipt.runId===proof.runId&&
       receipt.previewUrl===proof.previewUrl&&
       receipt.hostedPayloadDigest===proof.hostedPayloadDigest&&
       receipt.githubActionsConclusion==='success'&&
       B4.b4003Uat5ScopedSource20261019?.status===stage.status&&
       B4.b4003Uat5ScopedSource20261019?.previewProof?.receiptBlobSha===proof.receiptBlobSha&&
       C.b4003CurrentCumulativePreviewProof?.sourceSha===proof.sourceSha&&
       C.b4003CurrentCumulativePreviewProof?.runId===proof.runId&&
       C.b4003CurrentCumulativePreviewProof?.buildId===proof.buildId&&
       C.b4003CurrentCumulativePreviewProof?.exactHostingReadback===true&&
       C.b4003CurrentCumulativePreviewProof?.humanFunctionalAccepted===false&&
       C.b4003CurrentCumulativePreviewProof?.signedInRoleProof===false&&
       C.b4003CurrentCumulativePreviewIntent?.status==='FULFILLED_EXACT_TECHNICAL_PREVIEW_NOT_FUNCTIONAL_ACCEPTANCE'&&
       C.b4003Uat5PriorPreviewProof20261019?.sourceSha==='125a3f314cb23aa128951ad714c95f143de64abb'&&
       C.b4003Uat5PriorPreviewProof20261019?.runId===39324152069&&
       receipt.security?.operationalWrites===0&&
       receipt.security?.sharedFirestoreRulesDeployed===false&&
       receipt.security?.livePromotionAuthorized===false&&
       C.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE'&&
       B4.boundaries?.productMutationAuthorized===false&&
       B4.boundaries?.dataMutationAuthorized===false&&
       B4.boundaries?.livePromotionAuthorized===false,
       'B4_003_UAT5_TECHNICAL_PROOF_OR_GATE_INVALID');
  console.log('B4_003_UAT5_EXACT_PREVIEW_TECHNICAL_READBACK=PASS_AUTH_UAT_HOLD');
 }else console.log('B4_003_UAT5_SOURCE_QA_PENDING_NO_RELEASE');
 }
 console.log('B4_003_P0_STILL_OPEN=6');
}
const P=readJson(DATA_UPDATE_PLAN),D=readJson(DATA_UPDATE_DISCIPLINE),RGT=readJson(DATA_UPDATE_REGISTRY),SRC=readJson(ACTIVE_SOURCE_INTAKE),SRC3=readJson(I63_SOURCE),R63=readJson(I63_RECEIPT),SRC4=readJson(I64_SOURCE),R64=readJson(I64_RECEIPT),SRC5=readJson(I65_SOURCE),SYNC5=readJson(I65_SYNC);
need(C.schemaVersion==='gravicentra-control-plane-v2','I6_CONTROL_SCHEMA_INVALID');
need(C.controlPlaneId==='GRAVICENTRA-INSURANCE-FASE-A','I6_CONTROL_ID_INVALID');
need(C.repository==='paulaosoriof86/orbit360-core','I6_REPOSITORY_INVALID');
need(C.branch==='recovery/fase-a-clean-20260831','I6_BRANCH_INVALID');
need(C.i65ForensicRemediationPlan?.activePlanPath===I65_FORENSIC_PLAN_V2,'I6_ACTIVE_FORENSIC_PLAN_V2_MISMATCH');
need(C.canonicalAccumulationControl?.compositionLockPath===I6_CANONICAL_COMPOSITION,'I6_CANONICAL_COMPOSITION_PATH_MISMATCH');
need(C.canonicalAccumulationControl?.findingLedgerPath===I6_FINDINGS_LEDGER,'I6_FINDINGS_LEDGER_PATH_MISMATCH');
need(FRP2.schema==='GRAVICENTRA_I6_5_FORENSIC_REMEDIATION_PLAN_LOCK_V2'&&FRP2.status==='FROZEN_ACTIVE','I6_FORENSIC_PLAN_V2_INVALID');
need(COMP.schema==='GRAVICENTRA_I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_V1'&&COMP.status==='FROZEN_ACTIVE','I6_CANONICAL_COMPOSITION_INVALID');
need(FIND.schema==='GRAVICENTRA_I6_FINDINGS_LEDGER_V1'&&FIND.status==='FROZEN_ACTIVE','I6_FINDINGS_LEDGER_INVALID');
const findingIds=(FIND.findings||[]).map(x=>x.id);
need(new Set(findingIds).size===findingIds.length,'I6_FINDINGS_LEDGER_DUPLICATE_ID');
const rejectionFindingIds=(REJ.findings||[]).map(x=>x.id);
need(rejectionFindingIds.length===13&&rejectionFindingIds.every(id=>findingIds.includes(id)),'I6_FINDINGS_LEDGER_MISSING_B2_REJECTION_FINDING');
need((RCM.findings||[]).every(x=>findingIds.includes(x.id)),'I6_FINDINGS_LEDGER_MISSING_ROOT_CAUSE_FINDING');
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

need(C.projectSources?.activePackage==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V7','I6_PROJECT_SOURCES_NOT_V7');
need(C.projectSources?.activeVersion===7,'I6_PROJECT_SOURCES_VERSION_INVALID');
need(C.projectSources?.manifestPath===V7_MANIFEST,'I6_PROJECT_SOURCES_MANIFEST_INVALID');
need(C.projectSources?.staticSourceUpdateRequired===true,'I6_PROJECT_SOURCE_UPDATE_FLAG_EXPECTED_UNTIL_USER_SYNC');
need(String(C.projectSources?.reason||'').includes('Evergreen V7 package'),'I6_PROJECT_SOURCE_UPDATE_REASON_MISSING');
need(M.packageId===C.projectSources.activePackage&&M.version===7,'I6_V7_MANIFEST_BINDING_INVALID');
need(M6.version===6,'I6_V6_RETAINED_MANIFEST_INVALID');
need(M5.version===5,'I6_V5_RETAINED_MANIFEST_INVALID');
need(git('hash-object',V7_MANIFEST)===C.projectSources.manifestBlobSha,'I6_V7_MANIFEST_BLOB_DRIFT');
need(git('hash-object',V7_ADDENDUM)===C.projectSources.normativeAddendumBlobSha,'I6_V7_ADDENDUM_BLOB_DRIFT');

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
    }else if(FR.status==='FROZEN_ACTIVE'&&forensicBlock==='B2'){
      need(FR.currentReadinessPercent===80&&FR.nextTargetPercent===90&&FR.previewAfterEveryBlockRequired===true&&FR.sameArtifactPreviewToLiveRequired===true,'I6_5_FORENSIC_B2_STATE_INVALID');
      need(FR.b2ExecutionLockPath===I65_FORENSIC_B2&&git('hash-object',I65_FORENSIC_B2)===FR.b2ExecutionLockBlobSha,'I6_5_B2_LOCK_DRIFT');
      need(B2.block==='B2'&&B2.conversationDependent===false&&B2.boundaries?.dataMutationAuthorized===false&&B2.boundaries?.reimportAuthorized===false&&B2.boundaries?.liveHostingPromotionAuthorized===false,'I6_5_B2_BOUNDARY_INVALID');
      need(['I6_5_FORENSIC_REMEDIATION_B2_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B2_PREVIEW','I6_5_FORENSIC_REMEDIATION_B2_VISUAL'].includes(C.nextAction),'I6_5_FORENSIC_B2_ACTION_INVALID');
    }else if(FR.status==='FROZEN_ACTIVE'&&forensicBlock==='B3'){
      need(FR.currentReadinessPercent===90&&FR.nextTargetPercent===96&&FR.previewAfterEveryBlockRequired===true&&FR.sameArtifactPreviewToLiveRequired===true,'I6_5_FORENSIC_B3_STATE_INVALID');
      need(FR.b3?.executionLockPath===I65_FORENSIC_B3&&git('hash-object',I65_FORENSIC_B3)===FR.b3?.executionLockBlobSha,'I6_5_B3_LOCK_DRIFT');
      need(B3.block==='B3'&&B3.entryCondition?.b2Status==='B2_PASS'&&B3.boundaries?.dataMutationAuthorized===false&&B3.boundaries?.reimportAuthorized===false&&B3.boundaries?.liveHostingPromotionAuthorized===false,'I6_5_B3_BOUNDARY_INVALID');
      need(['I6_5_FORENSIC_REMEDIATION_B3','I6_5_FORENSIC_REMEDIATION_B3_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_VISUAL','I6_5_FORENSIC_REMEDIATION_B3_PERFORMANCE_FIX','I6_5_FORENSIC_REMEDIATION_B3_002_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_002_VISUAL','I6_5_FORENSIC_REMEDIATION_B3_003_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_003_COUNTRY_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_003_FIX','I6_5_FORENSIC_REMEDIATION_B3_003_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_003_VISUAL','I6_5_FORENSIC_REMEDIATION_B3_004_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_004_FIX','I6_5_FORENSIC_REMEDIATION_B3_004_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_004_SURFACES','I6_5_FORENSIC_REMEDIATION_B3_004_SURFACE_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_004_PROVENANCE_FIX','I6_5_FORENSIC_REMEDIATION_B3_004_PROVENANCE_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_004_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_004_VISUAL','I6_5_FORENSIC_REMEDIATION_B3_005_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_005_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B3_005_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_005_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_005_VISUAL','I6_5_FORENSIC_REMEDIATION_B3_006_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_006_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B3_006_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_006_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_007_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_007_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B3_007_CONTRACT','I6_5_FORENSIC_REMEDIATION_B3_007_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_008_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B3_008_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B3_008_VISUAL'].includes(C.nextAction),'I6_5_FORENSIC_B3_ACTION_INVALID');
    }else if(FR.status==='FROZEN_ACTIVE'&&forensicBlock==='B4'){
      need(FR.currentReadinessPercent===96&&FR.nextTargetPercent===100&&FR.previewAfterEveryBlockRequired===true&&FR.sameArtifactPreviewToLiveRequired===true,'I6_5_FORENSIC_B4_STATE_INVALID');
      need(FR.b4?.executionLockPath===ACTIVE_I65_FORENSIC_B4&&git('hash-object',ACTIVE_I65_FORENSIC_B4)===FR.b4?.executionLockBlobSha,'I6_5_B4_LOCK_DRIFT');
      const b4RenewalApplyAuthorized=C.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_RENEWAL_DETERMINISTIC_APPLY'&&B4.status==='B4_003_RENEWAL_DATA_APPLY_AUTHORIZED'&&B4.renewalDeterministicApplyAuthorization?.status==='AUTHORIZED_PENDING_APPLY'&&B4.renewalDeterministicApplyAuthorization?.maxWrites===4&&Array.isArray(B4.renewalDeterministicApplyAuthorization?.exactPolicyIds)&&B4.renewalDeterministicApplyAuthorization.exactPolicyIds.length===4&&B4.boundaries?.dataMutationAuthorized===true;
      const b4R20RenewabilityApplyAuthorized=C.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_RENEWABILITY_APPLY'&&B4.status==='B4_003_R20_RENEWABILITY_APPLY_AUTHORIZED'&&B4.r20RenewabilityApplyAuthorization?.status==='AUTHORIZED_PENDING_APPLY'&&B4.r20RenewabilityApplyAuthorization?.ruleId==='PAULA_R20_RENEWABILITY_RULE_20261006'&&Number(B4.r20RenewabilityApplyAuthorization?.maxWrites||0)>0&&B4.boundaries?.dataMutationAuthorized===true;
      const b4R20RenewalCutoffApplyAuthorized=C.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_RENEWAL_CUTOFF_APPLY'&&B4.status==='B4_003_R20_RENEWAL_CUTOFF_APPLY_AUTHORIZED'&&B4.r20RenewalCutoffApplyAuthorization?.status==='AUTHORIZED_PENDING_APPLY'&&B4.r20RenewalCutoffApplyAuthorization?.ruleId==='PAULA_EXPIRED_CUTOFF_20261007'&&B4.r20RenewalCutoffApplyAuthorization?.targetDigest==='744f6f26139f272fa3a26ab35e889a9d011833e802d1495286147734ec7b4d1d'&&Number(B4.r20RenewalCutoffApplyAuthorization?.maxWrites)===583&&B4.boundaries?.renewalCutoffDataMutationAuthorized===true&&B4.boundaries?.dataMutationAuthorized===true;
      need(B4.block==='B4'&&(B4.boundaries?.dataMutationAuthorized===false||b4RenewalApplyAuthorized||b4R20RenewabilityApplyAuthorized||b4R20RenewalCutoffApplyAuthorized)&&B4.boundaries?.reimportAuthorized===false&&B4.boundaries?.livePromotionAuthorized===false,'I6_5_B4_BOUNDARY_INVALID');
      need(['I6_5_FORENSIC_REMEDIATION_B4_001_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B4_001_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_002_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B4_002_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_002_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_003_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B4_003_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_003_RENEWAL_DATA_AUTHORIZATION_OR_CONFLICT_RESOLUTION','I6_5_FORENSIC_REMEDIATION_B4_003_RENEWAL_DETERMINISTIC_APPLY','I6_5_FORENSIC_REMEDIATION_B4_003_TARGETED_PAULA_VISUAL','I6_5_FORENSIC_REMEDIATION_B4_003_R18_AUTHENTICATED_HARNESS_READBACK','I6_5_FORENSIC_REMEDIATION_B4_003_R18_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_R18_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_003_R18_TARGETED_PAULA_VISUAL','I6_5_FORENSIC_REMEDIATION_B4_003_R19_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B4_003_R19_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_R19_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_003_R19_TARGETED_PAULA_VISUAL','I6_5_FORENSIC_REMEDIATION_B4_003_R20_CAUSAL_DIAGNOSTIC_OWNER_MATRIX','I6_5_FORENSIC_REMEDIATION_B4_003_R20_RENEWABILITY_DRY_RUN_AND_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_R20_RENEWABILITY_APPLY','I6_5_FORENSIC_REMEDIATION_B4_003_R20_RENEWAL_CUTOFF_APPLY','I6_5_B4_003_RENEWALS_EXACT_PREVIEW_AUTHORIZATION','I6_5_FORENSIC_REMEDIATION_B4_003_RENEWALS_RECENT24_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_RENEWALS_PRIORITY_EXACT_PREVIEW','I6_5_B4_003_RENEWALS_EXACT_PREVIEW_VISUAL','I6_5_FORENSIC_REMEDIATION_B4_003_R20_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_003_R20_CONTRACT_AND_EXACT_PREVIEW','I6_5_FORENSIC_REMEDIATION_B4_003_R20_TARGETED_PAULA_VISUAL','I6_5_FORENSIC_REMEDIATION_B4_003_R20_SECOND_REVIEW_SINGLE_CUMULATIVE_SOURCE_FIX','I6_5_FORENSIC_REMEDIATION_B4_004_DIAGNOSTIC','I6_5_FORENSIC_REMEDIATION_B4_003_R23_CONTRACT_AND_EXACT_PREVIEW'].includes(C.nextAction),'I6_5_FORENSIC_B4_ACTION_INVALID');
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
const forensicActiveBlock=String(C.i65ForensicRemediationPlan?.currentBlock||'');
const canonicalCompositionBlock=String(COMP.activeBlock||COMP.currentBlock||'');
const canonicalCompositionActive=activeI65&&COMP.status==='FROZEN_ACTIVE'&&canonicalCompositionBlock===forensicActiveBlock;
const canonicalCompositionProduct=new Set(canonicalCompositionActive&&Array.isArray(COMP.productFiles)?COMP.productFiles:[]);
if(canonicalCompositionActive){
 need(COMP.baselineCertifiedSourceSha===R.sourceSha,'I6_CANONICAL_COMPOSITION_BASELINE_MISMATCH');
 need(COMP.definitiveSolution?.compositionAuthority==='THIS_FILE'&&COMP.definitiveSolution?.diffContract==='EXACT_PRODUCT_DIFF_SET_AND_EXACT_BLOB_BINDING_FROM_CERTIFIED_BASELINE','I6_CANONICAL_COMPOSITION_CONTRACT_INVALID');
 const actualProduct=changed.filter(p=>!allowedPrefixes.some(prefix=>p.startsWith(prefix))).sort();
 const declared=[...(COMP.productFiles||[])].sort();
 need(actualProduct.length===declared.length&&actualProduct.every((p,i)=>p===declared[i]),'I6_CANONICAL_COMPOSITION_EXACT_SET_DRIFT');
 need(declared.every(p=>COMP.productFileBlobs?.[p]&&physicalGit('hash-object',p)===COMP.productFileBlobs[p]),'I6_CANONICAL_COMPOSITION_BLOB_DRIFT');
 need(COMP.productFileCount===declared.length,'I6_CANONICAL_COMPOSITION_COUNT_DRIFT');
}
const b1Retained=activeI65&&['B1','B2','B3','B4'].includes(forensicActiveBlock)&&Array.isArray(B1.allowedProductFiles);
const b1Active=activeI65&&forensicActiveBlock==='B1'&&['PREPARED_FOR_CANDIDATE','CANDIDATE_PENDING_PREVIEW','PREVIEW_TECHNICAL_PASS_PENDING_PAULA_VISUAL','VISUAL_REJECTED_R2_ROOT_CAUSE_REQUIRED','VISUAL_REJECTED_R3_PERFORMANCE_AND_UNIVERSE_ROOT_CAUSE_REQUIRED','ACCEPTED_FOR_B2_EMAIL_DEFERRED'].includes(String(B1.status||''));
const b2PausedRetained=activeI65&&forensicActiveBlock==='B1'&&String(B2.status||'')==='PAUSED_PENDING_B1_REACCEPTANCE'&&Array.isArray(B2.boundaries?.allowedProductFiles);
const b2Active=activeI65&&forensicActiveBlock==='B2'&&['READ_ONLY_DIAGNOSTIC_ACTIVE','CAUSE_DEMONSTRATED_PATCH_AUTHORIZED','OPEN_PAULA_VISUAL_REJECTED_REMEDIATION_REQUIRED','CANDIDATE_PENDING_PREVIEW','PREVIEW_TECHNICAL_PASS_PENDING_PAULA_VISUAL','PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL','ACCEPTED_FOR_B3'].includes(String(B2.status||''));
const allowedI65ForensicB1Product=new Set(b1Retained?B1.allowedProductFiles:[]);
const allowedI65ForensicB2Product=new Set((b2Active||b2PausedRetained)&&Array.isArray(B2.boundaries?.allowedProductFiles)?B2.boundaries.allowedProductFiles:[]);
const forbidden=changed.filter(p=>!allowedPrefixes.some(prefix=>p.startsWith(prefix))&&!canonicalCompositionProduct.has(p)&&!allowedSuccessorProduct.has(p)&&!allowedI63Product.has(p)&&!allowedI64Product.has(p)&&!allowedI65Product.has(p)&&!allowedI65HydrationProduct.has(p)&&!allowedI65OperationalProduct.has(p)&&!allowedI65ForensicB1Product.has(p)&&!allowedI65ForensicB2Product.has(p));
need(forbidden.length===0,'I6_PRODUCT_SOURCE_DRIFT_OUTSIDE_BOUND_SUCCESSOR:'+forbidden.slice(0,20).join(','));
if(forensicActiveBlock==='B3'||forensicActiveBlock==='B4'){
 const b2SealOk=
   String(B2.status||'')==='B2_PASS' &&
   B2.acceptance?.b2OverallAccepted===true &&
   B2.acceptance?.humanTargetedUatPass===true &&
   B2.acceptance?.finalSyntheticCleanupPass===true &&
   B2.finalSyntheticCleanup?.status==='PASS' &&
   Array.isArray(B2.nextRequiredProof) && B2.nextRequiredProof.length===0 &&
   B2.boundaries?.advanceToB3Authorized===true &&
   B2.boundaries?.liveHostingPromotionAuthorized===false &&
   B2.boundaries?.reimportAuthorized===false;
 need(b2SealOk,'I6_B2_SEAL_REQUIRED_FOR_B3');
 const postSealB2=(FIND.findings||[]).filter(x=>x.block==='B2'&&x.blocking===true&&x.postB2Seal===true&&!['CLOSED_PASS','DEFERRED_NON_BLOCKING_WITH_EXPLICIT_AUTHORITY','NOT_APPLICABLE_WITH_EVIDENCE'].includes(x.status));
 need(postSealB2.length===0,'I6_POST_SEAL_B2_FINDINGS_OPEN:'+postSealB2.map(x=>x.id).join(','));
}
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
if(b1Retained){
 const b1Required=["orbit360-platform/index.html","orbit360-platform/core/public-tenant-branding.js","orbit360-platform/data/tenant-public-branding-index.js","orbit360-platform/modules/configuracion.js","orbit360-platform/modules/equipo.js","orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js","orbit360-platform/core/product-runtime-browser-providers-p0.js","orbit360-platform/core/auth-product-runtime-p0.js","orbit360-platform/core/auth-password-change-v20260805.js","functions/tenant-branding.js","functions/bootstrap.js","functions/package.json","orbit360-platform/assets/tenant/alianzas-soluciones/logo-oficial-360.png","orbit360-platform/assets/tenant/alianzas-soluciones/logo-bolita-96.png","orbit360-platform/core/tenant-access-policy-effective-p0.js","orbit360-platform/data/store-firestore-product-readonly-p0.js","orbit360-platform/data/store-firestore-product-operational-p0.js","orbit360-platform/core/comisiones-eng.js","functions/user-onboarding.js","functions/product-operational-domain.js","orbit360-platform/core/backend-product-readonly-bootstrap-p0.js","orbit360-platform/product-runtime-config.js","orbit360-platform/core/product-hydration-required-optional-p0.js","orbit360-platform/core/user-onboarding.js","orbit360-platform/styles/infra.css","orbit360-platform/core/tenant-access-policy-product-p0.js","orbit360-platform/modules/equipo-credential-admin-v20260805-bridge.js","orbit360-platform/core/access-role-session-owner-v20260728.js","orbit360-platform/core/access-scope.js","orbit360-platform/core/router.js","orbit360-platform/core/tenant-domain-config-client.js","functions/tenant-domain-config.js","orbit360-platform/core/tenant-access-policy-contract-p0.js","orbit360-platform/modules/crm-v1198-operational-bridge.js","orbit360-platform/styles/base.css","orbit360-platform/core/pwa.js","orbit360-platform/sw.js"];
 need(B1.allowedProductFiles.length===b1Required.length,'I6_5_B1_SCOPE_COUNT_INVALID');
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
