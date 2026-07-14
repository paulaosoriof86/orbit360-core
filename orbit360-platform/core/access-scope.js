/* Orbit 360 · core/access-scope.js
   Helper reutilizable y centralizado para rol activo + alcance de datos.
   No implementa Auth ni backend: envuelve Orbit.session/Orbit.ROLES
   (ya existentes) para que los módulos dejen de resolver visibilidad
   y alcance con lógica propia dispersa.

   Orbit.accessScope.rolActivo()        -> string, ej. 'Asesor'
   Orbit.accessScope.esAsesor()         -> bool
   Orbit.accessScope.dataScope(modulo)  -> 'propia'|'equipo'|'todo'|'ninguno'
   Orbit.accessScope.puedeVerModulo(id) -> bool (usa canSee + restricciones de rol)
   Orbit.accessScope.puedeGestionar(id) -> bool (nivel >= gestión, ver Orbit.ROLES)
   Orbit.accessScope.esRestringidoCredenciales() -> bool (alias de Orbit.vault.isRestricted) */
window.Orbit = window.Orbit || {};
Orbit.accessScope = (function () {
  // Fail-closed real: identidad/sesión no resoluble => '' (nunca un rol privilegiado por defecto).
  function rolActivo() {
    try { const r = (window.Orbit && Orbit.session && Orbit.session.rol) ? Orbit.session.rol() : ''; return r || ''; }
    catch (e) { return ''; }
  }
  function esAsesor() {
    try { return !!(window.Orbit && Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()); }
    catch (e) { return false; }
  }
  // Alcance de datos por módulo. Orden de resolución:
  // 1) modelo moderno del asesor activo: dataScopes.modules[modulo] → dataScopes.default;
  // 2) legacy dataScope (compatibilidad con Equipo actual);
  // 3) override de rol (Orbit.ROLES[rol].scopes);
  // 4) fallback por defecto (Asesor->propia, resto->todo).
  // Normaliza alias own/team/all/none → propia/equipo/todo/ninguno.
  function normalizarScope(v) {
    return { own: 'propia', team: 'equipo', all: 'todo', none: 'ninguno' }[v] || v;
  }
  function dataScope(modulo) {
    let asesorId = null, a = null;
    try {
      asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId();
      a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null;
    } catch (e) { return 'ninguno'; }
    try {
      // Identidad declarada pero inexistente en el store (con store ya cargado): fail-closed real,
      // no se asume acceso total por defecto.
      if (window.Orbit && Orbit.store && asesorId && !a) return 'ninguno';
      if (a && (a.inactivo || a.status === 'blocked' || a.status === 'suspended')) return 'ninguno';
      // País habilitado por usuario: si tiene countries[] declarado y el filtro global
      // de país activo (Orbit.pais) no está en su lista, no ve datos de ese módulo.
      if (a && a.countries && a.countries.length && window.Orbit && Orbit.pais && Orbit.pais !== 'TODOS' && a.countries.indexOf(Orbit.pais) < 0) return 'ninguno';
      if (a && a.dataScopes) {
        if (a.dataScopes.modules && a.dataScopes.modules[modulo] != null) return normalizarScope(a.dataScopes.modules[modulo]);
        if (a.dataScopes.default != null) return normalizarScope(a.dataScopes.default);
      }
      if (a && a.dataScope) return normalizarScope(a.dataScope);
    } catch (e) { return 'ninguno'; }
    const rol = rolActivo();
    if (!rol) return 'ninguno'; // sesión/rol no resoluble: fail-closed real (antes caía en 'todo')
    const def = Orbit.ROLES && Orbit.ROLES[rol];
    if (def && def.scopes && def.scopes[modulo]) return normalizarScope(def.scopes[modulo]);
    if (esAsesor()) return 'propia';
    return 'todo';
  }
  /* Visibilidad final de módulo = base del rol activo + modulesExtra[] − modulesRestricted[]
     (modelo moderno) — modulosOverride legacy se mantiene solo por compatibilidad si no hay
     modulesExtra/modulesRestricted declarados. La restricción SIEMPRE gana. */
  function puedeVerModulo(id) {
    try {
      if (window.Orbit && Orbit.tenant && Orbit.tenant.isActive && !Orbit.tenant.isActive(id)) return false;
      const asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId();
      const a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null;
      if (a && (a.modulesExtra || a.modulesRestricted)) {
        if ((a.modulesRestricted || []).indexOf(id) >= 0) return false;
        const rol = rolActivo();
        const base = (Orbit.ROLES && Orbit.ROLES[rol] && Orbit.ROLES[rol].modulos) || [];
        return base.indexOf(id) >= 0 || (a.modulesExtra || []).indexOf(id) >= 0;
      }
      return !(window.Orbit && Orbit.session && Orbit.session.canSee) || Orbit.session.canSee(id);
    } catch (e) { return false; } // fail-closed real: error de resolución nunca habilita el módulo
  }
  function puedeGestionar(nivelMin) {
    const rol = rolActivo();
    const def = Orbit.ROLES && Orbit.ROLES[rol];
    const nivel = def ? def.nivel : 0;
    return nivel >= (nivelMin || 4);
  }
  function esRestringidoCredenciales() {
    try { return (window.Orbit && Orbit.vault && Orbit.vault.isRestricted) ? Orbit.vault.isRestricted() : esAsesor(); }
    catch (e) { return esAsesor(); }
  }
  /* Filtro genérico propia/equipo/todo/ninguno para colecciones con asesorId.
     Un registro SIN asesor asignado NO pertenece automáticamente a propia/equipo —
     antes se incluía por defecto (bug real); ahora queda excluido para el usuario
     restringido y disponible solo para scope 'todo' (bandeja de calidad/dirección). */
  function filtrarPorAsesor(items, getAsesorId, modulo) {
    const scope = dataScope(modulo);
    if (scope === 'ninguno') return [];
    if (scope === 'todo') return items;
    let misAsesorId = null;
    try { misAsesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); } catch (e) {}
    if (!misAsesorId) return [];
    if (scope === 'equipo') {
      let miTeam = null;
      try { const mi = Orbit.store.get('asesores', misAsesorId); miTeam = mi && mi.teamId; } catch (e) {}
      if (!miTeam) return items.filter(it => getAsesorId(it) === misAsesorId);
      return items.filter(it => { const aid = getAsesorId(it); if (!aid) return false; try { const su = Orbit.store.get('asesores', aid); return su && su.teamId === miTeam; } catch (e) { return false; } });
    }
    // 'propia' (default): excluye registros sin asesor asignado.
    return items.filter(it => getAsesorId(it) === misAsesorId);
  }
  /* Gate central por registro y acción — equivalente a canAccessRecord(collection, record, action, module)
     del contrato backend: valida identidad viva, tenant/módulo activo, país autorizado del registro
     (independiente del filtro global Orbit.pais — así 'TODOS' no evade countries[]) y scope/team.
     record: objeto con al menos { asesorId } y opcionalmente { pais }.
     opts: { pais } por si el país no viene en el propio record. */
  function canAccessRecord(record, modulo, opts) {
    opts = opts || {}; record = record || {};
    try {
      if (window.Orbit && Orbit.tenant && Orbit.tenant.isActive && modulo && !Orbit.tenant.isActive(modulo)) return false;
      const rol = rolActivo();
      if (!rol) return false;
      let asesorId = null, a = null;
      try { asesorId = window.Orbit && Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); a = (asesorId && Orbit.store) ? Orbit.store.get('asesores', asesorId) : null; } catch (e) {}
      if (window.Orbit && Orbit.store && asesorId && !a) return false;
      if (a && (a.inactivo || a.status === 'blocked' || a.status === 'suspended')) return false;
      // País del registro puntual (no del filtro global) contra countries[] del usuario.
      const paisRegistro = opts.pais || record.pais;
      if (paisRegistro && a && a.countries && a.countries.length && a.countries.indexOf(paisRegistro) < 0) return false;
      const scope = dataScope(modulo);
      if (scope === 'ninguno') return false;
      if (scope === 'todo') return true;
      const asesorIdDelRegistro = opts.asesorId || record.asesorId;
      if (scope === 'propia') return !!asesorIdDelRegistro && asesorIdDelRegistro === asesorId;
      if (scope === 'equipo') {
        if (!asesorId) return false;
        let miTeam = null; try { const mi = Orbit.store.get('asesores', asesorId); miTeam = mi && mi.teamId; } catch (e) {}
        if (!miTeam) return asesorIdDelRegistro === asesorId;
        try { const su = asesorIdDelRegistro ? Orbit.store.get('asesores', asesorIdDelRegistro) : null; return !!(su && su.teamId === miTeam); } catch (e) { return false; }
      }
      return false;
    } catch (e) { return false; }
  }
  /* Gate puntual para UNA acción/mutación directa por ID (no solo listas) — usar antes de
     abrir fichas, validar/aplicar cobro, endosar, renovar, o cualquier acción de Ops/Leads
     (openNegocio, setEtapa, decidirCierre, perder, archivar, emitir, openGestion).
     Compatibilidad: sigue aceptando (asesorId, modulo); internamente ya usa el gate central
     canAccessRecord (valida también país del registro cuando se pasa opts.pais). */
  function puedeAccederRegistro(asesorIdDelRegistro, modulo, opts) {
    return canAccessRecord({ asesorId: asesorIdDelRegistro, pais: opts && opts.pais }, modulo, opts);
  }
  return { rolActivo, esAsesor, dataScope, puedeVerModulo, puedeGestionar, esRestringidoCredenciales, filtrarPorAsesor, puedeAccederRegistro, canAccessRecord };
})();
