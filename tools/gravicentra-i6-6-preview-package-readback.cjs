'use strict';
// Read-only verification within the existing immutable-package build job.
// This deadline concerns Hosting deployment visibility, never app startup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const POLICY=Object.freeze({readinessMs:240000,pollMs:4000,requestTimeoutMs:15000,
  fileAttempts:4,fileRetryMs:2000,expectedFiles:224});
const MARKER='__recovery__/build.json';
const LIVE=Object.freeze([
  {label:'FIREBASE_LIVE',origin:'https://ays-orbit-360-lab.web.app',beforeFile:'gi-i66-live-before.sha'},
  {label:'STAFF_LIVE',origin:'https://app.aysseguros.com',beforeFile:'gi-i66-staff-before.sha'}
]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
class ReadbackError extends Error { constructor(code){super(code);this.code=code;} }
const need=(ok,code)=>{if(!ok)throw new ReadbackError(code);};
const safeSource=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)?x:null;
const safeBuild=x=>typeof x==='string'&&/^gi-i66-[a-f0-9]{12}-[a-f0-9]{12}$/.test(x)?x:null;
const safeDigest=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x)?x:null;
function markerIdentity(bytes){
  try{const x=JSON.parse(bytes.toString('utf8'));return {sourceSha:safeSource(x?.sourceSha),buildId:safeBuild(x?.buildId)};}
  catch{return {sourceSha:null,buildId:null};}
}
function networkReason(error){
  const allowed=new Set(['ECONNRESET','ETIMEDOUT','EAI_AGAIN','ENOTFOUND','ECONNREFUSED',
    'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET']);
  for(const code of [error?.code,error?.cause?.code])if(allowed.has(code))return code;
  return ['AbortError','TimeoutError'].includes(error?.name)?'REQUEST_TIMEOUT':'NETWORK_ERROR';
}
function saveReport(file,report){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=file+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  fs.renameSync(temp,file);
}
function loadPackage(options,readFile){
  need(safeSource(options.sourceSha),'I66_READBACK_SOURCE_REQUIRED');
  need(Number.isSafeInteger(Number(options.artifactId))&&Number(options.artifactId)>0,'I66_READBACK_ARTIFACT_REQUIRED');
  need(safeDigest(options.artifactDigest),'I66_READBACK_DIGEST_REQUIRED');
  need(typeof options.previewChannel==='string'&&/^gi-i66-rc-[0-9]+$/.test(options.previewChannel),'I66_READBACK_CHANNEL_REQUIRED');
  const origin=String(options.previewUrl||'');
  need(new RegExp('^https://ays-orbit-360-lab--'+options.previewChannel+'-[a-z0-9]+\\.web\\.app$').test(origin),
    'I66_READBACK_PREVIEW_ORIGIN_INVALID');
  need(typeof options.packageRoot==='string'&&options.packageRoot&&typeof options.fingerprintRoot==='string'&&options.fingerprintRoot,
    'I66_READBACK_LOCAL_PACKAGE_REQUIRED');
  const site=path.join(options.packageRoot,'bundle','site');
  const raw=readFile(path.join(options.packageRoot,'evidence','site-manifest.sha256'));
  const rows=raw.toString('utf8').trimEnd().split('\n').map(line=>{
    const match=/^([a-f0-9]{64})  ([A-Za-z0-9_.\/-]+)$/.exec(line);
    need(match&&!match[2].startsWith('/')&&!match[2].split('/').some(part=>!part||part==='.'||part==='..'),
      'I66_READBACK_MANIFEST_ROW_INVALID');
    const bytes=readFile(path.join(site,match[2]));
    need(Buffer.isBuffer(bytes)&&sha(bytes)===match[1],'I66_READBACK_LOCAL_BYTES_DRIFT');
    return {path:match[2],sha256:match[1],bytes};
  });
  need(rows.length===POLICY.expectedFiles&&new Set(rows.map(row=>row.path)).size===rows.length,
    'I66_READBACK_MANIFEST_FILE_COUNT_OR_DUPLICATE');
  const marker=rows.find(row=>row.path===MARKER);
  need(marker&&rows.some(row=>row.path==='index.html'),'I66_READBACK_REQUIRED_FILES_MISSING');
  let meta;try{meta=JSON.parse(marker.bytes.toString('utf8'));}catch{throw new ReadbackError('I66_READBACK_LOCAL_MARKER_INVALID');}
  need(meta?.product==='Gravicentra Insurance'&&meta.gate==='I6.6'&&meta.sourceSha===options.sourceSha&&
    safeBuild(meta.buildId)&&meta.buildId.startsWith('gi-i66-'+options.sourceSha.slice(0,12)+'-'),
    'I66_READBACK_LOCAL_MARKER_BINDING_DRIFT');
  const live=LIVE.map(row=>{
    const match=/^([a-f0-9]{64})  -\n?$/.exec(readFile(path.join(options.fingerprintRoot,row.beforeFile)).toString('utf8'));
    need(match,'I66_READBACK_LIVE_PREDEPLOY_FINGERPRINT_REQUIRED');
    return {...row,beforeSha256:match[1]};
  });
  return {origin,rows,marker,meta,live,manifestSha256:sha(raw)};
}
async function runReadback(options,deps={}){
  const now=deps.now||(()=>performance.now()),sleep=deps.sleep||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const fetcher=deps.fetch||globalThis.fetch,setTimer=deps.setTimer||setTimeout,clearTimer=deps.clearTimer||clearTimeout;
  const readFile=deps.readFile||fs.readFileSync,writeReport=deps.writeReport||((report)=>saveReport(options.reportPath,report));
  const readinessMs=options.readinessMs??POLICY.readinessMs,requestTimeoutMs=options.requestTimeoutMs??POLICY.requestTimeoutMs;
  const started=now();
  const report={schema:'GI_I66_PREVIEW_PACKAGE_READBACK_V1',status:'IN_PROGRESS',stage:'PREFLIGHT',
    sourceSha:safeSource(options.sourceSha),artifactId:Number.isSafeInteger(Number(options.artifactId))?Number(options.artifactId):null,
    artifactDigest:safeDigest(options.artifactDigest),readinessDeadlineMs:readinessMs,
    expectedFiles:POLICY.expectedFiles,verifiedFiles:0,readinessAttempts:[],files:[],live:[],
    noDeploymentPerformed:true,noArtifactMutation:true,appStartupAcceptance:false};
  let sequence=0,reportFailure=false;
  const nonce=crypto.randomBytes(16).toString('hex');
  const persist=async()=>{
    report.elapsedMs=Math.max(0,Math.round(now()-started));
    try{await writeReport(report);}
    catch{reportFailure=true;throw new ReadbackError('I66_READBACK_DIAGNOSTIC_WRITE_FAILED');}
  };
  const request=async(origin,file,timeoutMs)=>{
    const url=new URL(origin+'/'+file.split('/').map(encodeURIComponent).join('/'));
    // Random, request-specific public cache key; never derived from credentials
    // or user data and never used to change the package being verified.
    url.searchParams.set('__gi_i66_rb',nonce+'.'+(++sequence));
    const controller=new AbortController();let timer,timedOut=false,receivedStatus=null;
    const timeout=new Promise((_,reject)=>{timer=setTimer(()=>{
      timedOut=true;controller.abort();reject(new Error('timeout'));
    },timeoutMs);});
    try{
      return await Promise.race([(async()=>{
        const response=await fetcher(url.href,{method:'GET',cache:'no-store',redirect:'manual',credentials:'omit',
          headers:{'cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'},signal:controller.signal});
        need(Number.isInteger(response?.status)&&response.status>=100&&response.status<=599,'I66_READBACK_HTTP_RESPONSE_INVALID');
        receivedStatus=response.status;
        need(!response.redirected&&(!response.url||response.url===url.href),'I66_READBACK_HTTP_REDIRECT_FORBIDDEN');
        if(response.status!==200)return {status:response.status};
        return {status:200,bytes:Buffer.from(await response.arrayBuffer())};
      })(),timeout]);
    }catch(error){
      if(error instanceof ReadbackError)throw error;
      return {status:null,...(receivedStatus===null?{}:{receivedHeadersStatus:receivedStatus}),
        network:timedOut?'REQUEST_TIMEOUT':networkReason(error)};
    }finally{clearTimer(timer);controller.abort();}
  };
  const transient=r=>r.network||r.status===404||(r.status>=500&&r.status<=599);
  const httpGuard=r=>{
    if(r.status===401||r.status===403)throw new ReadbackError('I66_READBACK_HTTP_AUTHORIZATION_DENIED');
    if(r.status!==200&&!transient(r))throw new ReadbackError('I66_READBACK_HTTP_TERMINAL');
  };
  const observation=r=>({status:r.status,...(r.network?{network:r.network}:{}),
    ...(r.receivedHeadersStatus===undefined?{}:{receivedHeadersStatus:r.receivedHeadersStatus}),
    ...(r.bytes?{bytes:r.bytes.length,sha256:sha(r.bytes)}:{})});
  const exactFile=async(origin,row,target)=>{
    try{
      for(let attempt=1;attempt<=POLICY.fileAttempts;attempt++){
        const response=await request(origin,row.path,requestTimeoutMs);
        target.attempts.push({attempt,...observation(response)});
        await persist();httpGuard(response);
        if(response.status===200){
          need(response.bytes.equals(row.bytes),'I66_READBACK_PREVIEW_FILE_BYTES_MISMATCH');
          target.status='PASS';report.verifiedFiles++;await persist();return;
        }
        if(attempt<POLICY.fileAttempts)await sleep(POLICY.fileRetryMs);
      }
      throw new ReadbackError('I66_READBACK_PREVIEW_FILE_UNAVAILABLE');
    }catch(error){
      target.status='HOLD';target.failure=error instanceof ReadbackError?error.code:'I66_READBACK_INTERNAL_FAILURE';
      throw error;
    }
  };
  try{
    await persist();
    need(Number.isSafeInteger(readinessMs)&&readinessMs>0&&readinessMs<=POLICY.readinessMs&&
      Number.isSafeInteger(requestTimeoutMs)&&requestTimeoutMs>0&&requestTimeoutMs<=POLICY.requestTimeoutMs,
      'I66_READBACK_DEADLINE_POLICY_INVALID');
    const pkg=loadPackage(options,readFile);
    Object.assign(report,{previewUrl:pkg.origin,previewChannel:options.previewChannel,buildId:pkg.meta.buildId,
      manifestSha256:pkg.manifestSha256,expectedMarkerSha256:pkg.marker.sha256});
    report.live=pkg.live.map(row=>({label:row.label,beforeSha256:row.beforeSha256,status:'NOT_CHECKED',attempts:[]}));
    report.stage='HOSTING_MARKER_READINESS';await persist();
    const readyStart=now(),deadline=readyStart+readinessMs;let ready=false;
    while(now()<deadline){
      const at=now(),response=await request(pkg.origin,MARKER,Math.min(requestTimeoutMs,deadline-at));
      const exact=response.status===200&&response.bytes.equals(pkg.marker.bytes);
      const row={attempt:report.readinessAttempts.length+1,elapsedMs:Math.max(0,Math.round(now()-readyStart)),
        ...observation(response),exactBytes:exact,
        ...(response.bytes?{observedMarker:markerIdentity(response.bytes)}:{})};
      report.readinessAttempts.push(row);await persist();httpGuard(response);
      // Even an exact response arriving beyond the deployment deadline cannot
      // turn this attempt into a successful gate.
      if(exact&&now()<=deadline){ready=true;break;}
      const remaining=deadline-now();if(remaining<=0)break;
      await sleep(Math.min(POLICY.pollMs,remaining));
    }
    report.markerReadinessElapsedMs=Math.max(0,Math.round(now()-readyStart));
    need(ready,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
    report.stage='PREVIEW_MANIFEST_BYTES';await persist();
    for(const row of pkg.rows){
      const target={path:row.path,expectedSha256:row.sha256,status:'IN_PROGRESS',attempts:[]};
      report.files.push(target);await exactFile(pkg.origin,row,target);
    }
    need(report.verifiedFiles===POLICY.expectedFiles,'I66_READBACK_PREVIEW_INCOMPLETE');
    report.stage='LIVE_PREDEPLOY_FINGERPRINTS';await persist();
    let liveFailure;
    // Always inspect both unchanged LIVE origins, including when the first one
    // drifts. This is a readback only, with no repair, clone or redeployment.
    for(let i=0;i<pkg.live.length;i++){
      const row=pkg.live[i],target=report.live[i];
      try{
        for(let attempt=1;attempt<=POLICY.fileAttempts;attempt++){
          const response=await request(row.origin,'',requestTimeoutMs);
          target.attempts.push({attempt,...observation(response)});await persist();httpGuard(response);
          if(response.status===200){
            target.afterSha256=sha(response.bytes);
            need(target.afterSha256===row.beforeSha256,'I66_READBACK_LIVE_FINGERPRINT_DRIFT');
            target.status='PASS';break;
          }
          if(attempt<POLICY.fileAttempts)await sleep(POLICY.fileRetryMs);
        }
        need(target.status==='PASS','I66_READBACK_LIVE_UNAVAILABLE');
      }catch(error){target.status='HOLD';target.failure=error instanceof ReadbackError?error.code:'I66_READBACK_INTERNAL_FAILURE';liveFailure=liveFailure||error;}
      await persist();
    }
    if(liveFailure)throw liveFailure;
    report.status='PASS';report.stage='COMPLETE';await persist();return report;
  }catch(error){
    report.status='HOLD';report.failure={code:error instanceof ReadbackError?error.code:'I66_READBACK_INTERNAL_FAILURE'};
    try{await persist();}catch{report.failure={code:'I66_READBACK_DIAGNOSTIC_WRITE_FAILED'};}
    const failure=new ReadbackError(reportFailure?'I66_READBACK_DIAGNOSTIC_WRITE_FAILED':report.failure.code);
    failure.report=report;throw failure;
  }
}
function optionsFromEnvironment(env){
  const temp=env.RUNNER_TEMP||'';
  // upload-artifact emits a bare SHA-256; retained release records use the
  // sha256: form. Admit only these two exact representations, without trimming
  // or accepting any other digest spelling.
  const rawDigest=env.ARTIFACT_DIGEST;
  const artifactDigest=typeof rawDigest==='string'&&/^[a-f0-9]{64}$/.test(rawDigest)?'sha256:'+rawDigest:rawDigest;
  return {packageRoot:path.join(temp,'gi-i66-package'),fingerprintRoot:temp,
    reportPath:path.join(temp,'gi-i66-preview-package-readback.json'),previewUrl:env.PREVIEW_URL,
    previewChannel:env.PREVIEW_CHANNEL,sourceSha:env.SOURCE_SHA,artifactId:env.ARTIFACT_ID,artifactDigest};
}
async function main(env=process.env){
  const options=optionsFromEnvironment(env);
  try{
    const report=await runReadback(options);
    console.log('I66_PREVIEW_PACKAGE_EXACT_READBACK_PASS files='+report.verifiedFiles+' liveOrigins=2 source='+report.sourceSha);
  }catch(error){
    console.error('I66_PREVIEW_PACKAGE_READBACK_HOLD '+(error instanceof ReadbackError?error.code:'I66_READBACK_INTERNAL_FAILURE'));
    process.exitCode=1;
  }
}
module.exports={POLICY,MARKER,LIVE,ReadbackError,loadPackage,runReadback,optionsFromEnvironment,main};
if(require.main===module)main();
