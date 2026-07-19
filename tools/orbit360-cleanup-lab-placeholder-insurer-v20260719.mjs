import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_BEFORE = 27;
const EXPECTED_AFTER = 26;
const RECORD_HASH = '6e306b5864e8db1f';
const IDENTITY_HASH = 'b9e4ee2102f0f182';
const OUTPUT_DIR = 'orbit360-platform/runtime-gate-crm-v20260716';
const OUTPUT = `${OUTPUT_DIR}/placeholder-cleanup-sanitized.json`;

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function fingerprint(value) {
  return createHash('sha256').update(`${TENANT_ID}|${clean(value)}`).digest('hex').slice(0, 16);
}

function resultBase() {
  return {
    schemaVersion: 'orbit360-lab-placeholder-cleanup-v2-country-diagnostic',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    expectedBefore: EXPECTED_BEFORE,
    expectedAfter: EXPECTED_AFTER,
    candidateRecordHash: RECORD_HASH,
    candidateIdentityHash: IDENTITY_HASH,
    readOnlyPreflight: true,
    clientCountryProfileReadOnly: true,
    auditAndRollbackRequired: true,
    containsPII: false,
    containsSecrets: false,
    ok: false,
    status: 'initializing'
  };
}

function writeResult(result) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`M1_PLACEHOLDER_CLEANUP:${JSON.stringify({
    ok: result.ok,
    status: result.status,
    before: result.beforeCount,
    after: result.afterCount,
    relationCount: result.relationCount,
    clientCountryProfile: result.clientCountryProfile || null
  })}`);
}

async function count(ref) {
  const snapshot = await ref.count().get();
  return Number(snapshot.data().count || 0);
}

function rawCountry(value) {
  const normalized = normalize(value);
  if (/^(gt|gtm|guatemala)$/.test(normalized)) return 'GT';
  if (/^(co|col|colombia)$/.test(normalized)) return 'CO';
  if (/requiere validacion|por validar|sin dato|pendiente/.test(normalized)) return 'REQUIERE_VALIDACION';
  return normalized ? 'OTHER' : 'BLANK';
}

function phoneCountry(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (!digits) return 'BLANK';
  if (digits === '502' || digits.startsWith('502')) return '502';
  if (digits === '57' || digits.startsWith('57')) return '57';
  return 'OTHER';
}

async function clientCountryProfile(root) {
  const snapshot = await root.collection('clientes').get();
  const profile = {
    total: snapshot.size,
    rawCountry: { GT: 0, CO: 0, REQUIERE_VALIDACION: 0, BLANK: 0, OTHER: 0 },
    phoneCountry: { '502': 0, '57': 0, BLANK: 0, OTHER: 0 },
    mismatches: {
      rawGtPhone57: 0,
      rawCoPhone502: 0,
      rawUnknownPhone502: 0,
      rawUnknownPhone57: 0
    },
    migrationTracePresent: 0,
    sourceCountryFieldPresent: 0
  };

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const country = rawCountry(data.pais ?? data.paisCodigo ?? data.codigoPais ?? data.country);
    const phone = phoneCountry(data.codigoPaisTelefono ?? data.codRegion ?? data.codigoRegion ?? data.regionCode);
    profile.rawCountry[country] += 1;
    profile.phoneCountry[phone] += 1;
    if (country === 'GT' && phone === '57') profile.mismatches.rawGtPhone57 += 1;
    if (country === 'CO' && phone === '502') profile.mismatches.rawCoPhone502 += 1;
    if ((country === 'BLANK' || country === 'REQUIERE_VALIDACION' || country === 'OTHER') && phone === '502') profile.mismatches.rawUnknownPhone502 += 1;
    if ((country === 'BLANK' || country === 'REQUIERE_VALIDACION' || country === 'OTHER') && phone === '57') profile.mismatches.rawUnknownPhone57 += 1;
    if (data._migration || data.sourceFile || data.sourceRow || data.origen) profile.migrationTracePresent += 1;
    if (data.pais !== undefined || data.paisCodigo !== undefined || data.codigoPais !== undefined || data.country !== undefined) profile.sourceCountryFieldPresent += 1;
  }

  return profile;
}

