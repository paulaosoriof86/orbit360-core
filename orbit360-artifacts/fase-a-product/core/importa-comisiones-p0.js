/* ============================================================
   Orbit 360 · P0 reglas comisiones/facturas/CxC/CxP
   Fecha: 2026-07-09

   Modulo puro/aditivo para separar:
   - planillasComisiones
   - comisionesDevengadas
   - facturasComisiones
   - cxcComisiones
   - conciliacionesComisiones
   - liquidacionesAsesores
   - cxpAsesores

   No mezcla primas pendientes con CxC financiera.
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

  function period(value) {
    const s = String(value || '').trim();
    const m = s.match(/(20\d{2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
    return s.slice(0, 7);
  }

  function commissionKey(input) {
    return [
      norm(input.aseguradoraId || input.aseguradoraNombre || input.aseguradora || ''),
      norm(input.polizaId || input.polizaNumero || input.numeroPoliza || input.poliza || ''),
      norm(input.reciboId || input.reciboNumero || input.numeroRecibo || ''),
      norm(input.asesorId || input.asesorNombre || input.vendedor || ''),
      period(input.periodo || input.fecha || ''),
      String(parseNum(input.comPagada || input.comEsperada || input.monto || input.total || 0))
    ].join('|');
  }

  function invoiceKey(input) {
    return [
      norm(input.numero || input.numeroFactura || input.factura || ''),
      norm(input.aseguradoraId || input.aseguradoraNombre || input.aseguradora || ''),
      period(input.periodo || input.fecha || ''),
      String(parseNum(input.monto || input.total || input.valor || 0))
    ].join('|');
  }

  function isImportedCommission(input) {
    return !!(input && input.importado && (input.comEsperada != null || input.comPagada != null || input.difComision != null || input.montoConciliacion != null));
  }

  function isCommissionInvoice(input) {
    const n = norm([input.tipoFactura, input.tipo, input.concepto, input.descripcion, input.detalle].join(' '));
    return !!(input && (input.facturaComision || input.esFacturaComision || n.includes('comision') || n.includes('corretaje') || n.includes('intermediacion')));
  }

  function normalizeCommissionRow(input) {
    const comEsperada = parseNum(input.comEsperada);
    const comPagada = parseNum(input.comPagada);
    const primaNeta = parseNum(input.primaNeta);
    const pct = parseNum(input.pct);
    const monto = comPagada || comEsperada || (primaNeta && pct ? primaNeta * pct / 100 : 0);
    const periodo = period(input.periodo || input.fecha || input._periodoHoja || '');
    const missing = [];
    if (!input.aseguradoraId && !input.aseguradoraNombre) missing.push('aseguradora');
    if (!input.moneda) missing.push('moneda');
    if (!periodo) missing.push('periodo');
    if (!monto) missing.push('monto_comision');

    return Object.assign({}, input, {
      _sourceKey: commissionKey(input),
      primaNeta,
      pct,
      comEsperada,
      comPagada,
      montoComision: monto,
      periodo,
      estadoComision: missing.length ? 'requiere_validacion' : 'comision_devengada_planilla',
      estadoFactura: 'pendiente_facturar',
      estadoRecaudoComision: 'pendiente_conciliacion',
      esPrimaPendiente: false,
      esCxCFinanciera: false,
      requiereValidacion: missing.length > 0,
      motivosValidacion: missing,
      origen: 'planilla_comisiones',
      importadorP0: true
    });
  }

  function planillaSeed(row) {
    return {
      id: 'pla_com_' + (row._sourceKey || Date.now()),
      _sourceKey: row._sourceKey,
      aseguradoraId: row.aseguradoraId || '',
      aseguradoraNombre: row.aseguradoraNombre || row._asgTxt || '',
      periodo: row.periodo,
      pais: row.pais || '',
      moneda: row.moneda || '',
      archivoFuente: row.archivoFuente || row._archivoFuente || '',
      hojaFuente: row._origenHoja || '',
      estado: row.requiereValidacion ? 'requiere_validacion' : 'importada_pendiente_factura',
      origen: 'planilla_comisiones',
      importado: true
    };
  }

  function devengadaSeed(row) {
    return Object.assign({}, row, {
      id: 'com_dev_' + (row._sourceKey || Date.now()),
      tipo: 'comision_devengada',
      estado: row.requiereValidacion ? 'requiere_validacion' : 'devengada_pendiente_factura',
      esCxCFinanciera: false,
      esPrimaPendiente: false
    });
  }

  function conciliacionSeed(row) {
    return {
      id: 'con_com_' + (row._sourceKey || Date.now()),
      tipo: 'comision',
      estado: row.requiereValidacion ? 'requiere_validacion' : 'pendiente_factura',
      aseguradoraId: row.aseguradoraId || '',
      polizaId: row.polizaId || '',
      reciboId: row.reciboId || '',
      periodo: row.periodo,
      montoComision: row.montoComision,
      moneda: row.moneda || '',
      fuente: 'planilla_comisiones',
      accionPropuesta: 'comparar_planilla_con_factura_y_banco',
      requiereValidacion: row.requiereValidacion,
      motivosValidacion: row.motivosValidacion || [],
      creado: todayYMD(),
      importado: true
    };
  }

  function normalizeCommissionInvoice(input) {
    const monto = parseNum(input.monto || input.total || input.valor || input.importe);
    const iva = parseNum(input.iva || input.impuesto);
    const neto = parseNum(input.neto || input.subtotal || input.base) || Math.max(0, monto - iva);
    const missing = [];
    if (!input.numero && !input.numeroFactura && !input.factura) missing.push('numero_factura');
    if (!monto) missing.push('monto');
    if (!input.moneda) missing.push('moneda');

    return Object.assign({}, input, {
      _sourceKey: invoiceKey(input),
      numeroFactura: input.numeroFactura || input.numero || input.factura || '',
      montoTotal: monto,
      montoNeto: neto,
      iva,
      estadoFactura: missing.length ? 'requiere_validacion' : 'factura_comision_pendiente_cobro',
      estadoCxc: missing.length ? 'requiere_validacion' : 'cxc_comision_pendiente',
      esFacturaComision: true,
      esFacturaPrima: false,
      requiereValidacion: missing.length > 0,
      motivosValidacion: missing,
      origen: 'factura_comision',
      importadorP0: true
    });
  }

  function facturaComisionSeed(invoice) {
    return Object.assign({}, invoice, {
      id: 'fac_com_' + (invoice._sourceKey || Date.now()),
      tipo: 'factura_comision',
      estado: invoice.estadoFactura,
      esCxCFinanciera: false
    });
  }

  function cxcComisionSeed(invoice) {
    return {
      id: 'cxc_com_' + (invoice._sourceKey || Date.now()),
      facturaComisionKey: invoice._sourceKey,
      numeroFactura: invoice.numeroFactura,
      aseguradoraId: invoice.aseguradoraId || '',
      aseguradoraNombre: invoice.aseguradoraNombre || '',
      monto: invoice.montoTotal,
      montoNeto: invoice.montoNeto,
      iva: invoice.iva,
      moneda: invoice.moneda || '',
      fecha: invoice.fecha || todayYMD(),
      estado: invoice.estadoCxc,
      tipo: 'cxc_comision',
      origen: 'factura_comision',
      requiereValidacion: invoice.requiereValidacion,
      motivosValidacion: invoice.motivosValidacion || [],
      importado: true
    };
  }

  function cxcToLiquidacionAsesorSeed(cxc, asesor) {
    const pct = parseNum(asesor && asesor.pctComision) || 50;
    const monto = parseNum(cxc.montoNeto || cxc.monto || 0) * pct / 100;
    return {
      id: 'liq_ase_' + (cxc.id || Date.now()) + '_' + (asesor && asesor.id ? asesor.id : 'asesor'),
      cxcComisionId: cxc.id,
      asesorId: asesor && asesor.id ? asesor.id : '',
      montoBase: cxc.montoNeto || cxc.monto || 0,
      pctAsesor: pct,
      montoAsesor: Math.round(monto * 100) / 100,
      moneda: cxc.moneda || '',
      estado: 'liquidable_pendiente_aprobacion',
      origen: 'cxc_comision',
      importado: true
    };
  }

  function cxpAsesorSeed(liq) {
    return Object.assign({}, liq, {
      id: 'cxp_ase_' + (liq.id || Date.now()),
      liquidacionAsesorId: liq.id,
      tipo: 'cxp_asesor',
      estado: 'pendiente_pago_asesor',
      pagada: false
    });
  }

  window.Orbit.importaComisionesP0 = {
    norm,
    parseNum,
    period,
    commissionKey,
    invoiceKey,
    isImportedCommission,
    isCommissionInvoice,
    normalizeCommissionRow,
    planillaSeed,
    devengadaSeed,
    conciliacionSeed,
    normalizeCommissionInvoice,
    facturaComisionSeed,
    cxcComisionSeed,
    cxcToLiquidacionAsesorSeed,
    cxpAsesorSeed
  };
})();
