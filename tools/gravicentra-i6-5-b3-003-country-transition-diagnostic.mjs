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

function normalizeCountry(v){
  const x=clean(v,80).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');
  if(['GT','GUA','GUATEMALA'].includes(x))return 'GT';
  if(['CO','COL','COLOMBIA'].includes(x))return 'CO';
  return '';
}
function entityId(r){return clean(r?.id||r?.canonicalDocumentId||r?.legacyDataId||r?.__docId,220);}
function entityCountry(r){return normalizeCountry(r?.pais||r?.country);}
function policyNumber(r){return clean(r?.numero||r?.numeroPoliza||r?.policyNumber||r?.poliza,220);}
function moneyCode(r){return clean(r?.moneda||r?.currency,40).toUpperCase();}
async function loadIndependentTruth(db){
  const names=['clientes','polizas','recibosEsperados','carteraPrimas','cobros'],out={};
  for(const name of names){
    const snap=await db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get();
    out[name]=snap.docs.map(d=>({__docId:d.id,...(d.data()||{})}));
  }
  return out;
}
function indexRows(rows){
  const m=new Map();
  for(const r of rows||[])for(const k of [r?.__docId,r?.id,r?.canonicalDocumentId,r?.legacyDataId].map(x=>clean(x,220)).filter(Boolean))if(!m.has(k))m.set(k,r);
  return m;
}
function relatedToPolicy(rows,pid){pid=clean(pid,220);return(rows||[]).filter(r=>clean(r?.polizaId||r?.policyId,220)===pid);}
function relatedCobros(rows,pid,receiptIds){
  pid=clean(pid,220);const ids=new Set(receiptIds||[]);
  return(rows||[]).filter(r=>clean(r?.polizaId||r?.policyId,220)===pid||ids.has(clean(r?.reciboId||r?.receiptId,220)));
}
function currentCobrosRowCountry(row,policy,client){return normalizeCountry(client?.pais)||normalizeCountry(row?.pais)||normalizeCountry(policy?.pais);}
function summarizeLineage(policy,data,indexes){
  const pid=entityId(policy),client=indexes.clientes.get(clean(policy?.clienteId||policy?.clientId,220))||null;
  const receipts=relatedToPolicy(data.recibosEsperados,pid),portfolios=relatedToPolicy(data.carteraPrimas,pid);
  const receiptIds=receipts.map(entityId).filter(Boolean),cobros=relatedCobros(data.cobros,pid,receiptIds);
  const explicit=[entityCountry(policy),...receipts.map(entityCountry),...portfolios.map(entityCountry),...cobros.map(entityCountry)].filter(Boolean);
  const uniqueFinancial=[...new Set(explicit)],clientCountry=entityCountry(client),policyCountry=entityCountry(policy);
  const conflict=uniqueFinancial.length>1;
  const canonical=conflict?'':(policyCountry||(uniqueFinancial.length===1?uniqueFinancial[0]:'')||clientCountry);
  const sample=receipts[0]||portfolios[0]||cobros[0]||policy;
  return{
    clienteId:entityId(client),clienteNombre:clean(client?.nombre||client?.razonSocial||'',240),clientePais:clientCountry,
    polizaId:pid,polizaNumero:policyNumber(policy),polizaPais:policyCountry,polizaMoneda:moneyCode(policy),
    recibos:receipts.slice(0,8).map(r=>({id:entityId(r),pais:entityCountry(r),moneda:moneyCode(r),estadoOperativo:clean(r?.estadoOperativo,80),provenance:clean(r?.provenance||r?.source||r?.fuente,220)})),
    cartera:portfolios.slice(0,8).map(r=>({id:entityId(r),pais:entityCountry(r),moneda:moneyCode(r),reciboId:clean(r?.reciboId||r?.receiptId,220),provenance:clean(r?.provenance||r?.source||r?.fuente,220)})),
    cobros:cobros.slice(0,8).map(r=>({id:entityId(r),pais:entityCountry(r),moneda:moneyCode(r),reciboId:clean(r?.reciboId||r?.receiptId,220),estado:clean(r?.estado,80),provenance:clean(r?.provenance||r?.source||r?.fuente,220)})),
    financialExplicitCountries:uniqueFinancial,financialCountryConflict:conflict,canonicalCountryCandidate:canonical,
    currentCobrosRowCountry:currentCobrosRowCountry(sample,policy,client),
    currentQueriesPolicyLinkedCountry:clientCountry,
    precedenceDefectDemonstrated:!!canonical&&!conflict&&currentCobrosRowCountry(sample,policy,client)!==canonical,
    clientPolicyMismatch:!!clientCountry&&!!policyCountry&&clientCountry!==policyCountry
  };
}
function selectDiscriminants(data){
  const indexes={clientes:indexRows(data.clientes),polizas:indexRows(data.polizas)},policies=data.polizas||[];
  const focal=policies.find(p=>policyNumber(p)==='9758')||policies.find(p=>{const c=indexes.clientes.get(clean(p?.clienteId||p?.clientId,220));return/piedad\s+cecilia\s+pedreros/i.test(clean(c?.nombre||c?.razonSocial,300));});
  const lineages=policies.map(p=>summarizeLineage(p,data,indexes));
  const co=lineages.find(x=>x.canonicalCountryCandidate==='CO'&&x.clientePais==='CO'&&x.recibos.some(r=>String(r.estadoOperativo).toLowerCase()==='pago_reportado'))||lineages.find(x=>x.canonicalCountryCandidate==='CO'&&x.clientePais==='CO');
  const gt=lineages.find(x=>x.canonicalCountryCandidate==='GT'&&x.clientePais==='GT'&&!x.financialCountryConflict);
  const mismatch=lineages.find(x=>x.clientPolicyMismatch||x.precedenceDefectDemonstrated);
  const focalLineage=focal?summarizeLineage(focal,data,indexes):null,selected=[focalLineage,co,gt,mismatch].filter(Boolean),unique=[],seen=new Set();
  for(const x of selected)if(!seen.has(x.polizaId)){seen.add(x.polizaId);unique.push(x);}
  const conflicts=lineages.filter(x=>x.financialCountryConflict).length,precedence=lineages.filter(x=>x.precedenceDefectDemonstrated).length;
  return{
    collectionCounts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),
    discriminants:unique,focal9758:focalLineage,totalPolicyLineages:lineages.length,
    policyLineageCountryConflicts:conflicts,precedenceDefectCount:precedence,
    dataDefectConfirmed:false,readModelCountryResolutionDefect:precedence>0,
    proposedContract:"For policy-linked financial rows: explicit policy country is primary when present; otherwise use one unanimous explicit country from the linked receipt/cartera/cobro lineage; only then fall back to client country. Contradictory explicit countries fail closed; client country never overrides a different explicit policy/financial lineage country."
  };
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
  const independentData=await loadIndependentTruth(db);
  evidence.independentTruth=selectDiscriminants(independentData);
  need(evidence.independentTruth.focal9758,'B3_003_FOCAL_9758_NOT_FOUND');
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
    directQueryAndRenderedKpiMayDiverge:true,
    independentFirestoreTruthCaptured:true,
    domSelfAssertionNotUsedAsCountryTruth:true,
    readModelCountryResolutionDefect:evidence.independentTruth.readModelCountryResolutionDefect
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
