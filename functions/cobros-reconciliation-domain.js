'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-cobros-reconciliation-domain-v1';
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
const amount = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const parsed = Number(text(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};
const date = value => {
  const raw = text(value, 30);
  if (!raw) return '';
  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return raw.slice(0, 10);
};
const installment = row => {
  const raw = text(row && (row.cuota || row.installment || row.numeroCuota || row.serie), 40);
  const m = raw.match(/^(\d+)(?:\s*\/\s*\d+)?$/);
  return m ? Number(m[1]) : 0;
};
const conflict = row => /revers|anulad|cancelad|rechaz|duplicad|conflict|moneda|vigencia/.test(norm([
  row && row.estado, row && row.status, row && row.motivo, row && row.matchQuality, row && row.decision
].join(' '))) || amount(row && (row.monto || row.primaNeta || row.total)) < 0;
const now = () => FieldValue.serverTimestamp();

function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function canonicalRef(tenantId, collection, entityId) {
  return db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items').doc(entityId);
}
function evidenceRef(tenantId, evidenceId) {
  return db.collection('tenants').doc(tenantId).collection('data').doc('evidenciasCobro').collection('items').doc(evidenceId);
}
function proposalRef(tenantId, proposalId) {
  return db.collection('tenants').doc(tenantId).collection('data').doc('propuestasConciliacion').collection('items').doc(proposalId);
}
function holdRef(tenantId, holdId) {
  return db.collection('tenants').doc(tenantId).collection('data').doc('conciliacionHolds').collection('items').doc(holdId);
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('reconciliationRequests').doc(requestId);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('reconciliationEvents').doc(eventId);
}

function roles(member) {
  return unique([...(member.roles || []), member.activeRole, member.rolActivo, member.rol]).map(norm);
}
function permissions(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function active(member) {
  const state = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(state);
}
function canManage(member) {
  return roles(member).some(role => ADMIN_ROLES.has(role)) || permissions(member).some(permission => PERMISSIONS.has(permission));
}
async function authorize(request, operation) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = id(request.data && request.data.tenantId, 'tenantId');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!active(member)) throw new HttpsError('permission-denied', 'Membresía inactiva.');
  if (operation !== 'preview_policy' && !canManage(member)) throw new HttpsError('permission-denied', 'No puede administrar conciliaciones.');
  return { tenantId, member, actor: { uid: request.auth.uid, advisorId: text(member.advisorId || member.asesorId, 180), activeRole: text(member.activeRole || member.rolActivo || member.rol, 100) } };
}
function reason(data, required = true) {
  const value = text(data.reason || data.motivo, 1000);
  if (required && !value) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  return value;
}
function requestId(tenantId, operation, payload, supplied) {
  const explicit = text(supplied, 180);
  return explicit ? id(explicit, 'requestId') : `rec_${sha(JSON.stringify(stable({ tenantId, operation, payload }))).slice(0, 28)}`;
}

