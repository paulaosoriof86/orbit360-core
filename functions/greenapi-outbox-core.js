'use strict';

// Dependency-injected QA-safe state machine. The Firestore adapter owns
// transactional claims; the GreenAPI transport owns the actual network call.
// No module import or test can send a message by itself.
const { createHash } = require('node:crypto');
const { planGroupDelivery } = require('./greenapi-delivery-plan');
const { verifyBearerHeader, parseOutgoingStatus } = require('./greenapi-direct-transport');

const sha = data => createHash('sha256').update(String(data)).digest('hex');
const receiptId = ({ instanceId, chatId, idMessage }) => `gar_${sha([instanceId, chatId, idMessage].join('|')).slice(0, 40)}`;

async function processOutbox({ context, repo, transport, nowUtc }) {
  if (!context || !context.policy || context.policy.enabled !== true) {
    return { ok: false, status: 'hold', code: 'TRANSPORT_DISABLED' };
  }
  if (!repo || typeof repo.claim !== 'function' || typeof repo.markUncertain !== 'function' ||
      typeof repo.markAccepted !== 'function' || !transport ||
      typeof transport.statusReadback !== 'function' || typeof transport.sendGroupMessage !== 'function') {
    return { ok: false, status: 'hold', code: 'BACKEND_DEPENDENCY_INCOMPLETE' };
  }

  // Guard from a server-owned secret/config; rejects unapproved free-text and
  // avoids any network request when the message/template is not approved.
  if (!context.template || context.template.approved !== true ||
      typeof context.template.message !== 'string' ||
      context.template.message.trim().length < 12 ||
      context.template.message.length > 950) {
    return { ok: false, status: 'hold', code: 'MESSAGE_TEMPLATE_UNAPPROVED' };
  }

  let instanceStatus;
  try { instanceStatus = await transport.statusReadback(); }
  catch { return { ok: false, status: 'hold', code: 'SENDER_INSTANCE_STATUS_UNAVAILABLE' }; }

  const plan = planGroupDelivery({ ...context, instanceStatus, nowUtc });
  if (!plan.ok) return plan;

  // The repository implementation MUST claim with Firestore create/transaction
  // on this deterministic ID, returning false for existing claims; never send
  // inside a Firestore transaction.
  const claimed = await repo.claim(plan);
  if (claimed && typeof claimed === 'object' && claimed.claimed === false) {
    return { ok: false, status: 'hold', code: claimed.code || 'RATE_LIMIT_HOLD',
      deliveryId: plan.deliveryId, sent: false };
  }
  if (!claimed) return { ok: true, status: 'reused_claim', deliveryId: plan.deliveryId, sent: false };

  try {
    const result = await transport.sendGroupMessage(plan, context.template.message);
    if (!result || result.acceptedByProvider !== true || !result.idMessage) {
      await repo.markUncertain(plan, 'PROVIDER_ACCEPTANCE_UNVERIFIED');
      return { ok: false, status: 'send_uncertain', deliveryId: plan.deliveryId };
    }
    await repo.markAccepted(plan, result.idMessage, receiptId({ ...plan, idMessage: result.idMessage }));
    return { ok: true, status: 'queued_provider', deliveryId: plan.deliveryId, sent: true };
  } catch {
    // A failed/timeout response may arrive AFTER provider acceptance. No blind
    // retry; operator/journal reconciliation is required before a new attempt.
    await repo.markUncertain(plan, 'PROVIDER_SEND_OUTCOME_UNCERTAIN');
    return { ok: false, status: 'send_uncertain', deliveryId: plan.deliveryId };
  }
}

async function processWebhook({ authorizationHeader, webhookSecret, body, expectedInstanceId,
  expectedSenderWid, allowedGroups, repo }) {
  if (!verifyBearerHeader(authorizationHeader, webhookSecret))
    return { ok: false, httpCode: 401, code: 'INVALID_WEBHOOK_AUTH' };
  let status;
  try { status = parseOutgoingStatus(body); }
  catch { return { ok: false, httpCode: 400, code: 'BAD_WEBHOOK_PAYLOAD' }; }
  if (!status) return { ok: true, httpCode: 204, ignored: true };
  if (status.instanceId !== String(expectedInstanceId || '') ||
      status.wid !== String(expectedSenderWid || '') ||
      !new Set([].concat(allowedGroups || [])).has(status.chatId)) {
    return { ok: false, httpCode: 403, code: 'WEBHOOK_DESTINATION_SCOPE_MISMATCH' };
  }
  if (!repo || typeof repo.applyProviderReceipt !== 'function')
    return { ok: false, httpCode: 503, code: 'RECEIPT_REPOSITORY_UNAVAILABLE' };
  const refId = receiptId(status);
  const applied = await repo.applyProviderReceipt(refId, status);
  // Unmatched callbacks must be retained by an external reconciler or retried
  // by the provider; never declare them delivered if no original claim exists.
  if (!applied) return { ok: false, httpCode: 202, code: 'UNMATCHED_PROVIDER_RECEIPT' };
  return { ok: true, httpCode: 200, status: status.status, receiptId: refId };
}

module.exports = Object.freeze({ processOutbox, processWebhook, receiptId });
