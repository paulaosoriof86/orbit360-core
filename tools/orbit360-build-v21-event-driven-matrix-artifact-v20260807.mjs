#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const V21_MATRIX_SCHEMA = 'orbit360-visual-observable-rootfix-matrix-v21-event-driven-render-gated';
export const V21_VALIDATOR_FINDING = 'VALIDATOR_STALE_RENDER_SIGNAL_POST_READY';
export const V21_FUNCTIONAL_FINDING = 'FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY';
export const V21_SIGNAL_VERSION = '20260807.21-event-driven-render-observer';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_AUDITED_MATRIX_PATH = path.join(here, 'orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');

const routeBlockPattern = /async function waitRouteReady\(page, role, route\) \{[\s\S]*?\n\}\nasync function go\(page, role, route\) \{[\s\S]*?\n\}\n(?=async function kpiSignature)/;
const mainBlockPattern = /\nlet browser;\nlet db;\ntry \{[\s\S]*?\nprocess\.exit\(result\.ok \? 0 : 42\);\s*$/;
const originalOuterClassifier = `  result.classification = /PROJECT_MISMATCH/.test(message)\n    ? 'ENVIRONMENT_FAILURE'\n    : /DATA_CONTRACT_FAILURE|NO_ACTIVE_/.test(message)\n      ? 'DATA_CONTRACT_FAILURE'\n      : /_TIMEOUT/.test(message)\n        ? 'FUNCTIONAL_DEFECT'\n        : 'PIPELINE_MECHANISM_FAILURE';`;
const preservedOuterClassifier = `  if (!result.classification) {\n    result.classification = /PROJECT_MISMATCH/.test(message)\n      ? 'ENVIRONMENT_FAILURE'\n      : /DATA_CONTRACT_FAILURE|NO_ACTIVE_/.test(message)\n        ? 'DATA_CONTRACT_FAILURE'\n        : /_TIMEOUT|FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY/.test(message)\n          ? 'FUNCTIONAL_DEFECT'\n          : 'PIPELINE_MECHANISM_FAILURE';\n  }`;

const routeBlockReplacement = `function v21MetricFromDiagnostic(diag) {
  const source = diag || {};
  const list = source.list || {};
  return {
    renderMs: Number(source.renderMs || 0),
    afterRenderMs: Number(source.afterRenderMs || 0),
    totalWithAfterRenderMs: Number(source.totalWithAfterRenderMs || 0),
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
}
async function readV21RenderState(page, route) {
  try {
    return await page.evaluate(expected => {
      const diagnostics = window.OrbitHydrationContractDiagnostics;
      const hydration = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status(expected) || {} : {};
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected] || {};
      const list = diag.list || {};
      const host = document.getElementById('host');
      const current = window.Orbit && Orbit.route && Orbit.route.key || '';
      const hostTextLength = host && (host.innerText || '').trim().length || 0;
      const authoritative = diag && diag.readinessAuthority === 'OrbitHydrationContractDiagnostics' && diag.requiredReady === true;
      const ready = current === expected
        && diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()
        && hydration.ready === true
        && !document.querySelector('.orbit-load-state')
        && (authoritative || hostTextLength > 60);
      return {
        route: current,
        hydrationReady: hydration.ready === true,
        loadingVisible: !!document.querySelector('.orbit-load-state'),
        hostTextLength,
        ready,
        metric: {
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
        }
      };
    }, route);
  } catch {
    return { route: '', hydrationReady: false, loadingVisible: false, hostTextLength: 0, ready: false, metric: v21MetricFromDiagnostic({}) };
  }
}
async function persistV21RouteMetric(role, route, requiredMs, observerWaitMs, state, outcome, detail) {
  const metric = state && state.metric ? state.metric : v21MetricFromDiagnostic({});
  result.routeMetrics = result.routeMetrics || [];
  result.routeMetrics.push({
    role,
    route,
    requiredHydrationWaitMs: Number(requiredMs || 0),
    renderReadyWaitMs: Number(observerWaitMs || 0),
    renderObserverWaitMs: Number(observerWaitMs || 0),
    renderOutcome: outcome || '',
    renderSignalVersion: '${V21_SIGNAL_VERSION}',
    routeObserved: state && state.route || '',
    hydrationReadyObserved: !!(state && state.hydrationReady),
    loadingVisibleObserved: !!(state && state.loadingVisible),
    hostTextLength: Number(state && state.hostTextLength || 0),
    renderMs: Number(metric.renderMs || 0),
    afterRenderMs: Number(metric.afterRenderMs || 0),
    totalWithAfterRenderMs: Number(metric.totalWithAfterRenderMs || 0),
    list: metric.list || v21MetricFromDiagnostic({}).list,
    detail: clean(detail || '')
  });
  write();
}
async function waitRequiredHydration(page, role, route) {
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
async function armV21RenderObserver(page, role, route) {
  const prefix = role.toUpperCase() + '_ROUTE_' + route.toUpperCase();
  const token = role + ':' + route + ':' + Date.now() + ':' + Math.random().toString(16).slice(2);
  mark(prefix + '_RENDER_OBSERVER_ARM_WAIT');
  const armed = await page.evaluate(({ expected, token, version }) => {
    window.__OrbitV21RenderSignals = window.__OrbitV21RenderSignals || {};
    const old = window.__OrbitV21RenderSignals[expected];
    if (old) {
      try { if (old.observer) old.observer.disconnect(); } catch {}
      try { if (old.onHash) window.removeEventListener('hashchange', old.onHash); } catch {}
    }
    const now = () => (window.performance && typeof performance.now === 'function' ? performance.now() : Date.now());
    const snapshot = () => {
      const diagnostics = window.OrbitHydrationContractDiagnostics;
      const hydration = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status(expected) || {} : {};
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected] || {};
      const list = diag.list || {};
      const host = document.getElementById('host');
      const current = window.Orbit && Orbit.route && Orbit.route.key || '';
      const hostTextLength = host && (host.innerText || '').trim().length || 0;
      const authoritative = diag && diag.readinessAuthority === 'OrbitHydrationContractDiagnostics' && diag.requiredReady === true;
      const ready = current === expected
        && diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()
        && hydration.ready === true
        && !document.querySelector('.orbit-load-state')
        && (authoritative || hostTextLength > 60);
      return {
        route: current,
        hydrationReady: hydration.ready === true,
        loadingVisible: !!document.querySelector('.orbit-load-state'),
        hostTextLength,
        ready,
        metric: {
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
        }
      };
    };
    const state = {
      version,
      token,
      target: expected,
      armed: true,
      armedAt: now(),
      completed: false,
      completedAt: 0,
      completionReason: '',
      mutationSignals: 0,
      snapshot,
      observer: null,
      onHash: null
    };
    const finish = reason => {
      if (state.completed) return true;
      const current = snapshot();
      state.lastSnapshot = current;
      if (!current.ready) return false;
      state.completed = true;
      state.completedAt = now();
      state.completionReason = reason;
      try { if (state.observer) state.observer.disconnect(); } catch {}
      try { if (state.onHash) window.removeEventListener('hashchange', state.onHash); } catch {}
      try { window.dispatchEvent(new CustomEvent('orbit360:v21-render-complete', { detail: { target: expected, token, version } })); } catch {}
      return true;
    };
    const host = document.getElementById('host') || document.documentElement;
    state.observer = new MutationObserver(() => {
      state.mutationSignals += 1;
      finish('mutation');
    });
    state.observer.observe(host, { childList: true, subtree: true, characterData: true });
    state.onHash = () => finish('hashchange');
    window.addEventListener('hashchange', state.onHash);
    window.__OrbitV21RenderSignals[expected] = state;
    finish('already-ready');
    return { armed: true, token, version, completed: state.completed, completionReason: state.completionReason };
  }, { expected: route, token, version: '${V21_SIGNAL_VERSION}' });
  if (!armed || armed.armed !== true || armed.token !== token) throw new Error('PIPELINE_MECHANISM_FAILURE_V21_RENDER_OBSERVER_NOT_ARMED');
  mark(prefix + '_RENDER_OBSERVER_ARM_PASS', { tokenHash: token.length, alreadyCompleted: !!armed.completed });
  return token;
}
async function waitV21RenderEvent(page, role, route, token, requiredMs) {
  const prefix = role.toUpperCase() + '_ROUTE_' + route.toUpperCase();
  const startedAt = Date.now();
  mark(prefix + '_RENDER_EVENT_WAIT');
  try {
    const eventPromise = page.evaluate(({ expected, token, hardTimeoutMs, version }) => new Promise((resolve, reject) => {
      const bucket = window.__OrbitV21RenderSignals || {};
      const state = bucket[expected];
      if (!state || state.token !== token || state.armed !== true || state.version !== version) {
        reject(new Error('PIPELINE_MECHANISM_FAILURE_V21_RENDER_SIGNAL_STATE_MISSING'));
        return;
      }
      let timer = null;
      const cleanup = () => {
        try { window.removeEventListener('orbit360:v21-render-complete', onComplete); } catch {}
        if (timer) clearTimeout(timer);
      };
      const payload = () => {
        const snap = typeof state.snapshot === 'function' ? state.snapshot() : (state.lastSnapshot || {});
        return {
          completed: state.completed === true,
          completionReason: state.completionReason || '',
          observerElapsedMs: Number((state.completedAt || (window.performance && performance.now ? performance.now() : Date.now())) - state.armedAt),
          mutationSignals: Number(state.mutationSignals || 0),
          snapshot: snap
        };
      };
      const done = () => { cleanup(); resolve(payload()); };
      const onComplete = event => {
        const detail = event && event.detail || {};
        if (detail.target === expected && detail.token === token && detail.version === version) done();
      };
      if (state.completed === true) { done(); return; }
      window.addEventListener('orbit360:v21-render-complete', onComplete);
      state.waiterAttached = true;
      timer = setTimeout(() => {
        cleanup();
        const snap = typeof state.snapshot === 'function' ? state.snapshot() : (state.lastSnapshot || {});
        reject(new Error('V21_RENDER_EVENT_TIMEOUT:' + JSON.stringify({ ready: !!snap.ready, route: snap.route || '', hydrationReady: !!snap.hydrationReady, loadingVisible: !!snap.loadingVisible, hostTextLength: Number(snap.hostTextLength || 0) })));
      }, hardTimeoutMs);
    }), { expected: route, token, hardTimeoutMs: 35000, version: '${V21_SIGNAL_VERSION}' });
    const channelTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('V21_RENDER_EVENT_CHANNEL_TIMEOUT')), 70000));
    const completion = await Promise.race([eventPromise, channelTimeout]);
    const waitMs = Date.now() - startedAt;
    const state = completion && completion.snapshot || await readV21RenderState(page, route);
    await persistV21RouteMetric(role, route, requiredMs, waitMs, state, 'PASS_RENDER_EVENT', completion && completion.completionReason || 'event');
    mark(prefix + '_RENDER_EVENT_PASS', { elapsedMs: waitMs, observerElapsedMs: Number(completion && completion.observerElapsedMs || 0), completionReason: completion && completion.completionReason || '', renderMs: Number(state && state.metric && state.metric.renderMs || 0) });
    mark(prefix + '_RENDER_READY_PASS', { elapsedMs: waitMs, renderSignal: 'event-driven' });
    return waitMs;
  } catch (error) {
    const waitMs = Date.now() - startedAt;
    const post = await readV21RenderState(page, route);
    await persistV21RouteMetric(role, route, requiredMs, waitMs, post, 'STOP_RENDER_EVENT', error && error.message || error);
    if (post.route === route && post.ready === true && post.hydrationReady === true && post.loadingVisible === false && post.hostTextLength > 60) {
      result.classification = 'VALIDATOR_STALE';
      result.validatorFinding = '${V21_VALIDATOR_FINDING}';
      result.specializedClassification = true;
      mark(prefix + '_RENDER_SIGNAL_POST_READY', { elapsedMs: waitMs, hostTextLength: post.hostTextLength, renderMs: Number(post.metric && post.metric.renderMs || 0) });
      throw new Error('${V21_VALIDATOR_FINDING}:' + clean(error && error.message || error));
    }
    result.classification = 'FUNCTIONAL_DEFECT';
    result.validatorFinding = '${V21_FUNCTIONAL_FINDING}';
    result.specializedClassification = true;
    mark(prefix + '_RENDER_SIGNAL_NOT_READY', { elapsedMs: waitMs, route: post.route || '', hydrationReady: !!post.hydrationReady, loadingVisible: !!post.loadingVisible, hostTextLength: Number(post.hostTextLength || 0) });
    throw new Error('${V21_FUNCTIONAL_FINDING}:' + clean(error && error.message || error));
  }
}
async function waitRouteReady(page, role, route) {
  const requiredMs = await waitRequiredHydration(page, role, route);
  const token = await armV21RenderObserver(page, role, route);
  const renderMs = await waitV21RenderEvent(page, role, route, token, requiredMs);
  return requiredMs + renderMs;
}
async function go(page, role, route) {
  const target = route.split('?')[0];
  const requiredMs = await waitRequiredHydration(page, role, target);
  const token = await armV21RenderObserver(page, role, target);
  mark(role.toUpperCase() + '_NAVIGATE_' + target.toUpperCase());
  await page.evaluate(value => { location.hash = '#/' + value; }, route);
  const renderMs = await waitV21RenderEvent(page, role, target, token, requiredMs);
  return renderMs;
}
`;

function count(source, token) {
  return source.split(token).length - 1;
}

export function buildV21MatrixArtifact(auditedPath = DEFAULT_AUDITED_MATRIX_PATH) {
  let source = fs.readFileSync(auditedPath, 'utf8').replace(/^\uFEFF/, '');
  const routeMatch = source.match(routeBlockPattern);
  if (!routeMatch) throw new Error('PIPELINE_MECHANISM_FAILURE_V21_FULL_ROUTE_BLOCK_NOT_FOUND');
  if (!source.includes(originalOuterClassifier)) throw new Error('PIPELINE_MECHANISM_FAILURE_V21_OUTER_CLASSIFIER_BLOCK_NOT_FOUND');

  source = source.replace(routeBlockPattern, routeBlockReplacement);
  source = source.replace(
    "schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v1',",
    `schemaVersion: '${V21_MATRIX_SCHEMA}',`
  );
  source = source.replace(
    "classification: '',\n  projectId: PROJECT,",
    "classification: '',\n  specializedClassification: false,\n  readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  validatorFinding: '',\n  routeMetrics: [],\n  renderSignalVersion: '${V21_SIGNAL_VERSION}',\n  projectId: PROJECT,"
  );
  source = source.replace(originalOuterClassifier, preservedOuterClassifier);

  const mainMatch = source.match(mainBlockPattern);
  if (!mainMatch) throw new Error('PIPELINE_MECHANISM_FAILURE_V21_MAIN_BLOCK_NOT_FOUND');
  const originalMain = mainMatch[0].trimStart();
  const guardedMain = `\nif (process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1') {\n  result.stage = 'SOURCE_ARTIFACT_IMPORT_VALIDATED';\n  result.classification = 'SOURCE_ARTIFACT_VALIDATED';\n  result.artifactValidationOnly = true;\n  result.ok = true;\n  write();\n  console.log(JSON.stringify({ status: 'PASS_V21_EXACT_MATRIX_ARTIFACT_IMPORT', schemaVersion: result.schemaVersion, ok: true }));\n} else {\n${originalMain}\n}\n`;
  source = source.replace(mainBlockPattern, guardedMain);

  const requiredIdx = source.indexOf('const requiredMs = await waitRequiredHydration(page, role, target);');
  const armIdx = source.indexOf('const token = await armV21RenderObserver(page, role, target);');
  const navigateIdx = source.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'");
  const hashIdx = source.indexOf("location.hash = '#/' + value");
  const eventIdx = source.indexOf('const renderMs = await waitV21RenderEvent(page, role, target, token, requiredMs);');
  const oldGoBody = "return waitRouteReady(page, role, route.split('?')[0]);";

  if (
    count(source, 'async function go(page, role, route)') !== 1 ||
    source.includes(oldGoBody) ||
    requiredIdx < 0 || armIdx < 0 || navigateIdx < 0 || hashIdx < 0 || eventIdx < 0 ||
    !(requiredIdx < armIdx && armIdx < navigateIdx && navigateIdx < hashIdx && hashIdx < eventIdx) ||
    !source.includes("new MutationObserver") ||
    !source.includes("orbit360:v21-render-complete") ||
    !source.includes("Promise.race([eventPromise, channelTimeout])") ||
    source.includes('const renderMs = await waitRenderReady(page, role, target);') ||
    !source.includes("if (!result.classification)") ||
    !source.includes(V21_VALIDATOR_FINDING) ||
    !source.includes(V21_FUNCTIONAL_FINDING) ||
    !source.includes("renderOutcome: outcome || ''") ||
    !source.includes("process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1'")
  ) {
    throw new Error('PIPELINE_MECHANISM_FAILURE_V21_GENERATED_ARTIFACT_INVARIANT_FAILED');
  }
  return source;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('V21_MATRIX_ARTIFACT_OUTPUT_PATH_REQUIRED');
  const source = buildV21MatrixArtifact(process.argv[3] || DEFAULT_AUDITED_MATRIX_PATH);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), source, 'utf8');
  console.log(JSON.stringify({ status: 'PASS_V21_MATRIX_ARTIFACT_GENERATED', output: path.resolve(out), bytes: Buffer.byteLength(source), ok: true }));
}
