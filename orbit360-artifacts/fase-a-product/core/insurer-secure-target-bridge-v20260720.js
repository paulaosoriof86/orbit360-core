/* Orbit 360 · resolución canónica de destinos protegidos de Aseguradoras.
   Vincula cada recurso sensible con una identidad estable antes de llamar
   al proveedor. El proveedor devuelve mappings; no modifica el directorio. */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};
  if (Orbit.__insurerSecureTargetBridgeV20260720) return;

  var CREDENTIAL_REF_RE = /^cred_[a-f0-9]{32}$/;
  var ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\u00a0/g, ' ').trim().slice(0, max || 512);
  }
  function fold(value) {
    return clean(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function compact(value) { return fold(value).replace(/\s+/g, ''); }
  function normalizeName(value) {
    try {
      if (Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.normalizeName === 'function') {
        return Orbit.insurerDirectoryImport.normalizeName(value);
      }
    } catch (error) {}
    return fold(value)
      .replace(/\b(aseguradora|seguros|seguro|compania|company|de colombia|de guatemala)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function publicHost(value) {
    var raw = clean(value, 600);
    if (!raw) return '';
    try {
      var url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
      return fold(url.hostname.replace(/^www\./i, ''));
    } catch (error) { return fold(raw); }
  }
  function digits(value) { return clean(value, 320).replace(/[^0-9]/g, ''); }
  function last4(value) {
    var only = digits(value);
    return only ? only.slice(-4) : '';
  }
  function rowSheet(row) {
    return clean(row && row.fuenteTraza && row.fuenteTraza.hoja || row && row.source && row.source.sheet, 240);
  }
  function rowNumber(row) {
    var value = row && row.fuenteTraza && row.fuenteTraza.fila;
    if (value == null) value = row && row.source && row.source.row;
    return Number(value || 0);
  }
  function candidateResourceId(prefix, sheet, position) {
    var key = compact(sheet).slice(0, 24) || 'sheet';
    var number = Math.max(0, Number(position) || 0) + 1;
    return prefix + '_' + key + '_' + String(number).padStart(2, '0');
  }
  function insurers() {
    try { return Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : []; }
    catch (error) { return []; }
  }
  function findInsurer(item, rows) {
    var directId = clean(item && item.insurerId, 160);
    if (directId) {
      var direct = rows.find(function (row) { return clean(row && row.id, 160) === directId; });
      if (direct) return direct;
    }
    var sheet = clean(item && item.insurerSheet, 240);
    var key = normalizeName(sheet);
    var byName = rows.filter(function (row) {
      var candidate = normalizeName(row && row.nombre);
      return key && candidate && (key === candidate || key.indexOf(candidate) >= 0 || candidate.indexOf(key) >= 0);
    });
    if (byName.length === 1) return byName[0];

    var byTrace = rows.filter(function (row) {
      if (clean(row && row.fuenteDirectorio && row.fuenteDirectorio.hoja, 240) === sheet) return true;
      return [].concat(row && row.portales || [], row && row.cuentas || []).some(function (resource) {
        return rowSheet(resource) === sheet;
      });
    });
    if (byTrace.length === 1) return byTrace[0];

    var host = publicHost(item && item.url);
    if (host) {
      var byHost = rows.filter(function (row) {
        return (row && row.portales || []).some(function (portal) {
          return publicHost(portal && (portal.url || portal.urlHint)) === host;
        });
      });
      if (byHost.length === 1) return byHost[0];
    }
    return null;
  }
  function choosePreferred(rows, refField, refRegex) {
    if (!rows.length) return null;
    var protectedRows = rows.filter(function (entry) {
      return refRegex.test(clean(entry.resource && entry.resource[refField], 80));
    });
    if (protectedRows.length === 1) return protectedRows[0];
    return rows.length === 1 ? rows[0] : null;
  }
  function findPortal(insurer, item) {
    var rows = (insurer && insurer.portales || []).map(function (portal, index) {
      return { resource: portal, index: index };
    });
    var directId = clean(item && (item.portalId || item.resourceId), 160);
    if (directId) {
      var direct = rows.find(function (entry) { return clean(entry.resource && (entry.resource.id || String(entry.index)), 160) === directId; });
      if (direct) return direct;
    }
    var sheet = clean(item && item.insurerSheet, 240);
    var sourceRow = Number(item && item.sourceRow || 0);
    if (sheet && sourceRow) {
      var traced = rows.filter(function (entry) { return rowSheet(entry.resource) === sheet && rowNumber(entry.resource) === sourceRow; });
      var tracedPreferred = choosePreferred(traced, 'credentialRef', CREDENTIAL_REF_RE);
      if (tracedPreferred) return tracedPreferred;
    }
    var host = publicHost(item && item.url);
    if (host) {
      var byHost = rows.filter(function (entry) {
        return publicHost(entry.resource && (entry.resource.url || entry.resource.urlHint)) === host;
      });
      var hostPreferred = choosePreferred(byHost, 'credentialRef', CREDENTIAL_REF_RE);
      if (hostPreferred) return hostPreferred;
    }
    var position = Number(item && item.platformIndex);
    var bySheet = rows.filter(function (entry) { return !sheet || rowSheet(entry.resource) === sheet; });
    if (Number.isInteger(position) && position >= 0 && position < bySheet.length) return bySheet[position];
    return rows.length === 1 ? rows[0] : null;
  }
  function accountFingerprint(resource, item) {
    var bank = resource ? resource.banco : item && item.bank;
    var type = resource ? resource.tipo : item && item.accountType;
    var currency = resource ? resource.moneda : item && item.currency;
    var suffix = resource ? last4(resource.numeroHint || resource.numero || resource.accountNumber) : last4(item && item.accountNumber);
    return [fold(bank), fold(type), clean(currency, 20).toUpperCase(), suffix].join('|');
  }
  function findAccount(insurer, item) {
    var rows = (insurer && insurer.cuentas || []).map(function (account, index) {
      return { resource: account, index: index };
    });
    var directId = clean(item && (item.accountId || item.resourceId), 160);
    if (directId) {
      var direct = rows.find(function (entry) { return clean(entry.resource && (entry.resource.id || String(entry.index)), 160) === directId; });
      if (direct) return direct;
    }
    var sheet = clean(item && item.insurerSheet, 240);
    var sourceRow = Number(item && item.sourceRow || 0);
    if (sheet && sourceRow) {
      var traced = rows.filter(function (entry) { return rowSheet(entry.resource) === sheet && rowNumber(entry.resource) === sourceRow; });
      var tracedPreferred = choosePreferred(traced, 'accountRef', ACCOUNT_REF_RE);
      if (tracedPreferred) return tracedPreferred;
    }
    var wanted = accountFingerprint(null, item);
    if (wanted && !wanted.endsWith('|')) {
      var fingerprintMatches = rows.filter(function (entry) { return accountFingerprint(entry.resource, null) === wanted; });
      var fingerprintPreferred = choosePreferred(fingerprintMatches, 'accountRef', ACCOUNT_REF_RE);
      if (fingerprintPreferred) return fingerprintPreferred;
    }
    var position = Number(item && item.accountIndex);
    var bySheet = rows.filter(function (entry) { return !sheet || rowSheet(entry.resource) === sheet; });
    if (Number.isInteger(position) && position >= 0 && position < bySheet.length) return bySheet[position];
    return null;
  }
  function enrich(payload) {
    var rows = insurers();
    var items = [].concat(payload && payload.items || []).map(function (item) {
      if (!item) return item;
      var insurer = findInsurer(item, rows);
      if (!insurer) return item;
      var enriched = Object.assign({}, item, { insurerId: clean(insurer.id, 160) });
      if (item.type === 'credential') {
        var portal = findPortal(insurer, item);
        enriched.portalId = clean(portal && portal.resource && (portal.resource.id || String(portal.index)), 160) ||
          candidateResourceId('platform', item.insurerSheet, item.platformIndex);
      } else if (item.type === 'bank_account') {
        var account = findAccount(insurer, item);
        enriched.accountId = clean(account && account.resource && (account.resource.id || String(account.index)), 160) ||
          candidateResourceId('account', item.insurerSheet, item.accountIndex);
      }
      return enriched;
    });
    return Object.assign({}, payload || {}, { items: items });
  }
  async function callProviderWithoutOperationalWrites(provider, payload) {
    var store = Orbit.store || {};
    var originalUpdate = store.update;
    var originalInsert = store.insert;
    var originalRemove = store.remove;
    var blockedMutations = [];
    function blocked(method, collection, id) {
      if (collection !== 'aseguradoras') {
        var original = method === 'update' ? originalUpdate : method === 'insert' ? originalInsert : originalRemove;
        return typeof original === 'function' ? original.apply(store, Array.prototype.slice.call(arguments, 1)) : null;
      }
      blockedMutations.push({ method: method, collection: collection, id: clean(id, 160) });
      return collection === 'aseguradoras' && id && store.get ? store.get(collection, id) : null;
    }
    if (typeof originalUpdate === 'function') store.update = function (collection, id, patch) { return blocked('update', collection, id, patch); };
    if (typeof originalInsert === 'function') store.insert = function (collection, data) { return blocked('insert', collection, data && data.id, data); };
    if (typeof originalRemove === 'function') store.remove = function (collection, id) { return blocked('remove', collection, id); };
    try {
      var result = await provider(payload);
      if (result && typeof result === 'object') {
        result.providerOperationalWritesBlocked = blockedMutations.length;
        result.providerReturnsMappingsOnly = true;
      }
      return result;
    } finally {
      if (typeof originalUpdate === 'function') store.update = originalUpdate;
      if (typeof originalInsert === 'function') store.insert = originalInsert;
      if (typeof originalRemove === 'function') store.remove = originalRemove;
    }
  }
  function attach() {
    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') return false;
    var current = Orbit.secureImport.importInsurerDirectory;
    if (current.__secureTargetBridgeV20260721MappingsOnly) return true;
    var wrapped = function (payload) {
      return callProviderWithoutOperationalWrites(current, enrich(payload));
    };
    wrapped.__secureTargetBridgeV20260721 = true;
    wrapped.__secureTargetBridgeV20260721MappingsOnly = true;
    Orbit.secureImport.importInsurerDirectory = wrapped;
    Orbit.secureImport.targetBridgeVersion = '20260721.3';
    Orbit.secureImport.providerReturnsMappingsOnly = true;
    Orbit.secureImport.providerOperationalStoreWritesAllowed = false;
    return true;
  }

  Orbit.__insurerSecureTargetBridgeV20260720 = {
    version: '20260721.3',
    attach: attach,
    enrich: enrich,
    findInsurer: findInsurer,
    findPortal: findPortal,
    findAccount: findAccount,
    callProviderWithoutOperationalWrites: callProviderWithoutOperationalWrites,
    noProtectedValuePersistence: true,
    stableTargetsRequired: true,
    providerReturnsMappingsOnly: true,
    providerOperationalStoreWritesAllowed: false
  };
  if (!attach()) {
    window.addEventListener('orbit:insurer-credential-provider-ready', attach);
    window.addEventListener('orbit:insurer-bank-provider-ready', attach);
    setTimeout(attach, 0);
  }
})();
