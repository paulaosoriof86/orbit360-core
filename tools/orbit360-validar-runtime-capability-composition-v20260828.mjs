#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||path.join(process.cwd(),'orbit360-platform'));
const repoRoot=path.resolve(root,'..');
const A=p=>path.join(root,p);
const AR=p=>path.join(repoRoot,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const readRepo=p=>fs.readFileSync(AR(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const REG='docs/orbit360-runtime-capability-registry-v20260828.json';
const PRES='docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG='docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const INDEX='index.html';
const norm=v=>String(v||'').trim().replace(/^\.\//,'').split('?')[0].split('#')[0];
const exists=p=>fs.existsSync(A(norm(p)));
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'RUNTIME_CAPABILITY_SOURCE_CONTRACT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtimeProofSatisfied:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};

for(const p of [REG,PRES,ASEG,INDEX])if(!exists(p))fail('REQUIRED_INPUT_MISSING',{path:p});
let R,P,D;
try{R=json(REG);P=json(PRES);D=json(ASEG);}catch(error){fail('REGISTRY_JSON_INVALID',{detail:String(error?.message||error)});}
if(R.schemaVersion!=='orbit360-runtime-capability-registry-v3-operational-proof'||R.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED_RUNTIME_PROOF_REQUIRED'||R.stateBearing!==false||R.dynamicStateForbidden!==true)fail('RUNTIME_REGISTRY_CONTRACT_INVALID');
const rules=R.rules||{};
for(const k of ['repositoryExistenceDoesNotEqualRuntimeReachability','runtimeReachabilityDoesNotEqualOperationalEligibility','operationalEligibilityDoesNotEqualRuntimeProof','certifiedArtifactScriptDoesNotImplyRuntimeEntrypoint','dynamicLiteralLoaderCountsAsReachability','finalOperationalOwnerMustMatchDomainRegistry','legacyConsumerMayRemainReachableWithoutBeingFinalAuthority','nonEntrypointCertifiedAssetsAreNotOrphans','sourcePassCannotCloseVisibleDefect'])if(rules[k]!==true)fail('RUNTIME_REGISTRY_RULE_MISSING',{rule:k});

const index=read(INDEX),direct=new Set();
for(const m of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi))direct.add(norm(m[1]));
for(const m of index.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){const x=norm(m[1]);if(/\.(?:css|js)$/i.test(x))direct.add(x);}
const reachable=new Set(),queue=[...direct];
const assetRef=/["'`]((?:\.\/)?(?:modules|core|data|styles)\/[A-Za-z0-9._\/-]+\.(?:js|css))(?:\?[^"'`]*)?["'`]/g;
while(queue.length){const rel=norm(queue.shift());if(!rel||reachable.has(rel))continue;reachable.add(rel);if(!exists(rel)||!rel.endsWith('.js'))continue;const src=read(rel);for(const m of src.matchAll(assetRef)){const child=norm(m[1]);if(!reachable.has(child))queue.push(child);}}
const missingDirect=[...direct].filter(x=>!exists(x));
if(missingDirect.length)fail('DIRECT_ENTRYPOINT_ASSET_MISSING',{missingDirect});

const approved=new Set(Array.isArray(P.approvedModuleScripts)?P.approvedModuleScripts.map(norm):[]);
const supportResults=[];
for(const item of R.certifiedNonEntrypointAssets||[]){const p=norm(item.path);const row={path:p,exists:exists(p),certified:approved.has(p),reachable:reachable.has(p),entrypointRequired:false};supportResults.push(row);if(!row.exists||!row.certified)fail('CERTIFIED_NON_ENTRYPOINT_ASSET_CONTRACT_FAIL',{asset:row});}

function requireText(source,label,needles){for(const needle of needles){const ok=needle instanceof RegExp?needle.test(source):source.includes(needle);if(!ok)fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,missing:String(needle)});}}
function forbidText(source,label,needles){for(const needle of needles){const bad=needle instanceof RegExp?needle.test(source):source.includes(needle);if(bad)fail('SOURCE_OPERATIONAL_ASSERTION_FAIL',{assertion:label,forbidden:String(needle)});}}
function sourceAssertions(capabilityId){
  if(capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY'){
    const provider=read('core/aseguradoras-credentials-provider-lab-v20260720.js');
    if(!fs.existsSync(AR('functions/index.js')))fail('CREDENTIAL_BACKEND_SOURCE_MISSING');
    const backend=readRepo('functions/index.js');
    requireText(provider,'provider_accepts_canonical_lab_host',['ays-orbit-360-lab','canonicalHost','previewHost','authorizedHost = canonicalHost || previewHost']);
    requireText(provider,'provider_requires_runtime_contract',["mode !== 'firestore-lab'","tenant !== TENANT_ID",'registerCredentialProvider','cache: \'no-store\'']);
    forbidText(backend,'backend_has_no_fixed_demo_identity_allowlist',['EXPECTED_UID','EXPECTED_EMAIL','orbit.lab@demo.com']);
    requireText(backend,'backend_membership_role_policy',["collection('tenants').doc(TENANT_ID).collection('members')","clean(member.status, 40).toLowerCase() !== 'active'","assignedRoles.includes(activeRole)",'roleAllowed','extraAllowed']);
    requireText(provider,'frontend_does_not_persist_secret_values',['noSecretPersistence: true','exposesSecretsInStore: false','retainsSecretPayload: false']);
    requireText(backend,'runtime_audit_write_is_explicit',["collection('auditEvents').add",'containsSecrets: false']);
    return {ok:true,assertions:9,runtimeAuditWriteDeclared:true};
  }
  if(capabilityId==='CLIENTE360_PRIMARY_RUNTIME'){
    const module=read('modules/cliente360.js'),router=read('core/router.js'),hydration=read('core/visual-runtime-hydration-contract-v20260805.js');
    requireText(module,'cliente360_reads_clientes_from_orbit_store',["Orbit.store.all('clientes')",'data-list-placeholder']);
    requireText(router,'router_reacts_to_clientes_store_updates',['installReactiveRefresh',"'clientes'",'setTimeout']);
    requireText(hydration,'hydration_contract_observes_clientes',["'clientes'",'Orbit.store.on']);
    return {ok:true,assertions:4,runtimeRowsStillRequired:true};
  }
  if(capabilityId==='LOGIN_INTERACTIVE_ENTRY'){
    const auth=read('core/auth.js'),store=read('data/store-firestore-lab.local.js'),router=read('core/router.js');
    requireText(auth,'auth_is_membership_gated',['waitForMembership','signInWithEmailAndPassword']);
    requireText(store,'store_is_membership_gated',['membershipRequired: true','authGatedSnapshots: true']);
    requireText(router,'router_waits_are_bounded',['waitForPwaReady','Promise.race']);
    forbidText(auth+store,'human_login_has_no_demo_identity_fallback',['orbit.lab@demo.com']);
    return {ok:true,assertions:4,latencyRuntimeMeasurementRequired:true};
  }
  fail('UNKNOWN_CAPABILITY_SOURCE_ASSERTION',{capabilityId});
}

const capabilityResults=[];
for(const c of R.capabilities||[]){
  const required=(c.requiredReachableAssets||[]).map(norm),requiredDirect=(c.requiredDirectAssets||[]).map(norm);
  const missingReachable=required.filter(x=>!reachable.has(x)),missingDirectRequired=requiredDirect.filter(x=>!direct.has(x));
  const finalOwner=norm(c.finalOwner?.path),ownerExists=finalOwner?exists(finalOwner):false,ownerReachable=finalOwner?reachable.has(finalOwner):false;
  const legacy=(c.legacyReachableConsumers||[]).map(x=>({path:norm(x.path),reachable:reachable.has(norm(x.path)),mayBeFinalAuthority:x.mayBeFinalAuthority===true}));
  if(!ownerExists||!ownerReachable||missingReachable.length||missingDirectRequired.length)fail('CAPABILITY_OWNER_REACHABILITY_FAIL',{capabilityId:c.capabilityId,finalOwner,ownerExists,ownerReachable,missingReachable,missingDirectRequired});
  if(legacy.some(x=>x.mayBeFinalAuthority))fail('LEGACY_CONSUMER_FINAL_AUTHORITY_FORBIDDEN',{capabilityId:c.capabilityId});
  if(c.runtimeProof?.required!==true||c.runtimeProof?.sourcePassClosesDefect!==false||!c.runtimeProof?.visibleDefectId)fail('RUNTIME_PROOF_CONTRACT_MISSING',{capabilityId:c.capabilityId});
  const operational=sourceAssertions(c.capabilityId);
  capabilityResults.push({capabilityId:c.capabilityId,finalOwner,ownerExists,ownerReachable,missingReachable,missingDirectRequired,legacy,sourceOperationalAssertions:operational,runtimeProofRequired:true,runtimeProofSatisfied:false,visibleDefectId:c.runtimeProof.visibleDefectId});
}

const aseg=(R.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');
const domainPath=norm(D.finalOperationalOwner?.path||'').replace(/^orbit360-platform\//,'');
if(!aseg||norm(aseg.finalOwner?.path)!==domainPath||String(aseg.finalOwner?.version||'')!==String(D.finalOperationalOwner?.version||'')||String(aseg.finalOwner?.ownerId||'')!==String(D.finalOperationalOwner?.ownerId||''))fail('ASEGURADORAS_FINAL_OWNER_REGISTRY_DESYNC',{runtimeOwner:aseg?.finalOwner||null,domainOwner:D.finalOperationalOwner||null});
const legacyPath=norm(D.legacyConsumer?.path||'').replace(/^orbit360-platform\//,'');
if(D.legacyConsumer?.allowedToExist!==true||D.legacyConsumer?.mayBeFinalAuthority!==false||!reachable.has(legacyPath))fail('ASEGURADORAS_LEGACY_CONSUMER_CONTRACT_FAIL',{legacyPath,reachable:reachable.has(legacyPath)});

const defectsOpen=capabilityResults.map(x=>x.visibleDefectId);
console.log(JSON.stringify({ok:true,status:'RUNTIME_CAPABILITY_SOURCE_CONTRACT_PASS_RUNTIME_PROOF_PENDING',classification:'PASS',entrypoint:INDEX,directAssetCount:direct.size,reachableAssetCount:reachable.size,certifiedApprovedModuleScriptCount:approved.size,certifiedNonEntrypointAssets:supportResults,capabilities:capabilityResults,aseguradorasFinalOwnerAligned:true,sourceCompositionOk:true,runtimeProofSatisfied:false,visibleDefectsRemainOpen:defectsOpen,rule:'source_reachability_and_operational_eligibility_are_prerequisites; visible defects close only with explicit runtime proof',sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));