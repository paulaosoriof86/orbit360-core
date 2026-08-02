#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault, getApps, initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT, PROJECT, COLLECTIONS, EXPECTED} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows, compareState, visualManifest, safeError, text, sha, normalizeRaw} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {planDocument, accumulatePlan, planDigest, batchReferences} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT=process.cwd();
const GATE='block7-policies-canonical-controlled-write-lab-v20260801';
const VERSION='7.5.0';
const AUTH_REF='user_authorized_canonical_controlled_write_4377_20260801';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-canonical-controlled-write-lab-v20260801.json');
const EXPECTED_DIGESTS={source:'88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d',target:'9ec5e02509d6fa3cfc1450de8db42e0fd71c0d52e612bd6d9c0119186fc5f3d8',plan:'bd1852e73c21c61d98baed4bda129b027cd1a3ec2a265b6749dbc7c0eb25df47'};
const EXPECTED_CREATE={clientes:0,aseguradoras:0,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5};
const CHUNK=400;

function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function emptySummary(){return {actions:{CREATE:0,UPDATE:0,OMIT:0,HOLD:0},reasons:{},validation:{},batchReferences:{NORMALIZE:0,OMIT:0,HOLD:0,NONE:0},relationships:{}};}
function rowContentDigest(rows){const ordered=[...rows].sort((a,b)=>a.id.localeCompare(b.id));return sha(ordered.map(row=>`${row.id}:${sha(JSON.stringify({id:row.id,data:normalizeRaw(row.data)}))}`).join('\n'));}
function rowIdDigest(rows){return sha([...rows].map(row=>row.id).sort().join('\n'));}
function cloneWithoutUnresolvedBatchRefs(value,batchIndex,counter,key=''){
  if(value===null||value===undefined)return value;
  if(typeof value!=='object')return value;
  if(typeof value.toDate==='function'||(typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name))||Buffer.isBuffer(value)||value instanceof Uint8Array)return value;
  if(Array.isArray(value))return value.map(item=>cloneWithoutUnresolvedBatchRefs(item,batchIndex,counter,key));
  const out={};
  for(const [childKey,child] of Object.entries(value)){
    if(/(?:import.*batch.*id|batch.*id|importBatchId)/i.test(childKey)){
      const values=Array.isArray(child)?child:[child];
      const kept=[];
      for(const item of values){
        const raw=text(item&&typeof item.path==='string'?item.path:item);const ref=raw.includes('/')?(raw.split('/').filter(Boolean).pop()||raw):raw;
        if(ref&&(batchIndex.canonical.has(ref)||batchIndex.legacy.has(ref)))kept.push(item);else if(ref)counter.removed++;
      }
      if(Array.isArray(child)){if(kept.length)out[childKey]=kept;}
      else if(kept.length)out[childKey]=kept[0];
      continue;
    }
    out[childKey]=cloneWithoutUnresolvedBatchRefs(child,batchIndex,counter,childKey);
  }
  return out;
}
function chunk(items,size=CHUNK){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out;}
async function readCollections(db){const snapshots={};const parentSets={};for(const collection of COLLECTIONS){const [canonicalSnap,legacySnap]=await Promise.all([db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get(),db.collection('tenantId').doc(TENANT).collection(collection).get()]);const canonicalRows=snapshotRows(canonicalSnap),legacyRows=snapshotRows(legacySnap),state=compareState(canonicalRows,legacyRows);snapshots[collection]={canonicalRows,legacyRows,state};parentSets[collection]=new Set(legacyRows.map(row=>row.id));}return {snapshots,parentSets};}
async function targetSnapshot(db){const byCollection={};for(const collection of COLLECTIONS){const snap=await db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get();const rows=snapshotRows(snap);byCollection[collection]={rows,count:rows.length,idDigest:rowIdDigest(rows),contentDigest:rowContentDigest(rows)};}return byCollection;}
function globalDigest(snapshot,kind){return sha(COLLECTIONS.map(collection=>`${collection}:${snapshot[collection][kind]}`).join('\n'));}

