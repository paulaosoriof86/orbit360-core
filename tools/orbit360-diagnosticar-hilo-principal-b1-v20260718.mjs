import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const runtime = String(process.env.ORBIT360_EXPECTED_RUNTIME || '20260717-2');
if (!/^https:\/\//.test(baseUrl)) throw new Error('DIAGNOSTIC_PREVIEW_URL_MISSING');

const outputDir = 'orbit360-platform/runtime-gate-crm-v20260716';
mkdirSync(outputDir, { recursive: true });
const outputFile = `${outputDir}/main-thread-diagnostic-sanitized.json`;
const report = {
  schemaVersion: 'orbit360-main-thread-diagnostic-v1',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  runtimeVersion: runtime,
  variants: []
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function safePath(value) {
  try { return new URL(String(value || '')).pathname.slice(0, 180); }
  catch { return ''; }
}
function safeText(value) {
  return String(value || '')
    .replace(/https?:\/\/[^/\s]+/g, '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 360);
}
async function withTimeout(promise, timeoutMs, fallback) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function summarizeProfile(profile) {
  const byId = new Map((profile && profile.nodes || []).map(node => [node.id, node]));
  const counts = new Map();
  for (const id of profile && profile.samples || []) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, samples]) => {
      const frame = byId.get(id) && byId.get(id).callFrame || {};
      return {
        samples,
        functionName: safeText(frame.functionName || '(anonymous)'),
        path: safePath(frame.url),
        line: Number(frame.lineNumber || 0) + 1,
        column: Number(frame.columnNumber || 0) + 1
      };
    });
}

