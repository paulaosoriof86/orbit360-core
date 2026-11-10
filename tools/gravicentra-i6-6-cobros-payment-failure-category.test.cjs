'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const target = process.env.GI_I66_COBROS_SOURCE || path.join(__dirname, '..', 'orbit360-platform', 'modules', 'cobros.js');
const source = fs.readFileSync(target, 'utf8');
const anchor = '  function paymentFailureFeedback(error) {';
const next = '  /* ---- Registrar pago por el owner canónico: pago y aplicación son hechos distintos ---- */';
const start = source.indexOf(anchor);
const end = source.indexOf(next, start);
if (start < 0 || end <= start) throw new Error('PAYMENT_FAILURE_HELPER_MISSING');
const helper = new Function(source.slice(start, end) + '\nreturn paymentFailureFeedback;')();

test('script compiles and retains canonical callable applyPayment once', () => {
  new vm.Script(source, { filename: 'cobros.js' });
  assert.match(source, /domain\.applyPayment\(receipt\.id,\{payload:\{/);
  assert.equal((source.match(/function paymentFailureFeedback\(error\)/g) || []).length, 1);
});

test('Firebase permission denied is known failure without arbitrary server text', () => {
  const out = helper({ code: 'functions/permission-denied', message: 'SECRET SERVER MESSAGE' });
  assert.equal(out.code, 'permission-denied');
  assert.equal(out.uncertain, false);
  assert.match(out.message, /rol o país/);
  assert.doesNotMatch(JSON.stringify(out), /SECRET/);
});

test('Firestore post-commit readback data-loss is uncertain, never assert no save', () => {
  const out = helper({ code: 'functions/data-loss', message: 'raw backend error' });
  assert.equal(out.code, 'data-loss');
  assert.equal(out.uncertain, true);
  assert.match(out.message, /no pudo confirmar/);
});

test('network and timeout errors must request readback before retrying', () => {
  for (const code of ['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal']) {
    assert.equal(helper({ code }).uncertain, true, code);
  }
});

test('unknown and malformed errors are sanitized, fail closed and disclose no raw details', () => {
  const out = helper({ code: 'functions/some-fault/../../private', message: 'secret token' });
  assert.equal(out.code, 'unknown');
  assert.equal(out.uncertain, true);
  assert.doesNotMatch(JSON.stringify(out), /private|token/);
});

test('known local domain availability failures are identifiable before a write', () => {
  const out = helper(new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE'));
  assert.equal(out.code, 'backend-not-active');
  assert.equal(out.uncertain, false);
  assert.match(out.message, /servicio de cobros/);
  assert.equal(helper(new Error('PAYMENT_DOMAIN_UNAVAILABLE')).code, 'payment-domain-unavailable');
});

test('request ID is sanitized and bounded for Ops support', () => {
  const out = helper({ code: 'functions/failed-precondition', gravicentraPayment: { requestId: 'recui_A?1/../SECRET' } });
  assert.equal(out.code, 'failed-precondition');
  assert.equal(out.uncertain, false);
  assert.match(out.requestId, /^[A-Za-z0-9_-]{1,45}$/);
  assert.doesNotMatch(out.requestId, /[?/.]/);
});

test('catch displays status with category, request reference, and no unqualified no-save claim', () => {
  assert.match(source, /const feedback = paymentFailureFeedback\(error\)/);
  assert.match(source, /feedback\.uncertain[\s\S]*Resultado no confirmado\./);
  assert.match(source, /feedback\.requestId \? ' · Ref\. '/);
  assert.doesNotMatch(source, /No fue posible registrar el pago\. No se guardaron cambios\./);
});
