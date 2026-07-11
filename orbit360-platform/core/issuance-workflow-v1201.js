/* ============================================================
   Orbit 360 · Solicitud de emisión / propuesta aceptada v1.201
   ------------------------------------------------------------
   La solicitud vive como gestión tipada dentro de Orbit Ops.
   No crea una Póliza hasta recibir número real de aseguradora.
   No crea módulos paralelos ni reemplaza Orbit.store.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.issuance = (function () {
  const S = () => Orbit.store;
  const A = () => Orbit.access;
  const P = () => Orbit.policyReceipts;
  const MANAGE_ROLES = new Set(['Dirección','SuperAdmin','AdminTenant','Admin','Operativo']);
  const ACTIVE_STAGES = new Set(['PROPUESTA_ACEPTADA','PENDIENTE_DOCUMENTOS','PENDIENTE_INSPECCION','PENDIENTE_EMISION']);
  const TRANSITIONS = {
    PROPUESTA_ACEPTADA: ['PENDIENTE_DOCUMENTOS','PENDIENTE_INSPECCION','PENDIENTE_EMISION','CANCELADA','RECHAZADA'],
    PENDIENTE_DOCUMENTOS: ['PENDIENTE_INSPECCION','PENDIENTE_EMISION','CANCELADA','RECHAZADA'],
    PENDIENTE_INSPECCION: ['PENDIENTE_DOCUMENTOS','PENDIENTE_EMISION','CANCELADA','RECHAZADA'],
    PENDIENTE_EMISION: ['EMITIDA','CANCELADA','RECHAZADA'],
    EMITIDA: [], CANCELADA: [], RECHAZADA: []
  };

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }
  function now() { return new Date().toISOString(); }
  function today() { return (Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : now().slice(0, 10); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function tenantId() { return A() && A().tenantId ? A().tenantId() : ''; }
  function actor() { return A() && A().actorUser ? A().actorUser() : { nombre: 'Usuario', rolActivo: activeRole(), asesorId: '' }; }
  function activeRole() { return A() && A().activeRole ? A().activeRole() : 'Sin rol'; }
  function canManage() {
    const advisor = A() && A().actorAdvisor ? A().actorAdvisor() : {};
    const extras = [].concat(advisor.permisosExtra || advisor.extras || []);
    const restrictions = [].concat(advisor.restricciones || []);
    if (restrictions.includes('emisiones') || restrictions.includes('polizas')) return false;
    return MANAGE_ROLES.has(activeRole()) || extras.includes('emisiones_gestionar');
  }
  function operationId(prefix) { return (prefix || 'emi') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function currencyFor(country) {
    if (A() && A().currencyFor) return A().currencyFor(country);
    const p = (Orbit.PAISES || []).find(x => x.id === country);
    return p && p.moneda || '';
  }
  function stageLabel(stage) {
    return ({
      PROPUESTA_ACEPTADA: 'Propuesta aceptada', PENDIENTE_DOCUMENTOS: 'Pendiente de documentos',
      PENDIENTE_INSPECCION: 'Pendiente de inspección', PENDIENTE_EMISION: 'Pendiente de emisión',
      EMITIDA: 'Emitida', RECHAZADA: 'Rechazada', CANCELADA: 'Cancelada'
    })[stage] || stage;
  }
  function opsState(stage) {
    if (stage === 'EMITIDA') return 'Resuelta';
    if (stage === 'RECHAZADA' || stage === 'CANCELADA') return 'Resuelta';
    return stage === 'PROPUESTA_ACEPTADA' ? 'Pendiente' : 'En proceso';
  }
  function requestKey(input) {
    const offer = input.acceptedOffer || {};
    return [
      clean(input.tenantId || tenantId()), clean(input.sourcePolicyId || 'NUEVA'), clean(input.clienteId),
      clean(input.aseguradoraId || offer.aseguradoraId), norm(input.ramo || offer.ramo),
      norm(input.producto || offer.producto), norm(offer.sourceRef || offer.documentRef || offer.quoteId || offer.nombre || '')
    ].join('|');
  }
  function activeRequests() {
    return (S().all('gestiones') || []).filter(g => g && g.workflowType === 'issuance_request' && ACTIVE_STAGES.has(g.emissionStage));
  }
  function existingByKey(key) { return activeRequests().find(g => g.requestKey === key) || null; }

  function validateRequest(input) {
    input = input || {};
    const offer = input.acceptedOffer || {};
    const errors = [], warnings = [];
    const client = clean(input.clienteId) ? S().get('clientes', input.clienteId) : null;
    const sourcePolicy = clean(input.sourcePolicyId) ? S().get('polizas', input.sourcePolicyId) : null;
    const insurerId = clean(input.aseguradoraId || offer.aseguradoraId);
    const insurer = insurerId ? S().get('aseguradoras', insurerId) : null;
    const country = clean(input.pais || offer.pais || (client && client.pais));
    const currency = clean(input.moneda || offer.moneda || currencyFor(country));
    if (!clean(input.tenantId || tenantId())) errors.push('tenant_requerido');
    if (!client) errors.push('cliente_requerido');
    if (!insurer) errors.push('aseguradora_requerida');
    if (!country) errors.push('pais_requerido');
    if (!currency) errors.push('moneda_requerida');
    if (client && client.pais && country && client.pais !== country) errors.push('pais_no_coincide_cliente');
    if (currencyFor(country) && currency !== currencyFor(country)) errors.push('moneda_no_coincide_pais');
    if (!clean(input.ramo || offer.ramo || (sourcePolicy && sourcePolicy.ramo))) errors.push('ramo_requerido');
    if (!clean(input.producto || offer.producto || (sourcePolicy && (sourcePolicy.producto || sourcePolicy.subramo)))) errors.push('producto_requerido');
    if (!input.acceptedConfirmed) errors.push('aceptacion_cliente_requerida');
    if (!(+(offer.primaNeta || input.primaNeta) > 0)) errors.push('prima_neta_aceptada_requerida');
    if (!(+(offer.primaTotal || offer.total || input.primaTotal) > 0)) errors.push('prima_total_aceptada_requerida');
    if (sourcePolicy && sourcePolicy.clienteId !== input.clienteId) errors.push('poliza_origen_no_coincide_cliente');
    if (!clean(offer.sourceRef || offer.documentRef || offer.quoteId)) warnings.push('fuente_oferta_requiere_validacion');
    if (!clean(offer.documentRef)) warnings.push('documento_cotizacion_pendiente');
    return { ok: !errors.length, errors, warnings, client, sourcePolicy, insurer, insurerId, country, currency };
  }

  function createRequest(input, options) {
    input = input || {}; options = options || {};
    if (!canManage()) return { ok: false, errors: ['permiso_emision_denegado'] };
    const check = validateRequest(input);
    if (!check.ok) return Object.assign({ ok: false }, check);
    const key = requestKey(Object.assign({}, input, { aseguradoraId: check.insurerId, pais: check.country, moneda: check.currency }));
    const found = existingByKey(key);
    if (found) return { ok: true, reused: true, request: found, warnings: check.warnings };
    const opId = options.operationId || operationId('emireq');
    const offer = clone(input.acceptedOffer || {});
    offer.aseguradoraId = check.insurerId;
    offer.pais = check.country;
    offer.moneda = check.currency;
    offer.primaNeta = +(offer.primaNeta || input.primaNeta) || 0;
    offer.gastosEmision = +(offer.gastosEmision || 0);
    offer.gastosFinan = +(offer.gastosFinan || 0);
    offer.otros = +(offer.otros || 0);
    offer.ivaMonto = +(offer.ivaMonto || offer.iva || 0);
    offer.primaTotal = +(offer.primaTotal || offer.total || input.primaTotal) || 0;
    offer.cuotas = Math.max(1, +(offer.cuotas || input.cuotas) || 1);
    offer.frecuencia = clean(offer.frecuencia || input.frecuencia || (offer.cuotas > 1 ? 'Mensual' : 'Contado'));
    offer.formaPago = clean(offer.formaPago || input.formaPago || '');
    offer.aceptadaAt = now();
    offer.aceptadaPor = actor();
    const source = check.sourcePolicy;
    const isRenewal = !!source;
    const id = 'ges_emi_' + Date.now().toString(36);
    const request = {
      id, tenantId: clean(input.tenantId || tenantId()), workflowType: 'issuance_request',
      requestKey: key, operationId: opId, issuanceMode: isRenewal ? 'renewal' : 'new_business',
      lista: 'Emisiones', tipo: 'Solicitud de emisión',
      titulo: (isRenewal ? 'Emisión de renovación · ' + source.numero : 'Emisión nueva') + ' · ' + check.client.nombre,
      clienteId: check.client.id, polizaId: source ? source.id : '', sourcePolicyId: source ? source.id : '',
      renewalManagementId: clean(input.renewalManagementId || input.gestionId),
      asesorId: clean(input.asesorId || check.client.asesorId || actor().asesorId),
      aseguradoraId: check.insurerId, ramo: clean(input.ramo || offer.ramo || (source && source.ramo)),
      producto: clean(input.producto || offer.producto || (source && (source.producto || source.subramo))),
      pais: check.country, moneda: check.currency, acceptedOffer: offer,
      acceptedConfirmed: true, emissionStage: 'PROPUESTA_ACEPTADA', estado: 'Pendiente', prioridad: input.prioridad || 'Alta',
      requiereInspeccion: !!input.requiereInspeccion, documentosCompletos: false,
      requiereValidacion: check.warnings.length > 0, validacionAlertas: check.warnings,
      proximaAccion: input.requiereInspeccion ? 'Completar documentos e inspección' : 'Completar documentos y solicitar emisión',
      vence: clean(input.vence || (source && source.vigenciaFin)),
      checklist: [
        { t: 'Propuesta aceptada por el cliente', done: true },
        { t: 'Datos del riesgo actualizados', done: !!input.riesgoActualizado },
        { t: 'Documentos requeridos completos', done: false },
        ...(input.requiereInspeccion ? [{ t: 'Inspección aprobada', done: false }] : []),
        { t: 'Número real de póliza recibido', done: false },
        { t: 'Póliza emitida y documento vinculado', done: false }
      ],
      nota: clean(input.nota || 'Propuesta aceptada. Pendiente completar requisitos y recibir número real de póliza.'),
      origen: clean(input.origen || 'Comparativo'),
      bitacora: [{ ts: now(), user: actor().nombre || activeRole(), campo: 'Creación', de: '', a: 'Solicitud de emisión creada', origen: 'manual' }],
      creado: today(), actualizado: today(), archivado: false
    };
    S().insert('gestiones', request);
    try {
      S().insert('actividades', {
        id: 'act_' + Date.now().toString(36), tenantId: request.tenantId, clienteId: request.clienteId,
        asesorId: request.asesorId, tipo: 'emision', icon: '📝', fecha: today(),
        titulo: 'Solicitud de emisión creada', detalle: request.titulo + ' · no crea póliza hasta número real',
        gestionId: request.id, polizaId: request.sourcePolicyId, operationId: opId
      });
    } catch (e) {}
    if (A() && A().audit) A().audit('crear_solicitud_emision', 'gestiones', request.id, null, request, options.motivo || 'Propuesta aceptada; pendiente emisión real', { operationId: opId, noPolicyCreated: true });
    return { ok: true, request, warnings: check.warnings, operationId: opId };
  }

  function advanceRequest(id, nextStage, patch, options) {
    patch = patch || {}; options = options || {};
    if (!canManage()) return { ok: false, errors: ['permiso_emision_denegado'] };
    const current = S().get('gestiones', id);
    if (!current || current.workflowType !== 'issuance_request') return { ok: false, errors: ['solicitud_emision_no_encontrada'] };
    const from = current.emissionStage || 'PROPUESTA_ACEPTADA';
    if (!(TRANSITIONS[from] || []).includes(nextStage)) return { ok: false, errors: ['transicion_emision_no_permitida'], from, nextStage };
    if (nextStage === 'PENDIENTE_INSPECCION' && !current.requiereInspeccion) return { ok: false, errors: ['inspeccion_no_requerida'] };
    const before = clone(current);
    const bitacora = [].concat(current.bitacora || [], [{ ts: now(), user: actor().nombre || activeRole(), campo: 'Etapa emisión', de: stageLabel(from), a: stageLabel(nextStage), origen: 'manual' }]);
    const next = Object.assign({}, patch, {
      emissionStage: nextStage, estado: opsState(nextStage), bitacora, actualizado: today(),
      proximaAccion: patch.proximaAccion || (nextStage === 'PENDIENTE_DOCUMENTOS' ? 'Completar documentos' : nextStage === 'PENDIENTE_INSPECCION' ? 'Completar inspección' : nextStage === 'PENDIENTE_EMISION' ? 'Recibir número real y póliza emitida' : nextStage === 'EMITIDA' ? 'Cerrada' : 'Cerrar gestión')
    });
    S().update('gestiones', id, next);
    const after = S().get('gestiones', id);
    if (A() && A().audit) A().audit('cambiar_etapa_emision', 'gestiones', id, before, after, options.motivo || ('Etapa ' + stageLabel(nextStage)));
    return { ok: true, request: after };
  }

  function issueRequest(id, policyInput, options) {
    policyInput = policyInput || {}; options = options || {};
    if (!canManage()) return { ok: false, errors: ['permiso_emision_denegado'] };
    const request = S().get('gestiones', id);
    if (!request || request.workflowType !== 'issuance_request') return { ok: false, errors: ['solicitud_emision_no_encontrada'] };
    if (request.policyCreatedId) {
      const existing = S().get('polizas', request.policyCreatedId);
      if (existing) return { ok: true, alreadyIssued: true, policy: existing, request };
    }
    if (['CANCELADA','RECHAZADA'].includes(request.emissionStage)) return { ok: false, errors: ['solicitud_emision_cerrada'] };
    if (!P() || !P().createPolicy) return { ok: false, errors: ['motor_polizas_no_disponible'] };
    const offer = request.acceptedOffer || {};
    const source = request.sourcePolicyId ? S().get('polizas', request.sourcePolicyId) : null;
    const raw = {
      numero: clean(policyInput.numero), clienteId: request.clienteId, asesorId: request.asesorId,
      aseguradoraId: request.aseguradoraId, pais: request.pais, moneda: request.moneda,
      ramo: clean(policyInput.ramo || request.ramo), subramo: clean(policyInput.subramo || request.producto),
      producto: clean(policyInput.producto || request.producto), estado: 'Vigente',
      vigenciaInicio: clean(policyInput.vigenciaInicio), vigenciaFin: clean(policyInput.vigenciaFin),
      frecuencia: clean(policyInput.frecuencia || offer.frecuencia || 'Contado'),
      formaPago: clean(policyInput.formaPago || offer.formaPago), cuotas: Math.max(1, +(policyInput.cuotas || offer.cuotas) || 1),
      conducto: clean(policyInput.conducto || offer.conducto),
      primaNeta: +(policyInput.primaNeta != null ? policyInput.primaNeta : offer.primaNeta) || 0,
      gastosEmision: +(policyInput.gastosEmision != null ? policyInput.gastosEmision : offer.gastosEmision) || 0,
      gastosFinan: +(policyInput.gastosFinan != null ? policyInput.gastosFinan : offer.gastosFinan) || 0,
      otros: +(policyInput.otros != null ? policyInput.otros : offer.otros) || 0,
      ivaPct: policyInput.ivaPct != null ? +policyInput.ivaPct : offer.ivaPct,
      recargoFinPct: policyInput.recargoFinPct != null ? +policyInput.recargoFinPct : offer.recargoFinPct,
      sumaAsegurada: +(policyInput.sumaAsegurada || offer.sumaAsegurada) || 0,
      comAseguradoraPct: +(policyInput.comAseguradoraPct || offer.comAseguradoraPct) || 0,
      comVendedorPct: +(policyInput.comVendedorPct || offer.comVendedorPct) || 0,
      fuente: 'solicitud_emision_aceptada', sourceRef: clean(policyInput.sourceRef || offer.sourceRef),
      documentRef: clean(policyInput.documentRef || offer.documentRef), solicitudEmisionId: request.id,
      renuevaDe: source ? source.id : '', gestionRenovacionId: request.renewalManagementId || '',
      vehiculo: policyInput.vehiculo || null
    };
    if (!raw.numero) return { ok: false, errors: ['numero_poliza_real_requerido'] };
    if (!raw.vigenciaInicio || !raw.vigenciaFin) return { ok: false, errors: ['vigencia_real_requerida'] };
    if (!raw.documentRef) return { ok: false, errors: ['documento_poliza_emitida_requerido'] };
    const opId = options.operationId || operationId('emit');
    const created = P().createPolicy(raw, { operationId: opId, motivo: options.motivo || 'Conversión de solicitud de emisión con número real' });
    if (!created.ok) return created;
    const policy = created.policy;
    S().update('polizas', policy.id, {
      solicitudEmisionId: request.id, renuevaDe: source ? source.id : '', propuestaAceptadaRef: clean(offer.sourceRef || offer.documentRef),
      gestionRenovacionId: request.renewalManagementId || '', emissionOperationId: opId
    });
    if (source) {
      const hist = [].concat(source.historial || [], [{ icon: '🔄', fecha: today(), t: 'Renovación emitida', d: 'Nueva póliza ' + policy.numero + ' · vínculo ' + policy.id }]);
      S().update('polizas', source.id, {
        renovadaPor: policy.id, renovacionEstado: 'Renovada', renovacionFechaEfectiva: policy.vigenciaInicio,
        renovacionSolicitudId: request.id, historial: hist
      });
      if (request.renewalManagementId) {
        const rg = S().get('gestiones', request.renewalManagementId);
        if (rg) S().update('gestiones', rg.id, { estado: 'Resuelta', nuevaPolizaId: policy.id, emisionGestionId: request.id, proximaAccion: 'Cerrada', actualizado: today() });
      }
    }
    const checklist = [].concat(request.checklist || []).map(x => {
      if (/Número real|Póliza emitida/.test(x.t || '')) return Object.assign({}, x, { done: true });
      return x;
    });
    S().update('gestiones', request.id, {
      emissionStage: 'EMITIDA', estado: 'Resuelta', policyCreatedId: policy.id, policyNumber: policy.numero,
      documentRef: raw.documentRef, checklist, resultado: 'Póliza emitida ' + policy.numero,
      proximaAccion: 'Cerrada', resueltaAt: now(), actualizado: today()
    });
    try {
      S().insert('actividades', {
        id: 'act_' + Date.now().toString(36), tenantId: request.tenantId, clienteId: request.clienteId,
        asesorId: request.asesorId, tipo: 'emision', icon: '✅', fecha: today(),
        titulo: 'Póliza emitida: ' + policy.numero,
        detalle: (source ? 'Renovación de ' + source.numero : 'Nueva emisión') + ' · solicitud ' + request.id,
        gestionId: request.id, polizaId: policy.id, operationId: opId
      });
    } catch (e) {}
    const finalRequest = S().get('gestiones', request.id);
    if (A() && A().audit) A().audit('convertir_solicitud_a_poliza', 'gestiones', request.id, request, finalRequest, options.motivo || 'Número real y documento emitido recibidos', { operationId: opId, newPolicyId: policy.id, sourcePolicyId: source && source.id || '', oldPolicyStateUnchanged: true });
    return { ok: true, policy: S().get('polizas', policy.id), request: finalRequest, receipts: created.receipts, operationId: opId };
  }

  return {
    ACTIVE_STAGES, TRANSITIONS, canManage, stageLabel, requestKey, activeRequests, existingByKey,
    validateRequest, createRequest, advanceRequest, issueRequest
  };
})();
