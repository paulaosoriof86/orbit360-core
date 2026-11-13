// I6.6: clone the already certified immutable Preview Hosting version to LIVE.
// A surrounding release job owns rollback of ALL three backend functions and
// Hosting on any failure, including later real signed LIVE QA.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';

const SITE='ays-orbit-360-lab',PROJECT=SITE;
const SOURCE='0153f5cbbe00c3732e11ebae59b32bd357e38bfd';
const PREVIEW='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const CHANNEL='gi-i66-rc-42868854629';
const PREVIOUS='7e9b2b915535cfcc20285142d57bfb0afcda1057';
const PREVIOUS_BUILD='gi-i66-7e9b2b915535-57f234755dc1';
const LIVE=['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com'];
const root=process.env.I66_PACKAGE_ROOT||'',cli=process.env.FIREBASE_CLI_BIN||'';
const credential=process.env.GOOGLE_APPLICATION_CREDENTIALS||'';
const evidencePath=path.join(process.env.RUNNER_TEMP||process.cwd(),'i66-role-live-exact-proof.json');
const need=(v,s)=>{if(!v)throw Error(s);};
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const versionIsValid=v=>/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(String(v||''));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const evidence={schema:'I66_FIVE_PRIVILEGED_ROLES_IMMUTABLE_LIVE_TRANSPORT_V1',sourceSha:SOURCE,
  previewChannel:CHANNEL,artifactId:14013250472,previewFiles:0,liveSiteFiles:0,customSiteFiles:0,
  previousHostingVersion:'',previewHostingVersion:'',liveHostingVersion:'',status:'HOLD',
  realCustomerWrites:0,firestoreRuleOrAuthWrites:0,rollback:'OUTER_FUNCTION_ROLLBACK_GUARD_ACTIVE'};
