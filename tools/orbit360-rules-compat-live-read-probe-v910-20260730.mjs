#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/rules-compat-live-read-probe-v910.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const tenant='alianzas-soluciones';
const report={schemaVersion:'orbit360-rules-compat-live-read-probe-v1',contractVersion:'9.1.0',status:'STARTED',checks:{},firestoreRead:true,firestoreWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,360);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');};
const need=(ok,code)=>{if(!ok)throw new Error(code);};
async function denied(promise){try{await promise;return false;}catch(e){return /permission-denied|insufficient permissions/i.test(String(e&&e.code||'')+' '+String(e&&e.message||''));}}
let browser,page;
try{
  need(/^https:\/\//.test(url),'LAB_URL_REQUIRED');need(email.includes('@'),'LAB_EMAIL_REQUIRED');need(password.length>=12,'LAB_PASSWORD_REQUIRED');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(url+'/?orbitBackend=firestore-lab&tenant='+encodeURIComponent(tenant),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.firebase&&firebase.auth&&firebase.auth().currentUser,undefined,{timeout:30000,polling:100});
  const result=await page.evaluate(async tenantId=>{
    const db=firebase.firestore();
    async function allow(ref){try{const s=await ref.limit(1).get();return{allowed:true,size:s.size};}catch(e){return{allowed:false,code:String(e&&e.code||'')}}}
    async function deny(ref){try{await ref.limit(1).get();return{denied:false};}catch(e){return{denied:/permission-denied/i.test(String(e&&e.code||'')+' '+String(e&&e.message||'')),code:String(e&&e.code||'')}}}
    return {
      legacyClients:await allow(db.collection('tenantId').doc(tenantId).collection('clientes')),
      normalizedClients:await allow(db.collection('tenants').doc(tenantId).collection('data').doc('clientes').collection('items')),
      legacySensitive:await deny(db.collection('tenantId').doc(tenantId).collection('documentos')),
      credentialRefs:await deny(db.collection('tenants').doc(tenantId).collection('credentialRefs'))
    };
  },tenant);
  report.checks.legacyAllowedCollectionRead=result.legacyClients.allowed===true&&result.legacyClients.size>0;
  report.checks.productNormalizedReadPreserved=result.normalizedClients.allowed===true&&result.normalizedClients.size>0;
  report.checks.sensitiveLegacyCollectionDenied=result.legacySensitive.denied===true;
  report.checks.credentialRefsStillDenied=result.credentialRefs.denied===true;
  need(Object.values(report.checks).every(Boolean),'LIVE_RULES_READ_CONTRACT_FAILED');
  report.ok=true;report.status='RULES_COMPAT_LIVE_READ_PASS';
}catch(error){report.ok=false;report.status='RULES_COMPAT_LIVE_READ_FAIL';report.error=clean(error&&error.message||error);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
