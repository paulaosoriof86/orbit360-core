/* ============================================================
   Orbit 360 · P0 reglas recibos/cartera/conciliacion de primas
   Fecha: 2026-07-09

   Modulo puro/aditivo para separar capas:
   - recibosEsperados
   - recibosFuenteExterna
   - recibosAseguradora
   - carteraPrimas
   - conciliacionesPrimas

   No crea CxC/CxP financiera y no marca cobros confirmados.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseNum(value) {
    if (value == null || value === '') return 0;
    let s = String(value).replace(/[^0-9,.\-]/g, '');
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function todayYMD() {
    return (Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : new Date().toISOString().slice(0, 10);
  }

  function dateYMD(value) {
    if (!value) return '';
    const raw = String(value).trim();
    let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    return raw.slice(0, 10);
  }

  function agingBucket(dueDate, asOf) {
    const due = dateYMD(dueDate);
    if (!due) return 'sin_fecha';
    const a = new Date(asOf || todayYMD());
    const d = new Date(due);
    const days = Math.floor((a - d) / 86400000);
    if (days <= 0) return 'al_dia';
    if (days <= 30) return '1_30';
    if (days <= 45) return '31_45';
    if (days <= 60) return '46_60';
    if (days <= 90) return '61_90';
    return 'mas_90';
  }

  function sourceKey(input) {
    return [
      norm(input.aseguradoraId || input.aseguradoraNombre || input.aseguradora || ''),
      norm(input.polizaId || input.polizaNumero || input.numeroPoliza || input.poliza || ''),
      norm(input.reciboNumero || input.numeroRecibo || input.requerimiento || input.factura || ''),
      dateYMD(input.vence || input.fechaVencimiento || input.vigenciaFin || ''),
      String(parseNum(input.monto || input.total || input.saldo || input.prima || 0))
    ].join('|');
  }

  function isInsurerStatement(input) {
    const p = input && input.conciliacionPropuesta;
    return !!(input && (input.estadoCuentaPago || input.reporteAseguradora || input.aging || input.bucketAging || (p && p.tipo === 'referencia_estado_cuenta')));
  }

  function normalizeInsurerReceipt(input, ctx) {
    const fechaCorte = dateYMD(input.fechaCorte || (ctx && ctx.fechaCorte) || todayYMD());
    const monto = parseNum(input.monto || input.total || input.saldo || input.prima || input.primaTotal);
    const vence = dateYMD(input.vence || input.fechaVencimiento || input.vencimiento || input.fechaLimite || '');
    const moneda = input.moneda || input.currency || '';
    const pais = input.pais || input.country || '';
    const aseguradoraId = input.aseguradoraId || '';
    const aseguradoraNombre = input.aseguradoraNombre || input.aseguradora || '';
    const polizaId = input.polizaId || '';
    const polizaNumero = input.polizaNumero || input.numeroPoliza || input.poliza || '';
    const reciboNumero = input.reciboNumero || input.numeroRecibo || input.requerimiento || input.factura || '';
    const bucket = input.bucketAging || input.aging || agingBucket(vence, fechaCorte);
    const missing = [];
    if (!aseguradoraId && !aseguradoraNombre) missing.push('aseguradora');
    if (!polizaId && !polizaNumero) missing.push('poliza');
    if (!moneda) missing.push('moneda');
    if (!monto) missing.push('monto');

    return {
      _sourceKey: sourceKey(input),
      tenantId: input.tenantId || (Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get().id : ''),
      pais,
      moneda,
      aseguradoraId,
      aseguradoraNombre,
      polizaId,
      polizaNumero,
      reciboNumero,
      clienteId: input.clienteId || '',
      asesorId: input.asesorId || '',
      fechaCorte,
      vence,
      monto,
      bucketAging: bucket,
      estado: 'pendiente_aseguradora',
      estadoCartera: 'pendiente_aseguradora',
      estadoConciliacion: missing.length ? 'requiere_validacion' : 'pendiente',
      confirmadoPago: false,
      carteraOperativa: true,
      conciliado: false,
      requiereValidacion: missing.length > 0,
      motivosValidacion: missing,
      origen: 'estado_cuenta_aseguradora',
      archivoFuente: input.archivoFuente || input._archivoFuente || '',
      hojaFuente: input._origenHoja || input.hojaFuente || '',
      bloqueFuente: input._bloqueOrigen || input.bloqueFuente || '',
      filaFuente: input._numeroFila || input.filaFuente || '',
      importado: true
    };
  }

  function estadoCuentaSeed(receipt) {
    return {
      id: 'eca_' + (receipt._sourceKey || Date.now()),
      tenantId: receipt.tenantId,
      pais: receipt.pais,
      moneda: receipt.moneda,
      aseguradoraId: receipt.aseguradoraId,
      aseguradoraNombre: receipt.aseguradoraNombre,
      fechaCorte: receipt.fechaCorte,
      archivoFuente: receipt.archivoFuente,
      hojaFuente: receipt.hojaFuente,
      bloqueFuente: receipt.bloqueFuente,
      estado: 'importado_pendiente_conciliacion',
      origen: 'estado_cuenta_aseguradora',
      importado: true
    };
  }

  function carteraSeed(receipt) {
    return Object.assign({}, receipt, {
      id: 'car_pri_' + (receipt._sourceKey || Date.now()),
      reciboAseguradoraId: 'rec_asg_' + (receipt._sourceKey || Date.now()),
      estado: 'pendiente_real_reportado_aseguradora',
      estadoCartera: 'cartera_primas',
      origen: 'estado_cuenta_aseguradora',
      tipo: 'prima_pendiente',
      esCxCFinanciera: false
    });
  }

  function conciliacionSeed(receipt) {
    return {
      id: 'con_pri_' + (receipt._sourceKey || Date.now()),
      tipo: 'prima',
      estado: receipt.requiereValidacion ? 'requiere_validacion' : 'pendiente',
      polizaId: receipt.polizaId,
      polizaNumero: receipt.polizaNumero,
      reciboNumero: receipt.reciboNumero,
      reciboAseguradoraKey: receipt._sourceKey,
      monto: receipt.monto,
      moneda: receipt.moneda,
      fuente: 'estado_cuenta_aseguradora',
      accionPropuesta: 'comparar_con_recibo_esperado_fuente_externa_y_cobro_confirmado',
      requiereValidacion: receipt.requiereValidacion,
      motivosValidacion: receipt.motivosValidacion || [],
      creado: todayYMD(),
      importado: true
    };
  }

  window.Orbit.importaCarteraP0 = {
    norm,
    parseNum,
    dateYMD,
    agingBucket,
    sourceKey,
    isInsurerStatement,
    normalizeInsurerReceipt,
    estadoCuentaSeed,
    carteraSeed,
    conciliacionSeed
  };
})();
