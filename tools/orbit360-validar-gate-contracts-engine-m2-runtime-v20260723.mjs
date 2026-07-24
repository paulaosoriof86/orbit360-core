#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block2-product-readonly-runtime-v20260723',EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json',registry:'tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json',overlay:'tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json',freeze:'tools/orbit360-incident-freeze-v20260721.json',runtimeAuth:'tools/orbit360-m2-existing-identity-runtime-authorization-v20260724.json',rootAuth:'tools/orbit360-m2-existing-identity-root-cause-static-authorization-v20260724.json',rootRequest:'tools/orbit360-m2-existing-identity-root-cause-static-request-v20260724.json',rootInput:'tools/orbit360-m2-existing-identity-root-cause-input-v20260724.json',failureEvidence:'tools/orbit360-m2-runtime-failure-evidence-v20260724.json',rootScript:'tools/orbit360-m2-existing-identity-root-cause-static-v20260724.mjs',rootWorkflow:'.github/workflows/orbit360-m2-existing-identity-root-cause-static-gate-v20260724.yml',runtimeScript:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs',readiness:'orbit360-platform/core/backend-product-readiness-contract-p0.js',bootstrap:'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',labOwner:'tools/orbit360-ensure-lab-user.mjs',rules:'firestore.rules'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
  Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
  const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),runtimeAuth=json(files.runtimeAuth),rootAuth=json(files.rootAuth),request=json(files.rootRequest),input=json(files.rootInput),failure=json(files.failureEvidence);
  check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='2.2.1');
  check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='EXISTING_IDENTITY_ROOT_CAUSE_STATIC');
  const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
  check('RUNTIME_CONSUMED',runtimeAuth.status==='CONSUMED_FAILURE_ROOT_CAUSE_PROVEN'&&runtimeAuth.authorization.allowedExecutions===0,runtimeAuth.status);
  check('ROOT_AUTH_CLOSED',rootAuth.status==='CONSUMED_PASS'&&rootAuth.authorization.allowedExecutions===0&&rootAuth.result&&rootAuth.result.ok===true,rootAuth.status);
  check('ROOT_AUTH_SCOPE',rootAuth.authorization.secretAccess===false&&rootAuth.authorization.firebaseAccess===false&&rootAuth.authorization.firestoreRead===false&&rootAuth.authorization.runtime===false&&rootAuth.authorization.writes===false);
  check('FREEZE_CLOSED',freeze.status==='M2_VALIDATOR_STALE_ROOT_CAUSE_PROVEN'&&freeze.rootCause&&freeze.rootCause.exactSubcauseProven===true,freeze.status);
  check('RUNTIME_ZERO',freeze.m2RuntimeAuthorization&&freeze.m2RuntimeAuthorization.allowedExecutions===0&&freeze.m2RuntimeAuthorization.active===false);
  check('REQUEST',request.schemaVersion==='orbit360-m2-existing-identity-root-cause-static-request-v1'&&request.contractVersion==='2.2.1'&&request.staticOnly===true);
  check('INPUT',input.contractVersion==='2.2.1'&&input.staticOnly===true&&input.expectedIdentityFingerprint);
  check('FAILURE_BINDING',failure.runId===30103556811&&failure.artifactId===8600630817&&failure.status==='DATA_CONTRACT_FAILURE');
  check('REGISTRY_CLOSED',registry.planPatch&&registry.planPatch.currentObjective==='VALIDATOR_STALE_PROVEN_CORRECTED_RUNTIME_AWAITING_AUTHORIZATION');
  check('OVERLAY_CLOSED',overlay.gatePatch&&overlay.gatePatch.contractVersion==='2.2.1'&&overlay.gatePatch.status==='M2_VALIDATOR_STALE_ROOT_CAUSE_PROVEN');
  const runtime=read(files.runtimeScript),readiness=read(files.readiness),bootstrap=read(files.bootstrap),root=read(files.rootScript),workflow=read(files.rootWorkflow);
  ['bootstrapPhase','bootstrapErrors','readinessStatus','readinessErrors','storeStatus','storeSnapshotErrorKeys'].forEach(t=>check('RUNTIME_EVIDENCE:'+t,runtime.includes(t)));
  check('READINESS_CONTROLLED_GUARD',readiness.includes('controlledExistingIdentityGuard')&&readiness.includes('transicion_identidad_existente_incompleta')&&readiness.includes('controlledExistingIdentityAccepted'));
  check('READINESS_NO_TENANT_HARDCODE',!readiness.includes('alianzas-soluciones'));
  check('BOOTSTRAP_ORDER',bootstrap.indexOf('backendProductReadinessP0.readiness')>=0&&bootstrap.indexOf('store._attachSnapshots')>bootstrap.indexOf('backendProductReadinessP0.readiness'));
  check('ROOT_STATIC_PROOF',root.includes('PRE_FIX_FAILURE_REPRODUCED')&&root.includes('CONTROLLED_FIX_PASS')&&root.includes('READINESS_BEFORE_SNAPSHOTS'));
  check('WORKFLOW_NO_SECRETS',!workflow.includes('secrets.')&&workflow.includes('No Secrets · No Firebase'));
  check('WORKFLOW_NO_EXTERNAL',!workflow.includes('firebase-admin')&&!workflow.includes('google-auth-library')&&!workflow.includes('firebase-tools'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m2-validator-stale-closed-v1',gateId:GATE_ID,contractVersion:'2.2.1',executionPhase:'EXISTING_IDENTITY_ROOT_CAUSE_STATIC',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,rootCauseProven:failed.length===0,rootCauseCode:failed.length?'':'AUTH_DEMO_MARKER_REJECTED_AUTHORIZED_EXISTING_IDENTITY',runtimeAuthorized:false,allowedRuntimeExecutions:0,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,controlledConfigurationWritesExecuted:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
