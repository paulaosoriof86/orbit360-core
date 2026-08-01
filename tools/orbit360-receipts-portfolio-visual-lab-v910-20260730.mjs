#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';
import {TECHNICAL_COPY_PATTERN} from './orbit360-visible-technical-copy-predicate-v20260729.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-visual-lab-v910.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const ROLES=[['Dirección',{width:1440,height:1000}],['Operativo',{width:900,height:1100}],['Asesor',{width:390,height:844}]];
const report={schemaVersion:'orbit360-receipts-portfolio-visual-lab-v911',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),stage:'init',checks:{},roleViews:{},counts:{},readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false,pageErrors:[],consoleErrors:[]};
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,420);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const need=(ok,code,detail='')=>{if(ok)return;const error=new Error(code+(detail?':'+detail:''));error.orbitCode=code;throw error;};
const isHist=r=>r&&((r.historicalExigible===true)||String(r.carteraTipo||'')==='cartera_historica_exigible'||String(r.exigibilidad||'')==='historica_exigible');

async function role(page,roleName){
  const result=await page.evaluate(target=>{const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];const sel=document.getElementById('rol-sel');if(!allowed.includes(target))return{ok:false,count:allowed.length,active:Orbit.session&&Orbit.session.rol?Orbit.session.rol():''};if(sel){const option=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(option){sel.value=option.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'selector'};}}return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(target)),via:'session'};},roleName);
  need(result&&result.ok,'ROLE_SELECTION_FAILED',roleName);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,roleName,{timeout:15000,polling:50});
  await page.waitForTimeout(350);
}

