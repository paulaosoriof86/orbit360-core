#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10-cobros-conciliacion-readonly-static-v20260801';
const VERSION='10.0.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-conciliacion-readonly-static-v20260801.json');
const PREFLIGHT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const rel={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-conciliacion-readonly-v20260801.json',
  owner:'orbit360-platform/modules/conciliaciones.js',
  test:'tools/orbit360-test-cobros-conciliacion-readonly-v20260801.mjs',
  source:'tools/orbit360-cobros-conciliacion-source-evidence-v20260801.json',
  contract:'orbit360-platform/docs/CONTRATO-CANONICO-COBROS-CONCILIACION-READONLY-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-IMPACT-COBROS-CONCILIACION-READONLY-20260801.md'
};
const read=key=>fs.readFileSync(path.join(ROOT,rel[key]),'utf8');
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
let testResult=null,error='';
try{
  Object.entries(rel).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const lifecycle=JSON.parse(read('lifecycle'));
  check('GATE_ID',lifecycle.gateId===GATE_ID);
  check('CONTRACT_VERSION',lifecycle.gateContractVersion===VERSION);
  check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('ZERO_CAPABILITIES',Object.values(caps).length===9&&Object.values(caps).every(value=>value===false));

  const owner=read('owner');
  [
    "const PHASE = 'READ_ONLY_DRYRUN'",
    "const CANONICAL_COLLECTION = 'conciliaciones'",
    "const DOMAIN_COLLECTION = 'conciliacionesPrimas'",
    'function proposalRows()',
    'function simulateFifo(',
    'function freezeCobrosModule()',
    "['aplicarPago','validarReporte','conciliarFactura','lote']",
    'reactivatesPolicy: false',
    'operationalWrites: 0',
    'autoApply: false'
  ].forEach(token=>check('OWNER_TOKEN_'+token.slice(0,24),owner.includes(token)));
  check('NO_COBROS_UPDATE',!/\.update\s*\(\s*['"]cobros['"]/.test(owner));
  check('NO_COBROS_INSERT',!/\.insert\s*\(\s*['"]cobros['"]/.test(owner));
  check('NO_FINMOV_WRITE',!/\.(?:insert|update)\s*\(\s*['"]finmovs['"]/.test(owner));
  check('NO_POST_RECAUDO_CALL',!/(?:Orbit\.q\.)?postRecaudo\s*\(/.test(owner));

  const source=JSON.parse(read('source'));
  check('SOURCE_2_REPORTS',source.insurerReportsReviewed===2);
  check('SOURCE_9_ROWS',source.insurerPaymentRowsReviewed===9);
  check('SOURCE_5_CANDIDATES',source.oneToOneCandidates===5);
  check('SOURCE_4_HOLD',source.holdOrNoMatch===4);
  check('SOURCE_TOTAL',source.oneToOneCandidates+source.holdOrNoMatch===source.insurerPaymentRowsReviewed);
  check('SOURCE_NO_ROW_FIXTURE',source.rowLevelEvidenceAvailable===false&&source.replayableWithoutCurrentSource===false);
  check('SOURCE_ZERO_WRITES',source.cobrosMaterialized===0&&source.finmovsMaterialized===0&&source.operationalWrites===0);
  check('SOURCE_SANITIZED',source.containsPII===false&&source.containsSecrets===false);

  const contract=read('contract'),academia=read('academia');
  check('CONTRACT_FIFO',contract.includes('obligación exigible aplicable más antigua'));
  check('CONTRACT_NO_RECONSTRUCTION',contract.includes('no deben reconstruirse ni inventarse'));
  check('ACADEMIA_DISTINCTIONS',academia.includes('Recibo esperado')&&academia.includes('Cobro conciliado')&&academia.includes('Movimiento financiero'));

  const run=spawnSync(process.execPath,[rel.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(String(run.stdout||'{}'));
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_CONCILIACION_READONLY_STATIC_PASS');
  check('TEST_FIFO',testResult&&testResult.fifoOldestFirst===true&&testResult.historicalExigibleIncluded===true);
  check('TEST_LEGACY_FROZEN',testResult&&testResult.legacyCobrosActionsFrozen===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.operationalWrites===0);
}catch(e){error=String(e&&e.message||e);}
const failed=checks.filter(item=>!item.ok);
const ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-conciliacion-readonly-static-v1',
  gateId:GATE_ID,
  contractVersion:VERSION,
  gatePhase:'COBROS_CONCILIACION_READONLY_STATIC_QUALIFICATION',
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_CONCILIACION_READONLY_STATIC_READY':'COBROS_CONCILIACION_READONLY_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_CONCILIACION_READONLY':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,
  canonicalQueue:'conciliaciones',projectedDomainQueue:'conciliacionesPrimas',
  sourceEvidence:{reports:2,rows:9,candidates:5,holdOrNoMatch:4,rowLevelReplay:false},
  testResult,
  firestoreWrites:0,operationalWrites:0,cobrosWrites:0,finmovsWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
fs.writeFileSync(PREFLIGHT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:41);
