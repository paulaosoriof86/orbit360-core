/* ============================================================
   Orbit 360 · Política efectiva P0 de acceso productivo
   Fecha: 2026-07-14

   Compone la política base con correcciones canónicas posteriores.
   No consulta datos, no escribe y no reemplaza reglas/Auth/store.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-effective-20260714';

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function basePolicy() {
    return window.Orbit.tenantAccessPolicyP0 || null;
  }

  function bankPolicy() {
    return window.Orbit.aseguradorasBankAccountVisibilityPolicyP0 || null;
  }

  function policyOverrides(extra) {
    var bank = bankPolicy();
    return Object.assign(
      {},
      bank && bank.COLLECTION_POLICY_OVERRIDE || {},
      extra && typeof extra === 'object' ? extra : {}
    );
  }

  function collectionPolicy(extra) {
    var base = basePolicy();
    return Object.assign({}, base && base.COLLECTION_POLICY || {}, policyOverrides(extra));
  }

  function contextWithOverrides(context) {
    var source = context && typeof context === 'object' ? context : {};
    return Object.assign({}, source, {
      collectionPolicy: policyOverrides(source.collectionPolicy)
    });
  }

  function unavailable(code) {
    return {
      ok: false,
      allowed: false,
      writeAuthorized: false,
      code: code || 'politica_base_faltante'
    };
  }

  function normalizeMembership(input) {
    var base = basePolicy();
    return base && typeof base.normalizeMembership === 'function'
      ? base.normalizeMembership(input)
      : clone(input || {});
  }

  function activeMembership(input) {
    var base = basePolicy();
    return !!(base && typeof base.activeMembership === 'function' && base.activeMembership(input));
  }

  function moduleVisible(input, moduleKey) {
    var base = basePolicy();
    return !!(base && typeof base.moduleVisible === 'function' && base.moduleVisible(input, moduleKey));
  }

  function effectiveScope(input, moduleKey) {
    var base = basePolicy();
    return base && typeof base.effectiveScope === 'function' ? base.effectiveScope(input, moduleKey) : 'none';
  }

  function sameTenant(input, record) {
    var base = basePolicy();
    return !!(base && typeof base.sameTenant === 'function' && base.sameTenant(input, record));
  }

  function recordWithinScope(input, record, moduleKey) {
    var base = basePolicy();
    return !!(base && typeof base.recordWithinScope === 'function' && base.recordWithinScope(input, record, moduleKey));
  }

  function canRead(collection, record, membership, context) {
    var base = basePolicy();
    if (!base || typeof base.canRead !== 'function') return unavailable();
    return base.canRead(collection, record, membership, contextWithOverrides(context));
  }

  function canWrite(collection, action, record, patch, membership, context) {
    var base = basePolicy();
    if (!base || typeof base.canWrite !== 'function') return unavailable();

    var bank = bankPolicy();
    if (bank && collection === bank.BANK_COLLECTION) {
      var readGate = canRead(collection, record, membership, context);
      var editGate = bank.canEditBankAccounts(membership, {
        moduleVisible: function (member, moduleKey) {
          return moduleVisible(member, moduleKey);
        }
      });
      var allowed = readGate.allowed === true && editGate.allowed === true;
      return {
        ok: allowed,
        allowed: allowed,
        writeAuthorized: false,
        code: allowed ? 'edicion_bancos_separada_permitida' : 'edicion_bancos_separada_bloqueada',
        requiresAudit: allowed,
        action: text(action),
        readGate: clone(readGate),
        editGate: clone(editGate)
      };
    }

    return base.canWrite(collection, action, record, patch, membership, contextWithOverrides(context));
  }

  function queryConstraints(collection, membership, context) {
    var base = basePolicy();
    if (!base || typeof base.queryConstraints !== 'function') {
      return { ok: false, writeAuthorized: false, collection: text(collection), constraints: [], errors: ['politica_base_faltante'] };
    }
    return base.queryConstraints(collection, membership, contextWithOverrides(context));
  }

  function delegate(name) {
    return function () {
      var base = basePolicy();
      if (!base || typeof base[name] !== 'function') return { ok: false, errors: ['politica_base_faltante'] };
      return base[name].apply(base, arguments);
    };
  }

  window.Orbit.tenantAccessPolicyEffectiveP0 = Object.freeze({
    VERSION: VERSION,
    COLLECTION_POLICY: collectionPolicy(),
    policyOverrides: policyOverrides,
    collectionPolicy: collectionPolicy,
    contextWithOverrides: contextWithOverrides,
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
    validateAdvisorManagement: delegate('validateAdvisorManagement')
  });
})();
