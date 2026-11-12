'use strict';
// Signed LIVE direct renewal wiring, using short-lived, unique synthetic data.
// The documentRef is explicitly a QA fixture, NOT evidence of an insurer-issued
// document. This test never certifies the real-document business requirement.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const SOURCE='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_RENEWAL_LIVE_ORIGIN_MISMATCH');
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(credential,'I66_RENEWAL_SIGNED_AUTHORITY_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const collection=c=>tenant.collection('data').doc(c).collection('items');
const item=(c,id)=>collection(c).doc(id);
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');

async function staff(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),collection('asesores').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_RENEWAL_STAFF_BOUND');
  const resolve=(predicate,role)=>{
    const ids=new Set(),uids=new Set();
    for(const d of advisors.docs){const a=d.data()||{};
      if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>predicate(norm(x)))){
        ids.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));
      }
    }
    const matches=members.docs.filter(d=>{const x=d.data()||{};return(
      [x.nombre,x.displayName,x.name,x.nombreCompleto,x.fullName].some(v=>predicate(norm(v)))||
        ids.has(String(x.advisorId||x.asesorId||''))||uids.has(d.id))&&
      norm(x.activeRole)===role&&x.active!==false&&x.activo!==false&&
      ['active','activo'].includes(norm(x.status||x.estado))&&
      [].concat(x.countries||x.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
    assert.equal(matches.length,1,'I66_RENEWAL_STAFF_AMBIGUOUS_'+role);
    return {uid:matches[0].id,role};
  };
  const actors=[resolve(x=>x.startsWith('carlos castro'),'operativo'),
    resolve(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const x of actors){const u=await auth.getUser(x.uid);assert.ok(!u.disabled&&u.emailVerified);x.token=await auth.createCustomToken(x.uid);}
  return actors;
}

async function one(browser,actor){
  const prefix='i66qa_renew_'+actor.role+'_'+suffix;
  const ids={client:prefix+'_client',insurer:prefix+'_insurer',source:prefix+'_source',management:prefix+'_gestion'};
  const op='i66qa_renew_op_'+actor.role+'_'+suffix;
  const qaAdvisor='i66qa_no_real_advisor';
  const seeded=[
    ['clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',asesorId:qaAdvisor,nombre:'I6.6 QA renewal only',__syntheticQa:true}],
    ['aseguradoras',ids.insurer,{id:ids.insurer,tenantId:TENANT,pais:'GT',moneda:'GTQ',nombre:'I6.6 QA insurer',vinculada:true,activo:true,ramos:['Auto'],portales:[],cuentas:[],__syntheticQa:true}],
    ['polizas',ids.source,{id:ids.source,tenantId:TENANT,clienteId:ids.client,asesorId:qaAdvisor,aseguradoraId:ids.insurer,
      pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'QA Auto',subramo:'QA Auto',numero:'QA-OLD-'+suffix,
      vigenciaInicio:'2025-12-01',vigenciaFin:'2026-11-30',estado:'Vigente',renovable:true,
      frecuencia:'Contado',formaPago:'Transferencia',conducto:'Aseguradora',cuotas:1,primaNeta:1000,
      gastosEmision:50,gastosFinan:0,otros:0,ivaPct:12,__syntheticQa:true}],
    ['gestiones',ids.management,{id:ids.management,tenantId:TENANT,clienteId:ids.client,asesorId:qaAdvisor,
      polizaId:ids.source,sourcePolicyId:ids.source,pais:'GT',moneda:'GTQ',titulo:'I6.6 QA accepted renewal only',
      lista:'Renovaciones / Modif',tipo:'Renovación',estado:'Pendiente',workflowType:'renewal_accepted',
      acceptedConfirmed:true,clientApprovalNote:'Only synthetic test acceptance',origen:'QA aislado',__syntheticQa:true}]
  ];
  const context=await browser.newContext({viewport:{width:1280,height:880}});
  let outcome='NO_ISSUANCE',page=null;
  try{
    for(const [c,id] of seeded)assert.equal((await item(c,id).get()).exists,false,'I66_RENEWAL_QA_FIXTURE_COLLISION');
    for(const [c,id,data] of seeded)await item(c,id).create(data);
    page=await context.newPage();
    await page.goto(ORIGIN+'/#/renovaciones',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const session=await page.evaluate(async t=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,t);
      const a=await Orbit.productAppP0.activate();
      return{started:a?.started===true,role:Orbit.session?.rol?.(),preview:p.isI66PreviewHost(),
        canRenew:Orbit.access?.can('renovaciones','edit'),canPolicy:Orbit.policyReceipts?.canManagePolicies?.(),
        canIssue:Orbit.issuance?.canManage?.(),direct:!!Orbit.renewalDirect?.open};
    },actor.token);
    assert.ok(session.started&&!session.preview&&norm(session.role)===actor.role&&
      session.canRenew&&session.canPolicy&&session.canIssue&&session.direct,'I66_RENEWAL_SIGNED_ROLE_DENIED_'+actor.role);
    console.log('I66_RENEWAL_'+actor.role.toUpperCase()+'_SIGNED_READY_PASSED');
    const requested=await page.evaluate(()=>Orbit.store._ensureCollections(['gestiones','polizas','vehiculos','clientes','aseguradoras']));
    console.log('I66_RENEWAL_'+actor.role.toUpperCase()+'_HYDRATION_REQUESTED_'+requested.join(','));
    const status=await page.evaluate(x=>{
      const s=Orbit.store._productStatus(),names=['gestiones','polizas','vehiculos','clientes','aseguradoras'];
      const seen=Object.fromEntries(names.map(c=>[c,!!Orbit.store.get(c,x[c==='gestiones'?'management':c==='polizas'?'source':c==='clientes'?'client':c==='aseguradoras'?'insurer':'source'])]));
      return{seen,confirmed:names.filter(c=>s.serverConfirmedCollections?.includes(c)),
        denied:names.filter(c=>s.deniedCollections?.includes(c)),
        errorKeys:names.filter(c=>!!s.snapshotErrors?.[c]),
        queryPlans:Object.keys(s.queryPlans||{}),
        startup:s.requiredStartupCollections||[],optionalMissing:(s.optionalMissing||[]).length,
        sizes:Object.fromEntries(names.map(c=>[c,Orbit.store.all(c).length])),
        role:Orbit.session.rol(),country:Orbit.pais,readState:s.status};
    },ids);
    console.log('I66_RENEWAL_'+actor.role.toUpperCase()+'_INITIAL_PROTECTED_READBACK '+JSON.stringify(status));
    try{
      await page.waitForFunction(x=>!!Orbit.store.get('gestiones',x.management)&&!!Orbit.store.get('polizas',x.source)&&
        !!Orbit.store.get('clientes',x.client)&&!!Orbit.store.get('aseguradoras',x.insurer),ids,{timeout:30000});
    }catch(error){
      const evidence=await page.evaluate(async x=>{
        const s=Orbit.store._productStatus(),names=['gestiones','polizas','vehiculos','clientes','aseguradoras'];
        let exactServer=null;
        try{
          const r=await Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({
            tenantId:'alianzas-soluciones',activeRole:Orbit.session.rol(),country:'GT',collection:'gestiones',
            mode:'list',pageSize:50,cursor:''});
          exactServer={ok:r.ok===true,scope:r.scope,count:(r.rows||[]).length,
            qaFixturePresent:(r.rows||[]).some(v=>v.canonicalDocumentId===x.management||v.id===x.management),
            more:!!r.nextCursor};
        }catch(e){exactServer={error:String(e?.code||e?.message||e).slice(0,75)};}
        return{confirmed:names.filter(c=>s.serverConfirmedCollections?.includes(c)),
          denied:names.filter(c=>s.deniedCollections?.includes(c)),
          errors:Object.fromEntries(names.filter(c=>!!s.snapshotErrors?.[c]).map(c=>[c,String(s.snapshotErrors[c]).slice(0,90)])),
          queryPlans:Object.keys(s.queryPlans||{}),
          gestionPlan:{scope:s.queryPlans?.gestiones?.scope,
            constraints:(s.queryPlans?.gestiones?.constraints||[]).map(v=>({field:v.field,op:v.op}))},
          exactServer,
          sizes:Object.fromEntries(names.map(c=>[c,Orbit.store.all(c).length])),
          seen:{management:!!Orbit.store.get('gestiones',x.management),source:!!Orbit.store.get('polizas',x.source),
            client:!!Orbit.store.get('clientes',x.client),insurer:!!Orbit.store.get('aseguradoras',x.insurer)}};
      },ids);
      console.log('I66_RENEWAL_'+actor.role.toUpperCase()+'_HYDRATION_TIMEOUT_PROTECTED_READBACK '+JSON.stringify(evidence));
      throw error;
    }
    const modal=await page.evaluate(id=>{
      const g=Orbit.store.get('gestiones',id);
      Orbit.renewalDirect.open(g);
      const node=document.getElementById('ops-direct-renewal-v1201');
      const fields=!!node?.querySelector('#rend-num')&&!!node?.querySelector('#rend-doc-file')&&!!node?.querySelector('#rend-payments');
      node?.remove();return{fields,role:Orbit.session.rol()};
    },ids.management);
    assert.ok(modal.fields,'I66_RENEWAL_SIGNED_LIVE_MODAL_FIELDS_MISSING_'+actor.role);
    const data={numero:'QA-NEW-'+suffix,vigenciaInicio:'2026-12-01',vigenciaFin:'2027-12-01',
      frecuencia:'Contado',cuotas:1,formaPago:'Transferencia',conducto:'Aseguradora',primaNeta:1000,
      gastosEmision:50,gastosFinan:0,otros:0,ivaPct:12,sourceRef:'QA-ONLY-'+suffix};
    const denied=await page.evaluate(async x=>Orbit.issuance.createDirectRenewal(x.id,x.data,
      {operationId:x.op,motivo:'I6.6 synthetic no-document guard'}),{id:ids.management,data,op});
    assert.equal(denied.ok,false,'I66_RENEWAL_MISSING_DOCUMENT_INCORRECTLY_ALLOWED');
    assert.ok([].concat(denied.errors||[]).includes('documento_renovacion_en_firme_requerido'),
      'I66_RENEWAL_MISSING_DOCUMENT_GUARD_NOT_RETURNED');
    assert.equal((await item('gestiones',ids.management).get()).data()?.directRenewalPolicyId,undefined);
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_DIRECT_RENEWAL_MISSING_DOCUMENT_FAIL_CLOSED_PASS');
    const input={...data,documentRef:'qa-isolated-placeholder-not-real-insurer-doc-'+suffix};
    const applied=await page.evaluate(async x=>Orbit.issuance.createDirectRenewal(x.id,x.data,
      {operationId:x.op,motivo:'I6.6 synthetic direct renewal QA only'}),{id:ids.management,data:input,op});
    assert.ok(applied?.ok&&applied.policy?.id,'I66_RENEWAL_SIGNED_LIVE_POLICY_NOT_CREATED_'+JSON.stringify(applied?.errors||[]));
    outcome=applied.policy.id;
    assert.ok(outcome.startsWith('pol_'),'I66_RENEWAL_POLICY_ID_NOT_CANONICAL');
    const [policy,source,management,receipts,portfolio]=await Promise.all([
      item('polizas',outcome).get(),item('polizas',ids.source).get(),item('gestiones',ids.management).get(),
      collection('recibosEsperados').where('polizaId','==',outcome).limit(25).get(),
      collection('carteraPrimas').where('polizaId','==',outcome).limit(25).get()]);
    assert.equal(policy.data()?.clienteId,ids.client);
    assert.equal(policy.data()?.renuevaDe,ids.source);
    assert.equal(policy.data()?.operationId,op);
    assert.equal(source.data()?.renovadaPor,outcome,'I66_RENEWAL_SOURCE_NOT_LINKED');
    assert.equal(management.data()?.directRenewalPolicyId,outcome,'I66_RENEWAL_OPS_MANAGEMENT_NOT_LINKED');
    assert.equal(receipts.size,1,'I66_RENEWAL_EXPECTED_RECEIPT_NOT_ONE');
    assert.equal(portfolio.size,1,'I66_RENEWAL_EXPECTED_PORTFOLIO_NOT_ONE');
    assert.equal(receipts.docs[0].data()?.id,'cob_'+outcome+'_001');
    assert.equal(portfolio.docs[0].data()?.reciboId,receipts.docs[0].id);
    // Beyond the guarded issuance callable, certify the normal signed policy
    // editor for Operativo and Direccion. The test policy belongs to a
    // deliberately foreign adviser ID inside the authorized GT tenant; the
    // active Operativo role must inherit roleScopes=all for both read AND write.
    await page.waitForFunction(id=>!!window.Orbit?.store?.get?.('polizas',id),outcome,{timeout:30000});
    const manualEditNote='I6.6 QA signed policy editing only '+actor.role+' '+suffix;
    const manualEdit=await page.evaluate(async x=>Orbit.store.updateDurable('polizas',x.id,
      {observaciones:x.note}),{id:outcome,note:manualEditNote});
    assert.notEqual(manualEdit?.ok,false,
      'I66_RENEWAL_SIGNED_MANUAL_POLICY_EDIT_REJECTED_'+actor.role);
    assert.equal((await item('polizas',outcome).get()).data()?.observaciones,manualEditNote,
      'I66_RENEWAL_SIGNED_MANUAL_POLICY_EDIT_FIRESTORE_MISSING_'+actor.role);
    assert.equal((await item('polizas',outcome).get()).data()?.updatedByUid,actor.uid,
      'I66_RENEWAL_SIGNED_MANUAL_POLICY_EDIT_AUDIT_MISSING_'+actor.role);
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_SIGNED_NORMAL_POLICY_EDITOR_CROSS_ADVISOR_GT_WRITE_PASS');
    const repeat=await page.evaluate(async x=>Orbit.issuance.createDirectRenewal(x.id,x.data,
      {operationId:x.op,motivo:'I6.6 synthetic idempotent replay'}),{id:ids.management,data:input,op});
    assert.ok(repeat?.ok&&repeat.alreadyCreated&&repeat.policy?.id===outcome,'I66_RENEWAL_REPLAY_DUPLICATES');
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;
      await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();});
    await page.evaluate(async()=>{await Orbit.store._ensureCollections(['gestiones','polizas','recibosEsperados','carteraPrimas']);});
    await page.waitForFunction(x=>Orbit.store?.get?.('polizas',x.policy)?.renuevaDe===x.source&&
      Orbit.store?.get?.('polizas',x.policy)?.observaciones===x.note&&
      Orbit.store?.get?.('gestiones',x.management)?.directRenewalPolicyId===x.policy,
      {policy:outcome,source:ids.source,management:ids.management,note:manualEditNote},{timeout:30000});
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_DIRECT_RENEWAL_SYNTHETIC_POLICY_RECEIPT_PORTFOLIO_OPS_LINKS_RELOAD_IDEMPOTENCE_PASS');
  }finally{
    const errors=[];
    // Every permitted business deletion is bound to the unpredictable QA client.
    // Operation IDs on newly materialized children and __syntheticQa on seeds
    // prevent accidental cleanup of an unrelated production record.
    await new Promise(resolve=>setTimeout(resolve,650));
    for(const c of ['actividades','vehiculos','carteraPrimas','recibosEsperados','polizas','gestiones'])try{
      const snapshot=await collection(c).where('clienteId','==',ids.client).limit(70).get();
      assert.ok(snapshot.size<70,'I66_RENEWAL_QA_CLEANUP_NOT_BOUNDED_'+c);
      for(const d of snapshot.docs){const row=d.data()||{};
        assert.equal(row.tenantId,TENANT);assert.equal(row.clienteId,ids.client);
        assert.ok(row.__syntheticQa===true||row.operationId===op||row.operacionId===op||
          row.renuevaDe===ids.source,'I66_RENEWAL_QA_UNKNOWN_ROW_STOP_'+c);
        await d.ref.delete({exists:true});
      }
      assert.equal((await collection(c).where('clienteId','==',ids.client).limit(1).get()).empty,true);
    }catch(e){errors.push(c+'_'+String(e.code||e.message||'ERR').slice(0,70));}
    for(const c of ['clientes','aseguradoras'])try{
      const key=c==='clientes'?ids.client:ids.insurer,ref=item(c,key),snap=await ref.get();
      if(snap.exists){const row=snap.data()||{};
        assert.equal(row.id,key);assert.equal(row.tenantId,TENANT);assert.equal(row.__syntheticQa,true);
        await ref.delete({exists:true});
      }
      assert.equal((await ref.get()).exists,false);
    }catch(e){errors.push(c+'_'+String(e.code||e.message||'ERR').slice(0,70));}
    // Workflow notification records are ephemeral QA-only: target the *exact*
    // synthetic management ID, never a live customer or team inbox event.
    for(const c of ['workflowRequests','workflowEvents','notificationOutbox'])try{
      const query=await tenant.collection(c).where('entityId','==',ids.management).limit(20).get();
      assert.ok(query.size<20,'I66_RENEWAL_WORKFLOW_QA_CLEANUP_UNBOUNDED');
      for(const d of query.docs){const row=d.data()||{};
        assert.equal(row.entityId,ids.management);
        await d.ref.delete({exists:true});
      }
    }catch(e){errors.push(c+'_'+String(e.code||e.message||'ERR').slice(0,70));}
    await context.close();
    if(errors.length)throw Error('I66_RENEWAL_SYNTHETIC_RESTORE_HOLD:'+errors.join(','));
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_DIRECT_RENEWAL_SYNTHETIC_BUSINESS_RECORDS_AND_WORKFLOW_SIDE_EFFECTS_RESTORED_PASS');
  }
}
(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(marker.sourceSha,SOURCE,'I66_RENEWAL_EXACT_LIVE_BUILD_DRIFT');
  const users=await staff(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of users)await one(browser,actor);
    console.log('I66_SIGNED_CARLOS_PAULA_LIVE_DIRECT_RENEWAL_SYNTHETIC_ONLY_PASS real_customer_policy_payment_writes=0 genuine_insurer_document_gate_NOT_CERTIFIED');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_RENEWAL_SYNTHETIC_LIVE_UAT_HOLD '+String(e.code||e.message||e).replace(/[^\w.:,/-]+/g,'_').slice(0,220));process.exitCode=1;});
