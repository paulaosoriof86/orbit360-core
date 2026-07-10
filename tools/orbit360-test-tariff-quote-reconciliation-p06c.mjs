import fs from 'node:fs';
import vm from 'node:vm';

const Orbit = {};
const context = { window: { Orbit }, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/tariff-quote-reconciliation-p06c.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const api = Orbit.tariffQuoteReconciliationP06c;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sheet = { mediaKind: 'spreadsheet', documentId: 'doc-xls', sheet: 'Tarifas', range: 'A1:C20' };
const pdf = { mediaKind: 'pdf', documentId: 'doc-pdf', page: 1, block: 'total' };
const rule = {
  id: 'rule', documentoFuenteId: 'doc-xls', amountBasis: 'net',
  dimensiones: { pais: 'GT', moneda: 'GTQ', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil', plan: 'Plan A' },
  sourceEvidence: [sheet],
  components: [
    { id: 'base', tipo: 'base_premium', calculationType: 'rate_with_minimum', rate: .03, minimum: 1800, evidence: sheet },
    { id: 'assist', tipo: 'assistance', calculationType: 'fixed', fixedAmount: 350, evidence: sheet },
    { id: 'fee', tipo: 'issuance_expense', calculationType: 'rate', rate: .05, formulaModel: { base: 'net_before_fees' }, evidence: sheet },
    { id: 'tax', tipo: 'tax', calculationType: 'rate', rate: .12, formulaModel: { base: 'subtotal_before_tax' }, evidence: sheet }
  ],
  financingSchedules: [{ id: 'cash', paymentMethod: 'cash', installments: 1, surchargeRate: 0, amountBasis: 'total_before_financing', evidence: sheet }]
};
const sample = { pais: 'GT', moneda: 'GTQ', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil', plan: 'Plan A', insuredValue: 50000, paymentMethod: 'cash', installments: 1 };
const calculation = api.calculateRule(rule, sample);
assert(calculation.ok, 'Debe calcular regla explícita');
assert(calculation.totals.total === 2528.4, 'Total sintético esperado');
const matched = api.reconcile(rule, { ...sample, id: 'sample', observedTotal: 2528.4, evidence: pdf });
assert(matched.status === 'reconciled_within_tolerance', 'Debe reconciliar');
const mismatch = api.reconcile(rule, { ...sample, id: 'sample2', observedTotal: 3000, evidence: pdf });
assert(mismatch.status === 'mismatch_requires_validation', 'Debe detectar diferencia');
const incomplete = api.reconcile({ ...rule, amountBasis: 'requires_validation' }, { ...sample, id: 'sample3', observedTotal: 2528.4, evidence: pdf });
assert(incomplete.status === 'incomplete_requires_validation' && incomplete.errors.includes('BASE_MONETARIA_REQUIERE_VALIDACION'), 'Debe bloquear base desconocida');
const wrongVehicle = api.calculateRule(rule, { ...sample, tipoVehiculo: 'Microbús' });
assert(!wrongVehicle.ok && wrongVehicle.blockers.some(x => x.startsWith('DIMENSIONES_NO_COINCIDEN')), 'Debe bloquear vehículo distinto');
assert(api.report([rule], [{ ...sample, id: 'sample4', observedTotal: 2528.4, evidence: pdf }]).summary.reconciled === 1, 'Debe resumir reconciliación');
assert(matched.writeAllowed === false && matched.enabled === false && matched.requiresSecondGateForEnablement, 'No debe escribir ni habilitar');
console.log('OK orbit360-test-tariff-quote-reconciliation-p06c');
