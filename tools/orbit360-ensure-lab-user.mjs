import { writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const STATUS_PATH = 'orbit360-platform/lab-advisor-status.json';
const FALLBACK_ARTIFACT_PATH = 'orbit360-platform/lab-data-counts.json';

const report = {
  schemaVersion: 'orbit360-lab-readiness-v5',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only',
  checks: {
    user: false,
    membership: false
  },
  delegatedChecks: {
    dataCounts: 'orbit360-verify-lab-data-counts.mjs'
  },
  writePerformed: false,
  containsPII: false,
  containsSecrets: false
};

function category(error, fallback) {
  return String(error?.code || error?.message || fallback)
    .replace(/[^a-z0-9/_-]/gi, '')
    .slice(0, 80);
}

function persistDiagnostic() {
  report.ok = Object.values(report.checks).every(Boolean);
  writeFileSync(STATUS_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    writeFileSync(FALLBACK_ARTIFACT_PATH, `${JSON.stringify({
      schemaVersion: 'orbit360-lab-readiness-diagnostic-v2',
      generatedAt: report.generatedAt,
      projectId: PROJECT_ID,
      tenantId: TENANT_ID,
      readyForVisualValidation: false,
      counts: {
        clientes: 0,
        aseguradoras: 0,
        asesores: 0
      },
      readiness: {
        checks: report.checks,
        delegatedChecks: report.delegatedChecks,
        userErrorCategory: report.userErrorCategory || '',
        membershipErrorCategory: report.membershipErrorCategory || '',
        bootstrapErrorCategory: report.bootstrapErrorCategory || '',
        writePerformed: false
      },
      containsPII: false,
      containsSecrets: false
    }, null, 2)}\n`);
  }
}

try {
  const runtimeProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (runtimeProject !== PROJECT_ID) throw new Error('wrong_lab_project');

  const app = getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    const user = await auth.getUser(EXPECTED_UID);
    report.checks.user = user.uid === EXPECTED_UID &&
      String(user.email || '').toLowerCase() === EXPECTED_EMAIL &&
      user.disabled !== true;
  } catch (error) {
    report.userErrorCategory = category(error, 'user_read_failed');
  }

  try {
    const member = await db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID).get();
    const data = member.exists ? (member.data() || {}) : {};
    report.checks.membership = member.exists &&
      String(data.tenantId || '') === TENANT_ID &&
      String(data.status || '').toLowerCase() === 'active';
  } catch (error) {
    report.membershipErrorCategory = category(error, 'membership_read_failed');
  }
} catch (error) {
  report.bootstrapErrorCategory = category(error, 'readiness_bootstrap_failed');
}

persistDiagnostic();
console.log(`LAB_ACCESS_READINESS:${JSON.stringify({
  ok: report.ok,
  checks: report.checks,
  delegatedChecks: report.delegatedChecks,
  userErrorCategory: report.userErrorCategory || '',
  membershipErrorCategory: report.membershipErrorCategory || '',
  bootstrapErrorCategory: report.bootstrapErrorCategory || '',
  writePerformed: false
})}`);

if (!report.ok) process.exit(49);
