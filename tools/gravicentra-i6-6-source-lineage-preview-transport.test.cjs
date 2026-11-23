'use strict';
// New Preview authorization must not overwrite any historical I6.6 request.
// This is source-only QA; no Hosting/Function/Firestore operation runs here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const transportPath='artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const transport=JSON.parse(file('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
const request=transport.postAcceptanceOwnerSourceLineagePreviewBuildRequest20261119;
const old=transport.postAcceptanceOwnerP0PremiumRulesPreviewBuildRequest20261119;
const sha=p=>execFileSync('git',['hash-object',p],{cwd:root,encoding:'utf8'}).trim();
assert.equal(old.approvedManifestBlobSha,'a34b9ebc0161148f938c47a057e4b451ce008689',
  'historical Preview request must remain immutable');
// Historical source requests are frozen to their own signed manifest. They
// never have to equal the newest manifest after a subsequent approved source delta.
assert.equal(request.approvedManifestBlobSha,'1d4e3fb8938f156b60117021813396e034bac7c8',
  'historical source-lineage package manifest remains immutable');
const priorVehicle=transport.postAcceptanceOwnerVehiclePackagePreviewBuildRequest20261119;
assert.equal(priorVehicle.approvedManifestBlobSha,'fe54971b8749f5ab1d6a0947189d67f40c0f7d65',
  'prior vehicle package manifest remains immutable');
const next=transport.postAcceptanceOwnerOpsActivityEndosoPreviewBuildRequest20261119;
if(next){
  assert.equal(next.approvedManifestBlobSha,'af500e14c012d8cf0bfc75b4d73e711ca2cf88c9',
    'historical Ops/endoso Preview request must retain its exact approved manifest blob');
  assert.equal(next.authorizedBranch,request.authorizedBranch);
  assert.equal(next.previousLiveSourceSha,request.previousLiveSourceSha);
  assert.equal(next.previousLiveArtifactDigest,request.previousLiveArtifactDigest);
  // A later I6.6-approved test supersession does not rewrite the signed
  // November 19 Preview source request. Keep that historical blob frozen,
  // and compare the active test to the final approved manifest successor.
  const delta=JSON.parse(file('artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'));
  const testPath='tools/gravicentra-i6-6-ops-activity-direct-vehicle-endorsement.test.cjs';
  const legacy=delta.changes.find(change=>change.id==='I6_6_OPS_ATOMIC_CLIENT360_ACTIVITY_DIRECT_ISSUED_VEHICLE_SUBSTITUTION_20261119');
  const predecessor=(legacy&&legacy.tests||[]).find(test=>test.path===testPath);
  const revisions=delta.changes.map(change=>({change,entry:(change.tests||[]).find(test=>test.path===testPath)})).filter(row=>row.entry);
  assert.ok(predecessor&&revisions.length>=1,'OPS_TEST_HISTORICAL_MANIFEST_MISSING');
  assert.equal(next.sourceOpsActivityEndosoTestBlobSha,predecessor.gitBlobSha,
    'historical Ops source acceptance remains bound to its original test');
  const currentTest=revisions[revisions.length-1].entry;
  assert.equal(currentTest.gitBlobSha,sha(testPath),'OPS_TEST_LATEST_APPROVED_SUCCESSOR_DRIFT');
  if(currentTest.gitBlobSha!==predecessor.gitBlobSha)
    assert.ok(revisions.some(row=>row.entry.replaces&&row.entry.replaces.priorGitBlobSha===predecessor.gitBlobSha),
      'OPS_TEST_SUPERSESSION_NOT_PROVEN');
}
assert.equal(request.sourceLineageTestBlobSha,
  sha('tools/gravicentra-i6-6-source-lineage-reconciliation.test.cjs'));
assert.equal(request.sourceQaLineageTests,52);
assert.equal(request.sourceQaHead,request.sourceGovernanceHead);
assert.equal(request.sourceQaWorkflow,'.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml');
assert.equal(request.sourceQaRunId,44571113161);
assert.equal(request.sourceGovernanceRunId,44571113275);
assert.equal(request.authorizedBranch,'recovery/fase-a-clean-20260831');
assert.equal(request.sourceQaLocalFinancialWrites,0);
assert.equal(request.sourceQaProductCommissionTests,6);
assert.equal(request.productCommissionTestBlobSha,
  sha('tools/gravicentra-i6-6-insurer-product-commission.test.cjs'));
