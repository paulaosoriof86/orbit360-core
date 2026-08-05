#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const BASE = String(process.env.ORBIT360_PREVIEW_URL || '').trim();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-cumulative-visual-sanitized.json');
const DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-cumulative-visual');
const PRIVILEGED = new Set(['direccion', 'superadmin', 'admintenant', 'admin', 'operativo']);
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const safe = value => text(value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/[A-Za-z0-9_-]{30,}/g, '[id]').replace(/[\r\n]+/g, ' ').slice(0, 400);
const save = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8');
};
const withTimeout = (promise, milliseconds, code) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`PIPELINE_MECHANISM_FAILURE:${code}`)), milliseconds))
]);
const isPng = buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

let app;
let browser;
let page;
let cdp;
let currentRoute = '';
const results = [];
const pageErrors = [];

try {
  if (!BASE || !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('ENVIRONMENT_FAILURE:VISUAL_INPUTS_REQUIRED');
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
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
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
    await page.evaluate(value => {
      location.hash = `#/${value}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, route);
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
    });

    const snapshot = await page.evaluate(() => ({
      hostText: String(document.querySelector('#host') && document.querySelector('#host').innerText || '').slice(0, 5000),
      loginVisible: !!(document.querySelector('#login') && getComputedStyle(document.querySelector('#login')).display !== 'none')
    }));
    const forbidden = /firebase|firestore|backend|localstorage|\blab\b|mock|smoke|secret|credencial técnica/i.test(snapshot.hostText);
    const file = path.join(DIR, `${String(results.length + 1).padStart(2, '0')}-${route}.png`);

    const capture = await withTimeout(
      cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
        optimizeForSpeed: true
      }),
      15000,
      `CDP_SCREENSHOT_${route}_TIMEOUT`
    );
    const png = Buffer.from(String(capture && capture.data || ''), 'base64');
    if (!isPng(png)) throw new Error(`PIPELINE_MECHANISM_FAILURE:CDP_SCREENSHOT_${route}_INVALID_PNG`);
    fs.writeFileSync(file, png);

    results.push({
      route,
      rendered: snapshot.hostText.trim().length > 20,
      loginVisible: snapshot.loginVisible,
      technicalCopyDetected: forbidden,
      screenshot: path.relative(ROOT, file),
      captureEngine: 'chromium-cdp'
    });
  }

  const ok = results.every(item => item.rendered && !item.loginVisible && !item.technicalCopyDetected) && pageErrors.length === 0;
  save({
    schemaVersion: 'orbit360-block12-cumulative-visual-v3',
    status: ok ? 'CUMULATIVE_VISUAL_LAB_PASS' : 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification: ok ? 'GO_LAB_CUMULATIVE_VISUAL_CANDIDATE' : 'FUNCTIONAL_DEFECT',
    routes: results,
    routeCount: results.length,
    pageErrors,
    screenshotMode: 'chromium-cdp-viewport-direct',
    animationsDisabled: true,
    playwrightScreenshotUsed: false,
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
  const sanitizedError = safe(error);
  const classification = ((sanitizedError.match(/(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE');
  save({
    schemaVersion: 'orbit360-block12-cumulative-visual-v3',
    status: 'CUMULATIVE_VISUAL_LAB_FAIL',
    classification,
    error: sanitizedError,
    currentRoute,
    routes: results,
    routeCount: results.length,
    pageErrors,
    screenshotMode: 'chromium-cdp-viewport-direct',
    animationsDisabled: true,
    playwrightScreenshotUsed: false,
    authWrites: 0,
    firestoreWrites: 0,
    realTenantWrites: 0,
    productionTouched: false,
    ok: false
  });
  process.exitCode = 41;
} finally {
  if (cdp) await cdp.detach().catch(() => {});
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (app) await deleteApp(app).catch(() => {});
}
