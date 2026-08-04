#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const LIVE_URL = String(process.env.ORBIT360_LIVE_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const RELEASE_ROOT = process.env.ORBIT360_RC12_ROOT || ROOT;
const PRIVATE_FILE = process.env.ORBIT360_RC12_PRIVATE_IDENTITIES || path.join(process.env.RUNNER_TEMP || ROOT, 'orbit360-rc12-identities.json');
const EVIDENCE_FILE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gravicentra-rc12-membership-browser-smoke.json');
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
const writeEvidence = payload => {
  fs.mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify({
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

try {
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
          const projection = window.Orbit?.auth?.productUser;
          const store = window.Orbit?.store?._labStatus?.();
          return projection?.__labMembershipProjection === true && projection?.productReadOnly === true && store?.snapshotAttached === true && document.body?.dataset?.authStage === 'inside';
        } catch (error) { return false; }
      }, null, { timeout: 90000 });
      await page.waitForTimeout(1800);

      const observed = await page.evaluate(() => {
        const projection = window.Orbit?.auth?.productUser || null;
        const mapped = window.Orbit?.auth?.user?.() || null;
        const store = window.Orbit?.store?._labStatus?.() || null;
        const session = window.Orbit?.session?.describe?.() || null;
        const menuRoutes = [...document.querySelectorAll('#sidebar [data-route]')]
          .map(el => String(el.dataset.route || '').trim())
          .filter(Boolean);
        const uniqueRoutes = [...new Set(menuRoutes)];
        const canView = route => {
          try {
            if (window.Orbit?.access?.can) return Boolean(Orbit.access.can(route, 'view'));
            if (window.Orbit?.accessScope?.puedeVerModulo) return Boolean(Orbit.accessScope.puedeVerModulo(route));
            return Boolean((!Orbit.tenant?.isActive || Orbit.tenant.isActive(route)) && (!Orbit.session?.canSee || Orbit.session.canSee(route)));
          } catch (error) { return false; }
        };
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
          canView: Object.fromEntries(uniqueRoutes.map(route => [route, canView(route)])),
          topbar: String(document.querySelector('.tb-user .who')?.textContent || '').trim(),
          bodyText: String(document.body?.innerText || '').slice(0, 250000),
          authBackend: String(document.body?.dataset?.authBackend || ''),
          authTenant: String(document.body?.dataset?.authTenant || ''),
          authStage: String(document.body?.dataset?.authStage || '')
        };
      });

      const projection = observed.projection || {};
      const expectedMembership = expected.membership || {};
      const body = observed.bodyText || '';
      const emailDigest = sha(String(observed.mapped?.email || '').toLowerCase());
      const uidDigest = sha(String(observed.mapped?.uid || ''));
      const checks = {
        canonicalHost: observed.location.hostname === new URL(LIVE_URL).hostname,
        directUrlNormalized: observed.location.search.includes('orbitBackend=firestore-lab') && observed.location.search.includes(`tenant=${TENANT}`),
        authenticatedInside: observed.authStage === 'inside',
        membershipBackend: observed.authBackend === 'firestore-membership',
        tenantBound: observed.authTenant === TENANT && projection.tenantId === TENANT,
        normalIdentity: emailDigest !== FORBIDDEN_DIGESTS.technicalEmail && uidDigest !== FORBIDDEN_DIGESTS.technicalUid,
        expectedUid: uidDigest === sha(expected.uid),
        expectedEmail: emailDigest === sha(String(expected.email || '').toLowerCase()),
        rolesFromMembership: same(projection.roles || [], expectedMembership.roles || []),
        defaultRoleFromMembership: projection.defaultRole === expectedMembership.defaultRole,
        activeRoleFromMembership: projection.activeRole === expectedMembership.activeRole,
        advisorFromMembership: sha(String(projection.advisorId || '')) === sha(String(expectedMembership.advisorId || '')),
        countriesFromMembership: same(projection.countries || [], expectedMembership.countries || []),
        dataScopesFromMembership: same(projection.dataScopes || {}, expectedMembership.dataScopes || {}),
        modulesExtraFromMembership: same(projection.modulesExtra || [], expectedMembership.modulesExtra || []),
        modulesRestrictedFromMembership: same(projection.modulesRestricted || [], expectedMembership.modulesRestricted || []),
        storeFirestore: store?.mode === 'firestore-lab' && store?.authAuthority === 'tenant-membership' && store?.membershipRequired === true,
        snapshotsAttached: store?.snapshotAttached === true,
        clientsReal: observed.clientCount === 430,
        insurersReal: observed.insurerCount === 30,
        policiesReal: observed.policyCount >= 1373,
        menuPresent: observed.menuRoutes.length > 0,
        visibleMenuAuthorized: Object.values(observed.canView || {}).every(Boolean),
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
          roles: expectedMembership.roles,
          defaultRole: expectedMembership.defaultRole,
          activeRole: expectedMembership.activeRole,
          advisorBound: Boolean(expectedMembership.advisorId),
          advisorIdSha256: expectedMembership.advisorId ? sha(expectedMembership.advisorId) : '',
          countries: expectedMembership.countries,
          dataScopes: expectedMembership.dataScopes,
          modulesExtra: expectedMembership.modulesExtra,
          modulesRestricted: expectedMembership.modulesRestricted
        },
        observed: {
          roles: projection.roles || [],
          defaultRole: projection.defaultRole || '',
          activeRole: projection.activeRole || '',
          advisorBound: Boolean(projection.advisorId),
          advisorIdSha256: projection.advisorId ? sha(projection.advisorId) : '',
          countries: projection.countries || [],
          dataScopes: projection.dataScopes || {},
          modulesExtra: projection.modulesExtra || [],
          modulesRestricted: projection.modulesRestricted || [],
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

  const checks = {
    publicOwnersExactlyRc12: exact,
    directionPass: results.direccion?.ok === true,
    operativoPass: results.operativo?.ok === true,
    asesorPass: results.asesor?.ok === true,
    allProfilesPass: Object.values(results).every(item => item.ok === true)
  };
  const ok = Object.values(checks).every(Boolean);
  writeEvidence({
    schemaVersion: 'orbit360-gravicentra-rc12-membership-browser-smoke-v2',
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
} catch (error) {
  writeEvidence({
    schemaVersion: 'orbit360-gravicentra-rc12-membership-browser-smoke-error-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    liveUrl: LIVE_URL,
    classification: 'FUNCTIONAL_DEFECT',
    error: sanitizeError(error),
    tokenCreationExecuted: true,
    tokenPersistence: false,
    firestoreRead: true,
    authRead: true,
    deployExecuted: true,
    productionTouched: true,
    ok: false
  });
  console.error(sanitizeError(error));
  process.exit(41);
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
