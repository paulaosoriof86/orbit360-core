'use strict';
// A14: exercise the real Cobros renderer, queries, calendar, adapter and scope
// owner with synthetic, tenant-bounded source rows. No browser or service I/O.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');

const root = process.env.GI_I66_COBROS_QA_REPO_ROOT || path.resolve(__dirname, '..');
const modulePath = 'orbit360-platform/modules/cobros.js';
const baselineBlob = 'f410e0f0f23c399a0d9f574fa9d1279801d3542c';
const baseline = execFileSync('git', ['show', baselineBlob], {cwd: root, encoding: 'utf8'});
const candidate = fs.readFileSync(path.resolve(__dirname, '..', modulePath), 'utf8');
const clone = value => structuredClone(value);
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function syntheticRows(count = 1200) {
  const rows = {clientes: [], polizas: [], recibosEsperados: [], carteraPrimas: [],
    cobros: [], asesores: [], vehiculos: [], comisiones: [], aseguradoras: []};
  for (const tenantId of ['tenant-one', 'tenant-two']) {
    for (const advisor of ['advisor-own', 'advisor-other'])
      rows.asesores.push({id: advisor, tenantId, nombre: advisor, pais: 'GT', countries: ['GT', 'CO']});
    for (let n = 0; n < count; n++) {
      const id = tenantId + '-' + n, advisor = n % 2 ? 'advisor-other' : 'advisor-own';
      const country = n % 3 ? 'GT' : 'CO', currency = country === 'CO' ? 'COP' : (n % 5 ? 'GTQ' : 'USD');
      const common = {tenantId, pais: country, moneda: currency, asesorId: advisor};
      const client = {...common, id: 'client-' + id, nombre: 'Cliente sintético ' + id};
      const policy = {...common, id: 'policy-' + id, clienteId: client.id, numero: 'P-' + id, estado: 'Vigente'};
      const receipt = {...common, id: 'receipt-' + id, clienteId: client.id, polizaId: policy.id,
        cuota: '1/12', monto: country === 'CO' ? 1001 + n : 278.26 + n,
        fechaLimite: n % 2 ? '2026-12-01' : '2026-11-01', estado: 'Pendiente', estadoOperativo: 'pendiente'};
      const portfolio = {...receipt, id: 'portfolio-' + id, reciboId: receipt.id, carteraActiva: true};
      rows.clientes.push(client); rows.polizas.push(policy);
      rows.recibosEsperados.push(receipt); rows.carteraPrimas.push(portfolio);
      rows.vehiculos.push({...common, id: 'vehicle-' + id, polizaId: policy.id, placa: 'PLACA-' + id});
    }
  }
  // Boundary rows live in the visible tenant, beyond the normal list page.
  const base = rows.recibosEsperados.find(r => r.id === 'receipt-tenant-one-1');
  function extra(key, receiptPatch, portfolioPatch = {}) {
    const receipt = {...base, id: key, ...receiptPatch};
    rows.recibosEsperados.push(receipt);
    rows.carteraPrimas.push({...base, id: 'portfolio-' + key, reciboId: key, carteraActiva: true, ...portfolioPatch});
    return receipt;
  }
  extra('paid-without-cobro', {estado: 'Pagado', paymentState: 'PAID_CONFIRMED', fechaPago: '2026-11-10'});
  extra('advisor-reported', {evidenceType: 'ADVISOR_REPORTED_PAYMENT', estadoOperativo: 'pago_reportado_asesor', paymentState: 'PAID_REPORTED'});
  extra('unknown-due', {fechaLimite: ''}, {fechaLimite: ''});
  extra('conflicting-child-country', {pais: 'CO'});
  extra('inactive-portfolio', {}, {carteraActiva: false});
  extra('paid-with-cobro', {estado: 'Pagado', paymentState: 'PAID_DIRECT'});
  rows.cobros.push({...base, id: 'cash-linked', reciboId: 'paid-with-cobro', estado: 'Pagado', paymentState: 'PAID_DIRECT', conciliado: true});
  // Missing expected receipt keeps the existing portfolio-only fallback.
  rows.carteraPrimas.push({...base, id: 'portfolio-missing-receipt', reciboId: 'missing-receipt', carteraActiva: true});
  return rows;
}

