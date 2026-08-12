#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const GATE='fase-a-ops-leads-crm-release-lab-v20260812';
const VERSION='1.0.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-fase-a-ops-leads-crm-runtime-v20260812.json';
const EXTENSION='tools/orbit360-gate-contract-registry-extension-fase-a-ops-leads-crm-runtime-v20260812.json';
const CONTRACT='tools/orbit360-fase-a-ops-leads-crm-release-contract-v20260812.json';
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-v20260812.mjs';
const SOURCE='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-canonical-source-closure-v20260812.json';
const ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/fase-a-ops-leads-crm-runtime-v20260812-authorization.json';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,700)});
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
let result;
try{
  const lifecycle=json(LIFECYCLE),extension=json(EXTENSION),contract=json(CONTRACT),source=json(SOURCE),request=json(REQUEST),router=read(ROUTER),matrix=read(MATRIX);
  const parent=git(['rev-parse','HEAD^']);
  add('GATE_ARGUMENT',process.argv[2]===GATE);
  add('LIFECYCLE_RUNTIME',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.currentPhase==='FASE_A_OPS_LEADS_CRM_RELEASE_READONLY_RUNTIME');
  add('RUNTIME_CAPABILITIES',lifecycle.executionProfile?.capabilities?.secrets===true&&lifecycle.executionProfile?.capabilities?.firestoreRead===true&&lifecycle.executionProfile?.capabilities?.writes===false&&lifecycle.executionProfile?.capabilities?.runtime===true&&lifecycle.executionProfile?.capabilities?.browser===true&&lifecycle.executionProfile?.capabilities?.deploy===false&&lifecycle.executionProfile?.capabilities?.production===false);
  add('EXTENSION_RUNTIME',extension.gateId===GATE&&extension.gateProfile==='fase-a-ops-leads-crm-runtime'&&extension.contractVersion===VERSION&&extension.lifecycle===LIFECYCLE&&extension.engine==='tools/orbit360-validar-gate-contracts-engine-fase-a-ops-leads-crm-runtime-v20260812.mjs'&&extension.entrypoint===ROUTER);
  add('CANONICAL_SOURCE_BINDING_PRESERVED',router.includes("const FASE_A_OPS_LEADS_CRM_GATE_ID = 'fase-a-ops-leads-crm-release-lab-v20260812';")&&router.includes("sourcePhase: 'SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE'")&&router.includes("SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE:"));
  add('SOURCE_PASS',source.ok===true&&source.decision==='PASS_CANONICAL_SOURCE_BINDING'&&source.runId===31644543049&&source.artifactId===9160188093&&source.artifactDigest==='sha256:b6938949f1af51724b47856bdc1af4fca7d2c05dc054fbcd2f7df9a4f36fc055'&&source.deployExecuted===false&&source.productionTouched===false);
  add('REQUEST_VERSION',EXPECTED_VERSION&&request.requestVersion===EXPECTED_VERSION);
  add('REQUEST_IDENTITY',request.schemaVersion==='orbit360-runtime-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.authorizationGeneration==='fase-a-ops-leads-crm-release-v20260812'&&request.operation==='FASE_A_OPS_LEADS_CRM_AUTHENTICATED_RELEASE_MATRIX');
  add('REQUEST_ONE_SHOT',request.status==='AUTHORIZED_ONCE'&&request.approved===true&&request.authorizedByUser===true&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false);
  add('REQUEST_PARENT_BOUND',request.parentHead===parent&&request.authorizedBaseHead===parent&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('REQUEST_SCOPE',JSON.stringify(request.routes)===JSON.stringify(['ops','leads','cliente360'])&&JSON.stringify(request.roles)===JSON.stringify(['Direccion','Operativo','Asesor'])&&request.firestoreReadAuthorized===true&&request.browserAuthorized===true&&request.authTokenMintAuthorized===true&&request.firestoreWritesAuthorized===0&&request.authWritesAuthorized===0&&request.operationalWritesAuthorized===0&&request.hostingDeployAuthorized===false&&request.functionsDeployAuthorized===false&&request.rulesDeployAuthorized===false&&request.reimportAuthorized===false&&request.productionAuthorized===false&&request.mainAuthorized===false&&request.mergeAuthorized===false);
  add('SOURCE_BOUND_IN_REQUEST',request.sourceRunId===31644543049&&request.sourceArtifactId===9160188093&&request.sourceArtifactDigest===source.artifactDigest&&request.sourceHead===source.head);
  add('MATRIX_FAIL_CLOSED',matrix.includes("AUTHORIZATION_REQUIRED:RUNTIME_NOT_AUTHORIZED")&&matrix.includes("ROUTES=Object.freeze(['ops','leads','cliente360'])")&&matrix.includes("VERIFIED_UNCHANGED")&&matrix.includes("firestoreWrites:0")&&matrix.includes("authWrites:0")&&matrix.includes("operationalWrites:0"));
  add('CONTRACT_RUNTIME_BOUNDARY',contract.runtime?.deployRequired===false&&contract.runtime?.firestoreWritesAuthorized===0&&contract.runtime?.authWritesAuthorized===0&&contract.runtime?.operationalWritesAuthorized===0&&contract.runtime?.productionAuthorized===false);
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-runtime-v2',gateId:GATE,contractVersion:VERSION,status:failed.length?'STOP_GATE_CONTRACT_RUNTIME':'GO_GATE_CONTRACT_FASE_A_OPS_LEADS_CRM_RUNTIME',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'GO_RELEASE_EVIDENCE_RUNTIME',failed:failed.length,failedCheckIds:failed.map(x=>x.id),checksPassed:checks.length-failed.length,checks,executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,firestoreReadAuthorized:failed.length===0,browserAuthorized:failed.length===0,authTokenMintAuthorized:failed.length===0,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,hostingDeployAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
}catch(error){result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-runtime-v2',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_RUNTIME',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,browserAuthorized:false,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,hostingDeployAuthorized:false,productionAuthorized:false,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
