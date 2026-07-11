/* ============================================================
   Orbit 360 · Acceso, alcance de datos y altas operativas v1.198
   Contrato reusable multi-tenant. No reemplaza Auth ni Orbit.store.
   Centraliza rol activo, scope, permisos, trazabilidad y defaults
   seguros para altas manuales desde la plataforma.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.access = (function () {
  const S = () => Orbit.store;
  const ALL_ROLES = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin'];
  const TEAM_ROLES = ['Operativo', 'Finanzas', 'Marketing'];
  const OWN_ROLES = ['Asesor', 'Asesora', 'Asesor Sr.', 'Asesora Sr.', 'Asesor Jr.', 'Asesora Jr.', 'Comercial', 'Asistente'];
  const SENSITIVE = ['auditLog', 'auditoria', 'historialInterno', 'credenciales', 'secretos'];

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) { return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
  function today() { try { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function now() { return new Date().toISOString(); }

  function activeRole() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol() || 'Sin rol'; } catch (e) {}
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && u.rol) || 'Sin rol'; } catch (e) {}
    return 'Sin rol';
  }

  function actorAdvisorId() {
    try { return clean(Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId()); } catch (e) { return ''; }
  }

  function actorUser() {
    let u = null;
    try { u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); } catch (e) {}
    const advisorId = actorAdvisorId();
    let advisor = null;
    try { advisor = advisorId && S() && S().get ? S().get('asesores', advisorId) : null; } catch (e) {}
    return {
      id: clean((u && (u.uid || u.id || u.email)) || advisorId),
      nombre: clean((u && (u.nombre || u.email)) || (advisor && advisor.nombre) || 'Usuario'),
      email: clean(u && u.email),
      rolActivo: activeRole(),
      asesorId: advisorId
    };
  }

  function actorAdvisor() {
    const id = actorAdvisorId();
    try { return id && S() && S().get ? (S().get('asesores', id) || {}) : {}; } catch (e) { return {}; }
  }

  function tenantConfig() {
    try { return Orbit.tenant && Orbit.tenant.get ? (Orbit.tenant.get() || {}) : {}; } catch (e) { return {}; }
  }

  function tenantId() {
    const cfg = tenantConfig();
    try {
      return clean((Orbit.tenant && (Orbit.tenant.id || Orbit.tenant.tenantId)) || cfg.tenantId || cfg.id || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '');
    } catch (e) { return clean(cfg.tenantId || cfg.id); }
  }

  function countryConfig(pais) {
    const cfg = tenantConfig();
    const map = cfg.paisesCfg || {};
    const own = map[pais] || {};
    let global = {};
    try { global = Orbit.paisCfg ? (Orbit.paisCfg(pais) || {}) : {}; } catch (e) {}
    return Object.assign({}, global, own);
  }

  function currencyFor(pais) {
    const pc = countryConfig(pais);
    if (pc.moneda) return pc.moneda;
    try { const p = (Orbit.PAISES || []).find(x => x.id === pais); if (p && p.moneda) return p.moneda; } catch (e) {}
    return '';
  }

  function explicitScope(moduleKey) {
    const a = actorAdvisor();
    const candidates = [a.scopeDatos, a.alcanceDatos, a.dataScope, a.scopes, a.scope];
    for (const src of candidates) {
      if (!src) continue;
      if (typeof src === 'string') return src;
      if (typeof src === 'object') {
        const v = src[moduleKey] || src['*'] || src.default;
        if (v) return v;
      }
    }
    return '';
  }

  function normalizeScope(v) {
    const s = norm(v);
    if (['todos', 'all', 'global'].includes(s)) return 'all';
    if (['equipo', 'team'].includes(s)) return 'team';
    if (['propios', 'propio', 'own', 'mios'].includes(s)) return 'own';
    if (['ninguno', 'none', 'sinacceso'].includes(s)) return 'none';
    return '';
  }

  function dataScope(moduleKey) {
    const ex = normalizeScope(explicitScope(moduleKey));
    if (ex) return ex;
    const r = activeRole();
    if (ALL_ROLES.includes(r)) return 'all';
    if (TEAM_ROLES.includes(r)) return 'team';
    if (OWN_ROLES.includes(r) || /Asesor/i.test(r)) return 'own';
    return 'none';
  }

  function teamAdvisorIds() {
    const a = actorAdvisor();
    const own = actorAdvisorId();
    const out = new Set(own ? [own] : []);
    const direct = [].concat(a.equipoAsesorIds || a.teamAdvisorIds || a.asesoresEquipo || []);
    direct.forEach(x => out.add(String(x)));
    const teamId = clean(a.equipoId || a.teamId || a.supervisorId || '');
    try {
      (S().all('asesores') || []).forEach(x => {
        if (teamId && clean(x.equipoId || x.teamId || x.supervisorId) === teamId) out.add(String(x.id));
        if (clean(x.supervisorId) === own) out.add(String(x.id));
      });
    } catch (e) {}
    return Array.from(out);
  }

  function recordAdvisorId(collection, rec) {
    if (!rec) return '';
    if (rec.asesorId) return clean(rec.asesorId);
    let linked = null;
    try {
      if (rec.clienteId) linked = S().get('clientes', rec.clienteId);
      if (!linked && rec.polizaId) {
        const p = S().get('polizas', rec.polizaId);
        if (p && p.asesorId) return clean(p.asesorId);
        if (p && p.clienteId) linked = S().get('clientes', p.clienteId);
      }
      if (!linked && collection === 'clientes') linked = rec;
    } catch (e) {}
    return clean(linked && linked.asesorId);
  }

  function canView(collection, rec, moduleKey) {
    if (!rec) return false;
    if (SENSITIVE.includes(collection) && !ALL_ROLES.includes(activeRole())) return false;
    const scope = dataScope(moduleKey || collection || '*');
    if (scope === 'all') return true;
    if (scope === 'none') return false;
    const advisorId = recordAdvisorId(collection, rec);
    if (!advisorId) return ALL_ROLES.includes(activeRole());
    if (scope === 'own') return advisorId === actorAdvisorId();
    if (scope === 'team') return teamAdvisorIds().includes(advisorId);
    return false;
  }

  function filter(collection, rows, moduleKey) {
    return (rows || []).filter(r => canView(collection, r, moduleKey));
  }

  function hasExtra(key) {
    const a = actorAdvisor();
    return [].concat(a.permisosExtra || a.extras || []).includes(key);
  }
  function isRestricted(key) {
    const a = actorAdvisor();
    return [].concat(a.restricciones || []).includes(key);
  }

  function matrixPermission(moduleKey, action) {
    try {
      const cfg = Orbit.cat && Orbit.cat.all ? Orbit.cat.all() : {};
      const P = cfg && cfg.permisos;
      const r = activeRole();
      if (P && P[r] && P[r][moduleKey] && P[r][moduleKey][action] != null) return !!P[r][moduleKey][action];
    } catch (e) {}
    return null;
  }

  function can(moduleKey, action) {
    const key = moduleKey + '_' + action;
    if (isRestricted(key) || isRestricted(moduleKey)) return false;
    if (hasExtra(key) || hasExtra(moduleKey)) return true;
    const matrix = matrixPermission(moduleKey, action === 'create' ? 'editar' : action);
    if (matrix != null) return matrix;
    const r = activeRole();
    if (action === 'view') return dataScope(moduleKey) !== 'none';
    if (ALL_ROLES.includes(r)) return true;
    if (r === 'Operativo') return ['edit', 'create', 'complete', 'manage_documents'].includes(action);
    if (/Asesor/i.test(r) || r === 'Comercial') return action === 'complete';
    return false;
  }

  function missingClientFields(c) {
    const fields = ['identificacion', 'telefono', 'email', 'departamento', 'ciudad', 'direccion'];
    return fields.filter(k => !clean(c && c[k]));
  }

  function deriveClientState(clientId) {
    let policies = [], cobros = [];
    try { policies = S().where('polizas', p => p.clienteId === clientId) || []; } catch (e) {}
    if (!policies.length) return 'pendiente_polizas';
    const active = policies.filter(p => ['vigente', 'porrenovar'].includes(norm(p.estado)));
    if (active.length) {
      const ids = new Set(active.map(p => p.id));
      try { cobros = S().all('cobros') || []; } catch (e) {}
      const overdue = cobros.some(c => ids.has(c.polizaId) && norm(c.estado) === 'vencido');
      return overdue ? 'activo_en_mora' : 'activo';
    }
    const recoverable = policies.some(p => ['cancelada', 'vencida', 'anulada', 'rechazada', 'norenovada'].includes(norm(p.estado)));
    return recoverable ? 'reactivable' : 'inactivo';
  }

  function duplicateCandidates(input) {
    let clients = [];
    try { clients = S().all('clientes') || []; } catch (e) {}
    const idn = norm(input.identificacion);
    const email = clean(input.email).toLowerCase();
    const tel = norm(input.telefono);
    const name = norm(input.nombre);
    const pais = clean(input.pais);
    return clients.map(c => {
      const exact = (idn && norm(c.identificacion) === idn) || (email && clean(c.email).toLowerCase() === email);
      const probable = !exact && name && norm(c.nombre) === name && pais === clean(c.pais) && (!tel || !c.telefono || norm(c.telefono) === tel);
      return exact || probable ? { id: c.id, nombre: c.nombre, exact, probable, pais: c.pais } : null;
    }).filter(Boolean);
  }

  function prepareManual(collection, row, options) {
    options = options || {};
    const actor = actorUser();
    const out = Object.assign({}, row || {});
    const alerts = [].concat((out.calidad && out.calidad.alertas) || []);
    out.tenantId = clean(out.tenantId || tenantId());
    out.pais = clean(out.pais || options.pais || '');
    out.moneda = clean(out.moneda || options.moneda || currencyFor(out.pais));
    out.fuente = 'ingreso_manual_plataforma';
    out.fuenteFecha = now();
    out.creadoPor = actor.id || actor.nombre;
    out.creadoPorNombre = actor.nombre;
    out.rolCreacion = actor.rolActivo;
    out.asesorId = clean(out.asesorId || options.asesorId || actor.asesorId);
    out.trazabilidad = Object.assign({}, out.trazabilidad || {}, {
      origen: 'ingreso_manual_plataforma', actorId: actor.id, actorNombre: actor.nombre,
      rolActivo: actor.rolActivo, fecha: now(), tenantId: out.tenantId
    });
    if (!out.tenantId) alerts.push('tenant_requiere_validacion');
    if (!out.pais) alerts.push('pais_requiere_validacion');
    if (!out.moneda) alerts.push('moneda_requiere_validacion');
    if (collection === 'clientes') {
      out.estadoOperativo = out.estadoOperativo || 'pendiente_polizas';
      out.estado = out.estado || out.estadoOperativo;
      missingClientFields(out).forEach(k => alerts.push('falta_' + k));
      if (!out.asesorId) alerts.push('asesor_requiere_validacion');
    }
    if (alerts.length) out.requiereValidacion = true;
    out.calidad = Object.assign({}, out.calidad || {}, {
      alertas: Array.from(new Set(alerts)),
      estado: alerts.length ? 'REQUIERE_VALIDACION' : 'VALIDADO_EN_CAPTURA',
      actualizado: now()
    });
    return out;
  }

  function audit(action, collection, id, before, after, motivo, extra) {
    const actor = actorUser();
    const row = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tenantId: tenantId(), fecha: now(), accion: action, coleccion: collection, registroId: String(id || ''),
      actor, motivo: clean(motivo), antes: before || null, despues: after || null,
      detalle: Object.assign({}, extra || {})
    };
    try { if (S() && S().insert) S().insert('auditLog', row); } catch (e) {
      try { S().insert('actividades', { id: row.id, tipo: 'admin', icon: '🧾', fecha: today(), titulo: 'Cambio registrado', detalle: collection + ' · ' + action, auditoriaRef: row.id }); } catch (ignore) {}
    }
    return row;
  }

  function correction(subject, detail, refs) {
    const actor = actorUser();
    const g = Object.assign({
      lista: 'Gestiones Admin', tipo: 'Corrección de datos', titulo: subject || 'Corrección de datos',
      nota: detail || '', estado: 'Pendiente', prioridad: 'Media', origen: 'Solicitud de corrección',
      asesorId: actor.asesorId, solicitadoPor: actor.nombre, tenantId: tenantId(), creado: today()
    }, refs || {});
    try { if (Orbit.ciclo && Orbit.ciclo.crearGestion) return Orbit.ciclo.crearGestion(g); } catch (e) {}
    try { g.id = 'ges_' + Date.now().toString(36); return S().insert('gestiones', g); } catch (e) { return null; }
  }

  function scopedStore(moduleKey) {
    const base = S();
    if (!base) return base;
    const scopedCollections = new Set(['clientes','polizas','vehiculos','cobros','comisiones','actividades','reclamos','gestiones','negocios','parchesPendientes','correos']);
    const facade = Object.create(base);
    facade.all = function (collection) {
      const rows = base.all(collection) || [];
      return scopedCollections.has(collection) ? filter(collection, rows, moduleKey) : rows;
    };
    facade.where = function (collection, predicate) { return facade.all(collection).filter(predicate); };
    facade.find = function (collection, predicate) { return facade.all(collection).find(predicate); };
    facade.get = function (collection, id) {
      const rec = base.get(collection, id);
      return !rec || !scopedCollections.has(collection) || canView(collection, rec, moduleKey) ? rec : null;
    };
    return facade;
  }

  function withScope(moduleKey, fn) {
    const base = Orbit.store;
    Orbit.store = scopedStore(moduleKey);
    try { return fn(); } finally { Orbit.store = base; }
  }

  return {
    activeRole, actorAdvisorId, actorUser, actorAdvisor, tenantConfig, tenantId,
    countryConfig, currencyFor, dataScope, teamAdvisorIds, canView, filter, can,
    missingClientFields, deriveClientState, duplicateCandidates, prepareManual,
    audit, correction, scopedStore, withScope, norm
  };
})();
