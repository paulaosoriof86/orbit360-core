/* ============================================================
   Orbit 360 · Proveedor seguro de cuentas bancarias Aseguradoras · LAB
   - usa el mismo backend seguro y la misma sesión autenticada;
   - conserva únicamente accountRef y numeroHint en Orbit.store;
   - amplía la importación del directorio sin crear un flujo paralelo.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};
  if (Orbit.__insurerBankAccountProviderLabV20260721) return;

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '';
  var host = String(window.location.hostname || '').toLowerCase();
  var authorizedHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\.(?:web\.app|firebaseapp\.com)$/i.test(host);
  var TENANT_ID = 'alianzas-soluciones';
  var PROJECT_ID = 'ays-orbit-360-lab';
  var REGION = 'us-central1';
  var ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
  var state = {
    version: '20260721.1',
    tenantId: TENANT_ID,
    fieldProviderRegistered: false,
    importProviderWrapped: false,
    noSecretPersistence: true,
    lastErrorCode: ''
  };

  if (mode !== 'firestore-lab' || tenant !== TENANT_ID || !authorizedHost) return;

  var endpointBase = 'https://' + REGION + '-' + PROJECT_ID + '.cloudfunctions.net/';

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max || 512);
  }

  function norm(value) {
    return clean(value, 120).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function activeRole() {
    try { return clean(Orbit.session && Orbit.session.rol && Orbit.session.rol(), 80); } catch (error) { return ''; }
  }

  function authUser() {
    try { if (window.firebase && typeof firebase.auth === 'function') return firebase.auth().currentUser || null; } catch (error) {}
    try { return window.auth && auth.currentUser || null; } catch (error) {}
    return null;
  }

  function providerError(code, message) {
    var error = new Error(clean(message || 'No fue posible completar la operación segura.', 240));
    error.code = clean(code || 'secure_provider_error', 80).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return error;
  }

  async function callable(name, data) {
    var user = authUser();
    if (!user || typeof user.getIdToken !== 'function') throw providerError('unauthenticated', 'La sesión segura no está disponible.');
    var token = await user.getIdToken();
    var response;
    try {
      response = await fetch(endpointBase + name, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ data: Object.assign({ tenantId: TENANT_ID, activeRole: activeRole() }, data || {}) }),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });
    } catch (error) {
      state.lastErrorCode = 'network_unavailable';
      throw providerError('network_unavailable', 'No fue posible conectar con el servicio seguro.');
    }
    var body = {};
    try { body = await response.json(); } catch (error) {}
    if (!response.ok || body.error) {
      var status = body && body.error && body.error.status || ('http_' + response.status);
      state.lastErrorCode = norm(status) || 'secure_provider_error';
      throw providerError(state.lastErrorCode, body && body.error && body.error.message || 'La operación segura fue rechazada.');
    }
    state.lastErrorCode = '';
    return body.result !== undefined ? body.result : body.data !== undefined ? body.data : body.response;
  }

  function resolveTarget(ref, extra) {
    extra = extra || {};
    var insurerId = clean(extra.insurerId || extra.aseguradoraId, 160);
    var accountId = clean(extra.accountId || extra.resourceId, 160);
    if (insurerId && accountId) return { insurerId: insurerId, accountId: accountId };
    try {
      var insurers = Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : [];
      for (var i = 0; i < insurers.length; i += 1) {
        var accounts = insurers[i].cuentas || [];
        for (var j = 0; j < accounts.length; j += 1) {
          if (clean(accounts[j].accountRef, 80) !== clean(ref, 80)) continue;
          return { insurerId: clean(insurers[i].id, 160), accountId: clean(accounts[j].id || String(j), 160) };
        }
      }
    } catch (error) {}
    return { insurerId: insurerId, accountId: accountId };
  }

  function status(ref, extra) {
    var target = resolveTarget(ref, extra);
    var available = ACCOUNT_REF_RE.test(clean(ref, 80)) && !!target.insurerId && !!target.accountId;
    return {
      status: available ? 'disponible' : (clean(ref, 80) === 'backend_required' ? 'pendiente_conexion' : 'sin_referencia'),
      available: available,
      revealAvailable: available,
      copyAvailable: available,
      requiresReauth: true,
      message: available ? 'Cuenta protegida disponible' : 'Vinculación segura pendiente'
    };
  }

  async function reveal(ref, extra) {
    var target = resolveTarget(ref, extra);
    if (!ACCOUNT_REF_RE.test(clean(ref, 80)) || !target.insurerId || !target.accountId) {
      return { ok: false, status: 'sin_referencia', message: 'La cuenta todavía no tiene referencia segura.' };
    }
    return callable('orbit360RevealInsurerBankAccount', {
      accountRef: clean(ref, 80),
      insurerId: target.insurerId,
      accountId: target.accountId
    });
  }

  async function copy(ref, extra) {
    var target = resolveTarget(ref, extra);
    if (!ACCOUNT_REF_RE.test(clean(ref, 80)) || !target.insurerId || !target.accountId) {
      return { ok: false, status: 'sin_referencia', message: 'La cuenta todavía no tiene referencia segura.' };
    }
    var result = await callable('orbit360CopyInsurerBankAccount', {
      accountRef: clean(ref, 80),
      insurerId: target.insurerId,
      accountId: target.accountId
    });
    var copied = false;
    try {
      if (result && result.value && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result.value);
        copied = true;
      }
    } catch (error) {}
    if (result && typeof result === 'object') delete result.value;
    return { ok: copied, status: copied ? 'copied' : 'clipboard_unavailable' };
  }

  function resolveImportTarget(item) {
    item = item || {};
    var sheet = clean(item.insurerSheet, 240);
    var accountIndex = Number(item.accountIndex);
    var insurers = [];
    try { insurers = Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : []; } catch (error) {}
    var insurer = insurers.find(function (row) {
      if (sheet && clean(row && row.fuenteDirectorio && row.fuenteDirectorio.hoja, 240) === sheet) return true;
      return (row && row.cuentas || []).some(function (account) {
        return sheet && clean(account && account.fuenteTraza && account.fuenteTraza.hoja, 240) === sheet;
      });
    });
    if (!insurer) return { insurerId: '', accountId: '' };
    var accounts = insurer.cuentas || [];
    var account = Number.isInteger(accountIndex) && accountIndex >= 0 ? accounts[accountIndex] : null;
    if (!account || (sheet && clean(account.fuenteTraza && account.fuenteTraza.hoja, 240) !== sheet)) {
      account = accounts.find(function (row) {
        return sheet && clean(row && row.fuenteTraza && row.fuenteTraza.hoja, 240) === sheet;
      }) || null;
    }
    return {
      insurerId: clean(insurer.id, 160),
      accountId: clean(account && (account.id || String(accounts.indexOf(account))), 160)
    };
  }

  function applyMappings(result) {
    var mappings = result && Array.isArray(result.mappings) ? result.mappings : [];
    var grouped = {};
    mappings.forEach(function (mapping) {
      var insurerId = clean(mapping && mapping.insurerId, 160);
      if (!insurerId) return;
      (grouped[insurerId] = grouped[insurerId] || []).push(mapping);
    });
    Object.keys(grouped).forEach(function (insurerId) {
      var insurer = Orbit.store && Orbit.store.get ? Orbit.store.get('aseguradoras', insurerId) : null;
      if (!insurer) return;
      var accounts = (insurer.cuentas || []).map(function (account) { return Object.assign({}, account); });
      grouped[insurerId].forEach(function (mapping) {
        var accountId = clean(mapping.accountId, 160);
        var index = accounts.findIndex(function (account, idx) { return clean(account.id || String(idx), 160) === accountId; });
        if (index < 0) return;
        accounts[index].accountRef = clean(mapping.accountRef, 80);
        accounts[index].estado = mapping.available ? 'Cuenta protegida disponible' : 'Requiere actualización';
        accounts[index].legacyPlaintextPendingMigration = false;
        delete accounts[index].numero;
        delete accounts[index].accountNumber;
      });
      Orbit.store.update('aseguradoras', insurerId, { cuentas: accounts });
    });
    try { window.dispatchEvent(new CustomEvent('orbit:insurer-bank-accounts-updated', { detail: { count: mappings.length, containsSecrets: false } })); } catch (error) {}
    return mappings.length;
  }

  async function importBankAccounts(payload) {
    payload = payload || {};
    var sourceItems = Array.isArray(payload.items) ? payload.items : [];
    var items = sourceItems.filter(function (item) { return item && item.type === 'bank_account'; }).map(function (item) {
      var target = resolveImportTarget(item);
      return {
        insurerId: clean(item.insurerId || target.insurerId, 160),
        accountId: clean(item.accountId || item.resourceId || target.accountId, 160),
        accountRef: ACCOUNT_REF_RE.test(clean(item.accountRef, 80)) ? clean(item.accountRef, 80) : '',
        accountNumber: clean(item.accountNumber, 240),
        bank: clean(item.bank, 160),
        accountType: clean(item.accountType, 120),
        currency: clean(item.currency, 20)
      };
    }).filter(function (item) { return item.insurerId && item.accountId && item.accountNumber; });
    if (!items.length) return { ok: true, status: 'sin_cuentas_mapeadas', imported: 0, mappings: [] };
    try {
      var result = await callable('orbit360ImportInsurerBankAccounts', { items: items });
      applyMappings(result);
      return result;
    } finally {
      items.forEach(function (item) { item.accountNumber = ''; });
      sourceItems.forEach(function (item) { try { item.accountNumber = ''; } catch (error) {} });
    }
  }

  function register() {
    if (!Orbit.secureResources || typeof Orbit.secureResources.registerFieldProvider !== 'function') return false;
    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') return false;

    Orbit.secureResources.registerFieldProvider({ status: status, reveal: reveal, copy: copy });
    state.fieldProviderRegistered = true;

    if (!Orbit.secureImport.__bankAccountsWrappedV20260721) {
      var previousImport = Orbit.secureImport.importInsurerDirectory.bind(Orbit.secureImport);
      Orbit.secureImport.importInsurerDirectory = async function (payload) {
        payload = payload || {};
        var allItems = Array.isArray(payload.items) ? payload.items : [];
        var credentialItems = allItems.filter(function (item) { return item && item.type === 'credential'; });
        var bankItems = allItems.filter(function (item) { return item && item.type === 'bank_account'; });
        var credentialResult = credentialItems.length
          ? await previousImport(Object.assign({}, payload, { items: credentialItems }))
          : { ok: true, imported: 0, mappings: [] };
        var bankResult = bankItems.length
          ? await importBankAccounts(Object.assign({}, payload, { items: bankItems }))
          : { ok: true, imported: 0, mappings: [] };
        var mappings = [].concat(credentialResult.mappings || [], bankResult.mappings || []);
        return {
          ok: credentialResult.ok !== false && bankResult.ok !== false,
          imported: Number(credentialResult.imported || 0) + Number(bankResult.imported || 0),
          mappings: mappings,
          credentialMappings: [].concat(credentialResult.mappings || []),
          accountMappings: [].concat(bankResult.mappings || []),
          containsSecrets: false,
          remoteConfirmationRequired: true
        };
      };
      Orbit.secureImport.__bankAccountsWrappedV20260721 = true;
    }
    Orbit.secureImport.supportsBankAccounts = true;
    Orbit.secureImport.bankAccountProviderVersion = state.version;
    state.importProviderWrapped = true;
    Orbit.__insurerBankAccountProviderLabV20260721 = state;
    try { window.dispatchEvent(new CustomEvent('orbit:insurer-bank-provider-ready', { detail: { version: state.version, tenantId: TENANT_ID } })); } catch (error) {}
    return true;
  }

  var attempts = 0;
  (function waitForOwners() {
    if (register() || attempts++ > 100) return;
    setTimeout(waitForOwners, 100);
  })();
})();
