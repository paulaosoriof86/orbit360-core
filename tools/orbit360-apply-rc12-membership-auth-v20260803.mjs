#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const STORE = path.join(ROOT, 'orbit360-platform/data/store-firestore-lab.local.js');
const AUTH = path.join(ROOT, 'orbit360-platform/core/auth.js');
const EVIDENCE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-membership-auth-source.json');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function replaceOnce(source, before, after, id) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) throw new Error(`${id}: expected exactly one source match`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let store = read(STORE);
store = replaceOnce(store,
`  var EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';`,
`  var AUTH_AUTHORITY = 'tenant-membership';`,
'STORE_TECHNICAL_IDENTITY');
store = replaceOnce(store,
`    expectedUid: EXPECTED_UID,
    expectedEmail: EXPECTED_EMAIL,`,
`    authAuthority: AUTH_AUTHORITY,
    membershipRequired: true,`,
'STORE_STATE_AUTHORITY');
store = replaceOnce(store,
`      row.ownerEmail = row.ownerEmail || u.email || EXPECTED_EMAIL;`,
`      row.ownerEmail = row.ownerEmail || u.email || '';`,
'STORE_WRITE_OWNER_EMAIL');
store = replaceOnce(store,
`  function canonicalAuthUser(){
    var user = updateAuthState();
    var email = String(user && user.email || '').toLowerCase();
    var uid = String(user && user.uid || '');
    if (!user || email !== EXPECTED_EMAIL.toLowerCase() || (EXPECTED_UID && uid !== EXPECTED_UID)) return null;
    return user;
  }`,
`  function activeMembershipProjection(user){
    try {
      var projection = w.Orbit && w.Orbit.auth && w.Orbit.auth.productUser;
      var status = String(projection && projection.status || '').trim().toLowerCase();
      if (!projection || projection.__labMembershipProjection !== true || projection.productReadOnly !== true) return null;
      if (String(projection.uid || '') !== String(user && user.uid || '')) return null;
      if (String(projection.tenantId || '') !== tenantId) return null;
      if (status !== 'active' && status !== 'activo') return null;
      if (!Array.isArray(projection.roles) || !projection.roles.length) return null;
      return projection;
    } catch(e) { return null; }
  }

  function canonicalAuthUser(){
    var user = updateAuthState();
    if (!user || !activeMembershipProjection(user)) return null;
    return user;
  }`,
'STORE_CANONICAL_AUTH_USER');
store = replaceOnce(store,
`    expectedUid: EXPECTED_UID,
    expectedEmail: EXPECTED_EMAIL,`,
`    authAuthority: AUTH_AUTHORITY,
    membershipRequired: true,`,
'STORE_BACKEND_AUTHORITY');
store = replaceOnce(store,
`    apiVersion: 'v1.75-canonical-read-owner-v79',`,
`    apiVersion: 'v1.76-membership-auth-owner-v80',`,
'STORE_API_VERSION_STATE');
store = replaceOnce(store,
`    apiVersion: 'v1.75-canonical-read-owner-v79',`,
`    apiVersion: 'v1.76-membership-auth-owner-v80',`,
'STORE_API_VERSION_BACKEND');
store = replaceOnce(store,
`    __authGatedSnapshots: true,
    __canonicalReadModelV79: true,`,
`    __authGatedSnapshots: true,
    __membershipAuthRequired: true,
    __canonicalReadModelV79: true,`,
'STORE_API_MEMBERSHIP_FLAG');
store = replaceOnce(store,
`    authGatedSnapshots: true,
    singleReadOwner: true,`,
`    authGatedSnapshots: true,
    membershipAuthRequired: true,
    singleReadOwner: true,`,
'STORE_BACKEND_MEMBERSHIP_FLAG');
write(STORE, store);

