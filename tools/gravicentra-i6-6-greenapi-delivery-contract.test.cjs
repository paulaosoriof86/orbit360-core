'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { planGroupDelivery, VERSION } = require('../functions/greenapi-delivery-plan.js');

const EVENT_TIME = '2026-11-10T16:00:00.000Z';
const ACTIVATED = '2026-11-10T15:00:00.000Z';
const GROUP_OPS = '120363043968066561@g.us';
const SENDER = '50255550000@c.us';

const base = () => ({
  outbox: {
    tenantId: 'alianzas-soluciones', eventId: 'evt_test_001', pais: 'GT',
    eventSource: 'reconciliation', operation: 'report_advisor_payment',
    status: 'pending_connection', externalDeliveryAuthorized: true,
    externalChannelsPendingConnection: ['whatsapp'], externalRouteKey: 'operations',
    asesorId: 'asesor_test_001'
  },
  event: {
    source: 'reconciliation', tenantId: 'alianzas-soluciones',
    eventId: 'evt_test_001', pais: 'GT', operation: 'report_advisor_payment',
    occurredAt: EVENT_TIME
  },
  eventVerified: true,
  route: {
    tenantId: 'alianzas-soluciones', pais: 'GT', routeKey: 'operations',
    chatId: GROUP_OPS, instanceId: '1100123456', senderWid: SENDER,
    verificationReceipt: 'qa_group_receipt_20261110', verified: true,
    active: true, allowedOperations: ['report_advisor_payment']
  },
  policy: { enabled: true, activationNotBefore: ACTIVATED },
  instanceStatus: { state: 'authorized', instanceId: '1100123456', wid: SENDER, checkedAt: EVENT_TIME },
  nowUtc: '2026-11-10T16:00:30.000Z',
  authorization: { groupApproved: true, receipt: 'qa_staff_consent_001', approvedRouteKeys: ['operations'] },
  template: { approved: true, id: 'ops_action_required', version: 'v1', approvedRouteKeys: ['operations'] }
});

function expectsHold(changed, expected) {
  const data = base();
  changed(data);
  const out = planGroupDelivery(data);
  assert.equal(out.ok, false);
  assert.equal(out.code, expected);
}

