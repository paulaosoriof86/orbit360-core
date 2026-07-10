import fs from 'node:fs';
import vm from 'node:vm';

const orbit = { documentSourceContractP04: { sanitize(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); } } };
const context = { window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of ['orbit360-platform/core/document-source-wire-p05.js', 'orbit360-platform/core/extraction-proposal-p05.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const wire = orbit.documentSourceWireP05;
const extraction = orbit.documentExtractionProposalP05;
function assert(condition, message) { if (!condition) throw new Error(message); }

const inspection = {
  ok: true,
  envelope: {
    id: 'doc-v2', tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ',
    file: { name: 'Cotizador Motos.xlsx', fileRef: 'drive:motos-v2', hash: 'hash-motos-v2' }, version: { label: '2026.08' }
  },
  workbook: { worksheetCount: 3, workbookFingerprint: 'wb-motos-v2' },
  summary: { worksheets: 3, sourceTypeProposal: 'cotizador_excel_salida' },
  capabilities: { sourceTypeProposal: 'cotizador_excel_salida' },
  sourceProposal: {
    id: 'src-doc-v2', tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', nombre: 'Cotizador Motos.xlsx',
    tipoFuente: 'cotizador_excel_salida', pais: 'GT', moneda: 'GTQ', ramo: 'Automóviles', producto: 'Motocicletas',
    tipoVehiculo: 'Motocicleta', usoVehiculo: 'Particular', version: '2026.08',
    dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Automóviles', producto: 'Motocicletas', tipoVehiculo: 'Motocicleta', usoVehiculo: 'Particular' }
  }
};
const record = wire.documentRecord(inspection);
assert(record.producto === 'Motocicletas' && record.tipoVehiculo === 'Motocicleta', 'Registro documental debe conservar dimensiones');
assert(record.dimensiones.usoVehiculo === 'Particular', 'Debe conservar dimensiones anidadas');
const version = wire.versionAction(inspection, [{
  id: 'doc-v1', aseguradoraId: 'asg-demo', pais: 'GT', moneda: 'GTQ', ramo: 'Automóviles', producto: 'Motocicletas',
  tipoVehiculo: 'Motocicleta', usoVehiculo: 'Particular', tipoFuente: 'cotizador_excel_salida', version: '2026.08', sourceHash: 'hash-old'
}]);
assert(version.action === 'new_version_proposed', 'Misma combinación con hash distinto debe proponer nueva versión');

const ctx = { tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentId: 'doc-v2', mediaKind: 'spreadsheet', dimensiones: { pais: 'GT', moneda: 'GTQ', producto: 'Autos' } };
const a = extraction.normalizeProposal({ concepto: 'tasa', nombre: 'Tasa base', valor: 2.4, confianza: 90, evidencia: { sheet: 'Tarifas', range: 'A2' } }, ctx, 0);
const b = extraction.normalizeProposal({ concepto: 'tasa', nombre: 'Tasa base', valor: 2.8, confianza: 90, evidencia: { sheet: 'Tarifas', range: 'B2' } }, ctx, 1);
const diff = extraction.buildDiff([], [a, b]);
const unresolved = extraction.buildConfirmedKnowledgePlan(diff, [
  { proposalId: a.id, action: 'confirm', motivo: 'Aceptar A' },
  { proposalId: b.id, action: 'confirm', motivo: 'Aceptar B' }
]);
assert(!unresolved.ok && unresolved.records.length === 0, 'No debe aceptar dos valores conflictivos');
assert(unresolved.errors.some(error => error.code === 'CONFLICTO_NO_RESUELTO'), 'Debe explicar conflicto no resuelto');
const resolved = extraction.buildConfirmedKnowledgePlan(diff, [
  { proposalId: a.id, action: 'confirm', motivo: 'Validado con evidencia principal' },
  { proposalId: b.id, action: 'reject', motivo: 'Corresponde a otro segmento' }
]);
assert(resolved.ok && resolved.records.length === 1, 'Confirmar uno y rechazar otro resuelve conflicto');
assert(extraction.CONCEPTS.includes('iva') && extraction.CONCEPTS.includes('visa_cuotas') && extraction.CONCEPTS.includes('maternidad'), 'Catálogo debe cubrir reglas por producto/país');

console.log('OK orbit360-test-document-source-p05-hardening');
