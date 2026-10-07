'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const PREVIEW_REGION = 'us-east1';
const VERSION = 'orbit360-notification-outbox-processor-v3-r20-recipient-projection';
const MAX_ATTEMPTS = 3;
const INTERNAL_CHANNELS = new Set(['portal','in_app','interna','topbar','tarea','actividad']);
const ADMIN_ROLES = new Set(['superadmin','admintenant','direccion','admin','operativo']);
const RETRY_PERMISSIONS = new Set(['notifications_retry','notificaciones_reintentar','workflow_manage','ops_manage']);

const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const text = (value, max = 1200) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));
const cleanId = (value, label) => {
  const out = text(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
};
const sha = input => require('node:crypto').createHash('sha256').update(String(input)).digest('hex');
const membershipRef = (tenantId, uid) => db.collection('tenants').doc(tenantId).collection('members').doc(uid);
const outboxRef = (tenantId, eventId, preview) => db.collection('tenants').doc(tenantId).collection(preview ? 'previewNotificationOutbox' : 'notificationOutbox').doc(eventId);
const eventRef = (tenantId, eventId, preview) => db.collection('tenants').doc(tenantId).collection(preview ? 'previewWorkflowEvents' : 'workflowEvents').doc(eventId);
const previewProjectionRef = (tenantId, notificationId) => db.collection('tenants').doc(tenantId).collection('previewNotifs').doc(notificationId);
const portalProjectionRef = (tenantId, notificationId) => db.collection('tenantId').doc(tenantId).collection('notifs').doc(notificationId);
const internalProjectionRef = (tenantId, notificationId, preview) => db.collection('tenants').doc(tenantId).collection(preview ? 'previewInternalNotifs' : 'internalNotifs').doc(notificationId);

function rolesOf(member) {
  return unique([...(member && member.roles || []), member && member.activeRole, member && member.rolActivo, member && member.defaultRole, member && member.rol]).map(norm);
}
function permissionsOf(member) {
  return unique([...(member && member.permissions || []), ...(member && member.permisosExtra || []), ...(member && member.extras || [])]).map(norm);
}
function activeMember(member) {
  const status = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
}
async function authorizeRetry(request, preview) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = cleanId(request.data && request.data.tenantId, 'tenantId');
  const eventId = cleanId(request.data && request.data.eventId, 'eventId');
  if (preview && (tenantId !== 'alianzas-soluciones' || !/^b4002qa_[A-Za-z0-9._:-]+$/.test(eventId))) {
    throw new HttpsError('permission-denied', 'PREVIEW_QA_EVENT_ONLY');
  }
  const memberSnap = await membershipRef(tenantId, request.auth.uid).get();
  const member = memberSnap.exists ? memberSnap.data() : null;
  if (!activeMember(member)) throw new HttpsError('permission-denied', 'La membresía no está activa.');
  const allowed = rolesOf(member).some(role => ADMIN_ROLES.has(role)) || permissionsOf(member).some(p => RETRY_PERMISSIONS.has(p));
  if (!allowed) throw new HttpsError('permission-denied', 'No tiene permiso para reintentar notificaciones.');
  return { tenantId, eventId, uid: request.auth.uid };
}
function notificationId(tenantId, eventId, clientId) {
  return `ntf_${sha(`${tenantId}|${eventId}|${clientId}`).slice(0, 24)}`;
}
function internalNotificationId(tenantId,eventId,type,id){return `int_${sha(`${tenantId}|${eventId}|${type}|${id}`).slice(0,24)}`;}
function channelPlan(row) {
  const requested = unique(row.channels || []).map(norm).filter(Boolean);
  const channels = requested.length ? requested : ['portal','in_app'];
  const internal = channels.filter(c => INTERNAL_CHANNELS.has(c));
  const external = channels.filter(c => !INTERNAL_CHANNELS.has(c));
  const states = {};
  internal.forEach(c => { states[c] = 'delivered_internal'; });
  external.forEach(c => { states[c] = 'pending_connection'; });
  return { channels, internal, external, states };
}
function retryAt(attempt) {
  const delayMinutes = Math.min(60, Math.max(1, Math.pow(2, Math.max(0, attempt - 1))));
  return Timestamp.fromMillis(Date.now() + delayMinutes * 60 * 1000);
}
async function recordFailure(tenantId, eventId, preview, error) {
  const ref = outboxRef(tenantId, eventId, preview);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, missing: true, status: 'missing_outbox' };
    const row = snap.data() || {};
    const attemptCount = Math.max(0, Number(row.attemptCount) || 0) + 1;
    const terminal = attemptCount >= MAX_ATTEMPTS;
    const status = terminal ? 'failed_processing' : 'retry_pending';
    const patch = {
      processorVersion: VERSION,
      status,
      attemptCount,
      retryEligible: !terminal,
      lastError: text(error && (error.code || error.message || error), 800) || 'PROCESSING_ERROR',
      lastAttemptAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    patch.nextAttemptAt = terminal ? null : retryAt(attemptCount);
    tx.set(ref, patch, { merge: true });
    return { ok: false, status, attemptCount, retryEligible: !terminal, lastError: patch.lastError };
  });
}
async function processOutbox(tenantIdInput, eventIdInput, preview, actorUid) {
  const tenantId = cleanId(tenantIdInput, 'tenantId');
  const eventId = cleanId(eventIdInput, 'eventId');
  if (preview && tenantId !== 'alianzas-soluciones') throw new Error('PREVIEW_QA_TENANT_ONLY');
  const outRef = outboxRef(tenantId, eventId, preview);
  const evtRef = eventRef(tenantId, eventId, preview);
  try {
    return await db.runTransaction(async tx => {
      const [outSnap, evtSnap] = await Promise.all([tx.get(outRef), tx.get(evtRef)]);
      if (!outSnap.exists) throw new Error('OUTBOX_NOT_FOUND');
      const row = outSnap.data() || {};
      if (!evtSnap.exists) throw new Error('CANONICAL_EVENT_NOT_COMMITTED');
      if (preview) { const entityId=text(row.entityId,180); if(row.previewWrite!==true||!/^b400[23]qa[_:-]/i.test(entityId))throw new Error('PREVIEW_QA_EVENT_ONLY'); }
      if (row.processorVersion === VERSION && ['delivered_internal','pending_connection'].includes(text(row.status, 80))) {
        return { ok: true, reused: true, status: text(row.status, 80), attemptCount: Number(row.attemptCount) || 0 };
      }

      const event = evtSnap.data() || {};
      const plan = channelPlan(row);
      const targets = [].concat(row.targets || []).filter(Boolean);
      const attemptCount = Math.max(0, Number(row.attemptCount) || 0) + 1;
      const clientTargets = targets.filter(t => norm(t && t.type) === 'client' && text(t && t.id, 180));
      const internalTargets = targets.filter(t => ['advisor','role'].includes(norm(t&&t.type)) && text(t&&t.id,180));
      const shouldProjectClient = plan.internal.some(c => ['portal','in_app','interna'].includes(c));
      const shouldProjectInternal = plan.internal.some(c => ['in_app','interna','topbar','tarea','actividad'].includes(c));

      if (shouldProjectClient) {
        for (const target of clientTargets) {
          const clientId = cleanId(target.id, 'clientId');
          const id = notificationId(tenantId, eventId, clientId);
          const ref = preview ? previewProjectionRef(tenantId, id) : portalProjectionRef(tenantId, id);
          tx.set(ref, {
            id,
            tenantId,
            clienteId: clientId,
            eventId,
            gestionId: text(row.entityType, 80) === 'gestiones' ? text(row.entityId, 180) : '',
            entityType: text(row.entityType, 100),
            entityId: text(row.entityId, 180),
            operation: text(row.operation, 100),
            tipo: 'gestion',
            titulo: text(row.payload && row.payload.title, 240) || 'Actualización',
            cuerpo: text(row.payload && row.payload.message, 1200),
            fecha: new Date().toISOString().slice(0, 10),
            leida: false,
            previewWrite: preview === true,
            source: 'canonical_notification_outbox',
            processorVersion: VERSION,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      if (shouldProjectInternal) {
        for (const target of internalTargets) {
          const type=norm(target.type),targetId=cleanId(target.id,'targetId'),id=internalNotificationId(tenantId,eventId,type,targetId);
          const eventActor=event&&event.actor||{},actorUid=text(row.actorUid||eventActor.uid,180),actorName=text(row.actorName||eventActor.name||eventActor.displayName||eventActor.email,220);
          const direction=text(row.direction,40),targetSurface=type==='advisor'?'leads':'ops';
          tx.set(internalProjectionRef(tenantId,id,preview),{
            id,tenantId,eventId,entityType:text(row.entityType,100),entityId:text(row.entityId,180),operation:text(row.operation,100),
            targetType:type,targetId,targetSurface,direction,actorUid,actorName,titulo:text(row.payload&&row.payload.title,240)||'Actualización interna',
            cuerpo:text(row.payload&&row.payload.message,1200),leida:false,previewWrite:preview===true,source:'canonical_notification_outbox',
            processorVersion:VERSION,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
          },{merge:true});
        }
      }

      const status = plan.external.length ? 'pending_connection' : 'delivered_internal';
      tx.set(outRef, {
        processorVersion: VERSION,
        status,
        channelStates: plan.states,
        requestedChannels: plan.channels,
        internalChannelsProcessed: plan.internal,
        externalChannelsPendingConnection: plan.external,
        attemptCount,
        retryEligible: false,
        lastError: '',
        nextAttemptAt: null,
        processedAt: FieldValue.serverTimestamp(),
        lastAttemptAt: FieldValue.serverTimestamp(),
        processedByUid: text(actorUid, 180),
        canonicalEventVerified: true,
        canonicalEventOperation: text(event.operation, 100),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        ok: true,
        reused: false,
        status,
        attemptCount,
        clientProjectionCount: shouldProjectClient ? clientTargets.length : 0,
        internalProjectionCount: shouldProjectInternal ? internalTargets.length : 0,
        externalChannelsPendingConnection: plan.external
      };
    });
  } catch (error) {
    return recordFailure(tenantId, eventId, preview, error);
  }
}
async function triggerCreated(event, preview) {
  const tenantId = event.params && event.params.tenantId;
  const eventId = event.params && event.params.eventId;
  if (!event.data || !tenantId || !eventId) return null;
  return processOutbox(tenantId, eventId, preview, 'system');
}
async function retryCallable(request, preview) {
  const authz = await authorizeRetry(request, preview);
  const result = await processOutbox(authz.tenantId, authz.eventId, preview, authz.uid);
  const readback = await outboxRef(authz.tenantId, authz.eventId, preview).get();
  if (!readback.exists) throw new HttpsError('not-found', 'La notificación ya no existe.');
  const row = readback.data() || {};
  return {
    ok: result.ok === true,
    version: VERSION,
    tenantId: authz.tenantId,
    eventId: authz.eventId,
    status: text(row.status, 80),
    attemptCount: Number(row.attemptCount) || 0,
    retryEligible: row.retryEligible === true,
    lastError: text(row.lastError, 800),
    canonicalEventVerified: row.canonicalEventVerified === true,
    previewWrite: preview === true
  };
}

exports.orbit360NotificationOutboxCreated = onDocumentCreated({
  document: 'tenants/{tenantId}/notificationOutbox/{eventId}',
  region: REGION
}, event => triggerCreated(event, false));

exports.orbit360RetryNotificationOutbox = onCall({
  region: REGION,
  cors: true,
  timeoutSeconds: 60,
  memory: '256MiB'
}, request => retryCallable(request, false));

exports.orbit360NotificationOutboxPreviewCreated = onDocumentCreated({
  document: 'tenants/{tenantId}/previewNotificationOutbox/{eventId}',
  region: PREVIEW_REGION
}, event => triggerCreated(event, true));

exports.orbit360RetryNotificationOutboxPreview = onCall({
  region: PREVIEW_REGION,
  cors: true,
  timeoutSeconds: 60,
  memory: '256MiB'
}, request => retryCallable(request, true));

exports.__notificationOutboxProcessor = Object.freeze({
  VERSION,
  MAX_ATTEMPTS,
  INTERNAL_CHANNELS: Array.from(INTERNAL_CHANNELS),
  processOutbox,
  notificationId
});
