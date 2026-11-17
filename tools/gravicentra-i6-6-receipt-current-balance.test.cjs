'use strict';
// I6.6 current-balance source regression. No browser, credentials, Firebase,
// network or business writes. All fixtures below are invented.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.GI_BALANCE_REPO_ROOT || path.resolve(__dirname, '..');
const owner = process.env.GI_BALANCE_BRIDGE_SOURCE || path.join(root, 'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js');
const queries = path.join(root, 'orbit360-platform/core/queries.js');
const copy = value => JSON.parse(JSON.stringify(value));

function harness(options = {}) {
  const opt = {mode: 'open', nominal: 125.5, receiptAmount: 125.5, explicitAmount: 125.5,
    currency: 'GTQ', portfolioPresent: true, receiptDue: '2026-11-01', portfolioDue: '2026-11-01', ...options};
  const applied = ['direct', 'inferred'].includes(opt.mode);
  const paymentState = opt.mode === 'inferred' ? 'PAID_INFERRED' : opt.mode === 'reported' ? 'PAID_REPORTED' : 'PAID_DIRECT';
  const receipt = {id: 'fixture-receipt', polizaId: 'fixture-policy', clienteId: 'fixture-client',
    pais: 'GT', moneda: opt.currency, serie: '1/1', primaTotal: opt.receiptAmount,
    fechaLimite: opt.receiptDue, vence: opt.receiptDue, estado: applied ? 'Pagado' : 'Pendiente',
    estadoOperativo: opt.mode === 'inferred' ? 'pago_inferido' : opt.mode === 'reported' ? 'pago_reportado' : applied ? 'pagado' : 'pendiente_vencido',
    ...(applied ? {paymentState, directOrInferred: opt.mode === 'inferred' ? 'INFERRED' : 'DIRECT',
      conciliadoPago: true, applicationState: opt.reconciled ? 'APPLIED_DIRECT' : 'PENDING_APPLICATION',
      conciliado: !!opt.reconciled} : opt.mode === 'reported' ? {paymentState, paymentOrigin: 'CLIENT_PORTAL'} : {})};
  const portfolio = {id: 'fixture-portfolio', clienteId: 'fixture-client', polizaId: 'fixture-policy',
    reciboId: 'fixture-receipt', moneda: opt.currency, pais: 'GT', carteraActiva: !opt.inactive,
    fechaLimite: opt.portfolioDue, primaTotal: opt.nominal,
    ...(opt.explicitAmount == null ? {} : {monto: opt.explicitAmount}),
    ...(opt.saldo == null ? {} : {saldo: opt.saldo}),
    estado: applied ? 'Pagado' : opt.closedWithoutPayment ? 'Cerrado' : 'Pendiente',
    estadoOperativo: 'pendiente_vencido', ...(applied ? {estadoCartera: 'Pagado', conciliadoPago: true} : {}),
    ...(opt.portfolioReconciled ? {saldoConciliado: true} : {})};
  const payment = {id: 'fixture-payment', reciboId: receipt.id, polizaId: receipt.polizaId,
    clienteId: receipt.clienteId, pais: 'GT', moneda: opt.currency, monto: opt.receiptAmount,
    estado: 'Pagado', paymentState, directOrInferred: opt.mode === 'inferred' ? 'INFERRED' : 'DIRECT',
    applicationState: opt.reconciled ? 'APPLIED_DIRECT' : 'PENDING_APPLICATION', conciliado: !!opt.reconciled};
  const data = {clientes: [{id: 'fixture-client', pais: 'GT', moneda: opt.currency}],
    polizas: [{id: 'fixture-policy', clienteId: 'fixture-client', pais: 'GT', moneda: opt.currency,
      estado: 'Vigente', cuotas: 1, vigenciaInicio: '2026-01-01', vigenciaFin: '2027-01-01'}],
    recibosEsperados: [receipt], carteraPrimas: opt.portfolioPresent ? [portfolio] : [],
    cobros: applied ? [payment] : [], vehiculos: [], comisiones: []};
  if (opt.extraCurrency) {
    data.polizas.push({...data.polizas[0], id: 'fixture-policy-usd', moneda: 'USD'});
    data.recibosEsperados.push({...receipt, id: 'fixture-receipt-usd', polizaId: 'fixture-policy-usd', moneda: 'USD', primaTotal: 50});
    data.carteraPrimas.push({...portfolio, id: 'fixture-portfolio-usd', polizaId: 'fixture-policy-usd', reciboId: 'fixture-receipt-usd', moneda: 'USD', primaTotal: 50, monto: 40});
  }
  let writes = 0;
  const refuseWrite = () => { writes++; throw new Error('NO_WRITE_AUTHORITY_IN_SOURCE_ONLY_TEST'); };
  const store = {__productReadOnlyP0: true,
    _productStatus: () => ({tenantId: 'fixture-tenant', serverConfirmedCollections: Object.keys(data)}),
    all: key => data[key] || [], get: (key, id) => (data[key] || []).find(row => row.id === id) || null,
    where: (key, predicate) => (data[key] || []).filter(predicate),
    find: (key, predicate) => (data[key] || []).find(predicate) || null,
    insert: refuseWrite, update: refuseWrite, remove: refuseWrite, batchDurable: refuseWrite};
  const host = {id: 'c360-body', innerHTML: '', querySelectorAll: () => [], querySelector: () => null, removeAttribute() {}, setAttribute() {}};
  const document = {getElementById: id => id === 'c360-body' ? host : id === 'rp-responsive-receipt-layout' ? {} : null,
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    createElement: () => ({style: {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => null, setAttribute() {}, addEventListener() {}}),
    head: {appendChild() {}}};
  const ui = {finiteNumber: value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null,
    today: () => '2026-11-17', daysFromNow: value => Math.round((Date.parse(value + 'T00:00:00Z') - Date.parse('2026-11-17T00:00:00Z')) / 86400000),
    fmtDate: value => String(value), esc: value => String(value ?? ''), money: (value, currency) => currency + ' ' + Number(value).toFixed(2)};
  const Orbit = {store, ui, pais: 'GT', modules: {}, route: {params: {}}, session: {rol: () => 'Dirección'},
    tenantCanonicalPathsP0: {dataCollectionPath: (tenant, collection) => 'tenants/' + tenant + '/data/' + collection + '/items'}};
  const context = vm.createContext({Orbit, document, console, Date, Map, Set, Number, String, Array, Math,
    history: {replaceState() {}}, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}, addEventListener() {}});
  context.window = context;
  vm.runInContext(fs.readFileSync(queries, 'utf8'), context, {filename: queries});
  const canonicalProof = Orbit.q.portfolioAmountProof;
  let proofCalls = 0;
  if (opt.missingProofOwner) delete Orbit.q.portfolioAmountProof;
  else Orbit.q.portfolioAmountProof = (row, index) => { proofCalls++; return canonicalProof(row, index); };
  const original = JSON.stringify(data);
  vm.runInContext(fs.readFileSync(owner, 'utf8'), context, {filename: owner});
  const bridge = Orbit.receiptsPortfolioProjection;
  assert.equal(bridge.renderReceiptDetail(receipt.id, receipt.clienteId), true);
  const detailHtml = host.innerHTML;
  const detailMatch = /data-rp-current-balance="([^"]+)"[^>]*>Saldo pendiente: <span[^>]*>([^<]+)<\/span>/.exec(detailHtml);
  const client = Orbit.q.clienteResumen('fixture-client');
  const global = Orbit.q.carteraGlobalPorMoneda();
  const aging = Orbit.q.agingVencidoPorMoneda();
  const native = bridge.portfolioSummary('fixture-client');
  const label = bridge.stateLabel(receipt, data.cobros[0]).t;
  bridge.renderReceipts('fixture-client');
  const listHtml = host.innerHTML;
  assert.equal(writes, 0, 'never writes any record');
  assert.equal(JSON.stringify(data), original, 'all nominal premiums, states, receipt and payment records are preserved');
  return {detailHtml, listHtml, detail: detailMatch && {state: detailMatch[1], text: detailMatch[2]},
    client: copy(client), global: copy(global), aging: copy(aging), native: copy(native),
    label, proofCalls, writes, receipt: copy(receipt), portfolio: copy(portfolio)};
}

