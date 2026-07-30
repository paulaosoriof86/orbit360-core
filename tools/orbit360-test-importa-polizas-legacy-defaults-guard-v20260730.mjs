#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const memory={polizas:[],cobros:[],recibosEsperados:[]};
global.window=global;
global.document={addEventListener(){},head:{appendChild(){}},createElement(){return{};}};
global.Orbit={
  ui:{today:()=> '2026-07-30'},
  store:{
    all(c){return memory[c]||[];},
    get(c,id){return (memory[c]||[]).find(x=>x.id===id)||null;},
    where(c,fn){return (memory[c]||[]).filter(fn);},
    insert(c,r){memory[c]=memory[c]||[];memory[c].push(r);return r;},
    update(c,id,p){const r=this.get(c,id);if(r)Object.assign(r,p);return r;}
  },
  primas:{
    cuotasDe(freq){return String(freq||'').toLowerCase()==='mensual'?12:1;},
    desglose(neta){return{neta:+neta||0,total:+neta||0,iva:0,gastosEmision:0,gastosFinan:0,otros:0};},
    recibos(d,opts){const comA=Number(opts.comAseguradoraPct||0);const comV=Number(opts.comVendedorPct||0);const a=d.neta*comA/100;return[{n:1,total:d.total,neta:d.neta,iva:0,gastosEmision:0,gastosFinan:0,otros:0,comAseguradora:a,comVendedor:a*comV/100,vence:opts.vigenciaInicio,fechaLimite:opts.vigenciaInicio}];}
  }
};

for(const rel of ['orbit360-platform/core/importa-polizas-p0.js','orbit360-platform/core/importa-polizas-p0-wire.js']){
  vm.runInThisContext(fs.readFileSync(rel,'utf8'),{filename:rel});
}

const common={numero:'POL-GUARD-001',aseguradoraNombre:'Aseguradora Demo',clienteNombre:'Cliente Demo',vigenciaIni:'2026-01-01',vigenciaFin:'2026-12-31',pais:'GT',moneda:'GTQ',primaNeta:1000,estadoPol:'Renovada',importado:true};

const legacy={...common,id:'legacy',frecuencia:'Contado',forma:'Contado',formaPago:'',comAseguradoraPct:12,comVendedorPct:50};
Orbit.store.insert('polizas',legacy);
assert.equal(legacy._legacyContadoDefaultRemoved,true);
assert.equal(legacy.frecuencia,'');
assert.equal(legacy.formaPago,'');
assert.equal(legacy.requiereValidacion,true);
assert.ok(Array.isArray(legacy.motivosValidacion)&&legacy.motivosValidacion.includes('forma_pago'));
assert.equal(Object.prototype.hasOwnProperty.call(legacy,'comAseguradoraPct'),false);
assert.equal(Object.prototype.hasOwnProperty.call(legacy,'comVendedorPct'),false);
assert.equal(legacy.comisionFuenteValidada,false);
assert.equal(legacy.comisionEstado,'pendiente_fuente_separada');
assert.equal(memory.recibosEsperados.length,0);

const trusted={...common,id:'trusted',numero:'POL-GUARD-002',frecuencia:'Contado',forma:'Contado',formaPago:'Transferencia',comAseguradoraPct:15,comVendedorPct:40,comisionFuenteValidada:true,comisionFuente:'planilla_validada'};
Orbit.store.insert('polizas',trusted);
assert.equal(trusted._legacyContadoDefaultRemoved,undefined);
assert.equal(trusted.requiereValidacion,false);
assert.equal(trusted.comAseguradoraPct,15);
assert.equal(trusted.comVendedorPct,40);
assert.equal(trusted.comisionFuenteValidada,true);
assert.equal(memory.recibosEsperados.length,1);
assert.equal(memory.recibosEsperados[0].estado,'esperado');
assert.equal(memory.recibosEsperados[0].confirmadoPago,false);

console.log(JSON.stringify({status:'PASS',legacyDefaultBlocked:true,legacyCommissionDefaultsRemoved:true,legacyReceiptGenerated:false,trustedSourcePreserved:true,trustedReceiptGenerated:true,firestoreWrites:0,operationalWrites:0},null,2));
