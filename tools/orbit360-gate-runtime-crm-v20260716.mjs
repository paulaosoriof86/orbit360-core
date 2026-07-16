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
  schemaVersion: 'orbit360-runtime-gate-joint-v5',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  checks: {}
};

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (accessKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });
mkdirSync(insurerOutDir, { recursive: true });

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}

function isInformationalLoginText(value) {
  return /Inicia sesi[oó]n|sesi[oó]n no corresponde|usuario LAB autorizado|carga inicial|ejecutar el dry-run/i.test(String(value || ''));
}

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

async function visibleCount(locator) {
  return locator.evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length);
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
      firebaseLoader: String((window.OrbitBackend || {}).firebaseLoader || ''),
      errorText: String((document.getElementById('login-error') || {}).textContent || '').trim()
    };
  });
}

async function ensureAuthenticated(page) {
  const deadline = Date.now() + 60000;
  let submitted = false;
  let submittedAt = 0;
  let lastState = null;

  while (Date.now() < deadline) {
    let state = await authState(page);
    lastState = state;

    if (state.inside || state.currentUser) {
      if (!state.inside) {
        await page.evaluate(() => { try { if (Orbit.auth && Orbit.auth.showApp) Orbit.auth.showApp(); } catch (error) {} });
      }
      await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 10000 });
      report.authMode = submitted ? 'ui_form' : 'session_restored';
      report.checks.authenticated = true;
      return;
    }

    if (state.providerReady && !state.formVisible) {
      await page.evaluate(() => { try { if (Orbit.auth && Orbit.auth.showLogin) Orbit.auth.showLogin(); } catch (error) {} });
      await page.waitForTimeout(350);
      state = await authState(page);
      lastState = state;
    }

    if (state.providerReady && state.formVisible && !submitted) {
      try {
        await page.locator('#lg-user').waitFor({ state: 'visible', timeout: 8000 });
        await page.locator('#lg-pass').waitFor({ state: 'visible', timeout: 8000 });
        await page.evaluate(() => {
          const el = document.getElementById('login-error');
          if (el) el.textContent = '';
        });
        await page.locator('#lg-user').fill(email);
        await page.locator('#lg-pass').fill(accessKey);
        submitted = true;
        submittedAt = Date.now();
        await page.locator('#login-form').evaluate(form => form.requestSubmit());
        await page.waitForTimeout(700);
        state = await authState(page);
        lastState = state;
      } catch (error) {
        submitted = false;
        submittedAt = 0;
      }
    }

    if (submitted && Date.now() - submittedAt > 1200 && state.errorText && !isInformationalLoginText(state.errorText)) {
      report.authDiagnostic = {
        providerReady: !!state.providerReady,
        currentUser: !!state.currentUser,
        formVisible: !!state.formVisible,
        firebaseInit: String(state.firebaseInit || ''),
        firebaseLoader: String(state.firebaseLoader || ''),
        errorCategory: 'provider_or_form_rejection'
      };
      throw new Error('LOGIN_REJECTED_BY_PROVIDER');
    }

    await page.waitForTimeout(500);
  }

  report.authDiagnostic = {
    providerReady: !!(lastState && lastState.providerReady),
    currentUser: !!(lastState && lastState.currentUser),
    formVisible: !!(lastState && lastState.formVisible),
    firebaseInit: String(lastState && lastState.firebaseInit || ''),
    firebaseLoader: String(lastState && lastState.firebaseLoader || ''),
    submitted
  };
  throw new Error(`LOGIN_UI_STATE_UNSTABLE:${report.authDiagnostic.firebaseInit || 'sin_init'}:${report.authDiagnostic.firebaseLoader || 'sin_loader'}`);
}

async function acceptLegalGate(page) {
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible);
    if (boxes.length !== 1) return { count: boxes.length, error: boxes.length ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE' };
    const checkbox = boxes[0];
    const root = checkbox.closest('.drawer-back') || document;
    const accept = root.querySelector('#lg-ok,#conf-ok');
    if (!accept) return { count: 1, error: 'LEGAL_ACCEPT_BUTTON_MISSING' };
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    accept.disabled = false;
    accept.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { count: 1, accepted: true };
  });
  report.legalVisibleBefore = state.count;
  if (state.error) throw new Error(`${state.error}:${state.count}`);
  assert(state.accepted, 'LEGAL_GATE_NOT_ACCEPTED');
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
  assert(await page.locator('#asg-order-v20260716').count() === 1, 'INSURER_ORDER_CONTROL_MISSING', label);

  const mappedCard = cards.filter({ hasText: mappedInsurer }).first();
  assert(await mappedCard.count() > 0, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  await mappedCard.click();

  const ficha = page.locator('#asg-ficha');
  await ficha.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForCanonicalRuntime(page);
  await ensureAuthenticated(page);
  await acceptLegalGate(page);

  report.storeCounts = await waitForRealTenantData(page, 26);

  await selectRole(page, 'Dirección');
  await validateClient360(page, report, 'desktopDirection');
  await validateInsurers(page, 'desktopDirection');
  report.checks.desktopDirection = true;

  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  await validateClient360(page, report, 'tabletOperativo');
  await validateInsurers(page, 'tabletOperativo');
  report.checks.tabletOperativo = true;

  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
  await validateMobileMenu(page);
  await validateClient360(page, report, 'mobileAsesor');
  await validateInsurers(page, 'mobileAsesor', true);
  report.checks.mobileAsesor = true;

  report.checks.realClientCount = report.storeCounts.clientes === 414;
  report.checks.realInsurerCount = report.storeCounts.aseguradoras === 26;
  report.checks.allTenTabs = true;
  report.checks.gtFirst = true;
  report.checks.insurerReadMode = true;
  report.checks.insurerKnowledgeVisible = true;
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message || error)).replace(/\s+/g, ' ').trim();
} finally {
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(`${outDir}/resultado-sanitizado.json`, payload);
  writeFileSync(`${insurerOutDir}/resultado-sanitizado.json`, payload);
  await browser.close();
}

console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({
  ok: report.ok,
  counts: report.storeCounts || {},
  checks: report.checks,
  error: report.error || ''
})}`);
if (!report.ok) process.exit(1);
