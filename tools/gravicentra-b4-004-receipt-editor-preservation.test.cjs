'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const owner = process.env.B4_RECEIPT_EDITOR_SOURCE || path.resolve(__dirname, '../orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js');
const copy = value => JSON.parse(JSON.stringify(value));
const decode = value => String(value || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attributes(text) {
  const out = {};
  for (const m of String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1]] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}
class Element {
  constructor(tag, document, attrs = {}) {
    this.tagName = tag.toUpperCase(); this.document = document; this.attrs = attrs;
    this.style = {}; this.listeners = new Map(); this.nodes = []; this.children = [];
    this.value = attrs.value || ''; this.id = attrs.id || ''; this.textContent = ''; this.disabled = false;
  }
  set innerHTML(html) {
    this.html = String(html); this.nodes = [];
    for (const m of this.html.matchAll(/<(input|textarea|button|div)\b([^>]*)>/g)) {
      const attrs = attributes(m[2]);
      if (Object.keys(attrs).some(k => k.startsWith('data-'))) this.nodes.push(new Element(m[1], this.document, attrs));
    }
  }
  get innerHTML() { return this.html || ''; }
  querySelectorAll(selector) {
    const m = String(selector).match(/^\[([:\w-]+)\]$/);
    return m ? this.nodes.filter(node => Object.hasOwn(node.attrs, m[1])) : [];
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(event, handler) { if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(handler); }
  async fire(event) { for (const handler of this.listeners.get(event) || []) await handler({target: this}); }
  appendChild(node) { this.children.push(node); if (node.id) this.document.ids.set(node.id, node); return node; }
  remove() { if (this.id) this.document.ids.delete(this.id); }
}
function harness(receipt, {realEngine = false, autoOpen = true} = {}) {
  const row = {id: 'qa_receipt', tenantId: 'qa_tenant', clienteId: 'qa_client', polizaId: 'qa_policy', asesorId: 'qa_advisor', aseguradoraId: 'qa_insurer', moneda: 'USD', pais: 'GT', fechaLimite: '2026-11-07', estado: 'Pendiente', ...copy(receipt || {})};
  const writes = [], batches = [], toasts = [];
  const document = {ids: new Map(), createElement(tag) { return new Element(tag, this); }, getElementById(id) { return this.ids.get(id) || null; }, querySelector() { return null; }, addEventListener() {}};
  document.head = new Element('head', document); document.body = new Element('body', document);
  const rows = {recibosEsperados: receipt === null ? [] : [row], polizas: [{id: 'qa_policy', clienteId: 'qa_client', moneda: 'USD', pais: 'GT', estado: 'Vigente'}], clientes: [{id: 'qa_client', pais: 'GT'}], aseguradoras: [{id: 'qa_insurer', pais: 'GT', vinculada: true}], asesores: [{id: 'qa_advisor', comModo: 'comision', shareCom: 60}], carteraPrimas: [], actividades: [], vehiculos: [], cobros: []};
  const store = {
    get: (collection, id) => (rows[collection] || []).find(x => x.id === id) || null,
    all: collection => rows[collection] || [], where: (collection, predicate) => (rows[collection] || []).filter(predicate),
    insert(collection, payload) { (rows[collection] ||= []).push(copy(payload)); return payload; },
    update(collection, id, patch) { const existing = this.get(collection, id); if (existing) Object.assign(existing, copy(patch)); return existing; },
    async batchDurable(mutations, options) {
      const next = copy(rows);
      for (const mutation of mutations) {
        const list = next[mutation.collection] ||= [], index = list.findIndex(x => x.id === mutation.id);
        if (mutation.action === 'insert') { assert.equal(index, -1); list.push(copy({...mutation.payload, id: mutation.id})); }
        else { assert.ok(index >= 0); Object.assign(list[index], copy(mutation.payload)); }
      }
      for (const [key, value] of Object.entries(next)) rows[key] = value;
      batches.push(copy({mutations, options})); return {ok: true};
    }
  };
  const Orbit = {
    store,
    q: {portfolioDue: r => r.fechaLimite || r.vence || ''}, modules: {},
    ui: {toast: message => toasts.push(message), today: () => '2026-11-07'},
    access: {norm: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''), activeRole: () => 'Dirección', tenantId: () => 'qa_tenant', currencyFor: () => 'GTQ', actorAdvisor: () => ({}), actorUser: () => ({id: 'qa_actor'}), canView: () => true, audit() {}},
    paisCfg: () => ({iva: 12, recargoFinanciero: 0, gastosEmision: 0}), PAISES: [{id: 'GT', moneda: 'GTQ'}],
    policyReceipts: {async updateReceipt(id, patch, options) { writes.push(copy({id, patch, options})); Object.assign(row, copy(patch)); return {ok: true}; }}
  };
  const context = vm.createContext({Orbit, document, location: {hash: '', search: ''}, console, URLSearchParams, Date, Math, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}, addEventListener() {}});
  context.window = context;
  if (realEngine) {
    const root = path.resolve(__dirname, '..');
    const premiumSource = process.env.B4_PREMIUM_SOURCE || path.join(root, 'orbit360-platform/core/primas.js');
    const engineSource = process.env.B4_RECEIPT_ENGINE_SOURCE || path.join(root, 'orbit360-platform/core/policy-receipts-engine.js');
    for (const source of [premiumSource, engineSource]) vm.runInContext(fs.readFileSync(source, 'utf8'), context, {filename: source});
  }
  vm.runInContext(fs.readFileSync(owner, 'utf8'), context, {filename: owner});
  const open = id => {
    const target = store.get('recibosEsperados', id), opened = Orbit.receiptsPortfolioProjection.editReceipt(id, target.clienteId);
    const form = document.getElementById('rp-edit-receipt'), field = name => form.querySelector('[data-rp-' + name + ']');
    const save = async () => { field('reason').value = 'Corrección de fecha según documento'; await field('save').fire('click'); };
    return {opened, form, field, save};
  };
  return {row, rows, writes, batches, toasts, Orbit, open, document, ...(autoOpen ? open(row.id) : {})};
}
const legacy = {neta: 1000, gastosEmision: 50, gastosFinan: 20, iva: 128.4, montoTotal: 1198.4, otros: 8, serie: '1 / 1'};

