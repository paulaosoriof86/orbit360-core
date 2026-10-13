'use strict';
// B4-003 isolated Firestore emulator proof. No production Firebase credentials,
// no actual tenant data and no operational writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,query,where,getDoc,getDocs,setDoc}=require('firebase/firestore');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {scopedPolicyRead}=require('../functions/b4-003-scoped-policy-reader');
const {readScopedRelatedDocument}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
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
   await setDoc(doc(db,member('opGT')),{uid:'opGT',tenantId:tenant,status:'active',roles:['Operativo'],advisorId:'advisor-own',countries:['GT','CO'],dataScopes:{default:'own'},teamAdvisorIds:['advisor-other']});
   await setDoc(doc(db,`tenants/${tenant}/config/access`),{roleScopes:{operativo:'all',asesor:'own'}});
   await setDoc(doc(db,member('advisorGT')),{uid:'advisorGT',tenantId:tenant,status:'active',roles:['Asesor'],advisorId:'advisor-other',countries:['GT'],dataScopes:{default:'own'}});
   await setDoc(doc(db,canonical('polizas','own')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own',clienteId:'c_own',numero:'SYNTHETIC-OWN'});
   await setDoc(doc(db,canonical('polizas','foreign')),{tenantId:tenant,pais:'GT',asesorId:'advisor-other',clienteId:'c_foreign',numero:'SYNTHETIC-FOREIGN'});
   await setDoc(doc(db,canonical('polizas','co')),{tenantId:tenant,pais:'CO',asesorId:'advisor-own',clienteId:'c_co',numero:'SYNTHETIC-CO'});
   await setDoc(doc(db,canonical('clientes','c_own')),{tenantId:tenant,pais:'GT',asesorId:'advisor-own'});
   await setDoc(doc(db,canonical('clientes','c_foreign')),{tenantId:tenant,pais:'GT',asesorId:'advisor-other'});
   await setDoc(doc(db,canonical('clientes','c_co')),{tenantId:tenant,pais:'CO',asesorId:'advisor-own'});
   await setDoc(doc(db,canonical('recibosEsperados','r_own')),{tenantId:tenant,polizaId:'own',clienteId:'c_own',monto:20});
   await setDoc(doc(db,canonical('recibosEsperados','r_foreign')),{tenantId:tenant,polizaId:'foreign',clienteId:'c_foreign',monto:30});
   await setDoc(doc(db,canonical('recibosEsperados','r_bad')),{tenantId:tenant,polizaId:'own',clienteId:'c_foreign'});
   await setDoc(doc(db,canonical('vehiculos','v_own')),{tenantId:tenant,polizaId:'own',clienteId:'c_own'});
   await setDoc(doc(db,canonical('carteraPrimas','d_own')),{tenantId:tenant,polizaId:'own',clienteId:'c_own',monto:10});
   await setDoc(doc(db,canonical('cobros','pay_own')),{tenantId:tenant,polizaId:'own',clienteId:'c_own',monto:6});
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
  await denied(getDoc(doc(own,canonical('clientes','c_own'))));
  await denied(getDoc(doc(own,canonical('recibosEsperados','r_own'))));
  assert.equal(n,16);
  console.log('B4_003_FIRESTORE_EMULATOR_ISOLATED_NEGATIVE_PROOF_PASS assertions='+n+' synthetic_only no_production');
  // Same emulator; Admin SDK represents the protected server-owned reader.
  // The browser still cannot issue any direct Firestore data request.
  process.env.FIRESTORE_EMULATOR_HOST=host+':'+port;
  const adminApp=initializeApp({projectId},'b4003-emulator-server');
  try{
    const db=getFirestore(adminApp);
    const get=(uid,role,policyId,country='GT')=>scopedPolicyRead({
      db,auth:{uid,token:{}},
      request:{tenantId:tenant,activeRole:role,country,mode:'get',policyId}
    });
    const list=(uid,role,country='GT')=>scopedPolicyRead({
      db,auth:{uid,token:{}},
      request:{tenantId:tenant,activeRole:role,country,mode:'list',pageSize:50}
    });
    let positiveCount=0;
    const allowedOwn=await get('opGT','operativo','own');
    assert.deepEqual(allowedOwn.rows.map(x=>x.id),['own']);positiveCount++;
    const ownList=await list('opGT','operativo');
    assert.deepEqual(ownList.rows.map(x=>x.id),['own']);positiveCount++;
    const deniedServer=async(fn,code)=>{
      let error=null;try{await fn();}catch(e){error=e;}
      assert.ok(error instanceof Denied,'server must deny restricted request');
      assert.equal(error.code,code);
      positiveCount++;
    };
    await deniedServer(()=>get('opGT','operativo','foreign'),'POLICY_NOT_FOUND_OR_DENIED');
    await deniedServer(()=>get('opGT','operativo','co'),'POLICY_NOT_FOUND_OR_DENIED');
    await deniedServer(()=>list('opGT','asesor'),'ROLE_DENIED');
    const advisory=await list('advisorGT','asesor');
    assert.deepEqual(advisory.rows.map(x=>x.id),['foreign']);positiveCount++;
    const denyRelated=async(fn,code)=>{
      let failure=null;try{await fn();}catch(e){failure=e;}
      assert.ok(failure instanceof Denied,'related read must be denied');
      assert.equal(failure.code,code);
    };
    let relatedCount=0;
    const readRelated=(collection,documentId,country='GT')=>readScopedRelatedDocument({
      db,auth:{uid:'opGT',token:{}},request:{tenantId:tenant,activeRole:'operativo',country,collection,documentId}
    });
    const relatedOwn=await readRelated('clientes','c_own');
    assert.equal(relatedOwn.row.id,'c_own');relatedCount++;
    await denyRelated(()=>readRelated('clientes','c_foreign'),'RECORD_NOT_FOUND_OR_DENIED');relatedCount++;
    const receipt=await readRelated('recibosEsperados','r_own');
    assert.equal(receipt.row.id,'r_own');relatedCount++;
    await denyRelated(()=>readRelated('recibosEsperados','r_foreign'),'RECORD_NOT_FOUND_OR_DENIED');relatedCount++;
    await denyRelated(()=>readRelated('recibosEsperados','r_bad'),'RELATION_CLIENT_MISMATCH');relatedCount++;
    for(const [collection,id] of [['vehiculos','v_own'],['carteraPrimas','d_own'],['cobros','pay_own']]){
      const d=await readRelated(collection,id);assert.equal(d.row.id,id);relatedCount++;
    }
    const colombiaClient=await readRelated('clientes','c_co','CO');
    assert.equal(colombiaClient.row.id,'c_co');relatedCount++;
    await denyRelated(()=>readRelated('clientes','c_co','GT'),'RECORD_NOT_FOUND_OR_DENIED');relatedCount++;
    console.log('B4_003_EMULATOR_RELATED_CLIENT_RECEIPT_PORTFOLIO_PASS assertions='+relatedCount+' synthetic_only no_production');
    await env.withSecurityRulesDisabled(async context=>{
      await setDoc(doc(context.firestore(),member('opGT')),{uid:'opGT',tenantId:tenant,status:'active',
        roles:['Operativo'],advisorId:'advisor-own',countries:['GT','CO'],
        dataScopes:{default:'team'},teamAdvisorIds:['advisor-other']});
    });
    const teamRows=await list('opGT','operativo');
    assert.deepEqual(teamRows.rows.map(x=>x.id),['foreign','own']);positiveCount++;
    await env.withSecurityRulesDisabled(async context=>{
      await setDoc(doc(context.firestore(),member('opGT')),{uid:'opGT',tenantId:tenant,status:'active',
        roles:['Operativo'],advisorId:'advisor-own',countries:['GT','CO'],
        dataScopes:{default:'all'},teamAdvisorIds:['advisor-other']});
    });
    const allRows=await list('opGT','operativo');
    assert.deepEqual(allRows.rows.map(x=>x.id),['foreign','own']);positiveCount++;
    const colombiaRows=await list('opGT','operativo','CO');
    assert.deepEqual(colombiaRows.rows.map(x=>x.id),['co']);positiveCount++;
    await env.withSecurityRulesDisabled(async context=>{
      await setDoc(doc(context.firestore(),`tenants/${tenant}/config/access`),{roleScopes:{operativo:'none',asesor:'own'}});
    });
    await deniedServer(()=>get('opGT','operativo','own'),'SCOPE_NONE');
    assert.equal(positiveCount,10);
    console.log('B4_003_FIRESTORE_EMULATOR_SERVER_SCOPED_POSITIVE_AND_NEGATIVE_PASS assertions='+positiveCount+' synthetic_only no_production');
  }finally{await deleteApp(adminApp);}

 }finally{if(env)await env.cleanup();}
}
run().catch(e=>{console.error('B4_003_FIRESTORE_EMULATOR_FAIL',e&&e.message||e);process.exitCode=1;});
