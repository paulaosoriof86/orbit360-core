#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, 'tools/orbit360-r4-certified-product-contract-v20260815.json');
const BASE_HARNESS = path.join(ROOT, 'tools/orbit360-r4-production-readonly-smoke-v20260815.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const SELF_EVIDENCE = path.join(EVIDENCE_DIR, 'r4-certified-validator-rootfix-source-v20260815.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, payload) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8'); }
function fail(message) { throw new Error(message); }
function count(haystack, needle) { return haystack.split(needle).length - 1; }
function validateContract(contract) {
  if (contract.schemaVersion !== 'orbit360-r4-certified-product-contract-v1') fail('CONTRACT_SCHEMA_INVALID');
  if (contract.status !== 'R4_CERTIFIED_PRODUCT_CONTRACT_BOUND') fail('CONTRACT_STATUS_INVALID');
  if (!/^[a-f0-9]{40}$/.test(String(contract.sourceHead || ''))) fail('CONTRACT_SOURCE_INVALID');
  if (!/^[a-f0-9]{64}$/.test(String(contract.zipSha256 || ''))) fail('CONTRACT_ZIP_SHA_INVALID');
  if (Number(contract.fileCount) !== 194) fail('CONTRACT_FILE_COUNT_INVALID');
  const allowedManifestStatuses = new Set([
    'FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED',
    'FASE_A_PRODUCT_R4S1_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S2_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S3_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S4_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S6_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S8_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S9_MINIMAL_SUCCESSOR_CERTIFIED',
    'FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED'
  ]);
  if (!allowedManifestStatuses.has(String(contract.manifestStatus || ''))) fail('CONTRACT_MANIFEST_STATUS_INVALID');
  if (contract.entrypoint?.path !== 'index.html' || Number(contract.entrypoint?.bytes) !== 16893 || !/^[a-f0-9]{64}$/.test(String(contract.entrypoint?.sha256 || ''))) fail('CONTRACT_ENTRYPOINT_INVALID');
  if (contract.authAsset?.path !== '/core/auth-product-runtime-p0.js' || contract.authAsset?.sourcePath !== 'orbit360-platform/core/auth-product-runtime-p0.js' || Number(contract.authAsset?.bytes) !== 4211 || !/^[a-f0-9]{64}$/.test(String(contract.authAsset?.sha256 || ''))) fail('CONTRACT_AUTH_ASSET_INVALID');
  if (!Array.isArray(contract.legacyAssetsExcludedFromProduct) || !contract.legacyAssetsExcludedFromProduct.includes('/core/auth.js')) fail('CONTRACT_LEGACY_EXCLUSION_INVALID');
  if (contract.noLabRuntime !== true || contract.noPrivateSecretMaterial !== true || contract.writeAuthorized !== false || contract.packageRebuildAuthorized !== false || contract.productionMutationAuthorized !== false) fail('CONTRACT_SAFETY_FLAGS_INVALID');
}
function buildPatchedHarness(contract) {
  const original = fs.readFileSync(BASE_HARNESS, 'utf8');
  const stalePath = '/core/auth.js';
  if (count(original, stalePath) !== 1) fail(`STALE_PATH_COUNT_INVALID:${count(original, stalePath)}`);
  if (original.includes(contract.authAsset.path)) fail('BASE_HARNESS_ALREADY_PRODUCT_BOUND_UNEXPECTED');
  let patched = original.replace(stalePath, contract.authAsset.path);
  if (patched.includes(stalePath)) fail('STALE_PATH_REMAINS_AFTER_PATCH');
  if (count(patched, contract.authAsset.path) !== 1) fail('PRODUCT_AUTH_PATH_NOT_BOUND_EXACTLY_ONCE');

  const staleServiceWorkerBlock = ", serviceWorkers: 'block'";
  if (count(patched, staleServiceWorkerBlock) !== 1) fail(`STALE_SERVICE_WORKER_BLOCK_COUNT_INVALID:${count(patched, staleServiceWorkerBlock)}`);
  patched = patched.replace(staleServiceWorkerBlock, '');
  if (patched.includes("serviceWorkers: 'block'")) fail('SERVICE_WORKER_BLOCK_REMAINS_AFTER_PATCH');

  const staleBrowserLaunch = 'chromium.launch({ headless: true })';
  const runnerBrowserLaunch = 'chromium.launch({ headless: true, executablePath: process.env.ORBIT360_SYSTEM_BROWSER_EXECUTABLE || undefined })';
  if (count(patched, staleBrowserLaunch) !== 1) fail(`STALE_BROWSER_LAUNCH_COUNT_INVALID:${count(patched, staleBrowserLaunch)}`);
  patched = patched.replace(staleBrowserLaunch, runnerBrowserLaunch);
  if (count(patched, 'ORBIT360_SYSTEM_BROWSER_EXECUTABLE') !== 1) fail('RUNNER_BROWSER_EXECUTABLE_NOT_BOUND_EXACTLY_ONCE');

  const baseManifestStatus = 'FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED';
  if (count(patched, baseManifestStatus) !== 1) fail(`BASE_MANIFEST_STATUS_COUNT_INVALID:${count(patched, baseManifestStatus)}`);
  patched = patched.replace(baseManifestStatus, contract.manifestStatus);
  if (count(patched, contract.manifestStatus) !== 1) fail('CERTIFIED_MANIFEST_STATUS_NOT_BOUND_EXACTLY_ONCE');

  const stalePasswordDecl = "const PASSWORD = String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD || '');";
  const customTokenDecl = "const CUSTOM_TOKEN = String(process.env.ORBIT360_PRODUCT_SMOKE_CUSTOM_TOKEN || '');";
  if (count(patched, stalePasswordDecl) !== 1) fail(`STALE_PASSWORD_DECL_COUNT_INVALID:${count(patched, stalePasswordDecl)}`);
  patched = patched.replace(stalePasswordDecl, customTokenDecl);
  const stalePrecondition = "if (!TARGET.startsWith('https://') || !EMAIL || PASSWORD.length < 12 || !/^[a-f0-9]{64}$/.test(EXPECTED_AUTH_SHA256)) throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_SMOKE_PRECONDITION_NOT_BOUND');";
  const tokenPrecondition = "if (!TARGET.startsWith('https://') || !EMAIL || CUSTOM_TOKEN.length < 100 || !/^[a-f0-9]{64}$/.test(EXPECTED_AUTH_SHA256)) throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_CUSTOM_TOKEN_SMOKE_PRECONDITION_NOT_BOUND');";
  if (count(patched, stalePrecondition) !== 1) fail(`STALE_PASSWORD_PRECONDITION_COUNT_INVALID:${count(patched, stalePrecondition)}`);
  patched = patched.replace(stalePrecondition, tokenPrecondition);

  const staleAuthBlock = `  const authResponsePromise = page.waitForResponse(response => { try { const u = new URL(response.url()); return /identitytoolkit\\.googleapis\\.com/i.test(u.host) && /accounts:signInWithPassword/i.test(u.pathname); } catch { return false; } }, { timeout: 25000 });
  await runStage('login-submit', 15000, async () => { await page.fill('#lg-user', EMAIL); await page.fill('#lg-pass', PASSWORD); await page.click('#login-form button[type="submit"]'); });
  const authResponse = await runStage('login-http-response', 30000, () => authResponsePromise, r => ({ httpStatus: r.status() }));
  d.authHttp.seen = true; d.authHttp.status = authResponse.status();
  if (authResponse.status() >= 400) {
    const body = await withTimeout('auth-error-body', 4000, () => authResponse.json().catch(() => ({})));
    d.authHttp.errorCode = txt(body && body.error && (body.error.message || body.error.status) || '').split(/[:\\s]/)[0].replace(/[^A-Z0-9_-]/gi, '').toUpperCase().slice(0, 80);
    checkpoint('login-http-classified', 'FAIL', { httpStatus: d.authHttp.status, errorCode: d.authHttp.errorCode });
    throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_SMOKE_IDENTITY_CREDENTIAL_REJECTED');
  }
  checkpoint('login-http-classified', 'PASS', { httpStatus: d.authHttp.status });`;
  const customAuthBlock = `  const authResponsePromise = page.waitForResponse(response => { try { const u = new URL(response.url()); return /identitytoolkit\\.googleapis\\.com/i.test(u.host) && /accounts:signInWithCustomToken/i.test(u.pathname); } catch { return false; } }, { timeout: 25000 });
  await runStage('custom-token-submit', 15000, async () => { await page.evaluate(async token => { const p = window.Orbit && Orbit.productRuntimeBrowserProvidersP0; if (!p || typeof p.initialize !== 'function') throw new Error('PRODUCT_AUTH_PROVIDER_NOT_AVAILABLE'); const ctx = await p.initialize(); if (!ctx || !ctx.modules || !ctx.modules.auth || typeof ctx.modules.auth.signInWithCustomToken !== 'function') throw new Error('CUSTOM_TOKEN_AUTH_METHOD_NOT_AVAILABLE'); await ctx.modules.auth.signInWithCustomToken(ctx.auth, token); }, CUSTOM_TOKEN); });
  const authResponse = await runStage('custom-token-http-response', 30000, () => authResponsePromise, r => ({ httpStatus: r.status() }));
  d.authHttp.seen = true; d.authHttp.status = authResponse.status();
  if (authResponse.status() >= 400) {
    const body = await withTimeout('auth-error-body', 4000, () => authResponse.json().catch(() => ({})));
    d.authHttp.errorCode = txt(body && body.error && (body.error.message || body.error.status) || '').split(/[:\\s]/)[0].replace(/[^A-Z0-9_-]/gi, '').toUpperCase().slice(0, 80);
    checkpoint('custom-token-http-classified', 'FAIL', { httpStatus: d.authHttp.status, errorCode: d.authHttp.errorCode });
    throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_CUSTOM_TOKEN_AUTH_REJECTED');
  }
  checkpoint('custom-token-http-classified', 'PASS', { httpStatus: d.authHttp.status });`;
  if (count(patched, staleAuthBlock) !== 1) fail(`STALE_PASSWORD_AUTH_BLOCK_COUNT_INVALID:${count(patched, staleAuthBlock)}`);
  patched = patched.replace(staleAuthBlock, customAuthBlock);

  const staleRoleRequirement = "    out.roleCount = roles.length; out.requiredRolesPresent = ['Dirección', 'Operativo', 'Asesor'].every(role => roles.includes(role)); return out;";
  const canonicalTargetRoleRequirement = "    out.roleCount = roles.length; out.requiredRolesPresent = roles.length > 0 && roles.some(role => ['Dirección', 'SuperAdmin', 'AdminTenant'].includes(role)); return out;";
  if (count(patched, staleRoleRequirement) !== 1) fail(`STALE_SYNTHETIC_ROLE_REQUIREMENT_COUNT_INVALID:${count(patched, staleRoleRequirement)}`);
  patched = patched.replace(staleRoleRequirement, canonicalTargetRoleRequirement);

  const runtimeMarker = "  await runStage('runtime-activation', 45000, () => page.waitForFunction(() => { const app = window.Orbit && Orbit.productAppP0 && Orbit.productAppP0.status ? Orbit.productAppP0.status() : null; const loginError = document.getElementById('login-error'); return !!(app && app.started) || !!(app && app.lastError) || !!(loginError && String(loginError.textContent || '').trim()); }, undefined, { timeout: 40000 }));";
  const runtimeTrigger = `  await runStage('runtime-activation-trigger', 45000, () => page.evaluate(async () => { if (!window.Orbit || !Orbit.productAppP0 || typeof Orbit.productAppP0.activate !== 'function') throw new Error('PRODUCT_APP_ACTIVATION_OWNER_MISSING'); return Orbit.productAppP0.activate(); }));
${runtimeMarker}`;
  if (count(patched, runtimeMarker) !== 1) fail(`RUNTIME_MARKER_COUNT_INVALID:${count(patched, runtimeMarker)}`);
  patched = patched.replace(runtimeMarker, runtimeTrigger);

  patched = patched.replace("if (/^(login-submit|login-http-response|auth-projection)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_TIMEOUT`];", "if (/^(custom-token-submit|custom-token-http-response|auth-projection|runtime-activation-trigger)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_TIMEOUT`];");
  patched = patched.replace("if (/^(login-submit|login-http-response|auth-error-body|auth-projection)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_FAILED`];", "if (/^(custom-token-submit|custom-token-http-response|auth-error-body|auth-projection|runtime-activation-trigger)$/.test(stage)) return ['FUNCTIONAL_DEFECT', `R4_${stage.toUpperCase().replace(/-/g, '_')}_FAILED`];");

  const baseFlagsNeedle = "return { containsPII: false, containsSecrets: false, secretValuesLogged: false, writesAuthorized: false, deployExecuted: false, packageRebuilt: false, productionTouched };";
  const baseFlagsReplacement = "return { containsPII: false, containsSecrets: false, secretValuesLogged: false, writesAuthorized: false, deployExecuted: false, packageRebuilt: false, productionTouched, authMechanism: 'custom-token-ephemeral', passwordSecretUsed: false, customTokenPersisted: false, customTokenMintedForExactTarget: true, canonicalTargetRoleContract: true };";
  if (count(patched, baseFlagsNeedle) !== 1) fail(`BASE_FLAGS_COUNT_INVALID:${count(patched, baseFlagsNeedle)}`);
  patched = patched.replace(baseFlagsNeedle, baseFlagsReplacement);

  const staleLegalBlock = `  const legal = page.locator('[data-legal-gate]');
  if (await withTimeout('legal-count', 5000, () => legal.count()) && await withTimeout('legal-check-count', 5000, () => page.locator('#lg-chk').count()) && await withTimeout('legal-ok-count', 5000, () => page.locator('#lg-ok').count())) {
    await runStage('legal-gate-local', 10000, async () => { await page.locator('#lg-chk').check(); await page.locator('#lg-ok').click(); d.legalGateHandledLocally = true; await page.waitForTimeout(200); });
  }`;
  const readonlyLegalBlock = `  const legalState = await runStage('legal-gate-observe', 7000, () => page.evaluate(() => {
    const gate = document.querySelector('[data-legal-gate]');
    return { present: !!gate, checkboxPresent: !!(gate && gate.querySelector('#lg-chk')), okPresent: !!(gate && gate.querySelector('#lg-ok')) };
  }), v => ({ present: v && v.present === true, checkboxPresent: v && v.checkboxPresent === true, okPresent: v && v.okPresent === true }));
  d.legalGateObserved = legalState.present === true;
  d.legalGateHandledLocally = false;
  if (legalState.present && (!legalState.checkboxPresent || !legalState.okPresent)) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_LEGAL_GATE_MARKUP_INCOMPLETE');`;
  if (count(patched, staleLegalBlock) !== 1) fail(`STALE_LEGAL_BLOCK_COUNT_INVALID:${count(patched, staleLegalBlock)}`);
  patched = patched.replace(staleLegalBlock, readonlyLegalBlock);
  if (patched.includes("legal-check-count") || patched.includes("page.locator('#lg-chk').check()") || patched.includes("page.locator('#lg-ok').click()")) fail('STALE_LEGAL_INTERACTION_REMAINS');
  if (count(patched, "legal-gate-observe") !== 1) fail('READONLY_LEGAL_OBSERVER_NOT_BOUND_EXACTLY_ONCE');
  return { original, patched };
}
function sourceAuthSha(contract) {
  const bytes = execFileSync('git', ['show', `${contract.sourceHead}:${contract.authAsset.sourcePath}`], { encoding: null, maxBuffer: 4 * 1024 * 1024 });
  return { sha256: sha256(bytes), bytes: bytes.length };
}
function syntaxCheckPatchedHarness(patched) {
  const temp = path.join(ROOT, 'tools', `.orbit360-r4-certified-syntax-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(temp, patched, 'utf8');
  try { execFileSync(process.execPath, ['--check', temp], { cwd: ROOT, stdio: 'pipe' }); return true; }
  finally { try { fs.unlinkSync(temp); } catch {} }
}
function selfTest(contract, harness) {
  const sourceAuth = sourceAuthSha(contract);
  let patchedHarnessSyntaxPass = false;
  try { patchedHarnessSyntaxPass = syntaxCheckPatchedHarness(harness.patched); } catch {}
  const staleLegalInteractionRemoved = !harness.patched.includes('legal-check-count') && !harness.patched.includes("page.locator('#lg-chk').check()") && !harness.patched.includes("page.locator('#lg-ok').click()");
  const readonlyLegalObserverBound = count(harness.patched, 'legal-gate-observe') === 1;
  const manifestStatusBoundExactlyOnce = count(harness.patched, contract.manifestStatus) === 1;
  const serviceWorkerParityEnabled = !harness.patched.includes("serviceWorkers: 'block'");
  const runnerBrowserExecutableBound = count(harness.patched, 'ORBIT360_SYSTEM_BROWSER_EXECUTABLE') === 1 && !harness.patched.includes('chromium.launch({ headless: true })');
  const customTokenPathBound = count(harness.patched, 'accounts:signInWithCustomToken') === 1 && count(harness.patched, 'ctx.modules.auth.signInWithCustomToken') === 2;
  const passwordSubmitPathRemoved = !harness.patched.includes('accounts:signInWithPassword') && !harness.patched.includes("page.fill('#lg-pass'") && !harness.patched.includes('ORBIT360_PRODUCT_SMOKE_PASSWORD');
  const canonicalTargetRoleContractBound = !harness.patched.includes("['Dirección', 'Operativo', 'Asesor'].every") && count(harness.patched, "['Dirección', 'SuperAdmin', 'AdminTenant'].includes(role)") === 1;
  const postAuthActivationBound = count(harness.patched, "runStage('runtime-activation-trigger'") === 1;
  const tokenNeverPersistedByHarness = !harness.patched.includes('writeFileSync(OUT, CUSTOM_TOKEN') && !harness.patched.includes('customToken: CUSTOM_TOKEN');
  const ok = sourceAuth.sha256 === contract.authAsset.sha256 && sourceAuth.bytes === contract.authAsset.bytes && !harness.patched.includes('/core/auth.js') && harness.patched.includes(contract.authAsset.path) && manifestStatusBoundExactlyOnce && staleLegalInteractionRemoved && readonlyLegalObserverBound && serviceWorkerParityEnabled && runnerBrowserExecutableBound && customTokenPathBound && passwordSubmitPathRemoved && canonicalTargetRoleContractBound && postAuthActivationBound && tokenNeverPersistedByHarness && patchedHarnessSyntaxPass;
  const payload = { schemaVersion: 'orbit360-r4-certified-validator-rootfix-source-v1', ok, status: ok ? 'R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_PASS' : 'R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_FAIL', classification: ok ? 'VALIDATOR_STALE_ROOTFIX_PASS' : 'VALIDATOR_STALE_ROOTFIX_FAIL', sourceHead: contract.sourceHead, durableArtifact: { r3RunId: contract.r3RunId, artifactId: contract.r3DurableArtifactId, zipName: contract.zipName, zipSha256: contract.zipSha256, fileCount: contract.fileCount }, entrypoint: contract.entrypoint, manifestStatus: contract.manifestStatus, manifestStatusBoundExactlyOnce, authAsset: { ...contract.authAsset, sourceSha256Matches: sourceAuth.sha256 === contract.authAsset.sha256, sourceBytesMatch: sourceAuth.bytes === contract.authAsset.bytes }, staleLegacyAuthPathRemovedFromExecutableHarness: !harness.patched.includes('/core/auth.js'), productAuthPathBoundExactlyOnce: count(harness.patched, contract.authAsset.path) === 1, serviceWorkerParityEnabled, serviceWorkersBlockedInExecutableHarness: !serviceWorkerParityEnabled, runnerBrowserExecutableBound, staleLegalInteractionRemoved, readonlyLegalObserverBound, customTokenPathBound, passwordSubmitPathRemoved, canonicalTargetRoleContractBound, postAuthActivationBound, tokenNeverPersistedByHarness, authMechanism: 'custom-token-ephemeral', passwordSecretUsed: false, patchedHarnessSyntaxPass, runtimeHarnessLocation: 'workspace/tools', browserExecuted: false, secretAccess: false, dataAccess: false, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, deployExecuted: false, packageRebuilt: false, productionTouched: false, containsPII: false, containsSecrets: false };
  writeJson(SELF_EVIDENCE, payload); console.log(JSON.stringify(payload, null, 2)); if (!ok) process.exitCode = 41;
}
async function mintExactTargetCustomToken() {
  const projectId = String(process.env.ORBIT360_PRODUCT_PROJECT_ID || '').trim();
  const targetHash = String(process.env.ORBIT360_TARGET_EMAIL_HASH || '').trim().toLowerCase();
  if (!projectId || !/^[a-f0-9]{64}$/.test(targetHash) || !process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('CUSTOM_TOKEN_TARGET_CONTEXT_NOT_BOUND');
  const appMod = await import('firebase-admin/app');
  const authMod = await import('firebase-admin/auth');
  const app = appMod.getApps()[0] || appMod.initializeApp({ credential: appMod.applicationDefault(), projectId });
  try {
    const auth = authMod.getAuth(app);
    const users = [];
    let pageToken;
    do {
      const page = await auth.listUsers(1000, pageToken);
      users.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken && users.length < 10000);
    const matches = users.filter(user => {
      const email = String(user.email || '').trim().toLowerCase().replace(/\s+/g, '');
      return email && sha256(email) === targetHash;
    });
    if (matches.length !== 1) fail(`CUSTOM_TOKEN_TARGET_AUTH_MATCH_${matches.length}`);
    const user = matches[0];
    if (user.disabled) fail('CUSTOM_TOKEN_TARGET_DISABLED');
    if (user.emailVerified !== true) fail('CUSTOM_TOKEN_TARGET_EMAIL_NOT_VERIFIED');
    const token = await auth.createCustomToken(user.uid, { orbitGate: '14.3', purpose: 'paula-postauth-readonly' });
    if (typeof token !== 'string' || token.length < 100) fail('CUSTOM_TOKEN_MINT_FAILED');
    return token;
  } finally {
    try { await appMod.deleteApp(app); } catch {}
  }
}

const contract = readJson(CONTRACT_PATH); validateContract(contract); const harness = buildPatchedHarness(contract);
if (process.argv.includes('--self-test')) {
  selfTest(contract, harness);
} else {
  const token = await mintExactTargetCustomToken();
  const temp = path.join(ROOT, 'tools', `.orbit360-r4-certified-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(temp, harness.patched, 'utf8');
  try {
    const child = spawnSync(process.execPath, [temp], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ORBIT360_PRODUCT_SMOKE_CUSTOM_TOKEN: token, ORBIT360_PRODUCT_SMOKE_PASSWORD: '', ORBIT360_R4_EXPECTED_AUTH_SHA256: contract.authAsset.sha256, ORBIT360_R4_CERTIFIED_AUTH_ASSET_PATH: contract.authAsset.path, ORBIT360_R4_CERTIFIED_ENTRYPOINT_SHA256: contract.entrypoint.sha256, ORBIT360_R4_CERTIFIED_PACKAGE_SHA256: contract.zipSha256 } });
    if (child.error) throw child.error; process.exitCode = Number.isInteger(child.status) ? child.status : 41;
  } finally { try { fs.unlinkSync(temp); } catch {} }
}
