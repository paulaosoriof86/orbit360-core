import { readFileSync, writeFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const EXPECTED_SERVICE_ACCOUNT_EMAIL = 'firebase-adminsdk-fbsvc@ays-orbit-360-lab.iam.gserviceaccount.com';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const TENANT_ID = 'alianzas-soluciones';
const STATUS_PATH = 'orbit360-platform/lab-advisor-status.json';

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function sanitizeApiMessage(value) {
  return String(value || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/"private_key"\s*:\s*"[^"]+"/gi, '"private_key":"[REDACTED]"')
    .slice(0, 500);
}

function classify(error) {
  const value = `${error?.code || ''} ${error?.message || error || ''}`;
  if (/permission|forbidden|not authorized|403|7 PERMISSION/i.test(value)) return 'permission_denied';
  return 'bootstrap_failed';
}

const password = process.env.ORBIT360_LAB_LOGIN_PASSWORD || '';
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

if (!credentialsPath) fail('BLOQUEO_CREDENCIAL: GOOGLE_APPLICATION_CREDENTIALS no está definido.', 41);
if (projectId !== EXPECTED_PROJECT_ID) fail('BLOQUEO_PROYECTO: la ejecución no corresponde al proyecto LAB autorizado.', 42);
if (password.length < 12) fail('BLOQUEO_PASSWORD: ORBIT360_LAB_LOGIN_PASSWORD debe tener al menos 12 caracteres.', 43);

let credentialJson;
try {
  credentialJson = JSON.parse(readFileSync(credentialsPath, 'utf8'));
} catch {
  fail('BLOQUEO_CREDENCIAL: no fue posible leer la credencial LAB.', 46);
}

const serviceAccountEmail = String(credentialJson?.client_email || '').trim().toLowerCase();
if (serviceAccountEmail !== EXPECTED_SERVICE_ACCOUNT_EMAIL) {
  console.error('SERVICE_ACCOUNT_MATCH:false');
  fail('BLOQUEO_CUENTA_SERVICIO: el secreto de GitHub no corresponde a la cuenta autorizada para reglas LAB.', 47);
}
console.log('SERVICE_ACCOUNT_MATCH:true');
console.log(`SERVICE_ACCOUNT_EMAIL:${serviceAccountEmail}`);

const credential = applicationDefault();
const app = getApps()[0] || initializeApp({ credential, projectId: EXPECTED_PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

try {
  const tokenResult = await credential.getAccessToken();
  const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/rulesets?pageSize=1`, {
    headers: { Authorization: `Bearer ${tokenResult.access_token}` }
  });
  const payload = await response.json().catch(() => ({}));
  const status = payload?.error?.status || (response.ok ? 'OK' : 'UNKNOWN');
  const message = payload?.error?.message || '';
  console.log(`FIREBASE_RULES_API_STATUS:${response.status}`);
  console.log(`FIREBASE_RULES_API_RESULT:${status}`);
  if (!response.ok) console.log(`FIREBASE_RULES_API_MESSAGE:${sanitizeApiMessage(message)}`);
} catch (error) {
  console.log('FIREBASE_RULES_API_STATUS:ERROR');
  console.log(`FIREBASE_RULES_API_MESSAGE:${sanitizeApiMessage(error?.message)}`);
}

let byUid = null;
let byEmail = null;
try { byUid = await auth.getUser(EXPECTED_UID); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
try { byEmail = await auth.getUserByEmail(EXPECTED_EMAIL); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
if (byUid && byUid.email !== EXPECTED_EMAIL) fail('BLOQUEO_IDENTIDAD: el UID LAB esperado ya pertenece a otro correo.', 44);
if (byEmail && byEmail.uid !== EXPECTED_UID) fail('BLOQUEO_IDENTIDAD: el correo LAB ya existe con un UID diferente.', 45);

let user;
if (!byUid && !byEmail) {
  user = await auth.createUser({ uid: EXPECTED_UID, email: EXPECTED_EMAIL, password, displayName: 'Orbit 360 A&S LAB', emailVerified: true, disabled: false });
} else {
  user = await auth.updateUser(EXPECTED_UID, { email: EXPECTED_EMAIL, password, displayName: 'Orbit 360 A&S LAB', emailVerified: true, disabled: false });
}

const diagnostic = {
  schemaVersion: 'orbit360-lab-advisor-status-v1',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  serviceAccountMatch: true,
  membership: { ok: false, category: 'not_run' },
  advisors: { ok: false, category: 'not_run' },
  containsSecrets: false
};

try {
  const memberRef = db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID);
  await memberRef.set({
    uid: EXPECTED_UID,
    email: EXPECTED_EMAIL,
    tenantId: TENANT_ID,
    displayName: user.displayName || 'Orbit 360 A&S LAB',
    role: 'Dirección',
    status: 'active',
    labOnly: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: 'github-actions-lab-bootstrap',
    updatedBy: 'github-actions-lab-bootstrap'
  }, { merge: true });
  diagnostic.membership = { ok: true, category: 'ok' };
} catch (error) {
  diagnostic.membership = { ok: false, category: classify(error), code: String(error?.code || '').slice(0, 80), message: sanitizeApiMessage(error?.message) };
}

try {
  await import('./orbit360-ensure-lab-advisors.mjs');
  diagnostic.advisors = { ok: true, category: 'ok', count: 7 };
} catch (error) {
  diagnostic.advisors = { ok: false, category: classify(error), code: String(error?.code || '').slice(0, 80), message: sanitizeApiMessage(error?.message) };
}

writeFileSync(STATUS_PATH, JSON.stringify(diagnostic, null, 2));
console.log(`MEMBERSHIP_RESULT:${diagnostic.membership.category}`);
console.log(`ADVISOR_CATALOG_RESULT:${diagnostic.advisors.category}`);
console.log(JSON.stringify({
  ok: diagnostic.membership.ok && diagnostic.advisors.ok,
  projectId: EXPECTED_PROJECT_ID,
  serviceAccountMatch: true,
  tenantId: TENANT_ID,
  uid: EXPECTED_UID,
  email: EXPECTED_EMAIL,
  membershipSynchronized: diagnostic.membership.ok,
  advisorCatalogSynchronized: diagnostic.advisors.ok,
  passwordExposed: false
}));
