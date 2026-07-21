import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const EMAIL = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const PASSWORD = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const EXPECTED_COMMIT = String(process.env.ORBIT360_EXPECTED_COMMIT || '');
const OUT_DIR = 'orbit360-platform/runtime-gate-real-insurer-directories-v20260720';

if (!/^https:\/\//.test(BASE_URL)) throw new Error('PREVIEW_URL_REQUIRED');
if (PASSWORD.length < 12) throw new Error('LAB_LOGIN_REQUIRED');
if (!/^[a-f0-9]{40}$/i.test(EXPECTED_COMMIT)) throw new Error('EXPECTED_COMMIT_REQUIRED');
mkdirSync(OUT_DIR, { recursive: true });

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}

async function acceptLegal(page) {
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const checkbox = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).find(visible);
    if (!checkbox) return { detected: false, accepted: true };
    const root = checkbox.closest('.drawer-back') || document;
    const button = root.querySelector('#lg-ok,#conf-ok');
    if (!button) return { detected: true, accepted: false, error: 'LEGAL_ACCEPT_MISSING' };
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    button.disabled = false;
    button.click();
    return { detected: true, accepted: true };
  });
}

async function selectDirection(page) {
  const select = page.locator('#rol-sel');
  await select.waitFor({ state: 'attached', timeout: 15000 });
  const options = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: String(node.textContent || '').trim() })));
  const direction = options.find((item) => /direcci[oó]n/i.test(item.text));
  assert(direction, 'DIRECTION_ROLE_NOT_FOUND');
  await select.selectOption(direction.value);
  await page.waitForTimeout(600);
  return options.map((item) => item.text);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const report = {
  schemaVersion: 'orbit360-real-insurer-directory-readiness-v1',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  expectedCommit: EXPECTED_COMMIT,
  checks: {}
};

try {
  await page.goto(`${BASE_URL}/ays-lab-preview.html?readiness=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/index\.html/, { timeout: 30000 });
  await page.locator('#login-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#lg-user').fill(EMAIL);
  await page.locator('#lg-pass').fill(PASSWORD);
  await page.locator('#login-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 45000 });

  const legal = await acceptLegal(page);
  assert(legal.accepted, legal.error || 'LEGAL_NOT_ACCEPTED');
  await page.waitForTimeout(900);

  await page.waitForFunction(() => window.Orbit && Orbit.store && Orbit.store.all && Orbit.store.all('aseguradoras').length === 26, null, { timeout: 45000 });
  report.roleOptions = await selectDirection(page);

  await page.evaluate(() => { location.hash = '#/aseguradoras'; });
  const cards = page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const insurerCount = await cards.count();
  assert(insurerCount === 26, 'INSURER_COUNT_INVALID', String(insurerCount));

  const importerRuntime = await page.evaluate(() => ({
    owner: !!(window.Orbit && Orbit.insurerDirectoryImport),
    parseFile: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.parseFile === 'function'),
    applyApproved: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.applyApproved === 'function'),
    applySecureOnly: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.applySecureOnly === 'function'),
    secureProvider: !!(window.Orbit && Orbit.secureImport && typeof Orbit.secureImport.importInsurerDirectory === 'function'),
    rawSensitiveFieldCount: (Orbit.store.all('aseguradoras') || []).reduce((total, insurer) => {
      const portals = [].concat(insurer && insurer.portales || []);
      const accounts = [].concat(insurer && insurer.cuentas || []);
      const portalRaw = portals.reduce((count, row) => count + ['usuario','user','password','pass','contrasena'].filter((key) => String(row && row[key] || '').trim()).length, 0);
      const accountRaw = accounts.reduce((count, row) => count + ['numero','accountNumber'].filter((key) => String(row && row[key] || '').trim()).length, 0);
      return total + portalRaw + accountRaw;
    }, 0)
  }));
  assert(importerRuntime.owner && importerRuntime.parseFile && importerRuntime.applyApproved && importerRuntime.applySecureOnly, 'IMPORTER_OWNER_NOT_READY');
  assert(importerRuntime.secureProvider, 'SECURE_PROVIDER_NOT_READY');
  assert(importerRuntime.rawSensitiveFieldCount === 0, 'RAW_SENSITIVE_FIELDS_PRESENT', String(importerRuntime.rawSensitiveFieldCount));

  const importButton = page.locator('#asg-imp, [data-import-asg]').first();
  await importButton.waitFor({ state: 'visible', timeout: 15000 });
  assert(await importButton.isEnabled(), 'IMPORT_BUTTON_DISABLED');
  await importButton.click();

  const modal = page.locator('#ins-dir-import-v1202');
  await modal.waitFor({ state: 'visible', timeout: 15000 });
  const country = modal.locator('#idir-country');
  const file = modal.locator('#idir-file');
  await country.waitFor({ state: 'visible', timeout: 10000 });
  await file.waitFor({ state: 'visible', timeout: 10000 });
  const countryValues = await country.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));
  const accept = String(await file.getAttribute('accept') || '');
  assert(countryValues.includes('GT') && countryValues.includes('CO'), 'COUNTRY_OPTIONS_INVALID', countryValues.join(','));
  assert(accept.includes('.xlsx') && accept.includes('.xls'), 'EXCEL_ACCEPT_INVALID', accept);

  const runtimeBuild = await page.evaluate(async () => {
    const response = await fetch(`runtime-build.json?readiness=${Date.now()}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
  });
  assert(runtimeBuild && runtimeBuild.commit === EXPECTED_COMMIT, 'RUNTIME_COMMIT_MISMATCH', String(runtimeBuild && runtimeBuild.commit || 'missing'));

  report.checks = {
    login: true,
    legalReady: true,
    directionRole: true,
    insurerCount26: insurerCount === 26,
    canonicalImporterOwner: importerRuntime.owner,
    parserReady: importerRuntime.parseFile,
    controlledWriterReady: importerRuntime.applyApproved,
    secureOnlyReady: importerRuntime.applySecureOnly,
    secureProviderReady: importerRuntime.secureProvider,
    noRawSensitiveFields: importerRuntime.rawSensitiveFieldCount === 0,
    importButtonReady: true,
    countryGTCO: countryValues.includes('GT') && countryValues.includes('CO'),
    excelInputReady: accept.includes('.xlsx') && accept.includes('.xls'),
    exactRuntimeCommit: runtimeBuild.commit === EXPECTED_COMMIT
  };
  report.insurerCount = insurerCount;
  report.rawSensitiveFieldCount = importerRuntime.rawSensitiveFieldCount;
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message) || error).replace(/\s+/g, ' ').trim().slice(0, 800);
} finally {
  writeFileSync(`${OUT_DIR}/resultado-sanitizado.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(`ORBIT360_REAL_DIRECTORY_READINESS:${JSON.stringify({ ok: report.ok, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
