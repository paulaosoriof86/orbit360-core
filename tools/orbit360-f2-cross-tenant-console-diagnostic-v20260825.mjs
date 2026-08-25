#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {chromium} from 'playwright';
import {PROBE_DOCUMENT_PATH,validateProbeDocumentPath} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';
import {classifyCrossTenantProbeSignals} from './orbit360-f2-cross-tenant-console-attribution-v20260825.mjs';
const TARGET=String(process.env.ORBIT360_F2_URL||'').trim(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),EMAIL=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim(),BROWSER=String(process.env.ORBIT360_SYSTEM_BROWSER_EXECUTABLE||'').trim(),RUN_ID=String(process.env.GITHUB_RUN_ID||'').trim();
const safe=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig,'[email-redacted]').replace(/[A-Za-z0-9_-]{60,}/g,'[token-redacted]').replace(/https?:\/\/[^/\s]+/g,'').slice(0,600);
let app,browser,context,page,token='';const consoleErrors=[],pageErrors=[],networkFailures=[];
const fail=(code,detail='')=>{throw new Error(code+(detail?`:${detail}`:''));};
try{
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(TARGET)||!PROJECT||!EMAIL||!BROWSER||!fs.existsSync(BROWSER)||!process.env.GOOGLE_APPLICATION_CREDENTIALS||!validateProbeDocumentPath(PROBE_DOCUMENT_PATH))fail('PIPELINE_MECHANISM_FAILURE:F2_CROSS_TENANT_DIAGNOSTIC_CONTEXT_INVALID');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const user=await getAuth(app).getUserByEmail(EMAIL);if(!user||user.disabled||user.emailVerified!==true)fail('DATA_CONTRACT_FAILURE:F2_CROSS_TENANT_DIAGNOSTIC_IDENTITY_INVALID');token=await getAuth(app).createCustomToken(user.uid,{orbit360F2ReadOnly:true});
  browser=await chromium.launch({headless:true,executablePath:BROWSER});context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();
  page.on('pageerror',e=>{if(pageErrors.length<10)pageErrors.push(safe(e?.message||e));});
  page.on('console',m=>{if(m.type()==='error'&&consoleErrors.length<10)consoleErrors.push(safe(m.text()));});
  page.on('response',r=>{if(r.status()<400||networkFailures.length>=10)return;const u=r.url();networkFailures.push({phase:'crossTenantDenied',provider:/firestore\.googleapis\.com/i.test(u)?'firestore':(/identitytoolkit\.googleapis\.com/i.test(u)?'auth':'other'),status:r.status()});});
  const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:45000});if(!response||response.status()!==200)fail('ENVIRONMENT_FAILURE:F2_CROSS_TENANT_DIAGNOSTIC_HTTP_INVALID',String(response&&response.status()));
  await page.waitForFunction(()=>!!(window.Orbit&&Orbit.productRuntimeBrowserProvidersP0),undefined,{timeout:30000});const authHttp=page.waitForResponse(r=>/identitytoolkit\.googleapis\.com/i.test(r.url())&&/accounts:signInWithCustomToken/i.test(new URL(r.url()).pathname),{timeout:30000});
  await page.evaluate(async t=>{const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();await ctx.modules.auth.signInWithCustomToken(ctx.auth,t);},token);token='';const ar=await authHttp;if(ar.status()<200||ar.status()>=300)fail('DATA_CONTRACT_FAILURE:F2_CROSS_TENANT_DIAGNOSTIC_AUTH_FAILED',String(ar.status()));
  consoleErrors.length=0;pageErrors.length=0;networkFailures.length=0;
  const denied=await page.evaluate(async deniedPath=>{const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();try{const ref=ctx.modules.store.doc(ctx.db,deniedPath);await ctx.modules.store.getDoc(ref);return false;}catch(e){return /permission-denied|PERMISSION_DENIED|Missing or insufficient permissions/i.test(String(e?.code||'')+' '+String(e?.message||e));}},PROBE_DOCUMENT_PATH);
  await page.waitForTimeout(500);
  const attribution=classifyCrossTenantProbeSignals({crossTenantDenied:denied,consoleErrors,pageErrors,networkFailures});
  const out={schemaVersion:'orbit360-f2-cross-tenant-console-diagnostic-v1',ok:attribution.ok===true,status:attribution.ok===true?'F2_CROSS_TENANT_CONSOLE_DIAGNOSTIC_PASS':'F2_CROSS_TENANT_CONSOLE_DIAGNOSTIC_FAIL',classification:attribution.ok===true?'PASS':String(attribution.code||'PIPELINE_MECHANISM_FAILURE').split(':')[0],code:attribution.code,crossTenantDenied:denied,expectedConsoleErrors:attribution.expectedConsoleErrors||[],residualConsoleErrors:attribution.residualConsoleErrors||[],networkFailures,firestoreDeniedObserved:attribution.firestoreDeniedObserved===true,pageErrors,runtimeExecuted:true,browserExecuted:true,secretAccess:true,authRead:true,firestoreRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runId:Number(RUN_ID||0),containsPII:false,containsSecrets:false};console.log(JSON.stringify(out,null,2));if(!out.ok)process.exitCode=41;
}catch(error){console.log(JSON.stringify({schemaVersion:'orbit360-f2-cross-tenant-console-diagnostic-v1',ok:false,status:'F2_CROSS_TENANT_CONSOLE_DIAGNOSTIC_FAIL',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',code:safe(error?.message||error),runtimeExecuted:true,browserExecuted:Boolean(browser),secretAccess:true,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runId:Number(RUN_ID||0),containsPII:false,containsSecrets:false},null,2));process.exitCode=41;}finally{token='';try{if(context)await context.close();}catch{}try{if(browser)await browser.close();}catch{}try{if(app)await deleteApp(app);}catch{}}
