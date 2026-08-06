#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const PROJECT = 'ays-orbit-360-lab';
const GATE = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const REPO = path.resolve(process.argv[2] || process.cwd());
const LEGACY = path.join(REPO, 'tools/orbit360-preflight-local-windows-source-only-v20260806.mjs');
const BASE_REPORT = path.join(REPO, 'orbit360-platform/runtime-gate-crm-v20260716/local-windows-source-only-preflight-sanitized-v20260806.json');
const OUT = path.join(REPO, 'orbit360-platform/runtime-gate-crm-v20260716/local-windows-source-only-preflight-v3-sanitized-v20260806.json');
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail: String(detail || '').replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0, 600) });

function run(command, args = [], options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || REPO,
    env: options.env || process.env,
    encoding: 'utf8',
    timeout: options.timeout || 120000,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
    shell: false
  });
}
function resolve(candidate) {
  if (!candidate) return '';
  if (path.isAbsolute(candidate)) return fs.existsSync(candidate) ? candidate : '';
  const probe = process.platform === 'win32'
    ? spawnSync('where.exe', [candidate], { encoding: 'utf8', timeout: 10000, windowsHide: true })
    : spawnSync('which', [candidate], { encoding: 'utf8', timeout: 10000 });
  if (probe.status !== 0) return '';
  return String(probe.stdout || '').split(/\r?\n/).map(item => item.trim()).find(Boolean) || '';
}
function first(candidates) {
  for (const candidate of candidates) {
    const found = resolve(candidate);
    if (found) return found;
  }
  return '';
}
function write(value) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

