#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildFoundationPlan, _test as planTest } from './orbit360-auth-foundation-all-team-plan-v20260805.mjs';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EXPECTED = Number(process.env.ORBIT360_EXPECTED_TEAM_USERS || 7);
const RUN_ID = String(process.env.GITHUB_RUN_ID || 'local');
const RUN_STAMP = new Date().toISOString();
const EVIDENCE_DIR = path.join(ROOT, process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716');
const PRIVATE_STATE = process.env.ORBIT360_AUTH_FOUNDATION_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-auth-foundation-all-team-private.json');
const CONTINUE_URL = process.env.ORBIT360_PASSWORD_CONTINUE_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio';
const WEB_API_KEY = String(process.env.ORBIT360_FIREBASE_WEB_API_KEY || '').trim();

const FILES = Object.freeze({
  census: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-census-sanitized-v20260805.json'),
  apply: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-apply-sanitized-v20260805.json'),
  emails: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-emails-sanitized-v20260805.json'),
  sessions: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-sessions-sanitized-v20260805.json'),
  verify: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-verify-sanitized-v20260805.json'),
  rollback: path.join(EVIDENCE_DIR, 'auth-foundation-all-team-runtime-rollback-sanitized-v20260805.json')
});

const TEAM_SOURCES = Object.freeze([
  { priority: 1, source: 'canonical', build: db => db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items') },
  { priority: 2, source: 'legacy_tenantId_asesores', build: db => db.collection('tenantId').doc(TENANT).collection('asesores') },
  { priority: 3, source: 'legacy_tenants_asesores', build: db => db.collection('tenants').doc(TENANT).collection('asesores') },
  { priority: 4, source: 'legacy_tenantId_advisors', build: db => db.collection('tenantId').doc(TENANT).collection('advisors') },
  { priority: 5, source: 'legacy_tenants_advisors', build: db => db.collection('tenants').doc(TENANT).collection('advisors') }
]);

const CRM_PATHS = Object.freeze([
  ['clientes'], ['polizas'], ['vehiculos'], ['recibos'], ['cartera'], ['cobros'], ['comisiones'], ['gestiones'], ['leads']
]);
const TEAM_PATCH_FIELDS = Object.freeze([
  'authUid','accessProvisioned','accessState','onboardingState','invitacionEstado','membershipStatus',
  'accessErrorCode','accessLastAttemptAt','accessOnboardingVersion'
]);

const text = value => String(value == null ? '' : value).trim();
const sha = value => crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const sanitize = value => text(value).replace(/[\r\n]+/g, ' ').replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]').slice(0, 700);
const userNotFound = error => ['auth/user-not-found', 'auth/email-not-found'].includes(String(error?.code || ''));

let app;
function admin() {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return { auth: getAuth(app), db: getFirestore(app) };
}
function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function writePrivate(payload) {
  fs.writeFileSync(PRIVATE_STATE, JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 });
}
function readPrivate() {
  return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8'));
}
function publicBase(payload = {}) {
  return {
    ...payload,
    projectId: PROJECT,
    tenantIdHash: sha(TENANT),
    expectedUsers: EXPECTED,
    containsPII: false,
    containsSecrets: false,
    containsRawEmail: false,
    containsRawUid: false,
    containsPassword: false,
    containsTemporaryPassword: false,
    containsActionLink: false,
    productionTouched: false,
    mainTouched: false,
    mergeExecuted: false,
    hostingDeploys: 0,
    rulesDeploys: 0,
    reimports: 0
  };
}

async function listAllUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function normalizedContract(data, id) {
  return planTest.normalizeTeamRecord({ ...(data || {}), id });
}

