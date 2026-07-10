#!/usr/bin/env node
/* Smoke P0 dry-run capture wire — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { polizas: [], auditoriaImportaciones: [], clientes: [] };
global.window = global;
global.document = {
  getElementById(id) {
    if (id === 'imp-drawer') return { classList: { contains: c => c === 'open' } };
    return null;
  },
  addEventListener() {},
  createElement() { return { className: '', textContent: '', remove() {} }; },
  body: { appendChild() {} }
};
global.Orbit = {
  ui: { toast() {} },
  store: {
    all(coll) { return memory[coll] || []; },
    get(coll, id) { return (memory[coll] || []).find(x => x.id === id); },
    insert(coll, rec) { if (!memory[coll]) memory[coll] = []; memory[coll].push(rec); return rec; },
    update(coll, id, patch) { const row = this.get(coll, id); if (row) Object.assign(row, patch); return row || patch; }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js', 'utf8'), { filename: 'importa-dryrun-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0-wire.js', 'utf8'), { filename: 'importa-dryrun-p0-wire.js' });

const blocked = Orbit.store.insert('polizas', {
  id: 'pol_imp_1', importado: true, numero: 'POL-001', aseguradoraNombre: 'Aseguradora Demo', vigenciaIni: '2026-01-01', vigenciaFin: '2027-01-01'
});

assert.equal(memory.polizas.length, 0, 'la importacion directa no debe escribir polizas');
assert.equal(blocked._p0DryRunCaptured, true, 'debe capturar la escritura como dry-run');
const report = Orbit.importaDryRunP0Wire.lastReport();
assert.ok(report, 'debe crear reporte dry-run');
assert.equal(report.sourceType, 'polizas');
assert.equal(report.totals.operations, 1);
assert.equal(report.hasBlockingErrors, true, 'debe bloquear por faltantes de pais/moneda/formaPago');

const controlled = Orbit.store.insert('polizas', {
  id: 'pol_ok_1', createdByImport: true, importBatchId: 'batch_ok', validationStatus: 'validado', numero: 'POL-OK', pais: 'GT', moneda: 'GTQ', formaPago: 'mensual'
});
assert.equal(memory.polizas.length, 1, 'escritura controlada validada debe pasar');
assert.equal(controlled.id, 'pol_ok_1');

console.log('OK P0 dry-run capture wire smoke passed');
