'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const previewPath='.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml';
const livePath='.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml';

// Execute the actual workflow selector and readback code. A source-string test
// alone previously accepted a fourth target that the workflow never deployed.
function workflowCode(file,marker){
  const text=fs.readFileSync(file,'utf8'),open="node - <<'"+marker+"'";
  const start=text.indexOf(open);
  assert.ok(start>=0,'WORKFLOW_EXECUTABLE_BLOCK_MISSING_'+marker);
  const bodyStart=text.indexOf('\n',start)+1,end=text.indexOf('\n          '+marker,bodyStart);
  assert.ok(end>bodyStart,'WORKFLOW_EXECUTABLE_BLOCK_UNTERMINATED_'+marker);
  return text.slice(bodyStart,end).replace(/^          /gm,'');
}
function execute(file,marker,control,{before=[],after=[]}={}){
  let output='';
  const moduleRequire=name=>{
    if(name==='./tools/gravicentra-i6-6-operational-release-candidate.cjs')return g;
    if(name==='./'+g.CONTROL)return control;
    if(name==='node:assert/strict')return assert;
    if(name==='node:fs')return {readFileSync:file=>{
      assert.equal(file,g.CONTROL);return JSON.stringify(control);
    }};
    if(name==='/qa/gi-role-functions-before.json'||name==='/qa/gi-role-live-functions-before.json')return {result:before};
    if(name==='/qa/gi-role-functions-after.json'||name==='/qa/gi-role-live-functions-after.json')return {result:after};
    throw Error('UNEXPECTED_WORKFLOW_REQUIRE_'+name);
  };
  // Use Node's JSON realm, as the real workflow and imported validator do.
  vm.runInNewContext(workflowCode(file,marker),{require:moduleRequire,JSON,
    process:{env:{RUNNER_TEMP:'/qa'},stdout:{write:value=>{output+=value;}}},console:{log:()=>{}}},
    {timeout:1000,filename:file+'#'+marker});
  return output;
}
function fixture(phase='preview'){
  const physical={sourceSha:'1'.repeat(40),buildId:'gi-i66-'+ '1'.repeat(12)+'-57f234755dc1',
    artifactId:148,artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:149,liveCloneRunId:150,
    liveHostingVersion:'sites/ays-orbit-360-lab/versions/physical'};
  const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
    status:phase==='preview'?'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED':'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED',
    opsLeadsComposite:true,compositeVersion:1,sourceSha:'2'.repeat(40),
    buildId:'gi-i66-'+ '2'.repeat(12)+'-57f234755dc1',buildRunId:151,artifactId:152,
    artifactDigest:'sha256:'+'b'.repeat(64),previewChannelId:'gi-i66-rc-151',
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-151-ab12cd34.web.app',
    targets:clone(g.COMPOSITE_TARGETS),requiredPreviewDrivers:[...g.DRIVERS],expectedSiteFileCount:224,
    opsLeadsBackendPath:'functions/product-ops-leads-domain.js',
    opsLeadsBackendBlobSha:'b7921ca88343ced65bdad4cd9de26fa120647083',
    currentPhysicalLive:clone(physical),currentLive:{sourceSha:physical.sourceSha,buildId:physical.buildId,
      artifactId:physical.artifactId,artifactDigest:physical.artifactDigest,buildRunId:physical.previewRunId,
      liveRunId:physical.liveCloneRunId,hostingVersion:physical.liveHostingVersion},
    sameImmutableArtifactOnly:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,
    noRulesAuthIamWrites:true,rollbackThreeBackendRevisionsAndHosting:true,rollbackFourBackendRevisionsAndHosting:true,
    syntheticQaIsolation:clone(g.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:clone(g.ADVISOR_QA_ISOLATION)};
  const c={gate:'I6.6',historicalClosedGate:'B4-007',currentPhysicalHostingRelease:physical,
    forbidFirestoreRulesDataAuthWrites:true};
  if(phase==='preview')Object.assign(c,{status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',
    forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:true,
    livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true,
    scopedBackendPreviewI66:{schema:'GI_I66_SCOPED_BACKEND_PREVIEW_AUTHORIZATION_V1',
      status:'APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY',approvedByDirection:true,
      noLiveOrFinancialWrites:true,noRulesAuthIamWrites:true,sameImmutableArtifactOnly:true,
      sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,currentPhysicalLiveSourceSha:physical.sourceSha,
      currentPhysicalLiveArtifactDigest:physical.artifactDigest,candidate:p}});
  else{
    p.previewQa={runId:153,headSha:'3'.repeat(40),receiptArtifactId:154,
      receiptArtifactDigest:'sha256:'+'c'.repeat(64),status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'};
    Object.assign(c,{status:'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',forbidBackendFunctionDeploy:false,
      backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:false,livePromotionAuthorized:true,
      previewApproved:true,noHostingPromotion:false,operationalReleaseCandidate:p});
  }
  return c;
}
const inventory=phase=>g.COMPOSITE_TARGETS[phase].map(({name,region})=>({entryPoint:name,region,revision:'fixture-revision'}));

test('scoped Preview executes a four-target deploy selector without reopening production',()=>{
  const c=fixture(),before=JSON.stringify(c);
  assert.equal(c.operationalReleaseCandidate,undefined);
  assert.equal(execute(previewPath,'PREVIEW_TARGETS',c),'4');
  assert.equal(JSON.stringify(c),before);
  assert.throws(()=>execute(livePath,'LIVE_TARGETS',c),/I66_SCOPED_AUTHORIZATION_CANNOT_DEPLOY_LIVE/);
});
test('missing or diluted scoped authority cannot silently select historical three targets',()=>{
  for(const mutate of [c=>delete c.scopedBackendPreviewI66,
    c=>c.scopedBackendPreviewI66.candidate.targets.preview.pop(),
    c=>c.scopedBackendPreviewI66.approvedByDirection=false]){
    const c=fixture();mutate(c);
    assert.throws(()=>execute(previewPath,'PREVIEW_TARGETS',c));
  }
});
test('Preview inventory requires the fourth target, its unique identity and exact region',()=>{
  const c=fixture(),after=inventory('preview'),before=after.slice(0,3);
  assert.doesNotThrow(()=>execute(previewPath,'PREVIEW_INVENTORY',c,{before,after}));
  assert.throws(()=>execute(previewPath,'PREVIEW_INVENTORY',c,{before,after:before}),
    /I66_PREVIEW_DEPLOYED_TARGET_NOT_UNIQUE_orbit360OpsLeadsCommandPreview/);
  assert.throws(()=>execute(previewPath,'PREVIEW_INVENTORY',c,{before:after,after:[...after,after[3]]}));
  const wrongRegion=clone(after);wrongRegion[3].region='us-central1';
  assert.throws(()=>execute(previewPath,'PREVIEW_INVENTORY',c,{before,after:wrongRegion}),
    /I66_PREVIEW_DEPLOYED_TARGET_REGION_DRIFT_orbit360OpsLeadsCommandPreview/);
});
test('exact LIVE selectors and rollback inventory agree on four only after separate LIVE authorization',()=>{
  const c=fixture('live');
  assert.equal(execute(livePath,'LIVE_TARGETS',c),'4');
  assert.equal(execute(livePath,'LIVE_DEPLOY_TARGETS',c),'4');
  const after=inventory('live');
  assert.doesNotThrow(()=>execute(livePath,'LIVE_INVENTORY',c,{before:after,after}));
  const three=after.slice(0,3);
  assert.throws(()=>execute(livePath,'LIVE_INVENTORY',c,{before:three,after:three}),
    /I66_LIVE_DEPLOYED_TARGET_NOT_UNIQUE_orbit360OpsLeadsCommand/);
  const wrongRegion=clone(after);wrongRegion[3].region='us-east1';
  assert.throws(()=>execute(livePath,'LIVE_INVENTORY',c,{before:after,after:wrongRegion}),
    /I66_LIVE_DEPLOYED_TARGET_REGION_DRIFT_orbit360OpsLeadsCommand/);
});
test('both inventories reject changes to non-target backend functions',()=>{
  for(const phase of ['preview','live']){
    const before=[...inventory(phase),{entryPoint:'untouchedFixture',region:'us-central1',revision:'old'}];
    const after=clone(before);after.at(-1).revision='changed';
    assert.throws(()=>execute(phase==='preview'?previewPath:livePath,
      phase==='preview'?'PREVIEW_INVENTORY':'LIVE_INVENTORY',fixture(phase),{before,after}),
      /I66_PREVIEW_NON_TARGET_BACKEND_CHANGED|I66_ROLE_NON_TARGET_FUNCTION_REVISION_CHANGED/);
  }
});
test('Preview phase expression treats false outputs as false for legacy and scoped authorizations',()=>{
  const text=fs.readFileSync(previewPath,'utf8');
  const expression=text.match(/^      authorized: \$\{\{ (.+) \}\}$/m)?.[1];
  assert.ok(expression);
  for(const [scoped,phase,expected] of [['false','false',false],['false','true',true],['true','false',true]]){
    const actual=vm.runInNewContext(expression,{steps:{scoped:{outputs:{authorized:scoped}},phase:{outputs:{authorized:phase}}}});
    assert.equal(actual,expected);
  }
});
