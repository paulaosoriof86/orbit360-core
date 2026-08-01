#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.4-cobros-matriz-real-static-v20260801';
const VERSION='10.4.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-matriz-real-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-matriz-real-v20260801.json',
  engine:'orbit360-platform/core/importa-cobros-matriz-multievidencia-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  test:'tools/orbit360-test-importa-cobros-matriz-multievidencia-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-MATRIZ-REAL-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-MATRIZ-REAL-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-MATRIZ-REAL-COBROS-HISTORICOS-20260801.md'
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
  check('ENGINE_VERSION',engine.includes('20260801.1-real-matrix-historical-coverage'));
  check('ENGINE_HISTORICAL',engine.includes('historicalEligible')&&engine.includes('historicalExigibleIncluded:true'));
  check('ENGINE_EXACT_RECEIPT',engine.includes('exactReceiptPrecedesFifo:true'));
  check('ENGINE_NO_SINGLE_SOURCE',engine.includes('absenceAloneCreatesCobro:false')&&engine.includes('commissionAloneCreatesCobro:false')&&engine.includes('bankAloneCreatesCobro:false'));
  check('ENGINE_NO_REACTIVATION',engine.includes('reactivatesPolicy:false'));
  check('ENGINE_ZERO_WRITES',engine.includes('cobrosWrites:0')&&engine.includes('finmovsWrites:0')&&engine.includes('firestoreWrites:0')&&engine.includes('operationalWrites:0'));
  check('ENGINE_NO_WRITE_CALLS',!/\.(?:insert|update|remove)\s*\(\s*['"](?:cobros|finmovs)['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/importa-cobros-matriz-multievidencia-p0.js'"));
  const bootstrapMatch=bootstrap.match(/const VERSION='20260801\.(\d+)'/);
  check('BOOTSTRAP_CAPABILITY_VERSION',!!bootstrapMatch&&Number(bootstrapMatch[1])>=3);

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1600)}`;
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_REAL_MATRIX_ENGINE_PASS');
  check('TEST_COVERAGE',testResult&&testResult.sourcePaymentRows===68&&testResult.canonicalPaymentRows===63&&testResult.historicalOmissions===5&&testResult.unionPaymentCases===70&&testResult.insurerOnlyEvidence===2);
  check('TEST_EVIDENCE',testResult&&testResult.coverageBalanced===true&&testResult.oneToOneDirectEvidence===true&&testResult.exactReceiptPrecedesFifo===true&&testResult.historicalExigibleIncluded===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='REAL_PAYMENT_MATRIX_STATIC_READY');
  check('AUDIT_COVERAGE',audit.coverage.crmPaymentRowsJuly===68&&audit.coverage.canonicalPaymentRowsJuly===63&&audit.coverage.canonicalOmissions===5&&audit.coverage.unionPaymentEvidenceCases===70&&audit.coverage.insurerOnlyPaidRows===2);
  check('AUDIT_OMISSIONS',audit.canonicalOmissions.historicalRecentExpiredReceipts===5&&audit.canonicalOmissions.byInsurer['El Roble']===3&&audit.canonicalOmissions.byInsurer['Aseguradora General']===2&&audit.canonicalOmissions.duplicateRows===0&&audit.canonicalOmissions.reactivatesPolicy===false);
  check('AUDIT_DIRECT',audit.directInsurerEvidence.rows===9&&audit.directInsurerEvidence.oneToOneMatches===5&&audit.directInsurerEvidence.holds===4&&audit.directInsurerEvidence.sourceReuse===0);
  const counts=audit.matrixStatusCounts||{};
  check('AUDIT_STATUS_TOTAL',Object.values(counts).reduce((sum,value)=>sum+Number(value||0),0)===68);
  check('AUDIT_TEMPORAL',counts.TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION===24&&counts.TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION===7&&counts.SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE===14&&counts.NO_COUNTERPART_EVIDENCE_YET===11);
  check('AUDIT_HISTORICAL',counts.DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL===1&&counts.HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART===3&&counts.HOLD_DIRECT_DIFERENCIA_MONTO===1);
  check('AUDIT_RULES',audit.temporalRules.paymentAfterSnapshotCutoffIsValid===true&&audit.temporalRules.exactReceiptPrecedesFifo===true&&audit.temporalRules.historicalExigibleIncluded===true&&audit.temporalRules.absenceAloneCreatesCobro===false&&audit.temporalRules.commissionAloneCreatesCobro===false&&audit.temporalRules.bankAloneCreatesCobro===false);
  check('AUDIT_FRESHNESS',audit.sourceFreshness.stalePlanillasUsed===false&&audit.sourceFreshness.staleBankStatementsUsed===false&&audit.sourceFreshness.staleFinancialFilesUsed===false&&audit.sourceFreshness.additionalSourcesRequested===0);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.deployExecuted===false&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realRowsStoredInRepo===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia');
  check('CLOSURE_CONTRACT',closure.includes('pagos CRM de julio: 68')&&closure.includes('pagos conservados en paquete canónico: 63')&&closure.includes('pagos omitidos: 5')&&closure.includes('cobros writes: 0'));
  check('ACADEMIA_CONTRACT',academia.includes('sí puede conservar recibos históricos exigibles y recibir pagos')&&academia.includes('### Dirección')&&academia.includes('### Operativo')&&academia.includes('### Asesor'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-real-payment-matrix-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  validatorLifecycleRevision:'capability-minimum-bootstrap-v2',
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_REAL_PAYMENT_MATRIX_STATIC_READY':'COBROS_REAL_PAYMENT_MATRIX_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_REAL_PAYMENT_MATRIX':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  coverage:{crmPaymentRows:68,canonicalPaymentRows:63,historicalOmissions:5,unionPaymentCases:70,insurerOnlyPaidRows:2},
  directEvidence:{rows:9,matches:5,holds:4,sourceReuse:0},
  paymentAfterSnapshotCutoffAllowed:true,exactReceiptPrecedesFifo:true,historicalExigibleIncluded:true,
  absenceAloneCreatesCobro:false,commissionAloneCreatesCobro:false,bankAloneCreatesCobro:false,
  stalePlanillasUsed:false,staleBankStatementsUsed:false,staleFinancialFilesUsed:false,
  realRowsStoredInRepo:0,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:44);
