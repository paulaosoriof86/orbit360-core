#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT,PROJECT,COLLECTIONS} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows,visualManifest,safeError,text,sha,normalizeRaw} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {validationCategory,seedLike,batchReferences} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT=process.cwd();
const GATE='block7-policies-held-parents-controlled-write-lab-v20260801';
const VERSION='7.8.0';
const AUTH_REF='user_authorized_held_parents_controlled_write_20_20260801';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-held-parents-controlled-write-lab-v20260801.json');
const EXPECTED={
  sourceDigest:'88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d',
  targetBeforeDigest:'724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305',
  planDigest:'de72758f0f2097471bb9183879b8039154b0c063d79e7678393575a5a97f97c8',
  source:{clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5},
  targetBefore:{clientes:414,aseguradoras:26,polizas:1375,vehiculos:1033,recibosEsperados:1294,carteraPrimas:673,cobros:7},
  targetAfter:{clientes:430,aseguradoras:30,polizas:1375,vehiculos:1033,recibosEsperados:1294,carteraPrimas:673,cobros:7}
};

function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function rowHash(id,data){return sha(JSON.stringify({id,data:normalizeRaw(data)}));}
function rowContentDigest(rows){return sha([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>`${row.id}:${rowHash(row.id,row.data)}`).join('\n'));}
function rowIdDigest(rows){return sha([...rows].map(row=>row.id).sort().join('\n'));}
function globalDigest(summary){return sha(COLLECTIONS.map(collection=>`${collection}:${summary[collection].contentDigest}`).join('\n'));}
function nonEmpty(value){if(value===null||value===undefined||value==='')return false;if(Array.isArray(value))return value.length>0;if(typeof value==='object')return Object.keys(value).length>0;return true;}
function primitives(value,prefix='',output=[]){
  if(value===null||value===undefined)return output;
  if(value&&typeof value.toDate==='function')return output;
  if(value&&typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name)){output.push({path:prefix,value:value.path});return output;}
  if(Array.isArray(value)){value.forEach((item,index)=>primitives(item,`${prefix}[${index}]`,output));return output;}
  if(typeof value==='object'){for(const [key,child] of Object.entries(value))primitives(child,prefix?`${prefix}.${key}`:key,output);return output;}
  output.push({path:prefix,value});return output;
}
function normalizeRef(value){const raw=text(value);if(!raw)return'';if(raw.includes('/'))return raw.split('/').filter(Boolean).pop()||raw;return raw;}
function resolveRelation(data,known,pattern){
  const values=primitives(data),patterned=values.filter(item=>pattern.test(item.path)),candidates=new Set();
  for(const item of patterned){const ref=normalizeRef(item.value);if(known.has(ref))candidates.add(ref);}
  if(!candidates.size)for(const item of values){const ref=normalizeRef(item.value);if(known.has(ref))candidates.add(ref);}
  if(candidates.size===1)return{status:'RESOLVED',id:[...candidates][0]};
  if(candidates.size>1)return{status:'AMBIGUOUS',id:''};
  return{status:patterned.some(item=>nonEmpty(item.value))?'UNRESOLVED':'MISSING',id:''};
}
function sourceBacked(value){
  if(!value||typeof value!=='object')return false;
  for(const [key,child] of Object.entries(value)){
    if(/^(sourceRefs?|sourceTrace|trace|importBatchId|sourceBatchId|origenRegistro|fuenteAutoridad|sourceType)$/i.test(key)&&nonEmpty(child))return true;
    if(child&&typeof child==='object'&&typeof child.toDate!=='function'&&sourceBacked(child))return true;
  }
  return false;
}
function add(target,key,n=1){if(target instanceof Map)target.set(key,(target.get(key)||0)+n);else target[key]=(target[key]||0)+n;}
async function readState(db){
  const source={},target={};
  for(const collection of COLLECTIONS){
    const [sourceSnap,targetSnap]=await Promise.all([
      db.collection('tenantId').doc(TENANT).collection(collection).get(),
      db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get()
    ]);
    source[collection]=snapshotRows(sourceSnap);target[collection]=snapshotRows(targetSnap);
  }
  return{source,target};
}
function summarize(rowsByCollection){const out={};for(const collection of COLLECTIONS){const rows=rowsByCollection[collection];out[collection]={count:rows.length,idDigest:rowIdDigest(rows),contentDigest:rowContentDigest(rows)};}return out;}
function exactParity(row,targetMap){const data=targetMap.get(row.id);return Boolean(data)&&rowHash(row.id,row.data)===rowHash(row.id,data);}
function classifyParents(ids,sourceMap,usage){
  const categories={},migratable=new Set(),correction=new Set(),unused=new Set();let validationHolds=0,sourceBackedCount=0,seedMarkers=0,referencedParents=0,totalPolicyLinks=0;const digestRows=[];
  for(const id of [...ids].sort()){
    const data=sourceMap.get(id),validation=validationCategory(data),backed=sourceBacked(data),seed=seedLike(data),links=usage.get(id)||0;
    if(validation==='REQUIRES_VALIDATION')validationHolds++;if(backed)sourceBackedCount++;if(seed)seedMarkers++;if(links>0){referencedParents++;totalPolicyLinks+=links;}
    let category;if(links===0){category='HOLD_NO_ACTIVE_POLICY_DEPENDENCY';unused.add(id);}else if(validation==='REQUIRES_VALIDATION'&&backed&&!seed){category='MIGRATE_RESTRICTED_PRESERVE_REQUIRES_VALIDACION';migratable.add(id);}else{category='CREATE_CORRECTION_MANAGEMENT_BEFORE_PARENT_MIGRATION';correction.add(id);}
    add(categories,category);digestRows.push(`${sha(id)}|${category}|${validation}|${backed?'1':'0'}|${seed?'1':'0'}|${links}`);
  }
  return{summary:{total:ids.size,validationHolds,sourceBacked:sourceBackedCount,seedMarkers,referencedParents,totalPolicyLinks,categories,digest:sha(digestRows.join('\n'))},migratable,correction,unused};
}
function buildPlan(source,target){
  const sourceMaps=Object.fromEntries(COLLECTIONS.map(c=>[c,new Map(source[c].map(row=>[row.id,row.data]))]));
  const targetMaps=Object.fromEntries(COLLECTIONS.map(c=>[c,new Map(target[c].map(row=>[row.id,row.data]))]));
  const sourceSets=Object.fromEntries(COLLECTIONS.map(c=>[c,new Set(sourceMaps[c].keys())]));
  const targetSets=Object.fromEntries(COLLECTIONS.map(c=>[c,new Set(targetMaps[c].keys())]));
  const heldClients=new Set([...sourceSets.clientes].filter(id=>!targetSets.clientes.has(id))),heldInsurers=new Set([...sourceSets.aseguradoras].filter(id=>!targetSets.aseguradoras.has(id)));
  const clientUsage=new Map(),insurerUsage=new Map(),affectedPolicies=new Map(),clientAffected=new Set(),insurerAffected=new Set(),bothAffected=new Set();let policyRelationBlocked=0,policyExactTargetParity=0,policyTargetMissing=0,policyTargetMismatch=0;
  for(const row of source.polizas){
    const client=resolveRelation(row.data,sourceSets.clientes,/(cliente|contratante|asegurado|customer|client)/i),insurer=resolveRelation(row.data,sourceSets.aseguradoras,/(aseguradora|insurer|compania|company)/i);
    if(client.status!=='RESOLVED'||insurer.status!=='RESOLVED'){policyRelationBlocked++;continue;}
    const usesClient=heldClients.has(client.id),usesInsurer=heldInsurers.has(insurer.id);if(usesClient){add(clientUsage,client.id);clientAffected.add(row.id);}if(usesInsurer){add(insurerUsage,insurer.id);insurerAffected.add(row.id);}
    if(usesClient||usesInsurer){affectedPolicies.set(row.id,{row,clientId:client.id,insurerId:insurer.id,usesClient,usesInsurer});if(usesClient&&usesInsurer)bothAffected.add(row.id);}
    if(!targetMaps.polizas.has(row.id))policyTargetMissing++;else if(exactParity(row,targetMaps.polizas))policyExactTargetParity++;else policyTargetMismatch++;
  }
  const clients=classifyParents(heldClients,sourceMaps.clientes,clientUsage),insurers=classifyParents(heldInsurers,sourceMaps.aseguradoras,insurerUsage),correctionPolicies=new Set();
  for(const [id,link] of affectedPolicies)if((link.usesClient&&clients.correction.has(link.clientId))||(link.usesInsurer&&insurers.correction.has(link.insurerId)))correctionPolicies.add(id);
  const descendants={vehiculos:[],recibosEsperados:[],carteraPrimas:[],cobros:[]},affectedReceiptIds=new Set(),diagnosticRows=[];let descendantBlocked=0;
  for(const row of source.vehiculos){const rel=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i);if(rel.status!=='RESOLVED'){descendantBlocked++;continue;}if(affectedPolicies.has(rel.id)){descendants.vehiculos.push(row);diagnosticRows.push(`vehiculo|${sha(row.id)}|${correctionPolicies.has(rel.id)?'CORRECTION':'RESTRICTED'}`);}}
  for(const row of source.recibosEsperados){const rel=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i);if(rel.status!=='RESOLVED'){descendantBlocked++;continue;}if(affectedPolicies.has(rel.id)){descendants.recibosEsperados.push(row);affectedReceiptIds.add(row.id);diagnosticRows.push(`recibo|${sha(row.id)}|${correctionPolicies.has(rel.id)?'CORRECTION':'RESTRICTED'}`);}}
  for(const [collection,label] of [['carteraPrimas','cartera'],['cobros','cobros']])for(const row of source[collection]){
    const policy=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i),receipt=resolveRelation(row.data,sourceSets.recibosEsperados,/(recibo|receipt)/i);if(policy.status!=='RESOLVED'||receipt.status!=='RESOLVED'){descendantBlocked++;continue;}
    if(affectedPolicies.has(policy.id)||affectedReceiptIds.has(receipt.id)){descendants[collection].push(row);diagnosticRows.push(`${label}|${sha(row.id)}|${correctionPolicies.has(policy.id)?'CORRECTION':'RESTRICTED'}`);}
  }
  for(const [id,link] of affectedPolicies)diagnosticRows.push(`poliza|${sha(id)}|${link.usesClient?'C':'-'}${link.usesInsurer?'I':'-'}|${correctionPolicies.has(id)?'CORRECTION':'RESTRICTED'}`);
  return{sourceMaps,targetMaps,sourceSets,targetSets,heldClients,heldInsurers,clients,insurers,affectedPolicies,clientAffected,insurerAffected,bothAffected,correctionPolicies,descendants,descendantBlocked,policyRelationBlocked,policyExactTargetParity,policyTargetMissing,policyTargetMismatch,planDigest:sha(diagnosticRows.sort().join('\n'))};
}
function verifyPlan(plan){
  const descendantTotal=Object.values(plan.descendants).reduce((n,rows)=>n+rows.length,0);
  return plan.heldClients.size===16&&plan.heldInsurers.size===4&&plan.clients.summary.validationHolds===16&&plan.insurers.summary.validationHolds===4&&plan.clients.summary.sourceBacked===16&&plan.insurers.summary.sourceBacked===4&&plan.clients.summary.seedMarkers===0&&plan.insurers.summary.seedMarkers===0&&plan.clients.summary.referencedParents===16&&plan.insurers.summary.referencedParents===4&&plan.clients.migratable.size===16&&plan.insurers.migratable.size===4&&plan.clients.correction.size===0&&plan.insurers.correction.size===0&&plan.clients.unused.size===0&&plan.insurers.unused.size===0&&plan.affectedPolicies.size===75&&plan.clientAffected.size===52&&plan.insurerAffected.size===23&&plan.bothAffected.size===0&&plan.policyRelationBlocked===0&&plan.policyExactTargetParity===1373&&plan.policyTargetMissing===0&&plan.policyTargetMismatch===0&&plan.descendantBlocked===0&&plan.descendants.vehiculos.length===47&&plan.descendants.recibosEsperados.length===76&&plan.descendants.carteraPrimas.length===38&&plan.descendants.cobros.length===1&&descendantTotal===162&&Object.entries(plan.descendants).every(([c,rows])=>rows.every(row=>exactParity(row,plan.targetMaps[c])))&&plan.planDigest===EXPECTED.planDigest;
}

