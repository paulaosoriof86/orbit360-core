'use strict';
// Exact I6.6 Preview only: signed Carlos and Direccion, no write requests.
// A deliberately nonexistent management must first trigger protected source
// loading, then fail closed on missing management, never on deferred timeout.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN=String(process.env.I66_PREVIEW_ORIGIN||'');
const LIVE=process.env.I66_SIGNED_TEST_LIVE==='true';
const SOURCE=String(process.env.I66_SOURCE_SHA||'');
const TENANT='alianzas-soluciones';
assert.match(SOURCE,/^[a-f0-9]{40}$/);
assert.match(ORIGIN,LIVE ? /^https:\/\/app\.aysseguros\.com$/ : /^https:\/\/ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/);
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(credential,'I66_PREVIEW_SIGNED_READONLY_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const tenant=admin.firestore().collection('tenants').doc(TENANT);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').trim();
async function actors(){
  const [members,advisors]=await Promise.all([
    tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()
  ]);
  assert.ok(members.size<150&&advisors.size<400,'I66_PREVIEW_STAFF_BOUND');
  const choose=(matchesName,role)=>{
    const aliasIds=new Set(),userIds=new Set();
    for(const d of advisors.docs){const a=d.data()||{};
      if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>matchesName(norm(x)))){
        aliasIds.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>userIds.add(String(x)));
      }
    }
    const list=members.docs.filter(d=>{const m=d.data()||{};
      return ([m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(x=>matchesName(norm(x)))||
        aliasIds.has(String(m.advisorId||m.asesorId||''))||userIds.has(d.id))&&
        norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
        ['active','activo'].includes(norm(m.status||m.estado))&&
        [].concat(m.countries||m.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
    assert.equal(list.length,1,'I66_PREVIEW_STAFF_AMBIGUOUS_'+role);
    return {uid:list[0].id,role};
  };
  const staff=[choose(x=>x.startsWith('carlos castro'),'operativo'),
    choose(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
  for(const s of staff){const u=await admin.auth().getUser(s.uid);
    assert.ok(!u.disabled&&u.emailVerified);s.token=await admin.auth().createCustomToken(s.uid);}
  return staff;
}
async function checkActor(browser,a){
  const ctx=await browser.newContext({viewport:{width:1280,height:820}});
  try{
    const page=await ctx.newPage();
    await page.goto(ORIGIN+'/#/inicio',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&
      !!window.Orbit?.productAppP0&&!!window.Orbit?.issuance,null,{timeout:30000});
    const role=await page.evaluate(async token=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0;
      const c=await provider.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const started=await Orbit.productAppP0.activate();
      return {started:started?.started===true,preview:provider.isI66PreviewHost(),
        role:Orbit.session?.rol?.(),canManage:Orbit.issuance.canManage()};
    },a.token);
    assert.ok(role.started&&(LIVE?!role.preview:role.preview)&&norm(role.role)===a.role&&role.canManage,
      'I66_PREVIEW_AUTH_OR_ROLE_INCOMPLETE_'+a.role);
    const evaluation=await page.evaluate(async managementId=>{
      const store=Orbit.store;
      const before=store._productStatus(),requests=[];
      const original=store._ensureCollections;
      store._ensureCollections=function(names){requests.push([].concat(names));return original.call(this,names);};
      try{
        const result=await Orbit.issuance.createDirectRenewal(managementId,{},
          {operationId:'qa_no_write_missing_management'});
        const after=store._productStatus();
        return {errors:[].concat(result.errors||[]),requests,
          deferred:before.fullHydrationDeferred===true,
          confirmed:[].concat(after.serverConfirmedCollections||[]),
          denied:[].concat(after.deniedCollections||[]),
          snapshotErrors:after.snapshotErrors||{},pageErrors:[]};
      }finally{store._ensureCollections=original;}
    },'i66qa_missing_management_'+crypto.randomBytes(8).toString('hex'));
    assert.equal(evaluation.deferred,true,'I66_PREVIEW_DEFERRED_PRECONDITION_NOT_OBSERVED');
    assert.deepEqual(evaluation.requests[0],['gestiones','polizas','vehiculos','clientes'],
      'I66_PREVIEW_DIRECT_RENEWAL_DID_NOT_REQUEST_AUTHORITATIVE_SOURCES');
    assert.ok(evaluation.errors.includes('gestion_renovacion_aceptada_no_encontrada'),
      'I66_PREVIEW_MISSING_MANAGEMENT_NOT_FAIL_CLOSED_'+evaluation.errors.join(','));
    for(const coll of evaluation.requests[0]){
      assert.ok(evaluation.confirmed.includes(coll),'I66_PREVIEW_SOURCE_UNCONFIRMED_'+coll);
      assert.ok(!evaluation.denied.includes(coll)&&!evaluation.snapshotErrors[coll],
        'I66_PREVIEW_SOURCE_FAILED_'+coll);
    }
    console.log('I66_'+a.role.toUpperCase()+'_SIGNED_'+(LIVE?'LIVE':'PREVIEW')+'_DIRECT_RENEWAL_EXPLICIT_HYDRATION_PASS collections=4 no_writes=true');
  }finally{await ctx.close();}
}
(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
  assert.equal(marker.ok,true,'I66_PREVIEW_BUILD_MARKER_NOT_FOUND');
  assert.equal((await marker.json()).sourceSha,SOURCE,'I66_PREVIEW_SOURCE_DRIFT');
  const staff=await actors();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const actor of staff)await checkActor(browser,actor);}
  finally{await browser.close();}
  console.log('I66_SIGNED_'+(LIVE?'LIVE':'PREVIEW')+'_CARLOS_AND_DIRECTION_DIRECT_RENEWAL_HYDRATION_READONLY_PASS real_customer_writes=0 legal_acceptance_changes=0');
})().catch(e=>{console.error('I66_'+(LIVE?'LIVE':'PREVIEW')+'_DIRECT_RENEWAL_HYDRATION_HOLD '+
  String(e.code||e.message||e).replace(/[^a-zA-Z0-9_:.\/-]+/g,'_').slice(0,220));process.exitCode=1;});
