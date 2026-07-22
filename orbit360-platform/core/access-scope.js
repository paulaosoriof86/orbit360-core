/* Orbit 360 · core/access-scope.js
   MOTOR ÚNICO de acceso. Contrato canónico = Orbit.access.
   Orbit.accessScope expone compatibilidad legacy sobre el mismo motor.

   No implementa Auth ni backend. Envuelve Orbit.session / Orbit.auth /
   Orbit.tenant / Orbit.ROLES / Orbit.store. Fail-closed ante identidad,
   módulo, país, scope o relación no resolubles. */
window.Orbit = window.Orbit || {};
Orbit.access = (function () {
  var ALL_ROLES = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin'];
  var TEAM_ROLES = ['Operativo', 'Finanzas', 'Marketing'];
  var OWN_ROLES = ['Asesor', 'Asesora', 'Asesor Sr.', 'Asesora Sr.', 'Asesor Jr.', 'Asesora Jr.', 'Comercial', 'Asistente'];
  var SENSITIVE = ['auditLog', 'auditoria', 'historialInterno', 'credenciales', 'secretos'];
  var OP_COLLS = {
    clientes: 'cliente360', polizas: 'polizas', vehiculos: 'polizas',
    cobros: 'cobros', renovaciones: 'renovaciones', reclamos: 'siniestros',
    siniestros: 'siniestros', comisiones: 'comisiones', negocios: 'negocios',
    gestiones: 'ops', actividades: 'cliente360', parchesPendientes: 'ops',
    correos: 'correo'
  };
  var SCOPE_LEVEL = { none: 0, own: 1, team: 2, all: 3 };

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function nowISO() { return new Date().toISOString(); }
  function today() {
    try { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : nowISO().slice(0, 10); }
    catch (e) { return nowISO().slice(0, 10); }
  }
  function S() { return Orbit.store; }

  function activeRole() {
    try { if (Orbit.session && Orbit.session.rol) return clean(Orbit.session.rol()); } catch (e) {}
    try { var u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return clean(u && u.rol); } catch (e) {}
    return '';
  }
  function rolActivo() { return activeRole(); }
  function actorAdvisorId() {
    try { return clean(Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId()); } catch (e) { return ''; }
  }
  function assignedRoles() {
    try {
      var r = Orbit.session && Orbit.session.rolesAsignados && Orbit.session.rolesAsignados();
      return Array.isArray(r) ? r.slice() : [];
    } catch (e) { return []; }
  }
  function roleIsAssigned() {
    var list = assignedRoles(), role = activeRole();
    return !list.length || list.indexOf(role) >= 0;
  }
  function esAsesor() { return OWN_ROLES.indexOf(activeRole()) >= 0 || /Asesor/i.test(activeRole()); }
  function actorAdvisor() {
    var id = actorAdvisorId();
    try { return id && S() && S().get ? (S().get('asesores', id) || {}) : {}; } catch (e) { return {}; }
  }
  function actorUser() {
    var au = null, advisor = actorAdvisor(), advisorId = actorAdvisorId();
    try { au = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); } catch (e) {}
    if (!au && !advisorId && !Object.keys(advisor || {}).length) return null;
    return {
      id: clean((au && (au.uid || au.id || au.email)) || advisor.id || advisorId),
      nombre: clean((au && (au.nombre || au.email)) || advisor.nombre || 'Usuario'),
      email: clean((au && au.email) || advisor.email),
      rolActivo: activeRole(),
      asesorId: advisorId || clean(advisor.id)
    };
  }

  function tenantConfig() {
    try { return Orbit.tenant && Orbit.tenant.get ? (Orbit.tenant.get() || {}) : {}; } catch (e) { return {}; }
  }
  function tenantId() {
    var cfg = tenantConfig();
    try {
      return clean(
        (Orbit.tenant && (Orbit.tenant.id || Orbit.tenant.tenantId)) ||
        cfg.tenantId || cfg.id || cfg.slug ||
        (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant))
      );
    } catch (e) { return clean(cfg.tenantId || cfg.id || cfg.slug); }
  }
  function countryConfig(pais) {
    var cfg = tenantConfig(), own = null, global = {};
    try { own = cfg.paisesCfg && cfg.paisesCfg[pais]; } catch (e) {}
    try { global = Orbit.paisCfg ? (Orbit.paisCfg(pais) || {}) : {}; } catch (e) {}
    return Object.assign({}, global || {}, own || {});
  }
  function currencyFor(pais) {
    var pc = countryConfig(pais);
    if (pc.moneda) return pc.moneda;
    try {
      var p = (Orbit.PAISES || []).find(function (x) { return x.id === pais; });
      return clean(p && p.moneda);
    } catch (e) { return ''; }
  }

  function normalizeScope(v) {
    var s = norm(v);
    if (['todos', 'todo', 'all', 'global'].indexOf(s) >= 0) return 'all';
    if (['equipo', 'team'].indexOf(s) >= 0) return 'team';
    if (['propios', 'propio', 'propia', 'own', 'mios'].indexOf(s) >= 0) return 'own';
    if (['ninguno', 'none', 'sinacceso'].indexOf(s) >= 0) return 'none';
    return '';
  }
  function scopeLevel(scope) {
    var normalized = normalizeScope(scope);
    return Object.prototype.hasOwnProperty.call(SCOPE_LEVEL, normalized) ? SCOPE_LEVEL[normalized] : 0;
  }
  function roleScopeCeiling(moduleKey) {
    var role = activeRole();
    try {
      var def = Orbit.ROLES && Orbit.ROLES[role];
      if (def && def.scopes && def.scopes[moduleKey] != null) {
        var fromRole = normalizeScope(def.scopes[moduleKey]);
        if (fromRole) return fromRole;
      }
    } catch (e) {}
    if (ALL_ROLES.indexOf(role) >= 0) return 'all';
    if (TEAM_ROLES.indexOf(role) >= 0) return 'team';
    if (OWN_ROLES.indexOf(role) >= 0 || /Asesor/i.test(role)) return 'own';
    return 'none';
  }
  function applyRoleScopeCeiling(requestedScope, moduleKey) {
    var requested = normalizeScope(requestedScope);
    var ceiling = roleScopeCeiling(moduleKey);
    if (!requested) return ceiling;
    return scopeLevel(requested) <= scopeLevel(ceiling) ? requested : ceiling;
  }
  function explicitScope(moduleKey) {
    var a = actorAdvisor(), src, v;
    if (!a) return '';
    try {
      if (a.dataScopes) {
        if (a.dataScopes.modules && a.dataScopes.modules[moduleKey] != null) return a.dataScopes.modules[moduleKey];
        if (a.dataScopes.default != null) return a.dataScopes.default;
      }
      src = [a.scopes, a.scope, a.scopeDatos, a.alcanceDatos, a.dataScope];
      for (var i = 0; i < src.length; i++) {
        if (!src[i]) continue;
        if (typeof src[i] === 'string') return src[i];
        if (typeof src[i] === 'object') {
          v = src[i][moduleKey] || src[i]['*'] || src[i].default;
          if (v != null) return v;
        }
      }
    } catch (e) {}
    return '';
  }
  function dataScope(moduleKey) {
    if (!roleIsAssigned()) return 'none';
    var a = actorAdvisor();
    if (a && (a.inactivo || a.status === 'blocked' || a.status === 'suspended')) return 'none';
    var ex = normalizeScope(explicitScope(moduleKey));
    return applyRoleScopeCeiling(ex, moduleKey);
  }
  function scopeCanon(moduleKey) { return dataScope(moduleKey); }
  function scopeUI(moduleKey) {
    return { own: 'propia', team: 'equipo', all: 'todo', none: 'ninguno' }[dataScope(moduleKey)] || 'ninguno';
  }

  function permittedCountries() {
    var a = actorAdvisor();
    return [].concat(a.countries || a.paises || a.paisesAutorizados || []).map(clean).filter(Boolean);
  }
  function countryAllowed(record) {
    var allowed = permittedCountries();
    if (!allowed.length) return true;
    var pais = clean(record && record.pais);
    return !pais || allowed.indexOf(pais) >= 0;
  }
  function teamAdvisorIds() {
    var a = actorAdvisor(), own = actorAdvisorId(), out = new Set(own ? [own] : []);
    [].concat(a.equipoAsesorIds || a.teamAdvisorIds || a.asesoresEquipo || []).forEach(function (x) { if (x) out.add(String(x)); });
    var teamId = clean(a.equipoId || a.teamId || '');
    try {
      (S().all('asesores') || []).forEach(function (x) {
        if (teamId && clean(x.equipoId || x.teamId) === teamId) out.add(String(x.id));
        if (clean(x.supervisorId) === own) out.add(String(x.id));
      });
    } catch (e) {}
    return Array.from(out);
  }
  function recordAdvisorId(collection, rec) {
    if (!rec) return '';
    if (rec.asesorId) return clean(rec.asesorId);
    var linked = null;
    try {
      if (rec.clienteId) linked = S().get('clientes', rec.clienteId);
      if (!linked && rec.polizaId) {
        var p = S().get('polizas', rec.polizaId);
        if (p && p.asesorId) return clean(p.asesorId);
        if (p && p.clienteId) linked = S().get('clientes', p.clienteId);
      }
      if (!linked && collection === 'clientes') linked = rec;
    } catch (e) {}
    return clean(linked && linked.asesorId);
  }

  function moduleLists(a) {
    return {
      extras: [].concat(a.modulesExtra || a.modulosExtra || a.modulosExtras || []),
      restricted: [].concat(a.modulesRestricted || a.modulosRestringidos || a.restriccionesModulos || [])
    };
  }
  function puedeVerModulo(moduleKey) {
    try {
      if (!roleIsAssigned()) return false;
      if (Orbit.tenant && Orbit.tenant.isActive && !Orbit.tenant.isActive(moduleKey)) return false;
      var a = actorAdvisor(), lists = moduleLists(a);
      if (lists.restricted.indexOf(moduleKey) >= 0) return false;
      var role = activeRole(), base = [];
      if (Orbit.ROLES && Orbit.ROLES[role]) base = Orbit.ROLES[role].modulos || Orbit.ROLES[role].modules || [];
      if (base.indexOf(moduleKey) >= 0 || lists.extras.indexOf(moduleKey) >= 0) return true;
      if (Orbit.session && Orbit.session.canSee) return !!Orbit.session.canSee(moduleKey);
      return dataScope(moduleKey) !== 'none';
    } catch (e) { return false; }
  }
  function hasExtra(key) {
    var a = actorAdvisor();
    return [].concat(a.permisosExtra || a.extras || []).indexOf(key) >= 0;
  }
  function isRestricted(key) {
    var a = actorAdvisor();
    return [].concat(a.restricciones || []).indexOf(key) >= 0;
  }
  function matrixPermission(moduleKey, action) {
    var role = activeRole(), cfg = tenantConfig(), P = cfg.permisosMatriz || cfg.matrizPermisos;
    try {
      if (P && P[role] && P[role][moduleKey] && P[role][moduleKey][action] != null) return !!P[role][moduleKey][action];
      var cat = Orbit.cat && Orbit.cat.all ? Orbit.cat.all() : {};
      var C = cat && cat.permisos;
      if (C && C[role] && C[role][moduleKey] && C[role][moduleKey][action] != null) return !!C[role][moduleKey][action];
    } catch (e) {}
    return null;
  }
  function can(moduleKey, action) {
    action = action || 'view';
    if (!puedeVerModulo(moduleKey)) return false;
    var full = moduleKey + '_' + action;
    if (isRestricted(moduleKey) || isRestricted(full) || isRestricted(action)) return false;
    if (hasExtra(full) || hasExtra(action) || hasExtra(moduleKey)) return true;
    var matrix = matrixPermission(moduleKey, action === 'create' ? 'editar' : action);
    if (matrix != null) return matrix;
    var role = activeRole();
    if (action === 'view' || action === 'read') return dataScope(moduleKey) !== 'none';
    if (ALL_ROLES.indexOf(role) >= 0) return true;
    if (role === 'Operativo') return ['edit', 'create', 'complete', 'manage_documents'].indexOf(action) >= 0;
    if (/Asesor/i.test(role) || role === 'Comercial') return action === 'complete';
    return false;
  }
  function puedeGestionar(nivelMin) {
    try {
      var def = Orbit.ROLES && Orbit.ROLES[activeRole()];
      return !!def && Number(def.nivel || 0) >= Number(nivelMin || 4);
    } catch (e) { return false; }
  }
  function esRestringidoCredenciales() {
    try { return Orbit.vault && Orbit.vault.isRestricted ? Orbit.vault.isRestricted() : esAsesor(); }
    catch (e) { return esAsesor(); }
  }

  function canAccessRecord(record, moduleKey, opts) {
    record = record || {}; opts = opts || {};
    try {
      if (!puedeVerModulo(moduleKey)) return false;
      if (!countryAllowed(Object.assign({}, record, { pais: opts.pais || record.pais }))) return false;
      var scope = dataScope(moduleKey);
      if (scope === 'none') return false;
      if (scope === 'all') return true;
      var collection = opts.collection || Object.keys(OP_COLLS).find(function (k) { return OP_COLLS[k] === moduleKey; }) || moduleKey;
      var advisorId = clean(opts.asesorId || recordAdvisorId(collection, record));
      if (!advisorId) return false;
      if (scope === 'own') return advisorId === actorAdvisorId();
      if (scope === 'team') return teamAdvisorIds().indexOf(advisorId) >= 0;
      return false;
    } catch (e) { return false; }
  }
  function puedeAccederRegistro(advisorId, moduleKey, opts) {
    opts = opts || {};
    return canAccessRecord({ asesorId: advisorId, pais: opts.pais }, moduleKey, opts);
  }
  function canView(collection, rec, moduleKey) {
    if (!rec) return false;
    if (SENSITIVE.indexOf(collection) >= 0 && ALL_ROLES.indexOf(activeRole()) < 0) return false;
    return canAccessRecord(rec, moduleKey || OP_COLLS[collection] || collection, { collection: collection });
  }
  function filter(collection, rows, moduleKey) {
    return (rows || []).filter(function (r) { return canView(collection, r, moduleKey); });
  }
  function filtrarPorAsesor(items, getAdvisorId, moduleKey) {
    return (items || []).filter(function (it) {
      var advisorId = '';
      try { advisorId = getAdvisorId ? getAdvisorId(it) : ''; } catch (e) {}
      return canAccessRecord(it, moduleKey, { asesorId: advisorId });
    });
  }

  function missingClientFields(c) {
    return ['identificacion', 'telefono', 'email', 'departamento', 'ciudad', 'direccion']
      .filter(function (k) { return !clean(c && c[k]); });
  }
  function deriveClientState(clientId) {
    var policies = [], cobros = [];
    try { policies = S().where('polizas', function (p) { return p.clienteId === clientId; }) || []; } catch (e) {}
    if (!policies.length) return 'pendiente_polizas';
    var active = policies.filter(function (p) { return ['vigente', 'porrenovar'].indexOf(norm(p.estado)) >= 0; });
    if (active.length) {
      var ids = new Set(active.map(function (p) { return p.id; }));
      try { cobros = S().all('cobros') || []; } catch (e) {}
      var overdue = cobros.some(function (c) { return ids.has(c.polizaId) && norm(c.estado) === 'vencido'; });
      return overdue ? 'activo_en_mora' : 'activo';
    }
    var recoverable = policies.some(function (p) {
      return ['cancelada', 'vencida', 'anulada', 'rechazada', 'norenovada'].indexOf(norm(p.estado)) >= 0;
    });
    return recoverable ? 'reactivable' : 'inactivo';
  }
  function projected(input) {
    try { return Orbit.clientProjection ? Orbit.clientProjection.project(input) : Object.assign({}, input || {}); }
    catch (e) { return Object.assign({}, input || {}); }
  }
  function duplicateCandidates(input) {
    input = projected(input || {});
    var clients = [];
    try { clients = S().all('clientes') || []; } catch (e) {}
    var idn = norm(input.identificacion), email = clean(input.email).toLowerCase();
    var tel = norm(input.telefono), name = norm(input.nombre), pais = clean(input.pais);
    var exact = [], probable = [];
    clients.forEach(function (raw) {
      if (input.id && raw.id === input.id) return;
      var c = projected(raw);
      var isExact = (idn && norm(c.identificacion) === idn) || (email && clean(c.email).toLowerCase() === email);
      if (isExact) { exact.push(raw.id); return; }
      var isProbable = name && norm(c.nombre) === name && (!pais || pais === clean(c.pais)) &&
        (!tel || !c.telefono || norm(c.telefono) === tel);
      if (isProbable) probable.push(raw.id);
    });
    return { exact: exact, probable: probable };
  }
  function prepareManual(collection, row, options) {
    options = options || {};
    var actor = actorUser() || {};
    var out = collection === 'clientes' ? projected(row || {}) : Object.assign({}, row || {});
    var alerts = [].concat((out.calidad && out.calidad.alertas) || []);
    out.tenantId = clean(out.tenantId || tenantId());
    out.pais = clean(out.pais || options.pais || '');
    out.moneda = clean(out.moneda || options.moneda || currencyFor(out.pais));
    out.fuente = 'ingreso_manual_plataforma';
    out.fuenteFecha = nowISO();
    out.creadoPor = clean(actor.id || actor.asesorId);
    out.creadoPorNombre = clean(actor.nombre);
    out.rolCreacion = clean(actor.rolActivo);
    out.asesorId = clean(out.asesorId || options.asesorId || actor.asesorId);
    out.trazabilidad = Object.assign({}, out.trazabilidad || {}, {
      origen: 'ingreso_manual_plataforma', actorId: actor.id || '', actorNombre: actor.nombre || '',
      rolActivo: actor.rolActivo || '', fecha: nowISO(), tenantId: out.tenantId
    });
    if (!out.tenantId) alerts.push('tenant_requiere_validacion');
    if (!out.pais) alerts.push('pais_requiere_validacion');
    if (!out.moneda) alerts.push('moneda_requiere_validacion');
    if (collection === 'clientes') {
      out.estadoOperativo = out.estadoOperativo || 'pendiente_polizas';
      out.estado = out.estado || out.estadoOperativo;
      missingClientFields(out).forEach(function (k) { alerts.push('falta_' + k); });
      if (!out.asesorId) alerts.push('asesor_requiere_validacion');
    }
    alerts = Array.from(new Set(alerts));
    out.requiereValidacion = !!alerts.length;
    out.calidad = Object.assign({}, out.calidad || {}, {
      alertas: alerts,
      estado: alerts.length ? 'REQUIERE_VALIDACION' : 'VALIDADO_EN_CAPTURA',
      actualizado: nowISO()
    });
    out._prepared = true;
    return out;
  }
  function audit(a, b, c, d, e, f, g) {
    var entry = (a && typeof a === 'object' && arguments.length === 1) ? Object.assign({}, a) : {
      accion: a, coleccion: b, registroId: c, antes: d, despues: e, motivo: f, detalle: Object.assign({}, g || {})
    };
    var actor = actorUser() || {};
    var row = Object.assign({
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tenantId: tenantId(), fecha: nowISO(), actor: actor
    }, entry);
    try { S().insert('auditLog', row); }
    catch (err) {
      try {
        S().insert('actividades', {
          id: row.id, tipo: 'admin', icon: '🧾', fecha: today(),
          titulo: 'Cambio registrado', detalle: clean(row.coleccion) + ' · ' + clean(row.accion), auditoriaRef: row.id
        });
      } catch (ignore) {}
    }
    return row;
  }
  function correction(a, b, c) {
    var entry = (a && typeof a === 'object' && arguments.length === 1) ? Object.assign({}, a) : {
      titulo: a || 'Corrección de datos', nota: b || '', refs: c || {}
    };
    var actor = actorUser() || {};
    var g = Object.assign({
      lista: 'Gestiones Admin', tipo: 'Corrección de datos',
      titulo: entry.titulo || entry.subject || 'Corrección de datos',
      nota: entry.nota || entry.detalle || '', estado: 'Pendiente', prioridad: 'Media',
      origen: 'Solicitud de corrección', asesorId: actor.asesorId || '',
      solicitadoPor: actor.nombre || '', tenantId: tenantId(), creado: today()
    }, entry.refs || {}, entry);
    try { if (Orbit.ciclo && Orbit.ciclo.crearGestion) return Orbit.ciclo.crearGestion(g); } catch (e) {}
    try {
      g.id = g.id || 'ges_' + Date.now().toString(36);
      S().insert('gestiones', g);
      return g;
    } catch (e) { return null; }
  }

  function scopedStore(moduleKey) {
    var base = S();
    if (!base) return base;
    var facade = Object.create(base);
    facade.all = function (collection) {
      var rows = base.all(collection) || [];
      return OP_COLLS[collection] ? filter(collection, rows, moduleKey || OP_COLLS[collection]) : rows;
    };
    facade.where = function (collection, predicate) { return facade.all(collection).filter(predicate); };
    facade.find = function (collection, predicate) { return facade.all(collection).find(predicate); };
    facade.get = function (collection, id) {
      var rec = base.get(collection, id);
      return !rec || !OP_COLLS[collection] || canView(collection, rec, moduleKey || OP_COLLS[collection]) ? rec : null;
    };
    facade.insert = function (collection, row) {
      if (OP_COLLS[collection] && !canAccessRecord(row || {}, moduleKey || OP_COLLS[collection], { collection: collection })) return null;
      return base.insert(collection, row);
    };
    facade.update = function (collection, id, patch) {
      var rec = base.get(collection, id);
      if (OP_COLLS[collection] && (!rec || !canAccessRecord(rec, moduleKey || OP_COLLS[collection], { collection: collection }))) return false;
      return base.update(collection, id, patch);
    };
    facade.remove = function (collection, id) {
      var rec = base.get(collection, id);
      if (OP_COLLS[collection] && (!rec || !canAccessRecord(rec, moduleKey || OP_COLLS[collection], { collection: collection }))) return false;
      return base.remove(collection, id);
    };
    facade._scopedFor = moduleKey || '';
    return facade;
  }
  function withScope(moduleKey, fn) {
    var base = Orbit.store, facade = scopedStore(moduleKey);
    Orbit.store = facade;
    try { return fn(facade, base); } finally { Orbit.store = base; }
  }

  return {
    activeRole: activeRole, rolActivo: rolActivo, esAsesor: esAsesor,
    actorAdvisorId: actorAdvisorId, actorUser: actorUser, actorAdvisor: actorAdvisor, assignedRoles: assignedRoles,
    tenantConfig: tenantConfig, tenantId: tenantId, countryConfig: countryConfig, currencyFor: currencyFor,
    dataScope: dataScope, scopeCanon: scopeCanon, scopeUI: scopeUI,
    roleScopeCeiling: roleScopeCeiling, applyRoleScopeCeiling: applyRoleScopeCeiling, scopeLevel: scopeLevel,
    recordAdvisorId: recordAdvisorId, teamAdvisorIds: teamAdvisorIds,
    puedeVerModulo: puedeVerModulo, can: can, puedeGestionar: puedeGestionar, esRestringidoCredenciales: esRestringidoCredenciales,
    filtrarPorAsesor: filtrarPorAsesor, canAccessRecord: canAccessRecord, puedeAccederRegistro: puedeAccederRegistro,
    canView: canView, filter: filter,
    missingClientFields: missingClientFields, deriveClientState: deriveClientState,
    duplicateCandidates: duplicateCandidates, prepareManual: prepareManual,
    audit: audit, correction: correction, scopedStore: scopedStore, withScope: withScope, norm: norm,
    __activeRoleScopeCeilingV20260721: true
  };
})();

Orbit.accessScope = (function () {
  var a = Orbit.access;
  return {
    rolActivo: a.rolActivo, esAsesor: a.esAsesor,
    dataScope: a.scopeUI,
    roleScopeCeiling: a.roleScopeCeiling,
    puedeVerModulo: a.puedeVerModulo, puedeGestionar: a.puedeGestionar,
    esRestringidoCredenciales: a.esRestringidoCredenciales,
    filtrarPorAsesor: a.filtrarPorAsesor,
    puedeAccederRegistro: a.puedeAccederRegistro,
    canAccessRecord: a.canAccessRecord,
    can: a.can
  };
})();
