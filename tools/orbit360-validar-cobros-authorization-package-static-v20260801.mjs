#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.6-cobros-authorization-package-static-v20260801';
const VERSION='10.6.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-authorization-package-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-authorization-package-v20260801.json',
  engine:'orbit360-platform/core/cobros-authorization-package-p0.js',
  queue:'orbit360-platform/core/cobros-proposal-queue-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  test:'tools/orbit360-test-cobros-authorization-package-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-PAQUETE-AUTORIZACION-SANITIZADO-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-PAQUETE-AUTORIZACION-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-AUTORIZACION-COBROS-20260801.md',
  claude:'orbit360-platform/docs/CLAUDE-ACUMULADO-COBROS-AUTORIZACION-CONTROLADA-20260801.md'
};
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,error='';
try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const lifecycle=JSON.parse(read('lifecycle'));
  check('GATE_ID',lifecycle.gateId===GATE_ID);
  check('CONTRACT_VERSION',lifecycle.gateContractVersion===VERSION);
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('ZERO_CAPABILITIES',Object.keys(caps).length===9&&Object.values(caps).every(value=>value===false));
  check('NO_WRITE_AUTHORIZATION',lifecycle.writeAuthorized===false);
  check('LIFECYCLE_COUNTS',lifecycle.expected.cards===5&&lifecycle.expected.direct===4&&lifecycle.expected.historical===1&&lifecycle.expected.authorizationGranted===0&&lifecycle.expected.writeEligible===0);

  const engine=read('engine'),bootstrap=read('bootstrap');
  [
    '20260801.1-sanitized-authorization-package','PENDING_HUMAN_AUTHORIZATION',
    'HISTORICAL_RECEIPT_REINFORCED','EXISTING_CANONICAL_RECEIPT',
    'authorizationGranted:false','writeEligible:false','privateMaterializationRequired:true',
    'privateValuesStoredInRepo:false','packageGrantsAuthorization:false',
    'partialBatchDecisionAllowed:true','reinforcedAuthorizationForHistorical:true',
    'preWriteSnapshotRequired:true','exactReceiptPrecedesFifo:true',
    'reactivatePolicy:false','createFinmov:false','cobrosWrites:0','finmovsWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,44),engine.includes(token)));
  check('ENGINE_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/cobros-authorization-package-p0.js'"));
  const bootstrapVersion=(bootstrap.match(/const VERSION='20260801\.(\d+)'/)||[])[1];
  check('BOOTSTRAP_CAPABILITY_VERSION',Number(bootstrapVersion)>=5);

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1600)}`;
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_AUTHORIZATION_PACKAGE_ENGINE_PASS');
  check('TEST_COUNTS',testResult&&testResult.cards===5&&testResult.direct===4&&testResult.historical===1);
  check('TEST_IDEMPOTENCY',testResult&&testResult.duplicateIdempotencyKeys===0);
  check('TEST_DIFF_ROLLBACK',testResult&&testResult.allDiffsPresent===true&&testResult.allRollbackPlansPresent===true);
  check('TEST_AUTH_BLOCK',testResult&&testResult.allWritesBlocked===true&&testResult.packageGrantsAuthorization===false&&testResult.reinforcedAuthorizationForHistorical===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='AUTHORIZATION_PACKAGE_STATIC_READY');
  check('AUDIT_SOURCE_QUEUE',audit.sourceQueue.gateId==='block10.5-cobros-proposal-queue-static-v20260801'&&audit.sourceQueue.authorizationEligible===5);
  check('AUDIT_PACKAGE_COUNTS',audit.package.cards===5&&audit.package.directExistingReceipt===4&&audit.package.historicalReceiptReinforced===1);
  check('AUDIT_NOT_AUTHORIZED',audit.package.packageGrantsAuthorization===false&&audit.package.decisionStatus==='PENDING_HUMAN_AUTHORIZATION');
  check('AUDIT_CARDS',audit.sanitizedCards.length===5&&audit.sanitizedCards.filter(card=>card.category==='EXISTING_CANONICAL_RECEIPT').length===4&&audit.sanitizedCards.filter(card=>card.category==='HISTORICAL_RECEIPT_REINFORCED').length===1);
  check('AUDIT_HISTORICAL_REINFORCED',audit.sanitizedCards.find(card=>card.category==='HISTORICAL_RECEIPT_REINFORCED')?.reinforcedAuthorizationRequired===true);
  check('AUDIT_CONTROLS',audit.controls.diffPerCard===true&&audit.controls.idempotencyKeyPerCard===true&&audit.controls.duplicateIdempotencyKeys===0&&audit.controls.preWriteSnapshotRequired===true&&audit.controls.rollbackPlanPerCard===true);
  check('AUDIT_NO_POLICY_OR_FINMOV',audit.controls.reactivatesPolicy===false&&audit.controls.createsFinmov===false&&audit.controls.autoApply===false);
  check('AUDIT_EXCLUSIONS',audit.authorizationRules.reviewTemporalCasesExcluded===24&&audit.authorizationRules.validationCasesExcluded===7&&audit.authorizationRules.holdCasesExcluded===34);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realCardsStoredInRepo===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia'),claude=read('claude');
  check('CLOSURE_COUNTS',closure.includes('cuatro pagos con evidencia directa')&&closure.includes('un pago con evidencia directa'));
  check('CLOSURE_NOT_AUTHORIZATION',closure.includes('no concede autorización')&&closure.includes('no habilita `writeEligible`'));
  check('ACADEMIA_ROLES',academia.includes('## Dirección')&&academia.includes('## Operativo')&&academia.includes('## Asesor'));
  check('ACADEMIA_FLOW',academia.includes('tarjeta sanitizada')&&academia.includes('gate de escritura independiente'));
  check('CLAUDE_CLASSIFICATION',claude.includes('REPLICABLE_CLAUDE_ACUMULADO')&&claude.includes('paquete sanitizado de autorización'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-authorization-package-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_AUTHORIZATION_PACKAGE_STATIC_READY':'COBROS_AUTHORIZATION_PACKAGE_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_AUTHORIZATION_PACKAGE':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  package:{cards:5,direct:4,historical:1,authorizationGranted:0,writeEligible:0},
  duplicateIdempotencyKeys:0,diffsPresent:true,rollbackPlansPresent:true,
  privateMaterializationRequired:true,privateValuesStoredInRepo:false,packageGrantsAuthorization:false,
  explicitAuthorizationRequired:true,reinforcedAuthorizationForHistorical:true,partialBatchDecisionAllowed:true,
  realRowsStoredInRepo:0,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:46);
