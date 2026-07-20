#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const MODE = process.argv[2] || 'prepare';
const RUN_ID = String(process.env.GITHUB_RUN_ID || Date.now());
const STATE_PATH = process.env.ORBIT360_IMPORTERS_E2E_STATE ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-state.json';
const CLEANUP_PATH = process.env.ORBIT360_IMPORTERS_E2E_CLEANUP ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-cleanup-sanitized.json';

if (String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '') !== PROJECT_ID) {
  throw new Error('BLOQUEO_PROYECTO_LAB');
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const root = db.collection('tenantId').doc(TENANT_ID);
const backendAudit = db.collection('tenants').doc(TENANT_ID).collection('auditEvents');
const operationalAudit = root.collection('auditLog');

function clean(value) { return String(value == null ? '' : value).trim(); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function count(ref) {
  const snap = await ref.count().get();
  return Number(snap.data().count || 0);
}
async function counts() {
  return {
    clientes: await count(root.collection('clientes')),
    aseguradoras: await count(root.collection('aseguradoras')),
    asesores: await count(root.collection('asesores'))
  };
}
async function deleteDocs(docs) {
  let deleted = 0;
  for (const doc of docs || []) {
    await doc.ref.delete();
    deleted += 1;
  }
  return deleted;
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function prepare() {
  const executionId = `importers_e2e_${RUN_ID}`;
  const fixtureId = `asg_gate_${crypto.createHash('sha256').update(executionId).digest('hex').slice(0, 16)}`;
  const sheetName = `ORBIT GATE ${RUN_ID.slice(-8)}`;
  const portalId = `platform_${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)}_01`;
  const fixtureUrl = `https://gate-${RUN_ID.slice(-8)}.invalid/login`;
  const fixtureUser = `gate_${RUN_ID.slice(-8)}`;
  const fixtureValue = `Synthetic-${crypto.randomBytes(12).toString('hex')}!`;
  const xlsxPath = path.join(process.env.RUNNER_TEMP || '/tmp', `orbit360-importer-e2e-${RUN_ID}.xlsx`);
  const rows = [
    [sheetName],
    ['ACCESOS AL SISTEMA EN LINEA'],
    ['Producto', 'Link', 'Usuario', 'Contraseña'],
    ['Portal E2E', fixtureUrl, fixtureUser, fixtureValue]
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  XLSX.writeFile(workbook, xlsxPath);
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(xlsxPath)).digest('hex');
  const credentialRef = `cred_${crypto.createHash('sha256').update(`${TENANT_ID}|${fixtureId}|${portalId}`).digest('hex').slice(0, 32)}`;
  const before = await counts();
  const insurerRef = root.collection('aseguradoras').doc(fixtureId);

  await insurerRef.set({
    id: fixtureId,
    tenantId: TENANT_ID,
    nombre: sheetName,
    pais: 'GT',
    monedaBase: 'GTQ',
    entityType: 'insurer',
    vinculada: true,
    activa: true,
    contactos: [],
    cuentas: [],
    ramos: [],
    docs: [],
    portales: [{
      id: portalId,
      nombre: 'Portal E2E',
      url: fixtureUrl,
      urlHint: new URL(fixtureUrl).hostname,
      tipo: 'Plataforma',
      credentialRef: 'backend_required',
      estadoAcceso: 'Pendiente conexión segura',
      fuenteTraza: {
        archivo: path.basename(xlsxPath),
        hoja: sheetName,
        fila: 4,
        bloque: 'plataformas',
        pais: 'GT'
      }
    }],
    fuente: 'fixture_sintetico_gate',
    fuenteDirectorio: {
      archivo: path.basename(xlsxPath),
      hoja: sheetName,
      pais: 'GT',
      tipo: 'directorio_aseguradoras'
    },
    sensitiveImportStatus: {
      credentialsDetected: 1,
      accountsDetected: 0,
      status: 'backend_required'
    },
    requiereValidacion: false,
    validacionAlertas: [],
    createdAt: new Date().toISOString()
  });

  const during = await counts();
  if (during.aseguradoras !== before.aseguradoras + 1) throw new Error('FIXTURE_COUNT_MISMATCH');

  const state = {
    schemaVersion: 'orbit360-importers-e2e-state-v1',
    runId: RUN_ID,
    executionId,
    tenantId: TENANT_ID,
    fixtureId,
    portalId,
    sheetName,
    fixtureUrl,
    xlsxPath,
    sourceHash,
    credentialRef,
    countsBefore: before,
    countsDuring: during,
    containsPII: false,
    containsSecrets: false
  };
  writeJson(STATE_PATH, state);
  console.log('ORBIT360_IMPORTERS_E2E_FIXTURE_READY');
}

async function cleanup() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  const result = {
    schemaVersion: 'orbit360-importers-e2e-cleanup-v1',
    runId: state.runId,
    insurerDeleted: false,
    backendAuditDeleted: 0,
    operationalAuditDeleted: 0,
    countsRestored: false,
    containsPII: false,
    containsSecrets: false
  };

  const insurerRef = root.collection('aseguradoras').doc(state.fixtureId);
  await insurerRef.delete();
  result.insurerDeleted = !(await insurerRef.get()).exists;

  const success = await backendAudit.where('sourceHash', '==', state.sourceHash).get();
  const target = await backendAudit.where('insurerId', '==', state.fixtureId).get();
  const unique = new Map();
  [...success.docs, ...target.docs].forEach(doc => unique.set(doc.id, doc));
  result.backendAuditDeleted = await deleteDocs([...unique.values()]);

  try {
    const audit = await operationalAudit.where('detalle.sourceHash', '==', state.sourceHash).get();
    result.operationalAuditDeleted = await deleteDocs(audit.docs);
  } catch (error) {
    result.operationalAuditError = clean(error?.code || error?.message || 'audit_cleanup_failed').replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100);
  }

  try { fs.rmSync(state.xlsxPath, { force: true }); } catch {}
  await wait(1000);
  result.countsAfter = await counts();
  result.countsRestored =
    result.countsAfter.clientes === state.countsBefore.clientes &&
    result.countsAfter.aseguradoras === state.countsBefore.aseguradoras &&
    result.countsAfter.asesores === state.countsBefore.asesores;
  writeJson(CLEANUP_PATH, result);
  console.log(`ORBIT360_IMPORTERS_E2E_FIXTURE_CLEANUP:${result.countsRestored}`);
}

if (MODE === 'prepare') await prepare();
else if (MODE === 'cleanup') await cleanup();
else throw new Error('MODE_INVALID');
