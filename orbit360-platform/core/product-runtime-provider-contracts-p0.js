/* ============================================================
   Orbit 360 · Contratos de proveedores runtime productivos P0
   Fecha: 2026-07-23

   Contrato puro para preparar M2 read-only. No contiene valores,
   no inicializa Firebase, no autentica, no consulta y no escribe.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-m2-runtime-preparation-20260723';
  var REQUIRED_PUBLIC_CONFIG_FIELDS = Object.freeze([
    'projectIdPresent', 'authDomainPresent', 'appIdPresent',
    'apiKeyPresent', 'storageBucketPresent', 'environmentRefPresent'
  ]);
  var REQUIRED_PROVIDER_METHODS = Object.freeze({
    environmentProvider: ['describePublicConfig'],
    firebaseAdapter: ['initializeFromEnvironment', 'storeDependencies'],
    authProvider: ['waitForAuthenticatedUser'],
    membershipProvider: ['getByUid']
  });

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function unique(values) {
    return Array.from(new Set([].concat(values || []).filter(Boolean)));
  }

  function validatePublicConfigDescriptor(input) {
    input = input || {};
    var errors = [];
    REQUIRED_PUBLIC_CONFIG_FIELDS.forEach(function (field) {
      if (input[field] !== true) errors.push('config_descriptor_missing:' + field);
    });
    if (input.containsValues === true) errors.push('config_values_not_allowed_in_descriptor');
    if (input.containsSecrets === true) errors.push('secrets_not_allowed_in_descriptor');
    return { ok: errors.length === 0, errors: errors, sanitized: true };
  }

  function validateProviderShape(name, provider) {
    var expected = REQUIRED_PROVIDER_METHODS[name] || [];
    var missing = expected.filter(function (method) {
      return !provider || typeof provider[method] !== 'function';
    });
    return {
      ok: expected.length > 0 && missing.length === 0,
      provider: text(name),
      requiredMethods: expected.slice(),
      missingMethods: missing,
      runtimeExecuted: false
    };
  }

  function validateProviderBundle(bundle) {
    bundle = bundle || {};
    var results = {};
    var errors = [];
    Object.keys(REQUIRED_PROVIDER_METHODS).forEach(function (name) {
      results[name] = validateProviderShape(name, bundle[name]);
      if (!results[name].ok) errors.push(name + ':' + results[name].missingMethods.join(','));
    });
    return {
      ok: errors.length === 0,
      version: VERSION,
      results: results,
      errors: unique(errors),
      secretAccess: false,
      firebaseAccess: false,
      firestoreRead: false,
      writes: false,
      runtimeExecuted: false
    };
  }

  function authorizationReadiness(input) {
    input = input || {};
    var config = validatePublicConfigDescriptor(input.publicConfigDescriptor || {});
    var providers = validateProviderBundle(input.providers || {});
    var errors = [].concat(config.errors || [], providers.errors || []);
    if (input.explicitAuthorization !== true) errors.push('explicit_runtime_authorization_required');
    if (input.readOnly !== true) errors.push('read_only_required');
    if (input.writeAuthorized !== false) errors.push('writes_must_remain_blocked');
    if (input.rulesPlanApproved !== true) errors.push('read_only_rules_plan_approval_required');
    if (input.membershipBootstrapPlanApproved !== true) errors.push('initial_membership_plan_approval_required');
    if (input.rollbackPlanApproved !== true) errors.push('rollback_plan_approval_required');
    return {
      ok: errors.length === 0,
      readyForAuthorizedRuntime: errors.length === 0,
      version: VERSION,
      errors: unique(errors),
      writeAuthorized: false,
      tenantSource: 'membership_only',
      queryStringTenantAllowed: false,
      productRuntimeExecuted: false
    };
  }

  window.Orbit.productRuntimeProviderContractsP0 = Object.freeze({
    VERSION: VERSION,
    REQUIRED_PUBLIC_CONFIG_FIELDS: REQUIRED_PUBLIC_CONFIG_FIELDS,
    REQUIRED_PROVIDER_METHODS: REQUIRED_PROVIDER_METHODS,
    validatePublicConfigDescriptor: validatePublicConfigDescriptor,
    validateProviderShape: validateProviderShape,
    validateProviderBundle: validateProviderBundle,
    authorizationReadiness: authorizationReadiness,
    containsValues: false,
    containsSecrets: false,
    autoStart: false,
    writeAuthorized: false
  });
})();
