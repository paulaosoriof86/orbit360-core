#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const FAILED_RUN_ID = '30910775651';
const ONBOARDING_VERSION = 'rc12-approved-roster-final-v1';
const WINDOW_START = Date.parse('2026-08-04T12:49:45.000Z');
const WINDOW_END = Date.parse('2026-08-04T12:50:15.000Z');
const SOURCE_COMMIT = '34fa84a60ebc38b0035ed664da87ca78aaa73ff7';
const SOURCE_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const MANIFEST_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-rollback-recovery.json');
const PROFILES = ['direction', 'operations', 'advisor'];
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});

const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const providerIds = user => [...new Set((user?.providerData || []).map(item => text(item?.providerId)).filter(Boolean))].sort();
const userNotFound = error => ['auth/user-not-found', 'auth/email-not-found'].includes(String(error?.code || ''));
const sanitize = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 700);
const write = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    ...payload,
    projectId: PROJECT,
    tenantId: TENANT,
    containsPII: false,
    containsSecrets: false,
    containsRawEmail: false,
    containsRawUid: false,
    passwordReads: 0,
    passwordWrites: 0,
    authUsersCreated: 0,
    authUsersUpdated: 0,
    membershipDocumentsCreated: 0,
    membershipDocumentsUpdated: 0,
    hostingDeployAttempted: false,
    hostingRollbackExecuted: false,
    browserExecuted: false,
    reimportExecuted: false,
    rulesApplied: false,
    functionsDeployed: false,
    mainTouched: false,
    mergeExecuted: false,
    gate711Executed: false,
    productionTouched: false
  }, null, 2) + '\n', 'utf8');
};