async function queryByPolicy(tenantId, collection, policyId) {
  const snap = await db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items')
    .where('polizaId', '==', policyId).get();
  return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
}
function evidenceType(row) {
  const source = norm([row.tipoFuente, row.sourceType, row.rolFuente, row.fuenteAutoridad, row.archivo].join(' '));
  if (/comision|planilla/.test(source)) return 'COMMISSION_RECOGNITION';
  if (/cartera|saldo|pendiente/.test(source)) return 'PORTFOLIO_SNAPSHOT';
  if (/pago|cobro|ingreso|recaudo/.test(source)) return 'INSURER_PAYMENT';
  if (/banco|bank/.test(source)) return 'BANK_SUPPORT';
  return 'OTHER';
}
function exactReceipt(evidence, receipts) {
  const directId = text(evidence.reciboId || evidence.receiptId, 180);
  if (directId) return receipts.find(row => row.id === directId) || null;
  const no = installment(evidence);
  if (no) return receipts.find(row => installment(row) === no) || null;
  const sourceReceipt = text(evidence.numeroReciboFuente || evidence.requerimiento || evidence.facturaRecibo, 180);
  if (sourceReceipt) return receipts.find(row => text(row.numeroReciboFuente || row.requerimiento || row.facturaRecibo, 180) === sourceReceipt) || null;
  const candidateAmount = amount(evidence.monto || evidence.primaTotal || evidence.primaNeta);
  const matches = receipts.filter(row => !candidateAmount || Math.abs(amount(row.monto || row.primaTotal || row.primaNeta) - candidateAmount) <= 0.02);
  return matches.length === 1 ? matches[0] : null;
}
function completePortfolio(row) {
  const marker = norm([row.completitud, row.decision, row.rolFuente, row.sourceRole].join(' '));
  return /completo|autoridad saldo|pending authority|complete/.test(marker) && !/parcial|incompleto/.test(marker);
}
function derivePolicyPlan(receipts, evidences) {
  const sorted = receipts.slice().sort((a, b) => installment(a) - installment(b) || date(a.vence || a.fechaLimite).localeCompare(date(b.vence || b.fechaLimite)));
  const outcomes = new Map(sorted.map(row => [row.id, {
    reciboId: row.id,
    cuota: installment(row),
    estado: /pendiente|vencido|futuro/.test(norm(row.estadoOperativo || row.estado)) ? 'PENDIENTE_SEGUN_PLATAFORMA' : 'PAGO_REPORTADO_VALIDO_PENDIENTE_CRUCE',
    confidence: 'PLATFORM',
    evidenceIds: []
  }]));
  const apply = (receipt, state, confidence, evidence) => {
    if (!receipt || conflict(receipt) || conflict(evidence)) return;
    const current = outcomes.get(receipt.id);
    const rank = { PLATFORM: 1, INFERRED_HIGH: 2, DIRECT: 3 };
    if ((rank[confidence] || 0) >= (rank[current.confidence] || 0)) {
      current.estado = state;
      current.confidence = confidence;
    }
    current.evidenceIds.push(evidence.id);
  };

  const commission = [], portfolio = [];
  for (const evidence of evidences) {
    if (conflict(evidence)) continue;
    const type = evidenceType(evidence);
    if (type === 'PORTFOLIO_SNAPSHOT') portfolio.push(evidence);
    if (type === 'COMMISSION_RECOGNITION') commission.push(evidence);
    if (type === 'INSURER_PAYMENT') {
      apply(exactReceipt(evidence, sorted), 'CONCILIADO_DIRECTO_ASEGURADORA', 'DIRECT', evidence);
    }
  }
  for (const evidence of commission) {
    if (amount(evidence.comisionAS || evidence.comisionNeta || evidence.comisionVenta || evidence.commission) <= 0) continue;
    const receipt = exactReceipt(evidence, sorted);
    if (!receipt) continue;
    apply(receipt, 'CONCILIADO_RECONOCIMIENTO_ASEGURADORA', 'DIRECT', evidence);
    const target = installment(receipt);
    if (target > 1) sorted.filter(row => installment(row) > 0 && installment(row) < target && !conflict(row))
      .forEach(row => apply(row, 'CONCILIADO_SECUENCIA_PLANILLA', 'INFERRED_HIGH', evidence));
  }
  const pendingComplete = portfolio.filter(completePortfolio);
  if (pendingComplete.length) {
    const pending = pendingComplete.map(installment).filter(Boolean).sort((a, b) => a - b);
    if (pending.length) {
      const firstPending = pending[0];
      const expected = sorted.filter(row => installment(row) >= firstPending).map(installment).filter(Boolean);
      if (expected.every(no => pending.includes(no))) {
        sorted.filter(row => installment(row) > 0 && installment(row) < firstPending && !conflict(row))
          .forEach(row => apply(row, 'CONCILIADO_SECUENCIA_CARTERA', 'INFERRED_HIGH', pendingComplete[0]));
      }
    }
  }
  const rows = Array.from(outcomes.values());
  const counts = rows.reduce((acc, row) => { acc[row.estado] = (acc[row.estado] || 0) + 1; return acc; }, {});
  return { schemaVersion: VERSION, rows, counts, writes: 0 };
}

