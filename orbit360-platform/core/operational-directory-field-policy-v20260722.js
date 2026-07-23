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
  function allMappings(result) {
    var rows = [];
    [result && result.credentialMappings, result && result.accountMappings, result && result.mappings].forEach(function (part) {
      [].concat(part || []).forEach(function (row) { if (row && rows.indexOf(row) < 0) rows.push(row); });
    });
    return rows;
  }
  function mappingFor(item, result) {
    var mappings = allMappings(result);
    var insurerId = clean(item && item.insurerId, 180);
    var portalId = clean(item && item.portalId, 180);
    var accountId = clean(item && item.accountId, 180);
    return mappings.find(function (mapping) {
      if (insurerId && clean(mapping && mapping.insurerId, 180) !== insurerId) return false;
      if (item.type === 'credential') return portalId && clean(mapping && mapping.portalId, 180) === portalId;
      if (item.type === 'bank_account') return accountId && clean(mapping && mapping.accountId, 180) === accountId;
      return false;
    }) || null;
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
          { policyVersion: VERSION, passwordWrites: 0, providerMappings: allMappings(result).length }
        );
      }
    } catch (error) {}
  }
  function applyOperationalFields(payload, result) {
    if (!result || result.ok !== true || !Orbit.store || typeof Orbit.store.get !== 'function' || typeof Orbit.store.update !== 'function') {
      return { insurersUpdated: 0, usernamesWritten: 0, bankNumbersWritten: 0, credentialRefsWritten: 0, accountRefsWritten: 0, passwordWrites: 0 };
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
    var credentialRefsWritten = 0;
    var accountRefsWritten = 0;

    Object.keys(grouped).forEach(function (insurerId) {
      var insurer = Orbit.store.get('aseguradoras', insurerId);
      if (!insurer) return;
      var portals = [].concat(insurer.portales || []).map(function (row) { return Object.assign({}, row); });
      var accounts = [].concat(insurer.cuentas || []).map(function (row) { return Object.assign({}, row); });
      var changed = false;
      var before = { portales: clone(portals), cuentas: clone(accounts) };

      grouped[insurerId].forEach(function (item) {
        var mapping = mappingFor(item, result);
        if (item.type === 'credential') {
          var username = clean(item.username, 320);
          var portalIndex = indexById(portals, item.portalId);
          if (portalIndex < 0 && Number.isInteger(Number(item.platformIndex))) portalIndex = Number(item.platformIndex);
          if (portalIndex < 0 || !portals[portalIndex]) return;
          if (username) {
            portals[portalIndex].usuario = username;
            portals[portalIndex].usuarioHint = maskRight(username, 3);
            usernamesWritten += 1;
            changed = true;
          }
          var credentialRef = clean(mapping && mapping.credentialRef, 100);
          if (credentialRef) {
            portals[portalIndex].credentialRef = credentialRef;
            credentialRefsWritten += 1;
            changed = true;
          }
          if (username || credentialRef) {
            portals[portalIndex].estadoAcceso = 'Acceso disponible';
            portals[portalIndex].operationalFieldPolicy = VERSION;
          }
          return;
        }
        if (item.type === 'bank_account') {
          var number = clean(item.accountNumber, 320);
          var accountIndex = indexById(accounts, item.accountId);
          if (accountIndex < 0 && Number.isInteger(Number(item.accountIndex))) accountIndex = Number(item.accountIndex);
          if (accountIndex < 0 || !accounts[accountIndex]) return;
          if (number) {
            accounts[accountIndex].numero = number;
            accounts[accountIndex].numeroHint = maskRight(number, 4);
            bankNumbersWritten += 1;
            changed = true;
          }
          var accountRef = clean(mapping && mapping.accountRef, 100);
          if (accountRef) {
            accounts[accountIndex].accountRef = accountRef;
            accountRefsWritten += 1;
            changed = true;
          }
          if (number || accountRef) {
            accounts[accountIndex].estado = number ? 'Cuenta operativa disponible' : 'Pendiente de registrar';
            accounts[accountIndex].operationalFieldPolicy = VERSION;
          }
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

    var summary = {
      insurersUpdated: insurersUpdated,
      usernamesWritten: usernamesWritten,
      bankNumbersWritten: bankNumbersWritten,
      credentialRefsWritten: credentialRefsWritten,
      accountRefsWritten: accountRefsWritten,
      passwordWrites: 0
    };
    try {
      window.dispatchEvent(new CustomEvent('orbit:operational-directory-fields-updated', { detail: Object.assign({ version: VERSION }, summary) }));
    } catch (error) {}
    return summary;
  }
  function scrubLocalPayload(payload) {
    [].concat(payload && payload.items || []).forEach(function (item) {
      if (!item) return;
      item.password = '';
      item.accountNumber = '';
      item.username = '';
    });
  }
  function attach() {
    if (attaching || !Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') return false;
    var current = Orbit.secureImport.importInsurerDirectory;
    if (current.__operationalDirectoryFieldPolicyV20260722 === VERSION) return true;
    attaching = true;
    var wrapped = async function (payload) {
      var enriched = enrichedPayload(payload);
      try {
        var result = await current(payload);
        var applied = applyOperationalFields(enriched, result);
        if (result && typeof result === 'object') result.operationalDirectory = applied;
        return result;
      } finally {
        scrubLocalPayload(enriched);
      }
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
