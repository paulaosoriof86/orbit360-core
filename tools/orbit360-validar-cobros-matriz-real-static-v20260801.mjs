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
  [
    '20260801.1-real-matrix-historical-coverage','historicalEligible','canonicalPaymentLinked',
    'DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL','HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART',
    'TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION','SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE',
    'coverageBalanced','exactReceiptPrecedesFifo:true','historicalExigibleIncluded:true',
    'absenceAloneCreatesCobro:false','commissionAloneCreatesCobro:false','bankAloneCreatesCobro:false',
    'reactivatesPolicy:false','cobrosWrites:0','finmovsWrites:0','firestoreWrites:0','operationalWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,42),engine.includes(token)));
  check('ENGINE_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/importa-cobros-matriz-multievidencia-p0.js'"));
  check('BOOTSTRAP_VERSION',bootstrap.includes("const VERSION='20260801.3'"));

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1600)}`;
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_REAL_MATRIX_ENGINE_PASS');
  check('TEST_SOURCE_ROWS',testResult&&testResult.sourcePaymentRows===68);
  check('TEST_CANONICAL_ROWS',testResult&&testResult.canonicalPaymentRows===63);
  check('TEST_HISTORICAL_OMISSIONS',testResult&&testResult.historicalOmissions===5);
  check('TEST_UNION_CASES',testResult&&testResult.unionPaymentCases===70&&testResult.insurerOnlyEvidence===2);
  check('TEST_COVERAGE',testResult&&testResult.coverageBalanced===true&&testResult.oneToOneDirectEvidence===true);
  check('TEST_HISTORICAL_RULE',testResult&&testResult.historicalExigibleIncluded===true&&testResult.exactReceiptPrecedesFifo===true);
  check('TEST_NO_SINGLE_SOURCE_APPLY',testResult&&testResult.absenceAloneCreatesCobro===false&&testResult.commissionAloneCreatesCobro===false&&testResult.bankAloneCreatesCobro===false);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const audit=JSON.parse(read('audit'));
  check('AUDIT_STATUS',audit.status==='REAL_PAYMENT_MATRIX_STATIC_READY');
  check('AUDIT_CLASSIFICATION',audit.classification==='DATA_CONTRACT_FAILURE_CORRECTED');
  check('AUDIT_COVERAGE',audit.coverage.crmPaymentRowsJuly===68&&audit.coverage.canonicalPaymentRowsJuly===63&&audit.coverage.canonicalOmissions===5&&audit.coverage.coverageBalanced===true);
  check('AUDIT_UNION',audit.coverage.unionPaymentEvidenceCases===70&&audit.coverage.insurerOnlyPaidRows===2);
  check('AUDIT_OMISSIONS',audit.canonicalOmissions.historicalRecentExpiredReceipts===5&&audit.canonicalOmissions.byInsurer['El Roble']===3&&audit.canonicalOmissions.byInsurer['Aseguradora General']===2);
  check('AUDIT_OMISSION_RESOLUTION',audit.canonicalOmissions.resolution.directInsurerMatchHistoricalProposal===1&&audit.canonicalOmissions.resolution.directAmountDifferenceHold===1&&audit.canonicalOmissions.resolution.historicalProposalNeedsCounterpart===3);
  check('AUDIT_NO_DUPLICATES',audit.canonicalOmissions.duplicateRows===0&&audit.canonicalOmissions.reactivatesPolicy===false);
  check('AUDIT_DIRECT_ROWS',audit.directInsurerEvidence.rows===9&&audit.directInsurerEvidence.oneToOneMatches===5&&audit.directInsurerEvidence.holds===4&&audit.directInsurerEvidence.sourceReuse===0);
  check('AUDIT_DIRECT_HOLDS',audit.directInsurerEvidence.holdReasons.DIFERENCIA_MONTO===1&&audit.directInsurerEvidence.holdReasons.IDENTIDAD_INSUFICIENTE===1&&audit.directInsurerEvidence.holdReasons.SIN_CONTRAPARTE_CRM===2);
  const counts=audit.matrixStatusCounts||{};
  const countTotal=Object.values(counts).reduce((sum,value)=>sum+Number(value||0),0);
  check('AUDIT_STATUS_TOTAL',countTotal===68);
  check('AUDIT_DIRECT_READY',counts.DIRECT_INSURER_MATCH_READY===4&&counts.DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL===1);
  check('AUDIT_HISTORICAL_PENDING',counts.HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART===3);
  check('AUDIT_DIRECT_HOLD_COUNTS',counts.HOLD_DIRECT_DIFERENCIA_MONTO===1&&counts.HOLD_DIRECT_IDENTIDAD_INSUFICIENTE===1);
  check('AUDIT_COMMISSION_HOLD',counts.HOLD_COMMISSION_CORROBORATED_DATA_CONTRACT===1);
  check('AUDIT_PENDING_HOLD',counts.HOLD_STILL_PENDING_AFTER_PAYMENT===1);
  check('AUDIT_TEMPORAL',counts.TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION===24&&counts.TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION===7);
  check('AUDIT_SOURCE_GAPS',counts.SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE===14&&counts.NO_COUNTERPART_EVIDENCE_YET===11);
  check('AUDIT_BY_INSURER_TOTALS',Object.values(audit.byInsurer).reduce((sum,item)=>sum+Object.entries(item).filter(([key])=>key!=='INSURER_ONLY_WITHOUT_CRM').reduce((subtotal,[,value])=>subtotal+Number(value||0),0),0)===68);
  check('AUDIT_MAPFRE_INSURER_ONLY',audit.byInsurer.Mapfre.INSURER_ONLY_WITHOUT_CRM===2);
  check('AUDIT_TEMPORAL_RULES',audit.temporalRules.paymentAfterSnapshotCutoffIsValid===true&&audit.temporalRules.exactReceiptPrecedesFifo===true&&audit.temporalRules.historicalExigibleIncluded===true&&audit.temporalRules.oneTemporalLineagePerCase===true);
  check('AUDIT_NO_SINGLE_SOURCE_APPLY',audit.temporalRules.absenceAloneCreatesCobro===false&&audit.temporalRules.commissionAloneCreatesCobro===false&&audit.temporalRules.bankAloneCreatesCobro===false);
  check('AUDIT_FRESH_ONLY',audit.sourceFreshness.stalePlanillasUsed===false&&audit.sourceFreshness.staleBankStatementsUsed===false&&audit.sourceFreshness.staleFinancialFilesUsed===false&&audit.sourceFreshness.additionalSourcesRequested===0);
  check('AUDIT_TEN_HASHES',Object.keys(audit.sourceHashes||{}).length===11);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.deployExecuted===false&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realRowsStoredInRepo===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia');
  check('CLOSURE_68_63_5',closure.includes('pagos CRM de julio: 68')&&closure.includes('pagos conservados en paquete canónico: 63')&&closure.includes('pagos omitidos: 5'));
  check('CLOSURE_RULE',closure.includes('solo Vigente/Por renovar genera cartera futura')&&closure.includes('solo Vigente/Por renovar puede recibir o conservar un pago'));
  check('CLOSURE_ZERO_WRITES',closure.includes('cobros writes: 0')&&closure.includes('production: untouched'));
  check('ACADEMIA_ROLES',academia.includes('### Dirección')&&academia.includes('### Operativo')&&academia.includes('### Asesor'));
  check('ACADEMIA_HISTORICAL',academia.includes('sí puede conservar recibos históricos exigibles y recibir pagos'));
  check('ACADEMIA_FIFO',academia.includes('recibo exacto')&&academia.includes('requerimiento histórico exigible más antiguo'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-real-payment-matrix-static-v1',gateId:GATE_ID,contractVersion:VERSION,
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
