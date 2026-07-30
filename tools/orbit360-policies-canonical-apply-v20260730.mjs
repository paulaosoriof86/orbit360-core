#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import XLSX from 'xlsx';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const EXPECTED={clientsBefore:414,insurersBefore:26,advisorsBefore:7,policiesBefore:0,clientsCreate:16,insurersCreate:4,policiesCreate:1373,pendingPolicies:64,excluded:4,receipts:0,cartera:0,cobros:0};
const PHRASE='AUTORIZO ESCRITURA CONTROLADA POLIZAS AYS 20260730';
const mode=String(process.env.ORBIT360_POLICIES_MODE||'DRY_RUN').toUpperCase();
const xlsxPath=process.env.ORBIT360_POLICIES_XLSX||'';
const requestPath=process.env.ORBIT360_POLICIES_REQUEST||'';
const evidencePath=process.env.ORBIT360_POLICIES_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/policies-canonical-prewrite.json';
const expectedSha=process.env.ORBIT360_POLICIES_XLSX_SHA256||'';

function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function clean(v){return String(v==null?'':v).trim();}
function bool(v){return v===true||String(v).toLowerCase()==='true'||v===1||v==='1';}
function parseJson(v,fallback){if(v==null||v==='')return fallback;if(typeof v!=='string')return v;try{return JSON.parse(v);}catch{return fallback;}}
function sheetRows(wb,name){const sh=wb.Sheets[name];if(!sh)fail('DATA_CONTRACT_FAILURE','SHEET_MISSING_'+name);return XLSX.utils.sheet_to_json(sh,{defval:'',raw:true});}
function normalizeRows(rows){return rows.map(r=>{const o={...r};for(const k of ['alertasCalidad','sourceRefs','sourceTrace','motivosPendientes','motivosCalidad'])if(k in o)o[k]=parseJson(o[k],k==='sourceTrace'?{}:[]);for(const k of ['requiereValidacion','vinculada','cotizadorHabilitado','comparativoHabilitado','tarifasHabilitadas','estadoFuenteContradiceVigencia','aseguradoraRestrictedReference','carteraMaterializada','recibosMaterializados','cobroAplicado','importadorP0'])if(k in o)o[k]=bool(o[k]);return o;});}
async function countColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
async function idsColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).select().get();return new Set(snap.docs.map(d=>d.id));}
function validatePackage(pkg,refs){
  const errors=[];const add=(ok,msg)=>{if(!ok)errors.push(msg);};const {manifest,clients,insurers,policies,excluded}=pkg;
  add(manifest.schema_version==='orbit360-policies-canonical-private-v1','manifest_schema');add(manifest.tenant_id===TENANT,'manifest_tenant');
  add(Number(manifest.clients_to_create)===EXPECTED.clientsCreate,'manifest_clients');add(Number(manifest.restricted_insurers)===EXPECTED.insurersCreate,'manifest_insurers');add(Number(manifest.policies_to_create)===EXPECTED.policiesCreate,'manifest_policies');add(Number(manifest.policies_pending_quality)===EXPECTED.pendingPolicies,'manifest_pending');add(Number(manifest.excluded)===EXPECTED.excluded,'manifest_excluded');
  add(Number(manifest.receipts)===0&&Number(manifest.cartera)===0&&Number(manifest.cobros)===0,'manifest_scope');add(bool(manifest.real_write_executed)===false,'manifest_prewrite_only');
  add(clients.length===EXPECTED.clientsCreate,'clients_count');add(insurers.length===EXPECTED.insurersCreate,'insurers_count');add(policies.length===EXPECTED.policiesCreate,'policies_count');add(excluded.length===EXPECTED.excluded,'excluded_count');
  const clientIds=new Set(clients.map(r=>clean(r.id))),insurerIds=new Set(insurers.map(r=>clean(r.id))),policyIds=new Set(policies.map(r=>clean(r.id)));
  add(clientIds.size===clients.length,'client_ids_unique');add(insurerIds.size===insurers.length,'insurer_ids_unique');add(policyIds.size===policies.length,'policy_ids_unique');
  for(const r of clients){add(clean(r.tenantId)===TENANT,'client_tenant');add(clean(r.validationStatus)==='pendiente_completar','client_quality');add(clean(r.calidad_datos)==='pendiente_completar','client_quality_data');add(!refs.clientIds.has(clean(r.id)),'client_target_exists');}
  for(const r of insurers){add(clean(r.tenantId)===TENANT,'insurer_tenant');add(r.vinculada===false&&r.cotizadorHabilitado===false&&r.comparativoHabilitado===false&&r.tarifasHabilitadas===false,'insurer_not_restricted');add(clean(r.validationStatus)==='requiere_validacion','insurer_validation');add(!refs.insurerIds.has(clean(r.id)),'insurer_target_exists');}
  const allClientIds=new Set([...refs.clientIds,...clientIds]),allInsurerIds=new Set([...refs.insurerIds,...insurerIds]);let pending=0;
  for(const r of policies){add(clean(r.tenantId)===TENANT,'policy_tenant');add(!refs.policyIds.has(clean(r.id)),'policy_target_exists');add(allClientIds.has(clean(r.clienteId)),'policy_client_missing');add(allInsurerIds.has(clean(r.aseguradoraId)),'policy_insurer_missing');add(!clean(r.asesorId)||refs.advisorIds.has(clean(r.asesorId)),'policy_advisor_missing');add(clean(r.numero)&&clean(r.vigenciaInicio)&&clean(r.vigenciaFin),'policy_core_missing');add(r.carteraMaterializada===false&&r.recibosMaterializados===false&&r.cobroAplicado===false,'policy_materialization_forbidden');add(clean(r._sourceVersionKey),'policy_source_version_missing');if(r.requiereValidacion===true){pending++;add(clean(r.validationStatus)==='pendiente_completar','policy_pending_status');}}
  add(pending===EXPECTED.pendingPolicies,'pending_policy_count');return{errors,clientIds,insurerIds,policyIds,pending};
}
async function deleteCreated(db,created){for(let i=created.length;i>0;i-=350){const chunk=created.slice(Math.max(0,i-350),i);const b=db.batch();for(const x of chunk)b.delete(db.collection('tenantId').doc(TENANT).collection(x.coll).doc(x.id));await b.commit();}}
async function createChunked(db,ops,created){for(let i=0;i<ops.length;i+=300){const chunk=ops.slice(i,i+300);const b=db.batch();for(const op of chunk)b.create(db.collection('tenantId').doc(TENANT).collection(op.coll).doc(op.id),op.data);await b.commit();for(const op of chunk)created.push({coll:op.coll,id:op.id});}}
function sanitizeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,500);}
function writeEvidence(result){
  const dir=path.dirname(evidencePath);fs.mkdirSync(dir,{recursive:true});
  const serialized=JSON.stringify(result,null,2)+'\n';
  JSON.parse(serialized);
  const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,serialized,'utf8');
  const verify=fs.readFileSync(tmp,'utf8');JSON.parse(verify);fs.renameSync(tmp,evidencePath);
}

