import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const LOCK_PATH=process.env.GRAVICENTRA_RELEASE_LOCK||'artifacts/orbit360-recovery/release-control/ACTIVE_RELEASE_LOCK.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=certified').split('=')[1];
const LOCK=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
const SHA=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const fail=code=>{throw new Error(code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(p,'utf8');

need(['candidate','control-plane','certified'].includes(MODE),'RELEASE_GUARD_MODE_INVALID');
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

const candidate=String(LOCK.candidateSourceSha);
const certified=String(cert.sourceSha);
const pending=candidate!==certified;
if(pending){
  need(LOCK.status==='CANDIDATE_SOURCE_PENDING_I3','PENDING_I3_STATUS_MISMATCH');
  need(String(LOCK.activeGate||'').startsWith('I3'),'PENDING_I3_ACTIVE_GATE_MISMATCH');
}else{
  need(LOCK.status!=='CANDIDATE_SOURCE_PENDING_I3','CERTIFIED_STATE_STILL_MARKED_PENDING_I3');
}

// In the legitimate pending-I3 state, the candidate itself is approved source
// awaiting immutable certification. Control-plane drift must therefore be measured
// after the candidate, not from the previous certified source.
const source=(MODE==='candidate'||(MODE==='control-plane'&&pending))?candidate:certified;
const current=git('rev-parse','HEAD');
try{git('cat-file','-e',source+'^{commit}');}catch{fail('RELEASE_LOCK_SOURCE_COMMIT_NOT_AVAILABLE:'+source);}
try{execFileSync('git',['merge-base','--is-ancestor',source,current],{stdio:'ignore'});}catch{fail('RELEASE_LOCK_SOURCE_NOT_ANCESTOR:'+source+':'+current);}

const changed=git('diff','--name-only',source+'..'+current).split(/\r?\n/).filter(Boolean);
const prefixes=Array.isArray(LOCK.allowedPostCertificationControlPlanePrefixes)?LOCK.allowedPostCertificationControlPlanePrefixes:[];
const forbidden=changed.filter(p=>!prefixes.some(prefix=>p.startsWith(prefix)));
need(forbidden.length===0,'ACTIVE_RELEASE_LOCK_INVALIDATED_BY_SOURCE_DRIFT:'+forbidden.slice(0,20).join(','));

function exactEnvPin(file,key){
  const text=read(file), re=new RegExp('^  '+key+': (.+)$','gm'), hits=[...text.matchAll(re)].map(m=>m[1].trim());
  need(hits.length===1,'CONTROL_PLANE_PIN_CARDINALITY_FAIL:'+file+':'+key+':'+hits.length);
  return hits[0];
}
function validateControlPlane(){
  const i3='.github/workflows/gravicentra-recovery-i3-preview.yml';
  const i4a='.github/workflows/gravicentra-recovery-i4a-public-browser.yml';
  const insurer='.github/workflows/gravicentra-i4a-insurer-backend-boundary-readonly.yml';
  need(exactEnvPin(i3,'SOURCE_SHA')===candidate,'I3_PIN_DESYNC_FROM_RELEASE_LOCK');
  need(exactEnvPin(i4a,'SOURCE_SHA')===certified,'I4A_SOURCE_PIN_DESYNC_FROM_RELEASE_LOCK');
  need(exactEnvPin(i4a,'BUILD_ID')===String(cert.buildId),'I4A_BUILD_PIN_DESYNC_FROM_RELEASE_LOCK');
  need(exactEnvPin(i4a,'PREVIEW_URL')===String(cert.previewUrl),'I4A_PREVIEW_PIN_DESYNC_FROM_RELEASE_LOCK');
  need(exactEnvPin(insurer,'SOURCE_SHA')===certified,'INSURER_SOURCE_PIN_DESYNC_FROM_RELEASE_LOCK');
  need(exactEnvPin(insurer,'BUILD_ID')===String(cert.buildId),'INSURER_BUILD_PIN_DESYNC_FROM_RELEASE_LOCK');
  const stale=read('.github/workflows/gravicentra-i4a-retarget-i3-preview.yml');
  need(!/NEW_SOURCE_SHA\s*:/.test(stale),'STALE_RETARGET_HARDCODE_STILL_PRESENT');
  need(!/contents:\s*write/.test(stale),'RETARGET_WORKFLOW_STILL_HAS_WRITE_PERMISSION');
}

async function validatePreview(){
  const url=String(cert.previewUrl).replace(/\/$/,'')+'/__recovery__/build.json?releaseLock='+Date.now();
  const res=await fetch(url,{headers:{'cache-control':'no-cache','accept-encoding':'identity','user-agent':'Gravicentra-Release-Lineage-Guard/2.1'}});
  need(res.ok,'RELEASE_LOCK_PREVIEW_MARKER_HTTP_'+res.status);
  const marker=await res.json();
  need(marker&&marker.sourceSha===cert.sourceSha,'RELEASE_LOCK_PREVIEW_SOURCE_MISMATCH');
  need(marker&&marker.buildId===cert.buildId,'RELEASE_LOCK_PREVIEW_BUILD_MISMATCH');
}

if(MODE==='control-plane'){
  validateControlPlane();
  if(!pending) await validatePreview();
}
if(MODE==='certified'){
  need(!pending,'ACTIVE_I4A_BLOCKED_PENDING_NEW_I3_CERTIFICATION');
  validateControlPlane();
  await validatePreview();
}

const exportsMap={
  SOURCE_SHA:source,
  BUILD_ID:String(cert.buildId),
  PREVIEW_URL:String(cert.previewUrl),
  HOSTED_PAYLOAD_DIGEST:String(cert.hostedPayloadDigest),
  BUNDLE_DIGEST:String(cert.bundleDigest),
  I3_RUN_ID:String(cert.i3RunId),
  I3_ARTIFACT_ID:String(cert.artifactId)
};
for(const [k,v] of Object.entries(exportsMap)){
  if(process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV,`${k}=${v}\n`,'utf8');
  if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k.toLowerCase()}=${v}\n`,'utf8');
}
console.log('GRAVICENTRA_RELEASE_LINEAGE_GUARD=PASS');
console.log('MODE='+MODE);
console.log('CANDIDATE_SOURCE_SHA='+candidate);
console.log('CERTIFIED_SOURCE_SHA='+certified);
console.log('PENDING_I3='+pending);
console.log('DRIFT_BASE_SOURCE_SHA='+source);
console.log('BUILD_ID='+cert.buildId);
console.log('PREVIEW_URL='+cert.previewUrl);
console.log('POST_SOURCE_CHANGED_FILES='+changed.length);
console.log('PRODUCTION_TOUCHED=false');
console.log('DATA_TOUCHED=false');