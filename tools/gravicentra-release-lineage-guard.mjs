import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const LOCK_PATH=process.env.GRAVICENTRA_RELEASE_LOCK||'artifacts/orbit360-recovery/release-control/ACTIVE_RELEASE_LOCK.json';
const STATE_PATH=process.env.GRAVICENTRA_RECOVERY_STATE||'artifacts/orbit360-recovery/release-control/RECOVERY_STATE.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=certified').split('=')[1];
const LOCK=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
const STATE=JSON.parse(fs.readFileSync(STATE_PATH,'utf8'));
const SHA=/^[0-9a-f]{40}$/; const HEX64=/^[0-9a-f]{64}$/;
const fail=code=>{throw new Error(code);}; const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(p,'utf8');

need(['candidate','control-plane','certified'].includes(MODE),'RELEASE_GUARD_MODE_INVALID');
need(STATE.schemaVersion==='orbit360-recovery-state-v1','RECOVERY_STATE_SCHEMA_INVALID');
need(STATE.stateId==='GRAVICENTRA-INSURANCE-FASE-A-CLEAN-RECOVERY','RECOVERY_STATE_ID_INVALID');
need(STATE.branch==='recovery/fase-a-clean-20260831','RECOVERY_STATE_BRANCH_INVALID');
need(STATE.currentIteration===3&&STATE.lastCompletedIteration===2,'RECOVERY_STATE_GATE_SEQUENCE_INVALID');
need(STATE.activeGate===LOCK.activeGate,'RECOVERY_STATE_RELEASE_LOCK_GATE_MISMATCH');
need(STATE.releaseAuthority&&STATE.releaseAuthority.path===LOCK_PATH,'RECOVERY_STATE_RELEASE_AUTHORITY_MISMATCH');
need(STATE.productionAccepted===false,'RECOVERY_STATE_PRODUCTION_ALREADY_ACCEPTED');
need(STATE.productionTouchedByRecovery===false,'RECOVERY_STATE_PRODUCTION_TOUCHED');
need(STATE.dataTouchedByRecovery===false,'RECOVERY_STATE_DATA_TOUCHED');
need(STATE.dataCutoff==='2026-07-31','RECOVERY_STATE_DATA_CUTOFF_DRIFT');
need(STATE.staticSnapshotDisposition&&STATE.staticSnapshotDisposition['05_ESTADO_VIVO_RECOVERY_20260831']==='SUPERSEDED_BY_EXECUTED_REALITY','STALE_STATE_SNAPSHOT_NOT_SUPERSEDED');

need(LOCK.schemaVersion==='gravicentra-recovery-active-release-lock-v1','RELEASE_LOCK_SCHEMA_INVALID');
need(LOCK.productBrand==='Gravicentra Insurance','RELEASE_LOCK_PRODUCT_INVALID');
need(LOCK.branch==='recovery/fase-a-clean-20260831','RELEASE_LOCK_BRANCH_INVALID');
need(SHA.test(String(LOCK.candidateSourceSha||'')),'RELEASE_LOCK_CANDIDATE_SHA_INVALID');
const cert=LOCK.certified||{};
need(SHA.test(String(cert.sourceSha||'')),'RELEASE_LOCK_CERTIFIED_SHA_INVALID');
need(/^gi-i3-[0-9a-f]{12}-[0-9a-f]{12}$/.test(String(cert.buildId||'')),'RELEASE_LOCK_BUILD_ID_INVALID');
need(String(cert.buildId).includes(String(cert.sourceSha).slice(0,12)),'RELEASE_LOCK_BUILD_SOURCE_MISMATCH');
need(HEX64.test(String(cert.hostedPayloadDigest||'')),'RELEASE_LOCK_HOSTED_DIGEST_INVALID');
need(HEX64.test(String(cert.bundleDigest||'')),'RELEASE_LOCK_BUNDLE_DIGEST_INVALID');
need(cert.readbackExact===true,'RELEASE_LOCK_READBACK_NOT_EXACT');
need(cert.productionTouched===false,'RELEASE_LOCK_PRODUCTION_TOUCHED');
need(cert.dataTouched===false,'RELEASE_LOCK_DATA_TOUCHED');
need(cert.sameArtifactPreviewToProductionRequired===true,'RELEASE_LOCK_SAME_ARTIFACT_RULE_MISSING');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(String(cert.previewUrl||'')),'RELEASE_LOCK_PREVIEW_URL_INVALID');
need(LOCK.releaseRules&&LOCK.releaseRules.i3MustDeriveCandidateFromThisLock===true,'I3_SINGLE_SOURCE_RULE_MISSING');
need(LOCK.releaseRules.sharedBackendMutationBeforeI5Forbidden===true,'PRE_I5_SHARED_BACKEND_FORBIDDEN_RULE_MISSING');

const candidate=String(LOCK.candidateSourceSha), certified=String(cert.sourceSha), pending=candidate!==certified;
if(pending){
  need(LOCK.status==='CANDIDATE_SOURCE_PENDING_I3','PENDING_I3_STATUS_MISMATCH');
  need(String(LOCK.activeGate||'').startsWith('I3'),'PENDING_I3_ACTIVE_GATE_MISMATCH');
  const t=LOCK.candidateTopology||{};
  need(t.productionCallable==='orbit360ProductInsurerCredentialCommand','PENDING_PRODUCTION_CALLABLE_INVALID');
  need(t.productionRegion==='us-central1','PENDING_PRODUCTION_REGION_INVALID');
  need(t.productionBackendTouched===false,'PENDING_PRODUCTION_BACKEND_TOUCHED');
  need(t.i3FunctionsDeployAllowed===false,'I3_FUNCTIONS_DEPLOY_MUST_BE_FORBIDDEN');
  need(t.i3SharedBackendMutationAllowed===false,'I3_SHARED_BACKEND_MUTATION_MUST_BE_FORBIDDEN');
}else{
  need(LOCK.status!=='CANDIDATE_SOURCE_PENDING_I3','CERTIFIED_STATE_STILL_PENDING_I3');
}

