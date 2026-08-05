#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const DYNAMIC_STATE = process.env.ORBIT360_AUTH_DYNAMIC_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-auth-dynamic-team-private.json');
const OUT = path.join(ROOT, process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716', 'auth-selfmanaged-containment-sanitized-v20260805.json');
const sha = value => crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
let app;
try {
  const state = JSON.parse(fs.readFileSync(DYNAMIC_STATE, 'utf8'));
  app = getApps()[0] || initializeApp({ credential:applicationDefault(), projectId:PROJECT });
  const auth = getAuth(app);
  const db = getFirestore(app);
  let disabled = 0;
  let membershipsBlocked = 0;
  const uidHashes = [];
  for (const item of state.targets || []) {
    const uid = text(item.uid);
    if (!uid) continue;
    try { await auth.updateUser(uid, { disabled:true }); disabled += 1; } catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
    uidHashes.push(sha(uid));
    const ref = db.collection('tenants').doc(TENANT).collection('members').doc(uid);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.set({ status:'blocked_recovery', credentialState:'recovery_required', mustChangePassword:true, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      membershipsBlocked += 1;
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion:'orbit360-auth-selfmanaged-containment-v1',
    stage:'AUTH_SELFMANAGED_CONTAINMENT_COMPLETE',
    classification:'SECURITY_FAILURE_CONTAINED',
    identitiesDisabled:disabled,
    membershipsBlocked,
    uidHashes:uidHashes.sort(),
    passwordRollbackExact:false,
    recoveryMethod:'ADMIN_ASSIGN_NEW_TEMPORARY_PASSWORD',
    containsPII:false,
    containsSecrets:false,
    containsPasswords:false,
    ok:true
  }, null, 2) + '\n');
  process.exit(0);
} catch (error) {
  fs.mkdirSync(path.dirname(OUT), { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion:'orbit360-auth-selfmanaged-containment-v1',
    stage:'AUTH_SELFMANAGED_CONTAINMENT_FAILED',
    classification:'SECURITY_FAILURE',
    errorCode:String(error?.code || error?.message || error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,500),
    containsPII:false,
    containsSecrets:false,
    containsPasswords:false,
    ok:false
  }, null, 2) + '\n');
  process.exit(41);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