let auth = read(AUTH);
auth = replaceOnce(auth,
`  const LAB_EMAIL = 'orbit.lab@demo.com';`,
`  const LAB_EMAIL = '';`,
'AUTH_TECHNICAL_EMAIL');
auth = replaceOnce(auth,
`  function expectedLabEmail() {
    return (window.OrbitBackend && window.OrbitBackend.expectedEmail) || LAB_EMAIL;
  }`,
`  function expectedLabEmail() {
    return (window.OrbitBackend && window.OrbitBackend.loginHintEmail) || LAB_EMAIL;
  }`,
'AUTH_LOGIN_HINT');
auth = replaceOnce(auth,
`  function mapFbUser(u) {
    if (!u) return null;
    return {
      nombre: u.displayName || (u.email || 'Usuario LAB'),
      rol: 'Dirección',
      email: u.email || '',
      uid: u.uid || '',
      tipo: 'interno',
      backend: 'firestore-lab'
    };
  }`,
`  function mapFbUser(u) {
    if (!u) return null;
    const projection = window.Orbit && Orbit.auth && Orbit.auth.productUser;
    return {
      nombre: u.displayName || (u.email || 'Usuario'),
      rol: projection && (projection.activeRole || projection.defaultRole) || '',
      email: u.email || '',
      uid: u.uid || '',
      tipo: 'interno',
      backend: 'firestore-membership',
      tenantId: projection && projection.tenantId || ''
    };
  }`,
'AUTH_MAP_USER');
auth = replaceOnce(auth,
`    function forceLabFields() {
      if (!isLab()) return;
      if (email && (!email.value || email.value === DEMO_EMAIL)) email.value = labEmail;
      if (pass && pass.value === DEMO_PASS) pass.value = '';
    }

    if (labMode) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (email) email.value = (!email.value || email.value === DEMO_EMAIL) ? labEmail : email.value;
      if (pass && pass.value === DEMO_PASS) pass.value = '';
      setTimeout(forceLabFields, 60);
      setTimeout(forceLabFields, 250);
      setTimeout(forceLabFields, 700);
      return;
    }`,
`    function forceLabFields() {
      if (!isLab()) return;
      if (email && email.value === DEMO_EMAIL) email.value = labEmail || '';
      if (pass && pass.value === DEMO_PASS) pass.value = '';
    }

    if (labMode) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (email && email.value === DEMO_EMAIL) email.value = labEmail || '';
      if (pass && pass.value === DEMO_PASS) pass.value = '';
      setTimeout(forceLabFields, 60);
      setTimeout(forceLabFields, 250);
      setTimeout(forceLabFields, 700);
      return;
    }`,
'AUTH_LOGIN_DEFAULTS');
auth = replaceOnce(auth,
`      let email = (emailEl || {}).value || DEMO_EMAIL;`,
`      let email = (emailEl || {}).value || (labMode ? '' : DEMO_EMAIL);`,
'AUTH_EMAIL_INPUT');
auth = replaceOnce(auth,
`      if (labMode && (!email || email === DEMO_EMAIL)) {
        email = expectedLabEmail();
        if (emailEl) emailEl.value = email;
      }`,
`      if (labMode && (!email || email === DEMO_EMAIL)) throw new Error('AUTH_EMAIL_REQUIRED');`,
'AUTH_EMAIL_REQUIRED');
auth = replaceOnce(auth,
`        paintError('');
        showApp();`,
`        paintError('');
        if (labMode) setAuthStage('validating-membership');
        else showApp();`,
'AUTH_SHOW_APP_AFTER_LOGIN');
auth = replaceOnce(auth,
`        if (code === 'AUTH_PASSWORD_REQUIRED') paintError('Ingresa la contraseña asignada para continuar.');
        else if (code === 'AUTH_DEMO_PASSWORD_BLOCKED') paintError('Usa la contraseña asignada para este entorno, no la contraseña de demostración.');`,
`        if (code === 'AUTH_EMAIL_REQUIRED') paintError('Ingresa el correo asignado a tu usuario.');
        else if (code === 'AUTH_PASSWORD_REQUIRED') paintError('Ingresa la contraseña asignada para continuar.');
        else if (code === 'AUTH_DEMO_PASSWORD_BLOCKED') paintError('Usa la contraseña asignada para este entorno, no la contraseña de demostración.');`,
'AUTH_EMAIL_ERROR');
auth = replaceOnce(auth,
`        auth.onAuthStateChanged(function(u){ if (u) showApp(); else showLogin(); });`,
`        auth.onAuthStateChanged(function(u){
          if (u) setAuthStage('validating-membership');
          else showLogin();
        });`,
'AUTH_STATE_MEMBERSHIP_GATE');
write(AUTH, auth);

const checks = {
  storeNoTechnicalEmail: !store.includes('orbit.lab@demo.com'),
  storeNoTechnicalUid: !store.includes('woJlxR1iFEeiQZvTscPj4qQ5Qc73'),
  storeMembershipAuthority: store.includes("AUTH_AUTHORITY = 'tenant-membership'") && store.includes('__membershipAuthRequired: true'),
  storeProjectionGate: store.includes('activeMembershipProjection(user)') && store.includes('__labMembershipProjection'),
  authNoTechnicalPrefill: !auth.includes("const LAB_EMAIL = 'orbit.lab@demo.com'") && auth.includes("const LAB_EMAIL = ''"),
  authRequiresEnteredEmail: auth.includes("AUTH_EMAIL_REQUIRED"),
  authWaitsMembership: auth.includes("setAuthStage('validating-membership')") && !auth.includes('auth.onAuthStateChanged(function(u){ if (u) showApp()')
};
const ok = Object.values(checks).every(Boolean);
fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, JSON.stringify({
  schemaVersion: 'orbit360-rc12-membership-auth-source-v1',
  status: ok ? 'PASS' : 'FAIL',
  classification: ok ? 'GO_STATIC_MEMBERSHIP_AUTH_SOURCE' : 'FUNCTIONAL_DEFECT',
  checks,
  files: [
    'orbit360-platform/core/backend-lab-auth-guard.js',
    'orbit360-platform/core/auth.js',
    'orbit360-platform/data/store-firestore-lab.local.js'
  ],
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false
}, null, 2) + '\n', 'utf8');
if (!ok) process.exit(41);
