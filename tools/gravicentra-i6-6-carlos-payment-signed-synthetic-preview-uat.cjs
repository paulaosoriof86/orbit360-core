'use strict';
// Signed Preview payment UAT, or explicitly gated exact LIVE synthetic UI UAT.
// Every document has a unique QA prefix and guarded finally cleanup.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const {digest,applicationIdFor}=require('../functions/proposal-application-boundary');
const PREVIEW=process.env.I66_PREVIEW_ORIGIN;
const TEST_LIVE_BACKEND=process.env.I66_PAYMENT_LIVE_BACKEND_ONLY==='true';
const TEST_LIVE_UI=process.env.I66_PAYMENT_LIVE_SIGNED_UI==='true';
const USE_LIVE_BACKEND=TEST_LIVE_BACKEND||TEST_LIVE_UI;
const LIVE_PAYMENT_URL='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommand';
const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
assert.ok(TEST_LIVE_UI?PREVIEW==='https://app.aysseguros.com':
  /^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app$/.test(PREVIEW||''),
  'PAYMENT_UAT_EXACT_AUTHORIZED_ORIGIN_REQUIRED');
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean).map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(s=>s&&s.type==='service_account'&&s.project_id===PROJECT&&s.private_key);
assert.ok(service,'PAYMENT_UAT_CONFIGURED_SAME_PROJECT_CREDENTIAL_REQUIRED');
admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),root=db.collection('tenants').doc(TENANT);
const col=(c)=>root.collection('data').doc(c).collection('items');
const idRef=(c,id)=>col(c).doc(id);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');

