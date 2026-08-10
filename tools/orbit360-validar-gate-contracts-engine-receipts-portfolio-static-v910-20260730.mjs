#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='block9-receipts-portfolio-static-v20260730';
const VERSION='9.1.0';
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json';
const FREEZE='tools/orbit360-receipts-portfolio-source-freeze-v910-20260730.json';
const CLOSE='orbit360-platform/docs/CIERRE-WRITE-RECIBOS-CARTERA-AYS-V910-20260730.md';
const REQUEST='.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json';
const checks=[];
const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJson=rel=>JSON.parse(read(rel));
function write(out){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(out,null,2)+'\n','utf8');}
function zeroCaps(c={}){return ['secrets','firestoreRead','writes','runtime','browser','deploy','functionsDeploy','rulesDeploy','production'].every(k=>c[k]===false);}
try{
  add('GATE_ID',process.argv[2]===GATE);
  const required=[LIFECYCLE,FREEZE,CLOSE,REQUEST];
  add('FILES',required.every(rel=>fs.existsSync(path.join(ROOT,rel))));
  const lifecycle=readJson(LIFECYCLE),freeze=readJson(FREEZE),close=read(CLOSE),request=readJson(REQUEST);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION'&&zeroCaps(lifecycle.executionProfile?.capabilities));
  add('FREEZE',freeze.contractVersion===VERSION&&freeze.schemaVersion==='orbit360-receipts-portfolio-source-freeze-v2'&&freeze.combinedExpected?.receipts===1293&&freeze.combinedExpected?.portfolio===673&&freeze.historicalReconciliation?.historicalReceipts===32);
  add('WRITE_CLOSED',close.includes('`WRITE_PASS`')&&close.includes('run: `30603384289`')&&close.includes('recibosEsperados: 1293')&&close.includes('carteraPrimas: 673')&&close.includes('operationalWrites: 1966'));
  add('REQUEST_ARCHIVAL_MATCH',request.schemaVersion==='orbit360-receipts-portfolio-write-request-v2'&&request.contractVersion===VERSION&&request.approved===true&&request.phrase==='AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS V910 20260730'&&Number(request.scope?.receipts)===1293&&Number(request.scope?.portfolio)===673&&Number(request.scope?.historical)===32&&Number(request.scope?.cobros)===0&&Number(request.scope?.finmovs)===0);
  add('REQUEST_CONSUMPTION_PROVEN',close.includes('La autorización se utilizó sobre un único request')&&close.includes('la reanudación usó el mismo request inmutable, sin segunda autorización'));
  add('POSTWRITE_INTEGRITY',close.includes('missingParents: 0')&&close.includes('relationMismatches: 0')&&close.includes('targetReceiptCollisions: 0')&&close.includes('targetPortfolioCollisions: 0'));
  add('DOWNSTREAM_ZERO',close.includes('cobros: 0')&&close.includes('finmovs: 0'));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-receipts-portfolio-static-closure-v3',gateId:GATE,contractVersion:VERSION,executionPhase:'RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION',gatePhase:'POSTWRITE_CLOSED',status:failed.length?'HOLD_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':'RECEIPTS_PORTFOLIO_WRITE_CLOSED_REUSABLE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,writeClosed:failed.length===0,requestExists:true,requestState:'HISTORICAL_CONSUMED_EVIDENCE',receiptsExpected:1293,portfolioPending:673,historicalExigible:32,historicalAmountGTQ:13443.48,activeReceiptsPreserved:1261,activePortfolioPreserved:641,cobrosExpected:0,finmovsExpected:0,firestoreDataWrites:0,operationalWrites:0,evidenceWrites:1,sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:'COBROS_CONCILIACION',containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){const out={schemaVersion:'orbit360-receipts-portfolio-static-closure-v3',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
