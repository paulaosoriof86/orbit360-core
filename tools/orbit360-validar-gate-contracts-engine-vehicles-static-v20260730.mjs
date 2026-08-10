#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block8-vehicles-static-v20260730';
const VERSION='8.0.1';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-vehicles-static-v20260730.json';
const FREEZE='tools/orbit360-vehicles-source-freeze-v20260730.json';
const CLOSE='orbit360-platform/docs/CIERRE-WRITE-VEHICULOS-AYS-20260730.md';
const MODULE='orbit360-platform/modules/polizas.js';
const checks=[];
const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJson=rel=>JSON.parse(read(rel));
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function zeroCaps(c={}){return ['secrets','firestoreRead','writes','runtime','browser','deploy','functionsDeploy','rulesDeploy','production'].every(k=>c[k]===false);}
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,FREEZE,CLOSE,MODULE];
  add('FILES',required.every(rel=>fs.existsSync(path.join(ROOT,rel))));
  const lifecycle=readJson(LIFECYCLE),freeze=readJson(FREEZE),close=read(CLOSE),module=read(MODULE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='VEHICLES_STATIC_QUALIFICATION'&&zeroCaps(lifecycle.executionProfile?.capabilities));
  add('WRITE_CLOSED',close.includes('Estado: `WRITE_PASS`')&&close.includes('run: `30592478577`')&&close.includes('vehiculos: 1032')&&close.includes('operationalWrites = 1032')&&close.includes('La autorización fue consumida una sola vez'));
  add('SOURCE_FREEZE',freeze.schemaVersion==='orbit360-vehicles-source-freeze-v1'&&freeze.dryRun?.vehiclePolicyRelationsCreate===1032&&freeze.dryRun?.excluded===4&&freeze.dryRun?.qualityPending===60&&freeze.dryRun?.unsafeNumberOnlyFallback===0);
  add('POSTWRITE_INTEGRITY',close.includes('missingParents: 0')&&close.includes('clientMismatches: 0')&&close.includes('insurerMismatches: 0')&&close.includes('targetCollisions: 0')&&close.includes('targetIdsUnique: 1032'));
  add('UI_CONTRACT_COMPATIBLE',module.includes("S().all('vehiculos')")&&module.includes('v.polizaId')&&module.includes('vehiclesByPolicy')&&module.includes('veh.placa')&&module.includes('veh.marca')&&module.includes('veh.linea'));
  add('NO_REPLAY',close.includes('No existe segundo request ni reintento'));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-vehicles-static-closure-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'VEHICLES_STATIC_QUALIFICATION',status:failed.length?'HOLD_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':'VEHICLES_WRITE_CLOSED_REUSABLE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,writeClosed:failed.length===0,policiesWritePass:true,reuseTransverseInfrastructure:true,rebuildTransverseInfrastructure:false,sourceDomain:'vehiculos',sourceFilesAlreadyReceived:true,rawRows:freeze.dryRun?.rawRows,canonicalSourceIdentities:freeze.dryRun?.canonicalSourceIdentities,vehiclePolicyRelationsCreate:freeze.dryRun?.vehiclePolicyRelationsCreate,qualityPending:freeze.dryRun?.qualityPending,excluded:freeze.dryRun?.excluded,unsafePolicyNumberOnlyFallback:freeze.dryRun?.unsafeNumberOnlyFallback,identityCellsReadMode:freeze.parserContract?.identityCellsReadMode,longNumericPolicyUniqueIdentities:freeze.parserContract?.numericPolicyGeneralUniqueSourceIdentities13To14Digits,operationalCount:1032,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:'RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION',nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){const out={schemaVersion:'orbit360-vehicles-static-closure-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'VEHICLES_STATIC_QUALIFICATION',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
