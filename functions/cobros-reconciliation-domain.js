'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { validateActiveLedgerContract } = require('./cobros-ledger-contract');
const { normalizeRole, resolveProductActiveRole } = require('./product-active-role-contract');
const { planEvidence, documentaryAmountVariance } = require('./payment-inference-engine');
const proposalBoundary = require('./proposal-application-boundary');
const proposalAccess = require('./b4-003-scoped-access-boundary');
const sourceIntake = require('./cobros-source-intake-v2');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-cobros-reconciliation-domain-v6-b3005-inference-owner';
const CONTRACT_VERSION = '10.10.2';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin', 'operativo', 'finanzas']);
const ADVISOR_REPORT_ROLES = new Set(['asesor', 'asesora', 'asesor_sr', 'asesora_sr', 'asesor_jr', 'asesora_jr', 'comercial']);
const PERMISSIONS = new Set(['cobros_manage', 'conciliaciones_manage', 'payments_reconcile']);
const OPERATIONS = new Set(['preview_policy', 'preview_proposal_application', 'resolve_proposal_application', 'apply_proposal_application', 'intake_source_run', 'report_advisor_payment', 'apply_payment', 'reconcile_payment', 'reconcile_evidence', 'register_evidence', 'confirm_application', 'hold_proposal', 'reopen_proposal']);

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
function requestRef(tenantId, requestId, previewOnly = false) {
  return db.collection('tenants').doc(tenantId).collection(previewOnly ? 'previewReconciliationRequests' : 'reconciliationRequests').doc(requestId);
}
function eventRef(tenantId, eventId, previewOnly = false) {
  return db.collection('tenants').doc(tenantId).collection(previewOnly ? 'previewReconciliationEvents' : 'reconciliationEvents').doc(eventId);
}
function paymentNotificationRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('notificationOutbox').doc(eventId);
}
function controlRef(tenantId) {
  return tenantData(tenantId, 'cobrosLedgerControl').doc('active');
}
function reconciliationConfigRef(tenantId) {
  return db.collection('tenants').doc(tenantId).collection('config').doc('reconciliation');
}
function previewReconciliationConfigRef(tenantId) {
  return db.collection('tenants').doc(tenantId).collection('previewUatConfig').doc('reconciliation');
}
async function readReconciliationConfig(tenantId, previewOnly) {
  if (previewOnly === true) {
    const preview = await previewReconciliationConfigRef(tenantId).get();
    if (preview.exists) return Object.assign({ configSource: 'preview_uat' }, preview.data() || {});
  }
  const canonical = await reconciliationConfigRef(tenantId).get();
  return canonical.exists ? Object.assign({ configSource: 'canonical' }, canonical.data() || {}) : { configSource: 'missing' };
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
function paymentCountry(value) {
  const normalized = norm(value);
  if (normalized === 'guatemala' || normalized === 'gt') return 'GT';
  if (normalized === 'colombia' || normalized === 'co') return 'CO';
  return text(value, 8).toUpperCase();
}
function assertPaymentCountryScope(authz, policy, receipt) {
  const policyCountry = paymentCountry(policy && policy.pais);
  const receiptCountry = paymentCountry(receipt && receipt.pais);
  if (policyCountry && receiptCountry && policyCountry !== receiptCountry)
    throw new HttpsError('failed-precondition', 'PAYMENT_POLICY_RECEIPT_COUNTRY_MISMATCH');
  const country = policyCountry || receiptCountry;
  if (!country) throw new HttpsError('failed-precondition', 'PAYMENT_COUNTRY_UNRESOLVED');
  const countries = unique([...(Array.isArray(authz.member.countries) ? authz.member.countries : []),
    ...(Array.isArray(authz.member.paises) ? authz.member.paises : [])]).map(paymentCountry);
  if (countries.length && !countries.includes(country))
    throw new HttpsError('permission-denied', 'PAYMENT_COUNTRY_OUTSIDE_MEMBERSHIP');
  return country;
}
async function authorize(request, operation) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = id(request.data && request.data.tenantId, 'tenantId');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!active(member) || (text(member.tenantId,180) && text(member.tenantId,180)!==tenantId))
    throw new HttpsError('permission-denied', 'Membresía inactiva o fuera del tenant.');
  let roleState;
  try {
    roleState = resolveProductActiveRole(member, request.data && request.data.activeRole);
  } catch (error) {
    throw new HttpsError('permission-denied', error && error.code === 'PRODUCT_ASSIGNED_ROLES_MISSING' ? 'La membresía no tiene roles asignados.' : 'El rol activo no está asignado.');
  }
  const advisorSelfService = operation === 'report_advisor_payment' && ADVISOR_REPORT_ROLES.has(roleState.activeRole);
  if (operation !== 'preview_policy' && !advisorSelfService && !canManage(roleState.activeRole, member)) throw new HttpsError('permission-denied', 'No puede administrar conciliaciones.');
  return {
    tenantId,
    member,
    auth: request.auth,
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
  const allowed = new Set(['client_reported','advisor_reported','crm_migrated_direct','manual','payment_support','insurer_invoice','insurer_statement','commission_statement','inference']);
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
function deterministicAdvisorPaymentManagementId(tenantId, receiptId) {
  return `ges_pay_${sha(`${tenantId}|advisor-payment|${receiptId}`).slice(0, 24)}`;
}
function advisorReportPending(receipt) {
  const op = norm(receipt && receipt.estadoOperativo).replace(/ /g, '_');
  const origin = norm(receipt && (receipt.paymentOrigin || receipt.paymentOriginKind || receipt.paymentSourceType)).replace(/ /g, '_');
  return op === 'pago_reportado_asesor' || origin === 'advisor_reported_payment' || origin === 'advisor_reported';
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
    inferenceDisabled: false,
    inferenceMode: 'SERVER_OWNED_HIGH_CONFIDENCE_ONLY'
  };
}



async function reportAdvisorPayment(authz, data, payload) {
  if (!ADVISOR_REPORT_ROLES.has(authz.actor.activeRole)) {
    throw new HttpsError('permission-denied', 'El rol activo no puede reportar pagos como Asesor.');
  }
  const receiptId = id(payload.receiptId || payload.reciboId, 'reciboId');
  const paidDate = isoDate(payload.paidDate || payload.fechaPago, 'Fecha real de pago', false);
  const evidenceAsOfDate = isoDate(payload.evidenceAsOfDate || payload.fechaCorteEvidencia, 'Fecha de evidencia', false);
  const paymentMethod = text(payload.paymentMethod || payload.metodoPago || payload.metodo, 180);
  const paymentSupportDocumentRef = text(payload.paymentSupportDocumentRef || payload.soportePagoRef, 500);
  const explicitAmount = money(payload.amount || payload.monto, 'Monto');
  const note = text(payload.note || payload.nota || payload.observacion, 1200);
  const receiptRef = tenantData(authz.tenantId, 'recibosEsperados').doc(receiptId);
  const reqPayload = { receiptId, paidDate, evidenceAsOfDate, paymentMethod, paymentSupportDocumentRef, amount: explicitAmount, note };
  const reqId = operationRequestId(authz.tenantId, 'report_advisor_payment', reqPayload, data.requestId);
  const reqRef = requestRef(authz.tenantId, reqId);
  const eventId = `payevt_${sha(`${authz.tenantId}|advisor-report|${receiptId}|${reqId}`).slice(0, 28)}`;
  const managementId = deterministicAdvisorPaymentManagementId(authz.tenantId, receiptId);
  const managementRef = tenantData(authz.tenantId, 'gestiones').doc(managementId);

  const result = await db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists && (previous.data() || {}).status === 'committed') {
      return Object.assign({ reused: true }, (previous.data() || {}).result || {});
    }
    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists) throw new HttpsError('not-found', 'El recibo esperado no existe.');
    const receipt = Object.assign({ id: receiptSnap.id }, receiptSnap.data() || {});
    const policyId = id(receipt.polizaId, 'polizaId');
    const policyRef = tenantData(authz.tenantId, 'polizas').doc(policyId);
    const policySnap = await tx.get(policyRef);
    if (!policySnap.exists) throw new HttpsError('failed-precondition', 'La póliza vinculada no existe.');
    const policy = Object.assign({ id: policySnap.id }, policySnap.data() || {});
    const notificationCountry = text(policy.pais || receipt.pais, 8).toUpperCase();
    if (!['GT', 'CO'].includes(notificationCountry))
      throw new HttpsError('failed-precondition', 'PAYMENT_REPORT_COUNTRY_UNRESOLVED: la póliza requiere país válido.');
    const signedCountries = unique([...(Array.isArray(authz.member.countries) ? authz.member.countries : []),
      ...(Array.isArray(authz.member.paises) ? authz.member.paises : [])]).map(v => text(v, 8).toUpperCase());
    if (!signedCountries.includes(notificationCountry))
      throw new HttpsError('permission-denied', 'PAYMENT_REPORT_COUNTRY_OUTSIDE_MEMBERSHIP');
    const clientId = id(receipt.clienteId || policy.clienteId, 'clienteId');
    const receiptAdvisorId = text(receipt.asesorId || policy.asesorId, 180);
    if (!authz.actor.advisorId || !receiptAdvisorId || receiptAdvisorId !== authz.actor.advisorId) {
      throw new HttpsError('permission-denied', 'El recibo no pertenece a la cartera propia del rol Asesor.');
    }
    const cobroQuery = tenantData(authz.tenantId, 'cobros').where('reciboId', '==', receiptId);
    const cobroSnap = await tx.get(cobroQuery);
    const alreadyPaid = cobroSnap.docs.some(doc => {
      const row = doc.data() || {};
      return norm(row.estado) === 'pagado' || ['PAID_DIRECT','PAID_REPORTED','PAID_INFERRED'].includes(text(row.paymentState, 80).toUpperCase());
    });
    if (alreadyPaid) throw new HttpsError('failed-precondition', 'El pago ya está aplicado; no corresponde crear otro reporte.');

    const amount = explicitAmount != null ? explicitAmount : receiptAmount(receipt);
    if (amount == null || amount <= 0) throw new HttpsError('failed-precondition', 'El recibo no tiene monto válido.');
    const technicalNow = now();
    const receiptPatch = {
      estadoOperativo: 'pago_reportado_asesor',
      paymentOrigin: 'ADVISOR_REPORTED_PAYMENT',
      paymentIntakeState: 'PENDIENTE_VALIDACION_OPERATIVA',
      paymentState: 'REPORTED_PENDING_OPERATIVE_VALIDATION',
      linkedOpsManagementId: managementId,
      reportedByAdvisorId: authz.actor.advisorId,
      reportedByUid: authz.actor.uid,
      evidenceAsOfDate: evidenceAsOfDate || text(receipt.evidenceAsOfDate, 32),
      updatedAt: technicalNow,
      updatedByUid: authz.actor.uid
    };
    if (paidDate) receiptPatch.fechaPagoReportada = paidDate;
    if (paymentMethod) receiptPatch.metodoPago = paymentMethod;
    if (paymentSupportDocumentRef) receiptPatch.paymentSupportDocumentRef = paymentSupportDocumentRef;

    const management = {
      id: managementId,
      tenantId: authz.tenantId,
      lista: 'Gestiones Admin',
      tipo: 'Validar pago reportado',
      titulo: 'Validar pago reportado',
      clienteId: clientId,
      polizaId: policyId,
      pais: notificationCountry,
      asesorId: authz.actor.advisorId,
      estado: 'Pendiente',
      prioridad: 'Alta',
      origen: 'Cobros · reporte de asesor',
      workflowType: 'advisor_payment_validation',
      receiptId,
      paymentOrigin: 'ADVISOR_REPORTED_PAYMENT',
      paymentReportStatus: 'PENDIENTE_VALIDACION_OPERATIVA',
      paidDate: paidDate || '',
      paymentMethod: paymentMethod || '',
      paymentSupportDocumentRef: paymentSupportDocumentRef || '',
      amount,
      nota: note || 'El asesor reportó un pago. Operativo debe validar la correspondencia antes de aplicarlo.',
      archivado: false,
      updatedAt: technicalNow,
      updatedByUid: authz.actor.uid
    };
    tx.set(receiptRef, receiptPatch, { merge: true });
    tx.set(managementRef, management, { merge: true });
    const committed = {
      ok: true,
      operation: 'report_advisor_payment',
      receiptId,
      policyId,
      clientId,
      managementId,
      paymentOrigin: 'ADVISOR_REPORTED_PAYMENT',
      paymentState: 'REPORTED_PENDING_OPERATIVE_VALIDATION',
      validationState: 'PENDIENTE_VALIDACION_OPERATIVA',
      serverOwned: true,
      idempotent: true
    };
    tx.set(eventRef(authz.tenantId, eventId), {
      schemaVersion: VERSION,
      contractVersion: CONTRACT_VERSION,
      tenantId: authz.tenantId,
      eventId,
      operation: 'report_advisor_payment',
      requestId: reqId,
      actor: authz.actor,
      receiptId,
      managementId,
      payloadDigest: digest(reqPayload),
      resultDigest: digest(committed),
      createdAt: technicalNow
    }, { merge: false });
    tx.set(paymentNotificationRef(authz.tenantId, eventId), {
      schemaVersion: VERSION,
      tenantId: authz.tenantId,
      eventId,
      eventSource: 'reconciliation',
      operation: 'report_advisor_payment',
      entityType: 'gestiones',
      entityId: managementId,
      receiptId,
      pais: notificationCountry,
      asesorId: receiptAdvisorId,
      targets: [{ type: 'role', id: 'operations' }],
      channels: ['in_app'],
      status: 'pending_provider',
      actorUid: authz.actor.uid,
      actorName: text(authz.member.nombre || authz.member.displayName || authz.member.name, 220).includes('@') ? '' :
        text(authz.member.nombre || authz.member.displayName || authz.member.name, 220),
      payload: {
        title: 'Validar pago reportado',
        message: 'Un asesor reportó un pago. Verificar recibo y evidencia antes de cualquier aplicación.'
      },
      createdAt: technicalNow
    }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation: 'report_advisor_payment', eventId, payloadDigest: digest(reqPayload), result: committed, committedAt: technicalNow }, { merge: true });
    return committed;
  });
  const [receiptReadback, managementReadback] = await Promise.all([receiptRef.get(), managementRef.get()]);
  if (!receiptReadback.exists || !managementReadback.exists) throw new HttpsError('data-loss', 'No fue posible confirmar el reporte del pago.');
  return result;
}

