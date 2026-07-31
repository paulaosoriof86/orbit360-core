#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';

const target = 'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js';
const code = fs.readFileSync(target, 'utf8');
const listeners = {};
function element(){ return { dataset:{}, style:{}, children:[], className:'', textContent:'', innerHTML:'', setAttribute(){}, getAttribute(){return'';}, appendChild(){}, insertBefore(){}, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];}, remove(){}, parentElement:null }; }
const document = { head:{appendChild(){}}, body:element(), getElementById(){return null;}, createElement(){return element();}, addEventListener(n,f){listeners[n]=f;}, querySelectorAll(){return [];} };
const data = {
  clientes:[{id:'c1',nombre:'Cliente Uno',moneda:'GTQ',segmento:'Nuevo'}],
  polizas:[{id:'p1',clienteId:'c1',numero:'ABC',estado:'Vigente',primaNeta:100,primaTotal:120,formaPago:'Mensual',pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'Auto',vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01'}],
  vehiculos:[{id:'v1',clienteId:'c1',polizaId:'p1',marca:'Kia',linea:'Forte',anioModelo:'2024',placaNormalizada:'P123ABC',chasisFuente:'VIN1',motorFuente:'M1'}],
  cobros:[], comisiones:[], recibosEsperados:[], aseguradoras:[], asesores:[]
};
const store = {
  all:n=>data[n]||[],
  get:(n,id)=>(data[n]||[]).find(x=>x.id===id)||null,
  insert(){ throw new Error('WRITE_NOT_ALLOWED'); },
  update(){ throw new Error('WRITE_NOT_ALLOWED'); },
  remove(){ throw new Error('WRITE_NOT_ALLOWED'); }
};
const host = element();
const ctx = { console, document, location:{hash:''}, setTimeout:f=>{f();return 1;}, clearTimeout(){}, encodeURIComponent, Map, Number, String, Array, Object, JSON, Math, Date, CustomEvent:function(){}, HashChangeEvent:function(){} };
ctx.window = ctx;
ctx.window.addEventListener = (n,f)=>{listeners[n]=f;};
let clientProjectionCalls = 0;
ctx.Orbit = {
  store,
  ui:{esc:s=>String(s),money:(n,c)=>`${c} ${n}`,fmtDate:s=>String(s),estadoBadge:s=>`<b>${s}</b>`},
  clientProjection:{project(row){clientProjectionCalls++;return Object.assign({},row,{etiquetas:Array.isArray(row&&row.etiquetas)?row.etiquetas:[]});}},
  q:{clienteResumen(){throw new Error('LEGACY_SUMMARY_MUST_BE_REPLACED');}},
  route:{params:{}},
  modules:{cliente360:{render(h){h.innerHTML='legacy';},verPoliza(){throw new Error('LEGACY_POLICY_MODAL');},verVehiculo(){throw new Error('LEGACY_VEHICLE_MODAL');}},cobros:{}}
};
vm.runInNewContext(code, ctx, {filename:target});
const owner = ctx.Orbit.policyVehicleReadModelV1199c;
if (!owner || owner.version !== '20260731.1') throw new Error('OWNER_VERSION');
const pv = owner.policyVisual(data.polizas[0]);
if (pv.prima !== 120 || pv.forma !== 'Mensual') throw new Error('POLICY_CANONICAL_ALIASES');
const vv = owner.vehicleVisual(data.vehiculos[0]);
if (vv.anio !== '2024' || vv.placa !== 'P123ABC' || vv.chasis !== 'VIN1' || vv.motor !== 'M1') throw new Error('VEHICLE_CANONICAL_ALIASES');
const summary = ctx.Orbit.q.clienteResumen('c1');
if (summary.nPolizas !== 1 || summary.nVigentes !== 1 || summary.primaAnual !== 120) throw new Error('CLIENT_SUMMARY_INDEXED');
if (clientProjectionCalls < 1 || !summary.cli || !Array.isArray(summary.cli.etiquetas)) throw new Error('CLIENT_SUMMARY_MUST_PROJECT_SHAPE_SYNCHRONOUSLY');
ctx.Orbit.modules.cliente360.verPoliza('p1');
if (!ctx.location.hash.includes('&p=p1')) throw new Error('POLICY_NOT_FULLPAGE_ROUTE');
ctx.Orbit.modules.cliente360.verVehiculo('v1');
if (!ctx.location.hash.includes('&v=v1')) throw new Error('VEHICLE_NOT_FULLPAGE_ROUTE');
ctx.Orbit.route.params = {c:'c1',p:'p1'};
ctx.Orbit.modules.cliente360.render(host);
if (!host.innerHTML.includes('data-policy-fullpage="1"')) throw new Error('POLICY_FULLPAGE_NOT_RENDERED');
if (/\bundefined\b|\bNaN\b/.test(host.innerHTML)) throw new Error('TECHNICAL_EMPTY_VALUE_VISIBLE');
if (!owner.indexedClientSummary || owner.writesStore || owner.writesBackend) throw new Error('READMODEL_CONTRACT');
console.log(JSON.stringify({ok:true,classification:'FUNCTIONAL_DEFECT_FIXED_STATIC',policyAliases:true,vehicleAliases:true,indexedSummary:true,synchronousClientShape:true,fullPagePolicy:true,fullPageVehicle:true,noUndefinedNaN:true,writes:0},null,2));
