import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const loginEmail = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const loginKey = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '').replace(/[\r\n]+$/g, '');
const runtime = String(process.env.ORBIT360_EXPECTED_RUNTIME || '20260717-2');
const outputDirs = [
  'orbit360-platform/runtime-gate-crm-v20260716',
  'orbit360-platform/runtime-gate-aseguradoras-v20260716'
];
const mappedInsurer = /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report = {
  schemaVersion: 'orbit360-runtime-gate-joint-v16-bounded-controller',
  gateId: 'block1-client360-insurers-lab-v20260717',
  contractVersion: '1.0.8',
  runtimeVersion: runtime,
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  stage: 'bootstrap',
  checks: {}
};

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (loginKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
if (!/^\d{8}-\d+$/.test(runtime)) throw new Error('BLOQUEO_RUNTIME_VERSION');
outputDirs.forEach(dir => mkdirSync(dir, { recursive: true }));

function writeReport() {
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  outputDirs.forEach(dir => writeFileSync(`${dir}/resultado-sanitizado.json`, payload));
}
function stage(name) {
  report.stage = name;
  console.log(`ORBIT360_GATE_STAGE:${name}`);
}
function requireState(value, code, detail = '') {
  if (!value) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
async function bounded(name, task, timeoutMs = 15000) {
  stage(name);
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`PIPELINE_STEP_TIMEOUT:${name}`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let browser;
const watchdog = setTimeout(() => {
  report.ok = false;
  report.error = `GATE_TIMEOUT:${report.stage}`;
  writeReport();
  process.exit(124);
}, 300000);

async function canonicalRuntime(page) {
  await bounded('canonical_runtime_wait', () => page.waitForFunction(expected => {
    const url = new URL(location.href);
    const backend = window.OrbitBackend || {};
    const firebaseReady = ['initialized', 'already-initialized'].includes(String(backend.firebaseInit || ''));
    const ready = /\/index\.html$/.test(url.pathname) &&
      url.searchParams.get('orbitBackend') === 'firestore-lab' &&
      url.searchParams.get('tenant') === 'alianzas-soluciones' &&
      url.searchParams.get('runtime') === expected &&
      document.readyState !== 'loading' &&
      String(backend.runtimeVersion || '') === expected &&
      String(backend.firebaseLoader || '') === 'requested' &&
      firebaseReady &&
      Boolean(window.Orbit && Orbit.store && Orbit.auth && Orbit.router);
    if (!ready) {
      window.__orbitCanonicalStableSince = 0;
      return false;
    }
    if (!window.__orbitCanonicalStableSince) window.__orbitCanonicalStableSince = Date.now();
    return Date.now() - window.__orbitCanonicalStableSince >= 1200;
  }, runtime, { timeout: 90000, polling: 250 }), 95000);

  const state = await bounded('canonical_runtime_snapshot', () => page.evaluate(expected => {
    const backend = window.OrbitBackend || {};
    let providerReady = false;
    let currentUser = false;
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      providerReady = Boolean(auth && typeof auth.signInWithEmailAndPassword === 'function');
      currentUser = Boolean(auth && auth.currentUser);
    } catch (error) {}
    return {
      runtimeVersion: String(backend.runtimeVersion || ''),
      firebaseLoader: String(backend.firebaseLoader || ''),
      firebaseInit: String(backend.firebaseInit || ''),
      ownerReady: Boolean(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function'),
      ownersReady: Boolean(window.Orbit && Orbit.store && Orbit.auth && Orbit.router),
      providerReady,
      currentUser,
      inside: !document.body.classList.contains('pre-auth'),
      stableMilliseconds: window.__orbitCanonicalStableSince ? Date.now() - window.__orbitCanonicalStableSince : 0,
      runtimeMatches: String(backend.runtimeVersion || '') === expected
    };
  }, runtime), 12000);

  requireState(state.runtimeMatches, 'RUNTIME_OWNER_VERSION_MISMATCH', state.runtimeVersion || 'missing');
  requireState(state.firebaseLoader === 'requested', 'FIREBASE_LOADER_NOT_REQUESTED', state.firebaseLoader || 'missing');
  requireState(['initialized', 'already-initialized'].includes(state.firebaseInit), 'FIREBASE_INIT_NOT_READY', state.firebaseInit || 'missing');
  requireState(state.ownersReady && state.ownerReady, 'CANONICAL_OWNERS_NOT_READY');
  report.runtimeDiagnostic = {
    expectedRuntime: runtime,
    ownerRuntime: state.runtimeVersion,
    firebaseLoader: state.firebaseLoader,
    firebaseInit: state.firebaseInit,
    stableMilliseconds: state.stableMilliseconds,
    ownerHandoffReady: state.ownerReady
  };
  report.checks.canonicalRuntime = true;
  report.checks.canonicalRuntimeVersion = true;
  report.checks.canonicalRuntimeStable = true;
  report.checks.canonicalAuthOwnerHandoff = true;
  return state;
}

async function authenticate(page, initial) {
  requireState(initial.ownerReady, 'AUTH_OWNER_HANDOFF_MISSING');
  if (!initial.currentUser) {
    const scheduled = await bounded('authentication_schedule_signin', () => page.evaluate(({ email, key, expected }) => {
      if (String((window.OrbitBackend || {}).runtimeVersion || '') !== expected) return { ok: false, code: 'AUTH_RUNTIME_MISMATCH' };
      if (!(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function')) return { ok: false, code: 'AUTH_OWNER_NOT_READY' };
      window.__orbitGateAuthStatus = { state: 'pending', code: '' };
      setTimeout(() => {
        Promise.resolve(Orbit.auth.loginFirebase(email, key))
          .then(user => { window.__orbitGateAuthStatus = { state: user ? 'resolved' : 'failed', code: user ? '' : 'AUTH_USER_NOT_AVAILABLE' }; })
          .catch(error => {
            window.__orbitGateAuthStatus = {
              state: 'failed',
              code: String(error && (error.code || error.message) || 'auth/unknown').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80)
            };
          });
      }, 0);
      return { ok: true, code: '' };
    }, { email: loginEmail, key: loginKey, expected: runtime }), 15000);
    requireState(scheduled.ok, scheduled.code || 'AUTH_DISPATCH_FAILED');

    await bounded('authentication_observe_signin', () => page.waitForFunction(expected => {
      const status = window.__orbitGateAuthStatus || {};
      let currentUser = false;
      try { currentUser = Boolean(window.firebase && firebase.auth && firebase.auth().currentUser); } catch (error) {}
      return String((window.OrbitBackend || {}).runtimeVersion || '') === expected &&
        (currentUser || status.state === 'resolved' || status.state === 'failed');
    }, runtime, { timeout: 40000, polling: 250 }), 45000);

    const outcome = await bounded('authentication_read_signin', () => page.evaluate(() => {
      const status = window.__orbitGateAuthStatus || {};
      let currentUser = false;
      try { currentUser = Boolean(window.firebase && firebase.auth && firebase.auth().currentUser); } catch (error) {}
      return { currentUser, state: String(status.state || ''), code: String(status.code || '') };
    }), 10000);
    requireState(outcome.currentUser, `LOGIN_OWNER_${outcome.code || 'UNKNOWN'}`);
  }

  await bounded('authentication_show_app', () => page.evaluate(() => {
    if (!(window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function')) return false;
    Orbit.auth.showApp();
    return true;
  }), 10000);
  await bounded('authentication_inside', () => page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 12000, polling: 250 }), 15000);
  report.checks.authenticated = true;
}

async function acceptLegal(page) {
  await page.waitForTimeout(900);
  const initial = await bounded('legal_gate_inspect', () => page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible);
    return {
      count: boxes.length,
      ownerReady: Boolean(window.Orbit && Orbit.legal && Orbit.legal.__ownerIdempotent),
      pending: Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean))
    };
  }), 10000);
  requireState(initial.ownerReady, 'LEGAL_OWNER_NOT_READY');
  requireState(initial.count === 1, initial.count ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(initial.count));

  const scheduled = await bounded('legal_gate_schedule_accept', () => page.evaluate(() => {
    const checkbox = document.querySelector('#lg-chk,#conf-chk');
    const root = checkbox && checkbox.closest('.drawer-back');
    const button = root && root.querySelector('#lg-ok,#conf-ok');
    if (!checkbox || !button) return false;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => button.click(), 0);
    return true;
  }), 10000);
  requireState(scheduled, 'LEGAL_ACCEPT_SCHEDULE_FAILED');

  await bounded('legal_gate_verify', () => page.waitForFunction(() => {
    const pending = Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean));
    return !document.querySelector('#lg-chk,#conf-chk') && !pending;
  }, null, { timeout: 15000, polling: 250 }), 18000);
  report.checks.legalOneClick = true;
}

