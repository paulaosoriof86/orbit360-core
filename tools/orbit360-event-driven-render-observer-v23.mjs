#!/usr/bin/env node
'use strict';

export const V23_RENDER_SIGNAL_VERSION = '20260807.23-event-driven-render-observer-native-api';

const nowMs = () => Date.now();

export async function readRenderState(page, route) {
  try {
    return await page.evaluate(expected => {
      const hydrationOwner = window.OrbitHydrationContractDiagnostics;
      const hydration = hydrationOwner && typeof hydrationOwner.status === 'function' ? hydrationOwner.status(expected) || {} : {};
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected] || {};
      const list = diag.list || {};
      const host = document.getElementById('host');
      const current = window.Orbit && Orbit.route && Orbit.route.key || '';
      const hostTextLength = host && (host.innerText || '').trim().length || 0;
      const authoritative = diag && diag.readinessAuthority === 'OrbitHydrationContractDiagnostics' && diag.requiredReady === true;
      const mounted = !!(hydrationOwner && typeof hydrationOwner.mounted === 'function' && hydrationOwner.mounted());
      const ready = current === expected && mounted && hydration.ready === true && !document.querySelector('.orbit-load-state')
        && (authoritative || hostTextLength > 60);
      return {
        route: current,
        mounted,
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
  } catch (error) {
    return { route: '', mounted: false, hydrationReady: false, loadingVisible: false, hostTextLength: 0, ready: false, metric: { renderMs: 0, afterRenderMs: 0, totalWithAfterRenderMs: 0, list: {} }, readError: String(error && error.message || error) };
  }
}

export async function waitRequiredHydration(page, role, route, hooks = {}, timeoutMs = 35000) {
  const started = nowMs();
  hooks.mark && hooks.mark(`${String(role).toUpperCase()}_ROUTE_${String(route).toUpperCase()}_REQUIRED_HYDRATION_WAIT`);
  try {
    await page.waitForFunction(expected => {
      try {
        const diagnostics = window.OrbitHydrationContractDiagnostics;
        if (!diagnostics || typeof diagnostics.mounted !== 'function' || !diagnostics.mounted() || typeof diagnostics.status !== 'function') return false;
        const state = diagnostics.status(expected) || {};
        const required = state.required || {};
        return state.ready === true
          && Array.isArray(required.missing) && required.missing.length === 0
          && Array.isArray(required.failed) && required.failed.length === 0;
      } catch { return false; }
    }, route, { timeout: timeoutMs });
    const elapsed = nowMs() - started;
    hooks.mark && hooks.mark(`${String(role).toUpperCase()}_ROUTE_${String(route).toUpperCase()}_REQUIRED_HYDRATION_PASS`, { elapsedMs: elapsed });
    return elapsed;
  } catch (error) {
    const state = await readRenderState(page, route);
    hooks.mark && hooks.mark(`${String(role).toUpperCase()}_ROUTE_${String(route).toUpperCase()}_REQUIRED_HYDRATION_TIMEOUT`, { elapsedMs: nowMs() - started, routeObserved: state.route, hydrationReady: state.hydrationReady });
    const wrapped = new Error(`FUNCTIONAL_REQUIRED_HYDRATION_TIMEOUT:${String(error && error.message || error)}`);
    wrapped.orbitClassification = 'FUNCTIONAL_DEFECT';
    wrapped.orbitFinding = 'FUNCTIONAL_REQUIRED_HYDRATION_TIMEOUT';
    throw wrapped;
  }
}

export async function armRenderObserver(page, role, route, hooks = {}) {
  const prefix = `${String(role).toUpperCase()}_ROUTE_${String(route).toUpperCase()}`;
  const token = `${role}:${route}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  hooks.mark && hooks.mark(`${prefix}_RENDER_OBSERVER_ARM_WAIT`);
  const armed = await page.evaluate(({ expected, token, version }) => {
    window.__OrbitV23RenderSignals = window.__OrbitV23RenderSignals || {};
    const old = window.__OrbitV23RenderSignals[expected];
    if (old) {
      try { if (old.observer) old.observer.disconnect(); } catch {}
      try { if (old.onHash) window.removeEventListener('hashchange', old.onHash); } catch {}
    }
    const perfNow = () => (window.performance && typeof performance.now === 'function' ? performance.now() : Date.now());
    const snapshot = () => {
      const hydrationOwner = window.OrbitHydrationContractDiagnostics;
      const hydration = hydrationOwner && typeof hydrationOwner.status === 'function' ? hydrationOwner.status(expected) || {} : {};
      const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected] || {};
      const host = document.getElementById('host');
      const current = window.Orbit && Orbit.route && Orbit.route.key || '';
      const hostTextLength = host && (host.innerText || '').trim().length || 0;
      const authoritative = diag && diag.readinessAuthority === 'OrbitHydrationContractDiagnostics' && diag.requiredReady === true;
      const mounted = !!(hydrationOwner && typeof hydrationOwner.mounted === 'function' && hydrationOwner.mounted());
      return {
        route: current,
        hydrationReady: hydration.ready === true,
        loadingVisible: !!document.querySelector('.orbit-load-state'),
        hostTextLength,
        ready: current === expected && mounted && hydration.ready === true && !document.querySelector('.orbit-load-state') && (authoritative || hostTextLength > 60)
      };
    };
    const state = { version, token, target: expected, armed: true, armedAt: perfNow(), completed: false, completedAt: 0, completionReason: '', mutationSignals: 0, snapshot, observer: null, onHash: null };
    const finish = reason => {
      if (state.completed) return true;
      const current = snapshot();
      state.lastSnapshot = current;
      if (!current.ready) return false;
      state.completed = true;
      state.completedAt = perfNow();
      state.completionReason = reason;
      try { if (state.observer) state.observer.disconnect(); } catch {}
      try { if (state.onHash) window.removeEventListener('hashchange', state.onHash); } catch {}
      try { window.dispatchEvent(new CustomEvent('orbit360:v23-render-complete', { detail: { target: expected, token, version } })); } catch {}
      return true;
    };
    const host = document.getElementById('host') || document.documentElement;
    state.observer = new MutationObserver(() => { state.mutationSignals += 1; finish('mutation'); });
    state.observer.observe(host, { childList: true, subtree: true, characterData: true });
    state.onHash = () => finish('hashchange');
    window.addEventListener('hashchange', state.onHash);
    window.__OrbitV23RenderSignals[expected] = state;
    finish('already-ready');
    return { armed: true, token, version, completed: state.completed, completionReason: state.completionReason };
  }, { expected: route, token, version: V23_RENDER_SIGNAL_VERSION });
  if (!armed || armed.armed !== true || armed.token !== token || armed.version !== V23_RENDER_SIGNAL_VERSION) {
    const error = new Error('PIPELINE_MECHANISM_FAILURE_V23_RENDER_OBSERVER_NOT_ARMED');
    error.orbitClassification = 'PIPELINE_MECHANISM_FAILURE';
    throw error;
  }
  hooks.mark && hooks.mark(`${prefix}_RENDER_OBSERVER_ARM_PASS`, { tokenLength: token.length, alreadyCompleted: !!armed.completed });
  return token;
}

export async function waitRenderEvent(page, role, route, token, requiredMs, hooks = {}, hardTimeoutMs = 35000, channelTimeoutMs = 70000) {
  const prefix = `${String(role).toUpperCase()}_ROUTE_${String(route).toUpperCase()}`;
  const started = nowMs();
  hooks.mark && hooks.mark(`${prefix}_RENDER_EVENT_WAIT`);
  try {
    const eventPromise = page.evaluate(({ expected, token, hardTimeoutMs, version }) => new Promise((resolve, reject) => {
      const state = window.__OrbitV23RenderSignals && window.__OrbitV23RenderSignals[expected];
      if (!state || state.token !== token || state.armed !== true || state.version !== version) {
        reject(new Error('PIPELINE_MECHANISM_FAILURE_V23_RENDER_SIGNAL_STATE_MISSING'));
        return;
      }
      let timer = null;
      const cleanup = () => {
        try { window.removeEventListener('orbit360:v23-render-complete', onComplete); } catch {}
        if (timer) clearTimeout(timer);
      };
      const payload = () => ({
        completed: state.completed === true,
        completionReason: state.completionReason || '',
        observerElapsedMs: Number((state.completedAt || (window.performance && performance.now ? performance.now() : Date.now())) - state.armedAt),
        mutationSignals: Number(state.mutationSignals || 0)
      });
      const done = () => { cleanup(); resolve(payload()); };
      const onComplete = event => {
        const detail = event && event.detail || {};
        if (detail.target === expected && detail.token === token && detail.version === version) done();
      };
      if (state.completed === true) { done(); return; }
      window.addEventListener('orbit360:v23-render-complete', onComplete);
      state.waiterAttached = true;
      timer = setTimeout(() => {
        cleanup();
        const snap = typeof state.snapshot === 'function' ? state.snapshot() : (state.lastSnapshot || {});
        reject(new Error('V23_RENDER_EVENT_TIMEOUT:' + JSON.stringify({ ready: !!snap.ready, route: snap.route || '', hydrationReady: !!snap.hydrationReady, loadingVisible: !!snap.loadingVisible, hostTextLength: Number(snap.hostTextLength || 0) })));
      }, hardTimeoutMs);
    }), { expected: route, token, hardTimeoutMs, version: V23_RENDER_SIGNAL_VERSION });
    const channelTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('V23_RENDER_EVENT_CHANNEL_TIMEOUT')), channelTimeoutMs));
    const completion = await Promise.race([eventPromise, channelTimeout]);
    const waitMs = nowMs() - started;
    const state = await readRenderState(page, route);
    hooks.persistMetric && await hooks.persistMetric({ role, route, requiredHydrationWaitMs: Number(requiredMs || 0), renderObserverWaitMs: waitMs, renderOutcome: 'PASS_RENDER_EVENT', renderSignalVersion: V23_RENDER_SIGNAL_VERSION, completionReason: completion && completion.completionReason || '', observerElapsedMs: Number(completion && completion.observerElapsedMs || 0), mutationSignals: Number(completion && completion.mutationSignals || 0), state });
    hooks.mark && hooks.mark(`${prefix}_RENDER_EVENT_PASS`, { elapsedMs: waitMs, observerElapsedMs: Number(completion && completion.observerElapsedMs || 0), completionReason: completion && completion.completionReason || '' });
    return { waitMs, state, completion };
  } catch (error) {
    const waitMs = nowMs() - started;
    const post = await readRenderState(page, route);
    hooks.persistMetric && await hooks.persistMetric({ role, route, requiredHydrationWaitMs: Number(requiredMs || 0), renderObserverWaitMs: waitMs, renderOutcome: 'STOP_RENDER_EVENT', renderSignalVersion: V23_RENDER_SIGNAL_VERSION, detail: String(error && error.message || error), state: post });
    if (post.route === route && post.ready === true && post.hydrationReady === true && post.loadingVisible === false && post.hostTextLength > 60) {
      const wrapped = new Error(`VALIDATOR_STALE_RENDER_SIGNAL_POST_READY:${String(error && error.message || error)}`);
      wrapped.orbitClassification = 'VALIDATOR_STALE';
      wrapped.orbitFinding = 'VALIDATOR_STALE_RENDER_SIGNAL_POST_READY';
      throw wrapped;
    }
    const wrapped = new Error(`FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY:${String(error && error.message || error)}`);
    wrapped.orbitClassification = 'FUNCTIONAL_DEFECT';
    wrapped.orbitFinding = 'FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY';
    throw wrapped;
  }
}

export async function navigateObserved(page, role, route, hooks = {}) {
  const target = String(route).split('?')[0];
  const requiredMs = await waitRequiredHydration(page, role, target, hooks);
  const token = await armRenderObserver(page, role, target, hooks);
  hooks.mark && hooks.mark(`${String(role).toUpperCase()}_NAVIGATE_${String(target).toUpperCase()}`);
  await page.evaluate(value => { location.hash = '#/' + value; }, route);
  const rendered = await waitRenderEvent(page, role, target, token, requiredMs, hooks);
  return { target, requiredMs, ...rendered };
}