const RECORDED_PAYMENT_FIELDS = Object.freeze([
  'paymentState', 'directOrInferred', 'paymentEvidenceType', 'paymentOrigin',
  'evidenceId', 'evidenceType', 'sourceRef', 'evidenceAsOfDate',
  'paidDate', 'fechaPago', 'paymentMethod', 'metodo', 'metodoPago',
  'paymentSupportDocumentRef', 'soportePagoRef', 'inferredEffectiveDate',
  'anchorInstallment', 'inferenceRuleId', 'confidence', 'inferenceProvenance'
]);
function recordedPaymentFacts(row) {
  return Object.fromEntries(RECORDED_PAYMENT_FIELDS.filter(key => row && Object.prototype.hasOwnProperty.call(row,key) && row[key] !== undefined)
    .map(key => [key, row[key]]));
}
function preserveRecordedPayment(target, row) {
  // Missing/blank original provenance is not evidence from the new invoice.
  // Keep confirmed state/date derivation, but strip every unproved new source,
  // method, support or inference field before restoring its original presence.
  const derivedStateOrDate = new Set(['paymentState','directOrInferred','paidDate','fechaPago']);
  for (const key of RECORDED_PAYMENT_FIELDS) {
    if (derivedStateOrDate.has(key)) {
      if (row && row[key] != null && row[key] !== '') target[key]=row[key];
    } else if (row && Object.prototype.hasOwnProperty.call(row,key) && row[key] !== undefined) target[key]=row[key];
    else delete target[key];
  }
  return target;
}
function assertPaymentRecordAliases(record, monetary = false) {
  const present=value=>value!=null&&text(value,500)!=='';
  for (const [canonical,alias] of [['polizaId','policyId'],['clienteId','clientId'],['reciboId','receiptId'],
      ['moneda','currency'],['moneda','divisa'],['pais','country'],['paymentSupportDocumentRef','soportePagoRef']]) {
    const normalize=value=>canonical==='pais'?paymentCountry(value):canonical==='moneda'?text(value,12).toUpperCase():text(value,500);
    if (present(record[canonical]) && present(record[alias]) && normalize(record[canonical])!==normalize(record[alias]))
      throw new HttpsError('failed-precondition','PAYMENT_FINANCIAL_IDENTITY_ALIASES_CONFLICT');
  }
  if (monetary) {
    // saldo is a balance, not an alias of a total when the total exists.
    const keys=['monto','montoTotal','primaTotal'].filter(key=>present(record[key]));
    if (!keys.length && present(record.saldo)) keys.push('saldo');
    const amounts=keys.map(key=>Number(record[key]));
    if (keys.some(key=>typeof record[key]==='boolean') ||
        amounts.some(value=>!Number.isFinite(value)||value<0||Math.abs(value*100-Math.round(value*100))>1e-6)||
        new Set(amounts.map(value=>Math.round(value*100))).size>1)
      throw new HttpsError('failed-precondition','PAYMENT_RECORDED_AMOUNT_ALIASES_CONFLICT');
  }
}
function assertPaymentIdentity(authz, policy, receipt, row, kind, amountMustMatch = true) {
  assertPaymentRecordAliases(policy);
  assertPaymentRecordAliases(receipt,true);
  assertPaymentRecordAliases(row,true);
  assertReconciliationFinancialTarget(authz, policy, receipt, row, kind, { amountMustMatch });
  if (text(row.polizaId || row.policyId, 180) !== policy.id ||
      text(row.clienteId || row.clientId, 180) !== text(receipt.clienteId || policy.clienteId, 180))
    throw new HttpsError('failed-precondition', 'PAYMENT_EXACT_FINANCIAL_IDENTITY_REQUIRED');
  if (row.paidDate && row.fechaPago && row.paidDate !== row.fechaPago)
    throw new HttpsError('failed-precondition', 'PAYMENT_EXISTING_PAID_DATE_ALIASES_CONFLICT');
}

