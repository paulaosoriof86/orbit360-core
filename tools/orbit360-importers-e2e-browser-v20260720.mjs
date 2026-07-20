#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const contract = require('../orbit360-platform/core/importer-execution-contract-v20260720.js');

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const REGION = 'us-central1';
const PREVIEW_URL = String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/+$/, '');
const LOGIN_EMAIL = String(process.env.ORBIT360_LAB_LOGIN_EMAIL || '');
const LOGIN_PASSWORD = String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '');
const EXPECTED_UID = String(process.env.ORBIT360_EXPECTED_UID || 'woJlxR1iFEeiQZvTscPj4qQ5Qc73');
const STATE_PATH = process.env.ORBIT360_IMPORTERS_E2E_STATE ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-state.json';
const OUTPUT = process.env.ORBIT360_IMPORTERS_E2E_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-acceptance-sanitized.json';

if (!PREVIEW_URL || !/^https:\/\//.test(PREVIEW_URL)) throw new Error('ORBIT360_PREVIEW_URL_REQUIRED');
if (!LOGIN_EMAIL || LOGIN_PASSWORD.length < 12) throw new Error('ORBIT360_LAB_LOGIN_REQUIRED');
if (String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '') !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);
const insurerRef = root.collection('aseguradoras').doc(state.fixtureId);
const backendAudit = db.collection('tenants').doc(TENANT_ID).collection('auditEvents');
const SENSITIVE_KEY = /^(username|usuario|password|contrasena|contraseña|secret|token|apiKey)$/i;

let execution = contract.create({
  executionId: state.executionId,
  tenantId: TENANT_ID,
  sourceType: 'directorio_aseguradoras',
  sourceFileHash: state.sourceHash,
  synthetic: true,
  actor: {
    uid: EXPECTED_UID,
    emailHash: crypto.createHash('sha256').update(LOGIN_EMAIL.toLowerCase()).digest('hex'),
    activeRole: 'Dirección'
  },
  targets: [{
    collection: 'aseguradoras',
    recordId: state.fixtureId,
    resourceType: 'portal',
    resourceId: state.portalId,
    resourceRequired: true,
    country: 'GT',
    sourceTraceHash: crypto.createHash('sha256').update(state.sheetName).digest('hex')
  }]
});
const diagnostic = {
  schemaVersion: 'orbit360-importers-e2e-browser-diagnostic-v2',
  driverVersion: '20260720.3',
  runId: String(process.env.GITHUB_RUN_ID || ''),
  commit: String(process.env.GITHUB_SHA || ''),
  providerRequestObserved: false,
  providerStatus: 0,
  providerErrorCode: '',
  containsPII: false,
  containsSecrets: false
};

