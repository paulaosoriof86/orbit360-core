#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||path.join(process.cwd(),'orbit360-platform'));
const A=p=>path.join(root,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const REG='docs/orbit360-runtime-capability-registry-v20260828.json';
const PRES='docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG='docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const INDEX='index.html';
const norm=v=>String(v||'').trim().replace(/^\.\//,'').split('?')[0].split('#')[0];
const exists=p=>fs.existsSync(A(norm(p)));
const fail=(code,detail={})=>{console.log(JSON.stringify({ok:false,status:'RUNTIME_CAPABILITY_COMPOSITION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(2);};

for(const p of [REG,PRES,ASEG,INDEX])if(!exists(p))fail('REQUIRED_INPUT_MISSING',{path:p});
let R,P,D;
try{R=json(REG);P=json(PRES);D=json(ASEG);}catch(error){fail('REGISTRY_JSON_INVALID',{detail:String(error?.message||error)});}
if(R.schemaVersion!=='orbit360-runtime-capability-registry-v2-owner-reachability'||R.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED'||R.stateBearing!==false||R.dynamicStateForbidden!==true)fail('RUNTIME_REGISTRY_CONTRACT_INVALID');
const rules=R.rules||{};
for(const k of ['repositoryExistenceDoesNotEqualRuntimeReachability','certifiedArtifactScriptDoesNotImplyRuntimeEntrypoint','dynamicLiteralLoaderCountsAsReachability','finalOperationalOwnerMustMatchDomainRegistry','legacyConsumerMayRemainReachableWithoutBeingFinalAuthority','nonEntrypointCertifiedAssetsAreNotOrphans'])if(rules[k]!==true)fail('RUNTIME_REGISTRY_RULE_MISSING',{rule:k});

const index=read(INDEX),direct=new Set(),directOrder=[];
for(const m of index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)){const x=norm(m[1]);direct.add(x);directOrder.push(x);}
for(const m of index.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){const x=norm(m[1]);if(/\.(?:css|js)$/i.test(x)){direct.add(x);directOrder.push(x);}}

const reachable=new Set(),queue=[...direct];
const assetRef=/["'`]((?:\.\/)?(?:modules|core|data|styles)\/[A-Za-z0-9._\/-]+\.(?:js|css))(?:\?[^"'`]*)?["'`]/g;
while(queue.length){
  const rel=norm(queue.shift());if(!rel||reachable.has(rel))continue;reachable.add(rel);
  if(!exists(rel)||!rel.endsWith('.js'))continue;
  const src=read(rel);
  for(const m of src.matchAll(assetRef)){const child=norm(m[1]);if(!reachable.has(child))queue.push(child);}
}
const missingDirect=[...direct].filter(x=>!exists(x));
if(missingDirect.length)fail('DIRECT_ENTRYPOINT_ASSET_MISSING',{missingDirect});

const approved=new Set(Array.isArray(P.approvedModuleScripts)?P.approvedModuleScripts.map(norm):[]);
const supportResults=[];
for(const item of R.certifiedNonEntrypointAssets||[]){
  const p=norm(item.path);
  const row={path:p,exists:exists(p),certified:approved.has(p),reachable:reachable.has(p),entrypointRequired:false};
  supportResults.push(row);
  if(!row.exists||!row.certified)fail('CERTIFIED_NON_ENTRYPOINT_ASSET_CONTRACT_FAIL',{asset:row});
}

const capabilityResults=[];
for(const c of R.capabilities||[]){
  const required=(c.requiredReachableAssets||[]).map(norm);
  const requiredDirect=(c.requiredDirectAssets||[]).map(norm);
  const missingReachable=required.filter(x=>!reachable.has(x));
  const missingDirectRequired=requiredDirect.filter(x=>!direct.has(x));
  const finalOwner=norm(c.finalOwner?.path);
  const ownerExists=finalOwner?exists(finalOwner):false;
  const ownerReachable=finalOwner?reachable.has(finalOwner):false;
  const legacy=(c.legacyReachableConsumers||[]).map(x=>({path:norm(x.path),reachable:reachable.has(norm(x.path)),mayBeFinalAuthority:x.mayBeFinalAuthority===true}));
  const row={capabilityId:c.capabilityId,finalOwner,ownerExists,ownerReachable,missingReachable,missingDirectRequired,legacy};
  capabilityResults.push(row);
  if(!ownerExists||!ownerReachable||missingReachable.length||missingDirectRequired.length)fail('CAPABILITY_OWNER_REACHABILITY_FAIL',{capability:row});
  if(legacy.some(x=>x.mayBeFinalAuthority))fail('LEGACY_CONSUMER_FINAL_AUTHORITY_FORBIDDEN',{capabilityId:c.capabilityId});
}

const aseg=(R.capabilities||[]).find(x=>x.capabilityId==='ASEGURADORAS_OPERATIONAL_DIRECTORY');
const domainPath=norm(D.finalOperationalOwner?.path||'').replace(/^orbit360-platform\//,'');
if(!aseg||norm(aseg.finalOwner?.path)!==domainPath||String(aseg.finalOwner?.version||'')!==String(D.finalOperationalOwner?.version||'')||String(aseg.finalOwner?.ownerId||'')!==String(D.finalOperationalOwner?.ownerId||''))fail('ASEGURADORAS_FINAL_OWNER_REGISTRY_DESYNC',{runtimeOwner:aseg?.finalOwner||null,domainOwner:D.finalOperationalOwner||null});
const legacyPath=norm(D.legacyConsumer?.path||'').replace(/^orbit360-platform\//,'');
if(D.legacyConsumer?.allowedToExist!==true||D.legacyConsumer?.mayBeFinalAuthority!==false||!reachable.has(legacyPath))fail('ASEGURADORAS_LEGACY_CONSUMER_CONTRACT_FAIL',{legacyPath,reachable:reachable.has(legacyPath)});

console.log(JSON.stringify({ok:true,status:'RUNTIME_CAPABILITY_COMPOSITION_PASS',classification:'PASS',entrypoint:INDEX,directAssetCount:direct.size,reachableAssetCount:reachable.size,certifiedApprovedModuleScriptCount:approved.size,certifiedNonEntrypointAssets:supportResults,capabilities:capabilityResults,aseguradorasFinalOwnerAligned:true,rule:'certified_asset_presence_is_not_runtime_ownership; final_capability_owner_must_be_reachable',sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
