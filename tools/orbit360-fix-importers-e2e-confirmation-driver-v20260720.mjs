#!/usr/bin/env node
import fs from 'node:fs';

const target = 'tools/orbit360-importers-e2e-browser-v20260720.mjs';
let source = fs.readFileSync(target, 'utf8');

const runMarker = `async function run() {`;
const helper = `async function answerOrbitPrompt(page, expectedTitle, value) {
  const overlays = page.locator('.drawer-back.open').filter({ has: page.locator('[data-in]') });
  const overlay = overlays.filter({ hasText: expectedTitle }).last();
  await overlay.waitFor({ state: 'visible', timeout: 30000 });
  await overlay.locator('[data-in]').fill(value);
  await overlay.locator('[data-yes]').click();
  await overlay.waitFor({ state: 'detached', timeout: 30000 });
}

async function run() {`;

const before = `    await page.click('[data-secure-only]');
    let prompt = page.locator('.drawer-back.open').last();
    await prompt.locator('[data-in]').waitFor({ state: 'visible', timeout: 30000 });
    await prompt.locator('[data-in]').fill(\`Gate E2E sintético \${state.runId}\`);
    await prompt.locator('[data-yes]').click();
    prompt = page.locator('.drawer-back.open').last();
    await prompt.locator('[data-in]').waitFor({ state: 'visible', timeout: 30000 });
    await prompt.locator('[data-in]').fill('CONFIRMO DIRECTORIO');
    move('confirmation_accepted');
    move('identity_resolved');
    move('target_resolved');
    await prompt.locator('[data-yes]').click();`;

const after = `    await page.click('[data-secure-only]');
    diagnostic.confirmation = {
      driverVersion: '20260720.2',
      reasonPromptCompleted: false,
      phrasePromptCompleted: false
    };
    write();
    await answerOrbitPrompt(page, 'Confirmar accesos seguros', \`Gate E2E sintético \${state.runId}\`);
    diagnostic.confirmation.reasonPromptCompleted = true;
    write();
    await answerOrbitPrompt(page, 'Confirmación reforzada', 'CONFIRMO DIRECTORIO');
    diagnostic.confirmation.phrasePromptCompleted = true;
    write();
    move('confirmation_accepted');
    move('identity_resolved');
    move('target_resolved');`;

if (source.includes(after) && source.includes(helper)) {
  console.log('CONFIRMATION_DRIVER_ALREADY_CURRENT');
  process.exit(0);
}
if (!source.includes(before)) throw new Error('CONFIRMATION_DRIVER_SIGNATURE_NOT_FOUND');
if (!source.includes(runMarker)) throw new Error('RUN_MARKER_NOT_FOUND');
source = source.replace(runMarker, helper).replace(before, after);
fs.writeFileSync(target, source, 'utf8');
console.log('GO_IMPORTERS_E2E_CONFIRMATION_DRIVER_20260720_2');