assert.equal(request.releaseScope,
  'EXACT_IMMUTABLE_PREVIEW_ONLY_OWNER_APPROVED_LOGIN_CLIENT360_OPS_LEADS_PREMIUM_COBROS_LINEAGE');
// This request belongs to its source-QA epoch. A later authorized LIVE phase
// or accepted successor cannot change that historical predecessor or scope.
git('merge-base','--is-ancestor',request.sourceQaHead,'HEAD');
const requestEpoch=JSON.parse(git('show',request.sourceQaHead+':'+transportPath));
const historicalLive=requestEpoch.currentExactHostingRelease;
assert.equal(request.previousLiveSourceSha,historicalLive.sourceSha);
assert.equal(request.previousLiveArtifactId,historicalLive.artifactId);
assert.equal(request.previousLiveArtifactDigest,historicalLive.artifactDigest);
assert.equal(request.previousLiveHostingVersion,historicalLive.liveHostingVersion);
for(const key of ['approvedByDirection','strictlyNewImmutableSource','existingBuildJobOnly',
  'previewHostingChannelOnly','rollbackMustPreserveCurrentLive',
  'sourceReadyForNewImmutablePackage','previewOnlyNoLive'])assert.equal(request[key],true,key);
for(const key of ['liveDeploy','backendLiveDeploy','realOperationalDataWrites',
  'legalChanges','newFirebase'])assert.equal(request[key],false,key);
const source=file('.github/workflows/gravicentra-release-delta-66-package.yml');
for(const proof of ['postAcceptanceOwnerSourceLineagePreviewBuildRequest20261119',
  'I66_LINEAGE_PREVIEW_SOURCE_QA_PIN_MISSING',
  'I66_LINEAGE_PREVIEW_GOVERNANCE_NOT_SIGNED',
  'I66_POST_ACCEPTANCE_PREVIEW_ONLY_REQUEST_SCOPE_DRIFT',
  'governance.event!==\'push\'',
  "governance.conclusion!=='success'",'successor.previousLiveHostingVersion===live.liveHostingVersion'])
  assert.ok(source.includes(proof),'missing controlled gate '+proof);
assert.equal(requestEpoch.livePromotionAuthorized,false);
assert.equal(requestEpoch.forbidBackendLiveFunctionDeploy,true);
assert.equal(requestEpoch.forbidBackendFunctionDeploy,true);
assert.equal(requestEpoch.forbidFirestoreRulesDataAuthWrites,true);

function validateCurrentPhase(control,verifyPhysical){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  assert.equal(control.forbidFirestoreRulesDataAuthWrites,true,'CURRENT_PHASE_CANNOT_AUTHORIZE_DATA_RULES_AUTH');
  if(control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'){
    return g.candidateForPhase(control,'live');
  }
  if(control.scopedBackendPreviewI66||control.status==='OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED'){
    return g.candidateForPhase(control,'preview');
  }
  assert.ok(['OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED','PREVIEW_BUILD_REQUESTED'].includes(control.status),'CURRENT_PHASE_NOT_RECOGNIZED');
  assert.equal(control.operationalReleaseCandidate,undefined,'LOCKED_PHASE_HAS_UNCONSUMED_CANDIDATE');
  for(const [key,value] of Object.entries({forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,
    forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true}))
    assert.equal(control[key],value,'CURRENT_PHASE_LOCK_'+key);
  if(control.status==='PREVIEW_BUILD_REQUESTED')require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').validateAuthorization(control);
  assert.equal(typeof verifyPhysical,'function','CURRENT_PHASE_PHYSICAL_GUARD_REQUIRED');
  return verifyPhysical(control);
}
const physical=control=>{
  const f=require('./gravicentra-i66-frontend-control.cjs');
  return f.physicalGuard(JSON.parse(file(f.P.cp)),JSON.parse(file(f.P.state)),control,fs);
};
validateCurrentPhase(transport,physical);

