'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-secure-writer-envelope');

function deps(){
  const calls=[];
  return {
    calls,
    value:{
      storage:{
        read:async(...args)=>{calls.push(['read',args]);return null;},
        runAtomicGroup:async(...args)=>{calls.push(['runAtomicGroup',args]);return {};},
        patch:async(...args)=>{calls.push(['patch',args]);return {};}
      },
      clock:{nowIso:()=>{calls.push(['clock']);return '2026-09-30T10:00:00-06:00';}},
      audit:{record:async(...args)=>{calls.push(['audit',args]);}}
    }
  };
}

function input(){
  return {
    tenantId:'alianzas-soluciones',
    idempotencyKey:'idem-s425-1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields:{brand:'Toyota',lineModel:'Corolla'},
    missingFields:[],
    contact:{name:'Paula',whatsapp:'+50255555555',email:'paula@example.com'},
    consents:{requestManagement:true},
    caseAccessToken:'opaque-token',
    caseAccessExpiresAt:'2026-10-01T12:00:00Z',
    gate:{}
  };
}

test('secure writer stays execution and dependency-call locked',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.WRITES_ENABLED,false);
  assert.equal(s.DEPENDENCY_CALLS_ALLOWED,false);
});

test('new idempotency digest passes security preflight but cannot execute',()=>{
  const d=deps();
  const r=s.buildInitialHandoffEnvelope({
    deps:d.value,input:input(),incomingRequestDigest:'digest-A'
  });
  assert.equal(r.securityPreflightPass,true);
  assert.equal(r.replay.code,'NEW_REQUEST');
  assert.equal(r.effectiveExecutionAllowed,false);
  assert.deepEqual(d.calls,[]);
});

test('matching idempotency digest is safe retry',()=>{
  const d=deps();
  const r=s.buildInitialHandoffEnvelope({
    deps:d.value,input:input(),
    existingIdempotencyRecord:{requestDigest:'digest-A'},
    incomingRequestDigest:'digest-A'
  });
  assert.equal(r.securityPreflightPass,true);
  assert.equal(r.replay.code,'IDEMPOTENT_RETRY_MATCH');
  assert.deepEqual(d.calls,[]);
});

test('same idempotency identity with changed digest fails preflight',()=>{
  const d=deps();
  const r=s.buildInitialHandoffEnvelope({
    deps:d.value,input:input(),
    existingIdempotencyRecord:{requestDigest:'digest-A'},
    incomingRequestDigest:'digest-B'
  });
  assert.equal(r.securityPreflightPass,false);
  assert.equal(r.replay.code,'IDEMPOTENCY_PAYLOAD_CONFLICT');
  assert.deepEqual(d.calls,[]);
});

test('wrong tenant context fails preflight',()=>{
  const d=deps();
  const bad={...input(),tenantId:'otro-tenant'};
  const r=s.buildInitialHandoffEnvelope({
    deps:d.value,input:bad,incomingRequestDigest:'digest-A'
  });
  assert.equal(r.securityPreflightPass,false);
  assert.ok(r.context.reasons.includes('TENANT_NOT_ALLOWED'));
  assert.deepEqual(d.calls,[]);
});

test('public response rejects PII/internal fields',()=>{
  const r=s.buildPublicResponseEnvelope({
    caseId:'qcase_1',
    alternatives:[{proposalId:'p1'}],
    contact:{email:'secret@example.com'}
  });
  assert.equal(r.ok,false);
  assert.equal(r.payload,null);
});

test('safe public response remains available',()=>{
  const payload={caseId:'qcase_1',alternatives:[{proposalId:'p1',premium:2100}]};
  const r=s.buildPublicResponseEnvelope(payload);
  assert.equal(r.ok,true);
  assert.deepEqual(r.payload,payload);
});

test('implicit selection fails security preflight through canonical preview',()=>{
  const d=deps();
  const r=s.buildSelectionEnvelope({
    deps:d.value,
    input:{
      tenantId:'alianzas-soluciones',
      caseId:'qcase_1',
      comparisonSetId:'cmp_1',
      proposalId:'p1',
      selectionRequestKey:'sel-1',
      explicitUserChoice:false
    }
  });
  assert.equal(r.securityPreflightPass,false);
  assert.deepEqual(d.calls,[]);
});

test('explicit selection passes preflight but still cannot execute',()=>{
  const d=deps();
  const r=s.buildSelectionEnvelope({
    deps:d.value,
    input:{
      tenantId:'alianzas-soluciones',
      caseId:'qcase_1',
      comparisonSetId:'cmp_1',
      proposalId:'p1',
      selectionRequestKey:'sel-1',
      explicitUserChoice:true
    }
  });
  assert.equal(r.securityPreflightPass,true);
  assert.equal(r.effectiveExecutionAllowed,false);
  assert.deepEqual(d.calls,[]);
});

test('execution assertion is hard closed',()=>{
  assert.throws(()=>s.assertExecutionClosed(),/COTCOMP_SECURE_WRITER_EXECUTION_DISABLED/);
});
