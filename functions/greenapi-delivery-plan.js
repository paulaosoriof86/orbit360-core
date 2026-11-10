'use strict';

// I6.6 GreenAPI QA scaffold. This module deliberately has NO HTTP, secrets,
// Firebase trigger, scheduled job, or client-facing export. It cannot send.
// A later server-only dispatcher must verify event and outbox documents in a
// transaction before invoking this pure planning contract.
const { createHash } = require('node:crypto');

const VERSION = 'gravicentra-greenapi-group-delivery-plan-v1-qa-off';
const ROUTE_KEYS = new Set(['operations', 'payments', 'advisor']);
const GROUP_ID = /^(?:[0-9]{10,}-[0-9]{5,}|[0-9]{15,})@g\.us$/;
const SENDER_WID = /^[0-9]{8,15}@c\.us$/;
const SUPPORTED_COUNTRIES = new Set(['GT', 'CO']);
const MAX_ID = 180;

const val = (v, max = MAX_ID) => String(v == null ? '' : v).trim().slice(0, max);
const norm = v => val(v, 80).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const country = v => val(v, 8).toUpperCase();
const id = v => /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(val(v));
const ms = v => {
  if (!v || typeof v !== 'string') return NaN;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : NaN;
};
const sha = v => createHash('sha256').update(v).digest('hex');
const hold = code => Object.freeze({ ok: false, status: 'hold', code, version: VERSION });

/**
 * Prepare a deterministic, non-sensitive delivery descriptor; NEVER sends.
 * This contract accepts ONLY group destinations. Direct client/advisor phone
 * messaging requires a separate consent/template-reviewed channel contract.
 *
 * Required caller guarantees:
 * - eventVerified confirms the outbox and canonical event were read together
 *   from server-authoritative Firestore references.
 * - route is loaded from a server-owned, tenant+country-scoped allowlist.
 * - instanceStatus is a fresh trusted GetStateInstance/GetSettings readback.
 * - policy is server-owned and defaults disabled.
 */
