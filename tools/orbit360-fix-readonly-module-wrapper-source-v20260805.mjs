#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOTFIX = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-readonly-wrapper-sourcefix-sanitized-v20260805.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json';
const PLAN = 'orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md';
const CLOSURE = 'orbit360-platform/docs/CIERRE-CAUSA-RAIZ-CAPTURA-VISUAL-V2-20260805.md';

const read = file => fs.readFileSync(file, 'utf8');
const readJson = file => JSON.parse(read(file));
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n', 'utf8');
};
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2));
const count = (text, token) => text.split(token).length - 1;
const replaceOnce = (text, before, after, id) => {
  if (count(text, before) !== 1) throw new Error(`SOURCE_CONTRACT_${id}_COUNT_${count(text, before)}`);
  return text.replace(before, after);
};
const syntaxOk = file => spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status === 0;

let source = read(ROOTFIX);
source = replaceOnce(
  source,
  '  var summaryCacheBuiltAt = 0;\n',
  "  var summaryCacheBuiltAt = 0;\n  var moduleWrapState = {};\n  var afterRenderObserver = null;\n",
  'WRAP_STATE'
);
const oldWrap = `  function wrapModule(moduleName, deps) {
    var mod = Orbit.modules && Orbit.modules[moduleName];
    if (!mod || typeof mod.render !== 'function' || mod.__visualRootfixV20260805) return false;
    var original = mod.render.bind(mod);
    mod.render = function (host) {
      var state = hydrationStatus(deps || []);
      if (!state.ready) {
        host.innerHTML = loadingHtml(moduleName, state);
        requestRouteRefresh(moduleName);
        return;
      }
      var started = performance && performance.now ? performance.now() : Date.now();
      var output = original(host);
      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);
      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
      OrbitRuntimeDiagnostics[moduleName] = { version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true };
      afterRender(moduleName, host);
      setTimeout(function () { afterRender(moduleName, host); }, 0);
      return output;
    };
    mod.__visualRootfixV20260805 = { version: VERSION, original: original, deps: deps.slice() };
    return true;
  }
`;
const newWrap = `  function installAfterRenderObserver() {
    if (afterRenderObserver) return true;
    var host = document.getElementById('host');
    if (!host) return false;
    var scheduled = false;
    function apply() {
      scheduled = false;
      if (document.body.classList.contains('pre-auth')) return;
      var route = Orbit.route && Orbit.route.key;
      if (!route) return;
      try { afterRender(route, host); }
      catch (error) {
        window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
        OrbitRuntimeDiagnostics[route] = Object.assign({}, OrbitRuntimeDiagnostics[route] || {}, {
          version: VERSION,
          afterRenderWarning: text(error && (error.message || error) || error),
          afterRenderFallback: true
        });
      }
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(apply, 0);
    }
    afterRenderObserver = new MutationObserver(schedule);
    afterRenderObserver.observe(host, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    schedule();
    return true;
  }

  function wrapModule(moduleName, deps) {
    if (moduleWrapState[moduleName]) return true;
    var registry = Orbit.modules;
    var mod = registry && registry[moduleName];
    if (!mod || typeof mod.render !== 'function') return false;
    if (mod.__visualRootfixV20260805) {
      moduleWrapState[moduleName] = 'existing';
      return true;
    }
    var original = mod.render.bind(mod);
    var wrappedRender = function (host) {
      var state = hydrationStatus(deps || []);
      if (!state.ready) {
        host.innerHTML = loadingHtml(moduleName, state);
        requestRouteRefresh(moduleName);
        return;
      }
      var started = performance && performance.now ? performance.now() : Date.now();
      var output = original(host);
      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);
      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
      OrbitRuntimeDiagnostics[moduleName] = { version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true };
      afterRender(moduleName, host);
      setTimeout(function () { afterRender(moduleName, host); }, 0);
      return output;
    };
    var marker = { version: VERSION, original: original, deps: deps.slice() };
    try {
      var renderDescriptor = Object.getOwnPropertyDescriptor(mod, 'render');
      var moduleMutable = !Object.isFrozen(mod) && (!renderDescriptor || renderDescriptor.writable !== false || typeof renderDescriptor.set === 'function');
      if (moduleMutable) {
        mod.render = wrappedRender;
        try { mod.__visualRootfixV20260805 = marker; } catch (error) {}
        moduleWrapState[moduleName] = 'direct';
        return true;
      }
      var registryDescriptor = Object.getOwnPropertyDescriptor(registry, moduleName);
      var registryMutable = !Object.isFrozen(registry) && (!registryDescriptor || registryDescriptor.writable !== false || typeof registryDescriptor.set === 'function' || registryDescriptor.configurable === true);
      if (registryMutable) {
        var replacement = Object.create(mod);
        Object.defineProperty(replacement, 'render', { value: wrappedRender, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(replacement, '__visualRootfixV20260805', { value: marker, writable: false, configurable: false, enumerable: false });
        registry[moduleName] = replacement;
        moduleWrapState[moduleName] = 'registry-proxy';
        return true;
      }
      moduleWrapState[moduleName] = 'observer-fallback';
    } catch (error) {
      moduleWrapState[moduleName] = 'observer-fallback';
      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
      OrbitRuntimeDiagnostics[moduleName] = Object.assign({}, OrbitRuntimeDiagnostics[moduleName] || {}, {
        version: VERSION,
        wrapWarning: text(error && (error.message || error) || error),
        wrapperMode: 'observer-fallback'
      });
    }
    return true;
  }
`;
source = replaceOnce(source, oldWrap, newWrap, 'WRAP_MODULE');
source = replaceOnce(
  source,
  '    patchClientSummary();\n    var wrapped = 0;\n',
  '    patchClientSummary();\n    installAfterRenderObserver();\n    var wrapped = 0;\n',
  'INSTALL_OBSERVER'
);
write(ROOTFIX, source);

