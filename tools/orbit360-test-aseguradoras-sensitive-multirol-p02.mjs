import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('orbit360-platform/core/aseguradoras-sensitive-p02.js', 'utf8');
let activeRole = 'Asesor';
let providerCalls = 0;
const audits = [];
const advisor = { id: 'ase001', roles: ['Dirección', 'Asesor', 'Operativo'], rol: 'Dirección' };
const store = {
  get: (collection, id) => collection === 'asesores' && id === 'ase001' ? advisor : null,
  insert: (collection, row) => { if (collection === 'auditoria') audits.push(row); }
};
const context = {
  window: {
    Orbit: {
      auth: { user: () => ({ id: 'u1', email: 'multirol@example.test', roles: advisor.roles, rol: 'Dirección' }) },
      session: { rol: () => activeRole, asesorId: () => 'ase001' },
      tenant: { get: () => ({ id: 'tenant-demo' }) },
      store
    },
    dispatchEvent: () => {}
  },
  console, Date, Math, Set, Array, String, Object,
  CustomEvent: class CustomEvent { constructor(name, init) { this.type = name; this.detail = init && init.detail; } },
  navigator: {}, setTimeout, clearTimeout
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.aseguradorasSensitiveP02;

function assert(condition, message) { if (!condition) throw new Error(message); }
const provider = { resolveCredential: async () => { providerCalls += 1; return { value: 'clave-no-auditable' }; } };

assert(api.canViewSensitive() === false, 'Con vista activa Asesor debe quedar bloqueado aunque tenga Dirección asignada');
const denied = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred1', provider,
  reason: 'Prueba de rol activo'
});
assert(!denied.ok && denied.code === 'FORBIDDEN_ROLE', 'La consulta debe denegarse en vista Asesor');
assert(providerCalls === 0, 'No se debe llamar al proveedor cuando el rol activo está bloqueado');

activeRole = 'Operativo';
assert(api.canViewSensitive() === true, 'Operativo asignado y activo debe consultar');
assert(api.canEditSensitive() === false, 'Operativo activo no administra referencias');
const allowed = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred1', provider,
  reason: 'Acceso operativo'
});
assert(allowed.ok && allowed.value === 'clave-no-auditable', 'Operativo activo debe resolver la credencial');
assert(providerCalls === 1, 'Debe llamar al proveedor una sola vez');

activeRole = 'Admin';
assert(api.canViewSensitive() === false, 'Un rol activo no asignado no debe habilitarse por el selector');

assert(api.canViewSensitive({ roles: ['Admin', 'Asesor'], activeRole: 'Asesor' }) === false, 'Actor explícito en vista Asesor debe quedar bloqueado');
assert(api.canViewSensitive({ roles: ['Admin', 'Asesor'], activeRole: 'Admin' }) === true, 'Actor explícito en vista Admin debe consultar');
assert(api.canEditSensitive({ roles: ['Admin', 'Asesor'], activeRole: 'Admin' }) === true, 'Admin activo puede administrar referencias');

assert(audits.some(row => row.resultado === 'denegado' && row.rolActivo === 'Asesor'), 'Debe auditar la denegación con rol activo');
assert(audits.some(row => row.resultado === 'autorizado' && row.rolActivo === 'Operativo'), 'Debe auditar la autorización con rol activo');
audits.forEach(row => assert(!JSON.stringify(row).includes('clave-no-auditable'), 'La auditoría nunca debe guardar el valor resuelto'));

console.log('OK orbit360-test-aseguradoras-sensitive-multirol-p02');