function harness(source, count = 1200) {
  const data = syntheticRows(count), counts = {all: {}, get: {}, writes: 0};
  const state = {tenantId: 'tenant-one', uid: 'user-one', role: 'Operativo', advisorId: 'advisor-own',
    countries: ['GT', 'CO'], financialReady: true, denied: []};
  let filters, onFilter;
  const events = new Map();
  const host = {innerHTML: '', querySelectorAll(selector) {
    if (selector !== '[data-cobros-state-value]') return [];
    return ['', 'Vencido', 'Pendiente', 'Pagado', 'Reportado por asesor', 'Requiere validación'].map(value => ({
      getAttribute: () => value, addEventListener(name, handler) {if (name === 'click') events.set(value, handler);}
    }));
  }};
  function available(collection) {
    if (state.denied.includes(collection)) return [];
    if (!state.financialReady && ['recibosEsperados', 'carteraPrimas'].includes(collection)) return [];
    // These are the already server-bounded rows; the real access facade below
    // still applies module/active-role/own/team/country read permissions.
    return (data[collection] || []).filter(r => r.tenantId === state.tenantId &&
      (collection === 'asesores' || state.countries.includes(r.pais)));
  }
  const noWrite = () => {counts.writes++; throw Error('NO_BUSINESS_WRITES_IN_RENDER_QA');};
  const store = {
    all(collection) {counts.all[collection] = (counts.all[collection] || 0) + 1; return clone(available(collection));},
    get(collection, id) {counts.get[collection] = (counts.get[collection] || 0) + 1;
      const row = available(collection).find(r => (r.id || r.uid || r.codigo || r.numero || r.key) === id);
      return row ? clone(row) : null;},
    where(collection, predicate) {return this.all(collection).filter(predicate);},
    find(collection, predicate) {return this.all(collection).find(predicate) || null;},
    insert: noWrite, update: noWrite, remove: noWrite,
    __productReadOnlyP0: true, _protectedCandidate: true, _ensureCollections() {},
    _productStatus() {return {ready: true, status: 'ready-read-only', noFallback: true, writeEnabled: false,
      serverConfirmedCollections: Object.keys(data).filter(name =>
      !state.denied.includes(name) && (state.financialReady || !['recibosEsperados', 'carteraPrimas'].includes(name))),
      deniedCollections: state.denied.slice(), snapshotErrors: {}};}
  };
  const Orbit = {store, modules: {}, pais: 'TODOS', route: {params: {}},
    tenant: {demoDate: '2026-11-23', get: () => ({tenantId: state.tenantId, domainConfig: {access: {
      roleScopes: {'Operativo': 'all', 'Dirección': 'all', 'Asesor': 'own'}}}})},
    auth: {get productUser() {return {uid: state.uid, tenantId: state.tenantId,
      countries: state.countries, productReadOnly: true, roles: ['Operativo', 'Dirección', 'Asesor'],
      activeRole: state.role};}, user() {return this.productUser;}},
    session: {rol: () => state.role, asesorId: () => state.advisorId,
      rolesAsignados: () => ['Operativo', 'Dirección', 'Asesor'], canSee: () => true},
    kit: {asesorOptions: () => [], bannerFor: () => '',
      kpis: cards => JSON.stringify(cards), filterBar: (_defs, values) => values.__count,
      wireFilters: (_defs, values, handler) => {filters = values; onFilter = handler;},
      clienteCell: id => String((Orbit.store.get('clientes', id) || {}).nombre || '—')}
  };
  const document = {getElementById: id => id === 'host' ? host : null,
    addEventListener() {}, querySelectorAll: () => []};
  const window = {Orbit, addEventListener() {}};
  const location = {hostname: 'app.aysseguros.com'};
  const context = vm.createContext({window, Orbit, document, location,
    console, Date, Map, Set, structuredClone, setTimeout: fn => {fn(); return 1;}, clearTimeout() {}});
  for (const relative of ['orbit360-platform/core/ui.js', 'orbit360-platform/core/queries.js', 'orbit360-platform/core/access-scope.js'])
    vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, {filename: relative});
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext(fs.readFileSync(path.join(root, 'orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js'), 'utf8'), context);
  const scoped = fn => Orbit.access.withScope('cobros', fn);
  return {data, counts, state, Orbit, host, location,
    installOperationalFacade() {
      Orbit.productRuntimeBrowserProvidersP0 = {browserFirestoreWriteAuthorized: false,
        serverWriteTransport: 'firebase-functions', noFallback: true,
        initialize: async () => ({auth: {currentUser: {uid: state.uid}}}), callFunction: noWrite};
      vm.runInContext(fs.readFileSync(path.join(root, 'orbit360-platform/data/store-firestore-product-operational-p0.js'), 'utf8'), context);
      Orbit.productOperationalWriteP0.install(store);
    },
    render(reuse = false) {scoped(() => Orbit.modules.cobros.render(host, reuse)); return host.innerHTML;},
    report() {return scoped(() => JSON.parse(JSON.stringify(Orbit.modules.cobros.reportableRows())));},
    filter(value) {scoped(() => events.get(value)({preventDefault() {}, stopPropagation() {}})); return host.innerHTML;},
    search(value) {filters.fq = value; scoped(() => onFilter('fq', false)); return host.innerHTML;},
    nextPage() {scoped(() => Orbit.modules.cobros.pagina(1)); return host.innerHTML;},
    resetCounts() {counts.all = {}; counts.get = {};},
    select(fn) {fn(state, Orbit, data);}
  };
}

