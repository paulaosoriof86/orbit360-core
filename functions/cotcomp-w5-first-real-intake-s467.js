'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const data = require('./cotcomp-runtime-data-contract');

const VERSION = 'ays-cotcomp-s467-w5-first-real-intake-v1.0';
const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const COUNTRY = 'GT';
const JOURNEY_ID = 'GT_AUTO_MOTO_HYBRID';
const WEB_APP_ID = '1:646761409743:web:2ec4595ee9160f9d945bba';
const CONSENT_TEXT = 'Autorizo gestionar esta solicitud y contactarme';
const ONE_SHOT_KEY = 's467-w5-first-real-intake';
const ALLOWED_KEYS = Object.freeze([
  'brand',
  'lineModel',
  'contactName',
  'contactWhatsapp',
  'contactEmail',
  'requestManagementConsent',
  'marketingConsent'
]);

const app = getApps()[0] || initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

function clean(value, max = 240) {
  return String(value == null ? '' : value)
    .replace(/\u0000/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function fail(code, message) {
  throw new HttpsError(code, message);
}

function validateInput(raw) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const unknown = Object.keys(input).filter((key) => !ALLOWED_KEYS.includes(key));
  if (unknown.length) fail('invalid-argument', 'INTAKE_FIELDS_NOT_ALLOWED');

  const brand = clean(input.brand, 100);
  const lineModel = clean(input.lineModel, 140);
  const name = clean(input.contactName, 160);
  const whatsapp = clean(input.contactWhatsapp, 40);
  const email = clean(input.contactEmail, 220).toLowerCase();

  if (brand.length < 2) fail('invalid-argument', 'BRAND_REQUIRED');
  if (lineModel.length < 2) fail('invalid-argument', 'LINE_MODEL_REQUIRED');
  if (name.length < 2) fail('invalid-argument', 'CONTACT_NAME_REQUIRED');
  if (!/^\+?[0-9 ()-]{8,24}$/.test(whatsapp)) fail('invalid-argument', 'WHATSAPP_INVALID');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail('invalid-argument', 'EMAIL_INVALID');
  if (input.requestManagementConsent !== true) {
    fail('failed-precondition', 'REQUEST_MANAGEMENT_CONSENT_REQUIRED');
  }
  if (input.marketingConsent != null && typeof input.marketingConsent !== 'boolean') {
    fail('invalid-argument', 'MARKETING_CONSENT_INVALID');
  }

  return Object.freeze({
    brand,
    lineModel,
    contact: Object.freeze({ name, whatsapp, email }),
    requestManagementConsent: true,
    marketingConsent: input.marketingConsent === true
  });
}

function buildRealQuoteCase(validated, now = Timestamp.now()) {
  const ids = data.deriveCaseIds({ tenantId: TENANT_ID, idempotencyKey: ONE_SHOT_KEY });
  const built = data.buildQuoteCase({
    tenantId: TENANT_ID,
    caseId: ids.caseId,
    journeyId: JOURNEY_ID,
    correlationId: ids.correlationId,
    country: COUNTRY,
    source: 'PUBLIC_WEB',
    intent: 'COTIZAR',
    riskOrProductCandidate: 'AUTO',
    mode: 'HYBRID',
    status: 'SUBMITTED',
    progress: {
      journeyCompletion: true,
      handoffContact: true
    },
    capturedFields: {
      brand: validated.brand,
      lineModel: validated.lineModel
    },
    missingFields: [],
    contact: validated.contact,
    consents: {
      requestManagement: true,
      requestManagementText: CONSENT_TEXT,
      requestManagementAcceptedAt: now,
      marketing: validated.marketingConsent === true,
      marketingAcceptedAt: validated.marketingConsent === true ? now : null
    },
    assignmentStatus: 'UNASSIGNED',
    projectionStatus: { lead: 'PENDING', ops: 'PENDING' },
    createdAt: now,
    updatedAt: now
  });
  if (!built.ok) throw new Error('S467_QUOTE_CASE_BUILD_FAILED_' + String(built.code || 'UNKNOWN'));

  return Object.freeze({
    ids,
    path: data.pathFor(TENANT_ID, data.ENTITY.QUOTE_CASE, ids.caseId),
    value: Object.freeze({
      ...built.value,
      intakeChannel: 'W5_FIRST_REAL_INTAKE',
      intakeVersion: VERSION,
      intakeSingleUse: true,
      piiClassification: data.PII_POLICY.classification,
      analyticsAllowed: false,
      rawCaseAccessTokenStored: false
    })
  });
}

async function assertNoExistingRealPilotCase() {
  const collectionPath = data.pathFor(TENANT_ID, data.ENTITY.QUOTE_CASE);
  const snapshot = await db.collection(collectionPath)
    .where('journeyId', '==', JOURNEY_ID)
    .limit(8)
    .get();

  const hasReal = snapshot.docs.some((doc) => {
    const row = doc.data() || {};
    const source = clean(row.source, 100);
    const country = clean(row.country, 8).toUpperCase();
    const product = clean(row.riskOrProductCandidate, 180).toUpperCase();
    const synthetic = row.synthetic === true ||
      Boolean(clean(row.proofRunId, 120)) ||
      Boolean(row.provenance && row.provenance.synthetic === true);
    return !synthetic && source === 'PUBLIC_WEB' && country === COUNTRY && product.includes('AUTO');
  });

  if (hasReal) fail('failed-precondition', 'W5_REAL_CASE_ALREADY_PRESENT');
}

async function createSingleUseQuoteCase(validated) {
  await assertNoExistingRealPilotCase();
  const prepared = buildRealQuoteCase(validated);
  const ref = db.doc(prepared.path);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) fail('failed-precondition', 'W5_INTAKE_ALREADY_USED');
    tx.create(ref, prepared.value);
  });

  return Object.freeze({
    ok: true,
    status: 'SUBMITTED',
    code: 'W5_INTAKE_ACCEPTED',
    country: COUNTRY,
    journeyId: JOURNEY_ID
  });
}

const cotcompW5FirstRealIntake = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    maxInstances: 1,
    concurrency: 1,
    timeoutSeconds: 20,
    memory: '256MiB'
  },
  async (request) => {
    const runtimeProject = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID;
    if (runtimeProject !== PROJECT_ID) fail('failed-precondition', 'LAB_PROJECT_REQUIRED');
    if (!request.app || request.app.appId !== WEB_APP_ID) {
      fail('permission-denied', 'LAB_WEB_APP_ATTESTATION_REQUIRED');
    }
    const validated = validateInput(request.data);
    return createSingleUseQuoteCase(validated);
  }
);

module.exports = Object.freeze({
  VERSION,
  PROJECT_ID,
  TENANT_ID,
  COUNTRY,
  JOURNEY_ID,
  WEB_APP_ID,
  CONSENT_TEXT,
  ONE_SHOT_KEY,
  ALLOWED_KEYS,
  clean,
  validateInput,
  buildRealQuoteCase,
  createSingleUseQuoteCase,
  cotcompW5FirstRealIntake
});
