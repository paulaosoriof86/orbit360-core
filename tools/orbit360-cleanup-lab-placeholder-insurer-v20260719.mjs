import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_BEFORE = 27;
const EXPECTED_AFTER = 26;
const EXPECTED_CLIENTS = 414;
const EXPECTED_COUNTRY_AFTER = { GT: 234, CO: 15, REQUIERE_VALIDACION: 165 };
const RECORD_HASH = '6e306b5864e8db1f';
const IDENTITY_HASH = 'b9e4ee2102f0f182';
const COUNTRY_AUDIT_ID = 'm1_client_country_contract_20260719_v1';
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

const GT_GEO = new Set([
  'alta verapaz','baja verapaz','chimaltenango','chiquimula','el progreso','escuintla','guatemala',
  'huehuetenango','izabal','jalapa','jutiapa','peten','quetzaltenango','quiche','retalhuleu',
  'sacatepequez','san marcos','santa rosa','solola','suchitepequez','totonicapan','zacapa'
]);
const CO_GEO = new Set([
  'amazonas','antioquia','arauca','atlantico','bogota','bogota dc','bolivar','boyaca','caldas','caqueta',
  'casanare','cauca','cesar','choco','cordoba','cundinamarca','guainia','guaviare','huila','la guajira',
  'magdalena','meta','narino','norte de santander','putumayo','quindio','risaralda',
  'san andres y providencia','santander','sucre','tolima','valle del cauca','vaupes','vichada'
]);

function fingerprint(value) {
  return createHash('sha256').update(`${TENANT_ID}|${clean(value)}`).digest('hex').slice(0, 16);
}

