#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const ROOT=process.cwd();
const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block7-policies-dual-path-reconciliation-readonly-v20260801';
const VERSION='7.2.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-dual-path-reconciliation-readonly-v20260801.json');
const COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const LEGACY_EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5};
const text=v=>String(v==null?'':v).trim();
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const safeError=e=>text(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,600);
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function normalize(value){
  if(value===null||value===undefined)return value===undefined?'__undefined__':null;
  if(typeof value==='number'&&Number.isNaN(value))return'__NaN__';
  if(typeof value==='number'&&!Number.isFinite(value))return value>0?'__Infinity__':'__-Infinity__';
  if(typeof value!=='object')return value;
  if(typeof value.toDate==='function'){try{return{__timestamp:value.toDate().toISOString()};}catch{}}
  if(typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name))return{__reference:value.path};
  if(typeof value.latitude==='number'&&typeof value.longitude==='number')return{__geopoint:[value.latitude,value.longitude]};
  if(Buffer.isBuffer(value)||value instanceof Uint8Array)return{__bytes:Buffer.from(value).toString('base64')};
  if(Array.isArray(value))return value.map(normalize);
  const out={};for(const key of Object.keys(value).sort())out[key]=normalize(value[key]);return out;
}
function valueType(value){
  if(value===null)return'null';
  if(value===undefined)return'undefined';
  if(Array.isArray(value))return'array';
  if(value&&typeof value.toDate==='function')return'timestamp';
  if(value&&typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name))return'reference';
  if(value&&typeof value.latitude==='number'&&typeof value.longitude==='number')return'geopoint';
  if(Buffer.isBuffer(value)||value instanceof Uint8Array)return'bytes';
  return typeof value;
}
function stableDocument(id,data){return JSON.stringify({id,data:normalize(data)});}
function schema(rows){
  const fields={};
  for(const row of rows){for(const [key,value] of Object.entries(row.data||{})){const item=fields[key]||(fields[key]={present:0,types:{}});item.present++;const type=valueType(value);item.types[type]=(item.types[type]||0)+1;}}
  return fields;
}
function compareSchema(a,b){
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort(),as=new Set(ak),bs=new Set(bk);
  const onlyCanonical=ak.filter(k=>!bs.has(k));
  const onlyLegacy=bk.filter(k=>!as.has(k));
  const shared=ak.filter(k=>bs.has(k));
  const typeDifferences=shared.filter(k=>JSON.stringify(a[k].types)!==JSON.stringify(b[k].types));
  const presenceDifferences=shared.filter(k=>a[k].present!==b[k].present);
  return{canonicalFieldCount:ak.length,legacyFieldCount:bk.length,sharedFieldCount:shared.length,onlyCanonical,onlyLegacy,typeDifferences,presenceDifferences,canonicalSchemaDigest:sha(JSON.stringify(a)),legacySchemaDigest:sha(JSON.stringify(b))};
}
function snapshotRows(snapshot){return snapshot.docs.map(doc=>({id:doc.id,data:doc.data()}));}
function compareRows(canonicalRows,legacyRows){
  const cMap=new Map(canonicalRows.map(row=>[row.id,sha(stableDocument(row.id,row.data))]));
  const lMap=new Map(legacyRows.map(row=>[row.id,sha(stableDocument(row.id,row.data))]));
  const cIds=[...cMap.keys()].sort(),lIds=[...lMap.keys()].sort(),cSet=new Set(cIds),lSet=new Set(lIds);
  const shared=cIds.filter(id=>lSet.has(id));
  let equalContent=0,divergentContent=0;
  for(const id of shared){if(cMap.get(id)===lMap.get(id))equalContent++;else divergentContent++;}
  const onlyCanonical=cIds.filter(id=>!lSet.has(id)).length;
  const onlyLegacy=lIds.filter(id=>!cSet.has(id)).length;
  const canonicalContentDigest=sha(cIds.map(id=>`${id}:${cMap.get(id)}`).join('\n'));
  const legacyContentDigest=sha(lIds.map(id=>`${id}:${lMap.get(id)}`).join('\n'));
  return{
    canonicalCount:cIds.length,legacyCount:lIds.length,sharedIds:shared.length,equalContent,divergentContent,onlyCanonical,onlyLegacy,
    canonicalIdSetDigest:sha(cIds.join('\n')),legacyIdSetDigest:sha(lIds.join('\n')),canonicalContentDigest,legacyContentDigest,
    idSetsEqual:onlyCanonical===0&&onlyLegacy===0,contentEqual:onlyCanonical===0&&onlyLegacy===0&&divergentContent===0,
    schema:compareSchema(schema(canonicalRows),schema(legacyRows))
  };
}
function cumulativeManifest(){
  const roots=['orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'];
  const raw=execFileSync('git',['ls-files','--',...roots],{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).map(text).filter(Boolean).filter(file=>!file.includes('/runtime-gate-'));
  const rows=raw.sort().map(file=>({file,digest:sha(fs.readFileSync(path.join(ROOT,file)))}));
  const counts={index:0,modules:0,core:0,styles:0,data:0,other:0};
  for(const row of rows){if(row.file==='orbit360-platform/index.html')counts.index++;else if(row.file.startsWith('orbit360-platform/modules/'))counts.modules++;else if(row.file.startsWith('orbit360-platform/core/'))counts.core++;else if(row.file.startsWith('orbit360-platform/styles/'))counts.styles++;else if(row.file.startsWith('orbit360-platform/data/'))counts.data++;else counts.other++;}
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  return{sourceHead:head,requiredBranch:'ays/backend-tenant-lab-v99-20260703',roots,trackedFileCount:rows.length,rootCounts:counts,pathDigest:sha(rows.map(r=>r.file).join('\n')),contentDigest:sha(rows.map(r=>`${r.file}:${r.digest}`).join('\n')),indexDigest:rows.find(r=>r.file==='orbit360-platform/index.html')?.digest||'',noFragmentationContract:true,noReducedShell:true,noParallelShell:true,futureVisualCandidateMustUseSameHeadOrAuditedDescendant:true};
}
let app;
const result={schemaVersion:'orbit360-policies-dual-path-reconciliation-readonly-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'DATA_CONTRACT_RECONCILIATION',tenantId:TENANT,projectId:PROJECT,countryFilterApplied:false,authorityDeclared:false,authoritativePath:'',collections:{},summary:{},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:RECONCILIATION_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  const db=getFirestore(app);result.firestoreRead=true;
  let totalCanonical=0,totalLegacy=0,totalShared=0,totalEqual=0,totalDivergent=0,totalOnlyCanonical=0,totalOnlyLegacy=0;
  for(const collection of COLLECTIONS){
    const [canonicalSnap,legacySnap]=await Promise.all([
      db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get(),
      db.collection('tenantId').doc(TENANT).collection(collection).get()
    ]);
    const comparison=compareRows(snapshotRows(canonicalSnap),snapshotRows(legacySnap));
    comparison.legacyExpected=LEGACY_EXPECTED[collection];
    comparison.legacyBaselineMatches=comparison.legacyCount===LEGACY_EXPECTED[collection];
    result.collections[collection]=comparison;
    totalCanonical+=comparison.canonicalCount;totalLegacy+=comparison.legacyCount;totalShared+=comparison.sharedIds;totalEqual+=comparison.equalContent;totalDivergent+=comparison.divergentContent;totalOnlyCanonical+=comparison.onlyCanonical;totalOnlyLegacy+=comparison.onlyLegacy;
  }
  const legacyBaselineMatches=COLLECTIONS.every(name=>result.collections[name].legacyBaselineMatches===true);
  result.summary={collectionCount:COLLECTIONS.length,totalCanonical,totalLegacy,totalSharedIds:totalShared,totalEqualContent:totalEqual,totalDivergentContent:totalDivergent,totalOnlyCanonical,totalOnlyLegacy,legacyBaselineMatches,pathsEqual:COLLECTIONS.every(name=>result.collections[name].contentEqual===true),evidenceComplete:true};
  result.cumulativeVisualGuard=cumulativeManifest();
  result.status='POLICIES_DUAL_PATH_RECONCILIATION_READONLY_PASS';
  result.classification='GO_LAB_DUAL_PATH_RECONCILIATION_READONLY';
  result.ok=legacyBaselineMatches&&result.cumulativeVisualGuard.trackedFileCount>0&&result.cumulativeVisualGuard.rootCounts.index===1&&result.cumulativeVisualGuard.rootCounts.modules>0;
  if(!result.ok)throw new Error('DATA_CONTRACT_FAILURE:RECONCILIATION_EVIDENCE_INCOMPLETE');
}catch(error){
  result.status='POLICIES_DUAL_PATH_RECONCILIATION_READONLY_FAIL';
  result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';
  result.error=safeError(error);result.ok=false;
}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
