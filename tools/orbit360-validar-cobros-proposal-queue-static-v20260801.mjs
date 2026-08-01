#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.5-cobros-proposal-queue-static-v20260801';
const VERSION='10.5.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-proposal-queue-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-proposal-queue-v20260801.json',
  engine:'orbit360-platform/core/cobros-proposal-queue-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  test:'tools/orbit360-test-cobros-proposal-queue-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-COLA-PROPUESTAS-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-COLA-PROPUESTAS-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-COLA-CONTROLADA-COBROS-20260801.md'
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

  const engine=read('engine'),bootstrap=read('bootstrap');
  [
    '20260801.1-controlled-proposal-queue','AUTHORIZATION_READY_DIRECT',
    'AUTHORIZATION_READY_HISTORICAL_RECEIPT','REVIEW_TEMPORAL_CLEARING',
    'VALIDATE_POLICY_ABSENT_FROM_SNAPSHOT','HOLD_SOURCE_OR_DATA_CONTRACT',
    'HOLD_INSURER_ONLY_WITHOUT_CRM','idempotencyKey','diff','rollbackPlan',
    'preWriteSnapshotRequired:true','writeEligible:false','autoApply:false',
    'reactivatesPolicy:false','cobrosWrites:0','finmovsWrites:0','firestoreWrites:0','operationalWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,42),engine.includes(token)));
  check('ENGINE_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/cobros-proposal-queue-p0.js'"));
  check('BOOTSTRAP_VERSION',bootstrap.includes("const VERSION='20260801.4'"));

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1600)}`;
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_CONTROLLED_PROPOSAL_QUEUE_PASS');
  check('TEST_TOTALS',testResult&&testResult.cases===70&&testResult.authorizationReady===5&&testResult.reviewOnly===24&&testResult.validationRequired===7&&testResult.hold===34);
  check('TEST_QUEUE_COUNTS',testResult&&testResult.queueCounts.AUTHORIZATION_READY_DIRECT===4&&testResult.queueCounts.AUTHORIZATION_READY_HISTORICAL_RECEIPT===1&&testResult.queueCounts.REVIEW_TEMPORAL_CLEARING===24&&testResult.queueCounts.VALIDATE_POLICY_ABSENT_FROM_SNAPSHOT===7&&testResult.queueCounts.HOLD_SOURCE_OR_DATA_CONTRACT===32&&testResult.queueCounts.HOLD_INSURER_ONLY_WITHOUT_CRM===2);
  check('TEST_IDEMPOTENCY',testResult&&testResult.duplicateIdempotencyKeys===0);
  check('TEST_DIFF_ROLLBACK',testResult&&testResult.allDiffsPresent===true&&testResult.allWritesBlocked===true);
  check('TEST_AUTHORIZATION',testResult&&testResult.explicitAuthorizationRequired===true&&testResult.reinforcedAuthorizationForHistorical===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='CONTROLLED_PROPOSAL_QUEUE_STATIC_READY');
  check('AUDIT_SOURCE_GATE',audit.sourceMatrix.gateId==='block10.4-cobros-matriz-real-static-v20260801'&&audit.sourceMatrix.checks==='74/74 PASS'&&audit.sourceMatrix.paymentEvidenceCases===70);
  check('AUDIT_TOTALS',audit.queue.total===70&&audit.queue.authorizationReady===5&&audit.queue.reviewTemporal===24&&audit.queue.validationRequired===7&&audit.queue.hold===34);
  check('AUDIT_COUNTS',audit.queue.counts.AUTHORIZATION_READY_DIRECT===4&&audit.queue.counts.AUTHORIZATION_READY_HISTORICAL_RECEIPT===1&&audit.queue.counts.REVIEW_TEMPORAL_CLEARING===24&&audit.queue.counts.VALIDATE_POLICY_ABSENT_FROM_SNAPSHOT===7&&audit.queue.counts.HOLD_SOURCE_OR_DATA_CONTRACT===32&&audit.queue.counts.HOLD_INSURER_ONLY_WITHOUT_CRM===2);
  check('AUDIT_AUTHORIZATION',audit.authorizationContract.explicitAuthorizationRequired===true&&audit.authorizationContract.historicalReceiptRequiresReinforcedAuthorization===true&&audit.authorizationContract.writeEligibleBeforeAuthorization===false);
  check('AUDIT_CONTROLS',audit.controls.diffPerProposal===true&&audit.controls.idempotencyKeyPerProposal===true&&audit.controls.duplicateIdempotencyKeys===0&&audit.controls.preWriteSnapshotRequired===true&&audit.controls.rollbackPlanPerProposal===true&&audit.controls.sourceRowsImmutable===true&&audit.controls.autoApply===false);
  check('AUDIT_NO_POLICY_OR_FINMOV',audit.controls.reactivatesPolicy===false&&audit.controls.createsFinmov===false);
  check('AUDIT_NO_EXTRA_SOURCES',audit.freshness.additionalPlanillasRequested===0&&audit.freshness.additionalBankStatementsRequested===0&&audit.freshness.additionalFinancialFilesRequested===0&&audit.freshness.staleFilesUsedAsCurrentAuthority===false);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.deployExecuted===false&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realQueueRowsStoredInRepo===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia');
  check('CLOSURE_TOTALS',closure.includes('**70**')&&closure.includes('**5**'));
  check('CLOSURE_CONTROLS',closure.includes('idempotencia por propuesta: sí')&&closure.includes('rollback por propuesta: sí'));
  check('ACADEMIA_ROLES',academia.includes('### Dirección')&&academia.includes('### Operativo')&&academia.includes('### Asesor'));
  check('ACADEMIA_FLOW',academia.includes('matriz multievidencia')&&academia.includes('cola controlada')&&academia.includes('autorización'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-controlled-proposal-queue-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_CONTROLLED_PROPOSAL_QUEUE_STATIC_READY':'COBROS_CONTROLLED_PROPOSAL_QUEUE_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_CONTROLLED_PROPOSAL_QUEUE':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  queue:{total:70,authorizationReady:5,reviewTemporal:24,validationRequired:7,hold:34},
  duplicateIdempotencyKeys:0,diffsPresent:true,rollbackPlansPresent:true,
  explicitAuthorizationRequired:true,reinforcedAuthorizationForHistorical:true,
  stalePlanillasUsed:false,staleBankStatementsUsed:false,staleFinancialFilesUsed:false,
  realRowsStoredInRepo:0,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:45);
