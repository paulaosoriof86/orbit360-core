'use strict';
// E4 thesis-pilot causal regression: execute the REAL Reportes and Queries
// modules with synthetic GT/CO data, no network, identities or writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const queries = source('orbit360-platform/core/queries.js');
const reportes = source('orbit360-platform/modules/reportes.js');

const rows = {
  clientes: [
    { id: 'clientGT', pais: 'GT', nombre: 'Cliente Guatemala' },
    { id: 'clientCO', pais: 'CO', nombre: 'Cliente Colombia' },
    { id: 'clientQA', pais: 'CO', nombre: 'Cliente sintético QA', __syntheticQa: true },
    { id: 'clientAmb', pais: 'REQUIERE_VALIDACION', nombre: 'Cliente con país inferible' }
  ],
  aseguradoras: [
    { id: 'insGT', pais: 'GT', nombre: 'Aseguradora Guatemala' },
    { id: 'insCO', pais: 'CO', nombre: 'Aseguradora Colombia' }
  ],
  polizas: [
    { id: 'cross', numero: '2026000098', clienteId: 'clientGT', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', vigenciaInicio: '2026-02-01', vigenciaFin: '2026-12-22', primaNeta: 1200, estado: 'Vigente' },
    { id: 'infer', numero: 'CO-2026', clienteId: 'clientAmb', aseguradoraId: 'insCO', moneda: 'COP', vigenciaInicio: '2026-03-01', vigenciaFin: '2026-12-23', primaNeta: 200, estado: 'Vigente' },
    { id: 'ambiguousPolicy', numero: 'CO-AMB', clienteId: 'clientCO', aseguradoraId: 'insCO', pais: 'REQUIERE_VALIDACION', moneda: 'COP', vigenciaInicio: '2026-04-01', vigenciaFin: '2026-12-24', primaNeta: 300, estado: 'Vigente' },
    { id: 'gtOld', numero: 'GT-2026-LOOKALIKE', clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2025-02-01', vigenciaFin: '2026-12-25', primaNeta: 90, estado: 'Vigente' },
    { id: 'gtNew', numero: 'GT-2026', clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2026-05-01', vigenciaFin: '2026-12-26', primaNeta: 50, estado: 'Vigente' },
    { id: 'qaCO', numero: 'B4-003-CAN-38102224750', clienteId: 'clientCO', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', vigenciaInicio: '2026-05-02', vigenciaFin: '2026-12-27', primaNeta: 45000, estado: 'Vigente', __syntheticQa: true },
    { id: 'qaGT', numero: 'B4-003-HEALTH-38102224750', clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2026-05-03', vigenciaFin: '2026-12-27', primaNeta: 60000, estado: 'Vigente', syntheticQa: true },
    { id: 'qaInherited', numero: 'QA-CLIENT-INHERITED', clienteId: 'clientQA', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', vigenciaInicio: '2026-05-04', vigenciaFin: '2026-12-27', primaNeta: 70000, estado: 'Vigente' },
    { id: 'wrongInsurer', numero: 'INCONSISTENT', clienteId: 'clientGT', aseguradoraId: 'insCO', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2026-06-01', primaNeta: 90000 },
    { id: 'orphanQA', numero: 'B2-REN-TEST', clienteId: 'missingPhysicalClient', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2026-06-01', primaNeta: 80000 },
    { id: 'unknownYear', numero: 'POL-202699', clienteId: 'clientCO', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', primaNeta: 999 },
    { id: 'wrongCurrency', numero: 'COP-POL-WRONG-CUR', clienteId: 'clientCO', aseguradoraId: 'insCO', pais: 'CO', moneda: 'GTQ', vigenciaInicio: '2026-07-01', primaNeta: 150 }
  ],
  cobros: [
    { id: 'pmtCross', polizaId: 'cross', clienteId: 'clientGT', pais: 'CO', moneda: 'COP', vence: '2026-05-01', monto: 600, estado: 'Pagado' },
    { id: 'pmtCountryContradiction', polizaId: 'cross', clienteId: 'clientGT', pais: 'GT', moneda: 'COP', vence: '2026-05-01', monto: 888, estado: 'Pagado' },
    { id: 'pmtOrphan', polizaId: 'missing', clienteId: 'clientGT', pais: 'GT', moneda: 'GTQ', vence: '2026-05-01', monto: 888, estado: 'Pagado' },
    { id: 'pmtGT', polizaId: 'gtNew', clienteId: 'clientGT', pais: 'GT', moneda: 'GTQ', vence: '2026-05-02', monto: 100, estado: 'Pagado' },
    { id: 'pmtQA', polizaId: 'qaCO', clienteId: 'clientCO', pais: 'CO', moneda: 'COP', vence: '2026-05-03', monto: 99999, estado: 'Pagado' },
    { id: 'pmtMarkedQA', polizaId: 'cross', clienteId: 'clientGT', pais: 'CO', moneda: 'COP', vence: '2026-05-03', monto: 99998, estado: 'Pagado', __syntheticQa: true }
  ],
  comisiones: [
    { id: 'commissionCO', polizaId: 'cross', clienteId: 'clientGT', pais: 'CO', moneda: 'COP', periodo: '2026-06', base: 600, monto: 60, pct: 10, estado: 'Liquidada' },
    { id: 'commissionGT', polizaId: 'gtNew', clienteId: 'clientGT', pais: 'GT', moneda: 'GTQ', periodo: '2026-06', base: 100, monto: 10, pct: 10, estado: 'Liquidada' },
    { id: 'commissionQA', polizaId: 'qaCO', clienteId: 'clientCO', pais: 'CO', moneda: 'COP', periodo: '2026-06', base: 99999, monto: 9999, pct: 10, estado: 'Liquidada' }
  ],
  reclamos: [
    { id: 'claimCO', polizaId: 'cross', clienteId: 'clientGT', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', fecha: '2026-06-05', numero: 'S-01', montoReclamado: 1000, montoAprobado: 500 },
    { id: 'claimGT', polizaId: 'gtNew', clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', fecha: '2026-06-05', numero: 'S-02', montoReclamado: 20, montoAprobado: 15 },
    { id: 'claimQA', polizaId: 'qaCO', clienteId: 'clientCO', aseguradoraId: 'insCO', pais: 'CO', moneda: 'COP', fecha: '2026-06-05', numero: 'QA-S-01', montoReclamado: 90000, montoAprobado: 80000 }
  ],
  cancelaciones: [
    { id: 'cancelCO', polizaId: 'cross', clienteId: 'clientGT', pais: 'CO', moneda: 'COP', fecha: '2026-06-05', valorPerdido: 100 },
    { id: 'cancelGT', polizaId: 'gtNew', clienteId: 'clientGT', pais: 'GT', moneda: 'GTQ', fecha: '2026-06-05', valorPerdido: 20 },
    { id: 'cancelQA', polizaId: 'qaCO', clienteId: 'clientCO', pais: 'CO', moneda: 'COP', fecha: '2026-06-05', valorPerdido: 90000 }
  ],
  reportes_prog: []
};

function setup(country, options = {}) {
  let writes = 0;
  let insurersReady = options.deferInsurers !== true && options.blockInsurers !== true;
  const insurerListeners = new Set(), ensureRequests = [];
  const store = {
    all: k => k === 'aseguradoras' && !insurersReady ? [] : rows[k] || [],
    get: (k, id) => store.all(k).find(x => String(x.id) === String(id)) || null,
    where: (k, f) => (rows[k] || []).filter(f),
    _productStatus: () => ({ serverConfirmedCollections: insurersReady ? ['aseguradoras'] : [],
      deniedCollections: options.blockInsurers ? ['aseguradoras'] : [], snapshotErrors: {} }),
    _ensureCollections: names => { ensureRequests.push(...names); return names; },
    on: (_, cb) => { insurerListeners.add(cb); return () => insurerListeners.delete(cb); },
    insert() { writes++; throw Error('READ_ONLY_REPORT_RENDER_MUST_NOT_WRITE'); },
    remove() { writes++; throw Error('READ_ONLY_REPORT_RENDER_MUST_NOT_DELETE'); }
  };
  const Orbit = {
    pais: country, store, modules: {},
    ui: { esc: v => String(v == null ? '' : v), fmtDate: v => String(v || ''),
      money: (v, cur) => String(cur) + ' ' + Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      finiteNumber: v => Number.isFinite(Number(v)) ? Number(v) : null },
    kit: { banner: () => '<div>Reporte</div>' },
    PAISES: [{ id: 'GT', label: 'Guatemala' }, { id: 'CO', label: 'Colombia' }, { id: 'TODOS', label: 'Todos' }]
  };
  const context = vm.createContext({ Orbit, window: { Orbit }, location: { hash: '#/reportes' }, Date, Map, Set, console });
  vm.runInContext(queries, context, { filename: 'queries.js' });
  Orbit.q.renovacionesProximas = () => rows.polizas;
  vm.runInContext(reportes, context, { filename: 'reportes.js' });
  let handlers = new Map();
  const host = {
    innerHTML: '',
    isConnected: true,
    querySelectorAll: () => [],
    querySelector: selector => ({ addEventListener: (type, cb) => handlers.set(selector + ':' + type, cb) })
  };
  function render() { handlers = new Map(); Orbit.modules.reportes.render(host); return host.innerHTML; }
  function event(selector, value) {
    const callback = handlers.get(selector + ':change');
    assert.ok(callback, 'MISSING_ACTIVE_FILTER_HANDLER_' + selector);
    callback({ target: { value } });
    return host.innerHTML;
  }
  return { Orbit, render, event, writes: () => writes, ensureRequests,
    confirmInsurers: () => { insurersReady = true; for (const cb of insurerListeners) cb('aseguradoras'); return host.innerHTML; } };
}

test('E4 waits for deferred insurer directory, refreshes on server confirmation and blocks premature export', () => {
  const app = setup('CO', { deferInsurers: true });
  const pending = app.render();
  assert.match(pending, /data-report-insurer-readiness="loading"/);
  assert.match(pending, /Confirmando aseguradoras con el servidor/);
  assert.doesNotMatch(pending, /id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  assert.doesNotMatch(pending, /2026000098/);
  assert.ok(app.ensureRequests.includes('aseguradoras'));
  const confirmed = app.confirmInsurers();
  assert.match(confirmed, /Aseguradora Colombia/);
  assert.match(confirmed, /2026000098/);
  assert.match(confirmed, /id="rep-exp"/);
  assert.doesNotMatch(confirmed, /data-report-insurer-readiness="loading"/);
  assert.equal(app.writes(), 0);
});

test('E4 does not expose incomplete insurer-dependent reports after a scope denial', () => {
  const app = setup('CO', { blockInsurers: true });
  const html = app.render();
  assert.match(html, /data-report-insurer-readiness="blocked"/);
  assert.doesNotMatch(html, /id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  assert.equal(app.writes(), 0);
});

test('E4 production: country of policy+insurer, no GT fallback, no QA orphan, no year-from-policy-number', () => {
  const app = setup('CO');
  let html = app.render();
  assert.match(html, /2026000098/); // CO policy with GT-domiciled client
  assert.match(html, /CO-2026/); // country inferred from CO insurer
  assert.match(html, /CO-AMB/); // invalid country falls back to verified insurer
  assert.doesNotMatch(html, /GT-2026-LOOKALIKE/);
  assert.doesNotMatch(html, /INCONSISTENT/);
  assert.doesNotMatch(html, /B2-REN-TEST/);
  assert.match(html, /data-report-country-quarantine="2"/);
  html = app.event('#rep-anio', '2026');
  assert.match(html, /CO-2026/);
  assert.doesNotMatch(html, /POL-202699/); // year in policy ID is NOT an issue/term date
  assert.match(html, /data-report-unknown-period="1"/);
  assert.match(html, /Año \(emisión \/ inicio de vigencia\)/);
  assert.equal(app.writes(), 0);
});

test('E4 policy grouping: only explicitly monetary raw measures, no sums of IDs, percentages or mixed currencies', () => {
  const app = setup('CO');
  app.render();
  let html = app.event('#rep-group', 'Aseguradora');
  assert.match(html, /Σ Prima neta/);
  assert.doesNotMatch(html, /Σ Póliza/);
  assert.match(html, /COP 2\.699,00/); // all years: 1200+200+300+999, NOT a rendered-money parse
  assert.match(html, /data-report-unverified-amounts="1"/); // invalid GTQ in CO
  html = app.event('#rep-anio', '2026');
  assert.match(html, /Resumen de 1 grupos/);
  assert.match(html, /COP 1\.700,00/); // 2026 source date: 1200+200+300, excludes undated 999
  app.Orbit.pais = 'TODOS';
  html = app.render();
  assert.doesNotMatch(html, /Σ Prima neta/);
  assert.match(html, /Monedas separadas/);
  assert.equal(app.writes(), 0);
});

test('E4 GT does not display Colombian insurers, even when the client domicile is Guatemala', () => {
  const app = setup('GT');
  let html = app.render();
  assert.match(html, /GT-2026-LOOKALIKE/);
  assert.match(html, /GT-2026/);
  assert.doesNotMatch(html, /2026000098/);
  assert.doesNotMatch(html, /Aseguradora Colombia/);
  assert.doesNotMatch(html, /B2-REN-TEST/);
  assert.match(html, /data-report-country-quarantine="2"/);
  html = app.event('#rep-anio', '2026');
  assert.doesNotMatch(html, /GT-2026-LOOKALIKE/);
  assert.match(html, /GT-2026/);
});

test('E4 all six reports inherit the same country and period rule', () => {
  const app = setup('CO');
  app.render();
  const kinds = [
    ['cartera', 'pmtCross', 'pmtGT'],
    ['comisiones', 'commissionCO', 'commissionGT'],
    ['renovaciones', '2026000098', 'GT-2026'],
    ['siniestros', 'S-01', 'S-02'],
    ['cancelaciones', 'cancelCO', 'cancelGT']
  ];
  for (const [kind, yes, no] of kinds) {
    const marker = "return { render, quitarProg, verFila };";
    assert.ok(reportes.includes(marker));
    // Render through the active tab; row IDs are present in click navigation.
    const instrument = reportes.replace(marker, "return { render, quitarProg, verFila, __qaSelect: key => { sel = key; } };");
    const Orbit = app.Orbit;
    vm.runInNewContext(instrument, { Orbit, window: { Orbit }, Date }, { filename: 'reportes-e4-test-instrumentation.js' });
    Orbit.modules.reportes.__qaSelect(kind);
    let html = app.render();
    assert.match(html, new RegExp(yes));
    assert.doesNotMatch(html, new RegExp(no));
    html = app.event('#rep-anio', '2026');
    assert.match(html, new RegExp(yes));
  }
  assert.equal(app.writes(), 0);
});

test('E4 QA provenance is excluded in six reports, while retained and counted for audit', () => {
  const app = setup('CO');
  let html = app.render();
  assert.doesNotMatch(html, /B4-003-CAN-38102224750|QA-CLIENT-INHERITED/);
  assert.match(html, /data-report-qa-quarantine="3"/);
  assert.match(html, /3 registros sintéticos QA excluidos/);
  assert.match(html, /2026000098/);
  for (const [kind, forbidden] of [
    ['cartera', /pmtQA|pmtMarkedQA/],
    ['comisiones', /commissionQA/],
    ['renovaciones', /B4-003-CAN-38102224750|QA-CLIENT-INHERITED/],
    ['siniestros', /QA-S-01/],
    ['cancelaciones', /cancelQA/]
  ]) {
    const marker = "return { render, quitarProg, verFila };";
    const instrument = reportes.replace(marker, "return { render, quitarProg, verFila, __qaSelect: key => { sel = key; } };");
    const Orbit = app.Orbit;
    vm.runInNewContext(instrument, { Orbit, window: { Orbit }, Date }, { filename: 'reportes-e4-test-synthetic.js' });
    Orbit.modules.reportes.__qaSelect(kind);
    html = app.render();
    assert.doesNotMatch(html, forbidden, 'QA leaked into ' + kind);
    assert.match(html, /data-report-qa-quarantine=/);
  }
  app.Orbit.pais = 'GT';
  html = app.render();
  assert.doesNotMatch(html, /B4-003-HEALTH-38102224750/);
  assert.equal(app.writes(), 0);
});

test('E4 exact source contract never guesses numeric amount from rendered strings', () => {
  assert.doesNotMatch(reportes, /parseFloat\(String\(s\)\.replace/);
  assert.doesNotMatch(reportes, /cells\.some\(c => String\(c\)\.includes\(anioSel\)\)/);
  assert.doesNotMatch(reportes, /paisOK\(p\.clienteId\)/);
  assert.match(reportes, /q\.policyLinkedCountry\(row\)/);
  assert.match(reportes, /moneyCols:\s*\[5\]/);
});
