#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab',GATE='block10.9-cobros-controlled-write-lab-v20260801',VERSION='10.9.0';
const input=process.env.ORBIT360_COBROS_PACKAGE||'',output=process.env.ORBIT360_COBROS_REPAIRED_PACKAGE||'/tmp/orbit360-cobros-gate10.9-private-repaired.json',evidence=process.env.ORBIT360_COBROS_REPAIR_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-lab-package-repair-v20260801.json';
const expectedPhysical=process.env.ORBIT360_COBROS_PACKAGE_SHA256||'',expectedLogical=process.env.ORBIT360_COBROS_PACKAGE_LOGICAL_SHA256||'';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
function logical(obj){const c=JSON.parse(JSON.stringify(obj));delete c.logicalSha256;return sha(Buffer.from(JSON.stringify(stable(c)),'utf8'));}
function same(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null);}
function ref(db,coll,id){return db.collection('tenantId').doc(TENANT).collection(coll).doc(id);}
function save(p){fs.mkdirSync(path.dirname(evidence),{recursive:true});fs.writeFileSync(evidence,JSON.stringify(p,null,2)+'\n','utf8');}
const result={schemaVersion:'orbit360-cobros-private-package-repair-evidence-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'PRIVATE_PACKAGE_DATA_CONTRACT_REPAIR',sourcePackageVerified:false,correctedCaseOrdinals:[],correctedKeys:[],corrections:0,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,privatePackageWritesPlanned:1,deployExecuted:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false,ok:false};
try{
 if(!fs.existsSync(input))throw new Error('ENVIRONMENT_FAILURE:PACKAGE_MISSING');const bytes=fs.readFileSync(input);if(sha(bytes)!==expectedPhysical)throw new Error('DATA_CONTRACT_FAILURE:PACKAGE_PHYSICAL_SHA');const pkg=JSON.parse(bytes.toString('utf8'));if(pkg.gateId!==GATE||pkg.contractVersion!==VERSION||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.cases?.length!==5||pkg.logicalSha256!==expectedLogical||logical(pkg)!==expectedLogical)throw new Error('DATA_CONTRACT_FAILURE:PACKAGE_CONTRACT');result.sourcePackageVerified=true;
 const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)throw new Error('ENVIRONMENT_FAILURE:PROJECT_ID_MISMATCH');admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
 for(let i=0;i<pkg.cases.length;i++){
  const c=pkg.cases[i];if(c.category!=='EXISTING_CANONICAL_RECEIPT')continue;const snap=await ref(db,'recibosEsperados',c.receiptId).get();if(!snap.exists)throw new Error('DATA_CONTRACT_FAILURE:RECEIPT_MISSING_'+(i+1));const actual=snap.data(),expected=c.expectedReceipt||{};const mismatched=Object.keys(expected).filter(k=>!same(actual[k],expected[k]));
  if(mismatched.length===0)continue;if(!([3,4].includes(i+1)&&mismatched.length===1&&mismatched[0]==='endoso'&&expected.endoso===null&&typeof actual.endoso==='string'&&actual.endoso.trim()))throw new Error('DATA_CONTRACT_FAILURE:UNEXPECTED_MISMATCH_'+(i+1)+'_'+mismatched.join('_'));
  c.expectedReceipt.endoso=actual.endoso;result.correctedCaseOrdinals.push(i+1);result.corrections++;
 }
 if(result.corrections!==2)throw new Error('DATA_CONTRACT_FAILURE:EXPECTED_TWO_CORRECTIONS');result.correctedKeys=['endoso'];pkg.repair={schemaVersion:'orbit360-private-package-repair-v1',sourceDiagnosisRun:30711814124,correctedCaseOrdinals:[3,4],correctedKeys:['endoso'],valuesExposed:false};pkg.logicalSha256=logical(pkg);const out=Buffer.from(JSON.stringify(stable(pkg),null,2)+'\n','utf8');fs.writeFileSync(output,out);result.newPhysicalSha256=sha(out);result.newLogicalSha256=pkg.logicalSha256;result.status='PACKAGE_REPAIR_READY';result.ok=true;
}catch(e){result.status='PACKAGE_REPAIR_FAILED';result.classification=String(e.message||e).split(':')[0]||'PIPELINE_MECHANISM_FAILURE';result.error=String(e.message||e).slice(0,240);}
save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
