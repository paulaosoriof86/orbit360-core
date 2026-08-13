/* ============================================================
   Orbit 360 · Contrato P0 de membresías multirol y scopes
   Fecha: 2026-07-13

   Capa pura y aditiva. Normaliza, valida y propone cambios.
   No reemplaza Auth, reglas ni Orbit.store y no realiza escrituras.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var MEMBERSHIP_COLLECTION = 'members';
  var VALID_STATUSES = Object.freeze(['invited', 'active', 'suspended', 'inactive']);
  var VALID_SCOPES = Object.freeze(['own', 'team', 'all', 'none']);
  var PRIVILEGED_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);
  var DEFAULT_ROLE_DEFINITIONS = Object.freeze({
    'Dirección': { modules: ['*'], defaultScope: 'all' },
    'SuperAdmin': { modules: ['*'], defaultScope: 'all' },
    'AdminTenant': { modules: ['*'], defaultScope: 'all' },
    'Operativo': { modules: ['inicio', 'cliente360', 'polizas', 'cobros', 'renovaciones', 'ops', 'leads', 'aseguradoras', 'calidad', 'importar'], defaultScope: 'team' },
    'Finanzas': { modules: ['inicio', 'finanzas', 'cobros', 'conciliaciones', 'comisiones', 'reportes', 'calidad'], defaultScope: 'all' },
    'Marketing': { modules: ['inicio', 'marketing', 'leads', 'plantillas', 'automatizaciones', 'reportes'], defaultScope: 'team' },
    'Asesor': { modules: ['inicio', 'cliente360', 'polizas', 'cobros', 'renovaciones', 'ops', 'leads', 'aseguradoras', 'calidad', 'portal'], defaultScope: 'own' },
    'Comercial': { modules: ['inicio', 'cliente360', 'polizas', 'cotizador', 'comparativo', 'leads', 'calidad'], defaultScope: 'own' },
    'Asistente': { modules: ['inicio', 'cliente360', 'ops', 'calidad'], defaultScope: 'team' }
  });
  var SENSITIVE_KEYS = Object.freeze([
    'password', 'pass', 'pwd', 'contrasena', 'clave', 'secret', 'token',
    'apikey', 'accesstoken', 'refreshtoken', 'credentialvalue'
  ]);
  var STRONG_CONFIRMATION_PHRASE = 'CONFIRMO AMPLIAR ACCESO';

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

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function roleDefinitions(policy) {
    return Object.assign({}, DEFAULT_ROLE_DEFINITIONS, policy && policy.roleDefinitions || {});
  }

  function normalizeScope(value) {
    var raw = text(value).toLowerCase();
    if (['propios', 'propio', 'own', 'mios'].indexOf(raw) >= 0) return 'own';
    if (['equipo', 'team'].indexOf(raw) >= 0) return 'team';
    if (['todos', 'all', 'global'].indexOf(raw) >= 0) return 'all';
    if (['ninguno', 'none', 'sin_acceso', 'sinacceso'].indexOf(raw) >= 0) return 'none';
    return raw;
  }

  function normalizeScopes(input) {
    var source = input && typeof input === 'object' ? input : {};
    var modules = source.modules && typeof source.modules === 'object' ? source.modules : {};
    var outModules = {};
    Object.keys(modules).forEach(function (moduleKey) {
      outModules[text(moduleKey)] = normalizeScope(modules[moduleKey]);
    });
    return {
      default: normalizeScope(source.default || source['*'] || ''),
      modules: outModules
    };
  }

  function normalize(input) {
    input = input || {};
    var roles = unique(input.roles || (input.role || input.rol ? [input.role || input.rol] : []));
    var defaultRole = text(input.defaultRole || input.rolDefault || input.roleDefault || roles[0]);
    var activeRole = text(input.activeRole || input.rolActivo || defaultRole);
    var status = text(input.status || input.estado || 'invited').toLowerCase();

    return {
      schemaVersion: VERSION,
      uid: text(input.uid || input.userId || input.id),
      email: text(input.email || input.correo).toLowerCase(),
      tenantId: text(input.tenantId || input.tenant),
      displayName: text(input.displayName || input.nombre),
      roles: roles,
      defaultRole: defaultRole,
      activeRole: activeRole,
      modulesExtra: unique(input.modulesExtra || input.modulosExtra || input.extras),
      modulesRestricted: unique(input.modulesRestricted || input.modulosRestringidos || input.restrictedModules),
      dataScopes: normalizeScopes(input.dataScopes || input.scopes || input.scopeDatos || {}),
      countries: unique(input.countries || input.paises),
      advisorId: text(input.advisorId || input.asesorId),
      teamId: text(input.teamId || input.equipoId),
      status: status,
      invitedAt: text(input.invitedAt || input.fechaInvitacion),
      activatedAt: text(input.activatedAt || input.fechaActivacion),
      updatedAt: text(input.updatedAt || input.fechaActualizacion),
      updatedBy: text(input.updatedBy || input.actualizadoPor),
      reason: text(input.reason || input.motivo)
    };
  }

  function containsSensitive(input) {
    var found = [];
    function walk(value, path) {
      if (!value || typeof value !== 'object') return;
      Object.keys(value).forEach(function (key) {
        var current = path ? path + '.' + key : key;
        var normalizedKey = String(key).toLowerCase().replace(/[_-]/g, '');
        if (SENSITIVE_KEYS.indexOf(normalizedKey) >= 0) found.push(current);
        if (value[key] && typeof value[key] === 'object') walk(value[key], current);
      });
    }
    walk(input, '');
    return found;
  }

  function validate(membership, policy) {
    var m = normalize(membership);
    var defs = roleDefinitions(policy);
    var errors = [];
    var warnings = [];
    var sensitive = containsSensitive(membership);

    if (!m.uid) errors.push('uid_faltante');
    if (!m.email || !/^\S+@\S+\.\S+$/.test(m.email)) errors.push('email_invalido');
    if (!m.tenantId) errors.push('tenant_faltante');
    if (!m.displayName) warnings.push('nombre_visible_faltante');
    if (!m.roles.length) errors.push('roles_faltantes');
    m.roles.forEach(function (role) {
      if (!defs[role]) errors.push('rol_no_configurado:' + role);
    });
    if (m.roles.indexOf(m.defaultRole) < 0) errors.push('rol_default_no_asignado');
    if (m.roles.indexOf(m.activeRole) < 0) errors.push('rol_activo_no_asignado');
    if (VALID_STATUSES.indexOf(m.status) < 0) errors.push('estado_invalido');
    if (!m.countries.length) errors.push('paises_faltantes');
    if (m.roles.some(function (role) { return /Asesor/i.test(role); }) && !m.advisorId) errors.push('asesorId_requerido');
    if (sensitive.length) errors.push('campos_sensibles_no_permitidos:' + sensitive.join(','));
    if (VALID_SCOPES.indexOf(m.dataScopes.default) < 0) errors.push('scope_default_invalido');

    Object.keys(m.dataScopes.modules).forEach(function (moduleKey) {
      if (!moduleKey) errors.push('scope_modulo_sin_clave');
      if (VALID_SCOPES.indexOf(m.dataScopes.modules[moduleKey]) < 0) errors.push('scope_modulo_invalido:' + moduleKey);
    });

    if (m.status === 'active' && !m.activatedAt) warnings.push('fecha_activacion_faltante');
    if (m.modulesExtra.some(function (moduleKey) { return m.modulesRestricted.indexOf(moduleKey) >= 0; })) {
      errors.push('modulo_extra_y_restringido');
    }

    return { ok: errors.length === 0, membership: m, errors: errors, warnings: warnings };
  }

  function baseModulesForRole(role, policy, moduleCatalog) {
    var defs = roleDefinitions(policy);
    var modules = defs[role] && Array.isArray(defs[role].modules) ? defs[role].modules.slice() : [];
    if (modules.indexOf('*') >= 0) return unique(moduleCatalog || policy && policy.moduleCatalog || []);
    return unique(modules);
  }

  function effectiveModules(membership, policy, moduleCatalog) {
    var m = normalize(membership);
    var base = baseModulesForRole(m.activeRole, policy || {}, moduleCatalog);
    var result = unique(base.concat(m.modulesExtra));
    return result.filter(function (moduleKey) { return m.modulesRestricted.indexOf(moduleKey) < 0; });
  }

  function effectiveScope(membership, moduleKey, policy) {
    var m = normalize(membership);
    var explicit = m.dataScopes.modules[text(moduleKey)] || m.dataScopes.default;
    if (VALID_SCOPES.indexOf(explicit) >= 0) return explicit;
    var defs = roleDefinitions(policy);
    var fallback = defs[m.activeRole] && normalizeScope(defs[m.activeRole].defaultScope);
    return VALID_SCOPES.indexOf(fallback) >= 0 ? fallback : 'none';
  }

  function canSwitchRole(membership, targetRole) {
    var m = normalize(membership);
    return m.status === 'active' && m.roles.indexOf(text(targetRole)) >= 0;
  }

  function proposeRoleSwitch(membership, targetRole, actor) {
    var m = normalize(membership);
    var role = text(targetRole);
    if (!canSwitchRole(m, role)) {
      return { ok: false, writeAuthorized: false, errors: ['cambio_rol_no_permitido'] };
    }
    return {
      ok: true,
      writeAuthorized: false,
      action: 'switch_active_role',
      tenantId: m.tenantId,
      uid: m.uid,
      before: { activeRole: m.activeRole },
      after: { activeRole: role },
      actor: clone(actor || {}),
      requiresBackendSessionUpdate: true
    };
  }

  function scopeRank(scope) {
    return { none: 0, own: 1, team: 2, all: 3 }[normalizeScope(scope)] || 0;
  }

  function addedValues(before, after) {
    return after.filter(function (value) { return before.indexOf(value) < 0; });
  }

  function effectiveStoredScope(membership, moduleKey) {
    return membership.dataScopes.modules[moduleKey] || membership.dataScopes.default;
  }

  function accessExpansion(beforeInput, afterInput) {
    var before = normalize(beforeInput);
    var after = normalize(afterInput);
    var reasons = [];
    var addedRoles = addedValues(before.roles, after.roles);
    var addedModules = addedValues(before.modulesExtra, after.modulesExtra);
    var removedRestrictions = before.modulesRestricted.filter(function (moduleKey) {
      return after.modulesRestricted.indexOf(moduleKey) < 0;
    });
    var scopedModules = unique(Object.keys(before.dataScopes.modules).concat(Object.keys(after.dataScopes.modules)));

    if (addedRoles.some(function (role) { return PRIVILEGED_ROLES.indexOf(role) >= 0; })) reasons.push('rol_privilegiado_agregado');
    if (scopeRank(after.dataScopes.default) > scopeRank(before.dataScopes.default)) reasons.push('scope_default_ampliado');
    scopedModules.forEach(function (moduleKey) {
      var previous = effectiveStoredScope(before, moduleKey);
      var next = effectiveStoredScope(after, moduleKey);
      if (scopeRank(next) > scopeRank(previous)) reasons.push('scope_modulo_ampliado:' + moduleKey);
    });
    if (addedModules.length) reasons.push('modulos_extra_agregados');
    if (removedRestrictions.length) reasons.push('restricciones_removidas');
    if (before.status !== 'active' && after.status === 'active') reasons.push('membresia_activada');
    if (after.countries.length > before.countries.length) reasons.push('paises_agregados');

    return { expanded: reasons.length > 0, reasons: unique(reasons) };
  }

  function validateActor(actor, before, after, expansion, policy) {
    var errors = [];
    var activeRole = text(actor && actor.activeRole);
    var assignedRoles = unique(actor && actor.assignedRoles);
    var permitted = unique(policy && policy.membershipAdminRoles || PRIVILEGED_ROLES);

    if (!actor || typeof actor !== 'object') return ['actor_faltante'];
    if (!actor.userId) errors.push('actor_userId_faltante');
    if (!activeRole) errors.push('actor_rol_activo_faltante');
    if (activeRole && assignedRoles.indexOf(activeRole) < 0) errors.push('actor_rol_no_asignado');
    if (activeRole && permitted.indexOf(activeRole) < 0) errors.push('actor_sin_permiso_membresias');
    if (!actor.reason || text(actor.reason).length < 8) errors.push('motivo_insuficiente');
    if (before.tenantId !== after.tenantId) errors.push('cambio_tenant_no_permitido');
    if (expansion.expanded) {
      if (actor.confirmationPhrase !== STRONG_CONFIRMATION_PHRASE) errors.push('confirmacion_reforzada_requerida');
      if (policy && policy.requireMfaForExpansion === true && actor.mfaVerified !== true) errors.push('mfa_requerido_ampliacion');
    }
    return errors;
  }

  function planChange(beforeInput, afterInput, actor, policy) {
    policy = policy || {};
    var beforeCheck = validate(beforeInput, policy);
    var afterCheck = validate(afterInput, policy);
    var before = beforeCheck.membership;
    var after = afterCheck.membership;
    var expansion = accessExpansion(before, after);
    var errors = [];

    if (!beforeCheck.ok) errors.push.apply(errors, beforeCheck.errors.map(function (e) { return 'before:' + e; }));
    if (!afterCheck.ok) errors.push.apply(errors, afterCheck.errors.map(function (e) { return 'after:' + e; }));
    if (before.uid !== after.uid) errors.push('cambio_uid_no_permitido');
    errors = errors.concat(validateActor(actor, before, after, expansion, policy));

    if (errors.length) {
      return {
        ok: false,
        writeAuthorized: false,
        writeExecuted: false,
        errors: errors,
        expansion: expansion
      };
    }

    var changedAt = actor.changedAt && !Number.isNaN(new Date(actor.changedAt).getTime()) ? new Date(actor.changedAt).toISOString() : new Date().toISOString();
    var afterFinal = Object.assign({}, after, {
      updatedAt: changedAt,
      updatedBy: actor.userId,
      reason: text(actor.reason)
    });

    return {
      ok: true,
      version: VERSION,
      collection: MEMBERSHIP_COLLECTION,
      writeAuthorized: false,
      writeExecuted: false,
      action: 'update_membership',
      targetId: after.uid,
      tenantId: after.tenantId,
      before: before,
      after: afterFinal,
      expansion: expansion,
      auditEntry: {
        tenantId: after.tenantId,
        collection: MEMBERSHIP_COLLECTION,
        targetId: after.uid,
        action: expansion.expanded ? 'expand_membership_access' : 'update_membership',
        before: before,
        after: afterFinal,
        reason: text(actor.reason),
        changedBy: actor.userId,
        activeRole: actor.activeRole,
        changedAt: changedAt,
        status: 'planned_not_executed'
      },
      rollbackPlan: {
        collection: MEMBERSHIP_COLLECTION,
        targetId: before.uid,
        action: 'restore_membership',
        record: before,
        status: 'planned_not_executed'
      },
      executorRequirements: {
        productBackendRequired: true,
        authUserRequired: true,
        tenantMembershipRequired: true,
        atomicWriteRequired: true,
        auditRequired: true,
        rollbackRequired: true
      }
    };
  }

  window.Orbit.membershipMultirolP0 = Object.freeze({
    VERSION: VERSION,
    MEMBERSHIP_COLLECTION: MEMBERSHIP_COLLECTION,
    VALID_STATUSES: VALID_STATUSES,
    VALID_SCOPES: VALID_SCOPES,
    PRIVILEGED_ROLES: PRIVILEGED_ROLES,
    DEFAULT_ROLE_DEFINITIONS: DEFAULT_ROLE_DEFINITIONS,
    STRONG_CONFIRMATION_PHRASE: STRONG_CONFIRMATION_PHRASE,
    normalize: normalize,
    validate: validate,
    effectiveModules: effectiveModules,
    effectiveScope: effectiveScope,
    canSwitchRole: canSwitchRole,
    proposeRoleSwitch: proposeRoleSwitch,
    accessExpansion: accessExpansion,
    planChange: planChange
  });
})();
