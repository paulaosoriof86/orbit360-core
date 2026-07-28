/* ============================================================
   Orbit 360 · Access owner — sesión/selector de rol efectivo
   Fecha: 2026-07-28

   Owner frontend fail-closed. En canales que requieren backend/membership:
   - solo acepta roles presentes en la proyección autenticada;
   - advisorId proviene únicamente de membership;
   - aliases canónicos son solo de lectura/visualización;
   - no escribe memberships ni backend.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = '20260728.1';
  var legacy = window.Orbit.session || {};
  var KEY = 'orbit360_sessionview';
  var VISUAL_ROLE = Object.freeze({ SuperAdmin: 'Dirección', AdminTenant: 'Admin' });
  var PRIVILEGED = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);

  function text(value) { return String(value == null ? '' : value).trim(); }
  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }
  function taxonomy() { return window.Orbit.productRoleTaxonomyP0 || null; }
  function canonicalRole(value) {
    var owner = taxonomy();
    if (owner && typeof owner.canonicalRole === 'function') return text(owner.canonicalRole(value));
    var clean = text(value);
    if (clean === 'Admin') return 'AdminTenant';
    return clean;
  }
  function visualRole(value) {
    var role = canonicalRole(value);
    return VISUAL_ROLE[role] || role;
  }
  function roleLabel(value) {
    var role = canonicalRole(value);
    if (role === 'SuperAdmin') return 'Dirección';
    if (role === 'AdminTenant') return 'Administración';
    return role;
  }
  function productProjection() {
    var source = null;
    try {
      if (window.Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.productReadOnly === true) source = Orbit.auth.productUser;
      else if (window.Orbit.auth && typeof Orbit.auth.user === 'function') {
        var candidate = Orbit.auth.user();
        if (candidate && candidate.productReadOnly === true) source = candidate;
      }
    } catch (error) { source = null; }
    if (!source || !Array.isArray(source.roles)) return null;
    var roles = canonicalRoles(source.roles);
    var activeRole = canonicalRole(source.activeRole || source.defaultRole || roles[0]);
    if (!roles.length || roles.indexOf(activeRole) < 0) return null;
    return {
      uid: text(source.uid),
      tenantId: text(source.tenantId),
      roles: roles,
      defaultRole: canonicalRole(source.defaultRole || roles[0]),
      activeRole: activeRole,
      advisorId: text(source.advisorId),
      teamId: text(source.teamId),
      countries: unique(source.countries || []).map(function (x) { return text(x).toUpperCase(); }),
      dataScopes: clone(source.dataScopes || {}),
      modulesExtra: unique(source.modulesExtra || []),
      modulesRestricted: unique(source.modulesRestricted || []),
      productReadOnly: true
    };
  }
  function canonicalRoles(values) {
    var owner = taxonomy();
    if (owner && typeof owner.canonicalRoles === 'function') return owner.canonicalRoles(values || []);
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var role = canonicalRole(value);
      if (role && out.indexOf(role) < 0) out.push(role);
    });
    return out;
  }
  function queryRequiresMembership() {
    try {
      var params = new URLSearchParams(window.location && window.location.search || '');
      if (params.get('orbitBackend') === 'firestore-lab') return true;
    } catch (error) {}
    try {
      if (window.OrbitBackend && String(OrbitBackend.mode || '').toLowerCase().indexOf('firestore') >= 0) return true;
    } catch (error) {}
    try {
      if (window.OrbitProductReadonlyEntry && OrbitProductReadonlyEntry.mode === 'product') return true;
      if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.orbitProductMode) return true;
    } catch (error) {}
    return false;
  }
  function requiresMembership() { return !!productProjection() || queryRequiresMembership(); }
  function membershipBound() { return !!productProjection(); }
  function demoRoles() { return unique(Object.keys(window.Orbit.ROLES || {})); }
  function allowedRoles() {
    var projection = productProjection();
    if (projection) return projection.roles.slice();
    return requiresMembership() ? [] : demoRoles().map(canonicalRole).filter(Boolean);
  }
  function readLegacyRole() {
    try { return legacy && typeof legacy.rol === 'function' ? canonicalRole(legacy.rol()) : ''; }
    catch (error) { return ''; }
  }
  function currentRole() {
    var projection = productProjection();
    if (projection) {
      var legacyRole = readLegacyRole();
      return projection.roles.indexOf(legacyRole) >= 0 ? legacyRole : projection.activeRole;
    }
    if (requiresMembership()) return '';
    var role = readLegacyRole();
    return allowedRoles().indexOf(role) >= 0 ? role : '';
  }
  function currentAdvisorId() {
    var projection = productProjection();
    if (projection) return projection.advisorId;
    if (requiresMembership()) return '';
    try { return legacy && typeof legacy.asesorId === 'function' ? text(legacy.asesorId()) : ''; }
    catch (error) { return ''; }
  }
  function safeSessionWrite(role, advisorId) {
    if (legacy && typeof legacy.set === 'function') {
      legacy.set(visualRole(role), advisorId || undefined);
      return true;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ rol: visualRole(role), asesorId: advisorId || '' }));
      document.dispatchEvent(new CustomEvent('orbit:session'));
      return true;
    } catch (error) { return false; }
  }
  function setRole(targetRole, ignoredAdvisorId) {
    var role = canonicalRole(targetRole);
    var allowed = allowedRoles();
    if (!role || allowed.indexOf(role) < 0) {
      try { document.dispatchEvent(new CustomEvent('orbit:session:blocked', { detail: { reason: 'role_not_assigned' } })); } catch (error) {}
      return false;
    }
    var projection = productProjection();
    var advisorId = projection ? projection.advisorId : text(ignoredAdvisorId);
    return safeSessionWrite(role, advisorId);
  }
  function syncFromAuth() {
    var projection = productProjection();
    if (!projection) {
      if (requiresMembership()) {
        try { localStorage.removeItem(KEY); } catch (error) {}
        try { document.dispatchEvent(new CustomEvent('orbit:session:blocked', { detail: { reason: 'membership_projection_missing' } })); } catch (error) {}
        return false;
      }
      return true;
    }
    return safeSessionWrite(projection.activeRole, projection.advisorId);
  }
  function roleDefinition(role) {
    var visual = visualRole(role);
    return window.Orbit.ROLES && Orbit.ROLES[visual] ? Orbit.ROLES[visual] : null;
  }
  function canSee(route) {
    var role = currentRole();
    var allowed = allowedRoles();
    if (!role || allowed.indexOf(role) < 0) return false;
    var projection = productProjection();
    if (projection && projection.modulesRestricted.indexOf(route) >= 0) return false;
    var def = roleDefinition(role);
    if (!def) return false;
    var base = [].concat(def.modulos || def.modules || []);
    if (base.indexOf(route) >= 0) return true;
    return !!(projection && projection.modulesExtra.indexOf(route) >= 0);
  }
  function esAsesor() { return currentRole() === 'Asesor'; }
  function verEmpresa() { return PRIVILEGED.indexOf(currentRole()) >= 0 || currentRole() === 'Finanzas'; }
  function describe() {
    var projection = productProjection();
    return {
      version: VERSION,
      requiresMembership: requiresMembership(),
      membershipBound: !!projection,
      activeRole: currentRole(),
      assignedRoleCount: allowedRoles().length,
      advisorBound: !!currentAdvisorId(),
      writeAuthorized: false
    };
  }

  window.Orbit.session = Object.freeze({
    VERSION: VERSION,
    rol: currentRole,
    asesorId: currentAdvisorId,
    esAsesor: esAsesor,
    verEmpresa: verEmpresa,
    canSee: canSee,
    set: setRole,
    syncFromAuth: syncFromAuth,
    allowedRoles: allowedRoles,
    rolesAsignados: allowedRoles,
    roleAllowed: function (role) { return allowedRoles().indexOf(canonicalRole(role)) >= 0; },
    visualRole: visualRole,
    roleLabel: roleLabel,
    requiresMembership: requiresMembership,
    membershipBound: membershipBound,
    describe: describe,
    writeAuthorized: false,
    membershipWrites: false
  });
})();
