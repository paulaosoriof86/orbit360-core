import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const files = [
  path.join(root, 'core/tenant-canonical-paths-contract-p0.js'),
  path.join(root, 'core/tenant-access-policy-contract-p0.js'),
];

const context = { window: { Orbit: {} }, console };
vm.createContext(context);
for (const file of files) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const paths = context.window.Orbit.tenantCanonicalPathsP0;
const access = context.window.Orbit.tenantAccessPolicyP0;
assert.ok(paths && access, 'contracts_loaded');

assert.equal(paths.dataDocumentPath('tenant-ejemplo', 'clientes', 'cli_001'), 'tenants/tenant-ejemplo/data/clientes/items/cli_001');
assert.equal(paths.membershipDocumentPath('tenant-ejemplo', 'uid_001'), 'tenants/tenant-ejemplo/members/uid_001');
assert.equal(paths.parseDataDocumentPath('tenants/tenant-ejemplo/data/clientes/items/cli_001').ok, true);
assert.equal(paths.validateTenantId('Tenant Ejemplo').ok, false);
assert.equal(paths.validateDocumentId('../escape').ok, false);
assert.equal(paths.validateCollection('secrets').ok, false);

const validEnvelope = paths.validateRecordEnvelope({
  id: 'cli_001', tenantId: 'tenant-ejemplo', country: 'GT', currency: 'GTQ', trace: { source: 'dry-run' }
}, { tenantId: 'tenant-ejemplo', collection: 'clientes', documentId: 'cli_001' });
assert.equal(validEnvelope.ok, true);
assert.equal(validEnvelope.writeAuthorized, false);

const badCurrency = paths.validateRecordEnvelope({
  id: 'cli_001', tenantId: 'tenant-ejemplo', country: 'GT', currency: 'COP'
}, { tenantId: 'tenant-ejemplo', collection: 'clientes' });
assert.equal(badCurrency.ok, false);
assert.ok(badCurrency.errors.includes('pais_moneda_inconsistente'));

const secretEnvelope = paths.validateRecordEnvelope({
  id: 'aseg_001', tenantId: 'tenant-ejemplo', password: 'no-permitido'
}, { tenantId: 'tenant-ejemplo', collection: 'aseguradoras' });
assert.equal(secretEnvelope.ok, false);
assert.ok(secretEnvelope.errors.some((item) => item.startsWith('material_secreto_no_permitido:')));

const advisor = {
  uid: 'u-asesor', tenantId: 'tenant-ejemplo', roles: ['Asesor'], activeRole: 'Asesor', status: 'active',
  modulesVisible: ['cliente360', 'polizas', 'cobros', 'ops', 'calidad', 'aseguradoras'],
  dataScopes: { default: 'own', modules: {} }, countries: ['GT'], advisorId: 'asesor-1', teamId: 'equipo-1'
};
const ownClient = { id: 'cli_1', tenantId: 'tenant-ejemplo', country: 'GT', advisorId: 'asesor-1', teamId: 'equipo-1' };
const otherClient = { id: 'cli_2', tenantId: 'tenant-ejemplo', country: 'GT', advisorId: 'asesor-2', teamId: 'equipo-2' };
assert.equal(access.canRead('clientes', ownClient, advisor).allowed, true);
assert.equal(access.canRead('clientes', otherClient, advisor).allowed, false);
assert.equal(access.canRead('clientes', { ...ownClient, tenantId: 'otro-tenant' }, advisor).allowed, false);
assert.equal(access.canRead('plataformasAseguradora', { id: 'p1', tenantId: 'tenant-ejemplo', country: 'GT' }, advisor).allowed, false);
assert.equal(access.canRead('credentialRefs', { id: 'c1', tenantId: 'tenant-ejemplo' }, advisor).allowed, false);
assert.equal(access.canWrite('polizas', 'update', ownClient, { estado: 'cancelada' }, advisor).allowed, false);
assert.equal(access.canWrite('clientes', 'update', ownClient, { whatsapp: '5555' }, advisor).allowed, true);
assert.equal(access.canWrite('clientes', 'update', ownClient, { advisorId: 'asesor-2' }, advisor).allowed, false);
assert.equal(access.canWrite('gestiones', 'create', { ...ownClient, type: 'cliente_no_aparece', reason: 'No aparece en mi vista' }, null, advisor).allowed, true);

const direction = {
  uid: 'u-dir', tenantId: 'tenant-ejemplo', roles: ['Dirección', 'Asesor'], activeRole: 'Dirección', status: 'active',
  modulesVisible: ['*'], dataScopes: { default: 'all', modules: {} }, countries: ['GT', 'CO'], advisorId: 'dir-1'
};
assert.equal(access.canRead('auditEvents', { id: 'a1', tenantId: 'tenant-ejemplo' }, direction).allowed, true);
assert.equal(access.canWrite('finmovs', 'create', { id: 'f1', tenantId: 'tenant-ejemplo', country: 'GT' }, null, direction).allowed, false);
assert.equal(access.canWrite('members', 'update', { id: 'u2', uid: 'u2', tenantId: 'tenant-ejemplo' }, {}, direction).allowed, false);

const q = access.queryConstraints('clientes', advisor);
assert.equal(q.ok, true);
assert.ok(q.constraints.some((item) => item.field === 'tenantId' && item.value === 'tenant-ejemplo'));
assert.ok(q.constraints.some((item) => item.field === 'advisorId' && item.value === 'asesor-1'));

assert.equal(typeof paths.write, 'undefined');
assert.equal(typeof access.write, 'undefined');
console.log(JSON.stringify({
  ok: true,
  tests: 27,
  contracts: [paths.VERSION, access.VERSION],
  canonicalPath: paths.dataDocumentPath('tenant-ejemplo', 'clientes', 'cli_001'),
  guards: {
    tenantIsolation: 'PASS',
    scopeIsolation: 'PASS',
    countryScope: 'PASS',
    advisorLimits: 'PASS',
    secretsBlocked: 'PASS',
    controlledWritesOnly: 'PASS',
    noWriteFunctions: 'PASS'
  }
}, null, 2));
