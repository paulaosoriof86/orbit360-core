#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=path.resolve(process.argv[2]||process.cwd());
const PLAT=path.join(ROOT,'orbit360-platform');
const read=p=>fs.readFileSync(path.join(PLAT,p),'utf8').replace(/^\uFEFF/,'');
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'PRODUCT_VISUAL_RUNTIME_CHAIN_ROOTFIX_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,dataWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};
function need(src,label,items){for(const item of items){const ok=item instanceof RegExp?item.test(src):src.includes(item);if(!ok)fail('SOURCE_ASSERTION_MISSING',{label,missing:String(item)});}}
function forbid(src,label,items){for(const item of items){if(item instanceof RegExp?item.test(src):src.includes(item))fail('SOURCE_ASSERTION_FORBIDDEN',{label,forbidden:String(item)});}}
for(const p of ['core/router.js','core/pwa.js','sw.js','data/store-firestore-product-readonly-p0.js','core/product-hydration-required-optional-p0.js'])if(!fs.existsSync(path.join(PLAT,p)))fail('TARGET_MISSING',{path:p});
const router=read('core/router.js'),pwa=read('core/pwa.js'),sw=read('sw.js'),store=read('data/store-firestore-product-readonly-p0.js'),hydration=read('core/product-hydration-required-optional-p0.js');
need(router,'pwa_nonblocking_router',['startupBlocking: false','begin();']);
forbid(router,'pwa_nonblocking_router',[/Promise\.race\([\s\S]{0,350}pwaReady[\s\S]{0,350}20000/]);
need(pwa,'current_pwa_release',["20260830-visual-runtime-rootfix-1","post-go-live-visual-runtime-rootfix-20260830-1"]);
need(sw,'service_worker_current_network_first',["orbit360-v20260830-visual-runtime-rootfix-1","network-first-bounded-fallback","'/core/router-tenant-config-product-bootstrap-p0.js'","'/core/auth-product-runtime-p0.js'","'/core/product-hydration-required-optional-p0.js'","'/data/store-firestore-product-readonly-p0.js'"]);
forbid(sw,'service_worker_current_network_first',["'/core/router-tenant-config-bootstrap.js'","cache-first-bounded-revalidate"]);
need(store,'server_confirmed_store',["p0-20260830-authoritative-snapshot-1",'serverConfirmedCollections','cacheOnlyCollections','snapshot.metadata.fromCache','waiting-authoritative-snapshots']);
need(hydration,'server_confirmed_hydration',["p0-20260830-authoritative-required-optional-1",'requiredObservedButUnconfirmed','serverConfirmedCollections','authoritativeServerSnapshotRequired: true']);
const child=spawnSync(process.execPath,[path.join(ROOT,'tools/orbit360-validar-runtime-capability-composition-v20260828.mjs'),PLAT],{cwd:ROOT,encoding:'utf8'});
let out={};try{out=JSON.parse(String(child.stdout||'').trim());}catch{}
if(child.status!==0||out.ok!==true||out.status!=='RUNTIME_CAPABILITY_CERTIFIED_PRODUCT_ENTRYPOINT_SOURCE_PACKAGE_CLOSURE_PASS_RUNTIME_PROOF_PENDING')fail('COMPOSITION_VALIDATOR_NOT_PASS',{childStatus:out.status||child.status,childCode:out.code||''});
console.log(JSON.stringify({ok:true,status:'PRODUCT_VISUAL_RUNTIME_CHAIN_ROOTFIX_SOURCE_PASS',classification:'PASS',targets:5,pwaStartupBlocking:false,serviceWorkerRuntimeContracts:'network-first-bounded-fallback',requiredHydrationAuthority:'server-confirmed-snapshot',realProductEntrypointModel:true,runtimeProofSatisfied:false,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,dataWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
