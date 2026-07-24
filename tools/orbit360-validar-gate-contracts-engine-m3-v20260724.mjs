#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block3-tenant-activation-static-v20260724';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m3-v20260724.json',registry:'tools/orbit360-gate-contract-registry-extension-m3-v20260724.json',overlay:'tools/orbit360-gate-contract-overlay-m3-v20260724.json',m2Freeze:'tools/orbit360-incident-freeze-v20260721.json',m3Freeze:'tools/orbit360-m3-tenant-activation-freeze-v20260724.json',authorization:'tools/orbit360-m3-tenant-activation-static-authorization-v20260724.json',contract:'orbit360-platform/core/tenant-activation-plan-contract-p0.js',test:'tools/orbit360-m3-tenant-activation-static-contract-v20260724.cjs',paths:'orbit360-platform/core/tenant-canonical-paths-contract-p0.js',membership:'orbit360-platform/core/membership-multirol-contract-p0.js'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),m2=json(files.m2Freeze),freeze=json(files.m3Freeze),auth=json(files.authorization);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='3.0.0');
 check('PHASE_READY',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M3_TENANT_ACTIVATION_STATIC_READY');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('M2_CLOSED',m2.status==='M2_PRODUCT_READONLY_RUNTIME_CLOSED'&&m2.stateClarification&&m2.stateClarification.m2Closed===true,m2.status);
 check('AUTH_CONSUMED',auth.status==='CONSUMED_PASS_STATIC_READY'&&auth.authorization.allowedExecutions===0&&auth.authorization.consumed===true&&auth.result&&auth.result.ok===true,auth.status);
 check('FREEZE_READY',freeze.status==='M3_TENANT_ACTIVATION_STATIC_READY_ACTIVATION_NOT_AUTHORIZED'&&freeze.staticClosure&&freeze.staticClosure.ok===true,freeze.status);
 check('ACTIVATION_BLOCKED',freeze.stateClarification&&freeze.stateClarification.m3ActivationAuthorized===false&&freeze.stateClarification.allowedActivationExecutions===0);
 check('REGISTRY_READY',registry.planPatch&&registry.planPatch.currentObjective==='M3_TENANT_ACTIVATION_STATIC_READY_ACTIVATION_NOT_AUTHORIZED');
 check('OVERLAY_READY',overlay.gatePatch&&overlay.gatePatch.status==='M3_TENANT_ACTIVATION_STATIC_READY_ACTIVATION_NOT_AUTHORIZED');
 check('STATIC_EVIDENCE',freeze.staticClosure.canonicalPreflight==='GO_GATE_CONTRACT_28_OF_28'&&freeze.staticClosure.staticContract==='PASS_37_OF_37');
 check('M4_DEFERRED',freeze.m4Deferral&&freeze.m4Deferral.clients===414&&freeze.m4Deferral.insurers===26);
 const contract=read(files.contract),test=read(files.test),paths=read(files.paths),membership=read(files.membership);
 check('CONTRACT_STATIC',contract.includes('M3_TENANT_ACTIVATION_STATIC_READY')&&contract.includes('writeAuthorized: false')&&contract.includes('activationExecuted: false'));
 check('CONTRACT_MEMBERSHIP',contract.includes("identitySource !== 'membership_only'")&&contract.includes("tenantResolutionSource !== 'membership'"));
 check('CONTRACT_SOURCE_ALLOWLIST',contract.includes('ALLOWED_SOURCES')&&contract.includes("'backend_tenant_config'")&&contract.includes("'activation_manifest'")&&contract.includes("'membership_projection'"));
 check('CONTRACT_BLOCKED_SOURCES',contract.includes("'query_string'")&&contract.includes("'localstorage'")&&contract.includes("'demo'"));
 check('CONTRACT_COUNTRY_CURRENCY',contract.includes('COUNTRY_CURRENCY')&&contract.includes('pais_moneda_inconsistente'));
 check('CONTRACT_M4',contract.includes('persist_tenant_config')&&contract.includes('migrate_clients')&&contract.includes('migrate_insurers'));
 check('CONTRACT_GENERIC',!contract.includes('alianzas-soluciones')&&!contract.includes('A&S'));
 check('TEST_COVERAGE',test.includes('UNKNOWN_SOURCE_BLOCKED')&&test.includes('COUNTRY_CURRENCY_REQUIRED')&&test.includes('SECRETS_BLOCKED')&&test.includes('GENERIC_OWNER'));
 check('PATH_OWNER',paths.includes('COUNTRY_CURRENCY')&&paths.includes('tenantConfigDocumentPath')&&paths.includes('membershipDocumentPath')&&paths.includes('auditDocumentPath'));
 check('MEMBERSHIP_OWNER',membership.includes('STRONG_CONFIRMATION_PHRASE')&&membership.includes('accessExpansion')&&membership.includes('rollbackPlan'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m3-static-closed-v1',gateId:GATE_ID,contractVersion:'3.0.0',executionPhase:'M3_TENANT_ACTIVATION_STATIC_READY',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m2Closed:failed.length===0,m3StaticClosed:failed.length===0,m3ActivationAuthorized:false,staticAuthorized:false,allowedStaticExecutions:0,runtimeAuthorized:false,allowedRuntimeExecutions:0,allowedActivationExecutions:0,m4Deferred:true,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
