#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const MODE = String(process.argv[2] || 'plan').trim();
const PRIVATE = process.env.ORBIT360_ACCESS_CONFIG_PRIVATE || path.join(process.env.RUNNER_TEMP || process.cwd(), 'orbit360-auth-access-config-v3-private.json');
const OUT = process.env.ORBIT360_ACCESS_CONFIG_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-config-repair-sanitized-v3-20260805.json';
const MANIFEST = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const LOCKED_COMMIT = '34fa84a60ebc38b0035ed664da87ca78aaa73ff7';
const LOCKED_PATH = MANIFEST;
const TECHNICAL_DIGESTS = Object.freeze({
  email: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const PROFILE_KEYS = ['direction', 'operations', 'advisor'];
const ALLOWED_FIELDS = ['email', 'roles', 'defaultRole', 'activeRole', 'countries', 'dataScopes'];

const text = (value, max = 1000) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 300).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const unique = values => [...new Set([].concat(values || []).map(item => text(item, 160)).filter(Boolean))];
const validEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(value, 320).toLowerCase());
const write = (file, value) => { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); };
const safeError = error => text(error?.message || error, 800).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]');

function readLockedRoster() {
  const raw = execFileSync('git', ['show', `${LOCKED_COMMIT}:${LOCKED_PATH}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(raw).approvedRoster || {};
}
function roleScopes(profile) {
  if (profile === 'direction' || profile === 'operations') {
    return { clientes: 'todos', polizas: 'todos', cobros: 'todos', gestiones: 'todos', leads: 'todos' };
  }
  return { clientes: 'propios', polizas: 'propios', cobros: 'ninguno', gestiones: 'propios', leads: 'propios' };
}
function countriesFrom(value) {
  return unique([...(value?.countries || []), ...(value?.paises || []), value?.country, value?.pais].filter(Boolean).map(item => text(item, 8).toUpperCase()));
}
function currentEmail(row) {
  return text(row?.email || row?.correo || row?.userEmail, 320).toLowerCase();
}
function advisorName(row) {
  return text(row?.nombre || row?.name || row?.displayName || row?.nombreCompleto, 240);
}
function changedFields(current, desired) {
  return ALLOWED_FIELDS.filter(field => digest(stable(current?.[field])) !== digest(stable(desired?.[field])));
}

let app;
try {
  if (!['plan', 'apply'].includes(MODE)) throw new Error('PIPELINE_MECHANISM_FAILURE:MODE_NOT_SUPPORTED');
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);

  if (MODE === 'plan') {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const locked = readLockedRoster();
    const sources = [
      { source: 'canonical', ref: db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items') },
      { source: 'legacy_tenantId', ref: db.collection('tenantId').doc(TENANT).collection('asesores') },
      { source: 'legacy_tenants', ref: db.collection('tenants').doc(TENANT).collection('asesores') }
    ];
    const advisors = new Map();
    for (const source of sources) {
      const snap = await source.ref.get();
      for (const doc of snap.docs) if (!advisors.has(doc.id)) advisors.set(doc.id, { id: doc.id, source: source.source, path: doc.ref.path, data: doc.data() || {} });
    }
    const members = await db.collection('tenants').doc(TENANT).collection('members').get();
    const technical = members.docs.find(doc => {
      const row = doc.data() || {};
      return sha(String(row.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(text(row.uid || doc.id)) === TECHNICAL_DIGESTS.uid;
    });
    const tenantCountries = countriesFrom(technical?.data() || {});
    if (!tenantCountries.length) throw new Error('DATA_CONTRACT_FAILURE:TENANT_COUNTRIES_FALLBACK_MISSING');

    const plans = [];
    for (const profile of PROFILE_KEYS) {
      const contract = manifest.approvedRoster?.[profile];
      const source = locked?.[profile];
      if (!contract?.personRef || !Array.isArray(contract.roles) || !contract.roles.length || !contract.defaultRole) throw new Error(`DATA_CONTRACT_FAILURE:APPROVED_ROSTER_${profile.toUpperCase()}_ACCESS_CONTRACT_MISSING`);
      const email = text(source?.email, 320).toLowerCase();
      if (!validEmail(email) || sha(email) !== contract.emailSha256 || norm(source?.person) !== norm(contract.personRef)) throw new Error(`SECURITY_FAILURE:APPROVED_ROSTER_${profile.toUpperCase()}_IDENTITY_LOCK_MISMATCH`);
      const nameTokens = norm(contract.personRef).split(' ').filter(Boolean);
      const matches = [...advisors.values()].filter(item => {
        const byDigest = currentEmail(item.data) && sha(currentEmail(item.data)) === contract.emailSha256;
        const name = norm(advisorName(item.data));
        return byDigest || nameTokens.every(token => name.includes(token));
      });
      if (matches.length !== 1) throw new Error(`DATA_CONTRACT_FAILURE:ADVISOR_${profile.toUpperCase()}_${matches.length ? 'AMBIGUOUS' : 'NOT_FOUND'}`);
      const advisor = matches[0];
      const existingEmail = currentEmail(advisor.data);
      if (validEmail(existingEmail) && sha(existingEmail) !== contract.emailSha256) throw new Error(`SECURITY_FAILURE:ADVISOR_${profile.toUpperCase()}_EMAIL_CONFLICT`);
      const countries = countriesFrom(advisor.data).length ? countriesFrom(advisor.data) : tenantCountries;
      const desired = {
        email,
        roles: contract.roles,
        defaultRole: contract.defaultRole,
        activeRole: contract.defaultRole,
        countries,
        dataScopes: roleScopes(profile)
      };
      const fields = changedFields(advisor.data, desired);
      plans.push({
        profile,
        path: advisor.path,
        source: advisor.source,
        advisorId: advisor.id,
        before: Object.fromEntries(ALLOWED_FIELDS.map(field => [field, stable(advisor.data?.[field])])),
        desired,
        changedFields: fields
      });
    }
    const privatePlan = {
      schemaVersion: 'orbit360-auth-access-config-repair-private-v3',
      projectId: PROJECT,
      tenantId: TENANT,
      generatedAt: new Date().toISOString(),
      tenantCountries,
      plans,
      containsPII: true,
      privateEvidenceOnly: true
    };
    write(PRIVATE, privatePlan);
    write(OUT, {
      schemaVersion: 'orbit360-auth-access-config-repair-sanitized-v3',
      stage: 'AUTH_ACCESS_CONFIG_REPAIR_PLAN_PASS',
      decision: 'GO_APPROVED_SOURCE_ACCESS_CONFIG_DIFF',
      classification: 'VALIDATOR_STALE_ROOTFIX_READY',
      profiles: plans.map(item => ({
        profile: item.profile,
        source: item.source,
        advisorIdHash: sha(item.advisorId),
        pathHash: sha(item.path),
        changedFields: item.changedFields,
        desiredRoles: item.desired.roles,
        desiredDefaultRole: item.desired.defaultRole,
        desiredCountries: item.desired.countries,
        dataScopeDigest: digest(item.desired.dataScopes)
      })),
      documentsObserved: plans.length,
      proposedDocumentWrites: plans.filter(item => item.changedFields.length).length,
      proposedFieldWrites: plans.reduce((sum, item) => sum + item.changedFields.length, 0),
      firestoreWrites: 0,
      authWrites: 0,
      membershipWrites: 0,
      crmWrites: 0,
      containsPII: false,
      containsSecrets: false,
      ok: true
    });
    console.log(JSON.stringify({ ok: true, stage: 'AUTH_ACCESS_CONFIG_REPAIR_PLAN_PASS', profiles: plans.map(item => item.profile) }));
  } else {
    if (!fs.existsSync(PRIVATE)) throw new Error('PIPELINE_MECHANISM_FAILURE:PRIVATE_ACCESS_CONFIG_PLAN_MISSING');
    const plan = JSON.parse(fs.readFileSync(PRIVATE, 'utf8'));
    if (plan.tenantId !== TENANT || !Array.isArray(plan.plans) || plan.plans.length !== 3) throw new Error('DATA_CONTRACT_FAILURE:PRIVATE_ACCESS_CONFIG_PLAN_INVALID');
    let documentsWritten = 0;
    let fieldsWritten = 0;
    await db.runTransaction(async tx => {
      for (const item of plan.plans) {
        const ref = db.doc(item.path);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error(`DATA_CONTRACT_FAILURE:${item.profile.toUpperCase()}_ADVISOR_DISAPPEARED`);
        const row = snap.data() || {};
        const currentView = Object.fromEntries(ALLOWED_FIELDS.map(field => [field, stable(row?.[field])]));
        if (digest(currentView) !== digest(item.before)) throw new Error(`DATA_CONTRACT_FAILURE:${item.profile.toUpperCase()}_ADVISOR_CHANGED_AFTER_PLAN`);
        const patch = {};
        for (const field of item.changedFields || []) {
          if (!ALLOWED_FIELDS.includes(field)) throw new Error('SECURITY_FAILURE:FIELD_OUTSIDE_ACCESS_CONFIG_ALLOWLIST');
          patch[field] = item.desired[field];
        }
        if (Object.keys(patch).length) {
          tx.update(ref, patch);
          documentsWritten += 1;
          fieldsWritten += Object.keys(patch).length;
        }
      }
    });
    for (const item of plan.plans) {
      const row = (await db.doc(item.path).get()).data() || {};
      for (const field of ALLOWED_FIELDS) if (digest(stable(row[field])) !== digest(stable(item.desired[field]))) throw new Error(`DATA_CONTRACT_FAILURE:${item.profile.toUpperCase()}_${field.toUpperCase()}_POSTVERIFY_FAILED`);
    }
    write(OUT, {
      schemaVersion: 'orbit360-auth-access-config-repair-sanitized-v3',
      stage: 'AUTH_ACCESS_CONFIG_REPAIR_APPLY_PASS',
      decision: 'GO_TENANT_ACCESS_CONFIGURATION_COMPLETE',
      classification: 'DATA_CONTRACT_CORRECTED',
      profilesConfigured: plan.plans.map(item => item.profile),
      documentsWritten,
      fieldsWritten,
      allowedFields: ALLOWED_FIELDS,
      authWrites: 0,
      membershipWrites: 0,
      crmWrites: 0,
      containsPII: false,
      containsSecrets: false,
      ok: true
    });
    console.log(JSON.stringify({ ok: true, stage: 'AUTH_ACCESS_CONFIG_REPAIR_APPLY_PASS', documentsWritten, fieldsWritten }));
  }
} catch (error) {
  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  write(OUT, {
    schemaVersion: 'orbit360-auth-access-config-repair-sanitized-v3',
    stage: MODE === 'plan' ? 'STOP_RETRY_ACCESS_CONFIG_PLAN' : 'STOP_RETRY_ACCESS_CONFIG_APPLY',
    decision: 'STOP_RETRY',
    classification,
    errorCode: text(message.split(':')[1] || 'ACCESS_CONFIG_REPAIR_FAILED', 180),
    firestoreWrites: 0,
    authWrites: 0,
    membershipWrites: 0,
    crmWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ok: false
  });
  console.error(JSON.stringify({ ok: false, stage: MODE === 'plan' ? 'STOP_RETRY_ACCESS_CONFIG_PLAN' : 'STOP_RETRY_ACCESS_CONFIG_APPLY', classification }));
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
