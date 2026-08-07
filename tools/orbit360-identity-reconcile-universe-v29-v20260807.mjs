#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { adjudicateInsurersV26 } from './orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs';

export const GATE_ID='block1-client360-insurers-lab-v20260717';
export const CONTRACT_VERSION='1.0.41';
export const GENERATION='v29-identity-reconciliation-universe-readonly';
export const EXPECTED=Object.freeze({clientes:414,aseguradoras:26,asesores:7});
export const SOURCE_CONTRACT=Object.freeze({sourceRows:440,writeCandidates:414,requiresValidation:26,exactDuplicateRecords:16,probableDuplicateRecords:10,exactDuplicateCriterion:'IDENTIDAD_NORMALIZADA_IGUAL'});
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const ROOT=process.cwd();
const V28='orbit360-platform/runtime-gate-crm-v20260716/v28-block1-final-sanitized-v20260807.json';
const EVIDENCE=process.env.ORBIT360_V29_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v29-block1-identity-reconciliation-universe-sanitized-v20260807.json';
const BASELINE_BATCH='ays_clients_insurers_20260714';
const SEED='orbit360-platform/data/seed.js';
const AUDIT_REGISTRY='orbit360-platform/config/client-creation-audit-registry.json';
const CLIENT_IDENTITY_FIELDS=['_migration','migration','batchTemplate','tipoPersona','tipo','pais','country','identificacion','identificacionNormalizada','numeroDocumento','dpi','nit','rut','documento','cedula','cedulaJuridica','taxId','nombreCompleto','nombre','nombres','apellidos','apellidoPaterno','apellidoMaterno','razonSocial'];
const INSURER_FIELDS=['tenantId','tenant','pais','country','moneda','currency','nit','identificacionFiscal','taxId','codigoIntermediario','codigo','tipoEntidad','tipoPersona','entityType','organizationType','sourceType','source','batchTemplate','importBatchId','batchId','_migration','migration','estado','status','active','activo','vinculada'];
const DOCUMENT_FIELDS=['identificacionNormalizada','numeroDocumento','identificacion','dpi','nit','rut','documento','cedula','cedulaJuridica','taxId'];
const ALLOWED_AUDIT_CLASSIFICATIONS=new Set(['ALTA_LEGITIMA_POSTERIOR','ADMINISTRATIVO','RESIDUAL_PROTOTIPO','DUPLICADO','HISTORICO']);