async function runVariant(browser, name, options) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(60000);
  const result = {
    name,
    debuggerEnabled: Boolean(options.debuggerEnabled),
    observerInstalled: Boolean(options.observerInstalled),
    lifecycle: [],
    navigation: [],
    requestOpenAtProbe: [],
    responseReady: false,
    bodyCount: null,
    probeError: '',
    profileTop: [],
    pausedReason: '',
    pausedFrames: [],
    pausedDocumentState: null
  };

  const openRequests = new Map();
  page.on('request', request => openRequests.set(request.url(), { path: safePath(request.url()), type: request.resourceType() }));
  page.on('requestfinished', request => openRequests.delete(request.url()));
  page.on('requestfailed', request => openRequests.delete(request.url()));
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame() && result.navigation.length < 10) result.navigation.push(safePath(frame.url()));
  });
  page.on('domcontentloaded', () => {
    try {
      const current = new URL(page.url());
      if (result.lifecycle.length < 10) result.lifecycle.push({ event: 'domcontentloaded', path: current.pathname, runtime: current.searchParams.get('runtime') || '' });
    } catch {}
  });
  page.on('load', () => {
    try {
      const current = new URL(page.url());
      if (result.lifecycle.length < 10) result.lifecycle.push({ event: 'load', path: current.pathname, runtime: current.searchParams.get('runtime') || '' });
    } catch {}
  });

  if (options.observerInstalled) {
    await page.exposeBinding('__orbitDiagnosticSignal', () => true);
    await page.addInitScript(() => {
      const state = window.__orbitDiagnosticObserver = { samples: 0 };
      let controlledObserved = false;
      const observeControlledRuntime = () => {
        if (controlledObserved) return;
        const pending = window.__orbitAysKnowledgeRuntimePromise;
        if (!pending) return;
        controlledObserved = true;
        Promise.resolve(pending).then(() => window.__orbitDiagnosticSignal(), () => window.__orbitDiagnosticSignal());
      };
      observeControlledRuntime();
      const controlledTimer = setInterval(observeControlledRuntime, 50);
      const timer = setInterval(() => {
        state.samples += 1;
        document.querySelector('script[data-orbit-client-projection-runtime-v20260716]');
        Boolean(window.Orbit && Orbit.clientProjection);
      }, 50);
      window.addEventListener('beforeunload', () => {
        clearInterval(timer);
        clearInterval(controlledTimer);
      }, { once: true });
    });
  }

  const cdp = await context.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  if (options.debuggerEnabled) {
    await cdp.send('Runtime.enable');
    await cdp.send('Debugger.enable');
    cdp.on('Debugger.scriptParsed', () => {});
    cdp.on('Runtime.exceptionThrown', () => {});
  }
  await cdp.send('Profiler.start');

  try {
    await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const canonicalDeadline = Date.now() + 60000;
    while (Date.now() < canonicalDeadline) {
      const ready = result.lifecycle.some(item => item.event === 'domcontentloaded' && item.path === '/index.html' && item.runtime === runtime);
      if (ready) break;
      await sleep(100);
    }
    await sleep(1500);
    result.requestOpenAtProbe = [...openRequests.values()].slice(0, 20);
    const probe = await withTimeout(
      page.locator('body').count().then(count => ({ completed: true, count })).catch(error => ({ completed: true, count: null, error: safeText(error && error.message) })),
      5000,
      { completed: false, count: null, error: 'LOCATOR_PROBE_TIMEOUT' }
    );
    result.responseReady = Boolean(probe.completed && Number(probe.count) >= 1);
    result.bodyCount = probe.count;
    result.probeError = probe.error || '';

    if (!result.responseReady && options.debuggerEnabled) {
      const pausedPromise = new Promise(resolve => cdp.once('Debugger.paused', resolve));
      await cdp.send('Debugger.pause').catch(() => {});
      const paused = await withTimeout(pausedPromise, 6000, null);
      if (paused) {
        result.pausedReason = safeText(paused.reason);
        result.pausedFrames = (paused.callFrames || []).slice(0, 12).map(frame => ({
          functionName: safeText(frame.functionName || '(anonymous)'),
          path: safePath(frame.url),
          line: Number(frame.location && frame.location.lineNumber || 0) + 1,
          column: Number(frame.location && frame.location.columnNumber || 0) + 1
        }));
        const top = paused.callFrames && paused.callFrames[0];
        if (top) {
          const evaluated = await cdp.send('Debugger.evaluateOnCallFrame', {
            callFrameId: top.callFrameId,
            expression: '({readyState:document.readyState,body:Boolean(document.body),path:location.pathname})',
            returnByValue: true,
            silent: true
          }).catch(() => null);
          const value = evaluated && evaluated.result && evaluated.result.value;
          if (value) result.pausedDocumentState = { readyState: safeText(value.readyState), body: Boolean(value.body), path: safeText(value.path) };
        }
        await cdp.send('Debugger.resume').catch(() => {});
      }
    }
  } catch (error) {
    result.probeError = safeText(error && (error.stack || error.message || error));
  } finally {
    const profile = await cdp.send('Profiler.stop').catch(() => null);
    result.profileTop = summarizeProfile(profile && profile.profile);
    await context.close().catch(() => {});
  }
  return result;
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  report.variants.push(await runVariant(browser, 'bare', { debuggerEnabled: false, observerInstalled: false }));
  report.variants.push(await runVariant(browser, 'cdp-debugger', { debuggerEnabled: true, observerInstalled: false }));
  report.variants.push(await runVariant(browser, 'gate-observer', { debuggerEnabled: true, observerInstalled: true }));
  report.ok = report.variants.every(item => typeof item.responseReady === 'boolean');
} catch (error) {
  report.ok = false;
  report.error = safeText(error && (error.stack || error.message || error));
} finally {
  writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close().catch(() => {});
}

console.log(`ORBIT360_MAIN_THREAD_DIAGNOSTIC:${JSON.stringify({ok:report.ok,variants:report.variants.map(item=>({name:item.name,responseReady:item.responseReady,probeError:item.probeError,top:item.profileTop[0]||null,paused:item.pausedFrames[0]||null}))})}`);
process.exit(report.ok ? 0 : 1);
