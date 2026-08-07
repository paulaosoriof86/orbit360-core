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
const tempPath = path.join(here, `.orbit360-v19-route-aware-${process.pid}-${Date.now()}.mjs`);
let source = fs.readFileSync(auditedPath, 'utf8');

const routeReadyPattern = /async function waitRouteReady\(page, role, route\) \{[\s\S]*?\n\}\nasync function go\(page, role, route\) \{/;
if (!routeReadyPattern.test(source)) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V19_ROUTE_READY_SOURCE_PATTERN_NOT_FOUND');
}

const routeReadyReplacement = `async function waitRequiredHydration(page, role, route) {
  const prefix = role.toUpperCase() + '_ROUTE_' + route.toUpperCase();
  return waitObservable(page, expected => {
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
}
async function waitRenderReady(page, role, route) {
  const prefix = role.toUpperCase() + '_ROUTE_' + route.toUpperCase();
  try {
    return await waitObservable(page, expected => {
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
  } catch (error) {
    let post = {};
    try {
      post = await page.evaluate(expected => {
        const diagnostics = window.OrbitHydrationContractDiagnostics;
        const hydration = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status(expected) || {} : {};
        const host = document.getElementById('host');
        return {
          route: window.Orbit && Orbit.route && Orbit.route.key || '',
          hydrationReady: hydration.ready === true,
          loadingVisible: !!document.querySelector('.orbit-load-state'),
          hostTextLength: host && (host.innerText || '').trim().length || 0
        };
      }, route);
    } catch {}
    if (post.route === route && post.hydrationReady === true && post.loadingVisible === false && post.hostTextLength > 60) {
      result.classification = 'VALIDATOR_STALE';
      result.validatorFinding = 'VALIDATOR_STALE_RENDER_PROBE_BLOCKED';
      mark(prefix + '_RENDER_PROBE_BLOCKED', { hostTextLength: post.hostTextLength });
      throw new Error('VALIDATOR_STALE_RENDER_PROBE_BLOCKED:' + clean(error && error.message || error));
    }
    throw error;
  }
}
async function persistRouteMetric(page, role, route, requiredMs, renderWaitMs) {
  let metric = {};
  try {
    metric = await page.evaluate(expected => {
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected] || {};
      const list = diag.list || {};
      return {
        renderMs: Number(diag.renderMs || 0),
        afterRenderMs: Number(diag.afterRenderMs || 0),
        totalWithAfterRenderMs: Number(diag.totalWithAfterRenderMs || 0),
        list: {
          bounded: list.bounded === true,
          pageSize: Number(list.pageSize || 0),
          page: Number(list.page || 0),
          pageCount: Number(list.pageCount || 0),
          totalRows: Number(list.totalRows || 0),
          filteredRows: Number(list.filteredRows || 0),
          renderedRows: Number(list.renderedRows || 0),
          summaryCacheMs: Number(list.summaryCacheMs || 0),
          summaryAggregateMs: Number(list.summaryAggregateMs || 0),
          rowsBuildMs: Number(list.rowsBuildMs || 0),
          innerHtmlMs: Number(list.innerHtmlMs || 0),
          bindingsMs: Number(list.bindingsMs || 0),
          totalMs: Number(list.totalMs || 0),
          writes: Number(list.writes || 0)
        }
      };
    }, route);
  } catch {}
  result.routeMetrics = result.routeMetrics || [];
  result.routeMetrics.push({ role, route, requiredHydrationWaitMs: requiredMs, renderReadyWaitMs: renderWaitMs, ...metric });
  write();
}
async function waitRouteReady(page, role, route) {
  const requiredMs = await waitRequiredHydration(page, role, route);
  const renderMs = await waitRenderReady(page, role, route);
  await persistRouteMetric(page, role, route, requiredMs, renderMs);
  return requiredMs + renderMs;
}
async function go(page, role, route) {
  const target = route.split('?')[0];
  const requiredMs = await waitRequiredHydration(page, role, target);
  mark(role.toUpperCase() + '_NAVIGATE_' + target.toUpperCase());
  await page.evaluate(value => { location.hash = '#/' + value; }, route);
  const renderMs = await waitRenderReady(page, role, target);
  await persistRouteMetric(page, role, target, requiredMs, renderMs);
  return renderMs;
}`;

source = source.replace(routeReadyPattern, routeReadyReplacement);
source = source.replace(
  "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v1',",
  "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v19-bounded-render-route-aware',"
);
source = source.replace(
  "classification: '',\n  projectId: PROJECT,",
  "classification: '',\n  readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  validatorFinding: '',\n  routeMetrics: [],\n  projectId: PROJECT,"
);

if (!source.includes('VALIDATOR_STALE_RENDER_PROBE_BLOCKED') || !source.includes('await waitRequiredHydration(page, role, target)') || source.indexOf('await waitRequiredHydration(page, role, target)') > source.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'")) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V19_ROUTE_READY_TRANSFORM_NOT_APPLIED');
}

fs.writeFileSync(tempPath, source, 'utf8');
try {
  await import(pathToFileURL(tempPath).href + `?v19=${Date.now()}`);
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
