/* ============================================================
   Orbit 360 · Resolver puro de relación planilla–recibo P0
   - Sin acceso a Orbit.store, Firestore, navegador o red.
   - Prioriza referencias fuertes y usa prima neta solo como fallback.
   - Nunca selecciona recibos por fecha de pago de la comisión.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.Orbit = root.Orbit || {};
    root.Orbit.planillasComisionesReceiptLinkResolver = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalizeKey(value) {
    return clean(value).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
  }
  function toCents(value) {
    const number=Number(value);
    return Number.isFinite(number)?Math.round(number*100):null;
  }
  function uniqueById(items) {
    const map=new Map();
    (items||[]).forEach(item=>{if(item&&clean(item.id))map.set(clean(item.id),item);});
    return Array.from(map.values());
  }
  function sourceReferences(source) {
    return new Set([
      source && source.requirement,
      source && source.invoiceReference,
      source && source.incomeRelation,
      source && source.series,
      source && source.extraReference
    ].map(normalizeKey).filter(Boolean));
  }
  function receiptReferences(receipt) {
    return new Set([
      receipt && receipt.series,
      receipt && receipt.endorsement,
      receipt && receipt.sourceReceiptNumber,
      receipt && receipt.sourceReference
    ].map(normalizeKey).filter(Boolean));
  }
  function intersects(left,right){for(const value of left)if(right.has(value))return true;return false;}
  function amountMatches(receipt,amount,currency){
    const target=Math.abs(toCents(amount));
    if(!Number.isFinite(target))return false;
    const sourceCurrency=normalizeKey(currency),receiptCurrency=normalizeKey(receipt&&receipt.currency);
    if(sourceCurrency&&receiptCurrency&&sourceCurrency!==receiptCurrency)return false;
    return [receipt&&receipt.netPremium,receipt&&receipt.totalPremium].map(toCents).some(value=>value===target);
  }
  function resolveReceipt(input){
    const source=input&&input.source||{};
    const policyId=clean(input&&input.policyId);
    const related=uniqueById((input&&input.receipts||[]).filter(receipt=>clean(receipt.policyId)===policyId));
    if(!policyId)return Object.freeze({decision:'HOLD_POLICY_IDENTITY_REQUIRED',resolved:false,relatedCount:0,writes:0});
    if(!related.length)return Object.freeze({decision:'HOLD_RECEIPT_NOT_FOUND',resolved:false,relatedCount:0,writes:0});
    const sourceRefs=sourceReferences(source);
    if(sourceRefs.size){
      const referenceMatches=uniqueById(related.filter(receipt=>intersects(sourceRefs,receiptReferences(receipt))));
      if(referenceMatches.length===1)return Object.freeze({decision:'RESOLVE_RECEIPT_BY_REFERENCE',resolved:true,receiptId:clean(referenceMatches[0].id),relatedCount:related.length,writes:0});
      if(referenceMatches.length>1)return Object.freeze({decision:'HOLD_RECEIPT_REFERENCE_AMBIGUOUS',resolved:false,relatedCount:related.length,candidateCount:referenceMatches.length,writes:0});
    }
    const amountMatchesList=uniqueById(related.filter(receipt=>amountMatches(receipt,source.netPremium,source.currency)));
    if(amountMatchesList.length===1)return Object.freeze({decision:'RESOLVE_RECEIPT_BY_NET_PREMIUM',resolved:true,receiptId:clean(amountMatchesList[0].id),relatedCount:related.length,writes:0});
    if(amountMatchesList.length>1)return Object.freeze({decision:'HOLD_RECEIPT_AMOUNT_AMBIGUOUS',resolved:false,relatedCount:related.length,candidateCount:amountMatchesList.length,writes:0});
    return Object.freeze({decision:'HOLD_RECEIPT_NOT_FOUND',resolved:false,relatedCount:related.length,writes:0});
  }
  function summarize(resolutions){
    const decisions={};let resolved=0;
    (resolutions||[]).forEach(item=>{decisions[item.decision]=(decisions[item.decision]||0)+1;if(item.resolved===true)resolved++;});
    return Object.freeze({total:(resolutions||[]).length,resolved,holds:(resolutions||[]).length-resolved,decisions:Object.freeze(decisions),writes:0});
  }
  return Object.freeze({schemaVersion:'orbit360-planillas-comisiones-receipt-link-resolver-v1',clean,normalizeKey,toCents,sourceReferences,receiptReferences,amountMatches,resolveReceipt,summarize});
});
