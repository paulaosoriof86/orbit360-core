#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';

const CAPTURE_TIMEOUT_MS = 12000;
// Contract markers: fullPage: false; blocking: false.

patchChromiumCaptureWatchdog({
  chromium,
  evidencePath: process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || '',
  hardTimeoutMs: Number(process.env.ORBIT360_CAPTURE_HARD_TIMEOUT_MS || CAPTURE_TIMEOUT_MS),
  heartbeatMs: Number(process.env.ORBIT360_CAPTURE_HEARTBEAT_MS || 2500),
  detachTimeoutMs: Number(process.env.ORBIT360_CAPTURE_DETACH_TIMEOUT_MS || 600)
});

const here = path.dirname(fileURLToPath(import.meta.url));
const auditedPath = path.join(here, 'orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');
const tempPath = path.join(here, `.orbit360-v17-route-aware-${process.pid}-${Date.now()}.mjs`);
let source = fs.readFileSync(auditedPath, 'utf8');

const routeReadyPattern = /async function waitRouteReady\(page, role, route\) \{[\s\S]*?\n\}\nasync function go\(page, role, route\) \{/;
if (!routeReadyPattern.test(source)) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V17_ROUTE_READY_SOURCE_PATTERN_NOT_FOUND');
}

const routeReadyReplacement = `async function waitRouteReady(page, role, route) {
  const prefix = role.toUpperCase() + '_ROUTE_' + route.toUpperCase();
  const requiredMs = await waitObservable(page, expected => {
    try {
      const diagnostics = window.OrbitHydrationContractDiagnostics;
      if (!diagnostics || typeof diagnostics.mounted !== 'function' || !diagnostics.mounted() || typeof diagnostics.status !== 'function') return false;
      const state = diagnostics.status(expected) || {};
      const required = state.required || {};
      return state.ready === true
        && Array.isArray(required.missing) && required.missing.length === 0
        && Array.isArray(required.failed) && required.failed.length === 0;
    } catch { return false; }
  }, route, prefix + '_REQUIRED_HYDRATION', 35000);
  const renderMs = await waitObservable(page, expected => {
    try {
      const current = window.Orbit && Orbit.route && Orbit.route.key;
      const diagnostics = window.OrbitHydrationContractDiagnostics;
      const hydration = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status(expected) || {} : {};
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected];
      const host = document.getElementById('host');
      const authoritative = diag && diag.readinessAuthority === 'OrbitHydrationContractDiagnostics' && diag.requiredReady === true;
      return current === expected
        && diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()
        && hydration.ready === true
        && !document.querySelector('.orbit-load-state')
        && (authoritative || (host && (host.innerText || '').trim().length > 60));
    } catch { return false; }
  }, route, prefix + '_RENDER_READY', 35000);
  return requiredMs + renderMs;
}
async function go(page, role, route) {`;

source = source.replace(routeReadyPattern, routeReadyReplacement);
source = source.replace(
  "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v1',",
  "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v17-route-aware',"
);
source = source.replace(
  "classification: '',\n  projectId: PROJECT,",
  "classification: '',\n  readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  projectId: PROJECT,"
);

if (!source.includes("_REQUIRED_HYDRATION', 35000") || !source.includes("_RENDER_READY', 35000")) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V17_ROUTE_READY_TRANSFORM_NOT_APPLIED');
}

fs.writeFileSync(tempPath, source, 'utf8');
try {
  await import(pathToFileURL(tempPath).href + `?v17=${Date.now()}`);
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
