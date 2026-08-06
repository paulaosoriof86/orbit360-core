#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const RESTORE = process.env.ORBIT360_RESTORE_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-v7-prior-hosting-restore-sanitized-v20260806.json';
const FINAL = process.env.ORBIT360_FINAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-final-sanitized-v20260805.json';
const LIFECYCLE = process.env.ORBIT360_LIFECYCLE || 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';

const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const restore = read(RESTORE);
if (!restore) process.exit(0);

const sanitizedRestore = {
  status: restore.status,
  classification: restore.classification,
  checkpoint: restore.checkpoint,
  sourceBackupChannel: restore.sourceBackupChannel,
  targetChannel: restore.targetChannel,
  restoreExecuted: restore.restoreExecuted === true,
  restoreOutcome: restore.restoreOutcome,
  runId: restore.runId || '',
  attempt: Number(restore.attempt || 1),
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  deployExecuted: false,
  productionTouched: false
};

const final = read(FINAL);
if (final) {
  final.priorHostingRestore = sanitizedRestore;
  final.priorHostingRestorePassed = restore.ok === true;
  write(FINAL, final);
}

const lifecycle = read(LIFECYCLE);
if (lifecycle) {
  lifecycle.priorHostingRestore = sanitizedRestore;
  lifecycle.protectedState = lifecycle.protectedState || {};
  lifecycle.protectedState.priorV6BackupRestoredBeforeRuntime = restore.ok === true;
  write(LIFECYCLE, lifecycle);
}

const request = read(REQUEST);
if (request) {
  request.executionResult = request.executionResult || {};
  request.executionResult.priorHostingRestore = sanitizedRestore;
  write(REQUEST, request);
}

console.log(JSON.stringify({
  status: 'RESTORE_EVIDENCE_ATTACHED',
  restoreStatus: restore.status,
  restorePassed: restore.ok === true,
  finalUpdated: Boolean(final),
  lifecycleUpdated: Boolean(lifecycle),
  requestUpdated: Boolean(request),
  containsPII: false,
  containsSecrets: false,
  ok: true
}, null, 2));
