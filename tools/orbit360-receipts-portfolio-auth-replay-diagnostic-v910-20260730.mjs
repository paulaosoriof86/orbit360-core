#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const OUT=path.join(process.cwd(),'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-auth-replay-diagnostic-v910.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const names=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs'];
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const report={schemaVersion:'orbit360-receipts-portfolio-auth-replay-diagnostic-v910',contractVersion:'9.1.0',generatedAt:new Date().toISOString(),stage:'init',readOnly:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/\s+/g,' ').trim().slice(0,300);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
async function snap(page){return page.evaluate(list=>{const counts={};for(const n of list){try{counts[n]=(Orbit.store.all(n)||[]).length;}catch(e){counts[n]=-1;}}let lab=null,projection=null;try{lab=Orbit.store&&Orbit.store._labStatus?Orbit.store._labStatus():null;}catch(e){lab={error:String(e&&e.message||e).slice(0,120)};}try{projection=Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.status?Orbit.receiptsPortfolioProjectionV910.status():null;}catch(e){projection={error:String(e&&e.message||e).slice(0,120)};}if(lab){delete lab.auth;if(lab.snapshotErrors)lab.snapshotErrors=Object.fromEntries(Object.entries(lab.snapshotErrors).map(([k,v])=>[k,String(v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').slice(0,160)]));}return{counts,lab,projection,signedIn:Boolean(window.firebase&&firebase.auth&&firebase.auth().currentUser)};},names);}
let browser,page;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('DIAG_ENV_INVALID');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  report.stage='navigate';await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login1';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');await page.waitForFunction(()=>window.Orbit&&Orbit.store&&window.firebase&&firebase.auth&&firebase.auth().currentUser,undefined,{timeout:30000});await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});await page.waitForTimeout(5000);report.before=await snap(page);
  report.stage='auth_replay';await page.evaluate(async args=>{await firebase.auth().signOut();await new Promise(r=>setTimeout(r,400));await firebase.auth().signInWithEmailAndPassword(args.email,args.password);}, {email,password});await page.waitForFunction(()=>window.firebase&&firebase.auth&&firebase.auth().currentUser,undefined,{timeout:30000});await page.waitForTimeout(12000);report.after=await snap(page);
  report.expected=EXPECT;report.exactAfter=Object.keys(EXPECT).every(k=>report.after.counts[k]===EXPECT[k]);report.baseRecovered=['clientes','aseguradoras','polizas','vehiculos'].every(k=>report.after.counts[k]===EXPECT[k]);report.projectionRecovered=report.after.counts.recibosEsperados===1293&&report.after.counts.carteraPrimas===673&&report.after.projection&&report.after.projection.ready===true;
  report.lifecycleRaceProven=report.before.signedIn===true&&report.before.counts.clientes===0&&report.before.counts.polizas===0&&report.after.signedIn===true&&report.baseRecovered===true&&report.projectionRecovered===true;
  report.ok=true;report.status='AUTH_REPLAY_DIAGNOSTIC_CAPTURED';
}catch(error){report.ok=false;report.status='AUTH_REPLAY_DIAGNOSTIC_FAILED';report.failureStage=report.stage;report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
