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
  check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='M3_TENANT_ACTIVATION_EXECUTION');
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};
  check('CAPABILITIES',caps.secrets===true&&caps.firestoreRead===true&&caps.runtime===true&&caps.writes===false&&caps.browser===false&&caps.deploy===false&&caps.functionsDeploy===false&&caps.rulesDeploy===false&&caps.production===false);
  check('M3_STATIC_CLOSED',freeze.status==='M3_TENANT_ACTIVATION_STATIC_READY_ACTIVATION_NOT_AUTHORIZED'&&freeze.staticClosure&&freeze.staticClosure.ok===true&&freeze.staticClosure.status==='M3_TENANT_ACTIVATION_STATIC_READY');
  check('AUTH_READY',auth.status==='AUTHORIZED_ONCE_REQUEST_READY'&&auth.authorization.allowedExecutions===1&&auth.authorization.readOnlyActivation===true&&auth.authorization.existingIdentityOnly===true);
  check('REQUEST_SCOPE',request.schemaVersion==='orbit360-m3-tenant-activation-runtime-request-v1'&&request.contractVersion==='3.1.0'&&request.gateId===GATE_ID&&request.explicitAuthorization===true&&request.allowedExecutions===1&&request.readOnlyActivation===true&&request.existingIdentityOnly===true);
  check('REQUEST_NO_WRITES',request.createProject===false&&request.createAuthUser===false&&request.updateAuthUser===false&&request.createMembership===false&&request.updateMembership===false&&request.configurationWrites===false&&request.operationalWrites===false&&request.applyRules===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.imports===false&&request.m4===false&&request.mergeMain===false);
  check('REGISTRY',registry.planPatch&&registry.planPatch.currentObjective==='M3_TENANT_ACTIVATION_READONLY_AUTHORIZED_ONCE'&&registry.gates&&registry.gates[0]&&registry.gates[0].status==='AUTHORIZED_ONCE_REQUEST_READY');
  check('OVERLAY',overlay.gatePatch&&overlay.gatePatch.status==='M3_TENANT_ACTIVATION_READONLY_AUTHORIZED_ONCE'&&overlay.gatePatch.allowedActivationExecutions===1);
  check('MANIFEST',manifest.schemaVersion==='orbit360-m3-tenant-activation-manifest-v1'&&manifest.tenantId==='alianzas-soluciones'&&manifest.sourceOfTruth==='activation_manifest'&&manifest.containsPII===false&&manifest.containsSecrets===false);
  check('MANIFEST_NO_SECRETS',!hasSensitiveValue(manifest));
  const contract=read(files.contract),runtime=read(files.runtime),test=read(files.test),workflow=read(files.workflow);
  check('CONTRACT',contract.includes('M3_TENANT_ACTIVATED_READONLY')&&contract.includes("identitySource!=='membership_only'")&&contract.includes('activationAuthorized')&&contract.includes('activationExecuted')&&contract.includes('m3_escritura_no_permitida'));
  check('RUNTIME',runtime.includes('orbit360-m2-existing-identity-runtime-v20260724.mjs')&&runtime.includes('tenantActivationRuntimeP0')&&runtime.includes('controlledExistingIdentityAccepted')&&runtime.includes('localWriteBlocked')&&runtime.includes('configurationWrites:0')&&runtime.includes('membershipWrites:0'));
  check('TEST',test.includes('M3_RUNTIME_CONTRACT_READY')&&test.includes('NO_WRITES')&&test.includes('NO_RULES')&&test.includes('NO_SECRETS'));
  check('WORKFLOW_TRIGGER',workflow.includes('orbit360-m3-tenant-activation-runtime-request-v20260724.json')&&workflow.includes('orbit360/m3-tenant-activation-readonly'));
  check('WORKFLOW_PREFLIGHT_FIRST',workflow.indexOf('Preflight canónico antes de secretos')>=0&&workflow.indexOf('Resolver cuenta existente después del preflight')>workflow.indexOf('Preflight canónico antes de secretos'));
  check('WORKFLOW_ACCEPTANCE',workflow.includes('.status=="M3_TENANT_ACTIVATED_READONLY"')&&workflow.includes('.activationExecuted==true')&&workflow.includes('.writeExecuted==false')&&workflow.includes('.configurationWrites==0')&&workflow.includes('.membershipWrites==0'));
  check('WORKFLOW_NO_WRITE_COMMANDS',!workflow.includes('firebase deploy')&&!workflow.includes('createUser(')&&!workflow.includes('updateUser(')&&!workflow.includes('setDoc(')&&!workflow.includes('deleteDoc('));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok);
const payload={schemaVersion:'orbit360-gate-contract-preflight-m3-runtime-v1',gateId:GATE_ID,contractVersion:'3.1.0',executionPhase:'M3_TENANT_ACTIVATION_EXECUTION',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,m2Closed:failed.length===0,m3StaticClosed:failed.length===0,activationAuthorized:failed.length===0,allowedActivationExecutions:failed.length?0:1,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,configurationWrites:0,membershipWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});
fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
process.exit(failed.length?41:0);
