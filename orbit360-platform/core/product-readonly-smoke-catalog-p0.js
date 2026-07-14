/* ============================================================
   Orbit 360 · Catálogo P0 de colecciones e índices para smoke read-only
   Fecha: 2026-07-13

   Define el primer smoke A&S para Dirección, Operativo y Asesor.
   Capa pura: no consulta Firestore, no crea índices y no escribe.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var PHYSICAL_COLLECTION_GROUP = 'items';
  var SUPPORTED_ROLES = Object.freeze(['Dirección', 'Operativo', 'Asesor']);
  var SCOPE_FIELDS = Object.freeze({ own: 'advisorId', team: 'teamId' });

  var FIRST_SMOKE_PROFILE = Object.freeze({
    'Dirección': Object.freeze({
      required: Object.freeze([
        'clientes', 'polizas', 'gestiones', 'aseguradoras',
        'contactosAseguradora', 'plataformasAseguradora',
        'calidadDatos', 'financiero_historico'
      ]),
      optional: Object.freeze([
        'cobros', 'carteraPrimas', 'vehiculos', 'solicitudesPortal',
        'cuentasBancariasAseguradora'
      ]),
      denied: Object.freeze([])
    }),
    'Operativo': Object.freeze({
      required: Object.freeze([
        'clientes', 'polizas', 'gestiones', 'aseguradoras',
        'contactosAseguradora', 'plataformasAseguradora', 'calidadDatos'
      ]),
      optional: Object.freeze([
        'cobros', 'carteraPrimas', 'vehiculos', 'solicitudesPortal'
      ]),
      denied: Object.freeze([
        'cuentasBancariasAseguradora', 'credentialRefs', 'auditEvents', 'auditoriaImportaciones',
        'financiero_historico', 'finmovs', 'movimientosBanco',
        'conciliacionBancaria', 'configuracionTenant'
      ])
    }),
    'Asesor': Object.freeze({
      required: Object.freeze([
        'clientes', 'polizas', 'cobros', 'gestiones',
        'solicitudesPortal', 'aseguradoras', 'contactosAseguradora',
        'calidadDatos'
      ]),
      optional: Object.freeze(['vehiculos', 'recibosEsperados', 'documentos']),
      denied: Object.freeze([
        'plataformasAseguradora', 'cuentasBancariasAseguradora',
        'credentialRefs', 'members', 'auditEvents', 'auditoriaImportaciones',
        'importBatches', 'financiero_historico', 'finmovs',
        'movimientosBanco', 'conciliacionBancaria', 'configuracionTenant'
      ])
    })
  });

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

  function activeRole(membership) {
    return text(membership && (membership.activeRole || membership.rolActivo || membership.defaultRole || membership.rolDefault));
  }

  function assignedRoles(membership) {
    return unique(membership && (membership.roles || membership.rolesAsignados || []));
  }

  function profileFor(membership) {
    var role = activeRole(membership);
    var errors = [];
    if (SUPPORTED_ROLES.indexOf(role) < 0) errors.push('rol_fuera_del_primer_smoke:' + role);
    if (assignedRoles(membership).indexOf(role) < 0) errors.push('rol_activo_no_asignado');
    if (text(membership && (membership.status || membership.estado)).toLowerCase() !== 'active') errors.push('membresia_inactiva');
    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      role: role,
      profile: clone(FIRST_SMOKE_PROFILE[role] || { required: [], optional: [], denied: [] }),
      errors: errors
    };
  }

  function collectionPolicy(access, collection) {
    return clone(access && access.COLLECTION_POLICY && access.COLLECTION_POLICY[collection] || {});
  }

  function hardDeniedForRole(role, policy) {
    if (!policy || !policy.module) return 'coleccion_sin_politica';
    if (policy.membership || policy.audit || policy.restricted) return 'coleccion_sistema_o_restringida';
    if (role === 'Asesor' && policy.advisorRead !== true) return 'asesor_lectura_bloqueada';
    if (policy.finance && ['Dirección', 'SuperAdmin', 'AdminTenant', 'Finanzas'].indexOf(role) < 0) return 'rol_financiero_requerido';
    return '';
  }

  function compileCollection(collection, membership, options) {
    options = options || {};
    var access = options.accessPolicy || window.Orbit.tenantAccessPolicyP0;
    var planner = options.queryPlanner || window.Orbit.productQueryPlannerP0;
    var role = activeRole(membership);
    var policy = collectionPolicy(access, collection);
    var errors = [];
    var denial = hardDeniedForRole(role, policy);
    if (denial) errors.push(denial);
    if (!access || typeof access.moduleVisible !== 'function') errors.push('politica_acceso_faltante');
    if (!planner || typeof planner.compile !== 'function') errors.push('planner_faltante');
    if (!errors.length && !access.moduleVisible(membership, policy.module)) errors.push('modulo_no_visible:' + policy.module);

    var plan = null;
    if (!errors.length) {
      plan = planner.compile(collection, membership, { accessPolicy: access, context: options.context || {} });
      if (!plan.ok) errors.push.apply(errors, plan.errors || ['plan_invalido']);
      if (plan.denied) errors.push('scope_none');
    }

    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      collection: collection,
      module: policy.module || '',
      role: role,
      scope: plan ? plan.scope : '',
      constraints: plan ? clone(plan.constraints) : [],
      indexSignature: plan ? indexSignature(plan.constraints) : '',
      errors: unique(errors)
    };
  }

  function indexFields(constraints) {
    var order = ['tenantId', 'country', 'advisorId', 'teamId'];
    var fields = [];
    order.forEach(function (field) {
      if ((constraints || []).some(function (item) { return item && item.field === field; })) {
        fields.push({ fieldPath: field, order: 'ASCENDING' });
      }
    });
    return fields;
  }

  function indexSignature(constraints) {
    return indexFields(constraints).map(function (item) { return item.fieldPath + ':' + item.order; }).join('|');
  }

  function indexCandidate(constraints) {
    var fields = indexFields(constraints);
    if (!fields.length) return null;
    return {
      collectionGroup: PHYSICAL_COLLECTION_GROUP,
      queryScope: 'COLLECTION',
      fields: fields,
      deployAuthorized: false,
      status: 'candidate_requires_emulator_or_firestore_confirmation'
    };
  }

  function buildCatalog(membership, options) {
    options = options || {};
    var profileCheck = profileFor(membership);
    if (!profileCheck.ok) {
      return {
        ok: false,
        writeAuthorized: false,
        deployAuthorized: false,
        version: VERSION,
        errors: profileCheck.errors,
        requiredCollections: [],
        optionalCollections: [],
        deniedCollections: [],
        indexCandidates: []
      };
    }

    var compiledRequired = profileCheck.profile.required.map(function (collection) {
      return compileCollection(collection, membership, options);
    });
    var compiledOptional = profileCheck.profile.optional.map(function (collection) {
      return compileCollection(collection, membership, options);
    });
    var denied = profileCheck.profile.denied.map(function (collection) {
      return { collection: collection, reason: hardDeniedForRole(profileCheck.role, collectionPolicy(options.accessPolicy || window.Orbit.tenantAccessPolicyP0, collection)) || 'perfil_smoke_denegado' };
    });

    var errors = [];
    compiledRequired.forEach(function (item) {
      if (!item.ok) errors.push(item.collection + ':' + item.errors.join(','));
    });

    var indexMap = {};
    compiledRequired.concat(compiledOptional).forEach(function (item) {
      if (!item.ok || !item.indexSignature) return;
      if (!indexMap[item.indexSignature]) {
        var candidate = indexCandidate(item.constraints);
        candidate.signature = item.indexSignature;
        candidate.logicalCollections = [];
        indexMap[item.indexSignature] = candidate;
      }
      indexMap[item.indexSignature].logicalCollections.push(item.collection);
    });

    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      deployAuthorized: false,
      version: VERSION,
      physicalCollectionGroup: PHYSICAL_COLLECTION_GROUP,
      role: profileCheck.role,
      tenantId: text(membership && membership.tenantId),
      countries: unique(membership && (membership.countries || membership.paises || [])),
      requiredCollections: compiledRequired,
      optionalCollections: compiledOptional,
      deniedCollections: denied,
      indexCandidates: Object.keys(indexMap).sort().map(function (key) {
        indexMap[key].logicalCollections = unique(indexMap[key].logicalCollections).sort();
        return indexMap[key];
      }),
      systemReadsOutsideStore: [
        'tenants/{tenantId}/system/config',
        'tenants/{tenantId}/members/{uid}'
      ],
      hardGuards: {
        noSystemDocumentsThroughDataStore: true,
        noCollectionWithoutPolicy: true,
        noAdvisorPlatformOrBankReads: true,
        noCrossTenantQuery: true,
        noIndexDeployWithoutConfirmation: true,
        noWrites: true
      },
      errors: unique(errors)
    };
  }

  function toFirestoreIndexes(catalog) {
    var indexes = (catalog && Array.isArray(catalog.indexCandidates) ? catalog.indexCandidates : []).map(function (candidate) {
      return {
        collectionGroup: candidate.collectionGroup,
        queryScope: candidate.queryScope,
        fields: clone(candidate.fields)
      };
    });
    return {
      indexes: indexes,
      fieldOverrides: [],
      deployAuthorized: false,
      source: 'orbit360.product-readonly-smoke-catalog-p0'
    };
  }

  window.Orbit.productReadOnlySmokeCatalogP0 = Object.freeze({
    VERSION: VERSION,
    PHYSICAL_COLLECTION_GROUP: PHYSICAL_COLLECTION_GROUP,
    SUPPORTED_ROLES: SUPPORTED_ROLES,
    FIRST_SMOKE_PROFILE: FIRST_SMOKE_PROFILE,
    profileFor: profileFor,
    compileCollection: compileCollection,
    indexFields: indexFields,
    indexSignature: indexSignature,
    buildCatalog: buildCatalog,
    toFirestoreIndexes: toFirestoreIndexes
  });
})();
