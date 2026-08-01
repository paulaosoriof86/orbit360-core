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
const requestPath=process.env.ORBIT360_COBROS_REQUEST||'';
const lifecyclePath=process.env.ORBIT360_COBROS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_COBROS_PACKAGE||'';
const expectedPackageSha=process.env.ORBIT360_COBROS_PACKAGE_SHA256||'';
const expectedLogicalSha=process.env.ORBIT360_COBROS_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_COBROS_POST_CLOSE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-post-close-relations-readonly-v20260801.json';
function clean(v){return String(v==null?'':v).trim();}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function safeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,500);}
function writeEvidence(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function docRef(db,coll,id){return db.collection('tenantId').doc(TENANT).collection(coll).doc(id);}
async function count(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
function comparable(v){if(v&&typeof v.toDate==='function')return v.toDate().toISOString();if(v instanceof Date)return v.toISOString();if(Array.isArray(v))return v.map(comparable);if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=comparable(x);return o;}return v;}
function subsetEqual(actual,expected){if(!actual||!expected)return false;for(const [k,v] of Object.entries(expected)){const a=actual[k];if(v==='SERVER_TIMESTAMP'){if(!(a&&typeof a.toDate==='function')&&!(a instanceof Date)&&!clean(a))return false;continue;}if(JSON.stringify(comparable(a??null))!==JSON.stringify(comparable(v??null)))return false;}return true;}

const result={schemaVersion:'orbit360-cobros-post-close-relations-readonly-evidence-v2',gateId:GATE,contractVersion:VERSION,tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'READ_ONLY_POST_CLOSE_RELATION_VERIFICATION',requestVerified:false,lifecycleVerified:false,packageVerified:false,counts:{},cases:[],invalidCases:0,firstInvalidOrdinal:null,diagnosticComplete:false,totals:{cases:0,direct:0,historical:0,policyRelations:0,receiptRelations:0,authorizationRelations:0,idempotencyRelations:0,policyStatesPreserved:0,noFinmovCases:0},requestReplayBlocked:false,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,rulesApplied:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false,ok:false};
try{
  if(!requestPath||!fs.existsSync(requestPath)||!lifecyclePath||!fs.existsSync(lifecyclePath)||!packagePath||!fs.existsSync(packagePath))fail('ENVIRONMENT_FAILURE','INPUT_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
  if(request.schemaVersion!=='orbit360-cobros-controlled-write-lab-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.tenantId!==TENANT||request.projectId!==PROJECT||request.scope?.cases!==5||request.scope?.direct!==4||request.scope?.historical!==1||request.scope?.policyWrites!==0||request.scope?.finmovs!==0)fail('DATA_CONTRACT_FAILURE','REQUEST_INVALID');
  if(!Array.isArray(request.authorizationRefs)||request.authorizationRefs.length!==5||new Set(request.authorizationRefs).size!==5)fail('DATA_CONTRACT_FAILURE','REQUEST_REFS');result.requestVerified=true;
  const lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='POST_CLOSE_READONLY_VERIFICATION_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_POST_CLOSE_VERIFICATION'||lifecycle.executionProfile?.capabilities?.writes!==false||lifecycle.writeAuthorized!==false||lifecycle.requestSemanticallyConsumed!==true||lifecycle.requestFileMutationProhibited!==true||lifecycle.additionalExecutionProhibited!==true||lifecycle.productionAuthorized!==false||lifecycle.deployAuthorized!==false)fail('SECURITY_FAILURE','LIFECYCLE_NOT_SEALED_READONLY');result.lifecycleVerified=true;result.requestReplayBlocked=true;
  const packageBytes=fs.readFileSync(packagePath);const physicalSha=sha256(packageBytes);if(physicalSha!==expectedPackageSha||physicalSha!==request.privatePackage.sha256)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_SHA');
  const pkg=JSON.parse(packageBytes.toString('utf8'));if(pkg.schemaVersion!=='orbit360-cobros-controlled-write-private-package-v1'||pkg.gateId!==GATE||pkg.contractVersion!==VERSION||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||!Array.isArray(pkg.cases)||pkg.cases.length!==5)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_SCOPE');
  if(logicalDigest(pkg)!==expectedLogicalSha||pkg.logicalSha256!==expectedLogicalSha||request.privatePackage.logicalSha256!==expectedLogicalSha)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_LOGICAL_SHA');
  if(new Set(pkg.cases.map(x=>x.authorizationRef)).size!==5||new Set(pkg.cases.map(x=>x.idempotencyKey)).size!==5||new Set(pkg.cases.map(x=>x.cobroId)).size!==5||new Set(pkg.cases.map(x=>x.receiptId)).size!==5)fail('DATA_CONTRACT_FAILURE','PRIVATE_PACKAGE_UNIQUENESS');result.packageVerified=true;
  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.counts[coll]=await count(db,coll);
  if(result.counts.polizas!==1373||result.counts.recibosEsperados!==1294||result.counts.cobros!==5||result.counts.finmovs!==0)fail('DATA_CONTRACT_FAILURE','POST_CLOSE_COUNTS');
  for(let i=0;i<pkg.cases.length;i++){
    const c=pkg.cases[i];const [policySnap,receiptSnap,cobroSnap]=await Promise.all([docRef(db,'polizas',c.policyId).get(),docRef(db,'recibosEsperados',c.receiptId).get(),docRef(db,'cobros',c.cobroId).get()]);
    const policyExists=policySnap.exists,receiptExists=receiptSnap.exists,cobroExists=cobroSnap.exists;const policy=policyExists?policySnap.data():{},receipt=receiptExists?receiptSnap.data():{},cobro=cobroExists?cobroSnap.data():{};
    const policySnapshotOk=policyExists&&subsetEqual(policy,c.expectedPolicy);const cobroPayloadOk=cobroExists&&subsetEqual(cobro,c.cobro);
    const receiptPayloadOk=receiptExists&&(c.category==='EXISTING_CANONICAL_RECEIPT'?subsetEqual(receipt,{...c.expectedReceipt,...c.receiptPatch}):c.category==='HISTORICAL_RECEIPT_REINFORCED'&&subsetEqual(receipt,c.historicalReceipt));
    const cobroPolicyRelationOk=cobro.polizaId===c.policyId;const receiptPolicyRelationOk=receipt.polizaId===c.policyId;const policyRelationOk=cobroPolicyRelationOk&&receiptPolicyRelationOk;
    const cobroReceiptRelationOk=cobro.reciboId===c.receiptId;const receiptDocumentIdFieldOk=receipt.id===c.receiptId;const receiptCobroRelationOk=receipt.cobroId===c.cobroId;const receiptRelationOk=cobroReceiptRelationOk&&receiptDocumentIdFieldOk&&receiptCobroRelationOk;
    const cobroAuthorizationOk=cobro.authorizationRef===c.authorizationRef;const receiptAuthorizationOk=receipt.authorizationRef===c.authorizationRef;const requestAuthorizationOk=request.authorizationRefs.includes(c.authorizationRef);const authorizationOk=cobroAuthorizationOk&&receiptAuthorizationOk&&requestAuthorizationOk;
    const cobroIdempotencyOk=cobro.idempotencyKey===c.idempotencyKey;const receiptIdempotencyOk=receipt.idempotencyKey===c.idempotencyKey;const idempotencyOk=cobroIdempotencyOk&&receiptIdempotencyOk;
    const controlsOk=cobro.conciliado===true&&receipt.conciliado===true&&cobro.reactivatePolicy===false&&receipt.reactivatePolicy===false&&cobro.createFinmov===false&&receipt.createFinmov===false;
    const historicalOk=c.category==='HISTORICAL_RECEIPT_REINFORCED'?cobro.historicalReceipt===true&&receipt.historicalEligible===true&&receipt.historicalExigible===true&&policy.estado==='No Renovada':cobro.historicalReceipt===false;
    const ok=policyExists&&receiptExists&&cobroExists&&policySnapshotOk&&cobroPayloadOk&&receiptPayloadOk&&policyRelationOk&&receiptRelationOk&&authorizationOk&&idempotencyOk&&controlsOk&&historicalOk;
    result.cases.push({ordinal:i+1,category:c.category,policyExists,receiptExists,cobroExists,policySnapshotOk,cobroPayloadOk,receiptPayloadOk,cobroPolicyRelationOk,receiptPolicyRelationOk,policyRelationOk,cobroReceiptRelationOk,receiptDocumentIdFieldOk,receiptCobroRelationOk,receiptRelationOk,cobroAuthorizationOk,receiptAuthorizationOk,requestAuthorizationOk,authorizationOk,cobroIdempotencyOk,receiptIdempotencyOk,idempotencyOk,controlsOk,historicalOk,noFinmov:result.counts.finmovs===0,ok});
    result.totals.cases++;if(c.category==='EXISTING_CANONICAL_RECEIPT')result.totals.direct++;else result.totals.historical++;if(policyRelationOk)result.totals.policyRelations++;if(receiptRelationOk)result.totals.receiptRelations++;if(authorizationOk)result.totals.authorizationRelations++;if(idempotencyOk)result.totals.idempotencyRelations++;if(policySnapshotOk)result.totals.policyStatesPreserved++;if(result.counts.finmovs===0)result.totals.noFinmovCases++;
    if(!ok){result.invalidCases++;if(result.firstInvalidOrdinal===null)result.firstInvalidOrdinal=i+1;}
  }
  if(result.invalidCases>0){result.status='POST_CLOSE_RELATION_DIAGNOSIS_COMPLETE';result.classification='READ_ONLY_RELATION_DIAGNOSIS';result.diagnosticComplete=true;result.ok=true;}
  else{result.status='POST_CLOSE_RELATIONS_PASS';result.classification='GO_LAB_COBROS_POST_CLOSE_RELATIONS_READONLY';result.ok=true;}
}catch(error){result.status='POST_CLOSE_RELATIONS_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}
writeEvidence(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
