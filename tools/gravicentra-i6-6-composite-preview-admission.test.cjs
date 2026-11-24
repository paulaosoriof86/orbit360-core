'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {previewRequestTransition,validateStartupRecovery,validateDirectFormsRecovery,DIRECT_FORMS_PATHS,
 DIRECT_FORMS_RECEIPT_PATH,DIRECT_FORMS_RECEIPT_BLOB,DIRECT_FORMS_QA_PATHS}=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
const {candidateForPhase}=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const makeScope=require('./gravicentra-i66-make-release-scope.cjs');
const file=fs.readFileSync('tools/gravicentra-i6-6-frontend-preview-authority.cjs','utf8');
const control=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
const req=control.frontendPreviewRequest;
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const sha=p=>git('rev-parse',req.sourceQaHead+':'+p);
const frontendPath=p=>/^orbit360-platform\/(modules|core)\/[\w.-]+\.js$/.test(p);
// A retained request belongs to its signed source-QA epoch. Its historical
// contract is checked there; production admitPreview still checks actual HEAD.
const retainedRequestRef=ref=>ref==='HEAD'?req.sourceQaHead:ref;
function currentStartupPaths(){
 if(!Object.hasOwn(req,'startupRecovery'))return [];
 const dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return validateStartupRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',retainedRequestRef(ref)+':'+p),readJson:(ref,p)=>JSON.parse(git('show',retainedRequestRef(ref)+':'+p))
 });
}
function currentDirectFormsPaths(){
 if(!Object.hasOwn(req,'directFormsRecovery'))return [];
 const dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return validateDirectFormsRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',retainedRequestRef(ref)+':'+p),readJson:(ref,p)=>JSON.parse(git('show',retainedRequestRef(ref)+':'+p))
 });
}
function currentFinancialPaths(){
 if(!Object.hasOwn(req,'financialRecovery'))return [];
 const owner=require('./gravicentra-i6-6-frontend-preview-authority.cjs'),dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return owner.validateFinancialRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',retainedRequestRef(ref)+':'+p),readJson:(ref,p)=>JSON.parse(git('show',retainedRequestRef(ref)+':'+p))});
}
function currentCancellationPaths(){
 if(!Object.hasOwn(req,'cancellationRecovery'))return [];
 const owner=require('./gravicentra-i6-6-frontend-preview-authority.cjs'),dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return owner.validateCancellationRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',retainedRequestRef(ref)+':'+p),readJson:(ref,p)=>JSON.parse(git('show',retainedRequestRef(ref)+':'+p)),readText:(ref,p)=>git('show',retainedRequestRef(ref)+':'+p)});
}
function assertRequestMode(request,blobFor,startupPaths=[],directFormsPaths=[],financialPaths=[],cancellationPaths=[]){
 assert.ok(Number.isSafeInteger(request.version)&&request.version>0,'REQUEST_VERSION_REQUIRED');
 const composite=request.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',makeIngress=request.mode===makeScope.REQUEST_MODE;
 assert.ok(composite||makeIngress||request.mode==='PREVIEW_HOSTING_ONLY','REQUEST_MODE_REQUIRED');
 assert.ok(Array.isArray(request.productPaths)&&request.productPaths.length>0,'PRODUCT_PATHS_REQUIRED');
 if(!makeIngress)assert.ok(request.productPaths.some(frontendPath),'FRONTEND_PATH_REQUIRED');
 if(makeIngress){
  assert.equal(request.fiveFunctionExactPreviewRequired,true);assert.equal(request.scopeContractBlob,makeScope.CONTRACT_BLOB);
  assert.equal(request.backendPreviewRequired,true);assert.deepEqual(request.productPaths,[...new Set([...makeScope.PRODUCT_PATHS,...startupPaths,...directFormsPaths,...financialPaths,...cancellationPaths])].sort());
  assert.deepEqual(request.balanceCorrection,makeScope.BALANCE_CORRECTION);
  assert.equal(blobFor(makeScope.FRONTEND_PATH),makeScope.FRONTEND_BLOB);
  assert.equal(blobFor(makeScope.BALANCE_RECEIPT_PATH),makeScope.BALANCE_RECEIPT_BLOB);
  assert.deepEqual(request.backendPaths,makeScope.SOURCE_PATHS);assert.deepEqual(Object.keys(request.backendPathBlobs).sort(),makeScope.SOURCE_PATHS);
  for(const p of makeScope.SOURCE_PATHS)assert.equal(request.backendPathBlobs[p],blobFor(p));
 }else if(composite){
  assert.equal(request.fourFunctionExactPreviewRequired,true);
  assert.deepEqual(request.backendPaths,['functions/product-ops-leads-domain.js']);
  assert.equal(request.backendPathBlobs[request.backendPaths[0]],blobFor(request.backendPaths[0]));
  assert.equal(request.backendPreviewRequired,true);
  assert.deepEqual(request.productPaths.filter(p=>!frontendPath(p)),request.backendPaths);
 }else{
  // A focal frontend successor preserves the prior composite acceptance; it
  // cannot inherit a backend deploy request or claim a four-function Preview.
  assert.ok(request.productPaths.every(frontendPath),'FRONTEND_ONLY_PRODUCT_SCOPE');
  assert.deepEqual(request.backendPaths===undefined?[]:request.backendPaths,[]);
  assert.deepEqual(request.backendPathBlobs===undefined?{}:request.backendPathBlobs,{});
  for(const field of ['backendPreviewRequired','fourFunctionExactPreviewRequired','immutableArtifactMustCoverBothFrontendAndBackend'])
   assert.ok(request[field]===undefined||request[field]===false,'FRONTEND_ONLY_NO_BACKEND_'+field);
 }
 assert.equal(request.backendLiveDeployAllowed,false);
 assert.equal(request.realDataWritesAllowed,false);
}
test('retained signed Preview preserves its exact source epoch, mode and prohibition of LIVE',()=>{
 assertRequestMode(req,sha,currentStartupPaths(),currentDirectFormsPaths(),currentFinancialPaths(),currentCancellationPaths());
 // The request authorizes Preview only. A later LIVE transition has its own
 // exact candidate and signed-QA authority; it does not rewrite this request.
 if(control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'){
   const candidate=candidateForPhase(control,'live');
   assert.equal(candidate.previewQa.status,'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS');
 }else{
   assert.equal(control.forbidBackendFunctionDeploy,true);
   assert.equal(control.livePromotionAuthorized,false);
   assert.equal(control.noHostingPromotion,true);
 }
 assert.match(file,/COMPOSITE_BACKEND_EXACT_SCOPE_REQUIRED/);
 assert.match(file,/NO_UNCERTIFIED_BACKEND_LIVE/);
 assert.match(file,/PREVIEW_REQUEST_VERSION_DRIFT/);
});
test('signed request binds exact product paths and predecessor receipt at its source-QA ancestor',()=>{
 assert.match(req.sourceQaHead,/^[0-9a-f]{40}$/);
 git('merge-base','--is-ancestor',req.sourceQaHead,'HEAD');
 const cp=JSON.parse(git('show',req.sourceQaHead+':artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));
 const previous=cp[cp.currentExecutionDecisionPointer];
 assert.ok(previous?.receiptPath&&previous.receiptGitBlobSha,'SOURCE_QA_PREDECESSOR_RECEIPT_REQUIRED');
 assert.equal(req.previousReceiptBlob,previous.receiptGitBlobSha);
 assert.equal(req.previousReceiptBlob,sha(previous.receiptPath));
 git('merge-base','--is-ancestor',previous.sourceSha,req.sourceQaHead);
 const paths=git('diff','--name-only',previous.sourceSha,req.sourceQaHead,'--',
   'orbit360-platform','functions','firebase.json','storage.rules','firestore.rules','database.rules.json',
   'tools/gravicentra-i6-1-preview-package.mjs',':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json')
   .split('\n').filter(Boolean);
 assert.deepEqual(req.productPaths,paths);
 if(req.mode!==makeScope.REQUEST_MODE)assert.ok(paths.some(p=>/^orbit360-platform\/(modules|core)\/[\w.-]+\.js$/.test(p)));
 const startupPaths=currentStartupPaths(),cancellationPaths=currentCancellationPaths();
 assert.deepEqual(paths.filter(p=>!frontendPath(p)&&!startupPaths.includes(p)&&!cancellationPaths.includes(p)),
  req.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY'||req.mode===makeScope.REQUEST_MODE?[...req.backendPaths,...currentFinancialPaths().filter(p=>p.startsWith('functions/'))].sort():[]);
 assert.equal(req.manifestBlob,sha('artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'));
 for(const id of [req.sourceQaRunId,req.guardRunId])assert.ok(Number.isSafeInteger(id)&&id>0);
 assert.notEqual(req.sourceQaRunId,req.guardRunId);
});
test('a request is admitted once and its next version cannot drift or skip',()=>{
 const old={version:11,sourceQaHead:'a'.repeat(40)};
 assert.equal(previewRequestTransition({...old},old),false);
 assert.equal(previewRequestTransition({version:12,sourceQaHead:'b'.repeat(40)},old),true);
 for(const version of [10,11,13])assert.throws(()=>previewRequestTransition({version,sourceQaHead:'b'.repeat(40)},old),/PREVIEW_REQUEST_VERSION_DRIFT/);
 for(const version of [0,-1,1.5,'12',undefined])assert.throws(()=>previewRequestTransition({version},old),/PREVIEW_REQUEST_VERSION_INVALID/);
});

const fixtureBackend='functions/product-ops-leads-domain.js',fixtureBlob='a'.repeat(40);
function requestFixture(mode){
 const composite=mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY';
 return {version:composite?14:15,mode,productPaths:composite?
  [fixtureBackend,'orbit360-platform/core/queries.js']:['orbit360-platform/core/queries.js'],
  backendPaths:composite?[fixtureBackend]:[],backendPathBlobs:composite?{[fixtureBackend]:fixtureBlob}:{},
  backendPreviewRequired:composite,fourFunctionExactPreviewRequired:composite,
  immutableArtifactMustCoverBothFrontendAndBackend:composite,
  backendLiveDeployAllowed:false,realDataWritesAllowed:false};
}
test('v15 frontend-only fixture proves exact frontend paths with no backend request',()=>{
 const request=requestFixture('PREVIEW_HOSTING_ONLY');
 assertRequestMode(request,()=>assert.fail('frontend-only must not resolve a backend source'));
 // Backend-only fields may be omitted rather than copied from the consumed
 // composite request. The two explicit no-write flags remain mandatory.
 for(const field of ['backendPaths','backendPathBlobs','backendPreviewRequired',
   'fourFunctionExactPreviewRequired','immutableArtifactMustCoverBothFrontendAndBackend'])delete request[field];
 assertRequestMode(request,()=>assert.fail('frontend-only must not resolve a backend source'));
});
test('frontend-only request rejects backend scope, stale composite flags and write authorization',()=>{
 const mutations=[
  ['unknown mode',r=>{r.mode='HOSTING_AND_BACKEND';}],
  ['empty product scope',r=>{r.productPaths=[];}],
  ['backend product path',r=>{r.productPaths.push(fixtureBackend);}],
  ['non-module product path',r=>{r.productPaths.push('firebase.json');}],
  ['backend request',r=>{r.backendPaths=[fixtureBackend];}],
  ['backend blob request',r=>{r.backendPathBlobs={[fixtureBackend]:fixtureBlob};}],
  ['backend Preview',r=>{r.backendPreviewRequired=true;}],
  ['four-function claim',r=>{r.fourFunctionExactPreviewRequired=true;}],
  ['composite artifact claim',r=>{r.immutableArtifactMustCoverBothFrontendAndBackend=true;}],
  ['string false flag',r=>{r.backendPreviewRequired='false';}],
  ['backend LIVE',r=>{r.backendLiveDeployAllowed=true;}],
  ['real data writes',r=>{r.realDataWritesAllowed=true;}]
 ];
 for(const [name,mutate]of mutations){
  const request=requestFixture('PREVIEW_HOSTING_ONLY');mutate(request);
  assert.throws(()=>assertRequestMode(request,()=>fixtureBlob),undefined,name);
 }
});
test('composite fixture retains all exact backend assertions and rejection cases',()=>{
 assertRequestMode(requestFixture('COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY'),()=>fixtureBlob);
 const mutations=[
  ['four-function proof missing',r=>{r.fourFunctionExactPreviewRequired=false;}],
  ['backend scope missing',r=>{r.backendPaths=[];}],
  ['backend scope enlarged',r=>{r.backendPaths.push('functions/bootstrap.js');}],
  ['backend blob changed',r=>{r.backendPathBlobs[fixtureBackend]='b'.repeat(40);}],
  ['backend Preview missing',r=>{r.backendPreviewRequired=false;}],
  ['frontend delta missing',r=>{r.productPaths=[fixtureBackend];}],
  ['unlisted backend delta',r=>{r.productPaths.push('functions/bootstrap.js');}],
  ['backend LIVE',r=>{r.backendLiveDeployAllowed=true;}],
  ['real data writes',r=>{r.realDataWritesAllowed=true;}]
 ];
 for(const [name,mutate]of mutations){
  const request=requestFixture('COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY');mutate(request);
  assert.throws(()=>assertRequestMode(request,()=>fixtureBlob),undefined,name);
 }
});

const clone=x=>JSON.parse(JSON.stringify(x));
// These metadata/identity fixtures are synthetic offline contracts, never grants.
const financialOwner=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
function financialFixture(){
 const crypto=require('node:crypto'),h=x=>crypto.createHash('sha1').update(String(x)).digest('hex');
 const previous=clone(req),currentSource=h('synthetic accepted E3'),sourceQaHead=h('synthetic financial source');
 const paths=financialOwner.FINANCIAL_PATHS,authority=JSON.parse(fs.readFileSync(financialOwner.FINANCIAL_AUTHORITY_PATH));
 const receipt={schema:'GI_I66_R51_DOCUMENTARY_PAYMENT_FINANCIAL_RECOVERY_SOURCE_V1',status:'SOURCE_FOCAL_REGRESSION_PASS_SIGNED_PREVIEW_LIVE_PENDING',gate:'I6.6',classification:'PRODUCT',
  authority:{path:financialOwner.FINANCIAL_AUTHORITY_PATH,gitBlobSha:h('synthetic authority')},priorToleranceAuthority:clone(authority.decisions.priorToleranceAuthority),
  semantics:{country:'GT',currency:'GTQ',documentaryVarianceCents:5,allInsurers:true,realPaymentAmountDateOriginPreserved:true,paymentObligationMismatchHeld:true,
   bankSettlementExact:true,identityCountryCurrencyExact:true,noInventedPayments:true,noAutomaticCustomerNotice:true},
  boundaries:{productOwners:6,backendTargets:5,realDataWrites:0,authOrRoleChanges:0,bankMutations:0,deployments:0,signedPreview:'PENDING',signedLive:'PENDING'},
  productPaths:paths.map(p=>({path:p,previousGitBlobSha:h('before '+p),gitBlobSha:h('after '+p),sha256:'a'.repeat(64)})),
  qaPaths:financialOwner.FINANCIAL_QA_PATHS.map(p=>({path:p,gitBlobSha:h('qa '+p),sha256:'b'.repeat(64)})),
  localVerification:{passed:1,failed:0,skipped:0}};
 const request={...clone(previous),sourceQaHead,financialRecovery:{schema:'GI_I66_R51_FINANCIAL_RECOVERY_PREVIEW_EXTENSION_V1',
  receiptPath:financialOwner.FINANCIAL_RECEIPT_PATH,receiptBlob:h('synthetic receipt'),productPathBlobs:Object.fromEntries(receipt.productPaths.map(r=>[r.path,r.gitBlobSha]))}};
 request.financialRecoveryQa={profile:financialOwner.FINANCIAL_QA_PROFILE,receiptPath:request.financialRecovery.receiptPath,receiptBlob:request.financialRecovery.receiptBlob};
 request.productPaths=[...makeScope.PRODUCT_PATHS,...Object.keys(request.startupRecovery.productPathBlobs),...DIRECT_FORMS_PATHS,...paths].sort();
 const f={previous,currentSource,request,receipt,authority};
 f.readBlob=(ref,p)=>{
  if(p===financialOwner.FINANCIAL_RECEIPT_PATH)return h('synthetic receipt');
  if(p===financialOwner.FINANCIAL_AUTHORITY_PATH)return h('synthetic authority');
  if(p===authority.decisions.priorToleranceAuthority.path)return authority.decisions.priorToleranceAuthority.gitBlobSha;
  if(paths.includes(p))return h((ref===currentSource?'before ':'after ')+p);
  if(financialOwner.FINANCIAL_QA_PATHS.includes(p))return h('qa '+p);
  if(p===makeScope.FRONTEND_PATH)return makeScope.FRONTEND_BLOB;
  if(p===makeScope.BALANCE_RECEIPT_PATH)return makeScope.BALANCE_RECEIPT_BLOB;
  if(makeScope.SOURCE_PATHS.includes(p))return request.backendPathBlobs[p];
  throw Error('UNEXPECTED_SYNTHETIC_FINANCIAL_READ');
 };
 f.readJson=(ref,p)=>{assert.ok([sourceQaHead,'HEAD'].includes(ref));if(p===financialOwner.FINANCIAL_RECEIPT_PATH)return receipt;if(p===financialOwner.FINANCIAL_AUTHORITY_PATH)return authority;throw Error('UNEXPECTED_JSON_READ');};
 return f;
}
const validateFinancialFixture=f=>financialOwner.validateFinancialRecovery(f.request,f.currentSource,f.previous,{readBlob:f.readBlob,readJson:f.readJson});
test('financial extension is optional for historical requests and never reads new authority',()=>{
 assert.deepEqual(financialOwner.validateFinancialRecovery({mode:makeScope.REQUEST_MODE},'historical',null,{readBlob:()=>assert.fail('unexpected'),readJson:()=>assert.fail('unexpected')}),[]);
});
test('financial extension admits exactly six owners atop eleven unaccepted E3 deltas, with five existing backend targets',()=>{
 const f=financialFixture(),paths=validateFinancialFixture(f);assert.deepEqual(paths,financialOwner.FINANCIAL_PATHS);
 assert.equal(f.request.productPaths.length,17);assert.equal(paths.filter(p=>p.startsWith('functions/')).length,2);
 assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort(),DIRECT_FORMS_PATHS,paths);
 assert.deepEqual(f.request.backendPaths,makeScope.SOURCE_PATHS);
 assert.throws(()=>assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort(),DIRECT_FORMS_PATHS));
});
for(const [name,change] of [
 ['unlisted seventh owner',f=>{f.request.financialRecovery.productPathBlobs['functions/new-writer.js']='a'.repeat(40);}],
 ['missing financial owner',f=>{delete f.request.financialRecovery.productPathBlobs[financialOwner.FINANCIAL_PATHS[0]];}],
 ['missing signed UI coverage',f=>{delete f.request.financialRecoveryQa;}],
 ['different signed UI receipt',f=>{f.request.financialRecoveryQa.receiptBlob='a'.repeat(40);}],
 ['Make scope widened',f=>{f.request.backendPaths.push('functions/cobros-reconciliation-domain.js');}],
 ['Make source changed',f=>{f.request.backendPathBlobs[makeScope.SOURCE_PATHS[0]]='a'.repeat(40);}],
 ['urgent renewal product changed',f=>{f.request.directFormsRecovery.productPathBlobs[DIRECT_FORMS_PATHS[0]]='a'.repeat(40);}],
 ['startup changed',f=>{f.request.startupRecovery.schema='UNKNOWN';}],
 ['real writes allowed',f=>{f.request.realDataWritesAllowed=true;}],
 ['LIVE deploy allowed',f=>{f.request.backendLiveDeployAllowed=true;}],
 ['more than five targets',f=>{f.receipt.boundaries.backendTargets=6;}],
 ['six-cent tolerance',f=>{f.receipt.semantics.documentaryVarianceCents=6;}],
 ['bank monetary tolerance',f=>{f.receipt.semantics.bankSettlementExact=false;}],
 ['country tolerance',f=>{f.receipt.semantics.country='ALL';}],
 ['payment-obligation equivalence',f=>{f.receipt.semantics.paymentObligationMismatchHeld=false;}],
 ['forged broad authority',f=>{f.authority.decisions.extendPreviouslyApprovedToleranceToAllInsurersAndCases=false;}],
 ['manufactured original threshold authority',f=>{f.receipt.priorToleranceAuthority.gitBlobSha='a'.repeat(40);}],
 ['extra QA owner',f=>{f.receipt.qaPaths.push({path:'tools/unrelated.js',gitBlobSha:'a'.repeat(40),sha256:'a'.repeat(64)});}],
 ['missing QA owner',f=>{f.receipt.qaPaths.pop();}],
 ['failed local regression',f=>{f.receipt.localVerification.failed=1;}],
 ['skipped local regression',f=>{f.receipt.localVerification.skipped=1;}],
 ['invented signed Preview PASS',f=>{f.receipt.boundaries.signedPreview='PASS';}]
])test('financial admission rejects '+name,()=>{const f=financialFixture();change(f);assert.throws(()=>validateFinancialFixture(f));});
test('financial admission checks original preimage and source-QA plus HEAD pins, so metadata cannot retarget product or tests',()=>{
 for(const drift of ['predecessor','product-head','test-head','receipt-head','authority-head']){
  const f=financialFixture(),original=f.readBlob;
  f.readBlob=(ref,p)=>((drift==='predecessor'&&ref===f.currentSource&&p===financialOwner.FINANCIAL_PATHS[0])||
   (ref==='HEAD'&&p===(drift==='product-head'?financialOwner.FINANCIAL_PATHS[0]:drift==='test-head'?financialOwner.FINANCIAL_QA_PATHS[0]:drift==='receipt-head'?financialOwner.FINANCIAL_RECEIPT_PATH:financialOwner.FINANCIAL_AUTHORITY_PATH)))?'f'.repeat(40):original(ref,p);
  assert.throws(()=>validateFinancialFixture(f),undefined,drift);
 }
});
function cancellationFixture(){
 const f=financialFixture(),h=x=>require('node:crypto').createHash('sha1').update(String(x)).digest('hex');
 const owner=financialOwner,shared='orbit360-platform/modules/policy-receipts-v1199-detail-guard.js';
 const receipt={schema:'GI_I66_EFFECTIVE_CANCELLATION_DIRECT_OR_OPS_CAUSAL_SOURCE_V1',status:'SOURCE_FOCAL_REGRESSION_PASS_SIGNED_PREVIEW_LIVE_PENDING',gate:'I6.6',classification:'PRODUCT',
  authority:clone(owner.CANCELLATION_AUTHORITY),
  semantics:{country:'GT',directEffectiveCancellation:true,requestViaOpsPreserved:true,existingPolicyWriteAuthorityOnly:true,
   documentReferenceMotiveDateRequired:true,effectiveConfirmationRequired:true,sparseCanonicalPolicyWrite:true,
   canonicalServerReadbackRequired:true,idempotentReplay:true,policyFinancialFactsPreserved:true,receiptAndPaymentWrites:0,noAutomaticCustomerNotice:true},
  boundaries:{productOwners:4,newBackendOwners:0,backendTargets:5,realDataWrites:0,authOrRoleChanges:0,bankMutations:0,deployments:0,signedPreview:'PENDING',signedLive:'PENDING'},
  runtimeRequirement:{profile:owner.CANCELLATION_QA_PROFILE,preview:'SYNTHETIC_FORM_NO_CANONICAL_WRITE',
   live:'SYNTHETIC_CANONICAL_READBACK_RELOAD_REPLAY_FINANCIAL_PRESERVATION_CLEANUP',signedPreview:'PENDING',signedLive:'PENDING'},
  productPaths:owner.CANCELLATION_PATHS.map(p=>p===shared?clone(f.receipt.productPaths.find(row=>row.path===p)):
   {path:p,previousGitBlobSha:h('before '+p),gitBlobSha:h('after '+p),sha256:'c'.repeat(64)}),
  qaPaths:owner.CANCELLATION_QA_PATHS.map(p=>({path:p,gitBlobSha:h('qa '+p),sha256:'d'.repeat(64)})),
  localVerification:{passed:2,failed:0,skipped:0,tests:[
   {path:'tools/gravicentra-i6-6-composite-preview-admission.test.cjs',passed:1,failed:0,skipped:0,reportSha256:'e'.repeat(64)},
   {path:owner.CANCELLATION_TEST_PATH,passed:1,failed:0,skipped:0,reportSha256:'f'.repeat(64)}]}};
 f.cancellationReceipt=receipt;
 f.request.cancellationRecovery={schema:'GI_I66_EFFECTIVE_CANCELLATION_PREVIEW_EXTENSION_V1',receiptPath:owner.CANCELLATION_RECEIPT_PATH,
  receiptBlob:h('synthetic cancellation receipt'),productPathBlobs:Object.fromEntries(receipt.productPaths.map(row=>[row.path,row.gitBlobSha]))};
 f.request.cancellationRecoveryQa={profile:owner.CANCELLATION_QA_PROFILE,receiptPath:owner.CANCELLATION_RECEIPT_PATH,receiptBlob:f.request.cancellationRecovery.receiptBlob};
 f.request.productPaths=owner.exactPathUnion(f.request.productPaths,owner.CANCELLATION_PATHS);
 const beforeBlob=f.readBlob,beforeJson=f.readJson;
 f.readBlob=(ref,p)=>{
  if(p===owner.CANCELLATION_RECEIPT_PATH)return h('synthetic cancellation receipt');
  if(owner.CANCELLATION_PATHS.includes(p))return h((ref===f.currentSource?'before ':'after ')+p);
  if(owner.CANCELLATION_QA_PATHS.includes(p))return h('qa '+p);
  return beforeBlob(ref,p);
 };
 f.readJson=(ref,p)=>p===owner.CANCELLATION_RECEIPT_PATH?receipt:beforeJson(ref,p);
 f.readText=(ref,p)=>{assert.equal(ref,f.request.sourceQaHead);assert.equal(p,owner.CANCELLATION_SOURCE_QA_PATH);return 'jobs:\n  qa:\n    steps:\n      - run: |\n          node --test '+owner.CANCELLATION_TEST_PATH+'\n';};
 return f;
}
const validateCancellationFixture=f=>financialOwner.validateCancellationRecovery(f.request,f.currentSource,f.previous,{readBlob:f.readBlob,readJson:f.readJson,readText:f.readText});
test('cancellation extension is absent from historical admission and does not read or grant a new authority',()=>{
 for(const mode of ['PREVIEW_HOSTING_ONLY','COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',makeScope.REQUEST_MODE])
  assert.deepEqual(financialOwner.validateCancellationRecovery({mode},'historical',null,{readBlob:()=>assert.fail('unexpected'),readJson:()=>assert.fail('unexpected')}),[]);
});
test('cancellation adds exactly three owners to the seventeen financial composition, with one identical shared blob and no additional backend target',()=>{
 const f=cancellationFixture(),financial=validateFinancialFixture(f),paths=validateCancellationFixture(f);
 assert.deepEqual(paths,financialOwner.CANCELLATION_PATHS);assert.equal(f.request.productPaths.length,20);
 assert.equal(paths.filter(p=>financial.includes(p)).length,1);assert.deepEqual(f.request.backendPaths,makeScope.SOURCE_PATHS);
 assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort(),DIRECT_FORMS_PATHS,financial,paths);
 assert.throws(()=>assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort(),DIRECT_FORMS_PATHS,financial),undefined,'unverified cancellation data path must not be admitted');
 assert.deepEqual(financialOwner.FINANCIAL_PATHS,financial);assert.equal(financial.length,6);
});
for(const [name,change] of [
 ['unlisted fifth owner',f=>{f.request.cancellationRecovery.productPathBlobs['orbit360-platform/data/unrelated-writer.js']='a'.repeat(40);}],
 ['missing exact owner',f=>{delete f.request.cancellationRecovery.productPathBlobs[financialOwner.CANCELLATION_PATHS[0]];}],
 ['arbitrary receipt path',f=>{f.request.cancellationRecovery.receiptPath='arbitrary.json';}],
 ['additional extension authority',f=>{f.request.cancellationRecovery.allowAllPolicyWrites=true;}],
 ['missing signed UI coverage',f=>{delete f.request.cancellationRecoveryQa;}],
 ['unbound signed UI receipt',f=>{f.request.cancellationRecoveryQa.receiptBlob='a'.repeat(40);}],
 ['missing financial composition',f=>{delete f.request.financialRecovery;}],
 ['different financial shared owner',f=>{f.request.financialRecovery.productPathBlobs['orbit360-platform/modules/policy-receipts-v1199-detail-guard.js']='b'.repeat(40);}],
 ['Make backend added',f=>{f.request.backendPaths.push('functions/product-operational-domain.js');}],
 ['Make source changed',f=>{f.request.backendPathBlobs[makeScope.SOURCE_PATHS[0]]='b'.repeat(40);}],
 ['startup changed',f=>{f.request.startupRecovery.receiptBlob='b'.repeat(40);}],
 ['renewal product changed',f=>{f.request.directFormsRecovery.productPathBlobs[DIRECT_FORMS_PATHS[0]]='b'.repeat(40);}],
 ['real data authority',f=>{f.request.realDataWritesAllowed=true;}],
 ['LIVE authority',f=>{f.request.backendLiveDeployAllowed=true;}],
 ['six backend targets',f=>{f.cancellationReceipt.boundaries.backendTargets=6;}],
 ['new role permission',f=>{f.cancellationReceipt.boundaries.authOrRoleChanges=1;}],
 ['broader user permission',f=>{f.cancellationReceipt.authority.existingPolicyWriteAuthorityOnly=false;}],
 ['absent effective confirmation',f=>{f.cancellationReceipt.semantics.effectiveConfirmationRequired=false;}],
 ['rewriting premiums or receipts',f=>{f.cancellationReceipt.semantics.policyFinancialFactsPreserved=false;}],
 ['invented signed Preview success',f=>{f.cancellationReceipt.boundaries.signedPreview='PASS';}],
 ['invented signed LIVE success',f=>{f.cancellationReceipt.runtimeRequirement.signedLive='PASS';}],
 ['missing causal test pin',f=>{f.cancellationReceipt.qaPaths=f.cancellationReceipt.qaPaths.filter(r=>r.path!==financialOwner.CANCELLATION_TEST_PATH);}],
 ['additional QA owner',f=>{f.cancellationReceipt.qaPaths.push({path:'tools/unrelated.cjs',gitBlobSha:'c'.repeat(40),sha256:'d'.repeat(64)});}],
 ['failed causal test',f=>{f.cancellationReceipt.localVerification.tests[1].failed=1;}],
 ['skipped causal test',f=>{f.cancellationReceipt.localVerification.tests[1].skipped=1;}],
 ['missing evidence digest',f=>{f.cancellationReceipt.localVerification.tests[1].reportSha256='';}],
 ['absent source QA command',f=>{f.readText=()=>'';}],
 ['commented source QA command',f=>{f.readText=()=>'        # node --test '+financialOwner.CANCELLATION_TEST_PATH+'\n';}]
])test('cancellation admission rejects '+name,()=>{const f=cancellationFixture();change(f);assert.throws(()=>validateCancellationFixture(f));});
test('cancellation admission verifies every source, shared owner, QA and receipt pin at source QA and HEAD',()=>{
 for(const p of [financialOwner.CANCELLATION_RECEIPT_PATH,...financialOwner.CANCELLATION_PATHS,...financialOwner.CANCELLATION_QA_PATHS]){
  for(const target of ['HEAD','SOURCE_QA']){
   const f=cancellationFixture(),original=f.readBlob,ref=target==='SOURCE_QA'?f.request.sourceQaHead:target;
   f.readBlob=(r,q)=>r===ref&&q===p?'f'.repeat(40):original(r,q);
   assert.throws(()=>validateCancellationFixture(f),/DRIFT/,p+' at '+target);
  }
 }
 for(const p of financialOwner.CANCELLATION_PATHS){
  const f=cancellationFixture(),original=f.readBlob;
  f.readBlob=(ref,q)=>ref===f.currentSource&&q===p?'f'.repeat(40):original(ref,q);
  assert.throws(()=>validateCancellationFixture(f),/ACCEPTED_PREDECESSOR_DRIFT/,p);
 }
});
test('the exact product union rejects any unauthorized path even when it resembles an admitted data owner',()=>{
 const f=cancellationFixture();validateFinancialFixture(f);validateCancellationFixture(f);
 for(const added of ['orbit360-platform/data/unrelated.js','functions/product-operational-domain.js','firestore.rules']){
  const changed=clone(f.request);changed.productPaths=financialOwner.exactPathUnion(changed.productPaths,[added]);
  assert.throws(()=>assertRequestMode(changed,p=>f.readBlob(changed.sourceQaHead,p),Object.keys(changed.startupRecovery.productPathBlobs).sort(),DIRECT_FORMS_PATHS,financialOwner.FINANCIAL_PATHS,financialOwner.CANCELLATION_PATHS),undefined,added);
 }
});
function directFormsFixture(){
 const previous=clone(req),head='74ae28c6e6e6b40f845567c9b00738a58307b3cb';
 const cp=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));
 const currentSource=cp[cp.currentExecutionDecisionPointer].sourceSha;
 const receipt=JSON.parse(fs.readFileSync(DIRECT_FORMS_RECEIPT_PATH));
 const productPathBlobs=Object.fromEntries(receipt.files.filter(row=>DIRECT_FORMS_PATHS.includes(row.path)).map(row=>[row.path,row.gitBlobSha]));
 const request={...clone(previous),sourceQaHead:head,directFormsRecovery:{schema:'GI_I66_DIRECT_FORMS_RECOVERY_PREVIEW_EXTENSION_V1',
   receiptPath:DIRECT_FORMS_RECEIPT_PATH,receiptBlob:DIRECT_FORMS_RECEIPT_BLOB,productPathBlobs}};
 request.productPaths=[...makeScope.PRODUCT_PATHS,...Object.keys(request.startupRecovery.productPathBlobs),...DIRECT_FORMS_PATHS].sort();
 // Exercise the immutable original receipt against its actual historical source.
 const readBlob=(ref,p)=>git('rev-parse',(ref==='HEAD'?head:ref)+':'+p),readJson=(ref,p)=>JSON.parse(git('show',(ref==='HEAD'?head:ref)+':'+p));
 return {request,previous,currentSource,receipt,readBlob,readJson};
}
function validateDirectFixture(f,deps={}){
 return validateDirectFormsRecovery(f.request,f.currentSource,f.previous,{readBlob:f.readBlob,readJson:f.readJson,...deps});
}

