#!/usr/bin/env node
/* Smoke P0 cartera/recibos/conciliacion — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { cobros: [], estadosCuentaAseguradora: [], recibosAseguradora: [], carteraPrimas: [], conciliacionesPrimas: [] };
global.window = global;
global.document = { addEventListener() {}, head: { appendChild() {} }, createElement() { return {}; } };
global.Orbit = {
  ui: { today: () => '2026-07-09' },
  store: {
    all(coll) { return memory[coll] || []; },
    get(coll, id) { return (memory[coll] || []).find(x => x.id === id); },
    insert(coll, rec) { if (!memory[coll]) memory[coll] = []; memory[coll].push(rec); return rec; },
    update(coll, id, patch) { const row = this.get(coll, id); if (row) Object.assign(row, patch); return row; }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cartera-p0.js', 'utf8'), { filename: 'importa-cartera-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cartera-p0-wire.js', 'utf8'), { filename: 'importa-cartera-p0-wire.js' });

Orbit.store.insert('cobros', {
  id: 'cob_cc_demo_1', importado: true, aseguradoraNombre: 'Aseguradora Demo', polizaNumero: 'POL-001', reciboNumero: 'R-001',
  clienteId: 'cli_1', asesorId: 'ase_1', monto: 1200, moneda: 'GTQ', pais: 'GT', vence: '2026-06-15',
  conciliacionPropuesta: { tipo: 'referencia_estado_cuenta', estado: 'REQUIERE_VALIDACION' }
});

assert.equal(memory.cobros.length, 0, 'estado de cuenta no debe quedar en cobros');
assert.equal(memory.estadosCuentaAseguradora.length, 1, 'debe crear encabezado estado cuenta aseguradora');
assert.equal(memory.recibosAseguradora.length, 1, 'debe crear recibo aseguradora');
assert.equal(memory.carteraPrimas.length, 1, 'debe crear cartera primas');
assert.equal(memory.conciliacionesPrimas.length, 1, 'debe crear conciliacion primas');
assert.equal(memory.carteraPrimas[0].esCxCFinanciera, false, 'prima pendiente no es CxC financiera');
assert.equal(memory.carteraPrimas[0].estadoCartera, 'cartera_primas');
assert.equal(memory.recibosAseguradora[0].confirmadoPago, false);
assert.equal(memory.conciliacionesPrimas[0].tipo, 'prima');

console.log('OK P0 cartera import rules smoke passed');
