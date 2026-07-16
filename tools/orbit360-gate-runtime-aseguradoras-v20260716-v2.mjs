import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const LAB_KEY = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const EMAIL = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const OUT_DIR = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const MAPPED_INSURER = /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;

if (!/^https:\/\//.test(BASE_URL)) throw new Error('BLOQUEO_PREVIEW_URL');
if (LAB_KEY.length < 12) throw new Error('BLOQUEO_CREDENCIAL_LAB');
mkdirSync(OUT_DIR, { recursive: true });

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}

async function visibleCount(locator) {
  return locator.evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length);
}

async function selectRole(page, wanted) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: (node.textContent || '').trim() })));
  const option = options.find((item) => item.text.toLowerCase().includes(wanted.toLowerCase()));
  assert(option, 'ROLE_OPTION_NOT_FOUND', wanted);
  await select.selectOption(option.value);
  await page.waitForTimeout(600);
  return options.map((item) => item.text);
}

async function go(page, hash) {
  await page.evaluate((nextHash) => { location.hash = nextHash; }, hash);
  await page.waitForTimeout(700);
}

async function acceptLegalOnce(page, report) {
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk')).filter(visible);
    if (!boxes.length) return { detected: false, accepted: false, count: 0 };
    if (boxes.length !== 1) return { detected: true, accepted: false, count: boxes.length, error: 'LEGAL_DUPLICATE_VISIBLE' };
    const checkbox = boxes[0];
    const root = checkbox.closest('.drawer-back') || document;
    const accept = root.querySelector('#lg-ok');
    if (!accept) return { detected: true, accepted: false, count: 1, error: 'LEGAL_ACCEPT_BUTTON_MISSING' };
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    accept.disabled = false;
    accept.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { detected: true, accepted: true, count: 1 };
  });
  report.legalGateDetected = state.detected;
  report.legalVisibleBefore = state.count;
  if (state.error) throw new Error(`${state.error}:${state.count}`);
  if (state.detected && !state.accepted) throw new Error('LEGAL_GATE_NOT_ACCEPTED');

  await page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return !Array.from(document.querySelectorAll('#lg-chk')).some(visible);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(900);
  const visibleCheckboxes = await visibleCount(page.locator('#lg-chk'));
  assert(visibleCheckboxes === 0, 'LEGAL_MODAL_REAPPEARED', String(visibleCheckboxes));
  report.legalVisibleAfter = visibleCheckboxes;
  report.legalModalCountAfterOneClick = 0;
}

async function waitForRealInsurers(page) {
  await page.waitForFunction(() => window.Orbit && Orbit.store && Orbit.store.all && Orbit.store.all('aseguradoras').length === 26, null, { timeout: 45000 });
}

