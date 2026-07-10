import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {
  cotizacionEsquemaAseguradoraP0: {
    normalizeTrainingSource(source) {
      return { ...source, normalizedBySchemaP0: true };
    }
  }
};
const context = {
  window: { Orbit: orbit },
  Orbit: orbit,
  console,
  Date,
  Math,
  Set,
  Array,
  String,
  Object,
  JSON,
  Promise
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/excel-workbook-adapter-p04.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const contract = orbit.documentSourceContractP04;
const adapter = orbit.excelWorkbookAdapterP04;
function assert(condition, message) { if (!condition) throw new Error(message); }

const sanitized = contract.sanitize({
  fileBytes: 'NO', base64: 'NO', password: 'NO', token: 'NO',
  credentialRef: 'backend_required',
  labels: ['cliente@example.com', '+502 5555 1234', 'Prima neta']
}, { redactSamples: true });
assert(!('fileBytes' in sanitized) && !('base64' in sanitized), 'Debe eliminar bytes/base64');
assert(!('password' in sanitized) && !('token' in sanitized), 'Debe eliminar secretos');
assert(sanitized.credentialRef === 'backend_required', 'Debe conservar referencias seguras sin conservar valores');
assert(sanitized.labels[0] === '[correo_oculto]' && sanitized.labels[1] === '[numero_oculto]', 'Debe sanear muestras personales');

const envelope = contract.createEnvelope({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'Guatemala',
  file: { name: 'Cotizador Autos.xlsm', hash: 'hash-v1', fileRef: 'drive:file-demo', bytes: 'NO' }
});
assert(envelope.pais === 'GT' && envelope.moneda === 'GTQ', 'GT debe derivar GTQ');
assert(envelope.file.extension === 'xlsm' && envelope.file.containsBytes === false, 'Debe conservar metadata sin bytes');
assert(contract.validateEnvelope(envelope).valid, 'Envelope completo debe validar');

const fullWorkbook = {
  format: 'xlsm',
  workbookFingerprint: 'wb-full-v1',
  hasMacros: true,
  externalLinks: ['C:/Usuarios/Paula/TarifasExternas.xlsx'],
  connectionCount: 1,
  definedNames: [
    { name: 'TasaBase', refersTo: '=Tarifas!$B$2' },
    { name: 'PrimaMinima', refersTo: '=Tarifas!$B$3' },
    { name: 'MarcaVehiculo', refersTo: '=Listas!$A$2:$A$90' },
    { name: 'LineaVehiculo', refersTo: '=Listas!$B$2:$B$400' }
  ],
  worksheets: [
    {
      name: 'Datos Cotizador', usedRange: 'A1:H40', rowCount: 40, columnCount: 8,
      dataValidationCount: 12, formulaCount: 4,
      labels: ['Nombre del asegurado', 'Correo cliente@example.com', '+502 5555 1234'],
      formulaFunctions: ['IF', 'VLOOKUP']
    },
    {
      name: 'Tarifas Autos', usedRange: 'A1:K250', rowCount: 250, columnCount: 11,
      numericConstantCount: 1800, formulaCount: 25, formulaFingerprint: 'rates-v1',
      labels: ['Tasa', 'Prima mínima', 'Tipo de vehículo', 'Uso'],
      formulaFunctions: ['INDEX', 'MATCH', 'IF']
    },
    {
      name: 'Cálculos Internos', visibility: 'veryHidden', usedRange: 'A1:Z800',
      formulaCount: 620, formulaFingerprint: 'calc-v1', formulaFunctions: ['IF', 'INDEX', 'MATCH', 'ROUND', 'INDIRECT']
    },
    {
      name: 'Listas Marcas y Líneas', visibility: 'hidden', usedRange: 'A1:D450',
      textConstantCount: 1600, dataValidationCount: 2, labels: ['Marca', 'Línea', 'Modelo']
    },
    {
      name: 'Cotización', usedRange: 'A1:N68', rowCount: 68, columnCount: 14,
      formulaCount: 85, formulaFingerprint: 'quote-v1',
      sectionLabels: ['Datos generales', 'Sección 1', 'Sección 2', 'Sección 3', 'Beneficios adicionales', 'Exclusiones'],
      print: { areas: ['$A$1:$N$68'], orientation: 'portrait', paperSize: 'Letter', fitToWidth: 1, fitToHeight: 2, header: 'Aseguradora', footer: 'Página &P de &N' },
      formulaFunctions: ['IF', 'ROUND', 'SUM']
    }
  ]
};

const fullDryRun = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ',
  file: { name: 'Cotizador Autos.xlsm', hash: 'hash-full-v1', fileRef: 'drive:file-full' },
  version: '2026.07',
  dimensiones: { ramo: 'Automóviles', producto: 'Autos', tipoVehiculo: 'Liviano' },
  workbook: fullWorkbook
});
assert(fullDryRun.ok && fullDryRun.writeAllowed === false && fullDryRun.approved === false, 'Dry-run debe quedar listo sin escritura/aprobación');
assert(fullDryRun.capabilities.sourceTypeProposal === 'cotizador_excel_salida', 'Libro completo debe proponerse como cotizador con salida');
assert(fullDryRun.capabilities.containsRatesProposal, 'Debe detectar tarifas propuestas');
assert(fullDryRun.capabilities.containsCalculationRulesProposal, 'Debe detectar reglas propuestas');
assert(fullDryRun.capabilities.containsPresentationProposal, 'Debe detectar presentación e impresión');
assert(fullDryRun.presentationProposal.outputSheets.some(sheet => sheet.sheet === 'Cotización'), 'Debe conservar hoja de salida');
assert(fullDryRun.presentationProposal.outputSheets.find(sheet => sheet.sheet === 'Cotización').print.areas.length >= 1, 'Debe conservar área de impresión');
assert(fullDryRun.sourceProposal.normalizedBySchemaP0 === true, 'Debe integrarse con esquema P0 existente');
assert(fullDryRun.sourceProposal.ramo === 'Automóviles' && fullDryRun.sourceProposal.producto === 'Autos', 'Debe conservar dimensiones también en nivel superior para el esquema P0');
assert(fullDryRun.warnings.includes('MACROS_DETECTADAS_NO_EJECUTADAS'), 'Debe advertir macros sin ejecutarlas');
assert(fullDryRun.warnings.includes('VINCULOS_EXTERNOS_REQUIEREN_VALIDACION'), 'Debe advertir vínculos externos');
assert(fullDryRun.warnings.includes('FUNCIONES_VOLATILES_REQUIEREN_PRUEBA'), 'Debe advertir funciones volátiles');
assert(fullDryRun.workbook.macrosExecuted === false && fullDryRun.workbook.formulasExecuted === false, 'Nunca debe ejecutar macros/fórmulas');
assert(fullDryRun.workbook.externalLinks[0] === 'TarifasExternas.xlsx', 'Debe omitir ruta local y conservar solo nombre externo');
assert(fullDryRun.workbook.worksheets[0].labels.some(label => label.includes('[correo_oculto]')), 'Debe sanear correo en etiquetas de muestra');
assert(fullDryRun.workbook.worksheets[0].labels.some(label => label.includes('[numero_oculto]')), 'Debe sanear teléfono en etiquetas de muestra');

