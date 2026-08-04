'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-ops-leads-domain-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const DEFAULT_STAGES = Object.freeze({
  nuevo: { leads: true, ops: false, next: ['contactado', 'cotizando', 'perdido'] },
  contactado: { leads: true, ops: false, next: ['cotizando', 'perdido'] },
  cotizando: { leads: true, ops: true, opsList: 'Cotizaciones', next: ['propuesta', 'perdido'] },
  propuesta: { leads: true, ops: false, next: ['negociacion', 'inspeccion', 'emision', 'perdido'] },
  negociacion: { leads: true, ops: false, next: ['inspeccion', 'emision', 'perdido'] },
  inspeccion: { leads: true, ops: true, opsList: 'Inspecciones', next: ['emision', 'perdido'] },
  emision: { leads: true, ops: true, opsList: 'Emisiones', next: ['emitido', 'perdido'] },
  emitido: { leads: true, ops: false, terminal: true, next: [] },
  perdido: { leads: true, ops: false, terminal: true, next: ['contactado'] }
});
const ADMIN_ROLES = new Set(['superadmin', 'admintenant', 'direccion', 'admin', 'operativo']);
const MANAGE_PERMISSIONS = new Set(['ops_manage', 'leads_manage', 'gestiones_manage', 'workflow_manage']);
const OPERATIONS = new Set([
  'create_business', 'transition_business', 'update_business', 'archive_business',
  'create_management', 'update_management', 'assign_management', 'resolve_management',
  'reopen_management', 'archive_management', 'portal_request'
]);

const text = (value, max = 600) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleanId = (value, label) => {
  const id = text(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(id)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return id;
};
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 120)).filter(Boolean)));
const serverNow = () => FieldValue.serverTimestamp();

function membershipRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function configRef(tenantId) {
  return db.collection('tenants').doc(tenantId).collection('config').doc('workflow');
}
function legacyRef(tenantId, collection, id) {
  return db.collection('tenantId').doc(tenantId).collection(collection).doc(id);
}
function canonicalRef(tenantId, collection, id) {
  return db.collection('tenants').doc(tenantId).collection('workflow').doc(collection).collection('items').doc(id);
}
function domainRef(config, tenantId, collection, id) {
  return config && config.storageMode === 'canonicalV2'
    ? canonicalRef(tenantId, collection, id)
    : legacyRef(tenantId, collection, id);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('workflowEvents').doc(eventId);
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('workflowRequests').doc(requestId);
}
function outboxRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('notificationOutbox').doc(eventId);
}
function portalNotificationRef(tenantId, id) {
  return legacyRef(tenantId, 'notifs', id);
}

function rolesOf(member) {
  return unique([...(member.roles || []), member.activeRole, member.rolActivo, member.role, member.rol]).map(norm);
}
function permissionsOf(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function activeMember(member) {
  const status = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado'].includes(status);
}
function scopeOf(member, domain) {
  const scopes = member.dataScopes || {};
  const value = norm(scopes[domain] || scopes.workflow || member.scopeDatos || member.dataScope);
  if (['propios', 'own'].includes(value)) return 'own';
  if (['equipo', 'team'].includes(value)) return 'team';
  if (['ninguno', 'none'].includes(value)) return 'none';
  return 'all';
}
function canManage(member) {
  const roles = rolesOf(member);
  const permissions = permissionsOf(member);
  return roles.some(role => ADMIN_ROLES.has(role)) || permissions.some(permission => MANAGE_PERMISSIONS.has(permission));
}
function actorProjection(context, member) {
  return {
    uid: text(context.auth.uid, 180),
    advisorId: text(member.advisorId || member.asesorId, 180),
    activeRole: text(member.activeRole || member.rolActivo || member.defaultRole || member.rol, 100),
    roles: unique(member.roles || [])
  };
}
async function authorize(request, operation) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = cleanId(request.data && request.data.tenantId, 'tenantId');
  const memberSnap = await membershipRef(tenantId, request.auth.uid).get();
  const member = memberSnap.exists ? memberSnap.data() : null;
  if (!activeMember(member)) throw new HttpsError('permission-denied', 'La membresía no está activa.');
  if (!canManage(member) && !['update_business', 'transition_business', 'update_management', 'resolve_management'].includes(operation)) {
    throw new HttpsError('permission-denied', 'No tiene permiso para administrar este flujo.');
  }
  return { tenantId, member, actor: actorProjection(request, member) };
}

