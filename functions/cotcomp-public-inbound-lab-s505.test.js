'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-public-inbound-lab-s505');

test('S5.05 is hard-pinned to LAB and tenant',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.FUNCTION_NAME,'cotcompPublicInboundS505');
});

test('S5.05 proof and idempotency identifiers fail closed',()=>{
  assert.equal(s.validProofRunId('s505-123456'),true);
  assert.equal(s.validProofRunId('real-customer'),false);
  assert.equal(s.validIdempotencyKey('idem-123456'),true);
  assert.equal(s.validIdempotencyKey('123'),false);
});

test('S5.05 country/family mapping is explicit',()=>{
  assert.equal(s.country('gt'),'GT');
  assert.equal(s.country('CO'),'CO');
  assert.equal(s.country('US'),'');
  assert.equal(s.family('vehicle'),'Vehículo / Movilidad');
  assert.equal(s.family('cargo'),'Transporte / Carga');
  assert.equal(s.family('unknown'),'');
});

test('S5.05 origin allowlist is production-domain only',()=>{
  assert.equal(s.ALLOWED_ORIGINS.has('https://aysseguros.com'),true);
  assert.equal(s.ALLOWED_ORIGINS.has('https://www.aysseguros.com'),true);
  assert.equal(s.ALLOWED_ORIGINS.has('https://example.com'),false);
});
