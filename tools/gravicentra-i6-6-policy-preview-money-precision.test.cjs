'use strict';
// Synthetic, read-only VM regression. The real shared UI formatter, pricing
// engine and policy form execute together; no mocked money or paid records.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.env.I66_POLICY_MONEY_SOURCE_ROOT || path.join(__dirname, '..'));
const uiPath = 'orbit360-platform/core/ui.js';
const bridgePath = 'orbit360-platform/modules/policy-receipts-v1199-bridge.js';
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const decode = value => String(value ?? '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = text => Object.fromEntries([...String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1], decode(m[2] ?? m[3] ?? m[4] ?? '')]));

class Element {
  constructor(tag, doc, a = {}) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.attrs = a; this.id = a.id || ''; this.value = a.value || '';
    this.style = {}; this.listeners = {}; this.nodes = []; this.children = []; this.dataset = {}; this.disabled = 'disabled' in a;
    this.textContent = ''; this.classList = { add() {}, remove() {}, contains() { return false; } };
    for (const [k, v] of Object.entries(a)) if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  set innerHTML(value) {
    this.html = String(value);
    if (this.tagName === 'SELECT') {
      const options = [...this.html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m => ({ a: attrs(m[1]), t: decode(m[2]) }));
      const selected = options.find(o => 'selected' in o.a) || options[0];
      this.value = selected ? selected.a.value ?? selected.t : ''; return;
    }
    this.nodes = [];
    for (const m of this.html.matchAll(/<(input|select|textarea|button|div|small|label|span|a)\b([^>]*)>/g)) {
      const a = attrs(m[2]); if (!a.id && !Object.keys(a).some(k => k.startsWith('data-'))) continue;
      const el = new Element(m[1], this.doc, a);
      if (m[1] === 'select') el.innerHTML = this.html.slice(m.index + m[0].length).split('</select>')[0];
      if (m[1] === 'textarea') el.value = decode(this.html.slice(m.index + m[0].length).split('</textarea>')[0]);
      this.nodes.push(el);
    }
  }
  get innerHTML() { return this.html || ''; }
  matches(selector) {
    return String(selector).split(',').some(s => {
      s = s.trim();
      if (/^[a-z]+$/i.test(s)) return this.tagName.toLowerCase() === s.toLowerCase();
      const match = s.match(/^\[([:\w-]+)\]$/); return !!match && Object.hasOwn(this.attrs, match[1]);
    });
  }
  querySelectorAll(s) { return this.nodes.concat(this.children).filter(el => el.matches(s)); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  appendChild(el) { this.children.push(el); if (el.id) this.doc.ids.set(el.id, el); return el; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  async fire(name) { for (const fn of this.listeners[name] || []) await fn({ target: this, preventDefault() {}, stopPropagation() {} }); }
  insertAdjacentHTML(_where, html) { this.html = (this.html || '') + html; }
  remove() { this.doc.ids.delete(this.id); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  focus() {} scrollIntoView() {}
}

function harness({ country = 'GT', currency = 'GTQ' } = {}) {
  const doc = { ids: new Map(), createElement(tag) { return new Element(tag, this); }, getElementById(id) { return this.ids.get(id) || null; }, addEventListener() {}, dispatchEvent() {} };
  doc.head = new Element('head', doc); doc.body = new Element('body', doc);
  const rows = {
    clientes: [{ id: 'qa_money_client', nombre: 'Cliente sintético', pais: country, asesorId: 'qa_money_advisor' }],
    aseguradoras: [{ id: 'qa_money_insurer', nombre: 'Aseguradora sintética', pais: country, vinculada: true, comisiones: { AUTOMOVILES: 10 } }],
    asesores: [{ id: 'qa_money_advisor', nombre: 'Asesor sintético', paises: [country], shareCom: 60, comModo: 'comision' }],
    polizas: [], recibosEsperados: [], carteraPrimas: [], cobros: [], vehiculos: []
  };
  let writes = 0;
  const rejectWrite = () => { writes++; throw new Error('READ_ONLY_FORMATTER_TEST'); };
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const Orbit = {
    tenant: { id: 'qa_money_tenant', demoDate: '2026-11-17' },
    store: { all: c => rows[c] || [], get: (c, id) => (rows[c] || []).find(r => r.id === id) || null,
      where: (c, fn) => (rows[c] || []).filter(fn), pref: (_k, d) => d, on() {},
      insert: rejectWrite, update: rejectWrite, batchDurable: rejectWrite, updateDurable: rejectWrite },
    access: { norm, filter: (_c, list) => list, canView: () => true, can: () => true, canWrite: () => true,
      currencyFor: c => c === 'CO' ? 'COP' : 'GTQ', tenantId: () => 'qa_money_tenant', activeRole: () => 'Dirección',
      actorAdvisor: () => ({}), actorUser: () => ({ id: 'qa_money_actor' }), audit: rejectWrite },
    modules: { cliente360: { render() {}, verPoliza() {} }, polizas: { render() {} } },
    cat: { ramosDe: () => ['AUTOMOVILES'], subramosDe: () => ['AUTO'] },
    paisCfg: c => ({ iva: c === 'CO' ? 19 : 12, recargoFinanciero: 0, gastosEmision: 0 }),
    PAISES: [{ id: 'GT', moneda: 'GTQ' }, { id: 'CO', moneda: 'COP' }],
    assignableAdvisorRoster: { list: async () => rows.asesores.map(a => ({ ...a, assignable: true, roleEligible: true, activo: true })) },
    session: { rol: () => 'Dirección' }, ia: { disponible: () => false }
  };
  const context = vm.createContext({ Orbit, document: doc, console,
    location: { hostname: 'app.aysseguros.com', hash: '', pathname: '/' },
    setTimeout() {}, clearTimeout() {}, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {} });
  context.window = context;
  const load = p => vm.runInContext(read(p), context, { filename: p });
  load(uiPath);
  const sharedMoney = Orbit.ui.money;
  load('orbit360-platform/core/primas.js');
  load('orbit360-platform/core/policy-receipts-engine.js');
  const input = {
    tenantId: 'qa_money_tenant', clienteId: rows.clientes[0].id, asesorId: rows.asesores[0].id,
    aseguradoraId: rows.aseguradoras[0].id, numero: 'QA-MONEY-POLICY', pais: country, moneda: currency,
    ramo: 'AUTOMOVILES', producto: 'AUTO', estado: 'Vigente', frecuencia: 'Contado', cuotas: 1,
    vigenciaInicio: '2026-10-20', vigenciaFin: '2027-10-20', primaNeta: 630, gastosEmision: 41.5,
    otros: 200, recargoFinPct: 0, ivaPct: country === 'CO' ? 19 : 12,
    cargoNoGravadoMonto: 2.7, cargoNoGravadoConcepto: 'Cargo sintético', cargoNoGravadoDocumentRef: 'qa-document',
    vencimientosDocumentados: [{ secuencia: 1, fechaVencimiento: '2026-11-06', documentRef: 'qa-document' }]
  };
  return { Orbit, doc, rows, context, load, input, sharedMoney, writes: () => writes, async form(existing = false) {
    if (existing) {
      const policy = Orbit.policyReceipts.preparePolicy(input, null, 'qa_money_preview');
      policy.id = 'qa_money_policy'; rows.polizas.push(policy);
      rows.recibosEsperados.push(...Orbit.policyReceipts.expectedReceipts(policy));
    }
    load(bridgePath);
    if (existing) Orbit.modules.cliente360.editarPoliza('qa_money_policy');
    else Orbit.modules.cliente360.nuevaPoliza(rows.clientes[0].id);
    await Promise.resolve(); await Promise.resolve();
    const form = doc.getElementById('policy-v1199'); assert.ok(form, 'real bridge opened form');
    const field = name => form.querySelector('[data-' + name + ']');
    if (!existing) {
      for (const [key, value] of Object.entries({ number: input.numero, currency, product: 'AUTO', start: input.vigenciaInicio,
        end: input.vigenciaFin, net: '630', issue: '41.50', other: '200', surcharge: '0', nonvat: '2.70',
        'nonvat-concept': 'Cargo sintético', 'nonvat-ref': 'qa-document', 'documented-calendar': '1 | 2026-11-06 | qa-document' })) field(key).value = value;
      await field('documented-calendar').fire('input');
    }
    return { form, field, html: field('preview').innerHTML };
  } };
}

function formatter({ noSharedMoney = false, noLocale = false } = {}) {
  const h = harness();
  if (noSharedMoney) delete h.Orbit.ui.money;
  if (noLocale) vm.runInContext('Number.prototype.toLocaleString = function () { throw new Error("INTL_UNAVAILABLE"); };', h.context);
  // Execute the actual private formatter without exporting a test hook in the
  // product. The full-form tests below independently execute the whole bridge.
  const source = read(bridgePath), start = source.indexOf('  function money(cur, n)'), end = source.indexOf('\n  function explicitCommission(', start);
  assert.ok(start >= 0 && end > start, 'actual bridge formatter remains discoverable');
  vm.runInContext('const U = Orbit.ui;\n' + source.slice(start, end) + '\nglobalThis.formatPolicyMoney = money;', h.context, { filename: bridgePath });
  return h.context.formatPolicyMoney;
}

for (const [country, currency, symbol] of [['GT', 'GTQ', 'Q'], ['GT', 'USD', 'US$'], ['CO', 'COP', '$']]) {
  for (const existing of [false, true]) test(`real ${existing ? 'existing' : 'new'} policy form preserves ${currency} cents and does not change shared KPIs`, async () => {
    const h = harness({ country, currency }), calculated = h.Orbit.policyReceipts.preparePolicy(h.input, null, 'qa_calculation');
    const beforeShared = h.sharedMoney(calculated.primaTotal, currency);
    const view = await h.form(existing);
    const decimal = calculated.primaTotal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    assert.ok(view.html.includes(symbol + ' ' + decimal), view.html);
    assert.ok(view.html.includes(symbol + ' 2.70'), 'documented fractional component remains visible');
    assert.ok(view.html.includes('2026-11-06'), 'documented contractual date preserved');
    assert.ok(view.html.includes('<td class="num">' + symbol + ' ' + decimal + '</td>'), 'receipt preview also preserves cents');
    assert.equal(h.Orbit.ui.money, h.sharedMoney, 'global formatter was not replaced');
    assert.equal(h.Orbit.ui.money(calculated.primaTotal, currency), beforeShared);
    assert.equal(h.writes(), 0); assert.equal(h.rows.cobros.length, 0);
    if (existing) assert.equal(h.rows.polizas[0].primaTotal, calculated.primaTotal);
    else assert.equal(h.rows.polizas.length, 0);
  });
}
for (const [currency, symbol] of [['GTQ', 'Q'], ['USD', 'US$'], ['COP', '$']]) test('local formatter keeps exactly two decimals for ' + currency, () => {
  const money = formatter();
  for (const [value, decimal] of [[978.78, '978.78'], [2.7, '2.70'], [0, '0.00'], [-0, '0.00'], ['1234.56', '1,234.56'], [-12.34, '-12.34']]) {
    assert.equal(money(currency, value), symbol + ' ' + decimal);
  }
});
for (const value of [null, undefined, '', '  ', NaN, Infinity, -Infinity, 'not-a-number', true, {}, []]) test('invalid amount stays unavailable, not fabricated zero: ' + String(value), () => {
  assert.equal(formatter()('GTQ', value), '—');
});
test('standalone fallback keeps currency and cents without shared money or Intl', () => {
  const money = formatter({ noSharedMoney: true, noLocale: true });
  assert.equal(money('GTQ', 978.78), 'Q 978.78');
  assert.equal(money('USD', 2.7), 'US$ 2.70');
  assert.equal(money('COP', 1234.56), '$ 1234.56');
  assert.equal(money('EUR', 1.2), 'EUR 1.20');
  assert.equal(money('', 1.2), '—');
  assert.equal(money('<invalid>', 1.2), '—');
});
