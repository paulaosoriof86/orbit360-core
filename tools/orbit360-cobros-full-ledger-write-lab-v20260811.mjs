#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import {validatePrivatePackageBytes,buildLedgerPlan,digest} from './orbit360-cobros-full-ledger-planner-v20260805.mjs';

const GATE='block10.10-cobros-full-ledger-write-lab-v20260805';
const VERSION='10.10.2';
const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const REQUEST_VERSION='cobros-full-ledger-write-lab-v20260811-r1';
const PACKAGE_SHA='9769d7a952e9b2a15c27821da9098e5899466b0558ba8b68e021689864ad8cfe';
const PACKAGE_LOGICAL='a999977e31c73feebb8aafe3ca380a536e1ca60047d57fcdb6d9a592bd829654';
const LEDGER_DIGEST='96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381';
const requestPath=process.env.ORBIT360_COBROS_FULL_REQUEST||'';
const packagePath=process.env.ORBIT360_COBROS_FULL_PACKAGE||'';
const evidencePath=process.env.ORBIT360_COBROS_FULL_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-full-ledger-write-runtime-sanitized-v20260811.json';

function clean(v){return String(v==null?'':v).trim();}
function fail(code,detail=''){const e=new Error(`${code}${detail?':'+detail:''}`);e.code=code;throw e;}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function safeError(e){return clean(e?.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700);}
function writeEvidence(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function dataItems(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function normalize(v){
  if(v==null)return v;
  if(Array.isArray(v))return v.map(normalize);
  if(v instanceof admin.firestore.Timestamp)return {__ts:v.toMillis()};
  if(v instanceof admin.firestore.GeoPoint)return {__geo:[v.latitude,v.longitude]};
  if(Buffer.isBuffer(v))return {__buf:v.toString('base64')};
  if(typeof v==='object'){const out={};for(const k of Object.keys(v).sort())out[k]=normalize(v[k]);return out;}
  return v;
}
async function collectionFingerprint(ref){const snap=await ref.get();const rows=snap.docs.map(d=>({id:d.id,data:normalize(d.data())})).sort((a,b)=>a.id.localeCompare(b.id));return {count:rows.length,digest:digest(rows)};}
async function countRef(ref){const s=await ref.count().get();return s.data().count;}
async function businessSnapshot(db){
  const [cobros,receipts,policies,finmovsCount]=await Promise.all([
    collectionFingerprint(dataItems(db,'cobros')),
    collectionFingerprint(dataItems(db,'recibosEsperados')),
    collectionFingerprint(dataItems(db,'polizas')),
    countRef(dataItems(db,'finmovs'))
  ]);
  return {cobros,receipts,policies,finmovsCount};
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
async function stageFingerprint(manifestRef,names){
  const counts={},digests={};
  for(const name of names){
    const snap=await manifestRef.collection(name).get();
    const rows=snap.docs.map(d=>({id:d.id,payloadDigest:d.data()?.payloadDigest||''})).sort((a,b)=>a.id.localeCompare(b.id));
    counts[name]=rows.length;digests[name]=digest(rows);
  }
  return {counts,digests,aggregateDigest:digest(names.map(name=>({name,count:counts[name],digest:digests[name]})))};
}
async function deleteDocs(ref,docs,result){for(let i=0;i<docs.length;i+=400){const batch=ref.firestore.batch();for(const d of docs.slice(i,i+400))batch.delete(d.ref);await batch.commit();result.rollbackWrites+=Math.min(400,docs.length-i);}}
async function rollbackRun(db,manifestRef,pointerRef,beforePointer,result){
  result.rollbackAttempted=true;
  try{
    await db.runTransaction(async tx=>{const p=await tx.get(pointerRef);if(p.exists&&p.data()?.activeRunId===result.runId){if(beforePointer.exists)tx.set(pointerRef,beforePointer.data);else tx.delete(pointerRef);}});
    if(result.activationCommitted)result.rollbackWrites+=1;
    for(const name of ['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds']){const snap=await manifestRef.collection(name).get();await deleteDocs(manifestRef.collection(name),snap.docs,result);}
    const m=await manifestRef.get();if(m.exists){await manifestRef.delete();result.rollbackWrites+=1;}
    const [m2,p2]=await Promise.all([manifestRef.get(),pointerRef.get()]);
    result.rollbackRestored=!m2.exists&&((beforePointer.exists&&p2.exists&&same(normalize(p2.data()),normalize(beforePointer.data)))||(!beforePointer.exists&&!p2.exists));
  }catch(e){result.rollbackError=safeError(e);result.rollbackRestored=false;}
}

const result={schemaVersion:'orbit360-cobros-full-ledger-write-runtime-evidence-v1',gateId:GATE,contractVersion:VERSION,projectId:PROJECT,tenantId:TENANT,status:'STARTED',classification:'',checkpoint:'START',runId:'',requestVerified:false,packageVerified:false,snapshotBefore:null,snapshotAfter:null,stage:{counts:{},digests:{},aggregateDigest:''},forwardWrites:0,maximumForwardWrites:1098,stageDocumentsWritten:0,manifestWrites:0,activationWrites:0,activationCommitted:false,rollbackAttempted:false,rollbackWrites:0,rollbackRestored:false,newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0,secretsRead:false,firestoreRead:false,authWrites:0,operationalBusinessWrites:0,browserExecuted:false,hostingDeploys:0,functionsDeploys:0,rulesDeploys:0,reimport:false,productionTouched:false,mainTouched:false,mergeExecuted:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false,ok:false};
let db,manifestRef,pointerRef,beforePointer;
try{
  if(!requestPath||!fs.existsSync(requestPath))fail('ENVIRONMENT_FAILURE','REQUEST_MISSING');
  if(!packagePath||!fs.existsSync(packagePath))fail('ENVIRONMENT_FAILURE','PRIVATE_PACKAGE_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
  if(request.schemaVersion!=='orbit360-cobros-full-ledger-write-runtime-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.requestVersion!==REQUEST_VERSION||request.approved!==true||request.status!=='AUTHORIZED_ONCE'||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false)fail('DATA_CONTRACT_FAILURE','REQUEST_INVALID');
  if(request.branch!=='ays/backend-tenant-lab-v99-20260703'||request.projectId!==PROJECT||request.tenantId!==TENANT||request.scope?.maximumForwardWrites!==1098||request.scope?.stageDocuments!==1095||request.scope?.newCobros!==0||request.scope?.receiptWrites!==0||request.scope?.policyWrites!==0||request.scope?.finmovWrites!==0)fail('DATA_CONTRACT_FAILURE','REQUEST_SCOPE');
  if(request.privatePackage?.sha256!==PACKAGE_SHA||request.privatePackage?.logicalSha256!==PACKAGE_LOGICAL||request.privatePackage?.sourceLedgerDigest!==LEDGER_DIGEST)fail('DATA_CONTRACT_FAILURE','REQUEST_PACKAGE');
  result.requestVerified=true;result.checkpoint='REQUEST_VERIFIED';
  const bytes=fs.readFileSync(packagePath);if(sha256(bytes)!==PACKAGE_SHA)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_PHYSICAL_SHA');
  const {pkg}=validatePrivatePackageBytes(bytes,{packageSha256:PACKAGE_SHA,packageLogicalSha256:PACKAGE_LOGICAL});const plan=buildLedgerPlan(pkg);
  if(plan.stageDocumentCount!==1095||plan.maximumWrites!==1098||plan.manifest.newCobros!==0||plan.manifest.receiptWrites!==0||plan.manifest.policyWrites!==0||plan.manifest.finmovWrites!==0)fail('DATA_CONTRACT_FAILURE','PLAN_SCOPE');
  result.runId=plan.runId;result.packageVerified=true;result.checkpoint='PACKAGE_VERIFIED';
  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  manifestRef=dataItems(db,'cobrosLedgerRuns').doc(plan.runId);pointerRef=dataItems(db,'cobrosLedgerControl').doc('active');
  const [manifestBefore,pointerBefore,businessBefore]=await Promise.all([manifestRef.get(),pointerRef.get(),businessSnapshot(db)]);beforePointer={exists:pointerBefore.exists,data:pointerBefore.exists?pointerBefore.data():null};
  result.snapshotBefore={activePointerExists:pointerBefore.exists,activeRunId:pointerBefore.exists?clean(pointerBefore.data()?.activeRunId):'',runManifestExists:manifestBefore.exists,business:businessBefore};result.checkpoint='SNAPSHOT_VERIFIED';
  if(manifestBefore.exists)fail('DATA_CONTRACT_FAILURE','RUN_ID_ALREADY_EXISTS_NO_REPLAY');
  await manifestRef.create({...plan.manifest,createdAt:admin.firestore.FieldValue.serverTimestamp()});result.forwardWrites++;result.manifestWrites++;result.checkpoint='MANIFEST_CREATED';
  const names=['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds'];
  for(const name of names){const rows=plan.collections[name];for(let i=0;i<rows.length;i+=400){const batch=db.batch();for(const row of rows.slice(i,i+400))batch.create(manifestRef.collection(name).doc(row.id),row.data);await batch.commit();const n=Math.min(400,rows.length-i);result.forwardWrites+=n;result.stageDocumentsWritten+=n;if(result.forwardWrites>1096)fail('SECURITY_FAILURE','FORWARD_WRITE_CAP_BEFORE_ACTIVATION');}}
  if(result.stageDocumentsWritten!==1095||result.forwardWrites!==1096)fail('DATA_CONTRACT_FAILURE','STAGE_WRITE_COUNT');
  const stage=await stageFingerprint(manifestRef,names);result.stage=stage;
  if(!same(stage.counts,{pagosReportados:365,evidenciasCobro:365,propuestasConciliacion:132,conciliacionHolds:233}))fail('DATA_CONTRACT_FAILURE','STAGE_COUNTS');
  if(!same(stage.digests,plan.collectionDigests)||stage.aggregateDigest!==plan.aggregateDigest)fail('DATA_CONTRACT_FAILURE','STAGE_DIGEST');result.checkpoint='STAGE_WRITES_COMPLETE';
  await db.runTransaction(async tx=>{
    const [m,p]=await Promise.all([tx.get(manifestRef),tx.get(pointerRef)]);
    if(!m.exists||m.data()?.status!=='STAGING'||m.data()?.expectedAggregateDigest!==plan.aggregateDigest||m.data()?.stageDocumentCount!==1095)fail('DATA_CONTRACT_FAILURE','ACTIVATION_MANIFEST_PRECONDITION');
    const current={exists:p.exists,data:p.exists?p.data():null};if(current.exists!==beforePointer.exists||!same(normalize(current.data),normalize(beforePointer.data)))fail('DATA_CONTRACT_FAILURE','ACTIVE_POINTER_CHANGED_CONCURRENTLY');
    tx.update(manifestRef,{status:'ACTIVE',activationState:'ACTIVE',activatedAt:admin.firestore.FieldValue.serverTimestamp()});
    tx.set(pointerRef,{...plan.activePointer,activatedAt:admin.firestore.FieldValue.serverTimestamp()});
  });
  result.forwardWrites+=2;result.activationWrites=2;result.activationCommitted=true;if(result.forwardWrites!==1098)fail('SECURITY_FAILURE','FORWARD_WRITE_CAP_FINAL');result.checkpoint='ACTIVE_POINTER_COMMITTED';
  const [manifestAfter,pointerAfter,stageAfter,businessAfter]=await Promise.all([manifestRef.get(),pointerRef.get(),stageFingerprint(manifestRef,names),businessSnapshot(db)]);
  result.snapshotAfter={activePointerExists:pointerAfter.exists,activeRunId:pointerAfter.exists?clean(pointerAfter.data()?.activeRunId):'',runManifestExists:manifestAfter.exists,business:businessAfter};
  if(!manifestAfter.exists||manifestAfter.data()?.status!=='ACTIVE'||manifestAfter.data()?.activationState!=='ACTIVE')fail('DATA_CONTRACT_FAILURE','POST_MANIFEST_NOT_ACTIVE');
  if(!pointerAfter.exists||pointerAfter.data()?.activeRunId!==plan.runId||pointerAfter.data()?.aggregateDigest!==plan.aggregateDigest||pointerAfter.data()?.sourceLedgerDigest!==LEDGER_DIGEST)fail('DATA_CONTRACT_FAILURE','POST_POINTER_INVALID');
  if(!same(stageAfter.counts,stage.counts)||!same(stageAfter.digests,stage.digests)||stageAfter.aggregateDigest!==stage.aggregateDigest)fail('DATA_CONTRACT_FAILURE','POST_STAGE_DRIFT');
  if(!same(businessAfter,businessBefore))fail('SECURITY_FAILURE','BUSINESS_COLLECTION_DRIFT');
  result.status='COBROS_REAL_LEDGER_COMPLETE';result.classification='GO_LAB_COBROS_FULL_LEDGER_DURABLE_COMPLETE';result.checkpoint='POST_VERIFIED';result.ok=true;
}catch(error){
  result.status='STOP_RETRY';result.classification=clean(error?.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.checkpoint=result.checkpoint||'FAILED';
  if(db&&manifestRef&&pointerRef&&result.forwardWrites>0)await rollbackRun(db,manifestRef,pointerRef,beforePointer,result);
  if(result.rollbackAttempted&&!result.rollbackRestored)result.classification='PIPELINE_MECHANISM_FAILURE';
}
writeEvidence(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
