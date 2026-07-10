import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
let markup = '';
const listeners = [];
const refreshButton = { addEventListener(type, handler) { listeners.push({ type, handler }); } };
const panel = { querySelector(selector) { return selector === '[data-p09f-refresh]' ? refreshButton : null; }, outerHTML: '' };
const anchor = { insertAdjacentHTML(position, html) { markup = html; } };
const host = {
  firstElementChild: anchor,
  querySelector(selector) { return selector === '.cfg-note' ? anchor : null; },
  insertAdjacentHTML(position, html) { markup = html; }
};
const rows = {
  aseguradoras: [{ id: 'a1', tenantId: 'alianzas-soluciones', docs: [{ id: 'd1' }, { id: 'd2' }] }],
  aseguradora_manifiestos: [{ id: 'm1', tenantId: 'alianzas-soluciones' }],
  aseguradora_propuestas: [{ id: 'p1', tenantId: 'alianzas-soluciones' }],
  aseguradora_reglas_tarifarias: [{ id: 'r1', tenantId: 'alianzas-soluciones' }, { id: 'r2', tenantId: 'otro' }],
  aseguradora_presentaciones: [{ id: 'q1', tenantId: 'alianzas-soluciones' }],
  aseguradora_bindings: [],
  aseguradora_revisiones: [{ id: 'v1', tenantId: 'alianzas-soluciones' }]
};
const Orbit = {
  ui: { esc: value => String(value) },
  store: { all: collection => rows[collection] || [] },
  aseguradorasRuntimeBootstrapP09f: {
    status: () => ({ status: 'ready', bridge: { ok: false, code: 'BACKEND_REQUIRED' }, errors: [] }),
    preflight: () => ({ ok: true, errors: [] }),
    start: async () => ({ status: 'ready' })
  },
  aseguradorasLabCollectionsP09e: {
    status: () => ({ installed: true, snapshotAttachedCount: 6, collections: ['a','b','c','d','e','f'] })
  },
  aseguradorasFirstSourceP09f: {
    listPlans: () => [{ source: { nombre: 'Tasas ejemplo.xlsx' } }]
  }
};
const document = {
  querySelector(selector) { return selector === '#host .page' ? host : null; },
  getElementById(id) { return id === 'asg-knowledge-p09f' && markup ? panel : null; },
  addEventListener() {}
};
const window = {
  Orbit,
  OrbitBackend: { tenantId: 'alianzas-soluciones' },
  location: { hash: '#/aseguradoras' },
  addEventListener() {},
  dispatchEvent() {}
};
window.window = window;
const context = { window, document, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js', 'utf8'), context);

const api = Orbit.aseguradorasKnowledgePanelP09f;
const state = api.state();
assert(state.counts.sources === 2, 'debe contar fuentes visibles');
assert(state.counts.manifests === 1 && state.counts.rules === 1, 'debe filtrar colecciones por tenant');
assert(state.provider.code === 'BACKEND_REQUIRED', 'provider no conectado debe mostrarse honestamente');
assert(api.mount() === true, 'panel debe montarse en ruta Aseguradoras');
assert(markup.includes('Conocimiento documental de Aseguradoras'), 'panel debe mostrar título');
assert(markup.includes('BACKEND_REQUIRED'), 'panel debe mostrar provider pendiente');
assert(markup.includes('Tasas ejemplo.xlsx'), 'panel debe mostrar primera fuente planificada');
assert(listeners.some(item => item.type === 'click'), 'botón de actualización debe ser funcional');
const source = fs.readFileSync('orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js', 'utf8');
assert(!/\.insert\(|\.update\(|\.remove\(|setPref\(/.test(source), 'panel no debe escribir Orbit.store');
console.log('OK orbit360-test-aseguradoras-knowledge-panel-p09f');