'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const h=require('./cotcomp-negative-security-harness');
const security=require('./cotcomp-negative-security-contract');

test('negative security harness has no side-effect permission',()=>{
  assert.equal(h.SIDE_EFFECTS_ALLOWED,false);
});

test('matrix contains all frozen attack/failure families',()=>{
  const r=h.runMatrix();
  const ids=new Set(r.results.map(x=>x.id));
  for(const id of [
    'SEC-01','SEC-02','SEC-03','SEC-04','SEC-05','SEC-06','SEC-07',
    'SEC-08','SEC-09','SEC-10','SEC-11','SEC-12','SEC-13','SEC-14'
  ]) assert.ok(ids.has(id),id);
});

test('all S4.24 security scenarios pass source-only',()=>{
  const r=h.runMatrix();
  assert.equal(r.total,14);
  assert.equal(r.passed,14);
  assert.equal(r.failed,0);
  assert.deepEqual(r.results.filter(x=>!x.ok),[]);
});

test('idempotency same digest is safe retry',()=>{
  const r=security.evaluateIdempotencyReplay({
    existingRequestDigest:'abc',
    incomingRequestDigest:'abc'
  });
  assert.equal(r.ok,true);
  assert.equal(r.code,'IDEMPOTENT_RETRY_MATCH');
});

test('idempotency same key with changed payload digest fails closed',()=>{
  const r=security.evaluateIdempotencyReplay({
    existingRequestDigest:'abc',
    incomingRequestDigest:'xyz'
  });
  assert.equal(r.ok,false);
  assert.equal(r.code,'IDEMPOTENCY_PAYLOAD_CONFLICT');
});

test('public payload scanner detects direct and nested PII/internal fields',()=>{
  const r=security.validatePublicPayload({
    alternatives:[{proposalId:'p1'}],
    nested:{contact:{email:'secret@example.com'}}
  });
  assert.equal(r.ok,false);
  assert.ok(r.forbidden.some(x=>x.endsWith('.contact')));
  assert.ok(r.forbidden.some(x=>x.endsWith('.email')));
});

test('safe public payload passes scanner',()=>{
  const r=security.validatePublicPayload({
    caseId:'qcase_1',
    alternatives:[{proposalId:'p1',premium:2000}]
  });
  assert.equal(r.ok,true);
  assert.deepEqual(r.forbidden,[]);
});
