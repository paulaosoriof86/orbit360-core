#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TIMEOUT = path.join(ROOT, 'tools/orbit360-run-with-timeout-cross-platform-v20260806.mjs');
const RUNNER = path.join(ROOT, 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh');
const SIGNAL_TEST = path.join(ROOT, 'tools/orbit360-test-visual-matrix-timeout-signal-safe-portable-v20260806.mjs');
const OUT = process.env.ORBIT360_CROSS_RUNNER_EVIDENCE || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-cross-runner-source-test-sanitized-v20260806.json');
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail: String(detail).slice(0, 500) });
const text = file => fs.readFileSync(file, 'utf8');

for (const file of [TIMEOUT, RUNNER, SIGNAL_TEST]) add('exists-' + path.basename(file), fs.existsSync(file), file);
const timeoutSource = text(TIMEOUT);
const runnerSource = text(RUNNER);
for (const token of ['spawn(', "forwardSignal('SIGTERM')", "child.kill('SIGKILL')", '--timeout-ms', '--grace-ms', "process.on(signal"]) {
  add('timeout-token-' + token.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), timeoutSource.includes(token), token);
}
add('runner-no-gnu-timeout', !/(^|\s)timeout\s+--signal=/m.test(runnerSource));
add('runner-has-portable-timeout', runnerSource.includes('orbit360-run-with-timeout-cross-platform-v20260806.mjs'));
add('runner-macos-playwright-path', runnerSource.includes("RUNNER_OS:-") && runnerSource.includes('npx playwright install chromium'));
add('runner-linux-playwright-path', runnerSource.includes('npx playwright install --with-deps chromium'));
add('runner-blocked-without-authorization', runnerSource.includes('SOURCE_ONLY_NOT_AUTHORIZED_CROSS_RUNNER'));
add('runner-no-functions-deploy', !/firebase\s+deploy[^\n]*functions/i.test(runnerSource));
add('runner-no-rules-deploy', !/firebase\s+deploy[^\n]*rules/i.test(runnerSource));

const syntaxNode = spawnSync(process.execPath, ['--check', TIMEOUT], { encoding: 'utf8' });
add('timeout-node-syntax', syntaxNode.status === 0, syntaxNode.stderr);
const syntaxShell = spawnSync('bash', ['-n', RUNNER], { encoding: 'utf8' });
add('runner-bash-syntax', syntaxShell.status === 0, syntaxShell.stderr);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-cross-runner-portable-'));
const quick = spawnSync(process.execPath, [TIMEOUT, '--timeout-ms', '2000', '--grace-ms', '100', '--', process.execPath, '-e', 'process.exit(0)'], { encoding: 'utf8', timeout: 5000 });
add('portable-timeout-pass-through-zero', quick.status === 0, quick.status);
const slow = spawnSync(process.execPath, [TIMEOUT, '--timeout-ms', '150', '--grace-ms', '100', '--', process.execPath, '-e', 'setInterval(()=>{},1000)'], { encoding: 'utf8', timeout: 5000 });
add('portable-timeout-exit-124', slow.status === 124, slow.status);
const blocked = spawnSync('bash', [RUNNER], { cwd: ROOT, env: { ...process.env, ORBIT360_RUNTIME_EXECUTION_AUTHORIZED: 'false' }, encoding: 'utf8', timeout: 5000 });
add('runner-source-only-blocked-exit-64', blocked.status === 64, blocked.status);
add('runner-source-only-blocked-message', /SOURCE_ONLY_NOT_AUTHORIZED_CROSS_RUNNER/.test(blocked.stdout + blocked.stderr));

const prior = spawnSync(process.execPath, [SIGNAL_TEST], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env: { ...process.env, ORBIT360_SOURCE_TEST_EVIDENCE: path.join(temp, 'prior.json') } });
add('prior-signal-safe-suite-pass', prior.status === 0, prior.status);
let priorValue = {};
try { priorValue = JSON.parse(fs.readFileSync(path.join(temp, 'prior.json'), 'utf8')); } catch {}
add('prior-signal-safe-48-of-48', priorValue.total === 48 && priorValue.passed === 48 && priorValue.failed === 0 && priorValue.ok === true, JSON.stringify({ total: priorValue.total, passed: priorValue.passed, failed: priorValue.failed }));

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'orbit360-visual-matrix-cross-runner-source-test-portable-v1',
  status: failed.length ? 'FAIL_VISUAL_MATRIX_CROSS_RUNNER_SOURCE' : 'PASS_VISUAL_MATRIX_CROSS_RUNNER_SOURCE',
  classification: failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'SOURCE_FIX_VALIDATED_CROSS_RUNNER_PORTABLE',
  runnerOsObserved: process.env.RUNNER_OS || process.platform,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  priorSignalSafeChecks: Number(priorValue.total || 0),
  priorSignalSafePassed: Number(priorValue.passed || 0),
  priorSignalCompatibilityApplied: priorValue.compatibilityApplied === true,
  secretsRead: false,
  firebaseAccess: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  functionsDeploys: 0,
  rulesDeploys: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failed.length === 0
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 42);
