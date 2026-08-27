'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTO_READY,
  AUTO_POLICY,
  validateSubmitReadyIntake
} = require('./cotcomp-validator');

const contact = {
  'contact.name': 'Persona de prueba',
  'contact.whatsapp': '+50255550000',
  'contact.email': 'prueba@example.com',
  'consents.requestManagement': true
};

function validAuto(overrides = {}) {
  return {
    journeyId: 'GT_AUTO_MOTO_HYBRID',
    country: 'GT',
    idempotencyKey: 'idem-auto-1',
    data: {
      route: 'AUTO',
      protectionGoal: 'FULL',
      vehicleType: 'SUV',
      vehicleUse: 'PERSONAL',
      brand: 'Marca prueba',
      lineModel: 'Modelo prueba',
      modelYear: 2024,
      insuredValue: 150000,
      ...contact,
      ...(overrides.data || {})
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'data'))
  };
}

function validMedical(overrides = {}) {
  return {
    journeyId: 'GT_GASTOS_MEDICOS_HYBRID',
    country: 'GT',
    idempotencyKey: 'idem-med-1',
    data: {
      coverageGroup: 'INDIVIDUAL',
      titularDob: '1990-05-15',
      ...contact,
      ...(overrides.data || {})
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'data'))
  };
}

function validTransport(overrides = {}) {
  return {
    journeyId: 'CO_TRANSPORTE_CONSULTATIVE_HYBRID',
    country: 'CO',
    idempotencyKey: 'idem-trans-1',
    data: {
      operationRole: 'CARGO_GENERATOR',
      coverageModeNeed: 'SPECIFIC_SHIPMENT',
      cargoTypeGeneral: 'Mercancía general',
      transitScope: 'NATIONAL',
      transportModes: ['ROAD'],
      origin: 'Bogotá',
      destination: 'Medellín',
      valueToProtect: 100000000,
      ...contact,
      ...(overrides.data || {})
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'data'))
  };
}

function validRc(overrides = {}) {
  return {
    journeyId: 'CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID',
    country: 'CO',
    idempotencyKey: 'idem-rc-1',
    data: {
      needTrigger: 'PROFESSIONAL_ACTIVITY',
      applicantType: 'NATURAL_PERSON',
      professionalActivity: 'Consultoría',
      ...contact,
      ...(overrides.data || {})
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'data'))
  };
}

test('valid GT Auto/Moto submit-ready payload passes', () => {
  assert.equal(validateSubmitReadyIntake(validAuto()).ok, true);
});

test('GT Auto FULL requires insuredValue', () => {
  const payload = validAuto();
  delete payload.data.insuredValue;
  const result = validateSubmitReadyIntake(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'insuredValue' && error.code === 'REQUIRED'));
});

test('GT Auto protectionGoal is route-sensitive', () => {
  const result = validateSubmitReadyIntake(validAuto({ data: { route: 'AUTO', protectionGoal: 'THEFT_ONLY' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'protectionGoal' && error.code === 'INVALID_ENUM_FOR_DISCRIMINATOR'));
});

test('valid GT Gastos Médicos submit-ready payload passes', () => {
  assert.equal(validateSubmitReadyIntake(validMedical()).ok, true);
});

test('GT Gastos Médicos requires spouseDob when spouseIncluded is true', () => {
  const result = validateSubmitReadyIntake(validMedical({ data: { coverageGroup: 'FAMILY', spouseIncluded: true } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'spouseDob' && error.code === 'REQUIRED'));
});

test('GT Gastos Médicos dependentDobs length must equal childrenCount', () => {
  const result = validateSubmitReadyIntake(validMedical({ data: {
    coverageGroup: 'FAMILY',
    childrenCount: 2,
    dependentDobs: ['2015-01-01']
  } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'dependentDobs' && error.code === 'LENGTH_MISMATCH'));
});

test('valid CO Transporte specific-shipment payload passes', () => {
  assert.equal(validateSubmitReadyIntake(validTransport()).ok, true);
});

test('CO Transporte specific shipment requires origin, destination and valueToProtect', () => {
  const payload = validTransport();
  delete payload.data.origin;
  delete payload.data.destination;
  delete payload.data.valueToProtect;
  const result = validateSubmitReadyIntake(payload);
  assert.equal(result.ok, false);
  for (const fieldId of ['origin', 'destination', 'valueToProtect']) {
    assert.ok(result.errors.some(error => error.fieldId === fieldId && error.code === 'REQUIRED'));
  }
});

test('CO Transporte annual program requires annual fields', () => {
  const payload = validTransport({ data: { coverageModeNeed: 'ANNUAL_PROGRAM' } });
  delete payload.data.origin;
  delete payload.data.destination;
  delete payload.data.valueToProtect;
  const result = validateSubmitReadyIntake(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'maxValuePerShipment' && error.code === 'REQUIRED'));
  assert.ok(result.errors.some(error => error.fieldId === 'annualMovementBudget' && error.code === 'REQUIRED'));
});

test('valid CO RC Profesional submit-ready payload passes', () => {
  assert.equal(validateSubmitReadyIntake(validRc()).ok, true);
});

test('CO RC Profesional legal entity requires businessName', () => {
  const result = validateSubmitReadyIntake(validRc({ data: { applicantType: 'LEGAL_ENTITY' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'businessName' && error.code === 'REQUIRED'));
});

test('legacy consent.contact normalizes to canonical consent field', () => {
  const payload = validRc();
  delete payload.data['consents.requestManagement'];
  payload.data['consent.contact'] = true;
  const result = validateSubmitReadyIntake(payload);
  assert.equal(result.ok, true);
  assert.equal(result.normalized.data['consents.requestManagement'], true);
  assert.equal(Object.prototype.hasOwnProperty.call(result.normalized.data, 'consent.contact'), false);
});

test('conflicting consent alias and canonical field fails', () => {
  const payload = validRc();
  payload.data['consent.contact'] = false;
  const result = validateSubmitReadyIntake(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.code === 'ALIAS_CONFLICT'));
});

test('deferred or unknown field is rejected from public intake', () => {
  const result = validateSubmitReadyIntake(validMedical({ data: { medicalHistory: 'should not be public intake' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'medicalHistory' && error.code === 'FIELD_NOT_ALLOWED_IN_PUBLIC_INTAKE'));
});

test('country must match frozen journey', () => {
  const result = validateSubmitReadyIntake(validAuto({ country: 'CO' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'country' && error.code === 'COUNTRY_JOURNEY_MISMATCH'));
});

test('idempotency key is required for submit-ready validation', () => {
  const result = validateSubmitReadyIntake(validRc({ idempotencyKey: '' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'idempotencyKey' && error.code === 'REQUIRED'));
});

test('consent must be true before submit/handoff', () => {
  const result = validateSubmitReadyIntake(validAuto({ data: { 'consents.requestManagement': false } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'consents.requestManagement' && error.code === 'CONSENT_REQUIRED_FOR_SUBMIT'));
});

test('AUTO remains default-deny in S01', () => {
  assert.equal(AUTO_READY, false);
  assert.deepEqual(AUTO_POLICY, {
    autoReady: false,
    defaultDeny: true,
    providerAdaptersAllowed: false,
    runtimeSideEffectsAllowed: false
  });
});
