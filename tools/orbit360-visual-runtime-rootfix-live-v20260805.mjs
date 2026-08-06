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
const OUT_DIR = process.env.ORBIT360_VISUAL_ARTIFACT_DIR || 'orbit360-visual-rootfix-artifacts';
const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-live-sanitized-v20260805.json';
const CANONICAL = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
const LEGACY = ['asesores', 'comisiones', 'negocios', 'gestiones', 'cancelaciones'];
const MATRIX = [
  { key: 'Direccion', width: 1440, height: 1000, roles: ['superadmin', 'direccion', 'admintenant'] },
  { key: 'Operativo', width: 1024, height: 768, roles: ['operativo'] },
  { key: 'Asesor', width: 390, height: 844, roles: ['asesor'] }
];

const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
};
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleanError = error => String(error && error.message || error).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/\b\d{6,}\b/g, '[id]').slice(0, 900);
const idHash = value => value ? sha(value).slice(0, 16) : '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });

const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
if (sa.project_id !== PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT });
const db = admin.firestore();

function canonicalRef(name) {
  return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
}
function legacyRef(name) {
  return db.collection('tenantId').doc(TENANT).collection(name);
}
async function collectionDigest(ref) {
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id: doc.id, data: stable(doc.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  return { count: rows.length, digest: sha(JSON.stringify(rows)) };
}
async function protectedSnapshot() {
  const output = {};
  for (const name of CANONICAL) output['canonical:' + name] = await collectionDigest(canonicalRef(name));
  for (const name of LEGACY) output['legacy:' + name] = await collectionDigest(legacyRef(name));
  const members = await db.collection('tenants').doc(TENANT).collection('members').get();
  const memberRows = members.docs.map(doc => ({ id: doc.id, data: stable(doc.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  output.memberships = { count: memberRows.length, digest: sha(JSON.stringify(memberRows)) };
  return output;
}
function snapshotsEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function rolesOf(data) {
  return [...(Array.isArray(data.roles) ? data.roles : []), data.activeRole, data.rolActivo, data.role, data.rol].filter(Boolean).map(norm);
}
function activeMember(data) {
  const status = norm(data.status || data.estado);
  return data.active !== false && data.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}
async function selectMemberships() {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  const rows = snap.docs.map(doc => ({ uid: doc.id, data: doc.data(), roles: rolesOf(doc.data()) })).filter(row => activeMember(row.data));
  const selected = {};
  const used = new Set();
  for (const item of MATRIX) {
    let found = rows.find(row => !used.has(row.uid) && item.roles.includes(norm(row.data.activeRole || row.data.rolActivo || '')));
    if (!found) found = rows.find(row => !used.has(row.uid) && row.roles.some(role => item.roles.includes(role)));
    if (!found) throw new Error('DATA_CONTRACT_FAILURE_NO_ACTIVE_' + item.key.toUpperCase());
    selected[item.key] = found;
    used.add(found.uid);
  }
  return selected;
}

async function entityTargets() {
  const [clients, policies, vehicles, payments] = await Promise.all([
    canonicalRef('clientes').get(), canonicalRef('polizas').get(), canonicalRef('vehiculos').get(), canonicalRef('cobros').get()
  ]);
  const clientIds = new Set(clients.docs.map(d => d.id));
  const policiesById = new Map(policies.docs.map(d => [d.id, d.data()]));
  const vehicle = vehicles.docs.map(d => ({ id: d.id, ...d.data() })).find(v => clientIds.has(v.clienteId || (policiesById.get(v.polizaId) || {}).clienteId));
  const payment = payments.docs.map(d => ({ id: d.id, ...d.data() })).find(c => clientIds.has(c.clienteId));
  const policy = policies.docs[0];
  return {
    vehicleClientId: vehicle && (vehicle.clienteId || (policiesById.get(vehicle.polizaId) || {}).clienteId) || '',
    paymentClientId: payment && payment.clienteId || '',
    policyId: policy && policy.id || ''
  };
}

async function removeBlockingOverlays(page) {
  await page.evaluate(() => {
    try { localStorage.setItem('orbit360_confidencialidad', 'accepted'); } catch {}
    const all = Array.from(document.querySelectorAll('body *'));
    const passwordText = all.find(el => /Crea tu contraseña personal/i.test(el.textContent || '') && (el.children.length < 8));
    if (passwordText) {
      const overlay = passwordText.closest('.drawer-back,.modal-back,[role="dialog"]') || passwordText.parentElement;
      if (overlay) overlay.remove();
    }
    document.body.style.overflow = '';
  });
}

async function installEvidenceMask(page) {
  await page.evaluate(() => {
    if (document.getElementById('orbit-evidence-mask')) return;
    const style = document.createElement('style');
    style.id = 'orbit-evidence-mask';
    style.textContent = '.tb-user,.fh-contact,.fichahdr h2,.tbl tbody td:first-child,.tbl tbody td:nth-child(2),.mono,.vp-v{filter:blur(7px)!important}.tb-user{opacity:.55!important}';
    document.head.appendChild(style);
  });
}

async function waitRouteReady(page, route) {
  const started = Date.now();
  await page.waitForFunction(expected => {
    const current = window.Orbit && Orbit.route && Orbit.route.key;
    const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics[expected];
    return current === expected && diag && diag.hydrated === true && !document.querySelector('.orbit-load-state');
  }, route, { timeout: 35000 });
  return Date.now() - started;
}
async function go(page, route) {
  await page.evaluate(value => { location.hash = '#/' + value; }, route);
  return waitRouteReady(page, route.split('?')[0]);
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
async function screenshot(page, name) {
  await installEvidenceMask(page);
  const target = path.join(OUT_DIR, name + '.png');
  await page.screenshot({ path: target, fullPage: true });
  return path.basename(target);
}

async function loginContext(browser, matrix, member) {
  const context = await browser.newContext({ viewport: { width: matrix.width, height: matrix.height }, locale: 'es-GT' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(cleanError(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(cleanError(message.text())); });
  const loginStarted = Date.now();
  await page.goto(BASE_URL + '#/inicio', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#login-form', { timeout: 30000 });
  await page.waitForSelector('#lg-remember', { timeout: 15000 });
  const loginChecks = await page.evaluate(() => ({
    rememberVisible: !!document.getElementById('lg-remember'),
    deadHelpAbsent: !document.getElementById('lg-reset'),
    rootfixLoaded: !!(window.Orbit && Orbit.__visualRuntimeRootfixV20260805)
  }));
  await page.check('#lg-remember');
  await page.evaluate(() => localStorage.setItem('orbit360_confidencialidad', 'accepted'));
  await page.waitForFunction(() => window.firebase && typeof firebase.auth === 'function', null, { timeout: 30000 });
  const token = await admin.auth().createCustomToken(member.uid);
  await page.evaluate(async customToken => { await firebase.auth().signInWithCustomToken(customToken); }, token);
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth') && document.body.dataset.authStage === 'inside', null, { timeout: 35000 });
  await removeBlockingOverlays(page);
  const readyMs = await waitRouteReady(page, 'inicio');
  return { context, page, consoleErrors, loginChecks, loginMs: Date.now() - loginStarted, readyMs };
}

async function testRole(browser, matrix, member, targets) {
  const session = await loginContext(browser, matrix, member);
  const { context, page, consoleErrors } = session;
  const checks = [];
  const routeTimings = {};
  const screenshots = [];
  const add = (id, ok, detail = '', level = 'FAIL') => checks.push({ id, ok: !!ok, detail, level: ok ? 'PASS' : level });
  try {
    add('remember-session-visible', session.loginChecks.rememberVisible, 'checkbox');
    add('dead-login-help-absent', session.loginChecks.deadHelpAbsent, 'lg-reset absent');
    add('rootfix-loaded', session.loginChecks.rootfixLoaded, 'runtime marker');
    add('initial-ready-under-30s', session.readyMs <= 30000, session.readyMs + 'ms');
    screenshots.push(await screenshot(page, matrix.key.toLowerCase() + '-inicio'));

    const routes = matrix.key === 'Asesor'
      ? ['cliente360', 'polizas', 'cobros', 'ops', 'leads']
      : ['cliente360', 'polizas', 'cobros', 'ops', 'leads', 'conciliaciones', 'cancelaciones'];
    for (const route of routes) {
      const elapsed = await go(page, route);
      routeTimings[route] = elapsed;
      const first = await kpiSignature(page);
      await sleep(2200);
      const second = await kpiSignature(page);
      const vp = await viewportCheck(page);
      add(route + '-ready-under-30s', elapsed <= 30000, elapsed + 'ms');
      add(route + '-kpis-stable', first === second, first === second ? 'stable' : 'changed after ready');
      add(route + '-titles-responsive', vp.titleOverflow === 0, 'overflow=' + vp.titleOverflow);
      if (route === 'cliente360' || route === 'polizas' || route === 'cobros' || route === 'ops' || route === 'leads') {
        screenshots.push(await screenshot(page, matrix.key.toLowerCase() + '-' + route));
      }
      if (route === 'ops' || route === 'leads') {
        const button = page.getByRole('button', { name: /Ejecutar prueba en vivo/i });
        add(route + '-diagnostic-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          await page.waitForSelector('#orbit-live-diagnostic-v20260805', { timeout: 10000 });
          const diag = await page.locator('#orbit-live-diagnostic-v20260805').innerText();
          add(route + '-diagnostic-readonly', /Escrituras realizadas:\s*0/i.test(diag), 'writes=0');
          add(route + '-diagnostic-no-failure', !/Requiere corrección/i.test(diag), /Requiere corrección/i.test(diag) ? 'FAIL visible' : 'no FAIL', 'FAIL');
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

    if (matrix.key === 'Direccion') {
      if (targets.vehicleClientId) {
        const elapsed = await go(page, 'cliente360?c=' + encodeURIComponent(targets.vehicleClientId) + '&t=vehiculos');
        routeTimings.vehicleDetail = elapsed;
        const button = page.getByRole('button', { name: /Ver detalle/i });
        add('vehicle-detail-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          add('vehicle-detail-opens', await page.locator('#orbit-vehicle-detail-v20260805').count() === 1, 'drawer');
          screenshots.push(await screenshot(page, 'direccion-vehicle-detail'));
          await page.locator('#orbit-vehicle-detail-v20260805 [data-close]').first().click();
        }
      }
      if (targets.paymentClientId) {
        const elapsed = await go(page, 'cliente360?c=' + encodeURIComponent(targets.paymentClientId) + '&t=cobros');
        routeTimings.cobroDetail = elapsed;
        const button = page.getByRole('button', { name: /Ver detalle/i });
        add('cobro-detail-button', await button.count() > 0, 'button visible');
        if (await button.count()) {
          await button.first().click();
          add('cobro-detail-opens', await page.locator('#cob-det').count() === 1, 'drawer');
          screenshots.push(await screenshot(page, 'direccion-cobro-detail'));
          await page.locator('#cob-det #cd-x').click();
        }
        await go(page, 'cliente360?c=' + encodeURIComponent(targets.paymentClientId) + '&t=recibos');
        const receiptButton = page.getByRole('button', { name: /Ver detalle/i });
        add('receipt-detail-button', await receiptButton.count() > 0, 'button visible');
        if (await receiptButton.count()) {
          await receiptButton.first().click();
          add('receipt-detail-opens', await page.locator('#cob-det').count() === 1, 'drawer');
          await page.locator('#cob-det #cd-x').click();
        }
      }
    }

    add('console-errors-zero', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '), 'WARN');
    const failed = checks.filter(c => !c.ok && c.level === 'FAIL');
    const warnings = checks.filter(c => !c.ok && c.level === 'WARN');
    return {
      role: matrix.key,
      viewport: { width: matrix.width, height: matrix.height },
      membershipHash: idHash(member.uid),
      loginMs: session.loginMs,
      initialReadyMs: session.readyMs,
      routeTimings,
      checks,
      failed: failed.length,
      warnings: warnings.length,
      consoleErrorCount: consoleErrors.length,
      screenshots,
      ok: failed.length === 0
    };
  } finally {
    await context.close();
  }
}

const result = {
  schemaVersion: 'orbit360-visual-runtime-rootfix-live-v1',
  gateId: 'block2.7-visual-runtime-rootfix-lab-v20260805',
  contractVersion: '2.7.2',
  stage: 'STARTED',
  classification: '',
  projectId: PROJECT,
  tenantId: TENANT,
  before: null,
  after: null,
  roles: [],
  hostingDeploysObservedByTool: 0,
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

let browser;
try {
  result.before = await protectedSnapshot();
  result.firestoreReads += Object.keys(result.before).length;
  const memberships = await selectMemberships();
  const targets = await entityTargets();
  browser = await chromium.launch({ headless: true });
  for (const matrix of MATRIX) result.roles.push(await testRole(browser, matrix, memberships[matrix.key], targets));
  result.after = await protectedSnapshot();
  result.firestoreReads += Object.keys(result.after).length;
  result.snapshotIntegrity = snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'CHANGED';
  const roleFailures = result.roles.reduce((sum, role) => sum + role.failed, 0);
  result.stage = roleFailures === 0 && result.snapshotIntegrity === 'VERIFIED_UNCHANGED'
    ? 'PASS_VISUAL_RUNTIME_ROOTFIX_LIVE'
    : 'FAIL_VISUAL_RUNTIME_ROOTFIX_LIVE';
  result.classification = roleFailures === 0 && result.snapshotIntegrity === 'VERIFIED_UNCHANGED'
    ? 'PASS_VISUAL_POST_AUTH'
    : result.snapshotIntegrity !== 'VERIFIED_UNCHANGED' ? 'SECURITY_FAILURE' : 'FUNCTIONAL_DEFECT';
  result.totalRoleFailures = roleFailures;
  result.totalWarnings = result.roles.reduce((sum, role) => sum + role.warnings, 0);
  result.firestoreWrites = 0;
  result.authWrites = 0;
  result.operationalWrites = 0;
  result.ok = result.stage === 'PASS_VISUAL_RUNTIME_ROOTFIX_LIVE';
} catch (error) {
  result.stage = 'FAIL_VISUAL_RUNTIME_ROOTFIX_LIVE';
  result.classification = /NO_ACTIVE_|DATA_CONTRACT/.test(String(error && error.message || error)) ? 'DATA_CONTRACT_FAILURE' : 'ENVIRONMENT_FAILURE';
  result.error = cleanError(error);
  try {
    result.after = await protectedSnapshot();
    result.snapshotIntegrity = result.before && snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'UNKNOWN_OR_CHANGED';
  } catch (snapshotError) {
    result.snapshotError = cleanError(snapshotError);
  }
  result.ok = false;
} finally {
  if (browser) await browser.close();
  fs.writeFileSync(EVIDENCE, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
}
process.exit(result.ok ? 0 : 42);