function write() {
  const evidence = contract.sanitizeEvidence(execution);
  evidence.runId = diagnostic.runId;
  evidence.commit = diagnostic.commit;
  evidence.diagnostic = diagnostic;
  evidence.containsPII = false;
  evidence.containsSecrets = false;
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
function mark(key, value = true) {
  execution = contract.setPredicate(execution, key, value);
  write();
}
function move(stage, count = 0) {
  execution = contract.transition(execution, stage, { count });
  write();
}
function fail(code) {
  execution = contract.fail(execution, contract.errorCodes.includes(code) ? code : 'PIPELINE_MECHANISM_FAILURE', execution.stage);
  write();
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function noPlaintextSecrets(value) {
  let found = false;
  function walk(node) {
    if (!node || found || typeof node !== 'object') return;
    for (const [key, item] of Object.entries(node)) {
      if (SENSITIVE_KEY.test(key) && String(item == null ? '' : item).trim()) {
        found = true;
        return;
      }
      if (item && typeof item === 'object') walk(item);
    }
  }
  walk(value);
  return !found;
}

async function answerOrbitPrompt(page, expectedTitle, value) {
  const overlays = page.locator('.drawer-back.open').filter({ has: page.locator('[data-in]') });
  const overlay = overlays.filter({ hasText: expectedTitle }).last();
  await overlay.waitFor({ state: 'visible', timeout: 30000 });
  await overlay.locator('[data-in]').fill(value);
  await overlay.locator('[data-yes]').click();
  await overlay.waitFor({ state: 'detached', timeout: 30000 });
}

async function completeLegalUiGate(page) {
  await page.waitForFunction(() => Boolean(
    window.Orbit &&
    Orbit.legal &&
    typeof Orbit.legal.gate === 'function' &&
    Orbit.sessionReadinessContractV20260720 &&
    typeof Orbit.sessionReadinessContractV20260720.snapshot === 'function' &&
    typeof Orbit.sessionReadinessContractV20260720.waitForReady === 'function'
  ), null, { timeout: 90000 });

  const initial = await page.evaluate(() => {
    const api = Orbit.sessionReadinessContractV20260720;
    return api.sanitized(api.snapshot());
  });
  diagnostic.sessionReadinessInitial = initial;
  write();

  if (!initial.ready) {
    if (initial.blockingCode !== 'LEGAL_GATE_PENDING') {
      throw Object.assign(new Error('SESSION'), { gateCode: initial.blockingCode || 'PIPELINE_MECHANISM_FAILURE' });
    }
    const legalOverlay = page.locator('[data-legal-gate].drawer-back.open').last();
    await legalOverlay.waitFor({ state: 'visible', timeout: 30000 });
    await legalOverlay.locator('#lg-chk').check();
    await legalOverlay.locator('#lg-ok').click();
    await legalOverlay.waitFor({ state: 'detached', timeout: 30000 });
    diagnostic.legalUiAcceptanceCompleted = true;
    write();
  }

  const final = await page.evaluate(async () => {
    const api = Orbit.sessionReadinessContractV20260720;
    try {
      const ready = await api.waitForReady({ timeoutMs: 30000, pollMs: 100 });
      return api.sanitized(ready);
    } catch (error) {
      const safe = api.sanitized(error && error.evidence ? error.evidence : api.snapshot());
      safe.waitErrorCode = String(error && error.code || '').replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100);
      return safe;
    }
  });
  diagnostic.sessionReadinessFinal = final;
  write();

  if (!final.ready ||
      final.predicates?.browserAuthReady !== true ||
      final.predicates?.activeRoleResolved !== true ||
      final.predicates?.tenantResolved !== true ||
      final.predicates?.legalGateSatisfied !== true) {
    throw Object.assign(new Error('SESSION'), { gateCode: final.blockingCode || 'LEGAL_GATE_PENDING' });
  }
  mark('legalGateSatisfied');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const importFunction = `${REGION}-${PROJECT_ID}.cloudfunctions.net/orbit360ImportInsurerCredentials`;

  page.on('request', request => {
    if (request.url().includes(importFunction)) diagnostic.providerRequestObserved = true;
  });
  page.on('response', async response => {
    if (!response.url().includes(importFunction)) return;
    diagnostic.providerStatus = response.status();
    try {
      const body = await response.json();
      diagnostic.providerErrorCode = String(body?.error?.status || '').replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100);
    } catch {}
  });

  try {
    const url = `${PREVIEW_URL}/index.html?orbitBackend=firestore-lab&tenant=${TENANT_ID}&runtime=20260717-2#/aseguradoras`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#login-form', { timeout: 60000 });
    await page.fill('#lg-user', LOGIN_EMAIL);
    await page.fill('#lg-pass', LOGIN_PASSWORD);
    await page.click('#login-form button[type="submit"]');
    await page.waitForFunction(() => {
      try { return Boolean(window.firebase && firebase.auth && firebase.auth().currentUser && window.Orbit && Orbit.store); }
      catch { return false; }
    }, null, { timeout: 90000 });

    const auth = await page.evaluate(() => {
      const user = firebase.auth().currentUser;
      return {
        uid: user?.uid || '',
        email: user?.email || '',
        role: Orbit.session?.rol ? Orbit.session.rol() : '',
        tenantId: Orbit.access?.tenantId ? Orbit.access.tenantId() : ''
      };
    });
    if (auth.uid !== EXPECTED_UID || String(auth.email).toLowerCase() !== LOGIN_EMAIL.toLowerCase()) throw Object.assign(new Error('AUTH'), { gateCode: 'AUTH_NOT_READY' });
    if (auth.tenantId !== TENANT_ID) throw Object.assign(new Error('TENANT'), { gateCode: 'TENANT_MISMATCH' });
    if (!auth.role) throw Object.assign(new Error('ROLE'), { gateCode: 'ACTIVE_ROLE_UNRESOLVED' });
    execution.actor.uid = auth.uid;
    execution.actor.activeRole = auth.role;
    mark('browserAuthReady');
    mark('activeRoleResolved');

    await completeLegalUiGate(page);

    await page.waitForFunction(id => Boolean(Orbit.store?.get && Orbit.store.get('aseguradoras', id)), state.fixtureId, { timeout: 90000 });
    await page.waitForFunction(() => Boolean(
      Orbit.insurerDirectoryImport &&
      Orbit.secureImport &&
      typeof Orbit.secureImport.importInsurerDirectory === 'function' &&
      Orbit.__insurerSecureTargetBridgeV20260720
    ), null, { timeout: 90000 });

    await page.evaluate(() => Orbit.insurerDirectoryImport.open({ gate: true }));
    await page.selectOption('#idir-country', 'GT');
    await page.setInputFiles('#idir-file', state.xlsxPath);
    await page.waitForSelector('[data-secure-only]', { timeout: 90000 });

    const parsed = await page.evaluate(() => {
      const modal = document.getElementById('ins-dir-import-v1202');
      const text = modal?.textContent || '';
      const operations = Number((text.match(/Operaciones\s*(\d+)/i) || [])[1] || 0);
      const references = Number((text.match(/(?:referencias de conexión detectadas|Credenciales detectadas)\s*(\d+)/i) || [])[1] || 0);
      return {
        ready: Boolean(modal?.querySelector('[data-secure-only]')),
        operations,
        references
      };
    });
    diagnostic.parser = {
      ready: parsed.ready === true,
      operations: Number(parsed.operations || 0),
      references: Number(parsed.references || 0),
      observerVersion: '20260720.2'
    };
    write();
    if (!parsed.ready || parsed.operations !== 1 || parsed.references !== 1) {
      throw Object.assign(new Error('PARSE'), { gateCode: 'SOURCE_PARSE_FAILED' });
    }
    move('source_parsed', 1);
    mark('sourceParsed');

    const target = await page.evaluate(({ sheet, url }) => {
      const payload = Orbit.__insurerSecureTargetBridgeV20260720.enrich({
        items: [{ type: 'credential', insurerSheet: sheet, platformIndex: 0, url }]
      });
      const item = payload?.items?.[0] || {};
      return { insurerId: item.insurerId || '', portalId: item.portalId || '' };
    }, { sheet: state.sheetName, url: state.fixtureUrl });
    if (target.insurerId !== state.fixtureId || target.portalId !== state.portalId) throw Object.assign(new Error('TARGET'), { gateCode: 'TARGET_ID_UNRESOLVED' });
    move('mapping_resolved', 1);
    move('dry_run_produced', 1);
    mark('dryRunProduced');
    mark('targetIdsResolved');

    await page.click('[data-secure-only]');
    diagnostic.confirmation = {
      driverVersion: '20260720.3',
      reasonPromptCompleted: false,
      phrasePromptCompleted: false
    };
    write();
    await answerOrbitPrompt(page, 'Confirmar accesos seguros', `Gate E2E sintético ${state.runId}`);
    diagnostic.confirmation.reasonPromptCompleted = true;
    write();
    await answerOrbitPrompt(page, 'Confirmación reforzada', 'CONFIRMO DIRECTORIO');
    diagnostic.confirmation.phrasePromptCompleted = true;
    write();
    move('confirmation_accepted');
    move('identity_resolved');
    move('target_resolved');

    const deadline = Date.now() + 65000;
    while (Date.now() < deadline && !diagnostic.providerRequestObserved) await wait(250);
    if (!diagnostic.providerRequestObserved) {
      const provider = await page.evaluate(() => Orbit.__insurerCredentialProviderLabV20260720 || {});
      diagnostic.providerErrorCode = String(provider.lastErrorCode || 'PROVIDER_NOT_INVOKED').slice(0, 100);
      throw Object.assign(new Error('PROVIDER'), { gateCode: 'PROVIDER_NOT_INVOKED' });
    }
    move('provider_invoked');
    mark('providerInvoked');

    await page.waitForFunction(({ insurerId, portalId }) => {
      const row = Orbit.store.get('aseguradoras', insurerId);
      const portal = (row?.portales || []).find(item => String(item.id || '') === portalId);
      return Boolean(portal && /^cred_[a-f0-9]{32}$/.test(String(portal.credentialRef || '')));
    }, { insurerId: state.fixtureId, portalId: state.portalId }, { timeout: 90000 });

    const browserRef = await page.evaluate(({ insurerId, portalId }) => {
      const row = Orbit.store.get('aseguradoras', insurerId);
      return String((row?.portales || []).find(item => String(item.id || '') === portalId)?.credentialRef || '');
    }, { insurerId: state.fixtureId, portalId: state.portalId });
    if (browserRef !== state.credentialRef) throw Object.assign(new Error('REMOTE'), { gateCode: 'REMOTE_CONFIRMATION_INCOMPLETE' });
    move('remote_confirmed', 1);
    mark('remoteConfirmation');

    let adminRow = {};
    let adminPortal = {};
    const storeDeadline = Date.now() + 45000;
    while (Date.now() < storeDeadline) {
      adminRow = (await insurerRef.get()).data() || {};
      adminPortal = (adminRow.portales || []).find(item => String(item.id || '') === state.portalId) || {};
      if (adminPortal.credentialRef === state.credentialRef) break;
      await wait(500);
    }
    const safe = noPlaintextSecrets(adminRow);
    mark('plaintextSecretsInOperationalStore', !safe);
    if (!safe) throw Object.assign(new Error('SECRET'), { gateCode: 'PLAINTEXT_SECRET_DETECTED' });
    if (adminPortal.credentialRef !== state.credentialRef) throw Object.assign(new Error('STORE'), { gateCode: 'STORE_WRITE_NOT_OBSERVED' });
    move('store_observed', 1);
    mark('storeWriteObserved');
    mark('opaqueReferenceObserved');

    if (browserRef !== adminPortal.credentialRef) throw Object.assign(new Error('READ'), { gateCode: 'READ_AFTER_WRITE_FAILED' });
    move('read_after_write');
    mark('readAfterWriteOk');

    const rejected = await page.evaluate(async ({ projectId, region, tenantId, insurerId, portalId }) => {
      const token = await firebase.auth().currentUser.getIdToken();
      const response = await fetch(`https://${region}-${projectId}.cloudfunctions.net/orbit360RevealInsurerCredential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          data: {
            tenantId,
            activeRole: Orbit.session.rol(),
            credentialRef: 'cred_' + '0'.repeat(32),
            insurerId,
            portalId,
            field: 'password'
          }
        }),
        credentials: 'omit',
        cache: 'no-store'
      });
      let body = {};
      try { body = await response.json(); } catch {}
      return !response.ok || Boolean(body.error);
    }, { projectId: PROJECT_ID, region: REGION, tenantId: TENANT_ID, insurerId: state.fixtureId, portalId: state.portalId });
    if (!rejected) throw Object.assign(new Error('REJECTION'), { gateCode: 'AUDIT_FAILURE_NOT_OBSERVED' });

    await wait(2500);
    const successAudit = await backendAudit.where('sourceHash', '==', state.sourceHash).get();
    const allTargetAudits = await backendAudit.where('insurerId', '==', state.fixtureId).get();
    const failureAudits = allTargetAudits.docs.filter(doc => String((doc.data() || {}).outcome || '') === 'not_found');
    mark('auditSuccessObserved', !successAudit.empty);
    mark('auditFailureObserved', failureAudits.length > 0);
    if (successAudit.empty) throw Object.assign(new Error('AUDIT_SUCCESS'), { gateCode: 'AUDIT_SUCCESS_NOT_OBSERVED' });
    if (!failureAudits.length) throw Object.assign(new Error('AUDIT_FAILURE'), { gateCode: 'AUDIT_FAILURE_NOT_OBSERVED' });
    move('audit_observed', successAudit.size + failureAudits.length);
  } finally {
    await browser.close();
  }
}

write();
try {
  await run();
} catch (error) {
  fail(String(error?.gateCode || 'PIPELINE_MECHANISM_FAILURE'));
}
write();
if (execution.stage !== 'audit_observed') {
  console.error(`ORBIT360_IMPORTERS_E2E_BROWSER_NO_GO:${execution.failure?.code || 'UNKNOWN'}`);
  process.exit(61);
}
console.log('ORBIT360_IMPORTERS_E2E_BROWSER_READY_FOR_ROLLBACK');
