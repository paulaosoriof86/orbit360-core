'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] || process.cwd();
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const backend = source('functions/product-ops-leads-domain.js');
const frontend = source('orbit360-platform/core/ciclo.js');
const original = backend.match(/function workflowAuthorizationDomain\([\s\S]*?\n}\n/);
assert(original, 'workflow authorization owner exists');
const norm = value => String(value || '').toLowerCase();
const roles = new Set(['direccion', 'operativo', 'admin', 'admintenant', 'superadmin']);
const fn = new Function('norm', 'ADMIN_ROLES', original[0] + '\nreturn workflowAuthorizationDomain;')(norm, roles);
const cfg = { stages: { nuevo: { ops: false }, cotizando: { ops: true }, inspeccion: { ops: true } } };
const actor = activeRole => ({ actor: { activeRole } });
const cases = [
  ['direccion', 'create_business', null, { origen: 'Ops', etapa: 'cotizando' }, 'ops'],
  ['operativo', 'archive_business', { origen: 'Ops', etapa: 'cotizando' }, {}, 'ops'],
  ['admin', 'transition_business', { origen: 'Leads', etapa: 'cotizando' }, { etapa: 'inspeccion' }, 'ops'],
  ['admintenant', 'update_business', { origen: 'Ops', etapa: 'cotizando' }, {}, 'ops'],
  ['asesor', 'create_business', null, { origen: 'Ops', etapa: 'cotizando' }, 'leads'],
  ['asesor', 'archive_business', { origen: 'Ops', etapa: 'cotizando' }, {}, 'leads'],
  ['direccion', 'create_business', null, { origen: 'Leads', etapa: 'nuevo' }, 'leads'],
  ['operativo', 'archive_business', { origen: 'Leads', etapa: 'nuevo' }, {}, 'leads']
];
for (const [role, operation, before, payload, expected] of cases)
  assert.equal(fn(actor(role), operation, 'negocios', before, payload, cfg), expected, role + ' ' + operation);
assert(backend.includes("'aseguradoraIds','puntoIngreso'"), 'multi-insurer + entry point persisted');
assert(backend.includes('ENDOSO_ARCHIVE_REQUIRES_AUDITED_OPERATIONS_DELETE'), 'endorsement deletion audited');
assert(backend.includes('ENDOSO_APPLIED_OR_REFERENCED_ARCHIVE_FORBIDDEN'), 'applied endorsements protected');
assert(frontend.includes('attemptedBusinessId'), 'same new business id on retry');
assert(frontend.includes('DELETE_MANAGEMENT_UNCONFIRMED'), 'management deletion diagnostic');
assert(frontend.includes('CREATE_BUSINESS_UNCONFIRMED'), 'business creation diagnostic');
assert(frontend.includes('aria-label="Eliminar gestión operativa"'), 'sticky footer action');
new Function(frontend);
new Function(backend);
const countryGuard = backend.match(/function assertRecordCountryScope\([\s\S]*?\n}\n/);
assert(countryGuard, 'explicit member country guard exists');
class SimulatedHttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const countryScope = new Function('text','unique','HttpsError', countryGuard[0] + '\nreturn assertRecordCountryScope;')(
  (value,max=1000) => String(value == null ? '' : value).trim().slice(0,max),
  value => [...new Set([].concat(value||[]).map(x=>String(x).trim()).filter(Boolean))],
  SimulatedHttpsError
);
assert.doesNotThrow(() => countryScope({countries:['GT']}, null, {pais:'GT'}), 'same-country create');
assert.doesNotThrow(() => countryScope({countries:['GT','CO']}, {pais:'CO'}, {pais:'CO'}), 'explicit bilateral membership');
assert.throws(() => countryScope({countries:['GT']}, null, {pais:'CO'}), error => error.code === 'permission-denied' && error.message === 'OPS_RECORD_COUNTRY_SCOPE_MISMATCH', 'cross-country create deny');
assert.throws(() => countryScope({countries:['GT']}, {pais:'CO'}, {pais:'GT'}), error => error.code === 'permission-denied', 'cross-country historical record deny even if payload switches country');
assert.doesNotThrow(() => countryScope({countries:[]}, null, {pais:'CO'}), 'legacy absent list not changed by this delta');
assert(backend.includes('assertRecordCountryScope(authz.member,before,after);'), 'country enforcement inside canonical transaction');
console.log('I6_6_OPS_P0_ROLE_COUNTRY_AND_SOFT_DELETE_SOURCE_PASS roles=' + cases.length + ' country=' + 6 + ' no_external_writes');
