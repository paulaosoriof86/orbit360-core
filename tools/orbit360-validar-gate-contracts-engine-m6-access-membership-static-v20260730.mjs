#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.2.1';
const RC='tools/orbit360-m6-final-closure-620-access-root-cause-v20260730.json';
const BRIDGE='orbit360-platform/core/product-membership-access-bridge-p0.js';
const TEST='tools/orbit360-m6-product-membership-access-bridge-test-v20260730.mjs';
const BUILDER='tools/orbit360-m6-build-product-shell-v20260730.mjs';
const MEMBERSHIP='orbit360-platform/core/membership-multirol-contract-p0.js';
const FINAL_REQUEST='tools/orbit360-m6-final-closure-request-v20260730.json';
const FUTURE_REQUEST='tools/orbit360-m6-final-closure-622-request-v20260730.json';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,320)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  const rc=JSON.parse(read(RC));
  add('GATE',process.argv[2]===GATE);
  add('ROOT_CAUSE',Array.isArray(rc.classification)&&rc.classification.includes('FUNCTIONAL_DEFECT')&&rc.classification.includes('DATA_CONTRACT_FAILURE')&&rc.rootCause==='PRODUCT_ACCESS_ENGINE_MEMBERSHIP_PROJECTION_NOT_CONSUMED'&&rc.result==='ROLLED_BACK_SAFE');
  add('ROLLBACK_SAFE',rc.evidence&&rc.evidence.rollbackExecuted===true&&rc.evidence.productionLive===false&&rc.evidence.countsStable===true&&rc.evidence.digestsStable===true&&rc.evidence.firestoreDataWrites===0&&rc.evidence.operationalWrites===0);
  add('NO_ADVISOR_MIGRATION',rc.canonicalContract&&rc.canonicalContract.advisorSourceOnly===true&&rc.canonicalContract.advisorMigrationRequiredForFix===false&&JSON.stringify(rc.canonicalContract.productStoreCollections)===JSON.stringify(['clientes','aseguradoras']));
  const required=[BRIDGE,TEST,BUILDER,MEMBERSHIP,FINAL_REQUEST];
  add('FILES',required.every(f=>fs.existsSync(path.join(ROOT,f))),required.filter(f=>!fs.existsSync(path.join(ROOT,f))).join(','));
  const membership=read(MEMBERSHIP),bridge=read(BRIDGE),builder=read(BUILDER);
  add('CANONICAL_ROLE_MODULES',/Operativo[^\n]+aseguradoras/.test(membership)&&/Asesor[^\n]+aseguradoras/.test(membership));
  add('BRIDGE_CONTRACT',bridge.includes('productMembershipAccessBridgeP0')&&bridge.includes('membershipMultirolEffectiveP0')&&bridge.includes('effectiveModules')&&bridge.includes('productReadOnly')&&bridge.includes('__productMembershipAccessBridgeP0')&&!bridge.includes('firebase')&&!bridge.includes('firestore')&&!bridge.includes('fetch('));
  add('BUILDER_INJECTION',builder.includes('product-membership-access-bridge-p0.js')&&builder.includes("afterSrc('core/access-role-session-owner-v20260728.js'"));
  execFileSync(process.execPath,['--check',BRIDGE],{cwd:ROOT,stdio:'pipe'});
  execFileSync(process.execPath,['--check',TEST],{cwd:ROOT,stdio:'pipe'});
  execFileSync(process.execPath,['--check',BUILDER],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  const testOut=execFileSync(process.execPath,[TEST],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  add('SYNTHETIC_ACCESS_TEST',/PASS/.test(testOut)&&/Operativo/.test(testOut)&&/Asesor/.test(testOut)&&/aseguradoras/.test(testOut)&&/advisorStorePresent[^\n]*false/.test(testOut.replace(/\s+/g,' ')),testOut);
  add('FINAL_REQUEST_IMMUTABLE',fs.existsSync(path.join(ROOT,FINAL_REQUEST)));
  add('NO_NEW_RECOVERY_REQUEST',!fs.existsSync(path.join(ROOT,FUTURE_REQUEST)));
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-access-membership-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_ACCESS_MEMBERSHIP_REMEDIATION_STATIC',status:failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT',classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,productFrozen:true,retriesStopped:true,sourceRun:30557653576,sourceArtifact:8765527693,rootCause:'PRODUCT_ACCESS_ENGINE_MEMBERSHIP_PROJECTION_NOT_CONSUMED',canonicalMigratedCollections:['clientes','aseguradoras'],advisorSourceOnly:true,advisorMigrationRequired:false,membershipEffectiveModules:true,futureModulesReuse:true,nextRecoveryPrepared:false,storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-access-membership-static-v1',gateId:GATE,contractVersion:VERSION,status:'DATA_CONTRACT_FAILURE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_ACCESS_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,retriesStopped:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