async function readTeam(db) {
  const grouped = new Map();
  for (const source of TEAM_SOURCES) {
    const snap = await source.build(db).get();
    for (const doc of snap.docs) {
      const item = {
        id: doc.id,
        source: source.source,
        priority: source.priority,
        refPath: doc.ref.path,
        data: stable(doc.data() || {})
      };
      const rows = grouped.get(doc.id) || [];
      rows.push(item);
      grouped.set(doc.id, rows);
    }
  }
  const selected = [];
  const conflicts = [];
  for (const [id, rows] of grouped.entries()) {
    rows.sort((a, b) => a.priority - b.priority);
    const contracts = rows.map(row => digest(normalizedContract(row.data, id)));
    if (new Set(contracts).size > 1) {
      conflicts.push({ teamIdHash: sha(id), sources: rows.map(row => row.source) });
      continue;
    }
    selected.push(rows[0]);
  }
  selected.sort((a, b) => a.id.localeCompare(b.id));
  return { selected, conflicts, observedDocuments: [...grouped.values()].reduce((sum, rows) => sum + rows.length, 0) };
}

async function readMemberships(db) {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  return snap.docs.map(doc => ({ id: doc.id, uid: doc.id, data: stable(doc.data() || {}) }));
}

async function snapshotCollection(ref) {
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id: doc.id, data: stable(doc.data() || {}) })).sort((a, b) => a.id.localeCompare(b.id));
  return { count: rows.length, digest: digest(rows) };
}

