#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const OUTPUT = process.env.ORBIT360_MEMBERSHIP_DIAGNOSTIC_OUTPUT ||
  path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-membership-contract-diagnostic.json');
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
const canonicalRole = value => {
  const role = text(value);
  const aliases = {
    Admin: 'AdminTenant',
    Administración: 'AdminTenant',
    Administracion: 'AdminTenant',
    Dirección: 'SuperAdmin',
    Direccion: 'SuperAdmin',
    Director: 'SuperAdmin',
    Directora: 'SuperAdmin',
    Operaciones: 'Operativo'
  };
  return aliases[role] || role;
};
const normalizeMembership = (data, docId) => {
  const rawRoles = data?.roles || data?.rolesAsignados || (data?.role || data?.rol ? [data.role || data.rol] : []);
  const roles = unique(rawRoles.map(canonicalRole));
  const defaultRole = canonicalRole(data?.defaultRole || data?.rolDefault || data?.roleDefault || roles[0]);
  const activeRole = canonicalRole(data?.activeRole || data?.rolActivo || defaultRole || roles[0]);
  return {
    uid: text(data?.uid || data?.userId || data?.id || docId),
    tenantId: text(data?.tenantId || data?.tenant || TENANT),
    roles,
    defaultRole,
    activeRole,
    advisorId: text(data?.advisorId || data?.asesorId),
    status: text(data?.status || data?.estado).toLowerCase()
  };
};
const profile = membership => {
  if (['SuperAdmin', 'AdminTenant'].includes(membership.activeRole)) return 'direccion';
  if (membership.activeRole === 'Operativo') return 'operativo';
  if (membership.activeRole === 'Asesor') return 'asesor';
  return 'otro';
};
const bump = (object, key) => { object[key] = Number(object[key] || 0) + 1; };
const sanitizeError = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 240);

let app;
try {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const auth = getAuth(app);
  const snapshot = await db.collection('tenants').doc(TENANT).collection('members').get();
  const summary = {
    totalDocuments: snapshot.size,
    canonicalProfiles: { direccion: 0, operativo: 0, asesor: 0, otro: 0 },
    eligibleProfiles: { direccion: 0, operativo: 0, asesor: 0, otro: 0 },
    rejectionReasons: {},
    normalizedRoleSets: {},
    statuses: {},
    providerTypes: {},
    technicalIdentityDocuments: 0,
    documentsWithAuthUser: 0,
    documentsWithoutAuthUser: 0
  };

  for (const doc of snapshot.docs) {
    const membership = normalizeMembership(doc.data(), doc.id);
    const reasons = [];
    const roleSet = membership.roles.slice().sort().join('+') || '(sin_roles)';
    bump(summary.normalizedRoleSets, roleSet);
    bump(summary.statuses, membership.status || '(sin_estado)');
    bump(summary.canonicalProfiles, profile(membership));

    if (!membership.uid) reasons.push('membership_uid_missing');
    if (membership.tenantId !== TENANT) reasons.push('membership_tenant_mismatch');
    if (!['active', 'activo'].includes(membership.status)) reasons.push('membership_inactive_or_missing_status');
    if (!membership.roles.length) reasons.push('membership_roles_missing');
    if (!membership.defaultRole || !membership.roles.includes(membership.defaultRole)) reasons.push('membership_default_role_invalid');
    if (!membership.activeRole || !membership.roles.includes(membership.activeRole)) reasons.push('membership_active_role_invalid');
    if (profile(membership) === 'asesor' && !membership.advisorId) reasons.push('advisor_binding_missing');

    let user = null;
    if (membership.uid) {
      try {
        user = await auth.getUser(membership.uid);
        summary.documentsWithAuthUser += 1;
      } catch (error) {
        summary.documentsWithoutAuthUser += 1;
        reasons.push(/user-not-found/i.test(sanitizeError(error)) ? 'auth_user_not_found' : 'auth_user_read_error');
      }
    }
    if (user) {
      const emailDigest = sha(String(user.email || '').toLowerCase());
      const uidDigest = sha(user.uid);
      const technical = emailDigest === TECHNICAL_DIGESTS.email || uidDigest === TECHNICAL_DIGESTS.uid;
      if (technical) {
        summary.technicalIdentityDocuments += 1;
        reasons.push('technical_identity_excluded');
      }
      if (user.disabled) reasons.push('auth_user_disabled');
      if (!user.email) reasons.push('auth_email_missing');
      const providers = (user.providerData || []).map(item => text(item.providerId)).filter(Boolean);
      if (!providers.length) reasons.push('auth_provider_missing');
      providers.forEach(provider => bump(summary.providerTypes, provider));
    }

    [...new Set(reasons)].forEach(reason => bump(summary.rejectionReasons, reason));
    if (!reasons.length) bump(summary.eligibleProfiles, profile(membership));
  }

  const checks = {
    collectionReadable: true,
    hasMembershipDocuments: summary.totalDocuments > 0,
    directionEligible: summary.eligibleProfiles.direccion > 0,
    operativoEligible: summary.eligibleProfiles.operativo > 0,
    asesorEligible: summary.eligibleProfiles.asesor > 0
  };
  const ok = Object.values(checks).every(Boolean);
  const result = {
    schemaVersion: 'orbit360-rc12-membership-contract-diagnostic-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    classification: ok ? 'GO_MEMBERSHIP_CONTRACT' : 'DATA_CONTRACT_FAILURE',
    summary,
    checks,
    exactRootCauseCategories: Object.entries(summary.rejectionReasons).filter(([, count]) => count > 0).map(([reason]) => reason),
    recommendedOwner: 'tenants/{tenantId}/members/{uid} + matching Firebase Auth user',
    firestoreRead: true,
    authRead: true,
    firestoreWrites: 0,
    authWrites: 0,
    userCreates: 0,
    userUpdates: 0,
    passwordReads: 0,
    passwordWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsRawUid: false,
    containsRawEmail: false,
    ok
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(ok ? 0 : 41);
} catch (error) {
  const result = {
    schemaVersion: 'orbit360-rc12-membership-contract-diagnostic-error-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    classification: 'ENVIRONMENT_FAILURE',
    error: sanitizeError(error),
    firestoreRead: true,
    authRead: true,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.error(JSON.stringify(result, null, 2));
  process.exit(42);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
