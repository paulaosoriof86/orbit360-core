'use strict';
// Existing signed renewal driver. Preview verifies both real public entries and
// inherited editable fields without business submissions; the canonical Preview
// writer continues to reject relations. LIVE exercises the same UI against only
// unique synthetic fixtures, then verifies durable writes/reload/replay/restore.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const TENANT='alianzas-soluciones',LIVE_ORIGIN='https://app.aysseguros.com';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function configuration(env=process.env){
  const phase=env.I66_RENEWAL_QA_PHASE||'LIVE',live=phase==='LIVE';
  assert.ok(['PREVIEW','LIVE'].includes(phase),'I66_RENEWAL_PHASE_INVALID');
  const origin=live?env.I66_LIVE_ORIGIN:env.I66_PREVIEW_ORIGIN;
  assert.ok(live?origin===LIVE_ORIGIN:/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app$/.test(origin||''),'I66_RENEWAL_ORIGIN_MISMATCH');
  const source=live?env.I66_APPROVED_LIVE_SOURCE_SHA:env.I66_SOURCE_SHA;
  assert.match(source||'',/^[a-f0-9]{40}$/,'I66_RENEWAL_SOURCE_PIN_REQUIRED');
  assert.ok(env.I66_PACKAGE_ROOT&&path.isAbsolute(env.I66_PACKAGE_ROOT),'I66_RENEWAL_EXACT_PACKAGE_REQUIRED');
  return {phase,live,origin,source,packageRoot:env.I66_PACKAGE_ROOT};
}
function fixtures(role,suffix){
  assert.ok(['operativo','direccion'].includes(role));assert.match(suffix,/^[a-z0-9_]{8,80}$/);
  const base='b4003qa_renew_'+role+'_'+suffix,ids={client:base+'_client',insurer:base+'_insurer',source:base+'_source'};
  const rows=[
    ['clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',asesorId:'b4003qa_no_real_advisor',nombre:'I6.6 QA direct forms',__syntheticQa:true}],
    ['aseguradoras',ids.insurer,{id:ids.insurer,tenantId:TENANT,pais:'GT',moneda:'GTQ',nombre:'I6.6 QA insurer',vinculada:true,activo:true,ramos:['Auto'],portales:[],cuentas:[],__syntheticQa:true}],
    ['polizas',ids.source,{id:ids.source,tenantId:TENANT,clienteId:ids.client,asesorId:'b4003qa_no_real_advisor',aseguradoraId:ids.insurer,
      pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'QA Auto',subramo:'QA Auto',numero:'QA-OLD-'+suffix,
      vigenciaInicio:'2025-11-21',vigenciaFin:'2026-11-21',estado:'Vigente',renovable:null,
      frecuencia:'Contado',formaPago:'Transferencia',conducto:'Aseguradora',cuotas:1,primaNeta:1000,
      gastosEmision:50,gastosFinan:0,otros:0,ivaPct:12,beneficiarios:['Persona QA vigente'],historial:[],__syntheticQa:true}]
  ];
  return {ids,rows,source:rows[2][2]};
}
function assertNoOutboundChannels(raw){
  assert.ok(raw?.notificationChannels==null||Array.isArray(raw.notificationChannels),'I66_RENEWAL_NOTIFICATION_CHANNEL_SCHEMA_HOLD');
  const channels=Array.isArray(raw&&raw.notificationChannels)?raw.notificationChannels:['portal','in_app'];
  assert.ok(channels.every(c=>['portal','in_app','topbar','tarea'].includes(c)),'I66_RENEWAL_EXTERNAL_NOTIFICATION_CHANNEL_HOLD');
  return channels;
}
function assertGeneratedRow(collection,row,{ids,policyIds,managementIds,operationIds,uid}){
  assert.ok(['polizas','gestiones','recibosEsperados','carteraPrimas','vehiculos','actividades'].includes(collection),'I66_RENEWAL_RESTORE_COLLECTION');
  assert.equal(row.tenantId,TENANT);assert.equal(row.clienteId,ids.client);
  if(collection==='polizas')assert.ok(row.id===ids.source&&row.__syntheticQa===true||row.renuevaDe===ids.source&&policyIds.has(row.id),'I66_RENEWAL_RESTORE_POLICY_IDENTITY');
  else if(collection==='gestiones')assert.ok(managementIds.has(row.id)&&row.polizaId===ids.source&&['renewal_accepted','endorsement_request'].includes(row.workflowType)&&row.createdByUid===uid,'I66_RENEWAL_RESTORE_MANAGEMENT_IDENTITY');
  else if(['recibosEsperados','carteraPrimas','vehiculos'].includes(collection))assert.ok(policyIds.has(row.polizaId)&&row.polizaId!==ids.source,'I66_RENEWAL_RESTORE_CHILD_IDENTITY');
  else assert.ok(managementIds.has(row.gestionId)||operationIds.has(row.operationId)||operationIds.has(row.operacionId),'I66_RENEWAL_RESTORE_ACTIVITY_IDENTITY');
}
function assertSeedRestore(collection,row,seed,{live,uid}){
  // The canonical policy engine may update only the derived state and its
  // signed audit metadata on this disposable client. Other seed drift stops
  // restoration; Preview permits no change at all.
  if(!live||collection!=='clientes')return assert.deepEqual(row,seed,'I66_RENEWAL_RESTORE_SEED_CHANGED');
  const derived=new Set(['estadoOperativo','estado','estadoActualizado','updatedAt','updatedByUid','updatedByEmail']);
  assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([key])=>!derived.has(key))),seed,'I66_RENEWAL_RESTORE_CLIENT_IDENTITY');
  const changed=Object.keys(row).some(key=>derived.has(key));
  if(changed){
    assert.equal(row.estado,'activo','I66_RENEWAL_RESTORE_CLIENT_STATE');
    assert.equal(row.estadoOperativo,'activo','I66_RENEWAL_RESTORE_CLIENT_STATE');
    assert.equal(row.updatedByUid,uid,'I66_RENEWAL_RESTORE_CLIENT_ACTOR');
    assert.ok(typeof row.estadoActualizado==='string'&&Number.isFinite(Date.parse(row.estadoActualizado)),'I66_RENEWAL_RESTORE_CLIENT_TIME');
  }
}
async function deleteSnapshotAfterCheck(snapshot,check){
  assert.ok(snapshot.exists&&snapshot.updateTime,'I66_RENEWAL_RESTORE_VERSION_REQUIRED');
  check(snapshot.data());
  await snapshot.ref.delete({lastUpdateTime:snapshot.updateTime});
}
async function waitForBusinessIdle(page){
  await page.waitForFunction(()=>{
    const state=window.Orbit?.store?._operationalWriteStatus?.();
    return !!state&&state.pending===0;
  },null,{timeout:30000});
}
async function settleAndClose(context,page,adapterReady){
  // A detached success modal can precede fire-and-forget activity/client-state
  // writes. Drain the real adapter first, then close the session before any
  // restore query. If the barrier fails, do not claim or attempt restoration.
  try{if(page&&adapterReady)await waitForBusinessIdle(page);}finally{await context.close();}
}
function validateSignedReport(report,{phase,sourceSha,buildId}){
  assert.ok(['PREVIEW','LIVE'].includes(phase),'I66_DIRECT_FORMS_REPORT_PHASE');
  assert.match(sourceSha||'',/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_REPORT_SOURCE_REQUIRED');
  assert.ok(typeof buildId==='string'&&buildId.length>0,'I66_DIRECT_FORMS_REPORT_BUILD_REQUIRED');
  const live=phase==='LIVE';let checks=0;
  const equal=(actual,expected,code)=>{assert.deepEqual(actual,expected,'I66_DIRECT_FORMS_REPORT_'+code);checks++;};
  equal(report?.schema,'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1','SCHEMA');
  equal(report.phase,phase,'PHASE');equal(report.sourceSha,sourceSha,'SOURCE');equal(report.buildId,buildId,'BUILD');
  equal(report.status,live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS','STATUS');
  equal(report.realCustomerWrites,0,'REAL_WRITES');equal(report.externalMessages,0,'EXTERNAL_MESSAGES');
  equal(report.restoreComplete,true,'RESTORE');
  equal(Array.isArray(report.actors),true,'ACTORS');
  equal(report.actors.map(x=>x?.role).sort(),['direccion','operativo'],'EXACT_ROLES');
  for(const actor of report.actors){
    equal(actor.restored,true,'ACTOR_RESTORE');equal(actor.endorsementDraft,true,'ENDORSEMENT_DRAFT');
    equal(actor.readonly,!live,'READONLY');equal(actor.pageErrorCount,0,'PAGE_ERRORS');
    equal(Array.isArray(actor.entries),true,'ENTRIES');
    equal(actor.entries.map(x=>x?.entry).sort(),['Cliente360','Renovaciones'],'EXACT_ENTRIES');
    for(const entry of actor.entries)for(const field of ['expiredUnknown','inheritedEditable','noIntermediateOps','noDraftWrites'])equal(entry[field],true,'ENTRY_'+field);
    if(live){
      equal(actor.status,'SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS','ACTOR_LIVE_STATUS');
      equal(actor.writes?.entry,actor.role==='operativo'?'Renovaciones':'Cliente360','SAVE_ENTRY');
      for(const field of ['normalUi','linkedManagement','reload','idempotentReplay'])equal(actor.writes?.[field],true,'RENEWAL_'+field);
      for(const field of ['successors','receipts','portfolio'])equal(actor.writes?.[field],1,'RENEWAL_'+field);
      for(const field of ['normalUi','policyReadback','closedManagement','reload','idempotentReplay'])equal(actor.endorsementWrite?.[field],true,'ENDORSEMENT_'+field);
    }else{
      equal(actor.status,'SIGNED_PREVIEW_ENTRIES_READONLY_PASS','ACTOR_PREVIEW_STATUS');
      equal(actor.writes,'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED','PREVIEW_NO_WRITE_CLAIM');
      equal(actor.endorsementWrite,undefined,'PREVIEW_NO_ENDORSEMENT_WRITE');
    }
  }
  return {status:'PASS',cleanup:'PASS',checks,phase,coverage:live?'NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY':'PUBLIC_ENTRIES_READONLY'};
}
async function openDraft(page,entry,source){
  assert.ok(['Renovaciones','Cliente360'].includes(entry),'I66_RENEWAL_UNKNOWN_PUBLIC_ENTRY');
  await page.evaluate(x=>{if(x.entry==='Cliente360')Orbit.modules.cliente360.renovar(x.id);else Orbit.modules.renovaciones.registrarAceptacion(x.id);},{entry,id:source.id});
  const decision=page.locator('#renewal-decision-v1200');
  await decision.locator('[data-direct]').click();
  const form=page.locator('#ops-direct-renewal-v1201');
  await form.waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#renewal-direct-approval-v1201').count(),0,'I66_RENEWAL_INTERMEDIATE_FORM_RETURNED');
  for(const [field,value] of Object.entries({num:source.numero,asg:source.aseguradoraId,start:source.vigenciaFin,end:'2027-11-21',prod:source.producto,freq:source.frecuencia,payments:'1',form:source.formaPago,conduct:source.conducto,net:'1000'})){
    const locator=form.locator('#rend-'+field);assert.equal(await locator.inputValue(),value,'I66_RENEWAL_INHERITANCE_'+field);
    assert.equal(await locator.isEditable(),true,'I66_RENEWAL_FIELD_NOT_EDITABLE_'+field);
  }
  await form.locator('#rend-num').fill('QA-EDITABLE-CHECK');
  assert.equal(await page.evaluate(id=>Orbit.store.get('polizas',id).numero,source.id),source.numero,'I66_RENEWAL_DRAFT_MUTATED_SOURCE');
  await form.locator('#rend-num').fill(source.numero);
  return form;
}
async function main(){
  const cfg=configuration(),admin=require('firebase-admin'),{chromium}=require('playwright');
  const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean).map(x=>{try{return JSON.parse(x);}catch{return null;}})
    .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
  assert.ok(credential,'I66_RENEWAL_SIGNED_AUTHORITY_MISSING');
  admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
  const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
  const collection=c=>tenant.collection('data').doc(c).collection('items'),item=(c,id)=>collection(c).doc(id);
  const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');
  const report={schema:'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1',phase:cfg.phase,sourceSha:cfg.source,
    status:'RUNNING',realCustomerWrites:0,externalMessages:0,actors:[],restoreComplete:false};
  let browser;
  try{
    const marker=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
    assert.equal(marker.sourceSha,cfg.source,'I66_RENEWAL_EXACT_ARTIFACT_DRIFT');report.buildId=marker.buildId;
    assert.equal(JSON.parse(fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json'))).sourceSha,cfg.source,'I66_RENEWAL_PACKAGE_SOURCE_DRIFT');
    if(cfg.live)assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
    const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),collection('asesores').limit(400).get()]);
    assert.ok(members.size<150&&advisors.size<400,'I66_RENEWAL_STAFF_BOUND');
    const resolve=(predicate,role)=>{
      const ids=new Set(),uids=new Set();
      for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>predicate(norm(x)))){
        ids.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));}}
      const matches=members.docs.filter(d=>{const x=d.data()||{};return(
        [x.nombre,x.displayName,x.name,x.nombreCompleto,x.fullName].some(v=>predicate(norm(v)))||
        ids.has(String(x.advisorId||x.asesorId||''))||uids.has(d.id))&&norm(x.activeRole)===role&&x.active!==false&&x.activo!==false&&
        ['active','activo'].includes(norm(x.status||x.estado))&&[].concat(x.countries||x.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
      assert.equal(matches.length,1,'I66_RENEWAL_STAFF_AMBIGUOUS_'+role);
      const row=matches[0].data()||{};return {uid:matches[0].id,advisorId:row.advisorId||row.asesorId||'',role};
    };
    const actors=[resolve(x=>x.startsWith('carlos castro'),'operativo'),resolve(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const actor of actors){
      const fx=fixtures(actor.role,suffix),{ids}=fx,seeds=[],context=await browser.newContext({viewport:{width:1280,height:900}});
      const result={role:actor.role,entries:[],endorsementDraft:false,readonly:!cfg.live,writes:cfg.live?'PENDING':'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED',restored:false};
      report.actors.push(result);let outcome='',renewalManagement='',endorsementManagement='',page=null,adapterReady=false;
      const errors=[],writeCalls=[];let stage='SEED';
      try{
        for(const [c,id,row] of fx.rows){assert.equal((await item(c,id).get()).exists,false,'I66_RENEWAL_QA_FIXTURE_COLLISION');await item(c,id).create(row);seeds.push([c,id,row]);}
        const user=await auth.getUser(actor.uid);assert.ok(!user.disabled&&user.emailVerified);
        const token=await auth.createCustomToken(actor.uid);page=await context.newPage();
        page.on('pageerror',()=>errors.push('PAGE_ERROR'));
        page.on('request',request=>{if(request.method()==='POST'&&/\/orbit360(?:OpsLeadsCommand|ProductOperationalCommand|CobrosReconciliationCommand)(?:Preview)?(?:\?|$)/.test(request.url()))writeCalls.push('BUSINESS_COMMAND');});
        stage='SIGNED_SESSION';await page.goto(cfg.origin+'/#/inicio',{waitUntil:'commit',timeout:30000});
        await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
        const session=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
          await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);
          const result=await Orbit.productAppP0.activate();return {started:result?.started===true,role:Orbit.session?.rol?.(),preview:p.isI66PreviewHost(),canRenew:Orbit.access?.can('renovaciones','edit'),canIssue:Orbit.issuance?.canManage?.()};},token);
        assert.ok(session.started&&session.preview===!cfg.live&&norm(session.role)===actor.role&&session.canRenew&&session.canIssue,'I66_RENEWAL_SIGNED_ROLE_DENIED');
        adapterReady=true;
        if(actor.role==='direccion'){
          stage='DIRECTION_EXISTING_LEGAL_SCOPE';
          const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
          if(cfg.live)await legal.acceptDirectionLiveLegal({page,actor,cfg});else await legal.acceptDirectionPreviewLegal({page,actor,cfg});
        }
        assert.equal(await page.locator('[data-legal-gate]').count(),0,'I66_RENEWAL_LEGAL_GATE_ACTIVE');
        stage='PROTECTED_HYDRATION';
        const denied=await page.evaluate(async id=>Orbit.issuance.createDirectRenewal(id,{}, {operationId:'qa_missing_management_readonly'}),'b4003qa_missing_'+suffix);
        assert.ok([].concat(denied.errors||[]).includes('gestion_renovacion_aceptada_no_encontrada'),'I66_RENEWAL_MISSING_MANAGEMENT_NOT_FAIL_CLOSED');
        await page.evaluate(()=>Orbit.store._ensureCollections(['gestiones','polizas','vehiculos','clientes','aseguradoras']));
        await page.waitForFunction(x=>!!Orbit.store.get('polizas',x.source)&&!!Orbit.store.get('clientes',x.client)&&!!Orbit.store.get('aseguradoras',x.insurer),ids,{timeout:30000});
        const life=await page.evaluate(id=>{Orbit.renewalLifecycle.invalidate();return Orbit.renewalLifecycle.evaluate(Orbit.store.get('polizas',id));},ids.source);
        assert.equal(life.reason,'RENOVABILIDAD_SIN_CONFIRMAR');assert.ok(life.days<0&&life.reviewOnly&&life.bucketEligible);
        const beforeWrites=writeCalls.length;
        stage='BOTH_PUBLIC_RENEWAL_ENTRIES';
        for(const entry of ['Renovaciones','Cliente360']){
          const form=await openDraft(page,entry,fx.source);
          await form.locator('[data-create]').click();
          assert.equal(await collection('gestiones').where('clienteId','==',ids.client).limit(1).get().then(x=>x.size),0,'I66_RENEWAL_UNCONFIRMED_DRAFT_CREATED_MANAGEMENT');
          await form.locator('[data-close]').first().click();
          result.entries.push({entry,expiredUnknown:true,inheritedEditable:true,noIntermediateOps:true,noDraftWrites:true});
        }
        stage='ISSUED_BENEFICIARY_ENDORSEMENT_DRAFT';
        await page.evaluate(id=>Orbit.modules.cliente360.endoso(id),ids.source);
        const end=page.locator('#endorsement-request-v1201');await end.locator('#end-type').selectOption('beneficiarios');
        assert.equal(await end.locator('[data-direct]').isVisible(),true,'I66_ENDORSEMENT_DIRECT_BENEFICIARY_ACTION_MISSING');
        assert.equal(await end.locator('#end-benef').inputValue(),'Persona QA vigente','I66_ENDORSEMENT_BENEFICIARIES_NOT_INHERITED');
        assert.equal(await end.locator('#end-benef').isEditable(),true);
        await end.locator('[data-direct]').click();
        assert.equal((await collection('gestiones').where('clienteId','==',ids.client).limit(1).get()).size,0,'I66_ENDORSEMENT_MISSING_SUPPORT_CREATED_REQUEST');
        result.endorsementDraft=true;
        assert.equal(writeCalls.length,beforeWrites,'I66_DRAFT_SENT_BUSINESS_WRITE');
        if(!cfg.live){
          await end.locator('[data-close]').first().click();
          for(const [c,id,row] of seeds)assert.deepEqual((await item(c,id).get()).data(),row,'I66_PREVIEW_DRAFT_SEED_CHANGED');
          assert.deepEqual(errors,[],'I66_RENEWAL_PAGE_ERRORS');result.pageErrorCount=0;
          result.readonly=true;result.status='SIGNED_PREVIEW_ENTRIES_READONLY_PASS';
          continue;
        }
        stage='ISSUED_ENDORSEMENT_SAVE';
        assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
        await end.locator('#end-benef').fill('Persona QA ajustada');
        await end.locator('#end-doc').fill('qa-isolated-endorsement-document-'+suffix);
        await end.locator('#end-note').fill('I6.6 synthetic issued beneficiary change');
        await end.locator('#end-direct-ref').fill('QA-END-'+suffix);
        await end.locator('#end-direct-date').fill('2026-11-24');
        await end.locator('[data-direct]').click();
        await end.waitFor({state:'detached',timeout:30000});
        const appliedSource=(await item('polizas',ids.source).get()).data();endorsementManagement=appliedSource?.ultimoEndosoId||'';
        assert.ok(endorsementManagement);assert.deepEqual(appliedSource.beneficiarios,['Persona QA ajustada']);
        assert.equal((await item('gestiones',endorsementManagement).get()).data()?.endorsementStage,'APLICADO');
        result.endorsementWrite={normalUi:true,policyReadback:true,closedManagement:true};
        stage='DIRECT_RENEWAL_SAVE';
        // Close the read-only policy detail opened by the canonical success path.
        const close=page.locator('#vp-x');if(await close.count())await close.click();
        const entry=actor.role==='operativo'?'Renovaciones':'Cliente360',form=await openDraft(page,entry,fx.source);
        await form.locator('#rend-approval-confirm').check();
        await form.locator('#rend-approval-note').fill('I6.6 synthetic client approval');
        await form.locator('#rend-doc').fill('qa-isolated-placeholder-not-real-insurer-doc-'+suffix);
        await form.locator('#rend-num').fill('QA-NEW-'+suffix);
        await form.locator('#rend-net').fill('1200');
        assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
        await form.locator('[data-create]').click();
        await form.waitFor({state:'detached',timeout:30000});
        outcome=(await item('polizas',ids.source).get()).data()?.renovadaPor||'';assert.ok(outcome.startsWith('pol_'),'I66_RENEWAL_SUCCESSOR_MISSING');
        const [policy,gestions,receipts,portfolio]=await Promise.all([item('polizas',outcome).get(),
          collection('gestiones').where('clienteId','==',ids.client).limit(10).get(),collection('recibosEsperados').where('polizaId','==',outcome).limit(25).get(),
          collection('carteraPrimas').where('polizaId','==',outcome).limit(25).get()]);
        const accepted=gestions.docs.filter(d=>d.data()?.workflowType==='renewal_accepted');assert.equal(accepted.length,1);renewalManagement=accepted[0].id;
        assert.equal(accepted[0].data().directRenewalPolicyId,outcome);assert.equal(accepted[0].data().estado,'Resuelta');
        assert.equal(policy.data()?.clienteId,ids.client);assert.equal(policy.data()?.renuevaDe,ids.source);assert.equal(policy.data()?.primaNeta,1200);
        assert.equal(receipts.size,1);assert.equal(portfolio.size,1);assert.equal(portfolio.docs[0].data()?.reciboId,receipts.docs[0].id);
        assert.equal((await item('polizas',ids.source).get()).data()?.renovable,null,'I66_RENEWAL_SILENT_CLASSIFICATION_WRITE');
        const note='I6.6 signed normal policy edit '+suffix;
        await page.evaluate(async x=>Orbit.store.updateDurable('polizas',x.id,{observaciones:x.note}),{id:outcome,note});
        assert.equal((await item('polizas',outcome).get()).data()?.updatedByUid,actor.uid,'I66_RENEWAL_MANUAL_EDIT_ACTOR_MISSING');
        const replay=await page.evaluate(async x=>({renewal:await Orbit.issuance.createDirectRenewal(x.renewal,{}),endorsement:await Orbit.endorsements.apply(x.endorsement,{})}),
          {renewal:renewalManagement,endorsement:endorsementManagement});
        assert.ok(replay.renewal?.alreadyCreated&&replay.renewal.policy.id===outcome);assert.ok(replay.endorsement?.alreadyApplied);
        await waitForBusinessIdle(page);
        assert.equal(await page.evaluate(()=>Orbit.store._operationalWriteStatus().failed),0,'I66_RENEWAL_BACKGROUND_WRITE_FAILED');
        stage='RELOAD_READBACK';await page.reload({waitUntil:'commit',timeout:30000});
        await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
        await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();await Orbit.store._ensureCollections(['gestiones','polizas','recibosEsperados','carteraPrimas']);});
        await page.waitForFunction(x=>Orbit.store.get('polizas',x.policy)?.renuevaDe===x.source&&Orbit.store.get('polizas',x.policy)?.observaciones===x.note&&
          JSON.stringify(Orbit.store.get('polizas',x.source)?.beneficiarios)===JSON.stringify(['Persona QA ajustada'])&&
          Orbit.store.get('gestiones',x.renewal)?.directRenewalPolicyId===x.policy&&Orbit.store.get('gestiones',x.endorsement)?.endorsementStage==='APLICADO',
          {policy:outcome,source:ids.source,renewal:renewalManagement,endorsement:endorsementManagement,note},{timeout:30000});
        assert.deepEqual(errors,[],'I66_RENEWAL_PAGE_ERRORS');
        result.pageErrorCount=0;Object.assign(result.endorsementWrite,{reload:true,idempotentReplay:true});
        result.writes={normalUi:true,entry,successors:1,receipts:1,portfolio:1,linkedManagement:true,reload:true,idempotentReplay:true};
        result.status='SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS';
      }catch(error){result.failureStage=stage;result.status='HOLD';throw error;}
      finally{
        const cleanupErrors=[];
        try{
          await settleAndClose(context,page,adapterReady);
          const [policies,managements]=await Promise.all([collection('polizas').where('clienteId','==',ids.client).limit(10).get(),collection('gestiones').where('clienteId','==',ids.client).limit(10).get()]);
          assert.ok(policies.size<10&&managements.size<10);
          const policyIds=new Set(policies.docs.filter(d=>d.id===ids.source||d.data()?.renuevaDe===ids.source).map(d=>d.id));
          const managementIds=new Set(managements.docs.filter(d=>d.data()?.polizaId===ids.source&&['renewal_accepted','endorsement_request'].includes(d.data()?.workflowType)).map(d=>d.id));
          const operationIds=new Set([...policies.docs,...managements.docs].flatMap(d=>[d.data()?.operationId,d.data()?.operacionId,d.data()?.renewalOperationId].filter(Boolean)));
          for(const c of ['actividades','vehiculos','carteraPrimas','recibosEsperados','polizas','gestiones']){
            const snap=await collection(c).where('clienteId','==',ids.client).limit(70).get();assert.ok(snap.size<70,'I66_RENEWAL_RESTORE_UNBOUNDED');
            for(const doc of snap.docs)await deleteSnapshotAfterCheck(doc,row=>{assert.equal(row.id,doc.id,'I66_RENEWAL_RESTORE_DOCUMENT_ID');assertGeneratedRow(c,row,{ids,policyIds,managementIds,operationIds,uid:actor.uid});});
            assert.equal((await collection(c).where('clienteId','==',ids.client).limit(1).get()).size,0);
          }
          for(const id of managementIds)for(const c of ['workflowRequests','workflowEvents','notificationOutbox','previewWorkflowRequests','previewWorkflowEvents','previewNotificationOutbox']){
            const snap=await tenant.collection(c).where('entityId','==',id).limit(30).get();assert.ok(snap.size<30,'I66_RENEWAL_RESTORE_AUDIT_UNBOUNDED');
            for(const doc of snap.docs)await deleteSnapshotAfterCheck(doc,row=>{assert.equal(row.entityId,id);if(c.toLowerCase().includes('outbox'))assertNoOutboundChannels({notificationChannels:row.channels});});
          }
        }catch(e){cleanupErrors.push(String(e.message||e).slice(0,100));}
        for(const [c,id,row] of (cleanupErrors.length?[]:seeds.filter(x=>x[0]!=='polizas')))try{
          const snap=await item(c,id).get();if(snap.exists)await deleteSnapshotAfterCheck(snap,current=>assertSeedRestore(c,current,row,{live:cfg.live,uid:actor.uid}));
          assert.equal((await item(c,id).get()).exists,false);
        }catch(e){cleanupErrors.push(String(e.message||e).slice(0,100));}
        result.restored=cleanupErrors.length===0;
        if(cleanupErrors.length)throw Error('I66_RENEWAL_SYNTHETIC_RESTORE_HOLD:'+cleanupErrors.join(','));
        console.log('I66_'+cfg.phase+'_'+actor.role.toUpperCase()+'_DIRECT_FORMS_SYNTHETIC_RESTORED');
      }
    }
    report.restoreComplete=report.actors.every(a=>a.restored);
    assert.equal(report.actors.length,2);assert.ok(report.restoreComplete);
    report.status=cfg.live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS';
    validateSignedReport(report,{phase:cfg.phase,sourceSha:cfg.source,buildId:report.buildId});
    console.log(report.status+' real_customer_writes=0 external_messages=0 genuine_insurer_document_gate_NOT_CERTIFIED');
  }catch(error){report.status='HOLD';report.failureCode=String(error.message||'UNKNOWN').replace(/[^A-Z0-9_:. -]/g,'_').slice(0,180);throw error;}
  finally{
    const output=path.join(process.env.RUNNER_TEMP||cfg.packageRoot,'gi-i66-direct-forms-'+cfg.phase.toLowerCase()+'.json');
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    if(browser)await browser.close();await admin.app().delete();
  }
}
module.exports={configuration,fixtures,assertNoOutboundChannels,assertGeneratedRow,assertSeedRestore,deleteSnapshotAfterCheck,waitForBusinessIdle,settleAndClose,validateSignedReport,openDraft};
if(require.main===module)main().catch(e=>{console.error('I66_DIRECT_FORMS_SIGNED_HOLD '+String(e.code||e.message||e).replace(/[^\w.:,/-]+/g,'_').slice(0,220));process.exitCode=1;});
