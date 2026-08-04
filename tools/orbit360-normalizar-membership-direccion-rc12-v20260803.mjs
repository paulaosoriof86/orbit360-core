#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const MODE = String(process.argv[2] || 'diagnose').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE_DIR = process.env.ORBIT360_EVIDENCE_DIR || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const PRIVATE_PLAN = process.env.ORBIT360_MEMBERSHIP_PRIVATE_PLAN || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-rc12-membership-normalization-private.json');
const DIAG_FILE = path.join(EVIDENCE_DIR, 'rc12-membership-rootcause-diagnostic.json');
const APPLY_FILE = path.join(EVIDENCE_DIR, 'rc12-membership-normalization-apply.json');
const VERIFY_FILE = path.join(EVIDENCE_DIR, 'rc12-membership-normalization-verify.json');
const ROLLBACK_FILE = path.join(EVIDENCE_DIR, 'rc12-membership-normalization-rollback.json');
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const ALLOWED_PATCH_FIELDS = Object.freeze(['tenantId','status','roles','defaultRole','activeRole']);
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('base64');
  if (typeof value?.path === 'string' && /DocumentReference/i.test(value?.constructor?.name || '')) return value.path;
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const canonicalRole = value => {
  const role = text(value);
  const aliases = {
    Admin: 'AdminTenant', Administración: 'AdminTenant', Administracion: 'AdminTenant',
    Dirección: 'SuperAdmin', Direccion: 'SuperAdmin', Director: 'SuperAdmin', Directora: 'SuperAdmin',
    Operaciones: 'Operativo'
  };
  return aliases[role] || role;
};
const normalize = (data, docId) => {
  const rawRoles = data?.roles || data?.rolesAsignados || (data?.role || data?.rol ? [data.role || data.rol] : []);
  const roles = unique(rawRoles.map(canonicalRole));
  const defaultRole = canonicalRole(data?.defaultRole || data?.rolDefault || data?.roleDefault || roles[0]);
  const activeRole = canonicalRole(data?.activeRole || data?.rolActivo || defaultRole || roles[0]);
  return {
    uid: text(data?.uid || data?.userId || data?.id || docId),
    tenantId: text(data?.tenantId || data?.tenant || ''),
    roles,
    defaultRole,
    activeRole,
    advisorId: text(data?.advisorId || data?.asesorId),
    status: text(data?.status || data?.estado).toLowerCase()
  };
};
const profile = membership => {
  if (membership.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))) return 'direccion';
  if (membership.roles.includes('Operativo')) return 'operativo';
  if (membership.roles.includes('Asesor')) return 'asesor';
  return 'otro';
};
const authSafe = user => {
  if (!user) return { ok:false, reasons:['auth_user_not_found'] };
  const reasons = [];
  const providers = (user.providerData || []).map(item => text(item.providerId)).filter(Boolean);
  if (user.disabled) reasons.push('auth_user_disabled');
  if (!user.email) reasons.push('auth_email_missing');
  if (!providers.length) reasons.push('auth_provider_missing');
  if (sha(String(user.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(user.uid) === TECHNICAL_DIGESTS.uid) reasons.push('technical_identity_excluded');
  return { ok:reasons.length === 0, reasons, providers };
};
const eligibility = (membership, user) => {
  const reasons = [];
  if (!membership.uid) reasons.push('membership_uid_missing');
  if (membership.tenantId !== TENANT) reasons.push('membership_tenant_mismatch');
  if (!['active','activo'].includes(membership.status)) reasons.push('membership_inactive_or_missing_status');
  if (!membership.roles.length) reasons.push('membership_roles_missing');
  if (!membership.defaultRole || !membership.roles.includes(membership.defaultRole)) reasons.push('membership_default_role_invalid');
  if (!membership.activeRole || !membership.roles.includes(membership.activeRole)) reasons.push('membership_active_role_invalid');
  if (profile(membership) === 'asesor' && !membership.advisorId) reasons.push('advisor_binding_missing');
  reasons.push(...authSafe(user).reasons);
  return unique(reasons);
};
const writeEvidence = (file, payload) => {
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, JSON.stringify({
    ...payload,
    projectId:PROJECT,
    tenantId:TENANT,
    containsPII:false,
    containsSecrets:false,
    containsRawUid:false,
    containsRawEmail:false,
    userCreates:0,
    userUpdates:0,
    passwordReads:0,
    passwordWrites:0,
    authWrites:0,
    reimportExecuted:false,
    rulesApplied:false,
    functionsDeployed:false,
    mainTouched:false,
    mergeExecuted:false
  }, null, 2) + '\n', 'utf8');
};
const readPrivate = () => JSON.parse(fs.readFileSync(PRIVATE_PLAN, 'utf8'));
const safeError = error => String(error?.code || error?.message || error || '').replace(/[\r\n]+/g,' ').slice(0,500);

let app;
try {
  if (!['diagnose','apply','verify','rollback'].includes(MODE)) throw new Error('MODE_INVALID');
  app = getApps()[0] || initializeApp({ credential:applicationDefault(), projectId:PROJECT });
  const db = getFirestore(app);
  const auth = getAuth(app);
  const membersRef = db.collection('tenants').doc(TENANT).collection('members');

  if (MODE === 'diagnose') {
    const snapshot = await membersRef.get();
    const records = [];
    const counters = { total:snapshot.size, profiles:{direccion:0,operativo:0,asesor:0,otro:0}, eligible:{direccion:0,operativo:0,asesor:0,otro:0}, reasons:{} };
    for (const doc of snapshot.docs) {
      const before = doc.data() || {};
      const membership = normalize(before, doc.id);
      const uid = membership.uid || doc.id;
      let user = null;
      try { user = await auth.getUser(uid); } catch (error) {}
      const currentReasons = eligibility(membership, user);
      const currentProfile = profile(membership);
      counters.profiles[currentProfile] += 1;
      if (!currentReasons.length) counters.eligible[currentProfile] += 1;
      currentReasons.forEach(reason => { counters.reasons[reason] = Number(counters.reasons[reason] || 0) + 1; });

      const patch = {};
      if (!membership.tenantId || membership.tenantId !== TENANT) patch.tenantId = TENANT;
      if (!['active','activo'].includes(membership.status)) patch.status = 'active';
      if (membership.roles.length) patch.roles = membership.roles;
      const preferredDirection = membership.roles.includes('SuperAdmin') ? 'SuperAdmin' : membership.roles.includes('AdminTenant') ? 'AdminTenant' : '';
      if (preferredDirection) {
        if (membership.defaultRole !== preferredDirection || !membership.roles.includes(membership.defaultRole)) patch.defaultRole = preferredDirection;
        if (membership.activeRole !== preferredDirection || !membership.roles.includes(membership.activeRole)) patch.activeRole = preferredDirection;
      }
      const after = { ...before, ...patch };
      const afterMembership = normalize(after, doc.id);
      const afterReasons = eligibility(afterMembership, user);
      const changedFields = Object.keys(patch).filter(field => digest(before[field]) !== digest(after[field]));
      const forbiddenChanges = changedFields.filter(field => !ALLOWED_PATCH_FIELDS.includes(field));
      const safeUser = authSafe(user);
      const directionCapable = profile(membership) === 'direccion' || profile(afterMembership) === 'direccion';
      const correctable = directionCapable && safeUser.ok && forbiddenChanges.length === 0 && afterReasons.length === 0 && uid === doc.id;
      records.push({ doc, before, after, membership, afterMembership, currentReasons, afterReasons, changedFields, correctable, user });
    }

    const eligibleDirection = records.filter(item => profile(item.membership) === 'direccion' && item.currentReasons.length === 0);
    const correctableDirection = records.filter(item => item.correctable && item.changedFields.length > 0);
    const noWriteDirection = records.filter(item => item.correctable && item.changedFields.length === 0);
    const selectable = eligibleDirection.length === 1 ? eligibleDirection : correctableDirection.length === 1 && eligibleDirection.length === 0 ? correctableDirection : noWriteDirection.length === 1 && eligibleDirection.length === 0 ? noWriteDirection : [];
    const selected = selectable[0] || null;
    const ambiguous = eligibleDirection.length > 1 || correctableDirection.length > 1 || (eligibleDirection.length && correctableDirection.length);
    const exact = Boolean(selected && !ambiguous);
    const decision = exact
      ? (selected.changedFields.length ? 'EXACT_ONE_DIRECTION_NORMALIZATION_READY' : 'EXACT_ONE_DIRECTION_ALREADY_ELIGIBLE')
      : 'DIRECTION_MEMBERSHIP_AMBIGUOUS_OR_NOT_CORRECTABLE';
    if (exact) {
      fs.writeFileSync(PRIVATE_PLAN, JSON.stringify({
        schemaVersion:'orbit360-rc12-membership-private-plan-v1',
        projectId:PROJECT,
        tenantId:TENANT,
        docId:selected.doc.id,
        before:stable(selected.before),
        after:stable(selected.after),
        beforeDigest:digest(selected.before),
        afterDigest:digest(selected.after),
        changedFields:selected.changedFields,
        writeRequired:selected.changedFields.length > 0
      }, null, 2) + '\n', { encoding:'utf8', mode:0o600 });
    }
    const payload = {
      schemaVersion:'orbit360-rc12-membership-rootcause-diagnostic-v2',
      generatedAt:new Date().toISOString(),
      classification:exact ? (selected.changedFields.length ? 'DATA_CONTRACT_FAILURE_CORRECTABLE' : 'VALIDATOR_STALE') : 'DATA_CONTRACT_FAILURE',
      decision,
      counters,
      candidateCounts:{ eligibleDirection:eligibleDirection.length, correctableDirection:correctableDirection.length, noWriteDirection:noWriteDirection.length },
      selectedProfile:exact ? 'direccion' : '',
      selectedDocumentDigest:exact ? sha(selected.doc.id) : '',
      selectedBeforeDigest:exact ? digest(selected.before) : '',
      selectedAfterDigest:exact ? digest(selected.after) : '',
      changedFields:exact ? selected.changedFields : [],
      exactOneCorrectableDirection:exact,
      ambiguous,
      firestoreRead:true,
      authRead:true,
      firestoreWrites:0,
      deployExecuted:false,
      productionTouched:false,
      ok:exact
    };
    writeEvidence(DIAG_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(exact ? 0 : 41);
  }

  const plan = readPrivate();
  if (plan.projectId !== PROJECT || plan.tenantId !== TENANT || !plan.docId || !plan.beforeDigest || !plan.afterDigest) throw new Error('PRIVATE_PLAN_INVALID');
  const ref = membersRef.doc(plan.docId);

  if (MODE === 'apply') {
    let writes = 0;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('MEMBERSHIP_DISAPPEARED');
      const current = snap.data() || {};
      if (digest(current) !== plan.beforeDigest) throw new Error('MEMBERSHIP_CHANGED_SINCE_DIAGNOSIS');
      const changed = Array.isArray(plan.changedFields) ? plan.changedFields : [];
      if (changed.some(field => !ALLOWED_PATCH_FIELDS.includes(field))) throw new Error('PATCH_FIELD_NOT_ALLOWED');
      if (plan.writeRequired) {
        tx.set(ref, plan.after, { merge:false });
        writes = 1;
      }
    });
    const afterSnap = await ref.get();
    const observed = afterSnap.data() || {};
    const ok = digest(observed) === plan.afterDigest;
    const payload = {
      schemaVersion:'orbit360-rc12-membership-normalization-apply-v1',
      generatedAt:new Date().toISOString(),
      classification:ok ? 'DATA_CONTRACT_NORMALIZED' : 'DATA_CONTRACT_FAILURE',
      decision:ok ? (writes ? 'NORMALIZATION_APPLIED' : 'NO_WRITE_REQUIRED') : 'NORMALIZATION_POSTCHECK_FAILED',
      selectedDocumentDigest:sha(plan.docId),
      beforeDigest:plan.beforeDigest,
      afterDigest:plan.afterDigest,
      changedFields:plan.changedFields,
      idempotent:true,
      atomic:true,
      firestoreRead:true,
      authRead:false,
      firestoreWrites:writes,
      deployExecuted:false,
      productionTouched:false,
      ok
    };
    writeEvidence(APPLY_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(ok ? 0 : 41);
  }

  if (MODE === 'verify') {
    const snapshot = await membersRef.get();
    const eligible = { direccion:0, operativo:0, asesor:0, otro:0 };
    const reasons = {};
    for (const doc of snapshot.docs) {
      const membership = normalize(doc.data() || {}, doc.id);
      let user = null;
      try { user = await auth.getUser(membership.uid || doc.id); } catch (error) {}
      const rowReasons = eligibility(membership,user);
      rowReasons.forEach(reason => { reasons[reason] = Number(reasons[reason] || 0) + 1; });
      if (!rowReasons.length) eligible[profile(membership)] += 1;
    }
    const selected = await ref.get();
    const selectedDigestMatch = selected.exists && digest(selected.data() || {}) === plan.afterDigest;
    const checks = {
      selectedDigestMatch,
      directionEligible:eligible.direccion > 0,
      operativoEligible:eligible.operativo > 0,
      asesorEligible:eligible.asesor > 0
    };
    const ok = Object.values(checks).every(Boolean);
    const payload = {
      schemaVersion:'orbit360-rc12-membership-normalization-verify-v1',
      generatedAt:new Date().toISOString(),
      classification:ok ? 'GO_MEMBERSHIP_CONTRACT' : 'DATA_CONTRACT_FAILURE',
      decision:ok ? 'DIRECTION_OPERATIVO_ASESOR_PASS' : 'MEMBERSHIP_CONTRACT_STILL_INVALID',
      eligibleProfiles:eligible,
      rejectionReasons:reasons,
      checks,
      selectedDocumentDigest:sha(plan.docId),
      firestoreRead:true,
      authRead:true,
      firestoreWrites:0,
      deployExecuted:false,
      productionTouched:false,
      ok
    };
    writeEvidence(VERIFY_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(ok ? 0 : 41);
  }

  if (MODE === 'rollback') {
    let writes = 0;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('MEMBERSHIP_DISAPPEARED_BEFORE_ROLLBACK');
      const current = snap.data() || {};
      if (digest(current) === plan.beforeDigest) return;
      if (digest(current) !== plan.afterDigest) throw new Error('ROLLBACK_CURRENT_DIGEST_UNEXPECTED');
      tx.set(ref, plan.before, { merge:false });
      writes = 1;
    });
    const observed = await ref.get();
    const restored = observed.exists && digest(observed.data() || {}) === plan.beforeDigest;
    const payload = {
      schemaVersion:'orbit360-rc12-membership-normalization-rollback-v1',
      generatedAt:new Date().toISOString(),
      classification:restored ? 'DATA_CONTRACT_ROLLBACK_SAFE' : 'ENVIRONMENT_FAILURE',
      decision:restored ? 'MEMBERSHIP_ROLLBACK_EXACT' : 'MEMBERSHIP_ROLLBACK_FAILED',
      selectedDocumentDigest:sha(plan.docId),
      restoredDigest:plan.beforeDigest,
      firestoreRead:true,
      authRead:false,
      firestoreWrites:writes,
      deployExecuted:false,
      productionTouched:false,
      ok:restored
    };
    writeEvidence(ROLLBACK_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(restored ? 0 : 42);
  }
} catch (error) {
  const target = MODE === 'apply' ? APPLY_FILE : MODE === 'verify' ? VERIFY_FILE : MODE === 'rollback' ? ROLLBACK_FILE : DIAG_FILE;
  const payload = {
    schemaVersion:'orbit360-rc12-membership-normalization-error-v1',
    generatedAt:new Date().toISOString(),
    mode:MODE,
    classification:'ENVIRONMENT_FAILURE',
    decision:'STOP_RETRY',
    error:safeError(error),
    firestoreRead:MODE !== 'diagnose' || true,
    authRead:MODE === 'diagnose' || MODE === 'verify',
    firestoreWrites:0,
    deployExecuted:false,
    productionTouched:false,
    ok:false
  };
  writeEvidence(target,payload);
  console.error(JSON.stringify(payload,null,2));
  process.exit(42);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
