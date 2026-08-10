#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const close=fs.readFileSync('orbit360-platform/docs/CIERRE-WRITE-RECIBOS-CARTERA-AYS-V910-20260730.md','utf8');
const freeze=JSON.parse(fs.readFileSync('tools/orbit360-receipts-portfolio-source-freeze-v910-20260730.json','utf8'));
const lifecycle=JSON.parse(fs.readFileSync('tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json','utf8'));
const request=JSON.parse(fs.readFileSync('.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json','utf8'));
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
add('LIFECYCLE_STATIC',lifecycle.gateContractVersion==='9.1.0'&&lifecycle.executionProfile?.phase==='RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION'&&Object.values(lifecycle.executionProfile?.capabilities||{}).every(v=>v===false));
add('FREEZE_COUNTS',freeze.contractVersion==='9.1.0'&&freeze.combinedExpected?.receipts===1293&&freeze.combinedExpected?.portfolio===673&&freeze.historicalReconciliation?.historicalReceipts===32);
add('WRITE_PASS',close.includes('`WRITE_PASS`')&&close.includes('run: `30603384289`')&&close.includes('recibosEsperados: 1293')&&close.includes('carteraPrimas: 673'));
add('REQUEST_ARCHIVED',request.contractVersion==='9.1.0'&&request.approved===true&&Number(request.scope?.receipts)===1293&&Number(request.scope?.portfolio)===673&&close.includes('La autorización se utilizó sobre un único request'));
add('NO_SECOND_AUTH',close.includes('sin segunda autorización'));
add('POSTWRITE_INTEGRITY',close.includes('missingParents: 0')&&close.includes('relationMismatches: 0')&&close.includes('targetReceiptCollisions: 0')&&close.includes('targetPortfolioCollisions: 0'));
add('DOWNSTREAM_ZERO',close.includes('cobros: 0')&&close.includes('finmovs: 0'));
const failed=checks.filter(c=>!c.ok);
const out={schemaVersion:'orbit360-receipts-portfolio-write-static-test-v3',contractVersion:'9.1.0',gatePhase:'POSTWRITE_CLOSED',status:failed.length?'STATIC_CLOSURE_BLOCKED':'STATIC_WRITE_CLOSED',ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,requestState:'HISTORICAL_CONSUMED_EVIDENCE',operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