async function actors(){
  const [members,advisors]=await Promise.all([root.collection('members').limit(150).get(),col('asesores').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'PAYMENT_SIGNED_ACTOR_BOUNDED_SCAN_REQUIRED');
  const find=(name,role)=>{
    const links=new Set(),uids=new Set();
    for(const d of advisors.docs){const x=d.data()||{};
      if([x.nombre,x.nombreCompleto,x.displayName,x.name].some(v=>name(norm(v)))){
        links.add(d.id);[x.authUid,x.uid,x.userId].filter(Boolean).forEach(x=>uids.add(String(x)));
      }
    }
    const rows=members.docs.filter(d=>{const m=d.data()||{};
      return ([m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(v=>name(norm(v)))||
        links.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&norm(m.activeRole)===role&&m.active!==false&&
        m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado))&&
        [].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT');
    });
    assert.equal(rows.length,1,'PAYMENT_UAT_ACTOR_NOT_UNIQUE_'+role);
    return{uid:rows[0].id,role};
  };
  const out=[find(x=>x.startsWith('carlos castro'),'operativo'),find(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const actor of out){const u=await auth.getUser(actor.uid);assert.ok(!u.disabled&&u.emailVerified,'PAYMENT_UAT_ACTOR_AUTH_NOT_READY');actor.token=await auth.createCustomToken(actor.uid);}
  return out;
}

async function testActor(browser,actor){
  const key='b3005qa_i66_'+actor.role+'_'+suffix;
  const ids={client:key+'_client',policy:key+'_policy',receipt:key+'_receipt',portfolio:key+'_portfolio',advisor:key+'_advisor'};
  const requestIds=['i66qa_payment_'+actor.role+'_'+suffix,'i66qa_reconcile_'+actor.role+'_'+suffix];
  const events=requestIds.map(r=>'payevt_'+hash(TENANT+'|'+ids.receipt+'|'+r).slice(0,28));
  const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28);
  const refs=[['clientes',ids.client],['polizas',ids.policy],['recibosEsperados',ids.receipt],['carteraPrimas',ids.portfolio],['cobros',cobroId]];
  const auxiliary=[...requestIds.map(id=>[USE_LIVE_BACKEND?'reconciliationRequests':'previewReconciliationRequests',id]),...events.map(id=>[USE_LIVE_BACKEND?'reconciliationEvents':'previewReconciliationEvents',id])];
  const created=[];const pageContext=await browser.newContext({viewport:{width:1280,height:880}});
  const fixture={id:ids.receipt,tenantId:TENANT,polizaId:ids.policy,clienteId:ids.client,asesorId:ids.advisor,pais:'GT',moneda:'GTQ',monto:173.23,estado:'Pendiente',cuota:'1',fechaVencimiento:'2026-11-20',__syntheticQa:true};
  try{
    for(const [c,id] of [...refs,...auxiliary]){
      const r=/reconciliation(requests|events)$/i.test(c)?root.collection(c).doc(id):idRef(c,id);
      assert.equal((await r.get()).exists,false,'PAYMENT_UAT_EXISTING_TARGET_COLLISION_'+c);
    }
    const add=async(c,id,payload)=>{const r=idRef(c,id);await r.create(payload);created.push([c,id]);};
    await add('clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',nombre:'I6.6 Prueba sintética',__syntheticQa:true});
    await add('polizas',ids.policy,{id:ids.policy,tenantId:TENANT,clienteId:ids.client,asesorId:ids.advisor,pais:'GT',moneda:'GTQ',estado:'Vigente',numero:'QA-ONLY-'+suffix,__syntheticQa:true});
    await add('recibosEsperados',ids.receipt,fixture);
    await add('carteraPrimas',ids.portfolio,{id:ids.portfolio,tenantId:TENANT,clienteId:ids.client,polizaId:ids.policy,reciboId:ids.receipt,pais:'GT',moneda:'GTQ',estado:'Pendiente',monto:173.23,carteraActiva:true,__syntheticQa:true});
    const page=await pageContext.newPage();await page.goto(PREVIEW+'/#/cobros',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const login=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const started=await Orbit.productAppP0.activate();
      return{started:started?.started===true,role:String(Orbit.session?.rol?.()||''),preview:p.isI66PreviewHost(),
        clientReady:!!Orbit.reconciliationDomain,available:Orbit.reconciliationDomain?.available?.(),
        endpoint:Orbit.reconciliationDomain?.status?.()};
    },actor.token);
    assert.ok(login.started&&login.preview===!TEST_LIVE_UI&&login.clientReady&&login.available,'PAYMENT_SIGNED_UI_CLIENT_NOT_READY_'+actor.role);
    assert.ok(norm(login.role).includes(actor.role),'PAYMENT_SIGNED_ACTIVE_ROLE_MISMATCH');
    assert.equal(login.endpoint.functionName,TEST_LIVE_UI?'orbit360CobrosReconciliationCommand':'orbit360CobrosReconciliationCommandPreview');
    assert.equal(login.endpoint.region,'us-central1');
    const liveToken=TEST_LIVE_BACKEND?await page.evaluate(async()=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      return c.auth.currentUser.getIdToken();
    }):null;
    const callPayment=async(operation,payload,requestId)=>{
      if(TEST_LIVE_BACKEND){
        const res=await fetch(LIVE_PAYMENT_URL,{method:'POST',headers:{Authorization:'Bearer '+liveToken,'Content-Type':'application/json'},
          body:JSON.stringify({data:{tenantId:TENANT,activeRole:actor.role,operation,requestId,
            reason:'I6.6 ensayo sintético firmado y reversible de backend LIVE',payload:{receiptId:ids.receipt,...payload}}})});
        const body=await res.json();
        assert.equal(res.status,200,'PAYMENT_LIVE_SIGNED_BACKEND_REJECTED:'+res.status+':'+String(body?.error?.message||''));
        return body.result;
      }
      return page.evaluate(async input=>{
        const opt={requestId:input.requestId,payload:input.payload,reason:'I6.6 ensayo sintético firmado en Preview'};
        return input.operation==='apply_payment'?Orbit.reconciliationDomain.applyPayment(input.id,opt):Orbit.reconciliationDomain.reconcilePayment(input.id,opt);
      },{id:ids.receipt,requestId,operation,payload});
    };
    const paid=await callPayment('apply_payment',{
      paidDate:'2026-11-12',paymentMethod:'Transferencia',sourceType:'manual',amount:173.23},requestIds[0]);
    assert.ok(paid.ok&&paid.serverOwned&&paid.portfolioUpdated&&paid.cobroId===cobroId,'PAYMENT_SIGNED_APPLY_RESULT_MISMATCH_'+actor.role);
    const [receiptAfter,portfolioAfter,cobroAfter]=await Promise.all([
      idRef('recibosEsperados',ids.receipt).get(),idRef('carteraPrimas',ids.portfolio).get(),idRef('cobros',cobroId).get()]);
    assert.equal(receiptAfter.data()?.estado,'Pagado');assert.equal(portfolioAfter.data()?.estado,'Pagado');
    assert.equal(cobroAfter.data()?.paymentState,'PAID_DIRECT');
    if(!USE_LIVE_BACKEND)assert.equal(cobroAfter.data()?.__syntheticQa,true);
    const enriched=await callPayment('reconcile_payment',{
      sourceType:'insurer_invoice',applicationDate:'2026-11-12',invoiceDate:'2026-11-11',
      invoiceNumber:'QA-INVOICE-ONLY-'+suffix,amount:173.23,forceReconciliation:true},requestIds[1]);
    assert.ok(enriched.ok&&enriched.cobroId===cobroId&&enriched.paymentState==='PAID_DIRECT'&&enriched.applicationState==='APPLIED_DIRECT','PAYMENT_SIGNED_RECONCILE_DOUBLE_PAID_'+actor.role);
    const [bill,paidReceipt]=await Promise.all([idRef('cobros',cobroId).get(),idRef('recibosEsperados',ids.receipt).get()]);
    assert.equal(bill.data()?.invoiceNumber,'QA-INVOICE-ONLY-'+suffix,'PAYMENT_INVOICE_NOT_PERSISTED');
    assert.equal(bill.data()?.invoiceDate,'2026-11-11','PAYMENT_INVOICE_DATE_COBRO_NOT_PERSISTED');
    assert.equal(paidReceipt.data()?.invoiceDate,'2026-11-11','PAYMENT_INVOICE_DATE_RECEIPT_NOT_PERSISTED');
    assert.equal(bill.data()?.conciliado,true,'PAYMENT_INVOICE_RECONCILED_FLAG_NOT_PERSISTED');
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const session=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();return{uid:(await p.waitForUser())?.uid||'',ready:(await Orbit.productAppP0.activate())?.started===true};});
    assert.equal(session.uid,actor.uid);assert.ok(session.ready);
    assert.equal((await idRef('recibosEsperados',ids.receipt).get()).data()?.estado,'Pagado');
    assert.equal((await idRef('cobros',cobroId).get()).data()?.applicationState,'APPLIED_DIRECT');
    assert.equal((await idRef('cobros',cobroId).get()).data()?.invoiceDate,'2026-11-11','PAYMENT_INVOICE_DATE_NOT_RELOADED');
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_'+(TEST_LIVE_UI?'LIVE_UI':TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_SYNTHETIC_PAYMENT_APPLY_RECONCILE_INVOICE_DATE_RECEIPT_COBRO_PORTFOLIO_RELOAD_PASS');
  }finally{
    const errors=[];
    for(const [c,id] of refs.slice().reverse()){
      const r=idRef(c,id);const exists=await r.get();if(!exists.exists)continue;
      const d=exists.data()||{};
      const linkedLiveCobro=USE_LIVE_BACKEND&&c==='cobros'&&id===cobroId&&
        d.reciboId===ids.receipt&&d.polizaId===ids.policy&&d.clienteId===ids.client&&d.monto===173.23;
      if((d.__syntheticQa!==true&&!linkedLiveCobro)||d.id!==id||d.tenantId!==TENANT||d.pais!=='GT'){
        errors.push('PROVENANCE_'+c);continue;
      }
      try{await r.delete({exists:true});assert.equal((await r.get()).exists,false);}catch(e){errors.push('DELETE_'+c);}
    }
    for(const [c,id] of auxiliary){
      const r=root.collection(c).doc(id),s=await r.get();if(!s.exists)continue;
      const d=s.data()||{};
      if(/reconciliationrequests$/i.test(c)&&(!(d.result?.receiptId===ids.receipt)||d.status!=='committed')){errors.push('REQ_PROVENANCE');continue;}
      if(/reconciliationevents$/i.test(c)&&(d.receiptId!==ids.receipt||d.actor?.uid!==actor.uid)){errors.push('EVENT_PROVENANCE');continue;}
      try{await r.delete({exists:true});assert.equal((await r.get()).exists,false);}catch(e){errors.push('DELETE_'+c);}
    }
    await pageContext.close();
    if(errors.length)throw Error('PAYMENT_SYNTHETIC_RESTORE_HOLD:'+errors.join(','));
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_'+(TEST_LIVE_UI?'LIVE_UI':TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_PAYMENT_SYNTHETIC_DATA_AND_AUDIT_RESTORED_PASS');
  }
}
// Actual signed Preview callable, not a local transaction double. An insurer
// invoice's gross Q100.01 corrects a stale Q100.00 receipt, existing cobro and
// portfolio. The original net premium and commissions must remain untouched.
async function testInsurerTotalProposal(browser,actor){
  assert.ok(!TEST_LIVE_UI,'INSURER_TOTAL_PROPOSAL_SIGNED_BACKEND_ONLY');
  assert.equal(actor.role,'direccion','INSURER_TOTAL_PROPOSAL_DIRECTION_REQUIRED');
  const runId='cobledgerqa_'+suffix;
  const prefix='b3005qa_i66_proposal_'+suffix;
  const ids={proposal:prefix,source:prefix+'_source',client:prefix+'_client',policy:prefix+'_policy',
    receipt:prefix+'_receipt',portfolio:prefix+'_portfolio'};
  const policyNumber='QA-INSURER-'+suffix.toUpperCase();
  const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28);
  const applicationId=applicationIdFor(TENANT,runId,ids.proposal);
  const eventId='payinf_'+hash(TENANT+'|'+ids.policy+'|'+applicationId).slice(0,28);
  const qaRun=idRef('cobrosLedgerQaRuns',runId),qaPointer=idRef('cobrosLedgerQaControl',runId);
  const stageProposal=qaRun.collection('propuestasConciliacion').doc(ids.proposal);
  const stageEvidence=qaRun.collection('evidenciasCobro').doc(ids.source);
  const receiptRef=idRef('recibosEsperados',ids.receipt),portfolioRef=idRef('carteraPrimas',ids.portfolio),cobroRef=idRef('cobros',cobroId);
  const applicationRef=idRef('reconciliationApplications',applicationId);
  const refs=[qaPointer,qaRun,stageProposal,stageEvidence,idRef('clientes',ids.client),idRef('polizas',ids.policy),
    receiptRef,portfolioRef,cobroRef,applicationRef,
    root.collection('reconciliationRequests').doc(applicationId),root.collection('reconciliationEvents').doc(eventId)];
  const mark={tenantId:TENANT,__syntheticQa:true,qaRunId:runId};
  const source={sourceRowId:prefix+'_row',sourceRowIdSha256:hash(prefix+'_row'),policyNumber,
    receiptId:ids.receipt,currency:'GTQ',amount:100.01,evidenceType:'INVOICE_INSTALLMENT_N',
    reportedDate:'2026-11-15',paidDate:'2026-11-12',actualPaidDateEvidence:true,
    invoiceDate:'2026-11-13',invoiceNumber:'QA-INVOICE-'+suffix};
  const hashes={sourceLedgerDigest:digest(source),packageLogicalSha256:digest({source,runId})};
  const stage=(kind,docId)=>{
    const original={...source,documentId:docId,...mark};
    return {...original,documentClass:kind,runId,activationState:'STAGED',...hashes,payloadDigest:digest(original)};
  };
  const originalReceipt={id:ids.receipt,...mark,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',
    monto:100,montoTotal:100,primaTotal:100,primaNeta:81.25,comAseguradora:13.5,
    cuota:'1/1',vence:'2026-11-01',estado:'Pendiente'};
  const originalPortfolio={id:ids.portfolio,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,
    pais:'GT',moneda:'GTQ',monto:100,montoTotal:100,primaTotal:100,estado:'Pendiente',carteraActiva:true};
  const originalCobro={id:cobroId,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,
    pais:'GT',moneda:'GTQ',monto:100,montoTotal:100,primaTotal:100,estado:'Pendiente',paymentState:'PENDING'};
  const realPointer=idRef('cobrosLedgerControl','active');
  let browserContext=null;let cleanupArmed=false;
  const beforeRealPointer=(await realPointer.get()).data();
  try{
    for(const ref of refs)assert.equal((await ref.get()).exists,false,'INSURER_TOTAL_QA_COLLISION');
    cleanupArmed=true;
    await qaRun.create({...mark,id:runId,runId,schemaVersion:'gi-i66-synthetic-proposal-ledger-v1',status:'ACTIVE',
      sourceLedgerCount:1,stageDocumentCount:2,...hashes});
    await qaPointer.create({...mark,activeRunId:runId,schemaVersion:'gi-i66-synthetic-proposal-pointer-v1',status:'ACTIVE',...hashes});
    await stageProposal.create(stage('propuestasConciliacion',ids.proposal));
    await stageEvidence.create(stage('evidenciasCobro',ids.source));
    await idRef('clientes',ids.client).create({id:ids.client,...mark,pais:'GT',nombre:'I6.6 QA prima aseguradora: no cliente real'});
    await idRef('polizas',ids.policy).create({id:ids.policy,...mark,clienteId:ids.client,numero:policyNumber,pais:'GT',moneda:'GTQ',
      estado:'Vigente',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'});
    await receiptRef.create(originalReceipt);await portfolioRef.create(originalPortfolio);await cobroRef.create(originalCobro);
    browserContext=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await browserContext.newPage();await page.goto(PREVIEW+'/#/cobros',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    console.log('I66_INSURER_TOTAL_SIGNED_PAGE_BOOTSTRAPPED');
    const signed=await page.evaluate(async token=>{
      const runtime=window.Orbit,provider=runtime.productRuntimeBrowserProvidersP0,ctx=await provider.initialize();
      await ctx.modules.auth.setPersistence(ctx.auth,ctx.modules.auth.browserSessionPersistence);
      await ctx.modules.auth.signInWithCustomToken(ctx.auth,token);
      const app=await runtime.productAppP0.activate();
      return {started:app?.started===true,role:runtime.session?.rol?.(),
        endpoint:runtime.reconciliationDomain?.status?.().functionName};
    },actor.token);
    console.log('I66_INSURER_TOTAL_SIGNED_DIRECTION_READY');
    assert.ok(signed.started&&norm(signed.role)==='direccion','INSURER_TOTAL_SIGNED_ACTOR_MISMATCH');
    assert.equal(signed.endpoint,'orbit360CobrosReconciliationCommandPreview');
    const request={proposalId:ids.proposal,sourceRunId:runId};
    const token=TEST_LIVE_BACKEND?await page.evaluate(async()=>{
      const runtime=window.Orbit,p=runtime.productRuntimeBrowserProvidersP0,ctx=await p.initialize();
      return ctx.auth.currentUser.getIdToken();
    }):null;
    const proposalCommand=async(operation,payload)=>{
      if(TEST_LIVE_BACKEND){
        const response=await fetch(LIVE_PAYMENT_URL,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
          body:JSON.stringify({data:{tenantId:TENANT,activeRole:actor.role,operation,
            reason:'I6.6 ensayo sintético firmado de factura aseguradora; datos reales intactos',payload}})});
        const body=await response.json();
        assert.equal(response.status,200,'INSURER_TOTAL_LIVE_SIGNED_HTTP_'+response.status+':'+String(body?.error?.message||''));
        return body.result;
      }
      return page.evaluate(input=>input.operation==='preview_proposal_application'?
        window.Orbit.reconciliationDomain.previewProposalApplication(input.payload.proposalId,input.payload.sourceRunId):
        window.Orbit.reconciliationDomain.applyProposalApplication(input.payload.proposalId,input.payload.sourceRunId,input.payload.planDigest),
      {operation,payload});
    };
    const initial=await proposalCommand('preview_proposal_application',request);
    assert.equal(initial.status,'READY_TO_APPLY','INSURER_TOTAL_NOT_READY:'+String(initial.reason||initial.status));
    assert.equal(initial.eligible,true);assert.equal(initial.targets?.[0]?.amount,100.01);
    assert.equal((await cobroRef.get()).data().monto,100);
    const applied=await proposalCommand('apply_proposal_application',{...request,planDigest:initial.planDigest});
    assert.equal(applied.readbackConfirmed,true,'INSURER_TOTAL_APPLY_NOT_CONFIRMED');
    assert.equal(applied.applicationId,applicationId);
    const [receipt,portfolio,cobro,application]=await Promise.all([receiptRef.get(),portfolioRef.get(),cobroRef.get(),applicationRef.get()]);
    assert.ok(receipt.exists&&portfolio.exists&&cobro.exists&&application.exists);
    for(const snap of [receipt,portfolio,cobro])for(const field of ['monto','montoTotal','primaTotal'])
      assert.equal(snap.data()[field],100.01,'INSURER_TOTAL_PERSISTENCE_'+field);
    assert.equal(receipt.data().primaNeta,81.25,'INSURER_TOTAL_NET_CHANGED');
    assert.equal(receipt.data().comAseguradora,13.5,'INSURER_TOTAL_COMMISSION_CHANGED');
    assert.equal(receipt.data().insurerTotalBefore,100);assert.equal(receipt.data().insurerTotalEvidenceType,'INVOICE_INSTALLMENT_N');
    assert.equal(portfolio.data().carteraActiva,false);
    assert.equal(application.data().status,'APPLIED');assert.equal(application.data().beforeAfter.length,3);
    assert.equal(application.data().beforeAfter.find(x=>x.collection==='recibosEsperados')?.before?.monto,100);
    assert.equal(application.data().beforeAfter.find(x=>x.collection==='recibosEsperados')?.after?.monto,100.01);
    const repeated=await proposalCommand('apply_proposal_application',{...request,planDigest:initial.planDigest});
    assert.ok(repeated.reused&&repeated.readbackConfirmed,'INSURER_TOTAL_IDEMPOTENCE_FAILED');
    assert.equal((await col('cobros').where('reciboId','==',ids.receipt).get()).size,1);
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const reloaded=await page.evaluate(async()=>{
      const runtime=window.Orbit,provider=runtime.productRuntimeBrowserProvidersP0;await provider.initialize();
      const user=await provider.waitForUser();return {uid:user?.uid,started:(await runtime.productAppP0.activate())?.started===true};
    });
    assert.equal(reloaded.uid,actor.uid);assert.equal(reloaded.started,true);
    assert.equal((await receiptRef.get()).data().monto,100.01);assert.equal((await cobroRef.get()).data().primaTotal,100.01);
    assert.deepEqual((await realPointer.get()).data(),beforeRealPointer,'INSURER_TOTAL_REAL_LEDGER_CHANGED');
    console.log('I66_SIGNED_DIRECCION_'+(TEST_LIVE_BACKEND?'LIVE':'PREVIEW')+'_VERIFIED_INSURER_GROSS_100_01_OVER_STALE_100_00_RECEIPT_COBRO_CARTERA_NET_COMMISSION_AUDIT_IDEMPOTENCE_RELOAD_PASS');
  }finally{
    if(browserContext)await browserContext.close();
    const errors=[];
    if(cleanupArmed)for(const ref of refs.slice().reverse()){
      const snap=await ref.get();if(!snap.exists)continue;
      if(snap.data()?.__syntheticQa!==true||snap.data()?.qaRunId!==runId){errors.push('NOT_OWNED_'+ref.id);continue;}
      try{await ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await ref.get()).exists,false);}
      catch(_){errors.push('DELETE_'+ref.id);}
    }
    if(JSON.stringify((await realPointer.get()).data())!==JSON.stringify(beforeRealPointer))errors.push('REAL_LEDGER_CHANGED');
    if(errors.length)throw Error('INSURER_TOTAL_QA_CLEANUP_HOLD:'+errors.join(','));
    console.log('I66_SIGNED_DIRECCION_'+(TEST_LIVE_BACKEND?'LIVE':'PREVIEW')+'_VERIFIED_INSURER_TOTAL_SYNTHETIC_RESTORED_PASS real_customer_writes=0');
  }
}
(async()=>{const staff=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of staff)await testActor(browser,actor);
    if(!TEST_LIVE_UI)await testInsurerTotalProposal(browser,staff.find(actor=>actor.role==='direccion'));
    console.log('I66_SIGNED_CARLOS_PAULA_PAYMENT_'+(TEST_LIVE_UI?'LIVE_UI':TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_TWO_ACTORS_PASS real_customer_writes=0 auth_changes=0 synthetic_restored=true');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_CARLOS_PAYMENT_SIGNED_PREVIEW_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,210));process.exitCode=1;});
