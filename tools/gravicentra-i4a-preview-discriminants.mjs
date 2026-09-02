import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const PREVIEW_URL = process.env.PREVIEW_URL;
const SOURCE_SHA = process.env.SOURCE_SHA;
const BUILD_ID = process.env.BUILD_ID;
const TENANT_ID = process.env.TENANT_ID;
const EXPECTED_CLIENTS = Number(process.env.EXPECTED_CLIENTS || '430');
const SA_FILE = process.env.I4A_SERVICE_ACCOUNT_FILE;
const EVIDENCE_DIR = process.env.I4A_EVIDENCE_DIR || path.join(process.cwd(), 'i4a-evidence');
const PRIVILEGED = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo'];
const ROLE_ALIAS = new Map([
  ['direccion','Dirección'],['dirección','Dirección'],['director','Dirección'],
  ['superadmin','SuperAdmin'],['super admin','SuperAdmin'],['super_admin','SuperAdmin'],['super-admin','SuperAdmin'],
  ['admin','AdminTenant'],['administrador','AdminTenant'],['admin tenant','AdminTenant'],['admin_tenant','AdminTenant'],['admintenant','AdminTenant'],
  ['operativo','Operativo'],['operaciones','Operativo']
]);

function req(value, name) { if (!value) throw new Error(`I4A_ENV_MISSING:${name}`); return value; }
function clean(value) { return String(value == null ? '' : value).trim(); }
function canonRole(value) {
  const raw = clean(value);
  if (PRIVILEGED.includes(raw)) return raw;
  return ROLE_ALIAS.get(raw.toLowerCase().replace(/\s+/g, ' ')) || '';
}
function membershipRoles(row) {
  const values = Array.isArray(row.roles) ? row.roles : Array.isArray(row.rolesAsignados) ? row.rolesAsignados : [row.role || row.rol].filter(Boolean);
  return [...new Set(values.map(canonRole).filter(Boolean))];
}
function redact(text) {
  return clean(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/\b[A-Za-z0-9_-]{28,}\b/g, '[token-redacted]')
    .slice(0, 700);
}
function assert(condition, code, detail = '') {
  if (!condition) throw new Error(detail ? `${code}:${detail}` : code);
}
function now() { return Date.now(); }
async function heartbeat(page, timeoutMs = 2000) {
  const started = now();
  await Promise.race([
    page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('BROWSER_HEARTBEAT_TIMEOUT')), timeoutMs))
  ]);
  return now() - started;
}
async function setHashAndWait(page, hash, predicate, timeout = 8000) {
  const started = now();
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForFunction(predicate, null, { timeout });
  return now() - started;
}

req(PREVIEW_URL, 'PREVIEW_URL'); req(SOURCE_SHA, 'SOURCE_SHA'); req(BUILD_ID, 'BUILD_ID'); req(TENANT_ID, 'TENANT_ID'); req(SA_FILE, 'I4A_SERVICE_ACCOUNT_FILE');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const evidencePath = path.join(EVIDENCE_DIR, 'i4a-discriminants.json');
const evidence = {
  schemaVersion: 'gravicentra-recovery-i4a-discriminants-v1',
  gate: 'I4A', status: 'RUNNING', sourceSha: SOURCE_SHA, buildId: BUILD_ID, previewUrl: PREVIEW_URL,
  expectedClients: EXPECTED_CLIENTS, productionTouched: false, operationalDataTouched: false,
  firestoreWritesPerformed: 0, authUsersMutated: false, credentialValuesRead: false, screenshotsCaptured: false,
  discriminants: {}, roleCoverage: { requiredPrivilegedRoles: PRIVILEGED, discovered: [], tested: [] }, errors: []
};

