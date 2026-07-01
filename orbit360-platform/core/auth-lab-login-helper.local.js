/* ============================================================
   Orbit 360 - Auth LAB Login Helper local
   Uso: solo index-dev-firestore.html / firestore-lab.
   Objetivo:
   - Forzar email LAB orbit.lab@demo.com.
   - Evitar autocompletado admin@demo.com/demo.
   - Agregar botón seguro para enviar reset password Firebase.
   - No guarda passwords ni secretos.
   ============================================================ */
(function () {
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

  function emailInput() {
    return document.getElementById('lg-user') ||
      document.querySelector("input[type='email'], input[name*='email' i], input[id*='email' i], input[type='text']");
  }

  function passInput() {
    return document.getElementById('lg-pass') ||
      document.querySelector("input[type='password'], input[name*='pass' i], input[id*='pass' i]");
  }

  function errorBox() {
    var el = document.getElementById('login-error') || document.getElementById('orbit-lab-login-error');
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

  function showMessage(msg, ok) {
    var el = errorBox();
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
    el.style.color = ok ? '#166534' : '#9b1122';
    el.style.background = ok ? '#dcfce7' : '#fee8ec';
    el.style.borderColor = ok ? '#86efac' : '#f5b8c0';
  }

  function forceLabEmail() {
    if (!isLabMode()) return;

    clearDemoSession();

    var input = emailInput();
    if (!input) return;

    if (input.value !== EXPECTED_EMAIL) {
      input.value = EXPECTED_EMAIL;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    input.setAttribute('readonly', 'readonly');
    input.setAttribute('autocomplete', 'username');
    input.style.background = '#f7f7f7';
    input.title = 'Usuario fijo para Firebase LAB';
  }

  async function sendReset() {
    if (!isLabMode()) return;

    try {
      if (!(window.firebase && firebase.auth)) {
        showMessage('Firebase Auth todavía no está listo. Espera unos segundos y vuelve a intentar.', false);
        return;
      }

      await firebase.auth().sendPasswordResetEmail(EXPECTED_EMAIL);
      showMessage('Se envió un correo de restablecimiento para ' + EXPECTED_EMAIL + '. Revisa el buzón autorizado.', true);
    } catch (e) {
      var code = e && e.code ? e.code : '';
      var msg = 'No se pudo enviar el restablecimiento LAB.';
      if (code === 'auth/user-not-found') msg = 'El usuario LAB no existe en Firebase Auth.';
      if (code === 'auth/too-many-requests') msg = 'Firebase bloqueó temporalmente los intentos. Espera unos minutos.';
      if (code === 'auth/network-request-failed') msg = 'Firebase no respondió. Revisa conexión o extensiones del navegador.';
      showMessage(msg + (code ? ' Código: ' + code : ''), false);
      console.warn('[Orbit LAB Helper] reset failed', code, e);
    }
  }

  function installResetButton() {
    if (!isLabMode()) return;

    var form = document.getElementById('login-form') || document.querySelector('form');
    if (!form) return;
    if (document.getElementById('orbit-lab-reset-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'orbit-lab-reset-btn';
    btn.type = 'button';
    btn.textContent = 'Enviar restablecimiento contraseña LAB';
    btn.style.cssText = 'margin-top:10px;width:100%;border:1px solid #D9DDE2;background:#fff;color:#575F69;border-radius:8px;padding:9px 12px;font-family:Arial,sans-serif;font-size:13px;cursor:pointer;';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      sendReset();
    });

    form.appendChild(btn);
  }

  function installSubmitGuard() {
    if (!isLabMode()) return;

    var form = document.getElementById('login-form') || document.querySelector('form');
    if (!form || form.__orbitLabHelperBound) return;

    form.__orbitLabHelperBound = true;

    form.addEventListener('submit', function () {
      forceLabEmail();

      var p = passInput();
      if (!p || !p.value) {
        showMessage('Falta la contraseña Firebase LAB. No se guarda ni se documenta.', false);
      }
    }, true);
  }

  function tick() {
    if (!isLabMode()) return;
    forceLabEmail();
    installResetButton();
    installSubmitGuard();
  }

  window.addEventListener('DOMContentLoaded', function () {
    tick();
    setTimeout(tick, 250);
    setTimeout(tick, 750);
    setTimeout(tick, 1500);
    setTimeout(tick, 3000);

    try {
      setInterval(tick, 1500);
    } catch (e) {}
  });

  tick();
})();
