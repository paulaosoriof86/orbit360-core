#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block3-tenant-activation-static-v20260724';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m3-v20260724.json',registry:'tools/orbit360-gate-contract-registry-extension-m3-v20260724.json',overlay:'tools/orbit360-gate-contract-overlay-m3-v20260724.json',m2Freeze:'tools/orbit360-incident-freeze-v20260721.json',authorization:'tools/orbit360-m3-tenant-activation-static-authorization-v20260724.json',contract:'orbit360-platform/core/tenant-activation-plan-contract-p0.js',test:'tools/orbit360-m3-tenant-activation-static-contract-v20260724.cjs',paths:'orbit360-platform/core/tenant-canonical-paths-contract-p0.js',membership:'orbit360-platform/core/membership-multirol-contract-p0.js'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.m2Freeze),auth=json(files.authorization);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='3.0.0');
 check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M3_TENANT_ACTIVATION_STATIC_PREPARATION');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('M2_CLOSED',freeze.status==='M2_PRODUCT_READONLY_RUNTIME_CLOSED'&&freeze.stateClarification&&freeze.stateClarification.m2Closed===true&&freeze.m2RuntimeClosure&&freeze.m2RuntimeClosure.ok===true,freeze.status);
 check('M3_BLOCKED',freeze.stateClarification&&freeze.stateClarification.m3Authorized===false&&freeze.stateClarification.m3Blocked===true);
 check('AUTH_ONCE',String(auth.status||'').startsWith('AUTHORIZED_ONCE_REQUEST_')&&auth.authorization.allowedExecutions===1&&auth.authorization.requestCreated===true&&auth.authorization.staticOnly===true&&auth.authorization.activation===false,auth.status);
 check('REGISTRY_ACTIVE',registry.planPatch&&registry.planPatch.currentObjective==='M3_TENANT_ACTIVATION_STATIC_PREPARATION_REQUEST_READY');
 check('OVERLAY_ACTIVE',overlay.gatePatch&&overlay.gatePatch.status==='M3_TENANT_ACTIVATION_STATIC_PREPARATION_REQUEST_READY');
 check('M4_DEFERRED',registry.gates&&registry.gates[0]&&registry.gates[0].m4Deferral&&registry.gates[0].m4Deferral.clients===414&&registry.gates[0].m4Deferral.insurers===26);
 const contract=read(files.contract),test=read(files.test),paths=read(files.paths),membership=read(files.membership);
 check('CONTRACT_STATIC',contract.includes('M3_TENANT_ACTIVATION_STATIC_READY')&&contract.includes('writeAuthorized: false')&&contract.includes('activationExecuted: false'));
 check('CONTRACT_MEMBERSHIP',contract.includes("identitySource !== 'membership_only'")&&contract.includes("tenantResolutionSource !== 'membership'"));
 check('CONTRACT_BLOCKED_SOURCES',contract.includes("'query_string'")&&contract.includes("'localstorage'")&&contract.includes("'demo'"));
 check('CONTRACT_M4',contract.includes('persist_tenant_config')&&contract.includes('migrate_clients')&&contract.includes('migrate_insurers'));
 check('CONTRACT_GENERIC',!contract.includes('alianzas-soluciones')&&!contract.includes('A&S'));
 check('TEST_COVERAGE',test.includes('M4_DEFERRED')&&test.includes('QUERY_SOURCE_BLOCKED')&&test.includes('SECRETS_BLOCKED')&&test.includes('GENERIC_OWNER'));
 check('PATH_OWNER',paths.includes('tenantConfigDocumentPath')&&paths.includes('membershipDocumentPath')&&paths.includes('auditDocumentPath'));
 check('MEMBERSHIP_OWNER',membership.includes('STRONG_CONFIRMATION_PHRASE')&&membership.includes('accessExpansion')&&membership.includes('rollbackPlan'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m3-static-v1',gateId:GATE_ID,contractVersion:'3.0.0',executionPhase:'M3_TENANT_ACTIVATION_STATIC_PREPARATION',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m2Closed:failed.length===0,m3ActivationAuthorized:false,staticAuthorized:failed.length===0,allowedStaticExecutions:failed.length?0:1,runtimeAuthorized:false,allowedRuntimeExecutions:0,m4Deferred:true,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
