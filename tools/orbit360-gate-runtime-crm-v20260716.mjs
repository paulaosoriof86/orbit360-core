import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';

const baseUrl = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const email = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const accessKey = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const outDir = 'orbit360-platform/runtime-gate-crm-v20260716';
const report = { schemaVersion: 'orbit360-runtime-gate-crm-v1', generatedAt: new Date().toISOString(), containsPII: false, containsSecrets: false, checks: {} };

if (!/^https:\/\//.test(baseUrl)) throw new Error('BLOQUEO_PREVIEW_URL');
if (accessKey.length < 12) throw new Error('BLOQUEO_ACCESO_LAB');
mkdirSync(outDir, { recursive: true });

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
    const checkbox = boxes[0];
    const root = checkbox.closest('[data-orbit-legal-scope]') || checkbox.closest('.drawer-back') || document;
    const accept = root.querySelector('#lg-ok');
    if (!accept) return { detected: true, accepted: false, count: boxes.length, error: 'LEGAL_ACCEPT_BUTTON_MISSING' };
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    accept.click();
    return { detected: true, accepted: true, count: boxes.length };
  });
  report.checks.legalGateDetected = state.detected;
  if (state.error) throw new Error(state.error);
  if (state.detected && !state.accepted) throw new Error('LEGAL_GATE_NOT_ACCEPTED');

  await page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return !Array.from(document.querySelectorAll('#lg-chk,[data-orbit-legal-scope]')).some(visible);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(900);
  const openLegalScopes = await visibleCount(page.locator('[data-orbit-legal-scope]'));
  const visibleCheckboxes = await visibleCount(page.locator('#lg-chk'));
  if (openLegalScopes || visibleCheckboxes) throw new Error(`LEGAL_MODAL_REAPPEARED:${openLegalScopes}:${visibleCheckboxes}`);
  report.checks.legalOneClick = true;
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
  await acceptLegalGate(page);

  report.storeCounts = await waitForRealTenantData(page, 26);

  await selectRole(page, 'Dirección');
  await validateClient360(page, report, 'desktopDirection');
  report.checks.desktopDirection = true;

  await page.setViewportSize({ width: 820, height: 1180 });
  await selectRole(page, 'Operativo');
  await validateClient360(page, report, 'tabletOperativo');
  report.checks.tabletOperativo = true;

  await page.setViewportSize({ width: 390, height: 844 });
  await selectRole(page, 'Asesor');
  await validateClient360(page, report, 'mobileAsesor');
  report.checks.mobileAsesor = true;

  report.checks.realClientCount = report.storeCounts.clientes === 414;
  report.checks.realInsurerCount = report.storeCounts.aseguradoras === 26;
  report.checks.allTenTabs = true;
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message || error)).replace(/\s+/g, ' ').trim();
} finally {
  writeFileSync(`${outDir}/resultado-sanitizado.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(`ORBIT360_RUNTIME_GATE_CRM:${JSON.stringify({ ok: report.ok, counts: report.storeCounts || {}, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
