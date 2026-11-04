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
const cancelaciones = source('orbit360-platform/modules/cancelaciones.js');
const reportes = source('orbit360-platform/modules/reportes.js');
const cobrosOwner = source('orbit360-platform/modules/cobros.js');
const polizas = source('orbit360-platform/modules/polizas.js');
const cliente360 = source('orbit360-platform/modules/cliente360.js');

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
    { id: 'qaB2SourceGT', numero: 'B2-REN-SOURCE', clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ', vigenciaInicio: '2026-10-01', vigenciaFin: '2027-10-01', primaNeta: 1000, estado: 'Vigente', sourceRef: 'B2 QA firme 36489784713' },
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
  recibosEsperados: [],
  carteraPrimas: [],
  reportes_prog: []
};

function setup(country, options = {}) {
  let writes = 0;
  let insurersReady = options.deferInsurers !== true && options.blockInsurers !== true;
  let policiesReady = options.deferPolicies !== true && options.blockPolicies !== true;
  const insurerListeners = new Set(), ensureRequests = [];
  const store = {
    all: k => (k === 'aseguradoras' && !insurersReady) || (k === 'polizas' && !policiesReady) ? [] : (k === 'polizas' && Array.isArray(options.extraPolicies) ? rows.polizas.concat(options.extraPolicies) : rows[k] || []),
    get: (k, id) => store.all(k).find(x => String(x.id) === String(id)) || null,
    where: (k, f) => (rows[k] || []).filter(f),
    _productStatus: () => ({
      serverConfirmedCollections: ['clientes', 'cobros', 'recibosEsperados', 'carteraPrimas', 'comisiones', 'reclamos', 'cancelaciones']
        .concat(policiesReady ? ['polizas'] : []).concat(insurersReady ? ['aseguradoras'] : []),
      deniedCollections: (options.blockInsurers ? ['aseguradoras'] : [])
        .concat(options.blockPolicies ? ['polizas'] : []), snapshotErrors: {}
    }),
    _ensureCollections: names => { ensureRequests.push(...names); return names; },
    on: (_, cb) => { insurerListeners.add(cb); return () => insurerListeners.delete(cb); },
    insert() { writes++; throw Error('READ_ONLY_REPORT_RENDER_MUST_NOT_WRITE'); },
    remove() { writes++; throw Error('READ_ONLY_REPORT_RENDER_MUST_NOT_DELETE'); }
  };
  const Orbit = {
    pais: country, store, modules: {},
    ui: { esc: v => String(v == null ? '' : v), text: (v,d) => v == null || v === '' ? d : String(v), fmtDate: v => String(v || ''),
      money: (v, cur) => String(cur) + ' ' + Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      finiteNumber: v => Number.isFinite(Number(v)) ? Number(v) : null },
    kit: { banner: () => '<div>Reporte</div>' },
    PAISES: [{ id: 'GT', label: 'Guatemala' }, { id: 'CO', label: 'Colombia' }, { id: 'TODOS', label: 'Todos' }]
  };
  const context = vm.createContext({ Orbit, window: { Orbit }, location: { hash: '#/reportes' }, Date, Map, Set, console, setTimeout, clearTimeout });
  const pdfCaptured = [];
  if (options.capturePdf) {
    context.window.open = () => ({ document: { write(value) { pdfCaptured.push(String(value)); }, close() {} }, print() {} });
    context.document = { createElement: () => ({ className: '', textContent: '', remove() {} }), body: { appendChild() {} } };
  }
  vm.runInContext(queries, context, { filename: 'queries.js' });
  Orbit.q.renovacionesProximas = () => rows.polizas;
  vm.runInContext(cancelaciones, context, { filename: 'cancelaciones.js' });
  vm.runInContext(cobrosOwner, context, { filename: 'cobros.js' });
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
  return { Orbit, render, event,
    click: selector => { const callback = handlers.get(selector + ':click'); assert.ok(callback, 'MISSING_CLICK_HANDLER_' + selector); callback(); return pdfCaptured.join(''); },
    writes: () => writes, ensureRequests,
    confirmInsurers: () => { insurersReady = true; for (const cb of insurerListeners) cb('aseguradoras'); return host.innerHTML; },
    confirmPolicies: async () => {
      policiesReady = true;
      for (const cb of insurerListeners) cb('polizas');
      await new Promise(resolve => setTimeout(resolve, 85));
      return host.innerHTML;
    } };
}

