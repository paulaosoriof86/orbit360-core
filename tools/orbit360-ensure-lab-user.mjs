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
const ADVISOR_CONFIG_PATH = new URL('../orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json', import.meta.url);

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
  if (/quota|too many|resource.exhausted|429/i.test(value)) return 'quota_limited';
  return 'bootstrap_failed';
}

const password = process.env.ORBIT360_LAB_LOGIN_PASSWORD || '';
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const forceBootstrap = String(process.env.ORBIT360_LAB_FORCE_BOOTSTRAP || '').toLowerCase() === 'true';

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
  fail('BLOQUEO_CUENTA_SERVICIO: el secreto de GitHub no corresponde a la cuenta autorizada para LAB.', 47);
}
console.log('SERVICE_ACCOUNT_MATCH:true');

const credential = applicationDefault();
const app = getApps()[0] || initializeApp({ credential, projectId: EXPECTED_PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);
const diagnostic = {
  schemaVersion: 'orbit360-lab-advisor-status-v2',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  serviceAccountMatch: true,
  mode: forceBootstrap ? 'forced_bootstrap' : 'idempotent_verify',
  user: { ok: false, category: 'not_run', writePerformed: false },
  membership: { ok: false, category: 'not_run', writePerformed: false },
  advisors: { ok: false, category: 'not_run', count: 0, writePerformed: false },
  dataCounts: { ok: false, category: 'not_run' },
  containsPII: false,
  containsSecrets: false
};

let byUid = null;
let byEmail = null;
try { byUid = await auth.getUser(EXPECTED_UID); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
try { byEmail = await auth.getUserByEmail(EXPECTED_EMAIL); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
if (byUid && String(byUid.email || '').toLowerCase() !== EXPECTED_EMAIL) fail('BLOQUEO_IDENTIDAD: el UID LAB esperado ya pertenece a otro correo.', 44);
if (byEmail && byEmail.uid !== EXPECTED_UID) fail('BLOQUEO_IDENTIDAD: el correo LAB ya existe con un UID diferente.', 45);

let user = byUid || byEmail;
try {
  if (!user) {
    user = await auth.createUser({
      uid: EXPECTED_UID,
      email: EXPECTED_EMAIL,
      password,
      displayName: 'Orbit 360 A&S LAB',
      emailVerified: true,
      disabled: false
    });
    diagnostic.user = { ok: true, category: 'created_missing_user', writePerformed: true };
  } else if (forceBootstrap) {
    user = await auth.updateUser(EXPECTED_UID, {
      email: EXPECTED_EMAIL,
      password,
      displayName: 'Orbit 360 A&S LAB',
      emailVerified: true,
      disabled: false
    });
    diagnostic.user = { ok: true, category: 'forced_update', writePerformed: true };
  } else {
    const valid = user.uid === EXPECTED_UID &&
      String(user.email || '').toLowerCase() === EXPECTED_EMAIL &&
      user.disabled !== true;
    diagnostic.user = { ok: valid, category: valid ? 'verified_no_write' : 'invalid_existing_user', writePerformed: false };
  }
} catch (error) {
  diagnostic.user = {
    ok: false,
    category: classify(error),
    code: String(error?.code || '').slice(0, 80),
    message: sanitizeApiMessage(error?.message),
    writePerformed: false
  };
}

const memberRef = db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID);
try {
  const existing = await memberRef.get();
  const current = existing.exists ? (existing.data() || {}) : {};
  const valid = existing.exists &&
    String(current.tenantId || '') === TENANT_ID &&
    String(current.status || '').toLowerCase() === 'active';

  if (!valid && (!existing.exists || forceBootstrap || diagnostic.user.writePerformed)) {
    await memberRef.set({
      uid: EXPECTED_UID,
      email: EXPECTED_EMAIL,
      tenantId: TENANT_ID,
      displayName: user?.displayName || 'Orbit 360 A&S LAB',
      role: 'Dirección',
      status: 'active',
      labOnly: true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'github-actions-lab-bootstrap'
    }, { merge: true });
    diagnostic.membership = { ok: true, category: existing.exists ? 'repaired' : 'created_missing_membership', writePerformed: true };
  } else {
    diagnostic.membership = { ok: valid, category: valid ? 'verified_no_write' : 'invalid_existing_membership', writePerformed: false };
  }
} catch (error) {
  diagnostic.membership = {
    ok: false,
    category: classify(error),
    code: String(error?.code || '').slice(0, 80),
    message: sanitizeApiMessage(error?.message),
    writePerformed: false
  };
}

try {
  const config = JSON.parse(readFileSync(ADVISOR_CONFIG_PATH, 'utf8'));
  const expectedIds = Array.isArray(config?.advisors) ? config.advisors.map(row => String(row?.id || '').trim()).filter(Boolean) : [];
  if (expectedIds.length !== 7) throw new Error('BLOQUEO_CONFIG_ASESORES_CONTEO');

  const root = db.collection('tenantId').doc(TENANT_ID).collection('asesores');
  const snapshots = await Promise.all(expectedIds.map(id => root.doc(id).get()));
  const validCount = snapshots.filter(snapshot => {
    if (!snapshot.exists) return false;
    const data = snapshot.data() || {};
    return data.tenantId === TENANT_ID && data.configSource === 'configuracion_catalogo' && data.estado === 'activo';
  }).length;

  if (validCount === 7) {
    diagnostic.advisors = { ok: true, category: 'verified_no_write', count: 7, writePerformed: false };
  } else if (forceBootstrap || diagnostic.user.writePerformed || diagnostic.membership.writePerformed) {
    await import('./orbit360-ensure-lab-advisors.mjs');
    const reread = await Promise.all(expectedIds.map(id => root.doc(id).get()));
    const repairedCount = reread.filter(snapshot => {
      if (!snapshot.exists) return false;
      const data = snapshot.data() || {};
      return data.tenantId === TENANT_ID && data.configSource === 'configuracion_catalogo' && data.estado === 'activo';
    }).length;
    diagnostic.advisors = { ok: repairedCount === 7, category: repairedCount === 7 ? 'repaired' : 'repair_incomplete', count: repairedCount, writePerformed: true };
  } else {
    diagnostic.advisors = { ok: false, category: 'incomplete_existing_catalog', count: validCount, writePerformed: false };
  }
} catch (error) {
  diagnostic.advisors = {
    ok: false,
    category: classify(error),
    count: 0,
    code: String(error?.code || '').slice(0, 80),
    message: sanitizeApiMessage(error?.message),
    writePerformed: false
  };
}

try {
  await import('./orbit360-verify-lab-data-counts.mjs');
  diagnostic.dataCounts = { ok: true, category: 'published' };
} catch (error) {
  diagnostic.dataCounts = {
    ok: false,
    category: classify(error),
    code: String(error?.code || '').slice(0, 80),
    message: sanitizeApiMessage(error?.message)
  };
}

writeFileSync(STATUS_PATH, JSON.stringify(diagnostic, null, 2));
console.log(`LAB_USER_RESULT:${diagnostic.user.category}`);
console.log(`MEMBERSHIP_RESULT:${diagnostic.membership.category}`);
console.log(`ADVISOR_CATALOG_RESULT:${diagnostic.advisors.category}`);
console.log(`DATA_COUNTS_RESULT:${diagnostic.dataCounts.category}`);
console.log(JSON.stringify({
  ok: diagnostic.user.ok && diagnostic.membership.ok && diagnostic.advisors.ok,
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  userVerified: diagnostic.user.ok,
  membershipVerified: diagnostic.membership.ok,
  advisorCatalogVerified: diagnostic.advisors.ok,
  advisorCount: diagnostic.advisors.count,
  writePerformed: diagnostic.user.writePerformed || diagnostic.membership.writePerformed || diagnostic.advisors.writePerformed,
  passwordExposed: false
}));

if (!diagnostic.user.ok) fail('BLOQUEO_USUARIO_LAB_NO_VERIFICADO', 50);
if (!diagnostic.membership.ok) fail('BLOQUEO_MEMBRESIA_LAB_NO_VERIFICADA', 48);
if (!diagnostic.advisors.ok) fail('BLOQUEO_CATALOGO_ASESORES_NO_VERIFICADO', 49);
