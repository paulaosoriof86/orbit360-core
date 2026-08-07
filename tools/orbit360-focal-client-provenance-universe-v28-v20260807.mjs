#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { adjudicateInsurersV26 } from './orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs';

export const GATE_ID='block1-client360-insurers-lab-v20260717';
export const CONTRACT_VERSION='1.0.41';
export const GENERATION='v28-focal-provenance-universe-readonly';
export const EXPECTED=Object.freeze({clientes:414,aseguradoras:26,asesores:7});
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const ROOT=process.cwd();
const V25='orbit360-platform/runtime-gate-crm-v20260716/v25-block1-universe-differential-sanitized-v20260807.json';
const EVIDENCE=process.env.ORBIT360_V28_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v28-block1-focal-provenance-universe-sanitized-v20260807.json';
const BASELINE_BATCH='ays_clients_insurers_20260714';
const MANIFEST_DATE='2026-07-14';
const CLOSURE_DATE='2026-07-24';
const CLIENT_FIELDS=['_migration','migration','sourceType','source','batchTemplate','importBatchId','batchId','createdAt','creadoEn','fechaCreacion','importedAt','importadoEn','_createdAt','updatedAt','actualizadoEn','fechaActualizacion','modifiedAt','_updatedAt','estado','status','active','activo','requiereValidacion','requiresValidation','tenantId','tenant','pais','country','moneda','currency','auditReason','motivoCambio','changeReason','updatedBy','actualizadoPor','_audit','auditoria','trazabilidad','duplicateOf','mergedInto','isDuplicate','administrative','isAdministrative','recordType','tipoRegistro'];
const INSURER_FIELDS=['tenantId','tenant','pais','country','moneda','currency','nit','identificacionFiscal','taxId','codigoIntermediario','codigo','tipoEntidad','tipoPersona','entityType','organizationType','sourceType','source','batchTemplate','importBatchId','batchId','_migration','migration','estado','status','active','activo','vinculada'];
const INACTIVE=new Set(['inactive','inactivo','inactiva','disabled','deshabilitado','deshabilitada','archived','archivado','archivada','historico','historica','baja','cancelado','cancelada','cerrado','cerrada']);

const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
export const fingerprint=id=>crypto.createHash('sha256').update(`clientes:${id}`,'utf8').digest('hex').slice(0,20);
function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));}
function timestampIso(value){try{if(!value)return'';if(typeof value.toDate==='function')return value.toDate().toISOString();if(value instanceof Date)return value.toISOString();if(typeof value==='object'&&Number.isFinite(value.seconds))return new Date(value.seconds*1000).toISOString();const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():'';}catch{return'';}}
function firstIso(row,fields){for(const f of fields){const v=timestampIso(row?.[f]);if(v)return v;}return'';}
function migration(row){return row?._migration||row?.migration||{};}
function firstTechnical(row,fields){const m=migration(row);for(const f of fields){const v=text(row?.[f]??m?.[f]);if(v)return v;}return'';}
function status(row){return norm(row?.estado||row?.status);}
function markerText(row){const m=migration(row);return [row?.sourceType,row?.source,row?.batchTemplate,row?.importBatchId,row?.batchId,m?.sourceType,m?.source,m?.batchTemplate,m?.batchId,row?.recordType,row?.tipoRegistro].map(norm).filter(Boolean).join('|');}
function baselineBatch(row){return firstTechnical(row,['batchTemplate'])===BASELINE_BATCH;}
function objectiveSignals(row,snapshot){
 const batch=firstTechnical(row,['batchTemplate']); const batchId=firstTechnical(row,['batchId','importBatchId']); const source=firstTechnical(row,['source','sourceType']);
 const auditReason=firstTechnical(row,['auditReason','motivoCambio','changeReason'])||text(row?._audit?.reason||row?.auditoria?.motivo);
 const auditActor=firstTechnical(row,['updatedBy','actualizadoPor'])||text(row?._audit?.actor||row?.auditoria?.actor);
 const fieldCreated=firstIso(row,['createdAt','creadoEn','fechaCreacion','importedAt','importadoEn','_createdAt']);
 const fieldUpdated=firstIso(row,['updatedAt','actualizadoEn','fechaActualizacion','modifiedAt','_updatedAt']);
 const firestoreCreate=timestampIso(snapshot?.createTime); const firestoreUpdate=timestampIso(snapshot?.updateTime);
 const created=firestoreCreate||fieldCreated; const updated=firestoreUpdate||fieldUpdated;
 return {baselineBatch:batch===BASELINE_BATCH,distinctBatch:!!batch&&batch!==BASELINE_BATCH,hasBatchId:!!batchId,hasSourceMarker:!!source,hasAuditReason:!!auditReason,hasAuditActor:!!auditActor,createdKnown:!!created,createdAfterManifest:!!created&&created.slice(0,10)>MANIFEST_DATE,createdAfterClosure:!!created&&created.slice(0,10)>CLOSURE_DATE,createdOnOrBeforeClosure:!!created&&created.slice(0,10)<=CLOSURE_DATE,updatedAfterClosure:!!updated&&updated.slice(0,10)>CLOSURE_DATE,firestoreCreateTimeUsed:!!firestoreCreate,firestoreUpdateTimeUsed:!!firestoreUpdate};
}

