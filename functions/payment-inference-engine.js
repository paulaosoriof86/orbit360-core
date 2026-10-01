'use strict';

const VERSION = 'gravicentra-payment-inference-engine-v1-b3005';

const text = (value, max = 500) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const number = value => {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
function installment(value) {
  const raw = text(value, 120).toUpperCase().replace(/^'/, '');
  const pair = raw.match(/(\d+)\s*(?:DE|\/)\s*(\d+)/);
  if (pair) return { index: Number(pair[1]), total: Number(pair[2]) };
  const single = raw.match(/(?:^|\D)(\d+)(?:\D|$)/);
  return { index: single ? Number(single[1]) : null, total: null };
}
function receiptSequence(row) {
  row = row || {};
  for (const value of [row.secuencia, row.cuota, row.numeroCuota, row.numeroReciboFuente, row.serie]) {
    const parsed = installment(value);
    if (parsed.index != null && parsed.index > 0) return parsed.index;
  }
  return null;
}
function receiptDenominator(row) {
  row = row || {};
  for (const value of [row.cuota, row.numeroCuota, row.numeroReciboFuente, row.serie]) {
    const parsed = installment(value);
    if (parsed.total != null && parsed.total > 0) return parsed.total;
  }
  return null;
}
function dueDate(row) {
  return text(row && (row.vence || row.fechaLimite || row.fechaVencimiento), 32);
}
function activeReceipt(row) {
  const state = norm(row && (row.estadoOperativo || row.estado || row.status));
  return !!row && !['anulado','anulada','cancelado','cancelada','superseded','reemplazado','reemplazada'].includes(state);
}
function alreadyPaid(row) {
  const state = norm(row && (row.paymentState || row.estadoOperativo || row.estado));
  return ['paid_direct','paid_inferred','paid_reported','pagado','pago_inferido','pago_reportado_aplicado','pago_reportado_asesor_aplicado'].includes(state);
}
function contradiction(row) {
  const state = norm(row && (row.paymentState || row.estadoOperativo || row.estado));
  if (['reversed','revertido','reversado','conflict_review_required','conflicto','hold'].includes(state)) return true;
  if (row && (row.pagoParcial === true || row.partialPayment === true || row.refinanciado === true || row.restructured === true)) return true;
  return false;
}
function evidenceKind(value) {
  const key = norm(value).toUpperCase();
  const map = {
    INVOICE_INSTALLMENT_N: 'INVOICE_INSTALLMENT_N',
    INSURER_INVOICE: 'INVOICE_INSTALLMENT_N',
    FACTURA_ASEGURADORA: 'INVOICE_INSTALLMENT_N',
    INSURER_STATEMENT_PENDING_FROM_N: 'INSURER_STATEMENT_PENDING_FROM_N',
    INSURER_STATEMENT: 'INSURER_STATEMENT_PENDING_FROM_N',
    ESTADO_CUENTA_ASEGURADORA: 'INSURER_STATEMENT_PENDING_FROM_N',
    COMMISSION_STATEMENT_INSTALLMENT_N: 'COMMISSION_STATEMENT_INSTALLMENT_N',
    COMMISSION_STATEMENT: 'COMMISSION_STATEMENT_INSTALLMENT_N',
    PLANILLA_COMISIONES: 'COMMISSION_STATEMENT_INSTALLMENT_N',
    BANK_STATEMENT_MATCH: 'BANK_STATEMENT_MATCH',
    BANK_STATEMENT: 'BANK_STATEMENT_MATCH'
  };
  return map[key] || '';
}
function normalizedTokens(policy) {
  policy = policy || {};
  return [policy.aseguradoraNombre, policy.insurerName, policy.aseguradora, policy.aseguradoraId, policy.insurerId]
    .map(norm).filter(Boolean);
}
function ruleForPolicy(config, policy) {
  const tokens = normalizedTokens(policy);
  const rules = Array.isArray(config && config.insurerPaymentPlans) ? config.insurerPaymentPlans : [];
  const matches = rules.filter(rule => {
    const ids = [rule.insurerId, rule.canonicalKey, rule.insurer, rule.name].concat(rule.aliases || []).map(norm).filter(Boolean);
    return ids.some(id => tokens.some(token => token === id || token.includes(id) || id.includes(token)));
  });
  return matches.length === 1 ? matches[0] : null;
}
function review(code, detail) {
  return Object.assign({
    ok: true,
    status: 'REVIEW_REQUIRED',
    autoCommit: false,
    confidence: 'LOW',
    humanReviewRequired: true,
    writes: 0,
    reason: code
  }, detail || {});
}
function explicitTotal(evidence, anchorReceipt) {
  const direct = number(evidence && (evidence.totalInstallments || evidence.installmentTotal || evidence.totalCuotas));
  if (direct != null && direct > 0) return Math.floor(direct);
  const fromEvidence = installment(evidence && (evidence.installment || evidence.cuota || evidence.anchorInstallmentLabel));
  if (fromEvidence.total) return fromEvidence.total;
  return receiptDenominator(anchorReceipt);
}
function anchorIndex(evidence) {
  const direct = number(evidence && (evidence.anchorInstallment || evidence.installmentNumber || evidence.numeroCuota));
  if (direct != null && direct > 0) return Math.floor(direct);
  return installment(evidence && (evidence.installment || evidence.cuota || evidence.anchorInstallmentLabel)).index;
}
function sortedReceipts(receipts) {
  return [].concat(receipts || []).filter(activeReceipt).map(row => Object.assign({}, row, { __sequence: receiptSequence(row) }))
    .filter(row => row.__sequence != null).sort((a, b) => a.__sequence - b.__sequence || text(a.id).localeCompare(text(b.id)));
}
function resolveAnchor(receipts, evidence) {
  const receiptId = text(evidence && (evidence.receiptId || evidence.reciboId), 180);
  if (receiptId) {
    const exact = receipts.filter(row => text(row.id, 180) === receiptId);
    return { index: exact.length === 1 ? exact[0].__sequence : null, matches: exact };
  }
  const idx = anchorIndex(evidence);
  return { index: idx, matches: idx == null ? [] : receipts.filter(row => row.__sequence === idx) };
}
function planEvidence(input) {
  input = input || {};
  const policy = input.policy || {}, evidence = input.evidence || {}, config = input.reconciliationConfig || {};
  const type = evidenceKind(evidence.evidenceType || evidence.type || evidence.sourceType);
  if (!type) return review('EVIDENCE_TYPE_UNSUPPORTED');
  if (config.autoCommitHighConfidence !== true) return review('TENANT_HIGH_CONFIDENCE_AUTO_COMMIT_NOT_ENABLED');
  if (config.humanConfirmationRequiredForHighConfidence === true || config.humanConfirmationRequired === true) return review('TENANT_CONFIG_REQUIRES_HUMAN_CONFIRMATION');

  const rows = sortedReceipts(input.receipts);
  if (!rows.length) return review('NO_ACTIVE_NUMBERED_RECEIPTS');
  const anchor = resolveAnchor(rows, evidence);
  if (anchor.matches.length !== 1) return review(anchor.matches.length > 1 ? 'AMBIGUOUS_ANCHOR_RECEIPT' : 'ANCHOR_RECEIPT_NOT_FOUND', { anchorInstallment: anchor.index });
  const anchorReceipt = anchor.matches[0], n = anchorReceipt.__sequence;
  if (!(n > 0)) return review('ANCHOR_INSTALLMENT_INVALID');

  const total = explicitTotal(evidence, anchorReceipt);
  const planRule = ruleForPolicy(config, policy);
  if (planRule && norm(planRule.scope || 'fraccionado') === 'fraccionado') {
    const max = Math.floor(number(planRule.maxInstallments) || 0);
    if (max > 0 && total && total > max) {
      return review('INSTALLMENT_TOTAL_EXCEEDS_TENANT_CONFIG', { totalInstallments: total, maxInstallments: max, insurerRule: text(planRule.insurer || planRule.name || planRule.canonicalKey) });
    }
  }
  if (total && rows.length !== total) {
    return review('EXPECTED_RECEIPT_COUNT_MISMATCH', {
      expectedReceiptCount: total,
      actualReceiptCount: rows.length,
      scheduleCorrectionRequired: true,
      correctionMode: 'CONTROLLED_IDEMPOTENT_RECEIPT_PLAN_CORRECTION'
    });
  }
  const duplicates = new Set();
  for (const row of rows) {
    if (duplicates.has(row.__sequence)) return review('DUPLICATE_INSTALLMENT_SEQUENCE', { installment: row.__sequence });
    duplicates.add(row.__sequence);
  }

  const prior = rows.filter(row => row.__sequence < n);
  if (['INVOICE_INSTALLMENT_N','INSURER_STATEMENT_PENDING_FROM_N','COMMISSION_STATEMENT_INSTALLMENT_N'].includes(type)) {
    for (let i = 1; i < n; i += 1) if (!duplicates.has(i)) return review('NON_CONTIGUOUS_RECEIPT_SEQUENCE', { missingInstallment: i, anchorInstallment: n });
  }
  if (rows.some(contradiction)) return review('CONTRADICTORY_PAYMENT_STATE');

  const evidenceId = text(evidence.evidenceId || evidence.sourceRef || evidence.documentRef, 500);
  if (!evidenceId) return review('EVIDENCE_REFERENCE_REQUIRED');
  const evidenceAsOfDate = text(evidence.evidenceAsOfDate || evidence.fechaCorteEvidencia, 32);
  const ruleId = type === 'INVOICE_INSTALLMENT_N' ? 'INVOICE_CONTIGUOUS_PRIOR'
    : type === 'INSURER_STATEMENT_PENDING_FROM_N' ? 'INSURER_PENDING_FROM_CONTIGUOUS_PRIOR'
    : type === 'COMMISSION_STATEMENT_INSTALLMENT_N' ? 'COMMISSION_CONTIGUOUS_PRIOR'
    : 'BANK_EXACT_RECEIPT';

  const targets = [];
  const inferredPrior = prior.filter(row => !alreadyPaid(row));
  if (type !== 'BANK_STATEMENT_MATCH' || evidence.allowPriorContiguousInference === true) {
    if (type !== 'BANK_STATEMENT_MATCH' || evidence.allowPriorContiguousInference === true) {
      for (const row of inferredPrior) {
        const scheduledDate = dueDate(row);
        if (!scheduledDate) return review('INFERRED_INSTALLMENT_DUE_DATE_REQUIRED', { installment: row.__sequence });
        targets.push({
          receiptId: text(row.id, 180),
          installment: row.__sequence,
          mode: 'INFERRED',
          paymentState: 'PAID_INFERRED',
          applicationState: 'APPLIED_INFERRED',
          inferredEffectiveDate: scheduledDate,
          paidDate: '',
          directEvidence: false
        });
      }
    }
  }
  if (type !== 'INSURER_STATEMENT_PENDING_FROM_N') {
    targets.push({
      receiptId: text(anchorReceipt.id, 180),
      installment: n,
      mode: 'DIRECT',
      paymentState: 'PAID_DIRECT',
      applicationState: type === 'BANK_STATEMENT_MATCH' ? 'PENDING_APPLICATION' : 'APPLIED_DIRECT',
      inferredEffectiveDate: '',
      paidDate: text(evidence.paidDate || evidence.fechaPago, 32),
      directEvidence: true
    });
  }

  const currency = text(evidence.currency || evidence.moneda || policy.moneda, 12).toUpperCase();
  const policyCurrency = text(policy.moneda, 12).toUpperCase();
  if (config.requireSameCurrency !== false && currency && policyCurrency && currency !== policyCurrency) return review('CURRENCY_MISMATCH');
  if (evidence.uniqueMatch === false) return review('MATCH_NOT_UNIQUE');
  if (evidence.conflictingEvidence === true || evidence.partialPayment === true || evidence.reversal === true) return review('EVIDENCE_CONTRADICTION');

  return {
    ok: true,
    status: targets.length ? 'AUTO_COMMIT' : 'NOOP_ALREADY_SATISFIED',
    autoCommit: true,
    confidence: 'HIGH',
    humanReviewRequired: false,
    writes: 0,
    evidenceType: type,
    evidenceId,
    sourceRef: text(evidence.sourceRef || evidence.documentRef || evidenceId, 500),
    evidenceAsOfDate,
    anchorReceiptId: text(anchorReceipt.id, 180),
    anchorInstallment: n,
    totalInstallments: total || rows.length,
    inferenceRuleId: ruleId,
    matchedPolicyId: text(policy.id || evidence.policyId || evidence.polizaId, 180),
    insurerRule: planRule ? {
      insurer: text(planRule.insurer || planRule.name || planRule.canonicalKey),
      maxInstallments: Math.floor(number(planRule.maxInstallments) || 0),
      scope: text(planRule.scope || 'fraccionado')
    } : null,
    targets
  };
}

module.exports = Object.freeze({
  VERSION,
  planEvidence,
  evidenceKind,
  installment,
  receiptSequence,
  ruleForPolicy
});
