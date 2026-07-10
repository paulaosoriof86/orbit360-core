#!/usr/bin/env node
/* Smoke P0 dry-run manifest — no usa datos reales */
import assert from 'assert';
import { DRYRUN_SOURCES, validateManifest, dryRunGateSummary } from './orbit360-p0-dryrun-manifest-20260709.mjs';

const res = validateManifest();
assert.equal(res.ok, true, 'manifest must be valid');
assert.ok(DRYRUN_SOURCES.length >= 8, 'must cover principal separated sources');

const ids = DRYRUN_SOURCES.map(s => s.id);
['clientes', 'polizas', 'vehiculos', 'recibos_fuente_externa', 'estados_cuenta_aseguradora', 'planillas_comisiones', 'facturas_comisiones', 'estado_cuenta_bancario'].forEach(id => {
  assert.ok(ids.includes(id), `missing source ${id}`);
});

const cartera = DRYRUN_SOURCES.find(s => s.id === 'estados_cuenta_aseguradora');
assert.ok(cartera.targets.includes('carteraPrimas'));
assert.ok(cartera.neverCreates.includes('finmovs'));
assert.ok(cartera.neverCreates.includes('cxcComisiones'));

const banco = DRYRUN_SOURCES.find(s => s.id === 'estado_cuenta_bancario');
assert.ok(banco.targets.includes('conciliacionBancaria'));
assert.ok(banco.neverCreates.includes('finmovs'));
assert.ok(banco.dryRunOutputs.includes('requiere_confirmacion_humana'));

const summary = dryRunGateSummary(banco);
assert.equal(summary.writesRealData, false);
assert.equal(summary.requiresHumanConfirmation, true);

console.log('OK P0 dry-run manifest smoke passed');
