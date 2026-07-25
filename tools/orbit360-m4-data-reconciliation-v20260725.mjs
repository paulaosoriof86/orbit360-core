#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT=process.cwd(),PROJECT_ID='ays-orbit-360-lab',TENANT_ID='alianzas-soluciones';
const GATE_ID='block4-data-reconciliation-readonly-v20260725',CONTRACT_VERSION='4.2.1';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-data-reconciliation-summary.json');
const FREEZE=path.join(ROOT,'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json');
const TECH=/\b(demo|test|testing|smoke|placeholder|sample|seed|synthetic|temporal|tmp|orbit\.lab)\b/i;
const VOLATILE=new Set(['_syncStatus','_syncOp','_syncError','_syncAt','createdAt','updatedAt','fechaActualizacion','lastModifiedAt']);
const COUNTRY_KEYS=Object.freeze(['country','pais','país','countryCode','country_code','paisCodigo','pais_codigo','codigoPais','codigo_pais']);
const SCHEMA_FIELD_PATTERN=/(^|[_\s])(country|pais|país|region|provincia|departamento|cod.*region|codigo.*pais)/i;

function text(v){return String(v==null?'':v).trim();}
function plain(v){if(v===null||v===undefined)return v;if(v&&typeof v.toDate==='function')return v.toDate().toISOString();if(Array.isArray(v))return v.map(plain);if(typeof v==='object'){var o={};Object.keys(v).sort().forEach(k=>{if(!VOLATILE.has(k))o[k]=plain(v[k]);});return o;}return v;}
function stable(v){return JSON.stringify(plain(v));}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex');}
function norm(v){return text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function first(row,keys){for(const k of keys){if(text(row&&row[k]))return row[k];}return '';}
function canonicalCountryValue(value){
  const raw=norm(value).replace(/\s+/g,'');
  if(['gt','gtm','guatemala'].includes(raw))return 'GT';
  if(['co','col','colombia'].includes(raw))return 'CO';
  return '';
}
function country(row){return canonicalCountryValue(first(row,COUNTRY_KEYS));}
function currency(row){return text(first(row,['currency','moneda','divisa'])).toUpperCase();}
function tracePresent(row){return !!(row&&(row.sourceTrace||row.trace||row.importBatchId||row.batchId||row.sourceOfTruth||row.migrationSource));}
function technicalMarker(row){const parts=[];function walk(v,depth){if(depth>2||v===null||v===undefined)return;if(Array.isArray(v)){v.slice(0,20).forEach(x=>walk(x,depth+1));return;}if(typeof v==='object'){Object.keys(v).slice(0,80).forEach(k=>{parts.push(k);walk(v[k],depth+1);});return;}if(typeof v==='string'||typeof v==='number')parts.push(String(v));}walk(row,0);return TECH.test(parts.join(' '));}
function schemaAudit(rows){
  const counts=new Map();
  rows.forEach(row=>Object.keys(row||{}).forEach(key=>{
    if(SCHEMA_FIELD_PATTERN.test(key)&&text(row[key]))counts.set(key,(counts.get(key)||0)+1);
  }));
  const fields=[...counts.entries()].map(([name,presentCount])=>({name,presentCount})).sort((a,b)=>a.name.localeCompare(b.name));
  return {
    privacyMode:'field_names_and_counts_only',
    explicitCountryKeys:COUNTRY_KEYS.slice(),
    candidateFields:fields,
    recordsAudited:rows.length,
    valuesExported:false
  };
}
function fingerprints(row,collection){const out=[];function add(kind,values){const clean=values.map(norm);if(clean.every(Boolean))out.push(kind+':'+hash(clean.join('|')));}
  if(collection==='clientes'){
    add('doc',[first(row,['numeroDocumento','numero_documento','documento','identificacion','dpi','nit','rut','cedula','cedulaJuridica','cedula_juridica'])]);
    add('name_country',[first(row,['nombre','razonSocial','razon_social','name','legalName']),country(row)]);
    add('email',[first(row,['email','correo','correoElectronico'])]);
    add('phone',[first(row,['telefono','phone','celular','movil'])]);
  }else{
    add('code',[first(row,['codigo','code','insurerCode','aseguradoraCodigo'])]);
    add('tax',[first(row,['nit','taxId','tax_id'])]);
    add('name_country',[first(row,['nombre','razonSocial','razon_social','name','legalName']),country(row)]);
  }
  return [...new Set(out)];
}
function sourceFingerprintIndex(snapshot,collection){const idx=new Map();snapshot.docs.forEach(doc=>{const row=plain(doc.data()||{});fingerprints(row,collection).forEach(fp=>{if(!idx.has(fp))idx.set(fp,[]);idx.get(fp).push(doc.id);});});return idx;}
function classifyTargetOnly(sourceSnap,targetSnap,collection){const sourceIds=new Set(sourceSnap.docs.map(d=>d.id)),idx=sourceFingerprintIndex(sourceSnap,collection),items=[];
  targetSnap.docs.filter(d=>!sourceIds.has(d.id)).forEach(doc=>{const row=plain(doc.data()||{}),fps=fingerprints(row,collection);let matches=0;fps.forEach(fp=>{matches+=Number((idx.get(fp)||[]).length);});
    const tech=technicalMarker(row),trace=tracePresent(row);let recommendation='requiere_validacion',reason='sin_equivalencia_ni_trazabilidad_concluyente';
    if(matches>0){recommendation='actualizar_rekey';reason='huella_equivalente_en_fuente_con_id_distinto';}
    else if(tech){recommendation='retirar_candidato';reason='marcador_tecnico_no_productivo';}
    else if(trace){recommendation='conservar';reason='registro_canonico_trazable_sin_equivalente_legacy';}
    items.push({token:hash(collection+'|'+doc.id).slice(0,16),collection,recommendation,reason,fingerprintMatches:matches,tracePresent:trace,technicalMarker:tech});
  });return items;
}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}