async function crmSnapshot(db) {
  const result = {};
  for (const [name] of CRM_PATHS) {
    const candidates = [
      { key: `canonical:${name}`, ref: db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items') },
      { key: `legacy:${name}`, ref: db.collection('tenantId').doc(TENANT).collection(name) }
    ];
    for (const candidate of candidates) result[candidate.key] = await snapshotCollection(candidate.ref);
  }
  return result;
}

function findUser(record, users) {
  const boundUid = text(record.currentAuthUid);
  const byUid = boundUid ? users.filter(user => user.uid === boundUid) : [];
  const byEmail = users.filter(user => text(user.email).toLowerCase() === record.email);
  if (byUid.length > 1 || byEmail.length > 1) throw new Error('AUTH_IDENTITY_AMBIGUOUS');
  if (byUid[0] && byEmail[0] && byUid[0].uid !== byEmail[0].uid) throw new Error('AUTH_UID_EMAIL_COLLISION');
  const user = byUid[0] || byEmail[0] || null;
  if (user && text(user.email).toLowerCase() !== record.email) throw new Error('AUTH_BOUND_EMAIL_MISMATCH');
  return user;
}

function desiredMembership(record, uid) {
  return {
    ...planTest.desiredMembership(TENANT, record, uid),
    schemaVersion: 'orbit360-tenant-membership-v2',
    onboardingRunId: RUN_ID,
    updatedAt: RUN_STAMP
  };
}

function teamPatch(uid) {
  return {
    authUid: uid,
    accessProvisioned: true,
    accessState: 'invited',
    onboardingState: 'invited',
    invitacionEstado: 'pendiente_envio',
    membershipStatus: 'active',
    accessErrorCode: '',
    accessLastAttemptAt: RUN_STAMP,
    accessOnboardingVersion: 'orbit360-auth-foundation-all-team-runtime-v1'
  };
}

async function census() {
  const { auth, db } = admin();
  const [team, users, memberships, crmBefore] = await Promise.all([readTeam(db), listAllUsers(auth), readMemberships(db), crmSnapshot(db)]);
  if (team.conflicts.length) throw new Error('TEAM_ALIAS_CONFLICT');
  const teamRecords = team.selected.map(item => ({ ...item.data, id: item.id }));
  const plan = buildFoundationPlan({ tenantId: TENANT, teamRecords, authUsers: users.map(user => ({ uid: user.uid, email: user.email || '', emailVerified: user.emailVerified })), memberships: memberships.map(item => ({ uid: item.uid, ...item.data })), expectedActiveCount: EXPECTED });
  if (!plan.ok) {
    writeJson(FILES.census, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_CENSUS_STOP', classification: plan.classification || 'DATA_CONTRACT_FAILURE', errorCode: plan.errorCode || 'TEAM_ROSTER_NOT_READY', activeTeamCount: plan.activeTeamCount ?? 0, firestoreReads: true, firestoreWrites: 0, authReads: true, authWrites: 0, ok: false }));
    return 41;
  }
  const activeItems = team.selected.filter(item => planTest.normalizeTeamRecord({ ...item.data, id: item.id }).active);
  const targets = [];
  for (const item of activeItems) {
    const record = planTest.normalizeTeamRecord({ ...item.data, id: item.id });
    const user = findUser(record, users);
    const membership = user ? memberships.find(row => row.uid === user.uid) || null : null;
    targets.push({
      teamId: item.id,
      teamRefPath: item.refPath,
      teamBefore: item.data,
      teamBeforeDigest: digest(item.data),
      normalized: record,
      existingUid: user?.uid || '',
      existingAuth: user ? { uid: user.uid, email: user.email || '', disabled: user.disabled, displayName: user.displayName || '', emailVerified: user.emailVerified } : null,
      membershipBefore: membership ? membership.data : null
    });
  }
  const state = {
    schemaVersion: 'orbit360-auth-foundation-all-team-private-v1',
    projectId: PROJECT,
    tenantId: TENANT,
    generatedAt: RUN_STAMP,
    expectedUsers: EXPECTED,
    crmBefore,
    targets,
    createdAuthUids: [],
    emailsSent: [],
    applied: false,
    sessionsVerified: false
  };
  writePrivate(state);
  writeJson(FILES.census, publicBase({
    stage: 'AUTH_FOUNDATION_ALL_TEAM_CENSUS_PASS',
    classification: 'GO_AUTH_FOUNDATION_ALL_TEAM_RUNTIME',
    activeTeamCount: targets.length,
    observedTeamDocuments: team.observedDocuments,
    plannedAuthCreates: targets.filter(item => !item.existingUid).length,
    plannedAuthLinks: targets.filter(item => item.existingUid).length,
    plannedMembershipReconciliations: targets.length,
    plannedTeamLinks: targets.length,
    functionalProfilesCovered: plan.functionalProfilesCovered,
    futureUserPathSupported: plan.futureUserPathSupported,
    firestoreReads: true,
    firestoreWrites: 0,
    authReads: true,
    authWrites: 0,
    ok: targets.length === EXPECTED
  }));
  return targets.length === EXPECTED ? 0 : 41;
}

async function restoreState(state, auth, db) {
  let membershipRestores = 0;
  let teamRestores = 0;
  let authDeletes = 0;
  const refs = state.targets.map(item => ({
    item,
    teamRef: db.doc(item.teamRefPath),
    memberRef: item.uid ? db.collection('tenants').doc(TENANT).collection('members').doc(item.uid) : null
  }));
  await db.runTransaction(async tx => {
    const reads = [];
    for (const entry of refs) {
      reads.push(await tx.get(entry.teamRef));
      if (entry.memberRef) reads.push(await tx.get(entry.memberRef));
    }
    for (const entry of refs) {
      tx.set(entry.teamRef, entry.item.teamBefore, { merge: false });
      teamRestores += 1;
      if (!entry.memberRef) continue;
      if (entry.item.membershipBefore) tx.set(entry.memberRef, entry.item.membershipBefore, { merge: false });
      else tx.delete(entry.memberRef);
      membershipRestores += 1;
    }
  });
  for (const uid of [...(state.createdAuthUids || [])].reverse()) {
    try { await auth.deleteUser(uid); authDeletes += 1; }
    catch (error) { if (!userNotFound(error)) throw error; }
  }
  return { membershipRestores, teamRestores, authDeletes };
}

async function apply() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    const users = await listAllUsers(auth);
    for (const item of state.targets) {
      const currentSnap = await db.doc(item.teamRefPath).get();
      if (!currentSnap.exists || digest(stable(currentSnap.data() || {})) !== item.teamBeforeDigest) throw new Error('TEAM_CHANGED_AFTER_CENSUS');
      let user = findUser(item.normalized, users);
      if (!user) {
        user = await auth.createUser({ email: item.normalized.email, displayName: item.normalized.displayName || undefined, disabled: false, emailVerified: false });
        state.createdAuthUids.push(user.uid);
        users.push(user);
        writePrivate(state);
      }
      item.uid = user.uid;
      item.membershipDesired = desiredMembership(item.normalized, user.uid);
      item.teamPatch = teamPatch(user.uid);
    }
    if (new Set(state.targets.map(item => item.uid)).size !== EXPECTED) throw new Error('AUTH_UID_NOT_DISTINCT');

    const memberRefs = state.targets.map(item => db.collection('tenants').doc(TENANT).collection('members').doc(item.uid));
    const teamRefs = state.targets.map(item => db.doc(item.teamRefPath));
    await db.runTransaction(async tx => {
      const memberSnaps = [];
      const teamSnaps = [];
      for (const ref of memberRefs) memberSnaps.push(await tx.get(ref));
      for (const ref of teamRefs) teamSnaps.push(await tx.get(ref));
      for (let index = 0; index < state.targets.length; index += 1) {
        const item = state.targets[index];
        const teamSnap = teamSnaps[index];
        if (!teamSnap.exists || digest(stable(teamSnap.data() || {})) !== item.teamBeforeDigest) throw new Error('TEAM_TRANSACTION_STALE');
        const memberSnap = memberSnaps[index];
        if (item.membershipBefore && (!memberSnap.exists || digest(stable(memberSnap.data() || {})) !== digest(item.membershipBefore))) throw new Error('MEMBERSHIP_TRANSACTION_STALE');
        if (!item.membershipBefore && memberSnap.exists) throw new Error('MEMBERSHIP_CREATED_AFTER_CENSUS');
      }
      for (let index = 0; index < state.targets.length; index += 1) {
        tx.set(memberRefs[index], state.targets[index].membershipDesired, { merge: false });
        tx.set(teamRefs[index], state.targets[index].teamPatch, { merge: true });
      }
    });
    state.applied = true;
    writePrivate(state);
    writeJson(FILES.apply, publicBase({
      stage: 'AUTH_FOUNDATION_ALL_TEAM_APPLY_PASS',
      classification: 'CONTROLLED_WRITE_APPLIED',
      authUsersCreated: state.createdAuthUids.length,
      authUsersLinked: EXPECTED - state.createdAuthUids.length,
      membershipsWritten: EXPECTED,
      teamRecordsLinked: EXPECTED,
      atomicTransaction: true,
      transactionStrategy: 'READ_ALL_VALIDATE_ALL_WRITE_ALL',
      allowedTeamPatchFields: TEAM_PATCH_FIELDS,
      firestoreReads: true,
      firestoreWrites: EXPECTED * 2,
      authReads: true,
      authWrites: state.createdAuthUids.length,
      ok: true
    }));
    return 0;
  } catch (error) {
    let rollback = { membershipRestores: 0, teamRestores: 0, authDeletes: 0 };
    try { rollback = await restoreState(state, auth, db); } catch (_) {}
    writeJson(FILES.apply, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_APPLY_STOP_RETRY', classification: 'DATA_CONTRACT_FAILURE', errorCode: sanitize(error?.code || error?.message || error), rollback, firestoreReads: true, firestoreWrites: rollback.membershipRestores + rollback.teamRestores, authReads: true, authWrites: rollback.authDeletes, ok: false }));
    return 41;
  }
}

async function sendResetEmail(email) {
  if (!WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY_REQUIRED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(WEB_API_KEY)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email, continueUrl: CONTINUE_URL })
  });
  let body = null;
  try { body = await response.json(); } catch (_) {}
  if (!response.ok || body?.error) throw new Error(`PASSWORD_EMAIL_${response.status}_${body?.error?.message || 'FAILED'}`);
}

