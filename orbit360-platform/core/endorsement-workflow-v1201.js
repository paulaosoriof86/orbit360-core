/* ============================================================
   Orbit 360 · Endosos y modificaciones v1.201
   ------------------------------------------------------------
   Los endosos nacen como gestiones en Ops. Solo se aplican cuando
   existe aprobación/referencia de aseguradora y documento soporte.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.endorsements = (function () {
  const S = () => Orbit.store;
  const A = () => Orbit.access;
  const P = () => Orbit.policyReceipts;
  const MANAGE_ROLES = new Set(['Dirección','SuperAdmin','AdminTenant','Admin','Operativo']);
  const ACTIVE = new Set(['SOLICITADO','EN_REVISION','APROBADO_PENDIENTE_APLICACION']);
  const DEFAULT_TYPES = [
    { id: 'sustitucion_vehiculo', label: 'Sustitución de vehículo', apply: true },
    { id: 'beneficiarios', label: 'Inclusión / exclusión de beneficiarios', apply: true },
    { id: 'forma_pago', label: 'Cambio de forma o frecuencia de pago', apply: true },
    { id: 'datos_riesgo', label: 'Corrección de datos no financieros del riesgo', apply: true },
    { id: 'cambio_tomador', label: 'Cambio de propietario / tomador', apply: false }
  ];
  const SAFE_POLICY_FIELDS = new Set(['concepto','direccionRiesgo','contactoRiesgo','observacionesRiesgo','referenciaRiesgo']);

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) { return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
  function now() { return new Date().toISOString(); }
  function today() { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : now().slice(0, 10); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function tenantId() { return A() && A().tenantId ? A().tenantId() : ''; }
  function actor() { return A() && A().actorUser ? A().actorUser() : { nombre: 'Usuario', rolActivo: role(), asesorId: '' }; }
  function role() { return A() && A().activeRole ? A().activeRole() : 'Sin rol'; }
  function canManage() {
    const advisor = A() && A().actorAdvisor ? A().actorAdvisor() : {};
    const extras = [].concat(advisor.permisosExtra || advisor.extras || []);
    const restrictions = [].concat(advisor.restricciones || []);
    if (restrictions.includes('endosos') || restrictions.includes('polizas')) return false;
    return MANAGE_ROLES.has(role()) || extras.includes('endosos_gestionar');
  }
  function typeDefs() {
    try {
      const custom = Orbit.cat && Orbit.cat.get && Orbit.cat.get('tiposEndoso');
      if (Array.isArray(custom) && custom.length) return custom.map(x => typeof x === 'string' ? { id: norm(x), label: x, apply: false } : x);
    } catch (e) {}
    return DEFAULT_TYPES.slice();
  }
  function typeDef(id) { return typeDefs().find(x => x.id === id) || DEFAULT_TYPES.find(x => x.id === id) || null; }
  function operationId(prefix) { return (prefix || 'end') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function requestKey(policyId, typeId) { return [tenantId(), policyId, typeId].join('|'); }
  function existing(policyId, typeId) {
    const key = requestKey(policyId, typeId);
    return (S().all('gestiones') || []).find(g => g.workflowType === 'endorsement_request' && g.endorsementKey === key && ACTIVE.has(g.endorsementStage)) || null;
  }

  async function createRequest(policyId, typeId, proposal, options) {
    proposal = proposal || {}; options = options || {};
    const policy = S().get('polizas', policyId);
    if (!policy) return { ok: false, errors: ['poliza_no_encontrada'] };
    if (A() && A().canView && !A().canView('polizas', policy, 'cliente360')) return { ok: false, errors: ['poliza_fuera_alcance'] };
    const def = typeDef(typeId);
    if (!def) return { ok: false, errors: ['tipo_endoso_no_configurado'] };
    const found = existing(policyId, typeId);
    if (found) return { ok: true, reused: true, request: found };
    const client = S().get('clientes', policy.clienteId) || {};
    const opId = options.operationId || operationId('endreq');
    const requiresValidation = !clean(options.documentRef || proposal.documentRef);
    const row = {
      id: 'ges_end_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7), tenantId: policy.tenantId || tenantId(),
      workflowType: 'endorsement_request', endorsementKey: requestKey(policyId, typeId),
      endorsementType: typeId, endorsementLabel: def.label, endorsementStage: 'SOLICITADO', operationId: opId,
      lista: 'Renovaciones / Modif.', tipo: 'Endoso · ' + def.label,
      titulo: 'Endoso · ' + def.label + ' · ' + (policy.numero || 'Póliza'),
      clienteId: policy.clienteId, polizaId: policy.id, asesorId: policy.asesorId || client.asesorId,
      aseguradoraId: policy.aseguradoraId, ramo: policy.ramo, pais: policy.pais || client.pais, moneda: policy.moneda || client.moneda,
      estado: 'Pendiente', prioridad: options.prioridad || 'Media', vence: clean(options.vence),
      proximaAccion: 'Enviar solicitud y esperar aprobación de aseguradora',
      propuestaCambios: clone(proposal), documentRef: clean(options.documentRef || proposal.documentRef),
      requiereValidacion: requiresValidation, validacionAlertas: requiresValidation ? ['documento_soporte_pendiente'] : [],
      checklist: [
        { t: 'Solicitud y motivo registrados', done: true },
        { t: 'Documentos soporte completos', done: !requiresValidation },
        { t: 'Aprobación de aseguradora recibida', done: false },
        { t: 'Endoso aplicado en Orbit', done: false }
      ],
      nota: clean(options.nota || proposal.nota || 'Solicitud de modificación pendiente de aprobación de aseguradora.'),
      origen: clean(options.origen || 'Cliente 360'),
      bitacora: [{ ts: now(), user: actor().nombre || role(), campo: 'Creación', de: '', a: 'Solicitud de endoso creada', origen: 'manual' }],
      creado: today(), actualizado: today(), archivado: false
    };
    if (!S().batchDurable) return { ok: false, errors: ['escritura_durable_endoso_no_disponible'] };
    const activity = { id: 'act_' + opId, tenantId: row.tenantId, clienteId: row.clienteId,
      asesorId: row.asesorId, pais: row.pais, tipo: 'endoso', icon: '📜', fecha: today(),
      titulo: 'Endoso solicitado', detalle: def.label + ' · póliza ' + policy.numero,
      gestionId: row.id, polizaId: policy.id, operationId: opId };
    // El asesor puede solicitar una gestión propia, pero no necesariamente
    // crear actividades en Cliente 360. No bloquear esa capacidad aprobada.
    const canCreateActivity = !!(A() && A().can && A().can('cliente360', 'create'));
    const mutations = [{ action: 'insert', collection: 'gestiones', id: row.id, payload: row }];
    if (canCreateActivity) mutations.push({ action: 'insert', collection: 'actividades', id: activity.id, payload: activity });
    try {
      const ack = await S().batchDurable(mutations, { requestId: opId });
      if (!ack || ack.ok !== true || ack.canonicalReadback !== true) throw Error('ENDOSO_CREATE_SERVER_ACK_REQUIRED');
      const saved = S().get('gestiones', row.id);
      if (!saved || saved.workflowType !== 'endorsement_request') throw Error('ENDOSO_CREATE_READBACK_REQUIRED');
      try { if (A() && A().audit) A().audit('solicitar_endoso', 'gestiones', row.id, null, saved, options.motivo || def.label, { operationId: opId, policyId }); } catch (ignore) {}
      return { ok: true, request: saved, operationId: opId, durable: true };
    } catch (error) {
      return { ok: false, errors: ['solicitud_endoso_no_confirmada'], error: clean(error && (error.code || error.message || error)) };
    }
  }

  async function approve(id, approval) {
    approval = approval || {};
    if (!canManage()) return { ok: false, errors: ['permiso_endoso_denegado'] };
    const request = S().get('gestiones', id);
    if (!request || request.workflowType !== 'endorsement_request') return { ok: false, errors: ['solicitud_endoso_no_encontrada'] };
    if (request.endorsementStage === 'APROBADO_PENDIENTE_APLICACION') return { ok: true, request, alreadyApproved: true };
    if (!ACTIVE.has(request.endorsementStage)) return { ok: false, errors: ['solicitud_endoso_cerrada'] };
    if (!clean(approval.referenciaAseguradora)) return { ok: false, errors: ['referencia_aprobacion_requerida'] };
    if (!clean(approval.documentRef || request.documentRef)) return { ok: false, errors: ['documento_endoso_aprobado_requerido'] };
    if (!clean(approval.fechaEfectiva)) return { ok: false, errors: ['fecha_efectiva_requerida'] };
    const before = clone(request);
    const bitacora = [].concat(request.bitacora || [], [{ ts: now(), user: actor().nombre || role(), campo: 'Aprobación', de: request.endorsementStage, a: 'APROBADO_PENDIENTE_APLICACION', origen: 'manual' }]);
    if (!S().updateDurable) return { ok: false, errors: ['escritura_durable_endoso_no_disponible'] };
    const patch = {
      endorsementStage: 'APROBADO_PENDIENTE_APLICACION', estado: 'En proceso',
      referenciaAseguradora: clean(approval.referenciaAseguradora), documentRef: clean(approval.documentRef || request.documentRef),
      fechaEfectiva: clean(approval.fechaEfectiva), aprobadoAt: now(), aprobadoPor: actor(),
      proximaAccion: 'Aplicar cambio aprobado', bitacora, actualizado: today()
    };
    try {
      await S().updateDurable('gestiones', id, patch);
      const after = S().get('gestiones', id);
      if (!after || after.endorsementStage !== 'APROBADO_PENDIENTE_APLICACION') throw Error('ENDOSO_APPROVAL_READBACK_REQUIRED');
      try { if (A() && A().audit) A().audit('aprobar_endoso', 'gestiones', id, before, after, approval.motivo || 'Aprobación de aseguradora'); } catch (ignore) {}
      return { ok: true, request: after, durable: true };
    } catch (error) {
      return { ok: false, errors: ['aprobacion_endoso_no_confirmada'], error: clean(error && (error.code || error.message || error)) };
    }
  }

  function applyVehicleSubstitution(request, policy, proposal, opId) {
    const next = proposal.nuevoVehiculo || proposal.vehicle || {};
    if (![next.placa,next.marca,next.linea,next.chasis,next.motor].some(clean)) return { ok: false, errors: ['identidad_nuevo_vehiculo_requerida'] };
    const currentId = clean(proposal.vehiculoId || policy.vehiculoId);
    const current = currentId ? S().get('vehiculos', currentId) : (S().all('vehiculos') || []).find(v => v.polizaId === policy.id && norm(v.estado) !== 'historico');
    if (current && clean(current.polizaId) !== clean(policy.id)) return { ok: false, errors: ['vehiculo_fuera_poliza'] };
    const id = clean(next.id || ('veh_' + Date.now().toString(36)));
    const row = Object.assign({}, next, {
      id, tenantId: policy.tenantId || tenantId(), clienteId: policy.clienteId, polizaId: policy.id,
      asesorId: policy.asesorId, pais: policy.pais, estado: 'Activo', vigenciaInicio: request.fechaEfectiva,
      fuente: 'endoso_aprobado', documentRef: request.documentRef, operationId: opId
    });
    if (S().get('vehiculos', id)) return { ok: false, errors: ['vehiculo_nuevo_ya_existe'] };
    const mutations = current ? [{ action: 'update', collection: 'vehiculos', id: current.id,
      payload: { estado: 'Histórico', vigenciaFin: request.fechaEfectiva, sustituidoPorGestionId: request.id, actualizado: now() } }] : [];
    mutations.push({ action: 'insert', collection: 'vehiculos', id, payload: row });
    return { ok: true, policyPatch: { vehiculoId: id }, mutations, vehicle: row, previousVehicleId: current && current.id || '' };
  }

  function applyBeneficiaries(request, policy, proposal) {
    const list = Array.isArray(proposal.beneficiarios) ? proposal.beneficiarios.filter(Boolean) : [];
    if (!list.length) return { ok: false, errors: ['beneficiarios_requeridos'] };
    return { ok: true, policyPatch: { beneficiarios: clone(list) }, mutations: [], beneficiaries: list };
  }

  async function applyPaymentPlan(request, policy, proposal) {
    if (!P() || !P().updatePolicy) return { ok: false, errors: ['motor_polizas_no_disponible'] };
    // El motor de pólizas y recibos confirma su propia transacción primero.
    // Si la finalización de la gestión falla después, este marcador evita
    // recalcular recibos durante la recuperación del mismo endoso.
    if (policy.endosoFinancieroAplicadoId === request.id) return { ok: true, policyAlreadyUpdated: true };
    const patch = {
      frecuencia: clean(proposal.frecuencia), formaPago: clean(proposal.formaPago),
      cuotas: Math.max(1, +proposal.cuotas || 1), conducto: clean(proposal.conducto || policy.conducto),
      endosoFinancieroAplicadoId: request.id
    };
    const result = await P().updatePolicy(policy.id, patch, {
      motivo: 'Endoso aprobado · cambio de forma de pago · ' + request.referenciaAseguradora,
      operationId: 'endapply_policy_' + request.id
    });
    if (result.ok && (!S().get('polizas', policy.id) || S().get('polizas', policy.id).endosoFinancieroAplicadoId !== request.id))
      return { ok: false, errors: ['endoso_financiero_readback_inconsistente'] };
    return result;
  }

  function applyRiskData(request, policy, proposal) {
    const requested = proposal.patch || {};
    const patch = {};
    Object.keys(requested).forEach(k => { if (SAFE_POLICY_FIELDS.has(k)) patch[k] = requested[k]; });
    if (!Object.keys(patch).length) return { ok: false, errors: ['campos_no_financieros_requeridos'] };
    return { ok: true, policyPatch: patch, mutations: [], patch };
  }

  async function apply(id, approval) {
    approval = approval || {};
    if (!canManage()) return { ok: false, errors: ['permiso_endoso_denegado'] };
    let request = S().get('gestiones', id);
    if (!request || request.workflowType !== 'endorsement_request') return { ok: false, errors: ['solicitud_endoso_no_encontrada'] };
    if (request.endorsementStage === 'APLICADO') {
      const prior = S().get('polizas', request.polizaId);
      return prior && [].concat(prior.historial || []).some(entry => entry && entry.gestionId === id)
        ? { ok: true, alreadyApplied: true, request, policy: prior }
        : { ok: false, errors: ['endoso_aplicado_readback_inconsistente'] };
    }
    const def = typeDef(request.endorsementType);
    if (!def || !def.apply) return { ok: false, errors: ['tipo_endoso_requiere_flujo_configurado'] };
    if (request.endorsementStage !== 'APROBADO_PENDIENTE_APLICACION') {
      const approved = await approve(id, approval);
      if (!approved.ok) return approved;
      request = approved.request;
    }
    if (!clean(request.referenciaAseguradora) || !clean(request.documentRef) || !clean(request.fechaEfectiva))
      return { ok: false, errors: ['aprobacion_documental_endoso_incompleta'] };
    const policy = S().get('polizas', request.polizaId);
    if (!policy) return { ok: false, errors: ['poliza_no_encontrada'] };
    if (A() && A().canView && !A().canView('polizas', policy, 'cliente360')) return { ok: false, errors: ['poliza_fuera_alcance'] };
    if (!S().batchDurable) return { ok: false, errors: ['escritura_durable_endoso_no_disponible'] };
    const before = clone(policy), proposal = request.propuestaCambios || {};
    const opId = approval.operationId || ('endapply_' + request.id);
    let result;
    if (request.endorsementType === 'sustitucion_vehiculo') result = applyVehicleSubstitution(request, policy, proposal, opId);
    else if (request.endorsementType === 'beneficiarios') result = applyBeneficiaries(request, policy, proposal);
    else if (request.endorsementType === 'forma_pago') {
      try { result = await applyPaymentPlan(request, policy, proposal); }
      catch (error) { return { ok: false, errors: ['motor_poliza_endoso_no_confirmado'], error: clean(error && (error.code || error.message || error)) }; }
    }
    else if (request.endorsementType === 'datos_riesgo') result = applyRiskData(request, policy, proposal);
    else result = { ok: false, errors: ['tipo_endoso_requiere_flujo_configurado'] };
    if (!result.ok) return result;
    const updatedPolicy = S().get('polizas', policy.id);
    if (!updatedPolicy) return { ok: false, errors: ['poliza_readback_endoso_no_disponible'] };
    const hist = [].concat(updatedPolicy.historial || []);
    if (!hist.some(x => x && x.gestionId === request.id)) hist.push({ icon: '📜', fecha: request.fechaEfectiva || today(), t: 'Endoso aplicado', d: request.endorsementLabel + ' · ' + request.referenciaAseguradora, gestionId: request.id });
    const checklist = [].concat(request.checklist || []).map(x => /Aprobación|aplicado/.test(x.t || '') ? Object.assign({}, x, { done: true }) : x);
    const requestPatch = {
      endorsementStage: 'APLICADO', estado: 'Resuelta', checklist,
      resultado: 'Endoso aplicado · ' + request.referenciaAseguradora, policyUpdatedId: policy.id,
      proximaAccion: 'Cerrada', resueltaAt: now(), operationId: opId, actualizado: today(),
      bitacora: [].concat(request.bitacora || [], [{ ts: now(), user: actor().nombre || role(), campo: 'Aplicación', de: request.endorsementStage, a: 'APLICADO', origen: 'manual' }])
    };
    const policyPatch = Object.assign({}, result.policyPatch || {}, { historial: hist, ultimoEndosoId: request.id, actualizado: now() });
    const activity = { id: 'act_' + opId, tenantId: policy.tenantId || tenantId(), clienteId: policy.clienteId,
      asesorId: policy.asesorId, pais: policy.pais, tipo: 'endoso', icon: '✅', fecha: request.fechaEfectiva || today(),
      titulo: 'Endoso aplicado', detalle: request.endorsementLabel + ' · póliza ' + policy.numero,
      gestionId: request.id, polizaId: policy.id, operationId: opId };
    try {
      const ack = await S().batchDurable([].concat(result.mutations || [], [
        { action: 'update', collection: 'polizas', id: policy.id, payload: policyPatch },
        { action: 'update', collection: 'gestiones', id: request.id, payload: requestPatch },
        { action: 'insert', collection: 'actividades', id: activity.id, payload: activity }
      ]), { requestId: opId + '_complete' });
      if (!ack || ack.ok !== true || ack.canonicalReadback !== true) throw Error('ENDOSO_APPLY_SERVER_ACK_REQUIRED');
      const savedRequest = S().get('gestiones', request.id), savedPolicy = S().get('polizas', policy.id);
      if (!savedRequest || savedRequest.endorsementStage !== 'APLICADO' || !savedPolicy || savedPolicy.ultimoEndosoId !== request.id)
        throw Error('ENDOSO_APPLY_READBACK_REQUIRED');
      try { if (A() && A().audit) A().audit('aplicar_endoso', 'polizas', policy.id, before, savedPolicy, approval.motivo || request.endorsementLabel, { gestionId: request.id, operationId: opId, documentRef: request.documentRef }); } catch (ignore) {}
      return { ok: true, request: savedRequest, policy: savedPolicy, result, operationId: opId, durable: true };
    } catch (error) {
      const financiallyApplied = request.endorsementType === 'forma_pago' && (S().get('polizas', policy.id) || {}).endosoFinancieroAplicadoId === request.id;
      return { ok: false, errors: ['aplicacion_endoso_no_confirmada'], error: clean(error && (error.code || error.message || error)), operationId: opId,
        partialCommit: financiallyApplied, retrySameRequest: financiallyApplied };
    }
  }

  return { DEFAULT_TYPES, typeDefs, typeDef, canManage, requestKey, existing, createRequest, approve, apply };
})();
