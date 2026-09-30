'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const h=require('./cotcomp-w2-readiness-harness-s448');

test('S4.48 fixture remains synthetic and execution-off',()=>{
  const p=h.buildFixture();
  assert.equal(p.ok,true);
  assert.equal(p.executable,false);
  assert.equal(p.commands.length,2);
  assert.equal(h.EXECUTION_ENABLED,false);
  assert.equal(h.APP_DATA_READS_ALLOWED,false);
  assert.equal(h.APP_DATA_WRITES_ALLOWED,false);
});

test('S4.48 journal is exact and finite for legacy storage',()=>{
  const p=h.buildFixture();
  const j=h.buildJournal({storageMode:'legacyCompatible',projection:p});
  assert.equal(j.ok,true);
  assert.equal(j.entries.length,8);
  assert.equal(new Set(j.entries.map(x=>x.path)).size,8);
  assert.equal(j.expectedCreatedDocuments,8);
  assert.equal(j.portalNotificationExpected,false);
  assert.equal(j.providerDeliveryAllowed,false);
  assert.equal(j.entries.filter(x=>x.component==='notification_outbox').length,2);
});

test('S4.48 journal supports canonicalV2 without changing non-entity journals',()=>{
  const p=h.buildFixture();
  const legacy=h.buildJournal({storageMode:'legacyCompatible',projection:p});
  const canonical=h.buildJournal({storageMode:'canonicalV2',projection:p});
  assert.equal(canonical.ok,true);
  assert.equal(canonical.entries.length,8);
  const legacyNonEntity=legacy.entries.filter(x=>x.component!=='workflow_entity').map(x=>x.path).sort();
  const canonicalNonEntity=canonical.entries.filter(x=>x.component!=='workflow_entity').map(x=>x.path).sort();
  assert.deepEqual(canonicalNonEntity,legacyNonEntity);
  assert.notDeepEqual(
    canonical.entries.filter(x=>x.component==='workflow_entity').map(x=>x.path),
    legacy.entries.filter(x=>x.component==='workflow_entity').map(x=>x.path)
  );
});

test('S4.48 journal fails closed until runtime storage mode is known',()=>{
  const j=h.buildJournal({projection:h.buildFixture()});
  assert.equal(j.ok,false);
  assert.equal(j.code,'RUNTIME_STORAGE_MODE_REQUIRED');
});

test('S4.48 in-memory lifecycle proves harness retry conflict cleanup semantics',()=>{
  const p=h.buildFixture();
  const j=h.buildJournal({storageMode:'legacyCompatible',projection:p});
  const r=h.simulateLifecycle({projection:p,journal:j});
  assert.equal(r.ok,true);
  assert.equal(r.firstCreates,8);
  assert.equal(r.sizeAfterFirst,8);
  assert.equal(r.retryWrites,0);
  assert.equal(r.duplicateOnRetry,false);
  assert.equal(r.conflictDenied,true);
  assert.equal(r.conflictWrites,0);
  assert.equal(r.cleanupDeletes,8);
  assert.equal(r.finalAbsence,true);
  assert.equal(r.finalDocumentCount,0);
});

test('S4.48 remains blocked before runtime config proof and owner W2 authorization',()=>{
  const p=h.buildFixture();
  const r=h.readiness({
    projection:p,
    storageMode:'legacyCompatible',
    workflowOwnerRuntimeVerified:true,
    providerDeliveryIsolationVerified:true,
    runtimeStorageModeVerified:false,
    ownerW2Authorization:false
  });
  assert.equal(r.sourceHarnessReady,true);
  assert.equal(r.effectiveCallAllowed,false);
  assert.equal(r.effectiveWriteAllowed,false);
  assert.ok(r.blockers.includes('W2_RUNTIME_CONFIG_READBACK_REQUIRED'));
  assert.ok(r.blockers.includes('OWNER_W2_AUTHORIZATION_REQUIRED'));
});
