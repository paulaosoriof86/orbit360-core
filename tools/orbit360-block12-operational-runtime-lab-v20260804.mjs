#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const ROOT = process.cwd();
const PHASE = process.argv[2] || '';
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const REAL_TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const STATE_FILE = process.env.ORBIT360_BLOCK12_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || '/tmp', 'orbit360-block12-private-state.json');
const CONFIG_FILE = process.env.ORBIT360_LOCAL_FIREBASE_CONFIG_FILE || path.join(ROOT, 'orbit360-platform/core/auth-firebase.config.local.js');
const PREPARE_OUT = path.join(EVIDENCE_DIR, 'block12-operational-runtime-prepare-sanitized.json');
const BROWSER_OUT = path.join(EVIDENCE_DIR, 'block12-operational-runtime-browser-sanitized.json');
const FINAL_OUT = path.join(EVIDENCE_DIR, 'block12-operational-runtime-final.json');
const SCREENSHOT = path.join(EVIDENCE_DIR, 'block12-operational-runtime-center.png');
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const safe = value => text(value).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/[A-Za-z0-9_-]{30,}/g, '[id]').replace(/[\r\n]+/g, ' ').slice(0, 500);
const save = (file, payload) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8'); };
const readState = () => JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};

async function resolveWebConfig() {
  const google = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'] });
  const client = await google.getClient();
  const list = await client.request({ url: `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps` });
  const apps = [].concat(list.data && list.data.apps || []).filter(app => text(app.state).toUpperCase() !== 'DELETED').sort((a, b) => text(a.appId).localeCompare(text(b.appId)));
  if (!apps.length) throw new Error('DATA_CONTRACT_FAILURE:WEB_APP_NOT_FOUND');
  const response = await client.request({ url: `https://firebase.googleapis.com/v1beta1/${apps[0].name}/config` });
  const config = response.data || {};
  if (text(config.projectId) !== PROJECT || !text(config.apiKey) || !text(config.appId) || !text(config.authDomain)) throw new Error('DATA_CONTRACT_FAILURE:WEB_CONFIG_INCOMPLETE');
  return { apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, storageBucket: config.storageBucket || '', messagingSenderId: config.messagingSenderId || '', appId: config.appId };
}
async function snapshotRealTenant(db) {
  const names = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
  const collections = {};
  for (const name of names) {
    const snap = await db.collection('tenants').doc(REAL_TENANT).collection('data').doc(name).collection('items').get();
    const markers = snap.docs.map(doc => `${doc.id}|${doc.updateTime ? doc.updateTime.toMillis() : 0}`).sort();
    collections[name] = { count: snap.size, digest: sha(markers.join('\n')) };
  }
  const members = await db.collection('tenants').doc(REAL_TENANT).collection('members').get();
  return { tenantHash: sha(REAL_TENANT), collections, memberships: { count: members.size, digest: sha(members.docs.map(doc => doc.id).sort().join('\n')) } };
}
function ids(runId) {
  const prefix = `zztest_block12_${runId}`.replace(/[^A-Za-z0-9_]/g, '').slice(0, 80);
  const request = suffix => `${prefix}_req_${suffix}`;
  return {
    prefix,
    client: `${prefix}_client_a`, clientOther: `${prefix}_client_b`,
    policy: `${prefix}_policy_a`, policyOther: `${prefix}_policy_b`,
    advisorA: `${prefix}_advisor_a`, advisorB: `${prefix}_advisor_b`,
    business: `${prefix}_business`, managementOwn: `${prefix}_management_a`, managementOther: `${prefix}_management_b`,
    receipt1: `${prefix}_receipt_1`, receipt2: `${prefix}_receipt_2`, receipt3: `${prefix}_receipt_3`, receipt4: `${prefix}_receipt_4`,
    evidenceDirect: `${prefix}_ev_direct`, evidenceCommission: `${prefix}_ev_commission`, evidencePortfolio: `${prefix}_ev_portfolio`,
    proposal: `${prefix}_proposal`, cobro: `${prefix}_cobro`, batch: `${prefix}_batch`,
    requests: {
      createBusiness: request('create_business'), transition_cotizando: request('to_cotizando'), transition_propuesta: request('to_propuesta'), transition_inspeccion: request('to_inspeccion'), transition_emision: request('to_emision'),
      managementOwn: request('management_own'), managementOther: request('management_other'), resolveOwn: request('resolve_own'),
      createBatch: request('create_batch'), stageBatch: request('stage_batch'), previewBatch: request('preview_batch'), confirmBatch: request('confirm_batch'), rollbackBatch: request('rollback_batch'),
      evidenceDirect: request('evidence_direct'), evidenceCommission: request('evidence_commission'), evidencePortfolio: request('evidence_portfolio'), previewPolicy: request('preview_policy'), confirmProposal: request('confirm_proposal')
    }
  };
}
async function prepare(app) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('ENVIRONMENT_FAILURE:SERVICE_ACCOUNT_REQUIRED');
  const auth = getAuth(app), db = getFirestore(app);
  const runId = text(process.env.GITHUB_RUN_ID || Date.now()).replace(/\D/g, '').slice(-16) || String(Date.now());
  const tenantId = `verify-block12-${runId}`;
  const fixtureIds = ids(runId);
  const before = await snapshotRealTenant(db);
  const webConfig = await resolveWebConfig();
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `window.ORBIT_FIREBASE_LAB_CONFIG=${JSON.stringify(webConfig)};\nwindow.OrbitBackend=Object.assign({},window.OrbitBackend||{},{firebaseConfigSource:'management-api',firebaseConfigScope:'lab-only'});\n`, 'utf8');

  const userDefs = [
    { key: 'direction', role: 'Dirección', advisorId: `${fixtureIds.prefix}_direction` },
    { key: 'advisorA', role: 'Asesor', advisorId: fixtureIds.advisorA },
    { key: 'advisorB', role: 'Asesor', advisorId: fixtureIds.advisorB }
  ];
  const users = {};
  for (const def of userDefs) {
    const uid = `${fixtureIds.prefix}_${def.key}`.slice(0, 120);
    const email = `${fixtureIds.prefix}.${def.key}@example.com`.toLowerCase();
    await auth.createUser({ uid, email, emailVerified: true, disabled: false, password: crypto.randomBytes(24).toString('base64url') });
    await db.collection('tenants').doc(tenantId).collection('members').doc(uid).set({
      uid, active: true, status: 'active', roles: [def.role], activeRole: def.role, defaultRole: def.role,
      advisorId: def.advisorId, countries: ['GT'], dataScopes: { ops: def.role === 'Asesor' ? 'propios' : 'todos', workflow: def.role === 'Asesor' ? 'propios' : 'todos' },
      permissions: def.role === 'Asesor' ? [] : ['ops_manage', 'leads_manage', 'gestiones_manage', 'imports_manage', 'cobros_manage', 'conciliaciones_manage']
    });
    users[def.key] = { uid, token: await auth.createCustomToken(uid, { orbitTenant: tenantId, orbitSyntheticVerification: true }) };
  }
  await db.collection('tenants').doc(tenantId).collection('config').doc('workflow').set({ storageMode: 'canonicalV2', portalResponseEnabled: true, notificationChannels: ['in_app'], cadenceEnabled: true });
  const receiptColl = db.collection('tenants').doc(tenantId).collection('data').doc('recibosEsperados').collection('items');
  for (let n = 1; n <= 4; n += 1) {
    await receiptColl.doc(fixtureIds[`receipt${n}`]).set({ id: fixtureIds[`receipt${n}`], polizaId: fixtureIds.policy, clienteId: fixtureIds.client, aseguradoraId: `${fixtureIds.prefix}_insurer`, cuota: n, monto: 100, moneda: 'GTQ', estadoOperativo: 'PENDIENTE', vence: `2026-0${Math.min(9, n + 4)}-01` });
  }
  await db.collection('tenants').doc(tenantId).collection('data').doc('propuestasConciliacion').collection('items').doc(fixtureIds.proposal).set({
    id: fixtureIds.proposal, polizaId: fixtureIds.policy, reciboId: fixtureIds.receipt4, clienteId: fixtureIds.client, aseguradoraId: `${fixtureIds.prefix}_insurer`, moneda: 'GTQ', monto: 100, fechaPago: '2026-08-04', estado: 'PROPUESTA', conciliacionTipo: 'CONCILIADO_DIRECTO_ASEGURADORA'
  });
  const state = {
    schemaVersion: 'orbit360-block12-private-state-v1', projectId: PROJECT, realTenantId: REAL_TENANT, tenantId, runId,
    users, ids: fixtureIds, sourceHash: sha(`${tenantId}|commission_statement|2026-08`), webConfig, snapshotBefore: before
  };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
  save(PREPARE_OUT, { schemaVersion: 'orbit360-block12-prepare-v1', status: 'SYNTHETIC_RUNTIME_READY', classification: 'GO_LAB_SYNTHETIC_FIXTURE', projectId: PROJECT, syntheticTenantHash: sha(tenantId), syntheticUsersCreated: 3, syntheticMembershipsCreated: 3, realTenantSnapshotBefore: before, configPreparedForHosting: true, firestoreWritesSynthetic: 10, realTenantWrites: 0, authWritesSynthetic: 3, rulesChanged: false, productionTouched: false, ok: true });
}
async function browserPhase() {
  const state = readState();
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(safe(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(safe(message.text())); });
  const base = text(process.env.ORBIT360_PREVIEW_URL);
  if (!base) throw new Error('ENVIRONMENT_FAILURE:PREVIEW_URL_REQUIRED');
  const url = `${base.replace(/#.*$/, '').replace(/\?$/, '')}${base.includes('?') ? '&' : '?'}orbitBackend=firestore-lab&tenant=${encodeURIComponent(state.tenantId)}&orbitVerify=auto#/inicio`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.firebase && firebase.apps && firebase.apps.length && window.Orbit && Orbit.runtimeVerification, null, { timeout: 90000 });
  const context = { tenantId: state.tenantId, tokens: { direction: state.users.direction.token, advisorA: state.users.advisorA.token, advisorB: state.users.advisorB.token }, ids: state.ids, sourceHash: state.sourceHash };
  await page.evaluate(ctx => window.dispatchEvent(new CustomEvent('orbit:verification-context', { detail: ctx })), context);
  await page.waitForFunction(() => { const s = Orbit.runtimeVerification.state(); return !!s.finishedAt && s.running === false; }, null, { timeout: 180000 });
  const result = await page.evaluate(() => { const value = Orbit.runtimeVerification.state(); delete value.context; return value; });
  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  await browser.close();
  const failed = (result.results || []).filter(item => item.status === 'FAIL');
  save(BROWSER_OUT, { schemaVersion: 'orbit360-block12-browser-v1', status: failed.length ? 'OPERATIONAL_RUNTIME_BROWSER_FAIL' : 'OPERATIONAL_RUNTIME_BROWSER_PASS', classification: failed.length ? (failed[0].classification || 'FUNCTIONAL_DEFECT') : 'GO_LAB_IN_PLATFORM_RUNTIME', verdict: failed.length ? 'FAIL' : 'PASS', passed: (result.results || []).filter(item => item.status === 'PASS').length, failed: failed.length, results: result.results || [], pageErrors, consoleErrors, screenshot: path.relative(ROOT, SCREENSHOT), browserExecuted: true, realTenantWrites: 0, containsTokens: false, ok: failed.length === 0 && pageErrors.length === 0 });
  if (failed.length || pageErrors.length) process.exitCode = 42;
}
async function cleanup(app) {
  const auth = getAuth(app), db = getFirestore(app);
  let state;
  try { state = readState(); } catch (error) { save(FINAL_OUT, { schemaVersion: 'orbit360-block12-final-v1', status: 'BLOCK12_CLEANUP_FAIL', classification: 'PIPELINE_MECHANISM_FAILURE', error: safe(error), ok: false }); process.exitCode = 43; return; }
  let browser = {};
  try { browser = JSON.parse(fs.readFileSync(BROWSER_OUT, 'utf8')); } catch (error) { browser = { ok: false, status: 'BROWSER_EVIDENCE_MISSING', classification: 'PIPELINE_MECHANISM_FAILURE' }; }
  const tenant = db.collection('tenants').doc(state.tenantId);
  const legacy = db.collection('tenantId').doc(state.tenantId);
  const runtimeChecks = {};
  try {
    const business = await tenant.collection('workflow').doc('negocios').collection('items').doc(state.ids.business).get();
    const own = await tenant.collection('workflow').doc('gestiones').collection('items').doc(state.ids.managementOwn).get();
    const other = await tenant.collection('workflow').doc('gestiones').collection('items').doc(state.ids.managementOther).get();
    const cobro = await tenant.collection('data').doc('cobros').collection('items').doc(state.ids.cobro).get();
    const receipt = await tenant.collection('data').doc('recibosEsperados').collection('items').doc(state.ids.receipt4).get();
    const batch = await tenant.collection('importBatches').doc(state.ids.batch).get();
    const outbox = await tenant.collection('notificationOutbox').get();
    const portal = await legacy.collection('notifs').get();
    runtimeChecks.businessAtEmission = business.exists && business.data().etapa === 'emision';
    runtimeChecks.ownManagementResolved = own.exists && own.data().estado === 'Resuelta';
    runtimeChecks.otherManagementPreserved = other.exists;
    runtimeChecks.notificationOutboxCreated = outbox.size >= 1;
    runtimeChecks.portalResponseCreated = portal.size >= 1;
    runtimeChecks.cobroApplied = cobro.exists && cobro.data().conciliado === true;
    runtimeChecks.receiptUpdated = receipt.exists && receipt.data().estadoOperativo === 'PAGADO_CONCILIADO';
    runtimeChecks.importBatchRolledBack = batch.exists && batch.data().status === 'ROLLED_BACK';
  } catch (error) {
    runtimeChecks.inspectionError = safe(error);
  }
  await db.recursiveDelete(tenant).catch(() => {});
  await db.recursiveDelete(legacy).catch(() => {});
  let authDeleted = 0;
  for (const user of Object.values(state.users || {})) {
    try { await auth.deleteUser(user.uid); authDeleted += 1; } catch (error) {}
  }
  const after = await snapshotRealTenant(db);
  const realTenantUnchanged = JSON.stringify(stable(state.snapshotBefore)) === JSON.stringify(stable(after));
  const tenantCollections = await tenant.listCollections();
  const legacyCollections = await legacy.listCollections();
  let usersRemain = 0;
  for (const user of Object.values(state.users || {})) { try { await auth.getUser(user.uid); usersRemain += 1; } catch (error) {} }
  const runtimeOk = Object.entries(runtimeChecks).filter(([key]) => key !== 'inspectionError').every(([, value]) => value === true) && !runtimeChecks.inspectionError;
  const cleanupOk = tenantCollections.length === 0 && legacyCollections.length === 0 && usersRemain === 0 && authDeleted === 3;
  const ok = browser.ok === true && runtimeOk && cleanupOk && realTenantUnchanged;
  save(FINAL_OUT, {
    schemaVersion: 'orbit360-block12-operational-runtime-final-v1',
    status: ok ? 'OPERATIONAL_RUNTIME_LAB_PASS' : 'OPERATIONAL_RUNTIME_LAB_FAIL',
    classification: ok ? 'GO_LAB_OPERATIONAL_RUNTIME_CUMULATIVE' : (browser.classification || (realTenantUnchanged ? 'FUNCTIONAL_DEFECT' : 'DATA_CONTRACT_FAILURE')),
    gateId: 'block12-operational-runtime-lab-v20260804', contractVersion: '12.0.0',
    browser: { status: browser.status, passed: browser.passed || 0, failed: browser.failed || 0, screenshot: browser.screenshot || '' },
    runtimeChecks,
    rollback: { syntheticTenantCollectionsRemaining: tenantCollections.length, legacyCollectionsRemaining: legacyCollections.length, syntheticAuthUsersDeleted: authDeleted, syntheticAuthUsersRemaining: usersRemain, exact: cleanupOk },
    realTenant: { before: state.snapshotBefore, after, unchanged: realTenantUnchanged, writes: 0 },
    deploy: { functionsAllowlistedOnly: true, hostingPreviewOnly: true, rules: false, production: false },
    reimportExecuted: false, mainTouched: false, mergeExecuted: false, ok
  });
  if (!ok) process.exitCode = 44;
}

let app;
try {
  if (!['prepare', 'browser', 'cleanup'].includes(PHASE)) throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_REQUIRED');
  if (PHASE === 'browser') await browserPhase();
  else {
    app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
    if (PHASE === 'prepare') await prepare(app);
    if (PHASE === 'cleanup') await cleanup(app);
  }
} catch (error) {
  const target = PHASE === 'browser' ? BROWSER_OUT : PHASE === 'cleanup' ? FINAL_OUT : PREPARE_OUT;
  save(target, { schemaVersion: 'orbit360-block12-phase-failure-v1', phase: PHASE, status: 'BLOCK12_PHASE_FAIL', classification: safe(error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE', error: safe(error), ok: false });
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
