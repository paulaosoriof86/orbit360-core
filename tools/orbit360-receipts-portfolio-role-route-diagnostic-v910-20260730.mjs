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
const report={schemaVersion:'orbit360-receipts-portfolio-role-route-diagnostic-v910',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false,roles:{}};
const clean=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/\s+/g,' ').trim().slice(0,220);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
let browser,page;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('DIAG_ENV_INVALID');
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');
  report.labEntrypointBound=true;
  await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.blockingGates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;for(const [n,v] of Object.entries(expected)){if((Orbit.store.all(n)||[]).length!==v)return false;}const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:45000,polling:200});
  report.baselineReady=true;
  for(const target of ROLES){
    const selection=await page.evaluate(roleName=>{
      const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];
      const sel=document.getElementById('rol-sel');
      if(!allowed.includes(roleName))return{ok:false,allowedCount:allowed.length};
      if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===roleName||String(x.textContent||'').trim()===roleName);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'select'};}}
      return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(roleName)),via:'session'};
    },target);
    await page.waitForTimeout(400);
    const roleSettled=await page.evaluate(roleName=>Boolean(window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===roleName),target);
    await page.evaluate(()=>{location.hash='#/cliente360';});
    await page.waitForTimeout(1400);
    const state=await page.evaluate(()=>{
      const host=document.getElementById('host');
      const tables=host?Array.from(host.querySelectorAll('table.tbl')):[];
      const visibleTables=tables.filter(el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});
      const text=host?String(host.innerText||''):'';
      let canView=null,sessionCanSee=null,scopeCanSee=null;
      try{canView=Boolean(Orbit.access&&Orbit.access.can?Orbit.access.can('cliente360','view'):null);}catch(e){}
      try{sessionCanSee=Boolean(Orbit.session&&Orbit.session.canSee?Orbit.session.canSee('cliente360'):null);}catch(e){}
      try{scopeCanSee=Boolean(Orbit.accessScope&&Orbit.accessScope.puedeVerModulo?Orbit.accessScope.puedeVerModulo('cliente360'):null);}catch(e){}
      let canonical=null;try{canonical=window.OrbitLabCanonicalViewSync&&OrbitLabCanonicalViewSync.status?OrbitLabCanonicalViewSync.status():null;}catch(e){}
      return{
        activeRole:String(Orbit.session&&Orbit.session.rol?Orbit.session.rol()||'':''),
        hash:String(location.hash||''),
        routeKey:String(Orbit.route&&Orbit.route.key||''),
        routeParamCount:Orbit.route&&Orbit.route.params?Object.keys(Orbit.route.params).length:-1,
        moduleRender:Boolean(Orbit.modules&&Orbit.modules.cliente360&&typeof Orbit.modules.cliente360.render==='function'),
        canView,sessionCanSee,scopeCanSee,
        hostExists:Boolean(host),hostChildCount:host?host.children.length:0,
        tableCount:tables.length,visibleTableCount:visibleTables.length,
        rowCount:host?host.querySelectorAll('table.tbl tbody tr').length:0,
        noAccess:Boolean(text.includes('No tienes acceso con el rol activo')),
        notFound:Boolean(text.includes('Módulo no encontrado')),
        canonicalRoute:String(canonical&&canonical.route||''),
        canonicalRenderer:String(canonical&&canonical.renderer||'')
      };
    });
    report.roles[target]={selection,roleSettled,state};
  }
  report.ok=true;report.status='ROLE_ROUTE_DIAGNOSTIC_CAPTURED';
}catch(error){report.ok=false;report.status='ROLE_ROUTE_DIAGNOSTIC_FAILED';report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
