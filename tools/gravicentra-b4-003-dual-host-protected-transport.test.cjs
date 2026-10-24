'use strict';
// I6.5/B4-003 exact-source synthetic contract only. No network, real users or writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const provider=fs.readFileSync('orbit360-platform/core/product-runtime-browser-providers-p0.js','utf8');
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
const backend=fs.readFileSync('functions/b4-003-scoped-policy-callable.js','utf8');
const workflow=fs.readFileSync('.github/workflows/gravicentra-b4-003-executor.yml','utf8');
const packaging=fs.readFileSync('tools/gravicentra-i6-1-preview-package.mjs','utf8');

// Exercise the production selectors without exporting them in the application.
const instrumented=provider.replace(
  'window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze(',
  'window.__b4003TransportSelectors={protectedHostMode:protectedHostMode,protectedReaderName:protectedReaderName,protectedTransportError:protectedTransportError};'+
  'window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze('
);
assert.notEqual(instrumented,provider,'PROVIDER_SELECTOR_INSTRUMENTATION_MISSING');
function selectors(hostname,flag){
  const window={Orbit:{},location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{scopedReadPreviewCandidate:flag}};
  vm.runInNewContext(instrumented,{window,Promise,Set,Map,console},{timeout:1000});
  return window.__b4003TransportSelectors;
}
const preview=selectors('ays-orbit-360-lab--gi-i65-b4-test.web.app',true);
const live=selectors('ays-orbit-360-lab.web.app',true);
const liveAlias=selectors('ays-orbit-360-lab.firebaseapp.com',true);
assert.equal(preview.protectedReaderName(),'orbit360ScopedPolicyReadPreview');
assert.equal(live.protectedReaderName(),'orbit360ScopedPolicyRead');
assert.equal(liveAlias.protectedReaderName(),'orbit360ScopedPolicyRead');
for(const hostname of ['ays-orbit-360-lab--gi-i65-b4-test.web.app','ays-orbit-360-lab.web.app','ays-orbit-360-lab.firebaseapp.com']){
  assert.equal(selectors(hostname,false).protectedTransportError(),'PROTECTED_READ_CANDIDATE_DISABLED');
  assert.equal(selectors(hostname,true).protectedTransportError(),'');
}
const wrong=selectors('ays-orbit-360-lab--other-test.web.app',true);
assert.equal(wrong.protectedTransportError(),'PROTECTED_READ_HOST_DENIED');
assert.throws(()=>wrong.protectedReaderName(),/PROTECTED_READ_HOST_DENIED/);
assert.match(app,/protectedReadCandidate:\s*cfg\.scopedReadPreviewCandidate===true\s*&&\s*scopedChannel/);
assert.match(provider,/return callFunction\(protectedReaderName\(\),outbound,'us-east1'\)/);
assert.match(provider,/return callFunction\(protectedReaderName\(\),\{tenantId:tenant,mode:mode,uid:uid\|\|undefined\},'us-east1'\)/);

// Both names are staged in the single backend source, but no LIVE deployment.
assert.match(backend,/orbit360ScopedPolicyReadPreview:onCall\(opts,handle\)/);
assert.match(backend,/orbit360ScopedPolicyRead:onCall\(opts,handle\)/);
assert.match(packaging,/stagedExports:\['orbit360ScopedPolicyReadPreview','orbit360ScopedPolicyRead'\]/);
assert.match(workflow,/deploy --only functions:orbit360ScopedPolicyReadPreview(?:,functions:orbit360AssignableAdvisorRosterPreview)? /);
assert.doesNotMatch(workflow,/deploy --only functions:orbit360ScopedPolicyRead(?:\s|,)/);
assert.equal(JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'))
  .b4003SecurityReleaseHold.livePromotionAuthorized,false);
console.log('B4_003_DUAL_HOST_PROTECTED_TRANSPORT_SYNTHETIC_PASS readers=2 no_direct_fallback=true preview_deploy_only=true live_hold=true');
