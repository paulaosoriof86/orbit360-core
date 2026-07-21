import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE_URL = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const EMAIL = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const PASSWORD = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const EXPECTED_COMMIT = String(process.env.ORBIT360_EXPECTED_COMMIT || '');
const OUT_DIR = 'orbit360-platform/runtime-gate-real-insurer-directories-v20260720';
const CONTROLLED_WRITE_SMOKE = 'orbit360-platform/tools/orbit360-smoke-directorios-aseguradoras-v1202.mjs';
const CONTROLLED_WRITE_CONTRACT_VERSION = '20260721.2';

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
  schemaVersion: 'orbit360-real-insurer-directory-readiness-v3',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  expectedCommit: EXPECTED_COMMIT,
  controlledWriteContractVersion: CONTROLLED_WRITE_CONTRACT_VERSION,
  checks: {}
};

try {
  execFileSync(process.execPath, [CONTROLLED_WRITE_SMOKE], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

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

  const importerRuntime = await page.evaluate(() => {
    const fold = (value) => String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const placeholderTokens = [
      'backend_required', 'pendiente', 'sin verificar', 'no disponible',
      'requiere actualizacion', 'sin acceso registrado', 'protegido',
      'referencia', 'credentialref', 'accountref', 'n/a', 'na', 'null', 'none'
    ];
    const classify = (field, value) => {
      const raw = String(value == null ? '' : value).trim();
      if (!raw) return 'absent';
      const normalized = fold(raw);
      if (placeholderTokens.some((token) => normalized === token || normalized.includes(token))) return 'safe_placeholder';
      if (/[\*•●]{2,}/.test(raw) || /x{3,}/i.test(raw) || /\*{2,}@/.test(raw)) return 'safe_masked';
      if (/^(?:[_-]|\.)+$/.test(raw)) return 'safe_placeholder';
      return field === 'password' || field === 'pass' || field === 'contrasena'
        ? 'suspicious_password'
        : field === 'numero' || field === 'accountNumber'
          ? 'suspicious_account'
          : 'suspicious_user';
    };
    const inventory = {
      present: 0,
      safePlaceholder: 0,
      safeMasked: 0,
      suspiciousUnmasked: 0,
      suspiciousByType: { user: 0, password: 0, account: 0 },
      referenceCounts: { credentialRef: 0, accountRef: 0 },
      fieldCounts: {}
    };
    const inspect = (field, value) => {
      const category = classify(field, value);
      if (category === 'absent') return;
      inventory.present += 1;
      inventory.fieldCounts[field] = (inventory.fieldCounts[field] || 0) + 1;
      if (category === 'safe_placeholder') inventory.safePlaceholder += 1;
      else if (category === 'safe_masked') inventory.safeMasked += 1;
      else {
        inventory.suspiciousUnmasked += 1;
        if (category === 'suspicious_password') inventory.suspiciousByType.password += 1;
        else if (category === 'suspicious_account') inventory.suspiciousByType.account += 1;
        else inventory.suspiciousByType.user += 1;
      }
    };
    (Orbit.store.all('aseguradoras') || []).forEach((insurer) => {
      [].concat(insurer && insurer.portales || []).forEach((row) => {
        ['usuario','user','password','pass','contrasena'].forEach((field) => inspect(field, row && row[field]));
        if (String(row && row.credentialRef || '').trim()) inventory.referenceCounts.credentialRef += 1;
      });
      [].concat(insurer && insurer.cuentas || []).forEach((row) => {
        ['numero','accountNumber'].forEach((field) => inspect(field, row && row[field]));
        if (String(row && row.accountRef || '').trim()) inventory.referenceCounts.accountRef += 1;
      });
    });
    const contract = window.Orbit && Orbit.importerControlledWriteContractV20260721;
    return {
      owner: !!(window.Orbit && Orbit.insurerDirectoryImport),
      parseFile: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.parseFile === 'function'),
      applyApproved: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.applyApproved === 'function'),
      applySecureOnly: !!(window.Orbit && Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.applySecureOnly === 'function'),
      secureProvider: !!(window.Orbit && Orbit.secureImport && typeof Orbit.secureImport.importInsurerDirectory === 'function'),
      controlledWriteContract: !!contract,
      controlledWriteContractVersion: String(contract && contract.version || ''),
      p0WireReady: !!(window.Orbit && Orbit.importaDryRunP0Wire),
      p0WireContractVersion: String(Orbit.store && Orbit.store.__p0DryRunWireContractVersion || ''),
      sensitiveFieldInventory: inventory
    };
  });
  assert(importerRuntime.owner && importerRuntime.parseFile && importerRuntime.applyApproved && importerRuntime.applySecureOnly, 'IMPORTER_OWNER_NOT_READY');
  assert(importerRuntime.secureProvider, 'SECURE_PROVIDER_NOT_READY');
  assert(importerRuntime.controlledWriteContract, 'CONTROLLED_WRITE_CONTRACT_NOT_READY');
  assert(importerRuntime.controlledWriteContractVersion === CONTROLLED_WRITE_CONTRACT_VERSION, 'CONTROLLED_WRITE_CONTRACT_VERSION_INVALID', importerRuntime.controlledWriteContractVersion);
  assert(importerRuntime.p0WireReady, 'P0_WIRE_NOT_READY');
  assert(importerRuntime.p0WireContractVersion === CONTROLLED_WRITE_CONTRACT_VERSION, 'P0_WIRE_CONTRACT_VERSION_INVALID', importerRuntime.p0WireContractVersion);

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

  const sensitiveInventory = importerRuntime.sensitiveFieldInventory;
  report.checks = {
    controlledWriteRegression: true,
    login: true,
    legalReady: true,
    directionRole: true,
    insurerCount26: insurerCount === 26,
    canonicalImporterOwner: importerRuntime.owner,
    parserReady: importerRuntime.parseFile,
    controlledWriterReady: importerRuntime.applyApproved,
    secureOnlyReady: importerRuntime.applySecureOnly,
    secureProviderReady: importerRuntime.secureProvider,
    controlledWriteContractReady: importerRuntime.controlledWriteContract,
    controlledWriteContractExact: importerRuntime.controlledWriteContractVersion === CONTROLLED_WRITE_CONTRACT_VERSION,
    p0WireReady: importerRuntime.p0WireReady,
    p0WireContractExact: importerRuntime.p0WireContractVersion === CONTROLLED_WRITE_CONTRACT_VERSION,
    noUnmaskedSensitiveValues: sensitiveInventory.suspiciousUnmasked === 0,
    importButtonReady: true,
    countryGTCO: countryValues.includes('GT') && countryValues.includes('CO'),
    excelInputReady: accept.includes('.xlsx') && accept.includes('.xls'),
    exactRuntimeCommit: runtimeBuild.commit === EXPECTED_COMMIT
  };
  report.insurerCount = insurerCount;
  report.sensitiveFieldInventory = sensitiveInventory;
  report.importerRuntime = {
    controlledWriteContractVersion: importerRuntime.controlledWriteContractVersion,
    p0WireContractVersion: importerRuntime.p0WireContractVersion
  };
  report.ok = Object.values(report.checks).every(Boolean);
  if (!report.ok && sensitiveInventory.suspiciousUnmasked > 0) {
    report.error = `UNMASKED_SENSITIVE_VALUES_PRESENT:${sensitiveInventory.suspiciousUnmasked}`;
  }
} catch (error) {
  report.ok = false;
  report.error = String(error && (error.stack || error.message) || error).replace(/\s+/g, ' ').trim().slice(0, 800);
} finally {
  writeFileSync(`${OUT_DIR}/resultado-sanitizado.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(`ORBIT360_REAL_DIRECTORY_READINESS:${JSON.stringify({ ok: report.ok, checks: report.checks, error: report.error || '' })}`);
if (!report.ok) process.exit(1);
