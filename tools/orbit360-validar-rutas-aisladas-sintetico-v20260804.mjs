#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-isolated-routes-synthetic.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-isolated-routes-synthetic-'));
const ROUTES = ['cliente360', 'aseguradoras', 'polizas', 'cobros', 'conciliaciones', 'ops', 'leads', 'importar'];
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
let browser;
let context;
let page;
try {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error('ENVIRONMENT_FAILURE:FFMPEG_STATIC_NOT_RESOLVED');
  execFileSync(ffmpegPath, ['-version'], { stdio: 'ignore', timeout: 10000 });
  const source = fs.readFileSync(path.join(ROOT, 'tools/orbit360-block12-cumulative-visual-v20260804.mjs'), 'utf8');
  const forbiddenTokens = ['location.hash =', 'HashChangeEvent(', '.innerText', 'getComputedStyle(', 'Page.captureScreenshot', 'page.screenshot(', 'newCDPSession('];
  const forbiddenPresent = forbiddenTokens.filter(token => source.includes(token));
  const sourceContract = {
    isolatedContextToken: source.includes("navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route'"),
    directUrlToken: source.includes('const routeUrl ='),
    perRouteContextToken: source.includes('currentContext = await browser.newContext'),
    immediateFrameToken: source.includes("'-sseof', '-0.500'"),
    schemaV6: source.includes("schemaVersion: 'orbit360-block12-cumulative-visual-v6'"),
    noForbiddenTokens: forbiddenPresent.length === 0
  };
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  const startedAt = Date.now();
  const routeResults = [];
  for (let index = 0; index < ROUTES.length; index += 1) {
    const route = ROUTES[index];
    const routeDir = path.join(TMP, `${String(index + 1).padStart(2, '0')}-${route}`);
    fs.mkdirSync(routeDir, { recursive: true });
    context = await browser.newContext({
      viewport: { width: 960, height: 640 },
      reducedMotion: 'reduce',
      recordVideo: { dir: routeDir, size: { width: 960, height: 640 } }
    });
    page = await context.newPage();
    const video = page.video();
    const html = `<!doctype html><html><head><style>*{animation:none!important;transition:none!important}body{margin:0;font-family:sans-serif;background:#f4f5f7}.top{height:72px;background:#1e2227;color:white;padding:24px;border-bottom:4px solid #c5162e}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:12px}.row{height:8px;background:white;border:1px solid #ddd}</style></head><body><div class="top">Ruta aislada: ${route}</div><div class="grid" id="host"></div><script>const h=document.getElementById('host');const f=document.createDocumentFragment();for(let i=0;i<20000;i++){const d=document.createElement('div');d.className='row';f.appendChild(d)}h.appendChild(f)</script></body></html>`;
    const directUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}#/${route}`;
    await page.goto(directUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(550);
    const finalUrl = page.url();
    await context.close();
    context = null;
    page = null;
    const videoPath = await video.path();
    const videoStat = fs.statSync(videoPath);
    const framePath = path.join(routeDir, 'frame.png');
    execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-sseof', '-0.250', '-i', videoPath, '-frames:v', '1', '-y', framePath], { stdio: 'pipe', timeout: 15000 });
    const png = fs.readFileSync(framePath);
    routeResults.push({
      route,
      isolatedContext: true,
      directRouteUrlConfirmed: finalUrl.includes(`#/${route}`),
      videoBytes: videoStat.size,
      frameBytes: png.length,
      validPng: isPng(png)
    });
  }
  const elapsedMs = Date.now() - startedAt;
  const ok = Object.values(sourceContract).every(Boolean) && routeResults.length === 8 && routeResults.every(item => item.isolatedContext && item.directRouteUrlConfirmed && item.videoBytes > 1000 && item.frameBytes > 1000 && item.validPng) && elapsedMs < 60000;
  save({
    schemaVersion: 'orbit360-block12-isolated-routes-synthetic-v1',
    status: ok ? 'ISOLATED_ROUTES_SYNTHETIC_PASS' : 'ISOLATED_ROUTES_SYNTHETIC_FAIL',
    classification: ok ? 'GO_PIPELINE_MECHANISM' : 'PIPELINE_MECHANISM_FAILURE',
    routeCount: routeResults.length,
    routes: routeResults,
    elapsedMs,
    sourceContract,
    forbiddenTokens,
    forbiddenPresent,
    navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route',
    inPageHashNavigationUsed: false,
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
  const message = String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 500);
  save({
    schemaVersion: 'orbit360-block12-isolated-routes-synthetic-v1',
    status: 'ISOLATED_ROUTES_SYNTHETIC_FAIL',
    classification: message.startsWith('ENVIRONMENT_FAILURE:') ? 'ENVIRONMENT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE',
    error: message,
    navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route',
    inPageHashNavigationUsed: false,
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
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  fs.rmSync(TMP, { recursive: true, force: true });
}
