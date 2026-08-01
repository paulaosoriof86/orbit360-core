#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block10.9-cobros-controlled-write-lab-v20260801';
const VERSION='10.9.0';
const PHRASE='AUTORIZO ARMAR Y EJECUTAR GATE 10.9 COBROS LAB CINCO CASOS SIN DEPLOY NI PRODUCCION';
const requestPath=process.env.ORBIT360_COBROS_REQUEST||'';
const packagePath=process.env.ORBIT360_COBROS_PACKAGE||'';
const expectedPackageSha=process.env.ORBIT360_COBROS_PACKAGE_SHA256||'';
const expectedLogicalSha=process.env.ORBIT360_COBROS_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_COBROS_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-lab-v20260801.json';
function clean(v){return String(v==null?'':v).trim();}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function safeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700);}
function writeEvidence(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const text=JSON.stringify(payload,null,2)+'\n';const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,text,'utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function subsetEqual(actual,expected){if(!actual||!expected)return false;for(const [k,v] of Object.entries(expected)){if(JSON.stringify(actual[k]??null)!==JSON.stringify(v??null))return false;}return true;}
function docRef(db,coll,id){return db.collection('tenantId').doc(TENANT).collection(coll).doc(id);}
async function count(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
function materializeServerTimestamps(obj){if(Array.isArray(obj))return obj.map(materializeServerTimestamps);if(obj&&typeof obj==='object'){const out={};for(const [k,v] of Object.entries(obj))out[k]=materializeServerTimestamps(v);return out;}return obj==='SERVER_TIMESTAMP'?admin.firestore.FieldValue.serverTimestamp():obj;}
const result={schemaVersion:'orbit360-cobros-controlled-write-lab-evidence-v1',gateId:GATE,contractVersion:VERSION,tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'',phase:'ARMED_BY_EXPLICIT_LAB_AUTHORIZATION',requestVerified:false,packageVerified:false,before:{},after:{},plan:{cases:5,direct:4,historical:1,snapshots:11,operations:10,rollbacks:11},execution:{attempted:false,completedGroups:0,verifiedGroups:0,alreadyAppliedGroups:0},writes:{cobros:0,receiptUpdates:0,receiptCreates:0,policies:0,finmovs:0,firestore:0,operational:0},rollback:{executed:false,restored:false,groups:0},controls:{snapshotBeforeWrite:true,idempotency:true,atomicPerCase:true,rollbackAllOnAnyFailure:true,verifyAfterWrite:true,reactivatePolicy:false,createFinmov:false},secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,rulesApplied:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false};
const completed=[];
async function rollbackCompleted(db){result.rollback.executed=true;for(let i=completed.length-1;i>=0;i--){const item=completed[i];await db.runTransaction(async tx=>{tx.delete(docRef(db,'cobros',item.cobroId));const rec=docRef(db,'recibosEsperados',item.receiptId);if(item.category==='EXISTING_CANONICAL_RECEIPT')tx.set(rec,item.receiptBefore);else tx.delete(rec);});result.rollback.groups++;}let ok=true;for(const item of completed){const [cob,rec]=await Promise.all([docRef(db,'cobros',item.cobroId).get(),docRef(db,'recibosEsperados',item.receiptId).get()]);if(cob.exists)ok=false;if(item.category==='EXISTING_CANONICAL_RECEIPT'){if(!rec.exists||JSON.stringify(rec.data())!==JSON.stringify(item.receiptBefore))ok=false;}else if(rec.exists)ok=false;}result.rollback.restored=ok;}
try{
  if(!requestPath||!fs.existsSync(requestPath))fail('ENVIRONMENT_FAILURE','REQUEST_MISSING');
  if(!packagePath||!fs.existsSync(packagePath))fail('ENVIRONMENT_FAILURE','PRIVATE_PACKAGE_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
  if(request.schemaVersion!=='orbit360-cobros-controlled-write-lab-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.phrase!==PHRASE)fail('DATA_CONTRACT_FAILURE','REQUEST_INVALID');
  if(request.tenantId!==TENANT||request.projectId!==PROJECT||request.consumed!==false)fail('DATA_CONTRACT_FAILURE','REQUEST_SCOPE_OR_STATE');
  if(request.scope?.cases!==5||request.scope?.direct!==4||request.scope?.historical!==1||request.scope?.operations!==10||request.scope?.policyWrites!==0||request.scope?.finmovs!==0)fail('DATA_CONTRACT_FAILURE','REQUEST_COUNTS');
  if(request.capabilities?.writes!==true||request.capabilities?.firestoreRead!==true||request.capabilities?.deploy!==false||request.capabilities?.production!==false)fail('SECURITY_FAILURE','REQUEST_CAPABILITIES');result.requestVerified=true;
  const packageBytes=fs.readFileSync(packagePath),physicalSha=sha256(packageBytes);if(physicalSha!==expectedPackageSha||physicalSha!==request.privatePackage.sha256)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_SHA');
  const pkg=JSON.parse(packageBytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-cobros-controlled-write-private-package-v1'||pkg.gateId!==GATE||pkg.contractVersion!==VERSION||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_SCOPE');
  if(logicalDigest(pkg)!==expectedLogicalSha||pkg.logicalSha256!==expectedLogicalSha||request.privatePackage.logicalSha256!==expectedLogicalSha)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_LOGICAL_SHA');
  if(!Array.isArray(pkg.cases)||pkg.cases.length!==5||new Set(pkg.cases.map(x=>x.authorizationRef)).size!==5||new Set(pkg.cases.map(x=>x.idempotencyKey)).size!==5)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_CASES');
  if(pkg.authorization?.executionAuthorized!==true||pkg.authorization?.labWriteAuthorized!==true||pkg.authorization?.productionAuthorized!==false||pkg.authorization?.deployAuthorized!==false)fail('SECURITY_FAILURE','PRIVATE_PACKAGE_AUTH_BOUNDARY');result.packageVerified=true;
  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.before[coll]=await count(db,coll);
  if(result.before.polizas!==1373||result.before.recibosEsperados!==1293||result.before.cobros!==0||result.before.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_CHANGED');
  result.execution.attempted=true;
  for(const c of pkg.cases){
    const snapshot=await db.runTransaction(async tx=>{
      const policyRef=docRef(db,'polizas',c.policyId),receiptRef=docRef(db,'recibosEsperados',c.receiptId),cobroRef=docRef(db,'cobros',c.cobroId);
      const policySnap=await tx.get(policyRef),receiptSnap=await tx.get(receiptRef),cobroSnap=await tx.get(cobroRef);
      if(!policySnap.exists||!subsetEqual(policySnap.data(),c.expectedPolicy))fail('DATA_CONTRACT_FAILURE','POLICY_SNAPSHOT_MISMATCH');
      if(cobroSnap.exists){const existing=cobroSnap.data();if(existing.authorizationRef===c.authorizationRef&&existing.idempotencyKey===c.idempotencyKey)return {alreadyApplied:true,policyBefore:policySnap.data(),receiptBefore:receiptSnap.exists?receiptSnap.data():null};fail('DATA_CONTRACT_FAILURE','IDEMPOTENCY_COLLISION');}
      if(c.category==='EXISTING_CANONICAL_RECEIPT'){
        if(!receiptSnap.exists||!subsetEqual(receiptSnap.data(),c.expectedReceipt))fail('DATA_CONTRACT_FAILURE','RECEIPT_SNAPSHOT_MISMATCH');
        tx.create(cobroRef,materializeServerTimestamps(c.cobro));tx.set(receiptRef,{...materializeServerTimestamps(c.receiptPatch),updatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedBy:'gate10.9-controlled-write'},{merge:true});
      }else if(c.category==='HISTORICAL_RECEIPT_REINFORCED'){
        if(receiptSnap.exists)fail('DATA_CONTRACT_FAILURE','HISTORICAL_RECEIPT_ALREADY_EXISTS');if(policySnap.data().estado!=='No Renovada')fail('DATA_CONTRACT_FAILURE','HISTORICAL_POLICY_STATE_CHANGED');
        tx.create(receiptRef,{...materializeServerTimestamps(c.historicalReceipt),createdAt:admin.firestore.FieldValue.serverTimestamp(),createdBy:'gate10.9-controlled-write'});tx.create(cobroRef,materializeServerTimestamps(c.cobro));
      }else fail('DATA_CONTRACT_FAILURE','UNKNOWN_CASE_CATEGORY');
      return {alreadyApplied:false,policyBefore:policySnap.data(),receiptBefore:receiptSnap.exists?receiptSnap.data():null};
    });
    if(snapshot.alreadyApplied){result.execution.alreadyAppliedGroups++;continue;}
    completed.push({authorizationRef:c.authorizationRef,category:c.category,cobroId:c.cobroId,receiptId:c.receiptId,policyId:c.policyId,policyBefore:snapshot.policyBefore,receiptBefore:snapshot.receiptBefore});result.execution.completedGroups++;result.writes.cobros++;if(c.category==='EXISTING_CANONICAL_RECEIPT')result.writes.receiptUpdates++;else result.writes.receiptCreates++;result.writes.firestore+=2;result.writes.operational+=2;
  }
  for(const c of pkg.cases){const [policySnap,receiptSnap,cobroSnap]=await Promise.all([docRef(db,'polizas',c.policyId).get(),docRef(db,'recibosEsperados',c.receiptId).get(),docRef(db,'cobros',c.cobroId).get()]);if(!policySnap.exists||!subsetEqual(policySnap.data(),c.expectedPolicy))fail('DATA_CONTRACT_FAILURE','POST_POLICY_CHANGED');if(!receiptSnap.exists||!cobroSnap.exists)fail('DATA_CONTRACT_FAILURE','POST_TARGET_MISSING');const rec=receiptSnap.data(),cob=cobroSnap.data();if(rec.authorizationRef!==c.authorizationRef||rec.idempotencyKey!==c.idempotencyKey||rec.conciliado!==true||rec.reactivatePolicy!==false||rec.createFinmov!==false)fail('DATA_CONTRACT_FAILURE','POST_RECEIPT_INVALID');if(cob.authorizationRef!==c.authorizationRef||cob.idempotencyKey!==c.idempotencyKey||cob.estado!=='Pagado'||cob.conciliado!==true||cob.reactivatePolicy!==false||cob.createFinmov!==false)fail('DATA_CONTRACT_FAILURE','POST_COBRO_INVALID');result.execution.verifiedGroups++;}
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.after[coll]=await count(db,coll);
  if(result.after.polizas!==result.before.polizas||result.after.recibosEsperados!==result.before.recibosEsperados+1||result.after.cobros!==result.before.cobros+5||result.after.finmovs!==result.before.finmovs)fail('DATA_CONTRACT_FAILURE','POST_COUNTS');
  result.status='WRITE_PASS';result.classification='GO_LAB_COBROS_CONTROLLED_WRITE';result.phase='VERIFIED_OR_ROLLED_BACK';result.ok=true;
}catch(error){result.status='WRITE_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);try{if(completed.length&&admin.apps.length){const db=admin.firestore();await rollbackCompleted(db);for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.after[coll]=await count(db,coll);}}catch(rollbackError){result.rollback.error=safeError(rollbackError);result.classification='PIPELINE_MECHANISM_FAILURE';}result.ok=false;}
writeEvidence(result);console.log(JSON.stringify(result,null,2));process.exit(result.status==='WRITE_PASS'?0:42);
