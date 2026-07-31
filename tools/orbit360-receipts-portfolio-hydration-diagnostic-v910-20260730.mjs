#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const OUT=path.join(process.cwd(),'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-hydration-diagnostic-v910.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const waitMs=Math.max(3000,Number(process.env.ORBIT360_DIAG_WAIT_MS||15000));
const names=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs'];
const report={schemaVersion:'orbit360-receipts-portfolio-hydration-diagnostic-v910',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),stage:'init',readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/\s+/g,' ').trim().slice(0,300);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
let browser,page;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('DIAG_ENV_INVALID');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];page.on('pageerror',e=>{if(pageErrors.length<12)pageErrors.push(clean(e&&e.message||e));});
  report.stage='navigate';await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.stage='blocking_gates';report.blockingGates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});
  await page.waitForTimeout(waitMs);
  report.stage='snapshot';
  const state=await page.evaluate(list=>{
    const counts={};for(const n of list){try{counts[n]=(Orbit.store.all(n)||[]).length;}catch(e){counts[n]=-1;}}
    let projection=null;try{projection=Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.status?Orbit.receiptsPortfolioProjectionV910.status():null;}catch(e){projection={error:String(e&&e.message||e).slice(0,120)};}
    let storeProjection=null;try{storeProjection=Orbit.store&&Orbit.store._receiptsPortfolioProjectionStatus?Orbit.store._receiptsPortfolioProjectionStatus():null;}catch(e){storeProjection={error:String(e&&e.message||e).slice(0,120)};}
    let canonical=null;try{canonical=window.OrbitLabCanonicalViewSync&&OrbitLabCanonicalViewSync.status?OrbitLabCanonicalViewSync.status():null;}catch(e){canonical={error:String(e&&e.message||e).slice(0,120)};}
    const backend={};try{backend.mode=String(window.OrbitBackend&&OrbitBackend.mode||'');backend.tenant=Boolean(window.OrbitBackend&&OrbitBackend.tenantId);backend.firebaseInit=String(window.OrbitBackend&&OrbitBackend.firebaseInit||'');backend.loaderVersion=String(window.OrbitBackend&&OrbitBackend.loaderVersion||'');}catch(e){}
    return{counts,projection,storeProjection,canonical,backend,orbitPresent:Boolean(window.Orbit),signedIn:Boolean(window.firebase&&firebase.auth&&firebase.auth().currentUser),hash:String(location.hash||'')};
  },names);
  report.state=state;report.pageErrors=pageErrors;report.ok=true;report.status='HYDRATION_DIAGNOSTIC_CAPTURED';
}catch(error){report.ok=false;report.status='HYDRATION_DIAGNOSTIC_FAILED';report.error=clean(error&&error.message||error);report.failureStage=report.stage;process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