const source=(MODE==='candidate'||(MODE==='control-plane'&&pending))?candidate:certified;
const current=git('rev-parse','HEAD');
try{git('cat-file','-e',source+'^{commit}');}catch{fail('RELEASE_LOCK_SOURCE_COMMIT_NOT_AVAILABLE:'+source);}
try{execFileSync('git',['merge-base','--is-ancestor',source,current],{stdio:'ignore'});}catch{fail('RELEASE_LOCK_SOURCE_NOT_ANCESTOR:'+source+':'+current);}
const changed=git('diff','--name-only',source+'..'+current).split(/\r?\n/).filter(Boolean);
const prefixes=Array.isArray(LOCK.allowedPostCertificationControlPlanePrefixes)?LOCK.allowedPostCertificationControlPlanePrefixes:[];
const forbidden=changed.filter(p=>!prefixes.some(prefix=>p.startsWith(prefix)));
need(forbidden.length===0,'ACTIVE_RELEASE_LOCK_INVALIDATED_BY_SOURCE_DRIFT:'+forbidden.slice(0,20).join(','));

function validateControlPlane(){
  const i3='.github/workflows/gravicentra-recovery-i3-preview-v2.yml';
  const i4a='.github/workflows/gravicentra-recovery-i4a-public-browser.yml';
  const insurer='.github/workflows/gravicentra-i4a-insurer-backend-boundary-readonly.yml';
  need(fs.existsSync(i3),'I3_V2_EXECUTOR_MISSING');
  need(!fs.existsSync('.github/workflows/gravicentra-recovery-i3-preview.yml'),'STALE_I3_EXECUTOR_PRESENT');
  const i3text=read(i3);
  need(!/^  SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(i3text),'I3_HARDCODED_SOURCE_SHA_FORBIDDEN');
  need(i3text.includes('id: release'),'I3_RELEASE_GUARD_OUTPUT_STEP_MISSING');
  need(i3text.includes('ref: ${{ steps.release.outputs.source_sha }}'),'I3_SOURCE_NOT_DERIVED_FROM_RELEASE_LOCK');
  need(i3text.includes('node tools/gravicentra-release-lineage-guard.mjs --mode=candidate'),'I3_CANDIDATE_GUARD_MISSING');
  need(!/functions:[A-Za-z0-9_$-]+/.test(i3text),'I3_FUNCTIONS_DEPLOY_TARGET_FORBIDDEN');
  need(!i3text.includes('functions:delete'),'I3_FUNCTION_DELETE_FORBIDDEN');
  need(!i3text.includes('firebase.backend.json --only'),'I3_BACKEND_DEPLOY_FORBIDDEN');
  need(i3text.includes('Locked backend dependency preflight before Firebase access'),'I3_PIPELINE_PREFLIGHT_MISSING');
  need(read(i4a).includes('--mode=certified'),'I4A_CERTIFIED_GUARD_MISSING');
  need(read(insurer).includes('--mode=certified'),'INSURER_CERTIFIED_GUARD_MISSING');
}
async function validatePreview(){
  const url=String(cert.previewUrl).replace(/\/$/,'')+'/__recovery__/build.json?releaseLock='+Date.now();
  const res=await fetch(url,{headers:{'cache-control':'no-cache','accept-encoding':'identity','user-agent':'Gravicentra-Release-Lineage-Guard/4.0'}});
  need(res.ok,'RELEASE_LOCK_PREVIEW_MARKER_HTTP_'+res.status);
  const marker=await res.json();
  need(marker&&marker.sourceSha===cert.sourceSha,'RELEASE_LOCK_PREVIEW_SOURCE_MISMATCH');
  need(marker&&marker.buildId===cert.buildId,'RELEASE_LOCK_PREVIEW_BUILD_MISMATCH');
}
if(MODE==='control-plane'){validateControlPlane();if(!pending)await validatePreview();}
if(MODE==='certified'){need(!pending,'ACTIVE_I4A_BLOCKED_PENDING_NEW_I3_CERTIFICATION');validateControlPlane();await validatePreview();}

const exportsMap=MODE==='candidate'
  ? {SOURCE_SHA:candidate}
  : {SOURCE_SHA:source,BUILD_ID:String(cert.buildId),PREVIEW_URL:String(cert.previewUrl),HOSTED_PAYLOAD_DIGEST:String(cert.hostedPayloadDigest),BUNDLE_DIGEST:String(cert.bundleDigest),I3_RUN_ID:String(cert.i3RunId),I3_ARTIFACT_ID:String(cert.artifactId)};
for(const [k,v] of Object.entries(exportsMap)){
  if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`${k}=${v}\n`);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k.toLowerCase()}=${v}\n`);
}
console.log('GRAVICENTRA_RELEASE_LINEAGE_GUARD=PASS');
console.log('MODE='+MODE);
console.log('RECOVERY_STATE='+STATE.status);
console.log('ACTIVE_GATE='+STATE.activeGate);
console.log('CANDIDATE_SOURCE_SHA='+candidate);
console.log('CERTIFIED_SOURCE_SHA='+certified);
console.log('PENDING_I3='+pending);
console.log('DRIFT_BASE_SOURCE_SHA='+source);
console.log('POST_SOURCE_CHANGED_FILES='+changed.length);
console.log('PRE_I5_SHARED_BACKEND_MUTATION_FORBIDDEN=true');
console.log('PRODUCTION_TOUCHED=false');
console.log('DATA_TOUCHED=false');
