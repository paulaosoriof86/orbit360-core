#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ID = 'ays-orbit-360-lab';
const CHANNEL = 'orbit360-ays-lab';
const GATE_ID = 'importers-e2e-acceptance-lab-v20260720';
const RUNTIME = '20260720-3';
const RUN_ID = String(process.env.GITHUB_RUN_ID || Date.now());
const SHA = String(process.env.GITHUB_SHA || 'local');
const BRANCH = String(process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '');
const EVIDENCE_DIR = 'orbit360-platform/runtime-gate-crm-v20260716';
const STATE = process.env.ORBIT360_IMPORTERS_E2E_STATE || `${EVIDENCE_DIR}/importers-e2e-state.json`;
const EVIDENCE = process.env.ORBIT360_IMPORTERS_E2E_EVIDENCE || `${EVIDENCE_DIR}/importers-e2e-acceptance-sanitized.json`;
const CLEANUP = process.env.ORBIT360_IMPORTERS_E2E_CLEANUP || `${EVIDENCE_DIR}/importers-e2e-cleanup-sanitized.json`;
const VAULT = process.env.ORBIT360_IMPORTERS_E2E_VAULT_ROLLBACK || `${EVIDENCE_DIR}/importers-e2e-vault-rollback-sanitized.json`;

if (BRANCH && BRANCH !== 'ays/backend-tenant-lab-v99-20260703') throw new Error('BLOQUEO_RAMA_LAB');
if (String(process.env.FIREBASE_PROJECT_ID || '') !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('CUENTA_LAB_REQUERIDA');
if (!process.env.ORBIT360_LAB_LOGIN_PASSWORD || process.env.ORBIT360_LAB_LOGIN_PASSWORD.length < 12) throw new Error('ACCESO_LAB_REQUERIDO');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, options.env || {}),
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  return result;
}
function runNode(file, args = []) {
  return run(process.execPath, [file, ...args]);
}
function writeFallback(file, payload) {
  fs.writeFileSync(file, `${JSON.stringify(Object.assign({ containsPII: false, containsSecrets: false }, payload), null, 2)}\n`, 'utf8');
}
function findUrl(value) {
  if (typeof value === 'string' && /^https:\/\/[^/]*--orbit360-ays-lab[^/]*\.(?:web\.app|firebaseapp\.com)$/.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  return '';
}
async function fetchText(url) {
  let last = null;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (response.ok) return await response.text();
      last = new Error(`HTTP_${response.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw last || new Error('FETCH_FAILED');
}

let fixturePrepared = false;
let browserCode = 1;
let rollbackCode = 1;
let cleanupCode = 1;
let coordinatorError = null;

try {
  fs.writeFileSync('orbit360-platform/runtime-build.json', `${JSON.stringify({
    schemaVersion: 'orbit360-runtime-build-v2',
    commit: SHA,
    run: RUN_ID,
    branch: 'ays/backend-tenant-lab-v99-20260703',
    gateId: GATE_ID,
    runtimeVersion: RUNTIME
  })}\n`, 'utf8');

  const deploy = run('npx', [
    'firebase-tools',
    'hosting:channel:deploy', CHANNEL,
    '--project', PROJECT_ID,
    '--expires', '30d',
    '--non-interactive',
    '--json'
  ], { capture: true });
  if (deploy.status !== 0) throw new Error(`DEPLOY_FAILED_${deploy.status}`);
  const deployJson = JSON.parse(String(deploy.stdout || '{}'));
  const previewUrl = findUrl(deployJson);
  if (!previewUrl) throw new Error('PREVIEW_URL_NOT_FOUND');
  process.env.ORBIT360_PREVIEW_URL = previewUrl;

  const build = JSON.parse(await fetchText(`${previewUrl}/runtime-build.json?run=${RUN_ID}`));
  if (build.commit !== SHA || build.gateId !== GATE_ID || build.runtimeVersion !== RUNTIME) throw new Error('RUNTIME_BUILD_MISMATCH');
  const readinessSource = await fetchText(`${previewUrl}/core/session-readiness-contract-v20260720.js?run=${RUN_ID}`);
  const contractSource = await fetchText(`${previewUrl}/core/importer-execution-contract-v20260720.js?run=${RUN_ID}`);
  const academySource = await fetchText(`${previewUrl}/data/academia-v1225-importadores-e2e.js?run=${RUN_ID}`);
  const bootstrapSource = await fetchText(`${previewUrl}/core/router-tenant-config-bootstrap.js?run=${RUN_ID}`);
  if (!readinessSource.includes("var VERSION = '20260720.1'") || !readinessSource.includes('neverMutatesLegalAcceptance: true')) throw new Error('SESSION_READINESS_NOT_SERVED');
  if (!contractSource.includes("var VERSION = '20260720.2'") || !contractSource.includes('forbidsSuccessWithZero: true')) throw new Error('CONTRACT_NOT_SERVED');
  if (!academySource.includes("version: '1.226'")) throw new Error('ACADEMY_NOT_SERVED');
  if (!bootstrapSource.includes("sessionReadinessVersion: '20260720.1'") ||
      !bootstrapSource.includes("importerContractVersion: '20260720.2'") ||
      !bootstrapSource.includes("importerAcademyVersion: '1.226'")) throw new Error('BOOTSTRAP_NOT_SERVED');

  const fixture = runNode('tools/orbit360-importers-e2e-fixture-v20260720.mjs', ['prepare']);
  if (fixture.status !== 0) throw new Error(`FIXTURE_PREPARE_FAILED_${fixture.status}`);
  fixturePrepared = true;

  const browser = runNode('tools/orbit360-importers-e2e-browser-v20260720.mjs');
  browserCode = Number(browser.status ?? 1);
} catch (error) {
  coordinatorError = error;
  if (!fs.existsSync(EVIDENCE)) {
    writeFallback(EVIDENCE, {
      schemaVersion: 'orbit360-importers-e2e-evidence-v1',
      runId: RUN_ID,
      commit: SHA,
      stage: 'failed',
      predicates: {},
      failure: {
        code: 'PIPELINE_MECHANISM_FAILURE',
        stage: 'coordinator',
        category: String(error?.message || error).replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100)
      },
      ok: false
    });
  }
} finally {
  if (fixturePrepared && fs.existsSync(STATE)) {
    rollbackCode = Number(runNode('tools/orbit360-importers-e2e-vault-rollback-v20260720.mjs').status ?? 1);
    cleanupCode = Number(runNode('tools/orbit360-importers-e2e-fixture-v20260720.mjs', ['cleanup']).status ?? 1);
  } else {
    writeFallback(VAULT, {
      schemaVersion: 'orbit360-importers-e2e-vault-rollback-v1',
      vaultRecordDeleted: false,
      transientVersionDestroyed: false,
      otherRecordsPreserved: false,
      errorCode: 'fixture_state_missing'
    });
    writeFallback(CLEANUP, {
      schemaVersion: 'orbit360-importers-e2e-cleanup-v1',
      insurerDeleted: false,
      countsRestored: false,
      errorCode: 'fixture_state_missing'
    });
  }
}

const final = runNode('tools/orbit360-importers-e2e-finalize-v20260720.mjs');
const finalCode = Number(final.status ?? 1);

const summary = {
  schemaVersion: 'orbit360-importers-e2e-coordinator-v2',
  runtimeVersion: RUNTIME,
  runId: RUN_ID,
  browserCode,
  rollbackCode,
  cleanupCode,
  finalCode,
  coordinatorCategory: coordinatorError ? String(coordinatorError.message || coordinatorError).replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100) : '',
  containsPII: false,
  containsSecrets: false
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'importers-e2e-coordinator-sanitized.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

if (finalCode !== 0) process.exit(finalCode);
console.log('ORBIT360_IMPORTERS_E2E_GATE_OK');
