#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MATRIX_EVIDENCE = process.env.ORBIT360_MATRIX_EVIDENCE || process.env.ORBIT360_VISUAL_EVIDENCE || '';
const SUPERVISOR_EVIDENCE = process.env.ORBIT360_MATRIX_SUPERVISOR_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-supervisor-sanitized-v20260806.json';
const COMMAND_JSON = process.env.ORBIT360_MATRIX_COMMAND_JSON || JSON.stringify(['node', 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs']);
const POLL_MS = Number(process.env.ORBIT360_MATRIX_POLL_MS || 1000);
const IDLE_TIMEOUT_MS = Number(process.env.ORBIT360_MATRIX_IDLE_TIMEOUT_MS || 90000);
const ROLE_TIMEOUT_MS = Number(process.env.ORBIT360_MATRIX_ROLE_TIMEOUT_MS || 420000);
const GLOBAL_TIMEOUT_MS = Number(process.env.ORBIT360_MATRIX_GLOBAL_TIMEOUT_MS || 1200000);
const TERMINATE_GRACE_MS = Number(process.env.ORBIT360_MATRIX_TERMINATE_GRACE_MS || 8000);

if (!MATRIX_EVIDENCE) throw new Error('ORBIT360_MATRIX_EVIDENCE_REQUIRED');
const command = JSON.parse(COMMAND_JSON);
if (!Array.isArray(command) || command.length < 1 || command.some(value => typeof value !== 'string' || !value)) {
  throw new Error('ORBIT360_MATRIX_COMMAND_JSON_INVALID');
}

fs.mkdirSync(path.dirname(SUPERVISOR_EVIDENCE), { recursive: true });
const startedAt = Date.now();
const state = {
  schemaVersion: 'orbit360-visual-matrix-signal-safe-supervisor-v1',
  status: 'STARTED',
  classification: '',
  currentCheckpoint: 'SUPERVISOR_START',
  observedCheckpoints: [],
  childCommand: path.basename(command[0]) + (command[1] ? ' ' + path.basename(command[1]) : ''),
  budgets: { pollMs: POLL_MS, idleTimeoutMs: IDLE_TIMEOUT_MS, roleTimeoutMs: ROLE_TIMEOUT_MS, globalTimeoutMs: GLOBAL_TIMEOUT_MS, terminateGraceMs: TERMINATE_GRACE_MS },
  childPid: null,
  childExitCode: null,
  childSignal: null,
  terminationReason: '',
  receivedSignal: '',
  matrixEvidencePresent: false,
  matrixStage: '',
  matrixClassification: '',
  runtimeExecuted: true,
  browserExecuted: false,
  deployExecuted: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};

function durableWrite() {
  const temp = SUPERVISOR_EVIDENCE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, SUPERVISOR_EVIDENCE);
}
function readMatrix() {
  try {
    const value = JSON.parse(fs.readFileSync(MATRIX_EVIDENCE, 'utf8'));
    state.matrixEvidencePresent = true;
    state.matrixStage = String(value.stage || '');
    state.matrixClassification = String(value.classification || '');
    state.browserExecuted = true;
    state.firestoreWrites = Number(value.firestoreWrites || 0);
    state.authWrites = Number(value.authWrites || 0);
    state.operationalWrites = Number(value.operationalWrites || 0);
    state.productionTouched = value.productionTouched === true;
    return value;
  } catch {
    return null;
  }
}
function checkpointRole(checkpoint) {
  const match = /^(DIRECCION|OPERATIVO|ASESOR)_/.exec(String(checkpoint || ''));
  return match ? match[1] : '';
}
function observe(checkpoint, detail = {}) {
  state.currentCheckpoint = checkpoint;
  state.observedCheckpoints.push({ checkpoint, at: new Date().toISOString(), elapsedMs: Date.now() - startedAt, ...detail });
  durableWrite();
}

let child;
let poll;
let killTimer;
let lastCheckpoint = '';
let lastProgressAt = Date.now();
let activeRole = '';
let roleStartedAt = 0;
let terminating = false;
let requestedExitCode = 42;

function terminate(reason, classification = 'PIPELINE_MECHANISM_FAILURE') {
  if (terminating) return;
  terminating = true;
  state.status = 'TERMINATING';
  state.classification = classification;
  state.terminationReason = reason;
  observe(reason);
  if (child && child.exitCode == null && child.signalCode == null) {
    child.kill('SIGTERM');
    killTimer = setTimeout(() => {
      if (child && child.exitCode == null && child.signalCode == null) child.kill('SIGKILL');
    }, TERMINATE_GRACE_MS);
    killTimer.unref();
  }
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => {
    state.receivedSignal = signal;
    requestedExitCode = signal === 'SIGINT' ? 130 : signal === 'SIGHUP' ? 129 : 143;
    terminate('SUPERVISOR_SIGNAL_' + signal.replace('SIG', ''), 'PIPELINE_MECHANISM_FAILURE');
  });
}

