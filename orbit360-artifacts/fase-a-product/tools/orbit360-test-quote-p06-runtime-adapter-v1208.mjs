import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }

let writes = 0;
const collections = {
  aseguradora_bindings: [{
    id: 'binding-auto', tenantId: 'alianzas-soluciones', aseguradoraId: 'ins-1',
    dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' },
    ruleIds: ['rule-auto'], enabledCotizadorAutomatico: false
  }],
  aseguradora_reglas_tarifarias: [{
    id: 'runtime-rule-auto', sourceItemId: 'rule-auto', tenantId: 'alianzas-soluciones', aseguradoraId: 'ins-1',
    estado: 'validated_pending_enablement', documentoFuenteId: 'doc-rate', versionFuente: '2026-v1', calculationType: 'rate_with_minimum',
    dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' },
    components: [{ tipo: 'base_premium' }, { tipo: 'tax', rate: 0.12 }],
    outputRoute: { routeKey: 'auto-output' }
  }]
};
const legacyAvailability = { ok: false, errors: ['configuracion_tarifa_validada_no_disponible'] };
const Orbit = {
  tenant: { get: () => ({ id: 'alianzas-soluciones' }) },
  config: {},
  store: {
    all: collection => collections[collection] || [],
    insert: () => { writes += 1; }, update: () => { writes += 1; }, remove: () => { writes += 1; }
  },
  quoteContracts: {
    automaticAvailability: () => legacyAvailability,
    calculateAutomatic: () => ({ ok: false, errors: ['legacy_blocked'] })
  },
  tariffRuleProposalP06: {
    ruleMatches: () => true,
    buildOutputSelection: rules => ({ ok: rules.length === 1, selectedRules: rules, outputRoute: rules[0] && rules[0].outputRoute, errors: rules.length === 1 ? [] : ['SIN_REGLA_APLICABLE'] })
  },
  tariffQuoteReconciliationP06c: {
    calculateRule: () => ({
      ok: true, blockers: [], warnings: [],
      totals: { basePremium: 3000, netBeforeFees: 3000, fees: 150, tax: 378, financing: 0, total: 3528 },
      lines: [{ type: 'base_premium', amount: 3000 }, { type: 'issuance_expense', amount: 150 }, { type: 'tax', amount: 378 }]
    })
  }
};
const window = { Orbit, location: { search: '?tenant=alianzas-soluciones' } };
window.window = window;
const context = { window, Orbit, URLSearchParams, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/quote-comparison-p06-runtime-adapter-v1208.js', 'utf8'), context);

const Q = Orbit.quoteContracts;
assert(Q.__p06RuntimeAdapterV1208, 'adapter debe registrarse');

let unavailable = Q.automaticAvailability('ins-1', { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' });
assert(!unavailable.ok, 'binding sin segundo gate debe permanecer bloqueado');
let blockedCalculation = Q.calculateAutomatic('ins-1', { pais: 'GT' }, { tipoVehiculo: 'Automóvil', valorAsegurado: 100000 }, { cuotas: 1 });
assert(!blockedCalculation.ok && blockedCalculation.errors.includes('legacy_blocked'), 'sin gate debe conservar fallback bloqueado');

collections.aseguradora_bindings[0].enabledCotizadorAutomatico = true;
const available = Q.automaticAvailability('ins-1', { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil', datosRiesgo: { valorAsegurado: 100000 } });
assert(available.ok && available.source === 'p06_binding', 'binding aprobado debe habilitar disponibilidad P06');
const calculated = Q.calculateAutomatic('ins-1', { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' }, { valorAsegurado: 100000, tipoVehiculo: 'Automóvil' }, { cuotas: 1 });
assert(calculated.ok && calculated.p06 === true, 'debe calcular mediante P06C');
assert(calculated.result.primaNeta === 3000, 'prima neta debe venir del motor P06C');
assert(calculated.result.gastosEmision === 150, 'gastos deben conservarse separados');
assert(calculated.result.ivaMonto === 378 && calculated.result.primaTotal === 3528, 'impuesto y total deben conservarse');
assert(calculated.trace.bindingId === 'binding-auto' && calculated.trace.reglaTarifariaId === 'rule-auto', 'trazabilidad debe conservar binding y regla original');
assert(calculated.trace.fuenteDocumentoId === 'doc-rate' && calculated.trace.versionFuente === '2026-v1', 'trazabilidad debe conservar fuente y versión');
assert(writes === 0, 'adapter no puede escribir en Orbit.store');

collections.aseguradora_bindings[0].enabledCotizadorAutomatico = false;
collections.aseguradora_bindings[0].target = 'cotizador_automatico';
collections.aseguradora_bindings[0].enabled = true;
assert(Q.automaticAvailability('ins-1', { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' }).ok, 'registro runtime del segundo gate también debe ser compatible');

assert(!Q.automaticAvailability('ins-2', { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' }).ok, 'binding no puede cruzarse entre aseguradoras');
console.log('OK orbit360-test-quote-p06-runtime-adapter-v1208');
