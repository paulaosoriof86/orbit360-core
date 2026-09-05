'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { validateActiveLedgerContract } = require('./cobros-ledger-contract');
const { normalizeRole, resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-cobros-reconciliation-domain-v2-active-ledger';
const CONTRACT_VERSION = '10.10.2';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin', 'operativo', 'finanzas']);
const PERMISSIONS = new Set(['cobros_manage', 'conciliaciones_manage', 'payments_reconcile']);
const OPERATIONS = new Set(['preview_policy', 'register_evidence', 'confirm_application', 'hold_proposal', 'reopen_proposal']);

const text = (value, max = 1000) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const id = (value, label) => {
  const out = text(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
};
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const now = () => FieldValue.serverTimestamp();

function tenantData(tenantId, collection) {
  return db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items');
}
function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('reconciliationRequests').doc(requestId);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('reconciliationEvents').doc(eventId);
}
function controlRef(tenantId) {
  return tenantData(tenantId, 'cobrosLedgerControl').doc('active');
}
function runRef(tenantId, runId) {
  return tenantData(tenantId, 'cobrosLedgerRuns').doc(runId);
}
function stageRef(tenantId, runId, collection, entityId) {
  return runRef(tenantId, runId).collection(collection).doc(entityId);
}
function stageCollection(tenantId, runId, collection) {
  return runRef(tenantId, runId).collection(collection);
}

function permissions(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(normalizeRole);
}
function active(member) {
  const state = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(state);
}
function canManage(activeRole, member) {
  return ADMIN_ROLES.has(activeRole) || permissions(member).some(permission => PERMISSIONS.has(permission));
}
async function authorize(request, operation) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = id(request.data && request.data.tenantId, 'tenantId');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!active(member)) throw new HttpsError('permission-denied', 'Membresía inactiva.');
  let roleState;
  try {
    roleState = resolveProductActiveRole(member, request.data && request.data.activeRole);
  } catch (error) {
    throw new HttpsError('permission-denied', error && error.code === 'PRODUCT_ASSIGNED_ROLES_MISSING' ? 'La membresía no tiene roles asignados.' : 'El rol activo no está asignado.');
  }
  if (operation !== 'preview_policy' && !canManage(roleState.activeRole, member)) throw new HttpsError('permission-denied', 'No puede administrar conciliaciones.');
  return {
    tenantId,
    member,
    actor: {
      uid: request.auth.uid,
      advisorId: text(member.advisorId || member.asesorId, 180),
      activeRole: roleState.activeRole
    }
  };
}
function reason(data, required = true) {
  const value = text(data.reason || data.motivo, 1000);
  if (required && !value) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  return value;
}
function operationRequestId(tenantId, operation, payload, supplied) {
  const explicit = text(supplied, 180);
  return explicit ? id(explicit, 'requestId') : `rec_${sha(JSON.stringify(stable({ tenantId, operation, payload }))).slice(0, 28)}`;
}

