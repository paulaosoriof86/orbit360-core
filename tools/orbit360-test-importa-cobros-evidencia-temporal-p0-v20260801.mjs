#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cobros-evidencia-temporal-p0.js','utf8'),{filename:'importa-cobros-evidencia-temporal-p0.js'});
const engine=Orbit.importaCobrosEvidenciaTemporalP0;
const trace={file:'synthetic.xlsx',sheet:'Rows',country:'GT',currency:'GTQ'};
const oldSnapshot={
  sourceType:'estado_cartera_aseguradora',sourceHash:'old',cutoff:'2026-07-20',completeSnapshot:true,
  insurerName:'Insurer A',trace,
  rows:[
    {row:1,aseguradoraNombre:'Insurer A',polizaNumero:'P1',reciboNumero:'R1',saldo:100},
    {row:2,aseguradoraNombre:'Insurer A',polizaNumero:'P2',reciboNumero:'R2',saldo:200},
    {row:3,aseguradoraNombre:'Insurer A',polizaNumero:'P3',reciboNumero:'R3',saldo:300},
    {row:4,aseguradoraNombre:'Insurer A',polizaNumero:'P4',reciboNumero:'R4',saldo:400}
  ]
};
const laterSnapshot={
  sourceType:'estado_cartera_aseguradora',sourceHash:'later',cutoff:'2026-07-31',completeSnapshot:true,
  insurerName:'Insurer A',trace:{...trace,file:'later.xlsx'},
  rows:[
    {row:1,aseguradoraNombre:'Insurer A',polizaNumero:'P2',reciboNumero:'R2',saldo:200},
    {row:2,aseguradoraNombre:'Insurer A',polizaNumero:'P4',reciboNumero:'R4',saldo:400}
  ]
};
const commissions={
  sourceType:'planilla_comisiones',sourceHash:'comm',trace:{...trace,file:'commissions.xlsx'},
  rows:[
    {row:1,aseguradoraNombre:'Insurer A',polizaNumero:'P1',reciboNumero:'R1',comisionPagada:10},
    {row:2,aseguradoraNombre:'Insurer A',polizaNumero:'P4',reciboNumero:'R4',comisionPagada:40},
    {row:3,aseguradoraNombre:'Insurer A',polizaNumero:'PX',reciboNumero:'RX',comisionPagada:50}
  ]
};
const payments=[
  {insurerName:'Insurer A',policyNumber:'P1',receiptNumber:'R1',paymentDate:'2026-07-22',currency:'GTQ',amount:100,sourceKey:'payment-1'}
];
const result=engine.evaluate({sources:[oldSnapshot,laterSnapshot,commissions],payments});
const byCase=new Map(result.cases.map(item=>[item.caseIdentity,item]));
assert.equal(result.version,'20260801.1-multi-evidence-temporal');
assert.equal(byCase.get('receipt:r1').status,'CORROBORATED_COLLECTION');
assert.equal(byCase.get('receipt:r1').postCutoffPaymentValid,true);
assert.equal(byCase.get('receipt:r1').directPayment,true);
assert.equal(byCase.get('receipt:r1').commissionRecognition,true);
assert.equal(byCase.get('receipt:r2').status,'STILL_PENDING_AT_LATER_CUTOFF');
assert.equal(byCase.get('receipt:r3').status,'CLEARED_OR_ADJUSTED_REQUIRES_VALIDATION');
assert.equal(byCase.get('receipt:r3').disappeared,true);
assert.equal(byCase.get('receipt:r4').status,'STILL_PENDING_AT_LATER_CUTOFF');
assert.ok(result.holds.some(item=>item.reason==='COMMISSION_WITHOUT_STRONG_PAYMENT_OR_PORTFOLIO_MATCH'));
assert.equal(result.allowPostCutoffPayment,true);
assert.equal(result.absenceAloneCreatesCobro,false);
assert.equal(result.commissionAloneCreatesCobro,false);
assert.equal(result.bankRequestedOnlyForSpecificHold,true);
assert.equal(result.cobrosWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
assert.equal(result.productionTouched,false);
console.log(JSON.stringify({
  status:'COBROS_TEMPORAL_MULTI_EVIDENCE_ENGINE_PASS',version:result.version,
  corroborated:result.totals.corroborated,postCutoffPayments:result.totals.postCutoffPayments,
  stillPending:result.totals.stillPending,clearedRequiresValidation:result.totals.clearedRequiresValidation,
  commissionUnmatchedHold:true,absenceAloneCreatesCobro:false,commissionAloneCreatesCobro:false,
  bankRequestedOnlyForSpecificHold:true,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
},null,2));
