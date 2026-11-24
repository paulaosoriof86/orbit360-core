'use strict';
// One manifest-bound entry for the A13 successor; all owner tests remain offline.
require('./gravicentra-i66-make-lead-ingress.test.cjs');
require('./gravicentra-i66-make-lead-runtime-access.test.cjs');
require('./gravicentra-i66-make-lead-ingress-scenario.test.cjs');
require('./gravicentra-i66-make-lead-protected-executor.test.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const scope=require('./gravicentra-i66-make-release-scope.cjs');
const {STARTUP_PATHS,STARTUP_RECEIPT_PATH,STARTUP_TEST_PATH}=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
function admissionFixture({startup=false}={}){
 const current={sourceSha:'1'.repeat(40),buildId:'gi-i66-111111111111-proof',artifactId:10,artifactDigest:'sha256:'+'1'.repeat(64),
  hostingVersion:'sites/ays-orbit-360-lab/versions/current',receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_RECEIPT.json',receiptGitBlobSha:'4'.repeat(40)};
 const request={version:18,mode:scope.REQUEST_MODE,sourceQaHead:'2'.repeat(40),manifestBlob:'3'.repeat(40),
  previousReceiptBlob:current.receiptGitBlobSha,backendPreviewRequired:true,backendLiveDeployAllowed:false,realDataWritesAllowed:false,
  fiveFunctionExactPreviewRequired:true,scopeContractBlob:scope.CONTRACT_BLOB,productPaths:[...scope.PRODUCT_PATHS],backendPaths:[...scope.SOURCE_PATHS],
  balanceCorrection:structuredClone(scope.BALANCE_CORRECTION),
  backendPathBlobs:Object.fromEntries(scope.SOURCE_PATHS.map(p=>[p,'b'.repeat(40)])),sourceQaRunId:1,guardRunId:2};
 const transport={frontendPreviewRequest:request,livePromotionAuthorized:false,noHostingPromotion:true,forbidBackendFunctionDeploy:true,
  forbidFirestoreRulesDataAuthWrites:true,currentPhysicalHostingRelease:{...current,liveHostingVersion:current.hostingVersion}};
 const cp={gateState:{gates:{I6:{activeSubgate:'I6.6'}}},currentExecutionDecisionPointer:'i66FrontendReleaseHead',i66FrontendReleaseHead:current};
 const gitPaths=[...scope.PRODUCT_PATHS],previousRequest={version:17},state={noopJobs:false,markerDrift:false,wrongArtifact:false,wrongBalance:false,wrongBalanceReceipt:false};
 const startupProductBlobs=Object.fromEntries(STARTUP_PATHS.map((p,i)=>[p,(i?'d':'c').repeat(40)]));
 const startupPriorBlobs=Object.fromEntries(STARTUP_PATHS.map((p,i)=>[p,(i?'e':'a').repeat(40)]));
 const startupReceiptBlob='5'.repeat(40),startupTestBlob='f'.repeat(40);
 const receipt={schema:'GI_I66_STARTUP_PENDING_READ_RETRY_CAUSAL_SOURCE_V1',
  sourcePaths:STARTUP_PATHS.map(p=>({path:p,gitBlobSha:startupProductBlobs[p],previousGitBlobSha:startupPriorBlobs[p]})),
  causalTest:{path:STARTUP_TEST_PATH,gitBlobSha:startupTestBlob,passed:18,baselineFailures:2},
  noBackendChanges:true,noDataWrites:true,noPermissionChanges:true,maxRetries:1,retryDelayMs:1200,snapshotTimeoutChanged:false};
 if(startup){
  Object.assign(previousRequest,{mode:scope.REQUEST_MODE,backendPathBlobs:structuredClone(request.backendPathBlobs)});
  request.startupRecovery={schema:'GI_I66_STARTUP_RECOVERY_PREVIEW_EXTENSION_V1',receiptPath:STARTUP_RECEIPT_PATH,
   receiptBlob:startupReceiptBlob,productPathBlobs:{...startupProductBlobs}};
  gitPaths.push(...STARTUP_PATHS);gitPaths.sort();request.productPaths=[...gitPaths];
 }
 const git=(_cmd,args)=>{
  if(args[0]==='show'){
   if(args[1]==='HEAD^:artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json')
    return JSON.stringify({frontendPreviewRequest:previousRequest});
   if(args[1]===request.sourceQaHead+':'+STARTUP_RECEIPT_PATH)return JSON.stringify(receipt);
  }
  if(args[0]==='rev-parse'){
   const [ref,...parts]=args[1].split(':'),p=parts.join(':');
   if(p===current.receiptPath)return current.receiptGitBlobSha;
   if(p.endsWith('I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'))return request.manifestBlob;
   if(scope.SOURCE_PATHS.includes(p))return 'b'.repeat(40);
   if(p===scope.FRONTEND_PATH)return state.wrongBalance?'0'.repeat(40):scope.FRONTEND_BLOB;
   if(p===scope.BALANCE_RECEIPT_PATH)return state.wrongBalanceReceipt?'0'.repeat(40):scope.BALANCE_RECEIPT_BLOB;
   if(p===STARTUP_RECEIPT_PATH)return state.receiptDriftRef===ref?'0'.repeat(40):startupReceiptBlob;
   if(p===STARTUP_TEST_PATH)return state.testDriftRef===ref?'0'.repeat(40):startupTestBlob;
   if(STARTUP_PATHS.includes(p))return state.productDriftRef===ref?'0'.repeat(40):
    ref===current.sourceSha?startupPriorBlobs[p]:startupProductBlobs[p];
  }
  if(args[0]==='merge-base'||args[0]==='diff'&&args[1]==='--quiet')return '';
  if(args[0]==='diff'&&args[1]==='--name-only')return gitPaths.join('\n');
  throw Error('UNEXPECTED_GIT_FIXTURE_COMMAND');
 };
 const filename=path.join(__dirname,'gravicentra-i6-6-frontend-preview-authority.cjs'),m=new Module(filename,module);
 const req=name=>name==='node:child_process'?{execFileSync:git}:name==='node:fs'?{readFileSync:()=>JSON.stringify(cp)}:
  name==='./gravicentra-i66-make-release-scope.cjs'?scope:require(name);
 m.filename=filename;m.require=req;m._compile(fs.readFileSync(filename,'utf8'),filename);
 const api=async uri=>{
  if(uri.startsWith('artifacts/'))return{digest:state.wrongArtifact?'sha256:'+'0'.repeat(64):current.artifactDigest,workflow_run:{head_sha:current.sourceSha}};
  if(uri.endsWith('/jobs?per_page=100'))return{jobs:[{conclusion:'success',steps:state.noopJobs?[{number:1,conclusion:'success'}]:[{number:3,conclusion:'success'}]}]};
  const id=Number(uri.split('/')[1]);return{head_sha:request.sourceQaHead,head_branch:'recovery/fase-a-clean-20260831',
   path:'.github/workflows/'+(id===1?'gravicentra-i66-privileged-role-parity-source-qa.yml':'gravicentra-release-lock-sync.yml'),status:'completed',conclusion:'success'};
 };
 const marker=async()=>({sourceSha:state.markerDrift?'0'.repeat(40):current.sourceSha,buildId:current.buildId});
 return{request,transport,gitPaths,state,previousRequest,receipt,current,run:()=>m.exports.admitPreview(transport,api,marker)};
}
test('actual Preview authority admits only the exact A13+A14 backend and proved pending balance delta',async()=>{
 const f=admissionFixture();assert.equal(await f.run(),true);
 assert.deepEqual(f.request.productPaths.filter(p=>p.startsWith('orbit360-platform/')),[scope.FRONTEND_PATH]);
});
test('actual Preview authority refuses widened source, stale blob, real-write authority, no-op QA and physical drift',async()=>{
 for(const mutate of [f=>f.gitPaths.push('functions/unapproved.js'),f=>f.gitPaths.push('orbit360-platform/core/ui.js'),
  f=>f.gitPaths.pop(),f=>f.state.wrongBalance=true,f=>f.state.wrongBalanceReceipt=true,
  f=>f.request.balanceCorrection.requiredStagesPerPhase=12,f=>f.request.balanceCorrection.fullA04A12A14Acceptance=true,
  f=>f.request.backendPathBlobs[scope.SOURCE_PATHS[0]]='0'.repeat(40),f=>f.request.fiveFunctionExactPreviewRequired=false,
  f=>f.request.realDataWritesAllowed=true,f=>f.request.backendLiveDeployAllowed=true,f=>f.transport.livePromotionAuthorized=true,
  f=>f.state.noopJobs=true,f=>f.state.markerDrift=true,f=>f.state.wrongArtifact=true]){
  const f=admissionFixture();mutate(f);await assert.rejects(f.run());
 }
});
test('actual Preview admits only the two pinned causal startup owners while retaining undeployed Make source',async()=>{
 const f=admissionFixture({startup:true});assert.equal(await f.run(),true);
 assert.deepEqual(f.request.backendPathBlobs,f.previousRequest.backendPathBlobs);
 assert.deepEqual(f.request.productPaths,[...scope.PRODUCT_PATHS,...STARTUP_PATHS].sort());
 for(const key of Object.keys(f.previousRequest))delete f.previousRequest[key];
 Object.assign(f.previousRequest,structuredClone(f.request));assert.equal(await f.run(),false,'unchanged request cannot rebuild');
});
test('startup extension cannot admit unrelated source or repurpose another release mode',async()=>{
 const mutations=[
  ['unreceipted startup delta',f=>{delete f.request.startupRecovery;}],
  ['unlisted product source',f=>{f.gitPaths.push('orbit360-platform/data/another-store.js');f.gitPaths.sort();f.request.productPaths=[...f.gitPaths];}],
  ['missing startup owner',f=>{f.gitPaths.splice(f.gitPaths.indexOf(STARTUP_PATHS[0]),1);f.request.productPaths=[...f.gitPaths];}],
  ['unlisted extension field',f=>{f.request.startupRecovery.allowExtraPaths=true;}],
  ['unlisted pinned owner',f=>{f.request.startupRecovery.productPathBlobs['orbit360-platform/data/another-store.js']='a'.repeat(40);}],
  ['repurposed frontend mode',f=>{f.request.mode='PREVIEW_HOSTING_ONLY';}],
  ['unrelated predecessor mode',f=>{f.previousRequest.mode='PREVIEW_HOSTING_ONLY';}],
  ['changed pending backend',f=>{f.previousRequest.backendPathBlobs[scope.SOURCE_PATHS[0]]='0'.repeat(40);}],
  ['unknown receipt',f=>{f.request.startupRecovery.receiptPath=STARTUP_RECEIPT_PATH.replace('20261124','20261125');}],
  ['receipt pin mismatch',f=>{f.request.startupRecovery.receiptBlob='0'.repeat(40);}],
  ['request/source pin mismatch',f=>{f.request.startupRecovery.productPathBlobs[STARTUP_PATHS[0]]='0'.repeat(40);}],
  ['version skip',f=>{f.request.version+=1;}]
 ];
 for(const [name,mutate]of mutations){const f=admissionFixture({startup:true});mutate(f);await assert.rejects(f.run(),undefined,name);}
});
test('startup receipt must bind causal evidence, predecessor and immutable sourceQA/HEAD blobs',async()=>{
 const mutations=[
  ['missing causal receipt',f=>{f.receipt.schema='UNRELATED_RECEIPT';}],
  ['widened receipt source',f=>{f.receipt.sourcePaths[0].path='orbit360-platform/core/another-owner.js';}],
  ['duplicate receipt source',f=>{f.receipt.sourcePaths[1]={...f.receipt.sourcePaths[0]};}],
  ['wrong predecessor',f=>{f.receipt.sourcePaths[0].previousGitBlobSha='0'.repeat(40);}],
  ['unchanged product source',f=>{f.receipt.sourcePaths[0].previousGitBlobSha=f.receipt.sourcePaths[0].gitBlobSha;}],
  ['unrelated proof',f=>{f.receipt.causalTest.path='tools/unrelated.test.cjs';}],
  ['unpinned proof',f=>{f.receipt.causalTest.gitBlobSha='0'.repeat(40);}],
  ['unpassed proof',f=>{f.receipt.causalTest.passed=0;}],
  ['unreproduced baseline',f=>{f.receipt.causalTest.baselineFailures=0;}],
  ['permission change',f=>{f.receipt.noPermissionChanges=false;}],
  ['backend change',f=>{f.receipt.noBackendChanges=false;}],
  ['data write',f=>{f.receipt.noDataWrites=false;}],
  ['unbounded retry',f=>{f.receipt.maxRetries=2;}],
  ['changed retry delay',f=>{f.receipt.retryDelayMs=30000;}],
  ['changed snapshot timeout',f=>{f.receipt.snapshotTimeoutChanged=true;}]
 ];
 for(const [name,mutate]of mutations){const f=admissionFixture({startup:true});mutate(f);await assert.rejects(f.run(),undefined,name);}
 for(const ref of ['sourceQaHead','HEAD'])for(const field of ['receiptDriftRef','productDriftRef','testDriftRef']){
  const f=admissionFixture({startup:true});f.state[field]=ref==='sourceQaHead'?f.request.sourceQaHead:ref;
  await assert.rejects(f.run(),undefined,field+' '+ref);
 }
 const f=admissionFixture({startup:true});f.state.productDriftRef=f.current.sourceSha;
 await assert.rejects(f.run(),/I66_STARTUP_ACCEPTED_PREDECESSOR_DRIFT/);
});
test('existing protected workflows bind five targets and never run another deploy for configuration-only commits',()=>{
 const preview=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
 const live=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml'),'utf8');
 for(const text of [preview,live]){
  assert.ok(text.includes('JSON.stringify(before.operationalReleaseCandidate)!==JSON.stringify('));
  assert.ok(text.includes('make-lead-protected-executor.cjs snapshot-trigger'));
  assert.ok(text.includes('make-lead-protected-executor.cjs capture-trigger'));
  assert.ok(text.includes('validateInventoryAfter'));
 }
 assert.ok(live.includes('make-lead-protected-executor.cjs rollback live'));
 assert.ok(live.includes('if test "$OLD_REV" = ABSENT;then continue;fi'));
 assert.ok(live.includes('protected-make-configuration:'));
 assert.ok(!live.slice(live.indexOf('  protected-make-configuration:')).includes(' setIamPolicy'));
 assert.ok(!live.includes('gi-make-secret-iam-private.json'),'private IAM snapshot is never an artifact upload path');
});