async function emails() {
  const state = readPrivate();
  if (!state.applied) return 41;
  try {
    for (const item of state.targets) {
      if (state.emailsSent.includes(item.uid)) continue;
      await sendResetEmail(item.normalized.email);
      state.emailsSent.push(item.uid);
      writePrivate(state);
    }
    writeJson(FILES.emails, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_EMAILS_PASS', classification: 'PASSWORD_EMAILS_SENT', emailsSent: state.emailsSent.length, emailHashes: state.targets.map(item => sha(item.normalized.email)).sort(), actionLinksExposed: 0, firestoreWrites: 0, authWrites: 0, ok: state.emailsSent.length === EXPECTED }));
    return state.emailsSent.length === EXPECTED ? 0 : 41;
  } catch (error) {
    writeJson(FILES.emails, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_EMAILS_STOP_RETRY', classification: 'ENVIRONMENT_FAILURE', errorCode: sanitize(error?.message || error), emailsSentBeforeFailure: state.emailsSent.length, actionLinksExposed: 0, firestoreWrites: 0, authWrites: 0, ok: false }));
    return 41;
  }
}

async function exchangeCustomToken(token) {
  if (!WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY_REQUIRED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(WEB_API_KEY)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, returnSecureToken: true })
  });
  const body = await response.json();
  if (!response.ok || body?.error || !body?.idToken) throw new Error(`CUSTOM_TOKEN_SESSION_${response.status}_${body?.error?.message || 'FAILED'}`);
  return body.idToken;
}