const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
export const fingerprint=id=>crypto.createHash('sha256').update(`clientes:${id}`,'utf8').digest('hex').slice(0,20);
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
function migration(row){return row?._migration||row?.migration||{};}
function baselineBatch(row){return text(row?.batchTemplate||migration(row)?.batchTemplate)===BASELINE_BATCH;}
function typeKey(row){const n=norm(row?.tipoPersona||row?.tipo);if(/jurid|empresa|legal/.test(n))return'juridica';if(/fisic|natural|persona/.test(n))return'natural';return'desconocida';}
function countryKey(row){return text(row?.pais||row?.country).toUpperCase()||'XX';}
function firstDoc(row){for(const f of DOCUMENT_FIELDS){const v=norm(row?.[f]);if(v&&v!=='sinfoliocliente'&&v!=='sindocumento')return v;}return'';}
function canonicalName(row){const legal=text(row?.razonSocial);if(legal)return legal;const full=text(row?.nombreCompleto||row?.nombre);if(full)return full;return [row?.nombres,row?.apellidos,row?.apellidoPaterno,row?.apellidoMaterno].map(text).filter(Boolean).join(' ');}
export function identityKeys(row){
 const keys=[];const doc=firstDoc(row);const name=norm(canonicalName(row));const type=typeKey(row);const country=countryKey(row);
 if(doc)keys.push({basis:'DOCUMENTO_FUERTE_EXACTO',key:`doc|${country}|${type}|${doc}`,generic:`doc|${doc}`});
 if(name)keys.push({basis:'IDENTIDAD_NORMALIZADA_SOURCE_CONTRACT',key:`name|${country}|${type}|${name}`,generic:`name|${type}|${name}`});
 return keys;
}
function safeDemoRowsFromObject(root){
 const rows=[];const seen=new Set();
 function walk(v,depth=0){if(depth>7||v==null)return;if(Array.isArray(v)){for(const x of v)walk(x,depth+1);return;}if(typeof v!=='object')return;if(seen.has(v))return;seen.add(v);
  const hasIdentity=DOCUMENT_FIELDS.some(f=>text(v?.[f]))||text(v?.nombreCompleto)||text(v?.nombre)||text(v?.nombres)||text(v?.razonSocial);
  if(hasIdentity)rows.push(v);
  for(const x of Object.values(v))walk(x,depth+1);
 }
 walk(root);return rows;
}
export function loadDemoIdentitySetFromSeed(seedPath=path.join(ROOT,SEED)){
 const src=fs.readFileSync(seedPath,'utf8').replace(/^\uFEFF/,'');
 const context={window:{},console:{log(){},warn(){},error(){}},Date,Math,JSON,setTimeout(){},clearTimeout(){}};context.window.window=context.window;context.Orbit={};context.window.Orbit=context.Orbit;
 let rows=[];
 try{vm.runInNewContext(src,context,{timeout:1500,filename:'seed.js'});rows=safeDemoRowsFromObject(context.Orbit).concat(safeDemoRowsFromObject(context.window.Orbit));}catch{}
 const set=new Set();for(const row of rows)for(const k of identityKeys(row))set.add(k.generic);
 if(set.size===0){
  const re=/(identificacionNormalizada|numeroDocumento|identificacion|dpi|nit|rut|documento|cedulaJuridica|cedula|taxId|nombreCompleto|razonSocial|nombre)\s*:\s*['"`]([^'"`]{2,180})['"`]/g;let m;
  while((m=re.exec(src))){const basis=/nombre|razon/i.test(m[1])?'name|desconocida|':'doc|';set.add(basis+norm(m[2]));}
 }
 return set;
}
function indexRows(rows){
 const index=new Map();for(const item of rows){for(const k of identityKeys(item.data||{})){if(!index.has(k.key))index.set(k.key,[]);index.get(k.key).push(item.id);}}
 return index;
}
function targetFingerprints(){const v=readJson(V28);const items=v?.targetProvenance?.items||[];const fps=items.map(x=>text(x.fingerprint)).filter(Boolean);if(new Set(fps).size!==16)throw new Error('V29_TARGET_SET_INVALID');return fps;}
function classifyOne(target,baselineIndex,demoSet){
 const keys=identityKeys(target.data||{});if(keys.length===0)return {fingerprint:fingerprint(target.id),classification:'ORIGEN_NO_DEMOSTRABLE',basis:'NO_MINIMUM_IDENTITY_KEY',contradiction:false};
 const docKey=keys.find(k=>k.basis==='DOCUMENTO_FUERTE_EXACTO');const nameKey=keys.find(k=>k.basis==='IDENTIDAD_NORMALIZADA_SOURCE_CONTRACT');
 if(docKey){const hits=baselineIndex.get(docKey.key)||[];if(hits.length===1)return {fingerprint:fingerprint(target.id),classification:'DUPLICADO',basis:'DOCUMENTO_FUERTE_EXACTO',contradiction:false};if(hits.length>1)return {fingerprint:fingerprint(target.id),classification:'CONTRADICCION_IDENTIDAD',basis:'DOCUMENTO_FUERTE_MULTIPLE_BASELINE',contradiction:true};}
 if(nameKey){const hits=baselineIndex.get(nameKey.key)||[];if(hits.length===1){
   if(docKey){const baselineDocKeys=identityKeys(target.baselineCandidateData||{}).filter(k=>k.basis==='DOCUMENTO_FUERTE_EXACTO');if(baselineDocKeys.length&&baselineDocKeys.every(k=>k.key!==docKey.key))return {fingerprint:fingerprint(target.id),classification:'CONTRADICCION_IDENTIDAD',basis:'NOMBRE_IGUAL_DOCUMENTO_FUERTE_DIFERENTE',contradiction:true};}
   return {fingerprint:fingerprint(target.id),classification:'DUPLICADO',basis:'IDENTIDAD_NORMALIZADA_SOURCE_CONTRACT',contradiction:false};
  }if(hits.length>1)return {fingerprint:fingerprint(target.id),classification:'CONTRADICCION_IDENTIDAD',basis:'IDENTIDAD_NORMALIZADA_MULTIPLE_BASELINE',contradiction:true};}
 const demo=keys.some(k=>demoSet.has(k.generic));if(demo)return {fingerprint:fingerprint(target.id),classification:'RESIDUAL_PROTOTIPO',basis:'IDENTIDAD_EXACTA_DEMO_SOURCE',contradiction:false};
 return {fingerprint:fingerprint(target.id),classification:'ORIGEN_NO_DEMOSTRABLE',basis:'NO_BASELINE_OR_DEMO_MATCH',contradiction:false};
}
export function reconcileIdentity(rows,targetFps,demoSet=new Set()){
 const targets=new Set(targetFps);const baseline=rows.filter(x=>baselineBatch(x.data||{}));const focal=rows.filter(x=>targets.has(fingerprint(x.id)));const nonbaseline=rows.filter(x=>!baselineBatch(x.data||{}));
 if(baseline.length!==414)throw new Error(`V29_BASELINE_COUNT_${baseline.length}`);if(focal.length!==16)throw new Error(`V29_FOCAL_COUNT_${focal.length}`);if(nonbaseline.length!==16)throw new Error(`V29_NONBASELINE_COUNT_${nonbaseline.length}`);
 const idx=indexRows(baseline);const byId=new Map(baseline.map(x=>[x.id,x.data||{}]));
 const items=focal.map(t=>{
  const ks=identityKeys(t.data||{});let candidateData=null;for(const k of ks){const hits=idx.get(k.key)||[];if(hits.length===1){candidateData=byId.get(hits[0])||null;break;}}
  return classifyOne({...t,baselineCandidateData:candidateData},idx,demoSet);
 });
 const unresolved=items.filter(x=>x.classification==='ORIGEN_NO_DEMOSTRABLE').length;const contradictions=items.filter(x=>x.contradiction).length;const counts=Object.fromEntries([...new Set(items.map(x=>x.classification))].sort().map(k=>[k,items.filter(x=>x.classification===k).length]));
 return {baselineCount:baseline.length,nonbaselineCount:nonbaseline.length,targetCount:focal.length,items,unresolved,contradictions,counts,fullyAdjudicated:unresolved===0&&contradictions===0};
}
function readAuditRegistry(){try{const p=path.join(ROOT,AUDIT_REGISTRY);if(!fs.existsSync(p))return null;const r=JSON.parse(fs.readFileSync(p,'utf8'));if(r?.enabled!==true||!text(r?.collectionPath)||!text(r?.entityIdField)||!text(r?.classificationField))return null;return r;}catch{return null;}}
async function applyExternalAuditIfAvailable(db,rows,reconciliation){
 const unresolvedFps=new Set(reconciliation.items.filter(x=>x.classification==='ORIGEN_NO_DEMOSTRABLE').map(x=>x.fingerprint));if(unresolvedFps.size===0)return {reconciliation,audit:{status:'NOT_NEEDED',queried:false,readOperations:0}};
 const registry=readAuditRegistry();if(!registry)return {reconciliation,audit:{status:'NOT_REGISTERED_IN_CANONICAL_SOURCE_CONTRACT',queried:false,readOperations:0}};
 const unresolvedRows=rows.filter(x=>unresolvedFps.has(fingerprint(x.id)));const ids=unresolvedRows.map(x=>x.id);const fields=[registry.entityIdField,registry.classificationField].concat(Array.isArray(registry.technicalFields)?registry.technicalFields:[]);
 const snap=await db.collection(registry.collectionPath).where(registry.entityIdField,'in',ids).select(...fields).get();const byId=new Map();for(const d of snap.docs){const data=d.data()||{};const id=text(data[registry.entityIdField]);const cls=text(data[registry.classificationField]).toUpperCase();if(id&&ALLOWED_AUDIT_CLASSIFICATIONS.has(cls)&&!byId.has(id))byId.set(id,cls);}
 const items=reconciliation.items.map(item=>{if(item.classification!=='ORIGEN_NO_DEMOSTRABLE')return item;const row=unresolvedRows.find(x=>fingerprint(x.id)===item.fingerprint);const cls=row?byId.get(row.id):null;return cls?{...item,classification:cls,basis:'EXTERNAL_REGISTERED_CREATION_AUDIT',contradiction:false}:item;});
 const unresolved=items.filter(x=>x.classification==='ORIGEN_NO_DEMOSTRABLE').length;const contradictions=items.filter(x=>x.contradiction).length;const counts=Object.fromEntries([...new Set(items.map(x=>x.classification))].sort().map(k=>[k,items.filter(x=>x.classification===k).length]));
 return {reconciliation:{...reconciliation,items,unresolved,contradictions,counts,fullyAdjudicated:unresolved===0&&contradictions===0},audit:{status:'REGISTERED_AUDIT_QUERIED',queried:true,readOperations:1,recordsMatched:items.filter(x=>x.basis==='EXTERNAL_REGISTERED_CREATION_AUDIT').length}};
}
export function adjudicateClientUniverse(rows,reconciliation){
 const targetByFp=new Map(reconciliation.items.map(x=>[x.fingerprint,x.classification]));let baseline=0,includedFocal=0,excludedFocal=0,unknownNonbaseline=0;const exclusion=new Set(['RESIDUAL_PROTOTIPO','DUPLICADO','HISTORICO','ADMINISTRATIVO']);const inclusion=new Set(['ALTA_LEGITIMA_POSTERIOR','MIGRACION_ANTERIOR']);
 for(const item of rows){if(baselineBatch(item.data||{})){baseline++;continue;}const c=targetByFp.get(fingerprint(item.id));if(exclusion.has(c))excludedFocal++;else if(inclusion.has(c))includedFocal++;else unknownNonbaseline++;}
 const effective=baseline+includedFocal;let classification='DATA_CONTRACT_FAILURE',basis='CLIENT_UNIVERSE_NOT_RECONCILED';if(baseline===414&&unknownNonbaseline===0&&effective===414){classification='PASS_DATA_CONTRACT';basis='414_BASELINE_PLUS_ONLY_OBJECTIVELY_EXCLUDED_FOCAL_ROWS';}else if(baseline===414&&unknownNonbaseline===0&&effective>414){classification='VALIDATOR_STALE';basis='OBJECTIVE_EFFECTIVE_CLIENTS_EXCEED_414_CONTRACT_NO_CONTRACT_CHANGE_AUTHORIZED';}
 return {raw:rows.length,baseline,includedFocal,excludedFocal,unknownNonbaseline,effective,classification,basis};
}
function canonicalRef(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyRef(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function projectedRows(query,fields){const snap=await query.select(...fields).get();return snap.docs.map(d=>({id:d.id,data:d.data()||{}}));}
export async function runReadOnly(db){
 const targetFps=targetFingerprints();const demoSet=loadDemoIdentitySetFromSeed();const clientRows=await projectedRows(canonicalRef(db,'clientes'),CLIENT_IDENTITY_FIELDS);let readOps=1;
 let reconciliation=reconcileIdentity(clientRows,targetFps,demoSet);const auditResult=await applyExternalAuditIfAvailable(db,clientRows,reconciliation);reconciliation=auditResult.reconciliation;readOps+=auditResult.audit.readOperations;
 const base={schemaVersion:'orbit360-block1-identity-reconciliation-universe-v29-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,authorizationGeneration:GENERATION,sourceIdentityContract:SOURCE_CONTRACT,clientProjection:{rawObserved:clientRows.length,baselineObserved:reconciliation.baselineCount,nonbaselineObserved:reconciliation.nonbaselineCount,targetObserved:reconciliation.targetCount,fieldsProjected:CLIENT_IDENTITY_FIELDS.length,rawIdentityOutput:false},targetIdentity:{count:reconciliation.items.length,unresolved:reconciliation.unresolved,contradictions:reconciliation.contradictions,fullyAdjudicated:reconciliation.fullyAdjudicated,classificationCounts:reconciliation.counts,items:reconciliation.items.map(x=>({fingerprint:x.fingerprint,classification:x.classification,basis:x.basis,contradiction:x.contradiction}))},demoReference:{source:'CURRENT_FICTITIOUS_SEED_IN_MEMORY',identityKeyCount:demoSet.size,rawIdentityOutput:false},externalAudit:auditResult.audit,firestoreReadOperations:readOps,firestoreWrites:0,authReads:0,authWrites:0,operationalWrites:0,reimport:false,hostingTouched:false,browserExecuted:false,productionTouched:false,containsPII:false,containsNames:false,containsEmails:false,containsDocuments:false,containsPhones:false,containsSecrets:false};
 if(!reconciliation.fullyAdjudicated){return {...base,status:'STOP_RETRY',decision:'STOP_RETRY',classification:'DATA_CONTRACT_FAILURE',checkpoint:'CLIENT_IDENTITY_RECONCILIATION',rootCause:reconciliation.contradictions?'CLIENT_IDENTITY_CONTRADICTION':'CLIENT_IDENTITY_UNRESOLVED_AND_EXTERNAL_AUDIT_UNAVAILABLE_OR_INSUFFICIENT',universeExecuted:false,visualAuthorizationEligible:false,ok:false};}
 const insurers=await projectedRows(canonicalRef(db,'aseguradoras'),INSURER_FIELDS);readOps++;const advisors=await legacyRef(db,'asesores').listDocuments();readOps++;
 const clientUniverse=adjudicateClientUniverse(clientRows,reconciliation);const insurerUniverse=adjudicateInsurersV26(insurers.map(x=>({id:x.id,data:x.data})),{tenant:TENANT,sourceCodeUniqueness:'not_assumed'});const observed={clientes:clientUniverse.effective,aseguradoras:insurerUniverse.effective,asesores:advisors.length};const pass=clientUniverse.classification==='PASS_DATA_CONTRACT'&&insurerUniverse.effective===26&&advisors.length===7;
 let classification='DATA_CONTRACT_FAILURE',rootCause='BLOCK1_UNIVERSE_CONTRACT_MISMATCH';if(clientUniverse.classification==='VALIDATOR_STALE'){classification='VALIDATOR_STALE';rootCause='CLIENT_CONTRACT_414_STALE_OBJECTIVE_EFFECTIVE_CLIENTS_EXCEED_CONTRACT';}if(pass){classification='PASS_DATA_CONTRACT';rootCause='BLOCK1_UNIVERSE_RECONCILED_414_26_7';}
 return {...base,firestoreReadOperations:readOps,status:pass?'PASS_BLOCK1_UNIVERSE_V29':'STOP_RETRY',decision:pass?'PASS_DATA_CONTRACT':'STOP_RETRY',classification,checkpoint:'UNIVERSE_ADJUDICATION',rootCause,universeExecuted:true,universe:{expected:EXPECTED,observed,clientes:clientUniverse,aseguradoras:{raw:insurerUniverse.raw,effective:insurerUniverse.effective,requiresValidation:insurerUniverse.requiresValidation,sourceCodeCollisions:insurerUniverse.sourceCodeCollisions,duplicatesExcluded:insurerUniverse.duplicatesExcluded},asesores:{count:advisors.length}},visualAuthorizationEligible:pass,ok:pass};
}
async function main(){
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;if(!credentialPath)throw new Error('ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');const serviceAccount=JSON.parse(fs.readFileSync(credentialPath,'utf8'));if(serviceAccount.project_id!==PROJECT)throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');const {default:admin}=await import('firebase-admin');if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});const out=await runReadOnly(admin.firestore());fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify({status:out.status,decision:out.decision,classification:out.classification,checkpoint:out.checkpoint,target:{unresolved:out.targetIdentity?.unresolved,contradictions:out.targetIdentity?.contradictions,counts:out.targetIdentity?.classificationCounts},audit:out.externalAudit,universe:out.universe?{observed:out.universe.observed}:null,firestoreReadOperations:out.firestoreReadOperations,writes:0,visualAuthorizationEligible:out.visualAuthorizationEligible,ok:out.ok}));process.exit(out.ok?0:42);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(e=>{const msg=String(e?.message||e);const classification=/CREDENTIAL|PROJECT_MISMATCH/.test(msg)?'ENVIRONMENT_FAILURE':'PIPELINE_MECHANISM_FAILURE';const out={schemaVersion:'orbit360-block1-identity-reconciliation-universe-v29-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,authorizationGeneration:GENERATION,status:'STOP_RETRY',decision:'STOP_RETRY',classification,checkpoint:'V29_RUNTIME_EXCEPTION',rootCause:msg.slice(0,240),firestoreWrites:0,authWrites:0,operationalWrites:0,reimport:false,hostingTouched:false,browserExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,visualAuthorizationEligible:false,ok:false};fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8');console.error(JSON.stringify({status:out.status,classification:out.classification,checkpoint:out.checkpoint,rootCause:out.rootCause,ok:false}));process.exit(42);});}
