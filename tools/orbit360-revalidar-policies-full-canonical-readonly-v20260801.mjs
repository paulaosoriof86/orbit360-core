#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT,PROJECT,COLLECTIONS,PROVENANCE_KEYS,VALIDATION_KEYS,TECHNICAL_KEYS} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows,compareState,sharedClassification,visualManifest,safeError,text,sha,normalizeRaw} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {validationCategory,seedLike,relationshipAudit} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT=process.cwd();
const GATE='block7-policies-full-canonical-revalidation-readonly-v20260801';
const VERSION='7.9.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-full-canonical-revalidation-readonly-v20260801.json');
const EXPECTED_SOURCE_DIGEST='88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d';
const EXPECTED_TARGET_DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';
const EXPECTED={
  clientes:{source:430,target:430,shared:430,onlyTarget:0,requiresValidation:16},
  aseguradoras:{source:30,target:30,shared:30,onlyTarget:0,requiresValidation:12},
  polizas:{source:1373,target:1375,shared:1373,onlyTarget:2,requiresValidation:1373},
  vehiculos:{source:1032,target:1033,shared:1032,onlyTarget:1,requiresValidation:60},
  recibosEsperados:{source:1294,target:1294,shared:1294,onlyTarget:0,requiresValidation:307},
  carteraPrimas:{source:673,target:673,shared:673,onlyTarget:0,requiresValidation:263},
  cobros:{source:5,target:7,shared:5,onlyTarget:2,requiresValidation:0}
};
const RELATION_EXPECTED={polizas:{documents:1373,groups:2746},vehiculos:{documents:1032,groups:1032},recibosEsperados:{documents:1294,groups:1294},carteraPrimas:{documents:673,groups:1346},cobros:{documents:5,groups:10}};
const IGNORED_SCHEMA_KEYS=new Set([...PROVENANCE_KEYS,...VALIDATION_KEYS,...TECHNICAL_KEYS]);

function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function rowHash(id,data){return sha(JSON.stringify({id,data:normalizeRaw(data)}));}
function rowContentDigest(rows){return sha([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>`${row.id}:${rowHash(row.id,row.data)}`).join('\n'));}
function globalDigest(collectionDigests){return sha(COLLECTIONS.map(collection=>`${collection}:${collectionDigests[collection]}`).join('\n'));}
function valueType(value){if(value===null)return'null';if(value===undefined)return'undefined';if(value&&typeof value.toDate==='function')return'timestamp';if(value&&typeof value.path==='string'&&value.constructor&&/DocumentReference/i.test(value.constructor.name))return'reference';if(Buffer.isBuffer(value)||value instanceof Uint8Array)return'bytes';if(Array.isArray(value))return'array';return typeof value==='object'?'object':typeof value;}
function schemaWalk(value,pathName='',output=[]){
  const type=valueType(value);output.push(`${pathName||'$'}:${type}`);
  if(type==='array'){for(const item of value)schemaWalk(item,`${pathName}[]`,output);return output;}
  if(type==='object'){for(const key of Object.keys(value||{}).sort()){if(IGNORED_SCHEMA_KEYS.has(key))continue;schemaWalk(value[key],pathName?`${pathName}.${key}`:key,output);}return output;}
  return output;
}
function businessSchemaDigest(data){return sha([...new Set(schemaWalk(data))].sort().join('\n'));}
function add(target,key,n=1){target[key]=(target[key]||0)+n;}