test('confirmed direct payment is zero debt in detail, native summary, client, global and aging', () => {
  const h = harness({mode: 'direct'});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.equal(h.label, 'Pago confirmado');
  assert.equal(h.client.cobrado, 125.5); assert.equal(h.client.vencido, 0);
  assert.equal(h.native.active.length, 0); assert.equal(h.native.dueAmount, 0);
  assert.equal(h.global.byCurrency.GTQ.alDia, 125.5); assert.equal(h.global.byCurrency.GTQ.venc, 0);
  assert.deepEqual(h.aging.byCurrency, {});
  assert.equal(h.receipt.primaTotal, 125.5);
  assert.match(h.detailHtml, /El pago está confirmado/);
  assert.doesNotMatch(h.detailHtml, /En cartera:/);
});

test('inferred payment remains inferred, does not become confirmed cash, and has zero open debt', () => {
  const h = harness({mode: 'inferred'});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.equal(h.label, 'Pago inferido');
  assert.equal(h.client.cobrado, 0); assert.equal(h.client.vencido, 0);
  assert.equal(h.global.confirmedCount, 0); assert.equal(h.native.active.length, 0);
  assert.match(h.detailHtml, /fecha real de pago no informada/);
});

test('a reported but unapplied payment remains an open obligation', () => {
  const h = harness({mode: 'reported'});
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 125.50'});
  assert.equal(h.client.cobrado, 0); assert.equal(h.client.vencido, 125.5);
  assert.equal(h.native.active.length, 1);
  assert.match(h.label, /reportado/);
});

test('open obligation stays payable and delegates its amount to canonical proof', () => {
  const h = harness();
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 125.50'});
  assert.equal(h.client.vencido, 125.5); assert.equal(h.native.dueAmount, 125.5);
  assert.ok(h.proofCalls > 0);
});

