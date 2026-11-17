'use strict';
// Called only after the existing driver has established its signed session and
// applicable legal acceptance. No login, consent, transport override or seed API.
const crypto=require('node:crypto');
const TENANT='alianzas-soluciones',SCHEMA='GI_I66_DOCUMENTED_TERMS_SIGNED_CHECK_V1';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:(JSON.stringify(stable(v))??'__undefined__')).digest('hex');
const normalized=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function check(ok,code){if(!ok){const error=Error('I66_DOCUMENTED_TERMS_'+code);error.code='I66_DOCUMENTED_TERMS_'+code;throw error;}}
function contextIdentity({role,actorUid,tenantId,live,clientId},origin,source){
  check(normalized(role)==='direccion'&&typeof actorUid==='string'&&actorUid.length>0&&actorUid.length<=128,'ACTOR_REQUIRED');
  check(tenantId===TENANT&&typeof live==='boolean','SCOPE_REQUIRED');
  check(typeof clientId==='string'&&/^b4003qa_i66_cxp_[a-z0-9_]+_client(?![\s\S])/.test(clientId),'EXACT_SYNTHETIC_CLIENT_REQUIRED');
  check(typeof source==='string'&&/^[a-f0-9]{40}(?![\s\S])/.test(source),'SOURCE_REQUIRED');
  check(typeof origin==='string'&&(live?origin==='https://app.aysseguros.com':/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app(?![\s\S])/.test(origin)),'ORIGIN_REQUIRED');
  return{origin,source,live,role:'direccion',actorUid,tenantId,clientId,region:live?'us-central1':'us-east1',functionName:live?'orbit360ProductOperationalCommand':'orbit360ProductOperationalCommandPreview'};
}
function clientProof(row,cfg){
  check(row&&row.id===cfg.clientId&&row.tenantId===cfg.tenantId&&row.pais==='GT'&&row.__syntheticQa===true&&
    typeof row.__qaRunId==='string'&&cfg.clientId===row.__qaRunId+'_client'&&/^b4003qa_i66_cxp_[a-z0-9_]+(?![\s\S])/.test(row.__qaRunId),'CLIENT_NOT_OWNED_QA');
}
function fixtureIdentity(nonce){
  check(typeof nonce==='string'&&/^[a-f0-9]{24}(?![\s\S])/.test(nonce),'NONCE_INVALID');
  const runId='b4003qa_i66_documented_'+nonce,requestId=runId+'_request';
  return{runId,policyId:runId+'_policy',receiptId:runId+'_receipt',requestId,eventId:'opevt_'+hash(TENANT+'|'+requestId).slice(0,28)};
}
function validateCalculation(value,ids,cfg){
  check(value&&value.policy&&value.receipt,'CALCULATION_MISSING');
  const p=value.policy,r=value.receipt;
  for(const row of [p,r]){
    check(row.primaNeta===630&&row.otros===200&&row.gastosEmision===41.5&&row.primaTotal===978.78&&row.cargoNoGravadoMonto===2.7,'AMOUNT_MISMATCH');
    check(row.cargoNoGravadoConcepto==='Bomberos'&&row.cargoNoGravadoDocumentRef==='QA-DOCUMENTED-TERMS','PROVENANCE_MISMATCH');
    check(row.tenantId===cfg.tenantId&&row.pais==='GT'&&row.moneda==='GTQ'&&row.clienteId===cfg.clientId&&row.__syntheticQa===true&&row.__qaRunId===ids.runId&&row.__qaActorUid===cfg.actorUid,'FIXTURE_SCOPE_MISMATCH');
    check(row.conducto===''&&!row.fechaPago&&!row.pagado,'UNKNOWN_PAYMENT_MISMATCH');
  }
  check(p.formaPago===''&&r.metodo===null,'UNKNOWN_PAYMENT_MISMATCH');
  check(p.id===ids.policyId&&r.id===ids.receiptId&&r.polizaId===p.id&&p.ivaMonto===104.58&&r.iva===104.58,'IDENTITY_OR_IVA_MISMATCH');
  check(p.cuotas===1&&Array.isArray(p.vencimientosDocumentados)&&p.vencimientosDocumentados.length===1&&
    p.vencimientosDocumentados[0].secuencia===1&&p.vencimientosDocumentados[0].fechaVencimiento==='2026-11-06'&&
    p.vencimientosDocumentados[0].documentRef==='QA-DOCUMENTED-TERMS'&&r.fechaVencimientoContractual==='2026-11-06'&&r.vence==='2026-11-06','CALENDAR_MISMATCH');
  check(r.comAseguradora===63&&r.comVendedor===37.8&&r.estado!=='Pagado','COMMISSION_OR_PAYMENT_MISMATCH');
  return[{action:'insert',collection:'polizas',id:p.id,payload:p},{action:'insert',collection:'recibosEsperados',id:r.id,payload:r}];
}
function assertPersisted(row,mutation,ids,cfg){
  check(row&&row.id===mutation.id&&row.__syntheticQa===true&&row.__qaRunId===ids.runId&&row.__qaActorUid===cfg.actorUid&&row.tenantId===cfg.tenantId&&row.createdByUid===cfg.actorUid&&row.updatedByUid===cfg.actorUid,'PERSISTED_OWNER_MISMATCH');
  check(Object.keys(mutation.payload).every(k=>hash(row[k])===hash(mutation.payload[k])),'PERSISTED_PAYLOAD_MISMATCH');
  const allowed=new Set([...Object.keys(mutation.payload),'createdAt','createdByUid','updatedAt','updatedByUid']);
  check(Object.keys(row).every(k=>allowed.has(k)),'PERSISTED_UNEXPECTED_FIELD');
}
function auditProof(request,event,ids,cfg,payloadDigest){
  check(request&&request.status==='committed'&&request.payloadDigest===payloadDigest&&request.result?.requestId===ids.requestId&&request.result?.eventId===ids.eventId&&request.result?.mutationCount===2&&request.result?.serverOwned===true,'REQUEST_PROOF_MISMATCH');
  check(event&&event.tenantId===cfg.tenantId&&event.actorUid===cfg.actorUid&&normalized(event.activeRole)==='direccion'&&event.requestId===ids.requestId&&event.eventId===ids.eventId&&event.payloadDigest===payloadDigest&&event.mutationCount===2,'EVENT_PROOF_MISMATCH');
  check(JSON.stringify(request.result.collections)===JSON.stringify(['polizas','recibosEsperados'])&&JSON.stringify(event.collections)===JSON.stringify(['polizas','recibosEsperados']),'AUDIT_COLLECTION_MISMATCH');
}
function validateUi(values){
  check(values&&values.payment===''&&values.conduct===''&&values.charge==='2.70'&&values.concept==='Bomberos'&&values.reference==='QA-DOCUMENTED-TERMS'&&values.calendar==='1 | 2026-11-06 | QA-DOCUMENTED-TERMS','UI_FIELD_MISMATCH');
  check(values.totalVisible===true&&values.dateVisible===true,'UI_PREVIEW_MISMATCH');
}
async function runDocumentedTermsCheck({page,role,actorUid,tenantId,live,db,clientId}){
  const cfg=contextIdentity({role,actorUid,tenantId,live,clientId},process.env.I66_PREVIEW_ORIGIN,process.env.I66_SOURCE_SHA);
  const routeBefore=page.url();check(new URL(routeBefore).origin===cfg.origin,'PAGE_ORIGIN_DRIFT');
  const ids=fixtureIdentity(crypto.randomBytes(12).toString('hex'));
  const tenant=db.collection('tenants').doc(tenantId),ref=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
  const clientRef=ref('clientes',clientId),clientBefore=await clientRef.get();clientProof(clientBefore.exists&&clientBefore.data(),cfg);
  const clientDigest=hash(clientBefore.data()),recordRefs=[ref('polizas',ids.policyId),ref('recibosEsperados',ids.receiptId)],requestRef=tenant.collection('operationalRequests').doc(ids.requestId),eventRef=tenant.collection('operationalEvents').doc(ids.eventId),targets=[...recordRefs,requestRef,eventRef];
  const proof={schemaVersion:SCHEMA,sourceSha:cfg.source,phase:live?'LIVE':'PREVIEW',status:'HOLD',ui:'NOT_RUN',durableReadbackCount:0,reloadPerformed:false,sessionPreserved:false,modalCancelled:false,realCustomerWrites:0,financialPayments:0,bankMovements:0,cleanup:{status:'NOT_STARTED',remaining:null}};
  let armed=false,mutations=null,failure=null,opened=false;
  try{
    const state=await page.evaluate(async expected=>{
      const providers=Orbit.productRuntimeBrowserProvidersP0,connection=await providers.initialize();
      const response=await fetch('/__recovery__/build.json',{cache:'no-store'});if(!response.ok)throw Error('MARKER_MISSING');
      const marker=await response.json();
      return{uid:connection.auth.currentUser?.uid||'',role:Orbit.session.rol(),tenant:Orbit.access.tenantId(),markerSource:marker.sourceSha,buildId:marker.buildId,gate:marker.gate,product:marker.product,
        legalGate:!!document.querySelector('[data-legal-gate]'),modalOpen:!!document.querySelector('#policy-v1199'),preview:providers.isI66PreviewHost()};
    },cfg.source);
    check(state.uid===actorUid&&normalized(state.role)==='direccion'&&state.tenant===tenantId&&state.preview===!live,'SIGNED_SESSION_DRIFT');
    check(!state.legalGate,'LEGAL_GATE_BLOCKED');check(!state.modalOpen,'EXISTING_MODAL_BLOCKED');
    check(state.markerSource===cfg.source&&state.gate==='I6.6'&&state.product==='Gravicentra Insurance'&&typeof state.buildId==='string'&&
      new RegExp('^gi-i66-'+cfg.source.slice(0,12)+'-[a-f0-9]{12}(?![\\s\\S])').test(state.buildId)&&state.buildId===process.env.I66_EXPECTED_BUILD_ID,'SERVED_SOURCE_DRIFT');proof.buildId=state.buildId;
    for(const target of targets)check(!(await target.get()).exists,'TARGET_COLLISION');armed=true;
    await page.evaluate(async id=>{await Orbit.store._ensureCollections(['clientes','aseguradoras','polizas','recibosEsperados']);},clientId);
    await page.waitForFunction(id=>Orbit.store.get('clientes',id)?.__syntheticQa===true,clientId,{timeout:30000});
    await page.evaluate(id=>Orbit.modules.cliente360.nuevaPoliza(id),clientId);opened=true;
    const form=page.locator('#policy-v1199');await form.waitFor({state:'visible',timeout:30000});
    check(await form.locator('[data-client]').inputValue()===clientId,'UI_CLIENT_DRIFT');
    check(await form.locator('[data-payment-form]').inputValue()===''&&await form.locator('[data-conduct]').inputValue()==='','UI_UNKNOWN_DEFAULT_MISMATCH');
    await form.locator('[data-frequency]').selectOption('Contado');
    for(const [field,value]of Object.entries({start:'2026-10-20',end:'2027-10-20',net:'630',issue:'41.50',other:'200',surcharge:'0',nonvat:'2.70','nonvat-concept':'Bomberos','nonvat-ref':'QA-DOCUMENTED-TERMS','documented-calendar':'1 | 2026-11-06 | QA-DOCUMENTED-TERMS'}))await form.locator('[data-'+field+']').fill(value);
    const values=await form.evaluate(node=>{const value=name=>node.querySelector('[data-'+name+']').value,text=node.querySelector('[data-preview]').textContent;return{payment:value('payment-form'),conduct:value('conduct'),charge:value('nonvat'),concept:value('nonvat-concept'),reference:value('nonvat-ref'),calendar:value('documented-calendar'),totalVisible:/978[.,]78/.test(text),dateVisible:text.includes('2026-11-06')};});validateUi(values);
    await form.getByRole('button',{name:'Cancelar',exact:true}).click();await form.waitFor({state:'detached',timeout:30000});opened=false;proof.modalCancelled=true;proof.ui='PASS';
    const computed=await page.evaluate(({ids,cfg})=>{
      const mark={tenantId:cfg.tenantId,pais:'GT',moneda:'GTQ',__syntheticQa:true,__qaRunId:ids.runId,__qaActorUid:cfg.actorUid};
      const input={...mark,id:ids.policyId,clienteId:cfg.clientId,asesorId:'',aseguradoraId:'',numero:'QA-DOCUMENTED-TERMS',ramo:'AUTOMOVILES',producto:'QA',estado:'Vigente',
        vigenciaInicio:'2026-10-20',vigenciaFin:'2027-10-20',frecuencia:'Contado',cuotas:1,formaPago:'',conducto:'',primaNeta:630,gastosEmision:41.5,otros:200,recargoFinPct:0,ivaPct:12,
        comAseguradoraPct:10,comVendedorPct:60,cargoNoGravadoMonto:2.7,cargoNoGravadoConcepto:'Bomberos',cargoNoGravadoDocumentRef:'QA-DOCUMENTED-TERMS',
        vencimientosDocumentados:[{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'QA-DOCUMENTED-TERMS'}]};
      const policy=Object.assign(Orbit.policyReceipts.preparePolicy(input,null,ids.policyId),mark),rows=Orbit.policyReceipts.expectedReceipts(policy);
      if(rows.length!==1)throw Error('COUNT_MISMATCH');
      const receipt=Object.assign(rows[0],mark,{id:ids.receiptId});
      return JSON.parse(JSON.stringify({policy,receipt}));
    },{ids,cfg});
    mutations=validateCalculation(computed,ids,cfg);
    const result=await page.evaluate(async({cfg,ids,mutations})=>Orbit.productRuntimeBrowserProvidersP0.callFunction(cfg.functionName,{tenantId:cfg.tenantId,activeRole:cfg.role,requestId:ids.requestId,mutations},cfg.region),{cfg,ids,mutations});
    check(result?.ok===true&&result.canonicalReadback===true&&result.canonicalReadbackCount===2&&result.requestId===ids.requestId&&result.eventId===ids.eventId,'SERVER_READBACK_MISSING');
    for(let i=0;i<2;i++)assertPersisted((await recordRefs[i].get()).data(),mutations[i],ids,cfg);
    auditProof((await requestRef.get()).data(),(await eventRef.get()).data(),ids,cfg,hash(mutations));proof.durableReadbackCount=2;
    check(hash((await clientRef.get()).data())===clientDigest,'CLIENT_CHANGED');
    const after=await page.evaluate(()=>({uid:Orbit.auth?.productUser?.uid||'',role:Orbit.session.rol(),modal:!!document.querySelector('#policy-v1199'),gate:!!document.querySelector('[data-legal-gate]')}));
    check(after.uid===actorUid&&normalized(after.role)==='direccion'&&!after.modal&&!after.gate&&page.url()===routeBefore,'SESSION_OR_ROUTE_CHANGED');proof.sessionPreserved=true;
  }catch(error){failure=error;proof.failureCode=typeof error?.code==='string'&&/^I66_DOCUMENTED_TERMS_[A-Z_]+(?![\s\S])/.test(error.code)?error.code:'I66_DOCUMENTED_TERMS_RUNTIME_HOLD';}
  finally{
    const cleanupErrors=[];
    if(opened)try{const form=page.locator('#policy-v1199');await form.getByRole('button',{name:'Cancelar',exact:true}).click();await form.waitFor({state:'detached',timeout:10000});proof.modalCancelled=true;}catch{cleanupErrors.push('MODAL_RESTORE');}
    if(armed){
      for(let i=0;i<2;i++)try{const snap=await recordRefs[i].get();if(snap.exists){check(!!mutations,'UNEXPECTED_RECORD');assertPersisted(snap.data(),mutations[i],ids,cfg);await recordRefs[i].delete({lastUpdateTime:snap.updateTime});}}catch{cleanupErrors.push('RECORD_RESTORE');}
      try{const [request,event]=await Promise.all([requestRef.get(),eventRef.get()]);if(request.exists||event.exists){check(!!mutations,'UNEXPECTED_AUDIT');auditProof(request.data(),event.data(),ids,cfg,hash(mutations));await eventRef.delete({lastUpdateTime:event.updateTime});await requestRef.delete({lastUpdateTime:request.updateTime});}}catch{cleanupErrors.push('AUDIT_RESTORE');}
      try{proof.cleanup.remaining=(await Promise.all(targets.map(r=>r.get()))).filter(s=>s.exists).length;}catch{cleanupErrors.push('ABSENCE_READBACK');}
    }else proof.cleanup.remaining=0;
    try{check(hash((await clientRef.get()).data())===clientDigest,'CLIENT_CHANGED');}catch{cleanupErrors.push('CLIENT_CHANGED');}
    proof.cleanup.status=cleanupErrors.length||proof.cleanup.remaining?'HOLD':'PASS';if(cleanupErrors.length)proof.cleanup.failureClasses=[...new Set(cleanupErrors)];
  }
  if(!failure&&proof.ui==='PASS'&&proof.durableReadbackCount===2&&proof.sessionPreserved&&proof.cleanup.status==='PASS')proof.status='PASS';
  if(proof.status!=='PASS'){const error=Error('I66_DOCUMENTED_TERMS_SIGNED_HOLD');error.code='I66_DOCUMENTED_TERMS_SIGNED_HOLD';error.documentedTermsProof=proof;throw error;}
  return proof;
}
module.exports={SCHEMA,contextIdentity,clientProof,fixtureIdentity,validateCalculation,assertPersisted,auditProof,validateUi,hash,runDocumentedTermsCheck};
