// I6.6: human-name successor immutable 223-file Preview site -> LIVE, with exact readback.
// The enclosing job owns automatic backend+Hosting rollback on any failure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';

const assert=(truth,code)=>{if(!truth)throw Error(code);};
const SITE='ays-orbit-360-lab',OLD='586401bfbe1a80cfef2820982f432743af36b108';
const PREVIEW=String(process.env.I66_STAGE_PREVIEW_URL||'');
const SOURCE=String(process.env.I66_STAGE_SOURCE_SHA||'');
const CHANNEL=String(process.env.I66_STAGE_PREVIEW_CHANNEL||'');
const ROOT=String(process.env.I66_STAGE_PACKAGE_ROOT||'');
const CLI=String(process.env.FIREBASE_CLI_BIN||'');
const CRED=String(process.env.GOOGLE_APPLICATION_CREDENTIALS||'');
const ROOT_PROOF=String(process.env.RUNNER_TEMP||process.cwd());
const PROOF=path.join(ROOT_PROOF,'i66-human-names-live-exact-proof.json');
const HOSTS=['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com'];
const MODE=process.argv[2]||'';
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

assert(['pre','promote','post'].includes(MODE),'I66_STAGE_RELEASE_MODE_INVALID');
assert(/^[0-9a-f]{40}$/.test(SOURCE)&&SOURCE!==OLD,'I66_STAGE_SOURCE_INVALID');
assert(/^gi-i66-rc-\d+$/.test(CHANNEL),'I66_STAGE_CHANNEL_INVALID');
assert(PREVIEW.startsWith('https://ays-orbit-360-lab--'+CHANNEL+'-')&&
  PREVIEW.endsWith('.web.app'),'I66_STAGE_PREVIEW_ORIGIN_INVALID');
assert(ROOT&&CLI&&CRED&&fs.existsSync(CLI)&&fs.existsSync(CRED),
  'I66_STAGE_RELEASE_EXISTING_ACCOUNT_OR_PACKAGE_MISSING');