test('E4 pending policies do not impersonate zero production or offer an incomplete export', async () => {
  const app = setup('CO', { deferPolicies: true });
  const pending = app.render();
  assert.match(pending, /data-report-source-readiness="loading"/);
  assert.match(pending, /Confirmando con el servidor las fuentes de Producción/);
  assert.doesNotMatch(pending, /0<\/b> registros|id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  assert.ok(app.ensureRequests.includes('polizas'));
  const confirmed = await app.confirmPolicies();
  assert.match(confirmed, /2026000098/);
  assert.match(confirmed, /id="rep-exp"/);
  assert.doesNotMatch(confirmed, /data-report-source-readiness/);
  assert.equal(app.writes(), 0);
});

test('E4 denied policy source never presents a commercial zero or export', () => {
  const app = setup('CO', { blockPolicies: true });
  const html = app.render();
  assert.match(html, /data-report-source-readiness="blocked"/);
  assert.doesNotMatch(html, /id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  assert.equal(app.writes(), 0);
});

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
  assert.doesNotMatch(html, /B2-REN-SOURCE/);
  assert.match(html, /data-report-country-quarantine="2"/);
  html = app.event('#rep-anio', '2026');
  assert.doesNotMatch(html, /GT-2026-LOOKALIKE/);
  assert.match(html, /GT-2026/);
});

