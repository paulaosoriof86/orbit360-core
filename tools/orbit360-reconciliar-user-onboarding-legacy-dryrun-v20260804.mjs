#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  classifyLegacyRecord,
  normalizeEmail
} from './orbit360-user-onboarding-contract-v20260804.mjs';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const OUTPUT = process.env.ORBIT360_ONBOARDING_DRYRUN_EVIDENCE || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/user-onboarding-legacy-dryrun.json');
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const clean = value => String(value == null ? '' : value).trim();
const safeError = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 500);

let app;
async function listUsers(auth) {
  const users = [];
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    users.push(...page.users.map(user => ({
      uid: user.uid,
      email: user.email || '',
      disabled: !!user.disabled,
      providers: (user.providerData || []).map(x => x.providerId).filter(Boolean)
    })));
    token = page.pageToken;
  } while (token);
  return users;
}
async function readCollection(ref, source) {
  const snap = await ref.get();
  return snap.docs.map(doc => ({ id: doc.id, source, data: doc.data() || {} }));
}
async function readAdvisors(db) {
  const candidates = [
    readCollection(db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items'), 'canonical'),
    readCollection(db.collection('tenantId').doc(TENANT).collection('asesores'), 'legacy_tenantId'),
    readCollection(db.collection('tenants').doc(TENANT).collection('asesores'), 'legacy_tenants')
  ];
  const settled = await Promise.allSettled(candidates);
  const rows = settled.filter(x => x.status === 'fulfilled').flatMap(x => x.value);
  const byId = new Map();
  for (const row of rows) {
    const email = normalizeEmail(row.data.email || row.data.correo || row.data.userEmail);
    const key = clean(row.id) || email || `${row.source}:${byId.size}`;
    const current = byId.get(key);
    if (!current || row.source === 'canonical') byId.set(key, row);
  }
  return [...byId.values()];
}
async function readMemberships(db) {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  return new Map(snap.docs.map(doc => [doc.id, { id: doc.id, ...(doc.data() || {}) }]));
}
function write(payload) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({
    ...payload,
    projectId: PROJECT,
    tenantId: TENANT,
    containsPII: false,
    containsSecrets: false,
    containsRawUid: false,
    containsRawEmail: false,
    firestoreRead: true,
    authRead: true,
    firestoreWrites: 0,
    authWrites: 0,
    userCreates: 0,
    userUpdates: 0,
    membershipWrites: 0,
    invitationSends: 0,
    passwordReads: 0,
    passwordWrites: 0,
    deployExecuted: false,
    rulesApplied: false,
    functionsDeployed: false,
    reimportExecuted: false,
    mainTouched: false,
    mergeExecuted: false
  }, null, 2) + '\n', 'utf8');
}

try {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [users, advisors, memberships] = await Promise.all([
    listUsers(auth),
    readAdvisors(db),
    readMemberships(db)
  ]);
  const emailGroups = new Map();
  for (const advisor of advisors) {
    const email = normalizeEmail(advisor.data.email || advisor.data.correo || advisor.data.userEmail);
    if (!email) continue;
    emailGroups.set(email, (emailGroups.get(email) || 0) + 1);
  }
  const rows = advisors.map(advisor => {
    const email = normalizeEmail(advisor.data.email || advisor.data.correo || advisor.data.userEmail);
    const matchingAuth = users.filter(user => normalizeEmail(user.email) === email);
    const auth = matchingAuth.length === 1 ? matchingAuth[0] : null;
    const membership = auth ? memberships.get(auth.uid) || null : null;
    let result;
    if (email && (emailGroups.get(email) || 0) > 1) {
      result = { action: 'requires_validation', reasons: ['ADVISOR_EMAIL_DUPLICATE'] };
    } else {
      result = classifyLegacyRecord({
        advisor: advisor.data,
        advisorId: advisor.id,
        tenantId: TENANT,
        authUsers: users,
        membership
      });
    }
    return {
      advisorIdSha256: sha(advisor.id),
      emailSha256: email ? sha(email) : '',
      source: advisor.source,
      action: result.action,
      reasons: result.reasons || [],
      authMatchCount: matchingAuth.length,
      authUidSha256: auth ? sha(auth.uid) : '',
      membershipExists: !!membership,
      desiredMembershipDigest: result.desiredMembership ? sha(JSON.stringify(result.desiredMembership)) : ''
    };
  });
  const counts = rows.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});
  const blocking = rows.filter(row => row.action === 'requires_validation').length;
  write({
    schemaVersion: 'orbit360-user-onboarding-legacy-dryrun-v1',
    generatedAt: new Date().toISOString(),
    classification: blocking ? 'DATA_CONTRACT_FAILURE' : 'GO_GENERIC_ONBOARDING_RECONCILIATION_DRYRUN',
    decision: blocking ? 'REQUIRES_VALIDATION_NO_WRITE' : 'DRYRUN_READY_NO_WRITE',
    counts: {
      advisorRecords: advisors.length,
      authUsers: users.length,
      memberships: memberships.size,
      ...counts,
      blocking
    },
    rows,
    ok: blocking === 0
  });
  console.log(JSON.stringify({
    counts: {
      advisorRecords: advisors.length,
      authUsers: users.length,
      memberships: memberships.size,
      ...counts,
      blocking
    },
    ok: blocking === 0
  }, null, 2));
  process.exitCode = blocking ? 41 : 0;
} catch (error) {
  write({
    schemaVersion: 'orbit360-user-onboarding-legacy-dryrun-error-v1',
    generatedAt: new Date().toISOString(),
    classification: 'ENVIRONMENT_FAILURE',
    error: safeError(error),
    ok: false
  });
  console.error(safeError(error));
  process.exitCode = 42;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
