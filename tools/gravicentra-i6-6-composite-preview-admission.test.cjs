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
function currentStartupPaths(){
 if(!Object.hasOwn(req,'startupRecovery'))return [];
 const dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return validateStartupRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p))
 });
}
function currentDirectFormsPaths(){
 if(!Object.hasOwn(req,'directFormsRecovery'))return [];
 const dir='artifacts/orbit360-recovery/release-control/';
 const cp=JSON.parse(git('show',req.sourceQaHead+':'+dir+'CONTROL_PLANE.json'));
 const before=JSON.parse(git('show',req.sourceQaHead+':'+dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 return validateDirectFormsRecovery(req,cp[cp.currentExecutionDecisionPointer].sourceSha,before.frontendPreviewRequest,{
  readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p))
 });
}
function assertRequestMode(request,blobFor,startupPaths=[],directFormsPaths=[]){
 assert.ok(Number.isSafeInteger(request.version)&&request.version>0,'REQUEST_VERSION_REQUIRED');
 const composite=request.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',makeIngress=request.mode===makeScope.REQUEST_MODE;
 assert.ok(composite||makeIngress||request.mode==='PREVIEW_HOSTING_ONLY','REQUEST_MODE_REQUIRED');
 assert.ok(Array.isArray(request.productPaths)&&request.productPaths.length>0,'PRODUCT_PATHS_REQUIRED');
 if(!makeIngress)assert.ok(request.productPaths.some(frontendPath),'FRONTEND_PATH_REQUIRED');
 if(makeIngress){
  assert.equal(request.fiveFunctionExactPreviewRequired,true);assert.equal(request.scopeContractBlob,makeScope.CONTRACT_BLOB);
  assert.equal(request.backendPreviewRequired,true);assert.deepEqual(request.productPaths,[...makeScope.PRODUCT_PATHS,...startupPaths,...directFormsPaths].sort());
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
test('current signed Preview retains its exact mode scope and prohibits LIVE',()=>{
 assertRequestMode(req,sha,currentStartupPaths(),currentDirectFormsPaths());
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
 const startupPaths=currentStartupPaths();
 assert.deepEqual(paths.filter(p=>!frontendPath(p)&&!startupPaths.includes(p)),
  req.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY'||req.mode===makeScope.REQUEST_MODE?req.backendPaths:[]);
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
function directFormsFixture(){
 const previous=clone(req),head=git('rev-parse','HEAD');
 const cp=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));
 const currentSource=cp[cp.currentExecutionDecisionPointer].sourceSha;
 const receipt=JSON.parse(fs.readFileSync(DIRECT_FORMS_RECEIPT_PATH));
 const productPathBlobs=Object.fromEntries(receipt.files.filter(row=>DIRECT_FORMS_PATHS.includes(row.path)).map(row=>[row.path,row.gitBlobSha]));
 const request={...clone(previous),sourceQaHead:head,directFormsRecovery:{schema:'GI_I66_DIRECT_FORMS_RECOVERY_PREVIEW_EXTENSION_V1',
   receiptPath:DIRECT_FORMS_RECEIPT_PATH,receiptBlob:DIRECT_FORMS_RECEIPT_BLOB,productPathBlobs}};
 request.productPaths=[...makeScope.PRODUCT_PATHS,...Object.keys(request.startupRecovery.productPathBlobs),...DIRECT_FORMS_PATHS].sort();
 const readBlob=(ref,p)=>git('rev-parse',ref+':'+p),readJson=(ref,p)=>JSON.parse(git('show',ref+':'+p));
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
