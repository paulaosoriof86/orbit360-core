#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const TARGETS=['43a8841d19f7fec03ad6','a96956c63fdf22d44cfe'];
const RELATIONS=['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EVIDENCE=process.env.ORBIT360_EXCEPTION_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/block1-controlled-provenance-exception-impact-sanitized-v20260810.json';

export const fingerprint=id=>crypto.createHash('sha256').update(`clientes:${id}`,'utf8').digest('hex').slice(0,20);
function canonicalRef(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function emptyCounts(){return Object.fromEntries(TARGETS.map(fp=>[fp,Object.fromEntries(RELATIONS.map(c=>[c,0]))]));}
export function summarizeImpact(idToFingerprint, relationRows){
  const counts=emptyCounts();
  for(const coll of RELATIONS){
    for(const row of relationRows[coll]||[]){
      const fp=idToFingerprint.get(String(row.clienteId||''));
      if(!fp||!counts[fp])throw new Error(`UNEXPECTED_CLIENT_REFERENCE_${coll}`);
      counts[fp][coll]++;
    }
  }
  const totals=Object.fromEntries(RELATIONS.map(c=>[c,TARGETS.reduce((n,fp)=>n+counts[fp][c],0)]));
  return {counts,totals,totalRelationships:Object.values(totals).reduce((a,b)=>a+b,0)};
}
function writeEvidence(out){const p=path.resolve(EVIDENCE);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');}
function base(){return {schemaVersion:'orbit360-block1-controlled-provenance-exception-impact-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,operation:'CONTROLLED_PROVENANCE_EXCEPTION_IMPACT_READONLY',targetCount:2,targetFingerprints:TARGETS,collectionsChecked:RELATIONS,provenanceReAdjudicated:false,clientDocumentsMutated:false,relationshipsMutated:false,baselineContractChanged:false,reimport:false,firestoreWrites:0,authReads:0,authWrites:0,loggingReads:0,iamReads:0,operationalWrites:0,hostingTouched:false,browserExecuted:false,deployExecuted:false,productionTouched:false,documentIdsPersisted:false,containsPII:false,containsSecrets:false};}
export function runSourceFixture(){
  const ids=['fixture-client-a','fixture-client-b'];
  const idToFp=new Map([[ids[0],TARGETS[0]],[ids[1],TARGETS[1]]]);
  const relationRows={polizas:[{clienteId:ids[0]},{clienteId:ids[1]}],vehiculos:[{clienteId:ids[0]}],recibosEsperados:[],carteraPrimas:[{clienteId:ids[1]}],cobros:[{clienteId:ids[0]},{clienteId:ids[0]}]};
  const impact=summarizeImpact(idToFp,relationRows);
  if(impact.totalRelationships!==6||impact.counts[TARGETS[0]].cobros!==2||impact.counts[TARGETS[1]].carteraPrimas!==1)throw new Error('SOURCE_FIXTURE_TALLY_FAILED');
  return {...base(),decision:'SOURCE_ONLY_RUNTIME_READY',classification:'PASS_SOURCE_FIXTURE',networkAccess:false,secretAccess:false,firestoreReadOperations:0,targetsLocated:0,impact,releaseEligible:false,ok:true};
}
export async function runReadOnly(db){
  let logicalReads=0;
  const refs=await canonicalRef(db,'clientes').listDocuments();logicalReads++;
  const found=new Map();
  for(const ref of refs){const fp=fingerprint(ref.id);if(TARGETS.includes(fp)){if(found.has(fp))throw new Error('DUPLICATE_TARGET_FINGERPRINT');found.set(fp,ref.id);}}
  if(found.size!==2)throw new Error(`TARGET_DOCUMENT_COUNT_${found.size}`);
  const idToFp=new Map([...found.entries()].map(([fp,id])=>[id,fp]));
  const ids=[...idToFp.keys()];
  const relationRows={};
  for(const coll of RELATIONS){
    const snap=await canonicalRef(db,coll).where('clienteId','in',ids).select('clienteId').get();logicalReads++;
    relationRows[coll]=snap.docs.map(d=>({clienteId:d.get('clienteId')}));
  }
  if(logicalReads!==6)throw new Error(`LOGICAL_READ_BUDGET_${logicalReads}`);
  const impact=summarizeImpact(idToFp,relationRows);
  return {...base(),decision:'CONTROLLED_EXCEPTION_IMPACT_PASS',classification:'PASS_CONTROLLED_RELEASE_EXCEPTION_IMPACT',firestoreReadOperations:logicalReads,targetsLocated:found.size,impact,relationshipPresenceDoesNotBlockBecauseClientsAndRelationshipsRemainPreserved:true,releaseEligible:true,nextDecision:'RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS',ok:true};
}
async function main(){
  if(process.env.ORBIT360_SOURCE_ONLY==='1'){const out=runSourceFixture();writeEvidence(out);console.log(JSON.stringify({decision:out.decision,ok:out.ok,firestoreReadOperations:0,writes:0}));return;}
  const cred=process.env.GOOGLE_APPLICATION_CREDENTIALS||'';
  if(!cred)throw new Error('SERVICE_ACCOUNT_CREDENTIAL_PATH_MISSING');
  const svc=JSON.parse(fs.readFileSync(cred,'utf8'));
  if(svc.project_id!==PROJECT)throw new Error('PROJECT_ID_MISMATCH');
  const {default:admin}=await import('firebase-admin');
  if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(svc),projectId:PROJECT});
  const out=await runReadOnly(admin.firestore());writeEvidence(out);console.log(JSON.stringify({decision:out.decision,targetsLocated:out.targetsLocated,relations:out.impact.totals,firestoreReadOperations:out.firestoreReadOperations,writes:0,releaseEligible:out.releaseEligible,ok:out.ok}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const out={...base(),decision:'STOP_RETRY',classification:/CREDENTIAL|PROJECT_ID/.test(String(e?.message||e))?'ENVIRONMENT_FAILURE':'PIPELINE_MECHANISM_FAILURE',checkpoint:'CONTROLLED_PROVENANCE_EXCEPTION_IMPACT_READONLY',rootCause:String(e?.message||e).slice(0,220),firestoreReadOperations:0,targetsLocated:0,impact:null,releaseEligible:false,ok:false};writeEvidence(out);console.error(JSON.stringify({decision:out.decision,classification:out.classification,rootCause:out.rootCause,ok:false}));process.exit(42);});
