/* Orbit 360 · core/access-scope.js
   MOTOR ÚNICO de acceso. Contrato conductual canónico = Orbit.access.
   Orbit.accessScope = alias/wrapper de COMPATIBILIDAD sobre el MISMO motor
   (mismos refs de función). No hay dos motores.

   No implementa Auth ni backend: envuelve Orbit.session/Orbit.auth/Orbit.ROLES/
   Orbit.tenant/Orbit.store. Todas las escrituras pasan SOLO por Orbit.store.
   Fail-closed real: identidad/sesión/errores no resolubles => DENIEGA. */
window.Orbit = window.Orbit || {};
Orbit.access = (function () {
  function nowISO() { return new Date().toISOString(); }

  /* ===================== IDENTIDAD Y SESIÓN ===================== */
  function rolActivo() {
    try { var r = (window.Orbit && Orbit.session && Orbit.session.rol) ? Orbit.session.rol() : ''; return r || ''; }
    catch (e) { return ''; }
  }
  function activeRole() { return rolActivo(); }
  function esAsesor() {
    try { return !!(window.Orbit && Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()); }
    catch (e) { return false; }
  }
  function actorAdvisorId() {
    try { return (window.Orbit && Orbit.session && Orbit.session.asesorId) ? Orbit.session.asesorId() : null; }
    catch (e) { return null; }
  }
  function assignedRoles() {
    try { return (Orbit.session && Orbit.session.rolesAsignados) ? Orbit.session.rolesAsignados() : null; }
    catch (e) { return null; }
  }
  // actorUser: combina identidad de Auth + registro de asesor (no reduce a uno solo).
  function actorUser() {
    var id = actorAdvisorId(), asesor = null, au = null;
    try { asesor = (id && Orbit.store) ? Orbit.store.get('asesores', id) : null; } catch (e) {}
    try { au = (window.Orbit && Orbit.auth && Orbit.auth.user) ? Orbit.auth.user() : null; } catch (e) {}
    if (!asesor && !au && !id) return null;
    return {
      id: (au && (au.uid || au.id || au.email)) || (asesor && asesor.id) || id || '',
      nombre: (asesor && asesor.nombre) || (au && au.nombre) || '',
      email: (au && au.email) || (asesor && asesor.email) || '',
      rolActivo: activeRole(),
      asesorId: id || (asesor && asesor.id) || ''
    };
  }

  /* ===================== TENANT / PAÍS / MONEDA ===================== */
  function tenantConfig() { try { return (Orbit.tenant && Orbit.tenant.get) ? Orbit.tenant.get() : {}; } catch (e) { return {}; } }
  function tenantId() { var t = tenantConfig(); return t.id || t.tenantId || t.slug || ''; }
  function countryConfig(pais) {
    var t = tenantConfig();
    var pc = (t.paisesCfg && t.paisesCfg[pais]) || null;
    if (pc) return pc;
    try { return (window.Orbit && Orbit.paisCfg) ? Orbit.paisCfg(pais) : null; } catch (e) { return null; }
  }
  // No inventar moneda fuera de configuración confiable.
  function currencyFor(pais) { var pc = countryConfig(pais); return (pc && pc.moneda) ? pc.moneda : ''; }

  /* ===================== ALCANCE DE DATOS ===================== */
  function normalizarScope(v) {
    return { own: 'propia', team: 'equipo', all: 'todo', none: 'ninguno', propios: 'propia', todos: 'todo' }[v] || v;
  }
  var UI2CANON = { propia: 'own', equipo: 'team', todo: 'all', ninguno: 'none' };
  // Acepta modelos modernos y legacy: dataScopes.modules[m] → dataScopes.default →
  // scope[m] → dataScope/scopeDatos/alcanceDatos → rol → fallback.
  function dataScope(modulo) {
    var asesorId = null, a = null;
    try {
      asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId();
      a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null;
    } catch (e) { return 'ninguno'; }
    try {
      if (window.Orbit && Orbit.store && asesorId && !a) return 'ninguno';
      if (a && (a.inactivo || a.status === 'blocked' || a.status === 'suspended')) return 'ninguno';
      if (a && a.countries && a.countries.length && window.Orbit && Orbit.pais && Orbit.pais !== 'TODOS' && a.countries.indexOf(Orbit.pais) < 0) return 'ninguno';
      if (a && a.dataScopes) {
        if (a.dataScopes.modules && a.dataScopes.modules[modulo] != null) return normalizarScope(a.dataScopes.modules[modulo]);
        if (a.dataScopes.default != null) return normalizarScope(a.dataScopes.default);
      }
      if (a && a.scopes && a.scopes[modulo] != null) return normalizarScope(a.scopes[modulo]);
      if (a && a.scope && typeof a.scope === 'object' && a.scope[modulo] != null) return normalizarScope(a.scope[modulo]);
      if (a && a.dataScope) return normalizarScope(a.dataScope);
      if (a && a.scopeDatos) return normalizarScope(a.scopeDatos);
      if (a && a.alcanceDatos) return normalizarScope(a.alcanceDatos);
      if (a && typeof a.scope === 'string') return normalizarScope(a.scope);
    } catch (e) { return 'ninguno'; }
    var rol = rolActivo();
    if (!rol) return 'ninguno';
    var def = Orbit.ROLES && Orbit.ROLES[rol];
    if (def && def.scopes && def.scopes[modulo]) return normalizarScope(def.scopes[modulo]);
    if (esAsesor()) return 'propia';
    return 'todo';
  }
  function scopeCanon(modulo) { return UI2CANON[dataScope(modulo)] || 'none'; }
  function scopeUI(modulo) { return dataScope(modulo); }

  /* ===================== ASESOR RELACIONADO ===================== */
  // Resuelve el asesor de un registro relacionado: asesorId → clienteId → polizaId(→cliente).
  function recordAdvisorId(collection, record) {
    if (!record) return null;
    if (record.asesorId) return record.asesorId;
    try {
      if (record.clienteId) { var c = Orbit.store.get('clientes', record.clienteId); if (c && c.asesorId) return c.asesorId; }
      if (record.polizaId) {
        var p = Orbit.store.get('polizas', record.polizaId);
        if (p) { if (p.asesorId) return p.asesorId; if (p.clienteId) { var c2 = Orbit.store.get('clientes', p.clienteId); if (c2 && c2.asesorId) return c2.asesorId; } }
      }
    } catch (e) {}
    return null;
  }
  function teamAdvisorIds() {
    try {
      var id = actorAdvisorId(); var mi = id ? Orbit.store.get('asesores', id) : null;
      if (!mi || !mi.teamId) return id ? [id] : [];
      return (Orbit.store.all('asesores') || []).filter(function (a) { return a.teamId === mi.teamId; }).map(function (a) { return a.id; });
    } catch (e) { return []; }
  }

  /* ===================== VISIBILIDAD Y PERMISOS ===================== */
  function puedeVerModulo(id) {
    try {
      if (window.Orbit && Orbit.tenant && Orbit.tenant.isActive && !Orbit.tenant.isActive(id)) return false;
      var asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId();
      var a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null;
      if (a && (a.modulesExtra || a.modulesRestricted)) {
        if ((a.modulesRestricted || []).indexOf(id) >= 0) return false;
        var rol = rolActivo();
        var base = (Orbit.ROLES && Orbit.ROLES[rol] && Orbit.ROLES[rol].modulos) || [];
        return base.indexOf(id) >= 0 || (a.modulesExtra || []).indexOf(id) >= 0;
      }
      return !(window.Orbit && Orbit.session && Orbit.session.canSee) || Orbit.session.canSee(id);
    } catch (e) { return false; }
  }
  function puedeGestionar(nivelMin) {
    var rol = rolActivo();
    var def = Orbit.ROLES && Orbit.ROLES[rol];
    var nivel = def ? def.nivel : 0;
    return nivel >= (nivelMin || 4);
  }
  function esRestringidoCredenciales() {
    try { return (window.Orbit && Orbit.vault && Orbit.vault.isRestricted) ? Orbit.vault.isRestricted() : esAsesor(); }
    catch (e) { return esAsesor(); }
  }
  /* can(module, action): evalúa en orden — restricciones → permisosExtra →
     matriz tenant por rol/módulo/acción → regla base del rol. La restricción SIEMPRE gana. */
  function can(module, action) {
    if (!puedeVerModulo(module)) return false;
    var act = action || 'view';
    var a = null; try { var id = actorAdvisorId(); a = (id && Orbit.store) ? Orbit.store.get('asesores', id) : null; } catch (e) {}
    var keyFull = module + '_' + act, keyAct = act;
    // 1. restricciones (gana sobre todo)
    if (a) { var restr = a.restricciones || []; if (restr.indexOf(keyFull) >= 0 || restr.indexOf(keyAct) >= 0) return false; }
    // 2. permisos extra
    if (a) { var ex = a.permisosExtra || []; if (ex.indexOf(keyFull) >= 0 || ex.indexOf(keyAct) >= 0) return true; }
    // 3. matriz de permisos por rol/módulo/acción (config tenant)
    try {
      var t = tenantConfig(); var m = t.permisosMatriz || t.matrizPermisos;
      if (m) { var rol = activeRole(); var v = m[rol] && m[rol][module] && m[rol][module][act]; if (v !== undefined) return !!v; }
    } catch (e) {}
    // 4. regla base del rol
    if (act === 'view' || act === 'read') return true;
    var sensibles = ['assign', 'reassign', 'delete', 'merge', 'approve', 'validate', 'reconcile', 'changeState'];
    if (sensibles.indexOf(act) >= 0) return puedeGestionar(4) && !esAsesor();
    return true;
  }

  /* ===================== GATES POR REGISTRO ===================== */
  function filtrarPorAsesor(items, getAsesorId, modulo) {
    var scope = dataScope(modulo);
    if (scope === 'ninguno') return [];
    if (scope === 'todo') return items;
    var misAsesorId = null;
    try { misAsesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); } catch (e) {}
    if (!misAsesorId) return [];
    if (scope === 'equipo') {
      var miTeam = null;
      try { var mi = Orbit.store.get('asesores', misAsesorId); miTeam = mi && mi.teamId; } catch (e) {}
      if (!miTeam) return items.filter(function (it) { return getAsesorId(it) === misAsesorId; });
      return items.filter(function (it) { var aid = getAsesorId(it); if (!aid) return false; try { var su = Orbit.store.get('asesores', aid); return su && su.teamId === miTeam; } catch (e) { return false; } });
    }
    return items.filter(function (it) { return getAsesorId(it) === misAsesorId; });
  }
  function canAccessRecord(record, modulo, opts) {
    opts = opts || {}; record = record || {};
    try {
      if (window.Orbit && Orbit.tenant && Orbit.tenant.isActive && modulo && !Orbit.tenant.isActive(modulo)) return false;
      var rol = rolActivo();
      if (!rol) return false;
      var asesorId = null, a = null;
      try { asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null; } catch (e) {}
      if (window.Orbit && Orbit.store && asesorId && !a) return false;
      if (a && (a.inactivo || a.status === 'blocked' || a.status === 'suspended')) return false;
      var paisRegistro = opts.pais || record.pais;
      if (paisRegistro && a && a.countries && a.countries.length && a.countries.indexOf(paisRegistro) < 0) return false;
      var scope = dataScope(modulo);
      if (scope === 'ninguno') return false;
      if (scope === 'todo') return true;
      var asesorIdDelRegistro = opts.asesorId || record.asesorId;
      if (!asesorIdDelRegistro && opts.collection) asesorIdDelRegistro = recordAdvisorId(opts.collection, record);
      if (scope === 'propia') return !!asesorIdDelRegistro && asesorIdDelRegistro === asesorId;
      if (scope === 'equipo') {
        if (!asesorId) return false;
        var miTeam = null; try { var mi = Orbit.store.get('asesores', asesorId); miTeam = mi && mi.teamId; } catch (e) {}
        if (!miTeam) return asesorIdDelRegistro === asesorId;
        try { var su = asesorIdDelRegistro ? Orbit.store.get('asesores', asesorIdDelRegistro) : null; return !!(su && su.teamId === miTeam); } catch (e) { return false; }
      }
      return false;
    } catch (e) { return false; }
  }
  function puedeAccederRegistro(asesorIdDelRegistro, modulo, opts) {
    return canAccessRecord({ asesorId: asesorIdDelRegistro, pais: opts && opts.pais }, modulo, opts);
  }
  function canView(collection, record, module) { return canAccessRecord(record || {}, module || collection, { collection: collection }); }
  function filter(collection, rows, module) {
    return filtrarPorAsesor(rows || [], function (it) { return recordAdvisorId(collection, it); }, module || collection);
  }

  /* ===================== CRM (contrato conductual) ===================== */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function digits(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }
  function projField(o, canon) {
    try { if (window.Orbit && Orbit.clientProjection) return Orbit.clientProjection.field(o, canon); } catch (e) {}
    return o ? o[canon] : '';
  }
  // Cinco estados: pendiente_polizas / activo / activo_en_mora / reactivable / inactivo.
  function deriveClientState(clientId) {
    try {
      var cli = (clientId && typeof clientId === 'object') ? clientId : (clientId && Orbit.store ? Orbit.store.get('clientes', clientId) : null);
      if (!cli) return 'desconocido';
      var pols = Orbit.store.where('polizas', function (p) { return p.clienteId === cli.id; });
      if (!pols.length) return 'pendiente_polizas';
      var vig = pols.filter(function (p) { return p.estado === 'Vigente' || p.estado === 'Por renovar'; });
      if (vig.length) {
        var mora = false;
        try { var ids = vig.map(function (p) { return p.id; }); mora = Orbit.store.where('cobros', function (c) { return ids.indexOf(c.polizaId) >= 0 && c.estado === 'Vencido'; }).length > 0; } catch (e) {}
        return mora ? 'activo_en_mora' : 'activo';
      }
      var reactivables = ['Cancelada', 'Vencida', 'Anulada', 'Rechazada', 'No renovada'];
      if (pols.every(function (p) { return reactivables.indexOf(p.estado) >= 0; })) return 'reactivable';
      return 'inactivo';
    } catch (e) { return 'desconocido'; }
  }
  function duplicateCandidates(input) {
    input = input || {};
    var res = { exact: [], probable: [] };
    try {
      var idN = norm(projField(input, 'identificacion')), nomN = norm(projField(input, 'nombre'));
      var mailN = norm(projField(input, 'email')), telN = digits(projField(input, 'telefono'));
      (Orbit.store.all('clientes') || []).forEach(function (raw) {
        if (input.id && raw.id === input.id) return;
        var c = (window.Orbit && Orbit.clientProjection) ? Orbit.clientProjection.project(raw) : raw;
        var cid = norm(c.identificacion), cnom = norm(c.nombre), cmail = norm(c.email), ctel = digits(c.telefono);
        if (idN && cid && idN === cid) { res.exact.push(raw.id); return; }
        var score = 0;
        if (nomN && cnom && nomN === cnom) score += 2;
        if (mailN && cmail && mailN === cmail) score += 2;
        if (telN && ctel && telN === ctel) score += 1;
        if (score >= 2) res.probable.push(raw.id);
      });
    } catch (e) {}
    return res;
  }
  // Alta manual estructurada (tenant/país/moneda/fuente/actor/trazabilidad/calidad). NO escribe.
  function prepareManual(collection, row, options) {
    options = options || {}; row = row || {};
    var out = (collection === 'clientes' && window.Orbit && Orbit.clientProjection) ? Orbit.clientProjection.project(row) : Object.assign({}, row);
    var u = actorUser();
    out.tenantId = out.tenantId || tenantId();
    out.pais = out.pais || row.pais || '';
    out.moneda = out.moneda || (out.pais ? currencyFor(out.pais) : '');
    out.fuente = out.fuente || options.fuente || 'ingreso_manual_plataforma';
    out.fuenteFecha = out.fuenteFecha || nowISO();
    out.creadoPor = out.creadoPor || (u && u.asesorId) || actorAdvisorId() || '';
    out.creadoPorNombre = out.creadoPorNombre || (u && u.nombre) || '';
    out.creadoPorRol = out.creadoPorRol || activeRole();
    out.asesorId = out.asesorId || (u && u.asesorId) || actorAdvisorId() || '';
    out.trazabilidad = out.trazabilidad || { origen: 'manual', fuente: out.fuente, fecha: out.fuenteFecha, actor: out.creadoPor, rol: out.creadoPorRol };
    var alertas = [];
    if (collection === 'clientes') {
      if (!out.pais) alertas.push('pais_faltante');
      if (!out.moneda) alertas.push('moneda_faltante');
      if (!projField(out, 'telefono')) alertas.push('telefono_faltante');
      if (!projField(out, 'email')) alertas.push('email_faltante');
      if (!projField(out, 'identificacion')) alertas.push('identificacion_faltante');
      out.estadoOperativo = out.estadoOperativo || 'pendiente_polizas';
    }
    out.requiereValidacion = out.requiereValidacion || !out.pais || !out.moneda || alertas.length > 0;
    out.calidad = out.calidad || {};
    out.calidad.alertas = (out.calidad.alertas || []).concat(alertas);
    out.calidad.estado = out.requiereValidacion ? 'requiere_validacion' : 'ok';
    out._prepared = true;
    return out;
  }
  // audit(action, collection, id, before, after, motivo, extra) | audit(entry). Escribe solo vía store.
  function audit(a, b, c, d, e, f, g) {
    var entry = (a && typeof a === 'object' && arguments.length === 1) ? a
      : { accion: a, coleccion: b, refId: c, antes: d, despues: e, motivo: f, extra: g };
    try {
      var u = actorUser();
      var rec = Object.assign({ id: 'aud' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fecha: nowISO(), actor: (u && u.nombre) || '', actorId: actorAdvisorId() || '', rol: activeRole() }, entry);
      Orbit.store.insert('auditoria', rec);
      return rec.id;
    } catch (e2) { return null; }
  }
  // correction(subject, detail, refs) | correction(entry).
  function correction(a, b, c) {
    var entry = (a && typeof a === 'object' && arguments.length === 1) ? a : { subject: a, detalle: b, refs: c };
    try {
      if (window.Orbit && Orbit.ciclo && Orbit.ciclo.crearGestion) {
        var g = Orbit.ciclo.crearGestion(Object.assign({ lista: 'Gestiones Admin', tipo: 'Corrección de dato/asignación', estado: 'pendiente' }, entry));
        var gid = (g && g.id) || g; audit({ accion: 'correction', refId: gid, detalle: entry }); return gid;
      }
      var rec = Object.assign({ id: 'cor' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), fecha: nowISO(), tipo: 'correccion', estado: 'pendiente', actorId: actorAdvisorId() || '' }, entry);
      Orbit.store.insert('gestiones', rec); audit({ accion: 'correction', refId: rec.id, detalle: entry }); return rec.id;
    } catch (e) { return null; }
  }
  // Colecciones operativas (con dueño por asesor) → módulo de scope. El resto pasa sin filtrar.
  var OP_COLLS = { clientes: 'cliente360', polizas: 'polizas', cobros: 'cobros', renovaciones: 'renovaciones', reclamos: 'siniestros', siniestros: 'siniestros', comisiones: 'comisiones', negocios: 'negocios', gestiones: 'ops', actividades: 'cliente360' };
  // Facade del store con lecturas filtradas y mutaciones protegidas SOLO en colecciones operativas.
  function scopedStore(module) {
    var real = Orbit.store, f = {};
    for (var k in real) { if (typeof real[k] === 'function') f[k] = real[k].bind(real); else f[k] = real[k]; }
    f.all = function (col) { return OP_COLLS[col] ? filter(col, real.all(col), OP_COLLS[col]) : real.all(col); };
    f.where = function (col, fn) { var rows = real.where(col, fn); return OP_COLLS[col] ? filter(col, rows, OP_COLLS[col]) : rows; };
    f.get = function (col, id) { var r = real.get(col, id); if (!r || !OP_COLLS[col]) return r; return canAccessRecord(r, OP_COLLS[col], { collection: col }) ? r : null; };
    f.insert = function (col, row) { if (OP_COLLS[col] && !canAccessRecord(row || {}, OP_COLLS[col], { collection: col })) return null; return real.insert(col, row); };
    f.update = function (col, id, patch) { if (OP_COLLS[col]) { var r = real.get(col, id); if (!r || !canAccessRecord(r, OP_COLLS[col], { collection: col })) return false; } return real.update(col, id, patch); };
    f.remove = function (col, id) { if (OP_COLLS[col]) { var r = real.get(col, id); if (!r || !canAccessRecord(r, OP_COLLS[col], { collection: col })) return false; } return real.remove(col, id); };
    f._scopedFor = module || '';
    return f;
  }
  // withScope: reemplaza Orbit.store temporalmente, lo restaura SIEMPRE (finally), y pasa el facade al callback.
  function withScope(module, fn) {
    var real = Orbit.store, facade = scopedStore(module);
    try { Orbit.store = facade; return fn(facade, real); }
    finally { Orbit.store = real; }
  }

  return {
    activeRole: activeRole, rolActivo: rolActivo, esAsesor: esAsesor,
    actorAdvisorId: actorAdvisorId, actorUser: actorUser, assignedRoles: assignedRoles,
    tenantConfig: tenantConfig, tenantId: tenantId, countryConfig: countryConfig, currencyFor: currencyFor,
    dataScope: dataScope, scopeCanon: scopeCanon, scopeUI: scopeUI,
    recordAdvisorId: recordAdvisorId, teamAdvisorIds: teamAdvisorIds,
    puedeVerModulo: puedeVerModulo, can: can, puedeGestionar: puedeGestionar, esRestringidoCredenciales: esRestringidoCredenciales,
    filtrarPorAsesor: filtrarPorAsesor, canAccessRecord: canAccessRecord, puedeAccederRegistro: puedeAccederRegistro,
    canView: canView, filter: filter,
    deriveClientState: deriveClientState, duplicateCandidates: duplicateCandidates, prepareManual: prepareManual,
    audit: audit, correction: correction, scopedStore: scopedStore, withScope: withScope
  };
})();

/* Orbit.accessScope = alias/wrapper de compatibilidad sobre EL MISMO motor. No es un segundo motor. */
Orbit.accessScope = (function () {
  var a = Orbit.access;
  return {
    rolActivo: a.rolActivo, esAsesor: a.esAsesor, dataScope: a.dataScope,
    puedeVerModulo: a.puedeVerModulo, puedeGestionar: a.puedeGestionar,
    esRestringidoCredenciales: a.esRestringidoCredenciales, filtrarPorAsesor: a.filtrarPorAsesor,
    puedeAccederRegistro: a.puedeAccederRegistro, canAccessRecord: a.canAccessRecord
  };
})();
