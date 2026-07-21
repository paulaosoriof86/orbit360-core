#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, '');
const EMAIL = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com');
const PASSWORD = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const OUT_FILE = 'orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-provider-sanitizado.json';

if (!/^https:\/\//.test(BASE_URL)) throw new Error('PREVIEW_URL_REQUIRED');
if (PASSWORD.length < 12) throw new Error('LAB_LOGIN_REQUIRED');
fs.mkdirSync('orbit360-platform/runtime-gate-real-insurer-directories-v20260720', { recursive: true });

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
    if (!checkbox) return true;
    const root = checkbox.closest('.drawer-back') || document;
    const button = root.querySelector('#lg-ok,#conf-ok');
    if (!button) return false;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    button.disabled = false;
    button.click();
    return true;
  });
}

const report = {
  schemaVersion: 'orbit360-bank-account-provider-readiness-v1',
  generatedAt: new Date().toISOString(),
  containsPII: false,
  containsSecrets: false,
  checks: {},
  ok: false
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(`${BASE_URL}/ays-lab-preview.html?bankProvider=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/index\.html/, { timeout: 30000 });
  await page.locator('#login-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#lg-user').fill(EMAIL);
  await page.locator('#lg-pass').fill(PASSWORD);
  await page.locator('#login-form').evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => !document.body.classList.contains('pre-auth'), null, { timeout: 45000 });
  if (!(await acceptLegal(page))) throw new Error('LEGAL_NOT_ACCEPTED');

  await page.waitForFunction(() => {
    const state = window.Orbit && Orbit.__insurerBankAccountProviderLabV20260721;
    return state && state.fieldProviderRegistered === true && state.importProviderWrapped === true;
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => window.Orbit && Orbit.store && Orbit.store.all && Orbit.store.all('aseguradoras').length === 26, null, { timeout: 45000 });

  const result = await page.evaluate(async () => {
    const insurers = Orbit.store.all('aseguradoras') || [];
    let rawCount = 0;
    let refCount = 0;
    let target = null;
    insurers.forEach((insurer) => {
      [].concat(insurer.cuentas || []).forEach((account, index) => {
        if (String(account && (account.numero || account.accountNumber) || '').trim()) rawCount += 1;
        if (/^acct_[a-f0-9]{32}$/.test(String(account && account.accountRef || '').trim())) {
          refCount += 1;
          if (!target) target = {
            insurerId: String(insurer.id || ''),
            accountId: String(account.id || index),
            accountRef: String(account.accountRef || '')
          };
        }
      });
    });
    if (!target) return { rawCount, refCount, providerRegistered: true, revealConfirmed: false, errorCode: 'ACCOUNT_REF_NOT_FOUND' };
    const response = await Orbit.secureResources.revealField(target.accountRef, {
      module: 'aseguradoras',
      fieldType: 'bank_account',
      insurerId: target.insurerId,
      accountId: target.accountId
    });
    const revealConfirmed = Boolean(response && response.ok !== false && String(response.value || '').trim());
    if (response && typeof response === 'object') response.value = '';
    target.accountRef = '';
    return {
      rawCount,
      refCount,
      providerRegistered: true,
      revealConfirmed,
      errorCode: revealConfirmed ? '' : String(response && (response.status || response.message) || 'REVEAL_NOT_CONFIRMED').slice(0, 100)
    };
  });

  report.checks = {
    providerRegistered: result.providerRegistered === true,
    rawAccountsRemoved: result.rawCount === 0,
    secureReferencesPresent: result.refCount >= 91,
    protectedRevealConfirmed: result.revealConfirmed === true
  };
  report.inventory = { rawAccounts: result.rawCount, secureReferences: result.refCount };
  report.errorCode = result.errorCode || '';
  report.ok = Object.values(report.checks).every(Boolean);
} catch (error) {
  report.errorCode = String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 180);
  report.ok = false;
} finally {
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(`ORBIT360_BANK_PROVIDER_READINESS:${JSON.stringify({ ok: report.ok, checks: report.checks, inventory: report.inventory, errorCode: report.errorCode, containsSecrets: false })}`);
if (!report.ok) process.exit(1);
