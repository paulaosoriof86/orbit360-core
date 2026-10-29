'use strict';
// I6.5/B4-003 — execute the real Queries + Insights owners against synthetic
// fixtures. No network, Firebase, authentication, production data or writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const queriesSource = fs.readFileSync(path.join(root, 'orbit360-platform/core/queries.js'), 'utf8');
const insightsSource = fs.readFileSync(path.join(root, 'orbit360-platform/modules/insights.js'), 'utf8');
const asOf = '2026-10-29';
const financialCollections = ['clientes', 'polizas', 'carteraPrimas', 'recibosEsperados', 'cobros'];
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  return {
    clientes: [
      { id: 'cliGT', pais: 'GT', moneda: 'GTQ', asesorId: 'a', nombre: 'Cliente sintético GT' },
      { id: 'cliCO', pais: 'CO', moneda: 'COP', asesorId: 'b', nombre: 'Cliente sintético CO' }
    ],
    polizas: [
      { id: 'polGT', clienteId: 'cliGT', pais: 'GT', moneda: 'GTQ', asesorId: 'a', estado: 'Vigente', prima: 0, primaNeta: 0, ramo: 'Auto', numero: 'QA-GT' },
      { id: 'polCO', clienteId: 'cliCO', pais: 'CO', moneda: 'COP', asesorId: 'b', estado: 'Vigente', prima: 0, primaNeta: 0, ramo: 'Auto', numero: 'QA-CO' },
      { id: 'polCross', clienteId: 'cliGT', pais: 'CO', moneda: 'COP', asesorId: 'a', estado: 'Vigente', prima: 0, primaNeta: 0, ramo: 'Auto', numero: 'QA-CROSS' }
    ],
    recibosEsperados: [
      { id: 'recGT', polizaId: 'polGT', clienteId: 'cliGT', pais: 'GT', moneda: 'GTQ', secuencia: '2/12', primaTotal: 683, fechaLimite: '2026-10-28', estado: 'Pendiente', estadoOperativo: 'pendiente_vencido' }
    ],
    carteraPrimas: [
      { id: 'carGT', reciboId: 'recGT', polizaId: 'polGT', clienteId: 'cliGT', pais: 'GT', moneda: 'GTQ', fechaLimite: '2026-10-28', estado: 'Pendiente', estadoOperativo: 'pendiente_vencido', carteraActiva: true },
      { id: 'carGTfuture', polizaId: 'polGT', clienteId: 'cliGT', pais: 'GT', moneda: 'GTQ', monto: 50, secuencia: '3/12', fechaLimite: '2026-10-30', estado: 'Pendiente', carteraActiva: true },
      { id: 'carCO', polizaId: 'polCO', clienteId: 'cliCO', pais: 'CO', moneda: 'COP', monto: 100000, secuencia: '1/6', fechaLimite: '2026-09-15', estado: 'Pendiente', carteraActiva: true },
      { id: 'carCOfuture', polizaId: 'polCO', clienteId: 'cliCO', pais: 'CO', moneda: 'COP', monto: 20000, secuencia: '2/6', fechaLimite: '2026-10-30', estado: 'Pendiente', carteraActiva: true },
      { id: 'carCross', polizaId: 'polCross', clienteId: 'cliGT', pais: 'CO', moneda: 'COP', monto: 25000, secuencia: '1/1', fechaLimite: '2026-10-01', estado: 'Pendiente', carteraActiva: true }
    ],
    cobros: [], comisiones: [], cancelaciones: [], negocios: [], metas: [], vehiculos: [],
    aseguradoras: [], asesores: [{ id: 'a', nombre: 'Asesor A' }, { id: 'b', nombre: 'Asesor B' }]
  };
}

