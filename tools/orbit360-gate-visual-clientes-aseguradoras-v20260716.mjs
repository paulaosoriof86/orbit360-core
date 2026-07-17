import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const password = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '').replace(/[\r\n]+$/g, '');
const outDir = 'orbit360-platform/runtime-gate-crm-v20260716';
const insurerOutDir = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const report = {
  schemaVersion: 'orbit360-visual-joint-gate-v1',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  stage: 'bootstrap',
  checks: {}
};

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (password.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });
mkdirSync(insurerOutDir, { recursive: true });

function stage(value) {
  report.stage = value;
  console.log(`ORBIT360_VISUAL_GATE_STAGE:${value}`);
}
function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
function persist() {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(`${outDir}/resultado-sanitizado.json`, body);
  writeFileSync(`${insurerOutDir}/resultado-sanitizado.json`, body);
}
async function visibleCount(locator) {
  return locator.evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length);
}

async function enterCanonicalRuntime(page) {
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const q = new URLSearchParams(location.search);
    return /\/index\.html$/.test(location.pathname) && q.get('orbitBackend') === 'firestore-lab' && q.get('tenant') === 'alianzas-soluciones';
  }, null, { timeout: 45000 });
  await page.waitForFunction(() => window.Orbit && Orbit.auth && Orbit.store && Orbit.router, null, { timeout: 45000 });
  report.checks.canonicalRuntime = true;
}

async function loginThroughVisibleForm(page) {
  await page.waitForFunction(() => {
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      return !!(auth && typeof auth.signInWithEmailAndPassword === 'function');
    } catch (error) { return false; }
  }, null, { timeout: 45000 });

  const alreadyInside = await page.evaluate(() => {
    try { return !!(firebase.auth().currentUser && !document.body.classList.contains('pre-auth')); }
    catch (error) { return false; }
  });

  if (!alreadyInside) {
    await page.evaluate(() => {
      try { if (window.Orbit && Orbit.auth && Orbit.auth.showLogin) Orbit.auth.showLogin(); } catch (error) {}
    });
    const form = page.locator('#login-form');
    const user = page.locator('#lg-user');
    const pass = page.locator('#lg-pass');
    await form.waitFor({ state: 'visible', timeout: 15000 });
    await user.fill(email);
    await pass.fill(password);
    await form.evaluate(node => node.requestSubmit());
  }

  const state = await page.waitForFunction(() => {
    let currentUser = false;
    try { currentUser = !!(window.firebase && firebase.auth && firebase.auth().currentUser); } catch (error) {}
    const inside = !document.body.classList.contains('pre-auth');
    const error = String((document.getElementById('login-error') || {}).textContent || '').trim();
    if (currentUser && inside) return { ok: true, error: '' };
    if (error) return { ok: false, error: error.slice(0, 120) };
    return false;
  }, null, { timeout: 45000 });
  const result = await state.jsonValue();
  assert(result && result.ok, 'LOGIN_VISIBLE_FORM_FAILED', result && result.error ? 'visible_error' : 'unknown');

  const identity = await page.evaluate(() => ({
    authenticated: !!(window.firebase && firebase.auth && firebase.auth().currentUser),
    backend: String(document.body.dataset.authBackend || ''),
    inside: !document.body.classList.contains('pre-auth')
  }));
  assert(identity.authenticated && identity.inside, 'LOGIN_SESSION_NOT_ACTIVE');
  assert(identity.backend === 'firestore-lab', 'LOGIN_GUARD_NOT_ACCEPTED', identity.backend || 'none');
  report.authMode = 'visible_form';
  report.checks.authenticated = true;
}

