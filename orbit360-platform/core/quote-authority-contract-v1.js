/* ============================================================
   Gravicentra Insurance · Quote Authority Contract v1
   Fecha: 2026-10-03

   Contrato provider-side de autoridad para CotComp/Web.
   - Gravicentra es autoridad del dominio de cotización.
   - CotComp consume, presenta y registra interacción; no recalcula.
   - Este archivo es puro: no escribe, no llama providers y no despliega.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  'use strict';

  const VERSION = 'gravicentra-quote-authority-v1';
  const SCHEMA_VERSION = '1.0.0';

  const AMOUNT_BASES = [
    'net',
    'gross_includes_tax',
    'gross_includes_fees',
    'gross_includes_tax_and_fees',
    'requires_validation'
  ];

  const VALIDATION_STATES = [
    'DRAFT',
    'REQUIRES_VALIDATION',
    'VALIDATED',
    'STALE',
    'SUPERSEDED',
    'REJECTED'
  ];

  const FACT_STATES = [
    'PRESENT',
    'MISSING',
    'NOT_COVERED',
    'NOT_APPLICABLE',
    'NOT_COMPARABLE'
  ];

  const QUOTE_ORIGINS = [
    'tariff_rule',
    'official_quote',
    'official_pdf',
    'excel_calculator',
    'assisted_online',
    'manual_versioned'
  ];

  const REQUIRED_TRACE_FIELDS = [
    'configurationVersion',
    'tariffVersion',
    'sourceVersion',
    'providerBindingVersion',
    'catalogVersion',
    'rulesDigest',
    'calculatedAt',
    'validityFrom',
    'validityTo'
  ];

  const FIELD_AUTHORITY = Object.freeze({
    insurerEligibility: 'GRAVICENTRA',
    insurerProductPlanCatalog: 'GRAVICENTRA',
    sourceAndProviderBinding: 'GRAVICENTRA',
    tariffAndCalculationRules: 'GRAVICENTRA',
    premiumBreakdown: 'GRAVICENTRA_PROPOSAL',
    insurerPaymentTerms: 'GRAVICENTRA_PROPOSAL',
    externalFinancingFacts: 'GRAVICENTRA_PROPOSAL_OR_EXPLICIT_EXTERNAL_SOURCE',
    coverageDeductibleAssistance: 'GRAVICENTRA_PROPOSAL',
    proposalValidationAndValidity: 'GRAVICENTRA',
    comparisonFacts: 'GRAVICENTRA_PROJECTION',
    comparisonPresentation: 'COTCOMP',
    publicJourneyAndProgressiveCapture: 'COTCOMP',
    publicConsent: 'COTCOMP',
    explicitProposalChoice: 'COTCOMP_USER_ACTION',
    operationalIssuanceBindingConfirmation: 'GRAVICENTRA',
    vehicleCatalogGovernance: 'GRAVICENTRA_OR_SHARED_SERVICE_GOVERNED_BY_GRAVICENTRA',
    webFunnelAnalytics: 'COTCOMP'
  });

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }
  function numberOrNull(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function uniq(values) {
    return Array.from(new Set([].concat(values || []).filter(Boolean)));
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return Object.assign({}, value || {}); }
  }
  function isoDate(value) {
    const s = clean(value);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  }
  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function validateTrace(trace, options) {
    trace = trace || {};
    options = options || {};
    const errors = [];
    REQUIRED_TRACE_FIELDS.forEach(field => {
      if (!clean(trace[field])) errors.push('TRACE_REQUIRED_' + field);
    });
    if (!clean(trace.sourceDocumentId || trace.sourceRef)) errors.push('TRACE_REQUIRED_sourceDocumentId');
    if (!clean(trace.ruleId || trace.tariffRuleId)) errors.push('TRACE_REQUIRED_ruleId');
    if (!clean(trace.bindingId || trace.providerBindingId)) errors.push('TRACE_REQUIRED_bindingId');
    const from = isoDate(trace.validityFrom);
    const to = isoDate(trace.validityTo);
    if (from && to && from > to) errors.push('TRACE_VALIDITY_RANGE_INVALID');
    const at = isoDate(options.at || todayIso());
    if (options.requireCurrent !== false && at) {
      if (from && at < from) errors.push('TRACE_NOT_YET_EFFECTIVE');
      if (to && at > to) errors.push('TRACE_EXPIRED');
    }
    return { ok: !errors.length, errors: uniq(errors) };
  }

  function validatePremiumBreakdown(financial) {
    financial = financial || {};
    const errors = [];
    const basis = clean(financial.amountBasis || 'requires_validation');
    if (!AMOUNT_BASES.includes(basis)) errors.push('AMOUNT_BASIS_INVALID');
    if (basis === 'requires_validation') errors.push('AMOUNT_BASIS_REQUIRES_VALIDATION');
    if (!clean(financial.currency)) errors.push('CURRENCY_REQUIRED');

    const amounts = {
      netPremium: numberOrNull(financial.netPremium),
      minimumPremiumApplied: numberOrNull(financial.minimumPremiumApplied),
      issuanceExpense: numberOrNull(financial.issuanceExpense),
      expeditionExpense: numberOrNull(financial.expeditionExpense),
      assistance: numberOrNull(financial.assistance),
      discounts: numberOrNull(financial.discounts),
      other: numberOrNull(financial.other),
      insurerInstallmentSurcharge: numberOrNull(financial.insurerInstallmentSurcharge),
      externalFinanceCost: numberOrNull(financial.externalFinanceCost),
      taxAmount: numberOrNull(financial.taxAmount),
      totalPremium: numberOrNull(financial.totalPremium)
    };

    ['issuanceExpense','expeditionExpense','assistance','other','insurerInstallmentSurcharge','externalFinanceCost','taxAmount']
      .forEach(key => { if (amounts[key] != null && amounts[key] < 0) errors.push('NEGATIVE_' + key); });
    if (amounts.discounts != null && amounts.discounts < 0) errors.push('NEGATIVE_discounts');
    if (amounts.totalPremium == null || amounts.totalPremium <= 0) errors.push('TOTAL_PREMIUM_REQUIRED');

    if (basis === 'net' && (amounts.netPremium == null || amounts.netPremium <= 0)) {
      errors.push('NET_PREMIUM_REQUIRED_FOR_NET_BASIS');
    }

    if ((basis === 'gross_includes_tax' || basis === 'gross_includes_tax_and_fees') &&
        financial.taxIncludedInGross !== true) {
      errors.push('TAX_INCLUDED_FLAG_REQUIRED');
    }
    if ((basis === 'gross_includes_fees' || basis === 'gross_includes_tax_and_fees') &&
        financial.feesIncludedInGross !== true) {
      errors.push('FEES_INCLUDED_FLAG_REQUIRED');
    }

    const settlement = financial.payment || {};
    const insurerInstallments = numberOrNull(settlement.insurerInstallments);
    const externalInstallments = numberOrNull(settlement.externalInstallments);
    if (insurerInstallments != null && insurerInstallments < 1) errors.push('INSURER_INSTALLMENTS_INVALID');
    if (externalInstallments != null && externalInstallments < 1) errors.push('EXTERNAL_INSTALLMENTS_INVALID');

    if (clean(settlement.customerPaymentMode) === 'external_financing' && !clean(settlement.financingProvider)) {
      errors.push('EXTERNAL_FINANCING_PROVIDER_REQUIRED');
    }
    if (clean(settlement.customerPaymentMode) === 'external_financing' &&
        clean(settlement.insurerSettlementMode) !== 'cash' &&
        clean(settlement.insurerSettlementMode) !== 'single_payment') {
      errors.push('INSURER_SETTLEMENT_MODE_MUST_BE_EXPLICIT_FOR_EXTERNAL_FINANCING');
    }

    return { ok: !errors.length, errors: uniq(errors), amountBasis: basis, amounts };
  }

  function validateQuoteRequest(request) {
    request = request || {};
    const errors = [];
    ['tenantId','country','journey','riskId','correlationId','idempotencyKey'].forEach(field => {
      if (!clean(request[field])) errors.push('REQUEST_REQUIRED_' + field);
    });
    if (!request.risk || typeof request.risk !== 'object') errors.push('REQUEST_REQUIRED_risk');
    if (request.financialOverride != null) errors.push('REQUEST_FINANCIAL_OVERRIDE_FORBIDDEN');
    if (request.tariffOverride != null) errors.push('REQUEST_TARIFF_OVERRIDE_FORBIDDEN');
    if (request.insurerRuleOverride != null) errors.push('REQUEST_INSURER_RULE_OVERRIDE_FORBIDDEN');
    return { ok: !errors.length, errors: uniq(errors) };
  }

  function validateProposal(proposal, options) {
    proposal = proposal || {};
    options = options || {};
    const errors = [];
    ['proposalId','tenantId','country','currency','insurerId','productId','riskId','origin'].forEach(field => {
      if (!clean(proposal[field])) errors.push('PROPOSAL_REQUIRED_' + field);
    });
    if (!QUOTE_ORIGINS.includes(clean(proposal.origin))) errors.push('PROPOSAL_ORIGIN_INVALID');
    if (!VALIDATION_STATES.includes(clean(proposal.validationState))) errors.push('PROPOSAL_VALIDATION_STATE_INVALID');
    if (options.requireComparable !== false && clean(proposal.validationState) !== 'VALIDATED') {
      errors.push('PROPOSAL_NOT_VALIDATED');
    }
    if (proposal.currentVersion !== true) errors.push('PROPOSAL_NOT_CURRENT');
    const premium = validatePremiumBreakdown(proposal.financial);
    errors.push(...premium.errors);
    const trace = validateTrace(proposal.trace, { at: options.at, requireCurrent: options.requireCurrent !== false });
    errors.push(...trace.errors);

    if (proposal.internalEstimate === true) errors.push('INTERNAL_ESTIMATE_NOT_ELIGIBLE');
    if (proposal.providerResponseRaw != null) errors.push('RAW_PROVIDER_PAYLOAD_FORBIDDEN');
    return { ok: !uniq(errors).length, errors: uniq(errors), premium, trace };
  }

  function normalizeFact(fact) {
    fact = fact || {};
    const state = clean(fact.state || 'MISSING').toUpperCase();
    return {
      key: clean(fact.key),
      label: clean(fact.label),
      state: FACT_STATES.includes(state) ? state : 'MISSING',
      value: fact.value == null ? null : clone(fact.value),
      unit: clean(fact.unit),
      sourceRef: clean(fact.sourceRef),
      note: clean(fact.note)
    };
  }

  function buildComparisonProjection(proposals, options) {
    options = options || {};
    const rows = [].concat(proposals || []);
    const validation = rows.map(p => ({ proposalId: clean(p && p.proposalId), result: validateProposal(p, { at: options.at, requireComparable: true }) }));
    const errors = [];
    if (rows.length < 2) errors.push('COMPARISON_REQUIRES_TWO_PROPOSALS');
    validation.forEach(row => {
      if (!row.result.ok) errors.push(...row.result.errors.map(code => code + ':' + row.proposalId));
    });
    if (errors.length) return { ok: false, errors: uniq(errors), proposals: [] };

    return {
      ok: true,
      schemaVersion: SCHEMA_VERSION,
      authorityContract: VERSION,
      proposals: rows.map(p => ({
        proposalId: p.proposalId,
        insurerId: p.insurerId,
        productId: p.productId,
        planId: clean(p.planId),
        currency: p.currency,
        totalPremium: p.financial.totalPremium,
        paymentOptions: clone(p.financial.paymentOptions || []),
        facts: [].concat(p.comparisonFacts || []).map(normalizeFact),
        trace: clone(p.trace)
      })),
      ordering: 'PRESENTATION_OWNER_COTCOMP',
      defaultRanking: null,
      recommendation: null,
      semantics: {
        missingIsNotNotCovered: true,
        notApplicableIsDistinct: true,
        notComparableIsDistinct: true,
        silentWeightingForbidden: true
      }
    };
  }

  function validateSelectionHandoff(input) {
    input = input || {};
    const errors = [];
    ['tenantId','caseId','comparisonId','proposalId','correlationId','idempotencyKey'].forEach(field => {
      if (!clean(input[field])) errors.push('SELECTION_REQUIRED_' + field);
    });
    if (input.explicitUserChoice !== true) errors.push('EXPLICIT_USER_CHOICE_REQUIRED');
    if (input.issued === true || input.bound === true || input.confirmed === true) {
      errors.push('SELECTION_CANNOT_ASSERT_OPERATIONAL_OUTCOME');
    }
    if (clean(input.state || 'USER_SELECTED_FOR_CONTINUATION') !== 'USER_SELECTED_FOR_CONTINUATION') {
      errors.push('SELECTION_STATE_INVALID');
    }
    return { ok: !errors.length, errors: uniq(errors) };
  }

  Orbit.quoteAuthorityContractV1 = {
    VERSION,
    SCHEMA_VERSION,
    AMOUNT_BASES: AMOUNT_BASES.slice(),
    VALIDATION_STATES: VALIDATION_STATES.slice(),
    FACT_STATES: FACT_STATES.slice(),
    QUOTE_ORIGINS: QUOTE_ORIGINS.slice(),
    REQUIRED_TRACE_FIELDS: REQUIRED_TRACE_FIELDS.slice(),
    FIELD_AUTHORITY,
    validateTrace,
    validatePremiumBreakdown,
    validateQuoteRequest,
    validateProposal,
    normalizeFact,
    buildComparisonProjection,
    validateSelectionHandoff,
    rules: Object.freeze({
      noGenericFinancialFallbackForPublicQuotes: true,
      noCountryTaxFallbackToRescueIncompleteQuote: true,
      noSilentP06ToLegacyFallbackForCotComp: true,
      noLegacyCotTasasCompetitionInCotComp: true,
      noWebFinancialRecalculation: true,
      noDirectBrowserProviderCall: true,
      proposalHistoricalPinRequired: true,
      validationDoesNotEnableAutomatically: true,
      externalFinancingSeparatedFromInsurerInstallment: true,
      explicitSelectionRequired: true,
      selectionDoesNotMeanIssuedBoundConfirmed: true
    })
  };
})();
