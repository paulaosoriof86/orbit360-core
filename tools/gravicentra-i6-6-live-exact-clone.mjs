import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';

const SITE='ays-orbit-360-lab',PROJECT='ays-orbit-360-lab';
const REQUEST='artifacts/orbit360-recovery/release-control/I6_6_EXACT_HOSTING_LIVE_PROMOTION_REQUEST_20261110.json';
const request=JSON.parse(fs.readFileSync(REQUEST,'utf8'));
const packageRoot=process.env.I66_PACKAGE_ROOT||'';
const cli=process.env.FIREBASE_CLI_BIN||'';
const cred=process.env.GOOGLE_APPLICATION_CREDENTIALS||'';
const out=path.join(process.env.RUNNER_TEMP||process.cwd(),'i66-live-exact-clone-readback.json');
const need=(v,c)=>{if(!v)throw Error(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const safe=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120);
const ver=v=>/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(String(v||''));
const evidence={schema:'I6_6_LIVE_EXACT_HOSTING_CLONE_READBACK_V1',gate:'I6.6',sourceSha:request.sourceSha,buildId:request.buildId,
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
function validateRequest(){
  need(request.schema==='I6_6_EXACT_HOSTING_LIVE_PROMOTION_V1'&&request.status==='LIVE_HOSTING_CLONE_APPROVED_AFTER_TARGETED_PREVIEW_QA_PASS','I66_LIVE_PROMOTION_NOT_APPROVED');
  need(request.approvedByDirection===true&&request.historicalGateClosed==='B4-007'&&request.noBackendDeploy===true&&request.noFirestoreAuthOrDataWrites===true,'I66_PROMOTION_SCOPE_INVALID');
  need(request.qaRunId===42962064341&&request.buildRunId===42962064341&&request.artifactId===13829367381,'I66_APPROVAL_PROOFS_INVALID');
  need(request.sourceSha==='4546970cbdeedc6296852b6f3624f7d56b8e02b6'&&request.previewChannel==='gi-i66-rc-42962064341','I66_APPROVED_SOURCE_OR_CHANNEL_DRIFT');
  need(request.buildId==='gi-i66-4546970cbdee-57f234755dc1','I66_APPROVED_BUILD_ID_DRIFT');
  need(request.previewUrl==='https://ays-orbit-360-lab--gi-i66-rc-42962064341-7c92qvbb.web.app','I66_PREVIEW_ORIGIN_DRIFT');
  need(request.expectedOldSourceSha==='d810b4d20569a18e90f4387928cf8816da88aa6a'&&request.expectedOldBuildId==='gi-i66-d810b4d20569-57f234755dc1','I66_HISTORICAL_LIVE_BASE_DRIFT');
}
try{
  validateRequest();
  need(packageRoot&&cli&&cred&&fs.existsSync(path.join(packageRoot,'bundle/site/__recovery__/build.json')),'I66_IMMUTABLE_PACKAGE_NOT_MOUNTED');
  const pkg=JSON.parse(fs.readFileSync(path.join(packageRoot,'bundle/site/__recovery__/build.json'),'utf8'));
  need(pkg.gate==='I6.6'&&pkg.sourceSha===request.sourceSha&&pkg.buildId===request.buildId,'I66_IMMUTABLE_PACKAGE_IDENTITY_DRIFT');
  const rows=expectedRows();
  evidence.previewReadbackCount=await verifyOrigin(request.previewUrl,rows);
  authClient=await new GoogleAuth({keyFile:cred,scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const [firebaseBefore,customBefore,old,previewVersion]=await Promise.all([
    marker('https://ays-orbit-360-lab.web.app'),marker('https://app.aysseguros.com'),getLatestRelease('live'),getLatestRelease(request.previewChannel)
  ]);
  need(firebaseBefore.sourceSha===request.expectedOldSourceSha&&customBefore.sourceSha===request.expectedOldSourceSha&&
    firebaseBefore.buildId===request.expectedOldBuildId&&customBefore.buildId===request.expectedOldBuildId,
    'I66_LIVE_ORIGIN_BASE_CHANGED_BEFORE_CLONE');
  oldVersion=old;evidence.liveBeforeVersion=old;evidence.previewVersion=previewVersion;
  need(old!==previewVersion,'I66_SOURCE_AND_TARGET_ALREADY_EQUAL');
  const [beforeAgain,oldAgain]=await Promise.all([marker('https://ays-orbit-360-lab.web.app'),getLatestRelease('live')]);
  need(oldAgain===old,'I66_LIVE_RELEASE_VERSION_CHANGED_DURING_PREFLIGHT');
  need(beforeAgain.sourceSha===request.expectedOldSourceSha&&beforeAgain.buildId===request.expectedOldBuildId,
    'I66_LIVE_SOURCE_CHANGED_DURING_PREFLIGHT');
  // Clone the pre-certified, uniquely version-pinned Hosting release. Never rebuild.
  promoting=true;
  cloneToLive(previewVersion);
  await Promise.all([
    awaitMarker('https://ays-orbit-360-lab.web.app',request.sourceSha,request.buildId,15),
    awaitMarker('https://app.aysseguros.com',request.sourceSha,request.buildId,15)
  ]);
  evidence.firebaseLiveReadbackCount=await verifyOrigin('https://ays-orbit-360-lab.web.app',rows);
  evidence.appDomainReadbackCount=await verifyOrigin('https://app.aysseguros.com',rows);
  const newest=await getLatestRelease('live');
  need(newest===previewVersion,'I66_LIVE_HOSTING_VERSION_NOT_CLONED_EXACTLY');
  evidence.liveAfterVersion=newest;
  evidence.status='LIVE_HOSTING_SAME_ARTIFACT_READBACK_PASS_NOT_FULL_UAT';
}catch(err){
  const code=String(err?.message||err||'');
  evidence.blocker=/^I66_[A-Z0-9_]+$/.test(code)?code:'I66_RELEASE_EXECUTION_FAILED';
  if(promoting&&oldVersion){
    try{
      cloneToLive(oldVersion);
      await Promise.all([
        awaitMarker('https://ays-orbit-360-lab.web.app',request.expectedOldSourceSha,request.expectedOldBuildId,15),
        awaitMarker('https://app.aysseguros.com',request.expectedOldSourceSha,request.expectedOldBuildId,15)
      ]);
      evidence.rollback='CONFIRMED_OLD_EXACT_HOSTING_VERSION_RESTORED';
    }catch{evidence.rollback='CRITICAL_UNCONFIRMED_ROLLBACK';}
  }
  process.exitCode=1;
}finally{
  fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  console.log('I66_LIVE_HOSTING_STATUS='+evidence.status);
  console.log('I66_LIVE_HOSTING_SOURCE='+evidence.sourceSha);
  console.log('I66_LIVE_PREVIEW_READBACK_FILES='+evidence.previewReadbackCount);
  console.log('I66_LIVE_FIREBASE_READBACK_FILES='+evidence.firebaseLiveReadbackCount);
  console.log('I66_LIVE_APP_READBACK_FILES='+evidence.appDomainReadbackCount);
  console.log('I66_LIVE_BACKEND_OR_DATA_WRITES='+evidence.backendDeployments+':'+evidence.dataWrites);
  console.log('I66_LIVE_ROLLBACK='+evidence.rollback);
  if(evidence.blocker)console.log('I66_LIVE_BLOCKER='+safe(evidence.blocker));
}
