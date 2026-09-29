'use strict';

const crypto = require('node:crypto');

const VERSION = 'ays-cotcomp-case-access-contract-s412-v0.1';
const PERSISTENCE_ENABLED = false;
const RUNTIME_ENABLED = false;

const TOKEN_FORMAT = Object.freeze({
  prefix: 'qca_',
  digest: 'sha256',
  secretSource: 'FUTURE_SERVER_SECRET_ONLY',
  browserStoresSecret: false,
  rawTokenPersistenceAllowed: false
});

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function buildCaseAccessRecord({ quoteCaseId, rawToken, expiresAt, createdAt } = {}) {
  if (!quoteCaseId || !rawToken || !expiresAt) {
    return { ok:false, code:'CASE_ACCESS_INPUT_INCOMPLETE' };
  }
  return {
    ok:true,
    record:{
      schemaVersion: VERSION,
      quoteCaseId:String(quoteCaseId),
      tokenHash:hashToken(rawToken),
      expiresAt:String(expiresAt),
      createdAt:createdAt ? String(createdAt) : null,
      revokedAt:null,
      rawTokenStored:false
    },
    persistenceEnabled:PERSISTENCE_ENABLED
  };
}

function verifyCaseAccessRecord({ quoteCaseId, rawToken, now, record } = {}) {
  if (!record || record.schemaVersion !== VERSION) return { ok:false, code:'CASE_ACCESS_RECORD_INVALID' };
  if (String(record.quoteCaseId) !== String(quoteCaseId || '')) return { ok:false, code:'CASE_ACCESS_CASE_MISMATCH' };
  if (record.revokedAt) return { ok:false, code:'CASE_ACCESS_REVOKED' };
  if (!rawToken) return { ok:false, code:'CASE_ACCESS_TOKEN_REQUIRED' };
  if (hashToken(rawToken) !== record.tokenHash) return { ok:false, code:'CASE_ACCESS_TOKEN_INVALID' };

  const nowMs = Date.parse(String(now || ''));
  const expMs = Date.parse(String(record.expiresAt || ''));
  if (!Number.isFinite(nowMs) || !Number.isFinite(expMs)) return { ok:false, code:'CASE_ACCESS_TIME_INVALID' };
  if (nowMs >= expMs) return { ok:false, code:'CASE_ACCESS_EXPIRED' };

  return { ok:true, code:null };
}

module.exports = Object.freeze({
  VERSION,
  PERSISTENCE_ENABLED,
  RUNTIME_ENABLED,
  TOKEN_FORMAT,
  hashToken,
  buildCaseAccessRecord,
  verifyCaseAccessRecord
});
