#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FUNCTION = path.join(ROOT, 'functions/recurring-insurance-import.js');
const ENGINE = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs');
const EVIDENCE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-imp001-idempotency-rootfix-source.json');
const wrong = "Object.assign({ reused: true }, priorReq.data().result || {})";
const correct = "Object.assign({}, priorReq.data().result || {}, { reused: true })";

let functionSource = fs.readFileSync(FUNCTION, 'utf8');
const wrongCountBefore = functionSource.split(wrong).length - 1;
if (wrongCountBefore > 0) functionSource = functionSource.split(wrong).join(correct);
const wrongCountAfter = functionSource.split(wrong).length - 1;
const correctCount = functionSource.split(correct).length - 1;
if (wrongCountAfter !== 0 || correctCount < 1) {
  throw new Error(`FUNCTIONAL_DEFECT:IMP001_IDEMPOTENCY_RESPONSE_NOT_FIXED:${wrongCountAfter}:${correctCount}`);
}
fs.writeFileSync(FUNCTION, functionSource, 'utf8');

let engine = fs.readFileSync(ENGINE, 'utf8');
const anchor = "  add('FUNCTION_EXPORTS_PRESENT', EXPECTED_FUNCTIONS.every(name => functionSources.includes(`exports.${name}`)));";
const check = anchor + "\n  const recurringSource = readText('functions/recurring-insurance-import.js');\n  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));";
if (!engine.includes("add('IMPORT_IDEMPOTENCY_RESPONSE'")) {
  if (!engine.includes(anchor)) throw new Error('VALIDATOR_STALE:FUNCTION_EXPORTS_ANCHOR_NOT_FOUND');
  engine = engine.replace(anchor, () => check);
  fs.writeFileSync(ENGINE, engine, 'utf8');
}
if (!engine.includes("add('IMPORT_IDEMPOTENCY_RESPONSE'")) throw new Error('VALIDATOR_STALE:IMPORT_IDEMPOTENCY_CHECK_MISSING');

fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, JSON.stringify({
  schemaVersion: 'orbit360-block12-imp001-idempotency-rootfix-source-v1',
  status: 'IMP001_IDEMPOTENCY_RESPONSE_SOURCE_PASS',
  classification: 'FUNCTIONAL_DEFECT_CORRECTED',
  previousRuntimeRunId: 30961956480,
  previousFailureCode: 'IMP-001',
  previousPassed: 10,
  previousFailed: 1,
  rootCause: 'prior committed result reused=false overwrote the reused=true response marker',
  owner: 'functions/recurring-insurance-import.js:create_batch request reuse response',
  wrongPatternCountBefore: wrongCountBefore,
  wrongPatternCountAfter: wrongCountAfter,
  correctedPatternCount: correctCount,
  gateCheckInstalled: true,
  secretsRead: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  ok: true
}, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  status: 'IMP001_IDEMPOTENCY_RESPONSE_SOURCE_PASS',
  wrongPatternCountBefore: wrongCountBefore,
  wrongPatternCountAfter,
  correctedPatternCount: correctCount,
  gateCheckInstalled: true,
  secretAccess: false,
  firestoreRead: false,
  deployExecuted: false,
  ok: true
}, null, 2));
