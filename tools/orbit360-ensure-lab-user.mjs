import { readFileSync, writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const STATUS_PATH = 'orbit360-platform/lab-advisor-status.json';
const CONFIG_PATH = new URL('../orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json', import.meta.url);

function norm(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9@._+-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function identities(row) {
  return [...new Set([
    row?.id,
    row?.canonicalAdvisorKey,
    row?.nombre,
    row?.name,
    row?.displayName,
    row?.email,
    row?.correo,
    ...(Array.isArray(row?.aliases) ? row.aliases : [])
  ].map(norm).filter(Boolean))];
}

function intersects(left, right) {
  const index = new Set(identities(left));
  return identities(right).some(value => index.has(value));
}

function reconcileCount(canonicalRows, persistedRows) {
  const used = new Set();
  let count = 0;
  for (const canonical of canonicalRows) {
    const match = persistedRows.find(row => {
      if (!row || used.has(row.id)) return false;
      if (row.tenantId && row.tenantId !== TENANT_ID) return false;
      if (!(row.estado === 'activo' || row.activo === true)) return false;
      return row.id === canonical.id ||
        row.canonicalAdvisorKey === canonical.id ||
        intersects(canonical, row);
    });
    if (match) {
      used.add(match.id);
      count += 1;
    }
  }
  return count;
}

const runtimeProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID
});
const auth = getAuth(app);
const db = getFirestore(app);

const report = {
  schemaVersion: 'orbit360-lab-readiness-v3',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only',
  checks: {
    user: false,
    membership: false,
    advisors: false
  },
  counts: { advisorsMatched: 0 },
  writePerformed: false,
  containsPII: false,
  containsSecrets: false
};

try {
  const user = await auth.getUser(EXPECTED_UID);
  report.checks.user = user.uid === EXPECTED_UID &&
    String(user.email || '').toLowerCase() === EXPECTED_EMAIL &&
    user.disabled !== true;
} catch (error) {
  report.userErrorCategory = String(error?.code || 'user_read_failed').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80);
}

try {
  const member = await db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID).get();
  const data = member.exists ? (member.data() || {}) : {};
  report.checks.membership = member.exists &&
    String(data.tenantId || '') === TENANT_ID &&
    String(data.status || '').toLowerCase() === 'active';
} catch (error) {
  report.membershipErrorCategory = String(error?.code || 'membership_read_failed').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80);
}

try {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const canonicalRows = Array.isArray(config?.advisors) ? config.advisors : [];
  if (canonicalRows.length !== 7) throw new Error('invalid_advisor_config');

  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('asesores').get();
  const persistedRows = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  report.counts.advisorsMatched = reconcileCount(canonicalRows, persistedRows);
  report.checks.advisors = report.counts.advisorsMatched === 7;
} catch (error) {
  report.advisorErrorCategory = String(error?.code || error?.message || 'advisor_read_failed').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80);
}

report.ok = Object.values(report.checks).every(Boolean);
writeFileSync(STATUS_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`LAB_READINESS:${JSON.stringify({ ok: report.ok, checks: report.checks, counts: report.counts, writePerformed: false })}`);

if (!report.ok) process.exit(49);
