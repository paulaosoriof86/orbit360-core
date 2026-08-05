/* Orbit 360 · Administración de credenciales desde Equipo */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (!Orbit.modules || !Orbit.modules.equipo) return;

  var module = Orbit.modules.equipo;
  var originalEdit = module.editar;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function store() { return Orbit.store; }
  function firstName(value) {
    var clean = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/)[0] || 'Usuario';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  function suggested(record) { return firstName(record && record.nombre) + '123*'; }
  function toast(message) {
    try { if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(message); }
    catch (error) {}
  }
  function canManage() {
    try {
      var user = Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {};
      var role = text(user.rol || user.activeRole);
      return ['Dirección','SuperAdmin','Admin','AdminTenant'].indexOf(role) >= 0;
    } catch (error) { return false; }
  }
  function inject(id) {
    var drawer = document.getElementById('eq-edit');
    if (!drawer || drawer.dataset.credentialAdmin === '1') return;
    drawer.dataset.credentialAdmin = '1';
    var record = id ? store().get('asesores', id) || {} : {};
    var content = drawer.querySelector('.card > div:nth-child(2)');
    if (!content) return;
    var panel = document.createElement('div');
    panel.className = 'cfg-note';
    panel.id = 'eu-credential-panel';
    if (!id) {
      panel.innerHTML = '<b>Contraseña inicial</b><div class="muted" style="margin-top:4px">Después de crear el usuario, abre su ficha para asignar una contraseña temporal. El usuario deberá cambiarla en su primer ingreso.</div>';
      content.insertBefore(panel, content.lastElementChild || null);
      return;
    }
    var pattern = suggested(record);
    panel.innerHTML = '<div style="display:grid;gap:10px">' +
      '<div><b>Credenciales</b><div class="muted" style="font-size:11.5px;margin-top:3px">Administración puede reemplazar la contraseña por una temporal. La contraseña actual nunca se muestra.</div></div>' +
      '<div class="cgrid">' +
      '<label class="ce-l">Contraseña temporal<input id="eu-temp-password" class="o-sel" type="password" autocomplete="new-password" value="' + (Orbit.ui ? Orbit.ui.esc(pattern) : pattern) + '"></label>' +
      '<label class="ce-l">Confirmar contraseña<input id="eu-temp-password-confirm" class="o-sel" type="password" autocomplete="new-password" value="' + (Orbit.ui ? Orbit.ui.esc(pattern) : pattern) + '"></label>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="btn ghost" id="eu-set-temp-password">Asignar contraseña temporal</button><span class="muted" style="font-size:11.5px">Cambio obligatorio en el próximo ingreso.</span></div>' +
      '</div>';
    content.insertBefore(panel, content.lastElementChild || null);
    var button = panel.querySelector('#eu-set-temp-password');
    if (!canManage()) {
      button.disabled = true;
      button.title = 'Requiere Dirección o Administración';
      return;
    }
    button.addEventListener('click', async function () {
      var password = String(panel.querySelector('#eu-temp-password').value || '');
      var confirmation = String(panel.querySelector('#eu-temp-password-confirm').value || '');
      if (!Orbit.credentialSelfService || !Orbit.credentialSelfService.passwordValid(password)) {
        return alert('La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.');
      }
      if (password !== confirmation) return alert('Las contraseñas no coinciden.');
      var reason = window.prompt('Motivo del restablecimiento de contraseña:') || '';
      if (reason.trim().length < 5) return alert('Indica un motivo claro de al menos 5 caracteres.');
      try {
        button.disabled = true;
        button.textContent = 'Asignando…';
        await Orbit.credentialSelfService.setTemporaryPassword({ advisorId:id, temporaryPassword:password, reason:reason });
        toast('Contraseña temporal asignada. El usuario deberá cambiarla al ingresar.');
      } catch (error) {
        var message = Orbit.userOnboarding && Orbit.userOnboarding.message ? Orbit.userOnboarding.message(error) : 'No fue posible asignar la contraseña temporal.';
        toast(message);
      } finally {
        button.disabled = false;
        button.textContent = 'Asignar contraseña temporal';
      }
    });
  }

  module.editar = function (id) {
    var result = originalEdit.apply(this, arguments);
    setTimeout(function () { inject(text(id)); }, 0);
    return result;
  };
})();