export function locateTargetRefs(refs,targetFingerprints){
 const targets=new Set(targetFingerprints); const found=new Map();
 for(const ref of refs){const f=fingerprint(ref.id);if(!targets.has(f))continue;if(found.has(f))throw new Error('V28_DUPLICATE_FINGERPRINT_LOCATOR');found.set(f,ref);}
 const missing=[...targets].filter(f=>!found.has(f)); if(missing.length)throw new Error(`V28_TARGET_LOCATOR_MISSING_${missing.length}`);
 if(found.size!==16)throw new Error(`V28_TARGET_LOCATOR_COUNT_${found.size}`); return found;
}
export function classifyClientSnapshot(snapshot,fingerprintValue){
 const row=snapshot?.data?.()||snapshot?.data||{}; const signals=objectiveSignals(row,snapshot); const markers=markerText(row);
 if(signals.baselineBatch)return {fingerprint:fingerprintValue,classification:'CONTRADICCION_BASELINE',signals,contradiction:true};
 const duplicate=row?.isDuplicate===true||!!text(row?.duplicateOf)||!!text(row?.mergedInto);
 const historical=row?.active===false||row?.activo===false||INACTIVE.has(status(row));
 const residual=/(demoseed|seeddemo|prototype|prototipo|fixture|mock|smoke|testdata|datatest)/.test(markers);
 const administrative=row?.administrative===true||row?.isAdministrative===true||/(administrativerecord|registroadministrativo|systemconfigrecord|configurationrecord)/.test(markers);
 let classification='ORIGEN_NO_DEMOSTRABLE';
 if(duplicate)classification='DUPLICADO';
 else if(historical)classification='HISTORICO';
 else if(residual)classification='RESIDUAL_PROTOTIPO';
 else if(administrative)classification='ADMINISTRATIVO';
 else if(signals.createdAfterClosure&&(signals.distinctBatch||signals.hasBatchId||signals.hasSourceMarker||signals.hasAuditReason||signals.hasAuditActor))classification='ALTA_LEGITIMA_POSTERIOR';
 else if(signals.createdOnOrBeforeClosure&&(signals.distinctBatch||signals.hasBatchId||signals.hasSourceMarker))classification='MIGRACION_ANTERIOR';
 return {fingerprint:fingerprintValue,classification,signals,contradiction:false};
}
export function adjudicateTargetSnapshots(targetMap,snapshots){
 const byId=new Map(snapshots.map(s=>[s.id,s])); const items=[];
 for(const [fp,ref] of targetMap){const snap=byId.get(ref.id);if(!snap||snap.exists===false)throw new Error('V28_TARGET_DOCUMENT_NOT_FOUND');items.push(classifyClientSnapshot(snap,fp));}
 const unresolved=items.filter(x=>x.classification==='ORIGEN_NO_DEMOSTRABLE').length; const contradictions=items.filter(x=>x.contradiction).length;
 const counts=Object.fromEntries([...new Set(items.map(x=>x.classification))].sort().map(k=>[k,items.filter(x=>x.classification===k).length]));
 return {items,unresolved,contradictions,counts,fullyAdjudicated:unresolved===0&&contradictions===0};
}
export function adjudicateClientUniverse(rows,targetAdjudication){
 const targetByFp=new Map(targetAdjudication.items.map(x=>[x.fingerprint,x.classification])); let baseline=0,unknownNonbaseline=0,includedFocal=0,excludedFocal=0;
 const exclusion=new Set(['RESIDUAL_PROTOTIPO','DUPLICADO','HISTORICO','ADMINISTRATIVO']); const inclusion=new Set(['ALTA_LEGITIMA_POSTERIOR','MIGRACION_ANTERIOR']);
 for(const item of rows){const row=item.data||{};if(baselineBatch(row)){baseline++;continue;}const f=fingerprint(item.id);const c=targetByFp.get(f);if(!c){unknownNonbaseline++;continue;}if(exclusion.has(c))excludedFocal++;else if(inclusion.has(c))includedFocal++;else unknownNonbaseline++;}
 const effective=baseline+includedFocal; let classification='DATA_CONTRACT_FAILURE'; let basis='CLIENT_UNIVERSE_NOT_RECONCILED';
 if(baseline===414&&unknownNonbaseline===0&&effective===414){classification='PASS_DATA_CONTRACT';basis='414_BASELINE_PLUS_ONLY_OBJECTIVELY_EXCLUDED_FOCAL_ROWS';}
 else if(baseline===414&&unknownNonbaseline===0&&effective>414){classification='VALIDATOR_STALE';basis='OBJECTIVE_EFFECTIVE_CLIENTS_EXCEED_414_CONTRACT_NO_CONTRACT_CHANGE_AUTHORIZED';}
 return {raw:rows.length,baseline,includedFocal,excludedFocal,unknownNonbaseline,effective,classification,basis};
}
function canonicalRef(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyRef(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function projectedRows(query,fields){const snap=await query.select(...fields).get();return snap.docs.map(d=>({id:d.id,data:d.data()||{}}));}
export async function runReadOnly(db){
 const targets=(readJson(V25)?.differential?.clientes||[]).map(x=>String(x.fingerprint||'')).filter(Boolean); if(new Set(targets).size!==16)throw new Error('V28_TARGET_SET_INVALID');
 const clientRef=canonicalRef(db,'clientes');
 const refs=await clientRef.listDocuments(); const targetMap=locateTargetRefs(refs,targets);
 const targetSnapshots=await db.getAll(...[...targetMap.values()],{fieldMask:CLIENT_FIELDS});
 const target=adjudicateTargetSnapshots(targetMap,targetSnapshots);
 const base={schemaVersion:'orbit360-block1-focal-provenance-universe-v28-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,authorizationGeneration:GENERATION,locatorPass:{mode:'DOCUMENT_REFERENCES_ID_ONLY_HASH_IN_MEMORY',referencesObserved:refs.length,targetMatches:targetMap.size,nonMatchesDiscarded:refs.length-targetMap.size},targetProvenance:{count:target.items.length,unresolved:target.unresolved,contradictions:target.contradictions,fullyAdjudicated:target.fullyAdjudicated,classificationCounts:target.counts,items:target.items.map(x=>({fingerprint:x.fingerprint,classification:x.classification,signals:x.signals,contradiction:x.contradiction}))},firestoreReadOperations:2,firestoreWrites:0,authReads:0,authWrites:0,operationalWrites:0,hostingTouched:false,browserExecuted:false,reimport:false,productionTouched:false,containsPII:false,containsNames:false,containsEmails:false,containsDocuments:false,containsSecrets:false};
 if(!target.fullyAdjudicated)return {...base,status:'STOP_RETRY',decision:'STOP_RETRY',classification:'DATA_CONTRACT_FAILURE',checkpoint:'CLIENT_PROVENANCE_FOCAL_ADJUDICATION',rootCause:target.contradictions?'CLIENT_BASELINE_CONTRADICTION_AFTER_FOCAL_READ':'CLIENT_PROVENANCE_NOT_DEMONSTRABLE_AFTER_AUTHORIZED_FOCAL_READ',universeExecuted:false,visualAuthorizationEligible:false,ok:false};
 const clients=await projectedRows(clientRef,CLIENT_FIELDS);
 const insurers=await projectedRows(canonicalRef(db,'aseguradoras'),INSURER_FIELDS);
 const advisors=await legacyRef(db,'asesores').listDocuments();
 const clientUniverse=adjudicateClientUniverse(clients,target); const insurerUniverse=adjudicateInsurersV26(insurers.map(x=>({id:x.id,data:x.data})),{tenant:TENANT,sourceCodeUniqueness:'not_assumed'});
 const observed={clientes:clientUniverse.effective,aseguradoras:insurerUniverse.effective,asesores:advisors.length};
 const pass=clientUniverse.classification==='PASS_DATA_CONTRACT'&&insurerUniverse.effective===26&&advisors.length===7;
 let classification='DATA_CONTRACT_FAILURE',rootCause='BLOCK1_UNIVERSE_CONTRACT_MISMATCH';
 if(clientUniverse.classification==='VALIDATOR_STALE'){classification='VALIDATOR_STALE';rootCause='CLIENT_CONTRACT_414_STALE_IF_OBJECTIVE_POST_BASELINE_CLIENTS_ARE_EFFECTIVE';}
 if(pass){classification='PASS_DATA_CONTRACT';rootCause='BLOCK1_UNIVERSE_RECONCILED_414_26_7';}
 return {...base,firestoreReadOperations:5,status:pass?'PASS_BLOCK1_UNIVERSE_V28':'STOP_RETRY',decision:pass?'PASS_DATA_CONTRACT':'STOP_RETRY',classification,checkpoint:'UNIVERSE_ADJUDICATION',rootCause,universeExecuted:true,universe:{expected:EXPECTED,observed,clientes:clientUniverse,aseguradoras:{raw:insurerUniverse.raw,effective:insurerUniverse.effective,requiresValidation:insurerUniverse.requiresValidation,sourceCodeCollisions:insurerUniverse.sourceCodeCollisions,duplicatesExcluded:insurerUniverse.duplicatesExcluded},asesores:{count:advisors.length}},visualAuthorizationEligible:pass,ok:pass};
}
async function main(){
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;if(!credentialPath)throw new Error('ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');const serviceAccount=JSON.parse(fs.readFileSync(credentialPath,'utf8'));if(serviceAccount.project_id!==PROJECT)throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
 const {default:admin}=await import('firebase-admin');if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});const out=await runReadOnly(admin.firestore());fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify({status:out.status,decision:out.decision,classification:out.classification,checkpoint:out.checkpoint,target:out.targetProvenance?{unresolved:out.targetProvenance.unresolved,contradictions:out.targetProvenance.contradictions,counts:out.targetProvenance.classificationCounts}:null,universe:out.universe?{observed:out.universe.observed}:null,firestoreReadOperations:out.firestoreReadOperations,writes:0,visualAuthorizationEligible:out.visualAuthorizationEligible,ok:out.ok}));process.exit(out.ok?0:42);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(e=>{const msg=String(e?.message||e);const classification=/CREDENTIAL|PROJECT_MISMATCH/.test(msg)?'ENVIRONMENT_FAILURE':'PIPELINE_MECHANISM_FAILURE';const out={schemaVersion:'orbit360-block1-focal-provenance-universe-v28-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,authorizationGeneration:GENERATION,status:'STOP_RETRY',decision:'STOP_RETRY',classification,checkpoint:'V28_RUNTIME_EXCEPTION',rootCause:msg.slice(0,220),firestoreWrites:0,authWrites:0,operationalWrites:0,hostingTouched:false,browserExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,visualAuthorizationEligible:false,ok:false};fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8');console.error(JSON.stringify({status:'STOP_RETRY',classification,checkpoint:'V28_RUNTIME_EXCEPTION',ok:false}));process.exit(42);});}
