'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('./gravicentra-i6-6-cloud-build-package.cjs');
const focal = require('./gravicentra-i6-6-focal-hosting-composition.cjs');
const {admitFocalHostingRequest} = require('./gravicentra-i6-6-frontend-preview-authority.cjs');

function fixture() {
  const row = {artifactId:123,artifactDigest:'sha256:'+'9'.repeat(64),sourceSha:'a'.repeat(40),buildId:'previous'};
  const request = {schema:'GI_I66_FOCAL_HOSTING_REQUEST_V1',scope:'HOSTING_ONLY',generation:4,changes:['BASE','EXT'],
    protectedPreviewRequestVersion:35,previousReceiptBlob:'c'.repeat(40),previousReceiptPath:'release.json'};
  const file = 'orbit360-platform/modules/comparativo.js';
  const history = {hostingVersion:'sites/ays-orbit-360-lab/versions/existing',generation:3,receiptPath:'release.json',receiptGitBlobSha:request.previousReceiptBlob};
  return {request,control:{gateState:{gates:{I6:{activeSubgate:'I6.6'}}},currentExecutionDecisionPointer:'current',current:{...row,...history}},
    transport:{frontendReleaseSequence:3,currentPhysicalHostingRelease:{...row,liveHostingVersion:history.hostingVersion},
      frontendPreviewRequest:{version:35},forbidBackendFunctionDeploy:true,forbidFirestoreRulesDataAuthWrites:true},
    receipt:{target:{...row,hostingVersion:history.hostingVersion},generation:3},
    manifestChanges:[{id:'BASE',approvedByDirection:true,paths:[{path:file,gitBlobSha:'2'.repeat(40)}]},
      {id:'EXT',approvedByDirection:true,paths:[{path:file,gitBlobSha:'3'.repeat(40),replaces:{priorGitBlobSha:'2'.repeat(40)}}]}],
    pins:[{path:file,before:'1'.repeat(40),after:'3'.repeat(40)}]};
}

test('admit only the signed manifest unit over the current physical release',()=>{
  const data=fixture(); assert.equal(admitFocalHostingRequest(data),true);
});

for(const [name,change] of Object.entries({
  'different physical version':data=>{data.transport.currentPhysicalHostingRelease.liveHostingVersion+='other';},
  'different live digest':data=>{data.receipt.target.artifactDigest='sha256:'+'8'.repeat(64);},
  'consumed frontend generation':data=>{data.request.generation=3;},
  'different protected request':data=>{data.transport.frontendPreviewRequest.version++;},
  'unapproved manifest successor':data=>{data.manifestChanges[1].approvedByDirection=false;},
  'missing successor preimage':data=>{data.manifestChanges[1].paths[0].replaces.priorGitBlobSha='4'.repeat(40);},
  'unlisted product file':data=>{data.pins.push({path:'orbit360-platform/core/notify.js',before:'5'.repeat(40),after:'6'.repeat(40)});},
  'backend dependency':data=>{data.manifestChanges[0].paths.push({path:'functions/backend.js',gitBlobSha:'7'.repeat(40)});},
  'mixed release scope':data=>{data.request.scope='COMPOSITE';},
  'receipt rollback drift':data=>{data.request.previousReceiptBlob='e'.repeat(40);},
})) test('reject '+name,()=>{const data=fixture();change(data);assert.throws(()=>admitFocalHostingRequest(data));});

test('changing generated identities requires their exact predecessor',()=>{
  const previous={buildId:'old-build',sourceSha:'old-source'}, target={buildId:'new-build',sourceSha:'new-source'};
  assert.equal(focal.rebind('product-runtime-config.js',Buffer.from('old-build|old-source'),previous,target).toString(),'new-build|new-source');
  assert.throws(()=>focal.rebind('product-runtime-config.js',Buffer.from('old-build|other-source'),previous,target));
  assert.throws(()=>focal.rebind('modules/cotizador.js',Buffer.from('old-build'),previous,target));
});

test('package config and claims separate the protected composite request from focal Hosting',()=>{
  const request={generation:4,sourceSha:'e'.repeat(40)},p={schema:focal.schema,request,requestDigest:pkg.digest(request),
    mechanismSha:'d'.repeat(40),sourceSha:request.sourceSha,sourceTreeSha:'b'.repeat(40),compositionTree:'a'.repeat(40),requestVersion:4};
  const cfg=pkg.configFor(p),id='de000000-0000-4000-8000-000000000000';
  assert.deepEqual(cfg.artifacts.objects.paths,focal.members);
  assert.ok(cfg.artifacts.objects.location.includes('/focal-hosting/'+p.requestDigest+'/'));
  assert.notEqual(pkg.lockName(p),pkg.lockName({sourceSha:p.sourceSha,requestVersion:35}));
  assert.notEqual(pkg.artifactPrefix(p,id),pkg.artifactPrefix({sourceSha:p.sourceSha,requestVersion:35},id));
  assert.throws(()=>pkg.configFor({...p,requestDigest:'f'.repeat(64)}));
});
