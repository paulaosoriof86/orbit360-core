#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ACCESS_REL = 'orbit360-platform/core/access-scope.js';
const REGRESSION_REL = 'tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs';
const ACCESS_PATH = path.join(ROOT, ACCESS_REL);
const REGRESSION_PATH = path.join(ROOT, REGRESSION_REL);
const OUT = process.env.ORBIT360_R4S3_APPLY_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4s3-access-scope-rootfix-apply-v20260816.json');
const EXPECTED_R4S2_SHA256 = '8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f';
const APPLY = process.env.ORBIT360_R4S3_APPLY_AUTHORIZED === '1';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function fail(code, detail) {
  const evidence = {
    schemaVersion: 'orbit360-r4s3-access-scope-rootfix-apply-v1',
    ok: false,
    status: code,
    classification: code.startsWith('SOURCE_') ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE',
    detail,
    productPath: ACCESS_REL,
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(42);
}

if (!fs.existsSync(ACCESS_PATH)) fail('SOURCE_ACCESS_SCOPE_MISSING', ACCESS_REL);
if (!fs.existsSync(REGRESSION_PATH)) fail('SOURCE_REGRESSION_MISSING', REGRESSION_REL);

const source = fs.readFileSync(ACCESS_PATH, 'utf8');
const sourceHash = sha256(source);
if (sourceHash !== EXPECTED_R4S2_SHA256) {
  fail('SOURCE_R4S2_SHA_MISMATCH', `expected=${EXPECTED_R4S2_SHA256};observed=${sourceHash}`);
}

const regressionSource = fs.readFileSync(REGRESSION_PATH, 'utf8');
const fnStart = regressionSource.indexOf('function patchSource(source) {');
const fnEnd = regressionSource.indexOf('\n\nfunction makeContext', fnStart);
if (fnStart < 0 || fnEnd < 0) fail('PIPELINE_PATCHSOURCE_ANCHOR_MISSING', REGRESSION_REL);
const fnSource = regressionSource.slice(fnStart, fnEnd);
const sandbox = {};
vm.createContext(sandbox);
try {
  vm.runInContext(`${fnSource}\nthis.__orbitPatchSource = patchSource;`, sandbox, { filename: REGRESSION_REL });
} catch (err) {
  fail('PIPELINE_PATCHSOURCE_EVAL_FAILURE', String(err && err.message || err));
}
if (typeof sandbox.__orbitPatchSource !== 'function') fail('PIPELINE_PATCHSOURCE_NOT_CALLABLE', REGRESSION_REL);

let patched;
try {
  patched = sandbox.__orbitPatchSource(source);
} catch (err) {
  fail('PIPELINE_PATCHSOURCE_EXEC_FAILURE', String(err && err.message || err));
}
const patchedHash = sha256(patched);
const markerCount = (patched.match(/v20260816 candidate: resolve invariant role\/scope plus relational advisor indexes once per filter call\./g) || []).length;
const oldMarkerCount = (patched.match(/v20260815: resolve invariant access context once per filter call\./g) || []).length;
if (markerCount !== 1 || oldMarkerCount !== 0) {
  fail('PIPELINE_PATCH_MARKER_CONTRACT_FAILURE', `candidateMarker=${markerCount};oldMarker=${oldMarkerCount}`);
}

const oldFilterStart = source.indexOf('  function filter(collection, rows, moduleKey) {');
const oldFilterEnd = source.indexOf('  function filtrarPorAsesor(', oldFilterStart);
const newFilterStart = patched.indexOf('  function filter(collection, rows, moduleKey) {');
const newFilterEnd = patched.indexOf('  function filtrarPorAsesor(', newFilterStart);
if (oldFilterStart < 0 || oldFilterEnd < 0 || newFilterStart < 0 || newFilterEnd < 0) {
  fail('PIPELINE_FILTER_BOUNDARY_FAILURE', ACCESS_REL);
}
if (source.slice(0, oldFilterStart) !== patched.slice(0, newFilterStart) || source.slice(oldFilterEnd) !== patched.slice(newFilterEnd)) {
  fail('PIPELINE_NON_FILTER_MUTATION_DETECTED', ACCESS_REL);
}

if (APPLY) fs.writeFileSync(ACCESS_PATH, patched, 'utf8');

const evidence = {
  schemaVersion: 'orbit360-r4s3-access-scope-rootfix-apply-v1',
  ok: true,
  status: APPLY ? 'R4S3_ACCESS_SCOPE_ROOTFIX_APPLIED_EXACT' : 'R4S3_ACCESS_SCOPE_ROOTFIX_PREVIEW_PASS',
  classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_EXACT',
  productPath: ACCESS_REL,
  regressionSource: REGRESSION_REL,
  sourceR4S2Sha256: sourceHash,
  candidateSha256: patchedHash,
  candidateMarkerCount: markerCount,
  oldMarkerCount,
  mutationBoundary: 'filter-only',
  applied: APPLY,
  browserExecuted: false,
  secretAccess: false,
  dataAccess: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(evidence, null, 2));
