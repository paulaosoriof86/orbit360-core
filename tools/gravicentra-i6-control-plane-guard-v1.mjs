import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const STATUS_LEDGER='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const AUTH_RECEIPT='artifacts/orbit360-recovery/release-control/I6_EXPLICIT_AUTHORIZATION_RECEIPT_20260914.json';
const I6_ADDENDUM='artifacts/orbit360-recovery/release-control/FASE_A_POSTSALIDA_I6_ADDENDUM_20260914.md';
const I6_PLAN_LOCK='artifacts/orbit360-recovery/release-control/I6_POSTSALIDA_PLAN_LOCK_20260914.json';
const V4_MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v4/05_MANIFIESTO_FUENTES_EVERGREEN_V4.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const exists=p=>fs.existsSync(p);

need(MODE==='governance'||MODE==='i6','I6_GUARD_MODE_INVALID:'+MODE);
for(const p of [CONTROL,STATUS_LEDGER,AUTH_RECEIPT,I6_ADDENDUM,I6_PLAN_LOCK,V4_MANIFEST]) need(exists(p),'I6_REQUIRED_FILE_MISSING:'+p);
const C=readJson(CONTROL),S=readJson(STATUS_LEDGER),A=readJson(AUTH_RECEIPT),M=readJson(V4_MANIFEST);
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
need(g.I6?.status==='IN_PROGRESS_I6_0_BASELINE','I6_GATE_NOT_BASELINE_ACTIVE');
need(g.I6?.activeSubgate==='I6.0','I6_ACTIVE_SUBGATE_INVALID');

need(C.i6Execution?.authorized===true,'I6_NOT_AUTHORIZED');
need(C.i6Execution?.authorizationReceiptPath===AUTH_RECEIPT,'I6_AUTH_RECEIPT_PATH_MISMATCH');
need(C.i6Execution?.activeSubgate==='I6.0','I6_EXECUTION_SUBGATE_INVALID');
need(C.i6Execution?.dryRunPrepared===false,'I6_DRYRUN_MUST_START_FALSE');
need(C.i6Execution?.dataMutationAuthorized===false,'I6_DATA_MUTATION_MUST_BE_FALSE');
need(C.i6Execution?.productMutationAuthorized===false,'I6_PRODUCT_MUTATION_MUST_BE_FALSE');
need(C.i6Execution?.sourceDataApplyAuthorized===false,'I6_SOURCE_APPLY_MUST_BE_FALSE');
need(C.i6Execution?.requiresDryRun===true&&C.i6Execution?.requiresDiff===true&&C.i6Execution?.requiresDeduplication===true,'I6_DRYRUN_CONTRACT_INVALID');
need(C.i6Execution?.requiresAudit===true&&C.i6Execution?.requiresRollback===true,'I6_AUDIT_ROLLBACK_CONTRACT_INVALID');
need(A.schemaVersion==='gravicentra-i6-explicit-authorization-receipt-v1','I6_AUTH_RECEIPT_SCHEMA_INVALID');
need(A.authorization==='AUTHORIZED_I6_PHASE_A_POST_EXIT','I6_AUTH_RECEIPT_DECISION_INVALID');
need(A.dataMutationAuthorized===false&&A.augustRefreshAuthorized===false,'I6_AUTH_RECEIPT_OVERREACH');

need(C.projectSources?.activePackage==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4','I6_PROJECT_SOURCES_NOT_V4');
need(C.projectSources?.activeVersion===4,'I6_PROJECT_SOURCES_VERSION_INVALID');
need(C.projectSources?.manifestPath===V4_MANIFEST,'I6_PROJECT_SOURCES_MANIFEST_INVALID');
need(C.projectSources?.staticSourceUpdateRequired===false,'I6_PROJECT_SOURCE_UPDATE_FLAG_MUST_BE_CLOSED');
need(C.projectSources?.reason==null,'I6_PROJECT_SOURCE_UPDATE_REASON_MUST_BE_NULL');
need(M.packageId===C.projectSources.activePackage&&M.version===4,'I6_V4_MANIFEST_BINDING_INVALID');

const R=C.certifiedCandidate||{};
need(R.sourceSha==='16f174d087024085eff18079c486f717ef98d691','I6_CERTIFIED_SOURCE_DRIFT');
need(R.buildId==='gi-i3-16f174d08702-57f234755dc1','I6_CERTIFIED_BUILD_DRIFT');
need(Number(R.artifactId)===10183074943,'I6_CERTIFIED_ARTIFACT_DRIFT');
need(S.schemaVersion==='gravicentra-capability-status-ledger-v1','I6_LEDGER_SCHEMA_INVALID');
need(Array.isArray(S.capabilities)&&S.capabilities.length===15,'I6_LEDGER_COUNT_INVALID');
need(S.capabilities.every(x=>x.liveAcceptance?.status==='LATEST_APPROVED_VERSION_LIVE_PASS'),'I6_PRIOR_LIVE_PASS_NOT_PRESERVED');
need(S.releaseBinding?.sourceSha===R.sourceSha&&S.releaseBinding?.buildId===R.buildId&&Number(S.releaseBinding?.artifactId)===Number(R.artifactId),'I6_LEDGER_RELEASE_BINDING_MISMATCH');

const current=git('rev-parse','HEAD');
try{execFileSync('git',['merge-base','--is-ancestor',R.sourceSha,current],{stdio:'ignore'});}catch{throw new Error('I6_CERTIFIED_SOURCE_NOT_ANCESTOR');}
const allowedPrefixes=['.github/workflows/gravicentra-','tools/gravicentra-','artifacts/orbit360-recovery/release-control/','artifacts/orbit360-recovery/project-sources-v2/'];
const changed=git('diff','--name-only',R.sourceSha+'..'+current).split(/\r?\n/).filter(Boolean);
const forbidden=changed.filter(p=>!allowedPrefixes.some(prefix=>p.startsWith(prefix)));
need(forbidden.length===0,'I6_PRODUCT_SOURCE_DRIFT_BEFORE_I6_1:'+forbidden.slice(0,20).join(','));

console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
console.log('CONTROL_STATUS='+C.status);
console.log('I6_GATE='+g.I6.status);
console.log('I6_SUBGATE='+g.I6.activeSubgate);
console.log('I6_AUTHORIZED=true');
console.log('DATA_MUTATION_AUTHORIZED=false');
console.log('AUGUST_REFRESH=HOLD');
console.log('PROJECT_SOURCES='+C.projectSources.activePackage);
console.log('PRODUCT_SOURCE_DRIFT=false');
