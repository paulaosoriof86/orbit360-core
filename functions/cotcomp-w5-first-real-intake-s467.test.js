'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Timestamp } = require('firebase-admin/firestore');
const mod = require('./cotcomp-w5-first-real-intake-s467');

function sample(overrides = {}) {
  return {
    brand: 'Toyota',
    lineModel: 'RAV4',
    contactName: 'Persona Real',
    contactWhatsapp: '+502 5555 5555',
    contactEmail: 'persona@example.com',
    requestManagementConsent: true,
    marketingConsent: false,
    ...overrides
  };
}

test('S4.67 validates only the approved intake fields', () => {
  const value = mod.validateInput(sample());
  assert.equal(value.brand, 'Toyota');
  assert.equal(value.lineModel, 'RAV4');
  assert.equal(value.requestManagementConsent, true);
  assert.equal(value.marketingConsent, false);
  assert.throws(
    () => mod.validateInput(sample({ extraField: 'not-allowed' })),
    /INTAKE_FIELDS_NOT_ALLOWED/
  );
});

test('S4.67 requires request-management consent and keeps marketing separate/default false', () => {
  assert.throws(
    () => mod.validateInput(sample({ requestManagementConsent: false })),
    /REQUEST_MANAGEMENT_CONSENT_REQUIRED/
  );
  const noMarketing = mod.validateInput({ ...sample(), marketingConsent: undefined });
  assert.equal(noMarketing.marketingConsent, false);
  const marketing = mod.validateInput(sample({ marketingConsent: true }));
  assert.equal(marketing.marketingConsent, true);
});

test('S4.67 rejects malformed contact data without broadening scope', () => {
  assert.throws(() => mod.validateInput(sample({ contactEmail: 'bad-email' })), /EMAIL_INVALID/);
  assert.throws(() => mod.validateInput(sample({ contactWhatsapp: '123' })), /WHATSAPP_INVALID/);
  assert.throws(() => mod.validateInput(sample({ brand: '' })), /BRAND_REQUIRED/);
  assert.throws(() => mod.validateInput(sample({ lineModel: '' })), /LINE_MODEL_REQUIRED/);
});

test('S4.67 builds exactly one GT AUTO public-web QuoteCase contract', () => {
  const validated = mod.validateInput(sample());
  const now = Timestamp.fromDate(new Date('2026-10-01T22:30:00.000Z'));
  const built = mod.buildRealQuoteCase(validated, now);
  assert.match(built.ids.caseId, /^qcase_[a-f0-9]{24}$/);
  assert.match(built.path, /^tenants\/alianzas-soluciones\/cotcomp\/quoteCases\/items\/qcase_/);
  assert.equal(built.value.country, 'GT');
  assert.equal(built.value.journeyId, 'GT_AUTO_MOTO_HYBRID');
  assert.equal(built.value.source, 'PUBLIC_WEB');
  assert.equal(built.value.intent, 'COTIZAR');
  assert.equal(built.value.riskOrProductCandidate, 'AUTO');
  assert.equal(built.value.status, 'SUBMITTED');
  assert.equal(built.value.capturedFields.brand, 'Toyota');
  assert.equal(built.value.capturedFields.lineModel, 'RAV4');
  assert.equal(built.value.consents.requestManagement, true);
  assert.equal(built.value.consents.requestManagementText, mod.CONSENT_TEXT);
  assert.equal(built.value.consents.marketing, false);
  assert.equal(built.value.intakeSingleUse, true);
  assert.equal(built.value.analyticsAllowed, false);
  assert.equal(built.value.rawCaseAccessTokenStored, false);
});

test('S4.67 one-shot identity is deterministic and carries no raw access token', () => {
  const validated = mod.validateInput(sample());
  const a = mod.buildRealQuoteCase(validated, Timestamp.now());
  const b = mod.buildRealQuoteCase(validated, Timestamp.now());
  assert.equal(a.ids.caseId, b.ids.caseId);
  assert.equal(a.path, b.path);
  assert.equal(Object.prototype.hasOwnProperty.call(a.value, 'caseAccessToken'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(a.value, 'rawToken'), false);
});
