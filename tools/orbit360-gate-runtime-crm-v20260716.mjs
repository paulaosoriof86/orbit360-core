import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const accessKey = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const outDir = 'orbit360-platform/runtime-gate-crm-v20260716';
const insurerOutDir = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const mappedInsurer = /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report = { schemaVersion: 'orbit360-runtime-gate-joint-v2', generatedAt: new Date().toISOString(), containsPII: false, containsSecrets: false, checks: {} };

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (accessKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });
mkdirSync(insurerOutDir, { recursive: true });

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}

async function selectRole(page, role) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const match = options.find(item => item.text.toLowerCase().includes(role.toLowerCase()));
  if (!match) throw new Error(`ROLE_OPTION_NOT_FOUND:${role}`);
  await select.selectOption(match.value);
  await page.waitForTimeout(600);
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
    try { providerReady = !!(window.firebase && firebase.auth && typeof firebase.auth().signInWithEmailAndPassword === 'function'); } catch (error) {}
    return {
      inside: !document.body.classList.contains('pre-auth'),
      formVisible: visible(document.getElementById('login-form')),
      providerReady,
      hasError: !!String((document.getElementById('login-error') || {}).textContent || '').trim()
    };
  });
}

async function ensureAuthenticated(page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let state = await authState(page);
    if (state.inside) {
      report.checks.sessionRestored = true;
      return;
    }
    if (!state.providerReady) {
      await page.waitForTimeout(500);
      continue;
    }
    if (!state.formVisible) {
      await page.evaluate(() => {
        try { if (window.Orbit && Orbit.auth && typeof Orbit.auth.showLogin === 'function') Orbit.auth.showLogin(); } catch (error) {}
      });
      await page.waitForTimeout(500);
      state = await authState(page);
      if (state.inside) {
        report.checks.sessionRestoredDuringLogin = true;
        return;
      }
      if (!state.formVisible) continue;
    }

    try {
      await page.locator('#lg-user').fill(email, { timeout: 4000 });
      await page.locator('#lg-pass').fill(accessKey, { timeout: 4000 });
      await page.locator('#login-form').evaluate(form => form.requestSubmit());
    } catch (error) {
      state = await authState(page);
      if (state.inside) {
        report.checks.sessionRestoredDuringLogin = true;
        return;
      }
      await page.waitForTimeout(500);
      continue;
    }

    try {
      await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 12000 });
      report.checks.login = true;
      return;
    } catch (error) {
      state = await authState(page);
      if (state.inside) {
        report.checks.login = true;
        return;
      }
      if (state.hasError) throw new Error('LOGIN_REJECTED_BY_PROVIDER');
    }
  }
  throw new Error('LOGIN_UI_STATE_UNSTABLE');
}

async function acceptLegalGate(page) {
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
  report.checks.legalGateDetected = state.detected;
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
  if (visibleCheckboxes) throw new Error(`LEGAL_MODAL_REAPPEARED:${visibleCheckboxes}`);
  report.legalVisibleAfter = visibleCheckboxes;
  report.checks.legalOneClick = true;
}

async function validateInsurers(page, label, advisorMode = false) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  await page.waitForTimeout(900);
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
  return true;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/index\.html/, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({ ok: report.ok, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
