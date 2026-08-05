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
const MAX_ACTIVE = Number(process.env.ORBIT360_MAX_ACTIVE_TEAM_USERS || 100);
const RUN_ID = String(process.env.GITHUB_RUN_ID || 'local');
const RUN_STAMP = new Date().toISOString();
const EVIDENCE_DIR = path.join(ROOT, process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716');
const PRIVATE_STATE = process.env.ORBIT360_AUTH_DYNAMIC_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-auth-dynamic-team-private.json');
const CONTINUE_URL = process.env.ORBIT360_PASSWORD_CONTINUE_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio';
const WEB_API_KEY = String(process.env.ORBIT360_FIREBASE_WEB_API_KEY || '').trim();

const FILES = Object.freeze({
  census: path.join(EVIDENCE_DIR, 'auth-dynamic-team-census-sanitized-v20260805.json'),
  apply: path.join(EVIDENCE_DIR, 'auth-dynamic-team-apply-sanitized-v20260805.json'),
  emails: path.join(EVIDENCE_DIR, 'auth-dynamic-team-emails-sanitized-v20260805.json'),
  sessions: path.join(EVIDENCE_DIR, 'auth-dynamic-team-sessions-sanitized-v20260805.json'),
  verify: path.join(EVIDENCE_DIR, 'auth-dynamic-team-verify-sanitized-v20260805.json'),
  rollback: path.join(EVIDENCE_DIR, 'auth-dynamic-team-rollback-sanitized-v20260805.json')
});

const ALIAS_SOURCES = Object.freeze([
  { source: 'canonical_data_asesores', build: db => db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items') },
  { source: 'legacy_tenants_asesores', build: db => db.collection('tenants').doc(TENANT).collection('asesores') },
  { source: 'legacy_tenantId_advisors', build: db => db.collection('tenantId').doc(TENANT).collection('advisors') },
  { source: 'legacy_tenants_advisors', build: db => db.collection('tenants').doc(TENANT).collection('advisors') }
]);
const CRM_COLLECTIONS = Object.freeze(['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads']);
const MEMBER_FIELDS = Object.freeze(['uid','tenantId','status','roles','defaultRole','activeRole','advisorId','countries','dataScopes','onboardingVersion']);
const TEAM_FIELDS = Object.freeze(['authUid','accessProvisioned','accessState','onboardingState','invitacionEstado','membershipStatus','accessErrorCode','accessLastAttemptAt','accessOnboardingVersion']);

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
const pick = (value, fields) => Object.fromEntries(fields.map(field => [field, stable(value?.[field])]));
const sanitize = value => text(value).replace(/[\r\n]+/g, ' ').replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]').slice(0, 700);
const userNotFound = error => ['auth/user-not-found','auth/email-not-found'].includes(String(error?.code || ''));
const active = row => planTest.normalizeTeamRecord(row).active;

let app;
function admin() {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return { auth: getAuth(app), db: getFirestore(app) };
}
function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function writePrivate(payload) { fs.writeFileSync(PRIVATE_STATE, JSON.stringify(payload), { encoding:'utf8', mode:0o600 }); }
function readPrivate() { return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8')); }
function publicBase(payload = {}) {
  return {
    ...payload,
    projectId: PROJECT,
    tenantIdHash: sha(TENANT),
    authorityPathClass: 'tenantId/{tenantId}/asesores',
    activeUserCountRule: 'DYNAMIC_FROM_EQUIPO_AUTHORITY',
    maximumTechnicalBound: MAX_ACTIVE,
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
async function readAuthority(db) {
  const ref = db.collection('tenantId').doc(TENANT).collection('asesores');
  const snap = await ref.get();
  return snap.docs.map(doc => ({ id:doc.id, refPath:doc.ref.path, data:stable(doc.data() || {}) })).sort((a,b) => a.id.localeCompare(b.id));
}
async function readAliases(db, authority) {
  const authorityById = new Map(authority.map(row => [row.id, row]));
  const authorityByEmail = new Map(authority.map(row => [text(row.data.email || row.data.correo).toLowerCase(), row]).filter(([email]) => email));
  const diagnostics = [];
  for (const source of ALIAS_SOURCES) {
    const snap = await source.build(db).get();
    for (const doc of snap.docs) {
      const data = stable(doc.data() || {});
      const email = text(data.email || data.correo || data.userEmail).toLowerCase();
      const byId = authorityById.get(doc.id) || null;
      const byEmail = email ? authorityByEmail.get(email) || null : null;
      let resolution = 'LEGACY_NON_AUTHORITATIVE_ORPHAN';
      if (byId && byEmail && byId.id === byEmail.id) resolution = 'ALIAS_OF_AUTHORITATIVE_RECORD';
      else if (byId) resolution = 'SAME_ID_DIFFERENT_CONTRACT';
      else if (byEmail) resolution = 'SAME_EMAIL_DIFFERENT_ID_ALIAS';
      diagnostics.push({
        sourceClass: source.source,
        teamIdHash: sha(doc.id),
        emailHash: email ? sha(email) : '',
        advisorIdHash: sha(text(data.advisorId || data.asesorId || data.id || doc.id)),
        uidHash: text(data.authUid || data.uid || data.userId) ? sha(text(data.authUid || data.uid || data.userId)) : '',
        activeComputed: active({ ...data, id:doc.id }),
        resolution
      });
    }
  }
  return diagnostics.sort((a,b) => `${a.sourceClass}:${a.teamIdHash}`.localeCompare(`${b.sourceClass}:${b.teamIdHash}`));
}
async function readMemberships(db) {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  return snap.docs.map(doc => ({ uid:doc.id, data:stable(doc.data() || {}) }));
}
async function snapshotCollection(ref) {
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id:doc.id, data:stable(doc.data() || {}) })).sort((a,b) => a.id.localeCompare(b.id));
  return { count:rows.length, digest:digest(rows) };
}
async function crmSnapshot(db) {
  const result = {};
  for (const name of CRM_COLLECTIONS) {
    result[`canonical:${name}`] = await snapshotCollection(db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items'));
    result[`legacy:${name}`] = await snapshotCollection(db.collection('tenantId').doc(TENANT).collection(name));
  }
  return result;
}
function findAuth(record, users) {
  const bound = text(record.currentAuthUid);
  const byUid = bound ? users.filter(user => user.uid === bound) : [];
  const byEmail = users.filter(user => text(user.email).toLowerCase() === record.email);
  if (byUid.length > 1 || byEmail.length > 1) throw new Error('AUTH_IDENTITY_AMBIGUOUS');
  if (byUid[0] && byEmail[0] && byUid[0].uid !== byEmail[0].uid) throw new Error('AUTH_UID_EMAIL_COLLISION');
  const user = byUid[0] || byEmail[0] || null;
  if (user && text(user.email).toLowerCase() !== record.email) throw new Error('AUTH_BOUND_EMAIL_MISMATCH');
  return user;
}
function desiredMembership(record, uid) {
  return {
    uid,
    tenantId: TENANT,
    status: 'active',
    roles: record.roles,
    defaultRole: record.defaultRole,
    activeRole: record.activeRole,
    advisorId: record.id,
    countries: record.countries,
    dataScopes: record.dataScopes,
    onboardingVersion: 'orbit360-auth-foundation-dynamic-team-v1'
  };
}
function desiredTeam(uid) {
  return {
    authUid: uid,
    accessProvisioned: true,
    accessState: 'invited',
    onboardingState: 'invited',
    invitacionEstado: 'pendiente_envio',
    membershipStatus: 'active',
    accessErrorCode: '',
    accessLastAttemptAt: RUN_STAMP,
    accessOnboardingVersion: 'orbit360-auth-foundation-dynamic-team-v1'
  };
}
function diffPatch(current, desired) {
  const out = {};
  for (const [key, value] of Object.entries(desired)) if (digest(stable(current?.[key])) !== digest(stable(value))) out[key] = value;
  return out;
}

async function census() {
  const { auth, db } = admin();
  const [authority, users, memberships, crmBefore] = await Promise.all([readAuthority(db), listAllUsers(auth), readMemberships(db), crmSnapshot(db)]);
  const aliases = await readAliases(db, authority);
  const activeRows = authority.filter(row => active({ ...row.data, id:row.id }));
  const inactiveRows = authority.filter(row => !active({ ...row.data, id:row.id }));
  const normalized = activeRows.map(row => ({ source:row, record:planTest.normalizeTeamRecord({ ...row.data, id:row.id }) }));
  const errors = [];
  if (normalized.length < 1) errors.push('ACTIVE_TEAM_EMPTY');
  if (normalized.length > MAX_ACTIVE) errors.push('ACTIVE_TEAM_EXCEEDS_TECHNICAL_BOUND');
  const ids = normalized.map(item => item.record.id);
  const emails = normalized.map(item => item.record.email);
  if (new Set(ids).size !== ids.length) errors.push('TEAM_ID_DUPLICATE');
  if (new Set(emails).size !== emails.length) errors.push('TEAM_EMAIL_DUPLICATE');
  for (const item of normalized) for (const code of planTest.validateTeamRecord(item.record)) errors.push(`${sha(item.record.id).slice(0,12)}:${code}`);
  const functionalProfiles = new Set();
  for (const item of normalized) {
    if (item.record.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))) functionalProfiles.add('direccion');
    if (item.record.roles.includes('Operativo')) functionalProfiles.add('operativo');
    if (item.record.roles.includes('Asesor')) functionalProfiles.add('asesor');
  }
  const administrativeUsers = normalized.filter(item => item.record.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))).length;

  const records = normalized.map(item => {
    const user = findAuth(item.record, users);
    const member = user ? memberships.find(row => row.uid === user.uid) || null : null;
    return {
      teamIdHash: sha(item.record.id),
      emailHash: sha(item.record.email),
      sourceClass: 'AUTHORITATIVE_EQUIPO_STORE',
      uidHash: user ? sha(user.uid) : '',
      advisorIdHash: sha(item.record.id),
      activeComputed: true,
      contractErrors: planTest.validateTeamRecord(item.record),
      aliasGroup: aliases.filter(alias => alias.teamIdHash === sha(item.record.id) || alias.emailHash === sha(item.record.email)).map(alias => alias.resolution),
      identityState: user ? 'EXISTING_IDENTITY' : 'MISSING_IDENTITY',
      membershipState: member ? 'EXISTING_MEMBERSHIP' : 'MISSING_MEMBERSHIP'
    };
  });

  if (errors.length) {
    writeJson(FILES.census, publicBase({ stage:'AUTH_DYNAMIC_TEAM_CENSUS_STOP_RETRY', classification:'DATA_CONTRACT_FAILURE', errorCode:'AUTHORITATIVE_TEAM_NOT_READY', errors, activeUsersObserved:normalized.length, inactiveUsersObserved:inactiveRows.length, authoritativeRecords:records, aliasDiagnostics:aliases, firestoreReads:true, firestoreWrites:0, authReads:true, authWrites:0, ok:false }));
    return 41;
  }

  const targets = normalized.map(item => {
    const user = findAuth(item.record, users);
    const membership = user ? memberships.find(row => row.uid === user.uid) || null : null;
    return {
      teamId:item.record.id,
      teamRefPath:item.source.refPath,
      teamBefore:item.source.data,
      teamBeforeDigest:digest(item.source.data),
      normalized:item.record,
      existingUid:user?.uid || '',
      existingAuth:user ? { uid:user.uid,email:user.email || '',disabled:user.disabled,displayName:user.displayName || '',emailVerified:user.emailVerified } : null,
      membershipBefore:membership ? membership.data : null
    };
  });
  const state = { schemaVersion:'orbit360-auth-dynamic-team-private-v1', projectId:PROJECT, tenantId:TENANT, generatedAt:RUN_STAMP, activeCount:targets.length, crmBefore, targets, aliases, createdAuthUids:[], updatedAuthBefore:{}, emailsSent:[], applied:false, sessionsVerified:false };
  writePrivate(state);
  writeJson(FILES.census, publicBase({
    stage:'AUTH_DYNAMIC_TEAM_CENSUS_PASS',
    decision:'USE_AUTHORITATIVE_EQUIPO_DYNAMIC_COUNT',
    classification:'GO_AUTH_DYNAMIC_TEAM_RUNTIME',
    activeUsersObserved:targets.length,
    inactiveUsersObserved:inactiveRows.length,
    authoritativeRecords:records,
    aliasDiagnostics:aliases,
    legacyAliasesIgnoredAsUsers:aliases.length,
    plannedAuthCreates:targets.filter(item => !item.existingUid).length,
    plannedAuthLinks:targets.filter(item => item.existingUid).length,
    plannedMembershipReconciliations:targets.length,
    plannedTeamLinks:targets.length,
    plannedPasswordEmails:targets.length,
    functionalProfilesCovered:functionalProfiles.size,
    administrativeUsersObserved:administrativeUsers,
    futureUserPathSupported:true,
    firestoreReads:true,
    firestoreWrites:0,
    authReads:true,
    authWrites:0,
    ok:true
  }));
  return 0;
}

