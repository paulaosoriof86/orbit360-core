#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('orbit360-platform/index.html');
const app=read('orbit360-platform/core/product-app-p0.js');
const writer=read('orbit360-platform/data/store-firestore-product-operational-p0.js');
const firebase=JSON.parse(read('firebase.json'));
const failures=[];
function requireText(haystack,needle,label){if(!haystack.includes(needle))failures.push('missing:'+label+':'+needle);}
function forbid(haystack,re,label){if(re.test(haystack))failures.push('forbidden:'+label+':'+re);}
[
 ['core/auth-product-runtime-p0.js','product auth'],
 ['data/store-firestore-product-readonly-p0.js','read authority'],
 ['data/store-firestore-product-operational-p0.js','write owner'],
 ['core/product-hydration-required-optional-p0.js','hydration'],
 ['core/product-app-p0.js','startup'],
 ['core/router.js','router'],
 ['core/pwa.js','pwa'],
 ['modules/aseguradoras-op2-operational-resources.js','aseguradoras operational resources'],
 ['core/client-insurer-operational-directory-owner-v20260722.js','aseguradoras directory owner'],
 ['core/ops-leads-domain-client.js','ops/leads domain'],
 ['core/cobros-reconciliation-domain-client.js','cobros domain']
].forEach(([needle,label])=>requireText(index,needle,label));
forbid(index,/backend-lab-|store-firestore-lab|data\/seed\.js|core\/auth\.js|data\/store\.js|orbitBackend=firestore-lab/i,'prod entrypoint contamination');
forbid(index,/Orbit\.store\.init\s*\(\s*Orbit\.SEED|Orbit\.router\.init\s*\(\s*\)\s*;\s*Orbit\.auth\.init/i,'legacy eager startup');
if(!firebase.hosting||firebase.hosting.public!=='orbit360-platform')failures.push('hosting-public-not-orbit360-platform');
forbid(app,/120000|30000|waitForRouterReady|OrbitPwaWorkerReady/i,'blocking/long startup wait');
requireText(app,"snapshotTimeoutMs:20000",'bounded required hydration');
requireText(app,"requestIdleCallback",'nonessential deferred');
requireText(writer,"PRODUCT_WRITE_MEMBERSHIP_REQUIRED",'membership fail closed');
requireText(writer,"PRODUCT_WRITE_ACCESS_DENIED",'access fail closed');
requireText(writer,"PRODUCT_WRITE_SECURE_INSURER_OWNER_REQUIRED",'secure insurer separation');
requireText(writer,"urlTenantAllowed:false",'no URL tenant');
forbid(writer,/orbitBackend\s*=\s*['\"]firestore-lab|new\s+URLSearchParams\s*\(|localStorage\s*\.|Orbit\.SEED/i,'writer legacy fallback');
if(failures.length){console.error(JSON.stringify({ok:false,failures},null,2));process.exit(1);}
console.log(JSON.stringify({ok:true,entrypoint:'orbit360-platform/index.html',hostingPublic:firebase.hosting.public,checks:21},null,2));
