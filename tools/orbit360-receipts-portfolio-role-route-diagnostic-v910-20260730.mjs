#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const OUT=path.join(process.cwd(),'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-role-route-diagnostic-v910.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const ROLES=['Dirección','Operativo','Asesor'];
const report={schemaVersion:'orbit360-receipts-portfolio-role-route-diagnostic-v910',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false,roles:{},receipts:{}};
const clean=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/\s+/g,' ').trim().slice(0,220);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
async function selectRole(page,target){
  const selection=await page.evaluate(roleName=>{const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];const sel=document.getElementById('rol-sel');if(!allowed.includes(roleName))return{ok:false,allowedCount:allowed.length};if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===roleName||String(x.textContent||'').trim()===roleName);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'select'};}}return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(roleName)),via:'session'};},target);
  await page.waitForFunction(roleName=>Boolean(window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===roleName),target,{timeout:15000});
  await page.waitForTimeout(450);return selection;
}
async function route(page,hash){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(1200);}
async function receiptSnapshot(page,sampleClientId){return page.evaluate(cid=>{
  const host=document.getElementById('host'),body=document.getElementById('c360-body'),mod=Orbit.modules&&Orbit.modules.cliente360,q=Orbit.q||{};
  const active=document.querySelector('#ficha-tabs .ftab.active,.ficha-tabs .ftab.active');
  const text=host?String(host.innerText||''):'';
  let canViewSample=null,canModule=null,projection=null;
  try{const row=Orbit.store.get('clientes',cid);canViewSample=Boolean(Orbit.access&&Orbit.access.canView?Orbit.access.canView('clientes',row,'cliente360'):true);}catch(e){}
  try{canModule=Boolean(Orbit.access&&Orbit.access.can?Orbit.access.can('cliente360','view'):true);}catch(e){}
  try{projection=Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.status?Orbit.receiptsPortfolioProjectionV910.status():null;}catch(e){}
  return{
    role:String(Orbit.session&&Orbit.session.rol?Orbit.session.rol()||'':''),routeKey:String(Orbit.route&&Orbit.route.key||''),
    routeParamKeys:Orbit.route&&Orbit.route.params?Object.keys(Orbit.route.params).sort():[],routeClientMatches:Boolean(Orbit.route&&Orbit.route.params&&Orbit.route.params.c===cid),routeTab:String(Orbit.route&&Orbit.route.params&&Orbit.route.params.t||''),
    canModule,canViewSample,hostExists:Boolean(host),hostChildCount:host?host.children.length:0,c360Body:Boolean(body),c360BodyChildCount:body?body.children.length:0,
    activeTab:String(active&&active.dataset&&active.dataset.tab||''),rpPolicy:Boolean(document.getElementById('rp-v910-policy')),kpis:Boolean(document.querySelector('.rp-v910-kpis')),
    fullpagePolicy:Boolean(document.querySelector('[data-policy-fullpage="1"]')),fullpageVehicle:Boolean(document.querySelector('[data-vehicle-fullpage="1"]')),
    denied:Boolean(text.includes('Acceso restringido')||text.includes('No tienes acceso con el rol activo')),moduleOwnerIdentity:Boolean(mod&&mod.__rpV910RenderOwner===mod.render),moduleOwnerMarker:Boolean(mod&&mod.render&&mod.render.__orbitRpV910ClientOwner===true),
    queryOwnerIdentity:Boolean(q.__rpV910ClienteResumenOwner===q.clienteResumen),queryOwnerMarker:Boolean(q.clienteResumen&&q.clienteResumen.__orbitRpV910QueryOwner===true),
    projectionReady:Boolean(projection&&projection.ready),projectionOwners:projection&&projection.owners?projection.owners:null
  };
},sampleClientId);}
let browser,page;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('DIAG_ENV_INVALID');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');report.labEntrypointBound=true;
  await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.blockingGates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;for(const [n,v] of Object.entries(expected)){if((Orbit.store.all(n)||[]).length!==v)return false;}const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:200});report.baselineReady=true;
  const sample=await page.evaluate(()=>{const rec=Orbit.store.all('recibosEsperados')||[],veh=Orbit.store.all('vehiculos')||[];const hist=r=>r&&((r.historicalExigible===true)||String(r.carteraTipo||'')==='cartera_historica_exigible'||String(r.exigibilidad||'')==='historica_exigible');const x=rec.find(r=>!hist(r)&&veh.some(v=>v.polizaId===r.polizaId))||rec[0];return x?{clienteId:x.clienteId}:null;});
  if(!sample||!sample.clienteId)throw new Error('DIAG_SAMPLE_UNAVAILABLE');
  report.receipts.directionSelection=await selectRole(page,'Dirección');await route(page,`#/cliente360?c=${sample.clienteId}&t=recibos`);
  report.receipts.afterRoute=await receiptSnapshot(page,sample.clienteId);
  await page.evaluate(()=>{try{Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.reconcileOwners&&Orbit.receiptsPortfolioProjectionV910.reconcileOwners();}catch(e){}});await page.waitForTimeout(400);
  report.receipts.afterReconcile=await receiptSnapshot(page,sample.clienteId);
  await page.evaluate(cid=>{try{Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.renderReceipts&&Orbit.receiptsPortfolioProjectionV910.renderReceipts(cid);}catch(e){}},sample.clienteId);await page.waitForTimeout(150);
  report.receipts.afterDirectRender=await receiptSnapshot(page,sample.clienteId);
  for(const target of ROLES){const selection=await selectRole(page,target);await route(page,'#/cliente360');const state=await page.evaluate(()=>{const host=document.getElementById('host');const tables=host?Array.from(host.querySelectorAll('table.tbl')):[];const visible=tables.filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});let canView=null;try{canView=Boolean(Orbit.access&&Orbit.access.can?Orbit.access.can('cliente360','view'):null);}catch(e){}return{activeRole:String(Orbit.session&&Orbit.session.rol?Orbit.session.rol()||'':''),routeKey:String(Orbit.route&&Orbit.route.key||''),canView,tableCount:tables.length,visibleTableCount:visible.length,rowCount:host?host.querySelectorAll('table.tbl tbody tr').length:0};});report.roles[target]={selection,state};}
  report.ok=true;report.status='ROLE_ROUTE_DIAGNOSTIC_CAPTURED';
}catch(error){report.ok=false;report.status='ROLE_ROUTE_DIAGNOSTIC_FAILED';report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
