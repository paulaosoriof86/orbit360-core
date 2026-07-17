import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const accessKey = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '').replace(/[\r\n]+$/g, '');
const outDir = 'orbit360-platform/runtime-gate-crm-v20260716';
const insurerOutDir = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const mappedInsurer = /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report = {
  schemaVersion: 'orbit360-runtime-gate-joint-v13-detached-auth-controller',
  gateId: 'block1-client360-insurers-lab-v20260717',
  contractVersion: '1.0.1',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  stage: 'bootstrap',
  checks: {}
};

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (accessKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });
mkdirSync(insurerOutDir, { recursive: true });

function writeReport() {
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(`${outDir}/resultado-sanitizado.json`, payload);
  writeFileSync(`${insurerOutDir}/resultado-sanitizado.json`, payload);
}
function stage(name) {
  report.stage = name;
  console.log(`ORBIT360_GATE_STAGE:${name}`);
}
function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
async function visibleCount(locator) {
  return locator.evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length);
}
async function boundedStep(name, task, timeoutMs = 15000) {
  stage(name);
  let timer = null;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`PIPELINE_STEP_TIMEOUT:${name}`)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(task), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let browser = null;
const watchdog = setTimeout(() => {
  report.ok = false;
  report.error = `GATE_TIMEOUT:${report.stage}`;
  writeReport();
  console.error(`ORBIT360_RUNTIME_GATE_TIMEOUT:${report.stage}`);
  process.exit(124);
}, 300000);

async function waitForCanonicalRuntime(page) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const current = new URL(page.url());
    const canonical = /\/index\.html$/.test(current.pathname) &&
      current.searchParams.get('orbitBackend') === 'firestore-lab' &&
      current.searchParams.get('tenant') === 'alianzas-soluciones';
    if (canonical) break;
    await page.waitForTimeout(250);
  }
  const current = new URL(page.url());
  assert(/\/index\.html$/.test(current.pathname), 'CANONICAL_INDEX_NOT_REACHED');
  assert(current.searchParams.get('orbitBackend') === 'firestore-lab', 'CANONICAL_BACKEND_MISSING');
  assert(current.searchParams.get('tenant') === 'alianzas-soluciones', 'CANONICAL_TENANT_MISSING');
  await page.waitForFunction(() => window.Orbit && Orbit.store && Orbit.auth && Orbit.router, null, { timeout: 45000 });
  report.checks.canonicalRuntime = true;
}

async function selectRole(page, role) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({
    value: node.value,
    text: String(node.textContent || '').trim()
  })));
  const match = options.find(item => item.text.toLowerCase().includes(role.toLowerCase()));
  assert(match, 'ROLE_OPTION_NOT_FOUND', role);
  await select.selectOption(match.value);
  await page.waitForTimeout(700);
}

async function authState(page) {
  return page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    let providerReady = false;
    let currentUser = false;
    let ownerReady = false;
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      providerReady = !!(auth && typeof auth.signInWithEmailAndPassword === 'function');
      currentUser = !!(auth && auth.currentUser);
      ownerReady = !!(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function');
    } catch (error) {}
    const gateStatus = window.__orbitGateAuthStatus || {};
    return {
      inside: !document.body.classList.contains('pre-auth'),
      formVisible: visible(document.getElementById('login-form')),
      providerReady,
      ownerReady,
      currentUser,
      gateState: String(gateStatus.state || ''),
      gateCode: String(gateStatus.code || ''),
      authStage: String((document.body.dataset || {}).authStage || ''),
      firebaseInit: String((window.OrbitBackend || {}).firebaseInit || ''),
      firebaseLoader: String((window.OrbitBackend || {}).firebaseLoader || '')
    };
  });
}