test('historical requests without direct forms extension keep their original admission semantics and do not read new authority',()=>{
 for(const mode of ['PREVIEW_HOSTING_ONLY','COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',makeScope.REQUEST_MODE]){
  assert.deepEqual(validateDirectFormsRecovery({mode},'historical',null,{readBlob:()=>assert.fail('historical read'),readJson:()=>assert.fail('historical read')}),[]);
 }
});

test('closed direct forms extension admits exactly the two reported owners with source-QA and HEAD evidence',()=>{
 const f=directFormsFixture(),reads=[];
 const paths=validateDirectFixture(f,{readBlob:(ref,p)=>{reads.push([ref,p]);return f.readBlob(ref,p);}});
 assert.deepEqual(paths,DIRECT_FORMS_PATHS);
 for(const p of [DIRECT_FORMS_RECEIPT_PATH,...DIRECT_FORMS_PATHS,...DIRECT_FORMS_QA_PATHS])for(const ref of [f.request.sourceQaHead,'HEAD'])assert.ok(reads.some(row=>row[0]===ref&&row[1]===p));
 assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort(),paths);
 assert.throws(()=>assertRequestMode(f.request,p=>f.readBlob(f.request.sourceQaHead,p),Object.keys(f.request.startupRecovery.productPathBlobs).sort()),undefined,'new product paths without verified extension must not pass');
});

