'use strict';
// A confirmed payment with an unverified parent cannot inflate TODOS while
// disappearing from GT and CO. Keep it visible as a separate reconciliation
// exception, never silently discard it or pretend to resolve its country.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('orbit360-platform/core/queries.js', 'utf8');
function results(country) {
  const data = {
    clientes: [{ id: 'cCO', pais: 'CO' }, { id: 'cGT', pais: 'GT' }],
    polizas: [{ id: 'pCO', clienteId: 'cCO', pais: 'CO', moneda: 'COP' }],
    cobros: [
      { id: 'validated', polizaId: 'pCO', clienteId: 'cCO', pais: 'CO', moneda: 'COP', estado: 'Pagado', monto: 100, conciliado: true },
      { id: 'orphan', polizaId: 'missing', clienteId: 'cGT', pais: 'GT', moneda: 'GTQ', estado: 'Pagado', monto: 200 }
    ],
    recibosEsperados: [], carteraPrimas: [], vehiculos: []
  };
  const store = {
    all: collection => data[collection] || [],
    get: (collection, id) => (data[collection] || []).find(row => row.id === id) || null,
    where: (collection, predicate) => (data[collection] || []).filter(predicate)
  };
  const Orbit = { store, pais: country, ui: { finiteNumber: n => Number.isFinite(Number(n)) ? Number(n) : null, daysFromNow: () => 0 } };
  vm.runInNewContext(source, { window: { Orbit }, Orbit, Date, Map });
  return Orbit.q.carteraGlobalPorMoneda();
}

test('Cobros TODOS equals valid country partitions; orphan remains in an explicit exception', () => {
  const all = results('TODOS'), co = results('CO'), gt = results('GT');
  assert.equal(all.confirmedCount, 1, 'unknown-country payment must not inflate confirmed KPI');
  assert.equal(all.confirmedCount, co.confirmedCount + gt.confirmedCount);
  assert.equal(all.byCurrency.COP.alDia, 100);
  assert.equal(all.byCurrency.GTQ, undefined);
  assert.equal(all.unassignedConfirmedCount, 1);
  assert.equal(all.unassignedConfirmedByCurrency.GTQ, 200);
  assert.equal(co.unassignedConfirmedCount, 0);
  assert.equal(gt.unassignedConfirmedCount, 0);
});

test('Cobros displays unassigned confirmations separately without deleting or converting source amounts', () => {
  const ui = fs.readFileSync('orbit360-platform/modules/cobros.js', 'utf8');
  assert.match(ui, /data-cobros-confirmed-country-unassigned/);
  assert.match(ui, /cart\.unassignedConfirmedByCurrency/);
  assert.match(ui, /Se conservan en el origen y se muestran aquí por separado/);
  assert.match(ui, /safeMoney\(value, currency, false\)/);
});
