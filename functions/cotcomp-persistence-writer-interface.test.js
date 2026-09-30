'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const w = require('./cotcomp-persistence-writer-interface');

function spyDeps() {
  const calls = [];
  return {
    calls,
    deps: {
      storage: {
        read: async (...args) => { calls.push(['read',args]); return null; },
        runAtomicGroup: async (...args) => { calls.push(['runAtomicGroup',args]); return {}; },
        patch: async (...args) => { calls.push(['patch',args]); return {}; }
      },
      clock: {
        nowIso: () => { calls.push(['nowIso']); return '2026-09-29T21:00:00-06:00'; }
      },
      audit: {
        record: async (...args) => { calls.push(['audit.record',args]); }
      }
    }
  };
}

function sample() {
  return {
    tenantId:'alianzas-soluciones',
    idempotencyKey:'idem-s422-1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields:{brand:'Toyota',lineModel:'Corolla'},
    missingFields:[],
    contact:{name:'Paula',whatsapp:'+50255555555',email:'paula@example.com'},
    consents:{requestManagement:true},
    caseAccessToken:'opaque-token',
    caseAccessExpiresAt:'2026-09-30T12:00:00Z',
    gate:{}
  };
}

test('writer interface is server-side only and fully execution-locked', () => {
  assert.equal(w.SERVER_SIDE_ONLY,true);
  assert.equal(w.EXECUTION_ENABLED,false);
  assert.equal(w.WRITES_ENABLED,false);
  assert.equal(w.DEPENDENCY_CALLS_ALLOWED,false);
});

test('dependency contract is explicit', () => {
  const c=w.dependencyContract();
  assert.match(c.storage.runAtomicGroup,/group,commands,context/);
  assert.ok(c.forbidden.includes('direct_public_workflow_write'));
  assert.ok(c.forbidden.includes('provider_or_rater_call'));
});

test('missing dependencies fail validation closed', () => {
  const r=w.validateDependencies({});
  assert.equal(r.ok,false);
  assert.ok(r.missing.includes('storage'));
  assert.ok(r.missing.includes('clock'));
  assert.ok(r.missing.includes('audit'));
});

test('complete injected dependencies validate without being called', () => {
  const s=spyDeps();
  const r=w.validateDependencies(s.deps);
  assert.equal(r.ok,true);
  assert.deepEqual(s.calls,[]);
});

test('preview delegates to S4.21 dry-run adapter without calling dependencies', () => {
  const s=spyDeps();
  const writer=w.createWriter(s.deps);
  const preview=writer.previewInitialHandoff(sample());
  assert.equal(preview.ok,true);
  assert.equal(preview.dryRunOnly,true);
  assert.equal(preview.executionEnabled,false);
  assert.equal(preview.writesEnabled,false);
  assert.equal(preview.serverSideOnly,true);
  assert.deepEqual(s.calls,[]);
});

test('workflow commands remain blocked while schema is not deployed', () => {
  const writer=w.createWriter(spyDeps().deps);
  const preview=writer.previewInitialHandoff(sample());
  const ops=preview.commands.filter(x=>x.phase==='OPERATIONS_PROJECTION');
  assert.equal(ops.length,2);
  assert.ok(ops.every(x=>x.blockReason==='WORKFLOW_COTCOMP_SCHEMA_NOT_DEPLOYED'));
});

test('proposal preview remains no-ranking', () => {
  const writer=w.createWriter(spyDeps().deps);
  const r=writer.previewProposal({proposal:{
    tenantId:'alianzas-soluciones',proposalId:'p1',caseId:'qcase_1',country:'GT',
    product:'AUTO',currency:'GTQ',insurerId:'ins1',sourceId:'src1',validationState:'RECEIVED'
  }});
  assert.equal(r.ok,true);
  assert.equal(r.comparisonEligibility.rankingPolicy,'NONE_BY_DEFAULT');
});

test('selection preview remains non-binding', () => {
  const writer=w.createWriter(spyDeps().deps);
  const r=writer.previewSelection({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    proposalId:'p1',selectionRequestKey:'select-s422-1',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.truth.issuanceState,'NOT_ISSUED');
  assert.equal(r.truth.bindingState,'NOT_BOUND');
  assert.equal(r.truth.coverageState,'NOT_CONFIRMED');
});

test('execution methods fail before any injected dependency can be called', async () => {
  const s=spyDeps();
  const writer=w.createWriter(s.deps);
  await assert.rejects(()=>writer.executeInitialHandoff(sample()),/COTCOMP_WRITER_EXECUTION_DISABLED/);
  await assert.rejects(()=>writer.executeProposal({}),/COTCOMP_WRITER_EXECUTION_DISABLED/);
  await assert.rejects(()=>writer.executeSelection({}),/COTCOMP_WRITER_EXECUTION_DISABLED/);
  assert.deepEqual(s.calls,[]);
});

test('closed execution assertion fails deterministically', () => {
  assert.throws(()=>w.assertExecutionClosed(),/COTCOMP_WRITER_EXECUTION_DISABLED/);
});
