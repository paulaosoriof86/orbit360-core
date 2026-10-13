'use strict';
// B4-003 isolated Firestore emulator proof. No production Firebase credentials,
// no actual tenant data and no operational writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,query,where,getDoc,getDocs,setDoc}=require('firebase/firestore');
const projectId='demo-gravicentra-b4003-security';
const port=8187,host='127.0.0.1';
const tenant='synthetic-security-tenant';
const canonical=(collectionName,id)=>`tenants/${tenant}/data/${collectionName}/items/${id}`;
const legacy=(collectionName,id)=>`tenantId/${tenant}/${collectionName}/${id}`;
const member=id=>`tenants/${tenant}/members/${id}`;
const rules=fs.readFileSync('firestore.b4-003-scoped-candidate.rules','utf8');
async function run(){
 let env;let n=0;
 try{
  env=await initializeTestEnvironment({projectId,firestore:{host,port,rules}});
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,member('opGT')),{uid:'opGT',tenantId:tenant,status:'active',roles:['Operativo'],advisorId:'advisor-own'});
   await setDoc(doc(db,member('advisorGT')),{uid:'advisorGT',tenantId:tenant,status:'active',roles:['Asesor'],advisorId:'advisor-other'});
   await setDoc(doc(db,canonical('polizas','own')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own',numero:'SYNTHETIC-OWN'});
   await setDoc(doc(db,canonical('polizas','foreign')),{tenantId:tenant,pais:'GT',asesorId:'advisor-other',numero:'SYNTHETIC-FOREIGN'});
   await setDoc(doc(db,canonical('polizas','co')),{tenantId:tenant,pais:'CO',asesorId:'advisor-own',numero:'SYNTHETIC-CO'});
   await setDoc(doc(db,legacy('polizas','own')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own'});
  });
  const own=env.authenticatedContext('opGT',{email:'synthetic-op@example.invalid'}).firestore();
  const advisor=env.authenticatedContext('advisorGT',{email:'synthetic-advisor@example.invalid'}).firestore();
  const anon=env.unauthenticatedContext().firestore();
  async function ok(x){await assertSucceeds(x);n++;}
  async function denied(x){await assertFails(x);n++;}
  await ok(getDoc(doc(own,member('opGT'))));
  await denied(getDoc(doc(own,member('advisorGT'))));
  await denied(getDoc(doc(anon,member('opGT'))));
  await denied(getDoc(doc(own,canonical('polizas','own'))));
  await denied(getDoc(doc(own,canonical('polizas','foreign'))));
  await denied(getDoc(doc(advisor,canonical('polizas','own'))));
  await denied(getDoc(doc(own,canonical('polizas','co'))));
  await denied(getDocs(collection(own,`tenants/${tenant}/data/polizas/items`)));
  await denied(getDocs(query(collection(own,`tenants/${tenant}/data/polizas/items`),where('pais','==','GT'))));
  await denied(setDoc(doc(own,canonical('polizas','foreign')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own'}));
  await denied(getDoc(doc(own,legacy('polizas','own'))));
  await denied(getDocs(collection(own,`tenantId/${tenant}/polizas`)));
  await denied(setDoc(doc(own,legacy('polizas','own')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own'}));
  await denied(getDoc(doc(own,`tenants/${tenant}/credentialRefs/synthetic`)));
  assert.equal(n,14);
  console.log('B4_003_FIRESTORE_EMULATOR_ISOLATED_NEGATIVE_PROOF_PASS assertions='+n+' synthetic_only no_production');
 }finally{if(env)await env.cleanup();}
}
run().catch(e=>{console.error('B4_003_FIRESTORE_EMULATOR_FAIL',e&&e.message||e);process.exitCode=1;});
