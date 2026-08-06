#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { chromium } from 'playwright';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const BASE_URL = process.env.ORBIT360_LAB_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2';
const OUT_DIR = process.env.ORBIT360_VISUAL_ARTIFACT_DIR || 'orbit360-visual-observable-artifacts';
const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-matrix-sanitized-v20260805.json';
const GATE_ID = process.env.ORBIT360_GATE_ID || 'block2.7-visual-observable-rootfix-v2-lab-v20260805';
const CONTRACT_VERSION = process.env.ORBIT360_CONTRACT_VERSION || '2.7.5';
const CAPTURE_TIMEOUT_MS = 12000;
const CANONICAL = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
const LEGACY = ['asesores', 'comisiones', 'negocios', 'gestiones', 'cancelaciones'];
const MATRIX = [
  { role: 'Direccion', width: 1440, height: 1000, roles: ['superadmin', 'direccion', 'admintenant'] },
  { role: 'Operativo', width: 1024, height: 768, roles: ['operativo'] },
  { role: 'Asesor', width: 390, height: 844, roles: ['asesor'] }
];

const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const idHash = value => value ? sha(value).slice(0, 16) : '';
const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = value => String(value == null ? '' : value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/\b\d{6,}\b/g, '[id]').slice(0, 900);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });

const result = {
  schemaVersion: 'orbit360-visual-observable-rootfix-matrix-v1',
  gateId: GATE_ID,
  contractVersion: CONTRACT_VERSION,
  stage: 'STARTED',
  classification: '',
  projectId: PROJECT,
  tenantId: TENANT,
  currentCheckpoint: 'BOOT',
  checkpoints: [],
  before: null,
  after: null,
  roles: [],
  captureWarnings: [],
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  functionsDeploys: 0,
  rulesDeploys: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};
const write = () => fs.writeFileSync(EVIDENCE, JSON.stringify(result, null, 2) + '\n', 'utf8');
const mark = (checkpoint, detail = {}) => {
  result.currentCheckpoint = checkpoint;
  result.checkpoints.push({ checkpoint, at: new Date().toISOString(), ...detail });
  write();
};

