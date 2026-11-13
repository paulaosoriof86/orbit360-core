'use strict';
// Signed Firebase Preview-only payment UAT. Every document has a unique QA
// prefix, an exact preflight, and a guarded finally cleanup. Never targets LIVE.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const PREVIEW=process.env.I66_PREVIEW_ORIGIN;
const TEST_LIVE_BACKEND=process.env.I66_PAYMENT_LIVE_BACKEND_ONLY==='true';
const LIVE_PAYMENT_URL='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommand';
const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
assert.ok(/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app$/.test(PREVIEW||''),'PAYMENT_UAT_EXACT_PREVIEW_ORIGIN_REQUIRED');
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
  const auxiliary=[...requestIds.map(id=>[TEST_LIVE_BACKEND?'reconciliationRequests':'previewReconciliationRequests',id]),...events.map(id=>[TEST_LIVE_BACKEND?'reconciliationEvents':'previewReconciliationEvents',id])];
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
    assert.ok(login.started&&login.preview&&login.clientReady&&login.available,'PAYMENT_PREVIEW_SIGNED_UI_CLIENT_NOT_READY_'+actor.role);
    assert.ok(norm(login.role).includes(actor.role),'PAYMENT_SIGNED_ACTIVE_ROLE_MISMATCH');
    assert.equal(login.endpoint.functionName,'orbit360CobrosReconciliationCommandPreview');
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
    if(!TEST_LIVE_BACKEND)assert.equal(cobroAfter.data()?.__syntheticQa,true);
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
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_'+(TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_SYNTHETIC_PAYMENT_APPLY_RECONCILE_INVOICE_DATE_RECEIPT_COBRO_PORTFOLIO_RELOAD_PASS');
  }finally{
    const errors=[];
    for(const [c,id] of refs.slice().reverse()){
      const r=idRef(c,id);const exists=await r.get();if(!exists.exists)continue;
      const d=exists.data()||{};
      const linkedLiveCobro=TEST_LIVE_BACKEND&&c==='cobros'&&id===cobroId&&
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
    console.log('I66_SIGNED_'+actor.role.toUpperCase()+'_'+(TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_PAYMENT_SYNTHETIC_DATA_AND_AUDIT_RESTORED_PASS');
  }
}
(async()=>{const staff=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of staff)await testActor(browser,actor);
    console.log('I66_SIGNED_CARLOS_PAULA_PAYMENT_'+(TEST_LIVE_BACKEND?'LIVE_BACKEND':'PREVIEW_BACKEND')+'_TWO_ACTORS_PASS real_customer_writes=0 auth_changes=0 synthetic_restored=true');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_CARLOS_PAYMENT_SIGNED_PREVIEW_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,210));process.exitCode=1;});
