'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const file=fs.readFileSync('tools/gravicentra-i6-6-frontend-preview-authority.cjs','utf8');
const control=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
const req=control.frontendPreviewRequest,sha=p=>execFileSync('git',['rev-parse','HEAD:'+p],{encoding:'utf8'}).trim();
test('composite signed Preview requires exact backend owner and prohibits LIVE',()=>{
 assert.equal(req.version,11);
 assert.equal(req.mode,'COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY');
 assert.equal(req.fourFunctionExactPreviewRequired,true);
 assert.deepEqual(req.backendPaths,['functions/product-ops-leads-domain.js']);
 assert.equal(req.backendPathBlobs[req.backendPaths[0]],sha(req.backendPaths[0]));
 assert.equal(req.backendPreviewRequired,true);
 assert.equal(req.backendLiveDeployAllowed,false);
 assert.equal(req.realDataWritesAllowed,false);
 assert.equal(control.forbidBackendFunctionDeploy,true);
 assert.equal(control.livePromotionAuthorized,false);
 assert.equal(control.noHostingPromotion,true);
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
 assert.equal(req.sourceQaHead,'196e3cdbae5a02792f19acc3cacd37621836c02f');
 assert.equal(req.sourceQaRunId,45183267436);
 assert.equal(req.guardRunId,45183267325);
 assert.equal(req.previousReceiptBlob,sha('artifacts/orbit360-recovery/release-control/I6_6_FRONTEND_E00002_RECEIPT.json'));
});
