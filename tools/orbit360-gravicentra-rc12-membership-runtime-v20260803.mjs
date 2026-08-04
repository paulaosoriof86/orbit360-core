#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const LIVE_URL = String(process.env.ORBIT360_LIVE_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const RELEASE_ROOT = process.env.ORBIT360_RC12_ROOT || ROOT;
const PRIVATE_FILE = process.env.ORBIT360_RC12_PRIVATE_IDENTITIES || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-rc12-identities.json');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const IDENTITIES_EVIDENCE = path.join(EVIDENCE_DIR, 'gravicentra-rc12-membership-identities.json');
const BROWSER_EVIDENCE = path.join(EVIDENCE_DIR, 'gravicentra-rc12-membership-browser-smoke.json');
const FORBIDDEN_DIGESTS = Object.freeze({
  technicalEmail: 'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  technicalUid: 'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const OWNER_ASSETS = [
  'core/auth.js',
  'core/backend-lab-auth-guard.js',
  'core/access-role-session-owner-v20260728.js',
  'data/store-firestore-lab.local.js'
];
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const fileSha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const sanitizeError = error => String(error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 700);
const writeEvidence = (file, payload) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    ...payload,
    firestoreWrites: 0,
    authWrites: 0,
    userCreates: 0,
    userUpdates: 0,
    passwordReads: 0,
    passwordWrites: 0,
    operationalWrites: 0,
    reimportExecuted: false,
    functionsDeployed: false,
    rulesApplied: false,
    mainTouched: false,
    mergeExecuted: false,
    containsPII: false,
    containsSecrets: false,
    containsRawUid: false,
    containsRawEmail: false
  }, null, 2) + '\n', 'utf8');
};

