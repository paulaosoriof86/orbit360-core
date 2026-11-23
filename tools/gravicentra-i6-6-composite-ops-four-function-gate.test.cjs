'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function candidate(){
 const physical={sourceSha:'1'.repeat(40),buildId:'gi-i66-'+ '1'.repeat(12)+'-57f234755dc1',artifactId:148,
   artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:149,liveCloneRunId:150,liveHostingVersion:'sites/ays-orbit-360-lab/versions/physical'};
 const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
  status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',opsLeadsComposite:true,compositeVersion:1,
  sourceSha:'2'.repeat(40),buildRunId:151,artifactId:152,artifactDigest:'sha256:'+'b'.repeat(64),
  previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-151-ab12cd34.web.app',previewChannelId:'gi-i66-rc-151',
  targets:clone(g.COMPOSITE_TARGETS),requiredPreviewDrivers:[...g.DRIVERS],expectedSiteFileCount:224,
  opsLeadsBackendPath:'functions/product-ops-leads-domain.js',
  opsLeadsBackendBlobSha:'b7921ca88343ced65bdad4cd9de26fa120647083',
  currentPhysicalLive:clone(physical),currentLive:{
    sourceSha:physical.sourceSha,buildId:physical.buildId,artifactId:physical.artifactId,
    artifactDigest:physical.artifactDigest,buildRunId:physical.previewRunId,
    liveRunId:physical.liveCloneRunId,hostingVersion:physical.liveHostingVersion},
  sameImmutableArtifactOnly:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,
  noRulesAuthIamWrites:true,rollbackThreeBackendRevisionsAndHosting:true,
  rollbackFourBackendRevisionsAndHosting:true,
  syntheticQaIsolation:clone(g.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:clone(g.ADVISOR_QA_ISOLATION)};
 const control={gate:'I6.6',historicalClosedGate:'B4-007',
  status:'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',forbidBackendFunctionDeploy:false,
  forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:true,forbidBackendLiveFunctionDeploy:true,
  livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true,
  currentPhysicalHostingRelease:physical,operationalReleaseCandidate:p};
 return{control,p};
}
test('composite Ops/Leads adds only the exact fourth owner for Preview and LIVE',()=>{
 assert.equal(g.TARGETS.preview.length,3);assert.equal(g.TARGETS.live.length,3);
 assert.deepEqual(g.COMPOSITE_TARGETS.preview.slice(0,3),g.TARGETS.preview);
 assert.deepEqual(g.COMPOSITE_TARGETS.live.slice(0,3),g.TARGETS.live);
 assert.deepEqual(g.COMPOSITE_TARGETS.preview[3],{name:'orbit360OpsLeadsCommandPreview',region:'us-east1'});
 assert.deepEqual(g.COMPOSITE_TARGETS.live[3],{name:'orbit360OpsLeadsCommand',region:'us-central1'});
 let{control,p}=candidate();assert.equal(g.candidateForPhase(control,'preview'),p);
});
test('rejects composite target, source, role and rollback dilution without changing historical three targets',()=>{
 const bad=[
  c=>c.operationalReleaseCandidate.targets.preview.pop(),
  c=>c.operationalReleaseCandidate.targets.live.pop(),
  c=>c.operationalReleaseCandidate.targets.live[3].name='adminWriter',
  c=>c.operationalReleaseCandidate.expectedSiteFileCount=223,
  c=>c.operationalReleaseCandidate.opsLeadsBackendBlobSha='0'.repeat(40),
  c=>c.operationalReleaseCandidate.rollbackFourBackendRevisionsAndHosting=false,
  c=>c.currentPhysicalHostingRelease.sourceSha='5'.repeat(40),
  c=>c.forbidBackendLiveFunctionDeploy=false,
  c=>c.livePromotionAuthorized=true,
  c=>c.operationalReleaseCandidate.currentPhysicalLive.artifactDigest='sha256:'+'c'.repeat(64)
 ];
 for(const mutate of bad){let{control}=candidate();mutate(control);assert.throws(()=>g.candidateForPhase(control,'preview'))}
});
