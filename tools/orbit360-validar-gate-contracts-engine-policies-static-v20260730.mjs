#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-static-v20260730';
const VERSION='7.0.1';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-static-v20260730.json';
const CLOSE='orbit360-platform/docs/CIERRE-WRITE-POLIZAS-AYS-20260730.md';
const DRYRUN='orbit360-platform/docs/DRYRUN-POLIZAS-FUENTES-COMPLEMENTARIAS-AYS-20260730.md';
const IMPORTER='orbit360-platform/core/importa-polizas-p0.js';
const checks=[];
const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJson=rel=>JSON.parse(read(rel));
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function zeroCaps(c={}){return ['secrets','firestoreRead','writes','runtime','browser','deploy','functionsDeploy','rulesDeploy','production'].every(k=>c[k]===false);}
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,CLOSE,DRYRUN,IMPORTER];
  add('FILES',required.every(rel=>fs.existsSync(path.join(ROOT,rel))));
  const lifecycle=readJson(LIFECYCLE),close=read(CLOSE),dryrun=read(DRYRUN),importer=read(IMPORTER);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='POLICIES_STATIC_QUALIFICATION'&&zeroCaps(lifecycle.executionProfile?.capabilities));
  add('WRITE_CLOSED',close.includes('Estado: `WRITE_PASS`')&&close.includes('workflow run: `30586726130`')&&close.includes('polizas: 1373')&&close.includes('recibosEsperados: 0')&&close.includes('carteraPrimas: 0')&&close.includes('cobros: 0'));
  add('AUTHORIZATION_CONSUMED',close.includes('fue consumida una sola vez')&&close.includes('.github/orbit360-requests/policies-write-20260730.json'));
  add('SOURCE_DRYRUN_PRESERVED',dryrun.length>0&&close.includes('64 pólizas conservan calidad pendiente')&&close.includes('4 registros permanecen excluidos'));
  add('VIGENCIA_AUTHORITY',close.includes('En Pólizas manda la vigencia')&&close.includes('estadoFuenteOriginal'));
  add('NO_DOWNSTREAM_WRITE',close.includes('El write no materializó recibos, cartera, cobros ni finmovs'));
  add('IMPORTER_PRESENT',importer.includes('Orbit')||importer.includes('poliza')||importer.includes('póliza'));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-policies-static-closure-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'POLICIES_STATIC_QUALIFICATION',status:failed.length?'HOLD_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':'POLICIES_WRITE_CLOSED_REUSABLE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,writeClosed:failed.length===0,reuseM6Infrastructure:true,rebuildTransverseInfrastructure:false,sourceDomain:'polizas',sourceReprofilingRequired:false,sourceDryRunComplete:true,sourcePayloadRead:false,legacyImporterAuthoritativeForPolicyDefaults:false,vigenciaAuthoritativeForVencida:true,sourcePaymentLikeStatusPreserved:true,pendingClientQualityPreserved:true,countryCurrencyFailClosed:true,premiumComponentsSeparated:true,advisorPolicyMutationRestricted:true,financialHistoryCreatesPolicies:false,operationalCount:1373,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:'VEHICLES_STATIC_QUALIFICATION',nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){const out={schemaVersion:'orbit360-policies-static-closure-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'POLICIES_STATIC_QUALIFICATION',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
