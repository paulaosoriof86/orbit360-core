#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { chromium } from 'playwright';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const URL = process.env.ORBIT360_LAB_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2#/inicio';
const OUT = process.env.ORBIT360_BROWSER_PRECHECK_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-browser-precheck-sanitized-v20260805.json';
const SHOT = process.env.ORBIT360_BROWSER_PRECHECK_SCREENSHOT || 'orbit360-browser-precheck-failure.png';
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = value => String(value == null ? '' : value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/\b\d{6,}\b/g, '[id]').slice(0, 900);
const result = {
  schemaVersion: 'orbit360-visual-runtime-rootfix-browser-precheck-v3-transactional-owner-aware',
  gateId: 'block2.7-visual-runtime-rootfix-lab-v20260805',
  contractVersion: '2.7.2',
  stage: 'STARTED',
  checkpoint: 'BOOT',
  checkpoints: [],
  projectId: PROJECT,
  tenantId: TENANT,
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};
const mark = (checkpoint, detail = {}) => {
  result.checkpoint = checkpoint;
  result.checkpoints.push({ checkpoint, at: new Date().toISOString(), ...detail });
};
const write = () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
};

function rolesOf(data) {
  return [...(Array.isArray(data.roles) ? data.roles : []), data.activeRole, data.rolActivo, data.role, data.rol]
    .filter(Boolean).map(norm);
}
function active(data) {
  const status = norm(data.status || data.estado);
  return data.active !== false && data.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}
async function browserState(page) {
  try {
    return await page.evaluate(() => {
      const safeStatus = (() => {
        try {
          const status = window.Orbit && Orbit.store && typeof Orbit.store._labStatus === 'function' ? Orbit.store._labStatus() || {} : {};
          return {
            status: status.status || '',
            snapshotAttached: status.snapshotAttached === true,
            snapshotAttachedCount: Number(status.snapshotAttachedCount || 0),
            rawCountKeys: Object.keys(status.rawCounts || {}).sort(),
            snapshotErrorKeys: Object.keys(status.snapshotErrors || {}).sort(),
            visualHydrationContract: status.visualHydrationContract || null
          };
        } catch { return {}; }
      })();
      const membership = (() => {
        try { return Orbit.session && typeof Orbit.session.membershipProjectionStatus === 'function' ? Orbit.session.membershipProjectionStatus() || {} : {}; }
        catch { return {}; }
      })();
      const hydration = (() => {
        try {
          const diagnostics = window.OrbitHydrationContractDiagnostics;
          const state = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status('inicio') : null;
          return {
            loaded: !!(window.Orbit && Orbit.__visualHydrationContractV20260805),
            storeMarker: !!(window.Orbit && Orbit.store && Orbit.store.__visualHydrationContractV20260805),
            mounted: !!(diagnostics && typeof diagnostics.mounted === 'function' && diagnostics.mounted()),
            ownerValid: !!(diagnostics && typeof diagnostics.ownerValid === 'function' && diagnostics.ownerValid()),
            storeOwner: diagnostics && typeof diagnostics.storeOwner === 'function' ? diagnostics.storeOwner() : null,
            ready: !!(state && state.ready === true),
            degraded: !!(state && state.degraded === true),
            requiredMissing: state && state.required ? state.required.missing.slice() : [],
            requiredFailed: state && state.required ? state.required.failed.slice() : [],
            optionalMissing: state && state.optional ? state.optional.missing.slice() : [],
            optionalFailed: state && state.optional ? state.optional.failed.slice() : []
          };
        } catch { return {}; }
      })();
      return {
        href: location.origin + location.pathname + location.search + location.hash,
        authStage: document.body.dataset.authStage || '',
        preAuth: document.body.classList.contains('pre-auth'),
        loginVisible: !!document.querySelector('#login:not(.hidden)'),
        firebaseUser: !!(window.firebase && firebase.auth && firebase.auth().currentUser),
        productUserReady: !!(window.Orbit && Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.__labMembershipProjection === true),
        membershipStatus: membership.status || '',
        membershipReady: membership.ready === true,
        membershipTenantBound: membership.tenantBound === true,
        route: window.Orbit && Orbit.route && Orbit.route.key || '',
        rootfixLoaded: !!(window.Orbit && Orbit.__visualRuntimeRootfixV20260805),
        hydrationContractLoaded: hydration.loaded === true,
        hydrationContractMounted: hydration.mounted === true,
        hydrationOwnerValid: hydration.ownerValid === true,
        hydrationInicioReady: hydration.ready === true,
        hydrationInicioDegraded: hydration.degraded === true,
        hydration,
        runtimeDiagnosticInicio: !!(window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.inicio && OrbitRuntimeDiagnostics.inicio.hydrated === true),
        loadingVisible: !!document.querySelector('.orbit-load-state'),
        hostTextLength: (document.getElementById('host') && document.getElementById('host').innerText || '').trim().length,
        lab: safeStatus
      };
    });
  } catch (error) {
    return { stateError: clean(error && error.message || error) };
  }
}
async function maskAndCapture(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '.tb-user,.fh-contact,.tbl tbody,.mono,.vp-v,input{filter:blur(8px)!important}';
      document.head.appendChild(style);
    });
    await page.screenshot({ path: SHOT, fullPage: true });
    result.failureScreenshot = path.basename(SHOT);
  } catch (error) {
    result.screenshotError = clean(error && error.message || error);
  }
}
async function waitObservable(page, predicate, checkpoint, timeout = 35000) {
  mark(checkpoint + '_WAIT');
  const started = Date.now();
  try {
    await page.waitForFunction(predicate, null, { timeout });
    mark(checkpoint + '_PASS', { elapsedMs: Date.now() - started });
  } catch (error) {
    result.observedState = await browserState(page);
    mark(checkpoint + '_TIMEOUT', { elapsedMs: Date.now() - started });
    throw error;
  }
}