function pair(count = 90) {return [harness(baseline, count), harness(candidate, count)];}
function parity(fixture, action) {
  const before = fixture.map(x => digest(x.data));
  const outputs = fixture.map(action);
  assert.deepEqual(outputs[1], outputs[0], 'render/report must preserve the prior observable result');
  assert.deepEqual(fixture.map(x => digest(x.data)), before, 'render must not mutate source rows');
  for (const x of fixture) assert.equal(x.counts.writes, 0);
  return outputs[1];
}

test('A14 causal N+1: identical financial HTML with bounded receipt lookups', () => {
  const fixture = pair(1200);
  parity(fixture, x => x.render());
  const [before, after] = fixture.map(x => clone(x.counts));
  const gets = counts => Object.values(counts.get).reduce((a, b) => a + b, 0);
  console.log('A14_COBROS_VISIBLE_READS', JSON.stringify({baselineBlob, sourceRowsPerTenant: 1200,
    baseline: before, candidate: after, baselineGetCalls: gets(before), candidateGetCalls: gets(after), writes: 0}));
  assert.ok(before.get.recibosEsperados >= 1200, 'pinned source must reproduce per-portfolio receipt reads');
  assert.equal(after.get.recibosEsperados || 0, 0, 'one visible snapshot must replace the per-row receipt getter');
  assert.ok(gets(after) < gets(before) * 0.65, 'real access-owner work must fall with the removed N+1');
  assert.ok(after.all.cobros < before.all.cobros, 'reuse source rows without re-reading the same collection');
  parity(fixture, x => x.nextPage());
  parity(fixture, x => x.report());
});

