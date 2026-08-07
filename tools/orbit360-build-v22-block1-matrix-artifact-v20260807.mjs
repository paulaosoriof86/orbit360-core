#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildV21MatrixArtifact,
  V21_SIGNAL_VERSION
} from './orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs';

export const V22_MATRIX_SCHEMA = 'orbit360-block1-client360-insurers-matrix-v22-event-driven';
export const V22_GATE_SCOPE = Object.freeze(['inicio', 'cliente360', 'aseguradoras']);
export const V22_EXCLUDED_BLOCKERS = Object.freeze(['polizas', 'cobros', 'ops', 'leads', 'conciliaciones', 'cancelaciones']);
export const V22_SIGNAL_VERSION = V21_SIGNAL_VERSION;

const here = path.dirname(fileURLToPath(import.meta.url));
const entityTargetsPattern = /async function entityTargets\(db\) \{[\s\S]*?\n\}\n\n(?=async function browserState)/;
const testRolePattern = /async function testRole\(browser, matrix, member, targets\) \{[\s\S]*?\n\}\n\n(?=let browser;)/;

const entityTargetsReplacement = `async function entityTargets(db) {
  const [clients, insurers] = await Promise.all([
    canonicalRef(db, 'clientes').get(),
    canonicalRef(db, 'aseguradoras').get()
  ]);
  result.firestoreReads += 2;
  const client = clients.docs.find(doc => doc && doc.id) || null;
  const insurer = insurers.docs.find(doc => doc && doc.id) || null;
  return {
    clientId: client ? client.id : '',
    insurerId: insurer ? insurer.id : '',
    clientCount: clients.size,
    insurerCount: insurers.size
  };
}

`;

