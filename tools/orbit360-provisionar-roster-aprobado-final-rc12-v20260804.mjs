#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE_DIR = process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716';
const PRIVATE_STATE = process.env.ORBIT360_APPROVED_ROSTER_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'rc12-approved-roster-private-state.json');
const PRIVATE_IDENTITIES = process.env.ORBIT360_RC12_PRIVATE_IDENTITIES || path.join(process.env.RUNNER_TEMP || ROOT, 'rc12-approved-roster-identities.json');
const MANIFEST_FILE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json');
const APPROVED_SOURCE_COMMIT = '34fa84a60ebc38b0035ed664da87ca78aaa73ff7';
const APPROVED_SOURCE_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const FILES = Object.freeze({
  census: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-census.json'),
  apply: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-apply.json'),
  verify: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-verify.json'),
  rollback: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-rollback.json')
});
const PROFILES = Object.freeze({ direction: 'direccion', operations: 'operativo', advisor: 'asesor' });
const PROFILE_KEYS = Object.keys(PROFILES);
const CONTRACT_FIELDS = Object.freeze([
  'uid','tenantId','status','roles','defaultRole','activeRole','advisorId','teamId','countries',
  'dataScopes','modulesExtra','modulesRestricted','onboardingVersion'
]);
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const clean = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = value => clean(value).split(/\s+/).filter(token => token.length >= 3);
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
const now = () => new Date().toISOString();
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const providerIds = user => unique((user?.providerData || []).map(item => item?.providerId));
const isTechnicalUser = user => sha(String(user?.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(user?.uid || '') === TECHNICAL_DIGESTS.uid;
const validNormalUser = user => Boolean(user?.uid && user?.email && !user?.disabled && providerIds(user).length > 0 && !isTechnicalUser(user));
const userNotFound = error => ['auth/user-not-found','auth/email-not-found'].includes(String(error?.code || ''));
const sanitizeError = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 700);

let app;
function admin() {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return { auth: getAuth(app), db: getFirestore(app) };
}
function writePrivate(payload) {
  fs.writeFileSync(PRIVATE_STATE, JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 });
}
function readPrivate() {
  return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8'));
}
function readApprovedRosterSource() {
  const raw = execFileSync('git', ['show', `${APPROVED_SOURCE_COMMIT}:${APPROVED_SOURCE_PATH}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const parsed = JSON.parse(raw);
  if (!parsed?.approvedRoster) throw new Error('APPROVED_ROSTER_SOURCE_LOCK_MISSING');
  return parsed.approvedRoster;
}
function writeIdentities(payload) {
  fs.writeFileSync(PRIVATE_IDENTITIES, JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 });
}
function writeEvidence(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    ...payload,
    projectId: PROJECT,
    tenantId: TENANT,
    containsPII: false,
    containsSecrets: false,
    containsRawUid: false,
    containsRawEmail: false,
    temporaryCredentialsExposed: false,
    temporaryCredentialsSent: false,
    passwordReads: 0,
    existingUserUpdates: 0,
    emailChanges: 0,
    providerChanges: 0,
    technicalIdentityChanges: 0,
    reimportExecuted: false,
    rulesApplied: false,
    functionsDeployed: false,
    mainTouched: false,
    mergeExecuted: false,
    gate711Executed: false
  }, null, 2) + '\n', 'utf8');
}
function advisorShape(data, id, collection) {
  const email = text(data?.email || data?.correo || data?.userEmail).toLowerCase();
  const name = text(data?.name || data?.nombre || data?.displayName || data?.nombreCompleto);
  return {
    collection,
    id,
    email,
    emailSha256: email ? sha(email) : '',
    name,
    nameTokens: tokens(name),
    advisorId: text(data?.advisorId || data?.asesorId || data?.id || id) || id,
    teamId: text(data?.teamId || data?.equipoId),
    countries: unique(data?.countries || data?.paises || []).map(value => text(value).toUpperCase())
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
async function readAdvisors(db) {
  const rows = [];
  for (const collection of ['asesores', 'advisors']) {
    const snapshot = await db.collection('tenantId').doc(TENANT).collection(collection).get();
    for (const doc of snapshot.docs) rows.push(advisorShape(doc.data() || {}, doc.id, collection));
  }
  return rows;
}
function resolveAdvisor(contract, advisors) {
  const digestMatches = advisors.filter(row => row.emailSha256 && row.emailSha256 === contract.emailSha256);
  if (digestMatches.length === 1) return { status: 'resolved', source: 'email_digest', advisor: digestMatches[0] };
  if (digestMatches.length > 1) return { status: 'ambiguous', source: 'email_digest', candidates: digestMatches.length };
  const requiredTokens = tokens(contract.personRef || '');
  const nameMatches = advisors.filter(row => requiredTokens.length > 0 && requiredTokens.every(token => row.nameTokens.includes(token)));
  if (nameMatches.length !== 1) return { status: nameMatches.length ? 'ambiguous' : 'missing', source: 'canonical_name', candidates: nameMatches.length };
  return { status: 'resolved', source: 'canonical_name', advisor: nameMatches[0] };
}
function resolveAuth(contract, approvedEmail, users) {
  const email = String(approvedEmail || '').trim().toLowerCase();
  if (!email || sha(email) !== contract.emailSha256) return { status: 'approved_source_digest_mismatch', candidates: 0, user: null };
  const matches = users.filter(user => sha(String(user?.email || '').toLowerCase()) === contract.emailSha256);
  if (!matches.length) return { status: 'missing', candidates: 0, user: null };
  if (matches.length !== 1) return { status: 'ambiguous', candidates: matches.length, user: null };
  const user = matches[0];
  if (String(user.email || '').toLowerCase() !== email) return { status: 'email_value_mismatch', candidates: 1, user: null };
  if (!validNormalUser(user)) return { status: 'existing_invalid', candidates: 1, user };
  return { status: 'existing_valid', candidates: 1, user };
}
function desiredMembership(profile, item, fallback, runStamp) {
  const common = {
    uid: item.uid,
    tenantId: TENANT,
    status: 'active',
    advisorId: item.advisor.advisorId,
    teamId: item.advisor.teamId || text(fallback?.teamId),
    countries: item.advisor.countries.length ? item.advisor.countries : unique(fallback?.countries || fallback?.paises || []).map(value => text(value).toUpperCase()),
    modulesExtra: [],
    modulesRestricted: [],
    onboardingVersion: 'rc12-approved-roster-final-v1',
    onboardingRunId: text(process.env.GITHUB_RUN_ID),
    createdAt: runStamp,
    updatedAt: runStamp
  };
  if (profile === 'direction') return {
    ...common,
    roles: ['SuperAdmin', 'AdminTenant', 'Asesor', 'Operativo'],
    defaultRole: 'SuperAdmin',
    activeRole: 'SuperAdmin',
    dataScopes: { clientes: 'todos', polizas: 'todos', cobros: 'todos', gestiones: 'todos', leads: 'todos' }
  };
  if (profile === 'operations') return {
    ...common,
    roles: ['Operativo', 'Asesor'],
    defaultRole: 'Operativo',
    activeRole: 'Operativo',
    dataScopes: { clientes: 'todos', polizas: 'todos', cobros: 'todos', gestiones: 'todos', leads: 'todos' }
  };
  return {
    ...common,
    roles: ['Asesor', 'Operativo'],
    defaultRole: 'Asesor',
    activeRole: 'Asesor',
    dataScopes: { clientes: 'propios', polizas: 'propios', cobros: 'ninguno', gestiones: 'propios', leads: 'propios' }
  };
}
function contractView(value) {
  return Object.fromEntries(CONTRACT_FIELDS.map(field => [field, stable(value?.[field])]));
}
function publicProfile(item) {
  return {
    personRef: item.personRef,
    approvedEmailSha256: item.emailSha256,
    advisorStatus: item.advisorStatus,
    advisorSource: item.advisorSource,
    advisorIdBound: Boolean(item.advisor?.advisorId),
    advisorIdSha256: item.advisor?.advisorId ? sha(item.advisor.advisorId) : '',
    authStatus: item.authStatus,
    authCandidateCount: item.authCandidateCount,
    existingUserValid: item.user ? validNormalUser(item.user) : false,
    providerIds: item.user ? providerIds(item.user).sort() : [],
    plannedUserCreate: item.authStatus === 'missing'
  };
}
async function resolveRoster() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const approvedSource = readApprovedRosterSource();
  const { auth, db } = admin();
  const [users, advisors, memberships] = await Promise.all([
    listAllUsers(auth),
    readAdvisors(db),
    db.collection('tenants').doc(TENANT).collection('members').get()
  ]);
  const technicalDoc = memberships.docs.find(doc => {
    const data = doc.data() || {};
    return sha(String(data.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(text(data.uid || doc.id)) === TECHNICAL_DIGESTS.uid;
  });
  const roster = {};
  for (const profile of PROFILE_KEYS) {
    const contract = manifest.approvedRoster?.[profile];
    if (!contract?.personRef || !/^[a-f0-9]{64}$/.test(contract?.emailSha256 || '')) throw new Error(`APPROVED_ROSTER_CONTRACT_INVALID_${profile.toUpperCase()}`);
    const sourceContract = approvedSource?.[profile];
    const approvedEmail = String(sourceContract?.email || '').trim().toLowerCase();
    const sourcePerson = String(sourceContract?.person || '').trim();
    if (!approvedEmail || sha(approvedEmail) !== contract.emailSha256 || clean(sourcePerson) !== clean(contract.personRef)) throw new Error(`APPROVED_ROSTER_SOURCE_LOCK_INVALID_${profile.toUpperCase()}`);
    const advisorResult = resolveAdvisor(contract, advisors);
    const authResult = advisorResult.status === 'resolved'
      ? resolveAuth(contract, approvedEmail, users)
      : { status: 'not_evaluated', candidates: 0, user: null };
    roster[profile] = {
      profile,
      runtimeProfile: PROFILES[profile],
      personRef: contract.personRef,
      emailSha256: contract.emailSha256,
      approvedEmail,
      advisorStatus: advisorResult.status,
      advisorSource: advisorResult.source,
      advisor: advisorResult.advisor || null,
      authStatus: authResult.status,
      authCandidateCount: authResult.candidates || 0,
      user: authResult.user || null
    };
  }
  return { manifest, auth, db, users, advisors, memberships, technicalMembership: technicalDoc?.data() || {}, roster };
}
async function census() {
  const resolved = await resolveRoster();
  const blockerProfiles = PROFILE_KEYS.filter(profile => {
    const item = resolved.roster[profile];
    return item.advisorStatus !== 'resolved' || !['missing', 'existing_valid'].includes(item.authStatus);
  });
  const ready = blockerProfiles.length === 0;
  const runStamp = now();
  if (ready) {
    writePrivate({
      schemaVersion: 'orbit360-approved-roster-private-state-v1',
      generatedAt: runStamp,
      projectId: PROJECT,
      tenantId: TENANT,
      createdAuthUids: [],
      createdMembershipProfiles: [],
      membershipBefore: {},
      technicalMembership: stable(resolved.technicalMembership || {}),
      roster: Object.fromEntries(PROFILE_KEYS.map(profile => {
        const item = resolved.roster[profile];
        return [profile, {
          profile,
          runtimeProfile: item.runtimeProfile,
          personRef: item.personRef,
          email: item.approvedEmail,
          emailSha256: item.emailSha256,
          displayName: item.advisor.name,
          advisor: stable(item.advisor),
          authStatus: item.authStatus,
          existingUid: item.user?.uid || '',
          uid: item.user?.uid || ''
        }];
      }))
    });
  }
  const result = {
    schemaVersion: 'orbit360-approved-roster-census-v1',
    generatedAt: runStamp,
    decision: ready ? 'APPROVED_ROSTER_READY_FOR_PROVISIONING' : 'APPROVED_ROSTER_RECONCILIATION_NO_GO_NO_WRITE',
    classification: ready ? 'GO_APPROVED_ROSTER_PROVISIONING' : 'DATA_CONTRACT_FAILURE',
    counts: {
      authUsers: resolved.users.length,
      advisorRecords: resolved.advisors.length,
      memberships: resolved.memberships.size,
      plannedAuthCreates: PROFILE_KEYS.filter(profile => resolved.roster[profile].authStatus === 'missing').length,
      plannedMembershipTargets: 3
    },
    profiles: Object.fromEntries(PROFILE_KEYS.map(profile => [profile, publicProfile(resolved.roster[profile])])),
    blockerProfiles,
    firestoreRead: true,
    firestoreWrites: 0,
    authRead: true,
    authWrites: 0,
    userCreates: 0,
    passwordWrites: 0,
    productionTouched: false,
    ok: ready
  };
  writeEvidence(FILES.census, result);
  console.log(JSON.stringify(result, null, 2));
  return ready ? 0 : 41;
}
async function deleteCreatedUsers(auth, state) {
  let deleted = 0;
  for (const uid of [...(state.createdAuthUids || [])].reverse()) {
    try {
      const user = await auth.getUser(uid);
      const profile = PROFILE_KEYS.find(key => state.roster?.[key]?.uid === uid);
      const expectedDigest = profile ? state.roster[profile].emailSha256 : '';
      if (expectedDigest && sha(String(user.email || '').toLowerCase()) === expectedDigest && !isTechnicalUser(user)) {
        await auth.deleteUser(uid);
        deleted += 1;
      }
    } catch (error) {
      if (!userNotFound(error)) throw error;
    }
  }
  return deleted;
}
async function deleteCreatedMemberships(db, state) {
  let deleted = 0;
  await db.runTransaction(async tx => {
    for (const profile of state.createdMembershipProfiles || []) {
      const item = state.roster?.[profile];
      if (!item?.uid) continue;
      const ref = db.collection('tenants').doc(TENANT).collection('members').doc(item.uid);
      const snap = await tx.get(ref);
      if (!snap.exists) continue;
      const data = snap.data() || {};
      if (data.onboardingVersion !== 'rc12-approved-roster-final-v1' || text(data.onboardingRunId) !== text(process.env.GITHUB_RUN_ID)) {
        throw new Error(`ROLLBACK_MEMBERSHIP_OWNERSHIP_MISMATCH_${profile.toUpperCase()}`);
      }
      tx.delete(ref);
      deleted += 1;
    }
  });
  return deleted;
}
async function apply() {
  const state = readPrivate();
  const { auth, db } = admin();
  let userCreates = 0;
  let membershipWrites = 0;
  try {
    for (const profile of PROFILE_KEYS) {
      const item = state.roster[profile];
      if (item.uid) {
        const user = await auth.getUser(item.uid);
        if (!validNormalUser(user) || sha(String(user.email || '').toLowerCase()) !== item.emailSha256) throw new Error(`EXISTING_AUTH_USER_CHANGED_${profile.toUpperCase()}`);
        continue;
      }
      let raceUser = null;
      try { raceUser = await auth.getUserByEmail(item.email); }
      catch (error) { if (!userNotFound(error)) throw error; }
      if (raceUser) {
        if (!validNormalUser(raceUser) || sha(String(raceUser.email || '').toLowerCase()) !== item.emailSha256) throw new Error(`AUTH_USER_RACE_INVALID_${profile.toUpperCase()}`);
        item.uid = raceUser.uid;
        item.authStatus = 'existing_valid_race';
        writePrivate(state);
        continue;
      }
      const temporaryPassword = `${crypto.randomBytes(30).toString('base64url')}aA1!`;
      const user = await auth.createUser({
        email: item.email,
        displayName: item.displayName || undefined,
        password: temporaryPassword,
        emailVerified: false,
        disabled: false
      });
      item.uid = user.uid;
      item.authStatus = 'created_by_run';
      state.createdAuthUids.push(user.uid);
      userCreates += 1;
      writePrivate(state);
    }
    const uids = PROFILE_KEYS.map(profile => state.roster[profile].uid);
    if (new Set(uids).size !== 3) throw new Error('APPROVED_ROSTER_UIDS_NOT_DISTINCT');
    for (const profile of PROFILE_KEYS) {
      state.roster[profile].membership = desiredMembership(profile, state.roster[profile], state.technicalMembership, state.generatedAt);
    }
    const refs = Object.fromEntries(PROFILE_KEYS.map(profile => [profile, db.collection('tenants').doc(TENANT).collection('members').doc(state.roster[profile].uid)]));
    await db.runTransaction(async tx => {
      for (const profile of PROFILE_KEYS) {
        const snap = await tx.get(refs[profile]);
        state.membershipBefore[profile] = { exists: snap.exists, data: snap.exists ? stable(snap.data()) : null };
        if (snap.exists && digest(contractView(snap.data())) !== digest(contractView(state.roster[profile].membership))) {
          throw new Error(`MEMBERSHIP_EXISTS_DIFFERENT_${profile.toUpperCase()}`);
        }
      }
      for (const profile of PROFILE_KEYS) {
        if (!state.membershipBefore[profile].exists) {
          tx.create(refs[profile], state.roster[profile].membership);
          state.createdMembershipProfiles.push(profile);
          membershipWrites += 1;
        }
      }
    });
    writePrivate(state);
    const result = {
      schemaVersion: 'orbit360-approved-roster-apply-v1',
      generatedAt: now(),
      decision: 'APPROVED_ROSTER_AUTH_AND_MEMBERSHIPS_APPLIED',
      classification: 'CONTROLLED_WRITE_APPLIED',
      userCreates,
      userCreateUidDigests: state.createdAuthUids.map(sha).sort(),
      existingUserUpdates: 0,
      passwordWrites: userCreates,
      membershipWrites,
      membershipCreates: membershipWrites,
      finalDistinctUsers: 3,
      atomicMembershipTransaction: true,
      idempotentExistingMembershipValidation: true,
      rollbackStatePersisted: true,
      firestoreRead: true,
      firestoreWrites: membershipWrites,
      authRead: true,
      authWrites: userCreates,
      productionTouched: false,
      ok: userCreates <= 3 && membershipWrites <= 3
    };
    writeEvidence(FILES.apply, result);
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 41;
  } catch (error) {
    let membershipRollbackDeletes = 0;
    let authRollbackDeletes = 0;
    try { membershipRollbackDeletes = await deleteCreatedMemberships(db, state); } catch (_) {}
    try { authRollbackDeletes = await deleteCreatedUsers(auth, state); } catch (_) {}
    const result = {
      schemaVersion: 'orbit360-approved-roster-apply-v1',
      generatedAt: now(),
      decision: 'APPROVED_ROSTER_APPLY_FAILED_PARTIAL_WRITES_ROLLED_BACK',
      classification: 'DATA_CONTRACT_FAILURE',
      errorCode: sanitizeError(error),
      userCreatesAttempted: state.createdAuthUids.length,
      membershipCreatesAttempted: state.createdMembershipProfiles.length,
      membershipRollbackDeletes,
      authRollbackDeletes,
      firestoreRead: true,
      firestoreWrites: state.createdMembershipProfiles.length + membershipRollbackDeletes,
      authRead: true,
      authWrites: state.createdAuthUids.length + authRollbackDeletes,
      passwordWrites: state.createdAuthUids.length,
      productionTouched: false,
      ok: false
    };
    writeEvidence(FILES.apply, result);
    console.error(JSON.stringify(result, null, 2));
    return 41;
  }
}
async function verify() {
  const state = readPrivate();
  const { auth, db } = admin();
  const profiles = {};
  const privateIdentities = {};
  let ok = true;
  for (const profile of PROFILE_KEYS) {
    const item = state.roster[profile];
    try {
      const [user, snap] = await Promise.all([
        auth.getUser(item.uid),
        db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get()
      ]);
      const membership = snap.exists ? stable(snap.data()) : null;
      const checks = {
        authExists: Boolean(user?.uid),
        authNormal: validNormalUser(user),
        emailDigestMatch: sha(String(user?.email || '').toLowerCase()) === item.emailSha256,
        passwordProvider: providerIds(user).includes('password'),
        membershipExists: snap.exists,
        membershipContractMatch: digest(contractView(membership)) === digest(contractView(item.membership)),
        documentIdEqualsUid: snap.id === user.uid,
        advisorIdCanonical: text(membership?.advisorId) === text(item.advisor.advisorId)
      };
      const profileOk = Object.values(checks).every(Boolean);
      profiles[profile] = {
        runtimeProfile: item.runtimeProfile,
        uidSha256: sha(user.uid),
        emailSha256: item.emailSha256,
        advisorIdSha256: sha(item.advisor.advisorId),
        providerIds: providerIds(user).sort(),
        checks,
        ok: profileOk
      };
      privateIdentities[item.runtimeProfile] = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        membership
      };
      ok = ok && profileOk;
    } catch (error) {
      profiles[profile] = { runtimeProfile: item.runtimeProfile, errorCode: sanitizeError(error), ok: false };
      ok = false;
    }
  }
  if (ok && new Set(Object.values(privateIdentities).map(item => item.uid)).size === 3) writeIdentities(privateIdentities);
  else ok = false;
  const result = {
    schemaVersion: 'orbit360-approved-roster-verify-v1',
    generatedAt: now(),
    decision: ok ? 'THREE_APPROVED_NORMAL_IDENTITIES_AND_MEMBERSHIPS_PASS' : 'THREE_APPROVED_NORMAL_IDENTITIES_AND_MEMBERSHIPS_FAIL',
    classification: ok ? 'GO_THREE_NORMAL_MEMBERSHIPS' : 'DATA_CONTRACT_FAILURE',
    profiles,
    finalProfiles: Object.keys(privateIdentities).length,
    distinctUsers: new Set(Object.values(privateIdentities).map(item => item.uid)).size,
    firestoreRead: true,
    firestoreWrites: 0,
    authRead: true,
    authWrites: 0,
    userCreates: 0,
    passwordWrites: 0,
    productionTouched: false,
    ok
  };
  writeEvidence(FILES.verify, result);
  console.log(JSON.stringify(result, null, 2));
  return ok ? 0 : 41;
}
async function rollback() {
  const state = readPrivate();
  const { auth, db } = admin();
  let membershipDeletes = 0;
  let authDeletes = 0;
  let rollbackError = '';
  try {
    membershipDeletes = await deleteCreatedMemberships(db, state);
    authDeletes = await deleteCreatedUsers(auth, state);
  } catch (error) {
    rollbackError = sanitizeError(error);
  }
  let remainingCreatedMemberships = 0;
  let remainingCreatedUsers = 0;
  for (const profile of state.createdMembershipProfiles || []) {
    const item = state.roster?.[profile];
    if (!item?.uid) continue;
    const snap = await db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get();
    if (snap.exists) remainingCreatedMemberships += 1;
  }
  for (const uid of state.createdAuthUids || []) {
    try { await auth.getUser(uid); remainingCreatedUsers += 1; }
    catch (error) { if (!userNotFound(error)) throw error; }
  }
  const ok = !rollbackError && remainingCreatedMemberships === 0 && remainingCreatedUsers === 0;
  const result = {
    schemaVersion: 'orbit360-approved-roster-rollback-v1',
    generatedAt: now(),
    decision: ok ? 'APPROVED_ROSTER_ROLLBACK_COMPLETE' : 'APPROVED_ROSTER_ROLLBACK_ESCALATE',
    classification: ok ? 'ROLLBACK_PASS' : 'ENVIRONMENT_FAILURE',
    membershipDeletes,
    authDeletes,
    remainingCreatedMemberships,
    remainingCreatedUsers,
    rollbackError,
    firestoreRead: true,
    firestoreWrites: membershipDeletes,
    authRead: true,
    authWrites: authDeletes,
    userCreates: 0,
    passwordWrites: 0,
    productionTouched: false,
    ok
  };
  writeEvidence(FILES.rollback, result);
  console.log(JSON.stringify(result, null, 2));
  return ok ? 0 : 42;
}

let exitCode = 42;
try {
  if (!['census', 'apply', 'verify', 'rollback'].includes(MODE)) throw new Error('MODE_INVALID');
  if (MODE === 'census') exitCode = await census();
  if (MODE === 'apply') exitCode = await apply();
  if (MODE === 'verify') exitCode = await verify();
  if (MODE === 'rollback') exitCode = await rollback();
} catch (error) {
  const result = {
    schemaVersion: 'orbit360-approved-roster-error-v1',
    generatedAt: now(),
    mode: MODE,
    decision: 'APPROVED_ROSTER_PIPELINE_ERROR',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: sanitizeError(error),
    firestoreWrites: 0,
    authWrites: 0,
    userCreates: 0,
    passwordWrites: 0,
    productionTouched: false,
    ok: false
  };
  writeEvidence(FILES[MODE] || FILES.census, result);
  console.error(JSON.stringify(result, null, 2));
  exitCode = 42;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
process.exit(exitCode);
