#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SHIM = path.join(ROOT, 'tools/orbit360-jq-contract-shim-v20260806.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-jq-shim-'));
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail: String(detail).slice(0, 500) });
const run = (expression, value, extra = []) => {
  const file = path.join(temp, `fixture-${checks.length}.json`);
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  return spawnSync(process.execPath, [SHIM, '-e', ...extra, expression, file], { encoding: 'utf8', timeout: 5000 });
};

add('shim-exists', fs.existsSync(SHIM), SHIM);
const syntax = spawnSync(process.execPath, ['--check', SHIM], { encoding: 'utf8' });
add('shim-syntax', syntax.status === 0, syntax.stderr);

let result = run('.gateId==$gate and .status=="PASS_GATE_REGISTRATION"', {
  gateId: 'g', contractVersion: '1', status: 'PASS_GATE_REGISTRATION', failed: 0, ok: true,
  generatorRetired: true, secretsRead: false, browserExecuted: false, deployExecuted: false
}, ['--arg', 'gate', 'g', '--arg', 'contract', '1']);
add('registration-pass', result.status === 0, result.stderr);

result = run('.status=="GO_GATE_CONTRACT"', {
  status: 'GO_GATE_CONTRACT', contractVersion: '1', failed: 0, ok: true,
  executionAuthorized: true, secretAccessAuthorized: true, firestoreReadAuthorized: true,
  writeAuthorized: false, runtimeAuthorized: true, browserAuthorized: true,
  hostingDeployAuthorized: true, hostingDeploysMaximum: 1,
  hostingBackupCloneAuthorized: true, hostingRollbackCloneAuthorizedOnFailure: true,
  functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
  firestoreWritesAuthorized: 0, authWritesAuthorized: 0, operationalWritesAuthorized: 0,
  secretAccess: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false
}, ['--arg', 'contract', '1']);
add('preflight-pass', result.status === 0, result.stderr);

result = run('.stage=="PASS_VISUAL_BROWSER_PRECHECK"', {
  stage: 'PASS_VISUAL_BROWSER_PRECHECK', classification: 'GO_FULL_VISUAL_MATRIX', ok: true,
  checkpoint: 'INICIO_READY_PASS', firestoreWrites: 0, authWrites: 0, operationalWrites: 0,
  deployExecuted: false, productionTouched: false
});
add('browser-precheck-pass', result.status === 0, result.stderr);

result = run('.status=="PASS_MATRIX_SUPERVISED"', {
  status: 'PASS_MATRIX_SUPERVISED', classification: 'PASS_VISUAL_POST_AUTH', ok: true
});
add('supervisor-pass', result.status === 0, result.stderr);

result = run('.stage=="PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX" and (.roles|length)==3', {
  stage: 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX', classification: 'PASS_VISUAL_POST_AUTH', ok: true,
  totalRoleFailures: 0, snapshotIntegrity: 'VERIFIED_UNCHANGED', roles: [{}, {}, {}],
  firestoreWrites: 0, authWrites: 0, operationalWrites: 0, functionsDeploys: 0, rulesDeploys: 0,
  productionTouched: false
});
add('matrix-pass', result.status === 0, result.stderr);

result = run('.stage=="PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE"', {
  ok: true, stage: 'PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE', decision: 'PASS_VISUAL_POST_AUTH',
  checkpoint: 'MATRIX_COMPLETE', preflightStatus: 'GO_GATE_CONTRACT', hostingDeployAttempted: true,
  hostingDeploys: 1, hostingRollbackRequired: false, snapshotIntegrity: 'VERIFIED_UNCHANGED',
  totalRoleFailures: 0, firestoreWrites: 0, authWrites: 0, operationalWrites: 0,
  functionsDeploys: 0, rulesDeploys: 0, productionTouched: false, mainTouched: false, mergeExecuted: false
});
add('final-pass', result.status === 0, result.stderr);

const projectFile = path.join(temp, 'project.json');
fs.writeFileSync(projectFile, JSON.stringify({ project_id: 'ays-orbit-360-lab' }), 'utf8');
result = spawnSync(process.execPath, [SHIM, '-r', '.project_id // empty', projectFile], { encoding: 'utf8' });
add('project-id-raw-pass', result.status === 0 && result.stdout === 'ays-orbit-360-lab', result.stdout + result.stderr);

result = run('.stage=="PASS_VISUAL_BROWSER_PRECHECK"', { stage: 'FAIL', ok: false });
add('negative-exit-one', result.status === 1, result.status);

const failed = checks.filter(check => !check.ok);
const output = {
  schemaVersion: 'orbit360-jq-contract-shim-source-test-v1',
  status: failed.length ? 'FAIL_JQ_CONTRACT_SHIM_SOURCE' : 'PASS_JQ_CONTRACT_SHIM_SOURCE',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(check => check.id),
  checks,
  secretsRead: false,
  firebaseAccess: false,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  ok: failed.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 42);
