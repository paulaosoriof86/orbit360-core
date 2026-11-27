'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
// Synthetic provider replies; exercises the real admission owner and provider
// dispatch, not an actual Cloud Build run, deployment or business-data write.
function fixture({nativeQa=true,nativeCurrent=false}={}){
  const directory='artifacts/orbit360-recovery/release-control/',file=path.join(__dirname,'gravicentra-i6-6-frontend-preview-authority.cjs');
  const current={sourceSha:'1'.repeat(40),buildId:'gi-i66-existing',artifactId:nativeCurrent?'gs://synthetic-exact-object#101':100,
    buildRunId:nativeCurrent?'12345678-1234-4234-8234-123456789035':90,artifactDigest:'sha256:'+'2'.repeat(64),
    hostingVersion:'sites/ays-orbit-360-lab/versions/existing',receiptPath:directory+'I6_6_FRONTEND_E00004_RECEIPT.json',receiptGitBlobSha:'3'.repeat(40),
    ...(nativeCurrent?{executionProvider:'CLOUD_BUILD'}:{})};
  const request={version:36,mode:'PREVIEW_HOSTING_ONLY',sourceQaHead:'4'.repeat(40),manifestBlob:'5'.repeat(40),previousReceiptBlob:current.receiptGitBlobSha,
    productPaths:['orbit360-platform/modules/receipts.js'],...(nativeQa?{nativeSourceQa:{fixture:'validated-by-native-owner'}}:{sourceQaRunId:10,guardRunId:11})};
  const transport={frontendPreviewRequest:request,livePromotionAuthorized:false,noHostingPromotion:true,forbidBackendFunctionDeploy:true,forbidFirestoreRulesDataAuthWrites:true,
    currentPhysicalHostingRelease:{...current,liveHostingVersion:current.hostingVersion}};
  const cp={gateState:{gates:{I6:{activeSubgate:'I6.6'}}},currentExecutionDecisionPointer:'i66FrontendReleaseHead',i66FrontendReleaseHead:current};
  const state={nativeFailure:false,markerFailure:false,apiCalls:[],nativeCalls:[],markers:[],evidence:[],temporary:[]},io={fixture:'read-only-io'};
  const native={
    verifySourceQaReference:async(r,o)=>{state.nativeCalls.push('source');assert.equal(r,request);assert.equal(o.io,io);state.temporary.push(o.out);assert.ok(fs.existsSync(path.dirname(o.out)));if(state.nativeFailure)throw Error('I66_NATIVE_SOURCE_ADMISSION_PROVIDER_RECEIPT_DRIFT');return {executionProvider:'CLOUD_BUILD',sourceQaHead:r.sourceQaHead,buildId:'source-uuid'};},
    verifyCurrentArtifact:async(c,o)=>{state.nativeCalls.push('artifact');assert.equal(c.artifactId,current.artifactId);assert.equal(o.io,io);state.temporary.push(o.out);if(state.nativeFailure)throw Error('I66_NATIVE_SOURCE_CURRENT_ARTIFACT_METADATA');return {executionProvider:'CLOUD_BUILD',sourceSha:c.sourceSha,artifact:c.artifactId};}
  };
  const git=(command,args)=>{
    assert.equal(command,'git');
    if(args[0]==='show'&&args[1]==='HEAD^:'+directory+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json')return JSON.stringify({frontendPreviewRequest:{version:35}});
    if(args[0]==='rev-parse')return args[1].endsWith(current.receiptPath)?current.receiptGitBlobSha:request.manifestBlob;
    if(args[0]==='merge-base'||args[0]==='diff'&&args[1]==='--quiet')return '';
    if(args[0]==='diff'&&args[1]==='--name-only')return request.productPaths.join('\n');
    throw Error('unexpected git '+args.join(' '));
  };
  const m=new Module(file,module),real=m.require.bind(m);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);
  m.require=name=>name==='node:child_process'?{execFileSync:git}:name==='node:fs'?{...fs,readFileSync:p=>p===directory+'CONTROL_PLANE.json'?JSON.stringify(cp):fs.readFileSync(p)}:
    name==='./gravicentra-i6-6-cloud-build-source-admission.cjs'?native:real(name);
  m._compile(fs.readFileSync(file,'utf8'),file);
  const api=async suffix=>{state.apiCalls.push(suffix);if(suffix.startsWith('artifacts/'))return{digest:current.artifactDigest,workflow_run:{head_sha:current.sourceSha}};
    if(suffix.endsWith('/jobs?per_page=100'))return{jobs:[{conclusion:'success',steps:[{conclusion:'success',number:3}]}]};
    return{head_sha:request.sourceQaHead,head_branch:'recovery/fase-a-clean-20260831',path:'.github/workflows/'+(suffix==='runs/10'?'gravicentra-i66-privileged-role-parity-source-qa.yml':'gravicentra-release-lock-sync.yml'),status:'completed',conclusion:'success'};};
  const run=()=>m.exports.admitPreview(transport,api,async origin=>{state.markers.push(origin);return{sourceSha:state.markerFailure?'0'.repeat(40):current.sourceSha,buildId:current.buildId};},{io,onEvidence:e=>state.evidence.push(e)});
  return{request,current,state,run};
}
for(const [nativeQa,nativeCurrent,expectedNative,expectedActions] of [
  [false,false,[],5],[true,false,['source'],1],[false,true,['artifact'],4],[true,true,['source','artifact'],0]
])test('actual Preview authority selects exact QA/artifact providers '+nativeQa+'/'+nativeCurrent,async()=>{
  const f=fixture({nativeQa,nativeCurrent});assert.equal(await f.run(),true);
  assert.deepEqual(f.state.nativeCalls,expectedNative);assert.equal(f.state.apiCalls.length,expectedActions);
  assert.deepEqual(f.state.markers,['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app']);assert.equal(f.state.evidence.length,1);
  assert.equal(f.state.evidence[0].sourceQa.executionProvider,nativeQa?'CLOUD_BUILD':'GITHUB_ACTIONS');
  assert.equal(f.state.evidence[0].currentArtifact.executionProvider,nativeCurrent?'CLOUD_BUILD':'GITHUB_ACTIONS');
  for(const out of f.state.temporary)assert.equal(fs.existsSync(path.dirname(out)),false);
});
for(const nativeCurrent of [false,true])test('native verification failure cannot become admission or legacy fallback '+nativeCurrent,async()=>{
  const f=fixture({nativeCurrent});f.state.nativeFailure=true;await assert.rejects(f.run(),/I66_NATIVE_SOURCE/);
  assert.equal(f.state.evidence.length,0);assert.equal(f.state.markers.length,0);assert.equal(f.state.apiCalls.length,0);
  for(const out of f.state.temporary)assert.equal(fs.existsSync(path.dirname(out)),false);
});
test('both exact LIVE markers remain mandatory with fully native proofs',async()=>{
  const f=fixture({nativeCurrent:true});f.state.markerFailure=true;await assert.rejects(f.run());assert.equal(f.state.evidence.length,0);
});
test('unknown artifact provider cannot be downgraded to Actions',async()=>{
  const f=fixture();f.current.executionProvider='UNRECOGNIZED';await assert.rejects(f.run(),/PROVIDER_UNSUPPORTED/);assert.equal(f.state.apiCalls.length,0);assert.equal(f.state.evidence.length,0);
});
