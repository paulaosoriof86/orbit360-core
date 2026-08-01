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
const packagePath=process.env.ORBIT360_COBROS_PACKAGE||'';
const evidencePath=process.env.ORBIT360_COBROS_DIAG_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-lab-diagnosis-v20260801.json';
const expectedPhysical=process.env.ORBIT360_COBROS_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_COBROS_PACKAGE_LOGICAL_SHA256||'';
const clean=v=>String(v==null?'':v).trim();
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function typeOf(v){if(v===null)return 'null';if(Array.isArray(v))return 'array';if(v&&typeof v.toDate==='function')return 'timestamp';return typeof v;}
function mismatch(actual,expected){const keys=Object.keys(expected||{}).sort();const mismatched=[];const missing=[];const expectedTypes={};const actualTypes={};for(const key of keys){const has=Object.prototype.hasOwnProperty.call(actual||{},key);if(!has){missing.push(key);mismatched.push(key);expectedTypes[key]=typeOf(expected[key]);actualTypes[key]='missing';continue;}if(JSON.stringify(actual[key]??null)!==JSON.stringify(expected[key]??null)){mismatched.push(key);expectedTypes[key]=typeOf(expected[key]);actualTypes[key]=typeOf(actual[key]);}}return {ok:mismatched.length===0,expectedKeyCount:keys.length,actualKeyCount:Object.keys(actual||{}).length,mismatchedKeys:mismatched,missingExpectedKeys:missing,expectedTypes,actualTypes};}
function ref(db,coll,id){return db.collection('tenantId').doc(TENANT).collection(coll).doc(id);}
function write(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(payload,null,2)+'\n','utf8');}
const result={schemaVersion:'orbit360-cobros-controlled-write-lab-diagnosis-v1',gateId:GATE,contractVersion:VERSION,tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'READ_ONLY_ROOT_CAUSE_DIAGNOSIS',requestVerified:false,packageVerified:false,counts:{},cases:[],blockingCases:0,firstBlockingOrdinal:null,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false,ok:false};
try{
  if(!fs.existsSync(requestPath)||!fs.existsSync(packagePath))throw new Error('ENVIRONMENT_FAILURE:INPUT_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
  if(request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.scope?.cases!==5||request.capabilities?.production!==false||request.capabilities?.deploy!==false)throw new Error('DATA_CONTRACT_FAILURE:REQUEST_INVALID');
  result.requestVerified=true;
  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);if(physical!==expectedPhysical||physical!==request.privatePackage.sha256)throw new Error('DATA_CONTRACT_FAILURE:PRIVATE_PACKAGE_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));if(pkg.gateId!==GATE||pkg.contractVersion!==VERSION||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||!Array.isArray(pkg.cases)||pkg.cases.length!==5)throw new Error('DATA_CONTRACT_FAILURE:PRIVATE_PACKAGE_SCOPE');
  if(logicalDigest(pkg)!==expectedLogical||pkg.logicalSha256!==expectedLogical||request.privatePackage.logicalSha256!==expectedLogical)throw new Error('DATA_CONTRACT_FAILURE:PRIVATE_PACKAGE_LOGICAL_SHA');
  result.packageVerified=true;
  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)throw new Error('ENVIRONMENT_FAILURE:PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs']){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();result.counts[coll]=snap.data().count;}
  for(let i=0;i<pkg.cases.length;i++){
    const c=pkg.cases[i];const [policySnap,receiptSnap,cobroSnap]=await Promise.all([ref(db,'polizas',c.policyId).get(),ref(db,'recibosEsperados',c.receiptId).get(),ref(db,'cobros',c.cobroId).get()]);
    const policy=mismatch(policySnap.exists?policySnap.data():{},c.expectedPolicy||{});
    let receipt;
    if(c.category==='EXISTING_CANONICAL_RECEIPT')receipt=mismatch(receiptSnap.exists?receiptSnap.data():{},c.expectedReceipt||{});
    else receipt={ok:!receiptSnap.exists,expectedKeyCount:0,actualKeyCount:receiptSnap.exists?Object.keys(receiptSnap.data()||{}).length:0,mismatchedKeys:receiptSnap.exists?['DOCUMENT_SHOULD_BE_ABSENT']:[],missingExpectedKeys:[],expectedTypes:{},actualTypes:{}};
    const blocked=!policySnap.exists||!policy.ok||!receipt.ok||cobroSnap.exists;
    if(blocked){result.blockingCases++;if(result.firstBlockingOrdinal===null)result.firstBlockingOrdinal=i+1;}
    result.cases.push({ordinal:i+1,category:c.category,policyExists:policySnap.exists,receiptExists:receiptSnap.exists,cobroExists:cobroSnap.exists,policy,receipt,blocked});
  }
  result.status='DIAGNOSIS_COMPLETE';result.ok=true;
}catch(error){result.status='DIAGNOSIS_FAILED';result.classification=clean(error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE';result.error=clean(error.message||error).slice(0,300);}
write(result);console.log(JSON.stringify(result,null,2));process.exit(result.status==='DIAGNOSIS_COMPLETE'?0:42);
