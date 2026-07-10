/* ============================================================
   Orbit 360 · Aseguradoras P0.2 · Accesos y cuentas sensibles
   Fecha: 2026-07-10

   Contrato puro/reusable. No persiste secretos, no depende de Firebase,
   no reemplaza Orbit.store y no registra valores sensibles en auditoría.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var AUTHORIZED_VIEW_ROLES = [
    'superadmin', 'super_admin', 'direccion', 'admin', 'admintenant',
    'admin_tenant', 'operativo'
  ];
  var AUTHORIZED_EDIT_ROLES = [
    'superadmin', 'super_admin', 'direccion', 'admin', 'admintenant',
    'admin_tenant'
  ];
  var FORBIDDEN_AUDIT_KEYS = [
    'value', 'valor', 'secret', 'secreto', 'password', 'pass', 'contrasena',
    'contraseña', 'token', 'clipboard', 'numero', 'numeroCuenta', 'accountNumber'
  ];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalize(value) {
    return clean(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function unique(values) {
    return Array.from(new Set((values || []).map(normalize).filter(Boolean)));
  }

  function currentActor(explicitActor) {
    var actor = explicitActor || {};
    var authUser = {};
    try {
      authUser = window.Orbit.auth && typeof window.Orbit.auth.user === 'function'
        ? (window.Orbit.auth.user() || {}) : {};
    } catch (e) {}
    var activeRole = '';
    try {
      activeRole = window.Orbit.session && typeof window.Orbit.session.rol === 'function'
        ? window.Orbit.session.rol() : '';
    } catch (e) {}
    var roles = [];
    roles = roles.concat(actor.roles || [], authUser.roles || []);
    roles.push(actor.activeRole, actor.rol, actor.role, activeRole, authUser.rol, authUser.role);
    return {
      id: clean(actor.id || actor.uid || authUser.id || authUser.uid),
      email: clean(actor.email || actor.correo || authUser.email || authUser.correo),
      nombre: clean(actor.nombre || actor.name || authUser.nombre || authUser.name),
      activeRole: clean(actor.activeRole || activeRole || actor.rol || authUser.rol),
      roles: unique(roles)
    };
  }

  function roleAllowed(actor, allowedRoles) {
    var a = currentActor(actor);
    return a.roles.some(function (role) { return allowedRoles.indexOf(role) >= 0; });
  }

  function canViewSensitive(actor) {
    return roleAllowed(actor, AUTHORIZED_VIEW_ROLES);
  }

  function canEditSensitive(actor) {
    return roleAllowed(actor, AUTHORIZED_EDIT_ROLES);
  }

  function maskSecret(value) {
    var text = clean(value);
    if (!text) return '';
    return '••••••••••••';
  }

  function maskAccount(value) {
    var text = clean(value).replace(/\s+/g, '');
    if (!text) return '';
    var suffix = text.slice(-4);
    return '•••• ' + suffix;
  }

  function safeMetadata(input) {
    var source = input || {};
    var out = {};
    Object.keys(source).forEach(function (key) {
      var normalizedKey = normalize(key);
      if (FORBIDDEN_AUDIT_KEYS.some(function (blocked) { return normalize(blocked) === normalizedKey; })) return;
      var value = source[key];
      if (value == null) return;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out[key] = value;
    });
    return out;
  }

  function tenantId(explicitTenantId) {
    if (explicitTenantId) return clean(explicitTenantId);
    try {
      var tenant = window.Orbit.tenant && typeof window.Orbit.tenant.get === 'function'
        ? (window.Orbit.tenant.get() || {}) : (window.Orbit.tenant || {});
      return clean(tenant.id || tenant.tenantId || tenant.slug || tenant.empresa || 'tenant_actual');
    } catch (e) { return 'tenant_actual'; }
  }

  function buildAuditEvent(input) {
    input = input || {};
    var actor = currentActor(input.actor);
    return {
      id: clean(input.id) || 'audit_asg_sensitive_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      fecha: clean(input.fecha) || new Date().toISOString(),
      tenantId: tenantId(input.tenantId),
      modulo: 'aseguradoras',
      categoria: 'dato_sensible',
      accion: clean(input.action || input.accion),
      recursoTipo: clean(input.resourceType || input.recursoTipo),
      recursoId: clean(input.resourceId || input.recursoId),
      aseguradoraId: clean(input.aseguradoraId),
      campo: clean(input.field || input.campo),
      resultado: clean(input.result || input.resultado || 'solicitado'),
      motivo: clean(input.reason || input.motivo),
      actorId: actor.id,
      actorEmail: actor.email,
      actorNombre: actor.nombre,
      rolActivo: actor.activeRole,
      metadata: safeMetadata(input.metadata),
      contieneValorSensible: false
    };
  }

  function writeAudit(store, eventInput) {
    var event = eventInput && eventInput.modulo ? eventInput : buildAuditEvent(eventInput);
    try {
      if (store && typeof store.insert === 'function') store.insert('auditoria', event);
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('orbit:audit', { detail: event }));
    } catch (e) {}
    return event;
  }

  function normalizePortal(portal) {
    portal = portal || {};
    return {
      id: clean(portal.id),
      nombre: clean(portal.nombre || portal.name || 'Portal'),
      url: clean(portal.url),
      usuario: clean(portal.usuario || portal.user),
      credentialRef: clean(portal.credentialRef || portal.secretRef),
      estadoCredencial: clean(portal.estadoCredencial || (portal.credentialRef ? 'registrada' : 'sin_credencial')),
      ultimaVerificacion: clean(portal.ultimaVerificacion),
      notas: clean(portal.notas)
    };
  }

  function normalizeAccount(account) {
    account = account || {};
    return {
      id: clean(account.id),
      banco: clean(account.banco),
      tipo: clean(account.tipo),
      titular: clean(account.titular),
      moneda: clean(account.moneda).toUpperCase(),
      pais: clean(account.pais).toUpperCase(),
      uso: clean(account.uso || account.referencia),
      numero: clean(account.numero),
      numeroRef: clean(account.numeroRef || account.accountRef),
      estado: clean(account.estado || 'activa')
    };
  }

  function providerMethod(provider, names) {
    for (var i = 0; i < names.length; i += 1) {
      if (provider && typeof provider[names[i]] === 'function') return provider[names[i]].bind(provider);
    }
    return null;
  }

  function activeProvider(explicitProvider) {
    if (explicitProvider) return explicitProvider;
    return window.OrbitSensitiveProvider || window.Orbit.secureSecrets || window.Orbit.secrets || null;
  }

  async function requestCredential(input) {
    input = input || {};
    var actor = currentActor(input.actor);
    var store = input.store || window.Orbit.store;
    var baseAudit = {
      tenantId: input.tenantId,
      aseguradoraId: input.aseguradoraId,
      resourceType: 'portal',
      resourceId: input.portalId,
      field: input.field || 'password',
      actor: actor,
      reason: input.reason,
      metadata: { credentialRef: clean(input.credentialRef), channel: clean(input.channel || 'ui') }
    };
    if (!canViewSensitive(actor)) {
      writeAudit(store, Object.assign({}, baseAudit, { action: 'denegar_consulta_credencial', result: 'denegado' }));
      return { ok: false, code: 'FORBIDDEN_ROLE', value: '', message: 'Tu rol activo no permite consultar esta credencial.' };
    }
    var credentialRef = clean(input.credentialRef);
    if (!credentialRef) {
      writeAudit(store, Object.assign({}, baseAudit, { action: 'consultar_credencial', result: 'sin_referencia' }));
      return { ok: false, code: 'MISSING_REFERENCE', value: '', message: 'La credencial todavía no tiene referencia segura.' };
    }
    var provider = activeProvider(input.provider);
    var resolve = providerMethod(provider, ['resolveCredential', 'getCredential', 'getSecret', 'reveal']);
    if (!resolve) {
      writeAudit(store, Object.assign({}, baseAudit, { action: 'consultar_credencial', result: 'backend_no_conectado' }));
      return { ok: false, code: 'BACKEND_REQUIRED', value: '', message: 'Conexión segura pendiente. La credencial no está disponible en este entorno.' };
    }
    try {
      var response = await resolve({
        tenantId: tenantId(input.tenantId),
        aseguradoraId: clean(input.aseguradoraId),
        portalId: clean(input.portalId),
        credentialRef: credentialRef,
        field: clean(input.field || 'password'),
        actor: actor
      });
      var value = clean(response && response.value != null ? response.value : response);
      if (!value) throw new Error('EMPTY_SECRET');
      writeAudit(store, Object.assign({}, baseAudit, { action: 'consultar_credencial', result: 'autorizado' }));
      return { ok: true, code: 'OK', value: value, expiresAt: clean(response && response.expiresAt), message: '' };
    } catch (error) {
      writeAudit(store, Object.assign({}, baseAudit, { action: 'consultar_credencial', result: 'error_backend', metadata: { credentialRef: credentialRef, errorCode: clean(error && error.code) } }));
      return { ok: false, code: clean(error && error.code) || 'RESOLVE_FAILED', value: '', message: 'No fue posible consultar la credencial de forma segura.' };
    }
  }

  async function requestAccountNumber(input) {
    input = input || {};
    var actor = currentActor(input.actor);
    var store = input.store || window.Orbit.store;
    var account = normalizeAccount(input.account);
    var auditBase = {
      tenantId: input.tenantId,
      aseguradoraId: input.aseguradoraId,
      resourceType: 'cuenta_bancaria',
      resourceId: account.id || input.accountId,
      field: 'numero_cuenta',
      actor: actor,
      reason: input.reason,
      metadata: { banco: account.banco, moneda: account.moneda, pais: account.pais }
    };
    if (!canViewSensitive(actor)) {
      writeAudit(store, Object.assign({}, auditBase, { action: 'denegar_consulta_cuenta', result: 'denegado' }));
      return { ok: false, code: 'FORBIDDEN_ROLE', value: '', message: 'Tu rol activo no permite consultar esta cuenta.' };
    }
    if (account.numero) {
      writeAudit(store, Object.assign({}, auditBase, { action: 'consultar_cuenta', result: 'autorizado_store' }));
      return { ok: true, code: 'OK', value: account.numero, message: '' };
    }
    if (!account.numeroRef) {
      writeAudit(store, Object.assign({}, auditBase, { action: 'consultar_cuenta', result: 'sin_referencia' }));
      return { ok: false, code: 'MISSING_ACCOUNT', value: '', message: 'La cuenta no tiene número o referencia segura.' };
    }
    var provider = activeProvider(input.provider);
    var resolve = providerMethod(provider, ['resolveAccount', 'getAccountNumber', 'getSecret', 'reveal']);
    if (!resolve) {
      writeAudit(store, Object.assign({}, auditBase, { action: 'consultar_cuenta', result: 'backend_no_conectado' }));
      return { ok: false, code: 'BACKEND_REQUIRED', value: '', message: 'Conexión segura pendiente para esta cuenta.' };
    }
    try {
      var response = await resolve({
        tenantId: tenantId(input.tenantId),
        aseguradoraId: clean(input.aseguradoraId),
        accountId: account.id || clean(input.accountId),
        accountRef: account.numeroRef,
        actor: actor
      });
      var value = clean(response && response.value != null ? response.value : response);
      if (!value) throw new Error('EMPTY_ACCOUNT');
      writeAudit(store, Object.assign({}, auditBase, { action: 'consultar_cuenta', result: 'autorizado' }));
      return { ok: true, code: 'OK', value: value, message: '' };
    } catch (error) {
      writeAudit(store, Object.assign({}, auditBase, { action: 'consultar_cuenta', result: 'error_backend', metadata: { banco: account.banco, errorCode: clean(error && error.code) } }));
      return { ok: false, code: clean(error && error.code) || 'RESOLVE_FAILED', value: '', message: 'No fue posible consultar la cuenta de forma segura.' };
    }
  }

  async function copySensitive(input) {
    input = input || {};
    var value = clean(input.value);
    if (!value) return { ok: false, code: 'EMPTY_VALUE' };
    var copied = false;
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (e) {}
    if (!copied && typeof input.copyFallback === 'function') copied = input.copyFallback(value) !== false;
    writeAudit(input.store || window.Orbit.store, {
      tenantId: input.tenantId,
      aseguradoraId: input.aseguradoraId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      field: input.field,
      actor: input.actor,
      reason: input.reason,
      action: 'copiar_dato_sensible',
      result: copied ? 'copiado' : 'fallo_copia',
      metadata: safeMetadata(input.metadata)
    });
    return { ok: copied, code: copied ? 'OK' : 'COPY_FAILED' };
  }

  function credentialView(portal, actor) {
    var normalized = normalizePortal(portal);
    var allowed = canViewSensitive(actor);
    return {
      portal: normalized,
      allowed: allowed,
      status: normalized.credentialRef ? 'registrada' : 'sin_credencial',
      display: normalized.credentialRef ? '••••••••••••' : 'Sin credencial',
      canReveal: allowed && !!normalized.credentialRef,
      canCopyUser: allowed && !!normalized.usuario,
      canCopyPassword: allowed && !!normalized.credentialRef
    };
  }

  function accountView(account, actor) {
    var normalized = normalizeAccount(account);
    var allowed = canViewSensitive(actor);
    var hasValue = !!(normalized.numero || normalized.numeroRef);
    return {
      account: normalized,
      allowed: allowed,
      status: hasValue ? 'registrada' : 'sin_cuenta',
      display: normalized.numero ? maskAccount(normalized.numero) : (normalized.numeroRef ? '•••• cuenta protegida' : 'Sin número'),
      canReveal: allowed && hasValue,
      canCopy: allowed && hasValue
    };
  }

  function neutralSourceDraft(country) {
    var pais = clean(country).toUpperCase();
    return {
      nombre: 'Nueva fuente',
      tipoFuente: 'otro',
      pais: pais,
      moneda: pais === 'GT' ? 'GTQ' : (pais === 'CO' ? 'COP' : ''),
      version: 'v1',
      estado: 'inventario_fuentes',
      contieneTarifas: false,
      contieneReglasCalculo: false,
      contieneHojaSalida: false,
      contieneFormatoCotizacion: false,
      contieneAreaImpresion: false,
      usos: []
    };
  }

  window.Orbit.aseguradorasSensitiveP02 = {
    AUTHORIZED_VIEW_ROLES: AUTHORIZED_VIEW_ROLES.slice(),
    AUTHORIZED_EDIT_ROLES: AUTHORIZED_EDIT_ROLES.slice(),
    currentActor: currentActor,
    canViewSensitive: canViewSensitive,
    canEditSensitive: canEditSensitive,
    maskSecret: maskSecret,
    maskAccount: maskAccount,
    safeMetadata: safeMetadata,
    buildAuditEvent: buildAuditEvent,
    writeAudit: writeAudit,
    normalizePortal: normalizePortal,
    normalizeAccount: normalizeAccount,
    requestCredential: requestCredential,
    requestAccountNumber: requestAccountNumber,
    copySensitive: copySensitive,
    credentialView: credentialView,
    accountView: accountView,
    neutralSourceDraft: neutralSourceDraft
  };
})();
