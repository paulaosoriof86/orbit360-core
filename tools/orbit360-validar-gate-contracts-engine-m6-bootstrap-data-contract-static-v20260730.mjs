#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.7';
const GENERATOR='tools/orbit360-m6-generate-product-runtime-config-v20260730.mjs';
const APP='orbit360-platform/core/product-app-runtime-p0.js';
const POLICY='orbit360-platform/core/tenant-access-policy-contract-p0.js';
const PLANNER='orbit360-platform/core/product-query-planner-contract-p0.js';
const STORE='orbit360-platform/data/store-firestore-product-readonly-p0.js';
const ROOT_CAUSE='tools/orbit360-m6-bootstrap-data-contract-root-cause-v20260730.json';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
try{
  const rc=JSON.parse(read(ROOT_CAUSE));
  const generator=read(GENERATOR),app=read(APP),policy=read(POLICY),planner=read(PLANNER),store=read(STORE);
  add('GATE',process.argv[2]===GATE&&rc.gateId===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('ROOT_CAUSE',rc.sourceRun===30526024340&&rc.sourceArtifact===8752755957&&rc.classification==='DATA_CONTRACT_FAILURE'&&rc.rootCause==='RUNTIME_COLLECTION_MANIFEST_EXCEEDS_CANONICAL_MIGRATION_AND_POLICY');
  add('SAFE_ROLLBACK',rc.rollbackSafe===true&&rc.productionLive===false&&rc.countsStable===true&&rc.digestsStable===true&&rc.firestoreDataWrites===0&&rc.operationalWrites===0&&rc.networkWriteCandidates===0);
  add('CANONICAL_MIGRATION',JSON.stringify(rc.canonicalMigratedCollections)===JSON.stringify(['clientes','aseguradoras']));
  for(const rel of [GENERATOR,APP,PLANNER,STORE])execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  add('GENERATOR_EXACT_COLLECTIONS',generator.includes("Object.freeze(['clientes','aseguradoras'])")&&!generator.includes("['clientes','aseguradoras','gestiones','notificaciones']")&&generator.includes("canonicalCollectionContract:'m4_clients_insurers_only'"));
  add('APP_FALLBACK_EXACT_COLLECTIONS',app.includes("['clientes','aseguradoras']")&&!app.includes("['clientes','aseguradoras','gestiones','notificaciones']")&&app.includes("VERSION:'p0-m6-20260730.3'"));
  add('POLICY_COVERS_RUNTIME_COLLECTIONS',/clientes\s*:\s*\{/.test(policy)&&/aseguradoras\s*:\s*\{/.test(policy));
  add('UNSUPPORTED_COLLECTION_NOT_PROMOTED',!generator.includes("'notificaciones'")&&!generator.includes("'gestiones'")&&!app.includes("'notificaciones'")&&!app.includes("'gestiones'"));
  add('FAIL_CLOSED_MECHANISM_PRESERVED',planner.includes("if (!proposal || proposal.ok !== true) errors.push('politica_no_autoriza_consulta')")&&store.includes("state.status = 'attach-error'")&&store.includes("return state.ready || Object.keys(state.snapshotErrors).length === 0"));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-bootstrap-data-contract-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_BOOTSTRAP_DATA_CONTRACT_REMEDIATION_STATIC',status:failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT',classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFrozen:true,sourceRun:30526024340,sourceArtifact:8752755957,rootCause:'RUNTIME_COLLECTION_MANIFEST_EXCEEDS_CANONICAL_MIGRATION_AND_POLICY',canonicalMigratedCollections:['clientes','aseguradoras'],runtimeCollections:['clientes','aseguradoras'],storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-bootstrap-data-contract-static-v1',gateId:GATE,contractVersion:VERSION,status:'DATA_CONTRACT_FAILURE',classification:'DATA_CONTRACT_FAILURE',failed:1,failedCheckIds:['M6_BOOTSTRAP_DATA_CONTRACT_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