test('transport OFF by default, no backend transport imported', () => {
  const data = base(); delete data.policy;
  assert.equal(planGroupDelivery(data).code, 'TRANSPORT_DISABLED');
  assert.equal(VERSION.endsWith('-qa-off'), true);
});
test('canonical event required; no forged notifications', () => {
  expectsHold(d => { d.eventVerified = false; }, 'CANONICAL_EVENT_UNVERIFIED');
});
test('cross tenant is fail closed', () => {
  expectsHold(d => { d.event.tenantId = 'otro-tenant'; }, 'EVENT_OUTBOX_SCOPE_MISMATCH');
});
test('cross country GT to CO is fail closed', () => {
  expectsHold(d => { d.event.pais = 'CO'; }, 'EVENT_OUTBOX_SCOPE_MISMATCH');
  expectsHold(d => { d.route.pais = 'CO'; }, 'GROUP_ALLOWLIST_MISMATCH');
});
test('cross event and operation fail closed', () => {
  expectsHold(d => { d.event.eventId = 'evt_different'; }, 'EVENT_OUTBOX_SCOPE_MISMATCH');
  expectsHold(d => { d.event.operation = 'cobro_aplicado'; }, 'EVENT_OUTBOX_SCOPE_MISMATCH');
});
test('non-GT/CO broad country TODOS fails closed', () => {
  expectsHold(d => { d.outbox.pais = 'TODOS'; }, 'TENANT_COUNTRY_EVENT_INVALID');
});
test('explicit fresh external opt-in is mandatory', () => {
  expectsHold(d => { delete d.outbox.externalDeliveryAuthorized; }, 'EVENT_EXTERNAL_OPT_IN_MISSING');
});
test('old statuses cannot silently dispatch', () => {
  expectsHold(d => { d.outbox.status = 'delivered_internal'; }, 'OUTBOX_NOT_PENDING');
});
test('only explicitly requested WhatsApp channel is eligible', () => {
  expectsHold(d => { d.outbox.externalChannelsPendingConnection = ['email']; }, 'WHATSAPP_NOT_REQUESTED');
});
test('no historical backlog after provider activation', () => {
  expectsHold(d => { d.event.occurredAt = '2026-09-01T00:00:00.000Z'; }, 'BACKLOG_OR_CUTOFF_UNVERIFIED');
  expectsHold(d => { delete d.event.occurredAt; }, 'BACKLOG_OR_CUTOFF_UNVERIFIED');
});
test('group ID must be exact provider @g.us, never name', () => {
  expectsHold(d => { d.route.chatId = 'AyS Operaciones'; }, 'GROUP_ALLOWLIST_MISMATCH');
  expectsHold(d => { d.route.chatId = '50255550000@c.us'; }, 'GROUP_ALLOWLIST_MISMATCH');
});
test('group verification receipt required', () => {
  expectsHold(d => { d.route.verified = false; }, 'GROUP_NOT_VERIFIED');
});
test('event operation must be approved for this exact group', () => {
  expectsHold(d => { d.route.allowedOperations = ['create_business']; }, 'OPERATION_NOT_APPROVED_FOR_GROUP');
});
test('payment report must never route as applied payment', () => {
  const d = base();
  d.outbox.externalRouteKey = 'payments';
  d.route.routeKey = 'payments';
  d.route.allowedOperations = ['report_advisor_payment'];
  d.authorization.approvedRouteKeys = ['payments'];
  d.template.approvedRouteKeys = ['payments'];
  assert.equal(planGroupDelivery(d).code, 'REPORTED_PAYMENT_NOT_APPLIED');
});
test('applied payment requires both canonical application proofs', () => {
  const d = base();
  d.outbox.operation = 'cobro_aplicado'; d.event.operation = 'cobro_aplicado';
  d.outbox.externalRouteKey = 'payments'; d.route.routeKey = 'payments';
  d.route.allowedOperations = ['cobro_aplicado'];
  d.authorization.approvedRouteKeys = ['payments'];
  d.template.approvedRouteKeys = ['payments'];
  assert.equal(planGroupDelivery(d).code, 'PAYMENT_APPLICATION_UNVERIFIED');
  d.event.paymentAppliedConfirmed = true;
  assert.equal(planGroupDelivery(d).code, 'PAYMENT_APPLICATION_UNVERIFIED');
  d.event.paymentLedgerCommitted = true;
  assert.equal(planGroupDelivery(d).ok, true);
});
test('advisor-specific group must match actual advisor', () => {
  const d = base();
  d.outbox.externalRouteKey = 'advisor'; d.route.routeKey = 'advisor';
  d.route.allowedOperations = ['report_advisor_payment'];
  d.authorization.approvedRouteKeys = ['advisor'];
  d.template.approvedRouteKeys = ['advisor'];
  d.route.advisorId = 'wrong_advisor';
  assert.equal(planGroupDelivery(d).code, 'ADVISOR_GROUP_MISMATCH');
});
test('instance must be currently authorized and exact sender', () => {
  expectsHold(d => { d.instanceStatus.state = 'notAuthorized'; }, 'SENDER_INSTANCE_NOT_VERIFIED');
  expectsHold(d => { d.instanceStatus.wid = '50299990000@c.us'; }, 'SENDER_INSTANCE_NOT_VERIFIED');
  expectsHold(d => { d.instanceStatus.instanceId = '987654321'; }, 'SENDER_INSTANCE_NOT_VERIFIED');
  expectsHold(d => { d.instanceStatus.checkedAt = '2026-11-10T15:30:00.000Z'; }, 'SENDER_INSTANCE_NOT_VERIFIED');
});
test('staff group authorization and approved template required', () => {
  expectsHold(d => { d.authorization.groupApproved = false; }, 'GROUP_AUTHORIZATION_MISSING');
  expectsHold(d => { d.authorization.optedOut = true; }, 'GROUP_OPTED_OUT');
  expectsHold(d => { d.template.approved = false; }, 'MESSAGE_TEMPLATE_UNAPPROVED');
});
test('stable delivery identity dedupes retries and template revisions for same business event', () => {
  const d = base(); const one = planGroupDelivery(d);
  assert.equal(one.ok, true); assert.match(one.deliveryId, /^gaw_[a-f0-9]{32}$/);
  assert.deepEqual(one, planGroupDelivery(d));
  d.template.version = 'v2';
  assert.equal(planGroupDelivery(d).deliveryId, one.deliveryId);
  d.template.id = 'another_approved_template';
  assert.equal(planGroupDelivery(d).deliveryId, one.deliveryId);
});
test('group plan is metadata-only; never contains message or credentials', () => {
  const one = planGroupDelivery(base());
  assert.equal(one.ok, true);
  assert.deepEqual(Object.keys(one).filter(k => /token|secret|message|body|password/i.test(k)), []);
  assert.equal(one.transport, 'greenapi');
  assert.equal(one.requiresDeliveryReceipt, true);
});
