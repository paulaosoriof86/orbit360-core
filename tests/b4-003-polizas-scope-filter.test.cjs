'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const filename = 'orbit360-platform/modules/polizas.js';
const source = fs.readFileSync(filename, 'utf8');

function fixture() {
  let role = 'Operativo', uid = 'actor-carlos', country = 'CO';
  let currentFilters = null;
  const host = { innerHTML: '', isConnected: true, querySelector: () => null };
  const store = { all: () => [], get: () => null };
  const access = {
    activeRole: () => role,
    dataScope: () => role === 'Asesor' ? 'own' : 'all',
    tenantId: () => 'test-tenant',
    actorAdvisorId: () => 'carlos-advisor',
    assignedRoles: () => [role],
    actorAdvisor: () => ({})
  };
  const kit = {
    bannerFor: () => '', kpis: () => '',
    filterBar: (_defs, state) => { currentFilters = state; return ''; },
    wireFilters: () => {}
  };
  const Orbit = {
    ui: { esc: String, fmtDate: String, money: String },
    q: {}, kit, store, access,
    auth: { user: () => ({ uid }), productUser: {} },
    session: { rol: () => role }, pais: country, modules: {}
  };
  const window = { Orbit, addEventListener: () => {} };
  const document = { addEventListener: () => {}, getElementById: () => host };
  vm.runInNewContext(source, { window, Orbit, document, setTimeout, clearTimeout },
    { filename, timeout: 1000 });
  return {
    render() { Orbit.pais = country; Orbit.modules.polizas.render(host); return currentFilters; },
    setRole(value) { role = value; },
    setCountry(value) { country = value; },
    setUid(value) { uid = value; }
  };
}

test('B4-003: filter remains selected when UID, role and country are unchanged', () => {
  const x = fixture();
  x.render().fase = 'johanna-id';
  x.render().fkind = 'historical';
  assert.equal(x.render().fase, 'johanna-id');
  assert.equal(x.render().fkind, 'historical');
});

test('B4-003: changing to Asesor clears the previous Operativo adviser filter', () => {
  const x = fixture();
  x.render().fase = 'johanna-id';
  x.render().fkind = 'historical';
  x.setRole('Asesor');
  assert.equal(x.render().fase, '');
  assert.equal(x.render().fkind, undefined);
});

test('B4-003: changing authorized country clears obsolete filters', () => {
  const x = fixture();
  x.render().fase = 'johanna-id';
  x.setCountry('GT');
  assert.equal(x.render().fase, '');
});

test('B4-003: changing actual UID clears prior user filters', () => {
  const x = fixture();
  x.render().fase = 'johanna-id';
  x.setUid('actor-samuel');
  assert.equal(x.render().fase, '');
});