async function route(page,hash){
  const key=String(hash||'').replace(/^#\/?/,'').split('?')[0]||'inicio';
  await page.evaluate(h=>{if(location.hash===h)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=h;},hash);
  await page.waitForFunction(expected=>window.Orbit&&Orbit.route&&Orbit.route.key===expected,key,{timeout:15000,polling:50});
  await page.waitForTimeout(250);
}

async function technicalCopy(page){return page.evaluate(pattern=>new RegExp(pattern,'i').test(document.body.innerText||''),TECHNICAL_COPY_PATTERN);}

async function readHydrationState(page,expected){
  return page.evaluate(exp=>{
    const counts={};
    for(const name of Object.keys(exp)){try{counts[name]=(Orbit.store.all(name)||[]).length;}catch(error){counts[name]=-1;}}
    let projection=null;
    try{projection=Orbit.store&&Orbit.store._receiptsPortfolioProjectionStatus?Orbit.store._receiptsPortfolioProjectionStatus():null;}catch(error){projection={error:String(error&&error.message||error).slice(0,120)};}
    let visualProjection=null;
    try{visualProjection=Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.status?Orbit.receiptsPortfolioProjectionV910.status():null;}catch(error){visualProjection={error:String(error&&error.message||error).slice(0,120)};}
    let lab=null;
    try{lab=Orbit.store&&Orbit.store._labStatus?Orbit.store._labStatus():null;}catch(error){lab={error:String(error&&error.message||error).slice(0,120)};}
    let canonical=null;
    try{canonical=window.OrbitLabCanonicalViewSync&&OrbitLabCanonicalViewSync.status?OrbitLabCanonicalViewSync.status():null;}catch(error){canonical={error:String(error&&error.message||error).slice(0,120)};}
    const exact=Object.keys(exp).every(name=>counts[name]===exp[name])&&Boolean(projection&&projection.ready&&projection.counts&&projection.counts.recibosEsperados===exp.recibosEsperados&&projection.counts.carteraPrimas===exp.carteraPrimas);
    const compactProjection=p=>p?{version:String(p.version||''),ownerRevision:String(p.ownerRevision||''),ready:Boolean(p.ready),counts:p.counts||{},attached:Array.isArray(p.attached)?p.attached.slice():[],owners:p.owners||{},errors:p.errors||{}}:null;
    return{
      exact,
      counts,
      projection:compactProjection(projection),
      visualProjection:compactProjection(visualProjection),
      authSignedIn:Boolean(window.firebase&&firebase.auth&&firebase.auth().currentUser),
      routeKey:String(window.Orbit&&Orbit.route&&Orbit.route.key||''),
      hash:String(location.hash||''),
      canonical:canonical?{ready:Boolean(canonical.ready),status:String(canonical.status||''),counts:canonical.counts||{},errors:canonical.errors||{}}:null,
      lab:lab?{ready:Boolean(lab.ready),status:String(lab.status||''),lastError:String(lab.lastError||''),lastExtra:String(lab.lastExtra||''),criticalReadReady:Boolean(lab.criticalReadReady),criticalReadCounts:lab.criticalReadCounts||{},criticalReadError:String(lab.criticalReadError||''),snapshotErrorKeys:Object.keys(lab.snapshotErrors||{}).sort()}:null
    };
  },expected);
}

function compactState(state,elapsedMs){
  const cleanMap=value=>Object.fromEntries(Object.entries(value||{}).map(([key,val])=>[key,typeof val==='string'?clean(val):val]));
  return{
    elapsedMs,
    exact:Boolean(state&&state.exact),
    counts:state&&state.counts||{},
    projection:state&&state.projection?{version:state.projection.version,ownerRevision:state.projection.ownerRevision,ready:state.projection.ready,counts:state.projection.counts,attached:state.projection.attached,owners:state.projection.owners,errors:cleanMap(state.projection.errors)}:null,
    visualProjection:state&&state.visualProjection?{version:state.visualProjection.version,ownerRevision:state.visualProjection.ownerRevision,ready:state.visualProjection.ready,counts:state.visualProjection.counts,attached:state.visualProjection.attached,owners:state.visualProjection.owners,errors:cleanMap(state.visualProjection.errors)}:null,
    authSignedIn:Boolean(state&&state.authSignedIn),
    routeKey:String(state&&state.routeKey||''),
    hash:String(state&&state.hash||''),
    canonical:state&&state.canonical?{ready:state.canonical.ready,status:clean(state.canonical.status),counts:state.canonical.counts,errors:cleanMap(state.canonical.errors)}:null,
    lab:state&&state.lab?{ready:state.lab.ready,status:clean(state.lab.status),lastError:clean(state.lab.lastError),lastExtra:clean(state.lab.lastExtra),criticalReadReady:state.lab.criticalReadReady,criticalReadCounts:state.lab.criticalReadCounts,criticalReadError:clean(state.lab.criticalReadError),snapshotErrorKeys:state.lab.snapshotErrorKeys}:null
  };
}

async function waitForHydration(page,expected,{timeoutMs=90000,pollMs=500}={}){
  const started=Date.now();
  const timeline=[];
  let lastSignature='';
  let lastSampleAt=-5000;
  let lastState=null;
  while(Date.now()-started<=timeoutMs){
    lastState=await readHydrationState(page,expected);
    const elapsed=Date.now()-started;
    const signature=JSON.stringify({counts:lastState.counts,projection:lastState.projection&&{ready:lastState.projection.ready,counts:lastState.projection.counts,attached:lastState.projection.attached,owners:lastState.projection.owners,errors:lastState.projection.errors},auth:lastState.authSignedIn,lab:lastState.lab&&{status:lastState.lab.status,lastError:lastState.lab.lastError,criticalReadReady:lastState.lab.criticalReadReady,criticalReadCounts:lastState.lab.criticalReadCounts}});
    if(signature!==lastSignature||elapsed-lastSampleAt>=5000){timeline.push(compactState(lastState,elapsed));lastSignature=signature;lastSampleAt=elapsed;}
    if(lastState.exact)return{state:lastState,timeline};
    await page.waitForTimeout(pollMs);
  }
  return{state:lastState,timeline,timeout:true};
}

let browser,page;
try{
  need(/^https:\/\//.test(url),'LAB_URL_REQUIRED');need(email.includes('@'),'LAB_EMAIL_REQUIRED');need(password.length>=8,'LAB_PASSWORD_REQUIRED');
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>{if(report.pageErrors.length<12)report.pageErrors.push(clean(error&&error.message||error));});
  page.on('console',message=>{if(message.type()==='error'&&report.consoleErrors.length<12)report.consoleErrors.push(clean(message.text()));});
  const labEntry=new URL(url);labEntry.searchParams.set('orbitBackend','firestore-lab');labEntry.searchParams.set('tenant','alianzas-soluciones');labEntry.searchParams.set('runtime','receipts-portfolio-v911');report.checks.labEntrypointBound=true;
  report.stage='navigate';await page.goto(labEntry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.stage='blocking_gates';const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});report.blockingGates=gates;need(gates&&gates.ok&&gates.remaining===0,'BLOCKING_GATE_NOT_SETTLED');
  report.stage='hydrate';
  const hydration=await waitForHydration(page,EXPECT,{timeoutMs:90000,pollMs:500});
  report.hydrationTimeline=hydration.timeline;
  report.hydrationFinal=compactState(hydration.state,hydration.timeline.length?hydration.timeline[hydration.timeline.length-1].elapsedMs:0);
  need(!hydration.timeout&&hydration.state&&hydration.state.exact,'HYDRATION_TIMEOUT');
  report.counts=hydration.state.counts;
  need(JSON.stringify(report.counts)===JSON.stringify(EXPECT),'BASELINE_COUNTS_INVALID');report.checks.baseline=true;report.checks.projectionReady=true;report.checks.downstreamZero=report.counts.cobros===0&&report.counts.finmovs===0;
  const samples=await page.evaluate(()=>{const rec=Orbit.store.all('recibosEsperados')||[],car=Orbit.store.all('carteraPrimas')||[],veh=Orbit.store.all('vehiculos')||[];const hist=r=>r&&((r.historicalExigible===true)||String(r.carteraTipo||'')==='cartera_historica_exigible'||String(r.exigibilidad||'')==='historica_exigible');const activeWithVehicle=rec.find(r=>!hist(r)&&veh.some(v=>v.polizaId===r.polizaId));const historical=rec.find(hist);const reported=rec.find(r=>String(r.estadoOperativo||'')==='pago_reportado');return{active:activeWithVehicle?{clienteId:activeWithVehicle.clienteId,polizaId:activeWithVehicle.polizaId}:null,historical:historical?{clienteId:historical.clienteId,polizaId:historical.polizaId}:null,reported:reported?{clienteId:reported.clienteId,polizaId:reported.polizaId}:null,historicalPortfolio:car.filter(hist).length};});
  need(samples.active&&samples.historical&&samples.reported,'VISUAL_SAMPLE_UNAVAILABLE');need(samples.historicalPortfolio===32,'HISTORICAL_PORTFOLIO_COUNT_INVALID');
  report.stage='direction_semantics';await role(page,'Dirección');
  await route(page,`#/cliente360?c=${samples.active.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});let body=await page.locator('#c360-body').innerText();need(/Por vencer/.test(body)&&/Exigible/.test(body),'ACTIVE_PORTFOLIO_KPIS_MISSING');need(!(await technicalCopy(page)),'TECHNICAL_COPY_VISIBLE_DIRECTION');
  await route(page,`#/cliente360?c=${samples.historical.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});body=await page.locator('#c360-body').innerText();need(/Histórica exigible/.test(body),'HISTORICAL_EXIGIBLE_NOT_VISIBLE');
  await route(page,`#/cliente360?c=${samples.reported.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});body=await page.locator('#c360-body').innerText();need(/Pago reportado · por conciliar/.test(body),'PAYMENT_REPORTED_SEMANTIC_INVALID');
  await route(page,`#/cliente360?c=${samples.active.clienteId}&t=cobros`);await page.locator('#c360-body').waitFor({state:'visible',timeout:15000});body=await page.locator('#c360-body').innerText();need(/Aún no hay cobros aplicados/.test(body),'COBROS_ZERO_NOT_HONEST');need(!/Confirmar cobro/.test(body),'COBRO_ACTION_VISIBLE_BEFORE_COBROS_STAGE');
  report.checks.activeCalendar=true;report.checks.historicalExigible=true;report.checks.paymentReportedPendingReconciliation=true;report.checks.cobrosSeparated=true;
  for(const [roleName,viewport] of ROLES){report.stage='role_'+roleName;await page.setViewportSize(viewport);await role(page,roleName);await route(page,'#/cliente360');await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:15000});const state=await page.evaluate(()=>({rows:document.querySelectorAll('#host table.tbl tbody tr').length,role:Orbit.session.rol()}));need(state.rows>0,'CLIENT360_EMPTY_FOR_ROLE',roleName);need(!(await technicalCopy(page)),'TECHNICAL_COPY_VISIBLE_ROLE',roleName);report.roleViews[roleName]={viewport,rowsVisible:state.rows,technicalCopy:false};}
  need(report.pageErrors.length===0,'PAGE_ERRORS_VISIBLE',report.pageErrors[0]||'');
  report.stage='final';report.ok=true;report.status='VISUAL_LAB_PASS';
}catch(error){report.ok=false;report.status='VISUAL_LAB_FAIL';report.failureStage=report.stage;report.errorCode=String(error&&error.orbitCode||'UNCLASSIFIED_RUNTIME_ERROR');report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
