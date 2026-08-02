#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT,PROJECT,COLLECTIONS} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows,compareState,sharedClassification,visualManifest,safeError,text,sha,normalizeRaw} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {validationCategory,seedLike,relationshipAudit,batchReferences} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT=process.cwd();
const GATE='block7-policies-canonical-postwrite-revalidation-readonly-v20260801';
const VERSION='7.6.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-canonical-postwrite-revalidation-readonly-v20260801.json');
const EXPECTED_SOURCE_DIGEST='88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d';
const EXPECTED_TARGET_DIGEST='724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305';
const EXPECTED={
  clientes:{source:430,target:414,shared:414,sourceOnly:16,targetOnly:0},
  aseguradoras:{source:30,target:26,shared:26,sourceOnly:4,targetOnly:0},
  polizas:{source:1373,target:1375,shared:1373,sourceOnly:0,targetOnly:2},
  vehiculos:{source:1032,target:1033,shared:1032,sourceOnly:0,targetOnly:1},
  recibosEsperados:{source:1294,target:1294,shared:1294,sourceOnly:0,targetOnly:0},
  carteraPrimas:{source:673,target:673,shared:673,sourceOnly:0,targetOnly:0},
  cobros:{source:5,target:7,shared:5,sourceOnly:0,targetOnly:2}
};
const CREATED_COLLECTIONS=new Set(['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros']);

function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function rowHash(id,data){return sha(JSON.stringify({id,data:normalizeRaw(data)}));}
function rowContentDigest(rows){return sha([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>`${row.id}:${rowHash(row.id,row.data)}`).join('\n'));}
function valueType(value){if(value===null)return'null';if(value===undefined)return'undefined';if(Array.isArray(value))return'array';if(value&&typeof value.toDate==='function')return'timestamp';if(value&&typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name))return'reference';if(Buffer.isBuffer(value)||value instanceof Uint8Array)return'bytes';return typeof value;}
function schemaSignature(data){const rows=[];for(const [key,value] of Object.entries(data||{}).sort(([a],[b])=>a.localeCompare(b)))rows.push(`${key}:${valueType(value)}`);return sha(rows.join('\n'));}
function aggregateSchema(rows){const fields={};for(const row of rows){for(const [key,value] of Object.entries(row.data||{})){const item=fields[key]||(fields[key]={present:0,types:{}});item.present++;const type=valueType(value);item.types[type]=(item.types[type]||0)+1;}}return {fieldCount:Object.keys(fields).length,digest:sha(JSON.stringify(fields))};}
function globalDigest(byCollection){return sha(COLLECTIONS.map(collection=>`${collection}:${byCollection[collection]}`).join('\n'));}

