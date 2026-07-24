#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block2-product-readonly-runtime-v20260723',EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json',registry:'tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json',overlay:'tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json',freeze:'tools/orbit360-incident-freeze-v20260721.json',runtimeAuth:'tools/orbit360-m2-existing-identity-runtime-authorization-v20260724.json',readiness:'orbit360-platform/core/backend-product-readiness-contract-p0.js',runtime:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),runtimeAuth=json(files.runtimeAuth);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='2.2.1');
 check('PHASE_CLOSED',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='EXISTING_IDENTITY_RUNTIME_CLOSED');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('RUNTIME_CONSUMED_SUCCESS',runtimeAuth.status==='CONSUMED_SUCCESS_M2_RUNTIME_CLOSED'&&runtimeAuth.authorization.allowedExecutions===0&&runtimeAuth.authorization.consumed===true&&runtimeAuth.result&&runtimeAuth.result.ok===true,runtimeAuth.status);
 check('RUNTIME_ACCEPTANCE',runtimeAuth.result.controlledExistingIdentityAccepted===true&&runtimeAuth.result.controlledAuthMarkerAccepted===true&&runtimeAuth.result.controlledMembershipMarkerAccepted===true&&runtimeAuth.result.storeInstalled===true&&runtimeAuth.result.snapshotsAttached===true&&runtimeAuth.result.noFallback===true&&runtimeAuth.result.storeWriteEnabled===false&&runtimeAuth.result.localWriteBlocked===true);
 check('RUNTIME_SECURITY',runtimeAuth.result.rulesChanged===false&&runtimeAuth.result.configurationWrites===0&&runtimeAuth.result.operationalWrites===0);
 check('FREEZE_CLOSED',freeze.status==='M2_PRODUCT_READONLY_RUNTIME_CLOSED'&&freeze.stateClarification&&freeze.stateClarification.m2Closed===true&&freeze.m2RuntimeAuthorization.allowedExecutions===0,freeze.status);
 check('REGISTRY_CLOSED',registry.planPatch&&registry.planPatch.currentObjective==='M2_RUNTIME_READONLY_CLOSED_M3_BLOCKED');
 check('OVERLAY_CLOSED',overlay.gatePatch&&overlay.gatePatch.status==='M2_RUNTIME_READONLY_CLOSED'&&overlay.effectiveOwnerReconciliation&&overlay.effectiveOwnerReconciliation.m2Closed===true);
 const readiness=read(files.readiness),runtime=read(files.runtime);
 check('READINESS_GUARDS_PRESERVED',readiness.includes('controlledAuthMarkerAccepted')&&readiness.includes('controlledMembershipMarkerAccepted')&&readiness.includes('controlledIdentityBindsAuthAndMembership'));
 check('READINESS_GENERIC',!readiness.includes('alianzas-soluciones'));
 check('RUNTIME_EVIDENCE_PRESERVED',runtime.includes('SAFE_CODE_PREFIXES')&&runtime.includes('extractReadinessErrors')&&runtime.includes('controlledAuthMarkerAccepted')&&runtime.includes('controlledMembershipMarkerAccepted'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m2-runtime-closed-v1',gateId:GATE_ID,contractVersion:'2.2.1',executionPhase:'EXISTING_IDENTITY_RUNTIME_CLOSED',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m2RuntimeClosed:failed.length===0,m2Closed:failed.length===0,m3Authorized:false,runtimeAuthorized:false,allowedRuntimeExecutions:0,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,controlledConfigurationWritesExecuted:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
