'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./cotcomp-runtime-export-delta-s438');
const m=require('./cotcomp-lab-readback-manifest-s438');

test('future bootstrap delta is exact and not applied',()=>{
  const x=d.proposedBootstrapDelta();
  assert.equal(x.action,'FUTURE_DIFF_ONLY');
  assert.equal(x.applyNow,false);
  assert.deepEqual(x.exportNames,[
    'cotcompValidateDraft',
    'cotcompSubmitHandoff',
    'cotcompFetchComparableProposals',
    'cotcompSelectProposal'
  ]);
});

test('exact future delta validates but remains non-applicable',()=>{
  const x=d.proposedBootstrapDelta();
  const r=d.validateDelta({
    targetFile:x.targetFile,
    importModule:x.importModule,
    exportNames:x.exportNames,
    applyNow:false,
    deployRequested:false,
    writesEnabled:false
  });
  assert.equal(r.ok,true);
  assert.equal(r.effectiveApplyAllowed,false);
  assert.equal(r.applyAllowedByCode,false);
});

test('attempt to apply or deploy fails validation',()=>{
  const x=d.proposedBootstrapDelta();
  const r=d.validateDelta({
    targetFile:x.targetFile,
    importModule:x.importModule,
    exportNames:x.exportNames,
    applyNow:true,
    deployRequested:true,
    writesEnabled:true
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('APPLY_NOT_AUTHORIZED'));
  assert.ok(r.reasons.includes('DEPLOY_NOT_AUTHORIZED'));
  assert.ok(r.reasons.includes('WRITES_MUST_REMAIN_DISABLED'));
});

test('readback manifest freezes exact LAB callable security settings',()=>{
  const x=m.expectedManifest();
  assert.equal(x.projectId,'ays-orbit-360-lab');
  assert.equal(x.functionNames.length,4);
  assert.equal(x.appCheck.cotcompSubmitHandoff,true);
  assert.equal(x.replayProtection.cotcompSubmitHandoff,true);
  assert.equal(x.replayProtection.cotcompValidateDraft,false);
  assert.equal(x.persistenceEnabled,false);
});

test('exact synthetic zero-write readback fixture validates structurally',()=>{
  const x=m.expectedManifest();
  const r=m.validateReadback({
    ...x,
    writesExecuted:0
  });
  assert.equal(r.ok,true);
  assert.equal(r.deployedByCode,false);
  assert.equal(r.runtimeVerifiedByCode,false);
});

test('wrong function set or write count fails readback',()=>{
  const x=m.expectedManifest();
  const r=m.validateReadback({
    ...x,
    functionNames:['cotcompValidateDraft'],
    writesExecuted:1
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('FUNCTION_SET_MISMATCH'));
  assert.ok(r.reasons.includes('WRITES_MUST_BE_ZERO'));
});

test('apply assertion stays hard closed',()=>{
  assert.throws(()=>d.assertApplyClosed(),/COTCOMP_RUNTIME_EXPORT_APPLY_DISABLED/);
});