test('the actual editor displays legacy premium aliases without changing the source row', () => {
  const h = harness(legacy);
  assert.equal(h.opened, true);
  assert.deepEqual(['net', 'exp', 'fin', 'tax', 'total'].map(k => h.field(k).value), ['1000', '50', '20', '128.4', '1198.4']);
  assert.equal(h.field('adj').value, '', 'otros is not silently treated as descuento');
  assert.equal(Object.hasOwn(h.row, 'primaNeta'), false);
  assert.equal(h.writes.length, 0);
});

test('changing only a legacy receipt date sends only the date and preserves all monetary data', async () => {
  const h = harness(legacy), before = copy(h.row);
  h.field('due').value = '2026-11-19'; await h.save();
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.writes[0].patch, {fechaLimite: '2026-11-19'});
  assert.deepEqual(h.row, {...before, fechaLimite: '2026-11-19'});
  assert.equal(h.document.getElementById('rp-edit-receipt'), null);
});

test('canonical zero values take precedence over legacy aliases and a date edit does not replay premiums', async () => {
  const h = harness({...legacy, primaNeta: 0, gastosExpedicion: 0, gastosFinanciamiento: 0, impuestosIVA: 0, primaTotal: 0});
  assert.deepEqual(['net', 'exp', 'fin', 'tax', 'total'].map(k => h.field(k).value), ['0', '0', '0', '0', '0']);
  h.field('due').value = '2026-11-20'; await h.save();
  assert.deepEqual(h.writes[0].patch, {fechaLimite: '2026-11-20'});
});

test('unknown untouched amounts remain absent when another field is edited', async () => {
  const h = harness({monto: 500});
  assert.equal(h.field('net').value, ''); assert.equal(h.field('tax').value, '');
  h.field('due').value = '2026-11-21'; await h.save();
  assert.deepEqual(h.writes[0].patch, {fechaLimite: '2026-11-21'});
  for (const key of ['primaNeta', 'gastosExpedicion', 'gastosFinanciamiento', 'descuento', 'impuestosIVA', 'primaTotal']) assert.equal(Object.hasOwn(h.row, key), false);
});

test('clearing an amount or entering a non-finite amount does not create an implicit zero or a write', async () => {
  for (const value of ['', 'NaN', 'Infinity']) {
    const h = harness({primaNeta: 1000, primaTotal: 1120});
    h.field('net').value = value; await h.save();
    assert.equal(h.writes.length, 0);
    assert.equal(h.row.primaNeta, 1000);
    assert.equal(h.field('save').disabled, false);
    assert.match(h.field('error').textContent, /número|cero/);
  }
});

test('an explicit zero is preserved as an intentional edit and unrelated amounts are omitted', async () => {
  const h = harness({primaNeta: 1000, gastosExpedicion: 50, primaTotal: 1176});
  h.field('exp').value = '0'; await h.save();
  assert.deepEqual(h.writes[0].patch, {gastosExpedicion: 0});
  assert.equal(h.row.primaNeta, 1000); assert.equal(h.row.primaTotal, 1176);
});