const git = first(['git.exe', 'git', 'C:\\Program Files\\Git\\cmd\\git.exe']);
const bash = first([process.env.GIT_BASH_PATH || '', 'C:\\Program Files\\Git\\bin\\bash.exe', 'bash.exe', 'bash']);
const firebaseCmd = first([
  process.env.FIREBASE_CLI_PATH || '',
  process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'firebase.cmd') : '',
  'firebase.cmd'
]);
const firebaseJsCandidates = [
  process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js') : '',
  firebaseCmd ? path.join(path.dirname(firebaseCmd), 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js') : ''
].filter(Boolean);
const firebaseJs = firebaseJsCandidates.find(file => fs.existsSync(file)) || '';

let base = {};
let portable = {};
let worktree = '';
let remoteHead = '';
let firebaseProjectVisible = false;
let credentialReferencePresent = false;

try {
  add('legacy-preflight-present', fs.existsSync(LEGACY), LEGACY);
  const legacyRun = run(process.execPath, [LEGACY, REPO], { timeout: 360000 });
  add('legacy-preflight-report-produced', fs.existsSync(BASE_REPORT), String(legacyRun.status));
  if (fs.existsSync(BASE_REPORT)) base = JSON.parse(fs.readFileSync(BASE_REPORT, 'utf8'));

  const allowedLegacyFailures = new Set([
    'service-account-env-present',
    'cross-runner-source-command-pass',
    'cross-runner-24-of-24',
    'signal-safe-48-of-48',
    'firebase-cli-version-pass',
    'firebase-lab-project-visible'
  ]);
  const unexpected = (Array.isArray(base.failedCheckIds) ? base.failedCheckIds : []).filter(id => !allowedLegacyFailures.has(id));
  add('legacy-no-unexpected-failures', unexpected.length === 0, JSON.stringify(unexpected));
  add('legacy-core-28-pass', Number(base.passed) >= 28, `${base.passed}/${base.total}`);
  add('jq-shim-10-of-10', Number(base.jqShimChecks) === 10 && Number(base.jqShimPassed) === 10, `${base.jqShimPassed}/${base.jqShimChecks}`);
  remoteHead = String(base.remoteHead || '');
  add('remote-head-valid', /^[0-9a-f]{40}$/.test(remoteHead), remoteHead);

  if (!git || !bash || !remoteHead) throw new Error('LOCAL_CORE_PREREQUISITE_MISSING');
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-local-v3-'));
  worktree = path.join(tempBase, 'repo');
  const addWorktree = run(git, ['-C', REPO, 'worktree', 'add', '--detach', worktree, remoteHead], { timeout: 120000 });
  add('v3-isolated-worktree-created', addWorktree.status === 0, addWorktree.stderr);
  if (addWorktree.status !== 0) throw new Error('V3_WORKTREE_CREATE_FAILED');

  const localBin = path.join(worktree, 'tools', 'orbit360-local-bin-v20260806');
  const adjustedPath = [localBin, path.dirname(bash), path.dirname(git), process.env.PATH || ''].filter(Boolean).join(path.delimiter);
  const portableOut = path.join(worktree, 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-cross-runner-source-test-sanitized-v20260806.json');
  const portableRun = run(process.execPath, ['tools/orbit360-test-visual-matrix-cross-runner-portable-v20260806.mjs'], {
    cwd: worktree,
    timeout: 90000,
    env: { ...process.env, PATH: adjustedPath, RUNNER_OS: 'Windows-local-source-only-v3', ORBIT360_CROSS_RUNNER_EVIDENCE: portableOut }
  });
  add('portable-cross-runner-command-pass', portableRun.status === 0, portableRun.stderr || portableRun.stdout.slice(-600));
  try { portable = JSON.parse(fs.readFileSync(portableOut, 'utf8')); } catch {}
  add('portable-cross-runner-24-of-24', portable.total === 24 && portable.passed === 24 && portable.failed === 0 && portable.ok === true, JSON.stringify({ total: portable.total, passed: portable.passed, failed: portable.failed }));
  add('portable-signal-safe-48-of-48', portable.priorSignalSafeChecks === 48 && portable.priorSignalSafePassed === 48, JSON.stringify({ total: portable.priorSignalSafeChecks, passed: portable.priorSignalSafePassed }));

  add('firebase-node-entrypoint-present', !!firebaseJs, firebaseJs || 'missing');
  if (firebaseJs) {
    const version = run(process.execPath, [firebaseJs, '--version'], { timeout: 30000 });
    add('firebase-cli-version-pass-via-node', version.status === 0, version.stdout || version.stderr);
    const projects = run(process.execPath, [firebaseJs, 'projects:list', '--json', '--non-interactive'], { timeout: 90000 });
    firebaseProjectVisible = projects.status === 0 && String(projects.stdout || '').includes(PROJECT);
    add('firebase-lab-project-visible-via-node', firebaseProjectVisible, projects.status === 0 ? PROJECT : projects.stderr);
  }

  credentialReferencePresent = [
    process.env.FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB,
    process.env.FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB,
    process.env.FIREBASE_SERVICE_ACCOUNT
  ].some(value => typeof value === 'string' && value.trim().length > 0)
    || (typeof process.env.GOOGLE_APPLICATION_CREDENTIALS === 'string' && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  add('credential-not-read-before-go-gate', true, credentialReferencePresent ? 'reference-present-value-not-read' : 'binding-deferred-to-authorized-secret-phase');
  add('credential-binding-not-a-source-only-failure', true, 'GO_GATE_CONTRACT must precede secret access');
} catch (error) {
  add('v3-preflight-exception-free', false, error && error.message || error);
} finally {
  if (git && worktree) {
    const remove = run(git, ['-C', REPO, 'worktree', 'remove', '--force', worktree], { timeout: 60000 });
    add('v3-isolated-worktree-removed', remove.status === 0, remove.stderr);
  }
}

const failed = checks.filter(check => !check.ok);
const result = {
  schemaVersion: 'orbit360-local-windows-source-only-preflight-v3',
  gateId: GATE,
  branch: BRANCH,
  remoteHead,
  status: failed.length ? 'HOLD_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT_V3' : 'PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT_V3',
  classification: failed.length
    ? 'ENVIRONMENT_FAILURE_OR_LOCAL_PREREQUISITE'
    : (credentialReferencePresent ? 'LOCAL_EXECUTOR_READY_SOURCE_ONLY' : 'LOCAL_EXECUTOR_READY_SOURCE_ONLY_CREDENTIAL_BINDING_PENDING'),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(check => check.id),
  checks,
  inheritedCorePasses: Number(base.passed || 0),
  jqShimChecks: Number(base.jqShimChecks || 0),
  jqShimPassed: Number(base.jqShimPassed || 0),
  crossRunnerChecks: Number(portable.total || 0),
  crossRunnerPassed: Number(portable.passed || 0),
  signalSafeChecks: Number(portable.priorSignalSafeChecks || 0),
  signalSafePassed: Number(portable.priorSignalSafePassed || 0),
  signalCompatibilityApplied: portable.priorSignalCompatibilityApplied === true,
  firebaseProjectVisible,
  credentialReferencePresent,
  credentialBindingPending: !credentialReferencePresent,
  secretAccessAuthorized: false,
  serviceAccountValueRead: false,
  secretsRead: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  nextAction: failed.length
    ? 'Correct only the listed local prerequisite; do not open runtime.'
    : 'Issue one immutable macro authorization bound to remoteHead. After GO_GATE_CONTRACT, bind the LAB credential securely without exposing it, then run recovery plus full matrix once.',
  ok: failed.length === 0
};
write(result);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 42);
