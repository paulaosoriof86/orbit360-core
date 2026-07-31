#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';

const ROOT=process.cwd();
const rulesPath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/firestore.product-readonly.v910-candidate.rules');
const out=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/firestore-legacy-lab-compat-emulator-v910.json');
const projectId='demo-orbit360-security-v910';
const tenant='alianzas-soluciones';
const labUid='woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const otherUid='other-active-member';
const result={schemaVersion:'orbit360-firestore-legacy-lab-compat-emulator-v1',contractVersion:'9.1.0',classification:'SECURITY_FAILURE',checks:{},readOnlyCompatibility:true,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');};
let env;
try{
  const rules=fs.readFileSync(rulesPath,'utf8');
  env=await initializeTestEnvironment({projectId,firestore:{rules}});
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(doc(db,`tenants/${tenant}/members/${labUid}`),{uid:labUid,tenantId:tenant,status:'active'});
    await setDoc(doc(db,`tenants/${tenant}/members/${otherUid}`),{uid:otherUid,tenantId:tenant,status:'active'});
    await setDoc(doc(db,`tenants/${tenant}/data/clientes/items/product-client`),{tenantId:tenant,nombre:'Fixture'});
    await setDoc(doc(db,`tenantId/${tenant}/clientes/legacy-client`),{tenantId:tenant,nombre:'Fixture'});
    await setDoc(doc(db,`tenantId/${tenant}/polizas/legacy-policy`),{tenantId:tenant,numero:'P-1'});
    await setDoc(doc(db,`tenantId/${tenant}/documentos/legacy-sensitive`),{tenantId:tenant,tipo:'fixture'});
    await setDoc(doc(db,`tenants/${tenant}/credentialRefs/secret-ref`),{tenantId:tenant,ref:'fixture'});
  });
  const lab=env.authenticatedContext(labUid,{email:'orbit.lab@demo.com'}).firestore();
  const other=env.authenticatedContext(otherUid,{email:'member@example.test'}).firestore();
  const anon=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(lab,`tenantId/${tenant}/clientes/legacy-client`))); result.checks.labAllowedCollectionRead=true;
  await assertSucceeds(getDoc(doc(lab,`tenantId/${tenant}/polizas/legacy-policy`))); result.checks.labSecondAllowedCollectionRead=true;
  await assertFails(setDoc(doc(lab,`tenantId/${tenant}/clientes/legacy-write`),{tenantId:tenant})); result.checks.labLegacyWriteDenied=true;
  await assertFails(getDoc(doc(lab,`tenantId/${tenant}/documentos/legacy-sensitive`))); result.checks.sensitiveLegacyCollectionDenied=true;
  await assertFails(getDoc(doc(other,`tenantId/${tenant}/clientes/legacy-client`))); result.checks.otherActiveMemberLegacyDenied=true;
  await assertFails(getDoc(doc(anon,`tenantId/${tenant}/clientes/legacy-client`))); result.checks.unauthenticatedLegacyDenied=true;
  await assertSucceeds(getDoc(doc(other,`tenants/${tenant}/data/clientes/items/product-client`))); result.checks.productReadPreserved=true;
  await assertFails(setDoc(doc(other,`tenants/${tenant}/data/clientes/items/product-write`),{tenantId:tenant})); result.checks.productWriteStillDenied=true;
  await assertFails(getDoc(doc(lab,`tenants/${tenant}/credentialRefs/secret-ref`))); result.checks.credentialRefsStillDenied=true;
  result.ok=Object.values(result.checks).every(Boolean);result.status=result.ok?'SECURITY_COMPAT_CANDIDATE_EMULATOR_PASS':'SECURITY_COMPAT_CANDIDATE_EMULATOR_FAIL';
  if(!result.ok)process.exitCode=41;
}catch(error){result.ok=false;result.status='SECURITY_COMPAT_CANDIDATE_EMULATOR_FAIL';result.error=String(error&&error.message||error).slice(0,500);process.exitCode=41;}finally{if(env)await env.cleanup().catch(()=>{});save();}
