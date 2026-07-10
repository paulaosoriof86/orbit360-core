/* ============================================================
   Orbit 360 · Aseguradoras P0.2 · Patch visual sensible
   Fecha: 2026-07-10

   Aditivo: decora la ficha existente sin reemplazar el módulo ni guardar
   secretos. Requiere core/aseguradoras-sensitive-p02.js cargado antes.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (window.__orbit360AseguradorasP02Sensitive) return;
  window.__orbit360AseguradorasP02Sensitive = true;

  var rawAccounts = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var timers = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var observer = null;

  function esc(value) {
    try { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(value) : String(value == null ? '' : value); }
    catch (e) { return String(value == null ? '' : value); }
  }

  function api() { return Orbit.aseguradorasSensitiveP02 || null; }
  function actor() { return api() ? api().currentActor() : {}; }

  function toast(message, tone) {
    var node = document.createElement('div');
    node.className = 'ciclo-toast';
    node.textContent = message;
    if (tone === 'error') node.style.background = 'var(--danger,#b42318)';
    document.body.appendChild(node);
    setTimeout(function () { try { node.remove(); } catch (e) {} }, 3200);
  }

  function button(label, title, action, disabled) {
    return '<button type="button" class="btn ghost sm asg-sensitive-action" data-sensitive-action="' + action + '" title="' + esc(title) + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>';
  }

  function currentInsurer() {
    var drawer = document.getElementById('asg-ficha');
    if (!drawer || !Orbit.store) return null;
    var nameInput = drawer.querySelector('#af-nombre');
    var name = nameInput ? String(nameInput.value || '').trim() : '';
    var countryText = '';
    var crumb = drawer.querySelector('.crumb');
    if (crumb) countryText = String(crumb.textContent || '');
    var countryMatch = countryText.match(/\b(GT|CO)\b/i);
    var country = countryMatch ? countryMatch[1].toUpperCase() : '';
    var list = [];
    try { list = Orbit.store.all('aseguradoras') || []; } catch (e) {}
    var exact = list.filter(function (item) {
      return String(item.nombre || '').trim() === name && (!country || item.pais === country);
    });
    return exact.length === 1 ? exact[0] : (exact[0] || null);
  }

  function portalData(insurer, index) {
    var list = insurer && insurer.portales || [];
    return list[index] || {};
  }

  function accountData(insurer, index) {
    var list = insurer && insurer.cuentas || [];
    return list[index] || {};
  }

  function clearTimer(row) {
    if (!timers) return;
    var timer = timers.get(row);
    if (timer) clearTimeout(timer);
    timers.delete(row);
  }

  function decoratePortal(row, insurer) {
    if (!row || row.dataset.p02Sensitive === '1') return;
    row.dataset.p02Sensitive = '1';
    var A = api();
    if (!A) return;
    var index = Number(row.getAttribute('data-portal')) || 0;
    var portal = A.normalizePortal(portalData(insurer, index));
    var view = A.credentialView(portal, actor());
    var passInput = row.querySelector('[data-pp]');
    if (passInput) {
      passInput.value = '';
      passInput.readOnly = true;
      passInput.disabled = true;
      passInput.placeholder = view.display;
      passInput.setAttribute('autocomplete', 'new-password');
      passInput.setAttribute('aria-label', 'Contraseña protegida');
    }
    var status = row.querySelector('.muted');
    if (status) status.textContent = view.allowed
      ? (portal.credentialRef ? 'Credencial registrada · oculta' : 'Sin credencial registrada')
      : 'Acceso restringido por rol';
    var controls = document.createElement('span');
    controls.className = 'asg-sensitive-controls';
    controls.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap';
    controls.innerHTML =
      button('⧉ Usuario', 'Copiar usuario', 'copy-user', !view.canCopyUser) +
      button('👁 Mostrar', 'Mostrar contraseña de forma temporal', 'show-password', !view.canReveal) +
      button('⧉ Clave', 'Copiar contraseña', 'copy-password', !view.canCopyPassword);
    row.insertBefore(controls, row.querySelector('.asg-del'));

    controls.addEventListener('click', async function (event) {
      var target = event.target.closest('[data-sensitive-action]');
      if (!target || target.disabled) return;
      var action = target.dataset.sensitiveAction;
      var reason = 'Acceso operativo al portal de aseguradora';
      if (action === 'copy-user') {
        var copyUser = await A.copySensitive({
          value: portal.usuario,
          store: Orbit.store,
          aseguradoraId: insurer && insurer.id,
          resourceType: 'portal', resourceId: portal.id || String(index), field: 'usuario',
          actor: actor(), reason: reason,
          metadata: { portal: portal.nombre },
          copyFallback: function (value) {
            try { window.prompt('Copia el usuario:', value); return true; } catch (e) { return false; }
          }
        });
        toast(copyUser.ok ? 'Usuario copiado' : 'No fue posible copiar el usuario', copyUser.ok ? '' : 'error');
        return;
      }
      var result = await A.requestCredential({
        store: Orbit.store,
        aseguradoraId: insurer && insurer.id,
        portalId: portal.id || String(index),
        credentialRef: portal.credentialRef,
        field: 'password', actor: actor(), reason: reason
      });
      if (!result.ok) { toast(result.message || 'Credencial no disponible', 'error'); return; }
      if (action === 'show-password') {
        clearTimer(row);
        if (passInput) { passInput.value = result.value; passInput.type = 'text'; }
        target.textContent = '🙈 Ocultar';
        var timer = setTimeout(function () {
          if (passInput) { passInput.value = ''; passInput.type = 'password'; }
          target.textContent = '👁 Mostrar';
        }, 30000);
        if (timers) timers.set(row, timer);
        target.onclick = function () {
          clearTimer(row);
          if (passInput) { passInput.value = ''; passInput.type = 'password'; }
          target.textContent = '👁 Mostrar';
        };
      } else if (action === 'copy-password') {
        var copied = await A.copySensitive({
          value: result.value,
          store: Orbit.store,
          aseguradoraId: insurer && insurer.id,
          resourceType: 'portal', resourceId: portal.id || String(index), field: 'password',
          actor: actor(), reason: reason,
          metadata: { portal: portal.nombre },
          copyFallback: function (value) {
            try { window.prompt('Copia la contraseña:', value); return true; } catch (e) { return false; }
          }
        });
        toast(copied.ok ? 'Contraseña copiada' : 'No fue posible copiar la contraseña', copied.ok ? '' : 'error');
      }
    });
  }

  function maskAccountInput(row, input, A, account) {
    if (!input) return;
    if (rawAccounts && !rawAccounts.has(row)) rawAccounts.set(row, String(input.value || account.numero || ''));
    var raw = rawAccounts ? rawAccounts.get(row) : String(account.numero || '');
    if (!input.disabled && A.canEditSensitive(actor())) {
      input.type = 'text';
      input.value = raw;
      return;
    }
    input.type = 'text';
    input.value = raw ? A.maskAccount(raw) : (account.numeroRef ? '•••• cuenta protegida' : '');
  }

  function decorateAccount(row, insurer) {
    if (!row || row.dataset.p02Sensitive === '1') return;
    row.dataset.p02Sensitive = '1';
    var A = api();
    if (!A) return;
    var index = Number(row.getAttribute('data-cta')) || 0;
    var account = A.normalizeAccount(accountData(insurer, index));
    var view = A.accountView(account, actor());
    var numberInput = row.querySelector('[data-ccn]');
    maskAccountInput(row, numberInput, A, account);
    var controls = document.createElement('span');
    controls.className = 'asg-sensitive-controls';
    controls.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap';
    controls.innerHTML =
      button('👁 Mostrar', 'Mostrar número de cuenta temporalmente', 'show-account', !view.canReveal) +
      button('⧉ Copiar', 'Copiar número de cuenta', 'copy-account', !view.canCopy);
    row.insertBefore(controls, row.querySelector('.asg-del'));

    controls.addEventListener('click', async function (event) {
      var target = event.target.closest('[data-sensitive-action]');
      if (!target || target.disabled) return;
      var result = await A.requestAccountNumber({
        store: Orbit.store,
        aseguradoraId: insurer && insurer.id,
        accountId: account.id || String(index), account: account,
        actor: actor(), reason: 'Consulta operativa de cuenta de aseguradora'
      });
      if (!result.ok) { toast(result.message || 'Cuenta no disponible', 'error'); return; }
      if (target.dataset.sensitiveAction === 'show-account') {
        clearTimer(row);
        if (numberInput) numberInput.value = result.value;
        target.textContent = '🙈 Ocultar';
        var timer = setTimeout(function () {
          if (numberInput) numberInput.value = A.maskAccount(result.value);
          target.textContent = '👁 Mostrar';
        }, 30000);
        if (timers) timers.set(row, timer);
        target.onclick = function () {
          clearTimer(row);
          if (numberInput) numberInput.value = A.maskAccount(result.value);
          target.textContent = '👁 Mostrar';
        };
      } else {
        var copied = await A.copySensitive({
          value: result.value,
          store: Orbit.store,
          aseguradoraId: insurer && insurer.id,
          resourceType: 'cuenta_bancaria', resourceId: account.id || String(index), field: 'numero_cuenta',
          actor: actor(), reason: 'Copia operativa de cuenta de aseguradora',
          metadata: { banco: account.banco, moneda: account.moneda },
          copyFallback: function (value) {
            try { window.prompt('Copia el número de cuenta:', value); return true; } catch (e) { return false; }
          }
        });
        toast(copied.ok ? 'Número de cuenta copiado' : 'No fue posible copiar la cuenta', copied.ok ? '' : 'error');
      }
    });

    if (observer && numberInput) observer.observe(numberInput, { attributes: true, attributeFilter: ['disabled'] });
  }

  function mount() {
    var drawer = document.getElementById('asg-ficha');
    var A = api();
    if (!drawer || !A) return false;
    var insurer = currentInsurer();
    drawer.querySelectorAll('[data-portal]').forEach(function (row) { decoratePortal(row, insurer); });
    drawer.querySelectorAll('[data-cta]').forEach(function (row) { decorateAccount(row, insurer); });
    var note = drawer.querySelector('[data-p02-security-note]');
    if (!note) {
      note = document.createElement('div');
      note.dataset.p02SecurityNote = '1';
      note.className = 'cfg-note';
      note.style.margin = '0 22px 14px';
      note.textContent = A.canViewSensitive(actor())
        ? 'Los accesos y cuentas se muestran bajo demanda. Cada consulta o copia queda auditada sin guardar el valor sensible.'
        : 'Tu rol activo no permite consultar accesos ni cuentas sensibles.';
      var body = drawer.querySelector('.card > div:nth-child(2)');
      if (body) body.insertBefore(note, body.firstChild);
    }
    return true;
  }

  function start() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        return mutation.type === 'childList' || mutation.type === 'attributes';
      });
      if (relevant) setTimeout(mount, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    document.addEventListener('orbit:session', function () { setTimeout(mount, 0); });
    window.addEventListener('hashchange', function () { setTimeout(mount, 0); });
    setTimeout(mount, 0);
  }

  Orbit.aseguradorasP02SensitiveUI = { mount: mount, start: start };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
