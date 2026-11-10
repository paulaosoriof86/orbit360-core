'use strict';
// I6.6 Carlos: authentic backend + local Firestore emulator ONLY.
// This suite must never read production credentials or touch the real tenant.
const assert=require('node:assert/strict');
if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))
  throw Error('CARLOS_QA_EMULATOR_HOST_REQUIRED');
if(process.env.GCLOUD_PROJECT!=='demo-gravicentra-i66-carlos')
  throw Error('CARLOS_QA_DEMO_PROJECT_REQUIRED');
if(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  throw Error('CARLOS_QA_REAL_CREDENTIAL_FORBIDDEN');
const {createRequire}=require('node:module');
const fromFunctions=createRequire(require('node:path').resolve(__dirname,'../functions/package.json'));
const {initializeApp,getApps}=fromFunctions('firebase-admin/app');
const {getFirestore}=fromFunctions('firebase-admin/firestore');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT});
const db=getFirestore();
const domain=require('../functions/product-operational-domain.js');
const handler=domain.orbit360ProductOperationalCommand;
assert.equal(typeof handler.run,'function');
const TENANT='synthetic-carlos-i66',OTHER='synthetic-other-i66';
let checks=0,stage='setup';
const doc=(tenant,collection,id)=>db.collection('tenants').doc(tenant).collection('data').doc(collection).collection('items').doc(id);
const member=(tenant,uid)=>db.collection('tenants').doc(tenant).collection('members').doc(uid);
const access=tenant=>db.collection('tenants').doc(tenant).collection('config').doc('access');
const payload=(pais,asesorId,renovable=true)=>({id:'unused',tenantId:TENANT,pais,asesorId,clienteId:'cli_synthetic',numero:'QA-SYNTHETIC',renovable,primaTotal:24680,formaPago:'Mensual',periodicidad:12});
const mutation=(id,renovable,expected)=>({action:'update',collection:'polizas',id,payload:{renovable},expectedBefore:{renovable:expected}});
const req=(uid,role,mutations,requestId,tenantId=TENANT)=>({auth:{uid,token:{name:'Usuario QA',email:'qa-carlos@example.invalid'}},
  data:{tenantId,activeRole:role,requestId,mutations}});
