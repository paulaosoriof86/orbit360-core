'use strict';
// B4-003: exercise the real Configuración module without the superseded
// Orbit.ROLES global. No Firebase access, credentials, browser or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('orbit360-platform/modules/configuracion.js', 'utf8');

function renderUsersTab(canViewTeam) {
  const body = { innerHTML: '' };
  const handlers = [];
  const host = {
    innerHTML: '',
    querySelectorAll(selector) {
      if (selector === '.cfg-navi') return [{ dataset: { t: 'usuarios' }, addEventListener(_event, callback) { handlers.push(callback); } }];
      return [];
    }
  };
  const Orbit = {
    modules: {},
    ui: { esc: value => String(value == null ? '' : value) },
    kit: { banner: () => '' },
    tenant: { get: () => ({ plan: 'Personalizado', paises: ['GT', 'CO'], glosario: {} }) },
    access: { can: (route, action) => canViewTeam && route === 'equipo' && action === 'view' },
    theme: { getSidebar: () => 'oscuro' },
    publicTenantBranding: { current: () => ({}) }
  };
  const context = {
    window: { Orbit }, Orbit,
    document: { getElementById: id => id === 'cfg-body' ? body : null, addEventListener() {} },
    setTimeout() {} // legacy audit-screen observer is outside this isolated render check
  };
  vm.runInNewContext(source, context, { filename: 'configuracion.js' });
  Orbit.modules.configuracion.render(host);
  assert.equal(handlers.length, 1, 'one canonical tab handler was wired');
  handlers[0]();
  return body.innerHTML;
}

const allowed = renderUsersTab(true);
assert.match(allowed, /data-cfg-usuarios-owner="equipo"/);
assert.match(allowed, /href="#\/equipo"/);
assert.match(allowed, /Abrir Equipo y permisos/);
assert.doesNotMatch(allowed, /data-role=|Orbit\.ROLES|Invitar usuario/);

const denied = renderUsersTab(false);
assert.match(denied, /data-cfg-team-denied="1"/);
assert.doesNotMatch(denied, /href="#\/equipo"/);

console.log('PASS B4_003_CONFIG_USERS_CANONICAL_OWNER role_missing_safe and team_access_gated; no_writes');
