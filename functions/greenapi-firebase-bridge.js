'use strict';

// I6.6 backend QA candidate, NOT DEPLOYED. Every external action is OFF unless
// BOTH the deployment env and server-owned secret explicitly enable it.
// No Make dependency, no frontend credentials, no implicit backfill.
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { createGreenApiTransport } = require('./greenapi-direct-transport');
const { processOutbox, processWebhook } = require('./greenapi-outbox-core');

const VERSION = 'gravicentra-i66-greenapi-backend-v1-off-by-default';
const REGION = 'us-central1';
const TENANT = 'alianzas-soluciones';
const PAIS = 'GT';
const INSTANCE = '710522720868';
const GROUPS = Object.freeze({
  operations: '120363420665870658@g.us',
  payments: '120363421316253378@g.us'
});
const MAX_BODY_BYTES = 12000;
const GROUP_SEND_MIN_INTERVAL_MS = 60000;

const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const secretManager = new SecretManagerServiceClient();
const enabled = () => process.env.ORBIT360_GREENAPI_ENABLED === 'true';
const tenantRoot = () => db.collection('tenants').doc(TENANT);
const deliveries = () => tenantRoot().collection('greenapiExternalDeliveries');
const receiptIndex = () => tenantRoot().collection('greenapiDeliveryReceiptIndex');
const unmatched = () => tenantRoot().collection('greenapiUnmatchedReceipts');
const groupRate = () => tenantRoot().collection('greenapiGroupSendRate');
const asText = (v, max = 180) => String(v == null ? '' : v).trim().slice(0, max);
const validId = v => /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(asText(v));
const iso = ts => {
  const date = ts && typeof ts.toDate === 'function' ? ts.toDate() :
    ts instanceof Date ? ts : ts && typeof ts === 'string' ? new Date(ts) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : '';
};

async function readServerSecret() {
  const name = asText(process.env.ORBIT360_GREENAPI_GT_SECRET_VERSION, 300);
  if (!/^projects\/ays-orbit-360-lab\/secrets\/[A-Za-z0-9_-]{4,100}\/versions\/(latest|[0-9]+)$/.test(name)) {
    throw Error('GREENAPI_SECRET_VERSION_NOT_CONFIGURED');
  }
  let response;
  try { [response] = await secretManager.accessSecretVersion({ name }); }
  catch { throw Error('GREENAPI_SECRET_UNAVAILABLE'); }
  const raw = response && response.payload && response.payload.data ?
    Buffer.from(response.payload.data).toString('utf8') : '';
  if (!raw || Buffer.byteLength(raw) > 8000) throw Error('GREENAPI_SECRET_INVALID_SIZE');
  let secret;
  try { secret = JSON.parse(raw); }
  catch { throw Error('GREENAPI_SECRET_INVALID_JSON'); }
  if (!secret || secret.idInstance !== INSTANCE || secret.tenantId !== TENANT ||
      secret.pais !== PAIS || secret.transportEnabled !== true ||
      !/^[0-9]{8,15}@c\.us$/.test(asText(secret.senderWid))) {
    throw Error('GREENAPI_SECRET_SCOPE_NOT_APPROVED');
  }
  return secret;
}

