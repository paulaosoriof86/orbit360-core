/* ============================================================
   Orbit 360 · proyección canónica de clientes importados · 2026-07-16
   Contrato reusable y aditivo:
   - adapta en memoria campos normalizados del importador al contrato
     visual del CRM aprobado;
   - no escribe, no reimporta y no sustituye Orbit.store;
   - preserva trazabilidad, calidad y campos de origen;
   - permite que Cliente 360, Pólizas, Cobros y búsqueda reutilicen
     el mismo cliente mientras se completa la migración por fuentes.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.clientCanonicalViewProjectionV20260716) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function isLegal(value) {
    var text = clean(value).toLowerCase();
    return /legal|jur[ií]d|empresa|sociedad/.test(text);
  }
  function unique(values) {
    return Array.from(new Set([].concat(values || []).map(clean).filter(Boolean)));
  }
  function project(row) {
    if (!row || typeof row !== 'object') return row;

    row.nombre = clean(row.nombre || row.nombreCompleto || row.razonSocial);
    row.tipo = clean(row.tipo) || (isLegal(row.tipoPersona) || clean(row.razonSocial) ? 'Empresa' : 'Persona');
    row.identificacion = clean(row.identificacion || row.numeroDocumento || row.documento || row.nit);
    row.email = clean(row.email || row.correo || row.contactoPrincipalCorreo);
    row.telefono = clean(row.telefono || row.whatsapp || row.telefonoAlterno || row.contactoPrincipalTelefono);
    row.whatsapp = clean(row.whatsapp || row.telefono || row.contactoPrincipalTelefono);
    row.ciudad = clean(row.ciudad || row.ciudadMunicipio || row.canton);
    row.departamento = clean(row.departamento || row.departamentoProvincia || row.provincia);
    row.direccion = clean(row.direccion);
    row.fechaAlta = clean(row.fechaAlta || row.fechaAltaOrigen);
    row.fechaNac = clean(row.fechaNac || row.fechaNacimiento);
    row.segmento = clean(row.segmento || 'Nuevo');
    row.canal = clean(row.canal || row.canalOrigen || 'Migración');
    row.estado = clean(row.estado || row.estadoOperativo || 'pendiente_polizas');
    row.estadoOperativo = clean(row.estadoOperativo || row.estado || 'pendiente_polizas');
    row.moneda = clean(row.moneda || (row.pais === 'CO' ? 'COP' : row.pais === 'GT' ? 'GTQ' : ''));
    row.etiquetas = unique(row.etiquetas || []);
    row.contactoAlt = clean(row.contactoAlt || row.contactoPrincipalNombre);
    row.driveLink = clean(row.driveLink || row.drive || row.expedienteUrl);

    var alerts = unique(row.alertasCalidad || (row.calidad && row.calidad.alertas) || []);
    row.alertasCalidad = alerts;
    row.calidad = Object.assign({}, row.calidad || {}, {
      alertas: alerts,
      estado: clean((row.calidad && row.calidad.estado) || (row.requiereValidacion ? 'REQUIERE_VALIDACION' : 'PENDIENTE_POLIZAS'))
    });

    row.__canonicalViewProjection = '20260716.1';
    return row;
  }

  function applyAll() {
    var rows = [];
    try { rows = Orbit.store && Orbit.store.all ? (Orbit.store.all('clientes') || []) : []; } catch (error) {}
    rows.forEach(project);
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
    version: '20260716.1',
    project: project,
    applyAll: applyAll,
    writesStore: false,
    reimportsData: false,
    replacesRenderer: false
  };

  setTimeout(applyAll, 0);
  setTimeout(applyAll, 500);
})();
