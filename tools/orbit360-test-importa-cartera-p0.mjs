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

const crm={sourceType:'cobros_realizados',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-001',reciboNumero:'R-001',clienteId:'cli_1',monto:1200,moneda:'GTQ'};
const insurer={sourceType:'estado_cuenta_aseguradora',aseguradoraNombre:'Aseguradora Demo',polizaNumero:'POL-001',reciboNumero:'R-001',clienteId:'cli_1',monto:1200,moneda:'GTQ'};
const exact=Orbit.importaCarteraP0.reconciliationDecision(crm,insurer,{});
assert.equal(exact.conciliado,true,'match exacto doble fuente debe quedar conciliado');
assert.equal(exact.autoApply,true);
const single=Orbit.importaCarteraP0.reconciliationDecision({},insurer,{});
assert.equal(single.conciliado,false,'una sola fuente no auto-concilia');

console.log(JSON.stringify({status:'PASS',duplicateStatementUpdated:true,dualSourceExactConciliated:true,singleSourceNotConciliated:true,firestoreWrites:0,operationalWrites:0},null,2));
