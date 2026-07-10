import fs from 'node:fs';
import vm from 'node:vm';

const Orbit = {};
const context = { window: { Orbit }, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/tariff-rule-proposal-p06.js',
  'orbit360-platform/core/excel-rule-proposal-adapter-p06b.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const api = Orbit.excelRuleProposalAdapterP06b;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const ev = range => ({ mediaKind: 'spreadsheet', documentId: 'doc-demo', sheet: 'Tarifas', range, method: 'deterministic_excel_rule_facts_p06b' });
const facts = [
  { id: 'rate', factType: 'rate', label: 'Tasa', value: 0.03, numericValue: 0.03, valueKind: 'rate', evidence: ev('B2') },
  { id: 'min', factType: 'minimum_premium', label: 'Prima mínima', value: 1000, numericValue: 1000, valueKind: 'amount', evidence: ev('B3') },
  { id: 'assist', factType: 'assistance', label: 'Asistencia', value: 200, numericValue: 200, valueKind: 'amount', evidence: ev('B4') },
  { id: 'pay6', factType: 'installment', label: '6 pagos', value: 6, numericValue: 6, valueKind: 'number', evidence: ev('B5') },
  { id: 'sur6', factType: 'financing_surcharge', label: '6 pagos', value: 0.05, numericValue: 0.05, valueKind: 'rate', evidence: ev('C5') },
  { id: 'plan', factType: 'plan', label: 'Plan A', value: 'Plan A', numericValue: null, evidence: ev('A1') }
];
const manifest = {
  schemaVersion: 'orbit360_excel_rule_facts_p06b_v1',
  document: { id: 'doc-demo', tenantId: 'tenant-demo', aseguradoraId: 'insurer-demo', version: 'v1', fileName: 'tariff.xlsx' },
  facts,
  candidateTables: [],
  outputRoutes: [{ id: 'route-a', sheet: 'Cotización A', printAreas: ['A1:H40'], evidence: { ...ev('A1:H40'), sheet: 'Cotización A' } }],
  candidateGroups: [{
    id: 'group-a', groupKey: 'plan-a', sheet: 'Tarifas', sectionAnchor: 'Plan A', semanticCluster: 'pricing',
    dimensionsProposal: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil', plan: 'Plan A' },
    factIds: facts.map(f => f.id), recommendedCalculationType: 'rate_plus_fixed_with_minimum', outputRouteIds: ['route-a'], confidence: 90
  }],
  flags: { containsCustomerPayload: false, containsSecrets: false, macrosExecuted: false }
};
const template = api.mappingTemplate(manifest);
assert(template.ok && template.combinations.length === 1, 'Debe preparar plantilla');
const auto = api.autoMapSimpleTariff(manifest);
assert(auto.ok && auto.combinations.length === 1, 'Debe proponer mapping simple');
const result = api.buildRuleProposals(manifest, auto, {});
assert(result.ok && result.rules.length === 1, 'Debe construir regla propuesta');
const rule = result.rules[0];
assert(rule.components.some(c => c.tipo === 'base_premium' && c.rate === 0.03 && c.minimum === 1000), 'Debe combinar tasa y mínimo');
assert(rule.components.some(c => c.tipo === 'assistance' && c.fixedAmount === 200), 'Debe conservar asistencia');
assert(rule.financingSchedules.some(f => f.installments === 6 && f.surchargeRate === 0.05), 'Debe emparejar cuotas y recargo');
assert(rule.outputRoute.outputSheet === 'Cotización A', 'Debe conservar ruta');
assert(rule.estado === 'requires_validation' || rule.estado === 'proposed', 'Debe quedar como propuesta');
assert(rule.enabledCotizador === false && rule.enabledComparativo === false && result.writeAllowed === false, 'No debe habilitar ni escribir');
const financingOnly = { ...manifest, candidateGroups: [{ ...manifest.candidateGroups[0], id: 'finance-only', factIds: ['pay6', 'sur6'], semanticCluster: 'financing' }] };
const financingMap = api.autoMapSimpleTariff(financingOnly);
assert(financingMap.combinations.length === 0 && financingMap.unmappedFinancingGroups.length === 1, 'Financiamiento global no debe asignarse a un plan por inferencia');
assert(financingMap.warnings.includes('FINANCING_SCOPE_REQUIRES_MAPPING'), 'Debe exigir scope de financiamiento');
const invalid = api.buildRuleProposals({ document: {}, facts: [] }, { combinations: [] }, {});
assert(!invalid.ok && invalid.code === 'DOCUMENTO_REQUERIDO', 'Debe validar manifiesto');
assert(!/password|apiKey|token/.test(JSON.stringify(result)), 'No debe contener secretos');
console.log('OK orbit360-test-excel-rule-proposal-adapter-p06b');
