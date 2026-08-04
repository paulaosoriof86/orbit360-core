#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const RC11_ROOT = process.env.ORBIT360_RC11_ROOT || ROOT;
const LIVE_URL = (process.env.ORBIT360_LIVE_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const LOGIN_EMAIL = process.env.ORBIT360_EXISTING_LOGIN_EMAIL || 'orbit.lab@demo.com';
const LOGIN_PASSWORD = process.env.ORBIT360_EXISTING_LOGIN_PASSWORD || '';
const EXPECTED_CLIENTS = Number(process.env.ORBIT360_EXPECTED_CLIENTS || 430);
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gravicentra-rc11-browser-real-data-smoke.json');
const DIRECT_URL = `${LIVE_URL}/#/cliente360`;
const LOADER_REL = 'core/backend-lab-loader.js';
const FORBIDDEN_TEXT = ['admin@demo.com','Andrea Beltrán','Sofía Castellanos','Roberto Quezada','María Fernanda Gil','Andrés Beltrán','Camila Rojas'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sanitize = value => String(value == null ? '' : value).replace(/[\r\n]+/g,' ').slice(0,700);
const write = payload => {
  fs.mkdirSync(path.dirname(OUT), {recursive:true});
  fs.writeFileSync(OUT, JSON.stringify({
    ...payload,
    firestoreWrites:0,
    authWrites:0,
    operationalWrites:0,
    reimportExecuted:false,
    functionsDeployed:false,
    rulesApplied:false,
    mainTouched:false,
    mergeExecuted:false,
    containsPII:false,
    containsDocumentIds:false,
    containsValues:false,
    containsSecrets:false
  }, null, 2) + '\n', 'utf8');
};

let browser;
try {
  if (!LOGIN_PASSWORD || LOGIN_PASSWORD.length < 8) throw new Error('RC11_LOGIN_PASSWORD_MISSING');
  const localLoader = fs.readFileSync(path.join(RC11_ROOT, 'orbit360-platform', LOADER_REL));
  const publicResponse = await fetch(`${LIVE_URL}/${LOADER_REL}?rc11=${Date.now()}`, {headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  const publicLoader = Buffer.from(await publicResponse.arrayBuffer());
  const loaderExact = publicResponse.ok && sha(publicLoader) === sha(localLoader);
  const loaderText = publicLoader.toString('utf8');

  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(sanitize(msg.text())); });
  page.on('pageerror', error => consoleErrors.push(sanitize(error)));

  await page.goto(DIRECT_URL, {waitUntil:'domcontentloaded', timeout:45000});
  await page.waitForURL(url => {
    const u = new URL(url.toString());
    return u.searchParams.get('orbitBackend') === 'firestore-lab' &&
      u.searchParams.get('tenant') === 'alianzas-soluciones' &&
      u.searchParams.get('runtime') === '20260717-2' &&
      u.hash === '#/cliente360';
  }, {timeout:30000});

  await page.waitForSelector('#login-form', {state:'visible', timeout:30000});
  await page.fill('#lg-user', LOGIN_EMAIL);
  await page.fill('#lg-pass', LOGIN_PASSWORD);
  await page.click('#login-form button[type="submit"]');

  await page.waitForFunction(expected => {
    try {
      const store = window.Orbit && window.Orbit.store;
      const backend = window.OrbitBackend || window.ORBIT_BACKEND;
      const status = store && typeof store._labStatus === 'function' ? store._labStatus() : null;
      return backend && backend.mode === 'firestore-lab' &&
        backend.tenantId === 'alianzas-soluciones' &&
        backend.noFallback === true &&
        store && store.__firestoreLabExplicit === true &&
        store.__canonicalReadModelV79 === true &&
        store.__singleReadOwner === true &&
        status && status.status === 'ready' &&
        status.snapshotAttached === true &&
        typeof store.all === 'function' &&
        store.all('clientes').length === expected;
    } catch (e) { return false; }
  }, EXPECTED_CLIENTS, {timeout:120000});

  await page.waitForTimeout(1800);
  const observed = await page.evaluate(({expected, forbidden}) => {
    const store = window.Orbit && window.Orbit.store;
    const backend = window.OrbitBackend || window.ORBIT_BACKEND || {};
    const status = store && typeof store._labStatus === 'function' ? store._labStatus() : {};
    const clients = store && typeof store.all === 'function' ? store.all('clientes') : [];
    const bodyText = String(document.body && document.body.innerText || '');
    const loginValue = String(document.querySelector('#lg-user')?.value || '');
    const forbiddenVisible = forbidden.filter(value => bodyText.includes(value));
    const forbiddenStoreRows = clients.filter(row => forbidden.includes(String(row && row.nombre || ''))).length;
    return {
      href:location.href,
      backendMode:backend.mode || '',
      tenantId:backend.tenantId || backend.tenant || '',
      noFallback:backend.noFallback === true,
      firebaseLoader:backend.firebaseLoader || '',
      firebaseInit:backend.firebaseInit || '',
      storeFirestore:store?.__firestoreLabExplicit === true,
      canonicalReadModel:store?.__canonicalReadModelV79 === true,
      singleReadOwner:store?.__singleReadOwner === true,
      backendStatus:status.status || '',
      snapshotsAttached:status.snapshotAttached === true,
      clientCount:clients.length,
      expectedClientCount:expected,
      renderedExpectedCount:bodyText.includes(String(expected)),
      loginIsDemo:loginValue === 'admin@demo.com',
      forbiddenVisibleCount:forbiddenVisible.length,
      forbiddenStoreRows,
      bodyStillPreAuth:document.body.classList.contains('pre-auth'),
      demoAuthMode:document.querySelector('#login-form')?.dataset?.authMode === 'demo'
    };
  }, {expected:EXPECTED_CLIENTS, forbidden:FORBIDDEN_TEXT});

  const checks = {
    directUrlNormalized:/[?&]orbitBackend=firestore-lab(?:&|#)/.test(observed.href) && observed.href.includes('tenant=alianzas-soluciones') && observed.href.includes('runtime=20260717-2') && observed.href.endsWith('#/cliente360'),
    publicLoaderExactlyRc11:loaderExact,
    publicLoaderDeclaresCanonicalHost:loaderText.includes("hostname === 'ays-orbit-360-lab.web.app'") && loaderText.includes("loaderVersion: 'v1.112-canonical-host-fail-closed'"),
    publicLoaderBlocksSeedFallback:loaderText.includes('noSeedAsSource: true') && !loaderText.includes('admin@demo.com'),
    backendModeReal:observed.backendMode === 'firestore-lab',
    tenantReal:observed.tenantId === 'alianzas-soluciones',
    noFallback:observed.noFallback === true,
    firebaseRequested:['requested','initialized','already-initialized'].includes(observed.firebaseLoader) || ['initialized','already-initialized'].includes(observed.firebaseInit),
    storeFirestore:observed.storeFirestore,
    canonicalReadModel:observed.canonicalReadModel,
    singleReadOwner:observed.singleReadOwner,
    snapshotsAttached:observed.snapshotsAttached && observed.backendStatus === 'ready',
    realClientCount:observed.clientCount === EXPECTED_CLIENTS,
    realCountRendered:observed.renderedExpectedCount,
    demoLoginAbsent:observed.loginIsDemo === false && observed.demoAuthMode === false,
    forbiddenDemoVisibleAbsent:observed.forbiddenVisibleCount === 0,
    forbiddenSeedRowsAbsent:observed.forbiddenStoreRows === 0,
    authenticatedViewVisible:observed.bodyStillPreAuth === false
  };
  const ok = Object.values(checks).every(Boolean);
  const payload = {
    schemaVersion:'orbit360-gravicentra-rc11-browser-real-data-smoke-v1',
    generatedAt:new Date().toISOString(),
    liveUrl:LIVE_URL,
    releaseCommit:process.env.ORBIT360_RELEASE_COMMIT || '',
    decision:ok ? 'RC11_REAL_DATA_BROWSER_PASS' : 'RC11_REAL_DATA_BROWSER_FAIL_ROLLBACK_REQUIRED',
    classification:ok ? 'PRODUCTION_SMOKE_PASS' : 'FUNCTIONAL_DEFECT',
    checks,
    observed:{
      backendMode:observed.backendMode,
      tenantId:observed.tenantId,
      noFallback:observed.noFallback,
      storeFirestore:observed.storeFirestore,
      canonicalReadModel:observed.canonicalReadModel,
      singleReadOwner:observed.singleReadOwner,
      backendStatus:observed.backendStatus,
      snapshotsAttached:observed.snapshotsAttached,
      clientCount:observed.clientCount,
      expectedClientCount:observed.expectedClientCount,
      renderedExpectedCount:observed.renderedExpectedCount,
      forbiddenVisibleCount:observed.forbiddenVisibleCount,
      forbiddenStoreRows:observed.forbiddenStoreRows,
      bodyStillPreAuth:observed.bodyStillPreAuth,
      consoleErrorCount:consoleErrors.length
    },
    loader:{httpStatus:publicResponse.status, exact:loaderExact},
    deployExecuted:true,
    productionTouched:true,
    rollbackExecuted:false,
    ok
  };
  write(payload);
  console.log(JSON.stringify(payload,null,2));
  process.exit(ok ? 0 : 41);
} catch (error) {
  const payload = {
    schemaVersion:'orbit360-gravicentra-rc11-browser-real-data-smoke-v1',
    generatedAt:new Date().toISOString(),
    liveUrl:LIVE_URL,
    releaseCommit:process.env.ORBIT360_RELEASE_COMMIT || '',
    decision:'RC11_REAL_DATA_BROWSER_FAIL_ROLLBACK_REQUIRED',
    classification:'PIPELINE_MECHANISM_FAILURE',
    error:sanitize(error),
    checks:{},
    deployExecuted:true,
    productionTouched:true,
    rollbackExecuted:false,
    ok:false
  };
  write(payload);
  console.error(JSON.stringify(payload,null,2));
  process.exit(41);
} finally {
  if (browser) await browser.close().catch(()=>{});
}
