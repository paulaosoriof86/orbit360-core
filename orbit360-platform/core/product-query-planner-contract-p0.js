/* ============================================================
   Orbit 360 · Compilador P0 de consultas productivas por scope
   Fecha: 2026-07-13

   Convierte membresía + política de acceso en constraints Firestore.
   Capa pura: no consulta, no adjunta snapshots y no escribe.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var SUPPORTED_OPERATORS = Object.freeze(['==', 'in', 'array-contains']);
  var MAX_IN_VALUES = 10;

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

  function normalizeConstraint(input) {
    input = input || {};
    return {
      field: text(input.field),
      op: text(input.op || '=='),
      value: Array.isArray(input.value) ? unique(input.value) : input.value
    };
  }

  function validateConstraint(input, tenantId) {
    var constraint = normalizeConstraint(input);
    var errors = [];
    if (!constraint.field) errors.push('constraint_field_faltante');
    if (constraint.field === '__deny__') return { ok: true, constraint: constraint, errors: [] };
    if (SUPPORTED_OPERATORS.indexOf(constraint.op) < 0) errors.push('constraint_operador_no_soportado:' + constraint.op);
    if (constraint.value === undefined || constraint.value === null || constraint.value === '') errors.push('constraint_value_faltante:' + constraint.field);
    if (constraint.op === 'in') {
      if (!Array.isArray(constraint.value) || !constraint.value.length) errors.push('constraint_in_invalido:' + constraint.field);
      if (Array.isArray(constraint.value) && constraint.value.length > MAX_IN_VALUES) errors.push('constraint_in_supera_limite:' + constraint.field);
    }
    if (constraint.field === 'tenantId' && (constraint.op !== '==' || constraint.value !== tenantId)) {
      errors.push('constraint_tenant_invalido');
    }
    return { ok: errors.length === 0, constraint: constraint, errors: errors };
  }

  function dedupeConstraints(constraints) {
    var seen = {};
    var out = [];
    (constraints || []).forEach(function (item) {
      var normalized = normalizeConstraint(item);
      var key = [normalized.field, normalized.op, JSON.stringify(normalized.value)].join('|');
      if (!seen[key]) {
        seen[key] = true;
        out.push(normalized);
      }
    });
    return out;
  }

  function compile(collection, membership, options) {
    options = options || {};
    var access = options.accessPolicy || window.Orbit.tenantAccessPolicyP0;
    var errors = [];
    if (!access || typeof access.queryConstraints !== 'function') {
      return { ok: false, writeAuthorized: false, collection: collection, constraints: [], errors: ['politica_acceso_faltante'] };
    }
    var normalizedMembership = access.normalizeMembership ? access.normalizeMembership(membership) : clone(membership || {});
    var tenantId = text(normalizedMembership.tenantId);
    if (!tenantId) errors.push('tenant_faltante');
    if (!collection) errors.push('coleccion_faltante');
    if (!access.activeMembership(normalizedMembership)) errors.push('membresia_inactiva');

    var proposal = access.queryConstraints(collection, normalizedMembership, options.context || {});
    if (!proposal || proposal.ok !== true) errors.push('politica_no_autoriza_consulta');
    var constraints = dedupeConstraints(proposal && proposal.constraints || []);
    var hasDeny = constraints.some(function (item) { return item.field === '__deny__'; });
    var tenantConstraints = constraints.filter(function (item) { return item.field === 'tenantId'; });
    if (!hasDeny && tenantConstraints.length !== 1) errors.push('tenant_constraint_unico_requerido');

    constraints.forEach(function (constraint) {
      var check = validateConstraint(constraint, tenantId);
      if (!check.ok) errors.push.apply(errors, check.errors);
    });

    var moduleKey = text(proposal && proposal.module);
    if (!hasDeny && moduleKey && access.moduleVisible && !access.moduleVisible(normalizedMembership, moduleKey)) {
      errors.push('modulo_no_visible');
    }

    var scope = text(proposal && proposal.scope);
    if (scope === 'own' && !constraints.some(function (item) { return item.field === 'advisorId' && item.op === '==' && item.value === normalizedMembership.advisorId; })) {
      errors.push('scope_own_sin_constraint_asesor');
    }
    if (scope === 'team' && !constraints.some(function (item) { return item.field === 'teamId' && item.op === '==' && item.value === normalizedMembership.teamId; })) {
      errors.push('scope_team_sin_constraint_equipo');
    }
    if (scope === 'none' && !hasDeny) errors.push('scope_none_sin_deny');

    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      version: VERSION,
      collection: text(collection),
      tenantId: tenantId,
      module: moduleKey,
      scope: scope || 'not_applicable',
      denied: hasDeny,
      constraints: constraints,
      errors: unique(errors),
      indexHint: constraints.filter(function (item) { return item.field !== '__deny__'; }).map(function (item) {
        return { field: item.field, mode: item.op === 'array-contains' ? 'ARRAY_CONTAINS' : 'ASCENDING' };
      }),
      runtimeGuards: {
        requireTenantConstraint: true,
        rejectOpenQuery: true,
        maxInValues: MAX_IN_VALUES,
        noClientSideTenantFiltering: true
      }
    };
  }

  function createPlanner(membership, options) {
    var frozenMembership = clone(membership || {});
    var frozenOptions = Object.assign({}, options || {});
    return function (collection) {
      return compile(collection, frozenMembership, frozenOptions);
    };
  }

  function compileCatalog(collections, membership, options) {
    var plans = {};
    var errors = [];
    unique(collections).forEach(function (collection) {
      plans[collection] = compile(collection, membership, options);
      if (!plans[collection].ok) errors.push(collection + ':' + plans[collection].errors.join(','));
    });
    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      version: VERSION,
      plans: plans,
      errors: errors
    };
  }

  window.Orbit.productQueryPlannerP0 = Object.freeze({
    VERSION: VERSION,
    SUPPORTED_OPERATORS: SUPPORTED_OPERATORS,
    MAX_IN_VALUES: MAX_IN_VALUES,
    normalizeConstraint: normalizeConstraint,
    validateConstraint: validateConstraint,
    compile: compile,
    createPlanner: createPlanner,
    compileCatalog: compileCatalog
  });
})();
