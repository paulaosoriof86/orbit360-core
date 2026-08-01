#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.1-cobros-source-intake-static-v20260801';
const VERSION='10.1.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-source-intake-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-source-intake-v20260801.json',
  engine:'orbit360-platform/core/importa-cobros-conciliacion-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  engineTest:'tools/orbit360-test-importa-cobros-conciliacion-p0-v20260801.mjs',
  manifestValidator:'tools/orbit360-validar-manifest-cobros-fuente-ays-v20260801.mjs',
  manifestTest:'tools/orbit360-test-validar-manifest-cobros-fuente-ays-v20260801.mjs',
  intake:'orbit360-platform/docs/COBROS-CONCILIACION-FUENTES-INTAKE-20260801.json'
};
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
const checks=[];const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const run=file=>spawnSync(process.execPath,[file],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
let engineResult=null,manifestResult=null,error='';
try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const lifecycle=JSON.parse(read('lifecycle'));
  check('GATE_ID',lifecycle.gateId===GATE_ID);
  check('VERSION',lifecycle.gateContractVersion===VERSION);
  const capabilities=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('ZERO_CAPABILITIES',Object.keys(capabilities).length===9&&Object.values(capabilities).every(value=>value===false));

  const engine=read('engine'),bootstrap=read('bootstrap');
  [
    "'cobros_realizados'","'planilla_aseguradora'","'estado_cuenta_bancario'","'documentos_soporte'",
    "cobros_realizados:'crm'","planilla_aseguradora:'insurer'",
    "estado_cuenta_bancario:'support'","documentos_soporte:'support'",
    "targetCollection:TARGET[type]",'SKIP_EXACT_DUPLICATE','CREATE_PROPOSAL','UPDATE_PROPOSAL',
    'SIN_CONTRAPARTE_CRM','EMPATE_CANDIDATOS','IDENTIDAD_INSUFICIENTE','autoApply:false',
    'cobrosWrites:0','finmovsWrites:0','patchDryRunContracts'
  ].forEach(token=>check('ENGINE_'+token.slice(0,32),engine.includes(token)));
  check('ENGINE_NO_COBRO_WRITE',!/\.(?:insert|update)\s*\(\s*['"]cobros['"]/.test(engine));
  check('ENGINE_NO_FINMOV_WRITE',!/\.(?:insert|update)\s*\(\s*['"]finmovs['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/importa-cobros-conciliacion-p0.js'"));

  const engineRun=run(files.engineTest);
  check('ENGINE_TEST_EXIT',engineRun.status===0);
  if(engineRun.status===0)engineResult=JSON.parse(engineRun.stdout);
  check('ENGINE_TEST_STATUS',engineResult&&engineResult.status==='COBROS_SOURCE_DRYRUN_ENGINE_PASS');
  check('ENGINE_CREATE_UPDATE_SKIP_HOLD',engineResult&&engineResult.create===1&&engineResult.update===1&&engineResult.skip===1&&engineResult.hold===2);
  check('ENGINE_SUPPORT_ONLY',engineResult&&engineResult.bankSupportingOnly===true&&engineResult.documentsSupportingOnly===true);
  check('ENGINE_ZERO_WRITES',engineResult&&engineResult.cobrosWrites===0&&engineResult.finmovsWrites===0&&engineResult.firestoreWrites===0&&engineResult.operationalWrites===0);

  const manifestRun=run(files.manifestTest);
  check('MANIFEST_TEST_EXIT',manifestRun.status===0);
  if(manifestRun.status===0)manifestResult=JSON.parse(manifestRun.stdout);
  check('MANIFEST_TEST_STATUS',manifestResult&&manifestResult.status==='COBROS_SOURCE_MANIFEST_VALIDATOR_PASS');
  check('MANIFEST_DIRECT_COBROS_BLOCKED',manifestResult&&manifestResult.directCobrosBlocked===true);
  check('MANIFEST_FAIL_CLOSED',manifestResult&&manifestResult.payloadBlocked===true&&manifestResult.countryCurrencyFailClosed===true);

  const intake=JSON.parse(read('intake'));
  check('INTAKE_STATUS',intake.status==='ENGINE_READY_PAYLOADS_REQUIRED');
  check('INTAKE_REGISTRY_OPEN',intake.sourceRegistry.status==='OPEN_PENDING_MORE_FILES'&&intake.sourceRegistry.cobrosWriteBlocked===true);
  check('INTAKE_CRM_HASH',intake.sources.some(source=>source.sourceType==='cobros_realizados'&&source.registeredSha256==='727665170572143979b5f274190e200da397e7b32965d1809b1b9be6a8495302'));
  check('INTAKE_INSURER_SOURCES',intake.sources.some(source=>source.sourceType==='planilla_aseguradora'&&source.registeredSources&&source.registeredSources.length===2&&source.coverageComplete===false));
  check('INTAKE_BANK_NOT_AUTHORITY',intake.sources.some(source=>source.sourceType==='estado_cuenta_bancario'&&source.authority==='SOPORTE_NO_AUTORITATIVO_POR_SI_SOLO'));
  check('INTAKE_FINANCIAL_FILE_EXCLUDED',intake.sources.some(source=>source.sourceType==='estado_cuenta_bancario'&&source.excludedKnownFile==='Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx'));
  check('INTAKE_NO_PAYLOAD',intake.realDryRunPrerequisites.currentPayloadsAttached===false);
  check('INTAKE_ZERO_WRITES',intake.realDryRunPrerequisites.cobrosWrites===0&&intake.realDryRunPrerequisites.finmovsWrites===0);
}catch(exception){error=String(exception&&exception.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-source-intake-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_SOURCE_INTAKE_STATIC_READY':'COBROS_SOURCE_INTAKE_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_SOURCE_INTAKE':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,engineResult,manifestResult,
  registryStatus:'OPEN_PENDING_MORE_FILES',realPayloadsRequired:true,
  firestoreWrites:0,operationalWrites:0,cobrosWrites:0,finmovsWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));process.exit(ready?0:41);
