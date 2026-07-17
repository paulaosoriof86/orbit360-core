/* Orbit 360 · core/client-projection.js
   Proyección CANÓNICA reusable de clientes importados (CL-016).
   Un importador externo (por tenant) puede entregar sinónimos distintos por
   campo; este helper proyecta EN MEMORIA un objeto con las claves canónicas
   sin conocer cada fuente y sin acoplar el renderer al origen.

   Reglas (contrato):
   - NO escribe al store, NO reimporta, NO borra campos de origen.
   - Preserva trazabilidad (fuente/origen) y calidad (alertas).
   - País/moneda NO se inventan (solo se copian si vienen en la fuente).
   - Sin pólizas => estado operativo 'pendiente_polizas'.
   - No crea pólizas, vehículos, cobros ni cartera desde Clientes.

   Reusable por: Cliente 360, búsqueda, Pólizas, Cobros y Calidad.
     Orbit.clientProjection.project(cli)            -> copia con claves canónicas
     Orbit.clientProjection.field(cli, 'telefono')  -> valor canónico puntual
     Orbit.clientProjection.estadoOperativo(cli)     -> estado || 'pendiente_polizas' */
window.Orbit = window.Orbit || {};
Orbit.clientProjection = (function () {
  // canónico -> lista de alias aceptados (en orden de preferencia).
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
  // primer alias con valor no vacío; no inventa nada.
  function pick(src, keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = src ? src[k] : undefined;
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }
  function tienePolizas(cli) {
    if (!cli) return false;
    if (typeof cli.numPolizas === 'number') return cli.numPolizas > 0;
    try {
      if (window.Orbit && Orbit.store && Orbit.store.where) {
        return Orbit.store.where('polizas', function (p) { return p.clienteId === cli.id; }).length > 0;
      }
    } catch (e) {}
    return false;
  }
  // alertas de calidad desde cualquiera de las formas conocidas (sin mutar).
  function alertasCalidad(cli) {
    if (!cli) return [];
    if (Array.isArray(cli.alertasCalidad)) return cli.alertasCalidad;
    if (cli.calidad && Array.isArray(cli.calidad.alertas)) return cli.calidad.alertas;
    if (Array.isArray(cli.alertas)) return cli.alertas;
    return [];
  }
  function estadoOperativo(cli) {
    var e = pick(cli, ALIAS.estado);
    if (e) return e;
    return tienePolizas(cli) ? (cli && cli.estado) || '' : 'pendiente_polizas';
  }
  // Devuelve una COPIA (shallow) con las claves canónicas resueltas.
  // Conserva TODOS los campos de origen (incluida trazabilidad: fuente/origen/importadoDe).
  function project(cli) {
    if (!cli || typeof cli !== 'object') return cli;
    var out = Object.assign({}, cli);
    Object.keys(ALIAS).forEach(function (canon) {
      var v = pick(cli, ALIAS[canon]);
      if (v !== '' || out[canon] === undefined) out[canon] = v || out[canon] || '';
    });
    out.estado = estadoOperativo(cli);
    out.alertasCalidad = alertasCalidad(cli);
    // trazabilidad explícita disponible para consumidores (sin inventar).
    out._proyeccionCanonica = true;
    return out;
  }
  function field(cli, canon) {
    if (!ALIAS[canon]) return cli ? cli[canon] : '';
    return pick(cli, ALIAS[canon]);
  }
  // Acceso visual único: obtiene del store y devuelve una COPIA proyectada. Nunca escribe.
  function get(clienteId) {
    if (!clienteId) return null;
    try {
      var c = (window.Orbit && Orbit.store) ? Orbit.store.get('clientes', clienteId) : null;
      return c ? project(c) : null;
    } catch (e) { return null; }
  }
  return { project: project, get: get, field: field, estadoOperativo: estadoOperativo, alertasCalidad: alertasCalidad, ALIAS: ALIAS };
})();
