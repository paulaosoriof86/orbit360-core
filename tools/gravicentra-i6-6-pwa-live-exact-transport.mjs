import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';

const SITE='ays-orbit-360-lab',PROJECT='ays-orbit-360-lab';
const request={sourceSha:process.env.I66_PWA_SOURCE_SHA,artifactId:Number(process.env.I66_PWA_ARTIFACT_ID),previewChannel:process.env.I66_PWA_PREVIEW_CHANNEL};
const packageRoot=process.env.I66_PACKAGE_ROOT||'';
const cli=process.env.FIREBASE_CLI_BIN||'';
const cred=process.env.GOOGLE_APPLICATION_CREDENTIALS||'';
const out=path.join(process.env.RUNNER_TEMP||process.cwd(),'i66-pwa-live-exact-readback.json');
const need=(v,c)=>{if(!v)throw Error(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const safe=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120);
const ver=v=>/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(String(v||''));
const evidence={schema:'I6_6_PWA_RENEWABILITY_LIVE_EXACT_TRANSPORT_V1',gate:'I6.6',sourceSha:request.sourceSha,buildId:request.buildId,
  artifactId:request.artifactId,previewChannel:request.previewChannel,status:'HOLD',liveBeforeVersion:'',previewVersion:'',liveAfterVersion:'',
  firebaseLiveReadbackCount:0,appDomainReadbackCount:0,previewReadbackCount:0,dataWrites:0,backendDeployments:0,rollback:'NOT_REQUIRED'};
let oldVersion='',promoting=false;
async function bytes(origin,p,attempts=3){
  const u=origin.replace(/\/$/,'')+'/'+p.split('/').map(encodeURIComponent).join('/');
  let last=null;
  for(let a=0;a<attempts;a++){
    try{
      const r=await fetch(u,{redirect:'follow',headers:{'cache-control':'no-cache','pragma':'no-cache'},signal:AbortSignal.timeout(20000)});
      if(!r.ok)throw Error('HTTP_'+r.status);
      return Buffer.from(await r.arrayBuffer());
    }catch(e){last=e;if(a<attempts-1)await pause(900*(a+1));}
  }
  throw Error('I66_HTTP_ORIGIN_READ_FAILED');
}
function expectedRows(){
  const raw=fs.readFileSync(path.join(packageRoot,'evidence/site-manifest.sha256'),'utf8').trim().split('\n');
  const rows=raw.map(s=>{const m=s.match(/^([0-9a-f]{64})  (.+)$/);need(m&&m[2]&&!m[2].startsWith('/')&&!m[2].includes('\\')&&!m[2].split('/').some(seg=>!seg||seg==='.'||seg==='..'),'I66_PACKAGE_MANIFEST_INVALID');return{hash:m[1],rel:m[2]};});
  need(rows.length>=200&&rows.length<=800,'I66_PACKAGE_SITE_FILE_COUNT_INVALID');
  need(new Set(rows.map(r=>r.rel)).size===rows.length,'I66_PACKAGE_DUPLICATE_FILE');
  for(const r of rows){
    const p=path.join(packageRoot,'bundle/site',r.rel);
    need(fs.existsSync(p)&&sha(fs.readFileSync(p))===r.hash,'I66_PACKAGE_LOCAL_FILE_HASH_MISMATCH');
  }
  return rows;
}
async function verifyOrigin(origin,rows){
  let i=0,done=0;
  await Promise.all(Array.from({length:12},async()=>{
    while(i<rows.length){
      const r=rows[i++],b=await bytes(origin,r.rel,3);
      if(sha(b)!==r.hash)throw Error('I66_ORIGIN_BYTE_MISMATCH');
      done++;
    }
  }));
  need(done===rows.length,'I66_ORIGIN_INCOMPLETE_READBACK');
  return done;
}

const mimeRules={
  'manifest.webmanifest':['application/manifest+json','application/json'],
  'assets/icons/gravicentra-192.png':['image/png'],
  'assets/icons/gravicentra-512.png':['image/png'],
  'sw.js':['application/javascript','text/javascript']
};
async function verifyAssetMime(origin){
  const received={};
  for(const [rel,accepted] of Object.entries(mimeRules)){
    const u=(origin.endsWith('/')?origin.slice(0,-1):origin)+'/'+rel;
    const r=await fetch(u,{headers:{'cache-control':'no-cache','pragma':'no-cache'},signal:AbortSignal.timeout(20000)});
    need(r.ok,'I66_PWA_ASSET_HTTP_NOT_200');
    const actual=String(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    need(accepted.includes(actual),'I66_PWA_ASSET_MIME_INVALID');
    received[rel]=actual;
    await r.arrayBuffer();
  }
  return received;
}

async function marker(origin){
  const x=await bytes(origin,'__recovery__/build.json',3);
  const m=JSON.parse(x.toString('utf8'));
  need(m.product==='Gravicentra Insurance'&&/^[0-9a-f]{40}$/.test(m.sourceSha||''),'I66_ORIGIN_MARKER_INVALID');
  return m;
}
async function awaitMarker(origin,source,buildId,maxTries=15){
  for(let i=0;i<maxTries;i++){
    try{const m=await marker(origin);if(m.sourceSha===source&&m.buildId===buildId)return m;}catch{}
    await pause(4000);
  }
  throw Error('I66_ORIGIN_MARKER_NOT_PROPAGATED');
}
let authClient;
async function getLatestRelease(channel){
  const token=await authClient.getAccessToken();
  const url='https://firebasehosting.googleapis.com/v1beta1/sites/'+SITE+'/channels/'+channel+'/releases?pageSize=1';
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token.token,'Accept':'application/json'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('I66_HOSTING_RELEASE_LOOKUP_FAILED');
  const j=await r.json(),first=j.releases?.[0],version=first?.version?.name;
  need(ver(version),'I66_HOSTING_VERSION_NOT_RESOLVED');
  return version;
}
function cloneToLive(version){
  need(ver(version)&&fs.existsSync(cli)&&fs.existsSync(cred),'I66_CLONE_PRECONDITION_INVALID');
  const id=version.split('/').at(-1);
  execFileSync(process.execPath,[cli,'hosting:clone',SITE+'@'+id,SITE+':live','--project',PROJECT,'--non-interactive','--json'],
    {encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,env:process.env});
}

const expectedSource='13345caebe981940d8aae9dcbf274f44aad04deb';
const expectedPreview=process.env.I66_PWA_PREVIEW_URL||'';
const expectedOld='35008e0d5b9ac81907e0041398e6434d0fcda631';
const expectedOldBuild='gi-i66-35008e0d5b9a-57f234755dc1';
function validPreviewUrl(origin,channel){
  if(!/^gi-i66-rc-[0-9]+$/.test(channel))return false;
  const prefix='https://ays-orbit-360-lab--'+channel+'-',suffix='.web.app';
  if(!origin.startsWith(prefix)||!origin.endsWith(suffix))return false;
  return /^[a-z0-9]+$/.test(origin.slice(prefix.length,-suffix.length));
}
const negativePreviewUrls=[
  'https://ays-orbit-360-lab--gi-i66-rc-42871046232-old.web.app',
  'https://ays-orbit-360-lab--gi-i66-rc-42881038831-g1udjwhn.web.app.evil.test',
  'http://ays-orbit-360-lab--gi-i66-rc-42881038831-g1udjwhn.web.app',
  'https://malicious--gi-i66-rc-42881038831-g1udjwhn.web.app'
];
try{
  need(negativePreviewUrls.every(u=>!validPreviewUrl(u,request.previewChannel)),'I66_PWA_PREVIEW_NEGATIVE_GUARD_FAILED');
  need(request.sourceSha===expectedSource&&request.artifactId===13792634838&&
       request.previewChannel==='gi-i66-rc-42881038831'&&
       validPreviewUrl(expectedPreview,request.previewChannel),'I66_PWA_SOURCE_OR_ARTIFACT_PIN_DRIFT');
  need(packageRoot&&cli&&cred&&fs.existsSync(path.join(packageRoot,'bundle/site/__recovery__/build.json')),'I66_PWA_PACKAGE_NOT_MOUNTED');
  const pkg=JSON.parse(fs.readFileSync(path.join(packageRoot,'bundle/site/__recovery__/build.json'),'utf8'));
  need(pkg.gate==='I6.6'&&pkg.sourceSha===expectedSource&&pkg.buildId.startsWith('gi-i66-'),'I66_PWA_PACKET_IDENTITY_DRIFT');
  evidence.buildId=pkg.buildId;
  const rows=expectedRows();
  for(const rel of Object.keys(mimeRules))need(rows.some(r=>r.rel===rel),'I66_PWA_REQUIRED_ASSET_NOT_PACKAGED');
  evidence.previewReadbackCount=await verifyOrigin(expectedPreview,rows);
  evidence.previewAssetMimes=await verifyAssetMime(expectedPreview);
  authClient=await new GoogleAuth({keyFile:cred,scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const [firebaseBefore,customBefore,old,previewVersion]=await Promise.all([
    marker('https://ays-orbit-360-lab.web.app'),
    marker('https://app.aysseguros.com'),
    getLatestRelease('live'),
    getLatestRelease(request.previewChannel)
  ]);
  need(firebaseBefore.sourceSha===expectedOld&&customBefore.sourceSha===expectedOld&&
       firebaseBefore.buildId===expectedOldBuild&&customBefore.buildId===expectedOldBuild,
       'I66_PWA_DUAL_ORIGIN_LIVE_CHANGED_BEFORE_CLONE');
  oldVersion=old;evidence.liveBeforeVersion=old;evidence.previewVersion=previewVersion;
  need(old!==previewVersion,'I66_PWA_LIVE_ALREADY_SAME_VERSION');
  const [beforeAgain,oldAgain]=await Promise.all([marker('https://ays-orbit-360-lab.web.app'),getLatestRelease('live')]);
  need(oldAgain===old&&beforeAgain.sourceSha===expectedOld,'I66_PWA_LIVE_CHANGED_DURING_PREFLIGHT');
  promoting=true;
  cloneToLive(previewVersion);
  await Promise.all([
    awaitMarker('https://ays-orbit-360-lab.web.app',expectedSource,pkg.buildId,15),
    awaitMarker('https://app.aysseguros.com',expectedSource,pkg.buildId,15)
  ]);
  evidence.firebaseLiveReadbackCount=await verifyOrigin('https://ays-orbit-360-lab.web.app',rows);
  evidence.appDomainReadbackCount=await verifyOrigin('https://app.aysseguros.com',rows);
  evidence.firebaseLiveAssetMimes=await verifyAssetMime('https://ays-orbit-360-lab.web.app');
  evidence.appLiveAssetMimes=await verifyAssetMime('https://app.aysseguros.com');
  const current=await getLatestRelease('live');
  need(current===previewVersion,'I66_PWA_LIVE_VERSION_NOT_PREVIEW_EXACT');
  evidence.liveAfterVersion=current;
  evidence.status='LIVE_PWA_HOSTING_SAME_ARTIFACT_BYTE_READBACK_PASS_INSTALL_UAT_PENDING';
  evidence.rollback='NOT_REQUIRED';
}catch(error){
  const message=String(error&&error.message||error);
  evidence.blocker=/^I66_[A-Z0-9_]+$/.test(message)?message:'I66_PWA_RELEASE_EXECUTION_FAILED';
  if(promoting&&oldVersion){
    try{
      cloneToLive(oldVersion);
      await Promise.all([
        awaitMarker('https://ays-orbit-360-lab.web.app',expectedOld,expectedOldBuild,15),
        awaitMarker('https://app.aysseguros.com',expectedOld,expectedOldBuild,15)
      ]);
      evidence.rollback='OLD_HOSTING_VERSION_RESTORED_READBACK_PASS';
    }catch{evidence.rollback='CRITICAL_UNCONFIRMED_HOSTING_ROLLBACK';}
  }
  process.exitCode=1;
}finally{
  fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  console.log('I66_PWA_LIVE_STATUS='+evidence.status);
  console.log('I66_PWA_LIVE_SOURCE='+evidence.sourceSha);
  console.log('I66_PWA_LIVE_BUILD='+evidence.buildId);
  console.log('I66_PWA_LIVE_BEFORE_VERSION='+evidence.liveBeforeVersion);
  console.log('I66_PWA_LIVE_AFTER_VERSION='+evidence.liveAfterVersion);
  console.log('I66_PWA_PREVIEW_FILES='+evidence.previewReadbackCount);
  console.log('I66_PWA_FIREBASE_FILES='+evidence.firebaseLiveReadbackCount);
  console.log('I66_PWA_APP_FILES='+evidence.appDomainReadbackCount);
  console.log('I66_PWA_ROLLBACK='+evidence.rollback);
  if(evidence.blocker)console.log('I66_PWA_BLOCKER='+safe(evidence.blocker));
}
