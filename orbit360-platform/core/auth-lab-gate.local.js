/* ============================================================
   Orbit 360 - Auth LAB Gate local
   Uso: solo index-dev-firestore.html / firestore-lab.
   Objetivo:
   - Bloquear sesion demo/local en Firestore LAB.
   - Permitir login Firebase Auth real con email/password del formulario.
   - No guardar passwords ni secretos.
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

  function authReady() {
    try { return !!(window.firebase && firebase.auth); } catch (e) { return false; }
  }

  function getEmailInput() {
    return document.getElementById('lg-user') ||
      document.querySelector("input[type='email'], input[name*='email' i], input[id*='email' i], input[type='text']");
  }

  function getPasswordInput() {
    return document.getElementById('lg-pass') ||
      document.querySelector("input[type='password'], input[name*='pass' i], input[id*='pass' i]");
  }

  function getErrorBox() {
    var el = document.getElementById('login-error') ||
      document.getElementById('orbit-lab-login-error');

    if (!el) {
      el = document.createElement('div');
      el.id = 'orbit-lab-login-error';
      el.style.cssText = 'margin-top:10px;color:#9b1122;background:#fee8ec;border:1px solid #f5b8c0;border-radius:8px;padding:8px 10px;font-family:Arial,sans-serif;font-size:13px;display:none;';
      var form = document.getElementById('login-form') || document.querySelector('form');
      if (form) form.appendChild(el);
      else document.body.appendChild(el);
    }

    return el;
  }

  function showError(msg) {
    var el = getErrorBox();
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
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

  function setLoginButtonBusy(busy) {
    try {
      var btn = document.querySelector("#login-form button[type='submit'], #login button[type='submit'], button");
      if (!btn) return;
      if (busy) {
        btn.__oldText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Validando Firebase LAB...';
      } else {
        btn.disabled = false;
        if (btn.__oldText) btn.textContent = btn.__oldText;
      }
    } catch (e) {}
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

    var emailInput = getEmailInput();
    if (emailInput && !emailInput.value) {
      emailInput.value = EXPECTED_EMAIL;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var existing = document.getElementById('orbit-lab-auth-warning');
    if (existing) return;

    var box = document.createElement('div');
    box.id = 'orbit-lab-auth-warning';
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:#fff8e6;border:1px solid #f0c36d;border-left:5px solid #C5162E;border-radius:10px;padding:12px 14px;font-family:Arial,sans-serif;color:#1E2227;box-shadow:0 8px 24px rgba(0,0,0,.14)';
    box.innerHTML = '<b>Firestore LAB requiere Firebase Auth real.</b><br>La sesión demo/local fue bloqueada. Usa el usuario LAB autorizado: <code>' + EXPECTED_EMAIL + '</code>. Si Chrome autocompletó la contraseña, presiona Ingresar.';
    document.body.appendChild(box);
  }

  function showAppIfReady(user) {
    if (!isLabMode()) return false;

    var payload = syncSession(user);
    if (!payload) {
      showLoginNotice();
      return false;
    }

    showError('');

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

    try {
      if (window.Orbit && window.Orbit.store && typeof window.Orbit.store._emit === 'function') {
        window.Orbit.store._emit('*');
      }
    } catch (e) {}

    return true;
  }

  async function signInFromForm() {
    if (!isLabMode()) return false;

    clearDemoSession();
    showError('');

    if (!authReady()) {
      showError('Firebase Auth todavía no está listo. Espera unos segundos y vuelve a intentar.');
      return false;
    }

    var emailInput = getEmailInput();
    var passInput = getPasswordInput();

    var email = emailInput && emailInput.value ? String(emailInput.value).trim() : EXPECTED_EMAIL;
    var password = passInput && passInput.value ? String(passInput.value) : '';

    if (!email) {
      showError('Falta el correo LAB.');
      return false;
    }

    if (!password) {
      showError('Falta la contraseña Firebase LAB. No se guarda ni se documenta.');
      return false;
    }

    setLoginButtonBusy(true);

    try {
      var cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      var user = cred && cred.user ? cred.user : firebase.auth().currentUser;

      if (!user || user.uid !== EXPECTED_UID) {
        try { await firebase.auth().signOut(); } catch (e) {}
        clearDemoSession();
        showError('La cuenta ingresada no coincide con el usuario LAB autorizado.');
        showLoginNotice();
        return false;
      }

      showAppIfReady(user);
      return true;
    } catch (e) {
      clearDemoSession();

      var code = e && e.code ? e.code : '';
      var msg = 'No se pudo iniciar sesión Firebase LAB.';

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'Contraseña LAB incorrecta o expirada. Se debe restablecer en Firebase Auth LAB.';
      } else if (code === 'auth/user-not-found') {
        msg = 'El usuario LAB no existe en Firebase Auth LAB.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Firebase bloqueó temporalmente los intentos. Espera unos minutos o restablece contraseña.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Firebase no respondió. Revisa conexión o extensiones del navegador.';
      }

      showError(msg);
      console.warn('[Orbit LAB Auth] login failed', code, e);
      showLoginNotice();
      return false;
    } finally {
      setLoginButtonBusy(false);
    }
  }

  function bindForm() {
    if (!isLabMode()) return;

    var form = document.getElementById('login-form') || document.querySelector('form');
    if (!form || form.__orbitLabRealLoginBound) return;

    form.__orbitLabRealLoginBound = true;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      signInFromForm();
      return false;
    }, true);
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

      login: function () {
        return signInFromForm();
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
        bindForm();

        try {
          if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(function (user) {
              if (!showAppIfReady(user)) showLoginNotice();
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
    bindForm();

    var user = firebaseUser();
    if (!showAppIfReady(user)) showLoginNotice();
  }

  installOverride();

  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(tick, 100);
    setTimeout(tick, 600);
    setTimeout(tick, 1500);
    setTimeout(tick, 3000);
  });

  try {
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!isLabMode()) return;
        if (!showAppIfReady(user)) showLoginNotice();
      });
    }
  } catch (e) {}

  window.Orbit.__labSignIn = signInFromForm;
})();