async function applyPayment(authz, data, payload, operationName = 'apply_payment', previewOnly = false) {
  const receiptId = id(payload.receiptId || payload.reciboId, 'reciboId');
  const source = paymentSource(payload.sourceType || payload.fuentePago || 'manual');
  const inferred = payload.inferred === true || source === 'inference';
  const paidDate = isoDate(payload.paidDate || payload.fechaPago, 'Fecha real de pago', false);
  const inferredEffectiveDate = isoDate(payload.inferredEffectiveDate || payload.fechaInferida, 'Fecha operativa inferida', false);
  const evidenceAsOfDate = isoDate(payload.evidenceAsOfDate || payload.fechaCorteEvidencia, 'Fecha de evidencia', false);
  const applicationDate = isoDate(payload.applicationDate || payload.fechaAplicacion, 'Fecha de aplicación', false);
  const invoiceDate = isoDate(payload.invoiceDate || payload.fechaFactura, 'Fecha de factura', false);
  const invoiceNumber = text(payload.invoiceNumber || payload.numeroFactura, 180);
  const paymentMethod = text(payload.paymentMethod || payload.metodoPago || payload.metodo, 180);
  const paymentSupportDocumentRef = text(payload.paymentSupportDocumentRef || payload.soportePagoRef, 500);
  const invoiceDocumentRef = text(payload.invoiceDocumentRef || payload.facturaRef, 500);
  if (payload.amount != null && payload.monto != null && Number(payload.amount) !== Number(payload.monto))
    throw new HttpsError('invalid-argument','PAYMENT_AMOUNT_ALIASES_CONFLICT');
  if (payload.currency && payload.moneda && text(payload.currency,12).toUpperCase() !== text(payload.moneda,12).toUpperCase())
    throw new HttpsError('invalid-argument','PAYMENT_CURRENCY_ALIASES_CONFLICT');
  const explicitAmountInput = payload.amount != null ? payload.amount : payload.monto;
  if (explicitAmountInput != null && explicitAmountInput !== '' && (typeof explicitAmountInput === 'boolean' ||
      !Number.isFinite(Number(explicitAmountInput)) || Math.abs(Number(explicitAmountInput)*100-Math.round(Number(explicitAmountInput)*100)) > 1e-6))
    throw new HttpsError('invalid-argument', 'PAYMENT_AMOUNT_PRECISION_INVALID');
  const explicitAmount = money(explicitAmountInput, 'Monto');
  const evidenceId = text(payload.evidenceId || payload.sourceRef || payload.documentRef, 500);
  const evidenceType = text(payload.evidenceType || payload.tipoEvidencia, 120);
  const anchorInstallment = Number(payload.anchorInstallment || payload.cuotaAncla || 0) || null;
  const inferenceRuleId = text(payload.inferenceRuleId || payload.reglaInferencia, 160);
  const confidence = text(payload.confidence || payload.confianza, 40).toUpperCase();
  if (inferred && !inferredEffectiveDate) throw new HttpsError('invalid-argument', 'La inferencia requiere fecha operativa de la cuota.');
  if (inferred && paidDate && payload.actualPaidDateEvidence !== true) {
    throw new HttpsError('failed-precondition', 'Una inferencia no puede inventar fecha real de pago.');
  }
  if (payload.partialPayment === true || payload.reversal === true || payload.conflictingEvidence === true)
    throw new HttpsError('failed-precondition', 'PAYMENT_CONTRADICTORY_OR_PARTIAL_EVIDENCE_REQUIRES_REVIEW');
  const applicationEvidenceTypeInput = text(payload.applicationEvidenceType || payload.tipoEvidenciaAplicacion, 120).toUpperCase();
  const applicationProved = Boolean(payload.forceReconciliation === true || applicationDate || invoiceNumber || invoiceDocumentRef || ['insurer_invoice','insurer_statement','commission_statement'].includes(source));
  const receiptRef = tenantData(authz.tenantId, 'recibosEsperados').doc(receiptId);
  const reqPayload = {
    receiptId, source, inferred, paidDate, inferredEffectiveDate, evidenceAsOfDate, applicationDate, invoiceDate,
    invoiceNumber, paymentMethod, paymentSupportDocumentRef, invoiceDocumentRef, amount: explicitAmount,
    evidenceId, evidenceType, anchorInstallment, inferenceRuleId, confidence,
    forceReconciliation: payload.forceReconciliation === true, applicationEvidenceType: applicationEvidenceTypeInput,
    currency:text(payload.currency || payload.moneda,12).toUpperCase(), actualPaidDateEvidence:payload.actualPaidDateEvidence === true
  };
  const reqId = operationRequestId(authz.tenantId, operationName, reqPayload, data.requestId);
  const reqRef = requestRef(authz.tenantId, reqId, previewOnly);
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
    assertPaymentRecordAliases(policy);
    assertPaymentRecordAliases(receipt,true);
    const paymentCountryCode = assertPaymentCountryScope(authz, policy, receipt);
    const clientId = id(receipt.clienteId || policy.clienteId, 'clienteId');
    if (receipt.tenantId && receipt.tenantId !== authz.tenantId || policy.tenantId && policy.tenantId !== authz.tenantId ||
        receipt.clienteId && policy.clienteId && receipt.clienteId !== policy.clienteId)
      throw new HttpsError('failed-precondition', 'PAYMENT_POLICY_RECEIPT_IDENTITY_MISMATCH');
    if (previewOnly) {
      // Protect every root of the payment transaction, not just the submitted
      // receipt ID. No authentic customer, policy or advisor relationship may
      // be affected by a synthetic rehearsal.
      const synthetic = value => previewSyntheticId(value);
      if (authz.tenantId !== 'alianzas-soluciones' ||
          !synthetic(receiptId) || !synthetic(policyId) || !synthetic(clientId) ||
          receipt.__syntheticQa !== true || policy.__syntheticQa !== true ||
          text(policy.clienteId,180) !== clientId ||
          text(receipt.linkedOpsManagementId,180) ||
          (receipt.asesorId && !synthetic(receipt.asesorId)) ||
          (policy.asesorId && !synthetic(policy.asesorId)))
        throw new HttpsError('permission-denied','PREVIEW_PAYMENT_SYNTHETIC_RELATION_REQUIRED');
      const syntheticClientSnap = await tx.get(tenantData(authz.tenantId,'clientes').doc(clientId));
      if (!syntheticClientSnap.exists || syntheticClientSnap.data().__syntheticQa !== true)
        throw new HttpsError('permission-denied','PREVIEW_PAYMENT_SYNTHETIC_CLIENT_REQUIRED');
    }

    const portfolioQuery = tenantData(authz.tenantId, 'carteraPrimas').where('reciboId', '==', receiptId);
    const cobroQuery = tenantData(authz.tenantId, 'cobros').where('reciboId', '==', receiptId);
    const [portfolioSnap, cobroSnap] = await Promise.all([tx.get(portfolioQuery), tx.get(cobroQuery)]);
    const activePortfolioRows = portfolioSnap.docs.filter(doc => activePortfolio(doc.data() || {}));
    if (previewOnly && (portfolioSnap.docs.some(doc =>
          !previewSyntheticId(doc.id) || doc.data().__syntheticQa !== true) ||
        cobroSnap.docs.some(doc =>
          (doc.id !== deterministicCobroId(authz.tenantId, receiptId) && !previewSyntheticId(doc.id)) ||
          doc.data().__syntheticQa !== true)))
      throw new HttpsError('permission-denied','PREVIEW_PAYMENT_SYNTHETIC_LEDGER_REQUIRED');
    if (activePortfolioRows.length > 1) throw new HttpsError('failed-precondition', 'Más de una obligación activa corresponde al mismo recibo.');
    if (cobroSnap.size > 1) throw new HttpsError('failed-precondition', 'Más de un cobro corresponde al mismo recibo.');
    const existingCobro = cobroSnap.empty ? null : (cobroSnap.docs[0].data() || {});
    const cobroPaid = Boolean(existingCobro && (norm(existingCobro.estado) === 'pagado' || /^PAID_/.test(text(existingCobro.paymentState, 80).toUpperCase())));
    const receiptPaid = norm(receipt.estado) === 'pagado' || /^PAID_/.test(text(receipt.paymentState, 80).toUpperCase());
    if (receiptPaid && existingCobro && !cobroPaid)
      throw new HttpsError('failed-precondition', 'PAYMENT_RECEIPT_COBRO_STATE_CONFLICT: el recibo pagado y el cobro vinculado requieren revisión.');
    const existingPaid = cobroPaid || (receiptPaid && !existingCobro);
    const applicationEvidenceSource = ['insurer_invoice', 'insurer_statement', 'commission_statement'].includes(source);
    // An imported/confirmed paid receipt may predate the physical cobro row.
    // Only the explicit insurer-application operation may link that history;
    // never accept it as a second payment or as an automatic inference.
    const legacyPaidReceiptReconciliation = !existingCobro && receiptPaid && operationName === 'reconcile_payment';
    const enrichment = applicationEvidenceSource && (cobroPaid || legacyPaidReceiptReconciliation);
    if (existingPaid && !enrichment) throw new HttpsError('failed-precondition', 'PAYMENT_ALREADY_APPLIED: no se puede registrar de nuevo el mismo recibo.');
    if (!existingPaid && activePortfolioRows.length !== 1)
      throw new HttpsError('failed-precondition', 'PAYMENT_ACTIVE_PORTFOLIO_REQUIRED: falta obligación activa única para aplicar el pago.');

    const obligationAmount = receiptAmount(receipt);
    const documentedAmount = explicitAmount != null ? explicitAmount : obligationAmount;
    const receiptCurrency = text(receipt.moneda || policy.moneda, 12).toUpperCase();
    if (!receiptCurrency || text(policy.moneda,12).toUpperCase() !== receiptCurrency ||
        payload.currency && text(payload.currency,12).toUpperCase() !== receiptCurrency ||
        payload.moneda && text(payload.moneda,12).toUpperCase() !== receiptCurrency)
      throw new HttpsError('failed-precondition', 'PAYMENT_EXACT_CURRENCY_REQUIRED');
    if (existingCobro) assertPaymentIdentity(authz, policy, receipt, existingCobro, 'COBRO', !cobroPaid);
    for (const row of activePortfolioRows) assertPaymentIdentity(authz, policy, receipt, row.data(), 'PORTFOLIO');
    // R51 concerns documentary rounding. It never reallocates a new bank or
    // client payment, nor replaces a recorded paid amount with a later invoice.
    const amount = cobroPaid ? Number(existingCobro.monto) : (existingPaid ? obligationAmount : documentedAmount);
    if (!Number.isFinite(amount) || Math.abs(amount*100-Math.round(amount*100)) > 1e-6)
      throw new HttpsError('failed-precondition', 'PAYMENT_RECORDED_AMOUNT_PRECISION_INVALID');
    if (amount == null || amount <= 0 || obligationAmount == null || obligationAmount <= 0)
      throw new HttpsError('failed-precondition', 'El recibo o el pago no tiene monto válido.');
    if (Math.round(amount*100) !== Math.round(obligationAmount*100)) {
      const code = existingPaid ? 'PAYMENT_EXISTING_RESIDUAL_REQUIRES_ALLOCATION' : 'PAYMENT_AMOUNT_REQUIRES_EXACT_ALLOCATION';
      const residualAmount=(Math.round(obligationAmount*100)-Math.round(amount*100))/100;
      const explanation=residualAmount>0?'Faltan '+receiptCurrency+' '+residualAmount.toFixed(2)+'.':'El pago supera la obligación en '+receiptCurrency+' '+Math.abs(residualAmount).toFixed(2)+'.';
      throw new HttpsError('failed-precondition','Pago: '+receiptCurrency+' '+amount.toFixed(2)+'; obligación: '+receiptCurrency+' '+obligationAmount.toFixed(2)+'. '+explanation+' Se requiere asignar la diferencia antes de cerrar el recibo.', {reason:code,recordedPaymentAmount:amount,obligationAmount,
        residualAmount,
        residualCents:Math.round(obligationAmount*100)-Math.round(amount*100),currency:receiptCurrency,
        financialWrites:0,roundingPolicyCannotSettleMoney:true});
    }
    const applicationEvidenceRef = evidenceId || invoiceDocumentRef || invoiceNumber;
    const compare = (original, documented, originalRef, documentedRef) => documentaryAmountVariance({
      kind:'APPLICATION_DOCUMENT',country:paymentCountryCode,currency:receiptCurrency,identityExact:true,
      original:{amount:original,sourceRef:originalRef},documented:{amount:documented,sourceRef:documentedRef}
    });
    const applicationVariance = enrichment ? compare(amount,documentedAmount,
      (cobroSnap.empty?'recibosEsperados/'+receiptId:'cobros/'+cobroSnap.docs[0].id)+'#monto',applicationEvidenceRef) : null;
    const obligationVariance = enrichment ? compare(obligationAmount,documentedAmount,
      'recibosEsperados/'+receiptId+'#monto',applicationEvidenceRef) : null;
    if (enrichment && [applicationVariance,obligationVariance].some(v=>v.differenceCents!==0&&!v.accepted))
      throw new HttpsError('failed-precondition', 'PAYMENT_APPLICATION_VARIANCE_REQUIRES_REVIEW');
    if (legacyPaidReceiptReconciliation && Math.round(documentedAmount*100)!==Math.round(obligationAmount*100))
      throw new HttpsError('failed-precondition', 'PAYMENT_LEGACY_ACTUAL_AMOUNT_UNPROVEN');
    const cobroDoc = cobroSnap.empty ? null : cobroSnap.docs[0];
    const cobroId = cobroDoc ? cobroDoc.id : deterministicCobroId(authz.tenantId, receiptId);
    const cobroRef = tenantData(authz.tenantId, 'cobros').doc(cobroId);
    if (!cobroDoc && (await tx.get(cobroRef)).exists)
      throw new HttpsError('failed-precondition', 'PAYMENT_DETERMINISTIC_COBRO_ID_CONFLICT: revisar relación del recibo.');
    const beforeCobro = cobroDoc ? (cobroDoc.data() || {}) : {};
    const advisorReported = advisorReportPending(receipt);
    const existingPaidDate = text(beforeCobro.paidDate || beforeCobro.fechaPago || (existingPaid ? (receipt.paidDate || receipt.fechaPago) : ''), 32);
    const receiptPaidDate = text(receipt.paidDate || receipt.fechaPago,32);
    if (enrichment && (receipt.paidDate && receipt.fechaPago && receipt.paidDate !== receipt.fechaPago ||
        receiptPaidDate && existingPaidDate && receiptPaidDate !== existingPaidDate))
      throw new HttpsError('failed-precondition','PAYMENT_EXISTING_PAID_DATE_CONFLICT');
    if (enrichment && receipt.paymentState && beforeCobro.paymentState && receipt.paymentState !== beforeCobro.paymentState)
      throw new HttpsError('failed-precondition','PAYMENT_EXISTING_STATE_CONFLICT');
    const existingApplicationDate = text(beforeCobro.applicationDate || beforeCobro.fechaAplicacion || (existingPaid ? receipt.applicationDate : ''), 32);
    const reportPaidDate = advisorReported ? text(receipt.fechaPagoReportada || receipt.paidDate || receipt.fechaPago, 32) : '';
    const finalPaidDate = enrichment ? (existingPaidDate || (payload.actualPaidDateEvidence === true ? paidDate : '')) : (paidDate || reportPaidDate || existingPaidDate);
    const finalApplicationDate = applicationDate || existingApplicationDate;
    const finalInvoiceDate = invoiceDate || text(beforeCobro.invoiceDate || (existingPaid ? receipt.invoiceDate : ''), 32);
    const existingPaymentMethod = text(beforeCobro.paymentMethod || beforeCobro.metodo || beforeCobro.metodoPago || (existingPaid ? (receipt.paymentMethod || receipt.metodo || receipt.metodoPago) : ''),180);
    const finalPaymentMethod = enrichment ? existingPaymentMethod : (paymentMethod || (advisorReported ? text(receipt.metodoPago || receipt.paymentMethod,180) : '') || existingPaymentMethod);
    const existingPaymentSupportDocumentRef = text(beforeCobro.paymentSupportDocumentRef || beforeCobro.soportePagoRef || (existingPaid ? (receipt.paymentSupportDocumentRef || receipt.soportePagoRef) : ''),500);
    const finalPaymentSupportDocumentRef = enrichment ? existingPaymentSupportDocumentRef : (paymentSupportDocumentRef || (advisorReported ? text(receipt.paymentSupportDocumentRef || receipt.soportePagoRef,500) : '') || existingPaymentSupportDocumentRef);
    const isApplicationEnrichment = existingPaid && applicationEvidenceSource;
    const existingPaymentState = text(beforeCobro.paymentState || (existingPaid ? receipt.paymentState : ''), 80);
    const existingDirectOrInferred = text(beforeCobro.directOrInferred || (existingPaid ? receipt.directOrInferred : '') || (existingPaymentState === 'PAID_INFERRED' ? 'INFERRED' : ''), 80);
    const existingPaymentEvidenceType = text(beforeCobro.paymentEvidenceType || (existingPaid ? receipt.paymentEvidenceType : ''), 120);
    const priorInferenceProvenance = beforeCobro.inferenceProvenance || (existingPaid && receipt.inferenceProvenance) || (existingPaymentState === 'PAID_INFERRED' || existingDirectOrInferred === 'INFERRED' ? {
      evidenceType: text(beforeCobro.evidenceType || receipt.evidenceType || beforeCobro.paymentEvidenceType || receipt.paymentEvidenceType, 120),
      evidenceId: text(beforeCobro.evidenceId || receipt.evidenceId || beforeCobro.sourceRef || receipt.sourceRef, 500),
      anchorInstallment: Number(beforeCobro.anchorInstallment || receipt.anchorInstallment || 0) || null,
      inferenceRuleId: text(beforeCobro.inferenceRuleId || receipt.inferenceRuleId, 160),
      inferredEffectiveDate: text(beforeCobro.inferredEffectiveDate || receipt.inferredEffectiveDate, 32),
      evidenceAsOfDate: text(beforeCobro.evidenceAsOfDate || receipt.evidenceAsOfDate, 32),
      confidence: text(beforeCobro.confidence || receipt.confidence, 40) || 'HIGH'
    } : null);
    const paymentState = isApplicationEnrichment && existingPaymentState ? existingPaymentState : paidStateFor(source, inferred);
    const directOrInferred = isApplicationEnrichment && existingDirectOrInferred ? existingDirectOrInferred : (inferred ? 'INFERRED' : 'DIRECT');
    const paymentEvidenceType = isApplicationEnrichment && existingPaymentEvidenceType ? existingPaymentEvidenceType : (advisorReported ? 'ADVISOR_REPORTED' : source.toUpperCase());
    const paymentOrigin = advisorReported ? 'ADVISOR_REPORTED_PAYMENT' : (source === 'crm_migrated_direct' ? 'CRM_MIGRATED_DIRECT_PAYMENT' : (source === 'client_reported' ? 'CLIENT_PORTAL' : text(beforeCobro.paymentOrigin || (existingPaid ? receipt.paymentOrigin : ''), 120) || 'OPERATIVE_DIRECT_PAYMENT'));
    const applicationEvidenceType = applicationProved ? (applicationEvidenceTypeInput || (source === 'crm_migrated_direct' ? 'MANUAL_RECONCILIATION' : source.toUpperCase())) : text(beforeCobro.applicationEvidenceType || receipt.applicationEvidenceType, 120);
    const existingApplicationState = text(beforeCobro.applicationState || (existingPaid ? receipt.applicationState : ''), 80);
    const applicationState = (applicationProved || finalApplicationDate)
      ? ((inferred || (isApplicationEnrichment && (existingPaymentState === 'PAID_INFERRED' || existingDirectOrInferred === 'INFERRED'))) ? 'APPLIED_INFERRED' : 'APPLIED_DIRECT')
      : (existingApplicationState || (beforeCobro.conciliado === true ? 'APPLIED_DIRECT' : 'PENDING_APPLICATION'));
    const technicalNow = now();

    const shared = {
      paymentState,
      applicationState,
      directOrInferred,
      paymentEvidenceType,
      paymentOrigin,
      applicationEvidenceType,
      evidenceAsOfDate: evidenceAsOfDate || text(beforeCobro.evidenceAsOfDate || (existingPaid ? receipt.evidenceAsOfDate : ''), 32),
      inferredEffectiveDate: inferredEffectiveDate || text(beforeCobro.inferredEffectiveDate || (existingPaid ? receipt.inferredEffectiveDate : ''), 32),
      matchedPolicyId: policyId,
      matchedReceiptId: receiptId,
      reconciledAt: technicalNow,
      updatedAt: technicalNow,
      updatedByUid: authz.actor.uid
    };
    if (evidenceId) { shared.evidenceId = evidenceId; shared.sourceRef = text(payload.sourceRef || payload.documentRef || evidenceId, 500); }
    if (evidenceType) shared.evidenceType = evidenceType;
    if (anchorInstallment) shared.anchorInstallment = anchorInstallment;
    if (inferenceRuleId) shared.inferenceRuleId = inferenceRuleId;
    if (confidence) shared.confidence = confidence;
    if (priorInferenceProvenance) shared.inferenceProvenance = priorInferenceProvenance;
    if (finalPaidDate) shared.paidDate = finalPaidDate;
    if (finalPaymentMethod) shared.paymentMethod = finalPaymentMethod;
    if (finalPaymentSupportDocumentRef) shared.paymentSupportDocumentRef = finalPaymentSupportDocumentRef;
    if (finalApplicationDate) shared.applicationDate = finalApplicationDate;
    if (finalInvoiceDate) shared.invoiceDate = finalInvoiceDate;
    if (invoiceNumber) shared.invoiceNumber = invoiceNumber;
    if (invoiceDocumentRef) shared.invoiceDocumentRef = invoiceDocumentRef;
    if (enrichment) {
      preserveRecordedPayment(shared, cobroPaid ? beforeCobro : receipt);
      shared.applicationAmount = documentedAmount;
      shared.applicationEvidence = { sourceType:source,evidenceId,sourceRef:text(payload.sourceRef || payload.documentRef || applicationEvidenceRef,500),
        evidenceType:applicationEvidenceType,evidenceAsOfDate,invoiceNumber,invoiceDocumentRef,
        reportedPaidDate:paidDate,actualPaidDateEvidence:payload.actualPaidDateEvidence===true,applicationDate:finalApplicationDate,
        reportedPaymentMethod:paymentMethod,reportedPaymentSupportDocumentRef:paymentSupportDocumentRef };
      shared.documentaryAmountVariance = applicationVariance;
      shared.documentaryObligationVariance = obligationVariance;
      shared.paymentAmountComparison = { recordedPaymentAmount:amount,obligationAmount,documentedApplicationAmount:documentedAmount,
        obligationMinusPaymentCents:Math.round(obligationAmount*100)-Math.round(amount*100),
        obligationMinusPaymentAmount:(Math.round(obligationAmount*100)-Math.round(amount*100))/100,
        currency:receiptCurrency,bankSettlementProved:false,amountAdjustmentCreated:false };
    }

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
      conciliado: /^APPLIED_/.test(applicationState),
      ...shared
    });
    if (previewOnly) cobro.__syntheticQa = true;
    if (finalPaidDate) cobro.fechaPago = finalPaidDate;
    if (finalPaymentMethod) cobro.metodo = finalPaymentMethod;
    if (invoiceNumber) cobro.numeroFactura = invoiceNumber;

    const receiptPaymentState = advisorReported
      ? 'pago_reportado_asesor_aplicado'
      : (isApplicationEnrichment && text(receipt.estadoOperativo, 120)
        ? text(receipt.estadoOperativo, 120)
        : (source === 'client_reported' ? 'pago_reportado_aplicado' : (inferred ? 'pago_inferido' : 'pagado')));
    const receiptPatch = {
      estado: 'Pagado',
      estadoOperativo: receiptPaymentState,
      cobroId,
      paymentOrigin,
      paymentIntakeState: advisorReported ? 'VALIDATED_APPLIED' : text(receipt.paymentIntakeState, 120),
      conciliadoPago: true,
      conciliado: /^APPLIED_/.test(applicationState),
      ...shared
    };
    if (finalPaidDate) {
      receiptPatch.fechaPago = finalPaidDate;
      if (source === 'client_reported') receiptPatch.fechaPagoReportada = finalPaidDate;
    }
    if (finalPaymentMethod) receiptPatch.metodoPago = finalPaymentMethod;
    if (enrichment) preserveRecordedPayment(receiptPatch, receipt);
    if (invoiceNumber) receiptPatch.numeroFactura = invoiceNumber;

    tx.set(cobroRef, cobro, { merge: true });
    tx.set(receiptRef, receiptPatch, { merge: true });
    const linkedManagementId = advisorReported ? text(receipt.linkedOpsManagementId, 180) : '';
    if (linkedManagementId) {
      const linkedRef = tenantData(authz.tenantId, 'gestiones').doc(id(linkedManagementId, 'managementId'));
      tx.set(linkedRef, {
        estado: 'Resuelta',
        paymentReportStatus: 'VALIDATED_APPLIED',
        resultado: 'Pago validado y aplicado por Operativo/Dirección.',
        resolvedAt: technicalNow,
        updatedAt: technicalNow,
        updatedByUid: authz.actor.uid
      }, { merge: true });
    }
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
      if (shared.inferredEffectiveDate) portfolioPatch.inferredEffectiveDate = shared.inferredEffectiveDate;
      if (enrichment) { portfolioPatch.paymentAmountComparison = shared.paymentAmountComparison; portfolioPatch.documentaryAmountVariance = applicationVariance; }
      if (finalApplicationDate) portfolioPatch.applicationDate = finalApplicationDate;
      tx.set(pRef, portfolioPatch, { merge: true });
    }

    const committed = {
      ok: true,
      operation: operationName,
      receiptId,
      cobroId,
      policyId,
      clientId,
      paymentState,
      applicationState,
      amount,
      ...(enrichment ? { applicationAmount:documentedAmount,documentaryAmountVariance:applicationVariance,paymentAmountComparison:shared.paymentAmountComparison } : {}),
      paymentFactsDigest: digest(recordedPaymentFacts(cobro)),
      paidDate: finalPaidDate || '',
      inferredEffectiveDate: shared.inferredEffectiveDate || '',
      applicationDate: finalApplicationDate || '',
      invoiceDate: finalInvoiceDate || '',
      ...(Object.prototype.hasOwnProperty.call(shared,'paymentOrigin')?{paymentOrigin:shared.paymentOrigin}:{}),
      linkedManagementId: advisorReported ? text(receipt.linkedOpsManagementId, 180) : '',
      invoiceNumber: invoiceNumber || text(beforeCobro.invoiceNumber || beforeCobro.numeroFactura, 180),
      portfolioUpdated: activePortfolioRows.length === 1,
      serverOwned: true,
      idempotent: true
    };
    tx.set(eventRef(authz.tenantId, eventId, previewOnly), {
      schemaVersion: VERSION,
      contractVersion: CONTRACT_VERSION,
      tenantId: authz.tenantId,
      eventId,
      operation: operationName,
      requestId: reqId,
      actor: authz.actor,
      receiptId,
      cobroId,
      payloadDigest: digest(reqPayload),
      resultDigest: digest(committed),
      ...(enrichment ? { recordedPaymentBefore:{amount,sourceCollection:cobroPaid?'cobros':'recibosEsperados',sourceId:cobroPaid?cobroId:receiptId,facts:recordedPaymentFacts(cobroPaid?beforeCobro:receipt)},
        recordedPaymentAfter:{amount,facts:recordedPaymentFacts(cobro)},applicationEvidence:shared.applicationEvidence,
        documentaryAmountVariance:applicationVariance,paymentAmountComparison:shared.paymentAmountComparison } : {}),
      createdAt: technicalNow
    }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation: operationName, eventId, payloadDigest: digest(reqPayload), result: committed, committedAt: technicalNow }, { merge: true });
    return committed;
  });

  const [receiptReadback, cobroReadback] = await Promise.all([receiptRef.get(), tenantData(authz.tenantId, 'cobros').doc(result.cobroId).get()]);
  if (!receiptReadback.exists || !cobroReadback.exists) throw new HttpsError('data-loss', 'No fue posible confirmar la persistencia del pago.');
  const confirmedReceipt = receiptReadback.data() || {}, confirmedCobro = cobroReadback.data() || {};
  if (result.amount != null && receiptAmount(confirmedCobro) !== result.amount ||
      result.paymentFactsDigest && digest(recordedPaymentFacts(confirmedCobro)) !== result.paymentFactsDigest ||
      result.documentaryAmountVariance && (digest(confirmedCobro.documentaryAmountVariance) !== digest(result.documentaryAmountVariance) ||
        digest(confirmedReceipt.documentaryAmountVariance) !== digest(result.documentaryAmountVariance)) ||
      confirmedReceipt.paymentState !== result.paymentState || confirmedCobro.paymentState !== result.paymentState ||
      confirmedReceipt.applicationState !== result.applicationState || confirmedCobro.applicationState !== result.applicationState ||
      confirmedReceipt.conciliado !== /^APPLIED_/.test(result.applicationState) || confirmedCobro.conciliado !== /^APPLIED_/.test(result.applicationState) ||
      (result.invoiceDate && (confirmedReceipt.invoiceDate !== result.invoiceDate || confirmedCobro.invoiceDate !== result.invoiceDate)))
    throw new HttpsError('data-loss', 'El pago se escribió, pero la conciliación o fecha de factura no tiene lectura posterior confirmada. Revisar antes de reintentar.');
  return result;
}