let browser;
try {
  mark('SERVICE_ACCOUNT_VALIDATE');
  const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  if (sa.project_id !== PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT });
  const db = admin.firestore();
  mark('MEMBERSHIP_READ');
  const members = await db.collection('tenants').doc(TENANT).collection('members').get();
  result.firestoreReads += 1;
  const direction = members.docs.map(doc => ({ uid: doc.id, data: doc.data() }))
    .find(row => active(row.data) && rolesOf(row.data).some(role => ['superadmin', 'direccion', 'admintenant'].includes(role)));
  if (!direction) throw new Error('DATA_CONTRACT_FAILURE_NO_ACTIVE_DIRECTION');
  result.membershipHash = sha(direction.uid).slice(0, 16);

  mark('BROWSER_LAUNCH');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(clean(error && error.message || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(clean(message.text())); });

  mark('PAGE_GOTO');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#login-form', { timeout: 30000 });
  mark('LOGIN_FORM_PASS');
  await waitObservable(page, () => !!(window.Orbit && Orbit.__visualRuntimeRootfixV20260805), 'ROOTFIX_MARKER', 20000);
  await waitObservable(page, () => !!(
    window.Orbit && Orbit.__visualHydrationContractV20260805 &&
    Orbit.store && Orbit.store.__visualHydrationContractV20260805 &&
    window.OrbitHydrationContractDiagnostics &&
    typeof OrbitHydrationContractDiagnostics.mounted === 'function' &&
    OrbitHydrationContractDiagnostics.mounted()
  ), 'HYDRATION_CONTRACT_MOUNTED', 30000);
  await waitObservable(page, () => !!(
    window.OrbitHydrationContractDiagnostics &&
    typeof OrbitHydrationContractDiagnostics.ownerValid === 'function' &&
    OrbitHydrationContractDiagnostics.ownerValid()
  ), 'HYDRATION_OWNER_VALID', 10000);
  await waitObservable(page, () => !!(window.firebase && typeof firebase.auth === 'function'), 'FIREBASE_AUTH', 30000);

  mark('CUSTOM_TOKEN_CREATE');
  const token = await admin.auth().createCustomToken(direction.uid);
  mark('CUSTOM_TOKEN_SIGNIN');
  await page.evaluate(async customToken => { await firebase.auth().signInWithCustomToken(customToken); }, token);
  await waitObservable(page, () => !document.body.classList.contains('pre-auth') && document.body.dataset.authStage === 'inside', 'AUTH_INSIDE', 35000);

  mark('REMOVE_EPHEMERAL_OVERLAYS');
  await page.evaluate(() => {
    try { localStorage.setItem('orbit360_confidencialidad', 'accepted'); } catch {}
    Array.from(document.querySelectorAll('body *')).filter(el => /Crea tu contraseña personal/i.test(el.textContent || '') && el.children.length < 8).forEach(el => {
      const overlay = el.closest('.drawer-back,.modal-back,[role="dialog"]') || el.parentElement;
      if (overlay) overlay.remove();
    });
    document.body.style.overflow = '';
  });
  await waitObservable(page, () => {
    try {
      const diagnostics = window.OrbitHydrationContractDiagnostics;
      const state = diagnostics && typeof diagnostics.status === 'function' ? diagnostics.status('inicio') : null;
      return !!(diagnostics && diagnostics.mounted && diagnostics.mounted() && state && state.ready === true);
    } catch { return false; }
  }, 'INICIO_REQUIRED_HYDRATION', 35000);
  await waitObservable(page, () => {
    const route = window.Orbit && Orbit.route && Orbit.route.key;
    const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.inicio;
    const host = document.getElementById('host');
    return route === 'inicio' && !document.querySelector('.orbit-load-state')
      && ((diag && diag.hydrated === true) || (host && (host.innerText || '').trim().length > 60));
  }, 'INICIO_READY', 35000);

  result.observedState = await browserState(page);
  result.consoleErrorCount = consoleErrors.length;
  result.consoleErrors = consoleErrors.slice(0, 10);
  result.stage = 'PASS_VISUAL_BROWSER_PRECHECK';
  result.classification = 'GO_FULL_VISUAL_MATRIX';
  result.ok = true;
  await context.close();
} catch (error) {
  result.stage = 'FAIL_VISUAL_BROWSER_PRECHECK';
  const message = String(error && error.message || error);
  const observed = result.observedState || {};
  const hydrationOwnerLost = observed.membershipReady === true && observed.membershipTenantBound === true && observed.hydrationContractLoaded === true && (
    observed.hydrationOwnerValid === false ||
    observed.hydration?.ownerValid === false ||
    (observed.hydrationContractMounted === true && observed.lab?.status === '' && observed.lab?.snapshotAttached === false && Number(observed.lab?.snapshotAttachedCount || 0) === 0)
  );
  if (result.checkpoint.startsWith('HYDRATION_CONTRACT_MOUNTED') || result.checkpoint.startsWith('HYDRATION_OWNER_VALID') || hydrationOwnerLost) {
    result.classification = 'PIPELINE_MECHANISM_FAILURE';
    result.rootCauseHint = 'HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS';
  } else if (result.checkpoint.startsWith('INICIO_REQUIRED_HYDRATION')) result.classification = 'DATA_CONTRACT_FAILURE';
  else result.classification = result.checkpoint.includes('TIMEOUT') ? 'VALIDATOR_STALE_OR_PRODUCT_WAIT_IDENTIFIED' : (/DATA_CONTRACT/.test(message) ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE');
  result.error = clean(message);
  try {
    if (browser && browser.contexts && browser.contexts()[0]) await maskAndCapture(browser.contexts()[0].pages()[0]);
  } catch {}
  result.ok = false;
} finally {
  if (browser) await browser.close();
  write();
  console.log(JSON.stringify(result, null, 2));
}
process.exit(result.ok ? 0 : 42);
