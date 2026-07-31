#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';
import {TECHNICAL_COPY_PATTERN} from './orbit360-visible-technical-copy-predicate-v20260729.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/client360-policies-vehicles-visual-lab-v20260731.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const ROLES=[['Dirección',{width:1440,height:1000}],['Operativo',{width:900,height:1100}],['Asesor',{width:390,height:844}]];
const report={schemaVersion:'orbit360-client360-policy-vehicle-visual-lab-v1',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),stage:'init',checks:{},roleViews:{},counts:{},readOnly:true,firestoreWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,420);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const need=(ok,code,detail='')=>{if(!ok)throw new Error(code+(detail?':'+detail:''));};
async function chooseRole(page,roleName){
  const result=await page.evaluate(target=>{const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];const sel=document.getElementById('rol-sel');if(!allowed.includes(target))return{ok:false,count:allowed.length};if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true};}}return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(target))};},roleName);
  need(result&&result.ok,'ROLE_SELECTION_FAILED',roleName);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,roleName,{timeout:15000});
  await page.waitForTimeout(350);
}
async function route(page,hash){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForTimeout(650);}
async function noTech(page){return !(await page.evaluate(pattern=>new RegExp(pattern,'i').test(document.body.innerText||''),TECHNICAL_COPY_PATTERN));}
async function noBadValues(page,selector='#host'){return page.evaluate(sel=>{const t=(document.querySelector(sel)?.innerText||'');return !/(^|\s)(undefined|NaN)(\s|$)/i.test(t);},selector);}
let browser,page;
try{
  need(/^https:\/\//.test(url),'LAB_URL_REQUIRED');need(email.includes('@'),'LAB_EMAIL_REQUIRED');need(password.length>=8,'LAB_PASSWORD_REQUIRED');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  const labEntry=new URL(url);labEntry.searchParams.set('orbitBackend','firestore-lab');labEntry.searchParams.set('tenant','alianzas-soluciones');
  report.checks.labEntrypointBound=true;report.stage='navigate';await page.goto(labEntry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.stage='blocking_gates';const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});report.blockingGates={ok:gates&&gates.ok,remaining:gates&&gates.remaining};need(gates&&gates.ok&&gates.remaining===0,'BLOCKING_GATE_NOT_SETTLED');
  report.stage='hydrate';
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;for(const n of Object.keys(expected)){if((Orbit.store.all(n)||[]).length!==expected[n])return false;}const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:250});
  report.counts=await page.evaluate(names=>Object.fromEntries(Object.keys(names).map(n=>[n,(Orbit.store.all(n)||[]).length])),EXPECT);
  need(JSON.stringify(report.counts)===JSON.stringify(EXPECT),'BASELINE_COUNTS_INVALID');report.checks.baseline=true;report.checks.projectionReady=true;report.checks.downstreamZero=report.counts.cobros===0&&report.counts.finmovs===0;
  const owner=await page.evaluate(()=>({present:!!Orbit.policyVehicleReadModelV1199c,version:Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.version,indexed:!!(Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.indexedClientSummary),fullPolicy:!!(Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.fullPagePolicy),fullVehicle:!!(Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.fullPageVehicle),writesStore:!!(Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.writesStore),writesBackend:!!(Orbit.policyVehicleReadModelV1199c&&Orbit.policyVehicleReadModelV1199c.writesBackend)}));
  need(owner.present&&owner.version==='20260731.1'&&owner.indexed&&owner.fullPolicy&&owner.fullVehicle&&!owner.writesStore&&!owner.writesBackend,'READMODEL_OWNER_INVALID');report.checks.readModelOwner=true;
  const sample=await page.evaluate(()=>{const pol=Orbit.store.all('polizas')||[],veh=Orbit.store.all('vehiculos')||[];for(const p of pol){const v=veh.find(x=>x.polizaId===p.id&&x.clienteId===p.clienteId);if(v)return{c:p.clienteId,p:p.id,v:v.id};}return null;});
  need(sample,'POLICY_VEHICLE_SAMPLE_UNAVAILABLE');
  report.stage='direction_list';await chooseRole(page,'Dirección');await route(page,'#/cliente360');await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:20000});
  const coherence=await page.evaluate(c=>{const s=Orbit.q.clienteResumen(c);const actual=(Orbit.store.all('polizas')||[]).filter(p=>p.clienteId===c).length;return{summary:s&&s.nPolizas,actual};},sample.c);
  need(coherence.summary===coherence.actual&&coherence.actual>0,'CLIENT_LIST_DETAIL_COUNT_MISMATCH');need(await noBadValues(page),'LIST_BAD_VALUE_VISIBLE');need(await noTech(page),'LIST_TECHNICAL_COPY');report.checks.clientListDetailCoherent=true;
  report.stage='policy_fullpage';await route(page,`#/cliente360?c=${encodeURIComponent(sample.c)}&p=${encodeURIComponent(sample.p)}`);await page.locator('[data-policy-fullpage="1"]').waitFor({state:'visible',timeout:15000});need(await noBadValues(page),'POLICY_BAD_VALUE_VISIBLE');need(await noTech(page),'POLICY_TECHNICAL_COPY');report.checks.policyFullPage=true;
  report.stage='vehicle_fullpage';await route(page,`#/cliente360?c=${encodeURIComponent(sample.c)}&v=${encodeURIComponent(sample.v)}`);await page.locator('[data-vehicle-fullpage="1"]').waitFor({state:'visible',timeout:15000});need(await noBadValues(page),'VEHICLE_BAD_VALUE_VISIBLE');need(await noTech(page),'VEHICLE_TECHNICAL_COPY');report.checks.vehicleFullPage=true;
  report.stage='receipts_context';await route(page,`#/cliente360?c=${encodeURIComponent(sample.c)}&t=recibos`);await page.locator('#c360-body').waitFor({state:'visible',timeout:15000});need(await noBadValues(page),'RECEIPTS_BAD_VALUE_VISIBLE');report.checks.receiptsContext=true;
  for(const [roleName,viewport] of ROLES){report.stage='role_'+roleName;await page.setViewportSize(viewport);await chooseRole(page,roleName);await route(page,'#/cliente360');await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:20000});const state=await page.evaluate(()=>({rows:document.querySelectorAll('#host table.tbl tbody tr').length,role:Orbit.session.rol(),docWidth:document.documentElement.scrollWidth,viewWidth:window.innerWidth}));need(state.rows>0,'CLIENT360_EMPTY_FOR_ROLE',roleName);need(await noBadValues(page),'ROLE_BAD_VALUE_VISIBLE',roleName);need(await noTech(page),'ROLE_TECHNICAL_COPY',roleName);need(state.docWidth<=state.viewWidth+8,'RESPONSIVE_PAGE_OVERFLOW',roleName);report.roleViews[roleName]={viewport,rowsVisible:state.rows,noPageOverflow:true};}
  report.stage='final';report.checks.multirol=true;report.checks.noUndefinedNaN=true;report.checks.responsive=true;report.ok=true;report.status='CLIENT360_POLICY_VEHICLE_VISUAL_LAB_PASS';
}catch(error){report.ok=false;report.status='CLIENT360_POLICY_VEHICLE_VISUAL_LAB_FAIL';report.failureStage=report.stage;report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
