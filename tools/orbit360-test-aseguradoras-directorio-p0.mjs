import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/core/aseguradoras-directorio-p0.js';
const code = fs.readFileSync(file, 'utf8');
const context = { window: {}, console, Date };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.aseguradorasDirectorioP0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(api.canViewSensitive({ roles: ['SuperAdmin'] }) === true, 'SuperAdmin debe ver datos sensibles');
assert(api.canViewSensitive({ rolActivo: 'Operativo' }) === true, 'Operativo debe ver datos sensibles');
assert(api.canViewSensitive({ roles: ['Asesor'] }) === false, 'Asesor no debe ver datos sensibles por defecto');
assert(api.maskSecret('ClaveSegura123') !== 'ClaveSegura123', 'La contraseña debe ocultarse por defecto');
assert(api.maskAccount('1234567890').endsWith('7890'), 'La cuenta debe conservar últimos cuatro dígitos');

const docTarifa = api.normalizeDocument({
  aseguradoraId: 'asg-demo', nombre: 'Tarifario autos.xlsx', archivoRef: 'ref-segura', pais: 'GT', moneda: 'GTQ'
});
assert(docTarifa.categoria === 'tarifario', 'Debe clasificar tarifario Excel');
assert(api.validateDocument(docTarifa).valid === true, 'Documento válido debe pasar');
assert(api.extractionTarget(docTarifa)[0] === 'cotizador', 'Tarifario debe alimentar Cotizador');

const docCot = api.normalizeDocument({
  aseguradoraId: 'asg-demo', nombre: 'Cotizacion ejemplo.pdf', archivoRef: 'ref-segura', pais: 'GT'
});
assert(api.extractionTarget(docCot).includes('comparativo'), 'Cotización ejemplo debe alimentar Comparativo');

const proposal = api.normalizeExtractedProposal({
  aseguradoraId: 'asg-demo', sourceDocumentId: docTarifa.id, sourceDocumentVersion: 1,
  destino: 'cotizador', pais: 'GT', moneda: 'GTQ', ramo: 'Autos', producto: 'auto_completo',
  nombrePlan: 'Completo', tipoCalculo: 'tabla_rangos', reglasTarifa: { rangos: [] }
});
assert(proposal.editableManual === false, 'Planes/tarifas no deben editarse manualmente');
assert(api.validateExtractedProposal(proposal).valid === true, 'Propuesta completa debe validar');
assert(api.activateProposal(proposal, { confirmed: false, userId: 'usr-admin' }).activated === false, 'Sin confirmación humana no activa');
assert(api.activateProposal(proposal, { confirmed: true, userId: 'usr-admin' }).activated === true, 'Con confirmación humana puede habilitarse');

const audit = api.auditEvent({ aseguradoraId: 'asg-demo', campo: 'password', usuarioId: 'usr-demo' });
assert(audit.tipo === 'consulta_dato_sensible', 'Debe crear evento de auditoría');

console.log('OK orbit360-test-aseguradoras-directorio-p0');