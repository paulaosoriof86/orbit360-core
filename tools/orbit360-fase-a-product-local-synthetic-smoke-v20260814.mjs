#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const ROOT=process.cwd(),ART=path.join(ROOT,'orbit360-artifacts/fase-a-product'),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-local-synthetic-v20260814.json');
const email=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim(),password=String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD||'');
const port=4173,url=`http://127.0.0.1:${port}/`;
const clean=v=>String(v??'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,500);
const report={schemaVersion:'orbit360-fase-a-product-local-synthetic-v1',ok:false,status:'FASE_A_PRODUCT_LOCAL_SYNTHETIC_FAIL',stage:'init',pageErrors:[],consoleErrors:[],firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
function save(){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));}
function mime(file){return file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html':'application/octet-stream';}
const server=http.createServer((req,res)=>{try{let rel=decodeURIComponent(String(req.url||'/').split('?')[0]);if(rel==='/'||rel==='')rel='/index.html';rel=rel.replace(/^\/+/, '');const file=path.resolve(ART,rel);if(!file.startsWith(path.resolve(ART)+path.sep)&&file!==path.join(path.resolve(ART),'index.html')){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('not found');}res.writeHead(200,{'content-type':mime(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(500);res.end();}});
let browser,page;
try{
 if(!email.includes('@')||password.length<12)throw new Error('SYNTHETIC_IDENTITY_CONTEXT_MISSING');
 await new Promise((resolve,reject)=>server.listen(port,'127.0.0.1',e=>e?reject(e):resolve()));
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>{if(report.pageErrors.length<20)report.pageErrors.push(clean(e?.message||e));});
 page.on('console',m=>{if(m.type()==='error'&&report.consoleErrors.length<20)report.consoleErrors.push(clean(m.text()));});
 report.stage='preauth';await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.locator('#login-form').waitFor({state:'visible',timeout:15000});await page.waitForTimeout(1500);
 report.preauth=await page.evaluate(()=>({storeStatus:Orbit.store?._productStatus?Orbit.store._productStatus():null,preauth:Boolean(Orbit.store?.__productPreAuthP0),productApp:Orbit.productAppP0?.status?Orbit.productAppP0.status():null}));
 if(!report.preauth?.preauth)throw new Error('PREAUTH_STORE_NOT_ACTIVE');
 if(report.pageErrors.length)throw new Error('PREAUTH_PAGE_ERRORS:'+report.pageErrors.join('|'));
 report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
 const outcome=await Promise.race([
   page.waitForFunction(()=>window.Orbit&&Orbit.productAppP0?.isStarted&&Orbit.productAppP0.isStarted()===true,undefined,{timeout:45000,polling:100}).then(()=>({started:true})).catch(()=>({started:false})),
   page.waitForFunction(()=>{const e=document.getElementById('login-error');return e&&String(e.textContent||'').trim().length>0;},undefined,{timeout:45000,polling:100}).then(()=>({loginError:true})).catch(()=>({loginError:false}))
 ]);
 report.runtime=await page.evaluate(()=>({productApp:Orbit.productAppP0?.status?Orbit.productAppP0.status():null,store:Orbit.store?._productStatus?Orbit.store._productStatus():null,user:Orbit.auth?.productUser?{tenantId:Orbit.auth.productUser.tenantId||'',activeRole:Orbit.auth.productUser.activeRole||'',roleCount:Array.isArray(Orbit.auth.productUser.roles)?Orbit.auth.productUser.roles.length:0}:null,loginError:Boolean(String(document.getElementById('login-error')?.textContent||'').trim()),clientes:(Orbit.store?.all?Orbit.store.all('clientes'):[]).length,aseguradoras:(Orbit.store?.all?Orbit.store.all('aseguradoras'):[]).length}));
 if(!outcome.started||report.runtime?.productApp?.started!==true)throw new Error('PRODUCT_APP_NOT_STARTED:'+clean(report.runtime?.productApp?.lastError||'unknown'));
 if(report.runtime?.store?.ready!==true||report.runtime?.store?.status!=='ready-read-only'||report.runtime?.store?.writeEnabled!==false)throw new Error('PRODUCT_STORE_NOT_READY');
 if(report.runtime.clientes!==430||report.runtime.aseguradoras!==30)throw new Error(`BASELINE_COUNT_INVALID:${report.runtime.clientes}/${report.runtime.aseguradoras}`);
 await page.locator('#host').waitFor({state:'visible',timeout:15000});
 if(report.pageErrors.length)throw new Error('PAGE_ERRORS:'+report.pageErrors.join('|'));
 if(report.consoleErrors.length)throw new Error('CONSOLE_ERRORS:'+report.consoleErrors.join('|'));
 report.stage='final';report.ok=true;report.status='FASE_A_PRODUCT_LOCAL_SYNTHETIC_PASS';
}catch(e){report.error=clean(e?.message||e);report.failureStage=report.stage;process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});await new Promise(r=>server.close(()=>r())).catch(()=>{});save();}
