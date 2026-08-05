/* Orbit 360 · Cambio obligatorio de contraseña */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var modalOpen = false;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function firebaseUser() {
    try { return window.firebase && typeof firebase.auth === 'function' ? firebase.auth().currentUser : null; }
    catch (error) { return null; }
  }
  function projection() {
    try { return Orbit.auth && Orbit.auth.productUser || null; }
    catch (error) { return null; }
  }
  function needsChange() {
    var p = projection();
    return !!(p && (p.mustChangePassword === true || text(p.credentialState).toLowerCase() === 'temporary'));
  }
  function safe(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char];
    });
  }
  function errorMessage(error) {
    var code = text(error && (error.code || error.message)).toLowerCase();
    if (/weak-password/.test(code)) return 'La contraseña no cumple los requisitos de seguridad.';
    if (/requires-recent-login/.test(code)) return 'La sesión debe reiniciarse. Cierra sesión e ingresa nuevamente con la contraseña temporal.';
    if (/network/.test(code)) return 'No fue posible completar el cambio por un problema de conexión.';
    return 'No fue posible guardar la nueva contraseña. Intenta nuevamente.';
  }
  function close() {
    var node = document.getElementById('orbit-password-change-required');
    if (node) node.remove();
    modalOpen = false;
    document.body.classList.remove('credential-change-required');
  }
  function open() {
    if (modalOpen || !needsChange() || !firebaseUser()) return;
    modalOpen = true;
    document.body.classList.add('credential-change-required');
    var user = firebaseUser();
    var node = document.createElement('div');
    node.id = 'orbit-password-change-required';
    node.className = 'drawer-back open';
    node.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(15,18,22,.76);backdrop-filter:blur(5px)';
    node.innerHTML = '<div class="card" style="width:min(520px,94vw);padding:24px;display:grid;gap:14px">' +
      '<div><div class="badge warn" style="margin-bottom:10px">Primer ingreso</div><h2 style="margin:0 0 6px;font-family:var(--f-display)">Crea tu contraseña personal</h2>' +
      '<p class="muted" style="margin:0">Por seguridad debes reemplazar la contraseña temporal antes de usar Orbit 360.</p></div>' +
      '<div class="cfg-note">Usuario: <b>' + safe(user.email || '') + '</b></div>' +
      '<label class="ce-l">Nueva contraseña<input id="orbit-new-password" class="o-sel" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label>' +
      '<label class="ce-l">Confirmar contraseña<input id="orbit-confirm-password" class="o-sel" type="password" autocomplete="new-password"></label>' +
      '<div class="muted" style="font-size:12px">Debe incluir mayúscula, minúscula, número y símbolo. No uses la contraseña temporal.</div>' +
      '<div id="orbit-password-error" class="hint error" style="display:none"></div>' +
      '<button id="orbit-save-password" class="btn primary">Guardar nueva contraseña</button>' +
      '<button id="orbit-password-logout" class="btn ghost">Cerrar sesión</button>' +
      '</div>';
    document.body.appendChild(node);
    node.addEventListener('click', function (event) { if (event.target === node) event.preventDefault(); });
    node.querySelector('#orbit-password-logout').addEventListener('click', function () {
      try { Orbit.auth.logout(); } catch (error) { location.reload(); }
    });
    node.querySelector('#orbit-save-password').addEventListener('click', async function () {
      var button = this;
      var password = String(node.querySelector('#orbit-new-password').value || '');
      var confirmation = String(node.querySelector('#orbit-confirm-password').value || '');
      var errorBox = node.querySelector('#orbit-password-error');
      errorBox.style.display = 'none';
      if (!Orbit.credentialSelfService || !Orbit.credentialSelfService.passwordValid(password)) {
        errorBox.textContent = 'Usa al menos 8 caracteres con mayúscula, minúscula, número y símbolo.';
        errorBox.style.display = '';
        return;
      }
      if (password !== confirmation) {
        errorBox.textContent = 'Las contraseñas no coinciden.';
        errorBox.style.display = '';
        return;
      }
      if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+123\*$/.test(password)) {
        errorBox.textContent = 'La nueva contraseña no puede conservar el patrón temporal.';
        errorBox.style.display = '';
        return;
      }
      try {
        button.disabled = true;
        button.textContent = 'Guardando…';
        await firebaseUser().updatePassword(password);
        await Orbit.credentialSelfService.completePasswordChange();
        close();
        location.reload();
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.style.display = '';
        button.disabled = false;
        button.textContent = 'Guardar nueva contraseña';
      }
    });
  }

  function inspect() {
    if (needsChange()) open();
    else if (modalOpen) close();
  }
  window.addEventListener('orbit:membership-projection', function () { setTimeout(inspect, 0); });
  document.addEventListener('orbit:session', function () { setTimeout(inspect, 0); });
  setInterval(inspect, 500);
})();
