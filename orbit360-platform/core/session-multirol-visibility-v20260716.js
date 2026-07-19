/* ============================================================
   Orbit 360 · sesión multirol y visibilidad efectiva · 2026-07-16
   Fix reusable y aditivo:
   - conserva el asesor/identidad al cambiar rol activo;
   - muestra únicamente roles asignados al usuario activo;
   - visibilidad = módulos base + extras - restringidos;
   - permite consulta de Aseguradoras para roles Asesor sin abrir escrituras;
   - no reemplaza Auth, Orbit.store ni scopes de datos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (!Orbit.session || Orbit.session.__multirolVisibilityV20260716) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function uniq(values) { return Array.from(new Set([].concat(values || []).map(clean).filter(Boolean))); }
  function advisor() {
    try {
      var id = Orbit.session.asesorId && Orbit.session.asesorId();
      return id && Orbit.store && Orbit.store.get ? (Orbit.store.get('asesores', id) || null) : null;
    } catch (error) { return null; }
  }
  function assignedRoles(row) {
    row = row || advisor() || {};
    return uniq(row.roles || row.rolesAsignados || row.rolesDisponibles || [row.rolDefault || row.rol]);
  }
  function consultativeModules(role) {
    var route = 'aseguradoras';
    if ((/Asesor/i.test(role) || role === 'Comercial') && route === 'aseguradoras') return [route];
    return [];
  }
  function baseModules(role) {
    var def = Orbit.ROLES && Orbit.ROLES[role];
    return uniq([].concat(def && def.modulos || [], consultativeModules(role)));
  }
  function extras(row, role) {
    row = row || {};
    var byRole = row.modulosExtraPorRol || row.extraModulesByRole || {};
    return uniq([].concat(
      row.modulosExtra || row.extraModules || [],
      byRole[role] || byRole['*'] || []
    ));
  }
  function restrictions(row, role) {
    row = row || {};
    var byRole = row.modulosRestringidosPorRol || row.restrictedModulesByRole || {};
    var raw = [].concat(row.modulosRestringidos || row.restrictedModules || [], byRole[role] || byRole['*'] || []);
    return uniq(raw.map(function (item) {
      var value = clean(item);
      if (value.indexOf('modulo:') === 0) return value.slice(7);
      return value.indexOf('_') < 0 ? value : '';
    }));
  }
  function effectiveModules(role, row) {
    row = row || advisor() || {};
    var mode = clean(row.visibilidadModo || row.moduleVisibilityMode || 'additive').toLowerCase();
    var legacy = uniq(row.modulosOverride || []);
    var allow = mode === 'replace' && legacy.length ? legacy : uniq(baseModules(role).concat(legacy, extras(row, role)));
    var deny = restrictions(row, role);
    return allow.filter(function (route) { return deny.indexOf(route) < 0; });
  }
  function roleAllowed(role, row) {
    var roles = assignedRoles(row);
    return !roles.length || roles.indexOf(role) >= 0;
  }

  var originalSet = Orbit.session.set.bind(Orbit.session);
  Orbit.session.set = function (role, advisorId) {
    var currentId = clean(Orbit.session.asesorId && Orbit.session.asesorId());
    var targetId = clean(advisorId || currentId);
    var row = null;
    try { row = targetId && Orbit.store && Orbit.store.get ? Orbit.store.get('asesores', targetId) : null; } catch (error) {}
    if (!roleAllowed(role, row)) return false;
    originalSet(role, targetId || currentId);
    return true;
  };

  Orbit.session.canSee = function (route) {
    var role = clean(Orbit.session.rol && Orbit.session.rol());
    var row = advisor();
    if (!roleAllowed(role, row)) return false;
    return effectiveModules(role, row).indexOf(clean(route)) >= 0;
  };

  function paintRoleSelector() {
    var select = document.getElementById('rol-sel');
    if (!select) return;
    var row = advisor();
    var roles = assignedRoles(row);
    if (!roles.length) roles = Object.keys(Orbit.ROLES || {});
    var active = clean(Orbit.session.rol && Orbit.session.rol());
    if (roles.indexOf(active) < 0) active = clean((row && (row.rolDefault || row.rol)) || roles[0]);
    select.innerHTML = roles.map(function (role) {
      return '<option value="' + role.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"' + (role === active ? ' selected' : '') + '>' + role + '</option>';
    }).join('');
    if (active && active !== clean(Orbit.session.rol && Orbit.session.rol())) originalSet(active, clean(Orbit.session.asesorId && Orbit.session.asesorId()));
  }

  document.addEventListener('change', function (event) {
    var select = event.target;
    if (!select || select.id !== 'rol-sel') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    Orbit.session.set(select.value, clean(Orbit.session.asesorId && Orbit.session.asesorId()));
  }, true);

  document.addEventListener('orbit:session', function () { setTimeout(paintRoleSelector, 0); });
  document.addEventListener('orbit:store', function (event) {
    if (!event || !event.detail || event.detail === 'asesores' || event.detail.collection === 'asesores') setTimeout(paintRoleSelector, 0);
  });
  window.addEventListener('orbit:store:emit', function () { setTimeout(paintRoleSelector, 0); });

  Orbit.session.effectiveModules = function () { return effectiveModules(clean(Orbit.session.rol && Orbit.session.rol()), advisor()); };
  Orbit.session.assignedRoles = function () { return assignedRoles(advisor()); };
  Orbit.session.__multirolVisibilityV20260716 = {
    version: '20260719.1',
    additiveVisibility: true,
    consultativeReadOnly: true,
    advisorInsurerReadOnly: true,
    preservesAdvisorIdentity: true,
    replacesAuth: false,
    replacesDataScope: false
  };

  setTimeout(paintRoleSelector, 0);
})();