function harness({ country = 'TODOS', data = fixture(), scope = 'all', confirmed = financialCollections, denied = [], errors = {}, product = true } = {}) {
  const marker = 'return { render, cliente, sugerirMeta,';
  assert.ok(insightsSource.includes(marker), 'INSIGHTS_NATIVE_EXPORT_MARKER_MISSING');
  for (const name of ['financialSnapshot', 'financialRowsTable', 'financeSums', 'financeRateRows']) {
    assert.match(insightsSource, new RegExp('function\\s+' + name + '\\s*\\('), 'INSIGHTS_NATIVE_HELPER_MISSING_' + name);
  }
  const calls = { writes: 0, norm: 0, scopes: 0, collections: [] };
  const role = { scope };
  const status = { serverConfirmedCollections: [...confirmed], deniedCollections: [...denied], snapshotErrors: { ...errors } };
  const forbiddenWrite = () => { calls.writes += 1; throw new Error('NO_WRITE_ON_FINANCIAL_READ'); };
  const store = {
    __productReadOnlyP0: product,
    all: collection => data[collection] || [],
    get: (collection, id) => (data[collection] || []).find(row => String(row.id) === String(id)) || null,
    where: (collection, predicate) => (data[collection] || []).filter(predicate),
    find: (collection, predicate) => (data[collection] || []).find(predicate) || null,
    _productStatus: () => status,
    _ensureCollections: names => { calls.collections.push(...names); },
    on: () => () => {},
    insert: forbiddenWrite, update: forbiddenWrite, remove: forbiddenWrite,
    insertDurable: forbiddenWrite, updateDurable: forbiddenWrite, removeDurable: forbiddenWrite,
    setPref: forbiddenWrite
  };
  const U = {
    NOW: asOf + 'T12:00:00Z',
    finiteNumber: value => value == null || String(value).trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null,
    daysFromNow: value => !value ? null : Math.round((Date.parse(String(value).slice(0, 10) + 'T00:00:00Z') - Date.parse(asOf + 'T00:00:00Z')) / 86400000),
    esc: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    money: (value, currency) => currency + ' ' + value,
    moneyShort: (value, currency) => currency + ' ' + value,
    fmtDate: value => value || '—',
    estadoBadge: value => '<span>' + value + '</span>',
    avatar: () => '', today: () => asOf, text: value => String(value || '')
  };
  const Orbit = {
    store, ui: U, modules: {}, pais: country,
    route: { key: 'insights', params: {} },
    PAISES: [{ id: 'TODOS', label: 'Todos' }, { id: 'GT', label: 'Guatemala' }, { id: 'CO', label: 'Colombia' }],
    kit: { bannerFor: (_route, controls) => controls || '', clienteCell: id => id, asesorOptions: () => [] },
    ciclo: { negocios: () => [] },
    session: { rol: () => role.scope === 'all' ? 'Dirección' : 'Asesor', asesorId: () => 'a' }
  };
  const advisorOf = (collection, row) => {
    if (collection === 'asesores') return row.id;
    const policy = (data.polizas || []).find(p => p.id === row.polizaId);
    const client = (data.clientes || []).find(c => c.id === (row.clienteId || (policy && policy.clienteId)));
    return row.asesorId || (policy && policy.asesorId) || (client && client.asesorId) || '';
  };
  const canView = (collection, row) => role.scope === 'all' || (role.scope === 'own' && advisorOf(collection, row) === 'a');
  const scopedStore = moduleKey => {
    assert.equal(moduleKey, 'insights', 'FINANCIAL_READ_MUST_USE_ITS_OWN_MODULE_SCOPE');
    const facade = Object.create(store);
    facade._scopedFor = moduleKey;
    facade.all = collection => store.all(collection).filter(row => canView(collection, row));
    facade.get = (collection, id) => facade.all(collection).find(row => String(row.id) === String(id)) || null;
    facade.where = (collection, predicate) => facade.all(collection).filter(predicate);
    facade.find = (collection, predicate) => facade.all(collection).find(predicate) || null;
    return facade;
  };
  Orbit.access = {
    canView,
    filter: (collection, rows, moduleKey) => {
      assert.equal(moduleKey, 'insights');
      return rows.filter(row => canView(collection, row));
    },
    scopedStore,
    withScope(moduleKey, fn) {
      calls.scopes += 1;
      const previous = Orbit.store;
      Orbit.store = scopedStore(moduleKey);
      try { return fn(Orbit.store, previous); } finally { Orbit.store = previous; }
    }
  };
  const document = {
    getElementById: () => null,
    body: { contains: () => true, appendChild() {} },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}
  };
  const sandbox = { window: { Orbit }, Orbit, document, location: { hash: '', hostname: 'localhost' }, console, Date, Map, Set, Number, String, Array, setTimeout() {}, clearTimeout() {}, CustomEvent: function (name) { this.type = name; } };
  const context = vm.createContext(sandbox);
  vm.runInContext(queriesSource, context, { filename: 'queries.js' });
  const originalNorm = Orbit.q.norm;
  Orbit.q.norm = (...args) => { calls.norm += 1; return originalNorm(...args); };
  const injected = insightsSource.replace(marker,
    'return { render, cliente, sugerirMeta, __qaFinancial: { financialSnapshot, financialRowsTable, financeSums, financeRateRows, vResumen, vCartera, vCritico, setAsesor(value) { asesorSel = value; }, setVista(value) { vista = value; }, kpis() { return kpiStore; } },');
  vm.runInContext(injected, context, { filename: 'insights.js' });
  const host = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  return { Orbit, data, calls, role, status, host, qa: Orbit.modules.insights.__qaFinancial };
}