async function ensureAuthenticated(page) {
  await boundedStep('authentication_owner_ready', () => page.waitForFunction(() => {
    try {
      return !!(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function');
    } catch (error) { return false; }
  }, null, { timeout: 45000 }), 50000);

  const initial = await boundedStep('authentication_initial_state', () => authState(page), 10000);
  if (!initial.currentUser) {
    const dispatch = await boundedStep('authentication_schedule_signin', () => page.evaluate(({ loginEmail, loginKey }) => {
      if (!(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function')) {
        return { ok: false, code: 'AUTH_OWNER_NOT_READY' };
      }
      window.__orbitGateAuthStatus = { state: 'pending', code: '' };
      setTimeout(() => {
        Promise.resolve()
          .then(() => Orbit.auth.loginFirebase(loginEmail, loginKey))
          .then(user => {
            window.__orbitGateAuthStatus = {
              state: user ? 'resolved' : 'failed',
              code: user ? '' : 'AUTH_USER_NOT_AVAILABLE'
            };
          })
          .catch(error => {
            window.__orbitGateAuthStatus = {
              state: 'failed',
              code: String(error && (error.code || error.message) || 'auth/unknown')
                .replace(/[^a-z0-9/_-]/gi, '')
                .slice(0, 80)
            };
          });
      }, 0);
      return { ok: true, code: '' };
    }, { loginEmail: email, loginKey: accessKey }), 10000);
    assert(dispatch && dispatch.ok, (dispatch && dispatch.code) || 'AUTH_DISPATCH_FAILED');

    await boundedStep('authentication_observe_signin', () => page.waitForFunction(() => {
      try {
        const auth = window.firebase && firebase.auth ? firebase.auth() : null;
        const status = window.__orbitGateAuthStatus || {};
        return !!(auth && auth.currentUser) || status.state === 'resolved' || status.state === 'failed';
      } catch (error) { return false; }
    }, null, { timeout: 40000 }), 45000);

    const outcome = await boundedStep('authentication_read_signin', () => authState(page), 10000);
    if (!outcome.currentUser) {
      report.authDiagnostic = {
        strategy: 'detached_owner_login_controller',
        providerReady: outcome.providerReady,
        ownerReady: outcome.ownerReady,
        currentUser: false,
        formVisible: outcome.formVisible,
        authStage: outcome.authStage,
        firebaseInit: outcome.firebaseInit,
        firebaseLoader: outcome.firebaseLoader,
        gateState: outcome.gateState,
        errorCategory: outcome.gateCode || 'auth/unknown'
      };
      throw new Error(`LOGIN_OWNER_${outcome.gateCode || 'UNKNOWN'}`);
    }
  }

  await boundedStep('authentication_session', () => page.waitForFunction(() => {
    try { return !!(window.firebase && firebase.auth && firebase.auth().currentUser); }
    catch (error) { return false; }
  }, null, { timeout: 15000 }), 20000);

  await boundedStep('authentication_show_app', () => page.evaluate(() => {
    if (window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function') {
      Orbit.auth.showApp();
      return true;
    }
    return false;
  }), 10000);

  await boundedStep('authentication_inside', () => page.waitForFunction(
    () => !document.body.classList.contains('pre-auth'),
    null,
    { timeout: 10000 }
  ), 15000);

  const finalState = await boundedStep('authentication_final_state', () => authState(page), 10000);
  assert(finalState.currentUser && finalState.inside, 'LOGIN_OWNER_SESSION_NOT_ACTIVE');
  report.authMode = initial.currentUser ? 'session_restored' : 'detached_owner_contract_gate';
  report.authDiagnostic = {
    strategy: 'detached_owner_login_controller',
    providerReady: finalState.providerReady,
    ownerReady: finalState.ownerReady,
    currentUser: finalState.currentUser,
    formVisible: finalState.formVisible,
    authStage: finalState.authStage,
    firebaseInit: finalState.firebaseInit,
    firebaseLoader: finalState.firebaseLoader,
    gateState: finalState.gateState,
    errorCategory: finalState.gateCode || ''
  };
  report.checks.authenticated = true;
}

async function acceptLegalGate(page) {
  await page.waitForTimeout(900);
  const initial = await boundedStep('legal_gate_inspect', () => page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible);
    return {
      count: boxes.length,
      ids: boxes.map(node => node.id),
      ownerReady: Boolean(window.Orbit && Orbit.legal && Orbit.legal.__ownerIdempotent),
      ownerPending: Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean)),
      scopes: Array.from(document.querySelectorAll('[data-legal-gate]')).map(node => String(node.getAttribute('data-legal-gate') || '')).filter(Boolean).length
    };
  }), 10000);

  report.legalVisibleBefore = initial.count;
  report.legalDiagnostic = {
    strategy: 'detached_ui_dispatch',
    ownerReady: initial.ownerReady,
    ownerPending: initial.ownerPending,
    visibleGates: initial.count,
    scopedGates: initial.scopes,
    acceptedControl: initial.ids[0] || ''
  };
  assert(initial.ownerReady, 'LEGAL_OWNER_NOT_READY');
  assert(initial.count === 1, initial.count ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(initial.count));

  const scheduled = await boundedStep('legal_gate_schedule_accept', () => page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible);
    if (boxes.length !== 1) return { ok: false, code: boxes.length ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE' };
    const checkbox = boxes[0];
    const root = checkbox.closest('.drawer-back');
    const button = root && root.querySelector('#lg-ok,#conf-ok');
    if (!button) return { ok: false, code: 'LEGAL_ACCEPT_BUTTON_MISSING' };
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    if (button.disabled) return { ok: false, code: 'LEGAL_ACCEPT_BUTTON_STILL_DISABLED' };
    const result = { ok: true, code: '', control: checkbox.id, button: button.id };
    setTimeout(() => {
      try { button.click(); }
      catch (error) { document.body.dataset.legalGateDispatchError = 'click_error'; }
    }, 0);
    return result;
  }), 10000);
  assert(scheduled && scheduled.ok, (scheduled && scheduled.code) || 'LEGAL_ACCEPT_SCHEDULE_FAILED');

  await boundedStep('legal_gate_verify', () => page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const remaining = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible).length;
    const pending = Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean));
    return remaining === 0 && !pending;
  }, null, { timeout: 12000 }), 15000);

  const settled = await boundedStep('legal_gate_read_result', () => page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const remaining = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible).length;
    const pending = Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean));
    const dispatchError = String((document.body.dataset || {}).legalGateDispatchError || '');
    return { remaining, pending, dispatchError };
  }), 10000);
  assert(!settled.dispatchError, 'LEGAL_DISPATCH_ERROR', settled.dispatchError);
  assert(settled.remaining === 0, 'LEGAL_MODAL_REAPPEARED', String(settled.remaining));
  assert(!settled.pending, 'LEGAL_OWNER_SCOPE_STILL_PENDING');
  report.legalVisibleAfter = settled.remaining;
  report.legalDiagnostic.acceptedControl = scheduled.control || report.legalDiagnostic.acceptedControl;
  report.legalDiagnostic.acceptButton = scheduled.button || '';
  report.legalDiagnostic.ownerPendingAfter = settled.pending;
  report.checks.legalOneClick = true;
}

