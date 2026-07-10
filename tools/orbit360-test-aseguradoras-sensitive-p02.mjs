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
  console,
  Date,
  Math,
  Set,
  Array,
  String,
  Object,
  CustomEvent: class CustomEvent { constructor(name, init) { this.type = name; this.detail = init && init.detail; } },
  navigator: {},
  setTimeout,
  clearTimeout
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.Orbit.aseguradorasSensitiveP02;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(api.canViewSensitive({ roles: ['SuperAdmin'] }) === true, 'SuperAdmin debe poder consultar');
assert(api.canViewSensitive({ roles: ['Dirección'] }) === true, 'Dirección debe poder consultar');
assert(api.canViewSensitive({ roles: ['AdminTenant'] }) === true, 'AdminTenant debe poder consultar');
assert(api.canViewSensitive({ roles: ['Operativo'] }) === true, 'Operativo debe poder consultar');
assert(api.canViewSensitive({ roles: ['Asesor'] }) === false, 'Asesor no debe consultar datos sensibles');
assert(api.canEditSensitive({ roles: ['Operativo'] }) === false, 'Operativo consulta pero no administra secretos');
assert(api.canEditSensitive({ roles: ['Admin'] }) === true, 'Admin puede administrar referencias seguras');

assert(api.maskSecret('clave-real') === '••••••••••••', 'La contraseña debe quedar enmascarada');
assert(api.maskAccount('1234 5678 9012') === '•••• 9012', 'La cuenta debe mostrar solo últimos cuatro');

const audit = api.buildAuditEvent({
  action: 'consultar_credencial', resourceType: 'portal', resourceId: 'p1',
  aseguradoraId: 'asg1', field: 'password', actor: { roles: ['Admin'], email: 'admin@example.test' },
  metadata: { credentialRef: 'cred-1', password: 'NO_DEBE_QUEDAR', value: 'NO', banco: 'Banco demo' }
});
assert(audit.contieneValorSensible === false, 'Auditoría debe declarar ausencia de valor sensible');
assert(!('password' in audit.metadata) && !('value' in audit.metadata), 'Auditoría debe sanear valores sensibles');
assert(audit.metadata.credentialRef === 'cred-1', 'La referencia segura sí puede auditarse');

const denied = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Asesor'] }, provider: { resolveCredential: async () => ({ value: 'secreto' }) }
});
assert(denied.ok === false && denied.code === 'FORBIDDEN_ROLE', 'Asesor debe quedar bloqueado');

const unavailable = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Operativo'] }, provider: null
});
assert(unavailable.ok === false && unavailable.code === 'BACKEND_REQUIRED', 'Sin proveedor debe mostrar estado honesto');

const resolved = await api.requestCredential({
  store, aseguradoraId: 'asg1', portalId: 'p1', credentialRef: 'cred-1',
  actor: { roles: ['Operativo'] },
  provider: { resolveCredential: async request => ({ value: request.credentialRef === 'cred-1' ? 'clave-segura' : '' }) }
});
assert(resolved.ok === true && resolved.value === 'clave-segura', 'Proveedor seguro debe resolver la credencial');

const directAccount = await api.requestAccountNumber({
  store, aseguradoraId: 'asg1', actor: { roles: ['Operativo'] },
  account: { id: 'cta1', banco: 'Banco demo', numero: '9988776655', moneda: 'GTQ', pais: 'GT' }
});
assert(directAccount.ok === true && directAccount.value === '9988776655', 'Operativo debe consultar cuenta registrada');

const hiddenAccount = api.accountView({ numero: '9988776655', moneda: 'GTQ' }, { roles: ['Asesor'] });
assert(hiddenAccount.allowed === false && hiddenAccount.display === '•••• 6655', 'La vista debe quedar enmascarada para roles no autorizados');

let fallbackCopied = '';
const copied = await api.copySensitive({
  store, value: 'dato-operativo', aseguradoraId: 'asg1', resourceType: 'portal', resourceId: 'p1', field: 'usuario',
  actor: { roles: ['Admin'] }, copyFallback: value => { fallbackCopied = value; return true; }
});
assert(copied.ok === true && fallbackCopied === 'dato-operativo', 'La copia fallback debe funcionar');

const neutral = api.neutralSourceDraft('GT');
assert(neutral.tipoFuente === 'otro', 'La fuente nueva debe iniciar neutral');
assert(neutral.contieneTarifas === false && neutral.contieneReglasCalculo === false && neutral.contieneHojaSalida === false, 'La fuente nueva no debe declarar capacidades sin clasificar');
assert(neutral.moneda === 'GTQ', 'La fuente neutral GT debe heredar GTQ');

assert(auditRows.length >= 5, 'Las consultas y copias deben generar auditoría');
auditRows.forEach(row => {
  const serialized = JSON.stringify(row);
  assert(!serialized.includes('clave-segura'), 'La auditoría no debe incluir la contraseña resuelta');
  assert(!serialized.includes('9988776655'), 'La auditoría no debe incluir la cuenta completa');
});

console.log('OK orbit360-test-aseguradoras-sensitive-p02');
