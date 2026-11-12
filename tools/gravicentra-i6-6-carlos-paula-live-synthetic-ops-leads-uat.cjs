'use strict';
// I6.6 signed LIVE UAT: exactly two existing actors, unique tenant-contained
// synthetic records only, including the side-effect request/event/outbox IDs.
// Full rollback of QA records is mandatory. No real client/policy/payment IDs.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const LIVE='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const SHA='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const tokenSecrets=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x&&x.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(tokenSecrets,'I66_LIVE_SIGNED_PROJECT_AUTHORITY_MISSING');
assert.equal(process.env.I66_LIVE_ORIGIN,LIVE,'I66_LIVE_ORIGIN_NOT_STAFF_DOMAIN');
admin.initializeApp({credential:admin.credential.cert(tokenSecrets),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const items=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
const meta=(c,id)=>tenant.collection(c).doc(id);
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');

async function staff(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),items('asesores','_').parent.limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_LIVE_ACTOR_SCAN_NOT_BOUNDED');
  const find=(test,role)=>{
    const ids=new Set(),uids=new Set();
    for(const x of advisors.docs){const r=x.data()||{};
      if([r.nombre,r.nombreCompleto,r.displayName,r.name].some(v=>test(norm(v)))){
        ids.add(x.id);for(const v of [r.authUid,r.uid,r.userId])if(v)uids.add(String(v));
      }
    }
    const rows=members.docs.filter(x=>{const m=x.data()||{};
      return ([m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(v=>test(norm(v)))||
        ids.has(String(m.advisorId||m.asesorId||''))||uids.has(x.id))&&
        norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
        ['active','activo'].includes(norm(m.status||m.estado))&&
        [].concat(m.countries||m.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');
    });
    assert.equal(rows.length,1,'I66_LIVE_NON_UNIQUE_SIGNED_'+role);
    return{uid:rows[0].id,role};
  };
  const all=[find(x=>x.startsWith('carlos castro'),'operativo'),find(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const actor of all){const u=await auth.getUser(actor.uid);assert.ok(!u.disabled&&u.emailVerified);actor.token=await auth.createCustomToken(actor.uid);}
  return all;
}
async function actorUat(browser,actor){
  const base='i66liveqa_'+actor.role+'_'+suffix;
  const management=base+'_gestion',business=base+'_lead';
  const task='i66liveqa_tareas_'+actor.role+'_'+suffix;
  const uiTaskTitle='I6.6 LIVE QA Tarea desde boton Ops '+actor.role+' '+suffix;
  const actions=[
    ['create_management',management,'gestiones'],
    ['update_management',management,'gestiones'],
    ['resolve_management',management,'gestiones'],
    ['create_business',business,'negocios'],
    ['update_business',business,'negocios']
  ];
  const requests=actions.map(([op,id])=>({op,id,rid:'i66liveqa_req_'+actor.role+'_'+op+'_'+suffix}));
  const artifacts=requests.flatMap(x=>{
    const e='evt_'+hash(TENANT+'|'+x.rid).slice(0,28);
    return[['workflowRequests',x.rid,x.id],['workflowEvents',e,x.id],['notificationOutbox',e,x.id]];
  });
  const targets=[['gestiones',management],['negocios',business],['tareas',task]];
  const context=await browser.newContext({viewport:{width:1280,height:850}});
  try{
    for(const [c,id] of targets)assert.equal((await items(c,id).get()).exists,false,'I66_LIVE_SYNTHETIC_TARGET_COLLISION');
    for(const [c,id] of artifacts)assert.equal((await meta(c,id).get()).exists,false,'I66_LIVE_SYNTHETIC_AUDIT_COLLISION');
    const page=await context.newPage();
    await page.goto(LIVE+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const session=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();
      await ctx.modules.auth.setPersistence(ctx.auth,ctx.modules.auth.browserSessionPersistence);
      await ctx.modules.auth.signInWithCustomToken(ctx.auth,token);
      const result=await Orbit.productAppP0.activate();
      const a=Orbit.access;
      const rights={opsCreate:a?.can('ops','create'),opsEdit:a?.can('ops','edit'),leadsCreate:a?.can('leads','create'),
        polizasEdit:a?.can('polizas','edit'),renovacionesEdit:a?.can('renovaciones','edit'),cobrosEdit:a?.can('cobros','edit')};
      return{started:result?.started===true,role:String(Orbit.session?.rol?.()||''),preview:p.isI66PreviewHost(),rights};
    },actor.token);
    assert.ok(session.started&&!session.preview&&norm(session.role).includes(actor.role),'I66_LIVE_SIGNED_SESSION_NOT_READY_'+actor.role);
    for(const key of Object.keys(session.rights))assert.equal(session.rights[key],true,'I66_LIVE_SIGNED_WRITE_RIGHT_DENIED_'+actor.role+'_'+key);
    const workflow=async(op,id,payload)=>{
      const req=requests.find(x=>x.op===op&&x.id===id);
      return page.evaluate(async args=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360OpsLeadsCommand',args,'us-central1'),
        {tenantId:TENANT,activeRole:actor.role,operation:op,entityId:id,requestId:req.rid,payload,
          reason:'I6.6 prueba sintética LIVE reversible de permiso operativo'});
    };
    const ghost='i66liveqa_advisor_not_a_real_user';
    const testName='I6.6 LIVE QA reversible '+actor.role;
    const m=await workflow('create_management',management,{id:management,titulo:testName,tipo:'Gestión',lista:'Gestiones Admin',
      origen:'QA controlado',estado:'Pendiente',pais:'GT',moneda:'GTQ',asesorId:ghost,nota:'Sin cliente, póliza, vehículo ni pago'});
    assert.ok(m.ok&&m.canonicalReadback,'I66_LIVE_SIGNED_CREATE_OPS_FAILED_'+actor.role);
    assert.equal((await items('gestiones',management).get()).data()?.createdByUid,actor.uid);
    const um=await workflow('update_management',management,{id:management,pais:'GT',nota:'Prueba LIVE actualizada'});
    assert.ok(um.ok&&um.canonicalReadback,'I66_LIVE_SIGNED_UPDATE_OPS_FAILED_'+actor.role);
    const rm=await workflow('resolve_management',management,{id:management,pais:'GT',resultado:'Resuelta QA'});
    assert.ok(rm.ok&&rm.canonicalReadback,'I66_LIVE_SIGNED_RESOLVE_OPS_FAILED_'+actor.role);
    assert.equal((await items('gestiones',management).get()).data()?.estado,'Resuelta');
    const b=await workflow('create_business',business,{id:business,nombre:testName,tipo:'Persona',pais:'GT',moneda:'GTQ',
      asesorId:ghost,etapa:'nuevo',origen:'Plataforma',email:'',telefono:'',primaEst:0});
    assert.ok(b.ok&&b.canonicalReadback,'I66_LIVE_SIGNED_CREATE_LEAD_FAILED_'+actor.role);
    const ub=await workflow('update_business',business,{id:business,pais:'GT',nombre:testName+' actualizada'});
    assert.ok(ub.ok&&ub.canonicalReadback,'I66_LIVE_SIGNED_UPDATE_LEAD_FAILED_'+actor.role);
    assert.equal((await items('negocios',business).get()).data()?.nombre,testName+' actualizada');
    const t=await page.evaluate(async x=>Orbit.store.insertDurable('tareas',x),
      {id:task,t:'I6.6 LIVE tarea sintética',pais:'GT',fecha:'2026-11-12',done:false,__syntheticQa:true});
    assert.equal(t?.id,task,'I66_LIVE_SIGNED_TASK_CREATE_FAILED_'+actor.role);
    await page.evaluate(async id=>Orbit.store.updateDurable('tareas',id,{done:true}),task);
    assert.equal((await items('tareas',task).get()).data()?.done,true);
    // Exercise Carlos's actual + Tarea UX, not just the store API. Native
    // modal, product handler, authenticated durable writer, Ops projection.
    // If an assertion fails after insertion, the exact synthetic title is
    // always queried and removed in finally; no real agenda records touched.
    assert.equal((await items('tareas','_').parent.where('t','==',uiTaskTitle).limit(3).get()).empty,true);
    const uiPreflight=await page.evaluate(()=>{
      const b=document.querySelector('#op-new-task'),r=b?.getBoundingClientRect();
      const top=r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;
      return{buttonPresent:!!b,visible:!!r&&r.width>0&&r.height>0,
        rect:r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}:null,
        topTag:top?.tagName||null,topId:top?.id||null,topClass:String(top?.className||'').slice(0,70),
        modalOverlays:document.querySelectorAll('.drawer-back.open').length,
        route:Orbit.route?.key||null};
    });
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_OPS_PLUS_TAREA_BUTTON_PREFLIGHT '+JSON.stringify(uiPreflight));
    await page.locator('#op-new-task').click({timeout:10000});
    await page.locator('.drawer-back.open [data-in]').fill(uiTaskTitle);
    await page.locator('.drawer-back.open [data-yes]').click();
    await page.waitForFunction(title=>(Orbit.store.all('tareas')||[]).some(t=>t.t===title),uiTaskTitle,{timeout:30000});
    const uiCreated=(await items('tareas','_').parent.where('t','==',uiTaskTitle).limit(3).get()).docs;
    assert.equal(uiCreated.length,1,'I66_LIVE_TASK_FROM_OPS_UI_NOT_DURABLE_'+actor.role);
    const uiTaskId=uiCreated[0].id,uiRecord=uiCreated[0].data()||{};
    assert.match(uiTaskId,/^tk\d{10,}$/, 'I66_LIVE_UI_TASK_ID_NOT_CANONICAL');
    assert.equal(uiRecord.ownerUid,actor.uid);
    assert.equal(uiRecord.pais,'GT');
    assert.equal(uiRecord.done,false);
    targets.push(['tareas',uiTaskId]);
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_SIGNED_OPS_PLUS_TAREA_UI_CREATE_PERSIST_PASS');
    await page.evaluate(()=>document.querySelector('#op-show-tasks')?.click());
    await page.waitForFunction(id=>!!document.querySelector('[aria-label="Tareas de agenda en Ops"] [data-ops-task-toggle="'+id+'"]'),
      task,{timeout:30000});
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_SYNTHETIC_CRONOGRAMA_TASK_VISIBLE_IN_OPS_PASS');
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const after=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const u=await p.waitForUser();return{uid:u?.uid,started:(await Orbit.productAppP0.activate())?.started===true};});
    assert.ok(after.started&&after.uid===actor.uid,'I66_LIVE_SIGNED_RELOAD_SESSION_HOLD_'+actor.role);
    assert.equal((await items('gestiones',management).get()).data()?.estado,'Resuelta');
    assert.equal((await items('negocios',business).get()).data()?.nombre,testName+' actualizada');
    assert.equal((await items('tareas',task).get()).data()?.done,true);
    assert.equal((await items('tareas',uiTaskId).get()).data()?.t,uiTaskTitle);
    await page.evaluate(()=>document.querySelector('#op-show-tasks')?.click());
    await page.waitForFunction(id=>!!document.querySelector('[aria-label="Tareas de agenda en Ops"] [data-ops-task-toggle="'+id+'"]'),
      task,{timeout:30000});
    await page.waitForFunction(id=>!!document.querySelector('[aria-label="Tareas de agenda en Ops"] [data-ops-task-toggle="'+id+'"]'),
      uiTaskId,{timeout:30000});
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_SIGNED_OPS_PLUS_TAREA_UI_RELOAD_VISIBILITY_PASS');
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_SIGNED_TASK_OPS_PROJECTION_AFTER_RELOAD_PASS');
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_OPS_LEADS_TASKS_AND_POLICIES_RENEWALS_COBROS_WRITE_RIGHTS_SIGNED_PASS');
  }finally{
    const failures=[];
    // Catch even a partially submitted UI task if a preceding assertion
    // failed before its generated ID could be added to the cleanup list.
    try{
      const extras=await items('tareas','_').parent.where('t','==',uiTaskTitle).limit(3).get();
      assert.ok(extras.size<3,'I66_LIVE_UI_TASK_CLEANUP_QUERY_LIMIT');
      for(const d of extras.docs){
        const x=d.data()||{};
        assert.match(d.id,/^tk\d{10,}$/);
        assert.equal(x.t,uiTaskTitle);
        assert.equal(x.ownerUid,actor.uid);
        assert.equal(x.tenantId,TENANT);
        assert.equal(x.pais,'GT');
        if(!targets.some(([c,id])=>c==='tareas'&&id===d.id))targets.push(['tareas',d.id]);
      }
    }catch(e){failures.push('ui_task_cleanup_preflight_'+String(e.code||'GUARD'));}
    // No deletion of real records: every cleanup ID is unpredictable, unique,
    // prefixed, preflight-absent and must retain the signed actor's provenance.
    for(const [c,id] of targets.slice().reverse())try{
      const ref=items(c,id),snap=await ref.get();if(!snap.exists)continue;
      const d=snap.data()||{};
      assert.equal(d.id,id);assert.equal(d.tenantId,TENANT);assert.equal(d.pais,'GT');
      assert.ok(c==='tareas'?d.__syntheticQa===true&&d.ownerUid===actor.uid:
        d.createdByUid===actor.uid&&!d.clienteId&&!d.polizaId,'I66_LIVE_QA_RECORD_PROVENANCE_NOT_VALID');
      await ref.delete({exists:true});assert.equal((await ref.get()).exists,false);
    }catch(e){failures.push('business_'+c+'_'+String(e.code||'GUARD'));}
    for(const [c,id,expectedEntity] of artifacts.slice().reverse())try{
      const ref=meta(c,id),snap=await ref.get();if(!snap.exists)continue;
      const d=snap.data()||{};
      assert.equal(c==='workflowRequests'?d.result?.entityId:d.entityId,expectedEntity);
      if(c==='workflowEvents')assert.equal(d.actor?.uid,actor.uid);
      if(c==='notificationOutbox')assert.equal(d.actorUid,actor.uid);
      await ref.delete({exists:true});assert.equal((await ref.get()).exists,false);
    }catch(e){failures.push('audit_'+c+'_'+String(e.code||'GUARD'));}
    await context.close();
    if(failures.length)throw Error('I66_LIVE_SYNTHETIC_RECOVERY_HOLD:'+failures.join(','));
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_ALL_SYNTHETIC_RECORDS_AND_WORKFLOW_SIDE_EFFECTS_RESTORED_PASS');
  }
}
(async()=>{
  const r=await fetch(LIVE+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
  assert.ok(r.ok);const marker=await r.json();
  assert.equal(marker.sourceSha,SHA,'I66_LIVE_EXACT_ARTIFACT_NOT_SERVED');
  const actors=await staff(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of actors)await actorUat(browser,actor);
    console.log('I66_LIVE_CARLOS_PAULA_SIGNED_SYNTHETIC_UAT_PASS real_customer_policy_payment_writes=0 auth_iam_rules_writes=0');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_LIVE_SIGNED_SYNTHETIC_UAT_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,180));process.exitCode=1;});
