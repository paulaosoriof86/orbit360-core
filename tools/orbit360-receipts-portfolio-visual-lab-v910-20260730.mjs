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
const report={schemaVersion:'orbit360-receipts-portfolio-visual-lab-v910',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),stage:'init',checks:{},roleViews:{},counts:{},readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,420);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const need=(ok,code,detail='')=>{if(!ok)throw new Error(code+(detail?':'+detail:''));};
const isHist=r=>r&&((r.historicalExigible===true)||String(r.carteraTipo||'')==='cartera_historica_exigible'||String(r.exigibilidad||'')==='historica_exigible');
async function role(page,roleName){
  const result=await page.evaluate(target=>{const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];const sel=document.getElementById('rol-sel');if(!allowed.includes(target))return{ok:false,count:allowed.length};if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true};}}return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(target))};},roleName);
  need(result&&result.ok,'ROLE_SELECTION_FAILED',roleName);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,roleName,{timeout:15000});
  await page.waitForTimeout(350);
}
async function route(page,hash){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(650);}
async function technicalCopy(page){return page.evaluate(pattern=>new RegExp(pattern,'i').test(document.body.innerText||''),TECHNICAL_COPY_PATTERN);}
let browser,page;
try{
  need(/^https:\/\//.test(url),'LAB_URL_REQUIRED');need(email.includes('@'),'LAB_EMAIL_REQUIRED');need(password.length>=8,'LAB_PASSWORD_REQUIRED');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  const labEntry=new URL(url);labEntry.searchParams.set('orbitBackend','firestore-lab');labEntry.searchParams.set('tenant','alianzas-soluciones');report.checks.labEntrypointBound=true;
  report.stage='navigate';await page.goto(labEntry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.stage='blocking_gates';const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});report.blockingGates=gates;need(gates&&gates.ok&&gates.remaining===0,'BLOCKING_GATE_NOT_SETTLED');
  report.stage='hydrate';
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;const names=Object.keys(expected);for(const n of names){if((Orbit.store.all(n)||[]).length!==expected[n])return false;}const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:250});
  report.counts=await page.evaluate(names=>Object.fromEntries(Object.keys(names).map(n=>[n,(Orbit.store.all(n)||[]).length])),EXPECT);
  need(JSON.stringify(report.counts)===JSON.stringify(EXPECT),'BASELINE_COUNTS_INVALID');report.checks.baseline=true;report.checks.projectionReady=true;report.checks.downstreamZero=report.counts.cobros===0&&report.counts.finmovs===0;
  const samples=await page.evaluate(()=>{const rec=Orbit.store.all('recibosEsperados')||[],car=Orbit.store.all('carteraPrimas')||[],veh=Orbit.store.all('vehiculos')||[];const hist=r=>r&&((r.historicalExigible===true)||String(r.carteraTipo||'')==='cartera_historica_exigible'||String(r.exigibilidad||'')==='historica_exigible');const activeWithVehicle=rec.find(r=>!hist(r)&&veh.some(v=>v.polizaId===r.polizaId));const historical=rec.find(hist);const reported=rec.find(r=>String(r.estadoOperativo||'')==='pago_reportado');return{active:activeWithVehicle?{clienteId:activeWithVehicle.clienteId,polizaId:activeWithVehicle.polizaId}:null,historical:historical?{clienteId:historical.clienteId,polizaId:historical.polizaId}:null,reported:reported?{clienteId:reported.clienteId,polizaId:reported.polizaId}:null,historicalPortfolio:car.filter(hist).length};});
  need(samples.active&&samples.historical&&samples.reported,'VISUAL_SAMPLE_UNAVAILABLE');need(samples.historicalPortfolio===32,'HISTORICAL_PORTFOLIO_COUNT_INVALID');
  report.stage='direction_semantics';await role(page,'Dirección');
  await route(page,`#/cliente360?c=${samples.active.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});let body=await page.locator('#c360-body').innerText();need(/Por vencer/.test(body)&&/Exigible/.test(body),'ACTIVE_PORTFOLIO_KPIS_MISSING');need(!(await technicalCopy(page)),'TECHNICAL_COPY_VISIBLE_DIRECTION');
  await route(page,`#/cliente360?c=${samples.historical.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});body=await page.locator('#c360-body').innerText();need(/Histórica exigible/.test(body),'HISTORICAL_EXIGIBLE_NOT_VISIBLE');
  await route(page,`#/cliente360?c=${samples.reported.clienteId}&t=recibos`);await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:15000});body=await page.locator('#c360-body').innerText();need(/Pago reportado · por conciliar/.test(body),'PAYMENT_REPORTED_SEMANTIC_INVALID');
  await route(page,`#/cliente360?c=${samples.active.clienteId}&t=cobros`);body=await page.locator('#c360-body').innerText();need(/Aún no hay cobros aplicados/.test(body),'COBROS_ZERO_NOT_HONEST');need(!/Confirmar cobro/.test(body),'COBRO_ACTION_VISIBLE_BEFORE_COBROS_STAGE');
  report.checks.activeCalendar=true;report.checks.historicalExigible=true;report.checks.paymentReportedPendingReconciliation=true;report.checks.cobrosSeparated=true;
  for(const [roleName,viewport] of ROLES){report.stage='role_'+roleName;await page.setViewportSize(viewport);await role(page,roleName);await route(page,'#/cliente360');await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:15000});const state=await page.evaluate(()=>({rows:document.querySelectorAll('#host table.tbl tbody tr').length,role:Orbit.session.rol(),tech:new RegExp(window.__x||'firebase|firestore|backend|localStorage|mock|demo|smoke','i').test(document.body.innerText||'')}));need(state.rows>0,'CLIENT360_EMPTY_FOR_ROLE',roleName);need(!(await technicalCopy(page)),'TECHNICAL_COPY_VISIBLE_ROLE',roleName);report.roleViews[roleName]={viewport,rowsVisible:state.rows,technicalCopy:false};}
  report.stage='final';report.ok=true;report.status='VISUAL_LAB_PASS';
}catch(error){report.ok=false;report.status='VISUAL_LAB_FAIL';report.failureStage=report.stage;report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