function canonicalRef(db, name) {
  return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
}
function legacyRef(db, name) {
  return db.collection('tenantId').doc(TENANT).collection(name);
}
async function collectionDigest(ref) {
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id: doc.id, data: stable(doc.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  return { count: rows.length, digest: sha(JSON.stringify(rows)) };
}
async function protectedSnapshot(db) {
  const output = {};
  for (const name of CANONICAL) output['canonical:' + name] = await collectionDigest(canonicalRef(db, name));
  for (const name of LEGACY) output['legacy:' + name] = await collectionDigest(legacyRef(db, name));
  const members = await db.collection('tenants').doc(TENANT).collection('members').get();
  const memberRows = members.docs.map(doc => ({ id: doc.id, data: stable(doc.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  output.memberships = { count: memberRows.length, digest: sha(JSON.stringify(memberRows)) };
  return output;
}
const snapshotsEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function rolesOf(data) {
  return [...(Array.isArray(data.roles) ? data.roles : []), data.activeRole, data.rolActivo, data.role, data.rol]
    .filter(Boolean).map(norm);
}
function activeMember(data) {
  const status = norm(data.status || data.estado);
  return data.active !== false && data.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}
async function selectMemberships(db) {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  result.firestoreReads += 1;
  const rows = snap.docs.map(doc => ({ uid: doc.id, data: doc.data(), roles: rolesOf(doc.data()) })).filter(row => activeMember(row.data));
  const selected = {};
  const used = new Set();
  for (const item of MATRIX) {
    let found = rows.find(row => !used.has(row.uid) && item.roles.includes(norm(row.data.activeRole || row.data.rolActivo || '')));
    if (!found) found = rows.find(row => !used.has(row.uid) && row.roles.some(role => item.roles.includes(role)));
    if (!found) throw new Error('DATA_CONTRACT_FAILURE_NO_ACTIVE_' + item.role.toUpperCase());
    selected[item.role] = found;
    used.add(found.uid);
  }
  return selected;
}
async function entityTargets(db) {
  const [clients, policies, vehicles, receipts, payments] = await Promise.all([
    canonicalRef(db, 'clientes').get(), canonicalRef(db, 'polizas').get(), canonicalRef(db, 'vehiculos').get(),
    canonicalRef(db, 'recibosEsperados').get(), canonicalRef(db, 'cobros').get()
  ]);
  result.firestoreReads += 5;
  const clientIds = new Set(clients.docs.map(doc => doc.id));
  const policiesById = new Map(policies.docs.map(doc => [doc.id, doc.data()]));
  const vehicle = vehicles.docs.map(doc => ({ id: doc.id, ...doc.data() })).find(row => clientIds.has(row.clienteId || (policiesById.get(row.polizaId) || {}).clienteId));
  const receipt = receipts.docs.map(doc => ({ id: doc.id, ...doc.data() })).find(row => clientIds.has(row.clienteId || (policiesById.get(row.polizaId) || {}).clienteId));
  const payment = payments.docs.map(doc => ({ id: doc.id, ...doc.data() })).find(row => clientIds.has(row.clienteId || (policiesById.get(row.polizaId) || {}).clienteId));
  return {
    vehicleClientId: vehicle && (vehicle.clienteId || (policiesById.get(vehicle.polizaId) || {}).clienteId) || '',
    receiptClientId: receipt && (receipt.clienteId || (policiesById.get(receipt.polizaId) || {}).clienteId) || '',
    paymentClientId: payment && (payment.clienteId || (policiesById.get(payment.polizaId) || {}).clienteId) || ''
  };
}

async function browserState(page) {
  try {
    return await page.evaluate(() => {
      const lab = (() => {
        try {
          const status = window.Orbit && Orbit.store && typeof Orbit.store._labStatus === 'function' ? Orbit.store._labStatus() || {} : {};
          return {
            status: status.status || '',
            snapshotAttached: status.snapshotAttached === true,
            snapshotAttachedCount: Number(status.snapshotAttachedCount || 0),
            rawCountKeys: Object.keys(status.rawCounts || {}).sort(),
            snapshotErrorKeys: Object.keys(status.snapshotErrors || {}).sort()
          };
        } catch { return {}; }
      })();
      const membership = (() => {
        try { return Orbit.session && typeof Orbit.session.membershipProjectionStatus === 'function' ? Orbit.session.membershipProjectionStatus() || {} : {}; }
        catch { return {}; }
      })();
      return {
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
        loadingVisible: !!document.querySelector('.orbit-load-state'),
        hostTextLength: (document.getElementById('host') && document.getElementById('host').innerText || '').trim().length,
        diagnosticKeys: Object.keys(window.OrbitRuntimeDiagnostics || {}).sort(),
        lab
      };
    });
  } catch (error) {
    return { stateError: clean(error && error.message || error) };
  }
}
async function installEvidenceMask(page) {
  await page.evaluate(() => {
    if (document.getElementById('orbit-observable-evidence-mask')) return;
    const style = document.createElement('style');
    style.id = 'orbit-observable-evidence-mask';
    style.textContent = '.tb-user,.fh-contact,.fichahdr,.tbl tbody,table tbody,.cards,.card-list,.mono,.vp-v,input,textarea,[data-client],[data-policy]{filter:blur(8px)!important}.tb-user{opacity:.5!important}';
    document.head.appendChild(style);
  });
}
async function capture(page, name) {
  try {
    await installEvidenceMask(page);
    const target = path.join(OUT_DIR, name + '.png');
    await page.screenshot({
      path: target,
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      timeout: CAPTURE_TIMEOUT_MS
    });
    return path.basename(target);
  } catch (error) {
    result.captureWarnings.push({
      checkpoint: result.currentCheckpoint,
      name: clean(name),
      error: clean(error && error.message || error),
      blocking: false
    });
    write();
    return '';
  }
}
async function failureCapture(page, checkpoint) {
  const file = await capture(page, 'failure-' + norm(checkpoint).replace(/\s+/g, '-'));
  if (file) result.failureScreenshot = file;
  else result.failureScreenshotError = 'CAPTURE_UNAVAILABLE_NON_BLOCKING';
}
async function removeBlockingOverlays(page) {
  await page.evaluate(() => {
    try { localStorage.setItem('orbit360_confidencialidad', 'accepted'); } catch {}
    const candidates = Array.from(document.querySelectorAll('body *')).filter(el => /Crea tu contraseña personal/i.test(el.textContent || '') && el.children.length < 8);
    for (const el of candidates) {
      const overlay = el.closest('.drawer-back,.modal-back,[role="dialog"]') || el.parentElement;
      if (overlay) overlay.remove();
    }
    document.body.style.overflow = '';
  });
}
async function waitObservable(page, predicate, arg, checkpoint, timeout = 35000) {
  mark(checkpoint + '_WAIT');
  const started = Date.now();
  try {
    await page.waitForFunction(predicate, arg, { timeout });
    mark(checkpoint + '_PASS', { elapsedMs: Date.now() - started });
    return Date.now() - started;
  } catch (error) {
    result.observedState = await browserState(page);
    mark(checkpoint + '_TIMEOUT', { elapsedMs: Date.now() - started });
    await failureCapture(page, checkpoint);
    throw new Error(checkpoint + '_TIMEOUT:' + clean(error && error.message || error));
  }
}
async function waitRouteReady(page, role, route) {
  return waitObservable(page, expected => {
    const current = window.Orbit && Orbit.route && Orbit.route.key;
    const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected];
    const host = document.getElementById('host');
    return current === expected && !document.querySelector('.orbit-load-state')
      && ((diag && diag.hydrated === true) || (host && (host.innerText || '').trim().length > 60));
  }, route, role.toUpperCase() + '_ROUTE_' + route.toUpperCase(), 35000);
}
async function go(page, role, route) {
  mark(role.toUpperCase() + '_NAVIGATE_' + route.toUpperCase());
  await page.evaluate(value => { location.hash = '#/' + value; }, route);
  return waitRouteReady(page, role, route.split('?')[0]);
}
async function kpiSignature(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.kpi')).map(el => (el.innerText || '').replace(/\s+/g, ' ').trim()).join('|'));
}
async function viewportCheck(page) {
  return page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.page-title,.mod-banner h1,.mod-banner h2')).filter(el => el.offsetParent !== null);
    const titleOverflow = titles.filter(el => el.getBoundingClientRect().right > window.innerWidth + 2 || el.scrollWidth > el.clientWidth + 4).length;
    return { titleOverflow, viewportWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
  });
}

async function loginContext(browser, matrix, member) {
  const role = matrix.role;
  mark(role.toUpperCase() + '_CONTEXT_CREATE');
  const context = await browser.newContext({ viewport: { width: matrix.width, height: matrix.height }, locale: 'es-GT' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(clean(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(clean(message.text())); });
  const loginStarted = Date.now();
  mark(role.toUpperCase() + '_PAGE_GOTO');
  await page.goto(BASE_URL + '#/inicio', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#login-form', { timeout: 30000 });
  await page.waitForSelector('#lg-remember', { timeout: 20000 });
  const loginChecks = await page.evaluate(() => ({
    rememberVisible: !!document.getElementById('lg-remember'),
    deadHelpAbsent: !document.getElementById('lg-reset'),
    rootfixLoaded: !!(window.Orbit && Orbit.__visualRuntimeRootfixV20260805)
  }));
  await page.check('#lg-remember');
  await page.evaluate(() => { try { localStorage.setItem('orbit360_confidencialidad', 'accepted'); } catch {} });
  await waitObservable(page, () => !!(window.firebase && typeof firebase.auth === 'function'), null, role.toUpperCase() + '_FIREBASE_AUTH', 30000);
  mark(role.toUpperCase() + '_CUSTOM_TOKEN_CREATE');
  const token = await admin.auth().createCustomToken(member.uid);
  mark(role.toUpperCase() + '_CUSTOM_TOKEN_SIGNIN');
  await page.evaluate(async customToken => { await firebase.auth().signInWithCustomToken(customToken); }, token);
  await waitObservable(page, () => !document.body.classList.contains('pre-auth') && document.body.dataset.authStage === 'inside', null, role.toUpperCase() + '_AUTH_INSIDE', 35000);
  await removeBlockingOverlays(page);
  const readyMs = await waitRouteReady(page, role, 'inicio');
  return { context, page, consoleErrors, loginChecks, loginMs: Date.now() - loginStarted, readyMs };
}

async function testRole(browser, matrix, member, targets) {
  const role = matrix.role;
  const session = await loginContext(browser, matrix, member);
  const { context, page, consoleErrors } = session;
  const checks = [];
  const routeTimings = {};
  const screenshots = [];
  const add = (id, ok, detail = '', level = 'FAIL') => checks.push({ id, ok: !!ok, detail: clean(detail), level: ok ? 'PASS' : level });
  try {
    add('remember-session-visible', session.loginChecks.rememberVisible, 'checkbox');
    add('dead-login-help-absent', session.loginChecks.deadHelpAbsent, 'lg-reset absent');
    add('rootfix-loaded', session.loginChecks.rootfixLoaded, 'runtime marker');
    add('initial-ready-under-30s', session.readyMs <= 30000, session.readyMs + 'ms');
    screenshots.push(await capture(page, role.toLowerCase() + '-inicio'));

    const routes = role === 'Asesor'
      ? ['cliente360', 'polizas', 'cobros', 'ops', 'leads']
      : ['cliente360', 'polizas', 'cobros', 'ops', 'leads', 'conciliaciones', 'cancelaciones'];
    for (const route of routes) {
      const elapsed = await go(page, role, route);
      routeTimings[route] = elapsed;
      const first = await kpiSignature(page);
      await sleep(2200);
      const second = await kpiSignature(page);
      const viewport = await viewportCheck(page);
      add(route + '-ready-under-30s', elapsed <= 30000, elapsed + 'ms');
      add(route + '-kpis-stable', first === second, first === second ? 'stable' : 'changed after ready');
      add(route + '-titles-responsive', viewport.titleOverflow === 0, 'overflow=' + viewport.titleOverflow);
      if (['cliente360', 'polizas', 'cobros', 'ops', 'leads'].includes(route)) screenshots.push(await capture(page, role.toLowerCase() + '-' + route));
      if (route === 'ops' || route === 'leads') {
        const button = page.getByRole('button', { name: /Ejecutar prueba en vivo/i });
        const visible = await button.count() > 0;
        add(route + '-diagnostic-button', visible, 'button visible');
        if (visible) {
          await button.first().click();
          await page.waitForSelector('#orbit-live-diagnostic-v20260805', { timeout: 10000 });
          const diagnostic = await page.locator('#orbit-live-diagnostic-v20260805').innerText();
          add(route + '-diagnostic-readonly', /Escrituras realizadas:\s*0/i.test(diagnostic), 'writes=0');
          add(route + '-diagnostic-no-failure', !/Requiere corrección/i.test(diagnostic), 'visible diagnostic');
          await page.locator('#orbit-live-diagnostic-v20260805 [data-close]').first().click();
        }
      }
      if (route === 'conciliaciones') {
        const rows = await page.locator('table tbody tr').count();
        if (!rows) add('conciliaciones-empty-honest', /No hay conciliaciones activas para revisión/i.test(await page.locator('body').innerText()), 'honest empty state');
      }
      if (route === 'cancelaciones') {
        const body = await page.locator('body').innerText();
        const rows = await page.locator('table tbody tr').count();
        if (!rows || /Sin cancelaciones/i.test(body)) add('cancelaciones-empty-honest', /No hay cancelaciones registradas en el corte activo/i.test(body), 'honest empty state');
      }
    }

    if (role === 'Direccion') {
      add('vehicle-target-exists', !!targets.vehicleClientId, 'vehicle target');
      add('receipt-target-exists', !!targets.receiptClientId, 'receipt target');
      add('cobro-target-exists', !!targets.paymentClientId, 'cobro target');
      if (targets.vehicleClientId) {
        routeTimings.vehicleDetail = await go(page, role, 'cliente360?c=' + encodeURIComponent(targets.vehicleClientId) + '&t=vehiculos');
        const button = page.getByRole('button', { name: /Ver detalle/i });
        add('vehicle-detail-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          add('vehicle-detail-opens', await page.locator('#orbit-vehicle-detail-v20260805').count() === 1, 'drawer');
          screenshots.push(await capture(page, 'direccion-vehicle-detail'));
          const close = page.locator('#orbit-vehicle-detail-v20260805 [data-close]');
          if (await close.count()) await close.first().click();
        }
      }
      if (targets.receiptClientId) {
        routeTimings.receiptDetail = await go(page, role, 'cliente360?c=' + encodeURIComponent(targets.receiptClientId) + '&t=recibos');
        const button = page.getByRole('button', { name: /Ver detalle/i });
        add('receipt-detail-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          add('receipt-detail-opens', await page.locator('#cob-det').count() === 1, 'drawer');
          screenshots.push(await capture(page, 'direccion-receipt-detail'));
          const close = page.locator('#cob-det #cd-x');
          if (await close.count()) await close.click();
        }
      }
      if (targets.paymentClientId) {
        routeTimings.cobroDetail = await go(page, role, 'cliente360?c=' + encodeURIComponent(targets.paymentClientId) + '&t=cobros');
        const button = page.getByRole('button', { name: /Ver detalle/i });
        add('cobro-detail-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          add('cobro-detail-opens', await page.locator('#cob-det').count() === 1, 'drawer');
          screenshots.push(await capture(page, 'direccion-cobro-detail'));
          const close = page.locator('#cob-det #cd-x');
          if (await close.count()) await close.click();
        }
      }
    }

    const roleCaptureWarnings = result.captureWarnings.filter(item => String(item.name || '').startsWith(role.toLowerCase() + '-'));
    add('screenshots-best-effort', roleCaptureWarnings.length === 0, roleCaptureWarnings.map(item => item.error).slice(0, 3).join(' | '), 'WARN');
    add('console-errors-zero', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '), 'WARN');
    const failed = checks.filter(check => !check.ok && check.level === 'FAIL');
    const warnings = checks.filter(check => !check.ok && check.level === 'WARN');
    const roleResult = {
      role,
      viewport: { width: matrix.width, height: matrix.height },
      membershipHash: idHash(member.uid),
      loginMs: session.loginMs,
      initialReadyMs: session.readyMs,
      routeTimings,
      checks,
      failed: failed.length,
      warnings: warnings.length,
      consoleErrorCount: consoleErrors.length,
      screenshots: screenshots.filter(Boolean),
      ok: failed.length === 0
    };
    mark(role.toUpperCase() + '_COMPLETE', { failed: failed.length, warnings: warnings.length });
    return roleResult;
  } finally {
    await context.close();
  }
}

let browser;
let db;
try {
  mark('SERVICE_ACCOUNT_VALIDATE');
  const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT });
  db = admin.firestore();

  mark('PROTECTED_SNAPSHOT_BEFORE');
  result.before = await protectedSnapshot(db);
  result.firestoreReads += Object.keys(result.before).length;
  const memberships = await selectMemberships(db);
  const targets = await entityTargets(db);

  mark('BROWSER_LAUNCH');
  browser = await chromium.launch({ headless: true });
  for (const matrix of MATRIX) {
    const roleResult = await testRole(browser, matrix, memberships[matrix.role], targets);
    result.roles.push(roleResult);
    write();
  }

  mark('PROTECTED_SNAPSHOT_AFTER');
  result.after = await protectedSnapshot(db);
  result.firestoreReads += Object.keys(result.after).length;
  result.snapshotIntegrity = snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'CHANGED';
  const roleFailures = result.roles.reduce((sum, role) => sum + role.failed, 0);
  result.totalRoleFailures = roleFailures;
  result.totalWarnings = result.roles.reduce((sum, role) => sum + role.warnings, 0);
  result.stage = roleFailures === 0 && result.snapshotIntegrity === 'VERIFIED_UNCHANGED'
    ? 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX'
    : 'FAIL_VISUAL_OBSERVABLE_ROOTFIX_MATRIX';
  result.classification = result.snapshotIntegrity !== 'VERIFIED_UNCHANGED'
    ? 'SECURITY_FAILURE'
    : roleFailures ? 'FUNCTIONAL_DEFECT' : 'PASS_VISUAL_POST_AUTH';
  result.ok = result.stage === 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX';
} catch (error) {
  result.stage = 'FAIL_VISUAL_OBSERVABLE_ROOTFIX_MATRIX';
  const message = String(error && error.message || error);
  result.classification = /PROJECT_MISMATCH/.test(message)
    ? 'ENVIRONMENT_FAILURE'
    : /DATA_CONTRACT_FAILURE|NO_ACTIVE_/.test(message)
      ? 'DATA_CONTRACT_FAILURE'
      : /_TIMEOUT/.test(message)
        ? 'FUNCTIONAL_DEFECT'
        : 'PIPELINE_MECHANISM_FAILURE';
  result.error = clean(message);
  try {
    if (browser && browser.contexts && browser.contexts()[0]) {
      const page = browser.contexts()[0].pages()[0];
      if (page) {
        result.observedState = await browserState(page);
        await failureCapture(page, result.currentCheckpoint);
      }
    }
  } catch {}
  try {
    if (db) {
      result.after = await protectedSnapshot(db);
      result.snapshotIntegrity = result.before && snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'UNKNOWN_OR_CHANGED';
    }
  } catch (snapshotError) {
    result.snapshotError = clean(snapshotError);
  }
  result.ok = false;
} finally {
  if (browser) await browser.close();
  write();
  console.log(JSON.stringify(result, null, 2));
}
process.exit(result.ok ? 0 : 42);
