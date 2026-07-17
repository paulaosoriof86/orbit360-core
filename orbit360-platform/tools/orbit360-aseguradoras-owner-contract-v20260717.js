#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const writes = [];
const data = { aseguradoras: [], asesores: [], polizas: [], cobros: [], comisiones: [], reclamos: [], gestiones: [], negocios: [] };
const store = {
  all: collection => data[collection] || [],
  get: (collection, id) => (data[collection] || []).find(item => item.id === id) || null,
  where: (collection, predicate) => (data[collection] || []).filter(predicate),
  insert: (...args) => writes.push(['insert', ...args]),
  update: (...args) => writes.push(['update', ...args]),
  remove: (...args) => writes.push(['remove', ...args])
};

const context = {
  console,
  setTimeout,
  clearTimeout,
  window: {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
    head: { appendChild() {} }
  },
  navigator: {},
  history: { replaceState() {} },
  location: { hash: '' },
  localStorage: { getItem() { return null; }, setItem() {} },
  Orbit: {
    ui: { esc: value => String(value ?? ''), toast() {}, prompt: async () => null, confirm: async () => false },
    kit: {},
    store,
    session: { rol: () => 'Dirección', asesorId: () => '' },
    auth: { user: () => ({ nombre: 'Prueba' }) },
    vault: { wire() {}, field: () => '' },
    tenant: { get: () => ({ tenantId: 'tenant-prueba' }) },
    services: {
      aseguradorasKnowledgeP09: {
        read: () => ({ ok: true, sources: [{ id: 'persisted1', nombre: 'Persistido', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', estado: 'metadata_persisted_pending_validation' }] })
      }
    },
    PAISES: [{ id: 'TODOS' }, { id: 'GT' }, { id: 'CO' }],
    pais: 'TODOS',
    modules: {},
    access: { can: () => true },
    importa: { open() {} }
  }
};
context.window = context;
context.window.Orbit = context.Orbit;
context.window.OrbitTenantInsurerConfigsP10 = [{ tenantId: 'tenant-prueba', preferredInsurerCountryOrder: ['CO', 'GT'] }];
context.window.OrbitTenantInsurerKnowledgeSummaries = [{
  tenantId: 'tenant-prueba',
  insurers: [{ insurerName: 'Prueba', sources: [{ documentId: 'mapped1', fileName: 'Mapeado', pais: 'CO', moneda: 'COP', ramo: 'Vida', estado: 'mapeado_pendiente_sincronizacion' }] }]
}];

vm.createContext(context);
const ownerPath = path.resolve(__dirname, '..', 'modules', 'aseguradoras.js');
vm.runInContext(fs.readFileSync(ownerPath, 'utf8'), context);

const moduleApi = context.Orbit.modules.aseguradoras;
const sources = moduleApi._fuentes;
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(moduleApi.__ownerKnowledgeV20260717 === true, 'Falta owner marker');
assert(moduleApi.__tenantOrderV20260717 === true, 'Falta tenant order marker');
assert(moduleApi.__consumerGatesSeparatedV20260717 === true, 'Falta consumer gate marker');

let evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Validado' });
assert(!evaluation.habilitadoCotizador && !evaluation.sirveParaComparativo && !evaluation.sirveParaTarifas, 'Validado no debe habilitar consumo');

evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Habilitado para Cotizador' });
assert(evaluation.habilitadoCotizador && !evaluation.sirveParaComparativo, 'Cotizador debe quedar separado');

evaluation = sources.evaluarFuente({ pais: 'GT', moneda: 'GTQ', ramo: 'Auto', tipo: 'tarifario', estado: 'Habilitado para Comparativo' });
assert(!evaluation.habilitadoCotizador && evaluation.sirveParaComparativo, 'Comparativo debe quedar separado');

const insurer = { id: 'a1', nombre: 'Prueba', pais: 'GT', docs: [{ id: 'local1', nombre: 'Ficha', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', estado: 'Validado' }] };
const rows = sources.knowledgeSources(insurer);
assert(rows.length === 3, 'Debe combinar mapeado, persistido y ficha');
assert(rows.some(item => item.estado === 'Mapeado'), 'Falta estado Mapeado');
assert(rows.some(item => item.estado === 'Persistido'), 'Falta estado Persistido');
assert(writes.length === 0, 'La proyección de conocimiento no puede escribir');
assert(sources.resumenGrupos(insurer).every(group => group.estado !== 'Habilitado'), 'Sin habilitación explícita el grupo debe quedar pendiente');

console.log(JSON.stringify({
  test: 'orbit360-aseguradoras-owner-contract-v20260717',
  status: 'PASS',
  writes: writes.length,
  states: rows.map(item => item.estado)
}, null, 2));
