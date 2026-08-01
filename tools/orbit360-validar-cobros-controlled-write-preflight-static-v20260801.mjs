#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.9-cobros-controlled-write-lab-v20260801';
const VERSION='10.9.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-preflight-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-controlled-write-lab-v20260801.json',
  owner:'orbit360-platform/core/cobros-controlled-write-gate-p0.js',
  authorization:'orbit360-platform/docs/AUTORIZACION-DIRECCION-COBROS-5-CASOS-20260801.json',
  predecessorAudit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-MATERIALIZACION-PRIVADA-REAL-SANITIZADA-20260801.json',
  genericWriter:'orbit360-platform/core/importa-write-p0.js',
  test:'tools/orbit360-test-cobros-controlled-write-gate-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-GATE-ESCRITURA-PREFLIGHT-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-GATE-ESCRITURA-PREFLIGHT-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-GATE-UNICO-ESCRITURA-COBROS-20260801.md',
  claude:'orbit360-platform/docs/CLAUDE-ACUMULADO-GATE-UNICO-ESCRITURA-COBROS-20260801.md'
};
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,error='';

try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));

  const lifecycle=JSON.parse(read('lifecycle'));
  check('LIFECYCLE_GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion===VERSION);
  check('LIFECYCLE_OWNER',lifecycle.owner==='cobros-controlled-write-gate-p0'&&lifecycle.ownerVersion==='20260801.1-single-write-gate-preflight');
  check('LIFECYCLE_PHASE',lifecycle.currentPhase==='PREPARED_STATIC'&&lifecycle.phases.length===4);
  check('LIFECYCLE_ZERO_CAPABILITIES',Object.keys(lifecycle.executionProfile.capabilities).length===9&&Object.values(lifecycle.executionProfile.capabilities).every(value=>value===false));
  check('LIFECYCLE_AUTH_BOUNDARY',lifecycle.humanDecisionRecorded===true&&lifecycle.executionAuthorized===false&&lifecycle.labWriteAuthorized===false&&lifecycle.writeAuthorized===false&&lifecycle.productionAuthorized===false&&lifecycle.deployAuthorized===false);
  check('LIFECYCLE_COUNTS',lifecycle.expected.cases===5&&lifecycle.expected.direct===4&&lifecycle.expected.historical===1&&lifecycle.expected.atomicGroups===5&&lifecycle.expected.snapshots===11&&lifecycle.expected.operations===10&&lifecycle.expected.rollbacks===11);
  check('LIFECYCLE_ZERO_WRITES',lifecycle.expected.writeEligible===0&&lifecycle.expected.cobrosWrites===0&&lifecycle.expected.receiptWrites===0&&lifecycle.expected.policyWrites===0&&lifecycle.expected.finmovsWrites===0);

  const authorization=JSON.parse(read('authorization'));
  const refs=authorization.cases.map(item=>item.authorizationRef);
  check('AUTH_SCHEMA',authorization.schemaVersion==='orbit360-cobros-direction-authorization-v1');
  check('AUTH_SOURCE_GATE',authorization.sourceGate.gateId==='block10.8-cobros-private-real-materialization-static-v20260801'&&authorization.sourceGate.run===30709607082&&authorization.sourceGate.checks==='64/64 PASS');
  check('AUTH_COUNTS',authorization.cases.length===5&&authorization.decision.approvedCount===5&&authorization.decision.directCasesApproved===true&&authorization.decision.historicalCaseApprovedSeparately===true);
  check('AUTH_CATEGORIES',authorization.cases.filter(item=>item.category==='EXISTING_CANONICAL_RECEIPT'&&item.decision==='APPROVED_DIRECT').length===4&&authorization.cases.filter(item=>item.category==='HISTORICAL_RECEIPT_REINFORCED'&&item.decision==='APPROVED_HISTORICAL_REINFORCED').length===1);
  check('AUTH_UNIQUE',new Set(refs).size===5&&refs.every(ref=>/^cob-auth-[a-f0-9]{24}$/.test(ref)));
  check('AUTH_EXECUTION_LOCKED',authorization.decision.executionAuthorized===false&&authorization.decision.labWriteAuthorized===false&&authorization.decision.productionAuthorized===false&&authorization.decision.deployAuthorized===false);
  const historical=authorization.cases.find(item=>item.category==='HISTORICAL_RECEIPT_REINFORCED');
  check('AUTH_HISTORICAL_CONTROLS',historical&&historical.reinforced===true&&historical.atomicHistoricalOperationRequired===true&&historical.reactivatePolicy===false&&historical.createFinmov===false);
  check('AUTH_SANITIZED',authorization.controls.containsPII===false&&authorization.controls.containsPolicyNumbers===false&&authorization.controls.containsAmounts===false&&authorization.controls.containsSecrets===false);

  const predecessor=JSON.parse(read('predecessorAudit'));
  check('PREDECESSOR_STATUS',predecessor.status==='PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED');
  check('PREDECESSOR_COUNTS',predecessor.materialization.cardCount===5&&predecessor.materialization.direct===4&&predecessor.materialization.historical===1);
  check('PREDECESSOR_ZERO_WRITES',predecessor.writes.cobros===0&&predecessor.writes.finmovs===0&&predecessor.writes.firestore===0&&predecessor.writes.operational===0);
  check('PREDECESSOR_DISPOSED',predecessor.ephemeralSession.remainingPrivateCardsAfterDisposal===0&&predecessor.ephemeralSession.remainingPrivateInputsAfterDisposal===0);

  const owner=read('owner');
  ['20260801.1-single-write-gate-preflight','PREPARED_STATIC','snapshotBeforeWriteRequired:true','atomicPerCaseRequired:true','rollbackPerCaseRequired:true','genericWriterRemainsBlockedForCobros:true','executionAuthorized:false','labWriteAuthorized:false','writeEligible:0','cobrosWrites:0','receiptWrites:0','policyWrites:0','finmovsWrites:0'].forEach(token=>check('OWNER_'+token.slice(0,45),owner.includes(token)));
  check('OWNER_NO_STORE_WRITES',!/Orbit\.store\.(?:insert|update|remove)\s*\(/.test(owner));
  check('OWNER_HISTORICAL_ATOMIC',owner.includes('INSERT_HISTORICAL_ELIGIBLE_RECEIPT')&&owner.includes('INSERT_COBRO_AND_APPLY_TO_HISTORICAL_RECEIPT')&&owner.includes('ASSERT_POLICY_UNCHANGED_FROM_SNAPSHOT'));
  check('OWNER_ROLLBACK',owner.includes('RESTORE_EXISTING_RECEIPT_FROM_SNAPSHOT')&&owner.includes('REMOVE_INSERTED_COBRO_BY_IDEMPOTENCY')&&owner.includes('REMOVE_INSERTED_HISTORICAL_RECEIPT'));

  const genericWriter=read('genericWriter');
  const allowedArray=(genericWriter.match(/const\s+ALLOWED_COLLECTIONS\s*=\s*\[([\s\S]*?)\];/)||[])[1]||'';
  const blockedArray=(genericWriter.match(/const\s+HARD_BLOCKED_COLLECTIONS\s*=\s*\[([\s\S]*?)\];/)||[])[1]||'';
  check('GENERIC_WRITER_ARRAYS_PARSED',Boolean(allowedArray)&&Boolean(blockedArray));
  check('GENERIC_WRITER_COBROS_BLOCKED',/['"]cobros['"]/.test(blockedArray));
  check('GENERIC_WRITER_NO_COBROS_ALLOWED',!/['"]cobros['"]/.test(allowedArray));

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1500)}`;
  check('TEST_STATUS',testResult?.status==='COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_PASS');
  check('TEST_COUNTS',testResult?.groups===5&&testResult?.direct===4&&testResult?.historical===1&&testResult?.snapshots===11&&testResult?.operations===10&&testResult?.rollbacks===11);
  check('TEST_IDEMPOTENCY',testResult?.duplicateIdempotencyKeys===0);
  check('TEST_LOCKED',testResult?.executionAuthorized===false&&testResult?.labWriteAuthorized===false&&testResult?.writeEligible===0);
  check('TEST_ZERO_WRITES',testResult?.cobrosWrites===0&&testResult?.receiptWrites===0&&testResult?.policyWrites===0&&testResult?.finmovsWrites===0&&testResult?.firestoreWrites===0&&testResult?.operationalWrites===0);
  check('TEST_ZERO_RUNTIME',testResult?.browserExecuted===false&&testResult?.deployExecuted===false&&testResult?.productionTouched===false);
  check('TEST_SANITIZED',testResult?.containsPII===false&&testResult?.containsPolicyNumbers===false&&testResult?.containsAmounts===false&&testResult?.containsSecrets===false);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_PREPARED');
  check('AUDIT_GATE',audit.gate.gateId===GATE_ID&&audit.gate.contractVersion===VERSION&&audit.gate.phase==='PREPARED_STATIC'&&audit.gate.singleWriteGate===true);
  check('AUDIT_COUNTS',audit.plan.atomicGroups===5&&audit.plan.directGroups===4&&audit.plan.historicalGroups===1&&audit.plan.snapshots===11&&audit.plan.plannedOperations===10&&audit.plan.rollbackSteps===11);
  check('AUDIT_UNIQUE',audit.plan.duplicateAuthorizationRefs===0&&audit.plan.duplicateIdempotencyKeys===0);
  check('AUDIT_CONTROLS',audit.controls.snapshotBeforeWriteRequired===true&&audit.controls.idempotencyRequired===true&&audit.controls.atomicPerCaseRequired===true&&audit.controls.rollbackPerCaseRequired===true&&audit.controls.historicalCaseSeparated===true&&audit.controls.reactivatePolicy===false&&audit.controls.createFinmov===false);
  check('AUDIT_GENERIC_WRITER_BLOCKED',audit.collections.specializedOwnerRequired===true&&audit.collections.genericWriterRemainsBlockedForCobros===true);
  check('AUDIT_ZERO_WRITES',audit.writes.writeEligible===0&&audit.writes.cobros===0&&audit.writes.receipts===0&&audit.writes.policies===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0);
  check('AUDIT_ZERO_RUNTIME',audit.writes.browserExecuted===false&&audit.writes.deployExecuted===false&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realRowsStoredInRepo===0&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia'),claude=read('claude');
  check('CLOSURE_PHASES',closure.includes('PREPARED_STATIC')&&closure.includes('ARMED_BY_EXPLICIT_LAB_AUTHORIZATION')&&closure.includes('VERIFIED_OR_ROLLED_BACK'));
  check('CLOSURE_COUNTS',closure.includes('grupos atómicos: 5')&&closure.includes('snapshots obligatorios: 11')&&closure.includes('operaciones planificadas: 10')&&closure.includes('pasos de rollback: 11'));
  check('ACADEMIA_ROLES',academia.includes('## Dirección / AdminTenant')&&academia.includes('## Operativo')&&academia.includes('## Asesor'));
  check('CLAUDE_CLASSIFICATION',claude.includes('BACKEND_PROTEGIDO_NO_CLAUDE')&&claude.includes('REPLICABLE_CLAUDE_ACUMULADO'));
}catch(exception){error=String(exception?.message||exception);}

const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-controlled-write-preflight-static-v1',
  gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_READY':'COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_CONTROLLED_WRITE_PREFLIGHT':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  phase:'PREPARED_STATIC',
  plan:{cases:5,direct:4,historical:1,atomicGroups:5,snapshots:11,operations:10,rollbacks:11,duplicateAuthorizationRefs:0,duplicateIdempotencyKeys:0},
  humanAuthorizationRecorded:true,
  executionAuthorized:false,labWriteAuthorized:false,writeEligible:0,
  genericWriterRemainsBlockedForCobros:true,
  cobrosWrites:0,receiptWrites:0,policyWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:49);