function evidenceOrigin(type) {
  if (type === 'COMMISSION_STATEMENT_INSTALLMENT_N') return 'COMMISSION_STATEMENT';
  if (type === 'BANK_STATEMENT_MATCH') return 'BANK';
  return 'INSURER';
}
function evidenceSourceType(type) {
  if (type === 'COMMISSION_STATEMENT_INSTALLMENT_N') return 'commission_statement';
  if (type === 'BANK_STATEMENT_MATCH') return 'payment_support';
  if (type === 'INSURER_STATEMENT_PENDING_FROM_N') return 'insurer_statement';
  return 'insurer_invoice';
}
function assertProposalWrite(authz,accessConfig) {
  if (!ADMIN_ROLES.has(authz.actor.activeRole)) throw new HttpsError('permission-denied','PROPOSAL_MANAGEMENT_ROLE_REQUIRED');
  const restricted=unique(authz.member.modulesRestricted||authz.member.modulosRestringidos).map(norm);
  if(restricted.includes('conciliaciones'))throw new HttpsError('permission-denied','PROPOSAL_MODULE_WRITE_DENIED');
  const matrix=accessConfig&&accessConfig.rolePermissions||{};
  const roleKey=Object.keys(matrix).find(key=>normalizeRole(key)===authz.actor.activeRole);
  const modules=roleKey&&matrix[roleKey]||{};
  const moduleKey=Object.keys(modules).find(key=>norm(key)==='conciliaciones');
  const rights=moduleKey&&modules[moduleKey]||{};
  if(rights.ver===false||rights.editar===false||rights.write===false)
    throw new HttpsError('permission-denied','PROPOSAL_MODULE_WRITE_DENIED');
}
function syntheticProposalRun(tenantId,payload) {
  return tenantId==='alianzas-soluciones'&&/^cobledgerqa_[a-z0-9_]{12,80}$/.test(text(payload.sourceRunId,180))&&
    /^b3005qa_i66_proposal_[a-z0-9_]{12,100}$/.test(text(payload.proposalId,180))?text(payload.sourceRunId,180):'';
}
function assertReconciliationFinancialTarget(authz,policy,receipt,row,kind,options = {}) {
  const currency=text(receipt.moneda||receipt.currency||policy.moneda,12).toUpperCase();
  const rowCurrency=text(row.moneda||row.currency,12).toUpperCase();
  const policyId=text(policy.id,180),clientId=text(receipt.clienteId||policy.clienteId,180);
  const mismatch=field=>{const error=new HttpsError('failed-precondition','RECONCILIATION_'+kind+'_TARGET_MISMATCH');
    error.targetIssue={destination:kind==='COBRO'?'Cobro':'Cartera',field};throw error;};
  try{assertPaymentCountryScope(authz,policy,row);}catch(_){mismatch('país');}
  if(row.tenantId&&row.tenantId!==authz.tenantId)mismatch('empresa');
  if(row.reciboId!==receipt.id)mismatch('recibo');
  if((row.polizaId||row.policyId)&&text(row.polizaId||row.policyId,180)!==policyId||
      row.matchedPolicyId&&text(row.matchedPolicyId,180)!==policyId)mismatch('póliza');
  if((row.clienteId||row.clientId)&&text(row.clienteId||row.clientId,180)!==clientId)mismatch('cliente');
  if(!rowCurrency||rowCurrency!==currency)mismatch('moneda');
  let matchingAmount=false;try{matchingAmount=receiptAmount(row)===receiptAmount(receipt);}catch(_){}
  if(options.amountMustMatch !== false && !matchingAmount)mismatch('importe');
}
async function proposalApplicationContext(authz, payload, read,requireWrite=false) {
  const configSnap = await read(reconciliationConfigRef(authz.tenantId));
  const accessSnap = await read(db.collection('tenants').doc(authz.tenantId).collection('config').doc('access'));
  const accessConfig = accessSnap.exists?accessSnap.data():{};
  if(requireWrite)assertProposalWrite(authz,accessConfig);
  if(!configSnap.exists)return proposalBoundary.review('TENANT_RECONCILIATION_CONFIG_REQUIRED');
  const qaRun=syntheticProposalRun(authz.tenantId,payload);
  let selected=null;
  if(!qaRun){
    try{selected=await sourceIntake.selectedLedger({tenantId:authz.tenantId,requestedRun:text(payload.sourceRunId,180),read,
      controlRef:controlRef(authz.tenantId),runRef:runId=>runRef(authz.tenantId,runId),validate:validateActiveLedgerContract});}
    catch(error){return proposalBoundary.review(error.code==='SOURCE_ACTIVE_RUN_CHANGED'?error.code:'SOURCE_LEDGER_INTEGRITY_MISMATCH');}
  }
  const qaManifest=qaRun?await read(tenantData(authz.tenantId,'cobrosLedgerQaRuns').doc(qaRun)):null;
  const sourceManifest=selected&&selected.manifest||qaManifest&&qaManifest.exists&&qaManifest.data();
  let admittedProposal=null;
  if(sourceManifest&&sourceManifest.schemaVersion===sourceIntake.MANIFEST_SCHEMA){
    const proposalRun=qaRun?tenantData(authz.tenantId,'cobrosLedgerQaRuns').doc(qaRun):runRef(authz.tenantId,sourceManifest.runId);
    const sourceRow=await read(proposalRun.collection('propuestasConciliacion').doc(id(payload.proposalId,'proposalId')));
    if(sourceRow.exists)admittedProposal=sourceRow.data();
  }
  // Only a server-verified retained run can substitute the active pointer for
  // this assessment. Its original runId preserves prior application identity.
  const scopedRead=async ref=>selected&&ref.path===controlRef(authz.tenantId).path?
    {exists:true,data:()=>selected.pointer}:read(ref);
  const assessment=await proposalBoundary.assessProposalApplication({tenantId:authz.tenantId,payload,read:scopedRead,syntheticQaRun:qaRun,
    items:collection=>tenantData(authz.tenantId,collection),
    control:()=>qaRun?tenantData(authz.tenantId,'cobrosLedgerQaControl').doc(qaRun):controlRef(authz.tenantId),
    runRef:runId=>qaRun?tenantData(authz.tenantId,'cobrosLedgerQaRuns').doc(runId):runRef(authz.tenantId,runId),
    assertScope:(policy,receipt)=>{
      const country=assertPaymentCountryScope(authz,policy,receipt);
      if(admittedProposal&&!qaRun&&(policy.__syntheticQa===true||/^b3005qa_/.test(String(policy.id||policy.polizaId||''))||
          receipt&&(receipt.__syntheticQa===true||/^b3005qa_/.test(String(receipt.id||'')))))
        throw new HttpsError('permission-denied','SOURCE_REAL_INTAKE_SYNTHETIC_TARGET_DENIED');
      if(sourceManifest&&sourceManifest.schemaVersion===sourceIntake.MANIFEST_SCHEMA&&
          (country!==sourceManifest.source.country||text(policy.aseguradoraId||policy.insurerId,180)!==sourceManifest.source.insurerId))
        throw new HttpsError('permission-denied','SOURCE_POLICY_INSURER_OR_COUNTRY_MISMATCH');
      if(admittedProposal&&(admittedProposal.policyStartDate&&sourceIntake.canonicalPolicyDate(policy,'start')!==admittedProposal.policyStartDate||
          admittedProposal.policyEndDate&&sourceIntake.canonicalPolicyDate(policy,'end')!==admittedProposal.policyEndDate))
        throw new HttpsError('failed-precondition','SOURCE_POLICY_TERM_MISMATCH');
      try {
        const ctx=proposalAccess.resolve({auth:authz.auth,member:authz.member,config:accessConfig,
          tenantId:authz.tenantId,activeRole:authz.actor.activeRole,collection:'conciliaciones',country});
        proposalAccess.allowRow(ctx,policy,receipt?[receipt]:[]);
      } catch(error) { throw new HttpsError('permission-denied',text(error&&error.code||'PROPOSAL_SCOPE_DENIED',180)); }
      return country;
    },
    config:configSnap.exists?configSnap.data():{}});
  if(admittedProposal&&admittedProposal.installment){
    // The source quota identifies the anchor, not every prior quota inferred
    // by the existing planner. Apply this constraint to selection/anchor only.
    const matchesSourceQuota=(policy,receipt)=>sourceIntake.matchesCanonicalInstallment(admittedProposal,policy,receipt);
    if(assessment.status==='RESOLUTION_DRAFT'){
      assessment.candidates=assessment.candidates.filter(candidate=>matchesSourceQuota(candidate.policy,candidate.receipt));
      const allowed=new Set(assessment.candidates.map(candidate=>candidate.policy.id+'|'+candidate.receipt.id));
      assessment.resolutionView.resolutionOptions=assessment.resolutionView.resolutionOptions.filter(option=>allowed.has(option.policyId+'|'+option.receiptId));
    }else if(assessment.eligible&&!matchesSourceQuota(assessment.policy,assessment.receipts.find(row=>row.id===assessment.evidencePayload.receiptId)))
      return proposalBoundary.review('SOURCE_RECEIPT_INSTALLMENT_MISMATCH');
  }
  if(admittedProposal&&assessment.eligible&&assessment.evidencePayload.evidenceType==='BANK_STATEMENT_MATCH'&&
      (!assessment.evidencePayload.paidDate||assessment.evidencePayload.actualPaidDateEvidence!==true))
    return proposalBoundary.review('SOURCE_BANK_PAID_DATE_REQUIRED');
  if(assessment.eligible)for(const target of assessment.plan.targets){
    const receipt=assessment.receipts.find(row=>row.id===target.receiptId);
    const [cobros,portfolio]=await Promise.all([
      read(tenantData(authz.tenantId,'cobros').where('reciboId','==',target.receiptId).limit(3)),
      read(tenantData(authz.tenantId,'carteraPrimas').where('reciboId','==',target.receiptId).limit(3))]);
    const activeRows=portfolio.docs.filter(doc=>activePortfolio(doc.data()||{}));
    if(cobros.docs.length>1||activeRows.length!==1)return proposalBoundary.review('PROPOSAL_FINANCIAL_TARGET_NOT_UNIQUE');
    try{for(const doc of cobros.docs)assertReconciliationFinancialTarget(authz,assessment.policy,receipt,doc.data(),'COBRO');
      for(const doc of activeRows)assertReconciliationFinancialTarget(authz,assessment.policy,receipt,doc.data(),'PORTFOLIO');
    }catch(error){const issue=error.targetIssue||{destination:'Destino financiero',field:'integridad'};
      return proposalBoundary.review('PROPOSAL_FINANCIAL_TARGET_MISMATCH',{targetIssue:issue,
        question:'La relación de '+issue.destination.toLowerCase()+' no coincide en '+issue.field+'. No se aplicó dinero; debe corregirse ese dato del destino.'});}
  }
  return assessment;
}

