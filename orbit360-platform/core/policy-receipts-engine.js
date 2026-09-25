/* ============================================================
   Gravicentra Insurance · Motor operativo Póliza → Recibos Esperados v1.199/I2
   Contrato multi-tenant, idempotente y no destructivo.
   Recibos Esperados, Cartera Primas y Cobros son dominios separados.
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
    return [tid, clean(p.pais), clean(p.aseguradoraId), norm(p.numero), clean(p.clienteId)].join('|');
  }
  function policyVersionKey(p) {
    return [canonicalPolicyKey(p), clean(p.vigenciaInicio || p.vigenciaIni), clean(p.vigenciaFin)].join('|');
  }
  function sequenceOf(c, fallback) {
    const raw = clean(c && (c.secuencia || c.cuota));
    const m = raw.match(/^(\d+)/);
    return m ? +m[1] : (+fallback || 0);
  }
  // Preserve approved durable IDs; the historical prefix is technical compatibility only.
  function receiptId(policyId, sequence) { return 'cob_' + clean(policyId) + '_' + String(sequence).padStart(3, '0'); }
  function operationId(prefix) { return (prefix || 'op') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  function installmentsForFrequency(frequency, requested) {
    const f = clean(frequency || 'Contado');
    const monthly = norm(f) === 'mensual';
    const configured = Orbit.primas && Orbit.primas.cuotasDe ? +Orbit.primas.cuotasDe(f) : 1;
    if (monthly) return Math.max(1, Math.min(24, +requested || configured || 12));
    return Math.max(1, configured || 1);
  }

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

    return { ok: errors.length === 0, errors, warnings, client, insurer, country, currency, key, versionKey: policyVersionKey(Object.assign({}, p, { pais: country, moneda: currency })), active: statusActive };
  }

  function premiumBreakdown(raw, country) {
    const frequency = clean(raw.frecuencia || raw.forma || 'Contado');
    const installments = installmentsForFrequency(frequency, raw.cuotas);
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

  function normalizeVehicle(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const pick = (...values) => { for (const value of values) if (value !== undefined && value !== null && clean(value) !== '') return value; return ''; };
    const out = Object.assign({}, raw);
    out.placa = pick(raw.placa, raw.placaNormalizada, raw.placaFuente);
    out.anio = pick(raw.anio, raw.anioModelo, raw.modelo);
    out.marca = pick(raw.marca, raw.marcaFuente);
    out.linea = pick(raw.linea, raw.tipo, raw.modeloLinea);
    out.chasis = pick(raw.chasis, raw.chasisFuente, raw.vin);
    out.vin = pick(raw.vin, raw.chasis, raw.chasisFuente);
    out.motor = pick(raw.motor, raw.motorFuente);
    out.uso = pick(raw.uso, raw.usoFuente);
    out.color = pick(raw.color, raw.colorFuente);
    out.inciso = pick(raw.inciso, raw.incisoFuente);
    out.concepto = pick(raw.concepto, raw.conceptoFuente, raw.descripcion, raw.descripcionFuente);
    out.descripcion = pick(raw.descripcion, raw.descripcionFuente, raw.concepto, raw.conceptoFuente);
    out.comentarios = pick(raw.comentarios, raw.comentariosFuente);
    out.sumaAsegurada = pick(raw.sumaAsegurada, raw.valorAsegurado);
    return out;
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
    base.cuotas = installmentsForFrequency(base.frecuencia, base.cuotas);
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
    base.policyVersionKey = policyVersionKey(base);
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
    const existing = (S().where('recibosEsperados', c => c.polizaId === policy.id) || []).slice()
      .sort((a, b) => sequenceOf(a) - sequenceOf(b));
    const expected = expectedReceipts(policy);
    const used = new Set();
    const result = { inserted: [], updated: [], preserved: [], annulled: [], expected: expected.length, operationId: opId, collection: 'recibosEsperados' };

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
          S().update('recibosEsperados', reusable.id, patch);
          result.updated.push(reusable.id);
        }
        candidates.filter(x => x.id !== reusable.id && !isPaidReceipt(x)).forEach(x => {
          used.add(x.id);
          S().update('recibosEsperados', x.id, {
            estado: 'Anulado', carteraActiva: false, anuladoMotivo: 'duplicado_recibo_misma_secuencia',
            operationId: opId, actualizado: now()
          });
          result.annulled.push(x.id);
        });
      } else {
        const row = Object.assign({}, target, { operationId: opId, creado: now(), actualizado: now() });
        S().insert('recibosEsperados', row);
        used.add(row.id);
        result.inserted.push(row.id);
      }
    });

    existing.filter(c => !used.has(c.id) && !isPaidReceipt(c) && norm(c.estado) !== 'anulado').forEach(c => {
      S().update('recibosEsperados', c.id, {
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

  function portfolioId(receiptIdValue) { return 'car_' + clean(receiptIdValue); }
  function portfolioState(receipt) {
    const due = clean(receipt && (receipt.fechaLimite || receipt.vence || receipt.fechaVencimiento));
    const overdue = !!due && due < today();
    return { estado: overdue ? 'Vencido' : 'Pendiente', estadoOperativo: overdue ? 'pendiente_vencido' : 'futuro_pendiente', exigibilidad: overdue ? 'exigible' : 'futura' };
  }
  function syncPortfolio(policy, opts) {
    opts = opts || {};
    const opId = opts.operationId || policy.operationId || operationId('car');
    const receipts = (S().where('recibosEsperados', r => r.polizaId === policy.id) || []).filter(r => norm(r.estado) !== 'anulado');
    const existing = (S().where('carteraPrimas', r => r.polizaId === policy.id) || []).slice();
    const byReceipt = new Map(existing.filter(x => clean(x.reciboId)).map(x => [clean(x.reciboId), x]));
    const keep = new Set(), result = { inserted: [], updated: [], closed: [], expected: 0, operationId: opId, collection: 'carteraPrimas' };
    receipts.forEach(receipt => {
      const prior = byReceipt.get(clean(receipt.id));
      if (isPaidReceipt(receipt) || !isActiveState(policy.estado) || receipt.carteraActiva === false) {
        if (prior && prior.carteraActiva !== false) {
          S().update('carteraPrimas', prior.id, { carteraActiva: false, estado: 'Cerrada', estadoOperativo: 'cerrado_sin_saldo', exigibilidad: 'cerrada', operationId: opId, actualizado: now() });
          result.closed.push(prior.id);
        }
        return;
      }
      const st = portfolioState(receipt), id = prior ? prior.id : portfolioId(receipt.id);
      const row = Object.assign({}, prior || {}, {
        id, tenantId: policy.tenantId, polizaId: policy.id, reciboId: receipt.id, clienteId: policy.clienteId,
        asesorId: policy.asesorId, aseguradoraId: policy.aseguradoraId, pais: policy.pais, moneda: policy.moneda,
        secuencia: receipt.secuencia, cuota: receipt.cuota, monto: receipt.monto, montoTotal: receipt.montoTotal,
        primaTotal: receipt.montoTotal || receipt.monto, vence: receipt.vence, fechaLimite: receipt.fechaLimite || receipt.vence,
        fechaVencimiento: receipt.fechaLimite || receipt.vence, estado: st.estado, estadoOperativo: st.estadoOperativo,
        exigibilidad: st.exigibilidad, carteraTipo: 'cartera_activa', historicalExigible: false, carteraActiva: true,
        fuente: receipt.fuente || policy.fuente, operationId: opId, actualizado: now()
      });
      if (!prior) {
        row.creado = now(); row.saldoConciliado = false; row.estadoConciliacionSaldo = 'pendiente_conciliacion'; row.requiereValidacion = false;
        S().insert('carteraPrimas', row); result.inserted.push(id);
      } else { S().update('carteraPrimas', id, row); result.updated.push(id); }
      keep.add(id); result.expected += 1;
    });
    existing.filter(x => !keep.has(x.id) && x.carteraActiva !== false).forEach(x => {
      S().update('carteraPrimas', x.id, { carteraActiva: false, estado: 'Cerrada', estadoOperativo: isActiveState(policy.estado) ? 'cerrado_plan_reemplazado' : 'cerrado_poliza_no_activa', exigibilidad: 'cerrada', operationId: opId, actualizado: now() });
      result.closed.push(x.id);
    });
    return result;
  }

  function activityRow(policy,title,detail,opId){return{id:'act_'+clean(opId),tenantId:policy.tenantId,clienteId:policy.clienteId,asesorId:policy.asesorId,tipo:'poliza',icon:'📑',fecha:today(),titulo:title,detalle:detail,operacionId:opId};}
  function planReceipts(policy,opId,mutations){
    const existing=(S().where('recibosEsperados',c=>c.polizaId===policy.id)||[]).slice().sort((a,b)=>sequenceOf(a)-sequenceOf(b)),expected=expectedReceipts(policy),used=new Set(),finalRows=new Map(existing.map(x=>[x.id,clone(x)]));
    const result={inserted:[],updated:[],preserved:[],annulled:[],expected:expected.length,operationId:opId,collection:'recibosEsperados'};
    const addUpdate=(id,patch)=>{mutations.push({action:'update',collection:'recibosEsperados',id,payload:patch});finalRows.set(id,Object.assign({},finalRows.get(id)||{},clone(patch)));};
    expected.forEach((target,index)=>{const seq=index+1,candidates=existing.filter(c=>!used.has(c.id)&&sequenceOf(c)===seq),paid=candidates.find(isPaidReceipt),reusable=paid||candidates[0];
      if(reusable){used.add(reusable.id);if(isPaidReceipt(reusable))result.preserved.push(reusable.id);else{const patch=Object.assign({},target,{id:reusable.id,estado:norm(reusable.estado)==='vencido'||String(target.vence)<today()?'Vencido':'Pendiente',reportado:reusable.reportado||null,validadoReporte:!!reusable.validadoReporte,soporteNombre:reusable.soporteNombre||'',operationId:opId,actualizado:now()});addUpdate(reusable.id,patch);result.updated.push(reusable.id);}candidates.filter(x=>x.id!==reusable.id&&!isPaidReceipt(x)).forEach(x=>{used.add(x.id);addUpdate(x.id,{estado:'Anulado',carteraActiva:false,anuladoMotivo:'duplicado_recibo_misma_secuencia',operationId:opId,actualizado:now()});result.annulled.push(x.id);});}
      else{const row=Object.assign({},target,{operationId:opId,creado:now(),actualizado:now()});mutations.push({action:'insert',collection:'recibosEsperados',id:row.id,payload:row});finalRows.set(row.id,clone(row));used.add(row.id);result.inserted.push(row.id);}
    });
    existing.filter(c=>!used.has(c.id)&&!isPaidReceipt(c)&&norm(c.estado)!=='anulado').forEach(c=>{addUpdate(c.id,{estado:'Anulado',carteraActiva:false,anuladoMotivo:isActiveState(policy.estado)?'plan_pago_reemplazado':'poliza_sin_cartera',operationId:opId,actualizado:now()});result.annulled.push(c.id);});
    result.expectedTotal=Orbit.primas.r2(expected.reduce((s,c)=>s+(+c.monto||0),0));result.policyTotal=Orbit.primas.r2(+policy.primaTotal||+policy.prima||0);result.totalMatches=Math.abs(result.expectedTotal-result.policyTotal)<0.02;
    return{result,rows:[...finalRows.values()]};
  }
  function planPortfolio(policy,receipts,opId,mutations){
    const activeReceipts=[].concat(receipts||[]).filter(r=>norm(r.estado)!=='anulado'),existing=(S().where('carteraPrimas',r=>r.polizaId===policy.id)||[]).slice(),byReceipt=new Map(existing.filter(x=>clean(x.reciboId)).map(x=>[clean(x.reciboId),x])),keep=new Set(),result={inserted:[],updated:[],closed:[],expected:0,operationId:opId,collection:'carteraPrimas'};
    const update=(id,patch)=>mutations.push({action:'update',collection:'carteraPrimas',id,payload:patch});
    activeReceipts.forEach(receipt=>{const prior=byReceipt.get(clean(receipt.id));if(isPaidReceipt(receipt)||!isActiveState(policy.estado)||receipt.carteraActiva===false){if(prior&&prior.carteraActiva!==false){update(prior.id,{carteraActiva:false,estado:'Cerrada',estadoOperativo:'cerrado_sin_saldo',exigibilidad:'cerrada',operationId:opId,actualizado:now()});result.closed.push(prior.id);}return;}
      const st=portfolioState(receipt),id=prior?prior.id:portfolioId(receipt.id),row=Object.assign({},prior||{},{id,tenantId:policy.tenantId,polizaId:policy.id,reciboId:receipt.id,clienteId:policy.clienteId,asesorId:policy.asesorId,aseguradoraId:policy.aseguradoraId,pais:policy.pais,moneda:policy.moneda,secuencia:receipt.secuencia,cuota:receipt.cuota,monto:receipt.monto,montoTotal:receipt.montoTotal,primaTotal:receipt.montoTotal||receipt.monto,vence:receipt.vence,fechaLimite:receipt.fechaLimite||receipt.vence,fechaVencimiento:receipt.fechaLimite||receipt.vence,estado:st.estado,estadoOperativo:st.estadoOperativo,exigibilidad:st.exigibilidad,carteraTipo:'cartera_activa',historicalExigible:false,carteraActiva:true,fuente:receipt.fuente||policy.fuente,operationId:opId,actualizado:now()});
      if(!prior){row.creado=now();row.saldoConciliado=false;row.estadoConciliacionSaldo='pendiente_conciliacion';row.requiereValidacion=false;mutations.push({action:'insert',collection:'carteraPrimas',id,payload:row});result.inserted.push(id);}else{update(id,row);result.updated.push(id);}keep.add(id);result.expected+=1;
    });
    existing.filter(x=>!keep.has(x.id)&&x.carteraActiva!==false).forEach(x=>{update(x.id,{carteraActiva:false,estado:'Cerrada',estadoOperativo:isActiveState(policy.estado)?'cerrado_plan_reemplazado':'cerrado_poliza_no_activa',exigibilidad:'cerrada',operationId:opId,actualizado:now()});result.closed.push(x.id);});
    return result;
  }
  function buildAtomicWritePlan(prepared,raw,existing,opId,activityTitle,activityDetail){
    const mutations=[{action:existing?'update':'insert',collection:'polizas',id:prepared.id,payload:prepared}];let vehicle=null;
    if(raw&&raw.vehiculo&&Object.keys(raw.vehiculo).some(k=>k!=='id'&&clean(raw.vehiculo[k]))){
      const prior=existing?(
        clean(raw.vehiculo.id)?S().get('vehiculos',clean(raw.vehiculo.id)):
        (S().all('vehiculos')||[]).find(v=>v&&v.polizaId===prepared.id&&norm(v.estado)!=='historico')
      ):null;
      vehicle=Object.assign({},prior||{},raw.vehiculo,{
        id:prior&&prior.id||clean(raw.vehiculo.id)||('veh_'+Date.now().toString(36)),
        tenantId:prepared.tenantId,clienteId:prepared.clienteId,polizaId:prepared.id,asesorId:prepared.asesorId,
        pais:prepared.pais,fuente:prepared.fuente,operationId:opId,actualizado:now()
      });
      if(!prior)vehicle.creado=now();
      mutations.push({action:prior?'update':'insert',collection:'vehiculos',id:vehicle.id,payload:vehicle});
    }
    const receiptPlan=planReceipts(prepared,opId,mutations),portfolio=planPortfolio(prepared,receiptPlan.rows,opId,mutations),activity=activityRow(prepared,activityTitle,activityDetail,opId);mutations.push({action:'insert',collection:'actividades',id:activity.id,payload:activity});
    return{mutations,receipts:receiptPlan.result,portfolio,vehicle,activity};
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
        tipo: 'poliza', icon: '📑', fecha: today(), titulo: title, detalle: detail, operacionId: opId
      });
    } catch (e) {}
  }

  async function createPolicy(raw, options) {
    options=options||{};if(!canManagePolicies())return{ok:false,errors:['permiso_poliza_denegado']};if(!S()||typeof S().batchDurable!=='function')return{ok:false,errors:['contrato_atomico_no_disponible']};
    const opId=options.operationId||operationId('pol'),prepared=preparePolicy(raw,null,opId),check=validatePolicy(prepared,'');if(!check.ok)return Object.assign({ok:false,policy:prepared},check);
    prepared.policyKey=check.key;prepared.policyVersionKey=check.versionKey;prepared.requiereValidacion=check.warnings.length>0;prepared.validacion={estado:prepared.requiereValidacion?'REQUIERE_VALIDACION':'VALIDADA_EN_CAPTURA',alertas:check.warnings,fecha:now()};prepared.historial=[].concat(prepared.historial||[],[{icon:'✳',fecha:today(),t:'Emisión de póliza',d:'Alta desde plataforma · operación '+opId}]);
    const plan=buildAtomicWritePlan(prepared,raw,null,opId,'Póliza creada: '+prepared.numero,prepared.ramo+' · '+prepared.moneda+' '+prepared.primaTotal);
    try{await S().batchDurable(plan.mutations,{requestId:opId,timeoutMs:25000});try{await updateClientState(prepared.clienteId);}catch(ignore){}try{if(A()&&A().audit)A().audit('crear_con_recibos','polizas',prepared.id,null,prepared,options.motivo||'Alta operativa de póliza',{operacionId:opId,recibos:plan.receipts,cartera:plan.portfolio,atomicServerCommit:true});}catch(ignore){}return{ok:true,policy:prepared,receipts:plan.receipts,portfolio:plan.portfolio,vehicle:plan.vehicle,warnings:check.warnings,operationId:opId,atomicServerCommit:true};}
    catch(error){return{ok:false,errors:['operacion_atomica_no_confirmada'],error:String(error&&(error.code||error.message||error)),policy:prepared,operationId:opId};}
  }

  async function updatePolicy(id, patch, options) {
    options=options||{};if(!canManagePolicies())return{ok:false,errors:['permiso_poliza_denegado']};if(!S()||typeof S().batchDurable!=='function')return{ok:false,errors:['contrato_atomico_no_disponible']};
    const current=S().get('polizas',id);if(!current)return{ok:false,errors:['poliza_no_encontrada']};const before=clone(current),opId=options.operationId||operationId('polupd'),merged=preparePolicy(Object.assign({},current,patch||{},{id}),current,opId),changedCritical=Object.keys(patch||{}).filter(k=>CRITICAL_FIELDS.has(k)&&JSON.stringify(before[k])!==JSON.stringify(merged[k])),paidReceipts=(S().where('cobros',c=>c.polizaId===id)||[]).filter(isPaidReceipt),lockedChanges=changedCritical.filter(k=>LOCKED_AFTER_PAYMENT.has(k)),reactivatingWithPayments=paidReceipts.length&&!isActiveState(before.estado)&&isActiveState(merged.estado);
    if(paidReceipts.length&&(lockedChanges.length||reactivatingWithPayments))return{ok:false,errors:['pagos_existentes_requieren_endoso'],lockedChanges,paidReceipts:paidReceipts.map(c=>c.id)};if(!clean(options.motivo))return{ok:false,errors:['motivo_requerido'],changedCritical};
    const check=validatePolicy(merged,id);if(!check.ok)return Object.assign({ok:false,policy:merged},check);merged.policyKey=check.key;merged.policyVersionKey=check.versionKey;merged.requiereValidacion=check.warnings.length>0;merged.validacion={estado:merged.requiereValidacion?'REQUIERE_VALIDACION':'VALIDADA_EN_CAPTURA',alertas:check.warnings,fecha:now()};merged.historial=[].concat(current.historial||[],[{icon:'✏',fecha:today(),t:'Actualización de póliza',d:(options.motivo||'Actualización')+(changedCritical.length?' · '+changedCritical.join(', '):'')}]);
    const plan=buildAtomicWritePlan(merged,patch||{},current,opId,'Póliza actualizada: '+merged.numero,options.motivo||'Actualización operativa');
    try{await S().batchDurable(plan.mutations,{requestId:opId,timeoutMs:25000});try{await updateClientState(before.clienteId);if(merged.clienteId!==before.clienteId)await updateClientState(merged.clienteId);}catch(ignore){}try{if(A()&&A().audit)A().audit('actualizar_con_recibos','polizas',id,before,merged,options.motivo,{operacionId:opId,recibos:plan.receipts,cartera:plan.portfolio,camposCriticos:changedCritical,atomicServerCommit:true});}catch(ignore){}return{ok:true,policy:merged,receipts:plan.receipts,portfolio:plan.portfolio,vehicle:plan.vehicle,warnings:check.warnings,operationId:opId,atomicServerCommit:true};}
    catch(error){return{ok:false,errors:['operacion_atomica_no_confirmada'],error:String(error&&(error.code||error.message||error)),operationId:opId};}
  }

  function applyPayment(receiptIdValue, payment, options) {
    options = options || {};
    if (!canApplyPayments()) return { ok: false, errors: ['permiso_cobro_denegado'] };
    const c = S().get('cobros', receiptIdValue);
    if (!c) return { ok: false, errors: ['cobro_no_encontrado'] };
    if (isPaidReceipt(c)) return { ok: true, alreadyApplied: true, receipt: c };
    return { ok: false, errors: ['cobro_no_confirmado_por_backend'], contract: 'Cobros 10.10.2' };
  }

  function createReconciliationProposal(receiptIdValue, input) {
    if (!canApplyPayments()) return { ok: false, errors: ['permiso_conciliacion_denegado'] };
    const c = S().get('cobros', receiptIdValue);
    if (!c || !isPaidReceipt(c)) return { ok: false, errors: ['cobro_confirmado_requerido'] };
    return { ok: false, errors: ['ledger_run_requerido'], contract: 'Cobros 10.10.2', cobroId: c.id };
  }

  async function linkVehicleToPolicy(vehicleIdValue, policyIdValue, options) {
    options = options || {};
    if (!canManagePolicies()) return { ok: false, errors: ['permiso_poliza_denegado'] };
    if (!S() || typeof S().batchDurable !== 'function') return { ok: false, errors: ['contrato_atomico_no_disponible'] };
    const vehicleId = clean(vehicleIdValue), policyId = clean(policyIdValue);
    const source = S().get('vehiculos', vehicleId), policy = S().get('polizas', policyId);
    if (!source || !policy) return { ok: false, errors: [!source ? 'vehiculo_no_encontrado' : 'poliza_no_encontrada'] };
    if (clean(source.clienteId) !== clean(policy.clienteId)) return { ok: false, errors: ['vehiculo_cliente_no_coincide'] };
    if (clean(source.polizaId) === policyId) return { ok: true, alreadyLinked: true, vehicle: normalizeVehicle(source), vehicleId: source.id, policyId };
    const reason = clean(options.motivo || options.reason);
    if (!reason) return { ok: false, errors: ['motivo_requerido'] };
    const historicalPolicyId = clean(source.polizaId);
    const stableSuffix = (policyId + '_' + vehicleId).replace(/[^A-Za-z0-9._:-]+/g, '_').slice(0, 220);
    const targetId = historicalPolicyId ? ('vehrel_' + stableSuffix) : vehicleId;
    const existingTarget = S().get('vehiculos', targetId);
    if (existingTarget && clean(existingTarget.polizaId) === policyId && clean(existingTarget.versionOfVehicleId || existingTarget.id) === clean(historicalPolicyId ? vehicleId : targetId)) {
      return { ok: true, alreadyLinked: true, vehicle: normalizeVehicle(existingTarget), vehicleId: existingTarget.id, policyId, historyPreserved: true };
    }
    if (existingTarget && targetId !== vehicleId) return { ok: false, errors: ['vehicle_relation_id_conflict'] };
    const opId = options.operationId || operationId('vehlink');
    const normalized = normalizeVehicle(source);
    const payload = Object.assign({}, source, normalized, {
      id: targetId,
      tenantId: policy.tenantId || source.tenantId,
      clienteId: policy.clienteId,
      polizaId: policy.id,
      asesorId: policy.asesorId || source.asesorId,
      aseguradoraId: policy.aseguradoraId || source.aseguradoraId,
      pais: policy.pais || source.pais,
      operationId: opId,
      actualizado: now(),
      relationKind: historicalPolicyId ? 'versioned_policy_relation' : 'direct_policy_relation',
      versionOfVehicleId: historicalPolicyId ? vehicleId : clean(source.versionOfVehicleId),
      relationSourcePolicyId: historicalPolicyId,
      relationTargetPolicyId: policy.id
    });
    if (historicalPolicyId) payload.creado = now();
    const mutations = [{ action: historicalPolicyId ? 'insert' : 'update', collection: 'vehiculos', id: targetId, payload }];
    const activityId = ('act_' + opId).slice(0, 250);
    mutations.push({ action: 'insert', collection: 'actividades', id: activityId, payload: {
      id: activityId, tenantId: policy.tenantId, clienteId: policy.clienteId, asesorId: policy.asesorId,
      tipo: 'vehiculo', icon: '🚘', fecha: today(), titulo: 'Vehículo vinculado a póliza',
      detalle: 'Relación explícita por IDs físicos · vehículo ' + targetId + ' · póliza ' + policy.id,
      polizaId: policy.id, vehiculoId: targetId, sourceVehicleId: vehicleId, sourcePolicyId: historicalPolicyId,
      operationId: opId, motivo: reason
    }});
    try {
      await S().batchDurable(mutations, { requestId: opId, timeoutMs: 25000 });
      const persisted = S().get('vehiculos', targetId);
      if (!persisted || clean(persisted.polizaId) !== policy.id || clean(persisted.clienteId) !== clean(policy.clienteId)) return { ok: false, errors: ['vehicle_link_readback_failed'] };
      try { if (A() && A().audit) A().audit('vincular_vehiculo_poliza', 'vehiculos', targetId, historicalPolicyId ? null : source, persisted, reason, { operationId: opId, sourceVehicleId: vehicleId, sourcePolicyId: historicalPolicyId, targetPolicyId: policy.id, historyPreserved: true }); } catch (ignore) {}
      return { ok: true, vehicle: normalizeVehicle(persisted), vehicleId: targetId, policyId: policy.id, sourceVehicleId: vehicleId, sourcePolicyId: historicalPolicyId, historyPreserved: true, atomicServerCommit: true, operationId: opId };
    } catch (error) {
      return { ok: false, errors: ['vehicle_link_commit_failed'], error: String(error && (error.code || error.message) || error), operationId: opId };
    }
  }

  return {
    ACTIVE, isActiveState, isPaidReceipt, canManagePolicies, canApplyPayments,
    canonicalPolicyKey, policyVersionKey, validatePolicy, preparePolicy, normalizeVehicle, expectedReceipts, syncReceipts, syncPortfolio, buildAtomicWritePlan,
    createPolicy, updatePolicy, linkVehicleToPolicy, applyPayment, createReconciliationProposal, updateClientState,
    receiptId, sequenceOf, installmentsForFrequency
  };
})();
