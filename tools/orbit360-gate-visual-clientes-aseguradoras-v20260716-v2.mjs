import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const password = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '').replace(/[\r\n]+$/g, '');
const crmDir = 'orbit360-platform/runtime-gate-crm-v20260716';
const insurerDir = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const report = { schemaVersion: 'orbit360-visual-joint-gate-v2', generatedAt: new Date().toISOString(), containsPII: false, containsSecrets: false, stage: 'bootstrap', checks: {} };

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (password.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(crmDir, { recursive: true });
mkdirSync(insurerDir, { recursive: true });

function stage(value) { report.stage = value; console.log(`ORBIT360_VISUAL_GATE_STAGE:${value}`); }
function assert(ok, code, detail = '') { if (!ok) throw new Error(`${code}${detail ? `:${detail}` : ''}`); }
function persist() {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(`${crmDir}/resultado-sanitizado.json`, body);
  writeFileSync(`${insurerDir}/resultado-sanitizado.json`, body);
}

async function isInside(page) {
  return page.evaluate(() => {
    try {
      return !!(window.firebase && firebase.auth && firebase.auth().currentUser && !document.body.classList.contains('pre-auth'));
    } catch (error) { return false; }
  });
}

async function login(page) {
  await page.waitForFunction(() => window.Orbit && Orbit.auth && Orbit.store && window.firebase && firebase.auth, null, { timeout: 45000 });
  const accepted = await page.waitForFunction(() => {
    try {
      const inside = !!(firebase.auth().currentUser && !document.body.classList.contains('pre-auth'));
      const form = document.getElementById('login-form');
      const visible = form && getComputedStyle(form).display !== 'none' && form.getBoundingClientRect().height > 0;
      return inside || visible;
    } catch (error) { return false; }
  }, null, { timeout: 30000 });
  void accepted;

  if (!(await isInside(page))) {
    const submitted = await page.evaluate(({ loginEmail, loginPassword }) => {
      const inside = () => {
        try { return !!(firebase.auth().currentUser && !document.body.classList.contains('pre-auth')); }
        catch (error) { return false; }
      };
      if (inside()) return 'session_accepted';
      const form = document.getElementById('login-form');
      const user = document.getElementById('lg-user');
      const pass = document.getElementById('lg-pass');
      if (!form || !user || !pass) return inside() ? 'session_accepted' : 'form_missing';
      user.value = loginEmail;
      pass.value = loginPassword;
      user.dispatchEvent(new Event('input', { bubbles: true }));
      pass.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit();
      return 'submitted';
    }, { loginEmail: email, loginPassword: password });
    assert(submitted !== 'form_missing', 'LOGIN_FORM_ATOMIC_MISSING');
  }

  const handle = await page.waitForFunction(() => {
    let currentUser = false;
    try { currentUser = !!(firebase.auth().currentUser); } catch (error) {}
    const inside = !document.body.classList.contains('pre-auth');
    const error = String((document.getElementById('login-error') || {}).textContent || '').trim();
    if (currentUser && inside) return { ok: true, backend: String(document.body.dataset.authBackend || '') };
    if (error) return { ok: false, backend: '', error: error.slice(0, 120) };
    return false;
  }, null, { timeout: 45000 });
  const state = await handle.jsonValue();
  assert(state && state.ok, 'LOGIN_ATOMIC_FAILED', state && state.error ? 'visible_error' : 'unknown');
  assert(state.backend === 'firestore-lab', 'LOGIN_GUARD_NOT_ACCEPTED', state.backend || 'none');
  report.authMode = 'visible_form_atomic_or_restored';
  report.checks.authenticated = true;
}

async function legal(page) {
  await page.waitForTimeout(700);
  const boxes = page.locator('#lg-chk:visible,#conf-chk:visible');
  const count = await boxes.count();
  report.legalVisibleBefore = count;
  assert(count === 1, count > 1 ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(count));
  const box = boxes.first();
  const modal = box.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " drawer-back ")][1]');
  await box.check({ force: true });
  await modal.locator('#lg-ok,#conf-ok').first().click({ force: true });
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).some(node => {
    const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }), null, { timeout: 10000 });
  report.legalVisibleAfter = 0;
  report.checks.legalOneClick = true;
}

async function role(page, name) {
  const select = page.locator('#rol-sel');
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const match = options.find(item => item.text.toLowerCase().includes(name.toLowerCase()));
  assert(match, 'ROLE_OPTION_NOT_FOUND', name);
  await select.selectOption(match.value);
  await page.waitForTimeout(600);
}

