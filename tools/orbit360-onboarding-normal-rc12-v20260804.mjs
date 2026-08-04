#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE_DIR = process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716';
const PRIVATE_PLAN = process.env.ORBIT360_NORMAL_ONBOARDING_PRIVATE_PLAN || path.join(process.env.RUNNER_TEMP || ROOT, 'rc12-normal-onboarding-private-plan.json');
const FILES = {
  census: path.join(ROOT, EVIDENCE_DIR, 'rc12-normal-auth-census.json'),
  apply: path.join(ROOT, EVIDENCE_DIR, 'rc12-normal-memberships-apply.json'),
  verify: path.join(ROOT, EVIDENCE_DIR, 'rc12-normal-memberships-verify.json'),
  rollback: path.join(ROOT, EVIDENCE_DIR, 'rc12-normal-memberships-rollback.json')
};
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const PROFILES = ['direccion','operativo','asesor'];
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const clean = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const sanitizeError = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 500);
const write = (file, payload) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    ...payload,
    projectId: PROJECT,
    tenantId: TENANT,
    containsPII: false,
    containsSecrets: false,
    containsRawUid: false,
    containsRawEmail: false,
    authWrites: 0,
    userCreates: 0,
    userUpdates: 0,
    emailChanges: 0,
    providerChanges: 0,
    passwordReads: 0,
    passwordWrites: 0,
    reimportExecuted: false,
    rulesApplied: false,
    functionsDeployed: false,
    mainTouched: false,
    mergeExecuted: false
  }, null, 2) + '\n', 'utf8');
};
const canonicalRole = value => {
  const role = clean(value);
  if (['superadmin','direccion','directora','director'].includes(role)) return 'SuperAdmin';
  if (['admintenant','admin','administracion'].includes(role)) return 'AdminTenant';
  if (['operativo','operaciones'].includes(role)) return 'Operativo';
  if (['asesor','advisor','vendedor'].includes(role)) return 'Asesor';
  return text(value);
};
const rolesFrom = source => unique([
  ...(Array.isArray(source?.roles) ? source.roles : []),
  ...(Array.isArray(source?.rolesAsignados) ? source.rolesAsignados : []),
  source?.role, source?.rol, source?.activeRole, source?.defaultRole, source?.perfil, source?.cargo, source?.puesto
].filter(Boolean).map(canonicalRole));
const profileForRoles = roles => {
  if (roles.some(x => ['SuperAdmin','AdminTenant'].includes(x))) return 'direccion';
  if (roles.includes('Operativo')) return 'operativo';
  if (roles.includes('Asesor')) return 'asesor';
  return '';
};
const providerIds = user => unique((user?.providerData || []).map(x => x.providerId));
const isTechnical = user => sha(String(user?.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(user?.uid || '') === TECHNICAL_DIGESTS.uid;
const userValid = user => Boolean(user?.uid && user?.email && !user?.disabled && providerIds(user).length);
const field = (data, names) => names.map(name => data?.[name]).find(value => text(value));
const advisorShape = (data, id, collection) => ({
  id,
  collection,
  uid: text(field(data, ['uid','userId','authUid','firebaseUid'])),
  email: text(field(data, ['email','correo','userEmail'])).toLowerCase(),
  advisorId: text(field(data, ['advisorId','asesorId','id'])) || id,
  roles: rolesFrom(data),
  name: text(field(data, ['name','nombre','displayName','nombreCompleto'])),
  teamId: text(field(data, ['teamId','equipoId'])),
  countries: unique(data?.countries || data?.paises || []).map(x => text(x).toUpperCase())
});

let app;
const admin = () => {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return { db: getFirestore(app), auth: getAuth(app) };
};
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
  for (const collection of ['asesores','advisors']) {
    const snap = await db.collection('tenantId').doc(TENANT).collection(collection).get();
    for (const doc of snap.docs) rows.push(advisorShape(doc.data(), doc.id, collection));
  }
  return rows;
}
function advisorMatches(user, advisors) {
  const email = String(user.email || '').toLowerCase();
  return advisors.filter(row => (row.uid && row.uid === user.uid) || (row.email && row.email === email));
}
function profileEvidence(user, advisors) {
  const claimRoles = rolesFrom(user.customClaims || {});
  const matched = advisorMatches(user, advisors);
  const advisorRoles = unique(matched.flatMap(row => row.roles));
  const combinedName = clean(`${user.displayName || ''} ${user.email || ''}`);
  const evidence = [];
  const claimProfile = profileForRoles(claimRoles);
  const advisorProfile = profileForRoles(advisorRoles);
  if (claimProfile) evidence.push({ profile: claimProfile, score: 100, source: 'auth_custom_claims' });
  if (advisorProfile) evidence.push({ profile: advisorProfile, score: 85, source: 'advisor_record_role' });
  if (combinedName.includes('paula')) evidence.push({ profile: 'direccion', score: 65, source: 'canonical_roster_match' });
  if (combinedName.includes('carlos')) evidence.push({ profile: 'operativo', score: 65, source: 'canonical_roster_match' });
  if (matched.length === 1 && matched[0].advisorId) evidence.push({ profile: 'asesor', score: 45, source: 'advisor_record_match' });
  return { claimRoles, matched, evidence };
}
function chooseProfile(profile, candidates) {
  const minimum = profile === 'asesor' ? 85 : 65;
  const eligible = candidates.filter(x => x.profileEvidence.evidence.some(e => e.profile === profile && e.score >= minimum))
    .map(x => ({ ...x, score: Math.max(...x.profileEvidence.evidence.filter(e => e.profile === profile).map(e => e.score)) }))
    .sort((a,b) => b.score - a.score || a.user.uid.localeCompare(b.user.uid));
  if (!eligible.length) return { status: 'missing', candidateCount: 0 };
  const top = eligible[0].score;
  const topRows = eligible.filter(x => x.score === top);
  if (topRows.length !== 1) return { status: 'ambiguous', candidateCount: topRows.length, topScore: top };
  return { status: 'resolved', candidateCount: eligible.length, topScore: top, selected: topRows[0] };
}
function template(profile, item, technicalMembership) {
  const claims = item.user.customClaims || {};
  const advisor = item.profileEvidence.matched[0] || null;
  const common = {
    uid: item.user.uid,
    tenantId: TENANT,
    status: 'active',
    teamId: text(claims.teamId || advisor?.teamId),
    countries: unique(claims.countries || advisor?.countries || technicalMembership?.countries || []).map(x => text(x).toUpperCase()),
    modulesExtra: [],
    modulesRestricted: [],
    onboardingVersion: 'rc12-normal-onboarding-v1'
  };
  if (profile === 'direccion') return { ...common, roles: ['SuperAdmin','AdminTenant'], defaultRole: 'SuperAdmin', activeRole: 'SuperAdmin', dataScopes: {} };
  if (profile === 'operativo') return { ...common, roles: ['Operativo'], defaultRole: 'Operativo', activeRole: 'Operativo', dataScopes: {} };
  const advisorId = text(claims.advisorId || advisor?.advisorId);
  return { ...common, roles: ['Asesor'], defaultRole: 'Asesor', activeRole: 'Asesor', advisorId, dataScopes: { clientes: 'propios', polizas: 'propios', cobros: 'ninguno' } };
}
async function census() {
  const { db, auth } = admin();
  const [users, memberships, advisors] = await Promise.all([
    listAllUsers(auth),
    db.collection('tenants').doc(TENANT).collection('members').get(),
    readAdvisors(db)
  ]);
  const technicalDoc = memberships.docs.find(doc => {
    const data = doc.data();
    return sha(String(data.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(text(data.uid || doc.id)) === TECHNICAL_DIGESTS.uid;
  });
  const technicalMembership = technicalDoc?.data() || {};
  const normal = users.filter(user => userValid(user) && !isTechnical(user));
  const candidates = normal.map(user => ({ user, profileEvidence: profileEvidence(user, advisors) }));
  const resolution = Object.fromEntries(PROFILES.map(profile => [profile, chooseProfile(profile, candidates)]));
  const selected = Object.fromEntries(PROFILES.filter(p => resolution[p].status === 'resolved').map(p => [p, resolution[p].selected]));
  const selectedUids = Object.values(selected).map(x => x.user.uid);
  const distinct = new Set(selectedUids).size === 3;
  const advisorBound = Boolean(selected.asesor && template('asesor', selected.asesor, technicalMembership).advisorId);
  const allResolved = PROFILES.every(p => resolution[p].status === 'resolved') && distinct && advisorBound;
  const missingProfiles = PROFILES.filter(p => resolution[p].status === 'missing' || (p === 'asesor' && !advisorBound));
  const ambiguousProfiles = PROFILES.filter(p => resolution[p].status === 'ambiguous').concat(!distinct && selectedUids.length ? ['cross_profile_uid_collision'] : []);
  const publicResolution = Object.fromEntries(PROFILES.map(profile => {
    const row = resolution[profile];
    return [profile, {
      status: row.status,
      candidateCount: row.candidateCount || 0,
      topScore: row.topScore || 0,
      selectedUidSha256: row.selected ? sha(row.selected.user.uid) : '',
      selectedEmailSha256: row.selected ? sha(String(row.selected.user.email || '').toLowerCase()) : '',
      providerIds: row.selected ? providerIds(row.selected.user).sort() : [],
      advisorBound: row.selected ? Boolean(template(profile, row.selected, technicalMembership).advisorId) : false,
      evidenceSources: row.selected ? row.selected.profileEvidence.evidence.filter(e => e.profile === profile).map(e => e.source).sort() : []
    }];
  }));
  const plan = allResolved ? {
    schemaVersion: 'orbit360-rc12-normal-onboarding-private-plan-v1',
    projectId: PROJECT,
    tenantId: TENANT,
    profiles: Object.fromEntries(PROFILES.map(profile => {
      const item = selected[profile];
      const membership = template(profile, item, technicalMembership);
      return [profile, { uid: item.user.uid, email: item.user.email, membership }];
    }))
  } : null;
  if (plan) fs.writeFileSync(PRIVATE_PLAN, JSON.stringify(plan), { encoding: 'utf8', mode: 0o600 });
  const result = {
    schemaVersion: 'orbit360-rc12-normal-auth-census-v1',
    generatedAt: new Date().toISOString(),
    classification: allResolved ? 'GO_THREE_NORMAL_AUTH_IDENTITIES' : 'DATA_CONTRACT_FAILURE',
    decision: allResolved ? 'THREE_NORMAL_USERS_RESOLVED' : 'MISSING_OR_AMBIGUOUS_NORMAL_USERS_NO_WRITE',
    counts: {
      authUsers: users.length,
      validNormalAuthUsers: normal.length,
      existingMemberships: memberships.size,
      technicalMemberships: technicalDoc ? 1 : 0,
      advisorRecords: advisors.length
    },
    resolution: publicResolution,
    missingProfiles,
    ambiguousProfiles,
    allProfilesResolved: allResolved,
    distinctUsers: distinct,
    advisorBindingResolved: advisorBound,
    firestoreRead: true,
    authRead: true,
    firestoreWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    ok: allResolved
  };
  write(FILES.census, result);
  console.log(JSON.stringify(result, null, 2));
  return allResolved ? 0 : 41;
}
async function apply() {
  const { db, auth } = admin();
  const plan = JSON.parse(fs.readFileSync(PRIVATE_PLAN, 'utf8'));
  if (!plan?.profiles || !PROFILES.every(p => plan.profiles[p]?.uid)) throw new Error('PRIVATE_PLAN_INCOMPLETE');
  const uids = PROFILES.map(p => plan.profiles[p].uid);
  if (new Set(uids).size !== 3) throw new Error('PROFILE_UIDS_NOT_DISTINCT');
  for (const profile of PROFILES) {
    const user = await auth.getUser(plan.profiles[profile].uid);
    if (!userValid(user) || isTechnical(user)) throw new Error(`AUTH_USER_INVALID_${profile.toUpperCase()}`);
    if (profile === 'asesor' && !plan.profiles[profile].membership.advisorId) throw new Error('ADVISOR_ID_MISSING');
  }
  const refs = Object.fromEntries(PROFILES.map(p => [p, db.collection('tenants').doc(TENANT).collection('members').doc(plan.profiles[p].uid)]));
  const before = {};
  let writes = 0;
  await db.runTransaction(async tx => {
    for (const profile of PROFILES) {
      const snap = await tx.get(refs[profile]);
      before[profile] = { exists: snap.exists, data: snap.exists ? stable(snap.data()) : null };
      if (snap.exists) {
        const current = stable(snap.data());
        const desired = stable(plan.profiles[profile].membership);
        const comparable = Object.fromEntries(Object.keys(desired).map(key => [key, current?.[key]]));
        if (digest(comparable) !== digest(desired)) throw new Error(`MEMBERSHIP_ALREADY_EXISTS_DIFFERENT_${profile.toUpperCase()}`);
      }
    }
    if (Object.values(before).some(x => x.exists)) {
      if (!Object.values(before).every(x => x.exists)) throw new Error('PARTIAL_PREEXISTING_MEMBERSHIPS');
      return;
    }
    const now = new Date().toISOString();
    for (const profile of PROFILES) {
      const data = { ...plan.profiles[profile].membership, createdAt: now, updatedAt: now };
      plan.profiles[profile].membership = data;
      tx.create(refs[profile], data);
      writes += 1;
    }
  });
  plan.before = before;
  plan.afterDigests = Object.fromEntries(PROFILES.map(p => [p, digest(plan.profiles[p].membership)]));
  plan.forwardWrites = writes;
  fs.writeFileSync(PRIVATE_PLAN, JSON.stringify(plan), { encoding: 'utf8', mode: 0o600 });
  const result = {
    schemaVersion: 'orbit360-rc12-normal-memberships-apply-v1',
    generatedAt: new Date().toISOString(),
    classification: writes === 3 || writes === 0 ? 'GO_MEMBERSHIPS_APPLIED_IDEMPOTENT' : 'DATA_CONTRACT_FAILURE',
    decision: writes === 3 ? 'THREE_MEMBERSHIPS_CREATED_ATOMICALLY' : 'THREE_MEMBERSHIPS_ALREADY_EXACT',
    profiles: PROFILES,
    beforeExistingCount: Object.values(before).filter(x => x.exists).length,
    firestoreWrites: writes,
    atomic: true,
    idempotent: true,
    deployExecuted: false,
    productionTouched: false,
    ok: writes === 3 || writes === 0
  };
  write(FILES.apply, result);
  console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 41;
}
async function verify() {
  const { db, auth } = admin();
  const plan = JSON.parse(fs.readFileSync(PRIVATE_PLAN, 'utf8'));
  const checks = {};
  for (const profile of PROFILES) {
    const expected = plan.profiles[profile];
    const [snap, user] = await Promise.all([
      db.collection('tenants').doc(TENANT).collection('members').doc(expected.uid).get(),
      auth.getUser(expected.uid)
    ]);
    const data = snap.exists ? stable(snap.data()) : null;
    checks[profile] = {
      exists: snap.exists,
      exactDigest: snap.exists && digest(data) === digest(expected.membership),
      authValid: userValid(user) && !isTechnical(user),
      tenantBound: data?.tenantId === TENANT,
      active: data?.status === 'active',
      activeRole: data?.activeRole || '',
      advisorBound: profile !== 'asesor' || Boolean(data?.advisorId)
    };
  }
  const ok = Object.values(checks).every(row => Object.values(row).every(value => value === true || typeof value === 'string')) &&
    checks.direccion.activeRole === 'SuperAdmin' && checks.operativo.activeRole === 'Operativo' && checks.asesor.activeRole === 'Asesor';
  const result = {
    schemaVersion: 'orbit360-rc12-normal-memberships-verify-v1',
    generatedAt: new Date().toISOString(),
    classification: ok ? 'GO_THREE_NORMAL_MEMBERSHIPS' : 'DATA_CONTRACT_FAILURE',
    decision: ok ? 'THREE_NORMAL_MEMBERSHIPS_VALID' : 'THREE_NORMAL_MEMBERSHIPS_INVALID',
    checks,
    firestoreRead: true,
    authRead: true,
    firestoreWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    ok
  };
  write(FILES.verify, result);
  console.log(JSON.stringify(result, null, 2));
  return ok ? 0 : 41;
}
async function rollback() {
  const { db } = admin();
  const plan = JSON.parse(fs.readFileSync(PRIVATE_PLAN, 'utf8'));
  let deletes = 0;
  await db.runTransaction(async tx => {
    const current = {};
    for (const profile of PROFILES) {
      const ref = db.collection('tenants').doc(TENANT).collection('members').doc(plan.profiles[profile].uid);
      const snap = await tx.get(ref);
      current[profile] = { ref, snap };
      if (!snap.exists) throw new Error(`ROLLBACK_DOCUMENT_MISSING_${profile.toUpperCase()}`);
      if (digest(stable(snap.data())) !== plan.afterDigests[profile]) throw new Error(`ROLLBACK_CONCURRENT_CHANGE_${profile.toUpperCase()}`);
    }
    for (const profile of PROFILES) {
      const before = plan.before?.[profile];
      if (before?.exists) tx.set(current[profile].ref, before.data, { merge: false });
      else { tx.delete(current[profile].ref); deletes += 1; }
    }
  });
  const result = {
    schemaVersion: 'orbit360-rc12-normal-memberships-rollback-v1',
    generatedAt: new Date().toISOString(),
    classification: 'ROLLED_BACK_SAFE',
    decision: 'THREE_MEMBERSHIPS_ROLLED_BACK_EXACT',
    firestoreWrites: deletes,
    rollbackExecuted: true,
    atomic: true,
    productionTouched: false,
    ok: true
  };
  write(FILES.rollback, result);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

let code = 42;
try {
  if (MODE === 'census') code = await census();
  else if (MODE === 'apply') code = await apply();
  else if (MODE === 'verify') code = await verify();
  else if (MODE === 'rollback') code = await rollback();
  else throw new Error('MODE_INVALID');
} catch (error) {
  const file = FILES[MODE] || FILES.census;
  const result = {
    schemaVersion: 'orbit360-rc12-normal-onboarding-error-v1',
    generatedAt: new Date().toISOString(),
    mode: MODE,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: sanitizeError(error),
    firestoreRead: MODE !== 'census' ? true : false,
    authRead: MODE !== 'rollback',
    firestoreWrites: 0,
    rollbackExecuted: MODE === 'rollback',
    deployExecuted: false,
    productionTouched: false,
    ok: false
  };
  write(file, result);
  console.error(JSON.stringify(result, null, 2));
  code = 42;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
process.exit(code);
