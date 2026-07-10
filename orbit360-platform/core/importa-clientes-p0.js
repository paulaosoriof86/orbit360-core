/* ============================================================
   Orbit 360 · P0 normalizacion reusable de clientes
   Fecha: 2026-07-09

   Modulo puro y aditivo. No escribe datos, no contiene payload real
   y no hardcodea asesores de un tenant. Las reglas particulares se
   reciben por contexto/configuracion.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9@.+ ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clean(value) { return String(value == null ? '' : value).trim(); }

  function resolveCountry(raw, ctx) {
    const n = norm(raw || (ctx && ctx.defaultCountry) || '');
    if (n === 'gt' || n === 'gtm' || n.includes('guatemala')) return 'GT';
    if (n === 'co' || n === 'col' || n.includes('colombia')) return 'CO';
    return '';
  }

  function resolveCurrency(raw, country, ctx) {
    const n = norm(raw || (ctx && ctx.defaultCurrency) || '');
    if (n === 'gtq' || n.includes('quetzal')) return 'GTQ';
    if (n === 'cop' || n.includes('peso')) return 'COP';
    if (n === 'usd' || n.includes('dolar')) return 'USD';
    if (country === 'GT') return 'GTQ';
    if (country === 'CO') return 'COP';
    return '';
  }

  function personType(input) {
    const n = norm(input.tipoPersona || input.tipo || input.persona || '');
    if (/jurid|empresa|sociedad|legal/.test(n) || clean(input.razonSocial)) return 'legal';
    return 'natural';
  }

  function fullName(input) {
    return clean(input.nombreCompleto || input.nombre || [input.nombres, input.apellidoPaterno, input.apellidoMaterno].filter(Boolean).join(' ') || input.razonSocial);
  }

  function normalizeAdvisor(raw, ctx) {
    const value = clean(raw);
    const aliases = (ctx && ctx.advisorAliases) || {};
    const active = (ctx && ctx.activeAdvisors) || [];
    const fallback = (ctx && ctx.temporaryAdvisor) || '';
    const key = norm(value);
    const aliasKeys = Object.keys(aliases);
    for (let i = 0; i < aliasKeys.length; i++) {
      if (norm(aliasKeys[i]) === key) return { advisor: aliases[aliasKeys[i]], temporary: false, requiresValidation: false, raw: value };
    }
    for (let i = 0; i < active.length; i++) {
      if (norm(active[i]) === key) return { advisor: active[i], temporary: false, requiresValidation: false, raw: value };
    }
    if (!value && fallback) return { advisor: fallback, temporary: true, requiresValidation: true, raw: value };
    return { advisor: value, temporary: false, requiresValidation: !!value, raw: value };
  }

  function exactDedupKey(input) {
    const doc = norm(input.numeroDocumento || input.documento || input.nit || input.dpi || input.cedulaJuridica || '');
    if (doc) return 'doc|' + doc;
    const email = norm(input.correo || input.email || '');
    const phone = norm(input.whatsapp || input.telefono || input.telefonoAlterno || '');
    const name = norm(fullName(input));
    if (name && email) return 'name_email|' + name + '|' + email;
    if (name && phone) return 'name_phone|' + name + '|' + phone;
    return '';
  }

  function probableDedupKey(input) {
    const name = norm(fullName(input));
    const city = norm(input.ciudadMunicipio || input.canton || input.ciudad || '');
    return name ? 'prob|' + name + '|' + city : '';
  }

  function qualityAlerts(record) {
    const alerts = ['PENDIENTE_POLIZAS'];
    if (!record.numeroDocumento) alerts.push('FALTA_DOCUMENTO');
    if (!record.correo) alerts.push('FALTA_CORREO');
    if (!record.whatsapp) alerts.push('FALTA_WHATSAPP');
    if (!record.whatsapp && !record.telefonoAlterno && !record.contactoPrincipalTelefono) alerts.push('FALTA_CONTACTO_TELEFONICO');
    if (!record.departamentoProvincia) alerts.push('FALTA_DEPARTAMENTO');
    if (!record.ciudadMunicipio) alerts.push('FALTA_CIUDAD');
    if (!record.contactoPrincipalNombre || (!record.contactoPrincipalTelefono && !record.contactoPrincipalCorreo)) alerts.push('CONTACTO_PRINCIPAL_INCOMPLETO');
    if (record.asesorTemporal) alerts.push('ASESOR_ASIGNADO_TEMPORALMENTE', 'FALTA_ASESOR_REAL_CONFIRMADO');
    return alerts;
  }

  function normalizeClient(input, ctx) {
    const country = resolveCountry(input.pais || input.country, ctx);
    const currency = resolveCurrency(input.moneda || input.currency, country, ctx);
    const advisor = normalizeAdvisor(input.vendedor || input.asesor || input.asesorPrincipal, ctx);
    const record = {
      nombre: fullName(input),
      tipoPersona: personType(input),
      razonSocial: clean(input.razonSocial),
      numeroDocumento: clean(input.numeroDocumento || input.documento || input.nit || input.dpi || input.cedulaJuridica),
      tipoDocumento: clean(input.tipoDocumento),
      correo: clean(input.correo || input.email),
      whatsapp: clean(input.whatsapp),
      telefonoAlterno: clean(input.telefono || input.telefonoAlterno),
      direccion: clean(input.direccion),
      zonaSectorBarrio: clean(input.distrito || input.zonaSectorBarrio),
      codigoPostal: clean(input.codigoPostal),
      ciudadMunicipio: clean(input.ciudadMunicipio || input.canton || input.ciudad),
      departamentoProvincia: clean(input.departamentoProvincia || input.provincia || input.departamento),
      pais: country,
      moneda: currency,
      asesorPrincipal: advisor.advisor,
      asesorRaw: advisor.raw,
      asesorTemporal: advisor.temporary,
      estadoFuenteOriginal: clean(input.estadoFuenteOriginal || input.estatusAsegurado || input.estado),
      estadoOperativo: 'pendiente_polizas',
      ocupacionCargo: clean(input.ocupacionCargo || input.puesto),
      fechaAltaOrigen: clean(input.fechaAltaOrigen || input.fechaAlta),
      fechaNacimiento: clean(input.fechaNacimiento),
      observacionesMigracion: clean(input.observacionesMigracion || input.comentariosContratante),
      contactoPrincipalNombre: clean(input.contactoPrincipalNombre),
      contactoPrincipalTelefono: clean(input.contactoPrincipalTelefono),
      contactoPrincipalCorreo: clean(input.contactoPrincipalCorreo),
      _dedupKey: exactDedupKey(input),
      _probableDedupKey: probableDedupKey(input),
      importadorP0: true
    };
    record.alertasCalidad = qualityAlerts(record);
    record.requiereValidacion = !record.nombre || !record.pais || !record.moneda || advisor.requiresValidation;
    record.motivosValidacion = [];
    if (!record.nombre) record.motivosValidacion.push('nombre');
    if (!record.pais) record.motivosValidacion.push('pais');
    if (!record.moneda) record.motivosValidacion.push('moneda');
    if (advisor.requiresValidation) record.motivosValidacion.push('asesor');
    return record;
  }

  function buildOperations(rows, ctx) {
    return (Array.isArray(rows) ? rows : []).map(function (row) {
      const data = normalizeClient(row, ctx);
      return { action: 'insert', collection: 'clientes', data: data };
    });
  }

  window.Orbit.importaClientesP0 = {
    norm,
    resolveCountry,
    resolveCurrency,
    personType,
    normalizeAdvisor,
    exactDedupKey,
    probableDedupKey,
    qualityAlerts,
    normalizeClient,
    buildOperations
  };
})();