const ratesOnly = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-rates', pais: 'GT',
  file: { name: 'Tarifas AG.xlsx', hash: 'rates-only', fileRef: 'drive:rates' },
  dimensiones: { ramo: 'Automóviles', producto: 'Autos' },
  workbook: {
    format: 'xlsx', workbookFingerprint: 'rates-only-v1',
    worksheets: [{ name: 'Tarifas Autos', usedRange: 'A1:J300', numericConstantCount: 2000, formulaCount: 10, labels: ['Tasa', 'Prima mínima', 'Modelo'] }]
  }
});
assert(ratesOnly.capabilities.sourceTypeProposal === 'tarifario_excel', 'Tarifas sin salida deben quedar como tarifario');
assert(ratesOnly.capabilities.requiresExampleQuote === true, 'Tarifario sin salida requiere cotización ejemplo');
assert(ratesOnly.presentationProposal.estado === 'sin_presentacion_detectada', 'No debe inventar presentación');

const motorcycleWorkbook = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-motos', pais: 'GT',
  file: { name: 'Cotizador Motos.xlsx', hash: 'motos-v1', fileRef: 'drive:motos' },
  dimensiones: { ramo: 'Automóviles', producto: 'Motocicletas', tipoVehiculo: 'Motocicleta' },
  workbook: {
    format: 'xlsx', workbookFingerprint: 'motos-v1',
    worksheets: [
      { name: 'Entrada Motos', dataValidationCount: 6, labels: ['Cilindraje', 'Marca', 'Modelo'] },
      { name: 'Tasas Motos', numericConstantCount: 200, formulaCount: 12, labels: ['Cilindraje', 'Tasa', 'Prima mínima'] },
      { name: 'Cotización Moto', formulaCount: 35, print: { areas: ['$A$1:$L$55'], fitToWidth: 1 }, sectionLabels: ['Sección 1', 'Sección 2', 'Beneficios'] }
    ]
  }
});
assert(motorcycleWorkbook.sourceProposal.dimensiones.producto === 'Motocicletas', 'Debe conservar producto separado');
assert(motorcycleWorkbook.sourceProposal.dimensiones.tipoVehiculo === 'Motocicleta', 'Debe conservar tipo de vehículo separado');