// Causal regression: the exact signed V13 LIVE authorization failed only
// because the original test required all later transports to stay Preview.
const live=JSON.parse(git('show','440cc0c1cb1f06f2db8b200c9c49fdd012aa7195:'+transportPath));
validateCurrentPhase(live,()=>assert.fail('LIVE must use the candidate owner'));
for(const mutate of [
 c=>delete c.operationalReleaseCandidate,
 c=>c.forbidBackendLiveFunctionDeploy=true,
 c=>c.livePromotionAuthorized=false,
 c=>c.operationalReleaseCandidate.status='EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',
 c=>c.operationalReleaseCandidate.previewQa.status='NOT_PROVEN',
 c=>c.operationalReleaseCandidate.sourceSha=c.currentPhysicalHostingRelease.sourceSha,
 c=>c.forbidFirestoreRulesDataAuthWrites=false
]){
 const c=structuredClone(live);mutate(c);assert.throws(()=>validateCurrentPhase(c,()=>assert.fail('invalid LIVE must not fall through')));
}
const scoped=JSON.parse(git('show','85327b6615c7bc11b6240dae9a59b4157454fd6b:'+transportPath));
validateCurrentPhase(scoped,()=>assert.fail('scoped Preview must use the candidate owner'));
const badScoped=structuredClone(scoped);badScoped.livePromotionAuthorized=true;
assert.throws(()=>validateCurrentPhase(badScoped,()=>{}));
const locked=structuredClone(live);delete locked.operationalReleaseCandidate;
Object.assign(locked,{status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',forbidBackendFunctionDeploy:true,
 backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,
 previewApproved:false,noHostingPromotion:true});
let physicalCalls=0;validateCurrentPhase(locked,()=>{physicalCalls++;});assert.equal(physicalCalls,1);
assert.throws(()=>validateCurrentPhase(locked,()=>{throw Error('PHYSICAL_PROOF_MISSING');}),/PHYSICAL_PROOF_MISSING/);
for(const key of ['livePromotionAuthorized','previewApproved','forbidBackendFunctionDeploy','forbidBackendLiveFunctionDeploy','noHostingPromotion']){
 const c=structuredClone(locked);c[key]=!c[key];assert.throws(()=>validateCurrentPhase(c,()=>{}));
}

// Exact test-only lineage cannot smuggle in a product path, a new test, an
// unapproved scope, or a changed receipt. Existing product checks stay intact.
const {applyTestRevisions}=require('./gravicentra-i6-6-delta-test-revisions.cjs');
const testPath='tools/gravicentra-i6-6-source-lineage-preview-transport.test.cjs';
const predecessor={gitBlobSha:'a'.repeat(40),changeId:'I6_6_ORIGINAL_TEST'};
const entry={path:testPath,gitBlobSha:'b'.repeat(40),replaces:{path:testPath,priorGitBlobSha:predecessor.gitBlobSha,priorChangeId:predecessor.changeId}};
const revision={id:'I6_6_TEST_REVISION',approvedByDirection:true,scope:'EXISTING_DECLARED_TESTS_ONLY',paths:[],
 receipt:'artifacts/orbit360-recovery/release-control/QA_REVISION_FIXTURE.json',receiptGitBlobSha:'c'.repeat(40),tests:[entry]};
const receipt={revisionId:revision.id,scope:revision.scope,productSourceChanges:0,productionAcceptanceClaimed:false,tests:revision.tests};
const apply=(r,body=receipt,blob='c'.repeat(40))=>applyTestRevisions({testRevisions:[r]},new Map([[testPath,predecessor]]),new Set([predecessor.changeId]),{readBlob:()=>blob,readJson:()=>body});
assert.equal(apply(revision).get(testPath).gitBlobSha,entry.gitBlobSha);
for(const mutate of [r=>r.paths.push('functions/bootstrap.js'),r=>r.approvedByDirection=false,
 r=>r.tests[0].path='tools/new-unapproved.test.cjs',r=>r.tests[0].replaces.priorGitBlobSha='d'.repeat(40),
 r=>r.tests[0].gitBlobSha=predecessor.gitBlobSha,r=>r.id=predecessor.changeId,r=>r.tests.push({...r.tests[0]})]){
 const r=structuredClone(revision);mutate(r);assert.throws(()=>apply(r));
}
assert.throws(()=>apply(revision,{...receipt,productionAcceptanceClaimed:true}));
assert.throws(()=>apply(revision,receipt,'d'.repeat(40)));
module.exports={validateCurrentPhase};
console.log('I66_LINEAGE_PREVIEW_TRANSPORT_EXACT_SOURCE_OLD_REQUEST_PRESERVED_NO_WRITES_PASS');
