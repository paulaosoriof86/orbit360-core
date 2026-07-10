import fs from 'node:fs';
import vm from 'node:vm';

const file = 'orbit360-platform/core/aseguradoras-sensitive-p02.js';
const code = fs.readFileSync(file, 'utf8');
const auditRows = [];
const store = { insert: (collection, row) => { if (collection === 'auditoria') auditRows.push(row); } };
const context = {
  window: {
    Orbit: {
      auth: { user: () => ({ id: 'u1', email: 'admin@example.test', roles: ['Admin'] }) },
      session: { rol: () => 'Admin' },
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

assert(api.canViewSensitive({ roles: ['SuperAdmin'] }), 'SuperAdmin debe consultar');
assert(api.canViewSensitive({ roles: ['Dirección'] }), 'Dirección debe consultar');
assert(api.canViewSensitive({ roles: ['AdminTenant'] }), 'AdminTenant debe consultar');
assert(api.canViewSensitive({ roles: ['Operativo'] }), 'Operativo debe consultar');
assert(!api.canViewSensitive({ roles: ['Asesor'] }), 'Asesor no debe consultar');
assert(!api.canEditSensitive({ roles: ['Operativo'] }), 'Operativo consulta pero no administra referencias');
assert(api.canEditSensitive({ roles: ['Admin'] }), 'Admin sí administra referencias');
assert(api.maskSecret('clave-real') === '••••••••••••', 'La clave debe enmascararse');
assert(api.maskAccount('1234 5678 9012') === '•••• 9012', 'La cuenta debe ocultarse parcialmente');

const audit = api.buildAuditEvent({
  action: 'consultar_credencial', resourceType: 'portal', resourceId: 'p1',
  aseguradoraId: 'asg1', field: 'password', actor: { roles: ['Admin'], email: 'admin@example.test' },
  metadata: {
    credentialRef: 'cred-1', password: 'NO', value: 'NO', numero_cuenta: 'NO',
    account_number: 'NO', banco: 'Banco demo'
  }
});
assert(audit.contieneValorSensible === false, 'Auditoría debe declarar ausencia de valor sensible');
assert(!('password' in audit.metadata) && !('value' in audit.metadata), 'Debe bloquear password/value');
assert(!('numero_cuenta' in audit.metadata) && !('account_number' in audit.metadata), 'Debe bloquear variantes de cuenta');
assert(audit.metadata.credentialRef === 'cred-1' && audit.metadata.banco === 'Banco demo', 'Debe conservar metadata operativa segura');

const denied = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Asesor'] }, provider: { resolveCredential: async () => ({ value: 'secreto' }) }
});
assert(!denied.ok && denied.code === 'FORBIDDEN_ROLE', 'Asesor debe quedar bloqueado');

const unavailable = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Operativo'] }, provider: null
});
assert(!unavailable.ok && unavailable.code === 'BACKEND_REQUIRED', 'Sin proveedor debe mostrar estado honesto');

const resolved = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Operativo'] },
  provider: { resolveCredential: async request => ({ value: request.credentialRef === 'cred-1' ? 'clave-segura' : '' }) }
});
assert(resolved.ok && resolved.value === 'clave-segura', 'Proveedor seguro debe resolver');

const directAccount = await api.requestAccountNumber({
  store, aseguradoraId: 'asg1', actor: { roles: ['Operativo'] },
  account: { id: 'cta1', banco: 'Banco demo', numero: '9988776655', moneda: 'GTQ', pais: 'GT' }
});
assert(directAccount.ok && directAccount.value === '9988776655', 'Operativo debe consultar cuenta registrada');

const advisorView = api.accountView({ numero: '9988776655', moneda: 'GTQ' }, { roles: ['Asesor'] });
assert(!advisorView.allowed && advisorView.display === 'Acceso restringido', 'Asesor no debe ver ni últimos cuatro');
const operationalView = api.accountView({ numero: '9988776655', moneda: 'GTQ' }, { roles: ['Operativo'] });
assert(operationalView.allowed && operationalView.display === '•••• 6655', 'Operativo debe ver cuenta enmascarada');

let fallbackCopied = '';
const copied = await api.copySensitive({
  store, value: 'dato-operativo', aseguradoraId: 'asg1', resourceType: 'portal', resourceId: 'p1', field: 'usuario',
  actor: { roles: ['Admin'] }, copyFallback: value => { fallbackCopied = value; return true; }
});
assert(copied.ok && fallbackCopied === 'dato-operativo', 'La copia fallback debe funcionar');

let forbiddenFallbackCalled = false;
const deniedCopy = await api.copySensitive({
  store, value: 'no-copiar', aseguradoraId: 'asg1', resourceType: 'portal', resourceId: 'p1', field: 'password',
  actor: { roles: ['Asesor'] }, copyFallback: () => { forbiddenFallbackCalled = true; return true; }
});
assert(!deniedCopy.ok && deniedCopy.code === 'FORBIDDEN_ROLE', 'Asesor no puede copiar datos sensibles');
assert(forbiddenFallbackCalled === false, 'No debe tocar el portapapeles si el rol está bloqueado');

const neutral = api.neutralSourceDraft('GT');
assert(neutral.tipoFuente === 'otro', 'La fuente nueva debe iniciar neutral');
assert(!neutral.contieneTarifas && !neutral.contieneReglasCalculo && !neutral.contieneHojaSalida, 'No debe declarar capacidades sin clasificar');
assert(neutral.moneda === 'GTQ', 'GT debe heredar GTQ');

assert(auditRows.length >= 6, 'Consultas, denegaciones y copias deben generar auditoría');
auditRows.forEach(row => {
  const serialized = JSON.stringify(row);
  assert(!serialized.includes('clave-segura'), 'Auditoría no incluye contraseña');
  assert(!serialized.includes('9988776655'), 'Auditoría no incluye cuenta completa');
  assert(!serialized.includes('no-copiar'), 'Auditoría no incluye valor de copia denegada');
});

console.log('OK orbit360-test-aseguradoras-sensitive-p02');
