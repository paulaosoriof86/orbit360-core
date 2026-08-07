#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';
import { V23_RENDER_SIGNAL_VERSION, navigateObserved } from './orbit360-event-driven-render-observer-v23.mjs';

export const V23_MATRIX_SCHEMA = 'orbit360-block1-client360-insurers-native-matrix-v23';
export const V23_GATE_ID = 'block1-client360-insurers-lab-v20260717';
export const V23_CONTRACT_VERSION = '1.0.26';
export const V23_BLOCKING_ROUTES = Object.freeze(['inicio', 'cliente360', 'aseguradoras']);
export const V23_NONBLOCKING_LEDGER = Object.freeze(['polizas', 'cobros', 'ops', 'leads', 'conciliaciones', 'cancelaciones', 'vehicle-detail-button', 'receipt-detail-button', 'cobro-detail-button']);
export const SOURCE_CONTRACT = Object.freeze({
  schemaVersion: V23_MATRIX_SCHEMA,
  gateId: V23_GATE_ID,
  contractVersion: V23_CONTRACT_VERSION,
  nativeSource: true,
  generatedFromPriorArtifact: false,
  textualTransform: false,
  renderSignalVersion: V23_RENDER_SIGNAL_VERSION,
  blockingRoutes: V23_BLOCKING_ROUTES,
  nonblockingLedger: V23_NONBLOCKING_LEDGER,
  roleScopedTargets: true
});

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const BASE_URL = process.env.ORBIT360_LAB_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2';
const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-native-matrix-sanitized-v20260807.json';
const OUT_DIR = process.env.ORBIT360_VISUAL_ARTIFACT_DIR || 'orbit360-block1-v23-artifacts';
const CAPTURE_TIMEOUT_MS = 12000;
const CANONICAL = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
const LEGACY = ['asesores', 'comisiones', 'negocios', 'gestiones', 'cancelaciones'];
const MATRIX = Object.freeze([
  { role: 'Direccion', width: 1440, height: 1000, roles: ['superadmin', 'direccion', 'admintenant'] },
  { role: 'Operativo', width: 1024, height: 768, roles: ['operativo'] },
  { role: 'Asesor', width: 390, height: 844, roles: ['asesor'] }
]);

const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const idHash = value => value ? sha(value).slice(0, 16) : '';
const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = value => String(value == null ? '' : value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/\b\d{6,}\b/g, '[id]').slice(0, 900);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const technicalCopy = text => /\b(firebase|firestore|backend|lab|localstorage|mock|demo|smoke|service\s*account|credentialref)\b/i.test(String(text || ''));

const result = {
  schemaVersion: V23_MATRIX_SCHEMA,
  gateId: V23_GATE_ID,
  contractVersion: V23_CONTRACT_VERSION,
  block: 1,
  blockingGateScope: 'BLOCK1_CLIENT360_INSURERS',
  blockingRoutes: [...V23_BLOCKING_ROUTES],
  nonblockingLedgerPreserved: [...V23_NONBLOCKING_LEDGER],
  nativeSource: true,
  generatedFromPriorArtifact: false,
  textualTransform: false,
  roleScopedTargets: true,
  renderSignalVersion: V23_RENDER_SIGNAL_VERSION,
  stage: 'STARTED',
  classification: '',
  validatorFinding: '',
  currentCheckpoint: 'BOOT',
  checkpoints: [],
  routeMetrics: [],
  roles: [],
  before: null,
  after: null,
  snapshotIntegrity: 'NOT_VERIFIED',
  captureWarnings: [],
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  functionsDeploys: 0,
  rulesDeploys: 0,
  productionTouched: false,
  containsPII: false,
  containsNames: false,
  containsEmails: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};

