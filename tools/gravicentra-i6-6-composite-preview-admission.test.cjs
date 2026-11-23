'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {previewRequestTransition}=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
const {candidateForPhase}=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const file=fs.readFileSync('tools/gravicentra-i6-6-frontend-preview-authority.cjs','utf8');
const control=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
const req=control.frontendPreviewRequest,sha=p=>execFileSync('git',['rev-parse','HEAD:'+p],{encoding:'utf8'}).trim();
test('composite signed Preview requires exact backend owner and prohibits LIVE',()=>{
 assert.ok(Number.isSafeInteger(req.version)&&req.version>0);
 assert.equal(req.mode,'COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY');
 assert.equal(req.fourFunctionExactPreviewRequired,true);
 assert.deepEqual(req.backendPaths,['functions/product-ops-leads-domain.js']);
 assert.equal(req.backendPathBlobs[req.backendPaths[0]],sha(req.backendPaths[0]));
 assert.equal(req.backendPreviewRequired,true);
 assert.equal(req.backendLiveDeployAllowed,false);
 assert.equal(req.realDataWritesAllowed,false);
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
test('signed immutable candidate includes exact approved six product paths',()=>{
 assert.deepEqual(req.productPaths,[
 'functions/product-ops-leads-domain.js',
 'orbit360-platform/core/auth-product-runtime-p0.js',
 'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
 'orbit360-platform/core/ciclo.js',
 'orbit360-platform/modules/cliente360.js',
 'orbit360-platform/modules/portal.js'
 ]);
 assert.equal(req.manifestBlob,sha('artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'));
 assert.match(req.sourceQaHead,/^[0-9a-f]{40}$/);
 execFileSync('git',['merge-base','--is-ancestor',req.sourceQaHead,'HEAD']);
 assert.equal(execFileSync('git',['rev-parse',req.sourceQaHead+':artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'],{encoding:'utf8'}).trim(),req.manifestBlob);
 for(const id of [req.sourceQaRunId,req.guardRunId])assert.ok(Number.isSafeInteger(id)&&id>0);
 assert.notEqual(req.sourceQaRunId,req.guardRunId);
 assert.equal(req.previousReceiptBlob,sha('artifacts/orbit360-recovery/release-control/I6_6_FRONTEND_E00002_RECEIPT.json'));
});
test('a request is admitted once and its next version cannot drift or skip',()=>{
 const old={version:11,sourceQaHead:'a'.repeat(40)};
 assert.equal(previewRequestTransition({...old},old),false);
 assert.equal(previewRequestTransition({version:12,sourceQaHead:'b'.repeat(40)},old),true);
 for(const version of [10,11,13])assert.throws(()=>previewRequestTransition({version,sourceQaHead:'b'.repeat(40)},old),/PREVIEW_REQUEST_VERSION_DRIFT/);
 for(const version of [0,-1,1.5,'12',undefined])assert.throws(()=>previewRequestTransition({version},old),/PREVIEW_REQUEST_VERSION_INVALID/);
});