function workflowConfig(raw) {
  raw = raw || {};
  const stages = {};
  const sourceStages = raw.stages && typeof raw.stages === 'object' ? raw.stages : DEFAULT_STAGES;
  Object.entries(sourceStages).forEach(([id, stage]) => {
    const key = norm(id).replace(/ /g, '_');
    stages[key] = {
      leads: stage.leads !== false,
      ops: stage.ops === true,
      opsList: text(stage.opsList || stage.listaOps, 100),
      terminal: stage.terminal === true,
      next: unique(stage.next || stage.siguientes || []).map(value => norm(value).replace(/ /g, '_'))
    };
  });
  return {
    version: text(raw.version || VERSION, 120),
    storageMode: raw.storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible',
    stages,
    notificationChannels: unique(raw.notificationChannels || ['portal', 'in_app']),
    advisorManagementProjection: raw.advisorManagementProjection !== false,
    portalResponseEnabled: raw.portalResponseEnabled !== false,
    cadenceEnabled: raw.cadenceEnabled !== false,
    autoOpsOnInspection: raw.autoOpsOnInspection !== false,
    autoOpsOnIssuance: raw.autoOpsOnIssuance !== false
  };
}
async function getConfig(tenantId) {
  const snap = await configRef(tenantId).get();
  return workflowConfig(snap.exists ? snap.data() : {});
}

function requestIdentity(tenantId, operation, entityId, payload, supplied) {
  const explicit = text(supplied, 180);
  if (explicit) return cleanId(explicit, 'requestId');
  return `wf_${sha(JSON.stringify(stable({ tenantId, operation, entityId, payload }))).slice(0, 28)}`;
}
function assertReason(data) {
  const reason = text(data.reason || data.motivo, 600);
  if (!reason) throw new HttpsError('invalid-argument', 'El motivo es obligatorio.');
  return reason;
}
function advisorAllowed(member, targetAdvisorId) {
  const scope = scopeOf(member, 'workflow');
  const actorAdvisorId = text(member.advisorId || member.asesorId, 180);
  if (scope === 'none') return false;
  if (scope === 'own') return !!actorAdvisorId && actorAdvisorId === text(targetAdvisorId, 180);
  if (scope === 'team') {
    const team = new Set(unique(member.teamAdvisorIds || member.asesoresEquipo || []));
    team.add(actorAdvisorId);
    return team.has(text(targetAdvisorId, 180));
  }
  return true;
}
function sanitizeBusiness(input, actor) {
  const stage = norm(input.stage || input.etapa || 'nuevo').replace(/ /g, '_');
  return {
    id: cleanId(input.id || `neg_${Date.now().toString(36)}`, 'businessId'),
    nombre: text(input.nombre || input.name, 220),
    tipo: text(input.tipo || input.type, 80),
    etapa: stage,
    asesorId: cleanId(input.asesorId || input.advisorId || actor.advisorId, 'advisorId'),
    clienteId: text(input.clienteId || input.clientId, 180),
    pais: text(input.pais || input.country, 8).toUpperCase(),
    moneda: text(input.moneda || input.currency, 8).toUpperCase(),
    canal: text(input.canal || input.channel, 100),
    producto: text(input.producto || input.product, 180),
    ramo: text(input.ramo || input.line, 140),
    aseguradoraId: text(input.aseguradoraId || input.insurerId, 180),
    primaEst: Number(input.primaEst || input.estimatedPremium || 0),
    prioridad: text(input.prioridad || input.priority || 'Media', 40),
    origen: text(input.origen || input.origin || 'Plataforma', 100),
    archivado: false
  };
}
function sanitizeManagement(input, actor) {
  return {
    id: cleanId(input.id || `ges_${Date.now().toString(36)}`, 'managementId'),
    lista: text(input.lista || input.opsList || 'Gestiones Admin', 120),
    tipo: text(input.tipo || input.type || 'Gestión', 180),
    titulo: text(input.titulo || input.title || input.tipo || 'Gestión', 240),
    clienteId: text(input.clienteId || input.clientId, 180),
    polizaId: text(input.polizaId || input.policyId, 180),
    negocioId: text(input.negocioId || input.businessId, 180),
    asesorId: cleanId(input.asesorId || input.advisorId || actor.advisorId, 'advisorId'),
    aseguradoraId: text(input.aseguradoraId || input.insurerId, 180),
    estado: text(input.estado || input.status || 'Pendiente', 80),
    prioridad: text(input.prioridad || input.priority || 'Media', 40),
    origen: text(input.origen || input.origin || 'Plataforma', 100),
    nota: text(input.nota || input.note, 3000),
    solicitanteTipo: text(input.solicitanteTipo || input.requesterType, 80),
    solicitanteId: text(input.solicitanteId || input.requesterId, 180),
    archivado: false
  };
}
function eventPayload({ tenantId, operation, entityType, entityId, actor, reason, before, after, requestId }) {
  return {
    schemaVersion: VERSION,
    tenantId,
    operation,
    entityType,
    entityId,
    requestId,
    actor,
    reason,
    beforeDigest: before ? digest(before) : '',
    afterDigest: after ? digest(after) : '',
    createdAt: serverNow()
  };
}
function notificationTargets(after, operation, config) {
  const targets = [];
  if (after && after.asesorId) targets.push({ type: 'advisor', id: after.asesorId });
  if (config.portalResponseEnabled && after && after.clienteId && ['resolve_management', 'create_management', 'portal_request', 'assign_management'].includes(operation)) {
    targets.push({ type: 'client', id: after.clienteId });
  }
  return targets;
}

