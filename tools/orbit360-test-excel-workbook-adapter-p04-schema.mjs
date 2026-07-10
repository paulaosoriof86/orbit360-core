import fs from 'node:fs';
import vm from 'node:vm';

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
const result = adapter.buildDryRun({
  tenantId: 'tenant-demo',
  aseguradoraId: 'asg-demo',
  pais: 'GT',
  moneda: 'GTQ',
  file: { name: 'Cotizador Motos.xlsx', hash: 'hash-1', fileRef: 'drive:file-1' },
  dimensiones: {
    ramo: 'Automóviles', producto: 'Motocicletas', familiaProducto: 'Vehículos',
    subtipoProducto: 'Motos particulares', segmento: 'Individual', tipoRiesgo: 'Movilidad',
    tipoVehiculo: 'Motocicleta', usoVehiculo: 'Particular', plan: 'Completo'
  },
  workbook: {
    format: 'xlsx', workbookFingerprint: 'wb-1',
    worksheets: [
      { name: 'Entrada Motos', dataValidationCount: 5 },
      { name: 'Tarifas Motos', numericConstantCount: 200, formulaCount: 15 },
      { name: 'Cotización Moto', formulaCount: 30, print: { areas: ['$A$1:$L$50'] }, sectionLabels: ['Sección 1', 'Sección 2', 'Beneficios adicionales'] }
    ]
  }
});

assert(result.ok, 'El dry-run debe quedar disponible');
assert(result.sourceProposal.tipoFuente === 'cotizador_excel_salida', 'Debe conservar tipo fuente');
assert(result.sourceProposal.pais === 'GT' && result.sourceProposal.dimensiones.pais === 'GT', 'Debe conservar país');
assert(result.sourceProposal.dimensiones.ramo === 'Automóviles', 'Debe conservar ramo');
assert(result.sourceProposal.dimensiones.producto === 'Motocicletas', 'Debe conservar producto');
assert(result.sourceProposal.dimensiones.tipoVehiculo === 'Motocicleta', 'Debe conservar tipo vehículo');
assert(result.sourceProposal.dimensiones.usoVehiculo === 'Particular', 'Debe conservar uso');
assert(result.sourceProposal.dimensiones.plan === 'Completo', 'Debe conservar plan');
assert(result.sourceProposal.evaluacion.sirveParaTarifas, 'El esquema real debe reconocer tarifa propuesta');
assert(result.sourceProposal.evaluacion.sirveParaReglas, 'El esquema real debe reconocer reglas propuestas');
assert(result.sourceProposal.evaluacion.sirveParaPresentacion, 'El esquema real debe reconocer presentación propuesta');
assert(result.sourceProposal.estado === 'requiere_validacion', 'Nunca debe quedar aprobado automáticamente');
assert(result.writeAllowed === false && result.requiresHumanValidation === true, 'Debe permanecer en dry-run');

console.log('OK orbit360-test-excel-workbook-adapter-p04-schema');