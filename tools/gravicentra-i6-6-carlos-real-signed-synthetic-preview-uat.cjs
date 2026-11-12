'use strict';
// Exact deployed I6.6 Preview, signed existing staff actors. Writes ONLY
// uniquely named synthetic records and restores their business collections.
// Does not accept legal agreements, change Auth/IAM/Rules or write LIVE APIs.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');

const PREVIEW=process.env.I66_PREVIEW_ORIGIN;
const TENANT='alianzas-soluciones';
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(x=>process.env[x]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(s=>s&&s.type==='service_account'&&s.project_id==='ays-orbit-360-lab'&&s.private_key);
assert.ok(service,'I66_SIGNED_QA_EXISTING_LAB_AUTHORITY_REQUIRED');
assert.ok(/^https:\/\/ays-orbit-360-lab--gi-i66-rc-43299843267-[a-z0-9]+\.web\.app$/.test(PREVIEW||''),'I66_QA_EXACT_PREVIEW_ORIGIN_REQUIRED');
admin.initializeApp({credential:admin.credential.cert(service),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),root=db.collection('tenants').doc(TENANT);
const ref=(collection,id)=>root.collection('data').doc(collection).collection('items').doc(id);
const suffix=Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const AUDIT_NAME='I6.6 Prueba sintética reversible';

async function findActors(){
  const [members,advisors]=await Promise.all([root.collection('members').limit(150).get(),ref('asesores','_').parent.limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_QA_IDENTITY_SCAN_BOUND_HOLD');
  function find(name,role){
    const linked=new Set(),uids=new Set();
    for(const d of advisors.docs){const a=d.data()||{};
      if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>name(normalize(x)))){
        linked.add(d.id);for(const k of [a.authUid,a.uid,a.userId])if(k)uids.add(String(k));
      }
    }
    const matches=members.docs.filter(d=>{const m=d.data()||{};
      return ([m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(x=>name(normalize(x)))||
        linked.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&
        normalize(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
        !['inactivo','inactive','bloqueado','blocked'].includes(normalize(m.status||m.estado))&&
        [].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT');
    });
    assert.equal(matches.length,1,'I66_SIGNED_ACTOR_NOT_UNIQUE_'+role);
    return {uid:matches[0].id,member:matches[0].data(),role};
  }
  const carlos=find(x=>x.startsWith('carlos castro'),'operativo');
  const paula=find(x=>x.includes('paula')&&x.includes('osorio'),'direccion');
  assert.notEqual(carlos.uid,paula.uid,'I66_QA_ACTOR_UID_COLLISION');
  for(const actor of [carlos,paula]){
    const u=await auth.getUser(actor.uid);assert.ok(!u.disabled&&u.emailVerified,'I66_SIGNED_ACTOR_AUTH_NOT_READY');
    actor.token=await auth.createCustomToken(u.uid);
  }
  return [carlos,paula];
}
function callbackPayload(role,op,id,payload){return {tenantId:TENANT,activeRole:role,operation:op,entityId:id,payload,reason:'I6.6 revisión sintética reversible de acceso transversal'}};

async function runActor(browser,actor){
  const token=actor.token,role=actor.role,idRoot='b4003qa_i66_'+role+'_'+suffix;
  const ids={management:idRoot+'_gestiones',business:idRoot+'_negocios',task:'b4003qa_tareas_'+role+'_'+suffix};
  const created=[];let cleaned=false;
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  try{
    for(const [collection,id] of [['gestiones',ids.management],['negocios',ids.business],['tareas',ids.task]]){
      assert.equal((await ref(collection,id).get()).exists,false,'I66_QA_TARGET_ALREADY_EXISTS_'+collection);
    }
    const page=await context.newPage();
    await page.goto(PREVIEW+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const login=await page.evaluate(async t=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,t);
      const result=await Orbit.productAppP0.activate();
      return {started:result?.started===true,role:String(Orbit.session?.rol?.()||''),preview:p.isI66PreviewHost(),
        opsCreate:Orbit.access?.can('ops','create'),opsEdit:Orbit.access?.can('ops','edit'),leadsCreate:Orbit.access?.can('leads','create'),
        legalOverlayPresent:!!document.querySelector('[data-legal-gate]')};
    },token);
    assert.ok(login.started&&login.preview,'I66_SIGNED_PRODUCT_PREVIEW_NOT_ACTIVATED_'+role);
    assert.ok(normalize(login.role).includes(role),'I66_QA_ACTIVE_ROLE_WRONG_'+role);
    assert.equal(login.opsCreate,true,'I66_QA_OPS_CREATE_DENIED_'+role);
    assert.equal(login.opsEdit,true,'I66_QA_OPS_EDIT_DENIED_'+role);
    assert.equal(login.leadsCreate,true,'I66_QA_LEADS_CREATE_DENIED_'+role);
    // Do not click or alter the legal gate. Test server transport using
    // Firebase's already-signed actor and harmless named QA-only records.
    const call=(name,data)=>page.evaluate(async args=>Orbit.productRuntimeBrowserProvidersP0.callFunction(args.name,args.data,'us-east1'),{name,data});
    const workflow=(op,id,payload)=>call('orbit360OpsLeadsCommandPreview',callbackPayload(role,op,id,payload));
    const denied=await page.evaluate(async(id)=>{
      try {await Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360OpsLeadsCommandPreview',
        {tenantId:'alianzas-soluciones',activeRole:'operativo',operation:'update_management',entityId:'real_'+id,payload:{id:'real_'+id},reason:'Denegación sintética'},'us-east1');return false;}
      catch(e){return String(e.message||'').includes('I66_PREVIEW_MUTATION_CALLABLE_DENIED');}
    },ids.management);
    assert.equal(denied,true,'I66_REAL_RECORD_WRITE_GUARD_NOT_EFFECTIVE_'+role);
    const management={id:ids.management,pais:'GT',moneda:'GTQ',asesorId:'b4003qa_advisor_i66',titulo:AUDIT_NAME,tipo:'Gestión',lista:'Gestiones Admin',origen:'QA Preview',estado:'Pendiente',nota:'Caso sintético sin cliente ni póliza'};
    created.push(['gestiones',ids.management]);
    const mc=await workflow('create_management',ids.management,management);
    assert.ok(mc.ok&&mc.canonicalReadback,'I66_SIGNED_MANAGEMENT_CREATE_NO_READBACK_'+role);
    let persisted=(await ref('gestiones',ids.management).get()).data()||{};
    assert.ok(persisted.previewWrite===true&&persisted.createdByUid===actor.uid&&persisted.pais==='GT','I66_MANAGEMENT_SERVER_SCOPE_DRIFT_'+role);
    assert.ok(!persisted.clienteId&&!persisted.polizaId&&!persisted.negocioId,'I66_MANAGEMENT_REAL_RELATION_CREATED');
    const eventId='evt_i66_qa_'+role+'_'+suffix;
    const mu=await workflow('update_management',ids.management,{id:ids.management,pais:'GT',comentarios:[{eventId,direction:'operations',texto:'Comentario sintético para Ops',tipo:'Comentario'}]});
    assert.ok(mu.ok&&mu.canonicalReadback&&mu.collaborationReadback?.actorUid===actor.uid,'I66_SIGNED_MANAGEMENT_COLLABORATION_NO_READBACK_'+role);
    const mr=await workflow('resolve_management',ids.management,{id:ids.management,pais:'GT',resultado:'Resuelta en prueba sintética'});
    assert.ok(mr.ok&&mr.canonicalReadback,'I66_SIGNED_MANAGEMENT_RESOLVE_NO_READBACK_'+role);
    persisted=(await ref('gestiones',ids.management).get()).data()||{};
    assert.equal(persisted.estado,'Resuelta','I66_MANAGEMENT_RESOLVE_NOT_PERSISTED_'+role);
    created.push(['negocios',ids.business]);
    const bc=await workflow('create_business',ids.business,{id:ids.business,nombre:AUDIT_NAME,tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:'b4003qa_advisor_i66',etapa:'nuevo',origen:'Plataforma',email:'',telefono:'',primaEst:0});
    assert.ok(bc.ok&&bc.canonicalReadback,'I66_SIGNED_LEAD_CREATE_NO_READBACK_'+role);
    let lead=(await ref('negocios',ids.business).get()).data()||{};
    assert.ok(lead.previewWrite===true&&lead.createdByUid===actor.uid&&lead.pais==='GT','I66_LEAD_WRITE_SCOPE_DRIFT_'+role);
    const bu=await workflow('update_business',ids.business,{id:ids.business,nombre:AUDIT_NAME+' actualizada',pais:'GT'});
    assert.ok(bu.ok&&bu.canonicalReadback,'I66_SIGNED_LEAD_UPDATE_NO_READBACK_'+role);
    lead=(await ref('negocios',ids.business).get()).data()||{};
    assert.equal(lead.nombre,AUDIT_NAME+' actualizada','I66_LEAD_UPDATE_NOT_PERSISTED_'+role);
    created.push(['tareas',ids.task]);
    const task=await page.evaluate(async p=>Orbit.store.insertDurable('tareas',p),{id:ids.task,t:'I6.6 tarea sintética transversal',pais:'GT',fecha:'2026-11-12',done:false,__syntheticQa:true});
    assert.equal(task?.id,ids.task,'I66_SIGNED_TASK_CREATE_NOT_CONFIRMED_'+role);
    const persistedTask=(await ref('tareas',ids.task).get()).data()||{};
    assert.ok(persistedTask.__syntheticQa===true&&persistedTask.pais==='GT'&&persistedTask.done===false,'I66_SIGNED_TASK_CREATE_NO_SERVER_PERSISTENCE_'+role);
    await page.evaluate(async id=>Orbit.store.updateDurable('tareas',id,{done:true}),ids.task);
    assert.equal((await ref('tareas',ids.task).get()).data()?.done,true,'I66_SIGNED_TASK_COMPLETE_NOT_DURABLE_'+role);
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const session=await page.evaluate(async()=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      const u=await p.waitForUser();
      const result=await Orbit.productAppP0.activate();
      return {userReady:!!u?.uid,started:result?.started===true,activeUid:Orbit.auth?.productUser?.uid||''};
    });
    assert.ok(session.userReady&&session.started&&session.activeUid===actor.uid,'I66_SIGNED_RELOAD_SESSION_DRIFT_'+role);
    assert.equal((await ref('gestiones',ids.management).get()).data()?.estado,'Resuelta','I66_SIGNED_RELOAD_MANAGEMENT_LOST_'+role);
    assert.equal((await ref('negocios',ids.business).get()).data()?.nombre,AUDIT_NAME+' actualizada','I66_SIGNED_RELOAD_LEAD_LOST_'+role);
    assert.equal((await ref('tareas',ids.task).get()).data()?.done,true,'I66_SIGNED_RELOAD_TASK_LOST_'+role);
    console.log('I66_SIGNED_'+role.toUpperCase()+'_PREVIEW_OPS_LEADS_TASK_CREATE_UPDATE_RESOLVE_RELOAD_PASS legalGateUntouched='+login.legalOverlayPresent);
  } finally {
    const failures=[];
    for(const [collection,id] of created.reverse()){
      try{
        const d=ref(collection,id),s=await d.get(),row=s.data()||{};
        if(!s.exists)continue;
        assert.ok(s.exists&&row.id===id&&row.tenantId===TENANT&&row.pais==='GT','I66_QA_RESTORE_TARGET_MISMATCH_'+collection);
        if(collection==='tareas')assert.ok(row.__syntheticQa===true&&row.ownerUid===actor.uid,'I66_QA_RESTORE_TASK_PROVENANCE_MISMATCH');
        else assert.ok(row.previewWrite===true&&row.previewSource==='hosting-preview-uat'&&row.createdByUid===actor.uid,'I66_QA_RESTORE_WORKFLOW_PROVENANCE_MISMATCH');
        await d.delete({exists:true});
        assert.equal((await d.get()).exists,false,'I66_QA_RESTORE_READBACK_FAILED_'+collection);
      }catch(e){failures.push(collection+':'+String(e.code||'RESTORE_FAILED'));}
    }
    cleaned=failures.length===0;
    await context.close();
    if(!cleaned)throw Error('I66_QA_SYNTHETIC_RESTORE_HOLD:'+failures.join(','));
    console.log('I66_SIGNED_'+role.toUpperCase()+'_SYNTHETIC_BUSINESS_RECORDS_RESTORED_PASS count='+created.length);
  }
}

(async()=>{
  const actors=await findActors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of actors)await runActor(browser,actor);
    console.log('I66_CARLOS_AND_PAULA_SIGNED_PREVIEW_TRANSVERSAL_SYNTHETIC_PASS customer_records_touched=0 auth_changes=0 live_calls=0');
  } finally{await browser.close();}
})().catch(e=>{console.error('I66_SIGNED_SYNTHETIC_UAT_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,180));process.exitCode=1;});
