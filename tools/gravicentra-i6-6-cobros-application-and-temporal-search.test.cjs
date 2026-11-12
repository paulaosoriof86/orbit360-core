'use strict';
// I6.6: isolated regression for the shared payment-application route, the
// dated read model, and the scoped global search. No credentials or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const load = file => fs.readFileSync(file, 'utf8');
const query = load('orbit360-platform/core/queries.js');
const cobros = load('orbit360-platform/modules/cobros.js');
const policies = load('orbit360-platform/modules/polizas.js');
const detail = load('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js');
const router = load('orbit360-platform/core/router.js');
const backend = load('functions/cobros-reconciliation-domain.js');
const referenceDay = Date.parse('2026-11-11T00:00:00Z');
const Orbit = {
  ui: {
    daysFromNow(date) { return Math.round((Date.parse(date + 'T00:00:00Z') - referenceDay) / 86400000); },
    finiteNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
  },
  store: { all() { return []; }, get() { return null; }, where() { return []; } }
};
vm.runInNewContext(query, { window: { Orbit }, Orbit });
const display = Orbit.q.expectedReceiptDisplayStatus;
const cases = [
  [{fechaLimite:'2026-10-21',estadoVisual:'Futuro',estadoOperativo:'Futuro'}, 'Vencido', 'OLD_FUTURE_BANTRAB'],
  [{fechaLimite:'2026-11-02',estadoVisual:'Futuro',estadoOperativo:'Futuro'}, 'Vencido', 'OLD_FUTURE_MAPFRE'],
  [{fechaLimite:'2026-11-21',estadoVisual:'Vencido'}, 'Futuro', 'LATER_DUE_NOT_OVERDUE'],
  [{fechaLimite:'2026-11-11',estadoVisual:'Futuro'}, 'Pendiente', 'DUE_TODAY_NOT_LATE'],
  [{fechaLimite:'2026-10-21',estado:'Pagado',estadoOperativo:'pago_reportado'}, 'Pago reportado', 'UNCONFIRMED_REPORT'],
  [{fechaLimite:'2026-10-21',estado:'Pagado',estadoOperativo:'pago_inferido'}, 'Pago inferido', 'INFERRED_PROVENANCE'],
  [{fechaLimite:'2026-10-21',estado:'Pagado',paymentState:'PAID_DIRECT'}, 'Pagado', 'DIRECT_PAID'],
  [{fechaLimite:'2026-10-21',estado:'Cancelada'}, 'Cancelada', 'CANCELLED_NO_AGING'],
  [{fechaLimite:'2026-11-40',estadoVisual:'Futuro'}, 'Futuro', 'INVALID_DATE_NO_INVENTION']
];
for (const [row, expected, label] of cases) assert.equal(display(row), expected, label);
assert.match(policies,/q\.expectedReceiptDisplayStatus\s*\?\s*q\.expectedReceiptDisplayStatus\(c\)/,'POLICY_BREAKDOWN_OWNER');
assert.match(detail,/Orbit\.q\.expectedReceiptDisplayStatus\(r\)/,'CLIENT_POLICY_DETAIL_OWNER');
assert.match(cobros,/const origin='insurer_invoice';/,'APPLICATION_IS_ENRICHMENT_NOT_SECOND_CRM_PAYMENT');
assert.doesNotMatch(cobros,/const origin=paymentOriginKind\(receipt\) === 'CRM_DIRECT' \? 'crm_migrated_direct'/,'CRM_DUPLICATE_PAYMENT_PATH_REMOVED');
assert.match(backend,/const legacyPaidReceiptReconciliation = !existingCobro && receiptPaid && operationName === 'reconcile_payment';/,'LEGACY_PAID_RECEIPT_CAN_ENRICH_NOT_REAPPLY');
assert.match(backend,/const enrichment = applicationEvidenceSource && \(cobroPaid \|\| legacyPaidReceiptReconciliation\)/,'SERVER_ENRICHMENT_ONLY_FOR_EXISTING_PAID_EVIDENCE');
assert.match(backend,/PAYMENT_RECEIPT_COBRO_STATE_CONFLICT/,'CONFLICTING_LINKED_PAYMENT_STATES_FAIL_CLOSED');
assert.match(backend,/PAYMENT_DETERMINISTIC_COBRO_ID_CONFLICT/,'HISTORIC_RELINK_ID_COLLISION_FAIL_CLOSED');
assert.match(backend,/existingPaymentState === 'PAID_INFERRED' \|\| existingDirectOrInferred === 'INFERRED'/,'APPLICATION_ENRICHMENT_PRESERVES_INFERRED_PROVENANCE');
assert.match(backend,/if \(existingPaid && !enrichment\) throw/,'SERVER_DUPLICATE_PAID_GUARD_PRESERVED');
assert.match(cobros,/const feedback=paymentFailureFeedback\(error\);[\s\S]*?btn\.disabled=feedback\.uncertain/,'APPLICATION_ERROR_TRUTH_AND_RETRY_GUARD');
assert.match(cobros,/esta pantalla conserva los datos/,'APPLICATION_FAILURE_PRESERVES_FIELDS');
assert.match(router,/const indexedCollections = new Set\(\['clientes','polizas','vehiculos','cobros','aseguradoras','asesores'\]\)/,'GLOBAL_SEARCH_RELEVANT_COLLECTIONS_ONLY');
assert.match(router,/const term = normalized\(query\.trim\(\)\)/,'GLOBAL_SEARCH_ACCENT_FOLD_BOTH_SIDES');
console.log('I66_COBROS_APPLICATION_TEMPORAL_SEARCH_TRANSVERSAL_PASS');
