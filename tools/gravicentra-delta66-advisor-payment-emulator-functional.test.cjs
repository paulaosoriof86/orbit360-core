'use strict';
// I6.6 Advisor report → Ops: real Firestore emulator only; NO CLOUD credentials or project writes.
const assert=require('node:assert/strict');
if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('I66_ADVISOR_EMULATOR_HOST_REQUIRED');
if(process.env.GCLOUD_PROJECT!=='demo-gravicentra-i66-payments')throw Error('I66_ADVISOR_DEMO_PROJECT_REQUIRED');
if(process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('I66_ADVISOR_FORBID_CLOUD_CREDENTIALS');
const {createRequire}=require('node:module'),path=require('node:path');
const fromFunctions=createRequire(path.resolve(__dirname,'../functions/package.json'));
const {initializeApp,getApps}=fromFunctions('firebase-admin/app');
const {getFirestore}=fromFunctions('firebase-admin/firestore');
if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT});
const db=getFirestore();
const tenant='demo-advisor-i66',foreignTenant='demo-foreign-i66';
const reconciliation=require('../functions/cobros-reconciliation-domain.js');
const processor=require('../functions/notification-outbox-processor.js');
const inbox=require('../functions/ops-advisor-inbox.js');
const command=reconciliation.orbit360CobrosReconciliationCommand;
const getInbox=inbox.orbit360GetAdvisorOpsInbox;
const updateInbox=inbox.orbit360UpdateAdvisorOpsInboxState;
assert.equal(typeof command.run,'function');
assert.equal(typeof getInbox.run,'function');
assert.equal(typeof updateInbox.run,'function');
assert.equal(typeof processor.__notificationOutboxProcessor.processOutbox,'function');
const coll=(t,c)=>db.collection('tenants').doc(t).collection(c);
const data=(c,id,t=tenant)=>coll(t,'data').doc(c).collection('items').doc(id);
const member=(uid,t=tenant)=>coll(t,'members').doc(uid);
const actor=(uid,t=tenant)=>({uid,token:{name:'QA ficticia',email:'qa@example.invalid'}});
const signed=(uid,role,countries,advisorId='',t=tenant)=>({
  uid,tenantId:t,status:'active',roles:[role],activeRole:role,countries,advisorId,
  dataScopes:{modules:{ops:role==='Asesor'?'propios':'todos',leads:role==='Asesor'?'propios':'todos'}}
});
const request=(uid,role,body={},t=tenant)=>({auth:actor(uid,t),data:{tenantId:t,activeRole:role,...body}});
const report=(uid,receiptId,reqId,amount=250)=>command.run(request(uid,'Asesor',{
  operation:'report_advisor_payment',requestId:reqId,reason:'QA emulador pago reportado',
  payload:{receiptId,paidDate:'2026-08-18',evidenceAsOfDate:'2026-08-19',paymentMethod:'Transferencia bancaria',
    amount,note:'QA; no aplica pago'}
}));
const inboxFor=(uid,role,t=tenant)=>getInbox.run(request(uid,role,{limit:100,includeArchived:true},t));
const noticesOf=(x)=>x.notices.filter(n=>n.operation==='report_advisor_payment');
let checks=0,stage='setup';
const expectDenied=async(fn,code='permission-denied')=>{
  await assert.rejects(fn,e=>String(e.code||'').includes(code)||String(e.message||'').includes(code));checks++;
};
const seed=async(id,country,advisorId,monto)=>{
  await data('polizas','pol_'+id).set({id:'pol_'+id,pais:country,asesorId:advisorId,clienteId:'cli_'+id});
  await data('recibosEsperados','rec_'+id).set({id:'rec_'+id,polizaId:'pol_'+id,asesorId:advisorId,clienteId:'cli_'+id,pais:country,monto,estado:'Pendiente'});
};
(async()=>{
  await Promise.all([
    member('advisor-gt').set(signed('advisor-gt','Asesor',['GT'],'ase-gt')),
    member('advisor-co').set(signed('advisor-co','Asesor',['CO'],'ase-co')),
    member('advisor-cross').set(signed('advisor-cross','Asesor',['GT'],'ase-co')),
    member('advisor-other').set(signed('advisor-other','Asesor',['GT'],'ase-other')),
    member('op-gt').set(signed('op-gt','Operativo',['GT'])),
    member('op-co').set(signed('op-co','Operativo',['CO'])),
    member('admin-gt').set(signed('admin-gt','AdminTenant',['GT'])),
    member('super-gt').set(signed('super-gt','SuperAdmin',['GT'])),
    member('direction-gt').set(signed('direction-gt','Direccion',['GT'])),
    member('op-foreign').set(signed('op-foreign','Operativo',['GT'],'',foreignTenant)),
    member('op-foreign',foreignTenant).set(signed('op-foreign','Operativo',['GT'],'',foreignTenant))
  ]);
  await seed('gt','GT','ase-gt',250);
  await seed('co','CO','ase-co',400);
  stage='cross-country-negative';
  await expectDenied(()=>report('advisor-cross','rec_co','req_cross_001',400));
  assert.equal((await coll(tenant,'notificationOutbox').get()).size,0);checks++;
  stage='foreign-advisor-negative';
  await expectDenied(()=>report('advisor-other','rec_gt','req_wrong_001'));
  stage='tenant-mismatch-negative';
  await expectDenied(()=>report('op-foreign','rec_gt','req_tenant_001'));
  stage='positive-gt';
  const gt=await report('advisor-gt','rec_gt','req_gt_001');
  assert.equal(gt.ok,true);assert.equal(gt.paymentState,'REPORTED_PENDING_OPERATIVE_VALIDATION');checks++;
  assert.equal((await data('recibosEsperados','rec_gt').get()).data().paymentState,'REPORTED_PENDING_OPERATIVE_VALIDATION');checks++;
  const same=await report('advisor-gt','rec_gt','req_gt_001');
  assert.equal(same.reused,true);checks++;
  stage='positive-co';
  const co=await report('advisor-co','rec_co','req_co_001',400);
  assert.equal(co.ok,true);checks++;
  const events=await coll(tenant,'reconciliationEvents').get(),outbox=await coll(tenant,'notificationOutbox').get();
  assert.equal(events.size,2);assert.equal(outbox.size,2);checks++;
  const notificationRows=outbox.docs.map(x=>({id:x.id,...x.data()}));
  const gtOut=notificationRows.find(x=>x.pais==='GT'),coOut=notificationRows.find(x=>x.pais==='CO');
  assert(gtOut&&coOut);assert.deepEqual(gtOut.targets,[{type:'role',id:'operations'}]);checks++;
  for(const row of notificationRows){
    assert.equal(row.eventSource,'reconciliation');assert.deepEqual(row.channels,['in_app']);checks++;
    assert.equal((await coll(tenant,'reconciliationEvents').doc(row.id).get()).data().managementId,row.entityId);checks++;
    assert.equal((await data('gestiones',row.entityId).get()).data().pais,row.pais);checks++;
    stage='process-'+row.pais;
    const first=await processor.__notificationOutboxProcessor.processOutbox(tenant,row.id,false,'system');
    assert.equal(first.ok,true);assert.equal(first.status,'delivered_internal');checks++;
    const twice=await processor.__notificationOutboxProcessor.processOutbox(tenant,row.id,false,'system');
    assert.equal(twice.reused,true);checks++;
    const updated=(await coll(tenant,'notificationOutbox').doc(row.id).get()).data();
    assert.equal(updated.canonicalEventVerified,true);checks++;
  }
  assert.equal((await coll(tenant,'internalNotifs').get()).size,2);checks++;
  assert.equal((await db.collection('tenantId').doc(tenant).collection('notifs').get()).size,0,'role notices are not client portal messages');checks++;
  assert.equal((await data('cobros','dummy').parent.get()).size,0,'advisor reports never apply payment');checks++;
  stage='recipient-country-matrix';
  for(const [uid,role,expectedCountry] of [
    ['op-gt','Operativo','GT'],['op-co','Operativo','CO'],['admin-gt','AdminTenant','GT'],
    ['super-gt','SuperAdmin','GT'],['direction-gt','Direccion','GT']
  ]){
    const list=await inboxFor(uid,role);
    const selected=noticesOf(list);
    assert.equal(selected.length,1,uid+' must only receive one authorized report');
    assert.equal(selected[0].eventId,expectedCountry==='GT'?gtOut.id:coOut.id);checks++;
    const managementId=expectedCountry==='GT'?gt.managementId:co.managementId;
    assert(list.managements.some(x=>x.id===managementId),uid+' sees country-appropriate linked Ops task');checks++;
    assert(!list.managements.some(x=>x.id===(expectedCountry==='GT'?co:gt).managementId),uid+' cannot see wrong-country payment task');checks++;
  }
  assert.equal(noticesOf(await inboxFor('advisor-gt','Asesor')).length,0);checks++;
  assert.equal(noticesOf(await inboxFor('op-foreign','Operativo',foreignTenant)).length,0);checks++;
  await expectDenied(()=>inboxFor('op-foreign','Operativo'));
  stage='foreign-notice-resolution-negative';
  await expectDenied(()=>updateInbox.run(request('op-gt','Operativo',{noticeId:coOut.id,action:'resolve'})));
  assert.equal((await coll(tenant,'inboxTasks').doc(coOut.id).get()).exists,false);checks++;
  stage='authorized-resolution';
  const resolved=await updateInbox.run(request('op-gt','Operativo',{noticeId:gtOut.id,action:'resolve'}));
  assert.equal(resolved.globalResolved,true);checks++;
  stage='orphan-outbox';
  await coll(tenant,'notificationOutbox').doc('orphan_qai66_evt').set({
    tenantId:tenant,eventId:'orphan_qai66_evt',eventSource:'reconciliation',operation:'report_advisor_payment',
    entityType:'gestiones',entityId:'missing_gestion',receiptId:'missing_receipt',
    pais:'GT',asesorId:'ase-gt',targets:[{type:'role',id:'operations'}],channels:['in_app'],createdAt:new Date().toISOString()
  });
  const orphan=await processor.__notificationOutboxProcessor.processOutbox(tenant,'orphan_qai66_evt',false,'system');
  assert.equal(orphan.ok,false);checks++;
  assert.equal((await coll(tenant,'internalNotifs').get()).size,2,'orphan cannot generate internal notification');checks++;
  stage='direct-payment-seven-methods-after-advisor-notices';
  const methods=['Transferencia bancaria','Tarjeta de crédito','Tarjeta de débito','Cheque','Efectivo','Visa cuotas','Link de pago'];
  const apply=(uid,role,receiptId,requestId,method,amount)=>command.run(request(uid,role,{
    operation:'apply_payment',requestId,reason:'QA aislado: aplicación canónica de pago',
    payload:{receiptId,sourceType:'manual',paidDate:'2026-11-10',paymentMethod:method,amount}
  }));
  for(let i=0;i<methods.length;i++){
    const suffix='method_'+i,receiptId='rec_'+suffix,amount=100+i;
    await seed(suffix,'GT','ase-gt',amount);
    await data('recibosEsperados',receiptId).set({moneda:'GTQ'},{merge:true});
    await data('carteraPrimas','car_'+suffix).set({id:'car_'+suffix,reciboId:receiptId,polizaId:'pol_'+suffix,
      clienteId:'cli_'+suffix,pais:'GT',moneda:'GTQ',monto:amount,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
    const requestId='qa_payment_method_'+i;
    const done=await apply('op-gt','Operativo',receiptId,requestId,methods[i],amount);
    assert.equal(done.ok,true,methods[i]);assert.equal(done.portfolioUpdated,true,methods[i]);checks++;
    assert.equal((await data('recibosEsperados',receiptId).get()).data().estado,'Pagado');checks++;
    assert.equal((await data('carteraPrimas','car_'+suffix).get()).data().estadoCartera,'Pagado');checks++;
    const cobro=(await data('cobros',done.cobroId).get()).data();
    assert.equal(cobro.estado,'Pagado');assert.equal(cobro.paymentMethod,methods[i]);checks++;
    const retry=await apply('op-gt','Operativo',receiptId,requestId,methods[i],amount);
    assert.equal(retry.reused,true,methods[i]);checks++;
    const rows=await coll(tenant,'data').doc('cobros').collection('items').where('reciboId','==',receiptId).get();
    assert.equal(rows.size,1,'only one physical cobro per receipt: '+methods[i]);checks++;
  }
  stage='direct-payment-repeat-id-and-portfolio-guard';
  const eventsBeforeRepeat=(await coll(tenant,'reconciliationEvents').get()).size;
  const paidBeforeRepeat=(await data('cobros','dummy').parent.where('reciboId','==','rec_method_0').get()).docs[0].data();
  await expectDenied(()=>apply('op-gt','Operativo','rec_method_0','qa_other_request_same_receipt','Efectivo',100),'failed-precondition');
  assert.equal((await coll(tenant,'reconciliationEvents').get()).size,eventsBeforeRepeat,'different ID cannot emit duplicate receipt payment');checks++;
  assert.equal((await data('cobros','dummy').parent.where('reciboId','==','rec_method_0').get()).docs[0].data().paymentMethod,paidBeforeRepeat.paymentMethod);checks++;
  await seed('no_portfolio','GT','ase-gt',999);
  await expectDenied(()=>apply('op-gt','Operativo','rec_no_portfolio','qa_no_active_portfolio','Cheque',999),'failed-precondition');
  assert.equal((await data('cobros','dummy').parent.where('reciboId','==','rec_no_portfolio').get()).size,0,'incomplete ledger cannot commit partial paid state');checks++;
  const enriched=await command.run(request('op-gt','Operativo',{
    operation:'apply_payment',requestId:'qa_enrich_insurer_invoice_001',reason:'QA factura conciliada posterior',
    payload:{receiptId:'rec_method_0',sourceType:'insurer_invoice',invoiceNumber:'QA-INV-100',applicationDate:'2026-11-10',amount:100}
  }));
  assert.equal(enriched.ok,true);assert.equal(enriched.portfolioUpdated,true);checks++;
  assert.equal((await data('cobros','dummy').parent.where('reciboId','==','rec_method_0').get()).size,1,'enrichment preserves one cobro');checks++;
    stage='direct-payment-authorization';
  await expectDenied(()=>apply('advisor-gt','Asesor','rec_method_0','qa_advisor_wrong','Efectivo',100));
  await expectDenied(()=>apply('op-co','Operativo','rec_method_0','qa_country_wrong','Efectivo',100));
  stage='direct-payment-country-invariants';
  await seed('co_direct','CO','ase-co',333);
  await data('recibosEsperados','rec_co_direct').set({moneda:'COP'},{merge:true});
  await data('carteraPrimas','car_co_direct').set({id:'car_co_direct',reciboId:'rec_co_direct',polizaId:'pol_co_direct',
    clienteId:'cli_co_direct',pais:'CO',moneda:'COP',monto:333,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
  const coDirect=await apply('op-co','Operativo','rec_co_direct','qa_co_direct_001','Efectivo',333);
  assert.equal(coDirect.ok,true);assert.equal(coDirect.portfolioUpdated,true);checks++;
  assert.equal((await data('carteraPrimas','car_co_direct').get()).data().estadoCartera,'Pagado');checks++;
  await expectDenied(()=>apply('op-gt','Operativo','rec_co_direct','qa_gt_wrong_co','Cheque',333));
  await expectDenied(()=>command.run(request('op-co','Operativo',{
    operation:'reconcile_evidence',requestId:'qa_inference_country_wrong',reason:'QA aislado país inferencia',
    payload:{policyId:'pol_method_0',evidenceType:'BANK_STATEMENT_MATCH',evidenceId:'qa-country-boundary',uniqueMatch:true}
  })));
  await seed('country_conflict','GT','ase-gt',278);
  await data('recibosEsperados','rec_country_conflict').set({pais:'CO'},{merge:true});
  await expectDenied(()=>apply('op-gt','Operativo','rec_country_conflict','qa_policy_receipt_country_conflict','Cheque',278),'failed-precondition');
  stage='advisor-report-to-operative-application';
  await data('carteraPrimas','car_gt').set({id:'car_gt',reciboId:'rec_gt',polizaId:'pol_gt',clienteId:'cli_gt',
    pais:'GT',moneda:'GTQ',monto:250,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
  const fromReport=await apply('op-gt','Operativo','rec_gt','qa_apply_reported_gt','Transferencia bancaria',250);
  assert.equal(fromReport.ok,true);assert.equal(fromReport.portfolioUpdated,true);checks++;
  assert.equal((await data('recibosEsperados','rec_gt').get()).data().paymentIntakeState,'VALIDATED_APPLIED');checks++;
  assert.equal((await data('gestiones',gt.managementId).get()).data().paymentReportStatus,'VALIDATED_APPLIED');checks++;
  assert.equal((await data('carteraPrimas','car_gt').get()).data().estadoCartera,'Pagado');checks++;
  console.log('I66_PAYMENT_DIRECT_SEVEN_METHODS_AND_ADVISOR_TO_OPS_EMULATOR_PASS checks='+checks+' methods='+methods.length+' liveWrites=0');
  console.log('I66_ADVISOR_PAYMENT_OUTBOX_EMULATOR_ROLE_COUNTRY_IDEMPOTENCY_PASS checks='+checks+' project='+process.env.GCLOUD_PROJECT+' liveWrites=0');
})().catch(e=>{console.error('I66_ADVISOR_PAYMENT_EMULATOR_BLOCKER_STAGE='+stage+' CODE='+String(e&&e.code||'')+' MESSAGE='+String(e&&e.message||e).slice(0,250));process.exitCode=1;});
