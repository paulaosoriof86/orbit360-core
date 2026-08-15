#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const TARGET = String(process.env.ORBIT360_R4_URL || 'https://app.aysseguros.com').trim();
const TENANT = String(process.env.ORBIT360_PRODUCT_TENANT_ID || 'alianzas-soluciones').trim();
const SOURCE = String(process.env.ORBIT360_R4_PACKAGE_SOURCE_HEAD || '4f70f0dd6e870e8c7443a7638a9dc6e954eace1b').trim();
const FILES = Number(process.env.ORBIT360_R4_PACKAGE_FILE_COUNT || 194);
const EXPECTED_AUTH_SHA256 = String(process.env.ORBIT360_R4_EXPECTED_AUTH_SHA256 || '').trim().toLowerCase();
const EMAIL = String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL || '').trim();
const PASSWORD = String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD || '');
const SYNTHETIC_MODE = String(process.env.ORBIT360_R4_SYNTHETIC_MODE || '').trim();
const OUT = path.resolve(String(process.env.ORBIT360_R4_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4-production-readonly-smoke-v20260815.json')));
const GLOBAL_TIMEOUT_MS = Math.max(120000, Math.min(Number(process.env.ORBIT360_R4_GLOBAL_TIMEOUT_MS || 480000), 600000));
const SYNTHETIC_TIMEOUT_MS = Math.max(50, Math.min(Number(process.env.ORBIT360_R4_SYNTHETIC_TIMEOUT_MS || 120), 1000));
const TECH = /\b(firebase|firestore|localstorage|mock|smoke|backend_required|credentialref|service account|api key)\b|\bLAB\b/ig;
const txt = v => String(v == null ? '' : v).trim();
const uniq = v => [...new Set([].concat(v || []).map(txt).filter(Boolean))];
const safe = v => txt(v)
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, '[email-redacted]')
  .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[api-key-redacted]')
  .replace(/Bearer\s+\S+/ig, 'Bearer [redacted]')
  .replace(/[A-Za-z0-9_-]{80,}/g, '[token-redacted]')
  .slice(0, 500);
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

class StageTimeoutError extends Error {
  constructor(stage, timeoutMs) {
    super(`R4_STAGE_TIMEOUT:${stage}:${timeoutMs}`);
    this.name = 'StageTimeoutError';
    this.stage = stage;
    this.timeoutMs = timeoutMs;
  }
}
class ClassifiedError extends Error {
  constructor(classification, failureFamily, message = failureFamily) {
    super(message);
    this.name = 'ClassifiedError';
    this.classification = classification;
    this.failureFamily = failureFamily;
  }
}

let browser;
let context;
let terminalWritten = false;
let signalHandling = false;
let currentStage = 'INIT';
const startedAt = Date.now();
const deadlineAt = startedAt + GLOBAL_TIMEOUT_MS;
const d = {
  manifest: { pass: false },
  authAsset: { pass: false, httpStatus: 0, sha256Matches: false },
  authHttp: { seen: false, status: 0, errorCode: '' },
  auth: { signedIn: false, emailVerified: false, membershipAvailable: false, membershipActive: false, tenantMatches: false, roleCount: 0, requiredRolesPresent: false },
  runtime: { started: false },
  roles: [],
  pageErrors: [],
  consoleErrors: [],
  httpFailures: [],
  writeSignals: [],
  technicalCopy: [],
  checkpoints: [],
  currentStage,
  legalGateHandledLocally: false,
  cleanup: { browserCloseAttempted: false, browserClosed: false, browserCloseTimedOut: false }
};

function baseFlags(productionTouched = SYNTHETIC_MODE !== 'watchdog') {
  return { containsPII: false, containsSecrets: false, secretValuesLogged: false, writesAuthorized: false, deployExecuted: false, packageRebuilt: false, productionTouched };
}
function write(payload, productionTouched = SYNTHETIC_MODE !== 'watchdog') {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, ...baseFlags(productionTouched) }, null, 2) + '\n', 'utf8');
}
function writePartial() {
  if (terminalWritten) return;
  write({ schemaVersion: 'orbit360-r4-production-readonly-smoke-v2-bounded-observability', ok: false, status: 'R4_PRODUCTION_READONLY_SMOKE_IN_PROGRESS', classification: 'PENDING', failureFamily: '', currentStage, elapsedMs: Date.now() - startedAt, globalDeadlineMs: GLOBAL_TIMEOUT_MS, ...d });
}
function checkpoint(stage, state, extra = {}) {
  currentStage = stage;
  d.currentStage = stage;
  d.checkpoints.push({ stage, state, atMs: Date.now() - startedAt, ...extra });
  if (d.checkpoints.length > 160) d.checkpoints = d.checkpoints.slice(-160);
  console.log(`R4_STAGE|${stage}|${state}`);
  writePartial();
}
function normalizeEvidence() {
  d.pageErrors = uniq(d.pageErrors); d.consoleErrors = uniq(d.consoleErrors); d.httpFailures = uniq(d.httpFailures); d.writeSignals = uniq(d.writeSignals); d.technicalCopy = uniq(d.technicalCopy);
}
function failure(state) {
  if (state.writeSignals.length) return ['SECURITY_FAILURE', 'R4_UNEXPECTED_WRITE_SIGNAL'];
  if (!state.manifest.pass) return ['ENVIRONMENT_FAILURE', 'R4_PUBLISHED_PACKAGE_IDENTITY_MISMATCH'];
  if (!state.authAsset.pass) return ['ENVIRONMENT_FAILURE', 'R4_PUBLISHED_AUTH_ASSET_MISMATCH'];
  if (state.authHttp.status >= 400) return ['DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_CREDENTIAL_REJECTED'];
  if (state.auth.signedIn && !state.auth.emailVerified) return ['DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_EMAIL_NOT_VERIFIED'];
  if (state.auth.signedIn && !state.auth.membershipAvailable) return ['DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_MEMBERSHIP_MISSING'];
  if (state.auth.membershipAvailable && !state.auth.membershipActive) return ['DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_MEMBERSHIP_INACTIVE'];
  if (state.auth.membershipAvailable && !state.auth.tenantMatches) return ['SECURITY_FAILURE', 'R4_SMOKE_IDENTITY_TENANT_MISMATCH'];
  if (!state.runtime.started) return ['FUNCTIONAL_DEFECT', 'R4_PRODUCT_ACTIVATION_FAILED_AFTER_AUTH'];
  if (state.pageErrors.length || state.consoleErrors.length || state.httpFailures.length) return ['FUNCTIONAL_DEFECT', 'R4_BROWSER_RUNTIME_ERRORS'];
  if (state.technicalCopy.length) return ['FUNCTIONAL_DEFECT', 'R4_TECHNICAL_COPY_VISIBLE'];
  if (state.roles.some(r => !r.pass)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_OR_SCOPE_MISMATCH'];
  return ['PIPELINE_MECHANISM_FAILURE', 'R4_SMOKE_UNCLASSIFIED_FAILURE'];
}
function classifyTimeout(stage) {
  if (stage === 'GLOBAL_DEADLINE') return ['PIPELINE_MECHANISM_FAILURE', 'R4_HARNESS_GLOBAL_DEADLINE_EXCEEDED'];
  if (/^(playwright-import|browser-launch|browser-context|target-navigation|login-form-visible|manifest-fetch|auth-asset-fetch)$/.test(stage)) return ['ENVIRONMENT_FAILURE', `R4_${stage.toUpperCase().replace(/-/g, '_')}_TIMEOUT`];
  if (/^(login-submit|login-http-response|auth-projection)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_TIMEOUT`];
  if (stage === 'membership-read') return ['DATA_CONTRACT_FAILURE', 'R4_MEMBERSHIP_READ_TIMEOUT'];
  if (stage === 'runtime-activation') return ['FUNCTIONAL_DEFECT', 'R4_RUNTIME_ACTIVATION_TIMEOUT'];
  if (/^role-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_TIMEOUT'];
  return ['PIPELINE_MECHANISM_FAILURE', `R4_HARNESS_STAGE_TIMEOUT_${stage.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`];
}
function classifyStageFailure(stage) {
  if (/^(playwright-import|browser-launch|browser-context|page-create|target-navigation|login-form-visible|manifest-fetch|manifest-json|auth-asset-fetch|auth-asset-body)$/.test(stage)) return ['ENVIRONMENT_FAILURE', `R4_${stage.toUpperCase().replace(/-/g, '_')}_FAILED`];
  if (/^(login-submit|login-http-response|auth-error-body|auth-projection)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_FAILED`];
  if (stage === 'membership-read') return ['DATA_CONTRACT_FAILURE', 'R4_MEMBERSHIP_READ_FAILED'];
  if (/^(runtime-activation|runtime-snapshot|runtime-final-snapshot|privileged-snapshot|legal-gate-local)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_FAILED`];
  if (/^role-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_FAILED'];
  return failure(d);
}
function remainingMs(requestedMs) {
  const remaining = deadlineAt - Date.now() - 5000;
  if (remaining <= 0) throw new StageTimeoutError('GLOBAL_DEADLINE', GLOBAL_TIMEOUT_MS);
  return Math.max(1, Math.min(requestedMs, remaining));
}
async function withTimeout(stage, requestedMs, task) {
  const timeoutMs = remainingMs(requestedMs);
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(task), new Promise((_, reject) => { timer = setTimeout(() => reject(new StageTimeoutError(stage, timeoutMs)), timeoutMs); })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function runStage(stage, timeoutMs, task, passExtra = () => ({})) {
  checkpoint(stage, 'START');
  try { const value = await withTimeout(stage, timeoutMs, task); checkpoint(stage, 'PASS', passExtra(value)); return value; }
  catch (error) { checkpoint(stage, 'FAIL', { error: safe(error && error.message || error) }); throw error; }
}
function writeTerminal(ok, status, classification, failureFamily, extra = {}) {
  if (terminalWritten) return;
  terminalWritten = true; normalizeEvidence();
  write({ schemaVersion: 'orbit360-r4-production-readonly-smoke-v2-bounded-observability', ok, status, classification, failureFamily, currentStage, elapsedMs: Date.now() - startedAt, globalDeadlineMs: GLOBAL_TIMEOUT_MS, ...d, ...extra, firestoreWrites: 0, authWrites: 0, operationalWrites: 0 });
}
async function closeBrowserBounded() {
  if (!browser) return;
  d.cleanup.browserCloseAttempted = true;
  try { await Promise.race([browser.close(), new Promise((_, reject) => setTimeout(() => reject(new StageTimeoutError('browser-close', 5000)), 5000))]); d.cleanup.browserClosed = true; }
  catch { d.cleanup.browserCloseTimedOut = true; }
}
async function handleSignal(signal) {
  if (signalHandling) return;
  signalHandling = true; currentStage = `SIGNAL_${signal}`; d.currentStage = currentStage; d.checkpoints.push({ stage: currentStage, state: 'FAIL', atMs: Date.now() - startedAt });
  writeTerminal(false, 'R4_PRODUCTION_READONLY_SMOKE_FAIL', 'PIPELINE_MECHANISM_FAILURE', 'R4_HARNESS_SIGNAL_INTERRUPTED', { error: signal });
  await closeBrowserBounded(); process.exit(41);
}
process.once('SIGTERM', () => { void handleSignal('SIGTERM'); });
process.once('SIGINT', () => { void handleSignal('SIGINT'); });

async function runSyntheticWatchdog() {
  let stageTimeoutObserved = false;
  let evidencePersistedBeforeTimeout = false;
  checkpoint('synthetic-watchdog', 'START');
  try { await runStage('synthetic-hang', SYNTHETIC_TIMEOUT_MS, () => new Promise(() => {})); }
  catch (error) {
    stageTimeoutObserved = error instanceof StageTimeoutError && error.stage === 'synthetic-hang';
    if (fs.existsSync(OUT)) {
      const partial = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      evidencePersistedBeforeTimeout = partial.currentStage === 'synthetic-hang' && Array.isArray(partial.checkpoints) && partial.checkpoints.some(x => x.stage === 'synthetic-hang' && x.state === 'START');
    }
    checkpoint('synthetic-watchdog', stageTimeoutObserved && evidencePersistedBeforeTimeout ? 'PASS' : 'FAIL', { stageTimeoutObserved, evidencePersistedBeforeTimeout });
  }
  const ok = stageTimeoutObserved && evidencePersistedBeforeTimeout;
  writeTerminal(ok, ok ? 'R4_HARNESS_SOURCE_ONLY_WATCHDOG_PASS' : 'R4_HARNESS_SOURCE_ONLY_WATCHDOG_FAIL', ok ? 'PASS' : 'PIPELINE_MECHANISM_FAILURE', ok ? '' : 'R4_HARNESS_SYNTHETIC_WATCHDOG_FAILED', { synthetic: true, productionTouched: false, stageTimeoutObserved, evidencePersistedBeforeTimeout });
  if (!ok) process.exitCode = 41;
}

async function captureRuntime(page) {
  return page.evaluate(() => {
    const a = window.Orbit && Orbit.productAppP0 && Orbit.productAppP0.status ? Orbit.productAppP0.status() : {};
    const t = window.Orbit && Orbit.productTenantRuntimeContextP0 && Orbit.productTenantRuntimeContextP0.status ? Orbit.productTenantRuntimeContextP0.status() : {};
    const s = window.Orbit && Orbit.store && Orbit.store._productStatus ? Orbit.store._productStatus() : {};
    const b = window.OrbitBackend || {};
    return { started: a.started === true, routerStarted: a.routerStarted === true, tenantContextReady: a.tenantContextReady === true, appLastError: String(a.lastError || '').slice(0, 160), tenantReady: t.ready === true, tenantId: String(t.tenantId || ''), backendMode: String(b.mode || ''), backendWriteAuthorized: b.writeAuthorized === true, storeReady: s.ready === true, storeStatus: String(s.status || ''), storeWriteEnabled: s.writeEnabled === true, requiredMissingCount: [].concat(s.requiredMissing || []).length, requiredFailedCount: [].concat(s.requiredFailed || []).length };
  });
}

async function runRuntime() {
  if (!TARGET.startsWith('https://') || !EMAIL || PASSWORD.length < 12 || !/^[a-f0-9]{64}$/.test(EXPECTED_AUTH_SHA256)) throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_SMOKE_PRECONDITION_NOT_BOUND');
  const { chromium } = await runStage('playwright-import', 15000, () => import('playwright'));
  browser = await runStage('browser-launch', 30000, () => chromium.launch({ headless: true }));
  context = await runStage('browser-context', 15000, () => browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: false, serviceWorkers: 'block' }));
  const page = await runStage('page-create', 10000, () => context.newPage());
  const host = new URL(TARGET).host;
  page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(45000);
  page.on('pageerror', e => d.pageErrors.push(safe(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') d.consoleErrors.push(safe(m.text())); });
  page.on('request', r => { const u = r.url(); if (/firestore\.googleapis\.com\/.+(documents:commit|documents:batchWrite|Firestore\/Write\/channel)/i.test(u) || /identitytoolkit\.googleapis\.com\/.+accounts:(signUp|update|delete)/i.test(u)) { try { d.writeSignals.push(safe(`${r.method()} ${new URL(u).pathname}`)); } catch {} } });
  page.on('requestfailed', r => { try { const u = new URL(r.url()); if (u.host === host) d.httpFailures.push(safe(`${r.method()} ${u.pathname} ${txt(r.failure() && r.failure().errorText)}`)); } catch {} });
  page.on('response', r => { try { const u = new URL(r.url()); if (u.host === host && r.status() >= 400) d.httpFailures.push(safe(`${r.status()} ${u.pathname}`)); } catch {} });

  const first = await runStage('target-navigation', 50000, () => page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 }), r => ({ httpStatus: r ? r.status() : 0 }));
  if (!first || first.status() >= 400 || new URL(page.url()).protocol !== 'https:') throw new ClassifiedError('ENVIRONMENT_FAILURE', 'R4_TARGET_HTTP_OR_TLS_FAILED');
  await runStage('login-form-visible', 20000, () => page.waitForSelector('#login-form', { state: 'visible', timeout: 15000 }));

  const manifestResponse = await runStage('manifest-fetch', 15000, () => context.request.get(`${TARGET.replace(/\/$/, '')}/orbit360-package-manifest.json`, { timeout: 12000, headers: { 'cache-control': 'no-cache' } }), r => ({ httpStatus: r.status() }));
  const manifest = manifestResponse.ok() ? await withTimeout('manifest-json', 5000, () => manifestResponse.json()) : { httpStatus: manifestResponse.status() };
  d.manifest = { pass: manifest && manifest.status === 'FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED' && manifest.sourceHead === SOURCE && Number(manifest.fileCount) === FILES && manifest.requiredHydrationCertified === true && manifest.dynamicRuntimeClosureCertified === true && manifest.productTenantContextCertified === true && manifest.routerRenderCertified === true && manifest.noLabRuntime === true && manifest.noPrivateSecretMaterial === true && manifest.writeAuthorized === false, status: txt(manifest && manifest.status), sourceHeadMatches: txt(manifest && manifest.sourceHead) === SOURCE, fileCount: Number(manifest && manifest.fileCount || 0), noLabRuntime: manifest && manifest.noLabRuntime === true, noPrivateSecretMaterial: manifest && manifest.noPrivateSecretMaterial === true };
  checkpoint('manifest-validated', d.manifest.pass ? 'PASS' : 'FAIL', { sourceHeadMatches: d.manifest.sourceHeadMatches, fileCount: d.manifest.fileCount });
  if (!d.manifest.pass) throw new ClassifiedError('ENVIRONMENT_FAILURE', 'R4_PUBLISHED_PACKAGE_IDENTITY_MISMATCH');

  const authAssetResponse = await runStage('auth-asset-fetch', 15000, () => context.request.get(`${TARGET.replace(/\/$/, '')}/core/auth.js`, { timeout: 12000, headers: { 'cache-control': 'no-cache' } }), r => ({ httpStatus: r.status() }));
  const authAssetBody = authAssetResponse.ok() ? await withTimeout('auth-asset-body', 5000, () => authAssetResponse.body()) : Buffer.alloc(0);
  const authAssetHash = authAssetBody.length ? sha256(authAssetBody) : '';
  d.authAsset = { pass: authAssetResponse.ok() && authAssetHash === EXPECTED_AUTH_SHA256, httpStatus: authAssetResponse.status(), sha256Matches: authAssetHash === EXPECTED_AUTH_SHA256 };
  checkpoint('auth-asset-validated', d.authAsset.pass ? 'PASS' : 'FAIL', { httpStatus: d.authAsset.httpStatus, sha256Matches: d.authAsset.sha256Matches });
  if (!d.authAsset.pass) throw new ClassifiedError('ENVIRONMENT_FAILURE', 'R4_PUBLISHED_AUTH_ASSET_MISMATCH');

  const authResponsePromise = page.waitForResponse(response => { try { const u = new URL(response.url()); return /identitytoolkit\.googleapis\.com/i.test(u.host) && /accounts:signInWithPassword/i.test(u.pathname); } catch { return false; } }, { timeout: 25000 });
  await runStage('login-submit', 15000, async () => { await page.fill('#lg-user', EMAIL); await page.fill('#lg-pass', PASSWORD); await page.click('#login-form button[type="submit"]'); });
  const authResponse = await runStage('login-http-response', 30000, () => authResponsePromise, r => ({ httpStatus: r.status() }));
  d.authHttp.seen = true; d.authHttp.status = authResponse.status();
  if (authResponse.status() >= 400) {
    const body = await withTimeout('auth-error-body', 4000, () => authResponse.json().catch(() => ({})));
    d.authHttp.errorCode = txt(body && body.error && (body.error.message || body.error.status) || '').split(/[:\s]/)[0].replace(/[^A-Z0-9_-]/gi, '').toUpperCase().slice(0, 80);
    checkpoint('login-http-classified', 'FAIL', { httpStatus: d.authHttp.status, errorCode: d.authHttp.errorCode });
    throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_CREDENTIAL_REJECTED');
  }
  checkpoint('login-http-classified', 'PASS', { httpStatus: d.authHttp.status });

  const authProjection = await runStage('auth-projection', 12000, () => page.evaluate(async () => {
    const p = window.Orbit && Orbit.productRuntimeBrowserProvidersP0; const deps = p && p.dependencies ? p.dependencies() : null;
    if (!deps || !deps.authProvider) return { signedIn: false, emailVerified: false, uid: '' };
    const user = await Promise.race([deps.authProvider.waitForAuthenticatedUser(), new Promise((_, reject) => setTimeout(() => reject(new Error('auth-provider-timeout')), 7000))]);
    return { signedIn: !!(user && user.uid), emailVerified: !!(user && user.emailVerified), uid: user && user.uid ? String(user.uid) : '' };
  }), v => ({ signedIn: v && v.signedIn === true, emailVerified: v && v.emailVerified === true }));
  const authUid = txt(authProjection && authProjection.uid);
  d.auth.signedIn = authProjection && authProjection.signedIn === true; d.auth.emailVerified = authProjection && authProjection.emailVerified === true;
  if (!d.auth.signedIn) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_AUTH_PROVIDER_USER_NOT_AVAILABLE_AFTER_HTTP_SUCCESS');
  if (!d.auth.emailVerified) throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_EMAIL_NOT_VERIFIED');

  const membership = await runStage('membership-read', 12000, () => page.evaluate(async ({ uid, expected }) => {
    const out = { membershipAvailable: false, membershipActive: false, tenantMatches: false, roleCount: 0, requiredRolesPresent: false };
    const p = window.Orbit && Orbit.productRuntimeBrowserProvidersP0; const deps = p && p.dependencies ? p.dependencies() : null;
    if (!deps || !deps.membershipProvider || !uid) return out;
    const membershipValue = await Promise.race([deps.membershipProvider.getByUid(uid), new Promise((_, reject) => setTimeout(() => reject(new Error('membership-provider-timeout')), 7000))]);
    out.membershipAvailable = !!membershipValue;
    out.membershipActive = String(membershipValue && (membershipValue.status || membershipValue.estado) || '').toLowerCase() === 'active' || membershipValue && membershipValue.active === true;
    out.tenantMatches = String(membershipValue && (membershipValue.tenantId || membershipValue.tenant) || '') === expected;
    const roles = [...new Set([].concat(membershipValue && (membershipValue.roles || membershipValue.rolesAsignados) || [], membershipValue && (membershipValue.role || membershipValue.rol) || []).map(x => String(x || '').trim()).filter(Boolean))];
    out.roleCount = roles.length; out.requiredRolesPresent = ['Dirección', 'Operativo', 'Asesor'].every(role => roles.includes(role)); return out;
  }, { uid: authUid, expected: TENANT }), v => ({ membershipAvailable: v && v.membershipAvailable === true, membershipActive: v && v.membershipActive === true, tenantMatches: v && v.tenantMatches === true, roleCount: Number(v && v.roleCount || 0), requiredRolesPresent: v && v.requiredRolesPresent === true }));
  Object.assign(d.auth, membership);
  if (!d.auth.membershipAvailable) throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_MEMBERSHIP_MISSING');
  if (!d.auth.membershipActive) throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_MEMBERSHIP_INACTIVE');
  if (!d.auth.tenantMatches) throw new ClassifiedError('SECURITY_FAILURE', 'R4_SMOKE_IDENTITY_TENANT_MISMATCH');
  if (!d.auth.requiredRolesPresent) throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_REQUIRED_ROLES_MISSING');

  await runStage('runtime-activation', 45000, () => page.waitForFunction(() => { const app = window.Orbit && Orbit.productAppP0 && Orbit.productAppP0.status ? Orbit.productAppP0.status() : null; const loginError = document.getElementById('login-error'); return !!(app && app.started) || !!(app && app.lastError) || !!(loginError && String(loginError.textContent || '').trim()); }, undefined, { timeout: 40000 }));
  d.runtime = await runStage('runtime-snapshot', 10000, () => captureRuntime(page), v => ({ started: v && v.started === true, storeStatus: txt(v && v.storeStatus) }));
  if (!d.runtime.started) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_PRODUCT_ACTIVATION_FAILED_AFTER_AUTH', d.runtime.appLastError || 'R4_PRODUCT_ACTIVATION_FAILED_AFTER_AUTH');

  const legal = page.locator('[data-legal-gate]');
  if (await withTimeout('legal-count', 5000, () => legal.count()) && await withTimeout('legal-check-count', 5000, () => page.locator('#lg-chk').count()) && await withTimeout('legal-ok-count', 5000, () => page.locator('#lg-ok').count())) {
    await runStage('legal-gate-local', 10000, async () => { await page.locator('#lg-chk').check(); await page.locator('#lg-ok').click(); d.legalGateHandledLocally = true; await page.waitForTimeout(200); });
  }

  d.privileged = await runStage('privileged-snapshot', 10000, () => page.evaluate(expected => {
    const s = Orbit.store._productStatus(), t = Orbit.productTenantRuntimeContextP0.status(), a = Orbit.auth.productUser || {};
    return { tenantMatches: String(t.tenantId || '') === expected, tenantReady: t.ready === true, storeReady: s.ready === true && s.status === 'ready-read-only' && s.writeEnabled === false, requiredMissingCount: [].concat(s.requiredMissing || []).length, requiredFailedCount: [].concat(s.requiredFailed || []).length, clientes: Orbit.store.all('clientes').length, aseguradoras: Orbit.store.all('aseguradoras').length, assignedRoleCount: [].concat(a.roles || []).length, advisorBound: !!String(a.advisorId || ''), productReadOnly: a.productReadOnly === true };
  }, TENANT), v => ({ tenantMatches: v && v.tenantMatches === true, storeReady: v && v.storeReady === true, clientes: Number(v && v.clientes || 0), aseguradoras: Number(v && v.aseguradoras || 0) }));

  const specs = [['Dirección', 1440, 900], ['Operativo', 1024, 768], ['Asesor', 390, 844]], routes = ['inicio', 'cliente360', 'aseguradoras', 'ops', 'leads'];
  for (const [role, width, height] of specs) {
    await runStage(`role-${role}-group`, 90000, async () => {
      await page.setViewportSize({ width, height }); const set = await page.evaluate(r => !!(Orbit.session && Orbit.session.set && Orbit.session.set(r)), role); await page.waitForTimeout(200);
      const rr = { role, viewport: { width, height }, roleSet: set, activeRoleMatches: false, scopeCliente360: '', rawClientCount: -1, scopedClientCount: -1, routes: [], pass: true };
      const scope = await page.evaluate(() => { const raw = Orbit.store.all('clientes'), scoped = Orbit.access.filter('clientes', raw, 'cliente360'); return { active: Orbit.session.rol(), scope: Orbit.access.scopeCanon('cliente360'), raw: raw.length, scoped: scoped.length }; });
      rr.activeRoleMatches = scope.active === role; rr.scopeCliente360 = scope.scope; rr.rawClientCount = scope.raw; rr.scopedClientCount = scope.scoped;
      for (const route of routes) {
        checkpoint(`role-${role}-route-${route}`, 'START');
        const allowed = await page.evaluate(r => r === 'inicio' ? true : !!Orbit.access.can(r, 'view'), route);
        await page.evaluate(r => { location.hash = '#/' + r; }, route);
        await page.waitForFunction(r => window.Orbit && Orbit.route && Orbit.route.key === r, route, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(200);
        const state = await page.evaluate(() => { const h = document.getElementById('host'), body = String(document.body && document.body.innerText || ''); return { key: Orbit.route && Orbit.route.key || '', children: h && h.children ? h.children.length : 0, blocked: String(h && h.innerText || '').includes('No tienes acceso con el rol activo'), body: body.slice(0, 200000) }; });
        const matches = uniq((state.body.match(TECH) || []).map(x => String(x).toLowerCase())); d.technicalCopy.push(...matches.map(x => `${role}:${route}:${x}`));
        const pass = state.key === route && state.children > 0 && (allowed ? !state.blocked : state.blocked);
        rr.routes.push({ route, policyAllowed: allowed, accessBlocked: state.blocked, hostRendered: state.children > 0, pass }); if (!pass) rr.pass = false;
        checkpoint(`role-${role}-route-${route}`, pass ? 'PASS' : 'FAIL', { policyAllowed: allowed, accessBlocked: state.blocked, hostRendered: state.children > 0 });
      }
      if (!rr.roleSet || !rr.activeRoleMatches) rr.pass = false;
      if (role === 'Dirección' && rr.scopeCliente360 !== 'all') rr.pass = false;
      if (role === 'Operativo' && rr.scopeCliente360 !== 'team') rr.pass = false;
      if (role === 'Asesor' && rr.scopeCliente360 !== 'own') rr.pass = false;
      d.roles.push(rr); if (!rr.pass) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_OR_SCOPE_MISMATCH');
    }, () => ({ role }));
  }

  d.runtime = await runStage('runtime-final-snapshot', 10000, () => captureRuntime(page), v => ({ started: v && v.started === true, storeStatus: txt(v && v.storeStatus) })); normalizeEvidence();
  const ok = d.manifest.pass && d.authAsset.pass && d.authHttp.seen && d.authHttp.status >= 200 && d.authHttp.status < 300 && d.auth.signedIn && d.auth.emailVerified && d.auth.membershipAvailable && d.auth.membershipActive && d.auth.tenantMatches && d.auth.requiredRolesPresent && d.runtime.started && d.runtime.routerStarted && d.runtime.tenantContextReady && d.runtime.storeReady && d.runtime.storeStatus === 'ready-read-only' && !d.runtime.storeWriteEnabled && d.runtime.requiredMissingCount === 0 && d.runtime.requiredFailedCount === 0 && d.privileged && d.privileged.tenantMatches && d.privileged.tenantReady && d.privileged.storeReady && d.privileged.requiredMissingCount === 0 && d.privileged.requiredFailedCount === 0 && d.privileged.clientes === 430 && d.privileged.aseguradoras === 30 && d.privileged.productReadOnly && d.roles.length === 3 && d.roles.every(r => r.pass) && !d.pageErrors.length && !d.consoleErrors.length && !d.httpFailures.length && !d.writeSignals.length && !d.technicalCopy.length;
  if (!ok) { const [classification, failureFamily] = failure(d); throw new ClassifiedError(classification, failureFamily); }
  writeTerminal(true, 'POST_GO_LIVE_SMOKE_PASS', 'PASS', '', { targetHttps: true });
}

async function main() {
  if (SYNTHETIC_MODE === 'watchdog') { await runSyntheticWatchdog(); return; }
  try { await withTimeout('GLOBAL_DEADLINE', GLOBAL_TIMEOUT_MS, runRuntime); }
  catch (error) {
    normalizeEvidence(); let classification, failureFamily;
    if (error instanceof ClassifiedError) { classification = error.classification; failureFamily = error.failureFamily; }
    else if (error instanceof StageTimeoutError) [classification, failureFamily] = classifyTimeout(error.stage);
    else [classification, failureFamily] = classifyStageFailure(currentStage);
    writeTerminal(false, 'R4_PRODUCTION_READONLY_SMOKE_FAIL', classification, failureFamily, { error: safe(error && error.message || error), targetHttps: TARGET.startsWith('https://') }); process.exitCode = 41;
  } finally {
    await closeBrowserBounded();
    if (terminalWritten && !SYNTHETIC_MODE) { try { const terminal = JSON.parse(fs.readFileSync(OUT, 'utf8')); terminal.cleanup = d.cleanup; fs.writeFileSync(OUT, JSON.stringify(terminal, null, 2) + '\n', 'utf8'); } catch {} }
  }
}

await main();
