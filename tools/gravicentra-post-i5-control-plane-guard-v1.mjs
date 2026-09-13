import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const CONTROL=process.env.GRAVICENTRA_CONTROL_PLANE||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const STATUS_LEDGER='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const ADDENDUM='artifacts/orbit360-recovery/release-control/MECHANISM_FREEZE_V5_POST_I5_20260912.md';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const SHA=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const exists=p=>fs.existsSync(p);

need(MODE==='governance','POST_I5_ONLY_GOVERNANCE_MODE_ALLOWED:'+MODE);
for(const p of [CONTROL,STATUS_LEDGER,ADDENDUM]) need(exists(p),'POST_I5_REQUIRED_FILE_MISSING:'+p);
const C=readJson(CONTROL),S=readJson(STATUS_LEDGER);
need(C.schemaVersion==='gravicentra-control-plane-v2','POST_I5_CONTROL_SCHEMA_INVALID');
need(C.controlPlaneId==='GRAVICENTRA-INSURANCE-FASE-A','POST_I5_CONTROL_ID_INVALID');
need(C.repository==='paulaosoriof86/orbit360-core','POST_I5_REPOSITORY_INVALID');
need(C.branch==='recovery/fase-a-clean-20260831','POST_I5_BRANCH_INVALID');
need(C.status==='PRODUCTION_ACCEPTED','POST_I5_STATUS_NOT_PRODUCTION_ACCEPTED');
need(C.environmentState?.productionAccepted===true,'POST_I5_PRODUCTION_NOT_ACCEPTED');
need(C.environmentState?.productionTouchedByRecovery===true,'POST_I5_PRODUCTION_TOUCH_NOT_RECORDED');
need(C.environmentState?.dataTouchedByRecovery===true,'POST_I5_CONTROLLED_DATA_TOUCH_NOT_RECORDED');
need(C.environmentState?.writesExecuted===3,'POST_I5_WRITE_COUNT_INVALID');
need(C.environmentState?.dataCutoff==='2026-07-31','POST_I5_DATA_CUTOFF_DRIFT');
need(C.environmentState?.augustRefresh==='HOLD','POST_I5_AUGUST_MUST_REMAIN_HOLD');

const G=C.gateState||{},g=G.gates||{};
for(const k of ['I0','I1','I2','I3','I4A','I4B','I5']) need(String(g[k]?.status||'').startsWith('PASS'),'POST_I5_GATE_NOT_PASS:'+k);
need(G.lastFormallyCompletedIteration===5,'POST_I5_LAST_ITERATION_INVALID');
need(G.lastFormallyCompletedGate==='I5','POST_I5_LAST_GATE_INVALID');
need(G.nextFrozenIteration==='I6','POST_I5_NEXT_ITERATION_INVALID');
need(G.currentTransition==='I6_REFRESH_AUGUST_AND_ENTER_POSTPRODUCTION','POST_I5_TRANSITION_INVALID');
need(g.I6?.status==='HOLD_PENDING_EXPLICIT_AUTHORIZATION','POST_I5_I6_MUST_BE_HOLD');
need(C.productionProgress?.formalPercent===100&&C.productionProgress?.certifiedPhysicalPercent===100,'POST_I5_PROGRESS_NOT_100');
need(Array.isArray(C.productionProgress?.iterationsRemaining)&&C.productionProgress.iterationsRemaining.length===0,'POST_I5_ITERATIONS_REMAINING_NOT_EMPTY');

