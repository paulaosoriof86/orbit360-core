'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const src = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('new-policy advisor options are server-owned, scoped, and fail closed', () => {
  const bridge = src('orbit360-platform/modules/policy-receipts-v1199-bridge.js');
  const open = bridge.slice(bridge.indexOf('function openPolicyForm('), bridge.indexOf('function openVehicleForm('));
  assert.ok(open.includes('Orbit.assignableAdvisorRoster'));
  assert.ok(open.includes('service.list(country2, { force: true })'));
  assert.ok(open.includes('a.assignable === true') && open.includes('a.roleEligible === true'));
  assert.ok(open.includes('advisorRosterConfirmed = false') && open.includes('save.disabled = true'));
  assert.ok(open.includes('advisors.some(a => a.id === payload.asesorId)'));
  assert.ok(open.includes('refreshAdvisors(existing ? initialAdvisorId : (c.asesorId ||'));
  assert.ok(!open.includes("const advisors = S().all('asesores')"));
  assert.ok(!/Germ[aá]n|Priscila|Paula Osorio/.test(open), 'no advisor identity may be hardcoded');
});

test('invoice date is explicit, validated, persisted and read back with reconciliation', () => {
  const ui = src('orbit360-platform/modules/cobros.js');
  const backend = src('functions/cobros-reconciliation-domain.js');
  assert.ok(ui.includes('id="pm-invoice-date"') && ui.includes('id="cc-invoice-date"'));
  assert.match(ui, /invoiceDate:pm\.querySelector\('#pm-invoice-date'\)\.value/);
  assert.match(ui, /invoiceDate:pm\.querySelector\('#cc-invoice-date'\)\.value/);
  assert.match(backend, /const invoiceDate = isoDate\(payload\.invoiceDate \|\| payload\.fechaFactura, 'Fecha de factura', false\)/);
  assert.match(backend, /invoiceDate,\s*invoiceNumber, paymentMethod/);
  assert.match(backend, /if \(finalInvoiceDate\) shared\.invoiceDate = finalInvoiceDate/);
  assert.match(backend, /confirmedReceipt\.invoiceDate !== result\.invoiceDate/);
  assert.match(backend, /confirmedCobro\.applicationState !== result\.applicationState/);
  assert.match(ui, /Pago aplicado y conciliado con la aseguradora/);
  assert.match(ui, /La fecha de factura sola no acredita aplicación/);
  assert.ok(!/invoiceDate\s*\|\|\s*applicationDate/.test(backend), 'invoice issue date must not be inferred as insurer application date');
});

test('contractual expiry projects Vencida without mutating stored Firestore state', () => {
  const source = src('orbit360-platform/core/queries.js');
  const Orbit = { ui: { today: () => '2026-11-13' }, store: { get: () => null, all: () => [], where: () => [] } };
  const context = vm.createContext({ window: { Orbit }, Orbit, Date, console });
  vm.runInContext(source, context, { filename: 'core/queries.js' });
  const view = Orbit.q.policyDisplayStatus;
  const rural = { numero: 'VA125-00006571', estado: 'Vigente', vigenciaFin: '2026-11-03' };
  assert.equal(view(rural), 'Vencida');
  assert.equal(rural.estado, 'Vigente', 'stored state is immutable');
  assert.equal(view({ estado: 'Por renovar', vigenciaFin: '2026-11-12' }), 'Vencida');
  assert.equal(view({ estado: 'Vigente', vigenciaFin: '2026-11-13' }), 'Vigente');
  assert.equal(view({ estado: 'Vigente', vigenciaFin: '2026-12-01' }), 'Vigente');
  assert.equal(view({ estado: 'Renovada', vigenciaFin: '2026-11-03' }), 'Renovada');
  assert.equal(view({ estado: 'Cancelada', vigenciaFin: '2026-11-03' }), 'Cancelada');
  assert.equal(view({ estado: 'Vigente', vigenciaFin: '2026-02-31' }), 'Vigente', 'invalid dates are not silently guessed');
  assert.ok(src('orbit360-platform/modules/cliente360.js').includes('U.estadoBadge(q.policyDisplayStatus(p))'));
  assert.ok(src('orbit360-platform/modules/polizas.js').includes('U.estadoBadge(displayState(p))'));
});
