'use strict';
// I6.6 live physical browser route audit. No production data, role, token, claims,
// authorization, release, or browser-local user session is changed.
// All actors are existing active, verified tenant members. Read-only synthetic auth
// session is held only by ephemeral headless Playwright browser contexts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://app.aysseguros.com',TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab',OUT=process.env.I66_FIVE_ROLE_REPORT;
const PIN=process.env.I66_APPROVED_LIVE_SOURCE_SHA;
assert.equal(process.env.I66_LIVE_ORIGIN,ORIGIN,'I66_ROLE_MATRIX_WRONG_ORIGIN');
assert.match(PIN||'',/^[a-f0-9]{40}$/,'I66_ROLE_MATRIX_SOURCE_MISSING');
assert.ok(OUT&&OUT.startsWith(process.env.RUNNER_TEMP+'/'),'I66_ROLE_MATRIX_REPORT_SCOPE_DENIED');
const sa=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'')}catch{return null}})
  .find(x=>x?.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
assert.ok(sa,'I66_ROLE_MATRIX_SIGNED_SERVICE_ACCOUNT_MISSING');
admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>crypto.createHash('sha256').update(String(x||'')).digest('hex');
const matrix=[
  {role:'operativo',matchName:'carlos castro',country:'GT'},
  {role:'direccion',matchName:'paula osorio',country:'GT'},
  {role:'admintenant',matchName:'',country:'GT'},
  {role:'superadmin',matchName:'',country:'GT'},
  {role:'asesor',matchName:'',country:'GT'}
];
const core=['inicio','cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras'];
const routes=['inicio','cliente360','polizas','renovaciones','cobros','ops','leads','aseguradoras',
  'cronograma','siniestros','historial','calidad','cotizador','comparativo'];
const report={schema:'I66_FIVE_ROLE_CURRENT_LIVE_BROWSER_MATRIX_V1',gate:'I6.6',
  sourceSha:PIN,buildId:null,createdAt:new Date().toISOString(),
  authMode:'existing verified member read-only custom token',writes:0,collectionsMutated:0,
  activeRoles:matrix.map(x=>x.role),views:[1280,390],routeKeys:routes,
  results:[],holds:[],status:'RUNNING'};
async function getActors(){
  const [memberSnap,advisorSnap]=await Promise.all([
    tenant.collection('members').limit(180).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(450).get()
  ]);
  assert.ok(memberSnap.size<180&&advisorSnap.size<450,'I66_ROLE_MATRIX_UNBOUNDED_STAFF');
  const members=memberSnap.docs.map(d=>({uid:d.id,...(d.data()||{})}));
  function active(m){
    return m.active!==false&&m.activo!==false&&
      !['inactivo','inactive','blocked','bloqueado','suspended'].includes(norm(m.status||m.estado));
  }
  function roleMatches(m,role){
    const r=norm(m.activeRole||m.rolActivo||'');
    return r===role||(role==='admintenant'&&['admin','administrador'].includes(r));
  }
  function countries(m){
    return [].concat(m.countries||m.paises||m.allowedCountries||[])
      .map(v=>String(v).toUpperCase());
  }
  const out=[];
  for(const wanted of matrix){
    let candidates=members.filter(m=>active(m)&&roleMatches(m,wanted.role)&&
      (countries(m).includes(wanted.country)||countries(m).includes('TODOS')||
      countries(m).includes('ALL')));
    if(wanted.matchName){
      // Reuse the same canonical advisor/UID linkage proven by the signed
      // LIVE Carlos/Dirección renewal, insurer and Client 360 UAT owners.
      // Names alone are not a unique operational identity.
      const verifiedName= wanted.role==='operativo'
        ? v=>norm(v).startsWith('carlos castro')
        : v=>norm(v).includes('paula')&&norm(v).includes('osorio');
      const linked=advisorSnap.docs.filter(d=>{
        const row=d.data()||{};
        return [row.nombre,row.nombreCompleto,row.displayName,row.name].some(verifiedName);
      });
      const advisorIds=new Set(linked.map(d=>d.id));
      const linkedUids=new Set(linked.flatMap(d=>{
        const row=d.data()||{};
        return [row.authUid,row.uid,row.userId].filter(Boolean).map(String);
      }));
      candidates=candidates.filter(m=>
        [m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName].some(verifiedName)||
        advisorIds.has(String(m.advisorId||m.asesorId||''))||linkedUids.has(m.uid));
    }
    const valid=[];
    for(const m of candidates){
      try{
        const u=await auth.getUser(m.uid);
        if(!u.disabled&&u.emailVerified===true)valid.push({uid:m.uid,activeRole:m.activeRole});
      }catch(e){}
    }
    if(wanted.matchName&&valid.length!==1){report.holds.push('SIGNED_ACTOR_NOT_UNIQUE_'+wanted.role+'_COUNT_'+valid.length);continue;}
    if(!valid.length){report.holds.push('NO_VERIFIED_ACTIVE_GT_ROLE_'+wanted.role);continue;}
    valid.sort((a,b)=>a.uid.localeCompare(b.uid));
    out.push({...wanted,uid:valid[0].uid,uidHash:hash(valid[0].uid).slice(0,12),token:await auth.createCustomToken(valid[0].uid)});
  }
  return out;
}
function classify(error){
  const s=String(error?.message||error||'UNKNOWN');
  return s.replace(/[^\w .:-]/g,'_').slice(0,100);
}
async function visit(browser,actor,width){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},
    ignoreHTTPSErrors:false}),page=await context.newPage();
  const errors=[],http={};
  page.on('pageerror',e=>errors.push(classify(e)));
  page.on('response',r=>{if(r.status()>=400){
    const u=r.url(),category=/\/functions|cloudfunctions/.test(u)?'FUNCTION':
      /firestore|googleapis/.test(u)?'GOOGLE_API':'WEB';
    const key=category+'_'+r.status();http[key]=(http[key]||0)+1;
  }});
  const actorReport={role:actor.role,uidSha12:actor.uidHash,width,ready:false,
    sessionRole:'',visited:[],routeFailures:[],errors:[],http:{},reload:false,superuserCore:null};
  try{
    await page.goto(ORIGIN+'/#/inicio',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&
      !!window.Orbit?.productAppP0,null,{timeout:30000});
    const state=await page.evaluate(async token=>{
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
      await c.modules.auth.signInWithCustomToken(c.auth,token);
      const app=await Orbit.productAppP0.activate();
      return{started:app?.started===true,role:Orbit.session?.rol?.()||'',
        preview:p.isI66PreviewHost(),country:String(Orbit.pais||''),
        accessibleModules:Object.fromEntries(['inicio','cliente360','polizas','cobros','renovaciones','ops',
          'leads','aseguradoras'].map(k=>[k,Orbit.access?.can?.(k,'view')===true])),
        canInsurerEdit:Orbit.access?.can?.('aseguradoras','edit')===true,
        canPay:Orbit.access?.can?.('cobros','edit')===true};
    },actor.token);
    actorReport.ready=state.started&&!state.preview&&(norm(state.role)===actor.role||
      (actor.role==='admintenant'&&['admin','administrador'].includes(norm(state.role))));
    actorReport.sessionRole=norm(state.role);
    actorReport.viewPermissions=state.accessibleModules;
    actorReport.canInsurerEdit=state.canInsurerEdit;
    actorReport.canPay=state.canPay;
    if(!actorReport.ready){actorReport.routeFailures.push('SIGNIN_OR_ROLE_MISMATCH');return actorReport;}
    if(['direccion','superadmin','admintenant','operativo'].includes(actor.role)){
      const missing=core.filter(k=>state.accessibleModules[k]!==true);
      actorReport.superuserCore={expected:core.length,missing};
      if(missing.length)actorReport.routeFailures.push('APPROVED_ROLE_CORE_VIEW_DENIED_'+missing.join(','));
      if(!state.canInsurerEdit)actorReport.routeFailures.push('INSURER_EDIT_DENIED_FOR_'+actor.role);
    }
    if(actor.role==='asesor'&&(state.canInsurerEdit||state.canPay))
      actorReport.routeFailures.push('ADVISOR_PRIVILEGED_WRITE_LEAK');
    for(const route of routes){
      const result=await page.evaluate(async route=>{
        const target='#/'+route;
        if(location.hash===target)window.dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash=target;
        const start=performance.now(),host=document.getElementById('host');
        let ready=false;
        while(performance.now()-start<9500){
          if(Orbit.route?.key===route&&host?.querySelector('.page')){
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            ready=true;break;
          }
          await new Promise(resolve=>setTimeout(resolve,90));
        }
        const txt=(host?.innerText||'').slice(0,1100);
        const denied=txt.includes('No tienes acceso con el rol activo');
        const missing=txt.includes('Módulo no encontrado')||
          txt.includes('Módulo en construcción según el plan');
        const access=Orbit.access?.can?.(route,'view')===true;
        return{route,ready,denied,missing,access,
          renderMs:Math.round(performance.now()-start),
          pageCount:host?.querySelectorAll('.page').length||0,
          width:window.innerWidth,
          viewportOverflowPx:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
      },route).catch(e=>({route,error:classify(e)}));
      actorReport.visited.push(result);
      if(!result.ready||result.missing||result.error)actorReport.routeFailures.push('MODULE_ROUTE_'+route);
      if(result.access&&result.denied)actorReport.routeFailures.push('AUTHORIZED_ROUTE_DENIED_'+route);
      if(!result.access&&!result.denied)actorReport.routeFailures.push('NONASSIGNED_ROUTE_NOT_DENIED_'+route);
    }
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productAppP0,null,{timeout:30000});
    const refresh=await page.evaluate(async()=>{
      await Orbit.productRuntimeBrowserProvidersP0.initialize();
      await Orbit.productRuntimeBrowserProvidersP0.waitForUser();
      const a=await Orbit.productAppP0.activate();
      return{started:a?.started===true,role:Orbit.session?.rol?.()};
    }).catch(e=>({error:classify(e)}));
    actorReport.reload=refresh.started===true&&norm(refresh.role)===actor.role;
    if(!actorReport.reload)actorReport.routeFailures.push('SESSION_RELOAD_NOT_RESTORED');
  }finally{
    actorReport.errors=errors;
    actorReport.http=http;
    await context.close();
  }
  return actorReport;
}
(async()=>{
  const marker=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'}})
    .then(x=>{assert.equal(x.status,200,'I66_MATRIX_MARKER_HTTP');return x.json()});
  assert.equal(marker.sourceSha,PIN,'I66_MATRIX_CURRENT_LIVE_SOURCE_DRIFT');
  report.buildId=marker.buildId;
  const actors=await getActors();
  let browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const actor of actors){
      for(const width of report.views){
        try{report.results.push(await visit(browser,actor,width));}
        catch(e){report.holds.push('BROWSER_'+actor.role+'_'+width+'_'+classify(e));}
      }
    }
  }finally{await browser.close();}
  if(report.results.length!==matrix.length*report.views.length)
    report.holds.push('ACTUAL_ROLE_VIEWPORT_COVERAGE_INCOMPLETE');
  for(const z of report.results){
    if(z.errors.length)report.holds.push('PAGE_ERRORS_'+z.role+'_'+z.width+'_'+z.errors.length);
    if(z.routeFailures.length)report.holds.push('ROUTES_'+z.role+'_'+z.width+'_'+z.routeFailures.join('_').slice(0,120));
  }
  report.status=report.holds.length?'HOLD':'PASS';
  report.resultsCount=report.results.length;
  report.routeChecks=report.results.reduce((n,z)=>n+z.visited.length,0);
  report.rolesAuthenticated=[...new Set(report.results.filter(z=>z.ready).map(z=>z.role))];
  report.writes=0;
  console.log('I66_LIVE_FIVE_ROLE_ROUTE_MATRIX_SUMMARY '+JSON.stringify({
    status:report.status,roles:report.rolesAuthenticated,roleViewports:report.results.length,
    routeChecks:report.routeChecks,holds:report.holds.slice(0,28),readOnly:true}));
  if(report.status!=='PASS')process.exitCode=1;
})().catch(e=>{report.status='HOLD';report.holds.push('FATAL_'+classify(e));
  console.error('I66_LIVE_FIVE_ROLE_ROUTE_MATRIX_HOLD '+classify(e));process.exitCode=1;
}).finally(async()=>{
  fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
  await admin.app().delete();
});
