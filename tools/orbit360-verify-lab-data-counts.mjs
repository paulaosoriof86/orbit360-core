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

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (projectId !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);

const result = {
  schemaVersion: 'orbit360-lab-data-counts-v3',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  canonicalPath: `tenantId/${TENANT_ID}`,
  counts: { clientes: 0, aseguradoras: 0, asesores: 0 },
  expected: EXPECTED,
  readyForVisualValidation: false,
  verificationMethod: 'firestore_count_aggregation',
  readAttemptsBounded: true,
  containsPII: false,
  containsSecrets: false
};

try {
  const names = Object.keys(result.counts);
  const values = await Promise.all(names.map(name => countCollection(root.collection(name), name)));
  names.forEach((name, index) => { result.counts[name] = values[index]; });

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
if (result.errorCategory) console.error(`LAB_DATA_COUNT_ERROR:${result.errorCategory}`);

if (!result.readyForVisualValidation) process.exit(52);
