'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { processOutbox, processWebhook, receiptId } = require('../functions/greenapi-outbox-core');
const { createGreenApiTransport, verifyBearerHeader, parseOutgoingStatus } = require('../functions/greenapi-direct-transport');

const GROUP_OPS = '120363420665870658@g.us';
const GROUP_PAY = '120363421316253378@g.us';
const WID = '50255550000@c.us';
const WHEN = '2026-11-10T16:00:30.000Z';
const SECRET = { apiUrl: 'https://api.green-api.com', idInstance: '710522720868', apiTokenInstance: 'qa_token_123456789012345' };

function context() {
  return {
    outbox: { tenantId: 'alianzas-soluciones', eventId: 'evt_qa_100', pais: 'GT',
      eventSource: 'reconciliation', operation: 'report_advisor_payment', externalRouteKey: 'operations',
      status: 'pending_connection', externalDeliveryAuthorized: true,
      externalChannelsPendingConnection: ['whatsapp'], asesorId: 'advisor_qa_1' },
    event: { tenantId: 'alianzas-soluciones', eventId: 'evt_qa_100', pais: 'GT',
      source: 'reconciliation', operation: 'report_advisor_payment', occurredAt: '2026-11-10T16:00:00.000Z' },
    eventVerified: true,
    route: { tenantId: 'alianzas-soluciones', pais: 'GT', routeKey: 'operations',
      chatId: GROUP_OPS, instanceId: SECRET.idInstance, senderWid: WID,
      verificationReceipt: 'qa_verified_group_20261110', verified: true, active: true,
      allowedOperations: ['report_advisor_payment'] },
    policy: { enabled: true, activationNotBefore: '2026-11-10T15:00:00.000Z' },
    authorization: { groupApproved: true, receipt: 'qa_group_staff_approval', approvedRouteKeys: ['operations'] },
    template: { id: 'ops_notice', version: 'v1', approved: true,
      approvedRouteKeys: ['operations'], message: 'Gravicentra Insurance: gestión pendiente de revisión en la plataforma.' }
  };
}

function transportFake(log) {
  return {
    async statusReadback() { log.push('state'); return { state: 'authorized', instanceId: SECRET.idInstance, wid: WID, checkedAt: '2026-11-10T16:00:00.000Z' }; },
    async sendGroupMessage(plan, message) { log.push(['send', plan.chatId, message]); return { acceptedByProvider: true, idMessage: 'idMessage_fake_12345678' }; }
  };
}
function repoFake(log) {
  const claimed = new Set();
  return {
    async claim(p) { if (claimed.has(p.deliveryId)) return false; claimed.add(p.deliveryId); log.push('claim'); return true; },
    async markAccepted(p, idMessage, rid) { log.push(['accepted', p.deliveryId, idMessage, rid]); },
    async markUncertain(p, reason) { log.push(['uncertain', p.deliveryId, reason]); }
  };
}

