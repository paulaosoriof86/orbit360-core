import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const OUTPUT = 'orbit360-platform/lab-data-counts.json';
const EXPECTED = { clientes: 414, aseguradoras: 26, asesores: 7 };

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errorCategory(error) {
  return String(error?.code || error?.message || 'count_read_failed')
    .replace(/[^a-z0-9/_-]/gi, '')
    .slice(0, 80);
}

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

function safeClass(value) {
  const text = normalize(value).replace(/\s+/g, '_').slice(0, 48);
  return text || 'sin_fuente';
}

function isoDate(value) {
  try {
    if (!value) return '';
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  } catch {
    return '';
  }
}

function recordDate(data) {
  const values = [
    data?.fuenteFecha,
    data?.sourceDate,
    data?.createdAt,
    data?.updatedAt,
    data?.actualizado,
    data?.trazabilidad?.fecha,
    Array.isArray(data?.actividad) && data.actividad[0]?.fecha
  ];
  for (const value of values) {
    const date = isoDate(value);
    if (date) return date;
  }
  return '';
}

async function countCollection(collectionRef, label) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const snapshot = await collectionRef.count().get();
      return Number(snapshot.data().count || 0);
    } catch (error) {
      lastError = error;
      const category = errorCategory(error);
      console.warn(`LAB_AGGREGATE_COUNT_RETRY:${label}:${attempt}:${category}`);
      if (category === '8' || attempt === 2) break;
      await wait(2000);
    }
  }
  throw lastError || new Error(`count_failed_${label}`);
}

async function inspectInsurers(collectionRef) {
  const snapshot = await collectionRef.get();
  const rows = snapshot.docs.map(doc => {
    const data = doc.data() || {};
    const name = clean(data.canonicalName || data.nombre || data.razonSocial);
    const country = clean(data.pais || data.country).toUpperCase().slice(0, 3) || 'SIN_PAIS';
    const source = safeClass(
      data.fuente ||
      data.origen ||
      data.trazabilidad?.origen ||
      data.fuenteDirectorio?.tipo ||
      data.fuenteDirectorio?.origen
    );
    const identity = `${normalize(name)}|${country}`;
    return {
      recordHash: fingerprint(doc.id),
      identityHash: fingerprint(identity),
      country,
      source,
      date: recordDate(data),
      hasName: Boolean(name),
      hasCountry: country !== 'SIN_PAIS',
      active: data.activa !== false,
      linked: data.vinculada === true
    };
  });

  const countryCounts = {};
  const sourceCounts = {};
  const identities = new Map();
  rows.forEach(row => {
    countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    const group = identities.get(row.identityHash) || [];
    group.push(row);
    identities.set(row.identityHash, group);
  });

  const duplicateIdentityGroups = [...identities.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([identityHash, group]) => ({
      identityHash,
      count: group.length,
      recordHashes: group.map(item => item.recordHash).sort(),
      countries: [...new Set(group.map(item => item.country))].sort(),
      sources: [...new Set(group.map(item => item.source))].sort()
    }));

  const recentRecords = rows
    .filter(row => row.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8)
    .map(({ recordHash, identityHash, country, source, date, active, linked }) => ({
      recordHash,
      identityHash,
      country,
      source,
      date,
      active,
      linked
    }));

  return {
    schemaVersion: 'orbit360-insurer-count-diagnostic-v1',
    total: rows.length,
    expected: EXPECTED.aseguradoras,
    extraCount: Math.max(0, rows.length - EXPECTED.aseguradoras),
    uniqueIdentityCount: identities.size,
    countryCounts,
    sourceCounts,
    duplicateIdentityGroups,
    missingNameCount: rows.filter(row => !row.hasName).length,
    missingCountryCount: rows.filter(row => !row.hasCountry).length,
    recentRecords,
    recordsAreHashed: true,
    containsPII: false,
    containsSecrets: false
  };
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (projectId !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);

const result = {
  schemaVersion: 'orbit360-lab-data-counts-v4-sanitized-diagnostic',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  canonicalPath: `tenantId/${TENANT_ID}`,
  counts: { clientes: 0, aseguradoras: 0, asesores: 0 },
  expected: EXPECTED,
  readyForVisualValidation: false,
  verificationMethod: 'firestore_count_aggregation_plus_hashed_insurer_diagnostic',
  readAttemptsBounded: true,
  readOnlyDiagnostic: true,
  containsPII: false,
  containsSecrets: false
};

try {
  const names = Object.keys(result.counts);
  const values = await Promise.all(names.map(name => countCollection(root.collection(name), name)));
  names.forEach((name, index) => { result.counts[name] = values[index]; });

  if (result.counts.aseguradoras !== EXPECTED.aseguradoras) {
    result.insurerDiagnostic = await inspectInsurers(root.collection('aseguradoras'));
  }

  result.readyForVisualValidation =
    result.counts.clientes === EXPECTED.clientes &&
    result.counts.aseguradoras === EXPECTED.aseguradoras &&
    result.counts.asesores >= EXPECTED.asesores;
} catch (error) {
  result.errorCategory = errorCategory(error);
  result.resourceExhausted = result.errorCategory === '8';
}

writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`LAB_DATA_COUNTS:${JSON.stringify(result.counts)}`);
console.log(`LAB_DATA_VISIBLE_READY:${result.readyForVisualValidation}`);
console.log(`LAB_DATA_COUNT_METHOD:${result.verificationMethod}`);
if (result.insurerDiagnostic) {
  console.log(`LAB_INSURER_DIAGNOSTIC:${JSON.stringify({
    total: result.insurerDiagnostic.total,
    expected: result.insurerDiagnostic.expected,
    extraCount: result.insurerDiagnostic.extraCount,
    uniqueIdentityCount: result.insurerDiagnostic.uniqueIdentityCount,
    duplicateGroups: result.insurerDiagnostic.duplicateIdentityGroups.length,
    countryCounts: result.insurerDiagnostic.countryCounts,
    sourceCounts: result.insurerDiagnostic.sourceCounts
  })}`);
}
if (result.errorCategory) console.error(`LAB_DATA_COUNT_ERROR:${result.errorCategory}`);

if (!result.readyForVisualValidation) process.exit(52);