async function validateInsurers(page, label, advisorMode = false) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  await page.waitForTimeout(1000);
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const count = await cards.count();
  report[`${label}InsurerCards`] = count;
  assert(count === 26, 'INSURER_CARD_COUNT_INVALID', `${label}:${count}`);

  const firstText = String(await cards.first().innerText()).replace(/\s+/g, ' ').trim();
  assert(/\bGT\b/.test(firstText), 'GT_NOT_FIRST', label);
  assert(await page.locator('#asg-order').count() === 1, 'INSURER_ORDER_CONTROL_MISSING', label);

  const mappedCard = cards.filter({ hasText: mappedInsurer }).first();
  assert(await mappedCard.count() > 0, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  await mappedCard.click();

  const ficha = page.locator('#asg-ficha');
  await ficha.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
  assert(await page.locator('#af-guardar').count() === 0, 'INSURER_SAVE_VISIBLE_IN_READ_MODE', label);
  if (advisorMode) assert(await page.locator('#af-editar').count() === 0, 'ADVISOR_INSURER_EDIT_VISIBLE');

  const owner = await page.evaluate(() => ({
    knowledge: Boolean(window.Orbit && Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.__ownerKnowledgeV20260717),
    order: Boolean(window.Orbit && Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.__tenantOrderV20260717),
    gates: Boolean(window.Orbit && Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.__consumerGatesSeparatedV20260717)
  }));
  assert(owner.knowledge && owner.order && owner.gates, 'INSURER_OWNER_CONTRACT_NOT_ACTIVE', label);

  await page.locator('[data-tab="tarifas"]').click();
  const knowledge = page.locator('#af-body');
  await knowledge.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const body = document.querySelector('#af-body');
    return Boolean(body && /Fuentes mapeadas y persistidas|Mapeado|Persistido|Validado/i.test(String(body.textContent || '')));
  }, null, { timeout: 15000 });
  const text = String(await knowledge.innerText()).replace(/\s+/g, ' ').trim();
  assert(/Mapeado|Persistido|Validado|Conocimiento/i.test(text), 'INSURER_KNOWLEDGE_NOT_VISIBLE', label);
  assert(!/Sin conocimiento adicional mapeado o persistido/.test(text), 'INSURER_KNOWLEDGE_SOURCES_EMPTY', label);
  report[`${label}KnowledgeVisible`] = true;
}

async function validateMobileMenu(page) {
  const burger = page.locator('#burger');
  await burger.click();
  await page.waitForTimeout(350);
  const visibleLinks = page.locator('#sidebar .nav-link:visible');
  const labels = await visibleLinks.evaluateAll(nodes => nodes.map(node => String(node.textContent || '').replace(/\s+/g, ' ').trim()));
  assert(labels.length > 1, 'MOBILE_MENU_ONLY_HOME', String(labels.length));
  assert(labels.some(label => /Cliente/i.test(label)), 'MOBILE_MENU_CLIENTES_MISSING');
  assert(labels.some(label => /Aseguradoras/i.test(label)), 'MOBILE_MENU_INSURERS_MISSING');
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
  stage('canonical_runtime');
  await waitForCanonicalRuntime(page);
  stage('authentication');
  await ensureAuthenticated(page);
  stage('legal_gate');
  await acceptLegalGate(page);

  stage('real_tenant_data');
  report.storeCounts = await waitForRealTenantData(page, 26);

  stage('desktop_direction_client360');
  await selectRole(page, 'Dirección');
  await validateClient360(page, report, 'desktopDirection');
  stage('desktop_direction_aseguradoras');
  await validateInsurers(page, 'desktopDirection');
  report.checks.desktopDirection = true;

  stage('tablet_operativo_client360');
  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  await validateClient360(page, report, 'tabletOperativo');
  stage('tablet_operativo_aseguradoras');
  await validateInsurers(page, 'tabletOperativo');
  report.checks.tabletOperativo = true;

  stage('mobile_asesor_menu');
  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
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
  await Promise.race([
    browser.close(),
    new Promise(resolve => setTimeout(resolve, 10000))
  ]);
  clearTimeout(watchdog);
}

console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({
  ok: report.ok,
  stage: report.stage,
  counts: report.storeCounts || {},
  checks: report.checks,
  error: report.error || ''
})}`);
process.exit(report.ok ? 0 : 1);
