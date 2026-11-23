'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function candidate(){
 const physical={sourceSha:'1'.repeat(40),buildId:'gi-i66-'+ '1'.repeat(12)+'-57f234755dc1',artifactId:148,
   artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:149,liveCloneRunId:150,liveHostingVersion:'sites/ays-orbit-360-lab/versions/physical'};
 const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
  status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',opsLeadsComposite:true,compositeVersion:1,
  sourceSha:'2'.repeat(40),buildId:'gi-i66-'+ '2'.repeat(12)+'-57f234755dc1',buildRunId:151,artifactId:152,artifactDigest:'sha256:'+'b'.repeat(64),
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

test('preview and live transport require fourth callable and exact 224-byte-set for composite',()=>{
 const fs=require('node:fs');
 const preview=fs.readFileSync('.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','utf8');
 const live=fs.readFileSync('.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml','utf8');
 const transport=fs.readFileSync('tools/gravicentra-i66-privileged-role-exact-live-transport.mjs','utf8');
 assert.match(preview,/functions:orbit360OpsLeadsCommandPreview/);
 assert.match(live,/functions:orbit360OpsLeadsCommand/);
 assert.match(preview,/targetsForCandidate\(candidate,'preview'\)/);
 assert.match(live,/targetsForCandidate\(p,'live'\)/);
 assert.match(transport,/operational\?\.expectedSiteFileCount\|\|223/);
 assert.match(live,/candidate.expectedSiteFileCount/);
});
test('scoped four-function Preview authority leaves production closed even during synthetic QA',()=>{
 const {control,p}=candidate();
 const old={...control,
  status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',
  forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,
  forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,
  previewApproved:false,noHostingPromotion:true,operationalReleaseCandidate:undefined,
  scopedBackendPreviewI66:{
    schema:'GI_I66_SCOPED_BACKEND_PREVIEW_AUTHORIZATION_V1',
    status:'APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY',
    approvedByDirection:true,noLiveOrFinancialWrites:true,noRulesAuthIamWrites:true,
    sameImmutableArtifactOnly:true,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    currentPhysicalLiveSourceSha:control.currentPhysicalHostingRelease.sourceSha,
    currentPhysicalLiveArtifactDigest:control.currentPhysicalHostingRelease.artifactDigest,
    candidate:p
  }
 };
 assert.equal(g.candidateForPhase(old,'preview'),p);
 assert.equal(old.status,'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED');
 assert.equal(old.forbidBackendFunctionDeploy,true);
 assert.equal(old.operationalReleaseCandidate,undefined);
 assert.throws(()=>g.candidateForPhase(old,'live'),/I66_SCOPED_AUTHORIZATION_CANNOT_DEPLOY_LIVE/);
 for(const change of [
  v=>v.scopedBackendPreviewI66.approvedByDirection=false,
  v=>v.scopedBackendPreviewI66.noLiveOrFinancialWrites=false,
  v=>v.scopedBackendPreviewI66.artifactDigest='sha256:'+'0'.repeat(64),
  v=>v.forbidBackendFunctionDeploy=false,
  v=>v.livePromotionAuthorized=true
 ]){const copy=clone(old);change(copy);assert.throws(()=>g.candidateForPhase(copy,'preview'))}
});
