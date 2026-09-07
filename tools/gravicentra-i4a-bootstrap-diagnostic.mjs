import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones',PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''),BUILD=String(process.env.BUILD_ID||''),OUT=process.env.I4A_DIAG_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const clean=v=>String(v==null?'':v).trim();
function canon(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(canon).filter(Boolean))];}
function active(m,rs){return canon(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function sa(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('SERVICE_ACCOUNT_UNAVAILABLE');}

const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'gravicentra-i4a-diag-v6'),auth=getAuth(app),db=getFirestore(app);
const ms=await db.collection('tenants').doc(TENANT).collection('members').get(),ul=await auth.listUsers(1000),users=new Map(ul.users.map(u=>[u.uid,u])),pool=[];
for(const d of ms.docs){
  const m=d.data()||{},uid=clean(m.uid||d.id),u=users.get(uid),rs=roles(m);
  if(!u||u.disabled||u.emailVerified!==true||clean(m.status||m.estado).toLowerCase()!=='active')continue;
  pool.push({uid,roles:rs,active:active(m,rs)});
}
const target=pool.find(x=>x.active==='Dirección'&&x.roles.includes('Dirección'))||pool.find(x=>x.active==='SuperAdmin')||pool[0];
fs.mkdirSync(OUT,{recursive:true});
const ev={
  schemaVersion:'gravicentra-i4a-bootstrap-diagnostic-v6',
  gate:'I4A',
  purpose:'observe-startup-render-hydration-and-main-thread-cost-boundaries',
  sourceSha:SOURCE,
  buildId:BUILD,
  previewUrl:PREVIEW,
  productionTouched:false,
  dataTouched:false,
  writesExecuted:0,
  userIdentitiesRecorded:false,
  tokensRecorded:false,
  cases:{},
  errors:[]
};

async function one(browser,name){
  const token=await auth.createCustomToken(target.uid,{gravicentraI4AReadOnly:true});
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await ctx.newPage();
  const rec={activeRole:target.active,roleCount:target.roles.length};
  ev.cases[name]=rec;
  try{
    await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.session?.syncFromAuth,null,{timeout:5000});
    const out=await page.evaluate(async tok=>{
      const round=n=>Math.round(Number(n||0)*10)/10,delay=ms=>new Promise(r=>setTimeout(r,ms));
      const collectionCounts=()=>({
        clientes:Orbit.store.all('clientes').length,
        polizas:Orbit.store.all('polizas').length,
        aseguradoras:Orbit.store.all('aseguradoras').length,
        cobros:Orbit.store.all('cobros').length,
        recibosEsperados:Orbit.store.all('recibosEsperados').length,
        carteraPrimas:Orbit.store.all('carteraPrimas').length
      });
      const sanitizePlan=plan=>({
        ok:plan?.ok!==false,
        hardError:plan?.hardError===true,
        denied:plan?.denied===true,
        errors:Array.isArray(plan?.errors)?plan.errors.slice(0,10):[],
        constraints:(Array.isArray(plan?.constraints)?plan.constraints:[]).map(c=>({
          field:String(c?.field||''),
          op:String(c?.op||''),
          valueClass:c?.field==='tenantId'?'tenant':c?.field==='country'?'country':c?.field==='advisorId'?'advisor':'other'
        }))
      });
      const storeState=()=>{
        let s={};
        try{s=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};}catch(e){s={statusError:String(e?.message||e)};}
        const qp=s?.queryPlans||{};
        return {
          ready:s?.ready===true,
          status:String(s?.status||''),
          version:String(s?.version||''),
          requiredStartupCollections:Array.isArray(s?.requiredStartupCollections)?s.requiredStartupCollections.slice():[],
          deferredCollections:Array.isArray(s?.deferredCollections)?s.deferredCollections.slice():[],
          attachedCollections:Array.isArray(s?.attachedCollections)?s.attachedCollections.slice():[],
          observedCollections:Array.isArray(s?.observedCollections)?s.observedCollections.slice():[],
          serverConfirmedCollections:Array.isArray(s?.serverConfirmedCollections)?s.serverConfirmedCollections.slice():[],
          cacheOnlyCollections:Array.isArray(s?.cacheOnlyCollections)?s.cacheOnlyCollections.slice():[],
          deniedCollections:Array.isArray(s?.deniedCollections)?s.deniedCollections.slice():[],
          snapshotSourceCartera:String(s?.snapshotSources?.carteraPrimas||''),
          snapshotErrorCartera:String(s?.snapshotErrors?.carteraPrimas||''),
          quarantinedCartera:Array.isArray(s?.quarantinedRows?.carteraPrimas)?s.quarantinedRows.carteraPrimas.length:0,
          carteraPlan:sanitizePlan(qp.carteraPrimas||{})
        };
      };
      const measure=(label,fn,repeats=1)=>{
        const samples=[];let valueClass='';
        for(let i=0;i<repeats;i++){
          const t=performance.now();const v=fn();samples.push(round(performance.now()-t));
          if(Array.isArray(v))valueClass='array:'+v.length;else if(v instanceof Map)valueClass='map:'+v.size;else valueClass=typeof v;
        }
        return {label,samplesMs:samples,maxMs:Math.max(...samples),valueClass};
      };

      window.__timing={dispatch:[],sync:[]};
      const nativeDispatch=EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent=function(ev){
        const tracked=ev&&['orbit:product-readonly-bootstrap','orbit:product-app','orbit:session','orbit:auth','orbit:store','hashchange'].includes(ev.type),phase=ev?.detail?.phase||'',collection=String(ev?.detail?.collection||''),t0=performance.now();
        try{return nativeDispatch.call(this,ev);}
        finally{if(tracked)window.__timing.dispatch.push({type:ev.type,phase,collection,ms:round(performance.now()-t0)});}
      };
      const old=Orbit.session,nativeSync=old.syncFromAuth;
      Orbit.session=Object.freeze(Object.assign({},old,{syncFromAuth:function(){const t=performance.now();try{return nativeSync.apply(old,arguments);}finally{window.__timing.sync.push({ms:round(performance.now()-t)});}}}));
      const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
      await c.modules.auth.signInWithCustomToken(c.auth,tok);
      const started=performance.now();
      let ok=true,error='';
      try{await Orbit.productAppP0.activate();}catch(e){ok=false;error=String(e?.message||e);}
      const activation={ok,error,durationMs:Math.round(performance.now()-started),timing:window.__timing,app:Orbit.productAppP0.status()};
      if(!ok)return {activation};

      const perf={startedAtMs:round(performance.now()),emissions:[],clientRenders:[],heartbeats:[],atActivation:[],afterFinance:[],renderWrapped:false,listenerAttached:false};
      const perfStart=performance.now();
      try{
        if(Orbit.store&&typeof Orbit.store.on==='function'){
          Orbit.store.on('*',function(collection){perf.emissions.push({collection:String(collection||'*'),atMs:round(performance.now()-perfStart)});});
          perf.listenerAttached=true;
        }
      }catch(e){perf.listenerError=String(e?.message||e);}
      try{
        const mod=Orbit.modules&&Orbit.modules.cliente360, nativeRender=mod&&mod.render;
        if(mod&&typeof nativeRender==='function'){
          mod.render=function(host){const t=performance.now();try{return nativeRender.apply(this,arguments);}finally{perf.clientRenders.push({atMs:round(performance.now()-perfStart),ms:round(performance.now()-t),route:String(Orbit?.route?.key||'')});}};
          perf.renderWrapped=mod.render!==nativeRender;
        }
      }catch(e){perf.renderWrapError=String(e?.message||e);}
      const timeCore=()=>[
        measure('store.all(clientes)',()=>Orbit.store.all('clientes'),3),
        measure('store.all(polizas)',()=>Orbit.store.all('polizas'),3),
        measure('store.all(cobros)',()=>Orbit.store.all('cobros'),3),
        measure('store.all(recibosEsperados)',()=>Orbit.store.all('recibosEsperados'),3),
        measure('store.all(carteraPrimas)',()=>Orbit.store.all('carteraPrimas'),3),
        measure('q.clientesResumenIndex',()=>Orbit.q.clientesResumenIndex(),3),
        measure('q.carteraGlobal',()=>Orbit.q.carteraGlobal(),3)
      ];
      perf.atActivation=timeCore();

      location.hash='#/cliente360';
      const earlyDeadline=Date.now()+10000;
      while(Date.now()<earlyDeadline){if(Orbit?.route?.key==='cliente360'&&document.querySelector('#host .page'))break;await delay(25);}
      let hbRun=true;
      const hbPromise=(async()=>{while(hbRun){const t=performance.now();await delay(20);const now=performance.now();perf.heartbeats.push({atMs:round(now-perfStart),delayMs:round(now-t)});}})();

      const hydration={atActivation:{counts:collectionCounts(),store:storeState()}};
      await delay(3000);
      hydration.after3s={counts:collectionCounts(),store:storeState()};
      await delay(5000);
      hydration.after8s={counts:collectionCounts(),store:storeState()};
      hbRun=false;await hbPromise;
      perf.afterFinance=timeCore();
      perf.heartbeatSummary={count:perf.heartbeats.length,maxMs:perf.heartbeats.length?Math.max(...perf.heartbeats.map(x=>x.delayMs)):0,over1000:perf.heartbeats.filter(x=>x.delayMs>=1000).slice(0,20)};
      perf.emissionCounts=perf.emissions.reduce((acc,x)=>(acc[x.collection]=(acc[x.collection]||0)+1,acc),{});

      location.hash='#/cliente360';
      const clientDeadline=Date.now()+10000;
      while(Date.now()<clientDeadline){if(Orbit?.route?.key==='cliente360'&&document.querySelector('#host .c360-pagination'))break;await delay(25);}
      await delay(100);
      const batch=Orbit.clientProjection?.withReadBatch?.(['clientes'],x=>x)||{clientes:[]};
      const kpis=[...document.querySelectorAll('#host .kpi')].map((node,i)=>({index:i,label:(node.querySelector('.k-label')?.textContent||'').replace(/\s+/g,' ').trim(),value:(node.querySelector('.k-val')?.textContent||'').replace(/\s+/g,' ').trim()}));
      const client={
        routeKey:Orbit?.route?.key||'',
        rawTotal:Orbit.store.all('clientes').length,
        projectionTotal:Array.isArray(batch.clientes)?batch.clientes.length:0,
        visibleRows:document.querySelectorAll('#host table.tbl tbody tr.clickable').length,
        paginationText:(document.querySelector('#host .c360-pagination')?.textContent||'').replace(/\s+/g,' ').trim(),
        kpis,
        hasPage:!!document.querySelector('#host .page'),
        hasTable:!!document.querySelector('#host table.tbl')
      };
      const hb0=performance.now();await delay(20);client.heartbeatMs=round(performance.now()-hb0);

      location.hash='#/aseguradoras';
      const listDeadline=Date.now()+10000;
      while(Date.now()<listDeadline){if(Orbit?.route?.key==='aseguradoras'&&document.querySelector('#host .page'))break;await delay(25);}
      await delay(100);
      const rows=Orbit.store.all('aseguradoras')||[];
      const chosen=rows.find(x=>x&&((Array.isArray(x.portales)&&x.portales.length)||(Array.isArray(x.cuentas)&&x.cuentas.length)))||rows[0]||null;
      let insurer={candidate:chosen?{idPresent:!!chosen.id,portalCount:Array.isArray(chosen.portales)?chosen.portales.length:0,accountCount:Array.isArray(chosen.cuentas)?chosen.cuentas.length:0,credentialBearing:Array.isArray(chosen.portales)&&chosen.portales.some(p=>p&&(p.password||p.pass||p.contrasena||p.clave||p.credentialRef))}:null};
      if(chosen&&chosen.id){
        location.hash='#/aseguradoras?ficha='+encodeURIComponent(chosen.id);
        const detailDeadline=Date.now()+10000;
        while(Date.now()<detailDeadline){if(String(Orbit?.route?.params?.ficha||'')===String(chosen.id)&&document.querySelector('#asg-ficha'))break;await delay(25);}
        await delay(200);
        const snap=()=>({
          routeFichaMatches:String(Orbit?.route?.params?.ficha||'')===String(chosen.id),
          ownerVersion:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.version||'',
          rootExists:!!document.querySelector('#asg-ficha'),
          portalsContainer:!!document.querySelector('#af-portales'),
          accountsContainer:!!document.querySelector('#af-cuentas'),
          basePortalRows:document.querySelectorAll('#af-portales .asg-row[data-portal]').length,
          baseBankRows:document.querySelectorAll('#af-cuentas .asg-row[data-cta]').length,
          portalCards:document.querySelectorAll('#asg-ficha .od-operational-portal-card').length,
          bankCards:document.querySelectorAll('#asg-ficha .od-operational-bank-card').length,
          reveals:document.querySelectorAll('#asg-ficha [data-od-credential-reveal]').length,
          bankVisible:[...document.querySelectorAll('#asg-ficha [data-od-bank-number]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/pendiente/i.test(t);}).length
        });
        insurer.before=snap();
        try{insurer.directRenderResult=Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.render?.()===true;}catch(e){insurer.directRenderError=String(e?.message||e);}
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        insurer.afterDirect=snap();
        const buttons=[...document.querySelectorAll('#asg-ficha button,#asg-ficha [role="tab"],#asg-ficha .tab')];
        const click=rx=>{const el=buttons.find(x=>rx.test((x.textContent||'').trim()));if(el){el.click();return true;}return false;};
        insurer.clickedOperational=click(/plataform|portal|acceso|cuenta|banc/i);
        await delay(150);
        try{Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.render?.();}catch(e){}
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        insurer.final=snap();
      }
      return {activation,hydration,performanceDiscriminant:perf,client,insurer};
    },token);
    Object.assign(rec,out);
  }catch(e){
    rec.harnessError=String(e?.message||e);
    ev.errors.push(name+':'+rec.harnessError);
  }finally{
    await ctx.close();
  }
}

let browser;
try{
  if(!target)throw new Error('NO_ACTIVE_TARGET');
  browser=await chromium.launch({headless:true});
  await one(browser,'structure-observation');
}catch(e){
  ev.errors.push(String(e?.message||e));
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i4a-bootstrap-diagnostic.json'),JSON.stringify(ev,null,2)+'\n');
  console.log(JSON.stringify(ev,null,2));
}
