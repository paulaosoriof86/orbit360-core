#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const V20_MATRIX_SCHEMA = 'orbit360-visual-observable-rootfix-matrix-v20-native-artifact-gated';
export const V20_VALIDATOR_FINDING = 'VALIDATOR_STALE_RENDER_PROBE_BLOCKED';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_AUDITED_MATRIX_PATH = path.join(here, 'orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');

const routeBlockPattern = /async function waitRouteReady\(page, role, route\) \{[\s\S]*?\n\}\nasync function go\(page, role, route\) \{[\s\S]*?\n\}\n(?=async function kpiSignature)/;
const mainBlockPattern = /\nlet browser;\nlet db;\ntry \{[\s\S]*?\nprocess\.exit\(result\.ok \? 0 : 42\);\s*$/;

const routeBlockReplacement = `async function waitRequiredHydration(page, role, route) {
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
      result.validatorFinding = '${V20_VALIDATOR_FINDING}';
      mark(prefix + '_RENDER_PROBE_BLOCKED', { hostTextLength: post.hostTextLength });
      throw new Error('${V20_VALIDATOR_FINDING}:' + clean(error && error.message || error));
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
}
`;

function count(source, token) {
  return source.split(token).length - 1;
}

export function buildV20MatrixArtifact(auditedPath = DEFAULT_AUDITED_MATRIX_PATH) {
  let source = fs.readFileSync(auditedPath, 'utf8').replace(/^\uFEFF/, '');
  const routeMatch = source.match(routeBlockPattern);
  if (!routeMatch) throw new Error('PIPELINE_MECHANISM_FAILURE_V20_FULL_ROUTE_BLOCK_NOT_FOUND');

  source = source.replace(routeBlockPattern, routeBlockReplacement);
  source = source.replace(
    "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v1',",
    `schemaVersion: '${V20_MATRIX_SCHEMA}',`
  );
  source = source.replace(
    "classification: '',\n  projectId: PROJECT,",
    "classification: '',\n  readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  validatorFinding: '',\n  routeMetrics: [],\n  projectId: PROJECT,"
  );

  const mainMatch = source.match(mainBlockPattern);
  if (!mainMatch) throw new Error('PIPELINE_MECHANISM_FAILURE_V20_MAIN_BLOCK_NOT_FOUND');
  const originalMain = mainMatch[0].trimStart();
  const guardedMain = `\nif (process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1') {\n  result.stage = 'SOURCE_ARTIFACT_IMPORT_VALIDATED';\n  result.classification = 'SOURCE_ARTIFACT_VALIDATED';\n  result.artifactValidationOnly = true;\n  result.ok = true;\n  write();\n  console.log(JSON.stringify({ status: 'PASS_V20_EXACT_MATRIX_ARTIFACT_IMPORT', schemaVersion: result.schemaVersion, ok: true }));\n} else {\n${originalMain}\n}\n`;
  source = source.replace(mainBlockPattern, guardedMain);

  const requiredIdx = source.indexOf('const requiredMs = await waitRequiredHydration(page, role, target);');
  const navigateIdx = source.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'");
  const hashIdx = source.indexOf("location.hash = '#/' + value");
  const renderIdx = source.indexOf('const renderMs = await waitRenderReady(page, role, target);');
  const oldGoBody = "return waitRouteReady(page, role, route.split('?')[0]);";

  if (
    count(source, 'async function go(page, role, route)') !== 1 ||
    source.includes(oldGoBody) ||
    requiredIdx < 0 || navigateIdx < 0 || hashIdx < 0 || renderIdx < 0 ||
    !(requiredIdx < navigateIdx && navigateIdx < hashIdx && hashIdx < renderIdx) ||
    !source.includes(V20_VALIDATOR_FINDING) ||
    !source.includes("process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1'")
  ) {
    throw new Error('PIPELINE_MECHANISM_FAILURE_V20_GENERATED_ARTIFACT_INVARIANT_FAILED');
  }
  return source;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('V20_MATRIX_ARTIFACT_OUTPUT_PATH_REQUIRED');
  const source = buildV20MatrixArtifact(process.argv[3] || DEFAULT_AUDITED_MATRIX_PATH);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), source, 'utf8');
  console.log(JSON.stringify({ status: 'PASS_V20_MATRIX_ARTIFACT_GENERATED', output: path.resolve(out), bytes: Buffer.byteLength(source), ok: true }));
}