async function intakeSourceRun(authz,data,payload,previewOnly){
  let input;
  try{input=sourceIntake.prepareInput(authz.tenantId,payload);}
  catch(error){throw new HttpsError('invalid-argument',error.code||'SOURCE_INTAKE_INVALID');}
  const synthetic=sourceIntake.QA_SOURCE.test(input.source.sourceId);
  if(!synthetic&&(/^b3005qa_/.test(input.source.sourceId)||input.rows.some(row=>/^b3005qa_/.test(row.policyId)||/^b3005qa_/.test(row.receiptId))))
    throw new HttpsError('permission-denied','SOURCE_REAL_INTAKE_SYNTHETIC_TARGET_DENIED');
  if(previewOnly&&!synthetic)throw new HttpsError('permission-denied','SOURCE_INTAKE_PREVIEW_REAL_DATA_DENIED');
  if(synthetic){
    if(authz.tenantId!=='alianzas-soluciones')throw new HttpsError('permission-denied','SOURCE_QA_TENANT_DENIED');
    input.runId='cobledgerqa_'+input.batchDigest.slice(0,28);input.qaRunId=input.runId;
  }
  const qa=input.qaRunId||'';
  const targetRun=id=>tenantData(authz.tenantId,qa?'cobrosLedgerQaRuns':'cobrosLedgerRuns').doc(id);
  const targetControl=qa?tenantData(authz.tenantId,'cobrosLedgerQaControl').doc(qa):controlRef(authz.tenantId);
  const registryNames={sources:'cobrosLedgerSources',rows:'cobrosLedgerSourceRows',groups:'cobrosLedgerSourceGroups'};
  const registryRef=(kind,key)=>qa?targetRun(qa).collection('intake_'+kind).doc(key):tenantData(authz.tenantId,registryNames[kind]).doc(key);
  const bindRows=async(read,prepared)=>{
    const access=await read(db.collection('tenants').doc(authz.tenantId).collection('config').doc('access'));
    const accessConfig=access.exists?access.data():{};
    assertProposalWrite(authz,accessConfig);
    assertPaymentCountryScope(authz,{pais:prepared.source.country});
    let ctx;
    try{ctx=proposalAccess.resolve({auth:authz.auth,member:authz.member,config:accessConfig,tenantId:authz.tenantId,
      activeRole:authz.actor.activeRole,collection:'conciliaciones',country:prepared.source.country});}
    catch(error){throw new HttpsError('permission-denied',text(error.code||'SOURCE_INTAKE_SCOPE_DENIED',180));}
    const insurer=await read(tenantData(authz.tenantId,'aseguradoras').doc(prepared.source.insurerId));
    if(!insurer.exists||insurer.data().tenantId&&insurer.data().tenantId!==authz.tenantId||
       insurer.data().pais&&paymentCountry(insurer.data().pais)!==prepared.source.country)
      throw new HttpsError('failed-precondition','SOURCE_INSURER_CANONICAL_NOT_FOUND');
    if(!qa){
      const canonical=await read(tenantData(authz.tenantId,'conciliaciones').limit(1));
      if(canonical.docs.length)throw new HttpsError('failed-precondition','SOURCE_CANONICAL_PROJECTION_CONFLICT');
    }
    const policies=new Map(),receipts=new Map(),bindings=new Map();
    for(const row of prepared.rows){
      if(!policies.has(row.policyNumber)){
        const snap=await read(tenantData(authz.tenantId,'polizas').where('numero','==',row.policyNumber).limit(21));
        policies.set(row.policyNumber,snap.docs.map(doc=>Object.assign({id:doc.id},doc.data())));
      }
      const all=policies.get(row.policyNumber);
      if(all.length>20){bindings.set(row.key,{reason:'SOURCE_POLICY_EDITION_AMBIGUOUS'});continue;}
      const matches=all.filter(policy=>{
        if(policy.tenantId&&policy.tenantId!==authz.tenantId||text(policy.aseguradoraId||policy.insurerId,180)!==prepared.source.insurerId||
           paymentCountry(policy.pais)!==prepared.source.country||text(policy.moneda||policy.currency,12).toUpperCase()!==prepared.source.currency||
           row.policyId&&policy.id!==row.policyId||row.policyStartDate&&sourceIntake.canonicalPolicyDate(policy,'start')!==row.policyStartDate||
           row.policyEndDate&&sourceIntake.canonicalPolicyDate(policy,'end')!==row.policyEndDate)return false;
        try{proposalAccess.allowRow(ctx,policy);return true;}catch(_){return false;}
      });
      if(matches.length!==1){
        if(ctx.scope!=='all')throw new HttpsError('permission-denied','SOURCE_UNRESOLVED_SCOPE_DENIED');
        if(qa)throw new HttpsError('permission-denied','SOURCE_QA_POLICY_REQUIRED');
        bindings.set(row.key,{reason:matches.length?'SOURCE_POLICY_EDITION_AMBIGUOUS':'SOURCE_POLICY_EDITION_NOT_FOUND'});continue;
      }
      const policy=matches[0];
      if(!qa&&(policy.__syntheticQa===true||/^b3005qa_/.test(policy.id)))throw new HttpsError('permission-denied','SOURCE_REAL_INTAKE_SYNTHETIC_TARGET_DENIED');
      if(qa&&(!row.policyId||!row.receiptId||policy.__syntheticQa!==true||policy.qaRunId!==qa||!/^b3005qa_/.test(policy.id)))
        throw new HttpsError('permission-denied','SOURCE_QA_POLICY_REQUIRED');
      if(!receipts.has(policy.id)){
        const snap=await read(tenantData(authz.tenantId,'recibosEsperados').where('polizaId','==',policy.id).limit(101));
        receipts.set(policy.id,snap.docs.map(doc=>Object.assign({id:doc.id},doc.data())));
      }
      const canonicalReceipts=receipts.get(policy.id);
      let exact=canonicalReceipts.filter(receipt=>{
        if(receipt.tenantId&&receipt.tenantId!==authz.tenantId||receipt.clienteId&&policy.clienteId&&receipt.clienteId!==policy.clienteId)return false;
        try{assertPaymentCountryScope(authz,policy,receipt);proposalAccess.allowRow(ctx,policy,[receipt]);}catch(_){return false;}
        if(text(receipt.moneda||receipt.currency||policy.moneda,12).toUpperCase()!==prepared.source.currency)return false;
        if(row.receiptId)return receipt.id===row.receiptId;
        if(row.receiptNumber)return ['numeroReciboFuente','numeroRecibo','reciboNumero','numero','requerimiento'].some(k=>text(receipt[k],180)===row.receiptNumber);
        return false;
      });
      // A different insurer requirement number on each installment is normal.
      // When that external identifier has not yet been projected onto our
      // receipt, a complete, unambiguous canonical installment schedule can
      // bind the source to its *own* N/total receipt. An existing, conflicting
      // exact identifier is never displaced by this fallback.
      if(!exact.length&&!row.receiptId&&row.installmentIndex&&row.totalInstallments&&
          canonicalReceipts.length===row.totalInstallments&&
          Array.from({length:row.totalInstallments},(_,i)=>i+1).every(n=>
            canonicalReceipts.filter(receipt=>sourceIntake.matchesCanonicalInstallment(
              {installment:n+'/'+row.totalInstallments},policy,receipt)).length===1)){
        exact=canonicalReceipts.filter(receipt=>{
          if(receipt.tenantId&&receipt.tenantId!==authz.tenantId||receipt.clienteId&&policy.clienteId&&receipt.clienteId!==policy.clienteId)return false;
          try{assertPaymentCountryScope(authz,policy,receipt);proposalAccess.allowRow(ctx,policy,[receipt]);}catch(_){return false;}
          return text(receipt.moneda||receipt.currency||policy.moneda,12).toUpperCase()===prepared.source.currency&&
            sourceIntake.matchesCanonicalInstallment(row,policy,receipt);
        });
      }
      if(qa&&(exact.length!==1||exact[0].__syntheticQa!==true||exact[0].qaRunId!==qa||!/^b3005qa_/.test(exact[0].id)))
        throw new HttpsError('permission-denied','SOURCE_QA_RECEIPT_REQUIRED');
      let hold=canonicalReceipts.length>100?'SOURCE_RECEIPT_NOT_UNIQUE':exact.length!==1?'SOURCE_RECEIPT_IDENTITY_MISSING':'';
      const receipt=exact.length===1?exact[0]:null;
      if(!qa&&receipt&&(receipt.__syntheticQa===true||/^b3005qa_/.test(receipt.id)))throw new HttpsError('permission-denied','SOURCE_REAL_INTAKE_SYNTHETIC_TARGET_DENIED');
      if(receipt&&row.installmentIndex&&!sourceIntake.matchesCanonicalInstallment(row,policy,receipt))hold='SOURCE_RECEIPT_INSTALLMENT_MISMATCH';
      // Insurer invoice totals are authoritative gross premiums and may
      // correct a stale canonical receipt during the protected Apply step.
      // A bank transfer is not authority to alter the contractual premium.
      if(receipt&&prepared.source.evidenceType==='BANK_STATEMENT_MATCH'&&
          (row.amount==null||receiptAmount(receipt)!==row.amount))hold='SOURCE_RECEIPT_AMOUNT_MISMATCH';
      bindings.set(row.key,{policyId:policy.id,receiptId:receipt&&receipt.id||'',reason:hold});
    }
    return bindings;
  };
  try{return await sourceIntake.commitIntake({input,db,items:collection=>tenantData(authz.tenantId,collection),runRef:targetRun,
    controlRef:targetControl,registryRef,requestRef:id=>qa?targetRun(qa).collection('intakeRequests').doc(id):requestRef(authz.tenantId,id),
    eventRef:id=>qa?targetRun(qa).collection('intakeAudit').doc(id):eventRef(authz.tenantId,id),actor:authz.actor,reason:reason(data,true),now,
    validate:validateActiveLedgerContract,bindRows,qaPermission:synthetic});}
  catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError('failed-precondition',error.code||'SOURCE_INTAKE_COMMIT_FAILED');}
}
async function verifyProposalReadback(authz, result) {
  if (!result || !result.applicationId || !Array.isArray(result.results) || !result.results.length)
    throw new HttpsError('data-loss','PROPOSAL_APPLICATION_RECORD_NOT_CONFIRMED');
  const record = await tenantData(authz.tenantId,'reconciliationApplications').doc(result.applicationId).get();
  const durableResult=Object.assign({},result);delete durableResult.reused;delete durableResult.readbackConfirmed;
  if (!record.exists || record.data().status!=='APPLIED' || digest(record.data().result)!==digest(durableResult))
    throw new HttpsError('data-loss','PROPOSAL_APPLICATION_RECORD_NOT_CONFIRMED');
  assertPaymentCountryScope(authz,{pais:record.data().pais});
  const policySnapshot=await tenantData(authz.tenantId,'polizas').doc(result.policyId).get();
  if(!policySnapshot.exists)throw new HttpsError('data-loss','PROPOSAL_APPLICATION_POLICY_READBACK_MISSING');
  const policy=Object.assign({id:policySnapshot.id},policySnapshot.data());
  for (const target of result.results || []) {
    const [receipt,cobro] = await Promise.all([
      tenantData(authz.tenantId,'recibosEsperados').doc(target.receiptId).get(),
      tenantData(authz.tenantId,'cobros').doc(target.cobroId).get()
    ]);
    if (!receipt.exists || !cobro.exists || receipt.data().paymentState!==target.paymentState ||
        cobro.data().paymentState!==target.paymentState || receipt.data().applicationState!==target.applicationState ||
        cobro.data().applicationState!==target.applicationState || cobro.data().reciboId!==target.receiptId ||
        Number(cobro.data().monto)!==target.amount || text(cobro.data().moneda,12)!==target.currency ||
        receiptAmount(receipt.data())!==target.amount || text(receipt.data().moneda||receipt.data().currency,12)!==target.currency)
      throw new HttpsError('data-loss','PROPOSAL_APPLICATION_READBACK_MISMATCH');
    try{assertReconciliationFinancialTarget(authz,policy,Object.assign({id:receipt.id},receipt.data()),cobro.data(),'COBRO');}
    catch(_){throw new HttpsError('data-loss','PROPOSAL_APPLICATION_FINANCIAL_TARGET_READBACK_MISMATCH');}
    if (target.portfolioId) {
      const portfolio = await tenantData(authz.tenantId,'carteraPrimas').doc(target.portfolioId).get();
      if (!portfolio.exists || portfolio.data().carteraActiva!==false || portfolio.data().cobroId!==target.cobroId)
        throw new HttpsError('data-loss','PROPOSAL_APPLICATION_PORTFOLIO_READBACK_MISMATCH');
      try{assertReconciliationFinancialTarget(authz,policy,Object.assign({id:receipt.id},receipt.data()),portfolio.data(),'PORTFOLIO');}
      catch(_){throw new HttpsError('data-loss','PROPOSAL_APPLICATION_PORTFOLIO_TARGET_READBACK_MISMATCH');}
    }
  }
  return Object.assign({},result,{readbackConfirmed:true});
}
async function proposalApplication(authz,data,payload,apply,previewOnly) {
  // Financial amounts, receipt IDs, paid dates and evidence are read from the
  // server. Caller-supplied financial overrides are never accepted here.
  if (Object.keys(payload).some(key=>!['proposalId','sourceRunId','planDigest'].includes(key)))
    throw new HttpsError('invalid-argument','PROPOSAL_CALLER_FINANCIAL_PAYLOAD_DENIED');
  if (!ADMIN_ROLES.has(authz.actor.activeRole)) throw new HttpsError('permission-denied','PROPOSAL_MANAGEMENT_ROLE_REQUIRED');
  if (previewOnly && apply && !syntheticProposalRun(authz.tenantId,payload)) throw new HttpsError('permission-denied','PROPOSAL_PREVIEW_MUTATION_NOT_AUTHORIZED');
  const context = await proposalApplicationContext(authz,payload,ref=>ref.get(),apply);
  if (context.status==='ALREADY_APPLIED') {
    const verified = await verifyProposalReadback(authz,context.result);
    return Object.assign({},verified,{reused:true});
  }
  if (!apply || !context.eligible) return proposalBoundary.publicAssessment(context);
  reason(data,true);
  if (!payload.planDigest || payload.planDigest!==context.planDigest) return proposalBoundary.review('PROPOSAL_PLAN_CHANGED');
  return reconcileEvidence(authz,Object.assign({},data,{requestId:context.applicationId}),
    context.evidencePayload,false,{payload:{proposalId:context.proposalId,sourceRunId:context.sourceRunId},
      planDigest:context.planDigest,applicationId:context.applicationId});
}
async function resolveProposalApplication(authz,data,payload,previewOnly) {
  if(previewOnly&&!syntheticProposalRun(authz.tenantId,payload))throw new HttpsError('permission-denied','PROPOSAL_PREVIEW_MUTATION_NOT_AUTHORIZED');
  const motive=reason(data,true);
  const outcome=await db.runTransaction(async tx=>{
    const context=await proposalApplicationContext(authz,
      {proposalId:payload.proposalId,sourceRunId:payload.sourceRunId,resolutionDraft:true},ref=>tx.get(ref),true);
    if(context.status==='ALREADY_APPLIED')return {alreadyApplied:context.result};
    const prepared=proposalBoundary.prepareResolution(context,payload,authz.actor);
    if(prepared.status!=='RESOLUTION_READY')return proposalBoundary.publicAssessment(prepared);
    const record=prepared.record,previous=prepared.previous;
    if(previous&&previous.resolutionDigest===record.resolutionDigest)
      return {ok:true,status:'RESOLUTION_SAVED',resolutionId:prepared.resolutionRef.id,resolutionDigest:record.resolutionDigest,
        reused:true,writes:0,financialWrites:0,serverOwned:true};
    const eventId='propresolve_'+digest({resolutionId:prepared.resolutionRef.id,digest:record.resolutionDigest}).slice(0,28);
    const qaMark=context.syntheticQaRun?{__syntheticQa:true,qaRunId:context.syntheticQaRun}:{};
    const saved=Object.assign({},record,{reason:motive,createdAt:now(),updatedAt:now()},qaMark);
    tx.set(prepared.resolutionRef,saved,{merge:false});
    tx.set(eventRef(authz.tenantId,eventId),{schemaVersion:VERSION,tenantId:authz.tenantId,eventId,
      operation:'resolve_proposal_application',actor:authz.actor,reason:motive,
      before:previous||null,after:saved,createdAt:now(),...qaMark},{merge:false});
    return {ok:true,status:'RESOLUTION_SAVED',resolutionId:prepared.resolutionRef.id,resolutionDigest:record.resolutionDigest,
      writes:2,financialWrites:0,serverOwned:true};
  });
  if(outcome.alreadyApplied)return Object.assign({},await verifyProposalReadback(authz,outcome.alreadyApplied),{reused:true});
  if(outcome.status!=='RESOLUTION_SAVED')return outcome;
  const verified=await tenantData(authz.tenantId,'reconciliationResolutions').doc(outcome.resolutionId).get();
  if(!verified.exists||verified.data().resolutionDigest!==outcome.resolutionDigest)
    throw new HttpsError('data-loss','PROPOSAL_RESOLUTION_READBACK_MISMATCH');
  return Object.assign({},outcome,{readbackConfirmed:true});
}
async function reconcileEvidence(authz, data, payload, previewOnly, proposalRequest = null) {
  const policyId = id(payload.policyId || payload.polizaId, 'polizaId');
  const reconciliationConfig = await readReconciliationConfig(authz.tenantId, previewOnly === true);
  const evidencePayload = {
    policyId,
    evidenceType: text(payload.evidenceType || payload.type || payload.sourceType, 120),
    evidenceId: text(payload.evidenceId || payload.sourceRef || payload.documentRef, 500),
    sourceRef: text(payload.sourceRef || payload.documentRef || payload.evidenceId, 500),
    receiptId: text(payload.receiptId || payload.reciboId, 180),
    anchorInstallment: Number(payload.anchorInstallment || payload.installmentNumber || payload.numeroCuota || 0) || null,
    installment: text(payload.installment || payload.cuota, 120),
    totalInstallments: Number(payload.totalInstallments || payload.installmentTotal || payload.totalCuotas || 0) || null,
    evidenceAsOfDate: isoDate(payload.evidenceAsOfDate || payload.fechaCorteEvidencia, 'Fecha de evidencia', false),
    paidDate: isoDate(payload.paidDate || payload.fechaPago, 'Fecha real de pago', false),
    applicationDate: isoDate(payload.applicationDate || payload.fechaAplicacion, 'Fecha de aplicación', false),
    invoiceDate: isoDate(payload.invoiceDate || payload.fechaFactura, 'Fecha de factura', false),
    invoiceNumber: text(payload.invoiceNumber || payload.numeroFactura, 180),
    paymentMethod: text(payload.paymentMethod || payload.metodoPago || payload.metodo, 180),
    paymentSupportDocumentRef: text(payload.paymentSupportDocumentRef || payload.soportePagoRef, 500),
    invoiceDocumentRef: text(payload.invoiceDocumentRef || payload.facturaRef, 500),
    currency: text(payload.currency || payload.moneda, 12).toUpperCase(),
    amount: money(payload.amount || payload.monto, 'Monto'),
    uniqueMatch: payload.uniqueMatch !== false,
    conflictingEvidence: payload.conflictingEvidence === true,
    partialPayment: payload.partialPayment === true,
    reversal: payload.reversal === true,
    allowPriorContiguousInference: payload.allowPriorContiguousInference === true,
    actualPaidDateEvidence: payload.actualPaidDateEvidence === true,
    explicitInstallmentException: payload.explicitInstallmentException === true || payload.installmentExceptionApproved === true,
    installmentExceptionReference: text(payload.installmentExceptionReference || payload.exceptionReference || payload.planExceptionReference, 500)
  };
  const reqId = operationRequestId(authz.tenantId, 'reconcile_evidence', evidencePayload, data.requestId);
  const reqRef = requestRef(authz.tenantId, reqId);
  const evtId = 'payinf_' + sha(authz.tenantId + '|' + policyId + '|' + reqId).slice(0, 28);
  const policyRef = tenantData(authz.tenantId, 'polizas').doc(policyId);
  const receiptQuery = tenantData(authz.tenantId, 'recibosEsperados').where('polizaId', '==', policyId);

  const transactionResult = await db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists && (previous.data() || {}).status === 'committed') return Object.assign({ reused: true }, (previous.data() || {}).result || {});
    const trustedProposal = proposalRequest ? await proposalApplicationContext(authz,proposalRequest.payload,ref=>tx.get(ref),true) : null;
    if (proposalRequest && (!trustedProposal.eligible || trustedProposal.planDigest!==proposalRequest.planDigest))
      return proposalBoundary.review(trustedProposal.reason||'PROPOSAL_PLAN_CHANGED');
    if (proposalRequest && digest(trustedProposal.evidencePayload)!==digest(payload))
      return proposalBoundary.review('PROPOSAL_PLAN_CHANGED');
    const [policySnap, receiptSnap] = await Promise.all([tx.get(policyRef), tx.get(receiptQuery)]);
    if (!policySnap.exists) throw new HttpsError('not-found', 'La póliza no existe.');
    const policy = Object.assign({ id: policySnap.id }, policySnap.data() || {});
    assertPaymentCountryScope(authz, policy);
    const receipts = receiptSnap.docs.map(doc => Object.assign({ id: doc.id }, doc.data() || {}));
    for (const receipt of receipts) assertPaymentCountryScope(authz, policy, receipt);
    const plan = trustedProposal ? trustedProposal.plan : planEvidence({ policy, receipts, evidence: evidencePayload, reconciliationConfig });
    if (!plan || plan.ok !== true) throw new HttpsError('failed-precondition', 'No fue posible evaluar la evidencia.');
    const anchorReceipt = receipts.find(row=>row.id===plan.anchorReceiptId);
    const insurerInvoiceTotal = plan.evidenceType==='INVOICE_INSTALLMENT_N'&&evidencePayload.amount!=null ?
      evidencePayload.amount : null;
    const invoiceTotalDiffers = insurerInvoiceTotal!=null&&anchorReceipt&&
      Math.round(insurerInvoiceTotal*100)!==Math.round(receiptAmount(anchorReceipt)*100);
    // A browser may submit evidence, but it cannot rewrite premium totals.
    // Only an exact, immutable, server-verified insurer invoice proposal can
    // supersede the old total on the receipt, portfolio and payment together.
    const authorizedInvoiceTotal = !!(trustedProposal&&proposalRequest&&
      trustedProposal.plan.evidenceType==='INVOICE_INSTALLMENT_N'&&
      Number.isFinite(trustedProposal.sourceAmount)&&trustedProposal.sourceAmount>0&&
      Math.round(trustedProposal.sourceAmount*100)===Math.round(insurerInvoiceTotal*100));
    if (invoiceTotalDiffers&&!authorizedInvoiceTotal)
      return {ok:true,operation:'reconcile_evidence',status:'REVIEW_REQUIRED',reviewRequired:true,
        reason:'INSURER_INVOICE_TOTAL_REQUIRES_VERIFIED_SOURCE_PROPOSAL',policyId,writes:0,
        serverOwned:true,failClosed:true};
    if (plan.autoCommit !== true || plan.status === 'REVIEW_REQUIRED') {
      return {
        ok: true,
        operation: 'reconcile_evidence',
        status: 'REVIEW_REQUIRED',
        reviewRequired: true,
        reason: text(plan.reason, 180),
        policyId,
        writes: 0,
        serverOwned: true,
        failClosed: true,
        scheduleCorrectionRequired: plan.scheduleCorrectionRequired === true,
        expectedReceiptCount: plan.expectedReceiptCount || null,
        actualReceiptCount: plan.actualReceiptCount || null,
        maxInstallments: plan.maxInstallments || null,
        exceptionalMaxInstallments: plan.exceptionalMaxInstallments || null
      };
    }
    if (!Array.isArray(plan.targets) || plan.targets.length === 0) {
      const noop = { ok: true, operation: 'reconcile_evidence', status: 'NOOP_ALREADY_SATISFIED', policyId, writes: 0, serverOwned: true, idempotent: true, confidence: plan.confidence || 'HIGH' };
      tx.set(reqRef, { status: 'committed', operation: 'reconcile_evidence', payloadDigest: digest(evidencePayload), result: noop, committedAt: now() }, { merge: true });
      return noop;
    }

    const states = [];
    for (const target of plan.targets) {
      const receiptId = id(target.receiptId, 'reciboId');
      const receipt = receipts.find(row => row.id === receiptId);
      if (!receipt) throw new HttpsError('failed-precondition', 'El recibo planificado ya no existe.');
      const cobroQuery = tenantData(authz.tenantId, 'cobros').where('reciboId', '==', receiptId);
      const portfolioQuery = tenantData(authz.tenantId, 'carteraPrimas').where('reciboId', '==', receiptId);
      const [cobroSnap, portfolioSnap] = await Promise.all([tx.get(cobroQuery), tx.get(portfolioQuery)]);
      if (cobroSnap.size > 1) throw new HttpsError('failed-precondition', 'Más de un cobro corresponde al mismo recibo.');
      const activePortfolioRows = portfolioSnap.docs.filter(doc => activePortfolio(doc.data() || {}));
      if (activePortfolioRows.length > 1) throw new HttpsError('failed-precondition', 'Más de una obligación activa corresponde al mismo recibo.');
      if (proposalRequest && activePortfolioRows.length!==1)
        throw new HttpsError('failed-precondition','PROPOSAL_ACTIVE_PORTFOLIO_REQUIRED');
      for(const doc of cobroSnap.docs)assertReconciliationFinancialTarget(authz,policy,receipt,doc.data(),'COBRO');
      for(const doc of activePortfolioRows)assertReconciliationFinancialTarget(authz,policy,receipt,doc.data(),'PORTFOLIO');
      if(trustedProposal&&trustedProposal.syntheticQaRun&&[...cobroSnap.docs,...activePortfolioRows].some(doc=>
          doc.data().__syntheticQa!==true||doc.data().qaRunId!==trustedProposal.syntheticQaRun))
        throw new HttpsError('permission-denied','PROPOSAL_QA_FINANCIAL_TARGET_NOT_SYNTHETIC');
      states.push({ target, receipt, cobroDoc: cobroSnap.empty ? null : cobroSnap.docs[0], activePortfolioRows });
    }

    const technicalNow = now(), results = [], beforeAfter = [];
    // FieldValue.serverTimestamp() is a write transform, not a serializable
    // field value inside a Firestore array. The operational documents retain
    // the server-owned transform; the audit snapshot explicitly records its
    // commit-time semantics without nesting a sentinel in beforeAfter[].
    const auditAfter = value => Object.fromEntries(Object.entries(value).map(([field, fieldValue]) =>
      [field, fieldValue === technicalNow ? 'SERVER_TIMESTAMP_ON_COMMIT' : fieldValue]));
    const qaMark=trustedProposal&&trustedProposal.syntheticQaRun?{__syntheticQa:true,qaRunId:trustedProposal.syntheticQaRun}:{};
    const origin = evidenceOrigin(plan.evidenceType), source = evidenceSourceType(plan.evidenceType);
    for (const state of states) {
      const target = state.target, receipt = state.receipt, receiptId = receipt.id;
      const cobroDoc = state.cobroDoc, beforeCobro = cobroDoc ? (cobroDoc.data() || {}) : {};
      const cobroId = cobroDoc ? cobroDoc.id : deterministicCobroId(authz.tenantId, receiptId);
      const cobroRef = tenantData(authz.tenantId, 'cobros').doc(cobroId);
      const isInferred = target.mode === 'INFERRED';
      const priorInference = beforeCobro.inferenceProvenance || (text(beforeCobro.paymentState, 80) === 'PAID_INFERRED' || text(beforeCobro.directOrInferred, 80) === 'INFERRED' ? {
        evidenceType: text(beforeCobro.evidenceType || beforeCobro.paymentEvidenceType, 120),
        evidenceId: text(beforeCobro.evidenceId || beforeCobro.sourceRef, 500),
        anchorInstallment: Number(beforeCobro.anchorInstallment || 0) || null,
        inferenceRuleId: text(beforeCobro.inferenceRuleId, 160),
        inferredEffectiveDate: text(beforeCobro.inferredEffectiveDate, 32),
        evidenceAsOfDate: text(beforeCobro.evidenceAsOfDate, 32),
        confidence: text(beforeCobro.confidence, 40) || 'HIGH'
      } : null);
      const recordedPaid = /^PAID_(DIRECT|REPORTED)$/.test(text(beforeCobro.paymentState,80)) ||
        norm(beforeCobro.estado) === 'pagado' && text(beforeCobro.paymentState,80) !== 'PAID_INFERRED' && text(beforeCobro.directOrInferred,80) !== 'INFERRED';
      if (recordedPaid) assertPaymentIdentity(authz,policy,receipt,beforeCobro,'COBRO');
      const existingDirect = ['PAID_DIRECT','PAID_REPORTED'].includes(text(beforeCobro.paymentState, 80));
      const paymentState = recordedPaid && text(beforeCobro.paymentState,80) ? text(beforeCobro.paymentState,80) : target.paymentState;
      const applicationState = recordedPaid && /^APPLIED_/.test(text(beforeCobro.applicationState,80)) ? text(beforeCobro.applicationState,80) : target.applicationState;
      const directOrInferred = recordedPaid && text(beforeCobro.directOrInferred,80) ? text(beforeCobro.directOrInferred,80) : (isInferred && !existingDirect ? 'INFERRED' : 'DIRECT');
      // A commission figure is not the premium settled. The canonical receipt
      // provides the payment amount for commission-based inference.
      const evidenceAmount = (!isInferred && plan.evidenceType!=='COMMISSION_STATEMENT_INSTALLMENT_N' && evidencePayload.amount != null) ? evidencePayload.amount : receiptAmount(receipt);
      if (recordedPaid && Math.round(evidenceAmount*100)!==Math.round(receiptAmount(beforeCobro)*100))
        throw new HttpsError('failed-precondition','EXISTING_PAYMENT_REQUIRES_APPLICATION_ENRICHMENT');
      const amount = recordedPaid ? receiptAmount(beforeCobro) : evidenceAmount;
      if (amount == null || amount <= 0) throw new HttpsError('failed-precondition', 'El recibo no tiene monto válido.');
      const correctSourceTotal = !isInferred&&authorizedInvoiceTotal&&
        Math.round(amount*100)!==Math.round(receiptAmount(receipt)*100);
      const sourceTotalPatch = correctSourceTotal ? {
        monto:amount,montoTotal:amount,primaTotal:amount,
        insurerTotalEvidenceRef:plan.sourceRef,
        insurerTotalEvidenceType:'INVOICE_INSTALLMENT_N',
        insurerTotalBefore:receiptAmount(receipt)
      } : {};
      const originalPaidDate = text(beforeCobro.paidDate || beforeCobro.fechaPago,32);
      const paidDate = recordedPaid && originalPaidDate ? originalPaidDate : (!isInferred && evidencePayload.paidDate && (plan.evidenceType === 'BANK_STATEMENT_MATCH' || evidencePayload.actualPaidDateEvidence === true) ? evidencePayload.paidDate : originalPaidDate);
      const applicationDate = !isInferred ? (evidencePayload.applicationDate || text(beforeCobro.applicationDate, 32)) : text(beforeCobro.applicationDate, 32);
      const inferenceProvenance = isInferred ? {
        evidenceType: plan.evidenceType,
        evidenceId: plan.evidenceId,
        sourceRef: plan.sourceRef,
        anchorInstallment: plan.anchorInstallment,
        inferenceRuleId: plan.inferenceRuleId,
        inferredEffectiveDate: target.inferredEffectiveDate,
        evidenceAsOfDate: plan.evidenceAsOfDate || '',
        confidence: plan.confidence
      } : priorInference;
      const shared = {
        ...qaMark,
        paymentState,
        applicationState,
        directOrInferred,
        paymentEvidenceType: plan.evidenceType,
        paymentOrigin: origin,
        applicationEvidenceType: applicationState === 'PENDING_APPLICATION' ? text(beforeCobro.applicationEvidenceType, 120) : plan.evidenceType,
        evidenceType: plan.evidenceType,
        evidenceId: plan.evidenceId,
        sourceRef: plan.sourceRef,
        anchorInstallment: plan.anchorInstallment,
        inferenceRuleId: plan.inferenceRuleId,
        matchedPolicyId: policyId,
        matchedReceiptId: receiptId,
        confidence: plan.confidence,
        evidenceAsOfDate: plan.evidenceAsOfDate || text(beforeCobro.evidenceAsOfDate, 32),
        inferredEffectiveDate: isInferred ? target.inferredEffectiveDate : text(beforeCobro.inferredEffectiveDate, 32),
        installmentPlanException: plan.installmentException || beforeCobro.installmentPlanException || null,
        reconciledAt: technicalNow,
        reconciledBy: authz.actor.uid,
        updatedAt: technicalNow,
        updatedByUid: authz.actor.uid
      };
      if (inferenceProvenance) shared.inferenceProvenance = inferenceProvenance;
      if (paidDate) shared.paidDate = paidDate;
      if (applicationDate) shared.applicationDate = applicationDate;
      if (!isInferred && evidencePayload.invoiceDate) shared.invoiceDate = evidencePayload.invoiceDate;
      if (!isInferred && evidencePayload.invoiceNumber) shared.invoiceNumber = evidencePayload.invoiceNumber;
      if (!isInferred && evidencePayload.paymentSupportDocumentRef) shared.paymentSupportDocumentRef = evidencePayload.paymentSupportDocumentRef;
      if (!isInferred && evidencePayload.invoiceDocumentRef) shared.invoiceDocumentRef = evidencePayload.invoiceDocumentRef;
      if (!isInferred && evidencePayload.paymentMethod) shared.paymentMethod = evidencePayload.paymentMethod;
      if (recordedPaid) {
        preserveRecordedPayment(shared,beforeCobro);
        shared.reconciliationEvidence = {evidenceType:plan.evidenceType,evidenceId:plan.evidenceId,sourceRef:plan.sourceRef,
          evidenceAsOfDate:plan.evidenceAsOfDate||'',documentedAmount:evidenceAmount,
          reportedPaymentMethod:evidencePayload.paymentMethod||'',reportedPaymentSupportDocumentRef:evidencePayload.paymentSupportDocumentRef||''};
      }

      const cobro = Object.assign({}, beforeCobro, {
        id: cobroId,
        tenantId: authz.tenantId,
        clienteId: text(receipt.clienteId || policy.clienteId, 180),
        polizaId: policyId,
        reciboId: receiptId,
        asesorId: text(receipt.asesorId || policy.asesorId, 180),
        pais: text(receipt.pais || policy.pais, 12).toUpperCase(),
        moneda: text(receipt.moneda || policy.moneda, 12).toUpperCase(),
        cuota: text(receipt.cuota || receipt.secuencia || receipt.numeroReciboFuente, 120),
        vence: dueDate(receipt),
        monto: amount,
        estado: 'Pagado',
        conciliado: /^APPLIED_/.test(applicationState),
        ...(correctSourceTotal?{montoTotal:amount,primaTotal:amount}:{}),
        ...shared
      });
      if (paidDate) cobro.fechaPago = paidDate;
      if (!isInferred && evidencePayload.invoiceNumber) cobro.numeroFactura = evidencePayload.invoiceNumber;
      tx.set(cobroRef, cobro, { merge: true });

      const receiptPatch = Object.assign({
        estado: 'Pagado',
        estadoOperativo: isInferred ? 'pago_inferido' : 'pagado',
        cobroId,
        paymentOrigin: origin,
        conciliadoPago: true,
        conciliado: /^APPLIED_/.test(applicationState)
      }, shared,sourceTotalPatch);
      if (paidDate) receiptPatch.fechaPago = paidDate;
      if (!isInferred && evidencePayload.invoiceNumber) receiptPatch.numeroFactura = evidencePayload.invoiceNumber;
      if (recordedPaid) preserveRecordedPayment(receiptPatch,receipt);
      tx.set(tenantData(authz.tenantId, 'recibosEsperados').doc(receiptId), receiptPatch, { merge: true });
      if (proposalRequest) beforeAfter.push(
        {collection:'recibosEsperados',id:receiptId,before:receipt,after:auditAfter(Object.assign({},receipt,receiptPatch))},
        {collection:'cobros',id:cobroId,before:cobroDoc?beforeCobro:null,after:auditAfter(cobro)});

      if (state.activePortfolioRows.length === 1) {
        const portfolioPatch = {
          estado: 'Pagado',
          estadoCartera: 'Pagado',
          carteraActiva: false,
          conciliadoPago: true,
          cobroId,
          reciboId: receiptId,
          paymentState,
          applicationState,
          directOrInferred,
          evidenceType: plan.evidenceType,
          evidenceId: plan.evidenceId,
          inferenceRuleId: plan.inferenceRuleId,
          anchorInstallment: plan.anchorInstallment,
          evidenceAsOfDate: plan.evidenceAsOfDate || '',
          updatedAt: technicalNow,
          updatedByUid: authz.actor.uid
        };
        if(correctSourceTotal)Object.assign(portfolioPatch,sourceTotalPatch);
        if (isInferred) portfolioPatch.inferredEffectiveDate = target.inferredEffectiveDate;
        if (paidDate) portfolioPatch.fechaPago = paidDate;
        if (applicationDate) portfolioPatch.applicationDate = applicationDate;
        tx.set(state.activePortfolioRows[0].ref, portfolioPatch, { merge: true });
        if (proposalRequest) beforeAfter.push({collection:'carteraPrimas',id:state.activePortfolioRows[0].id,
          before:state.activePortfolioRows[0].data(),after:auditAfter(Object.assign({},state.activePortfolioRows[0].data(),portfolioPatch))});
      }
      results.push({ receiptId, cobroId, installment: target.installment, directOrInferred, paymentState, applicationState,
        amount,currency:text(receipt.moneda||policy.moneda,12).toUpperCase(),
        portfolioId:state.activePortfolioRows.length?state.activePortfolioRows[0].id:'' });
    }

    const committed = {
      ok: true,
      operation: 'reconcile_evidence',
      status: 'AUTO_COMMITTED_HIGH_CONFIDENCE',
      policyId,
      evidenceType: plan.evidenceType,
      evidenceId: plan.evidenceId,
      anchorInstallment: plan.anchorInstallment,
      inferenceRuleId: plan.inferenceRuleId,
      confidence: plan.confidence,
      installmentException: plan.installmentException || null,
      results,
      writes: results.length,
      serverOwned: true,
      idempotent: true,
      humanApprovalRequired: false
    };
    if (proposalRequest) {
      committed.applicationId=proposalRequest.applicationId;
      committed.proposalId=trustedProposal.proposalId;
      committed.sourceRunId=trustedProposal.sourceRunId;
      committed.operation='apply_proposal_application';
      committed.status='APPLIED_WITH_MANUAL_APPROVAL';
      committed.approvalMode='MANUAL_AUTHORIZED';
      tx.set(trustedProposal.applicationRef,{id:proposalRequest.applicationId,status:'APPLIED',tenantId:authz.tenantId,
        pais:assertPaymentCountryScope(authz,policy),proposalId:trustedProposal.proposalId,sourceRunId:trustedProposal.sourceRunId,
        scopeAnchor:{tenantId:authz.tenantId,pais:text(policy.pais),asesorId:text(policy.asesorId||policy.advisorId),polizaId:policyId,
          aseguradoraId:text(policy.aseguradoraId||policy.insurerId,180),vigenciaInicio:sourceIntake.canonicalPolicyDate(policy,'start'),
          vigenciaFin:sourceIntake.canonicalPolicyDate(policy,'end')},
        sourceProposalDigest:trustedProposal.sourceProposalDigest,sourceEvidenceDigest:trustedProposal.sourceEvidenceDigest,
        planDigest:trustedProposal.planDigest,resolutionId:trustedProposal.resolutionId||null,sourceAmount:trustedProposal.sourceAmount,actor:authz.actor,
        beforeAfter,result:committed,createdAt:technicalNow,...qaMark},{merge:false});
    }
    tx.set(eventRef(authz.tenantId, evtId), {
      schemaVersion: VERSION,
      contractVersion: CONTRACT_VERSION,
      tenantId: authz.tenantId,
      eventId: evtId,
      operation: 'reconcile_evidence',
      requestId: reqId,
      actor: authz.actor,
      policyId,
      evidenceType: plan.evidenceType,
      evidenceId: plan.evidenceId,
      confidence: plan.confidence,
      payloadDigest: digest(evidencePayload),
      resultDigest: digest(committed),
      createdAt: technicalNow,
      ...qaMark
    }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation: 'reconcile_evidence', eventId: evtId, payloadDigest: digest(evidencePayload), result: committed, committedAt: technicalNow,...qaMark }, { merge: true });
    return committed;
  });
  return proposalRequest && transactionResult.applicationId ? verifyProposalReadback(authz,transactionResult) : transactionResult;
}

