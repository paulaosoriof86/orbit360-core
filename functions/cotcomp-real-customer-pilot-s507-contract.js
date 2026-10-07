'use strict';

const crypto = require('node:crypto');

const VERSION = 'ays-cotcomp-s507-real-customer-pilot-contract-v0.1';
const TENANT_ID = 'alianzas-soluciones';

const POLICY = Object.freeze({
  version: VERSION,
  sourceOnly: true,
  runtimeRealDataEnabled: false,
  production: false,
  providerRater: false,
  issuance: false,
  binding: false,
  payment: false,
  tenantId: TENANT_ID,
  pilot: Object.freeze({
    status: 'OWNER_APPROVED_SCOPE_SOURCE_ONLY',
    country: 'GT',
    needFamily: 'vehicle',
    journeyId: 'GT_AUTO_MOTO_HYBRID',
    maxParticipants: 1,
    maxAcceptedRealRecords: 1,
    maxExecutions: 1,
    designatedRouting: 'DESIGNATED_TRIAGE_ADVISOR',
    designatedAdvisorNameKey: 'paula_osorio',
    designatedAdvisorWhatsappDigits: '50256149048'
  }),
  rateLimit: Object.freeze({
    maxAttemptsPerCapability: 5,
    windowMs: 15 * 60 * 1000,
    maxAcceptedPerCapability: 1,
    capabilityTtlMs: 24 * 60 * 60 * 1000,
    globalAcceptedRealCap: 1
  }),
  legal: Object.freeze({
    formalLegalValidationComplete: false,
    legalComplianceVerified: false,
    ownerEvidenceBasedGtRiskAcceptanceHistorical: true
  }),
  privacy: Object.freeze({
    noticeVersion: 'GT_REAL_CUSTOMER_LAB_PILOT_PRIVACY_v1',
    noticeStatus: 'SOURCE_READY_OWNER_CHANNEL_CONFIRMED',
    consentVersion: 'GT_REAL_CUSTOMER_LAB_PILOT_REQUEST_MANAGEMENT_v1',
    privacyContactEmail: 'info@aysseguros.com',
    retentionDisposition: 'RETAIN_IF_VALID_BUSINESS_RECORD',
    retentionStatus: 'OWNER_APPROVED_INTERNAL_POLICY',
    unconvertedRetentionMonths: 12,
    retentionLegalMandatoryClaim: false,
    convertedHandoff: 'GRAVICENTRA_OPERATIONAL_GOVERNANCE'
  }),
  truth: Object.freeze({
    initialBusinessStage: 'nuevo',
    origin: 'Web CotComp',
    providerDeliveryClaimAllowed: false,
    issuanceClaimAllowed: false,
    coverageClaimAllowed: false
  })
});

const ALLOWED_INPUT_FIELDS = Object.freeze([
  'country', 'needFamily', 'mode', 'summary', 'contactName', 'whatsapp', 'email',
  'requestManagementConsent', 'consentVersion', 'marketingConsent', 'correlationId', 'journeyId'
]);

const BROWSER_FORBIDDEN_FIELDS = Object.freeze([
  'advisorId', 'asesorId', 'tenantId', 'role', 'roles', 'admin', 'isAdmin',
  'notificationTarget', 'providerId', 'insurerId', 'paymentData', 'healthData',
  'governmentId', 'dpi', 'cedula', 'token', 'rawToken'
]);

