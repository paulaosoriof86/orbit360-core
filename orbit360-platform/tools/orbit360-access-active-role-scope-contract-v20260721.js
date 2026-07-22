#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const accessPath = path.resolve(__dirname, '..', 'core', 'access-scope.js');
const source = fs.readFileSync(accessPath, 'utf8');
const writes = [];
let activeRole = 'Dirección';

const advisor = {
  id: 'adv-owner',
  nombre: 'Multirol',
  equipoId: 'team-1',
  dataScopes: { default: 'all' }
};
const advisors = [
  advisor,
  { id: 'adv-team', equipoId: 'team-1' },
  { id: 'adv-other', equipoId: 'team-2' }
];
const clients = [
  { id: 'cli-own', asesorId: 'adv-owner', pais: 'GT' },
  { id: 'cli-team', asesorId: 'adv-team', pais: 'GT' },
  { id: 'cli-other', asesorId: 'adv-other', pais: 'GT' }
];
const collections = { asesores: advisors, clientes: clients, auditLog: [], actividades: [], gestiones: [] };
const store = {
  all(collection) { return collections[collection] || []; },
  get(collection, id) { return (collections[collection] || []).find(row => row.id === id) || null; },
  where(collection, predicate) { return (collections[collection] || []).filter(predicate); },
  insert(collection, row) { writes.push(['insert', collection, row && row.id]); (collections[collection] || (collections[collection] = [])).push(row); return row; },
  update(collection, id, patch) { writes.push(['update', collection, id]); const row = this.get(collection, id); if (row) Object.assign(row, patch || {}); return row; },
  remove(collection, id) { writes.push(['remove', collection, id]); return false; }
};

const context = {
  console,
  Date,
  Math,
  Set,
  window: null,
  OrbitBackend: { tenantId: 'tenant-test' },
  Orbit: {
    session: {
      rol: () => activeRole,
      asesorId: () => 'adv-owner',
      rolesAsignados: () => ['Dirección', 'Operativo', 'Asesor']
    },
    auth: { user: () => ({ uid: 'user-1', nombre: 'Multirol', email: 'multirol@example.test' }) },
    tenant: {
      get: () => ({ tenantId: 'tenant-test' }),
      isActive: () => true
    },
    ROLES: {
      'Dirección': { nivel: 5, modulos: ['cliente360', 'calidad', 'aseguradoras'] },
      'Operativo': { nivel: 2, modulos: ['cliente360', 'calidad', 'aseguradoras'] },
      'Asesor': { nivel: 2, modulos: ['cliente360', 'aseguradoras'] }
    },
    store,
    ui: { today: () => '2026-07-21' },
    PAISES: [{ id: 'GT', moneda: 'GTQ' }],
    paisCfg: () => ({ moneda: 'GTQ' })
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: accessPath });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function setRole(role) { activeRole = role; }
function setDefaultScope(scope) { advisor.dataScopes = { default: scope }; }
function visibleClientIds() { return context.Orbit.access.filter('clientes', clients, 'cliente360').map(row => row.id); }

setDefaultScope('all');
setRole('Dirección');
assert(context.Orbit.access.roleScopeCeiling('cliente360') === 'all', 'Dirección debe tener techo all');
assert(context.Orbit.access.dataScope('cliente360') === 'all', 'Dirección debe conservar scope all explícito');
assert(visibleClientIds().length === 3, 'Dirección debe ver los tres clientes');

setRole('Operativo');
assert(context.Orbit.access.roleScopeCeiling('cliente360') === 'team', 'Operativo debe tener techo team');
assert(context.Orbit.access.dataScope('cliente360') === 'team', 'Operativo no puede heredar all');
assert(JSON.stringify(visibleClientIds()) === JSON.stringify(['cli-own', 'cli-team']), 'Operativo debe ver solo equipo');

setRole('Asesor');
assert(context.Orbit.access.roleScopeCeiling('cliente360') === 'own', 'Asesor debe tener techo own');
assert(context.Orbit.access.dataScope('cliente360') === 'own', 'Asesor no puede heredar all');
assert(JSON.stringify(visibleClientIds()) === JSON.stringify(['cli-own']), 'Asesor debe ver solo propios');
assert(context.Orbit.access.canAccessRecord(clients[0], 'cliente360', { collection: 'clientes' }) === true, 'Asesor debe acceder a su cliente');
assert(context.Orbit.access.canAccessRecord(clients[1], 'cliente360', { collection: 'clientes' }) === false, 'Asesor no debe acceder a cliente del equipo');
assert(context.Orbit.access.canAccessRecord(clients[2], 'cliente360', { collection: 'clientes' }) === false, 'Asesor no debe acceder a cliente ajeno');

setDefaultScope('team');
setRole('Asesor');
assert(context.Orbit.access.dataScope('cliente360') === 'own', 'Scope team también debe bajar a own para Asesor');

setDefaultScope('own');
setRole('Dirección');
assert(context.Orbit.access.dataScope('cliente360') === 'own', 'Un scope explícito más restrictivo debe prevalecer para Dirección');

setDefaultScope('none');
['Dirección', 'Operativo', 'Asesor'].forEach(role => {
  setRole(role);
  assert(context.Orbit.access.dataScope('cliente360') === 'none', `none debe prevalecer para ${role}`);
});

setDefaultScope('all');
context.Orbit.ROLES['Dirección'].scopes = { cliente360: 'team' };
setRole('Dirección');
assert(context.Orbit.access.roleScopeCeiling('cliente360') === 'team', 'El scope declarado por rol debe ser el techo efectivo');
assert(context.Orbit.access.dataScope('cliente360') === 'team', 'Dirección debe respetar un techo por módulo más restrictivo');
delete context.Orbit.ROLES['Dirección'].scopes;

setRole('Rol desconocido');
assert(context.Orbit.access.dataScope('cliente360') === 'none', 'Rol desconocido debe cerrar en none');
assert(writes.length === 0, 'La prueba de acceso no puede escribir');

console.log(JSON.stringify({
  test: 'orbit360-access-active-role-scope-contract-v20260721',
  status: 'PASS',
  contract: 'active-role-scope-ceiling-v1',
  cases: {
    directionExplicitAll: 'all',
    operativoExplicitAll: 'team',
    advisorExplicitAll: 'own',
    advisorExplicitTeam: 'own',
    explicitOwnNarrowsDirection: 'own',
    explicitNoneAlwaysWins: true,
    moduleRoleScopeCanNarrow: true,
    unknownRoleFailsClosed: true
  },
  advisorVisibleClients: ['cli-own'],
  writes: writes.length,
  containsPII: false,
  containsSecrets: false
}, null, 2));
