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
const MASK='••••••';
const report={schemaVersion:'orbit360-human-review-sanitized-screens-v4',generatedAt:new Date().toISOString(),ok:false,status:'INIT',classification:'SECURITY_FAILURE_RECOVERY',securityFailClosed:true,invalidatedPriorRun:30674070410,stage:'init',screens:[],sanitization:{maskedTextNodes:0,maskedFormValues:0,residualDynamicText:0,residualVisibleFormValues:0,hiddenInternalValuesIgnoredByScreenshotContract:0},readOnly:true,firestoreWrites:0,operationalWrites:0,hostingDeployExecutions:0,production:false,containsPII:null,containsSecrets:null};
fs.rmSync(OUTDIR,{recursive:true,force:true});
fs.mkdirSync(OUTDIR,{recursive:true});
const save=()=>fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const STATIC_LABELS=[
  'Orbit 360','Inicio','Clientes','Aseguradoras','Pólizas','Vehículos','Recibos y pagos','Cobros','Conciliaciones','Comisiones','Renovaciones','Cancelaciones','Calidad','Historial','Portal','Ops','Marketing','Academia','Dirección','Operativo','Asesor','Buscar','Filtros','Limpiar','Ver','Abrir','Cerrar','Volver','Volver al cliente','Abrir póliza completa',
  'Pólizas','Póliza','Cliente','Ramo / Producto','Ramo','Producto','Aseguradora','Asesor','Prima total','Vence','Estado','Vigencia','Moneda','Total','Resumen','Datos de la póliza','Prima y condiciones de pago','Prima neta','Gastos de expedición','Gastos financieros','Descuento / ajuste (campo fuente)','IVA / impuestos','Prima total de póliza','Total calendario de recibos','Frecuencia','Forma de pago','Conducto','Conducto de pago','Diferencia póliza vs calendario','Información pendiente de completar',
  'Vehículo','Vehículo asegurado','Detalle completo del vehículo','Póliza vinculada','Marca','Línea / tipo','Modelo / año','Placa','Inciso','Uso','Chasis / VIN','Motor','Color','Suma asegurada','Concepto','Descripción',
  'Recibos y cartera','Recibo esperado','Recibo','Serie / recibo','Serie','Tipo','Calendario activo','Histórica exigible','Desglose del recibo','Fecha límite','Fecha pago reportada','Estado y conciliación','Trazabilidad','Fuente autoridad','Corte de fuente','Calidad de match','Referencia fuente','En cartera','Por vencer','Exigible','Conciliada con aseguradora',
  'Cartera conciliada con aseguradora','Cobro conciliado','Pago reportado · por conciliar','Pendiente de conciliación','Requiere validación','Futuro','Vencido','Por vencer','Sin saldo pendiente según aseguradora','No reportada','Pendiente de completar','Vigente','Por renovar','Histórica','Renovada','Cancelada','Validado','Validada','Pendiente','Activo','Activa','Inactivo','Inactiva',
  'Este pago ya fue conciliado contra fuentes autoritativas y se considera cobro conciliado.','El saldo pendiente fue conciliado contra la fuente de autoridad de la aseguradora. Esto confirma cartera; no equivale a un pago.','Existe evidencia de pago reportado, pero aún no es un cobro conciliado.','La aseguradora no reporta saldo pendiente; la ausencia de saldo no crea por sí sola un cobro conciliado.','El estado requiere validación antes de cualquier conciliación.','Este registro pertenece al calendario de recibos; los cobros conciliados se administran por separado.','Cartera conciliada confirma el saldo pendiente contra la aseguradora; no equivale a un pago. Un pago reportado solo se muestra como Cobro conciliado cuando su conciliación de fuentes está confirmada. Clic en un recibo abre su detalle.'
];
const ALLOW=new Set(STATIC_LABELS.map(norm));
const punctuationOnly=v=>/^[\s·•|/\\—–:,.;()\[\]{}+\-→←‹›×✕]+$/.test(String(v||''));
const isMask=v=>/^•+$/.test(String(v||'').replace(/\s+/g,''));
const isAllowed=v=>{const s=String(v==null?'':v).trim();return !s||isMask(s)||punctuationOnly(s)||ALLOW.has(norm(s));};

