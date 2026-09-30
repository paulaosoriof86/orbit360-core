import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B3_002_PERF_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b3-002-performance-readonly.json');
const EXPECTED_SOURCE=String(process.env.EXPECTED_SOURCE_SHA||'').trim();
const EXPECTED_BUILD=String(process.env.EXPECTED_BUILD_ID||'').trim();
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const COLLECTIONS=['cobros','clientes','polizas','vehiculos','recibosEsperados','carteraPrimas'];
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex').slice(0,16);
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>new Date().toISOString();

function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B3_002_SERVICE_ACCOUNT_MISSING');
}
function roles(m){return [...new Set([...(m?.roles||[]),...(m?.rolesAsignados||[]),...(m?.assignedRoles||[]),m?.role,m?.rol,m?.rolDefault,m?.defaultRole,m?.activeRole].map(x=>clean(x,100)).filter(Boolean))];}
async function pickActor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const out=[];
  for(const d of snap.docs){
    const m=d.data()||{}, rr=roles(m), rn=rr.map(norm), st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'].includes(x)))continue;
    for(const uid of [...new Set([m.uid,d.id].map(x=>clean(x,180)).filter(Boolean))]){
      try{
        const u=await auth.getUser(uid); if(u.disabled)continue;
        const score=(rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(x))?100:0)+(rn.includes('operativo')?20:0)+(u.emailVerified?5:0)+rr.length;
        out.push({uid:u.uid,roles:rr,emailVerified:u.emailVerified===true,score}); break;
      }catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);
  need(out.length,'B3_002_NO_AUTHORIZED_ACTOR');
  return out[0];
}
async function readMarker(page){
  return page.evaluate(async()=>{
    const r=await fetch('/__recovery__/build.json?b3002='+Date.now(),{cache:'no-store'});
    return r.json();
  });
}
async function installInstrumentation(page,label){
  await page.evaluate(({label,collections})=>{
    const b=window.__b3002={
      label,installedAt:performance.now(),navStart:null,activationStart:null,activationReady:null,
      storeEvents:[],renders:[],longTasks:[],markers:{shell:null,kpis:null,aging:null,table:null,usable:null,complete:null},
      collectionSnapshots:[],search:{},errors:[]
    };
    const stamp=()=>performance.now();
    const snapshot=()=>{
      try{
        const s=window.Orbit?.store?._productStatus?.()||{};
        const counts={},bytes={};
        for(const c of collections){
          let rows=[]; try{rows=window.Orbit?.store?.all?.(c)||[];}catch{}
          counts[c]=rows.length;
          try{bytes[c]=new TextEncoder().encode(JSON.stringify(rows)).length;}catch{bytes[c]=null;}
        }
        return {at:stamp(),status:String(s.status||''),ready:s.ready===true,confirmed:[].concat(s.serverConfirmedCollections||[]),counts,bytes};
      }catch(e){return {at:stamp(),error:String(e?.message||e)}}
    };
    b.takeSnapshot=snapshot;
    const markDom=()=>{
      const host=document.getElementById('host'), t=stamp(), base=b.navStart==null?b.installedAt:b.navStart;
      if(!host)return;
      if(b.markers.shell==null&&host.querySelector('.page'))b.markers.shell=t-base;
      if(b.markers.kpis==null&&host.querySelector('.kpi-row .kpi'))b.markers.kpis=t-base;
      if(b.markers.aging==null&&[...host.querySelectorAll('.card')].some(x=>/Antigüedad de cartera vencida/i.test(x.textContent||'')))b.markers.aging=t-base;
      if(b.markers.table==null&&host.querySelector('table.tbl tbody'))b.markers.table=t-base;
      if(b.markers.usable==null&&host.querySelector('table.tbl tbody tr'))b.markers.usable=t-base;
    };
    try{
      new PerformanceObserver(list=>{for(const e of list.getEntries())b.longTasks.push({start:e.startTime,duration:e.duration});}).observe({entryTypes:['longtask']});
    }catch{}
    window.addEventListener('orbit:store:emit',e=>{
      const c=String(e?.detail?.collection||'');
      const snap=snapshot();
      b.storeEvents.push({at:stamp(),collection:c,status:snap.status,confirmed:snap.confirmed,counts:snap.counts});
      if(b.navStart!=null)markDom();
    });
    const mo=new MutationObserver(markDom);
    const host=document.getElementById('host'); if(host)mo.observe(host,{childList:true,subtree:true,characterData:true});
    b.observer=mo;
    const mod=window.Orbit?.modules?.cobros;
    if(mod&&typeof mod.render==='function'&&!mod.__b3002Wrapped){
      const original=mod.render.bind(mod);
      mod.render=function(host){
        const started=stamp(), base=b.navStart==null?b.installedAt:b.navStart;
        const store=window.Orbit?.store, calls={all:{},get:{},where:{}}, scans={};
        const originals={};
        function wrap(name){
          if(!store||typeof store[name]!=='function')return;
          originals[name]=store[name];
          store[name]=function(collection,...args){
            const c=String(collection||''); calls[name][c]=(calls[name][c]||0)+1;
            const value=originals[name].call(this,collection,...args);
            if(name==='all'&&Array.isArray(value))scans[c]=(scans[c]||0)+value.length;
            return value;
          };
        }
        ['all','get','where'].forEach(wrap);
        let err='',ret;
        try{ret=original(host);}catch(e){err=String(e?.stack||e?.message||e);throw e;}
        finally{
          for(const [name,fn] of Object.entries(originals))store[name]=fn;
          const ended=stamp(), status=window.Orbit?.store?._productStatus?.()||{};
          b.renders.push({
            startMs:started-base,durationMs:ended-started,error:err,
            calls,scannedRows:scans,
            domRows:host?.querySelectorAll?.('table.tbl tbody tr')?.length||0,
            reportedDomRows:host?.querySelectorAll?.('[data-reported-payment-evidence]')?.length||0,
            confirmed:[].concat(status.serverConfirmedCollections||[])
          });
          markDom();
        }
        return ret;
      };
      mod.__b3002Wrapped=true;
    }
    b.startNav=()=>{b.navStart=stamp();b.markers={shell:null,kpis:null,aging:null,table:null,usable:null,complete:null};b.renders=[];b.longTasks=[];b.storeEvents=[];b.collectionSnapshots=[];};
    b.finish=()=>{
      markDom();
      const snap=snapshot();b.collectionSnapshots.push(snap);
      const base=b.navStart==null?b.installedAt:b.navStart;
      const resources=performance.getEntriesByType('resource').filter(x=>/firestore|googleapis|firebase/i.test(x.name||'')).map(x=>({name:String(x.name||'').slice(0,220),duration:x.duration,transferSize:x.transferSize||0,encodedBodySize:x.encodedBodySize||0,decodedBodySize:x.decodedBodySize||0}));
      const host=document.getElementById('host');
      return {
        label:b.label,
        elapsedMs:stamp()-base,
        markers:{...b.markers},
        renders:b.renders.slice(),
        storeEvents:b.storeEvents.slice(),
        longTasks:b.longTasks.slice(),
        final:snap,
        dom:{rows:host?.querySelectorAll?.('table.tbl tbody tr')?.length||0,reportedRows:host?.querySelectorAll?.('[data-reported-payment-evidence]')?.length||0,note:host?.querySelector?.('[data-reported-payments-note="1"]')?.textContent?.trim?.().slice(0,300)||''},
        resources
      };
    };
  },{label,collections:COLLECTIONS});
}
async function signInAndActivate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{b3002ReadonlyQa:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros,null,{timeout:20000});
  return page.evaluate(async t=>{
    const b=window.__b3002;if(b)b.activationStart=performance.now();
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    const st=Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
    return Promise.resolve(st).then(x=>{if(b)b.activationReady=performance.now();return x;});
  },token);
}
async function waitForComplete(page,timeoutMs=25000){
  const end=Date.now()+timeoutMs;let last=null;
  while(Date.now()<end){
    last=await page.evaluate(cols=>{
      const s=window.Orbit?.store?._productStatus?.()||{};
      const confirmed=[].concat(s.serverConfirmedCollections||[]);
      const all=cols.every(c=>confirmed.includes(c));
      const host=document.getElementById('host');
      return {all,confirmed,rows:host?.querySelectorAll?.('table.tbl tbody tr')?.length||0,reported:host?.querySelectorAll?.('[data-reported-payment-evidence]')?.length||0,status:String(s.status||'')};
    },COLLECTIONS);
    if(last.all){
      await sleep(500);
      await page.evaluate(()=>{if(window.__b3002&&window.__b3002.navStart!=null)window.__b3002.markers.complete=performance.now()-window.__b3002.navStart;});
      return {complete:true,last};
    }
    await sleep(120);
  }
  return {complete:false,last};
}
async function navigateAndMeasure(page,route,label){
  await page.evaluate(({route,label})=>{window.__b3002.label=label;window.__b3002.startNav();location.hash='#/'+route;},{route,label});
  const complete=await waitForComplete(page);
  const out=await page.evaluate(()=>window.__b3002.finish());
  out.completeWait=complete;
  return out;
}
async function warmAndSearch(page){
  await page.evaluate(()=>{location.hash='#/inicio';});
  await sleep(350);
  const warm=await navigateAndMeasure(page,'cobros','warm-navigation');
  const search=await page.evaluate(async()=>{
    const b=window.__b3002;
    const input=document.getElementById('fq');
    if(!input)return {available:false};
    b.renders=[];b.longTasks=[];b.storeEvents=[];
    const before=performance.now();
    for(const ch of ['a','b','c','d']){
      input.value+=ch;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>setTimeout(r,35));
    }
    await new Promise(r=>setTimeout(r,250));
    const after=performance.now();
    return {available:true,keyEvents:4,elapsedMs:after-before,renderCount:b.renders.length,renders:b.renders.slice(),longTasks:b.longTasks.slice(),finalRows:document.querySelectorAll('table.tbl tbody tr').length};
  });
  return {warm,search};
}
function summarize(x){
  const renders=x?.renders||[];
  const d=renders.map(r=>Number(r.durationMs||0));
  return {
    shellMs:x?.markers?.shell??null,kpisMs:x?.markers?.kpis??null,agingMs:x?.markers?.aging??null,tableMs:x?.markers?.table??null,usableMs:x?.markers?.usable??null,completeMs:x?.markers?.complete??null,
    renderCount:renders.length,totalRenderMs:Math.round(d.reduce((a,b)=>a+b,0)),maxRenderMs:Math.round(Math.max(0,...d)),
    longTaskCount:(x?.longTasks||[]).length,longTaskTotalMs:Math.round((x?.longTasks||[]).reduce((s,e)=>s+Number(e.duration||0),0)),
    finalRows:x?.dom?.rows??null,reportedRows:x?.dom?.reportedRows??null,
    storeEventCount:(x?.storeEvents||[]).length,
    storeEventsByCollection:(x?.storeEvents||[]).reduce((m,e)=>(m[e.collection]=(m[e.collection]||0)+1,m),{})
  };
}

