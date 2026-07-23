/* Orbit 360 · Owner canónico de edición Aseguradoras · 2026-07-22
   Integra el contrato 1.0.38 en edición sin exponer contraseñas.
   Preserva credentialRef/accountRef y elimina el campo Uso del directorio. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '20260722.1';
  if (Orbit.clientInsurerEditOwnerV20260722 && Orbit.clientInsurerEditOwnerV20260722.version === VERSION) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; } }
  function currentInsurer() {
    try {
      var id = Orbit.route && Orbit.route.params && Orbit.route.params.ficha;
      return id && Orbit.store && Orbit.store.get ? Orbit.store.get('aseguradoras', id) : null;
    } catch (error) { return null; }
  }
  function stableKey(row, index, kind) {
    var id = clean(row && (row.id || row[kind === 'portal' ? 'portalId' : 'accountId']));
    return id || kind + ':' + index;
  }
  function mergeRows(currentRows, nextRows, kind) {
    var current = [].concat(currentRows || []), next = [].concat(nextRows || []);
    var byKey = Object.create(null);
    current.forEach(function (row, index) { byKey[stableKey(row, index, kind)] = row || {}; });
    return next.map(function (row, index) {
      var key = stableKey(row, index, kind);
      var previous = byKey[key] || current[index] || {};
      var merged = Object.assign({}, previous, row || {});
      if (kind === 'portal') {
        var ref = clean(row && row.credentialRef);
        if (!ref || ref === 'backend_required') merged.credentialRef = previous.credentialRef || ref || '';
        merged.usuario = clean(row && row.usuario) || clean(previous.usuario) || clean(previous.user) || clean(previous.login);
        delete merged.password; delete merged.pass; delete merged.contrasena; delete merged.secret;
      } else {
        merged.accountRef = clean(row && row.accountRef) || clean(previous.accountRef);
        merged.numero = clean(row && (row.numero || row.numeroCuenta || row.accountNumber)) || clean(previous.numero || previous.numeroCuenta || previous.accountNumber);
        delete merged.uso;
      }
      return merged;
    });
  }
  function readEditorUsers(root) {
    var values = [];
    if (!root) return values;
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) {
      var index = Number(row.dataset.portal), input = row.querySelector('[data-od-editor-user]');
      if (Number.isInteger(index) && input) values[index] = clean(input.value);
    });
    return values;
  }
  function sanitizePatch(current, patch) {
    var next = Object.assign({}, patch || {});
    var root = document.getElementById('asg-ficha');
    if (Array.isArray(next.portales)) {
      var users = readEditorUsers(root);
      next.portales = next.portales.map(function (row, index) {
        var copy = Object.assign({}, row || {});
        if (users[index] !== undefined) copy.usuario = users[index];
        return copy;
      });
      next.portales = mergeRows(current && current.portales, next.portales, 'portal');
    }
    if (Array.isArray(next.cuentas)) next.cuentas = mergeRows(current && current.cuentas, next.cuentas, 'account');
    return next;
  }
  function installStoreGuard() {
    var store = Orbit.store;
    if (!store || typeof store.update !== 'function') return false;
    if (store.__insurerEditOwnerV20260722 === VERSION) return true;
    var nativeUpdate = store.update.bind(store);
    store.update = function (collection, id, patch) {
      if (collection !== 'aseguradoras') return nativeUpdate(collection, id, patch);
      var current = store.get && store.get(collection, id);
      return nativeUpdate(collection, id, sanitizePatch(current, patch));
    };
    var nativeInsert = typeof store.insert === 'function' ? store.insert.bind(store) : null;
    if (nativeInsert) {
      store.insert = function (collection, payload) {
        if (collection === 'aseguradoras') {
          var copy = Object.assign({}, payload || {});
          var tenantCfg = [].concat(window.OrbitTenantInsurerConfigsP10 || []).find(function (item) {
            var tenant = window.OrbitBackend || window.ORBIT_BACKEND || {};
            return clean(item && item.tenantId) === clean(tenant.tenantId || tenant.tenant);
          }) || {};
          if (tenantCfg.insurersDefaultActive === true && copy.vinculada === undefined) copy.vinculada = true;
          payload = copy;
        }
        return nativeInsert(collection, payload);
      };
    }
    store.__insurerEditOwnerV20260722 = VERSION;
    return true;
  }
  function addSemanticClasses(root) {
    if (!root) return;
    var hero = root.querySelector(':scope > .card > div:first-child');
    if (hero) {
      hero.classList.add('od-insurer-hero');
      var title = hero.querySelector('div[style*="font-size:20px"]') || hero.querySelector('div[style*="font-weight:800"]');
      if (title) title.classList.add('od-page-title');
    }
    root.querySelectorAll('.asg-sec-t').forEach(function (title) { title.classList.add('od-section-title'); });
  }
  function enhanceEditMode(root) {
    if (!root || !root.querySelector('#af-guardar')) return false;
    root.classList.add('od-edit-mode-ready');
    addSemanticClasses(root);
    var insurer = currentInsurer() || {};
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) {
      var index = Number(row.dataset.portal), portal = insurer.portales && insurer.portales[index] || {};
      if (!row.querySelector('[data-od-editor-user]')) {
        var input = document.createElement('input');
        input.className = 'o-sel';
        input.setAttribute('data-od-editor-user', '1');
        input.placeholder = 'Usuario operativo';
        input.value = clean(portal.usuario || portal.user || portal.login);
        input.style.flex = '1';
        var status = row.querySelector('[data-pest]');
        row.insertBefore(input, status || row.lastElementChild);
      }
      row.querySelectorAll('[data-pp],[data-password],input[type="password"]').forEach(function (node) { node.remove(); });
    });
    var portalNote = root.querySelector('#af-portales') && root.querySelector('#af-portales').parentElement.querySelector('.cfg-note');
    if (portalNote) portalNote.innerHTML = '<b>Directorio operativo:</b> el usuario se guarda en la ficha. La contraseña permanece separada en el proveedor seguro y nunca se edita aquí.';
    root.querySelectorAll('#af-cuentas .asg-row[data-cta]').forEach(function (row) {
      var number = row.querySelector('[data-ccn]');
      if (number) {
        number.placeholder = 'Número de cuenta';
        var index = Number(row.dataset.cta), existing = insurer.cuentas && insurer.cuentas[index];
        if (!existing && /^\*{4}\d{4}$/.test(clean(number.value))) {
          number.value = '';
          number.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      var use = row.querySelector('[data-cuso]');
      if (use) use.remove();
    });
    var accountNote = root.querySelector('#af-cuentas') && root.querySelector('#af-cuentas').parentElement.querySelector('.cfg-note');
    if (accountNote) accountNote.innerHTML = '<b>Directorio operativo:</b> el número es visible y editable para roles autorizados. Se preserva la referencia de respaldo y no existe el campo Uso.';
    return true;
  }
  function enhance() {
    installStoreGuard();
    var root = document.getElementById('asg-ficha');
    if (root) {
      addSemanticClasses(root);
      enhanceEditMode(root);
    }
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; enhance(); });
  }
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:store:emit', schedule);
  document.addEventListener('orbit:session', schedule);
  Orbit.clientInsurerEditOwnerV20260722 = {
    version: VERSION,
    editModeReady: true,
    preservesCredentialRef: true,
    preservesAccountRef: true,
    usernameOperationalEditable: true,
    passwordInputForbidden: true,
    bankUseFieldRemoved: true,
    randomMaskedAccountForbidden: true,
    mergeByStableIdentity: true,
    sanitizePatch: sanitizePatch,
    enhance: enhance
  };
  schedule();
})();