async function acceptLegalOnce(page) {
  await page.waitForTimeout(900);
  const checkboxes = page.locator('#lg-chk:visible,#conf-chk:visible');
  const count = await checkboxes.count();
  report.legalVisibleBefore = count;
  assert(count === 1, count > 1 ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(count));
  const checkbox = checkboxes.first();
  const modal = checkbox.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " drawer-back ")][1]');
  const accept = modal.locator('#lg-ok,#conf-ok').first();
  await checkbox.check({ force: true });
  await accept.click({ force: true });
  await page.waitForFunction(() => {
    const visible = node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return !Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).some(visible);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(700);
  const remaining = await visibleCount(page.locator('#lg-chk,#conf-chk'));
  assert(remaining === 0, 'LEGAL_MODAL_REAPPEARED', String(remaining));
  report.legalVisibleAfter = remaining;
  report.checks.legalOneClick = true;
}

async function selectRole(page, role) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const option = options.find(item => item.text.toLowerCase().includes(role.toLowerCase()));
  assert(option, 'ROLE_OPTION_NOT_FOUND', role);
  await select.selectOption(option.value);
  await page.waitForTimeout(700);
}

async function validateInsurers(page, label, advisorMode = false) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const count = await cards.count();
  assert(count === 26, 'INSURER_CARD_COUNT_INVALID', `${label}:${count}`);
  report[`${label}InsurerCards`] = count;

  const firstText = String(await cards.first().innerText()).replace(/\s+/g, ' ').trim();
  assert(/\bGT\b/.test(firstText), 'GT_NOT_FIRST', label);
  assert(await page.locator('#asg-order-v20260716').count() === 1, 'INSURER_ORDER_CONTROL_MISSING', label);

  const mapped = cards.filter({ hasText: /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i }).first();
  assert(await mapped.count() > 0, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  await mapped.click();
  const ficha = page.locator('#asg-ficha');
  await ficha.waitFor({ state: 'visible', timeout: 15000 });
  assert(await ficha.getAttribute('data-mode') === 'read', 'INSURER_FICHA_NOT_READ_MODE', label);
  assert(await page.locator('#af-guardar').count() === 0, 'INSURER_SAVE_VISIBLE_IN_READ_MODE', label);
  if (advisorMode) assert(await page.locator('#af-editar').count() === 0, 'ADVISOR_INSURER_EDIT_VISIBLE');

  await page.locator('[data-tab="tarifas"]').click();
  const knowledge = page.locator('#asg-knowledge-projection-v20260716');
  await knowledge.waitFor({ state: 'visible', timeout: 15000 });
  const text = String(await knowledge.innerText()).replace(/\s+/g, ' ').trim();
  assert(/Mapeo|Mapeado|Conocimiento proyectado/i.test(text), 'INSURER_KNOWLEDGE_NOT_VISIBLE', label);
  assert(!/No hay fuentes vinculadas/.test(text), 'INSURER_KNOWLEDGE_SOURCES_EMPTY', label);
  report[`${label}KnowledgeVisible`] = true;
}

async function validateMobileMenu(page) {
  await page.locator('#burger').click();
  await page.waitForTimeout(350);
  const labels = await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes => nodes.map(node => String(node.textContent || '').replace(/\s+/g, ' ').trim()));
  assert(labels.length > 1, 'MOBILE_MENU_ONLY_HOME', String(labels.length));
  assert(labels.some(label => /Cliente/i.test(label)), 'MOBILE_MENU_CLIENTES_MISSING');
  assert(labels.some(label => /Aseguradoras/i.test(label)), 'MOBILE_MENU_INSURERS_MISSING');
  report.mobileMenuVisibleModules = labels.length;
  report.checks.mobileMenuComplete = true;
}

let browser;
const watchdog = setTimeout(() => {
  report.ok = false;
  report.error = `GATE_TIMEOUT:${report.stage}`;
  persist();
  process.exit(124);
}, 300000);

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(45000);

  stage('canonical_runtime');
  await enterCanonicalRuntime(page);
  stage('authentication_visible_form');
  await loginThroughVisibleForm(page);
  stage('legal_gate');
  await acceptLegalOnce(page);
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
  persist();
  clearTimeout(watchdog);
  if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]);
}

console.log(`ORBIT360_VISUAL_GATE_RESULT:${JSON.stringify({ ok: report.ok, stage: report.stage, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
process.exit(report.ok ? 0 : 1);
