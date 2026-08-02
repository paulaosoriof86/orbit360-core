#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { acceptLegalOnce } from './orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs';
import { TECHNICAL_COPY_PATTERN } from './orbit360-visible-technical-copy-predicate-v20260729.mjs';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const OUT = path.join(EVIDENCE_DIR, 'gate711-ops-leads-runtime-v20260802.json');
const SHOTS = path.join(EVIDENCE_DIR, 'visual-sanitized-gate711-ops-leads-v20260802');
const BASE_URL = String(process.env.ORBIT360_BASE_URL || '').trim();
const TOKEN_FILE = String(process.env.ORBIT360_CUSTOM_TOKEN_FILE || '').trim();
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const EXPECTED_COUNTS = {
  clientes: 430,
  aseguradoras: 30,
  polizas: 1373,
  vehiculos: 1032,
  recibosEsperados: 1294,
  carteraPrimas: 673,
  cobros: 5,
  asesores: 7
};

const report = {
  schemaVersion: 'orbit360-gate711-ops-leads-runtime-v1',
  gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801',
  contractVersion: '7.11.1',
  generatedAt: new Date().toISOString(),
  stage: 'init',
  authMode: 'existing_custom_token_readonly',
  checks: {},
  roles: {},
  screenshots: [],
  browserDiagnostics: { pageErrors: [], consoleErrors: [], failedRequests: [] },
  writeGuard: { installed: false, calls: [] },
  firestoreWrites: 0,
  operationalWrites: 0,
  reimportExecuted: false,
  hostingDeploy: false,
  previewDeploy: false,
  production: false,
  containsPII: false,
  containsDocumentIds: false,
  containsValues: false,
  containsSecrets: false,
  ok: false
};

