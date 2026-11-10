'use strict';
// I6.6 P0 Ops: real Firestore emulator, NO credentials/no production/project writes.
const assert=require('node:assert/strict');
if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('I66_EMULATOR_HOST_REQUIRED');
if(process.env.GCLOUD_PROJECT!=='demo-gravicentra-i66-ops')throw Error('I66_DEMO_PROJECT_REQUIRED');
if(process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('I66_FORBID_CLOUD_CREDENTIALS');
const {createRequire}=require('node:module');
const fromFunctions=createRequire(require('node:path').resolve(__dirname,'../functions/package.json'));
const {initializeApp,getApps}=fromFunctions('firebase-admin/app');
const {getFirestore}=fromFunctions('firebase-admin/firestore');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT});
const db=getFirestore();
const tenant='synthetic-ops-i66';
const domain=require('../functions/product-ops-leads-domain.js');
const handler=domain.orbit360OpsLeadsCommandPreview;
assert.equal(typeof handler.run,'function','I66_PREVIEW_CALLABLE_TEST_ENTRY_MISSING');
let checks=0;
const match=async(fn,code)=>{
  await assert.rejects(fn,e=>String(e.code||'').includes(code)||String(e.message||'').includes(code));
  checks++;
};
const doc=(collection,id)=>db.collection('tenants').doc(tenant).collection('data').doc(collection).collection('items').doc(id);
const member=id=>db.collection('tenants').doc(tenant).collection('members').doc(id);
const req=(uid,role,operation,entityId,payload)=>({
  auth:{uid,token:{name:'Prueba QA',email:'qa-ops@example.invalid'}},
  data:{tenantId:tenant,activeRole:role,operation,entityId,payload:payload||{},reason:'Prueba funcional Ops I6.6 en emulador aislado'}
});
async function go(uid,role,operation,entityId,payload){return handler.run(req(uid,role,operation,entityId,payload));}
(async()=>{
  await member('op-gt').set({uid:'op-gt',tenantId:tenant,status:'active',roles:['Operativo'],activeRole:'Operativo',
    countries:['GT'],advisorId:'advisor-own',dataScopes:{modules:{ops:'todos',leads:'ninguno'}}});
  await member('op-bi').set({uid:'op-bi',tenantId:tenant,status:'active',roles:['Operativo'],activeRole:'Operativo',
    countries:['GT','CO'],advisorId:'advisor-own',dataScopes:{modules:{ops:'todos',leads:'ninguno'}}});
  await member('advisor').set({uid:'advisor',tenantId:tenant,status:'active',roles:['Asesor'],activeRole:'Asesor',
    countries:['GT'],advisorId:'advisor-own',dataScopes:{modules:{ops:'propios',leads:'propios'}}});
  await member('foreign').set({uid:'foreign',tenantId:'other-tenant',status:'active',roles:['Operativo'],activeRole:'Operativo',
    countries:['GT'],dataScopes:{modules:{ops:'todos'}}});
  const id='neg_i66_ops_00001',payload={id,nombre:'QA Ops Synthetic 00001',tipo:'Persona',etapa:'nuevo',
    origen:'Ops',puntoIngreso:'ops',pais:'GT',moneda:'GTQ',canal:'Interno',ramo:'Gastos Medicos',
    asesorId:'advisor-other',aseguradoraIds:['ins-1','ins-2'],primaEst:125};
  const created=await go('op-gt','Operativo','create_business',id,payload);
  assert.equal(created.canonicalReadback,true);checks++;
  let snap=await doc('negocios',id).get();
  assert(snap.exists);checks++;
  assert.deepEqual(snap.data().aseguradoraIds,['ins-1','ins-2']);checks++;
  assert.equal(snap.data().puntoIngreso,'ops');checks++;
  const repeated=await go('op-gt','Operativo','create_business',id,payload);
  assert.equal(repeated.reused,true);checks++;
  const count=await db.collection('tenants').doc(tenant).collection('data').doc('negocios').collection('items').get();
  assert.equal(count.docs.filter(x=>x.id===id).length,1);checks++;
  await match(()=>go('op-gt','Operativo','create_business','neg_i66_ops_co_denied',
    {...payload,id:'neg_i66_ops_co_denied',pais:'CO'}),'permission-denied');
  assert.equal((await doc('negocios','neg_i66_ops_co_denied').get()).exists,false);checks++;
  const coId='neg_i66_ops_co_pass';
  await go('op-bi','Operativo','create_business',coId,{...payload,id:coId,pais:'CO'});
  assert.equal((await doc('negocios',coId).get()).data().pais,'CO');checks++;
  await match(()=>go('advisor','Asesor','create_business','neg_i66_ops_advisor_denied',
    {...payload,id:'neg_i66_ops_advisor_denied',asesorId:'advisor-own'}),'permission-denied');
  await match(()=>go('foreign','Operativo','create_business','neg_i66_ops_foreign_denied',
    {...payload,id:'neg_i66_ops_foreign_denied'}),'permission-denied');
  await go('op-gt','Operativo','archive_business',id,{deleted:true,eliminado:true,archivado:true,
    deleteReason:'Registro QA solamente',motivoEliminacion:'Registro QA solamente',deletedAt:new Date().toISOString(),
    deletedByRole:'Operativo',deletedByUid:'op-gt'});
  snap=await doc('negocios',id).get();
  assert.equal(snap.data().deleted,true);assert.equal(snap.data().archivado,true);checks++;
  const management='ges_i66_ops_00001';
  await doc('gestiones',management).set({id:management,tenantId:tenant,asesorId:'advisor-other',pais:'GT',
    tipo:'Gestión',titulo:'QA gestione',estado:'Pendiente',workflowType:'general'});
  await go('op-gt','Operativo','archive_management',management,{deleted:true,eliminado:true,archivado:true,
    deleteReason:'Gestión QA solamente',deletedAt:new Date().toISOString(),deletedByRole:'Operativo'});
  assert.equal((await doc('gestiones',management).get()).data().archivado,true);checks++;
  const policyId='b4003qa_i66_ops_pol1';
  await doc('polizas',policyId).set({id:policyId,tenantId:tenant,clienteId:'cli-1',
    asesorId:'advisor-other',pais:'GT',__syntheticQa:true,historial:[]});
  const endorsementData={tenantId:tenant,asesorId:'advisor-other',pais:'GT',clienteId:'cli-1',polizaId:policyId,
    workflowType:'endorsement_request',endorsementType:'beneficiario',endorsementKey:tenant+'|'+policyId+'|beneficiario',
    endorsementStage:'SOLICITADO',estado:'Pendiente',titulo:'QA Endoso solicitado'};
  await doc('gestiones','ges_i66_endoso_pending').set({...endorsementData,id:'ges_i66_endoso_pending'});
  await go('op-gt','Operativo','archive_management','ges_i66_endoso_pending',{deleted:true,eliminado:true,archivado:true,
    deleteReason:'Endoso QA sin aplicar',deletedAt:new Date().toISOString(),deletedByRole:'Operativo'});
  assert.equal((await doc('gestiones','ges_i66_endoso_pending').get()).data().archivado,true);checks++;
  await doc('gestiones','ges_i66_endoso_applied').set({...endorsementData,id:'ges_i66_endoso_applied',endorsementStage:'APLICADO',policyUpdatedId:policyId});
  await match(()=>go('op-gt','Operativo','archive_management','ges_i66_endoso_applied',{deleted:true,eliminado:true,
    archivado:true,deleteReason:'Intento no autorizado',deletedAt:new Date().toISOString()}),'ENDOSO_APPLIED_OR_REFERENCED_ARCHIVE_FORBIDDEN');
  assert.notEqual((await doc('gestiones','ges_i66_endoso_applied').get()).data().archivado,true);checks++;
  console.log('I66_OPS_EMULATOR_AUTHENTICATED_ROLE_COUNTRY_BUSINESS_MANAGEMENT_PASS checks='+checks+' project='+process.env.GCLOUD_PROJECT+' liveWrites=0');
})().catch(e=>{console.error('I66_OPS_EMULATOR_BLOCKER='+String(e&&e.code||e&&e.message||e).slice(0,170));process.exitCode=1;});
