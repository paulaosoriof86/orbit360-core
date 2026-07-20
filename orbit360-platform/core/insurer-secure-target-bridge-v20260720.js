/* Orbit 360 · puente de vínculo seguro Aseguradoras LAB.
   Añade únicamente IDs internos de aseguradora/portal a la solicitud remota.
   No lee ni persiste valores protegidos. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__insurerSecureTargetBridgeV20260720) return;

  function clean(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || 240);
  }
  function fold(value) {
    return clean(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function normalizeName(value) {
    try {
      if (Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.normalizeName === 'function') {
        return Orbit.insurerDirectoryImport.normalizeName(value);
      }
    } catch (error) {}
    return fold(value).replace(/\b(aseguradora|seguros|seguro|compania|company|de colombia|de guatemala)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function publicHost(value) {
    var raw = clean(value, 500);
    if (!raw) return '';
    try {
      var url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
      return fold(url.hostname.replace(/^www\./i, ''));
    } catch (error) {
      return fold(raw);
    }
  }
  function insurers() {
    try { return Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : []; }
    catch (error) { return []; }
  }
  function findInsurer(item, rows) {
    var sheet = clean(item && item.insurerSheet);
    var key = normalizeName(sheet);
    var byName = rows.filter(function (row) {
      var candidate = normalizeName(row && row.nombre);
      return key && candidate && (key === candidate || key.indexOf(candidate) >= 0 || candidate.indexOf(key) >= 0);
    });
    if (byName.length === 1) return byName[0];

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
  function findPortal(insurer, item) {
    var rows = (insurer && insurer.portales || []).map(function (portal, index) { return { portal: portal, index: index }; });
    var host = publicHost(item && item.url);
    if (host) {
      var byHost = rows.filter(function (row) {
        return publicHost(row.portal && (row.portal.url || row.portal.urlHint)) === host;
      });
      if (byHost.length === 1) return byHost[0];
    }
    var sheet = clean(item && item.insurerSheet);
    var byTrace = rows.filter(function (row) {
      return clean(row.portal && row.portal.fuenteTraza && row.portal.fuenteTraza.hoja) === sheet;
    });
    var position = Number(item && item.platformIndex);
    if (Number.isInteger(position) && position >= 0 && position < byTrace.length) return byTrace[position];
    if (Number.isInteger(position) && position >= 0 && position < rows.length) return rows[position];
    return rows.length === 1 ? rows[0] : null;
  }
  function enrich(payload) {
    var rows = insurers();
    var items = [].concat(payload && payload.items || []).map(function (item) {
      if (clean(item && item.insurerId) && clean(item && item.portalId)) return item;
      var insurer = findInsurer(item, rows);
      var portal = insurer && findPortal(insurer, item);
      if (!insurer || !portal) return item;
      return Object.assign({}, item, {
        insurerId: clean(insurer.id, 160),
        portalId: clean(portal.portal && (portal.portal.id || String(portal.index)), 160)
      });
    });
    return Object.assign({}, payload || {}, { items: items });
  }
  function attach() {
    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') return false;
    var current = Orbit.secureImport.importInsurerDirectory;
    if (current.__secureTargetBridgeV20260720) return true;
    var wrapped = function (payload) { return current(enrich(payload)); };
    wrapped.__secureTargetBridgeV20260720 = true;
    Orbit.secureImport.importInsurerDirectory = wrapped;
    Orbit.secureImport.targetBridgeVersion = '20260720.1';
    return true;
  }

  Orbit.__insurerSecureTargetBridgeV20260720 = {
    version: '20260720.1',
    attach: attach,
    enrich: enrich,
    noProtectedValueAccess: true
  };
  if (!attach()) {
    window.addEventListener('orbit:insurer-credential-provider-ready', attach, { once: true });
    setTimeout(attach, 0);
  }
})();