let app;
try {
  const sourceRaw = execFileSync('git', ['show', `${SOURCE_COMMIT}:${SOURCE_PATH}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const approvedSource = JSON.parse(sourceRaw)?.approvedRoster || {};
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), 'utf8'));
  const contracts = manifest?.approvedRoster || {};
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const allUsers = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    allUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const resolved = {};
  const prechecks = {};
  for (const profile of PROFILES) {
    const source = approvedSource?.[profile] || {};
    const contract = contracts?.[profile] || {};
    const email = text(source.email).toLowerCase();
    const emailDigest = sha(email);
    const matches = allUsers.filter(user => sha(String(user?.email || '').toLowerCase()) === contract.emailSha256);
    const user = matches.length === 1 ? matches[0] : null;
    const creationTime = user?.metadata?.creationTime || '';
    const creationMs = Date.parse(creationTime);
    const providers = providerIds(user);
    const technical = user ? (sha(String(user.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(user.uid) === TECHNICAL_DIGESTS.uid) : false;
    const ref = user ? db.collection('tenants').doc(TENANT).collection('members').doc(user.uid) : null;
    const snap = ref ? await ref.get() : null;
    const membership = snap?.exists ? snap.data() || {} : {};
    const checks = {
      approvedSourcePresent: Boolean(email && source.person),
      sourceDigestMatchesContract: /^[a-f0-9]{64}$/.test(contract.emailSha256 || '') && emailDigest === contract.emailSha256,
      exactlyOneAuthUser: matches.length === 1,
      userCreatedInFailedRunWindow: Number.isFinite(creationMs) && creationMs >= WINDOW_START && creationMs <= WINDOW_END,
      passwordProviderOnly: providers.length === 1 && providers[0] === 'password',
      userEnabledAndUnverified: user ? user.disabled === false && user.emailVerified === false : false,
      technicalIdentityExcluded: !technical,
      membershipExists: Boolean(snap?.exists),
      membershipOwnedByFailedRun: text(membership.onboardingRunId) === FAILED_RUN_ID,
      membershipVersionExact: text(membership.onboardingVersion) === ONBOARDING_VERSION,
      membershipDocumentIdEqualsUid: Boolean(user && snap?.id === user.uid),
      membershipTenantExact: text(membership.tenantId) === TENANT
    };
    const ok = Object.values(checks).every(Boolean);
    prechecks[profile] = {
      emailSha256: contract.emailSha256 || '',
      uidSha256: user ? sha(user.uid) : '',
      creationTime,
      providerIds: providers,
      membershipRunIdMatch: checks.membershipOwnedByFailedRun,
      membershipVersionMatch: checks.membershipVersionExact,
      checks,
      ok
    };
    if (ok) resolved[profile] = { user, ref };
  }

  const distinctUids = new Set(Object.values(resolved).map(item => item.user.uid));
  const preflightOk = PROFILES.every(profile => prechecks[profile]?.ok === true) && distinctUids.size === 3;
  if (!preflightOk) {
    write({
      schemaVersion: 'orbit360-approved-roster-rollback-recovery-v1',
      generatedAt: new Date().toISOString(),
      decision: 'ROLLBACK_RECOVERY_NO_WRITE_AMBIGUOUS',
      classification: 'SECURITY_FAILURE',
      failedRunId: FAILED_RUN_ID,
      prechecks,
      distinctOwnedUsers: distinctUids.size,
      firestoreRead: true,
      firestoreWrites: 0,
      authRead: true,
      authWrites: 0,
      membershipDeletes: 0,
      authDeletes: 0,
      remainingOwnedMemberships: 3,
      remainingOwnedUsers: 3,
      ok: false
    });
    process.exit(41);
  }

  const batch = db.batch();
  for (const profile of PROFILES) batch.delete(resolved[profile].ref);
  await batch.commit();

  const uids = PROFILES.map(profile => resolved[profile].user.uid);
  const deleteResult = await auth.deleteUsers(uids);
  if (deleteResult.failureCount > 0) {
    for (const error of deleteResult.errors || []) {
      const uid = uids[error.index];
      try { await auth.deleteUser(uid); } catch (retryError) { if (!userNotFound(retryError)) throw retryError; }
    }
  }

  let remainingOwnedMemberships = 0;
  let remainingOwnedUsers = 0;
  for (const profile of PROFILES) {
    const item = resolved[profile];
    const snap = await item.ref.get();
    if (snap.exists) remainingOwnedMemberships += 1;
    try { await auth.getUser(item.user.uid); remainingOwnedUsers += 1; }
    catch (error) { if (!userNotFound(error)) throw error; }
  }
  const ok = remainingOwnedMemberships === 0 && remainingOwnedUsers === 0;
  write({
    schemaVersion: 'orbit360-approved-roster-rollback-recovery-v1',
    generatedAt: new Date().toISOString(),
    decision: ok ? 'APPROVED_ROSTER_ROLLBACK_RECOVERY_PASS' : 'APPROVED_ROSTER_ROLLBACK_RECOVERY_ESCALATE',
    classification: ok ? 'ROLLBACK_PASS' : 'ENVIRONMENT_FAILURE',
    failedRunId: FAILED_RUN_ID,
    prechecks,
    distinctOwnedUsers: distinctUids.size,
    firestoreRead: true,
    firestoreWrites: 3,
    authRead: true,
    authWrites: 3,
    membershipDeletes: 3,
    authDeletes: 3,
    remainingOwnedMemberships,
    remainingOwnedUsers,
    ok
  });
  process.exit(ok ? 0 : 42);
} catch (error) {
  write({
    schemaVersion: 'orbit360-approved-roster-rollback-recovery-v1',
    generatedAt: new Date().toISOString(),
    decision: 'APPROVED_ROSTER_ROLLBACK_RECOVERY_ESCALATE',
    classification: 'ENVIRONMENT_FAILURE',
    failedRunId: FAILED_RUN_ID,
    errorCode: sanitize(error),
    firestoreRead: true,
    firestoreWrites: 0,
    authRead: true,
    authWrites: 0,
    membershipDeletes: 0,
    authDeletes: 0,
    ok: false
  });
  process.exit(42);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
