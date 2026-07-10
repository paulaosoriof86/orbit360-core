import fs from 'node:fs';
import vm from 'node:vm';

const Orbit = {};
const context = {
  window: { Orbit, OrbitTenantInsurerConfigsP10: [] }, Orbit,
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/document-provider-registry-p09.js',
  'orbit360-platform/core/aseguradoras-knowledge-runtime-p09.js',
  'orbit360-platform/core/tenant-insurer-config-p10.js',
  'orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js',
  'orbit360-platform/modules/aseguradoras-knowledge-p09.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

function assert(condition, message) { if (!condition) throw new Error(message); }
function fakeStore(seed = {}) {
  const db = JSON.parse(JSON.stringify(seed));
  return {
    all(collection) { return (db[collection] || []).slice(); },
    get(collection, id) { return (db[collection] || []).find(row => row.id === id) || null; },
    insert(collection, row) { (db[collection] = db[collection] || []).push(JSON.parse(JSON.stringify(row))); return row; },
    update(collection, id, patch) { const row = (db[collection] || []).find(item => item.id === id); if (!row) return null; Object.assign(row, JSON.parse(JSON.stringify(patch))); return row; },
    remove(collection, id) { db[collection] = (db[collection] || []).filter(row => row.id !== id); },
    raw() { return db; }
  };
}

Orbit.store = fakeStore({
  aseguradoras: [
    { id: 'dir-bam', tenantId: 'alianzas-soluciones', nombre: 'Seguros BAM', pais: 'GT', docs: [] },
    { id: 'dir-bantrab', tenantId: 'alianzas-soluciones', nombre: 'Bantrab', pais: 'GT', docs: [] },
    { id: 'dir-columna', tenantId: 'alianzas-soluciones', nombre: 'Seguros Columna', pais: 'GT', docs: [] },
    { id: 'dir-aseguate', tenantId: 'alianzas-soluciones', nombre: 'Aseguradora Guatemalteca', pais: 'GT', docs: [] },
    { id: 'dir-rural', tenantId: 'alianzas-soluciones', nombre: 'Aseguradora Rural', pais: 'GT', aliases: ['Banrural'], docs: [] },
    { id: 'dir-universales', tenantId: 'alianzas-soluciones', nombre: 'Seguros Universales', pais: 'GT', docs: [] }
  ],
  actividades: []
});

Orbit.documentProviderRegistryP09.register('fixture-excel', {
  async extractExcelManifest(request) {
    return {
      schemaVersion: 'orbit360_excel_rule_facts_p06b_v1',
      document: { id: request.documentId, tenantId: request.tenantId, aseguradoraId: request.aseguradoraId },
      facts: [{ id: 'fact-rate', factType: 'rate', numericValue: 0.03, evidence: { mediaKind: 'spreadsheet', documentId: request.documentId, sheet: 'Tarifas', range: 'A1:B2' } }],
      candidateGroups: [], outputRoutes: [], flags: { containsCustomerPayload: false, containsSecrets: false }
    };
  }
}, { tasks: ['excel_manifest'], status: 'connected', deterministic: true, version: 'fixture' });

const service = Orbit.services.aseguradorasKnowledgeP09;
const actor = { id: 'admin-ays', tenantId: 'alianzas-soluciones', activeRole: 'AdminTenant', roles: ['AdminTenant', 'Asesor'] };
const tenantConfig = { documentIntelligence: { tasks: { excel_manifest: { primary: 'fixture-excel' } } } };

const inspection = await service.inspect({
  tenantId: 'alianzas-soluciones',
  source: { id: 'doc-aseguate-rates', nombre: 'Tasas AseGuate.xlsx', archivoRef: 'backend-ref://demo/aseguate', version: 'v1', pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús' },
  purpose: 'training', actor, tenantConfig
});
assert(inspection.ok, `La inspección debe resolver AseGuate: ${inspection.code}`);
assert(inspection.context.aseguradoraId === 'dir-aseguate', 'Debe resolver AseGuate al ID del directorio sin pedirlo manualmente');
assert(inspection.insurerResolution.code === 'RESOLVED_TENANT_CONFIG_AND_DIRECTORY', 'Debe conservar evidencia de resolución tenant/directorio');
assert(inspection.manifest.document.aseguradoraId === 'dir-aseguate', 'El provider debe recibir el ID resuelto');
assert(!('contactos' in inspection.context.insurer) && !('portal' in inspection.context.insurer), 'El contexto debe exponer solo resumen seguro de aseguradora');

const proposedRule = {
  id: 'rule-aseguate-microbus', tenantId: 'alianzas-soluciones', aseguradoraId: 'dir-aseguate',
  documentoFuenteId: 'doc-aseguate-rates', versionFuente: 'v1', amountBasis: 'net', calculationType: 'fixed',
  dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús' },
  components: [
    { id: 'base', tipo: 'base_premium', calculationType: 'fixed', fixedAmount: 1800, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-aseguate-rates', sheet: 'Tarifas', range: 'A1:B2' } },
    { id: 'assist', tipo: 'assistance', calculationType: 'fixed', fixedAmount: 350, evidence: { mediaKind: 'spreadsheet', documentId: 'doc-aseguate-rates', sheet: 'Tarifas', range: 'C1:C2' } }
  ],
  sourceEvidence: [{ mediaKind: 'spreadsheet', documentId: 'doc-aseguate-rates', sheet: 'Tarifas', range: 'A1:C2' }],
  outputRoute: { routeKey: 'aseguate_microbus' }, estado: 'requiere_validacion'
};
const plan = service.buildPlan(inspection, {
  actor, reason: 'Validación P0.10 de composición financiera', confirmed: true,
  tariffRules: [proposedRule]
});
assert(plan.ok, `El plan debe construirse: ${plan.errors}`);
assert(plan.enablesCotizador === false && plan.enablesComparativo === false, 'El wire no debe habilitar módulos');
assert(plan.tenantProfileApplications.length === 1 && plan.tenantProfileApplications[0].code === 'TENANT_FINANCIAL_PROFILE_APPLIED', 'Debe registrar la aplicación del perfil AseGuate');
const ruleOperation = plan.operations.find(operation => operation.collection === 'aseguradora_reglas_tarifarias');
assert(ruleOperation, 'Debe preparar regla tarifaria para persistencia metadata-only');
const components = ruleOperation.row.components;
assert(components.some(item => item.tipo === 'issuance_expense' && item.rate === 0.05 && item.formulaModel.base === 'base_premium'), 'Debe agregar gasto 5% sobre prima neta');
assert(components.some(item => item.tipo === 'tax' && item.rate === 0.12 && item.formulaModel.base === 'subtotal_before_tax'), 'Debe agregar IVA 12% sobre subtotal gravable');
assert(ruleOperation.row.enabledCotizador === false && ruleOperation.row.enabledComparativo === false, 'La regla persistible debe permanecer deshabilitada');

const persisted = service.persist(plan, actor);
assert(persisted.ok && persisted.enablesCotizador === false && persisted.enablesComparativo === false, 'Debe persistir metadata sin habilitar');
const storedRule = Orbit.store.all('aseguradora_reglas_tarifarias')[0];
assert(storedRule.components.filter(item => item.tipo === 'tax').length === 1, 'Store debe conservar un solo IVA');
assert(Orbit.store.get('aseguradoras', 'dir-aseguate').docs.length === 1, 'La fuente debe aparecer en la ficha AseGuate');

const rural = service.resolveSourceIdentity({
  tenantId: 'alianzas-soluciones',
  source: { id: 'doc-rural-health', nombre: 'Cotizador Gastos Médicos Individual 2025.xlsx', archivoRef: 'backend-ref://demo/rural', pais: 'GT' }
});
assert(rural.resolved && rural.insurerId === 'dir-rural', 'Salud Banrural debe resolver a Aseguradora Rural');
const columna = service.resolveSourceIdentity({
  tenantId: 'alianzas-soluciones',
  source: { id: 'doc-columna', nombre: 'Cotizador VA 2026 V1.4.xlsx', archivoRef: 'backend-ref://demo/columna', pais: 'GT' }
});
assert(columna.resolved && columna.insurerId === 'dir-columna', 'Cotizador VA debe resolver a Columna');
const unknown = await service.inspect({
  tenantId: 'alianzas-soluciones',
  source: { id: 'doc-unknown', nombre: 'Archivo desconocido.xlsx', archivoRef: 'backend-ref://demo/unknown', pais: 'GT' },
  actor, tenantConfig
});
assert(!unknown.ok && unknown.code === 'INSURER_NOT_FOUND', 'Fuente desconocida debe bloquear antes de ejecutar provider');

const serialized = JSON.stringify({ inspection, plan, persisted, rural, columna });
assert(!/password|credential|token|localPath|contactos|cuentas|portal/.test(serialized), 'El wire no debe filtrar secretos, rutas ni ficha sensible');
console.log('OK orbit360-test-aseguradoras-knowledge-p10-wire');