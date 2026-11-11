#!/usr/bin/env node
// I6.6 LIVE P0. Browser-origin timings only; never write business data.
import fs from 'node:fs';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const ORIGIN='https://app.aysseguros.com';
const OUTPUT=process.env.GI_I66_PERF_REPORT;
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const need=(ok,code)=>{if(!ok)throw Error(code);};
need(process.env.GI_I66_PERF_PROJECT===PROJECT&&process.env.GI_I66_PERF_TENANT===TENANT,'I66_PERF_PROJECT_TENANT_HOLD');
need(!process.env.FIRESTORE_EMULATOR_HOST,'I66_PERF_EMULATOR_HOLD');
need(OUTPUT&&OUTPUT.startsWith(process.env.RUNNER_TEMP+'/'),'I66_PERF_OUTPUT_SCOPE_HOLD');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app),auth=getAuth(app);
const report={
  schema:'GI_I66_LIVE_BROWSER_PERFORMANCE_READONLY_V1',project:PROJECT,tenant:TENANT,
  origin:ORIGIN,gate:'I6.6',sourceSha:process.env.GITHUB_SHA||'',
  readOnly:true,firestoreWrites:0,businessActions:0,paymentActions:0,
  syntheticFixtures:0,pushNotifications:0,roleChanged:false,
  auth:{},routes:[],mobile:{},errors:[],notes:[]
};
async function findCarlos(){
  const tenant=db.collection('tenants').doc(TENANT);
  const [members,advisors]=await Promise.all([
    tenant.collection('members').limit(150).get(),
    tenant.collection('data').doc('asesores').collection('items').limit(400).get()
  ]);
  need(members.size<150,'I66_PERF_MEMBERSHIP_BOUND_HOLD');
  need(advisors.size<400,'I66_PERF_ADVISOR_BOUND_HOLD');
  const knownAdvisors=new Set(),knownUids=new Set();
  for(const doc of advisors.docs){
    const a=doc.data()||{};
    if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))){
      knownAdvisors.add(doc.id);
      for(const id of [a.authUid,a.uid,a.userId])if(id)knownUids.add(String(id));
    }
  }
  const candidates=members.docs.filter(d=>{
    const m=d.data()||{},v=[m.nombre,m.displayName,m.name,m.nombreCompleto,m.fullName];
    const isName=v.some(x=>norm(x)==='carlos castro'||norm(x).startsWith('carlos castro '))||
      knownAdvisors.has(String(m.advisorId||m.asesorId||''))||knownUids.has(d.id);
    const roles=[m.activeRole,m.rol,m.rolDefault,...[].concat(m.roles||[])].map(norm);
    const active=m.active!==false&&m.activo!==false&&!['inactivo','inactive','bloqueado','blocked'].includes(norm(m.status||m.estado));
    return isName&&active&&roles.includes('operativo');
  });
  need(candidates.length===1,'I66_PERF_CARLOS_IDENTITY_NOT_UNIQUE');
  const who=await auth.getUser(candidates[0].id);
  need(!who.disabled&&who.emailVerified===true,'I66_PERF_CARLOS_AUTH_HOLD');
  return {uid:who.uid,allowedRole:'operativo'};
}
async function run(){
  const actor=await findCarlos();
  const token=await auth.createCustomToken(actor.uid);
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1365,height:900},ignoreHTTPSErrors:false});
    const page=await context.newPage();
    let pageErrors=0,consoleErrors=0;
    const consoleClasses={},httpClasses={};
    const classifyError=message=>{
      const s=String(message||'').toLowerCase();
      if(/permission.denied|missing or insufficient permissions|403|unauthorized/.test(s))return 'PERMISSION';
      if(/functions\/internal|internal error|\binternal\b/.test(s))return 'FUNCTION_INTERNAL';
      if(/404|not found/.test(s))return 'NOT_FOUND';
      if(/network|failed to fetch|net::/.test(s))return 'NETWORK';
      if(/csp|content security policy/.test(s))return 'CSP';
      return 'OTHER';
    };
    page.on('pageerror',()=>{pageErrors++;});
    page.on('console',m=>{if(m.type()==='error'){
      consoleErrors++;const code=classifyError(m.text());consoleClasses[code]=(consoleClasses[code]||0)+1;
    }});
    page.on('response',response=>{
      const status=response.status();if(status<400)return;
      const url=response.url();const kind=/cloudfunctions\.net|\/functions\//.test(url)?'FUNCTION':
        /firestore|googleapis/.test(url)?'GOOGLE_API':'OTHER';
      const key=kind+'_'+String(status);httpClasses[key]=(httpClasses[key]||0)+1;
    });
    const wallStart=Date.now();
    await page.goto(ORIGIN+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
    report.auth.documentReadyWallMs=Date.now()-wallStart;
    report.auth.navigation=await page.evaluate(()=>{
      const n=performance.getEntriesByType('navigation')[0];
      return n?{domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),
        transferBytes:n.transferSize||0,resourceCount:performance.getEntriesByType('resource').length}:null;
    });
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});
    const activation=await page.evaluate(async(token)=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0;
      const state=await provider.initialize();
      const authStart=performance.now();
      if(!state.auth.currentUser)await state.modules.auth.signInWithCustomToken(state.auth,token);
      const signedInMs=Math.round(performance.now()-authStart);
      const start=performance.now();
      try{
        const result=await Orbit.productAppP0.activate();
        return {ok:result?.started===true,signedInMs,activateMs:Math.round(performance.now()-start),
          role:String(Orbit.session?.rol?.()||''),storeStatus:String(Orbit.store?._productStatus?.().status||''),
          readyCollection:String(Orbit.store?._productStatus?.().startupCollection||''),
          hasRouter:!!Orbit.router?.render};
      }catch(error){
        return {ok:false,signedInMs,activateMs:Math.round(performance.now()-start),
          safeErrorCode:String(error?.code||error?.message||'ACTIVATION_FAILED').replace(/[^A-Z0-9_-]/gi,'').slice(0,90)};
      }
    },token);
    report.auth.activation=activation;
    need(activation.ok,'I66_PERF_AUTHENTICATED_BOOTSTRAP_HOLD');
    need(norm(activation.role)==='operativo','I66_PERF_ACTIVE_ROLE_NOT_CARLOS_OPERATIVO');
    await page.evaluate(()=>{
      const stats=window.__GI_I66_RENDER_STATS__={};
      for(const name of ['cliente360','polizas','cobros','aseguradoras','renovaciones','cronograma','ops','leads','siniestros','calidad','historial','inicio']){
        const mod=Orbit.modules?.[name];if(!mod||typeof mod.render!=='function')continue;
        const original=mod.render;stats[name]={calls:0,totalMs:0,maxMs:0};
        mod.render=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{
          const ms=Math.round((performance.now()-start)*10)/10,record=stats[name];
          record.calls++;record.totalMs=Math.round((record.totalMs+ms)*10)/10;
          record.maxMs=Math.max(record.maxMs,ms);
        }};
      }
    });
    const routeTargets=[
      ['cliente360','[data-c360-list-ready="1"]'],
      ['polizas','[data-polizas-kpi-ready]'],
      ['cobros','[data-cobros-table], [data-cobros-kpi], .tbl'],
      ['aseguradoras','.page'],
      ['renovaciones','.page'],
      ['cronograma','.page'],
      ['ops','.page'],
      ['leads','.page'],
      ['siniestros','.page'],
      ['calidad','.page'],
      ['historial','.page'],
      ['conciliaciones','.page'],
      ['inicio','.page']
    ];
    // Measure inside Chromium (performance.now), never across Playwright calls.
    for(const [route,readySelector] of routeTargets){
      const measurement=await page.evaluate(async({route,readySelector})=>{
        const targetHash='#/'+route,host=document.getElementById('host');
        const begin=performance.now();
        let routeMs=null,contentMs=null,readyMs=null,complete=false,denied=false;
        const check=()=>{
          if(Orbit.route?.key!==route)return;
          const text=(host?.innerText||'').slice(0,700);
          if(routeMs===null&&Orbit.route?.key===route)routeMs=Math.round(performance.now()-begin);
          if(contentMs===null&&host?.querySelector('.page'))contentMs=Math.round(performance.now()-begin);
          denied=/No tienes acceso con el rol activo/.test(text);
          if(!denied&&readyMs===null&&host?.querySelector(readySelector)){
            if(route!=='cliente360'||!!host?.querySelector('[data-c360-list-ready="1"]'))
              readyMs=Math.round(performance.now()-begin);
          }
          if(denied||readyMs!==null)complete=true;
        };
        const observer=new MutationObserver(check);
        observer.observe(host,{childList:true,subtree:true,attributes:true});
        const handler=e=>{if(e?.detail?.route===route){routeMs=Math.round(performance.now()-begin);check();}};
        document.addEventListener('orbit:route-ready',handler);
        location.hash=targetHash;
        check();
        await new Promise(resolve=>{
          const startPoll=performance.now();
          const timer=setInterval(()=>{
            check();
            if(complete||performance.now()-startPoll>10000){clearInterval(timer);resolve();}
          },100);
        });
        observer.disconnect();document.removeEventListener('orbit:route-ready',handler);
        const status=Orbit.store?._productStatus?.()||{};
        const renderStats=window.__GI_I66_RENDER_STATS__?.[route]||null;
        return {route,routeMs,contentMs,readyMs,denied,complete,visibleRows:host?.querySelectorAll('tbody tr').length||0,
          hostChars:host?.innerHTML.length||0,
          loadedSources:[].concat(status.serverConfirmedCollections||[]).length,
          pendingSources:[].concat(status.optionalMissing||[]).length,
          snapshotErrorCount:Object.keys(status.snapshotErrors||{}).length,
          snapshotErrorSources:Object.keys(status.snapshotErrors||{}).filter(k=>/^[a-zA-Z0-9_-]{1,35}$/.test(k)).sort(),
          renderStats,
          client360RenderMs:route==='cliente360'?Math.round(window.OrbitRuntimeDiagnostics?.cliente360?.renderMs||0):null};
      },{route,readySelector});
      report.routes.push(measurement);
    }
    // Measure a real, already-authorized client detail without printing its identity.
    report.cliente360Detail=await page.evaluate(async()=>{
      const clients=Orbit.store?.all('clientes')||[],policies=Orbit.store?.all('polizas')||[];
      const ids=new Set(clients.map(c=>String(c?.id||'')).filter(Boolean));
      const count=new Map();
      for(const p of policies){const id=String(p?.clienteId||'');if(ids.has(id))count.set(id,(count.get(id)||0)+1);}
      const best=[...count.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||String(clients[0]?.id||'');
      if(!best)return {available:false,reason:'NO_AUTHORIZED_CLIENT'};
      const start=performance.now(),host=document.getElementById('host');
      location.hash='#/cliente360?c='+encodeURIComponent(best);
      const ready=await new Promise(resolve=>{
        const timer=setInterval(()=>{
          const hasHeader=!!host.querySelector('.fichahdr'),hasBody=!!host.querySelector('#c360-body');
          if(hasHeader&&hasBody){clearInterval(timer);resolve(true);}
          else if(performance.now()-start>12000){clearInterval(timer);resolve(false);}
        },40);
      });
      const states=[...host.querySelectorAll('[data-readiness]')].map(e=>String(e.getAttribute('data-readiness')||''));
      const readies=states.reduce((m,k)=>(m[k]=(m[k]||0)+1,m),{});
      return {available:true,detailMs:Math.round(performance.now()-start),ready,
        detailChars:host.innerHTML.length,policyCountForSelected:count.get(best)||0,
        readinessCounts:readies,renderStats:window.__GI_I66_RENDER_STATS__?.cliente360||null};
    });
    await page.setViewportSize({width:390,height:844});
    // The menu is a local UI operation; it must not wait for a network request.
    report.mobile=await page.evaluate(async()=>{
      const burger=document.getElementById('burger'),sidebar=document.getElementById('sidebar');
      const start=performance.now();burger.click();
      const eventMs=performance.now()-start;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const paintedMs=performance.now()-start;
      return {viewportWidth:innerWidth,eventMs:Math.round(eventMs*10)/10,
        twoFramesMs:Math.round(paintedMs*10)/10,menuOpen:sidebar.classList.contains('open'),
        navItems:sidebar.querySelectorAll('[data-route]').length};
    });
    report.auth.pageErrors=pageErrors;report.auth.consoleErrors=consoleErrors;
    report.auth.consoleErrorClasses=consoleClasses;report.auth.httpErrorClasses=httpClasses;
    await context.close();
    report.status='LIVE_READONLY_MEASURED';
  }finally{if(browser)await browser.close();}
}
try{
  await run();
  console.log(JSON.stringify({schema:report.schema,status:report.status,
    startupMs:report.auth.activation?.activateMs,routeCount:report.routes.length,
    loadedRoutes:report.routes.filter(x=>x.readyMs!==null).length,mobileEventMs:report.mobile.eventMs,
    errors:report.auth.pageErrors}));
}catch(error){
  report.status='HOLD';
  report.errors.push(String(error?.message||'PERF_UNKNOWN').replace(/[^A-Z0-9_:-]/gi,'').slice(0,100));
  console.error('I66_PERF_HOLD:'+report.errors[0]);
  process.exitCode=1;
}finally{
  fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}