const ids = rows => Array.from(rows, row => row.row && row.row.id || row.id).sort();
const findRow = (snapshot, id) => [...snapshot.pending, ...snapshot.overdue, ...snapshot.confirmed].find(row => (row.row && row.row.id || row.id) === id);
const sumRows = (h, rows) => plain(h.qa.financeSums(rows));
const payment = (id, polizaId, clienteId, pais, moneda, monto, extra = {}) => ({ id, polizaId, clienteId, pais, moneda, monto, estado: 'Pagado', fechaPago: '2026-10-25', ...extra });

test('GT debt comes from canonical portfolio even without any raw Cobros', () => {
  const h = harness({ country: 'GT' }), s = h.qa.financialSnapshot();
  assert.equal(s.readiness, 'ready');
  assert.deepEqual(ids(s.overdue), ['carGT']);
  assert.deepEqual(ids(s.pending), ['carGTfuture']);
  assert.deepEqual(ids(s.confirmed), []);
  assert.deepEqual(sumRows(h, s.overdue), { GTQ: 683 });
  assert.deepEqual(sumRows(h, s.pending), { GTQ: 50 });
});

test('CO keeps policy country even when its client domicile is GT', () => {
  const h = harness({ country: 'CO' }), s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.overdue), ['carCO', 'carCross']);
  assert.deepEqual(ids(s.pending), ['carCOfuture']);
  assert.deepEqual(sumRows(h, s.overdue), { COP: 125000 });
});

test('TODOS is the disjoint union of GT and CO financial rows', () => {
  const h = harness(), all = h.qa.financialSnapshot();
  h.Orbit.pais = 'GT'; const gt = h.qa.financialSnapshot();
  h.Orbit.pais = 'CO'; const co = h.qa.financialSnapshot();
  for (const key of ['pending', 'overdue', 'confirmed']) {
    assert.deepEqual(ids(all[key]), [...ids(gt[key]), ...ids(co[key])].sort());
  }
  assert.deepEqual(sumRows(h, all.overdue), { GTQ: 683, COP: 125000 });
});

test('financial helpers never normalize COP/GTQ and aggregate source currencies separately', () => {
  const h = harness(), s = h.qa.financialSnapshot();
  h.qa.financeSums(s.pending.concat(s.overdue));
  h.qa.financeRateRows(s);
  h.qa.financialRowsTable(s.overdue);
  assert.equal(h.calls.norm, 0, 'NO_FX_NORMALIZATION_IN_FINANCIAL_READ_MODEL');
});

test('recovery rates are per currency with each exact denominator', () => {
  const data = fixture();
  data.cobros.push(payment('payGT', 'polGT', 'cliGT', 'GT', 'GTQ', 317), payment('payCO', 'polCO', 'cliCO', 'CO', 'COP', 75000));
  const h = harness({ data }), s = h.qa.financialSnapshot();
  const rates = Array.from(h.qa.financeRateRows(s));
  assert.deepEqual(rates.map(row => row.moneda).sort(), ['COP', 'GTQ']);
  const gt = rates.find(row => row.moneda === 'GTQ'), co = rates.find(row => row.moneda === 'COP');
  assert.equal(gt.confirmed, 317); assert.equal(gt.pending, 50); assert.equal(gt.overdue, 683);
  assert.equal(co.confirmed, 75000); assert.equal(co.pending, 20000); assert.equal(co.overdue, 125000);
  assert.ok(Math.abs(gt.rate - 100 * 317 / 1050) <= 0.51, 'GT_RATE_IS_CURRENCY_LOCAL');
  assert.ok(Math.abs(co.rate - 100 * 75000 / 220000) <= 0.51, 'CO_RATE_IS_CURRENCY_LOCAL');
});

