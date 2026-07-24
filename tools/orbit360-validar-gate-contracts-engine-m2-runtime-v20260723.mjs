#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block2-product-readonly-runtime-v20260723',EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json',registry:'tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json',overlay:'tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json',freeze:'tools/orbit360-incident-freeze-v20260721.json',staticAuth:'tools/orbit360-m2-existing-identity-runtime-static-authorization-v20260724.json',runtimeAuth:'tools/orbit360-m2-existing-identity-runtime-authorization-v20260724.json',staticRequest:'tools/orbit360-m2-existing-identity-runtime-static-request-v20260724.json',runtimeScript:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs',staticContract:'orbit360-platform/tools/orbit360-m2-existing-identity-runtime-static-contract-v20260724.cjs',staticWorkflow:'.github/workflows/orbit360-m2-existing-identity-runtime-static-gate-v20260724.yml',runtimeWorkflow:'.github/workflows/orbit360-m2-existing-identity-runtime-gate-v20260724.yml',provider:'orbit360-platform/core/product-runtime-provider-contracts-p0.js',entry:'orbit360-platform/product-readonly.html'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
  Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
  const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),staticAuth=json(files.staticAuth),runtimeAuth=json(files.runtimeAuth),request=json(files.staticRequest);
  check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='2.2.0');
  check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='EXISTING_IDENTITY_RUNTIME_PREPARATION');
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
  check('STATIC_AUTH',staticAuth.status==='CONSUMED_PASS',staticAuth.status);
  check('STATIC_EXECUTIONS',staticAuth.authorization&&staticAuth.authorization.allowedExecutions===0);
  check('RUNTIME_AUTH_STATUS',['AUTHORIZED_ONCE','CONSUMED_SUCCESS','CONSUMED_FAILURE'].includes(runtimeAuth.status),runtimeAuth.status);
  check('RUNTIME_AUTH_SCOPE',runtimeAuth.authorization&&runtimeAuth.authorization.existingIdentityOnly===true&&runtimeAuth.authorization.createProject===false&&runtimeAuth.authorization.createAuthUser===false&&runtimeAuth.authorization.updateAuthUser===false&&runtimeAuth.authorization.createMembership===false&&runtimeAuth.authorization.updateMembership===false&&runtimeAuth.authorization.applyRules===false&&runtimeAuth.authorization.configurationWrites===false&&runtimeAuth.authorization.operationalWrites===false);
  check('RUNTIME_EXECUTIONS',runtimeAuth.status==='AUTHORIZED_ONCE'?runtimeAuth.authorization.allowedExecutions===1:runtimeAuth.authorization.allowedExecutions===0,String(runtimeAuth.authorization&&runtimeAuth.authorization.allowedExecutions));
  check('FREEZE',['M2_EXISTING_IDENTITY_RUNTIME_AUTHORIZED_ONCE','M2_EXISTING_IDENTITY_RUNTIME_CLOSED','M2_EXISTING_IDENTITY_RUNTIME_BLOCKED'].includes(freeze.status),freeze.status);
  check('FREEZE_RUNTIME_AUTH',freeze.m2RuntimeAuthorization&&freeze.m2RuntimeAuthorization.existingIdentityOnly===true&&freeze.m2RuntimeAuthorization.rulesChangeAllowed===false&&freeze.m2RuntimeAuthorization.configurationWritesAllowed===false&&freeze.m2RuntimeAuthorization.operationalWritesAllowed===false);
  check('REQUEST',request.schemaVersion==='orbit360-m2-existing-identity-runtime-static-request-v1'&&request.contractVersion==='2.2.0'&&request.staticOnly===true);
  check('REGISTRY',['EXISTING_IDENTITY_RUNTIME_AUTHORIZED_ONCE','EXISTING_IDENTITY_RUNTIME_CLOSED','EXISTING_IDENTITY_RUNTIME_BLOCKED'].includes(registry.planPatch&&registry.planPatch.currentObjective),registry.planPatch&&registry.planPatch.currentObjective);
  check('OVERLAY',overlay.gatePatch&&overlay.gatePatch.contractVersion==='2.2.0');
  const runtime=read(files.runtimeScript),runtimeWorkflow=read(files.runtimeWorkflow),staticWorkflow=read(files.staticWorkflow),provider=read(files.provider),entry=read(files.entry);
  ['createUser(','updateUser(','deleteUser(','FieldValue','firebase-tools deploy','firestore:rules','storage.rules'].forEach(t=>check('NO_RUNTIME_TOKEN:'+t,!runtime.includes(t)));
  check('RUNTIME_EXISTING_PROJECT',runtime.includes("PROJECT_ID='ays-orbit-360-lab'"));
  check('RUNTIME_EXISTING_MEMBERSHIP',runtime.includes("collection('members').get()"));
  check('RUNTIME_MANAGEMENT_CONFIG',runtime.includes('firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps'));
  check('RUNTIME_WORKFLOW_NO_RULES',!runtimeWorkflow.includes('firebase-tools deploy')&&!runtimeWorkflow.includes('firestore:rules'));
  check('RUNTIME_WORKFLOW_NO_ENVIRONMENT',!/^\s*environment:/m.test(runtimeWorkflow));
  check('STATIC_WORKFLOW_NO_SECRETS',!staticWorkflow.includes('secrets.'));
  check('PROVIDER_EXISTING_IDENTITY',provider.includes('existingIdentityOnly:true')&&provider.includes('rulesChangeAuthorized:false'));
  check('ENTRY_GUARD',entry.includes('owner.WRITE_AUTHORIZED===false'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m2-existing-identity-runtime-v2',gateId:GATE_ID,contractVersion:'2.2.0',executionPhase:'EXISTING_IDENTITY_RUNTIME_PREPARATION',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,controlledConfigurationWritesExecuted:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
