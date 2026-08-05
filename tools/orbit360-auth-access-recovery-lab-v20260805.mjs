#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const FUNCTION = 'orbit360ProvisionTeamAccess';
const PREVIEW = process.env.ORBIT360_PREVIEW_URL || 'https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app';
const OUT_DEFAULT = 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-recovery-sanitized-v20260805.json';
const TARGETS = Object.freeze([
  { key: 'paula', tokens: ['paula', 'osorio'] },
  { key: 'carlos', tokens: ['carlos', 'castro'] },
  { key: 'samuel', tokens: ['samuel', 'daza'] }
]);
const PROTECTED_COLLECTIONS = Object.freeze(['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros']);
const PRIVILEGED = new Set(['superadmin','admintenant']);

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const mode = value('--mode') || 'census';
const privatePath = value('--private');
const sanitizedPath = value('--sanitized') || OUT_DEFAULT;

const text = (input, max = 1000) => String(input == null ? '' : input).replace(/\u0000/g, '').trim().slice(0, max);
const norm = input => text(input, 300).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const sha = input => crypto.createHash('sha256').update(String(input ?? ''), 'utf8').digest('hex');
const stable = input => {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(stable);
  if (input instanceof Date) return input.toISOString();
  if (typeof input?.toDate === 'function') return input.toDate().toISOString();
  if (typeof input === 'object') return Object.fromEntries(Object.keys(input).sort().map(key => [key, stable(input[key])]));
  return input;
};
const digest = input => sha(JSON.stringify(stable(input)));
const email = input => {
  const out = text(input, 320).toLowerCase().replace(/\s+/g, '');
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out) ? out : '';
};
const unique = values => Array.from(new Set([].concat(values || []).map(item => text(item, 160)).filter(Boolean)));
const safeError = error => text(error?.message || error, 800).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]');
const writeJson = (file, data) => { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8'); };

function canonicalRole(input) {
  const role = norm(input).replace(/ /g, '');
  if (['direccion','director','directora','superadmin','superadministrator'].includes(role)) return 'SuperAdmin';
  if (['admin','administracion','admintenant','administrador'].includes(role)) return 'AdminTenant';
  if (['operativo','operaciones'].includes(role)) return 'Operativo';
  if (['asesor','advisor','comercial','vendedor'].includes(role)) return 'Asesor';
  if (['finanzas','finance'].includes(role)) return 'Finanzas';
  if (['marketing','mercadeo'].includes(role)) return 'Marketing';
  if (['asistente','assistant'].includes(role)) return 'Asistente';
  return text(input, 80);
}
function rolesFrom(row) {
  row = row || {};
  return unique([...(row.roles || []), ...(row.rolesAsignados || []), ...(row.assignedRoles || []), row.role, row.rol, row.rolDefault, row.defaultRole, row.activeRole].filter(Boolean).map(canonicalRole));
}
function countriesFrom(row) {
  row = row || {};
  return unique([...(row.countries || []), ...(row.paises || []), row.country, row.pais, row.countryDefault, row.paisDefault].filter(Boolean).map(item => text(item, 8).toUpperCase()));
}
function defaultRoleFrom(row, roles) {
  const candidate = canonicalRole(row.defaultRole || row.rolDefault || row.activeRole || row.rol || roles[0]);
  return roles.includes(candidate) ? candidate : roles[0] || '';
}
function scopesFrom(row, roles) {
  if (row.dataScopes && typeof row.dataScopes === 'object' && !Array.isArray(row.dataScopes)) return stable(row.dataScopes);
  const scope = norm(row.scopeDatos || row.dataScope) || (roles.includes('Asesor') ? 'propios' : 'todos');
  return Object.fromEntries(['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'].map(domain => [domain, scope]));
}
function active(row) {
  const state = norm(row?.status || row?.estado);
  return !!row && row.active !== false && row.activo !== false && !['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state);
}
function authSnapshot(user) {
  if (!user) return null;
  return { uid: user.uid, email: email(user.email), displayName: text(user.displayName, 180), disabled: !!user.disabled, emailVerified: !!user.emailVerified };
}

let app;
let db;
let auth;

async function listAllAuthUsers() {
  const users = [];
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    users.push(...page.users);
    token = page.pageToken;
  } while (token);
  return users;
}
async function loadAdvisors() {
  const refs = [
    { source: 'canonical', ref: db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items') },
    { source: 'legacy_tenantId', ref: db.collection('tenantId').doc(TENANT).collection('asesores') },
    { source: 'legacy_tenants', ref: db.collection('tenants').doc(TENANT).collection('asesores') }
  ];
  const found = new Map();
  for (const item of refs) {
    const snap = await item.ref.get();
    for (const doc of snap.docs) {
      if (!found.has(doc.id)) found.set(doc.id, { id: doc.id, source: item.source, path: doc.ref.path, data: doc.data() || {} });
    }
  }
  return [...found.values()];
}
async function loadMembers() {
  const snap = await db.collection('tenants').doc(TENANT).collection('members').get();
  return snap.docs.map(doc => ({ id: doc.id, path: doc.ref.path, data: doc.data() || {} }));
}
function resolveTargets(advisors) {
  return TARGETS.map(target => {
    const matches = advisors.filter(item => target.tokens.every(token => norm(item.data.nombre || item.data.name || item.data.displayName).includes(token)));
    if (matches.length !== 1) throw new Error(`DATA_CONTRACT_FAILURE:ADVISOR_${target.key.toUpperCase()}_${matches.length ? 'AMBIGUOUS' : 'NOT_FOUND'}`);
    const item = matches[0];
    const configuredEmail = email(item.data.email || item.data.correo || item.data.userEmail);
    const roles = rolesFrom(item.data);
    const countries = countriesFrom(item.data);
    const defaultRole = defaultRoleFrom(item.data, roles);
    if (!configuredEmail) throw new Error(`DATA_CONTRACT_FAILURE:ADVISOR_${target.key.toUpperCase()}_EMAIL_REQUIRED`);
    if (!roles.length || !defaultRole || !countries.length) throw new Error(`DATA_CONTRACT_FAILURE:ADVISOR_${target.key.toUpperCase()}_ACCESS_CONFIG_INCOMPLETE`);
    return { ...target, advisorId: item.id, source: item.source, path: item.path, advisor: item.data, email: configuredEmail, roles, countries, defaultRole, dataScopes: scopesFrom(item.data, roles) };
  });
}
async function protectedSnapshot() {
  const out = {};
  for (const collection of PROTECTED_COLLECTIONS) {
    const snap = await db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').orderBy(FieldPath.documentId()).get();
    const rows = snap.docs.map(doc => ({ id: doc.id, data: stable(doc.data()) }));
    out[collection] = { count: rows.length, idDigest: digest(rows.map(row => row.id)), contentDigest: digest(rows) };
  }
  return out;
}
async function firebaseWebConfig() {
  const google = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform.read-only'] });
  const client = await google.getClient();
  const list = await client.request({ url: `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps` });
  const apps = [].concat(list.data?.apps || []).filter(item => String(item.state || '').toUpperCase() !== 'DELETED');
  if (!apps.length) throw new Error('ENVIRONMENT_FAILURE:FIREBASE_WEB_APP_NOT_FOUND');
  const config = await client.request({ url: `https://firebase.googleapis.com/v1beta1/${apps[0].name}/config` });
  if (!config.data?.apiKey) throw new Error('ENVIRONMENT_FAILURE:FIREBASE_API_KEY_NOT_RESOLVED');
  return config.data;
}
async function exchangeCustomToken(apiKey, token) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true })
  });
  if (!response.ok) throw new Error('SECURITY_FAILURE:CUSTOM_TOKEN_EXCHANGE_FAILED');
  const body = await response.json();
  if (!body.idToken) throw new Error('SECURITY_FAILURE:ID_TOKEN_NOT_RETURNED');
  return body.idToken;
}
async function callOnboarding(idToken, payload) {
  const response = await fetch(`https://${REGION}-${PROJECT}.cloudfunctions.net/${FUNCTION}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data: payload })
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok || body.error || body.result?.ok !== true) throw new Error(`FUNCTIONAL_DEFECT:ONBOARDING_CALL_FAILED_${text(body.error?.status || response.status, 80)}`);
  return body.result;
}
async function sendReset(apiKey, targetEmail) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: targetEmail, continueUrl: `${PREVIEW}?orbitBackend=firestore-lab&tenant=${encodeURIComponent(TENANT)}#/inicio`, canHandleCodeInApp: false })
  });
  if (!response.ok) throw new Error('ENVIRONMENT_FAILURE:PASSWORD_ESTABLISHMENT_EMAIL_FAILED');
  return true;
}
async function snapshotState() {
  const [authUsers, advisors, members, protectedData] = await Promise.all([listAllAuthUsers(), loadAdvisors(), loadMembers(), protectedSnapshot()]);
  return { authUsers, advisors, members, protectedData };
}
function nonTargetAuthDigest(users, targets) {
  const targetEmails = new Set(targets.map(item => item.email));
  return digest(users.filter(user => !targetEmails.has(email(user.email))).map(user => ({ uid: user.uid, emailHash: sha(email(user.email)), disabled: !!user.disabled })).sort((a,b) => a.uid.localeCompare(b.uid)));
}
function nonTargetMemberDigest(members, targetUids) {
  const ids = new Set(targetUids.filter(Boolean));
  return digest(members.filter(item => !ids.has(item.id)).map(item => ({ id: item.id, data: stable(item.data) })).sort((a,b) => a.id.localeCompare(b.id)));
}

