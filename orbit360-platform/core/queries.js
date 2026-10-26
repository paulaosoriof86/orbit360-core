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
  function policyLinkedClientId(row) {
    if (!row || row.polizaId == null) return null;
    const policy = S().get('polizas', row.polizaId);
    return policy && policy.clienteId != null ? policy.clienteId : null;
  }
  function recibosEsperadosDe(cliId) { return S().where('recibosEsperados', r => policyLinkedClientId(r) === cliId); }
  function carteraPrimasDe(cliId) { return S().where('carteraPrimas', r => policyLinkedClientId(r) === cliId); }
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
    const paymentState = String(row && row.paymentState || '').trim().toUpperCase();
    const applicationState = String(row && row.applicationState || '').trim().toUpperCase();
    const op = textNorm(row && row.estadoOperativo);
    const reported = ['pago_reportado','pago_reportado_aplicado','pago_reportado_asesor','pago_reportado_asesor_aplicado','pago_inferido','reportado','inferido'].includes(op) ||
      ['PAID_REPORTED','PAID_INFERRED','REPORTED_PENDING_OPERATIVE_VALIDATION'].includes(paymentState) ||
      row && (row.inferredPaid === true || row.paidInferred === true || row.pagoReportado === true);
    if (reported) return false;
    return state === 'pagado' || state === 'conciliado' || paymentState === 'PAID_DIRECT' ||
      paymentState === 'PAID_CONFIRMED' || applicationState === 'APPLIED_DIRECT' || row && row.conciliado === true;
  }
  function paymentOriginKind(row) {
    try {
      if (Orbit.reconciliationDomain && typeof Orbit.reconciliationDomain.classifyPaymentOrigin === 'function') return Orbit.reconciliationDomain.classifyPaymentOrigin(row);
    } catch (_) {}
    const source = String([
      row && row.evidenceType, row && row.sourceType, row && row.paymentOrigin, row && row.paymentOriginKind,
      row && row.fuenteAutoridad, row && row.origenAutoridad, row && row.fuenteConciliacion, row && row.authority
    ].filter(Boolean).join('|')).toLowerCase();
    if (/advisor[_ -]?reported|asesor[_ -]?reportado|advisor[_ -]?payment/.test(source)) return 'ADVISOR_REPORTED';
    if (/client[_ -]?reported|client[_ -]?portal|cliente[_ -]?portal/.test(source)) return 'CLIENT_PORTAL';
    if (/cobros[_ -]?realizados|direct[_ -]?payment[_ -]?reported[_ -]?crm|(^|[| _-])(siga|crm)([| _-]|$)/.test(source)) return 'CRM_DIRECT';
    return 'UNKNOWN';
  }
  function receiptHasAppliedPayment(row) {
    const state = textNorm(row && row.estado);
    const paymentState = String(row && row.paymentState || '').trim().toUpperCase();
    const op = textNorm(row && row.estadoOperativo).replace(/\s+/g, '_');
    const applicationState = String(row && row.applicationState || '').trim().toUpperCase();
    const denied = ['PAID_REPORTED','PAID_INFERRED','REPORTED_PENDING_OPERATIVE_VALIDATION'].includes(paymentState) ||
      ['pago_inferido','pago_reportado','pago_reportado_aplicado','pago_reportado_asesor','pago_reportado_asesor_aplicado','reportado','inferido'].includes(op) ||
      row && (row.inferredPaid === true || row.paidInferred === true || row.pagoReportado === true);
    if (denied) return false;
    return state === 'pagado' || state === 'conciliado' || paymentState === 'PAID_DIRECT' ||
      paymentState === 'PAID_CONFIRMED' || applicationState === 'APPLIED_DIRECT' || row && row.conciliado === true;
  }

  // B4-003: cartera determines whether an obligation is open and overdue;
  // a linked expected receipt may supply a missing contractual installment
  // amount only after an exact, unique, non-conflicting relation check.
  // This is a read-model provenance fallback, NOT a payment/cobro or write.
  function portfolioAmountContext(input) {
    input = input || {};
    const receipts = input.receipts || S().all('recibosEsperados') || [];
    const portfolios = input.portfolios || S().all('carteraPrimas') || [];
    const policies = input.policies || S().all('polizas') || [];
    const cobros = input.cobros || S().all('cobros') || [];
    const receiptsById = new Map(), duplicates = new Set(), portfoliosPerReceipt = new Map();
    const policiesById = new Map(), paymentReceiptIds = new Set();
    receipts.forEach(r => { const id=String(r&&r.id||'').trim(); if(!id)return;
      if(receiptsById.has(id))duplicates.add(id); else receiptsById.set(id,r);
    });
    portfolios.forEach(r => { const id=String(r&&(r.reciboId||r.receiptId)||'').trim(); if(id)portfoliosPerReceipt.set(id,(portfoliosPerReceipt.get(id)||0)+1); });
    policies.forEach(p => { const id=String(p&&p.id||'').trim(); if(id)policiesById.set(id,p); });
    cobros.forEach(c => { const id=String(c&&(c.reciboId||c.receiptId)||'').trim(); if(id)paymentReceiptIds.add(id); });
    return {receiptsById,duplicates,portfoliosPerReceipt,policiesById,paymentReceiptIds};
  }
  function explicitNumber(v) {
    if(v==null||String(v).trim()==='')return null;
    const n=finite(v);return n==null||!Number.isFinite(n)?null:n;
  }
  function portfolioAmountProof(row, ctx) {
    const explicit=explicitNumber(row&&(row.monto!=null?row.monto:row.saldo));
    if(explicit!=null)return {value:explicit,source:'CARTERA_EXPLICIT'};
    if(!row||row.carteraActiva===false||!portfolioOpen(row))return {value:null,source:'UNVERIFIED'};
    const key=String(row.reciboId||row.receiptId||'').trim();
    const policyId=String(row.polizaId||row.policyId||'').trim();
    if(!key||!policyId||!ctx||ctx.duplicates.has(key)||ctx.portfoliosPerReceipt.get(key)!==1||
       ctx.paymentReceiptIds.has(key))return {value:null,source:'UNVERIFIED'};
    const receipt=ctx.receiptsById.get(key),policy=ctx.policiesById.get(policyId);
    if(!receipt||!policy||String(receipt.polizaId||receipt.policyId||'').trim()!==policyId)return {value:null,source:'UNVERIFIED'};
    const pc=countryCode(policy.pais||policy.country),money=countryCode(policy.moneda||policy.divisa);
    if(!['GT','CO'].includes(pc)||money!==(pc==='GT'?'GTQ':'COP')||
       !['Vigente','Por renovar'].includes(String(policy.estado||'')))return {value:null,source:'UNVERIFIED'};
    if([row.pais,row.country,receipt.pais,receipt.country].some(v=>v&&countryCode(v)!==pc)||
       [row.moneda,receipt.moneda].some(v=>!v||countryCode(v)!==money))return {value:null,source:'UNVERIFIED'};
    const parentClient=String(policy.clienteId||'').trim();
    if(!parentClient||(row.clienteId&&String(row.clienteId)!==parentClient)||
       (receipt.clienteId&&String(receipt.clienteId)!==parentClient))return {value:null,source:'UNVERIFIED'};
    const duePortfolio=String(portfolioDue(row)||'').slice(0,10);
    const dueReceipt=String(receipt.fechaLimite||receipt.vence||receipt.fechaVencimiento||'').slice(0,10);
    if(!duePortfolio||duePortfolio!==dueReceipt)return {value:null,source:'UNVERIFIED'};
    if(!expectedReceiptOpen(receipt)||receiptHasAppliedPayment(receipt)||
       row.cobroId||row.fechaPago||row.paidDate||row.conciliadoPago===true)return {value:null,source:'UNVERIFIED'};
    const state=textNorm(receipt.estadoOperativo||row.estadoOperativo).replace(/\s+/g,'_');
    if(!['pendiente','pendiente_vencido'].includes(state))return {value:null,source:'UNVERIFIED'};
    const amountReceipt=explicitNumber(receipt.primaTotal!=null?receipt.primaTotal:(receipt.montoTotal!=null?receipt.montoTotal:receipt.monto));
    const amountPortfolio=explicitNumber(row.primaTotal!=null?row.primaTotal:row.montoTotal);
    if(amountReceipt==null||amountReceipt<=0||
       (amountPortfolio!=null&&Math.abs(amountPortfolio-amountReceipt)>0.01))return {value:null,source:'UNVERIFIED'};
    return {value:amountReceipt,source:'MATCHED_EXPECTED_RECEIPT_CONTRACTUAL_AMOUNT',receiptId:key};
  }
  function portfolioAmountValue(row, ctx) {
    const proof=portfolioAmountProof(row,ctx);
    return proof.value==null?0:proof.value;
  }
  function portfolioValuedRowsCount(rows, ctx) {
    // Counts the same provenance-confirmed amount universe used by the KPIs.
    // Explicit amounts and uniquely matched expected receipts both count;
    // unverified nominal amounts never silently become reliable amounts.
    const proofContext=ctx||portfolioAmountContext();
    return (Array.isArray(rows)?rows:[]).filter(row=>portfolioAmountProof(row,proofContext).value!=null).length;
  }

  // Financial summaries are projections, not a foreign-exchange authority.
  // Preserve the legacy scalar fields for existing consumers, but expose the
  // source-currency breakdown for any UI that displays monetary values.
  function sumsByCurrency(rows, valueOf, currencyOf) {
    const totals = {};
    (rows || []).forEach(row => {
      const value = explicitNumber(valueOf(row));
      if (value == null) return;
      const currency = String(currencyOf(row) || 'SIN_MONEDA').trim().toUpperCase() || 'SIN_MONEDA';
      totals[currency] = (totals[currency] || 0) + value;
    });
    return totals;
  }
  function clientMoneyBreakdown(pol, car, realized, com, ctx, policies) {
    const byPolicyCurrency = row => {
      const policy = policies.get(String(row && row.polizaId || ''));
      const fromRow = String(row && row.moneda || '').trim().toUpperCase();
      const fromPolicy = String(policy && (policy.moneda || policy.divisa) || '').trim().toUpperCase();
      // Conflicting original currencies are not silently relabelled.
      return fromRow && fromPolicy && fromRow !== fromPolicy ? 'SIN_MONEDA' : (fromRow || fromPolicy || 'SIN_MONEDA');
    };
    // The canonical portfolio adapter excludes explicitly inactive obligations.
    // Do not reintroduce them as overdue badges in Cliente 360.
    const open = car.filter(row => row && row.carteraActiva !== false && portfolioOpen(row));
    const overdue = open.filter(portfolioIsOverdue);
    const pending = open.filter(row => !portfolioIsOverdue(row));
    const proof = row => portfolioAmountProof(row, ctx).value;
    return {
      totals: {
        primaAnual: sumsByCurrency(pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar'), p => p.primaTotal, p => p.moneda || p.divisa),
        cobrado: sumsByCurrency(realized, p => p.monto, byPolicyCurrency),
        pendiente: sumsByCurrency(pending, proof, byPolicyCurrency),
        vencido: sumsByCurrency(overdue, proof, byPolicyCurrency),
        comisionGen: sumsByCurrency(com, c => c.monto, c => c.moneda)
      },
      overdueCount: overdue.length,
      overdueUnverifiedCount: overdue.filter(row => proof(row) == null || byPolicyCurrency(row) === 'SIN_MONEDA').length
    };
  }

  // B3-008: la fórmula aprobada de Salud vive en un único owner.
  function saludCliente(cli, vigentes, vencido) {
    let salud = 70;
    salud += Math.min(20, (vigentes || []).length * 6);
    salud -= vencido > 0 ? 25 : 0;
    salud += cli && cli.segmento === 'Premium' ? 8 : 0;
    return Math.max(8, Math.min(100, salud));
  }

  /** Resumen 360 de un cliente: dominios financieros separados. */
  function clienteResumen(cliId) {
    const cli = S().get('clientes', cliId);
    const pol = polizasDe(cliId);
    const rec = recibosEsperadosDe(cliId);
    const car = carteraPrimasDe(cliId);
    const cob = cobrosDe(cliId);
    const realized = realizedPaymentRows().filter(c => c && c.clienteId === cliId);
    const com = comisionesDe(cliId);
    const vigentes = pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const primaAnual = vigentes.reduce((s, p) => s + amount(p.primaTotal), 0);
    const cobrado = realized.reduce((s, c) => s + amount(c.monto), 0);
    const amountIndex=portfolioAmountContext({receipts:rec,policies:pol,portfolios:car,cobros:cob});
    const pendiente = car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).reduce((s, r) => s + portfolioAmountValue(r,amountIndex), 0);
    const vencido = car.filter(portfolioIsOverdue).reduce((s, r) => s + portfolioAmountValue(r,amountIndex), 0);
    const recibosPendientes = rec.filter(r => expectedReceiptOpen(r) && !expectedReceiptIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
    const recibosVencidos = rec.filter(expectedReceiptIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
    const comisionGen = com.reduce((s, c) => s + amount(c.monto), 0);
    const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
    const salud = saludCliente(cli, vigentes, vencido);
    const policyIndex = new Map(pol.filter(p => p && p.id != null).map(p => [String(p.id), p]));
    const currencySummary = clientMoneyBreakdown(pol, car, realized, com, amountIndex, policyIndex);
    return {
      cli, pol, rec, car, cob, com,
      moneda: cli ? cli.moneda : 'GTQ',
      nPolizas: pol.length, nVigentes: vigentes.length,
      primaAnual, cobrado, pendiente, vencido, recibosPendientes, recibosVencidos, comisionGen, porRenovar,
      salud, porMoneda: currencySummary.totals,
      carteraVencidaCount: currencySummary.overdueCount,
      carteraVencidaSinMonto: currencySummary.overdueUnverifiedCount
    };
  }

  /** Índice batched con la misma separación semántica del resumen individual. */
  function clientesResumenIndex() {
    const clientes = S().all('clientes') || [];
    const polizas = S().all('polizas') || [];
    const recibos = S().all('recibosEsperados') || [];
    const cartera = S().all('carteraPrimas') || [];
    const cobros = S().all('cobros') || [];
    const realized = realizedPaymentRows();
    const comisiones = S().all('comisiones') || [];
    const portfolioMoney=portfolioAmountContext({receipts:recibos,policies:polizas,portfolios:cartera,cobros});
    const polByClient = new Map(), polById = new Map(), recByClient = new Map(), carByClient = new Map(), cobByClient = new Map(), realizedByClient = new Map(), comByClient = new Map();
    const policyCurrencyIndex = new Map(polizas.filter(p => p && p.id != null).map(p => [String(p.id), p]));
    const add = (map, id, row) => {
      if (id == null) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    };
    polizas.forEach(p => { add(polByClient, p.clienteId, p); if (p && p.id != null) polById.set(p.id, p); });
    recibos.forEach(r => { const p = r && polById.get(r.polizaId); if (p) add(recByClient, p.clienteId, r); });
    cartera.forEach(r => { const p = r && polById.get(r.polizaId); if (p) add(carByClient, p.clienteId, r); });
    cobros.forEach(c => add(cobByClient, c.clienteId, c));
    realized.forEach(c => add(realizedByClient, c.clienteId, c));
    comisiones.forEach(c => add(comByClient, c.clienteId, c));

    const index = new Map();
    clientes.forEach(cli => {
      if (!cli || cli.id == null) return;
      const pol = polByClient.get(cli.id) || [];
      const rec = recByClient.get(cli.id) || [];
      const car = carByClient.get(cli.id) || [];
      const cob = cobByClient.get(cli.id) || [];
      const realizedCob = realizedByClient.get(cli.id) || [];
      const com = comByClient.get(cli.id) || [];
      const vigentes = pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
      const primaAnual = vigentes.reduce((s, p) => s + amount(p.primaTotal), 0);
      const cobrado = realizedCob.reduce((s, c) => s + amount(c.monto), 0);
      const pendiente = car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).reduce((s, r) => s + portfolioAmountValue(r,portfolioMoney), 0);
      const vencido = car.filter(portfolioIsOverdue).reduce((s, r) => s + portfolioAmountValue(r,portfolioMoney), 0);
      const recibosPendientes = rec.filter(r => expectedReceiptOpen(r) && !expectedReceiptIsOverdue(r)).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
      const recibosVencidos = rec.filter(expectedReceiptIsOverdue).reduce((s, r) => s + amount(r.monto != null ? r.monto : r.montoTotal), 0);
      const comisionGen = com.reduce((s, c) => s + amount(c.monto), 0);
      const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
      const salud = saludCliente(cli, vigentes, vencido);
      const currencySummary = clientMoneyBreakdown(pol, car, realizedCob, com, portfolioMoney, policyCurrencyIndex);
      index.set(cli.id, {
        cli, pol, rec, car, cob, com,
        moneda: cli.moneda,
        nPolizas: pol.length, nVigentes: vigentes.length,
        primaAnual, cobrado, pendiente, vencido, recibosPendientes, recibosVencidos, comisionGen, porRenovar,
        salud, porMoneda: currencySummary.totals,
        carteraVencidaCount: currencySummary.overdueCount,
        carteraVencidaSinMonto: currencySummary.overdueUnverifiedCount
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
  function countryCode(v) { return String(v || '').trim().toUpperCase(); }
  function policyLinkedCountry(row, clients, policies) {
    row = row || {};
    const policy = row.polizaId != null ? (policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId)) : null;
    // Fail closed on contradictory source and linked-parent evidence, not
    // merely the policy-vs-row pair. Align with the staged server allowRow.
    if (row.polizaId != null && !policy) return 'REQUIERE_VALIDACION';
    const ownClientId = row.clienteId != null ? row.clienteId : null;
    const parentClientId = policy && policy.clienteId != null ? policy.clienteId : null;
    if (ownClientId != null && parentClientId != null && String(ownClientId) !== String(parentClientId)) return 'REQUIERE_VALIDACION';
    const clientId = parentClientId != null ? parentClientId : ownClientId;
    const cli = clientId != null ? (clients instanceof Map ? clients.get(clientId) : S().get('clientes', clientId)) : null;
    if (clientId != null && !cli) return 'REQUIERE_VALIDACION';
    const countries = [countryCode(policy && policy.pais),countryCode(row.pais),countryCode(cli && cli.pais)].filter(Boolean);
    if (countries.some(v => v !== 'GT' && v !== 'CO') || new Set(countries).size > 1) return 'REQUIERE_VALIDACION';
    return countries[0] || '';
  }
  function rowPais(row, clients, policies) {
    const p = paisActivo();
    if (!p) return true;
    if (row && row.polizaId != null) return policyLinkedCountry(row, clients, policies) === p;
    const cli = row && row.clienteId != null ? (clients instanceof Map ? clients.get(row.clienteId) : S().get('clientes', row.clienteId)) : null;
    return (countryCode(row && row.pais) || countryCode(cli && cli.pais)) === p;
  }
  function policyLinkedRowPais(row, clients, policies) {
    if (!row || row.polizaId == null) return false;
    const policy = policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId);
    if (!policy) return false;
    const p = paisActivo();
    const country = policyLinkedCountry(row, clients, policies);
    return (country === 'GT' || country === 'CO') && (!p || country === p);
  }
  function polPais(p2, clients) {
    const cli = p2 && p2.clienteId != null ? (clients instanceof Map ? clients.get(p2.clienteId) : S().get('clientes', p2.clienteId)) : null;
    const p = paisActivo();
    return !p || (countryCode(p2 && p2.pais) || countryCode(cli && cli.pais)) === p;
  }
  function clientesScoped() {
    const p = paisActivo();
    return (S().all('clientes') || []).filter(c => !p || countryCode(c && c.pais) === p);
  }
  function polizasScoped() {
    const clients = clientIndex();
    return (S().all('polizas') || []).filter(p => polPais(p, clients));
  }
  function realizedPaymentRows() {
    const cobros = (S().all('cobros') || []).filter(confirmedCobro);
    const linkedReceiptIds = new Set(cobros.map(c => String(c && (c.reciboId || c.receiptId) || '').trim()).filter(Boolean));
    const cobroIds = new Set(cobros.map(c => String(c && c.id || '').trim()).filter(Boolean));
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    const projected = (S().all('recibosEsperados') || []).filter(r => {
      if (!r) return false;
      const rid = String(r.id || '').trim();
      if (rid && linkedReceiptIds.has(rid)) return false;
      const cobroId = String(r.cobroId || '').trim();
      if (cobroId && cobroIds.has(cobroId)) return false;
      return receiptHasAppliedPayment(r);
    }).map(r => {
      const policy = policies.get(r.polizaId) || {};
      const origin = paymentOriginKind(r);
      const applicationState = String(r.applicationState || '').trim().toUpperCase();
      return {
        id: 'receipt-payment:' + String(r.id || ''),
        receiptId: r.id,
        clienteId: r.clienteId || policy.clienteId || '',
        polizaId: r.polizaId || '',
        asesorId: r.asesorId || policy.asesorId || '',
        pais: policy.pais || r.pais || '',
        monto: r.primaTotal != null ? r.primaTotal : (r.montoTotal != null ? r.montoTotal : r.monto),
        moneda: policy.moneda || policy.divisa || r.moneda || '',
        sourceMoneda: r.moneda || '',
        currencyValidation: (policy.moneda && r.moneda && countryCode(policy.moneda) !== countryCode(r.moneda)) ? 'REQUIERE_VALIDACION' : 'OK',
        fechaPago: r.fechaPago || r.paidDate || r.inferredEffectiveDate || '',
        paidDate: r.paidDate || '',
        inferredEffectiveDate: r.inferredEffectiveDate || '',
        conciliado: r.conciliado === true || applicationState === 'APPLIED_DIRECT',
        paymentOriginKind: origin,
        paymentState: r.paymentState || (origin === 'CRM_DIRECT' ? 'PAID_DIRECT' : 'PAID_INFERRED'),
        estado: 'Pagado',
        __projectedConfirmedPayment: true
      };
    });
    return cobros.concat(projected);
  }
  function currentMonthKey() {
    const d = U.now ? U.now() : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function paymentBusinessDate(row) {
    return String(row && (row.fechaPago || row.paidDate || row.inferredEffectiveDate) || '').slice(0, 10);
  }
  function produccionMesPorMoneda(monthKey, advisorId) {
    const key = String(monthKey || currentMonthKey()).slice(0, 7);
    const out = {};
    polizasScoped().forEach(p => {
      if (!p || String(p.vigenciaInicio || '').slice(0, 7) !== key) return;
      if (advisorId && p.asesorId !== advisorId) return;
      const n = finite(p.primaNeta != null ? p.primaNeta : p.prima);
      if (n == null) return;
      const cli = p.clienteId != null ? S().get('clientes', p.clienteId) : null;
      const cur = String(p.moneda || p.divisa || (cli && cli.moneda) || 'SIN_MONEDA').trim().toUpperCase() || 'SIN_MONEDA';
      out[cur] = (out[cur] || 0) + n;
    });
    return out;
  }
  function recaudoMesPorMoneda(monthKey, advisorId) {
    const key = String(monthKey || currentMonthKey()).slice(0, 7);
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    const out = {};
    // A personal recaudo is attributable only to the canonical policy advisor.
    // Preserve the existing institution-wide total when advisorId is omitted.
    const requestedAdvisor = String(advisorId == null ? '' : advisorId).trim();
    realizedPaymentRows().filter(r => rowPais(r, clients, policies)).forEach(r => {
      if (paymentBusinessDate(r).slice(0, 7) !== key) return;
      if (requestedAdvisor) {
        const policy = r.polizaId != null ? policies.get(r.polizaId) : null;
        const policyAdvisor = String(policy && policy.asesorId || '').trim();
        const declaredAdvisor = String(r.asesorId || '').trim();
        if (!policyAdvisor || policyAdvisor !== requestedAdvisor || (declaredAdvisor && declaredAdvisor !== policyAdvisor)) return;
      }
      const n = finite(r.monto);
      if (n == null) return;
      const cur = currencyCodeFor(r, clients, policies);
      out[cur] = (out[cur] || 0) + n;
    });
    return out;
  }
  function metaAdvisorMes(asesorId, monthKey, country) {
    const key = String(monthKey || currentMonthKey()).slice(0, 7);
    const wantedCountry = countryCode(country || paisActivo());
    const rows = (S().all('metas') || []).filter(m =>
      m && String(m.asesorId || '') === String(asesorId || '') &&
      String(m.mes || m.periodo || '').slice(0, 7) === key &&
      (!wantedCountry || countryCode(m.pais) === wantedCountry)
    );
    const explicit = rows.filter(m => ['nueva','renovada','recaudo'].includes(String(m.tipo || '')));
    const sum = type => explicit.filter(m => String(m.tipo || '') === type).reduce((s,m) => s + amount(m.valor), 0);
    const nueva = sum('nueva'), renovada = sum('renovada'), recaudo = sum('recaudo');
    const produccion = nueva + renovada;
    return { nueva, renovada, recaudo, produccion, explicit: explicit.length > 0, pais: wantedCountry || '' };
  }
  function leaderboardMes(monthKey) {
    const key = String(monthKey || currentMonthKey()).slice(0, 7);
    const activeCountry = paisActivo();
    return (S().all('asesores') || []).filter(a => !activeCountry || countryCode(a && (a.paisDefault || a.pais)) === activeCountry).map(a => {
      const byCurrency = produccionMesPorMoneda(key, a.id);
      const target = metaAdvisorMes(a.id, key, activeCountry || countryCode(a && (a.paisDefault || a.pais)));
      const base = finite(a && a.metaPrima);
      const metaPrima = target.explicit ? (target.produccion > 0 ? target.produccion : null) : (base != null && base > 0 ? base : null);
      const currencies = Object.keys(byCurrency).filter(cur => Math.abs(Number(byCurrency[cur]) || 0) > 0);
      const expectedCountry = activeCountry || countryCode(a && (a.paisDefault || a.pais));
      const expectedCurrency = expectedCountry === 'CO' ? 'COP' : expectedCountry === 'GT' ? 'GTQ' : (currencies.length === 1 ? currencies[0] : '');
      const prima = expectedCurrency ? amount(byCurrency[expectedCurrency]) : 0;
      const pct = metaPrima && expectedCurrency ? Math.max(0, Math.min(140, Math.round(prima / metaPrima * 100))) : null;
      return { asesor: a, byCurrency, prima, pct, metaPrima, metaDisponible: metaPrima != null, moneda: expectedCurrency, metaNueva: target.nueva, metaRenovada: target.renovada, metaRecaudo: target.recaudo };
    }).sort((x, y) => y.prima - x.prima);
  }

  function carteraPendienteDe(cliId) {
    return carteraPrimasDe(cliId).filter(r => portfolioOpen(r) && !portfolioIsOverdue(r));
  }
  function carteraVencidaDe(cliId) {
    return carteraPrimasDe(cliId).filter(portfolioIsOverdue);
  }
  function carteraRowsScoped() {
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    return (S().all('carteraPrimas') || []).filter(c => policyLinkedRowPais(c, clients, policies));
  }
  function carteraPendienteRows() { return carteraRowsScoped().filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)); }
  function carteraVencidaRows() { return carteraRowsScoped().filter(portfolioIsOverdue); }
  function cobrosConfirmadosRows() {
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    return realizedPaymentRows().filter(r => rowPais(r, clients, policies) && confirmedCobro(r));
  }

  /** Cartera Primas es la autoridad de pendiente/vencido; Cobros solo aporta recaudo confirmado. */
  function carteraGlobal() {
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    const cob = realizedPaymentRows().filter(c => rowPais(c, clients, policies));
    const pendingRows = carteraPendienteRows();
    const overdueRows = carteraVencidaRows();
    const finance=portfolioAmountContext();
    const alDia = cob.filter(confirmedCobro).reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const pend = pendingRows.reduce((s, r) => s + norm(portfolioAmountValue(r,finance), currencyCodeFor(r,clients,policies)), 0);
    const venc = overdueRows.reduce((s, r) => s + norm(portfolioAmountValue(r,finance), currencyCodeFor(r,clients,policies)), 0);
    return { alDia, pend, venc, moneda: monedaPais(), source: 'cobros+carteraPrimas' };
  }
  function currencyCodeFor(row, clients, policies) {
    row = row || {};
    const policy = row.polizaId != null ? (policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId)) : null;
    const clientId = row.clienteId != null ? row.clienteId : (policy && policy.clienteId);
    const client = clientId != null ? (clients instanceof Map ? clients.get(clientId) : S().get('clientes', clientId)) : null;
    return String((policy && (policy.moneda || policy.divisa)) || row.moneda || (client && client.moneda) || '').trim().toUpperCase() || 'SIN_MONEDA';
  }
  function emptyPortfolioCurrency() { return { alDia: 0, pend: 0, venc: 0, porConciliar: 0 }; }
  function carteraGlobalPorMoneda() {
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    const cob = realizedPaymentRows().filter(c => rowPais(c, clients, policies));
    const portfolioSource=S().all('carteraPrimas') || [];
    const car = portfolioSource.filter(c => policyLinkedRowPais(c, clients, policies));
    const finance=portfolioAmountContext({portfolios:portfolioSource,policies:[...policies.values()]});
    const byCurrency = {};
    let confirmedCount = 0, porConciliarCount = 0;
    const ensure = cur => byCurrency[cur] || (byCurrency[cur] = emptyPortfolioCurrency());
    cob.filter(confirmedCobro).forEach(c => {
      confirmedCount += 1;
      const cur = currencyCodeFor(c, clients, policies);
      ensure(cur).alDia += amount(c.monto);
      if (!c.conciliado) {
        ensure(cur).porConciliar += 1;
        porConciliarCount += 1;
      }
    });
    car.filter(r => portfolioOpen(r) && !portfolioIsOverdue(r)).forEach(r => {
      const cur = currencyCodeFor(r, clients, policies);
      ensure(cur).pend += portfolioAmountValue(r,finance);
    });
    car.filter(portfolioIsOverdue).forEach(r => {
      const cur = currencyCodeFor(r, clients, policies);
      ensure(cur).venc += portfolioAmountValue(r,finance);
    });
    return {
      byCurrency,
      currencies: Object.keys(byCurrency).sort(),
      confirmedCount,
      porConciliarCount,
      reconciledCount: Math.max(0, confirmedCount - porConciliarCount),
      country: paisActivo() || 'TODOS',
      source: 'cobros+carteraPrimas',
      crossCurrencyConversion: false,
      fxAuthorityUsed: false
    };
  }
  function agingVencidoPorMoneda() {
    const clients = clientIndex();
    const policies = new Map((S().all('polizas') || []).filter(p => p && p.id != null).map(p => [p.id, p]));
    const byCurrency = {},portfolioSource=S().all('carteraPrimas')||[];
    const finance=portfolioAmountContext({portfolios:portfolioSource,policies:[...policies.values()]});
    const ensure = cur => byCurrency[cur] || (byCurrency[cur] = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
    portfolioSource
      .filter(r => policyLinkedRowPais(r, clients, policies))
      .filter(portfolioIsOverdue)
      .forEach(r => {
        const due = portfolioDue(r);
        const d = -U.daysFromNow(due);
        const cur = currencyCodeFor(r, clients, policies);
        const v = portfolioAmountValue(r,finance);
        const buckets = ensure(cur);
        if (d <= 30) buckets['1-30'] += v;
        else if (d <= 60) buckets['31-60'] += v;
        else if (d <= 90) buckets['61-90'] += v;
        else buckets['90+'] += v;
      });
    return {
      byCurrency,
      currencies: Object.keys(byCurrency).sort(),
      country: paisActivo() || 'TODOS',
      source: 'carteraPrimas',
      crossCurrencyConversion: false,
      fxAuthorityUsed: false
    };
  }
  function primaVigenteGlobal() {
    const clients = clientIndex();
    return S().where('polizas', p => (p.estado === 'Vigente' || p.estado === 'Por renovar') && polPais(p, clients))
      .reduce((s, p) => s + norm(p.primaTotal, p.moneda), 0);
  }
  function renovacionesProximas(dias) {
    dias = dias || 45;
    const clients = clientIndex();
    return S().where('polizas', p => {
      const d = U.daysFromNow(p.vigenciaFin);
      return polPais(p, clients) && (p.estado === 'Vigente' || p.estado === 'Por renovar') && d != null && d >= 0 && d <= dias;
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
    const finance=portfolioAmountContext(),policyById=finance.policiesById;
    (S().all('carteraPrimas') || []).filter(portfolioIsOverdue).forEach(c => {
      const due = portfolioDue(c);
      const d = -U.daysFromNow(due);
      const cur=countryCode(policyById.get(String(c.polizaId||''))?.moneda||c.moneda);
      const v = norm(portfolioAmountValue(c,finance),cur);
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
    asesor, aseguradora, polizasDe, recibosEsperadosDe, carteraPrimasDe, carteraPendienteDe, carteraVencidaDe, cobrosDe, comisionesDe, actividadesDe, cancelacionesDe,
    clienteResumen, clientesResumenIndex, saludCliente, carteraGlobal, carteraPendienteRows, carteraVencidaRows, cobrosConfirmadosRows, carteraGlobalPorMoneda, primaVigenteGlobal, renovacionesProximas, cobrosVencidos, leaderboard,
    clientesScoped, polizasScoped, realizedPaymentRows, currentMonthKey, produccionMesPorMoneda, recaudoMesPorMoneda, metaAdvisorMes, leaderboardMes,
    agingVencido, agingVencidoPorMoneda, portfolioAmountProof, portfolioAmountContext, portfolioValuedRowsCount, comisionesPor, clienteNombre, norm, monedaPais, policyLinkedClientId, policyLinkedCountry, vehiculosDe, vehiculoDePoliza, postRecaudo
  };
})();
