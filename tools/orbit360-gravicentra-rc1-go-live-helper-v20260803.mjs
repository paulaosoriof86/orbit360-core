#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const mode = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const RC1_ROOT = process.env.ORBIT360_RC1_ROOT || ROOT;
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const LIVE_URL = (process.env.ORBIT360_LIVE_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const SITE = new URL(LIVE_URL).hostname.split('.')[0];
const EVIDENCE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const BEFORE_FILE = path.join(EVIDENCE, 'gravicentra-rc1-go-live-before.json');
const SMOKE_FILE = path.join(EVIDENCE, 'gravicentra-rc1-go-live-smoke.json');
const ROLLBACK_FILE = path.join(EVIDENCE, 'gravicentra-rc1-go-live-rollback.json');
const PLATFORM = path.join(RC1_ROOT, 'orbit360-platform');
const ASSETS = ['index.html','styles/base.css','core/config.js','modules/cliente360.js','modules/aseguradoras.js','modules/polizas.js','modules/cobros.js','modules/ops.js','modules/leads.js','data/store-firestore-lab.local.js'];
const COLLECTIONS = ['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EXPECTED_SOURCE = Object.freeze({ clientes:430, aseguradoras:30, polizas:1373, vehiculos:1032, recibosEsperados:1294, carteraPrimas:673, cobros:5 });
const EXPECTED_CANONICAL = Object.freeze({ clientes:430, aseguradoras:30, polizas:1375, vehiculos:1033, recibosEsperados:1294, carteraPrimas:673, cobros:7 });
const REQUIRED_MODULES = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];
const TIMEOUT_MS = 20000;
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
const safeFetch = async (url, options={}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try { return await fetch(url, {...options, signal:controller.signal, redirect:'follow'}); }
  finally { clearTimeout(timer); }
};
const write = (file, payload) => {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, JSON.stringify({...payload, firestoreWrites:0, authWrites:0, operationalWrites:0, reimportExecuted:false, functionsDeployed:false, rulesApplied:false, mainTouched:false, mergeExecuted:false, containsPII:false, containsDocumentIds:false, containsValues:false, containsSecrets:false}, null, 2) + '\n', 'utf8');
};
const sanitize = error => String(error?.message || error || '').replace(/[\r\n]+/g,' ').slice(0,700);

