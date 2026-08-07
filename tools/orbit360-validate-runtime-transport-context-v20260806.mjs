#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const [requestFile, eventName, baseRef, baseSha, canonicalBranch] = process.argv.slice(2);

function stop(code, detail) {
  const payload = {
    schemaVersion: 'orbit360-runtime-transport-context-v1',
    status: 'STOP_RUNTIME_TRANSPORT_CONTEXT',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failureCode: code,
    detail,
    eventName: String(eventName || ''),
    baseRef: String(baseRef || ''),
    baseSha: String(baseSha || ''),
    canonicalBranch: String(canonicalBranch || ''),
    secretAccess: false,
    firebaseAccess: false,
    browserExecuted: false,
    deployExecuted: false,
    writes: 0,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
}

if (!requestFile) stop('REQUEST_PATH_MISSING', 'The immutable request path is required.');
const resolved = path.resolve(requestFile);
if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
  stop('REQUEST_FILE_UNAVAILABLE', 'The immutable request file is unavailable.');
}

let request;
try {
  request = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  stop('REQUEST_JSON_INVALID', String(error && error.message || error));
}

if (eventName !== 'pull_request') stop('TRANSPORT_EVENT_MISMATCH', 'A pull_request transport is required.');
if (!baseRef) stop('TRANSPORT_BASE_REF_MISSING', 'The pull request base ref is required.');
if (!/^[a-f0-9]{40}$/.test(String(baseSha || ''))) stop('TRANSPORT_BASE_SHA_INVALID', 'The resolved base SHA is invalid.');
if (!canonicalBranch || request.branch !== canonicalBranch) {
  stop('CANONICAL_BRANCH_MISMATCH', 'The request branch does not match the canonical branch.');
}
if (request.parentHead !== baseSha) {
  stop('TRANSPORT_BASE_SHA_PARENT_MISMATCH', 'The pull request base SHA does not equal request.parentHead.');
}
if (request.replayAllowed !== false) stop('REQUEST_REPLAY_BOUNDARY_INVALID', 'Request replay must remain disabled.');
if (request.status !== 'AUTHORIZED_ONCE' || request.allowedExecutions !== 1 || request.consumed !== false) {
  stop('REQUEST_NOT_ACTIVE_ONCE', 'The request is not an active one-time authorization.');
}

const output = {
  schemaVersion: 'orbit360-runtime-transport-context-v1',
  status: 'PASS_RUNTIME_TRANSPORT_BASE_SHA_CONTEXT',
  classification: 'PASS_IMMUTABLE_TRANSPORT_CONTEXT',
  requestVersion: String(request.requestVersion || ''),
  eventName,
  baseRef,
  baseSha,
  requestParentHead: request.parentHead,
  canonicalBranch,
  requestReplayAllowed: false,
  allowedExecutions: 1,
  secretAccess: false,
  firebaseAccess: false,
  browserExecuted: false,
  deployExecuted: false,
  writes: 0,
  containsPII: false,
  containsSecrets: false,
  ok: true
};
console.log(JSON.stringify(output, null, 2));