test('snapshot is rebuilt after payment, receipt amount/date and deletion; source objects remain isolated', () => {
  const fixture = pair();
  parity(fixture, x => x.render());
  fixture.forEach(x => {
    const row = x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-1');
    row.estado = 'Pagado'; row.paymentState = 'PAID_DIRECT'; row.fechaPago = '2026-11-23';
    const changed = x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-2');
    changed.primaTotal = 913.47; changed.fechaLimite = '2026-12-24';
    x.data.carteraPrimas.find(r => r.reciboId === changed.id).fechaLimite = '2026-12-24';
    x.data.recibosEsperados = x.data.recibosEsperados.filter(r => r.id !== 'receipt-tenant-one-4');
  });
  const report = parity(fixture, x => {x.render(); return x.report();});
  assert.equal(report.some(r => r.id === 'portfolio:receipt-tenant-one-1'), false);
  assert.ok(report.some(r => r.receiptId === 'receipt-tenant-one-1' && r.__paidReceiptEvidence));
  assert.equal(report.find(r => r.id === 'portfolio:receipt-tenant-one-2').monto, 913.47);
  assert.equal(report.find(r => r.id === 'portfolio:receipt-tenant-one-2').vence, '2026-12-24');
  assert.ok(report.some(r => r.id === 'portfolio:receipt-tenant-one-4'), 'existing missing-receipt fallback preserved');
  // A filter may reuse only the aggregate base. It must not reuse receipt data.
  fixture.forEach(x => {x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-6').estado = 'Pagado';});
  parity(fixture, x => x.filter('Pagado'));
});

test('role, identity, tenant, country and denied-source switches cannot retain a prior receipt snapshot', () => {
  const fixture = pair();
  parity(fixture, x => x.render());
  fixture.forEach(x => {x.state.role = 'Asesor'; x.state.uid = 'advisor-user';});
  let report = parity(fixture, x => {x.render(true); return x.report();});
  assert.ok(report.length > 0);
  assert.ok(report.every(r => r.asesorId === 'advisor-own'));
  fixture.forEach(x => {x.state.tenantId = 'tenant-two'; x.state.uid = 'tenant-two-user';});
  report = parity(fixture, x => {x.render(true); return x.report();});
  assert.ok(report.every(r => r.polizaId.includes('tenant-two')));
  fixture.forEach(x => {x.Orbit.pais = 'CO';});
  report = parity(fixture, x => {x.render(true); return x.report();});
  assert.ok(report.every(r => r.pais === 'CO'));
  fixture.forEach(x => {x.state.denied = ['recibosEsperados'];});
  parity(fixture, x => x.render());
  assert.equal(parity(fixture, x => x.report()), null);
});

test('core-only hydration and advisor mode preserve readiness and mutation boundaries', () => {
  const fixture = pair();
  fixture.forEach(x => {x.state.financialReady = false;});
  const html = parity(fixture, x => x.render());
  assert.match(html, /data-cobros-financial-readiness="pending"/);
  for (const x of fixture) assert.equal(x.counts.all.recibosEsperados || 0, 0);
  fixture.forEach(x => {x.state.financialReady = true; x.Orbit.pais = 'GT'; x.state.role = 'Asesor';});
  const ownHtml = parity(fixture, x => x.render());
  assert.match(ownHtml, /data-cobros-action="report"/);
  assert.doesNotMatch(ownHtml, /data-cobros-action="apply"/);
});

test('filters, calendar, source currencies, missing/contradictory receipts and report universe stay identical', () => {
  const fixture = pair();
  parity(fixture, x => x.render());
  for (const filter of ['Vencido', 'Pendiente', 'Pagado', 'Reportado por asesor', 'Requiere validación', ''])
    parity(fixture, x => x.filter(filter));
  const report = parity(fixture, x => x.report());
  assert.equal(report.some(r => r.id === 'portfolio:paid-without-cobro'), false);
  assert.equal(report.some(r => r.id === 'portfolio:paid-with-cobro'), false);
  assert.equal(report.some(r => r.id === 'portfolio:inactive-portfolio'), false);
  assert.equal(report.some(r => r.id === 'portfolio:conflicting-child-country'), false);
  assert.equal(report.find(r => r.id === 'portfolio:unknown-due').estado, 'Requiere validación');
  assert.ok(report.some(r => r.id === 'portfolio:missing-receipt'));
  assert.deepEqual([...new Set(report.map(r => r.moneda))].sort(), ['COP', 'GTQ', 'USD']);
  parity(fixture, x => x.search('P-tenant-one-2'));
  // Reportes is independent of the screen-local search and page.
  assert.deepEqual(parity(fixture, x => x.report()), report);
});

test('receipt index preserves exact ID types and first match without guessing alternate links', () => {
  const fixture = pair();
  fixture.forEach(x => {
    const base = x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-1');
    // The existing getter returns the first exact record, never a last-wins
    // overwrite or the numeric ID when the reference is the string "7".
    x.data.recibosEsperados.push({...base, id: base.id, primaTotal: 999999});
    x.data.recibosEsperados.push({...base, id: 7, primaTotal: 777777});
    x.data.carteraPrimas.push({...base, id: 'numeric-reference', reciboId: '7', carteraActiva: true, primaTotal: 321.45});
  });
  const report = parity(fixture, x => {x.render(); return x.report();});
  assert.equal(report.find(r => r.id === 'portfolio:receipt-tenant-one-1').monto, 279.26);
  assert.equal(report.find(r => r.id === 'portfolio:7').monto, 321.45);
});

test('preview real rows remain read-only and the explicit synthetic QA surface is unchanged', () => {
  const fixture = pair();
  fixture.forEach(x => {x.location.hostname = 'preview--a14.web.app';});
  const readonly = parity(fixture, x => x.render());
  assert.match(readonly, /data-preview-readonly-row=/);
  assert.doesNotMatch(readonly, /data-cobros-action="apply"/);
  fixture.forEach(x => {
    const receipt = {...x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-1'),
      id: 'b3004human_a14_read_qa', __syntheticHumanQa: true, __syntheticGate: 'B3-004-R12', __syntheticQa: true};
    x.data.recibosEsperados.push(receipt);
    x.Orbit.route.params.qaReceipt = receipt.id;
  });
  const qa = parity(fixture, x => x.render());
  assert.match(qa, /data-b3004-human-qa-mode="1"/);
  assert.match(qa, /data-portfolio-receipt="b3004human_a14_read_qa"/);
  assert.match(qa, /data-cobros-action="apply"/);
  assert.equal((qa.match(/<tr class="clickable"/g) || []).length, 1);
});

test('real operational facade keeps its trimmed-reference getter contract and a paid receipt never becomes debt', () => {
  const fixture = pair();
  fixture.forEach(x => {
    x.installOperationalFacade();
    x.data.carteraPrimas.find(r => r.reciboId === 'receipt-tenant-one-2').reciboId = '  receipt-tenant-one-2  ';
    x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-2').primaTotal = 913.47;
    assert.equal(x.Orbit.store.get('recibosEsperados', '  receipt-tenant-one-2  ').primaTotal, 913.47);
  });
  const report = parity(fixture, x => {x.render(); return x.report();});
  assert.equal(report.find(r => r.id === 'portfolio:  receipt-tenant-one-2  ').monto, 913.47);
  fixture.forEach(x => {
    const receipt = x.data.recibosEsperados.find(r => r.id === 'receipt-tenant-one-2');
    receipt.estado = 'Pagado'; receipt.paymentState = 'PAID_CONFIRMED';
  });
  const paid = parity(fixture, x => {x.render(); return x.report();});
  assert.equal(paid.some(r => r.id === 'portfolio:  receipt-tenant-one-2  '), false);
});
