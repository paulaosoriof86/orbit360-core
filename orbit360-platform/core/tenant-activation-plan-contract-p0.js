/* ============================================================
   Orbit 360 · Contrato P0 de preparación de activación de tenant
   Fecha: 2026-07-24

   Capa pura y fail-closed para preparar M3 sin ejecutar activación.
   No lee backend, no usa secretos, no persiste, no despliega y no
   autoriza migraciones. Configuración y memberships se difieren a M4.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = '3.0.0-static-20260724';
  var STATUS_READY = 'M3_TENANT_ACTIVATION_STATIC_READY';
  var STRONG_CONFIRMATION_PHRASE = 'CONFIRMO ACTIVAR TENANT';
  var BLOCKED_SOURCES = Object.freeze(['query_string', 'url_param', 'localstorage', 'demo', 'seed', 'hardcode']);
  var ALLOWED_SOURCES = Object.freeze(['backend_tenant_config', 'activation_manifest', 'membership_projection']);
  var ALLOWED_INTEGRATION_STATES = Object.freeze([
    'disabled', 'reference_only', 'configured_not_connected', 'backend_required', 'connected_real'
  ]);
  var DEFERRED_TO_M4 = Object.freeze([
    'persist_tenant_config', 'persist_memberships', 'migrate_clients', 'migrate_insurers'
  ]);
  var SENSITIVE_KEYS = Object.freeze([
    'password', 'pass', 'pwd', 'contrasena', 'clave', 'secret', 'token', 'apikey',
    'api_key', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
    'privatekey', 'private_key', 'clientsecret', 'client_secret', 'credentialvalue',
    'credential_value'
  ]);

  function text(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return text(value).toLowerCase(); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }
  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }
  function secretPaths(input) {
    var found = [];
    function walk(value, path) {
      if (!value || typeof value !== 'object') return;
      Object.keys(value).forEach(function (key) {
        var current = path ? path + '.' + key : key;
        var normalized = lower(key).replace(/[-_]/g, '');
        if (SENSITIVE_KEYS.map(function (item) { return item.replace(/[-_]/g, ''); }).indexOf(normalized) >= 0) {
          if (value[key] !== null && value[key] !== undefined && text(value[key]) !== '') found.push(current);
        }
        if (value[key] && typeof value[key] === 'object') walk(value[key], current);
      });
    }
    walk(input, '');
    return found;
  }
  function canonicalTenant(value) {
    var owner = window.Orbit.tenantCanonicalPathsP0;
    if (owner && typeof owner.validateTenantId === 'function') return owner.validateTenantId(value);
    var tenantId = lower(value).replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    return { ok: !!tenantId && tenantId === text(value), tenantId: tenantId, errors: tenantId === text(value) ? [] : ['tenant_no_canonico'] };
  }
  function expectedCurrency(country) {
    var owner = window.Orbit.tenantCanonicalPathsP0;
    var map = owner && owner.COUNTRY_CURRENCY || {};
    return text(map[country]).toUpperCase();
  }
  function normalize(input) {
    input = input || {};
    var integrations = Array.isArray(input.integrations) ? input.integrations.map(function (item) {
      return {
        key: text(item && item.key),
        state: lower(item && item.state),
        active: item && item.active === true,
        connectionVerified: item && item.connectionVerified === true,
        reference: text(item && item.reference)
      };
    }) : [];
    return {
      tenantId: text(input.tenantId),
      m2Closed: input.m2Closed === true,
      m2RuntimeStatus: text(input.m2RuntimeStatus),
      identitySource: lower(input.identitySource),
      tenantResolutionSource: lower(input.tenantResolutionSource),
      sourceOfTruth: lower(input.sourceOfTruth),
      readOnlyBootstrapValidated: input.readOnlyBootstrapValidated === true,
      storeNoFallback: input.storeNoFallback === true,
      storeWriteEnabled: input.storeWriteEnabled === true,
      countries: unique(input.countries).map(function (item) { return item.toUpperCase(); }),
      countryConfig: clone(input.countryConfig || {}),
      branding: clone(input.branding || {}),
      modules: unique(input.modules),
      memberships: clone(input.memberships || {}),
      integrations: integrations,
      accessExpansion: input.accessExpansion === true,
      actor: clone(input.actor || {}),
      persistence: {
        tenantWrites: Number(input.persistence && input.persistence.tenantWrites || 0),
        configurationWrites: Number(input.persistence && input.persistence.configurationWrites || 0),
        membershipWrites: Number(input.persistence && input.persistence.membershipWrites || 0),
        clientWrites: Number(input.persistence && input.persistence.clientWrites || 0),
        insurerWrites: Number(input.persistence && input.persistence.insurerWrites || 0),
        auditWrites: Number(input.persistence && input.persistence.auditWrites || 0)
      },
      activationAuthorized: input.activationAuthorized === true,
      activationExecuted: input.activationExecuted === true,
      deployRequested: input.deployRequested === true,
      importsRequested: input.importsRequested === true,
      rulesChangeRequested: input.rulesChangeRequested === true,
      raw: clone(input)
    };
  }
  function validateIntegration(item, index) {
    var errors = [];
    if (!item.key) errors.push('integracion_' + index + ':clave_faltante');
    if (ALLOWED_INTEGRATION_STATES.indexOf(item.state) < 0) errors.push('integracion_' + index + ':estado_invalido');
    if (item.active && item.state !== 'connected_real') errors.push('integracion_' + index + ':activa_sin_conexion_real');
    if (item.state === 'connected_real' && item.connectionVerified !== true) errors.push('integracion_' + index + ':conexion_no_verificada');
    if (item.state !== 'connected_real' && item.connectionVerified === true) errors.push('integracion_' + index + ':verificacion_inconsistente');
    return errors;
  }
  function validate(input) {
    var value = normalize(input);
    var tenant = canonicalTenant(value.tenantId);
    var errors = [];
    var warnings = [];
    if (!tenant.ok) errors.push.apply(errors, tenant.errors || ['tenant_invalido']);
    if (!value.m2Closed || value.m2RuntimeStatus !== 'M2_EXISTING_IDENTITY_RUNTIME_VALIDATED') errors.push('m2_runtime_no_cerrado');
    if (value.identitySource !== 'membership_only') errors.push('identity_source_no_membership_only');
    if (value.tenantResolutionSource !== 'membership') errors.push('tenant_no_resuelto_desde_membership');
    if (BLOCKED_SOURCES.indexOf(value.sourceOfTruth) >= 0 || ALLOWED_SOURCES.indexOf(value.sourceOfTruth) < 0) errors.push('fuente_productiva_invalida');
    if (!value.readOnlyBootstrapValidated) errors.push('bootstrap_readonly_no_validado');
    if (!value.storeNoFallback) errors.push('store_fallback_no_bloqueado');
    if (value.storeWriteEnabled) errors.push('store_escritura_habilitada');
    if (!value.countries.length) errors.push('paises_faltantes');
    value.countries.forEach(function (country) {
      var config = value.countryConfig && value.countryConfig[country];
      var currency = text(config && (config.currency || config.moneda)).toUpperCase();
      var expected = expectedCurrency(country);
      if (!config || !currency) errors.push('config_pais_incompleta:' + country);
      if (expected && currency && expected !== currency) errors.push('pais_moneda_inconsistente:' + country);
    });
    if (!value.branding || typeof value.branding !== 'object' || !text(value.branding.name || value.branding.empresa)) errors.push('branding_incompleto');
    if (!value.modules.length) errors.push('modulos_faltantes');
    if (Number(value.memberships.existing || 0) < 1) errors.push('membership_existente_faltante');
    if (Number(value.memberships.eligible || 0) !== 1) errors.push('membership_elegible_no_unica');
    value.integrations.forEach(function (item, index) { errors.push.apply(errors, validateIntegration(item, index)); });
    if (!value.actor || !text(value.actor.userId)) errors.push('actor_faltante');
    if (!text(value.actor.reason) || text(value.actor.reason).length < 8) errors.push('motivo_insuficiente');
    if (value.accessExpansion && text(value.actor.confirmationPhrase) !== STRONG_CONFIRMATION_PHRASE) errors.push('confirmacion_reforzada_requerida');
    var writes = value.persistence;
    Object.keys(writes).forEach(function (key) { if (writes[key] !== 0) errors.push('m3_static_escritura_no_permitida:' + key); });
    if (value.activationAuthorized) errors.push('activacion_no_autorizada_en_preparacion_estatica');
    if (value.activationExecuted) errors.push('activacion_ejecutada_en_preparacion_estatica');
    if (value.deployRequested) errors.push('deploy_no_permitido_en_m3_static');
    if (value.importsRequested) errors.push('importaciones_diferidas_a_m4');
    if (value.rulesChangeRequested) errors.push('rules_no_permitidas_en_m3_static');
    var secrets = secretPaths(value.raw);
    if (secrets.length) errors.push('secretos_no_permitidos:' + secrets.join(','));
    if (!value.integrations.length) warnings.push('integraciones_no_declaradas');
    return { ok: errors.length === 0, tenantId: tenant.tenantId, value: value, errors: unique(errors), warnings: unique(warnings) };
  }
  function activationDiff(beforeInput, afterInput) {
    var before = clone(beforeInput || {}), after = clone(afterInput || {}), keys = unique(Object.keys(before).concat(Object.keys(after)));
    return keys.filter(function (key) { return JSON.stringify(before[key]) !== JSON.stringify(after[key]); }).map(function (key) {
      return { field: key, before: clone(before[key]), after: clone(after[key]) };
    });
  }
  function buildDryRun(input) {
    var check = validate(input);
    var value = check.value;
    return {
      ok: check.ok,
      status: check.ok ? STATUS_READY : 'M3_TENANT_ACTIVATION_STATIC_BLOCKED',
      contractVersion: VERSION,
      tenantId: check.tenantId,
      writeAuthorized: false,
      writeExecuted: false,
      activationAuthorized: false,
      activationExecuted: false,
      sourceOfTruth: value.sourceOfTruth,
      identitySource: value.identitySource,
      tenantResolutionSource: value.tenantResolutionSource,
      plannedActivationSteps: check.ok ? [
        'resolve_tenant_from_existing_membership',
        'bind_existing_product_readonly_runtime',
        'project_role_modules_scopes_countries_branding',
        'verify_integration_states_honestly',
        'prepare_activation_audit_and_rollback',
        'request_explicit_m3_activation_authorization'
      ] : [],
      deferredToM4: DEFERRED_TO_M4.slice(),
      auditPlan: {
        required: true,
        collection: 'auditEvents',
        status: 'planned_not_executed',
        fields: ['tenantId', 'actor', 'reason', 'before', 'after', 'changedAt']
      },
      rollbackPlan: {
        required: true,
        status: 'planned_not_executed',
        requiresBeforeSnapshot: true,
        scope: 'tenant_activation_state_only'
      },
      errors: check.errors,
      warnings: check.warnings,
      containsPII: false,
      containsSecrets: false
    };
  }

  window.Orbit.tenantActivationPlanP0 = Object.freeze({
    VERSION: VERSION,
    STATUS_READY: STATUS_READY,
    STRONG_CONFIRMATION_PHRASE: STRONG_CONFIRMATION_PHRASE,
    BLOCKED_SOURCES: BLOCKED_SOURCES,
    ALLOWED_SOURCES: ALLOWED_SOURCES,
    ALLOWED_INTEGRATION_STATES: ALLOWED_INTEGRATION_STATES,
    DEFERRED_TO_M4: DEFERRED_TO_M4,
    secretPaths: secretPaths,
    normalize: normalize,
    validate: validate,
    activationDiff: activationDiff,
    buildDryRun: buildDryRun
  });
})();
