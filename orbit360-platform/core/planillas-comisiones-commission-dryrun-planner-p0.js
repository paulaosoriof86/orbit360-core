/* ============================================================
   Orbit 360 · Planner puro de dry-run de comisiones P0
   - Alineado con importa-comisiones-p0 y su wire.
   - Destinos: planillasComisiones, comisionesDevengadas,
     conciliacionesComisiones.
   - No escribe, no calcula tasa, no activa CxC/CxP/finmovs.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.Orbit = root.Orbit || {};
    root.Orbit.planillasComisionesCommissionDryrunPlanner = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  function period(value) {
    const text = clean(value);
    const match = text.match(/(20\d{2})[-/](\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}` : '';
  }
  function commissionKey(input) {
    return [
      norm(input.insurerId || input.insurerName),
      norm(input.policyId || input.policyNumber),
      norm(input.receiptId || input.receiptNumber),
      norm(input.advisorId || input.advisorName || input.sourceSeller),
      period(input.period),
      String(number(input.intermediaryCommission))
    ].join('|');
  }
  function requiredMissing(input) {
    const missing = [];
    if (!clean(input.insurerId)) missing.push('aseguradoraId');
    if (!clean(input.policyId)) missing.push('polizaId');
    if (!clean(input.receiptId)) missing.push('reciboId');
    if (!clean(input.country)) missing.push('pais');
    if (!clean(input.currency)) missing.push('moneda');
    if (!period(input.period)) missing.push('periodo');
    if (!Number.isFinite(number(input.netPremium))) missing.push('primaNeta');
    const commission = number(input.intermediaryCommission);
    if (!Number.isFinite(commission) || commission === 0) missing.push('comisionA&S');
    if (!clean(input.sourceFile)) missing.push('archivoFuente');
    if (!clean(input.sourceBundle)) missing.push('fuente');
    if (!Number.isFinite(Number(input.sourceRow))) missing.push('filaFuente');
    return missing;
  }
  function sellerDecision(input) {
    const sellerAmount = number(input.sellerCommission);
    if (!Number.isFinite(sellerAmount) || sellerAmount === 0) return 'SELLER_NOT_APPLICABLE';
    const status = clean(input.sellerResolution);
    if (status === 'SELLER_ALIAS_MATCHES_POLICY') return 'SELLER_SOURCE_MATCH';
    if (status === 'SELLER_ALIAS_POLICY_CONFLICT') return 'HOLD_SELLER_POLICY_CONFLICT';
    if (status === 'SELLER_ALIAS_AMBIGUOUS') return 'HOLD_SELLER_ALIAS_AMBIGUOUS';
    if (status === 'POLICY_ADVISOR_NOT_CONFIGURED') return 'HOLD_POLICY_ADVISOR_NOT_CONFIGURED';
    return 'HOLD_SELLER_ALIAS_NOT_CONFIGURED';
  }
  function destinationState(key, existing) {
    const hasPlan = Boolean(existing && existing.planillas && existing.planillas.has(key));
    const hasDev = Boolean(existing && existing.devengadas && existing.devengadas.has(key));
    const hasCon = Boolean(existing && existing.conciliaciones && existing.conciliaciones.has(key));
    const count = [hasPlan, hasDev, hasCon].filter(Boolean).length;
    if (count === 3) return { state: 'COMPLETE', count };
    if (count > 0) return { state: 'PARTIAL', count };
    return { state: 'EMPTY', count: 0 };
  }
  function buildSeeds(input, key) {
    const commission = number(input.intermediaryCommission);
    const sellerCommission = number(input.sellerCommission) || 0;
    const base = {
      _sourceKey: key,
      aseguradoraId: clean(input.insurerId),
      aseguradoraNombre: clean(input.insurerName),
      polizaId: clean(input.policyId),
      reciboId: clean(input.receiptId),
      asesorId: clean(input.advisorId),
      vendedorOrigen: clean(input.sourceSeller),
      primaNeta: number(input.netPremium),
      comPagada: commission,
      montoComision: commission,
      comisionVendedorFuente: sellerCommission,
      periodo: period(input.period),
      pais: clean(input.country),
      moneda: clean(input.currency),
      ramo: clean(input.branch),
      archivoFuente: clean(input.sourceFile),
      hojaFuente: clean(input.sourceSheet),
      filaFuente: Number(input.sourceRow),
      sourceBundle: clean(input.sourceBundle),
      origen: 'planilla_comisiones',
      importado: true,
      importadorP0: true,
      esPrimaPendiente: false,
      esCxCFinanciera: false,
      tasaInferida: false,
      liquidacionAsesorAutorizada: false,
      finanzasActivadas: false
    };
    return Object.freeze({
      planillasComisiones: Object.freeze({
        id: `pla_com_${key}`,
        _sourceKey: key,
        aseguradoraId: base.aseguradoraId,
        aseguradoraNombre: base.aseguradoraNombre,
        periodo: base.periodo,
        pais: base.pais,
        moneda: base.moneda,
        archivoFuente: base.archivoFuente,
        hojaFuente: base.hojaFuente,
        filaFuente: base.filaFuente,
        sourceBundle: base.sourceBundle,
        estado: 'importada_pendiente_factura',
        origen: base.origen,
        importado: true
      }),
      comisionesDevengadas: Object.freeze(Object.assign({}, base, {
        id: `com_dev_${key}`,
        tipo: 'comision_devengada',
        estado: 'devengada_pendiente_factura',
        estadoComision: 'comision_devengada_planilla',
        estadoFactura: 'pendiente_facturar',
        estadoRecaudoComision: 'pendiente_conciliacion'
      })),
      conciliacionesComisiones: Object.freeze({
        id: `con_com_${key}`,
        _sourceKey: key,
        tipo: 'comision',
        estado: 'pendiente_factura',
        aseguradoraId: base.aseguradoraId,
        polizaId: base.polizaId,
        reciboId: base.reciboId,
        periodo: base.periodo,
        montoComision: commission,
        moneda: base.moneda,
        fuente: 'planilla_comisiones',
        sourceBundle: base.sourceBundle,
        archivoFuente: base.archivoFuente,
        hojaFuente: base.hojaFuente,
        filaFuente: base.filaFuente,
        accionPropuesta: 'comparar_planilla_con_factura_y_banco',
        requiereValidacion: false,
        motivosValidacion: [],
        importado: true
      })
    });
  }
  function planCandidate(input, existing) {
    const missing = requiredMissing(input || {});
    if (missing.length) {
      return Object.freeze({
        decision: 'HOLD_COMMISSION_CONTRACT_INCOMPLETE',
        commissionEligible: false,
        sellerDecision: sellerDecision(input || {}),
        missing: Object.freeze(missing),
        proposedDocuments: 0,
        operationalWrites: 0,
        financeActivated: false
      });
    }
    const key = commissionKey(input);
    const destination = destinationState(key, existing || {});
    if (destination.state === 'COMPLETE') {
      return Object.freeze({
        decision: 'OMIT_IDEMPOTENT',
        commissionEligible: false,
        sellerDecision: sellerDecision(input),
        sourceKey: key,
        existingDocuments: 3,
        proposedDocuments: 0,
        operationalWrites: 0,
        financeActivated: false
      });
    }
    if (destination.state === 'PARTIAL') {
      return Object.freeze({
        decision: 'HOLD_PARTIAL_DESTINATION_STATE',
        commissionEligible: false,
        sellerDecision: sellerDecision(input),
        sourceKey: key,
        existingDocuments: destination.count,
        proposedDocuments: 0,
        operationalWrites: 0,
        financeActivated: false
      });
    }
    const seller = sellerDecision(input);
    const decision = seller.startsWith('HOLD_')
      ? 'CREATE_AS_COMMISSION_HOLD_SELLER'
      : 'CREATE_AS_COMMISSION_DRYRUN';
    return Object.freeze({
      decision,
      commissionEligible: true,
      sellerDecision: seller,
      sourceKey: key,
      existingDocuments: 0,
      proposedDocuments: 3,
      destinations: Object.freeze(['planillasComisiones', 'comisionesDevengadas', 'conciliacionesComisiones']),
      seeds: buildSeeds(input, key),
      operationalWrites: 0,
      financeActivated: false
    });
  }
  function summarize(plans) {
    const decisions = {};
    const sellerDecisions = {};
    let commissionCandidates = 0;
    let proposedDocuments = 0;
    (plans || []).forEach(plan => {
      decisions[plan.decision] = (decisions[plan.decision] || 0) + 1;
      sellerDecisions[plan.sellerDecision] = (sellerDecisions[plan.sellerDecision] || 0) + 1;
      if (plan.commissionEligible) commissionCandidates++;
      proposedDocuments += Number(plan.proposedDocuments || 0);
    });
    return Object.freeze({
      total: (plans || []).length,
      commissionCandidates,
      holdsOrOmits: (plans || []).length - commissionCandidates,
      proposedDocuments,
      decisions: Object.freeze(decisions),
      sellerDecisions: Object.freeze(sellerDecisions),
      operationalWrites: 0,
      financeActivated: false
    });
  }
  return Object.freeze({
    schemaVersion: 'orbit360-planillas-comisiones-commission-dryrun-planner-v1',
    destinations: Object.freeze(['planillasComisiones', 'comisionesDevengadas', 'conciliacionesComisiones']),
    clean,
    norm,
    number,
    period,
    commissionKey,
    requiredMissing,
    sellerDecision,
    destinationState,
    buildSeeds,
    planCandidate,
    summarize
  });
});
