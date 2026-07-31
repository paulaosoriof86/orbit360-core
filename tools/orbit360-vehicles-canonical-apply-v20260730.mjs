#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const EXPECTED={clients:430,insurers:30,advisors:7,policies:1373,vehiclesBefore:0,vehiclesCreate:1032,pendingVehicles:60,excluded:4,receipts:0,cartera:0,cobros:0,finmovs:0};
const PHRASE='AUTORIZO ESCRITURA CONTROLADA VEHICULOS AYS 20260730';
const mode=String(process.env.ORBIT360_VEHICLES_MODE||'DRY_RUN').toUpperCase();
const packagePath=process.env.ORBIT360_VEHICLES_PACKAGE||'';
const requestPath=process.env.ORBIT360_VEHICLES_REQUEST||'';
const evidencePath=process.env.ORBIT360_VEHICLES_PREWRITE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/vehicles-canonical-prewrite.json';
const expectedTargetDigest=process.env.ORBIT360_VEHICLES_TARGET_DIGEST||'c5a5eb51b69eedef33588c6e3bb8bb3746ceac8bffc4a7a9181ebcbe4995682d';
const expectedLogicalSha=process.env.ORBIT360_VEHICLES_LOGICAL_SHA256||'4e9545dc580782470ea2e1b2b8a421a16f8cd152ed03264f7b7a30ea14fadc0d';

