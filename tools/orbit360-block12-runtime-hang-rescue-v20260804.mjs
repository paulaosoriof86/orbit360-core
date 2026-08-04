#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const REAL_TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const RUN_ID = '30956309298';
const TENANT_ID = `verify-block12-${RUN_ID}`;
const PREFIX = `zztest_block12_${RUN_ID}`;
const USER_IDS = [`${PREFIX}_direction`, `${PREFIX}_advisorA`, `${PREFIX}_advisorB`];
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-runtime-hang-rescue-data-auth.json');
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const save = payload => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8'); };

async function snapshotRealTenant(db) {
  const names = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
  const collections = {};
  for (const name of names) {
    const snap = await db.collection('tenants').doc(REAL_TENANT).collection('data').doc(name).collection('items').get();
    collections[name] = { count: snap.size, digest: sha(snap.docs.map(doc => `${doc.id}|${doc.updateTime ? doc.updateTime.toMillis() : 0}`).sort().join('\n')) };
  }
  const members = await db.collection('tenants').doc(REAL_TENANT).collection('members').get();
  return { tenantHash: sha(REAL_TENANT), collections, memberships: { count: members.size, digest: sha(members.docs.map(doc => doc.id).sort().join('\n')) } };
}

let app;
try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('ENVIRONMENT_FAILURE:SERVICE_ACCOUNT_REQUIRED');
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const auth = getAuth(app);
  const before = await snapshotRealTenant(db);
  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const legacyRef = db.collection('tenantId').doc(TENANT_ID);
  await db.recursiveDelete(tenantRef).catch(error => { if (!/not found|NOT_FOUND/i.test(String(error?.message || error))) throw error; });
  await db.recursiveDelete(legacyRef).catch(error => { if (!/not found|NOT_FOUND/i.test(String(error?.message || error))) throw error; });
  let authDeleted = 0;
  for (const uid of USER_IDS) {
    try { await auth.deleteUser(uid); authDeleted += 1; }
    catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
  }
  const tenantCollections = await tenantRef.listCollections();
  const legacyCollections = await legacyRef.listCollections();
  let usersRemaining = 0;
  for (const uid of USER_IDS) {
    try { await auth.getUser(uid); usersRemaining += 1; }
    catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
  }
  const after = await snapshotRealTenant(db);
  const realTenantUnchanged = JSON.stringify(stable(before)) === JSON.stringify(stable(after));
  const syntheticRemoved = tenantCollections.length === 0 && legacyCollections.length === 0 && usersRemaining === 0;
  const ok = realTenantUnchanged && syntheticRemoved;
  save({
    schemaVersion: 'orbit360-block12-runtime-hang-rescue-data-auth-v1',
    status: ok ? 'RUNTIME_HANG_SYNTHETIC_CLEANUP_PASS' : 'RUNTIME_HANG_SYNTHETIC_CLEANUP_FAIL',
    classification: ok ? 'GO_RESCUE_CLEANUP' : 'PIPELINE_MECHANISM_FAILURE',
    targetRunId: Number(RUN_ID), syntheticTenantHash: sha(TENANT_ID), syntheticUserCount: USER_IDS.length,
    authUsersDeletedNow: authDeleted, authUsersRemaining: usersRemaining,
    tenantCollectionsRemaining: tenantCollections.length, legacyCollectionsRemaining: legacyCollections.length,
    realTenantSnapshotBefore: before, realTenantSnapshotAfter: after, realTenantUnchanged,
    syntheticTenantRemoved: syntheticRemoved, firestoreWritesSyntheticCleanup: true, realTenantWrites: 0,
    rulesChanged: false, productionTouched: false, ok
  });
  if (!ok) process.exitCode = 42;
} catch (error) {
  save({ schemaVersion: 'orbit360-block12-runtime-hang-rescue-data-auth-v1', status: 'RUNTIME_HANG_SYNTHETIC_CLEANUP_FAIL', classification: String(error?.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE', error: String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 700), targetRunId: Number(RUN_ID), realTenantWrites: 0, rulesChanged: false, productionTouched: false, ok: false });
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