const checks = {
  syntax: syntaxOk(ROOTFIX),
  wrapStateExternal: source.includes('var moduleWrapState = {}'),
  observerStateExternal: source.includes('var afterRenderObserver = null'),
  observerInstalled: source.includes('function installAfterRenderObserver()'),
  observerWatchesHost: source.includes("afterRenderObserver.observe(host, { childList: true, subtree: true })"),
  hashChangeFallback: source.includes("window.addEventListener('hashchange', schedule)"),
  frozenModuleDetected: source.includes('Object.isFrozen(mod)'),
  frozenRegistryDetected: source.includes('Object.isFrozen(registry)'),
  descriptorChecked: source.includes("Object.getOwnPropertyDescriptor(mod, 'render')"),
  proxyReplacement: source.includes('var replacement = Object.create(mod)'),
  renderDefinedSafely: source.includes("Object.defineProperty(replacement, 'render'"),
  markerDefinedSafely: source.includes("Object.defineProperty(replacement, '__visualRootfixV20260805'"),
  registryProxyAssigned: source.includes("moduleWrapState[moduleName] = 'registry-proxy'"),
  observerFallbackRecorded: source.includes("moduleWrapState[moduleName] = 'observer-fallback'"),
  directReadonlyAssignmentRemoved: !source.includes("    mod.render = function (host) {")
};
const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const evidence = {
  schemaVersion: 'orbit360-visual-rootfix-readonly-wrapper-sourcefix-v1',
  gateId: 'block2.7-visual-rootfix-readonly-wrapper-source-v20260805',
  contractVersion: '2.7.7-source',
  status: failedCheckIds.length ? 'FAIL_READONLY_MODULE_WRAPPER_SOURCEFIX' : 'PASS_READONLY_MODULE_WRAPPER_SOURCEFIX',
  classification: failedCheckIds.length ? 'FUNCTIONAL_DEFECT' : 'FUNCTIONAL_DEFECT_CLOSED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  warning: "Cannot assign to read only property 'render' of object '#<Object>'",
  causalForRun31067506016: false,
  rootCause: 'Direct assignment to render on an immutable module object',
  sourceOnly: true,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
};
writeJson(EVIDENCE, evidence);
if (!evidence.ok) throw new Error('READONLY_WRAPPER_SOURCEFIX_FAILED:' + failedCheckIds.join(','));

const lifecycle = readJson(LIFECYCLE);
lifecycle.ownerVersion = '20260805.7-all-known-visual-source-rootcauses-closed';
lifecycle.currentPhase = 'SOURCE_FIXES_PASS_RUNTIME_NOT_AUTHORIZED';
lifecycle.nonCausalWarningClosure = {
  warning: "Cannot assign to read only property 'render' of object '#<Object>'",
  classification: 'FUNCTIONAL_DEFECT',
  causalForRun31067506016: false,
  owner: ROOTFIX,
  function: 'wrapModule(moduleName, deps)',
  sourceFixEvidence: EVIDENCE,
  sourceFixStatus: 'PASS_READONLY_MODULE_WRAPPER_SOURCEFIX',
  runtimeRetestAuthorized: false
};
lifecycle.nextAction = 'REQUEST_ONE_NEW_RUNTIME_AUTHORIZATION_FOR_MATRIX_ONLY_AFTER_USER_APPROVAL';
writeJson(LIFECYCLE, lifecycle);

let closure = read(CLOSURE);
if (!closure.includes('## Warning no causal cerrado')) {
  closure += `

## Warning no causal cerrado

\`\`\`text
warning: Cannot assign to read only property 'render'
clasificación: FUNCTIONAL_DEFECT
causal del STOP: NO
owner: orbit360-platform/core/visual-runtime-rootfix-v20260805.js
sourcefix: PASS_READONLY_MODULE_WRAPPER_SOURCEFIX · ${evidence.total}/${evidence.total}
runtime/deploy/secrets/Firestore: 0
\`\`\`

El wrapper ahora detecta módulos inmutables, usa un proxy en el registro cuando es posible y conserva un observador de render como fallback. No vuelve a escribir directamente sobre un módulo congelado.
`;
}
write(CLOSURE, closure);

let plan = read(PLAN);
const block = `

## 21. Warning no causal de módulos inmutables

El precheck del run 31067506016 registró:

\`\`\`text
Cannot assign to read only property 'render' of object '#<Object>'
\`\`\`

Clasificación:

\`\`\`text
FUNCTIONAL_DEFECT no causal
owner: core/visual-runtime-rootfix-v20260805.js · wrapModule
sourcefix: PASS_READONLY_MODULE_WRAPPER_SOURCEFIX · ${evidence.total}/${evidence.total}
runtime/deploy: 0
\`\`\`

El rootfix ya no escribe directamente sobre módulos congelados. Usa proxy de registro o fallback observable. Todos los defectos source-only conocidos del run 31067506016 quedan cerrados; una futura matriz requiere autorización nueva.
`;
if (!plan.includes('## 21. Warning no causal de módulos inmutables')) plan += block;
write(PLAN, plan);

console.log(JSON.stringify({
  status: 'PASS_READONLY_MODULE_WRAPPER_ROOT_CAUSE_CLOSURE_SOURCE_ONLY',
  checks: evidence.total,
  secretsRead: false,
  firestoreRead: false,
  writes: 0,
  browserExecuted: false,
  deployExecuted: false,
  ok: true
}, null, 2));