let app;
const getDb = () => {
  app = getApps()[0] || initializeApp({credential:applicationDefault(), projectId:PROJECT});
  return getFirestore(app);
};
const readData = async () => {
  const db = getDb();
  const source = {}, canonical = {};
  for (const name of COLLECTIONS) {
    const [a,b] = await Promise.all([
      db.collection('tenantId').doc(TENANT).collection(name).get(),
      db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get()
    ]);
    source[name] = {count:a.size, expected:EXPECTED_SOURCE[name], countMatch:a.size===EXPECTED_SOURCE[name], digest:snapshotDigest(a.docs)};
    canonical[name] = {count:b.size, expected:EXPECTED_CANONICAL[name], countMatch:b.size===EXPECTED_CANONICAL[name], digest:snapshotDigest(b.docs)};
  }
  const advisorCounts = {};
  for (const name of ['asesores','advisors']) advisorCounts[name] = (await db.collection('tenantId').doc(TENANT).collection(name).get()).size;
  return {source, canonical, advisorCounts, allCountsMatch:Object.values(source).every(x=>x.countMatch)&&Object.values(canonical).every(x=>x.countMatch)&&Object.values(advisorCounts).includes(7)};
};
const getToken = async () => {
  const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']});
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
  if (!token) throw new Error('HOSTING_ACCESS_TOKEN_EMPTY');
  return token;
};
const readHosting = async () => {
  const token = await getToken();
  const headers = {authorization:`Bearer ${token}`, accept:'application/json'};
  const siteResponse = await safeFetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT}/sites/${SITE}`, {headers});
  const site = await siteResponse.json().catch(()=>({}));
  const releasesResponse = await safeFetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/releases?pageSize=10`, {headers});
  const payload = await releasesResponse.json().catch(()=>({}));
  const releases = Array.isArray(payload.releases) ? payload.releases : [];
  const pick = release => release ? {name:release.name||'', version:release.version?.name||release.version||'', type:release.type||'', releaseTime:release.releaseTime||''} : null;
  return {siteReadStatus:siteResponse.status,releasesReadStatus:releasesResponse.status,siteName:site?.name||'',defaultUrl:site?.defaultUrl||LIVE_URL,releases:releases.map(pick),currentRelease:pick(releases[0]),previousRelease:pick(releases[1]),apiReadOk:siteResponse.ok&&releasesResponse.ok&&releases.length>0};
};
const publicAssets = async () => {
  const nonce = `go-live=${Date.now()}`;
  const result = {};
  for (const asset of ASSETS) {
    const response = await safeFetch(`${LIVE_URL}/${asset}?${nonce}`, {headers:{'cache-control':'no-cache','pragma':'no-cache'}});
    const bytes = Buffer.from(await response.arrayBuffer());
    result[asset] = {httpStatus:response.status,contentType:response.headers.get('content-type')||'',sha256:sha(bytes)};
  }
  return result;
};
const localAssets = () => Object.fromEntries(ASSETS.map(asset => [asset,{sha256:sha(fs.readFileSync(path.join(PLATFORM,asset)))}]));
const exactAssets = (pub, local) => ASSETS.every(asset => pub?.[asset]?.httpStatus >= 200 && pub?.[asset]?.httpStatus < 400 && pub?.[asset]?.sha256 === local?.[asset]?.sha256);
const sameData = (a,b) => COLLECTIONS.every(name => a?.source?.[name]?.count===b?.source?.[name]?.count && a?.source?.[name]?.digest===b?.source?.[name]?.digest && a?.canonical?.[name]?.count===b?.canonical?.[name]?.count && a?.canonical?.[name]?.digest===b?.canonical?.[name]?.digest) && JSON.stringify(a?.advisorCounts||{})===JSON.stringify(b?.advisorCounts||{});
const moduleCoverage = async () => {
  const nonce = `modules=${Date.now()}`;
  const [config,index] = await Promise.all([
    (await safeFetch(`${LIVE_URL}/core/config.js?${nonce}`)).text(),
    (await safeFetch(`${LIVE_URL}/index.html?${nonce}`)).text()
  ]);
  const coverage = Object.fromEntries(REQUIRED_MODULES.map(id => [id,config.includes(`'${id}'`)&&index.includes(`modules/${id}.js`)]));
  return {coverage,allRequiredPresent:Object.values(coverage).every(Boolean)};
};

