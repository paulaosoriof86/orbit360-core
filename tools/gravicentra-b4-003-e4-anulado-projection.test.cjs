'use strict';
// B4-003 E4 targeted regression: 12 real-style cancelled expected receipts
// never appear as active projected payment rows. No Firestore/network/writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourceRoot = process.env.B4_AUDIT_SOURCE_ROOT
  ? path.resolve(process.env.B4_AUDIT_SOURCE_ROOT)
  : path.resolve(__dirname, '..', 'orbit360-platform');
const read = name => fs.readFileSync(path.join(sourceRoot, name), 'utf8');

function make(country) {
  const docs = {
    clientes: [
      { id: 'clientGT', pais: 'GT' },
      { id: 'clientCO', pais: 'CO' },
      { id: 'clientQA', pais: 'GT', __syntheticQa: true }
    ],
    aseguradoras: [{ id: 'ig', pais: 'GT' }, { id: 'ic', pais: 'CO' }],
    polizas: [
      { id: 'p39012', numero: 'AUTO39012', pais: 'GT', aseguradoraId: 'ig', clienteId: 'clientGT' },
      { id: 'p10478', numero: 'VA125-00010478', pais: 'GT', aseguradoraId: 'ig', clienteId: 'clientGT' },
      { id: 'pco', numero: 'CO-VIGENTE', pais: 'CO', aseguradoraId: 'ic', clienteId: 'clientCO' },
      { id: 'pqa', numero: 'QA-FIXTURE', pais: 'GT', aseguradoraId: 'ig', clienteId: 'clientQA', __syntheticQa: true }
    ],
    cobros: [], carteraPrimas: [],
    recibosEsperados: [
      ...Array.from({ length: 12 }, (_, n) => ({
        id: 'cancelled' + n, polizaId: n < 10 ? 'p39012' : 'p10478',
        clienteId: 'clientGT', pais: 'GT', estado: 'Anulado',
        estadoOperativo: n % 2 ? 'futuro_pendiente' : 'pago_reportado',
        paymentOrigin: 'client_portal', cuota: n + 1
      })),
      { id: 'legitimate', polizaId: 'p39012', clienteId: 'clientGT', pais: 'GT', estado: 'Pendiente', estadoOperativo: 'pago_reportado' },
      { id: 'qa', polizaId: 'pqa', clienteId: 'clientQA', pais: 'GT', estado: 'Pendiente', estadoOperativo: 'pago_reportado', __syntheticQa: true },
      { id: 'co', polizaId: 'pco', clienteId: 'clientCO', pais: 'CO', estado: 'Pendiente', estadoOperativo: 'pago_reportado' }
    ]
  };
  let writes = 0;
  const store = {
    all: name => docs[name] || [],
    get: (name, id) => (docs[name] || []).find(r => String(r.id) === String(id)) || null,
    where: (name, fn) => (docs[name] || []).filter(fn),
    _productStatus: () => ({ serverConfirmedCollections: Object.keys(docs), deniedCollections: [], snapshotErrors: {} }),
    _ensureCollections: () => { throw Error('UNEXPECTED_NETWORK_READ'); },
    insert: () => { writes++; throw Error('WRITE_BLOCKED'); },
    update: () => { writes++; throw Error('WRITE_BLOCKED'); },
    remove: () => { writes++; throw Error('WRITE_BLOCKED'); }
  };
  const U = {
    finiteNumber: v => Number.isFinite(Number(v)) ? Number(v) : null,
    daysFromNow: () => 0, money: (v,c) => c + ' ' + v,
    moneyShort: (v,c) => c + ' ' + v, fmtDate: v => String(v || ''),
    text: v => String(v || ''), esc: v => String(v || ''), today: () => '2026-11-04'
  };
  const Orbit = { pais: country, store, ui: U, kit: {}, modules: {},
    session: { rol: () => 'administracion', asesorId: () => '' },
    access: { canView: () => true },
    auth: { user: () => ({ uid: 'TEST' }) },
    tenant: { get: () => ({ tenantId: 'alianzas-soluciones' }) }
  };
  const context = vm.createContext({ Orbit, window: { Orbit }, location: { hostname: 'example.invalid', hash: '#/reportes' }, Map, Set, Date, setTimeout, clearTimeout, console });
  vm.runInContext(read('core/queries.js'), context);
  const marker = '  return { render, detalle, reportarPago,';
  const original = read('modules/cobros.js');
  assert.equal(original.split(marker).length, 2, 'Cobros API contract changed');
  const instrumented = original.replace(marker,
    '  return { __e4Test: { buildIndex, reportedRows, reportableRows, filter: value => { st.fest = value; } }, render, detalle, reportarPago,');
  vm.runInContext(instrumented, context);
  const owner = Orbit.modules.cobros.__e4Test;
  return { owner, writes: () => writes };
}

test('E4: 12 Anulado source receipts are absent by default and available under exact Anulado filter', () => {
  const gt = make('GT');
  const idx = gt.owner.buildIndex();
  const defaultRows = gt.owner.reportedRows(idx);
  assert.equal(defaultRows.length, 2, 'Only valid source payment + inspectable QA fixture are in default list');
  assert.equal(defaultRows.filter(x => x.estado === 'Anulado').length, 0);
  assert.equal(gt.owner.reportableRows().length, 2, 'Reportes owner never includes cancelled receipts');
  gt.owner.filter('Anulado');
  const cancelled = gt.owner.reportedRows(idx);
  assert.equal(cancelled.length, 12, 'Anulado selector must find all twelve projections');
  assert.ok(cancelled.every(x => x.estado === 'Anulado'));
  gt.owner.filter('Pagado');
  assert.equal(gt.owner.reportedRows(idx).length, 0, 'Cancelled projections must not impersonate paid receipts');
  gt.owner.filter('');
  assert.equal(gt.owner.reportedRows(idx).length, 2);
  assert.equal(gt.writes(), 0);
  const co = make('CO');
  assert.equal(co.owner.reportedRows(co.owner.buildIndex()).length, 1);
  co.owner.filter('Anulado');
  assert.equal(co.owner.reportedRows(co.owner.buildIndex()).length, 0);
  assert.equal(co.writes(), 0);
});
