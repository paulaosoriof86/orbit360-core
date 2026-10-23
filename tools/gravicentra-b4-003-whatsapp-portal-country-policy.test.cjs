'use strict';

// B4-003: prueba sintética de alcance; no usa Firebase, red ni datos operativos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '..');
const sources = {
  notificaciones: fs.readFileSync(path.join(repo, 'orbit360-platform/modules/notificaciones.js'), 'utf8'),
  portal: fs.readFileSync(path.join(repo, 'orbit360-platform/modules/portal.js'), 'utf8')
};

const customers = [
  { id: 'gt1', nombre: 'GUATEMALA UNO', pais: 'GT', telefono: '+5021000', asesorId: 'a' },
  { id: 'gt2', nombre: 'GUATEMALA DOS', pais: 'GT', telefono: '+5022000', asesorId: 'a' },
  { id: 'co1', nombre: 'COLOMBIA UNO', pais: 'CO', telefono: '+5023000', asesorId: 'a' },
  { id: 'co2', nombre: 'COLOMBIA DOS', pais: 'CO', telefono: '+574000', asesorId: 'a' },
  { id: 'secret', nombre: 'FUERA DE ALCANCE', pais: 'CO', telefono: '+579000', _hidden: true },
  { id: 'unknown', nombre: 'PAIS SIN VALIDAR', pais: '', telefono: '+5025000' }
];
const policies = [
  { id: 'gtp1', clienteId: 'gt1', pais: 'GT', numero: 'GT-UNO', ramo: 'Auto', vigenciaFin: '2026-11-01' },
  { id: 'gtp2', clienteId: 'gt1', pais: 'GT', numero: 'GT-DOS', ramo: 'Vida', vigenciaFin: '2026-12-02' },
  { id: 'cop1', clienteId: 'co1', pais: 'CO', numero: 'CO-UNO', ramo: 'Vida', vigenciaFin: '2026-11-03' },
  { id: 'copBad', clienteId: 'co1', pais: 'GT', numero: 'PAIS-CONTRADICTORIO', ramo: 'Vida' },
  { id: 'coSecret', clienteId: 'secret', pais: 'CO', numero: 'NO-VISIBLE', _hidden: true }
];