async function execute(request) {
  const data = request.data || {};
  const operation = norm(data.operation).replace(/ /g, '_');
  if (!OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación no soportada.');
  const authz = await authorize(request, operation);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};

  if (operation === 'preview_policy') {
    const policyId = id(payload.polizaId || payload.policyId, 'polizaId');
    const [receipts, evidences] = await Promise.all([
      queryByPolicy(authz.tenantId, 'recibosEsperados', policyId),
      queryByPolicy(authz.tenantId, 'evidenciasCobro', policyId)
    ]);
    return Object.assign({ ok: true, tenantId: authz.tenantId, polizaId: policyId }, derivePolicyPlan(receipts, evidences));
  }

  const motive = reason(data, true);
  const reqId = requestId(authz.tenantId, operation, payload, data.requestId);
  const reqRef = requestRef(authz.tenantId, reqId);
  const eventId = `recevt_${sha(`${authz.tenantId}|${reqId}`).slice(0, 28)}`;

  return db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists && previous.data().status === 'committed') return Object.assign({ reused: true }, previous.data().result || {});
    let result;
    if (operation === 'register_evidence') {
      const evidenceId = id(payload.id || `ev_${sha(JSON.stringify(stable(payload))).slice(0, 24)}`, 'evidenceId');
      const evidence = {
        id: evidenceId,
        tenantId: authz.tenantId,
        polizaId: id(payload.polizaId || payload.policyId, 'polizaId'),
        reciboId: text(payload.reciboId || payload.receiptId, 180),
        clienteId: text(payload.clienteId || payload.clientId, 180),
        aseguradoraId: text(payload.aseguradoraId || payload.insurerId, 180),
        tipoFuente: text(payload.tipoFuente || payload.sourceType, 120),
        archivoHash: text(payload.archivoHash || payload.fileHash, 128),
        hoja: text(payload.hoja || payload.sheet, 120),
        fila: text(payload.fila || payload.row, 80),
        periodo: text(payload.periodo || payload.period, 80),
        moneda: text(payload.moneda || payload.currency, 8).toUpperCase(),
        monto: amount(payload.monto || payload.amount),
        cuota: Number(payload.cuota || payload.installment || 0),
        comisionAS: amount(payload.comisionAS || payload.commission),
        estado: text(payload.estado || payload.status, 100),
        completitud: text(payload.completitud || payload.completeness, 100),
        schemaVersion: VERSION,
        createdAt: now(),
        createdByUid: authz.actor.uid
      };
      tx.set(evidenceRef(authz.tenantId, evidenceId), evidence, { merge: true });
      result = { ok: true, operation, evidenceId };
    } else {
      const proposalId = id(payload.proposalId, 'proposalId');
      const pRef = proposalRef(authz.tenantId, proposalId);
      const snap = await tx.get(pRef);
      if (!snap.exists) throw new HttpsError('not-found', 'La propuesta no existe.');
      const proposal = snap.data();
      if (operation === 'confirm_application') {
        const receiptId = id(proposal.reciboId || payload.reciboId, 'reciboId');
        const rRef = canonicalRef(authz.tenantId, 'recibosEsperados', receiptId);
        const receiptSnap = await tx.get(rRef);
        if (!receiptSnap.exists) throw new HttpsError('not-found', 'El recibo no existe.');
        const receipt = receiptSnap.data();
        const applied = amount(payload.montoAplicado || proposal.monto || receipt.monto);
        if (applied <= 0) throw new HttpsError('failed-precondition', 'El monto aplicado debe ser positivo.');
        const cobroId = id(payload.cobroId || `cob_${sha(`${proposalId}|${receiptId}`).slice(0, 24)}`, 'cobroId');
        tx.set(canonicalRef(authz.tenantId, 'cobros', cobroId), {
          id: cobroId,
          tenantId: authz.tenantId,
          polizaId: proposal.polizaId,
          reciboId: receiptId,
          clienteId: proposal.clienteId || receipt.clienteId,
          aseguradoraId: proposal.aseguradoraId || receipt.aseguradoraId,
          moneda: proposal.moneda || receipt.moneda,
          monto: applied,
          estado: 'Pagado',
          conciliado: true,
          conciliacionTipo: proposal.conciliacionTipo || proposal.resultado || 'CONFIRMADA',
          proposalId,
          fechaPago: date(proposal.fechaPago || payload.fechaPago),
          schemaVersion: VERSION,
          createdAt: now(),
          createdByUid: authz.actor.uid
        }, { merge: true });
        tx.set(rRef, { estadoOperativo: 'PAGADO_CONCILIADO', conciliadoPago: true, cobroId, montoAplicado: applied, updatedAt: now() }, { merge: true });
        tx.set(pRef, { estado: 'APLICADA', cobroId, motivoConfirmacion: motive, confirmedAt: now(), confirmedByUid: authz.actor.uid }, { merge: true });
        result = { ok: true, operation, proposalId, receiptId, cobroId, applied };
      } else if (operation === 'hold_proposal') {
        const holdId = id(payload.holdId || `hold_${sha(proposalId).slice(0, 24)}`, 'holdId');
        tx.set(pRef, { estado: 'HOLD', holdId, updatedAt: now() }, { merge: true });
        tx.set(holdRef(authz.tenantId, holdId), { id: holdId, proposalId, tenantId: authz.tenantId, motivo: motive, accionRequerida: text(payload.accionRequerida || payload.requiredAction, 1000), estado: 'ABIERTO', createdAt: now(), createdByUid: authz.actor.uid, schemaVersion: VERSION }, { merge: true });
        result = { ok: true, operation, proposalId, holdId };
      } else if (operation === 'reopen_proposal') {
        tx.set(pRef, { estado: 'PROPUESTA', reopenedAt: now(), reopenedByUid: authz.actor.uid, motivoReapertura: motive }, { merge: true });
        result = { ok: true, operation, proposalId };
      }
    }
    tx.set(eventRef(authz.tenantId, eventId), { schemaVersion: VERSION, tenantId: authz.tenantId, eventId, operation, requestId: reqId, actor: authz.actor, motivo: motive, payloadDigest: digest(payload), resultDigest: digest(result), createdAt: now() }, { merge: false });
    tx.set(reqRef, { status: 'committed', operation, eventId, result, committedAt: now() }, { merge: true });
    return result;
  });
}

exports.orbit360CobrosReconciliationCommand = onCall({ region: REGION, cors: true }, execute);
exports.__cobrosReconciliationDomain = Object.freeze({ VERSION, OPERATIONS });
