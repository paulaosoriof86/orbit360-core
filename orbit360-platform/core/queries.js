/* ============================================================
   Orbit 360 · Queries — agregaciones de negocio sobre el store
   Reutilizadas por Inicio, Cliente 360, Insights, etc.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.q = (function () {
  const S = () => Orbit.store;
  const U = Orbit.ui;

  function asesor(id) { return S().get('asesores', id); }
  function aseguradora(id) { return S().get('aseguradoras', id); }

  // ---- por cliente ----
  function polizasDe(cliId) { return S().where('polizas', p => p.clienteId === cliId); }
  function cobrosDe(cliId) { return S().where('cobros', c => c.clienteId === cliId); }
  function comisionesDe(cliId) { return S().where('comisiones', c => c.clienteId === cliId); }
  function actividadesDe(cliId) {
    return S().where('actividades', a => a.clienteId === cliId).sort((a, b) => String(b.fecha||'').localeCompare(String(a.fecha||'')));
  }
  function cancelacionesDe(cliId) { return S().where('cancelaciones', c => c.clienteId === cliId); }
  function vehiculosDe(cliId) { return S().where('vehiculos', v => v.clienteId === cliId); }
  function vehiculoDePoliza(polId) { return S().find('vehiculos', v => v.polizaId === polId); }

  /** Resumen 360 de un cliente: el "cerebro". */
  function clienteResumen(cliId) {
    const cli = S().get('clientes', cliId);
    const pol = polizasDe(cliId);
    const cob = cobrosDe(cliId);
    const com = comisionesDe(cliId);
    const vigentes = pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const primaAnual = vigentes.reduce((s, p) => s + p.prima, 0);
    const cobrado = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + c.monto, 0);
    const pendiente = cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + c.monto, 0);
    const vencido = cob.filter(c => c.estado === 'Vencido').reduce((s, c) => s + c.monto, 0);
    const comisionGen = com.reduce((s, c) => s + c.monto, 0);
    const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
    // salud del cliente 0-100
    let salud = 70;
    salud += Math.min(20, vigentes.length * 6);
    salud -= vencido > 0 ? 25 : 0;
    salud += cli && cli.segmento === 'Premium' ? 8 : 0;
    salud = Math.max(8, Math.min(100, salud));
    return {
      cli, pol, cob, com,
      moneda: cli ? cli.moneda : 'GTQ',
      nPolizas: pol.length, nVigentes: vigentes.length,
      primaAnual, cobrado, pendiente, vencido, comisionGen, porRenovar,
      salud
    };
  }

  // ---- globales ----
  // Moneda por país: cuando hay un país activo, NO se convierte (montos nativos).
  // Solo en la vista global mixta ('TODOS') se normaliza con una tasa DECLARADA (COP↔GTQ ≈ /1000).
  const TC_COP_GTQ = 1000; // tasa de referencia declarada para vistas mixtas
  function paisActivo() { const p = Orbit.pais; return (p && p !== 'TODOS') ? p : null; }
  function monedaPais() { const p = paisActivo(); return p === 'CO' ? 'COP' : 'GTQ'; }
  const norm = (m, cur) => { if (paisActivo()) return m; return cur === 'COP' ? m / TC_COP_GTQ : m; };
  function cobPais(c) { const cli = S().get('clientes', c.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p); }
  function polPais(p2) { const cli = S().get('clientes', p2.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p); }

  function carteraGlobal() {
    const cob = S().all('cobros').filter(cobPais);
    const alDia = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const pend = cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const venc = cob.filter(c => c.estado === 'Vencido').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    return { alDia, pend, venc, moneda: monedaPais() };
  }
  function primaVigenteGlobal() {
    return S().where('polizas', p => (p.estado === 'Vigente' || p.estado === 'Por renovar') && polPais(p))
      .reduce((s, p) => s + norm(p.prima, p.moneda), 0);
  }
  function renovacionesProximas(dias) {
    dias = dias || 45;
    return S().where('polizas', p => {
      const d = U.daysFromNow(p.vigenciaFin);
      return p.estado !== 'Cancelada' && d != null && d >= 0 && d <= dias;
    }).sort((a, b) => String(a.vigenciaFin||'').localeCompare(String(b.vigenciaFin||'')));
  }
  function cobrosVencidos() {
    return S().where('cobros', c => c.estado === 'Vencido').sort((a, b) => String(a.vence||'').localeCompare(String(b.vence||'')));
  }
  /** Avance por asesor (prima vigente vs meta). */
  function leaderboard() {
    return S().all('asesores').map(a => {
      const pol = S().where('polizas', p => p.asesorId === a.id && (p.estado === 'Vigente' || p.estado === 'Por renovar') && polPais(p));
      const prima = pol.reduce((s, p) => s + norm(p.prima, p.moneda), 0);
      const com = S().where('comisiones', c => c.asesorId === a.id).reduce((s, c) => s + norm(c.monto, c.moneda), 0);
      return { asesor: a, prima, comision: com, pct: Math.min(140, Math.round(prima / a.metaPrima * 100)) };
    }).sort((x, y) => y.prima - x.prima);
  }

  /** Aging de cartera vencida en tramos de días. */
  function agingVencido() {
    const buckets = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    S().where('cobros', c => c.estado === 'Vencido').forEach(c => {
      const d = -U.daysFromNow(c.vence);
      const v = norm(c.monto, c.moneda);
      if (d <= 30) buckets['1-30'] += v;
      else if (d <= 60) buckets['31-60'] += v;
      else if (d <= 90) buckets['61-90'] += v;
      else buckets['90+'] += v;
    });
    return buckets;
  }
  /** Comisiones agregadas por clave (asesorId | aseguradoraId | periodo). */
  function comisionesPor(campo) {
    const map = {};
    S().all('comisiones').forEach(c => {
      const k = c[campo];
      if (!map[k]) map[k] = { total: 0, liquidada: 0, devengada: 0, n: 0 };
      const v = norm(c.monto, c.moneda);
      map[k].total += v; map[k].n++;
      if (c.estado === 'Liquidada') map[k].liquidada += v; else map[k].devengada += v;
    });
    return map;
  }
  function clienteNombre(id) { const c = S().get('clientes', id); return c ? c.nombre : '—'; }

  /** REGLA DE NEGOCIO (multi-tenant, no solo A&S): el pago aplicado por el cliente a un
   *  recibo/póliza NO es un movimiento financiero real de la empresa — es RECAUDO COMERCIAL.
   *  Afecta cartera, recibos, metas de recaudo y producción recaudada (todo derivado de `cobros`),
   *  NO la colección `finmovs`. A `finmovs` solo van ingresos/egresos REALES de la empresa
   *  (comisión recibida, factura cobrada, liquidación pagada por aseguradora, pago a asesor, gasto).
   *  Por eso este helper NO escribe en finmovs (prevención de regresión). Se conserva la firma
   *  para no romper llamadas existentes. */
  function postRecaudo(/* cobro, fecha, metodo */) { return; }

  return {
    asesor, aseguradora, polizasDe, cobrosDe, comisionesDe, actividadesDe, cancelacionesDe,
    clienteResumen, carteraGlobal, primaVigenteGlobal, renovacionesProximas, cobrosVencidos, leaderboard,
    agingVencido, comisionesPor, clienteNombre, norm, monedaPais, vehiculosDe, vehiculoDePoliza, postRecaudo
  };
})();