class Control {
  constructor() { this.value = ''; this.innerHTML = ''; this.handlers = {}; this.dataset = {}; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  fire(name) { (this.handlers[name] || []).forEach(fn => fn({ target: this, stopPropagation() {} })); }
}

class Element {
  constructor() { this.controls = new Map(); this.html = ''; this.style = {}; this.id = ''; }
  set innerHTML(html) { this.html = String(html); this.controls.clear(); }
  get innerHTML() { return this.html; }
  querySelector(selector) {
    if (!selector.startsWith('#') || !this.html.includes(`id="${selector.slice(1)}"`)) return null;
    if (!this.controls.has(selector)) this.controls.set(selector, new Control());
    return this.controls.get(selector);
  }
  querySelectorAll() { return []; }
  addEventListener() {}
  remove() { this.removed = true; if (this.onRemove) this.onRemove(); }
}

function setup(country, hasAccess = true) {
  const writes = [];
  const toasts = [];
  let drawer = null;
  const docs = { body: { appendChild(el) { if (el.id === 'pt-dr') { drawer = el; el.onRemove = () => { drawer = null; }; } } },
    createElement() { return new Element(); },
    getElementById(id) { if (id === 'pt-body') return body; if (id === 'pt-dr') return drawer; return null; },
    querySelectorAll() { return []; } };
  const body = new Element();
  const data = { clientes: customers.map(c => ({ ...c })), polizas: policies.map(p => ({ ...p })) };
  const store = {
    all(kind) { return data[kind] || []; },
    get(kind, id) { return (data[kind] || []).find(r => String(r.id) === String(id)); },
    where(kind, fn) { return (data[kind] || []).filter(fn); },
    pref() { return []; },
    setPref(...args) { writes.push(['setPref', ...args]); },
    insert(...args) { writes.push(['insert', ...args]); },
    update(...args) { writes.push(['update', ...args]); }
  };
  const escapeHtml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const Orbit = {
    pais: country,
    store,
    modules: {},
    ui: { esc: escapeHtml, fmtDate: s => 'DATE(' + s + ')', money: String, today: () => '2026-10-23', toast: s => toasts.push(s) },
    kit: { banner: () => '', kpis: () => '' },
    q: { cobrosDe: () => [], polizasDe: () => [], asesor: () => null, aseguradora: () => null },
    legal: { gate() {} }
  };
  if (hasAccess) Orbit.access = { filter(collection, rows, moduleName) {
    assert.ok(['clientes', 'polizas'].includes(collection));
    assert.ok(['notificaciones', 'portal'].includes(moduleName));
    return rows.filter(r => !r._hidden);
  } };
  const window = { Orbit, open() { writes.push(['window.open']); } };
  const context = vm.createContext({ window, Orbit, document: docs, console, setTimeout() {}, Date });
  vm.runInContext(sources.notificaciones, context, { filename: 'notificaciones.js' });
  vm.runInContext(sources.portal, context, { filename: 'portal.js' });
  return { Orbit, data, writes, toasts, host: () => new Element(), drawer: () => drawer };
}

function assertAbsent(html, ...fragments) { for (const f of fragments) assert.ok(!html.includes(f), `Unexpected ${f}`); }

{
  const env = setup('CO');
  const host = env.host();
  env.Orbit.modules.notificaciones.render(host);
  assert.match(host.innerHTML, /COLOMBIA UNO/);
  assert.match(host.innerHTML, /COLOMBIA DOS/);
  assertAbsent(host.innerHTML, 'GUATEMALA UNO', 'GUATEMALA DOS', 'FUERA DE ALCANCE', 'PAIS SIN VALIDAR');

  host.querySelector('#wa-cli').value = 'co1';
  host.querySelector('#wa-cli').fire('change');
  const pol = host.querySelector('#wa-pol');
  assert.match(pol.innerHTML, /CO-UNO/);
  assertAbsent(pol.innerHTML, 'PAIS-CONTRADICTORIO', 'GT-UNO');
  assert.equal(pol.value, 'cop1');
  host.querySelector('#wa-tpl').value = 'renov';
  host.querySelector('#wa-tpl').fire('change');
  assert.match(host.querySelector('#wa-msg').value, /CO-UNO/);
  assert.match(host.querySelector('#wa-msg').value, /DATE\(2026-11-03\)/);

  host.querySelector('#wa-tpl').value = 'cobro';
  host.querySelector('#wa-tpl').fire('change');
  assert.match(host.querySelector('#wa-msg').value, /\{fecha\}/);
  assert.match(host.querySelector('#wa-msg').value, /\{medios\}/);
  host.querySelector('#wa-send').fire('click');
  assert.match(env.toasts.at(-1), /Completa y verifica/);

  host.querySelector('#wa-cli').value = 'gt1';
  host.querySelector('#wa-msg').value = 'Texto sin variables';
  host.querySelector('#wa-send').fire('click');
  assert.match(env.toasts.at(-1), /Destinatario no disponible/);

  host.querySelector('#wa-cli').value = 'co1';
  env.data.clientes.find(c => c.id === 'co1')._hidden = true;
  host.querySelector('#wa-api').fire('click');
  assert.match(env.toasts.at(-1), /Destinatario no disponible/);
  assert.equal(env.writes.length, 0);
}

{
  const env = setup('GT');
  const host = env.host();
  env.Orbit.modules.notificaciones.render(host);
  assertAbsent(host.innerHTML, 'COLOMBIA UNO', 'COLOMBIA DOS');
  host.querySelector('#wa-cli').value = 'gt1';
  host.querySelector('#wa-cli').fire('change');
  assert.equal(host.querySelector('#wa-pol').value, '', 'Multiple policies must not auto-select');
  host.querySelector('#wa-tpl').value = 'renov';
  host.querySelector('#wa-tpl').fire('change');
  assert.match(host.querySelector('#wa-msg').value, /\{poliza\}/);
  host.querySelector('#wa-send').fire('click');
  assert.match(env.toasts.at(-1), /Selecciona la póliza correcta/);
  host.querySelector('#wa-pol').value = 'gtp2';
  host.querySelector('#wa-pol').fire('change');
  assert.match(host.querySelector('#wa-msg').value, /GT-DOS/);
  assert.match(host.querySelector('#wa-msg').value, /DATE\(2026-12-02\)/);
  assertAbsent(host.querySelector('#wa-msg').value, 'GT-UNO');
  assert.equal(env.writes.length, 0);
}

{
  const env = setup('CO');
  const host = env.host();
  env.Orbit.modules.portal.render(host);
  assert.match(host.innerHTML, /COLOMBIA UNO/);
  assertAbsent(host.innerHTML, 'GUATEMALA UNO', 'FUERA DE ALCANCE', 'PAIS SIN VALIDAR');
  host.querySelector('#pt-cli').value = 'co2';
  host.querySelector('#pt-cli').fire('change');
  assert.match(host.innerHTML, /Hola, COLOMBIA/);
  env.data.clientes.find(c => c.id === 'co2')._hidden = true;
  env.Orbit.modules.portal.render(host);
  assertAbsent(host.innerHTML, 'COLOMBIA DOS');
  env.Orbit.pais = 'GT';
  env.Orbit.modules.portal.render(host);
  assert.match(host.innerHTML, /GUATEMALA UNO/);
  assertAbsent(host.innerHTML, 'COLOMBIA UNO');

  host.querySelector('#pt-admin').fire('click');
  const popup = env.drawer();
  assert.ok(popup);
  assert.match(popup.innerHTML, /Todos los clientes del ámbito visible/);
  assertAbsent(popup.innerHTML, 'COLOMBIA UNO', 'FUERA DE ALCANCE');
  popup.querySelector('#an-dest').value = 'co1';
  popup.querySelector('#an-tit').value = 'Prueba';
  popup.querySelector('#an-msg').value = 'Prueba';
  popup.querySelector('#dr-ok').fire('click');
  assert.equal(env.writes.length, 0);
}

{
  const everyone = setup('TODOS');
  const host = everyone.host();
  everyone.Orbit.modules.notificaciones.render(host);
  assert.match(host.innerHTML, /GUATEMALA UNO/);
  assert.match(host.innerHTML, /COLOMBIA UNO/);
  assertAbsent(host.innerHTML, 'FUERA DE ALCANCE', 'PAIS SIN VALIDAR');
  const none = setup('MX');
  const noClients = none.host();
  none.Orbit.modules.portal.render(noClients);
  assert.match(noClients.innerHTML, /Sin clientes disponibles/);
  const missingAccess = setup('GT', false);
  const noRights = missingAccess.host();
  missingAccess.Orbit.modules.notificaciones.render(noRights);
  assertAbsent(noRights.innerHTML, 'GUATEMALA UNO');
  missingAccess.Orbit.modules.portal.render(noRights);
  assert.match(noRights.innerHTML, /Sin clientes disponibles/);
  assert.equal(everyone.writes.length + none.writes.length + missingAccess.writes.length, 0);
}

console.log('GI_B4_003_WA_PORTAL_COUNTRY_POLICY_SYNTHETIC_PASS no_network_no_writes');