test('direct forms extension rejects extra paths, arbitrary receipt, source pin and pending backend/startup changes',()=>{
 const mutations=[
  f=>{f.request.mode='PREVIEW_HOSTING_ONLY';},f=>{f.request.sourceQaHead='main';},f=>{f.request.directFormsRecovery=null;},
  f=>{f.request.directFormsRecovery.extra=true;},f=>{f.request.directFormsRecovery.schema='OTHER';},
  f=>{f.request.directFormsRecovery.receiptPath='arbitrary.json';},f=>{f.request.directFormsRecovery.receiptBlob='a'.repeat(40);},
  f=>{f.request.directFormsRecovery.productPathBlobs['orbit360-platform/core/unrelated.js']='b'.repeat(40);},
  f=>{delete f.request.directFormsRecovery.productPathBlobs[DIRECT_FORMS_PATHS[0]];},
  f=>{f.request.directFormsRecovery.productPathBlobs[DIRECT_FORMS_PATHS[0]]='c'.repeat(40);},
  f=>{f.previous.mode='PREVIEW_HOSTING_ONLY';},f=>{f.request.backendPaths=[];},
  f=>{f.request.backendPathBlobs[makeScope.SOURCE_PATHS[0]]='d'.repeat(40);},
  f=>{delete f.request.startupRecovery;},f=>{f.request.startupRecovery.receiptBlob='e'.repeat(40);}
 ];
 for(const mutate of mutations){const f=directFormsFixture();mutate(f);assert.throws(()=>validateDirectFixture(f));}
});

