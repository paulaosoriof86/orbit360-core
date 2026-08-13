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

  function hiddenClipboardCopy(value) {
    try {
      var area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand && document.execCommand('copy');
      area.remove();
      return ok !== false;
    } catch (e) { return false; }
  }

  function button(label, title, action, disabled) {
    return '<button type="button" class="btn ghost sm asg-sensitive-action" data-sensitive-action="' + action + '" title="' + esc(title) + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>';
  }

  function currentInsurer() {
    var drawer = document.getElementById('asg-ficha');
    if (!drawer || !Orbit.store) return null;
    var nameInput = drawer.querySelector('#af-nombre');
    var name = nameInput ? String(nameInput.value || '').trim() : '';
    var crumb = drawer.querySelector('.crumb');
    var match = crumb ? String(crumb.textContent || '').match(/\b(GT|CO)\b/i) : null;
    var country = match ? match[1].toUpperCase() : '';
    var list = [];
    try { list = Orbit.store.all('aseguradoras') || []; } catch (e) {}
    var exact = list.filter(function (item) {
      return String(item.nombre || '').trim() === name && (!country || item.pais === country);
    });
    return exact.length === 1 ? exact[0] : (exact[0] || null);
  }

  function portalData(insurer, index) { return (insurer && insurer.portales || [])[index] || {}; }
  function accountData(insurer, index) { return (insurer && insurer.cuentas || [])[index] || {}; }
  function clearTimer(row) {
    if (!timers) return;
    var timer = timers.get(row);
    if (timer) clearTimeout(timer);
    timers.delete(row);
  }

  function hidePortal(row) {
    clearTimer(row);
    var input = row.querySelector('[data-pp]');
    var show = row.querySelector('[data-sensitive-action="show-password"]');
    if (input) { input.value = ''; input.type = 'password'; }
    if (show) { show.dataset.revealed = '0'; show.textContent = '👁 Mostrar'; }
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
      button('👁 Mostrar', 'Mostrar contraseña temporalmente', 'show-password', !view.canReveal) +
      button('⧉ Clave', 'Copiar contraseña', 'copy-password', !view.canCopyPassword);
    row.insertBefore(controls, row.querySelector('.asg-del'));

    controls.addEventListener('click', async function (event) {
      var target = event.target.closest('[data-sensitive-action]');
      if (!target || target.disabled) return;
      var action = target.dataset.sensitiveAction;
      var reason = 'Acceso operativo al portal de aseguradora';
      if (action === 'show-password' && target.dataset.revealed === '1') {
        hidePortal(row);
        return;
      }
      if (action === 'copy-user') {
        var copyUser = await A.copySensitive({
          value: portal.usuario, store: Orbit.store, aseguradoraId: insurer && insurer.id,
          resourceType: 'portal', resourceId: portal.id || String(index), field: 'usuario',
          actor: actor(), reason: reason, metadata: { portal: portal.nombre }, copyFallback: hiddenClipboardCopy
        });
        toast(copyUser.ok ? 'Usuario copiado' : 'No fue posible copiar el usuario', copyUser.ok ? '' : 'error');
        return;
      }
      var result = await A.requestCredential({
        store: Orbit.store, aseguradoraId: insurer && insurer.id,
        portalId: portal.id || String(index), credentialRef: portal.credentialRef,
        field: 'password', actor: actor(), reason: reason
      });
      if (!result.ok) { toast(result.message || 'Credencial no disponible', 'error'); return; }
      if (action === 'show-password') {
        clearTimer(row);
        if (passInput) { passInput.value = result.value; passInput.type = 'text'; }
        target.dataset.revealed = '1';
        target.textContent = '🙈 Ocultar';
        var timer = setTimeout(function () { hidePortal(row); }, 30000);
        if (timers) timers.set(row, timer);
      } else if (action === 'copy-password') {
        var copied = await A.copySensitive({
          value: result.value, store: Orbit.store, aseguradoraId: insurer && insurer.id,
          resourceType: 'portal', resourceId: portal.id || String(index), field: 'password',
          actor: actor(), reason: reason, metadata: { portal: portal.nombre }, copyFallback: hiddenClipboardCopy
        });
        toast(copied.ok ? 'Contraseña copiada' : 'No fue posible copiar la contraseña', copied.ok ? '' : 'error');
      }
    });
  }

  function rawAccount(row, account) {
    if (rawAccounts && !rawAccounts.has(row)) rawAccounts.set(row, String(account.numero || ''));
    return rawAccounts ? rawAccounts.get(row) : String(account.numero || '');
  }

  function syncAccountRow(row, insurer) {
    var A = api();
    if (!A || !row) return;
    var index = Number(row.getAttribute('data-cta')) || 0;
    var account = A.normalizeAccount(accountData(insurer, index));
    var view = A.accountView(account, actor());
    var input = row.querySelector('[data-ccn]');
    if (!input) return;
    var raw = rawAccount(row, account);
    var editing = !input.disabled;
    if (!view.allowed) {
      input.value = 'Acceso restringido';
      input.disabled = true;
      return;
    }
    if (editing && A.canEditSensitive(actor())) {
      input.value = raw;
      return;
    }
    input.value = raw ? A.maskAccount(raw) : (account.numeroRef ? '•••• cuenta protegida' : '');
    if (!A.canEditSensitive(actor())) input.disabled = true;
  }

  function hideAccount(row, insurer) {
    clearTimer(row);
    syncAccountRow(row, insurer);
    var show = row.querySelector('[data-sensitive-action="show-account"]');
    if (show) { show.dataset.revealed = '0'; show.textContent = '👁 Mostrar'; }
  }

  function decorateAccount(row, insurer) {
    if (!row || row.dataset.p02Sensitive === '1') return;
    row.dataset.p02Sensitive = '1';
    var A = api();
    if (!A) return;
    var index = Number(row.getAttribute('data-cta')) || 0;
    var account = A.normalizeAccount(accountData(insurer, index));
    var view = A.accountView(account, actor());
    syncAccountRow(row, insurer);
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
      if (target.dataset.sensitiveAction === 'show-account' && target.dataset.revealed === '1') {
        hideAccount(row, insurer);
        return;
      }
      var result = await A.requestAccountNumber({
        store: Orbit.store, aseguradoraId: insurer && insurer.id,
        accountId: account.id || String(index), account: account,
        actor: actor(), reason: 'Consulta operativa de cuenta de aseguradora'
      });
      if (!result.ok) { toast(result.message || 'Cuenta no disponible', 'error'); return; }
      if (target.dataset.sensitiveAction === 'show-account') {
        clearTimer(row);
        var input = row.querySelector('[data-ccn]');
        if (input) input.value = result.value;
        target.dataset.revealed = '1';
        target.textContent = '🙈 Ocultar';
        var timer = setTimeout(function () { hideAccount(row, insurer); }, 30000);
        if (timers) timers.set(row, timer);
      } else {
        var copied = await A.copySensitive({
          value: result.value, store: Orbit.store, aseguradoraId: insurer && insurer.id,
          resourceType: 'cuenta_bancaria', resourceId: account.id || String(index), field: 'numero_cuenta',
          actor: actor(), reason: 'Copia operativa de cuenta de aseguradora',
          metadata: { banco: account.banco, moneda: account.moneda }, copyFallback: hiddenClipboardCopy
        });
        toast(copied.ok ? 'Número de cuenta copiado' : 'No fue posible copiar la cuenta', copied.ok ? '' : 'error');
      }
    });
  }

  function restoreRawBeforeSnapshot(drawer) {
    drawer.querySelectorAll('[data-portal]').forEach(hidePortal);
    drawer.querySelectorAll('[data-cta]').forEach(function (row) {
      var input = row.querySelector('[data-ccn]');
      if (input) input.value = rawAccounts && rawAccounts.has(row) ? rawAccounts.get(row) : '';
    });
  }

  function resetDecoration() {
    var drawer = document.getElementById('asg-ficha');
    if (!drawer) return;
    drawer.querySelectorAll('.asg-sensitive-controls').forEach(function (node) { node.remove(); });
    drawer.querySelectorAll('[data-p02-sensitive]').forEach(function (row) {
      clearTimer(row);
      delete row.dataset.p02Sensitive;
    });
    var note = drawer.querySelector('[data-p02-security-note]');
    if (note) note.remove();
  }

  function mount() {
    var drawer = document.getElementById('asg-ficha');
    var A = api();
    if (!drawer || !A) return false;
    var insurer = currentInsurer();
    drawer.querySelectorAll('[data-portal]').forEach(function (row) { decoratePortal(row, insurer); });
    drawer.querySelectorAll('[data-cta]').forEach(function (row) {
      decorateAccount(row, insurer);
      syncAccountRow(row, insurer);
    });
    var note = drawer.querySelector('[data-p02-security-note]');
    if (!note) {
      note = document.createElement('div');
      note.dataset.p02SecurityNote = '1';
      note.className = 'cfg-note';
      note.style.margin = '0 22px 14px';
      var A2 = api();
      note.textContent = A2.canViewSensitive(actor())
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
      if (mutations.some(function (mutation) { return mutation.type === 'childList'; })) setTimeout(mount, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('#af-editar') : null;
      if (target) setTimeout(mount, 0);
    });
    document.addEventListener('click', function (event) {
      var save = event.target && event.target.closest ? event.target.closest('#af-save') : null;
      if (!save) return;
      var drawer = document.getElementById('asg-ficha');
      if (drawer) restoreRawBeforeSnapshot(drawer);
    }, true);
    document.addEventListener('orbit:session', function () {
      resetDecoration();
      setTimeout(mount, 0);
    });
    window.addEventListener('hashchange', function () { setTimeout(mount, 0); });
    setTimeout(mount, 0);
  }

  Orbit.aseguradorasP02SensitiveUI = { mount: mount, start: start, reset: resetDecoration };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
