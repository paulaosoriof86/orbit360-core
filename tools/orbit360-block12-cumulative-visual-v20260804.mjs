#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const BASE = String(process.env.ORBIT360_PREVIEW_URL || '').trim();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-cumulative-visual-sanitized.json');
const DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-cumulative-visual');
const VIDEO_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-block12-video-'));
const PRIVILEGED = new Set(['direccion', 'superadmin', 'admintenant', 'admin', 'operativo']);
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const safe = value => text(value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/[A-Za-z0-9_-]{30,}/g, '[id]').replace(/[\r\n]+/g, ' ').slice(0, 400);
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
const withTimeout = (promise, milliseconds, code) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`PIPELINE_MECHANISM_FAILURE:${code}`)), milliseconds))
]);

let app;
let browser;
let context;
let page;
let video;
let currentRoute = '';
const results = [];
const pageErrors = [];

try {
  if (!BASE || !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('ENVIRONMENT_FAILURE:VISUAL_INPUTS_REQUIRED');
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error('ENVIRONMENT_FAILURE:FFMPEG_STATIC_NOT_RESOLVED');
  execFileSync(ffmpegPath, ['-version'], { stdio: 'ignore', timeout: 10000 });

  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const members = await db.collection('tenants').doc(TENANT).collection('members').get();
  let candidate = null;
  for (const doc of members.docs) {
    const row = doc.data() || {};
    const uid = text(row.uid || row.userId || doc.id);
    const roles = [...new Set([].concat(row.roles || [], row.activeRole, row.rolActivo, row.rol).map(norm).filter(Boolean))];
    const active = row.active !== false && row.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(norm(row.status || row.estado));
    if (!uid || !active || !roles.some(role => PRIVILEGED.has(role))) continue;
    try {
      const user = await auth.getUser(uid);
      if (!user.disabled) {
        candidate = { uid, roles };
        break;
      }
    } catch (error) {}
  }
  if (!candidate) throw new Error('DATA_CONTRACT_FAILURE:PRIVILEGED_VISUAL_IDENTITY_NOT_FOUND');

  const token = await auth.createCustomToken(candidate.uid, { orbitTenant: TENANT, orbitBlock12Visual: true });
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 1000 } }
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  video = page.video();
  const videoStartedAt = Date.now();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', error => pageErrors.push(safe(error)));

  const url = `${BASE.replace(/#.*$/, '')}${BASE.includes('?') ? '&' : '?'}orbitBackend=firestore-lab&tenant=${encodeURIComponent(TENANT)}#/inicio`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.firebase && firebase.apps && firebase.apps.length && window.Orbit, null, { timeout: 90000 });
  await page.evaluate(async customToken => {
    await firebase.auth().signOut().catch(() => {});
    await firebase.auth().signInWithCustomToken(customToken);
  }, token);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
  await page.waitForTimeout(1200);
  fs.mkdirSync(DIR, { recursive: true });

  const routes = ['cliente360', 'aseguradoras', 'polizas', 'cobros', 'conciliaciones', 'ops', 'leads', 'importar'];
  for (const route of routes) {
    currentRoute = route;
    await withTimeout(page.evaluate(value => {
      location.hash = `#/${value}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, route), 20000, `ROUTE_${route}_NAVIGATION_TIMEOUT`);
    await page.waitForTimeout(1000);

    const layoutProbe = await withTimeout(page.evaluate(() => {
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
    }), 8000, `ROUTE_${route}_LAYOUT_FREE_PROBE_TIMEOUT`);

    const frameSecond = Math.max(0.2, (Date.now() - videoStartedAt) / 1000);
    results.push({
      route,
      rendered: layoutProbe.hostPresent && layoutProbe.hostMounted && layoutProbe.hostChildCount > 0,
      authenticated: layoutProbe.authenticated,
      loginVisible: layoutProbe.loginExplicitlyOpen && !layoutProbe.authenticated,
      technicalCopyDetected: false,
      technicalCopyCheck: 'manual-frame-review-required',
      layoutProbe: 'host-firstElementChild-childElementCount-no-layout-text-read',
      frameSecond: Number(frameSecond.toFixed(3)),
      screenshot: path.relative(ROOT, path.join(DIR, `${String(results.length + 1).padStart(2, '0')}-${route}.png`)),
      captureEngine: 'playwright-record-video-plus-ffmpeg-static-frame'
    });
    await page.waitForTimeout(450);
  }

  await page.waitForTimeout(600);
  await withTimeout(context.close(), 30000, 'VIDEO_CONTEXT_CLOSE_TIMEOUT');
  context = null;
  page = null;
  const videoPath = await withTimeout(video.path(), 15000, 'VIDEO_PATH_TIMEOUT');
  const videoStat = fs.statSync(videoPath);
  if (videoStat.size < 1000) throw new Error('PIPELINE_MECHANISM_FAILURE:VISUAL_VIDEO_EMPTY');

  for (const item of results) {
    const file = path.join(ROOT, item.screenshot);
    execFileSync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-ss', item.frameSecond.toFixed(3),
      '-i', videoPath,
      '-frames:v', '1',
      '-y', file
    ], { stdio: 'pipe', timeout: 20000 });
    const png = fs.readFileSync(file);
    if (!isPng(png)) throw new Error(`PIPELINE_MECHANISM_FAILURE:VIDEO_FRAME_${item.route}_INVALID_PNG`);
    item.frameBytes = png.length;
  }

  const ok = results.length === 8 && results.every(item => item.rendered && item.authenticated && !item.loginVisible && item.frameBytes > 1000) && pageErrors.length === 0;
  save({
    schemaVersion: 'orbit360-block12-cumulative-visual-v5',
    status: ok ? 'CUMULATIVE_VISUAL_LAB_PASS' : 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification: ok ? 'GO_LAB_CUMULATIVE_VISUAL_EVIDENCE_READY' : 'FUNCTIONAL_DEFECT',
    routes: results,
    routeCount: results.length,
    pageErrors,
    captureEngine: 'playwright-record-video-plus-ffmpeg-static-frame',
    domProbe: 'layout-free-mount-auth-probe',
    layoutDependentTextReadUsed: false,
    technicalCopyReview: 'manual-frame-review-required-before-final-approval',
    screenshotApisUsed: false,
    cdpScreenshotUsed: false,
    videoBytes: videoStat.size,
    animationsDisabled: true,
    customTokenEphemeral: true,
    authWrites: 0,
    firestoreWrites: 0,
    realTenantWrites: 0,
    hostingPreviewOnly: true,
    productionTouched: false,
    ok
  });
  if (!ok) process.exitCode = 42;
} catch (error) {
  const message = String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 500);
  const classification = ((message.match(/(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE');
  save({
    schemaVersion: 'orbit360-block12-cumulative-visual-v5',
    status: 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification,
    error: safe(message),
    errorCode: (message.split(':')[1] || 'VISUAL_VIDEO_FAILURE').slice(0, 120),
    currentRoute,
    routes: results,
    routeCount: results.length,
    pageErrors,
    captureEngine: 'playwright-record-video-plus-ffmpeg-static-frame',
    domProbe: 'layout-free-mount-auth-probe',
    layoutDependentTextReadUsed: false,
    technicalCopyReview: 'manual-frame-review-required-before-final-approval',
    screenshotApisUsed: false,
    cdpScreenshotUsed: false,
    authWrites: 0,
    firestoreWrites: 0,
    realTenantWrites: 0,
    productionTouched: false,
    ok: false
  });
  process.exitCode = 41;
} finally {
  if (page && !page.isClosed()) await page.close().catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (app) await deleteApp(app).catch(() => {});
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
}
