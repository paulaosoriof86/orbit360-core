/* ============================================================
   Orbit 360 · Política productiva efectiva por tenant P0
   Fecha: 2026-07-23

   Canoniza roles antes de evaluar módulos, scopes y colecciones.
   Es read-only: no reemplaza Rules, Auth ni Orbit.store.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-product-m2-20260723';

  function base() {
    return window.Orbit.tenantAccessPolicyEffectiveP0 || window.Orbit.tenantAccessPolicyP0 || null;
  }

  function taxonomy() {
    return window.Orbit.productRoleTaxonomyP0 || null;
  }

  function canonicalMembership(input) {
    var owner = taxonomy();
    return owner && typeof owner.normalizeMembership === 'function'
      ? owner.normalizeMembership(input)
      : Object.assign({}, input || {});
  }

  function unavailable(code) {
    return { ok: false, allowed: false, writeAuthorized: false, code: code || 'politica_acceso_base_faltante' };
  }

  function normalizeMembership(input) {
    var owner = base();
    var canonical = canonicalMembership(input);
    return owner && typeof owner.normalizeMembership === 'function'
      ? owner.normalizeMembership(canonical)
      : canonical;
  }

  function activeMembership(input) {
    var owner = base();
    return !!(owner && owner.activeMembership && owner.activeMembership(canonicalMembership(input)));
  }

  function moduleVisible(input, moduleKey) {
    var owner = base();
    return !!(owner && owner.moduleVisible && owner.moduleVisible(canonicalMembership(input), moduleKey));
  }

  function effectiveScope(input, moduleKey) {
    var owner = base();
    return owner && owner.effectiveScope ? owner.effectiveScope(canonicalMembership(input), moduleKey) : 'none';
  }

  function sameTenant(input, record) {
    var owner = base();
    return !!(owner && owner.sameTenant && owner.sameTenant(canonicalMembership(input), record));
  }

  function recordWithinScope(input, record, moduleKey) {
    var owner = base();
    return !!(owner && owner.recordWithinScope && owner.recordWithinScope(canonicalMembership(input), record, moduleKey));
  }

  function canRead(collection, record, membership, context) {
    var owner = base();
    return owner && owner.canRead
      ? owner.canRead(collection, record, canonicalMembership(membership), context)
      : unavailable();
  }

  function canWrite(collection, action, record, patch, membership, context) {
    var owner = base();
    var baseDecision = owner && typeof owner.canWrite === 'function'
      ? owner.canWrite(collection, action, record, patch, canonicalMembership(membership), context)
      : unavailable();
    return {
      ok: false,
      allowed: false,
      writeAuthorized: false,
      code: 'readonly_write_blocked',
      productReadOnlyBootstrap: true,
      requestedCollection: String(collection || ''),
      requestedAction: String(action || ''),
      baseDecision: Object.assign({}, baseDecision, { writeAuthorized: false })
    };
  }

  function queryConstraints(collection, membership, context) {
    var owner = base();
    if (!owner || typeof owner.queryConstraints !== 'function') {
      return { ok: false, writeAuthorized: false, collection: String(collection || ''), constraints: [], errors: ['politica_acceso_base_faltante'] };
    }
    return owner.queryConstraints(collection, canonicalMembership(membership), context);
  }

  function delegate(name) {
    return function () {
      var owner = base();
      if (!owner || typeof owner[name] !== 'function') return { ok: false, errors: ['politica_acceso_base_faltante'] };
      var args = Array.prototype.slice.call(arguments);
      if (name === 'validateAdvisorPatch') args[3] = canonicalMembership(args[3]);
      if (name === 'validateAdvisorManagement') args[1] = canonicalMembership(args[1]);
      return owner[name].apply(owner, args);
    };
  }

  window.Orbit.tenantAccessPolicyProductP0 = Object.freeze({
    VERSION: VERSION,
    normalizeMembership: normalizeMembership,
    activeMembership: activeMembership,
    moduleVisible: moduleVisible,
    effectiveScope: effectiveScope,
    sameTenant: sameTenant,
    recordWithinScope: recordWithinScope,
    canRead: canRead,
    canWrite: canWrite,
    queryConstraints: queryConstraints,
    validateAdvisorPatch: delegate('validateAdvisorPatch'),
    validateAdvisorManagement: delegate('validateAdvisorManagement'),
    tenantSource: 'membership_only',
    crossTenantDenied: true,
    writesAuthorized: false,
    writeDecision: 'readonly_write_blocked'
  });
})();