async function resolveActiveRun(tenantId) {
  const pointer = await controlRef(tenantId).get();
  if (!pointer.exists) throw new HttpsError('failed-precondition', 'COBROS_LEDGER_ACTIVE_POINTER_MISSING');
  const pointerData = pointer.data() || {};
  const activeRunId = text(pointerData.activeRunId, 180);
  if (!activeRunId) throw new HttpsError('failed-precondition', 'COBROS_LEDGER_ACTIVE_RUN_MISSING');
  id(activeRunId, 'activeRunId');
  const manifest = await runRef(tenantId, activeRunId).get();
  if (!manifest.exists) throw new HttpsError('failed-precondition', 'COBROS_LEDGER_ACTIVE_RUN_NOT_FOUND');
  const manifestData = manifest.data() || {};
  try {
    validateActiveLedgerContract(pointerData, manifestData, tenantId);
  } catch (error) {
    throw new HttpsError('failed-precondition', text(error && (error.code || error.message) || 'COBROS_LEDGER_CONTRACT_INVALID', 180));
  }
  return { activeRunId, manifest: manifestData };
}
async function queryCanonicalByPolicy(tenantId, collection, policyId) {
  const snap = await tenantData(tenantId, collection).where('polizaId', '==', policyId).get();
  return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
}
async function queryStageByPolicy(tenantId, runId, collection, policyId) {
  const snap = await stageCollection(tenantId, runId, collection).where('polizaId', '==', policyId).get();
  return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
}
function stateCounts(rows) {
  return rows.reduce((acc, row) => {
    const key = text(row.estado || row.status || row.decision || 'SIN_ESTADO', 120) || 'SIN_ESTADO';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function previewPolicy(authz, payload) {
  const policyId = id(payload.polizaId || payload.policyId, 'polizaId');
  const { activeRunId, manifest } = await resolveActiveRun(authz.tenantId);
  const [receipts, evidences, proposals, holds] = await Promise.all([
    queryCanonicalByPolicy(authz.tenantId, 'recibosEsperados', policyId),
    queryStageByPolicy(authz.tenantId, activeRunId, 'evidenciasCobro', policyId),
    queryStageByPolicy(authz.tenantId, activeRunId, 'propuestasConciliacion', policyId),
    queryStageByPolicy(authz.tenantId, activeRunId, 'conciliacionHolds', policyId)
  ]);
  return {
    ok: true,
    schemaVersion: VERSION,
    contractVersion: CONTRACT_VERSION,
    tenantId: authz.tenantId,
    polizaId: policyId,
    activeRunId,
    runStatus: text(manifest.status || manifest.estado || manifest.result, 120),
    receipts,
    evidences,
    proposals,
    holds,
    counts: {
      receipts: receipts.length,
      evidences: evidences.length,
      proposals: proposals.length,
      holds: holds.length,
      proposalStates: stateCounts(proposals)
    },
    writes: 0,
    inferenceDisabled: true
  };
}

function unsupportedMutation(operation) {
  if (operation === 'confirm_application') {
    throw new HttpsError('failed-precondition', 'COBROS_10102_PROPOSAL_IS_NOT_PAYMENT: una propuesta/HOLD no puede convertirse en Cobro ni modificar recibos.');
  }
  if (operation === 'register_evidence') {
    throw new HttpsError('failed-precondition', 'COBROS_10102_ACTIVE_LEDGER_IMMUTABLE: nueva evidencia requiere un nuevo run autorizado; no se modifica el ledger activo.');
  }
}

async function execute(request) {
  const data = request.data || {};
  const operation = norm(data.operation).replace(/ /g, '_');
  if (!OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación no soportada.');
  const authz = await authorize(request, operation);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};

  if (operation === 'preview_policy') return previewPolicy(authz, payload);
  unsupportedMutation(operation);

  const motive = reason(data, true);
  const { activeRunId } = await resolveActiveRun(authz.tenantId);
  const proposalId = id(payload.proposalId, 'proposalId');
  const pRef = stageRef(authz.tenantId, activeRunId, 'propuestasConciliacion', proposalId);
  const reqId = operationRequestId(authz.tenantId, operation, Object.assign({ activeRunId }, payload), data.requestId);
  const reqRef = requestRef(authz.tenantId, reqId);
  const evtId = `recevt_${sha(`${authz.tenantId}|${activeRunId}|${reqId}`).slice(0, 28)}`;

  return db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists && previous.data().status === 'committed') return Object.assign({ reused: true }, previous.data().result || {});
    const proposalSnap = await tx.get(pRef);
    if (!proposalSnap.exists) throw new HttpsError('not-found', 'La propuesta no existe en el ledger activo.');

    let result;
    if (operation === 'hold_proposal') {
      const holdId = id(payload.holdId || `hold_${sha(`${activeRunId}|${proposalId}`).slice(0, 24)}`, 'holdId');
      const hRef = stageRef(authz.tenantId, activeRunId, 'conciliacionHolds', holdId);
      tx.set(pRef, { estado: 'HOLD', holdId, updatedAt: now(), updatedByUid: authz.actor.uid }, { merge: true });
      tx.set(hRef, {
        id: holdId,
        proposalId,
        polizaId: text((proposalSnap.data() || {}).polizaId, 180),
        tenantId: authz.tenantId,
        runId: activeRunId,
        motivo: motive,
        accionRequerida: text(payload.accionRequerida || payload.requiredAction, 1000),
        estado: 'ABIERTO',
        createdAt: now(),
        createdByUid: authz.actor.uid,
        schemaVersion: VERSION
      }, { merge: true });
      result = { ok: true, operation, activeRunId, proposalId, holdId };
    } else if (operation === 'reopen_proposal') {
      tx.set(pRef, { estado: 'PROPUESTA', reopenedAt: now(), reopenedByUid: authz.actor.uid, motivoReapertura: motive }, { merge: true });
      result = { ok: true, operation, activeRunId, proposalId };
    } else {
      throw new HttpsError('failed-precondition', 'Operación de escritura bloqueada por contrato Cobros 10.10.2.');
    }

    tx.set(eventRef(authz.tenantId, evtId), {
      schemaVersion: VERSION,
      contractVersion: CONTRACT_VERSION,
      tenantId: authz.tenantId,
      activeRunId,
      eventId: evtId,
      operation,
      requestId: reqId,
      actor: authz.actor,
      motivo: motive,
      payloadDigest: digest(payload),
      resultDigest: digest(result),
      createdAt: now()
    }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation, activeRunId, eventId: evtId, result, committedAt: now() }, { merge: true });
    return result;
  });
}

exports.orbit360CobrosReconciliationCommand = onCall({ region: REGION, cors: true }, execute);
exports.orbit360CobrosReconciliationCommandLabV20260804 = onCall({ region: REGION, cors: true }, execute);
exports.__cobrosReconciliationDomain = Object.freeze({ VERSION, CONTRACT_VERSION, OPERATIONS });
