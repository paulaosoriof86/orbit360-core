#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block4-durable-writer-dryrun-v20260724';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-dryrun-v20260724.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-dryrun-v20260724.json',overlay:'tools/orbit360-gate-contract-overlay-m4-dryrun-v20260724.json',freeze:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json',authorization:'tools/orbit360-m4-durable-writer-dryrun-authorization-v20260724.json',closure:'orbit360-platform/runtime-gate-crm-v20260716/m4-durable-writer-dryrun-closure.json'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p)),checks=[],check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),auth=json(files.authorization),closure=json(files.closure);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='4.1.0');
 check('PHASE_CLOSED',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M4_DURABLE_WRITER_DRYRUN_CLOSED');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
 check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('AUTH_CONSUMED',auth.status==='CONSUMED_SUCCESS_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'&&auth.authorization.allowedExecutions===0&&auth.authorization.consumed===true&&auth.result&&auth.result.ok===true);
 check('REGISTRY_CLOSED',registry.planPatch&&registry.planPatch.currentObjective==='M4_DRYRUN_CLOSED_DATA_VALIDATION_REQUIRED'&&registry.gates[0].status==='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED');
 check('OVERLAY_CLOSED',overlay.gatePatch&&overlay.gatePatch.allowedDryRunExecutions===0&&overlay.effectiveOwnerReconciliation.approvalReady===false);
 check('FREEZE_CLOSED',freeze.status==='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'&&freeze.stateClarification&&freeze.stateClarification.requiresValidation===65);
 check('CLOSURE_EVIDENCE',closure.status==='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'&&closure.runId===30145799192&&closure.sourceCounts.clientes===414&&closure.sourceCounts.aseguradoras===26);
 check('DATA_VALIDATION_BOUNDARY',closure.issues.clientsMissingCurrency===61&&closure.issues.clientTargetOnly===2&&closure.issues.insurerTargetOnly===2&&closure.requiresValidation===65&&closure.approvalReady===false);
 check('ZERO_WRITES',closure.writeExecuted===false&&closure.configurationWrites===0&&closure.membershipWrites===0&&closure.clientWrites===0&&closure.insurerWrites===0&&closure.auditWrites===0);
 check('SECURITY',closure.issues.secretValueCount===0&&closure.rulesChanged===false&&closure.hostingDeploy===false&&closure.functionsDeploy===false);
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m4-dryrun-closed-v1',gateId:GATE_ID,contractVersion:'4.1.0',executionPhase:'M4_DURABLE_WRITER_DRYRUN_CLOSED',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m4DryRunClosed:failed.length===0,approvalReady:false,requiresValidation:65,dryRunAuthorized:false,allowedDryRunExecutions:0,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