function unsupportedMutation(operation) {
  if (operation === 'confirm_application') {
    throw new HttpsError('failed-precondition', 'COBROS_10102_PROPOSAL_IS_NOT_PAYMENT: una propuesta/HOLD no puede convertirse en Cobro ni modificar recibos.');
  }
  if (operation === 'register_evidence') {
    throw new HttpsError('failed-precondition', 'COBROS_10102_ACTIVE_LEDGER_IMMUTABLE: nueva evidencia requiere un nuevo run autorizado; no se modifica el ledger activo.');
  }
}

function previewSyntheticId(value) {
  return /^(?:b3004qa_|b3004human_|b3005qa_|b3005human_)/i.test(text(value, 180));
}
async function executePreview(request) {
  const data = request.data || {}, payload = data.payload || {};
  const targetId = text(payload.receiptId || payload.reciboId || payload.polizaId || payload.policyId || payload.proposalId, 180);
  const op=norm(data.operation).replace(/ /g, '_');
  if(op==='intake_source_run')return execute(request,true);
  // Preview may inspect a real proposal without mutation; the signed command
  // still enforces membership, module visibility, country and data scope.
  if(op==='preview_proposal_application')return execute(request,true);
  if(['resolve_proposal_application','apply_proposal_application'].includes(op)&&syntheticProposalRun(data.tenantId,payload))
    return execute(request,true);
  if (!['preview_policy','apply_payment','reconcile_payment'].includes(op) || !previewSyntheticId(targetId))
    throw new HttpsError('permission-denied', 'Preview de Cobros solo admite pagos y lectura de fixtures sintéticas autorizadas.');
  if (text(data.tenantId,180)!=='alianzas-soluciones')
    throw new HttpsError('permission-denied','PREVIEW_PAYMENT_TENANT_DENIED');
  if (op==='preview_policy') {
    const policySnap=await tenantData(data.tenantId,'polizas').doc(targetId).get();
    if (!policySnap.exists || policySnap.data().__syntheticQa !== true)
      throw new HttpsError('permission-denied','PREVIEW_PAYMENT_SYNTHETIC_POLICY_REQUIRED');
  }
  return execute(request, true);
}

