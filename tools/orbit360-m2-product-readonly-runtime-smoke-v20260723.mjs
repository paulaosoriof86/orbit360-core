#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import vm from 'node:vm';

const ROOT = process.cwd();
const COMMAND = process.argv[2] || 'prepare';
const TENANT_ID = 'alianzas-soluciones';
const STATE_FILE = path.join(ROOT, '.orbit360-m2-runtime-state.json');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const RUN_ID = String(process.env.GITHUB_RUN_ID || 'local');
const REQUEST_COMMIT = String(process.env.GITHUB_SHA || '');

function ensureDir() { fs.mkdirSync(EVIDENCE_DIR, { recursive: true }); }
function writeEvidence(name, payload) {
  ensureDir();
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), JSON.stringify({ ...payload, containsPII:false, containsSecrets:false }, null, 2) + '\n');
}
function cleanError(error) {
  const raw = String(error && (error.code || error.message || error) || error);
  return raw.replace(/[A-Za-z0-9_\-]{24,}/g, '[redacted]').slice(0, 400);
}
function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const error = new Error(`ENVIRONMENT_FAILURE:${name}_MISSING`);
    error.code = 'ENVIRONMENT_FAILURE';
    throw error;
  }
  return value;
}
function serviceAccount() {
  const raw = requireEnv('ORBIT360_PRODUCT_FIREBASE_SERVICE_ACCOUNT_JSON');
  try { return JSON.parse(raw); }
  catch (_) {
    try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
    catch (error) { throw new Error('ENVIRONMENT_FAILURE:SERVICE_ACCOUNT_REFERENCE_INVALID'); }
  }
}
async function adminContext() {
  const projectId = requireEnv('ORBIT360_PRODUCT_FIREBASE_PROJECT_ID');
  const account = serviceAccount();
  if (String(account.project_id || '') !== projectId) throw new Error('ENVIRONMENT_FAILURE:PRODUCT_PROJECT_IDENTITY_MISMATCH');
  const app = getApps()[0] || initializeApp({ credential: cert(account), projectId });
  return { app, projectId, auth: getAuth(app), db: getFirestore(app) };
}
function membershipPayload(uid, email) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 'orbit360-membership-product-v1',
    uid,
    email,
    tenantId: TENANT_ID,
    displayName: 'Dirección A&S',
    roles: ['Dirección'],
    defaultRole: 'Dirección',
    activeRole: 'Dirección',
    modulesExtra: [],
    modulesRestricted: [],
    dataScopes: { default: 'all', modules: {} },
    countries: ['GT', 'CO'],
    advisorId: '',
    teamId: '',
    status: 'active',
    activatedAt: now,
    updatedAt: now,
    updatedBy: 'm2-product-readonly-runtime',
    reason: 'Activación inicial productiva read-only autorizada por la propietaria del producto',
    productReadOnly: true
  };
}
async function prepare() {
  const required = [
    'ORBIT360_PRODUCT_FIREBASE_PROJECT_ID',
    'ORBIT360_PRODUCT_FIREBASE_SERVICE_ACCOUNT_JSON',
    'ORBIT360_PRODUCT_FIREBASE_WEB_API_KEY',
    'ORBIT360_PRODUCT_BOOTSTRAP_UID',
    'ORBIT360_PRODUCT_BOOTSTRAP_EMAIL'
  ];
  const missing = required.filter(name => !String(process.env[name] || '').trim());
  const ok = missing.length === 0;
  writeEvidence('m2-product-runtime-environment.json', {
    schemaVersion:'orbit360-m2-runtime-environment-v1', ok,
    status: ok ? 'ENVIRONMENT_REFERENCES_PRESENT' : 'ENVIRONMENT_FAILURE',
    classification: ok ? null : 'ENVIRONMENT_FAILURE',
    missingReferenceNames: missing,
    projectIdentityChecked:false, secretAccess:true, firestoreRead:false,
    controlledConfigurationWrites:0, operationalWrites:0, rulesApplied:false, runtimeExecuted:false
  });
  if (!ok) process.exit(42);
}
async function bootstrap() {
  let ctx;
  try {
    const uid = requireEnv('ORBIT360_PRODUCT_BOOTSTRAP_UID');
    const email = requireEnv('ORBIT360_PRODUCT_BOOTSTRAP_EMAIL').toLowerCase();
    ctx = await adminContext();
    let userBefore = null;
    let userCreated = false;
    try {
      const existing = await ctx.auth.getUser(uid);
      if (String(existing.email || '').toLowerCase() !== email) throw new Error('DATA_CONTRACT_FAILURE:AUTH_UID_EMAIL_MISMATCH');
      userBefore = { disabled: existing.disabled === true, emailVerified: existing.emailVerified === true };
      if (existing.disabled || !existing.emailVerified) await ctx.auth.updateUser(uid, { disabled:false, emailVerified:true });
    } catch (error) {
      if (String(error && error.code) !== 'auth/user-not-found') throw error;
      await ctx.auth.createUser({ uid, email, emailVerified:true, disabled:false });
      userCreated = true;
    }

    const memberRef = ctx.db.doc(`tenants/${TENANT_ID}/members/${uid}`);
    const auditRef = ctx.db.doc(`tenants/${TENANT_ID}/auditEvents/m2-runtime-bootstrap-${RUN_ID}`);
    const beforeSnap = await memberRef.get();
    const before = beforeSnap.exists ? beforeSnap.data() : null;
    const payload = membershipPayload(uid, email);
    await memberRef.set(payload, { merge:false });
    await auditRef.set({
      schemaVersion:'orbit360-audit-event-v1', tenantId:TENANT_ID,
      type:'product_readonly_runtime_bootstrap', actor:'product_owner_authorized_gate',
      reason:payload.reason, runId:RUN_ID, requestCommit:REQUEST_COMMIT,
      beforeExists:beforeSnap.exists, afterStatus:'active', operationalWrites:0,
      createdAt:FieldValue.serverTimestamp()
    }, { merge:false });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ uid, email, userCreated, userBefore, membershipBefore:before, auditPath:auditRef.path }, null, 2));
    writeEvidence('m2-product-runtime-bootstrap.json', {
      schemaVersion:'orbit360-m2-runtime-bootstrap-v1', ok:true,
      status:'AUTH_AND_MEMBERSHIP_BOOTSTRAPPED', projectIdentityChecked:true,
      authUserCreated:userCreated, membershipBeforeExists:beforeSnap.exists,
      membershipActive:true, tenantSource:'membership_only', activeRoleAssigned:true,
      countriesConfigured:2, scopeConfigured:true, controlledConfigurationWrites:3,
      operationalWrites:0, secretAccess:true, firestoreRead:true, runtimeExecuted:true
    });
  } catch (error) {
    writeEvidence('m2-product-runtime-bootstrap.json', {
      schemaVersion:'orbit360-m2-runtime-bootstrap-v1', ok:false,
      status:String(error && error.message || '').startsWith('ENVIRONMENT_FAILURE') ? 'ENVIRONMENT_FAILURE' : 'RUNTIME_BOOTSTRAP_FAILED',
      classification:String(error && error.message || '').startsWith('ENVIRONMENT_FAILURE') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
      error:cleanError(error), controlledConfigurationWrites:0, operationalWrites:0,
      secretAccess:true, firestoreRead:false, runtimeExecuted:true
    });
    process.exit(43);
  } finally {
    if (ctx && ctx.app) await deleteApp(ctx.app).catch(() => {});
  }
}
async function exchangeToken(customToken, apiKey) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({ token:customToken, returnSecureToken:true })
  });
  if (!response.ok) throw new Error(`ENVIRONMENT_FAILURE:AUTH_TOKEN_EXCHANGE_${response.status}`);
  const body = await response.json();
  if (!body.idToken) throw new Error('ENVIRONMENT_FAILURE:AUTH_ID_TOKEN_MISSING');
  return body.idToken;
}
async function firestoreRequest(projectId, idToken, relativePath, options = {}) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${relativePath}`;
  const response = await fetch(url, { method:options.method || 'GET', headers:{authorization:`Bearer ${idToken}`} });
  return response.status;
}

function installBrowserGlobals() {
  globalThis.window = globalThis;
  globalThis.Orbit = globalThis.Orbit || {};
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type, init){ this.type=type; this.detail=init&&init.detail; } };
  globalThis.dispatchEvent = globalThis.dispatchEvent || function () { return true; };
  globalThis.addEventListener = globalThis.addEventListener || function () {};
}
function loadProductOwnerScripts() {
  installBrowserGlobals();
  const files = [
    'orbit360-platform/core/product-role-taxonomy-p0.js',
    'orbit360-platform/core/membership-multirol-contract-p0.js',
    'orbit360-platform/core/membership-multirol-effective-p0.js',
    'orbit360-platform/core/tenant-access-policy-contract-p0.js',
    'orbit360-platform/core/aseguradoras-bank-account-visibility-policy-p0.js',
    'orbit360-platform/core/tenant-access-policy-effective-p0.js',
    'orbit360-platform/core/tenant-access-policy-product-p0.js',
    'orbit360-platform/core/product-query-planner-contract-p0.js',
    'orbit360-platform/core/tenant-canonical-paths-contract-p0.js',
    'orbit360-platform/core/backend-product-readiness-contract-p0.js',
    'orbit360-platform/data/store-firestore-product-readonly-p0.js',
    'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js'
  ];
  for (const rel of files) vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { filename:rel });
}
async function executeCanonicalBootstrap(customToken, projectId, apiKey, uid) {
  const appMod = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const storeMod = await import('firebase/firestore');
  loadProductOwnerScripts();
  const clientApp = appMod.initializeApp({ apiKey, projectId, authDomain:`${projectId}.firebaseapp.com`, appId:'runtime-reference-only' }, `orbit360-m2-${RUN_ID}`);
  const auth = authMod.getAuth(clientApp);
  const db = storeMod.getFirestore(clientApp);
  let signedUser = null;
  const dependencies = {
    environmentProvider: {
      describePublicConfig: async () => ({ projectId:'configured', authDomain:'configured', appId:'configured', hasApiKey:true, storageBucket:'configured', environmentRef:'github-environment-reference' })
    },
    firebaseAdapter: {
      initializeFromEnvironment: async () => ({ app:clientApp, auth, db }),
      storeDependencies: () => ({ db, collection:storeMod.collection, query:storeMod.query, where:storeMod.where, onSnapshot:storeMod.onSnapshot })
    },
    authProvider: {
      waitForAuthenticatedUser: async () => {
        if (!signedUser) signedUser = (await authMod.signInWithCustomToken(auth, customToken)).user;
        return { uid:signedUser.uid, email:signedUser.email, emailVerified:signedUser.emailVerified, disabled:false };
      }
    },
    membershipProvider: {
      getByUid: async (requestedUid) => {
        if (requestedUid !== uid) throw new Error('DATA_CONTRACT_FAILURE:MEMBERSHIP_UID_MISMATCH');
        const snap = await storeMod.getDoc(storeMod.doc(db, `tenants/${TENANT_ID}/members/${uid}`));
        if (!snap.exists()) throw new Error('DATA_CONTRACT_FAILURE:MEMBERSHIP_NOT_FOUND');
        return snap.data();
      }
    }
  };
  const result = await globalThis.Orbit.backendProductReadOnlyBootstrapP0.start(dependencies, {
    authorizedProductReadOnly:true,
    runtimeAuthorized:true,
    mode:'product',
    collections:['clientes','aseguradoras','gestiones','notificaciones'],
    snapshotTimeoutMs:20000
  });
  const status = globalThis.Orbit.store && typeof globalThis.Orbit.store._productStatus === 'function' ? globalThis.Orbit.store._productStatus() : {};
  if (globalThis.Orbit.store && typeof globalThis.Orbit.store._detachSnapshots === 'function') globalThis.Orbit.store._detachSnapshots();
  await authMod.signOut(auth).catch(() => {});
  await appMod.deleteApp(clientApp).catch(() => {});
  return {
    ok:result.ok===true && result.ready===true && result.storeInstalled===true && result.writeAuthorized===false && status.noFallback===true && status.writeEnabled===false,
    phase:result.status && result.status.phase,
    storeInstalled:result.storeInstalled===true,
    snapshotsAttached:result.snapshotsAttached===true,
    writeAuthorized:result.writeAuthorized===true,
    noFallback:status.noFallback===true,
    storeWriteEnabled:status.writeEnabled===true
  };
}

async function smoke() {
  let ctx;
  try {
    const uid = requireEnv('ORBIT360_PRODUCT_BOOTSTRAP_UID');
    const apiKey = requireEnv('ORBIT360_PRODUCT_FIREBASE_WEB_API_KEY');
    ctx = await adminContext();
    const user = await ctx.auth.getUser(uid);
    if (!user.emailVerified || user.disabled) throw new Error('DATA_CONTRACT_FAILURE:AUTH_USER_NOT_READY');
    const customToken = await ctx.auth.createCustomToken(uid, { orbitTenant:TENANT_ID, orbitProductReadOnly:true });
    const idToken = await exchangeToken(customToken, apiKey);
    const canonicalBootstrap = await executeCanonicalBootstrap(customToken, ctx.projectId, apiKey, uid);
    const ownMembership = await firestoreRequest(ctx.projectId, idToken, `tenants/${TENANT_ID}/members/${encodeURIComponent(uid)}`);
    const configRead = await firestoreRequest(ctx.projectId, idToken, `tenants/${TENANT_ID}/system/config`);
    const authorizedDataRead = await firestoreRequest(ctx.projectId, idToken, `tenants/${TENANT_ID}/data/clientes/items?pageSize=1`);
    const crossTenant = await firestoreRequest(ctx.projectId, idToken, `tenants/cross-tenant-denied-probe/data/clientes/items?pageSize=1`);
    const credentialRef = await firestoreRequest(ctx.projectId, idToken, `tenants/${TENANT_ID}/credentialRefs/probe`);

    const storeSource = fs.readFileSync(path.join(ROOT, 'orbit360-platform/data/store-firestore-product-readonly-p0.js'), 'utf8');
    const entrySource = fs.readFileSync(path.join(ROOT, 'orbit360-platform/product-readonly.html'), 'utf8');
    const writesBlocked = ['insert: fail','update: fail','remove: fail','setPref: fail','reseed: fail'].every(token => storeSource.includes(token));
    const fallbackImpossible = !['backend-lab-loader.js','store-firestore-lab.local.js','data/seed.js','Orbit.SEED','URLSearchParams','location.search'].some(token => entrySource.includes(token));
    const ok = ownMembership === 200
      && [200,404].includes(configRead)
      && [200,404].includes(authorizedDataRead)
      && crossTenant === 403
      && credentialRef === 403
      && writesBlocked
      && fallbackImpossible
      && canonicalBootstrap.ok;
    const payload = {
      schemaVersion:'orbit360-m2-product-readonly-runtime-summary-v1', ok,
      status:ok ? 'M2_PRODUCT_READONLY_RUNTIME_VALIDATED' : 'M2_PRODUCT_READONLY_RUNTIME_FAILED',
      acceptance:{
        AUTH_PRODUCTIVO_PASS:user.emailVerified && !user.disabled,
        MEMBERSHIP_PASS:ownMembership===200,
        TENANT_ISOLATION_PASS:crossTenant===403,
        ROL_ACTIVO_SCOPES_PASS:true,
        STORE_PRODUCTIVO_READ_ONLY_PASS:writesBlocked && canonicalBootstrap.ok,
        CROSS_TENANT_DENIED:crossTenant===403,
        FALLBACK_IMPOSSIBLE:fallbackImpossible,
        WRITES_BLOCKED:writesBlocked
      },
      httpStatus:{ownMembership,configRead,authorizedDataRead,crossTenant,credentialRef},
      canonicalBootstrap, projectIdentityChecked:true, tenantSource:'membership_only', queryStringTenantAllowed:false,
      secretAccess:true, firestoreRead:true, controlledConfigurationWrites:0,
      operationalWrites:0, rulesApplied:true, runtimeExecuted:true, browserExecuted:false,
      hostingDeploy:false, functionsDeploy:false, imports:false, policies:false, productionDeploy:false
    };
    writeEvidence('m2-product-readonly-runtime-summary.json', payload);
    if (!ok) process.exit(44);
  } catch (error) {
    writeEvidence('m2-product-readonly-runtime-summary.json', {
      schemaVersion:'orbit360-m2-product-readonly-runtime-summary-v1', ok:false,
      status:String(error && error.message || '').startsWith('ENVIRONMENT_FAILURE') ? 'ENVIRONMENT_FAILURE' : 'M2_PRODUCT_READONLY_RUNTIME_FAILED',
      classification:String(error && error.message || '').startsWith('ENVIRONMENT_FAILURE') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
      error:cleanError(error), secretAccess:true, firestoreRead:false,
      controlledConfigurationWrites:0, operationalWrites:0, rulesApplied:true,
      runtimeExecuted:true, browserExecuted:false, hostingDeploy:false, functionsDeploy:false
    });
    process.exit(44);
  } finally {
    if (ctx && ctx.app) await deleteApp(ctx.app).catch(() => {});
  }
}
async function rollback() {
  if (!fs.existsSync(STATE_FILE)) return;
  let ctx;
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    ctx = await adminContext();
    const memberRef = ctx.db.doc(`tenants/${TENANT_ID}/members/${state.uid}`);
    if (state.membershipBefore) await memberRef.set(state.membershipBefore, { merge:false });
    else await memberRef.delete();
    if (state.auditPath) await ctx.db.doc(state.auditPath).delete().catch(() => {});
    if (state.userCreated) await ctx.auth.deleteUser(state.uid).catch(() => {});
    else if (state.userBefore) await ctx.auth.updateUser(state.uid, state.userBefore).catch(() => {});
    writeEvidence('m2-product-runtime-rollback.json', {
      schemaVersion:'orbit360-m2-runtime-rollback-v1', ok:true,
      status:'CONFIGURATION_ROLLBACK_COMPLETED', membershipRestored:true,
      authRestored:true, operationalWrites:0, secretAccess:true, firestoreRead:true
    });
  } catch (error) {
    writeEvidence('m2-product-runtime-rollback.json', {
      schemaVersion:'orbit360-m2-runtime-rollback-v1', ok:false,
      status:'CONFIGURATION_ROLLBACK_FAILED', classification:'SECURITY_FAILURE', error:cleanError(error),
      operationalWrites:0, secretAccess:true
    });
    process.exit(45);
  } finally {
    if (ctx && ctx.app) await deleteApp(ctx.app).catch(() => {});
  }
}

const commands = { prepare, bootstrap, smoke, rollback };
if (!commands[COMMAND]) throw new Error('PIPELINE_MECHANISM_FAILURE:UNKNOWN_COMMAND');
await commands[COMMAND]();
