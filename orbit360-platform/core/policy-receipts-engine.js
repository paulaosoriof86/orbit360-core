/* ============================================================
   Orbit 360 · Motor operativo Póliza → Recibos/Cobros v1.199
   Contrato multi-tenant, idempotente y no destructivo.
   No reemplaza Orbit.store ni crea movimientos financieros.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.policyReceipts = (function () {
  const S = () => Orbit.store;
  const A = () => Orbit.access;
  const ACTIVE = new Set(['vigente', 'porrenovar']);
  const PAID = new Set(['pagado', 'conciliado']);
  const MANAGE_ROLES = new Set(['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo']);
  const RECONCILE_ROLES = new Set(['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo', 'Finanzas']);
  const CRITICAL_FIELDS = new Set([
    'numero','clienteId','asesorId','aseguradoraId','pais','moneda','ramo','subramo','producto',
    'estado','vigenciaInicio','vigenciaFin','frecuencia','formaPago','cuotas','primaNeta',
    'gastosEmision','gastosFinan','otros','ivaPct','ivaMonto','primaTotal','conducto'
  ]);
  const LOCKED_AFTER_PAYMENT = new Set([
    'numero','clienteId','asesorId','aseguradoraId','pais','moneda','vigenciaInicio','frecuencia',
    'formaPago','cuotas','primaNeta','gastosEmision','gastosFinan','otros','ivaPct','ivaMonto',
    'primaTotal','conducto'
  ]);

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    if (A() && A().norm) return A().norm(v);
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }
  function now() { return new Date().toISOString(); }
  function today() {
    try { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : now().slice(0, 10); }
    catch (e) { return now().slice(0, 10); }
  }
  function clone(v) {
    try { return JSON.parse(JSON.stringify(v)); }
    catch (e) { return Object.assign({}, v || {}); }
  }
  function tenantId() { return A() && A().tenantId ? A().tenantId() : ''; }
  function role() { return A() && A().activeRole ? A().activeRole() : 'Sin rol'; }
  function actor() { return A() && A().actorUser ? A().actorUser() : { nombre: 'Usuario', rolActivo: role(), asesorId: '' }; }
  function canManagePolicies() {
    const r = role();
    const advisor = A() && A().actorAdvisor ? A().actorAdvisor() : {};
    const extra = [].concat(advisor.permisosExtra || advisor.extras || []);
    const restricted = [].concat(advisor.restricciones || []);
    if (restricted.includes('polizas_editar') || restricted.includes('polizas')) return false;
    return MANAGE_ROLES.has(r) || extra.includes('polizas_editar');
  }
  function canApplyPayments() {
    const r = role();
    const advisor = A() && A().actorAdvisor ? A().actorAdvisor() : {};
    const extra = [].concat(advisor.permisosExtra || advisor.extras || []);
    const restricted = [].concat(advisor.restricciones || []);
    if (restricted.includes('cobros_aplicar') || restricted.includes('cobros')) return false;
    return RECONCILE_ROLES.has(r) || extra.includes('cobros_aplicar');
  }
  function isActiveState(state) { return ACTIVE.has(norm(state)); }
  function isPaidReceipt(c) { return !!(c && (PAID.has(norm(c.estado)) || c.fechaPago)); }
  function currencyFor(country) {
    try { if (A() && A().currencyFor) return A().currencyFor(country); } catch (e) {}
    try { const p = (Orbit.PAISES || []).find(x => x.id === country); return (p && p.moneda) || ''; } catch (e) {}
    return '';
  }
  function linkedInsurerCountry(insurer, country) {
    if (!insurer) return false;
    if (insurer.pais === country) return true;
    return [].concat(insurer.paises || []).includes(country);
  }
  function canonicalPolicyKey(p) {
    const tid = clean(p.tenantId || tenantId());
    return [tid, clean(p.pais), clean(p.aseguradoraId), norm(p.numero)].join('|');
  }
  function sequenceOf(c, fallback) {
    const raw = clean(c && (c.secuencia || c.cuota));
    const m = raw.match(/^(\d+)/);
    return m ? +m[1] : (+fallback || 0);
  }
  function receiptId(policyId, sequence) { return 'cob_' + clean(policyId) + '_' + String(sequence).padStart(3, '0'); }
  function operationId(prefix) { return (prefix || 'op') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  function validatePolicy(input, currentId) {
    const p = input || {};
    const errors = [], warnings = [];
    const client = clean(p.clienteId) ? S().get('clientes', p.clienteId) : null;
    const insurer = clean(p.aseguradoraId) ? S().get('aseguradoras', p.aseguradoraId) : null;
    const country = clean(p.pais || (client && client.pais));
    const currency = clean(p.moneda || p.divisa || currencyFor(country));
    const expectedCurrency = currencyFor(country);
    const statusActive = isActiveState(p.estado);

    if (!clean(p.tenantId || tenantId())) errors.push('tenant_requerido');
    if (!client) errors.push('cliente_requerido');
    if (!country) errors.push('pais_requerido');
    if (!currency) errors.push('moneda_requerida');
    if (client && client.pais && country && client.pais !== country) errors.push('pais_no_coincide_cliente');
    if (expectedCurrency && currency && expectedCurrency !== currency) errors.push('moneda_no_coincide_pais');
    if (!insurer) errors.push('aseguradora_requerida');
    if (insurer && insurer.vinculada === false) errors.push('aseguradora_no_vinculada');
    if (insurer && country && !linkedInsurerCountry(insurer, country)) errors.push('aseguradora_no_habilitada_pais');
    if (!clean(p.numero)) errors.push('numero_poliza_requerido');
    if (!clean(p.ramo)) errors.push('ramo_requerido');
    if (!clean(p.producto || p.subramo)) errors.push('producto_requerido');
    if (!clean(p.estado)) errors.push('estado_requerido');
    if (!clean(p.vigenciaInicio)) errors.push('vigencia_inicio_requerida');
    if (!clean(p.vigenciaFin)) errors.push('vigencia_fin_requerida');
    if (p.vigenciaInicio && p.vigenciaFin && String(p.vigenciaFin) <= String(p.vigenciaInicio)) errors.push('vigencia_invalida');
    if (statusActive && !(+p.primaNeta > 0)) errors.push('prima_neta_requerida');
    if (statusActive && !(+p.cuotas > 0 || (Orbit.primas && Orbit.primas.cuotasDe(p.frecuencia) > 0))) errors.push('cuotas_requeridas');

    const key = canonicalPolicyKey(Object.assign({}, p, { pais: country, moneda: currency }));
    const duplicate = (S().all('polizas') || []).find(x => x.id !== currentId && canonicalPolicyKey(x) === key);
    if (duplicate) errors.push('poliza_duplicada:' + duplicate.id);

    if (!statusActive) warnings.push('estado_historico_sin_cartera');
    if (!clean(p.formaPago)) warnings.push('forma_pago_requiere_validacion');
    if (!clean(p.conducto)) warnings.push('conducto_requiere_validacion');

    return { ok: errors.length === 0, errors, warnings, client, insurer, country, currency, key, active: statusActive };
  }

  function premiumBreakdown(raw, country) {
    const frequency = clean(raw.frecuencia || raw.forma || 'Contado');
    const installments = Math.max(1, +raw.cuotas || (Orbit.primas ? Orbit.primas.cuotasDe(frequency) : 1));
    let recargoPct = raw.recargoFinPct;
    if (recargoPct == null && +raw.primaNeta > 0 && +raw.gastosFinan >= 0) recargoPct = (+raw.gastosFinan / +raw.primaNeta) * 100;
    return Orbit.primas.desglose(+raw.primaNeta || 0, country, {
      fraccionado: installments > 1,
      gastosEmision: +raw.gastosEmision || 0,
      otros: +raw.otros || 0,
      recargoFinPct: recargoPct,
      ivaPct: raw.ivaPct
    });
  }

  function preparePolicy(raw, existing, opId) {
    const base = Object.assign({}, existing || {}, raw || {});
    const client = S().get('clientes', base.clienteId) || {};
    base.tenantId = clean(base.tenantId || tenantId());
    base.pais = clean(base.pais || client.pais);
    base.moneda = clean(base.moneda || base.divisa || currencyFor(base.pais));
    base.divisa = base.moneda;
    base.asesorId = clean(base.asesorId || client.asesorId);
    base.producto = clean(base.producto || base.subramo);
    base.frecuencia = clean(base.frecuencia || base.forma || 'Contado');
    base.forma = base.frecuencia;
    base.cuotas = Math.max(1, +base.cuotas || Orbit.primas.cuotasDe(base.frecuencia));
    base.estado = clean(base.estado || 'Vigente');
    const d = premiumBreakdown(base, base.pais);
    base.primaNeta = d.neta;
    base.gastosEmision = d.gastosEmision;
    base.gastosFinan = d.gastosFinan;
    base.otros = d.otros;
    base.ivaPct = d.ivaPct;
    base.ivaMonto = d.iva;
    base.iva = d.iva;
    base.baseGravable = d.baseGravable;
    base.primaTotal = d.total;
    base.prima = d.total;
    base.recargoFinPct = d.recargoPct;
    base.policyKey = canonicalPolicyKey(base);
    base.fuente = clean(base.fuente || (existing ? existing.fuente : 'ingreso_manual_plataforma'));
    base.operationId = opId;
    base.actualizado = now();
    if (!existing) {
      base.id = clean(base.id || ('pol_' + Date.now().toString(36)));
      base.creado = now();
      base.creadoPor = actor().id || actor().nombre;
      base.rolCreacion = role();
    }
    delete base.vehiculo;
    base.trazabilidad = Object.assign({}, base.trazabilidad || {}, {
      tenantId: base.tenantId, operacionId: opId, origen: base.fuente,
      actorId: actor().id || '', actorNombre: actor().nombre || '', rolActivo: role(), fecha: now()
    });
    return base;
  }

  function expectedReceipts(policy) {
    if (!isActiveState(policy.estado)) return [];
    const d = premiumBreakdown(policy, policy.pais);
    const rows = Orbit.primas.recibos(d, {
      frecuencia: policy.frecuencia,
      cuotas: policy.cuotas,
      vigenciaInicio: policy.vigenciaInicio,
      emisionEn: policy.emisionEn,
      recargoEn: policy.recargoEn,
      comAseguradoraPct: policy.comAseguradoraPct,
      comVendedorPct: policy.comVendedorPct
    });
    return rows.map((r, i) => ({
      id: receiptId(policy.id, i + 1),
      receiptKey: [policy.tenantId, policy.id, i + 1].join('|'),
      tenantId: policy.tenantId,
      polizaId: policy.id,
      clienteId: policy.clienteId,
      asesorId: policy.asesorId,
      aseguradoraId: policy.aseguradoraId,
      pais: policy.pais,
      moneda: policy.moneda,
      secuencia: i + 1,
      cuota: r.n,
      neta: r.neta,
      gastosEmision: r.gastosEmision,
      gastosFinan: r.gastosFinan,
      otros: r.otros,
      iva: r.iva,
      monto: r.total,
      montoTotal: r.total,
      comAseguradora: r.comAseguradora,
      comVendedor: r.comVendedor,
      vence: r.vence,
      fechaLimite: r.fechaLimite,
      estado: String(r.vence) < today() ? 'Vencido' : 'Pendiente',
      fechaPago: null,
      metodo: null,
      conducto: policy.conducto || '',
      conciliado: false,
      carteraActiva: true,
      fuente: policy.fuente,
      operationId: policy.operationId
    }));
  }

  function syncReceipts(policy, opts) {
    opts = opts || {};
    const opId = opts.operationId || policy.operationId || operationId('rec');
    const existing = (S().where('cobros', c => c.polizaId === policy.id) || []).slice()
      .sort((a, b) => sequenceOf(a) - sequenceOf(b));
    const expected = expectedReceipts(policy);
    const used = new Set();
    const result = { inserted: [], updated: [], preserved: [], annulled: [], expected: expected.length, operationId: opId };

    function candidatesFor(seq) {
      return existing.filter(c => !used.has(c.id) && sequenceOf(c) === seq);
    }

    expected.forEach((target, index) => {
      const seq = index + 1;
      const candidates = candidatesFor(seq);
      const paid = candidates.find(isPaidReceipt);
      const reusable = paid || candidates[0];
      if (reusable) {
        used.add(reusable.id);
        if (isPaidReceipt(reusable)) {
          result.preserved.push(reusable.id);
        } else {
          const patch = Object.assign({}, target, {
            id: reusable.id,
            estado: norm(reusable.estado) === 'vencido' || String(target.vence) < today() ? 'Vencido' : 'Pendiente',
            reportado: reusable.reportado || null,
            validadoReporte: !!reusable.validadoReporte,
            soporteNombre: reusable.soporteNombre || '',
            operationId: opId,
            actualizado: now()
          });
          S().update('cobros', reusable.id, patch);
          result.updated.push(reusable.id);
        }
        candidates.filter(x => x.id !== reusable.id && !isPaidReceipt(x)).forEach(x => {
          used.add(x.id);
          S().update('cobros', x.id, {
            estado: 'Anulado', carteraActiva: false, anuladoMotivo: 'duplicado_recibo_misma_secuencia',
            operationId: opId, actualizado: now()
          });
          result.annulled.push(x.id);
        });
      } else {
        const row = Object.assign({}, target, { operationId: opId, creado: now(), actualizado: now() });
        S().insert('cobros', row);
        used.add(row.id);
        result.inserted.push(row.id);
      }
    });

    existing.filter(c => !used.has(c.id) && !isPaidReceipt(c) && norm(c.estado) !== 'anulado').forEach(c => {
      S().update('cobros', c.id, {
        estado: 'Anulado', carteraActiva: false,
        anuladoMotivo: isActiveState(policy.estado) ? 'plan_pago_reemplazado' : 'poliza_sin_cartera',
        operationId: opId, actualizado: now()
      });
      result.annulled.push(c.id);
    });

    const expectedTotal = expected.reduce((s, c) => s + (+c.monto || 0), 0);
    result.expectedTotal = Orbit.primas.r2(expectedTotal);
    result.policyTotal = Orbit.primas.r2(+policy.primaTotal || +policy.prima || 0);
    result.totalMatches = Math.abs(result.expectedTotal - result.policyTotal) < 0.02;
    return result;
  }

  function updateClientState(clientId) {
    if (!clientId || !A() || !A().deriveClientState) return null;
    const c = S().get('clientes', clientId);
    if (!c) return null;
    const state = A().deriveClientState(clientId);
    if (c.estadoOperativo !== state || c.estado !== state) {
      S().update('clientes', clientId, { estadoOperativo: state, estado: state, estadoActualizado: now() });
    }
    return state;
  }

  function recordActivity(policy, title, detail, opId) {
    try {
      S().insert('actividades', {
        id: 'act_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        tenantId: policy.tenantId, clienteId: policy.clienteId, asesorId: policy.asesorId,
        tipo: 'poliza', icon: '📑', fecha: today(), titulo, detalle, operacionId: opId
      });
    } catch (e) {}
  }

  function createPolicy(raw, options) {
    options = options || {};
    if (!canManagePolicies()) return { ok: false, errors: ['permiso_poliza_denegado'] };
    const opId = options.operationId || operationId('pol');
    const prepared = preparePolicy(raw, null, opId);
    const check = validatePolicy(prepared, '');
    if (!check.ok) return Object.assign({ ok: false, policy: prepared }, check);
    prepared.policyKey = check.key;
    prepared.requiereValidacion = check.warnings.length > 0;
    prepared.validacion = { estado: prepared.requiereValidacion ? 'REQUIERE_VALIDACION' : 'VALIDADA_EN_CAPTURA', alertas: check.warnings, fecha: now() };
    prepared.historial = [].concat(prepared.historial || [], [{ icon: '✳', fecha: today(), t: 'Emisión de póliza', d: 'Alta desde plataforma · operación ' + opId }]);
    try {
      S().insert('polizas', prepared);
      let vehicle = null;
      if (raw.vehiculo && Object.keys(raw.vehiculo).some(k => clean(raw.vehiculo[k]))) {
        vehicle = Object.assign({}, raw.vehiculo, {
          id: clean(raw.vehiculo.id || ('veh_' + Date.now().toString(36))),
          tenantId: prepared.tenantId, clienteId: prepared.clienteId, polizaId: prepared.id,
          asesorId: prepared.asesorId, pais: prepared.pais, fuente: prepared.fuente, operationId: opId
        });
        S().insert('vehiculos', vehicle);
      }
      const receipts = syncReceipts(prepared, { operationId: opId });
      updateClientState(prepared.clienteId);
      recordActivity(prepared, 'Póliza creada: ' + prepared.numero, prepared.ramo + ' · ' + prepared.moneda + ' ' + prepared.primaTotal, opId);
      if (A() && A().audit) A().audit('crear_con_recibos', 'polizas', prepared.id, null, prepared, options.motivo || 'Alta operativa de póliza', { operacionId: opId, recibos: receipts });
      return { ok: true, policy: prepared, receipts, vehicle, warnings: check.warnings, operationId: opId };
    } catch (error) {
      try { S().update('polizas', prepared.id, { estado: 'Requiere validación', requiereValidacion: true, operacionError: String(error && (error.message || error)), operationId: opId }); } catch (ignore) {}
      return { ok: false, errors: ['operacion_incompleta'], error: String(error && (error.message || error)), policy: prepared, operationId: opId };
    }
  }

  function updatePolicy(id, patch, options) {
    options = options || {};
    if (!canManagePolicies()) return { ok: false, errors: ['permiso_poliza_denegado'] };
    const current = S().get('polizas', id);
    if (!current) return { ok: false, errors: ['poliza_no_encontrada'] };
    const before = clone(current);
    const opId = options.operationId || operationId('polupd');
    const merged = preparePolicy(Object.assign({}, current, patch || {}, { id }), current, opId);
    const changedCritical = Object.keys(patch || {}).filter(k => CRITICAL_FIELDS.has(k) && JSON.stringify(before[k]) !== JSON.stringify(merged[k]));
    const paidReceipts = (S().where('cobros', c => c.polizaId === id) || []).filter(isPaidReceipt);
    const lockedChanges = changedCritical.filter(k => LOCKED_AFTER_PAYMENT.has(k));
    const reactivatingWithPayments = paidReceipts.length && !isActiveState(before.estado) && isActiveState(merged.estado);
    if (paidReceipts.length && (lockedChanges.length || reactivatingWithPayments)) {
      return { ok: false, errors: ['pagos_existentes_requieren_endoso'], lockedChanges, paidReceipts: paidReceipts.map(c => c.id) };
    }
    if (changedCritical.length && !clean(options.motivo)) return { ok: false, errors: ['motivo_requerido'], changedCritical };
    const check = validatePolicy(merged, id);
    if (!check.ok) return Object.assign({ ok: false, policy: merged }, check);
    merged.policyKey = check.key;
    merged.requiereValidacion = check.warnings.length > 0;
    merged.validacion = { estado: merged.requiereValidacion ? 'REQUIERE_VALIDACION' : 'VALIDADA_EN_CAPTURA', alertas: check.warnings, fecha: now() };
    merged.historial = [].concat(current.historial || [], [{
      icon: '✏', fecha: today(), t: 'Actualización de póliza',
      d: (options.motivo || 'Actualización') + (changedCritical.length ? ' · ' + changedCritical.join(', ') : '')
    }]);
    try {
      S().update('polizas', id, merged);
      const receipts = syncReceipts(merged, { operationId: opId });
      updateClientState(before.clienteId);
      updateClientState(merged.clienteId);
      recordActivity(merged, 'Póliza actualizada: ' + merged.numero, options.motivo || 'Actualización operativa', opId);
      if (A() && A().audit) A().audit('actualizar_con_recibos', 'polizas', id, before, merged, options.motivo, { operacionId: opId, recibos: receipts, camposCriticos: changedCritical });
      return { ok: true, policy: merged, receipts, warnings: check.warnings, operationId: opId };
    } catch (error) {
      try { S().update('polizas', id, Object.assign({}, before, { operacionError: String(error && (error.message || error)), operationId: opId })); } catch (ignore) {}
      return { ok: false, errors: ['operacion_incompleta'], error: String(error && (error.message || error)), operationId: opId };
    }
  }

  function applyPayment(receiptIdValue, payment, options) {
    options = options || {};
    if (!canApplyPayments()) return { ok: false, errors: ['permiso_cobro_denegado'] };
    const c = S().get('cobros', receiptIdValue);
    if (!c) return { ok: false, errors: ['recibo_no_encontrado'] };
    if (isPaidReceipt(c)) return { ok: true, alreadyApplied: true, receipt: c };
    if (!['pendiente','vencido'].includes(norm(c.estado))) return { ok: false, errors: ['estado_recibo_no_aplicable'] };
    const policy = S().get('polizas', c.polizaId);
    if (!policy || !isActiveState(policy.estado)) return { ok: false, errors: ['poliza_sin_cartera_activa'] };
    if (c.reportado && !c.validadoReporte && !options.bypassReportValidation) return { ok: false, errors: ['reporte_cliente_requiere_validacion'] };
    const before = clone(c);
    const opId = options.operationId || operationId('pay');
    const patch = {
      estado: 'Pagado',
      fechaPago: clean(payment && payment.fecha) || today(),
      metodo: clean(payment && payment.metodo) || 'No especificado',
      conciliado: false,
      carteraActiva: true,
      pagoAplicadoPor: actor(),
      pagoAplicadoAt: now(),
      soporteRef: clean(payment && (payment.documentRef || payment.soporteRef)),
      operationId: opId,
      actualizado: now()
    };
    S().update('cobros', c.id, patch);
    const after = S().get('cobros', c.id);
    updateClientState(c.clienteId);
    try { if (Orbit.q && Orbit.q.postRecaudo) Orbit.q.postRecaudo(after, patch.fechaPago, patch.metodo); } catch (e) {}
    try {
      S().insert('actividades', {
        id: 'act_' + Date.now().toString(36), tenantId: c.tenantId || policy.tenantId,
        clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'cobro', icon: '💳',
        fecha: patch.fechaPago, titulo: 'Pago confirmado', detalle: clean(c.moneda) + ' ' + (+c.monto || 0) + ' · pendiente conciliación bancaria',
        operacionId: opId
      });
    } catch (e) {}
    if (A() && A().audit) A().audit('aplicar_pago', 'cobros', c.id, before, after, options.motivo || 'Confirmación operativa de recaudo', { operacionId: opId, noFinmovs: true });
    return { ok: true, receipt: after, operationId: opId };
  }

  function createReconciliationProposal(receiptIdValue, input) {
    if (!canApplyPayments()) return { ok: false, errors: ['permiso_conciliacion_denegado'] };
    const c = S().get('cobros', receiptIdValue);
    if (!c || norm(c.estado) !== 'pagado') return { ok: false, errors: ['recibo_pagado_requerido'] };
    const p = S().get('polizas', c.polizaId) || {};
    const cli = S().get('clientes', c.clienteId) || {};
    const opId = operationId('conc');
    const proposal = {
      id: 'conc_' + Date.now().toString(36), tenantId: c.tenantId || p.tenantId || tenantId(),
      estado_bandeja: 'PROPUESTA', estado_revision: 'Pendiente de revisión', score: 'REQUIERE_VALIDACION',
      fuente: clean(input && input.fuente) || 'soporte_pago_plataforma',
      archivo: clean(input && input.archivo), fila: clean(input && input.fila),
      pais: c.pais || p.pais || cli.pais, moneda: c.moneda || p.moneda,
      clienteId: c.clienteId, polizaId: c.polizaId, reciboId: c.id,
      cliente: cli.nombre || '', poliza: p.numero || '', recibo: c.cuota || '',
      cliente_poliza_recibo: [cli.nombre, p.numero, c.cuota].filter(Boolean).join(' · '),
      monto: +c.monto || 0, accion_propuesta: 'conciliar_recibo_pagado',
      responsable: actor().nombre, ultima_actualizacion: now(),
      documentRef: clean(input && input.documentRef),
      bloqueos: clean(input && input.documentRef) ? [] : ['documento_soporte_requerido'],
      acciones_permitidas: ['ver_detalle','tomar_en_revision','bloquear','anular'],
      operationId: opId
    };
    S().insert('conciliaciones', proposal);
    S().update('cobros', c.id, { conciliacionPropuestaId: proposal.id, conciliacionEstado: 'PROPUESTA', actualizado: now() });
    if (A() && A().audit) A().audit('proponer_conciliacion', 'conciliaciones', proposal.id, null, proposal, 'Propuesta creada; no aplica pago ni conciliación', { operacionId: opId });
    return { ok: true, proposal, operationId: opId };
  }

  return {
    ACTIVE, isActiveState, isPaidReceipt, canManagePolicies, canApplyPayments,
    canonicalPolicyKey, validatePolicy, preparePolicy, expectedReceipts, syncReceipts,
    createPolicy, updatePolicy, applyPayment, createReconciliationProposal, updateClientState,
    receiptId, sequenceOf
  };
})();
