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
  if (contract.manifestStatus !== 'FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED') fail('CONTRACT_MANIFEST_STATUS_INVALID');
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
  const ok = sourceAuth.sha256 === contract.authAsset.sha256 && sourceAuth.bytes === contract.authAsset.bytes && !harness.patched.includes('/core/auth.js') && harness.patched.includes(contract.authAsset.path) && staleLegalInteractionRemoved && readonlyLegalObserverBound && patchedHarnessSyntaxPass;
  const payload = { schemaVersion: 'orbit360-r4-certified-validator-rootfix-source-v1', ok, status: ok ? 'R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_PASS' : 'R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_FAIL', classification: ok ? 'VALIDATOR_STALE_ROOTFIX_PASS' : 'VALIDATOR_STALE_ROOTFIX_FAIL', sourceHead: contract.sourceHead, durableArtifact: { r3RunId: contract.r3RunId, artifactId: contract.r3DurableArtifactId, zipName: contract.zipName, zipSha256: contract.zipSha256, fileCount: contract.fileCount }, entrypoint: contract.entrypoint, authAsset: { ...contract.authAsset, sourceSha256Matches: sourceAuth.sha256 === contract.authAsset.sha256, sourceBytesMatch: sourceAuth.bytes === contract.authAsset.bytes }, staleLegacyAuthPathRemovedFromExecutableHarness: !harness.patched.includes('/core/auth.js'), productAuthPathBoundExactlyOnce: count(harness.patched, contract.authAsset.path) === 1, staleLegalInteractionRemoved, readonlyLegalObserverBound, patchedHarnessSyntaxPass, runtimeHarnessLocation: 'workspace/tools', browserExecuted: false, secretAccess: false, dataAccess: false, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, deployExecuted: false, packageRebuilt: false, productionTouched: false, containsPII: false, containsSecrets: false };
  writeJson(SELF_EVIDENCE, payload); console.log(JSON.stringify(payload, null, 2)); if (!ok) process.exitCode = 41;
}

const contract = readJson(CONTRACT_PATH); validateContract(contract); const harness = buildPatchedHarness(contract);
if (process.argv.includes('--self-test')) {
  selfTest(contract, harness);
} else {
  const temp = path.join(ROOT, 'tools', `.orbit360-r4-certified-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(temp, harness.patched, 'utf8');
  try {
    const child = spawnSync(process.execPath, [temp], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ORBIT360_R4_EXPECTED_AUTH_SHA256: contract.authAsset.sha256, ORBIT360_R4_CERTIFIED_AUTH_ASSET_PATH: contract.authAsset.path, ORBIT360_R4_CERTIFIED_ENTRYPOINT_SHA256: contract.entrypoint.sha256, ORBIT360_R4_CERTIFIED_PACKAGE_SHA256: contract.zipSha256 } });
    if (child.error) throw child.error; process.exitCode = Number.isInteger(child.status) ? child.status : 41;
  } finally { try { fs.unlinkSync(temp); } catch {} }
}
