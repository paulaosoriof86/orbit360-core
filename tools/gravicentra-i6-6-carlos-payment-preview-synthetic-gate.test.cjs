'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const provider=fs.readFileSync(path.join(root,'orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const marker='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze';
assert.equal(provider.split(marker).length,2,'CANONICAL_PRODUCT_PROVIDER_REQUIRED');
const hostname='ays-orbit-360-lab--gi-i66-rc-43299843267-qispe7e9.web.app';
const win={location:{hostname},Orbit:{}};
vm.runInNewContext(provider.replace(marker,'window.__paymentPreviewGate=i66ReadOnlyCallableError;'+marker),
  {window:win,location:win.location,console},{timeout:2000});
const gate=win.__paymentPreviewGate;
const name='orbit360CobrosReconciliationCommandPreview';
const call=(operation,id='b3005qa_i66_payment_safe_01',tenantId='alianzas-soluciones')=>({tenantId,operation,
  payload:{receiptId:id,polizaId:id},activeRole:'operativo'});
for(const op of ['preview_policy','apply_payment','reconcile_payment'])
  assert.equal(gate(name,call(op),'us-central1'),'','Payment synthetic Preview allowed: '+op);
for(const op of ['report_advisor_payment','confirm_application','reconcile_evidence','register_evidence'])
  assert.equal(gate(name,call(op),'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED','Other payment Preview mutation denied: '+op);
for(const target of ['rec_issued_client','b3005qa-invalid','', 'b4003qa_other'])
  assert.equal(gate(name,call('apply_payment',target),'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');
assert.equal(gate(name,call('apply_payment','b3005qa_i66_payment_safe_01','another-tenant'),'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');
assert.equal(gate(name,call('apply_payment'),'us-east1'),'I66_PREVIEW_REGION_DENIED');
assert.equal(gate('orbit360CobrosReconciliationCommand',call('apply_payment'),'us-central1'),'I66_PREVIEW_REGION_DENIED');
const backend=fs.readFileSync(path.join(root,'functions/cobros-reconciliation-domain.js'),'utf8');
for(const required of [
  'PREVIEW_PAYMENT_TENANT_DENIED','PREVIEW_PAYMENT_SYNTHETIC_POLICY_REQUIRED',
  'PREVIEW_PAYMENT_SYNTHETIC_RELATION_REQUIRED','PREVIEW_PAYMENT_SYNTHETIC_CLIENT_REQUIRED',
  'PREVIEW_PAYMENT_SYNTHETIC_LEDGER_REQUIRED','previewReconciliationRequests',
  'previewReconciliationEvents','applyPayment(authz, data, payload, \'apply_payment\', previewOnly)',
  "'reconcile_payment', previewOnly",'if (previewOnly) cobro.__syntheticQa = true;'
])assert.ok(backend.includes(required),'Server synthetic preview guard missing: '+required);
assert.ok(/if \(previewOnly\) \{[\s\S]*?receipt\.__syntheticQa !== true[\s\S]*?policy\.__syntheticQa !== true/.test(backend));
assert.ok(/if \(previewOnly && \(portfolioSnap\.docs\.some/.test(backend));
console.log('I66_CARLOS_PAYMENT_PREVIEW_REGION_AND_SYNTHETIC_LEDGER_GATES_PASS transport_cases=16 backend_markers=10');
