#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.2-cobros-real-payload-replay-static-v20260801';
const VERSION='10.2.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-real-payload-replay-static-v20260801.json');
const files={
  engine:'orbit360-platform/core/importa-cobros-conciliacion-p0.js',
  test:'tools/orbit360-test-importa-cobros-conciliacion-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-PAYLOAD-REPLAY-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-DRYRUN-REAL-COBROS-CONCILIACION-20260801.md'
};
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,error='';
try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const engine=read('engine');
  [
    "20260801.2-real-payload-replay",'amountTolerance','normalizeInstallment','normalizeEndorsement',
    'sourceDifferences','DIFERENCIA_MONTO','CANONICAL_RECEIPT_REQUIRED',
    'LINK_EXISTING_RECEIPT','CREATE_HISTORICAL_RECEIPT_PROPOSAL',
    'HISTORICAL_RECEIPT_PRECEDENCE','reactivatesPolicy:false','autoApply:false','cobrosWrites:0','finmovsWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,36),engine.includes(token)));
  check('ENGINE_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(engine));

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_SOURCE_DRYRUN_ENGINE_PASS');
  check('TEST_VERSION',testResult&&testResult.version==='20260801.2-real-payload-replay');
  check('TEST_REPLAY_TOTALS',testResult&&testResult.realShapeReplay&&testResult.realShapeReplay.rows===9&&testResult.realShapeReplay.candidates===5&&testResult.realShapeReplay.hold===4);
  check('TEST_TARGET_MODES',testResult&&testResult.realShapeReplay.linkExistingReceipt===4&&testResult.realShapeReplay.createHistoricalReceiptProposal===1);
  check('TEST_REAL_CONTROLS',testResult&&testResult.amountToleranceCents===true&&testResult.dateDifferencesPreserved===true&&testResult.wrongVigenciaBlocked===true&&testResult.historicalExigibleProposed===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='REAL_PAYLOAD_REPLAY_SANITIZED_READY');
  check('AUDIT_CLASSIFICATION',audit.classification==='DATA_CONTRACT_FAILURE_CORRECTED');
  check('AUDIT_THREE_SOURCES',Array.isArray(audit.sources)&&audit.sources.length===3&&audit.sources.every(source=>source.exactRegisteredDuplicate===true));
  check('AUDIT_HASH_CRM',audit.sources.some(source=>source.sha256==='727665170572143979b5f274190e200da397e7b32965d1809b1b9be6a8495302'));
  check('AUDIT_HASH_GENERAL',audit.sources.some(source=>source.sha256==='61574cc18b9200af438a49985e58deea635243f8808eac97470789df0db5b5ed'));
  check('AUDIT_HASH_MAPFRE',audit.sources.some(source=>source.sha256==='d19559b7d5ad80930ad10f88d30ae7e0015b1647a5c0840867cf76e32c617ad8'));
  check('AUDIT_REPLAY_TOTALS',audit.replay.insurerRows===9&&audit.replay.oneToOneCandidates===5&&audit.replay.hold===4);
  check('AUDIT_TARGET_MODES',audit.replay.targetModes.linkExistingReceipt===4&&audit.replay.targetModes.createHistoricalReceiptProposal===1);
  check('AUDIT_HOLD_REASONS',audit.replay.holdReasons.IDENTIDAD_INSUFICIENTE===2&&audit.replay.holdReasons.DIFERENCIA_MONTO===1&&audit.replay.holdReasons.SIN_CONTRAPARTE_CRM===1);
  check('AUDIT_NO_AUTO_APPLY',audit.replay.autoApply===false&&audit.replay.historicalReceiptCreatesCobro===false&&audit.replay.reactivatesExpiredPolicy===false);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false&&audit.security.repoPayloads===false);

  const closure=read('closure');
  check('CLOSURE_CONTRACT',closure.includes('Pago reportado ≠ reporte de aseguradora ≠ soporte bancario ≠ cobro conciliado'));
  check('CLOSURE_PROCESSING_DISTINCTION',closure.includes('no todos los archivos registrados están “procesados como Cobros”'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-real-payload-replay-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_REAL_PAYLOAD_REPLAY_STATIC_READY':'COBROS_REAL_PAYLOAD_REPLAY_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_REAL_PAYLOAD_REPLAY':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  replay:{insurerRows:9,oneToOneCandidates:5,hold:4,linkExistingReceipt:4,createHistoricalReceiptProposal:1},
  exactRegisteredDuplicates:3,realRowsStoredInRepo:0,
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:42);
