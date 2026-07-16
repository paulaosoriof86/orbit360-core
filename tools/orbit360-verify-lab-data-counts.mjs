import { writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const OUTPUT = 'orbit360-platform/lab-data-counts.json';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (projectId !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);

async function count(name) {
  const snapshot = await root.collection(name).get();
  return snapshot.size;
}

const counts = {
  clientes: await count('clientes'),
  aseguradoras: await count('aseguradoras'),
  asesores: await count('asesores')
};

const result = {
  schemaVersion: 'orbit360-lab-data-counts-v1',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  canonicalPath: `tenantId/${TENANT_ID}`,
  counts,
  expected: { clientes: 414, aseguradoras: 26, asesores: 7 },
  readyForVisualValidation: counts.clientes === 414 && counts.aseguradoras === 26 && counts.asesores >= 7,
  containsSecrets: false
};

writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`LAB_DATA_COUNTS:${JSON.stringify(counts)}`);
console.log(`LAB_DATA_VISIBLE_READY:${result.readyForVisualValidation}`);