async function route(page,hash){
  const key=String(hash||'').replace(/^#\/?/,'').split('?')[0]||'inicio';
  await page.evaluate(h=>{if(location.hash===h)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=h;},hash);
  await page.waitForFunction(expected=>window.Orbit&&Orbit.route&&Orbit.route.key===expected,key,{timeout:15000,polling:50});
  await page.waitForTimeout(450);
}

async function role(page,name){
  report.stage='role_ready';
  await page.waitForFunction(target=>{
    if(!window.Orbit||!Orbit.session)return false;
    const active=Orbit.session.rol?Orbit.session.rol():'';
    if(active===target)return true;
    const allowed=Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];
    const sel=document.getElementById('rol-sel');
    const hasOption=!!(sel&&Array.from(sel.options||[]).some(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target));
    return allowed.includes(target)&&(hasOption||typeof Orbit.session.set==='function');
  },name,{timeout:15000,polling:50});
  report.stage='role_select';
  const result=await page.evaluate(target=>{
    const active=Orbit.session&&Orbit.session.rol?Orbit.session.rol():'';
    if(active===target)return{ok:true,via:'already-active',active};
    const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];
    if(!allowed.includes(target))return{ok:false,via:'not-allowed',active,allowedCount:allowed.length};
    const sel=document.getElementById('rol-sel');
    if(sel){
      const option=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);
      if(option){sel.value=option.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'selector',active};}
    }
    return{ok:Boolean(Orbit.session&&typeof Orbit.session.set==='function'&&Orbit.session.set(target)),via:'session',active};
  },name);
  if(!result||!result.ok)throw new Error('ROLE_SELECTION_FAILED');
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,name,{timeout:15000,polling:50});
  await page.waitForTimeout(350);
  report.roleSelection={target:name,via:String(result.via||''),confirmed:true};
}

async function sanitizeFailClosed(page){
  const result=await page.evaluate(({labels,mask})=>{
    const normalize=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const allow=new Set(labels.map(normalize));
    const punctuationOnly=v=>/^[\s·•|/\\—–:,.;()\[\]{}+\-→←‹›×✕]+$/.test(String(v||''));
    const isMask=v=>/^•+$/.test(String(v||'').replace(/\s+/g,''));
    const isAllowed=v=>{const s=String(v==null?'':v).trim();return !s||isMask(s)||punctuationOnly(s)||allow.has(normalize(s));};
    const skip=node=>{const p=node.parentElement;return !p||/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName);};
    const visible=el=>{if(!el||el.type==='hidden')return false;const cs=getComputedStyle(el),box=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0&&box.width>0&&box.height>0;};
    let maskedTextNodes=0,maskedFormValues=0,hiddenInternalValuesIgnoredByScreenshotContract=0;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(skip(node))return;const raw=node.nodeValue||'';if(!raw.trim()||isAllowed(raw))return;node.nodeValue=raw.replace(/\S(?:[\s\S]*\S)?/,mask);maskedTextNodes++;});
    document.querySelectorAll('input,textarea').forEach(el=>{if(!visible(el)){if(String(el.value||'').trim())hiddenInternalValuesIgnoredByScreenshotContract++;return;}const raw=String(el.value||'');if(raw&&!isAllowed(raw)){el.value=mask;maskedFormValues++;}if(el.placeholder&&!isAllowed(el.placeholder)){el.placeholder=mask;maskedFormValues++;}});
    document.querySelectorAll('select').forEach(sel=>{Array.from(sel.options||[]).forEach(opt=>{const raw=String(opt.textContent||'');if(raw&&!isAllowed(raw)){opt.textContent=mask;maskedFormValues++;}if(String(opt.value||'').trim()&&!isAllowed(opt.value))hiddenInternalValuesIgnoredByScreenshotContract++;});});
    document.querySelectorAll('[title],[aria-label]').forEach(el=>{for(const attr of ['title','aria-label']){const raw=el.getAttribute(attr)||'';if(raw&&!isAllowed(raw)){el.setAttribute(attr,mask);maskedFormValues++;}}});
    document.querySelectorAll('img[alt]').forEach(el=>{const raw=el.getAttribute('alt')||'';if(raw&&!isAllowed(raw)){el.setAttribute('alt',mask);maskedFormValues++;}});
    const oldStyle=document.getElementById('orbit-screenshot-sanitize');if(oldStyle)oldStyle.remove();
    const style=document.createElement('style');style.id='orbit-screenshot-sanitize';style.textContent='body{caret-color:transparent!important}';document.head.appendChild(style);
    const residualText=[];const walker2=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker2.nextNode()){const node=walker2.currentNode;if(skip(node))continue;const raw=node.nodeValue||'';if(raw.trim()&&!isAllowed(raw))residualText.push(1);}
    const residualVisibleForms=[];
    document.querySelectorAll('input,textarea').forEach(el=>{if(!visible(el))return;for(const raw of [String(el.value||''),String(el.placeholder||'')])if(raw.trim()&&!isAllowed(raw))residualVisibleForms.push(1);});
    document.querySelectorAll('select').forEach(sel=>{if(!visible(sel))return;const opt=sel.options&&sel.selectedIndex>=0?sel.options[sel.selectedIndex]:null;const raw=opt?String(opt.textContent||''):'';if(raw.trim()&&!isAllowed(raw))residualVisibleForms.push(1);});
    return{ok:residualText.length===0&&residualVisibleForms.length===0,maskedTextNodes,maskedFormValues,residualDynamicText:residualText.length,residualVisibleFormValues:residualVisibleForms.length,hiddenInternalValuesIgnoredByScreenshotContract};
  },{labels:STATIC_LABELS,mask:MASK});
  report.sanitization.maskedTextNodes+=result.maskedTextNodes;
  report.sanitization.maskedFormValues+=result.maskedFormValues;
  report.sanitization.residualDynamicText+=result.residualDynamicText;
  report.sanitization.residualVisibleFormValues+=result.residualVisibleFormValues;
  report.sanitization.hiddenInternalValuesIgnoredByScreenshotContract+=result.hiddenInternalValuesIgnoredByScreenshotContract;
  if(!result.ok)throw new Error('SANITIZATION_RESIDUAL_VISIBLE_CONTENT');
  return result;
}

