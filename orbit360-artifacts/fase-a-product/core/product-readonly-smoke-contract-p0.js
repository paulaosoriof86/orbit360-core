/* ============================================================
   Orbit 360 · Contrato P0 de smoke productivo read-only
   Fecha: 2026-07-13

   Consolida evidencias sanitizadas de readiness, membresía, planner
   y store productivo de solo lectura. No inicializa Firebase, no
   adjunta snapshots, no ejecuta escrituras y no autoriza deploy.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var PASS = 'PASS';
  var FAIL = 'FAIL';
  var BLOCKED = 'BLOCKED';
  var DEMO_MARKERS = Object.freeze([
    'admin@demo.com', 'orbit.lab@demo.com', 'demo123', 'firestore-lab',
    'backend-lab', 'localstorage', 'seed ficticio', 'store-firestore-lab'
  ]);
  var SECRET_KEYS = Object.freeze([
    'apikey', 'password', 'pass', 'pwd', 'secret', 'token', 'accesstoken',
    'refreshtoken', 'privatekey', 'clientsecret', 'credentialvalue'
  ]);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }

  function fnv1a(value) {
    var hash = 2166136261;
    var input = String(value || '');
    for (var i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function containsDemoMarker(value) {
    var serialized = lower(typeof value === 'string' ? value : JSON.stringify(value || {}));
    return DEMO_MARKERS.some(function (marker) { return serialized.indexOf(marker) >= 0; });
  }

  function secretPaths(value) {
    var found = [];
    function walk(input, path) {
      if (!input || typeof input !== 'object') return;
      Object.keys(input).forEach(function (key) {
        var current = path ? path + '.' + key : key;
        var normalized = lower(key).replace(/[-_]/g, '');
        if (SECRET_KEYS.indexOf(normalized) >= 0 && input[key] !== null && input[key] !== undefined && text(input[key]) !== '') {
          found.push(current);
        }
        if (input[key] && typeof input[key] === 'object') walk(input[key], current);
      });
    }
    walk(value, '');
    return found;
  }

  function result(status, errors, details) {
    return {
      status: status,
      ok: status === PASS,
      errors: unique(errors || []),
      details: clone(details || {})
    };
  }

  function validateReadiness(readiness) {
    var errors = [];
    readiness = readiness || {};
    if (readiness.ready !== true || readiness.ok !== true) errors.push('readiness_no_aprobado');
    if (lower(readiness.mode) !== 'product') errors.push('modo_no_productivo');
    if (!text(readiness.tenantId)) errors.push('tenant_faltante');
    if (readiness.writeAuthorized !== false) errors.push('readiness_no_bloquea_escritura');
    if (containsDemoMarker(readiness)) errors.push('readiness_contiene_demo_lab');
    if (secretPaths(readiness).length) errors.push('readiness_contiene_secretos');
    return result(errors.length ? FAIL : PASS, errors, {
      tenantId: text(readiness.tenantId),
      mode: text(readiness.mode),
      readinessVersion: text(readiness.version),
      nextStep: text(readiness.nextStep)
    });
  }

  function sanitizeIdentity(readiness) {
    var auth = readiness && readiness.auth || {};
    var membership = readiness && readiness.membership || {};
    return {
      userRef: auth.uid ? 'usr_' + fnv1a(auth.uid) : '',
      emailDomain: text(auth.email).indexOf('@') >= 0 ? text(auth.email).split('@').pop().toLowerCase() : '',
      tenantId: text(membership.tenantId || readiness && readiness.tenantId),
      activeRole: text(membership.activeRole),
      assignedRoleCount: Array.isArray(membership.roles) ? membership.roles.length : 0,
      countryCount: Array.isArray(membership.countries) ? membership.countries.length : 0,
      membershipStatus: text(membership.status)
    };
  }

  function validateIdentity(readiness) {
    var errors = [];
    var identity = sanitizeIdentity(readiness || {});
    if (!identity.userRef) errors.push('identidad_uid_faltante');
    if (!identity.emailDomain) errors.push('identidad_email_invalido');
    if (!identity.tenantId) errors.push('identidad_tenant_faltante');
    if (!identity.activeRole) errors.push('identidad_rol_activo_faltante');
    if (identity.assignedRoleCount < 1) errors.push('identidad_roles_faltantes');
    if (identity.membershipStatus !== 'active') errors.push('identidad_membresia_inactiva');
    return result(errors.length ? FAIL : PASS, errors, identity);
  }

  function validateStoreStatus(status, tenantId) {
    var errors = [];
    status = status || {};
    if (lower(status.mode) !== 'product') errors.push('store_modo_no_productivo');
    if (text(status.tenantId) !== text(tenantId)) errors.push('store_tenant_no_coincide');
    if (status.noFallback !== true) errors.push('store_fallback_no_bloqueado');
    if (status.writeEnabled !== false) errors.push('store_escritura_no_bloqueada');
    if (status.status !== 'ready-read-only') errors.push('store_no_listo_read_only');
    if (status.ready !== true) errors.push('store_ready_false');
    if (containsDemoMarker(status)) errors.push('store_contiene_demo_lab');
    if (secretPaths(status).length) errors.push('store_contiene_secretos');
    return result(errors.length ? FAIL : PASS, errors, {
      mode: text(status.mode),
      tenantId: text(status.tenantId),
      status: text(status.status),
      noFallback: status.noFallback === true,
      writeEnabled: status.writeEnabled === true,
      source: text(status.source),
      version: text(status.version || status.apiVersion),
      lastSnapshotAt: text(status.lastSnapshotAt)
    });
  }

  function planHasTenant(plan, tenantId) {
    return (plan && Array.isArray(plan.constraints) ? plan.constraints : []).some(function (item) {
      return item && item.field === 'tenantId' && item.op === '==' && item.value === tenantId;
    });
  }

  function planDenied(plan) {
    return !!(plan && ((plan.denied === true) || (Array.isArray(plan.constraints) && plan.constraints.some(function (item) {
      return item && item.field === '__deny__';
    }))));
  }

  function validateCollections(input, tenantId) {
    input = input || {};
    var required = unique(input.requiredCollections);
    var attached = unique(input.storeStatus && input.storeStatus.attachedCollections);
    var denied = unique(input.storeStatus && input.storeStatus.deniedCollections);
    var plans = input.storeStatus && input.storeStatus.queryPlans || {};
    var snapshotErrors = input.storeStatus && input.storeStatus.snapshotErrors || {};
    var errors = [];
    var rows = [];

    if (!required.length) errors.push('colecciones_requeridas_faltantes');

    required.forEach(function (collection) {
      var plan = plans[collection] || {};
      var isDenied = denied.indexOf(collection) >= 0 || planDenied(plan);
      var isAttached = attached.indexOf(collection) >= 0;
      var itemErrors = [];
      if (!isDenied && !isAttached) itemErrors.push('snapshot_no_adjunto');
      if (isDenied && isAttached) itemErrors.push('coleccion_denegada_y_adjunta');
      if (!isDenied && !planHasTenant(plan, tenantId)) itemErrors.push('plan_sin_tenant');
      if (snapshotErrors[collection]) itemErrors.push('snapshot_error');
      if (plan.ok === false && !isDenied) itemErrors.push('plan_invalido');
      rows.push({
        collection: collection,
        status: itemErrors.length ? FAIL : (isDenied ? BLOCKED : PASS),
        attached: isAttached,
        denied: isDenied,
        scope: text(plan.scope),
        constraintCount: Array.isArray(plan.constraints) ? plan.constraints.length : 0,
        errors: itemErrors
      });
      itemErrors.forEach(function (error) { errors.push(collection + ':' + error); });
    });

    return result(errors.length ? FAIL : PASS, errors, {
      requiredCount: required.length,
      attachedCount: attached.length,
      deniedCount: denied.length,
      collections: rows
    });
  }

  function validateIsolation(input, tenantId) {
    input = input || {};
    var quarantined = input.storeStatus && input.storeStatus.quarantinedRows || {};
    var crossTenant = [];
    var missingId = [];
    Object.keys(quarantined).forEach(function (collection) {
      (Array.isArray(quarantined[collection]) ? quarantined[collection] : []).forEach(function (item) {
        if (item && item.reason === 'tenant_mismatch') crossTenant.push(collection + ':' + text(item.id || 'sin-id'));
        if (item && item.reason === 'id_missing') missingId.push(collection + ':sin-id');
      });
    });
    var errors = [];
    if (crossTenant.length) errors.push('filas_cross_tenant_en_cuarentena');
    if (input.expectedTenantId && text(input.expectedTenantId) !== text(tenantId)) errors.push('tenant_esperado_no_coincide');
    return result(errors.length ? FAIL : PASS, errors, {
      tenantId: text(tenantId),
      crossTenantQuarantineCount: crossTenant.length,
      missingIdQuarantineCount: missingId.length,
      crossTenantRefs: crossTenant.slice(0, 20),
      missingIdRefs: missingId.slice(0, 20)
    });
  }

  function validateWriteLock(input) {
    input = input || {};
    var status = input.storeStatus || {};
    var marker = input.storeMarker || {};
    var errors = [];
    if (status.writeEnabled !== false) errors.push('writeEnabled_debe_ser_false');
    if (marker.__productReadOnlyP0 !== true) errors.push('marker_read_only_faltante');
    if (text(marker.writeErrorCode) !== 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0') errors.push('codigo_bloqueo_escritura_invalido');
    if (input.writeProbeExecuted === true) errors.push('smoke_no_debe_ejecutar_probe_de_escritura');
    return result(errors.length ? FAIL : PASS, errors, {
      writeEnabled: status.writeEnabled === true,
      readOnlyMarker: marker.__productReadOnlyP0 === true,
      writeErrorCode: text(marker.writeErrorCode),
      writeProbeExecuted: input.writeProbeExecuted === true
    });
  }

  function buildManifest(input) {
    input = input || {};
    var readiness = validateReadiness(input.readiness);
    var tenantId = readiness.details.tenantId || text(input.expectedTenantId);
    var identity = validateIdentity(input.readiness);
    var store = validateStoreStatus(input.storeStatus, tenantId);
    var collections = validateCollections(input, tenantId);
    var isolation = validateIsolation(input, tenantId);
    var writeLock = validateWriteLock(input);
    var sourceCheckErrors = [];
    if (containsDemoMarker(input.source || {})) sourceCheckErrors.push('fuente_demo_lab_no_permitida');
    if (secretPaths(input.source || {}).length) sourceCheckErrors.push('fuente_contiene_secretos');
    var source = result(sourceCheckErrors.length ? FAIL : PASS, sourceCheckErrors, {
      branch: text(input.source && input.source.branch),
      commit: text(input.source && input.source.commit),
      candidateVersion: text(input.source && input.source.candidateVersion),
      generatedAt: text(input.source && input.source.generatedAt)
    });

    var phases = {
      source: source,
      readiness: readiness,
      identity: identity,
      store: store,
      collections: collections,
      isolation: isolation,
      writeLock: writeLock
    };
    var errors = [];
    Object.keys(phases).forEach(function (key) {
      if (!phases[key].ok) phases[key].errors.forEach(function (error) { errors.push(key + ':' + error); });
    });

    var ok = errors.length === 0;
    return {
      schemaVersion: 'orbit360.product-readonly-smoke.v1',
      contractVersion: VERSION,
      smokeType: 'product_read_only',
      status: ok ? 'PASS' : 'BLOCKED',
      ok: ok,
      writeAuthorized: false,
      deployAuthorized: false,
      tenantId: tenantId,
      userRef: identity.details.userRef || '',
      activeRole: identity.details.activeRole || '',
      phases: phases,
      errors: unique(errors),
      hardGuards: {
        productModeOnly: true,
        noDemoFallback: true,
        noLabFallback: true,
        noLocalStorageFallback: true,
        tenantConstraintRequired: true,
        membershipRequired: true,
        scopeRequired: true,
        noWriteProbe: true,
        noWrites: true,
        noDeployAuthorization: true,
        sanitizedReportOnly: true
      },
      nextStep: ok ? 'solicitar_revision_humana_antes_de_habilitar_cualquier_escritura' : 'resolver_bloqueos_y_repetir_smoke_read_only'
    };
  }

  window.Orbit.productReadOnlySmokeP0 = Object.freeze({
    VERSION: VERSION,
    PASS: PASS,
    FAIL: FAIL,
    BLOCKED: BLOCKED,
    validateReadiness: validateReadiness,
    validateIdentity: validateIdentity,
    validateStoreStatus: validateStoreStatus,
    validateCollections: validateCollections,
    validateIsolation: validateIsolation,
    validateWriteLock: validateWriteLock,
    buildManifest: buildManifest
  });
})();
