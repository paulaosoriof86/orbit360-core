#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const GATE='fase-a-ops-leads-crm-release-lab-v20260812';
const VERSION='1.0.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-fase-a-ops-leads-crm-composed-runtime-v20260812.json';
const EXTENSION='tools/orbit360-gate-contract-registry-extension-fase-a-ops-leads-crm-composed-runtime-v20260812.json';
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-composed-v20260812.mjs';
const SOURCE='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-composed-source-closure-v20260812.json';
const STOP='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-pipeline-stage-stop-v20260812.json';
const CONTRACT='tools/orbit360-fase-a-ops-leads-crm-release-contract-v20260812.json';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/fase-a-ops-leads-crm-composed-runtime-20260812-authorization.json';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,700)});
let result;
try{
  const lifecycle=json(LIFECYCLE),ext=json(EXTENSION),source=json(SOURCE),stop=json(STOP),contract=json(CONTRACT),request=json(REQUEST),matrix=read(MATRIX);
  const parent=git(['rev-parse','HEAD^']);
  add('GATE_ARGUMENT',process.argv[2]===GATE);
  add('LIFECYCLE_COMPOSED',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='COMPOSED_RUNTIME_READY_AWAITING_REQUEST'&&lifecycle.currentPhase==='FASE_A_OPS_LEADS_CRM_COMPOSED_READONLY_RUNTIME');
  add('RUNTIME_CAPABILITIES',lifecycle.executionProfile?.capabilities?.secrets===true&&lifecycle.executionProfile?.capabilities?.firestoreRead===true&&lifecycle.executionProfile?.capabilities?.writes===false&&lifecycle.executionProfile?.capabilities?.runtime===true&&lifecycle.executionProfile?.capabilities?.browser===true&&lifecycle.executionProfile?.capabilities?.deploy===false&&lifecycle.executionProfile?.capabilities?.production===false);
  add('EXTENSION_COMPOSED',ext.gateId===GATE&&ext.gateProfile==='fase-a-ops-leads-crm-composed-runtime'&&ext.contractVersion===VERSION&&ext.status==='COMPOSED_RUNTIME_PROFILE_READY_AWAITING_REQUEST'&&ext.lifecycle===LIFECYCLE&&ext.engine==='tools/orbit360-validar-gate-contracts-engine-fase-a-ops-leads-crm-composed-runtime-v20260812.mjs'&&ext.requestPath===REQUEST&&ext.matrix===MATRIX&&ext.sourceClosure===SOURCE);
  add('SOURCE_CLOSURE',source.ok===true&&source.decision==='PASS_FASE_A_COMPOSED_HARNESS_SOURCE'&&source.classification==='PIPELINE_ROOT_CAUSE_CORRECTED_SOURCE'&&source.rootCause==='HARNESS_CONTRACT_COMPOSITION_FAILURE'&&source.sourceRunId===31648662017&&source.sourceArtifactId===9161727489&&source.sourceArtifactDigest==='sha256:064ee3b03391b5c0d1d1dd21cde1ef4b4b91b9acea265b91d35ce82e8d5b49f2'&&source.sourceHead==='20ce49867c588866a099d68c6211057efc9373f9');
  add('STOP_BOUND',stop.ok===true&&stop.decision==='STOP_PIPELINE_STAGE_AFTER_TWO_RUNTIME_FAILURES'&&stop.classification==='PIPELINE_MECHANISM_FAILURE'&&stop.rootCause==='HARNESS_CONTRACT_COMPOSITION_FAILURE'&&stop.runtimeFailures?.length===2&&stop.runtimeFailures[0].runId===31644988994&&stop.runtimeFailures[1].runId===31646214850&&stop.samePipelineMechanismRetryForbidden===true);
  add('REQUEST_VERSION',EXPECTED_VERSION==='20260812.fase-a-ops-leads-crm-composed-runtime.v3'&&request.requestVersion===EXPECTED_VERSION);
  add('REQUEST_IDENTITY',request.schemaVersion==='orbit360-runtime-request-v1'&&request.authorizationGeneration==='fase-a-ops-leads-crm-composed-runtime-v3-20260812'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.operation==='FASE_A_OPS_LEADS_CRM_AUTHENTICATED_RELEASE_MATRIX_COMPOSED_V3');
  add('REQUEST_ONE_SHOT',request.status==='AUTHORIZED_ONCE'&&request.approved===true&&request.authorizedByUser===true&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false);
  add('REQUEST_PARENT_BOUND',request.parentHead===parent&&request.authorizedBaseHead===parent&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('REQUEST_SOURCE_BOUND',request.composedSourceRunId===source.sourceRunId&&request.composedSourceArtifactId===source.sourceArtifactId&&request.composedSourceArtifactDigest===source.sourceArtifactDigest&&request.composedSourceHead===source.sourceHead&&request.priorRuntimeRuns?.join(',')==='31644988994,31646214850');
  add('REQUEST_SCOPE',JSON.stringify(request.routes)===JSON.stringify(['ops','leads','cliente360'])&&JSON.stringify(request.roles)===JSON.stringify(['Direccion','Operativo','Asesor'])&&request.firestoreReadAuthorized===true&&request.browserAuthorized===true&&request.authTokenMintAuthorized===true&&request.firestoreWritesAuthorized===0&&request.authWritesAuthorized===0&&request.operationalWritesAuthorized===0&&request.hostingDeployAuthorized===false&&request.functionsDeployAuthorized===false&&request.rulesDeployAuthorized===false&&request.reimportAuthorized===false&&request.productionAuthorized===false&&request.mainAuthorized===false&&request.mergeAuthorized===false);
  add('MATRIX_COMPOSITION',matrix.includes("SCHEMA='orbit360-fase-a-ops-leads-crm-auth-matrix-v3-composed'")&&matrix.includes("COMPOSITION_REVISION='block12-transport-plus-block1-auth-readiness-v20260812'")&&matrix.includes("TRANSPORT_OWNER='BLOCK12_EXISTING_LAB_TRANSPORT'")&&matrix.includes("AUTH_READINESS_OWNER='BLOCK1_SEGMENTED_AUTH_MEMBERSHIP_ROUTER'")&&matrix.includes('TRANSPORT_BUDGET_MS=90000')&&matrix.includes('LOGIN_FORM_BUDGET_MS=15000')&&matrix.includes('AUTH_READY_BUDGET_MS=35000'));
  add('MATRIX_FAIL_CLOSED',matrix.includes('AUTHORIZATION_REQUIRED:RUNTIME_NOT_AUTHORIZED')&&matrix.includes("ROUTES=Object.freeze(['ops','leads','cliente360'])")&&matrix.includes('VERIFIED_UNCHANGED')&&matrix.includes('firestoreWrites:0')&&matrix.includes('authWrites:0')&&matrix.includes('operationalWrites:0')&&matrix.includes('deploys:0'));
  add('ANTI_LOOP',lifecycle.antiLoop?.priorPipelineFailures===2&&lifecycle.antiLoop?.priorMechanismFrozen===true&&lifecycle.antiLoop?.maximumComposedRuntimeExecutions===1&&lifecycle.antiLoop?.sameCheckpointFailureRequiresStopRetry===true&&lifecycle.antiLoop?.noFurtherRuntimeWithoutNewRootCause===true&&ext.maximumComposedRuntimeExecutions===1);
  add('CONTRACT_BOUNDARY',contract.runtime?.deployRequired===false&&contract.runtime?.firestoreWritesAuthorized===0&&contract.runtime?.authWritesAuthorized===0&&contract.runtime?.operationalWritesAuthorized===0&&contract.runtime?.productionAuthorized===false);
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-composed-runtime-v1',gateId:GATE,contractVersion:VERSION,status:failed.length?'STOP_GATE_CONTRACT_COMPOSED_RUNTIME':'GO_GATE_CONTRACT_FASE_A_OPS_LEADS_CRM_COMPOSED_RUNTIME',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'GO_RELEASE_EVIDENCE_COMPOSED_RUNTIME',failed:failed.length,failedCheckIds:failed.map(x=>x.id),checksPassed:checks.length-failed.length,checks,executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,firestoreReadAuthorized:failed.length===0,browserAuthorized:failed.length===0,authTokenMintAuthorized:failed.length===0,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,hostingDeployAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
}catch(error){result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-composed-runtime-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_COMPOSED_RUNTIME',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,browserAuthorized:false,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,hostingDeployAuthorized:false,productionAuthorized:false,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};}
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