test('unchanged values and numeric formatting alone produce no write', async () => {
  const h = harness({primaNeta: 1000, primaTotal: 1120});
  h.field('net').value = '1000.00'; await h.save();
  assert.equal(h.writes.length, 0);
  assert.match(h.field('error').textContent, /No hay cambios/);
});

test('the existing paid-receipt lock remains active before opening the form', () => {
  const h = harness({...legacy, estadoOperativo: 'pago_reportado', fechaPagoReportada: '2026-10-21'});
  assert.equal(h.opened, false); assert.equal(h.form, null); assert.equal(h.writes.length, 0);
  assert.match(h.toasts[0], /bloqueada|evidencia de pago/);
});

const moneyKeys = ['moneda', 'neta', 'primaNeta', 'gastosEmision', 'gastosExpedicion', 'gastosFinan', 'gastosFinanciamiento', 'otros', 'descuento', 'iva', 'impuestosIVA', 'monto', 'montoTotal', 'primaTotal', 'comAseguradora', 'comVendedor'];
const moneySnapshot = row => Object.fromEntries(moneyKeys.filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));

test('actual createPolicy → actual receipt form → actual updateReceipt preserves every monetary field on a date-only edit', async () => {
  const h = harness(null, {realEngine: true, autoOpen: false});
  const result = await h.Orbit.policyReceipts.createPolicy({numero: 'QA-CREATE-EDIT', clienteId: 'qa_client', asesorId: 'qa_advisor', aseguradoraId: 'qa_insurer', pais: 'GT', moneda: 'USD', ramo: 'Automóviles', producto: 'Vehículo Liviano', estado: 'Vigente', vigenciaInicio: '2026-11-07', vigenciaFin: '2026-12-07', frecuencia: 'Contado', primaNeta: 1000, gastosEmision: 0, comAseguradoraPct: 10, comVendedorPct: 60});
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const receipt = h.rows.recibosEsperados.find(x => x.polizaId === result.policy.id), before = moneySnapshot(receipt);
  assert.deepEqual([receipt.primaNeta, receipt.gastosExpedicion, receipt.gastosFinanciamiento, receipt.impuestosIVA, receipt.primaTotal], [1000, 0, 0, 120, 1120]);
  const ui = h.open(receipt.id); ui.field('due').value = '2026-11-19'; await ui.save();
  const after = h.Orbit.store.get('recibosEsperados', receipt.id), last = h.batches.at(-1);
  assert.deepEqual(moneySnapshot(after), before);
  assert.equal(after.fechaLimite, '2026-11-19');
  assert.deepEqual(Object.keys(last.mutations.find(x => x.collection === 'recibosEsperados').payload).sort(), ['actualizado', 'fechaLimite', 'fechaVencimiento', 'operationId', 'vence']);
  assert.equal(h.rows.carteraPrimas[0].primaTotal, 1120); assert.equal(h.rows.carteraPrimas[0].fechaLimite, '2026-11-19');
  assert.equal(h.rows.cobros.length, 0);
});

test('legacy receipt → actual form → actual engine leaves every existing monetary field and absent alias unchanged for date-only edits', async () => {
  const h = harness(legacy, {realEngine: true}), before = moneySnapshot(h.row);
  h.field('due').value = '2026-11-20'; await h.save();
  const after = h.Orbit.store.get('recibosEsperados', h.row.id);
  assert.deepEqual(moneySnapshot(after), before);
  assert.equal(after.fechaLimite, '2026-11-20'); assert.equal(Object.hasOwn(after, 'primaNeta'), false);
  assert.equal(h.batches.length, 1); assert.equal(h.rows.cobros.length, 0);
});

test('an explicit monetary edit through the real form and engine keeps canonical and legacy aliases coherent', async () => {
  const h = harness({...legacy, otros: 0}, {realEngine: true});
  for (const [field, value] of Object.entries({net: '900', exp: '0', fin: '10', tax: '109.2', total: '1019.2'})) h.field(field).value = value;
  await h.save();
  const after = h.Orbit.store.get('recibosEsperados', h.row.id);
  for (const [canonical, old, value] of [['primaNeta', 'neta', 900], ['gastosExpedicion', 'gastosEmision', 0], ['gastosFinanciamiento', 'gastosFinan', 10], ['impuestosIVA', 'iva', 109.2], ['primaTotal', 'montoTotal', 1019.2]]) {
    assert.equal(after[canonical], value); assert.equal(after[old], value);
  }
  assert.equal(after.monto, 1019.2); assert.equal(after.otros, 0); assert.equal(Object.hasOwn(after, 'descuento'), false);
  assert.equal(after.fechaLimite, '2026-11-07'); assert.equal(h.rows.cobros.length, 0);
});
