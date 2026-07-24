#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'block2-product-readonly-runtime-v20260723';
const EXTENSION='tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json';
const OVERLAY='tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json';
const AUTHORIZATION='tools/orbit360-m2-existing-project-reconciliation-authorization-v20260724.json';
const REQUEST='tools/orbit360-m2-existing-project-reconciliation-request-v20260724.json';
const FREEZE='tools/orbit360-incident-freeze-v20260721.json';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const EXPECTED_CAPABILITIES=Object.freeze({secrets:true,firestoreRead:true,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false});
const exists=rel=>fs.existsSync(path.join(ROOT,rel));const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');const json=rel=>JSON.parse(read(rel));const unique=v=>[...new Set([].concat(v||[]).filter(Boolean))];
function executableText(source,rel){let out=String(source||'');if(/\.(?:js|mjs|cjs)$/i.test(rel))out=out.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');if(/\.html?$/i.test(rel))out=out.replace(/<!--[\s\S]*?-->/g,'');if(/\.ya?ml$/i.test(rel))out=out.replace(/^\s*#.*$/gm,'');return out;}
function exactCapabilities(actual,expected){const a=Object.keys(actual||{}).sort(),e=Object.keys(expected||{}).sort();return JSON.stringify(a)===JSON.stringify(e)&&e.every(k=>actual[k]===expected[k]);}
function writeEvidence(payload){fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
let extension,overlay,lifecycle,authorization,request,freeze,gate;
try{
 for(const rel of [EXTENSION,OVERLAY,LIFECYCLE,AUTHORIZATION,REQUEST,FREEZE])check(`CONTROL_FILE:${rel}`,exists(rel),rel);
 extension=json(EXTENSION);overlay=json(OVERLAY);lifecycle=json(LIFECYCLE);authorization=json(AUTHORIZATION);request=json(REQUEST);freeze=json(FREEZE);
 check('EXTENSION_SCHEMA',extension.schemaVersion==='orbit360-gate-contract-registry-extension-v1',extension.schemaVersion);
 check('OVERLAY_SCHEMA',overlay.schemaVersion==='orbit360-gate-contract-overlay-v1',overlay.schemaVersion);
 check('LIFECYCLE_SCHEMA',lifecycle.schemaVersion==='orbit360-validator-lifecycle-contract-m2-runtime-v1',lifecycle.schemaVersion);
 check('AUTHORIZATION_SCHEMA',authorization.schemaVersion==='orbit360-m2-existing-project-reconciliation-authorization-v1',authorization.schemaVersion);
 check('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m2-existing-project-reconciliation-request-v1',request.schemaVersion);
 gate=(extension.gates||[]).find(item=>item.gateId===GATE_ID)||null;
 check('GATE_REGISTERED',Boolean(gate),GATE_ID);check('ACTIVE_BLOCK',Number(extension.planPatch&&extension.planPatch.activeBlock)===2,JSON.stringify(extension.planPatch||{}));
 check('PREVIOUS_CLOSURE',extension.planPatch&&extension.planPatch.previousBlockStatus==='M1_CLOSED_M2_STATIC_CLOSED',JSON.stringify(extension.planPatch||{}));
 check('GATE_VERSION',gate&&gate.contractVersion==='2.1.1',gate&&gate.contractVersion);check('GATE_STATUS',gate&&gate.status==='ACTIVE_RECONCILIATION_AUTHORIZED_ONCE',gate&&gate.status);
 check('OVERLAY_GATE',overlay.gateId===GATE_ID,overlay.gateId);check('LIFECYCLE_GATE',lifecycle.gateId===GATE_ID,lifecycle.gateId);
 check('LIFECYCLE_VERSION',lifecycle.gateContractVersion==='2.1.1',lifecycle.gateContractVersion);check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1',lifecycle.validatorLifecycleRevision);
 const profile=overlay.gatePatch&&overlay.gatePatch.executionProfile||gate&&gate.executionProfile||{};
 check('EXECUTION_PHASE',profile.phase==='EXISTING_PROJECT_RECONCILIATION',profile.phase);check('EXACT_CAPABILITIES',exactCapabilities(profile.capabilities||{},EXPECTED_CAPABILITIES),JSON.stringify(profile.capabilities||{}));
 check('WRITES_BLOCKED',profile.operationalWritesAuthorized===false&&(profile.controlledConfigurationWrites||[]).length===0,JSON.stringify(profile));
 check('PROJECT_LOCK',profile.workflowLocks&&profile.workflowLocks.expectedFirebaseProjectId==='ays-orbit-360-lab',JSON.stringify(profile.workflowLocks||{}));
 check('EXISTING_ALIASES_ONLY',profile.workflowLocks&&profile.workflowLocks.existingSecretAliasesOnly===true,JSON.stringify(profile.workflowLocks||{}));
 check('AUTHORIZATION_STATUS',authorization.status==='AUTHORIZED_READ_ONLY_RECONCILIATION_ONCE',authorization.status);
 check('AUTHORIZATION_SCOPE',authorization.authorization&&authorization.authorization.allowedExecutions===1&&authorization.authorization.readOnlyDiagnostic===true&&authorization.authorization.createProject===false&&authorization.authorization.createAuthUser===false&&authorization.authorization.createMembership===false&&authorization.authorization.applyRules===false&&authorization.authorization.operationalWrites===false,JSON.stringify(authorization.authorization||{}));
 check('FREEZE_STATUS',freeze.status==='M2_EXISTING_PROJECT_RECONCILIATION_AUTHORIZED_ONCE',freeze.status);check('FREEZE_CLASSIFICATION',freeze.classification==='PIPELINE_MECHANISM_FAILURE',freeze.classification);
 check('FREEZE_AUTH',freeze.m2ReconciliationAuthorization&&freeze.m2ReconciliationAuthorization.active===true&&freeze.m2ReconciliationAuthorization.consumed===false&&freeze.m2ReconciliationAuthorization.allowedExecutions===1,JSON.stringify(freeze.m2ReconciliationAuthorization||{}));
 check('REQUEST_GATE',request.gateId===GATE_ID&&request.contractVersion==='2.1.1',JSON.stringify(request));check('REQUEST_BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703',request.branch);
 check('REQUEST_AUTHORIZED',request.explicitAuthorization===true&&request.allowedExecutions===1&&request.readOnlyDiagnostic===true,JSON.stringify(request));
 check('REQUEST_SCOPE',request.expectedProjectId==='ays-orbit-360-lab'&&request.createProject===false&&request.createAuthUser===false&&request.createMembership===false&&request.applyRules===false&&request.operationalWrites===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.imports===false&&request.policies===false&&request.m3===false&&request.mergeMain===false,JSON.stringify(request));
 check('REQUEST_BASE_COMMIT',/^[0-9a-f]{40}$/.test(String(request.authorizedBaseCommit||'')),request.authorizedBaseCommit);
 const owners=overlay.replaceCanonicalOwners===true?overlay.canonicalOwners||[]:extension.canonicalOwners||[];const required=unique([].concat(gate&&gate.requiredFiles||[],overlay.requiredFiles||[]));
 for(const rel of required)check(`REQUIRED_FILE:${rel}`,exists(rel),rel);for(const validator of unique(gate&&gate.validators||[]))check(`VALIDATOR_EXISTS:${validator}`,exists(validator),validator);
 for(const owner of owners){const present=exists(owner.path);check(`OWNER_EXISTS:${owner.id}`,present,owner.path);if(!present)continue;const source=executableText(read(owner.path),owner.path);for(const token of unique(owner.requiredTokens||[]))check(`OWNER_TOKEN:${owner.id}:${token}`,source.includes(token),token);}
 for(const item of overlay.runtimeVersionContracts||[]){const present=exists(item.path);check(`RUNTIME_FILE:${item.path}`,present,item.path);if(!present)continue;const source=executableText(read(item.path),item.path);for(const token of unique(item.requiredTokens||[]))check(`RUNTIME_TOKEN:${item.path}:${token}`,source.includes(token),token);}
 const workflow=gate&&gate.workflow||'';check('WORKFLOW_EXISTS',workflow&&exists(workflow),workflow);if(workflow&&exists(workflow)){const source=executableText(read(workflow),workflow);const p=source.indexOf('Preflight canónico antes de secretos'),s=source.indexOf('secrets.');check('WORKFLOW_PREFLIGHT_FIRST',p>=0&&s>p,`preflight=${p},secret=${s}`);check('WORKFLOW_EXISTING_PROJECT',source.includes('ays-orbit-360-lab'),workflow);check('WORKFLOW_EXISTING_ALIASES',source.includes('FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB')&&source.includes('FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB')&&source.includes('FIREBASE_SERVICE_ACCOUNT'),workflow);check('WORKFLOW_NO_NEW_ENVIRONMENT',!source.includes('environment: orbit360-product-readonly'),workflow);check('WORKFLOW_NO_RULES',!source.includes('firestore:rules')&&!source.includes('firebase-tools deploy'),workflow);check('WORKFLOW_NO_WRITES',source.includes('No Writes'),workflow);check('WORKFLOW_STATUS',source.includes('orbit360/m2-existing-project-reconciliation-v1'),workflow);}
 const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||process.env.ORBIT360_BRANCH||'';if(branch)check('RUNTIME_BRANCH',branch==='ays/backend-tenant-lab-v99-20260703',`actual=${branch}`);
}catch(error){check('ENGINE_EXECUTION',false,String(error&&error.message||error));}
const failed=checks.filter(item=>!item.ok);const payload={schemaVersion:'orbit360-gate-contract-preflight-m2-existing-project-reconciliation-v1',gateId:GATE_ID,contractVersion:gate&&gate.contractVersion||'2.1.1',executionPhase:'EXISTING_PROJECT_RECONCILIATION',generatedAt:new Date().toISOString(),status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,operationalWrites:0,controlledConfigurationWritesExecuted:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};writeEvidence(payload);console.log(JSON.stringify(payload,null,2));process.exit(failed.length?41:0);
