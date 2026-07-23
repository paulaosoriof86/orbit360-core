/* Orbit 360 · Política canónica de campos del directorio operativo · 2026-07-22
   Usuario de portal y número bancario son datos operativos.
   La contraseña es el único secreto de acceso en este alcance. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '20260722.1';
  var attaching = false;

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max || 512);
  }
  function maskRight(value, visible) {
    var raw = clean(value, 320);
    if (!raw) return '';
    var keep = Math.max(1, Number(visible) || 4);
    return raw.length <= keep ? raw : '*'.repeat(Math.max(4, raw.length - keep)) + raw.slice(-keep);
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return {}; }
  }
  function bridge() {
    return Orbit.__insurerSecureTargetBridgeV20260720 || null;
  }
  function enrichedPayload(payload) {
    var current = bridge();
    try {
      if (current && typeof current.enrich === 'function') return current.enrich(clone(payload || {}));
    } catch (error) {}
    return clone(payload || {});
  }
  function indexById(rows, id) {
    var wanted = clean(id, 180);
    if (!wanted) return -1;
    return [].concat(rows || []).findIndex(function (row, index) {
      return clean(row && (row.id || String(index)), 180) === wanted;
    });
  }
  function audit(before, after, result) {
    try {
      if (Orbit.access && typeof Orbit.access.audit === 'function') {
        Orbit.access.audit(
          'restaurar_campos_operativos_directorio',
          'aseguradoras',
          'operational-directory-' + Date.now().toString(36),
          before,
          after,
          'Confirmación protegida completada; usuario y número permanecen operativos.',
          { policyVersion: VERSION, passwordWrites: 0, providerMappings: [].concat(result && result.mappings || []).length }
        );
      }
    } catch (error) {}
  }
  function applyOperationalFields(payload, result) {
    if (!result || result.ok !== true || !Orbit.store || typeof Orbit.store.get !== 'function' || typeof Orbit.store.update !== 'function') {
      return { insurersUpdated: 0, usernamesWritten: 0, bankNumbersWritten: 0, passwordWrites: 0 };
    }
    var items = [].concat(payload && payload.items || []);
    var grouped = {};
    items.forEach(function (item) {
      var insurerId = clean(item && item.insurerId, 180);
      if (!insurerId) return;
      (grouped[insurerId] = grouped[insurerId] || []).push(item);
    });
    var insurersUpdated = 0;
    var usernamesWritten = 0;
    var bankNumbersWritten = 0;

    Object.keys(grouped).forEach(function (insurerId) {
      var insurer = Orbit.store.get('aseguradoras', insurerId);
      if (!insurer) return;
      var portals = [].concat(insurer.portales || []).map(function (row) { return Object.assign({}, row); });
      var accounts = [].concat(insurer.cuentas || []).map(function (row) { return Object.assign({}, row); });
      var changed = false;
      var before = { portales: clone(portals), cuentas: clone(accounts) };

      grouped[insurerId].forEach(function (item) {
        if (item.type === 'credential') {
          var username = clean(item.username, 320);
          if (!username) return;
          var portalIndex = indexById(portals, item.portalId);
          if (portalIndex < 0 && Number.isInteger(Number(item.platformIndex))) portalIndex = Number(item.platformIndex);
          if (portalIndex < 0 || !portals[portalIndex]) return;
          portals[portalIndex].usuario = username;
          portals[portalIndex].usuarioHint = maskRight(username, 3);
          portals[portalIndex].estadoAcceso = 'Acceso disponible';
          portals[portalIndex].operationalFieldPolicy = VERSION;
          usernamesWritten += 1;
          changed = true;
          return;
        }
        if (item.type === 'bank_account') {
          var number = clean(item.accountNumber, 320);
          if (!number) return;
          var accountIndex = indexById(accounts, item.accountId);
          if (accountIndex < 0 && Number.isInteger(Number(item.accountIndex))) accountIndex = Number(item.accountIndex);
          if (accountIndex < 0 || !accounts[accountIndex]) return;
          accounts[accountIndex].numero = number;
          accounts[accountIndex].numeroHint = maskRight(number, 4);
          accounts[accountIndex].estado = 'Cuenta operativa disponible';
          accounts[accountIndex].operationalFieldPolicy = VERSION;
          bankNumbersWritten += 1;
          changed = true;
        }
      });

      if (!changed) return;
      Orbit.store.update('aseguradoras', insurerId, {
        portales: portals,
        cuentas: accounts,
        operationalDirectoryPolicyVersion: VERSION,
        operationalDirectoryUpdatedAt: new Date().toISOString()
      });
      insurersUpdated += 1;
      audit(before, { portales: clone(portals), cuentas: clone(accounts) }, result);
    });

    try {
      window.dispatchEvent(new CustomEvent('orbit:operational-directory-fields-updated', {
        detail: { insurersUpdated: insurersUpdated, usernamesWritten: usernamesWritten, bankNumbersWritten: bankNumbersWritten, passwordWrites: 0, version: VERSION }
      }));
    } catch (error) {}
    return { insurersUpdated: insurersUpdated, usernamesWritten: usernamesWritten, bankNumbersWritten: bankNumbersWritten, passwordWrites: 0 };
  }
  function attach() {
    if (attaching || !Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') return false;
    var current = Orbit.secureImport.importInsurerDirectory;
    if (current.__operationalDirectoryFieldPolicyV20260722 === VERSION) return true;
    attaching = true;
    var wrapped = async function (payload) {
      var enriched = enrichedPayload(payload);
      var result = await current(payload);
      var applied = applyOperationalFields(enriched, result);
      if (result && typeof result === 'object') result.operationalDirectory = applied;
      return result;
    };
    wrapped.__operationalDirectoryFieldPolicyV20260722 = VERSION;
    wrapped.__wrappedProvider = current;
    Orbit.secureImport.importInsurerDirectory = wrapped;
    attaching = false;
    return true;
  }
  function ensureAttached() {
    attach();
    setTimeout(attach, 0);
    setTimeout(attach, 500);
    setTimeout(attach, 2000);
  }

  Orbit.operationalDirectoryFieldPolicyV20260722 = {
    version: VERSION,
    operationalFields: ['usuario', 'numero'],
    protectedFields: ['password', 'contrasena'],
    usernameOperational: true,
    bankNumberOperational: true,
    passwordProtectedOnly: true,
    accountRefBackupOnly: true,
    credentialRefPasswordOnly: true,
    providerMappingsPreserved: true,
    importerOwnsOperationalWrites: true,
    passwordWrites: 0,
    attach: attach,
    applyOperationalFields: applyOperationalFields
  };
  window.addEventListener('orbit:insurer-credential-provider-ready', ensureAttached);
  window.addEventListener('orbit:insurer-bank-provider-ready', ensureAttached);
  window.addEventListener('orbit:secure-target-bridge-ready', ensureAttached);
  ensureAttached();
})();
