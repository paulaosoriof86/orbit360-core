#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-cdp-screenshot-synthetic.json');
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
const withTimeout = (promise, milliseconds, code) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(code)), milliseconds))
]);
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
let browser;
let page;
let cdp;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><head><style>*{animation:none!important;transition:none!important}body{margin:0;font-family:sans-serif;background:#f4f5f7}.top{height:72px;background:#1e2227;color:white;display:flex;align-items:center;padding:0 24px;border-bottom:4px solid #c5162e}.card{margin:28px;padding:28px;background:white;border-radius:12px}</style></head><body><div class="top">Orbit 360 · prueba sintética CDP</div><div class="card"><h1>Captura determinista</h1><p>Sin red, sin Firebase y sin datos.</p></div></body></html>', { waitUntil: 'load' });
  cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const capture = await withTimeout(cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
    optimizeForSpeed: true
  }), 10000, 'CDP_SYNTHETIC_TIMEOUT');
  const png = Buffer.from(String(capture && capture.data || ''), 'base64');
  if (!isPng(png)) throw new Error('CDP_SYNTHETIC_INVALID_PNG');
  save({
    schemaVersion: 'orbit360-block12-cdp-screenshot-synthetic-v1',
    status: 'CDP_SCREENSHOT_SYNTHETIC_PASS',
    classification: 'GO_PIPELINE_MECHANISM',
    captureEngine: 'chromium-cdp',
    captureBeyondViewport: false,
    bytes: png.length,
    networkAccess: false,
    firebaseCommandsExecuted: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    ok: true
  });
} catch (error) {
  save({
    schemaVersion: 'orbit360-block12-cdp-screenshot-synthetic-v1',
    status: 'CDP_SCREENSHOT_SYNTHETIC_FAIL',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 500),
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
  if (cdp) await cdp.detach().catch(() => {});
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
}
