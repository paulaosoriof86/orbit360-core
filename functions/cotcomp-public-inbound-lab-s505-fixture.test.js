'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-public-inbound-lab-s505-fixture');

test('S5.05 fixture is LAB-only and synthetic',()=>{
  process.env.S505_PROOF_TOKEN='synthetic-proof-token-12345678901234567890';
  const f=s.fixture('s505-123456');
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(f.permit.synthetic,true);
  assert.equal(f.member.synthetic,true);
  assert.equal(f.permit.country,'GT');
});

test('S5.05 fixture requires an ephemeral proof token',()=>{
  process.env.S505_PROOF_TOKEN='short';
  assert.throws(()=>s.fixture('s505-abcdef'),/S505_TOKEN_MISSING/);
});
