import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const accessKey = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const outDir = 'orbit360-platform/runtime-gate-aseguradoras-v20260716';
const mappedInsurer = /Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report = { schemaVersion: 'orbit360-runtime-gate-aseguradoras-v3', generatedAt: new Date().toISOString(), containsPII: false, containsSecrets: false, checks: {} };

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (accessKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
async function selectRole(page, role) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const match = options.find(item => item.text.toLowerCase().includes(role.toLowerCase()));
  assert(match, 'ROLE_OPTION_NOT_FOUND', role);
  await select.selectOption(match.value);
  await page.waitForTimeout(600);
}
async function validateInsurers(page, label) {
  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  await page.waitForTimeout(700);
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
  await page.waitForTimeout(400);
  assert(await ficha.getAttribute('data-mode') === 'read', 'INSURER_FICHA_NOT_READ_MODE', label);
  assert(await page.locator('#af-guardar').count() === 0, 'INSURER_SAVE_VISIBLE_IN_READ_MODE', label);

  await page.locator('[data-tab="tarifas"]').click();
  const knowledge = page.locator('#asg-knowledge-projection-v20260716');
  await knowledge.waitFor({ state: 'visible', timeout: 15000 });
  const text = String(await knowledge.innerText()).replace(/\s+/g, ' ').trim();
  assert(/Mapeo|Mapeado|Conocimiento proyectado/i.test(text), 'INSURER_KNOWLEDGE_NOT_VISIBLE', label);
  assert(!/No hay fuentes vinculadas/.test(text), 'INSURER_KNOWLEDGE_SOURCES_EMPTY', label);
  report[`${label}KnowledgeVisible`] = true;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(`${baseUrl}/ays-lab-preview.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/index\.html/, { timeout: 30000 });
  await page.locator('#login-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#lg-user').fill(email);
  await page.locator('#lg-pass').fill(accessKey);
  await page.locator('#login-form').evaluate(form => form.requestSubmit());
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 45000 });

  const legal = page.locator('.conf-modal');
  await page.waitForTimeout(700);
  report.legalModalCountBefore = await legal.count();
  assert(report.legalModalCountBefore <= 1, 'LEGAL_DUPLICATE_MODALS');
  if (report.legalModalCountBefore === 1) {
    await page.locator('.conf-modal #lg-chk').check();
    await page.locator('.conf-modal #lg-ok').click();
    await legal.waitFor({ state: 'detached', timeout: 10000 });
  }
  await page.waitForTimeout(1000);
  assert(await legal.count() === 0, 'LEGAL_MODAL_REAPPEARED');

  report.storeCounts = await waitForRealTenantData(page, 26);

  await selectRole(page, 'Dirección');
  await validateInsurers(page, 'desktopDirection');
  report.checks.desktopDirection = true;

  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  await validateInsurers(page, 'tabletOperativo');
  report.checks.tabletOperativo = true;

  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
  await validateInsurers(page, 'mobileAsesor');
  assert(await page.locator('#af-editar').count() === 0, 'ADVISOR_INSURER_EDIT_VISIBLE');
  report.checks.mobileAsesor = true;

  report.checks.realInsurerCount = report.storeCounts.aseguradoras === 26;
  report.checks.gtFirst = true;
  report.checks.readMode = true;
  report.checks.knowledgeVisible = true;
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message || error)).replace(/\s+/g, ' ').trim();
} finally {
  writeFileSync(`${outDir}/resultado-sanitizado.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(`ORBIT360_RUNTIME_GATE_INSURERS:${JSON.stringify({ ok: report.ok, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
