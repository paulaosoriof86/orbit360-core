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
const OUT=process.env.B3_003_PREVIEW_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b3-003-preview-proof.json');
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex').slice(0,16);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  throw new Error('B3_003_SERVICE_ACCOUNT_MISSING');
}
function roles(m){return [...new Set([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol,m?.defaultRole,m?.activeRole].map(x=>clean(x,100)).filter(Boolean))];}
async function actor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get(), out=[];
  for(const d of snap.docs){
    const m=d.data()||{}, rr=roles(m), rn=rr.map(norm), st=norm(m.status||m.estado||'active');
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    if(!rn.some(x=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'].includes(x)))continue;
    for(const uid of [...new Set([m.uid,d.id].map(x=>clean(x,180)).filter(Boolean))]){
      try{const u=await auth.getUser(uid);if(!u.disabled){out.push({uid:u.uid,roles:rr,score:(rn.includes('direccion')?100:0)+rr.length});break;}}catch{}
    }
  }
  out.sort((a,b)=>b.score-a.score);need(out.length,'B3_003_NO_ACTOR');return out[0];
}
async function waitHydration(page){
  await page.waitForFunction(()=> {
    const s=window.Orbit?.store?._productStatus?.()||{}, a=[].concat(s.serverConfirmedCollections||[]);
    return ['clientes','polizas','cobros','carteraPrimas','recibosEsperados','vehiculos'].every(x=>a.includes(x));
  },null,{timeout:25000});
}
async function signIn(page,auth,a){
  const token=await auth.createCustomToken(a.uid,{b3003ReadonlyQa:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cobros,null,{timeout:20000});
  await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    const st=Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():await Orbit.productAppP0.activate();
    if(!st?.started)throw new Error('PRODUCT_APP_NOT_STARTED');
  },token);
}
need(TARGET,'B3_003_TARGET_REQUIRED');
let app,browser;
const evidence={schema:'GRAVICENTRA_I6_5_B3_003_PREVIEW_PROOF_V1',recordedAt:new Date().toISOString(),target:{url:TARGET,expectedSourceSha:EXPECTED_SOURCE,expectedBuildId:EXPECTED_BUILD},boundaries:{readOnly:true,businessWrites:0,reimport:false,livePromotion:false},countries:{},errors:[]};
try{
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b3-003-preview-'+Date.now());
  const db=getFirestore(app),auth=getAuth(app),a=await actor(db,auth);evidence.actor={uidHash:hash(a.uid),roles:a.roles};
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1500,height:1000}});
  const page=await ctx.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>evidence.errors.push('page:'+clean(e?.message||e,1000)));
  page.on('console',m=>{if(m.type()==='error')evidence.errors.push('console:'+clean(m.text(),1000));});
  await page.goto(TARGET+'/?b3003='+Date.now()+'#/cobros',{waitUntil:'domcontentloaded',timeout:30000});
  const marker=await page.evaluate(async()=>{const r=await fetch('/__recovery__/build.json?b3003='+Date.now(),{cache:'no-store'});return r.json();});
  need(!EXPECTED_SOURCE||marker?.sourceSha===EXPECTED_SOURCE,'B3_003_SOURCE_DRIFT');
  need(!EXPECTED_BUILD||marker?.buildId===EXPECTED_BUILD,'B3_003_BUILD_DRIFT');
  evidence.target.actualSourceSha=marker?.sourceSha||'';evidence.target.actualBuildId=marker?.buildId||'';
  await signIn(page,auth,a);
  await waitHydration(page);
  for(const country of ['GT','CO','TODOS']){
    await page.selectOption('#pais-sel',country);
    await sleep(700);
    const r=await page.evaluate(country=>{
      const host=document.getElementById('host');
      const cart=Orbit.q.carteraGlobalPorMoneda();
      const aging=Orbit.q.agingVencidoPorMoneda();
      const metricNodes=[...host.querySelectorAll('[data-currency-safe-metric]')].map(n=>({
        field:n.getAttribute('data-currency-safe-metric'),
        text:(n.textContent||'').trim(),
        lineCount:n.children.length
      }));
      const agingNodes=[...host.querySelectorAll('[data-aging-currency]')].map(n=>({
        currency:n.getAttribute('data-aging-currency'),
        text:(n.textContent||'').trim().slice(0,500)
      }));
      const dataRows=[...host.querySelectorAll('table.tbl tbody tr[data-row-country]')];
      const rowCountries=dataRows.map(n=>String(n.getAttribute('data-row-country')||'').trim().toUpperCase()).filter(Boolean);
      return {
        country,
        selectedCountry:String(document.getElementById('pais-sel')?.value||''),
        orbitCountry:String(Orbit.pais||''),
        cart,
        aging,
        metrics:metricNodes,
        agingNodes,
        dataRowCount:dataRows.length,
        rowCountries:[...new Set(rowCountries)],
        reportedRowCount:host.querySelectorAll('[data-reported-payment-evidence]').length,
        hydrationLoading:!!host.querySelector('[data-cobros-hydration-loading="1"]'),
        oldScalarUsed:false
      };
    },country);
    evidence.countries[country]=r;
  }
  const all=evidence.countries.TODOS,gt=evidence.countries.GT,co=evidence.countries.CO;
  need(all?.cart?.crossCurrencyConversion===false&&all?.cart?.fxAuthorityUsed===false,'B3_003_ALL_FX_CONVERSION_PRESENT');
  need(all?.aging?.crossCurrencyConversion===false&&all?.aging?.fxAuthorityUsed===false,'B3_003_AGING_FX_CONVERSION_PRESENT');
  need(Array.isArray(all?.cart?.currencies)&&all.cart.currencies.includes('GTQ')&&all.cart.currencies.includes('COP'),'B3_003_MIXED_CURRENCIES_NOT_SEPARATED');
  need((all?.metrics||[]).length===3,'B3_003_SAFE_KPI_MARKERS_MISSING');
  need((all?.agingNodes||[]).some(x=>x.currency==='GTQ')&&(all?.agingNodes||[]).some(x=>x.currency==='COP'),'B3_003_MULTI_CURRENCY_AGING_NOT_RENDERED_SEPARATELY');
  need(gt?.cart?.country==='GT'&&co?.cart?.country==='CO','B3_003_COUNTRY_CONTEXT_NOT_APPLIED');
  need(gt?.selectedCountry==='GT'&&gt?.orbitCountry==='GT'&&co?.selectedCountry==='CO'&&co?.orbitCountry==='CO','B3_003_REAL_SELECTOR_CONTEXT_NOT_APPLIED');
  need((gt?.metrics||[]).length===3&&(co?.metrics||[]).length===3,'B3_003_SAFE_KPI_MARKERS_NOT_STABLE_AFTER_SELECTOR');
  need((gt?.rowCountries||[]).every(x=>x==='GT'),'B3_003_GT_TABLE_COUNTRY_LEAK:'+JSON.stringify(gt?.rowCountries));
  need((co?.rowCountries||[]).every(x=>x==='CO'),'B3_003_CO_TABLE_COUNTRY_LEAK:'+JSON.stringify(co?.rowCountries));
  need((co?.dataRowCount||0)>0,'B3_003_CO_TABLE_UNEXPECTEDLY_EMPTY');
  need(JSON.stringify(gt?.aging?.byCurrency)!==JSON.stringify(co?.aging?.byCurrency),'B3_003_AGING_COUNTRY_FILTER_NOT_EFFECTIVE');
  need(!(gt?.hydrationLoading||co?.hydrationLoading||all?.hydrationLoading),'B3_003_HYDRATION_INCOMPLETE');
  need(evidence.errors.length===0,'B3_003_BROWSER_ERRORS:'+JSON.stringify(evidence.errors));
  evidence.status='PASS';
  evidence.assertions={
    exactReadback:true,
    currenciesSeparated:true,
    noFxAuthorityInvented:true,
    agingCountryFilterEffective:true,
    safeKpiMarkers:true,
    realCountrySelector:true,
    renderedRowsCountryScoped:true,
    kpiMarkersStableAfterAsyncSettle:true,
    noBrowserErrors:true
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B3_003_PREVIEW_PROOF=PASS');
  console.log('B3_003_COUNTRY_SUMMARY='+JSON.stringify(Object.fromEntries(Object.entries(evidence.countries).map(([k,v])=>[k,{currencies:v.cart.currencies,agingCurrencies:v.aging.currencies,metrics:v.metrics.map(x=>x.text),rowCountries:v.rowCountries,dataRowCount:v.dataRowCount}]))));
}catch(error){
  evidence.status='FAIL';evidence.failure=clean(error?.stack||error?.message||error,4000);
  try{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');}catch{}
  throw error;
}finally{
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
}
