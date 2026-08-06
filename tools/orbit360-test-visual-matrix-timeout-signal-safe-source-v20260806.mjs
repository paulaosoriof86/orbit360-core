#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SUPERVISOR = path.join(ROOT, 'tools/orbit360-supervise-visual-matrix-signal-safe-v20260806.mjs');
const SIGNAL_LIB = path.join(ROOT, 'tools/orbit360-runtime-signal-safe-lib-v20260806.sh');
const RUNNER = path.join(ROOT, 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v2-v20260806.sh');
const OUT = process.env.ORBIT360_SOURCE_TEST_EVIDENCE || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-timeout-signal-safe-source-test-sanitized-v20260806.json');

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail: String(detail).slice(0, 500) });
const text = file => fs.readFileSync(file, 'utf8');

for (const file of [SUPERVISOR, SIGNAL_LIB, RUNNER]) add('exists-' + path.basename(file), fs.existsSync(file), file);
const supervisorSource = text(SUPERVISOR);
const signalSource = text(SIGNAL_LIB);
const runnerSource = text(RUNNER);

for (const token of [
  'ORBIT360_MATRIX_IDLE_TIMEOUT_MS', 'ORBIT360_MATRIX_ROLE_TIMEOUT_MS', 'ORBIT360_MATRIX_GLOBAL_TIMEOUT_MS',
  'ORBIT360_MATRIX_TERMINATE_GRACE_MS', 'durableWrite', 'MATRIX_CHECKPOINT_', 'ROLE_TIMEOUT_',
  'CHECKPOINT_IDLE_TIMEOUT', 'GLOBAL_TIMEOUT', "child.kill('SIGTERM')", "child.kill('SIGKILL')",
  "process.on(signal", 'FAIL_MATRIX_WATCHDOG'
]) add('supervisor-token-' + token.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), supervisorSource.includes(token), token);

for (const token of [
  'orbit360_install_signal_traps', "trap 'orbit360_handle_signal TERM' TERM", "trap 'orbit360_handle_signal INT' INT",
  "trap 'orbit360_handle_signal HUP' HUP", "trap 'orbit360_handle_exit' EXIT", 'orbit360_finalize_failure_once',
  'rollback_if_needed', 'persist'
]) add('signal-lib-token-' + token.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), signalSource.includes(token), token);

