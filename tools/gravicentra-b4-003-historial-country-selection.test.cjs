'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/modules/historial.js'), 'utf8');
const clients = [
  { id: 'cg', pais: 'GT', nombre: 'Cliente GT' },
  { id: 'cc', pais: 'CO', nombre: 'Cliente CO' }
];
const policies = [{ id: 'pco', pais: 'CO', clienteId: 'cg' }];
const activities = [
  { id: 'gt', clienteId: 'cg', fecha: '2026-10-28', tipo: 'nota', titulo: 'ACT_GT', detalle: '', icon: '*' },
  { id: 'co', clienteId: 'cc', fecha: '2026-10-28', tipo: 'nota', titulo: 'ACT_CO', detalle: '', icon: '*' },
  { id: 'policy-co', clienteId: 'cg', polizaId: 'pco', pais: 'GT', fecha: '2026-10-28', tipo: 'nota', titulo: 'ACT_POLICY_CO', detalle: '', icon: '*' },
  { id: 'standalone-co', pais: 'CO', fecha: '2026-10-28', tipo: 'nota', titulo: 'ACT_STANDALONE_CO', detalle: '', icon: '*' },
  { id: 'unresolved', clienteId: 'missing', fecha: '2026-10-28', tipo: 'nota', titulo: 'ACT_UNRESOLVED', detalle: '', icon: '*' }
];
const data = { clientes: clients, polizas: policies, actividades: activities };
const host = { innerHTML: '' };
const orbit = {
  pais: 'GT',
  store: {
    all: name => data[name] || [],
    get: (name, id) => (data[name] || []).find(row => row.id === id) || null,
    _productStatus: () => ({ serverConfirmedCollections: ['actividades'], snapshotErrors: {} })
  },
  ui: { fmtDate: s => s, ago: () => '', esc: s => String(s == null ? '' : s) },
  q: { asesor: () => null },
  kit: {
    asesorOptions: () => [],
    bannerFor: () => '',
    kpis: rows => '<div class="kpi-total">' + rows[0].val + '</div>',
    filterBar: () => '',
    wireFilters: () => {}
  },
  modules: {}
};
const context = { window: { Orbit: orbit }, Orbit: orbit, document: {
  getElementById: () => { throw Error('denied detail must not reach DOM'); }
} };
vm.runInNewContext(source, context, { filename: 'historial.js' });
const historialModule = orbit.modules.historial;
const assertPresent = (expected, absent, total) => {
  historialModule.render(host);
  assert.match(host.innerHTML, new RegExp('class="kpi-total">' + total + '<'));
  expected.forEach(s => assert.ok(host.innerHTML.includes(s), 'missing ' + s));
  absent.forEach(s => assert.ok(!host.innerHTML.includes(s), 'foreign ' + s));
};

orbit.pais = 'GT';
assertPresent(['ACT_GT'], ['ACT_CO', 'ACT_POLICY_CO', 'ACT_STANDALONE_CO', 'ACT_UNRESOLVED'], 1);
historialModule.detalle('policy-co'); // restricted to CO even though client's domicile is GT

orbit.pais = 'CO';
assertPresent(['ACT_CO', 'ACT_POLICY_CO', 'ACT_STANDALONE_CO'], ['ACT_GT', 'ACT_UNRESOLVED'], 3);
historialModule.detalle('gt'); // a direct cross-country drawer must not open

orbit.pais = 'TODOS';
assertPresent(['ACT_GT', 'ACT_CO', 'ACT_POLICY_CO', 'ACT_STANDALONE_CO', 'ACT_UNRESOLVED'], [], 5);
console.log('PASS historial country selection: GT/CO/TODOS, policy-owned country, deny foreign drawer, read-only');