async function shot(page,name){
  report.stage='sanitize_'+name;
  const security=await sanitizeFailClosed(page);
  if(!security.ok)throw new Error('SANITIZATION_NOT_OK');
  const file=path.join(OUTDIR,name);
  await page.screenshot({path:file,fullPage:true});
  const stat=fs.statSync(file);
  report.screens.push({name,bytes:stat.size,security:{residualDynamicText:0,residualVisibleFormValues:0}});
}

let browser;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('LAB_INPUT_REQUIRED');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');entry.searchParams.set('sanitizedEvidence','v4');
  report.stage='navigate';await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  report.stage='blocking_gates';const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});if(!gates||!gates.ok||gates.remaining!==0)throw new Error('BLOCKING_GATE_NOT_SETTLED');
  report.stage='hydrate';await page.waitForFunction(expected=>{if(!Orbit.store)return false;for(const [name,value] of Object.entries(expected))if((Orbit.store.all(name)||[]).length!==value)return false;const projection=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(projection&&projection.ready&&projection.counts&&projection.counts.recibosEsperados===expected.recibosEsperados&&projection.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:250});
  await role(page,'Dirección');
  report.stage='samples';const samples=await page.evaluate(()=>{const policies=Orbit.store.all('polizas')||[],vehicles=Orbit.store.all('vehiculos')||[],receipts=Orbit.store.all('recibosEsperados')||[],portfolio=Orbit.store.all('carteraPrimas')||[];const pmap=new Map(policies.map(p=>[p.id,p])),rmap=new Map(receipts.map(r=>[r.id,r]));const active=p=>p&&(p.estado==='Vigente'||p.estado==='Por renovar');const rich=receipts.find(r=>active(pmap.get(r.polizaId))&&r.primaTotal!=null)||receipts[0];const vehicle=vehicles.find(v=>pmap.get(v.polizaId)&&v.clienteId)||vehicles[0];const reconciled=portfolio.find(c=>{const source=String(c.fuenteAutoridad||'').toLowerCase();return c.reciboId&&rmap.has(c.reciboId)&&source&&source!=='siga'&&c.matchQuality&&c.sourceRef&&c.requiereValidacion!==true;});return{policy:rich?{c:rich.clienteId,p:rich.polizaId,r:rich.id}:null,vehicle:vehicle?{c:vehicle.clienteId,v:vehicle.id}:null,reconciled:reconciled?{c:rmap.get(reconciled.reciboId).clienteId,r:reconciled.reciboId}:null};});
  if(!samples.policy||!samples.vehicle||!samples.reconciled)throw new Error('SANITIZED_SAMPLE_UNAVAILABLE');
  await route(page,'#/polizas');await page.waitForSelector('#host table.tbl',{timeout:12000});await shot(page,'01-polizas-global.png');
  await route(page,`#/cliente360?c=${samples.policy.c}&p=${samples.policy.p}`);await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:12000});await shot(page,'02-policy-fullpage.png');
  await route(page,`#/cliente360?c=${samples.vehicle.c}&v=${samples.vehicle.v}`);await page.waitForSelector('[data-vehicle-fullpage="1"]',{timeout:12000});await shot(page,'03-vehicle-fullpage.png');
  await route(page,`#/cliente360?c=${samples.policy.c}&t=recibos`);await page.waitForSelector('#rp-v910-policy',{timeout:12000});await shot(page,'04-receipts-list.png');
  await page.locator(`[data-rp-receipt-id="${samples.policy.r}"]`).click();await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:12000});await shot(page,'05-receipt-detail.png');
  await route(page,`#/cliente360?c=${samples.reconciled.c}&t=recibos`);await page.waitForSelector('#rp-v910-policy',{timeout:12000});await page.locator(`[data-rp-receipt-id="${samples.reconciled.r}"]`).click();await page.waitForSelector('[data-rp-receipt-detail="1"]',{timeout:12000});await shot(page,'06-portfolio-reconciled.png');
  report.stage='final';report.containsPII=false;report.containsSecrets=false;report.ok=true;report.status='SANITIZED_VISUAL_SET_READY';
}catch(error){fs.rmSync(OUTDIR,{recursive:true,force:true});fs.mkdirSync(OUTDIR,{recursive:true});report.containsPII=null;report.containsSecrets=null;report.ok=false;report.status='SANITIZED_VISUAL_SET_BLOCKED';report.error=String(error&&error.message||error).replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,220);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
