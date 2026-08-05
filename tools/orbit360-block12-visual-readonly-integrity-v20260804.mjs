#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PHASE = process.argv[2] || '';
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const PRIVATE = process.env.ORBIT360_BLOCK12_VISUAL_INTEGRITY_STATE || path.join(process.env.RUNNER_TEMP || '/tmp', 'orbit360-block12-visual-integrity-private.json');
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/block12-visual-readonly-integrity.json');
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const save = payload => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII: false, containsSecrets: false }, null, 2) + '\n', 'utf8'); };
async function snapshot(db) {
  const names = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
  const collections = {};
  for (const name of names) {
    const snap = await db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get();
    const markers = snap.docs.map(doc => `${doc.id}|${doc.updateTime ? doc.updateTime.toMillis() : 0}`).sort();
    collections[name] = { count: snap.size, digest: sha(markers.join('\n')) };
  }
  const members = await db.collection('tenants').doc(TENANT).collection('members').get();
  return { tenantHash: sha(TENANT), collections, memberships: { count: members.size, digest: sha(members.docs.map(doc => doc.id).sort().join('\n')) } };
}
let app;
try {
  if (!['before', 'after'].includes(PHASE)) throw new Error('PIPELINE_MECHANISM_FAILURE:INTEGRITY_PHASE_REQUIRED');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('ENVIRONMENT_FAILURE:SERVICE_ACCOUNT_REQUIRED');
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const current = await snapshot(db);
  if (PHASE === 'before') {
    fs.mkdirSync(path.dirname(PRIVATE), { recursive: true });
    fs.writeFileSync(PRIVATE, JSON.stringify({ schemaVersion: 'orbit360-block12-visual-integrity-private-v1', snapshot: current }, null, 2), { encoding: 'utf8', mode: 0o600 });
    save({ schemaVersion: 'orbit360-block12-visual-readonly-integrity-v1', status: 'VISUAL_READONLY_SNAPSHOT_BEFORE_PASS', classification: 'GO_LAB_READONLY_INTEGRITY', before: current, firestoreReads: true, firestoreWrites: 0, authWrites: 0, productionTouched: false, ok: true });
  } else {
    if (!fs.existsSync(PRIVATE)) throw new Error('PIPELINE_MECHANISM_FAILURE:INTEGRITY_BEFORE_STATE_MISSING');
    const prior = JSON.parse(fs.readFileSync(PRIVATE, 'utf8'));
    const unchanged = JSON.stringify(stable(prior.snapshot)) === JSON.stringify(stable(current));
    save({ schemaVersion: 'orbit360-block12-visual-readonly-integrity-v1', status: unchanged ? 'VISUAL_READONLY_INTEGRITY_PASS' : 'VISUAL_READONLY_INTEGRITY_FAIL', classification: unchanged ? 'GO_LAB_READONLY_INTEGRITY' : 'DATA_CONTRACT_FAILURE', before: prior.snapshot, after: current, unchanged, firestoreReads: true, firestoreWrites: 0, authWrites: 0, productionTouched: false, ok: unchanged });
    if (!unchanged) process.exitCode = 42;
  }
} catch (error) {
  save({ schemaVersion: 'orbit360-block12-visual-readonly-integrity-v1', status: 'VISUAL_READONLY_INTEGRITY_FAIL', classification: String(error.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE', error: String(error.message || error).replace(/[\r\n]+/g, ' ').slice(0, 500), firestoreWrites: 0, authWrites: 0, productionTouched: false, ok: false });
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
