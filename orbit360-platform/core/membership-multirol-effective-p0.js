/* ============================================================
   Orbit 360 · Membresía multirol efectiva productiva P0
   Fecha: 2026-07-23

   Aplica taxonomía canónica antes de delegar en el contrato base.
   No lee backend, no escribe membresías y no reemplaza Auth.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-effective-m2-20260723';

  function base() {
    return window.Orbit.membershipMultirolP0 || null;
  }

  function taxonomy() {
    return window.Orbit.productRoleTaxonomyP0 || null;
  }

  function canonicalInput(input) {
    var owner = taxonomy();
    return owner && typeof owner.normalizeMembership === 'function'
      ? owner.normalizeMembership(input)
      : Object.assign({}, input || {});
  }

  function unavailable() {
    return { ok: false, writeAuthorized: false, errors: ['contrato_membresia_base_faltante'] };
  }

  function normalize(input) {
    var owner = base();
    return owner && typeof owner.normalize === 'function'
      ? owner.normalize(canonicalInput(input))
      : canonicalInput(input);
  }

  function validate(input, policy) {
    var owner = base();
    if (!owner || typeof owner.validate !== 'function') return unavailable();
    return owner.validate(canonicalInput(input), policy);
  }

  function effectiveModules(input, policy, moduleCatalog) {
    var owner = base();
    return owner && typeof owner.effectiveModules === 'function'
      ? owner.effectiveModules(canonicalInput(input), policy, moduleCatalog)
      : [];
  }

  function effectiveScope(input, moduleKey, policy) {
    var owner = base();
    return owner && typeof owner.effectiveScope === 'function'
      ? owner.effectiveScope(canonicalInput(input), moduleKey, policy)
      : 'none';
  }

  function canSwitchRole(input, targetRole) {
    var owner = base();
    var roleOwner = taxonomy();
    var canonicalTarget = roleOwner && roleOwner.canonicalRole ? roleOwner.canonicalRole(targetRole) : targetRole;
    return !!(owner && owner.canSwitchRole && owner.canSwitchRole(canonicalInput(input), canonicalTarget));
  }

  function proposeRoleSwitch(input, targetRole, actor) {
    var owner = base();
    if (!owner || typeof owner.proposeRoleSwitch !== 'function') return unavailable();
    var roleOwner = taxonomy();
    var canonicalTarget = roleOwner && roleOwner.canonicalRole ? roleOwner.canonicalRole(targetRole) : targetRole;
    return owner.proposeRoleSwitch(canonicalInput(input), canonicalTarget, actor);
  }

  function accessExpansion(beforeInput, afterInput) {
    var owner = base();
    return owner && typeof owner.accessExpansion === 'function'
      ? owner.accessExpansion(canonicalInput(beforeInput), canonicalInput(afterInput))
      : { expanded: false, reasons: ['contrato_membresia_base_faltante'] };
  }

  function planChange(beforeInput, afterInput, actor, policy) {
    var owner = base();
    if (!owner || typeof owner.planChange !== 'function') return unavailable();
    var canonicalActor = Object.assign({}, actor || {});
    var roleOwner = taxonomy();
    if (roleOwner && roleOwner.canonicalRole) {
      canonicalActor.activeRole = roleOwner.canonicalRole(canonicalActor.activeRole);
      canonicalActor.assignedRoles = roleOwner.canonicalRoles(canonicalActor.assignedRoles || []);
    }
    return owner.planChange(canonicalInput(beforeInput), canonicalInput(afterInput), canonicalActor, policy);
  }

  var api = Object.freeze({
    VERSION: VERSION,
    normalize: normalize,
    validate: validate,
    effectiveModules: effectiveModules,
    effectiveScope: effectiveScope,
    canSwitchRole: canSwitchRole,
    proposeRoleSwitch: proposeRoleSwitch,
    accessExpansion: accessExpansion,
    planChange: planChange,
    tenantSource: 'membership_only',
    aliasesPersisted: false,
    writesStore: false
  });

  window.Orbit.membershipMultirolEffectiveP0 = api;
  window.Orbit.membershipMultirolContractP0 = api;
})();