function planGroupDelivery({ outbox, event, eventVerified = false, route, policy, instanceStatus, authorization, template, nowUtc } = {}) {
  if (!policy || policy.enabled !== true) return hold('TRANSPORT_DISABLED');
  if (!outbox || !event || eventVerified !== true) return hold('CANONICAL_EVENT_UNVERIFIED');

  const tenantId = val(outbox.tenantId);
  const eventId = val(outbox.eventId);
  const pais = country(outbox.pais);
  const operation = norm(outbox.operation);
  const routeKey = norm(outbox.externalRouteKey);
  if (!id(tenantId) || !id(eventId) || !SUPPORTED_COUNTRIES.has(pais)) return hold('TENANT_COUNTRY_EVENT_INVALID');
  if (!ROUTE_KEYS.has(routeKey)) return hold('ROUTE_UNSUPPORTED');

  const expectedEventSource = norm(outbox.eventSource || 'workflow');
  if (!['workflow', 'reconciliation'].includes(expectedEventSource) ||
      val(event.tenantId) !== tenantId || val(event.eventId) !== eventId ||
      country(event.pais) !== pais || norm(event.operation) !== operation ||
      norm(event.source || expectedEventSource) !== expectedEventSource) {
    return hold('EVENT_OUTBOX_SCOPE_MISMATCH');
  }

  // Explicit, current-business authorization is required; connecting the
  // provider must NEVER replay old outbox rows by default.
  if (outbox.externalDeliveryAuthorized !== true) return hold('EVENT_EXTERNAL_OPT_IN_MISSING');
  if (!['pending_connection', 'pending_external'].includes(val(outbox.status))) return hold('OUTBOX_NOT_PENDING');
  if (!Array.isArray(outbox.externalChannelsPendingConnection) ||
      !outbox.externalChannelsPendingConnection.map(norm).includes('whatsapp')) {
    return hold('WHATSAPP_NOT_REQUESTED');
  }
  const eventAt = ms(event.occurredAt);
  const activationAt = ms(policy.activationNotBefore);
  if (!Number.isFinite(eventAt) || !Number.isFinite(activationAt) || eventAt < activationAt) {
    return hold('BACKLOG_OR_CUTOFF_UNVERIFIED');
  }

  if (!route || route.active !== true || val(route.tenantId) !== tenantId ||
      country(route.pais) !== pais || norm(route.routeKey) !== routeKey ||
      !GROUP_ID.test(val(route.chatId)) || !SENDER_WID.test(val(route.senderWid))) {
    return hold('GROUP_ALLOWLIST_MISMATCH');
  }
  if (route.verified !== true || !id(route.verificationReceipt)) return hold('GROUP_NOT_VERIFIED');
  if (!Array.isArray(route.allowedOperations) || !route.allowedOperations.map(norm).includes(operation)) {
    return hold('OPERATION_NOT_APPROVED_FOR_GROUP');
  }
  if (routeKey === 'advisor') {
    if (!id(outbox.asesorId) || val(route.advisorId) !== val(outbox.asesorId)) {
      return hold('ADVISOR_GROUP_MISMATCH');
    }
  }

  // A payment report is a REQUEST, never an applied collection. Payments
  // group messages require evidence of a committed application event.
  if (operation === 'report_advisor_payment' && routeKey !== 'operations') {
    return hold('REPORTED_PAYMENT_NOT_APPLIED');
  }
  if (routeKey === 'payments' && (event.paymentAppliedConfirmed !== true ||
      event.paymentLedgerCommitted !== true)) return hold('PAYMENT_APPLICATION_UNVERIFIED');

  const verifiedAt = ms(instanceStatus && instanceStatus.checkedAt);
  const nowAt = nowUtc ? ms(nowUtc) : Date.now();
  if (!instanceStatus || norm(instanceStatus.state) !== 'authorized' ||
      val(instanceStatus.wid) !== val(route.senderWid) ||
      val(instanceStatus.instanceId) !== val(route.instanceId) ||
      !id(instanceStatus.instanceId) || !Number.isFinite(verifiedAt) ||
      !Number.isFinite(nowAt) || verifiedAt > nowAt + 10000 ||
      nowAt - verifiedAt > 60000) return hold('SENDER_INSTANCE_NOT_VERIFIED');
  if (authorization && authorization.optedOut === true) return hold('GROUP_OPTED_OUT');
  if (!authorization || authorization.groupApproved !== true ||
      !id(authorization.receipt) ||
      ![].concat(authorization.approvedRouteKeys || []).map(norm).includes(routeKey)) {
    return hold('GROUP_AUTHORIZATION_MISSING');
  }
  if (!template || template.approved !== true || !id(template.id) ||
      !id(template.version) ||
      ![].concat(template.approvedRouteKeys || []).map(norm).includes(routeKey)) {
    return hold('MESSAGE_TEMPLATE_UNAPPROVED');
  }

  // Idempotency belongs to the business event + channel + exact destination,
  // NOT the editorial template. A template change must never resend an event.
  const deliveryId = `gaw_${sha([tenantId, pais, eventId, 'whatsapp',
    routeKey, val(route.chatId), val(route.instanceId)].join('|')).slice(0, 32)}`;
  return Object.freeze({
    ok: true,
    status: 'ready_for_future_server_dispatch',
    version: VERSION,
    deliveryId,
    tenantId,
    pais,
    eventId,
    operation,
    routeKey,
    chatId: val(route.chatId),
    instanceId: val(route.instanceId),
    senderWid: val(route.senderWid),
    templateId: val(template.id),
    templateVersion: val(template.version),
    transport: 'greenapi',
    requiresDeliveryReceipt: true
  });
}

module.exports = Object.freeze({ VERSION, planGroupDelivery });