for (const token of [
  'SOURCE_ONLY_NOT_AUTHORIZED', 'source "$SIGNAL_LIB"', 'orbit360_install_signal_traps', 'write_runtime_state',
  'timeout --signal=TERM --kill-after=20s 480s npx firebase hosting:clone', 'DEPLOY_ATTEMPTED=1',
  'ORBIT360_MATRIX_SUPERVISOR_EVIDENCE', 'ORBIT360_MATRIX_ROLE_TIMEOUT_MS', 'ORBIT360_MATRIX_GLOBAL_TIMEOUT_MS',
  'timeout --signal=TERM --kill-after=20s 1320s node "$SUPERVISOR_RUNNER"', 'PASS_MATRIX_SUPERVISED'
]) add('runner-token-' + token.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), runnerSource.includes(token), token);
add('runner-traps-before-service-account', runnerSource.indexOf('orbit360_install_signal_traps') < runnerSource.indexOf('SERVICE_ACCOUNT='));
add('runner-state-before-deploy', runnerSource.indexOf('write_runtime_state\nif timeout --signal=TERM --kill-after=20s 480s npx firebase deploy') > runnerSource.indexOf('DEPLOY_ATTEMPTED=1'));
add('runner-no-functions-deploy', !/firebase\s+deploy[^\n]*functions/i.test(runnerSource));
add('runner-no-rules-deploy', !/firebase\s+deploy[^\n]*rules/i.test(runnerSource));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-signal-safe-'));
const matrixEvidence = path.join(temp, 'matrix.json');
const supervisorEvidence = path.join(temp, 'supervisor.json');
const fakeChild = path.join(temp, 'fake-matrix.mjs');
fs.writeFileSync(fakeChild, `
import fs from 'node:fs';
const file = process.env.ORBIT360_MATRIX_EVIDENCE;
fs.writeFileSync(file, JSON.stringify({stage:'STARTED',currentCheckpoint:'DIRECCION_CONTEXT_CREATE',checkpoints:[{checkpoint:'DIRECCION_CONTEXT_CREATE'}],firestoreWrites:0,authWrites:0,operationalWrites:0,productionTouched:false,ok:false}, null, 2));
setInterval(() => {}, 1000);
`, 'utf8');
const supervised = spawnSync(process.execPath, [SUPERVISOR], {
  cwd: ROOT,
  env: {
    ...process.env,
    ORBIT360_MATRIX_EVIDENCE: matrixEvidence,
    ORBIT360_MATRIX_SUPERVISOR_EVIDENCE: supervisorEvidence,
    ORBIT360_MATRIX_COMMAND_JSON: JSON.stringify([process.execPath, fakeChild]),
    ORBIT360_MATRIX_POLL_MS: '25',
    ORBIT360_MATRIX_IDLE_TIMEOUT_MS: '2000',
    ORBIT360_MATRIX_ROLE_TIMEOUT_MS: '250',
    ORBIT360_MATRIX_GLOBAL_TIMEOUT_MS: '4000',
    ORBIT360_MATRIX_TERMINATE_GRACE_MS: '100'
  },
  encoding: 'utf8',
  timeout: 10000
});
add('synthetic-supervisor-nonzero', supervised.status !== 0, String(supervised.status));
add('synthetic-supervisor-evidence-exists', fs.existsSync(supervisorEvidence));
let supervisorValue = {};
try { supervisorValue = JSON.parse(fs.readFileSync(supervisorEvidence, 'utf8')); } catch {}
add('synthetic-supervisor-watchdog-status', supervisorValue.status === 'FAIL_MATRIX_WATCHDOG', supervisorValue.status);
add('synthetic-supervisor-role-timeout', supervisorValue.terminationReason === 'ROLE_TIMEOUT_DIRECCION', supervisorValue.terminationReason);
add('synthetic-supervisor-checkpoint-observed', Array.isArray(supervisorValue.observedCheckpoints) && supervisorValue.observedCheckpoints.some(item => /DIRECCION_CONTEXT_CREATE/.test(item.matrixCheckpoint || item.checkpoint || '')));
add('synthetic-supervisor-no-writes', Number(supervisorValue.firestoreWrites || 0) === 0 && Number(supervisorValue.authWrites || 0) === 0 && Number(supervisorValue.operationalWrites || 0) === 0);

const rollbackFile = path.join(temp, 'rollback.txt');
const persistFile = path.join(temp, 'persist.txt');
const signalFixture = path.join(temp, 'signal-fixture.sh');
fs.writeFileSync(signalFixture, `#!/usr/bin/env bash
set -uo pipefail
source "${SIGNAL_LIB}"
rollback_if_needed(){ echo rollback >> "${rollbackFile}"; }
persist(){ echo persist >> "${persistFile}"; }
orbit360_install_signal_traps
kill -TERM $$
sleep 2
`, 'utf8');
fs.chmodSync(signalFixture, 0o755);
const signaled = spawnSync('bash', [signalFixture], { encoding: 'utf8', timeout: 10000 });
add('synthetic-signal-exit-143', signaled.status === 143, String(signaled.status));
const rollbackLines = fs.existsSync(rollbackFile) ? fs.readFileSync(rollbackFile, 'utf8').trim().split(/\n+/).filter(Boolean) : [];
const persistLines = fs.existsSync(persistFile) ? fs.readFileSync(persistFile, 'utf8').trim().split(/\n+/).filter(Boolean) : [];
add('synthetic-signal-rollback-once', rollbackLines.length === 1, rollbackLines.length);
add('synthetic-signal-persist-once', persistLines.length === 1, persistLines.length);

const failed = checks.filter(check => !check.ok);
const result = {
  schemaVersion: 'orbit360-visual-matrix-timeout-signal-safe-source-test-v1',
  status: failed.length ? 'FAIL_VISUAL_MATRIX_TIMEOUT_SIGNAL_SAFE_SOURCE' : 'PASS_VISUAL_MATRIX_TIMEOUT_SIGNAL_SAFE_SOURCE',
  classification: failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'SOURCE_FIX_VALIDATED',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(check => check.id),
  checks,
  synthetic: {
    supervisorStatus: supervisorValue.status || '',
    supervisorTerminationReason: supervisorValue.terminationReason || '',
    signalExitCode: signaled.status,
    rollbackCalls: rollbackLines.length,
    persistCalls: persistLines.length
  },
  secretsRead: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
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
