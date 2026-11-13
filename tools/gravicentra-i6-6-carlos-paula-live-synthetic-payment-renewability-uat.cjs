'use strict';
// Real signed Carlos/Dirección on exact LIVE, exclusively random QA client,
// policy, receipt and portfolio. Test renewable CAS, one payment + invoice
// enrichment without duplicate, then remove every QA document/event/request.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const SHA=process.env.I66_APPROVED_LIVE_SOURCE_SHA||'1dd675ed59ac51fd122915ca8056f85f82fa12d6';
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_LIVE_FINANCIAL_ORIGIN_MISMATCH');
const secret=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean).map(x=>{try{return JSON.parse(x)}catch{return null}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(secret,'I66_LIVE_FINANCIAL_SIGNED_AUTHORITY_MISSING');
admin.initializeApp({credential:admin.credential.cert(secret),projectId:'ays-orbit-360-lab'});
const auth=admin.auth(),db=admin.firestore(),tenant=db.collection('tenants').doc(TENANT);
const data=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
const side=(c,id)=>tenant.collection(c).doc(id);
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');
async function actors(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),data('asesores','_').parent.limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_LIVE_FINANCIAL_ACTOR_SCAN_BOUND');
  const find=(name,role)=>{
    const ids=new Set(),uids=new Set();
    for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>name(norm(x)))){
      ids.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));
    }}
    const rows=members.docs.filter(d=>{const x=d.data()||{};return (
      [x.nombre,x.displayName,x.name,x.nombreCompleto,x.fullName].some(v=>name(norm(v)))||
        ids.has(String(x.advisorId||x.asesorId||''))||uids.has(d.id))&&norm(x.activeRole)===role&&
      x.active!==false&&x.activo!==false&&['active','activo'].includes(norm(x.status||x.estado))&&
      [].concat(x.countries||x.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');
    });
    assert.equal(rows.length,1,'I66_LIVE_FINANCIAL_ACTOR_AMBIGUOUS_'+role);
    return{uid:rows[0].id,role};
  };
  const out=[find(x=>x.startsWith('carlos castro'),'operativo'),find(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const a of out){const user=await auth.getUser(a.uid);assert.ok(!user.disabled&&user.emailVerified);a.token=await auth.createCustomToken(a.uid);}
  return out;
}
async function exercise(browser,actor){
  const key='i66liveqa_b3005_'+actor.role+'_'+suffix,ghost='i66liveqa_advisor_not_a_real_user';
  const ids={client:key+'_client',policy:key+'_policy',receipt:key+'_receipt',portfolio:key+'_portfolio'};
  const cobroId='cob_'+h(TENANT+'|receipt|'+ids.receipt).slice(0,28);
  const refs=[['clientes',ids.client],['polizas',ids.policy],['recibosEsperados',ids.receipt],['carteraPrimas',ids.portfolio],['cobros',cobroId]];
  const opReq='i66liveqa_opreq_'+actor.role+'_'+suffix,opEvt='opevt_'+h(TENANT+'|'+opReq).slice(0,28);
  const paymentReqs=['i66liveqa_payment_'+actor.role+'_'+suffix,'i66liveqa_enrich_'+actor.role+'_'+suffix];
  const paymentEvts=paymentReqs.map(x=>'payevt_'+h(TENANT+'|'+ids.receipt+'|'+x).slice(0,28));
  const auxiliary=[['operationalRequests',opReq],['operationalEvents',opEvt],
    ...paymentReqs.map(id=>['reconciliationRequests',id]),...paymentEvts.map(id=>['reconciliationEvents',id])];
  const context=await browser.newContext({viewport:{width:1280,height:880}});
  try{
    for(const [c,id] of refs)assert.equal((await data(c,id).get()).exists,false,'I66_LIVE_FINANCIAL_QA_TARGET_EXISTS');
    for(const [c,id] of auxiliary)assert.equal((await side(c,id).get()).exists,false,'I66_LIVE_FINANCIAL_QA_EVENT_EXISTS');
    const add=async(c,id,x)=>data(c,id).create(x);
    await add('clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',asesorId:ghost,nombre:'I6.6 QA reversible',__syntheticQa:true});
    await add('polizas',ids.policy,{id:ids.policy,tenantId:TENANT,clienteId:ids.client,asesorId:ghost,pais:'GT',moneda:'GTQ',
      estado:'Vigente',numero:'QA-ONLY-'+suffix,renovable:false,__syntheticQa:true});
    await add('recibosEsperados',ids.receipt,{id:ids.receipt,tenantId:TENANT,polizaId:ids.policy,clienteId:ids.client,asesorId:ghost,
      pais:'GT',moneda:'GTQ',monto:173.23,estado:'Pendiente',cuota:'1',fechaVencimiento:'2026-11-20',__syntheticQa:true});
    await add('carteraPrimas',ids.portfolio,{id:ids.portfolio,tenantId:TENANT,clienteId:ids.client,polizaId:ids.policy,reciboId:ids.receipt,
      asesorId:ghost,pais:'GT',moneda:'GTQ',estado:'Pendiente',monto:173.23,carteraActiva:true,__syntheticQa:true});
    const page=await context.newPage();
    await page.goto(ORIGIN+'/#/cobros',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const login=await page.evaluate(async t=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,t);
      const a=await Orbit.productAppP0.activate(),s=Orbit.reconciliationDomain?.status?.();
      return{started:a?.started===true,role:String(Orbit.session?.rol?.()||''),preview:p.isI66PreviewHost(),
        payment:Orbit.reconciliationDomain?.available?.(),endpoint:s,
        polizas:Orbit.access?.can('polizas','edit'),renovaciones:Orbit.access?.can('renovaciones','edit'),cobros:Orbit.access?.can('cobros','edit')};
    },actor.token);
    assert.ok(login.started&&!login.preview&&norm(login.role).includes(actor.role)&&login.payment,'I66_LIVE_FINANCIAL_SIGNED_UI_NOT_READY');
    assert.ok(login.polizas&&login.renovaciones&&login.cobros,'I66_LIVE_FINANCIAL_SIGNED_MODULE_RIGHT_DENIED');
    assert.equal(login.endpoint?.functionName,'orbit360CobrosReconciliationCommand');
    assert.equal(login.endpoint?.region,'us-central1');
    const renewability=await page.evaluate(async args=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360ProductOperationalCommand',args,'us-central1'),
      {tenantId:TENANT,requestId:opReq,mutations:[{action:'update',collection:'polizas',id:ids.policy,payload:{renovable:true},expectedBefore:{renovable:false}}]});
    assert.ok(renewability.ok&&renewability.serverOwned,'I66_LIVE_SIGNED_RENEWABILITY_CAS_NOT_WRITTEN');
    assert.equal((await data('polizas',ids.policy).get()).data()?.renovable,true,'I66_LIVE_SIGNED_RENEWABILITY_CAS_NOT_PERSISTED');
    const applied=await page.evaluate(async x=>Orbit.reconciliationDomain.applyPayment(x.id,{requestId:x.req,
      payload:{paidDate:'2026-11-12',paymentMethod:'Transferencia',sourceType:'manual',amount:173.23},reason:'I6.6 pago sintético LIVE reversible'}),
      {id:ids.receipt,req:paymentReqs[0]});
    assert.ok(applied.ok&&applied.serverOwned&&applied.portfolioUpdated&&applied.cobroId===cobroId,
      'I66_LIVE_SIGNED_PAYMENT_APPLY_FAILED');
    assert.equal((await data('recibosEsperados',ids.receipt).get()).data()?.estado,'Pagado');
    assert.equal((await data('carteraPrimas',ids.portfolio).get()).data()?.estado,'Pagado');
    assert.equal((await data('cobros',cobroId).get()).data()?.paymentState,'PAID_DIRECT');
    const enriched=await page.evaluate(async x=>Orbit.reconciliationDomain.reconcilePayment(x.id,{requestId:x.req,
      payload:{sourceType:'insurer_invoice',applicationDate:'2026-11-12',invoiceNumber:'QA-ONLY-'+x.tag,amount:173.23},
      reason:'I6.6 conciliación sintética LIVE sin duplicar cobro'}),
      {id:ids.receipt,req:paymentReqs[1],tag:suffix});
    assert.ok(enriched.ok&&enriched.cobroId===cobroId&&enriched.paymentState==='PAID_DIRECT',
      'I66_LIVE_SIGNED_PAYMENT_ENRICHMENT_DUPLICATE');
    assert.equal((await data('cobros',cobroId).get()).data()?.invoiceNumber,'QA-ONLY-'+suffix);
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const reload=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();return{uid:(await p.waitForUser())?.uid,started:(await Orbit.productAppP0.activate())?.started===true}});
    assert.ok(reload.started&&reload.uid===actor.uid,'I66_LIVE_SIGNED_FINANCIAL_RELOAD_SESSION_FAILED');
    assert.equal((await data('polizas',ids.policy).get()).data()?.renovable,true);
    assert.equal((await data('recibosEsperados',ids.receipt).get()).data()?.estado,'Pagado');
    assert.equal((await data('cobros',cobroId).get()).data()?.applicationState,'APPLIED_DIRECT');
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_POLICY_RENEWABILITY_CAS_PAYMENT_APPLY_RECONCILE_NO_DUPLICATE_RELOAD_PASS');
  }finally{
    const failures=[];
    for(const [c,id] of refs.slice().reverse())try{
      const r=data(c,id),s=await r.get();if(!s.exists)continue;const x=s.data()||{};
      assert.equal(x.id,id);assert.equal(x.tenantId,TENANT);assert.equal(x.pais,'GT');
      if(c==='cobros')assert.ok(x.polizaId===ids.policy&&x.reciboId===ids.receipt&&x.updatedByUid===actor.uid);
      else assert.equal(x.__syntheticQa,true);
      await r.delete({exists:true});assert.equal((await r.get()).exists,false);
    }catch(e){failures.push('record_'+c+'_'+String(e.code||'GUARD'));}
    for(const [c,id] of auxiliary.slice().reverse())try{
      const r=side(c,id),s=await r.get();if(!s.exists)continue;const x=s.data()||{};
      assert.ok(x.status==='committed'||x.eventId===id,'I66_LIVE_FINANCIAL_EVENT_PROVENANCE_INVALID');
      if(c==='operationalEvents')assert.equal(x.actorUid,actor.uid);
      if(c==='reconciliationEvents')assert.equal(x.receiptId,ids.receipt);
      if(c==='reconciliationRequests')assert.equal(x.result?.receiptId,ids.receipt);
      await r.delete({exists:true});assert.equal((await r.get()).exists,false);
    }catch(e){failures.push('event_'+c+'_'+String(e.code||'GUARD'));}
    await context.close();
    if(failures.length)throw Error('I66_LIVE_FINANCIAL_SYNTHETIC_RESTORE_HOLD:'+failures.join(','));
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_FINANCIAL_TEST_RECORDS_AND_AUDIT_EVENTS_RESTORED_PASS');
  }
}
(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(marker.sourceSha,SHA,'I66_LIVE_FINANCIAL_ARTIFACT_DRIFT');
  const users=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of users)await exercise(browser,actor);
    console.log('I66_CARLOS_PAULA_SIGNED_LIVE_PAYMENT_AND_POLICY_RENEWABILITY_SYNTHETIC_PASS real_customer_writes=0 real_financial_writes=0');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_LIVE_FINANCIAL_SIGNED_UAT_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,160));process.exitCode=1;});