const call=(uid,role,mutations,id,tenant)=>handler.run(req(uid,role,mutations,id,tenant));
async function denied(action,code='permission-denied'){
  await assert.rejects(action,e=>String(e.code||'').includes(code)||String(e.message||'').includes(code));
  checks++;
}
function pass(condition,label){assert.ok(condition,label);checks++;}
(async()=>{
  await access(TENANT).set({roleScopes:{Operativo:'todos',Asesor:'propios'},
    rolePermissions:{Operativo:{polizas:{ver:true,editar:true},cliente360:{ver:true,editar:true}}}});
  await access(OTHER).set({roleScopes:{Operativo:'todos'}});
  const mk=(tenantId,role,countries,advisorId,extra={})=>Object.assign({
    tenantId,status:'active',roles:[role],activeRole:role,countries,advisorId,
    dataScopes:{default:'propios'},modulesRestricted:[]
  },extra);
  await Promise.all([
    member(TENANT,'carlos-co').set(mk(TENANT,'Operativo',['CO'],'advisor-carlos')),
    member(TENANT,'operativo-gt').set(mk(TENANT,'Operativo',['GT'],'advisor-gt')),
    member(TENANT,'advisor-co').set(mk(TENANT,'Asesor',['CO'],'advisor-carlos')),
    member(TENANT,'operativo-none').set(mk(TENANT,'Operativo',['CO'],'advisor-carlos',{dataScopes:{default:'ninguno'}})),
    member(TENANT,'operativo-restricted').set(mk(TENANT,'Operativo',['CO'],'advisor-carlos',{modulesRestricted:['polizas']})),
    member(TENANT,'foreign-member').set(mk(OTHER,'Operativo',['CO'],'advisor-carlos')),
    member(OTHER,'other-tenant-user').set(mk(OTHER,'Operativo',['CO'],'advisor-carlos')),
  ]);
  const polCO=doc(TENANT,'polizas','pol_co_other');
  const polGT=doc(TENANT,'polizas','pol_gt_other');
  const polUnknown=doc(TENANT,'polizas','pol_unknown');
  const base=payload('CO','advisor-other');
  await polCO.set({...base,id:'pol_co_other',historial:[{kind:'original'}]});
  await polGT.set({...payload('GT','advisor-other'),id:'pol_gt_other'});
  await polUnknown.set({...payload('','advisor-other'),id:'pol_unknown'});
  await doc(TENANT,'recibosEsperados','rec_untouched').set({id:'rec_untouched',tenantId:TENANT,pais:'CO',asesorId:'advisor-other',valor:900,estado:'Pendiente'});
  await doc(TENANT,'carteraPrimas','car_untouched').set({id:'car_untouched',tenantId:TENANT,pais:'CO',asesorId:'advisor-other',saldo:1000});
  await doc(TENANT,'cobros','cob_untouched').set({id:'cob_untouched',tenantId:TENANT,pais:'CO',asesorId:'advisor-other',valor:200});
  const financeBefore=await Promise.all(['recibosEsperados/rec_untouched','carteraPrimas/car_untouched','cobros/cob_untouched'].map(async v=>(await doc(TENANT,...v.split('/')).get()).data()));
  stage='operativo-co-other-advisor-positive';
  const mutations=[mutation('pol_co_other',false,true),{action:'insert',collection:'actividades',id:'act_carlos_renew',
    payload:{pais:'CO',asesorId:'advisor-other',detalle:'Renovabilidad ajustada por Operativo con motivo',tipo:'edicion'}}];
  const result=await call('carlos-co','Operativo',mutations,'carlos-renew-first');
  pass(result.canonicalReadback===true&&result.canonicalReadbackCount===2,'server readback');
  const after=(await polCO.get()).data();
  pass(after.renovable===false,'renovabilidad persistente');
  pass(after.primaTotal===24680&&after.formaPago==='Mensual'&&after.periodicidad===12,'campos financieros conservados');
  pass(Array.isArray(after.historial)&&after.historial.length===1,'historial conservado');
  pass((await doc(TENANT,'actividades','act_carlos_renew').get()).exists,'actividad auditada');
  stage='idempotency';
  const repeated=await call('carlos-co','Operativo',mutations,'carlos-renew-first');
  pass(repeated.reused===true&&repeated.canonicalReadback===true,'idempotencia y readback');
  stage='stale-cas-negative';
  await denied(()=>call('carlos-co','Operativo',[mutation('pol_co_other',false,true)],'carlos-renew-stale'),'failed-precondition');
  stage='out-of-country-negative';
  await denied(()=>call('carlos-co','Operativo',[mutation('pol_gt_other',false,true)],'carlos-gt-denied'));
  await denied(()=>call('carlos-co','Operativo',[mutation('pol_unknown',false,true)],'carlos-unknown-denied'));
  stage='role-negative';
  await denied(()=>call('advisor-co','Asesor',[mutation('pol_co_other',true,false)],'advisor-foreign-policy'));
  await denied(()=>call('carlos-co','Asesor',[mutation('pol_co_other',true,false)],'carlos-role-forged'));
  stage='config-deny-negative';
  await denied(()=>call('operativo-none','Operativo',[mutation('pol_co_other',true,false)],'carlos-none-denied'));
  await denied(()=>call('operativo-restricted','Operativo',[mutation('pol_co_other',true,false)],'carlos-restr-denied'));
  stage='tenant-negative';
  await denied(()=>call('foreign-member','Operativo',[mutation('pol_co_other',true,false)],'carlos-foreign-member'));
  await denied(()=>call('other-tenant-user','Operativo',[mutation('pol_co_other',true,false)],'carlos-other-tenant',TENANT));
  stage='unauthenticated-negative';
  await denied(()=>handler.run({data:{tenantId:TENANT,activeRole:'Operativo',requestId:'unauth',
    mutations:[mutation('pol_co_other',true,false)]}}),'unauthenticated');
  stage='finance-preservation';
  const financeAfter=await Promise.all(['recibosEsperados/rec_untouched','carteraPrimas/car_untouched','cobros/cob_untouched'].map(async v=>(await doc(TENANT,...v.split('/')).get()).data()));
  assert.deepEqual(financeAfter,financeBefore);checks++;
  pass((await polGT.get()).data().renovable===true,'GT not modified');
  pass((await polUnknown.get()).data().renovable===true,'unknown not modified');
  pass((await polCO.get()).data().renovable===false,'CO not overwritten by negatives');
  console.log('I66_CARLOS_FIRESTORE_EMULATOR_ROLE_COUNTRY_TENANT_CAS_PASS checks='+checks+' liveWrites=0');
})().catch(e=>{
  console.error('I66_CARLOS_EMULATOR_BLOCKER_STAGE='+stage+' CODE='+String(e?.code||'')+
    ' MESSAGE='+String(e?.message||e).slice(0,240));
  process.exitCode=1;
});