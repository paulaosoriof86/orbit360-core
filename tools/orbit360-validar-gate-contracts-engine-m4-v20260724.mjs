#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block4-durable-writer-static-v20260724';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-v20260724.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-v20260724.json',m3Freeze:'tools/orbit360-m3-tenant-activation-freeze-v20260724.json',freeze:'tools/orbit360-m4-durable-writer-freeze-v20260724.json',contract:'orbit360-platform/core/durable-writer-plan-contract-p0.js',test:'tools/orbit360-m4-durable-writer-static-contract-v20260724.cjs',summary:'orbit360-platform/runtime-gate-crm-v20260716/m4-durable-writer-static-summary.json',academia:'orbit360-platform/data/academia-m4-durable-writer-v20260724.js'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),m3=json(files.m3Freeze),freeze=json(files.freeze),summary=json(files.summary);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='4.0.0');
 check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M4_DURABLE_WRITER_STATIC_READY');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('M3_CLOSED',m3.status==='M3_TENANT_ACTIVATED_READONLY'&&m3.activationClosure&&m3.activationClosure.ok===true&&m3.stateClarification&&m3.stateClarification.m3Closed===true);
 check('FREEZE_READY',freeze.status==='M4_DURABLE_WRITER_STATIC_READY_EXECUTION_NOT_AUTHORIZED'&&freeze.stateClarification&&freeze.stateClarification.m4StaticClosed===true&&freeze.stateClarification.allowedM4Executions===0);
 check('REGISTRY_READY',registry.planPatch&&registry.planPatch.activeBlock===4&&registry.planPatch.currentObjective==='M4_DURABLE_WRITER_STATIC_READY_EXECUTION_NOT_AUTHORIZED');
 check('STATIC_SUMMARY',summary.ok===true&&summary.status==='M4_DURABLE_WRITER_STATIC_READY'&&summary.contractChecks&&summary.contractChecks.failed===0&&summary.writeExecuted===false&&summary.m4Execution===false);
 const contract=read(files.contract),test=read(files.test),academia=read(files.academia);
 check('CONTRACT_OWNER',contract.includes('M4_DURABLE_WRITER_STATIC_READY')&&contract.includes('async_coordinator')&&contract.includes('remote_confirmation')&&contract.includes('idempotency_keys')&&contract.includes('append_only_audit')&&contract.includes('durable_rollback')&&contract.includes('batchId'));
 check('MIGRATION_ORDER',contract.includes("'configuration_catalog','memberships','clientes','aseguradoras','quality_audit'"));
 check('COUNTS',contract.includes('clientes:414')&&contract.includes('aseguradoras:26'));
 check('SYNC_STATES',contract.includes("'pending','synced','failed'"));
 check('DEFERRED',contract.includes("'polizas','vehiculos','cartera','cobros','comisiones','financiero_historico','documentos_soporte'"));
 check('TEST_COVERAGE',test.includes('REMOTE_CONFIRMATION')&&test.includes('IDEMPOTENCY_REQUIRED')&&test.includes('MIXED_BLOCKED')&&test.includes('SECRETS_BLOCKED'));
 check('ACADEMIA',academia.includes('M4_DURABLE_WRITER_STATIC_READY')&&academia.includes('pending/synced/failed')&&academia.includes('batchId'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m4-static-v1',gateId:GATE_ID,contractVersion:'4.0.0',executionPhase:'M4_DURABLE_WRITER_STATIC_READY',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m3Closed:failed.length===0,m4StaticClosed:failed.length===0,m4ExecutionAuthorized:false,allowedM4Executions:0,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
