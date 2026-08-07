#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const BASE_URL = process.env.ORBIT360_LAB_URL || 'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2';
const EVIDENCE = process.env.ORBIT360_BROWSER_PRECHECK_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-browser-precheck-sanitized-v20260807.json';
const MATRIX_ROLES = ['superadmin','direccion','admintenant'];
const norm = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean = v => String(v == null ? '' : v).replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/\b\d{6,}\b/g,'[id]').slice(0,500);
function write(value){ fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true}); fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(value,null,2)+'\n','utf8'); }

async function main(){
  const output = { schemaVersion:'orbit360-block1-v23-browser-precheck-v1', gateId:'block1-client360-insurers-lab-v20260717', contractVersion:'1.0.26', stage:'STARTED', classification:'', checkpoint:'BOOT', firestoreReads:0, firestoreWrites:0, authWrites:0, operationalWrites:0, deployExecuted:false, productionTouched:false, containsPII:false, containsSecrets:false, ok:false };
  let browser;
  try {
    output.checkpoint='SERVICE_ACCOUNT_VALIDATE'; write(output);
    const key=process.env.GOOGLE_APPLICATION_CREDENTIALS; if(!key) throw new Error('ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');
    const service=JSON.parse(fs.readFileSync(key,'utf8')); if(service.project_id!==PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
    const {default:admin}=await import('firebase-admin'); const {chromium}=await import('playwright');
    if(!admin.apps.length) admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT});
    const db=admin.firestore();
    const members=await db.collection('tenants').doc(TENANT).collection('members').get(); output.firestoreReads+=1;
    const row=members.docs.map(doc=>({uid:doc.id,data:doc.data()||{}})).find(item=>{
      const roles=[...(Array.isArray(item.data.roles)?item.data.roles:[]),item.data.activeRole,item.data.rolActivo,item.data.role,item.data.rol].filter(Boolean).map(norm);
      const status=norm(item.data.status||item.data.estado); return !['inactive','inactivo','blocked','bloqueado'].includes(status) && roles.some(r=>MATRIX_ROLES.includes(r));
    });
    if(!row) throw new Error('DATA_CONTRACT_FAILURE_NO_DIRECTION_MEMBERSHIP');
    output.checkpoint='BROWSER_LAUNCH'; write(output); browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-GT'}); const page=await context.newPage();
    await page.goto(BASE_URL+'#/inicio',{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForSelector('#login-form',{timeout:30000});
    await page.waitForFunction(()=>!!(window.firebase&&typeof firebase.auth==='function'),null,{timeout:30000});
    const token=await admin.auth().createCustomToken(row.uid); await page.evaluate(async t=>firebase.auth().signInWithCustomToken(t),token);
    await page.waitForFunction(()=>!document.body.classList.contains('pre-auth')&&document.body.dataset.authStage==='inside',null,{timeout:35000});
    await page.waitForFunction(()=>{try{const s=Orbit.session&&Orbit.session.membershipProjectionStatus&&Orbit.session.membershipProjectionStatus();return !!(s&&s.ready===true&&s.tenantBound===true&&Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.productReadOnly===true);}catch{return false;}},null,{timeout:35000});
    await page.waitForFunction(()=>{const host=document.getElementById('host');return Orbit.route&&Orbit.route.key==='inicio'&&host&&(host.innerText||'').trim().length>60&&!document.querySelector('.orbit-load-state');},null,{timeout:35000});
    const state=await page.evaluate(()=>({authStage:document.body.dataset.authStage||'',route:Orbit.route&&Orbit.route.key||'',membership:(Orbit.session&&Orbit.session.membershipProjectionStatus&&Orbit.session.membershipProjectionStatus())||{},productReadOnly:!!(Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.productReadOnly===true),hostTextLength:(document.getElementById('host')&&document.getElementById('host').innerText||'').trim().length}));
    output.stage='PASS_BLOCK1_V23_BROWSER_PRECHECK'; output.classification='GO_FULL_BLOCK1_MATRIX'; output.checkpoint='INICIO_READY_PASS'; output.observed={authInside:state.authStage==='inside',route:state.route,membershipReady:state.membership.ready===true,tenantBound:state.membership.tenantBound===true,productReadOnly:state.productReadOnly,hostTextLength:state.hostTextLength}; output.ok=output.observed.authInside&&output.observed.route==='inicio'&&output.observed.membershipReady&&output.observed.tenantBound&&output.observed.productReadOnly&&output.observed.hostTextLength>60;
    if(!output.ok) throw new Error('FUNCTIONAL_DEFECT_PRECHECK_STATE_INVALID');
    await context.close();
  } catch(error){ output.stage='STOP_RETRY_BLOCK1_V23_BROWSER_PRECHECK'; const msg=String(error&&error.message||error); output.classification=/PROJECT_MISMATCH|CREDENTIAL/.test(msg)?'ENVIRONMENT_FAILURE':/DATA_CONTRACT_FAILURE/.test(msg)?'DATA_CONTRACT_FAILURE':/_TIMEOUT|PRECHECK_STATE_INVALID/.test(msg)?'FUNCTIONAL_DEFECT':'PIPELINE_MECHANISM_FAILURE'; output.error=clean(msg); output.ok=false; }
  finally{ if(browser) await browser.close(); write(output); console.log(JSON.stringify(output,null,2)); }
  return output;
}
if(process.env.ORBIT360_PRECHECK_VALIDATE_ONLY==='1'){ console.log(JSON.stringify({status:'PASS_V23_BROWSER_PRECHECK_IMPORT',externalRuntimeDependenciesLoaded:false,ok:true})); }
else { const out=await main(); process.exitCode=out.ok?0:42; }