test('exact receipt join supplies verified amount, cuota and contractual date', () => {
  const h = harness({ country: 'GT' }), row = findRow(h.qa.financialSnapshot(), 'carGT');
  assert.equal(row.kind, 'portfolio'); assert.equal(row.monto, 683); assert.equal(row.moneda, 'GTQ');
  assert.equal(row.cuota, '2/12'); assert.equal(row.vence, '2026-10-28'); assert.equal(row.daysOverdue, 1);
  assert.equal(row.clienteId, 'cliGT'); assert.equal(row.polizaId, 'polGT');
});

test('explicit portfolio zero is preserved rather than replaced with a receipt amount', () => {
  const data = fixture(); data.carteraPrimas[0].monto = 0;
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot();
  assert.equal(findRow(s, 'carGT').monto, 0);
  assert.deepEqual(sumRows(h, s.overdue), { GTQ: 0 });
});

test('unverified amount stays an obligation with null value and explicit no-source text', () => {
  const data = fixture(); data.recibosEsperados = [];
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot();
  assert.equal(s.overdue.length, 1); assert.equal(findRow(s, 'carGT').monto, null);
  assert.match(h.qa.financialRowsTable(s.overdue), /Sin monto fuente/);
  const rate = Array.from(h.qa.financeRateRows(s)).find(row => row.moneda === 'GTQ');
  assert.equal(rate.rate, null); assert.ok(rate.missing >= 1);
});

test('currency conflict is flagged and cannot enter monetary sums', () => {
  const data = fixture(); data.carteraPrimas[0].monto = 683; data.carteraPrimas[0].moneda = 'COP';
  const h = harness({ data, country: 'GT' }), row = findRow(h.qa.financialSnapshot(), 'carGT');
  assert.equal(row.moneda, 'SIN_MONEDA');
  assert.deepEqual(sumRows(h, [row]), {});
  assert.match(h.qa.financialRowsTable([row]), /Moneda por validar/);
});

test('full proof context is retained before local advisor filtering', () => {
  const data = fixture();
  data.carteraPrimas[0].asesorId = 'a';
  data.carteraPrimas.push({ ...data.carteraPrimas[0], id: 'duplicateOffFilter', asesorId: 'b' });
  const h = harness({ data, country: 'GT' }); h.qa.setAsesor('a');
  const s = h.qa.financialSnapshot();
  assert.equal(findRow(s, 'duplicateOffFilter'), undefined);
  assert.equal(findRow(s, 'carGT').monto, null, 'FILTER_MUST_NOT_HIDE_DUPLICATE_RECEIPT_PROOF');
});

test('local advisor filter uses the parent when child adviser is absent', () => {
  const h = harness(); h.qa.setAsesor('a');
  const a = h.qa.financialSnapshot();
  assert.deepEqual(ids(a.overdue), ['carCross', 'carGT']);
  h.qa.setAsesor('b'); const b = h.qa.financialSnapshot();
  assert.deepEqual(ids(b.overdue), ['carCO']);
  assert.deepEqual(ids(b.pending), ['carCOfuture']);
});

test('role scope is enforced without relying on the initial router render', () => {
  const h = harness({ scope: 'own' }), own = h.qa.financialSnapshot();
  assert.deepEqual(ids(own.overdue), ['carCross', 'carGT']);
  h.role.scope = 'none'; const denied = h.qa.financialSnapshot();
  assert.deepEqual(ids(denied.overdue), []); assert.deepEqual(ids(denied.pending), []);
  h.role.scope = 'all'; assert.equal(h.qa.financialSnapshot().overdue.length, 3);
  assert.ok(h.calls.scopes >= 3, 'EACH_REFRESH_REENTERS_THE_CANONICAL_ACCESS_SCOPE');
});

