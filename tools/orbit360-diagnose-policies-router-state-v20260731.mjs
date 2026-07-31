#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { settleBlockingGates } from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-router-state-diagnostic-v20260731.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const report={schemaVersion:'orbit360-policies-router-state-diagnostic-v1',generatedAt:new Date().toISOString(),ok:false,status:'INIT',snapshots:[],readOnly:true,browserExecuted:true,firestoreWrites:0,operationalWrites:0,hostingDeployExecutions:0,production:false,containsPII:false,containsSecrets:false};
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,180);
async function snapshot(page,label){
  const s=await page.evaluate(label=>{
    const host=document.getElementById('host');
    const text=host&&host.innerText||'';
    const th=host?Array.from(host.querySelectorAll('table.tbl thead th')).map(x=>(x.textContent||'').trim()):[];
    let role='',canSee=null,accessCan=null,routeKey='';
    try{role=Orbit.session&&Orbit.session.rol?Orbit.session.rol():'';}catch(e){}
    try{canSee=Orbit.session&&Orbit.session.canSee?Orbit.session.canSee('polizas'):null;}catch(e){}
    try{accessCan=Orbit.access&&Orbit.access.can?Orbit.access.can('polizas','view'):null;}catch(e){}
    try{routeKey=Orbit.route&&Orbit.route.key||'';}catch(e){}
    return{label,hash:location.hash,routeKey,activeRole:role,sessionCanSeePolizas:canSee,accessCanPolizas:accessCan,rows:host?host.querySelectorAll('table.tbl tbody tr').length:0,headers:th,hasPrimaTotalText:text.includes('Prima total'),hasMostrando:text.includes('Mostrando'),accessDenied:/No tienes acceso con el rol activo/.test(text)};
  },label);
  report.snapshots.push(s);
  return s;
}
async function selectDirection(page){
  return page.evaluate(()=>{
    const target='Dirección';
    const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];
    const sel=document.getElementById('rol-sel');
    if(!allowed.includes(target))return{ok:false,allowedCount:allowed.length};
    if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'selector'};}}
    return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(target)),via:'session'};
  });
}
let browser;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('LAB_INPUT_REQUIRED');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');
  await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});
  if(!gates||!gates.ok||gates.remaining!==0)throw new Error('BLOCKING_GATE_NOT_SETTLED');
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;for(const [n,v] of Object.entries(expected)){if((Orbit.store.all(n)||[]).length!==v)return false;}const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:250});
  await snapshot(page,'hydrated_before_role');
  const selected=await selectDirection(page);report.directionSelection=selected;
  await page.waitForFunction(()=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()==='Dirección',undefined,{timeout:15000});
  await snapshot(page,'direction_before_navigation');
  await page.evaluate(()=>{location.hash='#/polizas';});
  for(const [label,ms] of [['after_100ms',100],['after_500ms',400],['after_1500ms',1000],['after_5000ms',3500]]){await page.waitForTimeout(ms);await snapshot(page,label);}
  report.ok=true;report.status='ROUTER_STATE_DIAGNOSTIC_CAPTURED';
}catch(e){report.ok=false;report.status='ROUTER_STATE_DIAGNOSTIC_FAILED';report.error=clean(e&&e.message||e);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