async function executeCommand(request) {
  const data = request.data || {};
  const operation = norm(data.operation).replace(/ /g, '_');
  if (!OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación no soportada.');
  const authz = await authorize(request, operation);
  const config = await getConfig(authz.tenantId);
  const reason = assertReason(data);
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
  const isBusiness = operation.includes('business');
  const entityType = isBusiness ? 'negocios' : 'gestiones';
  let entityId = text(data.entityId || payload.id, 180);
  let prepared = null;
  if (operation === 'create_business') prepared = sanitizeBusiness(payload, authz.actor);
  if (operation === 'create_management' || operation === 'portal_request') prepared = sanitizeManagement(payload, authz.actor);
  if (prepared) entityId = prepared.id;
  entityId = cleanId(entityId, isBusiness ? 'businessId' : 'managementId');
  const requestId = requestIdentity(authz.tenantId, operation, entityId, payload, data.requestId);
  const entity = domainRef(config, authz.tenantId, entityType, entityId);
  const reqRef = requestRef(authz.tenantId, requestId);
  const eventId = `evt_${sha(`${authz.tenantId}|${requestId}`).slice(0, 28)}`;

  return db.runTransaction(async tx => {
    const previousRequest = await tx.get(reqRef);
    if (previousRequest.exists && previousRequest.data().status === 'committed') {
      return Object.assign({ reused: true }, previousRequest.data().result || {});
    }
    const snap = await tx.get(entity);
    const before = snap.exists ? snap.data() : null;
    if (prepared && before) throw new HttpsError('already-exists', 'El registro ya existe.');
    if (!prepared && !before) throw new HttpsError('not-found', 'El registro no existe.');
    let after = prepared ? Object.assign({}, prepared) : Object.assign({}, before);

    if (!advisorAllowed(authz.member, after.asesorId || payload.asesorId || payload.advisorId)) {
      throw new HttpsError('permission-denied', 'El asesor está fuera de su alcance activo.');
    }
    if (operation === 'transition_business') {
      const from = norm(before.etapa).replace(/ /g, '_');
      const to = norm(payload.to || payload.etapa || payload.stage).replace(/ /g, '_');
      const stage = config.stages[from];
      if (!config.stages[to]) throw new HttpsError('failed-precondition', 'La etapa destino no está configurada.');
      if (!stage || !stage.next.includes(to)) throw new HttpsError('failed-precondition', 'Transición no permitida por la configuración del tenant.');
      after.etapa = to;
      after.opsVisible = config.stages[to].ops === true;
      after.opsList = config.stages[to].opsList || '';
      if (to === 'propuesta' && config.cadenceEnabled) after.cadenciaActiva = true;
    } else if (operation === 'update_business') {
      const allowed = ['nombre', 'tipo', 'asesorId', 'clienteId', 'pais', 'moneda', 'canal', 'producto', 'ramo', 'aseguradoraId', 'primaEst', 'prioridad', 'proximoToque', 'descripcion'];
      allowed.forEach(key => { if (payload[key] !== undefined) after[key] = payload[key]; });
    } else if (operation === 'archive_business') {
      after.archivado = true;
    } else if (operation === 'update_management') {
      const allowed = ['lista', 'tipo', 'titulo', 'clienteId', 'polizaId', 'negocioId', 'asesorId', 'aseguradoraId', 'estado', 'prioridad', 'vence', 'proximaAccion', 'nota', 'resultado'];
      allowed.forEach(key => { if (payload[key] !== undefined) after[key] = payload[key]; });
    } else if (operation === 'assign_management') {
      after.asesorId = cleanId(payload.asesorId || payload.advisorId, 'advisorId');
      if (!advisorAllowed(authz.member, after.asesorId)) throw new HttpsError('permission-denied', 'El asesor está fuera de su alcance activo.');
    } else if (operation === 'resolve_management') {
      after.estado = 'Resuelta';
      after.resultado = text(payload.resultado || payload.result, 3000);
      after.resolvedAt = serverNow();
    } else if (operation === 'reopen_management') {
      after.estado = 'Pendiente';
      after.reopenedAt = serverNow();
    } else if (operation === 'archive_management') {
      after.archivado = true;
    }

    after.tenantId = authz.tenantId;
    after.schemaVersion = VERSION;
    after.updatedAt = serverNow();
    after.updatedByUid = authz.actor.uid;
    if (!before) {
      after.createdAt = serverNow();
      after.createdByUid = authz.actor.uid;
    }
    const event = eventPayload({ tenantId: authz.tenantId, operation, entityType, entityId, actor: authz.actor, reason, before, after, requestId });
    tx.set(entity, after, { merge: true });
    tx.set(eventRef(authz.tenantId, eventId), event, { merge: false });

    const targets = notificationTargets(after, operation, config);
    if (targets.length) {
      tx.set(outboxRef(authz.tenantId, eventId), {
        schemaVersion: VERSION,
        tenantId: authz.tenantId,
        eventId,
        operation,
        entityType,
        entityId,
        targets,
        channels: config.notificationChannels,
        status: 'pending_provider',
        payload: {
          title: text(payload.notificationTitle || after.titulo || after.nombre || 'Actualización', 220),
          message: text(payload.notificationMessage || reason, 1200)
        },
        createdAt: serverNow()
      }, { merge: false });
    }
    if (config.portalResponseEnabled && after.clienteId && ['resolve_management', 'portal_request'].includes(operation)) {
      const portalId = `ntf_${sha(`${eventId}|${after.clienteId}`).slice(0, 24)}`;
      tx.set(portalNotificationRef(authz.tenantId, portalId), {
        id: portalId,
        tenantId: authz.tenantId,
        clienteId: after.clienteId,
        gestionId: entityId,
        tipo: 'gestion',
        titulo: operation === 'resolve_management' ? 'Gestión actualizada' : 'Solicitud recibida',
        cuerpo: text(payload.notificationMessage || after.resultado || reason, 1200),
        leida: false,
        createdAt: serverNow(),
        schemaVersion: VERSION
      }, { merge: true });
    }

    const result = {
      ok: true,
      operation,
      entityType,
      entityId,
      requestId,
      eventId,
      storageMode: config.storageMode,
      projection: {
        leadsVisible: entityType === 'negocios' ? !!(config.stages[after.etapa] && config.stages[after.etapa].leads) : false,
        opsVisible: entityType === 'gestiones' ? !after.archivado : !!(config.stages[after.etapa] && config.stages[after.etapa].ops),
        advisorVisible: !!after.asesorId
      }
    };
    tx.set(reqRef, { status: 'committed', operation, entityType, entityId, eventId, result, committedAt: serverNow() }, { merge: true });
    return result;
  });
}

exports.orbit360OpsLeadsCommand = onCall({ region: REGION, cors: true }, executeCommand);
exports.orbit360OpsLeadsCommandLabV20260804 = onCall({ region: REGION, cors: true }, executeCommand);
exports.__opsLeadsDomain = Object.freeze({ VERSION, DEFAULT_STAGES, OPERATIONS });
