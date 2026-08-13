/* ============================================================
   Orbit 360 · Product membership access bridge P0
   Fecha: 2026-07-30

   En runtime productivo, la visibilidad de módulos se deriva de la
   membership autenticada y del contrato multirol canónico. No depende
   de que la colección de asesores esté montada en Orbit.store.
   No escribe datos, membership, sesión backend ni configuración.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var previous = window.Orbit.session || {};
  var VERSION = 'p0-m6-access-20260730.1';

  function text(value) { return String(value == null ? '' : value).trim(); }
  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }
  function projection() {
    try {
      var source = window.Orbit.auth && Orbit.auth.productUser;
      if (!source || source.productReadOnly !== true || !Array.isArray(source.roles)) return null;
      return {
        uid: text(source.uid),
        tenantId: text(source.tenantId),
        roles: unique(source.roles),
        defaultRole: text(source.defaultRole),
        activeRole: text(source.activeRole),
        advisorId: text(source.advisorId),
        teamId: text(source.teamId),
        countries: unique(source.countries),
        dataScopes: source.dataScopes && typeof source.dataScopes === 'object' ? source.dataScopes : {},
        modulesExtra: unique(source.modulesExtra),
        modulesRestricted: unique(source.modulesRestricted),
        status: 'active',
        productReadOnly: true
      };
    } catch (error) { return null; }
  }
  function moduleCatalog() {
    var out = unique(Object.keys(window.Orbit.MODULE_META || {}));
    try {
      (window.Orbit.NAV || []).forEach(function (block) {
        if (block && block.route) out.push(text(block.route));
        (block && Array.isArray(block.items) ? block.items : []).forEach(function (item) {
          if (item && item.route) out.push(text(item.route));
        });
      });
    } catch (error) {}
    return unique(out);
  }
  function currentRole() {
    try { return previous && typeof previous.rol === 'function' ? text(previous.rol()) : ''; }
    catch (error) { return ''; }
  }
  function effectiveModulesFor(role, member) {
    var owner = window.Orbit.membershipMultirolEffectiveP0 || window.Orbit.membershipMultirolP0;
    if (!owner || typeof owner.effectiveModules !== 'function') return null;
    var input = Object.assign({}, member || {}, { activeRole: role });
    try { return unique(owner.effectiveModules(input, null, moduleCatalog())); }
    catch (error) { return null; }
  }
  function canSee(route) {
    route = text(route);
    var member = projection();
    if (!member) return previous && typeof previous.canSee === 'function' ? !!previous.canSee(route) : false;
    var role = currentRole() || member.activeRole || member.defaultRole;
    if (!role || member.roles.indexOf(role) < 0) return false;
    if (member.modulesRestricted.indexOf(route) >= 0) return false;
    var effective = effectiveModulesFor(role, member);
    if (effective) return effective.indexOf(route) >= 0;
    if (member.modulesExtra.indexOf(route) >= 0) return true;
    return previous && typeof previous.canSee === 'function' ? !!previous.canSee(route) : false;
  }

  window.Orbit.session = Object.freeze(Object.assign({}, previous, {
    canSee: canSee,
    __productMembershipAccessBridgeP0: true
  }));
  window.Orbit.productMembershipAccessBridgeP0 = Object.freeze({
    VERSION: VERSION,
    canSee: canSee,
    membershipSource: 'authenticated_product_projection',
    advisorCollectionRequired: false,
    writesStore: false,
    writesMembership: false
  });
})();
