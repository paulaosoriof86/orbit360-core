import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {
  cotizacionEsquemaAseguradoraP0: {
    normalizeTrainingSource(source) { return { ...source, normalizedBySchemaP0: true }; }
  }
};
const context = { window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of ['orbit360-platform/core/document-source-contract-p04.js', 'orbit360-platform/core/excel-workbook-adapter-p04.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const contract = orbit.documentSourceContractP04;
const adapter = orbit.excelWorkbookAdapterP04;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const sanitized = contract.sanitize({
  fileBytes: 'PAYLOAD_BINARIO', base64: 'PAYLOAD_BASE64', password: 'SECRETO', token: 'TOKEN',
  credentialRef: 'backend_required', labels: ['cliente@example.com', '+502 5555 1234', 'Prima neta']
}, { redactSamples: true });
assert(!('fileBytes' in sanitized) && !('base64' in sanitized), 'Debe eliminar bytes/base64');
assert(!('password' in sanitized) && !('token' in sanitized), 'Debe eliminar secretos');
assert(sanitized.credentialRef === 'backend_required', 'Debe conservar credentialRef seguro');
assert(sanitized.labels[0] === '[correo_oculto]' && sanitized.labels[1] === '[numero_oculto]', 'Debe sanear muestras personales');

const fullWorkbook = {
  format: 'xlsm', workbookFingerprint: 'wb-full-v1', hasMacros: true,
  externalLinks: ['C:/Usuarios/Paula/TarifasExternas.xlsx'], connectionCount: 1,
  definedNames: [
    { name: 'TasaBase', refersTo: '=Tarifas!$B$2' }, { name: 'PrimaMinima', refersTo: '=Tarifas!$B$3' },
    { name: 'MarcaVehiculo', refersTo: '=Listas!$A$2:$A$90' }, { name: 'LineaVehiculo', refersTo: '=Listas!$B$2:$B$400' }
  ],
  worksheets: [
    { name: 'Datos Cotizador', dataValidationCount: 12, formulaCount: 4, labels: ['Correo cliente@example.com', '+502 5555 1234'], formulaFunctions: ['IF', 'VLOOKUP'] },
    { name: 'Tarifas Autos', numericConstantCount: 1800, formulaCount: 25, formulaFingerprint: 'rates-v1', labels: ['Tasa', 'Prima mínima'], formulaFunctions: ['INDEX', 'MATCH'] },
    { name: 'Cálculos Internos', visibility: 'veryHidden', formulaCount: 620, formulaFingerprint: 'calc-v1', formulaFunctions: ['IF', 'INDEX', 'INDIRECT'] },
    { name: 'Listas Marcas y Líneas', visibility: 'hidden', dataValidationCount: 2, labels: ['Marca', 'Línea', 'Modelo'] },
    { name: 'Cotización', formulaCount: 85, formulaFingerprint: 'quote-v1', sectionLabels: ['Sección 1', 'Sección 2', 'Sección 3', 'Beneficios adicionales', 'Exclusiones'], print: { areas: ['$A$1:$N$68'], orientation: 'portrait', paperSize: 'Letter', fitToWidth: 1 } }
  ]
};
const fullDryRun = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ',
  file: { name: 'Cotizador Autos.xlsm', hash: 'hash-full-v1', fileRef: 'drive:file-full' },
  version: '2026.07', dimensiones: { ramo: 'Automóviles', producto: 'Autos', tipoVehiculo: 'Liviano' }, workbook: fullWorkbook
});
assert(fullDryRun.ok && !fullDryRun.writeAllowed && !fullDryRun.approved, 'Dry-run no escribe ni aprueba');
assert(fullDryRun.capabilities.sourceTypeProposal === 'cotizador_excel_salida', 'Debe clasificar cotizador con salida');
assert(fullDryRun.capabilities.containsRatesProposal && fullDryRun.capabilities.containsCalculationRulesProposal, 'Debe proponer tarifas y reglas');
assert(fullDryRun.capabilities.containsPresentationProposal, 'Debe detectar presentación/impresión');
assert(fullDryRun.presentationProposal.outputSheets.some(sheet => sheet.sheet === 'Cotización' && sheet.print.areas.length), 'Debe conservar área de impresión');
assert(fullDryRun.sourceProposal.normalizedBySchemaP0, 'Debe integrarse con esquema P0');
assert(fullDryRun.sourceProposal.ramo === 'Automóviles' && fullDryRun.sourceProposal.producto === 'Autos', 'Debe conservar dimensiones P0');
assert(fullDryRun.warnings.includes('MACROS_DETECTADAS_NO_EJECUTADAS'), 'Debe advertir macros');
assert(fullDryRun.warnings.includes('VINCULOS_EXTERNOS_REQUIEREN_VALIDACION'), 'Debe advertir vínculos externos');
assert(fullDryRun.warnings.includes('FUNCIONES_VOLATILES_REQUIEREN_PRUEBA'), 'Debe advertir funciones volátiles');
assert(!fullDryRun.workbook.macrosExecuted && !fullDryRun.workbook.formulasExecuted, 'No ejecuta macros/fórmulas');
assert(fullDryRun.workbook.externalLinks[0] === 'TarifasExternas.xlsx', 'Debe omitir ruta local');
assert(fullDryRun.workbook.worksheets[0].labels.some(label => label.includes('[correo_oculto]')), 'Debe sanear correo');
assert(fullDryRun.workbook.worksheets[0].labels.some(label => label.includes('[numero_oculto]')), 'Debe sanear teléfono');

