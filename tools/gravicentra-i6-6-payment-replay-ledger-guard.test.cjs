'use strict';
// I6.6 financial write-path invariant: no second paid event or orphan paid receipt.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('functions/cobros-reconciliation-domain.js','utf8');
const fn=src.slice(src.indexOf('async function applyPayment('),src.indexOf('\nfunction evidenceOrigin('));
assert(fn.includes("assertPaymentCountryScope(authz, policy, receipt);"),'signed country before writes');
assert(fn.includes("PAYMENT_ALREADY_APPLIED"),'new request for already paid receipt fail closed');
assert(fn.includes("PAYMENT_ACTIVE_PORTFOLIO_REQUIRED"),'no standalone paid receipt outside active cartera');
assert(fn.indexOf("PAYMENT_ALREADY_APPLIED")<fn.indexOf("tx.set(cobroRef, cobro"),'repeat guard precedes writes');
assert(fn.indexOf("PAYMENT_ACTIVE_PORTFOLIO_REQUIRED")<fn.indexOf("tx.set(receiptRef, receiptPatch"),'portfolio guard precedes writes');
assert(fn.includes("['insurer_invoice', 'insurer_statement', 'commission_statement']"),'keep insurer reconciliation enrichment');
assert(fn.includes("status === 'committed'"),'same ID idempotent readback preserved');
console.log('I66_PAYMENT_REPLAY_AND_ACTIVE_PORTFOLIO_WRITE_GUARD_PASS');
