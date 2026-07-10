import fs from 'node:fs';
import vm from 'node:vm';

const reportPath = process.argv[2];
if (!reportPath) throw new Error('Uso: node tools/orbit360-test-excel-p04-e2e.mjs <inventory.json>');
const inventory = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const orbit = {};
const context = { window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js',
  'orbit360-platform/core/excel-workbook-adapter-p04.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const adapter = orbit.excelWorkbookAdapterP04;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(inventory.ok && inventory.code === 'INVENTORY_READY', 'El inspector debe entregar INVENTORY_READY');
assert(inventory.containsCellValues === false && inventory.containsBinaryPayload === false, 'El inventario no contiene payload');

const dryRun = adapter.buildDryRun({
  tenantId: 'tenant-demo',
  aseguradoraId: 'asg-demo',
  pais: 'GT',
  moneda: 'GTQ',
  file: {
    name: inventory.sourceFileName,
    hash: inventory.sourceHash,
    fileRef: 'fixture:excel-p04'
  },
  version: 'fixture-v1',
  dimensiones: {
    ramo: 'Automóviles',
    producto: 'Autos',
    tipoVehiculo: 'Liviano',
    usoVehiculo: 'Particular',
    plan: 'Completo'
  },
  workbook: inventory
});

assert(dryRun.ok, 'El adapter debe aceptar el inventario real del inspector');
assert(dryRun.writeAllowed === false && dryRun.approved === false, 'El flujo extremo a extremo no escribe ni aprueba');
assert(dryRun.capabilities.sourceTypeProposal === 'cotizador_excel_salida', 'Debe detectar cotizador Excel con salida');
assert(dryRun.capabilities.containsRatesProposal, 'Debe proponer tarifas');
assert(dryRun.capabilities.containsCalculationRulesProposal, 'Debe proponer reglas');
assert(dryRun.capabilities.containsInputFormProposal, 'Debe detectar entrada');
assert(dryRun.capabilities.containsOutputSheetProposal, 'Debe detectar salida');
assert(dryRun.capabilities.containsPrintAreaProposal, 'Debe conservar área de impresión');
assert(dryRun.capabilities.volatileFunctions.includes('INDIRECT'), 'Debe conservar advertencia de función volátil');
assert(dryRun.warnings.includes('MACROS_DETECTADAS_NO_EJECUTADAS'), 'Debe traducir detección de macros');
assert(dryRun.warnings.includes('HOJAS_MUY_OCULTAS_REQUIEREN_REVISION'), 'Debe traducir hoja veryHidden');
assert(dryRun.presentationProposal.outputSheets.some(sheet => sheet.sheet === 'Cotización'), 'Debe proponer la hoja de cotización');
const output = dryRun.presentationProposal.outputSheets.find(sheet => sheet.sheet === 'Cotización');
assert(output.print.areas.includes("'Cotización'!$A$1:$N$68"), 'Debe conservar Print Area');
assert(output.print.titlesRows === "'Cotización'!$1:$3", 'Debe conservar Print Titles');
assert(dryRun.sourceProposal.evaluacion.sirveParaTarifas, 'El esquema P0 debe reconocer tarifa');
assert(dryRun.sourceProposal.evaluacion.sirveParaReglas, 'El esquema P0 debe reconocer reglas');
assert(dryRun.sourceProposal.evaluacion.sirveParaPresentacion, 'El esquema P0 debe reconocer presentación');
assert(dryRun.sourceProposal.dimensiones.producto === 'Autos', 'Debe conservar producto');
assert(dryRun.sourceProposal.dimensiones.tipoVehiculo === 'Liviano', 'Debe conservar vehículo');
assert(dryRun.versionProposal.action === 'create_version_proposed', 'Primera lectura debe proponer versión');

const serialized = JSON.stringify(dryRun);
assert(!serialized.includes('FICTITIOUS_VBA_NOT_EXECUTED'), 'No debe filtrar VBA');
assert(!serialized.includes('Dato ficticio no exportable'), 'No debe filtrar valores de celda');
assert(!serialized.includes('base64'), 'No debe contener base64');

console.log('OK orbit360-test-excel-p04-e2e');