async function relationEvidence(root, candidateId) {
  const collections = await root.listCollections();
  const hits = [];
  for (const collection of collections) {
    if (collection.id === 'aseguradoras' || collection.id === 'auditoriaAsegExterna') continue;
    for (const field of ['aseguradoraId', 'insurerId']) {
      try {
        const snapshot = await collection.where(field, '==', candidateId).limit(1).get();
        if (!snapshot.empty) hits.push({ collectionHash: fingerprint(collection.id), field });
      } catch (error) {
        throw new Error(`RELATION_CHECK_FAILED:${collection.id}:${field}:${String(error?.code || error?.message || 'unknown').replace(/[^a-z0-9/_-]/gi, '').slice(0, 60)}`);
      }
    }
  }
  return hits;
}

function isEmptyList(value) {
  return !Array.isArray(value) || value.length === 0;
}

function validateCandidate(doc) {
  const data = doc.data() || {};
  const country = clean(data.pais || data.country).toUpperCase();
  const identity = `${normalize(data.canonicalName || data.nombre || data.razonSocial)}|${country}`;
  const emptyOperationalData = ['contactos', 'cuentas', 'portales', 'docs', 'ramos', 'productos', 'docsRequeridos'].every(key => isEmptyList(data[key]));
  const checks = {
    recordHash: fingerprint(doc.id) === RECORD_HASH,
    identityHash: fingerprint(identity) === IDENTITY_HASH,
    placeholderName: normalize(data.nombre) === 'nueva aseguradora',
    country: country === 'GT',
    unlinked: data.vinculada === false,
    sessionDraft: data.creadaEnSesion === true,
    emptyOperationalData
  };
  return { data, checks, valid: Object.values(checks).every(Boolean) };
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (projectId !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);
const insurers = root.collection('aseguradoras');
const result = resultBase();

try {
  result.beforeCount = await count(insurers);
  result.clientCountryProfile = await clientCountryProfile(root);
  const snapshot = await insurers.get();
  const candidates = snapshot.docs.filter(doc => fingerprint(doc.id) === RECORD_HASH);

  if (result.beforeCount === EXPECTED_AFTER && candidates.length === 0) {
    result.ok = true;
    result.status = 'already_clean';
    result.afterCount = result.beforeCount;
    result.relationCount = 0;
    writeResult(result);
    process.exit(0);
  }

  if (result.beforeCount !== EXPECTED_BEFORE) throw new Error(`UNEXPECTED_BEFORE_COUNT:${result.beforeCount}`);
  if (candidates.length !== 1) throw new Error(`PLACEHOLDER_MATCH_COUNT:${candidates.length}`);

  const candidate = candidates[0];
  const validation = validateCandidate(candidate);
  result.candidateChecks = validation.checks;
  if (!validation.valid) throw new Error('PLACEHOLDER_CONTRACT_MISMATCH');

  const relations = await relationEvidence(root, candidate.id);
  result.relationCount = relations.length;
  result.relationEvidence = relations;
  if (relations.length) throw new Error(`PLACEHOLDER_HAS_RELATIONS:${relations.length}`);

  const auditRef = root.collection('auditoriaAsegExterna').doc(`cleanup_${RECORD_HASH}`);
  await db.runTransaction(async transaction => {
    const fresh = await transaction.get(candidate.ref);
    if (!fresh.exists) throw new Error('PLACEHOLDER_DISAPPEARED');
    const freshValidation = validateCandidate(fresh);
    if (!freshValidation.valid) throw new Error('PLACEHOLDER_CHANGED_BEFORE_DELETE');

    transaction.set(auditRef, {
      schemaVersion: 'orbit360-insurer-cleanup-audit-v1',
      tenantId: TENANT_ID,
      action: 'remove_accidental_unsaved_placeholder',
      reason: 'El flujo anterior insertó un borrador antes de la confirmación del usuario.',
      recordHash: RECORD_HASH,
      identityHash: IDENTITY_HASH,
      sourceRuns: [29707207520, 29707526329],
      createdAt: FieldValue.serverTimestamp(),
      rollbackAvailable: true,
      rollbackRecord: freshValidation.data,
      containsSecrets: false
    }, { merge: false });
    transaction.delete(candidate.ref);
  });

  result.afterCount = await count(insurers);
  if (result.afterCount !== EXPECTED_AFTER) throw new Error(`UNEXPECTED_AFTER_COUNT:${result.afterCount}`);
  result.ok = true;
  result.status = 'placeholder_removed_with_audit';
  writeResult(result);
} catch (error) {
  result.status = 'blocked';
  result.errorCode = String(error?.message || error).replace(/[^A-Za-z0-9:_/-]/g, '').slice(0, 160);
  try { result.afterCount = await count(insurers); } catch {}
  try { if (!result.clientCountryProfile) result.clientCountryProfile = await clientCountryProfile(root); } catch {}
  writeResult(result);
  process.exit(53);
}
