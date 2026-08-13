import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const context = { window: { Orbit: {} }, console };
vm.createContext(context);
for (const file of ['core/tenant-access-policy-contract-p0.js', 'core/product-query-planner-contract-p0.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const planner = context.window.Orbit.productQueryPlannerP0;
assert.ok(planner, 'planner_loaded');

const advisor = {
  uid: 'u1', tenantId: 'tenant-ejemplo', roles: ['Asesor'], activeRole: 'Asesor', status: 'active',
  modulesVisible: ['cliente360', 'polizas', 'ops', 'calidad'], dataScopes: { default: 'own', modules: {} },
  countries: ['GT'], advisorId: 'adv-1', teamId: 'team-1'
};
const own = planner.compile('clientes', advisor);
assert.equal(own.ok, true);
assert.equal(own.scope, 'own');
assert.ok(own.constraints.some((item) => item.field === 'tenantId' && item.value === 'tenant-ejemplo'));
assert.ok(own.constraints.some((item) => item.field === 'advisorId' && item.value === 'adv-1'));
assert.ok(own.constraints.some((item) => item.field === 'country' && item.value === 'GT'));

const teamMember = { ...advisor, activeRole: 'Operativo', roles: ['Operativo'], modulesVisible: ['cliente360'], dataScopes: { default: 'team', modules: {} } };
const team = planner.compile('clientes', teamMember);
assert.equal(team.ok, true);
assert.equal(team.scope, 'team');
assert.ok(team.constraints.some((item) => item.field === 'teamId' && item.value === 'team-1'));

const direction = {
  uid: 'u2', tenantId: 'tenant-ejemplo', roles: ['Dirección'], activeRole: 'Dirección', status: 'active',
  modulesVisible: ['*'], dataScopes: { default: 'all', modules: {} }, countries: ['GT', 'CO']
};
const all = planner.compile('clientes', direction);
assert.equal(all.ok, true);
assert.equal(all.scope, 'all');
assert.ok(all.constraints.some((item) => item.field === 'country' && item.op === 'in'));
assert.equal(all.constraints.filter((item) => item.field === 'tenantId').length, 1);

const deniedMember = { ...advisor, dataScopes: { default: 'none', modules: {} } };
const denied = planner.compile('clientes', deniedMember);
assert.equal(denied.ok, true);
assert.equal(denied.denied, true);
assert.ok(denied.constraints.some((item) => item.field === '__deny__'));

assert.equal(planner.compile('clientes', { ...advisor, status: 'suspended' }).ok, false);
assert.equal(planner.compile('clientes', { ...advisor, modulesVisible: [] }).ok, false);
assert.equal(planner.compile('', advisor).ok, false);
assert.equal(planner.validateConstraint({ field: 'country', op: 'in', value: Array.from({ length: 11 }, (_, i) => `C${i}`) }, 'tenant-ejemplo').ok, false);
assert.equal(planner.validateConstraint({ field: 'tenantId', op: '==', value: 'otro-tenant' }, 'tenant-ejemplo').ok, false);
assert.equal(planner.validateConstraint({ field: 'x', op: '>', value: 1 }, 'tenant-ejemplo').ok, false);

const factory = planner.createPlanner(advisor);
assert.equal(factory('polizas').ok, true);
const catalog = planner.compileCatalog(['clientes', 'polizas'], advisor);
assert.equal(catalog.ok, true);
assert.equal(Object.keys(catalog.plans).length, 2);
assert.equal(typeof planner.write, 'undefined');
assert.equal(typeof planner.query, 'undefined');

console.log(JSON.stringify({
  ok: true,
  tests: 24,
  version: planner.VERSION,
  plans: { own: own.constraints, team: team.constraints, all: all.constraints, none: denied.constraints },
  guards: {
    tenantAlwaysRequired: 'PASS',
    ownAdvisorConstraint: 'PASS',
    teamConstraint: 'PASS',
    countryConstraint: 'PASS',
    noneDenied: 'PASS',
    openQueriesBlocked: 'PASS',
    firestoreInLimit: 'PASS',
    noExecutionFunctions: 'PASS'
  }
}, null, 2));
