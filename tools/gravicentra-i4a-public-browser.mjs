import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const PREVIEW_URL = process.env.PREVIEW_URL;
const SOURCE_SHA = process.env.SOURCE_SHA;
const BUILD_ID = process.env.BUILD_ID;
const OUT = process.env.I4A_PUBLIC_EVIDENCE_DIR || path.join(process.cwd(), 'i4a-public-evidence');
if (!PREVIEW_URL || !SOURCE_SHA || !BUILD_ID) throw new Error('I4A_PUBLIC_ENV_MISSING');
fs.mkdirSync(OUT,{recursive:true});
const evidence={schemaVersion:'gravicentra-i4a-public-browser-v1',gate:'I4A',status:'RUNNING',sourceSha:SOURCE_SHA,buildId:BUILD_ID,previewUrl:PREVIEW_URL,productionTouched:false,dataTouched:false,authenticated:false,checks:{},errors:[]};
const redact=s=>String(s||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email-redacted]').slice(0,700);
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const page=await context.newPage();
  const telemetry={consoleErrors:[],pageErrors:[],sameOriginRequestFailures:[],sameOriginHttpErrors:[]};
  page.on('console',m=>{if(m.type()==='error')telemetry.consoleErrors.push(redact(m.text()));});
  page.on('pageerror',e=>telemetry.pageErrors.push(redact(e&& (e.stack||e.message||e))));
  page.on('requestfailed',r=>{try{if(new URL(r.url()).origin===new URL(PREVIEW_URL).origin)telemetry.sameOriginRequestFailures.push(`${r.method()} ${new URL(r.url()).pathname} ${r.failure()?.errorText||''}`);}catch{}});
  page.on('response',r=>{try{if(new URL(r.url()).origin===new URL(PREVIEW_URL).origin&&r.status()>=400)telemetry.sameOriginHttpErrors.push(`${r.status()} ${new URL(r.url()).pathname}`);}catch{}});
  const started=Date.now();
  await page.goto(PREVIEW_URL,{waitUntil:'domcontentloaded',timeout:30000});
  const domContentLoadedMs=Date.now()-started;
  await page.waitForSelector('#login-form',{state:'visible',timeout:5000});
  const loginVisibleMs=Date.now()-started;
  const marker=await page.evaluate(async()=>{const r=await fetch('/__recovery__/build.json?i4apublic=1',{cache:'no-store'});return{status:r.status,body:await r.json()};});
  if(marker.status!==200||marker.body.sourceSha!==SOURCE_SHA||marker.body.buildId!==BUILD_ID)throw new Error('I4A_PUBLIC_BUILD_MARKER_MISMATCH');
  const runtime=await page.evaluate(()=>({
    entrypoint:document.documentElement.dataset.orbitEntrypoint||'',
    productMode:document.documentElement.dataset.orbitProductMode||'',
    appStatus:Orbit.productAppP0&&Orbit.productAppP0.status?Orbit.productAppP0.status():null,
    projectionRevision:Orbit.clientProjection&&Orbit.clientProjection.runtimeCompatibilityRevision||'',
    projectionCopySafe:!!(Orbit.clientCanonicalViewProjectionV20260716&&Orbit.clientCanonicalViewProjectionV20260716.productCopyStoreSafe),
    insurerOwnerVersion:Orbit.clientInsurerOperationalDirectoryOwnerV20260722&&Orbit.clientInsurerOperationalDirectoryOwnerV20260722.version||'',
    insurerResourcesOverlayPresent:!!(Orbit.modules&&Orbit.modules.aseguradoras&&Orbit.modules.aseguradoras.__op2OperationalResourcesV1218),
    insurerClosureOverlayPresent:!!Orbit.__aseguradorasOp2ClosureV1218,
    loginVisible:!!document.querySelector('#login-form'),
    preAuth:document.body.classList.contains('pre-auth')
  }));
  if(runtime.entrypoint!=='gravicentra-fase-a'||runtime.productMode!=='product')throw new Error('I4A_PUBLIC_ENTRYPOINT_MISMATCH');
  if(runtime.projectionRevision!=='20260902.1-product-copy-safe'||runtime.projectionCopySafe!==true)throw new Error('I4A_PUBLIC_CLIENT_PROJECTION_FIX_NOT_ACTIVE');
  if(runtime.insurerOwnerVersion!=='20260829.1')throw new Error('I4A_PUBLIC_INSURER_OWNER_NOT_ACTIVE');
  if(runtime.insurerResourcesOverlayPresent||runtime.insurerClosureOverlayPresent)throw new Error('I4A_PUBLIC_SUPERSEDED_INSURER_OVERLAY_ACTIVE');
  const indexCheck=await page.evaluate(async()=>{const t=await (await fetch('/index.html?i4apublic=1',{cache:'no-store'})).text();return{resources:t.includes('aseguradoras-op2-operational-resources.js'),closure:t.includes('aseguradoras-op2-closure-bridge.js'),canonical:t.includes('client-insurer-operational-directory-owner-v20260722.js')};});
  if(indexCheck.resources||indexCheck.closure||!indexCheck.canonical)throw new Error('I4A_PUBLIC_ENTRYPOINT_SHADOWING_MISMATCH');
  const heartbeatStarted=Date.now();
  await Promise.race([
    page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('I4A_PUBLIC_HEARTBEAT_TIMEOUT')),2000))
  ]);
  const heartbeatMs=Date.now()-heartbeatStarted;
  await page.waitForTimeout(500);
  if(telemetry.pageErrors.length)throw new Error('I4A_PUBLIC_PAGE_ERRORS:'+telemetry.pageErrors.join('|'));
  if(telemetry.consoleErrors.length)throw new Error('I4A_PUBLIC_CONSOLE_ERRORS:'+telemetry.consoleErrors.join('|'));
  if(telemetry.sameOriginRequestFailures.length)throw new Error('I4A_PUBLIC_REQUEST_FAILURES:'+telemetry.sameOriginRequestFailures.join('|'));
  if(telemetry.sameOriginHttpErrors.length)throw new Error('I4A_PUBLIC_HTTP_ERRORS:'+telemetry.sameOriginHttpErrors.join('|'));
  evidence.checks={buildExact:true,domContentLoadedMs,loginVisibleMs,heartbeatMs,runtime,indexCheck,telemetry};
  evidence.status='PUBLIC_BROWSER_PASS';
  await context.close();
}catch(e){
  evidence.status='PUBLIC_BROWSER_FAIL';
  evidence.errors.push(redact(e&&(e.stack||e.message||e)));
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  evidence.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(OUT,'i4a-public-browser.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log('I4A_PUBLIC_BROWSER_STATUS='+evidence.status);
}
