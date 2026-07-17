/* ============================================================
   Orbit 360 · proyección canónica de clientes importados · 2026-07-17

   Propietario reusable:
   - Orbit.clientProjection.project(row) devuelve COPIA canónica;
   - Orbit.clientProjection.get(id) lee Orbit.store y devuelve COPIA;
   - no reimporta, no crea relaciones y no llama insert/update/remove.

   Compatibilidad temporal:
   - applyAll() conserva la proyección in-place necesaria para renderers
     antiguos de Cliente 360 mientras se trasladan al helper propietario;
   - debe retirarse cuando Cliente 360/Calidad/Pólizas/Cobros consuman
     Orbit.clientProjection directamente.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function isLegal(value) {
    var text = clean(value).toLowerCase();
    return /legal|jur[ií]d|empresa|sociedad/.test(text);
  }
  function unique(values) {
    return Array.from(new Set([].concat(values || []).map(clean).filter(Boolean)));
  }

  var ALIAS = {
    nombre: ['nombre', 'nombreCompleto', 'razonSocial'],
    identificacion: ['identificacion', 'numeroDocumento', 'documento', 'nit'],
    email: ['email', 'correo', 'contactoPrincipalCorreo'],
    telefono: ['telefono', 'whatsapp', 'telefonoAlterno', 'contactoPrincipalTelefono'],
    ciudad: ['ciudad', 'ciudadMunicipio', 'canton'],
    departamento: ['departamento', 'departamentoProvincia', 'provincia'],
    fechaAlta: ['fechaAlta', 'fechaAltaOrigen'],
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
  function hasPolicies(client) {
    if (!client) return false;
    if (typeof client.numPolizas === 'number') return client.numPolizas > 0;
    try {
      return !!(Orbit.store && Orbit.store.where && Orbit.store.where('polizas', function (p) {
        return p.clienteId === client.id;
      }).length);
    } catch (error) { return false; }
  }
  function qualityAlerts(client) {
    if (!client) return [];
    if (Array.isArray(client.alertasCalidad)) return unique(client.alertasCalidad);
    if (client.calidad && Array.isArray(client.calidad.alertas)) return unique(client.calidad.alertas);
    if (Array.isArray(client.alertas)) return unique(client.alertas);
    return [];
  }
  function operationalState(client) {
    var state = pick(client, ALIAS.estado);
    if (state) return state;
    return hasPolicies(client) ? clean(client && client.estado) : 'pendiente_polizas';
  }
  function project(client) {
    if (!client || typeof client !== 'object') return client;
    var out = Object.assign({}, client);
    Object.keys(ALIAS).forEach(function (canon) {
      var value = pick(client, ALIAS[canon]);
      if (value !== '' || out[canon] === undefined) out[canon] = value || out[canon] || '';
    });
    out.tipo = clean(out.tipo) || (isLegal(out.tipoPersona) || clean(out.razonSocial) ? 'Empresa' : 'Persona');
    out.whatsapp = clean(out.whatsapp || out.telefono || out.contactoPrincipalTelefono);
    out.segmento = clean(out.segmento || 'Nuevo');
    out.canal = clean(out.canal || out.canalOrigen || 'Migración');
    out.estado = operationalState(client);
    out.estadoOperativo = clean(out.estadoOperativo || out.estado || 'pendiente_polizas');
    out.moneda = clean(out.moneda || '');
    out.etiquetas = unique(out.etiquetas || []);
    out.contactoAlt = clean(out.contactoAlt || out.contactoPrincipalNombre);
    out.alertasCalidad = qualityAlerts(client);
    out.calidad = Object.assign({}, out.calidad || {}, {
      alertas: out.alertasCalidad,
      estado: clean((out.calidad && out.calidad.estado) || (out.requiereValidacion ? 'REQUIERE_VALIDACION' : 'PENDIENTE_POLIZAS'))
    });
    out._proyeccionCanonica = true;
    return out;
  }
  function field(client, canon) {
    if (!ALIAS[canon]) return client ? client[canon] : '';
    return pick(client, ALIAS[canon]);
  }
  function get(clientId) {
    if (!clientId) return null;
    try {
      var client = Orbit.store && Orbit.store.get ? Orbit.store.get('clientes', clientId) : null;
      return client ? project(client) : null;
    } catch (error) { return null; }
  }

  Orbit.clientProjection = {
    version: '20260717.1',
    project: project,
    get: get,
    field: field,
    estadoOperativo: operationalState,
    alertasCalidad: qualityAlerts,
    ALIAS: ALIAS,
    writesStore: false,
    reimportsData: false,
    createsRelations: false
  };

  function projectInPlace(row) {
    if (!row || typeof row !== 'object') return row;
    Object.assign(row, project(row));
    row.__canonicalViewProjection = '20260717.1-temporal';
    return row;
  }
  function applyAll() {
    var rows = [];
    try { rows = Orbit.store && Orbit.store.all ? (Orbit.store.all('clientes') || []) : []; } catch (error) {}
    rows.forEach(projectInPlace);
    try {
      if (window.OrbitLabCanonicalViewSync && typeof OrbitLabCanonicalViewSync.schedule === 'function') {
        OrbitLabCanonicalViewSync.schedule('clientes');
      }
    } catch (error) {}
    return rows.length;
  }

  window.addEventListener('orbit:store:emit', function (event) {
    var collection = event && event.detail && event.detail.collection;
    if (!collection || collection === '*' || collection === 'clientes' || collection === 'asesores') setTimeout(applyAll, 0);
  });
  document.addEventListener('orbit:session', function () { setTimeout(applyAll, 0); });

  Orbit.clientCanonicalViewProjectionV20260716 = {
    version: '20260717.1',
    project: projectInPlace,
    projectCopy: project,
    applyAll: applyAll,
    temporaryInPlaceBridge: true,
    writesStore: false,
    reimportsData: false,
    replacesRenderer: false
  };

  setTimeout(applyAll, 0);
  setTimeout(applyAll, 500);
})();
