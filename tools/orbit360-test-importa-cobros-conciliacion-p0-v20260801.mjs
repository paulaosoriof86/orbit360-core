#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cobros-conciliacion-p0.js','utf8'),{filename:'importa-cobros-conciliacion-p0-v2.js'});
const engine=Orbit.importaCobrosConciliacionP0;
const trace={file:'fuente-sintetica.xlsx',sheet:'Pagos',country:'GT',currency:'GTQ',period:'2026-07'};

// Basic transversal behavior: duplicate, support-only and update proposal.
const crmBasic={sourceType:'cobros_realizados',sourceHash:'crm-basic',trace,rows:[
  {row:1,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',canonicalReceiptId:'r1',monto:100,fechaPago:'2026-07-10'},
  {row:1,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',canonicalReceiptId:'r1',monto:100,fechaPago:'2026-07-10'}
]};
const insurerBasic={sourceType:'planilla_aseguradora',sourceHash:'ins-basic',trace:{...trace,sheet:'Aseguradora'},rows:[
  {row:10,clienteId:'c1',aseguradoraId:'a1',polizaId:'p1',reciboId:'r1',monto:100,fechaPago:'2026-07-10'}
]};
const bank={sourceType:'estado_cuenta_bancario',sourceHash:'bankhash',trace:{...trace,sheet:'Banco'},rows:[{row:5,monto:100,fecha:'2026-07-10',concepto:'abono'}]};
const docs={sourceType:'documentos_soporte',sourceHash:'dochash',trace:{...trace,sheet:'Soportes'},rows:[{row:7,documentoRef:'doc-1'}]};
const first=engine.dryRun({sources:[crmBasic,insurerBasic,bank,docs]});
assert.equal(first.proposals.length,1);
assert.equal(first.proposals[0].action,'CREATE_PROPOSAL');
assert.equal(first.proposals[0].targetMode,'LINK_EXISTING_RECEIPT');
assert.equal(first.totals.skip,1);
assert.ok(first.staging.some(item=>item.targetCollection==='movimientosBanco'));
assert.ok(first.staging.some(item=>item.targetCollection==='documentosSoportePago'));
assert.equal(first.fifo[0].result.mode,'EXACT_RECEIPT_PRECEDENCE');
const second=engine.dryRun({sources:[crmBasic,insurerBasic],existingProposals:[{proposalIdentity:first.proposals[0].proposalIdentity}]});
assert.equal(second.proposals[0].action,'UPDATE_PROPOSAL');

// Synthetic replay of the nine real-shape rows. No real names, policies or amounts.
const crmReplay={sourceType:'cobros_realizados',sourceHash:'crm-replay',trace:{...trace,file:'crm-replay.xlsx'},rows:[
  {row:101,aseguradoraNombre:'La General',polizaNumero:'POL-A',endoso:'6027/2026',cuota:'1/1',monto:100.00,fechaPago:'2026-07-10',fechaLimite:'2025-09-21',canonicalReceiptId:'rec-a'},
  {row:102,aseguradoraNombre:'La General',polizaNumero:'POL-B',endoso:'6018/2026',cuota:'1/1',monto:200.00,fechaPago:'2026-07-10',fechaLimite:'2026-04-21',historicalEligible:true,policyStatus:'No Renovada'},
  {row:103,aseguradoraNombre:'La General',polizaNumero:'POL-C',endoso:'',cuota:'1/1',monto:300.00,fechaPago:'2026-07-10',fechaLimite:'2026-07-04',canonicalReceiptId:'rec-c'},
  {row:104,aseguradoraNombre:'La General',polizaNumero:'POL-A',endoso:'6494/2026',cuota:'1/1',monto:400.00,fechaPago:'2026-07-10',fechaLimite:'2025-09-21',canonicalReceiptId:'rec-d'},
  {row:105,aseguradoraNombre:'La General',polizaNumero:'POL-B',endoso:'5729/2026',cuota:'1/1',monto:500.00,fechaPago:'2026-07-10',fechaLimite:'2026-04-21',historicalEligible:true,policyStatus:'No Renovada'},
  {row:106,aseguradoraNombre:'Mapfre',polizaNumero:'POL-D',cuota:'1/12',monto:600.00,fechaPago:'2026-07-01',fechaLimite:'2026-06-02',canonicalReceiptId:'rec-e'},
  {row:107,aseguradoraNombre:'Mapfre',polizaNumero:'POL-E',cuota:'3/12',monto:700.00,fechaPago:'2026-07-14',fechaLimite:'2026-08-01',canonicalReceiptId:'rec-f'},
  {row:108,aseguradoraNombre:'Mapfre',polizaNumero:'POL-F',cuota:'12/12',monto:800.00,fechaPago:'2025-07-11',fechaLimite:'2025-06-02',canonicalReceiptId:'rec-old'},
  {row:109,aseguradoraNombre:'Mapfre',polizaNumero:'POL-G',cuota:'7/12',monto:900.00,fechaPago:'2026-06-16',fechaLimite:'2026-07-03',canonicalReceiptId:'rec-g'}
]};
const insurerReplay={sourceType:'planilla_aseguradora',sourceHash:'ins-replay',trace:{...trace,file:'insurer-replay.xlsx',sheet:'Aseguradora'},rows:[
  {row:201,aseguradoraNombre:'La General',polizaNumero:'POL-A',endoso:'6027/2026',cuota:'1',monto:100.00,fechaPago:'2026-07-10',fechaLimite:'2026-06-10'},
  {row:202,aseguradoraNombre:'La General',polizaNumero:'POL-B',endoso:'6018/2026',cuota:'1',monto:200.00,fechaPago:'2026-07-09',fechaLimite:'2026-06-10'},
  {row:203,aseguradoraNombre:'La General',polizaNumero:'POL-C',endoso:'6978/2026',cuota:'1',monto:300.00,fechaPago:'2026-07-22',fechaLimite:'2026-07-06'},
  {row:204,aseguradoraNombre:'La General',polizaNumero:'POL-A',endoso:'6494/2026',cuota:'1',monto:400.01,fechaPago:'2026-07-10',fechaLimite:'2026-06-23'},
  {row:205,aseguradoraNombre:'La General',polizaNumero:'POL-B',endoso:'5729/2026',cuota:'1',monto:700.00,fechaPago:'2026-07-09',fechaLimite:'2026-06-02'},
  {row:206,aseguradoraNombre:'Mapfre',polizaNumero:'POL-D',cuota:'0',monto:650.00,fechaPago:'2026-07-06',fechaLimite:'2026-06-30'},
  {row:207,aseguradoraNombre:'Mapfre',polizaNumero:'POL-E',cuota:'3 DE 12',monto:700.01,fechaPago:'2026-07-15',fechaLimite:'2026-08-02'},
  {row:208,aseguradoraNombre:'Mapfre',polizaNumero:'POL-F',cuota:'12 DE 12',monto:800.03,fechaPago:'2026-07-11',fechaLimite:'2026-06-03'},
  {row:209,aseguradoraNombre:'Mapfre',polizaNumero:'POL-G',cuota:'7 DE 12',monto:900.01,fechaPago:'2026-07-02',fechaLimite:'2026-07-03'}
]};
const replay=engine.dryRun({sources:[crmReplay,insurerReplay],amountTolerance:0.05});
assert.equal(replay.proposals.length,5);
assert.equal(replay.holds.length,4);
assert.equal(replay.totals.linkExistingReceipt,4);
assert.equal(replay.totals.createHistoricalReceiptProposal,1);
assert.equal(replay.proposals.filter(p=>p.targetMode==='CREATE_HISTORICAL_RECEIPT_PROPOSAL').length,1);
assert.ok(replay.holds.some(h=>h.reason==='DIFERENCIA_MONTO'));
assert.ok(replay.holds.some(h=>h.reason==='SIN_CONTRAPARTE_CRM'));
assert.equal(replay.holds.filter(h=>h.reason==='IDENTIDAD_INSUFICIENTE').length,2);
assert.ok(replay.proposals.some(p=>p.sourceDifferences.some(d=>d.field==='amount')));
assert.ok(replay.proposals.some(p=>p.sourceDifferences.some(d=>d.field==='paymentDate'&&d.differenceDays===16)));
assert.equal(replay.proposals.some(p=>p.policyNumber==='POL-F'),false);
assert.equal(replay.proposals.every(p=>p.autoApply===false&&p.writes===0&&p.reactivatesPolicy===false),true);
assert.equal(replay.cobrosWrites,0);
assert.equal(replay.finmovsWrites,0);
assert.equal(replay.firestoreWrites,0);
assert.equal(replay.operationalWrites,0);

const contracts={};
Orbit.importaDryRunP0={SOURCE_CONTRACTS:contracts};
assert.equal(engine.patchDryRunContracts(),true);
assert.ok(contracts.cobros_realizados.forbidden.includes('cobros'));
assert.ok(contracts.planilla_aseguradora.forbidden.includes('cobros'));
assert.ok(contracts.estado_cuenta_bancario.forbidden.includes('finmovs'));
assert.ok(contracts.documentos_soporte.forbidden.includes('cobros'));

console.log(JSON.stringify({
  status:'COBROS_SOURCE_DRYRUN_ENGINE_PASS',
  version:engine.VERSION,
  create:first.totals.create,update:second.totals.update,skip:first.totals.skip,
  realShapeReplay:{rows:9,candidates:replay.proposals.length,hold:replay.holds.length,linkExistingReceipt:replay.totals.linkExistingReceipt,createHistoricalReceiptProposal:replay.totals.createHistoricalReceiptProposal},
  amountToleranceCents:true,dateDifferencesPreserved:true,wrongVigenciaBlocked:true,historicalExigibleProposed:true,
  bankSupportingOnly:true,documentsSupportingOnly:true,exactDuplicateSkippedBeforeMatching:true,
  dryRunContractsPatched:true,cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
},null,2));