test('missing parent, conflicting child country and conflicting parent client are excluded', () => {
  const data = fixture(), base = data.carteraPrimas[2];
  data.carteraPrimas.push(
    { ...base, id: 'orphan', polizaId: 'missing' },
    { ...base, id: 'forgedCountry', pais: 'GT' },
    { ...base, id: 'forgedClient', clienteId: 'cliGT' }
  );
  const h = harness({ data }), s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.overdue), ['carCO', 'carCross', 'carGT']);
});

test('archived and paid obligations are not debt but expired-policy explicit debt survives', () => {
  const data = fixture();
  data.carteraPrimas[0].monto = 683; data.polizas[0].estado = 'Vencida';
  data.carteraPrimas.push({ ...data.carteraPrimas[0], id: 'archived', carteraActiva: false }, { ...data.carteraPrimas[0], id: 'paid', estado: 'Pagado' });
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.overdue), ['carGT']); assert.equal(findRow(s, 'carGT').monto, 683);
});

test('calendar boundary keeps today pending and yesterday overdue without extra grace', () => {
  const data = fixture();
  data.carteraPrimas.push({ ...data.carteraPrimas[1], id: 'dueToday', fechaLimite: asOf });
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.overdue), ['carGT']);
  assert.ok(ids(s.pending).includes('dueToday'));
  assert.equal(findRow(s, 'dueToday').daysOverdue, 0);
});

test('unknown due date is explicit and never fabricated as overdue', () => {
  const data = fixture(); data.carteraPrimas[1].fechaLimite = 'not-a-date';
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot(), row = findRow(s, 'carGTfuture');
  assert.ok(ids(s.pending).includes('carGTfuture')); assert.ok(!ids(s.overdue).includes('carGTfuture'));
  assert.equal(row.vence, ''); assert.equal(row.daysOverdue, 0); assert.match(row.estado, /validaci[oó]n/i);
});

test('only confirmed payments count; reported and inferred statuses are excluded', () => {
  const data = fixture();
  data.cobros.push(
    payment('paid', 'polGT', 'cliGT', 'GT', 'GTQ', 25),
    payment('reported', 'polGT', 'cliGT', 'GT', 'GTQ', 90, { paymentState: 'PAID_REPORTED' }),
    payment('inferred', 'polGT', 'cliGT', 'GT', 'GTQ', 70, { paymentState: 'PAID_INFERRED' }),
    payment('foreignParent', 'polCO', 'cliCO', 'GT', 'COP', 70),
    payment('orphanPayment', 'missing', 'cliGT', 'GT', 'GTQ', 20)
  );
  const h = harness({ data, country: 'GT' }), s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.confirmed), ['paid']); assert.deepEqual(sumRows(h, s.confirmed), { GTQ: 25 });
  assert.equal(s.confirmed[0].kind, 'payment');
});

test('receipt-backed direct payment is projected once and not duplicated by its Cobros link', () => {
  const data = fixture();
  data.recibosEsperados.push({ id: 'paidReceipt', polizaId: 'polCO', clienteId: 'cliCO', pais: 'CO', moneda: 'COP', primaTotal: 400, paymentState: 'PAID_DIRECT', estado: 'Pagado', fechaPago: '2026-10-28' });
  const h = harness({ data, country: 'CO' });
  assert.equal(h.qa.financialSnapshot().confirmed.length, 1);
  data.cobros.push(payment('actualPayment', 'polCO', 'cliCO', 'CO', 'COP', 400, { reciboId: 'paidReceipt' }));
  const s = h.qa.financialSnapshot();
  assert.deepEqual(ids(s.confirmed), ['actualPayment']); assert.deepEqual(sumRows(h, s.confirmed), { COP: 400 });
});