async function bytes(origin,rel){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const url=origin+'/'+rel.split('/').map(encodeURIComponent).join('/');
   const response=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache'},
     signal:AbortSignal.timeout(22000)});
   if(!response.ok)throw Error('HTTP_'+response.status);
   return Buffer.from(await response.arrayBuffer());
  }catch(error){last=error;if(attempt<2)await pause((attempt+1)*900);}
 }
 throw Error('I66_STAGE_ORIGIN_UNREADABLE_'+String(last?.name||'FAILED'));
}
async function marker(origin){return JSON.parse((await bytes(origin,'__recovery__/build.json')).toString());}
function manifest(){
 const p=path.join(ROOT,'evidence/site-manifest.sha256');
 assert(fs.existsSync(p),'I66_STAGE_EXACT_SITE_MANIFEST_MISSING');
 const lines=fs.readFileSync(p,'utf8').trim().split('\n');
 const rows=lines.map(line=>{
  const m=line.match(/^([0-9a-f]{64})  (.+)$/);
  assert(m&&!m[2].startsWith('/')&&!m[2].includes('\\')&&
    m[2].split('/').every(part=>part&&part!=='.'&&part!=='..'),'I66_STAGE_SITE_MANIFEST_UNSAFE');
  assert(fs.existsSync(path.join(ROOT,'bundle/site',m[2]))&&
    hash(fs.readFileSync(path.join(ROOT,'bundle/site',m[2])))===m[1],
    'I66_STAGE_LOCAL_ARTIFACT_CHANGED');
  return{sha:m[1],rel:m[2]};
 });
 assert(rows.length===223&&new Set(rows.map(x=>x.rel)).size===223,
   'I66_STAGE_SITE_FILE_COUNT_CHANGED');
 return rows;
}
async function verify(origin,rows){
 let cursor=0,verified=0;
 await Promise.all(Array.from({length:12},async()=>{
  while(cursor<rows.length){
   const row=rows[cursor++];
   assert(hash(await bytes(origin,row.rel))===row.sha,'I66_STAGE_SITE_BYTE_READBACK_MISMATCH');
   verified++;
  }
 }));
 assert(verified===223,'I66_STAGE_SITE_READBACK_INCOMPLETE');
 return verified;
}
async function waitForBuild(origin,source,buildId){
 for(let i=0;i<20;i++){
  try{const b=await marker(origin);if(b.sourceSha===source&&b.buildId===buildId)return b;}catch{}
  await pause(3000);
 }
 throw Error('I66_STAGE_LIVE_BUILD_NOT_READY');
}
let credential;
async function version(channel){
 const token=(await credential.getAccessToken()).token;
 const response=await fetch('https://firebasehosting.googleapis.com/v1beta1/sites/'+SITE+
   '/channels/'+channel+'/releases?pageSize=1',
   {headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
 assert(response.ok,'I66_STAGE_HOSTING_VERSION_UNAVAILABLE');
 const v=(await response.json()).releases?.[0]?.version?.name;
 assert(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(String(v||'')),
   'I66_STAGE_HOSTING_VERSION_INVALID');
 return v;
}
const file=path.join(ROOT,'bundle/site/__recovery__/build.json');
assert(fs.existsSync(file),'I66_STAGE_BUILD_MARKER_MISSING');
const build=JSON.parse(fs.readFileSync(file,'utf8'));
assert(build.sourceSha===SOURCE&&build.gate==='I6.6'&&build.product==='Gravicentra Insurance',
  'I66_STAGE_IMMUTABLE_BUNDLE_SOURCE_DRIFT');
const rows=manifest();
credential=await new GoogleAuth({keyFile:CRED,scopes:[
 'https://www.googleapis.com/auth/firebase.hosting']}).getClient();

try{
 if(MODE==='pre'){
  const [beforeLive,staff,liveVersion,previewVersion,previewBuild]=await Promise.all([
   marker(HOSTS[0]),marker(HOSTS[1]),version('live'),version(CHANNEL),marker(PREVIEW)]);
  assert(beforeLive.sourceSha===OLD&&staff.sourceSha===OLD&&
    liveVersion==='sites/'+SITE+'/versions/1dd873081501d7fb',
    'I66_STAGE_R9_LIVE_POINTER_CHANGED_HOLD');
  assert(previewVersion!==liveVersion&&previewBuild.sourceSha===SOURCE&&
    previewBuild.buildId===build.buildId,'I66_STAGE_PREVIEW_EXACT_SOURCE_NOT_SEALED');
  const checked=await verify(PREVIEW,rows);
  fs.writeFileSync(PROOF,JSON.stringify({schema:'I66_HUMAN_CLIENT_NAMES_EXACT_LIVE_V1',
    sourceSha:SOURCE,previousLiveVersion:liveVersion,previewHostingVersion:previewVersion,
    previewFiles:checked,liveSiteFiles:0,customSiteFiles:0,realBusinessWrites:0,
    status:'PREVIEW_BYTES_PASS_LIVE_R9_OLD_VERSION_PINNED'},null,2)+'\n');
  console.log('I66_STAGE_EXACT_PREVIEW_223_OF_223_AND_R9_LIVE_PRECONDITIONS_PASS');
 }
 if(MODE==='promote'){
  const proof=JSON.parse(fs.readFileSync(PROOF,'utf8'));
  assert(proof.sourceSha===SOURCE&&proof.previewFiles===223&&
    (await version('live'))===proof.previousLiveVersion&&
    (await version(CHANNEL))===proof.previewHostingVersion,
    'I66_STAGE_PREPROMOTION_VERSION_RACE_STOP');
  execFileSync(process.execPath,[CLI,'hosting:clone',SITE+'@'+proof.previewHostingVersion.split('/').at(-1),
    SITE+':live','--project',SITE,'--non-interactive','--json'],
   {timeout:180000,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  await Promise.all(HOSTS.map(o=>waitForBuild(o,SOURCE,build.buildId)));
  [proof.liveSiteFiles,proof.customSiteFiles]=await Promise.all(HOSTS.map(o=>verify(o,rows)));
  assert((await version('live'))===proof.previewHostingVersion,
    'I66_STAGE_LIVE_VERSION_DIFFERS_FROM_CERTIFIED_PREVIEW');
  proof.status='EXACT_PREVIEW_VERSION_PUBLISHED_223_OF_223_BOTH_LIVE_ORIGINS_SIGNED_QA_PENDING';
  fs.writeFileSync(PROOF,JSON.stringify(proof,null,2)+'\n');
  console.log('I66_STAGE_EXACT_SAME_ARTIFACT_LIVE_223_OF_223_EACH_ORIGIN_PASS');
 }
 if(MODE==='post'){
  const proof=JSON.parse(fs.readFileSync(PROOF,'utf8'));
  assert(proof.sourceSha===SOURCE&&proof.liveSiteFiles===223&&proof.customSiteFiles===223&&
    (await version('live'))===proof.previewHostingVersion,
    'I66_STAGE_POST_SIGNED_LIVE_VERSION_DRIFT');
  const [a,b]=await Promise.all(HOSTS.map(marker));
  assert(a.sourceSha===SOURCE&&b.sourceSha===SOURCE&&a.buildId===build.buildId&&
    b.buildId===build.buildId,'I66_STAGE_POST_SIGNED_LIVE_BUILD_DRIFT');
  proof.status='EXACT_SAME_ARTIFACT_DUAL_ORIGIN_SIGNED_LIVE_PASS';
  fs.writeFileSync(PROOF,JSON.stringify(proof,null,2)+'\n');
  console.log('I66_STAGE_LIVE_POST_SIGNED_BUILD_AND_IMMUTABLE_VERSION_PASS');
 }
}catch(error){
 console.error('I66_STAGE_EXACT_LIVE_'+MODE.toUpperCase()+'_HOLD '+
   String(error?.message||error).replace(/[^\w:-]+/g,'_').slice(0,140));
 throw error;
}
