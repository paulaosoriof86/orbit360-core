#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const PRIVATE = process.env.ORBIT360_AUTH_PRIVATE_STATE;
const OUT = process.env.ORBIT360_SCOPE_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-scope-postverify-sanitized-v2-20260805.json';

const text = (value, max = 500) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const digest = value => sha(JSON.stringify(stable(value)));
const safeError = error => text(error?.message || error, 800).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]');
const write = value => { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n', 'utf8'); };

let app;
try {
  if (!PRIVATE || !fs.existsSync(PRIVATE)) throw new Error('PIPELINE_MECHANISM_FAILURE:PRIVATE_CENSUS_STATE_MISSING');
  const state = JSON.parse(fs.readFileSync(PRIVATE, 'utf8'));
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const auth = getAuth(app);
  const targets = [];
  for (const target of state.targets || []) {
    const user = await auth.getUserByEmail(target.email);
    const snap = await db.collection('tenants').doc(TENANT).collection('members').doc(user.uid).get();
    if (!snap.exists) throw new Error(`DATA_CONTRACT_FAILURE:${String(target.key).toUpperCase()}_MEMBERSHIP_MISSING_POSTVERIFY`);
    const member = snap.data() || {};
    const expected = stable(target.dataScopes || {});
    const actual = stable(member.dataScopes || {});
    if (digest(actual) !== digest(expected)) throw new Error(`DATA_CONTRACT_FAILURE:${String(target.key).toUpperCase()}_DATA_SCOPES_MISMATCH`);
    targets.push({ key: target.key, uidHash: sha(user.uid), expectedScopeDigest: digest(expected), actualScopeDigest: digest(actual), dataScopesVerified: true });
  }
  if (targets.length !== 3) throw new Error('DATA_CONTRACT_FAILURE:TARGET_COUNT_NOT_THREE_POSTVERIFY');
  write({
    schemaVersion: 'orbit360-auth-access-scope-postverify-sanitized-v2',
    stage: 'AUTH_ACCESS_SCOPE_POSTVERIFY_PASS',
    decision: 'GO_ROLES_COUNTRIES_AND_SCOPES_VERIFIED',
    classification: 'AUTH_ACCESS_SCOPE_CONTRACT_COMPLETE',
    targets,
    firestoreReads: 3,
    firestoreWrites: 0,
    authWrites: 0,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false,
    ok: true
  });
  console.log(JSON.stringify({ ok: true, stage: 'AUTH_ACCESS_SCOPE_POSTVERIFY_PASS', targets: targets.map(item => item.key) }));
} catch (error) {
  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  write({
    schemaVersion: 'orbit360-auth-access-scope-postverify-sanitized-v2',
    stage: 'STOP_RETRY_SCOPE_POSTVERIFY',
    decision: 'STOP_RETRY',
    classification,
    errorCode: text(message.split(':')[1] || 'SCOPE_POSTVERIFY_FAILED', 180),
    firestoreWrites: 0,
    authWrites: 0,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false,
    ok: false
  });
  console.error(JSON.stringify({ ok: false, stage: 'STOP_RETRY_SCOPE_POSTVERIFY', classification }));
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