const ratesOnly = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-rates', pais: 'GT',
  file: { name: 'Tarifas AG.xlsx', hash: 'rates-only', fileRef: 'drive:rates' },
  dimensiones: { ramo: 'Automóviles', producto: 'Autos' },
  workbook: { format: 'xlsx', workbookFingerprint: 'rates-v1', worksheets: [{ name: 'Tarifas Autos', numericConstantCount: 2000, formulaCount: 10, labels: ['Tasa', 'Prima mínima'] }] }
});
assert(ratesOnly.capabilities.sourceTypeProposal === 'tarifario_excel', 'Tarifario sin salida debe mantenerse separado');
assert(ratesOnly.capabilities.requiresExampleQuote && ratesOnly.presentationProposal.estado === 'sin_presentacion_detectada', 'Debe pedir cotización ejemplo sin inventar presentación');

const motorcycle = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-motos', pais: 'GT',
  file: { name: 'Cotizador Motos.xlsx', hash: 'motos-v1', fileRef: 'drive:motos' },
  dimensiones: { ramo: 'Automóviles', producto: 'Motocicletas', tipoVehiculo: 'Motocicleta' },
  workbook: { format: 'xlsx', workbookFingerprint: 'motos-v1', worksheets: [
    { name: 'Entrada Motos', dataValidationCount: 6 }, { name: 'Tasas Motos', numericConstantCount: 200, formulaCount: 12 },
    { name: 'Cotización Moto', formulaCount: 35, print: { areas: ['$A$1:$L$55'] }, sectionLabels: ['Sección 1', 'Beneficios'] }
  ] }
});
assert(motorcycle.sourceProposal.dimensiones.producto === 'Motocicletas' && motorcycle.sourceProposal.dimensiones.tipoVehiculo === 'Motocicleta', 'No debe mezclar autos y motos');

const ambiguous = adapter.buildDryRun({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-unknown', file: { name: 'Archivo.xlsx', hash: 'unknown', fileRef: 'drive:unknown' },
  workbook: { format: 'xlsx', worksheets: [{ name: 'Hoja1', textConstantCount: 4 }] }
});
assert(!ambiguous.ok && ambiguous.capabilities.sourceTypeProposal === 'otro', 'Libro ambiguo queda neutral');
assert(ambiguous.validationIssues.includes('PAIS_REQUIERE_VALIDACION') && ambiguous.validationIssues.includes('MONEDA_REQUIERE_VALIDACION'), 'Debe exigir país/moneda');
assert(ambiguous.validationIssues.includes('CAPACIDAD_NO_DETERMINADA'), 'No debe inventar capacidades');

const previousWorkbook = { ...fullWorkbook, workbookFingerprint: 'wb-full-v0', hasMacros: false, externalLinks: [], connectionCount: 0, worksheets: fullWorkbook.worksheets.map(sheet => ({ ...sheet })) };
previousWorkbook.worksheets[2] = { ...previousWorkbook.worksheets[2], formulaFingerprint: 'calc-v0' };
previousWorkbook.worksheets[4] = { ...previousWorkbook.worksheets[4], print: { areas: ['$A$1:$N$60'] } };
const currentNormalized = adapter.normalizeWorkbookSnapshot(fullWorkbook);
const previousNormalized = adapter.normalizeWorkbookSnapshot(previousWorkbook);
const versionDiff = adapter.compareWorkbookSnapshots(currentNormalized, previousNormalized);
assert(versionDiff.action === 'new_version_proposed' && !versionDiff.replaceAllowed, 'Cambio propone versión sin reemplazo');
assert(versionDiff.changes.some(change => change.type === 'formula_fingerprint_changed'), 'Detecta cambio de fórmula');
assert(versionDiff.changes.some(change => change.type === 'print_profile_changed'), 'Detecta cambio de impresión');
assert(versionDiff.changes.some(change => change.type === 'macro_presence_changed'), 'Detecta cambio de macros');
assert(adapter.compareWorkbookSnapshots(currentNormalized, { ...currentNormalized }).action === 'omit_same_version', 'Fingerprint idéntico se omite');

const unavailable = await adapter.inspectWithProvider({ tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', fileRef: 'drive:x' });
assert(!unavailable.ok && unavailable.code === 'BACKEND_REQUIRED', 'Sin parser muestra estado honesto');
let providerRequest;
const providerResult = await adapter.inspectWithProvider({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', file: { name: 'Tarifas.xlsx', hash: 'provider-v1', fileRef: 'drive:provider' },
  provider: { async inspectWorkbook(request) { providerRequest = request; return { format: 'xlsx', workbookFingerprint: 'provider-wb', worksheets: [{ name: 'Tarifas', numericConstantCount: 500 }] }; } }
});
assert(providerResult.ok, 'Proveedor seguro produce dry-run');
assert(!providerRequest.executeMacros && !providerRequest.calculateFormulas && !providerRequest.includeCellValues && !providerRequest.includeBinaryPayload, 'Proveedor recibe límites de seguridad');

const serialized = JSON.stringify(fullDryRun);
assert(!serialized.includes('cliente@example.com') && !serialized.includes('+502 5555 1234'), 'No filtra datos personales');
assert(!serialized.includes('C:/Usuarios/Paula'), 'No filtra rutas locales');
assert(!serialized.includes('PAYLOAD_BINARIO') && !serialized.includes('PAYLOAD_BASE64') && !serialized.includes('SECRETO'), 'No filtra payload/secretos');
assert(fullDryRun.envelope.file.containsBytes === false && fullDryRun.envelope.file.containsBase64 === false, 'Declara ausencia de payload binario');

console.log('OK orbit360-test-excel-workbook-adapter-p04');