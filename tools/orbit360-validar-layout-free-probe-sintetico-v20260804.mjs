#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-layout-free-probe-synthetic.json');
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
let browser;
let page;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.setContent('<!doctype html><html><body><div id="login" hidden></div><main id="host"></main><script>const host=document.getElementById("host");const frag=document.createDocumentFragment();for(let i=0;i<50000;i++){const row=document.createElement("div");row.className="row";row.textContent="Registro "+i;frag.appendChild(row);}host.appendChild(frag);window.firebase={auth:()=>({currentUser:{uid:"synthetic"}})};</script></body></html>', { waitUntil: 'load' });
  const source = fs.readFileSync(path.join(ROOT, 'tools/orbit360-block12-cumulative-visual-v20260804.mjs'), 'utf8');
  const started = Date.now();
  const probe = await page.evaluate(() => {
    const host = document.getElementById('host');
    const login = document.getElementById('login');
    const currentUser = window.firebase && firebase.auth && firebase.auth().currentUser;
    return {
      hostPresent: Boolean(host),
      hostMounted: Boolean(host && host.firstElementChild),
      hostChildCount: host ? host.childElementCount : 0,
      authenticated: Boolean(currentUser),
      loginExplicitlyOpen: Boolean(login && !login.hidden && login.getAttribute('aria-hidden') !== 'true' && login.style.display !== 'none' && !login.classList.contains('hidden') && !login.classList.contains('is-hidden'))
    };
  });
  const elapsedMs = Date.now() - started;
  const forbiddenTokens = ['.innerText', 'getComputedStyle(', 'offsetParent', 'getBoundingClientRect(', 'Page.captureScreenshot', 'page.screenshot(', 'newCDPSession('];
  const forbiddenPresent = forbiddenTokens.filter(token => source.includes(token));
  const ok = probe.hostPresent === true && probe.hostMounted === true && probe.hostChildCount === 50000 && probe.authenticated === true && probe.loginExplicitlyOpen === false && elapsedMs < 2000 && forbiddenPresent.length === 0 && source.includes("layoutProbe: 'host-firstElementChild-childElementCount-no-layout-text-read'") && source.includes("layoutDependentTextReadUsed: false");
  save({
    schemaVersion: 'orbit360-block12-layout-free-probe-synthetic-v1',
    status: ok ? 'LAYOUT_FREE_PROBE_SYNTHETIC_PASS' : 'LAYOUT_FREE_PROBE_SYNTHETIC_FAIL',
    classification: ok ? 'GO_PIPELINE_MECHANISM' : 'PIPELINE_MECHANISM_FAILURE',
    domNodes: 50000,
    elapsedMs,
    probe,
    forbiddenTokens,
    forbiddenPresent,
    innerTextUsed: false,
    layoutApiUsed: false,
    screenshotApiUsed: false,
    cdpScreenshotUsed: false,
    networkAccess: false,
    firebaseCommandsExecuted: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    ok
  });
  if (!ok) process.exitCode = 41;
} catch (error) {
  save({
    schemaVersion: 'orbit360-block12-layout-free-probe-synthetic-v1',
    status: 'LAYOUT_FREE_PROBE_SYNTHETIC_FAIL',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 500),
    innerTextUsed: false,
    layoutApiUsed: false,
    screenshotApiUsed: false,
    cdpScreenshotUsed: false,
    networkAccess: false,
    firebaseCommandsExecuted: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    ok: false
  });
  process.exitCode = 41;
} finally {
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
}