function resultBase() {
  return {
    schemaVersion: 'orbit360-m1-lab-data-contract-maintenance-v4',
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
  console.log(`M1_DATA_CONTRACT_MAINTENANCE:${JSON.stringify({
    ok: result.ok,
    status: result.status,
    before: result.beforeCount,
    after: result.afterCount,
    relationCount: result.relationCount,
    countryCorrection: result.countryCorrection || null,
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

function rawCurrency(value) {
  const normalized = normalize(value).replace(/\s/g, '');
  if (normalized === 'gtq' || normalized === 'quetzal' || normalized === 'quetzales') return 'GTQ';
  if (normalized === 'cop' || normalized === 'pesocolombiano' || normalized === 'pesoscolombianos') return 'COP';
  if (/requierevalidacion|porvalidar|sindato|pendiente/.test(normalized)) return 'REQUIERE_VALIDACION';
  return normalized ? 'OTHER' : 'BLANK';
}

function phoneCountry(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (!digits) return 'BLANK';
  if (digits === '502' || digits.startsWith('502')) return '502';
  if (digits === '57' || digits.startsWith('57')) return '57';
  return 'OTHER';
}

function geographyCountry(data) {
  const values = [
    data.departamentoProvincia, data.provincia, data.departamento,
    data.ciudadMunicipio, data.ciudad, data.canton
  ].map(normalize).filter(Boolean);
  let gt = false;
  let co = false;
  for (const value of values) {
    if (GT_GEO.has(value)) gt = true;
    if (CO_GEO.has(value) || value.startsWith('bogota ')) co = true;
  }
  if (gt && !co) return 'GT';
  if (co && !gt) return 'CO';
  if (gt && co) return 'AMBIGUOUS';
  return values.length ? 'UNKNOWN' : 'BLANK';
}

function targetCountry(data) {
  const geography = geographyCountry(data);
  if (geography === 'GT' || geography === 'CO') return geography;
  return 'REQUIERE_VALIDACION';
}

function targetCurrency(country) {
  if (country === 'GT') return 'GTQ';
  if (country === 'CO') return 'COP';
  return '';
}

function sourceRowOf(data) {
  const candidate = data.sourceRow ?? data._migration?.row ?? data.filaOrigen ?? data.source?.row;
  const number = Number(candidate);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function clientCountryProfile(root) {
  const snapshot = await root.collection('clientes').get();
  const sourceRows = new Set();
  let duplicateSourceRows = 0;
  const profile = {
    total: snapshot.size,
    rawCountry: { GT: 0, CO: 0, REQUIERE_VALIDACION: 0, BLANK: 0, OTHER: 0 },
    rawCurrency: { GTQ: 0, COP: 0, REQUIERE_VALIDACION: 0, BLANK: 0, OTHER: 0 },
    phoneCountry: { '502': 0, '57': 0, BLANK: 0, OTHER: 0 },
    geographyEvidence: { GT: 0, CO: 0, AMBIGUOUS: 0, UNKNOWN: 0, BLANK: 0 },
    mismatches: {
      rawGtPhone57: 0,
      rawCoPhone502: 0,
      rawGtGeoCo: 0,
      rawCoGeoGt: 0,
      rawUnknownPhone502: 0,
      rawUnknownPhone57: 0
    },
    migrationTracePresent: 0,
    sourceCountryFieldPresent: 0,
    sourceRowPresent: 0,
    uniqueSourceRows: 0,
    duplicateSourceRows: 0
  };

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const country = rawCountry(data.pais ?? data.paisCodigo ?? data.codigoPais ?? data.country);
    const currency = rawCurrency(data.moneda ?? data.currency);
    const phone = phoneCountry(data.codigoPaisTelefono ?? data.codRegion ?? data.codigoRegion ?? data.regionCode);
    const geography = geographyCountry(data);
    const sourceRow = sourceRowOf(data);
    profile.rawCountry[country] += 1;
    profile.rawCurrency[currency] += 1;
    profile.phoneCountry[phone] += 1;
    profile.geographyEvidence[geography] += 1;
    if (country === 'GT' && phone === '57') profile.mismatches.rawGtPhone57 += 1;
    if (country === 'CO' && phone === '502') profile.mismatches.rawCoPhone502 += 1;
    if (country === 'GT' && geography === 'CO') profile.mismatches.rawGtGeoCo += 1;
    if (country === 'CO' && geography === 'GT') profile.mismatches.rawCoGeoGt += 1;
    if ((country === 'BLANK' || country === 'REQUIERE_VALIDACION' || country === 'OTHER') && phone === '502') profile.mismatches.rawUnknownPhone502 += 1;
    if ((country === 'BLANK' || country === 'REQUIERE_VALIDACION' || country === 'OTHER') && phone === '57') profile.mismatches.rawUnknownPhone57 += 1;
    if (data._migration || data.sourceFile || data.sourceRow || data.origen) profile.migrationTracePresent += 1;
    if (data.pais !== undefined || data.paisCodigo !== undefined || data.codigoPais !== undefined || data.country !== undefined) profile.sourceCountryFieldPresent += 1;
    if (sourceRow != null) {
      profile.sourceRowPresent += 1;
      if (sourceRows.has(sourceRow)) duplicateSourceRows += 1;
      sourceRows.add(sourceRow);
    }
  }
  profile.uniqueSourceRows = sourceRows.size;
  profile.duplicateSourceRows = duplicateSourceRows;
  return profile;
}

function countryProfileMatchesCorrected(profile) {
  return profile.total === EXPECTED_CLIENTS &&
    profile.rawCountry.GT === EXPECTED_COUNTRY_AFTER.GT &&
    profile.rawCountry.CO === EXPECTED_COUNTRY_AFTER.CO &&
    profile.rawCountry.REQUIERE_VALIDACION === EXPECTED_COUNTRY_AFTER.REQUIERE_VALIDACION &&
    profile.rawCountry.BLANK === 0 && profile.rawCountry.OTHER === 0 &&
    profile.rawCurrency.GTQ === EXPECTED_COUNTRY_AFTER.GT &&
    profile.rawCurrency.COP === EXPECTED_COUNTRY_AFTER.CO &&
    profile.rawCurrency.BLANK === EXPECTED_COUNTRY_AFTER.REQUIERE_VALIDACION &&
    profile.rawCurrency.REQUIERE_VALIDACION === 0 && profile.rawCurrency.OTHER === 0;
}

function countryProfileMatchesPrecondition(profile) {
  return profile.total === EXPECTED_CLIENTS &&
    profile.rawCountry.GT === EXPECTED_CLIENTS &&
    profile.rawCountry.CO === 0 && profile.rawCountry.REQUIERE_VALIDACION === 0 &&
    profile.rawCountry.BLANK === 0 && profile.rawCountry.OTHER === 0 &&
    profile.geographyEvidence.GT === EXPECTED_COUNTRY_AFTER.GT &&
    profile.geographyEvidence.CO === EXPECTED_COUNTRY_AFTER.CO &&
    profile.geographyEvidence.AMBIGUOUS === 0 &&
    profile.geographyEvidence.UNKNOWN + profile.geographyEvidence.BLANK === EXPECTED_COUNTRY_AFTER.REQUIERE_VALIDACION;
}

async function correctClientCountries(db, root, result) {
  const before = await clientCountryProfile(root);
  result.clientCountryProfile = before;
  if (countryProfileMatchesCorrected(before)) {
    result.countryCorrection = {
      ok: true,
      status: 'already_corrected',
      changed: 0,
      before: before.rawCountry,
      after: before.rawCountry,
      rollbackAvailable: true,
      auditIdHash: fingerprint(COUNTRY_AUDIT_ID)
    };
    return;
  }
  if (!countryProfileMatchesPrecondition(before)) throw new Error('CLIENT_COUNTRY_PRECONDITION_MISMATCH');

  const snapshot = await root.collection('clientes').get();
  const batch = db.batch();
  const rollback = [];
  const expected = { GT: 0, CO: 0, REQUIERE_VALIDACION: 0 };

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const afterPais = targetCountry(data);
    const afterMoneda = targetCurrency(afterPais);
    expected[afterPais] += 1;
    rollback.push({
      id: doc.id,
      beforePais: clean(data.pais),
      beforeMoneda: clean(data.moneda),
      afterPais,
      afterMoneda
    });
    batch.set(doc.ref, {
      pais: afterPais,
      moneda: afterMoneda,
      paisRequiereValidacion: afterPais === 'REQUIERE_VALIDACION',
      monedaRequiereValidacion: afterPais === 'REQUIERE_VALIDACION',
      paisFuente: afterPais === 'REQUIERE_VALIDACION' ? 'sin_evidencia_geografica_confiable' : 'geografia_fuente_validada',
      _migrationCountryCorrection: {
        schemaVersion: 'orbit360-client-country-correction-v1',
        reason: 'El payload inicial asignó GT por defecto; se restaura país desde geografía preservada y se marca lo no demostrable para validación.',
        correctedAt: FieldValue.serverTimestamp(),
        rollbackAuditId: COUNTRY_AUDIT_ID
      }
    }, { merge: true });
  }

  if (expected.GT !== EXPECTED_COUNTRY_AFTER.GT || expected.CO !== EXPECTED_COUNTRY_AFTER.CO || expected.REQUIERE_VALIDACION !== EXPECTED_COUNTRY_AFTER.REQUIERE_VALIDACION) {
    throw new Error(`CLIENT_COUNTRY_PLAN_MISMATCH:${expected.GT}/${expected.CO}/${expected.REQUIERE_VALIDACION}`);
  }

  const auditRef = root.collection('auditLog').doc(COUNTRY_AUDIT_ID);
  batch.set(auditRef, {
    schemaVersion: 'orbit360-client-country-correction-audit-v1',
    tenantId: TENANT_ID,
    action: 'correct_client_country_data_contract',
    classification: 'DATA_CONTRACT_FAILURE',
    reason: 'Los 414 clientes quedaron GT por defecto aunque la geografía preservada demuestra 234 GT, 15 CO y 165 pendientes de validación.',
    createdAt: FieldValue.serverTimestamp(),
    beforeCounts: before.rawCountry,
    afterCounts: expected,
    rollbackAvailable: true,
    rollback,
    containsPII: false,
    containsSecrets: false
  }, { merge: false });

  await batch.commit();
  const after = await clientCountryProfile(root);
  if (!countryProfileMatchesCorrected(after)) throw new Error('CLIENT_COUNTRY_POSTCONDITION_MISMATCH');
  result.clientCountryProfile = after;
  result.countryCorrection = {
    ok: true,
    status: 'corrected_with_audit_and_rollback',
    changed: snapshot.size,
    before: before.rawCountry,
    after: after.rawCountry,
    afterCurrency: after.rawCurrency,
    rollbackAvailable: true,
    auditIdHash: fingerprint(COUNTRY_AUDIT_ID)
  };
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
  await correctClientCountries(db, root, result);
  const snapshot = await insurers.get();
  const candidates = snapshot.docs.filter(doc => fingerprint(doc.id) === RECORD_HASH);

  if (result.beforeCount === EXPECTED_AFTER && candidates.length === 0) {
    result.ok = true;
    result.status = result.countryCorrection?.status === 'corrected_with_audit_and_rollback'
      ? 'country_corrected_placeholder_already_clean'
      : 'already_clean';
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
  try { result.clientCountryProfile = await clientCountryProfile(root); } catch {}
  writeResult(result);
  process.exit(53);
}
