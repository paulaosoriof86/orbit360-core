'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const read = file => fs.readFileSync(file, 'utf8');
const source = read('orbit360-platform/modules/equipo.js');
const membershipContext = { window: { Orbit: {} } };
vm.runInNewContext(read('orbit360-platform/core/membership-multirol-contract-p0.js'), membershipContext);
const definitions = membershipContext.window.Orbit.membershipMultirolP0.DEFAULT_ROLE_DEFINITIONS;
const roles = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo', 'Finanzas', 'Marketing', 'Asesor', 'Asistente', 'Comercial'];
const modules = ['inicio', 'ops', 'leads', 'cliente360', 'polizas', 'cobros', 'renovaciones',
  'aseguradoras', 'cancelaciones', 'historial', 'calidad', 'importar', 'equipo', 'configuracion',
  'comisiones', 'finanzas', 'conciliaciones', 'marketing', 'reportes', 'portal'];
const roleDefinition = role => definitions[role] || (role === 'Admin' ? definitions.AdminTenant : null);
const baseModules = selected => {
  const out = new Set();
  for (const role of selected) {
    for (const key of roleDefinition(role)?.modules || []) {
      if (key === '*') modules.forEach(m => out.add(m));
      else out.add(key);
    }
  }
  return [...out];
};
const defaultsSource = source.slice(source.indexOf('  function defaultPermissions()'), source.indexOf('  function defaultRoleScopes()'));
assert.ok(defaultsSource.includes('function defaultPermissions'), 'Equipos defaultPermissions must exist');
const defaults = new Function('roleCatalog', 'roleDefinition', 'baseModules', 'allModuleIds',
  `${defaultsSource}\nreturn defaultPermissions();`)(() => roles, roleDefinition, baseModules, () => modules);

test('SuperAdmin, Dirección, AdminTenant and Admin have full default Ver/Editar portfolio without legacy nivel', () => {
  for (const role of ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin']) {
    for (const moduleKey of modules) assert.deepEqual(defaults[role][moduleKey],
      { ver: true, editar: true }, `${role} ${moduleKey}`);
  }
});

test('Operativo edits every assigned business module, but never inherits non-assigned admin or finance modules', () => {
  for (const moduleKey of baseModules(['Operativo'])) assert.deepEqual(defaults.Operativo[moduleKey],
    { ver: true, editar: true }, moduleKey);
  for (const moduleKey of ['equipo', 'configuracion', 'finanzas', 'conciliaciones'])
    assert.deepEqual(defaults.Operativo[moduleKey], { ver: false, editar: false }, moduleKey);
  assert.equal(defaults.Asesor.ops.editar, false);
  assert.equal(defaults.Asesor.polizas.editar, false);
});

test('protected Equipos rolePermissions override default writes without losing unrelated baseline', () => {
  const functions = source.slice(source.indexOf('  function mergePermissionMatrix('), source.indexOf('  function getRoleScopes()'));
  assert.ok(functions.includes('function getPermisos'), 'Equipos must merge protected access authority');
  const Orbit = { cat: { all: () => ({ permisos: {} }) } };
  const protectedAccess = { rolePermissions: {
    Operativo: { polizas: { ver: true, editar: false } },
    SuperAdmin: { ops: { ver: false, editar: false } },
    Asesor: { leads: { ver: true, editar: true } }
  } };
  const actual = new Function('defaultPermissions', 'Orbit', 'getAccessConfig',
    `${functions}\nreturn getPermisos();`)(() => defaults, Orbit, () => protectedAccess);
  assert.equal(actual.Operativo.polizas.editar, false);
  assert.equal(actual.Operativo.cobros.editar, true);
  assert.equal(actual.SuperAdmin.ops.ver, false);
  assert.equal(actual.SuperAdmin.ops.editar, false);
  assert.equal(actual.SuperAdmin.equipo.editar, true);
  assert.equal(actual.Asesor.leads.editar, true);
  assert.equal(actual.Asesor.polizas.editar, false);
});

console.log('I66_EQUIPOS_ROLE_DEFAULTS_AND_PROTECTED_OVERRIDES_PASS_SYNTHETIC');