test('transport status and send use only injected fetch, never live network', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ path: new URL(url).pathname.split('/')[2], method: options.method });
    if (url.includes('/getStateInstance/')) return { ok: true, json: async () => ({ stateInstance: 'authorized' }) };
    if (url.includes('/getSettings/')) return { ok: true, json: async () => ({ wid: WID, webhookUrlToken: 'SHOULD_NOT_LEAK' }) };
    if (url.includes('/sendMessage/')) return { ok: true, json: async () => ({ idMessage: 'abcde1234567890' }) };
    throw Error('Unexpected injected fetch');
  };
  const t = createGreenApiTransport(SECRET, fakeFetch);
  const state = await t.statusReadback();
  assert.equal(state.wid, WID);
  assert.equal('webhookUrlToken' in state, false);
  const result = await t.sendGroupMessage({ ok: true, transport: 'greenapi', chatId: GROUP_OPS, instanceId: SECRET.idInstance }, 'QA approved test message');
  assert.equal(result.status, 'queued_provider');
  assert.deepEqual(calls.map(x => x.method), ['GET', 'GET', 'POST']);
});
test('transport rejects unapproved remote hosts and personal recipient', async () => {
  assert.throws(() => createGreenApiTransport({ ...SECRET, apiUrl: 'http://127.0.0.1' }, async () => ({})), /GREENAPI_ORIGIN_NOT_ALLOWLISTED/);
  await assert.rejects(() => createGreenApiTransport(SECRET, async () => ({ ok: true, json: async () => ({}) }))
    .sendGroupMessage({ ok: true, transport: 'greenapi', chatId: '50255550000@c.us', instanceId: SECRET.idInstance }, 'Test approved message'), /GREENAPI_SEND_CONTRACT_DENIED/);
});
test('core default OFF does not even inspect provider', async () => {
  const log = []; const c = context(); c.policy.enabled = false;
  const out = await processOutbox({ context: c, repo: repoFake(log), transport: transportFake(log), nowUtc: WHEN });
  assert.equal(out.code, 'TRANSPORT_DISABLED');
  assert.deepEqual(log, []);
});
test('core insists approved template before any provider read', async () => {
  const log = []; const c = context(); c.template.approved = false;
  const out = await processOutbox({ context: c, repo: repoFake(log), transport: transportFake(log), nowUtc: WHEN });
  assert.equal(out.code, 'MESSAGE_TEMPLATE_UNAPPROVED');
  assert.deepEqual(log, []);
});
test('core accepts provider once, then reuses exact claim without second send', async () => {
  const log = []; const repo = repoFake(log); const transport = transportFake(log);
  const first = await processOutbox({ context: context(), repo, transport, nowUtc: WHEN });
  const second = await processOutbox({ context: context(), repo, transport, nowUtc: WHEN });
  assert.equal(first.status, 'queued_provider');
  assert.equal(second.status, 'reused_claim');
  assert.equal(log.filter(x => Array.isArray(x) && x[0] === 'send').length, 1);
});
test('uncertain send never retries automatically', async () => {
  const log = []; const repo = repoFake(log); const transport = transportFake(log);
  transport.sendGroupMessage = async () => { throw Error('Simulated timeout'); };
  const first = await processOutbox({ context: context(), repo, transport, nowUtc: WHEN });
  const second = await processOutbox({ context: context(), repo, transport, nowUtc: WHEN });
  assert.equal(first.status, 'send_uncertain');
  assert.equal(second.status, 'reused_claim');
  assert.equal(log.filter(x => Array.isArray(x) && x[0] === 'uncertain').length, 1);
});
test('durable group throttle holds and does not send', async () => {
  const log = []; const repo = repoFake(log);
  repo.claim = async () => ({ claimed: false, code: 'GROUP_RATE_LIMIT_HOLD' });
  const out = await processOutbox({ context: context(), repo, transport: transportFake(log), nowUtc: WHEN });
  assert.equal(out.code, 'GROUP_RATE_LIMIT_HOLD'); assert.equal(out.sent, false);
  assert.equal(log.filter(x => Array.isArray(x) && x[0] === 'send').length, 0);
});
test('provider readback failure is HOLD without claim', async () => {
  const log = []; const transport = transportFake(log);
  transport.statusReadback = async () => { throw Error('Instance offline'); };
  const out = await processOutbox({ context: context(), repo: repoFake(log), transport, nowUtc: WHEN });
  assert.equal(out.code, 'SENDER_INSTANCE_STATUS_UNAVAILABLE');
  assert.deepEqual(log, []);
});
test('GreenAPI Bearer callback auth constant-time check', () => {
  const secret = 'qa_callback_token_1234567890123456789';
  assert.equal(verifyBearerHeader('Bearer ' + secret, secret), true);
  assert.equal(verifyBearerHeader('Bearer nope', secret), false);
  assert.equal(verifyBearerHeader('', secret), false);
});
test('GreenAPI callback parses only true outgoingMessageStatus payloads', () => {
  assert.equal(parseOutgoingStatus({ typeWebhook: 'incomingMessageReceived' }), null);
  assert.throws(() => parseOutgoingStatus({ typeWebhook: 'outgoingMessageStatus', chatId: GROUP_OPS }), /GREENAPI_WEBHOOK_STATUS_INVALID/);
});
test('callback validates tenant instance, group and provider status with fake repo', async () => {
  const secret = 'qa_callback_token_1234567890123456789';
  const body = { typeWebhook: 'outgoingMessageStatus', instanceData: { idInstance: SECRET.idInstance, wid: WID },
    chatId: GROUP_OPS, idMessage: 'idMessage_fake_12345678', status: 'delivered' };
  const seen = [];
  const repo = { async applyProviderReceipt(rid, s) { seen.push([rid,s.status]); return true; } };
  const args = { authorizationHeader: 'Bearer ' + secret, webhookSecret: secret, body,
    expectedInstanceId: SECRET.idInstance, expectedSenderWid: WID, allowedGroups: [GROUP_OPS, GROUP_PAY], repo };
  const out = await processWebhook(args);
  assert.equal(out.httpCode, 200); assert.equal(out.status, 'delivered');
  assert.equal(out.receiptId, receiptId(body.instanceData ? { instanceId: SECRET.idInstance, chatId: GROUP_OPS, idMessage: body.idMessage } : {}));
  assert.equal(seen.length, 1);
  assert.equal((await processWebhook({ ...args, expectedInstanceId: '7105251326' })).httpCode, 403);
  assert.equal((await processWebhook({ ...args, allowedGroups: [GROUP_PAY] })).httpCode, 403);
  assert.equal((await processWebhook({ ...args, authorizationHeader: 'Bearer bad' })).httpCode, 401);
});
test('unmatched callback does not falsely claim delivery', async () => {
  const secret = 'qa_callback_token_1234567890123456789';
  const body = { typeWebhook: 'outgoingMessageStatus', instanceData: { idInstance: SECRET.idInstance, wid: WID },
    chatId: GROUP_OPS, idMessage: 'idMessage_fake_12345678', status: 'read' };
  const out = await processWebhook({ authorizationHeader: 'Bearer ' + secret, webhookSecret: secret, body,
    expectedInstanceId: SECRET.idInstance, expectedSenderWid: WID, allowedGroups: [GROUP_OPS], repo: { async applyProviderReceipt() { return false; } } });
  assert.equal(out.httpCode, 202);
  assert.equal(out.code, 'UNMATCHED_PROVIDER_RECEIPT');
});
