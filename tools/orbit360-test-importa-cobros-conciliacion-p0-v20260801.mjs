#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={
  cobrosConciliacionReadOnly:{
    simulateFifo(payment,obligations){return {paymentAmount:payment.monto,oldest:obligations[0]&&obligations[0].id||'',writes:0,reactivatesPolicy:false};}
  }
};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cobros-conciliacion-p0.js','utf8'),{filename:'importa-cobros-conciliacion-p0.js'});
const engine=Orbit.importaCobrosConciliacionP0;
const trace={file:'fuente-sintetica.xlsx',sheet:'Pagos',country:'GT',currency:'GTQ',period:'2026-07'};
const crm={sourceType:'cobros_realizados',sourceHash:'crmhash',trace,rows:[
  {row:1,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',monto:100,fechaPago:'2026-07-10'},
  {row:1,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',monto:100,fechaPago:'2026-07-10'},
  {row:2,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r2',monto:70,fechaPago:'2026-07-11'}
]};
const insurer={sourceType:'planilla_aseguradora',sourceHash:'inshash',trace:{...trace,sheet:'Aseguradora'},rows:[
  {row:10,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',monto:100,fechaPago:'2026-07-10'},
  {row:11,clienteId:'c2',aseguradoraId:'a2',polizaId:'p2',reciboId:'r9',monto:50,fechaPago:'2026-07-12'}
]};
const bank={sourceType:'estado_cuenta_bancario',sourceHash:'bankhash',trace:{...trace,sheet:'Banco'},rows:[{row:5,monto:100,fecha:'2026-07-10',concepto:'abono'}]};
const docs={sourceType:'documentos_soporte',sourceHash:'dochash',trace:{...trace,sheet:'Soportes'},rows:[{row:7,documentoRef:'doc-1'}]};
const invalid={sourceType:'planilla_aseguradora',sourceHash:'bad',trace:{file:'bad.xlsx',sheet:'S'},rows:[{row:1,monto:20}]};

const first=engine.dryRun({sources:[crm,insurer,bank,docs,invalid],obligations:[{id:'oldest'}],asOf:'2026-07-31'});
assert.equal(first.proposals.length,1);
assert.equal(first.proposals[0].action,'CREATE_PROPOSAL');
assert.equal(first.proposals[0].autoApply,false);
assert.equal(first.totals.skip,1);
assert.ok(first.holds.some(item=>item.reason==='SIN_CONTRAPARTE_CRM'));
assert.ok(first.holds.some(item=>item.reason==='REQUIERE_VALIDACION'));
assert.ok(first.staging.some(item=>item.targetCollection==='movimientosBanco'));
assert.ok(first.staging.some(item=>item.targetCollection==='documentosSoportePago'));
assert.equal(first.proposals.some(item=>item.crmSourceKey.includes('estado_cuenta_bancario')),false);
assert.equal(first.fifo.length,1);
assert.equal(first.fifo[0].result.oldest,'oldest');

const second=engine.dryRun({sources:[crm,insurer],existingProposals:[{proposalIdentity:first.proposals[0].proposalIdentity}],obligations:[],asOf:'2026-07-31'});
assert.equal(second.proposals[0].action,'UPDATE_PROPOSAL');
for(const result of [first,second]){
  assert.equal(result.cobrosWrites,0);assert.equal(result.finmovsWrites,0);
  assert.equal(result.firestoreWrites,0);assert.equal(result.operationalWrites,0);assert.equal(result.production,false);
}
const contracts={};
Orbit.importaDryRunP0={SOURCE_CONTRACTS:contracts};
assert.equal(engine.patchDryRunContracts(),true);
assert.deepEqual(contracts.cobros_realizados.allowed,['pagosReportadosFuente','conciliaciones','gestiones']);
assert.ok(contracts.cobros_realizados.forbidden.includes('cobros'));
assert.ok(contracts.planilla_aseguradora.forbidden.includes('cobros'));
assert.ok(contracts.estado_cuenta_bancario.forbidden.includes('finmovs'));
assert.ok(contracts.documentos_soporte.forbidden.includes('cobros'));

console.log(JSON.stringify({
  status:'COBROS_SOURCE_DRYRUN_ENGINE_PASS',
  create:first.totals.create,update:second.totals.update,skip:first.totals.skip,hold:first.totals.hold,
  bankSupportingOnly:true,documentsSupportingOnly:true,exactDuplicateSkippedBeforeMatching:true,
  dryRunContractsPatched:true,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
},null,2));
