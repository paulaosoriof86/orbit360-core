'use strict';
// Pure candidate/runtime binding tests. No credentials, cloud calls, legal
// acceptance, deployment or business writes are performed by this suite.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function fixture(phase='preview',historical=false){
  const sourceSha='9'.repeat(40),buildRunId=44009981499;
  const previous={sourceSha:'8'.repeat(40),buildId:'gi-i66-'+ '8'.repeat(12)+'-57f234755dc1',
    artifactId:101,artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:102,liveCloneRunId:103,
    liveHostingVersion:'sites/ays-orbit-360-lab/versions/old-v1'};
  const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
    status:phase==='preview'?'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED':'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED',
    sourceSha,buildRunId,artifactId:202,artifactDigest:'sha256:'+'b'.repeat(64),
    previewUrl:historical?g.PREVIEW:'https://ays-orbit-360-lab--gi-i66-rc-'+buildRunId+'-d08psr2y.web.app',
    previewChannelId:historical?g.CHANNEL:'gi-i66-rc-'+buildRunId,
    ...(historical?{}:{buildId:'gi-i66-'+sourceSha.slice(0,12)+'-57f234755dc1'}),
    targets:copy(g.TARGETS),requiredPreviewDrivers:[...g.DRIVERS],sameImmutableArtifactOnly:true,
    syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,
    rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,
    syntheticQaIsolation:copy(g.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:copy(g.ADVISOR_QA_ISOLATION),
    currentLive:{sourceSha:previous.sourceSha,buildId:previous.buildId,artifactId:previous.artifactId,
      artifactDigest:previous.artifactDigest,buildRunId:previous.previewRunId,liveRunId:previous.liveCloneRunId,
      hostingVersion:previous.liveHostingVersion}};
  if(phase==='live')p.previewQa={runId:301,headSha:'c'.repeat(40),receiptArtifactId:302,
    receiptArtifactDigest:'sha256:'+'d'.repeat(64),status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'};
  return {gate:'I6.6',historicalClosedGate:'B4-007',
    status:phase==='preview'?'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED':'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',
    forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,
    backendFunctionPreviewOnly:phase==='preview',forbidBackendLiveFunctionDeploy:phase==='preview',
    livePromotionAuthorized:phase==='live',previewApproved:phase==='live',noHostingPromotion:phase==='preview',
    currentExactHostingRelease:previous,operationalReleaseCandidate:p};
}
const marker=p=>({product:'Gravicentra Insurance',gate:'I6.6',sourceSha:p.sourceSha,
  buildId:p.buildId||'gi-i66-'+p.sourceSha.slice(0,12)+'-57f234755dc1',environmentRef:'same-project-preview'});
function proof(p){return {schema:'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1',
  status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS',
  ...Object.fromEntries(['sourceSha','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId','buildId']
    .filter(key=>p[key]!==undefined).map(key=>[key,p[key]])),
  targets:copy(g.TARGETS.preview),signedDrivers:[...g.DRIVERS],realFinancialOrCustomerWrites:0,
  syntheticRestoreComplete:true,liveHostingUnchanged:true,liveBackendUnchanged:true,
  focusedReports:Object.fromEntries(['advisorPayables','proposalApplication'].map(key=>[key,
    {status:'PASS',cleanup:'PASS',checks:5,digest:'sha256:'+'e'.repeat(64)}]))};}