function clean(value, max = 500) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}
function normalize(value) {
  return clean(value, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function stable(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function sha256(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}
function digestPayload(value) {
  return sha256(JSON.stringify(stable(value)));
}

function validateIntake(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const errors = [];
  const keys = Object.keys(raw);
  const unknown = keys.filter(key => !ALLOWED_INPUT_FIELDS.includes(key));
  const forbidden = keys.filter(key => BROWSER_FORBIDDEN_FIELDS.includes(key));
  if (unknown.length) errors.push('UNKNOWN_FIELDS');
  if (forbidden.length) errors.push('BROWSER_ROUTING_OR_SENSITIVE_FIELD_DENIED');

  const country = clean(raw.country, 8).toUpperCase();
  const needFamily = normalize(raw.needFamily);
  const mode = normalize(raw.mode || 'hybrid');
  const contactName = clean(raw.contactName, 160);
  const whatsapp = clean(raw.whatsapp, 60);
  const email = clean(raw.email, 200).toLowerCase();
  const summary = clean(raw.summary, 600);
  const consentVersion = clean(raw.consentVersion, 80);
  const correlationId = clean(raw.correlationId, 180);
  const journeyId = clean(raw.journeyId || POLICY.pilot.journeyId, 180);

  if (country !== POLICY.pilot.country) errors.push('COUNTRY_OUT_OF_SCOPE');
  if (needFamily !== POLICY.pilot.needFamily) errors.push('FAMILY_OUT_OF_SCOPE');
  if (!['hybrid', 'assisted', 'consultative'].includes(mode)) errors.push('MODE_INVALID');
  if (!contactName) errors.push('CONTACT_NAME_REQUIRED');
  if (!whatsapp && !email) errors.push('CONTACT_CHANNEL_REQUIRED');
  if (raw.requestManagementConsent !== true) errors.push('REQUEST_MANAGEMENT_CONSENT_REQUIRED');
  if (!consentVersion) errors.push('CONSENT_VERSION_REQUIRED');
  if (raw.marketingConsent === true) errors.push('MARKETING_MUST_REMAIN_SEPARATE');
  if (journeyId !== POLICY.pilot.journeyId) errors.push('JOURNEY_OUT_OF_SCOPE');

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    sanitized: {
      country, needFamily, mode, summary, contactName, whatsapp, email,
      requestManagementConsent: raw.requestManagementConsent === true,
      consentVersion, marketingConsent: false, correlationId, journeyId
    }
  };
}

function validateCapability({ token, tokenDigest, expiresAtEpochMs, used, attempts, acceptedCount }, now = Date.now()) {
  if (!clean(token, 512) || clean(token, 512).length < 24) return { ok: false, code: 'CAPABILITY_REQUIRED' };
  if (!/^[a-f0-9]{64}$/.test(clean(tokenDigest, 64))) return { ok: false, code: 'CAPABILITY_DIGEST_INVALID' };
  if (sha256(token) !== clean(tokenDigest, 64)) return { ok: false, code: 'CAPABILITY_MISMATCH' };
  if (Number(expiresAtEpochMs || 0) <= Number(now)) return { ok: false, code: 'CAPABILITY_EXPIRED' };
  if (used === true || Number(acceptedCount || 0) >= POLICY.rateLimit.maxAcceptedPerCapability) return { ok: false, code: 'CAPABILITY_USED' };
  if (Number(attempts || 0) >= POLICY.rateLimit.maxAttemptsPerCapability) return { ok: false, code: 'RATE_LIMITED' };
  return { ok: true, code: 'CAPABILITY_ACCEPTABLE' };
}

function activeAdvisor(row, countryCode) {
  row = row || {};
  const status = normalize(row.status || row.estado);
  const active = row.active !== false && row.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado', 'suspended', 'suspendido'].includes(status);
  const roles = [].concat(row.roles || [], row.activeRole || [], row.rolActivo || [], row.role || [], row.rol || []).map(normalize);
  const countries = [].concat(row.countries || [], row.paises || [], row.country || [], row.pais || []).map(v => clean(v, 8).toUpperCase()).filter(Boolean);
  const advisorRole = roles.some(role => ['asesor', 'asesora', 'comercial'].includes(role) || role.startsWith('asesor_') || role.startsWith('asesora_'));
  const countryAllowed = !countries.length || countries.includes(countryCode);
  const id = clean(row.advisorId || row.asesorId || row.id, 180);
  return active && advisorRole && countryAllowed && !!id;
}

function resolveAdvisor(rows, countryCode = POLICY.pilot.country) {
  const eligible = [].concat(rows || []).filter(row => activeAdvisor(row, countryCode));
  const triage = eligible.filter(row => row.pilotTriage === true || row.publicHandoffTriage === true);
  if (triage.length === 1) return { ok: true, advisorId: clean(triage[0].advisorId || triage[0].asesorId || triage[0].id, 180), rule: 'EXPLICIT_TRIAGE' };
  if (!eligible.length) return { ok: false, code: 'ADVISOR_ROUTING_REQUIRED' };
  if (eligible.length === 1) return { ok: true, advisorId: clean(eligible[0].advisorId || eligible[0].asesorId || eligible[0].id, 180), rule: 'SOLE_ELIGIBLE' };
  return { ok: false, code: 'ADVISOR_ROUTING_AMBIGUOUS', eligibleCount: eligible.length };
}

function idempotencyDecision(existingDigest, incomingPayload) {
  const incomingDigest = digestPayload(incomingPayload);
  if (!existingDigest) return { decision: 'CREATE_PROPOSED', incomingDigest };
  if (clean(existingDigest, 64) === incomingDigest) return { decision: 'REUSE', incomingDigest };
  return { decision: 'DENY_CONFLICT', incomingDigest };
}

function readiness(input = {}) {
  const blockers = [];
  if (!clean(POLICY.privacy.noticeVersion, 80)) blockers.push('PRIVACY_NOTICE_VERSION_REQUIRED');
  if (!['RETAIN_IF_VALID_BUSINESS_RECORD', 'ROLLBACK_TO_BEFORE_STATE'].includes(clean(POLICY.privacy.retentionDisposition, 80))) blockers.push('RETENTION_DISPOSITION_REQUIRED');
  if (input.designatedAdvisorReadback !== true) blockers.push('DESIGNATED_ADVISOR_READBACK_REQUIRED');
  if (input.routingContractPass !== true) blockers.push('ADVISOR_ROUTING_CONTRACT_REQUIRED');
  if (POLICY.pilot.designatedRouting !== 'DESIGNATED_TRIAGE_ADVISOR') blockers.push('DESIGNATED_ROUTING_NOT_FROZEN');
  if (input.antiAbuseContractPass !== true) blockers.push('ANTI_ABUSE_CONTRACT_REQUIRED');
  if (input.rateLimitContractPass !== true) blockers.push('RATE_LIMIT_CONTRACT_REQUIRED');
  if (input.syntheticRehearsalPass !== true) blockers.push('SYNTHETIC_REHEARSAL_REQUIRED');
  if (input.ownerRealDataAuthorization !== true) blockers.push('OWNER_REAL_DATA_AUTHORIZATION_REQUIRED');
  return { ready: false, sourceOnly: true, runtimeRealDataEnabled: false, blockers: Array.from(new Set(blockers)) };
}

function proposedBusinessCommand(sanitized, advisorId, requestId) {
  const safe = sanitized || {};
  const aid = clean(advisorId, 180);
  const rid = clean(requestId, 180);
  if (!aid) throw new Error('ADVISOR_REQUIRED');
  if (!rid) throw new Error('REQUEST_ID_REQUIRED');
  return {
    executionAllowed: false,
    operation: 'create_business',
    requestId: rid,
    tenantId: TENANT_ID,
    payload: {
      stage: POLICY.truth.initialBusinessStage,
      origen: POLICY.truth.origin,
      pais: safe.country,
      producto: safe.needFamily,
      modo: safe.mode,
      descripcion: safe.summary,
      contactoNombre: safe.contactName,
      contactoWhatsapp: safe.whatsapp,
      contactoEmail: safe.email,
      asesorId: aid,
      consentVersion: safe.consentVersion,
      marketingConsent: false,
      privacyContactEmail: POLICY.privacy.privacyContactEmail,
      retentionDisposition: POLICY.privacy.retentionDisposition,
      cotcompRef: { journeyId: safe.journeyId, correlationId: safe.correlationId }
    },
    truth: {
      internalRegistrationClaimRequiresReadback: true,
      providerDelivered: false,
      coverageConfirmed: false,
      issued: false,
      bound: false,
      paid: false
    }
  };
}

module.exports = Object.freeze({
  VERSION, TENANT_ID, POLICY, ALLOWED_INPUT_FIELDS, BROWSER_FORBIDDEN_FIELDS,
  clean, normalize, stable, sha256, digestPayload, validateIntake, validateCapability,
  activeAdvisor, resolveAdvisor, idempotencyDecision, readiness, proposedBusinessCommand
});
