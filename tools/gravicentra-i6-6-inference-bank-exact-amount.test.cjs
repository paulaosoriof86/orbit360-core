'use strict';
// Pure synthetic fixtures. No Firebase, credentials, network or business writes.
const assert = require('node:assert/strict');
const {planEvidence} = require('../functions/payment-inference-engine');
const base = () => ({
  policy: {id:'qa_policy',moneda:'GTQ'},
  receipts: [{id:'qa_receipt',polizaId:'qa_policy',cuota:'1/1',moneda:'GTQ',monto:100,vence:'2026-11-01'}],
  evidence: {evidenceType:'BANK_STATEMENT_MATCH',evidenceId:'qa_bank_row',receiptId:'qa_receipt',currency:'GTQ',amount:100,uniqueMatch:true},
  reconciliationConfig: {autoCommitHighConfidence:true,requireSameCurrency:true}
});
let checks = 0;
const review = (patch, code) => {
  const input = base(); patch(input); const out = planEvidence(input);
  assert.equal(out.autoCommit,false,code); assert.equal(out.status,'REVIEW_REQUIRED',code);
  if (code) assert.equal(out.reason,code); checks++;
};
review(x=>{x.evidence.amount=999;},'BANK_AMOUNT_RECEIPT_MISMATCH');
review(x=>{delete x.evidence.amount;},'BANK_AMOUNT_REQUIRED');
review(x=>{x.evidence.amount=0;},'BANK_AMOUNT_REQUIRED');
review(x=>{x.evidence.amount=-100;},'BANK_AMOUNT_REQUIRED');
review(x=>{x.evidence.amount='100invalid';},'BANK_AMOUNT_REQUIRED');
review(x=>{x.evidence.amount=100.001;},'BANK_AMOUNT_PRECISION_INVALID');
review(x=>{delete x.receipts[0].monto;},'BANK_RECEIPT_AMOUNT_REQUIRED');
review(x=>{delete x.evidence.currency;},'BANK_CURRENCY_REQUIRED');
review(x=>{x.receipts[0].moneda='USD';},'BANK_RECEIPT_CURRENCY_MISMATCH');
review(x=>{x.evidence.currency='USD';},'CURRENCY_MISMATCH');
review(x=>{x.evidence.uniqueMatch=false;},'MATCH_NOT_UNIQUE');
review(x=>{x.evidence.partialPayment=true;},'EVIDENCE_CONTRADICTION');
review(x=>{x.evidence.reversal=true;},'EVIDENCE_CONTRADICTION');
const exact = planEvidence(base()); assert.equal(exact.autoCommit,true); assert.equal(exact.targets.length,1); checks++;
const cent = base(); cent.evidence.amount=100.25; cent.receipts[0].monto=100.25;
assert.equal(planEvidence(cent).autoCommit,true); checks++;
// A commission figure is NOT the premium due: do not apply bank amount rules to it.
const commission = base(); commission.evidence.evidenceType='COMMISSION_STATEMENT_INSTALLMENT_N'; commission.evidence.amount=12.5;
assert.equal(planEvidence(commission).autoCommit,true); checks++;
const statement = base(); statement.evidence.evidenceType='INSURER_STATEMENT_PENDING_FROM_N'; statement.evidence.amount=999;
assert.equal(planEvidence(statement).autoCommit,true); checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'BANK_EXACT_AMOUNT_CURRENCY_ONLY',businessWrites:0}));