let app,db,batchCommitted=false;const createdRefs=[];
const result={schemaVersion:'orbit360-policies-held-parents-controlled-write-evidence-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'',authorizationRef:AUTH_REF,requestVerified:false,lifecycleVerified:false,digestsVerified:false,planVerified:false,snapshot:{created:false,private:false,entries:0,digest:'',pathStoredInArtifact:false},before:{},after:{},plan:{createClients:0,createInsurers:0,createDocuments:0,updateDocuments:0,overwriteDocuments:0,preserveRequiresValidation:0,affectedPolicies:0,affectedDescendants:0,dryRunPlanDigest:'',expectedPostTargetDigest:'',unresolvedBatchReferences:0},execution:{attempted:false,atomicBatchesPlanned:1,atomicBatchesCommitted:0,createdDocuments:0,createOnly:true,overwriteAttempts:0,idempotencyMode:'SINGLE_ATOMIC_BATCH_CREATE_PRECONDITION_PLUS_SNAPSHOT_DIGEST'},postVerification:{executed:false,countsMatch:false,contentMatch:false,sourceUnchanged:false,createdPayloadsMatch:false,requiresValidationPreserved:false,affectedPoliciesVerified:0,affectedDescendantsVerified:0,allPolicyRelationsResolved:false},rollback:{requiredOnFailure:true,executed:false,deletedDocuments:0,restoredSnapshot:false},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,frontendAdapted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
async function rollback(){if(!db||!batchCommitted||!createdRefs.length)return;result.rollback.executed=true;const batch=db.batch();for(const ref of createdRefs)batch.delete(ref);await batch.commit();result.firestoreWrites+=createdRefs.length;result.rollback.deletedDocuments=createdRefs.length;const restored=await readState(db);result.rollback.restoredSnapshot=globalDigest(summarize(restored.target))===EXPECTED.targetBeforeDigest;if(!result.rollback.restoredSnapshot)throw new Error('SECURITY_FAILURE:ROLLBACK_SNAPSHOT_MISMATCH');}

try{
  const requestPath=process.env.ORBIT360_REQUEST_FILE||'',lifecyclePath=process.env.ORBIT360_LIFECYCLE_FILE||'';if(!requestPath||!lifecyclePath||!fs.existsSync(requestPath)||!fs.existsSync(lifecyclePath))throw new Error('ENVIRONMENT_FAILURE:CONTROL_FILES_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8')),lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(request.schemaVersion!=='orbit360-policies-held-parents-controlled-write-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.consumed!==false||request.authorizationRef!==AUTH_REF||request.allowedExecutions!==1)throw new Error('SECURITY_FAILURE:REQUEST_INVALID');
  if(request.scope?.createClients!==16||request.scope?.createInsurers!==4||request.scope?.createDocuments!==20||request.scope?.updateDocuments!==0||request.scope?.preserveRequiresValidation!==20||request.scope?.verifyAffectedPolicies!==75||request.scope?.verifyAffectedDescendants!==162)throw new Error('SECURITY_FAILURE:REQUEST_SCOPE');result.requestVerified=true;
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='POLICIES_HELD_PARENTS_CONTROLLED_WRITE_AUTHORIZED'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_APPLY'||lifecycle.executionProfile?.capabilities?.writes!==true||lifecycle.guards?.operationalWritesAllowed!==20||lifecycle.guards?.updatesAllowed!==0||lifecycle.guards?.overwritesAllowed!==0||lifecycle.authorization?.consumed!==false)throw new Error('SECURITY_FAILURE:LIFECYCLE_INVALID');result.lifecycleVerified=true;
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:WRITE_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});db=getFirestore(app);db.settings({ignoreUndefinedProperties:true});result.firestoreRead=true;

  const state=await readState(db),sourceSummary=summarize(state.source),targetSummary=summarize(state.target);for(const c of COLLECTIONS){if(state.source[c].length!==EXPECTED.source[c]||state.target[c].length!==EXPECTED.targetBefore[c])throw new Error(`DATA_CONTRACT_FAILURE:PREWRITE_COUNT_DRIFT_${c}`);result.before[c]={source:state.source[c].length,target:state.target[c].length,targetIdDigest:targetSummary[c].idDigest,targetContentDigest:targetSummary[c].contentDigest};}
  const sourceDigest=globalDigest(sourceSummary),targetBeforeDigest=globalDigest(targetSummary);if(sourceDigest!==EXPECTED.sourceDigest||targetBeforeDigest!==EXPECTED.targetBeforeDigest||request.digests?.sourceSnapshot!==sourceDigest||request.digests?.targetSnapshotBefore!==targetBeforeDigest||request.digests?.dryRunPlan!==EXPECTED.planDigest)throw new Error('DATA_CONTRACT_FAILURE:SNAPSHOT_OR_PLAN_DIGEST_MISMATCH');result.digestsVerified=true;
  result.snapshot={created:true,private:true,entries:COLLECTIONS.reduce((n,c)=>n+state.target[c].length,0),digest:targetBeforeDigest,pathStoredInArtifact:false};const privateSnapshotPath=path.join(process.env.RUNNER_TEMP||'/tmp',`orbit360-held-parents-target-snapshot-${process.pid}.json`);fs.writeFileSync(privateSnapshotPath,JSON.stringify(Object.fromEntries(COLLECTIONS.map(c=>[c,state.target[c].map(row=>({id:row.id,digest:rowHash(row.id,row.data)}))])),null,2),'utf8');

  const plan=buildPlan(state.source,state.target);if(!verifyPlan(plan))throw new Error('DATA_CONTRACT_FAILURE:DRYRUN_PLAN_RECOMPUTE_MISMATCH');result.planVerified=true;
  const creates=[];for(const id of [...plan.heldClients].sort())creates.push({collection:'clientes',id,data:plan.sourceMaps.clientes.get(id)});for(const id of [...plan.heldInsurers].sort())creates.push({collection:'aseguradoras',id,data:plan.sourceMaps.aseguradoras.get(id)});
  const [canonicalBatchSnap,legacyBatchSnap]=await Promise.all([db.collection('tenants').doc(TENANT).collection('importBatches').get(),db.collection('tenantId').doc(TENANT).collection('importBatches').get()]),knownBatches=new Set([...canonicalBatchSnap.docs.map(doc=>doc.id),...legacyBatchSnap.docs.map(doc=>doc.id)]);let unresolvedBatchReferences=0;for(const item of creates)for(const ref of batchReferences(item.data))if(!knownBatches.has(ref))unresolvedBatchReferences++;if(unresolvedBatchReferences!==0)throw new Error('DATA_CONTRACT_FAILURE:UNRESOLVED_BATCH_REFERENCE_IN_HELD_PARENT');
  const expectedTargetRows=Object.fromEntries(COLLECTIONS.map(c=>[c,[...state.target[c]]]));for(const item of creates)expectedTargetRows[item.collection].push({id:item.id,data:item.data});const expectedAfterSummary=summarize(expectedTargetRows);
  result.plan={createClients:16,createInsurers:4,createDocuments:20,updateDocuments:0,overwriteDocuments:0,preserveRequiresValidation:20,affectedPolicies:75,affectedDescendants:162,dryRunPlanDigest:plan.planDigest,expectedPostTargetDigest:globalDigest(expectedAfterSummary),unresolvedBatchReferences};
  result.cumulativeVisualGuard=visualManifest(ROOT);if(result.cumulativeVisualGuard.manifestMatches!==true)throw new Error('DATA_CONTRACT_FAILURE:CUMULATIVE_VISUAL_DRIFT');

  result.execution.attempted=true;const writeBatch=db.batch();for(const item of creates){const ref=db.collection('tenants').doc(TENANT).collection('data').doc(item.collection).collection('items').doc(item.id);writeBatch.create(ref,item.data);createdRefs.push(ref);}await writeBatch.commit();batchCommitted=true;result.execution.atomicBatchesCommitted=1;result.execution.createdDocuments=20;result.firestoreWrites=20;result.operationalWrites=20;

  result.postVerification.executed=true;const afterState=await readState(db),afterSourceSummary=summarize(afterState.source),afterTargetSummary=summarize(afterState.target),afterMaps=Object.fromEntries(COLLECTIONS.map(c=>[c,new Map(afterState.target[c].map(row=>[row.id,row.data]))])),afterSets=Object.fromEntries(COLLECTIONS.map(c=>[c,new Set(afterMaps[c].keys())]));let countsMatch=true,contentMatch=true;
  for(const c of COLLECTIONS){result.after[c]={source:afterState.source[c].length,target:afterState.target[c].length,targetIdDigest:afterTargetSummary[c].idDigest,targetContentDigest:afterTargetSummary[c].contentDigest};if(afterState.target[c].length!==EXPECTED.targetAfter[c])countsMatch=false;if(afterTargetSummary[c].contentDigest!==expectedAfterSummary[c].contentDigest||afterTargetSummary[c].idDigest!==expectedAfterSummary[c].idDigest)contentMatch=false;}
  let createdPayloadsMatch=true,validationPreserved=true;for(const item of creates){const targetData=afterMaps[item.collection].get(item.id);if(!targetData||rowHash(item.id,targetData)!==rowHash(item.id,item.data))createdPayloadsMatch=false;if(validationCategory(targetData)!=='REQUIRES_VALIDATION')validationPreserved=false;}
  let allPolicyRelationsResolved=true,allPolicyPayloadsExact=true;for(const row of state.source.polizas){const client=resolveRelation(row.data,plan.sourceSets.clientes,/(cliente|contratante|asegurado|customer|client)/i),insurer=resolveRelation(row.data,plan.sourceSets.aseguradoras,/(aseguradora|insurer|compania|company)/i);if(client.status!=='RESOLVED'||insurer.status!=='RESOLVED'||!afterSets.clientes.has(client.id)||!afterSets.aseguradoras.has(insurer.id))allPolicyRelationsResolved=false;if(!exactParity(row,afterMaps.polizas))allPolicyPayloadsExact=false;}
  let affectedPoliciesVerified=0;for(const {row,clientId,insurerId} of plan.affectedPolicies.values())if(exactParity(row,afterMaps.polizas)&&afterSets.clientes.has(clientId)&&afterSets.aseguradoras.has(insurerId))affectedPoliciesVerified++;
  let affectedDescendantsVerified=0;for(const [c,rows] of Object.entries(plan.descendants))for(const row of rows)if(exactParity(row,afterMaps[c]))affectedDescendantsVerified++;
  result.postVerification={executed:true,countsMatch,contentMatch,sourceUnchanged:globalDigest(afterSourceSummary)===sourceDigest,createdPayloadsMatch,requiresValidationPreserved:validationPreserved,affectedPoliciesVerified,affectedDescendantsVerified,allPolicyRelationsResolved:allPolicyRelationsResolved&&allPolicyPayloadsExact};
  if(!countsMatch||!contentMatch||!result.postVerification.sourceUnchanged||!createdPayloadsMatch||!validationPreserved||affectedPoliciesVerified!==75||affectedDescendantsVerified!==162||!result.postVerification.allPolicyRelationsResolved||globalDigest(afterTargetSummary)!==result.plan.expectedPostTargetDigest)throw new Error('DATA_CONTRACT_FAILURE:POST_VERIFICATION');
  result.status='POLICIES_HELD_PARENTS_CONTROLLED_WRITE_PASS';result.classification='GO_LAB_HELD_PARENTS_CONTROLLED_WRITE_CLOSED';result.ok=true;try{fs.rmSync(privateSnapshotPath,{force:true});}catch{}
}catch(error){result.status='POLICIES_HELD_PARENTS_CONTROLLED_WRITE_FAIL';result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';result.error=safeError(error);try{await rollback();}catch(rollbackError){result.rollback.error=safeError(rollbackError);result.classification='SECURITY_FAILURE';}result.ok=false;}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
