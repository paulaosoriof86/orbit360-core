/* ============================================================
   Orbit 360 · Contrato P0 de acceso productivo por tenant
   Fecha: 2026-07-13

   Evalúa rol activo, módulos, scope, país y tipo de colección.
   Es una especificación ejecutable; no reemplaza reglas/Auth/store.
   No realiza lecturas ni escrituras.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var PRIVILEGED_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);
  var OPERATIONS_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo']);
  var FINANCE_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant', 'Finanzas']);
  var VALID_SCOPES = Object.freeze(['own', 'team', 'all', 'none']);
  var ADVISOR_CLIENT_PATCH_FIELDS = Object.freeze([
    'whatsapp', 'telefonoAlterno', 'correo', 'direccion', 'zona', 'sector', 'barrio',
    'departamento', 'provincia', 'ciudad', 'municipio', 'fechaNacimiento', 'sexo',
    'ocupacion', 'cargo', 'contactoPrincipal', 'observacionesContacto', 'updatedAt', 'updatedBy'
  ]);
  var ADVISOR_MANAGEMENT_TYPES = Object.freeze([
    'cliente_no_aparece', 'poliza_no_aparece', 'cliente_asignado_a_otro_asesor',
    'asesor_incorrecto', 'documento_incorrecto', 'dato_validado_incorrecto', 'posible_duplicado'
  ]);

  var COLLECTION_POLICY = Object.freeze({
    clientes: { module: 'cliente360', scoped: true, advisorRead: true, advisorPatch: true },
    contactosCliente: { module: 'cliente360', scoped: true, advisorRead: true, advisorPatch: true },
    calidadDatos: { module: 'calidad', scoped: true, advisorRead: true, advisorWrite: true },
    gestiones: { module: 'ops', scoped: true, advisorRead: true, advisorWrite: true },
    polizas: { module: 'polizas', scoped: true, advisorRead: true, advisorWrite: false },
    vehiculos: { module: 'polizas', scoped: true, advisorRead: true, advisorWrite: false },
    recibosEsperados: { module: 'cobros', scoped: true, advisorRead: true, advisorWrite: false },
    cobros: { module: 'cobros', scoped: true, advisorRead: true, advisorWrite: false },
    carteraPrimas: { module: 'cobros', scoped: true, advisorRead: true, advisorWrite: false },
    documentos: { module: 'cliente360', scoped: true, advisorRead: true, advisorWrite: false },
    solicitudesPortal: { module: 'portal', scoped: true, advisorRead: true, advisorWrite: false },
    aseguradoras: { module: 'aseguradoras', scoped: false, advisorRead: true, advisorWrite: false },
    contactosAseguradora: { module: 'aseguradoras', scoped: false, advisorRead: true, advisorWrite: false },
    plataformasAseguradora: { module: 'aseguradoras', scoped: false, advisorRead: false, advisorWrite: false },
    cuentasBancariasAseguradora: { module: 'aseguradoras', scoped: false, advisorRead: false, advisorWrite: false },
    credentialRefs: { module: 'configuracion', scoped: false, restricted: true, backendOnlyWrite: true },
    members: { module: 'equipo', scoped: false, membership: true, restricted: true },
    auditoriaImportaciones: { module: 'auditoria', scoped: false, audit: true, restricted: true, appendOnly: true },
    auditEvents: { module: 'auditoria', scoped: false, audit: true, restricted: true, appendOnly: true },
    importBatches: { module: 'importar', scoped: false, restricted: true },
    financiero_historico: { module: 'finanzas', scoped: false, finance: true },
    finmovs: { module: 'finanzas', scoped: false, finance: true, controlledWriteOnly: true },
    movimientosBanco: { module: 'conciliaciones', scoped: false, finance: true, controlledWriteOnly: true },
    conciliacionBancaria: { module: 'conciliaciones', scoped: false, finance: true, controlledWriteOnly: true },
    configuracionTenant: { module: 'configuracion', scoped: false, restricted: true },
    academyProgress: { module: 'academia', scoped: false, selfProgress: true }
  });

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }

  function normalizeScope(value) {
    var raw = text(value).toLowerCase();
    if (['own', 'propios', 'propio', 'mios'].indexOf(raw) >= 0) return 'own';
    if (['team', 'equipo'].indexOf(raw) >= 0) return 'team';
    if (['all', 'todos', 'global'].indexOf(raw) >= 0) return 'all';
    if (['none', 'ninguno', 'sin_acceso'].indexOf(raw) >= 0) return 'none';
    return raw;
  }

  function normalizeMembership(input) {
    input = input || {};
    var roles = unique(input.roles || input.rolesAsignados || []);
    var activeRole = text(input.activeRole || input.rolActivo || input.defaultRole || input.rolDefault || roles[0]);
    var scopes = input.dataScopes || input.scopes || { default: input.defaultScope, modules: input.moduleScopes };
    return {
      uid: text(input.uid || input.userId || input.id),
      tenantId: text(input.tenantId || input.tenant),
      roles: roles,
      activeRole: activeRole,
      status: text(input.status || input.estado || 'inactive').toLowerCase(),
      modulesExtra: unique(input.modulesExtra || input.modulosExtraPermitidos || []),
      modulesRestricted: unique(input.modulesRestricted || input.modulosRestringidos || []),
      modulesVisible: unique(input.modulesVisible || input.modulosVisibles || []),
      defaultScope: normalizeScope(scopes.default || input.defaultScope || input.dataScope || input.scope || 'none'),
      moduleScopes: scopes.modules && typeof scopes.modules === 'object' ? scopes.modules : (input.moduleScopes && typeof input.moduleScopes === 'object' ? input.moduleScopes : {}),
      countries: unique(input.countries || input.paises).map(function (country) { return country.toUpperCase(); }),
      advisorId: text(input.advisorId || input.asesorId),
      teamId: text(input.teamId || input.equipoId)
    };
  }

  function activeMembership(input) {
    var membership = normalizeMembership(input);
    return membership.status === 'active' && membership.roles.indexOf(membership.activeRole) >= 0;
  }

  function isPrivileged(role) {
    return PRIVILEGED_ROLES.indexOf(text(role)) >= 0;
  }

  function policyFor(collection, overrides) {
    return Object.assign({}, COLLECTION_POLICY[collection] || {}, overrides && overrides[collection] || {});
  }

  function moduleVisible(membershipInput, moduleKey) {
    var m = normalizeMembership(membershipInput);
    if (!activeMembership(m)) return false;
    if (m.modulesRestricted.indexOf(moduleKey) >= 0) return false;
    if (isPrivileged(m.activeRole)) return true;
    if (m.modulesVisible.indexOf('*') >= 0 || m.modulesVisible.indexOf(moduleKey) >= 0) return true;
    return m.modulesExtra.indexOf(moduleKey) >= 0;
  }

  function effectiveScope(membershipInput, moduleKey) {
    var m = normalizeMembership(membershipInput);
    var explicit = normalizeScope(m.moduleScopes[moduleKey]);
    if (VALID_SCOPES.indexOf(explicit) >= 0) return explicit;
    return VALID_SCOPES.indexOf(m.defaultScope) >= 0 ? m.defaultScope : 'none';
  }

  function countryAllowed(membershipInput, record) {
    var m = normalizeMembership(membershipInput);
    var country = text(record && (record.country || record.pais)).toUpperCase();
    if (!country || !m.countries.length) return true;
    return m.countries.indexOf(country) >= 0;
  }

  function recordTenant(record) {
    return text(record && (record.tenantId || record.tenant));
  }

  function sameTenant(membershipInput, record) {
    var m = normalizeMembership(membershipInput);
    return !!m.tenantId && recordTenant(record) === m.tenantId;
  }

  function recordWithinScope(membershipInput, record, moduleKey) {
    var m = normalizeMembership(membershipInput);
    var scope = effectiveScope(m, moduleKey);
    var advisorId = text(record && (record.advisorId || record.asesorId || record.ownerAdvisorId));
    var teamId = text(record && (record.teamId || record.equipoId));
    if (scope === 'all') return true;
    if (scope === 'none') return false;
    if (scope === 'own') return !!m.advisorId && advisorId === m.advisorId;
    if (scope === 'team') return !!m.teamId && teamId === m.teamId;
    return false;
  }

  function decision(ok, code, details) {
    return Object.assign({ ok: !!ok, allowed: !!ok, code: code, writeAuthorized: false }, details || {});
  }

  function canRead(collection, record, membershipInput, context) {
    context = context || {};
    var m = normalizeMembership(membershipInput);
    var p = policyFor(collection, context.collectionPolicy);
    if (!activeMembership(m)) return decision(false, 'membresia_inactiva');
    if (!sameTenant(m, record || { tenantId: context.tenantId })) return decision(false, 'tenant_no_coincide');
    if (!countryAllowed(m, record)) return decision(false, 'pais_fuera_de_scope');
    if (!p.module) return decision(false, 'coleccion_sin_politica');
    if (!moduleVisible(m, p.module)) return decision(false, 'modulo_no_visible', { module: p.module });

    if (p.membership) {
      var targetUid = text(record && (record.uid || record.id));
      return decision(isPrivileged(m.activeRole) || targetUid === m.uid, isPrivileged(m.activeRole) || targetUid === m.uid ? 'lectura_membresia_permitida' : 'membresia_ajena_bloqueada');
    }
    if (p.audit || p.restricted) {
      var restrictedAllowed = isPrivileged(m.activeRole) || (collection === 'credentialRefs' && m.activeRole === 'Operativo' && context.allowOperativoCredentialMetadata === true);
      return decision(restrictedAllowed, restrictedAllowed ? 'lectura_restringida_permitida' : 'coleccion_restringida');
    }
    if (p.selfProgress) {
      var progressUid = text(record && (record.uid || record.userId || record.id));
      var selfAllowed = isPrivileged(m.activeRole) || progressUid === m.uid;
      return decision(selfAllowed, selfAllowed ? 'progreso_permitido' : 'progreso_ajeno_bloqueado');
    }
    if (m.activeRole === 'Asesor' && p.advisorRead !== true) return decision(false, 'asesor_lectura_bloqueada');
    if (p.finance && FINANCE_ROLES.indexOf(m.activeRole) < 0) return decision(false, 'rol_financiero_requerido');
    if (p.scoped && !recordWithinScope(m, record, p.module)) return decision(false, 'registro_fuera_de_scope', { scope: effectiveScope(m, p.module) });
    return decision(true, 'lectura_permitida', { module: p.module, scope: p.scoped ? effectiveScope(m, p.module) : 'not_applicable' });
  }

  function patchFields(patch) {
    return Object.keys(patch && typeof patch === 'object' ? patch : {});
  }

  function validateAdvisorPatch(collection, patch, record, membershipInput) {
    var m = normalizeMembership(membershipInput);
    var p = policyFor(collection);
    var errors = [];
    if (!p.advisorPatch) errors.push('asesor_patch_no_permitido');
    if (!recordWithinScope(m, record, p.module)) errors.push('registro_fuera_de_scope');
    patchFields(patch).forEach(function (field) {
      if (ADVISOR_CLIENT_PATCH_FIELDS.indexOf(field) < 0) errors.push('campo_no_editable:' + field);
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function validateAdvisorManagement(record, membershipInput) {
    var m = normalizeMembership(membershipInput);
    var errors = [];
    if (!recordWithinScope(m, record, 'ops')) errors.push('gestion_fuera_de_scope');
    if (ADVISOR_MANAGEMENT_TYPES.indexOf(text(record && record.type)) < 0) errors.push('tipo_gestion_no_permitido');
    if (!text(record && record.reason)) errors.push('motivo_requerido');
    return { ok: errors.length === 0, errors: errors };
  }

  function canWrite(collection, action, record, patch, membershipInput, context) {
    context = context || {};
    var m = normalizeMembership(membershipInput);
    var p = policyFor(collection, context.collectionPolicy);
    var readGate = canRead(collection, record, m, context);
    if (!activeMembership(m)) return decision(false, 'membresia_inactiva');
    if (!sameTenant(m, record || { tenantId: context.tenantId })) return decision(false, 'tenant_no_coincide');
    if (!p.module) return decision(false, 'coleccion_sin_politica');
    if (!moduleVisible(m, p.module)) return decision(false, 'modulo_no_visible');
    if (p.backendOnlyWrite) return decision(false, 'escritura_solo_backend');
    if (p.controlledWriteOnly) return decision(false, 'escritura_solo_plan_controlado');
    if (p.appendOnly && action !== 'create') return decision(false, 'coleccion_append_only');
    if (p.membership) return decision(false, 'usar_contrato_membresias');
    if (p.restricted && !isPrivileged(m.activeRole)) return decision(false, 'coleccion_restringida');
    if (p.finance && FINANCE_ROLES.indexOf(m.activeRole) < 0) return decision(false, 'rol_financiero_requerido');

    if (m.activeRole === 'Asesor') {
      if (collection === 'gestiones' && action === 'create') {
        var management = validateAdvisorManagement(record, m);
        return decision(management.ok, management.ok ? 'gestion_correccion_permitida' : 'gestion_correccion_invalida', { errors: management.errors });
      }
      if ((collection === 'clientes' || collection === 'contactosCliente') && action === 'update') {
        var advisorPatch = validateAdvisorPatch(collection, patch, record, m);
        return decision(advisorPatch.ok, advisorPatch.ok ? 'completar_datos_permitido' : 'patch_asesor_bloqueado', { errors: advisorPatch.errors });
      }
      if (collection === 'calidadDatos' && ['create', 'update'].indexOf(action) >= 0 && p.advisorWrite) {
        return decision(recordWithinScope(m, record, p.module), recordWithinScope(m, record, p.module) ? 'calidad_propia_permitida' : 'calidad_fuera_de_scope');
      }
      return decision(false, 'asesor_escritura_bloqueada');
    }

    if (OPERATIONS_ROLES.indexOf(m.activeRole) >= 0) {
      if (p.scoped && !recordWithinScope(m, record, p.module)) return decision(false, 'registro_fuera_de_scope');
      return decision(true, 'escritura_operativa_permitida', { requiresAudit: true, previousReadAllowed: readGate.allowed });
    }
    if (FINANCE_ROLES.indexOf(m.activeRole) >= 0 && p.finance && !p.controlledWriteOnly) {
      return decision(true, 'escritura_financiera_permitida', { requiresAudit: true });
    }
    return decision(false, 'rol_sin_permiso_escritura');
  }

  function queryConstraints(collection, membershipInput, context) {
    context = context || {};
    var m = normalizeMembership(membershipInput);
    var p = policyFor(collection, context.collectionPolicy);
    var constraints = [{ field: 'tenantId', op: '==', value: m.tenantId }];
    if (m.countries.length === 1) constraints.push({ field: 'country', op: '==', value: m.countries[0] });
    if (m.countries.length > 1) constraints.push({ field: 'country', op: 'in', value: m.countries.slice(0, 10) });
    if (p.scoped) {
      var scope = effectiveScope(m, p.module);
      if (scope === 'own') constraints.push({ field: 'advisorId', op: '==', value: m.advisorId });
      if (scope === 'team') constraints.push({ field: 'teamId', op: '==', value: m.teamId });
      if (scope === 'none') constraints.push({ field: '__deny__', op: '==', value: true });
    }
    return {
      ok: activeMembership(m) && !!p.module,
      writeAuthorized: false,
      collection: collection,
      module: p.module || '',
      scope: p.scoped ? effectiveScope(m, p.module) : 'not_applicable',
      constraints: constraints
    };
  }

  window.Orbit.tenantAccessPolicyP0 = Object.freeze({
    VERSION: VERSION,
    PRIVILEGED_ROLES: PRIVILEGED_ROLES,
    COLLECTION_POLICY: COLLECTION_POLICY,
    ADVISOR_CLIENT_PATCH_FIELDS: ADVISOR_CLIENT_PATCH_FIELDS,
    ADVISOR_MANAGEMENT_TYPES: ADVISOR_MANAGEMENT_TYPES,
    normalizeMembership: normalizeMembership,
    activeMembership: activeMembership,
    moduleVisible: moduleVisible,
    effectiveScope: effectiveScope,
    sameTenant: sameTenant,
    recordWithinScope: recordWithinScope,
    canRead: canRead,
    canWrite: canWrite,
    validateAdvisorPatch: validateAdvisorPatch,
    validateAdvisorManagement: validateAdvisorManagement,
    queryConstraints: queryConstraints
  });
})();
