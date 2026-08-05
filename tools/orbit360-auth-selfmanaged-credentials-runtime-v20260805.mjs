#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const CONFIG_FILE = process.env.ORBIT360_IDENTITY_OVERRIDE_CONFIG || 'orbit360-platform/data/tenant-config/alianzas-soluciones.auth-identity-overrides-v20260805.json';
const EVIDENCE_DIR = path.join(ROOT, process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716');
const PRIVATE_STATE = process.env.ORBIT360_AUTH_CREDENTIAL_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-auth-selfmanaged-private.json');
const DYNAMIC_STATE = process.env.ORBIT360_AUTH_DYNAMIC_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-auth-dynamic-team-private.json');
const WEB_API_KEY = String(process.env.ORBIT360_FIREBASE_WEB_API_KEY || '').trim();
const AUTHORITY = 'tenantId/{tenantId}/asesores';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CRM_COLLECTIONS = Object.freeze(['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads']);

const FILES = Object.freeze({
  plan: path.join(EVIDENCE_DIR, 'auth-selfmanaged-identity-plan-sanitized-v20260805.json'),
  apply: path.join(EVIDENCE_DIR, 'auth-selfmanaged-identity-apply-sanitized-v20260805.json'),
  passwords: path.join(EVIDENCE_DIR, 'auth-selfmanaged-passwords-sanitized-v20260805.json'),
  verify: path.join(EVIDENCE_DIR, 'auth-selfmanaged-final-verify-sanitized-v20260805.json')
});

const text = value => String(value == null ? '' : value).trim();
const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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
const active = row => !(row && (row.inactivo === true || row.activo === false || normalized(row.estado) === 'inactivo'));

let app;
function admin() {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return { auth:getAuth(app), db:getFirestore(app) };
}
function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function writePrivate(payload) { fs.writeFileSync(PRIVATE_STATE, JSON.stringify(payload), { encoding:'utf8', mode:0o600 }); }
function readPrivate() { return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8')); }
function readDynamic() { return JSON.parse(fs.readFileSync(DYNAMIC_STATE, 'utf8')); }
function publicBase(payload = {}) {
  return {
    ...payload,
    projectId:PROJECT,
    tenantIdHash:sha(TENANT),
    authorityPathClass:AUTHORITY,
    containsPII:false,
    containsSecrets:false,
    containsPassword:false,
    containsTemporaryPassword:false,
    containsActionLink:false,
    productionTouched:false,
    mainTouched:false,
    mergeExecuted:false,
    hostingDeploys:0,
    rulesDeploys:0,
    reimports:0
  };
}
function config() {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG_FILE), 'utf8'));
  if (parsed.tenantId !== TENANT || !Array.isArray(parsed.identityOverrides) || parsed.identityOverrides.length !== 4) throw new Error('IDENTITY_OVERRIDE_CONFIG_INVALID');
  return parsed;
}
async function readAuthority(db) {
  const snap = await db.collection('tenantId').doc(TENANT).collection('asesores').get();
  return snap.docs.map(doc => ({ id:doc.id, refPath:doc.ref.path, data:stable(doc.data() || {}) })).sort((a,b) => a.id.localeCompare(b.id));
}
async function snapshotCollection(ref) {
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id:doc.id,data:stable(doc.data() || {}) })).sort((a,b) => a.id.localeCompare(b.id));
  return { count:rows.length,digest:digest(rows) };
}
async function crmSnapshot(db) {
  const result = {};
  for (const name of CRM_COLLECTIONS) {
    result[`canonical:${name}`] = await snapshotCollection(db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items'));
    result[`legacy:${name}`] = await snapshotCollection(db.collection('tenantId').doc(TENANT).collection(name));
  }
  return result;
}
function temporaryPassword(name) {
  const first = text(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/)[0].replace(/[^A-Za-z]/g, '');
  if (!first) throw new Error('FIRST_NAME_REQUIRED_FOR_TEMP_PASSWORD');
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() + '123*';
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

async function plan() {
  const { db } = admin();
  const [rows, crmBefore] = await Promise.all([readAuthority(db), crmSnapshot(db)]);
  const cfg = config();
  const byName = new Map();
  for (const row of rows) {
    const key = normalized(row.data.nombre || row.data.name || row.data.displayName);
    if (!key) continue;
    const list = byName.get(key) || [];
    list.push(row);
    byName.set(key, list);
  }
  const targets = [];
  for (const override of cfg.identityOverrides) {
    const key = normalized(override.matchName);
    const matches = byName.get(key) || [];
    if (matches.length !== 1) throw new Error(`IDENTITY_OVERRIDE_MATCH_${matches.length}`);
    const email = text(override.email).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('IDENTITY_OVERRIDE_EMAIL_INVALID');
    const countries = Array.isArray(override.countries) ? [...new Set(override.countries.map(value => text(value).toUpperCase()).filter(Boolean))] : [];
    if (!countries.length) throw new Error('IDENTITY_OVERRIDE_COUNTRY_REQUIRED');
    const row = matches[0];
    targets.push({
      id:row.id,
      refPath:row.refPath,
      before:row.data,
      beforeDigest:digest(row.data),
      email,
      countries,
      defaultCountry:text(override.defaultCountry || countries[0]).toUpperCase()
    });
  }
  const activeRows = rows.filter(row => active(row.data));
  const effectiveEmails = activeRows.map(row => {
    const target = targets.find(item => item.id === row.id);
    return target ? target.email : text(row.data.email || row.data.correo).toLowerCase();
  });
  if (effectiveEmails.some(email => !EMAIL_RE.test(email))) throw new Error('ACTIVE_TEAM_EMAIL_STILL_INCOMPLETE');
  if (new Set(effectiveEmails).size !== effectiveEmails.length) throw new Error('ACTIVE_TEAM_EMAIL_DUPLICATE_AFTER_OVERRIDE');
  const state = {
    schemaVersion:'orbit360-auth-selfmanaged-private-v1',
    generatedAt:new Date().toISOString(),
    crmBefore,
    targets,
    activeCount:activeRows.length,
    passwordUidHashes:[],
    passwordEmailHashes:[],
    loginsVerified:0
  };
  writePrivate(state);
  writeJson(FILES.plan, publicBase({
    stage:'AUTH_SELFMANAGED_IDENTITY_PLAN_PASS',
    classification:'GO_IDENTITY_COMPLETION',
    overridesPlanned:targets.length,
    activeUsersObserved:activeRows.length,
    effectiveUniqueEmails:effectiveEmails.length,
    countriesResolved:targets.length,
    firestoreReads:true,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    overrideNameHashes:targets.map(item => sha(item.id)).sort(),
    overrideEmailHashes:targets.map(item => sha(item.email)).sort(),
    crmSnapshotTaken:true,
    ok:true
  }));
  return 0;
}

async function apply() {
  const { db } = admin();
  const state = readPrivate();
  let writes = 0;
  await db.runTransaction(async tx => {
    const entries = [];
    for (const target of state.targets) {
      const ref = db.doc(target.refPath);
      const snap = await tx.get(ref);
      if (!snap.exists || digest(stable(snap.data() || {})) !== target.beforeDigest) throw new Error('IDENTITY_OVERRIDE_STALE');
      entries.push({ target,ref });
    }
    for (const entry of entries) {
      tx.set(entry.ref, {
        email:entry.target.email,
        correo:entry.target.email,
        paises:entry.target.countries,
        countries:entry.target.countries,
        pais:entry.target.defaultCountry,
        paisDefault:entry.target.defaultCountry,
        country:entry.target.defaultCountry,
        countryDefault:entry.target.defaultCountry,
        identityDataCompletedAt:FieldValue.serverTimestamp(),
        updatedAt:FieldValue.serverTimestamp()
      }, { merge:true });
      writes += 1;
    }
  });
  writeJson(FILES.apply, publicBase({
    stage:'AUTH_SELFMANAGED_IDENTITY_APPLY_PASS',
    classification:'TENANT_IDENTITY_DATA_COMPLETED',
    overridesWritten:writes,
    transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL',
    firestoreReads:true,
    firestoreWrites:writes,
    authReads:0,
    authWrites:0,
    ok:writes === state.targets.length
  }));
  return writes === state.targets.length ? 0 : 41;
}

async function signInWithPassword(email, password) {
  if (!WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY_REQUIRED');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(WEB_API_KEY)}`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({ email,password,returnSecureToken:true })
  });
  const body = await response.json();
  if (!response.ok || body?.error || !body?.idToken || !body?.localId) throw new Error(`PASSWORD_LOGIN_${response.status}_${body?.error?.message || 'FAILED'}`);
  return { uid:body.localId,idToken:body.idToken };
}

async function passwords() {
  const { auth,db } = admin();
  const state = readPrivate();
  const dynamic = readDynamic();
  if (!dynamic.applied || !Array.isArray(dynamic.targets) || !dynamic.targets.length) throw new Error('DYNAMIC_FOUNDATION_STATE_REQUIRED');
  const authority = await readAuthority(db);
  const activeRows = authority.filter(row => active(row.data));
  if (activeRows.length !== dynamic.activeCount) throw new Error('ACTIVE_COUNT_CHANGED_BEFORE_PASSWORDS');
  const byId = new Map(activeRows.map(row => [row.id,row]));
  const prepared = [];
  for (const item of dynamic.targets) {
    const row = byId.get(item.teamId);
    if (!row) throw new Error('ACTIVE_USER_MISSING_BEFORE_PASSWORDS');
    const email = text(row.data.email || row.data.correo).toLowerCase();
    const name = text(row.data.nombre || row.data.name || row.data.displayName);
    if (!EMAIL_RE.test(email) || !name || !item.uid) throw new Error('PASSWORD_TARGET_CONTRACT_INVALID');
    prepared.push({ item,row,email,name,password:temporaryPassword(name) });
  }
  const emailHashes = prepared.map(entry => sha(entry.email));
  if (new Set(emailHashes).size !== prepared.length) throw new Error('PASSWORD_TARGET_EMAIL_DUPLICATE');

  const updatedUids = [];
  for (const entry of prepared) {
    await auth.updateUser(entry.item.uid, {
      email:entry.email,
      displayName:entry.name,
      disabled:false,
      password:entry.password,
      emailVerified:false
    });
    updatedUids.push(entry.item.uid);
  }

  let membershipWrites = 0;
  let teamWrites = 0;
  await db.runTransaction(async tx => {
    const entries = [];
    for (const entry of prepared) {
      const memberRef = db.collection('tenants').doc(TENANT).collection('members').doc(entry.item.uid);
      const teamRef = db.doc(entry.row.refPath);
      const memberSnap = await tx.get(memberRef);
      const teamSnap = await tx.get(teamRef);
      if (!memberSnap.exists || !teamSnap.exists) throw new Error('CREDENTIAL_LINK_NOT_READY');
      entries.push({ entry,memberRef,teamRef });
    }
    for (const current of entries) {
      tx.set(current.memberRef, {
        mustChangePassword:true,
        credentialState:'temporary',
        passwordResetAt:FieldValue.serverTimestamp(),
        passwordResetByHash:sha('authorized-bootstrap'),
        updatedAt:FieldValue.serverTimestamp()
      }, { merge:true });
      membershipWrites += 1;
      tx.set(current.teamRef, {
        mustChangePassword:true,
        credentialState:'temporary',
        accessProvisioned:true,
        membershipStatus:'active',
        onboardingState:'active',
        invitacionEstado:'contraseña_temporal_asignada',
        updatedAt:FieldValue.serverTimestamp()
      }, { merge:true });
      teamWrites += 1;
    }
  });

  let verified = 0;
  const uidHashes = [];
  for (const entry of prepared) {
    const session = await signInWithPassword(entry.email, entry.password);
    if (session.uid !== entry.item.uid) throw new Error('PASSWORD_LOGIN_UID_MISMATCH');
    await auth.verifyIdToken(session.idToken, true);
    verified += 1;
    uidHashes.push(sha(entry.item.uid));
  }
  state.passwordUidHashes = uidHashes.sort();
  state.passwordEmailHashes = emailHashes.sort();
  state.loginsVerified = verified;
  writePrivate(state);
  writeJson(FILES.passwords, publicBase({
    stage:'AUTH_SELFMANAGED_PASSWORDS_PASS',
    classification:'TEMPORARY_PASSWORDS_ASSIGNED_AND_VERIFIED',
    activeUsers:prepared.length,
    passwordsAssigned:updatedUids.length,
    passwordLoginsVerified:verified,
    membershipsFlagged:membershipWrites,
    teamRecordsFlagged:teamWrites,
    passwordPolicy:'FIRST_NAME_123_STAR',
    forceChangeOnFirstLogin:true,
    passwordHashesPersisted:0,
    plaintextPasswordsPersisted:0,
    uidHashes:uidHashes.sort(),
    emailHashes:emailHashes.sort(),
    firestoreReads:true,
    firestoreWrites:membershipWrites + teamWrites,
    authReads:true,
    authWrites:updatedUids.length,
    ok:updatedUids.length === prepared.length && verified === prepared.length
  }));
  return updatedUids.length === prepared.length && verified === prepared.length ? 0 : 41;
}

async function verify() {
  const { auth,db } = admin();
  const state = readPrivate();
  const dynamic = readDynamic();
  const authority = await readAuthority(db);
  const activeRows = authority.filter(row => active(row.data));
  const byId = new Map(activeRows.map(row => [row.id,row]));
  let identities = 0,memberships = 0,teamLinks = 0,forced = 0;
  for (const item of dynamic.targets) {
    const row = byId.get(item.teamId);
    if (!row) throw new Error('FINAL_ACTIVE_USER_MISSING');
    const [user,memberSnap] = await Promise.all([
      auth.getUser(item.uid),
      db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get()
    ]);
    const member = memberSnap.exists ? memberSnap.data() || {} : {};
    const email = text(row.data.email || row.data.correo).toLowerCase();
    if (text(user.email).toLowerCase() !== email || user.disabled) throw new Error('FINAL_AUTH_IDENTITY_INVALID');
    identities += 1;
    if (member.tenantId !== TENANT || !['active','activo'].includes(text(member.status).toLowerCase()) || member.advisorId !== item.teamId) throw new Error('FINAL_MEMBERSHIP_INVALID');
    memberships += 1;
    if (row.data.authUid !== item.uid || row.data.accessProvisioned !== true || row.data.membershipStatus !== 'active') throw new Error('FINAL_TEAM_LINK_INVALID');
    teamLinks += 1;
    if (member.mustChangePassword === true && text(member.credentialState).toLowerCase() === 'temporary' && row.data.mustChangePassword === true) forced += 1;
  }
  const crmAfter = await crmSnapshot(db);
  const crmIntegrity = digest(crmAfter) === digest(state.crmBefore) ? 'VERIFIED_UNCHANGED' : 'VERIFIED_CHANGED';
  const sourceChecks = {
    backendCredentialOwner:fs.readFileSync(path.join(ROOT,'functions/user-credential-selfservice.js'),'utf8').includes('setTemporaryPassword'),
    frontendCredentialAdapter:fs.readFileSync(path.join(ROOT,'orbit360-platform/core/user-credential-selfservice-v20260805.js'),'utf8').includes('setTemporaryPassword'),
    forcedChangeBridge:fs.readFileSync(path.join(ROOT,'orbit360-platform/core/auth-password-change-v20260805.js'),'utf8').includes('updatePassword'),
    equipoCredentialAdmin:fs.readFileSync(path.join(ROOT,'orbit360-platform/modules/equipo-credential-admin-v20260805-bridge.js'),'utf8').includes('Asignar contraseña temporal'),
    indexLoadsCredentialOwners:fs.readFileSync(path.join(ROOT,'orbit360-platform/index.html'),'utf8').includes('auth-password-change-v20260805.js') && fs.readFileSync(path.join(ROOT,'orbit360-platform/index.html'),'utf8').includes('equipo-credential-admin-v20260805-bridge.js')
  };
  const sourceReady = Object.values(sourceChecks).every(Boolean);
  const n = activeRows.length;
  const ok = n > 0 && identities === n && memberships === n && teamLinks === n && forced === n && state.loginsVerified === n && sourceReady && crmIntegrity === 'VERIFIED_UNCHANGED';
  writeJson(FILES.verify, publicBase({
    stage:ok?'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_PASS':'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_STOP_RETRY',
    classification:ok?'AUTH_SELFMANAGED_CREDENTIALS_COMPLETE':'FUNCTIONAL_DEFECT',
    activeUsers:n,
    identitiesVerified:identities,
    membershipsVerified:memberships,
    teamLinksVerified:teamLinks,
    forcedPasswordChangesVerified:forced,
    passwordLoginsVerified:state.loginsVerified,
    sourceChecks,
    sourceReady,
    crmIntegrity,
    currentPasswordReadable:false,
    adminCanReplaceTemporaryPassword:true,
    userCanChangeOwnPassword:true,
    emailAndNameSyncSupported:true,
    ok
  }));
  return ok ? 0 : 41;
}

async function main() {
  let code = 41;
  try {
    if (MODE === 'plan') code = await plan();
    else if (MODE === 'apply') code = await apply();
    else if (MODE === 'passwords') code = await passwords();
    else if (MODE === 'verify') code = await verify();
    else throw new Error('MODE_REQUIRED');
  } catch (error) {
    writeJson(FILES[MODE] || FILES.verify, publicBase({
      stage:`AUTH_SELFMANAGED_${MODE || 'UNKNOWN'}_STOP_RETRY`,
      classification:'PIPELINE_MECHANISM_FAILURE',
      errorCode:sanitize(error?.code || error?.message || error),
      crmIntegrity:'NOT_POSTVERIFIED',
      ok:false
    }));
    code = 41;
  } finally {
    if (app) await deleteApp(app).catch(() => {});
  }
  process.exit(code);
}

await main();
