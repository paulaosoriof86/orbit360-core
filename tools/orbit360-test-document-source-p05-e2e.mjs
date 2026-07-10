import fs from 'node:fs';
import vm from 'node:vm';

const audit = [];
const orbit = {
  store: { insert(collection, row) { if (collection === 'auditoria') audit.push(row); } }
};
const context = {
  window: { Orbit: orbit, dispatchEvent() {} }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
};
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-source-contract-p04.js',
  'orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js',
  'orbit360-platform/core/excel-workbook-adapter-p04.js',
  'orbit360-platform/core/document-source-wire-p05.js',
  'orbit360-platform/core/extraction-proposal-p05.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const wire = orbit.documentSourceWireP05;
const extraction = orbit.documentExtractionProposalP05;
function assert(condition, message) { if (!condition) throw new Error(message); }

const admin = { id: 'usr-admin', roles: ['admin', 'asesor'], activeRole: 'admin' };
let inspectionRequest;
const inspection = await wire.inspectMetadata({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ', version: '2026.07',
  motivo: 'Inventariar cotizador de autos', actor: admin, store: orbit.store,
  file: { name: 'Cotizador Autos.xlsm', fileRef: 'drive:file-1', hash: 'hash-v1' },
  dimensiones: { ramo: 'Automóviles', producto: 'Autos', tipoVehiculo: 'Liviano', usoVehiculo: 'Particular' },
  provider: {
    async inspectWorkbook(request) {
      inspectionRequest = request;
      return {
        format: 'xlsm', workbookFingerprint: 'wb-p05-v1', hasMacros: true,
        definedNames: [{ name: 'PrimaMinima', refersTo: '=Tarifas!$B$2' }],
        worksheets: [
          { name: 'Datos Cotizador', dataValidationCount: 5, formulaCount: 2, labels: ['Marca', 'Línea', 'Modelo'] },
          { name: 'Tarifas Autos', numericConstantCount: 500, formulaCount: 20, formulaFingerprint: 'rates-v1', labels: ['Tasa', 'Prima mínima'] },
          { name: 'Cálculos', visibility: 'veryHidden', formulaCount: 200, formulaFingerprint: 'calc-v1', formulaFunctions: ['IF', 'INDEX', 'MATCH'] },
          { name: 'Cotización', formulaCount: 40, sectionLabels: ['Sección 1', 'Sección 2', 'Sección 3', 'Beneficios adicionales'], print: { areas: ['$A$1:$N$65'], fitToWidth: 1 } }
        ]
      };
    }
  }
});
assert(inspection.ok, 'P0.4 + P0.5 deben producir inspección');
assert(inspection.sourceProposal.tipoFuente === 'cotizador_excel_salida', 'Debe detectar cotizador con salida');
assert(inspection.sourceProposal.dimensiones.producto === 'Autos', 'Debe conservar producto');
assert(inspectionRequest.executeMacros === false && inspectionRequest.calculateFormulas === false, 'Inspector no ejecuta macros/fórmulas');
assert(inspectionRequest.includeCellValues === false && inspectionRequest.includeBinaryPayload === false, 'Inspector no recibe payload');
assert(audit.length === 2, 'Wire debe auditar solicitud y resultado');

const insurer = { id: 'asg-demo', docs: [] };
const persistence = wire.buildPersistenceDryRun({ inspection, aseguradoraActual: insurer, documentosActuales: [] });
assert(persistence.ok && persistence.operations.length === 2, 'Debe generar plan metadata-only');
assert(persistence.sourceRow.contieneTarifas === true && persistence.sourceRow.contieneFormatoCotizacion === true, 'Fuente debe conservar múltiples usos');
assert(persistence.documentRecord.inventario.hasMacros === true, 'Documento debe registrar presencia de macros sin contenido');
assert(persistence.documentRecord.habilitadoCotizador === false, 'No debe habilitar Cotizador');

let extractionRequest;
const semantic = await extraction.extractWithProvider({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentId: inspection.envelope.id,
  fileRef: inspection.envelope.file.fileRef, sourceHash: inspection.envelope.file.hash,
  versionFuente: inspection.envelope.version.label, mediaKind: 'spreadsheet',
  dimensiones: inspection.sourceProposal.dimensiones,
  provider: {
    async extractFacts(request) {
      extractionRequest = request;
      return {
        proposals: [
          { concepto: 'prima_minima', nombre: 'Prima mínima', valor: 1200, unidad: 'GTQ', confianza: 95, evidencia: { sheet: 'Tarifas Autos', range: 'B2' } },
          { concepto: 'gasto_emision', nombre: 'Gastos de emisión', valor: 5, unidad: 'porcentaje', confianza: 92, evidencia: { sheet: 'Cálculos', range: 'C8' } },
          { concepto: 'seccion_presentacion', nombre: 'Sección 1', valor: 'Daños propios', confianza: 88, evidencia: { sheet: 'Cotización', range: 'A15:N25' } }
        ]
      };
    }
  }
});
assert(semantic.ok && semantic.proposals.length === 3, 'Debe producir propuestas semánticas');
assert(extractionRequest.includeRawCells === false && extractionRequest.includeWorkbookPayload === false, 'Extracción usa contrato acotado');
assert(extractionRequest.requiresEvidence === true, 'Toda propuesta debe exigir evidencia');

const diff = extraction.buildDiff([], semantic.proposals);
assert(diff.summary.createProposed === 3 && diff.summary.conflicts === 0, 'Debe producir diff sin conflictos');
const decisions = semantic.proposals.map(item => ({ proposalId: item.id, action: 'confirm', motivo: 'Validación sintética P0.5' }));
const knowledgePlan = extraction.buildConfirmedKnowledgePlan(diff, decisions, { actorId: 'usr-admin', rolActivo: 'admin' });
assert(knowledgePlan.ok && knowledgePlan.records.length === 3, 'Debe construir registros validados');
assert(knowledgePlan.records.every(item => item.estado === 'validado_pendiente_habilitacion'), 'Validación no habilita motores');
assert(knowledgePlan.writeAllowed === false && knowledgePlan.requiresSecondGateForEnablement === true, 'Debe mantener segundo gate');

console.log('OK orbit360-test-document-source-p05-e2e');