const R=C.certifiedCandidate||{},seal=C.i5GateSeal||{};
need(SHA.test(String(R.sourceSha||'')),'POST_I5_SOURCE_SHA_INVALID');
need(R.sourceSha==='16f174d087024085eff18079c486f717ef98d691','POST_I5_SOURCE_IDENTITY_DRIFT');
need(R.buildId==='gi-i3-16f174d08702-57f234755dc1','POST_I5_BUILD_IDENTITY_DRIFT');
need(Number(R.artifactId)===10183074943,'POST_I5_ARTIFACT_IDENTITY_DRIFT');
need(seal.status==='PASS','POST_I5_SEAL_NOT_PASS');
need(seal.terminalRunId===34733712152&&seal.terminalRunAttempt===2,'POST_I5_TERMINAL_RUN_INVALID');
need(seal.terminalHeadSha==='e0b58e2c2e6cedd33217bad153d20f68edea212a','POST_I5_TERMINAL_HEAD_INVALID');
need(seal.evidenceArtifactId===10311055390,'POST_I5_EVIDENCE_ARTIFACT_INVALID');
need(seal.evidenceArtifactDigest==='sha256:5aad2082722a0c8eedcc3d2b6d48c702c1fab8ad3d57815f4bf5382963747ceb','POST_I5_EVIDENCE_DIGEST_INVALID');
need(seal.sameCertifiedSourceSha===R.sourceSha&&seal.sameCertifiedBuildId===R.buildId&&Number(seal.sameCertifiedArtifactId)===Number(R.artifactId),'POST_I5_RELEASE_BINDING_MISMATCH');
need(seal.productionReadbackExact===true&&seal.hostedReadbackFileCount===202,'POST_I5_HOSTED_READBACK_INVALID');
need(seal.preWriteContextsPass===15&&seal.preWriteContextsFail===0,'POST_I5_PREWRITE_MATRIX_INVALID');
need(seal.postWriteContextsPass===15&&seal.postWriteContextsFail===0,'POST_I5_POSTWRITE_MATRIX_INVALID');
need(seal.controlledWritesExecuted===3&&seal.syntheticFinalAbsent===true,'POST_I5_CONTROLLED_WRITE_INVALID');
need(seal.augustDataTouched===false,'POST_I5_AUGUST_TOUCHED');
for(const k of ['liveAcceptanceFileSha256','productionReadbackFileSha256','controlledWriteFileSha256','preWriteMatrixFileSha256','postWriteMatrixFileSha256','liveAuthFileSha256','livePublicFileSha256']) need(HEX64.test(String(seal[k]||'')),'POST_I5_EVIDENCE_FILE_HASH_INVALID:'+k);
need(typeof seal.receiptPath==='string'&&exists(seal.receiptPath),'POST_I5_RECEIPT_MISSING');
need(SHA.test(String(seal.receiptBlobSha||''))&&git('hash-object',seal.receiptPath)===seal.receiptBlobSha,'POST_I5_RECEIPT_BLOB_DRIFT');
const receipt=readJson(seal.receiptPath);
need(receipt.schemaVersion==='gravicentra-i5-gate-seal-v1'&&receipt.status==='PASS','POST_I5_RECEIPT_SCHEMA_OR_STATUS_INVALID');
need(receipt.terminalRunId===seal.terminalRunId&&receipt.terminalRunAttempt===seal.terminalRunAttempt,'POST_I5_RECEIPT_RUN_MISMATCH');
need(receipt.evidenceArtifactId===seal.evidenceArtifactId&&receipt.evidenceArtifactDigest===seal.evidenceArtifactDigest,'POST_I5_RECEIPT_ARTIFACT_MISMATCH');
need(receipt.sourceSha===R.sourceSha&&receipt.buildId===R.buildId&&Number(receipt.artifactId)===Number(R.artifactId),'POST_I5_RECEIPT_RELEASE_MISMATCH');

need(S.schemaVersion==='gravicentra-capability-status-ledger-v1','POST_I5_LEDGER_SCHEMA_INVALID');
need(Array.isArray(S.capabilities)&&S.capabilities.length===15,'POST_I5_LEDGER_COUNT_INVALID');
need(S.releaseBinding?.sourceSha===R.sourceSha&&S.releaseBinding?.buildId===R.buildId&&Number(S.releaseBinding?.artifactId)===Number(R.artifactId),'POST_I5_LEDGER_RELEASE_MISMATCH');
need(S.capabilities.every(x=>x.liveAcceptance?.status==='LATEST_APPROVED_VERSION_LIVE_PASS'),'POST_I5_LEDGER_LIVE_PASS_INCOMPLETE');
need(S.capabilities.every(x=>(x.liveAcceptance?.evidence||[]).some(e=>e.runId===seal.terminalRunId&&e.artifactId===seal.evidenceArtifactId)),'POST_I5_LEDGER_TERMINAL_EVIDENCE_INCOMPLETE');
need(SHA.test(String(C.capabilityStatusAuthority?.latestBlobSha||''))&&git('hash-object',STATUS_LEDGER)===C.capabilityStatusAuthority.latestBlobSha,'POST_I5_LEDGER_BLOB_DRIFT');

need(C.i5Execution?.productionDeployAuthorized===false,'POST_I5_I5_DEPLOY_AUTH_STILL_OPEN');
need(C.i5Execution?.controlledWritesAuthorized===false,'POST_I5_I5_WRITE_AUTH_STILL_OPEN');
need(C.i5Execution?.closed===true,'POST_I5_EXECUTION_NOT_CLOSED');
need(C.i6Execution?.authorized===false,'POST_I5_I6_MUST_NOT_BE_AUTHORIZED');

const current=git('rev-parse','HEAD');
try{execFileSync('git',['merge-base','--is-ancestor',R.sourceSha,current],{stdio:'ignore'});}catch{throw new Error('POST_I5_CERTIFIED_SOURCE_NOT_ANCESTOR');}
const allowedControlPrefixes=['.github/workflows/gravicentra-','tools/gravicentra-','artifacts/orbit360-recovery/release-control/','artifacts/orbit360-recovery/project-sources-v2/'];
const changed=git('diff','--name-only',R.sourceSha+'..'+current).split(/\r?\n/).filter(Boolean);
const forbidden=changed.filter(p=>!allowedControlPrefixes.some(prefix=>p.startsWith(prefix)));
need(forbidden.length===0,'POST_I5_PRODUCT_SOURCE_DRIFT:'+forbidden.slice(0,20).join(','));

console.log('GRAVICENTRA_POST_I5_CONTROL_PLANE_GUARD=PASS');
console.log('CONTROL_STATUS='+C.status);
console.log('I5_GATE=PASS');
console.log('PRODUCTION_ACCEPTED=true');
console.log('PRODUCTION_TOUCHED=true');
console.log('CONTROLLED_DATA_TOUCHED=true');
console.log('CONTROLLED_WRITES_EXECUTED=3');
console.log('AUGUST_REFRESH=HOLD');
console.log('NEXT_FROZEN_ITERATION=I6');
console.log('I6_AUTHORIZED=false');
console.log('PRODUCT_SOURCE_DRIFT=false');
