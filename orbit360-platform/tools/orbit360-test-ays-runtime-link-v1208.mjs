import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const bridgePath = 'orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js';
const indexPath = 'orbit360-platform/index.html';
const bridge = fs.readFileSync(bridgePath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');

// Sintaxis: compilar sin ejecutar dependencias del navegador.
new vm.Script(bridge, { filename: bridgePath });

assert(bridge.includes("ctx.mode !== 'firestore-lab'"), 'runtime debe exigir firestore-lab');
assert(bridge.includes("ctx.tenantId !== 'alianzas-soluciones'"), 'runtime debe exigir tenant A&S');
assert(bridge.includes('core/backend-lab-security-guard.js'), 'debe cargar guard antes del bootstrap');
assert(bridge.includes('core/aseguradoras-runtime-bootstrap-p09f.js'), 'debe cargar bootstrap P09');
assert(bridge.indexOf('core/backend-lab-security-guard.js') < bridge.indexOf('core/aseguradoras-runtime-bootstrap-p09f.js'), 'guard debe preceder bootstrap');
assert(bridge.includes('enablesCotizador: false'), 'enlace no puede habilitar Cotizador');
assert(bridge.includes('enablesComparativo: false'), 'enlace no puede habilitar Comparativo');
assert(!bridge.includes('TASAS_DEF'), 'enlace no puede introducir tasas genéricas');
assert(!bridge.includes('localStorage'), 'enlace no puede usar almacenamiento operativo directo');
assert(!bridge.includes('firebase.firestore'), 'enlace no puede usar Firestore directo');
assert(bridge.includes('Sin recursos sensibles registrados'), 'copy técnico de sensibles debe traducirse');
assert(!bridge.includes('continúan en default-deny'), 'copy técnico default-deny no debe ser visible');

// El index conserva el bridge cargado después del módulo base y no requiere overlay del runtime A&S.
const modulePos = index.indexOf('modules/aseguradoras.js');
const bridgePos = index.indexOf('modules/aseguradoras-v1202-resources-bridge.js');
assert(modulePos >= 0 && bridgePos > modulePos, 'bridge debe cargar después del módulo Aseguradoras');
assert(!index.includes('core/aseguradoras-runtime-bootstrap-p09f.js'), 'runtime A&S no debe contaminar el index general');

// Ejecución mínima en un tenant ajeno: no debe insertar scripts.
let appended = 0;
const module = {
  __v1197Bridge: { canSensitive: () => false, state: {} },
  render: () => undefined
};
const context = {
  window: {
    location: { search: '?orbitBackend=firestore-lab&tenant=otro-tenant', hash: '' },
    OrbitBackend: { mode: 'firestore-lab', tenantId: 'otro-tenant' },
    dispatchEvent: () => undefined,
    MutationObserver: function () {}
  },
  Orbit: {
    modules: { aseguradoras: module },
    secureResources: {},
    ui: { esc: value => String(value), toast: () => undefined },
    store: { get: () => null }
  },
  document: {
    querySelectorAll: () => [],
    createElement: () => ({}),
    head: { appendChild: () => { appended += 1; } },
    documentElement: { appendChild: () => { appended += 1; } }
  },
  URLSearchParams,
  CustomEvent: function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; },
  MutationObserver: function MutationObserver() {},
  setTimeout,
  clearTimeout,
  Promise,
  Array,
  String,
  Object,
  Date,
  console
};
context.window.window = context.window;
context.window.document = context.document;
context.window.URLSearchParams = URLSearchParams;
context.window.CustomEvent = context.CustomEvent;
context.window.setTimeout = setTimeout;
context.window.Orbit = context.Orbit;
vm.createContext(context);
vm.runInContext(bridge, context, { filename: bridgePath });
await new Promise(resolve => setTimeout(resolve, 0));
assert(appended === 0, 'tenant ajeno no debe cargar runtime A&S');

console.log('OK orbit360-test-ays-runtime-link-v1208');
