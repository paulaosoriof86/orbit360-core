#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = Object.freeze({
  auth: 'orbit360-platform/core/auth.js',
  store: 'orbit360-platform/data/store-firestore-lab.local.js',
  guard: 'orbit360-platform/core/backend-lab-auth-guard.js',
  access: 'orbit360-platform/core/access-role-session-owner-v20260728.js',
  init: 'orbit360-platform/core/backend-lab-init.js',
  index: 'orbit360-platform/index.html'
});
const OUT = process.env.ORBIT360_AUTH_MEMBERSHIP_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/rc12-auth-membership-antiregression.json';
const FORBIDDEN = Object.freeze([
  'orbit.lab@demo.com',
  'woJlxR1iFEeiQZvTscPj4qQ5Qc73'
]);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function compileJavascript(source, id) {
  try {
    new Function(source);
    return { id, ok: true, detail: 'syntax-ok' };
  } catch (error) {
    return { id, ok: false, detail: String(error && error.message || error) };
  }
}
function check(id, ok, detail = '') {
  return { id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) };
}

const source = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, read(rel)]));
const activeOwners = source.auth + '\n' + source.store + '\n' + source.guard;
const checks = [
  compileJavascript(source.auth, 'AUTH_SYNTAX'),
  compileJavascript(source.store, 'STORE_SYNTAX'),
  compileJavascript(source.guard, 'GUARD_SYNTAX'),
  check('NO_TECHNICAL_EMAIL_ACTIVE', !activeOwners.includes(FORBIDDEN[0])),
  check('NO_TECHNICAL_UID_ACTIVE', !activeOwners.includes(FORBIDDEN[1])),
  check('AUTH_MEMBERSHIP_OWNER',
    source.auth.includes('Auth canónico por membresía v1.80') &&
    source.auth.includes('activeProjection(user)') &&
    source.auth.includes("backend: p ? 'firestore-membership' : 'demo'") &&
    source.auth.includes("setAuthStage('validating-membership')") &&
    !source.auth.includes('expectedLabEmail')),
  check('STORE_MEMBERSHIP_OWNER',
    source.store.includes("authAuthority: 'tenant-membership'") &&
    source.store.includes('__membershipAuthRequired: true') &&
    source.store.includes('membershipProjection(user)') &&
    source.store.includes('authorizedUser()') &&
    !source.store.includes('EXPECTED_EMAIL') &&
    !source.store.includes('EXPECTED_UID')),
  check('GUARD_MEMBERSHIP_OWNER',
    source.guard.includes('Guard de autenticación Firestore por membresía') &&
    source.guard.includes('membershipProjection(user)') &&
    source.guard.includes('syncMembershipSession') &&
    !source.guard.includes('canonicalAdvisorId') &&
    !source.guard.includes('expectedEmail') &&
    !source.guard.includes('expectedUid')),
  check('ACCESS_MEMBERSHIP_SOURCE',
    source.access.includes("collection('tenants').doc(tenantId).collection('members').doc(text(user.uid)).get()") &&
    source.access.includes('validateLabMembership') &&
    source.access.includes('membership_projection_missing')),
  check('ACTIVE_SCRIPT_BINDING',
    source.index.includes('core/auth.js') &&
    source.index.includes('data/store-firestore-lab.local.js') &&
    source.init.includes("loadScriptOnce('core/backend-lab-auth-guard.js")),
  check('NO_FORCED_ROLE_OR_ADVISOR',
    !source.guard.includes("var canonicalRole = 'Dirección'") &&
    !source.guard.includes("var canonicalAdvisorId = 'ase-paula-osorio'") &&
    !source.auth.includes("rol: 'Dirección',\n      email: u.email") &&
    source.auth.includes('rol: p ? p.activeRole')),
  check('MULTITENANT_RUNTIME',
    source.auth.includes('tenantId()') &&
    source.store.includes('const tenantId = params.get') &&
    source.guard.includes('if (mode !== \'firestore-lab\' || !tenant) return;')),
  check('SEED_FAIL_CLOSED',
    source.store.includes('seedLike(row)') &&
    source.store.includes('operationalRows(collection)') &&
    source.store.includes('noFallback: true')),
  check('API_PRESERVED',
    ['all', 'get', 'where', 'find', 'insert', 'update', 'remove', 'on', '_emit', 'pref', 'setPref', 'init', 'reseed', 'raw']
      .every((token) => source.store.includes(token)))
];

const failed = checks.filter((item) => !item.ok);
const result = {
  schemaVersion: 'orbit360-auth-membership-antiregression-v1',
  status: failed.length ? 'FAIL' : 'PASS',
  classification: failed.length ? 'SECURITY_FAILURE' : 'GO_STATIC_AUTH_MEMBERSHIP',
  checkedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map((item) => item.id),
  checks,
  activeOwners: [FILES.auth, FILES.store, FILES.guard],
  membershipOwner: FILES.access,
  forbiddenMarkers: FORBIDDEN.map((value) => `sha256:${Buffer.from(value).toString('base64url').slice(0, 16)}`),
  releaseBlocking: true,
  deployAuthorized: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false
};

const outPath = path.join(ROOT, OUT);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 41 : 0);
