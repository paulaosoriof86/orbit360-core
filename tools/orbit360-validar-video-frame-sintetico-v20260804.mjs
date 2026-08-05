#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-video-frame-synthetic.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-video-frame-'));
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
let browser;
let context;
let page;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore', timeout: 10000 });
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 960, height: 640 },
    recordVideo: { dir: TMP, size: { width: 960, height: 640 } }
  });
  page = await context.newPage();
  const video = page.video();
  const startedAt = Date.now();
  await page.setContent('<!doctype html><html><head><style>*{animation:none!important;transition:none!important}body{margin:0;font-family:sans-serif;background:#f4f5f7}.top{height:72px;background:#1e2227;color:white;display:flex;align-items:center;padding:0 24px;border-bottom:4px solid #c5162e}.card{margin:28px;padding:28px;background:white;border-radius:12px}</style></head><body><div class="top">Orbit 360 · prueba sintética de video</div><div class="card"><h1>Fotograma determinista</h1><p>Sin red, Firebase ni datos.</p></div></body></html>', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const frameSecond = Math.max(0.2, (Date.now() - startedAt) / 1000 - 0.25);
  await page.close();
  await context.close();
  context = null;
  const videoPath = await video.path();
  const stat = fs.statSync(videoPath);
  if (stat.size < 1000) throw new Error('VIDEO_SYNTHETIC_EMPTY');
  const framePath = path.join(TMP, 'frame.png');
  execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-ss', frameSecond.toFixed(3), '-i', videoPath, '-frames:v','1','-y', framePath], { stdio: 'pipe', timeout: 15000 });
  const png = fs.readFileSync(framePath);
  if (!isPng(png)) throw new Error('VIDEO_FRAME_SYNTHETIC_INVALID_PNG');
  save({
    schemaVersion: 'orbit360-block12-video-frame-synthetic-v1',
    status: 'VIDEO_FRAME_SYNTHETIC_PASS',
    classification: 'GO_PIPELINE_MECHANISM',
    captureEngine: 'playwright-record-video-plus-ffmpeg-frame',
    videoBytes: stat.size,
    frameBytes: png.length,
    frameSecond: Number(frameSecond.toFixed(3)),
    screenshotApiUsed: false,
    cdpScreenshotUsed: false,
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
    schemaVersion: 'orbit360-block12-video-frame-synthetic-v1',
    status: 'VIDEO_FRAME_SYNTHETIC_FAIL',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 500),
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
  if (page && !page.isClosed()) await page.close().catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  fs.rmSync(TMP, { recursive: true, force: true });
}
