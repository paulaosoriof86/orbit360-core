#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const ROOT = process.cwd();
const RC1_ROOT = process.env.ORBIT360_RC1_ROOT || ROOT;
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const LIVE_URL = (process.env.ORBIT360_LIVE_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const RELEASE_COMMIT = process.env.ORBIT360_RELEASE_COMMIT || '27cb7dfcda8568280ebef15993a953364304f29b';
const OUT = process.env.ORBIT360_PREDEPLOY_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gravicentra-rc1-predeploy-readonly.json');
const TIMEOUT_MS = 20000;
const COLLECTIONS = ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'];
const EXPECTED_SOURCE = Object.freeze({ clientes:430, aseguradoras:30, polizas:1373, vehiculos:1032, recibosEsperados:1294, carteraPrimas:673, cobros:5 });
const EXPECTED_CANONICAL = Object.freeze({ clientes:430, aseguradoras:30, polizas:1375, vehiculos:1033, recibosEsperados:1294, carteraPrimas:673, cobros:7 });
const REQUIRED_MODULES = ['cliente360', 'aseguradoras', 'polizas', 'cobros', 'ops', 'leads'];
const ASSETS = ['index.html','styles/base.css','core/config.js','modules/cliente360.js','modules/aseguradoras.js','modules/polizas.js','modules/cobros.js','modules/ops.js','modules/leads.js','data/store-firestore-lab.local.js'];
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('base64');
  if (typeof value?.path === 'string' && /DocumentReference/i.test(value?.constructor?.name || '')) return value.path;
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const snapshotDigest = docs => sha(docs.map(doc => `${doc.id}:${sha(JSON.stringify(stable(doc.data())))}`).sort().join('\n'));
const readText = file => fs.readFileSync(file, 'utf8');
const safeFetch = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' }); }
  finally { clearTimeout(timer); }
};
const sanitizeError = error => String(error?.message || error || '').replace(/[\r\n]+/g, ' ').slice(0, 500);
let app;
const report = {
  schemaVersion:'orbit360-gravicentra-insurance-rc1-predeploy-readonly-v1', generatedAt:new Date().toISOString(),
  releaseCommit:RELEASE_COMMIT, projectId:PROJECT, tenantId:TENANT, liveUrl:LIVE_URL,
  classification:'', decision:'NO_GO', checks:{}, sourceCollections:{}, canonicalCollections:{}, featureFlags:{}, publicAssets:{}, hosting:{}, rollback:{},
  firestoreRead:false, firestoreWrites:0, operationalWrites:0, authWrites:0, reimportExecuted:false, deployExecuted:false, functionsDeployed:false,
  rulesApplied:false, productionWritten:false, mainTouched:false, mergeExecuted:false,
  containsPII:false, containsDocumentIds:false, containsValues:false, containsSecrets:false, ok:false
};
try {
  const platform = path.join(RC1_ROOT, 'orbit360-platform');
  const firebaseConfig = JSON.parse(readText(path.join(RC1_ROOT, 'firebase.json')));
  const rollbackConfigText = readText(path.join(RC1_ROOT, 'firebase.product-rollback-safe.json'));
  const rollbackConfig = JSON.parse(rollbackConfigText);
  report.checks.releaseFilesPresent = ASSETS.every(asset => fs.existsSync(path.join(platform, asset)));
  report.checks.hostingPublicIsPlatform = firebaseConfig?.hosting?.public === 'orbit360-platform';
  report.checks.rollbackConfigPresent = Boolean(rollbackConfig?.hosting?.public || rollbackConfig?.hosting);
  const localConfig = readText(path.join(platform, 'core/config.js'));
  const localIndex = readText(path.join(platform, 'index.html'));
  const candidateCoverage = Object.fromEntries(REQUIRED_MODULES.map(id => [id, localConfig.includes(`'${id}'`) && localIndex.includes(`modules/${id}.js`)]));
  report.featureFlags.candidate = { requiredModules:REQUIRED_MODULES, coverage:candidateCoverage, allRequiredEnabledInSource:Object.values(candidateCoverage).every(Boolean) };

  app = getApps()[0] || initializeApp({ credential:applicationDefault(), projectId:PROJECT });
  const db = getFirestore(app); report.firestoreRead = true;
  for (const name of COLLECTIONS) {
    const [source, canonical] = await Promise.all([
      db.collection('tenantId').doc(TENANT).collection(name).get(),
      db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get()
    ]);
    report.sourceCollections[name] = { count:source.size, expected:EXPECTED_SOURCE[name], countMatch:source.size===EXPECTED_SOURCE[name], digest:snapshotDigest(source.docs) };
    report.canonicalCollections[name] = { count:canonical.size, expected:EXPECTED_CANONICAL[name], countMatch:canonical.size===EXPECTED_CANONICAL[name], digest:snapshotDigest(canonical.docs) };
  }
  const advisorCounts = {};
  for (const name of ['asesores','advisors']) advisorCounts[name] = (await db.collection('tenantId').doc(TENANT).collection(name).get()).size;
  report.checks.advisorCounts = advisorCounts;
  report.checks.advisorsSeven = Object.values(advisorCounts).includes(7);
  report.checks.sourceCountsMatch = Object.values(report.sourceCollections).every(x => x.countMatch);
  report.checks.canonicalCountsMatch = Object.values(report.canonicalCollections).every(x => x.countMatch);

  const nonce = `predeploy=${Date.now()}`;
  for (const asset of ASSETS) {
    const local = fs.readFileSync(path.join(platform, asset));
    const response = await safeFetch(`${LIVE_URL}/${asset}?${nonce}`, { headers:{'cache-control':'no-cache'} });
    const publicBytes = Buffer.from(await response.arrayBuffer());
    report.publicAssets[asset] = { httpStatus:response.status, contentType:response.headers.get('content-type') || '', localSha256:sha(local), publicSha256:sha(publicBytes), exactMatch:response.ok && sha(local)===sha(publicBytes) };
  }
  report.checks.publicReachable = Object.values(report.publicAssets).every(x => x.httpStatus>=200 && x.httpStatus<400);
  report.checks.publicAlreadyEqualsRc1 = Object.values(report.publicAssets).every(x => x.exactMatch);
  const publicConfig = await (await safeFetch(`${LIVE_URL}/core/config.js?${nonce}`)).text();
  const publicIndex = await (await safeFetch(`${LIVE_URL}/index.html?${nonce}`)).text();
  const publicCoverage = Object.fromEntries(REQUIRED_MODULES.map(id => [id, publicConfig.includes(`'${id}'`) && publicIndex.includes(`modules/${id}.js`)]));
  report.featureFlags.public = { coverage:publicCoverage, allRequiredPresent:Object.values(publicCoverage).every(Boolean) };

  try {
    const auth = new GoogleAuth({ scopes:['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase'] });
    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    if (!token) throw new Error('HOSTING_ACCESS_TOKEN_EMPTY');
    const siteId = new URL(LIVE_URL).hostname.split('.')[0];
    const headers = { authorization:`Bearer ${token}`, accept:'application/json' };
    const siteResponse = await safeFetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT}/sites/${siteId}`, {headers});
    const site = await siteResponse.json().catch(() => ({}));
    const releasesResponse = await safeFetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?pageSize=5`, {headers});
    const releasesPayload = await releasesResponse.json().catch(() => ({}));
    const releases = Array.isArray(releasesPayload.releases) ? releasesPayload.releases : [];
    const pick = release => release ? { name:release.name || '', version:release.version?.name || release.version || '', type:release.type || '', releaseTime:release.releaseTime || '' } : null;
    report.hosting = { siteId, siteReadStatus:siteResponse.status, releasesReadStatus:releasesResponse.status, siteName:site?.name || '', defaultUrl:site?.defaultUrl || LIVE_URL, releaseCountObserved:releases.length, currentRelease:pick(releases[0]), previousRelease:pick(releases[1]), apiReadOk:siteResponse.ok && releasesResponse.ok && releases.length>0 };
  } catch (error) { report.hosting = { apiReadOk:false, error:sanitizeError(error) }; }

  report.rollback = { configPresent:report.checks.rollbackConfigPresent, configSha256:sha(rollbackConfigText), currentReleaseAnchor:report.hosting?.currentRelease?.version || report.hosting?.currentRelease?.name || '', previousReleaseAnchor:report.hosting?.previousRelease?.version || report.hosting?.previousRelease?.name || '', exactRollbackAnchorAvailable:Boolean(report.hosting?.currentRelease && report.checks.rollbackConfigPresent) };
  const candidateComplete = report.checks.releaseFilesPresent && report.checks.hostingPublicIsPlatform && report.featureFlags.candidate.allRequiredEnabledInSource;
  const dataComplete = report.checks.sourceCountsMatch && report.checks.canonicalCountsMatch && report.checks.advisorsSeven;
  const hostingReady = report.checks.publicReachable && report.hosting.apiReadOk && report.rollback.exactRollbackAnchorAvailable;
  report.checks.candidateComplete = candidateComplete;
  report.checks.dataComplete = dataComplete;
  report.checks.hostingReady = hostingReady;
  if (!candidateComplete || !dataComplete) { report.decision='NO_GO'; report.classification=!candidateComplete?'FUNCTIONAL_DEFECT':'DATA_CONTRACT_FAILURE'; }
  else if (!hostingReady) { report.decision='GO_LIMITED_SCOPE'; report.classification='ENVIRONMENT_FAILURE'; }
  else { report.decision='GO_FULL'; report.classification='PREDEPLOY_READONLY_PASS'; }
  report.ok = report.decision !== 'NO_GO';
} catch (error) {
  report.decision='NO_GO'; report.classification=String(error?.message || '').split(':')[0] || 'ENVIRONMENT_FAILURE'; report.error=sanitizeError(error); report.ok=false;
} finally {
  if (app) await deleteApp(app).catch(() => {});
  fs.mkdirSync(path.dirname(OUT), {recursive:true});
  fs.writeFileSync(OUT, JSON.stringify(report,null,2)+'\n', 'utf8');
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
process.exit(report.decision==='NO_GO'?41:0);
