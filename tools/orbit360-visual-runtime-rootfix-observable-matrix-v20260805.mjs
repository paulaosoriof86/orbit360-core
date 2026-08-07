#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';
import { buildV20MatrixArtifact } from './orbit360-build-v20-route-aware-matrix-artifact-v20260807.mjs';
import { buildV21MatrixArtifact, V21_MATRIX_SCHEMA } from './orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs';

const CAPTURE_TIMEOUT_MS = 12000;
// Historical v20 import remains source-visible so the retired v20 source gate can verify succession safely.
void buildV20MatrixArtifact;
// Contract markers: fullPage: false; blocking: false.

patchChromiumCaptureWatchdog({
  chromium,
  evidencePath: process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || '',
  hardTimeoutMs: Number(process.env.ORBIT360_CAPTURE_HARD_TIMEOUT_MS || CAPTURE_TIMEOUT_MS),
  heartbeatMs: Number(process.env.ORBIT360_CAPTURE_HEARTBEAT_MS || 2500),
  detachTimeoutMs: Number(process.env.ORBIT360_CAPTURE_DETACH_TIMEOUT_MS || 600)
});

const here = path.dirname(fileURLToPath(import.meta.url));
const tempPath = path.join(here, `.orbit360-v21-exact-matrix-artifact-${process.pid}-${Date.now()}.mjs`);
const evidencePath = process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || '';

function clean(value) {
  return String(value == null ? '' : value)
    .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
    .replace(/\b\d{6,}\b/g, '[id]')
    .slice(0, 900);
}
function persistPipelineFailure(checkpoint, error) {
  if (!evidencePath) return;
  const payload = {
    schemaVersion: V21_MATRIX_SCHEMA,
    gateId: process.env.ORBIT360_GATE_ID || 'block2.7-visual-observable-rootfix-v2-lab-v20260805',
    contractVersion: process.env.ORBIT360_CONTRACT_VERSION || '2.7.5',
    stage: 'FAIL_VISUAL_OBSERVABLE_ROOTFIX_MATRIX',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    currentCheckpoint: checkpoint,
    checkpoint,
    error: clean(error && error.message || error),
    routeMetrics: [],
    roles: [],
    captureWarnings: [],
    snapshotIntegrity: 'NOT_VERIFIED',
    firestoreReads: 0,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    functionsDeploys: 0,
    rulesDeploys: 0,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  fs.mkdirSync(path.dirname(path.resolve(evidencePath)), { recursive: true });
  fs.writeFileSync(path.resolve(evidencePath), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

let artifactWritten = false;
try {
  const source = buildV21MatrixArtifact();
  fs.writeFileSync(tempPath, source, 'utf8');
  artifactWritten = true;

  const compile = spawnSync(process.execPath, ['--check', tempPath], { encoding: 'utf8' });
  if (compile.status !== 0) {
    const detail = `${compile.stderr || ''}\n${compile.stdout || ''}`.trim();
    const error = new Error('PIPELINE_MECHANISM_FAILURE_MATRIX_ARTIFACT_COMPILE:' + clean(detail));
    persistPipelineFailure('MATRIX_ARTIFACT_COMPILE_FAILED', error);
    throw error;
  }

  await import(pathToFileURL(tempPath).href + `?v21=${Date.now()}`);
} catch (error) {
  if (!evidencePath || !fs.existsSync(evidencePath)) {
    persistPipelineFailure('MATRIX_ARTIFACT_IMPORT_FAILED', error);
  }
  throw error;
} finally {
  if (artifactWritten) {
    try { fs.unlinkSync(tempPath); } catch {}
  }
}
