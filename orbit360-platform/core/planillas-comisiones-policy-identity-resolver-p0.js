/* ============================================================
   Orbit 360 · Resolver puro de identidad de póliza P0
   - Sin acceso a Orbit.store, Firestore, navegador o red.
   - Combina número/alias, identidad del asegurado y calendario de recibos.
   - No selecciona vigencias por fecha de pago ni activa finanzas.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.Orbit = root.Orbit || {};
    root.Orbit.planillasComisionesPolicyIdentityResolver = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeKey(value) {
    return clean(value)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  function normalizeNameTokens(value) {
    const ignored = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'SOCIEDAD', 'ANONIMA', 'S', 'A']);
    return clean(value)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(token => token && !ignored.has(token));
  }

  function editDistance(a, b) {
    const left = clean(a);
    const right = clean(b);
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i++) {
      const current = [i];
      for (let j = 1; j <= right.length; j++) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
        );
      }
      for (let j = 0; j < current.length; j++) previous[j] = current[j];
    }
    return previous[right.length];
  }

  function tokenCompatible(sourceToken, policyToken) {
    if (sourceToken === policyToken) return true;
    const distance = editDistance(sourceToken, policyToken);
    if (distance <= 1) return true;
    return sourceToken.length >= 6 &&
      policyToken.length >= 6 &&
      sourceToken[0] === policyToken[0] &&
      sourceToken[sourceToken.length - 1] === policyToken[policyToken.length - 1] &&
      distance <= 2;
  }

  function nameCompatibility(sourceName, policyName) {
    const source = normalizeNameTokens(sourceName);
    const policy = normalizeNameTokens(policyName);
    if (!source.length || !policy.length) return Object.freeze({ compatible: false, subsetRatio: 0 });
    const used = new Set();
    let intersection = 0;
    source.forEach(sourceToken => {
      const index = policy.findIndex((policyToken, policyIndex) => !used.has(policyIndex) && tokenCompatible(sourceToken, policyToken));
      if (index >= 0) { used.add(index); intersection++; }
    });
    const subsetRatio = intersection / Math.min(source.length, policy.length);
    return Object.freeze({ compatible: subsetRatio >= 0.75, subsetRatio });
  }

  function toCents(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : null;
  }

  function amountMatches(receipt, amount, currency) {
    const target = Math.abs(toCents(amount));
    if (!Number.isFinite(target)) return false;
    const receiptCurrency = normalizeKey(receipt && receipt.currency);
    const sourceCurrency = normalizeKey(currency);
    if (receiptCurrency && sourceCurrency && receiptCurrency !== sourceCurrency) return false;
    return [receipt && receipt.netPremium, receipt && receipt.totalPremium]
      .map(toCents)
      .some(value => value === target);
  }

  function uniqueById(items) {
    const map = new Map();
    (items || []).forEach(item => {
      if (item && clean(item.id)) map.set(clean(item.id), item);
    });
    return Array.from(map.values());
  }

  function resolveRow(input) {
    const source = input && input.source || {};
    const policies = input && input.policies || [];
    const receipts = input && input.receipts || [];
    const aliasKeys = new Set((input && input.aliasKeys || [source.policyNumber]).map(normalizeKey).filter(Boolean));
    const groupedEvidence = input && input.groupedEvidence || null;
    const typoCandidates = uniqueById(input && input.canonicalTypoCandidates || []);
    const branchNormalizer = input && input.branchNormalizer || normalizeKey;
    const sourceKey = normalizeKey(source.policyNumber);

    if (groupedEvidence && groupedEvidence.uniquePolicy === true) {
      return Object.freeze({
        decision: 'HOLD_GROUPED_POLICY_DETAIL_REQUIRED',
        resolved: false,
        method: 'GROUP_SUM_RECEIPT_AMOUNT',
        candidateCount: Number(groupedEvidence.candidateCount || 0),
        writes: 0
      });
    }

    const candidates = uniqueById(policies.filter(policy => aliasKeys.has(normalizeKey(policy.policyNumber))));
    const compatible = candidates.filter(policy => nameCompatibility(source.insured, policy.insured).compatible);

    if (candidates.length === 1) {
      const policy = candidates[0];
      if (!nameCompatibility(source.insured, policy.insured).compatible) {
        return Object.freeze({ decision: 'HOLD_INSURED_CONFLICT', resolved: false, method: 'UNIQUE_NUMBER_NAME_CONFLICT', candidateCount: 1, writes: 0 });
      }
      const exact = normalizeKey(policy.policyNumber) === sourceKey;
      return Object.freeze({
        decision: exact ? 'RESOLVE_EXACT_UNIQUE' : 'RESOLVE_ALIAS_UNIQUE',
        resolved: true,
        method: exact ? 'EXACT_UNIQUE' : 'ALIAS_UNIQUE',
        policyId: clean(policy.id),
        candidateCount: 1,
        writes: 0
      });
    }

    if (candidates.length > 1) {
      if (!compatible.length) {
        return Object.freeze({ decision: 'HOLD_INSURED_CONFLICT', resolved: false, method: 'MULTIPLE_NUMBER_NAME_CONFLICT', candidateCount: candidates.length, writes: 0 });
      }
      const amountPolicies = uniqueById(compatible.filter(policy => receipts.some(receipt => clean(receipt.policyId) === clean(policy.id) && amountMatches(receipt, source.netPremium, source.currency))));
      if (amountPolicies.length === 1) {
        return Object.freeze({ decision: 'RESOLVE_RENEWAL_BY_RECEIPT_AMOUNT', resolved: true, method: 'RECEIPT_AMOUNT_EXACT_OR_REVERSAL', policyId: clean(amountPolicies[0].id), candidateCount: candidates.length, writes: 0 });
      }
      if (amountPolicies.length > 1) {
        return Object.freeze({ decision: 'HOLD_RECEIPT_AMOUNT_NON_UNIQUE', resolved: false, method: 'RECEIPT_AMOUNT_MULTIPLE_TERMS', candidateCount: candidates.length, amountCandidateCount: amountPolicies.length, writes: 0 });
      }
      return Object.freeze({ decision: 'HOLD_RENEWAL_AMBIGUITY_NO_RECEIPT_MATCH', resolved: false, method: 'RENEWAL_TERMS_WITHOUT_RECEIPT_EVIDENCE', candidateCount: candidates.length, writes: 0 });
    }

    if (typoCandidates.length === 1 && nameCompatibility(source.insured, typoCandidates[0].insured).compatible) {
      return Object.freeze({ decision: 'HOLD_CANONICAL_POLICY_NUMBER_TYPO', resolved: false, method: 'CANONICAL_TYPO_DIAGNOSTIC', candidateCount: 1, writes: 0 });
    }

    const sourceBranch = branchNormalizer(source.branch);
    const globalCandidates = uniqueById(policies.filter(policy => {
      if (!nameCompatibility(source.insured, policy.insured).compatible) return false;
      if (sourceBranch && branchNormalizer(policy.branch) && sourceBranch !== branchNormalizer(policy.branch)) return false;
      return receipts.some(receipt => clean(receipt.policyId) === clean(policy.id) && amountMatches(receipt, source.netPremium, source.currency));
    }));

    if (globalCandidates.length === 1) {
      return Object.freeze({ decision: 'RESOLVE_BY_INSURED_BRANCH_RECEIPT_AMOUNT', resolved: true, method: 'INSURED_BRANCH_RECEIPT_AMOUNT', policyId: clean(globalCandidates[0].id), candidateCount: 1, writes: 0 });
    }
    if (globalCandidates.length > 1) {
      return Object.freeze({ decision: 'HOLD_GLOBAL_IDENTITY_AMBIGUOUS', resolved: false, method: 'INSURED_BRANCH_RECEIPT_MULTIPLE_POLICIES', candidateCount: globalCandidates.length, writes: 0 });
    }
    return Object.freeze({ decision: 'HOLD_POLICY_NUMBER_UNMAPPED', resolved: false, method: 'NO_AUTHORITATIVE_IDENTITY', candidateCount: 0, writes: 0 });
  }

  function summarize(resolutions) {
    const decisions = {};
    let resolved = 0;
    (resolutions || []).forEach(item => {
      decisions[item.decision] = (decisions[item.decision] || 0) + 1;
      if (item.resolved === true) resolved++;
    });
    return Object.freeze({ total: (resolutions || []).length, resolved, holds: (resolutions || []).length - resolved, decisions: Object.freeze(decisions), writes: 0 });
  }

  return Object.freeze({
    schemaVersion: 'orbit360-planillas-comisiones-policy-identity-resolver-v1',
    clean,
    normalizeKey,
    normalizeNameTokens,
    nameCompatibility,
    toCents,
    amountMatches,
    resolveRow,
    summarize
  });
});