let app;
function adminApp() {
  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  return app;
}
function text(value) { return String(value == null ? '' : value).trim(); }
function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}
function canonicalRole(value) {
  const role = text(value);
  if (role === 'Admin') return 'AdminTenant';
  if (role === 'Direccion' || role === 'Dirección') return 'SuperAdmin';
  if (role === 'Operaciones') return 'Operativo';
  return role;
}
function normalizeMembership(data, uid) {
  const rawRoles = data?.roles || data?.rolesAsignados || (data?.role || data?.rol ? [data.role || data.rol] : []);
  const roles = unique(rawRoles.map(canonicalRole));
  const defaultRole = canonicalRole(data?.defaultRole || data?.rolDefault || data?.roleDefault || roles[0]);
  const activeRole = canonicalRole(data?.activeRole || data?.rolActivo || defaultRole || roles[0]);
  return {
    uid: text(data?.uid || data?.userId || data?.id || uid),
    tenantId: text(data?.tenantId || data?.tenant || TENANT),
    roles,
    defaultRole,
    activeRole,
    advisorId: text(data?.advisorId || data?.asesorId),
    teamId: text(data?.teamId || data?.equipoId),
    countries: unique(data?.countries || data?.paises || []).map(x => x.toUpperCase()),
    dataScopes: stable(data?.dataScopes || data?.scopes || {}),
    modulesExtra: unique(data?.modulesExtra || data?.modulosExtra || []),
    modulesRestricted: unique(data?.modulesRestricted || data?.modulosRestringidos || []),
    status: text(data?.status || data?.estado).toLowerCase()
  };
}
function membershipValid(m) {
  return m && m.uid && m.tenantId === TENANT && (m.status === 'active' || m.status === 'activo') && m.roles.length > 0 && m.roles.includes(m.defaultRole) && m.roles.includes(m.activeRole);
}
function profileMatch(profile, membership) {
  if (profile === 'direccion') return ['SuperAdmin', 'AdminTenant'].includes(membership.activeRole);
  if (profile === 'operativo') return membership.activeRole === 'Operativo';
  if (profile === 'asesor') return membership.activeRole === 'Asesor' && Boolean(membership.advisorId);
  return false;
}
function providerValid(user) {
  const providers = (user?.providerData || []).map(item => text(item.providerId)).filter(Boolean);
  return !user?.disabled && Boolean(user?.email) && providers.length > 0;
}
function publicIdentity(profile, item) {
  return {
    profile,
    uidSha256: sha(item.user.uid),
    emailSha256: sha(String(item.user.email || '').toLowerCase()),
    disabled: Boolean(item.user.disabled),
    providerIds: (item.user.providerData || []).map(p => p.providerId).filter(Boolean).sort(),
    membership: {
      tenantId: item.membership.tenantId,
      roles: item.membership.roles,
      defaultRole: item.membership.defaultRole,
      activeRole: item.membership.activeRole,
      advisorBound: Boolean(item.membership.advisorId),
      advisorIdSha256: item.membership.advisorId ? sha(item.membership.advisorId) : '',
      teamBound: Boolean(item.membership.teamId),
      countries: item.membership.countries,
      dataScopes: item.membership.dataScopes,
      modulesExtra: item.membership.modulesExtra,
      modulesRestricted: item.membership.modulesRestricted,
      status: item.membership.status
    }
  };
}
async function resolveIdentities() {
  adminApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  const snapshot = await db.collection('tenants').doc(TENANT).collection('members').get();
  const candidates = [];
  for (const doc of snapshot.docs) {
    const membership = normalizeMembership(doc.data(), doc.id);
    if (!membershipValid(membership)) continue;
    const user = await auth.getUser(membership.uid);
    const emailDigest = sha(String(user.email || '').toLowerCase());
    const uidDigest = sha(user.uid);
    if (emailDigest === FORBIDDEN_DIGESTS.technicalEmail || uidDigest === FORBIDDEN_DIGESTS.technicalUid) continue;
    if (!providerValid(user)) continue;
    candidates.push({ membership, user });
  }
  const selected = {};
  const used = new Set();
  for (const profile of ['direccion', 'operativo', 'asesor']) {
    let match = candidates.find(item => !used.has(item.user.uid) && profileMatch(profile, item.membership));
    if (!match) match = candidates.find(item => profileMatch(profile, item.membership));
    if (!match) throw new Error(`ACTIVE_NORMAL_MEMBERSHIP_NOT_FOUND_${profile.toUpperCase()}`);
    selected[profile] = match;
    used.add(match.user.uid);
  }
  const privatePayload = Object.fromEntries(Object.entries(selected).map(([profile, item]) => [profile, {
    uid: item.user.uid,
    email: item.user.email || '',
    displayName: item.user.displayName || '',
    membership: item.membership
  }]));
  fs.writeFileSync(PRIVATE_FILE, JSON.stringify(privatePayload), { encoding: 'utf8', mode: 0o600 });
  const identities = Object.fromEntries(Object.entries(selected).map(([profile, item]) => [profile, publicIdentity(profile, item)]));
  const checks = {
    membershipCollectionReadable: snapshot.size > 0,
    directionResolved: Boolean(identities.direccion),
    operativoResolved: Boolean(identities.operativo),
    asesorResolved: Boolean(identities.asesor),
    allActive: Object.values(identities).every(x => ['active', 'activo'].includes(x.membership.status)),
    allNormalIdentities: Object.values(identities).every(x => x.emailSha256 !== FORBIDDEN_DIGESTS.technicalEmail && x.uidSha256 !== FORBIDDEN_DIGESTS.technicalUid),
    allProvidersValid: Object.values(identities).every(x => !x.disabled && x.providerIds.length > 0),
    allTenantBound: Object.values(identities).every(x => x.membership.tenantId === TENANT),
    advisorBoundForAdvisor: identities.asesor.membership.advisorBound === true
  };
  const ok = Object.values(checks).every(Boolean);
  writeEvidence(IDENTITIES_EVIDENCE, {
    schemaVersion: 'orbit360-gravicentra-rc12-membership-identities-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    totalMembershipDocuments: snapshot.size,
    selectedProfiles: Object.keys(identities),
    identities,
    checks,
    tokenCreationExecuted: false,
    firestoreRead: true,
    authRead: true,
    deployExecuted: false,
    productionTouched: false,
    classification: ok ? 'GO_NORMAL_MEMBERSHIP_IDENTITIES' : 'SECURITY_FAILURE',
    ok
  });
  if (!ok) throw new Error('NORMAL_MEMBERSHIP_IDENTITY_CHECK_FAILED');
}

