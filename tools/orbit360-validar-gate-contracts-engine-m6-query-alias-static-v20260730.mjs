#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.9';
const ROOT_CAUSE='tools/orbit360-m6-query-field-alias-root-cause-v20260730.json';
const SCHEMA='tools/orbit360-schema-importacion-ays-v104.json';
const POLICY='orbit360-platform/core/tenant-access-policy-product-p0.js';
const APP='orbit360-platform/core/product-app-runtime-p0.js';
const GENERATOR='tools/orbit360-m6-generate-product-runtime-config-v20260730.mjs';
const RULES='firestore.product-readonly.rules';
const NEXT_REQUEST='tools/orbit360-m6-recovery-6110-request-v20260730.json';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  const rc=JSON.parse(read(ROOT_CAUSE));
  const schema=JSON.parse(read(SCHEMA));
  const policy=read(POLICY),app=read(APP),generator=read(GENERATOR),rules=read(RULES);
  add('GATE',process.argv[2]===GATE&&rc.gateId===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('SOURCE_RECOVERY',rc.sourceRun===30543484354&&rc.sourceArtifact===8759724162&&rc.classification==='DATA_CONTRACT_FAILURE'&&rc.rootCause==='PRODUCT_QUERY_FIELD_ALIAS_MISMATCH');
  add('SAFE_ROLLBACK',rc.rollbackSafe===true&&rc.productionLive===false&&rc.countsStable===true&&rc.digestsStable===true&&rc.firestoreDataWrites===0&&rc.operationalWrites===0&&rc.networkWriteCandidates===0);
  add('OBSERVED_ZERO_BASELINE',rc.observedCounts?.clientes===0&&rc.observedCounts?.aseguradoras===0&&rc.canonicalCounts?.clientes===414&&rc.canonicalCounts?.aseguradoras===26);
  add('CANONICAL_SCHEMA_COUNTRY_FIELD',Array.isArray(schema.collections?.clientes?.required)&&schema.collections.clientes.required.includes('pais')&&Array.isArray(schema.collections?.aseguradoras?.required)&&schema.collections.aseguradoras.required.includes('pais'));
  for(const rel of [POLICY,APP,GENERATOR])execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  add('PRODUCT_QUERY_ALIAS',policy.includes("QUERY_FIELD_ALIASES = Object.freeze({ country: 'pais' })")&&policy.includes('translateQueryProposal')&&policy.includes('productPhysicalFieldAliasesApplied = true'));
  add('PRODUCT_APP_ALL_COLLECTION_BARRIER',app.includes('waitActiveCollections')&&app.includes("expected.every(function(name){return done.indexOf(name)>=0;})")&&app.includes("VERSION:'p0-m6-20260730.4'"));
  add('CANONICAL_COLLECTIONS_PRESERVED',generator.includes("Object.freeze(['clientes','aseguradoras'])")&&!generator.includes("'gestiones'")&&!generator.includes("'notificaciones'"));
  add('READ_ONLY_RULES_PRESERVED',rules.includes('allow create, update, delete: if false;')&&!rules.includes('allow write: if true'));
  add('NEXT_REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,NEXT_REQUEST)));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-query-alias-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_QUERY_ALIAS_REMEDIATION_STATIC',status:failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT',classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFrozen:true,sourceRun:30543484354,sourceArtifact:8759724162,rootCause:'PRODUCT_QUERY_FIELD_ALIAS_MISMATCH',canonicalMigratedCollections:['clientes','aseguradoras'],logicalCountryField:'country',physicalCountryField:'pais',waitAllActiveCollections:true,storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-query-alias-static-v1',gateId:GATE,contractVersion:VERSION,status:'DATA_CONTRACT_FAILURE',classification:'DATA_CONTRACT_FAILURE',failed:1,failedCheckIds:['M6_QUERY_ALIAS_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
