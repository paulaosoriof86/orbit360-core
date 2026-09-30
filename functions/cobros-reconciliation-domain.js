'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { validateActiveLedgerContract } = require('./cobros-ledger-contract');
const { normalizeRole, resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-cobros-reconciliation-domain-v3-payment-owner';
const CONTRACT_VERSION = '10.10.2';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin', 'operativo', 'finanzas']);
const PERMISSIONS = new Set(['cobros_manage', 'conciliaciones_manage', 'payments_reconcile']);
const OPERATIONS = new Set(['preview_policy', 'apply_payment', 'register_evidence', 'confirm_application', 'hold_proposal', 'reopen_proposal']);

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

function isoDate(value, label, required = false) {
  const out = text(value, 32);
  if (!out) {
    if (required) throw new HttpsError('invalid-argument', `${label || 'Fecha'} requerida.`);
    return '';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out) || Number.isNaN(Date.parse(`${out}T00:00:00Z`))) {
    throw new HttpsError('invalid-argument', `${label || 'Fecha'} inválida.`);
  }
  return out;
}
function money(value, label) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new HttpsError('invalid-argument', `${label || 'Monto'} inválido.`);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function receiptAmount(row) {
  for (const key of ['monto', 'montoTotal', 'primaTotal', 'saldo']) {
    const n = money(row && row[key], key);
    if (n != null) return n;
  }
  return null;
}
function dueDate(row) {
  return text(row && (row.vence || row.fechaLimite || row.fechaVencimiento), 32);
}
function paymentSource(value) {
  const out = norm(value).replace(/ /g, '_');
  const allowed = new Set(['client_reported','manual','payment_support','insurer_invoice','insurer_statement','commission_statement','inference']);
  if (!allowed.has(out)) throw new HttpsError('invalid-argument', 'Fuente de pago inválida.');
  return out;
}
function paidStateFor(source, inferred) {
  if (inferred === true || source === 'inference') return 'PAID_INFERRED';
  if (source === 'client_reported') return 'PAID_REPORTED';
  return 'PAID_DIRECT';
}
function deterministicCobroId(tenantId, receiptId) {
  return `cob_${sha(`${tenantId}|receipt|${receiptId}`).slice(0, 28)}`;
}
function activePortfolio(row) {
  if (!row) return false;
  const state = norm(row.estadoCartera || row.estado);
  return row.carteraActiva !== false && !['anulado','cancelado','cancelada','superseded','reemplazado'].includes(state);
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


async function applyPayment(authz, data, payload) {
  const receiptId = id(payload.receiptId || payload.reciboId, 'reciboId');
  const source = paymentSource(payload.sourceType || payload.fuentePago || 'manual');
  const inferred = payload.inferred === true || source === 'inference';
  const paidDate = isoDate(payload.paidDate || payload.fechaPago, 'Fecha real de pago', false);
  const inferredEffectiveDate = isoDate(payload.inferredEffectiveDate || payload.fechaInferida, 'Fecha operativa inferida', false);
  const evidenceAsOfDate = isoDate(payload.evidenceAsOfDate || payload.fechaCorteEvidencia, 'Fecha de evidencia', false);
  const applicationDate = isoDate(payload.applicationDate || payload.fechaAplicacion, 'Fecha de aplicación', false);
  const invoiceNumber = text(payload.invoiceNumber || payload.numeroFactura, 180);
  const paymentMethod = text(payload.paymentMethod || payload.metodoPago || payload.metodo, 180);
  const paymentSupportDocumentRef = text(payload.paymentSupportDocumentRef || payload.soportePagoRef, 500);
  const invoiceDocumentRef = text(payload.invoiceDocumentRef || payload.facturaRef, 500);
  const explicitAmount = money(payload.amount || payload.monto, 'Monto');
  if (inferred && !inferredEffectiveDate) throw new HttpsError('invalid-argument', 'La inferencia requiere fecha operativa de la cuota.');
  if (inferred && paidDate && payload.actualPaidDateEvidence !== true) {
    throw new HttpsError('failed-precondition', 'Una inferencia no puede inventar fecha real de pago.');
  }
  const applicationProved = Boolean(applicationDate || invoiceNumber || invoiceDocumentRef || ['insurer_invoice','insurer_statement','commission_statement'].includes(source));
  const receiptRef = tenantData(authz.tenantId, 'recibosEsperados').doc(receiptId);
  const reqPayload = {
    receiptId, source, inferred, paidDate, inferredEffectiveDate, evidenceAsOfDate, applicationDate,
    invoiceNumber, paymentMethod, paymentSupportDocumentRef, invoiceDocumentRef, amount: explicitAmount
  };
  const reqId = operationRequestId(authz.tenantId, 'apply_payment', reqPayload, '');
  const reqRef = requestRef(authz.tenantId, reqId);
  const eventId = `payevt_${sha(`${authz.tenantId}|${receiptId}|${reqId}`).slice(0, 28)}`;

  const result = await db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists) {
      const row = previous.data() || {};
      if (row.status === 'committed') return Object.assign({ reused: true }, row.result || {});
    }

    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists) throw new HttpsError('not-found', 'El recibo esperado no existe.');
    const receipt = Object.assign({ id: receiptSnap.id }, receiptSnap.data() || {});
    const policyId = id(receipt.polizaId, 'polizaId');
    const policyRef = tenantData(authz.tenantId, 'polizas').doc(policyId);
    const policySnap = await tx.get(policyRef);
    if (!policySnap.exists) throw new HttpsError('failed-precondition', 'La póliza vinculada no existe.');
    const policy = Object.assign({ id: policySnap.id }, policySnap.data() || {});
    const clientId = id(receipt.clienteId || policy.clienteId, 'clienteId');

    const portfolioQuery = tenantData(authz.tenantId, 'carteraPrimas').where('reciboId', '==', receiptId);
    const cobroQuery = tenantData(authz.tenantId, 'cobros').where('reciboId', '==', receiptId);
    const [portfolioSnap, cobroSnap] = await Promise.all([tx.get(portfolioQuery), tx.get(cobroQuery)]);
    const activePortfolioRows = portfolioSnap.docs.filter(doc => activePortfolio(doc.data() || {}));
    if (activePortfolioRows.length > 1) throw new HttpsError('failed-precondition', 'Más de una obligación activa corresponde al mismo recibo.');
    if (cobroSnap.size > 1) throw new HttpsError('failed-precondition', 'Más de un cobro corresponde al mismo recibo.');

    const amount = explicitAmount != null ? explicitAmount : receiptAmount(receipt);
    if (amount == null || amount <= 0) throw new HttpsError('failed-precondition', 'El recibo no tiene monto válido.');
    const receiptCurrency = text(receipt.moneda || policy.moneda, 12).toUpperCase();
    const cobroDoc = cobroSnap.empty ? null : cobroSnap.docs[0];
    const cobroId = cobroDoc ? cobroDoc.id : deterministicCobroId(authz.tenantId, receiptId);
    const cobroRef = tenantData(authz.tenantId, 'cobros').doc(cobroId);
    const beforeCobro = cobroDoc ? (cobroDoc.data() || {}) : {};
    const existingPaidDate = text(beforeCobro.paidDate || beforeCobro.fechaPago, 32);
    const existingApplicationDate = text(beforeCobro.applicationDate || beforeCobro.fechaAplicacion, 32);
    const finalPaidDate = paidDate || existingPaidDate;
    const finalApplicationDate = applicationDate || existingApplicationDate;
    const paymentState = paidStateFor(source, inferred);
    const applicationState = (applicationProved || finalApplicationDate || beforeCobro.conciliado === true) ? 'APPLIED_DIRECT' : 'PENDING_APPLICATION';
    const technicalNow = now();

    const shared = {
      paymentState,
      applicationState,
      directOrInferred: inferred ? 'INFERRED' : 'DIRECT',
      paymentEvidenceType: source.toUpperCase(),
      evidenceAsOfDate: evidenceAsOfDate || text(beforeCobro.evidenceAsOfDate, 32),
      inferredEffectiveDate: inferredEffectiveDate || text(beforeCobro.inferredEffectiveDate, 32),
      reconciledAt: technicalNow,
      updatedAt: technicalNow,
      updatedByUid: authz.actor.uid
    };
    if (finalPaidDate) shared.paidDate = finalPaidDate;
    if (paymentMethod) shared.paymentMethod = paymentMethod;
    if (paymentSupportDocumentRef) shared.paymentSupportDocumentRef = paymentSupportDocumentRef;
    if (finalApplicationDate) shared.applicationDate = finalApplicationDate;
    if (invoiceNumber) shared.invoiceNumber = invoiceNumber;
    if (invoiceDocumentRef) shared.invoiceDocumentRef = invoiceDocumentRef;

    const cobro = Object.assign({}, beforeCobro, {
      id: cobroId,
      tenantId: authz.tenantId,
      clienteId: clientId,
      polizaId: policyId,
      reciboId: receiptId,
      asesorId: text(receipt.asesorId || policy.asesorId, 180),
      pais: text(receipt.pais || policy.pais, 12).toUpperCase(),
      moneda: receiptCurrency,
      cuota: text(receipt.cuota || receipt.serie || receipt.numeroReciboFuente, 120),
      vence: dueDate(receipt),
      monto: amount,
      estado: 'Pagado',
      conciliado: applicationState === 'APPLIED_DIRECT',
      ...shared
    });
    if (finalPaidDate) cobro.fechaPago = finalPaidDate;
    if (paymentMethod) cobro.metodo = paymentMethod;
    if (invoiceNumber) cobro.numeroFactura = invoiceNumber;

    const receiptPatch = {
      estado: 'Pagado',
      estadoOperativo: source === 'client_reported' ? 'pago_reportado_aplicado' : (inferred ? 'pago_inferido' : 'pagado'),
      cobroId,
      conciliadoPago: true,
      conciliado: applicationState === 'APPLIED_DIRECT',
      ...shared
    };
    if (finalPaidDate) {
      receiptPatch.fechaPago = finalPaidDate;
      if (source === 'client_reported') receiptPatch.fechaPagoReportada = finalPaidDate;
    }
    if (paymentMethod) receiptPatch.metodoPago = paymentMethod;
    if (invoiceNumber) receiptPatch.numeroFactura = invoiceNumber;

    tx.set(cobroRef, cobro, { merge: true });
    tx.set(receiptRef, receiptPatch, { merge: true });
    if (activePortfolioRows.length === 1) {
      const pRef = activePortfolioRows[0].ref;
      const portfolioPatch = {
        estado: 'Pagado',
        estadoCartera: 'Pagado',
        conciliadoPago: true,
        cobroId,
        reciboId: receiptId,
        applicationState,
        paymentState,
        updatedAt: technicalNow,
        updatedByUid: authz.actor.uid
      };
      if (finalPaidDate) portfolioPatch.fechaPago = finalPaidDate;
      if (inferredEffectiveDate) portfolioPatch.inferredEffectiveDate = inferredEffectiveDate;
      if (finalApplicationDate) portfolioPatch.applicationDate = finalApplicationDate;
      tx.set(pRef, portfolioPatch, { merge: true });
    }

    const committed = {
      ok: true,
      operation: 'apply_payment',
      receiptId,
      cobroId,
      policyId,
      clientId,
      paymentState,
      applicationState,
      paidDate: finalPaidDate || '',
      inferredEffectiveDate: inferredEffectiveDate || '',
      applicationDate: finalApplicationDate || '',
      invoiceNumber: invoiceNumber || text(beforeCobro.invoiceNumber || beforeCobro.numeroFactura, 180),
      portfolioUpdated: activePortfolioRows.length === 1,
      serverOwned: true,
      idempotent: true
    };
    tx.set(eventRef(authz.tenantId, eventId), {
      schemaVersion: VERSION,
      contractVersion: CONTRACT_VERSION,
      tenantId: authz.tenantId,
      eventId,
      operation: 'apply_payment',
      requestId: reqId,
      actor: authz.actor,
      receiptId,
      cobroId,
      payloadDigest: digest(reqPayload),
      resultDigest: digest(committed),
      createdAt: technicalNow
    }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation: 'apply_payment', eventId, payloadDigest: digest(reqPayload), result: committed, committedAt: technicalNow }, { merge: true });
    return committed;
  });

  const [receiptReadback, cobroReadback] = await Promise.all([receiptRef.get(), tenantData(authz.tenantId, 'cobros').doc(result.cobroId).get()]);
  if (!receiptReadback.exists || !cobroReadback.exists) throw new HttpsError('data-loss', 'No fue posible confirmar la persistencia del pago.');
  return result;
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
  if (operation === 'apply_payment') return applyPayment(authz, data, payload);
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
exports.orbit360CobrosReconciliationCommandPreview = onCall({ region: REGION, cors: true }, execute);
exports.orbit360CobrosReconciliationCommandLabV20260804 = onCall({ region: REGION, cors: true }, execute);
exports.__cobrosReconciliationDomain = Object.freeze({ VERSION, CONTRACT_VERSION, OPERATIONS });
