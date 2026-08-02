#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {TENANT,PROJECT,COLLECTIONS} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';
import {snapshotRows,visualManifest,safeError,text,sha,normalizeRaw} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
import {validationCategory,seedLike} from './orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';

const ROOT=process.cwd();
const GATE='block7-policies-hold-parent-dependency-diagnostic-readonly-v20260801';
const VERSION='7.7.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-hold-parent-dependency-diagnostic-readonly-v20260801.json');
const EXPECTED_SOURCE_DIGEST='88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d';
const EXPECTED_TARGET_DIGEST='724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305';
const EXPECTED_SOURCE={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5};
const EXPECTED_TARGET={clientes:414,aseguradoras:26,polizas:1375,vehiculos:1033,recibosEsperados:1294,carteraPrimas:673,cobros:7};

function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsDocumentIds:false,containsValues:false,containsSecrets:false},null,2)+'\n','utf8');}
function rowHash(id,data){return sha(JSON.stringify({id,data:normalizeRaw(data)}));}
function rowsDigest(rows){return sha([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>`${row.id}:${rowHash(row.id,row.data)}`).join('\n'));}
function globalDigest(byCollection){return sha(COLLECTIONS.map(collection=>`${collection}:${byCollection[collection]}`).join('\n'));}
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
  const values=primitives(data);const patterned=values.filter(item=>pattern.test(item.path));const candidates=new Set();
  for(const item of patterned){const ref=normalizeRef(item.value);if(known.has(ref))candidates.add(ref);}
  if(!candidates.size){for(const item of values){const ref=normalizeRef(item.value);if(known.has(ref))candidates.add(ref);}}
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
function add(map,key,n=1){map[key]=(map[key]||0)+n;}
function exactTargetParity(rows,targetMap){let exact=0,missing=0,mismatch=0;for(const row of rows){if(!targetMap.has(row.id)){missing++;continue;}if(rowHash(row.id,row.data)===rowHash(row.id,targetMap.get(row.id)))exact++;else mismatch++;}return{exact,missing,mismatch};}
function aggregateParentClassification(ids,sourceMap,usage){
  const categories={};const migratable=new Set(),correction=new Set(),unused=new Set();let validationHolds=0,sourceBackedCount=0,seedMarkers=0,referencedParents=0,totalPolicyLinks=0;
  const digestRows=[];
  for(const id of [...ids].sort()){
    const data=sourceMap.get(id),validation=validationCategory(data),backed=sourceBacked(data),seed=seedLike(data),links=usage.get(id)||0;
    if(validation==='REQUIRES_VALIDATION')validationHolds++;if(backed)sourceBackedCount++;if(seed)seedMarkers++;if(links>0){referencedParents++;totalPolicyLinks+=links;}
    let category;
    if(links===0){category='HOLD_NO_ACTIVE_POLICY_DEPENDENCY';unused.add(id);}
    else if(validation==='REQUIRES_VALIDATION'&&backed&&!seed){category='MIGRATE_RESTRICTED_PRESERVE_REQUIRES_VALIDACION';migratable.add(id);}
    else{category='CREATE_CORRECTION_MANAGEMENT_BEFORE_PARENT_MIGRATION';correction.add(id);}
    add(categories,category);digestRows.push(`${sha(id)}|${category}|${validation}|${backed?'1':'0'}|${seed?'1':'0'}|${links}`);
  }
  return{summary:{total:ids.size,validationHolds,sourceBacked:sourceBackedCount,seedMarkers,referencedParents,totalPolicyLinks,categories,digest:sha(digestRows.join('\n'))},migratable,correction,unused};
}

