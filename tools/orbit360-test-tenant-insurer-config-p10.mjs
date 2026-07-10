import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {};
const context = {
  window: { Orbit: orbit, OrbitTenantInsurerConfigsP10: [] }, Orbit: orbit,
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/tenant-insurer-config-p10.js',
  'orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js',
  'orbit360-platform/core/tariff-quote-reconciliation-p06c.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const api = orbit.tenantInsurerConfigP10;
const calc = orbit.tariffQuoteReconciliationP06c;
function assert(condition, message) { if (!condition) throw new Error(message); }
const directory = [
  { id: 'dir-bam', nombre: 'Seguros BAM', pais: 'GT' },
  { id: 'dir-bantrab', nombre: 'Bantrab', pais: 'GT' },
  { id: 'dir-columna', nombre: 'Seguros Columna', pais: 'GT' },
  { id: 'dir-aseguate', nombre: 'Aseguradora Guatemalteca', pais: 'GT' },
  { id: 'dir-rural', nombre: 'Aseguradora Rural', aliases: ['Banrural'], pais: 'GT' },
  { id: 'dir-universales', nombre: 'Seguros Universales', pais: 'GT' }
];

const ruralLegal = api.resolveInsurer({ tenantId: 'alianzas-soluciones', name: 'Aseguradora Rural', pais: 'GT', directory });
const ruralCommon = api.resolveInsurer({ tenantId: 'alianzas-soluciones', name: 'Banrural', pais: 'GT', directory });
const ruralAutoFile = api.resolveInsurer({ tenantId: 'alianzas-soluciones', fileName: 'Mi Carro Seguro Cotizador Banrural.xlsx', pais: 'GT', directory });
const ruralHealthFile = api.resolveInsurer({ tenantId: 'alianzas-soluciones', fileName: 'Cotizador Gastos Médicos Individual 2025.xlsx', pais: 'GT', directory });
assert(ruralLegal.resolved && ruralCommon.resolved, 'Aseguradora Rural y Banrural deben resolver');
assert(ruralLegal.insurerId === 'dir-rural' && ruralCommon.insurerId === 'dir-rural', 'Banrural y Aseguradora Rural deben apuntar a la misma entidad');
assert(ruralAutoFile.insurerId === 'dir-rural' && ruralHealthFile.insurerId === 'dir-rural', 'Autos y Salud Banrural deben asociarse a la misma aseguradora');
assert(ruralCommon.displayName === 'Aseguradora Rural (Banrural)', 'La UI debe conservar el nombre conocido por usuarios');

const columna = api.resolveInsurer({ tenantId: 'alianzas-soluciones', fileName: 'Cotizador VA 2026 V1.4.xlsx', pais: 'GT', directory });
assert(columna.resolved && columna.insurerId === 'dir-columna', 'Cotizador VA debe resolver a Seguros Columna');

const withoutDirectory = api.resolveInsurer({ tenantId: 'alianzas-soluciones', name: 'Banrural', pais: 'GT', directory: [] });
assert(withoutDirectory.resolved && withoutDirectory.insurerId === 'ins_gt_aseguradora_rural', 'Debe tener ID interno estable cuando el directorio aún no fue persistido');
assert(withoutDirectory.requiresDirectoryWrite, 'El ID interno no debe fingir que ya existe en directorio');

const baseRule = {
  id: 'rule-aseguate-demo', tenantId: 'alianzas-soluciones', aseguradoraId: 'dir-aseguate',
  insurerName: 'AseGuate', documentoFuenteId: 'doc-tarifario-demo', versionFuente: 'v1',
  amountBasis: 'net', calculationType: 'fixed',
  dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús' },
  components: [
    { id: 'base', tipo: 'base_premium', calculationType: 'fixed', fixedAmount: 1800, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-tarifario-demo', sheet: 'Tarifas', range: 'A1:B2' } },
    { id: 'assist', tipo: 'assistance', calculationType: 'fixed', fixedAmount: 350, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-tarifario-demo', sheet: 'Tarifas', range: 'C1:C2' } }
  ],
  sourceEvidence: [{ mediaKind: 'spreadsheet', documentId: 'doc-tarifario-demo', sheet: 'Tarifas', range: 'A1:C2' }],
  outputRoute: { routeKey: 'aseguate_microbus' }
};
const applied = api.applyFinancialProfile(baseRule, { tenantId: 'alianzas-soluciones', name: 'AseGuate', pais: 'GT', directory });
assert(applied.applied && applied.addedComponents.includes('issuance_expense') && applied.addedComponents.includes('tax'), 'Debe añadir gastos de emisión e IVA desde configuración tenant');
const issuance = applied.rule.components.find(item => item.tipo === 'issuance_expense');
const tax = applied.rule.components.find(item => item.tipo === 'tax');
assert(issuance.rate === 0.05 && issuance.formulaModel.base === 'base_premium', 'Gasto de emisión debe ser 5% sobre prima neta');
assert(tax.rate === 0.12 && tax.formulaModel.base === 'subtotal_before_tax', 'IVA debe ser 12% sobre la base gravable previa al impuesto');
assert(applied.rule.enabledCotizador === false && applied.rule.enabledComparativo === false && applied.rule.writeAllowed === false, 'Configurar no debe habilitar ni escribir');

const microbus = calc.calculateRule(applied.rule, { pais: 'GT', moneda: 'GTQ', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús', valorAsegurado: 35000 });
assert(microbus.ok, `La fórmula configurada debe calcular: ${microbus.blockers}`);
assert(microbus.totals.basePremium === 1800 && microbus.totals.fees === 90 && microbus.totals.assistance === 350, 'Debe separar prima, gasto y asistencia');
assert(microbus.totals.tax === 268.8 && microbus.totals.total === 2508.8, 'Debe reproducir el total del ejemplo microbús');

const autoRule = JSON.parse(JSON.stringify(baseRule));
autoRule.id = 'rule-aseguate-auto-demo';
autoRule.dimensiones.tipoVehiculo = 'Automóvil';
autoRule.components[0].fixedAmount = 2500;
autoRule.outputRoute.routeKey = 'aseguate_auto';
const autoApplied = api.applyFinancialProfile(autoRule, { tenantId: 'alianzas-soluciones', name: 'Aseguradora Guatemalteca', pais: 'GT', directory });
const auto = calc.calculateRule(autoApplied.rule, { pais: 'GT', moneda: 'GTQ', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil', valorAsegurado: 35000 });
assert(auto.ok && auto.totals.fees === 125 && auto.totals.tax === 357 && auto.totals.total === 3332, 'Debe reproducir el total del ejemplo automóvil');

const duplicateApply = api.applyFinancialProfile(applied.rule, { tenantId: 'alianzas-soluciones', name: 'AseGuate', pais: 'GT', directory });
assert(!duplicateApply.applied && duplicateApply.code === 'TENANT_FINANCIAL_COMPONENTS_ALREADY_PRESENT', 'No debe duplicar gastos o IVA');
assert(duplicateApply.rule.components.filter(item => item.tipo === 'tax').length === 1, 'Debe conservar un solo IVA');
assert(api.getFinancialProfile({ tenantId: 'tenant-other', name: 'AseGuate', pais: 'GT' }).found === false, 'Otro tenant no debe heredar configuración A&S');

const serialized = JSON.stringify({ ruralLegal, ruralCommon, columna, applied, autoApplied });
assert(!/password|credential|token|correo@|telefono/i.test(serialized), 'Configuración no debe contener secretos ni PII');
console.log('OK orbit360-test-tenant-insurer-config-p10');