async function validateInsurers(page, report, label) {
  await go(page, '#/aseguradoras');
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  report[`${label}InsurerCards`] = await cards.count();
  assert(report[`${label}InsurerCards`] === 26, 'INSURER_CARD_COUNT_INVALID', `${label}:${report[`${label}InsurerCards`]}`);

  const firstText = (await cards.first().innerText()).replace(/\s+/g, ' ').trim();
  report[`${label}FirstInsurerText`] = firstText.slice(0, 180);
  assert(/\bGT\b/.test(firstText), 'GT_NOT_FIRST', firstText.slice(0, 100));

  const order = page.locator('#asg-order-v20260716');
  await order.waitFor({ state: 'visible', timeout: 10000 });
  report[`${label}OrderControl`] = await order.inputValue();

  const mappedCard = cards.filter({ hasText: MAPPED_INSURER }).first();
  assert(await mappedCard.count() >= 1, 'MAPPED_INSURER_CARD_NOT_FOUND', label);
  report[`${label}MappedInsurerText`] = (await mappedCard.innerText()).replace(/\s+/g, ' ').trim().slice(0, 180);
  await mappedCard.click();

  const ficha = page.locator('#asg-ficha');
  await ficha.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
  const mode = await ficha.getAttribute('data-mode');
  report[`${label}FichaMode`] = mode;
  assert(mode === 'read', 'FICHA_NOT_READ_MODE', `${label}:${mode}`);
  assert(await page.locator('#af-guardar').count() === 0, 'SAVE_VISIBLE_IN_READ_MODE', label);

  await page.locator('[data-tab="tarifas"]').click();
  const projection = page.locator('#asg-knowledge-projection-v20260716');
  await projection.waitFor({ state: 'visible', timeout: 15000 });
  const projectionText = (await projection.innerText()).replace(/\s+/g, ' ').trim();
  report[`${label}KnowledgePreview`] = projectionText.slice(0, 500);
  assert(/Mapeo|Mapeado|Conocimiento proyectado/i.test(projectionText), 'KNOWLEDGE_MAPPING_NOT_VISIBLE', label);
  assert(!/No hay fuentes vinculadas/.test(projectionText), 'KNOWLEDGE_SOURCES_EMPTY', label);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const report = {
  schemaVersion: 'orbit360-runtime-gate-aseguradoras-v2',
  generatedAt: new Date().toISOString(),
  previewUrl: BASE_URL,
  email: EMAIL,
  checks: {}
};

try {
  await page.goto(`${BASE_URL}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/index\.html/, { timeout: 30000 });
  await page.locator('#login-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#lg-user').fill(EMAIL);
  await page.locator('#lg-pass').fill(LAB_KEY);
  await page.locator('#login-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 45000 });
  await acceptLegalOnce(page, report);
  await waitForRealInsurers(page);

  report.roleOptions = await selectRole(page, 'Dirección');
  await validateInsurers(page, report, 'desktopDirection');

  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  await validateInsurers(page, report, 'tabletOperativo');

  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
  await go(page, '#/inicio');
  await page.locator('#burger').click();
  await page.waitForTimeout(300);
  const navLinks = page.locator('#sidebar .nav-link');
  report.mobileVisibleNavLinks = await visibleCount(navLinks);
  report.mobileNavText = (await navLinks.allInnerTexts()).join(' | ');
  assert(report.mobileVisibleNavLinks > 1, 'MOBILE_MENU_TRUNCATED', String(report.mobileVisibleNavLinks));
  assert(/Cliente/i.test(report.mobileNavText), 'CLIENTE360_NOT_IN_MOBILE_MENU', report.mobileNavText.slice(0, 200));

  const clientLink = navLinks.filter({ hasText: /Cliente/i }).first();
  const hashBeforeClient = await page.evaluate(() => location.hash);
  await clientLink.click();
  await page.waitForTimeout(700);
  const hashAfterClient = await page.evaluate(() => location.hash);
  report.mobileClientHashBefore = hashBeforeClient;
  report.mobileClientHashAfter = hashAfterClient;
  assert(hashAfterClient !== hashBeforeClient, 'CLIENTE360_MOBILE_NAV_DID_NOT_CHANGE_ROUTE');

  await validateInsurers(page, report, 'mobileAsesor');
  assert(await page.locator('#af-editar').count() === 0, 'ASESOR_EDIT_BUTTON_VISIBLE');

  report.checks = {
    login: true,
    legalOneClick: report.legalModalCountAfterOneClick === 0,
    desktopDirection: true,
    tabletOperativo: true,
    mobileAsesor: true,
    mobileMenuComplete: report.mobileVisibleNavLinks > 1,
    realInsurerCount: report.desktopDirectionInsurerCards === 26,
    gtFirst: true,
    fichaReadMode: true,
    knowledgeVisible: true
  };
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.ok = false;
  report.error = String(error?.stack || error?.message || error).replace(/\s+/g, ' ').trim();
} finally {
  writeFileSync(`${OUT_DIR}/resultado.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(`ORBIT360_RUNTIME_GATE:${JSON.stringify({ ok: report.ok, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