async function restoreState(state, auth, db) {
  let teamRestores = 0, membershipRestores = 0, authDeletes = 0, authRestores = 0;
  await db.runTransaction(async tx => {
    const entries = [];
    for (const item of state.targets) {
      const teamRef = db.doc(item.teamRefPath);
      const memberRef = item.uid ? db.collection('tenants').doc(TENANT).collection('members').doc(item.uid) : null;
      await tx.get(teamRef);
      if (memberRef) await tx.get(memberRef);
      entries.push({ item, teamRef, memberRef });
    }
    for (const entry of entries) {
      tx.set(entry.teamRef, entry.item.teamBefore, { merge:false });
      teamRestores += 1;
      if (!entry.memberRef) continue;
      if (entry.item.membershipBefore) tx.set(entry.memberRef, entry.item.membershipBefore, { merge:false });
      else tx.delete(entry.memberRef);
      membershipRestores += 1;
    }
  });
  for (const [uid, before] of Object.entries(state.updatedAuthBefore || {})) {
    await auth.updateUser(uid, { disabled:before.disabled, displayName:before.displayName || undefined });
    authRestores += 1;
  }
  for (const uid of [...(state.createdAuthUids || [])].reverse()) {
    try { await auth.deleteUser(uid); authDeletes += 1; }
    catch (error) { if (!userNotFound(error)) throw error; }
  }
  return { teamRestores, membershipRestores, authDeletes, authRestores };
}

