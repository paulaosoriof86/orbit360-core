#!/usr/bin/env node
'use strict';

import crypto from 'node:crypto';

export const VERSION = 'orbit360-cobros-inferencia-secuencial-v1';
export const OUTCOMES = Object.freeze({
  DIRECT: 'CONCILIADO_DIRECTO_ASEGURADORA',
  COMMISSION: 'CONCILIADO_RECONOCIMIENTO_ASEGURADORA',
  PORTFOLIO_SEQUENCE: 'CONCILIADO_SECUENCIA_CARTERA',
  COMMISSION_SEQUENCE: 'CONCILIADO_SECUENCIA_PLANILLA',
  PLATFORM_REPORTED: 'PAGO_REPORTADO_VALIDO_PENDIENTE_CRUCE',
  HOLD: 'HOLD_REQUIERE_VALIDACION',
  PENDING: 'PENDIENTE_SEGUN_ASEGURADORA'
});

const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const amount = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const parsed = Number(text(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};
const date = value => {
  const raw = text(value);
  if (!raw) return '';
  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return raw.slice(0, 10);
};
const first = (row, keys) => {
  for (const key of keys) if (row && text(row[key])) return row[key];
  return '';
};
const policyKey = row => norm(first(row, ['polizaNumero', 'poliza', 'policyNumber', 'numeroPoliza'])) || text(first(row, ['polizaId', 'policyId']));
const currency = row => text(first(row, ['moneda', 'currency'])).toUpperCase();
const termKey = row => [policyKey(row), date(first(row, ['vigenciaInicio', 'termStart'])), date(first(row, ['vigenciaFin', 'termEnd'])), currency(row)].join('|');
const installment = row => {
  const raw = text(first(row, ['cuota', 'serie', 'installment', 'numeroCuota', 'diaPago']));
  const m = raw.match(/^(\d+)(?:\s*\/\s*\d+)?$/);
  return m ? Number(m[1]) : 0;
};
const hasConflict = row => /conflict|reversal|reversion|anulad|cancelad|rechaz|duplicad|moneda|vigencia/i.test([
  first(row, ['matchQuality', 'calidadMatch']), first(row, ['motivosCalidad', 'motivo', 'notes']), first(row, ['estado', 'status', 'decisionCRM'])
].map(text).join(' ')) || amount(first(row, ['primaNeta', 'monto', 'total'])) < 0;
const evidenceId = (type, row) => `${type}_${sha([policyKey(row), installment(row), date(first(row, ['fechaPago', 'fechaPagoReportada', 'fechaCorteFuente', 'periodo'])), amount(first(row, ['primaTotal', 'monto', 'primaNeta'])), currency(row)].join('|')).slice(0, 24)}`;

function directEvidence(row) {
  const label = norm(first(row, ['tipoFuente', 'sourceType', 'rolFuente', 'estado', 'status', 'decision']));
  const source = norm(first(row, ['archivo', 'sourceRef', 'file', 'fuenteAutoridad']));
  return /pago|cobro|ingreso|recaudo/.test(label + ' ' + source) && !!policyKey(row) && !hasConflict(row);
}

function commissionEvidence(row) {
  const decision = norm(first(row, ['estadoConciliacion', 'decisionCRM', 'decisionAdaptador', 'status']));
  const commission = amount(first(row, ['comisionAS', 'comisionNeta', 'comisionVenta', 'comisionCobro', 'commission']));
  return !!policyKey(row) && commission > 0 && !hasConflict(row) && !/incomplete|missing|hold source|omit zero/.test(decision);
}

function completePortfolioSnapshot(row) {
  const decision = norm(first(row, ['decision', 'rolFuente', 'sourceRole', 'completitud']));
  return /balance completo|autoridad saldo|pendiente emitido|complete/.test(decision) && !/proyectado incompleto|parcial/.test(decision);
}

export function inferReconciliation({ receipts = [], reportedPayments = [], insurerPayments = [], commissionRows = [], portfolioRows = [] } = {}) {
  const result = new Map();
  const byTerm = new Map();
  for (const receipt of receipts) {
    const key = termKey(receipt);
    if (!byTerm.has(key)) byTerm.set(key, []);
    byTerm.get(key).push(receipt);
    result.set(text(first(receipt, ['id', 'reciboId'])), {
      receiptId: text(first(receipt, ['id', 'reciboId'])),
      policyKey: policyKey(receipt),
      installment: installment(receipt),
      outcome: /pendiente|vencido|futuro/.test(norm(first(receipt, ['estadoOperativo', 'estado']))) ? OUTCOMES.PENDING : OUTCOMES.PLATFORM_REPORTED,
      confidence: 'PLATFORM', evidence: []
    });
  }
  for (const rows of byTerm.values()) rows.sort((a, b) => installment(a) - installment(b) || date(first(a, ['fechaLimite', 'vence'])).localeCompare(date(first(b, ['fechaLimite', 'vence']))));

  const matchReceipt = evidence => {
    const key = termKey(evidence);
    const candidates = byTerm.get(key) || [...byTerm.values()].flat().filter(r => policyKey(r) === policyKey(evidence) && (!currency(evidence) || currency(r) === currency(evidence)));
    const no = installment(evidence);
    if (no) return candidates.find(r => installment(r) === no) || null;
    const receiptNo = text(first(evidence, ['numeroReciboFuente', 'requerimiento', 'facturaRecibo', 'receiptNumber']));
    if (receiptNo) return candidates.find(r => text(first(r, ['numeroReciboFuente', 'requerimiento', 'facturaRecibo'])) === receiptNo) || null;
    const paidDate = date(first(evidence, ['fechaPago', 'fechaPagoReportada']));
    const paidAmount = amount(first(evidence, ['primaTotal', 'monto', 'primaNeta', 'total']));
    const exact = candidates.filter(r => (!paidAmount || Math.abs(amount(first(r, ['primaTotal', 'monto', 'primaNeta'])) - paidAmount) <= 0.02));
    return exact.length === 1 ? exact[0] : (paidDate && candidates.filter(r => date(first(r, ['fechaLimite', 'vence'])) <= paidDate).at(-1)) || null;
  };

  const apply = (receipt, outcome, confidence, evidenceType, evidence) => {
    if (!receipt || hasConflict(receipt) || hasConflict(evidence)) return false;
    const id = text(first(receipt, ['id', 'reciboId']));
    if (!id) return false;
    const current = result.get(id) || { receiptId: id, policyKey: policyKey(receipt), installment: installment(receipt), evidence: [] };
    const rank = { PLATFORM: 1, INFERRED_HIGH: 2, DIRECT: 3 };
    if ((rank[confidence] || 0) >= (rank[current.confidence] || 0)) {
      current.outcome = outcome;
      current.confidence = confidence;
    }
    current.evidence.push({ id: evidenceId(evidenceType, evidence), type: evidenceType, sourceDate: date(first(evidence, ['fechaPago', 'fechaPagoReportada', 'fechaCorteFuente', 'periodo'])) });
    result.set(id, current);
    return true;
  };

  for (const row of reportedPayments) {
    const receipt = matchReceipt(row);
    if (receipt) apply(receipt, OUTCOMES.PLATFORM_REPORTED, 'PLATFORM', 'PLATFORM_PAYMENT_REPORT', row);
  }
  for (const row of insurerPayments) {
    if (!directEvidence(row)) continue;
    const receipt = matchReceipt(row);
    if (receipt) apply(receipt, OUTCOMES.DIRECT, 'DIRECT', 'INSURER_PAYMENT', row);
  }
  for (const row of commissionRows) {
    if (!commissionEvidence(row)) continue;
    const receipt = matchReceipt(row);
    if (!receipt) continue;
    apply(receipt, OUTCOMES.COMMISSION, 'DIRECT', 'COMMISSION_RECOGNITION', row);
    const targetNo = installment(receipt);
    const schedule = byTerm.get(termKey(receipt)) || [];
    if (targetNo > 1 && schedule.length && !schedule.some(r => installment(r) > 0 && installment(r) < targetNo && hasConflict(r))) {
      schedule.filter(r => installment(r) > 0 && installment(r) < targetNo).forEach(r => apply(r, OUTCOMES.COMMISSION_SEQUENCE, 'INFERRED_HIGH', 'COMMISSION_SEQUENCE', row));
    }
  }

  const portfolioByTerm = new Map();
  for (const row of portfolioRows) {
    if (!completePortfolioSnapshot(row) || hasConflict(row)) continue;
    const key = termKey(row);
    if (!portfolioByTerm.has(key)) portfolioByTerm.set(key, []);
    portfolioByTerm.get(key).push(row);
  }
  for (const [key, pendingRows] of portfolioByTerm.entries()) {
    const schedule = byTerm.get(key) || [];
    if (!schedule.length) continue;
    const pendingNos = pendingRows.map(installment).filter(Boolean).sort((a, b) => a - b);
    if (!pendingNos.length) continue;
    const firstPending = pendingNos[0];
    const expectedPending = schedule.filter(r => installment(r) >= firstPending).map(installment).filter(Boolean);
    const continuous = expectedPending.every(no => pendingNos.includes(no));
    if (!continuous) continue;
    schedule.filter(r => installment(r) > 0 && installment(r) < firstPending && !hasConflict(r))
      .forEach(r => apply(r, OUTCOMES.PORTFOLIO_SEQUENCE, 'INFERRED_HIGH', 'PORTFOLIO_SEQUENCE', pendingRows[0]));
  }

  const rows = [...result.values()];
  const counts = rows.reduce((acc, row) => { acc[row.outcome] = (acc[row.outcome] || 0) + 1; return acc; }, {});
  return Object.freeze({ version: VERSION, rows, counts, writes: 0, operationalWrites: 0 });
}
