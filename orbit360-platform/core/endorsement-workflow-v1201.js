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

  function createRequest(policyId, typeId, proposal, options) {
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
      id: 'ges_end_' + Date.now().toString(36), tenantId: policy.tenantId || tenantId(),
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
    S().insert('gestiones', row);
    try {
      S().insert('actividades', { id: 'act_' + Date.now().toString(36), tenantId: row.tenantId, clienteId: row.clienteId, asesorId: row.asesorId, tipo: 'endoso', icon: '📜', fecha: today(), titulo: 'Endoso solicitado', detalle: def.label + ' · póliza ' + policy.numero, gestionId: row.id, polizaId: policy.id, operationId: opId });
    } catch (e) {}
    if (A() && A().audit) A().audit('solicitar_endoso', 'gestiones', row.id, null, row, options.motivo || def.label, { operationId: opId, policyId });
    return { ok: true, request: row, operationId: opId };
  }

  function approve(id, approval) {
    approval = approval || {};
    if (!canManage()) return { ok: false, errors: ['permiso_endoso_denegado'] };
    const request = S().get('gestiones', id);
    if (!request || request.workflowType !== 'endorsement_request') return { ok: false, errors: ['solicitud_endoso_no_encontrada'] };
    if (!ACTIVE.has(request.endorsementStage)) return { ok: false, errors: ['solicitud_endoso_cerrada'] };
    if (!clean(approval.referenciaAseguradora)) return { ok: false, errors: ['referencia_aprobacion_requerida'] };
    if (!clean(approval.documentRef || request.documentRef)) return { ok: false, errors: ['documento_endoso_aprobado_requerido'] };
    if (!clean(approval.fechaEfectiva)) return { ok: false, errors: ['fecha_efectiva_requerida'] };
    const before = clone(request);
    const bitacora = [].concat(request.bitacora || [], [{ ts: now(), user: actor().nombre || role(), campo: 'Aprobación', de: request.endorsementStage, a: 'APROBADO_PENDIENTE_APLICACION', origen: 'manual' }]);
    S().update('gestiones', id, {
      endorsementStage: 'APROBADO_PENDIENTE_APLICACION', estado: 'En proceso',
      referenciaAseguradora: clean(approval.referenciaAseguradora), documentRef: clean(approval.documentRef || request.documentRef),
      fechaEfectiva: clean(approval.fechaEfectiva), aprobadoAt: now(), aprobadoPor: actor(),
      proximaAccion: 'Aplicar cambio aprobado', bitacora, actualizado: today()
    });
    const after = S().get('gestiones', id);
    if (A() && A().audit) A().audit('aprobar_endoso', 'gestiones', id, before, after, approval.motivo || 'Aprobación de aseguradora');
    return { ok: true, request: after };
  }

  function applyVehicleSubstitution(request, policy, proposal, opId) {
    const next = proposal.nuevoVehiculo || proposal.vehicle || {};
    if (![next.placa,next.marca,next.linea,next.chasis,next.motor].some(clean)) return { ok: false, errors: ['identidad_nuevo_vehiculo_requerida'] };
    const currentId = clean(proposal.vehiculoId || policy.vehiculoId);
    const current = currentId ? S().get('vehiculos', currentId) : (S().all('vehiculos') || []).find(v => v.polizaId === policy.id && norm(v.estado) !== 'historico');
    if (current) S().update('vehiculos', current.id, { estado: 'Histórico', vigenciaFin: request.fechaEfectiva, sustituidoPorGestionId: request.id, actualizado: now() });
    const id = clean(next.id || ('veh_' + Date.now().toString(36)));
    const row = Object.assign({}, next, {
      id, tenantId: policy.tenantId || tenantId(), clienteId: policy.clienteId, polizaId: policy.id,
      asesorId: policy.asesorId, pais: policy.pais, estado: 'Activo', vigenciaInicio: request.fechaEfectiva,
      fuente: 'endoso_aprobado', documentRef: request.documentRef, operationId: opId
    });
    S().insert('vehiculos', row);
    S().update('polizas', policy.id, { vehiculoId: id, actualizado: now() });
    return { ok: true, vehicle: row, previousVehicleId: current && current.id || '' };
  }

  function applyBeneficiaries(request, policy, proposal) {
    const list = Array.isArray(proposal.beneficiarios) ? proposal.beneficiarios.filter(Boolean) : [];
    if (!list.length) return { ok: false, errors: ['beneficiarios_requeridos'] };
    S().update('polizas', policy.id, { beneficiarios: clone(list), actualizado: now() });
    return { ok: true, beneficiaries: list };
  }

  function applyPaymentPlan(request, policy, proposal) {
    if (!P() || !P().updatePolicy) return { ok: false, errors: ['motor_polizas_no_disponible'] };
    const patch = {
      frecuencia: clean(proposal.frecuencia), formaPago: clean(proposal.formaPago),
      cuotas: Math.max(1, +proposal.cuotas || 1), conducto: clean(proposal.conducto || policy.conducto)
    };
    return P().updatePolicy(policy.id, patch, { motivo: 'Endoso aprobado · cambio de forma de pago · ' + request.referenciaAseguradora });
  }

  function applyRiskData(request, policy, proposal) {
    const requested = proposal.patch || {};
    const patch = {};
    Object.keys(requested).forEach(k => { if (SAFE_POLICY_FIELDS.has(k)) patch[k] = requested[k]; });
    if (!Object.keys(patch).length) return { ok: false, errors: ['campos_no_financieros_requeridos'] };
    S().update('polizas', policy.id, Object.assign({}, patch, { actualizado: now() }));
    return { ok: true, patch };
  }

  function apply(id, approval) {
    approval = approval || {};
    if (!canManage()) return { ok: false, errors: ['permiso_endoso_denegado'] };
    let request = S().get('gestiones', id);
    if (!request || request.workflowType !== 'endorsement_request') return { ok: false, errors: ['solicitud_endoso_no_encontrada'] };
    if (request.endorsementStage !== 'APROBADO_PENDIENTE_APLICACION') {
      const approved = approve(id, approval);
      if (!approved.ok) return approved;
      request = approved.request;
    }
    const policy = S().get('polizas', request.polizaId);
    if (!policy) return { ok: false, errors: ['poliza_no_encontrada'] };
    const def = typeDef(request.endorsementType);
    if (!def || !def.apply) return { ok: false, errors: ['tipo_endoso_requiere_flujo_configurado'] };
    const before = clone(policy), proposal = request.propuestaCambios || {};
    const opId = approval.operationId || operationId('endapply');
    let result;
    if (request.endorsementType === 'sustitucion_vehiculo') result = applyVehicleSubstitution(request, policy, proposal, opId);
    else if (request.endorsementType === 'beneficiarios') result = applyBeneficiaries(request, policy, proposal);
    else if (request.endorsementType === 'forma_pago') result = applyPaymentPlan(request, policy, proposal);
    else if (request.endorsementType === 'datos_riesgo') result = applyRiskData(request, policy, proposal);
    else result = { ok: false, errors: ['tipo_endoso_requiere_flujo_configurado'] };
    if (!result.ok) return result;
    const updatedPolicy = S().get('polizas', policy.id);
    const hist = [].concat(updatedPolicy.historial || [], [{ icon: '📜', fecha: request.fechaEfectiva || today(), t: 'Endoso aplicado', d: request.endorsementLabel + ' · ' + request.referenciaAseguradora }]);
    S().update('polizas', policy.id, { historial: hist, ultimoEndosoId: request.id, actualizado: now() });
    const checklist = [].concat(request.checklist || []).map(x => /Aprobación|aplicado/.test(x.t || '') ? Object.assign({}, x, { done: true }) : x);
    S().update('gestiones', request.id, {
      endorsementStage: 'APLICADO', estado: 'Resuelta', checklist,
      resultado: 'Endoso aplicado · ' + request.referenciaAseguradora, policyUpdatedId: policy.id,
      proximaAccion: 'Cerrada', resueltaAt: now(), operationId: opId, actualizado: today()
    });
    try {
      S().insert('actividades', { id: 'act_' + Date.now().toString(36), tenantId: policy.tenantId, clienteId: policy.clienteId, asesorId: policy.asesorId, tipo: 'endoso', icon: '✅', fecha: request.fechaEfectiva || today(), titulo: 'Endoso aplicado', detalle: request.endorsementLabel + ' · póliza ' + policy.numero, gestionId: request.id, polizaId: policy.id, operationId: opId });
    } catch (e) {}
    if (A() && A().audit) A().audit('aplicar_endoso', 'polizas', policy.id, before, S().get('polizas', policy.id), approval.motivo || request.endorsementLabel, { gestionId: request.id, operationId: opId, documentRef: request.documentRef });
    return { ok: true, request: S().get('gestiones', request.id), policy: S().get('polizas', policy.id), result, operationId: opId };
  }

  return { DEFAULT_TYPES, typeDefs, typeDef, canManage, requestKey, existing, createRequest, approve, apply };
})();
