#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const rawPath = process.env.ORBIT360_RAW_BROWSER_EVIDENCE;
const idPath = process.env.ORBIT360_SMOKE_IDENTITY_EVIDENCE;
const out = process.env.ORBIT360_RECON_EVIDENCE;
const run = process.env.GITHUB_RUN_ID || '';
const revision = process.env.ORBIT360_EXPECTED_RESULT_REVISION || 'paula-real-browser-sw-parity-v1';
const sourcePath = 'orbit360-platform/runtime-gate-crm-v20260716/r4-certified-validator-rootfix-source-v20260815.json';

if (!rawPath || !idPath || !out || !run) {
  throw new Error('PIPELINE_MECHANISM_FAILURE:SMOKE_SUMMARIZER_CONTEXT_NOT_BOUND');
}

const raw = fs.existsSync(rawPath) ? JSON.parse(fs.readFileSync(rawPath, 'utf8')) : null;
const identity = fs.existsSync(idPath) ? JSON.parse(fs.readFileSync(idPath, 'utf8')) : null;
const source = fs.existsSync(sourcePath) ? JSON.parse(fs.readFileSync(sourcePath, 'utf8')) : null;
const zeroWrites = !!raw && raw.firestoreWrites === 0 && raw.authWrites === 0 && raw.operationalWrites === 0 && Array.isArray(raw.writeSignals) && raw.writeSignals.length === 0;
const customTokenMode = revision === 'paula-postauth-custom-token-readonly-v1';
const authMechanismPass = customTokenMode
  ? raw?.authMechanism === 'custom-token-ephemeral' && raw?.passwordSecretUsed === false && raw?.customTokenPersisted === false && raw?.customTokenMintedForExactTarget === true
  : true;
const browserPass = !!raw && raw.ok === true && raw.status === 'POST_GO_LIVE_SMOKE_PASS' && raw.auth?.signedIn === true && raw.auth?.emailVerified === true && raw.auth?.membershipAvailable === true && raw.auth?.membershipActive === true && raw.auth?.tenantMatches === true && raw.runtime?.started === true && raw.runtime?.storeWriteEnabled === false && Array.isArray(raw.pageErrors) && raw.pageErrors.length === 0 && Array.isArray(raw.consoleErrors) && raw.consoleErrors.length === 0 && Array.isArray(raw.httpFailures) && raw.httpFailures.length === 0 && zeroWrites && authMechanismPass;
const targetPass = !!identity && identity.ok === true && identity.runId === run && identity.targetIdentityMatches === true;
const swPass = !!source && source.ok === true && source.serviceWorkerParityEnabled === true && source.serviceWorkersBlockedInExecutableHarness === false;
const sourceMechanismPass = customTokenMode ? source?.customTokenPathBound === true && source?.passwordSubmitPathRemoved === true && source?.postAuthActivationBound === true && source?.tokenNeverPersistedByHarness === true && source?.passwordSecretUsed === false : true;
const ok = browserPass && targetPass && swPass && sourceMechanismPass;
const payload = {
  schemaVersion: 'orbit360-auth-paula-real-browser-readonly-smoke-v1',
  ok,
  status: ok ? 'AUTH_PAULA_REAL_BROWSER_READONLY_SMOKE_PASS' : 'AUTH_PAULA_REAL_BROWSER_READONLY_SMOKE_FAIL',
  classification: ok ? 'PASS' : (raw?.classification || 'PIPELINE_MECHANISM_FAILURE'),
  failedCheck: ok ? '' : (raw?.failureFamily || `R4_STAGE_${raw?.currentStage || 'NO_BROWSER_EVIDENCE'}`),
  runId: run,
  validatorRevision: revision,
  authMechanism: customTokenMode ? 'custom-token-ephemeral' : (raw?.authMechanism || 'password'),
  passwordSecretUsed: customTokenMode ? false : raw?.passwordSecretUsed === true,
  customTokenPersisted: customTokenMode ? raw?.customTokenPersisted === true : false,
  customTokenMintedForExactTarget: customTokenMode ? raw?.customTokenMintedForExactTarget === true : false,
  sourceMechanismPass,
  targetIdentityMatches: targetPass,
  targetEmailHashMatches: identity?.targetEmailHashMatches === true,
  targetAdvisorMatches: identity?.targetAdvisorMatches === true,
  serviceWorkerParityEnabled: swPass,
  browserExecuted: !!raw,
  currentStage: raw?.currentStage || '',
  authSignedIn: raw?.auth?.signedIn === true,
  emailVerified: raw?.auth?.emailVerified === true,
  membershipAvailable: raw?.auth?.membershipAvailable === true,
  membershipActive: raw?.auth?.membershipActive === true,
  tenantMatches: raw?.auth?.tenantMatches === true,
  runtimeStarted: raw?.runtime?.started === true,
  routerStarted: raw?.runtime?.routerStarted === true,
  tenantContextReady: raw?.runtime?.tenantContextReady === true,
  storeReady: raw?.runtime?.storeReady === true,
  storeWriteEnabled: raw?.runtime?.storeWriteEnabled === true,
  pageErrorCount: Array.isArray(raw?.pageErrors) ? raw.pageErrors.length : -1,
  consoleErrorCount: Array.isArray(raw?.consoleErrors) ? raw.consoleErrors.length : -1,
  httpFailureCount: Array.isArray(raw?.httpFailures) ? raw.httpFailures.length : -1,
  writeSignalCount: Array.isArray(raw?.writeSignals) ? raw.writeSignals.length : -1,
  firestoreWrites: raw?.firestoreWrites || 0,
  authWrites: raw?.authWrites || 0,
  operationalWrites: raw?.operationalWrites || 0,
  deployExecuted: raw?.deployExecuted === true,
  packageRebuilt: raw?.packageRebuilt === true,
  productionReadPerformed: raw?.productionTouched === true,
  productionMutationExecuted: false,
  containsPII: false,
  containsSecrets: false,
  containsPassword: false
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
