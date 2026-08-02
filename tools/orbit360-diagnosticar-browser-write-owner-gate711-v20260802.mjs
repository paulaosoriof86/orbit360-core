#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {acceptLegalOnce} from './orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-browser-write-owner-diagnostic-v20260802.json');
const BASE_URL=String(process.env.ORBIT360_BASE_URL||'').trim();
const TOKEN_FILE=String(process.env.ORBIT360_CUSTOM_TOKEN_FILE||'').trim();
const EXPECTED_UID='woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL='orbit.lab@demo.com';
const EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,asesores:7};

const report={schemaVersion:'orbit360-gate711-browser-write-owner-diagnostic-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',contractVersion:'7.11.0',generatedAt:new Date().toISOString(),status:'INIT',classification:'DIAGNOSTIC_ONLY',stage:'init',authMode:'existing_custom_token_readonly',attempts:[],checks:{},firestoreWrites:0,operationalWrites:0,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:false};
function clean(v){return String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,900);}
function save(){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');}
function requireState(value,code){if(!value)throw new Error(code);}
async function bounded(name,fn,ms=30000){report.stage=name;let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PIPELINE_STEP_TIMEOUT:'+name)),ms);})]);}finally{clearTimeout(timer);}}
async function settleLegal(page){
  await bounded('legal_owner_ready',()=>page.waitForFunction(()=>{
    const visible=Array.from(document.querySelectorAll('[data-legal-gate]')).some(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});
    const legal=window.Orbit&&Orbit.legal,state=legal&&legal.__gateState||{};
    return visible||Object.values(state.pendingScopes||{}).some(Boolean)||Object.values(state.doneScopes||{}).some(Boolean)||(legal&&typeof legal.aceptaciones==='function'&&Object.keys(legal.aceptaciones()||{}).length>0);
  },null,{timeout:20000,polling:100}),22000);
  const visible=await page.locator('[data-legal-gate]:visible').count();
  if(visible)await acceptLegalOnce(page,{bounded,requireState,report});
  await bounded('legal_absent',()=>page.waitForFunction(()=>!Array.from(document.querySelectorAll('[data-legal-gate]')).some(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;}),null,{timeout:20000,polling:100}),22000);
}
async function selectRole(page,role){
  await page.evaluate(target=>{
    const select=document.getElementById('rol-sel');
    if(!select)throw new Error('ROLE_SELECTOR_MISSING');
    const option=Array.from(select.options||[]).find(item=>String(item.value||'')===target||String(item.textContent||'').trim()===target);
    if(!option)throw new Error('ROLE_OPTION_MISSING');
    select.value=option.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  },role);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,role,{timeout:15000,polling:100});
  await page.waitForTimeout(650);
}

let browser;
try{
  requireState(/^https?:\/\//.test(BASE_URL),'BASE_URL_INVALID');
  requireState(TOKEN_FILE&&fs.existsSync(TOKEN_FILE),'CUSTOM_TOKEN_FILE_MISSING');
  const token=fs.readFileSync(TOKEN_FILE,'utf8').trim();
  requireState(token.length>100,'CUSTOM_TOKEN_INVALID');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(20000);
  await bounded('open_checkout',()=>page.goto(BASE_URL,{waitUntil:'domcontentloaded'}),70000);
  await bounded('firebase_ready',()=>page.waitForFunction(()=>window.firebase&&typeof firebase.auth==='function'&&firebase.apps&&firebase.apps.length>0,{timeout:45000,polling:100}),50000);
  const auth=await bounded('signin_existing_identity',()=>page.evaluate(async({token,uid,email})=>{const credential=await firebase.auth().signInWithCustomToken(token),user=credential&&credential.user||firebase.auth().currentUser;return{uid:String(user&&user.uid||''),email:String(user&&user.email||'').toLowerCase()};},{token,uid:EXPECTED_UID,email:EXPECTED_EMAIL}),45000);
  requireState(auth.uid===EXPECTED_UID&&auth.email===EXPECTED_EMAIL,'IDENTITY_MISMATCH');
  await bounded('store_hydrated',()=>page.waitForFunction(expected=>{const S=window.Orbit&&Orbit.store;return !!(S&&S.__canonicalReadModelV79===true&&S.__singleReadOwner===true&&Object.entries(expected).every(([name,count])=>(S.all(name)||[]).length===count));},EXPECTED,{timeout:150000,polling:250}),160000);
  await settleLegal(page);

  await page.evaluate(()=>{
    const calls=[],S=Orbit.store;
    function payloadKeys(value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).sort().slice(0,40):[];}
    function sanitizeStack(stack){return String(stack||'').split('\n').slice(0,12).map(line=>line.replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').trim()).filter(Boolean);}
    ['insert','update','remove','setPref'].forEach(name=>{
      const original=S[name];
      S[name]=function(){
        const args=Array.from(arguments),collection=typeof args[0]==='string'?args[0]:'',payload=name==='insert'?args[1]:(name==='update'?args[2]:null);
        calls.push({operation:name,collection:String(collection||'').slice(0,80),payloadKeys:payloadKeys(payload),argumentCount:args.length,role:Orbit.session&&Orbit.session.rol?String(Orbit.session.rol()||''):'',route:String(location.hash||'').split('?')[0],stack:sanitizeStack(new Error('WRITE_OWNER_TRACE').stack),at:new Date().toISOString()});
        throw new Error('RUNTIME_WRITE_GUARD:'+name);
      };
      S[name].__guardedOriginal=original;
    });
    window.__orbitWriteOwnerDiagnostic={calls};
  });

  for(const role of ['Dirección','Operativo','Asesor'])await selectRole(page,role);
  report.attempts=await page.evaluate(()=>((window.__orbitWriteOwnerDiagnostic&&window.__orbitWriteOwnerDiagnostic.calls)||[]));
  report.checks.identity=true;
  report.checks.store=true;
  report.checks.legalSettled=true;
  report.checks.rolesAttempted=3;
  report.checks.stackCaptured=report.attempts.length>0&&report.attempts.every(item=>Array.isArray(item.stack)&&item.stack.length>0);
  report.checks.collectionCaptured=report.attempts.length>0&&report.attempts.every(item=>typeof item.collection==='string'&&item.collection.length>0);
  report.status='GATE711_BROWSER_WRITE_OWNER_DIAGNOSTIC_CAPTURED';
  report.classification='OWNER_DIAGNOSTIC_READY';
  report.ok=report.attempts.length>0&&report.checks.stackCaptured&&report.checks.collectionCaptured;
}catch(error){report.status='GATE711_BROWSER_WRITE_OWNER_DIAGNOSTIC_FAIL';report.classification=String(error&&error.message||error).split(':')[0]||'DIAGNOSTIC_FAILURE';report.error=clean(error&&error.message||error);report.ok=false;}
finally{if(browser)await browser.close().catch(()=>{});save();}
process.exit(report.ok?0:41);
