/* ============================================================
   Orbit 360 · Aseguradoras P0.2 · Accesos y cuentas sensibles
   Fecha: 2026-07-10

   Contrato reusable. El rol ACTIVO gobierna la consulta; el backend
   seguro debe volver a validar. No persiste ni audita valores sensibles.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VIEW_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant', 'operativo'];
  var EDIT_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];
  var BLOCKED_METADATA = ['value', 'valor', 'password', 'pass', 'contrasena', 'token', 'secret', 'secreto', 'clipboard', 'numero', 'numero_cuenta', 'numerocuenta', 'accountnumber', 'account_number'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function unique(values) { return Array.from(new Set((values || []).map(norm).filter(Boolean))); }

  function runtimeIdentity() {
    var authUser = {}, activeRole = '', advisor = {};
    try { authUser = Orbit.auth && typeof Orbit.auth.user === 'function' ? (Orbit.auth.user() || {}) : {}; } catch (e) {}
    try { activeRole = Orbit.session && typeof Orbit.session.rol === 'function' ? Orbit.session.rol() : ''; } catch (e) {}
    try {
      var advisorId = Orbit.session && typeof Orbit.session.asesorId === 'function' ? Orbit.session.asesorId() : '';
      advisor = advisorId && Orbit.store && typeof Orbit.store.get === 'function' ? (Orbit.store.get('asesores', advisorId) || {}) : {};
    } catch (e) {}
    var assigned = [].concat(advisor.roles || [], authUser.roles || []);
    assigned.push(advisor.rol, advisor.role, authUser.rol, authUser.role);
    return {
      id: clean(authUser.id || authUser.uid || advisor.id),
      email: clean(authUser.email || authUser.correo || advisor.email || advisor.correo),
      nombre: clean(authUser.nombre || authUser.name || advisor.nombre || advisor.name),
      activeRole: clean(activeRole || authUser.activeRole || advisor.rol || authUser.rol),
      assignedRoles: unique(assigned)
    };
  }

  function currentActor(explicit) {
    var hasExplicit = explicit && Object.keys(explicit).length > 0;
    if (!hasExplicit) return runtimeIdentity();
    var assigned = [].concat(explicit.roles || []);
    assigned.push(explicit.rol, explicit.role);
    var active = clean(explicit.activeRole || explicit.rol || explicit.role || (explicit.roles && explicit.roles[0]));
    return {
      id: clean(explicit.id || explicit.uid),
      email: clean(explicit.email || explicit.correo),
      nombre: clean(explicit.nombre || explicit.name),
      activeRole: active,
      assignedRoles: unique(assigned)
    };
  }

  function roleAllowed(actor, allowed) {
    var identity = currentActor(actor);
    var active = norm(identity.activeRole);
    if (!active) return false;
    if (identity.assignedRoles.length && identity.assignedRoles.indexOf(active) < 0) return false;
    return allowed.indexOf(active) >= 0;
  }
  function canViewSensitive(actor) { return roleAllowed(actor, VIEW_ROLES); }
  function canEditSensitive(actor) { return roleAllowed(actor, EDIT_ROLES); }
  function maskSecret(value) { return clean(value) ? '••••••••••••' : ''; }
  function maskAccount(value) { var text = clean(value).replace(/\s+/g, ''); return text ? '•••• ' + text.slice(-4) : ''; }

  function isBlockedMetadataKey(key) {
    var normalized = norm(key);
    return BLOCKED_METADATA.some(function (blocked) {
      return normalized === blocked || normalized.indexOf(blocked + '_') === 0 || normalized.endsWith('_' + blocked);
    });
  }
  function safeMetadata(input) {
    var source = input || {}, out = {};
    Object.keys(source).forEach(function (key) {
      if (isBlockedMetadataKey(key)) return;
      var value = source[key];
      if (value != null && ['string', 'number', 'boolean'].indexOf(typeof value) >= 0) out[key] = value;
    });
    return out;
  }

  function tenantId(explicit) {
    if (explicit) return clean(explicit);
    try {
      var tenant = Orbit.tenant && typeof Orbit.tenant.get === 'function' ? (Orbit.tenant.get() || {}) : (Orbit.tenant || {});
      return clean(tenant.id || tenant.tenantId || tenant.slug || tenant.empresa || 'tenant_actual');
    } catch (e) { return 'tenant_actual'; }
  }

  function buildAuditEvent(input) {
    input = input || {};
    var actor = currentActor(input.actor);
    return {
      id: clean(input.id) || 'audit_asg_sensitive_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      fecha: clean(input.fecha) || new Date().toISOString(), tenantId: tenantId(input.tenantId),
      modulo: 'aseguradoras', categoria: 'dato_sensible', accion: clean(input.action || input.accion),
      recursoTipo: clean(input.resourceType || input.recursoTipo), recursoId: clean(input.resourceId || input.recursoId),
      aseguradoraId: clean(input.aseguradoraId), campo: clean(input.field || input.campo),
      resultado: clean(input.result || input.resultado || 'solicitado'), motivo: clean(input.reason || input.motivo),
      actorId: actor.id, actorEmail: actor.email, actorNombre: actor.nombre,
      rolActivo: actor.activeRole, rolesAsignados: actor.assignedRoles.slice(),
      metadata: safeMetadata(input.metadata), contieneValorSensible: false
    };
  }
  function writeAudit(store, input) {
    var event = input && input.modulo ? input : buildAuditEvent(input);
    try { if (store && typeof store.insert === 'function') store.insert('auditoria', event); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('orbit:audit', { detail: event })); } catch (e) {}
    return event;
  }

  function normalizePortal(portal) {
    portal = portal || {};
    return {
      id: clean(portal.id), nombre: clean(portal.nombre || portal.name || 'Portal'), url: clean(portal.url),
      usuario: clean(portal.usuario || portal.user), credentialRef: clean(portal.credentialRef || portal.secretRef),
      estadoCredencial: clean(portal.estadoCredencial || (portal.credentialRef ? 'registrada' : 'sin_credencial')),
      ultimaVerificacion: clean(portal.ultimaVerificacion), notas: clean(portal.notas)
    };
  }
  function normalizeAccount(account) {
    account = account || {};
    return {
      id: clean(account.id), banco: clean(account.banco), tipo: clean(account.tipo), titular: clean(account.titular),
      moneda: clean(account.moneda).toUpperCase(), pais: clean(account.pais).toUpperCase(),
      uso: clean(account.uso || account.referencia), numero: clean(account.numero),
      numeroRef: clean(account.numeroRef || account.accountRef), estado: clean(account.estado || 'activa')
    };
  }

  function secureProvider(explicit) { return explicit || window.OrbitSensitiveProvider || Orbit.secureSecrets || Orbit.secrets || null; }
  function providerMethod(source, names) {
    for (var i = 0; i < names.length; i += 1) if (source && typeof source[names[i]] === 'function') return source[names[i]].bind(source);
    return null;
  }
  function baseAudit(input, actor, type, id, field) {
    return { tenantId: input.tenantId, aseguradoraId: input.aseguradoraId, resourceType: type, resourceId: id, field: field, actor: actor, reason: input.reason, metadata: safeMetadata(input.metadata) };
  }

  async function requestCredential(input) {
    input = input || {};
    var actor = currentActor(input.actor), store = input.store || Orbit.store, ref = clean(input.credentialRef);
    var base = baseAudit(input, actor, 'portal', clean(input.portalId), clean(input.field || 'password'));
    base.metadata = safeMetadata(Object.assign({}, input.metadata || {}, { credentialRef: ref, channel: clean(input.channel || 'ui') }));
    if (!canViewSensitive(actor)) {
      writeAudit(store, Object.assign({}, base, { action: 'denegar_consulta_credencial', result: 'denegado' }));
      return { ok: false, code: 'FORBIDDEN_ROLE', value: '', message: 'Tu rol activo no permite consultar esta credencial.' };
    }
    if (!ref) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_credencial', result: 'sin_referencia' }));
      return { ok: false, code: 'MISSING_REFERENCE', value: '', message: 'La credencial todavía no tiene referencia segura.' };
    }
    var resolve = providerMethod(secureProvider(input.provider), ['resolveCredential', 'getCredential', 'getSecret', 'reveal']);
    if (!resolve) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_credencial', result: 'backend_no_conectado' }));
      return { ok: false, code: 'BACKEND_REQUIRED', value: '', message: 'Conexión segura pendiente. La credencial no está disponible en este entorno.' };
    }
    try {
      var response = await resolve({ tenantId: tenantId(input.tenantId), aseguradoraId: clean(input.aseguradoraId), portalId: clean(input.portalId), credentialRef: ref, field: clean(input.field || 'password'), actor: actor });
      var value = clean(response && response.value != null ? response.value : response);
      if (!value) throw new Error('EMPTY_SECRET');
      writeAudit(store, Object.assign({}, base, { action: 'consultar_credencial', result: 'autorizado' }));
      return { ok: true, code: 'OK', value: value, expiresAt: clean(response && response.expiresAt), message: '' };
    } catch (error) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_credencial', result: 'error_backend', metadata: safeMetadata({ credentialRef: ref, errorCode: clean(error && error.code) }) }));
      return { ok: false, code: clean(error && error.code) || 'RESOLVE_FAILED', value: '', message: 'No fue posible consultar la credencial de forma segura.' };
    }
  }

  async function requestAccountNumber(input) {
    input = input || {};
    var actor = currentActor(input.actor), store = input.store || Orbit.store, account = normalizeAccount(input.account);
    var base = baseAudit(input, actor, 'cuenta_bancaria', account.id || clean(input.accountId), 'numero_cuenta');
    base.metadata = safeMetadata({ banco: account.banco, moneda: account.moneda, pais: account.pais });
    if (!canViewSensitive(actor)) {
      writeAudit(store, Object.assign({}, base, { action: 'denegar_consulta_cuenta', result: 'denegado' }));
      return { ok: false, code: 'FORBIDDEN_ROLE', value: '', message: 'Tu rol activo no permite consultar esta cuenta.' };
    }
    if (account.numero) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_cuenta', result: 'autorizado_store' }));
      return { ok: true, code: 'OK', value: account.numero, message: '' };
    }
    if (!account.numeroRef) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_cuenta', result: 'sin_referencia' }));
      return { ok: false, code: 'MISSING_ACCOUNT', value: '', message: 'La cuenta no tiene número o referencia segura.' };
    }
    var resolve = providerMethod(secureProvider(input.provider), ['resolveAccount', 'getAccountNumber', 'getSecret', 'reveal']);
    if (!resolve) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_cuenta', result: 'backend_no_conectado' }));
      return { ok: false, code: 'BACKEND_REQUIRED', value: '', message: 'Conexión segura pendiente para esta cuenta.' };
    }
    try {
      var response = await resolve({ tenantId: tenantId(input.tenantId), aseguradoraId: clean(input.aseguradoraId), accountId: account.id || clean(input.accountId), accountRef: account.numeroRef, actor: actor });
      var value = clean(response && response.value != null ? response.value : response);
      if (!value) throw new Error('EMPTY_ACCOUNT');
      writeAudit(store, Object.assign({}, base, { action: 'consultar_cuenta', result: 'autorizado' }));
      return { ok: true, code: 'OK', value: value, message: '' };
    } catch (error) {
      writeAudit(store, Object.assign({}, base, { action: 'consultar_cuenta', result: 'error_backend', metadata: safeMetadata({ banco: account.banco, errorCode: clean(error && error.code) }) }));
      return { ok: false, code: clean(error && error.code) || 'RESOLVE_FAILED', value: '', message: 'No fue posible consultar la cuenta de forma segura.' };
    }
  }

  async function copySensitive(input) {
    input = input || {};
    var actor = currentActor(input.actor), store = input.store || Orbit.store;
    var base = baseAudit(input, actor, clean(input.resourceType), clean(input.resourceId), clean(input.field));
    if (!canViewSensitive(actor)) {
      writeAudit(store, Object.assign({}, base, { action: 'denegar_copia_dato_sensible', result: 'denegado' }));
      return { ok: false, code: 'FORBIDDEN_ROLE' };
    }
    var value = clean(input.value), copied = false;
    if (!value) return { ok: false, code: 'EMPTY_VALUE' };
    try { if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { await navigator.clipboard.writeText(value); copied = true; } } catch (e) {}
    if (!copied && typeof input.copyFallback === 'function') copied = input.copyFallback(value) !== false;
    writeAudit(store, Object.assign({}, base, {
      action: 'copiar_dato_sensible', result: copied ? 'copiado' : 'fallo_copia',
      metadata: safeMetadata(input.metadata)
    }));
    return { ok: copied, code: copied ? 'OK' : 'COPY_FAILED' };
  }

  function credentialView(portal, actor) {
    var item = normalizePortal(portal), allowed = canViewSensitive(actor), exists = !!item.credentialRef;
    return { portal: item, allowed: allowed, status: exists ? 'registrada' : 'sin_credencial', display: allowed ? (exists ? '••••••••••••' : 'Sin credencial') : 'Acceso restringido', canReveal: allowed && exists, canCopyUser: allowed && !!item.usuario, canCopyPassword: allowed && exists };
  }
  function accountView(account, actor) {
    var item = normalizeAccount(account), allowed = canViewSensitive(actor), exists = !!(item.numero || item.numeroRef);
    return { account: item, allowed: allowed, status: exists ? 'registrada' : 'sin_cuenta', display: allowed ? (item.numero ? maskAccount(item.numero) : (item.numeroRef ? '•••• cuenta protegida' : 'Sin número')) : 'Acceso restringido', canReveal: allowed && exists, canCopy: allowed && exists };
  }
  function neutralSourceDraft(country) {
    var pais = clean(country).toUpperCase();
    return { nombre: 'Nueva fuente', tipoFuente: 'otro', pais: pais, moneda: pais === 'GT' ? 'GTQ' : (pais === 'CO' ? 'COP' : ''), version: 'v1', estado: 'inventario_fuentes', contieneTarifas: false, contieneReglasCalculo: false, contieneHojaSalida: false, contieneFormatoCotizacion: false, contieneAreaImpresion: false, usos: [] };
  }

  Orbit.aseguradorasSensitiveP02 = {
    AUTHORIZED_VIEW_ROLES: VIEW_ROLES.slice(), AUTHORIZED_EDIT_ROLES: EDIT_ROLES.slice(),
    currentActor: currentActor, canViewSensitive: canViewSensitive, canEditSensitive: canEditSensitive,
    maskSecret: maskSecret, maskAccount: maskAccount, safeMetadata: safeMetadata,
    buildAuditEvent: buildAuditEvent, writeAudit: writeAudit,
    normalizePortal: normalizePortal, normalizeAccount: normalizeAccount,
    requestCredential: requestCredential, requestAccountNumber: requestAccountNumber,
    copySensitive: copySensitive, credentialView: credentialView, accountView: accountView,
    neutralSourceDraft: neutralSourceDraft
  };
})();
