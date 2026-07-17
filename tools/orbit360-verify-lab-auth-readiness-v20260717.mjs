import { writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const OUTPUT = 'orbit360-platform/lab-auth-readiness.json';

const runtimeProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB');

const app = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID
});
const auth = getAuth(app);
const db = getFirestore(app);

const report = {
  schemaVersion: 'orbit360-lab-auth-readiness-v1',
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  checks: {
    userExists: false,
    uidMatches: false,
    emailMatches: false,
    userEnabled: false,
    membershipExists: false,
    membershipActive: false,
    membershipTenantMatches: false,
    advisorsAtLeastSeven: false
  },
  counts: { advisors: 0 },
  containsPII: false,
  containsSecrets: false,
  writePerformed: false
};

try {
  const user = await auth.getUser(EXPECTED_UID);
  report.checks.userExists = true;
  report.checks.uidMatches = user.uid === EXPECTED_UID;
  report.checks.emailMatches = String(user.email || '').toLowerCase() === EXPECTED_EMAIL;
  report.checks.userEnabled = user.disabled !== true;

  const member = await db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID).get();
  report.checks.membershipExists = member.exists;
  if (member.exists) {
    const data = member.data() || {};
    report.checks.membershipActive = String(data.status || '').toLowerCase() === 'active';
    report.checks.membershipTenantMatches = String(data.tenantId || '') === TENANT_ID;
  }

  const advisors = await db.collection('tenantId').doc(TENANT_ID).collection('asesores')
    .where('estado', '==', 'activo')
    .get();
  report.counts.advisors = advisors.size;
  report.checks.advisorsAtLeastSeven = advisors.size >= 7;
} catch (error) {
  report.errorCategory = String(error?.code || error?.message || 'READINESS_FAILED')
    .replace(/[^a-z0-9/_-]/gi, '')
    .slice(0, 100);
}

report.ok = Object.values(report.checks).every(Boolean);
writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`LAB_AUTH_READINESS:${JSON.stringify({ ok: report.ok, checks: report.checks, counts: report.counts, errorCategory: report.errorCategory || '' })}`);

if (!report.ok) process.exit(51);
