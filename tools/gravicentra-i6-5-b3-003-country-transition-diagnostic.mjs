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
const EXPECTED_SOURCE=String(process.env.EXPECTED_SOURCE_SHA||'').trim();
const EXPECTED_BUILD=String(process.env.EXPECTED_BUILD_ID||'').trim();
const OUT=process.env.B3_003_COUNTRY_DIAG_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b3-003-country-transition-diagnostic.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex').slice(0,16);
const need=(v,c)=>{if(!v)throw new Error(c);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  throw new Error('B3_003_COUNTRY_DIAG_SERVICE_ACCOUNT_MISSING');
}
function roles(m){return [...new Set([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol,m?.defaultRole,m?.activeRole].map(x=>clean(x,100)).filter(Boolean))];}
async function actor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),out=[];
  for(const d of snap.docs){
    const m=d.data()||{},rr=roles(m),rn=rr.map(norm),st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'].includes(x)))continue;
    for(const uid of [...new Set([m.uid,d.id].map(x=>clean(x,180)).filter(Boolean))]){
      try{const u=await auth.getUser(uid);if(!u.disabled){out.push({uid:u.uid,roles:rr,score:(rn.includes('direccion')?100:0)+rr.length});break;}}catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);need(out.length,'B3_003_COUNTRY_DIAG_NO_ACTOR');return out[0];
}
async function signIn(page,auth,a){
  const token=await auth.createCustomToken(a.uid,{b3003CountryDiag:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros,null,{timeout:20000});
  await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    const st=Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():await Orbit.productAppP0.activate();
    if(!st?.started)throw new Error('PRODUCT_APP_NOT_STARTED');
  },token);
}
async function waitHydration(page){
  await page.waitForFunction(()=>{
    const s=window.Orbit?.store?._productStatus?.()||{},a=[].concat(s.serverConfirmedCollections||[]);
    return ['clientes','polizas','cobros','carteraPrimas','recibosEsperados','vehiculos'].every(x=>a.includes(x));
  },null,{timeout:25000});
}
async function installTrace(page){
  await page.evaluate(()=>{
    const t=window.__b3003country={events:[],renders:[],mutations:[],seq:0};
    const sig=()=>{
      const host=document.getElementById('host');
      const k=[...host?.querySelectorAll?.('[data-currency-safe-metric]')||[]].map(n=>(n.textContent||'').trim());
      const aging=[...host?.querySelectorAll?.('[data-aging-currency]')||[]].map(n=>n.getAttribute('data-aging-currency'));
      const rows=[...host?.querySelectorAll?.('table.tbl tbody tr')||[]].slice(0,15).map(n=>(n.textContent||'').replace(/\s+/g,' ').trim().slice(0,350));
      return {at:performance.now(),country:window.Orbit?.pais||'',selected:document.getElementById('pais-sel')?.value||'',kpis:k,aging,rowCount:host?.querySelectorAll?.('table.tbl tbody tr')?.length||0,rows};
    };
    const pushEvent=(type)=>t.events.push({seq:++t.seq,type,at:performance.now(),country:window.Orbit?.pais||'',selected:document.getElementById('pais-sel')?.value||''});
    document.addEventListener('orbit:pais',()=>pushEvent('orbit:pais'));
    window.addEventListener('hashchange',()=>pushEvent('hashchange'));
    const mod=window.Orbit?.modules?.cobros;
    if(mod&&typeof mod.render==='function'&&!mod.__b3003CountryWrapped){
      const original=mod.render.bind(mod);
      mod.render=function(host){
        const before=sig(),started=performance.now();
        let ret,err='';
        try{ret=original(host);}catch(e){err=String(e?.stack||e);throw e;}
        finally{t.renders.push({seq:++t.seq,started,duration:performance.now()-started,before,after:sig(),error:err});}
        return ret;
      };
      mod.__b3003CountryWrapped=true;
    }
    const host=document.getElementById('host');
    if(host){
      let queued=false;
      const mo=new MutationObserver(()=>{
        if(queued)return;queued=true;
        queueMicrotask(()=>{queued=false;const s=sig(),last=t.mutations[t.mutations.length-1];const key=JSON.stringify([s.country,s.selected,s.kpis,s.aging,s.rowCount,s.rows[0]||'']);if(!last||last.key!==key)t.mutations.push({seq:++t.seq,key,snapshot:s});});
      });
      mo.observe(host,{childList:true,subtree:true,characterData:true});
      t.observer=mo;
    }
    t.reset=()=>{t.events=[];t.renders=[];t.mutations=[];t.seq=0;};
    t.snapshot=sig;
  });
}
async function transition(page,country){
  await page.evaluate(()=>window.__b3003country.reset());
  await page.selectOption('#pais-sel',country);
  await sleep(1200);
  return page.evaluate(country=>{
    const t=window.__b3003country,host=document.getElementById('host');
    const tableRows=[...host.querySelectorAll('table.tbl tbody tr')].map(n=>(n.textContent||'').replace(/\s+/g,' ').trim());
    const countryTokens={GT:tableRows.filter(x=>/·\s*GT\b/.test(x)).length,CO:tableRows.filter(x=>/·\s*CO\b/.test(x)).length};
    const adapter=window.Orbit?.cobrosCarteraProjectionAdapter;
    const snap=adapter?.snapshot?.('')||{};
    const rowCountries=(rows)=>[...new Set((rows||[]).map(r=>{
      const p=Orbit.store.get('polizas',r?.polizaId)||{},c=Orbit.store.get('clientes',r?.clienteId||p.clienteId)||{};
      return String(c.pais||r?.pais||'').trim();
    }).filter(Boolean))];
    return {
      requested:country,final:t.snapshot(),events:t.events.slice(),renders:t.renders.slice(),mutations:t.mutations.slice(),
      direct:{cart:Orbit.q.carteraGlobalPorMoneda(),aging:Orbit.q.agingVencidoPorMoneda()},
      renderedTable:{rows:tableRows.length,countryTokens,firstRows:tableRows.slice(0,20)},
      adapter:{cobros:(snap.cobros||[]).length,reported:(snap.reported||[]).length,portfolio:(snap.portfolio||[]).length,cobroCountries:rowCountries(snap.cobros),reportedCountries:rowCountries(snap.reported),portfolioCountries:rowCountries(snap.portfolio)}
    };
  },country);
}

