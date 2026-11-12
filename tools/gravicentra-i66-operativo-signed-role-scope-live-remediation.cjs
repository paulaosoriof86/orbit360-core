'use strict';
// I6.6: Owner-authorized scoped configuration correction, not a source deploy.
// Only roleScopes[the already existing Operativo key] can change; all other
// roles, countries, memberships and business records are read-only.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const LIVE_SOURCE='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_ROLE_SCOPE_LIVE_ORIGIN_DENIED');
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(credential,'I66_ROLE_SCOPE_SIGNED_AUTH_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const configRef=tenant.collection('config').doc('access');
const fixtureId='i66qa_role_scope_'+Date.now().toString(36)+'_'+crypto.randomBytes(6).toString('hex');
const fixtureRef=tenant.collection('data').doc('gestiones').collection('items').doc(fixtureId);
const actorAdvisor='i66qa_foreign_advisor_not_live';
let browser,oldValue,key,changeAttempted=false,passed=false;

async function actor(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_STAFF_SCAN_BOUND');
  const keys=new Set(),uids=new Set();
  for(const d of advisors.docs){const x=d.data()||{};
    if([x.nombre,x.nombreCompleto,x.displayName,x.name].some(v=>norm(v).startsWith('carloscastro'))){
      keys.add(d.id);[x.authUid,x.uid,x.userId].filter(Boolean).forEach(v=>uids.add(String(v)));
    }
  }
  const matches=members.docs.filter(d=>{const m=d.data()||{};return(
    [m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(v=>norm(v).startsWith('carloscastro'))||
    keys.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&
    norm(m.activeRole)==='operativo'&&m.active!==false&&m.activo!==false&&
    ['active','activo'].includes(norm(m.status||m.estado))&&
    [].concat(m.countries||m.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
  assert.equal(matches.length,1,'I66_CARLOS_OPERATIVO_STAFF_AMBIGUOUS');
  const a=await auth.getUser(matches[0].id);
  assert.ok(!a.disabled&&a.emailVerified,'I66_CARLOS_AUTH_NOT_READY');
  return{uid:matches[0].id,token:await auth.createCustomToken(matches[0].id)};
}
async function change(next,expected){
  await db.runTransaction(async tx=>{
    const current=await tx.get(configRef);
    assert.ok(current.exists,'I66_ACCESS_CONFIG_MISSING');
    const rs=current.data()?.roleScopes||{};
    assert.equal(rs[key],expected,'I66_ROLE_SCOPE_CONCURRENT_CHANGE_HOLD');
    tx.update(configRef,new admin.firestore.FieldPath('roleScopes',key),next);
  },{maxAttempts:1});
  const result=(await configRef.get()).data()?.roleScopes||{};
  assert.equal(result[key],next,'I66_ROLE_SCOPE_READBACK_FAILED');
}
async function signedRead(staff){
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:840}});
  await page.goto(ORIGIN+'/#/ops',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,
    null,{timeout:30000});
  const result=await page.evaluate(async ({token,qaId})=>{
    const runtime=Orbit.productRuntimeBrowserProvidersP0;
    const ctx=await runtime.initialize();
    await ctx.modules.auth.setPersistence(ctx.auth,ctx.modules.auth.browserSessionPersistence);
    await ctx.modules.auth.signInWithCustomToken(ctx.auth,token);
    const app=await Orbit.productAppP0.activate();
    if(!app?.started)return{started:false};
    Orbit.store._ensureCollections(['gestiones','negocios','tareas']);
    let cursor='',scope='',found=false,pages=0;
    do{
      const result=await runtime.protectedReadPage({tenantId:'alianzas-soluciones',
        activeRole:Orbit.session.rol(),country:'GT',collection:'gestiones',mode:'list',pageSize:50,cursor});
      pages++;
      if(result.scope!==scope&&scope)throw Error('I66_ROLE_SCOPE_PAGES_INCONSISTENT');
      scope=result.scope;
      if((result.rows||[]).some(row=>row.canonicalDocumentId===qaId||row.id===qaId))found=true;
      cursor=result.nextCursor||'';
    }while(cursor&&pages<7);
    return{started:true,role:Orbit.session.rol(),source:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.version||'',
      scope,found,pages,hasMore:!!cursor,canOps:Orbit.access?.can('ops','edit'),
      canLeads:Orbit.access?.can('leads','edit'),
      canPolicy:Orbit.access?.can('polizas','edit'),
      canCobros:Orbit.access?.can('cobros','edit')};
  },{token:staff.token,qaId:fixtureId});
  assert.ok(result.started&&norm(result.role)==='operativo','I66_ROLE_SCOPE_SIGNED_SESSION_FAIL');
  assert.equal(result.scope,'all','I66_OPERATIVO_NOT_PORTFOLIO_ALL');
  assert.ok(result.found&&!result.hasMore,'I66_CROSS_ADVISOR_GESTION_NOT_VISIBLE');
  assert.ok(result.canOps&&result.canLeads&&result.canPolicy&&result.canCobros,
    'I66_CARLOS_APPROVED_MODULE_WRITE_ACTION_HIDDEN');
  await page.waitForFunction(qaId=>{
    const st=Orbit.store?._productStatus?.()||{};
    return st.serverConfirmedCollections?.includes('gestiones')&&!!Orbit.store.get('gestiones',qaId);
  },fixtureId,{timeout:30000});
  const clientRead=await page.evaluate(qaId=>{
    const s=Orbit.store._productStatus();return{found:!!Orbit.store.get('gestiones',qaId),
      scope:s.queryPlans?.gestiones?.scope,confirmed:s.serverConfirmedCollections?.includes('gestiones')};
  },fixtureId);
  assert.equal(clientRead.found,true,'I66_CROSS_ADVISOR_OPS_UI_PROJECTION_MISSING');
  assert.equal(clientRead.confirmed,true,'I66_CROSS_ADVISOR_SERVER_SNAPSHOT_NOT_CONFIRMED');
  console.log('I66_CARLOS_SIGNED_LIVE_CROSS_ADVISOR_OPS_SERVER_AND_UI_SCOPE_ALL_PASS '+JSON.stringify({
    role:result.role,source:LIVE_SOURCE,pages:result.pages,serverScope:result.scope,
    uiScope:clientRead.scope||'unspecified',modules:['Ops','Leads','Polizas','Cobros']}));
  const denied=await page.evaluate(async()=>{
    try{await Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({tenantId:'different-tenant',
      activeRole:'Operativo',country:'GT',collection:'gestiones',pageSize:50});return false;}
    catch(e){return true;}
  });
  assert.equal(denied,true,'I66_CROSS_TENANT_READ_MUST_DENY');
  console.log('I66_CARLOS_SIGNED_LIVE_CROSS_TENANT_DENY_PASS');
}
async function main(){
  const b=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(b.sourceSha,LIVE_SOURCE,'I66_ROLE_SCOPE_LIVE_SOURCE_CHANGED');
  const previous=await configRef.get();assert.ok(previous.exists,'I66_ACCESS_CONFIG_ABSENT');
  const rs=previous.data()?.roleScopes||{};
  const keys=Object.keys(rs).filter(k=>norm(k)==='operativo');
  assert.equal(keys.length,1,'I66_OPERATIVO_ROLE_SCOPE_KEY_NOT_UNIQUE');key=keys[0];oldValue=rs[key];
  assert.ok(['own','propios','propio','team','equipo','all','todos'].includes(String(oldValue).toLowerCase()),
    'I66_OPERATIVO_ROLE_SCOPE_EXPLICIT_DENY_OR_UNKNOWN_HOLD');
  const staff=await actor();
  console.log('I66_ROLE_SCOPE_PRE_READBACK_PASS '+JSON.stringify({scope:oldValue,existingKey:key,
    constrainedToCurrentTenant:true,memberVerified:true,liveSource:LIVE_SOURCE}));
  assert.equal((await fixtureRef.get()).exists,false,'I66_QA_FIXTURE_COLLISION');
  await fixtureRef.create({id:fixtureId,tenantId:TENANT,pais:'GT',moneda:'GTQ',
    titulo:'I6.6 QA signed cross-advisor scope temporary only',tipo:'Renovación',lista:'Renovaciones / Modif',
    asesorId:actorAdvisor,estado:'Pendiente',__syntheticQa:true});
  try{
    if(!['all','todos'].includes(String(oldValue).toLowerCase())){
      changeAttempted=true;
      await change('all',oldValue);
      console.log('I66_OPERATIVO_CONFIG_SCOPE_TRANSITION_OWN_TO_ALL_LIVE_READBACK_PASS');
    }
    await signedRead(staff);
    passed=true;
  }finally{
    let cleanupError=null;
    try{
      if(browser)await browser.close();
      const snap=await fixtureRef.get();if(snap.exists){
        const row=snap.data()||{};
        assert.ok(row.__syntheticQa===true&&row.id===fixtureId&&row.tenantId===TENANT,
          'I66_QA_FIXTURE_UNEXPECTED_CONTENT_STOP');
        await fixtureRef.delete({exists:true});
      }
      assert.equal((await fixtureRef.get()).exists,false,'I66_QA_FIXTURE_RESTORE_FAILED');
      console.log('I66_ROLE_SCOPE_QA_SYNTHETIC_GESTION_REMOVED_PASS');
    }catch(e){cleanupError=e;passed=false;}
    // Rollback cannot be bypassed by a failed cleanup or by an exception
    // after the Firestore CAS write but before the succeeding readback.
    if(changeAttempted&&!passed){
      const rs=(await configRef.get()).data()?.roleScopes||{};
      if(rs[key]==='all')await change(oldValue,'all');
      else assert.equal(rs[key],oldValue,'I66_ROLE_SCOPE_CONCURRENT_CHANGE_ROLLBACK_STOP');
      console.log('I66_ROLE_SCOPE_LIVE_CONFIG_ROLLBACK_TO_BEFORE_PASS');
    }
    if(cleanupError)throw cleanupError;
  }
  assert.equal(passed,true);
  console.log('I66_OPERATIVO_CARLOS_ROLE_WIDE_SCOPE_LIVE_ACCEPTED_NO_REAL_BUSINESS_DATA_WRITES');
}
main().catch(e=>{console.error('I66_ROLE_SCOPE_HOLD '+String(e.code||e.message||'unknown').slice(0,160));process.exitCode=1;});
