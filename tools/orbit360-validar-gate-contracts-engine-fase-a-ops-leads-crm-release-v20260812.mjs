#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='fase-a-ops-leads-crm-release-lab-v20260812';
const VERSION='1.0.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const LIFECYCLE='tools/orbit360-validator-lifecycle-fase-a-ops-leads-crm-release-v20260812.json';
const CONTRACT='tools/orbit360-fase-a-ops-leads-crm-release-contract-v20260812.json';
const EXTENSION='tools/orbit360-gate-contract-registry-extension-fase-a-ops-leads-crm-v20260812.json';
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-v20260812.mjs';
const SOURCE_VALIDATOR='tools/orbit360-validar-fase-a-ops-leads-crm-release-source-v20260812.mjs';
const SOURCE_WORKFLOW='.github/workflows/orbit360-fase-a-ops-leads-crm-release-source-v20260812.yml';
const BLOCK1_CLOSURE='orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-closure-sanitized-v20260810.json';
const BLOCK12='tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,700)});
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const exists=p=>fs.existsSync(path.join(ROOT,p));
let result;
try{
  const required=[LIFECYCLE,CONTRACT,EXTENSION,MATRIX,SOURCE_VALIDATOR,SOURCE_WORKFLOW,BLOCK1_CLOSURE,BLOCK12,ROUTER,'orbit360-platform/modules/ops.js','orbit360-platform/modules/leads.js','orbit360-platform/core/ciclo.js'];
  add('GATE_ARGUMENT',process.argv[2]===GATE);
  add('REQUIRED_FILES',required.every(exists),required.filter(x=>!exists(x)).join(','));
  const lifecycle=json(LIFECYCLE),contract=json(CONTRACT),extension=json(EXTENSION),block1=json(BLOCK1_CLOSURE),block12=json(BLOCK12),router=read(ROUTER),matrix=read(MATRIX),workflow=read(SOURCE_WORKFLOW);
  add('LIFECYCLE_BOUND',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1'&&lifecycle.currentPhase==='SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE');
  add('SOURCE_CAPABILITIES_ZERO',Object.values(lifecycle.executionProfile?.capabilities||{}).every(v=>v===false));
  add('CONTRACT_BOUND',contract.gateId===GATE&&contract.contractVersion===VERSION&&contract.runtime?.deployRequired===false&&contract.runtime?.firestoreWritesAuthorized===0&&contract.runtime?.authWritesAuthorized===0&&contract.runtime?.operationalWritesAuthorized===0);
  add('EXTENSION_BOUND',extension.gateId===GATE&&extension.contractVersion===VERSION&&extension.lifecycle===LIFECYCLE&&extension.engine==='tools/orbit360-validar-gate-contracts-engine-fase-a-ops-leads-crm-release-v20260812.mjs'&&extension.entrypoint===ROUTER&&extension.deployRequired===false&&extension.writesAuthorized===0);
  add('CANONICAL_ROUTER_BOUND',router.includes("const FASE_A_OPS_LEADS_CRM_GATE_ID = 'fase-a-ops-leads-crm-release-lab-v20260812';")&&router.includes("sourcePhase: 'SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE'")&&router.includes("SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE:"));
  add('BLOCK1_CLOSED',block1.ok===true&&block1.decision==='PASS_VISUAL_POST_AUTH'&&block1.block1CloseEligible===true&&block1.matrix?.snapshotIntegrity==='VERIFIED_UNCHANGED'&&block1.firestoreWrites===0&&block1.authWrites===0&&block1.operationalWrites===0);
  add('BLOCK12_PRECEDENT_ONLY',Array.isArray(block12.scope?.visualRoutes)&&block12.scope.visualRoutes.includes('ops')&&block12.scope.visualRoutes.includes('leads')&&block12.authorization?.consumed===true&&block12.authorization?.replayAllowed===false);
  add('MATRIX_SCOPE',matrix.includes("ROUTES=Object.freeze(['ops','leads','cliente360'])")&&matrix.includes("{role:'Direccion',width:1440,height:1000")&&matrix.includes("{role:'Operativo',width:1024,height:768")&&matrix.includes("{role:'Asesor',width:390,height:844")&&matrix.includes("AUTHORIZATION_REQUIRED:RUNTIME_NOT_AUTHORIZED")&&matrix.includes("VERIFIED_UNCHANGED"));
  add('NO_RUNTIME_REQUEST',lifecycle.authorization?.allowedExecutions===0&&lifecycle.authorization?.status==='ABSENT_UNTIL_SOURCE_PASS_AND_EXPLICIT_AUTHORIZATION'&&!exists(extension.runtimeRequest));
  add('SOURCE_WORKFLOW_CANONICAL_GATE',workflow.includes(`node tools/orbit360-validar-gate-contracts-v20260717.mjs ${GATE}`));
  add('FINANCE_FROZEN',contract.finance?.financieroHistoricoStatus==='FROZEN_POST_PRODUCTION_82_PERCENT'&&contract.finance?.touched===false);
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-v1',gateId:GATE,contractVersion:VERSION,status:failed.length?'STOP_GATE_CONTRACT_SOURCE':'PASS_GATE_CONTRACT_SOURCE_FASE_A_OPS_LEADS_CRM',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'RELEASE_EVIDENCE_GAP_SOURCE_READY',failed:failed.length,failedCheckIds:failed.map(x=>x.id),checksPassed:checks.length-failed.length,checks,executionAuthorized:false,secretAccessAuthorized:false,writesAuthorized:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
}catch(error){result={schemaVersion:'orbit360-gate-contract-preflight-fase-a-ops-leads-crm-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_SOURCE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,writesAuthorized:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
