#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||path.join(process.cwd(),'orbit360-platform'));
const A=p=>path.join(root,p);
const norm=v=>String(v||'').trim().replace(/^\.\//,'').replace(/^orbit360-platform\//,'').split('?')[0].split('#')[0];
const read=p=>fs.readFileSync(A(norm(p)),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(A(norm(p)));
const REG='docs/orbit360-runtime-capability-registry-v20260828.json';
const CLOSURE='docs/orbit360-approved-runtime-closure-registry-v20260829.json';
const ENTRY='docs/orbit360-certified-product-entrypoint-contract-v20260830.json';
const ASEG='docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'RUNTIME_CAPABILITY_CERTIFIED_PRODUCT_ENTRYPOINT_FAIL',classification:code==='CERTIFIED_DIRECT_ASSET_COUNT_DESYNC'?'VALIDATOR_STALE':'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtimeProofSatisfied:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};
for(const p of [REG,CLOSURE,ENTRY,ASEG])if(!exists(p))fail('REQUIRED_INPUT_MISSING',{path:p});
let R,C,E,D;try{R=json(REG);C=json(CLOSURE);E=json(ENTRY);D=json(ASEG);}catch(error){fail('REGISTRY_JSON_INVALID',{detail:String(error?.message||error)});}
if(R.schemaVersion!=='orbit360-runtime-capability-registry-v5-certified-product-entrypoint'||R.status!=='ACTIVE_CERTIFIED_PRODUCT_ENTRYPOINT_FAIL_CLOSED_RUNTIME_PROOF_REQUIRED')fail('RUNTIME_REGISTRY_CONTRACT_INVALID');
if(C.schemaVersion!=='orbit360-approved-runtime-closure-registry-v2-certified-product-entrypoint'||C.status!=='ACTIVE_CERTIFIED_PRODUCT_ENTRYPOINT_SOURCE_ONLY_FAIL_CLOSED')fail('APPROVED_CLOSURE_REGISTRY_INVALID');
if(E.schemaVersion!=='orbit360-certified-product-entrypoint-contract-v2-full-direct-asset-parity'||E.status!=='CERTIFIED_ARTIFACT_ENTRYPOINT_BASELINE_WITH_SUCCESSOR_OVERLAYS')fail('CERTIFIED_PRODUCT_ENTRYPOINT_CONTRACT_INVALID');
if(Number(E.baseline?.artifactId)!==Number(C.baseline?.artifactId)||String(E.baseline?.manifestSha256)!==String(C.baseline?.manifestSha256)||String(E.baseline?.indexSha256)!==String(C.baseline?.indexSha256))fail('CERTIFIED_PRODUCT_ENTRYPOINT_BASELINE_DESYNC');
for(const k of ['sourceIndexIsNotProductEntrypointAuthority','requiredReachableAssetsMustActuallyBeReachable','requiredDirectAssetsMustActuallyBeDirect','packageMembershipCannotSubstituteForReachability','productRuntimeOwnersMustMatchCertifiedArtifact','pwaMustNotBlockRouterStartup','requiredHydrationNeedsServerConfirmedSnapshot','runtimeContractsPreferNetworkWithCacheFallback'])if(R.rules?.[k]!==true)fail('RUNTIME_REGISTRY_RULE_MISSING',{rule:k});
if(E.rules?.declaredDirectAssetCountMustEqualDirectAssetArrayLength!==true||E.rules?.certifiedDirectAssetArrayDerivedFromPhysicalArtifactIndex!==true)fail('CERTIFIED_DIRECT_ASSET_PARITY_RULE_MISSING');

const direct=new Set((E.certifiedDirectAssets||[]).map(norm));
if(Number(E.baseline?.directAssetCount)!==direct.size)fail('CERTIFIED_DIRECT_ASSET_COUNT_DESYNC',{declaredDirectAssetCount:Number(E.baseline?.directAssetCount||0),listedDirectAssetCount:direct.size});
const packageMembers=new Set([...(E.certifiedDirectAssets||[]),...(E.certifiedPackageNonEntrypointAssets||[]),...(C.baselineCertifiedCoreAssets||[]),...(C.productEntrypointDirectAssets||[])].map(norm));
for(const cap of C.capabilities||[])for(const p of cap.requiredPackageAssets||[])packageMembers.add(norm(p));
for(const p of direct)if(!exists(p))fail('CERTIFIED_DIRECT_ASSET_SOURCE_MISSING',{path:p});
for(const p of C.productEntrypointDirectAssets||[]){const n=norm(p);if(!direct.has(n))fail('DECLARED_PRODUCT_DIRECT_ASSET_NOT_CERTIFIED_DIRECT',{path:n});if(!exists(n))fail('PRODUCT_DIRECT_ASSET_SOURCE_MISSING',{path:n});}

const reachable=new Set(),queue=[...direct];
const assetRef=/["'`]((?:\.\/)?(?:(?:modules|core|data|styles)\/[A-Za-z0-9._\/-]+\.(?:js|css)|sw\.js))(?:\?[^"'`]*)?["'`]/g;
while(queue.length){const rel=norm(queue.shift());if(!rel||reachable.has(rel))continue;reachable.add(rel);if(!exists(rel)||!rel.endsWith('.js'))continue;const src=read(rel);for(const m of src.matchAll(assetRef)){const child=norm(m[1]);if(!reachable.has(child))queue.push(child);}}
function requireText(source,label,needles){for(const needle of needles){const ok=needle instanceof RegExp?needle.test(source):source.includes(needle);if(!ok)fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,missing:String(needle)});}}
function forbidText(source,label,needles){for(const needle of needles){if(needle instanceof RegExp?needle.test(source):source.includes(needle))fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,forbidden:String(needle)});}}

function sourceAssertions(capabilityId){
  if(capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY'){
    const owner=read('core/client-insurer-operational-directory-owner-v20260722.js'),boot=read('core/router-tenant-config-product-bootstrap-p0.js');
    requireText(owner,'aseguradoras_authorized_reveal',["var VERSION = '20260829.1';",'credentialRecordFallbackForAuthorizedRoles: true','credentialProviderFallbackPreserved: true','function credentialAccessAllowed()','portal.password','portal.pass','portal.contrasena','portal.clave','Orbit.secureResources.revealCredential']);
    requireText(boot,'product_bootstrap_current_owner',['client-insurer-operational-directory-owner-v20260722.js?v=20260829-1',"mode:'product-readonly'",'writeAuthorized:false']);
    return {ok:true,approvedOwnerVersion:'20260829.1',directRecordAuthorized:true,providerFallback:true};
  }
  if(capabilityId==='CLIENTE360_PRIMARY_RUNTIME'){
    const module=read('modules/cliente360.js'),router=read('core/router.js'),store=read('data/store-firestore-product-readonly-p0.js'),hydration=read('core/product-hydration-required-optional-p0.js');
    requireText(module,'cliente360_store_semantics',[/S\s*=\s*\(\)\s*=>\s*Orbit\.store/,/S\(\)\.all\(['"]clientes['"]\)/,/rows\.length\s*===\s*0/]);
    requireText(router,'cliente360_reactive_router',['REACTIVE_COLLECTIONS','wireStoreRefresh',/cliente360\s*:\s*\[[^\]]*['"]clientes['"]/,'Orbit.store.on']);
    requireText(store,'authoritative_product_store',["p0-20260830-authoritative-snapshot-1",'serverConfirmedCollections','cacheOnlyCollections','snapshot.metadata.fromCache','waiting-authoritative-snapshots']);
    requireText(hydration,'authoritative_required_hydration',["p0-20260830-authoritative-required-optional-1",'requiredObservedButUnconfirmed','serverConfirmedCollections','authoritativeServerSnapshotRequired: true']);
    return {ok:true,serverConfirmedReadiness:true,cacheOnlyCannotSatisfyRequiredReadiness:true,runtimeRowsStillRequired:true};
  }
  if(capabilityId==='LOGIN_INTERACTIVE_ENTRY'){
    const auth=read('core/auth-product-runtime-p0.js'),app=read('core/product-app-p0.js'),router=read('core/router.js'),pwa=read('core/pwa.js'),sw=read('sw.js'),bootstrap=read('core/backend-product-readonly-bootstrap-p0.js');
    requireText(auth,'product_auth_owner',['Product Auth owner P0','p.signIn','Orbit.productAppP0.activate','noLocalSession:true']);
    forbidText(auth,'product_auth_no_demo_fallback',['admin@demo.com','orbit.lab@demo.com']);
    requireText(app,'product_app_activation',['backendProductReadOnlyBootstrapP0','Orbit.router.init','showApp']);
    requireText(bootstrap,'membership_before_store',['waitForAuthenticatedUser','getByUid','createFirestoreProductReadOnlyStoreP0','waitForStoreReady']);
    requireText(router,'pwa_nonblocking_startup',['begin();','startupBlocking: false']);
    if(/Promise\.race\([\s\S]{0,300}OrbitPwaWorkerReady|setTimeout\([^\n]*20000/.test(router))fail('PWA_STILL_BLOCKS_ROUTER_STARTUP');
    requireText(pwa,'current_pwa_release',["20260830-visual-runtime-rootfix-1","post-go-live-visual-runtime-rootfix-20260830-1"]);
    requireText(sw,'service_worker_network_first',["network-first-bounded-fallback","/core/router-tenant-config-product-bootstrap-p0.js","/core/auth-product-runtime-p0.js","/core/product-hydration-required-optional-p0.js","/data/store-firestore-product-readonly-p0.js"]);
    forbidText(sw,'service_worker_no_legacy_bootstrap_critical',["'/core/router-tenant-config-bootstrap.js'"]);
    return {ok:true,productAuthOwner:true,pwaStartupBlocking:false,serviceWorkerNetworkFirst:true,latencyRuntimeMeasurementRequired:true};
  }
  fail('UNKNOWN_CAPABILITY_SOURCE_ASSERTION',{capabilityId});
}

const closureResults=[];
for(const cap of C.capabilities||[]){const missing=[];for(const p of cap.requiredPackageAssets||[]){const n=norm(p);if(!exists(n)||!packageMembers.has(n))missing.push(n);}if(missing.length)fail('CAPABILITY_PACKAGE_CLOSURE_FAIL',{capabilityId:cap.capabilityId,missing});closureResults.push({capabilityId:cap.capabilityId,requiredPackageAssetCount:(cap.requiredPackageAssets||[]).length,ok:true});}
const capabilityResults=[];
for(const c of R.capabilities||[]){
  const required=(c.requiredReachableAssets||[]).map(norm),requiredDirect=(c.requiredDirectAssets||[]).map(norm);
  const missingReachable=required.filter(x=>!reachable.has(x)),missingDirect=requiredDirect.filter(x=>!direct.has(x));
  if(missingReachable.length||missingDirect.length)fail('CAPABILITY_REAL_REACHABILITY_FAIL',{capabilityId:c.capabilityId,missingReachable,missingDirect});
  const finalOwner=norm(c.finalOwner?.path);if(!finalOwner||!exists(finalOwner)||!reachable.has(finalOwner))fail('CAPABILITY_FINAL_OWNER_NOT_REACHABLE',{capabilityId:c.capabilityId,finalOwner});
  if(!packageMembers.has(finalOwner))fail('CAPABILITY_FINAL_OWNER_OUTSIDE_PACKAGE',{capabilityId:c.capabilityId,finalOwner});
  if(c.runtimeProof?.required!==true||c.runtimeProof?.sourcePassClosesDefect!==false||!c.runtimeProof?.visibleDefectId)fail('RUNTIME_PROOF_CONTRACT_MISSING',{capabilityId:c.capabilityId});
  capabilityResults.push({capabilityId:c.capabilityId,finalOwner,sourceReachable:true,packageMember:true,sourceOperationalAssertions:sourceAssertions(c.capabilityId),runtimeProofRequired:true,runtimeProofSatisfied:false,visibleDefectId:c.runtimeProof.visibleDefectId});
}
const aseg=(R.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');
if(!aseg||norm(aseg.finalOwner?.path)!==norm(D.finalOperationalOwner?.path)||String(aseg.finalOwner?.version||'')!==String(D.finalOperationalOwner?.version||'')||String(aseg.finalOwner?.ownerId||'')!==String(D.finalOperationalOwner?.ownerId||''))fail('ASEGURADORAS_FINAL_OWNER_REGISTRY_DESYNC');
const defectsOpen=capabilityResults.map(x=>x.visibleDefectId);
console.log(JSON.stringify({ok:true,status:'RUNTIME_CAPABILITY_CERTIFIED_PRODUCT_ENTRYPOINT_SOURCE_PACKAGE_CLOSURE_PASS_RUNTIME_PROOF_PENDING',classification:'PASS',entrypointAuthority:ENTRY,baselineArtifactId:E.baseline.artifactId,baselineManifestSha256:E.baseline.manifestSha256,baselineIndexSha256:E.baseline.indexSha256,declaredDirectAssetCount:Number(E.baseline.directAssetCount),certifiedDirectAssetCount:direct.size,directAssetParity:true,reachableAssetCount:reachable.size,packageClosure:closureResults,capabilities:capabilityResults,sourceCompositionOk:true,approvedPackageClosureOk:true,realProductEntrypointModel:true,runtimeProofSatisfied:false,visibleDefectsRemainOpen:defectsOpen,rule:'certified product entrypoint -> complete physical direct asset inventory -> current source owners -> package closure -> runtime proof; source index/LAB is not product authority',sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
