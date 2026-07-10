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
assert(api.maskAccount('1234567890').endsWith('7890'), 'La cuenta debe conservar solo últimos cuatro dígitos al ocultar');

const hidden = api.sensitiveView('ClaveSegura123', { roles: ['Admin'] }, false, 'secret');
assert(hidden.visible === true && hidden.value !== 'ClaveSegura123', 'Admin debe ver dato oculto antes de revelar');
const revealed = api.sensitiveView('ClaveSegura123', { roles: ['Admin'] }, true, 'secret');
assert(revealed.value === 'ClaveSegura123', 'Admin debe poder revelar bajo demanda');

const document = api.normalizeDocument({ nombre: 'Tarifa autos.pdf', cat: 'Tarifas', pais: 'GT', moneda: 'GTQ' });
assert(document.categoria === 'tarifa', 'Debe clasificar documento tarifa');
assert(document.estadoValidacion === 'requiere_validacion', 'Documento nuevo requiere validación');

const plan = api.normalizePlan({ ramo: 'Autos', producto: 'Vehículos', plan: 'Completo', pais: 'GT', moneda: 'GTQ', fuenteDocumentoId: document.id });
assert(api.validatePlan(plan).valid === true, 'Plan completo debe validar');
assert(api.validatePlan(api.normalizePlan({ ramo: 'Autos' })).valid === false, 'Plan incompleto debe bloquearse');

const audit = api.auditEvent({ aseguradoraId: 'asg-demo', campo: 'password', usuarioId: 'usr-demo' });
assert(audit.tipo === 'consulta_dato_sensible', 'Debe crear evento de auditoría');

console.log('OK orbit360-test-aseguradoras-directorio-p0');