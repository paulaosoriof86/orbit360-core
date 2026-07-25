#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT=process.cwd();
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const GATE_ID='block4-client-country-schema-readonly-v20260725';
const CONTRACT_VERSION='4.2.2';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-schema-summary.json');
const BASELINE=path.join(ROOT,'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json');
const COUNTRY_KEYS=Object.freeze(['country','pais','país','countryCode','country_code','paisCodigo','pais_codigo','codigoPais','codigo_pais']);
const FIELD_PATTERN=/(^|[_\s])(country|pais|país|region|provincia|departamento|canton|cantón|municipio|ciudad|cod.*region|codigo.*pais)/i;
const VOLATILE=new Set(['_syncStatus','_syncOp','_syncError','_syncAt','createdAt','updatedAt','fechaActualizacion','lastModifiedAt']);
function text(v){return String(v==null?'':v).trim();}
function plain(v){if(v===null||v===undefined)return v;if(v&&typeof v.toDate==='function')return v.toDate().toISOString();if(Array.isArray(v))return v.map(plain);if(typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>{if(!VOLATILE.has(k))o[k]=plain(v[k]);});return o;}return v;}
function first(row,keys){for(const key of keys){if(text(row&&row[key]))return row[key];}return '';}
function currency(row){return text(first(row,['currency','moneda','divisa'])).toUpperCase();}
function schemaAudit(rows){
  const counts=new Map();
  rows.forEach(row=>Object.keys(row||{}).forEach(key=>{if(FIELD_PATTERN.test(key)&&text(row[key]))counts.set(key,(counts.get(key)||0)+1);}));
  const candidateFields=[...counts.entries()].map(([name,presentCount])=>({name,presentCount,explicitCountryCandidate:COUNTRY_KEYS.includes(name)})).sort((a,b)=>a.name.localeCompare(b.name));
  return {privacyMode:'field_names_and_counts_only',candidateFields,explicitCountryFieldNames:candidateFields.filter(x=>x.explicitCountryCandidate).map(x=>x.name),recordsAudited:rows.length,valuesExported:false};
}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}
async function main(){
  let app;
  const base={schemaVersion:'orbit360-m4-client-country-schema-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,readOnly:true,writeAuthorized:false,writeExecuted:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,rulesChanged:false,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false,secretValueCount:0,collectionScope:{source:'tenantId/{tenant}/clientes',collectionsRead:1,insurersRead:false,targetRead:false}};
  try{
    if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    const baseline=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
    if(baseline.status!=='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'||baseline.dryRunClosure?.requiresValidation!==65||baseline.dryRunClosure?.issues?.clientsMissingCurrency!==61)throw new Error('DATA_CONTRACT_FAILURE:DRYRUN_BASELINE_INVALID');
    globalThis.window=globalThis;globalThis.Orbit={};load('orbit360-platform/core/m4-client-country-schema-contract-p0.js');
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
    const db=getFirestore(app),legacy=db.collection('tenantId').doc(TENANT_ID);
    const sourceClients=await legacy.collection('clientes').get();
    const sourceRows=sourceClients.docs.map(d=>plain(d.data()||{}));
    const missing=sourceRows.filter(row=>!currency(row));
    const audit=schemaAudit(missing);
    const payload={...base,remoteReadConfirmed:true,sourceCounts:{clientes:sourceClients.size},currencyResolution:{missingCurrency:missing.length},schemaAudit:audit,resolutionDecision:audit.explicitCountryFieldNames.length?'EXPLICIT_COUNTRY_FIELD_PRESENT_REQUIRES_VALUE_VALIDATION':'NO_EXPLICIT_COUNTRY_FIELD_APPROVED_CATALOG_REQUIRED'};
    const checked=globalThis.Orbit.m4ClientCountrySchemaP0.build(payload);
    const finalPayload={...payload,...checked,ok:checked.ok,status:checked.status,classification:checked.ok?null:'DATA_CONTRACT_FAILURE',containsPII:false,containsSecrets:false};
    write(finalPayload);if(!checked.ok)process.exitCode=41;
  }catch(error){
    const msg=text(error&&error.message||error),classification=msg.startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE';
    write({...base,ok:false,status:classification,classification,error:msg.replace(/[A-Za-z0-9_-]{20,}/g,'[redacted]').slice(0,240),remoteReadConfirmed:false,containsPII:false,containsSecrets:false});process.exitCode=41;
  }finally{if(app)await deleteApp(app).catch(()=>{});}
}
await main();