async function bytes(origin,rel){
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const url=origin+'/'+rel.split('/').map(encodeURIComponent).join('/');
      const r=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
      if(!r.ok)throw Error('HTTP_'+r.status);
      return Buffer.from(await r.arrayBuffer());
    }catch(e){error=e;if(attempt<2)await pause(900*(attempt+1));}
  }
  throw Error('I66_ROLE_EXACT_ORIGIN_READ_FAILED');
}
async function marker(origin){return JSON.parse((await bytes(origin,'__recovery__/build.json')).toString());}
async function waitMarker(origin,source,build){
  for(let attempt=0;attempt<16;attempt++){
    try{const m=await marker(origin);if(m.sourceSha===source&&m.buildId===build)return m;}catch{}
    await pause(3500);
  }
  throw Error('I66_ROLE_LIVE_MARKER_STALE');
}
function manifestRows(){
  const evidenceFile=path.join(root,'evidence/site-manifest.sha256');
  need(fs.existsSync(evidenceFile),'I66_ROLE_SITE_MANIFEST_MISSING');
  const rows=fs.readFileSync(evidenceFile,'utf8').trim().split('\n').map(line=>{
    const m=line.match(/^([0-9a-f]{64})  (.+)$/);
    need(m&&!m[2].startsWith('/')&&!m[2].includes('\\')&&!m[2].split('/').some(s=>!s||s==='.'||s==='..'),
      'I66_ROLE_SITE_MANIFEST_UNSAFE');
    return{hash:m[1],path:m[2]};
  });
  need(rows.length===223&&new Set(rows.map(r=>r.path)).size===223,'I66_ROLE_SITE_FILE_COUNT_DRIFT');
  for(const r of rows){
    const file=path.join(root,'bundle/site',r.path);
    need(fs.existsSync(file)&&digest(fs.readFileSync(file))===r.hash,'I66_ROLE_SOURCE_ARTIFACT_LOCAL_DRIFT');
  }
  return rows;
}
async function verify(origin,rows){
  let index=0,done=0;
  await Promise.all(Array.from({length:12},async()=>{
    while(index<rows.length){
      const r=rows[index++];
      need(digest(await bytes(origin,r.path))===r.hash,'I66_ROLE_ORIGIN_BYTES_NOT_EXACT');
      done++;
    }
  }));
  need(done===rows.length,'I66_ROLE_ORIGIN_READBACK_INCOMPLETE');
  return done;
}
let google;
async function getVersion(channel){
  const token=(await google.getAccessToken()).token;
  const url='https://firebasehosting.googleapis.com/v1beta1/sites/'+SITE+'/channels/'+channel+'/releases?pageSize=1';
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
  need(r.ok,'I66_ROLE_FIREBASE_RELEASE_LOOKUP_FAILED');
  const v=(await r.json()).releases?.[0]?.version?.name;
  need(versionIsValid(v),'I66_ROLE_IMMUTABLE_VERSION_MISSING');
  return v;
}
try{
  need(root&&fs.existsSync(cli)&&fs.existsSync(credential),'I66_ROLE_RELEASE_PRECONDITIONS_MISSING');
  need(process.env.I66_ROLE_SOURCE_SHA===SOURCE&&process.env.I66_ROLE_PREVIEW_ORIGIN===PREVIEW,
    'I66_ROLE_SOURCE_OR_PREVIEW_PIN_DRIFT');
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'bundle/site/__recovery__/build.json'),'utf8'));
  need(pkg.gate==='I6.6'&&pkg.product==='Gravicentra Insurance'&&pkg.sourceSha===SOURCE&&
    /^gi-i66-0153f5cbbe00-/.test(pkg.buildId),'I66_ROLE_IMMUTABLE_BUILD_NOT_CERTIFIED');
  const rows=manifestRows();
  evidence.previewFiles=await verify(PREVIEW,rows);
  google=await new GoogleAuth({keyFile:credential,scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const [beforeSite,beforeCustom,old,preview]=await Promise.all([
    marker(LIVE[0]),marker(LIVE[1]),getVersion('live'),getVersion(CHANNEL)
  ]);
  need(beforeSite.sourceSha===PREVIOUS&&beforeCustom.sourceSha===PREVIOUS&&
    beforeSite.buildId===PREVIOUS_BUILD&&beforeCustom.buildId===PREVIOUS_BUILD,
    'I66_ROLE_PREVIOUS_LIVE_SOURCE_CHANGED_BLOCK_PROMOTION');
  need(old!==preview,'I66_ROLE_PREVIEW_ALREADY_LIVE');
  evidence.previousHostingVersion=old;evidence.previewHostingVersion=preview;
  need((await getVersion('live'))===old,'I66_ROLE_CONCURRENT_LIVE_RELEASE_CHANGED');
  execFileSync(process.execPath,[cli,'hosting:clone',SITE+'@'+preview.split('/').at(-1),SITE+':live',
    '--project',PROJECT,'--non-interactive','--json'],{encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']});
  await Promise.all(LIVE.map(origin=>waitMarker(origin,SOURCE,pkg.buildId)));
  [evidence.liveSiteFiles,evidence.customSiteFiles]=await Promise.all(LIVE.map(origin=>verify(origin,rows)));
  need((await getVersion('live'))===preview,'I66_ROLE_LIVE_VERSION_DIFFERS_FROM_PREVIEW');
  evidence.liveHostingVersion=preview;
  evidence.status='EXACT_223_OF_223_EACH_ORIGIN_SAME_PREVIEW_VERSION_PASS_SIGNED_LIVE_QA_REQUIRED';
  console.log('I66_ROLE_EXACT_HOSTING_TWO_LIVE_ORIGINS_223_OF_223_PASS');
  console.log('I66_ROLE_PREVIEW_VERSION_EQUALS_LIVE_VERSION_PASS');
}catch(error){
  evidence.blocker=String(error.message||error).replace(/[^A-Za-z0-9_:-]/g,'_').slice(0,140);
  console.error('I66_ROLE_EXACT_LIVE_TRANSPORT_HOLD '+evidence.blocker);
  process.exitCode=1;
}finally{
  fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  console.log('I66_ROLE_LIVE_TRANSPORT_STATUS='+evidence.status);
}
