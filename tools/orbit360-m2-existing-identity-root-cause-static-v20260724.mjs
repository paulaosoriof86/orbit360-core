#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m2-existing-identity-root-cause-static-summary.json');
const files={
  input:'tools/orbit360-m2-existing-identity-root-cause-input-v20260724.json',
  runtimeEvidence:'tools/orbit360-m2-runtime-failure-evidence-v20260724.json',
  labOwner:'tools/orbit360-ensure-lab-user.mjs',
  rules:'firestore.rules',
  readiness:'orbit360-platform/core/backend-product-readiness-contract-p0.js',
  bootstrap:'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
  runtime:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs'
};
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
const extract=(source,re,name)=>{const m=re.exec(source);if(!m)throw new Error(`STATIC_SOURCE_MISSING:${name}`);return m[1];};
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function storeFixture(tenantId){
  const fn=()=>{};
  return {all:fn,get:fn,where:fn,insert:fn,update:fn,remove:fn,_emit:fn,on:fn,pref:fn,setPref:fn,init:fn,raw:fn,_productStatus:()=>({mode:'product',tenantId,source:'data/store-firestore-product-readonly-p0.js',noFallback:true,writeEnabled:false,status:'created'})};
}
try{
  Object.values(files).forEach(rel=>check('FILE:'+rel,fs.existsSync(path.join(ROOT,rel)),rel));
  const input=json(files.input),evidence=json(files.runtimeEvidence);
  const labSource=read(files.labOwner),rulesSource=read(files.rules),readinessSource=read(files.readiness),bootstrapSource=read(files.bootstrap),runtimeSource=read(files.runtime);
  const uid=extract(labSource,/const EXPECTED_UID = '([^']+)'/,'EXPECTED_UID');
  const email=extract(labSource,/const EXPECTED_EMAIL = '([^']+)'/,'EXPECTED_EMAIL').toLowerCase();
  const rulesUid=extract(rulesSource,/request\.auth\.uid == "([^"]+)"/,'RULES_UID');
  const rulesEmail=extract(rulesSource,/request\.auth\.token\.email == "([^"]+)"/,'RULES_EMAIL').toLowerCase();
  check('INPUT_GATE',input.gateId==='block2-product-readonly-runtime-v20260723'&&input.contractVersion==='2.2.1');
  check('HISTORIC_BLOBS',input.preFixReadinessBlobSha==='b43cee1bf52c41b4b7bd3b28cc1ee76493f28efc'&&input.labOwnerBlobSha==='59d87890ca1ca291ebbe39b0b125f58cb18dfd92');
  check('IDENTITY_OWNER_RULES_MATCH',uid===rulesUid&&email===rulesEmail);
  check('IDENTITY_FINGERPRINT',hash(uid+'|'+email)===input.expectedIdentityFingerprint);
  check('FAILURE_EVIDENCE_BINDING',evidence.runId===30103556811&&evidence.artifactId===8600630817&&evidence.artifactDigest==='sha256:de7cac22d8db427006938fd67c288177b6cb86a1154dc1f0566951cdee0ed99c');
  check('FAILURE_BOUNDARY',evidence.status==='DATA_CONTRACT_FAILURE'&&evidence.eligibleExistingIdentityCount===1&&evidence.storeInstalled===false&&evidence.snapshotsAttached===false);

  const context={window:{Orbit:{tenantCanonicalPathsP0:{validateTenantId:value=>({ok:value==='alianzas-soluciones',tenantId:value,errors:value==='alianzas-soluciones'?[]:['tenant_invalido']})}}}};
  vm.createContext(context);vm.runInContext(readinessSource,context,{filename:files.readiness});
  const owner=context.window.Orbit.backendProductReadinessP0;
  const auth={uid,email,emailVerified:true,disabled:false};
  const membership={uid,tenantId:'alianzas-soluciones',roles:['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'],activeRole:'Dirección',status:'active',countries:['GT','CO'],dataScopes:{default:'all',modules:{}}};
  const base={mode:'product',tenantId:'alianzas-soluciones',authUser:auth,membership,store:storeFixture('alianzas-soluciones'),storeMetadata:{mode:'product',tenantId:'alianzas-soluciones',source:'data/store-firestore-product-readonly-p0.js',noFallback:true,writeEnabled:false},pathContractVersion:'p0-20260713',accessPolicyVersion:'p0-20260713'};
  const legacy=owner.readiness({...base,firebaseConfigInfo:{projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:'configured',environmentRef:'existing-project-readonly'}});
  check('PRE_FIX_FAILURE_REPRODUCED',legacy.ok===false&&legacy.errors.includes('auth_demo_no_permitido'),legacy.errors.join('|'));
  const controlled=owner.readiness({...base,firebaseConfigInfo:{projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:'configured',environmentRef:'existing-project-readonly',controlledExistingIdentity:true,existingProjectReconciled:true,identitySource:'membership_only',readOnly:true,writeAuthorized:false}});
  check('CONTROLLED_FIX_PASS',controlled.ok===true&&controlled.controlledExistingIdentity===true&&controlled.controlledExistingIdentityAccepted===true,controlled.errors.join('|'));
  const incomplete=owner.readiness({...base,firebaseConfigInfo:{projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:'configured',environmentRef:'existing-project-readonly',controlledExistingIdentity:true,existingProjectReconciled:false,identitySource:'membership_only',readOnly:true,writeAuthorized:false}});
  check('FAIL_CLOSED_INCOMPLETE_GUARD',incomplete.ok===false&&incomplete.errors.includes('transicion_identidad_existente_incompleta')&&incomplete.errors.includes('auth_demo_no_permitido'),incomplete.errors.join('|'));
  const genericDemo=owner.validateAuth({uid:'fixture',email:'admin@demo.com',emailVerified:true,disabled:false},{});
  check('GENERIC_DEMO_STILL_BLOCKED',genericDemo.ok===false&&genericDemo.errors.includes('auth_demo_no_permitido'));
  check('GENERIC_CONTRACT_NO_TENANT_HARDCODE',!readinessSource.includes('alianzas-soluciones')&&!readinessSource.includes(uid));
  const readinessIndex=bootstrapSource.indexOf('backendProductReadinessP0.readiness');
  const attachIndex=bootstrapSource.indexOf('store._attachSnapshots');
  check('READINESS_BEFORE_SNAPSHOTS',readinessIndex>=0&&attachIndex>readinessIndex,`${readinessIndex}:${attachIndex}`);
  ['bootstrapPhase','bootstrapErrors','readinessStatus','readinessErrors','storeStatus','storeSnapshotErrorKeys','controlledExistingIdentityAccepted'].forEach(token=>check('RUNTIME_EVIDENCE_FIELD:'+token,runtimeSource.includes(token)));
  check('RUNTIME_CONTROLLED_GUARD',runtimeSource.includes('controlledExistingIdentity:true')&&runtimeSource.includes("identitySource:'membership_only'")&&runtimeSource.includes('writeAuthorized:false'));
  check('NO_EXTERNAL_CAPABILITY',input.staticOnly===true&&input.secretAccess===false&&input.firebaseAccess===false&&input.firestoreRead===false&&input.runtime===false&&input.writes===false);
}catch(error){check('STATIC_DIAGNOSTIC_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(item=>!item.ok);
const output={schemaVersion:'orbit360-m2-existing-identity-root-cause-static-v1',gateId:'block2-product-readonly-runtime-v20260723',contractVersion:'2.2.1',ok:failed.length===0,status:failed.length?'M2_ROOT_CAUSE_STATIC_FAILED':'M2_ROOT_CAUSE_STATIC_PROVEN',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'VALIDATOR_STALE',rootCauseProven:failed.length===0,rootCauseCode:failed.length?'UNPROVEN':'AUTH_DEMO_MARKER_REJECTED_AUTHORIZED_EXISTING_IDENTITY',snapshotsExcludedAsFirstCause:checks.some(item=>item.id==='READINESS_BEFORE_SNAPSHOTS'&&item.ok),correctedValidatorFailClosed:checks.some(item=>item.id==='CONTROLLED_FIX_PASS'&&item.ok)&&checks.some(item=>item.id==='FAIL_CLOSED_INCOMPLETE_GUARD'&&item.ok),sanitizedEvidenceCoverageCorrected:['bootstrapPhase','bootstrapErrors','readinessStatus','readinessErrors','storeStatus','storeSnapshotErrorKeys'],total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks:checks.map(item=>({id:item.id,ok:item.ok,detail:item.id.includes('IDENTITY')?'sanitized':item.detail})),secretAccess:false,firebaseAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesChanged:false,configurationWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));process.exit(failed.length?41:0);
