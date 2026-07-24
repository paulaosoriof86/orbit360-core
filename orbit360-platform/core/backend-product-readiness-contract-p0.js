/* ============================================================
   Orbit 360 · Contrato P0 de readiness backend productivo
   Fecha: 2026-07-24

   Preflight puro y fail-closed. No inicializa Firebase, no autentica,
   no reemplaza Orbit.store, no lee secretos y no realiza escrituras.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260724-existing-identity-transition';
  var PRODUCT_MODE = 'product';
  var REQUIRED_STORE_API = Object.freeze([
    'all', 'get', 'where', 'insert', 'update', 'remove', '_emit', 'on',
    'pref', 'setPref', 'init', 'raw'
  ]);
  var DEMO_MARKERS = Object.freeze([
    'admin@demo.com', 'orbit.lab@demo.com', 'firestore-lab', 'localstorage',
    'seed ficticio', 'demo123', 'backend-lab', 'store-firestore-lab'
  ]);
  var SECRET_KEYS = Object.freeze([
    'apiKey', 'password', 'pass', 'pwd', 'secret', 'token', 'accessToken',
    'refreshToken', 'privateKey', 'clientSecret', 'credentialValue'
  ]);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function hasDemoMarker(value) {
    var serialized = lower(typeof value === 'string' ? value : JSON.stringify(value || {}));
    return DEMO_MARKERS.some(function (marker) { return serialized.indexOf(marker) >= 0; });
  }

  function controlledExistingIdentityGuard(input) {
    var config = input && (input.firebaseConfigInfo || input.config) || {};
    return config.controlledExistingIdentity === true &&
      config.existingProjectReconciled === true &&
      lower(config.identitySource) === 'membership_only' &&
      config.readOnly === true &&
      config.writeAuthorized === false;
  }

  function secretPaths(value) {
    var found = [];
    function walk(input, path) {
      if (!input || typeof input !== 'object') return;
      Object.keys(input).forEach(function (key) {
        var current = path ? path + '.' + key : key;
        var normalized = lower(key).replace(/[-_]/g, '');
        var isSecret = SECRET_KEYS.some(function (candidate) {
          return lower(candidate).replace(/[-_]/g, '') === normalized;
        });
        if (isSecret && input[key] !== null && input[key] !== undefined && text(input[key]) !== '') found.push(current);
        if (input[key] && typeof input[key] === 'object') walk(input[key], current);
      });
    }
    walk(value, '');
    return found;
  }

  function canonicalTenant(value) {
    if (window.Orbit.tenantCanonicalPathsP0 && window.Orbit.tenantCanonicalPathsP0.validateTenantId) {
      return window.Orbit.tenantCanonicalPathsP0.validateTenantId(value);
    }
    var tenantId = lower(value);
    var errors = [];
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(tenantId)) errors.push('tenant_invalido');
    return { ok: errors.length === 0, tenantId: tenantId, errors: errors };
  }

  function sanitizeConfigInfo(config) {
    config = config || {};
    return {
      projectIdPresent: !!text(config.projectId),
      authDomainPresent: !!text(config.authDomain),
      appIdPresent: !!text(config.appId),
      apiKeyPresent: !!text(config.apiKey) || config.hasApiKey === true,
      storageBucketPresent: !!text(config.storageBucket),
      environmentRefPresent: !!text(config.environmentRef || config.configRef || config.secretRef),
      controlledExistingIdentity: config.controlledExistingIdentity === true,
      existingProjectReconciled: config.existingProjectReconciled === true,
      identitySourceMembershipOnly: lower(config.identitySource) === 'membership_only',
      readOnly: config.readOnly === true,
      writeAuthorized: config.writeAuthorized === true
    };
  }

  function validateConfig(config) {
    var info = sanitizeConfigInfo(config);
    var errors = [];
    if (!info.projectIdPresent) errors.push('projectId_faltante');
    if (!info.authDomainPresent) errors.push('authDomain_faltante');
    if (!info.appIdPresent) errors.push('appId_faltante');
    if (!info.apiKeyPresent) errors.push('apiKey_ref_faltante');
    if (!info.environmentRefPresent) errors.push('config_entorno_ref_faltante');
    if (secretPaths(config).length) errors.push('secretos_no_permitidos_en_preflight');
    if (hasDemoMarker(config)) errors.push('config_demo_no_permitida');
    if (info.controlledExistingIdentity && (!info.existingProjectReconciled || !info.identitySourceMembershipOnly || !info.readOnly || info.writeAuthorized)) {
      errors.push('transicion_identidad_existente_incompleta');
    }
    return { ok: errors.length === 0, info: info, errors: errors };
  }

  function validateAuth(user, options) {
    user = user || {};
    options = options || {};
    var errors = [];
    var marker = hasDemoMarker(user);
    if (!text(user.uid)) errors.push('auth_uid_faltante');
    if (!/^\S+@\S+\.\S+$/.test(text(user.email))) errors.push('auth_email_invalido');
    if (user.emailVerified !== true) errors.push('auth_email_no_verificado');
    if (user.disabled === true) errors.push('auth_usuario_deshabilitado');
    if (marker && options.controlledExistingIdentity !== true) errors.push('auth_demo_no_permitido');
    return {
      ok: errors.length === 0,
      user: { uid: text(user.uid), email: lower(user.email), emailVerified: user.emailVerified === true },
      controlledExistingIdentityAccepted: marker && options.controlledExistingIdentity === true,
      errors: errors
    };
  }

  function validateMembership(membership, expected) {
    membership = membership || {};
    expected = expected || {};
    var normalized = window.Orbit.membershipMultirolContractP0 && window.Orbit.membershipMultirolContractP0.normalize
      ? window.Orbit.membershipMultirolContractP0.normalize(membership)
      : {
          uid: text(membership.uid || membership.userId),
          tenantId: text(membership.tenantId || membership.tenant),
          roles: Array.isArray(membership.roles) ? membership.roles.slice() : [],
          activeRole: text(membership.activeRole || membership.rolActivo),
          status: lower(membership.status || membership.estado),
          countries: Array.isArray(membership.countries || membership.paises) ? (membership.countries || membership.paises).slice() : [],
          dataScopes: membership.dataScopes || membership.scopes || {}
        };
    var errors = [];
    if (!normalized.uid) errors.push('membresia_uid_faltante');
    if (!normalized.tenantId) errors.push('membresia_tenant_faltante');
    if (normalized.status !== 'active') errors.push('membresia_inactiva');
    if (!Array.isArray(normalized.roles) || !normalized.roles.length) errors.push('membresia_roles_faltantes');
    if (!normalized.activeRole || normalized.roles.indexOf(normalized.activeRole) < 0) errors.push('membresia_rol_activo_invalido');
    if (expected.uid && normalized.uid !== expected.uid) errors.push('membresia_uid_no_coincide');
    if (expected.tenantId && normalized.tenantId !== expected.tenantId) errors.push('membresia_tenant_no_coincide');
    if (hasDemoMarker(normalized)) errors.push('membresia_demo_no_permitida');
    if (secretPaths(membership).length) errors.push('membresia_contiene_secretos');
    return { ok: errors.length === 0, membership: clone(normalized), errors: errors };
  }

  function storeMetadata(store, supplied) {
    var meta = clone(supplied || {});
    try {
      if (store && typeof store._productStatus === 'function') meta = Object.assign(meta, store._productStatus() || {});
      else if (store && typeof store.raw === 'function') {
        var raw = store.raw();
        if (raw && raw.__backend) meta = Object.assign(meta, raw.__backend);
      }
    } catch (e) {}
    return meta;
  }

  function validateStore(store, suppliedMeta, expectedTenantId) {
    var errors = [];
    var missing = REQUIRED_STORE_API.filter(function (method) { return !store || typeof store[method] !== 'function'; });
    if (missing.length) errors.push('store_api_incompleta:' + missing.join(','));
    var meta = storeMetadata(store, suppliedMeta);
    if (lower(meta.mode) !== PRODUCT_MODE) errors.push('store_modo_no_productivo');
    if (meta.noFallback !== true) errors.push('store_fallback_no_bloqueado');
    if (!text(meta.source)) errors.push('store_source_faltante');
    if (expectedTenantId && text(meta.tenantId || meta.tenant) !== expectedTenantId) errors.push('store_tenant_no_coincide');
    if (hasDemoMarker(meta)) errors.push('store_demo_o_lab_no_permitido');
    if (secretPaths(meta).length) errors.push('store_metadata_contiene_secretos');
    return {
      ok: errors.length === 0,
      metadata: {
        mode: text(meta.mode),
        tenantId: text(meta.tenantId || meta.tenant),
        source: text(meta.source),
        noFallback: meta.noFallback === true,
        apiVersion: text(meta.apiVersion)
      },
      missingMethods: missing,
      errors: errors
    };
  }

  function validateMode(mode) {
    var value = lower(mode);
    var errors = [];
    if (value !== PRODUCT_MODE) errors.push('modo_productivo_no_activo');
    if (hasDemoMarker(value)) errors.push('modo_demo_o_lab_no_permitido');
    return { ok: errors.length === 0, mode: value, errors: errors };
  }

  function readiness(input) {
    input = input || {};
    var tenant = canonicalTenant(input.tenantId);
    var mode = validateMode(input.mode);
    var configInput = input.firebaseConfigInfo || input.config || {};
    var config = validateConfig(configInput);
    var controlled = controlledExistingIdentityGuard(input);
    var auth = validateAuth(input.authUser || {}, { controlledExistingIdentity: controlled });
    var membership = validateMembership(input.membership || {}, {
      uid: auth.user.uid,
      tenantId: tenant.tenantId
    });
    var store = validateStore(input.store, input.storeMetadata, tenant.tenantId);
    var errors = [];
    [tenant, mode, config, auth, membership, store].forEach(function (check) {
      if (!check.ok) errors.push.apply(errors, check.errors || []);
    });
    if (!input.pathContractVersion) errors.push('contrato_rutas_no_declarado');
    if (!input.accessPolicyVersion) errors.push('politica_acceso_no_declarada');
    if (hasDemoMarker(input.pathContractVersion) || hasDemoMarker(input.accessPolicyVersion)) errors.push('contrato_demo_no_permitido');

    return {
      ok: errors.length === 0,
      ready: errors.length === 0,
      status: errors.length === 0 ? 'ready' : 'blocked',
      writeAuthorized: false,
      version: VERSION,
      mode: mode.mode,
      tenantId: tenant.tenantId,
      controlledExistingIdentity: controlled,
      controlledExistingIdentityAccepted: auth.controlledExistingIdentityAccepted === true,
      config: config.info,
      auth: auth.user,
      membership: membership.ok ? {
        uid: membership.membership.uid,
        tenantId: membership.membership.tenantId,
        roles: membership.membership.roles,
        activeRole: membership.membership.activeRole,
        status: membership.membership.status,
        countries: membership.membership.countries || []
      } : null,
      store: store.metadata,
      contracts: {
        paths: text(input.pathContractVersion),
        access: text(input.accessPolicyVersion)
      },
      errors: errors,
      blockedCapabilities: errors.length ? ['login_productivo', 'lectura_operativa', 'escritura_operativa', 'deploy_productivo'] : [],
      nextStep: errors.length ? 'resolver_bloqueos_sin_fallback' : 'habilitar_smoke_read_only'
    };
  }

  function bootstrapPlan(input) {
    var result = readiness(input);
    return {
      ok: result.ok,
      readyForBootstrap: result.ready,
      bootstrapExecuted: false,
      writeAuthorized: false,
      tenantId: result.tenantId,
      errors: result.errors.slice(),
      steps: result.ready ? [
        'install_product_store_adapter',
        'attach_auth_observer',
        'resolve_membership',
        'activate_role_and_scope_policy',
        'attach_scoped_snapshots',
        'run_read_only_smoke'
      ] : [],
      hardGuards: {
        noDemoFallback: true,
        noLabFallback: true,
        noLocalStorageFallback: true,
        noSecretsInRuntimeReport: true,
        tenantIsolationRequired: true,
        membershipRequired: true,
        writeDisabledUntilSmoke: true,
        controlledExistingIdentityRequiresExplicitReadOnlyGuard: true
      }
    };
  }

  window.Orbit.backendProductReadinessP0 = Object.freeze({
    VERSION: VERSION,
    PRODUCT_MODE: PRODUCT_MODE,
    REQUIRED_STORE_API: REQUIRED_STORE_API,
    sanitizeConfigInfo: sanitizeConfigInfo,
    controlledExistingIdentityGuard: controlledExistingIdentityGuard,
    validateConfig: validateConfig,
    validateAuth: validateAuth,
    validateMembership: validateMembership,
    validateStore: validateStore,
    validateMode: validateMode,
    readiness: readiness,
    bootstrapPlan: bootstrapPlan
  });
})();
