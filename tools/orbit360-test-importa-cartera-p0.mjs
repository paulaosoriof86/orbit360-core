#!/usr/bin/env node
/* Smoke P0 cartera/recibos/conciliacion — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { cobros: [], estadosCuentaAseguradora: [], recibosAseguradora: [], carteraPrimas: [], conciliacionesPrimas: [] };
global.window = global;
global.document = { addEventListener() {}, head: { appendChild() {} }, createElement() { return {}; } };
global.Orbit = {
  ui: { today: () => '2026-07-31' },
  tenant: { get: () => ({ id: 'tenant-demo' }) },
  store: {
    all(coll) { return memory[coll] || []; },
    get(coll, id) { return (memory[coll] || []).find(x => x.id === id); },
    insert(coll, rec) { if (!memory[coll]) memory[coll] = []; memory[coll].push(rec); return rec; },
    update(coll, id, patch) { const row = this.get(coll, id); if (row) Object.assign(row, patch); return row; }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cartera-p0.js', 'utf8'), { filename: 'importa-cartera-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cartera-p0-wire.js', 'utf8'), { filename: 'importa-cartera-p0-wire.js' });

const statement={
  id: 'cob_cc_demo_1', importado: true, sourceType:'estado_cuenta_aseguradora',
  aseguradoraNombre: 'Aseguradora Demo', polizaNumero: 'POL-001', reciboNumero: 'R-001',
  clienteId: 'cli_1', asesorId: 'ase_1', monto: 1200, moneda: 'GTQ', pais: 'GT', vence: '2026-06-15',
  fechaCorte:'2026-07-30', conciliacionPropuesta: { tipo: 'referencia_estado_cuenta', estado: 'REQUIERE_VALIDACION' }
};
Orbit.store.insert('cobros', statement);
Orbit.store.insert('cobros', {...statement,fechaCorte:'2026-07-31'});

assert.equal(memory.cobros.length, 0, 'estado de cuenta no debe quedar en cobros');
assert.equal(memory.estadosCuentaAseguradora.length, 1, 'reimportar misma identidad debe actualizar, no duplicar encabezado');
assert.equal(memory.recibosAseguradora.length, 1, 'reimportar mismo recibo aseguradora no duplica');
assert.equal(memory.carteraPrimas.length, 1, 'reimportar misma cartera no duplica');
assert.equal(memory.conciliacionesPrimas.length, 1, 'reimportar misma conciliacion no duplica');
assert.equal(memory.estadosCuentaAseguradora[0].fechaCorte,'2026-07-31','debe actualizar el dato nuevo');
assert.equal(memory.carteraPrimas[0].esCxCFinanciera, false, 'prima pendiente no es CxC financiera');
assert.equal(memory.carteraPrimas[0].estadoCartera, 'cartera_primas');
assert.equal(memory.recibosAseguradora[0].confirmadoPago, false);
assert.equal(memory.conciliacionesPrimas[0].tipo, 'prima');

const crm={sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-001',reciboNumero:'R-001',clienteId:'cli_1',monto:1200,moneda:'GTQ',fechaPago:'2026-07-10'};
const insurer={sourceType:'reporte_cobros_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-001',reciboNumero:'R-001',clienteId:'cli_1',monto:1200,moneda:'GTQ',fechaPago:'2026-07-11'};
const exact=Orbit.importaCarteraP0.reconciliationDecision(crm,insurer,{});
assert.equal(exact.conciliado,true,'match one-to-one doble fuente debe quedar conciliado');
assert.equal(exact.autoApply,true);
assert.ok(Array.isArray(exact.sourceDifferences));
assert.ok(exact.sourceDifferences.some(x=>x.field==='fechaPago'&&x.days===1),'diferencia de fecha fuente debe conservarse');
const single=Orbit.importaCarteraP0.reconciliationDecision({},insurer,{});
assert.equal(single.conciliado,false,'una sola fuente no auto-concilia');

const recurringCrm=[
  {id:'crm-3',sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-REC',moneda:'GTQ',monto:100,cuota:'3 DE 12',fechaPago:'2026-07-05',vence:'2026-07-01'},
  {id:'crm-7',sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-REC',moneda:'GTQ',monto:100,cuota:'7 DE 12',fechaPago:'2026-07-20',vence:'2026-07-15'}
];
const recurringInsurer=[
  {id:'ins-3',sourceType:'reporte_cobros_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-REC',moneda:'GTQ',monto:100.01,cuota:'3/12',fechaPago:'2026-07-06',vence:'2026-07-02'},
  {id:'ins-7',sourceType:'reporte_cobros_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-REC',moneda:'GTQ',monto:100,cuota:'7/12',fechaPago:'2026-07-21',vence:'2026-07-15'}
];
const recurring=Orbit.importaCarteraP0.reconcileCollections(recurringCrm,recurringInsurer,{amountTolerance:0.011,paymentDateToleranceDays:2,dueDateToleranceDays:1});
assert.equal(recurring.summary.conciliados,2,'cuota/fecha debe desambiguar pagos recurrentes one-to-one');
assert.equal(recurring.summary.hold,0);
assert.equal(recurring.summary.sinMatch,0);
assert.equal(new Set(recurring.results.map(x=>x.crmId)).size,2,'un pago CRM no puede reutilizarse dos veces');
assert.ok(recurring.results.some(x=>Array.isArray(x.sourceDifferences)&&x.sourceDifferences.some(d=>d.field==='monto')),'centavos distintos deben quedar como diferencia de fuente');

const balanceCrm=[
  {id:'crm-b1',sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-BAL',moneda:'GTQ',monto:250,reciboNumero:'RB-1',clienteId:'cli-b1'}
];
const balanceIns=[
  {id:'ins-b1',sourceType:'estado_cuenta_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-BAL',moneda:'GTQ',monto:250,reciboNumero:'RB-1',clienteId:'cli-b1'}
];
const balance=Orbit.importaCarteraP0.reconcileCollections(balanceCrm,balanceIns,{kind:'balance'});
assert.equal(balance.summary.conciliados,1);
assert.equal(balance.results[0].saldoConciliado,true,'cartera conciliada significa saldo confirmado');
assert.equal(balance.results[0].autoApply,false,'saldo pendiente conciliado no es pago aplicado');
const seeded=Orbit.importaCarteraP0.carteraSeed(Orbit.importaCarteraP0.normalizeInsurerReceipt(balanceIns[0]),balance.results[0]);
assert.equal(seeded.saldoConciliado,true);
assert.equal(seeded.conciliadoPago,false);
assert.equal(seeded.estadoConciliacionSaldo,'conciliado_con_aseguradora');

console.log(JSON.stringify({
  status:'PASS',
  duplicateStatementUpdated:true,
  dualSourceExactConciliated:true,
  singleSourceNotConciliated:true,
  oneToOneRecurringDisambiguation:true,
  sourceDifferencesPreserved:true,
  balanceReconciliationSeparatedFromPayment:true,
  firestoreWrites:0,
  operationalWrites:0
},null,2));