test('partial explicit balance wins over the original nominal premium throughout presentation', () => {
  const h = harness({nominal: 200, receiptAmount: 200, explicitAmount: 80});
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 80.00'});
  assert.equal(h.client.vencido, 80); assert.equal(h.native.dueAmount, 80);
  assert.equal(h.global.byCurrency.GTQ.venc, 80);
  assert.equal(h.aging.byCurrency.GTQ['1-30'], 80);
  assert.match(h.detailHtml, /Prima total.*?Q 200\.00/);
  assert.equal(h.receipt.primaTotal, 200);
});

test('explicit zero is never replaced by a positive nominal amount and does not claim payment', () => {
  const h = harness({nominal: 200, receiptAmount: 200, explicitAmount: 0});
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 0.00'});
  assert.equal(h.native.dueAmount, 0); assert.equal(h.client.vencido, 0);
  assert.notEqual(h.label, 'Pago confirmado'); assert.equal(h.client.cobrado, 0);
  assert.equal(h.receipt.primaTotal, 200);
});

test('explicit saldo alias zero is preserved when monto is absent', () => {
  const h = harness({nominal: 200, receiptAmount: 200, explicitAmount: null, saldo: 0});
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 0.00'});
  assert.equal(h.native.dueAmount, 0); assert.equal(h.client.vencido, 0);
});

test('paid record with all retained portfolio amounts zero cannot fall through to receipt total', () => {
  const h = harness({mode: 'direct', nominal: 0, explicitAmount: 0, receiptAmount: 125.5});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.equal(h.receipt.primaTotal, 125.5);
});

test('absent linked portfolio is unknown rather than invented debt or an asserted zero', () => {
  const h = harness({portfolioPresent: false});
  assert.deepEqual(h.detail, {state: 'unverified', text: 'Importe por verificar'});
  assert.equal(h.native.active.length, 0);
});

test('unverified nominal balance cannot masquerade as proof when contractual due dates conflict', () => {
  const h = harness({explicitAmount: null, nominal: 200, receiptAmount: 200, portfolioDue: '2026-11-02'});
  assert.deepEqual(h.detail, {state: 'unverified', text: 'Importe por verificar'});
  assert.deepEqual(h.native.dueByCurrency, {});
  assert.match(h.listHtml, /Sin importe acreditado/);
});

test('unique verified contractual fallback is reused from the canonical owner, not duplicated', () => {
  const h = harness({explicitAmount: null, nominal: 200, receiptAmount: 200});
  assert.deepEqual(h.detail, {state: 'open', text: 'Q 200.00'});
  assert.equal(h.native.dueAmount, 200); assert.equal(h.client.vencido, 200);
  assert.ok(h.proofCalls > 0);
});

test('missing canonical amount-proof owner fails closed without the original-total fallback', () => {
  const h = harness({missingProofOwner: true});
  assert.deepEqual(h.detail, {state: 'unverified', text: 'Importe por verificar'});
  assert.deepEqual(h.native.dueByCurrency, {});
});

test('closed inactive obligation has no debt and does not claim a confirmed payment', () => {
  const h = harness({inactive: true, closedWithoutPayment: true});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.notEqual(h.label, 'Pago confirmado'); assert.equal(h.client.cobrado, 0);
  assert.equal(h.native.active.length, 0);
});

test('direct payment note cannot claim pending insurer debt after portfolio reconciliation', () => {
  const h = harness({mode: 'direct', portfolioReconciled: true});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.match(h.detailHtml, /El pago está confirmado/);
  assert.doesNotMatch(h.detailHtml, /El saldo pendiente fue conciliado/);
});

test('reconciled direct payment retains its existing reconciliation note', () => {
  const h = harness({mode: 'direct', reconciled: true});
  assert.deepEqual(h.detail, {state: 'closed', text: 'Q 0.00'});
  assert.match(h.detailHtml, /Este pago confirmado ya fue conciliado/);
});

test('USD explicit amounts retain USD and do not fall back to national currency', () => {
  const h = harness({currency: 'USD', nominal: 200, receiptAmount: 200, explicitAmount: 80});
  assert.deepEqual(h.detail, {state: 'open', text: 'US$ 80.00'});
  assert.equal(h.native.dueByCurrency.USD, 80);
  assert.equal(h.global.byCurrency.USD.venc, 80);
});

test('mixed-currency native portfolio preserves separate buckets and never produces a scalar conversion', () => {
  const h = harness({nominal: 200, receiptAmount: 200, explicitAmount: 80, extraCurrency: true});
  assert.deepEqual(h.native.dueByCurrency, {GTQ: 80, USD: 40});
  assert.equal(h.native.dueAmount, null);
  assert.equal(h.global.byCurrency.GTQ.venc, 80);
  assert.equal(h.global.byCurrency.USD.venc, 40);
});

test('receipts table still shows nominal premium while the portfolio KPI shows current balance', () => {
  const h = harness({nominal: 200, receiptAmount: 200, explicitAmount: 80});
  assert.match(h.listHtml, /data-rp-currency="GTQ">Q 80\.00 GTQ/);
  assert.match(h.listHtml, /<td class="num"><div data-rp-currency="GTQ">Q 200\.00 GTQ/);
});
