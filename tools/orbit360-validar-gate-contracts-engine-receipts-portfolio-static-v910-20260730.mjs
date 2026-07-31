#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block9-receipts-portfolio-static-v20260730';
const VERSION='9.1.0';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE=path.join(ROOT,EVIDENCE_REL);
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json';
const FREEZE='tools/orbit360-receipts-portfolio-source-freeze-v910-20260730.json';
const OWNER='tools/orbit360-receipts-portfolio-canonical-apply-v910-20260730.mjs';
const TEST='tools/orbit360-test-receipts-portfolio-controlled-write-static-v910-20260730.mjs';
const NOTE='orbit360-platform/docs/NOTA-RECTORA-CARTERA-HISTORICA-EXIGIBLE-FIFO-20260730.md';
const CLOSE='orbit360-platform/docs/CIERRE-RECALC-CARTERA-HISTORICA-EXIGIBLE-AYS-20260730.md';
const ACADEMIA='orbit360-platform/docs/ACADEMIA-IMPACT-CARTERA-HISTORICA-EXIGIBLE-20260730.md';
const REQUEST='.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json';
const required=[LIFECYCLE,FREEZE,OWNER,TEST,NOTE,CLOSE,ACADEMIA];
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function write(out){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(out,null,2)+'\n','utf8');}
function text(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
try{
  add('GATE_ID',process.argv[2]===GATE);
  add('BRANCH',String(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
  for(const rel of required)add('FILE_'+rel,fs.existsSync(path.join(ROOT,rel)));
  const lifecycle=readJson(LIFECYCLE),freeze=readJson(FREEZE),owner=text(OWNER),note=text(NOTE),close=text(CLOSE),academia=text(ACADEMIA);
  add('LIFECYCLE_VERSION',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION);
  add('STATIC_CAPABILITIES',Object.values(lifecycle.executionProfile?.capabilities||{}).every(v=>v===false));
  add('FREEZE_VERSION',freeze.contractVersion===VERSION&&freeze.schemaVersion==='orbit360-receipts-portfolio-source-freeze-v2');
  add('BASELINE',freeze.baseline?.clientes===430&&freeze.baseline?.aseguradoras===30&&freeze.baseline?.asesores===7&&freeze.baseline?.polizas===1373&&freeze.baseline?.vehiculos===1032&&freeze.baseline?.recibosEsperados===0&&freeze.baseline?.carteraPrimas===0&&freeze.baseline?.cobros===0&&freeze.baseline?.finmovs===0);
  add('ACTIVE_UNIVERSE',freeze.activeUniverse?.receipts===1261&&freeze.activeUniverse?.portfolio===641&&freeze.activeUniverse?.dueOrOverdue===99&&freeze.activeUniverse?.futurePending===542);
  add('HIST_UNIVERSE',freeze.historicalReconciliation?.historicalReceipts===32&&freeze.historicalReconciliation?.historicalPortfolio===32&&Number(freeze.historicalReconciliation?.historicalAmountGTQ)===13443.48);
  add('SOURCE_AUTHORITY',freeze.historicalReconciliation?.sigaMaterialized===27&&freeze.historicalReconciliation?.mapfreMaterialized===4&&freeze.historicalReconciliation?.elRobleMaterialized===1&&freeze.historicalReconciliation?.laCeibaForced===0);
  add('COMBINED_UNIVERSE',freeze.combinedExpected?.receipts===1293&&freeze.combinedExpected?.portfolio===673&&freeze.combinedExpected?.dueOrOverdue===131&&freeze.combinedExpected?.historicalExigible===32);
  add('HIST_SOURCE_BACKED',freeze.identityContract?.historicalRowsSourceBackedOnly===true&&freeze.identityContract?.historicalRowsGenerateSchedule===false&&freeze.identityContract?.historicalRowsReactivatePolicy===false);
  add('HIST_DUE_RULE',freeze.identityContract?.historicalTermMustBeExpiredAtCutoff===true&&freeze.identityContract?.historicalReceiptMustBeDueAtOrBeforeCutoff===true&&freeze.identityContract?.historicalReceiptMayFallAfterCoverageEnd===true);
  add('INSURER_AUTHORITY',freeze.identityContract?.higherInsurerAuthoritySupersedesSiga===true&&freeze.identityContract?.sigaAuthoritativeWhenNoHigherApplicableSource===true);
  add('NO_DOWNSTREAM',freeze.combinedExpected?.cobros===0&&freeze.combinedExpected?.finmovs===0&&freeze.identityContract?.reportedPaymentIsCobro===false);
  add('FIFO_DOWNSTREAM',freeze.identityContract?.fifoAppliedInThisBlock===false&&freeze.identityContract?.fifoReservedForCobrosConciliacion===true);
  add('REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,REQUEST)));
  add('OWNER_GUARD',owner.includes('REQUEST_MISSING')&&owner.includes('REQUEST_MISMATCH')&&owner.includes('REQUEST_SCOPE_MISMATCH')&&owner.includes('b.create(')&&owner.includes('deleteCreated'));
  add('OWNER_ACTIVE_HIST_SPLIT',owner.includes('activeInvalidPolicyState')&&owner.includes('historicalInvalidPolicyState')&&owner.includes('historicalTermNotExpired')&&owner.includes('historicalDueMayExceedCoverageEnd:true'));
  add('DOC_RULE',note.includes('vigencia vencida reciente')&&close.includes('La fecha de cobro de una cuota puede ser posterior al fin de cobertura'));
  add('ACADEMIA_RULE',academia.includes('vigencia contractual de la póliza')&&academia.includes('exigibilidad financiera del recibo/saldo'));
  add('OLD_PREWRITE_FROZEN',freeze.oldPrewrite900Frozen===true&&close.includes('9.0.0 queda congelado'));
  const testRun=spawnSync(process.execPath,[TEST],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  add('STATIC_TEST_EXIT',testRun.status===0);
  let testJson={};try{testJson=JSON.parse(String(testRun.stdout||'{}'));}catch{}
  add('STATIC_TEST_PASS',testJson.status==='STATIC_WRITE_READY'&&testJson.failed===0);
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-receipts-portfolio-gate-preflight-v2',gateId:GATE,contractVersion:VERSION,status:failed.length?'HOLD_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':'STATIC_CONTRACT_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,receiptsExpected:1293,portfolioPending:673,historicalExigible:32,historicalAmountGTQ:13443.48,activeReceiptsPreserved:1261,activePortfolioPreserved:641,cobrosExpected:0,finmovsExpected:0,requestExists:false,operationalWrites:0,evidenceWrites:1,sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(e){const out={schemaVersion:'orbit360-receipts-portfolio-gate-preflight-v2',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(e&&e.message||e).slice(0,500),operationalWrites:0,evidenceWrites:1,sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(out);console.error(JSON.stringify(out,null,2));process.exit(41);}