need(TARGET,'B3_002_TARGET_REQUIRED');
const evidence={
  schema:'GRAVICENTRA_I6_5_B3_002_READONLY_PERFORMANCE_HYDRATION_DIAGNOSTIC_V1',
  recordedAt:now(),repository:'paulaosoriof86/orbit360-core',branch:process.env.GITHUB_REF_NAME||'',headSha:process.env.GITHUB_SHA||'',
  exactPreview:{url:TARGET,expectedSourceSha:EXPECTED_SOURCE,expectedBuildId:EXPECTED_BUILD},
  boundaries:{readOnly:true,businessWrites:0,reimport:false,livePromotion:false,productSourceMutation:false},
  actor:{},identity:{},scenarios:{},staticInspection:{},conclusion:{status:'MEASURED_DIAGNOSTIC_ONLY',rootCause:'PENDING_MEASUREMENT'}
};
let app,browser;
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b3-002-'+RUN);
  const db=getFirestore(app),auth=getAuth(app),actor=await pickActor(db,auth);
  evidence.actor={uidHash:hash(actor.uid),roles:actor.roles,emailVerified:actor.emailVerified};

  const cobrosSrc=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
  const bridgeSrc=fs.readFileSync('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js','utf8');
  const routerSrc=fs.readFileSync('orbit360-platform/core/router.js','utf8');
  const hydrationSrc=fs.readFileSync('orbit360-platform/core/product-hydration-required-optional-p0.js','utf8');
  evidence.staticInspection={
    cobrosVehicleFullScanSites:(cobrosSrc.match(/all\('vehiculos'\)\.find/g)||[]).length,
    bridgeVehicleFullScanSites:(bridgeSrc.match(/all\('vehiculos'\)/g)||[]).length,
    fullTableMapWithoutPagination:/<tbody>\$\{r\.map\(/.test(cobrosSrc),
    liveFilterDirectRender:/if \(live\).*render\(host\)/s.test(cobrosSrc),
    explicitCobrosDebounce:/debounc/i.test(cobrosSrc),
    bridgeListensStoreEmit:/orbit:store:emit/.test(bridgeSrc),
    bridgeDirectRender:/mod\.render\(host\)/.test(bridgeSrc),
    bridgeCollections:['carteraPrimas','recibosEsperados','cobros','clientes','polizas','vehiculos'].filter(x=>bridgeSrc.includes("'"+x+"'")),
    routerCobrosReactive:/cobros:\s*\['cobros',\s*'clientes',\s*'polizas'\]/.test(routerSrc),
    routerDebounceMs:(routerSrc.match(/setTimeout\(function \(\).*?\},\s*(\d+)\);/s)||[])[1]||null,
    routePrimaryCobros:/cobros:'cobros'/.test(hydrationSrc),
    fullHydrationDeferred:/fullHydrationDeferred:true/.test(hydrationSrc)
  };

  browser=await chromium.launch({headless:true});
  async function newMeasuredPage(startRoute,label){
    const context=await browser.newContext({viewport:{width:1500,height:1000}});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
    const pageErrors=[],consoleErrors=[];
    page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1000)));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(clean(m.text(),1000));});
    await page.goto(TARGET+'/?b3002='+Date.now()+'#/'+startRoute,{waitUntil:'domcontentloaded',timeout:30000});
    const marker=await readMarker(page);
    if(EXPECTED_SOURCE)need(marker?.sourceSha===EXPECTED_SOURCE,'B3_002_PREVIEW_SOURCE_DRIFT:'+JSON.stringify(marker));
    if(EXPECTED_BUILD)need(marker?.buildId===EXPECTED_BUILD,'B3_002_PREVIEW_BUILD_DRIFT:'+JSON.stringify(marker));
    evidence.identity={sourceSha:marker?.sourceSha||'',buildId:marker?.buildId||''};
    await installInstrumentation(page,label);
    if(startRoute==='cobros')await page.evaluate(()=>window.__b3002.startNav());
    const activation=await signInAndActivate(page,auth,actor);
    need(activation?.started===true,'B3_002_APP_NOT_STARTED');
    return {context,page,pageErrors,consoleErrors};
  }

  // Scenario 1: reproduce user path—startup on Inicio, then first navigation to Cobros while deferred hydration may still be in flight.
  {
    const s=await newMeasuredPage('inicio','in-session-cold');
    evidence.scenarios.inSessionCold=await navigateAndMeasure(s.page,'cobros','in-session-cold');
    const extra=await warmAndSearch(s.page);
    evidence.scenarios.warm=extra.warm;
    evidence.scenarios.search=extra.search;
    evidence.scenarios.inSessionCold.errors={page:s.pageErrors,console:s.consoleErrors};
    await s.context.close();
  }

  // Scenario 2: direct cold deep-link makes Cobros the route-primary authoritative startup.
  {
    const s=await newMeasuredPage('cobros','direct-cold');
    const complete=await waitForComplete(s.page);
    evidence.scenarios.directCold=await s.page.evaluate(()=>window.__b3002.finish());
    evidence.scenarios.directCold.completeWait=complete;
    evidence.scenarios.directCold.errors={page:s.pageErrors,console:s.consoleErrors};
    await s.context.close();
  }

  evidence.summary={
    inSessionCold:summarize(evidence.scenarios.inSessionCold),
    directCold:summarize(evidence.scenarios.directCold),
    warm:summarize(evidence.scenarios.warm),
    search:{
      available:evidence.scenarios.search?.available===true,
      keyEvents:evidence.scenarios.search?.keyEvents||0,
      renderCount:evidence.scenarios.search?.renderCount||0,
      totalRenderMs:Math.round((evidence.scenarios.search?.renders||[]).reduce((s,r)=>s+Number(r.durationMs||0),0)),
      maxRenderMs:Math.round(Math.max(0,...(evidence.scenarios.search?.renders||[]).map(r=>Number(r.durationMs||0))))
    }
  };

  const cold=evidence.summary.inSessionCold, direct=evidence.summary.directCold, warm=evidence.summary.warm, search=evidence.summary.search;
  const burst=(cold.renderCount>=3||direct.renderCount>=3);
  const fullDom=Math.max(cold.finalRows||0,direct.finalRows||0)>=400;
  const noDebounce=search.available&&search.keyEvents>=4&&search.renderCount>=4;
  const vehicleN2=(evidence.staticInspection.cobrosVehicleFullScanSites||0)>0;
  evidence.conclusion={
    status:'MEASURED_DIAGNOSTIC_COMPLETE',
    facts:{
      renderBurstDuringHydration:burst,
      fullDomHundredsOfRows:fullDom,
      searchRendersPerKeystroke:noDebounce,
      perRowVehicleFullScan:vehicleN2,
      duplicateReactiveOwners:evidence.staticInspection.bridgeDirectRender===true&&evidence.staticInspection.routerCobrosReactive===true,
      routePrimaryCobros:evidence.staticInspection.routePrimaryCobros===true,
      coldVsWarmRatio:(cold.usableMs&&warm.usableMs)?Number((cold.usableMs/Math.max(1,warm.usableMs)).toFixed(2)):null
    },
    rootCause:burst&&fullDom&&vehicleN2
      ?'COBROS_UNCOALESCED_HYDRATION_RENDER_STORM_PLUS_FULL_DOM_AND_PER_ROW_VEHICLE_SCAN'
      :'MEASURED_FACTS_REQUIRE_REVIEW_BEFORE_PRODUCT_FIX',
    productFixAuthorizedByDiagnostic:false
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B3_002_PERFORMANCE_DIAGNOSTIC='+evidence.conclusion.status);
  console.log('B3_002_SUMMARY='+JSON.stringify(evidence.summary));
  console.log('B3_002_ROOT_CAUSE='+evidence.conclusion.rootCause);
}catch(error){
  evidence.conclusion={status:'DIAGNOSTIC_FAILED',rootCause:'UNMEASURED',error:clean(error?.stack||error?.message||error,4000)};
  try{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');}catch{}
  throw error;
}finally{
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
}
