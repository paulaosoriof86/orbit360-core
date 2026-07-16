import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const OUTPUT = 'orbit360-platform/lab-aseguradoras-knowledge-inventory.json';
const SUMMARY_FILE = 'orbit360-platform/data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js';

const COLLECTIONS = {
  manifests: 'aseguradora_manifiestos',
  proposals: 'aseguradora_propuestas',
  tariffRules: 'aseguradora_reglas_tarifarias',
  presentations: 'aseguradora_presentaciones',
  bindings: 'aseguradora_bindings',
  reviews: 'aseguradora_revisiones'
};

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function norm(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function loadExpectedSummary() {
  const source = readFileSync(SUMMARY_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: SUMMARY_FILE });
  const registries = sandbox.window.OrbitTenantInsurerKnowledgeSummaries || [];
  const registry = registries.find((item) => clean(item?.tenantId) === TENANT_ID);
  if (!registry) throw new Error('BLOQUEO_RESUMEN_MAPEO_NO_ENCONTRADO');
  return registry;
}

function stateOf(row) {
  return clean(row?.estado || row?.status || 'sin_estado');
}

function enabledOf(row) {
  return row?.enabled === true || row?.enabledCotizador === true || row?.enabledComparativo === true || row?.enabledCotizadorAutomatico === true;
}

function safeInsurer(row) {
  return {
    id: clean(row.id),
    nombre: clean(row.nombre || row.displayName || row.canonicalName),
    pais: clean(row.pais).toUpperCase(),
    vinculada: row.vinculada !== false,
    docsCount: Array.isArray(row.docs) ? row.docs.length : 0
  };
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (projectId !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);
const expected = loadExpectedSummary();

const insurerSnapshot = await root.collection('aseguradoras').get();
const insurers = insurerSnapshot.docs.map((doc) => safeInsurer({ id: doc.id, ...doc.data() }));

const rowsByCollection = {};
for (const [key, collection] of Object.entries(COLLECTIONS)) {
  const snapshot = await root.collection(collection).get();
  rowsByCollection[key] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

const expectedInsurers = (expected.insurers || []).map((entry) => {
  const names = [entry.insurerName, ...(entry.aliases || [])].map(norm).filter(Boolean);
  const insurer = insurers.find((candidate) => names.includes(norm(candidate.nombre)));
  const insurerId = insurer?.id || '';
  const counts = {};
  const statuses = {};
  let enabledRecords = 0;

  for (const key of Object.keys(COLLECTIONS)) {
    const rows = rowsByCollection[key].filter((row) => clean(row.aseguradoraId || row.insurerId) === insurerId);
    counts[key] = rows.length;
    statuses[key] = rows.reduce((acc, row) => {
      const state = stateOf(row);
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    enabledRecords += rows.filter(enabledOf).length;
  }

  const mappedSources = Array.isArray(entry.sources) ? entry.sources.length : 0;
  const operationalRecords = counts.manifests + counts.proposals + counts.tariffRules + counts.presentations + counts.bindings + counts.reviews;

  return {
    insurerName: clean(entry.insurerName),
    insurerId,
    matchedDirectory: Boolean(insurerId),
    pais: insurer?.pais || 'REQUIERE_VALIDACION',
    directoryDocs: insurer?.docsCount || 0,
    mappedSources,
    mappedDocumentIds: (entry.sources || []).map((source) => clean(source.documentId)).filter(Boolean),
    counts,
    statuses,
    enabledRecords,
    operationalRecords,
    syncState: !insurerId
      ? 'DIRECTORY_MATCH_REQUIRED'
      : operationalRecords === 0
        ? 'MAPPED_NOT_PERSISTED'
        : counts.tariffRules === 0 && counts.presentations === 0
          ? 'PARTIAL_METADATA_ONLY'
          : 'OPERATIONAL_COLLECTIONS_PRESENT'
  };
});

const totals = Object.fromEntries(
  Object.keys(COLLECTIONS).map((key) => [key, rowsByCollection[key].length])
);
const mappedSourcesTotal = expectedInsurers.reduce((sum, item) => sum + item.mappedSources, 0);
const matchedInsurers = expectedInsurers.filter((item) => item.matchedDirectory).length;
const enabledRecords = expectedInsurers.reduce((sum, item) => sum + item.enabledRecords, 0);

const result = {
  schemaVersion: 'orbit360-lab-aseguradoras-knowledge-inventory-v1',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  canonicalPath: `tenantId/${TENANT_ID}`,
  sourceSummaryVersion: clean(expected.version),
  directoryInsurers: insurers.length,
  expectedMappedInsurers: expectedInsurers.length,
  matchedMappedInsurers: matchedInsurers,
  mappedSourcesTotal,
  totals,
  enabledRecords,
  insurers: expectedInsurers,
  gates: {
    directoryReady: insurers.length >= 26,
    mappedSummaryReady: expectedInsurers.length === 6 && mappedSourcesTotal === 11,
    allMappedInsurersMatched: matchedInsurers === expectedInsurers.length,
    noAutomaticEnablementFromSummary: enabledRecords === 0,
    operationalSyncComplete: expectedInsurers.every((item) => item.syncState === 'OPERATIONAL_COLLECTIONS_PRESENT')
  },
  containsCommercialRates: false,
  containsPII: false,
  containsSecrets: false,
  containsRawDocuments: false
};

writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`ASEGURADORAS_KNOWLEDGE_INVENTORY:${JSON.stringify({
  directoryInsurers: result.directoryInsurers,
  mappedInsurers: result.expectedMappedInsurers,
  matchedInsurers: result.matchedMappedInsurers,
  mappedSources: result.mappedSourcesTotal,
  totals: result.totals,
  enabledRecords: result.enabledRecords,
  operationalSyncComplete: result.gates.operationalSyncComplete
})}`);
