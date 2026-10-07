'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('./cotcomp-real-customer-pilot-s507-contract');

function validIntake(overrides = {}) {
  return Object.assign({
    country: 'GT',
    needFamily: 'vehicle',
    mode: 'hybrid',
    summary: 'Quiero orientación para proteger mi vehículo.',
    contactName: 'Persona piloto',
    whatsapp: '+502 5555 0000',
    email: '',
    requestManagementConsent: true,
    consentVersion: 'pilot-draft-v1',
    marketingConsent: false,
    correlationId: 'corr-synthetic',
    journeyId: 'GT_AUTO_MOTO_HYBRID'
  }, overrides);
}

test('S5.07 remains source-only and blocks production/provider/issuance/payment', () => {
  assert.equal(s.POLICY.sourceOnly, true);
  assert.equal(s.POLICY.runtimeRealDataEnabled, false);
  assert.equal(s.POLICY.production, false);
  assert.equal(s.POLICY.providerRater, false);
  assert.equal(s.POLICY.issuance, false);
  assert.equal(s.POLICY.binding, false);
  assert.equal(s.POLICY.payment, false);
});

test('intake accepts only minimized GT vehicle handoff data', () => {
  const r = s.validateIntake(validIntake());
  assert.equal(r.ok, true);
  assert.equal(r.sanitized.country, 'GT');
  assert.equal(r.sanitized.needFamily, 'vehicle');
  assert.equal(r.sanitized.marketingConsent, false);
});

test('browser-supplied advisor/admin/sensitive fields are denied', () => {
  for (const extra of [
    { advisorId: 'adv1' }, { tenantId: 'other' }, { dpi: '123' }, { healthData: 'x' }, { paymentData: 'x' }, { rawToken: 'secret' }
  ]) {
    const r = s.validateIntake(Object.assign(validIntake(), extra));
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes('BROWSER_ROUTING_OR_SENSITIVE_FIELD_DENIED'));
  }
});

test('request-management consent is mandatory and marketing cannot be bundled', () => {
  assert.equal(s.validateIntake(validIntake({ requestManagementConsent: false })).ok, false);
  const marketing = s.validateIntake(validIntake({ marketingConsent: true }));
  assert.equal(marketing.ok, false);
  assert.ok(marketing.errors.includes('MARKETING_MUST_REMAIN_SEPARATE'));
});

test('country, family and journey are fail-closed to proposed pilot scope', () => {
  assert.ok(s.validateIntake(validIntake({ country: 'CO' })).errors.includes('COUNTRY_OUT_OF_SCOPE'));
  assert.ok(s.validateIntake(validIntake({ needFamily: 'health' })).errors.includes('FAMILY_OUT_OF_SCOPE'));
  assert.ok(s.validateIntake(validIntake({ journeyId: 'CO_TRANSPORTE_CONSULTATIVE_HYBRID' })).errors.includes('JOURNEY_OUT_OF_SCOPE'));
});

test('capability requires digest match, expiry, unused state and attempt budget', () => {
  const token = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const base = { token, tokenDigest: s.sha256(token), expiresAtEpochMs: 2000, used: false, attempts: 0, acceptedCount: 0 };
  assert.equal(s.validateCapability(base, 1000).ok, true);
  assert.equal(s.validateCapability(Object.assign({}, base, { used: true }), 1000).code, 'CAPABILITY_USED');
  assert.equal(s.validateCapability(Object.assign({}, base, { attempts: 5 }), 1000).code, 'RATE_LIMITED');
  assert.equal(s.validateCapability(Object.assign({}, base, { expiresAtEpochMs: 999 }), 1000).code, 'CAPABILITY_EXPIRED');
  assert.equal(s.validateCapability(Object.assign({}, base, { token: token + 'x' }), 1000).code, 'CAPABILITY_MISMATCH');
});

test('advisor routing is server-owned and rejects ambiguous eligible roster', () => {
  const one = s.resolveAdvisor([{ id: 'adv-1', activo: true, roles: ['Asesor'], paises: ['GT'] }]);
  assert.deepEqual(one, { ok: true, advisorId: 'adv-1', rule: 'SOLE_ELIGIBLE' });
  const ambiguous = s.resolveAdvisor([
    { id: 'adv-1', activo: true, roles: ['Asesor'], paises: ['GT'] },
    { id: 'adv-2', activo: true, roles: ['Asesor'], paises: ['GT'] }
  ]);
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.code, 'ADVISOR_ROUTING_AMBIGUOUS');
});

test('explicit triage marker resolves multiple eligible advisors deterministically', () => {
  const r = s.resolveAdvisor([
    { id: 'adv-1', activo: true, roles: ['Asesor'], paises: ['GT'] },
    { id: 'adv-2', activo: true, roles: ['Asesor'], paises: ['GT'], pilotTriage: true }
  ]);
  assert.deepEqual(r, { ok: true, advisorId: 'adv-2', rule: 'EXPLICIT_TRIAGE' });
});

test('inactive, wrong-country or non-advisor rows do not route', () => {
  const r = s.resolveAdvisor([
    { id: 'a', activo: false, roles: ['Asesor'], paises: ['GT'] },
    { id: 'b', activo: true, roles: ['Asesor'], paises: ['CO'] },
    { id: 'c', activo: true, roles: ['Operativo'], paises: ['GT'] }
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'ADVISOR_ROUTING_REQUIRED');
});

test('idempotency reuses exact payload and denies changed payload', () => {
  const p = validIntake();
  const d = s.digestPayload(p);
  assert.equal(s.idempotencyDecision(d, p).decision, 'REUSE');
  assert.equal(s.idempotencyDecision(d, Object.assign({}, p, { summary: 'changed' })).decision, 'DENY_CONFLICT');
  assert.equal(s.idempotencyDecision('', p).decision, 'CREATE_PROPOSED');
});

test('readiness remains non-executable even when decision inputs are hypothetically complete', () => {
  const r = s.readiness({
    privacyNoticeVersion: 'pilot-v1',
    retentionDisposition: 'ROLLBACK_TO_BEFORE_STATE',
    advisorRosterReadback: true,
    routingContractPass: true,
    antiAbuseContractPass: true,
    rateLimitContractPass: true,
    syntheticRehearsalPass: true,
    ownerRealDataAuthorization: true
  });
  assert.equal(r.ready, false);
  assert.equal(r.sourceOnly, true);
  assert.equal(r.runtimeRealDataEnabled, false);
});

test('proposed business command is non-executable and preserves truth distinctions', () => {
  const intake = s.validateIntake(validIntake());
  const cmd = s.proposedBusinessCommand(intake.sanitized, 'adv-1', 'req-1');
  assert.equal(cmd.executionAllowed, false);
  assert.equal(cmd.operation, 'create_business');
  assert.equal(cmd.payload.stage, 'nuevo');
  assert.equal(cmd.payload.origen, 'Web CotComp');
  assert.equal(cmd.truth.providerDelivered, false);
  assert.equal(cmd.truth.coverageConfirmed, false);
  assert.equal(cmd.truth.issued, false);
  assert.equal(cmd.truth.bound, false);
  assert.equal(cmd.truth.paid, false);
});
