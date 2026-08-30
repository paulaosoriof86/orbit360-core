#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(process.argv[2]||path.join(process.cwd(),'orbit360-platform'));
const repoRoot=path.resolve(root,'..');
const A=p=>path.join(root,p); const AR=p=>path.join(repoRoot,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const readRepo=p=>fs.readFileSync(AR(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const REG='docs/orbit360-runtime-capability-registry-v20260828.json';
const PRES='docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG='docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const CLOSURE='docs/orbit360-approved-runtime-closure-registry-v20260829.json';
const INDEX='index.html';
const norm=v=>String(v||'').trim().replace(/^\.\//,'').replace(/^orbit360-platform\//,'').split('?')[0].split('#')[0];
const exists=p=>fs.existsSync(A(norm(p)));
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'RUNTIME_CAPABILITY_APPROVED_CLOSURE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtimeProofSatisfied:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};
const gitBlob=p=>execFileSync('git',['hash-object','--',`orbit360-platform/${norm(p)}`],{cwd:repoRoot,encoding:'utf8'}).trim();

for(const p of [REG,PRES,ASEG,CLOSURE,INDEX]) if(!exists(p)) fail('REQUIRED_INPUT_MISSING',{path:p});
let R,P,D,C; try{R=json(REG);P=json(PRES);D=json(ASEG);C=json(CLOSURE);}catch(error){fail('REGISTRY_JSON_INVALID',{detail:String(error?.message||error)});}
if(R.schemaVersion!=='orbit360-runtime-capability-registry-v4-approved-package-closure'||R.status!=='ACTIVE_SOURCE_PACKAGE_CLOSURE_FAIL_CLOSED_RUNTIME_PROOF_REQUIRED'||R.stateBearing!==false||R.dynamicStateForbidden!==true)fail('RUNTIME_REGISTRY_CONTRACT_INVALID');
if(C.schemaVersion!=='orbit360-approved-runtime-closure-registry-v1'||C.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED'||C.stateBearing!==false||C.dynamicStateForbidden!==true)fail('APPROVED_CLOSURE_REGISTRY_INVALID');
if(Number(C.baseline?.artifactId)!==Number(P.baseline?.artifactId)||String(C.baseline?.manifestSha256)!==String(P.baseline?.manifestSha256)||Number(C.baseline?.fileCount)!==Number(P.baseline?.fileCount))fail('BASELINE_PACKAGE_BINDING_DESYNC');

const rules=R.rules||{};
for(const k of ['repositoryExistenceDoesNotEqualRuntimeReachability','runtimeReachabilityDoesNotEqualOperationalEligibility','operationalEligibilityDoesNotEqualRuntimeProof','certifiedArtifactScriptDoesNotImplyRuntimeEntrypoint','dynamicLiteralLoaderCountsAsReachability','finalOperationalOwnerMustMatchDomainRegistry','legacyConsumerMayRemainReachableWithoutBeingFinalAuthority','nonEntrypointCertifiedAssetsAreNotOrphans','sourcePassCannotCloseVisibleDefect','approvedBaselineToPackageClosureRequired','acceptedOverlayMustRemainInsidePackageClosure'])if(rules[k]!==true)fail('RUNTIME_REGISTRY_RULE_MISSING',{rule:k});

const index=read(INDEX),direct=new Set();
for(const m of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi))direct.add(norm(m[1]));
for(const m of index.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){const x=norm(m[1]);if(/\.(?:css|js)$/i.test(x))direct.add(x);}
const reachable=new Set(),queue=[...direct]; const assetRef=/["'`]((?:\.\/)?(?:modules|core|data|styles)\/[A-Za-z0-9._\/-]+\.(?:js|css))(?:\?[^"'`]*)?["'`]/g;
while(queue.length){const rel=norm(queue.shift());if(!rel||reachable.has(rel))continue;reachable.add(rel);if(!exists(rel)||!rel.endsWith('.js'))continue;const src=read(rel);for(const m of src.matchAll(assetRef)){const child=norm(m[1]);if(!reachable.has(child))queue.push(child);}}
const missingDirect=[...direct].filter(x=>!exists(x));if(missingDirect.length)fail('DIRECT_ENTRYPOINT_ASSET_MISSING',{missingDirect});

const approvedModules=new Set((P.approvedModuleScripts||[]).map(norm));
const baselineMembers=new Set([...(P.approvedModuleScripts||[]),...(C.baselineCertifiedCoreAssets||[]),...(C.productEntrypointDirectAssets||[])].map(norm));
const overlays=new Map((P.activeOverlay?.acceptedFiles||[]).map(x=>[norm(x.path),x]));
for(const [p,row] of overlays){if(!baselineMembers.has(p))fail('OVERLAY_PATH_OUTSIDE_CERTIFIED_PACKAGE_CLOSURE',{path:p});if(!exists(p))fail('OVERLAY_SOURCE_MISSING',{path:p});if(String(row.afterGitBlobSha||'')!==gitBlob(p))fail('OVERLAY_SOURCE_BLOB_DESYNC',{path:p,expected:row.afterGitBlobSha,current:gitBlob(p)});}
for(const p of C.productEntrypointDirectAssets||[]){const n=norm(p);if(!exists(n)||!baselineMembers.has(n))fail('PRODUCT_ENTRYPOINT_CLOSURE_ASSET_MISSING',{path:n});}
for(const m of approvedModules){if(!baselineMembers.has(m)||!exists(m))fail('APPROVED_MODULE_PACKAGE_CLOSURE_FAIL',{path:m});}
const closureResults=[];
for(const cap of C.capabilities||[]){const missing=[];for(const p of cap.requiredPackageAssets||[]){const n=norm(p);if(!exists(n)||!baselineMembers.has(n))missing.push(n);}if(missing.length)fail('CAPABILITY_PACKAGE_CLOSURE_FAIL',{capabilityId:cap.capabilityId,missing});closureResults.push({capabilityId:cap.capabilityId,requiredPackageAssetCount:(cap.requiredPackageAssets||[]).length,ok:true});}

function requireText(source,label,needles){for(const needle of needles){const ok=needle instanceof RegExp?needle.test(source):source.includes(needle);if(!ok)fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,missing:String(needle)});}}
function forbidText(source,label,needles){for(const needle of needles){if(needle instanceof RegExp?needle.test(source):source.includes(needle))fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,forbidden:String(needle)});}}
function sourceAssertions(capabilityId){
 if(capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY'){
   const owner=read('core/client-insurer-operational-directory-owner-v20260722.js'); const boot=read('core/router-tenant-config-product-bootstrap-p0.js');
   requireText(owner,'authorized_direct_record_reveal',["var VERSION = '20260829.1';",'credentialRecordFallbackForAuthorizedRoles: true','credentialProviderFallbackPreserved: true','function credentialAccessAllowed()','function inlineCredential(portal)','portal.password','portal.pass','portal.contrasena','portal.clave','Orbit.secureResources.revealCredential',"secret.textContent = 'Oculta'"]);
   requireText(boot,'product_bootstrap_loads_approved_owner',['client-insurer-operational-directory-owner-v20260722.js?v=20260829-1',"mode:'product-readonly'",'writeAuthorized:false']);
   return {ok:true,assertions:3,directRecordAuthorized:true,providerFallback:true};
 }
 if(capabilityId==='CLIENTE360_PRIMARY_RUNTIME'){
   const module=read('modules/cliente360.js'),router=read('core/router.js'),hydration=read('core/visual-runtime-hydration-contract-v20260805.js');
   requireText(module,'cliente360_reads_clientes_from_orbit_store',[/S\s*=\s*\(\)\s*=>\s*Orbit\.store/,/S\(\)\.all\(['"]clientes['"]\)/,/rows\.length\s*===\s*0/]);
   requireText(router,'router_reacts_to_clientes_store_updates',['REACTIVE_COLLECTIONS','wireStoreRefresh',/cliente360\s*:\s*\[[^\]]*['"]clientes['"]/,'Orbit.store.on',"'*'",'setTimeout']);
   requireText(hydration,'hydration_contract_observes_clientes',[/cliente360\s*:\s*\{\s*required\s*:\s*\[[^\]]*['"]clientes['"]/,'Orbit.store.on']);
   return {ok:true,assertions:7,runtimeRowsStillRequired:true,storeWrapperSemanticValidated:true,emptyStateSemanticValidated:true,reactiveRouterSemanticValidated:true,hydrationSemanticValidated:true};
 }
 if(capabilityId==='LOGIN_INTERACTIVE_ENTRY'){const auth=read('core/auth.js'),store=read('data/store-firestore-lab.local.js'),router=read('core/router.js');requireText(auth,'auth_is_membership_gated',['waitForMembership','signInWithEmailAndPassword']);requireText(store,'store_is_membership_gated',['membershipRequired: true','authGatedSnapshots: true']);requireText(router,'router_waits_are_bounded',['waitForPwaReady','Promise.race']);forbidText(auth+store,'human_login_has_no_demo_identity_fallback',['orbit.lab@demo.com']);return {ok:true,assertions:4,latencyRuntimeMeasurementRequired:true};}
 fail('UNKNOWN_CAPABILITY_SOURCE_ASSERTION',{capabilityId});
}

const capabilityResults=[];
for(const c of R.capabilities||[]){const required=(c.requiredReachableAssets||[]).map(norm),requiredDirect=(c.requiredDirectAssets||[]).map(norm);const missingReachable=required.filter(x=>!reachable.has(x)),missingDirectRequired=requiredDirect.filter(x=>!direct.has(x));const finalOwner=norm(c.finalOwner?.path),ownerExists=finalOwner?exists(finalOwner):false;const closureCap=(C.capabilities||[]).find(x=>x.capabilityId===c.capabilityId);const ownerPackageMember=closureCap?(closureCap.requiredPackageAssets||[]).map(norm).includes(finalOwner):false;const ownerReachable=finalOwner?(reachable.has(finalOwner)||ownerPackageMember):false;if(!ownerExists||!ownerReachable||missingDirectRequired.length)fail('CAPABILITY_OWNER_REACHABILITY_FAIL',{capabilityId:c.capabilityId,finalOwner,ownerExists,ownerReachable,missingReachable,missingDirectRequired});if(c.runtimeProof?.required!==true||c.runtimeProof?.sourcePassClosesDefect!==false||!c.runtimeProof?.visibleDefectId)fail('RUNTIME_PROOF_CONTRACT_MISSING',{capabilityId:c.capabilityId});const operational=sourceAssertions(c.capabilityId);capabilityResults.push({capabilityId:c.capabilityId,finalOwner,ownerExists,sourceReachable:reachable.has(finalOwner),packageClosureMember:ownerPackageMember,sourceOperationalAssertions:operational,runtimeProofRequired:true,runtimeProofSatisfied:false,visibleDefectId:c.runtimeProof.visibleDefectId});}

const aseg=(R.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');const domainPath=norm(D.finalOperationalOwner?.path||'');if(!aseg||norm(aseg.finalOwner?.path)!==domainPath||String(aseg.finalOwner?.version||'')!==String(D.finalOperationalOwner?.version||'')||String(aseg.finalOwner?.ownerId||'')!==String(D.finalOperationalOwner?.ownerId||''))fail('ASEGURADORAS_FINAL_OWNER_REGISTRY_DESYNC',{runtimeOwner:aseg?.finalOwner||null,domainOwner:D.finalOperationalOwner||null});
const defectsOpen=capabilityResults.map(x=>x.visibleDefectId);
console.log(JSON.stringify({ok:true,status:'RUNTIME_CAPABILITY_APPROVED_BASELINE_SOURCE_PACKAGE_CLOSURE_PASS_RUNTIME_PROOF_PENDING',classification:'PASS',entrypoint:INDEX,baselineArtifactId:C.baseline.artifactId,baselineManifestSha256:C.baseline.manifestSha256,directAssetCount:direct.size,reachableAssetCount:reachable.size,approvedModuleScriptCount:approvedModules.size,acceptedOverlayCount:overlays.size,packageClosure:closureResults,capabilities:capabilityResults,aseguradorasFinalOwnerAligned:true,sourceCompositionOk:true,approvedPackageClosureOk:true,runtimeProofSatisfied:false,visibleDefectsRemainOpen:defectsOpen,rule:'approved_baseline -> source -> product entrypoint/owner -> certified package closure; visible defects close only with explicit runtime proof',sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
