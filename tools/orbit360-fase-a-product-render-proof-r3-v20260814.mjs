#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';

const ROOT=process.cwd();
const ART=path.join(ROOT,'orbit360-artifacts/fase-a-product');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-render-proof-r3-v20260814.json');
const email=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim();
const password=String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD||'');
const port=4173,url=`http://127.0.0.1:${port}/`,localOrigin=new URL(url).origin;
const clean=v=>String(v??'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/\s+/g,' ').trim().slice(0,700);
const safeLocalPath=raw=>{try{const u=new URL(String(raw||''));return u.origin===localOrigin?decodeURIComponent(u.pathname).replace(/[^A-Za-z0-9._/\-]/g,'').slice(0,300):u.pathname.replace(/[^A-Za-z0-9._/\-]/g,'').slice(0,300);}catch{return 'unknown';}};
const report={schemaVersion:'orbit360-fase-a-product-render-proof-r3-v1',ok:false,status:'FASE_A_PRODUCT_RENDER_PROOF_R3_FAIL',stage:'init',pageErrors:[],consoleErrors:[],httpFailures:[],bootstrapTransitions:[],firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
function save(){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));}
function mime(file){return file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.html')?'text/html':'application/octet-stream';}
function requestLocation(raw){try{const u=new URL(String(raw||''));return {scope:u.origin===localOrigin?'local-artifact':'external-runtime',host:u.origin===localOrigin?'local':clean(u.hostname),path:u.origin===localOrigin?safeLocalPath(raw):safeLocalPath(raw)};}catch{return {scope:'unknown',host:'unknown',path:'unknown'};}}
function addHttpFailure(entry){if(report.httpFailures.length<30)report.httpFailures.push(entry);}
const server=http.createServer((req,res)=>{try{let rel=decodeURIComponent(String(req.url||'/').split('?')[0]);if(rel==='/'||rel==='')rel='/index.html';rel=rel.replace(/^\/+/, '');const file=path.resolve(ART,rel);if(!file.startsWith(path.resolve(ART)+path.sep)&&file!==path.join(path.resolve(ART),'index.html')){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('not found');}res.writeHead(200,{'content-type':mime(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(500);res.end();}});
let browser,page;
try{
  if(!email.includes('@')||password.length<12)throw new Error('SYNTHETIC_IDENTITY_CONTEXT_MISSING');
  await new Promise((resolve,reject)=>server.listen(port,'127.0.0.1',e=>e?reject(e):resolve()));
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.addInitScript(()=>{
    window.__orbitProductBootstrapTransitions=[];
    window.addEventListener('orbit:product-readonly-bootstrap',event=>{
      const detail=event&&event.detail&&typeof event.detail==='object'?event.detail:{};
      const item={phase:String(detail.phase||''),ready:detail.ready===true,errors:Array.isArray(detail.errors)?detail.errors.map(v=>String(v)).slice(0,10):[]};
      window.__orbitProductBootstrapTransitions.push(item);
      if(window.__orbitProductBootstrapTransitions.length>24)window.__orbitProductBootstrapTransitions.shift();
    });
  });
  page.on('pageerror',e=>{if(report.pageErrors.length<30)report.pageErrors.push(clean(e?.message||e));});
  page.on('console',m=>{if(m.type()==='error'&&report.consoleErrors.length<30)report.consoleErrors.push(clean(m.text()));});
  page.on('response',response=>{const status=response.status();if(status>=400)addHttpFailure({kind:'response',status,...requestLocation(response.url())});});
  page.on('requestfailed',request=>addHttpFailure({kind:'requestfailed',failure:clean(request.failure()?.errorText||'unknown'),...requestLocation(request.url())}));

  report.stage='preauth';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:15000});
  await page.waitForTimeout(1200);
  report.preauth=await page.evaluate(()=>({storeStatus:Orbit.store?._productStatus?Orbit.store._productStatus():null,preauth:Boolean(Orbit.store?.__productPreAuthP0),productApp:Orbit.productAppP0?.status?Orbit.productAppP0.status():null}));
  if(!report.preauth?.preauth)throw new Error('PREAUTH_STORE_NOT_ACTIVE');
  if(report.pageErrors.length)throw new Error('PREAUTH_PAGE_ERRORS:'+report.pageErrors.join('|'));

  report.stage='login';
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  const loginOutcome=await Promise.race([
    page.waitForFunction(()=>window.Orbit&&Orbit.productAppP0?.isStarted&&Orbit.productAppP0.isStarted()===true,undefined,{timeout:45000,polling:100}).then(()=>({started:true})).catch(()=>({started:false})),
    page.waitForFunction(()=>{const e=document.getElementById('login-error');return e&&String(e.textContent||'').trim().length>0;},undefined,{timeout:45000,polling:100}).then(()=>({loginError:true})).catch(()=>({loginError:false}))
  ]);
  if(!loginOutcome.started)throw new Error('PRODUCT_APP_NOT_STARTED');

  report.stage='router-render';
  await page.waitForFunction(()=>{
    const router=window.Orbit&&Orbit.router;
    const state=router&&router.runtimeContractState||{};
    const rows=Object.entries(state).filter(([key,value])=>key!=='__pwa'&&value&&typeof value==='object');
    const pending=rows.some(([,value])=>['pending','importing','existing-marker'].includes(String(value.status||'')));
    const failed=rows.some(([,value])=>['error','timeout','cross-origin','no-source'].includes(String(value.status||''))||value.ready===false);
    const host=document.getElementById('host');
    return !pending&&!failed&&!!(Orbit.route&&Orbit.route.key)&&!!host&&host.children.length>0;
  },undefined,{timeout:45000,polling:100});
  await page.locator('#host').waitFor({state:'visible',timeout:5000});

  report.runtime=await page.evaluate(()=>{
    const transitions=Array.isArray(window.__orbitProductBootstrapTransitions)?window.__orbitProductBootstrapTransitions.slice(-24):[];
    const routerState=Orbit.router&&Orbit.router.runtimeContractState?JSON.parse(JSON.stringify(Orbit.router.runtimeContractState)):{};
    const host=document.getElementById('host');
    return {
      productApp:Orbit.productAppP0?.status?Orbit.productAppP0.status():null,
      store:Orbit.store?._productStatus?Orbit.store._productStatus():null,
      user:Orbit.auth?.productUser?{tenantId:Orbit.auth.productUser.tenantId||'',activeRole:Orbit.auth.productUser.activeRole||'',roleCount:Array.isArray(Orbit.auth.productUser.roles)?Orbit.auth.productUser.roles.length:0}:null,
      loginError:Boolean(String(document.getElementById('login-error')?.textContent||'').trim()),
      clientes:(Orbit.store?.all?Orbit.store.all('clientes'):[]).length,
      aseguradoras:(Orbit.store?.all?Orbit.store.all('aseguradoras'):[]).length,
      routeKey:Orbit.route&&Orbit.route.key||'',
      hostChildCount:host?host.children.length:0,
      hostTextLength:host?String(host.textContent||'').trim().length:0,
      routerState,
      bootstrapTransitions:transitions,
      bootstrapLast:transitions.length?transitions[transitions.length-1]:null
    };
  });
  report.bootstrapTransitions=Array.isArray(report.runtime?.bootstrapTransitions)?report.runtime.bootstrapTransitions.map(item=>({phase:clean(item?.phase),ready:item?.ready===true,errors:Array.isArray(item?.errors)?item.errors.map(clean).slice(0,10):[]})):[];
  if(report.runtime){report.runtime.bootstrapTransitions=report.bootstrapTransitions;report.runtime.bootstrapLast=report.bootstrapTransitions.length?report.bootstrapTransitions[report.bootstrapTransitions.length-1]:null;}
  if(report.runtime?.productApp?.started!==true||report.runtime?.productApp?.routerStarted!==true)throw new Error('PRODUCT_APP_OR_ROUTER_NOT_STARTED');
  if(report.runtime?.store?.ready!==true||report.runtime?.store?.status!=='ready-read-only'||report.runtime?.store?.writeEnabled!==false)throw new Error('PRODUCT_STORE_NOT_READY');
  if(Array.isArray(report.runtime?.store?.requiredMissing)&&report.runtime.store.requiredMissing.length)throw new Error('REQUIRED_COLLECTIONS_MISSING:'+report.runtime.store.requiredMissing.join(','));
  if(Array.isArray(report.runtime?.store?.requiredFailed)&&report.runtime.store.requiredFailed.length)throw new Error('REQUIRED_COLLECTIONS_FAILED:'+report.runtime.store.requiredFailed.join(','));
  if(report.runtime.clientes!==430||report.runtime.aseguradoras!==30)throw new Error(`BASELINE_COUNT_INVALID:${report.runtime.clientes}/${report.runtime.aseguradoras}`);
  if(!report.runtime.routeKey||report.runtime.hostChildCount<1||report.runtime.hostTextLength<1)throw new Error('ROUTER_RENDER_NOT_OBSERVED');
  const localFailures=report.httpFailures.filter(x=>x.scope==='local-artifact');
  if(localFailures.length)throw new Error('LOCAL_ARTIFACT_HTTP_FAILURE:'+localFailures.map(x=>`${x.status||x.failure}:${x.path}`).join('|'));
  if(report.pageErrors.length)throw new Error('PAGE_ERRORS:'+report.pageErrors.join('|'));
  if(report.consoleErrors.length)throw new Error('CONSOLE_ERRORS:'+report.consoleErrors.join('|'));

  report.stage='final';report.ok=true;report.status='FASE_A_PRODUCT_RENDER_PROOF_R3_PASS';
}catch(e){report.error=clean(e?.message||e);report.failureStage=report.stage;try{if(page){report.failureRuntime=await page.evaluate(()=>({routeKey:window.Orbit&&Orbit.route&&Orbit.route.key||'',routerState:window.Orbit&&Orbit.router&&Orbit.router.runtimeContractState?JSON.parse(JSON.stringify(Orbit.router.runtimeContractState)):{},store:window.Orbit&&Orbit.store&&Orbit.store._productStatus?Orbit.store._productStatus():null,productApp:window.Orbit&&Orbit.productAppP0&&Orbit.productAppP0.status?Orbit.productAppP0.status():null})).catch(()=>null);}}catch{}process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});await new Promise(r=>server.close(()=>r())).catch(()=>{});save();}
