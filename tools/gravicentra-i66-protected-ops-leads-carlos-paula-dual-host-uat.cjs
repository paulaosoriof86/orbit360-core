'use strict';
// Same signed UAT bytes for Preview then LIVE of the identical scoped reader.
// The two synthetic rows are never associated with customers or policies.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN=String(process.env.I66_SIGNED_READER_ORIGIN||'');
const EXPECTED=String(process.env.I66_SIGNED_READER_MODE||'');
const LIVE_SHA='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
assert.ok(EXPECTED==='preview'||EXPECTED==='live','I66_READER_ENVIRONMENT_MODE_MISSING');
assert.ok(EXPECTED==='live'?ORIGIN==='https://app.aysseguros.com':
  /^https:\/\/ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/.test(ORIGIN),
  'I66_READER_HOST_NOT_ALLOWED');
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(v=>{try{return JSON.parse(v);}catch{return null;}})
  .find(v=>v?.type==='service_account'&&v.project_id==='ays-orbit-360-lab'&&v.private_key);
assert.ok(service,'I66_READER_SIGNED_TEST_AUTHORITY_MISSING');
admin.initializeApp({credential:admin.credential.cert(service),projectId:'ays-orbit-360-lab'});
const db=admin.firestore(),auth=admin.auth(),TENANT='alianzas-soluciones';
const tenant=db.collection('tenants').doc(TENANT);
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const id='i66qa_reader_'+Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex');
const ids={gestiones:id+'_ops',negocios:id+'_lead'};
const ref=(c)=>tenant.collection('data').doc(c).collection('items').doc(ids[c]);
async function actors(){
  const [ms,as]=await Promise.all([tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(ms.size<150&&as.size<400,'I66_STAFF_BOUND');
  const matchesFor=(predicate,role)=>{
    const advisorIds=new Set(),uids=new Set();
    for(const d of as.docs){const x=d.data()||{};
      if([x.nombre,x.nombreCompleto,x.displayName,x.name].some(v=>predicate(norm(v)))){
        advisorIds.add(d.id);[x.authUid,x.uid,x.userId].filter(Boolean).forEach(v=>uids.add(String(v)));
      }
    }
    const found=ms.docs.filter(d=>{const m=d.data()||{};return (
      [m.nombre,m.nombreCompleto,m.name,m.displayName,m.fullName].some(v=>predicate(norm(v)))||
      advisorIds.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id))&&
      norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
      ['active','activo'].includes(norm(m.status||m.estado))&&
      [].concat(m.countries||m.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
    assert.equal(found.length,1,'I66_ROLE_STAFF_AMBIGUITY_'+role);
    return{uid:found[0].id,role};
  };
  const out=[matchesFor(v=>v.startsWith('carloscastro'),'operativo'),
    matchesFor(v=>v.includes('paula')&&v.includes('osorio'),'direccion')];
  for(const a of out){const u=await auth.getUser(a.uid);
    assert.ok(!u.disabled&&u.emailVerified,'I66_ROLE_USER_UNVERIFIED');
    a.token=await auth.createCustomToken(a.uid);}
  return out;
}
async function signedOne(browser,actor){
  const context=await browser.newContext({viewport:{width:1280,height:840}});
  try{
    const page=await context.newPage();
    await page.goto(ORIGIN+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,
      null,{timeout:30000});
    const actual=await page.evaluate(async data=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();
      await ctx.modules.auth.setPersistence(ctx.auth,ctx.modules.auth.browserSessionPersistence);
      await ctx.modules.auth.signInWithCustomToken(ctx.auth,data.token);
      const a=await Orbit.productAppP0.activate();
      const mode=p.protectedHostMode(),role=Orbit.session?.rol?.();
      if(!a?.started)return{started:false,mode,role};
      Orbit.store._ensureCollections(['gestiones','negocios']);
      const results={};
      for(const c of ['gestiones','negocios']){
        let cursor='',found=false,scope='',pageCount=0;
        do{
          const r=await p.protectedReadPage({tenantId:'alianzas-soluciones',activeRole:role,
            country:'GT',collection:c,mode:'list',pageSize:50,cursor});
          pageCount++;
          if(scope&&scope!==r.scope)throw Error('I66_READER_PAGE_SCOPE_CHANGED');
          scope=r.scope;
          if((r.rows||[]).some(v=>v.id===data.ids[c]||v.canonicalDocumentId===data.ids[c]))found=true;
          cursor=r.nextCursor||'';
        }while(cursor&&pageCount<7);
        results[c]={found,scope,pageCount,hasMore:!!cursor};
      }
      let denied=false;
      try{await p.protectedReadPage({tenantId:'other-tenant',activeRole:role,
        country:'GT',collection:'gestiones',pageSize:50});}
      catch(_){denied=true;}
      return{started:true,mode,role,results,denied,
        canOps:Orbit.access?.can('ops','edit'),canLeads:Orbit.access?.can('leads','edit'),
        canPolicy:Orbit.access?.can('polizas','edit'),canCobros:Orbit.access?.can('cobros','edit')};
    },{token:actor.token,ids});
    assert.equal(actual.started,true,'I66_PROTECTED_SIGNED_BOOTSTRAP_NOT_READY');
    assert.equal(actual.mode,EXPECTED,'I66_PROTECTED_READER_WRONG_HOST_FUNCTION');
    assert.equal(norm(actual.role),actor.role,'I66_PROTECTED_READER_ROLE_MISMATCH');
    for(const c of ['gestiones','negocios']){
      assert.equal(actual.results?.[c]?.scope,'all','I66_PROTECTED_READER_NOT_ALL_'+c);
      assert.equal(actual.results?.[c]?.found,true,'I66_PROTECTED_READER_CROSS_ADVISOR_MISSING_'+c);
      assert.equal(actual.results?.[c]?.hasMore,false,'I66_READER_INCOMPLETE_PAGINATION_'+c);
    }
    assert.equal(actual.denied,true,'I66_PROTECTED_READER_FOREIGN_TENANT_LEAK');
    assert.ok(actual.canOps&&actual.canLeads&&actual.canPolicy&&actual.canCobros,
      'I66_PROTECTED_READER_APPROVED_ACTION_HIDDEN');
    await page.waitForFunction(i=>{
      const s=Orbit.store?._productStatus?.()||{};
      return ['gestiones','negocios'].every(c=>s.serverConfirmedCollections?.includes(c)&&
        !!Orbit.store.get(c,i[c]));
    },ids,{timeout:30000});
    console.log('I66_READER_'+EXPECTED.toUpperCase()+'_'+actor.role.toUpperCase()+
      '_SIGNATURE_SERVER_AND_UI_OPS_LEADS_CROSS_ADVISOR_SCOPE_ALL_COUNTRY_TENANT_DENIAL_PASS '+
      JSON.stringify({gestionesPages:actual.results.gestiones.pageCount,negociosPages:actual.results.negocios.pageCount}));
  }finally{await context.close();}
}
async function main(){
  const b=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(b.sourceSha,LIVE_SHA,'I66_READER_HOST_FRONTEND_SOURCE_DRIFT');
  const people=await actors();
  const rows=[
    ['gestiones',{id:ids.gestiones,tenantId:TENANT,pais:'GT',moneda:'GTQ',
      asesorId:'i66qa_foreign_no_real_advisor',titulo:'I6.6 QA scoped management',
      tipo:'Renovación',lista:'Renovaciones / Modif',estado:'Pendiente',__syntheticQa:true}],
    ['negocios',{id:ids.negocios,tenantId:TENANT,pais:'GT',moneda:'GTQ',
      asesorId:'i66qa_foreign_no_real_advisor',titulo:'I6.6 QA scoped lead',
      etapa:'nuevo',estado:'Pendiente',__syntheticQa:true}]];
  for(const [c] of rows)assert.equal((await ref(c).get()).exists,false,'I66_QA_FIXTURE_COLLISION');
  let browser=null;
  try{
    for(const [c,row] of rows)await ref(c).create(row);
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const person of people)await signedOne(browser,person);
  }finally{
    if(browser)await browser.close();
    const errors=[];
    for(const [c] of rows)try{
      const snap=await ref(c).get();if(snap.exists){const d=snap.data()||{};
        assert.ok(d.id===ids[c]&&d.tenantId===TENANT&&d.__syntheticQa===true,
          'I66_READER_QA_UNEXPECTED_ROW_STOP');
        await ref(c).delete({exists:true});
      }
      assert.equal((await ref(c).get()).exists,false,'I66_READER_QA_CLEANUP_INCOMPLETE');
    }catch(e){errors.push(c+'_'+String(e.code||e.message||'error').slice(0,70));}
    assert.equal(errors.length,0,'I66_READER_QA_ROLLBACK_HOLD_'+errors.join('|'));
    console.log('I66_READER_'+EXPECTED.toUpperCase()+'_SYNTHETIC_BOTH_ROWS_REMOVED_NO_REAL_DATA_WRITES_PASS');
  }
  console.log('I66_READER_'+EXPECTED.toUpperCase()+'_CARLOS_PAULA_SIGNED_CROSS_ADVISOR_LIVE_PARITY_GATE_PASS');
}
main().catch(e=>{console.error('I66_PROTECTED_READER_SIGNED_UAT_HOLD '+String(e?.message||e).slice(0,220));process.exitCode=1;});
