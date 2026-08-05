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
const VIDEO_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-block12-isolated-routes-'));
const PRIVILEGED = new Set(['direccion', 'superadmin', 'admintenant', 'admin', 'operativo']);
const ROUTES = ['cliente360', 'aseguradoras', 'polizas', 'cobros', 'conciliaciones', 'ops', 'leads', 'importar'];
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const safe = value => text(value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/[A-Za-z0-9_-]{30,}/g, '[id]').replace(/[\r\n]+/g, ' ').slice(0, 400);
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
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
let currentContext;
let currentPage;
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

  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  fs.mkdirSync(DIR, { recursive: true });
  const baseWithoutHash = BASE.replace(/#.*$/, '');
  const separator = baseWithoutHash.includes('?') ? '&' : '?';
  const query = `${separator}orbitBackend=firestore-lab&tenant=${encodeURIComponent(TENANT)}`;

  for (let index = 0; index < ROUTES.length; index += 1) {
    const route = ROUTES[index];
    currentRoute = route;
    const routeErrors = [];
    const routeVideoDir = path.join(VIDEO_DIR, `${String(index + 1).padStart(2, '0')}-${route}`);
    fs.mkdirSync(routeVideoDir, { recursive: true });
    currentContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      recordVideo: { dir: routeVideoDir, size: { width: 1440, height: 1000 } }
    });
    await currentContext.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}';
        document.head.appendChild(style);
      }, { once: true });
    });
    currentPage = await currentContext.newPage();
    currentPage.setDefaultTimeout(20000);
    currentPage.on('pageerror', error => routeErrors.push(safe(error)));
    const video = currentPage.video();
    const bootstrapUrl = `${baseWithoutHash}${query}#/inicio`;
    const routeUrl = `${baseWithoutHash}${query}#/${route}`;
    const token = await auth.createCustomToken(candidate.uid, {
      orbitTenant: TENANT,
      orbitBlock12Visual: true,
      orbitBlock12Route: route
    });

    await currentPage.goto(bootstrapUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await currentPage.waitForFunction(() => window.firebase && firebase.apps && firebase.apps.length && window.Orbit, null, { timeout: 90000 });
    await withTimeout(currentPage.evaluate(async customToken => {
      await firebase.auth().signOut().catch(() => {});
      await firebase.auth().signInWithCustomToken(customToken);
    }, token), 30000, `ROUTE_${route}_AUTH_TIMEOUT`);
    await currentPage.waitForTimeout(900);
    await currentPage.goto(routeUrl, { waitUntil: 'commit', timeout: 90000 });
    await currentPage.waitForTimeout(5000);
    const finalUrl = currentPage.url();
    const directRouteUrlConfirmed = finalUrl.includes(`#/${route}`);
    const signInResolved = true;

    await withTimeout(currentContext.close(), 30000, `ROUTE_${route}_CONTEXT_CLOSE_TIMEOUT`);
    currentContext = null;
    currentPage = null;
    const videoPath = await withTimeout(video.path(), 15000, `ROUTE_${route}_VIDEO_PATH_TIMEOUT`);
    const videoStat = fs.statSync(videoPath);
    if (videoStat.size < 1000) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROUTE_${route}_VIDEO_EMPTY`);
    const framePath = path.join(DIR, `${String(index + 1).padStart(2, '0')}-${route}.png`);
    execFileSync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-sseof', '-0.500',
      '-i', videoPath,
      '-frames:v', '1',
      '-y', framePath
    ], { stdio: 'pipe', timeout: 20000 });
    const png = fs.readFileSync(framePath);
    if (!isPng(png)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROUTE_${route}_VIDEO_FRAME_INVALID_PNG`);

    results.push({
      route,
      isolatedContext: true,
      directRouteUrlConfirmed,
      signInResolved,
      pageErrors: routeErrors,
      frameBytes: png.length,
      videoBytes: videoStat.size,
      screenshot: path.relative(ROOT, framePath),
      captureEngine: 'isolated-context-direct-url-video-plus-ffmpeg-static-frame',
      technicalCopyCheck: 'manual-frame-review-required',
      routeContentCheck: 'manual-frame-review-required'
    });
    pageErrors.push(...routeErrors.map(error => `${route}:${error}`));
  }

  const ok = results.length === ROUTES.length && results.every(item => item.isolatedContext && item.directRouteUrlConfirmed && item.signInResolved && item.frameBytes > 1000 && item.videoBytes > 1000 && item.pageErrors.length === 0) && pageErrors.length === 0;
  save({
    schemaVersion: 'orbit360-block12-cumulative-visual-v6',
    status: ok ? 'CUMULATIVE_VISUAL_LAB_PASS' : 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification: ok ? 'GO_LAB_CUMULATIVE_VISUAL_EVIDENCE_READY' : 'FUNCTIONAL_DEFECT',
    routes: results,
    routeCount: results.length,
    pageErrors,
    navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route',
    inPageHashNavigationUsed: false,
    captureEngine: 'isolated-context-direct-url-video-plus-ffmpeg-static-frame',
    layoutDependentTextReadUsed: false,
    technicalCopyReview: 'manual-frame-review-required-before-final-approval',
    routeContentReview: 'manual-frame-review-required-before-final-approval',
    screenshotApisUsed: false,
    cdpScreenshotUsed: false,
    customTokenEphemeralPerRoute: true,
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
    schemaVersion: 'orbit360-block12-cumulative-visual-v6',
    status: 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification,
    error: safe(message),
    errorCode: (message.split(':')[1] || 'ISOLATED_ROUTE_VISUAL_FAILURE').slice(0, 120),
    currentRoute,
    routes: results,
    routeCount: results.length,
    pageErrors,
    navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route',
    inPageHashNavigationUsed: false,
    captureEngine: 'isolated-context-direct-url-video-plus-ffmpeg-static-frame',
    layoutDependentTextReadUsed: false,
    technicalCopyReview: 'manual-frame-review-required-before-final-approval',
    routeContentReview: 'manual-frame-review-required-before-final-approval',
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
  if (currentPage && !currentPage.isClosed()) await currentPage.close().catch(() => {});
  if (currentContext) await currentContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (app) await deleteApp(app).catch(() => {});
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
}
