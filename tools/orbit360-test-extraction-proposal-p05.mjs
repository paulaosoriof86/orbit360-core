import fs from 'node:fs';
import vm from 'node:vm';

const orbit = {
  documentSourceContractP04: {
    sanitize(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  }
};
const context = { window: { Orbit: orbit }, Orbit: orbit, console, Date, Math, Set, Array, String, Object, JSON, Promise };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/extraction-proposal-p05.js', 'utf8'), context);
const api = orbit.documentExtractionProposalP05;
function assert(condition, message) { if (!condition) throw new Error(message); }

const ctx = {
  tenantId: 'tenant-demo', aseguradoraId: 'asg-demo', documentId: 'doc-v1', versionFuente: '2026.07',
  mediaKind: 'spreadsheet', dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Automóviles', producto: 'Autos', tipoVehiculo: 'Liviano' }
};
const proposals = [
  api.normalizeProposal({
    concepto: 'prima_minima', nombre: 'Prima mínima', valor: 1200, unidad: 'GTQ', confianza: 94,
    evidencia: { sheet: 'Tarifas Autos', range: 'B2', formulaRef: '=B2' }
  }, ctx, 0),
  api.normalizeProposal({
    concepto: 'gasto_emision', nombre: 'Gasto de emisión', valor: 5, unidad: 'porcentaje', confianza: 91,
    calificadores: { aplica: 'excepto columna' }, evidencia: { sheet: 'Cálculos', range: 'C8' }
  }, ctx, 1),
  api.normalizeProposal({
    concepto: 'recargo_fraccionamiento', nombre: 'Recargo 12 pagos', valor: 13.3, unidad: 'porcentaje', confianza: 88,
    calificadores: { cuotas: 12 }, evidencia: { sheet: 'Factores', range: 'D4' }
  }, ctx, 2)
];
assert(proposals.every(item => item.estado === 'propuesto'), 'Propuestas con evidencia deben quedar propuestas');
assert(proposals[0].dimensiones.producto === 'Autos', 'Debe conservar producto');
assert(proposals[0].evidencia.containsRawPayload === false, 'Evidencia no debe contener payload crudo');
assert(api.validateProposal(proposals[0]).valid, 'Propuesta completa debe validar');

const missingEvidence = api.normalizeProposal({ concepto: 'tasa', valor: 2.5, confianza: 90 }, ctx, 3);
assert(missingEvidence.estado === 'sin_evidencia', 'Sin hoja/rango debe quedar sin evidencia');
assert(!api.validateProposal(missingEvidence).valid, 'Sin evidencia no valida');

const current = [{ id: 'k1', clave: proposals[0].clave, valor: 1000, estado: 'vigente' }];
const diff = api.buildDiff(current, proposals);
assert(diff.summary.updateProposed === 1, 'Prima mínima cambiada debe ser update_proposed');
assert(diff.summary.createProposed === 2, 'Dos conceptos nuevos deben ser create_proposed');
assert(diff.writeAllowed === false && diff.approved === false, 'Diff no escribe ni aprueba');

const conflictA = api.normalizeProposal({ concepto: 'tasa', nombre: 'Tasa base', valor: 2.4, confianza: 80, evidencia: { sheet: 'Tarifas', range: 'A2' } }, ctx, 4);
const conflictB = api.normalizeProposal({ concepto: 'tasa', nombre: 'Tasa base', valor: 2.8, confianza: 82, evidencia: { sheet: 'Tarifas', range: 'B2' } }, ctx, 5);
const conflictDiff = api.buildDiff([], [conflictA, conflictB]);
assert(conflictDiff.summary.conflicts === 1, 'Valores distintos para misma clave deben generar conflicto');
assert(conflictDiff.rows.every(row => row.action === 'conflict_requires_validation'), 'Conflicto no puede crear/actualizar automáticamente');

const decisions = [
  { proposalId: proposals[0].id, action: 'correct', value: 1100, motivo: 'Validado con cotización oficial' },
  { proposalId: proposals[1].id, action: 'confirm', motivo: 'Confirmado contra hoja de cálculo' },
  { proposalId: proposals[2].id, action: 'reject', motivo: 'Factor aplica a otro plan' }
];
const plan = api.buildConfirmedKnowledgePlan(diff, decisions, { actorId: 'usr-admin', rolActivo: 'admin' });
assert(plan.ok, 'Decisiones completas deben producir plan');
assert(plan.records.length === 2, 'Una propuesta rechazada no crea registro');
assert(plan.records.every(row => row.estado === 'validado_pendiente_habilitacion'), 'Validación no debe habilitar Cotizador/Comparativo');
assert(plan.records.every(row => row.habilitadoCotizador === false && row.habilitadoComparativo === false), 'Debe requerir segundo gate');
assert(plan.requiresSecondGateForEnablement === true && plan.writeAllowed === false, 'Plan no escribe y exige gate posterior');

let providerRequest;
const extracted = await api.extractWithProvider({
  ...ctx,
  provider: {
    async extractFacts(request) {
      providerRequest = request;
      return { proposals: [{ concepto: 'impuesto', nombre: 'IVA', valor: 12, unidad: 'porcentaje', confianza: 97, evidencia: { sheet: 'Cálculos', range: 'F5' } }] };
    }
  }
});
assert(extracted.ok && extracted.proposals.length === 1, 'Proveedor debe entregar propuestas');
assert(providerRequest.includeRawCells === false && providerRequest.includeWorkbookPayload === false, 'Solicitud no debe incluir payload crudo');
assert(providerRequest.executeMacros === false && providerRequest.calculateFormulas === false, 'Solicitud no ejecuta macros/fórmulas');
assert(extracted.writeAllowed === false && extracted.approved === false, 'Extracción no escribe ni aprueba');

console.log('OK orbit360-test-extraction-proposal-p05');
