/* ============================================================
   Orbit 360 - Auth LAB Gate local
   Uso: solo index-dev-firestore.html / firestore-lab.
   Objetivo: impedir que una sesion local/demo parezca sesion LAB.
   No contiene passwords. No escribe datos reales.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  var EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';
  var SESSION_KEY = 'orbit360_session';

  function params() {
    try { return new URLSearchParams(window.location.search || ''); } catch (e) { return new URLSearchParams(''); }
  }

  function isLabMode() {
    var p = params();
    var mode = p.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
    var tenantId = p.get('tenant') || (window.OrbitBackend && window.OrbitBackend.tenantId) || '';
    return mode === 'firestore-lab' && tenantId === 'alianzas-soluciones';
  }

  function clearDemoSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function firebaseUser() {
    try {
      if (window.firebase && firebase.auth) return firebase.auth().currentUser || null;
    } catch (e) {}
    return null;
  }

  function syncSession(user) {
    if (!isLabMode()) return null;

    if (!user || user.uid !== EXPECTED_UID) {
      clearDemoSession();
      return null;
    }

    var payload = {
      nombre: 'Orbit LAB',
      rol: 'Dirección',
      email: user.email || EXPECTED_EMAIL,
      uid: user.uid,
      tipo: 'interno',
      authProvider: 'firebase',
      tenantId: 'alianzas-soluciones',
      backendMode: 'firestore-lab'
    };

    try { localStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch (e) {}
    return payload;
  }

  function showLoginNotice() {
    if (!isLabMode()) return;

    clearDemoSession();

    var login = document.getElementById('login');
    if (login) {
      login.style.display = '';
      login.classList.remove('hidden');
    }

    document.body.classList.add('pre-auth');

    var emailInput = document.getElementById('lg-user') ||
      document.querySelector("input[type='email'], input[name*='email' i], input[id*='email' i]");

    if (emailInput) {
      emailInput.value = EXPECTED_EMAIL;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var existing = document.getElementById('orbit-lab-auth-warning');
    if (existing) return;

    var box = document.createElement('div');
    box.id = 'orbit-lab-auth-warning';
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:#fff8e6;border:1px solid #f0c36d;border-left:5px solid #C5162E;border-radius:10px;padding:12px 14px;font-family:Arial,sans-serif;color:#1E2227;box-shadow:0 8px 24px rgba(0,0,0,.14)';
    box.innerHTML = '<b>Firestore LAB requiere Firebase Auth real.</b><br>La sesión demo/local fue bloqueada para no disfrazar datos demo como backend LAB. Usuario esperado: <code>' + EXPECTED_EMAIL + '</code>.';
    document.body.appendChild(box);
  }

  function showAppIfReady(user) {
    if (!isLabMode()) return false;

    var payload = syncSession(user);
    if (!payload) {
      showLoginNotice();
      return false;
    }

    var login = document.getElementById('login');
    if (login) {
      login.classList.add('hidden');
      setTimeout(function () { login.style.display = 'none'; }, 200);
    }

    var warning = document.getElementById('orbit-lab-auth-warning');
    if (warning) warning.remove();

    document.body.classList.remove('pre-auth');

    try {
      window.dispatchEvent(new CustomEvent('orbit:auth:lab-ready', {
        detail: { uid: user.uid, email: user.email || EXPECTED_EMAIL }
      }));
    } catch (e) {}

    return true;
  }

  function installOverride() {
    if (!isLabMode()) return;
    if (!window.Orbit.auth || window.Orbit.auth.__labGateInstalled) return;

    var original = window.Orbit.auth;

    window.Orbit.auth = Object.assign({}, original, {
      __labGateInstalled: true,

      authed: function () {
        var user = firebaseUser();
        return !!(user && user.uid === EXPECTED_UID);
      },

      user: function () {
        var user = firebaseUser();
        return syncSession(user);
      },

      logout: function () {
        clearDemoSession();
        try {
          if (window.firebase && firebase.auth) {
            firebase.auth().signOut().finally(function () { location.reload(); });
            return;
          }
        } catch (e) {}
        location.reload();
      },

      init: function () {
        clearDemoSession();

        var form = document.getElementById('login-form');
        if (form && !form.__orbitLabBound) {
          form.__orbitLabBound = true;
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            showLoginNotice();
          });
        }

        try {
          if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(function (user) {
              showAppIfReady(user);
            });
          } else {
            showLoginNotice();
          }
        } catch (e) {
          showLoginNotice();
        }
      }
    });
  }

  function tick() {
    if (!isLabMode()) return;
    clearDemoSession();
    installOverride();

    var user = firebaseUser();
    if (!showAppIfReady(user)) showLoginNotice();
  }

  installOverride();

  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(tick, 300);
    setTimeout(tick, 1000);
    setTimeout(tick, 2200);
  });

  try {
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!isLabMode()) return;
        if (!showAppIfReady(user)) showLoginNotice();
      });
    }
  } catch (e) {}
})();