async function publicOwnerHashes() {
  const nonce = `rc12=${Date.now()}`;
  const result = {};
  for (const rel of OWNER_ASSETS) {
    const response = await fetch(`${LIVE_URL}/${rel}?${nonce}`, { headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } });
    const bytes = Buffer.from(await response.arrayBuffer());
    result[rel] = { status: response.status, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  return result;
}
function localOwnerHashes() {
  return Object.fromEntries(OWNER_ASSETS.map(rel => [rel, { sha256: fileSha(path.join(RELEASE_ROOT, 'orbit360-platform', rel)) }]));
}
function assetsExact(pub, local) {
  return OWNER_ASSETS.every(rel => pub?.[rel]?.status >= 200 && pub?.[rel]?.status < 400 && pub?.[rel]?.sha256 === local?.[rel]?.sha256);
}
async function browserSmoke() {
  adminApp();
  const auth = getAuth(app);
  const privatePayload = JSON.parse(fs.readFileSync(PRIVATE_FILE, 'utf8'));
  const localAssets = localOwnerHashes();
  let publicAssets = {};
  let exact = false;
  for (let attempt = 0; attempt < 24; attempt++) {
    publicAssets = await publicOwnerHashes();
    exact = assetsExact(publicAssets, localAssets);
    if (exact) break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!exact) throw new Error('PUBLIC_AUTH_OWNERS_NOT_EXACT_RC12');

  const browser = await chromium.launch({ headless: true });
  const results = {};
  try {
    for (const profile of ['direccion', 'operativo', 'asesor']) {
      const expected = privatePayload[profile];
      if (!expected?.uid) throw new Error(`PRIVATE_IDENTITY_MISSING_${profile}`);
      const customToken = await auth.createCustomToken(expected.uid, { orbitSmoke: true, tenantId: TENANT, profile });
      const context = await browser.newContext();
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(String(msg.text()).slice(0, 300)); });
      await page.goto(`${LIVE_URL}/#/cliente360`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.firebase && typeof firebase.auth === 'function', null, { timeout: 60000 });
      await page.evaluate(async token => { await firebase.auth().signInWithCustomToken(token); }, customToken);
      await page.waitForFunction(() => {
        try {
          const p = window.Orbit?.auth?.productUser;
          const state = window.Orbit?.store?._labStatus?.();
          return p?.__labMembershipProjection === true && p?.productReadOnly === true && state?.snapshotAttached === true && document.body?.dataset?.authStage === 'inside';
        } catch (error) { return false; }
      }, null, { timeout: 90000 });
      await page.waitForTimeout(1800);
      const observed = await page.evaluate(() => {
        const projection = window.Orbit?.auth?.productUser || null;
        const mapped = window.Orbit?.auth?.user?.() || null;
        const store = window.Orbit?.store?._labStatus?.() || null;
        const session = window.Orbit?.session?.describe?.() || null;
        const menuRoutes = [...document.querySelectorAll('#sidebar a[href*="#/"]')]
          .map(a => String(a.getAttribute('href') || '').replace(/^.*#\//, '').split(/[?\/]/)[0])
          .filter(Boolean);
        const uniqueRoutes = [...new Set(menuRoutes)];
        const canSee = Object.fromEntries(uniqueRoutes.map(route => [route, Boolean(window.Orbit?.session?.canSee?.(route))]));
        return {
          location: { hostname: location.hostname, search: location.search, hash: location.hash },
          projection,
          mapped,
          store,
          session,
          clientCount: Number(window.Orbit?.store?.all?.('clientes')?.length || 0),
          insurerCount: Number(window.Orbit?.store?.all?.('aseguradoras')?.length || 0),
          policyCount: Number(window.Orbit?.store?.all?.('polizas')?.length || 0),
          menuRoutes: uniqueRoutes,
          canSee,
          topbar: String(document.querySelector('.tb-user .who')?.textContent || '').trim(),
          bodyText: String(document.body?.innerText || '').slice(0, 250000),
          authBackend: String(document.body?.dataset?.authBackend || ''),
          authTenant: String(document.body?.dataset?.authTenant || ''),
          authStage: String(document.body?.dataset?.authStage || '')
        };
      });
      const p = observed.projection || {};
      const expectedM = expected.membership;
      const body = observed.bodyText || '';
      const observedEmailDigest = sha(String(observed.mapped?.email || '').toLowerCase());
      const observedUidDigest = sha(String(observed.mapped?.uid || ''));
      const checks = {
        canonicalHost: observed.location.hostname === new URL(LIVE_URL).hostname,
        directUrlNormalized: observed.location.search.includes('orbitBackend=firestore-lab') && observed.location.search.includes(`tenant=${TENANT}`),
        authenticatedInside: observed.authStage === 'inside',
        membershipBackend: observed.authBackend === 'firestore-membership',
        tenantBound: observed.authTenant === TENANT && p.tenantId === TENANT,
        normalIdentity: observedEmailDigest !== FORBIDDEN_DIGESTS.technicalEmail && observedUidDigest !== FORBIDDEN_DIGESTS.technicalUid,
        expectedUid: observedUidDigest === sha(expected.uid),
        expectedEmail: observedEmailDigest === sha(String(expected.email || '').toLowerCase()),
        rolesFromMembership: same(p.roles || [], expectedM.roles || []),
        defaultRoleFromMembership: p.defaultRole === expectedM.defaultRole,
        activeRoleFromMembership: p.activeRole === expectedM.activeRole,
        advisorFromMembership: sha(String(p.advisorId || '')) === sha(String(expectedM.advisorId || '')),
        countriesFromMembership: same(p.countries || [], expectedM.countries || []),
        dataScopesFromMembership: same(p.dataScopes || {}, expectedM.dataScopes || {}),
        modulesExtraFromMembership: same(p.modulesExtra || [], expectedM.modulesExtra || []),
        modulesRestrictedFromMembership: same(p.modulesRestricted || [], expectedM.modulesRestricted || []),
        storeFirestore: store?.mode === 'firestore-lab' && store?.authAuthority === 'tenant-membership' && store?.membershipRequired === true,
        snapshotsAttached: store?.snapshotAttached === true,
        clientsReal: observed.clientCount === 430,
        insurersReal: observed.insurerCount === 30,
        policiesReal: observed.policyCount >= 1373,
        menuPresent: observed.menuRoutes.length > 0,
        visibleMenuAuthorized: Object.values(observed.canSee || {}).every(Boolean),
        noDemoAccountVisible: !body.includes('admin@demo.com'),
        noDemoPersonVisible: !body.includes('Andrea Beltrán') && !body.includes('Sofía Castellanos') && !body.includes('Roberto Quezada'),
        noForcedTechnicalLabel: !observed.topbar.includes('Usuario entorno de validación'),
        consoleClean: consoleErrors.length === 0
      };
      const ok = Object.values(checks).every(Boolean);
      results[profile] = {
        profile,
        identity: {
          uidSha256: sha(expected.uid),
          emailSha256: sha(String(expected.email || '').toLowerCase()),
          providerValidatedBeforeDeploy: true
        },
        expected: {
          roles: expectedM.roles,
          defaultRole: expectedM.defaultRole,
          activeRole: expectedM.activeRole,
          advisorBound: Boolean(expectedM.advisorId),
          advisorIdSha256: expectedM.advisorId ? sha(expectedM.advisorId) : '',
          countries: expectedM.countries,
          dataScopes: expectedM.dataScopes,
          modulesExtra: expectedM.modulesExtra,
          modulesRestricted: expectedM.modulesRestricted
        },
        observed: {
          roles: p.roles || [],
          defaultRole: p.defaultRole || '',
          activeRole: p.activeRole || '',
          advisorBound: Boolean(p.advisorId),
          advisorIdSha256: p.advisorId ? sha(p.advisorId) : '',
          countries: p.countries || [],
          dataScopes: p.dataScopes || {},
          modulesExtra: p.modulesExtra || [],
          modulesRestricted: p.modulesRestricted || [],
          menuRoutes: observed.menuRoutes,
          clientCount: observed.clientCount,
          insurerCount: observed.insurerCount,
          policyCount: observed.policyCount,
          authBackend: observed.authBackend,
          authStage: observed.authStage,
          consoleErrorCount: consoleErrors.length
        },
        checks,
        ok
      };
      await page.evaluate(async () => { try { await firebase.auth().signOut(); } catch (error) {} });
      await context.close();
      if (!ok) throw new Error(`BROWSER_PROFILE_FAILED_${profile.toUpperCase()}`);
    }
  } finally {
    await browser.close();
  }
  const allProfilesPass = Object.values(results).every(item => item.ok === true);
  const checks = {
    publicOwnersExactlyRc12: exact,
    directionPass: results.direccion?.ok === true,
    operativoPass: results.operativo?.ok === true,
    asesorPass: results.asesor?.ok === true,
    allProfilesPass
  };
  const ok = Object.values(checks).every(Boolean);
  writeEvidence(BROWSER_EVIDENCE, {
    schemaVersion: 'orbit360-gravicentra-rc12-membership-browser-smoke-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    liveUrl: LIVE_URL,
    releaseCommit: process.env.ORBIT360_RELEASE_COMMIT || '',
    publicOwnerAssets: publicAssets,
    localOwnerAssets: localAssets,
    profiles: results,
    checks,
    tokenCreationExecuted: true,
    tokenPersistence: false,
    firestoreRead: true,
    authRead: true,
    deployExecuted: true,
    productionTouched: true,
    classification: ok ? 'PRODUCTION_MEMBERSHIP_SMOKE_PASS' : 'FUNCTIONAL_DEFECT',
    ok
  });
  if (!ok) throw new Error('RC12_BROWSER_MEMBERSHIP_SMOKE_FAILED');
}

try {
  if (MODE === 'identities') await resolveIdentities();
  else if (MODE === 'browser') await browserSmoke();
  else throw new Error('RC12_MEMBERSHIP_RUNTIME_MODE_INVALID');
} catch (error) {
  const file = MODE === 'identities' ? IDENTITIES_EVIDENCE : BROWSER_EVIDENCE;
  writeEvidence(file, {
    schemaVersion: 'orbit360-gravicentra-rc12-membership-runtime-error-v1',
    mode: MODE,
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    liveUrl: LIVE_URL,
    classification: MODE === 'identities' ? 'SECURITY_FAILURE' : 'FUNCTIONAL_DEFECT',
    error: sanitizeError(error),
    tokenCreationExecuted: MODE === 'browser',
    tokenPersistence: false,
    firestoreRead: true,
    authRead: true,
    deployExecuted: MODE === 'browser',
    productionTouched: MODE === 'browser',
    ok: false
  });
  console.error(sanitizeError(error));
  process.exit(41);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
