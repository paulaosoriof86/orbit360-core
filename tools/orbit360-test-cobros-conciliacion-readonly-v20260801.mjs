#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const memory = {
  conciliacionesPrimas: [
    {_sourceKey:'same',id:'con_pri_same',estado:'requiere_validacion',polizaNumero:'P-1',reciboNumero:'R-1',monto:100,moneda:'GTQ',pais:'GT',sourceType:'reporte_cobros_aseguradora'},
    {_sourceKey:'premium-only',id:'con_pri_2',estado:'pendiente',polizaNumero:'P-2',reciboNumero:'R-2',monto:200,moneda:'GTQ',pais:'GT'}
  ],
  conciliaciones: [
    {_sourceKey:'same',id:'canonical-1',estado_bandeja:'EN_REVISION',decision_score:'MATCH_EXACTO',poliza:'P-1',recibo:'R-1',monto:100,moneda:'GTQ',pais:'GT',fuente:'cobros_realizados'}
  ]
};
const calls = {aplicarPago:0,validarReporte:0,conciliarFactura:0,lote:0,render:0,detalle:0};
const cobros = {
  aplicarPago(){calls.aplicarPago++;}, validarReporte(){calls.validarReporte++;}, conciliarFactura(){calls.conciliarFactura++;}, lote(){calls.lote++;},
  render(){calls.render++;}, detalle(){calls.detalle++;}
};
const emptyNode = {querySelectorAll(){return [];},getElementById(){return null;},addEventListener(){},createElement(){return {style:{},querySelectorAll(){return [];},addEventListener(){},remove(){}};},body:{appendChild(){}}};
global.window = global;
global.document = emptyNode;
global.Orbit = {
  modules:{cobros},
  store:{all(name){return memory[name] || [];},insert(){throw new Error('WRITE_NOT_ALLOWED');},update(){throw new Error('WRITE_NOT_ALLOWED');}},
  ui:{esc:value=>String(value),money:(value,currency)=>`${currency} ${Number(value).toFixed(2)}`,toast(){}},
  kit:{}
};
vm.runInThisContext(fs.readFileSync('orbit360-platform/modules/conciliaciones.js','utf8'),{filename:'conciliaciones.js'});
const owner=Orbit.cobrosConciliacionReadOnly;
assert.equal(owner.phase,'READ_ONLY_DRYRUN');
assert.equal(owner.canonicalCollection,'conciliaciones');
assert.equal(owner.domainCollection,'conciliacionesPrimas');
assert.equal(owner.autoApply,false);
const proposals=owner.proposalRows();
assert.equal(proposals.length,2,'canonical and domain rows must be unioned without duplicate proposal');
const same=proposals.find(row=>row.id==='same');
assert.ok(same,'canonical proposal must replace projected domain duplicate');
assert.equal(same.sourceCollection,'conciliaciones');
assert.ok(proposals.some(row=>row.id==='prima:premium-only'&&row.sourceCollection==='conciliacionesPrimas'));

Orbit.modules.cobros.aplicarPago('x');
Orbit.modules.cobros.validarReporte('x');
Orbit.modules.cobros.conciliarFactura('x');
Orbit.modules.cobros.lote();
assert.deepEqual(calls,{aplicarPago:0,validarReporte:0,conciliarFactura:0,lote:0,render:0,detalle:0},'legacy sensitive actions must be physically guarded');
assert.equal(Orbit.modules.cobros.__cobrosConciliacionPhase,'READ_ONLY_DRYRUN');

const obligations=[
  {id:'hist-old',clienteId:'c1',aseguradoraId:'a1',polizaId:'expired-term',moneda:'GTQ',saldoPendiente:100,vence:'2026-05-10',historicalExigible:true,estado:'Vencido'},
  {id:'active-current',clienteId:'c1',aseguradoraId:'a1',polizaId:'current-term',moneda:'GTQ',saldoPendiente:150,vence:'2026-07-15',estado:'Vencido'},
  {id:'future',clienteId:'c1',aseguradoraId:'a1',polizaId:'current-term',moneda:'GTQ',saldoPendiente:90,vence:'2026-09-01',estado:'Pendiente'},
  {id:'other-currency',clienteId:'c1',aseguradoraId:'a1',polizaId:'current-term',moneda:'USD',saldoPendiente:80,vence:'2026-06-01',estado:'Vencido'},
  {id:'other-client',clienteId:'c2',aseguradoraId:'a1',polizaId:'other',moneda:'GTQ',saldoPendiente:70,vence:'2026-04-01',estado:'Vencido'},
  {id:'already-paid',clienteId:'c1',aseguradoraId:'a1',polizaId:'old',moneda:'GTQ',saldoPendiente:40,vence:'2026-03-01',estado:'Pagado'}
];
const payment={clienteId:'c1',aseguradoraId:'a1',moneda:'GTQ',monto:180,fechaPago:'2026-07-31'};
const normal=owner.simulateFifo(payment,obligations);
assert.deepEqual(normal.allocations.map(x=>[x.obligationId,x.appliedAmount]),[['hist-old',100],['active-current',80]]);
assert.equal(normal.partial,true);
assert.equal(normal.remainingPayment,0);
assert.equal(normal.reactivatesPolicy,false);
assert.equal(normal.writes,0);
const partial=owner.simulateFifo({...payment,monto:50},obligations);
assert.deepEqual(partial.allocations.map(x=>[x.obligationId,x.appliedAmount]),[['hist-old',50]]);
assert.equal(partial.allocations[0].closingBalance,50);
const excess=owner.simulateFifo({...payment,monto:400},obligations);
assert.deepEqual(excess.allocations.map(x=>x.obligationId),['hist-old','active-current']);
assert.equal(excess.appliedAmount,250);
assert.equal(excess.remainingPayment,150);
assert.equal(excess.excess,true);
assert.equal(excess.allocations.some(x=>x.obligationId==='future'),false);

const evidence=JSON.parse(fs.readFileSync('tools/orbit360-cobros-conciliacion-source-evidence-v20260801.json','utf8'));
assert.equal(evidence.insurerReportsReviewed,2);
assert.equal(evidence.insurerPaymentRowsReviewed,9);
assert.equal(evidence.oneToOneCandidates,5);
assert.equal(evidence.holdOrNoMatch,4);
assert.equal(evidence.oneToOneCandidates+evidence.holdOrNoMatch,evidence.insurerPaymentRowsReviewed);
assert.equal(evidence.rowLevelEvidenceAvailable,false);
assert.equal(evidence.replayableWithoutCurrentSource,false);
assert.equal(evidence.cobrosMaterialized,0);
assert.equal(evidence.finmovsMaterialized,0);

console.log(JSON.stringify({
  status:'COBROS_CONCILIACION_READONLY_STATIC_PASS',
  canonicalQueue:'conciliaciones',
  premiumProjectionReadOnly:true,
  duplicateProposalPrevented:true,
  legacyCobrosActionsFrozen:true,
  fifoOldestFirst:true,
  historicalExigibleIncluded:true,
  expiredPolicyReactivated:false,
  partialPaymentSupported:true,
  excessPaymentPreserved:true,
  currenciesNotMixed:true,
  futureObligationsExcluded:true,
  sourceEvidence:{reports:2,rows:9,candidates:5,holdOrNoMatch:4,rowLevelReplay:false},
  firestoreWrites:0,
  operationalWrites:0,
  cobrosWrites:0,
  finmovsWrites:0,
  browserExecuted:false,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
},null,2));