let app;
const result={schemaVersion:'orbit360-policies-hold-parent-dependency-diagnostic-readonly-v1',gateId:GATE,contractVersion:VERSION,status:'STARTED',classification:'DATA_CONTRACT_DEPENDENCY_DIAGNOSTIC',tenantId:TENANT,projectId:PROJECT,digests:{},heldParents:{},affectedPolicies:{},descendants:{},strategyComparison:{},recommendation:{},cumulativeVisualGuard:{},firestoreRead:false,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,frontendAdapted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,rulesApplied:false,functionsDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false,ok:false};
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||text(process.env.ORBIT360_PRODUCT_TENANT_ID)!==TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:HOLD_PARENT_DIAGNOSTIC_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);result.firestoreRead=true;
  const source={},target={},sourceDigests={},targetDigests={};
  for(const collection of COLLECTIONS){
    const [sourceSnap,targetSnap]=await Promise.all([db.collection('tenantId').doc(TENANT).collection(collection).get(),db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items').get()]);
    source[collection]=snapshotRows(sourceSnap);target[collection]=snapshotRows(targetSnap);
    if(source[collection].length!==EXPECTED_SOURCE[collection]||target[collection].length!==EXPECTED_TARGET[collection])throw new Error(`DATA_CONTRACT_FAILURE:HOLD_PARENT_COUNT_DRIFT_${collection}`);
    sourceDigests[collection]=rowsDigest(source[collection]);targetDigests[collection]=rowsDigest(target[collection]);
  }
  const sourceSnapshotDigest=globalDigest(sourceDigests),targetSnapshotDigest=globalDigest(targetDigests);result.digests={sourceSnapshotDigest,targetSnapshotDigest};
  if(sourceSnapshotDigest!==EXPECTED_SOURCE_DIGEST||targetSnapshotDigest!==EXPECTED_TARGET_DIGEST)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_SNAPSHOT_DIGEST_DRIFT');

  const sourceMaps=Object.fromEntries(COLLECTIONS.map(collection=>[collection,new Map(source[collection].map(row=>[row.id,row.data]))]));
  const targetMaps=Object.fromEntries(COLLECTIONS.map(collection=>[collection,new Map(target[collection].map(row=>[row.id,row.data]))]));
  const sourceSets=Object.fromEntries(COLLECTIONS.map(collection=>[collection,new Set(sourceMaps[collection].keys())]));
  const targetSets=Object.fromEntries(COLLECTIONS.map(collection=>[collection,new Set(targetMaps[collection].keys())]));
  const heldClients=new Set([...sourceSets.clientes].filter(id=>!targetSets.clientes.has(id)));
  const heldInsurers=new Set([...sourceSets.aseguradoras].filter(id=>!targetSets.aseguradoras.has(id)));
  if(heldClients.size!==16||heldInsurers.size!==4)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_SET_DRIFT');

  const clientUsage=new Map(),insurerUsage=new Map(),affectedPolicyIds=new Set(),clientAffected=new Set(),insurerAffected=new Set(),bothAffected=new Set();
  const policyParentLinks=new Map();let policyRelationBlocked=0,policyExactTargetParity=0,policyTargetMissing=0,policyTargetMismatch=0;
  for(const row of source.polizas){
    const client=resolveRelation(row.data,sourceSets.clientes,/(cliente|contratante|asegurado|customer|client)/i);
    const insurer=resolveRelation(row.data,sourceSets.aseguradoras,/(aseguradora|insurer|compania|company)/i);
    if(client.status!=='RESOLVED'||insurer.status!=='RESOLVED'){policyRelationBlocked++;continue;}
    const usesClient=heldClients.has(client.id),usesInsurer=heldInsurers.has(insurer.id);
    if(usesClient){add(clientUsage,client.id);clientAffected.add(row.id);}if(usesInsurer){add(insurerUsage,insurer.id);insurerAffected.add(row.id);}
    if(usesClient||usesInsurer){affectedPolicyIds.add(row.id);policyParentLinks.set(row.id,{clientId:usesClient?client.id:'',insurerId:usesInsurer?insurer.id:''});if(usesClient&&usesInsurer)bothAffected.add(row.id);}
    if(!targetMaps.polizas.has(row.id))policyTargetMissing++;else if(rowHash(row.id,row.data)===rowHash(row.id,targetMaps.polizas.get(row.id)))policyExactTargetParity++;else policyTargetMismatch++;
  }
  if(policyRelationBlocked!==0||policyExactTargetParity!==1373||policyTargetMissing!==0||policyTargetMismatch!==0||affectedPolicyIds.size<1)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_POLICY_GRAPH_INCOMPLETE');

  const clientClass=aggregateParentClassification(heldClients,sourceMaps.clientes,clientUsage);
  const insurerClass=aggregateParentClassification(heldInsurers,sourceMaps.aseguradoras,insurerUsage);
  if(clientClass.summary.validationHolds!==16||insurerClass.summary.validationHolds!==4)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_VALIDATION_NOT_PRESERVED');

  const correctionPolicyIds=new Set();
  for(const [policyId,links] of policyParentLinks){if((links.clientId&&clientClass.correction.has(links.clientId))||(links.insurerId&&insurerClass.correction.has(links.insurerId)))correctionPolicyIds.add(policyId);}
  const restrictedPolicyIds=new Set([...affectedPolicyIds].filter(id=>!correctionPolicyIds.has(id)));
  const descendants={vehiculos:{total:0,correctionPath:0,exactTargetParity:0,blocked:0},recibos:{total:0,correctionPath:0,exactTargetParity:0,blocked:0},cartera:{total:0,correctionPath:0,exactTargetParity:0,blocked:0},cobros:{total:0,correctionPath:0,exactTargetParity:0,blocked:0}};
  const affectedReceiptIds=new Set(),correctionReceiptIds=new Set();const diagnosticRows=[];

  for(const row of source.vehiculos){const rel=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i);if(rel.status!=='RESOLVED'){descendants.vehiculos.blocked++;continue;}if(affectedPolicyIds.has(rel.id)){descendants.vehiculos.total++;if(correctionPolicyIds.has(rel.id))descendants.vehiculos.correctionPath++;const p=exactTargetParity([row],targetMaps.vehiculos);descendants.vehiculos.exactTargetParity+=p.exact;diagnosticRows.push(`vehiculo|${sha(row.id)}|${correctionPolicyIds.has(rel.id)?'CORRECTION':'RESTRICTED'}`);}}
  for(const row of source.recibosEsperados){const rel=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i);if(rel.status!=='RESOLVED'){descendants.recibos.blocked++;continue;}if(affectedPolicyIds.has(rel.id)){affectedReceiptIds.add(row.id);descendants.recibos.total++;if(correctionPolicyIds.has(rel.id)){correctionReceiptIds.add(row.id);descendants.recibos.correctionPath++;}const p=exactTargetParity([row],targetMaps.recibosEsperados);descendants.recibos.exactTargetParity+=p.exact;diagnosticRows.push(`recibo|${sha(row.id)}|${correctionPolicyIds.has(rel.id)?'CORRECTION':'RESTRICTED'}`);}}
  for(const [collection,key] of [['carteraPrimas','cartera'],['cobros','cobros']]){
    for(const row of source[collection]){
      const policy=resolveRelation(row.data,sourceSets.polizas,/(poliza|policy)/i),receipt=resolveRelation(row.data,sourceSets.recibosEsperados,/(recibo|receipt)/i);
      if(policy.status!=='RESOLVED'||receipt.status!=='RESOLVED'){descendants[key].blocked++;continue;}
      if(affectedPolicyIds.has(policy.id)||affectedReceiptIds.has(receipt.id)){
        descendants[key].total++;const correction=correctionPolicyIds.has(policy.id)||correctionReceiptIds.has(receipt.id);if(correction)descendants[key].correctionPath++;
        const p=exactTargetParity([row],targetMaps[collection]);descendants[key].exactTargetParity+=p.exact;diagnosticRows.push(`${key}|${sha(row.id)}|${correction?'CORRECTION':'RESTRICTED'}`);
      }
    }
  }
  for(const item of Object.values(descendants))if(item.blocked!==0||item.exactTargetParity!==item.total)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_DESCENDANT_TRACE_INCOMPLETE');

  const totalReferencedParents=clientClass.summary.referencedParents+insurerClass.summary.referencedParents;
  const restrictedParents=clientClass.migratable.size+insurerClass.migratable.size;
  const correctionParents=clientClass.correction.size+insurerClass.correction.size;
  const unusedParents=clientClass.unused.size+insurerClass.unused.size;
  const affectedClientOnly=clientAffected.size-bothAffected.size,affectedInsurerOnly=insurerAffected.size-bothAffected.size;
  for(const [id,links] of policyParentLinks)diagnosticRows.push(`poliza|${sha(id)}|${links.clientId?'C':'-'}${links.insurerId?'I':'-'}|${correctionPolicyIds.has(id)?'CORRECTION':'RESTRICTED'}`);
  const planDigest=sha(diagnosticRows.sort().join('\n'));

  result.heldParents={clients:clientClass.summary,insurers:insurerClass.summary,total:20,referencedParents:totalReferencedParents,restrictedMigrationCandidates:restrictedParents,correctionManagementParents:correctionParents,unusedHoldParents:unusedParents,allPreserveRequiresValidation:true};
  result.affectedPolicies={total:affectedPolicyIds.size,byHeldClient:clientAffected.size,byHeldInsurer:insurerAffected.size,clientOnly:affectedClientOnly,insurerOnly:affectedInsurerOnly,both:bothAffected.size,restrictedMigrationPath:restrictedPolicyIds.size,correctionManagementPath:correctionPolicyIds.size,exactTargetParity:policyExactTargetParity,relationBlocked:policyRelationBlocked};
  result.descendants=descendants;
  result.strategyComparison={
    migrateRestrictedParents:{parentCreates:restrictedParents,policiesRetained:restrictedPolicyIds.size,vehiclesRetained:descendants.vehiculos.total-descendants.vehiculos.correctionPath,receiptsRetained:descendants.recibos.total-descendants.recibos.correctionPath,portfolioRetained:descendants.cartera.total-descendants.cartera.correctionPath,collectionsRetained:descendants.cobros.total-descendants.cobros.correctionPath,preserveRequiresValidation:true},
    retainDependents:{policiesHeld:affectedPolicyIds.size,vehiclesHeld:descendants.vehiculos.total,receiptsHeld:descendants.recibos.total,portfolioHeld:descendants.cartera.total,collectionsHeld:descendants.cobros.total},
    correctionManagement:{parentCases:correctionParents,policyCases:correctionPolicyIds.size,vehiclesAffected:descendants.vehiculos.correctionPath,receiptsAffected:descendants.recibos.correctionPath,portfolioAffected:descendants.cartera.correctionPath,collectionsAffected:descendants.cobros.correctionPath},
    dryRunPlanDigest:planDigest
  };
  result.recommendation={preferredStrategy:correctionParents===0?'MIGRATE_REFERENCED_HOLD_PARENTS_RESTRICTED_PRESERVING_REQUIERE_VALIDACION':'MIXED_RESTRICTED_PARENT_MIGRATION_AND_CORRECTION_MANAGEMENT',binding:false,authorityChanged:false,writesAuthorized:false,reason:affectedPolicyIds.size>0?'PARENT_EXISTENCE_REQUIRED_FOR_CANONICAL_RELATIONAL_INTEGRITY':'NO_ACTIVE_DEPENDENCY'};
  result.cumulativeVisualGuard=visualManifest(ROOT);
  const sourceTotal=COLLECTIONS.reduce((n,c)=>n+source[c].length,0),targetTotal=COLLECTIONS.reduce((n,c)=>n+target[c].length,0);
  result.summary={sourceTotal,targetTotal,heldClients:heldClients.size,heldInsurers:heldInsurers.size,affectedPolicies:affectedPolicyIds.size,referencedParents:totalReferencedParents,restrictedMigrationCandidates:restrictedParents,correctionManagementParents:correctionParents,unusedHoldParents:unusedParents,descendantDocuments:descendants.vehiculos.total+descendants.recibos.total+descendants.cartera.total+descendants.cobros.total,sourceAndTargetDigestsMatched:true,evidenceComplete:sourceTotal===4837&&targetTotal===4822&&heldClients.size===16&&heldInsurers.size===4&&affectedPolicyIds.size>0&&policyExactTargetParity===1373&&policyRelationBlocked===0&&clientClass.summary.validationHolds===16&&insurerClass.summary.validationHolds===4&&Object.values(descendants).every(item=>item.blocked===0&&item.exactTargetParity===item.total)&&result.cumulativeVisualGuard.manifestMatches===true};
  if(!result.summary.evidenceComplete)throw new Error('DATA_CONTRACT_FAILURE:HOLD_PARENT_DIAGNOSTIC_INCOMPLETE');
  result.status='POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_PASS';result.classification='GO_LAB_HOLD_PARENT_DEPENDENCY_DIAGNOSED';result.ok=true;
}catch(error){result.status='POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_FAIL';result.classification=text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE';result.error=safeError(error);result.ok=false;}
save(result);if(app)await deleteApp(app).catch(()=>{});process.exit(result.ok?0:41);