async function selectRole(page, label) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const match = options.find(option => option.text.toLowerCase().includes(label.toLowerCase()));
  requireState(match, 'ROLE_OPTION_NOT_FOUND', label);
  await select.selectOption(match.value);
  await page.waitForTimeout(700);
}

async function validateInsurers(page, label, advisor = false) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const count = await cards.count();
  requireState(count === 26, 'INSURER_CARD_COUNT_INVALID', `${label}:${count}`);
  requireState(/\bGT\b/.test(String(await cards.first().innerText())), 'GT_NOT_FIRST', label);
  requireState(await page.locator('#asg-order').count() === 1, 'INSURER_ORDER_CONTROL_MISSING', label);

  const mapped = cards.filter({ hasText: mappedInsurer }).first();
  requireState(await mapped.count() > 0, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  await mapped.click();
  await page.locator('#asg-ficha').waitFor({ state: 'visible', timeout: 15000 });
  requireState(await page.locator('#af-guardar').count() === 0, 'INSURER_SAVE_VISIBLE_IN_READ_MODE', label);
  if (advisor) requireState(await page.locator('#af-editar').count() === 0, 'ADVISOR_INSURER_EDIT_VISIBLE');

  const owner = await page.evaluate(() => {
    const module = window.Orbit && Orbit.modules && Orbit.modules.aseguradoras;
    return Boolean(module && module.__ownerKnowledgeV20260717 && module.__tenantOrderV20260717 && module.__consumerGatesSeparatedV20260717);
  });
  requireState(owner, 'INSURER_OWNER_CONTRACT_NOT_ACTIVE', label);
  await page.locator('[data-tab="tarifas"]').click();
  await page.waitForFunction(() => /Mapeado|Persistido|Validado|Conocimiento/i.test(String((document.querySelector('#af-body') || {}).textContent || '')), null, { timeout: 15000 });
  report[`${label}InsurerCards`] = count;
  report[`${label}KnowledgeVisible`] = true;
}

