/* ============================================================
   Orbit 360 · Taxonomía canónica de roles productivos P0
   Fecha: 2026-07-23

   Normaliza aliases de lectura sin escribir membresías ni alterar Auth.
   Los valores persistidos deben usar exclusivamente roles canónicos.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-m2-20260723';
  var CANONICAL_ROLES = Object.freeze([
    'Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo', 'Finanzas',
    'Marketing', 'Asesor', 'Comercial', 'Asistente'
  ]);
  var ROLE_ALIASES = Object.freeze({
    'direccion': 'Dirección',
    'dirección': 'Dirección',
    'director': 'Dirección',
    'superadmin': 'SuperAdmin',
    'super admin': 'SuperAdmin',
    'super_admin': 'SuperAdmin',
    'super-admin': 'SuperAdmin',
    'admin': 'AdminTenant',
    'administrador': 'AdminTenant',
    'admin tenant': 'AdminTenant',
    'admin_tenant': 'AdminTenant',
    'admintenant': 'AdminTenant',
    'operativo': 'Operativo',
    'operaciones': 'Operativo',
    'finanzas': 'Finanzas',
    'financiero': 'Finanzas',
    'marketing': 'Marketing',
    'asesor': 'Asesor',
    'comercial': 'Comercial',
    'asistente': 'Asistente'
  });

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function roleKey(value) {
    return text(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function canonicalRole(value) {
    var clean = text(value);
    if (!clean) return '';
    if (CANONICAL_ROLES.indexOf(clean) >= 0) return clean;
    return ROLE_ALIASES[roleKey(clean)] || '';
  }

  function canonicalRoles(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var role = canonicalRole(value);
      if (role && out.indexOf(role) < 0) out.push(role);
    });
    return out;
  }

  function normalizeMembership(input) {
    input = input && typeof input === 'object' ? input : {};
    var roles = canonicalRoles(input.roles || input.rolesAsignados || (input.role || input.rol ? [input.role || input.rol] : []));
    var defaultRole = canonicalRole(input.defaultRole || input.rolDefault || input.roleDefault || roles[0]);
    var activeRole = canonicalRole(input.activeRole || input.rolActivo || defaultRole);
    return Object.assign({}, input, {
      roles: roles,
      defaultRole: defaultRole,
      activeRole: activeRole,
      roleAliasesNormalized: true,
      roleTaxonomyVersion: VERSION
    });
  }

  function validateCanonicalMembership(input) {
    var normalized = normalizeMembership(input);
    var errors = [];
    if (!normalized.roles.length) errors.push('roles_canonicos_faltantes');
    if (!normalized.defaultRole || normalized.roles.indexOf(normalized.defaultRole) < 0) errors.push('rol_default_canonico_invalido');
    if (!normalized.activeRole || normalized.roles.indexOf(normalized.activeRole) < 0) errors.push('rol_activo_canonico_invalido');
    return { ok: errors.length === 0, membership: normalized, errors: errors };
  }

  window.Orbit.productRoleTaxonomyP0 = Object.freeze({
    VERSION: VERSION,
    CANONICAL_ROLES: CANONICAL_ROLES,
    ROLE_ALIASES: ROLE_ALIASES,
    canonicalRole: canonicalRole,
    canonicalRoles: canonicalRoles,
    normalizeMembership: normalizeMembership,
    validateCanonicalMembership: validateCanonicalMembership,
    persistedRoleAliasesAllowed: false,
    readAliasesAllowed: true,
    writesStore: false
  });
})();