test('direct forms extension rejects product, QA, receipt and accepted predecessor drift at either sealed source',()=>{
 const f=directFormsFixture();
 for(const p of [DIRECT_FORMS_RECEIPT_PATH,...DIRECT_FORMS_PATHS,...DIRECT_FORMS_QA_PATHS])for(const ref of [f.request.sourceQaHead,'HEAD']){
  assert.throws(()=>validateDirectFixture(f,{readBlob:(actual,path)=>actual===ref&&path===p?'f'.repeat(40):f.readBlob(actual,path)}),/DRIFT/);
 }
 for(const p of DIRECT_FORMS_PATHS)assert.throws(()=>validateDirectFixture(f,{readBlob:(ref,path)=>ref===f.currentSource&&path===p?'f'.repeat(40):f.readBlob(ref,path)}),/ACCEPTED_PREDECESSOR_DRIFT/);
});

test('direct forms receipt must prove reproduced failure, passing causal tests and no claimed publish or data changes',()=>{
 const f=directFormsFixture();
 const mutations=[
  r=>{r.schema='OTHER';},r=>{r.status='LIVE_PASS';},r=>{r.realDataWrites=1;},r=>{r.liveDeploys=1;},
  r=>{r.tests.renewalBaselineNewSuite.expectedFailureReproduced=false;},r=>{r.tests.renewalBaselineNewSuite.fail=0;},
  r=>{r.tests.combinedSource.fail=1;},r=>{r.tests.canonicalEndorsementDurableContract.pass=0;},
  r=>{r.tests.signedDriverContracts.fail=1;},r=>{r.tests.signedUi='PASS';},r=>{r.tests.published=true;},
  r=>{r.files.push({path:'orbit360-platform/modules/unrelated.js',gitBlobSha:'a'.repeat(40),sha256:'b'.repeat(64)});},
  r=>{r.files=r.files.filter(row=>row.path!==DIRECT_FORMS_QA_PATHS[0]);}
 ];
 for(const mutate of mutations){const receipt=clone(f.receipt);mutate(receipt);assert.throws(()=>validateDirectFixture(f,{readJson:()=>receipt}));}
});

