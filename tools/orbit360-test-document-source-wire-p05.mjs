import fs from 'node:fs';
import vm from 'node:vm';

const auditRows = [];
const orbit = {
  documentSourceContractP04: {
    sanitize(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  },
  store: { insert(collection, row) { if (collection === 'auditoria') auditRows.push(row); } },
  excelWorkbookAdapterP04: {
    async inspectWithProvider(input) {
      if (!input.provider) return { ok: false, code: 'BACKEND_REQUIRED', writeAllowed: false };
      const snapshot = await input.provider.inspectWorkbook({
        fileRef: input.file.fileRef, executeMacros: false, calculateFormulas: false,
        includeCellValues: false, includeBinaryPayload: false
      });
      return {
        ok: true,
        envelope: {
          id: 'docsrc_demo', tenantId: input.tenantId, aseguradoraId: input.aseguradoraId,
          pais: input.pais, moneda: input.moneda,
          file: { name: input.file.name, fileRef: input.file.fileRef, hash: input.file.hash },
          version: { label: input.version }
        },
        workbook: snapshot,
        capabilities: {
          sourceTypeProposal: 'cotizador_excel_salida', containsRatesProposal: true,
          containsCalculationRulesProposal: true, containsOutputSheetProposal: true,
          containsPresentationProposal: true, containsPrintAreaProposal: true,
          requiresExampleQuote: false
        },
        sourceProposal: {
          id: 'src_docsrc_demo', tenantId: input.tenantId, aseguradoraId: input.aseguradoraId,
          nombre: input.file.name, tipoFuente: 'cotizador_excel_salida', pais: input.pais,
          moneda: input.moneda, ramo: input.dimensiones.ramo, producto: input.dimensiones.producto,
          dimensiones: input.dimensiones, version: input.version, documentoFuenteId: 'docsrc_demo',
          archivoRef: input.file.fileRef, contieneTarifas: true, contieneReglasCalculo: true,
          contieneHojaSalida: true, contieneFormatoCotizacion: true, contieneAreaImpresion: true,
          usos: ['tarifas', 'reglas_calculo', 'presentacion_cotizacion'], estado: 'requiere_validacion'
        },
        summary: { sourceTypeProposal: 'cotizador_excel_salida', worksheets: 4, hiddenWorksheets: 1, definedNames: 3, formulaCount: 120, printAreas: 1, macrosDetected: true, externalLinksDetected: false },
        writeAllowed: false, approved: false
      };
    }
  }
};
const context = {
  window: { Orbit: orbit, dispatchEvent() {} }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/document-source-wire-p05.js', 'utf8'), context);
const api = orbit.documentSourceWireP05;
function assert(condition, message) { if (!condition) throw new Error(message); }

const admin = { id: 'u1', roles: ['admin', 'asesor'], activeRole: 'admin' };
const adviser = { id: 'u1', roles: ['admin', 'asesor'], activeRole: 'asesor' };
const request = api.buildReadRequest({
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ', version: '2026.07',
  motivo: 'Inventariar cotizador recibido',
  file: { name: 'Cotizador Autos.xlsm', fileRef: 'drive:file-1', hash: 'hash-1' },
  dimensiones: { ramo: 'Automóviles', producto: 'Autos', tipoVehiculo: 'Liviano' }
});
assert(request.includeCellValues === false && request.includeBinaryPayload === false, 'Read request debe ser metadata-only');
assert(request.executeMacros === false && request.calculateFormulas === false, 'No ejecuta macros/fórmulas');
assert(api.validateReadRequest(request, admin).valid, 'Admin activo puede inventariar');
assert(!api.validateReadRequest(request, adviser).valid, 'Rol activo Asesor debe bloquear lectura');

let providerRequest;
const inspection = await api.inspectMetadata({
  ...request, actor: admin, store: orbit.store,
  provider: { async inspectWorkbook(req) { providerRequest = req; return { worksheetCount: 4, definedNameCount: 3, workbookFingerprint: 'wb-1', hasMacros: true, externalLinkCount: 0, parser: { provider: 'test' } }; } }
});
assert(inspection.ok, 'Inspector debe producir dry-run');
assert(providerRequest.executeMacros === false && providerRequest.includeCellValues === false, 'Proveedor recibe límites');
assert(inspection.audit.length === 2 && auditRows.length === 2, 'Debe registrar solicitud y resultado');
assert(inspection.audit.every(row => row.containsBytes === false && row.containsSecrets === false), 'Auditoría sin payload/secretos');

const insurer = { id: 'asg-demo', docs: [{ id: 'src-old', tipoFuente: 'tarifario_excel', version: '2025', pais: 'GT', ramo: 'Automóviles', producto: 'Autos' }] };
const persist = api.buildPersistenceDryRun({ inspection, aseguradoraActual: insurer, documentosActuales: [] });
assert(persist.ok && persist.operations.length === 2, 'Debe proponer documento + patch aseguradora');
assert(persist.operations[0].collection === 'documentos' && persist.operations[1].collection === 'aseguradoras', 'Colecciones correctas');
assert(persist.operations[1].patch.docs.length === 2, 'Debe conservar fuente anterior y agregar nueva');
assert(persist.documentRecord.habilitadoCotizador === false && persist.documentRecord.habilitadoComparativo === false, 'Inventario no habilita motores');
assert(persist.writeAllowed === false && persist.requiresCurrentStateRecheck === true, 'Dry-run no escribe y exige recheck');

const wrongFingerprint = api.buildConfirmedPlan(persist, { actor: admin, confirmed: true, motivo: 'Confirmar inventario', currentDocsFingerprint: 'wrong' });
assert(!wrongFingerprint.ok && wrongFingerprint.errors.includes('ESTADO_ACTUAL_CAMBIO_REEJECUTAR_DRY_RUN'), 'Cambio concurrente debe bloquear');
const confirmed = api.buildConfirmedPlan(persist, {
  actor: admin, confirmed: true, motivo: 'Confirmar inventario',
  currentDocsFingerprint: persist.operations[1].preconditions.currentDocsFingerprint
});
assert(confirmed.ok && confirmed.operations.length === 2, 'Confirmación válida conserva operaciones');
assert(confirmed.writeAllowed === false && confirmed.applyFunctionProvided === false, 'No incluye writer');

const sameHash = api.buildPersistenceDryRun({
  inspection,
  aseguradoraActual: insurer,
  documentosActuales: [{ id: 'doc-old', aseguradoraId: 'asg-demo', sourceHash: 'hash-1' }]
});
assert(sameHash.code === 'OMIT_SAME_HASH' && sameHash.operations.length === 0, 'Mismo hash debe omitirse');

const denied = await api.inspectMetadata({ ...request, actor: adviser, store: orbit.store });
assert(!denied.ok && denied.code === 'FORBIDDEN_ROLE', 'Asesor activo no puede inventariar');

console.log('OK orbit360-test-document-source-wire-p05');