const ambiguous = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-unknown', pais: '', moneda: '',
  file: { name: 'Archivo.xlsx', hash: 'unknown', fileRef: 'drive:unknown' },
  workbook: { format: 'xlsx', worksheets: [{ name: 'Hoja1', usedRange: 'A1:B3', textConstantCount: 4 }] }
});
assert(!ambiguous.ok, 'Sin país/moneda no debe quedar listo');
assert(ambiguous.capabilities.sourceTypeProposal === 'otro', 'Libro ambiguo debe permanecer neutral');
assert(ambiguous.validationIssues.includes('PAIS_REQUIERE_VALIDACION'), 'Debe exigir país');
assert(ambiguous.validationIssues.includes('MONEDA_REQUIERE_VALIDACION'), 'Debe exigir moneda');
assert(ambiguous.validationIssues.includes('CAPACIDAD_NO_DETERMINADA'), 'No debe inventar capacidades');

const previousWorkbook = {
  ...fullWorkbook,
  workbookFingerprint: 'wb-full-v0',
  hasMacros: false,
  externalLinks: [],
  connectionCount: 0,
  worksheets: fullWorkbook.worksheets.map(sheet => ({ ...sheet }))
};
previousWorkbook.worksheets[2] = { ...previousWorkbook.worksheets[2], formulaFingerprint: 'calc-v0' };
previousWorkbook.worksheets[4] = { ...previousWorkbook.worksheets[4], print: { areas: ['$A$1:$N$60'], orientation: 'portrait', fitToWidth: 1 } };
const currentNormalized = adapter.normalizeWorkbookSnapshot(fullWorkbook);
const previousNormalized = adapter.normalizeWorkbookSnapshot(previousWorkbook);
const versionDiff = adapter.compareWorkbookSnapshots(currentNormalized, previousNormalized);
assert(versionDiff.action === 'new_version_proposed' && versionDiff.replaceAllowed === false, 'Cambios deben proponer nueva versión sin reemplazo automático');
assert(versionDiff.changes.some(change => change.type === 'formula_fingerprint_changed'), 'Debe detectar cambio de fórmulas');
assert(versionDiff.changes.some(change => change.type === 'print_profile_changed'), 'Debe detectar cambio de impresión');
assert(versionDiff.changes.some(change => change.type === 'macro_presence_changed'), 'Debe detectar cambio de macros');

const sameVersion = adapter.compareWorkbookSnapshots(currentNormalized, { ...currentNormalized });
assert(sameVersion.action === 'omit_same_version' && sameVersion.requiresHumanConfirmation === false, 'Fingerprint idéntico debe omitirse');

const unavailable = await adapter.inspectWithProvider({ tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', fileRef: 'drive:x' });
assert(!unavailable.ok && unavailable.code === 'BACKEND_REQUIRED', 'Sin parser debe mostrar estado honesto');
let providerRequest = null;
const providerResult = await adapter.inspectWithProvider({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT',
  file: { name: 'Tarifas.xlsx', hash: 'provider-v1', fileRef: 'drive:provider' },
  provider: {
    async inspectWorkbook(request) {
      providerRequest = request;
      return { format: 'xlsx', workbookFingerprint: 'provider-wb', worksheets: [{ name: 'Tarifas', numericConstantCount: 500, formulaCount: 2 }] };
    }
  }
});
assert(providerResult.ok, 'Proveedor seguro debe producir dry-run');
assert(providerRequest.executeMacros === false && providerRequest.calculateFormulas === false && providerRequest.includeCellValues === false && providerRequest.includeBinaryPayload === false, 'Proveedor debe recibir límites de seguridad');

const serialized = JSON.stringify(fullDryRun);
assert(!serialized.includes('cliente@example.com'), 'Dry-run no debe filtrar correo de muestra');
assert(!serialized.includes('+502 5555 1234'), 'Dry-run no debe filtrar teléfono de muestra');
assert(!serialized.includes('C:/Usuarios/Paula'), 'Dry-run no debe filtrar rutas locales');
assert(!serialized.includes('fileBytes') && !serialized.includes('NO'), 'Dry-run no debe contener payload de prueba');
assert(fullDryRun.envelope.file.containsBase64 === false, 'Debe declarar ausencia de base64');

console.log('OK orbit360-test-excel-workbook-adapter-p04');