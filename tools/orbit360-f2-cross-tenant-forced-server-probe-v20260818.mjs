#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {chromium} from 'playwright';

const ROOT=process.cwd();
const TARGET=String(process.env.ORBIT360_F2_URL||'').trim();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const EMAIL=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim();
const EMAIL_HASH=String(process.env.ORBIT360_TARGET_EMAIL_HASH||'').trim().toLowerCase();
const BROWSER=String(process.env.ORBIT360_SYSTEM_BROWSER_EXECUTABLE||'').trim();
const RUN=String(process.env.GITHUB_RUN_ID||'runtime').trim();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716',`f2-rules01-cross-tenant-forced-server-run-${RUN}.json`);
const EXPECT={artifactId:9345207863,sourceHead:'29caae94a3db1f1626bdde2ea6ee9a21799f9df6',manifestStatus:'FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED',fileCount:194};
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const clean=v=>String(v==null?'':v).trim();
const need=(v,c,d='')=>{if(!v)throw new Error(`${c}${d?':'+d:''}`);};
const safe=v=>clean(v).replace(/[A-Za-z0-9_-]{50,}/g,'[token-redacted]').slice(0,500);
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');console.log(JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2));};
let adminApp,browser,page,customToken='',idToken='';
const base={schemaVersion:'orbit360-f2-cross-tenant-forced-server-probe-v1',runId:RUN,candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,serverForced:true,transport:'firestore-rest-v1-node-fetch',browserExecuted:false,authRead:true,firestoreRead:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,customTokenPersisted:false,idTokenPersisted:false};
try{
 need(/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(TARGET),'PIPELINE_MECHANISM_FAILURE:RULES01_LOOPBACK_TARGET_REQUIRED');
 need(PROJECT&&EMAIL&&EMAIL_HASH&&sha(EMAIL.toLowerCase().replace(/\s+/g,''))===EMAIL_HASH,'PIPELINE_MECHANISM_FAILURE:RULES01_IDENTITY_CONTEXT_MISMATCH');
 need(BROWSER&&fs.existsSync(BROWSER)&&process.env.GOOGLE_APPLICATION_CREDENTIALS,'PIPELINE_MECHANISM_FAILURE:RULES01_PROVIDER_CONTEXT_MISSING');
 adminApp=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
 const user=await getAuth(adminApp).getUserByEmail(EMAIL);
 need(user&&!user.disabled&&user.emailVerified===true,'DATA_CONTRACT_FAILURE:RULES01_AUTH_IDENTITY_NOT_ELIGIBLE');
 customToken=await getAuth(adminApp).createCustomToken(user.uid,{orbit360F2Rules01ReadOnly:true});
 need(customToken.length>100,'PIPELINE_MECHANISM_FAILURE:RULES01_CUSTOM_TOKEN_MINT_FAILED');
 browser=await chromium.launch({headless:true,executablePath:BROWSER});
 page=await browser.newPage();base.browserExecuted=true;
 const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:45000});
 need(response&&response.status()===200,'ENVIRONMENT_FAILURE:RULES01_CANDIDATE_HTTP_INVALID',String(response&&response.status()));
 await page.waitForFunction(()=>!!(window.Orbit&&Orbit.productRuntimeBrowserProvidersP0),undefined,{timeout:30000});
 const manifest=await page.evaluate(async()=>{const r=await fetch('/orbit360-package-manifest.json',{cache:'no-store'});return{status:r.status,json:r.ok?await r.json():null};});
 need(manifest.status===200&&manifest.json?.status===EXPECT.manifestStatus&&manifest.json?.sourceHead===EXPECT.sourceHead&&Number(manifest.json?.fileCount)===EXPECT.fileCount,'DATA_CONTRACT_FAILURE:RULES01_BROWSER_MANIFEST_MISMATCH');
 idToken=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();await ctx.modules.auth.signInWithCustomToken(ctx.auth,token);return await ctx.auth.currentUser.getIdToken(true);},customToken);
 customToken='';need(idToken&&idToken.length>100,'PIPELINE_MECHANISM_FAILURE:RULES01_ID_TOKEN_MISSING');
 const probePath='tenants/__orbit360_f2_cross_tenant_probe__/system/config';
 const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents/${probePath}`;
 const r=await fetch(url,{method:'GET',headers:{Authorization:`Bearer ${idToken}`,'Cache-Control':'no-cache','Pragma':'no-cache'},cache:'no-store'});
 const text=await r.text();idToken='';base.firestoreRead=true;
 let bodyStatus='';try{bodyStatus=JSON.parse(text)?.error?.status||'';}catch{}
 const denied=r.status===403&&bodyStatus==='PERMISSION_DENIED';
 need(denied,'SECURITY_FAILURE:F2_CROSS_TENANT_FORCED_SERVER_READ_NOT_DENIED',`${r.status}:${bodyStatus||'NO_STATUS'}`);
 write({...base,ok:true,status:'F2_CROSS_TENANT_FORCED_SERVER_DENY_PASS',classification:'PASS',responseStatus:r.status,responseErrorStatus:bodyStatus,crossTenantDenied:true,cacheEligible:false,forcedServerEvidence:true});
}catch(error){write({...base,ok:false,status:String(error?.message||'').split(':')[0]||'SECURITY_FAILURE',classification:String(error?.message||'').split(':')[0]||'SECURITY_FAILURE',error:safe(error?.message||error),crossTenantDenied:false,forcedServerEvidence:true});process.exitCode=41;}finally{customToken='';idToken='';if(page)await page.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(adminApp)await deleteApp(adminApp).catch(()=>{});}
