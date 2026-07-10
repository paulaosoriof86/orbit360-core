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
  'orbit360-platform/core/knowledge-binding-gate-p08.js',
  'orbit360-platform/core/knowledge-binding-policy-p08.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const gate = Orbit.knowledgeBindingGateP08;
const policy = Orbit.knowledgeBindingPolicyP08;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sheetEvidence = { mediaKind: 'spreadsheet', sheet: 'Tarifas', range: 'A1:C10' };
const pdfEvidence = { mediaKind: 'pdf', page: 2, block: 'coverage' };

function binding(currency) {
  const rule = {
    id: 'rule-a', tenantId: 'tenant-demo', aseguradoraId: 'insurer-a',
    documentoFuenteId: 'doc-xls', estado: 'validated_pending_enablement',
    amountBasis: 'net', dimensiones: {
      pais: 'GT', moneda: currency, ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil'
    },
    sourceEvidence: [sheetEvidence], components: [{ evidence: sheetEvidence }],
    outputRoute: { routeKey: 'route-auto', evidence: sheetEvidence }
  };
  const profile = {
    id: 'profile-a', tenantId: 'tenant-demo', aseguradoraId: 'insurer-a',
    documentId: 'doc-pdf', estado: 'validated_pending_enablement',
    dimensiones: {
      pais: 'GT', moneda: currency, ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil'
    },
    presentation: {
      estado: 'validated_pending_enablement', documentoFuenteId: 'doc-pdf',
      secciones: [{ tituloFuente: 'Coberturas', sourceLocation: pdfEvidence, campos: [{ etiquetaFuente: 'Daños', sourceLocation: pdfEvidence }] }]
    }
  };
  return gate.buildBindings({ rules: [rule], profiles: [profile] }).bindings[0];
}

assert(policy.authoritative === true, 'La política estricta debe declararse autoritativa');

const missing = binding('');
const missingEval = policy.evaluateBinding(missing, 'cotizador_automatico', {});
assert(!missingEval.ready && missingEval.errors.includes('MONEDA_REQUIERE_VALIDACION'), 'Moneda faltante debe bloquear');
const missingViaPublicGate = gate.evaluateBinding(missing, 'cotizador_automatico', {});
assert(!missingViaPublicGate.ready && missingViaPublicGate.errors.includes('MONEDA_REQUIERE_VALIDACION'), 'El método público base debe quedar endurecido');

const gtq = binding('GTQ');
assert(policy.evaluateBinding(gtq, 'cotizador_automatico', {}).ready, 'GTQ debe ser moneda default válida para GT');

const usd = binding('USD');
const usdDefault = policy.evaluateBinding(usd, 'cotizador_automatico', {});
assert(!usdDefault.ready && usdDefault.errors.includes('MONEDA_NO_HABILITADA_PARA_PAIS'), 'USD no debe habilitarse por defecto');

const usdConfigured = policy.evaluateBinding(usd, 'cotizador_automatico', {
  paisesCfg: [{ codigo: 'GT', monedas: ['GTQ', 'USD'] }]
});
assert(usdConfigured.ready, 'Tenant puede habilitar USD expresamente para un producto/país');

const deniedPlan = gate.buildEnablementPlan(
  missing,
  { target: 'cotizador_automatico', reason: 'Prueba', confirmed: true },
  { id: 'admin-demo', activeRole: 'AdminTenant', roles: ['AdminTenant'] },
  {}
);
assert(!deniedPlan.ok && deniedPlan.plan === null, 'Gate público estricto no debe emitir plan sin moneda');

const approvedPlan = policy.buildEnablementPlan(
  gtq,
  { target: 'cotizador_automatico', reason: 'País, moneda y fuentes validadas', confirmed: true },
  { id: 'admin-demo', activeRole: 'AdminTenant', roles: ['AdminTenant'] },
  {}
);
assert(approvedPlan.ok && approvedPlan.plan, 'Gate estricto debe conservar aprobación válida');
assert(approvedPlan.writeAllowed === false && approvedPlan.requiresExternalWriter, 'Debe conservar writer externo');

console.log('OK orbit360-test-knowledge-binding-policy-p08');