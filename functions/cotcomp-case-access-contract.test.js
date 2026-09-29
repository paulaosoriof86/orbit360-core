'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./cotcomp-case-access-contract');

test('case access contract keeps runtime and persistence off', () => {
  assert.equal(c.RUNTIME_ENABLED,false);
  assert.equal(c.PERSISTENCE_ENABLED,false);
  assert.equal(c.TOKEN_FORMAT.rawTokenPersistenceAllowed,false);
  assert.equal(c.TOKEN_FORMAT.browserStoresSecret,false);
});

test('record stores only token hash', () => {
  const r=c.buildCaseAccessRecord({
    quoteCaseId:'qc1',rawToken:'qca_secret',expiresAt:'2026-09-30T00:00:00Z',createdAt:'2026-09-29T20:00:00Z'
  });
  assert.equal(r.ok,true);
  assert.equal(r.record.rawTokenStored,false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.record,'rawToken'),false);
  assert.equal(r.record.tokenHash,c.hashToken('qca_secret'));
});

test('valid token grants only matching unexpired case access', () => {
  const rec=c.buildCaseAccessRecord({
    quoteCaseId:'qc1',rawToken:'qca_secret',expiresAt:'2026-09-30T00:00:00Z'
  }).record;
  const ok=c.verifyCaseAccessRecord({quoteCaseId:'qc1',rawToken:'qca_secret',now:'2026-09-29T21:00:00Z',record:rec});
  assert.equal(ok.ok,true);

  const other=c.verifyCaseAccessRecord({quoteCaseId:'qc2',rawToken:'qca_secret',now:'2026-09-29T21:00:00Z',record:rec});
  assert.equal(other.code,'CASE_ACCESS_CASE_MISMATCH');
});

test('invalid, revoked and expired token fail closed', () => {
  const rec=c.buildCaseAccessRecord({
    quoteCaseId:'qc1',rawToken:'qca_secret',expiresAt:'2026-09-30T00:00:00Z'
  }).record;
  assert.equal(c.verifyCaseAccessRecord({quoteCaseId:'qc1',rawToken:'bad',now:'2026-09-29T21:00:00Z',record:rec}).ok,false);
  assert.equal(c.verifyCaseAccessRecord({quoteCaseId:'qc1',rawToken:'qca_secret',now:'2026-10-01T00:00:00Z',record:rec}).code,'CASE_ACCESS_EXPIRED');
  assert.equal(c.verifyCaseAccessRecord({quoteCaseId:'qc1',rawToken:'qca_secret',now:'2026-09-29T21:00:00Z',record:{...rec,revokedAt:'2026-09-29T20:30:00Z'}}).code,'CASE_ACCESS_REVOKED');
});
