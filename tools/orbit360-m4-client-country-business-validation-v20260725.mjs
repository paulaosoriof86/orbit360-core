#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const GATE_ID = 'block4-client-country-business-validation-dryrun-v20260725';
const CONTRACT_VERSION = '4.2.4';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-business-validation-summary.json');
const BASELINE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-values-closure.json');
const COUNTRY_KEYS = Object.freeze(['country','pais','país','countryCode','country_code','paisCodigo','pais_codigo','codigoPais','codigo_pais']);

function text(v){ return String(v == null ? '' : v).trim(); }
function currency(row){
  for(const key of ['currency','moneda','divisa']){
    const value = text(row && row[key]);
    if(value) return value.toUpperCase();
  }
  return '';
}
function token(v){
  return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
function canonical(v){
  const value = token(v);
  if(!value) return '';
  if(value === 'gt' || value === 'guatemala' || value === 'gtm') return 'GT';
  if(value === 'co' || value === 'colombia' || value === 'col') return 'CO';
  return null;
}
function classify(row){
  const values = COUNTRY_KEYS.map(key => text(row && row[key])).filter(Boolean);
  if(!values.length) return 'empty';
  const normalized = values.map(canonical);
  const known = [...new Set(normalized.filter(value => value === 'GT' || value === 'CO'))];
  const hasUnknown = normalized.some(value => value === null);
  if(known.length > 1) return 'conflict';
  if(hasUnknown) return 'nonCanonical';
  return known[0] || 'nonCanonical';
}
function write(payload){
  fs.mkdirSync(path.dirname(OUT), {recursive:true});
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function load(rel){
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), {filename:rel});
}

async function main(){
  let app;
  const base = {
    schemaVersion:'orbit360-m4-client-country-business-validation-v1',
    gateId:GATE_ID,
    contractVersion:CONTRACT_VERSION,
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    readOnly:true,
    writeAuthorized:false,
    writeExecuted:false,
    configurationWrites:0,
    membershipWrites:0,
    clientWrites:0,
    insurerWrites:0,
    auditWrites:0,
    rulesChanged:false,
    hostingDeploy:false,
    functionsDeploy:false,
    imports:false,
    policies:false,
    mergeMain:false,
    containsPII:false,
    containsSecrets:false,
    secretValueCount:0,
    privacyMode:'aggregate_proposal_only',
    rawValuesExported:false,
    individualRecordsExported:false,
    auditPlan:'append_only',
    collectionScope:{source:'tenantId/{tenant}/clientes',collectionsRead:1,insurersRead:false,targetRead:false}
  };
  try{
    if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID) !== PROJECT_ID){
      throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    }
    const closure = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    if(
      closure.status !== 'M4_CLIENT_COUNTRY_VALUES_AUDIT_CLOSED_DATA_CONTRACT_FAILURE' ||
      closure.distribution?.nonCanonical !== 61 ||
      closure.targetOnlyDeferred !== 4
    ){
      throw new Error('DATA_CONTRACT_FAILURE:COUNTRY_VALUES_CLOSURE_INVALID');
    }
    globalThis.window = globalThis;
    globalThis.Orbit = {};
    load('orbit360-platform/core/m4-client-country-business-validation-contract-p0.js');
    app = getApps()[0] || initializeApp({credential:applicationDefault(), projectId:PROJECT_ID});
    const db = getFirestore(app);
    const legacy = db.collection('tenantId').doc(TENANT_ID);
    const snapshot = await legacy.collection('clientes').get();
    const missing = snapshot.docs.map(doc => doc.data() || {}).filter(row => !currency(row));
    const distribution = {GT:0,CO:0,empty:0,nonCanonical:0,conflict:0};
    missing.forEach(row => { distribution[classify(row)] += 1; });
    const payload = {
      ...base,
      remoteReadConfirmed:true,
      sourceCounts:{clientes:snapshot.size,missingCurrency:missing.length},
      sourceDistribution:distribution,
      businessValidation:{
        scope:'all_61_missing_currency_clients',
        country:'GT',
        currency:'GTQ',
        source:'explicit_user_business_validation',
        appliesToRecords:61
      },
      proposal:{
        records:61,
        countryFieldChanges:61,
        currencyFieldChanges:61,
        country:'GT',
        currency:'GTQ',
        creates:0,
        deletes:0,
        targetOnlyDeferred:4
      },
      traceability:{
        source:'business_validation_batch',
        actorRole:'Direccion_AyS',
        reasonCode:'VALIDACION_EMPRESARIAL_LOTE_61_GT',
        beforeAfterPlanned:true,
        recordIdsExported:false
      },
      rollback:{mode:'per_record_before_snapshot',planned:true,executed:false},
      resolutionDecision:'CLIENT_COUNTRY_CORRECTION_PROPOSAL_READY_TARGET_ONLY_STILL_DEFERRED'
    };
    const checked = globalThis.Orbit.m4ClientCountryBusinessValidationP0.build(payload);
    write({...payload,...checked,ok:checked.ok,status:checked.status,classification:checked.ok?null:'DATA_CONTRACT_FAILURE',containsPII:false,containsSecrets:false});
    if(!checked.ok) process.exitCode = 41;
  }catch(error){
    const message = text(error && error.message || error);
    const classification = message.startsWith('PIPELINE_MECHANISM_FAILURE') ? 'PIPELINE_MECHANISM_FAILURE' : 'DATA_CONTRACT_FAILURE';
    write({...base,ok:false,status:classification,classification,error:message.replace(/[A-Za-z0-9_-]{20,}/g,'[redacted]').slice(0,240),remoteReadConfirmed:false,containsPII:false,containsSecrets:false});
    process.exitCode = 41;
  }finally{
    if(app) await deleteApp(app).catch(()=>{});
  }
}

await main();
