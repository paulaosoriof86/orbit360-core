'use strict';
// Signed, exact-LIVE insurer account CRUD and audit scope UAT. Only unique,
// reversible QA insurer records; no production insurer, bank account or secret.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const SHA='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_INSURER_LIVE_ORIGIN_MISMATCH');
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(service,'I66_INSURER_AUTHORITY_UNAVAILABLE');
admin.initializeApp({credential:admin.credential.cert(service),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),root=db.collection('tenants').doc(TENANT);
const item=id=>root.collection('data').doc('aseguradoras').collection('items').doc(id);
const side=(c,id)=>root.collection(c).doc(id);
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');

async function actors(){
  const [members,advisors]=await Promise.all([root.collection('members').limit(150).get(),
    root.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_INSURER_IDENTITY_SCAN_BOUND');
  const find=(match,role)=>{
    const advisorIds=new Set(),uids=new Set();
    for(const d of advisors.docs){const a=d.data()||{};
      if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>match(norm(v)))){
        advisorIds.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));
      }
    }
    const rows=members.docs.filter(d=>{const m=d.data()||{};return(
      [m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(v=>match(norm(v)))||
        advisorIds.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&
      norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
      ['active','activo'].includes(norm(m.status||m.estado))&&
      [].concat(m.countries||m.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
    assert.equal(rows.length,1,'I66_INSURER_ACTOR_NOT_UNIQUE_'+role);
    return{uid:rows[0].id,role};
  };
  const result=[find(x=>x.startsWith('carlos castro'),'operativo'),
    find(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const a of result){const u=await auth.getUser(a.uid);
    assert.ok(!u.disabled&&u.emailVerified,'I66_INSURER_ACTOR_INACTIVE');
    a.token=await auth.createCustomToken(a.uid);
  }
  return result;
}

async function signedLive(browser,actor){
  const id='i66qa_asg_'+actor.role+'_'+suffix;
  const foreignId='i66qa_asg_denied_'+actor.role+'_'+suffix;
  const operations=['create','update','remove'].map(op=>({op,req:'i66qa_asg_'+op+'_'+actor.role+'_'+suffix}));
  const sideRecords=operations.flatMap(x=>[
    ['operationalRequests',x.req],['operationalEvents','opevt_'+hash(TENANT+'|'+x.req).slice(0,28)]]);
  const badReqs=['i66qa_asg_badrole_'+actor.role+'_'+suffix,'i66qa_asg_badcountry_'+actor.role+'_'+suffix];
  const context=await browser.newContext({viewport:{width:1280,height:880}});
  let page;
  try{
    assert.equal((await item(id).get()).exists,false,'I66_INSURER_QA_TARGET_EXISTS');
    assert.equal((await item(foreignId).get()).exists,false,'I66_INSURER_QA_FOREIGN_TARGET_EXISTS');
    for(const [c,key] of sideRecords)assert.equal((await side(c,key).get()).exists,false,'I66_INSURER_QA_SIDE_COLLISION');
    page=await context.newPage();
    await page.goto(ORIGIN+'/#/aseguradoras',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const login=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const state=await Orbit.productAppP0.activate();
      return{started:state?.started===true,role:String(Orbit.session?.rol?.()||''),
        preview:p.isI66PreviewHost(),access:Orbit.access?.can('aseguradoras','edit')};
    },actor.token);
    assert.ok(login.started&&!login.preview&&norm(login.role)===actor.role&&login.access,
      'I66_INSURER_SIGNED_EDIT_ACCESS_DENIED_'+actor.role);
    const command=async(x,role=actor.role)=>page.evaluate(async a=>
      Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360ProductOperationalCommand',a,'us-central1'),
      {tenantId:TENANT,activeRole:role,requestId:x.req,
        mutations:[{action:x.op,collection:'aseguradoras',id:x.id,payload:x.payload,auditReason:x.reason}]});
    const fixture={id,tenantId:TENANT,pais:'GT',moneda:'GTQ',nombre:'I6.6 QA reversible insurer '+actor.role,
      canonicalName:'I6.6 QA reversible insurer',activo:true,vinculada:true,estado:'Activa',
      ramos:['Auto'],portales:[],cuentas:[],contactos:[],docsRequeridos:[],__syntheticQa:true};
    const create=await command({op:'insert',id,payload:fixture,req:operations[0].req,reason:'Creación sintética QA'});
    assert.ok(create?.ok&&create.serverOwned,'I66_INSURER_LIVE_CREATE_NOT_COMMITTED_'+actor.role);
    const created=(await item(id).get()).data()||{};
    assert.equal(created.createdByUid,actor.uid,'I66_INSURER_LIVE_CREATE_ACTOR_NOT_PERSISTED');
    assert.ok(Array.isArray(created.actividad)&&created.actividad.length===1,
      'I66_INSURER_LIVE_CREATE_AUDIT_MISSING');
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;
      await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();});
    await page.waitForFunction(id=>!!window.Orbit?.store?.get?.('aseguradoras',id),id,{timeout:25000});
    const editUi=await page.evaluate(id=>{
      const a=Orbit.store.get('aseguradoras',id);
      const allowed=Orbit.access.canAccessRecord(a,'aseguradoras',{collection:'aseguradoras'});
      Orbit.modules.aseguradoras.ficha(id,true);
      const editable=!!document.querySelector('#asg-ficha #af-guardar');
      const logo=!!document.querySelector('#asg-ficha #af-logo-file');
      document.getElementById('asg-ficha')?.remove();
      return{allowed,editable,logo};
    },id);
    assert.ok(editUi.allowed&&editUi.editable&&editUi.logo,
      'I66_INSURER_SIGNED_CARLOS_PAULA_EDIT_FORM_NOT_AVAILABLE_'+actor.role);
    const accounts=[{id:'i66qa_account',banco:'Banco de prueba',tipo:'Monetaria',
      numero:'QA-ONLY-001234',moneda:'GTQ',titular:'I6.6 QA reversible'}];
    const patch={cuentas:accounts,observaciones:'Validación técnica reversible '+actor.role};
    const updated=await page.evaluate(async x=>Orbit.store.batchDurable([
      {action:'update',collection:'aseguradoras',id:x.id,payload:x.patch,auditReason:'QA reversible de escritura transversal Operativo y Dirección'}],
      {requestId:x.req,timeoutMs:25000}),{id,patch,req:operations[1].req});
    assert.ok(updated&&updated.ok!==false,'I66_INSURER_ACCOUNT_UPDATE_NOT_CONFIRMED_'+actor.role);
    const after=(await item(id).get()).data()||{};
    assert.equal(after.cuentas?.[0]?.numero,accounts[0].numero,'I66_INSURER_ACCOUNT_FIRESTORE_READBACK_FAIL');
    assert.equal(after.updatedByUid,actor.uid,'I66_INSURER_ACCOUNT_ACTOR_AUDIT_FAIL');
    assert.equal(after.actividad?.length,2,'I66_INSURER_ACTIVITY_APPEND_NOT_CONFIRMED');
    const uniqueEvents=new Set(after.actividad.map(x=>x.eventId));
    assert.equal(uniqueEvents.size,2,'I66_INSURER_ACTIVITY_DUPLICATE');
    // A role not assigned (or an assigned lower role) must never inherit this write.
    await assert.rejects(command({op:'update',id,payload:{observaciones:'NEGATIVE_SHOULD_NOT_APPLY'},
      req:badReqs[0],reason:'No elevation'},'Asesor'));
    assert.equal((await item(id).get()).data()?.observaciones,patch.observaciones,'I66_INSURER_ROLE_BYPASS');
    await assert.rejects(command({op:'insert',id:foreignId,payload:{
      id:foreignId,nombre:'NEGATIVE foreign insurer',pais:'SV',__syntheticQa:true},
      req:badReqs[1],reason:'Out of country'}));
    assert.equal((await item(foreignId).get()).exists,false,'I66_INSURER_FOREIGN_COUNTRY_BYPASS');
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;
      await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();});
    await page.waitForFunction(x=>window.Orbit?.store?.get?.('aseguradoras',x.id)?.cuentas?.[0]?.numero===x.numero,
      {id,numero:accounts[0].numero},{timeout:25000});
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_INSURER_CREATE_EDIT_ACCOUNT_AUDIT_RELOAD_ROLE_COUNTRY_NEGATIVE_PASS');
  }finally{
    const errors=[];
    const record=await item(id).get();
    if(record.exists){
      const row=record.data()||{};
      assert.equal(row.id,id);assert.equal(row.tenantId,TENANT);
      assert.equal(row.pais,'GT');assert.equal(row.__syntheticQa,true);
      assert.equal(row.createdByUid,actor.uid);
      // Only synthetic document explicitly created in this test can be removed.
      try{
        if(page){const rm=await page.evaluate(async x=>Orbit.productRuntimeBrowserProvidersP0.callFunction(
          'orbit360ProductOperationalCommand',x,'us-central1'),
          {tenantId:TENANT,activeRole:actor.role,requestId:operations[2].req,
            mutations:[{action:'remove',collection:'aseguradoras',id}]});
          assert.ok(rm?.ok,'I66_INSURER_SIGNED_REMOVE_NOT_CONFIRMED');}
        else await item(id).delete({exists:true});
      }catch(e){
        // Fail-safe QA-only cleanup, after exact actor/provenance checks.
        try{await item(id).delete({exists:true});}catch(cleanErr){errors.push('qa_record_'+String(cleanErr.code||'ERR'));}
        errors.push('signed_remove_'+String(e.code||'ERR'));
      }
    }
    if((await item(id).get()).exists)errors.push('qa_record_still_present');
    for(const [collection,key] of sideRecords)try{
      const ref=side(collection,key),snap=await ref.get();if(!snap.exists)continue;
      const row=snap.data()||{};
      if(collection==='operationalEvents')assert.equal(row.actorUid,actor.uid);
      else assert.equal(row.insurerActor?.uid,actor.uid);
      await ref.delete({exists:true});assert.equal((await ref.get()).exists,false);
    }catch(e){errors.push('qa_side_'+collection+'_'+String(e.code||'ERR'));}
    await context.close();
    if(errors.length)throw Error('I66_INSURER_QA_RESTORE_HOLD:'+errors.join(','));
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_INSURER_QA_RECORDS_AND_EVENTS_RESTORED_PASS');
  }
}

(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',
    {headers:{'cache-control':'no-cache'}}).then(x=>x.json());
  assert.equal(marker.sourceSha,SHA,'I66_INSURER_EXACT_LIVE_ARTIFACT_DRIFT');
  const staff=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const a of staff)await signedLive(browser,a);
    console.log('I66_CARLOS_PAULA_SIGNED_LIVE_INSURER_ACCOUNT_CRUD_AND_SCOPE_PASS real_insurer_writes=0 real_financial_writes=0 secure_credentials_unmodified=true');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_INSURER_SIGNED_LIVE_UAT_HOLD '+String(e.code||e.message||e).replace(/[^\w.:,-]+/g,'_').slice(0,180));process.exitCode=1;});
