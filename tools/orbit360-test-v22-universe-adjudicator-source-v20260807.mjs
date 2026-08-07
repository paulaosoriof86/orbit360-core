#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { adjudicateRows, EXPECTED, SCHEMA } from './orbit360-adjudicate-block1-universe-readonly-v20260807.mjs';

const checks = {};
const make = (n, prefix, extra = () => ({})) => Array.from({ length: n }, (_, i) => ({ id: prefix + i, data: { pais: 'GT', moneda: 'GTQ', identificacion: prefix + '-ID-' + i, ...extra(i) } }));

const exactClients = adjudicateRows('clientes', make(EXPECTED.clientes, 'c'), EXPECTED.clientes);
checks.exactPass = exactClients.status === 'PASS_RECONCILED' && exactClients.effective === 414;

const dup = make(415, 'd');
dup[414].data.identificacion = dup[0].data.identificacion;
const dupResult = adjudicateRows('clientes', dup, EXPECTED.clientes);
checks.duplicateReconciles = dupResult.effective === 414 && dupResult.categories.duplicate === 1 && dupResult.status === 'PASS_RECONCILED';

const inactive = make(415, 'i');
inactive[414].data.active = false;
const inactiveResult = adjudicateRows('clientes', inactive, EXPECTED.clientes);
checks.inactiveReconciles = inactiveResult.effective === 414 && inactiveResult.categories.historicalInactive === 1;

const validation = make(415, 'v');
validation[414].data.requiereValidacion = true;
const validationResult = adjudicateRows('clientes', validation, EXPECTED.clientes);
checks.validationDoesNotDisappear = validationResult.effective === 415 && validationResult.categories.requiresValidation === 1 && validationResult.classification === 'VALIDATOR_STALE';

const mixed = make(416, 'm');
mixed[414].data.active = false;
mixed[415].data.requiereValidacion = true;
const mixedResult = adjudicateRows('clientes', mixed, EXPECTED.clientes);
checks.unreconciledMixedStopsData = mixedResult.effective === 415 && mixedResult.classification === 'DATA_CONTRACT_FAILURE';

const out = make(415, 'o');
out[414].data.pais = 'US';
const outResult = adjudicateRows('clientes', out, EXPECTED.clientes);
checks.outOfUniverseReconciles = outResult.effective === 414 && outResult.categories.outOfEffectiveUniverse === 1;

const src = fs.readFileSync(new URL('./orbit360-adjudicate-block1-universe-readonly-v20260807.mjs', import.meta.url), 'utf8');
checks.readOnlySource = !/(?:doc|ref|batch|transaction|firestore)\s*\.\s*(?:set|update|delete|add|create)\s*\(/i.test(src) && !/runTransaction|writeBatch|bulkWriter/i.test(src);
checks.noRawIdentityOutput = !src.includes('nombre: item') && !src.includes('email: item') && src.includes('fingerprint: fp(') && src.includes('containsPII: false');
checks.expectedExact = EXPECTED.clientes === 414 && EXPECTED.aseguradoras === 26 && EXPECTED.asesores === 7;
checks.schemaExact = SCHEMA === 'orbit360-block1-universe-adjudication-v22-readonly-v1';
checks.noHosting = !src.includes('firebase deploy') && !src.includes('hosting:clone');
checks.zeroWritesContract = src.includes('firestoreWrites: 0') && src.includes('authWrites: 0') && src.includes('operationalWrites: 0') && src.includes('reimport: false');

const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v22-universe-adjudicator-source-test-v1',
  status: failedCheckIds.length ? 'STOP_V22_UNIVERSE_ADJUDICATOR_SOURCE' : 'PASS_V22_UNIVERSE_ADJUDICATOR_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  writes: 0,
  containsPII: false,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
