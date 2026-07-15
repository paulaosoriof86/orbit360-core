import { readFileSync } from 'node:fs';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const CONFIG_PATH = new URL('../orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json', import.meta.url);

function sanitize(value) {
  return String(value || '').replace(/\s+/g, ' ').slice(0, 240);
}

const runtimeProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_ASESORES');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
if (config?.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('BLOQUEO_CONFIG_ASESORES_SCHEMA');
if (config?.tenantId !== TENANT_ID) throw new Error('BLOQUEO_CONFIG_ASESORES_TENANT');
if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('BLOQUEO_CONFIG_ASESORES_CONTEO');

const ids = new Set();
const names = new Set();
for (const row of config.advisors) {
  const id = String(row?.id || '').trim();
  const name = String(row?.nombre || '').trim();
  if (!id || !name || row?.estado !== 'activo') throw new Error('BLOQUEO_CONFIG_ASESORES_REGISTRO');
  if (ids.has(id) || names.has(name.toLowerCase())) throw new Error('BLOQUEO_CONFIG_ASESORES_DUPLICADO');
  ids.add(id);
  names.add(name.toLowerCase());
}

let adminVerified = false;
let fallbackReason = '';

try {
  const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore(app);
  const tenantRoot = db.collection('tenantId').doc(TENANT_ID);
  const batch = db.batch();

  for (const row of config.advisors) {
    const ref = tenantRoot.collection('asesores').doc(row.id);
    const initials = row.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
    batch.set(ref, {
      id: row.id,
      tenantId: TENANT_ID,
      nombre: row.nombre,
      name: row.nombre,
      displayName: row.nombre,
      aliases: Array.isArray(row.aliases) ? row.aliases : [],
      roles: Array.isArray(row.roles) ? row.roles : [],
      rol: row.rolDefault || 'Asesor',
      rolDefault: row.rolDefault || 'Asesor',
      scopeDatos: row.scopeDatos || 'propios',
      estado: 'activo',
      activo: true,
      iniciales,
      configSource: 'configuracion_catalogo',
      configSchemaVersion: config.schemaVersion,
      configEffectiveDate: config.effectiveDate,
      labOnly: true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'github-actions-lab-advisor-bootstrap'
    }, { merge: true });
  }

  batch.set(tenantRoot.collection('configuracion_catalogo').doc('asesores-activos'), {
    id: 'asesores-activos',
    tenantId: TENANT_ID,
    schemaVersion: config.schemaVersion,
    source: config.source,
    effectiveDate: config.effectiveDate,
    advisorIds: config.advisors.map(row => row.id),
    advisorCount: config.advisors.length,
    status: 'active',
    labOnly: true,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'github-actions-lab-advisor-bootstrap'
  }, { merge: true });

  await batch.commit();

  const snapshots = await Promise.all(
    config.advisors.map(row => tenantRoot.collection('asesores').doc(row.id).get())
  );
  adminVerified = snapshots.every(snapshot => {
    if (!snapshot.exists) return false;
    const data = snapshot.data() || {};
    return data.tenantId === TENANT_ID && data.configSource === 'configuracion_catalogo' && data.estado === 'activo';
  });

  if (!adminVerified) fallbackReason = 'ADMIN_READBACK_INCOMPLETE';
} catch (error) {
  fallbackReason = sanitize(error?.code || error?.message || error);
}

console.log(JSON.stringify({
  ok: true,
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  advisorCount: config.advisors.length,
  adminVerified,
  browserAuthorizedFallback: !adminVerified,
  fallbackReason,
  source: config.source
}));