test('receipt-backed confirmed payment preserves a source-currency conflict instead of relabeling it', () => {
  const data = fixture();
  data.recibosEsperados.push({ id: 'paidReceiptCurrencyConflict', polizaId: 'polCO', clienteId: 'cliCO', pais: 'CO', moneda: 'GTQ', primaTotal: 400, paymentState: 'PAID_DIRECT', estado: 'Pagado', fechaPago: '2026-10-28' });
  const h = harness({ data, country: 'CO' }), s = h.qa.financialSnapshot();
  assert.equal(s.confirmed.length, 1);
  assert.equal(s.confirmed[0].row.currencyValidation, 'REQUIERE_VALIDACION', 'CANONICAL_OWNER_PRESERVES_THE_SOURCE_CONFLICT');
  assert.equal(s.confirmed[0].moneda, 'SIN_MONEDA');
  assert.deepEqual(sumRows(h, s.confirmed), {});
  assert.match(h.qa.financialRowsTable(s.confirmed), /Moneda por validar/);
});

test('cuota recovers the exact linked receipt serie when cuota and secuencia are absent', () => {
  const data = fixture(); delete data.recibosEsperados[0].secuencia; data.recibosEsperados[0].serie = '03/06';
  const h = harness({ data, country: 'GT' }), row = findRow(h.qa.financialSnapshot(), 'carGT');
  assert.equal(row.cuota, '03/06');
  assert.match(h.qa.financialRowsTable([row]), /03\/06/);
});

test('portfolio drill-through uses Cliente360 receipts, not a nonexistent Cobros record', () => {
  const h = harness({ country: 'GT' }), html = h.qa.financialRowsTable(h.qa.financialSnapshot().overdue);
  assert.match(html, /#\/cliente360\?c=cliGT(?:&amp;|&)t=recibos/);
  assert.doesNotMatch(html, /cobros\.detalle/); assert.doesNotMatch(html, /undefined|NaN/);
  assert.match(html, /2\/12/); assert.match(html, /683/); assert.match(html, /2026-10-28/);
});

for (const blocked of [
  { name: 'pending', confirmed: ['clientes', 'polizas'], denied: [], errors: {} },
  { name: 'unavailable denied', confirmed: financialCollections, denied: ['carteraPrimas'], errors: {} },
  { name: 'unavailable failed', confirmed: ['clientes', 'polizas'], denied: [], errors: { recibosEsperados: 'DEADLINE_EXCEEDED' } }
]) {
  test('financial hydration ' + blocked.name + ' never certifies empty data as zero', () => {
    const h = harness(blocked), s = h.qa.financialSnapshot();
    assert.equal(s.readiness, blocked.name.startsWith('unavailable') ? 'unavailable' : 'pending');
    for (const key of ['pending', 'overdue', 'confirmed']) assert.equal(s[key].length, 0);
    for (const view of ['vResumen', 'vCartera']) {
      const html = h.qa[view]();
      assert.doesNotMatch(html, /GTQ 683|COP 125000|GTQ 733|COP 145000/);
      const financialCards = Array.from(h.qa.kpis()).filter(k => /recaudad|por cobrar|vencid|pendiente/i.test(k.label));
      assert.ok(financialCards.length > 0, view + '_FINANCIAL_CARDS_MUST_STAY_VISIBLE');
      for (const card of financialCards) {
        assert.doesNotMatch(String(card.val), /^(?:GTQ|COP)\s+0(?:\.0+)?$/);
        assert.ok(!card.detail, view + '_BLOCKED_FINANCIAL_DRAWER_DISABLED');
      }
    }
  });
}

test('a completed empty authoritative snapshot may show zero without being pending', () => {
  const data = fixture(); data.carteraPrimas = []; data.recibosEsperados = [];
  const h = harness({ data }), s = h.qa.financialSnapshot();
  assert.equal(s.readiness, 'ready'); assert.equal(s.overdue.length + s.pending.length + s.confirmed.length, 0);
  assert.deepEqual(sumRows(h, s.overdue), {});
});

test('financial views and refreshes are read-only and leave source fixtures unchanged', () => {
  const h = harness(), before = JSON.stringify(h.data);
  for (const view of ['resumen', 'cartera', 'critico']) {
    h.qa.setVista(view); h.Orbit.modules.insights.render(h.host);
    assert.ok(h.host.innerHTML.length > 100, view + '_MUST_RENDER');
    assert.doesNotMatch(h.host.innerHTML, /undefined|NaN/);
  }
  assert.equal(h.calls.writes, 0); assert.equal(JSON.stringify(h.data), before);
});
