'use strict';
// Real receipt editor; only local synthetic rows and controlled transport failures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const owner = path.join(root, 'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js');
const copy = value => JSON.parse(JSON.stringify(value));
const operationId = 'recedit_mif0x123_a1b2c';
function attrs(text) {
  const values = {};
  for (const m of text.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) values[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return values;
}
class Element {
  constructor(tag, document, attributes = {}) {
    this.tagName = tag.toUpperCase(); this.document = document; this.attrs = attributes;
    this.style = {}; this.listeners = new Map(); this.nodes = []; this.children = [];
    this.value = attributes.value || ''; this.id = attributes.id || ''; this.textContent = ''; this.disabled = false;
  }
  set innerHTML(value) {
    this.html = String(value); this.nodes = [];
    for (const m of this.html.matchAll(/<(input|textarea|button|div)\b([^>]*)>/g)) {
      const attributes = attrs(m[2]);
      if (Object.keys(attributes).some(k => k.startsWith('data-'))) this.nodes.push(new Element(m[1], this.document, attributes));
    }
  }
  get innerHTML() { return this.html || ''; }
  querySelectorAll(selector) {
    const m = String(selector).match(/^\[([:\w-]+)\]$/);
    return m ? this.nodes.filter(node => Object.hasOwn(node.attrs, m[1])) : [];
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(event, fn) { if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(fn); }
  async fire(event) { for (const fn of this.listeners.get(event) || []) await fn({target: this}); }
  appendChild(node) { this.children.push(node); if (node.id) this.document.ids.set(node.id, node); return node; }
  remove() { if (this.id) this.document.ids.delete(this.id); }
}
function harness(response, engineError) {
  const row = {id: 'synthetic_receipt', tenantId: 'synthetic_tenant', clienteId: 'synthetic_client', polizaId: 'synthetic_policy', asesorId: 'synthetic_advisor', pais: 'GT', moneda: 'GTQ', fechaLimite: '2026-11-07', estado: 'Pendiente', montoTotal: 123.45, cuota: 4, numeroReciboFuente: 'OLD-REFERENCE'};
  const rows = {recibosEsperados: [row], polizas: [{id: 'synthetic_policy', clienteId: 'synthetic_client', pais: 'GT', estado: 'Vigente'}], clientes: [{id: 'synthetic_client', pais: 'GT'}], carteraPrimas: [], cobros: [], actividades: [], vehiculos: []};
  const writes = [], toasts = [], document = {ids: new Map(), createElement(tag) { return new Element(tag, this); }, getElementById(id) { return this.ids.get(id) || null; }, querySelector() { return null; }, addEventListener() {}};
  document.head = new Element('head', document); document.body = new Element('body', document);
  const store = {get: (c, id) => (rows[c] || []).find(r => r.id === id) || null, all: c => rows[c] || [], where: (c, fn) => (rows[c] || []).filter(fn), async batchDurable(mutations, options) { writes.push(copy({mutations, options})); const error = Error(engineError); error.code = engineError; throw error; }};
  const Orbit = {store, q: {portfolioDue: r => r.fechaLimite}, modules: {}, ui: {toast: message => toasts.push(message), today: () => '2026-11-16'}, access: {norm: value => String(value || '').toLowerCase(), activeRole: () => 'Dirección', tenantId: () => 'synthetic_tenant', actorAdvisor: () => ({}), actorUser: () => ({id: 'synthetic_actor'}), canView: () => true}, policyReceipts: {async updateReceipt(id, patch, options) { writes.push(copy({id, patch, options})); return response; }}};
  const context = vm.createContext({Orbit, document, location: {hash: '', search: ''}, console, URLSearchParams, Date, Math, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}, addEventListener() {}}); context.window = context;
  if (engineError) vm.runInContext(fs.readFileSync(path.join(root, 'orbit360-platform/core/policy-receipts-engine.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(owner, 'utf8'), context);
  assert.equal(Orbit.receiptsPortfolioProjection.editReceipt(row.id, row.clienteId), true);
  const form = document.getElementById('rp-edit-receipt'), field = name => form.querySelector('[data-rp-' + name + ']');
  const save = async () => { field('source-receipt').value = 'NEW-REFERENCE'; field('reason').value = 'Synthetic documentary correction'; await field('save').fire('click'); };
  return {row, rows, writes, toasts, form, field, save, document};
}
function failure(error, extras = {}) { return {ok: false, errors: ['recibo_edit_commit_failed'], error, operationId, ...extras}; }
function assertFailed(h) {
  assert.equal(h.field('save').disabled, false);
  assert.equal(h.field('save').textContent, 'Guardar recibo');
  assert.equal(h.document.getElementById('rp-edit-receipt'), h.form);
  assert.equal(h.row.numeroReciboFuente, 'OLD-REFERENCE');
  assert.equal(h.row.montoTotal, 123.45);
  assert.equal(h.rows.cobros.length, 0);
  assert.equal(h.toasts.length, 0);
  assert.match(h.field('error').textContent, /esta respuesta no confirma que el cambio se haya aplicado/);
}
for (const code of ['cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded', 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated']) {
  test('exact callable code retained without raw message: ' + code, async () => {
    const h = harness(failure('functions/' + code)); await h.save(); assertFailed(h);
    assert.ok(h.field('error').textContent.includes('Código: functions/' + code + '.'));
    assert.ok(h.field('error').textContent.includes('Operación: ' + operationId + '.'));
    assert.deepEqual(h.writes[0].patch, {numeroReciboFuente: 'NEW-REFERENCE'});
    assert.equal(h.writes.length, 1);
  });
}
for (const code of ['PRODUCT_WRITE_AUTH_CONTEXT_MISMATCH', 'PRODUCT_WRITE_AUTH_RESTORE_TIMEOUT', 'PRODUCT_WRITE_RECORD_SCOPE_DENIED', 'PRODUCT_SERVER_CANONICAL_READBACK_REQUIRED']) {
  test('exact writer code retained: ' + code, async () => { const h = harness(failure(code)); await h.save(); assertFailed(h); assert.ok(h.field('error').textContent.includes('Código: ' + code + '.')); });
}
for (const code of ['PRODUCT_SERVER_CANONICAL_READBACK_TARGET_MISSING', 'PRODUCT_SERVER_CANONICAL_DELETE_NOT_CONFIRMED', 'PRODUCT_SERVER_CANONICAL_WRITE_NOT_CONFIRMED']) {
  test('readback code strips record path: ' + code, async () => {
    const h = harness(failure(code + ':recibosEsperados/private-record-reference')); await h.save(); assertFailed(h);
    assert.ok(h.field('error').textContent.includes('Código: ' + code + '.'));
    assert.doesNotMatch(h.field('error').textContent, /private-record-reference|recibosEsperados\//);
  });
}
for (const raw of ['functions/internal customer@example.invalid token=private-token', 'https://private.invalid/path?token=secret', '<img src=x onerror=alert(1)>', 'functions/functions/internal', {code: 'functions/internal', message: 'private-name'}, null]) {
  test('unknown or structured error is never rendered: ' + JSON.stringify(raw), async () => {
    const h = harness(failure(raw, {errors: ['private-name', 'customer@example.invalid', 'token=private-token']})); await h.save(); assertFailed(h);
    assert.match(h.field('error').textContent, /Código: ERROR_NO_CLASIFICADO/);
    assert.doesNotMatch(h.field('error').textContent, /private-name|@|private-token|https:|<img|functions\/functions/);
  });
}
for (const id of ['customer@example.invalid', 'token.private.secret', 'recedit_customer@example.invalid', 'recedit_short_longrandomvalue', 'recedit_mif0x123_a1b2c<script>', operationId + '\n', operationId + '\r', operationId + '\r\n', operationId + '\u2028', {id: operationId}, '']) {
  test('invalid operation reference is omitted: ' + JSON.stringify(id), async () => {
    const h = harness(failure('functions/internal', {operationId: id})); await h.save(); assertFailed(h); assert.doesNotMatch(h.field('error').textContent, /Operación:|@|<script>|token\.private/);
  });
}
test('missing response remains failed and does not invent a code or operation', async () => { const h = harness(null); await h.save(); assertFailed(h); assert.match(h.field('error').textContent, /recibo_edit_no_confirmado.*ERROR_NO_CLASIFICADO/); assert.doesNotMatch(h.field('error').textContent, /Operación:/); });
test('known validation code remains usable without echoing arbitrary fields', async () => { const h = harness(failure('', {errors: ['recibo_valor_invalido:primaNeta', 'recibo_valor_invalido:private-name']})); await h.save(); assertFailed(h); assert.match(h.field('error').textContent, /recibo_valor_invalido/); assert.doesNotMatch(h.field('error').textContent, /private-name/); });
test('actual engine failure reaches actual editor without payment or financial mutation', async () => {
  const h = harness(null, 'functions/internal'); await h.save(); assertFailed(h);
  assert.match(h.field('error').textContent, /Código: functions\/internal/);
  assert.match(h.field('error').textContent, /Operación: recedit_[a-z0-9]{8,12}_[a-z0-9]{1,5}\./);
  assert.equal(h.writes.length, 1);
  const mutations = h.writes[0].mutations;
  assert.deepEqual(mutations.map(x => x.collection), ['recibosEsperados', 'actividades']);
  assert.deepEqual(Object.keys(mutations[0].payload).sort(), ['actualizado', 'numeroReciboFuente', 'operationId']);
});
test('confirmed success path remains unchanged', async () => {
  const h = harness({ok: true}); await h.save();
  assert.equal(h.document.getElementById('rp-edit-receipt'), null);
  assert.equal(h.writes.length, 1); assert.deepEqual(h.writes[0].patch, {numeroReciboFuente: 'NEW-REFERENCE'});
  assert.equal(h.toasts.length, 1); assert.match(h.toasts[0], /confirmado en servidor/);
});
