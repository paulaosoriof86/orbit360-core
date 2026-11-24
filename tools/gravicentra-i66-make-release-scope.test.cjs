'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const s=require('./gravicentra-i66-make-release-scope.cjs'),g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=v=>structuredClone(v);
function fixture(){
 const physical={sourceSha:'1'.repeat(40),buildId:'gi-i66-'+ '1'.repeat(12)+'-57f234755dc1',artifactId:148,
  artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:149,liveCloneRunId:150,liveHostingVersion:'sites/ays-orbit-360-lab/versions/physical'};
 const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',
  opsLeadsComposite:true,makeIngressComposite:true,compositeVersion:2,sourceSha:'2'.repeat(40),
  buildId:'gi-i66-'+ '2'.repeat(12)+'-57f234755dc1',buildRunId:151,artifactId:152,artifactDigest:'sha256:'+'b'.repeat(64),
  previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-151-ab12cd34.web.app',previewChannelId:'gi-i66-rc-151',
  targets:clone(g.MAKE_TARGETS),requiredPreviewDrivers:[...g.DRIVERS],expectedSiteFileCount:224,
  opsLeadsBackendPath:'functions/product-ops-leads-domain.js',opsLeadsBackendBlobSha:'b'.repeat(40),
  currentPhysicalLive:clone(physical),currentLive:{sourceSha:physical.sourceSha,buildId:physical.buildId,artifactId:physical.artifactId,
    artifactDigest:physical.artifactDigest,buildRunId:physical.previewRunId,liveRunId:physical.liveCloneRunId,hostingVersion:physical.liveHostingVersion},
  sameImmutableArtifactOnly:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:false,
  noRulesAuthMembershipWrites:true,onlyExactSecretIamDeltaAllowed:true,rollbackThreeBackendRevisionsAndHosting:true,
  rollbackFiveBackendRevisionsAndHosting:true,syntheticQaIsolation:clone(g.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:clone(g.ADVISOR_QA_ISOLATION),
  financialPreviewQa:{receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_E6_FINANCIAL_PREVIEW_RECEIPT.json',
    receiptBlob:'f'.repeat(40),previewReadOnlyAuthorityBlob:'e'.repeat(40),qaRunId:153,qaArtifactId:154,
    qaArtifactDigest:'sha256:'+'c'.repeat(64),qaReportSha256:'d'.repeat(64)},
  makeIngress:{schema:s.SCOPE,scopeContractPath:s.CONTRACT_PATH,scopeContractBlob:s.CONTRACT_BLOB,sourceSha:'2'.repeat(40),
    communicationDecision:{path:s.COMMUNICATION_DECISION_PATH,gitBlobSha:s.COMMUNICATION_DECISION_BLOB},
    tenantId:'alianzas-soluciones',country:'GT',instanceId:'710522720868',scenarioId:10196136,firestoreConnectionId:14756714,
    assignment:'pending_operations',outboundEnabled:false,noBackfill:true,authContextEventType:s.EVENT_TYPE,deployState:'CLOSED',
    realLeadActivationAfterCommittedOnly:true,rollbackNewFunctionAndExactSecretDelta:true,queueConfigurationWritesOutsideDataOnly:true,
    sourcePaths:[...s.SOURCE_PATHS],sourceBlobs:Object.fromEntries(s.SOURCE_PATHS.map(p=>[p,'b'.repeat(40)])),
    balanceCorrection:clone(s.BALANCE_CORRECTION),
    runtimeAccess:{principal:s.RUNTIME,receiptPath:s.RUNTIME_RECEIPT_PATH,receiptBlob:s.RUNTIME_RECEIPT_BLOB,
      reportDigest:s.RUNTIME_REPORT_DIGEST,firestoreCapabilitiesVerified:true},
    permissions:{secretResource:s.SECRET,role:'roles/secretmanager.secretAccessor',principal:s.RUNTIME,
      exactSecretResourceOnly:true,etagCompareAndSwap:true,projectIamWrites:0,rulesAuthMembershipWrites:0,forbidCliProjectIamMutation:true},
    queueRules:{sourcePath:'firestore.b4-003-scoped-candidate.rules',sourceBlob:'c'.repeat(40)},
    closedConfiguration:{preview:{expectedDigest:'ABSENT',nonce:'d'.repeat(64)},live:{expectedDigest:'ABSENT',nonce:'e'.repeat(64)}},
    targetBefore:Object.fromEntries(['preview','live'].map(ph=>[ph,{...s.ADDED[ph],state:'ABSENT',revision:null}]))}};
 const control={gate:'I6.6',historicalClosedGate:'B4-007',status:'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',forbidBackendFunctionDeploy:false,
  forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:true,forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,
  previewApproved:false,noHostingPromotion:true,currentPhysicalHostingRelease:physical,operationalReleaseCandidate:p};
 return{p,control};
}
function trigger(p,phase){return{...s.ADDED[phase],revision:s.ADDED[phase].name.toLowerCase()+'-00001-x',runtimePrincipal:s.RUNTIME,
 eventType:s.EVENT_TYPE,database:'(default)',document:'tenants/alianzas-soluciones/'+(phase==='preview'?'previewLeadIngressRequests':'leadIngressRequests')+'/{requestId}',
 queueRulesDenyClient:true,closedConfigurationVerified:true,probeOnly:true,realAuthContextObserved:true,configurationDigest:'a'.repeat(64),
 principalProbeDigest:'b'.repeat(64),principalSha256:'c'.repeat(64),authType:'unknown',canonicalLeadWrites:0,canonicalAuditWrites:0,
 notificationsCreated:0,externalMessagesSent:0,providerRequests:0,
 projectIamReadback:{status:'PROJECT_IAM_UNCHANGED_AND_CLI_WRITES_FORBIDDEN',cliVersion:'14.10.1',projectIamWrites:0,beforeDigest:'d'.repeat(64),afterDigest:'d'.repeat(64)}};}