need(TARGET,'B3_003_COUNTRY_DIAG_TARGET_REQUIRED');
let app,browser;
const evidence={schema:'GRAVICENTRA_I6_5_B3_003_COUNTRY_TRANSITION_DIAGNOSTIC_V1',recordedAt:new Date().toISOString(),target:{url:TARGET,expectedSourceSha:EXPECTED_SOURCE,expectedBuildId:EXPECTED_BUILD},boundaries:{readOnly:true,businessWrites:0,reimport:false,livePromotion:false},transitions:{},errors:[]};
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b3-003-country-'+Date.now());
  const db=getFirestore(app),auth=getAuth(app),a=await actor(db,auth);evidence.actor={uidHash:hash(a.uid),roles:a.roles};
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1500,height:1000}});
  const page=await ctx.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>evidence.errors.push('page:'+clean(e?.message||e,1200)));
  page.on('console',m=>{if(m.type()==='error')evidence.errors.push('console:'+clean(m.text(),1200));});
  await page.goto(TARGET+'/?countrydiag='+Date.now()+'#/cobros',{waitUntil:'domcontentloaded',timeout:30000});
  const marker=await page.evaluate(async()=>{const r=await fetch('/__recovery__/build.json?countrydiag='+Date.now(),{cache:'no-store'});return r.json();});
  need(!EXPECTED_SOURCE||marker?.sourceSha===EXPECTED_SOURCE,'B3_003_COUNTRY_DIAG_SOURCE_DRIFT');
  need(!EXPECTED_BUILD||marker?.buildId===EXPECTED_BUILD,'B3_003_COUNTRY_DIAG_BUILD_DRIFT');
  await signIn(page,auth,a);await waitHydration(page);
  await page.evaluate(()=>{location.hash='#/cobros';});await sleep(500);
  await installTrace(page);
  evidence.transitions.CO=await transition(page,'CO');
  evidence.transitions.GT=await transition(page,'GT');
  evidence.transitions.TODOS=await transition(page,'TODOS');
  const co=evidence.transitions.CO,gt=evidence.transitions.GT;
  evidence.demonstrated={
    renderedCountryLeak:co.renderedTable.countryTokens.GT>0||gt.renderedTable.countryTokens.CO>0,
    adapterVsRendererSplit:(co.adapter.cobroCountries.length===0||co.adapter.cobroCountries.every(x=>x==='CO'))&&co.renderedTable.countryTokens.GT>0,
    multipleRenderOnCountryChange:[co,gt].some(x=>x.renders.length>1),
    multipleDistinctDomStates:[co,gt].some(x=>x.mutations.length>1),
    directQueryAndRenderedKpiMayDiverge:true
  };
  evidence.status='DIAGNOSTIC_COMPLETE';
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B3_003_COUNTRY_DIAGNOSTIC=COMPLETE');
  console.log('B3_003_COUNTRY_DISCRIMINANTS='+JSON.stringify({CO:{renders:co.renders.length,mutations:co.mutations.length,table:co.renderedTable.countryTokens,adapter:co.adapter,directCurrencies:co.direct.cart.currencies,kpis:co.final.kpis},GT:{renders:gt.renders.length,mutations:gt.mutations.length,table:gt.renderedTable.countryTokens,adapter:gt.adapter,directCurrencies:gt.direct.cart.currencies,kpis:gt.final.kpis}}));
}catch(error){
  evidence.status='FAIL';evidence.failure=clean(error?.stack||error?.message||error,5000);
  try{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');}catch{}
  throw error;
}finally{
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
}
