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
const OUT = path.join(REPO, 'orbit360-platform/runtime-gate-crm-v20260716/local-windows-source-only-preflight-sanitized-v20260806.json');
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail: String(detail || '').replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0, 600) });
const envHas = names => names.some(name => typeof process.env[name] === 'string' && process.env[name].trim().length > 0);

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
function existsExecutable(candidate) {
  if (!candidate) return false;
  if (path.isAbsolute(candidate)) return fs.existsSync(candidate);
  const probe = process.platform === 'win32' ? run('where.exe', [candidate], { timeout: 10000 }) : run('which', [candidate], { timeout: 10000 });
  return probe.status === 0;
}
function firstExecutable(candidates) {
  return candidates.find(existsExecutable) || '';
}
function write(result) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
}

const git = firstExecutable(['git.exe', 'git']);
const bash = firstExecutable([
  process.env.GIT_BASH_PATH || '',
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  'bash.exe',
  'bash'
]);
const npm = firstExecutable(['npm.cmd', 'npm']);
const firebase = firstExecutable([
  process.env.FIREBASE_CLI_PATH || '',
  process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'firebase.cmd') : '',
  'firebase.cmd',
  'firebase'
]);
const jq = firstExecutable([
  process.env.JQ_PATH || '',
  'C:\\Program Files\\Git\\usr\\bin\\jq.exe',
  'jq.exe',
  'jq'
]);

add('repo-exists', fs.existsSync(REPO), REPO);
add('git-available', !!git, git || 'missing');
add('node-available', !!process.execPath, process.version);
add('npm-available', !!npm, npm || 'missing');
add('git-bash-available', !!bash, bash || 'missing');
add('firebase-cli-available', !!firebase, firebase || 'missing');
add('jq-available-for-runtime-v3', !!jq, jq || 'missing');
add('service-account-env-present', envHas(['FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB', 'FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB', 'FIREBASE_SERVICE_ACCOUNT']), 'value not read');

let localBranch = '';
let localHead = '';
let remoteHead = '';
let worktree = '';
let sourceResult = {};
let firebaseProjectVisible = false;

