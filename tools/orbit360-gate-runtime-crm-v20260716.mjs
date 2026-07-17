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
  schemaVersion: 'orbit360-runtime-gate-joint-v9-owner-aware',
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
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      providerReady = !!(auth && typeof auth.signInWithEmailAndPassword === 'function');
      currentUser = !!(auth && auth.currentUser);
    } catch (error) {}
    return {
      inside: !document.body.classList.contains('pre-auth'),
      formVisible: visible(document.getElementById('login-form')),
      providerReady,
      currentUser,
      firebaseInit: String((window.OrbitBackend || {}).firebaseInit || ''),
      firebaseLoader: String((window.OrbitBackend || {}).firebaseLoader || '')
    };
  });
}

async function ensureAuthenticated(page) {
  await page.waitForFunction(() => {
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      return !!(auth && typeof auth.signInWithEmailAndPassword === 'function');
    } catch (error) { return false; }
  }, null, { timeout: 45000 });

  const initial = await authState(page);
  if (!initial.currentUser) {
    const loginResult = await page.evaluate(async ({ loginEmail, loginKey }) => {
      try {
        const credential = await firebase.auth().signInWithEmailAndPassword(loginEmail, loginKey);
        return { ok: !!(credential && credential.user), code: '' };
      } catch (error) {
        return {
          ok: false,
          code: String(error && error.code || 'auth/unknown').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80)
        };
      }
    }, { loginEmail: email, loginKey: accessKey });
    if (!loginResult.ok) {
      report.authDiagnostic = {
        providerReady: true,
        currentUser: false,
        formVisible: initial.formVisible,
        firebaseInit: initial.firebaseInit,
        firebaseLoader: initial.firebaseLoader,
        errorCategory: loginResult.code || 'auth/unknown'
      };
      throw new Error(`LOGIN_PROVIDER_${loginResult.code || 'UNKNOWN'}`);
    }
  }

  await page.waitForFunction(() => {
    try { return !!(window.firebase && firebase.auth && firebase.auth().currentUser); }
    catch (error) { return false; }
  }, null, { timeout: 15000 });
  await page.evaluate(() => {
    try { if (window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function') Orbit.auth.showApp(); }
    catch (error) {}
  });
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 10000 });
  const finalState = await authState(page);
  assert(finalState.currentUser && finalState.inside, 'LOGIN_PROVIDER_SESSION_NOT_ACTIVE');
  report.authMode = initial.currentUser ? 'session_restored' : 'provider_direct_gate';
  report.authDiagnostic = {
    providerReady: finalState.providerReady,
    currentUser: finalState.currentUser,
    formVisible: finalState.formVisible,
    firebaseInit: finalState.firebaseInit,
    firebaseLoader: finalState.firebaseLoader,
    errorCategory: ''
  };
  report.checks.authenticated = true;
}

async function acceptLegalGate(page) {
  await page.waitForTimeout(900);
  const boxes = page.locator('#lg-chk:visible,#conf-chk:visible');
  const count = await boxes.count();
  report.legalVisibleBefore = count;
  assert(count === 1, count ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(count));
  const checkbox = boxes.first();
  const root = checkbox.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " drawer-back ")][1]');
  const accept = root.locator('#lg-ok,#conf-ok').first();
  assert(await accept.count() === 1, 'LEGAL_ACCEPT_BUTTON_MISSING');
  await checkbox.check({ force: true });
  await accept.click({ force: true });
  await page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return !Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).some(visible);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  const remaining = await visibleCount(page.locator('#lg-chk,#conf-chk'));
  assert(remaining === 0, 'LEGAL_MODAL_REAPPEARED', String(remaining));
  report.legalVisibleAfter = remaining;
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
