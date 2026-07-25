#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'block3-tenant-activation-runtime-v20260724';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m3-runtime-v20260724.json',
  registry:'tools/orbit360-gate-contract-registry-extension-m3-runtime-v20260724.json',
  overlay:'tools/orbit360-gate-contract-overlay-m3-runtime-v20260724.json',
  freeze:'tools/orbit360-m3-tenant-activation-freeze-v20260724.json',
  authorization:'tools/orbit360-m3-tenant-activation-runtime-authorization-v20260724.json',
  request:'tools/orbit360-m3-tenant-activation-runtime-request-v20260724.json',
  contract:'orbit360-platform/core/tenant-activation-runtime-contract-p0.js',
  runtime:'tools/orbit360-m3-tenant-activation-runtime-v20260724.mjs',
  test:'tools/orbit360-m3-tenant-activation-runtime-contract-v20260724.cjs',
  manifest:'tools/orbit360-m3-tenant-activation-manifest-v20260724.json',
  workflow:'.github/workflows/orbit360-m3-tenant-activation-runtime-gate-v20260724.yml'
};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));
const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
const SENSITIVE_KEYS=new Set(['password','pass','pwd','contrasena','clave','secret','token','apikey','api_key','accesstoken','access_token','refreshtoken','refresh_token','privatekey','private_key','clientsecret','client_secret','credentialvalue','credential_value']);
function hasSensitiveValue(value){if(!value||typeof value!=='object')return false;return Object.entries(value).some(([key,item])=>{if(key==='containsSecrets'||key==='containsPII')return false;const normalized=String(key).toLowerCase().replace(/[-_]/g,'');const sensitive=[...SENSITIVE_KEYS].some(k=>k.replace(/[-_]/g,'')===normalized);if(sensitive&&item!==null&&item!==undefined&&item!==''&&item!==false)return true;return item&&typeof item==='object'?hasSensitiveValue(item):false;});}
try{
  Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
  const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),auth=json(files.authorization),request=json(files.request),manifest=json(files.manifest);
  check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='3.1.0');
  check('PHASE_CLOSED',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M3_TENANT_ACTIVATION_CLOSED');
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('CAPABILITIES_ZERO',Object.values(caps).every(value=>value===false));
  check('M3_STATIC_CLOSED',freeze.staticClosure&&freeze.staticClosure.ok===true&&freeze.staticClosure.status==='M3_TENANT_ACTIVATION_STATIC_READY');
  check('M3_ACTIVATION_CLOSED',freeze.status==='M3_TENANT_ACTIVATED_READONLY'&&freeze.stateClarification&&freeze.stateClarification.m3Closed===true&&freeze.activationClosure&&freeze.activationClosure.ok===true);
  check('AUTH_CONSUMED',auth.status==='CONSUMED_SUCCESS_M3_ACTIVATION_CLOSED'&&auth.authorization.allowedExecutions===0&&auth.authorization.requestConsumed===true&&auth.result&&auth.result.ok===true);
  check('RESULT_ACCEPTED',auth.result.status==='M3_TENANT_ACTIVATED_READONLY'&&auth.result.controlledExistingIdentityAccepted===true&&auth.result.storeInstalled===true&&auth.result.snapshotsAttached===true&&auth.result.noFallback===true&&auth.result.storeWriteEnabled===false&&auth.result.localWriteBlocked===true&&auth.result.activationExecuted===true&&auth.result.writeExecuted===false);
  check('RESULT_NO_WRITES',auth.result.configurationWrites===0&&auth.result.membershipWrites===0&&auth.result.clientWrites===0&&auth.result.insurerWrites===0&&auth.result.auditWrites===0&&auth.result.rulesChanged===false);
  check('REQUEST_CONSUMED_SCOPE',request.schemaVersion==='orbit360-m3-tenant-activation-runtime-request-v1'&&request.allowedExecutions===1&&request.readOnlyActivation===true&&request.configurationWrites===false&&request.operationalWrites===false&&request.applyRules===false&&request.m4===false);
  check('REGISTRY_CLOSED',registry.planPatch&&registry.planPatch.currentObjective==='M3_TENANT_ACTIVATED_READONLY_M4_BLOCKED'&&registry.gates&&registry.gates[0]&&registry.gates[0].status==='M3_TENANT_ACTIVATED_READONLY'&&registry.gates[0].m3Authorization.allowedActivationExecutions===0);
  check('OVERLAY_CLOSED',overlay.gatePatch&&overlay.gatePatch.status==='M3_TENANT_ACTIVATED_READONLY'&&overlay.gatePatch.m3Closed===true&&overlay.gatePatch.allowedActivationExecutions===0);
  check('M4_BLOCKED',freeze.stateClarification&&freeze.stateClarification.m4Blocked===true&&freeze.stateClarification.m4Authorized===false&&freeze.m4Deferral.clients===414&&freeze.m4Deferral.insurers===26);
  check('METHODOLOGY_SYNC',lifecycle.methodologyClosure&&lifecycle.methodologyClosure.sameHeadSelfReferencePatternDetectedTwice===true&&registry.gates[0].methodology&&registry.gates[0].methodology.sameHeadSelfReferencePatternDetectedTwice===true&&overlay.methodology&&overlay.methodology.sameSelfReferencePatternDetectedTwice===true&&freeze.methodologyIncidents.some(item=>item.scope==='m3_closure_head_reference_repeated_pattern'));
  check('MANIFEST',manifest.schemaVersion==='orbit360-m3-tenant-activation-manifest-v1'&&manifest.tenantId==='alianzas-soluciones'&&manifest.sourceOfTruth==='activation_manifest'&&manifest.containsPII===false&&manifest.containsSecrets===false);
  check('MANIFEST_NO_SECRETS',!hasSensitiveValue(manifest));
  const contract=read(files.contract),runtime=read(files.runtime),test=read(files.test),workflow=read(files.workflow);
  check('CONTRACT_PRESERVED',contract.includes('M3_TENANT_ACTIVATED_READONLY')&&contract.includes("identitySource!=='membership_only'")&&contract.includes('m3_escritura_no_permitida'));
  check('RUNTIME_PRESERVED',runtime.includes('orbit360-m2-existing-identity-runtime-v20260724.mjs')&&runtime.includes('controlledExistingIdentityAccepted')&&runtime.includes('localWriteBlocked'));
  check('TEST_PRESERVED',test.includes('M3_RUNTIME_CONTRACT_READY')&&test.includes('NO_WRITES')&&test.includes('NO_RULES')&&test.includes('NO_SECRETS'));
  check('WORKFLOW_PRESERVED',workflow.includes('Preflight canónico antes de secretos')&&workflow.includes('.status=="M3_TENANT_ACTIVATED_READONLY"')&&workflow.includes('orbit360/m3-tenant-activation-readonly'));
  check('WORKFLOW_NO_WRITE_COMMANDS',!workflow.includes('firebase deploy')&&!workflow.includes('createUser(')&&!workflow.includes('updateUser(')&&!workflow.includes('setDoc(')&&!workflow.includes('deleteDoc('));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate-contract-preflight-m3-runtime-closed-v1',gateId:GATE_ID,contractVersion:'3.1.0',executionPhase:'M3_TENANT_ACTIVATION_CLOSED',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,m2Closed:failed.length===0,m3StaticClosed:failed.length===0,m3ActivationClosed:failed.length===0,m3Closed:failed.length===0,activationAuthorized:false,allowedActivationExecutions:0,m4Deferred:true,m4Authorized:false,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});
fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
process.exit(failed.length?41:0);
