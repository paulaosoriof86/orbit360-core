/* ============================================================
   Orbit 360 · Plan P0 de escritura controlada a finmovs
   Fecha: 2026-07-13

   Genera un plan ejecutable, auditado y reversible.
   No llama Orbit.store ni realiza escrituras.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var TARGET_COLLECTION = 'finmovs';
  var CONFIRMATION_PHRASE = 'CONFIRMO REGISTRO DE MOVIMIENTOS';
  var DEFAULT_APPROVER_ROLES = Object.freeze(['Dirección', 'SuperAdmin', 'AdminTenant']);
  var BLOCKED_SCOPES = Object.freeze(['ninguno', 'none', '']);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function nowIso(input) {
    var value = text(input);
    if (value && !Number.isNaN(new Date(value).getTime())) return new Date(value).toISOString();
    return new Date().toISOString();
  }

  function fnv1a(input) {
    var hash = 2166136261;
    var str = String(input || '');
    for (var i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function allowedRoles(policy) {
    var roles = DEFAULT_APPROVER_ROLES.slice();
    if (policy && policy.allowOperativoFinancialPosting === true) roles.push('Operativo');
    (policy && Array.isArray(policy.extraApproverRoles) ? policy.extraApproverRoles : []).forEach(function (role) {
      if (role && roles.indexOf(role) < 0) roles.push(role);
    });
    return roles;
  }

  function validateProposal(proposal) {
    var errors = [];
    if (!proposal || typeof proposal !== 'object') return ['propuesta_faltante'];
    if (proposal.targetCollection !== TARGET_COLLECTION) errors.push('coleccion_destino_invalida');
    if (proposal.writeAuthorized !== false) errors.push('propuesta_debe_ser_dry_run');
    if (proposal.ok !== true) errors.push('propuesta_con_validaciones_pendientes');
    if (!Array.isArray(proposal.operations)) errors.push('operaciones_faltantes');
    if (proposal.counts && proposal.counts.requiresValidation > 0) errors.push('operaciones_requieren_validacion');

    (proposal.operations || []).forEach(function (op, index) {
      if (!op || typeof op !== 'object') {
        errors.push('op_' + index + ':invalida');
        return;
      }
      if (['create', 'omit'].indexOf(op.action) < 0) errors.push('op_' + index + ':accion_no_permitida');
      if (op.action === 'create') {
        if (op.collection !== TARGET_COLLECTION) errors.push('op_' + index + ':coleccion_invalida');
        if (!op.targetId || !op.sourceRecordId) errors.push('op_' + index + ':identidad_incompleta');
        if (!op.record || typeof op.record !== 'object') errors.push('op_' + index + ':registro_faltante');
        if (op.record && op.record.validationStatus !== 'dry_run') errors.push('op_' + index + ':estado_no_dry_run');
        if (op.record && op.record.promotionStatus !== 'propuesta') errors.push('op_' + index + ':promocion_no_propuesta');
        if (op.record && op.record.isPremiumCollection === true) errors.push('op_' + index + ':recaudo_prima_no_permitido');
        if (op.record && op.record.sourceCollection !== 'financiero_historico') errors.push('op_' + index + ':origen_invalido');
      }
    });
    return errors;
  }

  function validateConfirmation(confirmation, policy, proposalTenantId) {
    var errors = [];
    var roles = allowedRoles(policy);
    var activeRole = text(confirmation && confirmation.activeRole);
    var assignedRoles = confirmation && Array.isArray(confirmation.assignedRoles) ? confirmation.assignedRoles : [];
    var scope = text(confirmation && confirmation.dataScope).toLowerCase();

    if (!confirmation || typeof confirmation !== 'object') return ['confirmacion_faltante'];
    if (confirmation.approved !== true) errors.push('confirmacion_no_aprobada');
    if (confirmation.phrase !== CONFIRMATION_PHRASE) errors.push('frase_confirmacion_invalida');
    if (!confirmation.userId) errors.push('usuario_confirmador_faltante');
    if (!confirmation.reason || text(confirmation.reason).length < 8) errors.push('motivo_insuficiente');
    if (!activeRole) errors.push('rol_activo_faltante');
    if (activeRole && assignedRoles.indexOf(activeRole) < 0) errors.push('rol_activo_no_asignado');
    if (activeRole && roles.indexOf(activeRole) < 0) errors.push('rol_no_autorizado');
    if (BLOCKED_SCOPES.indexOf(scope) >= 0) errors.push('scope_sin_acceso');
    if (proposalTenantId && confirmation.tenantId !== proposalTenantId) errors.push('tenant_confirmacion_no_coincide');
    if (policy && policy.requireMfa === true && confirmation.mfaVerified !== true) errors.push('mfa_requerido');
    return errors;
  }

  function proposalTenant(proposal) {
    var creates = (proposal && proposal.operations || []).filter(function (op) { return op.action === 'create'; });
    var tenant = '';
    for (var i = 0; i < creates.length; i += 1) {
      var current = text(creates[i].record && creates[i].record.tenantId);
      if (!tenant) tenant = current;
      if (tenant && current !== tenant) return { tenantId: tenant, mixed: true };
    }
    return { tenantId: tenant, mixed: false };
  }

  function planId(proposal, confirmation) {
    var ids = (proposal.operations || []).map(function (op) {
      return [op.action, op.targetId || '', op.sourceRecordId || '', op.reason || ''].join(':');
    }).join('|');
    return 'finmov_plan_' + fnv1a([
      confirmation.tenantId,
      confirmation.userId,
      confirmation.activeRole,
      confirmation.reason,
      ids
    ].join('|'));
  }

  function buildAudit(planIdValue, op, confirmation, confirmedAt) {
    return {
      id: 'aud_' + planIdValue + '_' + fnv1a(op.targetId || op.sourceRecordId || op.reason || ''),
      tenantId: confirmation.tenantId,
      action: op.action === 'create' ? 'create_finmov_from_history' : 'omit_duplicate_finmov',
      collection: TARGET_COLLECTION,
      targetId: op.targetId || '',
      sourceCollection: 'financiero_historico',
      sourceRecordId: op.sourceRecordId || '',
      before: null,
      after: op.action === 'create' ? op.record : null,
      reason: confirmation.reason,
      confirmedBy: confirmation.userId,
      activeRole: confirmation.activeRole,
      dataScope: confirmation.dataScope,
      confirmedAt: confirmedAt,
      status: 'planned_not_executed'
    };
  }

  function buildRollback(planIdValue, op) {
    if (op.action !== 'create') return null;
    return {
      planId: planIdValue,
      collection: TARGET_COLLECTION,
      action: 'remove_inserted',
      targetId: op.targetId,
      sourceRecordId: op.sourceRecordId,
      status: 'planned_not_executed'
    };
  }

  function buildPlan(proposal, confirmation, policy) {
    var tenant = proposalTenant(proposal || {});
    var errors = validateProposal(proposal);
    if (tenant.mixed) errors.push('propuesta_multi_tenant_bloqueada');
    if (!tenant.tenantId) errors.push('tenant_propuesta_faltante');
    errors = errors.concat(validateConfirmation(confirmation, policy || {}, tenant.tenantId));

    if (errors.length) {
      return {
        ok: false,
        version: VERSION,
        readyForExecutor: false,
        writeExecuted: false,
        errors: errors,
        operations: [],
        auditEntries: [],
        rollbackPlan: []
      };
    }

    var confirmedAt = nowIso(confirmation.confirmedAt);
    var id = planId(proposal, confirmation);
    var creates = [];
    var omissions = [];
    var auditEntries = [];
    var rollbackPlan = [];

    proposal.operations.forEach(function (op) {
      if (op.action === 'create') {
        creates.push({
          action: 'insert',
          collection: TARGET_COLLECTION,
          id: op.targetId,
          record: Object.assign({}, op.record, {
            id: op.targetId,
            promotionStatus: 'approved_for_execution',
            validationStatus: 'validado',
            approvedBy: confirmation.userId,
            approvedRole: confirmation.activeRole,
            approvedAt: confirmedAt,
            writePlanId: id
          })
        });
        var rollback = buildRollback(id, op);
        if (rollback) rollbackPlan.push(rollback);
      } else {
        omissions.push({
          action: 'omit',
          targetId: op.targetId || '',
          sourceRecordId: op.sourceRecordId || '',
          reason: op.reason || 'duplicado'
        });
      }
      auditEntries.push(buildAudit(id, op, confirmation, confirmedAt));
    });

    return {
      ok: true,
      version: VERSION,
      planId: id,
      tenantId: tenant.tenantId,
      targetCollection: TARGET_COLLECTION,
      readyForExecutor: true,
      writeExecuted: false,
      approvedBy: confirmation.userId,
      approvedRole: confirmation.activeRole,
      approvedAt: confirmedAt,
      reason: confirmation.reason,
      operations: creates,
      omissions: omissions,
      auditEntries: auditEntries,
      rollbackPlan: rollbackPlan,
      executorRequirements: {
        orbitStoreOnly: true,
        beforeAfterAudit: true,
        idempotencyRequired: true,
        rollbackRequired: true,
        productBackendRequired: true
      }
    };
  }

  window.Orbit.financieroHistoricoFinmovsWritePlanP0 = Object.freeze({
    VERSION: VERSION,
    TARGET_COLLECTION: TARGET_COLLECTION,
    CONFIRMATION_PHRASE: CONFIRMATION_PHRASE,
    DEFAULT_APPROVER_ROLES: DEFAULT_APPROVER_ROLES,
    allowedRoles: allowedRoles,
    validateProposal: validateProposal,
    validateConfirmation: validateConfirmation,
    buildPlan: buildPlan
  });
})();
