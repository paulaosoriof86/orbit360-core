'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-recurring-insurance-import-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const SOURCE_TYPES = new Set([
  'receipt_schedule',
  'reported_payments',
  'insurer_payment_report',
  'portfolio_statement',
  'commission_statement',
  'bank_statement',
  'supporting_document'
]);
const OPERATIONS = new Set([
  'create_batch',
  'stage_rows',
  'preview_batch',
  'confirm_batch',
  'rollback_batch',
  'get_batch'
]);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin', 'operativo', 'finanzas']);
const PERMISSIONS = new Set(['imports_manage', 'cobros_manage', 'conciliaciones_manage']);
const REQUIRED_EVIDENCE_FIELDS = Object.freeze(['policyId', 'country', 'currency', 'period']);

const text = (value, max = 1000) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const digest = value => sha(JSON.stringify(stable(value)));
const now = () => FieldValue.serverTimestamp();
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));
const cleanId = (value, label) => {
  const out = text(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
};
const cleanCountry = value => text(value, 8).toUpperCase();
const cleanCurrency = value => text(value, 8).toUpperCase();
const amount = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const raw = text(value, 80).replace(/[^0-9,.-]/g, '');
  const parsed = Number(raw.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};
const isoDate = value => {
  const raw = text(value, 40);
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  return raw.slice(0, 10);
};

function membershipRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function batchRef(tenantId, batchId) {
  return db.collection('tenants').doc(tenantId).collection('importBatches').doc(batchId);
}
function rowsRef(tenantId, batchId) {
  return batchRef(tenantId, batchId).collection('rows');
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('importRequests').doc(requestId);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('importEvents').doc(eventId);
}
function evidenceRef(tenantId, evidenceId) {
  return db.collection('tenants').doc(tenantId).collection('data').doc('evidenciasCobro').collection('items').doc(evidenceId);
}
function profileRef(tenantId, profileId) {
  return db.collection('tenants').doc(tenantId).collection('config').doc('importProfiles').collection('items').doc(profileId);
}

function roles(member) {
  return unique([...(member.roles || []), member.activeRole, member.rolActivo, member.rol]).map(norm);
}
function permissions(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function active(member) {
  const state = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado', 'suspended', 'suspendido'].includes(state);
}
function canManage(member) {
  return roles(member).some(role => ADMIN_ROLES.has(role)) || permissions(member).some(permission => PERMISSIONS.has(permission));
}
async function authorize(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = cleanId(request.data && request.data.tenantId, 'tenantId');
  const memberSnap = await membershipRef(tenantId, request.auth.uid).get();
  const member = memberSnap.exists ? memberSnap.data() : null;
  if (!active(member)) throw new HttpsError('permission-denied', 'La membresía no está activa.');
  if (!canManage(member)) throw new HttpsError('permission-denied', 'No tiene permiso para administrar importaciones.');
  return {
    tenantId,
    member,
    actor: {
      uid: text(request.auth.uid, 180),
      advisorId: text(member.advisorId || member.asesorId, 180),
      activeRole: text(member.activeRole || member.rolActivo || member.rol, 100)
    }
  };
}
function requiredReason(data) {
  const reason = text(data.reason || data.motivo, 1000);
  if (!reason) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  return reason;
}
function requestIdentity(tenantId, operation, payload, supplied) {
  const explicit = text(supplied, 180);
  return explicit ? cleanId(explicit, 'requestId') : `imp_${sha(JSON.stringify(stable({ tenantId, operation, payload }))).slice(0, 28)}`;
}
function sourceType(value) {
  const type = norm(value).replace(/ /g, '_');
  if (!SOURCE_TYPES.has(type)) throw new HttpsError('invalid-argument', 'Tipo de fuente no soportado.');
  return type;
}
function normalizeHeader(value) {
  return norm(value).replace(/ /g, '_');
}
function normalizeMapping(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return {};
  const out = {};
  Object.entries(mapping).forEach(([source, target]) => {
    const key = normalizeHeader(source);
    const field = text(target, 100);
    if (key && field) out[key] = field;
  });
  return out;
}
function normalizeRow(input, batch, rowNumber) {
  const source = input && typeof input === 'object' ? input : {};
  const mapped = {};
  const mapping = batch.mapping || {};
  Object.entries(source).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    const target = mapping[normalizedKey] || key;
    mapped[target] = value;
  });
  const row = {
    batchId: batch.id,
    rowNumber,
    sourceType: batch.sourceType,
    profileId: batch.profileId,
    sourceFileHash: batch.sourceFileHash,
    sourceFileName: batch.sourceFileName,
    sourceSheet: text(mapped.sourceSheet || mapped.sheet || mapped.hoja || batch.sourceSheet, 160),
    sourceBlock: text(mapped.sourceBlock || mapped.block || mapped.bloque, 160),
    sourceRow: text(mapped.sourceRow || mapped.row || mapped.fila || rowNumber, 80),
    policyId: text(mapped.policyId || mapped.polizaId, 180),
    policyNumber: text(mapped.policyNumber || mapped.numeroPoliza || mapped.poliza, 180),
    receiptId: text(mapped.receiptId || mapped.reciboId, 180),
    clientId: text(mapped.clientId || mapped.clienteId, 180),
    insurerId: text(mapped.insurerId || mapped.aseguradoraId, 180),
    country: cleanCountry(mapped.country || mapped.pais || batch.country),
    currency: cleanCurrency(mapped.currency || mapped.moneda || batch.currency),
    period: text(mapped.period || mapped.periodo || batch.period, 20),
    termStart: isoDate(mapped.termStart || mapped.vigenciaInicio),
    termEnd: isoDate(mapped.termEnd || mapped.vigenciaFin),
    installment: Number(mapped.installment || mapped.cuota || mapped.numeroCuota || 0),
    paymentDate: isoDate(mapped.paymentDate || mapped.fechaPago || mapped.fecha),
    dueDate: isoDate(mapped.dueDate || mapped.fechaLimite || mapped.vence),
    amount: amount(mapped.amount || mapped.monto || mapped.primaTotal || mapped.primaNeta),
    commission: amount(mapped.commission || mapped.comision || mapped.comisionAS || mapped.comisionNeta),
    status: text(mapped.status || mapped.estado, 120),
    completeness: text(mapped.completeness || mapped.completitud || mapped.rolFuente, 120),
    sourceReference: text(mapped.sourceReference || mapped.requerimiento || mapped.factura || mapped.numeroReciboFuente, 240),
    rawDigest: digest(source)
  };
  const missing = REQUIRED_EVIDENCE_FIELDS.filter(field => !text(row[field], 180));
  const contradictions = [];
  if (!row.policyId && !row.policyNumber) contradictions.push('policy_identity_missing');
  if (!row.country) contradictions.push('country_missing');
  if (!row.currency) contradictions.push('currency_missing');
  if (!row.period) contradictions.push('period_missing');
  if (row.amount < 0 || row.commission < 0 || /revers|anulad|cancelad|rechaz|duplicad|conflict/.test(norm(row.status))) contradictions.push('negative_or_reversal');
  if (row.sourceType === 'commission_statement' && row.commission === 0) contradictions.push('commission_zero');
  if (row.sourceType === 'bank_statement' && !row.policyId && !row.receiptId && !row.sourceReference) contradictions.push('bank_without_counterpart');
  const qualityScore = Math.max(0, 100 - (missing.length * 15) - (contradictions.length * 25));
  row.quality = {
    score: qualityScore,
    missing,
    contradictions,
    decision: contradictions.length || missing.length ? 'REQUIRES_VALIDATION' : 'READY'
  };
  row.evidenceKind = {
    receipt_schedule: 'RECEIPT_SCHEDULE',
    reported_payments: 'PLATFORM_PAYMENT_REPORT',
    insurer_payment_report: 'INSURER_PAYMENT',
    portfolio_statement: 'PORTFOLIO_SNAPSHOT',
    commission_statement: 'COMMISSION_RECOGNITION',
    bank_statement: 'BANK_SUPPORT',
    supporting_document: 'OTHER'
  }[row.sourceType];
  row.id = `row_${sha(`${batch.id}|${rowNumber}|${row.rawDigest}`).slice(0, 24)}`;
  return row;
}
function batchPreview(rows) {
  const counts = { total: rows.length, ready: 0, requiresValidation: 0, omitted: 0 };
  const byEvidenceKind = {};
  const duplicateDigests = new Set();
  const seen = new Set();
  rows.forEach(row => {
    if (seen.has(row.rawDigest)) duplicateDigests.add(row.rawDigest);
    seen.add(row.rawDigest);
  });
  rows.forEach(row => {
    if (duplicateDigests.has(row.rawDigest)) {
      row.quality = Object.assign({}, row.quality, { decision: 'OMIT_DUPLICATE', contradictions: unique([...(row.quality.contradictions || []), 'duplicate_in_batch']) });
      counts.omitted += 1;
    } else if (row.quality.decision === 'READY') counts.ready += 1;
    else counts.requiresValidation += 1;
    byEvidenceKind[row.evidenceKind] = (byEvidenceKind[row.evidenceKind] || 0) + 1;
  });
  return { counts, byEvidenceKind, duplicateDigestCount: duplicateDigests.size };
}
function evidenceFromRow(row, tenantId, actor, batch) {
  const evidenceId = `ev_${sha(`${tenantId}|${batch.id}|${row.id}`).slice(0, 26)}`;
  return {
    id: evidenceId,
    tenantId,
    importBatchId: batch.id,
    importRowId: row.id,
    polizaId: row.policyId,
    numeroPoliza: row.policyNumber,
    reciboId: row.receiptId,
    clienteId: row.clientId,
    aseguradoraId: row.insurerId,
    tipoFuente: row.evidenceKind,
    archivoHash: row.sourceFileHash,
    archivoNombre: row.sourceFileName,
    hoja: row.sourceSheet,
    bloque: row.sourceBlock,
    fila: row.sourceRow,
    periodo: row.period,
    pais: row.country,
    moneda: row.currency,
    vigenciaInicio: row.termStart,
    vigenciaFin: row.termEnd,
    cuota: row.installment,
    fechaPago: row.paymentDate,
    fechaLimite: row.dueDate,
    monto: row.amount,
    comisionAS: row.commission,
    estado: row.status,
    completitud: row.completeness,
    referenciaFuente: row.sourceReference,
    calidad: row.quality,
    schemaVersion: VERSION,
    createdByUid: actor.uid,
    createdAt: now()
  };
}

