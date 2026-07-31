#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const memory={clientes:[],aseguradoras:[],polizas:[],vehiculos:[],recibosEsperados:[],carteraPrimas:[]};
global.window=global;
global.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};
global.document={readyState:'complete',querySelector(){return{};},createElement(){return{};},head:{appendChild(){}},documentElement:{appendChild(){}},addEventListener(){},dispatchEvent(){}};
global.Orbit={tenant:{get:()=>({id:'tenant-demo'})},ui:{today:()=> '2026-07-31'},store:{
  all(c){return memory[c]||[];},
  get(c,id){return (memory[c]||[]).find(x=>x.id===id)||null;},
  insert(c,r){memory[c]=memory[c]||[];const row={...r,id:r.id||`${c}_${memory[c].length+1}`};memory[c].push(row);return row;},
  update(c,id,p){const r=this.get(c,id);if(r)Object.assign(r,p);return r;}
}};

for(const rel of [
  'orbit360-platform/core/importa-dryrun-p0.js',
  'orbit360-platform/core/importa-polizas-p0.js',
  'orbit360-platform/core/importa-cartera-p0.js',
  'orbit360-platform/core/importa-identity-upsert-v20260731.js',
  'orbit360-platform/core/importa-identity-dryrun-wire-v20260731.js'
]) vm.runInThisContext(fs.readFileSync(rel,'utf8'),{filename:rel});

Orbit.store.insert('clientes',{tenantId:'tenant-demo',pais:'GT',moneda:'GTQ',numeroDocumento:'DOC-1',nombre:'Cliente Demo',correo:'old@example.test'});
Orbit.store.insert('clientes',{tenantId:'tenant-demo',pais:'GT',moneda:'GTQ',numeroDocumento:'DOC-1',nombre:'Cliente Demo',correo:'new@example.test',telefono:''});
assert.equal(memory.clientes.length,1,'exact identity must update, not duplicate');
assert.equal(memory.clientes[0].correo,'new@example.test');
Orbit.store.insert('clientes',{tenantId:'tenant-demo',pais:'GT',moneda:'GTQ',nombre:'Cliente Probable',ciudadMunicipio:'Mixco'});
const hold2=Orbit.store.insert('clientes',{tenantId:'tenant-demo',pais:'GT',moneda:'GTQ',nombre:'Cliente Probable',ciudadMunicipio:'Mixco'});
assert.equal(memory.clientes.length,2,'probable identity must not duplicate');
assert.equal(hold2._identityHold,true);

const P=Orbit.importaPolizasP0;
const policy=P.normalizePolicy({
  numero:'POL-1',aseguradoraNombre:'Aseguradora Demo',clienteNombre:'Cliente Demo',
  vigenciaIni:'2026-01-01',vigenciaFin:'2026-12-31',pais:'GT',moneda:'GTQ',
  primaNeta:1000,primaTotal:1176,gastosExpedicion:50,gastosFinanciamiento:0,ajusteFuente:0,iva:126,
  frecuencia:'Mensual',formaPago:'Transferencia',conductoPago:'Directo',estadoPol:'Vigente'
},{today:'2026-07-31'});
assert.equal(policy.primaTotal,1176);
assert.equal(policy.frecuencia,'Mensual');
assert.equal(policy.formaPago,'Transferencia');
assert.equal(policy.conductoPago,'Directo');
assert.equal(policy.primaFuenteCuadra,true);
const noTotal=P.normalizePolicy({...policy,primaTotal:'',estadoPol:'Vigente'},{today:'2026-07-31'});
assert.equal(noTotal.primaTotal,null,'total must not be inferred from net');
assert.ok(noTotal.motivosValidacion.includes('prima_total'));

const C=Orbit.importaCarteraP0;
const crm={sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-1',moneda:'GTQ',monto:100,reciboNumero:'R-1',clienteId:'clientes_1'};
const insurer={sourceType:'estado_cuenta_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-1',moneda:'GTQ',monto:100,reciboNumero:'R-1',clienteId:'clientes_1'};
const exact=C.reconciliationDecision(crm,insurer,{});
assert.equal(exact.conciliado,true);
assert.equal(exact.autoApply,true);
const oneSource=C.reconciliationDecision({},insurer,{});
assert.equal(oneSource.conciliado,false,'one source alone cannot invent reconciliation');

const dry=Orbit.importaDryRunP0.buildDryRun({sourceType:'clientes',operations:[{
  action:'insert',collection:'clientes',
  data:{tenantId:'tenant-demo',pais:'GT',moneda:'GTQ',numeroDocumento:'DOC-1',nombre:'Cliente Demo',correo:'third@example.test'}
}]});
assert.equal(dry.identityPlan.update,1);
assert.equal(dry.totals.insert,0);
assert.equal(dry.totals.update,1);

const bootstrap=fs.readFileSync('orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js','utf8');
const dryrunSource=fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js','utf8');
for(const required of [
  'importa-identity-upsert-v20260731.js','importa-clientes-p0-wire.js','importa-polizas-p0-wire.js',
  'importa-cartera-p0-wire.js','importa-write-p0.js','importa-identity-dryrun-wire-v20260731.js',
  'importa-identity-writer-wire-v20260731.js','importa-dryrun-p0-wire.js'
]) assert.ok(bootstrap.includes(required),`bootstrap missing ${required}`);
assert.ok(dryrunSource.includes('importa-transversal-p0-bootstrap-v20260731.js'),'runtime must activate transversal bootstrap');

console.log(JSON.stringify({
  status:'IMPORTA_TRANSVERSAL_IDEMPOTENCY_READY',
  exactUpdate:true,probableHold:true,premiumInference:false,paymentDimensionsSeparated:true,
  dualSourceReconciliation:true,singleSourceAutoReconciliation:false,dryRunMatchesWritePlan:true,
  runtimeBootstrapActive:true,firestoreWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
},null,2));
