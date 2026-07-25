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
const GATE_ID='block4-client-country-values-readonly-v20260725';
const CONTRACT_VERSION='4.2.3';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-values-summary.json');
const BASELINE=path.join(ROOT,'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json');
const COUNTRY_KEYS=Object.freeze(['country','pais','país','countryCode','country_code','paisCodigo','pais_codigo','codigoPais','codigo_pais']);
function text(v){return String(v==null?'':v).trim();}
function currency(row){for(const key of ['currency','moneda','divisa']){const v=text(row&&row[key]);if(v)return v.toUpperCase();}return '';}
function token(v){return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function canonical(v){const t=token(v);if(!t)return '';if(t==='gt'||t==='guatemala'||t==='gtm')return 'GT';if(t==='co'||t==='colombia'||t==='col')return 'CO';return null;}
function classify(row){
  const values=COUNTRY_KEYS.map(key=>text(row&&row[key])).filter(Boolean);
  if(values.length===0)return 'empty';
  const normalized=values.map(canonical),known=[...new Set(normalized.filter(v=>v==='GT'||v==='CO'))],hasUnknown=normalized.some(v=>v===null);
  if(known.length>1)return 'conflict';
  if(hasUnknown)return 'nonCanonical';
  return known[0]||'nonCanonical';
}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}
async function main(){
  let app;
  const base={schemaVersion:'orbit360-m4-client-country-values-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,readOnly:true,writeAuthorized:false,writeExecuted:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,rulesChanged:false,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false,secretValueCount:0,privacyMode:'aggregate_categories_only',rawValuesExported:false,individualRecordsExported:false,collectionScope:{source:'tenantId/{tenant}/clientes',collectionsRead:1,insurersRead:false,targetRead:false}};
  try{
    if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    const baseline=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
    if(baseline.status!=='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'||baseline.dryRunClosure?.issues?.clientsMissingCurrency!==61)throw new Error('DATA_CONTRACT_FAILURE:DRYRUN_BASELINE_INVALID');
    globalThis.window=globalThis;globalThis.Orbit={};load('orbit360-platform/core/m4-client-country-values-contract-p0.js');
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
    const db=getFirestore(app),legacy=db.collection('tenantId').doc(TENANT_ID);
    const sourceClients=await legacy.collection('clientes').get();
    const missing=sourceClients.docs.map(d=>d.data()||{}).filter(row=>!currency(row));
    const distribution={GT:0,CO:0,empty:0,nonCanonical:0,conflict:0,total:missing.length};
    missing.forEach(row=>{distribution[classify(row)]++;});
    const unresolved=distribution.empty+distribution.nonCanonical+distribution.conflict;
    const payload={...base,remoteReadConfirmed:true,sourceCounts:{clientes:sourceClients.size,missingCurrency:missing.length},distribution,currencyProposal:{GT:'GTQ',CO:'COP',resolved:distribution.GT+distribution.CO,unresolved,writeAuthorized:false},resolutionDecision:unresolved?'AGGREGATE_COUNTRY_VALIDATION_REQUIRED':'AGGREGATE_CURRENCY_PROPOSAL_READY_WRITE_NOT_AUTHORIZED'};
    const checked=globalThis.Orbit.m4ClientCountryValuesP0.build(payload);
    const finalPayload={...payload,...checked,ok:checked.ok,status:checked.status,classification:checked.ok?null:'DATA_CONTRACT_FAILURE',containsPII:false,containsSecrets:false};
    write(finalPayload);if(!checked.ok)process.exitCode=41;
  }catch(error){
    const msg=text(error&&error.message||error),classification=msg.startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE';
    write({...base,ok:false,status:classification,classification,error:msg.replace(/[A-Za-z0-9_-]{20,}/g,'[redacted]').slice(0,240),remoteReadConfirmed:false,containsPII:false,containsSecrets:false});process.exitCode=41;
  }finally{if(app)await deleteApp(app).catch(()=>{});}
}
await main();