async function insurers(page, label, advisor = false) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const count = await cards.count();
  assert(count === 26, 'INSURER_CARD_COUNT_INVALID', `${label}:${count}`);
  assert(/\bGT\b/.test(String(await cards.first().innerText())), 'GT_NOT_FIRST', label);
  assert(await page.locator('#asg-order-v20260716').count() === 1, 'INSURER_ORDER_CONTROL_MISSING', label);
  const mapped = cards.filter({ hasText: /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i }).first();
  assert(await mapped.count() > 0, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  await mapped.click();
  const ficha = page.locator('#asg-ficha');
  await ficha.waitFor({ state: 'visible', timeout: 15000 });
  assert(await ficha.getAttribute('data-mode') === 'read', 'INSURER_FICHA_NOT_READ_MODE', label);
  assert(await page.locator('#af-guardar').count() === 0, 'INSURER_SAVE_VISIBLE_IN_READ_MODE', label);
  if (advisor) assert(await page.locator('#af-editar').count() === 0, 'ADVISOR_INSURER_EDIT_VISIBLE');
  await page.locator('[data-tab="tarifas"]').click();
  const knowledge = page.locator('#asg-knowledge-projection-v20260716');
  await knowledge.waitFor({ state: 'visible', timeout: 15000 });
  const text = String(await knowledge.innerText()).replace(/\s+/g, ' ');
  assert(/Mapeo|Mapeado|Conocimiento proyectado/i.test(text), 'INSURER_KNOWLEDGE_NOT_VISIBLE', label);
  assert(!/No hay fuentes vinculadas/.test(text), 'INSURER_KNOWLEDGE_SOURCES_EMPTY', label);
  report[`${label}InsurerCards`] = count;
  report[`${label}KnowledgeVisible`] = true;
}

async function mobileMenu(page) {
  await page.locator('#burger').click();
  await page.waitForTimeout(300);
  const labels = await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes => nodes.map(node => String(node.textContent || '').replace(/\s+/g, ' ').trim()));
  assert(labels.some(value => /Cliente/i.test(value)), 'MOBILE_MENU_CLIENTES_MISSING');
  assert(labels.some(value => /Aseguradoras/i.test(value)), 'MOBILE_MENU_INSURERS_MISSING');
  report.mobileMenuVisibleModules = labels.length;
  report.checks.mobileMenuComplete = true;
}

let browser;
const watchdog = setTimeout(() => { report.ok = false; report.error = `GATE_TIMEOUT:${report.stage}`; persist(); process.exit(124); }, 300000);
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  stage('canonical_runtime');
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => { const q = new URLSearchParams(location.search); return /\/index\.html$/.test(location.pathname) && q.get('orbitBackend') === 'firestore-lab' && q.get('tenant') === 'alianzas-soluciones'; }, null, { timeout: 45000 });
  report.checks.canonicalRuntime = true;
  stage('authentication_atomic'); await login(page);
  stage('legal_gate'); await legal(page);
  stage('real_tenant_data'); report.storeCounts = await waitForRealTenantData(page, 26);
  stage('desktop_direction_client360'); await role(page, 'Dirección'); await validateClient360(page, report, 'desktopDirection');
  stage('desktop_direction_aseguradoras'); await insurers(page, 'desktopDirection'); report.checks.desktopDirection = true;
  stage('tablet_operativo_client360'); await page.setViewportSize({ width: 820, height: 1180 }); await role(page, 'Operativo'); await validateClient360(page, report, 'tabletOperativo');
  stage('tablet_operativo_aseguradoras'); await insurers(page, 'tabletOperativo'); report.checks.tabletOperativo = true;
  stage('mobile_asesor_menu'); await page.setViewportSize({ width: 390, height: 844 }); await role(page, 'Asesor'); await mobileMenu(page);
  stage('mobile_asesor_client360'); await validateClient360(page, report, 'mobileAsesor');
  stage('mobile_asesor_aseguradoras'); await insurers(page, 'mobileAsesor', true); report.checks.mobileAsesor = true;
  report.checks.realClientCount = report.storeCounts.clientes === 414;
  report.checks.realInsurerCount = report.storeCounts.aseguradoras === 26;
  report.checks.allTenTabs = true; report.checks.gtFirst = true; report.checks.insurerReadMode = true; report.checks.insurerKnowledgeVisible = true;
  report.ok = Object.values(report.checks).every(Boolean); stage('completed');
} catch (error) {
  report.ok = false; report.error = String(error && (error.stack || error.message || error)).replace(/\s+/g, ' ').trim();
} finally {
  persist(); clearTimeout(watchdog); if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]);
}
console.log(`ORBIT360_VISUAL_GATE_RESULT:${JSON.stringify({ ok: report.ok, stage: report.stage, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
process.exit(report.ok ? 0 : 1);
