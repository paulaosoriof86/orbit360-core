#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'block2-product-readonly-runtime-v20260723',EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json',EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json',registry:'tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json',overlay:'tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json',freeze:'tools/orbit360-incident-freeze-v20260721.json',runtimeAuth:'tools/orbit360-m2-existing-identity-runtime-authorization-v20260724.json',staticAuth:'tools/orbit360-m2-membership-root-cause-static-authorization-v20260724.json',staticRequest:'tools/orbit360-m2-membership-root-cause-static-request-v20260724.json',failureEvidence:'tools/orbit360-m2-corrected-runtime-failure-evidence-v20260724.json',staticScript:'tools/orbit360-m2-membership-validator-stale-static-v20260724.mjs',staticWorkflow:'.github/workflows/orbit360-m2-membership-validator-stale-static-gate-v20260724.yml',readiness:'orbit360-platform/core/backend-product-readiness-contract-p0.js',runtime:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs',membershipOwner:'tools/orbit360-ensure-lab-secure-membership-v20260720.mjs'};
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
try{
 Object.entries(files).forEach(([id,p])=>check('FILE:'+id,fs.existsSync(path.join(ROOT,p)),p));
 const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),runtimeAuth=json(files.runtimeAuth),staticAuth=json(files.staticAuth),request=json(files.staticRequest),failure=json(files.failureEvidence);
 check('GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion==='2.2.1');
 check('PHASE',lifecycle.executionProfile&&lifecycle.executionProfile.phase==='EXISTING_IDENTITY_MEMBERSHIP_ROOT_CAUSE_STATIC');
 const caps=lifecycle.executionProfile&&lifecycle.executionProfile.capabilities||{};check('CAPABILITIES_ZERO',Object.values(caps).every(v=>v===false));
 check('RUNTIME_CONSUMED',runtimeAuth.status==='CORRECTED_CONSUMED_FAILURE_MEMBERSHIP_ROOT_CAUSE_STATIC'&&runtimeAuth.authorization.allowedExecutions===0&&runtimeAuth.authorization.consumed===true,runtimeAuth.status);
 check('STATIC_AUTH',staticAuth.status==='AUTHORIZED_ONCE'&&staticAuth.authorization.allowedExecutions===1&&staticAuth.authorization.staticOnly===true,staticAuth.status);
 check('STATIC_SCOPE',staticAuth.authorization.secretAccess===false&&staticAuth.authorization.firebaseAccess===false&&staticAuth.authorization.firestoreRead===false&&staticAuth.authorization.runtime===false&&staticAuth.authorization.writes===false);
 check('FREEZE',freeze.status==='M2_MEMBERSHIP_ROOT_CAUSE_STATIC_AUTHORIZED_ONCE',freeze.status);
 check('FREEZE_RUNTIME_ZERO',freeze.m2RuntimeAuthorization&&freeze.m2RuntimeAuthorization.allowedExecutions===0&&freeze.m2RuntimeAuthorization.active===false);
 check('REQUEST',request.schemaVersion==='orbit360-m2-membership-root-cause-static-request-v1'&&request.contractVersion==='2.2.1'&&request.staticOnly===true);
 check('FAILURE_BINDING',failure.runId===30120872643&&failure.artifactId===8607334226&&failure.requestCommit==='7e18bfaa7018808f0a2633e893a54f95d5b49970');
 check('REGISTRY',registry.planPatch&&registry.planPatch.currentObjective==='MEMBERSHIP_VALIDATOR_STALE_STATIC_AUTHORIZED_ONCE');
 check('OVERLAY',overlay.gatePatch&&overlay.gatePatch.status==='M2_MEMBERSHIP_ROOT_CAUSE_STATIC_AUTHORIZED_ONCE');
 const readiness=read(files.readiness),runtime=read(files.runtime),script=read(files.staticScript),workflow=read(files.staticWorkflow),membershipOwner=read(files.membershipOwner);
 check('MEMBERSHIP_OWNER_MARKER',membershipOwner.includes("email: EXPECTED_EMAIL")&&membershipOwner.includes("const EXPECTED_EMAIL = 'orbit.lab@demo.com'"));
 check('READINESS_MEMBERSHIP_GUARD',readiness.includes('validateMembership(membership, expected, options)')&&readiness.includes('controlledMembershipMarkerAccepted')&&readiness.includes('controlledIdentityBindsAuthAndMembership'));
 check('READINESS_GENERIC',!readiness.includes('alianzas-soluciones'));
 check('RUNTIME_CODES',runtime.includes('SAFE_CODE_PREFIXES')&&runtime.includes('extractReadinessErrors')&&runtime.includes("'membresia_'"));
 check('STATIC_PROOF',script.includes('HISTORICAL_FAILURE_REPRODUCED')&&script.includes('CONTROLLED_MEMBERSHIP_ACCEPTED')&&script.includes('GENERIC_DEMO_STILL_BLOCKED'));
 check('WORKFLOW_NO_SECRETS',!workflow.includes('secrets.')&&workflow.includes('No Secrets · No Firebase'));
 check('WORKFLOW_NO_EXTERNAL',!workflow.includes('firebase-admin')&&!workflow.includes('google-auth-library')&&!workflow.includes('firebase-tools'));
}catch(error){check('ENGINE_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok),payload={schemaVersion:'orbit360-gate-contract-preflight-m2-membership-validator-stale-v1',gateId:GATE_ID,contractVersion:'2.2.1',executionPhase:'EXISTING_IDENTITY_MEMBERSHIP_ROOT_CAUSE_STATIC',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,runtimeAuthorized:false,allowedRuntimeExecutions:0,staticAuthorized:failed.length===0,allowedStaticExecutions:failed.length?0:1,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,controlledConfigurationWritesExecuted:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
