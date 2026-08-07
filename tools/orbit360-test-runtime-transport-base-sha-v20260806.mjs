#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const helper = path.join(ROOT, 'tools/orbit360-validate-runtime-transport-context-v20260806.mjs');
const wrapper = path.join(ROOT, 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v4-transport-base-sha-v20260806.sh');
const wrapperText = fs.readFileSync(wrapper, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-transport-base-sha-'));
const parent = 'a'.repeat(40);
const other = 'b'.repeat(40);
const request = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-request-v1',
  requestVersion: 'synthetic-runtime',
  status: 'AUTHORIZED_ONCE',
  allowedExecutions: 1,
  consumed: false,
  replayAllowed: false,
  branch: 'ays/backend-tenant-lab-v99-20260703',
  parentHead: parent
};
const requestFile = path.join(tmp, 'request.json');
fs.writeFileSync(requestFile, JSON.stringify(request), 'utf8');

const run = (...args) => spawnSync(process.execPath, [helper, ...args], { encoding: 'utf8' });
const valid = run(requestFile, 'pull_request', 'activation-branch', parent, request.branch);
const wrongBase = run(requestFile, 'pull_request', 'activation-branch', other, request.branch);
const wrongEvent = run(requestFile, 'push', 'activation-branch', parent, request.branch);
const wrongCanonical = run(requestFile, 'pull_request', 'activation-branch', parent, 'different-branch');
const consumedRequest = { ...request, status: 'CONSUMED', allowedExecutions: 0, consumed: true };
const consumedFile = path.join(tmp, 'consumed.json');
fs.writeFileSync(consumedFile, JSON.stringify(consumedRequest), 'utf8');
const consumed = run(consumedFile, 'pull_request', 'activation-branch', parent, request.branch);

const checks = {
  filesExist: fs.existsSync(helper) && fs.existsSync(wrapper),
  helperSyntax: spawnSync(process.execPath, ['--check', helper]).status === 0,
  wrapperBashSyntax: spawnSync('bash', ['-n', wrapper]).status === 0,
  wrapperResolvesOriginBaseSha: wrapperText.includes('origin/${EVENT_BASE_REF}^{commit}'),
  wrapperCallsHelperBeforeRunner: wrapperText.indexOf('node "$HELPER"') < wrapperText.indexOf('exec env GITHUB_BASE_REF="$BRANCH"'),
  wrapperDelegatesOnlyAfterProof: wrapperText.includes('exec env GITHUB_BASE_REF="$BRANCH" bash "$RUNNER"'),
  wrapperNoHardBaseRefEquality: !wrapperText.includes('[[ "$EVENT_BASE_REF" == "$BRANCH" ]]'),
  validTransportAccepted: valid.status === 0 && valid.stdout.includes('PASS_RUNTIME_TRANSPORT_BASE_SHA_CONTEXT'),
  wrongBaseRejected: wrongBase.status === 41 && wrongBase.stderr.includes('TRANSPORT_BASE_SHA_PARENT_MISMATCH'),
  wrongEventRejected: wrongEvent.status === 41 && wrongEvent.stderr.includes('TRANSPORT_EVENT_MISMATCH'),
  wrongCanonicalRejected: wrongCanonical.status === 41 && wrongCanonical.stderr.includes('CANONICAL_BRANCH_MISMATCH'),
  consumedRequestRejected: consumed.status === 41 && consumed.stderr.includes('REQUEST_NOT_ACTIVE_ONCE')
};
const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-runtime-transport-base-sha-source-test-v1',
  generatedAt: '2026-08-06T18:21:00-06:00',
  status: failedCheckIds.length ? 'STOP_SOURCE_TEST' : 'PASS_RUNTIME_TRANSPORT_BASE_SHA_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretAccess: false,
  firebaseAccess: false,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  writes: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
const out = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/runtime-transport-base-sha-source-test-sanitized-v20260806.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
