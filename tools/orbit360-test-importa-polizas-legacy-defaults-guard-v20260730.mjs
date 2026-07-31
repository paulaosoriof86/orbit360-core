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
  }
};

for(const rel of ['orbit360-platform/core/importa-polizas-p0.js','orbit360-platform/core/importa-polizas-p0-wire.js']){
  vm.runInThisContext(fs.readFileSync(rel,'utf8'),{filename:rel});
}

const common={
  numero:'POL-GUARD-001',aseguradoraNombre:'Aseguradora Demo',clienteNombre:'Cliente Demo',
  vigenciaIni:'2026-01-01',vigenciaFin:'2026-12-31',pais:'GT',moneda:'GTQ',
  primaNeta:1000,primaTotal:1000,importado:true
};

const legacy={...common,id:'legacy',estadoPol:'Renovada',frecuencia:'Contado',forma:'Contado',formaPago:'',comAseguradoraPct:12,comVendedorPct:50};
Orbit.store.insert('polizas',legacy);
assert.equal(legacy._legacyContadoDefaultRemoved,true);
assert.equal(legacy.frecuencia,'');
assert.equal(legacy.formaPago,'');
assert.equal(legacy.requiereValidacion,true);
assert.ok(Array.isArray(legacy.motivosValidacion)&&legacy.motivosValidacion.includes('forma_pago')&&legacy.motivosValidacion.includes('frecuencia_pago'));
assert.equal(Object.prototype.hasOwnProperty.call(legacy,'comAseguradoraPct'),false);
assert.equal(Object.prototype.hasOwnProperty.call(legacy,'comVendedorPct'),false);
assert.equal(legacy.comisionFuenteValidada,false);
assert.equal(legacy.comisionEstado,'pendiente_fuente_separada');
assert.equal(legacy.estadoOperativoOrbit,'historica_renovada');
assert.equal(legacy.estadoCartera,'no_exigible');

const collapsed={...common,id:'collapsed',numero:'POL-GUARD-002',estado:'Por renovar',frecuencia:'Mensual',formaPago:'Domiciliado'};
Orbit.store.insert('polizas',collapsed);
assert.equal(collapsed._legacyRenewalStatusCollapsed,true);
assert.equal(collapsed.requiereValidacion,true);
assert.ok(collapsed.motivosValidacion.includes('estado'));
assert.equal(collapsed.estadoOperativoOrbit,'por_renovar_operativa');

const trusted={...common,id:'trusted',numero:'POL-GUARD-003',estadoFuenteOriginal:'Vigente',frecuencia:'Mensual',formaPago:'Transferencia',conductoPago:'Directo',comAseguradoraPct:15,comVendedorPct:40,comisionFuenteValidada:true,comisionFuente:'planilla_validada'};
Orbit.store.insert('polizas',trusted);
assert.equal(trusted._legacyContadoDefaultRemoved,undefined);
assert.equal(trusted._legacyRenewalStatusCollapsed,undefined);
assert.equal(trusted.requiereValidacion,false);
assert.equal(trusted.estadoOperativoOrbit,'vigente_operativa');
assert.equal(trusted.comAseguradoraPct,15);
assert.equal(trusted.comVendedorPct,40);
assert.equal(trusted.comisionFuenteValidada,true);
assert.equal(trusted.formaPago,'Transferencia');
assert.equal(trusted.frecuencia,'Mensual');

assert.equal(memory.recibosEsperados.length,0);
assert.equal(Orbit.importaPolizasP0Wire.directReceiptGeneration,false);
assert.equal(Orbit.importaPolizasP0Wire.premiumInferenceAllowed,false);
assert.equal(Orbit.importaPolizasP0Wire.paymentDimensionsSeparated,true);

console.log(JSON.stringify({status:'PASS',legacyDefaultBlocked:true,legacyCommissionDefaultsRemoved:true,renovadaHistorical:true,collapsedRenewalBlocked:true,trustedSourcePreserved:true,directReceiptGeneration:false,premiumInferenceAllowed:false,paymentDimensionsSeparated:true,firestoreWrites:0,operationalWrites:0},null,2));
