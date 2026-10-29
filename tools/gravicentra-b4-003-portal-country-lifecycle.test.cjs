'use strict';
// Synthetic Portal lifecycle proof. Executes the real Portal/legal owners;
// no Firebase, credentials, browser session, legal acceptance or business writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = rel => fs.readFileSync(path.join(root, rel), 'utf8');

class Events {
  constructor() { this.handlers = new Map(); }
  addEventListener(name, fn) { const list = this.handlers.get(name) || []; list.push(fn); this.handlers.set(name, list); }
  removeEventListener(name, fn) { this.handlers.set(name, (this.handlers.get(name) || []).filter(f => f !== fn)); }
  dispatchEvent(event) { for (const fn of [...(this.handlers.get(event.type) || [])]) fn(event); return true; }
}
class Node extends Events {
  constructor() { super(); this.style = {}; this.attrs = {}; this.controls = new Map(); this.children = []; this.dataset = {}; this.value = ''; this.id = ''; this._html = ''; }
  set innerHTML(value) { this._html = String(value); this.controls.clear(); }
  get innerHTML() { return this._html; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] || null; }
  querySelector(selector) {
    const id = selector[0] === '#' ? selector.slice(1) : '';
    if (!id || !this._html.includes('id="' + id + '"')) return null;
    if (!this.controls.has(id)) { const el = new Node(); el.id = id; this.controls.set(id, el); }
    return this.controls.get(id);
  }
  querySelectorAll() { return []; }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  removeChild(node) { this.children = this.children.filter(n => n !== node); node.parentNode = null; return node; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  fire(type) { this.dispatchEvent({ type, target: this, stopPropagation() {} }); }
}
function setup() {
  const document = new Events(), window = new Events();
  const body = document.body = new Node(), host = new Node(), portalBody = new Node();
  body.appendChild(host);
  const header = new Node(); header.id = 'pais-sel'; header.value = 'GT';
  document.createElement = () => new Node();
  document.getElementById = id => id === 'host' ? host : id === 'pt-body' ? portalBody : id === 'pais-sel' ? header : body.children.find(n => n.id === id) || null;
  document.querySelectorAll = selector => selector === '[data-legal-gate]' ? body.children.filter(n => n.getAttribute('data-legal-gate')) : [];
  const data = { clientes: [
    { id: 'gt1', nombre: 'Cliente Guatemala', pais: 'GT', asesorId: 'a' },
    { id: 'co1', nombre: 'Cliente Colombia', pais: 'CO', asesorId: 'a' },
    { id: 'hidden', nombre: 'No autorizado', pais: 'GT', _hidden: true }
  ] };
  let writes = 0, scopes = 0;
  const memory = new Map();
  const localStorage = { getItem: key => memory.get(key) || null, setItem() { writes += 1; throw Error('LEGAL_ACCEPTANCE_NOT_AUTHORIZED'); } };
  const store = {
    all: collection => data[collection] || [],
    get: (collection, id) => (data[collection] || []).find(row => row.id === id),
    where: (collection, predicate) => (data[collection] || []).filter(predicate),
    insert() { writes += 1; throw Error('NO_BUSINESS_WRITES'); },
    update() { writes += 1; throw Error('NO_BUSINESS_WRITES'); }
  };
  const escape = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const Orbit = {
    pais: 'GT', route: { key: 'portal' }, modules: {}, store,
    ui: { esc: escape, money: String, fmtDate: String, today: () => '2026-10-29' },
    q: { cobrosDe: () => [], polizasDe: () => [], asesor: () => null, aseguradora: () => null },
    access: {
      filter(collection, rows, moduleName) { assert.equal(collection, 'clientes'); assert.equal(moduleName, 'portal'); return rows.filter(r => !r._hidden); },
      withScope(moduleName, fn) { assert.equal(moduleName, 'portal'); scopes += 1; return fn(); }
    },
    tenant: { get: () => ({ nombre: 'A&S QA', paisDefault: 'GT' }) }
  };
  const location = { hash: '#/portal' };
  Object.assign(window, { Orbit, document, location, localStorage });
  const context = vm.createContext({ window, Orbit, document, location, localStorage, Date, console, setTimeout() {}, CustomEvent: function (type, options) { this.type = type; this.detail = options && options.detail; } });
  vm.runInContext(source('orbit360-platform/core/legal.js'), context, { filename: 'legal.js' });
  vm.runInContext(source('orbit360-platform/modules/portal.js'), context, { filename: 'portal.js' });
  const gates = () => document.querySelectorAll('[data-legal-gate]');
  return { Orbit, window, document, host, header, data, location, gates, memory, writes: () => writes, scopes: () => scopes,
    render: () => Orbit.modules.portal.render(host),
    country(value) { Orbit.pais = value; header.value = value; document.dispatchEvent({ type: 'orbit:pais' }); },
    leave() { Orbit.route = { key: 'inicio' }; location.hash = '#/inicio'; document.dispatchEvent({ type: 'orbit:route-ready', detail: { route: 'inicio' } }); window.dispatchEvent({ type: 'hashchange' }); },
    enter() { Orbit.route = { key: 'portal' }; location.hash = '#/portal'; Orbit.modules.portal.render(host); }
  };
}

