#!/usr/bin/env node
/* Smoke P0 banco/comisiones/CxC/CxP — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = {
  conciliacionBanco: [], movimientosBanco: [], conciliacionBancaria: [],
  cxcComisiones: [{ id: 'cxc_1', numeroFactura: 'FV-001', aseguradoraNombre: 'Aseguradora Demo', monto: 1120, moneda: 'GTQ', estado: 'cxc_comision_pendiente' }],
  cxpAsesores: [{ id: 'cxp_1', asesorId: 'ase_1', asesorNombre: 'Asesor Demo', montoAsesor: 500, moneda: 'GTQ', estado: 'pendiente_pago_asesor', pagada: false }],
  finmovs: []
};
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

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-banco-comisiones-p0.js', 'utf8'), { filename: 'importa-banco-comisiones-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-banco-comisiones-p0-wire.js', 'utf8'), { filename: 'importa-banco-comisiones-p0-wire.js' });

Orbit.store.insert('conciliacionBanco', {
  id: 'bank_1', importado: true, fecha: '2026-07-15', concepto: 'Pago FV-001 Aseguradora Demo', monto: 1120, moneda: 'GTQ', pais: 'GT', tipo: 'abono'
});

assert.equal(memory.conciliacionBanco.length, 0, 'estado banco no debe quedar en conciliacionBanco generica');
assert.equal(memory.movimientosBanco.length, 1, 'debe crear movimiento bancario pendiente');
assert.equal(memory.conciliacionBancaria.length, 1, 'debe crear conciliacion bancaria');
assert.equal(memory.finmovs.length, 0, 'no debe crear finmov definitivo');
assert.equal(memory.conciliacionBancaria[0].matchTipo, 'cxc_comision');
assert.equal(memory.conciliacionBancaria[0].requiereConfirmacionHumana, true);
assert.equal(memory.conciliacionBancaria[0].creaFinmov, false);
assert.equal(memory.cxcComisiones[0].estado, 'recaudo_probable_pendiente_confirmacion');
assert.equal(memory.cxcComisiones[0].conciliacionBancariaPropuesta.estado, 'pendiente_confirmacion');

Orbit.store.insert('conciliacionBanco', {
  id: 'bank_2', importado: true, fecha: '2026-07-16', concepto: 'Transferencia Asesor Demo', monto: -500, moneda: 'GTQ', pais: 'GT', tipo: 'cargo'
});

assert.equal(memory.movimientosBanco.length, 2);
assert.equal(memory.conciliacionBancaria.length, 2);
assert.equal(memory.conciliacionBancaria[1].matchTipo, 'cxp_asesor');
assert.equal(memory.cxpAsesores[0].estado, 'pago_probable_pendiente_confirmacion');
assert.equal(memory.cxpAsesores[0].pagada, false);
assert.equal(memory.finmovs.length, 0, 'pago asesor tampoco crea finmov definitivo sin confirmacion');

console.log('OK P0 bank commission reconciliation smoke passed');