async function execute(request, previewOnly = false) {
  const data = request.data || {};
  const operation = norm(data.operation).replace(/ /g, '_');
  if (!OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación no soportada.');
  if (/^propapp_/.test(text(data.requestId,180)) && operation!=='apply_proposal_application')
    throw new HttpsError('invalid-argument','PROPOSAL_REQUEST_ID_RESERVED');
  const authz = await authorize(request, operation);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};

  if (operation === 'intake_source_run') return intakeSourceRun(authz,data,payload,previewOnly===true);
  if (operation === 'preview_policy') return previewPolicy(authz, payload);
  if (operation === 'preview_proposal_application') return proposalApplication(authz,data,payload,false,previewOnly);
  if (operation === 'resolve_proposal_application') return resolveProposalApplication(authz,data,payload,previewOnly);
  if (operation === 'apply_proposal_application') return proposalApplication(authz,data,payload,true,previewOnly);
  if (operation === 'report_advisor_payment') return reportAdvisorPayment(authz, data, payload);
  if (operation === 'apply_payment') return applyPayment(authz, data, payload, 'apply_payment', previewOnly);
  if (operation === 'reconcile_payment') {
    const origin = text(payload.paymentOriginSource || payload.sourceType || 'insurer_invoice', 120);
    return applyPayment(authz, data, Object.assign({}, payload, {
      sourceType: origin,
      forceReconciliation: true,
      applicationEvidenceType: payload.applicationEvidenceType || 'MANUAL_RECONCILIATION'
    }), 'reconcile_payment', previewOnly);
  }
  if (operation === 'reconcile_evidence') return reconcileEvidence(authz, data, payload, previewOnly === true);
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

// onCall invokes handlers with (request, optional CallableResponse). Passing
// execute directly would bind that second argument to our internal previewOnly
// flag, erroneously applying synthetic Preview guards to real LIVE payments.
// Bind the execution mode explicitly; never derive it from Firebase callbacks.
exports.orbit360CobrosReconciliationCommand = onCall({ region: REGION, cors: true }, request => execute(request, false));
exports.orbit360CobrosReconciliationCommandPreview = onCall({ region: REGION, cors: true }, request => executePreview(request));
exports.orbit360CobrosReconciliationCommandLabV20260804 = onCall({ region: REGION, cors: true }, request => execute(request, false));
exports.__cobrosReconciliationDomain = Object.freeze({ VERSION, CONTRACT_VERSION, OPERATIONS });
