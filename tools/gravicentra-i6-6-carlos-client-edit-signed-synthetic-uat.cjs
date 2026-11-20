'use strict';
// Existing I6.6 signed role regression: real Carlos session, synthetic client only.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN=process.env.I66_SIGNED_CLIENT_EDIT_ORIGIN,SOURCE=process.env.I66_SIGNED_CLIENT_EDIT_SOURCE;
const TENANT='alianzas-soluciones',LIVE=ORIGIN==='https://app.aysseguros.com';
assert.ok(/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app$/.test(ORIGIN||'')||LIVE,'QA_ORIGIN_UNAUTHORIZED');
assert.match(SOURCE||'',/^[a-f0-9]{40}$/);
const secrets=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
 .filter(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(secrets.length,'QA_NO_EXISTING_PROJECT_AUTH');
admin.initializeApp({credential:admin.credential.cert(secrets[0]),projectId:'ays-orbit-360-lab'});
const root=admin.firestore().collection('tenants').doc(TENANT),col=n=>root.collection('data').doc(n).collection('items');
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');
(async()=>{
 const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
 assert.equal(marker.sourceSha,SOURCE,'QA_EXACT_ARTIFACT_SOURCE_DRIFT');
 const [members,advisors]=await Promise.all([root.collection('members').limit(160).get(),col('asesores').limit(450).get()]);
 assert.ok(members.size<160&&advisors.size<450,'QA_STAFF_CENSUS_UNBOUNDED');
 const german=advisors.docs.filter(d=>[d.data().nombre,d.data().displayName,d.data().name].some(n=>norm(n).includes('german')&&norm(n).includes('reyes')));
 const paula=advisors.docs.filter(d=>[d.data().nombre,d.data().displayName,d.data().name].some(n=>norm(n).includes('paula')&&norm(n).includes('osorio')));
 assert.equal(german.length,1,'QA_GERMAN_CANONICAL_IDENTITY_AMBIGUOUS');
 assert.equal(paula.length,1,'QA_PAULA_CANONICAL_ADVISOR_AMBIGUOUS');
 const actors=[{role:'operativo',name:'carlos castro'},{role:'direccion',name:'paula osorio'}];
 const matchesStaff=(row,part)=>{
   return [row.nombre,row.nombreCompleto,row.displayName,row.name,row.fullName].some(x=>norm(x).startsWith(part));
 };
 const membersForActor=a=>{
   const linkedAdvisors=advisors.docs.filter(d=>matchesStaff(d.data()||{},a.name));
   const advisorIds=new Set(linkedAdvisors.map(d=>d.id));
   const actorUids=new Set(linkedAdvisors.flatMap(d=>[d.data()?.authUid,d.data()?.uid,d.data()?.userId].filter(Boolean).map(String)));
   return members.docs.filter(d=>{
      const row=d.data()||{};
      const matches=matchesStaff(row,a.name)||
        advisorIds.has(String(row.advisorId||row.asesorId||''))||actorUids.has(d.id);
      const active=norm(row.activeRole)===a.role&&row.active!==false&&row.activo!==false&&
        [].concat(row.countries||[]).map(String).includes('GT');
      return matches&&active;
   });
 };
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const a of actors){
   const member=membersForActor(a);
   assert.equal(member.length,1,'QA_SIGNED_MEMBER_AMBIGUOUS_'+a.role);
   const user=await admin.auth().getUser(member[0].id);assert.ok(!user.disabled&&user.emailVerified);
   const token=await admin.auth().createCustomToken(member[0].id);
   const id='b4003qa_edit_'+a.role+'_'+suffix,client=col('clientes').doc(id),beforePhone='50000000',afterPhone='50000001';
   assert.equal((await client.get()).exists,false,'QA_CLIENT_ID_COLLISION');
   await client.create({id,tenantId:TENANT,pais:'GT',nombre:'QA I6.6 Cliente edit no real',tipo:'Persona',telefono:beforePhone,
     asesorId:paula[0].id,segmento:'Nuevo',canal:'Referido',__syntheticQa:true});
   const ctx=await browser.newContext({viewport:{width:1280,height:900}});
   let matching=[],qaStage='create-browser-page',page=null,saveWarnings=[];
   try{
    page=await ctx.newPage();
    page.on('response',async response=>{
      const url=new URL(response.url());
      if(!url.hostname.endsWith('.cloudfunctions.net')||!url.pathname.includes('ProductOperationalCommand')||response.request().method()!=='POST')return;
      const body=await response.json().catch(()=>null);
      const message=body?.error?.message;
      const reason=message==='Preview operativo requiere marca sintética explícita.'?'MISSING_SYNTHETIC_MARKER':
        message==='Preview operativo solo admite fixtures sintéticos autorizados B3-004/B4-003.'?'INVALID_SYNTHETIC_ID':'OTHER';
      console.log('I66_CLIENT_EDIT_CALLABLE http='+response.status()+' reason='+reason);
    });
    page.on('console',m=>{const s=m.text();if(s.includes('DURABLE_CLIENT_EDIT_HOLD'))saveWarnings.push(s.slice(0,420));});
    page.on('dialog',async d=>{if(d.type()==='prompt')await d.accept('QA I6.6 cambio operativo verificado');else await d.dismiss();});
    qaStage='navigate-cliente360';
    await page.goto(ORIGIN+'/#/cliente360',{waitUntil:'commit',timeout:30000});
    qaStage='await-runtime-exports';
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    qaStage='authenticate-real-member';
    const authState=await page.evaluate(async token=>{
     const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
     await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
     await c.modules.auth.signInWithCustomToken(c.auth,token);
     const result=await Orbit.productAppP0.activate();
     return{started:result?.started,role:Orbit.session?.rol?.()};
    },token);
    assert.ok(authState.started&&norm(authState.role)===a.role,'QA_ACTOR_ROLE_NOT_SIGNED');
    await page.evaluate(async()=>{await Orbit.store._ensureCollections(['clientes','actividades']);});
    qaStage='await-synthetic-client-hydration';
    await page.waitForFunction(id=>!!Orbit.store?.get?.('clientes',id),id,{timeout:30000});
    await page.evaluate(id=>Orbit.modules.cliente360.edit(id),id);
    qaStage='await-current-country-advisor-roster';
    await page.waitForFunction(()=>{const s=document.querySelector('#ce-ase');return s&&s.dataset.rosterState==='ready'&&!s.disabled;},null,{timeout:30000});
    const ready=await page.evaluate(({advisorId,phone})=>{
      const modal=document.querySelector('#c360-edit'),sel=modal?.querySelector('#ce-ase'),tel=modal?.querySelector('#ce-tel');
      const option=sel&&[...sel.options].find(o=>o.value===advisorId);
      if(!option||!tel)return{ready:false,reason:'missing_advisor_or_phone'};
      sel.value=advisorId;sel.dispatchEvent(new Event('change',{bubbles:true}));
      tel.value=phone;tel.dispatchEvent(new Event('input',{bubbles:true}));
      modal.querySelector('#ce-save').click();
      return{ready:true};
    },{advisorId:german[0].id,phone:afterPhone});
    assert.ok(ready.ready,'QA_CLIENT_EDITOR_NOT_OPERABLE');
    qaStage='await-commit-and-modal-close';
    await page.waitForFunction(()=>!document.querySelector('#c360-edit'),null,{timeout:30000});
    const row=await client.get();assert.equal(row.data()?.telefono,afterPhone,'QA_CLIENT_PHONE_NOT_PERSISTED_'+a.role);
    assert.equal(row.data()?.asesorId,german[0].id,'QA_CLIENT_ADVISOR_NOT_PERSISTED_'+a.role);
    const activities=await col('actividades').where('clienteId','==',id).limit(6).get();
    assert.equal(activities.size,1,'QA_ACTIVITY_NOT_EXACTLY_ONCE_'+a.role);
    matching=activities.docs;
    const activity=activities.docs[0].data();
    assert.equal(activity.pais,'GT');assert.equal(activity.asesorId,german[0].id);
    assert.ok(activity.detalle?.includes('QA I6.6 cambio operativo verificado'),'QA_REASON_NOT_PERSISTED');
    qaStage='reload-after-commit';
    await page.reload({waitUntil:'commit',timeout:30000});
    qaStage='await-runtime-after-reload';
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
    // Physical Firestore readback before/after reload is independent of local cache.
    const reloaded=await client.get();assert.equal(reloaded.data()?.telefono,afterPhone);
    console.log('I66_'+a.role.toUpperCase()+'_SIGNED_CLIENT_EDIT_PHONE_ADVISOR_ACTIVITY_COUNTRY_ATOMIC_LIVE_OR_PREVIEW_PASS source='+SOURCE.slice(0,12));
   }catch(e){
    let diagnostic={};
    try{diagnostic=await page?.evaluate(()=>({readyState:document.readyState,hasOrbit:!!window.Orbit,hasProviders:!!window.Orbit?.productRuntimeBrowserProvidersP0,hasProductApp:!!window.Orbit?.productAppP0,hasStore:!!window.Orbit?.store,editorOpen:!!document.querySelector('#c360-edit'),rosterState:document.querySelector('#ce-ase')?.dataset.rosterState||null,saveDisabled:!!document.querySelector('#ce-save')?.disabled,saveLabel:document.querySelector('#ce-save')?.textContent?.slice(0,64)||'',visibleToasts:[...document.querySelectorAll('.ciclo-toast')].map(e=>e.textContent.slice(0,180))}));}catch{}
    try{const persisted=await client.get();diagnostic.syntheticPresent=persisted.exists;diagnostic.phoneChanged=!!persisted.exists&&persisted.data()?.telefono===afterPhone;diagnostic.advisorChanged=!!persisted.exists&&persisted.data()?.asesorId===german[0].id;diagnostic.activityCount=(await col('actividades').where('clienteId','==',id).limit(6).get()).size;}catch{}
    console.error('I66_SIGNED_CLIENT_EDIT_STAGE_HOLD '+JSON.stringify({role:a.role,stage:qaStage,diagnostic,saveWarnings}).slice(0,1350));
    throw e;
   }finally{
    const found=await col('actividades').where('clienteId','==',id).limit(10).get();
    assert.ok(found.size<10,'QA_ACTIVITY_RESTORE_UNBOUNDED');
    for(const doc of found.docs){
      const row=doc.data()||{};
      assert.ok(doc.id.startsWith('act_cli_edit_'+id+'_')&&row.clienteId===id&&row.pais==='GT'&&row.tenantId===TENANT,'QA_ACTIVITY_RESTORE_NOT_CANONICAL');
      await doc.ref.delete({lastUpdateTime:doc.updateTime});
    }
    const persisted=await client.get();
    if(persisted.exists){assert.equal(persisted.data()?.__syntheticQa,true,'QA_CLIENT_RESTORE_NOT_SYNTHETIC');await client.delete({lastUpdateTime:persisted.updateTime});}
    await ctx.close();
    assert.equal((await client.get()).exists,false,'QA_CLIENT_LEFT_BEHIND');
    assert.equal((await col('actividades').where('clienteId','==',id).limit(1).get()).size,0,'QA_ACTIVITY_LEFT_BEHIND');
   }
  }
 }finally{await browser.close();}
 console.log('I66_CARLOS_PAULA_SIGNED_CLIENT_EDIT_E2E_PASS realCustomerWrites=0 syntheticRestored=true');
})().catch(e=>{console.error('I66_SIGNED_CLIENT_EDIT_HOLD '+String(e?.message||e).slice(0,400));process.exitCode=1;}).finally(()=>admin.app().delete());
