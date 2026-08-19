#!/usr/bin/env node
'use strict';

export const PROBE_TENANT_ID = 'orbit360-f2-cross-tenant-probe';
export const PROBE_DOCUMENT_PATH = `tenants/${PROBE_TENANT_ID}/system/config`;

const RESERVED_ID = /^__.*__$/;

export function isValidFirestoreId(value) {
  const id = String(value ?? '');
  return id.length > 0
    && Buffer.byteLength(id, 'utf8') <= 1500
    && !id.includes('/')
    && id !== '.'
    && id !== '..'
    && !RESERVED_ID.test(id);
}

export function validateProbeDocumentPath(documentPath = PROBE_DOCUMENT_PATH) {
  const segments = String(documentPath ?? '').split('/');
  if (segments.length < 2 || segments.length % 2 !== 0) return false;
  return segments.every(isValidFirestoreId);
}

export function classifyForcedServerResponse(httpStatus, errorStatus = '') {
  const status = Number(httpStatus);
  const firestoreStatus = String(errorStatus || '').trim();
  if (status === 403 && firestoreStatus === 'PERMISSION_DENIED') {
    return { ok: true, classification: 'PASS', code: 'F2_CROSS_TENANT_FORCED_SERVER_DENY_PASS' };
  }
  if (status === 400 && firestoreStatus === 'INVALID_ARGUMENT') {
    return { ok: false, classification: 'VALIDATOR_STALE', code: 'F2_CROSS_TENANT_PROBE_INVALID_ARGUMENT' };
  }
  return { ok: false, classification: 'SECURITY_FAILURE', code: 'F2_CROSS_TENANT_FORCED_SERVER_READ_NOT_DENIED' };
}
