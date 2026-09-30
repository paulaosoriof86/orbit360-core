'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const gate=require('./cotcomp-runtime-config-readback-s449');

const OWNER_SOURCE=[
  "function configRef(tenantId) { return db.collection('tenants').doc(tenantId).collection('config').doc('workflow'); }",
  "storageMode: raw.storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible'",
  "return config && config.storageMode === 'canonicalV2' ? canonicalRef() : legacyRef();"
].join('\n');

test('S4.49 decodes explicit canonicalV2',()=>{
  const r=gate.decodeReadback({
    httpStatus:200,
    response:{fields:{storageMode:{stringValue:'canonicalV2'},version:{stringValue:'v1'}}}
  });
  assert.equal(r.readable,true);
  assert.equal(r.documentExists,true);
  assert.equal(r.rawStorageMode,'canonicalV2');
  assert.equal(r.effectiveStorageMode,'canonicalV2');
});

test('S4.49 decodes explicit legacyCompatible through owner fallback',()=>{
  const r=gate.decodeReadback({
    httpStatus:200,
    response:{fields:{storageMode:{stringValue:'legacyCompatible'}}}
  });
  assert.equal(r.readable,true);
  assert.equal(r.effectiveStorageMode,'legacyCompatible');
});

test('S4.49 absent config document resolves to owner legacy default',()=>{
  const r=gate.decodeReadback({httpStatus:404,response:{}});
  assert.equal(r.readable,true);
  assert.equal(r.documentExists,false);
  assert.equal(r.effectiveStorageMode,'legacyCompatible');
  assert.equal(r.basis,'CONFIG_DOCUMENT_ABSENT_OWNER_DEFAULT');
});

test('S4.49 unexpected raw value is not invented as a new runtime mode',()=>{
  const r=gate.decodeReadback({
    httpStatus:200,
    response:{fields:{storageMode:{stringValue:'experimental'}}}
  });
  assert.equal(r.rawStorageMode,'experimental');
  assert.equal(r.effectiveStorageMode,'legacyCompatible');
});

test('S4.49 successful exact readback closes only storage-mode blocker',()=>{
  const r=gate.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    tenantId:'alianzas-soluciones',
    functionState:'ACTIVE',
    deployedOwnerBlob:gate.EXPECTED_OWNER_BLOB,
    ownerSource:OWNER_SOURCE,
    configHttpStatus:200,
    configResponse:{fields:{storageMode:{stringValue:'canonicalV2'},version:{stringValue:'test'}}},
    configReadAttempts:1,
    appDataWritesExecuted:0,
    w2Executed:false,
    providerDeliveryExecuted:false,
    realDataTouched:false,
    productionTouched:false,
    deployExecuted:false,
    iamWritesExecuted:0,
    firebaseConfigWritesExecuted:0
  });
  assert.equal(r.runtimeStorageModeVerified,true);
  assert.equal(r.effectiveStorageMode,'canonicalV2');
  assert.deepEqual(r.remainingW2Blockers,['OWNER_W2_AUTHORIZATION_REQUIRED']);
  assert.equal(r.effectiveW2CallAllowed,false);
  assert.equal(r.effectiveW2WriteAllowed,false);
});

test('S4.49 config read failure remains fail-closed',()=>{
  const r=gate.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    tenantId:'alianzas-soluciones',
    functionState:'ACTIVE',
    deployedOwnerBlob:gate.EXPECTED_OWNER_BLOB,
    ownerSource:OWNER_SOURCE,
    configHttpStatus:403,
    configResponse:{},
    configReadAttempts:1,
    appDataWritesExecuted:0,
    w2Executed:false,
    providerDeliveryExecuted:false,
    realDataTouched:false,
    productionTouched:false,
    deployExecuted:false,
    iamWritesExecuted:0,
    firebaseConfigWritesExecuted:0
  });
  assert.equal(r.runtimeStorageModeVerified,false);
  assert.ok(r.blockers.includes('RUNTIME_WORKFLOW_CONFIG_READBACK_FAILED'));
  assert.deepEqual(r.remainingW2Blockers,['W2_RUNTIME_CONFIG_READBACK_REQUIRED','OWNER_W2_AUTHORIZATION_REQUIRED']);
});

test('S4.49 any write or W2 execution fails closed',()=>{
  const r=gate.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    tenantId:'alianzas-soluciones',
    functionState:'ACTIVE',
    deployedOwnerBlob:gate.EXPECTED_OWNER_BLOB,
    ownerSource:OWNER_SOURCE,
    configHttpStatus:404,
    configResponse:{},
    configReadAttempts:1,
    appDataWritesExecuted:1,
    w2Executed:true,
    providerDeliveryExecuted:false,
    realDataTouched:false,
    productionTouched:false,
    deployExecuted:false,
    iamWritesExecuted:0,
    firebaseConfigWritesExecuted:0
  });
  assert.equal(r.runtimeStorageModeVerified,false);
  assert.ok(r.blockers.includes('APP_DATA_WRITES_NOT_ZERO'));
  assert.ok(r.blockers.includes('W2_EXECUTED_FORBIDDEN'));
});
