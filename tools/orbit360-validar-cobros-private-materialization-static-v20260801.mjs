#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const GATE_ID='block10.7-cobros-private-materialization-static-v20260801';
const VERSION='10.7.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-private-materialization-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-private-materialization-v20260801.json',
  engine:'orbit360-platform/core/cobros-private-authorization-materializer-p0.js',
  bootstrap:'orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js',
  test:'tools/orbit360-test-cobros-private-authorization-materializer-p0-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-MATERIALIZACION-PRIVADA-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-MATERIALIZACION-PRIVADA-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-MATERIALIZACION-PRIVADA-COBROS-20260801.md',
  claude:'orbit360-platform/docs/CLAUDE-ACUMULADO-COBROS-MATERIALIZACION-PRIVADA-20260801.md'
};
const checks=[];const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,error='';
try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));
  const lifecycle=JSON.parse(read('lifecycle'));
  check('GATE_ID',lifecycle.gateId===GATE_ID);
  check('VERSION',lifecycle.gateContractVersion===VERSION);
  const caps=lifecycle.executionProfile?.capabilities||{};
  check('ZERO_CAPABILITIES',Object.keys(caps).length===9&&Object.values(caps).every(value=>value===false));
  check('NO_WRITE_AUTHORIZATION',lifecycle.writeAuthorized===false);
  const engine=read('engine'),bootstrap=read('bootstrap');
  [
    '20260801.1-private-readonly-materializer','PRIVATE_AUTHORIZATION_MATERIALIZATION_READY',
    'privateCardsEnumerable:false','privateValuesPersisted:false','packageGrantsAuthorization:false',
    'authorizationGranted:0','writeEligible:0','disposalRequired:true','cobrosWrites:0','finmovsWrites:0'
  ].forEach(token=>check('ENGINE_'+token.slice(0,42),engine.includes(token)));
  check('ENGINE_NON_ENUMERABLE',engine.includes("Object.defineProperty(result,'privateCards'")&&engine.includes('enumerable:false'));
  check('ENGINE_DISPOSE',engine.includes("Object.defineProperty(result,'dispose'")&&engine.includes('disposeCards'));
  check('ENGINE_NO_WRITE_CALLS',!/\.(?:insert|update|remove)\s*\(\s*['"](?:cobros|finmovs)['"]/.test(engine));
  check('ENGINE_BOOTSTRAPPED',bootstrap.includes("'core/cobros-private-authorization-materializer-p0.js'"));
  const bootstrapVersion=Number((bootstrap.match(/const VERSION='20260801\.(\d+)'/)||[])[1]);
  check('BOOTSTRAP_MINIMUM',Number.isFinite(bootstrapVersion)&&bootstrapVersion>=6);
  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);else error=`test_exit_${run.status}:${String(run.stderr||run.stdout||'').slice(-1200)}`;
  check('TEST_STATUS',testResult?.status==='COBROS_PRIVATE_AUTHORIZATION_MATERIALIZER_PASS');
  check('TEST_COUNTS',testResult?.cards===5&&testResult?.direct===4&&testResult?.historical===1);
  check('TEST_PRIVACY',testResult?.privateCardsEnumerable===false&&testResult?.privateValuesPersisted===false&&testResult?.serializedPayloadContainsPrivateValues===false);
  check('TEST_DISPOSAL',testResult?.disposed===true&&testResult?.remainingPrivateCards===0);
  check('TEST_CONTROLS',testResult?.duplicateRefs===0&&testResult?.duplicateIdempotencyKeys===0&&testResult?.authorizationGranted===0&&testResult?.writeEligible===0);
  check('TEST_ZERO_WRITES',testResult?.cobrosWrites===0&&testResult?.finmovsWrites===0&&testResult?.firestoreWrites===0&&testResult?.operationalWrites===0);
  const audit=JSON.parse(read('audit'));
  const acceptedAuditStatuses=new Set([
    'PRIVATE_AUTHORIZATION_MATERIALIZATION_CONTRACT_READY',
    'PRIVATE_AUTHORIZATION_MATERIALIZATION_STATIC_READY'
  ]);
  const finalAuditMetadataOk=audit.status!=='PRIVATE_AUTHORIZATION_MATERIALIZATION_STATIC_READY'||(
    audit.gate?.gateId===GATE_ID&&audit.gate?.run===30706859578&&audit.gate?.checks==='46/46 PASS'
  );
  check('AUDIT_STATUS',acceptedAuditStatuses.has(audit.status)&&finalAuditMetadataOk);
  check('AUDIT_SOURCE',audit.sourcePackage.gateId==='block10.6-cobros-authorization-package-static-v20260801'&&audit.sourcePackage.cards===5);
  check('AUDIT_COUNTS',audit.materializationContract.privateCards===5&&audit.materializationContract.direct===4&&audit.materializationContract.historical===1);
  check('AUDIT_PRIVACY',audit.materializationContract.privateCardsEnumerable===false&&audit.materializationContract.serializedAuditContainsPrivateValues===false&&audit.privateRuntimeInput.storedInRepo===false&&audit.privateRuntimeInput.storedInArtifact===false);
  check('AUDIT_AUTH',audit.authorization.packageGrantsAuthorization===false&&audit.authorization.authorizationGranted===0&&audit.authorization.writeEligible===0);
  check('AUDIT_DISPOSAL',audit.materializationContract.disposalRequired===true&&audit.materializationContract.remainingPrivateCardsAfterDisposal===0);
  check('AUDIT_NO_NEW_FILES',audit.privateRuntimeInput.requiresNewPlanillas===false&&audit.privateRuntimeInput.requiresNewBankStatements===false&&audit.privateRuntimeInput.requiresNewFinancialFiles===false);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realPrivateCardsStoredInRepo===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);
  const closure=read('closure'),academia=read('academia'),claude=read('claude');
  check('CLOSURE_CONTRACT',closure.includes('no son enumerables')&&closure.includes('destruirse explícitamente'));
  check('ACADEMIA_ROLES',academia.includes('## Dirección')&&academia.includes('## Operativo')&&academia.includes('## Asesor'));
  check('CLAUDE_CLASSIFICATION',claude.includes('REPLICABLE_CLAUDE_ACUMULADO')&&claude.includes('resolución privada en memoria'));
}catch(exception){error=String(exception?.message||exception);}
const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const payload={
  schemaVersion:'orbit360-cobros-private-materialization-static-v1',gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_PRIVATE_MATERIALIZATION_STATIC_READY':'COBROS_PRIVATE_MATERIALIZATION_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_PRIVATE_MATERIALIZATION':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,testResult,
  materialization:{cards:5,direct:4,historical:1,authorizationGranted:0,writeEligible:0,remainingPrivateCardsAfterDisposal:0},
  privateCardsEnumerable:false,serializedPayloadContainsPrivateValues:false,privateValuesPersisted:false,packageGrantsAuthorization:false,
  duplicateRefs:0,duplicateIdempotencyKeys:0,disposalRequired:true,
  realRowsStoredInRepo:0,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(ready?0:47);