const result={schemaVersion:'orbit360-policies-canonical-prewrite-v1',mode,status:'STARTED',tenantId:TENANT,projectId:PROJECT,expected:EXPECTED,packageSha256:'',logicalSha256:'',before:{},after:{},rollback:{executed:false,restored:false},writes:{clients:0,insurers:0,policies:0,audit:0,receipts:0,cartera:0,cobros:0},containsPII:false,containsSecrets:false};
try{
  if(!xlsxPath||!fs.existsSync(xlsxPath))fail('ENVIRONMENT_FAILURE','XLSX_MISSING');const bytes=fs.readFileSync(xlsxPath),physicalSha=sha256(bytes);result.packageSha256=physicalSha;if(expectedSha&&physicalSha!==expectedSha)fail('DATA_CONTRACT_FAILURE','PACKAGE_SHA_MISMATCH');
  const wb=XLSX.read(bytes,{type:'buffer'});const manifest=sheetRows(wb,'Manifest')[0]||{};result.logicalSha256=clean(manifest.logical_sha256);const pkg={manifest,clients:normalizeRows(sheetRows(wb,'ClientsToCreate')),insurers:normalizeRows(sheetRows(wb,'InsurersRestricted')),policies:normalizeRows(sheetRows(wb,'PoliciesToCreate')),excluded:normalizeRows(sheetRows(wb,'Excluded'))};
  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();
  const watched=['clientes','aseguradoras','asesores','polizas','recibosEsperados','carteraPrimas','cobros','finmovs'];for(const c of watched)result.before[c]=await countColl(db,c);if(result.before.clientes!==EXPECTED.clientsBefore||result.before.aseguradoras!==EXPECTED.insurersBefore||result.before.asesores!==EXPECTED.advisorsBefore||result.before.polizas!==EXPECTED.policiesBefore)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS_CHANGED');
  const refs={clientIds:await idsColl(db,'clientes'),insurerIds:await idsColl(db,'aseguradoras'),advisorIds:await idsColl(db,'asesores'),policyIds:await idsColl(db,'polizas')};const validated=validatePackage(pkg,refs);if(validated.errors.length)fail('DATA_CONTRACT_FAILURE','PACKAGE_VALIDATION_'+validated.errors.slice(0,12).join(','));
  result.plan={clients:pkg.clients.length,insurers:pkg.insurers.length,policies:pkg.policies.length,pendingPolicies:validated.pending,excluded:pkg.excluded.length,targetIdDigest:sha256([...validated.clientIds,...validated.insurerIds,...validated.policyIds].sort().join('\n')),noReceiptWrites:true,noCarteraWrites:true,noCobroWrites:true};
  if(mode==='DRY_RUN'){result.status='PREWRITE_READY';result.firestoreRead=true;result.firestoreWrites=0;result.operationalWrites=0;for(const c of watched)result.after[c]=result.before[c];}
  else if(mode==='WRITE'){
    if(!requestPath||!fs.existsSync(requestPath))fail('AUTHORIZATION_REQUIRED','REQUEST_MISSING');const req=JSON.parse(fs.readFileSync(requestPath,'utf8'));if(req.approved!==true||clean(req.phrase)!==PHRASE||clean(req.packageSha256)!==physicalSha||clean(req.logicalSha256)!==result.logicalSha256)fail('AUTHORIZATION_REQUIRED','REQUEST_MISMATCH');
    const created=[];try{await createChunked(db,pkg.clients.map(r=>({coll:'clientes',id:clean(r.id),data:r})),created);result.writes.clients=pkg.clients.length;await createChunked(db,pkg.insurers.map(r=>({coll:'aseguradoras',id:clean(r.id),data:r})),created);result.writes.insurers=pkg.insurers.length;await createChunked(db,pkg.policies.map(r=>({coll:'polizas',id:clean(r.id),data:r})),created);result.writes.policies=pkg.policies.length;for(const c of watched)result.after[c]=await countColl(db,c);const unchanged=['asesores','recibosEsperados','carteraPrimas','cobros','finmovs'];const ok=result.after.clientes===EXPECTED.clientsBefore+EXPECTED.clientsCreate&&result.after.aseguradoras===EXPECTED.insurersBefore+EXPECTED.insurersCreate&&result.after.polizas===EXPECTED.policiesCreate&&unchanged.every(c=>result.after[c]===result.before[c]);if(!ok)fail('DATA_CONTRACT_FAILURE','POSTWRITE_INVARIANT');const auditId=`policies_20260730_${physicalSha.slice(0,16)}`;const audit={tenantId:TENANT,batchId:auditId,sourceType:'polizas',packageSha256:physicalSha,logicalSha256:result.logicalSha256,counts:{clients:EXPECTED.clientsCreate,restrictedInsurers:EXPECTED.insurersCreate,policies:EXPECTED.policiesCreate,pendingPolicies:EXPECTED.pendingPolicies,excluded:EXPECTED.excluded},confirmedBy:clean(req.confirmedBy||'paula'),confirmedAt:new Date().toISOString(),reason:clean(req.reason||'Carga inicial canónica de pólizas A&S'),status:'written_controlled',rollbackAvailable:true,noReceiptWrites:true,noCarteraWrites:true,noCobroWrites:true};await db.collection('tenantId').doc(TENANT).collection('auditoriaImportaciones').doc(auditId).create(audit);created.push({coll:'auditoriaImportaciones',id:auditId});result.writes.audit=1;result.status='WRITE_PASS';result.firestoreRead=true;result.firestoreWrites=created.length;result.operationalWrites=created.length;}catch(e){await deleteCreated(db,created);result.rollback.executed=true;const restored={};for(const c of watched)restored[c]=await countColl(db,c);result.rollback.restored=Object.keys(result.before).every(c=>restored[c]===result.before[c]);result.rollback.after=restored;if(!result.rollback.restored)fail('SECURITY_FAILURE','ROLLBACK_INCOMPLETE');throw e;}
  } else fail('PIPELINE_MECHANISM_FAILURE','MODE_INVALID');
}catch(e){result.status=result.rollback.executed&&result.rollback.restored?'ROLLED_BACK_SAFE':'BLOCKED';result.classification=String(e.code||'PIPELINE_MECHANISM_FAILURE');result.error=sanitizeError(e);result.ok=false;}
result.ok=result.status==='PREWRITE_READY'||result.status==='WRITE_PASS';
try{writeEvidence(result);}catch(e){console.error('PIPELINE_MECHANISM_FAILURE:EVIDENCE_SERIALIZATION:'+sanitizeError(e));process.exit(42);}
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
