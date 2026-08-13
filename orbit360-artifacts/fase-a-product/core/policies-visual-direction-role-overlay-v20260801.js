/* ============================================================
   Orbit 360 · Vista Dirección para revisión visual de Pólizas
   Sesión efímera read-only. No modifica memberships ni datos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var cfg = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {};
  if (cfg.visualReviewRole !== 'Dirección') return;
  var original = window.Orbit.productRuntimeBrowserProvidersP0;
  if (!original || typeof original.dependencies !== 'function') return;
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return Object.assign({}, value || {}); }
  }
  function dependencies() {
    var deps = original.dependencies();
    var provider = deps && deps.membershipProvider;
    var getByUid = provider && provider.getByUid;
    if (typeof getByUid !== 'function') throw new Error('POLICIES_VISUAL_MEMBERSHIP_PROVIDER_MISSING');
    deps.membershipProvider = {
      getByUid: function (uid, context) {
        return Promise.resolve(getByUid.call(provider, uid, context)).then(function (row) {
          var out = clone(row);
          var roles = [].concat(out.roles || out.rolesAsignados || []);
          if (roles.indexOf('Dirección') < 0) throw new Error('POLICIES_VISUAL_DIRECTION_ROLE_NOT_ASSIGNED');
          out.activeRole = 'Dirección';
          out.rolActivo = 'Dirección';
          return out;
        });
      }
    };
    return deps;
  }
  function lockRoleSelector() {
    var select = document.getElementById('rol-sel');
    if (!select) return;
    var option = Array.from(select.options || []).find(function (item) {
      return String(item.value || '') === 'Dirección' || String(item.textContent || '').trim() === 'Dirección';
    });
    if (option) select.value = option.value;
    select.disabled = true;
    select.setAttribute('aria-label', 'Vista de Dirección para revisión');
    var wrap = document.getElementById('tb-rol');
    if (wrap) wrap.title = 'Vista de Dirección para revisión';
  }
  window.Orbit.productRuntimeBrowserProvidersP0 = Object.freeze(Object.assign({}, original, {
    VERSION: String(original.VERSION || '') + '+policies-visual-direction-20260801',
    dependencies: dependencies,
    visualReviewRole: 'Dirección',
    membershipWrite: false,
    writeAuthorized: false
  }));
  window.addEventListener('orbit:product-readonly-bootstrap', function (event) {
    if (event && event.detail && event.detail.ready === true) setTimeout(lockRoleSelector, 0);
  });
})();
