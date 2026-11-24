'use strict';
// One manifest-bound entry for the A13 successor; all owner tests remain offline.
require('./gravicentra-i66-make-lead-ingress.test.cjs');
require('./gravicentra-i66-make-lead-runtime-access.test.cjs');
require('./gravicentra-i66-make-lead-ingress-scenario.test.cjs');
require('./gravicentra-i66-make-lead-protected-executor.test.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const scope=require('./gravicentra-i66-make-release-scope.cjs');
function admissionFixture(){
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
 const git=(_cmd,args)=>{
  if(args[0]==='show')return JSON.stringify({frontendPreviewRequest:previousRequest});
  if(args[0]==='rev-parse'){
   const p=args[1].split(':').slice(1).join(':');
   if(p===current.receiptPath)return current.receiptGitBlobSha;
   if(p.endsWith('I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'))return request.manifestBlob;
   if(scope.SOURCE_PATHS.includes(p))return 'b'.repeat(40);
   if(p===scope.FRONTEND_PATH)return state.wrongBalance?'0'.repeat(40):scope.FRONTEND_BLOB;
   if(p===scope.BALANCE_RECEIPT_PATH)return state.wrongBalanceReceipt?'0'.repeat(40):scope.BALANCE_RECEIPT_BLOB;
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
 return{request,transport,gitPaths,state,previousRequest,run:()=>m.exports.admitPreview(transport,api,marker)};
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
