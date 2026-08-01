#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.3-cobros-multievidencia-temporal-static-v20260801';
const VERSION='10.3.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-multievidencia-temporal-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-multievidencia-v20260801.json',
  engine:'orbit360-platform/core/importa-cobros-evidencia-temporal-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  test:'tools/orbit360-test-importa-cobros-evidencia-temporal-p0-v20260801.mjs',
  registry:'orbit360-platform/docs/REGISTRO-FUENTES-CONCILIACION-MULTIEVIDENCIA-20260801.json',
  academia:'orbit360-platform/docs/ACADEMIA-CONCILIACION-MULTIEVIDENCIA-TEMPORAL-20260801.md'
};
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,error='';
try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const lifecycle=JSON.parse(read('lifecycle'));
  check('GATE_ID',lifecycle.gateId===GATE_ID);
  check('VERSION',lifecycle.gateContractVersion===VERSION);
  const capabilities=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('ZERO_CAPABILITIES',Object.keys(capabilities).length===9&&Object.values(capabilities).every(value=>value===false));
  check('NO_WRITE_AUTHORIZATION',lifecycle.writeAuthorized===false);

  const engine=read('engine'),bootstrap=read('bootstrap');
  [
    "20260801.1-multi-evidence-temporal","'estado_cartera_aseguradora'","'planilla_comisiones'",
    'CORROBORATED_COLLECTION','STILL_PENDING_AT_LATER_CUTOFF','CLEARED_OR_ADJUSTED_REQUIRES_VALIDATION',
    'COMMISSION_RECOGNITION_REQUIRES_VALIDATION','postCutoffPaymentValid','allowPostCutoffPayment:true',
    'absenceAloneCreatesCobro:false','commissionAloneCreatesCobro:false','bankRequestedOnlyForSpecificHold:true',
    'cobrosWrites:0','finmovsWrites:0','firestoreWrites:0','operationalWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,38),engine.includes(token)));
  check('ENGINE_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/importa-cobros-evidencia-temporal-p0.js'"));

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_TEMPORAL_MULTI_EVIDENCE_ENGINE_PASS');
  check('TEST_CORROBORATED',testResult&&testResult.corroborated===1);
  check('TEST_POST_CUTOFF',testResult&&testResult.postCutoffPayments===1);
  check('TEST_STILL_PENDING',testResult&&testResult.stillPending===2);
  check('TEST_CLEARED_HOLD',testResult&&testResult.clearedRequiresValidation===1);
  check('TEST_RULES',testResult&&testResult.absenceAloneCreatesCobro===false&&testResult.commissionAloneCreatesCobro===false&&testResult.bankRequestedOnlyForSpecificHold===true);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);

  const registry=JSON.parse(read('registry'));
  check('REGISTRY_STATUS',registry.status==='MULTI_EVIDENCE_SOURCES_REGISTERED_READONLY');
  check('REGISTRY_CLASSIFICATION',registry.classification==='DATA_CONTRACT_FAILURE_CORRECTED');
  check('REGISTRY_FILE_COUNT',registry.currentUploadCoverage.filesReceived===10&&registry.currentUploadCoverage.filesRegistered===10);
  check('REGISTRY_NO_REREQUEST',registry.userRules.doNotReRequestSameHash===true&&registry.userRules.documentEveryReceivedSource===true);
  check('REGISTRY_FRESH_ONLY',registry.userRules.requestFreshPlanillasOnlyWhenNeeded===true&&registry.userRules.requestFreshBankStatementsOnlyWhenNeeded===true&&registry.userRules.requestFreshFinancialFilesOnlyWhenNeeded===true&&registry.userRules.doNotUsePreviouslyProvidedStaleVersions===true);
  check('REGISTRY_POST_CUTOFF',registry.userRules.paymentAfterPortfolioSnapshotCutoffIsValid===true);
  check('REGISTRY_TEMPORAL_MODEL',registry.evidenceModel.portfolioSnapshots.includes('Disappearance')&&registry.evidenceModel.commissionStatements.includes('corroborates'));
  check('REGISTRY_MAPFRE_SUPERSEDES',registry.sources.some(source=>source.logicalName==='Cobros Mapfre julio.xls'&&source.periodEnd==='2026-07-31'&&source.samePaidRowsAsSupersededSource===true));
  check('REGISTRY_AG_TEMPORAL',registry.sources.some(source=>source.logicalName==='Reporte de Primas pendientes Aseguradora General.xls'&&source.postCutoffPaymentPreserved===true));
  check('REGISTRY_FICOHSA_HOLD',registry.sources.some(source=>source.logicalName==='Estado de cuenta Ficohsa a Junio.xlsx'&&source.status==='REGISTERED_PROFILED_HOLD_DATA_CONTRACT'));
  check('REGISTRY_BANTRAB_OLD_USABLE',registry.sources.some(source=>source.logicalName==='Estado de cuenta Bantrab a Julio 03.xlsx'&&source.status==='REGISTERED_PROFILED_OLD_BUT_USABLE'));
  check('REGISTRY_COLUMNA_NOT_INFERRED',registry.currentUploadCoverage.columnaFileIdentified===false&&registry.currentUploadCoverage.columnaRule.includes('Do not infer'));
  check('REGISTRY_ZERO_WRITES',registry.writes.cobros===0&&registry.writes.finmovs===0&&registry.writes.firestore===0&&registry.writes.operational===0);
  check('REGISTRY_SANITIZED',registry.security.realRowsStoredInRepo===false&&registry.security.containsPII===false&&registry.security.containsPolicyNumbers===false&&registry.security.containsSecrets===false);

  const academia=read('academia');
  check('ACADEMIA_ROLES',academia.includes('### Dirección')&&academia.includes('### Operativo')&&academia.includes('### Asesor'));
  check('ACADEMIA_POST_CUTOFF',academia.includes('pendiente al 20 de julio + pago el 22 de julio'));
  check('ACADEMIA_SOURCE_SEPARATION',academia.includes('comisión sola no crea cobro')&&academia.includes('ausencia sola en una cartera posterior no crea cobro'));
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-multievidencia-temporal-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_MULTIEVIDENCIA_TEMPORAL_STATIC_READY':'COBROS_MULTIEVIDENCIA_TEMPORAL_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_MULTIEVIDENCIA_TEMPORAL':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  registeredSources:10,postCutoffPaymentAllowed:true,absenceAloneCreatesCobro:false,commissionAloneCreatesCobro:false,
  stalePlanillasUsed:false,staleBankStatementsUsed:false,staleFinancialFilesUsed:false,
  realRowsStoredInRepo:0,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:43);