async function eventContext(eventId, secret) {
  const outSnap = await tenantRoot().collection('notificationOutbox').doc(eventId).get();
  if (!outSnap.exists) return null;
  const row = outSnap.data() || {};
  const eventSource = asText(row.eventSource || 'workflow');
  if (row.tenantId !== TENANT || row.pais !== PAIS ||
      !['workflow', 'reconciliation'].includes(eventSource) ||
      !validId(row.entityType) || !validId(row.entityId)) return null;

  const sourceCollection = eventSource === 'reconciliation' ? 'reconciliationEvents' : 'workflowEvents';
  const eventSnap = await tenantRoot().collection(sourceCollection).doc(eventId).get();
  // Verify source entity country independently of the untrusted outbox label.
  const entitySnap = await tenantRoot().collection('data').doc(row.entityType)
    .collection('items').doc(row.entityId).get();
  if (!eventSnap.exists || !entitySnap.exists || asText((entitySnap.data() || {}).pais, 8).toUpperCase() !== PAIS) return null;
  const canonical = eventSnap.data() || {};
  if (canonical.tenantId !== TENANT || canonical.eventId !== eventId ||
      canonical.operation !== row.operation ||
      // Older reconciliation events omit pais; if supplied it must NOT
      // contradict the independently verified GT entity/canonical outbox.
      (canonical.pais != null && asText(canonical.pais, 8).toUpperCase() !== PAIS)) return null;
  if (eventSource === 'reconciliation' && row.operation === 'report_advisor_payment' &&
      (canonical.managementId !== row.entityId ||
       canonical.receiptId !== row.receiptId)) return null;

  const routeKey = asText(row.externalRouteKey);
  const chatId = GROUPS[routeKey];
  if (!chatId) return null; // No advisor groups configured in this first GT gate.

  const routeSettings = secret.routes && secret.routes[routeKey] || {};
  const editorial = secret.templates && secret.templates[routeKey] || {};
  return {
    outbox: row,
    event: { ...canonical, source: eventSource, pais: PAIS,
      occurredAt: iso(canonical.createdAt) },
    eventVerified: true,
    route: { tenantId: TENANT, pais: PAIS, routeKey, chatId, instanceId: INSTANCE,
      senderWid: secret.senderWid, active: routeSettings.enabled === true,
      verified: routeSettings.groupVerified === true,
      verificationReceipt: asText(routeSettings.verificationReceipt),
      allowedOperations: [].concat(routeSettings.allowedOperations || []) },
    policy: { enabled: secret.transportEnabled === true && enabled(),
      activationNotBefore: asText(secret.activationNotBefore, 60) },
    authorization: { groupApproved: routeSettings.groupApproved === true,
      optedOut: routeSettings.optedOut === true,
      receipt: asText(routeSettings.groupAuthorizationReceipt),
      approvedRouteKeys: [routeKey] },
    template: { approved: editorial.approved === true, id: asText(editorial.id),
      version: asText(editorial.version), message: asText(editorial.message, 950),
      approvedRouteKeys: [routeKey] }
  };
}

