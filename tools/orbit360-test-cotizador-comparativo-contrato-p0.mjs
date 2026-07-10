import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/core/cotizador-comparativo-contrato-p0.js';
const code = fs.readFileSync(file, 'utf8');
const context = { window: {}, console, Date };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.cotizadorComparativoP0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(api.recommendationEnabled({}) === true, 'La recomendación debe estar activa por defecto');
assert(api.recommendationEnabled({ recomendacionConsultiva: false }) === false, 'El tenant debe poder desactivar la recomendación');

const automatic = api.normalizeQuote({
  pais: 'GT', aseguradoraId: 'asg-demo', ramo: 'Autos', producto: 'Vehículos',
  origen: 'tarifa_validada', versionFuente: 'v1', valores: { primaNeta: 1000, gastosEmision: 50, impuestos: 126, primaTotal: 1176 }
});
assert(api.validateQuote(automatic).valid === true, 'La cotización automática completa debe validar');

const pdf = api.normalizeQuote({
  pais: 'CO', aseguradoraId: 'asg-co', ramo: 'Autos', producto: 'Todo riesgo',
  origen: 'pdf_externo', documentoFuenteId: 'doc-1', valores: { primaNeta: 1000000, impuestos: 190000, primaTotal: 1190000 }
});
assert(api.validateQuote(pdf).valid === true, 'La cotización PDF completa debe validar');
assert(pdf.moneda === 'COP', 'Colombia debe resolver COP');

const hist = api.createHistoryRecord('cotizacion', automatic, { asesorId: 'ase-1' });
assert(api.canAccessHistory({ asesorId: 'ase-1', roles: ['Asesor'], scopeDatos: 'propios' }, hist) === true, 'El asesor propietario debe ver su historial');
assert(api.canAccessHistory({ asesorId: 'ase-2', roles: ['Asesor'], scopeDatos: 'propios' }, hist) === false, 'Otro asesor no debe ver historial ajeno');
assert(api.canAccessHistory({ id: 'admin-1', roles: ['Admin'] }, hist) === true, 'Admin debe poder ver el historial');

const duplicate = api.duplicateEntity(automatic, { id: 'usr-1' });
assert(duplicate.id !== automatic.id && duplicate.duplicadoDe === automatic.id, 'Duplicar debe crear un nuevo borrador trazable');
const archived = api.archiveHistory(hist, { id: 'usr-1' }, 'Depuración operativa');
assert(archived.eliminadoLogico === true && archived.archivoAudit.motivo, 'Eliminar debe ser archivado lógico auditado');

const manualVersion = api.createTariffVersion({
  aseguradoraId: 'asg-demo', pais: 'GT', ramo: 'Autos', producto: 'Vehículos',
  tipoFuente: 'ajuste_manual_versionado', baseVersionId: 'tar-v1', motivo: 'Cambio puntual comunicado por aseguradora',
  ajustes: [{ campo: 'tasa', anterior: 3.1, nuevo: 3.2 }]
});
assert(api.validateTariffVersion(manualVersion).valid === true, 'El ajuste manual versionado completo debe validar');
assert(api.validateTariffVersion(api.createTariffVersion({ tipoFuente: 'ajuste_manual_versionado' })).valid === false, 'El ajuste manual sin base/motivo debe bloquearse');

const print = api.printProfile({ aseguradoraId: 'asg-demo', pais: 'GT', producto: 'Autos', plantillaVersion: 'v2' });
assert(print.conservarCamposMateriales === true && print.brandingTenant === true, 'La impresión debe conservar información material y marca tenant');

const wa = api.whatsappTemplatePolicy();
assert(wa.dobleAprobacion === true && wa.aprobacionPublicacion.includes('admin') && wa.aprobacionPublicacion.includes('direccion'), 'La plantilla WhatsApp debe requerir Admin y Dirección');

const route = api.resolveAIRoute('extraccion_pdf_complejo', { routes: { extraccion_pdf_complejo: 'provider-a' }, benchmarkProfileId: 'bench-1' });
assert(route.provider === 'provider-a' && route.requireHumanValidation === true, 'El motor IA debe ser configurable y conservar validación humana');

const online = api.onlineCalculatorStrategy({ aseguradoraId: 'asg-online', pais: 'GT', producto: 'Autos' });
assert(online.captchaNoEvadir === true && online.estado === 'requiere_validacion', 'El cotizador en línea debe usar captura asistida sin evasión');

console.log('OK orbit360-test-cotizador-comparativo-contrato-p0');