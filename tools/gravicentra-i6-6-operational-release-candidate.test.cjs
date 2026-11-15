'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(phase='preview'){
  const old={sourceSha:'8'.repeat(40),buildId:'gi-i66-'+ '8'.repeat(12)+'-57f234755dc1',artifactId:101,artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:102,liveCloneRunId:103,liveHostingVersion:'sites/ays-orbit-360-lab/versions/old-v1'};
  const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,status:phase==='preview'?'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED':'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED',sourceSha:'9'.repeat(40),buildRunId:201,artifactId:202,artifactDigest:'sha256:'+'b'.repeat(64),previewUrl:g.PREVIEW,previewChannelId:g.CHANNEL,targets:clone(g.TARGETS),requiredPreviewDrivers:[...g.DRIVERS],sameImmutableArtifactOnly:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,syntheticQaIsolation:clone(g.PROPOSAL_QA_ISOLATION),currentLive:{sourceSha:old.sourceSha,buildId:old.buildId,artifactId:old.artifactId,artifactDigest:old.artifactDigest,buildRunId:old.previewRunId,liveRunId:old.liveCloneRunId,hostingVersion:old.liveHostingVersion}};
  if(phase==='live')p.previewQa={runId:301,headSha:'c'.repeat(40),receiptArtifactId:302,receiptArtifactDigest:'sha256:'+'d'.repeat(64),status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'};
  p.advisorPayableQaIsolation=clone(g.ADVISOR_QA_ISOLATION);
  return{gate:'I6.6',historicalClosedGate:'B4-007',status:phase==='preview'?'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED':'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:phase==='preview',forbidBackendLiveFunctionDeploy:phase==='preview',livePromotionAuthorized:phase==='live',previewApproved:phase==='live',noHostingPromotion:phase==='preview',currentExactHostingRelease:old,operationalReleaseCandidate:p};
}
for(const phase of ['preview','live'])test(phase+' accepts only the current three-function exact-artifact authority',()=>{
  const c=fixture(phase);assert.equal(g.candidateForPhase(c,phase),c.operationalReleaseCandidate);
  const e=g.envFor(c.operationalReleaseCandidate);assert.equal(e.SOURCE_SHA,c.operationalReleaseCandidate.sourceSha);assert.equal(e.I66_PREVIOUS_HOSTING_VERSION,c.currentExactHostingRelease.liveHostingVersion);
});
const mutations=[
  ['no owner approval',c=>c.operationalReleaseCandidate.approvedByDirection=false],
  ['arbitrary target',c=>c.operationalReleaseCandidate.targets.preview[0].name='otherFunction'],
  ['wrong region',c=>c.operationalReleaseCandidate.targets.preview[1].region='us-east1'],
  ['extra function',c=>c.operationalReleaseCandidate.targets.live.push({name:'orbit360OpsLeadsCommand',region:'us-central1'})],
  ['unreviewed script',c=>c.operationalReleaseCandidate.requiredPreviewDrivers.push('tools/arbitrary.cjs')],
  ['missing signed proposal driver',c=>c.operationalReleaseCandidate.requiredPreviewDrivers.pop()],
  ['operational control pointer as synthetic',c=>c.operationalReleaseCandidate.syntheticQaIsolation.controlCollection='cobrosLedgerControl'],
  ['new tenant without authority',c=>c.operationalReleaseCandidate.syntheticQaIsolation.tenantId='other-tenant'],
  ['unmarked synthetic rows',c=>c.operationalReleaseCandidate.syntheticQaIsolation.requireSyntheticMarker=false],
  ['adviser QA financial payment',c=>c.operationalReleaseCandidate.advisorPayableQaIsolation.financialPayments=1],
  ['new origin',c=>c.operationalReleaseCandidate.previewUrl='https://wrong.example'],
  ['unrecoverable current source',c=>c.operationalReleaseCandidate.currentLive.sourceSha='7'.repeat(40)],
  ['unrecoverable current hosting',c=>c.operationalReleaseCandidate.currentLive.hostingVersion='sites/ays-orbit-360-lab/versions/wrong'],
  ['missing rollback',c=>c.operationalReleaseCandidate.rollbackThreeBackendRevisionsAndHosting=false],
  ['real financial writes',c=>c.operationalReleaseCandidate.noRealFinancialOrCustomerWrites=false],
  ['auth write allowed',c=>c.forbidFirestoreRulesDataAuthWrites=false],
  ['preview may promote',c=>c.livePromotionAuthorized=true],
  ['site manifest count changed without review',c=>c.operationalReleaseCandidate.expectedSiteFileCount=224],
  ['invalid source',c=>c.operationalReleaseCandidate.sourceSha='latest']
];
for(const [label,mutate] of mutations)test('rejects '+label,()=>{const c=fixture();mutate(c);assert.throws(()=>g.candidateForPhase(c,'preview'));});
test('LIVE cannot reuse an unauthenticated or absent signed-QA receipt',()=>{const c=fixture('live');delete c.operationalReleaseCandidate.previewQa;assert.throws(()=>g.candidateForPhase(c,'live'));});
test('artifact identity includes build source workflow digest name and expiry',()=>{
  const p=fixture().operationalReleaseCandidate;
  const r={id:p.buildRunId,conclusion:'success',head_sha:p.sourceSha,path:'.github/workflows/gravicentra-release-delta-66-package.yml'};
  const a={id:p.artifactId,expired:false,digest:p.artifactDigest,name:'gi-i66-immutable-'+p.sourceSha,workflow_run:{id:p.buildRunId,head_sha:p.sourceSha}};
  g.validateArtifact(p,r,a);
  for(const [field,value] of [['digest','sha256:'+'0'.repeat(64)],['expired',true],['id',999],['name','other']])assert.throws(()=>g.validateArtifact(p,r,{...a,[field]:value}));
  assert.throws(()=>g.validateArtifact(p,{...r,path:'another-workflow.yml'},a));
});
test('signed-QA receipt must come from exactly this Preview workflow and source head',()=>{
  const p=fixture('live').operationalReleaseCandidate,q=p.previewQa;
  const r={id:q.runId,conclusion:'success',head_sha:q.headSha,path:'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'};
  const a={id:q.receiptArtifactId,expired:false,digest:q.receiptArtifactDigest,name:'gi-i66-operational-preview-proof-'+q.runId,workflow_run:{id:q.runId}};
  g.validatePreviewQa(p,r,a);assert.throws(()=>g.validatePreviewQa(p,{...r,conclusion:'failure'},a));assert.throws(()=>g.validatePreviewQa(p,{...r,head_sha:p.sourceSha},a));
});
test('proof refuses different source artifact missing driver or incomplete restoration',()=>{
  const p=fixture('live').operationalReleaseCandidate;
  const proof={schema:'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1',status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS',...Object.fromEntries(['sourceSha','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId'].map(k=>[k,p[k]])),targets:clone(g.TARGETS.preview),signedDrivers:[...g.DRIVERS],realFinancialOrCustomerWrites:0,syntheticRestoreComplete:true,liveHostingUnchanged:true,liveBackendUnchanged:true};
  proof.focusedReports=Object.fromEntries(['advisorPayables','proposalApplication'].map(k=>[k,{status:'PASS',cleanup:'PASS',checks:5,digest:'sha256:'+'e'.repeat(64)}]));
  g.validateProof(p,proof);
  for(const mutate of [x=>x.sourceSha='4'.repeat(40),x=>x.artifactId=1,x=>x.signedDrivers.pop(),x=>x.syntheticRestoreComplete=false,x=>x.liveBackendUnchanged=false,x=>x.realFinancialOrCustomerWrites=1]){const bad=clone(proof);mutate(bad);assert.throws(()=>g.validateProof(p,bad));}
});
module.exports={fixture};

function continuationFixture(phase='build'){
  const fs=require('node:fs');
  const control=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
  const state=JSON.parse(fs.readFileSync('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','utf8'));
  const transport=JSON.parse(fs.readFileSync(g.CONTROL,'utf8'));
  const old=transport.currentExactHostingRelease;
  control.currentExecutionDecisionPointer='i66R11RenewalDriveExactLiveRelease20261113';
  control.i66OperationalContinuation20261115={status:'EXECUTING_SOURCE_QA_NOT_NEW_LIVE_ACCEPTANCE',canonicalPlan:'artifacts/orbit360-recovery/release-control/I6_6_OPERATIONAL_CONTINUATION_20261115.json',activeGate:'I6.6',closedHistoricalGate:'B4-007',latestProvenLiveSource:old.sourceSha,newFinancialWrites:0,newLiveAcceptanceClaimed:false};
  state.currentExecutionDecisionPointer='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66R11RenewalDriveExactLiveRelease20261113';
  state.currentOperationalWorkPointer='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66OperationalContinuation20261115';
  if(phase==='build'||phase==='locked'){
    Object.assign(transport,{status:phase==='build'?'PREVIEW_BUILD_REQUESTED':'R11_RENEWAL_DRIVE_EXACT_LIVE_ACCEPTED_LOCKED',livePromotionAuthorized:false,previewApproved:false,forbidBackendFunctionDeploy:true,forbidBackendLiveFunctionDeploy:true,noHostingPromotion:true,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:false});
    delete transport.operationalReleaseCandidate;
    transport.previewChannelReuseAuthorization={status:'CURRENT_LIVE_BACKED_SINGLE_PREVIEW_REUSE_AUTHORIZED',approvedByDirection:true,authorizedChannelId:g.CHANNEL,expectedPreviewUrl:g.PREVIEW,noLiveChanges:true,noBusinessDataWrites:true,noChannelDeletion:true,stopOnIdentityDrift:true,expectedSourceSha:old.sourceSha,expectedHostingVersion:old.liveHostingVersion,recoverableBuildRunId:old.previewRunId,recoverableArtifactId:old.artifactId,recoverableArtifactDigest:old.artifactDigest};
  }else{
    Object.assign(transport,fixture(phase),{currentExactHostingRelease:old});
    transport.operationalReleaseCandidate.currentLive={sourceSha:old.sourceSha,buildId:old.buildId,artifactId:old.artifactId,artifactDigest:old.artifactDigest,buildRunId:old.previewRunId,liveRunId:old.liveCloneRunId,hostingVersion:old.liveHostingVersion};
  }
  return {control,state,transport};
}
function runHistoricalPreflight({control,state,transport},mutateFile){
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync('tools/gravicentra-governance-preflight-v1.mjs','utf8').split('const activeGuard=')[0].replace(/^import .*;\n/gm,'');
  const replacements={'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json':control,'orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json':state,[g.CONTROL]:transport};
  const readFileSync=(p,encoding)=>{
    if(Object.hasOwn(replacements,p))return JSON.stringify(replacements[p]);
    const text=fs.readFileSync(p,encoding);
    return mutateFile?mutateFile(p,text):text;
  };
  vm.runInNewContext(source,{JSON,fs:{readFileSync,existsSync:fs.existsSync},process:{argv:['node','preflight','--mode=i6'],execPath:process.execPath},operationalRelease:g,spawnSync(){throw Error('PREFLIGHT_TEST_UNEXPECTED_PROCESS');}},{filename:'governance-preflight-authority-test.mjs'});
}
test('historical R11 acceptance remains valid and locked without any successor request',()=>{
  const f=continuationFixture('locked');delete f.control.i66OperationalContinuation20261115;delete f.state.currentOperationalWorkPointer;
  assert.equal(g.continuationForPreflight(f.control,f.state,f.transport),null);runHistoricalPreflight(f);
});
for(const phase of ['build','preview','live'])test('R11 stays authoritative during closed operational '+phase+' phase',()=>{
  const f=continuationFixture(phase),before=clone(f);
  assert.equal(g.continuationForPreflight(f.control,f.state,f.transport),phase);runHistoricalPreflight(f);assert.deepEqual(f,before);
});
test('successor build cannot relabel acceptance or allow deployment/data writes',()=>{
  const changes=[
    f=>f.control.currentExecutionDecisionPointer='i66OperationalContinuation20261115',
    f=>f.state.currentExecutionDecisionPointer=f.state.currentOperationalWorkPointer,
    f=>delete f.state.currentOperationalWorkPointer,
    f=>delete f.control.i66OperationalContinuation20261115,
    f=>f.control.i66OperationalContinuation20261115.newLiveAcceptanceClaimed=true,
    f=>f.control.i66OperationalContinuation20261115.newFinancialWrites=1,
    f=>f.control.i66OperationalContinuation20261115.latestProvenLiveSource='0'.repeat(40),
    f=>f.transport.status='UNREVIEWED_PHASE',
    f=>f.transport.previewChannelReuseAuthorization.approvedByDirection=false,
    f=>f.transport.previewChannelReuseAuthorization.noBusinessDataWrites=false,
    f=>f.transport.previewChannelReuseAuthorization.expectedSourceSha='0'.repeat(40),
    f=>f.transport.livePromotionAuthorized=true,
    f=>f.transport.forbidBackendFunctionDeploy=false,
    f=>f.transport.forbidBackendLiveFunctionDeploy=false,
    f=>f.transport.forbidFirestoreRulesDataAuthWrites=false,
    f=>f.transport.noHostingPromotion=false,
    f=>f.transport.backendFunctionPreviewOnly=true,
    f=>f.transport.operationalReleaseCandidate=fixture().operationalReleaseCandidate
  ];
  for(const change of changes){const f=continuationFixture();change(f);assert.throws(()=>runHistoricalPreflight(f));}
});
test('successor Preview and LIVE preflight retain existing candidate and signed-QA guards',()=>{
  for(const phase of ['preview','live'])for(const [label,change] of mutations){const f=continuationFixture(phase);if(phase==='live'&&label==='preview may promote')f.transport.livePromotionAuthorized=false;else change(f.transport);assert.throws(()=>runHistoricalPreflight(f));}
  const f=continuationFixture('live');delete f.transport.operationalReleaseCandidate.previewQa;assert.throws(()=>runHistoricalPreflight(f));
});
test('an authorized successor never suppresses previous R11 source receipt or readback drift',()=>{
  const changes=[
    f=>f.state.currentLiveSuccessorAcceptance.sourceSha='0'.repeat(40),
    f=>f.control.i66R11RenewalDriveExactLiveRelease20261113.artifactDigest='sha256:'+'0'.repeat(64),
    f=>f.transport.i66R11RenewalDriveExactLiveCompleted20261113.hostingVersion='sites/ays-orbit-360-lab/versions/wrong'
  ];
  for(const phase of ['build','preview','live']){
    for(const change of changes){const f=continuationFixture(phase);change(f);assert.throws(()=>runHistoricalPreflight(f),/I6_6_EXACT_LIVE_RELEASE_POINTER_OR_READER_AUTHORIZATION_DRIFT/);}
    for(const mutation of [r=>r.realFinancialWrites=1,r=>r.sameFiles.preview=222,r=>r.fullI66ProductionAccepted=true]){
      assert.throws(()=>runHistoricalPreflight(continuationFixture(phase),(file,text)=>{if(file.endsWith('I6_6_R11_RENEWAL_DRIVE_EXACT_LIVE_RECEIPT_20261113.json')){const r=JSON.parse(text);mutation(r);return JSON.stringify(r);}return text;}),/I6_6_EXACT_LIVE_RELEASE_POINTER_OR_READER_AUTHORIZATION_DRIFT/);
    }
  }
});

test('signed focused reports must prove same source, restored synthetic scope and no actual payments',()=>{
  const p=fixture().operationalReleaseCandidate;
  const a={sourceSha:p.sourceSha,phase:'PREVIEW',status:'PASS',cleanup:{status:'PASS',remaining:0},checks:[{status:'PASS'}],realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0};
  const q={sourceSha:p.sourceSha,phase:'PREVIEW',status:'PASS',cleanup:{status:'PASS',remaining:0},checks:[{status:'PASS'}],syntheticOnly:true,realControlUnchanged:true};
  g.validateFocusedReports(p,'PREVIEW',a,q);
  for(const mutate of [x=>x.sourceSha='0'.repeat(40),x=>x.cleanup.remaining=1,x=>x.financialPayments=1,x=>x.status='HOLD',x=>x.checks=[]]){const bad=clone(a);mutate(bad);assert.throws(()=>g.validateFocusedReports(p,'PREVIEW',bad,q));}
  assert.throws(()=>g.validateFocusedReports(p,'PREVIEW',a,{...q,realControlUnchanged:false}));
});

test('existing workflows use dynamic artifact pins and closed targets, preserving prior signed regressions',()=>{
  const fs=require('node:fs');
  const preview=fs.readFileSync('.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','utf8');
  const live=fs.readFileSync('.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml','utf8');
  const build=fs.readFileSync('.github/workflows/gravicentra-release-delta-66-package.yml','utf8');
  for(const text of [preview,live]){
    assert.match(text,/workflow_dispatch:/);
    assert.doesNotMatch(text,/0153f5cbbe00c3732e11ebae59b32bd357e38bfd|14013250472|43371940341/);
    assert.match(text,/operational-release-candidate\.cjs (?:preview|live)/);
    assert.match(text,/sha256sum --check --quiet .*backend-manifest\.sha256/);
    assert.doesNotMatch(text,/> "\$FROOT\/bundle\/firebase\.json"/,'immutable bundle config must not be patched');
    assert.match(text,/advisor-payables-signed-uat\.cjs/);assert.match(text,/proposal-application-signed-uat\.cjs/);
    assert.match(text,/privileged-role-signed-ui-permissions-readonly\.cjs/);
    assert.match(text,/NON_TARGET_(?:BACKEND|FUNCTION_REVISION)_CHANGED/);
  }
  assert.match(preview,/--only functions:orbit360ProductOperationalCommandPreview,functions:orbit360CobrosReconciliationCommandPreview,functions:orbit360ScopedPolicyReadPreview/);
  assert.match(preview,/carlos-real-signed-synthetic-preview-uat\.cjs/);
  assert.match(live,/--only functions:orbit360ProductOperationalCommand,functions:orbit360CobrosReconciliationCommand,functions:orbit360ScopedPolicyRead/);
  assert.match(live,/carlos-paula-live-synthetic-ops-leads-uat\.cjs/);
  assert.match(live,/BACKEND_ROLLBACK_READBACK_FAILED/);assert.match(live,/HOSTING_ROLLBACK_READBACK_FAILED/);
  assert.match(live,/g\.validateProof\(p,proof\)/);
  assert.match(build,/OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED/);assert.match(build,/operationalTransport=true/);
  assert.deepEqual(g.PINNED_OWNER_PATHS.filter(p=>p.startsWith(':(exclude)')),[':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json']);
});

test('control-only push fallback dispatches neither wrong phase nor an unguarded deploy',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const cases=[
    ['.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED','exact-preview-only'],
    ['.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml','OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED','exact-role-live']
  ];
  for(const [file,expected,job] of cases){
    const code=fs.readFileSync(file,'utf8');
    const trigger=code.slice(code.indexOf('\non:')+1,code.indexOf('\npermissions:'));
    assert.match(trigger,/workflow_dispatch:/);
    assert.match(trigger,/push:\n    branches: \[recovery\/fase-a-clean-20260831\]\n    paths:\n      - artifacts\/orbit360-recovery\/release-control\/I6_6_RELEASE_TRANSPORT_CONTROL_20261110\.json\s*$/);
    assert.equal((trigger.match(/\n      - /g)||[]).length,1,'push must target only the canonical control file');
    const phase=code.slice(code.indexOf('\n  phase:'),code.indexOf('\n  '+job+':'));
    assert.doesNotMatch(phase,/secrets\.|GH_TOKEN|firebase|curl |fetch\(|deploy |writeFileSync|execSync|spawn/,'phase must not authorize or mutate anything');
    assert.match(phase,/persist-credentials: false/);
    const script=phase.match(/node - <<'NODE'\n([\s\S]*?)\n          NODE/)[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
    const body=code.slice(code.indexOf('\n  '+job+':'));
    assert.match(body,/needs: phase\n    if: [^\n]*needs\.phase\.outputs\.authorized == 'true'/);
    for(const status of [expected,'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED','OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED','PACKAGE_PREVIEW_ONLY',undefined,'']){
      const output=[];
      vm.runInNewContext(script,{
        require:name=>{assert.equal(name,'node:fs');return{
          readFileSync:(path,encoding)=>{assert.equal(path,g.CONTROL);assert.equal(encoding,'utf8');return JSON.stringify({status});},
          appendFileSync:(path,value)=>{assert.equal(path,'test-output');output.push(value);}
        };},process:{env:{GITHUB_OUTPUT:'test-output'}},console:{log:()=>{}}
      });
      assert.deepEqual(output,['authorized='+String(status===expected)+'\n']);
    }
    assert.throws(()=>vm.runInNewContext(script,{require:()=>({readFileSync:()=>'{malformed'}),process:{env:{}},console:{log:()=>{}}}));
  }
});
