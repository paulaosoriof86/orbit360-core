#!/usr/bin/env node
/* Orbit 360 · Smoke post carga A&S LAB v1.104
   Valida lectura Firestore LAB por tenant después de una carga real.
   Solo lectura: no escribe, no borra, no despliega. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const args = process.argv.slice(2);
const val = (n,d='') => { const i=args.indexOf(n); return i>=0 ? (args[i+1]||d) : d; };
const tenant = val('--tenant','alianzas-soluciones');
const projectId = val('--project', process.env.FIREBASE_PROJECT_ID || '');
const reportDir = path.join(root,'_orbit360_reports');
const stamp = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
const txtReport = path.join(reportDir,`SMOKE-POST-CARGA-AYS-LAB-V104-${stamp}.txt`);
const jsonReport = path.join(reportDir,`SMOKE-POST-CARGA-AYS-LAB-V104-${stamp}.json`);
const errors = [], warnings = [], info = [];
const collections = ['clientes','aseguradoras','polizas','cobros','comisiones','facturas','finmovs','reclamos','vehiculos'];
const counts = {};
const samples = {};
function norm(s){ return String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function stPol(v){ const n=norm(v); if(['vigente','activa','activo'].includes(n))return'vigente'; if(['por renovar','renovacion','a renovar'].includes(n))return'por renovar'; if(['cancelada','cancelado','anulada','anulado'].includes(n))return'cancelada'; if(['vencida','vencido'].includes(n))return'vencida'; return n; }
function pending(v){ return ['pendiente','por cobrar','pendiente pago','pendiente de pago','vencido'].includes(norm(v)); }
function moneyCountry(row){ const p=norm(row.pais); const m=String(row.moneda||'').trim().toUpperCase(); if((p==='gt'||p==='guatemala')&&m&&m!=='GTQ'&&m!=='USD')return false; if((p==='co'||p==='colombia')&&m&&m!=='COP'&&m!=='USD')return false; return true; }
if(tenant!=='alianzas-soluciones') errors.push(`Tenant no autorizado: ${tenant}`);
if(!projectId) errors.push('Falta FIREBASE_PROJECT_ID o --project.');
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS) errors.push('Falta GOOGLE_APPLICATION_CREDENTIALS local.');
if(process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) errors.push('GOOGLE_APPLICATION_CREDENTIALS no apunta a archivo existente.');
let db = null;
if(!errors.length){
  let admin;
  try { admin = require('firebase-admin'); } catch { errors.push('No esta disponible firebase-admin localmente.'); }
  if(admin){ if(!admin.apps.length) admin.initializeApp({projectId}); db = admin.firestore(); }
}
async function readCollection(c){
  const snap = await db.collection('tenantId').doc(tenant).collection(c).limit(250).get();
  counts[c] = snap.size;
  samples[c] = [];
  snap.forEach(doc => samples[c].push({id:doc.id, ...doc.data()}));
}
if(db){
  for(const c of collections) await readCollection(c);
  const clientIds = new Set((samples.clientes||[]).map(x=>String(x.id||x.__id||x.id||'').trim()).filter(Boolean));
  const insurerIds = new Set((samples.aseguradoras||[]).map(x=>String(x.id||'').trim()).filter(Boolean));
  const policyMap = new Map((samples.polizas||[]).map(x=>[String(x.id||'').trim(),x]).filter(([id])=>id));
  if((counts.clientes||0)===0) warnings.push('No se encontraron clientes en LAB.');
  if((counts.polizas||0)===0) warnings.push('No se encontraron polizas en LAB.');
  for(const p of samples.polizas||[]){
    if(p.clienteId && clientIds.size && !clientIds.has(String(p.clienteId).trim())) errors.push(`poliza ${p.id||'(sin id)'} referencia cliente inexistente ${p.clienteId}`);
    if(p.aseguradoraId && insurerIds.size && !insurerIds.has(String(p.aseguradoraId).trim())) errors.push(`poliza ${p.id||'(sin id)'} referencia aseguradora inexistente ${p.aseguradoraId}`);
    if(!moneyCountry(p)) warnings.push(`poliza ${p.id||'(sin id)'} moneda/pais no estandar`);
  }
  let cartera = 0;
  for(const c of samples.cobros||[]){
    const pol = policyMap.get(String(c.polizaId||'').trim());
    if(c.polizaId && policyMap.size && !pol) errors.push(`cobro ${c.id||'(sin id)'} referencia poliza inexistente ${c.polizaId}`);
    if(c.clienteId && clientIds.size && !clientIds.has(String(c.clienteId).trim())) errors.push(`cobro ${c.id||'(sin id)'} referencia cliente inexistente ${c.clienteId}`);
    if(pending(c.estado)){
      cartera++;
      if(pol && !['vigente','por renovar'].includes(stPol(pol.estado))) errors.push(`cobro pendiente ${c.id||'(sin id)'} ligado a poliza no cartera ${c.polizaId}`);
    }
    if(!moneyCountry(c)) warnings.push(`cobro ${c.id||'(sin id)'} moneda/pais no estandar`);
  }
  info.push(`cartera_muestra=${cartera}`);
}
const result = {version:'v1.104',createdAt:new Date().toISOString(),tenant,projectId:projectId?'<configurado>':'',counts,info,errors,warnings,result:errors.length?'FAIL':'OK'};
fs.mkdirSync(reportDir,{recursive:true}); fs.writeFileSync(jsonReport,JSON.stringify(result,null,2),'utf8');
const lines=['============================================================','ORBIT 360 - SMOKE POST CARGA A&S LAB v1.104',`Fecha: ${result.createdAt}`,`Tenant: ${tenant}`,'Modo: SOLO_LECTURA','Restricciones: no escritura, no deploy, no produccion, no datos reales en repo.','============================================================','',...Object.entries(counts).map(([k,v])=>`INFO: ${k}: ${v}`),...info.map(x=>`INFO: ${x}`),'',`Errores: ${errors.length}`,...errors.map(e=>`ERROR: ${e}`),'',`Warnings: ${warnings.length}`,...warnings.map(w=>`WARN: ${w}`),'',`Reporte JSON: ${jsonReport}`,errors.length?'RESULTADO: FAIL':'RESULTADO: OK'];
fs.writeFileSync(txtReport,lines.join('\n'),'utf8'); console.log(lines.join('\n')); process.exit(errors.length?1:0);
