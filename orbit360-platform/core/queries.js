/* ============================================================
   Orbit 360 · Queries — agregaciones de negocio sobre el store
   Reutilizadas por Inicio, Cliente 360, Insights, etc.
   I2 recovery: Recibos Esperados, Cartera Primas y Cobros se
   proyectan como dominios separados. Cobros nunca representa
   obligaciones esperadas ni cartera pendiente por conveniencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.q = (function () {
  const S = () => Orbit.store;
  const U = Orbit.ui;
  const finite = v => U.finiteNumber ? U.finiteNumber(v) : (Number.isFinite(Number(v)) ? Number(v) : null);
  const amount = v => { const n = finite(v); return n == null ? 0 : n; };
  const textNorm = v => String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function asesor(id) { return S().get('asesores', id); }
  function aseguradora(id) { return S().get('aseguradoras', id); }

  // ---- por cliente ----
  function polizasDe(cliId) { return S().where('polizas', p => p.clienteId === cliId); }
  function recibosEsperadosDe(cliId) { return S().where('recibosEsperados', r => r.clienteId === cliId); }
  function carteraPrimasDe(cliId) { return S().where('carteraPrimas', r => r.clienteId === cliId); }
  function cobrosDe(cliId) { return S().where('cobros', c => c.clienteId === cliId); }
  function comisionesDe(cliId) { return S().where('comisiones', c => c.clienteId === cliId); }
  function actividadesDe(cliId) {
    return S().where('actividades', a => a.clienteId === cliId).sort((a, b) => String(b.fecha||'').localeCompare(String(a.fecha||'')));
  }
  function cancelacionesDe(cliId) { return S().where('cancelaciones', c => c.clienteId === cliId); }
  function vehiculosDe(cliId) { return S().where('vehiculos', v => v.clienteId === cliId); }
  function vehiculoDePoliza(polId) { return S().find('vehiculos', v => v.polizaId === polId); }

  function portfolioOpen(row) {
    const state = textNorm(row && (row.estadoCartera || row.estado));
    if (row && row.conciliadoPago === true) return false;
    return !['pagado','cobrado','cerrado','anulado','cancelado','cancelada'].includes(state);
  }
  function portfolioDue(row) {
    return row && (row.vence || row.fechaVencimiento || row.fechaLimite || '');
  }
  function portfolioIsOverdue(row) {
    if (!portfolioOpen(row)) return false;
    const due = portfolioDue(row);
    const d = due ? U.daysFromNow(due) : null;
    return d != null && d < 0;
  }
  function expectedReceiptOpen(row) {
    const state = textNorm(row && row.estado);
    return !['pagado','conciliado','anulado','cancelado','cancelada'].includes(state) && !(row && row.fechaPago);
  }
  function expectedReceiptIsOverdue(row) {
    if (!expectedReceiptOpen(row)) return false;
    const due = row && (row.vence || row.fechaLimite || row.fechaVencimiento || '');
    const d = due ? U.daysFromNow(due) : null;
    return d != null && d < 0;
  }
  function confirmedCobro(row) {
    const state = textNorm(row && row.estado);
    return state === 'pagado' || state === 'conciliado' || row && row.conciliado === true;
  }

  /** Resumen 360 de un cliente: dominios financieros separados. */
  function clienteResumen(cliId) {
    const cli = S().get('clientes', cliId);
    const pol = polizasDe(cliId);
    const rec = recibosEsperadosDe(cliId);
    const car = carteraPrimasDe(cliId);
    const cob = cobrosDe(cliId);
    const com = comisionesDe(cliId);
    const vigentes = pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const primaAnual = vigentes.reduce((s, p) => s + amount(p.prima), 0);
    const cobrado = cob.filter(confirmedCobro).reduce((s, c) => s + amount(c.monto), 0);
    const pendiente = car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.saldo), 0);
    const vencido = car.filter(portfolioIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.saldo), 0);
    const recibosPendientes = rec.filter(r => expectedReceiptOpen(r) && !expectedReceiptIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
    const recibosVencidos = rec.filter(expectedReceiptIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
    const comisionGen = com.reduce((s, c) => s + amount(c.monto), 0);
    const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
    let salud = 70;
    salud += Math.min(20, vigentes.length * 6);
    salud -= vencido > 0 ? 25 : 0;
    salud += cli && cli.segmento === 'Premium' ? 8 : 0;
    salud = Math.max(8, Math.min(100, salud));
    return {
      cli, pol, rec, car, cob, com,
      moneda: cli ? cli.moneda : 'GTQ',
      nPolizas: pol.length, nVigentes: vigentes.length,
      primaAnual, cobrado, pendiente, vencido, recibosPendientes, recibosVencidos, comisionGen, porRenovar,
      salud
    };
  }

  /** Índice batched con la misma separación semántica del resumen individual. */
  function clientesResumenIndex() {
    const clientes = S().all('clientes') || [];
    const polizas = S().all('polizas') || [];
    const recibos = S().all('recibosEsperados') || [];
    const cartera = S().all('carteraPrimas') || [];
    const cobros = S().all('cobros') || [];
    const comisiones = S().all('comisiones') || [];
    const polByClient = new Map(), recByClient = new Map(), carByClient = new Map(), cobByClient = new Map(), comByClient = new Map();
    const add = (map, id, row) => {
      if (id == null) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    };
    polizas.forEach(p => add(polByClient, p.clienteId, p));
    recibos.forEach(r => add(recByClient, r.clienteId, r));
    cartera.forEach(r => add(carByClient, r.clienteId, r));
    cobros.forEach(c => add(cobByClient, c.clienteId, c));
    comisiones.forEach(c => add(comByClient, c.clienteId, c));

    const index = new Map();
    clientes.forEach(cli => {
      if (!cli || cli.id == null) return;
      const pol = polByClient.get(cli.id) || [];
      const rec = recByClient.get(cli.id) || [];
      const car = carByClient.get(cli.id) || [];
      const cob = cobByClient.get(cli.id) || [];
      const com = comByClient.get(cli.id) || [];
      const vigentes = pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
      const primaAnual = vigentes.reduce((s, p) => s + amount(p.prima), 0);
      const cobrado = cob.filter(confirmedCobro).reduce((s, c) => s + amount(c.monto), 0);
      const pendiente = car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.saldo), 0);
      const vencido = car.filter(portfolioIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.saldo), 0);
      const recibosPendientes = rec.filter(r => expectedReceiptOpen(r) && !expectedReceiptIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
      const recibosVencidos = rec.filter(expectedReceiptIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
      const comisionGen = com.reduce((s, c) => s + amount(c.monto), 0);
      const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
      let salud = 70;
      salud += Math.min(20, vigentes.length * 6);
      salud -= vencido > 0 ? 25 : 0;
      salud += cli.segmento === 'Premium' ? 8 : 0;
      salud = Math.max(8, Math.min(100, salud));
      index.set(cli.id, {
        cli, pol, rec, car, cob, com,
        moneda: cli.moneda,
        nPolizas: pol.length, nVigentes: vigentes.length,
        primaAnual, cobrado, pendiente, vencido, recibosPendientes, recibosVencidos, comisionGen, porRenovar,
        salud
      });
    });
    return index;
  }

  // ---- globales ----
  const TC_COP_GTQ = 1000;
  function paisActivo() { const p = Orbit.pais; return (p && p !== 'TODOS') ? p : null; }
  function monedaPais() { const p = paisActivo(); return p === 'CO' ? 'COP' : 'GTQ'; }
  const norm = (m, cur) => { const n = finite(m); if (n == null) return 0; if (paisActivo()) return n; return cur === 'COP' ? n / TC_COP_GTQ : n; };
  function clientIndex() { return new Map((S().all('clientes') || []).filter(c => c && c.id).map(c => [c.id, c])); }
  function rowPais(row, clients) { const cli = clients instanceof Map ? clients.get(row.clienteId) : S().get('clientes', row.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p) || row.pais === p; }
  function polPais(p2, clients) { const cli = clients instanceof Map ? clients.get(p2.clienteId) : S().get('clientes', p2.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p); }

  /** Cartera Primas es la autoridad de pendiente/vencido; Cobros solo aporta recaudo confirmado. */
  function carteraGlobal() {
    const clients = clientIndex();
    const cob = (S().all('cobros') || []).filter(c => rowPais(c, clients));
    const car = (S().all('carteraPrimas') || []).filter(c => rowPais(c, clients));
    const alDia = cob.filter(confirmedCobro).reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const pend = car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).reduce((s, r) => s + norm(r.monto != null ? r.monto : r.saldo, r.moneda), 0);
    const venc = car.filter(portfolioIsOverdue).reduce((s, r) => s + norm(r.monto != null ? r.monto : r.saldo, r.moneda), 0);
    return { alDia, pend, venc, moneda: monedaPais(), source: 'cobros+carteraPrimas' };
  }
  function primaVigenteGlobal() {
    const clients = clientIndex();
    return S().where('polizas', p => (p.estado === 'Vigente' || p.estado === 'Por renovar') && polPais(p, clients))
      .reduce((s, p) => s + norm(p.prima, p.moneda), 0);
  }
  function renovacionesProximas(dias) {
    dias = dias || 45;
    return S().where('polizas', p => {
      const d = U.daysFromNow(p.vigenciaFin);
      return (p.estado === 'Vigente' || p.estado === 'Por renovar') && d != null && d >= 0 && d <= dias;
    }).sort((a, b) => String(a.vigenciaFin||'').localeCompare(String(b.vigenciaFin||'')));
  }
  /** Nombre conservado por compatibilidad: retorna obligaciones esperadas vencidas, no Cobros reales. */
  function cobrosVencidos() {
    return (S().all('recibosEsperados') || []).filter(expectedReceiptIsOverdue)
      .sort((a, b) => String(a.vence||a.fechaLimite||'').localeCompare(String(b.vence||b.fechaLimite||'')));
  }
  function leaderboard() {
    const clients = clientIndex();
    const policies = S().all('polizas') || [];
    const commissions = S().all('comisiones') || [];
    return (S().all('asesores') || []).map(a => {
      const pol = policies.filter(p => p.asesorId === a.id && (p.estado === 'Vigente' || p.estado === 'Por renovar') && polPais(p, clients));
      const prima = pol.reduce((s, p) => s + norm(p.prima, p.moneda), 0);
      const com = commissions.filter(c => c.asesorId === a.id).reduce((s, c) => s + norm(c.monto, c.moneda), 0);
      const metaPrima = Number(a && a.metaPrima);
      const metaDisponible = Number.isFinite(metaPrima) && metaPrima > 0;
      const rawPct = metaDisponible ? Math.round(prima / metaPrima * 100) : 0;
      const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(140, rawPct)) : 0;
      return { asesor: a, prima, comision: com, pct, metaPrima: metaDisponible ? metaPrima : 0, metaDisponible };
    }).sort((x, y) => y.prima - x.prima);
  }

  /** Aging exclusivo de Cartera Primas; Cobros realizados no generan deuda vencida. */
  function agingVencido() {
    const buckets = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    (S().all('carteraPrimas') || []).filter(portfolioIsOverdue).forEach(c => {
      const due = portfolioDue(c);
      const d = -U.daysFromNow(due);
      const v = norm(c.monto != null ? c.monto : c.saldo, c.moneda);
      if (d <= 30) buckets['1-30'] += v;
      else if (d <= 60) buckets['31-60'] += v;
      else if (d <= 90) buckets['61-90'] += v;
      else buckets['90+'] += v;
    });
    return buckets;
  }
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

  /** Recaudo comercial no es movimiento financiero de empresa. Cobros contiene eventos
   * confirmados; recibosEsperados y carteraPrimas permanecen dominios separados. */
  function postRecaudo(/* cobro, fecha, metodo */) { return; }

  return {
    asesor, aseguradora, polizasDe, recibosEsperadosDe, carteraPrimasDe, cobrosDe, comisionesDe, actividadesDe, cancelacionesDe,
    clienteResumen, clientesResumenIndex, carteraGlobal, primaVigenteGlobal, renovacionesProximas, cobrosVencidos, leaderboard,
    agingVencido, comisionesPor, clienteNombre, norm, monedaPais, vehiculosDe, vehiculoDePoliza, postRecaudo
  };
})();
