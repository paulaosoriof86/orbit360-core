import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const STAGE=process.env.I64_PROOF_STAGE||'unknown';
const EXPECTED_SOURCE=process.env.EXPECTED_SOURCE_SHA||'';
const EXPECTED_BUILD=process.env.EXPECTED_BUILD_ID||'';
const OUT=process.env.I64_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i64-code-defect-'+STAGE+'.json');
const clean=(v,m=1200)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I64_PROOF_SERVICE_ACCOUNT');}
function rolesOf(m){return[...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function selectManager(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'])for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}}throw new Error('I64_PROOF_NO_MANAGER');}
async function activate(page,auth,actor){const token=await auth.createCustomToken(actor.uid,{gravicentraI64CodeDefect:true});await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});const st=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(st?.started===true,'I64_PROOF_APP_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:18000});const gate=page.locator('[data-legal-gate].open');if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I64_PROOF_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I64_PROOF_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}}

const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i64-proof-'+STAGE),db=getFirestore(app),auth=getAuth(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_4_CODE_DEFECT_FUNCTIONAL_V1',stage:STAGE,status:'FAIL',release:{},policies:{},kpis:{},renewability:{},errors:[],writes:0,containsPII:false,containsSecrets:false};
try{
  need(/^https:\/\//.test(TARGET),'I64_PROOF_TARGET');
  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),pageErrors=[],http404=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.stack||e?.message||e)));
  page.on('response',r=>{if(r.status()===404&&r.url().startsWith(TARGET))http404.push(new URL(r.url()).pathname);});
  await activate(page,auth,actor);
  const marker=await page.evaluate(()=>({source:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.sourceSha||'',build:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.buildId||''}));
  need(marker.source===EXPECTED_SOURCE&&marker.build===EXPECTED_BUILD,'I64_PROOF_RELEASE_MARKER');ev.release=marker;
  await page.evaluate(()=>{location.hash='#/polizas';});
  await page.waitForFunction(()=>Orbit?.route?.key==='polizas'&&[...document.querySelectorAll('.kpi-row .kpi .k-label')].some(x=>/prima neta vigente/i.test(x.textContent||'')),null,{timeout:22000});
  const result=await page.evaluate(()=>{
    const all=Orbit.store.all('polizas')||[],metrics=Orbit.modules.polizas.policyMetrics;
    const cards=[...document.querySelectorAll('.kpi-row .kpi')];
    const card=label=>{const x=cards.find(k=>(k.querySelector('.k-label')?.textContent||'').trim()===label);return{label:(x?.querySelector('.k-label')?.textContent||'').trim(),value:(x?.querySelector('.k-val')?.textContent||'').replace(/\s+/g,' ').trim(),foot:(x?.querySelector('.k-foot')?.textContent||'').replace(/\s+/g,' ').trim()};};
    const totals=metrics.premiumByCurrency(all),rounded=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(v)]));
    const renewalCount=all.filter(metrics.isRenewalWithin45Days).length,historicalCount=all.filter(metrics.isHistoricalNoPortfolio).length;
    const target=all.find(p=>String(p.numero||'').trim()==='AUTO-490658');
    return{count:all.length,rounded,renewalCount,historicalCount,targetId:target?.id||'',targetState:target?metrics.renewabilityState(target):'',premium:card('Prima neta vigente'),renewals:card('Por renovar ≤45 d'),historical:card('Histórico / sin cartera')};
  });
  need(result.count===1414,'I64_POLICY_COUNT');
  need(Object.keys(result.rounded).includes('GTQ')&&Object.keys(result.rounded).includes('COP'),'I64_CURRENCIES_MISSING');
  need(Object.entries(result.rounded).every(([cur,n])=>result.premium.value.includes(cur)&&result.premium.value.includes(Number(n).toLocaleString('es-GT',{maximumFractionDigits:0}))),'I64_PREMIUM_KPI_VALUES');
  need(/no se suman GTQ y COP/i.test(result.premium.foot),'I64_PREMIUM_KPI_FOOT');
  need(result.renewalCount===10&&Number(result.renewals.value)===result.renewalCount,'I64_RENEWALS_KPI');
  need(result.historicalCount===1191&&Number(result.historical.value)===result.historicalCount,'I64_HISTORICAL_KPI');
  need(result.targetId&&result.targetState==='UNKNOWN','I64_RENEWABILITY_TARGET');
  await page.evaluate(id=>Orbit.modules.cliente360.verPoliza(id),result.targetId);
  await page.waitForSelector('#c360-edit .vp-tags');
  const drawer=await page.locator('#c360-edit').innerText();
  need(/Renovabilidad pendiente de validar/i.test(drawer)&&!/No renovable/i.test(drawer),'I64_RENEWABILITY_UNKNOWN_DISPLAY');
  need(pageErrors.length===0,'I64_PROOF_PAGE_ERRORS');need(http404.length===0,'I64_PROOF_HTTP404');
  ev.policies={count:result.count,actorRole:actor.role};
  ev.kpis={multiCurrency:{status:'PASS',amounts:result.rounded},renewals45:{status:'PASS',count:result.renewalCount},historicalNoPortfolio:{status:'PASS',count:result.historicalCount}};
  ev.renewability={status:'PASS',policyNumber:'AUTO-490658',sourceState:'UNKNOWN',display:'Renovabilidad pendiente de validar'};
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e,220));console.error('I64_PROOF_ERROR='+clean(e?.message||e,220));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');console.log('I64_CODE_DEFECT_PROOF='+ev.status);console.log('I64_CODE_DEFECT_STAGE='+STAGE);console.log('I64_OPERATIONAL_WRITES=0');}