test('Portal respects current country and does not silently mutate the shell country', () => {
  const h = setup(); h.render();
  assert.equal(h.Orbit.pais, 'GT'); assert.equal(h.header.value, 'GT');
  assert.match(h.host.innerHTML, /Cliente Guatemala/); assert.doesNotMatch(h.host.innerHTML, /Cliente Colombia|No autorizado/);
});
test('visible Portal responds to global country events and reselects only authorized clients', () => {
  const h = setup(); h.render(); h.country('CO');
  assert.match(h.host.innerHTML, /Cliente Colombia/); assert.doesNotMatch(h.host.innerHTML, /Cliente Guatemala/);
  assert.equal(h.gates().length, 1); assert.equal(h.gates()[0].getAttribute('data-legal-gate'), 'cliente:co1');
  assert.equal(h.Orbit.pais, 'CO'); assert.equal(h.header.value, 'CO');
});
test('leaving Portal removes its pending overlay without accepting the agreement', () => {
  const h = setup(); h.render(); assert.equal(h.gates().length, 1);
  h.leave(); assert.equal(h.gates().length, 0);
  assert.notEqual(h.Orbit.legal.__gateState.pendingScopes['cliente:gt1'], true);
  assert.notEqual(h.Orbit.legal.__gateState.doneScopes['cliente:gt1'], true);
  assert.equal(h.Orbit.legal.yaAcepto('cliente:gt1'), false); assert.equal(h.writes(), 0);
});
test('returning to Portal restores the unaccepted legal gate instead of bypassing it', () => {
  const h = setup(); h.render(); h.leave(); h.enter();
  assert.equal(h.gates().length, 1); assert.equal(h.gates()[0].getAttribute('data-legal-gate'), 'cliente:gt1');
  assert.equal(h.Orbit.legal.__gateState.pendingScopes['cliente:gt1'], true);
  assert.equal(h.Orbit.legal.yaAcepto('cliente:gt1'), false); assert.equal(h.writes(), 0);
});
test('Portal cleanup never removes an unrelated internal-user legal gate', () => {
  const h = setup(); h.Orbit.legal.gate('colaborador', 'user:internal-qa'); h.render();
  assert.equal(h.gates().length, 2); h.leave();
  assert.equal(h.gates().length, 1); assert.equal(h.gates()[0].getAttribute('data-legal-gate'), 'user:internal-qa');
  assert.equal(h.Orbit.legal.__gateState.pendingScopes['user:internal-qa'], true); assert.equal(h.writes(), 0);
});
test('pending legal dismissal is idempotent and does not invoke acceptance callbacks', () => {
  const h = setup(); let completed = 0;
  h.Orbit.legal.gate('cliente', 'cliente:qa', { onDone() { completed += 1; } });
  assert.equal(typeof h.Orbit.legal.dismiss, 'function');
  h.Orbit.legal.dismiss('cliente:qa'); h.Orbit.legal.dismiss('cliente:qa');
  assert.equal(h.gates().length, 0); assert.equal(completed, 0); assert.equal(h.writes(), 0);
  assert.equal(h.Orbit.legal.yaAcepto('cliente:qa'), false);
  h.Orbit.legal.gate('cliente', 'cliente:qa'); assert.equal(h.gates().length, 1);
});
test('repeated render binds lifecycle once and country events do not repaint another route', () => {
  const h = setup(); h.render(); h.render(); h.render();
  assert.equal((h.document.handlers.get('orbit:pais') || []).length, 1);
  h.leave(); h.host.innerHTML = 'Inicio ajeno'; h.country('CO');
  assert.equal(h.host.innerHTML, 'Inicio ajeno'); assert.equal(h.gates().length, 0);
});
test('country or access changes with no visible clients close only the prior client gate', () => {
  const h = setup(); h.render(); h.data.clientes.forEach(row => { row._hidden = true; }); h.country('CO');
  assert.match(h.host.innerHTML, /Sin clientes disponibles/); assert.equal(h.gates().length, 0); assert.equal(h.writes(), 0);
});
test('preexisting real acceptance is preserved by dismissal and returning to Portal', () => {
  const h = setup();
  h.memory.set('orbit360_legal_aceptaciones', JSON.stringify({ 'cliente:gt1': { version: '2.0', aceptado: true, fecha: '2026-10-01' } }));
  const before = h.memory.get('orbit360_legal_aceptaciones');
  h.render(); assert.equal(h.gates().length, 0); h.leave(); h.enter();
  assert.equal(h.gates().length, 0); assert.equal(h.Orbit.legal.yaAcepto('cliente:gt1'), true);
  assert.equal(h.memory.get('orbit360_legal_aceptaciones'), before); assert.equal(h.writes(), 0);
});
test('every country/session refresh re-enters the Portal access scope', () => {
  const h = setup(); h.render(); h.country('CO'); h.document.dispatchEvent({ type: 'orbit:session' });
  assert.equal(h.scopes(), 3); assert.equal(h.gates().length, 1);
  assert.equal(h.gates()[0].getAttribute('data-legal-gate'), 'cliente:co1');
  assert.equal(h.writes(), 0);
});