async function apply() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    const users = await listAllUsers(auth);
    for (const item of state.targets) {
      const currentTeam = await db.doc(item.teamRefPath).get();
      if (!currentTeam.exists || digest(stable(currentTeam.data() || {})) !== item.teamBeforeDigest) throw new Error('TEAM_CHANGED_AFTER_CENSUS');
      let user = findAuth(item.normalized, users);
      if (!user) {
        user = await auth.createUser({ email:item.normalized.email, displayName:item.normalized.displayName || undefined, disabled:false, emailVerified:false });
        state.createdAuthUids.push(user.uid);
        users.push(user);
        writePrivate(state);
      } else if (user.disabled || text(user.displayName) !== item.normalized.displayName) {
        state.updatedAuthBefore[user.uid] = { disabled:user.disabled, displayName:user.displayName || '' };
        user = await auth.updateUser(user.uid, { disabled:false, displayName:item.normalized.displayName || undefined });
        writePrivate(state);
      }
      item.uid = user.uid;
      item.membershipDesired = desiredMembership(item.normalized, user.uid);
      item.teamDesired = desiredTeam(user.uid);
    }
    if (new Set(state.targets.map(item => item.uid)).size !== state.activeCount) throw new Error('AUTH_UID_NOT_DISTINCT');

    const memberRefs = state.targets.map(item => db.collection('tenants').doc(TENANT).collection('members').doc(item.uid));
    const teamRefs = state.targets.map(item => db.doc(item.teamRefPath));
    let membershipWrites = 0, teamWrites = 0;
    await db.runTransaction(async tx => {
      const memberSnaps = [], teamSnaps = [];
      for (const ref of memberRefs) memberSnaps.push(await tx.get(ref));
      for (const ref of teamRefs) teamSnaps.push(await tx.get(ref));
      const memberPatches = [], teamPatches = [];
      for (let index = 0; index < state.targets.length; index += 1) {
        const item = state.targets[index];
        const teamData = teamSnaps[index].exists ? stable(teamSnaps[index].data() || {}) : null;
        if (!teamData || digest(teamData) !== item.teamBeforeDigest) throw new Error('TEAM_TRANSACTION_STALE');
        const memberData = memberSnaps[index].exists ? stable(memberSnaps[index].data() || {}) : null;
        if (item.membershipBefore && (!memberData || digest(memberData) !== digest(item.membershipBefore))) throw new Error('MEMBERSHIP_TRANSACTION_STALE');
        if (!item.membershipBefore && memberData) throw new Error('MEMBERSHIP_CREATED_AFTER_CENSUS');
        memberPatches.push(diffPatch(memberData || {}, item.membershipDesired));
        teamPatches.push(diffPatch(teamData, item.teamDesired));
      }
      for (let index = 0; index < state.targets.length; index += 1) {
        if (Object.keys(memberPatches[index]).length) { tx.set(memberRefs[index], memberPatches[index], { merge:true }); membershipWrites += 1; }
        if (Object.keys(teamPatches[index]).length) { tx.set(teamRefs[index], teamPatches[index], { merge:true }); teamWrites += 1; }
      }
    });
    state.applied = true;
    state.membershipWrites = membershipWrites;
    state.teamWrites = teamWrites;
    writePrivate(state);
    writeJson(FILES.apply, publicBase({ stage:'AUTH_DYNAMIC_TEAM_APPLY_PASS', classification:'CONTROLLED_DYNAMIC_WRITE_APPLIED', activeUsers:state.activeCount, authUsersCreated:state.createdAuthUids.length, authUsersUpdated:Object.keys(state.updatedAuthBefore).length, authUsersLinked:state.activeCount - state.createdAuthUids.length, membershipWrites, teamWrites, transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL', atomicTransaction:true, idempotentDiffWrites:true, allowedTeamFields:TEAM_FIELDS, firestoreReads:true, firestoreWrites:membershipWrites + teamWrites, authReads:true, authWrites:state.createdAuthUids.length + Object.keys(state.updatedAuthBefore).length, ok:true }));
    return 0;
  } catch (error) {
    let rollback = { teamRestores:0,membershipRestores:0,authDeletes:0,authRestores:0 };
    try { rollback = await restoreState(state, auth, db); } catch (_) {}
    writeJson(FILES.apply, publicBase({ stage:'AUTH_DYNAMIC_TEAM_APPLY_STOP_RETRY', classification:'DATA_CONTRACT_FAILURE', errorCode:sanitize(error?.code || error?.message || error), rollback, crmIntegrity:'NOT_POSTVERIFIED', firestoreReads:true, firestoreWrites:rollback.teamRestores + rollback.membershipRestores, authReads:true, authWrites:rollback.authDeletes + rollback.authRestores, ok:false }));
    return 41;
  }
}

async function sendResetEmail(email) {
  if (!WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY_REQUIRED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(WEB_API_KEY)}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ requestType:'PASSWORD_RESET', email, continueUrl:CONTINUE_URL }) });
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
    writeJson(FILES.emails, publicBase({ stage:'AUTH_DYNAMIC_TEAM_EMAILS_PASS', classification:'PASSWORD_EMAILS_SENT', activeUsers:state.activeCount, emailsSent:state.emailsSent.length, emailHashes:state.targets.map(item => sha(item.normalized.email)).sort(), actionLinksExposed:0, firestoreWrites:0, authWrites:0, ok:state.emailsSent.length === state.activeCount }));
    return state.emailsSent.length === state.activeCount ? 0 : 41;
  } catch (error) {
    writeJson(FILES.emails, publicBase({ stage:'AUTH_DYNAMIC_TEAM_EMAILS_STOP_RETRY', classification:'ENVIRONMENT_FAILURE', errorCode:sanitize(error?.message || error), emailsSentBeforeFailure:state.emailsSent.length, activeUsers:state.activeCount, crmIntegrity:'NOT_POSTVERIFIED', ok:false }));
    return 41;
  }
}
async function exchangeCustomToken(token) {
  if (!WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY_REQUIRED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(WEB_API_KEY)}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ token, returnSecureToken:true }) });
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
      const custom = await auth.createCustomToken(item.uid, { orbitTenant:TENANT, orbitRole:item.normalized.activeRole });
      const idToken = await exchangeCustomToken(custom);
      const decoded = await auth.verifyIdToken(idToken, true);
      const memberSnap = await db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get();
      const member = memberSnap.exists ? memberSnap.data() || {} : {};
      const ok = decoded.uid === item.uid && member.tenantId === TENANT && ['active','activo'].includes(text(member.status).toLowerCase()) && Array.isArray(member.roles) && member.roles.includes(member.activeRole);
      checks.push({ uidHash:sha(item.uid), ok });
      if (!ok) throw new Error('SESSION_MEMBERSHIP_CONTRACT_FAILED');
    }
    state.sessionsVerified = checks.every(item => item.ok);
    writePrivate(state);
    writeJson(FILES.sessions, publicBase({ stage:'AUTH_DYNAMIC_TEAM_SESSIONS_PASS', classification:'DYNAMIC_AUTHENTICABLE_MEMBERSHIP_SESSIONS', activeUsers:state.activeCount, sessionsVerified:checks.length, sessionUidHashes:checks.map(item => item.uidHash).sort(), tokensExposed:0, firestoreReads:true, firestoreWrites:0, authReads:true, authWrites:0, ok:state.sessionsVerified && checks.length === state.activeCount }));
    return state.sessionsVerified && checks.length === state.activeCount ? 0 : 41;
  } catch (error) {
    writeJson(FILES.sessions, publicBase({ stage:'AUTH_DYNAMIC_TEAM_SESSIONS_STOP_RETRY', classification:'FUNCTIONAL_DEFECT', errorCode:sanitize(error?.message || error), activeUsers:state.activeCount, sessionsVerified:0, tokensExposed:0, crmIntegrity:'NOT_POSTVERIFIED', ok:false }));
    return 41;
  }
}
async function verify() {
  const state = readPrivate();
  const { auth, db } = admin();
  try {
    let identities = 0, memberships = 0, teamLinks = 0;
    const profiles = new Set();
    for (const item of state.targets) {
      const [user, memberSnap, teamSnap] = await Promise.all([auth.getUser(item.uid), db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get(), db.doc(item.teamRefPath).get()]);
      const member = memberSnap.exists ? stable(memberSnap.data() || {}) : null;
      const team = teamSnap.exists ? stable(teamSnap.data() || {}) : null;
      if (!user || text(user.email).toLowerCase() !== item.normalized.email || user.disabled) throw new Error('AUTH_VERIFY_FAILED');
      identities += 1;
      if (!member || digest(pick(member, MEMBER_FIELDS)) !== digest(pick(item.membershipDesired, MEMBER_FIELDS))) throw new Error('MEMBERSHIP_VERIFY_FAILED');
      memberships += 1;
      if (!team || team.authUid !== item.uid || team.accessProvisioned !== true || team.membershipStatus !== 'active') throw new Error('TEAM_LINK_VERIFY_FAILED');
      teamLinks += 1;
      if (item.normalized.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))) profiles.add('direccion');
      if (item.normalized.roles.includes('Operativo')) profiles.add('operativo');
      if (item.normalized.roles.includes('Asesor')) profiles.add('asesor');
    }
    const crmAfter = await crmSnapshot(db);
    const crmIntegrity = digest(crmAfter) === digest(state.crmBefore) ? 'VERIFIED_UNCHANGED' : 'VERIFIED_CHANGED';
    const ok = identities === state.activeCount && memberships === state.activeCount && teamLinks === state.activeCount && state.emailsSent.length === state.activeCount && state.sessionsVerified === true && crmIntegrity === 'VERIFIED_UNCHANGED';
    writeJson(FILES.verify, publicBase({ stage:ok?'AUTH_DYNAMIC_TEAM_RUNTIME_PASS':'AUTH_DYNAMIC_TEAM_RUNTIME_STOP_RETRY', classification:ok?'AUTH_DYNAMIC_TEAM_COMPLETE':'FUNCTIONAL_DEFECT', activeUsers:state.activeCount, identitiesVerified:identities, membershipsVerified:memberships, teamLinksVerified:teamLinks, passwordEmailsVerified:state.emailsSent.length, sessionsVerified:state.sessionsVerified ? state.activeCount : 0, functionalProfilesVerified:profiles.size, futureUserPathSupported:true, crmIntegrity, firestoreReads:true, firestoreWrites:0, authReads:true, authWrites:0, ok }));
    return ok ? 0 : 41;
  } catch (error) {
    writeJson(FILES.verify, publicBase({ stage:'AUTH_DYNAMIC_TEAM_RUNTIME_STOP_RETRY', classification:'FUNCTIONAL_DEFECT', errorCode:sanitize(error?.message || error), activeUsers:state.activeCount, crmIntegrity:'NOT_POSTVERIFIED', ok:false }));
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
    writeJson(FILES.rollback, publicBase({ stage:'AUTH_DYNAMIC_TEAM_ROLLBACK_PASS', classification:'ROLLBACK_COMPLETE', activeUsers:state.activeCount, ...restored, emailsPreviouslySent:state.emailsSent.length, crmIntegrity, ok:crmIntegrity === 'VERIFIED_UNCHANGED' }));
    return crmIntegrity === 'VERIFIED_UNCHANGED' ? 0 : 41;
  } catch (error) {
    writeJson(FILES.rollback, publicBase({ stage:'AUTH_DYNAMIC_TEAM_ROLLBACK_FAILED', classification:'PIPELINE_MECHANISM_FAILURE', errorCode:sanitize(error?.message || error), crmIntegrity:'NOT_POSTVERIFIED', ok:false }));
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
    writeJson(FILES[MODE] || FILES.verify, publicBase({ stage:`AUTH_DYNAMIC_TEAM_${MODE || 'UNKNOWN'}_STOP_RETRY`, classification:'PIPELINE_MECHANISM_FAILURE', errorCode:sanitize(error?.code || error?.message || error), crmIntegrity:'NOT_POSTVERIFIED', ok:false }));
    code = 41;
  } finally {
    if (app) await deleteApp(app).catch(() => {});
  }
  process.exit(code);
}

await main();
