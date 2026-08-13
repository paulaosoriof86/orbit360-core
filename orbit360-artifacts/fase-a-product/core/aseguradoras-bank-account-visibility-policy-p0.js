/* ============================================================
   Orbit 360 · Corrección canónica P0 — cuentas bancarias
   Fecha: 2026-07-13

   Las cuentas bancarias de aseguradoras son información operativa
   para orientar pagos de clientes. No son credenciales secretas.
   Esta política prevalece sobre contratos/catálogos anteriores que
   las hayan restringido para Operativo o Asesor.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-correction-20260713';
  var MODULE = 'aseguradoras';
  var BANK_COLLECTION = 'cuentasBancariasAseguradora';
  var PLATFORM_CREDENTIAL_ROLES = Object.freeze([
    'Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo'
  ]);
  var PRIVILEGED_EDIT_ROLES = Object.freeze([
    'Dirección', 'SuperAdmin', 'AdminTenant', 'Admin'
  ]);
  var BANK_FIELDS = Object.freeze([
    'banco', 'tipoCuenta', 'tipo', 'moneda', 'titular', 'numero',
    'numeroCuenta', 'uso', 'linkPago', 'ultimaVerificacion'
  ]);

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

  function normalizeMembership(input) {
    input = input || {};
    var roles = unique(input.roles || input.rolesAsignados || (input.rol ? [input.rol] : []));
    var activeRole = text(input.activeRole || input.rolActivo || input.defaultRole || input.rolDefault || roles[0]);
    return {
      tenantId: text(input.tenantId || input.tenant),
      status: text(input.status || input.estado || 'inactive').toLowerCase(),
      roles: roles,
      activeRole: activeRole,
      modulesVisible: unique(input.modulesVisible || input.modulosVisibles || []),
      modulesExtra: unique(input.modulesExtra || input.modulosExtra || input.permisosExtra || []),
      modulesRestricted: unique(input.modulesRestricted || input.modulosRestringidos || input.restricciones || []),
      permissionsExtra: unique(input.permissionsExtra || input.permisosExtra || []),
      restrictions: unique(input.restrictions || input.restricciones || [])
    };
  }

  function activeMembership(input) {
    var membership = normalizeMembership(input);
    return membership.status === 'active' && membership.roles.indexOf(membership.activeRole) >= 0;
  }

  function moduleVisible(input, context) {
    var membership = normalizeMembership(input);
    if (!activeMembership(membership)) return false;
    if (membership.modulesRestricted.indexOf(MODULE) >= 0) return false;
    if (context && typeof context.moduleVisible === 'function') {
      return context.moduleVisible(membership, MODULE) === true;
    }
    if (PRIVILEGED_EDIT_ROLES.indexOf(membership.activeRole) >= 0) return true;
    return membership.modulesVisible.indexOf('*') >= 0 ||
      membership.modulesVisible.indexOf(MODULE) >= 0 ||
      membership.modulesExtra.indexOf(MODULE) >= 0;
  }

  function canReadBankAccounts(input, context) {
    var membership = normalizeMembership(input);
    var allowed = moduleVisible(membership, context);
    return {
      ok: allowed,
      allowed: allowed,
      writeAuthorized: false,
      collection: BANK_COLLECTION,
      module: MODULE,
      reason: allowed ? 'cuentas_bancarias_operativas_visibles' : 'modulo_aseguradoras_no_visible',
      fullAccountNumberVisible: allowed,
      copyAllowed: allowed,
      fields: BANK_FIELDS.slice()
    };
  }

  function canCopyBankAccounts(input, context) {
    return canReadBankAccounts(input, context);
  }

  function canEditBankAccounts(input, context) {
    var membership = normalizeMembership(input);
    var visible = moduleVisible(membership, context);
    var restricted = membership.restrictions.indexOf('aseguradoras_bancos_editar') >= 0;
    var explicit = membership.permissionsExtra.indexOf('aseguradoras_bancos_editar') >= 0;
    var privileged = PRIVILEGED_EDIT_ROLES.indexOf(membership.activeRole) >= 0;
    var allowed = visible && !restricted && (privileged || explicit);
    return {
      ok: allowed,
      allowed: allowed,
      writeAuthorized: false,
      reason: !visible ? 'modulo_aseguradoras_no_visible' :
        restricted ? 'edicion_bancos_restringida' :
        allowed ? 'edicion_bancos_permitida' : 'edicion_bancos_no_asignada'
    };
  }

  function canViewPlatformCredentials(input, context) {
    var membership = normalizeMembership(input);
    var visible = moduleVisible(membership, context);
    var restricted = membership.restrictions.indexOf('aseguradoras_plataformas_credenciales') >= 0;
    var explicit = membership.permissionsExtra.indexOf('aseguradoras_plataformas_credenciales') >= 0;
    var roleAllowed = PLATFORM_CREDENTIAL_ROLES.indexOf(membership.activeRole) >= 0;
    var allowed = visible && !restricted && (roleAllowed || explicit);
    return {
      ok: allowed,
      allowed: allowed,
      writeAuthorized: false,
      providerRequired: true,
      temporaryRevealRequired: true,
      reason: allowed ? 'credenciales_plataforma_permitidas' : 'credenciales_plataforma_restringidas'
    };
  }

  var COLLECTION_POLICY_OVERRIDE = Object.freeze({
    cuentasBancariasAseguradora: Object.freeze({
      module: MODULE,
      scoped: false,
      advisorRead: true,
      advisorWrite: false,
      operationalReadForModuleUsers: true,
      fullAccountNumberVisible: true,
      copyAllowed: true,
      editPermissionSeparate: true
    })
  });

  window.Orbit.aseguradorasBankAccountVisibilityPolicyP0 = Object.freeze({
    VERSION: VERSION,
    MODULE: MODULE,
    BANK_COLLECTION: BANK_COLLECTION,
    BANK_FIELDS: BANK_FIELDS,
    PLATFORM_CREDENTIAL_ROLES: PLATFORM_CREDENTIAL_ROLES,
    COLLECTION_POLICY_OVERRIDE: COLLECTION_POLICY_OVERRIDE,
    normalizeMembership: normalizeMembership,
    activeMembership: activeMembership,
    moduleVisible: moduleVisible,
    canReadBankAccounts: canReadBankAccounts,
    canCopyBankAccounts: canCopyBankAccounts,
    canEditBankAccounts: canEditBankAccounts,
    canViewPlatformCredentials: canViewPlatformCredentials
  });
})();
