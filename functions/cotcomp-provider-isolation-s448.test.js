'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const isolation=require('./cotcomp-provider-isolation-s448');

const SAFE_OWNER=[
  "function outboxRef(){ return db.collection('tenants').doc('x').collection('notificationOutbox').doc('e'); }",
  "tx.set(outboxRef(), { status: 'pending_provider' }, { merge:false });"
].join('\n');

test('S4.48 safe owner source exposes outbox but no direct provider delivery',()=>{
  const r=isolation.analyzeOwnerSource(SAFE_OWNER);
  assert.equal(r.requiredOutboxMarkersPresent,true);
  assert.equal(r.directProviderCallDetected,false);
  assert.equal(r.sourceProviderIsolationSupported,true);
});

test('S4.48 direct provider marker fails closed',()=>{
  const r=isolation.analyzeOwnerSource(SAFE_OWNER+"\nfetch('https://provider.example')");
  assert.equal(r.directProviderCallDetected,true);
  assert.equal(r.sourceProviderIsolationSupported,false);
});

test('S4.48 automatic outbox trigger fails closed',()=>{
  const r=isolation.analyzeRuntimeInventory({
    functionsInventoryRead:true,
    eventarcInventoryRead:true,
    functions:[{name:'consumer',eventTrigger:{document:'tenants/{tenant}/notificationOutbox/{id}'}}],
    eventarcTriggers:[]
  });
  assert.equal(r.automaticOutboxConsumerDetected,true);
  assert.equal(r.infrastructureIsolationSupported,false);
});

test('S4.48 full provider isolation requires exact LAB evidence and zero effects',()=>{
  const r=isolation.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    functionState:'ACTIVE',
    deployedOwnerBlob:isolation.EXPECTED_OWNER_BLOB,
    ownerSource:SAFE_OWNER,
    functionsInventoryRead:true,
    eventarcInventoryRead:true,
    functions:[{name:'orbit360OpsLeadsCommand',httpsTrigger:{}}],
    eventarcTriggers:[],
    appDataReadsExecuted:0,
    appDataWritesExecuted:0,
    w2Executed:false,
    providerDeliveryExecuted:false,
    realDataTouched:false,
    productionTouched:false
  });
  assert.equal(r.providerDeliveryIsolationVerified,true);
  assert.deepEqual(r.blockers,[]);
  assert.equal(r.effectiveW2CallAllowed,false);
  assert.equal(r.effectiveW2WriteAllowed,false);
});

test('S4.48 missing Eventarc inventory cannot be promoted to verified',()=>{
  const r=isolation.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    functionState:'ACTIVE',
    deployedOwnerBlob:isolation.EXPECTED_OWNER_BLOB,
    ownerSource:SAFE_OWNER,
    functionsInventoryRead:true,
    eventarcInventoryRead:false,
    functions:[],
    eventarcTriggers:[],
    appDataReadsExecuted:0,
    appDataWritesExecuted:0,
    w2Executed:false,
    providerDeliveryExecuted:false,
    realDataTouched:false,
    productionTouched:false
  });
  assert.equal(r.providerDeliveryIsolationVerified,false);
  assert.ok(r.blockers.includes('EVENTARC_INVENTORY_READ_REQUIRED'));
});
