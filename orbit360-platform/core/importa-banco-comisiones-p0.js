/* ============================================================
   Orbit 360 · P0 reglas banco/comisiones/CxC/CxP
   Fecha: 2026-07-09

   Modulo puro/aditivo para estados de cuenta bancarios vinculados
   a comisiones. No crea finmovs definitivos ni marca pagos sin
   conciliacion/confirmacion humana.
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

  function bankKey(input) {
    return [
      dateYMD(input.fecha || input.date || ''),
      norm(input.concepto || input.descripcion || input.detalle || input.referencia || ''),
      String(parseNum(input.monto || input.valor || input.importe || 0)),
      norm(input.moneda || ''),
      norm(input.pais || '')
    ].join('|');
  }

  function normalizeBankRow(input) {
    const monto = Math.abs(parseNum(input.monto || input.valor || input.importe));
    const rawMonto = parseNum(input.monto || input.valor || input.importe);
    const tipo = input.tipo || input.naturaleza || (rawMonto < 0 ? 'cargo' : 'abono');
    const nTipo = norm(tipo);
    const salida = nTipo.includes('cargo') || nTipo.includes('egreso') || nTipo.includes('debito') || rawMonto < 0;
    const missing = [];
    if (!input.fecha) missing.push('fecha');
    if (!monto) missing.push('monto');
    if (!input.moneda) missing.push('moneda');

    return Object.assign({}, input, {
      _sourceKey: bankKey(input),
      fecha: dateYMD(input.fecha || input.date || ''),
      concepto: input.concepto || input.descripcion || input.detalle || input.referencia || '',
      monto,
      tipoBanco: salida ? 'debito' : 'credito',
      pais: input.pais || '',
      moneda: input.moneda || '',
      estadoBanco: 'pendiente_conciliacion',
      estadoFinmov: 'no_creado_pendiente_confirmacion',
      requiereValidacion: missing.length > 0,
      motivosValidacion: missing,
      origen: 'estado_cuenta_bancario',
      importadorP0: true
    });
  }

  function scoreCxc(bank, cxc) {
    if (!cxc || cxc.estado === 'cobrada') return 0;
    if (bank.moneda && cxc.moneda && bank.moneda !== cxc.moneda) return 0;
    const diff = Math.abs(parseNum(bank.monto) - parseNum(cxc.monto));
    if (diff > 1) return 0;
    const txt = norm(bank.concepto || '');
    let score = 60;
    if (cxc.numeroFactura && txt.includes(norm(cxc.numeroFactura))) score += 35;
    if (cxc.aseguradoraNombre && txt.includes(norm(cxc.aseguradoraNombre))) score += 10;
    return Math.min(score, 100);
  }

  function scoreCxp(bank, cxp) {
    if (!cxp || cxp.pagada) return 0;
    if (bank.moneda && cxp.moneda && bank.moneda !== cxp.moneda) return 0;
    const diff = Math.abs(parseNum(bank.monto) - parseNum(cxp.montoAsesor || cxp.monto || 0));
    if (diff > 1) return 0;
    const txt = norm(bank.concepto || '');
    let score = 55;
    if (cxp.asesorNombre && txt.includes(norm(cxp.asesorNombre))) score += 20;
    if (cxp.asesorId && txt.includes(norm(cxp.asesorId))) score += 10;
    return Math.min(score, 100);
  }

  function matchBank(bank) {
    const cxc = (Orbit.store && Orbit.store.all ? Orbit.store.all('cxcComisiones') : [])
      .map(function (x) { return { row: x, score: bank.tipoBanco === 'credito' ? scoreCxc(bank, x) : 0 }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })[0];

    const cxp = (Orbit.store && Orbit.store.all ? Orbit.store.all('cxpAsesores') : [])
      .map(function (x) { return { row: x, score: bank.tipoBanco === 'debito' ? scoreCxp(bank, x) : 0 }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })[0];

    if (cxc) return { tipo: 'cxc_comision', score: cxc.score, target: cxc.row };
    if (cxp) return { tipo: 'cxp_asesor', score: cxp.score, target: cxp.row };
    return { tipo: 'sin_match', score: 0, target: null };
  }

  function movimientoBancoSeed(bank) {
    return Object.assign({}, bank, {
      id: 'mov_bco_' + (bank._sourceKey || Date.now()),
      estado: bank.requiereValidacion ? 'requiere_validacion' : 'pendiente_conciliacion',
      creaFinmov: false,
      importado: true
    });
  }

  function conciliacionBancariaSeed(bank, match) {
    return {
      id: 'con_bco_' + (bank._sourceKey || Date.now()),
      _sourceKey: bank._sourceKey,
      tipo: 'banco_comisiones',
      fecha: bank.fecha,
      concepto: bank.concepto,
      monto: bank.monto,
      moneda: bank.moneda,
      tipoBanco: bank.tipoBanco,
      estado: match && match.score >= 90 ? 'match_probable_pendiente_confirmacion' : 'requiere_validacion',
      matchTipo: match ? match.tipo : 'sin_match',
      matchScore: match ? match.score : 0,
      targetId: match && match.target ? match.target.id : '',
      accionPropuesta: bank.tipoBanco === 'credito' ? 'confirmar_cobro_cxc_comision' : 'confirmar_pago_cxp_asesor',
      creaFinmov: false,
      requiereConfirmacionHumana: true,
      importado: true
    };
  }

  function updateTargetProposal(match, bank) {
    if (!match || !match.target || !Orbit.store || !Orbit.store.update) return;
    if (match.tipo === 'cxc_comision') {
      Orbit.store.update('cxcComisiones', match.target.id, {
        estado: match.score >= 90 ? 'recaudo_probable_pendiente_confirmacion' : 'pendiente_conciliacion_bancaria',
        conciliacionBancariaPropuesta: {
          monto: bank.monto,
          moneda: bank.moneda,
          fecha: bank.fecha,
          score: match.score,
          estado: 'pendiente_confirmacion'
        }
      });
    }
    if (match.tipo === 'cxp_asesor') {
      Orbit.store.update('cxpAsesores', match.target.id, {
        estado: match.score >= 90 ? 'pago_probable_pendiente_confirmacion' : 'pendiente_conciliacion_bancaria',
        conciliacionBancariaPropuesta: {
          monto: bank.monto,
          moneda: bank.moneda,
          fecha: bank.fecha,
          score: match.score,
          estado: 'pendiente_confirmacion'
        }
      });
    }
  }

  window.Orbit.importaBancoComisionesP0 = {
    norm,
    parseNum,
    dateYMD,
    bankKey,
    normalizeBankRow,
    scoreCxc,
    scoreCxp,
    matchBank,
    movimientoBancoSeed,
    conciliacionBancariaSeed,
    updateTargetProposal
  };
})();
