#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.env.ORBIT360_GATE_ID || 'block-auth-selfmanaged-credentials-runtime-v20260805';
const EVIDENCE_DIR = process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716';
const LEDGER = path.join(EVIDENCE_DIR, 'auth-selfmanaged-source-stage-ledger-sanitized-v20260805.json');
const PREFLIGHT = path.join(EVIDENCE_DIR, 'preflight-sanitizado.json');
const RUN_ID = String(process.env.GITHUB_RUN_ID || `local-${Date.now()}`);
const RUN_ATTEMPT = String(process.env.GITHUB_RUN_ATTEMPT || '0');
const REQUEST_FILE = String(process.env.ORBIT360_REQUEST_FILE || '');

const STALE_FILES = [
  'auth-selfmanaged-identity-plan-sanitized-v20260805.json',
  'auth-selfmanaged-identity-apply-sanitized-v20260805.json',
  'auth-selfmanaged-passwords-sanitized-v20260805.json',
  'auth-selfmanaged-final-verify-sanitized-v20260805.json',
  'auth-selfmanaged-containment-sanitized-v20260805.json',
  'auth-dynamic-team-census-sanitized-v20260805.json',
  'auth-dynamic-team-apply-sanitized-v20260805.json',
  'auth-dynamic-team-sessions-sanitized-v20260805.json',
  'auth-selfmanaged-credentials-runtime-final-sanitized-v20260805.json',
  'preflight-sanitizado.json'
];

function sanitize(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[api-key]')
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[private-key]')
    .slice(0, 900);
}

function writeLedger(ledger) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

function runNode(args, options = {}) {
  return execFileSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: process.env
  });
}

function runStep(ledger, id, owner, action) {
  const step = {
    id,
    owner,
    status: 'started',
    errorCode: '',
    detail: '',
    startedAt: new Date().toISOString(),
    finishedAt: ''
  };
  ledger.steps.push(step);
  writeLedger(ledger);
  try {
    const detail = action();
    step.status = 'pass';
    step.detail = sanitize(detail);
    step.finishedAt = new Date().toISOString();
    writeLedger(ledger);
    return detail;
  } catch (error) {
    const raw = sanitize(error?.stderr || error?.message || error);
    const marker = raw.match(/(?:VALIDATOR_STALE|PIPELINE_MECHANISM_FAILURE|DATA_CONTRACT_FAILURE|FUNCTIONAL_DEFECT|SECURITY_FAILURE):?[A-Z0-9_-]*/)?.[0] || '';
    step.status = 'fail';
    step.errorCode = marker || `${id.toUpperCase()}_FAILED`;
    step.detail = raw;
    step.finishedAt = new Date().toISOString();
    ledger.status = 'fail';
    ledger.classification = marker.startsWith('VALIDATOR_STALE') ? 'VALIDATOR_STALE' : 'PIPELINE_MECHANISM_FAILURE';
    ledger.errorCode = step.errorCode;
    ledger.failedStepId = id;
    ledger.finishedAt = new Date().toISOString();
    writeLedger(ledger);
    throw error;
  }
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
for (const name of STALE_FILES) {
  const target = path.join(EVIDENCE_DIR, name);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
if (fs.existsSync(LEDGER)) fs.rmSync(LEDGER, { force: true });

const ledger = {
  schemaVersion: 'orbit360-auth-selfmanaged-source-stage-ledger-v1',
  gateId: GATE_ID,
  runId: RUN_ID,
  runAttempt: RUN_ATTEMPT,
  requestFile: REQUEST_FILE,
  status: 'running',
  classification: 'SOURCE_ONLY_IN_PROGRESS',
  errorCode: '',
  failedStepId: '',
  staleEvidenceInvalidated: true,
  secretsRead: false,
  firebaseExecuted: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authReads: 0,
  authWrites: 0,
  deploys: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  startedAt: new Date().toISOString(),
  finishedAt: '',
  steps: []
};
writeLedger(ledger);

try {
  runStep(ledger, 'apply_sourcefix', 'tools/orbit360-apply-selfmanaged-credentials-sourcefix-v20260805.mjs', () =>
    runNode(['tools/orbit360-apply-selfmanaged-credentials-sourcefix-v20260805.mjs'])
  );

  runStep(ledger, 'syntax', 'node --check', () => {
    const files = [
      'functions/user-onboarding.js',
      'functions/user-credential-selfservice.js',
      'tools/orbit360-auth-selfmanaged-credentials-runtime-v20260805.mjs',
      'tools/orbit360-auth-selfmanaged-credentials-containment-v20260805.mjs',
      'tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs',
      'tools/orbit360-register-auth-selfmanaged-credentials-runtime-gate-v20260805.mjs',
      'tools/orbit360-auth-selfmanaged-source-stage-owner-v20260805.mjs'
    ];
    for (const file of files) runNode(['--check', file]);
    return `checked=${files.length}`;
  });

  runStep(ledger, 'fixtures', 'tools/orbit360-test-auth-selfmanaged-credentials-source-v20260805.mjs', () => {
    const output = runNode(['tools/orbit360-test-auth-selfmanaged-credentials-source-v20260805.mjs']);
    const fixture = JSON.parse(output);
    if (!(fixture?.ok === true && fixture?.identityOverrides === 4 && fixture?.usersInPatternFixture === 7 && fixture?.operationalCapabilitiesUsed === 0)) {
      throw new Error('PIPELINE_MECHANISM_FAILURE:SOURCE_FIXTURES_NOT_PASS');
    }
    return JSON.stringify({ ok: true, identityOverrides: 4, usersInPatternFixture: 7 });
  });

  runStep(ledger, 'register_gate', 'tools/orbit360-register-auth-selfmanaged-credentials-runtime-gate-v20260805.mjs', () =>
    runNode(['tools/orbit360-register-auth-selfmanaged-credentials-runtime-gate-v20260805.mjs'])
  );

  runStep(ledger, 'canonical_gate', 'tools/orbit360-validar-gate-contracts-v20260717.mjs', () => {
    const output = runNode(['tools/orbit360-validar-gate-contracts-v20260717.mjs', GATE_ID]);
    const result = JSON.parse(output);
    if (!(result?.status === 'GO_GATE_CONTRACT' && result?.ok === true && result?.failed === 0)) {
      throw new Error(`PIPELINE_MECHANISM_FAILURE:CANONICAL_GATE_NOT_PASS:${(result?.failedCheckIds || []).join(',')}`);
    }
    if (!fs.existsSync(PREFLIGHT)) throw new Error('PIPELINE_MECHANISM_FAILURE:PREFLIGHT_NOT_PERSISTED');
    return JSON.stringify({ status: result.status, passed: result.passed, failed: result.failed });
  });

  ledger.status = 'pass';
  ledger.classification = 'SOURCE_ONLY_ROOTFIX_PASS';
  ledger.errorCode = '';
  ledger.failedStepId = '';
  ledger.finishedAt = new Date().toISOString();
  writeLedger(ledger);
  console.log(JSON.stringify(ledger, null, 2));
} catch (error) {
  console.error(sanitize(error?.stderr || error?.message || error));
  process.exit(41);
}
