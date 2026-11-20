import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';

const SITE='ays-orbit-360-lab',PROJECT='ays-orbit-360-lab';
const REQUEST=process.env.I66_APPROVED_RELEASE_REQUEST||'artifacts/orbit360-recovery/release-control/I6_6_EXACT_HOSTING_LIVE_PROMOTION_REQUEST_20261110.json';
const rawRequest=JSON.parse(fs.readFileSync(REQUEST,'utf8'));
const importReview=rawRequest.schema==='GRAVICENTRA_I6_6_DOCUMENT_IMPORT_SOURCE_EXACT_LIVE_V1';
const paymentDirect=rawRequest.schema==='GRAVICENTRA_I6_6_DIRECT_PAYMENT_OPTIONAL_DOCUMENT_EXACT_LIVE_V1';
const issuedRenewal=importReview||paymentDirect||rawRequest.schema==='GRAVICENTRA_I6_6_ISSUED_RENEWAL_PAYMENT_EXACT_LIVE_V1';
const signedClientSuccessor=issuedRenewal||rawRequest.schema==='GRAVICENTRA_I6_6_CLIENTE360_ADVISOR_EXACT_LIVE_V1';
// The existing I6.6 rollback/clone owner consumes the signed successor directly.
// Internal field aliases let the legacy verified byte-for-byte transport remain
// unchanged. The actual approval is always revalidated against rawRequest.
const request=signedClientSuccessor?Object.freeze({...rawRequest,
  expectedOldSourceSha:rawRequest.expectedPriorLiveSourceSha,
  expectedOldBuildId:rawRequest.expectedPriorLiveBuildId,
  expectedOldHostingVersion:rawRequest.expectedPriorLiveHostingVersion,
  artifactZipSha256:String(rawRequest.artifactDigest||'').replace(/^sha256:/,''),
  qaRunId:rawRequest.buildRunId,
  historicalGateClosed:'B4-007',activeGate:'I6.6',
  businessDataWritesAuthorized:false,mustRollbackOnMismatch:true,
  noBackendDeploy:true,noFirestoreAuthOrDataWrites:true
}):rawRequest;
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
  artifactId:request.artifactId,previewChannel:request.previewChannel,requestSchema:rawRequest.schema,status:'HOLD',liveBeforeVersion:'',previewVersion:'',liveAfterVersion:'',
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
  if(signedClientSuccessor){
    need(rawRequest.gate==='I6.6'&&rawRequest.status==='OWNER_AUTHORIZED_TARGETED_LIVE_PENDING_PROTECTED_RUN'&&rawRequest.approvedByDirection===true,'I66_CLIENTE360_OWNER_APPROVAL_MISSING');
    for(const k of ['sameImmutableArtifactPreviewAndLive','exactAllFilesDualOriginReadback','requireRoleSignedLiveSyntheticWriteReloadAndCleanup','requireLiveEditAndNewClientGermanPriscilaRealRoleReadback','requireExistingOpsAndPaymentLiveSyntheticUat','rollbackLiveBackendTrafficAndHostingOnAnyFailure','noFirestoreRulesAuthOrOtherBackendFunctions','noRealFinancialDataBackfillOrPaymentWrites','rollbackOnAnyDivergentRuntime'])
      need(rawRequest[k]===true,'I66_CLIENTE360_RELEASE_GUARD_MISSING_'+k);
    need(rawRequest.doNotClaimFullPlatformProductionAccepted===true&&rawRequest.doNotClaimFocalCaseEdsonDataUpdatedWithoutWriteReadback===true,'I66_CLIENTE360_SCOPE_OVERCLAIM');
    need(rawRequest.signedPreviewScope?.realCarlosOperativoLogin===true&&rawRequest.signedPreviewScope?.germanAndPriscilaActualEditNewClientPolicyOps===true&&rawRequest.signedPreviewScope?.signedCarlosAndDirectionOpsLeadsSyntheticCreateUpdateResolveReloadRestore===true&&rawRequest.signedPreviewScope?.signedBothRolePaymentReceiptCobroPortfolioSyntheticWriteReloadRestore===true&&rawRequest.signedPreviewScope?.realCustomerWrites===0,'I66_CLIENTE360_SIGNED_UAT_SCOPE_INVALID');
    if(issuedRenewal){
      const approvedBlob=execFileSync('git',['hash-object',REQUEST],{encoding:'utf8'}).trim();
      need(approvedBlob===(paymentDirect?'d9cb65965825f88757332b090d471e6819390023':importReview?'56e868fb4ccff56ed1f72a6605107190635b5c0f':'4956a5cc5d2109b60adb4e02e6602bf737dba23c')&&rawRequest.backendDeploy===false,'I66_ISSUED_RENEWAL_APPROVAL_RECORD_DRIFT');
      need(rawRequest.signedPreviewScope.renewalNumberInsurerSuggestedTermAndManualOverride===true&&rawRequest.requireHostedPaymentFeedbackTests===true,'I66_ISSUED_RENEWAL_SIGNED_QA_MISSING');
    }else{
      need(rawRequest.sourceSha==='7791f34cf2574d1915701ee22cf3993e8de79249'&&rawRequest.buildRunId===44674734296&&rawRequest.artifactId===14601447337&&rawRequest.signedCarlosPaulaPreviewUatRunId===44675079983,'I66_CLIENTE360_SIGNED_PROOF_IDENTITY_DRIFT');
      need(rawRequest.expectedPriorLiveSourceSha==='9c689bd283793a635f6a94197351b3fe0ecf2da9'&&rawRequest.expectedPriorLiveHostingVersion==='sites/ays-orbit-360-lab/versions/29889fb4208832e6','I66_CLIENTE360_LIVE_ROLLBACK_BACKUP_UNPINNED');
    }
    need(rawRequest.previewChannel==='gi-i66-rc-'+rawRequest.buildRunId&&/^sha256:[0-9a-f]{64}$/.test(rawRequest.artifactDigest||''),'I66_CLIENTE360_ARTIFACT_OR_CHANNEL_INVALID');
    need(new RegExp('^https://ays-orbit-360-lab--'+rawRequest.previewChannel+'-[a-z0-9]+\\.web\\.app$').test(rawRequest.previewUrl||''),'I66_CLIENTE360_PREVIEW_ORIGIN_NOT_EXACT');
    need(rawRequest.buildId==='gi-i66-'+rawRequest.sourceSha.slice(0,12)+'-57f234755dc1'&&request.artifactZipSha256.length===64,'I66_CLIENTE360_BUILD_SOURCE_DRIFT');
    return;
  }
  need(request.schema==='I6_6_EXACT_HOSTING_LIVE_PROMOTION_V1'&&request.status==='LIVE_HOSTING_CLONE_APPROVED_AFTER_TARGETED_PREVIEW_QA_PASS','I66_LIVE_PROMOTION_NOT_APPROVED');
  need(request.approvedByDirection===true&&request.historicalGateClosed==='B4-007'&&request.noBackendDeploy===true&&request.noFirestoreAuthOrDataWrites===true,'I66_PROMOTION_SCOPE_INVALID');
  need(request.activeGate==='I6.6'&&Number.isSafeInteger(request.qaRunId)&&request.qaRunId>0&&request.buildRunId===request.qaRunId&&Number.isSafeInteger(request.artifactId)&&request.artifactId>0,'I66_APPROVAL_PROOFS_INVALID');
  const standardChannel='gi-i66-rc-'+request.buildRunId;
  const controlledQuotaReuse=request.reusedPreviewChannelAfterQuota429===true&&
    request.sourceSha==='8a0e904500cbb3c961d83f16517caab69df88a2b'&&
    request.buildRunId===43448848169&&
    request.previewChannel==='gi-i66-rc-42868854629'&&
    request.expectedOldHostingVersion==='sites/ays-orbit-360-lab/versions/dae5d5235978cefe';
  need(/^[0-9a-f]{40}$/.test(request.sourceSha||'')&&
    (request.previewChannel===standardChannel||controlledQuotaReuse),'I66_APPROVED_SOURCE_OR_CHANNEL_DRIFT');
  need(request.buildId==='gi-i66-'+request.sourceSha.slice(0,12)+'-57f234755dc1','I66_APPROVED_BUILD_ID_DRIFT');
  need(new RegExp('^https://ays-orbit-360-lab--'+request.previewChannel+'-[a-z0-9]+\\.web\\.app$').test(request.previewUrl||''),'I66_PREVIEW_ORIGIN_DRIFT');
  need(/^[0-9a-f]{64}$/.test(request.artifactZipSha256||''),'I66_ARTIFACT_DIGEST_INVALID');
  need(/^[0-9a-f]{40}$/.test(request.expectedOldSourceSha||'')&&request.expectedOldSourceSha!==request.sourceSha&&
    request.expectedOldBuildId==='gi-i66-'+request.expectedOldSourceSha.slice(0,12)+'-57f234755dc1','I66_HISTORICAL_LIVE_BASE_DRIFT');
  need(request.mustRollbackOnMismatch===true&&request.businessDataWritesAuthorized===false,'I66_ROLLBACK_AND_DATA_WRITE_GUARD_MISSING');
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
  if(request.expectedOldHostingVersion)need(old===request.expectedOldHostingVersion,'I66_LIVE_HOSTING_VERSION_CHANGED_BEFORE_CLONE');
  oldVersion=old;evidence.liveBeforeVersion=old;evidence.previewVersion=previewVersion;
  need(old!==previewVersion,'I66_SOURCE_AND_TARGET_ALREADY_EQUAL');
  if ((importReview || paymentDirect) && rawRequest.requireRestoredLivePreflight === true) {
    // The last promotion stopped during financial startup. Exercise the restored
    // release first, while both domains still serve the verified previous version.
    const paymentTest = 'tools/gravicentra-i6-6-carlos-paula-live-synthetic-payment-renewability-uat.cjs';
    try {
      execFileSync(process.execPath, [paymentTest], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          I66_LIVE_ORIGIN: 'https://app.aysseguros.com',
          I66_APPROVED_LIVE_SOURCE_SHA: request.expectedOldSourceSha
        },
        stdio: 'inherit',
        timeout: 300000
      });
    } catch {
      throw Error('I66_RESTORED_LIVE_FINANCIAL_PREFLIGHT_FAILED');
    }
    evidence.restoredLiveFinancialPreflightPassed = true;
  }
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
  if(signedClientSuccessor){
    // The only acceptable post-deploy smoke is the signed Carlos session against
    // the actual LIVE selectors (not the shadowed form), with no business writes.
    // A smoke failure is caught below and reverses the Hosting clone.
    try {
      execFileSync(process.execPath,['tools/gravicentra-i6-6-carlos-german-assignment-roster-readonly.cjs'],
        {cwd:process.cwd(),env:{...process.env,I66_VERIFY_CORADO_QUEUE:'1',I66_PROVE_LIVE_NEW_CLIENT:request.sourceSha},
         stdio:['ignore','pipe','pipe'],timeout:180000});
    } catch (error) {
      // Publish the assertion code only. Role data and browser output remain private.
      const reason=String(error.stderr||'').match(/I66_CARLOS_GERMAN_SIGNED_HOLD ([A-Z][A-Z0-9_]{3,140})(?:\s|$)/);
      throw Error('I66_LIVE_ROSTER_'+(reason?reason[1]:'DEPENDENCY_OR_BROWSER_FAILED'));
    }
    evidence.signedCarlosLiveEditNewPolicyOpsReadOnly=true;
    evidence.signedCarlosLiveCoradoOpsZeroLeadsOne=true;
    need(rawRequest.requireClientEditLiveSyntheticWriteReloadCleanup===true,'I66_CLIENT_EDIT_LIVE_QA_REQUIRED');
    const env={...process.env,I66_SIGNED_CLIENT_EDIT_ORIGIN:'https://app.aysseguros.com',
      I66_SIGNED_CLIENT_EDIT_SOURCE:request.sourceSha,I66_LIVE_ORIGIN:'https://app.aysseguros.com',
      I66_APPROVED_LIVE_SOURCE_SHA:request.sourceSha};
    for(const [key,script] of [
      ['clientEdit','gravicentra-i6-6-carlos-client-edit-signed-synthetic-uat.cjs'],
      ['opsLeads','gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat.cjs'],
      ['payments','gravicentra-i6-6-carlos-paula-live-synthetic-payment-renewability-uat.cjs']
    ]){
      execFileSync(process.execPath,['tools/'+script],{cwd:process.cwd(),env,stdio:'inherit',timeout:300000});
      evidence[key+'SignedLiveSyntheticPass']=true;
      if(key==='clientEdit'&&importReview)evidence.importSourceReviewBothSignedRolesLive=true;
      if(key==='payments'&&paymentDirect)evidence.paymentOptionalDocumentReleaseSignedLiveSyntheticPass=true;
    }
  }
  evidence.status=signedClientSuccessor?'LIVE_HOSTING_AND_CARLOS_ROSTER_SAME_ARTIFACT_PASS_FULL_I66_HOLD':'LIVE_HOSTING_SAME_ARTIFACT_READBACK_PASS_NOT_FULL_UAT';
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
