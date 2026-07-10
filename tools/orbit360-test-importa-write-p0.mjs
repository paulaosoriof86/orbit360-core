#!/usr/bin/env node
/* Smoke P0 escritura controlada — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { polizas: [], finmovs: [], auditoriaImportaciones: [] };
global.window = global;
global.Orbit = {
  tenant: { get: () => ({ id: 'tenant_demo' }) },
  store: {
    all(coll) { return memory[coll] || []; },
    get(coll, id) { return (memory[coll] || []).find(x => x.id === id); },
    insert(coll, rec) { if (!memory[coll]) memory[coll] = []; const row = Object.assign({ id: rec.id || coll + '_' + (memory[coll].length + 1) }, rec); memory[coll].push(row); return row; },
    update(coll, id, patch) { const row = this.get(coll, id); if (row) Object.assign(row, patch); return row; },
    remove(coll, id) { memory[coll] = (memory[coll] || []).filter(x => x.id !== id); return true; }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-write-p0.js', 'utf8'), { filename: 'importa-write-p0.js' });

assert.ok(Orbit.importaWriteP0, 'Orbit.importaWriteP0 debe existir');
assert.equal(Orbit.importaWriteP0.isAllowedCollection('polizas'), true);
assert.equal(Orbit.importaWriteP0.isAllowedCollection('finmovs'), false);

const blocked = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_1', sourceType: 'estado_cuenta_bancario', status: 'dry_run_aprobado', operations: [
    { action: 'insert', collection: 'finmovs', data: { id: 'fm_1', monto: 100, validationStatus: 'validado' } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'test' });
assert.equal(blocked.ok, false, 'finmovs debe estar bloqueado');
assert.equal(memory.finmovs.length, 0);

const ok = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_2', sourceType: 'polizas', status: 'dry_run_aprobado', sourceFileName: 'polizas-demo.xlsx', operations: [
    { action: 'insert', collection: 'polizas', data: { id: 'pol_1', numero: 'POL-001', pais: 'GT', moneda: 'GTQ', validationStatus: 'validado' } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'dry-run aprobado' });
assert.equal(ok.ok, true);
assert.equal(ok.written, 1);
assert.equal(memory.polizas.length, 1);
assert.equal(memory.polizas[0].createdByImport, true);
assert.equal(memory.polizas[0].importBatchId, 'batch_2');
assert.equal(memory.auditoriaImportaciones.length, 1);
assert.equal(ok.rollback.length, 1);

const rb = Orbit.importaWriteP0.rollback(ok.rollback, { approved: true, phrase: 'CONFIRMO ROLLBACK', userId: 'paula', reason: 'test rollback' });
assert.equal(rb.ok, true);
assert.equal(memory.polizas.length, 0);

console.log('OK P0 controlled write contract smoke passed');
