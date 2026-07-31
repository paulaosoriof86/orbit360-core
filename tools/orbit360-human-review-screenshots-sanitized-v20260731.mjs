#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const ROOT=process.cwd();
const OUTDIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/human-review-sanitized-screens');
const REPORT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/human-review-sanitized-screens-v20260731.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const report={schemaVersion:'orbit360-human-review-sanitized-screens-v1',generatedAt:new Date().toISOString(),ok:false,status:'INIT',screens:[],readOnly:true,firestoreWrites:0,operationalWrites:0,hostingDeployExecutions:0,production:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(OUTDIR,{recursive:true});
const save=()=>fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
async function route(page,hash){const key=String(hash||'').replace(/^#\/?/,'').split('?')[0]||'inicio';await page.evaluate(h=>{if(location.hash===h)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=h;},hash);await page.waitForFunction(expected=>window.Orbit&&Orbit.route&&Orbit.route.key===expected,key,{timeout:15000,polling:50});await page.waitForTimeout(450);}
async function role(page,name){const ok=await page.evaluate(target=>{const sel=document.getElementById('rol-sel');if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return true;}}return !!(Orbit.session&&Orbit.session.set&&Orbit.session.set(target));},name);if(!ok)throw new Error('ROLE_SELECTION_FAILED');await page.waitForFunction(target=>Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,name,{timeout:12000});}
async function sanitize(page,mode){
  await page.evaluate(mode=>{
    const mask='••••';
    function replace(el){if(!el)return;el.textContent=mask;el.style.letterSpacing='.12em';}
    document.querySelectorAll('.mono').forEach(replace);
    document.querySelectorAll('h1,h2').forEach(el=>{const t=(el.textContent||'').trim();if(/p[oó]liza|cliente|veh[ií]culo/i.test(t))el.textContent=t.replace(/([A-Z0-9][A-Z0-9._\-/]{2,}|\b\d{4,}\b)/gi,'••••');});
    if(mode==='polizas'){
      document.querySelectorAll('#host table.tbl tbody tr').forEach(tr=>Array.from(tr.children).forEach((td,i)=>{if(i<=5||i===6){if(!td.querySelector('.badge'))replace(td);}}));
    }
    if(mode==='receipts-list'){
      document.querySelectorAll('#host table.tbl tbody td').forEach(td=>{if(!td.querySelector('.badge'))replace(td);});
    }
    if(mode==='detail'){
      document.querySelectorAll('#host .muted').forEach(label=>{const parent=label.parentElement;if(parent&&parent.children.length>=2){const val=parent.children[1];if(val&&!val.classList.contains('badge'))replace(val);}});
      document.querySelectorAll('#host .orbit-detail-grid > div').forEach(box=>{const children=box.children;if(children.length>=2)replace(children[1]);});
      document.querySelectorAll('#host [data-rp-receipt-detail="1"] .mono,#host [data-vehicle-fullpage="1"] .mono,#host [data-policy-fullpage="1"] .mono').forEach(replace);
    }
    const style=document.createElement('style');style.id='orbit-screenshot-sanitize';style.textContent='body{caret-color:transparent!important}';document.head.appendChild(style);
  },mode);
}
async function shot(page,name,mode){await sanitize(page,mode);const file=path.join(OUTDIR,name);await page.screenshot({path:file,fullPage:true});const st=fs.statSync(file);report.screens.push({name,bytes:st.size,mode});}

let browser;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('LAB_INPUT_REQUIRED');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');
  await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});await page.locator('#login-form').waitFor({state:'visible',timeout:20000});await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});if(!gates||!gates.ok||gates.remaining!==0)throw new Error('BLOCKING_GATE_NOT_SETTLED');
  await page.waitForFunction(expected=>{if(!Orbit.store)return false;for(const [n,v] of Object.entries(expected))if((Orbit.store.all(n)||[]).length!==v)return false;const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready);},EXPECT,{timeout:90000,polling:250});
  await role(page,'Dirección');
  const samples=await page.evaluate(()=>{const ps=Orbit.store.all('polizas')||[],vs=Orbit.store.all('vehiculos')||[],rs=Orbit.store.all('recibosEsperados')||[],cs=Orbit.store.all('carteraPrimas')||[];const pmap=new Map(ps.map(p=>[p.id,p])),rmap=new Map(rs.map(r=>[r.id,r]));const active=p=>p&&(p.estado==='Vigente'||p.estado==='Por renovar');const rich=rs.find(r=>active(pmap.get(r.polizaId))&&r.primaTotal!=null)||rs[0];const veh=vs.find(v=>pmap.get(v.polizaId)&&v.clienteId)||vs[0];const recon=cs.find(c=>{const src=String(c.fuenteAutoridad||'').toLowerCase();return c.reciboId&&rmap.has(c.reciboId)&&src&&src!=='siga'&&c.matchQuality&&c.sourceRef&&c.requiereValidacion!==true;});return{policy:rich?{c:rich.clienteId,p:rich.polizaId,r:rich.id}:null,vehicle:veh?{c:veh.clienteId,v:veh.id}:null,reconciled:recon?{c:rmap.get(recon.reciboId).clienteId,r:recon.reciboId}:null};});
  if(!samples.policy||!samples.vehicle||!samples.reconciled)throw new Error('SANITIZED_SAMPLE_UNAVAILABLE');
  await route(page,'#/polizas');await page.waitForSelector('#host table.tbl',{timeout:12000});await shot(page,'01-polizas-global.png','polizas');
  await route(page,`#/cliente360?c=${samples.policy.c}&p=${samples.policy.p}`);await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:12000});await shot(page,'02-policy-fullpage.png','detail');
  await route(page,`#/cliente360?c=${samples.vehicle.c}&v=${samples.vehicle.v}`);await page.waitForSelector('[data-vehicle-fullpage="1"]',{timeout:12000});await shot(page,'03-vehicle-fullpage.png','detail');
  await route(page,`#/cliente360?c=${samples.policy.c}&t=recibos`);await page.waitForSelector('#rp-v910-policy',{timeout:12000});await shot(page,'04-receipts-list.png','receipts-list');
  await page.locator(`[data-rp-receipt-id="${samples.policy.r}"]`).click();await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:12000});await shot(page,'05-receipt-detail.png','detail');
  await route(page,`#/cliente360?c=${samples.reconciled.c}&t=recibos`);await page.waitForSelector('#rp-v910-policy',{timeout:12000});await page.locator(`[data-rp-receipt-id="${samples.reconciled.r}"]`).click();await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:12000});await shot(page,'06-portfolio-reconciled.png','detail');
  report.ok=true;report.status='SANITIZED_VISUAL_SET_READY';
}catch(e){report.ok=false;report.status='SANITIZED_VISUAL_SET_FAILED';report.error=String(e&&e.message||e).replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,220);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
