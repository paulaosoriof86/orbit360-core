#!/usr/bin/env node
/* Smoke P0 comisiones/facturas/CxC/CxP — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = {
  comisiones: [], facturas: [], planillasComisiones: [], comisionesDevengadas: [], conciliacionesComisiones: [],
  facturasComisiones: [], cxcComisiones: [], carteraPrimas: []
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

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-comisiones-p0.js', 'utf8'), { filename: 'importa-comisiones-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-comisiones-p0-wire.js', 'utf8'), { filename: 'importa-comisiones-p0-wire.js' });

Orbit.store.insert('comisiones', {
  id: 'com_imp_1', importado: true, aseguradoraNombre: 'Aseguradora Demo', polizaNumero: 'POL-001', reciboNumero: 'R-001',
  asesorNombre: 'Asesor Demo', periodo: '2026-06', pais: 'GT', moneda: 'GTQ', primaNeta: 1000, pct: 12, comEsperada: 120, comPagada: 120
});

assert.equal(memory.comisiones.length, 0, 'planilla no debe quedar en comisiones generica');
assert.equal(memory.planillasComisiones.length, 1, 'debe crear planilla comisiones');
assert.equal(memory.comisionesDevengadas.length, 1, 'debe crear comision devengada');
assert.equal(memory.conciliacionesComisiones.length, 1, 'debe crear conciliacion comision');
assert.equal(memory.comisionesDevengadas[0].estadoComision, 'comision_devengada_planilla');
assert.equal(memory.comisionesDevengadas[0].esPrimaPendiente, false);
assert.equal(memory.comisionesDevengadas[0].esCxCFinanciera, false);

Orbit.store.insert('facturas', {
  id: 'fac_imp_1', importado: true, numero: 'FV-001', fecha: '2026-07-09', concepto: 'Comision intermediacion',
  aseguradoraNombre: 'Aseguradora Demo', monto: 1120, iva: 120, moneda: 'GTQ', facturaComision: true
});

assert.equal(memory.facturas.length, 0, 'factura comision no debe quedar en facturas generica');
assert.equal(memory.facturasComisiones.length, 1, 'debe crear factura comision');
assert.equal(memory.cxcComisiones.length, 1, 'debe crear CxC comision');
assert.equal(memory.cxcComisiones[0].tipo, 'cxc_comision');
assert.equal(memory.cxcComisiones[0].estado, 'cxc_comision_pendiente');
assert.equal(memory.carteraPrimas.length, 0, 'factura comision no debe crear cartera de primas');

Orbit.store.insert('facturas', { id: 'fac_prima_1', importado: true, numero: 'FP-001', concepto: 'Prima cliente', monto: 500, moneda: 'GTQ' });
assert.equal(memory.facturas.length, 1, 'factura no comision debe seguir como factura generica');
assert.equal(memory.cxcComisiones.length, 1, 'factura prima no crea CxC comision');

console.log('OK P0 commission import rules smoke passed');