let browser;
try {
  const serviceAccount = JSON.parse(fs.readFileSync(SA_FILE, 'utf8'));
  assert(clean(serviceAccount.project_id) === 'ays-orbit-360-lab', 'I4A_SERVICE_ACCOUNT_PROJECT_MISMATCH');
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  const adminAuth = getAuth(app);
  const db = getFirestore(app);

  const snap = await db.collection('tenants').doc(TENANT_ID).collection('members').get();
  const candidates = [];
  for (const doc of snap.docs) {
    const row = doc.data() || {};
    if (clean(row.tenantId || TENANT_ID) !== TENANT_ID) continue;
    if (row.enabled === false || row.active === false || row.estado === 'Inactivo' || row.status === 'disabled') continue;
    const roles = membershipRoles(row);
    if (!roles.some(r => PRIVILEGED.includes(r))) continue;
    const uid = clean(row.uid || doc.id);
    if (!uid) continue;
    try {
      const authUser = await adminAuth.getUser(uid);
      if (authUser.disabled || authUser.emailVerified !== true) continue;
      candidates.push({ uid, roles, score: roles.reduce((n, r) => n + (PRIVILEGED.includes(r) ? 1 : 0), 0) });
    } catch (_) {}
  }
  assert(candidates.length > 0, 'I4A_NO_VERIFIED_PRIVILEGED_IDENTITY');
  candidates.sort((a,b) => b.score - a.score);

  const roleIdentity = new Map();
  for (const role of PRIVILEGED) {
    const found = candidates.find(c => c.roles.includes(role));
    if (found) roleIdentity.set(role, found);
  }
  evidence.roleCoverage.discovered = [...roleIdentity.keys()];
  const primary = candidates[0];
  const primaryRole = PRIVILEGED.find(r => primary.roles.includes(r));
  assert(primaryRole, 'I4A_PRIMARY_PRIVILEGED_ROLE_MISSING');

  browser = await chromium.launch({ headless: true });

  const makePage = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const telemetry = { consoleErrors: [], pageErrors: [], requestFailures: [], httpErrors: [] };
    page.on('console', msg => { if (msg.type() === 'error') telemetry.consoleErrors.push(redact(msg.text())); });
    page.on('pageerror', err => telemetry.pageErrors.push(redact(err && (err.stack || err.message || err))));
    page.on('requestfailed', request => {
      try { if (new URL(request.url()).origin === new URL(PREVIEW_URL).origin) telemetry.requestFailures.push(redact(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText || ''}`)); } catch (_) {}
    });
    page.on('response', response => {
      try { if (new URL(response.url()).origin === new URL(PREVIEW_URL).origin && response.status() >= 400) telemetry.httpErrors.push(`${response.status()} ${new URL(response.url()).pathname}`); } catch (_) {}
    });
    await page.addInitScript(() => {
      window.__I4A_BROWSER__ = { projectionSelfEvents: 0, storeEvents: 0 };
      window.addEventListener('orbit:store:emit', event => {
        window.__I4A_BROWSER__.storeEvents += 1;
        if (event && event.detail && event.detail.source === 'client-canonical-view-projection') window.__I4A_BROWSER__.projectionSelfEvents += 1;
      });
    });
    return { context, page, telemetry };
  };

  const authPage = async (page, candidate, targetRole) => {
    const token = await adminAuth.createCustomToken(candidate.uid, { i4aPreviewQa: true });
    const started = now();
    const status = await page.evaluate(async ({ token, targetRole }) => {
      const provider = window.Orbit && Orbit.productRuntimeBrowserProvidersP0;
      if (!provider || typeof provider.initialize !== 'function') throw new Error('I4A_PRODUCT_PROVIDER_MISSING');
      const ctx = await provider.initialize();
      await ctx.modules.auth.signInWithCustomToken(ctx.auth, token);
      const out = await Orbit.productAppP0.activate();
      if (targetRole && Orbit.session && typeof Orbit.session.allowedRoles === 'function' && typeof Orbit.session.set === 'function') {
        const allowed = Orbit.session.allowedRoles();
        if (allowed.includes(targetRole)) Orbit.session.set(targetRole);
      }
      return {
        app: out,
        activeRole: Orbit.session && Orbit.session.rol ? Orbit.session.rol() : '',
        allowedRoles: Orbit.session && Orbit.session.allowedRoles ? Orbit.session.allowedRoles() : [],
        store: Orbit.store && Orbit.store._productStatus ? Orbit.store._productStatus() : {}
      };
    }, { token, targetRole });
    return { elapsedMs: now() - started, status };
  };

  // Primary discriminants: startup/login, Cliente 360 and Pólizas.
  {
    const { context, page, telemetry } = await makePage();
    const navStart = now();
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const initialDomMs = now() - navStart;
    await page.waitForSelector('#login-form', { state: 'visible', timeout: 5000 });
    const marker = await page.evaluate(async () => {
      const response = await fetch('/__recovery__/build.json?i4a=1', { cache: 'no-store' });
      return { status: response.status, body: await response.json() };
    });
    assert(marker.status === 200, 'I4A_BUILD_MARKER_HTTP_FAIL', String(marker.status));
    assert(marker.body.sourceSha === SOURCE_SHA, 'I4A_SOURCE_SHA_MISMATCH');
    assert(marker.body.buildId === BUILD_ID, 'I4A_BUILD_ID_MISMATCH');
    const auth = await authPage(page, primary, primaryRole);
    assert(auth.elapsedMs < 20000, 'I4A_ACTIVATION_PERFORMANCE_FAIL', `${auth.elapsedMs}ms`);
    assert(auth.status.app && auth.status.app.started === true, 'I4A_PRODUCT_APP_NOT_STARTED');
    assert(auth.status.store && auth.status.store.ready === true, 'I4A_PRODUCT_STORE_NOT_READY');
    const startupBeat = await heartbeat(page);
    evidence.discriminants.startup = {
      pass: true, initialDomMs, activationMs: auth.elapsedMs, heartbeatMs: startupBeat,
      sourceShaExact: true, buildIdExact: true, storeReady: true, routerStarted: auth.status.app.routerStarted === true,
      activeRoleClass: PRIVILEGED.includes(auth.status.activeRole) ? 'privileged' : 'other'
    };

    const clientRouteMs = await setHashAndWait(page, '#/cliente360', () => {
      const d = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 && OrbitRuntimeDiagnostics.cliente360.list;
      return !!(document.querySelector('#host table.tbl tbody') && d && d.totalRows >= 0);
    });
    const client = await page.evaluate(() => {
      const d = window.OrbitRuntimeDiagnostics && OrbitRuntimeDiagnostics.cliente360 && OrbitRuntimeDiagnostics.cliente360.list || {};
      const rows = [...document.querySelectorAll('#host table.tbl tbody tr')].filter(tr => tr.querySelector('td') && !/Sin resultados/i.test(tr.innerText));
      return {
        storeCount: Orbit.store.all('clientes').length,
        diagnosticsTotal: Number(d.totalRows), renderedRows: Number(d.renderedRows), domRows: rows.length,
        projectionSelfEvents: window.__I4A_BROWSER__?.projectionSelfEvents || 0,
        storeEvents: window.__I4A_BROWSER__?.storeEvents || 0
      };
    });
    assert(client.storeCount === EXPECTED_CLIENTS, 'I4A_CLIENT_STORE_COUNT_MISMATCH', `${client.storeCount}`);
    assert(client.diagnosticsTotal === EXPECTED_CLIENTS, 'I4A_CLIENT_DIAGNOSTICS_COUNT_MISMATCH', `${client.diagnosticsTotal}`);
    assert(client.renderedRows > 0 && client.domRows > 0, 'I4A_CLIENT_TABLE_NOT_MATERIALIZED');
    assert(client.projectionSelfEvents === 0, 'I4A_CLIENT_PROJECTION_FEEDBACK_EVENT_DETECTED', `${client.projectionSelfEvents}`);
    const clientBeat = await heartbeat(page);
    evidence.discriminants.cliente360 = { pass: true, routeMs: clientRouteMs, heartbeatMs: clientBeat, ...client };

    const policyRouteMs = await setHashAndWait(page, '#/polizas', () => !!document.querySelector('#host table.tbl tbody'));
    const policy = await page.evaluate(() => {
      const count = Orbit.store.all('polizas').length;
      const rows = [...document.querySelectorAll('#host table.tbl tbody tr')].filter(tr => tr.querySelector('td') && !/Sin resultados/i.test(tr.innerText));
      return { storeCount: count, domRows: rows.length, hostTextLength: document.getElementById('host')?.innerText.length || 0 };
    });
    assert(policy.storeCount >= 0, 'I4A_POLICY_STORE_UNAVAILABLE');
    if (policy.storeCount > 0) assert(policy.domRows > 0, 'I4A_POLICY_TABLE_NOT_MATERIALIZED');
    assert(policy.hostTextLength > 0, 'I4A_POLICY_HOST_BLANK');
    const policyBeat = await heartbeat(page);
    evidence.discriminants.polizas = { pass: true, routeMs: policyRouteMs, heartbeatMs: policyBeat, ...policy };

    await page.waitForTimeout(400);
    assert(telemetry.pageErrors.length === 0, 'I4A_PAGE_ERRORS', telemetry.pageErrors.join('|'));
    assert(telemetry.consoleErrors.length === 0, 'I4A_CONSOLE_ERRORS', telemetry.consoleErrors.join('|'));
    assert(telemetry.requestFailures.length === 0, 'I4A_REQUEST_FAILURES', telemetry.requestFailures.join('|'));
    assert(telemetry.httpErrors.length === 0, 'I4A_HTTP_ERRORS', telemetry.httpErrors.join('|'));
    evidence.discriminants.primaryTelemetry = { pass: true, ...telemetry };
    await context.close();
  }

  // Aseguradoras discriminant over every privileged role for which a verified existing identity is available.
  const insurerRoleResults = [];
  for (const [role, candidate] of roleIdentity.entries()) {
    const { context, page, telemetry } = await makePage();
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#login-form', { state: 'visible', timeout: 5000 });
    const auth = await authPage(page, candidate, role);
    assert(auth.elapsedMs < 20000, `I4A_${role}_ACTIVATION_PERFORMANCE_FAIL`, `${auth.elapsedMs}ms`);
    assert(auth.status.activeRole === role, 'I4A_ROLE_SWITCH_NOT_EFFECTIVE', role);

    const target = await page.evaluate(() => {
      const rows = Orbit.store.all('aseguradoras') || [];
      const candidates = rows.map(a => {
        const portals = Array.isArray(a.portales) ? a.portales : [];
        const accounts = Array.isArray(a.cuentas) ? a.cuentas : [];
        const credentialPortal = portals.findIndex(p => p && (p.credentialRef || p.password || p.pass || p.contrasena || p.clave));
        return { id: a.id, credentialPortal, hasAccounts: accounts.length > 0 };
      });
      return candidates.find(x => x.credentialPortal >= 0 && x.hasAccounts) || candidates.find(x => x.credentialPortal >= 0) || null;
    });
    assert(target && target.id, 'I4A_INSURER_WITH_CREDENTIAL_NOT_AVAILABLE', role);
    await setHashAndWait(page, `#/aseguradoras?ficha=${encodeURIComponent(target.id)}`, () => !!document.getElementById('asg-ficha'));
    const pre = await page.evaluate(() => ({
      ownerVersion: Orbit.clientInsurerOperationalDirectoryOwnerV20260722 && Orbit.clientInsurerOperationalDirectoryOwnerV20260722.version,
      resourcesOverlayPresent: !!(Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.__op2OperationalResourcesV1218),
      closureOverlayPresent: !!Orbit.__aseguradorasOp2ClosureV1218
    }));
    assert(pre.ownerVersion === '20260829.1', 'I4A_INSURER_CANONICAL_OWNER_VERSION_MISMATCH', clean(pre.ownerVersion));
    assert(pre.resourcesOverlayPresent === false && pre.closureOverlayPresent === false, 'I4A_INSURER_SUPERSEDED_OVERLAY_PRESENT');

    const platformTab = page.locator('[data-tab="plataformas"]').first();
    assert(await platformTab.count() > 0, 'I4A_INSURER_PLATFORM_TAB_MISSING', role);
    await platformTab.click();
    await page.waitForTimeout(250);
    const portal = await page.evaluate(() => {
      const users = [...document.querySelectorAll('[data-od-credential-user]')];
      const reveal = [...document.querySelectorAll('[data-od-credential-reveal]')];
      const restricted = [...document.querySelectorAll('#asg-ficha button')].some(b => /Acceso restringido/i.test(b.textContent || ''));
      return { userFields: users.length, revealButtons: reveal.length, restricted };
    });
    assert(portal.userFields > 0, 'I4A_INSURER_USERNAME_UI_MISSING', role);
    assert(portal.revealButtons > 0, 'I4A_INSURER_PASSWORD_REVEAL_UI_MISSING', role);
    assert(portal.restricted === false, 'I4A_INSURER_CREDENTIALS_RESTRICTED_FOR_PRIVILEGED_ROLE', role);

    let bank = { numberFields: 0, tested: false };
    if (target.hasAccounts) {
      const bankTab = page.locator('[data-tab="bancos"]').first();
      if (await bankTab.count() > 0) {
        await bankTab.click(); await page.waitForTimeout(250);
        bank = await page.evaluate(() => ({ numberFields: document.querySelectorAll('[data-od-bank-number]').length, tested: true }));
        assert(bank.numberFields > 0, 'I4A_INSURER_BANK_NUMBER_UI_MISSING', role);
      }
    }
    const beat = await heartbeat(page);
    await page.waitForTimeout(250);
    assert(telemetry.pageErrors.length === 0, 'I4A_INSURER_PAGE_ERRORS', `${role}:${telemetry.pageErrors.join('|')}`);
    assert(telemetry.consoleErrors.length === 0, 'I4A_INSURER_CONSOLE_ERRORS', `${role}:${telemetry.consoleErrors.join('|')}`);
    assert(telemetry.requestFailures.length === 0, 'I4A_INSURER_REQUEST_FAILURES', `${role}:${telemetry.requestFailures.join('|')}`);
    assert(telemetry.httpErrors.length === 0, 'I4A_INSURER_HTTP_ERRORS', `${role}:${telemetry.httpErrors.join('|')}`);
    insurerRoleResults.push({ role, pass: true, activationMs: auth.elapsedMs, heartbeatMs: beat, ownerVersion: pre.ownerVersion, overlaysAbsent: true, portal, bank });
    evidence.roleCoverage.tested.push(role);
    await context.close();
  }
  assert(insurerRoleResults.length > 0, 'I4A_INSURER_ROLE_COVERAGE_EMPTY');
  evidence.discriminants.aseguradoras = {
    pass: true,
    roleResults: insurerRoleResults,
    completeRequiredRoleCoverage: PRIVILEGED.every(r => evidence.roleCoverage.tested.includes(r))
  };

  evidence.status = 'DISCRIMINANTS_PASS';
} catch (error) {
  evidence.status = 'DISCRIMINANTS_FAIL';
  evidence.errors.push(redact(error && (error.stack || error.message || error)));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  console.log(`I4A_DISCRIMINANTS_STATUS=${evidence.status}`);
  console.log(`I4A_EVIDENCE_PATH=${evidencePath}`);
}
