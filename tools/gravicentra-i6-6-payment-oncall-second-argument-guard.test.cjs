'use strict';
// Regression: Firebase onCall may pass CallableResponse as handler argument #2.
// The domain's internal second argument is a boolean Preview flag and must
// never receive that object for the production or LAB payment endpoints.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../functions/cobros-reconciliation-domain.js'), 'utf8');
const start = source.indexOf('exports.orbit360CobrosReconciliationCommand = onCall(');
assert.ok(start > 0, 'PAYMENT_PRODUCTION_CALLABLE_ENTRYPOINT_MISSING');
const lines = source.slice(start).split('\n').filter(line => line.startsWith('exports.orbit360CobrosReconciliationCommand'));
assert.equal(lines.length, 3, 'PAYMENT_THREE_CALLABLE_ENTRYPOINTS_REQUIRED');
const calls = { count: 0 };
const sandbox = {
  exports: {},
  REGION: 'us-central1',
  onCall: (_options, handler) => handler,
  execute: (_request, previewOnly) => {
    calls.count += 1;
    assert.equal(typeof previewOnly, 'boolean', 'PAYMENT_EXECUTE_MODE_MUST_BE_EXPLICIT_BOOLEAN');
    return previewOnly;
  },
  executePreview: () => true
};
vm.runInNewContext(lines.join('\n'), sandbox);
const response = { sendChunk: async () => true, signal: {} };
const request = { data: { operation: 'apply_payment' } };
assert.equal(sandbox.exports.orbit360CobrosReconciliationCommand(request, response), false,
  'PAYMENT_LIVE_MUST_NEVER_ENTER_PREVIEW_MODE_FROM_FIREBASE_RESPONSE');
assert.equal(sandbox.exports.orbit360CobrosReconciliationCommandPreview(request, response), true,
  'PAYMENT_PREVIEW_MUST_RETAIN_SYNTHETIC_GUARD');
assert.equal(sandbox.exports.orbit360CobrosReconciliationCommandLabV20260804(request, response), false,
  'PAYMENT_LAB_COMPAT_MUST_NOT_ENTER_PREVIEW_MODE_FROM_FIREBASE_RESPONSE');
assert.equal(calls.count, 2);
console.log('I66_PAYMENT_SECOND_CALLABLE_RESPONSE_ARGUMENT_ISOLATED_REGRESSION_PASS');
