import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {};
const context = {
  window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array,
  String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/tariff-rule-proposal-p06.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const api = orbit.tariffRuleProposalP06;
function assert(condition, message) { if (!condition) throw new Error(message); }
const ev = (sheet, range) => ({ mediaKind: 'spreadsheet', documentId: 'doc-demo', sheet, range });

const common = {
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentoFuenteId: 'doc-demo',
  pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Auto', versionFuente: 'v1',
  amountBasis: 'net', sourceEvidence: [ev('Reglas', 'A1:F20')], confidence: 90
};

const auto = api.normalizeRule({
  ...common,
  nombre: 'Auto particular', tipoVehiculo: 'Automóvil', calculationType: 'rate_with_minimum',
  applicability: { tiposVehiculo: ['Automóvil'], usosVehiculo: ['Particular'] },
  components: [
    { tipo: 'base_premium', calculationType: 'rate_with_minimum', rate: 0.031, minimum: 2500, evidence: ev('Tarifas', 'B2:D8') },
    { tipo: 'issuance_expense', calculationType: 'rate', rate: 0.05, taxable: true, evidence: ev('Cálculos', 'E2') },
    { tipo: 'tax', calculationType: 'rate', rate: 0.12, evidence: ev('Cálculos', 'E3') }
  ],
  financingSchedules: [
    { nombre: 'Contado', installments: 1, surchargeRate: 0, evidence: ev('Pagos', 'A2:C2') },
    { nombre: 'Fraccionado', installments: 10, surchargeRate: 0.1, evidence: ev('Pagos', 'A3:C3') }
  ],
  outputRoute: { mode: 'single_output', routeKey: 'auto_particular', outputSheet: 'Cotización Auto', printArea: 'A1:N60', evidence: ev('Cotización Auto', 'A1:N60') }
});
const pickup = api.normalizeRule({
  ...common,
  nombre: 'Pickup particular', tipoVehiculo: 'Pick Up', calculationType: 'rate_with_minimum',
  applicability: { tiposVehiculo: ['Pick Up'], usosVehiculo: ['Particular'] },
  components: [{ tipo: 'base_premium', calculationType: 'rate_with_minimum', rate: 0.032, minimum: 2700, evidence: ev('Tarifas', 'H2:J8') }],
  outputRoute: { mode: 'single_output', routeKey: 'pickup_particular', outputSheet: 'Cotización Pickup', evidence: ev('Cotización Pickup', 'A1:N60') }
});
assert(api.validateRule(auto).valid, 'Regla de auto sintética debe validar');
assert(api.validateRule(pickup).valid, 'Regla de pickup sintética debe validar');
const selectedAuto = api.buildOutputSelection([auto, pickup], { pais: 'GT', producto: 'Auto', tipoVehiculo: 'Automóvil', usoVehiculo: 'Particular' });
assert(selectedAuto.ok && selectedAuto.routeKey === 'auto_particular', 'Debe elegir solo la salida del tipo de vehículo seleccionado');
assert(selectedAuto.selectedRules.length === 1 && selectedAuto.rendersSingleVehicleOrRisk, 'No debe mezclar vehículos en una cotización');
const selectedPickup = api.buildOutputSelection([auto, pickup], { pais: 'GT', producto: 'Auto', tipoVehiculo: 'Pick Up', usoVehiculo: 'Particular' });
assert(selectedPickup.routeKey === 'pickup_particular', 'Debe cambiar ruta al cambiar vehículo');

const commercial = api.normalizeRule({
  ...common,
  nombre: 'Vehículo comercial', tipoVehiculo: 'Camión', usoVehiculo: 'Comercial',
  calculationType: 'rate_plus_fixed_with_minimum',
  applicability: { tiposVehiculo: ['Camión'], usosVehiculo: ['Comercial'] },
  components: [
    { tipo: 'base_premium', calculationType: 'rate_plus_fixed_with_minimum', rate: 0.055, fixedAmount: 4500, minimum: 5000, evidence: ev('Tarifas comerciales', 'B12:F18') },
    { tipo: 'assistance', calculationType: 'fixed', fixedAmount: 300, taxable: true, evidence: ev('Asistencias', 'A2:B10') }
  ],
  outputRoute: { mode: 'single_output', routeKey: 'comercial_camion', outputSheet: 'Cotización Comercial', evidence: ev('Cotización Comercial', 'A1:O70') }
});
assert(api.validateRule(commercial).valid, 'Debe admitir tasa más fijo con mínimo y asistencia');

const health = api.normalizeRule({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentoFuenteId: 'doc-health',
  pais: 'GT', moneda: 'GTQ', ramo: 'Salud', producto: 'Gastos Médicos', plan: 'Plan A',
  versionFuente: 'v1', nombre: 'Salud individual/familiar',
  calculationType: 'matrix_age_gender_maternity', amountBasis: 'net',
  applicability: { modalidades: ['Individual', 'Familiar'], edadesDesde: 0, edadesHasta: 89 },
  rateTable: [
    { ageFrom: 20, ageTo: 29, gender: 'F', maternity: true, value: 500 },
    { ageFrom: 20, ageTo: 29, gender: 'F', maternity: false, value: 420 },
    { ageFrom: 20, ageTo: 29, gender: 'M', maternity: false, value: 390 }
  ],
  components: [
    { tipo: 'dental', nombre: 'Dental individual', calculationType: 'fixed', fixedAmount: 30, optional: true, applicability: { modalidades: ['Individual'] }, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Dental', range: 'B2:D4' } },
    { tipo: 'dental', nombre: 'Dental familiar', calculationType: 'household_tier', optional: true, applicability: { modalidades: ['Familiar'] }, lookupTable: [{ membersFrom: 2, membersTo: 8, value: 80 }], evidence: { mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Dental', range: 'B5:D8' } },
    { tipo: 'issuance_expense', calculationType: 'rate', rate: 0.05, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Cálculos', range: 'F2' } },
    { tipo: 'tax', calculationType: 'rate', rate: 0.12, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Cálculos', range: 'F3' } }
  ],
  sourceEvidence: [{ mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Planes', range: 'A1:M90' }],
  outputRoute: { mode: 'plan_output', routeKey: 'salud_plan_a', outputSheet: 'Plan A', evidence: { mediaKind: 'spreadsheet', documentId: 'doc-health', sheet: 'Plan A', range: 'A1:N80' } },
  confidence: 88
});
assert(api.validateRule(health).valid, 'Matriz de edad/género/maternidad completa debe validar');
assert(api.ruleMatches(health, { pais: 'GT', producto: 'Gastos Médicos', plan: 'Plan A', modalidad: 'Familiar', edad: 35 }), 'Salud debe admitir modalidad familiar');

const gross = api.normalizeRule({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentoFuenteId: 'doc-gross',
  pais: 'GT', moneda: 'GTQ', ramo: 'Salud', producto: 'Salud mensual', plan: 'Plan B',
  calculationType: 'gross_table', amountBasis: 'gross_includes_tax_and_fees',
  rateTable: [{ ageFrom: 20, ageTo: 29, value: 700 }],
  components: [{ tipo: 'tax', calculationType: 'rate', rate: 0.12, includedInGross: false, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-gross', sheet: 'Tabla', range: 'A2:C4' } }],
  sourceEvidence: [{ mediaKind: 'spreadsheet', documentId: 'doc-gross', sheet: 'Tabla', range: 'A1:G30' }],
  outputRoute: { mode: 'plan_output', routeKey: 'salud_plan_b', outputSheet: 'Plan B', evidence: { mediaKind: 'spreadsheet', documentId: 'doc-gross', sheet: 'Plan B', range: 'A1:M60' } }
});
assert(api.validateRule(gross).errors.includes('DOBLE_IMPUESTO_RIESGO'), 'Tabla bruta no debe volver a sumar IVA');

const withoutEvidence = api.normalizeRule({
  ...common, nombre: 'Sin evidencia', calculationType: 'fixed',
  components: [], sourceEvidence: [],
  outputRoute: { mode: 'single_output', routeKey: 'sin_evidencia' }
});
assert(api.validateRule(withoutEvidence).warnings.includes('EVIDENCIA_REGLA_REQUERIDA'), 'Debe advertir ausencia de evidencia');

const conflictA = api.normalizeRule({ ...common, id: 'rule-a', nombre: 'Misma regla', calculationType: 'fixed', components: [{ tipo: 'base_premium', fixedAmount: 1000, evidence: ev('Tarifas', 'A1') }], outputRoute: { mode: 'single_output', routeKey: 'route-x', evidence: ev('Salida', 'A1:F20') } });
const conflictB = api.normalizeRule({ ...common, id: 'rule-b', nombre: 'Misma regla', calculationType: 'fixed', components: [{ tipo: 'base_premium', fixedAmount: 1200, evidence: ev('Tarifas', 'A1') }], outputRoute: { mode: 'single_output', routeKey: 'route-x', evidence: ev('Salida', 'A1:F20') } });
const diff = api.buildRuleDiff([], [conflictA, conflictB]);
assert(diff.summary.conflicts === 1, 'Debe detectar reglas contradictorias con la misma clave');
const blockedPlan = api.buildValidatedPlan(diff, [
  { ruleId: 'rule-a', action: 'confirm', reason: 'Validación sintética' },
  { ruleId: 'rule-b', action: 'confirm', reason: 'Validación sintética' }
], { actorId: 'actor-demo', activeRole: 'Admin' });
assert(!blockedPlan.ok && blockedPlan.errors.some(item => item.code === 'CONFLICTO_NO_RESUELTO'), 'No debe confirmar conflictos sin resolver');

const cleanDiff = api.buildRuleDiff([], [auto, health]);
const plan = api.buildValidatedPlan(cleanDiff, [
  { ruleId: auto.id, action: 'confirm', reason: 'Fuente y fórmula verificadas' },
  { ruleId: health.id, action: 'confirm', reason: 'Matriz y variantes verificadas' }
], { actorId: 'actor-demo', activeRole: 'Direccion' });
assert(plan.ok && plan.records.length === 2, 'Debe preparar reglas validadas');
assert(plan.records.every(rule => rule.estado === 'validated_pending_enablement'), 'Validación no debe habilitar automáticamente');
assert(plan.requiresSecondGateForEnablement && !plan.enabled && plan.writeAllowed === false, 'Debe conservar segundo gate y cero escritura');

const coverage = api.summarizeCoverage([auto, pickup, commercial, health]);
assert(coverage.totalRules === 4 && coverage.totalCombinations >= 4, 'Debe resumir combinaciones por producto/vehículo/plan');

const serialized = JSON.stringify({ auto, pickup, commercial, health, plan });
assert(!/cliente@|password|token|base64|fileBytes/i.test(serialized), 'Smoke no debe contener PII, secretos o binarios');
console.log('OK orbit360-test-tariff-rule-proposal-p06');