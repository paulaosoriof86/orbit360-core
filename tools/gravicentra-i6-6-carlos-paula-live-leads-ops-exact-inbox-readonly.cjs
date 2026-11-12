'use strict';
// Signed LIVE real membership readback only: compare exact authorized Leads
// handoff event IDs with the Ops incoming projection and shared inbox state.
// Never create synthetic notices on LIVE, avoiding outbound team notifications.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const SOURCE='1dd675ed59ac51fd122915ca8056f85f82fa12d6';
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cert=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean).map(x=>{try{return JSON.parse(x)}catch{return null}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(cert,'I66_READONLY_INBOX_CURRENT_CONFIGURED_AUTHORITY_REQUIRED');
admin.initializeApp({credential:admin.credential.cert(cert),projectId:'ays-orbit-360-lab'});
const auth=admin.auth(),db=admin.firestore(),tenant=db.collection('tenants').doc(TENANT);
async function actors(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),tenant.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400);
  function find(match,role){
    const ids=new Set(),uids=new Set();for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>match(norm(v)))){
      ids.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(v=>uids.add(String(v)));
    }}
    const found=members.docs.filter(d=>{const x=d.data()||{};return (
      [x.nombre,x.displayName,x.name,x.nombreCompleto,x.fullName].some(v=>match(norm(v)))||
      ids.has(String(x.advisorId||x.asesorId||''))||uids.has(d.id))&&norm(x.activeRole)===role&&
      x.active!==false&&x.activo!==false&&['active','activo'].includes(norm(x.status||x.estado))&&
      [].concat(x.countries||x.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');
    });
    assert.equal(found.length,1,'I66_SIGNED_INBOX_ACTOR_NOT_UNIQUE_'+role);return{uid:found[0].id,role};
  }
  const rows=[find(v=>v.startsWith('carlos castro'),'operativo'),find(v=>v.includes('paula')&&v.includes('osorio'),'direccion')];
  for(const a of rows){const user=await auth.getUser(a.uid);assert.ok(!user.disabled&&user.emailVerified);a.token=await auth.createCustomToken(a.uid);}return rows;
}
async function read(browser,actor){
  const ctx=await browser.newContext({viewport:{width:1360,height:900}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,80)));
  try{
    await page.goto(ORIGIN+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const start=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,provider=await p.initialize();
      await provider.modules.auth.setPersistence(provider.auth,provider.modules.auth.browserSessionPersistence);
      await provider.modules.auth.signInWithCustomToken(provider.auth,token);
      const a=await Orbit.productAppP0.activate();
      location.hash='#/ops';
      return{started:a?.started===true,uid:(await p.waitForUser())?.uid,role:String(Orbit.session?.rol?.()||''),preview:p.isI66PreviewHost()};
    },actor.token);
    assert.ok(start.started&&!start.preview&&start.uid===actor.uid&&norm(start.role).includes(actor.role),'I66_LIVE_INBOX_SIGNED_ROLE_OR_STARTUP_HOLD');
    await page.waitForFunction(()=>!!window.Orbit?.sharedInboxState?.ready&&window.Orbit?.route?.key==='ops'&&!!document.querySelector('#op-shared-inbox'),null,{timeout:30000});
    const result=await page.evaluate(()=>{
      const C=Orbit.ciclo,A=Orbit.access,projection=Orbit.sharedInboxState;
      const onBoard=new Set(C.opsBoard().flatMap(col=>(col.items||[]).filter(it=>it.kind==='negocio').map(it=>String(it.rec.id))));
      const expected=C.negocios({surface:'ops'}).filter(n=>!onBoard.has(String(n.id)))
        .filter(n=>{const s=C.collaborationState(n,'ops');return s.noticeKnown===true&&s.needsAction===true&&A.canView('negocios',n,'ops');});
      const section=document.querySelector('section[aria-label="Solicitudes de Leads pendientes"]');
      const shown=section?[...section.querySelectorAll('.kcard[data-neg]')].map(x=>x.getAttribute('data-neg')):[];
      const exact=expected.every(n=>{
        const comments=[].concat(n.comentarios||[]),directed=comments.filter(x=>x.direction==='operations');
        const match=directed.some(x=>{const s=projection.lookup(x.eventId);return !!x.eventId&&s.known===true&&!s.globalResolved;});
        return match&&shown.filter(id=>id===String(n.id)).length===1&&C.negocios({surface:'leads'}).some(x=>x.id===n.id);
      });
      return{expected:expected.length,shown:shown.length,exact,unique:new Set(shown).size===shown.length,
        noUnexpected:shown.every(id=>expected.some(n=>String(n.id)===id)),inboxReady:projection.ready};
    });
    assert.ok(result.inboxReady&&result.exact&&result.unique&&result.noUnexpected&&result.expected===result.shown,
      'I66_LIVE_LEADS_TO_OPS_EXACT_EVENT_ID_CARD_MISMATCH');
    assert.equal(errors.length,0,'I66_LIVE_INBOX_PAGE_ERRORS');
    console.log('I66_LIVE_'+actor.role.toUpperCase()+'_LEADS_OPS_EXACT_SHARED_INBOX_READBACK_PASS pending='+result.expected+' same_business=true no_duplicate=true writes=0');
    return result;
  }finally{await ctx.close();}
}
(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(marker.sourceSha,SOURCE,'I66_LIVE_INBOX_PRODUCT_DRIFT');
  const staff=await actors(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const result=[];for(const a of staff)result.push(await read(browser,a));
    const total=result.reduce((n,x)=>n+x.expected,0);
    console.log('I66_SIGNED_CARLOS_PAULA_LIVE_LEADS_OPS_INBOX_PROJECTION_CONSISTENT_'+(total?'WITH_REAL_PENDING_EVENTS_PASS':'NO_PENDING_EVENT_HOLD')+' exact_cards='+total+' financial_writes=0 notices_created=0');
  }finally{await browser.close();}
})().catch(e=>{console.error('I66_LIVE_LEADS_OPS_READONLY_HOLD '+String(e.code||e.message||'UNKNOWN').replace(/[^\w.:-]+/g,'_').slice(0,150));process.exitCode=1;});