function observabilityCandidate(){
  const c=fixture(),p=c.operationalReleaseCandidate;
  p.buildRunId=44030000001;
  p.previewRollover=require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').technicalRolloverCandidatePin();
  p.previewUrl=p.previewRollover.origin;p.previewChannelId=p.previewRollover.channel;
  p.signedObservabilityProfile=g.SIGNED_OBSERVABILITY_PROFILE;
  return c;
}
function observabilityProof(p){
  const q=proof(p);
  q.focusedReports.advisorPayables.observability={profile:g.SIGNED_OBSERVABILITY_PROFILE,status:'PASS',
    unexpectedConsoleErrors:0,unexpectedHttpErrors:0,pageErrorCount:0,telemetryFailures:0};
  q.focusedReports.proposalApplication.observability={profile:g.SIGNED_OBSERVABILITY_PROFILE,status:'PASS',mode:'UI_RESPONSE_CAPTURED_EXACT'};
  return q;
}
test('current exact rollover requires the signed browser observability profile',()=>{
  const c=observabilityCandidate();assert.equal(g.SIGNED_OBSERVABILITY_PROFILE,'I66_SIGNED_BROWSER_OBSERVABILITY_V1');
  g.candidateForPhase(c,'preview');g.validateProof(c.operationalReleaseCandidate,observabilityProof(c.operationalReleaseCandidate));
  for(const value of [undefined,null,false,'PASS','different']){
    const bad=copy(c);bad.operationalReleaseCandidate.signedObservabilityProfile=value;
    assert.throws(()=>g.candidateForPhase(bad,'preview'),/OBSERVABILITY_PROFILE/);
  }
});
for(const key of ['profile','status','unexpectedConsoleErrors','unexpectedHttpErrors','pageErrorCount','telemetryFailures']){
  test('signed acceptance proof cannot omit or dilute browser attribution '+key,()=>{
    const p=observabilityCandidate().operationalReleaseCandidate;
    for(const value of [undefined,null,1,'0',false]){
      const q=observabilityProof(p);q.focusedReports.advisorPayables.observability[key]=value;
      assert.throws(()=>g.validateProof(p,q),/ATTRIBUTION_PROOF_REQUIRED/);
    }
  });
}
test('signed proof requires classified UI response or exact causal readback, not workflow success alone',()=>{
  const p=observabilityCandidate().operationalReleaseCandidate;
  for(const mode of ['UI_RESPONSE_CAPTURED_EXACT','UI_REQUEST_RELOAD_DURABLE_READBACK_EXACT']){
    const q=observabilityProof(p);q.focusedReports.proposalApplication.observability.mode=mode;g.validateProof(p,q);
  }
  for(const mutate of [q=>delete q.focusedReports.advisorPayables.observability,
    q=>delete q.focusedReports.proposalApplication.observability,
    q=>q.focusedReports.proposalApplication.observability.profile='different',
    q=>q.focusedReports.proposalApplication.observability.status='HOLD',
    q=>q.focusedReports.proposalApplication.observability.mode='WORKFLOW_SUCCESS']){
    const q=observabilityProof(p);mutate(q);assert.throws(()=>g.validateProof(p,q));
  }
});
test('focused-report validation delegates to both exact pure validators and propagates their holds',()=>{
  const calls=[],browser={fixture:'exact-browser-proof'},ui={status:'PASS',mode:'UI_RESPONSE_CAPTURED_EXACT',observation:{fixture:'exact-ui'},causalEvidence:{fixture:'exact-causal'}};
  let rejectBrowser=false,rejectUi=false;
  const module={exports:{}};
  const wrappedRequire=name=>{
    if(name==='./gravicentra-i6-6-advisor-payables-signed-uat.cjs')return {validateBrowserObservability(value){calls.push('browser');assert.deepEqual(value,browser);if(rejectBrowser)throw Error('BROWSER_HOLD');}};
    if(name==='./gravicentra-i6-6-proposal-uat-diagnostics.cjs')return {validateUiApplicationEvidence(o,c){calls.push('ui');assert.deepEqual(o,ui.observation);assert.deepEqual(c,ui.causalEvidence);if(rejectUi)throw Error('UI_HOLD');return ui;}};
    return require(name);
  };
  vm.runInNewContext(read('tools/gravicentra-i6-6-operational-release-candidate.cjs'),{require:wrappedRequire,module,exports:module.exports,process,console,Buffer});
  const p={sourceSha:'9'.repeat(40),signedObservabilityProfile:g.SIGNED_OBSERVABILITY_PROFILE};
  const common={sourceSha:p.sourceSha,phase:'PREVIEW',status:'PASS',cleanup:{status:'PASS',remaining:0},checks:['verified']};
  const a={...common,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0,browserObservability:browser};
  const q={...common,syntheticOnly:true,realControlUnchanged:true,uiApplicationConfirmation:ui};
  module.exports.validateFocusedReports(p,'PREVIEW',a,q);assert.deepEqual(calls,['browser','ui']);
  rejectBrowser=true;assert.throws(()=>module.exports.validateFocusedReports(p,'PREVIEW',a,q),/BROWSER_HOLD/);
  rejectBrowser=false;rejectUi=true;assert.throws(()=>module.exports.validateFocusedReports(p,'PREVIEW',a,q),/UI_HOLD/);
});

