#!/usr/bin/env node
/* Smoke P0 dry-run sanitizado — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

global.window = global;
global.Orbit = {};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js', 'utf8'), { filename: 'importa-dryrun-p0.js' });

assert.ok(Orbit.importaDryRunP0, 'debe registrar Orbit.importaDryRunP0');

const ok = Orbit.importaDryRunP0.buildDryRun({
  batchId: 'batch_ok',
  tenantId: 'tenant_demo',
  sourceType: 'polizas',
  sourceFileName: 'Polizas Demo.xlsx',
  sourceHash: 'hash-demo',
  operations: [{
    action: 'insert',
    collection: 'polizas',
    data: {
      numero: 'POL-001', aseguradoraNombre: 'Aseguradora Demo', vigenciaIni: '2026-01-01', vigenciaFin: '2026-12-31',
      pais: 'GT', moneda: 'GTQ', formaPago: 'mensual', clienteNombre: 'Cliente Demo', correo: 'cliente@example.com'
    }
  }]
});

assert.equal(ok.hasBlockingErrors, false);
assert.equal(ok.totals.operations, 1);
assert.equal(ok.totals.insert, 1);
assert.equal(ok.operations[0].data.clienteNombre.includes('***'), true, 'datos personales deben sanitizarse');
assert.equal(ok.operations[0].data.correo.includes('***'), true, 'correo debe sanitizarse');

const approved = Orbit.importaDryRunP0.approveDryRun(ok, { approved: true, phrase: 'CONFIRMO DRY RUN', userId: 'paula', reason: 'validacion ficticia' });
assert.equal(approved.status, 'dry_run_aprobado');

const blocked = Orbit.importaDryRunP0.buildDryRun({
  batchId: 'batch_blocked',
  sourceType: 'estado_cuenta_bancario',
  operations: [{ action: 'insert', collection: 'finmovs', data: { fecha: '2026-07-09', monto: 100, moneda: 'GTQ' } }]
});

assert.equal(blocked.hasBlockingErrors, true);
assert.ok(blocked.blockers.some(x => x.code.includes('collection_no_permitida')) || blocked.blockers.some(x => x.code.includes('collection_prohibida')));
const notApproved = Orbit.importaDryRunP0.approveDryRun(blocked, { approved: true, phrase: 'CONFIRMO DRY RUN', userId: 'paula', reason: 'no debe aprobar' });
assert.equal(notApproved.status, 'dry_run_no_aprobable');

const directoryOk = Orbit.importaDryRunP0.buildDryRun({
  batchId: 'batch_directorio_ok',
  sourceType: 'directorio_aseguradoras',
  operations: [{ action: 'insert', collection: 'aseguradoras', data: { nombre: 'Aseguradora Demo', pais: 'GT', credentialRef: 'backend_required' } }]
});
assert.equal(directoryOk.hasBlockingErrors, false, 'directorio aseguradoras debe permitir aseguradoras con credentialRef no sensible');
assert.equal(directoryOk.operations[0].data.nombre.includes('***'), true, 'nombre debe sanitizarse en preview');

const directoryBlocked = Orbit.importaDryRunP0.buildDryRun({
  batchId: 'batch_directorio_blocked',
  sourceType: 'directorio_aseguradoras',
  operations: [
    { action: 'insert', collection: 'credenciales', data: { nombre: 'Sistema Demo', pais: 'GT', password: 'NO-DEBE-IMPORTARSE' } },
    { action: 'insert', collection: 'aseguradoras', data: { nombre: 'Aseguradora Demo', pais: 'GT', password: 'NO-DEBE-IMPORTARSE' } }
  ]
});
assert.equal(directoryBlocked.hasBlockingErrors, true, 'credenciales reales deben bloquear dry-run');
assert.ok(directoryBlocked.blockers.some(x => x.code.includes('credencial_no_importable')), 'debe bloquear claves/credenciales reales');
assert.ok(directoryBlocked.blockers.some(x => x.code.includes('collection_no_permitida') || x.code.includes('collection_prohibida')), 'debe bloquear coleccion de credenciales');
assert.equal(directoryBlocked.operations[1].data.password.includes('***'), true, 'password debe sanitizarse en preview aunque este bloqueado');

console.log('OK P0 sanitized dry-run builder smoke passed');