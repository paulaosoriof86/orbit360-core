/* ============================================================
   Orbit 360 · sesión multirol y visibilidad efectiva · compat 2026-07-29
   Owner de compatibilidad sobre Access canónico:
   - NO muta el owner Orbit.session recibido;
   - delega roles, identidad y persistencia al owner canónico;
   - conserva visibilidad = base/extras/restricciones del owner;
   - agrega consulta read-only de Aseguradoras para Asesor/Comercial,
     respetando restricción explícita de membership;
   - reconstruye navegación al cambiar rol activo;
   - no reemplaza Auth, Orbit.store ni scopes de datos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (!Orbit.session) return;
  if (Orbit.session.__multirolVisibilityV20260716) return;

  var VERSION = '20260729.2';
  var owner = Orbit.session;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function uniq(values) { return Array.from(new Set([].concat(values || []).map(clean).filter(Boolean))); }
  function activeRole() { try { return clean(owner.rol && owner.rol()); } catch (error) { return ''; } }
  function productUser() {
    try {
      if (Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.productReadOnly === true) return Orbit.auth.productUser;
      if (Orbit.auth && typeof Orbit.auth.user === 'function') {
        var row = Orbit.auth.user();
        if (row && row.productReadOnly === true) return row;
      }
    } catch (error) {}
    return null;
  }
  function restricted(route) {
    var row = productUser() || {};
    return uniq(row.modulesRestricted || row.modulosRestringidos || []).indexOf(clean(route)) >= 0;
  }
  function consultativeAllowed(route) {
    route = clean(route);
    var role = activeRole();
    return route === 'aseguradoras' && (/^Asesor$/i.test(role) || /^Comercial$/i.test(role)) && !restricted(route);
  }
  function canSee(route) {
    route = clean(route);
    if (!route) return false;
    try { if (owner.canSee && owner.canSee(route) === true) return true; } catch (error) {}
    return consultativeAllowed(route);
  }
  function assignedRoles() {
    try { if (owner.allowedRoles) return uniq(owner.allowedRoles()); } catch (error) {}
    try { if (owner.rolesAsignados) return uniq(owner.rolesAsignados()); } catch (error) {}
    return [];
  }
  function effectiveModules() {
    var routes = [];
    try {
      [].concat(Orbit.NAV || []).forEach(function (block) {
        if (block && block.route) routes.push(block.route);
        [].concat(block && block.items || []).forEach(function (item) { if (item && item.route) routes.push(item.route); });
      });
    } catch (error) {}
    if (!routes.length) {
      var role = activeRole();
      var def = Orbit.ROLES && Orbit.ROLES[role];
      routes = [].concat(def && (def.modulos || def.modules) || [], consultativeAllowed('aseguradoras') ? ['aseguradoras'] : []);
    }
    return uniq(routes).filter(canSee);
  }
  function paintRoleSelector() {
    var select = document.getElementById('rol-sel');
    if (!select) return;
    var roles = assignedRoles();
    if (!roles.length) return;
    var active = activeRole();
    select.innerHTML = roles.map(function (role) {
      var safe = role.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return '<option value="' + safe + '"' + (role === active ? ' selected' : '') + '>' + safe + '</option>';
    }).join('');
  }
  function refreshShell() {
    paintRoleSelector();
    try { if (Orbit.router && typeof Orbit.router.rebuildSidebar === 'function') Orbit.router.rebuildSidebar(); } catch (error) {}
  }

  var facade = Object.create(owner);
  Object.defineProperties(facade, {
    canSee: { value: canSee, enumerable: true },
    set: { value: function (role, advisorId) { return owner.set ? owner.set(role, advisorId) : false; }, enumerable: true },
    effectiveModules: { value: effectiveModules, enumerable: true },
    assignedRoles: { value: assignedRoles, enumerable: true },
    __multirolVisibilityV20260716: { value: Object.freeze({
      version: VERSION,
      ownerMode: 'immutable-delegating-facade',
      canonicalOwnerVersion: clean(owner.VERSION || ''),
      additiveVisibility: true,
      consultativeReadOnly: true,
      advisorInsurerReadOnly: true,
      preservesAdvisorIdentity: true,
      preservesCanonicalOwner: true,
      replacesAuth: false,
      replacesDataScope: false
    }), enumerable: true }
  });
  Orbit.session = Object.freeze(facade);
  Orbit.sessionMultirolVisibilityV20260716 = Object.freeze({
    version: VERSION,
    ready: true,
    ownerMode: 'immutable-delegating-facade',
    canonicalOwner: owner,
    advisorInsurerReadOnly: true
  });

  document.addEventListener('orbit:session', function () { setTimeout(refreshShell, 0); });
  document.addEventListener('orbit:store', function (event) {
    if (!event || !event.detail || event.detail === 'asesores' || event.detail.collection === 'asesores') setTimeout(refreshShell, 0);
  });
  window.addEventListener('orbit:store:emit', function () { setTimeout(refreshShell, 0); });
  setTimeout(refreshShell, 0);
})();