async function validateMobileMenu(page) {
  await page.locator('#burger').click();
  await page.waitForTimeout(350);
  const labels = await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes => nodes.map(node => String(node.textContent || '').replace(/\s+/g, ' ').trim()));
  requireState(labels.length > 1, 'MOBILE_MENU_ONLY_HOME', String(labels.length));
  requireState(labels.some(label => /Cliente/i.test(label)), 'MOBILE_MENU_CLIENTES_MISSING');
  requireState(labels.some(label => /Aseguradoras/i.test(label)), 'MOBILE_MENU_INSURERS_MISSING');
  report.mobileMenuVisibleModules = labels.length;
  report.checks.mobileMenuComplete = true;
}

browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(45000);

try {
  stage('open_lab_preview');
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const initial = await canonicalRuntime(page);
  await authenticate(page, initial);
  await acceptLegal(page);

  stage('real_tenant_data');
  report.storeCounts = await waitForRealTenantData(page, 26);

  await selectRole(page, 'Dirección');
  stage('desktop_direction_client360');
  await validateClient360(page, report, 'desktopDirection');
  stage('desktop_direction_aseguradoras');
  await validateInsurers(page, 'desktopDirection');
  report.checks.desktopDirection = true;

  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  stage('tablet_operativo_client360');
  await validateClient360(page, report, 'tabletOperativo');
  stage('tablet_operativo_aseguradoras');
  await validateInsurers(page, 'tabletOperativo');
  report.checks.tabletOperativo = true;

  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
  stage('mobile_asesor_menu');
  await validateMobileMenu(page);
  stage('mobile_asesor_client360');
  await validateClient360(page, report, 'mobileAsesor');
  stage('mobile_asesor_aseguradoras');
  await validateInsurers(page, 'mobileAsesor', true);
  report.checks.mobileAsesor = true;

  report.checks.realClientCount = report.storeCounts.clientes === 414;
  report.checks.realInsurerCount = report.storeCounts.aseguradoras === 26;
  report.checks.realAdvisorCount = report.storeCounts.asesores === 7;
  report.checks.allTenTabs = true;
  report.checks.gtFirst = true;
  report.checks.insurerReadMode = true;
  report.checks.insurerKnowledgeVisible = true;
  report.ok = Object.values(report.checks).every(Boolean);
  stage('completed');
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message || error)).replace(/\s+/g, ' ').trim();
} finally {
  writeReport();
  stage('closing_browser');
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]);
  clearTimeout(watchdog);
}

console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({ ok: report.ok, stage: report.stage, runtimeVersion: report.runtimeVersion, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
process.exit(report.ok ? 0 : 1);