const qaRevision=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
const {DIRECT_FORMS_QA_REVISION_RECEIPT_PATH:NEXT_RECEIPT,DIRECT_FORMS_QA_REVISION_RECEIPT_BLOB:NEXT_BLOB,
 DIRECT_FORMS_QA_REVISION_SOURCE_BASE:QA_BASE,DIRECT_FORMS_QA_REVISION_PATHS:NEXT_QA_PATHS,DIRECT_FORMS_QA_CHANGED_PATHS:CHANGED_QA}=qaRevision;
const qaHash=b=>require('node:crypto').createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function revisedDirectFormsFixture(){
 const f=directFormsFixture(),originalRead=f.readBlob,originalJson=f.readJson;
 f.receipt=JSON.parse(fs.readFileSync(NEXT_RECEIPT));
 f.request.sourceQaHead='d'.repeat(40);
 f.request.directFormsRecovery.receiptPath=NEXT_RECEIPT;f.request.directFormsRecovery.receiptBlob=NEXT_BLOB;
 f.readBlob=(ref,p)=>{
  if([f.request.sourceQaHead,'HEAD'].includes(ref)){
   if(p===NEXT_RECEIPT||NEXT_QA_PATHS.includes(p)||DIRECT_FORMS_PATHS.includes(p)||p===DIRECT_FORMS_RECEIPT_PATH)return qaHash(fs.readFileSync(p));
   return originalRead(QA_BASE,p);
  }
  return originalRead(ref,p);
 };
 f.readJson=(ref,p)=>[f.request.sourceQaHead,'HEAD'].includes(ref)&&[NEXT_RECEIPT,DIRECT_FORMS_RECEIPT_PATH].includes(p)?JSON.parse(fs.readFileSync(p)):originalJson(ref,p);
 return f;
}
test('the second closed causal receipt admits current QA bytes while preserving the exact two original product owners and backend/startup pins',()=>{
 const f=revisedDirectFormsFixture(),calls=[];
 assert.deepEqual(validateDirectFixture(f,{readBlob:(ref,p)=>{calls.push([ref,p]);return f.readBlob(ref,p);}}),DIRECT_FORMS_PATHS);
 for(const p of [DIRECT_FORMS_RECEIPT_PATH,NEXT_RECEIPT,...DIRECT_FORMS_PATHS,...NEXT_QA_PATHS])
  for(const ref of [f.request.sourceQaHead,'HEAD'])assert.ok(calls.some(x=>x[0]===ref&&x[1]===p));
 for(const p of NEXT_QA_PATHS)assert.ok(calls.some(x=>x[0]===QA_BASE&&x[1]===p));
 assert.deepEqual(f.receipt.supersedes,{receiptPath:DIRECT_FORMS_RECEIPT_PATH,receiptBlob:DIRECT_FORMS_RECEIPT_BLOB,scope:'QA_ONLY'});
 assert.equal(f.receipt.personalDecisionPresent,false);assert.equal(f.receipt.legalAcceptanceExecutions,0);
});
test('the original immutable receipt still works only with original QA and cannot approve the new driver bytes',()=>{
 const old=directFormsFixture();assert.deepEqual(validateDirectFixture(old),DIRECT_FORMS_PATHS);
 assert.throws(()=>validateDirectFixture(old,{readBlob:(ref,p)=>[old.request.sourceQaHead,'HEAD'].includes(ref)&&CHANGED_QA.includes(p)?qaHash(fs.readFileSync(p)):old.readBlob(ref,p)}),/PRODUCT_OR_QA_SOURCE_DRIFT/);
});
test('the receipt selector accepts exactly the original pin or the new pin, not arbitrary causal metadata',()=>{
 for(const mutate of [f=>{f.request.directFormsRecovery.receiptPath='artifacts/orbit360-recovery/release-control/OTHER.json';},
  f=>{f.request.directFormsRecovery.receiptBlob=DIRECT_FORMS_RECEIPT_BLOB;},
  f=>{f.request.directFormsRecovery.receiptPath=DIRECT_FORMS_RECEIPT_PATH;}]){
  const f=revisedDirectFormsFixture();mutate(f);assert.throws(()=>validateDirectFixture(f),/EXACT_RECEIPT/);
 }
});
test('the revised profile rejects drift in either receipt or any current product/QA owner at source QA or HEAD',()=>{
 const f=revisedDirectFormsFixture();
 for(const p of [DIRECT_FORMS_RECEIPT_PATH,NEXT_RECEIPT,...DIRECT_FORMS_PATHS,...NEXT_QA_PATHS])for(const target of [f.request.sourceQaHead,'HEAD'])
  assert.throws(()=>validateDirectFixture(f,{readBlob:(ref,q)=>ref===target&&q===p?'f'.repeat(40):f.readBlob(ref,q)}),/DRIFT/);
});
test('the revised profile requires exact original QA preimages and rejects widening its source or path set',()=>{
 const f=revisedDirectFormsFixture();
 for(const p of NEXT_QA_PATHS)assert.throws(()=>validateDirectFixture(f,{readBlob:(ref,q)=>ref===QA_BASE&&q===p?'f'.repeat(40):f.readBlob(ref,q)}),/PREIMAGE_DRIFT/);
 for(const change of [r=>{r.qaSourceBase='a'.repeat(40);},r=>{r.supersedes.receiptBlob='b'.repeat(40);},
  r=>{r.previousQaFiles.pop();},r=>{r.files.push({path:'tools/unrelated.cjs',gitBlobSha:'c'.repeat(40),sha256:'d'.repeat(64)});},
  r=>{r.files.find(x=>DIRECT_FORMS_PATHS.includes(x.path)).gitBlobSha='e'.repeat(40);},
  r=>{r.files.find(x=>!CHANGED_QA.includes(x.path)&&NEXT_QA_PATHS.includes(x.path)).gitBlobSha='e'.repeat(40);}]){
   const receipt=clone(f.receipt);change(receipt);
   assert.throws(()=>validateDirectFixture(f,{readJson:(ref,p)=>p===NEXT_RECEIPT?receipt:f.readJson(ref,p)}));
 }
});
test('QA preparation cannot assert personal consent, a retained run interceptor, live acceptance, backend writes, or skipped local proofs',()=>{
 const f=revisedDirectFormsFixture();
 for(const change of [r=>{r.personalDecisionPresent=true;},r=>{r.legalAcceptanceExecutions=1;},r=>{r.liveDeploys=1;},r=>{r.realDataWrites=1;},
  r=>{r.noBackendChanges=false;},r=>{r.noPermissionChanges=false;},r=>{r.productBytesUnchanged=false;},
  r=>{r.causalEvidence.actualRunInterceptorObserved=true;},r=>{r.causalEvidence.actualRunHitTestRetained=true;},
  r=>{r.causalEvidence.personalAuthorityRequiredBeforeBackendMutation=false;},r=>{r.driverContract.previewChecks=45;},
  r=>{r.driverContract.directionScopeUnchanged=false;},r=>{r.tests.signedUi='PASS';},r=>{r.tests.published=true;},
  r=>{r.tests.signedDriverContracts.pass=0;},r=>{r.tests.signedDriverContracts.fail=1;},r=>{r.tests.failureDiagnosticRetention.skip=1;},
  r=>{r.tests.failureDiagnosticRetention.reportSha256='';}]){
   const receipt=clone(f.receipt);change(receipt);
   assert.throws(()=>validateDirectFixture(f,{readJson:(ref,p)=>p===NEXT_RECEIPT?receipt:f.readJson(ref,p)}));
 }
});
test('revised QA receipt preserves the same pending backend and startup invariants',()=>{
 for(const change of [f=>{f.request.backendPathBlobs[makeScope.SOURCE_PATHS[0]]='e'.repeat(40);},
  f=>{f.request.backendPaths=[];},f=>{f.request.startupRecovery.receiptBlob='f'.repeat(40);},
  f=>{delete f.request.startupRecovery;},f=>{f.request.directFormsRecovery.productPathBlobs['orbit360-platform/core/unrelated.js']='f'.repeat(40);}]){
  const f=revisedDirectFormsFixture();change(f);assert.throws(()=>validateDirectFixture(f));
 }
});