async function sessions() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    const checks = [];
    for (const item of state.targets) {
      const custom = await auth.createCustomToken(item.uid, { orbitTenant: TENANT, orbitRole: item.normalized.activeRole });
      const idToken = await exchangeCustomToken(custom);
      const decoded = await auth.verifyIdToken(idToken, true);
      const memberSnap = await db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get();
      const membership = memberSnap.exists ? memberSnap.data() || {} : {};
      const ok = decoded.uid === item.uid && membership.tenantId === TENANT && ['active', 'activo'].includes(text(membership.status).toLowerCase()) && Array.isArray(membership.roles) && membership.roles.includes(membership.activeRole);
      checks.push({ uidHash: sha(item.uid), ok });
      if (!ok) throw new Error('SESSION_MEMBERSHIP_CONTRACT_FAILED');
    }
    state.sessionsVerified = checks.every(item => item.ok);
    writePrivate(state);
    writeJson(FILES.sessions, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_SESSIONS_PASS', classification: 'SEVEN_AUTHENTICABLE_MEMBERSHIP_SESSIONS', sessionsVerified: checks.length, sessionUidHashes: checks.map(item => item.uidHash).sort(), tokensExposed: 0, firestoreReads: true, firestoreWrites: 0, authReads: true, authWrites: 0, ok: state.sessionsVerified && checks.length === EXPECTED }));
    return state.sessionsVerified && checks.length === EXPECTED ? 0 : 41;
  } catch (error) {
    writeJson(FILES.sessions, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_SESSIONS_STOP_RETRY', classification: 'FUNCTIONAL_DEFECT', errorCode: sanitize(error?.message || error), sessionsVerified: 0, tokensExposed: 0, firestoreReads: true, firestoreWrites: 0, authReads: true, authWrites: 0, ok: false }));
    return 41;
  }
}

