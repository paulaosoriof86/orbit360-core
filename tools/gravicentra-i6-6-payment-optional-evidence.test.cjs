'use strict';
// I6.6 business-critical direct-payment/optional-document boundary.
// Static contract test; signed Preview/LIVE remains mandatory before PASS.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
const begin=source.indexOf('  function aplicarPago(cobroId)');
const end=source.indexOf('\n  function kpi(kind)',begin);
assert.ok(begin>=0&&end>begin,'canonical apply-payment modal missing');
const handler=source.slice(begin,end);
for(const term of [
  "sourceType:'manual'", "paidDate:pm.querySelector('#pm-paid')",
  "applicationDate:pm.querySelector('#pm-app')",
  "invoiceDate:pm.querySelector('#pm-invoice-date')",
  "invoiceNumber:pm.querySelector('#pm-invoice-number')",
  "invoiceDocumentRef:invoiceRef","paymentSupportDocumentRef:supportRef",
  "await Promise.allSettled([", "paymentResult+cartera+documentaryHold",
  "PAYMENT_OPTIONAL_DOCUMENT_UPLOAD_HOLD", "applied.portfolioUpdated===true",
  "No se guardó:", "No es un pago pendiente."
]) {
  if(!handler.includes(term.toLowerCase()==='no es un pago pendiente.'?'no es un pago pendiente.':term))
    assert.fail('PAYMENT_DIRECT_OPTIONAL_DOCUMENT_CONTRACT_MISSING: '+term);
}
assert.ok(handler.indexOf('await Promise.allSettled([')<handler.indexOf('await domain.applyPayment('));
assert.ok(!handler.includes("U.toast(docsOk ? (reconciled ? '✓ Pago aplicado y conciliado con la aseguradora'"));
assert.ok(!handler.includes('if(docsOk&&avisar&&Orbit.notify'));
const insurerDirect=handler.includes("reconciled=!!(applied&&/^APPLIED_/.test(String(applied.applicationState||'')))");
assert.ok(insurerDirect,'single-operation insurer application result missing');
console.log('I66_DIRECT_PAYMENT_OPTIONAL_DOCUMENT_NO_BLOCK_SOURCE_CONTRACT_PASS; signed runtime readback still required');
