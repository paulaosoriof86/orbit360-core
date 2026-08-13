import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const repoRoot = process.cwd().endsWith('orbit360-platform') ? process.cwd() : path.join(process.cwd(), 'orbit360-platform');
const source = fs.readFileSync(path.join(repoRoot, 'core/aseguradoras-bank-account-visibility-policy-p0.js'), 'utf8');
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'core/aseguradoras-bank-account-visibility-policy-p0.js' });
const api = sandbox.window.Orbit.aseguradorasBankAccountVisibilityPolicyP0;

const base = {
  tenantId: 'tenant-test', status: 'active', modulesVisible: ['aseguradoras'],
  modulesExtra: [], modulesRestricted: [], permissionsExtra: [], restrictions: []
};
const roles = ['Dirección','SuperAdmin','AdminTenant','Admin','Operativo','Asesor'];
const checks = [];
function test(name, fn) { fn(); checks.push(name); }

for (const role of roles) {
  const membership = { ...base, roles: [role], activeRole: role };
  test(`${role} bank read`, () => assert.equal(api.canReadBankAccounts(membership).allowed, true));
  test(`${role} bank copy`, () => assert.equal(api.canCopyBankAccounts(membership).copyAllowed, true));
  test(`${role} full number`, () => assert.equal(api.canReadBankAccounts(membership).fullAccountNumberVisible, true));
}

test('advisor platform credentials denied', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor' };
  assert.equal(api.canViewPlatformCredentials(membership).allowed, false);
});
test('advisor platform credentials explicit extra', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor', permissionsExtra:['aseguradoras_plataformas_credenciales'] };
  assert.equal(api.canViewPlatformCredentials(membership).allowed, true);
});
test('operativo platform credentials allowed', () => {
  const membership = { ...base, roles:['Operativo'], activeRole:'Operativo' };
  assert.equal(api.canViewPlatformCredentials(membership).allowed, true);
});
test('bank read independent from credential restriction', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor', restrictions:['aseguradoras_plataformas_credenciales'] };
  assert.equal(api.canReadBankAccounts(membership).allowed, true);
});
test('advisor cannot edit bank by read permission', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor' };
  assert.equal(api.canEditBankAccounts(membership).allowed, false);
});
test('advisor can edit only explicit edit permission', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor', permissionsExtra:['aseguradoras_bancos_editar'] };
  assert.equal(api.canEditBankAccounts(membership).allowed, true);
});
test('edit restriction wins', () => {
  const membership = { ...base, roles:['Dirección'], activeRole:'Dirección', restrictions:['aseguradoras_bancos_editar'] };
  assert.equal(api.canEditBankAccounts(membership).allowed, false);
});
test('inactive membership blocked', () => {
  const membership = { ...base, status:'suspended', roles:['Asesor'], activeRole:'Asesor' };
  assert.equal(api.canReadBankAccounts(membership).allowed, false);
});
test('module restriction blocks all', () => {
  const membership = { ...base, roles:['Asesor'], activeRole:'Asesor', modulesRestricted:['aseguradoras'] };
  assert.equal(api.canReadBankAccounts(membership).allowed, false);
});
test('collection override advisor read true', () => {
  assert.equal(api.COLLECTION_POLICY_OVERRIDE.cuentasBancariasAseguradora.advisorRead, true);
});
test('no write functions', () => {
  assert.equal(Object.keys(api).some(k => ['insert','update','remove','write','deploy'].includes(k)), false);
});

console.log(JSON.stringify({ ok:true, tests:checks.length, checks }, null, 2));