let app;let db;const committed=[];
const result={schemaVersion:'orbit360-policies-canonical-controlled-write-evidence-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'',authorizationRef:AUTH_REF,requestVerified:false,lifecycleVerified:false,digestsVerified:false,planVerified:false,snapshot:{created:false,private:false,entries:0,digest:'',pathStoredInArtifact:false},before:{},after:{},plan:{create:0,update:0,omit:0,hold:0,byCollection:{},sourceSnapshotDigest:'',targetSnapshotDigest:'',planSetDigest:'',expectedPostTargetDigest:'',unresolvedBatchReferencesRemoved:0},execution:{attempted:false,batchesPlanned:0,batchesCommitted:0,createdDocuments:0,createOnly:true,overwriteAttempts:0,idempotencyMode:'CREATE_PRECONDITION_PLUS_SNAPSHOT_DIGEST'},postVerification:{executed:false,countsMatch:false,contentMatch:false,sourceUnchanged:false,createdPayloadsMatch:false},rollback:{requiredOnFailure:true,executed:false,deletedDocuments:0,restoredSnapshot:false},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,seedDeletionExecuted:false,frontendAdapted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};

async function rollback(){if(!db||!committed.length)return;result.rollback.executed=true;for(const group of chunk([...committed].reverse())){const batch=db.batch();for(const item of group)batch.delete(item.ref);await batch.commit();result.firestoreWrites+=group.length;result.rollback.deletedDocuments+=group.length;}const restored=await targetSnapshot(db);result.rollback.restoredSnapshot=globalDigest(restored,'contentDigest')===EXPECTED_DIGESTS.target;if(!result.rollback.restoredSnapshot)throw new Error('SECURITY_FAILURE:ROLLBACK_SNAPSHOT_MISMATCH');}

try{
  const requestPath=process.env.ORBIT360_REQUEST_FILE||'';const lifecyclePath=process.env.ORBIT360_LIFECYCLE_FILE||'';
  if(!requestPath||!lifecyclePath||!fs.existsSync(requestPath)||!fs.existsSync(lifecyclePath))throw new Error('ENVIRONMENT_FAILURE:CONTROL_FILES_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8')),lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(request.schemaVersion!=='orbit360-policies-canonical-controlled-write-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.consumed!==false||request.authorizationRef!==AUTH_REF||request.allowedExecutions!==1)throw new Error('SECURITY_FAILURE:REQUEST_INVALID');
  if(request.scope?.createDocuments!==4377||request.scope?.writeHoldDocuments!==false||request.scope?.deleteSeeds!==false||request.scope?.writeUnresolvedImportBatchReferences!==false)throw new Error('SECURITY_FAILURE:REQUEST_SCOPE');
  result.requestVerified=true;
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='POLICIES_CANONICAL_CONTROLLED_WRITE_AUTHORIZED'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_APPLY'||lifecycle.executionProfile?.capabilities?.writes!==true||lifecycle.guards?.operationalWritesAllowed!==4377||lifecycle.authorization?.consumed!==false)throw new Error('SECURITY_FAILURE:LIFECYCLE_INVALID');
  result.lifecycleVerified=true;
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:WRITE_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});db=getFirestore(app);db.settings({ignoreUndefinedProperties:true});result.firestoreRead=true;

  const [canonicalBatchSnap,legacyBatchSnap]=await Promise.all([db.collection('tenants').doc(TENANT).collection('importBatches').get(),db.collection('tenantId').doc(TENANT).collection('importBatches').get()]);
  const batchIndex={canonical:new Set(canonicalBatchSnap.docs.map(doc=>doc.id)),legacy:new Set(legacyBatchSnap.docs.map(doc=>doc.id))};
  const {snapshots,parentSets}=await readCollections(db);
  const sourceCollectionDigests={},targetCollectionDigests={};
  for(const collection of COLLECTIONS){const {canonicalRows,legacyRows,state}=snapshots[collection],expected=EXPECTED[collection];for(const key of ['canonicalCount','legacyCount','sharedIds','onlyCanonical','onlyLegacy','canonicalIdSetDigest','legacyIdSetDigest','canonicalContentDigest','legacyContentDigest'])if(state[key]!==expected[key])throw new Error(`DATA_CONTRACT_FAILURE:PREWRITE_DRIFT_${collection}_${key}`);sourceCollectionDigests[collection]=rowContentDigest(legacyRows);targetCollectionDigests[collection]=rowContentDigest(canonicalRows);result.before[collection]={source:legacyRows.length,target:canonicalRows.length,targetIdDigest:rowIdDigest(canonicalRows),targetContentDigest:targetCollectionDigests[collection]};}
  const sourceSnapshotDigest=sha(COLLECTIONS.map(c=>`${c}:${sourceCollectionDigests[c]}`).join('\n'));
  const targetSnapshotDigest=sha(COLLECTIONS.map(c=>`${c}:${targetCollectionDigests[c]}`).join('\n'));
  if(sourceSnapshotDigest!==EXPECTED_DIGESTS.source||targetSnapshotDigest!==EXPECTED_DIGESTS.target||request.digests?.sourceSnapshot!==sourceSnapshotDigest||request.digests?.targetSnapshot!==targetSnapshotDigest)throw new Error('DATA_CONTRACT_FAILURE:SNAPSHOT_DIGEST_MISMATCH');
  result.digestsVerified=true;result.snapshot={created:true,private:true,entries:COLLECTIONS.reduce((n,c)=>n+snapshots[c].canonicalRows.length,0),digest:targetSnapshotDigest,pathStoredInArtifact:false};
  const privateSnapshotPath=path.join(process.env.RUNNER_TEMP||'/tmp',`orbit360-canonical-target-snapshot-${process.pid}.json`);fs.writeFileSync(privateSnapshotPath,JSON.stringify(Object.fromEntries(COLLECTIONS.map(c=>[c,snapshots[c].canonicalRows.map(row=>({id:row.id,digest:sha(JSON.stringify(normalizeRaw(row.data)))}))])),null,2),'utf8');

  const global=emptySummary(),digestRows=[],creates=[];let canonicalSeedHolds=0,preservedAdditional=0;
  for(const collection of COLLECTIONS){const {canonicalRows,legacyRows,state}=snapshots[collection];const canonicalMap=new Map(canonicalRows.map(row=>[row.id,row.data]));const collectionSummary=emptySummary();for(const row of legacyRows){const presence=canonicalMap.has(row.id)?'SHARED':'LEGACY_ONLY';const plan=planDocument({collection,id:row.id,legacyData:row.data,canonicalData:canonicalMap.get(row.id),presence,batchIndex,parentSets});accumulatePlan(collectionSummary,plan);accumulatePlan(global,plan);digestRows.push(`${collection}|${sha(row.id)}|${presence}|${plan.action}|${plan.reason}|${plan.validation}|${JSON.stringify(plan.relationship.groups)}|${JSON.stringify(plan.batch.counts)}`);if(plan.reason==='PRESERVE_ADDITIONAL_REQUIRES_VALIDATION')preservedAdditional++;if(plan.action==='CREATE'){const counter={removed:0};const data=cloneWithoutUnresolvedBatchRefs(row.data,batchIndex,counter);for(const ref of batchReferences(data))if(!batchIndex.canonical.has(ref)&&!batchIndex.legacy.has(ref))throw new Error('DATA_CONTRACT_FAILURE:UNRESOLVED_BATCH_REF_REMAINED');result.plan.unresolvedBatchReferencesRemoved+=counter.removed;creates.push({collection,id:row.id,data});}}
    for(const id of state.onlyCanonicalIds){const plan=planDocument({collection,id,legacyData:null,canonicalData:canonicalMap.get(id),presence:'CANONICAL_ONLY',batchIndex,parentSets});accumulatePlan(collectionSummary,plan);accumulatePlan(global,plan);digestRows.push(`${collection}|${sha(id)}|CANONICAL_ONLY|${plan.action}|${plan.reason}|${plan.validation}|{}|${JSON.stringify(plan.batch.counts)}`);if(plan.reason==='QUARANTINE_CANONICAL_SEED_NO_DELETE')canonicalSeedHolds++;}
    result.plan.byCollection[collection]={...collectionSummary.actions};if(collectionSummary.actions.CREATE!==EXPECTED_CREATE[collection])throw new Error(`DATA_CONTRACT_FAILURE:CREATE_COUNT_${collection}`);
  }
  const planSetDigest=planDigest(digestRows);if(planSetDigest!==EXPECTED_DIGESTS.plan||request.digests?.planSet!==planSetDigest)throw new Error('DATA_CONTRACT_FAILURE:PLAN_DIGEST_MISMATCH');
  if(global.actions.CREATE!==4377||global.actions.UPDATE!==0||global.actions.OMIT!==440||global.actions.HOLD!==25||creates.length!==4377||canonicalSeedHolds!==5||preservedAdditional!==20)throw new Error('DATA_CONTRACT_FAILURE:PLAN_TOTALS');
  result.plan={...result.plan,create:global.actions.CREATE,update:global.actions.UPDATE,omit:global.actions.OMIT,hold:global.actions.HOLD,sourceSnapshotDigest,targetSnapshotDigest,planSetDigest};result.planVerified=true;

  const expectedPost={};for(const collection of COLLECTIONS){const rows=[...snapshots[collection].canonicalRows];for(const item of creates.filter(x=>x.collection===collection))rows.push({id:item.id,data:item.data});expectedPost[collection]={count:rows.length,contentDigest:rowContentDigest(rows),idDigest:rowIdDigest(rows)};}
  result.plan.expectedPostTargetDigest=globalDigest(expectedPost,'contentDigest');result.cumulativeVisualGuard=visualManifest(ROOT);if(result.cumulativeVisualGuard.manifestMatches!==true)throw new Error('DATA_CONTRACT_FAILURE:CUMULATIVE_VISUAL_DRIFT');

  result.execution.attempted=true;const groups=chunk(creates);result.execution.batchesPlanned=groups.length;
  for(const group of groups){const batch=db.batch();for(const item of group){const ref=db.collection('tenants').doc(TENANT).collection('data').doc(item.collection).collection('items').doc(item.id);batch.create(ref,item.data);}await batch.commit();for(const item of group){const ref=db.collection('tenants').doc(TENANT).collection('data').doc(item.collection).collection('items').doc(item.id);committed.push({ref,collection:item.collection,id:item.id});}result.execution.batchesCommitted++;result.execution.createdDocuments+=group.length;result.firestoreWrites+=group.length;result.operationalWrites+=group.length;}

  result.postVerification.executed=true;const after=await targetSnapshot(db);let countsMatch=true,contentMatch=true;for(const collection of COLLECTIONS){result.after[collection]={target:after[collection].count,targetIdDigest:after[collection].idDigest,targetContentDigest:after[collection].contentDigest};if(after[collection].count!==expectedPost[collection].count)countsMatch=false;if(after[collection].contentDigest!==expectedPost[collection].contentDigest||after[collection].idDigest!==expectedPost[collection].idDigest)contentMatch=false;}
  const afterSource=(await readCollections(db)).snapshots;const afterSourceDigest=sha(COLLECTIONS.map(c=>`${c}:${rowContentDigest(afterSource[c].legacyRows)}`).join('\n'));
  result.postVerification.countsMatch=countsMatch;result.postVerification.contentMatch=contentMatch;result.postVerification.sourceUnchanged=afterSourceDigest===sourceSnapshotDigest;result.postVerification.createdPayloadsMatch=contentMatch;
  if(!countsMatch||!contentMatch||!result.postVerification.sourceUnchanged||result.execution.createdDocuments!==4377)throw new Error('DATA_CONTRACT_FAILURE:POST_VERIFICATION');
  result.status='POLICIES_CANONICAL_CONTROLLED_WRITE_PASS';result.classification='GO_LAB_CANONICAL_CONTROLLED_WRITE_CLOSED';result.ok=true;
  try{fs.rmSync(privateSnapshotPath,{force:true});}catch{}
}catch(error){result.error=safeError(error);result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';try{if(committed.length)await rollback();result.status=result.rollback.executed&&result.rollback.restoredSnapshot?'POLICIES_CANONICAL_CONTROLLED_WRITE_ROLLED_BACK':'POLICIES_CANONICAL_CONTROLLED_WRITE_FAIL';}catch(rollbackError){result.rollback.error=safeError(rollbackError);result.status='POLICIES_CANONICAL_CONTROLLED_WRITE_ROLLBACK_FAILED';result.classification='SECURITY_FAILURE';}result.ok=false;}

save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
