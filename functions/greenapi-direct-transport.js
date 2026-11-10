'use strict';

// Server-only GreenAPI adapter. Nothing in this file executes HTTP on import.
// API credentials must come from a server-side secret, never a browser pref.
const crypto = require('node:crypto');

const GROUP_ID = /^(?:[0-9]{10,}-[0-9]{5,}|[0-9]{15,})@g\.us$/;
const INSTANCE_ID = /^[0-9]{6,16}$/;
const WID = /^[0-9]{8,15}@c\.us$/;
const STATUS_TYPES = new Set(['sent', 'delivered', 'read', 'failed', 'suspended']);

class SafeTransportError extends Error {
  constructor(code) { super(code); this.name = 'SafeTransportError'; this.code = code; }
}

function baseUrl(value) {
  let url;
  try { url = new URL(String(value || '')); }
  catch { throw new SafeTransportError('GREENAPI_ORIGIN_INVALID'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      (host !== 'green-api.com' && host !== 'greenapi.com' &&
      !host.endsWith('.green-api.com') && !host.endsWith('.greenapi.com'))) {
    throw new SafeTransportError('GREENAPI_ORIGIN_NOT_ALLOWLISTED');
  }
  return url.origin;
}

function validateSecret(secret) {
  if (!secret || !INSTANCE_ID.test(String(secret.idInstance || '')) ||
      !/^[A-Za-z0-9_-]{8,256}$/.test(String(secret.apiTokenInstance || ''))) {
    throw new SafeTransportError('GREENAPI_SERVER_SECRET_INVALID');
  }
  return { apiUrl: baseUrl(secret.apiUrl), idInstance: String(secret.idInstance), apiTokenInstance: String(secret.apiTokenInstance) };
}

function createGreenApiTransport(secret, fetchImpl) {
  const cfg = validateSecret(secret);
  const request = fetchImpl || globalThis.fetch;
  if (typeof request !== 'function') throw new SafeTransportError('GREENAPI_HTTP_UNAVAILABLE');

  async function api(method, path, body) {
    const endpoint = `${cfg.apiUrl}/waInstance${cfg.idInstance}/${path}/${cfg.apiTokenInstance}`;
    let response;
    try {
      response = await request(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
        redirect: 'error'
      });
    } catch {
      // The provider may have accepted a send before network failure.
      throw new SafeTransportError('GREENAPI_NETWORK_OUTCOME_UNCERTAIN');
    }
    if (!response || !response.ok) {
      const n = Number(response && response.status);
      if (n === 429) throw new SafeTransportError('GREENAPI_RATE_LIMIT');
      if (n === 401 || n === 403) throw new SafeTransportError('GREENAPI_AUTH_DENIED');
      throw new SafeTransportError('GREENAPI_PROVIDER_ERROR');
    }
    try { return await response.json(); }
    catch { throw new SafeTransportError('GREENAPI_PROVIDER_JSON_INVALID'); }
  }

  async function statusReadback() {
    const state = await api('GET', 'getStateInstance');
    const settings = await api('GET', 'getSettings');
    if (!state || state.stateInstance !== 'authorized' || !WID.test(String(settings && settings.wid || ''))) {
      throw new SafeTransportError('GREENAPI_INSTANCE_NOT_READY');
    }
    return Object.freeze({ state: state.stateInstance, instanceId: cfg.idInstance,
      wid: String(settings.wid), checkedAt: new Date().toISOString() });
  }

  async function sendGroupMessage(plan, approvedMessage) {
    if (!plan || plan.ok !== true || plan.transport !== 'greenapi' ||
        !GROUP_ID.test(String(plan.chatId || '')) ||
        String(plan.instanceId || '') !== cfg.idInstance ||
        typeof approvedMessage !== 'string' || !approvedMessage.trim() ||
        approvedMessage.length > 950) throw new SafeTransportError('GREENAPI_SEND_CONTRACT_DENIED');
    const result = await api('POST', 'sendMessage', {
      chatId: plan.chatId,
      message: approvedMessage,
      linkPreview: false
    });
    const idMessage = String(result && result.idMessage || '');
    if (!/^[A-Za-z0-9_-]{8,150}$/.test(idMessage)) throw new SafeTransportError('GREENAPI_ACCEPTANCE_UNCERTAIN');
    return Object.freeze({ acceptedByProvider: true, idMessage, status: 'queued_provider' });
  }

  return Object.freeze({ statusReadback, sendGroupMessage });
}

function verifyBearerHeader(receivedAuthorization, rawSecret) {
  if (typeof rawSecret !== 'string' || rawSecret.length < 24 || rawSecret.length > 256) return false;
  const actual = Buffer.from(String(receivedAuthorization || ''), 'utf8');
  const expected = Buffer.from(`Bearer ${rawSecret}`, 'utf8');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function parseOutgoingStatus(body) {
  if (!body || typeof body !== 'object' || body.typeWebhook !== 'outgoingMessageStatus') return null;
  const instanceId = String(body.instanceData && body.instanceData.idInstance || '');
  const wid = String(body.instanceData && body.instanceData.wid || '');
  const chatId = String(body.chatId || '');
  const idMessage = String(body.idMessage || '');
  const status = String(body.status || '').toLowerCase();
  if (!INSTANCE_ID.test(instanceId) || !WID.test(wid) || !GROUP_ID.test(chatId) ||
      !/^[A-Za-z0-9_-]{8,150}$/.test(idMessage) || !STATUS_TYPES.has(status)) {
    throw new SafeTransportError('GREENAPI_WEBHOOK_STATUS_INVALID');
  }
  return Object.freeze({ instanceId, wid, chatId, idMessage, status });
}

module.exports = Object.freeze({ createGreenApiTransport, verifyBearerHeader,
  parseOutgoingStatus, SafeTransportError, baseUrl });