async function census() {
  const state = await snapshotState();
  const targets = resolveTargets(state.advisors);
  for (const target of targets) {
    let user = null;
    try { user = await auth.getUserByEmail(target.email); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    target.beforeAuth = authSnapshot(user);
    const boundUid = text(target.advisor.authUid || target.advisor.uid || target.advisor.userId, 160);
    const membershipId = user?.uid || boundUid;
    const member = membershipId ? state.members.find(item => item.id === membershipId) : null;
    target.beforeMembership = member ? stable(member.data) : null;
    target.beforeAdvisor = stable(target.advisor);
  }
  let actor = null;
  for (const member of state.members) {
    if (!active(member.data) || !rolesFrom(member.data).some(role => PRIVILEGED.has(norm(role).replace(/ /g, '')))) continue;
    try {
      const user = await auth.getUser(member.id);
      if (!user.disabled) { actor = { uid: user.uid, email: email(user.email), activeRole: defaultRoleFrom(member.data, rolesFrom(member.data)), member: member.data }; break; }
    } catch {}
  }
  if (!actor?.uid || !actor.email) throw new Error('DATA_CONTRACT_FAILURE:ACTIVE_PRIVILEGED_ACTOR_NOT_FOUND');

  const privateState = {
    schemaVersion: 'orbit360-auth-access-recovery-private-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    actor,
    targets,
    before: {
      authCount: state.authUsers.length,
      memberCount: state.members.length,
      nonTargetAuthDigest: nonTargetAuthDigest(state.authUsers, targets),
      nonTargetMemberDigest: nonTargetMemberDigest(state.members, targets.map(item => item.beforeAuth?.uid).filter(Boolean)),
      protectedData: state.protectedData
    },
    containsPII: true,
    privateEvidenceOnly: true
  };
  if (!privatePath) throw new Error('PIPELINE_MECHANISM_FAILURE:PRIVATE_STATE_PATH_REQUIRED');
  writeJson(privatePath, privateState);
  const sanitized = {
    schemaVersion: 'orbit360-auth-access-recovery-sanitized-v1',
    stage: 'CENSUS_READ_ONLY_PASS',
    classification: 'GO_AUTH_ACCESS_RECOVERY_CENSUS',
    projectId: PROJECT,
    tenantId: TENANT,
    authUsersObserved: state.authUsers.length,
    membershipsObserved: state.members.length,
    configuredTargets: targets.map(item => ({ key: item.key, advisorIdHash: sha(item.advisorId), emailHash: sha(item.email), roles: item.roles, defaultRole: item.defaultRole, countries: item.countries, authIdentityPresent: !!item.beforeAuth, membershipPresent: !!item.beforeMembership })),
    privilegedActorResolved: true,
    protectedCollections: state.protectedData,
    firestoreWrites: 0,
    authWrites: 0,
    functionDeploys: 0,
    emailsSent: 0,
    containsPII: false,
    containsSecrets: false,
    ok: true
  };
  writeJson(sanitizedPath, sanitized);
  console.log(JSON.stringify({ ok: true, stage: sanitized.stage, targetCount: targets.length, authUsersObserved: state.authUsers.length, membershipsObserved: state.members.length }));
}

async function rollback(privateState, touched) {
  for (const target of [...touched].reverse()) {
    try {
      const current = await auth.getUserByEmail(target.email).catch(() => null);
      if (!target.beforeAuth && current) await auth.deleteUser(current.uid);
      else if (target.beforeAuth) await auth.updateUser(target.beforeAuth.uid, { email: target.beforeAuth.email, displayName: target.beforeAuth.displayName || undefined, disabled: target.beforeAuth.disabled, emailVerified: target.beforeAuth.emailVerified });
      const currentUid = current?.uid || target.beforeAuth?.uid;
      if (currentUid) {
        const ref = db.collection('tenants').doc(TENANT).collection('members').doc(currentUid);
        if (target.beforeMembership) await ref.set(target.beforeMembership, { merge: false });
        else await ref.delete();
      }
      const advisorRef = db.doc(target.path);
      await advisorRef.set(target.beforeAdvisor, { merge: false });
    } catch {}
  }
}

async function recover() {
  if (!privatePath || !fs.existsSync(privatePath)) throw new Error('PIPELINE_MECHANISM_FAILURE:CENSUS_PRIVATE_STATE_MISSING');
  const state = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
  const config = await firebaseWebConfig();
  const actorToken = await auth.createCustomToken(state.actor.uid, { orbitTenant: TENANT, orbitAuthRecovery: true });
  const actorIdToken = await exchangeCustomToken(config.apiKey, actorToken);
  const touched = [];
  const results = [];
  let emailsSent = 0;
  try {
    for (const target of state.targets) {
      touched.push(target);
      const operation = target.beforeAuth && target.beforeMembership ? 'sync' : 'provision';
      const result = await callOnboarding(actorIdToken, {
        tenantId: TENANT,
        advisorId: target.advisorId,
        advisor: target.advisor,
        operation,
        reason: 'Recuperación controlada de acceso LAB desde configuración vigente del tenant',
        confirmScopeAll: true,
        activeRole: state.actor.activeRole
      });
      const user = await auth.getUserByEmail(target.email);
      const membershipSnap = await db.collection('tenants').doc(TENANT).collection('members').doc(user.uid).get();
      if (!membershipSnap.exists) throw new Error(`DATA_CONTRACT_FAILURE:${target.key.toUpperCase()}_MEMBERSHIP_NOT_CREATED`);
      const member = membershipSnap.data() || {};
      const actualRoles = rolesFrom(member).sort();
      const expectedRoles = target.roles.slice().sort();
      if (!active(member) || member.tenantId !== TENANT || digest(actualRoles) !== digest(expectedRoles) || canonicalRole(member.defaultRole || member.activeRole) !== target.defaultRole || digest(countriesFrom(member).sort()) !== digest(target.countries.slice().sort())) {
        throw new Error(`DATA_CONTRACT_FAILURE:${target.key.toUpperCase()}_MEMBERSHIP_MISMATCH`);
      }
      const customToken = await auth.createCustomToken(user.uid, { orbitTenant: TENANT, orbitAccessVerification: true });
      await exchangeCustomToken(config.apiKey, customToken);
      await sendReset(config.apiKey, target.email);
      emailsSent += 1;
      results.push({ key: target.key, authCreated: !target.beforeAuth, membershipCreated: !target.beforeMembership, roles: expectedRoles, defaultRole: target.defaultRole, countries: target.countries, invitationSent: true, identityContractVerified: true, uidHash: sha(user.uid), emailHash: sha(target.email), functionState: text(result.state || result.invitationState, 80) });
    }

    const after = await snapshotState();
    const targetUsers = [];
    for (const target of state.targets) targetUsers.push(await auth.getUserByEmail(target.email));
    const targetUids = targetUsers.map(user => user.uid);
    if (nonTargetAuthDigest(after.authUsers, state.targets) !== state.before.nonTargetAuthDigest) throw new Error('SECURITY_FAILURE:NON_TARGET_AUTH_CHANGED');
    if (nonTargetMemberDigest(after.members, targetUids) !== state.before.nonTargetMemberDigest) throw new Error('SECURITY_FAILURE:NON_TARGET_MEMBERSHIP_CHANGED');
    if (digest(after.protectedData) !== digest(state.before.protectedData)) throw new Error('SECURITY_FAILURE:PROTECTED_CRM_DATA_CHANGED');

    const sanitized = {
      schemaVersion: 'orbit360-auth-access-recovery-sanitized-v1',
      stage: 'AUTH_ACCESS_RECOVERY_PASS',
      decision: 'GO_REAL_IDENTITIES_MEMBERSHIPS_AND_PASSWORD_ESTABLISHMENT',
      classification: 'AUTH_ACCESS_RECOVERY_COMPLETE',
      projectId: PROJECT,
      tenantId: TENANT,
      function: FUNCTION,
      targets: results,
      authCountBefore: state.before.authCount,
      authCountAfter: after.authUsers.length,
      membershipCountBefore: state.before.memberCount,
      membershipCountAfter: after.members.length,
      authUsersCreated: results.filter(item => item.authCreated).length,
      membershipsCreated: results.filter(item => item.membershipCreated).length,
      passwordEstablishmentEmailsSent: emailsSent,
      nonTargetAuthUnchanged: true,
      nonTargetMembershipsUnchanged: true,
      protectedCrmDataUnchanged: true,
      protectedCollections: after.protectedData,
      temporaryPasswordsCreated: 0,
      passwordsRead: 0,
      actionLinksExposed: 0,
      fullEmailsExposed: 0,
      otherFunctionsDeployed: 0,
      hostingDeploys: 0,
      rulesDeploys: 0,
      reimports: 0,
      productionTouched: false,
      mainTouched: false,
      mergeExecuted: false,
      containsPII: false,
      containsSecrets: false,
      ok: true
    };
    writeJson(sanitizedPath, sanitized);
    console.log(JSON.stringify({ ok: true, stage: sanitized.stage, targets: results.map(item => item.key), authUsersCreated: sanitized.authUsersCreated, membershipsCreated: sanitized.membershipsCreated, emailsSent }));
  } catch (error) {
    await rollback(state, touched);
    const message = safeError(error);
    const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
    const failure = {
      schemaVersion: 'orbit360-auth-access-recovery-sanitized-v1',
      stage: 'STOP_RETRY_AUTH_ACCESS_RECOVERY',
      decision: 'STOP_RETRY_ROLLBACK_APPLIED',
      classification,
      errorCode: text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 160),
      attemptedTargets: touched.map(item => item.key),
      emailsSentBeforeStop: emailsSent,
      rollbackAttempted: true,
      temporaryPasswordsCreated: 0,
      passwordsRead: 0,
      actionLinksExposed: 0,
      fullEmailsExposed: 0,
      hostingDeploys: 0,
      rulesDeploys: 0,
      reimports: 0,
      productionTouched: false,
      mainTouched: false,
      mergeExecuted: false,
      containsPII: false,
      containsSecrets: false,
      ok: false
    };
    writeJson(sanitizedPath, failure);
    console.error(JSON.stringify({ ok: false, stage: failure.stage, classification, errorCode: failure.errorCode }));
    process.exitCode = 41;
  }
}

try {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  db = getFirestore(app);
  auth = getAuth(app);
  if (mode === 'census') await census();
  else if (mode === 'recover') await recover();
  else throw new Error('PIPELINE_MECHANISM_FAILURE:MODE_NOT_SUPPORTED');
} catch (error) {
  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  writeJson(sanitizedPath, {
    schemaVersion: 'orbit360-auth-access-recovery-sanitized-v1',
    stage: mode === 'census' ? 'STOP_RETRY_CENSUS' : 'STOP_RETRY_AUTH_ACCESS_RECOVERY',
    decision: 'STOP_RETRY',
    classification,
    errorCode: text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 160),
    firestoreWrites: 0,
    authWrites: 0,
    temporaryPasswordsCreated: 0,
    passwordsRead: 0,
    actionLinksExposed: 0,
    fullEmailsExposed: 0,
    productionTouched: false,
    mainTouched: false,
    mergeExecuted: false,
    containsPII: false,
    containsSecrets: false,
    ok: false
  });
  console.error(JSON.stringify({ ok: false, classification, errorCode: text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 160) }));
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