async function loadRows(tenantId, batchId, limit = 5000) {
  const snap = await rowsRef(tenantId, batchId).orderBy('rowNumber').limit(limit).get();
  return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
}
async function execute(request) {
  const data = request.data || {};
  const operation = norm(data.operation).replace(/ /g, '_');
  if (!OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación no soportada.');
  const authz = await authorize(request);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};

  if (operation === 'get_batch' || operation === 'preview_batch') {
    const batchId = cleanId(payload.batchId || data.batchId, 'batchId');
    const batchSnap = await batchRef(authz.tenantId, batchId).get();
    if (!batchSnap.exists) throw new HttpsError('not-found', 'El lote no existe.');
    const rows = await loadRows(authz.tenantId, batchId);
    const preview = batchPreview(rows);
    return { ok: true, batch: Object.assign({ id: batchSnap.id }, batchSnap.data()), preview, rows: operation === 'preview_batch' ? rows : undefined };
  }

  const motive = requiredReason(data);
  const reqId = requestIdentity(authz.tenantId, operation, payload, data.requestId);
  const eventId = `impevt_${sha(`${authz.tenantId}|${reqId}`).slice(0, 28)}`;
  const req = requestRef(authz.tenantId, reqId);

  if (operation === 'create_batch') {
    const type = sourceType(payload.sourceType);
    const sourceFileHash = text(payload.sourceFileHash || payload.fileHash, 128);
    if (!/^[a-f0-9]{32,128}$/i.test(sourceFileHash)) throw new HttpsError('invalid-argument', 'Se requiere hash de fuente válido.');
    const profileId = text(payload.profileId || `${type}-default`, 180);
    let profile = {};
    const profileSnap = await profileRef(authz.tenantId, profileId).get();
    if (profileSnap.exists) profile = profileSnap.data();
    const batchId = cleanId(payload.batchId || `batch_${sha(`${authz.tenantId}|${type}|${sourceFileHash}|${payload.period || ''}`).slice(0, 26)}`, 'batchId');
    const batch = {
      id: batchId,
      tenantId: authz.tenantId,
      sourceType: type,
      sourceFileHash,
      sourceFileName: text(payload.sourceFileName || payload.fileName, 240),
      sourceSheet: text(payload.sourceSheet || payload.sheet, 160),
      country: cleanCountry(payload.country || payload.pais),
      currency: cleanCurrency(payload.currency || payload.moneda),
      period: text(payload.period || payload.periodo, 20),
      profileId,
      mapping: Object.assign({}, normalizeMapping(profile.mapping), normalizeMapping(payload.mapping)),
      status: 'DRAFT',
      rowCount: 0,
      confirmedEvidenceCount: 0,
      schemaVersion: VERSION,
      createdAt: now(),
      createdByUid: authz.actor.uid,
      updatedAt: now()
    };
    return db.runTransaction(async tx => {
      const priorReq = await tx.get(req);
      if (priorReq.exists && priorReq.data().status === 'committed') return Object.assign({}, priorReq.data().result || {}, { reused: true });
      const existing = await tx.get(batchRef(authz.tenantId, batchId));
      if (existing.exists) {
        const result = { ok: true, batchId, reused: true, status: existing.data().status };
        tx.set(req, { status: 'committed', result, committedAt: now() }, { merge: true });
        return result;
      }
      tx.create(batchRef(authz.tenantId, batchId), batch);
      tx.create(eventRef(authz.tenantId, eventId), { schemaVersion: VERSION, tenantId: authz.tenantId, operation, batchId, actor: authz.actor, motive, createdAt: now() });
      const result = { ok: true, batchId, reused: false, status: 'DRAFT' };
      tx.set(req, { status: 'committed', result, committedAt: now() }, { merge: true });
      return result;
    });
  }

  const batchId = cleanId(payload.batchId || data.batchId, 'batchId');
  const batchSnap = await batchRef(authz.tenantId, batchId).get();
  if (!batchSnap.exists) throw new HttpsError('not-found', 'El lote no existe.');
  const batch = Object.assign({ id: batchSnap.id }, batchSnap.data());

  if (operation === 'stage_rows') {
    if (!['DRAFT', 'STAGED', 'VALIDATION_REQUIRED'].includes(batch.status)) throw new HttpsError('failed-precondition', 'El lote ya no admite filas.');
    const inputRows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!inputRows.length || inputRows.length > 1000) throw new HttpsError('invalid-argument', 'Se requieren entre 1 y 1000 filas por llamada.');
    const offset = Number(payload.offset || batch.rowCount || 0);
    const normalized = inputRows.map((row, index) => normalizeRow(row, batch, offset + index + 1));
    const preview = batchPreview(normalized);
    const writer = db.bulkWriter();
    normalized.forEach(row => writer.set(rowsRef(authz.tenantId, batchId).doc(row.id), Object.assign({}, row, { stagedAt: now(), stagedByUid: authz.actor.uid }), { merge: false }));
    await writer.close();
    await batchRef(authz.tenantId, batchId).set({
      status: preview.counts.requiresValidation ? 'VALIDATION_REQUIRED' : 'STAGED',
      rowCount: offset + normalized.length,
      updatedAt: now(),
      updatedByUid: authz.actor.uid
    }, { merge: true });
    return { ok: true, batchId, staged: normalized.length, preview };
  }

  const rows = await loadRows(authz.tenantId, batchId);
  const preview = batchPreview(rows);

  if (operation === 'confirm_batch') {
    if (!rows.length) throw new HttpsError('failed-precondition', 'El lote no contiene filas.');
    if (preview.counts.requiresValidation > 0 && payload.confirmValidationOverride !== true) {
      throw new HttpsError('failed-precondition', 'El lote contiene filas que requieren validación.');
    }
    const readyRows = rows.filter(row => row.quality && row.quality.decision === 'READY');
    const writer = db.bulkWriter();
    readyRows.forEach(row => {
      const evidence = evidenceFromRow(row, authz.tenantId, authz.actor, batch);
      writer.set(evidenceRef(authz.tenantId, evidence.id), evidence, { merge: false });
    });
    await writer.close();
    await batchRef(authz.tenantId, batchId).set({
      status: 'CONFIRMED',
      confirmedEvidenceCount: readyRows.length,
      confirmedAt: now(),
      confirmedByUid: authz.actor.uid,
      confirmationReason: motive,
      previewDigest: digest(preview),
      updatedAt: now()
    }, { merge: true });
    await eventRef(authz.tenantId, eventId).set({ schemaVersion: VERSION, tenantId: authz.tenantId, operation, batchId, actor: authz.actor, motive, counts: preview.counts, createdAt: now() });
    return { ok: true, batchId, status: 'CONFIRMED', evidenceCreated: readyRows.length, preview };
  }

  if (operation === 'rollback_batch') {
    if (batch.status !== 'CONFIRMED') throw new HttpsError('failed-precondition', 'Solo se puede revertir un lote confirmado.');
    const evidenceSnap = await db.collection('tenants').doc(authz.tenantId).collection('data').doc('evidenciasCobro').collection('items')
      .where('importBatchId', '==', batchId).get();
    const consumed = evidenceSnap.docs.filter(doc => {
      const value = doc.data();
      return value.appliedCobroId || value.proposalConfirmed === true || value.consumedAt;
    });
    if (consumed.length) throw new HttpsError('failed-precondition', 'El lote tiene evidencia ya aplicada; requiere rollback de dominio.');
    const writer = db.bulkWriter();
    evidenceSnap.docs.forEach(doc => writer.delete(doc.ref));
    await writer.close();
    await batchRef(authz.tenantId, batchId).set({ status: 'ROLLED_BACK', rolledBackAt: now(), rolledBackByUid: authz.actor.uid, rollbackReason: motive, updatedAt: now() }, { merge: true });
    await eventRef(authz.tenantId, eventId).set({ schemaVersion: VERSION, tenantId: authz.tenantId, operation, batchId, actor: authz.actor, motive, deletedEvidence: evidenceSnap.size, createdAt: now() });
    return { ok: true, batchId, status: 'ROLLED_BACK', deletedEvidence: evidenceSnap.size };
  }

  throw new HttpsError('invalid-argument', 'Operación no soportada.');
}

exports.orbit360RecurringInsuranceImport = onCall({ region: REGION, cors: true }, execute);
exports.orbit360RecurringInsuranceImportLabV20260804 = onCall({ region: REGION, cors: true }, execute);
exports.__recurringInsuranceImport = Object.freeze({ VERSION, SOURCE_TYPES, OPERATIONS, normalizeRow, batchPreview });
