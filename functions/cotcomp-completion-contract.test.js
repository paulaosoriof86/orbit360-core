'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./cotcomp-completion-contract');

test('GT auto journey completion contains brand and model only before handoff', () => {
  const journey = c.fieldsFor('GT_AUTO_MOTO_HYBRID',{},c.PHASES.JOURNEY).map(x=>x.id);
  const handoff = c.fieldsFor('GT_AUTO_MOTO_HYBRID',{},c.PHASES.HANDOFF).map(x=>x.id);
  assert.deepEqual(journey,['brand','lineModel']);
  assert.deepEqual(handoff,['contact.name','contact.whatsapp','contact.email','consents.requestManagement']);
});

test('GT health spouse and dependent DOBs are conditional', () => {
  const base = c.fieldsFor('GT_GASTOS_MEDICOS_HYBRID',{spouseIncluded:false,childrenCount:0},c.PHASES.JOURNEY).map(x=>x.id);
  assert.deepEqual(base,['titularDob']);
  const family = c.fieldsFor('GT_GASTOS_MEDICOS_HYBRID',{spouseIncluded:true,childrenCount:2},c.PHASES.JOURNEY).map(x=>x.id);
  assert.deepEqual(family,['titularDob','spouseDob','dependentDobs']);
});

test('GT health geography preference is not forced by completion contract', () => {
  const all = c.fieldsFor('GT_GASTOS_MEDICOS_HYBRID',{spouseIncluded:false,childrenCount:0}).map(x=>x.id);
  assert.equal(all.includes('geographyPreference'),false);
});

test('CO transport specific shipment gets origin destination and value', () => {
  const ids = c.fieldsFor('CO_TRANSPORTE_CONSULTATIVE_HYBRID',{coverageModeNeed:'SPECIFIC_SHIPMENT'},c.PHASES.JOURNEY).map(x=>x.id);
  assert.deepEqual(ids,['coverageModeNeed','transportModes','origin','destination','valueToProtect']);
});

test('CO transport annual program gets max and annual values', () => {
  const ids = c.fieldsFor('CO_TRANSPORTE_CONSULTATIVE_HYBRID',{coverageModeNeed:'ANNUAL_PROGRAM'},c.PHASES.JOURNEY).map(x=>x.id);
  assert.deepEqual(ids,['coverageModeNeed','transportModes','maxValuePerShipment','annualMovementBudget']);
});

test('CO RC professional business name is conditional', () => {
  const natural = c.fieldsFor('CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID',{applicantType:'NATURAL_PERSON'},c.PHASES.JOURNEY).map(x=>x.id);
  assert.equal(natural.includes('businessName'),false);
  const legal = c.fieldsFor('CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID',{applicantType:'LEGAL_ENTITY'},c.PHASES.JOURNEY).map(x=>x.id);
  assert.equal(legal.includes('businessName'),true);
});
