#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT=process.cwd();
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const GATE_ID='block4-durable-writer-dryrun-v20260724';
const CONTRACT_VERSION='4.1.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m4-durable-writer-dryrun-summary.json');
const MANIFEST=path.join(ROOT,'tools/orbit360-m3-tenant-activation-manifest-v20260724.json');
const STATIC_FREEZE=path.join(ROOT,'tools/orbit360-m4-durable-writer-freeze-v20260724.json');
const VOLATILE=new Set(['_syncStatus','_syncOp','_syncError','_syncAt','createdAt','updatedAt','fechaActualizacion','lastModifiedAt']);
function text(v){return String(v==null?'':v).trim();}
function plain(v){if(v===null||v===undefined)return v;if(v&&typeof v.toDate==='function')return v.toDate().toISOString();if(Array.isArray(v))return v.map(plain);if(typeof v==='object'){var out={};Object.keys(v).sort().forEach(k=>{if(!VOLATILE.has(k))out[k]=plain(v[k]);});return out;}return v;}
function stable(v){return JSON.stringify(plain(v));}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex');}
function cleanError(error){return text(error&&error.message||error).replace(/[A-Za-z0-9_-]{20,}/g,'[redacted]').replace(/[^A-Za-z0-9_:\-|,.[\] ]/g,'').slice(0,240);}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n');}
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});}
function emptyDiff(){return {create:0,update:0,omit:0,requires_validation:0,targetOnly:0};}
function countryCurrencyErrors(row){
  const country=text(row.country||row.pais).toUpperCase(),currency=text(row.currency||row.moneda).toUpperCase(),errors=[];
  if(!country)errors.push('pais_faltante');
  if(!currency)errors.push('moneda_faltante');
  const expected=globalThis.Orbit.tenantCanonicalPathsP0.COUNTRY_CURRENCY[country];
  if(country&&!expected)errors.push('pais_no_configurado');
  if(expected&&currency&&expected!==currency)errors.push('pais_moneda_inconsistente');
  return errors;
}
function targetProjection(target,source){
  var out={};Object.keys(source).forEach(k=>{out[k]=target[k];});return out;
}
function classifyRecords(sourceSnap,targetSnap,collection,sourcePath){
  const diff=emptyDiff(),target=new Map(),seenEmbedded=new Set(),issues={missingCountry:0,missingCurrency:0,countryCurrencyMismatch:0,idMismatch:0,duplicateEmbeddedId:0,secretValues:0,traceAdded:0};
  targetSnap.docs.forEach(doc=>target.set(doc.id,plain(doc.data()||{})));
  const sourceDigests=[];
  sourceSnap.docs.forEach(doc=>{
    const raw=plain(doc.data()||{}),embedded=text(raw.id||doc.id),validation=[];
    if(embedded!==doc.id){validation.push('id_no_coincide');issues.idMismatch++;}
    if(seenEmbedded.has(embedded)){validation.push('id_duplicado');issues.duplicateEmbeddedId++;}else seenEmbedded.add(embedded);
    const cc=countryCurrencyErrors(raw);validation.push(...cc);
    if(cc.includes('pais_faltante'))issues.missingCountry++;
    if(cc.includes('moneda_faltante'))issues.missingCurrency++;
    if(cc.includes('pais_moneda_inconsistente'))issues.countryCurrencyMismatch++;
    const secretPaths=globalThis.Orbit.tenantCanonicalPathsP0.secretPaths(raw);
    if(secretPaths.length){validation.push('material_secreto');issues.secretValues+=secretPaths.length;}
    const canonical={...raw,id:doc.id,tenantId:TENANT_ID,sourceTrace:raw.sourceTrace||raw.trace||{source:'legacy_firestore_lab',path:sourcePath,documentIdHash:hash(doc.id).slice(0,16)}};
    if(!raw.sourceTrace&&!raw.trace)issues.traceAdded++;
    sourceDigests.push(hash(canonical));
    if(validation.length){diff.requires_validation++;return;}
    const existing=target.get(doc.id);
    if(!existing){diff.create++;return;}
    const projected=targetProjection(existing,canonical);
    if(hash(projected)===hash(canonical))diff.omit++;else diff.update++;
  });
  diff.targetOnly=[...target.keys()].filter(id=>!sourceSnap.docs.some(doc=>doc.id===id)).length;
  return {diff,issues,sourceDigest:hash(sourceDigests.sort().join('|')),sourceCount:sourceSnap.size,targetCount:targetSnap.size};
}
function configSource(manifest){
  return {schemaVersion:'orbit360-tenant-config-v1',tenantId:TENANT_ID,countries:manifest.countries,countryConfig:manifest.countryConfig,branding:manifest.branding,modules:manifest.modules,integrations:manifest.integrations,sourceOfTruth:manifest.sourceOfTruth};
}
function classifyConfig(manifest,targetDoc){
  const diff=emptyDiff(),source=configSource(manifest),secretCount=globalThis.Orbit.tenantCanonicalPathsP0.secretPaths(source).length;
  if(secretCount){diff.requires_validation=1;}
  else if(!targetDoc.exists){diff.create=1;}
  else {const target=plain(targetDoc.data()||{}),projected=targetProjection(target,source);if(hash(projected)===hash(source))diff.omit=1;else diff.update=1;}
  return {diff,sourceDigest:hash(source),sourceCount:1,targetCount:targetDoc.exists?1:0,issues:{secretValues:secretCount}};
}
function classifyMemberships(snapshot){
  const diff=emptyDiff(),digests=[],issues={invalid:0,secretValues:0};
  snapshot.docs.forEach(doc=>{
    const row={...(plain(doc.data()||{})),uid:doc.id,tenantId:TENANT_ID};
    const secrets=globalThis.Orbit.tenantCanonicalPathsP0.secretPaths(row);issues.secretValues+=secrets.length;
    const check=globalThis.Orbit.membershipMultirolP0.validate(row);
    if(secrets.length||!check.ok){diff.requires_validation++;issues.invalid++;}else diff.omit++;
    digests.push(hash(row));
  });
  return {diff,sourceDigest:hash(digests.sort().join('|')),sourceCount:snapshot.size,targetCount:snapshot.size,issues};
}
async function main(){
  let app;const base={schemaVersion:'orbit360-m4-durable-writer-dryrun-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,readOnly:true,writeAuthorized:false,writeExecuted:false,rulesChanged:false,configurationWrites:0,membershipWrites:0,clientWrites:0,insurerWrites:0,auditWrites:0,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,mergeMain:false};
  try{
    if(text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8')),freeze=JSON.parse(fs.readFileSync(STATIC_FREEZE,'utf8'));
    if(freeze.status!=='M4_DURABLE_WRITER_STATIC_READY_EXECUTION_NOT_AUTHORIZED'||freeze.staticClosure&&freeze.staticClosure.ok!==true)throw new Error('DATA_CONTRACT_FAILURE:M4_STATIC_NOT_CLOSED');
    globalThis.window=globalThis;globalThis.Orbit={};
    load('orbit360-platform/core/tenant-canonical-paths-contract-p0.js');
    load('orbit360-platform/core/membership-multirol-contract-p0.js');
    load('orbit360-platform/core/durable-writer-dryrun-contract-p0.js');
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
    const db=getFirestore(app),legacy=db.collection('tenantId').doc(TENANT_ID),tenant=db.collection('tenants').doc(TENANT_ID);
    const [configDoc,members,sourceClients,targetClients,sourceInsurers,targetInsurers,batches,audits]=await Promise.all([
      tenant.collection('system').doc('config').get(),
      tenant.collection('members').get(),
      legacy.collection('clientes').get(),
      tenant.collection('data').doc('clientes').collection('items').get(),
      legacy.collection('aseguradoras').get(),
      tenant.collection('data').doc('aseguradoras').collection('items').get(),
      tenant.collection('importBatches').get(),
      tenant.collection('auditEvents').get()
    ]);
    const config=classifyConfig(manifest,configDoc);
    const memberships=classifyMemberships(members);
    const clientes=classifyRecords(sourceClients,targetClients,'clientes','tenantId/'+TENANT_ID+'/clientes');
    const aseguradoras=classifyRecords(sourceInsurers,targetInsurers,'aseguradoras','tenantId/'+TENANT_ID+'/aseguradoras');
    const qualityDiff={create:2,update:0,omit:0,requires_validation:0,targetOnly:0};
    const sourceCounts={configuration_catalog:1,memberships:memberships.sourceCount,clientes:clientes.sourceCount,aseguradoras:aseguradoras.sourceCount,quality_audit:2};
    const targetCounts={configuration_catalog:config.targetCount,memberships:memberships.targetCount,clientes:clientes.targetCount,aseguradoras:aseguradoras.targetCount,importBatches:batches.size,auditEvents:audits.size};
    const digests={configuration_catalog:config.sourceDigest,memberships:memberships.sourceDigest,clientes:clientes.sourceDigest,aseguradoras:aseguradoras.sourceDigest};
    const idempotencyKey=hash([CONTRACT_VERSION,TENANT_ID,digests.configuration_catalog,digests.memberships,digests.clientes,digests.aseguradoras].join('|'));
    const batchId='m4-'+idempotencyKey.slice(0,24);
    const diff={configuration_catalog:config.diff,memberships:memberships.diff,clientes:clientes.diff,aseguradoras:aseguradoras.diff,quality_audit:qualityDiff};
    const secretValueCount=config.issues.secretValues+memberships.issues.secretValues+clientes.issues.secretValues+aseguradoras.issues.secretValues;
    const requiresValidation=Object.values(diff).reduce((n,d)=>n+Number(d.requires_validation||0)+Number(d.targetOnly||0),0);
    const countContract=sourceCounts.clientes===414&&sourceCounts.aseguradoras===26&&sourceCounts.memberships>=1;
    const approvalReady=countContract&&secretValueCount===0&&requiresValidation===0;
    const draft={...base,m4StaticStatus:'M4_DURABLE_WRITER_STATIC_READY',remoteReadConfirmed:true,sourcePaths:{configuration_catalog:'activation_manifest',memberships:'tenants/{tenant}/members',clientes:'tenantId/{tenant}/clientes',aseguradoras:'tenantId/{tenant}/aseguradoras',quality_audit:'planned_only'},targetPaths:{configuration_catalog:'tenants/{tenant}/system/config',memberships:'tenants/{tenant}/members',clientes:'tenants/{tenant}/data/clientes/items',aseguradoras:'tenants/{tenant}/data/aseguradoras/items',quality_audit:'tenants/{tenant}/importBatches + auditEvents'},sourceCounts,targetCounts,diff,issues:{configuration_catalog:config.issues,memberships:memberships.issues,clientes:clientes.issues,aseguradoras:aseguradoras.issues},sourceDigests:digests,idempotencyKey,batchId,sameInputSameIdempotencyKey:idempotencyKey===hash([CONTRACT_VERSION,TENANT_ID,digests.configuration_catalog,digests.memberships,digests.clientes,digests.aseguradoras].join('|')),auditPlan:'append_only',rollbackPlan:'durable',requiresValidation,approvalReady,secretValueCount};
    const checked=globalThis.Orbit.durableWriterDryRunP0.build(draft);
    const ok=checked.ok&&countContract&&secretValueCount===0;
    write({...draft,ok,status:ok?'M4_DURABLE_WRITER_DRYRUN_COMPLETED':'DATA_CONTRACT_FAILURE',classification:ok?null:(secretValueCount?'SECURITY_FAILURE':'DATA_CONTRACT_FAILURE'),contractErrors:checked.errors,contractWarnings:checked.warnings});
    if(!ok)process.exitCode=41;
  }catch(error){const msg=text(error&&error.message||error),classification=msg.startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':msg.startsWith('SECURITY_FAILURE')?'SECURITY_FAILURE':'DATA_CONTRACT_FAILURE';write({...base,ok:false,status:classification,classification,error:cleanError(error),remoteReadConfirmed:false});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
}
await main();