try {
  if (!['before','smoke','rollback'].includes(mode)) throw new Error('GO_LIVE_HELPER_MODE_INVALID');
  if (mode === 'before') {
    const [data,hosting,pub] = await Promise.all([readData(),readHosting(),publicAssets()]);
    const local = localAssets();
    const payload = {schemaVersion:'orbit360-gravicentra-rc1-go-live-before-v1',generatedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,liveUrl:LIVE_URL,releaseCommit:process.env.ORBIT360_RELEASE_COMMIT||'',data,hosting,publicAssets:pub,localAssets:local,checks:{dataComplete:data.allCountsMatch,hostingReadable:hosting.apiReadOk,currentReleaseAvailable:Boolean(hosting.currentRelease?.version),rollbackAnchorAvailable:Boolean(hosting.currentRelease?.version),publicReachable:Object.values(pub).every(x=>x.httpStatus>=200&&x.httpStatus<400)},deployExecuted:false,productionTouched:false,ok:data.allCountsMatch&&hosting.apiReadOk&&Boolean(hosting.currentRelease?.version)};
    write(BEFORE_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(payload.ok?0:41);
  }
  if (mode === 'smoke') {
    const before = JSON.parse(fs.readFileSync(BEFORE_FILE,'utf8'));
    const local = localAssets();
    let pub = {}, matched = false;
    for (let attempt=1; attempt<=24; attempt++) {
      pub = await publicAssets();
      if (exactAssets(pub,local)) { matched=true; break; }
      await sleep(5000);
    }
    const [data,hosting,modules] = await Promise.all([readData(),readHosting(),moduleCoverage()]);
    const dataUnchanged = sameData(before.data,data);
    const newReleaseObserved = Boolean(hosting.currentRelease?.version && hosting.currentRelease.version !== before.hosting?.currentRelease?.version);
    const priorAnchorPreserved = hosting.releases.some(item => item?.version === before.hosting?.currentRelease?.version);
    const checks = {assetsExactlyRc1:matched,dataCountsComplete:data.allCountsMatch,dataUnchanged,modulesPresent:modules.allRequiredPresent,hostingReadable:hosting.apiReadOk,newReleaseObserved,priorAnchorPreserved,rollbackAnchorAvailable:Boolean(before.hosting?.currentRelease?.version)};
    const ok = Object.values(checks).every(Boolean);
    const payload = {schemaVersion:'orbit360-gravicentra-rc1-go-live-smoke-v1',generatedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,liveUrl:LIVE_URL,releaseCommit:process.env.ORBIT360_RELEASE_COMMIT||'',decision:ok?'PRODUCTION_SMOKE_PASS':'PRODUCTION_SMOKE_FAIL_ROLLBACK_REQUIRED',classification:ok?'GO_LIVE_PASS':'FUNCTIONAL_DEFECT',checks,data,hosting,modules,publicAssets:pub,deployExecuted:true,productionTouched:true,rollbackExecuted:false,ok};
    write(SMOKE_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(ok?0:41);
  }
  if (mode === 'rollback') {
    const before = JSON.parse(fs.readFileSync(BEFORE_FILE,'utf8'));
    const anchor = before.hosting?.currentRelease?.version;
    if (!anchor) throw new Error('ROLLBACK_ANCHOR_MISSING');
    const token = await getToken();
    const response = await safeFetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/releases?versionName=${encodeURIComponent(anchor)}`, {method:'POST',headers:{authorization:`Bearer ${token}`,accept:'application/json','content-type':'application/json'},body:'{}'});
    const responseBody = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(`ROLLBACK_RELEASE_CREATE_FAILED_${response.status}`);
    let pub = {}, restored = false;
    for (let attempt=1; attempt<=24; attempt++) {
      pub = await publicAssets();
      restored = ASSETS.every(asset => pub?.[asset]?.sha256 === before.publicAssets?.[asset]?.sha256);
      if (restored) break;
      await sleep(5000);
    }
    const [data,hosting] = await Promise.all([readData(),readHosting()]);
    const dataUnchanged = sameData(before.data,data);
    const ok = restored && dataUnchanged && hosting.apiReadOk;
    const payload = {schemaVersion:'orbit360-gravicentra-rc1-go-live-rollback-v1',generatedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,liveUrl:LIVE_URL,rollbackAnchor:anchor,releaseResponseName:responseBody?.name||'',checks:{rollbackReleaseCreated:response.ok,publicAssetsRestored:restored,dataUnchanged,hostingReadable:hosting.apiReadOk},data,hosting,publicAssets:pub,deployExecuted:true,productionTouched:true,rollbackExecuted:true,decision:ok?'ROLLED_BACK_SAFE':'ROLLBACK_FAILED_ESCALATE',classification:ok?'FUNCTIONAL_DEFECT':'ENVIRONMENT_FAILURE',ok};
    write(ROLLBACK_FILE,payload);
    console.log(JSON.stringify(payload,null,2));
    process.exit(ok?0:42);
  }
} catch (error) {
  const file = mode==='before'?BEFORE_FILE:mode==='rollback'?ROLLBACK_FILE:SMOKE_FILE;
  const payload = {schemaVersion:'orbit360-gravicentra-rc1-go-live-helper-error-v1',mode,generatedAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,liveUrl:LIVE_URL,decision:mode==='rollback'?'ROLLBACK_FAILED_ESCALATE':'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',error:sanitize(error),deployExecuted:mode!=='before',productionTouched:mode!=='before',rollbackExecuted:mode==='rollback',ok:false};
  write(file,payload);
  console.error(JSON.stringify(payload,null,2));
  process.exit(mode==='rollback'?42:41);
} finally {
  if (app) await deleteApp(app).catch(()=>{});
}
