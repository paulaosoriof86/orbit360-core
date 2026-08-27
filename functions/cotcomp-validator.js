'use strict';

const {
  AUTO_READY,
  AUTO_POLICY,
  COMMON_ALIAS_RESOLUTION,
  JOURNEYS
} = require('./cotcomp-contracts');

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value) {
  if (!isNonEmptyString(value)) return false;
  const email = value.trim();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeIntakeData(rawData) {
  if (!isPlainObject(rawData)) {
    return { ok: false, data: null, errors: [{ fieldId: 'data', code: 'INVALID_OBJECT' }] };
  }

  const data = { ...rawData };
  const errors = [];

  for (const [alias, canonical] of Object.entries(COMMON_ALIAS_RESOLUTION)) {
    if (!hasOwn(data, alias)) continue;
    if (hasOwn(data, canonical) && data[canonical] !== data[alias]) {
      errors.push({ fieldId: canonical, code: 'ALIAS_CONFLICT', alias });
      continue;
    }
    if (!hasOwn(data, canonical)) data[canonical] = data[alias];
    delete data[alias];
  }

  return { ok: errors.length === 0, data, errors };
}

function requiredByRule(rule, data) {
  if (rule.required) return true;
  const condition = rule.requiredWhen;
  if (!condition) return false;

  const actual = data[condition.field];
  if (hasOwn(condition, 'equals')) return actual === condition.equals;
  if (Array.isArray(condition.in)) return condition.in.includes(actual);
  if (hasOwn(condition, 'greaterThan')) return typeof actual === 'number' && actual > condition.greaterThan;
  return false;
}

function typeError(rule, value, data) {
  switch (rule.type) {
    case 'string':
    case 'string_or_catalog':
    case 'string_or_future_catalog':
    case 'phone':
      return isNonEmptyString(value) ? null : 'INVALID_STRING';
    case 'email':
      return isValidEmail(value) ? null : 'INVALID_EMAIL';
    case 'boolean':
      return typeof value === 'boolean' ? null : 'INVALID_BOOLEAN';
    case 'integer':
      if (!Number.isInteger(value)) return 'INVALID_INTEGER';
      if (hasOwn(rule, 'minimum') && value < rule.minimum) return 'BELOW_MINIMUM';
      return null;
    case 'money':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'INVALID_MONEY';
    case 'date':
      return isValidDate(value) ? null : 'INVALID_DATE';
    case 'array_date':
      return Array.isArray(value) && value.every(isValidDate) ? null : 'INVALID_DATE_ARRAY';
    case 'enum':
      return rule.values.includes(value) ? null : 'INVALID_ENUM';
    case 'enum_by_field': {
      const discriminatorValue = data[rule.discriminator];
      const values = rule.valuesByDiscriminator[discriminatorValue] || [];
      return values.includes(value) ? null : 'INVALID_ENUM_FOR_DISCRIMINATOR';
    }
    case 'multi_enum':
      return Array.isArray(value) && value.length > 0 && value.every(item => rule.values.includes(item))
        ? null
        : 'INVALID_MULTI_ENUM';
    default:
      return 'UNSUPPORTED_TYPE';
  }
}

function validateSubmitReadyIntake(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return { ok: false, errors: [{ fieldId: 'payload', code: 'INVALID_OBJECT' }], normalized: null, autoReady: AUTO_READY };
  }

  const journey = JOURNEYS[payload.journeyId];
  if (!journey) errors.push({ fieldId: 'journeyId', code: 'UNSUPPORTED_JOURNEY' });

  if (!isNonEmptyString(payload.idempotencyKey)) {
    errors.push({ fieldId: 'idempotencyKey', code: 'REQUIRED' });
  }

  if (!journey) {
    return { ok: false, errors, normalized: null, autoReady: AUTO_READY };
  }

  if (payload.country !== journey.country) {
    errors.push({ fieldId: 'country', code: 'COUNTRY_JOURNEY_MISMATCH', expected: journey.country });
  }

  const normalizedResult = normalizeIntakeData(payload.data);
  errors.push(...normalizedResult.errors);
  if (!normalizedResult.data) {
    return { ok: false, errors, normalized: null, autoReady: AUTO_READY };
  }

  const data = normalizedResult.data;
  const allowedFields = new Set(Object.keys(journey.fields));
  for (const fieldId of Object.keys(data)) {
    if (!allowedFields.has(fieldId)) errors.push({ fieldId, code: 'FIELD_NOT_ALLOWED_IN_PUBLIC_INTAKE' });
  }

  for (const [fieldId, rule] of Object.entries(journey.fields)) {
    const present = hasOwn(data, fieldId);
    const required = requiredByRule(rule, data);
    if (required && !present) {
      errors.push({ fieldId, code: 'REQUIRED' });
      continue;
    }
    if (!present) continue;

    const code = typeError(rule, data[fieldId], data);
    if (code) errors.push({ fieldId, code });

    if (!code && rule.mustBeTrue && data[fieldId] !== true) {
      errors.push({ fieldId, code: 'CONSENT_REQUIRED_FOR_SUBMIT' });
    }

    if (!code && rule.lengthEqualsField && hasOwn(data, rule.lengthEqualsField)) {
      const expectedLength = data[rule.lengthEqualsField];
      if (Number.isInteger(expectedLength) && data[fieldId].length !== expectedLength) {
        errors.push({ fieldId, code: 'LENGTH_MISMATCH', expected: expectedLength });
      }
    }
  }

  const normalized = {
    journeyId: payload.journeyId,
    country: journey.country,
    idempotencyKey: isNonEmptyString(payload.idempotencyKey) ? payload.idempotencyKey.trim() : payload.idempotencyKey,
    data
  };

  return {
    ok: errors.length === 0,
    errors,
    normalized,
    autoReady: AUTO_READY,
    mode: journey.mode
  };
}

module.exports = Object.freeze({
  AUTO_READY,
  AUTO_POLICY,
  normalizeIntakeData,
  validateSubmitReadyIntake
});
