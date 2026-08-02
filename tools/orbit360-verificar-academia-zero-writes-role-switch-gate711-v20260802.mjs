#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {acceptLegalOnce} from './orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-academia-zero-writes-role-switch-runtime-v20260802.json');
const BASE_URL=String(process.env.ORBIT360_BASE_URL||'').trim();
const TOKEN_FILE=String(process.env.ORBIT360_CUSTOM_TOKEN_FILE||'').trim();
const EXPECTED_UID='woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL='orbit.lab@demo.com';
const EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,asesores:7};
const ROLES=['Dirección','Operativo','Asesor'];
const report={schemaVersion:'orbit360-gate711-academia-zero-writes-role-switch-runtime-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',generatedAt:new Date().toISOString(),status:'INIT',classification:'ROOT_FIX_RUNTIME_VERIFICATION',stage:'init',checks:{},writeGuard:{calls:[]},firestoreWrites:0,operationalWrites:0,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:false};
function clean(v){return String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,700);}
function save(){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');}
function requireState(value,code,detail=''){if(!value)throw new Error(code+(detail?':'+clean(detail):''));}
async function bounded(name,fn,ms=30000){report.stage=name;let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PIPELINE_STEP_TIMEOUT:'+name)),ms);})]);}finally{clearTimeout(timer);}}
async function settleLegal(page){
  await bounded('legal_owner_ready',()=>page.waitForFunction(()=>{
    const visible=Array.from(document.querySelectorAll('[data-legal-gate]')).some(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});
    const legal=window.Orbit&&Orbit.legal,state=legal&&legal.__gateState||{};
    return visible||Object.values(state.pendingScopes||{}).some(Boolean)||Object.values(state.doneScopes||{}).some(Boolean)||(legal&&typeof legal.aceptaciones==='function'&&Object.keys(legal.aceptaciones()||{}).length>0);
  },null,{timeout:20000,polling:100}),22000);
  if(await page.locator('[data-legal-gate]:visible').count())await acceptLegalOnce(page,{bounded,requireState,report});
  await bounded('legal_absent',()=>page.waitForFunction(()=>!Array.from(document.querySelectorAll('[data-legal-gate]')).some(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;}),null,{timeout:20000,polling:100}),22000);
}
async function selectRole(page,role){
  await page.evaluate(target=>{
    const select=document.getElementById('rol-sel');
    if(!select)throw new Error('ROLE_SELECTOR_MISSING');
    const option=Array.from(select.options||[]).find(item=>String(item.value||'')===target||String(item.textContent||'').trim()===target);
    if(!option)throw new Error('ROLE_OPTION_MISSING');
    if(window.__orbitRootFixWriteGuard)window.__orbitRootFixWriteGuard.triggerRole=target;
    select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));
  },role);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,role,{timeout:15000,polling:100});
  await page.waitForTimeout(900);
  await page.evaluate(()=>{if(window.__orbitRootFixWriteGuard)window.__orbitRootFixWriteGuard.triggerRole='';});
}
let browser;
try{
  requireState(/^https?:\/\//.test(BASE_URL),'BASE_URL_INVALID');
  requireState(TOKEN_FILE&&fs.existsSync(TOKEN_FILE),'CUSTOM_TOKEN_FILE_MISSING');
  const token=fs.readFileSync(TOKEN_FILE,'utf8').trim();requireState(token.length>100,'CUSTOM_TOKEN_INVALID');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);
  await bounded('open_checkout',()=>page.goto(BASE_URL,{waitUntil:'domcontentloaded'}),70000);
  await bounded('firebase_ready',()=>page.waitForFunction(()=>window.firebase&&typeof firebase.auth==='function'&&firebase.apps&&firebase.apps.length>0,{timeout:45000,polling:100}),50000);
  const auth=await bounded('signin_existing_identity',()=>page.evaluate(async({token})=>{const c=await firebase.auth().signInWithCustomToken(token),u=c&&c.user||firebase.auth().currentUser;return{uid:String(u&&u.uid||''),email:String(u&&u.email||'').toLowerCase()};},{token}),45000);
  requireState(auth.uid===EXPECTED_UID&&auth.email===EXPECTED_EMAIL,'IDENTITY_MISMATCH');
  await bounded('store_hydrated',()=>page.waitForFunction(expected=>{const S=window.Orbit&&Orbit.store;return !!(S&&S.__canonicalReadModelV79===true&&S.__singleReadOwner===true&&Object.entries(expected).every(([name,count])=>(S.all(name)||[]).length===count));},EXPECTED,{timeout:150000,polling:250}),160000);
  await settleLegal(page);
  await bounded('academia_root_fix_ready',()=>page.waitForFunction(()=>{const A=window.Orbit&&Orbit.academiaOperationalDirectoryV20260722,S=window.Orbit&&Orbit.store;return !!(A&&A.rootFix==='20260802.1'&&A.sessionChangeWrites===false&&A.targetOnlyIdempotentUpsert===true&&typeof A.contentReady==='function'&&A.contentReady(S));},null,{timeout:30000,polling:100}),35000);
  const before=await page.evaluate(()=>({rootFix:Orbit.academiaOperationalDirectoryV20260722.rootFix,sessionChangeWrites:Orbit.academiaOperationalDirectoryV20260722.sessionChangeWrites,lessons:['m1_operational_directory_direccion_1232','m1_operational_directory_operativo_1232','m1_operational_directory_asesor_1232'].filter(id=>Orbit.store.get('lecciones',id)).length,evaluation:Boolean(Orbit.store.get('evaluaciones','eval_m1_operational_directory_1232')),config:String((Orbit.store.get('config','academia')||{}).contenidoDirectorioOperativo||'')}));
  requireState(before.lessons===3&&before.evaluation&&before.config==='1.232','ACADEMIA_CONTENT_NOT_READY');
  await page.evaluate(()=>{
    const calls=[],S=Orbit.store,guard={calls,triggerRole:''};
    ['insert','update','remove','setPref'].forEach(name=>{const original=S[name];S[name]=function(){const args=Array.from(arguments),stack=String(new Error('ROOT_FIX_WRITE_TRACE').stack||'').split('\n').slice(0,10).map(line=>line.replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').trim()).filter(Boolean);calls.push({operation:name,collection:typeof args[0]==='string'?args[0]:'',triggerRole:guard.triggerRole,activeRole:Orbit.session&&Orbit.session.rol?Orbit.session.rol():'',route:String(location.hash||'').split('?')[0],topFrame:String(stack.find(line=>!/ROOT_FIX_WRITE_TRACE/.test(line))||''),blocked:true,backendReached:false});return null;};S[name].__guardedOriginal=original;});
    window.__orbitRootFixWriteGuard=guard;
  });
  for(const role of ROLES)await selectRole(page,role);
  const after=await page.evaluate(()=>({calls:(window.__orbitRootFixWriteGuard&&window.__orbitRootFixWriteGuard.calls)||[],contentReady:Orbit.academiaOperationalDirectoryV20260722.contentReady(Orbit.store),activeRole:Orbit.session.rol()}));
  report.writeGuard.calls=after.calls.map(item=>({...item,topFrame:clean(item.topFrame)}));
  report.checks.identity=true;report.checks.store=true;report.checks.legalSettled=true;report.checks.rootFixMarker=before.rootFix==='20260802.1';report.checks.staticContentReadyBeforeGuard=before.lessons===3&&before.evaluation&&before.config==='1.232';report.checks.rolesVisited=ROLES.length;report.checks.contentReadyAfterRoles=after.contentReady===true;report.checks.zeroWriteAttempts=after.calls.length===0;
  requireState(after.calls.length===0,'ACADEMIA_ROLE_SWITCH_WRITE_ATTEMPT',JSON.stringify(after.calls));
  requireState(after.contentReady===true,'ACADEMIA_CONTENT_LOST_AFTER_ROLE_SWITCH');
  report.status='GATE711_ACADEMIA_ZERO_WRITES_ROLE_SWITCH_RUNTIME_PASS';report.classification='ROOT_FIX_RUNTIME_VERIFIED';report.ok=true;
}catch(error){report.status='GATE711_ACADEMIA_ZERO_WRITES_ROLE_SWITCH_RUNTIME_FAIL';report.classification=String(error&&error.message||error).split(':')[0]||'FUNCTIONAL_DEFECT';report.error=clean(error&&error.message||error);report.ok=false;}
finally{if(browser)await browser.close().catch(()=>{});save();}
process.exit(report.ok?0:41);
