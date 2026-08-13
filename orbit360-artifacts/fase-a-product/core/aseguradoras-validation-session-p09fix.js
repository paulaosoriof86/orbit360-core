/* ============================================================
   Orbit 360 · Hotfix validación visual Aseguradoras
   Fecha: 2026-07-10

   Sesión temporal solo para host loopback autorizado. No modifica
   core/auth.js, no persiste credenciales y no habilita escrituras.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var params = new URLSearchParams(window.location.search || '');
  var loopback = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  var hostSession = window.__ORBIT_VALIDATION_SESSION__ && window.__ORBIT_VALIDATION_SESSION__.authorized === true;
  var requested = params.get('orbitValidation') === 'aseguradoras' || hostSession;
  if (!requested || !loopback || !hostSession || !Orbit.auth) return;

  var VALIDATION_USER = Object.freeze({
    id: 'orbit-visual-validation',
    uid: 'orbit-visual-validation',
    nombre: 'Validación visual',
    email: '',
    tenantId: 'alianzas-soluciones',
    tenant: 'alianzas-soluciones',
    rol: 'Dirección',
    role: 'Dirección',
    activeRole: 'Dirección',
    rolActivo: 'Dirección',
    roles: ['Dirección', 'AdminTenant', 'Asesor'],
    rolesAsignados: ['Dirección', 'AdminTenant', 'Asesor'],
    tipo: 'interno',
    scope: 'todos',
    validationOnly: true
  });

  function user() {
    return Object.assign({}, VALIDATION_USER, {
      roles: VALIDATION_USER.roles.slice(),
      rolesAsignados: VALIDATION_USER.rolesAsignados.slice()
    });
  }

  function paintIdentity() {
    var name = document.querySelector('#tb-user .who b');
    var role = document.getElementById('tb-rol-lbl');
    var avatar = document.querySelector('#tb-user .av');
    var roleSelect = document.getElementById('rol-sel');
    if (name) name.textContent = 'Validación visual';
    if (role) role.textContent = 'Dirección · sesión temporal';
    if (avatar) avatar.textContent = 'VV';
    if (roleSelect) {
      var option = Array.prototype.find.call(roleSelect.options || [], function (item) {
        return String(item.value || item.textContent || '').toLowerCase().indexOf('direcci') >= 0;
      });
      if (option) roleSelect.value = option.value;
    }
  }

  function showApp() {
    var login = document.getElementById('login');
    if (login) {
      login.classList.add('hidden');
      login.style.display = 'none';
    }
    document.body.classList.remove('pre-auth');

    var old = document.getElementById('orbit-visual-validation-note');
    if (!old) {
      var note = document.createElement('div');
      note.id = 'orbit-visual-validation-note';
      note.setAttribute('role', 'status');
      note.textContent = 'Validación visual temporal · los cambios no se guardarán';
      note.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;padding:9px 14px;border-radius:999px;background:#1E2227;color:#fff;font:600 12px Manrope,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2)';
      document.body.appendChild(note);
    }

    paintIdentity();
    setTimeout(paintIdentity, 100);
    setTimeout(paintIdentity, 500);
    setTimeout(function () {
      try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
      catch (error) { window.dispatchEvent(new Event('hashchange')); }
    }, 0);
  }

  Orbit.auth = Object.assign({}, Orbit.auth, {
    init: function () { showApp(); return true; },
    authed: function () { return true; },
    user: user,
    login: function () { return user(); },
    loginFirebase: function () { return Promise.resolve(user()); },
    showApp: showApp,
    showLogin: showApp,
    logout: function () { window.location.reload(); }
  });

  window.OrbitValidationSession = Object.freeze({
    active: true,
    mode: 'visual-only',
    tenantId: 'alianzas-soluciones',
    writeAllowed: false,
    historyPersistenceAllowed: false,
    cotizadorEnabled: false,
    comparativoEnabled: false
  });
})();