test('Explicit B2 QA firme source is retained in the policy store but not counted as commercial production', () => {
  const app = setup('GT');
  const html = app.render();
  assert.doesNotMatch(html, /B2-REN-SOURCE/);
  assert.match(html, /data-report-qa-quarantine="4"/);
  assert.ok(app.Orbit.q.polizasScoped().some(p => p.numero === 'B2-REN-SOURCE'), 'QA source must remain available for audit');
  assert.equal(app.Orbit.q.isSyntheticQaRecord(rows.polizas.find(p => p.id === 'qaB2SourceGT')), true);
  assert.equal(app.Orbit.q.produccionMesPorMoneda('2026-10').GTQ || 0, 0, 'QA source leaked into GT October production');
  assert.equal(app.writes(), 0);
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
  assert.match(html, /data-report-qa-quarantine="4"/);
  assert.match(html, /4 registros sintéticos QA excluidos/);
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

test('Pólizas GT separates three source-proven QA policies from commercial KPIs and client-country gaps', () => {
  let writes = 0;
  const clients = [
    { id: 'gtCustomer', pais: 'GT', nombre: 'Cliente GT', moneda: 'GTQ' },
    { id: 'coCustomer', pais: 'CO', nombre: 'Cliente CO', moneda: 'COP' }
  ];
  const policies = [
    { id: 'realGT', numero: 'GT-REAL', clienteId: 'gtCustomer', pais: 'GT', moneda: 'GTQ', primaNeta: 100, primaTotal: 110, asesorId: 'adviser', estado: 'Vigente', vigenciaFin: '2027-12-01' },
    { id: 'crossClientGT', numero: 'GT-CROSS-REAL', clienteId: 'coCustomer', pais: 'GT', moneda: 'GTQ', primaNeta: 200, estado: 'Cancelada', vigenciaFin: '2027-12-01' },
    ...[1, 2, 3].map(i => ({ id: 'qa' + i, numero: 'B2-REN-' + i, clienteId: 'unlinked', pais: 'GT', moneda: 'GTQ', primaNeta: 1000, primaTotal: 1221,
      asesorId: 'adviser', estado: 'Vigente', vigenciaFin: '2027-10-01', sourceRef: 'B2 QA firme ' + i }))
  ];
  const table = { polizas: policies, clientes: clients, asesores: [{ id: 'adviser', nombre: 'Paula Osorio' }], aseguradoras: [], vehiculos: [] };
  const store = { all: k => table[k] || [], get: (k, id) => (table[k] || []).find(row => row.id === id) || null,
    _ensureCollections() {}, _productStatus: () => ({ serverConfirmedCollections: ['polizas', 'clientes', 'asesores'] }),
    insert() { writes++; throw Error('QA_LIST_WRITE'); }, remove() { writes++; throw Error('QA_LIST_DELETE'); } };
  const U = { esc: v => String(v ?? ''), finiteNumber: v => Number(v), money: (v, cur) => cur + ' ' + v,
    fmtDate: v => String(v || ''), daysFromNow: () => 365, avatar: v => String(v), estadoBadge: v => String(v) };
  const K = { bannerFor: () => '', filterBar: () => '', wireFilters() {},
    kpis: defs => defs.map(d => '<p>' + d.label + ':' + d.val + '</p>').join('') };
  const host = { innerHTML: '', isConnected: true };
  const Orbit = { ui: U, kit: K, store, pais: 'GT', modules: {}, clientProjection: { get: () => null },
    session: { rol: () => 'Dirección' }, auth: { user: () => ({ uid: 'paula', countries: ['GT'] }) },
    access: { activeRole: () => 'Dirección' } };
  const browserWindow = { Orbit, addEventListener() {} };
  const document = { addEventListener() {}, getElementById: id => id === 'host' ? host : null };
  const context = vm.createContext({ Orbit, window: browserWindow, document, location: { hash: '#/polizas' }, Map, Set, Date, console });
  vm.runInContext(queries, context, { filename: 'queries.js' });
  vm.runInContext(polizas, context, { filename: 'polizas.js' });
  Orbit.modules.polizas.render(host);
  assert.match(host.innerHTML, /data-polizas-total="5"/);
  assert.match(host.innerHTML, /data-polizas-commercial-total="2"/);
  assert.match(host.innerHTML, /data-polizas-qa-quarantine="3"/);
  assert.match(host.innerHTML, /data-polizas-active="1"/);
  assert.match(host.innerHTML, /data-polizas-client-country-gap="1"/);
  assert.doesNotMatch(host.innerHTML, /GTQ 3,000/);
  assert.match(host.innerHTML, /3 pólizas de prueba QA/);
  Orbit.modules.polizas.filtrarGrupo('qa');
  assert.match(host.innerHTML, /B2-REN-1/);
  assert.doesNotMatch(host.innerHTML, /GT-REAL/);
  Orbit.modules.polizas.filtrarGrupo('qa');
  Orbit.modules.polizas.filtrarGrupo('active');
  assert.match(host.innerHTML, /GT-REAL/);
  assert.doesNotMatch(host.innerHTML, /B2-REN-1/);
  assert.equal(writes, 0);
});

test('Cliente 360 Operativo uses only verified policy advisor labels without reading privileged Equipo', () => {
  let writes=0;
  const table={
    clientes:[{id:'clientCO',nombre:'Cliente Colombiano',tipo:'Persona',pais:'CO',moneda:'COP',asesorId:'advisorHistorico'}],
    polizas:[{id:'policyCO',numero:'CO-123',clienteId:'clientCO',pais:'CO',moneda:'COP',primaTotal:300,primaNeta:270,
      asesorId:'advisorHistorico',asesorNombreVerificado:'Johanna Salgado',estado:'Vigente'},
      {id:'qaB4',numero:'B4-003-QA',clienteId:'clientCO',pais:'CO',moneda:'COP',primaTotal:5000,primaNeta:4500,
        asesorId:'advisorHistorico',asesorNombreVerificado:'Johanna Salgado',estado:'Vigente',__syntheticQa:true}],
    asesores:[], carteraPrimas:[]
  };
  const store={__productReadOnlyP0:true,all:k=>table[k]||[],get:(k,id)=>(table[k]||[]).find(x=>x.id===id)||null,
    _productStatus:()=>({serverConfirmedCollections:['clientes','polizas','carteraPrimas'],deniedCollections:['asesores'],snapshotErrors:{}}),
    _ensureCollections(){},insert(){writes++;throw Error('NO_CLIENT_WRITE');},remove(){writes++;throw Error('NO_CLIENT_DELETE');}};
  const ui={esc:v=>String(v??''),text:(v,d)=>v||d,avatar:v=>'Avatar '+v,finiteNumber:v=>Number(v),
    money:(n,c)=>c+' '+n,moneyShort:(n,c)=>c+' '+n,daysFromNow:()=>365};
  const diagnostics={};
  const host={innerHTML:'',isConnected:true,querySelectorAll:()=>[],querySelector:()=>null};
  const Orbit={store,ui,kit:{bannerFor:()=>''},modules:{},pais:'CO',route:{params:{}},
    session:{rol:()=> 'Operativo'},clientProjection:{withReadBatch:fn=>fn?fn():null},
    q:{isSyntheticQaRecord:row=>!!row&&row.__syntheticQa===true}};
  const browserWindow={Orbit,OrbitRuntimeDiagnostics:diagnostics,addEventListener(){}};
  const document={addEventListener(){},getElementById:id=>id==='c360-client-name-case-style'?{}:null};
  const ctx=vm.createContext({Orbit,OrbitRuntimeDiagnostics:diagnostics,window:browserWindow,document,location:{hash:'#/cliente360'},Date,Map,Set,console,setTimeout,clearTimeout});
  vm.runInContext(cliente360,ctx,{filename:'cliente360.js'});
  Orbit.modules.cliente360.render(host);
  assert.match(host.innerHTML,/data-c360-list-ready="1"/);
  assert.match(host.innerHTML,/Johanna Salgado/);
  assert.match(host.innerHTML,/<option value="advisorHistorico"[^>]*>Johanna Salgado<\/option>/);
  assert.doesNotMatch(host.innerHTML, /Asesor sin coincidencia/);
  assert.match(host.innerHTML,/data-c360-kpi-active-count="1"/);
  assert.match(host.innerHTML,/data-c360-kpi-policy-count="1"/);
  assert.match(host.innerHTML,/COP 270/);
  assert.doesNotMatch(host.innerHTML,/COP 4,770/);
  assert.equal(writes,0);
});


test('E4 never renders literal undefined in Ramo; unknown source is explicitly pending', () => {
  const app=setup('GT');
  const html=app.render();
  assert.match(html,/Pendiente de clasificar/);
  assert.doesNotMatch(html,/>undefined</i);
});

test('E8 independently hydrates financial data, quarantines QA from workflows and repaints on confirmation', async () => {
  const calidad=source('orbit360-platform/modules/calidad.js');
  const table={
    clientes:[{id:'real',nombre:'Cliente real',pais:'GT',tipo:'Persona',asesorId:'ad'},
      {id:'qa',nombre:'B4-003 QA Cliente',pais:'GT',tipo:'Persona',asesorId:'ad',__syntheticQa:true,email:'qa@example.invalid'}],
    polizas:[{id:'realP',clienteId:'real',pais:'GT',estado:'Vigente'},
      {id:'qaP',clienteId:'qa',pais:'GT',estado:'Vigente',__syntheticQa:true}],
    asesores:[{id:'ad',nombre:'Paula'}]
  };
  let ready=false,writes=0,toast='';
  const ensure=[],subscriptions=[],financeIds=[];
  const store={__productReadOnlyP0:true,all:k=>table[k]||[],get:(k,id)=>(table[k]||[]).find(x=>x.id===id)||null,
    _productStatus:()=>({serverConfirmedCollections:ready?['polizas','recibosEsperados']:['polizas'],deniedCollections:[],snapshotErrors:{}}),
    _ensureCollections:collections=>ensure.push(...collections),
    on:(_key,cb)=>{subscriptions.push(cb);return()=>{const n=subscriptions.indexOf(cb);if(n>=0)subscriptions.splice(n,1);}},
    updateDurable(){writes++;throw Error('NO_QUALITY_WRITE');}
  };
  const Orbit={modules:{},pais:'GT',store,
    q:{isSyntheticQaRecord:row=>!!row&&row.__syntheticQa===true,polizasDe:cid=>table.polizas.filter(p=>p.clienteId===cid)},
    policyVehicleReadModelV1199c:{financialIntegrityBatch:pol=>{financeIds.push(pol.map(p=>p.id).join(','));return [];}},
    ui:{esc:v=>String(v??''),avatar:()=>'<span>avatar</span>',toast:message=>{toast=message;}},
    kit:{bannerFor:()=>'',kpis:defs=>defs.map(d=>'<div>'+d.label+': '+d.val+'</div>').join(''),asesorCell:()=>'<span>Paula</span>'},
    access:{dataScope:()=> 'all'}
  };
  const document={getElementById:()=>null};
  const location={hash:'#/calidad'};
  const context=vm.createContext({Orbit,window:{Orbit},document,location,Date,Map,Set,console,setTimeout,clearTimeout});
  vm.runInContext(calidad,context,{filename:'calidad.js'});
  const host={innerHTML:'',isConnected:true,querySelector:()=>null};
  Orbit.modules.calidad.render(host);
  assert.match(host.innerHTML,/data-quality-financial-readiness="PENDING"/);
  assert.match(host.innerHTML,/data-quality-qa-quarantine="1"/);
  assert.doesNotMatch(host.innerHTML,/B4-003 QA Cliente/);
  assert.match(host.innerHTML,/Expedientes incompletos: 1/);
  assert.ok(ensure.includes('recibosEsperados'));
  assert.ok(ensure.includes('polizas'));
  assert.equal(financeIds.length,0,'financial figures must not materialize before server confirmation');
  ready=true;
  for(const cb of [...subscriptions])cb('recibosEsperados');
  await new Promise(resolve=>setTimeout(resolve,130));
  assert.match(host.innerHTML,/data-quality-financial-readiness="READY_WITH_ZERO"/);
  assert.deepEqual(financeIds,['realP','realP']);
  Orbit.modules.calidad.campana();
  assert.match(toast,/1 sin canal/);
  assert.doesNotMatch(toast,/1 por correo preparado/);
  assert.equal(writes,0);
});


function selectCancellationReport(app) {
  const marker = 'return { render, quitarProg, verFila };';
  assert.ok(reportes.includes(marker), 'E4_REPORTES_SELECT_INSTRUMENT_MISSING');
  const instrument = reportes.replace(marker,
    "return { render, quitarProg, verFila, __qaSelect: key => { sel = key; } };");
  const loc = { hash: '#/reportes' };
  vm.runInNewContext(instrument,
    { Orbit: app.Orbit, window: { Orbit: app.Orbit }, location: loc, Date, Map, Set, console },
    { filename: 'reportes-e4-cancel-owner-bridge.js' });
  app.Orbit.modules.reportes.__qaSelect('cancelaciones');
  return loc;
}

test('E4 cancellation report shares the operational owner: projections, explicit dedup, GT/CO, QA and unknown-year', () => {
  const originalPolicies = rows.polizas.length;
  const originalCancelations = rows.cancelaciones.length;
  try {
    rows.polizas.push(
      { id: 'cancelProjectedGT', numero: 'POL-CAN-GT', clienteId: 'clientGT', aseguradoraId: 'insGT',
        pais: 'GT', moneda: 'GTQ', estado: 'Cancelada', fechaCancelacion: '2026-02-10', prima: 125 },
      { id: 'cancelProjectedCO', numero: 'POL-CAN-CO-UNDATED', clienteId: 'clientCO', aseguradoraId: 'insCO',
        pais: 'CO', moneda: 'COP', status: 'Anulada', primaNeta: 175 },
      { id: 'cancelExplicitPol', numero: 'POL-CAN-EXPLICIT', clienteId: 'clientGT', aseguradoraId: 'insGT',
        pais: 'GT', moneda: 'GTQ', estado: 'Cancelada', prima: 999 },
      { id: 'qaProjectedCO', numero: 'POL-CAN-QA', clienteId: 'clientQA', aseguradoraId: 'insCO',
        pais: 'CO', moneda: 'COP', estado: 'Cancelada', prima: 85000 },
      { id: 'cancelCountryConflict', numero: 'POL-CAN-INVALID-COUNTRY', clienteId: 'clientGT', aseguradoraId: 'insCO',
        pais: 'GT', moneda: 'GTQ', estado: 'Cancelada', fechaCancelacion: '2026-02-11', prima: 75000 }
    );
    rows.cancelaciones.push(
      { id: 'cancelExplicit', polizaId: 'cancelExplicitPol', clienteId: 'clientGT',
        pais: 'GT', moneda: 'GTQ', fecha: '2026-03-10', motivo: 'Baja solicitada', valorPerdido: 30 }
    );
    const app = setup('GT');
    const loc = selectCancellationReport(app);
    const owner = app.Orbit.modules.cancelaciones;
    assert.equal(owner.effectiveRows().filter(c => c.polizaId === 'cancelExplicitPol').length, 1,
      'An explicit cancellation must supersede the policy-state projection');
    let html = app.render();
    assert.match(html, /POL-CAN-GT/);
    assert.match(html, /POL-CAN-EXPLICIT/);
    assert.equal((html.match(/POL-CAN-EXPLICIT/g) || []).length, 1, 'Duplicate policy cancellation');
    assert.doesNotMatch(html, /POL-CAN-CO-UNDATED|POL-CAN-QA|POL-CAN-INVALID-COUNTRY/);
    assert.match(html, /data-report-country-quarantine="1"/);
    assert.match(html, /GTQ 125/);
    app.Orbit.modules.reportes.verFila('can_pol_cancelProjectedGT');
    assert.equal(loc.hash, '#/cliente360?c=clientGT', 'Projected report row must link to its real client');
    html = app.event('#rep-anio', '2026');
    assert.match(html, /POL-CAN-GT/);
    assert.match(html, /POL-CAN-EXPLICIT/, 'A dated explicit cancellation remains in 2026');
    // Read both country slices without inventing a cancellation date.
    app.Orbit.pais = 'CO';
    html = app.event('#rep-anio', '');
    assert.match(html, /POL-CAN-CO-UNDATED/);
    assert.doesNotMatch(html, /POL-CAN-GT|POL-CAN-QA|POL-CAN-INVALID-COUNTRY/);
    assert.match(html, /data-report-qa-quarantine="2"/,
      'Both explicit QA and projected QA-inherited cancellations must be quarantined');
    html = app.event('#rep-anio', '2026');
    assert.doesNotMatch(html, /POL-CAN-CO-UNDATED/, 'Unknown cancellation dates must not be imputed');
    assert.match(html, /data-report-unknown-period="1"/);
    assert.equal(app.writes(), 0);
  } finally {
    rows.polizas.splice(originalPolicies);
    rows.cancelaciones.splice(originalCancelations);
  }
});

test('E4 cancellation report fails closed without the canonical cancellation owner', () => {
  const app = setup('GT');
  selectCancellationReport(app);
  delete app.Orbit.modules.cancelaciones;
  const html = app.render();
  assert.match(html, /data-report-cancel-owner-readiness="blocked"/);
  assert.doesNotMatch(html, /id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  assert.doesNotMatch(html, /Sin datos/);
  assert.equal(app.writes(), 0);
});

test('E4 Cartera includes projected receipts and SIGA source evidence without claiming a paid receipt or leaking QA', () => {
  const initialReceipts=rows.recibosEsperados.length,initialPortfolio=rows.carteraPrimas.length,initialPolicies=rows.polizas.length;
  try {
    rows.polizas.push({ id:'verifiedFinancialCO',numero:'CO-VERIFIED-2026',clienteId:'clientCO',aseguradoraId:'insCO',pais:'CO',moneda:'COP',estado:'Vigente' });
    rows.recibosEsperados.push(
      { id: 'coProjectedReceipt', polizaId: 'verifiedFinancialCO', clienteId: 'clientCO', pais: 'CO',
        moneda: 'COP', cuota: 2, primaTotal: 375, fechaLimite: '2026-08-11', estadoOperativo: 'pendiente_vencido' },
      { id: 'coSigaReceipt', polizaId: 'verifiedFinancialCO', clienteId: 'clientCO', pais: 'CO',
        moneda: 'COP', cuota: 3, primaTotal: 415, fechaLimite: '2026-09-12',
        estado: 'Pendiente', estadoOperativo: 'pago_reportado', paymentOrigin: 'siga',
        paymentState: 'SOURCE_PENDING_CONFIRMATION' },
      { id: 'coQaReceipt', polizaId: 'qaCO', clienteId: 'clientCO', pais: 'CO',
        moneda: 'COP', cuota: 8, primaTotal: 90000, fechaLimite: '2026-08-11',
        estadoOperativo: 'pendiente_vencido', __syntheticQa: true }
    );
    rows.carteraPrimas.push(
      { id: 'portfolioOpenCO', reciboId: 'coProjectedReceipt', polizaId: 'verifiedFinancialCO',
        clienteId: 'clientCO', pais: 'CO', moneda: 'COP', carteraActiva: true, fechaLimite: '2026-08-11' },
      { id: 'portfolioQaCO', reciboId: 'coQaReceipt', polizaId: 'qaCO',
        clienteId: 'clientCO', pais: 'CO', moneda: 'COP', carteraActiva: true, fechaLimite: '2026-08-11',
        __syntheticQa: true }
    );
    const app=setup('CO');
    // Test the actual Cobros owner, not a duplicate projection in the report.
    app.Orbit.q.portfolioClassification = row => ({
      open: true, overdue: true, unknownDate: false, dueDate: row.fechaLimite
    });
    const marker='return { render, quitarProg, verFila };';
    assert.ok(reportes.includes(marker), 'E4 instrument contract changed');
    const instrument=reportes.replace(marker,
      "return { render, quitarProg, verFila, __qaSelect: key => { sel = key; } };");
    const loc={ hash:'#/reportes' };
    vm.runInNewContext(instrument, { Orbit:app.Orbit, window:{Orbit:app.Orbit},
      location:loc,Date,Map,Set,console },{filename:'reportes-e4-financial-bridge.js'});
    app.Orbit.modules.reportes.__qaSelect('cartera');
    let html=app.render();
    assert.match(html,/CO-VERIFIED-2026 · Cuota 2/,'Open premium portfolio must appear in E4');
    assert.match(html,/CO-VERIFIED-2026 · Cuota 3/,'SIGA source evidence must appear in E4');
    assert.match(html,/Registro de origen SIGA · pago pendiente de confirmación/,
      'SIGA pending origin must not impersonate payment applied');
    assert.doesNotMatch(html,/Pago confirmado según fuente SIGA/);
    assert.doesNotMatch(html,/Cuota 8/,'QA portfolio receipts must remain quarantined');
    assert.match(html,/data-report-qa-quarantine=/);
    assert.match(html,/id="rep-exp"/);
    const projected=app.Orbit.modules.cobros.reportableRows();
    assert.equal(projected.filter(row=>row.id==='portfolio:coProjectedReceipt').length,1);
    assert.equal(projected.filter(row=>row.id==='receipt-payment:coSigaReceipt').length,1);
    const siga=projected.find(row=>row.id==='receipt-payment:coSigaReceipt');
    assert.notEqual(siga.estado,'Pagado');
    assert.equal(siga.paymentState,'SOURCE_PENDING_CONFIRMATION');
    app.Orbit.modules.reportes.verFila('portfolio:coProjectedReceipt');
    assert.equal(loc.hash,'#/cliente360?c=clientCO','Projected row links to real client');
    app.Orbit.pais='GT';
    html=app.render();
    assert.doesNotMatch(html,/CO-VERIFIED-2026 · Cuota 2|CO-VERIFIED-2026 · Cuota 3/,
      'Country-scope change must not retain Colombian projection');
    assert.equal(app.writes(),0,'Read-only integration must not mutate the financial store');
  } finally {
    rows.recibosEsperados.splice(initialReceipts);
    rows.carteraPrimas.splice(initialPortfolio);
    rows.polizas.splice(initialPolicies);
  }
});

test('E4 financial report fails closed when projected sources or owner are unavailable', () => {
  const app=setup('CO');
  const marker='return { render, quitarProg, verFila };';
  const instrument=reportes.replace(marker,
    "return { render, quitarProg, verFila, __qaSelect: key => { sel = key; } };");
  vm.runInNewContext(instrument,{Orbit:app.Orbit,window:{Orbit:app.Orbit},
    location:{hash:'#/reportes'},Date,Map,Set,console},
    {filename:'reportes-e4-financial-guard.js'});
  app.Orbit.modules.reportes.__qaSelect('cartera');
  const status=app.Orbit.store._productStatus;
  app.Orbit.store._productStatus=()=>({
    ...status(),
    serverConfirmedCollections:status().serverConfirmedCollections.filter(name=>name!=='carteraPrimas')
  });
  let html=app.render();
  assert.match(html,/data-report-source-readiness="loading"/);
  assert.doesNotMatch(html,/id="rep-exp"|id="rep-excel"|id="rep-pdf"/);
  app.Orbit.store._productStatus=status;
  delete app.Orbit.modules.cobros;
  html=app.render();
  assert.match(html,/data-report-financial-owner-readiness="blocked"/);
  assert.doesNotMatch(html,/id="rep-exp"|id="rep-excel"|id="rep-pdf"|Sin datos/);
  assert.equal(app.writes(),0);
});

test('E4 PDF export includes every row beyond 500 and escapes untrusted cells', () => {
  const extraPolicies = Array.from({ length: 525 }, (_, i) => ({
    id: 'e4pdf-' + i,
    numero: i === 524 ? 'GT-PDF-<script>alert("x")</script>' : 'GT-PDF-' + i,
    clienteId: 'clientGT', aseguradoraId: 'insGT', pais: 'GT', moneda: 'GTQ',
    vigenciaInicio: '2026-06-01', primaNeta: 5, estado: 'Vigente'
  }));
  const app = setup('GT', { extraPolicies, capturePdf: true });
  const html = app.render();
  assert.match(html, /Mostrando 200 de/);
  const pdf = app.click('#rep-pdf');
  const match = /Registros incluidos: (\d+)/.exec(pdf);
  assert.ok(match, 'PDF must declare its complete row count');
  const expected = Number(match[1]);
  assert.ok(expected > 500, 'fixture must exceed the old 500-row cap');
  assert.equal((pdf.match(/<tr>/g) || []).length, expected + 1, 'all report rows plus one header');
  assert.match(pdf, /GT-PDF-&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(pdf, /<script>/);
  assert.equal(app.writes(), 0);
});
