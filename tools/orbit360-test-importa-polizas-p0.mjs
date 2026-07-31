#!/usr/bin/env node
/* Smoke P0 reglas importacion polizas — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const file='orbit360-platform/core/importa-polizas-p0.js';
global.window=global;global.Orbit={ui:{today:()=> '2026-07-30'}};
vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const P0=global.Orbit.importaPolizasP0;assert.ok(P0);
const base={
  numero:'POL-001',aseguradoraNombre:'Aseguradora Demo',clienteNombre:'Cliente Demo',
  vigenciaIni:'2026-01-01',vigenciaFin:'2026-12-31',pais:'GT',moneda:'GTQ',
  primaNeta:'1000',primaTotal:'1176',gastos:'50',iva:'126',
  frecuencia:'Mensual',formaPago:'Transferencia',conductoPago:'Directo'
};
const renovada=P0.normalizePolicy({...base,estadoPol:'Renovada'},{today:'2026-07-30'});
assert.equal(renovada.estadoOperativoOrbit,'historica_renovada');assert.equal(renovada.estadoCartera,'no_exigible');assert.equal(renovada.requiereValidacion,false);assert.equal(P0.shouldGenerateExpectedReceipts(renovada),false);
assert.ok(renovada._dedupKey.includes('gt|aseguradora demo|pol 001|cliente demo'));assert.ok(renovada._sourceVersionKey.endsWith('|2026-01-01|2026-12-31'));
const nextTerm=P0.normalizePolicy({...base,vigenciaIni:'2027-01-01',vigenciaFin:'2027-12-31',estadoPol:'Renovada'},{today:'2027-07-30'});
assert.equal(nextTerm._dedupKey,renovada._dedupKey);assert.notEqual(nextTerm._sourceVersionKey,renovada._sourceVersionKey);
const otherClient=P0.normalizePolicy({...base,clienteNombre:'Otro Cliente',estadoPol:'Renovada'},{today:'2026-07-30'});assert.notEqual(otherClient._dedupKey,renovada._dedupKey);
const porRenovar=P0.normalizePolicy({...base,estadoPol:'Por renovar'},{today:'2026-07-30'});assert.equal(porRenovar.estadoOperativoOrbit,'por_renovar_operativa');assert.equal(porRenovar.estadoCartera,'genera_recibos_esperados');assert.equal(porRenovar.requiereValidacion,false);assert.ok(P0.shouldGenerateExpectedReceipts(porRenovar));
const vigente=P0.normalizePolicy({...base,estadoPol:'Vigente'},{today:'2026-07-30'});assert.equal(vigente.estadoOperativoOrbit,'vigente_operativa');assert.ok(P0.shouldGenerateExpectedReceipts(vigente));
const vencida=P0.normalizePolicy({...base,vigenciaIni:'2025-01-01',vigenciaFin:'2025-12-31',estadoPol:'Vencida'},{today:'2026-07-30'});assert.equal(vencida.estadoOperativoOrbit,'historica_vencida');assert.equal(P0.shouldGenerateExpectedReceipts(vencida),false);
const cancelada=P0.normalizePolicy({...base,estadoPol:'Cancelada'},{today:'2026-07-30'});assert.equal(cancelada.estadoOperativoOrbit,'cancelada_terminal');assert.equal(P0.shouldGenerateExpectedReceipts(cancelada),false);
const sinForma=P0.normalizePolicy({...base,formaPago:'',frecuencia:'',estadoPol:'Vigente'},{today:'2026-07-30'});
assert.ok(sinForma.requiereValidacion&&sinForma.motivosValidacion.includes('forma_pago')&&sinForma.motivosValidacion.includes('frecuencia_pago'));
const sinTerm=P0.normalizePolicy({...base,vigenciaIni:'',vigenciaFin:'',estadoPol:'Vigente'},{today:'2026-07-30'});assert.ok(sinTerm.requiereValidacion&&sinTerm.motivosValidacion.includes('vigencia'));
const sinTotal=P0.normalizePolicy({...base,primaTotal:'',estadoPol:'Vigente'},{today:'2026-07-30'});assert.equal(sinTotal.primaTotal,null);assert.ok(sinTotal.motivosValidacion.includes('prima_total'));assert.equal(P0.shouldGenerateExpectedReceipts(sinTotal),false);
const recibo=P0.expectedReceiptSeed(porRenovar,{n:1,total:1176,neta:1000,iva:126,vence:'2026-08-01'},0);assert.equal(recibo.estado,'esperado');assert.equal(recibo.confirmadoPago,false);assert.equal(recibo.carteraOperativa,false);assert.equal(recibo.formaPago,'Transferencia');assert.equal(recibo.frecuencia,'Mensual');
console.log(JSON.stringify({status:'PASS',canonicalIdentityStableAcrossTerms:true,termVersionDistinct:true,crossClientIdentityDistinct:true,renovadaHistorical:true,porRenovarActive:true,premiumInference:false,paymentDimensionsSeparated:true},null,2));
