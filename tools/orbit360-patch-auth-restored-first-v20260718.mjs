import fs from 'node:fs';

const target = 'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
let source = fs.readFileSync(target, 'utf8');

const oldBlock = `  await bounded('authentication_form_ready', async () => {
    const form = page.locator('#login-form');
    await form.waitFor({ state: 'visible', timeout: 20000 });
    requireState(await form.getAttribute('data-auth-mode') === 'firestore-lab', 'AUTH_FORM_MODE_INVALID');
    await page.locator('#lg-user').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#lg-pass').waitFor({ state: 'visible', timeout: 10000 });
  }, 24000);

  const bodyClass = String(await page.locator('body').getAttribute('class') || '');
  if (!bodyClass.split(/\\s+/).includes('pre-auth')) {
    report.authMode = 'session_restored_external_ui';
    report.checks.authenticated = true;
    return;
  }
`;

const newBlock = `  const entryState = await bounded('authentication_form_ready', async () => {
    const body = page.locator('body');
    const login = page.locator('#login');
    await body.waitFor({ state: 'attached', timeout: 12000 });
    await login.waitFor({ state: 'attached', timeout: 12000 });
    const bodyClass = String(await body.getAttribute('class') || '');
    const loginClass = String(await login.getAttribute('class') || '');
    const restored = !bodyClass.split(/\\s+/).includes('pre-auth') || loginClass.split(/\\s+/).includes('hidden');
    if (restored) return { restored: true };

    const form = page.locator('#login-form');
    await form.waitFor({ state: 'visible', timeout: 20000 });
    requireState(await form.getAttribute('data-auth-mode') === 'firestore-lab', 'AUTH_FORM_MODE_INVALID');
    await page.locator('#lg-user').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#lg-pass').waitFor({ state: 'visible', timeout: 10000 });
    return { restored: false };
  }, 26000);

  if (entryState && entryState.restored) {
    report.authMode = 'session_restored_external_ui';
    report.checks.authenticated = true;
    return;
  }
`;

if (!source.includes(oldBlock)) throw new Error('AUTH_FORM_READY_BLOCK_NOT_FOUND');
source = source.replace(oldBlock, newBlock);
fs.writeFileSync(target, source, 'utf8');