observe('SUPERVISOR_CHILD_SPAWN');
child = spawn(command[0], command.slice(1), { stdio: 'inherit', env: process.env });
state.childPid = child.pid || null;
durableWrite();

poll = setInterval(() => {
  const now = Date.now();
  const matrix = readMatrix();
  const checkpoint = matrix && String(matrix.currentCheckpoint || matrix.checkpoint || '');
  if (checkpoint && checkpoint !== lastCheckpoint) {
    lastCheckpoint = checkpoint;
    lastProgressAt = now;
    const role = checkpointRole(checkpoint);
    if (role && role !== activeRole) {
      activeRole = role;
      roleStartedAt = now;
    }
    if (/_COMPLETE$/.test(checkpoint)) {
      activeRole = '';
      roleStartedAt = 0;
    }
    observe('MATRIX_CHECKPOINT_' + checkpoint, { matrixCheckpoint: checkpoint, role: activeRole });
  }
  if (!terminating && now - startedAt > GLOBAL_TIMEOUT_MS) terminate('GLOBAL_TIMEOUT');
  if (!terminating && activeRole && roleStartedAt && now - roleStartedAt > ROLE_TIMEOUT_MS) terminate('ROLE_TIMEOUT_' + activeRole);
  if (!terminating && now - lastProgressAt > IDLE_TIMEOUT_MS) terminate('CHECKPOINT_IDLE_TIMEOUT');
}, Math.max(25, POLL_MS));

child.on('error', error => {
  state.childError = String(error && error.message || error).slice(0, 500);
  terminate('CHILD_SPAWN_ERROR');
});

child.on('exit', (code, signal) => {
  clearInterval(poll);
  if (killTimer) clearTimeout(killTimer);
  const matrix = readMatrix();
  state.childExitCode = code;
  state.childSignal = signal || '';
  state.currentCheckpoint = 'SUPERVISOR_CHILD_EXIT';
  if (!terminating && code === 0 && matrix && matrix.ok === true && matrix.stage === 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX') {
    state.status = 'PASS_MATRIX_SUPERVISED';
    state.classification = 'PASS_VISUAL_POST_AUTH';
    state.ok = true;
  } else if (terminating) {
    state.status = 'FAIL_MATRIX_WATCHDOG';
    state.classification = state.classification || 'PIPELINE_MECHANISM_FAILURE';
    state.ok = false;
  } else {
    state.status = 'FAIL_MATRIX_CHILD';
    state.classification = matrix && matrix.classification || 'PIPELINE_MECHANISM_FAILURE';
    state.terminationReason = state.terminationReason || 'CHILD_NONZERO_EXIT';
    state.ok = false;
  }
  state.finishedAt = new Date().toISOString();
  state.elapsedMs = Date.now() - startedAt;
  durableWrite();
  process.exit(state.ok ? 0 : requestedExitCode || 42);
});