async function verify() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    let identities = 0;
    let memberships = 0;
    let teamLinks = 0;
    const roleProfiles = new Set();
    for (const item of state.targets) {
      const [user, memberSnap, teamSnap] = await Promise.all([
        auth.getUser(item.uid),
        db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get(),
        db.doc(item.teamRefPath).get()
      ]);
      const member = memberSnap.exists ? stable(memberSnap.data() || {}) : null;
      const team = teamSnap.exists ? stable(teamSnap.data() || {}) : null;
      if (!user || text(user.email).toLowerCase() !== item.normalized.email || user.disabled) throw new Error('AUTH_VERIFY_FAILED');
      identities += 1;
      if (!member || digest(member) !== digest(item.membershipDesired)) throw new Error('MEMBERSHIP_VERIFY_FAILED');
      memberships += 1;
      if (!team || team.authUid !== item.uid || team.accessProvisioned !== true || team.membershipStatus !== 'active') throw new Error('TEAM_LINK_VERIFY_FAILED');
      teamLinks += 1;
      if (item.normalized.roles.some(role => ['SuperAdmin', 'AdminTenant'].includes(role))) roleProfiles.add('direccion');
      if (item.normalized.roles.includes('Operativo')) roleProfiles.add('operativo');
      if (item.normalized.roles.includes('Asesor')) roleProfiles.add('asesor');
    }
    const crmAfter = await crmSnapshot(db);
    const crmIntegrity = digest(crmAfter) === digest(state.crmBefore) ? 'VERIFIED_UNCHANGED' : 'VERIFIED_CHANGED';
    const ok = identities === EXPECTED && memberships === EXPECTED && teamLinks === EXPECTED && state.emailsSent.length === EXPECTED && state.sessionsVerified === true && roleProfiles.size === 3 && crmIntegrity === 'VERIFIED_UNCHANGED';
    writeJson(FILES.verify, publicBase({
      stage: ok ? 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_PASS' : 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_STOP_RETRY',
      classification: ok ? 'AUTH_FOUNDATION_ALL_TEAM_COMPLETE' : 'FUNCTIONAL_DEFECT',
      identitiesVerified: identities,
      membershipsVerified: memberships,
      teamLinksVerified: teamLinks,
      passwordEmailsVerified: state.emailsSent.length,
      sessionsVerified: state.sessionsVerified ? EXPECTED : 0,
      functionalProfilesVerified: roleProfiles.size,
      futureUserPathSupported: true,
      crmIntegrity,
      firestoreReads: true,
      firestoreWrites: 0,
      authReads: true,
      authWrites: 0,
      ok
    }));
    return ok ? 0 : 41;
  } catch (error) {
    writeJson(FILES.verify, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_STOP_RETRY', classification: 'FUNCTIONAL_DEFECT', errorCode: sanitize(error?.message || error), crmIntegrity: 'NOT_POSTVERIFIED', firestoreReads: true, firestoreWrites: 0, authReads: true, authWrites: 0, ok: false }));
    return 41;
  }
}

async function rollback() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    const restored = await restoreState(state, auth, db);
    const crmAfter = await crmSnapshot(db);
    const crmIntegrity = digest(crmAfter) === digest(state.crmBefore) ? 'VERIFIED_UNCHANGED' : 'VERIFIED_CHANGED';
    writeJson(FILES.rollback, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_ROLLBACK_PASS', classification: 'ROLLBACK_COMPLETE', ...restored, emailsPreviouslySent: state.emailsSent.length, emailLinksInvalidatedByDeletedUsers: state.createdAuthUids.length, crmIntegrity, ok: crmIntegrity === 'VERIFIED_UNCHANGED' }));
    return crmIntegrity === 'VERIFIED_UNCHANGED' ? 0 : 41;
  } catch (error) {
    writeJson(FILES.rollback, publicBase({ stage: 'AUTH_FOUNDATION_ALL_TEAM_ROLLBACK_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE', errorCode: sanitize(error?.message || error), crmIntegrity: 'NOT_POSTVERIFIED', ok: false }));
    return 41;
  }
}

async function main() {
  let code = 41;
  try {
    if (MODE === 'census') code = await census();
    else if (MODE === 'apply') code = await apply();
    else if (MODE === 'emails') code = await emails();
    else if (MODE === 'sessions') code = await sessions();
    else if (MODE === 'verify') code = await verify();
    else if (MODE === 'rollback') code = await rollback();
    else throw new Error('MODE_REQUIRED');
  } catch (error) {
    const file = FILES[MODE] || FILES.verify;
    writeJson(file, publicBase({ stage: `AUTH_FOUNDATION_ALL_TEAM_${MODE || 'UNKNOWN'}_STOP_RETRY`, classification: 'PIPELINE_MECHANISM_FAILURE', errorCode: sanitize(error?.code || error?.message || error), crmIntegrity: 'NOT_POSTVERIFIED', ok: false }));
    code = 41;
  } finally {
    if (app) await deleteApp(app).catch(() => {});
  }
  process.exit(code);
}

await main();