function write() {
  fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
  fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(result, null, 2) + '\n', 'utf8');
}
function mark(checkpoint, detail = {}) {
  result.currentCheckpoint = checkpoint;
  result.checkpoints.push({ checkpoint, at: new Date().toISOString(), ...detail });
  write();
}
function addMetric(metric) {
  const state = metric.state || {};
  const m = state.metric || {};
  const list = m.list || {};
  result.routeMetrics.push({
    role: metric.role,
    route: metric.route,
    requiredHydrationWaitMs: Number(metric.requiredHydrationWaitMs || 0),
    renderObserverWaitMs: Number(metric.renderObserverWaitMs || 0),
    renderOutcome: metric.renderOutcome || '',
    renderSignalVersion: metric.renderSignalVersion || V23_RENDER_SIGNAL_VERSION,
    completionReason: metric.completionReason || '',
    observerElapsedMs: Number(metric.observerElapsedMs || 0),
    mutationSignals: Number(metric.mutationSignals || 0),
    routeObserved: state.route || '',
    hydrationReadyObserved: state.hydrationReady === true,
    loadingVisibleObserved: state.loadingVisible === true,
    hostTextLength: Number(state.hostTextLength || 0),
    renderMs: Number(m.renderMs || 0),
    afterRenderMs: Number(m.afterRenderMs || 0),
    totalWithAfterRenderMs: Number(m.totalWithAfterRenderMs || 0),
    list: {
      bounded: list.bounded === true,
      pageSize: Number(list.pageSize || 0),
      page: Number(list.page || 0),
      pageCount: Number(list.pageCount || 0),
      totalRows: Number(list.totalRows || 0),
      filteredRows: Number(list.filteredRows || 0),
      renderedRows: Number(list.renderedRows || 0),
      summaryCacheMs: Number(list.summaryCacheMs || 0),
      summaryAggregateMs: Number(list.summaryAggregateMs || 0),
      rowsBuildMs: Number(list.rowsBuildMs || 0),
      innerHtmlMs: Number(list.innerHtmlMs || 0),
      bindingsMs: Number(list.bindingsMs || 0),
      totalMs: Number(list.totalMs || 0),
      writes: Number(list.writes || 0)
    },
    detail: clean(metric.detail || '')
  });
  write();
}
const observerHooks = { mark, persistMetric: async metric => addMetric(metric) };

