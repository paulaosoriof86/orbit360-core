import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const TENANT_ID = 'alianzas-soluciones';

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const password = process.env.ORBIT360_LAB_LOGIN_PASSWORD || '';
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  fail('BLOQUEO_CREDENCIAL: GOOGLE_APPLICATION_CREDENTIALS no está definido.', 41);
}
if (projectId !== EXPECTED_PROJECT_ID) {
  fail('BLOQUEO_PROYECTO: la ejecución no corresponde al proyecto LAB autorizado.', 42);
}
if (password.length < 12) {
  fail('BLOQUEO_PASSWORD: ORBIT360_LAB_LOGIN_PASSWORD debe tener al menos 12 caracteres.', 43);
}

const app = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId: EXPECTED_PROJECT_ID
});
const auth = getAuth(app);
const db = getFirestore(app);

let byUid = null;
let byEmail = null;

try { byUid = await auth.getUser(EXPECTED_UID); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }

try { byEmail = await auth.getUserByEmail(EXPECTED_EMAIL); }
catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }

if (byUid && byUid.email !== EXPECTED_EMAIL) {
  fail('BLOQUEO_IDENTIDAD: el UID LAB esperado ya pertenece a otro correo.', 44);
}
if (byEmail && byEmail.uid !== EXPECTED_UID) {
  fail('BLOQUEO_IDENTIDAD: el correo LAB ya existe con un UID diferente.', 45);
}

let user;
if (!byUid && !byEmail) {
  user = await auth.createUser({
    uid: EXPECTED_UID,
    email: EXPECTED_EMAIL,
    password,
    displayName: 'Orbit 360 A&S LAB',
    emailVerified: true,
    disabled: false
  });
  console.log('Usuario LAB creado con identidad canónica.');
} else {
  user = await auth.updateUser(EXPECTED_UID, {
    email: EXPECTED_EMAIL,
    password,
    displayName: 'Orbit 360 A&S LAB',
    emailVerified: true,
    disabled: false
  });
  console.log('Usuario LAB actualizado con identidad canónica.');
}

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

console.log('Membresía LAB activa y verificada para alianzas-soluciones.');
console.log(JSON.stringify({
  ok: true,
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  uid: EXPECTED_UID,
  email: EXPECTED_EMAIL,
  passwordExposed: false
}));
