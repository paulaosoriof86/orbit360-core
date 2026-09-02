/* ============================================================
   Orbit 360 · proyección canónica de clientes importados · 2026-07-19

   Propietario reusable:
   - Orbit.clientProjection.project(row) devuelve COPIA canónica;
   - Orbit.clientProjection.get(id) lee Orbit.store y devuelve COPIA;
   - no reimporta, no crea relaciones y no llama insert/update/remove.

   Reparación visual M1:
   - normaliza tipo Persona/Empresa, país GT/CO/REQUIERE_VALIDACION y fechas;
   - acepta códigos regionales fuente 502/57 cuando estén disponibles;
   - marca conflictos país/código como REQUIERE_VALIDACION;
   - evita aplicar la misma proyección repetidamente;
   - conserva estado pendiente_polizas cuando aún no existen relaciones.

   Recovery Fase A · 2026-09-02:
   - el store productivo read-only devuelve copias; no intentar proyectarlas
     "in place" ni reemitir orbit:store:emit porque genera un feedback loop;
   - withReadBatch proyecta copias para renderers aprobados sin escribir store.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var SHAPE_REVISION = '20260731.1-optional-arrays';
  var PROJECTION_MARKER = '20260731.1-temporal';
  var PRODUCT_COPY_SAFE_REVISION = '20260902.1-product-copy-safe';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalized(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function unique(values) { return Array.from(new Set([].concat(values || []).map(clean).filter(Boolean))); }
  function isLegal(value) { return /legal|jurid|empresa|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(normalized(value)); }
  function normalizeType(value, source) {
    var text = normalized(value);
    if (/empresa|jurid|legal|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(text)) return 'Empresa';
    if (/persona|natural|fisic|individual|particular/.test(text)) return 'Persona';
    return isLegal(source && (source.tipoPersona || source.razonSocial || source.nombreEmpresa)) ? 'Empresa' : 'Persona';
  }
  function regionCountry(source) {
    var raw = clean(source && (source.codigoPaisTelefono || source.codRegion || source.codigoRegion || source.regionCode)).replace(/\s/g, '');
    if (/^(\+?57|0057)$/.test(raw)) return 'CO';
    if (/^(\+?502|00502)$/.test(raw)) return 'GT';
    return '';
  }
  function normalizeCountry(value, source) {
    var text = normalized(value);
    var region = regionCountry(source);
    var declared = '';
    if (/^co$|^col$|colombia|colombiano|colombiana/.test(text)) declared = 'CO';
    if (/^gt$|^gtm$|guatemala|guatemalteco|guatemalteca/.test(text)) declared = 'GT';
    if (/requiere validacion|por validar|sin dato|pendiente/.test(text)) return region || 'REQUIERE_VALIDACION';
    if (declared && region && declared !== region) return 'REQUIERE_VALIDACION';
    if (declared) return declared;
    if (region) return region;
    var currency = normalized(source && source.moneda);
    if (currency === 'cop' || /peso colombiano/.test(currency)) return 'CO';
    if (currency === 'gtq' || /quetzal/.test(currency)) return 'GT';
    return source && (source.paisRequiereValidacion || source.monedaRequiereValidacion) ? 'REQUIERE_VALIDACION' : '';
  }
  function normalizeDate(value) {
    if (value == null || value === '') return '';
    try {
      if (value && typeof value.toDate === 'function') value = value.toDate();
      if (value && typeof value === 'object' && Number.isFinite(value.seconds)) value = new Date(value.seconds * 1000);
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
      var raw = clean(value);
      if (!raw || /invalid|n\/a|s\/d|sin fecha/i.test(raw)) return '';
      var iso = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (iso) {
        var isoDate = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
        return Number.isNaN(isoDate.getTime()) ? '' : isoDate.toISOString().slice(0, 10);
      }
      var latam = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
      if (latam) {
        var latamDate = new Date(Date.UTC(+latam[3], +latam[2] - 1, +latam[1]));
        return Number.isNaN(latamDate.getTime()) ? '' : latamDate.toISOString().slice(0, 10);
      }
      var date = new Date(raw);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
    } catch (error) { return ''; }
  }

  var ALIAS = {
    nombre: ['nombre', 'nombreCompleto', 'razonSocial'],
    identificacion: ['identificacion', 'numeroDocumento', 'documento', 'nit'],
    email: ['email', 'correo', 'contactoPrincipalCorreo'],
    telefono: ['telefono', 'whatsapp', 'telefonoAlterno', 'contactoPrincipalTelefono'],
    ciudad: ['ciudad', 'ciudadMunicipio', 'canton'],
    departamento: ['departamento', 'departamentoProvincia', 'provincia'],
    pais: ['pais', 'paisCodigo', 'codigoPais', 'country', 'nacionalidad', 'codigoPaisTelefono', 'codRegion', 'codigoRegion', 'regionCode'],
    fechaAlta: ['fechaAlta', 'fechaAltaOrigen', 'fechaCreacion', 'creadoEn'],
    fechaNac: ['fechaNac', 'fechaNacimiento'],
    driveLink: ['driveLink', 'drive', 'expedienteUrl'],
    estado: ['estado', 'estadoOperativo']
  };

  function pick(src, keys) {
    for (var i = 0; i < keys.length; i++) {
      var value = src ? src[keys[i]] : undefined;
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }
  function hasPolicies(client, context) {
    if (!client) return false;
    if (Number.isFinite(Number(client.numPolizas))) return Number(client.numPolizas) > 0;
    var clientId = clean(client.id);
    if (context && context.policyClientIds instanceof Set) return context.policyClientIds.has(clientId);
    try { return !!(Orbit.store && Orbit.store.find && Orbit.store.find('polizas', function (p) { return clean(p && p.clienteId) === clientId; })); }
    catch (error) { return false; }
  }
  function qualityAlerts(client) {
    if (!client) return [];
    if (Array.isArray(client.alertasCalidad)) return unique(client.alertasCalidad);
    if (client.calidad && Array.isArray(client.calidad.alertas)) return unique(client.calidad.alertas);
    if (Array.isArray(client.alertas)) return unique(client.alertas);
    return [];
  }
  function operationalState(client, context) {
    var state = pick(client, ALIAS.estado);
    if (state) return state;
    return hasPolicies(client, context) ? (clean(client && client.estado) || 'pendiente_polizas') : 'pendiente_polizas';
  }
  function project(client, context) {
    if (!client || typeof client !== 'object') return client;
    var out = Object.assign({}, client);
    Object.keys(ALIAS).forEach(function (canon) {
      var value = pick(client, ALIAS[canon]);
      if (value !== '' || out[canon] === undefined) out[canon] = value || out[canon] || '';
    });
    out.tipo = normalizeType(out.tipo || out.tipoPersona, out);
    out.pais = normalizeCountry(out.pais, out);
    out.fechaAlta = normalizeDate(out.fechaAlta);
    out.fechaNac = normalizeDate(out.fechaNac);
    out.whatsapp = clean(out.whatsapp || out.telefono || out.contactoPrincipalTelefono);
    out.segmento = clean(out.segmento || 'Nuevo');
    out.canal = clean(out.canal || out.canalOrigen || 'Migración');
    out.estado = operationalState(client, context);
    out.estadoOperativo = clean(out.estadoOperativo || out.estado || 'pendiente_polizas');
    out.moneda = clean(out.moneda || (out.pais === 'CO' ? 'COP' : out.pais === 'GT' ? 'GTQ' : ''));
    out.etiquetas = unique(out.etiquetas || []);
    out.contactoAlt = clean(out.contactoAlt || out.contactoPrincipalNombre);
    out.alertasCalidad = qualityAlerts(client);
    out.calidad = Object.assign({}, out.calidad || {}, {
      alertas: out.alertasCalidad,
      estado: clean((out.calidad && out.calidad.estado) || ((out.requiereValidacion || out.paisRequiereValidacion || out.pais === 'REQUIERE_VALIDACION') ? 'REQUIERE_VALIDACION' : 'PENDIENTE_POLIZAS'))
    });
    out._proyeccionCanonica = true;
    return out;
  }
  function field(client, canon) { return ALIAS[canon] ? pick(client, ALIAS[canon]) : (client ? client[canon] : ''); }
  function get(clientId) {
    if (!clientId) return null;
    try { var client = Orbit.store && Orbit.store.get ? Orbit.store.get('clientes', clientId) : null; return client ? project(client) : null; }
    catch (error) { return null; }
  }
  function policyContext(rows) {
    var ids = new Set();
    (rows || []).forEach(function (p) { var id = clean(p && p.clienteId); if (id) ids.add(id); });
    return { policyClientIds: ids };
  }
  function withReadBatch(collections, projector) {
    var names = Array.isArray(collections) ? collections.slice() : [];
    var source = {};
    names.forEach(function (name) {
      try { source[name] = Orbit.store && Orbit.store.all ? (Orbit.store.all(name) || []) : []; }
      catch (error) { source[name] = []; }
    });
    if (names.indexOf('clientes') >= 0) {
      var policies = source.polizas;
      if (!Array.isArray(policies)) {
        try { policies = Orbit.store && Orbit.store.all ? (Orbit.store.all('polizas') || []) : []; }
        catch (error) { policies = []; }
      }
      var context = policyContext(policies);
      source.clientes = (source.clientes || []).map(function (row) { return project(row, context); });
    }
    return typeof projector === 'function' ? projector(source) : source;
  }

  Orbit.clientProjection = {
    version: '20260719.2', shapeRevision: SHAPE_REVISION, runtimeCompatibilityRevision: PRODUCT_COPY_SAFE_REVISION,
    project: project, get: get, field: field, withReadBatch: withReadBatch,
    estadoOperativo: operationalState, alertasCalidad: qualityAlerts,
    normalizeType: normalizeType, normalizeCountry: normalizeCountry, normalizeDate: normalizeDate,
    ALIAS: ALIAS, writesStore: false, reimportsData: false, createsRelations: false
  };

  function signature(row) {
    return JSON.stringify([
      row.nombre,row.identificacion,row.email,row.telefono,row.tipo,row.pais,row.fechaAlta,row.fechaNac,
      row.estadoOperativo,row.moneda,row.segmento,row.canal,
      Array.isArray(row.etiquetas) ? row.etiquetas : '__MISSING_ETIQUETAS_ARRAY__',
      Array.isArray(row.alertasCalidad) ? row.alertasCalidad : '__MISSING_ALERTAS_ARRAY__'
    ]);
  }
  function projectInPlace(row, context) {
    if (!row || typeof row !== 'object') return false;
    var projected = project(row, context);
    var before = signature(row);
    var after = signature(projected);
    if (before !== after || row.__canonicalViewProjection !== PROJECTION_MARKER) {
      Object.assign(row, projected);
      row.__canonicalViewProjection = PROJECTION_MARKER;
      return true;
    }
    return false;
  }
  function publishProjectionChange(changed) {
    if (!changed) return;
    try { window.dispatchEvent(new CustomEvent('orbit:store:emit', { detail: { collection: 'clientes', source: 'client-canonical-view-projection', shapeRevision: SHAPE_REVISION } })); }
    catch (error) {}
  }
  function productCopyStore() {
    return !!(Orbit.store && Orbit.store.__productReadOnlyP0 === true);
  }
  function applyAll() {
    var rows = [];
    var changed = 0;
    try { rows = Orbit.store && Orbit.store.all ? (Orbit.store.all('clientes') || []) : []; } catch (error) {}
    var policyClientIds = new Set();
    try { (Orbit.store && Orbit.store.all ? (Orbit.store.all('polizas') || []) : []).forEach(function (p) { var id = clean(p && p.clienteId); if (id) policyClientIds.add(id); }); } catch (error) {}
    var context = { policyClientIds: policyClientIds };

    if (productCopyStore()) {
      return { total: rows.length, changed: 0, projectedCopies: rows.length, shapeRevision: SHAPE_REVISION, runtimeCompatibilityRevision: PRODUCT_COPY_SAFE_REVISION };
    }

    rows.forEach(function (row) { if (projectInPlace(row, context)) changed += 1; });
    if (changed) {
      publishProjectionChange(changed);
      try { if (window.OrbitLabCanonicalViewSync && typeof OrbitLabCanonicalViewSync.schedule === 'function') OrbitLabCanonicalViewSync.schedule('clientes'); }
      catch (error) {}
    }
    return { total: rows.length, changed: changed, shapeRevision: SHAPE_REVISION, runtimeCompatibilityRevision: PRODUCT_COPY_SAFE_REVISION };
  }

  window.addEventListener('orbit:store:emit', function (event) {
    var collection = event && event.detail && event.detail.collection;
    var source = event && event.detail && event.detail.source;
    if (source === 'client-canonical-view-projection') return;
    if (!collection || collection === '*' || collection === 'clientes' || collection === 'asesores') setTimeout(applyAll, 0);
  });
  window.addEventListener('hashchange', function () { setTimeout(applyAll, 0); });
  window.addEventListener('orbit:lab:canonical-view-hydrated', function () { setTimeout(applyAll, 0); });
  document.addEventListener('orbit:session', function () { setTimeout(applyAll, 0); });

  Orbit.clientCanonicalViewProjectionV20260716 = {
    version: '20260719.2', shapeRevision: SHAPE_REVISION, runtimeCompatibilityRevision: PRODUCT_COPY_SAFE_REVISION,
    project: projectInPlace, projectCopy: project, withReadBatch: withReadBatch, applyAll: applyAll,
    temporaryInPlaceBridge: true, productCopyStoreSafe: true,
    writesStore: false, reimportsData: false, replacesRenderer: false
  };

  setTimeout(function () { var result = applyAll(); if (!result.total) setTimeout(applyAll, 500); }, 0);
})();