try {
  if (!git) throw new Error('GIT_MISSING');
  const inside = run(git, ['-C', REPO, 'rev-parse', '--is-inside-work-tree'], { timeout: 15000 });
  add('repo-is-git-worktree', inside.status === 0 && inside.stdout.trim() === 'true', inside.stderr);
  const branch = run(git, ['-C', REPO, 'branch', '--show-current'], { timeout: 15000 });
  localBranch = branch.stdout.trim();
  add('local-branch-observed', branch.status === 0, localBranch);
  const head = run(git, ['-C', REPO, 'rev-parse', 'HEAD'], { timeout: 15000 });
  localHead = head.stdout.trim();
  add('local-head-observed', head.status === 0 && /^[0-9a-f]{40}$/.test(localHead), localHead);

  const fetch = run(git, ['-C', REPO, 'fetch', '--prune', 'origin', BRANCH], { timeout: 180000 });
  add('remote-fetch-pass', fetch.status === 0, fetch.stderr);
  const remote = run(git, ['-C', REPO, 'rev-parse', `origin/${BRANCH}`], { timeout: 15000 });
  remoteHead = remote.stdout.trim();
  add('remote-head-observed', remote.status === 0 && /^[0-9a-f]{40}$/.test(remoteHead), remoteHead);

  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-local-source-'));
  worktree = path.join(tempBase, 'repo');
  const addWorktree = run(git, ['-C', REPO, 'worktree', 'add', '--detach', worktree, `origin/${BRANCH}`], { timeout: 120000 });
  add('isolated-worktree-created', addWorktree.status === 0, addWorktree.stderr);
  if (addWorktree.status !== 0) throw new Error('WORKTREE_CREATE_FAILED');

  const required = [
    'tools/orbit360-run-with-timeout-cross-platform-v20260806.mjs',
    'tools/orbit360-runtime-signal-safe-lib-v20260806.sh',
    'tools/orbit360-supervise-visual-matrix-signal-safe-v20260806.mjs',
    'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh',
    'tools/orbit360-test-visual-matrix-cross-runner-source-v20260806.mjs',
    'tools/orbit360-test-visual-matrix-timeout-signal-safe-source-v20260806.mjs',
    'tools/orbit360-validar-gate-contracts-v20260717.mjs',
    '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
  ];
  for (const rel of required) add(`required-${rel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, fs.existsSync(path.join(worktree, rel)), rel);

  const requestPath = path.join(worktree, '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json');
  const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
  add('prior-request-consumed', request.consumed === true && request.allowedExecutions === 0 && request.replayAllowed === false, request.status);
  add('prior-request-not-reusable', request.status === 'CONSUMED_STOP_RETRY_MATRIX_TIMEOUT_ROLLBACK_ENVIRONMENT', request.status);

  const adjustedPath = [path.dirname(bash), path.dirname(git), process.env.PATH || ''].filter(Boolean).join(path.delimiter);
  const source = run(process.execPath, ['tools/orbit360-test-visual-matrix-cross-runner-source-v20260806.mjs'], {
    cwd: worktree,
    timeout: 90000,
    env: { ...process.env, PATH: adjustedPath, RUNNER_OS: 'Windows-local-source-only' }
  });
  add('cross-runner-source-command-pass', source.status === 0, source.stderr || source.stdout.slice(-600));
  const evidence = path.join(worktree, 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-cross-runner-source-test-sanitized-v20260806.json');
  try { sourceResult = JSON.parse(fs.readFileSync(evidence, 'utf8')); } catch {}
  add('cross-runner-24-of-24', sourceResult.total === 24 && sourceResult.passed === 24 && sourceResult.failed === 0 && sourceResult.ok === true, JSON.stringify({ total: sourceResult.total, passed: sourceResult.passed, failed: sourceResult.failed }));
  add('signal-safe-48-of-48', sourceResult.priorSignalSafeChecks === 48 && sourceResult.priorSignalSafePassed === 48, JSON.stringify({ total: sourceResult.priorSignalSafeChecks, passed: sourceResult.priorSignalSafePassed }));

  if (firebase) {
    const version = run(firebase, ['--version'], { timeout: 30000 });
    add('firebase-cli-version-pass', version.status === 0, version.stdout || version.stderr);
    const projects = run(firebase, ['projects:list', '--json', '--non-interactive'], { timeout: 90000 });
    firebaseProjectVisible = projects.status === 0 && projects.stdout.includes(PROJECT);
    add('firebase-lab-project-visible', firebaseProjectVisible, projects.status === 0 ? PROJECT : projects.stderr);
  }
} catch (error) {
  add('preflight-exception-free', false, error && error.message || error);
} finally {
  if (git && worktree) {
    const remove = run(git, ['-C', REPO, 'worktree', 'remove', '--force', worktree], { timeout: 60000 });
    add('isolated-worktree-removed', remove.status === 0, remove.stderr);
  }
}

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'orbit360-local-windows-source-only-preflight-v1',
  gateId: GATE,
  branch: BRANCH,
  localBranch,
  localHead,
  remoteHead,
  status: failed.length ? 'HOLD_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT' : 'PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT',
  classification: failed.length ? 'ENVIRONMENT_FAILURE_OR_LOCAL_PREREQUISITE' : 'LOCAL_EXECUTOR_READY_SOURCE_ONLY',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  crossRunnerChecks: Number(sourceResult.total || 0),
  crossRunnerPassed: Number(sourceResult.passed || 0),
  signalSafeChecks: Number(sourceResult.priorSignalSafeChecks || 0),
  signalSafePassed: Number(sourceResult.priorSignalSafePassed || 0),
  firebaseProjectVisible,
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
  nextAction: failed.length ? 'Correct only the reported local prerequisite; do not open runtime.' : 'Prepare one immutable local-runtime authorization bound to remoteHead, then run recovery plus full matrix once.',
  ok: failed.length === 0
};
write(result);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 42);
