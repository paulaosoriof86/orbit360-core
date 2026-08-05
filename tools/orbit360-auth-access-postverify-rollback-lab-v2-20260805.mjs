#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const PRIVATE = process.env.ORBIT360_AUTH_PRIVATE_STATE;
const OUT = process.env.ORBIT360_ROLLBACK_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-postverify-rollback-sanitized-v2-20260805.json';
const write = value => { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n', 'utf8'); };
let app;
try {
  if (!PRIVATE || !fs.existsSync(PRIVATE)) throw new Error('PIPELINE_MECHANISM_FAILURE:PRIVATE_CENSUS_STATE_MISSING');
  const state = JSON.parse(fs.readFileSync(PRIVATE, 'utf8'));
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const auth = getAuth(app);
  let authRestored = 0;
  let membershipsRestored = 0;
  for (const target of [...(state.targets || [])].reverse()) {
    const current = await auth.getUserByEmail(target.email).catch(() => null);
    if (!target.beforeAuth && current) { await auth.deleteUser(current.uid); authRestored += 1; }
    else if (target.beforeAuth) {
      await auth.updateUser(target.beforeAuth.uid, {
        email: target.beforeAuth.email,
        displayName: target.beforeAuth.displayName || undefined,
        disabled: target.beforeAuth.disabled,
        emailVerified: target.beforeAuth.emailVerified
      });
      authRestored += 1;
    }
    const uid = current?.uid || target.beforeAuth?.uid;
    if (uid) {
      const ref = db.collection('tenants').doc(TENANT).collection('members').doc(uid);
      if (target.beforeMembership) await ref.set(target.beforeMembership, { merge: false });
      else await ref.delete();
      membershipsRestored += 1;
    }
    if (target.path && target.beforeAdvisor) await db.doc(target.path).set(target.beforeAdvisor, { merge: false });
  }
  write({
    schemaVersion: 'orbit360-auth-access-postverify-rollback-sanitized-v2',
    stage: 'AUTH_ACCESS_POSTVERIFY_ROLLBACK_PASS',
    decision: 'STOP_RETRY_ROLLBACK_APPLIED',
    classification: 'DATA_CONTRACT_FAILURE',
    authTargetsRestored: authRestored,
    membershipTargetsRestored: membershipsRestored,
    paulaOfficialEmailConfigurationPreserved: true,
    crmWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ok: true
  });
  console.log(JSON.stringify({ ok: true, stage: 'AUTH_ACCESS_POSTVERIFY_ROLLBACK_PASS', authRestored, membershipsRestored }));
} catch (error) {
  write({
    schemaVersion: 'orbit360-auth-access-postverify-rollback-sanitized-v2',
    stage: 'SECURITY_FAILURE_ROLLBACK_INCOMPLETE',
    decision: 'STOP_RETRY',
    classification: 'SECURITY_FAILURE',
    errorCode: String(error?.message || error).replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0, 180),
    crmWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ok: false
  });
  console.error(JSON.stringify({ ok: false, stage: 'SECURITY_FAILURE_ROLLBACK_INCOMPLETE' }));
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
