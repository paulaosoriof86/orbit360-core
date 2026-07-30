#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const baseUrl=String(process.env.ORBIT360_PRODUCT_URL||'').trim();
const mode=String(process.argv[2]||'product').trim().toLowerCase();
const timeoutMs=Math.max(15000,Number(process.env.ORBIT360_HOSTING_READINESS_TIMEOUT_MS||90000));
const intervalMs=Math.max(1000,Number(process.env.ORBIT360_HOSTING_READINESS_INTERVAL_MS||3000));
const out=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716',`m6-hosting-readiness-${mode}.json`);
const start=Date.now();
const observations=[];
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,220);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function save(payload){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n');}
function productReady(body){return body.includes('auth-product-runtime-p0.js')&&body.includes('Orbit.productAppP0.init();')&&!/backend-lab-loader|store-firestore-lab|data\/seed\.js|admin@demo\.com|orbit\.lab@demo\.com|demo123/i.test(body);}
function rollbackReady(body){return body.includes('La plataforma no está disponible temporalmente');}
if(!/^https:\/\//.test(baseUrl)||!['product','rollback'].includes(mode)){save({ok:false,status:'PIPELINE_MECHANISM_FAILURE',error:'HOSTING_READINESS_INPUT_INVALID',mode,timeoutMs,intervalMs,attempts:0,elapsedMs:0,readOnly:true});process.exit(41);}
let attempt=0,lastStatus=0,lastError='';
while(Date.now()-start<=timeoutMs){
  attempt+=1;
  try{
    const url=new URL(baseUrl);url.searchParams.set('orbitReadiness',`${mode}-${Date.now()}-${attempt}`);
    const response=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache, no-store','pragma':'no-cache'}});
    lastStatus=response.status;
    const body=await response.text();
    const ready=mode==='product'?productReady(body):rollbackReady(body);
    observations.push({attempt,status:response.status,ready,elapsedMs:Date.now()-start});
    if(observations.length>12)observations.shift();
    if(ready){save({ok:true,status:'M6_HOSTING_READINESS_PASS',mode,httpStatus:response.status,attempts:attempt,elapsedMs:Date.now()-start,timeoutMs,intervalMs,transient404Observed:observations.some(x=>x.status===404),readOnly:true,observations});process.exit(0);}
    if(response.status>=500&&response.status!==503)lastError=`HTTP_${response.status}`;
  }catch(error){lastError=clean(error&&error.message||error);observations.push({attempt,status:0,ready:false,error:lastError,elapsedMs:Date.now()-start});if(observations.length>12)observations.shift();}
  if(Date.now()-start+intervalMs>timeoutMs)break;
  await sleep(intervalMs);
}
save({ok:false,status:'M6_HOSTING_READINESS_TIMEOUT',mode,httpStatus:lastStatus,attempts:attempt,elapsedMs:Date.now()-start,timeoutMs,intervalMs,lastError,readOnly:true,observations});process.exit(41);
