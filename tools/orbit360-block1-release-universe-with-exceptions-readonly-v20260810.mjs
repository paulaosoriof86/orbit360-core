#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { adjudicateInsurersV26 } from './orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs';

const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const BASELINE_BATCH='ays_clients_insurers_20260714';
const V32='orbit360-platform/runtime-gate-crm-v20260716/v32-retained26-local-adjudication-sanitized-v20260807.json';
const IMPACT='orbit360-platform/runtime-gate-crm-v20260716/block1-controlled-provenance-exception-impact-sanitized-v20260810.json';
const EVIDENCE=process.env.ORBIT360_RELEASE_UNIVERSE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/block1-release-universe-exception-sanitized-v20260810.json';
const INSURER_FIELDS=['tenantId','tenant','pais','country','moneda','currency','nit','identificacionFiscal','taxId','codigoIntermediario','codigo','tipoEntidad','tipoPersona','entityType','organizationType','sourceType','source','batchTemplate','importBatchId','batchId','_migration','migration','estado','status','active','activo','vinculada'];
const CLIENT_FIELDS=['_migration','migration','batchTemplate','tenantId','tenant'];
const text=v=>String(v==null?'':v).trim();
const readJson=rel=>JSON.parse(fs.readFileSync(path.resolve(rel),'utf8').replace(/^\uFEFF/,''));
export const fingerprint=id=>crypto.createHash('sha256').update(`clientes:${id}`,'utf8').digest('hex').slice(0,20);
function migration(row){return row?._migration||row?.migration||{};}
function baselineBatch(row){return text(row?.batchTemplate||migration(row)?.batchTemplate)===BASELINE_BATCH;}
function canonicalRef(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyRef(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
function writeEvidence(out){const p=path.resolve(EVIDENCE);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');}
function base(){return {schemaVersion:'orbit360-block1-release-universe-exception-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,operation:'BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS_READONLY',baselineContract:{clientes:414,aseguradoras:26,asesores:7},baselineContractChanged:false,provenanceReAdjudicated:false,clientDocumentsMutated:false,insurerDocumentsMutated:false,advisorDocumentsMutated:false,firestoreWrites:0,authReads:0,authWrites:0,loggingReads:0,iamReads:0,operationalWrites:0,reimport:false,hostingTouched:false,browserExecuted:false,deployExecuted:false,productionTouched:false,documentIdsPersisted:false,containsPII:false,containsSecrets:false};}
export function adjudicateClientRelease(items,v32){
  const expectedItems=v32?.reconciliation?.items||[];
  const expectedNonBaseline=new Set(expectedItems.map(x=>String(x.fingerprint||'')).filter(Boolean));
  if(expectedNonBaseline.size!==16)throw new Error('V32_EXPECTED_NONBASELINE_SET_INVALID');
  const baseline=items.filter(x=>baselineBatch(x.data)).length;
  const nonbaseline=items.filter(x=>!baselineBatch(x.data));
  const actualSet=new Set(nonbaseline.map(x=>x.fingerprint));
  if(actualSet.size!==16||[...expectedNonBaseline].some(fp=>!actualSet.has(fp))||[...actualSet].some(fp=>!expectedNonBaseline.has(fp)))throw new Error('CLIENT_NONBASELINE_SET_DRIFT');
  const retainedDeferred=expectedItems.filter(x=>x.classification==='REQUIERE_VALIDACION_RETENIDO_EXACTO'||x.classification==='REQUIERE_VALIDACION_RETENIDO_PROBABLE').length;
  const exceptions=expectedItems.filter(x=>x.classification==='ORIGEN_NO_DEMOSTRABLE').map(x=>x.fingerprint).sort();
  return {raw:items.length,baseline,nonbaseline:nonbaseline.length,retainedDeferred,controlledExceptions:exceptions.length,controlledExceptionFingerprints:exceptions,releaseBaseline:baseline};
}
export function runSourceFixture(){
  const v32=readJson(V32),impact=readJson(IMPACT);
  const extra=v32.reconciliation.items.map(x=>({fingerprint:x.fingerprint,data:{tenantId:TENANT}}));
  const baseline=Array.from({length:414},(_,i)=>({fingerprint:`base-${i}`,data:{tenantId:TENANT,_migration:{batchTemplate:BASELINE_BATCH}}}));
  const clients=adjudicateClientRelease([...baseline,...extra],v32);
  const insurerRows=[...Array.from({length:26},(_,i)=>({id:`ins-${i}`,data:{tenantId:TENANT,pais:'GT',nit:`NIT-${i}`,codigo:`C-${i}`,active:true,vinculada:true}})),{id:'x1',data:{tenantId:TENANT,pais:'GT',nit:'X1',codigo:'X1',active:false,vinculada:true}},{id:'x2',data:{tenantId:'other',pais:'GT',nit:'X2',codigo:'X2',active:true,vinculada:true}},{id:'x3',data:{tenantId:TENANT,pais:'US',nit:'X3',codigo:'X3',active:true,vinculada:true}},{id:'x4',data:{tenantId:TENANT,pais:'GT',nit:'X4',codigo:'X4',active:true,vinculada:false}}];
  const insurers=adjudicateInsurersV26(insurerRows,{tenant:TENANT,sourceCodeUniqueness:'not_assumed'});
  const pass=clients.raw===430&&clients.baseline===414&&clients.nonbaseline===16&&clients.retainedDeferred===14&&clients.controlledExceptions===2&&insurers.raw===30&&insurers.effective===26&&impact.releaseEligible===true;
  if(!pass)throw new Error('SOURCE_FIXTURE_RELEASE_UNIVERSE_MISMATCH');
  return {...base(),decision:'SOURCE_ONLY_RUNTIME_READY',classification:'PASS_SOURCE_FIXTURE',networkAccess:false,secretAccess:false,firestoreReadOperations:0,observed:{clientes:clients,aseguradoras:{raw:insurers.raw,effective:insurers.effective},asesores:{count:7}},releaseEligible:false,ok:true};
}
export async function runReadOnly(db){
  const v32=readJson(V32),impact=readJson(IMPACT);
  if(impact.decision!=='CONTROLLED_EXCEPTION_IMPACT_PASS'||impact.releaseEligible!==true||impact.targetsLocated!==2||impact.ok!==true)throw new Error('CONTROLLED_EXCEPTION_IMPACT_NOT_PASS');
  let logicalReads=0;
  const clientSnap=await canonicalRef(db,'clientes').select(...CLIENT_FIELDS).get();logicalReads++;
  const clientItems=clientSnap.docs.map(d=>({fingerprint:fingerprint(d.id),data:d.data()||{}}));
  const clients=adjudicateClientRelease(clientItems,v32);
  const insurerSnap=await canonicalRef(db,'aseguradoras').select(...INSURER_FIELDS).get();logicalReads++;
  const insurerRows=insurerSnap.docs.map(d=>({id:d.id,data:d.data()||{}}));
  const insurers=adjudicateInsurersV26(insurerRows,{tenant:TENANT,sourceCodeUniqueness:'not_assumed'});
  const advisorRefs=await legacyRef(db,'asesores').listDocuments();logicalReads++;
  const advisors=advisorRefs.length;
  if(logicalReads!==3)throw new Error(`LOGICAL_READ_BUDGET_${logicalReads}`);
  const pass=clients.raw===430&&clients.baseline===414&&clients.nonbaseline===16&&clients.retainedDeferred===14&&clients.controlledExceptions===2&&insurers.raw===30&&insurers.effective===26&&advisors===7;
  if(!pass)throw new Error(`RELEASE_UNIVERSE_DRIFT_C${clients.raw}_${clients.baseline}_${clients.nonbaseline}_I${insurers.raw}_${insurers.effective}_A${advisors}`);
  return {...base(),decision:'RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS',classification:'PASS_BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS',firestoreReadOperations:logicalReads,observed:{clientes:{raw:clients.raw,baselineContract:clients.releaseBaseline,retained26Deferred:clients.retainedDeferred,controlledProvenanceExceptions:clients.controlledExceptions,nonbaselineTotal:clients.nonbaseline},aseguradoras:{raw:insurers.raw,effective:insurers.effective,requiresValidation:insurers.requiresValidation,sourceCodeCollisions:insurers.sourceCodeCollisions,duplicatesExcluded:insurers.duplicatesExcluded},asesores:{count:advisors}},impactPrerequisite:{decision:impact.decision,releaseEligible:impact.releaseEligible,targetCount:impact.targetsLocated},releaseEligible:true,visualEligible:true,ok:true};
}
async function main(){
  if(process.env.ORBIT360_SOURCE_ONLY==='1'){const out=runSourceFixture();writeEvidence(out);console.log(JSON.stringify({decision:out.decision,observed:out.observed,firestoreReadOperations:0,writes:0,ok:true}));return;}
  const cred=process.env.GOOGLE_APPLICATION_CREDENTIALS||'';if(!cred)throw new Error('SERVICE_ACCOUNT_CREDENTIAL_PATH_MISSING');
  const svc=JSON.parse(fs.readFileSync(cred,'utf8'));if(svc.project_id!==PROJECT)throw new Error('PROJECT_ID_MISMATCH');
  const {default:admin}=await import('firebase-admin');if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(svc),projectId:PROJECT});
  const out=await runReadOnly(admin.firestore());writeEvidence(out);console.log(JSON.stringify({decision:out.decision,observed:out.observed,firestoreReadOperations:out.firestoreReadOperations,writes:0,visualEligible:out.visualEligible,ok:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const msg=String(e?.message||e);const out={...base(),decision:'STOP_RETRY',classification:/CREDENTIAL|PROJECT_ID/.test(msg)?'ENVIRONMENT_FAILURE':/DRIFT|MISMATCH|SET_/.test(msg)?'DATA_CONTRACT_FAILURE':'PIPELINE_MECHANISM_FAILURE',checkpoint:'BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS_READONLY',rootCause:msg.slice(0,220),firestoreReadOperations:0,observed:null,releaseEligible:false,visualEligible:false,ok:false};writeEvidence(out);console.error(JSON.stringify({decision:out.decision,classification:out.classification,rootCause:out.rootCause,ok:false}));process.exit(42);});