test('explicit successor keeps historical3/4 unchanged and admits exactly5 targets with closed ingress',()=>{
 const {p,control}=fixture();assert.equal(g.candidateForPhase(control,'preview'),p);
 assert.equal(g.TARGETS.preview.length,3);assert.equal(g.COMPOSITE_TARGETS.preview.length,4);
 assert.deepEqual(g.MAKE_TARGETS.preview.slice(0,4),g.COMPOSITE_TARGETS.preview);assert.deepEqual(g.MAKE_TARGETS.live.slice(0,4),g.COMPOSITE_TARGETS.live);
 assert.equal(g.targetsForCandidate(p,'preview').length,5);assert.deepEqual(g.targetsForCandidate(p,'live')[4],s.ADDED.live);
});
test('new scope cannot widen targets, principal, IAM, source, phase, activation or mutable data permission',()=>{
 const mutations=[p=>p.targets.live.push({name:'other',region:'us-central1'}),p=>p.makeIngressComposite=false,
  p=>p.compositeVersion=1,p=>p.makeIngress.runtimeAccess.principal='other@ays-orbit-360-lab.iam.gserviceaccount.com',
  p=>p.makeIngress.permissions.projectIamWrites=1,p=>p.makeIngress.permissions.secretResource='projects/other/secrets/other',
  p=>p.makeIngress.permissions.etagCompareAndSwap=false,p=>p.makeIngress.sourcePaths.push('functions/other.js'),
  p=>p.makeIngress.sourceBlobs.extra='c'.repeat(40),p=>p.makeIngress.deployState='ACTIVE',
  p=>p.makeIngress.realLeadActivationAfterCommittedOnly=false,p=>p.makeIngress.outboundEnabled=true,
  p=>p.noRealFinancialOrCustomerWrites=false,p=>p.noRulesAuthIamWrites=true,p=>p.makeIngress.targetBefore.live.revision='invented',
  p=>p.makeIngress.authContextEventType='google.cloud.firestore.document.v1.created',
  p=>delete p.makeIngress.balanceCorrection,p=>p.makeIngress.balanceCorrection.gitBlobSha='0'.repeat(40),
  p=>p.makeIngress.balanceCorrection.requiredStagesPerPhase=12,p=>p.makeIngress.balanceCorrection.fullA04A12A14Acceptance=true];
 for(const mutate of mutations){const {p,control}=fixture();mutate(p);assert.throws(()=>g.candidateForPhase(control,'preview'));}
});
test('five-function scoped Preview preserves the existing physical production lock',()=>{
 const {p,control}=fixture();delete control.operationalReleaseCandidate;
 Object.assign(control,{status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,
  scopedBackendPreviewI66:{schema:'GI_I66_SCOPED_BACKEND_PREVIEW_AUTHORIZATION_V1',status:s.PREVIEW_STATUS,approvedByDirection:true,
   noLiveOrFinancialWrites:true,noRulesAuthIamWrites:false,noRulesAuthMembershipWrites:true,onlyExactSecretIamDeltaAllowed:true,
   sameImmutableArtifactOnly:true,currentPhysicalLiveSourceSha:control.currentPhysicalHostingRelease.sourceSha,
   currentPhysicalLiveArtifactDigest:control.currentPhysicalHostingRelease.artifactDigest,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,candidate:p}});
 assert.equal(g.candidateForPhase(control,'preview'),p);assert.equal(control.forbidBackendFunctionDeploy,true);
 assert.throws(()=>g.candidateForPhase(control,'live'),/SCOPED_AUTHORIZATION_CANNOT_DEPLOY_LIVE/);
});
test('ABSENT permits only the declared trigger addition and never an unrelated inventory or revision change',()=>{
 const {p}=fixture(),targets=g.MAKE_TARGETS.live,before=targets.slice(0,4).map(t=>({entryPoint:t.name,region:t.region,revision:'before-'+t.name}));
 before.push({entryPoint:'unrelatedFunction',region:'us-east1',revision:'untouched'});
 const after=before.map(r=>({...r}));after.push({entryPoint:s.ADDED.live.name,region:s.ADDED.live.region,revision:'new'});
 assert.equal(s.validateInventoryAfter(p,'live',before,after,targets),true);
 for(const mutate of [r=>r.push({entryPoint:'unapproved',region:'us-central1'}),r=>r.splice(0,1),r=>r.find(x=>x.entryPoint==='unrelatedFunction').revision='changed',
  r=>r.find(x=>x.entryPoint===s.ADDED.live.name).region='us-east1']){const rows=clone(after);mutate(rows);assert.throws(()=>s.validateInventoryAfter(p,'live',before,rows,targets));}
 assert.throws(()=>s.validateInventoryBefore(p,'live',after,targets),'existing trigger cannot be mislabeled ABSENT');
});
test('preexisting approved trigger requires its exact previous revision for safe retry/rollback',()=>{
 const {p}=fixture(),t=s.ADDED.preview;
 p.makeIngress.targetBefore.preview={...t,state:'EXISTING_APPROVED',revision:'prior-real-revision',configurationDigest:'b'.repeat(64),receiptBlob:'c'.repeat(40)};
 const rows=g.MAKE_TARGETS.preview.map(x=>({entryPoint:x.name,region:x.region,revision:x.name===t.name?'prior-real-revision':'old'}));
 assert.equal(s.validateInventoryBefore(p,'preview',rows,g.MAKE_TARGETS.preview),true);rows[4].revision='different';
 assert.throws(()=>s.validateInventoryBefore(p,'preview',rows,g.MAKE_TARGETS.preview));
});
test('Cloud Run traffic alone cannot certify AuthContext or queue authorization',()=>{
 const {p}=fixture();s.validateTrigger(p,'live',trigger(p,'live'));
 for(const mutate of [r=>r.realAuthContextObserved=false,r=>r.principalProbeDigest='',r=>r.eventType='google.cloud.firestore.document.v1.created',
  r=>r.queueRulesDenyClient=false,r=>r.closedConfigurationVerified=false,r=>r.canonicalLeadWrites=1,r=>r.externalMessagesSent=1,r=>r.authType='unauthenticated']){
  const row=trigger(p,'live');mutate(row);assert.throws(()=>s.validateTrigger(p,'live',row));}
});
module.exports={fixture,trigger};
test('five-target LIVE requires immutable financial Preview proof bindings; Preview may still be awaiting its real report',()=>{
 const {p}=fixture();delete p.financialPreviewQa;s.validateCandidate(p,'preview');
 assert.throws(()=>s.validateCandidate(p,'live'),/FINANCIAL_PREVIEW_RECEIPT_REQUIRED/);
 for(const mutate of [q=>delete q.receiptBlob,q=>q.receiptPath='../arbitrary.json',q=>q.qaRunId=0,q=>q.qaArtifactId='154',
  q=>q.qaArtifactDigest='sha256:unproven',q=>q.qaReportSha256='',q=>delete q.previewReadOnlyAuthorityBlob]){
  const {p}=fixture();mutate(p.financialPreviewQa);assert.throws(()=>s.validateCandidate(p,'live'));
 }
});
