import fs from 'node:fs';
import vm from 'node:vm';
import { buildDocumentBatchPlanP09d } from './orbit360-document-batch-plan-p09d.mjs';

const orbit = {};
const context = {
  window: { Orbit: orbit, OrbitTenantInsurerConfigsP10: [] }, Orbit: orbit,
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/tenant-insurer-config-p10.js',
  'orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js',
  'orbit360-platform/core/tenant-source-batch-adapter-p10.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

function assert(condition, message) { if (!condition) throw new Error(message); }
const directory = [
  { id: 'dir-bam', nombre: 'Seguros BAM', pais: 'GT' },
  { id: 'dir-bantrab', nombre: 'Bantrab', pais: 'GT' },
  { id: 'dir-columna', nombre: 'Seguros Columna', pais: 'GT' },
  { id: 'dir-aseguate', nombre: 'Aseguradora Guatemalteca', pais: 'GT' },
  { id: 'dir-rural', nombre: 'Aseguradora Rural', aliases: ['Banrural'], pais: 'GT' },
  { id: 'dir-universales', nombre: 'Seguros Universales', pais: 'GT' }
];
const source = (id, nombre, tipoFuente, fileRef, extra = {}) => ({
  id, nombre, tipoFuente, fileRef, versionFuente: 'v1', pais: 'GT', moneda: 'GTQ',
  ramo: 'Vehículos', producto: 'Seguro de vehículo', ...extra
});
const sources = [
  source('doc-bam-auto', 'COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx', 'cotizador_excel_salida', 'backend-ref://demo/bam-auto'),
  source('doc-bam-health', 'Cotizador BAMSALUD 2025.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/bam-health', { ramo: 'Salud', producto: 'Gastos Médicos' }),
  source('doc-bantrab-auto', 'COTIZADOR V13. CORREDORES.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/bantrab-auto'),
  source('doc-bantrab-moto', 'COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/bantrab-moto', { tipoVehiculo: 'Motocicleta' }),
  source('doc-columna', 'Cotizador VA 2026 V1.4.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/columna'),
  source('doc-aseguate-rates', 'Tasas AseGuate.xlsx', 'tarifario_excel', 'backend-ref://demo/aseguate-rates'),
  source('doc-rural-auto', 'Mi Carro Seguro Cotizador Banrural.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/rural-auto'),
  source('doc-rural-health', 'Cotizador Gastos Médicos Individual 2025.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/rural-health', { ramo: 'Salud', producto: 'Gastos Médicos' }),
  source('doc-aseguate-auto-pdf', 'Cotización oficial AseGuate automóvil.pdf', 'cotizacion_pdf_oficial', 'backend-ref://demo/aseguate-auto-pdf', { aseguradoraNombre: 'AseGuate', tipoVehiculo: 'Automóvil' }),
  source('doc-aseguate-microbus-pdf', 'Cotización oficial AseGuate microbús hasta nueve pasajeros.pdf', 'cotizacion_pdf_oficial', 'backend-ref://demo/aseguate-microbus-pdf', { aseguradoraNombre: 'Aseguradora Guatemalteca', tipoVehiculo: 'Microbús hasta 9 pasajeros' }),
  source('doc-universales-pdf', 'Cotización Riesgo Plus.pdf', 'cotizacion_pdf_oficial', 'backend-ref://demo/universales-pdf', { aseguradoraNombre: 'Seguros Universales', plan: 'Riesgo Plus' })
];

const resolution = orbit.tenantSourceBatchAdapterP10.resolveBatchSources({
  tenantId: 'alianzas-soluciones', directory, sources
});
assert(resolution.ok && resolution.code === 'TENANT_SOURCE_BATCH_RESOLVED', `El lote debe resolver: ${resolution.errors}`);
assert(resolution.summary.total === 11 && resolution.summary.resolved === 11 && resolution.summary.blocked === 0, 'Debe resolver once fuentes');
assert(resolution.summary.insurers === 6, 'Las once fuentes deben agruparse en seis aseguradoras');
assert(resolution.summary.directoryMatched === 11 && resolution.summary.internalIdPendingDirectory === 0, 'Todas deben usar IDs existentes del directorio');

const ruralRows = resolution.sources.filter(item => item.id === 'doc-rural-auto' || item.id === 'doc-rural-health');
assert(ruralRows.length === 2 && ruralRows.every(item => item.aseguradoraId === 'dir-rural'), 'Autos y Salud Banrural deben compartir la misma Aseguradora Rural');
const columna = resolution.sources.find(item => item.id === 'doc-columna');
assert(columna.aseguradoraId === 'dir-columna' && columna.aseguradoraNombreVisible === 'Seguros Columna', 'Columna debe resolver sin ambigüedad');
const aseguate = resolution.sources.filter(item => item.id.startsWith('doc-aseguate'));
assert(aseguate.length === 3 && aseguate.every(item => item.aseguradoraId === 'dir-aseguate'), 'Tarifario y PDFs AseGuate deben compartir entidad');

const plan = buildDocumentBatchPlanP09d({ tenantId: 'alianzas-soluciones', sources: resolution.sources });
assert(plan.ok && plan.code === 'BATCH_READY_FOR_DRY_RUN', `El batch P0.9d debe quedar listo: ${plan.errors}`);
assert(plan.summary.total === 11 && plan.summary.excel === 8 && plan.summary.pdf === 3, 'Debe conservar 8 Excel y 3 PDF');
assert(plan.summary.insurers === 6 && plan.summary.blocked === 0, 'El plan debe conservar seis aseguradoras sin bloqueos');
assert(plan.applyAllowed === false && plan.enablesCotizador === false && plan.enablesComparativo === false, 'Resolver el lote no debe escribir ni habilitar');

const noDirectory = orbit.tenantSourceBatchAdapterP10.resolveBatchSources({
  tenantId: 'alianzas-soluciones', directory: [], sources: [sources[6], sources[7]]
});
assert(noDirectory.ok && noDirectory.summary.internalIdPendingDirectory === 2, 'Sin directorio debe usar el mismo ID interno estable para ambas fuentes Rural');
assert(noDirectory.sources.every(item => item.aseguradoraId === 'ins_gt_aseguradora_rural'), 'El fallback interno de Rural debe ser único');

const unknown = orbit.tenantSourceBatchAdapterP10.resolveBatchSources({
  tenantId: 'alianzas-soluciones', directory, sources: [source('doc-unknown', 'Archivo sin aseguradora.xlsx', 'cotizador_excel_salida', 'backend-ref://demo/unknown')]
});
assert(!unknown.ok && unknown.summary.blocked === 1, 'Una fuente desconocida debe bloquearse, no inventarse');

const serialized = JSON.stringify({ resolution, plan, noDirectory });
assert(!/localPath|password|credential|accessToken|privateKey/.test(serialized), 'El lote no debe contener rutas o secretos');
console.log('OK orbit360-test-tenant-source-batch-adapter-p10');