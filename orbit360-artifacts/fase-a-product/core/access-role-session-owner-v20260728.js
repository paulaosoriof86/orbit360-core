/* ============================================================
   Orbit 360 · Access owner — sesión/selector de rol efectivo
   Fecha: 2026-07-28 · revisión 2026-07-29

   Owner frontend fail-closed. En canales que requieren backend/membership:
   - solo acepta roles presentes en la proyección autenticada;
   - advisorId proviene únicamente de membership;
   - aliases son solo de lectura/visualización;
   - el rol canónico de vista se conserva separado del estado legacy;
   - en Firestore LAB resuelve la membership autenticada read-only;
   - no escribe memberships ni backend.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = '20260729.3';
  var legacy = window.Orbit.session || {};
  var LEGACY_KEY = 'orbit360_sessionview';
  var VIEW_KEY = 'orbit360_effective_role_view';
  var VISUAL_ROLE = Object.freeze({ SuperAdmin: 'Dirección', AdminTenant: 'Admin' });
  var PRIVILEGED = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);
  var membershipProjectionState = {
    status: 'idle',
    ready: false,
    tenantBound: false,
    assignedRoleCount: 0,
    advisorBound: false,
    error: ''
  };
  var membershipAuthBound = false;
  var membershipBindAttempts = 0;
  var membershipLoadGeneration = 0;

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
      mustChangePassword: source.mustChangePassword === true,
      credentialState: text(source.credentialState).toLowerCase(),
      productReadOnly: true
    };
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
  function readViewRole() {
    try {
      var saved = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
      return canonicalRole(saved && saved.role);
    } catch (error) { return ''; }
  }
  function saveViewRole(role) {
    try { localStorage.setItem(VIEW_KEY, JSON.stringify({ role: canonicalRole(role) })); return true; }
    catch (error) { return false; }
  }
  function clearSecureView() {
    try { localStorage.removeItem(VIEW_KEY); } catch (error) {}
    try { localStorage.removeItem(LEGACY_KEY); } catch (error) {}
  }
  function currentRole() {
    var projection = productProjection();
    if (projection) {
      var selected = readViewRole();
      return projection.roles.indexOf(selected) >= 0 ? selected : projection.activeRole;
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
  function emitSession() {
    try { document.dispatchEvent(new CustomEvent('orbit:session')); } catch (error) {}
  }
  function safeSessionWrite(role, advisorId, projection) {
    if (projection) {
      clearSecureView();
      saveViewRole(role);
      emitSession();
      return true;
    }
    if (legacy && typeof legacy.set === 'function') {
      legacy.set(visualRole(role), advisorId || undefined);
      return true;
    }
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ rol: visualRole(role), asesorId: advisorId || '' }));
      emitSession();
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
    return safeSessionWrite(role, advisorId, projection);
  }
  function syncFromAuth() {
    var projection = productProjection();
    if (!projection) {
      if (requiresMembership()) {
        clearSecureView();
        try { document.dispatchEvent(new CustomEvent('orbit:session:blocked', { detail: { reason: 'membership_projection_missing' } })); } catch (error) {}
        return false;
      }
      return true;
    }
    var selected = readViewRole();
    var target = projection.roles.indexOf(selected) >= 0 ? selected : projection.activeRole;
    return safeSessionWrite(target, projection.advisorId, projection);
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

  function isFirestoreLabRuntime() {
    try {
      var params = new URLSearchParams(window.location && window.location.search || '');
      if (params.get('orbitBackend') === 'firestore-lab') return true;
    } catch (error) {}
    try { return !!(window.OrbitBackend && String(OrbitBackend.mode || '') === 'firestore-lab'); }
    catch (error) { return false; }
  }
  function runtimeTenantId() {
    try {
      var params = new URLSearchParams(window.location && window.location.search || '');
      var fromQuery = text(params.get('tenant'));
      if (fromQuery) return fromQuery;
    } catch (error) {}
    try { return text(window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)); }
    catch (error) { return ''; }
  }
  function updateMembershipProjectionState(patch) {
    membershipProjectionState = Object.assign({}, membershipProjectionState, patch || {});
    try {
      window.dispatchEvent(new CustomEvent('orbit:membership-projection', {
        detail: {
          status: membershipProjectionState.status,
          ready: membershipProjectionState.ready === true,
          tenantBound: membershipProjectionState.tenantBound === true,
          assignedRoleCount: Number(membershipProjectionState.assignedRoleCount || 0),
          advisorBound: membershipProjectionState.advisorBound === true,
          error: text(membershipProjectionState.error)
        }
      }));
    } catch (error) {}
  }
  function membershipProjectionStatus() {
    return {
      status: membershipProjectionState.status,
      ready: membershipProjectionState.ready === true,
      tenantBound: membershipProjectionState.tenantBound === true,
      assignedRoleCount: Number(membershipProjectionState.assignedRoleCount || 0),
      advisorBound: membershipProjectionState.advisorBound === true,
      error: text(membershipProjectionState.error)
    };
  }
  function clearLabProductProjection() {
    try {
      if (window.Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.__labMembershipProjection === true) delete Orbit.auth.productUser;
    } catch (error) {}
    clearSecureView();
    updateMembershipProjectionState({ status: 'waiting-auth', ready: false, tenantBound: false, assignedRoleCount: 0, advisorBound: false, error: '' });
    emitSession();
  }
  function normalizeLabMembership(data, docId, tenantId) {
    data = data && typeof data === 'object' ? data : {};
    var rawRoles = data.roles || data.rolesAsignados || (data.role || data.rol ? [data.role || data.rol] : []);
    var roles = canonicalRoles(rawRoles);
    var defaultRole = canonicalRole(data.defaultRole || data.rolDefault || data.roleDefault || roles[0]);
    var activeRole = canonicalRole(data.activeRole || data.rolActivo || defaultRole || roles[0]);
    var scopes = data.dataScopes || data.scopes || {};
    return {
      uid: text(data.uid || data.userId || data.id || docId),
      tenantId: text(data.tenantId || data.tenant || tenantId),
      roles: roles,
      defaultRole: defaultRole,
      activeRole: activeRole,
      advisorId: text(data.advisorId || data.asesorId),
      teamId: text(data.teamId || data.equipoId),
      countries: unique(data.countries || data.paises || []).map(function (country) { return text(country).toUpperCase(); }),
      dataScopes: clone(scopes),
      modulesExtra: unique(data.modulesExtra || data.modulosExtra || []),
      modulesRestricted: unique(data.modulesRestricted || data.modulosRestringidos || []),
      mustChangePassword: data.mustChangePassword === true,
      credentialState: text(data.credentialState || data.estadoCredencial).toLowerCase(),
      status: text(data.status || data.estado).toLowerCase(),
      productReadOnly: true,
      __labMembershipProjection: true
    };
  }
  function validateLabMembership(projection, user, tenantId) {
    if (!projection || !user) return 'membership_missing';
    if (!tenantId || projection.tenantId !== tenantId) return 'membership_tenant_invalid';
    if (!projection.uid || projection.uid !== text(user.uid)) return 'membership_uid_invalid';
    if (projection.status !== 'active' && projection.status !== 'activo') return 'membership_inactive';
    if (!projection.roles.length) return 'membership_roles_missing';
    if (!projection.defaultRole || projection.roles.indexOf(projection.defaultRole) < 0) return 'membership_default_role_invalid';
    if (!projection.activeRole || projection.roles.indexOf(projection.activeRole) < 0) return 'membership_active_role_invalid';
    return '';
  }
  function firebaseAuthProvider() {
    try { return window.firebase && typeof firebase.auth === 'function' ? firebase.auth() : null; }
    catch (error) { return null; }
  }
  function firebaseFirestoreProvider() {
    try { return window.firebase && typeof firebase.firestore === 'function' ? firebase.firestore() : null; }
    catch (error) { return null; }
  }
  async function loadLabMembershipProjection(user) {
    var generation = ++membershipLoadGeneration;
    var tenantId = runtimeTenantId();
    if (!user || !text(user.uid)) { clearLabProductProjection(); return false; }
    if (!tenantId) {
      updateMembershipProjectionState({ status: 'blocked', ready: false, tenantBound: false, assignedRoleCount: 0, advisorBound: false, error: 'tenant_missing' });
      return false;
    }
    var db = firebaseFirestoreProvider();
    if (!db || typeof db.collection !== 'function') {
      updateMembershipProjectionState({ status: 'waiting-firestore', ready: false, tenantBound: false, assignedRoleCount: 0, advisorBound: false, error: '' });
      return false;
    }
    updateMembershipProjectionState({ status: 'loading', ready: false, tenantBound: false, assignedRoleCount: 0, advisorBound: false, error: '' });
    try {
      var snap = await db.collection('tenants').doc(tenantId).collection('members').doc(text(user.uid)).get();
      if (generation !== membershipLoadGeneration) return false;
      if (!snap || snap.exists !== true) {
        clearLabProductProjection();
        updateMembershipProjectionState({ status: 'blocked', error: 'membership_missing' });
        return false;
      }
      var projection = normalizeLabMembership(snap.data ? snap.data() : {}, snap.id || text(user.uid), tenantId);
      var validationError = validateLabMembership(projection, user, tenantId);
      if (validationError) {
        clearLabProductProjection();
        updateMembershipProjectionState({ status: 'blocked', error: validationError });
        return false;
      }
      window.Orbit.auth = window.Orbit.auth || {};
      window.Orbit.auth.productUser = projection;
      updateMembershipProjectionState({ status: 'ready', ready: true, tenantBound: true, assignedRoleCount: projection.roles.length, advisorBound: !!projection.advisorId, error: '' });
      syncFromAuth();
      return true;
    } catch (error) {
      if (generation !== membershipLoadGeneration) return false;
      clearLabProductProjection();
      updateMembershipProjectionState({ status: 'blocked', error: 'membership_read_failed' });
      return false;
    }
  }
  function bindLabMembershipProjection() {
    if (!isFirestoreLabRuntime() || membershipAuthBound) return membershipAuthBound;
    var auth = firebaseAuthProvider();
    var db = firebaseFirestoreProvider();
    if (!auth || typeof auth.onAuthStateChanged !== 'function' || !db) return false;
    membershipAuthBound = true;
    auth.onAuthStateChanged(function (user) {
      if (!user) { membershipLoadGeneration += 1; clearLabProductProjection(); return; }
      loadLabMembershipProjection(user);
    });
    return true;
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
    membershipProjectionStatus: membershipProjectionStatus,
    bindLabMembershipProjection: bindLabMembershipProjection,
    describe: describe,
    writeAuthorized: false,
    membershipWrites: false
  });

  if (isFirestoreLabRuntime()) {
    (function waitForLabMembershipProviders() {
      if (bindLabMembershipProjection()) return;
      membershipBindAttempts += 1;
      if (membershipBindAttempts < 120) setTimeout(waitForLabMembershipProviders, 100);
      else updateMembershipProjectionState({ status: 'blocked', ready: false, error: 'membership_provider_unavailable' });
    })();
  }
})();