const testRoleReplacement = `async function v22VisibleText(page) {
  return page.evaluate(() => (document.body && document.body.innerText || '').replace(/\\s+/g, ' ').trim());
}
async function v22ShellState(page) {
  return page.evaluate(() => {
    const membership = (() => {
      try { return Orbit.session && typeof Orbit.session.membershipProjectionStatus === 'function' ? Orbit.session.membershipProjectionStatus() || {} : {}; }
      catch { return {}; }
    })();
    const session = (() => {
      try {
        const assigned = Orbit.session && typeof Orbit.session.assignedRoles === 'function' ? Orbit.session.assignedRoles() : [];
        return {
          activeRole: Orbit.session && typeof Orbit.session.rol === 'function' ? String(Orbit.session.rol() || '') : '',
          assignedRoleCount: Array.isArray(assigned) ? assigned.length : 0,
          advisorBound: !!(Orbit.session && typeof Orbit.session.asesorId === 'function' && Orbit.session.asesorId())
        };
      } catch { return { activeRole: '', assignedRoleCount: 0, advisorBound: false }; }
    })();
    const can = route => {
      try { return !!(Orbit.access && typeof Orbit.access.can === 'function' && Orbit.access.can(route, 'view')); }
      catch { return false; }
    };
    return {
      membershipReady: membership.ready === true,
      membershipTenantBound: membership.tenantBound === true,
      assignedRoleCount: Number(membership.assignedRoleCount || session.assignedRoleCount || 0),
      advisorBound: membership.advisorBound === true || session.advisorBound === true,
      activeRole: session.activeRole,
      canCliente360: can('cliente360') || !!document.querySelector('.nav-link[data-route="cliente360"]'),
      canAseguradoras: can('aseguradoras') || !!document.querySelector('.nav-link[data-route="aseguradoras"]'),
      clienteNavPresent: !!document.querySelector('.nav-link[data-route="cliente360"]'),
      insurerNavPresent: !!document.querySelector('.nav-link[data-route="aseguradoras"]'),
      burgerPresent: !!document.getElementById('burger'),
      roleSelectorPresent: !!document.getElementById('rol-sel'),
      legalAccepted: (() => {
        try {
          const raw = localStorage.getItem('orbit360_legal_aceptaciones');
          if (raw) return Object.keys(JSON.parse(raw) || {}).length > 0;
          return localStorage.getItem('orbit360_confidencialidad') === 'accepted';
        } catch { return false; }
      })()
    };
  });
}
async function v22TechnicalCopyFree(page) {
  const text = await v22VisibleText(page);
  const forbidden = /\\b(Firebase|Firestore|backend|LAB|localStorage|mock|demo|smoke|secretos?|credenciales? técnicas?|backend_required)\\b/i;
  return { ok: !forbidden.test(text), match: (text.match(forbidden) || [''])[0] };
}
async function v22MobileMenuCheck(page, role) {
  if (role !== 'Asesor') return { required: false, ok: true, opened: false, closedAfterNavigate: true };
  return page.evaluate(async () => {
    const burger = document.getElementById('burger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sb-overlay');
    if (!burger || !sidebar || !overlay) return { required: true, ok: false, opened: false, closedAfterNavigate: false };
    burger.click();
    await new Promise(resolve => setTimeout(resolve, 60));
    const opened = sidebar.classList.contains('open') || overlay.classList.contains('show') || document.body.classList.contains('sb-open');
    const link = sidebar.querySelector('.nav-link[data-route="cliente360"]');
    if (link) link.click();
    await new Promise(resolve => setTimeout(resolve, 120));
    const closedAfterNavigate = !sidebar.classList.contains('open') && !overlay.classList.contains('show') && !document.body.classList.contains('sb-open');
    return { required: true, ok: opened && !!link && closedAfterNavigate, opened, linkPresent: !!link, closedAfterNavigate };
  });
}
async function v22ClienteListContract(page) {
  return page.evaluate(() => {
    const diag = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 || {};
    const list = diag.list || {};
    const rows = document.querySelectorAll('.tbl tbody tr.clickable').length;
    const pagination = document.querySelector('.c360-pagination');
    const body = (document.getElementById('host') && document.getElementById('host').innerText || '');
    return {
      bounded: list.bounded === true,
      pageSize: Number(list.pageSize || 0),
      renderedRows: Number(list.renderedRows || rows || 0),
      domRows: rows,
      pagination: !!pagination,
      qualitySignal: /Salud|calidad|complet/i.test(body),
      emptyHonest: rows > 0 || /Sin resultados/i.test(body)
    };
  });
}
async function v22OpenFirstClientFicha(page, role) {
  const prefix = role.toUpperCase() + '_CLIENTE360_FICHA';
  const rows = page.locator('.tbl tbody tr.clickable');
  if (await rows.count() === 0) return { opened: false, reason: 'NO_VISIBLE_CLIENT_ROWS' };
  const token = await armV21RenderObserver(page, role, 'cliente360');
  mark(prefix + '_OPEN');
  await rows.first().click();
  await waitV21RenderEvent(page, role, 'cliente360', token, 0);
  await page.waitForSelector('.fichahdr', { timeout: 15000 });
  return page.evaluate(() => ({
    opened: !!document.querySelector('.fichahdr'),
    health: !!document.querySelector('.fh-salud'),
    tabs: document.querySelectorAll('.ftab').length,
    body: !!document.getElementById('c360-body'),
    route: window.Orbit && Orbit.route && Orbit.route.key || ''
  }));
}
async function v22ClientRelationsHonest(page) {
  return page.evaluate(async () => {
    const body = document.getElementById('c360-body');
    const tab = document.querySelector('.ftab[data-tab="vehiculos"]');
    if (!body || !tab) return { ok: false, tabPresent: !!tab, bodyPresent: !!body, populated: false, honestEmpty: false };
    tab.click();
    await new Promise(resolve => setTimeout(resolve, 40));
    const text = (body.innerText || '').trim();
    const populated = body.querySelectorAll('.card,.tbl tbody tr').length > 0 && !/Sin vehículos|no tiene vehículos/i.test(text);
    const honestEmpty = /Sin vehículos|no tiene vehículos asegurados|Sin resultados/i.test(text);
    return { ok: populated || honestEmpty, tabPresent: true, bodyPresent: true, populated, honestEmpty };
  });
}
async function v22InsurerContract(page) {
  const directory = await page.evaluate(() => ({
    cards: document.querySelectorAll('.asg-grid [data-asg]').length,
    search: !!document.getElementById('asg-q'),
    countryFilter: !!document.getElementById('asg-fpais'),
    order: !!document.getElementById('asg-order'),
    kpis: document.querySelectorAll('.kpi').length,
    readOnlyNote: /Vista de solo lectura/i.test((document.getElementById('host') && document.getElementById('host').innerText || ''))
  }));
  if (directory.cards < 1) return { directory, ficha: { opened: false }, knowledge: { ok: false } };
  await page.locator('.asg-grid [data-asg]').first().click();
  await page.waitForSelector('#asg-ficha', { timeout: 15000 });
  const ficha = await page.evaluate(() => ({
    opened: !!document.getElementById('asg-ficha'),
    tabs: document.querySelectorAll('#asg-ficha [data-tab]').length,
    hasResumen: !!document.querySelector('#asg-ficha [data-tab="resumen"]'),
    hasDocumentos: !!document.querySelector('#asg-ficha [data-tab="documentos"]')
  }));
  const docs = page.locator('#asg-ficha [data-tab="documentos"]');
  if (await docs.count()) await docs.first().click();
  await new Promise(resolve => setTimeout(resolve, 120));
  const knowledge = await page.evaluate(() => {
    const root = document.getElementById('asg-ficha');
    const text = root ? (root.innerText || '') : '';
    const hasKnowledgeLanguage = /Conocimiento|Fuentes|Documento|Mapeado|Persistido|Sin conocimiento adicional/i.test(text);
    return { ok: !!root && hasKnowledgeLanguage, hasKnowledgeLanguage };
  });
  const close = page.locator('#asg-ficha [data-close],#asg-ficha .imp-x');
  if (await close.count()) await close.first().click().catch(() => {});
  return { directory, ficha, knowledge };
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

    const shell = await v22ShellState(page);
    add('membership-ready', shell.membershipReady && shell.membershipTenantBound, 'tenant-bound membership');
    add('multirol-assigned', shell.assignedRoleCount >= 1 && shell.roleSelectorPresent, 'assignedRoleCount=' + shell.assignedRoleCount);
    add('scope-cliente360-visible', shell.canCliente360 && shell.clienteNavPresent, 'cliente360 visible');
    add('scope-aseguradoras-visible', shell.canAseguradoras && shell.insurerNavPresent, 'aseguradoras visible');
    if (role === 'Asesor') add('advisor-scope-bound', shell.advisorBound, 'advisor bound');
    add('legal-accepted-once', shell.legalAccepted, 'acceptance persisted');
    const mobile = await v22MobileMenuCheck(page, role);
    add('mobile-menu-contract', mobile.ok, JSON.stringify(mobile));
    screenshots.push(await capture(page, role.toLowerCase() + '-inicio-v22'));

    routeTimings.cliente360 = await go(page, role, 'cliente360');
    add('cliente360-ready-under-30s', routeTimings.cliente360 <= 30000, routeTimings.cliente360 + 'ms');
    const cList = await v22ClienteListContract(page);
    add('cliente360-list-bounded', cList.bounded && cList.pageSize === 40 && cList.renderedRows <= 40 && cList.domRows <= 40 && cList.pagination, JSON.stringify(cList));
    add('cliente360-list-honest', cList.emptyHonest, 'visible or honest empty');
    const cView = await viewportCheck(page);
    add('cliente360-responsive', cView.titleOverflow === 0 && cView.documentWidth <= cView.viewportWidth + 4, JSON.stringify(cView));
    let tech = await v22TechnicalCopyFree(page);
    add('cliente360-no-technical-copy', tech.ok, tech.match || 'clean');
    screenshots.push(await capture(page, role.toLowerCase() + '-cliente360-v22'));

    const ficha = await v22OpenFirstClientFicha(page, role);
    add('cliente360-ficha', ficha.opened && ficha.health && ficha.body && ficha.tabs >= 3, JSON.stringify(ficha));
    const relations = ficha.opened ? await v22ClientRelationsHonest(page) : { ok: false };
    add('cliente360-relations-honest', relations.ok, JSON.stringify(relations));
    if (ficha.opened) screenshots.push(await capture(page, role.toLowerCase() + '-cliente360-ficha-v22'));

    routeTimings.aseguradoras = await go(page, role, 'aseguradoras');
    add('aseguradoras-ready-under-30s', routeTimings.aseguradoras <= 30000, routeTimings.aseguradoras + 'ms');
    const insurer = await v22InsurerContract(page);
    add('aseguradoras-directorio', insurer.directory.cards > 0 && insurer.directory.search && insurer.directory.countryFilter && insurer.directory.order && insurer.directory.kpis >= 1, JSON.stringify(insurer.directory));
    add('aseguradoras-ficha', insurer.ficha.opened && insurer.ficha.tabs >= 3 && insurer.ficha.hasResumen && insurer.ficha.hasDocumentos, JSON.stringify(insurer.ficha));
    add('aseguradoras-conocimiento', insurer.knowledge.ok, JSON.stringify(insurer.knowledge));
    const aView = await viewportCheck(page);
    add('aseguradoras-responsive', aView.titleOverflow === 0 && aView.documentWidth <= aView.viewportWidth + 4, JSON.stringify(aView));
    tech = await v22TechnicalCopyFree(page);
    add('aseguradoras-no-technical-copy', tech.ok, tech.match || 'clean');
    screenshots.push(await capture(page, role.toLowerCase() + '-aseguradoras-v22'));

    const legalAfter = await v22ShellState(page);
    add('legal-not-repeated-after-navigation', legalAfter.legalAccepted && !/confidencialidad.*aceptar/i.test(await v22VisibleText(page)), 'persisted/no repeated blocker');
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
    mark(role.toUpperCase() + '_COMPLETE', { failed: failed.length, warnings: warnings.length, gateScope: 'BLOCK1_CLIENT360_INSURERS' });
    return roleResult;
  } finally {
    await context.close();
  }
}

`;

