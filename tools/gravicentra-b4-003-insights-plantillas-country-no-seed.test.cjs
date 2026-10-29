'use strict';
// I6.5/B4-003: prevent resurrection of GT fallback, cross-country Insights
// drill-throughs and writes-on-render in historically approved Plantillas.
// Synthetic data only. No Firebase, credentials or operational writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const queriesSrc = read('orbit360-platform/core/queries.js');
const insightsSrc = read('orbit360-platform/modules/insights.js');
const plantillasSrc = read('orbit360-platform/modules/plantillas.js');

const rows = {
  clientes: [{ id: 'cliGT', pais: 'GT' }, { id: 'cliCO', pais: 'CO' }],
  polizas: [
    { id: 'polGT', pais: 'GT', clienteId: 'cliGT', asesorId: 'asesor1', estado: 'Vigente' },
    // Policy is authoritative even when a client's domicile differs.
    { id: 'polCO', pais: 'CO', clienteId: 'cliGT', asesorId: 'asesor1', estado: 'Vigente' },
    { id: 'polCOlegacy', clienteId: 'cliCO', asesorId: 'asesor1', estado: 'Vigente' },
    { id: 'polMissing', clienteId: 'missing', asesorId: 'asesor1' },
    { id: 'polInvalid', pais: 'XX', clienteId: 'cliGT', asesorId: 'asesor1' }
  ],
  cobros: [
    { id: 'payCO', polizaId: 'polCO', clienteId: 'cliGT', pais: 'CO', asesorId: 'asesor1' },
    { id: 'payOrphan', polizaId: 'not-found', clienteId: 'cliGT', pais: 'GT', asesorId: 'asesor1' },
    { id: 'payCountryConflict', polizaId: 'polCO', clienteId: 'cliGT', pais: 'GT', asesorId: 'asesor1' }
  ],
  comisiones: [{ id: 'comCO', clienteId: 'cliCO', pais: 'CO', asesorId: 'asesor1' }],
  cancelaciones: [{ id: 'canCO', polizaId: 'polCO', clienteId: 'cliGT', pais: 'CO' }]
};

function insightScope(country) {
  const store = {
    all: collection => rows[collection] || [],
    get: (collection, id) => (rows[collection] || []).find(row => row.id === id) || null,
    where: (collection, predicate) => (rows[collection] || []).filter(predicate)
  };
  const Orbit = {
    pais: country, store, modules: {},
    ui: { finiteNumber: n => Number.isFinite(Number(n)) ? Number(n) : null }
  };
  const document = { addEventListener() {} };
  const window = { Orbit, addEventListener() {} };
  const context = vm.createContext({ window, document, Orbit, Date, Map, Set });
  vm.runInContext(queriesSrc, context, { filename: 'queries.js' });
  const marker = 'return { render, cliente, sugerirMeta,';
  assert.ok(insightsSrc.includes(marker), 'Insights module test hook not found');
  const instrumented = insightsSrc.replace(marker,
    'return { render, cliente, sugerirMeta, __qaScope: { polizas, cobros, comisiones, cancelaciones, clientes },');
  vm.runInContext(instrumented, context, { filename: 'insights.js' });
  return Object.fromEntries(Object.entries(Orbit.modules.insights.__qaScope)
    .map(([collection, fn]) => [collection, Array.from(fn(), row => row.id)]));
}

test('Insights country and policy-linked finance respect GT, CO and TODOS', () => {
  const gt = insightScope('GT'), co = insightScope('CO'), all = insightScope('TODOS');
  assert.deepEqual(gt.polizas, ['polGT']);
  assert.deepEqual(co.polizas, ['polCO', 'polCOlegacy']);
  assert.deepEqual(all.polizas, ['polGT', 'polCO', 'polCOlegacy']);
  assert.deepEqual(gt.cobros, []);
  assert.deepEqual(co.cobros, ['payCO']);
  assert.deepEqual(all.cobros, ['payCO']);
  assert.deepEqual(gt.comisiones, []);
  assert.deepEqual(co.comisiones, ['comCO']);
  assert.deepEqual(co.cancelaciones, ['canCO']);
  assert.equal(all.polizas.length, gt.polizas.length + co.polizas.length);
  assert.equal(all.cobros.length, gt.cobros.length + co.cobros.length);
});

test('Insights drill-throughs and pending renewals must not bypass global country scope', () => {
  assert.doesNotMatch(insightsSrc, /return c \? c\.pais : 'GT'/);
  assert.doesNotMatch(insightsSrc, /S\(\)\.all\('polizas'\)\.filter\(p => p && p\.vigenciaInicio/);
  assert.doesNotMatch(insightsSrc, /const pols = S\(\)\.all\('polizas'\)\.filter/);
  assert.doesNotMatch(insightsSrc, /paisOK\(clientePais\(p\.clienteId\)\)/);
  assert.match(insightsSrc, /q\.policyLinkedCountry\(row\)/);
});

function renderTemplates(product, persisted) {
  let writes = 0;
  const Orbit = {
    modules: {},
    store: {
      __productOperationalWriteP0: product,
      all: collection => collection === 'plantillas' ? persisted : [],
      get: () => null,
      insert: () => { writes += 1; throw Error('NO_WRITE_ON_RENDER'); }
    },
    kit: {
      bannerFor: (_route, buttons) => '<div>' + buttons + '</div>',
      kpis: () => '<div>KPIs</div>'
    },
    ui: { esc: value => String(value) }
  };
  const document = { addEventListener() {} };
  const window = { Orbit, addEventListener() {} };
  const context = vm.createContext({ window, document, Orbit, Date, Set, Map });
  vm.runInContext(plantillasSrc, context, { filename: 'plantillas.js' });
  const host = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  Orbit.modules.plantillas.render(host);
  return { html: host.innerHTML, writes };
}

test('Plantillas product read renders six historical catalog cards and never writes', () => {
  const { html, writes } = renderTemplates(true, []);
  assert.equal((html.match(/class="pl-card"/g) || []).length, 6);
  assert.match(html, /Base · consulta/);
  assert.match(html, /no son registros guardados/);
  assert.match(html, /Requiere persistencia autorizada del servidor/);
  assert.doesNotMatch(html, /✎ Editar/);
  assert.match(html, /⧉ Copiar/);
  assert.match(html, />Usar<\/button>/);
  assert.equal(writes, 0);
});

test('Plantillas preserves legacy CRUD controls when a non-product store supports them', () => {
  const { html, writes } = renderTemplates(false, [
    { id: 'previously-saved', nombre: 'Plantilla histórica guardada', canal: 'Correo', cat: 'Comercial', texto: 'Hola' }
  ]);
  assert.equal((html.match(/class="pl-card"/g) || []).length, 1);
  assert.match(html, /Plantilla histórica guardada/);
  assert.match(html, /✎ Editar/);
  assert.equal(writes, 0);
  assert.match(plantillasSrc, /Orbit\.access\.filter\('clientes', S\(\)\.all\('clientes'\), 'plantillas'\)/);
});