let app;
const result={schemaVersion:'orbit360-policies-full-canonical-revalidation-readonly-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'',digests:{},collections:{},parity:{exactPayloads:0,semanticEquivalentPayloads:0,criticalConflicts:0,nonEquivalentPayloads:0,businessSchemaMatches:0,businessSchemaMismatches:0,validationMatches:0,validationMismatches:0,operationalSeedMarkers:0},validation:{source:{},target:{},sourceRequiresValidation:0,targetRequiresValidation:0},targetOnlySeeds:{total:0,byCollection:{},allSeedLike:false},relations:{documents:0,requiredGroups:0,sourceResolvedGroups:0,targetResolvedGroups:0,sourceBlockedGroups:0,targetBlockedGroups:0,byCollection:{}},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,frontendAdapted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:FULL_CANONICAL_REVALIDATION_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);result.firestoreRead=true;
  const source={},target={},sourceDigests={},targetDigests={},sourceMaps={},targetMaps={},sourceSets={};
  for(const collection of COLLECTIONS){
    const [sourceSnap,targetSnap]=await Promise.all([db.collection('tenantId').doc(TENANT).collection(collection).get(),db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get()]);
    source[collection]=snapshotRows(sourceSnap);target[collection]=snapshotRows(targetSnap);sourceMaps[collection]=new Map(source[collection].map(row=>[row.id,row.data]));targetMaps[collection]=new Map(target[collection].map(row=>[row.id,row.data]));sourceSets[collection]=new Set(sourceMaps[collection].keys());
    sourceDigests[collection]=rowContentDigest(source[collection]);targetDigests[collection]=rowContentDigest(target[collection]);
    const state=compareState(target[collection],source[collection]),expected=EXPECTED[collection];
    if(state.legacyCount!==expected.source||state.canonicalCount!==expected.target||state.sharedIds!==expected.shared||state.onlyLegacy!==0||state.onlyCanonical!==expected.onlyTarget)throw new Error(`DATA_CONTRACT_FAILURE:FULL_CANONICAL_COUNTS_${collection}`);
    result.collections[collection]={source:state.legacyCount,target:state.canonicalCount,shared:state.sharedIds,sourceOnly:state.onlyLegacy,targetOnly:state.onlyCanonical};

    const validationSource={},validationTarget={};let exact=0,semantic=0,schemaMatches=0,validationMatches=0;
    for(const id of state.shared){
      const sourceData=sourceMaps[collection].get(id),targetData=targetMaps[collection].get(id);const sourceValidation=validationCategory(sourceData),targetValidation=validationCategory(targetData);add(validationSource,sourceValidation);add(validationTarget,targetValidation);
      if(seedLike(sourceData)||seedLike(targetData))result.parity.operationalSeedMarkers++;
      if(rowHash(id,sourceData)===rowHash(id,targetData))exact++;
      else{
        const shared=sharedClassification(collection,targetData,sourceData);
        if(['EQUIVALENT_PROJECTION','EQUIVALENT_PROJECTION_LEGACY_PROVENANCE_ONLY'].includes(shared.category))semantic++;
        else{result.parity.nonEquivalentPayloads++;if(shared.criticalDiffs.length)result.parity.criticalConflicts++;}
      }
      if(businessSchemaDigest(sourceData)===businessSchemaDigest(targetData))schemaMatches++;else result.parity.businessSchemaMismatches++;
      if(sourceValidation===targetValidation)validationMatches++;else result.parity.validationMismatches++;
    }
    const sourceRequires=validationSource.REQUIRES_VALIDATION||0,targetRequires=validationTarget.REQUIRES_VALIDATION||0;
    if(sourceRequires!==expected.requiresValidation||targetRequires!==expected.requiresValidation)throw new Error(`DATA_CONTRACT_FAILURE:VALIDATION_DISTRIBUTION_${collection}`);
    result.parity.exactPayloads+=exact;result.parity.semanticEquivalentPayloads+=semantic;result.parity.businessSchemaMatches+=schemaMatches;result.parity.validationMatches+=validationMatches;
    result.validation.source[collection]=validationSource;result.validation.target[collection]=validationTarget;result.validation.sourceRequiresValidation+=sourceRequires;result.validation.targetRequiresValidation+=targetRequires;

    let targetOnlySeedCount=0;for(const id of state.onlyCanonicalIds){if(!seedLike(targetMaps[collection].get(id)))throw new Error(`DATA_CONTRACT_FAILURE:TARGET_ONLY_NOT_SEED_${collection}`);targetOnlySeedCount++;}
    result.targetOnlySeeds.byCollection[collection]=targetOnlySeedCount;result.targetOnlySeeds.total+=targetOnlySeedCount;
  }

  const sourceSnapshotDigest=globalDigest(sourceDigests),targetSnapshotDigest=globalDigest(targetDigests);result.digests={sourceSnapshotDigest,targetSnapshotDigest,canonicalDigestSealed:targetSnapshotDigest};
  if(sourceSnapshotDigest!==EXPECTED_SOURCE_DIGEST||targetSnapshotDigest!==EXPECTED_TARGET_DIGEST)throw new Error('DATA_CONTRACT_FAILURE:FULL_CANONICAL_DIGEST_DRIFT');
  const sourceTotal=COLLECTIONS.reduce((n,c)=>n+source[c].length,0),targetTotal=COLLECTIONS.reduce((n,c)=>n+target[c].length,0),sharedTotal=COLLECTIONS.reduce((n,c)=>n+result.collections[c].shared,0);
  result.targetOnlySeeds.allSeedLike=result.targetOnlySeeds.total===5;
  if(sourceTotal!==4837||targetTotal!==4842||sharedTotal!==4837||result.targetOnlySeeds.total!==5||result.parity.exactPayloads+result.parity.semanticEquivalentPayloads!==4837||result.parity.nonEquivalentPayloads!==0||result.parity.criticalConflicts!==0||result.parity.businessSchemaMatches!==4837||result.parity.businessSchemaMismatches!==0||result.parity.validationMatches!==4837||result.parity.validationMismatches!==0||result.parity.operationalSeedMarkers!==0||result.validation.sourceRequiresValidation!==2031||result.validation.targetRequiresValidation!==2031)throw new Error('DATA_CONTRACT_FAILURE:FULL_CANONICAL_PARITY');

  for(const [collection,expected] of Object.entries(RELATION_EXPECTED)){
    let documents=0,requiredGroups=0,sourceResolved=0,targetResolved=0,sourceBlocked=0,targetBlocked=0;
    for(const row of source[collection]){
      const targetData=targetMaps[collection].get(row.id);if(!targetData)throw new Error(`DATA_CONTRACT_FAILURE:RELATION_TARGET_MISSING_${collection}`);
      const sourceAudit=relationshipAudit(collection,row.data,sourceSets),targetAudit=relationshipAudit(collection,targetData,sourceSets);documents++;requiredGroups+=sourceAudit.requiredGroups;sourceResolved+=sourceAudit.resolvedGroups;targetResolved+=targetAudit.resolvedGroups;sourceBlocked+=sourceAudit.blockedGroups;targetBlocked+=targetAudit.blockedGroups;
    }
    if(documents!==expected.documents||requiredGroups!==expected.groups||sourceResolved!==expected.groups||targetResolved!==expected.groups||sourceBlocked!==0||targetBlocked!==0)throw new Error(`DATA_CONTRACT_FAILURE:FULL_RELATIONS_${collection}`);
    result.relations.byCollection[collection]={documents,requiredGroups,sourceResolvedGroups:sourceResolved,targetResolvedGroups:targetResolved,sourceBlockedGroups:sourceBlocked,targetBlockedGroups:targetBlocked};result.relations.documents+=documents;result.relations.requiredGroups+=requiredGroups;result.relations.sourceResolvedGroups+=sourceResolved;result.relations.targetResolvedGroups+=targetResolved;result.relations.sourceBlockedGroups+=sourceBlocked;result.relations.targetBlockedGroups+=targetBlocked;
  }
  if(result.relations.documents!==4377||result.relations.requiredGroups!==6428||result.relations.sourceResolvedGroups!==6428||result.relations.targetResolvedGroups!==6428||result.relations.sourceBlockedGroups!==0||result.relations.targetBlockedGroups!==0)throw new Error('DATA_CONTRACT_FAILURE:FULL_RELATION_TOTALS');

  result.cumulativeVisualGuard=visualManifest(ROOT);if(result.cumulativeVisualGuard.manifestMatches!==true)throw new Error('DATA_CONTRACT_FAILURE:CUMULATIVE_VISUAL_DRIFT');
  result.summary={sourceDocuments:sourceTotal,targetDocuments:targetTotal,sharedOperationalIds:sharedTotal,targetOnlySeeds:result.targetOnlySeeds.total,exactPayloads:result.parity.exactPayloads,semanticEquivalentPayloads:result.parity.semanticEquivalentPayloads,businessSchemaMatches:result.parity.businessSchemaMatches,validationMatches:result.parity.validationMatches,requiresValidationPreserved:result.validation.sourceRequiresValidation,relationDocuments:result.relations.documents,relationGroupsResolved:result.relations.targetResolvedGroups,canonicalDigestSealed:targetSnapshotDigest,evidenceComplete:true};
  result.status='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_PASS';result.classification='GO_LAB_FULL_CANONICAL_REVALIDATED';result.ok=true;
}catch(error){result.status='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_FAIL';result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';result.error=safeError(error);result.ok=false;}
save(result);console.log(JSON.stringify(result,null,2));if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
