#!/usr/bin/env node
/* Smoke P0 escritura controlada — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { clientes: [], aseguradoras: [], polizas: [], finmovs: [], cobros: [], auditoriaImportaciones: [] };
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
assert.equal(Orbit.importaWriteP0.isAllowedCollection('aseguradoras'), true);
assert.equal(Orbit.importaWriteP0.isAllowedCollection('finmovs'), false);
assert.equal(Orbit.importaWriteP0.isAllowedCollection('cobros'), false);

const blocked = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_1', sourceType: 'estado_cuenta_bancario', status: 'dry_run_aprobado', operations: [
    { action: 'insert', collection: 'finmovs', data: { id: 'fm_1', monto: 100, validationStatus: 'validado' } },
    { action: 'insert', collection: 'cobros', data: { id: 'cob_1', monto: 100, validationStatus: 'validado' } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'test' });
assert.equal(blocked.ok, false, 'finmovs/cobros deben estar bloqueados');
assert.equal(memory.finmovs.length, 0);
assert.equal(memory.cobros.length, 0);

const pendingClient = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_client', sourceType: 'polizas', status: 'dry_run_aprobado', sourceFileName: 'polizas-demo.xlsx', operations: [
    { action: 'insert', collection: 'clientes', data: { id: 'cli_1', nombre: 'Cliente Incompleto', pais: 'GT', moneda: 'GTQ', calidad_datos: 'pendiente_completar' } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'alta cliente incompleto autorizada por fuente de poliza' });
assert.equal(pendingClient.ok, true);
assert.equal(memory.clientes.length, 1);
assert.equal(memory.clientes[0].calidad_datos, 'pendiente_completar');
assert.equal(memory.clientes[0].validationStatus, 'pendiente_completar');
assert.equal(memory.clientes[0].requiereValidacion, false);
assert.notEqual(memory.clientes[0].validationStatus, 'validado');
assert.equal(memory.auditoriaImportaciones.at(-1).status, 'written_controlled_pending_quality');

const restrictedInsurer = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_ins', sourceType: 'polizas', status: 'dry_run_aprobado', sourceFileName: 'polizas-demo.xlsx', operations: [
    { action: 'insert', collection: 'aseguradoras', data: { id: 'ins_pending', nombre: 'Aseguradora Referenciada', pais: 'CO', requiereValidacion: true, validationStatus: 'requiere_validacion', estadoOperativo: 'pendiente_validacion', vinculada: false, cotizadorHabilitado: false, comparativoHabilitado: false, tarifasHabilitadas: false } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'referencia de aseguradora encontrada en poliza' });
assert.equal(restrictedInsurer.ok, true);
assert.equal(memory.aseguradoras.length, 1);
assert.equal(memory.aseguradoras[0].vinculada, false);
assert.equal(memory.aseguradoras[0].estadoOperativo, 'pendiente_validacion');
assert.equal(memory.auditoriaImportaciones.at(-1).status, 'written_controlled_restricted');

const activeInsurerBlocked = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_ins_bad', sourceType: 'polizas', status: 'dry_run_aprobado', operations: [
    { action: 'insert', collection: 'aseguradoras', data: { id: 'ins_active_bad', nombre: 'No debe activar', pais: 'CO', validationStatus: 'validado', vinculada: true } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'negative fixture' });
assert.equal(activeInsurerBlocked.ok, false);
assert.equal(memory.aseguradoras.some(x => x.id === 'ins_active_bad'), false);

const pendingPolicy = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_policy_pending', sourceType: 'polizas', status: 'dry_run_aprobado', sourceFileName: 'polizas-demo.xlsx', operations: [
    { action: 'insert', collection: 'polizas', data: { id: 'pol_pending', numero: 'POL-PEND-001', pais: 'GT', moneda: 'GTQ', estado: 'Vigente', calidad_datos: 'pendiente_completar', validationStatus: 'pendiente_completar', requiereValidacion: true, carteraMaterializada: false, cobroAplicado: false, recibosMaterializados: false, motivosCalidad: ['FORMA_PAGO_FALTANTE'] } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'poliza sin forma de pago; no materializar cartera' });
assert.equal(pendingPolicy.ok, true);
const pp = memory.polizas.find(x => x.id === 'pol_pending');
assert.ok(pp);
assert.equal(pp.validationStatus, 'pendiente_completar');
assert.equal(pp.requiereValidacion, true);
assert.equal(pp.carteraMaterializada, false);
assert.equal(pp.cobroAplicado, false);
assert.equal(pp.recibosMaterializados, false);
assert.equal(pp.estadoCartera, 'pendiente_datos_no_materializar');
assert.equal(memory.auditoriaImportaciones.at(-1).status, 'written_controlled_pending_policy');

const ok = Orbit.importaWriteP0.writeBatch({
  batchId: 'batch_2', sourceType: 'polizas', status: 'dry_run_aprobado', sourceFileName: 'polizas-demo.xlsx', operations: [
    { action: 'insert', collection: 'polizas', data: { id: 'pol_1', numero: 'POL-001', pais: 'GT', moneda: 'GTQ', validationStatus: 'validado', carteraMaterializada: false, cobroAplicado: false } }
  ]
}, { approved: true, phrase: 'CONFIRMO ESCRITURA CONTROLADA', userId: 'paula', reason: 'dry-run aprobado' });
assert.equal(ok.ok, true);
assert.equal(ok.written, 1);
assert.ok(memory.polizas.find(x => x.id === 'pol_1'));
assert.equal(memory.polizas.find(x => x.id === 'pol_1').createdByImport, true);
assert.equal(memory.polizas.find(x => x.id === 'pol_1').importBatchId, 'batch_2');
assert.equal(ok.rollback.length, 1);

const rb = Orbit.importaWriteP0.rollback(ok.rollback, { approved: true, phrase: 'CONFIRMO ROLLBACK', userId: 'paula', reason: 'test rollback' });
assert.equal(rb.ok, true);
assert.equal(memory.polizas.some(x => x.id === 'pol_1'), false);
assert.ok(memory.polizas.some(x => x.id === 'pol_pending'), 'rollback focal no debe eliminar otra operacion');

console.log(JSON.stringify({status:'PASS',controlledWrite:true,pendingClientQualityPreserved:true,restrictedInsurerOnly:true,pendingPolicyQualityPreserved:true,pendingPolicyCannotMaterializeReceipts:true,hardBlockedCollectionsPreserved:true,rollback:true,firestoreWrites:0,operationalWrites:0,testHarnessExit:'explicit'},null,2));
// importa-write-p0 keeps a browser-oriented 10-minute sync-status timer alive.
// This synthetic Node test has already completed all assertions; terminate the harness explicitly.
process.exit(0);
