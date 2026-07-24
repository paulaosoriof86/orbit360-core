#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m2-membership-validator-stale-static-summary.json');
const files={
  evidence:'tools/orbit360-m2-corrected-runtime-failure-evidence-v20260724.json',
  membershipOwner:'tools/orbit360-ensure-lab-secure-membership-v20260720.mjs',
  runtime:'tools/orbit360-m2-existing-identity-runtime-v20260724.mjs',
  taxonomy:'orbit360-platform/core/product-role-taxonomy-p0.js',
  membershipBase:'orbit360-platform/core/membership-multirol-contract-p0.js',
  membershipEffective:'orbit360-platform/core/membership-multirol-effective-p0.js',
  paths:'orbit360-platform/core/tenant-canonical-paths-contract-p0.js',
  readiness:'orbit360-platform/core/backend-product-readiness-contract-p0.js'
};
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
const extract=(source,re,name)=>{const found=re.exec(source);if(!found)throw new Error(`SOURCE_TOKEN_MISSING:${name}`);return found[1];};
function storeFixture(tenantId){const fn=()=>{};return {all:fn,get:fn,where:fn,insert:fn,update:fn,remove:fn,_emit:fn,on:fn,pref:fn,setPref:fn,init:fn,raw:fn,_productStatus:()=>({mode:'product',tenantId,source:'data/store-firestore-product-readonly-p0.js',noFallback:true,writeEnabled:false,status:'created'})};}
try{
  Object.values(files).forEach(rel=>check('FILE:'+rel,fs.existsSync(path.join(ROOT,rel)),rel));
  const evidence=json(files.evidence);
  const membershipOwner=read(files.membershipOwner);
  const runtimeSource=read(files.runtime);
  const uid=extract(membershipOwner,/const EXPECTED_UID = '([^']+)'/,'EXPECTED_UID');
  const email=extract(membershipOwner,/const EXPECTED_EMAIL = '([^']+)'/,'EXPECTED_EMAIL').toLowerCase();
  check('RUNTIME_FAILURE_BINDING',evidence.runId===30120872643&&evidence.artifactId===8607334226&&evidence.requestCommit==='7e18bfaa7018808f0a2633e893a54f95d5b49970');
  check('SINGLE_READINESS_ERROR_SHAPE',evidence.bootstrapPhase==='blocked'&&evidence.singleReadinessErrorShape===true&&evidence.storeInstalled===false&&evidence.snapshotsAttached===false);
  check('CANONICAL_MEMBERSHIP_EMAIL_DECLARED',membershipOwner.includes("email: EXPECTED_EMAIL")&&membershipOwner.includes("status: 'active'")&&membershipOwner.includes("dataScopes: {"));

  const context={window:{Orbit:{}}};
  vm.createContext(context);
  [files.taxonomy,files.membershipBase,files.membershipEffective,files.paths,files.readiness].forEach(rel=>vm.runInContext(read(rel),context,{filename:rel}));
  const owner=context.window.Orbit.backendProductReadinessP0;
  const membership={uid,email,tenantId:'alianzas-soluciones',displayName:'Orbit LAB',roles:['Dirección','SuperAdmin','AdminTenant','Asesor','Operativo'],defaultRole:'Dirección',activeRole:'Dirección',modulesExtra:[],modulesRestricted:[],dataScopes:{default:'all',modules:{aseguradoras:'all',importar:'all'}},countries:['GT','CO'],advisorId:'ase-paula-osorio',status:'active',labOnly:true};
  const auth={uid,email,emailVerified:true,disabled:false};
  const config={projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:'configured',environmentRef:'firebase-management-api-readonly',controlledExistingIdentity:true,existingProjectReconciled:true,identitySource:'membership_only',readOnly:true,writeAuthorized:false};
  const base={mode:'product',tenantId:'alianzas-soluciones',firebaseConfigInfo:config,authUser:auth,membership,store:storeFixture('alianzas-soluciones'),storeMetadata:{mode:'product',tenantId:'alianzas-soluciones',source:'data/store-firestore-product-readonly-p0.js',noFallback:true,writeEnabled:false},pathContractVersion:'p0-20260713',accessPolicyVersion:'p0-20260713'};

  const historicalMembership=owner.validateMembership(membership,{uid,tenantId:'alianzas-soluciones'},{});
  check('HISTORICAL_FAILURE_REPRODUCED',historicalMembership.ok===false&&historicalMembership.errors.length===1&&historicalMembership.errors[0]==='membresia_demo_no_permitida',historicalMembership.errors.join('|'));
  const controlledMembership=owner.validateMembership(membership,{uid,tenantId:'alianzas-soluciones'},{controlledExistingIdentity:true});
  check('CONTROLLED_MEMBERSHIP_ACCEPTED',controlledMembership.ok===true&&controlledMembership.controlledExistingIdentityAccepted===true,controlledMembership.errors.join('|'));
  const readiness=owner.readiness(base);
  check('CONTROLLED_READINESS_PASS',readiness.ok===true&&readiness.controlledExistingIdentity===true&&readiness.controlledExistingIdentityAccepted===true&&readiness.controlledAuthMarkerAccepted===true&&readiness.controlledMembershipMarkerAccepted===true,readiness.errors.join('|'));

  const noGuard=owner.readiness({...base,firebaseConfigInfo:{...config,controlledExistingIdentity:false}});
  check('NO_GUARD_STILL_BLOCKED',noGuard.ok===false&&noGuard.errors.includes('auth_demo_no_permitido')&&noGuard.errors.includes('membresia_demo_no_permitida'),noGuard.errors.join('|'));
  const wrongUid={...membership,uid:'different-fixture'};
  const mismatched=owner.validateMembership(wrongUid,{uid,tenantId:'alianzas-soluciones'},{controlledExistingIdentity:true});
  check('MISMATCHED_IDENTITY_BLOCKED',mismatched.ok===false&&mismatched.errors.includes('membresia_uid_no_coincide')&&mismatched.errors.includes('membresia_demo_no_permitida'),mismatched.errors.join('|'));
  const genericDemo={...membership,uid:'fixture-user',email:'admin@demo.com'};
  const generic=owner.validateMembership(genericDemo,{uid:'fixture-user',tenantId:'alianzas-soluciones'},{});
  check('GENERIC_DEMO_STILL_BLOCKED',generic.ok===false&&generic.errors.includes('membresia_demo_no_permitida'));

  check('AUTH_EMAIL_VERIFIED_NOT_CAUSE',owner.validateAuth(auth,{controlledExistingIdentity:true}).errors.indexOf('auth_email_no_verificado')<0);
  check('EXACT_SINGLE_CAUSE',historicalMembership.errors.length===1&&evidence.singleReadinessErrorShape===true);
  check('SNAPSHOTS_EXCLUDED',evidence.snapshotsAttached===false&&evidence.bootstrapPhase==='blocked');
  check('READINESS_OWNER_NO_TENANT_HARDCODE',!read(files.readiness).includes('alianzas-soluciones')&&!read(files.readiness).includes(uid));
  check('RUNTIME_SAFE_CODES',runtimeSource.includes('SAFE_CODE_PREFIXES')&&runtimeSource.includes('extractReadinessErrors')&&runtimeSource.includes("'membresia_'")&&runtimeSource.includes('controlledMembershipMarkerAccepted'));
  check('RUNTIME_NO_AUTH_WRITES',!runtimeSource.includes('createUser(')&&!runtimeSource.includes('updateUser(')&&!runtimeSource.includes('deleteUser('));
  check('STATIC_ONLY',true);
}catch(error){check('STATIC_PROOF_EXECUTION',false,error&&error.message||error);}
const failed=checks.filter(item=>!item.ok);
const output={schemaVersion:'orbit360-m2-membership-validator-stale-static-v1',gateId:'block2-product-readonly-runtime-v20260723',contractVersion:'2.2.1',ok:failed.length===0,status:failed.length?'M2_MEMBERSHIP_ROOT_CAUSE_STATIC_FAILED':'M2_MEMBERSHIP_VALIDATOR_STALE_PROVEN',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'VALIDATOR_STALE',rootCauseProven:failed.length===0,rootCauseCode:failed.length?'UNPROVEN':'MEMBERSHIP_DEMO_MARKER_REJECTED_CONTROLLED_EXISTING_IDENTITY',authEmailVerifiedExcludedAsCause:checks.some(x=>x.id==='AUTH_EMAIL_VERIFIED_NOT_CAUSE'&&x.ok),snapshotsExcludedAsFirstCause:checks.some(x=>x.id==='SNAPSHOTS_EXCLUDED'&&x.ok),controlledMembershipAccepted:checks.some(x=>x.id==='CONTROLLED_MEMBERSHIP_ACCEPTED'&&x.ok),genericDemoStillBlocked:checks.some(x=>x.id==='GENERIC_DEMO_STILL_BLOCKED'&&x.ok),safeDiagnosticCodesPreserved:checks.some(x=>x.id==='RUNTIME_SAFE_CODES'&&x.ok),total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks:checks.map(x=>({id:x.id,ok:x.ok,detail:/IDENTITY|EMAIL/.test(x.id)?'sanitized':x.detail})),secretAccess:false,firebaseAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesChanged:false,configurationWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));process.exit(failed.length?41:0);