function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function clean(v){return String(v==null?'':v).trim();}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function parseJson(v,fallback){if(v==null||v==='')return fallback;if(typeof v!=='string')return v;try{return JSON.parse(v);}catch{return fallback;}}
function rowObjects(pkg){const headers=pkg.headers||[];return (pkg.vehicles||[]).map(row=>{const o={};headers.forEach((h,i)=>o[h]=row[i]??'');o.requiereValidacion=o.requiereValidacion===true||String(o.requiereValidacion).toLowerCase()==='true';o.sourcePolicyConflict=o.sourcePolicyConflict===true||String(o.sourcePolicyConflict).toLowerCase()==='true';o.motivosCalidad=clean(o.motivosCalidad);o.sourceRefs=parseJson(o.sourceRefs,[]);o.sourceTrace=parseJson(o.sourceTrace,{});return o;});}
async function countColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
async function mapDocs(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).get();return new Map(snap.docs.map(d=>[d.id,d.data()]));}
async function idsColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).select().get();return new Set(snap.docs.map(d=>d.id));}
async function deleteCreated(db,created){for(let i=created.length;i>0;i-=350){const chunk=created.slice(Math.max(0,i-350),i);const b=db.batch();for(const x of chunk)b.delete(db.collection('tenantId').doc(TENANT).collection(x.coll).doc(x.id));await b.commit();}}
async function createChunked(db,ops,created){for(let i=0;i<ops.length;i+=300){const chunk=ops.slice(i,i+300);const b=db.batch();for(const op of chunk)b.create(db.collection('tenantId').doc(TENANT).collection(op.coll).doc(op.id),op.data);await b.commit();for(const op of chunk)created.push({coll:op.coll,id:op.id});}}
function sanitizeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,600);}
function writeEvidence(result){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const serialized=JSON.stringify(result,null,2)+'\n';JSON.parse(serialized);const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,serialized,'utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}

const result={schemaVersion:'orbit360-vehicles-canonical-write-v1',mode,status:'STARTED',tenantId:TENANT,projectId:PROJECT,expected:EXPECTED,logicalSha256:'',before:{},after:{},plan:{},validation:{},rollback:{executed:false,restored:false},writes:{vehicles:0,audit:0,clients:0,insurers:0,policies:0,receipts:0,cartera:0,cobros:0,finmovs:0},firestoreRead:false,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};
try{
  if(!packagePath||!fs.existsSync(packagePath))fail('ENVIRONMENT_FAILURE','PRIVATE_PACKAGE_MISSING');
  const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
  if(pkg.schemaVersion!=='orbit360-vehicles-canonical-private-v1'||pkg.tenantId!==TENANT)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCHEMA_OR_TENANT');
  const metrics=pkg.metrics||{};
  result.logicalSha256=clean(metrics.logicalSha256);
  if(Number(metrics.rawRows)!==1060||Number(metrics.canonicalSourceIdentities)!==1036||Number(metrics.vehiclePolicyRelationsCreate)!==EXPECTED.vehiclesCreate||Number(metrics.qualityPending)!==EXPECTED.pendingVehicles||Number(metrics.excluded)!==EXPECTED.excluded||Number(metrics.mappingNumeroVigencia)!==1030||Number(metrics.mappingNumeroVigenciaNombre)!==2||Number(metrics.unsafeNumberOnlyFallback)!==0||Number(metrics.longNumericPolicyUniqueIdentities13To14Digits)!==123||clean(metrics.identityCellsReadMode)!=='raw_cell_value')fail('DATA_CONTRACT_FAILURE','PACKAGE_METRICS');
  if(result.logicalSha256!==expectedLogicalSha)fail('DATA_CONTRACT_FAILURE','LOGICAL_SHA_MISMATCH');
  if(clean(metrics.targetIdDigest)!==expectedTargetDigest)fail('DATA_CONTRACT_FAILURE','TARGET_DIGEST_MISMATCH');
  const vehicles=rowObjects(pkg);
  if(vehicles.length!==EXPECTED.vehiclesCreate)fail('DATA_CONTRACT_FAILURE','VEHICLE_COUNT');
  const vehicleIds=new Set(vehicles.map(v=>clean(v.id)));if(vehicleIds.size!==vehicles.length||vehicleIds.has(''))fail('DATA_CONTRACT_FAILURE','VEHICLE_IDS');
  const digest=sha256([...vehicleIds].sort().join('\n'));if(digest!==expectedTargetDigest)fail('DATA_CONTRACT_FAILURE','TARGET_ID_RECOMPUTE_MISMATCH');
  const pending=vehicles.filter(v=>v.requiereValidacion===true||clean(v.validationStatus)==='pendiente_completar').length;if(pending!==EXPECTED.pendingVehicles)fail('DATA_CONTRACT_FAILURE','PENDING_COUNT');
  for(const v of vehicles){if(clean(v.tenantId)!==TENANT)fail('DATA_CONTRACT_FAILURE','VEHICLE_TENANT');if(!clean(v.polizaId)||!clean(v.clienteId)||!clean(v.id))fail('DATA_CONTRACT_FAILURE','VEHICLE_CORE');}

  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.firestoreRead=true;
  const watched=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs'];for(const c of watched)result.before[c]=await countColl(db,c);
  if(result.before.clientes!==EXPECTED.clients||result.before.aseguradoras!==EXPECTED.insurers||result.before.asesores!==EXPECTED.advisors||result.before.polizas!==EXPECTED.policies)fail('DATA_CONTRACT_FAILURE','PARENT_BASELINE_COUNTS_CHANGED');
  if(result.before.vehiculos!==EXPECTED.vehiclesBefore)fail('DATA_CONTRACT_FAILURE','VEHICLES_BASELINE_NOT_EMPTY');
  if(result.before.recibosEsperados!==EXPECTED.receipts||result.before.carteraPrimas!==EXPECTED.cartera||result.before.cobros!==EXPECTED.cobros||result.before.finmovs!==EXPECTED.finmovs)fail('DATA_CONTRACT_FAILURE','DOWNSTREAM_BASELINE_CHANGED');

  const policyDocs=await mapDocs(db,'polizas');const existingVehicleIds=await idsColl(db,'vehiculos');
  let missingParents=0,clientMismatches=0,insurerMismatches=0,targetCollisions=0,policyNumberMismatches=0,vigencyMismatches=0;
  for(const v of vehicles){const p=policyDocs.get(clean(v.polizaId));if(!p){missingParents++;continue;}if(clean(p.clienteId)!==clean(v.clienteId))clientMismatches++;if(clean(p.aseguradoraId)!==clean(v.aseguradoraId))insurerMismatches++;if(clean(p.numero)!==clean(v.polizaNumero))policyNumberMismatches++;if(clean(p.vigenciaInicio)!==clean(v.vigenciaInicio)||clean(p.vigenciaFin)!==clean(v.vigenciaFin))vigencyMismatches++;if(existingVehicleIds.has(clean(v.id)))targetCollisions++;}
  result.validation={missingParents,clientMismatches,insurerMismatches,policyNumberMismatches,vigencyMismatches,targetCollisions,parentPoliciesAvailable:policyDocs.size,targetIdsUnique:vehicleIds.size,targetIdDigest:digest,pendingVehicles:pending,excluded:Number(metrics.excluded),unsafeNumberOnlyFallback:Number(metrics.unsafeNumberOnlyFallback)};
  if(missingParents||clientMismatches||insurerMismatches||policyNumberMismatches||vigencyMismatches||targetCollisions)fail('DATA_CONTRACT_FAILURE','LIVE_RELATION_VALIDATION');
  result.plan={vehicles:vehicles.length,pendingVehicles:pending,excluded:Number(metrics.excluded),logicalSha256:result.logicalSha256,targetIdDigest:digest,noClientWrites:true,noInsurerWrites:true,noPolicyWrites:true,noReceiptWrites:true,noCarteraWrites:true,noCobroWrites:true,noFinmovWrites:true,expectedPostVehicles:result.before.vehiculos+vehicles.length};

  if(mode==='DRY_RUN'){
    for(const c of watched)result.after[c]=result.before[c];result.status='PREWRITE_READY';result.firestoreWrites=0;result.operationalWrites=0;
  } else if(mode==='WRITE'){
    if(!requestPath||!fs.existsSync(requestPath))fail('AUTHORIZATION_REQUIRED','REQUEST_MISSING');
    const req=JSON.parse(fs.readFileSync(requestPath,'utf8'));
    const scope=req.scope||{};
    if(req.schemaVersion!=='orbit360-vehicles-write-request-v1'||req.approved!==true||clean(req.phrase)!==PHRASE||clean(req.logicalSha256)!==result.logicalSha256||clean(req.targetIdDigest)!==digest||Number(scope.vehicles)!==EXPECTED.vehiclesCreate||Number(scope.audit)!==1||Number(scope.clients)!==0||Number(scope.insurers)!==0||Number(scope.policies)!==0||Number(scope.receipts)!==0||Number(scope.cartera)!==0||Number(scope.cobros)!==0||Number(scope.finmovs)!==0)fail('AUTHORIZATION_REQUIRED','REQUEST_MISMATCH');
    const created=[];
    try{
      await createChunked(db,vehicles.map(r=>({coll:'vehiculos',id:clean(r.id),data:r})),created);result.writes.vehicles=vehicles.length;
      for(const c of watched)result.after[c]=await countColl(db,c);
      const unchanged=['clientes','aseguradoras','asesores','polizas','recibosEsperados','carteraPrimas','cobros','finmovs'];
      const postOk=result.after.vehiculos===EXPECTED.vehiclesCreate&&unchanged.every(c=>result.after[c]===result.before[c]);
      if(!postOk)fail('DATA_CONTRACT_FAILURE','POSTWRITE_INVARIANT');
      const afterIds=await idsColl(db,'vehiculos');if(afterIds.size!==EXPECTED.vehiclesCreate||[...vehicleIds].some(id=>!afterIds.has(id)))fail('DATA_CONTRACT_FAILURE','POSTWRITE_TARGET_IDS');
      const auditId=`vehicles_20260730_${digest.slice(0,16)}`;
      const audit={tenantId:TENANT,batchId:auditId,sourceType:'vehiculos',logicalSha256:result.logicalSha256,targetIdDigest:digest,counts:{vehicles:EXPECTED.vehiclesCreate,pendingVehicles:EXPECTED.pendingVehicles,excluded:EXPECTED.excluded},confirmedBy:clean(req.confirmedBy||'paula'),confirmedAt:new Date().toISOString(),reason:clean(req.reason||'Carga inicial canónica de vehículos A&S'),status:'written_controlled',rollbackAvailable:true,writeUnit:'vehicle_policy_association',noClientWrites:true,noInsurerWrites:true,noPolicyWrites:true,noReceiptWrites:true,noCarteraWrites:true,noCobroWrites:true,noFinmovWrites:true};
      await db.collection('tenantId').doc(TENANT).collection('auditoriaImportaciones').doc(auditId).create(audit);created.push({coll:'auditoriaImportaciones',id:auditId});result.writes.audit=1;
      result.status='WRITE_PASS';result.firestoreWrites=created.length;result.operationalWrites=vehicles.length;
    }catch(e){
      await deleteCreated(db,created);result.rollback.executed=true;
      const restored={};for(const c of watched)restored[c]=await countColl(db,c);
      result.rollback.restored=Object.keys(result.before).every(c=>restored[c]===result.before[c]);result.rollback.after=restored;
      if(!result.rollback.restored)fail('SECURITY_FAILURE','ROLLBACK_INCOMPLETE');throw e;
    }
  } else fail('PIPELINE_MECHANISM_FAILURE','MODE_INVALID');
}catch(e){result.status=result.rollback.executed&&result.rollback.restored?'ROLLED_BACK_SAFE':'BLOCKED';result.classification=String(e.code||'PIPELINE_MECHANISM_FAILURE');result.error=sanitizeError(e);result.ok=false;}
result.ok=result.status==='PREWRITE_READY'||result.status==='WRITE_PASS';
try{writeEvidence(result);}catch(e){console.error('PIPELINE_MECHANISM_FAILURE:EVIDENCE_SERIALIZATION:'+sanitizeError(e));process.exit(42);}
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
