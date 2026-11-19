'use strict';
// I6.6: scalable preflight for the existing protected insurer-source write gate.
// This file does not write to Firestore. A protected writer must re-read exact
// preimages, compare fingerprints, and verify every postimage before PASS.
const crypto = require('node:crypto');

const MAX_CHUNK = 250;
const str = value => String(value == null ? '' : value).trim();
const norm = value => str(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
// El Roble prints 91-169567 while older canonical policy editions preserve
// 91-0169567. Only normalize this insurer's fixed-width numeric 91-XXXXXXX
// policy format; never normalize a requirement number or a different policy
// family, and never create a second edition from formatting alone.
const canonicalPolicyNumber = value => {
  const n = str(value).replace(/[\u2010-\u2015]/g,'-');
  const match = /^91-(\d{1,7})$/.exec(n);
  return match ? '91-'+match[1].padStart(7,'0') : n;
};
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Insurer-backed G&T exports may report 519815 while its issued PDF and
// canonical policy store AUTO-519815. Alias only for this verified insurer;
// require same tenant, insurer, effective policy edition and unique receipt.
const gytPolicy=insurer=>/(?:G&T|GYT)/.test(norm(insurer));
function policyKeys(number,insurer){
  const raw=str(number), keys=new Set([canonicalPolicyNumber(raw)]);
  if(gytPolicy(insurer)){
    const match=/^(?:AUTO\s*[- ]\s*)?(\d{3,10})$/i.exec(raw);
    if(match){
      const n=match[1];
      for(const label of [n,'AUTO-'+n,'AUTO '+n,'AUTO - '+n])keys.add(label);
    }
  }
  return [...keys].filter(Boolean);
}
function sameInsurerPolicyNumber(left,right,insurer){
  return policyKeys(left,insurer).some(k=>policyKeys(right,insurer).includes(k));
}

const isDate = value => /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(str(value)) &&
  new Date(str(value) + 'T00:00:00Z').toISOString().slice(0, 10) === str(value);
const moneyCents = value => value == null || value === '' || !Number.isFinite(+value) ? null : Math.round((+value + Number.EPSILON) * 100);
const sourceAliases = ['numeroReciboFuente', 'numeroReciboAseguradora', 'numeroRequerimiento', 'requerimiento',
  'numeroBoleta', 'sourceNumber', 'referenciaCobro', 'receiptNumber'];
const internal = value => !str(value) || /^rec_[a-f\d]{16,64}$/i.test(str(value)) || /^\d{1,2}\s*\/\s*\d{1,2}$/.test(str(value));
const grossAliasFields = ['monto', 'montoTotal'];
// Legacy gross aliases are safe to move only when each existing alias agrees
// exactly with its own side's previous primaTotal. A saldo/valor may instead
// represent a payment balance or a different component, so it still holds.
function comparableGrossAliases(receipt, cartera, receiptGrossCents, carteraGrossCents) {
  if ([receipt, cartera].some(x=>x.saldo!=null||x.valor!=null)) return null;
  const aliases={receipt:{},cartera:{}};
  for (const [name,record,expected] of [
    ['receipt',receipt,receiptGrossCents],['cartera',cartera,carteraGrossCents]]) {
    for (const field of grossAliasFields) {
      if (record[field] == null) continue;
      const cents=moneyCents(record[field]);
      if (cents == null || cents !== expected) return null;
      aliases[name][field]=cents;
    }
  }
  return aliases;
}
const preimageFingerprint = (receiptId, portfolioId, requirement, receiptGrossCents,
  carteraGrossCents, grossAliases={receipt:{},cartera:{}}) =>
  digest({receiptId, portfolioId, requirement, receiptGrossCents, carteraGrossCents,
    grossAliases});
// The operational grace deadline is not the insurer's contractual due date.
const dueOf = row => str(row.fechaVencimientoContractual || row.vence || row.fechaVencimiento);
// I6 installments imported as "N/12" are internal sequence labels, not
// insurer requirement numbers. The insurer's contractual date establishes
// the installment only when it exactly follows a complete annual schedule.
const internalSequence = value => {
  const m = /^(\d{1,2})\s*\/\s*12$/.exec(str(value));
  return m && +m[1] >= 1 && +m[1] <= 12 ? +m[1] : null;
};
function monthlySequence(policy, due) {
  if (norm(policy?.frecuencia) !== 'MENSUAL' || !isDate(policy?.vigenciaInicio) ||
    !isDate(policy?.vigenciaFin) || !isDate(due)) return null;
  const start = policy.vigenciaInicio;
  if (policy.vigenciaFin !== String(+start.slice(0,4)+1)+start.slice(4)) return null;
  const month = (+due.slice(0,4)-+start.slice(0,4))*12 +
    (+due.slice(5,7)-+start.slice(5,7));
  if (month < 0 || month >= 12) return null;
  const y = +start.slice(0,4)+Math.floor((+start.slice(5,7)-1+month)/12);
  const mo = ((+start.slice(5,7)-1+month)%12)+1;
  const day = Math.min(+start.slice(8,10),new Date(Date.UTC(y,mo,0)).getUTCDate());
  const expected = String(y).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+
    '-'+String(day).padStart(2,'0');
  return expected === due ? month+1 : null;
}
const completeMonthlySchedule = group => {
  if ((group.receipts || []).length !== 12) return false;
  const seqs = group.receipts.map(r => internalSequence(r.referenciaCuotaInterna || r.numeroReciboFuente));
  return seqs.every(Boolean) && new Set(seqs).size === 12;
};
const paid = row => !!row && (row.pagado === true || row.conciliadoPago === true || row.conciliado === true ||
  !!str(row.fechaPago || row.fechaPagoReportada || row.paidDate) || /^(PAGADO|PAID|CONCILIADO)$/i.test(str(row.estado)) ||
  /^PAID_/i.test(str(row.paymentState)) || /^APPLIED_/i.test(str(row.applicationState)));

function normalizeSource(raw) {
  const row = {
    caseId: str(raw.caseId), insurer: norm(raw.insurer), policy: str(raw.policy),
    requirement: str(raw.requirement), due: str(raw.due),
    installment: Number.isSafeInteger(Number(raw.installment)) ? Number(raw.installment) : null,
    grossCents: raw.grossCents, state: str(raw.state), sourceSha256: str(raw.sourceSha256).toLowerCase()
  };
  if (!row.caseId || !row.insurer || !row.policy || !row.requirement ||
    !isDate(row.due) || !Number.isSafeInteger(row.grossCents) || row.grossCents <= 0 ||
    !/^[a-f\d]{64}$/.test(row.sourceSha256) ||
    !['PENDING', 'PAID'].includes(row.state) ||
    (row.installment != null && (row.installment < 1 || row.installment > 120))) {
    return {error: 'INVALID_SOURCE_ROW', caseId: row.caseId};
  }
  return row;
}

function planSourceBatch(rawRows, policyGroups, options = {}) {
  if (!Array.isArray(rawRows) || !Array.isArray(policyGroups) || !rawRows.length || rawRows.length > 5000) {
    throw new RangeError('SOURCE_BATCH_SIZE_OR_SHAPE');
  }
  const chunkSize = options.chunkSize == null ? MAX_CHUNK : options.chunkSize;
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > MAX_CHUNK) {
    throw new RangeError('SOURCE_BATCH_CHUNK_LIMIT');
  }
  const ready = [], unchanged = [], exceptions = [], seenKeys = new Set(), seenTargets = new Set();
  const groupsByNumber = new Map();
  for (const group of policyGroups) {
    const keys=policyKeys(group?.policy?.numero,group?.insurerName||group?.policy?.aseguradoraNombre);
    for(const number of keys){
      if(!groupsByNumber.has(number))groupsByNumber.set(number,[]);
      if(!groupsByNumber.get(number).some(row=>String(row?.policy?.id)===String(group?.policy?.id)))
        groupsByNumber.get(number).push(group);
    }
  }
  for (const raw of rawRows) {
    const row = normalizeSource(raw);
    if (row.error) { exceptions.push({caseId: row.caseId, code: row.error}); continue; }
    const key = [row.insurer, row.policy, row.requirement].join('|');
    if (seenKeys.has(key)) { exceptions.push({caseId: row.caseId, code: 'DUPLICATED_SOURCE_REQUIREMENT'}); continue; }
    seenKeys.add(key);
    if (row.state === 'PAID') {
      exceptions.push({caseId: row.caseId, code: 'PAID_REQUIRES_COBRO_PROOF_AND_WRITER'});
      continue;
    }
    const candidateDocs=new Map(policyKeys(row.policy,row.insurer).flatMap(key=>groupsByNumber.get(key)||[]).map(g=>[g?.policy?.id,g]));
    const policyCandidates = [...candidateDocs.values()].filter(g => {
      const p = g.policy || {};
      return norm(g.insurerName || p.aseguradoraNombre).includes(row.insurer) &&
        norm(p.moneda) === 'GTQ' && norm(p.pais) === 'GT' &&
        isDate(p.vigenciaInicio) && isDate(p.vigenciaFin) &&
        // Renewal at the exact anniversary owns that day's new installment;
        // the preceding edition ends at its vigenciaFin (exclusive).
        p.vigenciaInicio <= row.due && p.vigenciaFin > row.due &&
        !/ANULADA|CANCELADA|SUSPENDIDA|DELETED/.test(norm(p.estado)) &&
        g.clientExists === true && g.insurerVerified === true;
    });
    if (policyCandidates.length !== 1) {
      exceptions.push({caseId: row.caseId, code: policyCandidates.length ? 'POLICY_EDITION_AMBIGUOUS' : 'POLICY_EDITION_MISSING'});
      continue;
    }
    const group = policyCandidates[0], p = group.policy;
    const monthlyIndex = monthlySequence(p,row.due);
    const eligibleSchedule = monthlyIndex != null && completeMonthlySchedule(group);
    const matches = (group.receipts || []).filter(r => {
      if (str(r.polizaId) !== str(p.id) || norm(r.moneda || p.moneda) !== 'GTQ') return false;
      const refs = sourceAliases.map(a => str(r[a])).filter(a => a && !internal(a));
      if (refs.some(ref => ref !== row.requirement)) return false;
      if (refs.includes(row.requirement)) return true;
      // A different requirement on the same policy is normal; select a unique
      // contractual due, or corroborate a unique installment sequence.
      return dueOf(r) === row.due ||
        row.installment != null && Number(r.secuencia || r.numeroCuota) === row.installment ||
        // The insurer's issued date also corrects a stale contractual date
        // stored on the exact numbered I6 installment (never fechaLimite).
        eligibleSchedule && internalSequence(r.numeroReciboFuente) === monthlyIndex;
    });
    if (matches.length !== 1) {
      exceptions.push({caseId: row.caseId, code: matches.length ? 'RECEIPT_AMBIGUOUS' : 'RECEIPT_NOT_IDENTIFIED'});
      continue;
    }
    const receipt = matches[0], rid = str(receipt.id);
    // The insurer requirement uniquely identifies the receipt inside this exact
    // policy edition. When its date changes, the insurer's due date wins;
    // an old system date is not a reason to suppress the correction.
    const exactInsurerRequirement = sourceAliases.some(a => str(receipt[a]) === row.requirement);
    const matchMethod = exactInsurerRequirement && dueOf(receipt)!==row.due ?
      'EXACT_INSURER_REQUIREMENT_DUE' :
      eligibleSchedule && dueOf(receipt)!==row.due &&
      internalSequence(receipt.numeroReciboFuente) === monthlyIndex ?
      'COMPLETE_MONTHLY_INSURER_DATE' : 'EXACT_CONTRACTUAL_OR_INSTALLMENT';
    if (!rid || seenTargets.has(rid)) {
      exceptions.push({caseId: row.caseId, code: 'RECEIPT_ASSIGNED_TWICE'}); continue;
    }
    const portfolio = (group.portfolio || []).filter(c => str(c.reciboId) === rid && c.carteraActiva !== false);
    if (portfolio.length !== 1 || !str(portfolio[0].id) || paid(receipt) || paid(portfolio[0]) ||
      (group.cobros || []).some(c => str(c.reciboId) === rid)) {
      exceptions.push({caseId: row.caseId, code: 'PAYMENT_OR_PORTFOLIO_EXCEPTION'}); continue;
    }
    const cartera = portfolio[0];
    if (str(cartera.polizaId || cartera.policyId) !== str(p.id) ||
      norm(cartera.moneda || p.moneda) !== 'GTQ' ||
      (cartera.clienteId && str(cartera.clienteId) !== str(p.clienteId)) ||
      sourceAliases.some(a => str(receipt[a]) && !internal(receipt[a]) && str(receipt[a]) !== row.requirement)) {
      exceptions.push({caseId: row.caseId, code: 'RELATION_OR_REFERENCE_CONFLICT'}); continue;
    }
    const beforeReceipt = moneyCents(receipt.primaTotal), beforeCartera = moneyCents(cartera.primaTotal);
    const oldGrossAliases=beforeReceipt==null||beforeCartera==null ? null :
      comparableGrossAliases(receipt,cartera,beforeReceipt,beforeCartera);
    if (beforeReceipt == null || beforeCartera == null || oldGrossAliases == null) {
      exceptions.push({caseId: row.caseId, code: 'GROSS_PREIMAGE_NOT_COMPARABLE'}); continue;
    }
    const existingRef = str(receipt.numeroReciboFuente);
    const record = {
      caseId: row.caseId, sourceKey: key, insurer: row.insurer, policy: row.policy, due: row.due,
      policyId: str(p.id), receiptId: rid, portfolioId: str(cartera.id),
      requirement: row.requirement, grossCents: row.grossCents,
      oldGrossCents: beforeReceipt,oldCarteraGrossCents:beforeCartera,oldGrossAliases,
      sourceSha256: row.sourceSha256,
      matchMethod,oldContractualDue:dueOf(receipt),
      oldOperationalLimit:str(receipt.fechaLimite),
      beforeFingerprint: preimageFingerprint(rid, cartera.id, existingRef, beforeReceipt,
        beforeCartera,oldGrossAliases),
    };
    seenTargets.add(rid);
    if (existingRef === row.requirement && dueOf(receipt) === row.due &&
      beforeReceipt === row.grossCents && beforeCartera === row.grossCents) unchanged.push(record);
    else ready.push(record);
  }
  const chunks = [];
  for (let i = 0; i < ready.length; i += chunkSize) {
    const rows = ready.slice(i, i + chunkSize);
    chunks.push({sequence: chunks.length + 1, count: rows.length,
      sourcePlanSha256: digest(rows.map(r => [r.caseId, r.sourceKey, r.receiptId, r.portfolioId,
        r.oldGrossCents, r.oldCarteraGrossCents, r.oldGrossAliases,
        r.grossCents, r.beforeFingerprint])), rows});
  }
  return {status: 'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES', inputRows: rawRows.length,
    readyCount: ready.length, unchangedCount: unchanged.length, exceptionCount: exceptions.length,
    chunks, unchanged, exceptions, writes: 0};
}

module.exports = {MAX_CHUNK, planSourceBatch, normalizeSource, moneyCents,
  preimageFingerprint, paid, internal, sourceAliases,monthlySequence,
  internalSequence,completeMonthlySchedule,canonicalPolicyNumber,policyKeys,sameInsurerPolicyNumber,
  grossAliasFields,comparableGrossAliases};
