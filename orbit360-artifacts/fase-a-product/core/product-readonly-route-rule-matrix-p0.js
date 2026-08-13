/* ============================================================
   Orbit 360 · Matriz ejecutable P0 de rutas productivas read-only
   Fecha: 2026-07-14

   Evalúa rutas, operación, tenant, membresía, rol, país y scope.
   No ejecuta consultas, no reemplaza firestore.rules y no escribe.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260714';
  var READ_OPERATIONS = Object.freeze(['get', 'list']);
  var WRITE_OPERATIONS = Object.freeze(['create', 'update', 'delete']);
  var PRIVILEGED_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);

  function text(value) {
    return String(value == null ? '' : value).trim();
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

  function dependencies(options) {
    options = options || {};
    return {
      access: options.accessPolicy || window.Orbit.tenantAccessPolicyEffectiveP0 || window.Orbit.tenantAccessPolicyP0,
      planner: options.queryPlanner || window.Orbit.productQueryPlannerP0,
      paths: options.canonicalPaths || window.Orbit.tenantCanonicalPathsP0
    };
  }

  function decision(allowed, code, details) {
    return Object.assign({
      ok: !!allowed,
      allowed: !!allowed,
      readAuthorized: !!allowed,
      writeAuthorized: false,
      deployAuthorized: false,
      code: code
    }, details || {});
  }

  function parseRoute(path) {
    var clean = text(path).replace(/^\/+|\/+$/g, '');
    var patterns = [
      ['config', /^tenants\/([^/]+)\/system\/config$/],
      ['member', /^tenants\/([^/]+)\/members\/([^/]+)$/],
      ['members', /^tenants\/([^/]+)\/members$/],
      ['dataDocument', /^tenants\/([^/]+)\/data\/([^/]+)\/items\/([^/]+)$/],
      ['dataCollection', /^tenants\/([^/]+)\/data\/([^/]+)\/items$/],
      ['auditEvent', /^tenants\/([^/]+)\/auditEvents\/([^/]+)$/],
      ['auditEvents', /^tenants\/([^/]+)\/auditEvents$/],
      ['importBatch', /^tenants\/([^/]+)\/importBatches\/([^/]+)$/],
      ['importBatches', /^tenants\/([^/]+)\/importBatches$/],
      ['credentialRef', /^tenants\/([^/]+)\/credentialRefs\/([^/]+)$/],
      ['credentialRefs', /^tenants\/([^/]+)\/credentialRefs$/],
      ['academyProgress', /^tenants\/([^/]+)\/academyProgress\/([^/]+)$/],
      ['academyProgressCollection', /^tenants\/([^/]+)\/academyProgress$/],
      ['tenant', /^tenants\/([^/]+)$/]
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var match = patterns[i][1].exec(clean);
      if (!match) continue;
      return {
        ok: true,
        kind: patterns[i][0],
        path: clean,
        tenantId: match[1],
        collection: patterns[i][0].indexOf('data') === 0 ? match[2] : '',
        documentId: patterns[i][0] === 'dataDocument' ? match[3] :
          ['member', 'auditEvent', 'importBatch', 'credentialRef', 'academyProgress'].indexOf(patterns[i][0]) >= 0 ? match[2] : '',
        errors: []
      };
    }
    return { ok: false, kind: 'unknown', path: clean, tenantId: '', collection: '', documentId: '', errors: ['ruta_no_reconocida'] };
  }

  function activeRole(membership, access) {
    var normalized = access && typeof access.normalizeMembership === 'function' ? access.normalizeMembership(membership) : clone(membership || {});
    return text(normalized.activeRole || normalized.rolActivo || normalized.defaultRole || normalized.rolDefault);
  }

  function isPrivileged(membership, access) {
    return PRIVILEGED_ROLES.indexOf(activeRole(membership, access)) >= 0;
  }

  function recordCountry(record) {
    return text(record && (record.country || record.pais)).toUpperCase();
  }

  function recordTenant(record) {
    return text(record && (record.tenantId || record.tenant));
  }

  function recordId(record) {
    return text(record && record.id);
  }

  function validateDataRecord(route, record, membership, access) {
    var errors = [];
    var normalized = access.normalizeMembership(membership);
    if (!record || typeof record !== 'object') errors.push('registro_requerido');
    if (record && recordTenant(record) !== route.tenantId) errors.push('registro_tenant_no_coincide');
    if (record && recordId(record) && recordId(record) !== route.documentId) errors.push('registro_id_no_coincide');
    if (record && normalized.countries && normalized.countries.length && !recordCountry(record)) errors.push('registro_pais_faltante');
    return { ok: errors.length === 0, errors: errors };
  }

  function evaluate(input, options) {
    input = input || {};
    var deps = dependencies(options);
    var operation = text(input.operation || input.op || 'get').toLowerCase();
    var route = parseRoute(input.path);
    var membership = input.membership || {};

    if (!deps.access || !deps.planner || !deps.paths) return decision(false, 'dependencias_faltantes', { route: route });
    if (WRITE_OPERATIONS.indexOf(operation) >= 0) return decision(false, 'readonly_write_blocked', { operation: operation, route: route });
    if (READ_OPERATIONS.indexOf(operation) < 0) return decision(false, 'operacion_no_soportada', { operation: operation, route: route });
    if (!route.ok) return decision(false, 'ruta_no_reconocida', { operation: operation, route: route });
    if (!deps.access.activeMembership(membership)) return decision(false, 'membresia_inactiva_o_rol_no_asignado', { operation: operation, route: route });

    var normalized = deps.access.normalizeMembership(membership);
    if (text(normalized.tenantId) !== route.tenantId) return decision(false, 'tenant_no_coincide', { operation: operation, route: route });

    if (route.kind === 'tenant') return decision(false, 'documento_tenant_directo_bloqueado', { operation: operation, route: route });

    if (route.kind === 'config') {
      if (operation !== 'get') return decision(false, 'config_list_bloqueado', { operation: operation, route: route });
      return decision(true, 'config_sanitizada_permitida', {
        operation: operation, route: route, requiresSanitizedConfig: true,
        fieldsMustExcludeSecrets: true
      });
    }

    if (route.kind === 'member') {
      var self = text(normalized.uid) && text(normalized.uid) === route.documentId;
      var allowedMember = self || isPrivileged(normalized, deps.access);
      return decision(allowedMember, allowedMember ? 'membresia_self_o_privilegiada' : 'membresia_ajena_bloqueada', {
        operation: operation, route: route, self: self
      });
    }

    if (route.kind === 'members') {
      var canListMembers = isPrivileged(normalized, deps.access);
      return decision(canListMembers, canListMembers ? 'lista_membresias_privilegiada' : 'lista_membresias_bloqueada', {
        operation: operation, route: route
      });
    }

    if (route.kind === 'dataCollection') {
      if (operation !== 'list') return decision(false, 'coleccion_requiere_list', { operation: operation, route: route });
      var plan = deps.planner.compile(route.collection, normalized, { accessPolicy: deps.access, context: input.context || {} });
      if (!plan.ok || plan.denied) return decision(false, plan.denied ? 'scope_none_bloqueado' : 'plan_consulta_bloqueado', {
        operation: operation, route: route, queryPlan: clone(plan)
      });
      return decision(true, 'consulta_readonly_permitida', {
        operation: operation,
        route: route,
        collection: route.collection,
        scope: plan.scope,
        requiredConstraints: clone(plan.constraints),
        indexHint: clone(plan.indexHint || []),
        queryPlan: clone(plan)
      });
    }

    if (route.kind === 'dataDocument') {
      if (operation !== 'get') return decision(false, 'documento_requiere_get', { operation: operation, route: route });
      var recordCheck = validateDataRecord(route, input.record, normalized, deps.access);
      if (!recordCheck.ok) return decision(false, 'registro_invalido_para_ruta', {
        operation: operation, route: route, errors: recordCheck.errors
      });
      var readGate = deps.access.canRead(route.collection, input.record, normalized, input.context || {});
      return decision(readGate.allowed === true, readGate.allowed === true ? 'documento_readonly_permitido' : text(readGate.code || 'documento_bloqueado'), {
        operation: operation,
        route: route,
        collection: route.collection,
        accessDecision: clone(readGate)
      });
    }

    if (route.kind === 'auditEvent' || route.kind === 'auditEvents') {
      var canReadAudit = isPrivileged(normalized, deps.access);
      return decision(canReadAudit, canReadAudit ? 'auditoria_privilegiada_readonly' : 'auditoria_restringida', {
        operation: operation, route: route
      });
    }

    if (route.kind === 'importBatch' || route.kind === 'importBatches') {
      var canReadImports = isPrivileged(normalized, deps.access);
      return decision(canReadImports, canReadImports ? 'lotes_importacion_privilegiados_readonly' : 'lotes_importacion_restringidos', {
        operation: operation, route: route
      });
    }

    if (route.kind === 'credentialRef' || route.kind === 'credentialRefs') {
      return decision(false, 'credential_ref_solo_proveedor_backend', {
        operation: operation, route: route, providerRequired: true
      });
    }

    if (route.kind === 'academyProgress') {
      var progressSelf = text(normalized.uid) && text(normalized.uid) === route.documentId;
      var progressAllowed = progressSelf || isPrivileged(normalized, deps.access);
      return decision(progressAllowed, progressAllowed ? 'progreso_self_o_privilegiado' : 'progreso_ajeno_bloqueado', {
        operation: operation, route: route, self: progressSelf
      });
    }

    if (route.kind === 'academyProgressCollection') {
      var progressListAllowed = isPrivileged(normalized, deps.access);
      return decision(progressListAllowed, progressListAllowed ? 'lista_progreso_privilegiada' : 'lista_progreso_bloqueada', {
        operation: operation, route: route
      });
    }

    return decision(false, 'ruta_sin_regla', { operation: operation, route: route });
  }

  function evaluateMany(cases, options) {
    var results = (Array.isArray(cases) ? cases : []).map(function (item) {
      return { id: text(item && item.id), result: evaluate(item, options) };
    });
    return {
      ok: results.every(function (item) { return item.result && typeof item.result.allowed === 'boolean'; }),
      writeAuthorized: false,
      deployAuthorized: false,
      version: VERSION,
      results: results
    };
  }

  window.Orbit.productReadonlyRouteRuleMatrixP0 = Object.freeze({
    VERSION: VERSION,
    READ_OPERATIONS: READ_OPERATIONS,
    WRITE_OPERATIONS: WRITE_OPERATIONS,
    PRIVILEGED_ROLES: PRIVILEGED_ROLES,
    parseRoute: parseRoute,
    validateDataRecord: validateDataRecord,
    evaluate: evaluate,
    evaluateMany: evaluateMany
  });
})();
