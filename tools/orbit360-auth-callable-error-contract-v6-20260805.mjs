#!/usr/bin/env node
'use strict';

const text = (value, max = 180) => String(value == null ? '' : value)
  .replace(/[\r\n]+/g, ' ')
  .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
  .replace(/https?:\/\/\S+/g, '[url]')
  .trim()
  .slice(0, max);

export function sanitizeCallableStatus(value) {
  const normalized = text(value, 80)
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'UNSPECIFIED';
}

export function buildOnboardingCallFailure(httpStatus, responseBody = {}) {
  const numericStatus = Number.isInteger(Number(httpStatus)) ? Number(httpStatus) : 0;
  const callableStatus = sanitizeCallableStatus(
    responseBody?.error?.status ||
    responseBody?.error?.details?.status ||
    responseBody?.result?.status ||
    ''
  );
  const suffix = callableStatus !== 'UNSPECIFIED' ? callableStatus : (numericStatus || 'UNKNOWN');
  const errorCode = `ONBOARDING_CALL_FAILED_${suffix}`;
  const error = new Error(`FUNCTIONAL_DEFECT:${errorCode}`);
  error.name = 'Orbit360OnboardingCallError';
  error.httpStatus = numericStatus;
  error.callableStatus = callableStatus;
  error.errorCode = errorCode;
  return error;
}

export function callableFailureEvidence(error) {
  const message = text(error?.message || error, 700);
  const fallbackCode = text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 180);
  return {
    httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
    callableStatus: sanitizeCallableStatus(error?.callableStatus || ''),
    errorCode: text(error?.errorCode || fallbackCode, 180)
  };
}
