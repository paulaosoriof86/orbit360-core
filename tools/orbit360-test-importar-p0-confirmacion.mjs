#!/usr/bin/env node
/* Smoke P0 confirmacion reforzada — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

global.window = global;
global.Orbit = {
  ui: { esc: s => String(s == null ? '' : s) },
  importaWriteP0: {
    isAllowedCollection(coll) { return coll === 'clientes' || coll === 'polizas'; },
    writeBatch(batch, confirmation) {
      return confirmation.phrase === 'CONFIRMO ESCRITURA CONTROLADA' && confirmation.approved
        ? { ok: true, written: batch.operations.length, rollback: [] }
        : { ok: false, written: 0, errors: ['confirmacion_invalida'] };
    }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/modules/importar-p0-confirmacion.js', 'utf8'), { filename: 'importar-p0-confirmacion.js' });

assert.ok(Orbit.importarP0Confirmacion, 'Orbit.importarP0Confirmacion debe existir');
assert.equal(Orbit.importarP0Confirmacion.REQUIRED_PHRASE, 'CONFIRMO ESCRITURA CONTROLADA');

const okBatch = {
  batchId: 'batch_demo',
  sourceType: 'clientes',
  status: 'dry_run_aprobado',
  hasBlockingErrors: false,
  operations: [
    { action: 'insert', collection: 'clientes', data: { nombre: 'Cliente Demo', validationStatus: 'validado' } },
    { action: 'update', collection: 'polizas', id: 'pol_1', data: { numero: 'P-1', validationStatus: 'validado' } }
  ]
};

const summary = Orbit.importarP0Confirmacion.summarizeBatch(okBatch);
assert.equal(summary.total, 2);
assert.equal(summary.byAction.insert, 1);
assert.equal(summary.byAction.update, 1);
assert.equal(summary.blocked, 0);
assert.deepEqual(Orbit.importarP0Confirmacion.riskList(okBatch), []);

const blockedBatch = { status: 'dry_run_aprobado', operations: [{ collection: 'finmovs', data: {} }] };
const risks = Orbit.importarP0Confirmacion.riskList(blockedBatch);
assert.ok(risks.length >= 1);

console.log('OK P0 reinforced confirmation UI smoke passed');