for(const phase of ['preview','live'])for(const historical of [false,true]){
  test(phase+' binds '+(historical?'the exact historical endpoint':'the same-build new endpoint'),()=>{
    const c=fixture(phase,historical),p=c.operationalReleaseCandidate;
    assert.equal(g.candidateForPhase(c,phase),p);
    assert.deepEqual(g.previewIdentity(p),{origin:p.previewUrl,channelId:p.previewChannelId,historical});
    assert.equal(g.validateBuildMarker(p,marker(p),copy(marker(p))).sourceSha,p.sourceSha);
    g.validateProof(p,proof(p));
  });
}
const originMutations=[
  ['foreign site',p=>p.previewUrl=p.previewUrl.replace('ays-orbit-360-lab--','other-site--')],
  ['LIVE as Preview',p=>p.previewUrl=g.LIVE],
  ['HTTP',p=>p.previewUrl=p.previewUrl.replace('https:','http:')],
  ['userinfo',p=>p.previewUrl=p.previewUrl.replace('https://','https://user:password@')],
  ['default port',p=>p.previewUrl+=':443'],
  ['other port',p=>p.previewUrl+=':8443'],
  ['trailing slash',p=>p.previewUrl+='/'],
  ['path',p=>p.previewUrl+='/app'],
  ['query',p=>p.previewUrl+='?source=approved'],
  ['fragment',p=>p.previewUrl+='#/ops'],
  ['hostname suffix attack',p=>p.previewUrl+='.example.invalid'],
  ['extra domain label',p=>p.previewUrl=p.previewUrl.replace('.web.app','.extra.web.app')],
  ['encoded hostname',p=>p.previewUrl=p.previewUrl.replace('ays-','%61ys-')],
  ['URL normalization',p=>p.previewUrl=p.previewUrl.replace('https://','HTTPS://')],
  ['trailing whitespace',p=>p.previewUrl+='\n'],
  ['wrong channel',p=>p.previewChannelId='gi-i66-rc-123'],
  ['different run',p=>p.buildRunId++],
  ['old URL with new channel',p=>p.previewUrl=g.PREVIEW],
  ['old channel with new URL',p=>p.previewChannelId=g.CHANNEL],
  ['missing buildId',p=>delete p.buildId],
  ['buildId for different source',p=>p.buildId='gi-i66-'+ '1'.repeat(12)+'-57f234755dc1'],
  ['buildId newline',p=>p.buildId+='\n'],
  ['invalid buildId suffix',p=>p.buildId='gi-i66-'+p.sourceSha.slice(0,12)+'-latest']
];
for(const [label,mutate] of originMutations)test('candidate binding rejects '+label,()=>{
  const c=fixture();mutate(c.operationalReleaseCandidate);assert.throws(()=>g.candidateForPhase(c,'preview'));
});
const markerMutations=[
  ['source',m=>m.sourceSha='7'.repeat(40)],['gate',m=>m.gate='I6.5'],
  ['product',m=>m.product='Other product'],['missing buildId',m=>delete m.buildId],
  ['buildId newline',m=>m.buildId+='\n'],
  ['buildId/source',m=>m.buildId='gi-i66-'+ '7'.repeat(12)+'-57f234755dc1'],
  ['buildId/config',m=>m.buildId=m.buildId.replace('57f234755dc1','111111111111')]
];
for(const [label,mutate] of markerMutations)test('marker rejects '+label+' drift',()=>{
  const p=fixture().operationalReleaseCandidate,m=marker(p);mutate(m);
  assert.throws(()=>g.validateBuildMarker(p,m));
});
test('hosted marker must equal every field of the immutable package marker',()=>{
  const p=fixture().operationalReleaseCandidate,m=marker(p);
  for(const packaged of [{...m,environmentRef:'different-environment'},{...m,unapproved:true},
    {...m,sourceSha:'0'.repeat(40)}])assert.throws(()=>g.validateBuildMarker(p,m,packaged));
});
test('historical marker without an explicit buildId still must match the artifact exactly',()=>{
  const p=fixture('preview',true).operationalReleaseCandidate,m=marker(p);
  g.validateBuildMarker(p,m,copy(m));
  assert.throws(()=>g.validateBuildMarker(p,{...m,buildId:m.buildId.replace('57f234755dc1','111111111111')},m));
});
test('all four signed drivers inherit one candidate endpoint and source',()=>{
  const p=fixture().operationalReleaseCandidate,env=g.envFor(p);
  for(const name of ['I66_PREVIEW_ORIGIN','I66_ROLE_PREVIEW_ORIGIN','I66_SIGNED_MATRIX_ORIGIN'])assert.equal(env[name],p.previewUrl);
  for(const name of ['I66_SIGNED_QA_CHANNEL_ID','I66_ROLE_PREVIEW_CHANNEL'])assert.equal(env[name],p.previewChannelId);
  for(const name of ['SOURCE_SHA','I66_SOURCE_SHA','I66_ROLE_SOURCE_SHA'])assert.equal(env[name],p.sourceSha);
  assert.equal(env.I66_EXPECTED_BUILD_ID,p.buildId);
  for(const file of ['tools/gravicentra-i6-6-carlos-real-signed-synthetic-preview-uat.cjs',
    'tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs','tools/gravicentra-i6-6-proposal-application-signed-uat.cjs'])
    assert.match(read(file),/I66_PREVIEW_ORIGIN/);
  const matrix=read('tools/gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs');
  assert.match(matrix,/release\.signedMatrixBinding\(process\.env,control\)/);
  assert.match(matrix,/release\.validateBuildMarker\(binding\.candidate,await response\.json\(\),packaged\)/);
  assert.ok(matrix.indexOf('await proveCandidateMarker();')<matrix.indexOf('const all=await actors()'));
});
for(const phase of ['preview','live'])test('signed matrix uses exact '+phase+' candidate and never an old Preview',()=>{
  const c=fixture(phase),p=c.operationalReleaseCandidate,env=g.envFor(p);
  if(phase==='live')env.I66_SIGNED_MATRIX_ORIGIN=g.LIVE;
  const b=g.signedMatrixBinding(env,c);
  assert.equal(b.origin,phase==='live'?g.LIVE:p.previewUrl);assert.equal(b.preview,p.previewUrl);assert.equal(b.candidate,p);
  for(const mutate of [e=>e.I66_SIGNED_MATRIX_ORIGIN=g.PREVIEW,e=>delete e.I66_SIGNED_MATRIX_ORIGIN,
    e=>e.I66_SOURCE_SHA='1'.repeat(40),e=>e.I66_PREVIEW_ORIGIN=g.PREVIEW,
    e=>e.I66_SIGNED_QA_CHANNEL_ID=g.CHANNEL]){
    const bad={...env};mutate(bad);assert.throws(()=>g.signedMatrixBinding(bad,c));
  }
});
test('matrix legacy fallback is available only outside operational mode',()=>{
  assert.equal(g.signedMatrixBinding({},null).origin,g.PREVIEW);
  assert.equal(g.signedMatrixBinding({I66_SIGNED_MATRIX_ORIGIN:g.LIVE},null).origin,g.LIVE);
  assert.throws(()=>g.signedMatrixBinding({I66_SIGNED_MATRIX_ORIGIN:fixture().operationalReleaseCandidate.previewUrl},null));
  assert.throws(()=>g.signedMatrixBinding({I66_OPERATIONAL_CANDIDATE:'true'},{}));
});
test('LIVE authorization rechecks the exact Preview before production and then reads exact LIVE',()=>{
  const c=fixture('live'),p=c.operationalReleaseCandidate,env=g.envFor(p),before=copy(c);
  const preview=g.signedMatrixBinding(env,c);
  assert.equal(preview.phase,'preview');assert.equal(preview.origin,p.previewUrl);
  assert.equal(preview.preview,p.previewUrl);assert.equal(preview.candidate,p);
  const live=g.signedMatrixBinding({...env,I66_SIGNED_MATRIX_ORIGIN:g.LIVE},c);
  assert.equal(live.phase,'live');assert.equal(live.origin,g.LIVE);
  assert.equal(live.preview,p.previewUrl);assert.equal(live.candidate,p);
  assert.deepEqual(c,before,'read-only binding must not change deployment authorization');
});
test('Preview authorization cannot read LIVE even with well-formed Preview proof metadata',()=>{
  const c=fixture(),p=c.operationalReleaseCandidate;
  p.previewQa=copy(fixture('live').operationalReleaseCandidate.previewQa);
  assert.throws(()=>g.signedMatrixBinding({...g.envFor(p),I66_SIGNED_MATRIX_ORIGIN:g.LIVE},c));
});
const liveRecheckAuthorityMutations=[
  ['closed control',c=>c.status='R11_RENEWAL_DRIVE_EXACT_LIVE_ACCEPTED_LOCKED'],
  ['build phase',c=>c.status='PREVIEW_BUILD_REQUESTED'],
  ['unapproved candidate',c=>c.operationalReleaseCandidate.approvedByDirection=false],
  ['LIVE deployment forbidden',c=>c.forbidBackendLiveFunctionDeploy=true],
  ['backend deployment forbidden',c=>c.forbidBackendFunctionDeploy=true],
  ['LIVE authorization absent',c=>c.livePromotionAuthorized=false],
  ['Preview approval absent',c=>c.previewApproved=false],
  ['Preview-only backend scope',c=>c.backendFunctionPreviewOnly=true],
  ['Hosting promotion forbidden',c=>c.noHostingPromotion=true],
  ['Firestore or Auth writes unlocked',c=>c.forbidFirestoreRulesDataAuthWrites=false]
];
for(const [label,mutate] of liveRecheckAuthorityMutations)test('LIVE Preview recheck preserves full authorization checks: '+label,()=>{
  const c=fixture('live'),env=g.envFor(c.operationalReleaseCandidate);mutate(c);
  assert.throws(()=>g.signedMatrixBinding(env,c));
});
const liveRecheckProofMutations=[
  ['missing proof',p=>delete p.previewQa],
  ['unaccepted proof',p=>p.previewQa.status='HOLD'],
  ['missing run',p=>delete p.previewQa.runId],
  ['invalid head',p=>p.previewQa.headSha='latest'],
  ['invalid artifact',p=>p.previewQa.receiptArtifactId=0],
  ['invalid artifact digest',p=>p.previewQa.receiptArtifactDigest='PASS']
];
for(const [label,mutate] of liveRecheckProofMutations)test('LIVE Preview recheck cannot bypass signed proof: '+label,()=>{
  const c=fixture('live'),env=g.envFor(c.operationalReleaseCandidate);mutate(c.operationalReleaseCandidate);
  assert.throws(()=>g.signedMatrixBinding(env,c));
});
test('LIVE authorized Preview recheck rejects every stale origin and source environment pin',()=>{
  const c=fixture('live'),env=g.envFor(c.operationalReleaseCandidate);
  for(const mutate of [e=>e.I66_SIGNED_MATRIX_ORIGIN=g.PREVIEW,e=>delete e.I66_SIGNED_MATRIX_ORIGIN,
    e=>e.I66_SIGNED_MATRIX_ORIGIN+='/',e=>e.I66_SIGNED_MATRIX_ORIGIN='https://other.invalid',
    e=>e.I66_SOURCE_SHA='1'.repeat(40),e=>e.I66_PREVIEW_ORIGIN=g.PREVIEW,
    e=>e.I66_SIGNED_QA_CHANNEL_ID=g.CHANNEL]){
    const bad={...env};mutate(bad);assert.throws(()=>g.signedMatrixBinding(bad,c));
  }
});
test('signed proof cannot substitute channel build run buildId or digest',()=>{
  const p=fixture('live').operationalReleaseCandidate;
  for(const mutate of [x=>x.previewChannelId=g.CHANNEL,x=>x.previewUrl=g.PREVIEW,x=>x.buildRunId++,
    x=>delete x.buildId,x=>x.buildId+='x',x=>x.artifactId++,x=>x.artifactDigest='sha256:'+'0'.repeat(64)]){
    const bad=proof(p);mutate(bad);assert.throws(()=>g.validateProof(p,bad));
  }
});
test('GitHub workflow source artifact ID and digest verification remain mandatory',()=>{
  const p=fixture().operationalReleaseCandidate;
  const run={id:p.buildRunId,conclusion:'success',head_sha:p.sourceSha,path:'.github/workflows/gravicentra-release-delta-66-package.yml'};
  const artifact={id:p.artifactId,digest:p.artifactDigest,expired:false,name:'gi-i66-immutable-'+p.sourceSha,
    workflow_run:{id:p.buildRunId,head_sha:p.sourceSha}};
  g.validateArtifact(p,run,artifact);
  for(const bad of [{...run,id:1},{...run,head_sha:'0'.repeat(40)},{...run,conclusion:'failure'},
    {...run,path:'.github/workflows/other.yml'}])assert.throws(()=>g.validateArtifact(p,bad,artifact));
  for(const bad of [{...artifact,id:1},{...artifact,digest:'sha256:'+'0'.repeat(64)},
    {...artifact,workflow_run:{id:1,head_sha:p.sourceSha}},{...artifact,expired:true}])assert.throws(()=>g.validateArtifact(p,run,bad));
});
test('exact LIVE transport selects candidate endpoint; legacy is not an operational fallback',()=>{
  const code=read('tools/gravicentra-i66-privileged-role-exact-live-transport.mjs');
  const prefix=code.slice(code.indexOf('const operational='),code.indexOf('const PREVIOUS='));
  const run=(env,control)=>vm.runInNewContext(prefix+'\n({SOURCE,PREVIEW,CHANNEL})',{
    operationalGuard:g,process:{env},fs:{readFileSync:()=>JSON.stringify(control)},JSON});
  const c=fixture('live'),p=c.operationalReleaseCandidate;
  const current=run({I66_OPERATIONAL_CANDIDATE:'true'},c);
  assert.equal(current.SOURCE,p.sourceSha);assert.equal(current.PREVIEW,p.previewUrl);assert.equal(current.CHANNEL,p.previewChannelId);
  assert.equal(run({},null).PREVIEW,g.PREVIEW);
  assert.throws(()=>run({I66_OPERATIONAL_CANDIDATE:'true'},{}));
  assert.match(code,/operationalGuard\.validateBuildMarker\(operational,await marker\(PREVIEW\),pkg\)/);
  assert.match(code,/getVersion\(CHANNEL\)/);assert.match(code,/I66_ROLE_LIVE_VERSION_DIFFERS_FROM_PREVIEW/);
});
test('workflows have no stale Preview default and validate the downloaded package marker',()=>{
  const preview=read('.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml');
  const live=read('.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml');
  for(const code of [preview,live]){
    assert.doesNotMatch(code,/42868854629|abj14q6n/);
    assert.match(code,/node --test tools\/gravicentra-i6-6-preview-candidate-binding\.test\.cjs/);
    assert.match(code,/operational-release-candidate\.cjs (?:preview|live)/);
    assert.match(code,/artifact-ids: \$\{\{ env\.(?:SOURCE_ARTIFACT_ID|I66_ROLE_ARTIFACT_ID) \}\}/);
  }
  assert.match(preview,/g\.validateBuildMarker\(p,hosted,packaged\)/);
  assert.ok(preview.indexOf('g.validateBuildMarker(p,hosted,packaged)')<preview.indexOf('node "$I66_ROLE_FIREBASE_CLI" deploy'));
  assert.match(live,/I66_SIGNED_MATRIX_ORIGIN=https:\/\/app\.aysseguros\.com node tools\/gravicentra-i66-privileged-role-signed-ui-permissions-readonly\.cjs/);
});
test('binding tests and every affected owner remain sealed before a new build',()=>{
  assert.ok(g.PINNED_OWNER_PATHS.includes('tools/gravicentra-i6-6-preview-candidate-binding.test.cjs'));
  for(const file of ['tools/gravicentra-i6-6-operational-release-candidate.cjs',
    'tools/gravicentra-i66-privileged-role-exact-live-transport.mjs',
    'tools/gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs',
    '.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',
    '.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml'])assert.ok(g.PINNED_OWNER_PATHS.includes(file));
  assert.deepEqual(g.PINNED_OWNER_PATHS.filter(p=>p.startsWith(':(exclude)')),[':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json']);
  const code=read('.github/workflows/gravicentra-release-delta-66-package.yml');
  assert.match(code,/node --test tools\/gravicentra-i6-6-preview-candidate-binding\.test\.cjs/);
  assert.match(code,/      - tools\/gravicentra-i6-6-preview-candidate-binding\.test\.cjs/);
});
test('legal authority remains a separate fail-closed gate for the new origin',()=>{
  const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  const p=fixture().operationalReleaseCandidate;
  assert.throws(()=>legal.validateDecision({receipt:{},receiptSha256:'a'.repeat(64),candidate:p,
    cfg:{phase:'PREVIEW',origin:p.previewUrl,source:p.sourceSha},sourceParent:'b'.repeat(40),actor:{}}),/DIRECTION_LEGAL_ORIGIN_MISMATCH/);
  for(const file of ['tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs','tools/gravicentra-i6-6-proposal-application-signed-uat.cjs'])
    assert.match(read(file),/await acceptDirectionPreviewLegal\(/);
  assert.match(read('tools/gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),/futureSourceSuccessors:false/);
});