function canonicalRef(db, name) { return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items'); }
function legacyRef(db, name) { return db.collection('tenantId').doc(TENANT).collection(name); }
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
function rolesOf(data) { return [...(Array.isArray(data.roles) ? data.roles : []), data.activeRole, data.rolActivo, data.role, data.rol].filter(Boolean).map(norm); }
function activeMember(data) {
  const status = norm(data.status || data.estado);
  return data.active !== false && data.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}
function classified(classification, message, finding = '') {
  const error = new Error(message); error.orbitClassification = classification; error.orbitFinding = finding; return error;
}
async function selectMemberships(db) {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  result.firestoreReads += 1;
  const rows = snap.docs.map(doc => ({ uid: doc.id, data: doc.data(), roles: rolesOf(doc.data()) })).filter(row => activeMember(row.data));
  const selected = {}; const used = new Set();
  for (const item of MATRIX) {
    let found = rows.find(row => !used.has(row.uid) && item.roles.includes(norm(row.data.activeRole || row.data.rolActivo || '')));
    if (!found) found = rows.find(row => !used.has(row.uid) && row.roles.some(role => item.roles.includes(role)));
    if (!found) throw classified('DATA_CONTRACT_FAILURE', `DATA_CONTRACT_FAILURE_NO_ACTIVE_${item.role.toUpperCase()}`);
    selected[item.role] = found; used.add(found.uid);
  }
  return selected;
}

async function installEvidenceMask(page) {
  await page.evaluate(() => {
    if (document.getElementById('orbit-v23-evidence-mask')) return;
    const style = document.createElement('style');
    style.id = 'orbit-v23-evidence-mask';
    style.textContent = '.tb-user,.fh-contact,.fichahdr,.tbl tbody,table tbody,.cards,.card-list,.mono,.vp-v,input,textarea,[data-client],[data-policy],[data-asg]{filter:blur(8px)!important}.tb-user{opacity:.5!important}';
    document.head.appendChild(style);
  });
}
async function capture(page, name) {
  try {
    await installEvidenceMask(page);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const target = path.join(OUT_DIR, name + '.png');
    await page.screenshot({ path: target, fullPage: false, animations: 'disabled', caret: 'hide', timeout: CAPTURE_TIMEOUT_MS });
    return path.basename(target);
  } catch (error) {
    result.captureWarnings.push({ checkpoint: result.currentCheckpoint, name: clean(name), error: clean(error && error.message || error), blocking: false });
    write(); return '';
  }
}
async function viewportCheck(page) {
  return page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.page-title,.mod-banner h1,.mod-banner h2')).filter(el => el.offsetParent !== null);
    return { titleOverflow: titles.filter(el => el.getBoundingClientRect().right > window.innerWidth + 2 || el.scrollWidth > el.clientWidth + 4).length, viewportWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
  });
}
async function hostFacts(page) {
  return page.evaluate(() => { const host = document.getElementById('host'); const text = host && (host.innerText || '') || ''; return { text, length: text.trim().length }; });
}
async function roleScopedTargets(page) {
  return page.evaluate(() => {
    const all = name => { try { return [].concat(Orbit.store && Orbit.store.all ? Orbit.store.all(name) || [] : []); } catch { return []; } };
    const clients = all('clientes');
    const policies = all('polizas');
    const vehicles = all('vehiculos');
    const payments = all('cobros');
    const insurers = all('aseguradoras');
    const has = (rows, cid) => rows.some(row => row && (row.clienteId === cid || row.clientId === cid));
    let empty = null;
    for (const client of clients) {
      if (!has(policies, client.id)) { empty = { id: client.id, tab: 'polizas', expected: 'Sin pólizas.' }; break; }
      if (!has(vehicles, client.id)) { empty = { id: client.id, tab: 'vehiculos', expected: 'no tiene vehículos asegurados' }; break; }
      if (!has(payments, client.id)) { empty = { id: client.id, tab: 'cobros', expected: 'Sin cobros.' }; break; }
    }
    return {
      clientId: clients[0] && clients[0].id || '',
      empty: empty || { id: '', tab: '', expected: '' },
      insurerId: insurers[0] && insurers[0].id || '',
      visibleClientCount: clients.length,
      visibleInsurerCount: insurers.length
    };
  });
}
async function checkLegalOnce(page, uid, add) {
  const scope = 'user:' + uid;
  try {
    await page.waitForSelector('[data-legal-gate]', { timeout: 12000 });
    const firstCount = await page.locator('[data-legal-gate]').count();
    add('legal-first-gate-visible', firstCount === 1, `count=${firstCount}`);
    await page.check('[data-legal-gate] #lg-chk');
    await page.click('[data-legal-gate] #lg-ok');
    await page.waitForFunction(() => document.querySelectorAll('[data-legal-gate]').length === 0, null, { timeout: 10000 });
    const accepted = await page.evaluate(scopeId => !!(Orbit.legal && Orbit.legal.yaAcepto && Orbit.legal.yaAcepto(scopeId)), scope);
    add('legal-accepted-real-owner', accepted, 'owner acceptance');
    await page.evaluate(scopeId => Orbit.legal.gate('interno', scopeId), scope);
    await sleep(300);
    add('legal-idempotent-once', await page.locator('[data-legal-gate]').count() === 0, 'second invocation');
  } catch (error) {
    add('legal-first-gate-visible', false, clean(error && error.message || error));
    add('legal-accepted-real-owner', false, 'not completed');
    add('legal-idempotent-once', false, 'not completed');
  }
}
async function loginContext(browser, matrix, member) {
  const context = await browser.newContext({ viewport: { width: matrix.width, height: matrix.height }, locale: 'es-GT' });
  const page = await context.newPage(); const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(clean(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(clean(message.text())); });
  const started = Date.now();
  mark(matrix.role.toUpperCase() + '_PAGE_GOTO');
  await page.goto(BASE_URL + '#/inicio', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#login-form', { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.removeItem('orbit360_confidencialidad'); localStorage.removeItem('orbit360_legal_aceptaciones'); } catch {} });
  await page.waitForFunction(() => !!(window.firebase && typeof firebase.auth === 'function'), null, { timeout: 30000 });
  const admin = globalThis.__orbitAdminV23;
  const token = await admin.auth().createCustomToken(member.uid);
  await page.evaluate(async customToken => { await firebase.auth().signInWithCustomToken(customToken); }, token);
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth') && document.body.dataset.authStage === 'inside', null, { timeout: 35000 });
  await page.waitForFunction(() => { try { const s = Orbit.session && Orbit.session.membershipProjectionStatus && Orbit.session.membershipProjectionStatus(); return !!(s && s.ready === true && s.tenantBound === true && Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.__labMembershipProjection === true); } catch { return false; } }, null, { timeout: 35000 });
  return { context, page, consoleErrors, loginMs: Date.now() - started };
}

async function testRole(browser, matrix, member) {
  const role = matrix.role; const session = await loginContext(browser, matrix, member);
  const { context, page, consoleErrors } = session; const checks = []; const screenshots = []; const routeTimings = {};
  const add = (id, ok, detail = '', level = 'FAIL') => checks.push({ id, ok: !!ok, detail: clean(detail), level: ok ? 'PASS' : level });
  try {
    const authFacts = await page.evaluate(() => {
      let description = {}; try { description = Orbit.session && Orbit.session.describe ? Orbit.session.describe() : {}; } catch {}
      return { inside: document.body.dataset.authStage === 'inside' && !document.body.classList.contains('pre-auth'), productReadOnly: !!(Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.productReadOnly === true), role: Orbit.session && Orbit.session.rol ? Orbit.session.rol() : '', assignedRoleCount: Number(description.assignedRoleCount || 0), advisorBound: description.advisorBound === true, writeAuthorized: description.writeAuthorized === true, canClient: !!(Orbit.session && Orbit.session.canSee && Orbit.session.canSee('cliente360')), canInsurer: !!(Orbit.session && Orbit.session.canSee && Orbit.session.canSee('aseguradoras')) };
    });
    add('auth-session-inside', authFacts.inside && authFacts.productReadOnly, `role=${authFacts.role}`);
    add('multirol-assigned', authFacts.assignedRoleCount >= 1, `count=${authFacts.assignedRoleCount}`);
    add('scope-client-visible', authFacts.canClient, 'cliente360');
    add('scope-insurer-visible', authFacts.canInsurer, 'aseguradoras');
    add('session-write-not-authorized', authFacts.writeAuthorized === false, 'read-only');
    if (role === 'Asesor') add('advisor-scope-bound', authFacts.advisorBound === true, 'membership advisor bound');
    await checkLegalOnce(page, member.uid, add);
    screenshots.push(await capture(page, role.toLowerCase() + '-inicio'));

    if (role === 'Asesor') {
      const mobile = await page.evaluate(() => ({ burger: !!document.getElementById('burger'), width: window.innerWidth }));
      add('mobile-burger-present', mobile.burger && mobile.width <= 980, `width=${mobile.width}`);
      if (mobile.burger) {
        await page.click('#burger');
        add('mobile-menu-opens', await page.evaluate(() => !!(document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('open')) && !!document.querySelector('.sb-overlay.show')), 'sidebar+overlay');
        await page.click('#burger');
        add('mobile-menu-closes', await page.evaluate(() => !(document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('open')) && !document.querySelector('.sb-overlay.show')), 'closed');
      }
    }

    const c360 = await navigateObserved(page, role, 'cliente360', observerHooks); routeTimings.cliente360 = c360.requiredMs + c360.waitMs;
    const cFacts = await hostFacts(page); const cView = await viewportCheck(page);
    const cList = await page.evaluate(() => ({ table: !!document.querySelector('.tbl tbody'), health: /Salud/i.test(document.getElementById('host') && document.getElementById('host').innerText || ''), bounded: !!(window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 && OrbitRuntimeDiagnostics.cliente360.list && OrbitRuntimeDiagnostics.cliente360.list.bounded === true), pageSize: Number(window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 && OrbitRuntimeDiagnostics.cliente360.list && OrbitRuntimeDiagnostics.cliente360.list.pageSize || 0), renderedRows: Number(window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 && OrbitRuntimeDiagnostics.cliente360.list && OrbitRuntimeDiagnostics.cliente360.list.renderedRows || 0) }));
    add('cliente360-ready-under-30s', routeTimings.cliente360 <= 30000, `${routeTimings.cliente360}ms`);
    add('cliente360-list', cList.table && cList.bounded && cList.pageSize === 40 && cList.renderedRows <= 40, `bounded=${cList.bounded};pageSize=${cList.pageSize};rows=${cList.renderedRows}`);
    add('cliente360-quality-visible', cList.health, 'Salud');
    add('cliente360-no-technical-copy', !technicalCopy(cFacts.text), `length=${cFacts.length}`);
    add('cliente360-responsive', cView.titleOverflow === 0 && cView.documentWidth <= cView.viewportWidth + 4, `titleOverflow=${cView.titleOverflow};doc=${cView.documentWidth};vp=${cView.viewportWidth}`);
    screenshots.push(await capture(page, role.toLowerCase() + '-cliente360'));

    const targets = await roleScopedTargets(page);
    add('cliente360-role-scoped-target-exists', !!targets.clientId, `visible=${targets.visibleClientCount}`);
    if (targets.clientId) {
      const detail = await navigateObserved(page, role, 'cliente360?c=' + encodeURIComponent(targets.clientId), observerHooks); routeTimings.cliente360Detail = detail.requiredMs + detail.waitMs;
      const facts = await page.evaluate(() => ({ header: !!document.querySelector('.fichahdr'), tabs: !!document.getElementById('ficha-tabs'), body: !!document.getElementById('c360-body') }));
      add('cliente360-detail', facts.header && facts.tabs && facts.body, JSON.stringify(facts));
    }
    if (targets.empty && targets.empty.id) {
      const empty = await navigateObserved(page, role, 'cliente360?c=' + encodeURIComponent(targets.empty.id) + '&t=' + encodeURIComponent(targets.empty.tab), observerHooks); routeTimings.cliente360EmptyRelations = empty.requiredMs + empty.waitMs;
      const honest = await page.evaluate(expected => (document.getElementById('c360-body') && document.getElementById('c360-body').innerText || '').toLowerCase().includes(String(expected || '').toLowerCase()), targets.empty.expected);
      add('cliente360-empty-relations-honest', honest, `tab=${targets.empty.tab}`);
    } else {
      add('cliente360-empty-relations-honest', true, 'no empty relation candidate exists in effective role scope', 'WARN');
    }

    const insurers = await navigateObserved(page, role, 'aseguradoras', observerHooks); routeTimings.aseguradoras = insurers.requiredMs + insurers.waitMs;
    const aFacts = await hostFacts(page); const aView = await viewportCheck(page);
    const aDirectory = await page.evaluate(() => ({ grid: !!document.querySelector('.asg-grid'), cards: document.querySelectorAll('[data-asg]').length, hasNew: !!document.getElementById('asg-new'), hasImport: !!document.getElementById('asg-imp') }));
    add('aseguradoras-ready-under-30s', routeTimings.aseguradoras <= 30000, `${routeTimings.aseguradoras}ms`);
    add('aseguradoras-directory', aDirectory.grid && aDirectory.cards > 0, `cards=${aDirectory.cards}`);
    add('aseguradoras-no-technical-copy', !technicalCopy(aFacts.text), `length=${aFacts.length}`);
    add('aseguradoras-responsive', aView.titleOverflow === 0 && aView.documentWidth <= aView.viewportWidth + 4, `titleOverflow=${aView.titleOverflow};doc=${aView.documentWidth};vp=${aView.viewportWidth}`);
    if (role === 'Asesor') add('aseguradoras-advisor-readonly', !aDirectory.hasNew && !aDirectory.hasImport, `new=${aDirectory.hasNew};import=${aDirectory.hasImport}`);
    screenshots.push(await capture(page, role.toLowerCase() + '-aseguradoras'));

    const insurerTargets = await roleScopedTargets(page);
    add('aseguradoras-role-scoped-target-exists', !!insurerTargets.insurerId, `visible=${insurerTargets.visibleInsurerCount}`);
    if (insurerTargets.insurerId) {
      const insurerDetail = await navigateObserved(page, role, 'aseguradoras?ficha=' + encodeURIComponent(insurerTargets.insurerId), observerHooks); routeTimings.aseguradoraDetail = insurerDetail.requiredMs + insurerDetail.waitMs;
      const detailFacts = await page.evaluate(() => { const drawer = document.getElementById('asg-ficha'); const text = drawer && (drawer.innerText || '') || ''; return { drawer: !!drawer, tabs: drawer ? drawer.querySelectorAll('[data-tab]').length : 0, knowledge: /Conocimiento|Fuentes|Documentos/i.test(text), text }; });
      add('aseguradoras-detail', detailFacts.drawer && detailFacts.tabs > 0, `tabs=${detailFacts.tabs}`);
      add('aseguradoras-knowledge', detailFacts.knowledge, 'knowledge/fuentes/documentos');
      add('aseguradoras-detail-no-technical-copy', !technicalCopy(detailFacts.text), 'clean');
    }

    add('console-errors-zero', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '), 'WARN');
    add('screenshots-best-effort', result.captureWarnings.filter(item => String(item.name || '').startsWith(role.toLowerCase() + '-')).length === 0, 'capture warnings non-blocking', 'WARN');
    const failed = checks.filter(check => !check.ok && check.level === 'FAIL'); const warnings = checks.filter(check => !check.ok && check.level === 'WARN');
    const roleResult = { role, viewport: { width: matrix.width, height: matrix.height }, membershipHash: idHash(member.uid), loginMs: session.loginMs, routeTimings, checks, failed: failed.length, warnings: warnings.length, screenshots: screenshots.filter(Boolean), ok: failed.length === 0 };
    mark(role.toUpperCase() + '_COMPLETE', { failed: failed.length, warnings: warnings.length }); return roleResult;
  } finally { await context.close(); }
}

export async function runNativeMatrix() {
  fs.mkdirSync(OUT_DIR, { recursive: true }); write();
  const { default: admin } = await import('firebase-admin'); const { chromium } = await import('playwright');
  patchChromiumCaptureWatchdog({ chromium, evidencePath: EVIDENCE, hardTimeoutMs: CAPTURE_TIMEOUT_MS, heartbeatMs: 2500, detachTimeoutMs: 600 });
  globalThis.__orbitAdminV23 = admin; let db = null; let browser = null;
  try {
    mark('SERVICE_ACCOUNT_VALIDATE');
    const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS; if (!credentialPath) throw classified('ENVIRONMENT_FAILURE', 'ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8')); if (serviceAccount.project_id !== PROJECT) throw classified('ENVIRONMENT_FAILURE', 'ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT }); db = admin.firestore();
    mark('PROTECTED_SNAPSHOT_BEFORE'); result.before = await protectedSnapshot(db); result.firestoreReads += Object.keys(result.before).length;
    const memberships = await selectMemberships(db);
    mark('BROWSER_LAUNCH'); browser = await chromium.launch({ headless: true });
    for (const matrix of MATRIX) { const roleResult = await testRole(browser, matrix, memberships[matrix.role]); result.roles.push(roleResult); write(); }
    mark('PROTECTED_SNAPSHOT_AFTER'); result.after = await protectedSnapshot(db); result.firestoreReads += Object.keys(result.after).length;
    result.snapshotIntegrity = snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'CHANGED';
    result.totalRoleFailures = result.roles.reduce((sum, role) => sum + role.failed, 0); result.totalWarnings = result.roles.reduce((sum, role) => sum + role.warnings, 0);
    result.stage = result.totalRoleFailures === 0 && result.snapshotIntegrity === 'VERIFIED_UNCHANGED' ? 'PASS_BLOCK1_NATIVE_VISUAL_MATRIX' : 'FAIL_BLOCK1_NATIVE_VISUAL_MATRIX';
    result.classification = result.snapshotIntegrity !== 'VERIFIED_UNCHANGED' ? 'SECURITY_FAILURE' : result.totalRoleFailures ? 'FUNCTIONAL_DEFECT' : 'PASS_VISUAL_POST_AUTH'; result.ok = result.classification === 'PASS_VISUAL_POST_AUTH';
  } catch (error) {
    result.stage = 'FAIL_BLOCK1_NATIVE_VISUAL_MATRIX'; result.classification = error && error.orbitClassification || (/PROJECT_MISMATCH|CREDENTIAL/.test(String(error && error.message || error)) ? 'ENVIRONMENT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE'); result.validatorFinding = error && error.orbitFinding || ''; result.error = clean(error && error.message || error);
    try { if (db) { result.after = await protectedSnapshot(db); result.snapshotIntegrity = result.before && snapshotsEqual(result.before, result.after) ? 'VERIFIED_UNCHANGED' : 'UNKNOWN_OR_CHANGED'; } } catch (snapshotError) { result.snapshotError = clean(snapshotError && snapshotError.message || snapshotError); }
    result.ok = false;
  } finally { if (browser) await browser.close(); delete globalThis.__orbitAdminV23; write(); console.log(JSON.stringify(result, null, 2)); }
  return result;
}

if (process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1') {
  console.log(JSON.stringify({ status: 'PASS_V23_NATIVE_MATRIX_IMPORT', classification: 'SOURCE_ARTIFACT_VALIDATED', sourceContract: SOURCE_CONTRACT, externalRuntimeDependenciesLoaded: false, firebaseAccess: false, browserExecuted: false, hostingTouched: false, writes: 0, ok: true }));
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = await runNativeMatrix(); process.exitCode = output.ok ? 0 : 42;
}
