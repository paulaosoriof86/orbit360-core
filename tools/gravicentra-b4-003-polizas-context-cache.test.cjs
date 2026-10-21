'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/modules/polizas.js'), 'utf8');
const state = {
  tenant: 'tenant-a', uid: 'user-a', role: 'Dirección', country: 'GT',
  advisor: 'adv-a', scope: 'all', teams: ['adv-a'], countries: ['GT','CO'],
  records: ['gt-1']
};
const listeners = {};
const access = {
  tenantId: () => state.tenant,
  activeRole: () => state.role,
  dataScope: () => state.scope,
  actorAdvisorId: () => state.advisor,
  assignedRoles: () => [state.role],
  actorAdvisor: () => ({ countries: state.countries }),
  teamAdvisorIds: () => state.teams
};
const Orbit = {
  modules: {}, ui: {}, q: {}, kit: {}, access,
  session: { rol: () => state.role },
  auth: { user: () => ({ uid: state.uid }) },
  get pais() { return state.country; },
  store: { all: kind => kind === 'polizas'
    ? state.records.map(id => ({ id, clienteId: 'c-'+id, pais: state.country, estado:'Vigente', primaNeta:1 }))
    : kind === 'clientes' ? state.records.map(id => ({ id: 'c-'+id, pais: state.country }))
    : [] }
};
const context = {
  Orbit, window: { Orbit, addEventListener: (name, fn) => { listeners[name] = fn; } },
  document: { addEventListener: (name, fn) => { listeners[name] = fn; } },
  setTimeout, clearTimeout
};
vm.runInNewContext(source, context, { filename:'polizas.js', timeout:3000 });
const build = Orbit.modules.polizas.buildIndexes;
const ids = () => build().policies.map(p => p.id).join(',');
let checks = 0;
function check(expected, reason) { assert.equal(ids(), expected, reason); checks++; }
check('gt-1','base GT');
const original = build();
assert.strictEqual(build(), original, 'same scope must reuse index'); checks++;
state.country = 'CO'; state.records = ['co-1'];
check('co-1','country switch invalidates without an event');
state.role = 'Asesor'; state.scope = 'own'; state.records = ['co-own'];
check('co-own','role switch cannot reuse broader policy index');
state.advisor = 'adv-b'; state.records = ['co-adv-b'];
check('co-adv-b','advisor change cannot reuse another advisor index');
state.scope = 'team'; state.teams = ['adv-b','adv-c']; state.records = ['co-team-1'];
check('co-team-1','scope change invalidates');
state.teams = ['adv-b']; state.records = ['co-team-2'];
check('co-team-2','team roster change invalidates');
state.countries = ['CO']; state.records = ['co-country-grant'];
check('co-country-grant','country grant change invalidates');
state.uid = 'user-b'; state.records = ['co-other-user'];
check('co-other-user','identity change invalidates');
state.tenant = 'tenant-b'; state.records = ['co-other-tenant'];
check('co-other-tenant','tenant change invalidates');
state.records = ['fresh-on-store'];
listeners['orbit:store:emit']({ detail:{ collection:'polizas' } });
check('fresh-on-store','store event still invalidates the index');
state.records = ['fresh-on-session'];
listeners['orbit:session']();
check('fresh-on-session','session event still invalidates the index');
console.log('PASS polizas context-index regression: '+checks+' assertions (synthetic, no Firebase writes)');