let app;
const result={schemaVersion:'orbit360-policies-canonical-postwrite-revalidation-readonly-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'DATA_CONTRACT_REVALIDATION',tenantId:TENANT,projectId:PROJECT,countryFilterApplied:false,collections:{},summary:{},digests:{},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,frontendAdapted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:POSTWRITE_REVALIDATION_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  const db=getFirestore(app);result.firestoreRead=true;
  const [canonicalBatchSnap,legacyBatchSnap]=await Promise.all([db.collection('tenants').doc(TENANT).collection('importBatches').get(),db.collection('tenantId').doc(TENANT).collection('importBatches').get()]);
  const batchIndex={canonical:new Set(canonicalBatchSnap.docs.map(doc=>doc.id)),legacy:new Set(legacyBatchSnap.docs.map(doc=>doc.id))};
  const snapshots={};const operationalParentSets={};const sourceDigests={};const targetDigests={};
  for(const collection of COLLECTIONS){
    const [targetSnap,sourceSnap]=await Promise.all([db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get(),db.collection('tenantId').doc(TENANT).collection(collection).get()]);
    const targetRows=snapshotRows(targetSnap),sourceRows=snapshotRows(sourceSnap),state=compareState(targetRows,sourceRows),expected=EXPECTED[collection];
    for(const [key,value] of Object.entries({canonicalCount:expected.target,legacyCount:expected.source,sharedIds:expected.shared,onlyCanonical:expected.targetOnly,onlyLegacy:expected.sourceOnly}))if(state[key]!==value)throw new Error(`DATA_CONTRACT_FAILURE:POSTWRITE_COUNT_OR_ID_DRIFT_${collection}_${key}`);
    snapshots[collection]={targetRows,sourceRows,state};
    operationalParentSets[collection]=new Set(state.shared);
    sourceDigests[collection]=rowContentDigest(sourceRows);targetDigests[collection]=rowContentDigest(targetRows);
  }
  const sourceSnapshotDigest=globalDigest(sourceDigests),targetSnapshotDigest=globalDigest(targetDigests);
  result.digests={sourceSnapshotDigest,targetSnapshotDigest};
  if(sourceSnapshotDigest!==EXPECTED_SOURCE_DIGEST)throw new Error('DATA_CONTRACT_FAILURE:POSTWRITE_SOURCE_DIGEST_DRIFT');
  if(targetSnapshotDigest!==EXPECTED_TARGET_DIGEST)throw new Error('DATA_CONTRACT_FAILURE:POSTWRITE_TARGET_DIGEST_DRIFT');

  let totalSource=0,totalTarget=0,totalShared=0,totalExact=0,totalSemantic=0,totalCriticalConflicts=0,totalValidationMismatches=0,totalSourceOnlyHolds=0,totalTargetOnlySeeds=0,totalSchemaMismatches=0,totalRelationshipBlocked=0,totalUnresolvedBatchRefs=0;
  for(const collection of COLLECTIONS){
    const {targetRows,sourceRows,state}=snapshots[collection];
    const targetMap=new Map(targetRows.map(row=>[row.id,row.data])),sourceMap=new Map(sourceRows.map(row=>[row.id,row.data]));
    let exactParity=0,semanticParity=0,criticalConflicts=0,validationMismatches=0,sourceOnlyValidationHolds=0,targetOnlySeeds=0,createdSchemaMismatches=0,relationshipsBlocked=0,unresolvedBatchReferencesInCreated=0;
    for(const id of state.shared){
      const targetData=targetMap.get(id),sourceData=sourceMap.get(id);
      if(['clientes','aseguradoras'].includes(collection)){
        const classification=sharedClassification(collection,targetData,sourceData);
        if(classification.criticalDiffs.length)criticalConflicts++;
        else semanticParity++;
        if(!classification.validationSame)validationMismatches++;
      }else{
        if(rowHash(id,targetData)===rowHash(id,sourceData))exactParity++;
        else exactParity-=1000000;
        if(schemaSignature(targetData)!==schemaSignature(sourceData))createdSchemaMismatches++;
        if(validationCategory(targetData)!==validationCategory(sourceData))validationMismatches++;
        const relation=relationshipAudit(collection,targetData,operationalParentSets);
        if(!relation.eligible)relationshipsBlocked++;
        if(CREATED_COLLECTIONS.has(collection))for(const ref of batchReferences(targetData))if(!batchIndex.canonical.has(ref)&&!batchIndex.legacy.has(ref))unresolvedBatchReferencesInCreated++;
      }
    }
    for(const id of state.onlyLegacyIds)if(validationCategory(sourceMap.get(id))==='REQUIRES_VALIDATION')sourceOnlyValidationHolds++;
    for(const id of state.onlyCanonicalIds)if(seedLike(targetMap.get(id)))targetOnlySeeds++;
    if(['clientes','aseguradoras'].includes(collection)&&semanticParity!==state.sharedIds)throw new Error(`DATA_CONTRACT_FAILURE:SEMANTIC_PARITY_${collection}`);
    if(CREATED_COLLECTIONS.has(collection)&&exactParity!==state.sharedIds)throw new Error(`DATA_CONTRACT_FAILURE:EXACT_CREATED_PARITY_${collection}`);
    if(sourceOnlyValidationHolds!==state.onlyLegacy)throw new Error(`DATA_CONTRACT_FAILURE:HOLD_VALIDATION_${collection}`);
    if(targetOnlySeeds!==state.onlyCanonical)throw new Error(`DATA_CONTRACT_FAILURE:SEED_CLASSIFICATION_${collection}`);
    if(criticalConflicts||validationMismatches||createdSchemaMismatches||relationshipsBlocked||unresolvedBatchReferencesInCreated)throw new Error(`DATA_CONTRACT_FAILURE:POSTWRITE_SEMANTIC_OR_RELATION_${collection}`);
    const sourceSchema=aggregateSchema(sourceRows),targetSchema=aggregateSchema(targetRows);
    result.collections[collection]={sourceCount:state.legacyCount,targetCount:state.canonicalCount,operationalSharedIds:state.sharedIds,sourceOnlyValidationHolds,targetOnlySeeds,exactCreatedParity:exactParity,semanticProjectionParity:semanticParity,criticalConflicts,validationMismatches,createdSchemaMismatches,relationshipsBlocked,unresolvedBatchReferencesInCreated,sourceSchemaFieldCount:sourceSchema.fieldCount,targetSchemaFieldCount:targetSchema.fieldCount,sourceSchemaDigest:sourceSchema.digest,targetSchemaDigest:targetSchema.digest,projectionSchemaDifferenceExpected:['clientes','aseguradoras'].includes(collection)};
    totalSource+=state.legacyCount;totalTarget+=state.canonicalCount;totalShared+=state.sharedIds;totalExact+=Math.max(0,exactParity);totalSemantic+=semanticParity;totalCriticalConflicts+=criticalConflicts;totalValidationMismatches+=validationMismatches;totalSourceOnlyHolds+=sourceOnlyValidationHolds;totalTargetOnlySeeds+=targetOnlySeeds;totalSchemaMismatches+=createdSchemaMismatches;totalRelationshipBlocked+=relationshipsBlocked;totalUnresolvedBatchRefs+=unresolvedBatchReferencesInCreated;
  }
  result.cumulativeVisualGuard=visualManifest(ROOT);
  result.summary={collectionCount:COLLECTIONS.length,totalSource,totalTarget,operationalSharedIds:totalShared,exactCreatedParity:totalExact,semanticProjectionParity:totalSemantic,criticalConflicts:totalCriticalConflicts,validationMismatches:totalValidationMismatches,legacyOnlyValidationHolds:totalSourceOnlyHolds,canonicalOnlySeedHolds:totalTargetOnlySeeds,createdSchemaMismatches:totalSchemaMismatches,relationshipBlockedDocuments:totalRelationshipBlocked,unresolvedBatchReferencesInCreated:totalUnresolvedBatchRefs,holdExclusionConfirmed:totalSourceOnlyHolds===20&&totalTargetOnlySeeds===5,evidenceComplete:totalSource===4837&&totalTarget===4822&&totalShared===4817&&totalExact===4377&&totalSemantic===440&&totalCriticalConflicts===0&&totalValidationMismatches===0&&totalSourceOnlyHolds===20&&totalTargetOnlySeeds===5&&totalSchemaMismatches===0&&totalRelationshipBlocked===0&&totalUnresolvedBatchRefs===0&&result.cumulativeVisualGuard.manifestMatches===true};
  if(!result.summary.evidenceComplete)throw new Error('DATA_CONTRACT_FAILURE:POSTWRITE_REVALIDATION_INCOMPLETE');
  result.status='POLICIES_CANONICAL_POSTWRITE_REVALIDATION_READONLY_PASS';result.classification='GO_LAB_CANONICAL_POSTWRITE_REVALIDATED';result.ok=true;
}catch(error){result.status='POLICIES_CANONICAL_POSTWRITE_REVALIDATION_READONLY_FAIL';result.classification=error instanceof ReferenceError?'VALIDATOR_STALE':(text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