function count(source, token) {
  return source.split(token).length - 1;
}

export function buildV22MatrixArtifact() {
  let source = buildV21MatrixArtifact();
  if (!entityTargetsPattern.test(source)) throw new Error('PIPELINE_MECHANISM_FAILURE_V22_ENTITY_TARGET_BLOCK_NOT_FOUND');
  if (!testRolePattern.test(source)) throw new Error('PIPELINE_MECHANISM_FAILURE_V22_TEST_ROLE_BLOCK_NOT_FOUND');

  source = source.replace(entityTargetsPattern, entityTargetsReplacement);
  source = source.replace(testRolePattern, testRoleReplacement);
  source = source.replace('orbit360-visual-observable-rootfix-matrix-v21-event-driven-render-gated', V22_MATRIX_SCHEMA);
  source = source.replace(
    "readinessAuthority: 'OrbitHydrationContractDiagnostics',",
    "readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  blockingGateScope: 'BLOCK1_CLIENT360_INSURERS',\n  blockingRoutes: ['inicio','cliente360','aseguradoras'],\n  excludedLegacyBlockers: ['polizas','cobros','ops','leads','conciliaciones','cancelaciones'],"
  );
  source = source.replace('PASS_V21_EXACT_MATRIX_ARTIFACT_IMPORT', 'PASS_V22_EXACT_MATRIX_ARTIFACT_IMPORT');

  const forbiddenBlockingTokens = [
    "['cliente360', 'polizas'",
    "['cliente360', 'polizas', 'cobros'",
    "vehicle-detail-button",
    "receipt-detail-button",
    "cobro-detail-button",
    "polizas-kpis-stable"
  ];
  const requiredTokens = [
    "go(page, role, 'cliente360')",
    "go(page, role, 'aseguradoras')",
    "BLOCK1_CLIENT360_INSURERS",
    "cliente360-list-bounded",
    "cliente360-ficha",
    "cliente360-relations-honest",
    "aseguradoras-directorio",
    "aseguradoras-ficha",
    "aseguradoras-conocimiento",
    "multirol-assigned",
    "advisor-scope-bound",
    "mobile-menu-contract",
    "legal-accepted-once",
    "no-technical-copy",
    "new MutationObserver",
    "orbit360:v21-render-complete"
  ];
  if (
    source.includes("async function entityTargets(db) {\n  const [clients, policies, vehicles, receipts, payments]") ||
    forbiddenBlockingTokens.some(token => source.includes(token)) ||
    requiredTokens.some(token => !source.includes(token)) ||
    count(source, 'async function testRole(browser, matrix, member, targets)') !== 1 ||
    !source.includes(`schemaVersion: '${V22_MATRIX_SCHEMA}'`)
  ) throw new Error('PIPELINE_MECHANISM_FAILURE_V22_BLOCK1_SCOPE_INVARIANT_FAILED');
  return source;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('V22_MATRIX_ARTIFACT_OUTPUT_PATH_REQUIRED');
  const source = buildV22MatrixArtifact();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), source, 'utf8');
  console.log(JSON.stringify({ status: 'PASS_V22_MATRIX_ARTIFACT_GENERATED', output: path.resolve(out), bytes: Buffer.byteLength(source), ok: true }));
}
