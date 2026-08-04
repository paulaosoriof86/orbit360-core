'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-tenant-domain-config-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const DOMAINS = new Set(['workflow', 'reconciliation']);
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin']);
const PERMISSIONS = new Set(['config_manage', 'workflow_config_manage', 'reconciliation_config_manage']);

const text = (value, max = 1000) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const id = (value, label) => {
  const out = text(value, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
};
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 160)).filter(Boolean)));
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function configRef(tenantId, domain) {
  return db.collection('tenants').doc(tenantId).collection('config').doc(domain);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('configEvents').doc(eventId);
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
function canManage(member, domain) {
  const needed = domain === 'workflow' ? 'workflow_config_manage' : 'reconciliation_config_manage';
  return roles(member).some(role => ADMIN_ROLES.has(role)) || permissions(member).some(permission => PERMISSIONS.has(permission) || permission === needed);
}
async function authorize(request, domain, write) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = id(request.data && request.data.tenantId, 'tenantId');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!active(member)) throw new HttpsError('permission-denied', 'Membresía inactiva.');
  if (write && !canManage(member, domain)) throw new HttpsError('permission-denied', 'No puede administrar esta configuración.');
  return { tenantId, actor: { uid: request.auth.uid, activeRole: text(member.activeRole || member.rolActivo || member.rol, 100) } };
}

function validateWorkflow(input) {
  input = input || {};
  const stagesInput = input.stages && typeof input.stages === 'object' ? input.stages : {};
  const stages = {};
  Object.entries(stagesInput).forEach(([rawId, raw]) => {
    const stageId = norm(rawId);
    if (!stageId) throw new HttpsError('invalid-argument', 'Cada etapa requiere identificador.');
    raw = raw || {};
    stages[stageId] = {
      label: text(raw.label || raw.nombre || rawId, 120),
      leads: raw.leads !== false,
      ops: raw.ops === true,
      opsList: text(raw.opsList || raw.listaOps, 120),
      terminal: raw.terminal === true,
      next: unique(raw.next || raw.siguientes || []).map(norm),
      probability: Math.max(0, Math.min(100, Number(raw.probability || raw.probabilidad || 0))),
      slaHours: Math.max(0, Number(raw.slaHours || raw.slaHoras || 0))
    };
  });
  if (!Object.keys(stages).length) throw new HttpsError('invalid-argument', 'Debe existir al menos una etapa.');
  Object.entries(stages).forEach(([stageId, stage]) => stage.next.forEach(next => {
    if (!stages[next]) throw new HttpsError('invalid-argument', `La etapa ${stageId} apunta a ${next}, que no existe.`);
    if (next === stageId) throw new HttpsError('invalid-argument', `La etapa ${stageId} no puede apuntarse a sí misma.`);
  }));
  return {
    schemaVersion: VERSION,
    storageMode: input.storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible',
    stages,
    notificationChannels: unique(input.notificationChannels || ['portal', 'in_app']).map(norm),
    advisorManagementProjection: input.advisorManagementProjection !== false,
    portalResponseEnabled: input.portalResponseEnabled !== false,
    cadenceEnabled: input.cadenceEnabled !== false,
    escalationEnabled: input.escalationEnabled !== false,
    duplicateDetectionEnabled: input.duplicateDetectionEnabled !== false,
    defaultManagementSlaHours: Math.max(0, Number(input.defaultManagementSlaHours || 72)),
    priorities: unique(input.priorities || ['Baja', 'Media', 'Alta', 'Crítica']),
    managementTypes: Array.isArray(input.managementTypes) ? input.managementTypes.slice(0, 200).map(row => ({ id: norm(row.id || row.label || row.nombre), label: text(row.label || row.nombre, 160), opsList: text(row.opsList || row.lista, 120), slaHours: Math.max(0, Number(row.slaHours || row.slaHoras || 0)) })).filter(row => row.id && row.label) : []
  };
}
function validateReconciliation(input) {
  input = input || {};
  return {
    schemaVersion: VERSION,
    inferenceEnabled: input.inferenceEnabled !== false,
    commissionRecognitionEnabled: input.commissionRecognitionEnabled !== false,
    commissionSequenceEnabled: input.commissionSequenceEnabled !== false,
    completePortfolioSequenceEnabled: input.completePortfolioSequenceEnabled !== false,
    bankSupportRequiresCounterpart: input.bankSupportRequiresCounterpart !== false,
    absenceAloneNeverReconciles: input.absenceAloneNeverReconciles !== false,
    amountTolerance: Math.max(0, Number(input.amountTolerance == null ? 0.02 : input.amountTolerance)),
    dateToleranceDays: Math.max(0, Math.floor(Number(input.dateToleranceDays == null ? 7 : input.dateToleranceDays))),
    requireSameCurrency: input.requireSameCurrency !== false,
    requireSameTerm: input.requireSameTerm !== false,
    holdOnNegative: input.holdOnNegative !== false,
    holdOnReversal: input.holdOnReversal !== false,
    holdOnDuplicate: input.holdOnDuplicate !== false,
    autoApplyThreshold: null,
    humanConfirmationRequired: true,
    evidencePriority: unique(input.evidencePriority || ['INSURER_PAYMENT', 'COMMISSION_RECOGNITION', 'PORTFOLIO_SNAPSHOT', 'PLATFORM_PAYMENT_REPORT', 'BANK_SUPPORT'])
  };
}
function validate(domain, input) {
  return domain === 'workflow' ? validateWorkflow(input) : validateReconciliation(input);
}

async function execute(request) {
  const data = request.data || {};
  const action = norm(data.action || 'get');
  const domain = norm(data.domain);
  if (!DOMAINS.has(domain)) throw new HttpsError('invalid-argument', 'Dominio no soportado.');
  if (!['get', 'save'].includes(action)) throw new HttpsError('invalid-argument', 'Acción no soportada.');
  const authz = await authorize(request, domain, action === 'save');
  const ref = configRef(authz.tenantId, domain);
  if (action === 'get') {
    const snap = await ref.get();
    return { ok: true, domain, exists: snap.exists, config: snap.exists ? snap.data() : null };
  }
  const reason = text(data.reason || data.motivo, 1000);
  if (!reason) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  const next = validate(domain, data.config || {});
  const eventId = `cfg_${sha(`${authz.tenantId}|${domain}|${digest(next)}|${reason}`).slice(0, 28)}`;
  return db.runTransaction(async tx => {
    const beforeSnap = await tx.get(ref);
    const before = beforeSnap.exists ? beforeSnap.data() : null;
    const stored = Object.assign({}, next, { tenantId: authz.tenantId, updatedAt: FieldValue.serverTimestamp(), updatedByUid: authz.actor.uid });
    tx.set(ref, stored, { merge: false });
    tx.set(eventRef(authz.tenantId, eventId), {
      schemaVersion: VERSION,
      tenantId: authz.tenantId,
      domain,
      actor: authz.actor,
      reason,
      beforeDigest: before ? digest(before) : '',
      afterDigest: digest(next),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { ok: true, domain, eventId, config: next };
  });
}

exports.orbit360TenantDomainConfig = onCall({ region: REGION, cors: true }, execute);
exports.__tenantDomainConfig = Object.freeze({ VERSION, DOMAINS });
