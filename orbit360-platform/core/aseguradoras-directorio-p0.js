/* ============================================================
   Orbit 360 · Aseguradoras directorio P0
   Fecha: 2026-07-09

   Contrato reusable y multi-tenant para:
   - acceso por rol a credenciales y cuentas bancarias;
   - ocultamiento/revelado bajo demanda con auditoria;
   - planes, tarifas y documentos de entrenamiento;
   - cero datos reales hardcodeados.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const ROLES_SENSIBLES = ['superadmin', 'admin', 'admintenant', 'direccion', 'operativo'];

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function rolesOf(user) {
    const roles = [];
    if (!user) return roles;
    if (Array.isArray(user.roles)) roles.push.apply(roles, user.roles);
    if (user.rol) roles.push(user.rol);
    if (user.rolActivo) roles.push(user.rolActivo);
    if (user.role) roles.push(user.role);
    return roles.map(norm);
  }

  function canViewSensitive(user) {
    return rolesOf(user).some(function (role) {
      return ROLES_SENSIBLES.some(function (allowed) { return role === allowed || role.includes(allowed); });
    });
  }

  function maskSecret(value) {
    const s = String(value == null ? '' : value);
    if (!s) return '';
    if (s.length <= 4) return '••••';
    return s.slice(0, 2) + '••••••' + s.slice(-2);
  }

  function maskAccount(value) {
    const s = String(value == null ? '' : value).replace(/\s+/g, '');
    if (!s) return '';
    if (s.length <= 4) return '••••';
    return '•••• ' + s.slice(-4);
  }

  function sensitiveView(value, user, revealed, kind) {
    if (!canViewSensitive(user)) return { visible: false, value: '', label: 'Acceso restringido' };
    if (revealed) return { visible: true, value: String(value || ''), label: 'Visible' };
    return {
      visible: true,
      value: kind === 'account' ? maskAccount(value) : maskSecret(value),
      label: 'Oculto · mostrar bajo demanda'
    };
  }

  function auditEvent(input) {
    return {
      id: 'aud_asg_' + Date.now().toString(36),
      tipo: 'consulta_dato_sensible',
      modulo: 'aseguradoras',
      aseguradoraId: input && input.aseguradoraId || '',
      campo: input && input.campo || '',
      accion: input && input.accion || 'visualizar',
      motivo: input && input.motivo || 'Acceso operativo a directorio',
      usuarioId: input && input.usuarioId || '',
      fecha: new Date().toISOString(),
      resultado: input && input.resultado || 'permitido'
    };
  }

  function normalizeDocument(doc) {
    const tipo = norm(doc && (doc.tipo || doc.categoria || doc.cat));
    let category = 'otro';
    if (tipo.includes('tarifa')) category = 'tarifa';
    else if (tipo.includes('cotizacion')) category = 'cotizacion_ejemplo';
    else if (tipo.includes('poliza')) category = 'poliza_ejemplo';
    else if (tipo.includes('condicion')) category = 'condiciones';
    else if (tipo.includes('formulario')) category = 'formulario';
    return {
      id: doc && doc.id || 'doc_asg_' + Date.now().toString(36),
      nombre: String(doc && doc.nombre || ''),
      categoria: category,
      archivoRef: doc && (doc.archivoRef || doc.storageRef || doc.documentRef) || '',
      pais: String(doc && doc.pais || ''),
      moneda: String(doc && doc.moneda || ''),
      ramo: String(doc && doc.ramo || ''),
      producto: String(doc && doc.producto || ''),
      plan: String(doc && doc.plan || ''),
      vigenciaDesde: String(doc && doc.vigenciaDesde || ''),
      vigenciaHasta: String(doc && doc.vigenciaHasta || ''),
      estadoLectura: doc && doc.estadoLectura || 'pendiente_lectura',
      estadoValidacion: doc && doc.estadoValidacion || 'requiere_validacion',
      fuente: doc && doc.fuente || 'aseguradora',
      trazabilidad: doc && doc.trazabilidad || {}
    };
  }

  function normalizePlan(plan) {
    return {
      id: plan && plan.id || 'plan_asg_' + Date.now().toString(36),
      ramo: String(plan && plan.ramo || ''),
      producto: String(plan && plan.producto || ''),
      nombre: String(plan && (plan.nombre || plan.plan) || ''),
      pais: String(plan && plan.pais || ''),
      moneda: String(plan && plan.moneda || ''),
      coberturas: Array.isArray(plan && plan.coberturas) ? plan.coberturas : [],
      deducibles: Array.isArray(plan && plan.deducibles) ? plan.deducibles : [],
      condiciones: Array.isArray(plan && plan.condiciones) ? plan.condiciones : [],
      exclusiones: Array.isArray(plan && plan.exclusiones) ? plan.exclusiones : [],
      tarifa: plan && plan.tarifa != null ? plan.tarifa : null,
      primaReferencia: plan && plan.primaReferencia != null ? plan.primaReferencia : null,
      vigenciaDesde: String(plan && plan.vigenciaDesde || ''),
      vigenciaHasta: String(plan && plan.vigenciaHasta || ''),
      fuenteDocumentoId: String(plan && plan.fuenteDocumentoId || ''),
      estadoValidacion: plan && plan.estadoValidacion || 'requiere_validacion',
      activo: plan && plan.activo !== false
    };
  }

  function validatePlan(plan) {
    const errors = [];
    if (!plan.ramo) errors.push('ramo');
    if (!plan.producto) errors.push('producto');
    if (!plan.nombre) errors.push('plan');
    if (!plan.pais) errors.push('pais');
    if (!plan.moneda) errors.push('moneda');
    if (!plan.fuenteDocumentoId) errors.push('fuente_documento');
    return { valid: errors.length === 0, errors: errors };
  }

  window.Orbit.aseguradorasDirectorioP0 = {
    ROLES_SENSIBLES: ROLES_SENSIBLES,
    rolesOf: rolesOf,
    canViewSensitive: canViewSensitive,
    maskSecret: maskSecret,
    maskAccount: maskAccount,
    sensitiveView: sensitiveView,
    auditEvent: auditEvent,
    normalizeDocument: normalizeDocument,
    normalizePlan: normalizePlan,
    validatePlan: validatePlan
  };
})();