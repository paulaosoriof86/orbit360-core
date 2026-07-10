import fs from 'node:fs';
import vm from 'node:vm';

const Orbit = {};
const context = {
  window: { Orbit }, Orbit, console, Date, Math, Set, Array,
  String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js',
  'orbit360-platform/core/knowledge-binding-gate-p08.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const api = Orbit.knowledgeBindingGateP08;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sheetEvidence = { mediaKind: 'spreadsheet', sheet: 'Tarifas', range: 'A1:C10' };
const pdfEvidence = { mediaKind: 'pdf', page: 2, block: 'coverage' };

const makeRule = (id, vehicleType, extra = {}) => ({
  id,
  tenantId: 'tenant-demo',
  aseguradoraId: 'insurer-a',
  documentoFuenteId: 'doc-xls',
  versionFuente: 'v1',
  estado: 'validated_pending_enablement',
  amountBasis: 'net',
  dimensiones: {
    pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
    producto: 'Seguro de vehículo', tipoVehiculo: vehicleType
  },
  sourceEvidence: [sheetEvidence],
  outputRoute: { routeKey: `route_${vehicleType || 'generic'}`, evidence: sheetEvidence },
  components: [{ evidence: sheetEvidence }],
  ...extra
});

const makeProfile = (id, insurerId, vehicleType, extra = {}) => ({
  id,
  tenantId: 'tenant-demo',
  documentId: `doc-${id}`,
  aseguradoraId: insurerId,
  estado: 'validated_pending_enablement',
  dimensiones: {
    pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
    producto: 'Seguro de vehículo', tipoVehiculo: vehicleType
  },
  presentation: {
    estado: 'validated_pending_enablement',
    documentoFuenteId: `doc-${id}`,
    secciones: [{
      tituloFuente: 'Coberturas',
      sourceLocation: pdfEvidence,
      campos: [{ etiquetaFuente: 'Daños', sourceLocation: pdfEvidence }]
    }]
  },
  ...extra
});

const autoRule = makeRule('rule-auto', 'Automóvil');
const microRule = makeRule('rule-micro', 'Microbús');
const genericRule = makeRule('rule-generic', '', {
  outputRoute: { routeKey: 'route_generic', evidence: sheetEvidence }
});
const autoProfile = makeProfile('profile-auto', 'insurer-a', 'Automóvil');
const microProfile = makeProfile('profile-micro', 'insurer-a', 'Microbús');
const externalProfile = makeProfile('profile-external', 'insurer-b', 'Camioneta');

const built = api.buildBindings({
  rules: [genericRule, autoRule, microRule],
  profiles: [autoProfile, microProfile, externalProfile]
});
assert(built.summary.complete === 2, 'Debe generar dos vínculos completos');
assert(built.summary.presentationOnly === 1, 'Debe conservar propuesta externa sin tarifa');

const autoBinding = built.bindings.find(item => item.profileId === 'profile-auto');
assert(autoBinding.ruleIds.includes('rule-auto'), 'La regla específica debe enlazarse');
assert(!autoBinding.ruleIds.includes('rule-generic'), 'La regla genérica no debe desplazar a la específica');

const externalBinding = built.bindings.find(item => item.profileId === 'profile-external');
assert(!api.evaluateBinding(externalBinding, 'cotizador_automatico', {}).ready, 'Una presentación sola no habilita cotización automática');
assert(api.evaluateBinding(externalBinding, 'cotizador_pdf_externo', {}).ready, 'Una presentación validada sí habilita el flujo PDF externo');
assert(api.evaluateBinding(externalBinding, 'comparativo', {}).ready, 'Una presentación validada sí puede alimentar Comparativo');
assert(api.evaluateBinding(autoBinding, 'cotizador_automatico', {}).ready, 'El vínculo completo debe quedar listo para segundo gate');
assert(!api.evaluateBinding(autoBinding, 'cotizador_automatico', { modules: { cotizador: false } }).ready, 'El tenant puede desactivar Cotizador');

const denied = api.buildEnablementPlan(
  autoBinding,
  { target: 'cotizador_automatico', reason: 'Prueba', confirmed: true },
  { id: 'user-advisor', activeRole: 'Asesor', roles: ['Asesor'] },
  {}
);
assert(!denied.ok, 'Asesor no puede habilitar conocimiento global');

const approved = api.buildEnablementPlan(
  autoBinding,
  { target: 'cotizador_automatico', reason: 'Fuentes y evidencia verificadas', confirmed: true },
  { id: 'user-admin', activeRole: 'AdminTenant', roles: ['AdminTenant'] },
  {}
);
assert(approved.ok, 'AdminTenant debe poder preparar el plan');
assert(approved.plan.status === 'approved_pending_external_write', 'El plan no debe escribir directamente');

const runtime = api.buildRuntimePackage(built.bindings, [approved.plan]);
assert(runtime.ok && runtime.records.length === 1, 'Debe crear paquete para writer externo');
assert(runtime.writeAllowed === false && runtime.requiresExternalWriter, 'Debe conservar frontera de escritura');

const changedBinding = JSON.parse(JSON.stringify(autoBinding));
changedBinding.ruleIds.push('rule-after-gate');
const stale = api.buildRuntimePackage([changedBinding], [approved.plan]);
assert(!stale.ok && stale.errors[0].includes('REEJECUTAR_GATE'), 'Un cambio posterior debe invalidar el gate');

const conflictingRule = makeRule('rule-auto-conflict', 'Automóvil', {
  components: [{ fixedAmount: 999, evidence: sheetEvidence }]
});
const conflict = api.buildBindings({ rules: [autoRule, conflictingRule], profiles: [autoProfile] });
assert(conflict.summary.conflicts === 1, 'Debe detectar reglas exactas contradictorias');

console.log('OK orbit360-test-knowledge-binding-gate-p08');