function clean(value) {
  return String(value == null ? '' : value)
    .replace(/https?:\/\/[^/\s]+/g, '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 360);
}
function save() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
}
function stage(name) {
  report.stage = name;
  console.log('ORBIT360_GATE711_OPS_LEADS_STAGE:' + name);
}
function requireState(value, code, detail = '') {
  if (!value) throw new Error(code + (detail ? ':' + clean(detail) : ''));
}
async function bounded(name, fn, ms = 30000) {
  stage(name);
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('PIPELINE_STEP_TIMEOUT:' + name)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function selectRole(page, role) {
  const result = await page.evaluate(target => {
    const allowed = Orbit.session && Orbit.session.allowedRoles ? Orbit.session.allowedRoles() : [];
    if (!allowed.includes(target)) return { ok: false, allowedCount: allowed.length };
    const select = document.getElementById('rol-sel');
    if (select) {
      const option = Array.from(select.options || []).find(item => String(item.value || '') === target || String(item.textContent || '').trim() === target);
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, via: 'selector' };
      }
    }
    return { ok: Boolean(Orbit.session && Orbit.session.set && Orbit.session.set(target) === true), via: 'owner' };
  }, role);
  requireState(result && result.ok, 'ROLE_SELECTION_FAILED', role);
  await page.waitForFunction(target => window.Orbit && Orbit.session && Orbit.session.rol && Orbit.session.rol() === target, role, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(500);
}
async function route(page, hash) {
  await page.evaluate(value => { location.hash = value; }, hash);
  await page.waitForFunction(value => location.hash.startsWith(value), hash.split('?')[0], { timeout: 15000, polling: 100 });
  await page.locator('#host .page').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(800);
}
async function visibleHealth(page, label) {
  const state = await page.evaluate(pattern => {
    const bodyText = String(document.body && document.body.innerText || '');
    const hostText = String(document.getElementById('host') && document.getElementById('host').innerText || '');
    const root = document.documentElement;
    const heading = Array.from(document.querySelectorAll('#host h1,#host h2,#host [role="heading"],#host .page-title')).find(el => {
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const rect = heading && heading.getBoundingClientRect();
    return {
      technicalCopy: new RegExp(pattern, 'i').test(bodyText),
      horizontalOverflow: root.scrollWidth > innerWidth + 4,
      headingVisible: Boolean(heading),
      headingWithinViewport: Boolean(rect && rect.left >= -2 && rect.right <= innerWidth + 2),
      hostTextLength: hostText.length
    };
  }, TECHNICAL_COPY_PATTERN);
  requireState(!state.technicalCopy, 'TECHNICAL_COPY_VISIBLE', label);
  requireState(!state.horizontalOverflow, 'HORIZONTAL_OVERFLOW', label);
  requireState(state.headingVisible && state.headingWithinViewport, 'HEADING_NOT_RESPONSIVE', label);
  requireState(state.hostTextLength > 20, 'EMPTY_ROUTE', label);
  return state;
}
async function screenshot(page, name) {
  const file = path.join(SHOTS, name + '.png');
  const masks = ['#host .kcard', '#host [data-neg]', '#host [data-ges]', '#host .ops-toolbar input', '#host .ops-toolbar select']
    .map(selector => page.locator(selector));
  await page.screenshot({ path: file, fullPage: true, mask: masks, maskColor: '#D8D8D8' });
  report.screenshots.push({ name: name + '.png', sanitized: true, maskedOperationalCards: true });
}
async function settleLegal(page) {
  const observed = await bounded('legal_owner_settled', async () => {
    await page.waitForFunction(() => {
      const visible = Array.from(document.querySelectorAll('[data-legal-gate]')).filter(node => {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length;
      const legal = window.Orbit && Orbit.legal;
      const accepted = legal && typeof legal.aceptaciones === 'function' ? Object.keys(legal.aceptaciones() || {}).length : 0;
      const state = legal && legal.__gateState || {};
      return visible === 1 || accepted > 0 || Object.values(state.doneScopes || {}).some(Boolean) || Object.values(state.pendingScopes || {}).some(Boolean);
    }, null, { timeout: 20000, polling: 100 });
    return page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('[data-legal-gate]')).filter(node => {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length;
      const legal = window.Orbit && Orbit.legal;
      const accepted = legal && typeof legal.aceptaciones === 'function' ? Object.keys(legal.aceptaciones() || {}).length : 0;
      const state = legal && legal.__gateState || {};
      return {
        visible,
        accepted,
        pending: Object.values(state.pendingScopes || {}).some(Boolean),
        done: Object.values(state.doneScopes || {}).some(Boolean)
      };
    });
  }, 24000);
  requireState(observed.visible <= 1, 'LEGAL_DUPLICATE_VISIBLE', String(observed.visible));
  if (observed.visible === 1 || observed.pending) {
    await acceptLegalOnce(page, { bounded, requireState, report });
  } else {
    requireState(observed.accepted > 0 || observed.done, 'LEGAL_OWNER_UNSETTLED', JSON.stringify(observed));
    report.checks.legalOneClick = true;
  }
}

let browser;
const watchdog = setTimeout(() => {
  report.error = 'GATE_TIMEOUT:' + report.stage;
  save();
  process.exit(124);
}, 600000);

try {
  requireState(/^https?:\/\//.test(BASE_URL), 'BASE_URL_INVALID');
  requireState(TOKEN_FILE && fs.existsSync(TOKEN_FILE), 'CUSTOM_TOKEN_FILE_MISSING');
  const customToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  requireState(customToken.length > 100, 'CUSTOM_TOKEN_INVALID');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(60000);
  page.on('pageerror', error => {
    if (report.browserDiagnostics.pageErrors.length < 12) report.browserDiagnostics.pageErrors.push(clean(error && error.message || error));
  });
  page.on('console', message => {
    if (message.type() === 'error' && report.browserDiagnostics.consoleErrors.length < 20) report.browserDiagnostics.consoleErrors.push(clean(message.text()));
  });
  page.on('requestfailed', request => {
    if (report.browserDiagnostics.failedRequests.length < 20) {
      report.browserDiagnostics.failedRequests.push({
        path: (() => { try { return new URL(request.url()).pathname; } catch { return ''; } })(),
        error: clean(request.failure() && request.failure().errorText)
      });
    }
  });

  await bounded('open_local_checkout', () => page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }), 70000);
  await bounded('firebase_auth_ready', () => page.waitForFunction(() => window.firebase && typeof firebase.auth === 'function' && firebase.apps && firebase.apps.length > 0, { timeout: 45000, polling: 100 }), 50000);
  const auth = await bounded('existing_custom_token_signin', () => page.evaluate(async ({ token, uid, email }) => {
    const credential = await firebase.auth().signInWithCustomToken(token);
    const user = credential && credential.user || firebase.auth().currentUser;
    return { uid: String(user && user.uid || ''), email: String(user && user.email || '').toLowerCase(), expectedUid: uid, expectedEmail: email };
  }, { token: customToken, uid: EXPECTED_UID, email: EXPECTED_EMAIL }), 45000);
  requireState(auth.uid === EXPECTED_UID && auth.email === EXPECTED_EMAIL, 'CANONICAL_AUTH_IDENTITY_MISMATCH');
  report.checks.existingIdentity = true;

  await bounded('canonical_store_hydrated', () => page.waitForFunction(expected => {
    const store = window.Orbit && Orbit.store;
    if (!store || store.__canonicalReadModelV79 !== true || store.__singleReadOwner !== true) return false;
    return Object.entries(expected).every(([name, count]) => (store.all(name) || []).length === count);
  }, EXPECTED_COUNTS, { timeout: 150000, polling: 250 }), 160000);
  report.checks.canonicalStore = true;

  await settleLegal(page);
  await page.evaluate(() => {
    const calls = [], store = Orbit.store;
    ['insert', 'update', 'remove', 'setPref'].forEach(name => {
      const original = store[name];
      store[name] = function () {
        calls.push({ name, at: new Date().toISOString() });
        throw new Error('RUNTIME_WRITE_GUARD:' + name);
      };
      store[name].__guardedOriginal = original;
    });
    window.__orbitGate711OpsLeadsWriteGuard = { calls };
  });
  report.writeGuard.installed = true;

  const plans = [
    { role: 'Dirección', label: 'direccion-desktop', viewport: { width: 1440, height: 1000 }, ops: 'visible', leads: 'visible' },
    { role: 'Operativo', label: 'operativo-tablet', viewport: { width: 900, height: 1100 }, ops: 'visible', leads: 'visible' },
    { role: 'Asesor', label: 'asesor-mobile', viewport: { width: 390, height: 844 }, ops: 'restricted', leads: 'visible' }
  ];

  for (const plan of plans) {
    await page.setViewportSize(plan.viewport);
    await selectRole(page, plan.role);
    report.roles[plan.role] = { viewport: plan.viewport };

    await route(page, '#/ops');
    const opsHealth = await visibleHealth(page, plan.label + '-ops');
    const opsState = await page.evaluate(() => {
      const text = String(document.getElementById('host') && document.getElementById('host').innerText || '');
      return {
        hasKanban: Boolean(document.querySelector('#host .kanban')),
        hasLegend: Boolean(document.querySelector('#host .ops-legend')),
        hasFilters: Boolean(document.querySelector('#host .ops-toolbar')),
        synchronizedCopy: /Sincronizado con Orbit Leads/i.test(text),
        restrictedCopy: /Tablero interno del equipo|No tienes acceso con el rol activo/i.test(text),
        visibleColumns: document.querySelectorAll('#host .kcol').length,
        visibleCards: document.querySelectorAll('#host .kcard,#host [data-neg],#host [data-ges]').length
      };
    });
    if (plan.ops === 'visible') {
      requireState(opsState.hasKanban && opsState.hasLegend && opsState.hasFilters && opsState.synchronizedCopy && opsState.visibleColumns > 0, 'OPS_ROUTE_INVALID', plan.role);
    } else {
      requireState(!opsState.hasKanban && opsState.restrictedCopy, 'OPS_ADVISOR_RESTRICTION_INVALID', plan.role);
    }
    await screenshot(page, plan.label + '-ops');

    await route(page, '#/leads');
    const leadsHealth = await visibleHealth(page, plan.label + '-leads');
    const leadsState = await page.evaluate(() => {
      const text = String(document.getElementById('host') && document.getElementById('host').innerText || '');
      return {
        hasKanban: Boolean(document.querySelector('#host .kanban')),
        hasLegend: Boolean(document.querySelector('#host .ops-legend')),
        hasNewAction: Boolean(document.querySelector('#host #ld-new')),
        synchronizedCopy: /Sincronizado con Orbit Ops/i.test(text),
        denied: /No tienes acceso con el rol activo/i.test(text),
        visibleColumns: document.querySelectorAll('#host .kcol').length,
        visibleCards: document.querySelectorAll('#host .kcard,#host [data-neg]').length
      };
    });
    requireState(!leadsState.denied && leadsState.hasKanban && leadsState.hasLegend && leadsState.hasNewAction && leadsState.synchronizedCopy && leadsState.visibleColumns > 0, 'LEADS_ROUTE_INVALID', plan.role);
    await screenshot(page, plan.label + '-leads');

    report.roles[plan.role].ops = { health: opsHealth, state: opsState, expected: plan.ops };
    report.roles[plan.role].leads = { health: leadsHealth, state: leadsState, expected: plan.leads };
  }

  const final = await page.evaluate(() => ({
    writeCalls: window.__orbitGate711OpsLeadsWriteGuard && window.__orbitGate711OpsLeadsWriteGuard.calls || [],
    activeRole: Orbit.session && Orbit.session.rol ? Orbit.session.rol() : ''
  }));
  report.writeGuard.calls = final.writeCalls;
  requireState(final.writeCalls.length === 0, 'BROWSER_WRITE_ATTEMPT', JSON.stringify(final.writeCalls));
  requireState(report.browserDiagnostics.pageErrors.length === 0, 'BROWSER_PAGE_ERRORS', JSON.stringify(report.browserDiagnostics.pageErrors));
  requireState(report.screenshots.length === 6, 'SCREENSHOT_COVERAGE_INCOMPLETE', String(report.screenshots.length));

  report.checks.roles = true;
  report.checks.ops = true;
  report.checks.leads = true;
  report.checks.advisorOpsRestricted = true;
  report.checks.responsive = true;
  report.checks.noTechnicalCopy = true;
  report.checks.writeGuard = true;
  report.checks.sanitizedScreenshots = true;
  report.status = 'GATE711_OPS_LEADS_RUNTIME_PASS';
  report.classification = 'GO_LAB_RELEASE_CRITICAL_OPS_LEADS';
  report.ok = true;
} catch (error) {
  report.status = 'GATE711_OPS_LEADS_RUNTIME_FAIL';
  report.classification = String(error && error.message || error).split(':')[0] || 'FUNCTIONAL_DEFECT';
  report.error = clean(error && error.message || error);
  report.ok = false;
} finally {
  clearTimeout(watchdog);
  if (browser) await browser.close().catch(() => {});
  save();
}

process.exit(report.ok ? 0 : 41);
