/* ============================================================
   Orbit 360 · Aseguradoras directorio P0
   Fecha: 2026-07-09

   Contrato reusable y multi-tenant para:
   - acceso por rol a credenciales y cuentas bancarias;
   - ocultamiento/revelado bajo demanda con auditoria;
   - PDF/Excel como unica fuente de planes, tarifas y conocimiento;
   - extraccion propuesta + validacion humana + versionado;
   - cero datos reales hardcodeados.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const ROLES_SENSIBLES = ['superadmin', 'admin', 'admintenant', 'direccion', 'operativo'];
  const FORMATOS_DOCUMENTALES = ['pdf', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg'];

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
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
    return s.length <= 4 ? '••••' : s.slice(0, 2) + '••••••' + s.slice(-2);
  }

  function maskAccount(value) {
    const s = String(value == null ? '' : value).replace(/\s+/g, '');
    if (!s) return '';
    return s.length <= 4 ? '••••' : '•••• ' + s.slice(-4);
  }

  function sensitiveView(value, user, revealed, kind) {
    if (!canViewSensitive(user)) return { visible: false, value: '', label: 'Acceso restringido' };
    if (revealed) return { visible: true, value: String(value || ''), label: 'Visible' };
    return { visible: true, value: kind === 'account' ? maskAccount(value) : maskSecret(value), label: 'Oculto · mostrar bajo demanda' };
  }

  function auditEvent(input) {
    return {
      id: 'aud_asg_' + Date.now().toString(36), tipo: 'consulta_dato_sensible', modulo: 'aseguradoras',
      aseguradoraId: input && input.aseguradoraId || '', campo: input && input.campo || '',
      accion: input && input.accion || 'visualizar', motivo: input && input.motivo || 'Acceso operativo a directorio',
      usuarioId: input && input.usuarioId || '', fecha: new Date().toISOString(),
      resultado: input && input.resultado || 'permitido'
    };
  }

  function fileExtension(name) {
    const p = String(name || '').toLowerCase().split('.');
    return p.length > 1 ? p.pop() : '';
  }

  function documentKind(doc) {
    const tipo = norm(doc && (doc.tipo || doc.categoria || doc.cat || doc.nombre));
    if (tipo.includes('tarifa') || tipo.includes('tarifario')) return 'tarifario';
    if (tipo.includes('cotizacion')) return 'cotizacion_ejemplo';
    if (tipo.includes('poliza')) return 'poliza_ejemplo';
    if (tipo.includes('condicion')) return 'condiciones';
    if (tipo.includes('circular')) return 'circular';
    return 'otro';
  }

  function normalizeDocument(doc) {
    return {
      id: doc && doc.id || 'doc_asg_' + Date.now().toString(36),
      aseguradoraId: String(doc && doc.aseguradoraId || ''),
      nombre: String(doc && doc.nombre || ''),
      extension: fileExtension(doc && doc.nombre),
      categoria: documentKind(doc),
      archivoRef: doc && (doc.archivoRef || doc.storageRef || doc.documentRef) || '',
      archivoHash: String(doc && doc.archivoHash || ''),
      pais: String(doc && doc.pais || ''), moneda: String(doc && doc.moneda || ''),
      ramo: String(doc && doc.ramo || ''), producto: String(doc && doc.producto || ''),
      version: Number(doc && doc.version || 1),
      estadoLectura: doc && doc.estadoLectura || 'pendiente_lectura',
      estadoValidacion: doc && doc.estadoValidacion || 'requiere_validacion',
      usoDestino: Array.isArray(doc && doc.usoDestino) ? doc.usoDestino : [],
      fuente: doc && doc.fuente || 'aseguradora', trazabilidad: doc && doc.trazabilidad || {}
    };
  }

  function validateDocument(doc) {
    const errors = [];
    if (!doc.aseguradoraId) errors.push('aseguradora');
    if (!doc.nombre) errors.push('nombre_archivo');
    if (!doc.archivoRef) errors.push('archivo_ref');
    if (!FORMATOS_DOCUMENTALES.includes(doc.extension)) errors.push('formato_no_soportado');
    if (!doc.pais) errors.push('pais');
    return { valid: errors.length === 0, errors: errors };
  }

  function extractionTarget(doc) {
    if (doc.categoria === 'tarifario') return ['cotizador'];
    if (doc.categoria === 'cotizacion_ejemplo' || doc.categoria === 'poliza_ejemplo') return ['comparativo', 'conocimiento_aseguradora'];
    if (doc.categoria === 'condiciones' || doc.categoria === 'circular') return ['comparativo', 'conocimiento_aseguradora'];
    return ['conocimiento_aseguradora'];
  }

  function normalizeExtractedProposal(input) {
    return {
      id: input && input.id || 'prop_asg_' + Date.now().toString(36),
      aseguradoraId: String(input && input.aseguradoraId || ''),
      sourceDocumentId: String(input && input.sourceDocumentId || ''),
      sourceDocumentVersion: Number(input && input.sourceDocumentVersion || 1),
      sourceLocation: input && input.sourceLocation || {},
      destino: input && input.destino || '',
      pais: String(input && input.pais || ''), moneda: String(input && input.moneda || ''),
      ramo: String(input && input.ramo || ''), producto: String(input && input.producto || ''),
      nombrePlan: String(input && input.nombrePlan || ''),
      tipoCalculo: String(input && input.tipoCalculo || ''),
      reglasTarifa: input && input.reglasTarifa || {},
      coberturas: Array.isArray(input && input.coberturas) ? input.coberturas : [],
      deducibles: Array.isArray(input && input.deducibles) ? input.deducibles : [],
      condiciones: Array.isArray(input && input.condiciones) ? input.condiciones : [],
      exclusiones: Array.isArray(input && input.exclusiones) ? input.exclusiones : [],
      formasPago: Array.isArray(input && input.formasPago) ? input.formasPago : [],
      instruccionesExtraccion: String(input && input.instruccionesExtraccion || ''),
      formatoCotizacion: String(input && input.formatoCotizacion || ''),
      estado: input && input.estado || 'propuesta_pendiente_validacion',
      editableManual: false,
      createdAt: input && input.createdAt || new Date().toISOString()
    };
  }

  function validateExtractedProposal(proposal) {
    const errors = [];
    if (!proposal.aseguradoraId) errors.push('aseguradora');
    if (!proposal.sourceDocumentId) errors.push('fuente_documento');
    if (!proposal.destino) errors.push('destino');
    if (!proposal.pais) errors.push('pais');
    if (proposal.destino === 'cotizador' && !proposal.moneda) errors.push('moneda');
    if (proposal.destino === 'cotizador' && !proposal.producto) errors.push('producto');
    if (proposal.destino === 'cotizador' && !proposal.tipoCalculo) errors.push('tipo_calculo');
    return { valid: errors.length === 0, errors: errors };
  }

  function activateProposal(proposal, approval) {
    const check = validateExtractedProposal(proposal);
    if (!check.valid) return { activated: false, errors: check.errors, record: proposal };
    if (!approval || approval.confirmed !== true || !approval.userId) {
      return { activated: false, errors: ['validacion_humana'], record: proposal };
    }
    return {
      activated: true, errors: [],
      record: Object.assign({}, proposal, {
        estado: 'validado_habilitado', validatedAt: new Date().toISOString(), validatedBy: approval.userId
      })
    };
  }

  window.Orbit.aseguradorasDirectorioP0 = {
    ROLES_SENSIBLES, FORMATOS_DOCUMENTALES, rolesOf, canViewSensitive, maskSecret, maskAccount,
    sensitiveView, auditEvent, fileExtension, documentKind, normalizeDocument, validateDocument,
    extractionTarget, normalizeExtractedProposal, validateExtractedProposal, activateProposal
  };
})();