function firestoreRepo() {
  return {
    async claim(plan) {
      const ref = deliveries().doc(plan.deliveryId);
      const rateRef = groupRate().doc(`${PAIS}_${plan.routeKey}`);
      return db.runTransaction(async tx => {
        const [prior, rate] = await Promise.all([tx.get(ref), tx.get(rateRef)]);
        if (prior.exists) return false;
        const last = rate.exists && (rate.data() || {}).lastClaimAt;
        const previousMs = last && typeof last.toMillis === 'function' ? last.toMillis() :
          last instanceof Date ? last.getTime() : Number.isFinite(Date.parse(last)) ? Date.parse(last) : NaN;
        const nowMs = Date.now();
        if (Number.isFinite(previousMs) && nowMs - previousMs < GROUP_SEND_MIN_INTERVAL_MS) {
          tx.create(ref, { ...plan, status: 'held_group_rate_limit', transportVersion: VERSION,
            retryAllowed: false, createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp() });
          return { claimed: false, code: 'GROUP_RATE_LIMIT_HOLD' };
        }
        tx.create(ref, {
          ...plan, status: 'sending_lease', transportVersion: VERSION,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          retryAllowed: false, providerIdMessage: null
        });
        tx.set(rateRef, { tenantId: TENANT, pais: PAIS, routeKey: plan.routeKey,
          lastClaimAt: new Date(nowMs), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      });
    },
    async markAccepted(plan, idMessage, rid) {
      const ref = deliveries().doc(plan.deliveryId);
      const idx = receiptIndex().doc(rid);
      const early = unmatched().doc(rid);
      return db.runTransaction(async tx => {
        const [original, existingIndex, earlierStatus] = await Promise.all([tx.get(ref), tx.get(idx), tx.get(early)]);
        if (!original.exists || existingIndex.exists) throw Error('DELIVERY_ACK_MAPPING_CONFLICT');
        const before = original.data() || {};
        if (before.status !== 'sending_lease') throw Error('DELIVERY_CLAIM_CHANGED');
        const statusFromEarly = earlierStatus.exists ? asText((earlierStatus.data() || {}).status, 30) : '';
        const state = ['sent', 'delivered', 'read', 'failed', 'suspended'].includes(statusFromEarly) ? statusFromEarly : 'queued_provider';
        tx.create(idx, { tenantId: TENANT, pais: PAIS, deliveryId: plan.deliveryId,
          chatId: plan.chatId, instanceId: INSTANCE, idMessage,
          createdAt: FieldValue.serverTimestamp() });
        tx.update(ref, { status: state, providerIdMessage: idMessage,
          acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        if (earlierStatus.exists) tx.delete(early);
      });
    },
    async markUncertain(plan, code) {
      await deliveries().doc(plan.deliveryId).set({ status: 'send_uncertain',
        uncertainReason: asText(code, 80), retryAllowed: false,
        updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    },
    async applyProviderReceipt(rid, receipt) {
      const idx = receiptIndex().doc(rid), early = unmatched().doc(rid);
      return db.runTransaction(async tx => {
        const record = await tx.get(idx);
        if (!record.exists) {
          tx.set(early, { instanceId: receipt.instanceId, chatId: receipt.chatId,
            status: receipt.status, idMessage: receipt.idMessage,
            updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          return false;
        }
        const meta = record.data() || {};
        if (meta.tenantId !== TENANT || meta.pais !== PAIS ||
            meta.chatId !== receipt.chatId || meta.instanceId !== receipt.instanceId ||
            meta.idMessage !== receipt.idMessage || !validId(meta.deliveryId)) throw Error('RECEIPT_SCOPE_CONFLICT');
        const ref = deliveries().doc(meta.deliveryId);
        const d = await tx.get(ref);
        if (!d.exists) throw Error('RECEIPT_DELIVERY_MISSING');
        const previous = asText((d.data() || {}).status, 30);
        const rank = { queued_provider: 0, sent: 1, delivered: 2, read: 3, failed: -1, suspended: -1 };
        if (['failed', 'suspended'].includes(receipt.status) && rank[previous] >= 2) return true;
        if (rank[receipt.status] >= 0 && rank[previous] >= rank[receipt.status]) return true;
        tx.update(ref, { status: receipt.status, updatedAt: FieldValue.serverTimestamp() });
        return true;
      });
    }
  };
}

async function onOutboxUpdate(event) {
  if (!enabled()) return null;
  if (!event || !event.data || event.params.tenantId !== TENANT ||
      !validId(event.params.eventId)) return null;
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  if (after.status !== 'pending_connection' || before.status === after.status ||
      after.externalDeliveryAuthorized !== true ||
      ![].concat(after.externalChannelsPendingConnection || []).includes('whatsapp')) return null;
  let secret;
  try { secret = await readServerSecret(); }
  catch { return null; } // FAIL CLOSED without leaking secret details.
  const context = await eventContext(event.params.eventId, secret);
  if (!context) return null;
  try {
    const transport = createGreenApiTransport(secret);
    return processOutbox({ context, repo: firestoreRepo(), transport });
  } catch {
    return null; // Invalid provider configuration must not mutate the outbox.
  }
}

async function onStatusWebhook(req, res) {
  if (!enabled()) return res.status(503).send('disabled');
  if (req.method !== 'POST') return res.status(405).send('method');
  const bytes = Buffer.byteLength(JSON.stringify(req.body || {}));
  if (bytes < 2 || bytes > MAX_BODY_BYTES) return res.status(413).send('size');
  let secret;
  try { secret = await readServerSecret(); }
  catch { return res.status(503).send('not-ready'); }
  const result = await processWebhook({
    authorizationHeader: req.get('Authorization'),
    webhookSecret: secret.webhookBearerToken,
    body: req.body,
    expectedInstanceId: INSTANCE,
    expectedSenderWid: secret.senderWid,
    allowedGroups: Object.values(GROUPS),
    repo: firestoreRepo()
  });
  res.status(result.httpCode || 500).send(result.ok ? 'accepted' : result.code);
}

exports.orbit360GreenApiOutboxUpdated = onDocumentUpdated({
  document: 'tenants/{tenantId}/notificationOutbox/{eventId}',
  region: REGION,
  retry: false,
  memory: '256MiB'
}, onOutboxUpdate);

exports.orbit360GreenApiDeliveryStatus = onRequest({
  region: REGION, cors: false, timeoutSeconds: 30,
  memory: '256MiB', maxInstances: 2
}, onStatusWebhook);

exports.__greenApiQa = Object.freeze({ VERSION, TENANT, PAIS, INSTANCE, GROUPS,
  enabled, iso });