async function main(){
  let app;
  const base={schemaVersion:'orbit360-m4-data-reconciliation-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,readOnly:true,writeAuthorized:false,writeExecuted:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,rulesChanged:false,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false,containsPII:false,containsSecrets:false};
  try{
    if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
    if(freeze.status!=='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'||freeze.dryRunClosure&&freeze.dryRunClosure.requiresValidation!==65)throw new Error('DATA_CONTRACT_FAILURE:DRYRUN_FREEZE_INVALID');
    globalThis.window=globalThis;globalThis.Orbit={};load('orbit360-platform/core/m4-data-reconciliation-contract-p0.js');
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
    const db=getFirestore(app),legacy=db.collection('tenantId').doc(TENANT_ID),tenant=db.collection('tenants').doc(TENANT_ID);
    const [sourceClients,targetClients,sourceInsurers,targetInsurers]=await Promise.all([
      legacy.collection('clientes').get(),
      tenant.collection('data').doc('clientes').collection('items').get(),
      legacy.collection('aseguradoras').get(),
      tenant.collection('data').doc('aseguradoras').collection('items').get()
    ]);
    const sourceRows=sourceClients.docs.map(d=>plain(d.data()||{}));
    const missing=sourceRows.filter(r=>!currency(r));
    let resolvedGTQ=0,resolvedCOP=0,unresolved=0;const unresolvedCountries={};
    missing.forEach(row=>{const c=country(row);if(c==='GT')resolvedGTQ++;else if(c==='CO')resolvedCOP++;else{unresolved++;unresolvedCountries[c||'REQUIERE_VALIDACION']=(unresolvedCountries[c||'REQUIERE_VALIDACION']||0)+1;}});
    const clientOnly=classifyTargetOnly(sourceClients,targetClients,'clientes'),insurerOnly=classifyTargetOnly(sourceInsurers,targetInsurers,'aseguradoras'),items=clientOnly.concat(insurerOnly);
    const recommendations={conservar:0,actualizar_rekey:0,retirar_candidato:0,requiere_validacion:0};items.forEach(i=>recommendations[i.recommendation]++);
    const payload={...base,remoteReadConfirmed:true,sourceCounts:{clientes:sourceClients.size,aseguradoras:sourceInsurers.size},targetCounts:{clientes:targetClients.size,aseguradoras:targetInsurers.size},currencyResolution:{missingCurrency:missing.length,resolvedGTQ,resolvedCOP,unresolved,unresolvedCountries,countryCurrencyMap:{GT:'GTQ',CO:'COP'},proposalDigest:hash({resolvedGTQ,resolvedCOP,unresolved,unresolvedCountries})},schemaAudit:schemaAudit(missing),targetOnlyResolution:{total:items.length,clientTotal:clientOnly.length,insurerTotal:insurerOnly.length,recommendations,items,digest:hash(items)},secretValueCount:0};
    const checked=globalThis.Orbit.m4DataReconciliationP0.build(payload);
    const finalPayload={...payload,...checked,ok:checked.ok,status:checked.status,classification:checked.ok?null:'DATA_CONTRACT_FAILURE',containsPII:false,containsSecrets:false};
    write(finalPayload);
    if(!checked.ok)process.exitCode=41;
  }catch(error){
    const msg=text(error&&error.message||error),classification=msg.startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE';
    write({...base,ok:false,status:classification,classification,error:msg.replace(/[A-Za-z0-9_-]{20,}/g,'[redacted]').slice(0,240),remoteReadConfirmed:false,containsPII:false,containsSecrets:false});
    process.exitCode=41;
  }finally{if(app)await deleteApp(app).catch(()=>{});}
}
await main();
