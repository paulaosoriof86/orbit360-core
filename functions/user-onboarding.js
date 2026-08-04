'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const ONBOARDING_VERSION = 'orbit360-user-access-onboarding-v1';
const MEMBER_VERSION = 'orbit360-tenant-membership-v2';
const MANAGE_ROLES = new Set(['superadmin', 'admintenant']);
const MANAGE_PERMISSIONS = new Set([
  'equipo_gestionar_acceso',
  'equipo_acceso_administrar',
  'team_access_manage',
  'users_manage'
]);
const VALID_SCOPES = new Set(['propios', 'equipo', 'todos', 'ninguno']);
const VALID_OPERATIONS = new Set(['provision', 'sync', 'deactivate', 'reactivate', 'mark_invitation_sent']);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ADVISOR_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;

const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

function text(value, max = 512) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function normalized(value, max = 160) {
  return text(value, max)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeEmail(value) {
  const email = text(value, 320).toLowerCase().replace(/\s+/g, '');
  return EMAIL_RE.test(email) ? email : '';
}

function unique(values) {
  return Array.from(new Set([].concat(values || []).map((value) => text(value, 160)).filter(Boolean)));
}

function sha(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}

function stable(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return sha(JSON.stringify(stable(value)));
}

function canonicalRole(value) {
  const role = normalized(value, 120).replace(/_/g, '');
  if (['direccion', 'director', 'directora', 'superadmin', 'superadministrator'].includes(role)) return 'SuperAdmin';
  if (['admin', 'administracion', 'admintenant', 'administrador'].includes(role)) return 'AdminTenant';
  if (['operativo', 'operaciones'].includes(role)) return 'Operativo';
  if (['asesor', 'advisor', 'comercial', 'vendedor'].includes(role)) return 'Asesor';
  if (['finanzas', 'finance'].includes(role)) return 'Finanzas';
  if (['marketing', 'mercadeo'].includes(role)) return 'Marketing';
  if (['asistente', 'assistant'].includes(role)) return 'Asistente';
  return text(value, 80);
}

function rolesFrom(record) {
  record = record || {};
  return unique([
    ...(Array.isArray(record.roles) ? record.roles : []),
    ...(Array.isArray(record.rolesAsignados) ? record.rolesAsignados : []),
    ...(Array.isArray(record.assignedRoles) ? record.assignedRoles : []),
    record.role,
    record.rol,
    record.defaultRole,
    record.rolDefault,
    record.activeRole
  ].filter(Boolean).map(canonicalRole));
}

function permissionsFrom(record) {
  record = record || {};
  return unique([
    ...(Array.isArray(record.permissions) ? record.permissions : []),
    ...(Array.isArray(record.permisosExtra) ? record.permisosExtra : []),
    ...(Array.isArray(record.extraPermissions) ? record.extraPermissions : []),
    ...(Array.isArray(record.extras) ? record.extras : [])
  ].filter(Boolean).map((value) => normalized(value, 120)));
}

function countriesFrom(record) {
  record = record || {};
  return unique([
    ...(Array.isArray(record.countries) ? record.countries : []),
    ...(Array.isArray(record.paises) ? record.paises : []),
    record.country,
    record.pais,
    record.countryDefault,
    record.paisDefault
  ].filter(Boolean).map((value) => text(value, 8).toUpperCase()));
}

function moduleList(value) {
  return unique(value).map((item) => normalized(item, 100)).filter(Boolean);
}

function scopeMap(record, roles) {
  const explicit = record && record.dataScopes;
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const out = {};
    for (const [key, value] of Object.entries(explicit)) {
      const scope = normalized(value, 30);
      if (VALID_SCOPES.has(scope)) out[normalized(key, 80)] = scope;
    }
    if (Object.keys(out).length) return out;
  }
  let scope = normalized(record && (record.scopeDatos || record.dataScope), 30);
  if (!VALID_SCOPES.has(scope)) {
    if (roles.includes('SuperAdmin') || roles.includes('AdminTenant') || roles.includes('Operativo')) scope = 'todos';
    else if (roles.includes('Asesor')) scope = 'propios';
    else scope = 'ninguno';
  }
  const domains = ['clientes', 'polizas', 'vehiculos', 'recibos', 'cartera', 'cobros', 'comisiones', 'gestiones', 'leads'];
  return Object.fromEntries(domains.map((domain) => [domain, scope]));
}

function hasAllScope(scopes) {
  return Object.values(scopes || {}).some((value) => normalized(value, 30) === 'todos');
}

function sanitizeAdvisor(raw, advisorId) {
  raw = raw || {};
  const roles = rolesFrom(raw);
  const email = normalizeEmail(raw.email || raw.correo || raw.userEmail);
  const countries = countriesFrom(raw);
  const defaultCandidate = canonicalRole(raw.defaultRole || raw.rolDefault || raw.activeRole || raw.rol || roles[0]);
  const defaultRole = roles.includes(defaultCandidate) ? defaultCandidate : roles[0] || '';
  const inactive = raw.inactivo === true || raw.activo === false || normalized(raw.estado, 40) === 'inactivo';
  const errors = [];
  if (!ADVISOR_ID_RE.test(text(advisorId, 160))) errors.push('ADVISOR_ID_INVALID');
  if (!text(raw.nombre || raw.name || raw.displayName, 180)) errors.push('NAME_REQUIRED');
  if (!email) errors.push('VALID_EMAIL_REQUIRED');
  if (!roles.length) errors.push('ROLE_REQUIRED');
  if (!defaultRole || !roles.includes(defaultRole)) errors.push('DEFAULT_ROLE_MUST_BE_ASSIGNED');
  if (!countries.length) errors.push('COUNTRY_REQUIRED');
  if (errors.length) {
    const error = new HttpsError('invalid-argument', 'La configuración del usuario está incompleta.');
    error.details = { errors };
    throw error;
  }
  const scopes = scopeMap(raw, roles);
  return {
    id: text(advisorId, 160),
    nombre: text(raw.nombre || raw.name || raw.displayName, 180),
    email,
    telefono: text(raw.telefono || raw.phone, 80),
    color: text(raw.color, 24),
    roles,
    rol: defaultRole,
    rolDefault: defaultRole,
    scopeDatos: normalized(raw.scopeDatos || raw.dataScope, 30) || (roles.includes('Asesor') ? 'propios' : 'todos'),
    dataScopes: scopes,
    paises: countries,
    pais: text(raw.paisDefault || raw.pais || countries[0], 8).toUpperCase(),
    paisDefault: text(raw.paisDefault || raw.pais || countries[0], 8).toUpperCase(),
    modulosExtra: moduleList(raw.modulosExtra || raw.modulesExtra),
    modulosRestringidos: moduleList(raw.modulosRestringidos || raw.modulesRestricted),
    modulosOverride: moduleList(raw.modulosOverride || raw.modulesOverride),
    inactivo: inactive,
    activo: !inactive,
    estado: inactive ? 'inactivo' : 'activo'
  };
}

function membershipShape(tenantId, uid, advisor) {
  return {
    schemaVersion: MEMBER_VERSION,
    uid,
    tenantId,
    status: advisor.inactivo ? 'blocked' : 'active',
    roles: advisor.roles,
    defaultRole: advisor.rolDefault,
    activeRole: advisor.rolDefault,
    advisorId: advisor.id,
    countries: advisor.paises,
    dataScopes: advisor.dataScopes,
    modulesExtra: advisor.modulosExtra,
    modulesRestricted: advisor.modulosRestringidos,
    onboardingVersion: ONBOARDING_VERSION
  };
}

async function authorize(request, tenantId, requestedOperation) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(request.auth.uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Membresía administrativa requerida.');
  const member = memberSnap.data() || {};
  if (text(member.tenantId, 160) !== tenantId || !['active', 'activo'].includes(normalized(member.status, 40))) {
    throw new HttpsError('permission-denied', 'La membresía administrativa no está activa.');
  }
  const assigned = rolesFrom(member);
  const activeRole = canonicalRole(request.data && request.data.activeRole || member.activeRole || member.defaultRole || assigned[0]);
  if (!activeRole || !assigned.includes(activeRole)) {
    throw new HttpsError('permission-denied', 'El rol activo no está asignado a la identidad.');
  }
  const permissions = permissionsFrom(member);
  const roleAllowed = MANAGE_ROLES.has(normalized(activeRole, 80).replace(/_/g, ''));
  const permissionAllowed = permissions.some((item) => MANAGE_PERMISSIONS.has(item));
  if (!roleAllowed && !permissionAllowed) {
    throw new HttpsError('permission-denied', 'El rol activo no permite administrar accesos.');
  }
  return {
    uid: request.auth.uid,
    emailHash: sha(normalizeEmail(request.auth.token && request.auth.token.email)),
    tenantId,
    activeRole,
    requestedOperation
  };
}

function advisorRefs(tenantId, advisorId) {
  return [
    {
      source: 'canonical',
      ref: db.collection('tenants').doc(tenantId).collection('data').doc('asesores').collection('items').doc(advisorId)
    },
    {
      source: 'legacy_tenantId',
      ref: db.collection('tenantId').doc(tenantId).collection('asesores').doc(advisorId)
    },
    {
      source: 'legacy_tenants',
      ref: db.collection('tenants').doc(tenantId).collection('asesores').doc(advisorId)
    }
  ];
}

async function locateAdvisor(tenantId, advisorId) {
  const refs = advisorRefs(tenantId, advisorId);
  const snaps = await Promise.all(refs.map((item) => item.ref.get()));
  for (let i = 0; i < snaps.length; i += 1) {
    if (snaps[i].exists) return { ...refs[i], snap: snaps[i], data: snaps[i].data() || {} };
  }
  return { ...refs[0], snap: null, data: {} };
}

async function resolveAuthUser(advisor, currentAdvisor, operation) {
  const boundUid = text(currentAdvisor.authUid || currentAdvisor.uid || currentAdvisor.userId, 160);
  let user = null;
  if (boundUid) {
    try {
      user = await auth.getUser(boundUid);
    } catch (error) {
      if (error && error.code !== 'auth/user-not-found') throw error;
    }
  }
  if (user) {
    const currentEmail = normalizeEmail(user.email);
    if (currentEmail && currentEmail !== advisor.email) {
      throw new HttpsError('failed-precondition', 'El correo configurado no coincide con la identidad vinculada.');
    }
    return { user, created: false };
  }
  try {
    user = await auth.getUserByEmail(advisor.email);
    return { user, created: false };
  } catch (error) {
    if (!error || error.code !== 'auth/user-not-found') throw error;
  }
  if (operation === 'deactivate' || operation === 'mark_invitation_sent') {
    return { user: null, created: false };
  }
  user = await auth.createUser({
    email: advisor.email,
    displayName: advisor.nombre,
    emailVerified: false,
    disabled: false
  });
  return { user, created: true };
}

function publicResult({ operation, advisor, user, authCreated, membershipChanged, state, invitationState, requestId, idempotentReplay }) {
  return {
    ok: true,
    schemaVersion: ONBOARDING_VERSION,
    operation,
    requestId,
    advisorId: advisor.id,
    state,
    invitationState,
    authIdentity: user ? 'linked' : 'not_available',
    authCreated: !!authCreated,
    membershipChanged: !!membershipChanged,
    requiresPasswordSetup: !!(user && !user.emailVerified && operation !== 'deactivate'),
    emailHash: sha(advisor.email),
    uidHash: user ? sha(user.uid) : '',
    idempotentReplay: !!idempotentReplay,
    containsPassword: false,
    containsTemporaryPassword: false,
    containsActionLink: false
  };
}

async function rollbackAuth(authBefore, user, created) {
  if (!user) return;
  try {
    if (created) {
      await auth.deleteUser(user.uid);
      return;
    }
    await auth.updateUser(user.uid, {
      disabled: authBefore.disabled,
      displayName: authBefore.displayName || undefined
    });
  } catch (error) {
    console.error('ORBIT360_ONBOARDING_AUTH_ROLLBACK_FAILED', error && error.code || 'unknown');
  }
}

async function executeProvision(request) {
  const input = request.data || {};
  const tenantId = text(input.tenantId, 160);
  const advisorId = text(input.advisorId, 160);
  const operation = normalized(input.operation || 'provision', 40);
  if (!tenantId) throw new HttpsError('invalid-argument', 'Tenant requerido.');
  if (!VALID_OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación de acceso inválida.');
  const actor = await authorize(request, tenantId, operation);
  const located = await locateAdvisor(tenantId, advisorId);
  const desired = sanitizeAdvisor(input.advisor || located.data || {}, advisorId);
  const reason = text(input.reason, 500);
  if (['sync', 'deactivate', 'reactivate'].includes(operation) && reason.length < 5) {
    throw new HttpsError('invalid-argument', 'El cambio requiere un motivo claro.');
  }
  const previousScopes = scopeMap(located.data || {}, rolesFrom(located.data || {}));
  if (hasAllScope(desired.dataScopes) && !hasAllScope(previousScopes) && input.confirmScopeAll !== true) {
    throw new HttpsError('failed-precondition', 'La apertura de alcance total requiere confirmación reforzada.');
  }
  if (operation === 'mark_invitation_sent') {
    const requestId = text(input.requestId, 160);
    if (!requestId) throw new HttpsError('invalid-argument', 'Solicitud de onboarding requerida.');
    const reqRef = db.collection('tenants').doc(tenantId).collection('onboardingRequests').doc(requestId);
    const auditRef = db.collection('tenants').doc(tenantId).collection('auditEvents').doc();
    await db.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new HttpsError('not-found', 'Solicitud de onboarding no encontrada.');
      const reqData = reqSnap.data() || {};
      if (text(reqData.advisorId, 160) !== advisorId) throw new HttpsError('failed-precondition', 'Solicitud incompatible con el usuario.');
      tx.set(reqRef, {
        state: 'invited',
        invitationState: 'sent',
        invitationSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.set(located.ref, {
        onboardingState: 'invited',
        invitacionEstado: 'enviada',
        invitationSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.set(auditRef, {
        schemaVersion: 'orbit360-access-audit-v1',
        tenantId,
        action: 'team_access.invitation_sent',
        actorUidHash: sha(actor.uid),
        actorEmailHash: actor.emailHash,
        activeRole: actor.activeRole,
        advisorIdHash: sha(advisorId),
        requestId,
        reason: reason || 'Invitación enviada por Firebase Auth',
        createdAt: FieldValue.serverTimestamp(),
        containsPII: false,
        containsSecrets: false
      });
    });
    return publicResult({
      operation,
      advisor: desired,
      user: null,
      authCreated: false,
      membershipChanged: false,
      state: 'invited',
      invitationState: 'sent',
      requestId,
      idempotentReplay: false
    });
  }

  const payloadDigest = digest({ tenantId, advisorId, operation, advisor: desired });
  const requestId = `onb_${sha(`${ONBOARDING_VERSION}|${tenantId}|${advisorId}|${operation}|${payloadDigest}`).slice(0, 32)}`;
  const requestRef = db.collection('tenants').doc(tenantId).collection('onboardingRequests').doc(requestId);
  const existingRequest = await requestRef.get();
  if (existingRequest.exists) {
    const row = existingRequest.data() || {};
    if (row.payloadDigest !== payloadDigest) throw new HttpsError('already-exists', 'La solicitud idempotente tiene otro contenido.');
    if (row.state === 'completed' || row.state === 'invited' || row.state === 'active' || row.state === 'blocked') {
      return {
        ...row.publicResult,
        idempotentReplay: true,
        containsPassword: false,
        containsTemporaryPassword: false,
        containsActionLink: false
      };
    }
  }

  const authResolution = await resolveAuthUser(desired, located.data || {}, operation);
  const user = authResolution.user;
  const authBefore = user ? { disabled: !!user.disabled, displayName: user.displayName || '' } : null;
  const desiredDisabled = operation === 'deactivate' || desired.inactivo;
  let authChanged = false;
  if (user && (user.disabled !== desiredDisabled || text(user.displayName, 180) !== desired.nombre)) {
    await auth.updateUser(user.uid, { disabled: desiredDisabled, displayName: desired.nombre });
    authChanged = true;
  }

  try {
    const memberRef = user ? db.collection('tenants').doc(tenantId).collection('members').doc(user.uid) : null;
    const auditRef = db.collection('tenants').doc(tenantId).collection('auditEvents').doc();
    let membershipChanged = false;
    const finalState = desiredDisabled ? 'blocked' : 'active';
    const invitationState = user && !user.emailVerified && !desiredDisabled ? 'pending_delivery' : (desiredDisabled ? 'blocked' : 'not_required');
    await db.runTransaction(async (tx) => {
      const reqSnap = await tx.get(requestRef);
      if (reqSnap.exists) {
        const reqData = reqSnap.data() || {};
        if (reqData.payloadDigest !== payloadDigest) throw new HttpsError('already-exists', 'La solicitud idempotente tiene otro contenido.');
        if (reqData.state === 'completed' || reqData.state === 'active' || reqData.state === 'blocked') return;
      }
      let currentMembership = null;
      if (memberRef) {
        const memberSnap = await tx.get(memberRef);
        currentMembership = memberSnap.exists ? memberSnap.data() || {} : null;
        if (currentMembership && text(currentMembership.advisorId, 160) && text(currentMembership.advisorId, 160) !== advisorId) {
          throw new HttpsError('failed-precondition', 'La identidad ya está vinculada a otro registro del equipo en este tenant.');
        }
      }
      const membership = user ? membershipShape(tenantId, user.uid, { ...desired, inactivo: desiredDisabled, activo: !desiredDisabled }) : null;
      membershipChanged = !!(membership && digest(currentMembership || {}) !== digest(membership));
      if (memberRef && membership) tx.set(memberRef, {
        ...membership,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByHash: sha(actor.uid),
        updateReason: reason || (authResolution.created ? 'Alta de acceso desde Equipo' : 'Sincronización de acceso desde Equipo')
      }, { merge: true });
      const advisorPatch = {
        ...desired,
        authUid: user ? user.uid : '',
        accessProvisioned: !!user && !desiredDisabled,
        membershipStatus: desiredDisabled ? 'blocked' : (user ? 'active' : 'missing'),
        onboardingState: finalState,
        invitacionEstado: invitationState === 'pending_delivery' ? 'pendiente_envio' : (desiredDisabled ? 'bloqueada' : 'no_requerida'),
        onboardingVersion: ONBOARDING_VERSION,
        lastAccessSyncAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      if (!located.snap) advisorPatch.createdAt = FieldValue.serverTimestamp();
      tx.set(located.ref, advisorPatch, { merge: true });
      const provisionalResult = publicResult({
        operation,
        advisor: desired,
        user,
        authCreated: authResolution.created,
        membershipChanged,
        state: finalState,
        invitationState,
        requestId,
        idempotentReplay: false
      });
      tx.set(requestRef, {
        schemaVersion: ONBOARDING_VERSION,
        tenantId,
        advisorId,
        advisorIdHash: sha(advisorId),
        emailHash: sha(desired.email),
        operation,
        payloadDigest,
        state: finalState,
        invitationState,
        actorUidHash: sha(actor.uid),
        activeRole: actor.activeRole,
        reason: reason || '',
        publicResult: provisionalResult,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        containsPII: false,
        containsSecrets: false
      }, { merge: true });
      tx.set(auditRef, {
        schemaVersion: 'orbit360-access-audit-v1',
        tenantId,
        action: `team_access.${operation}`,
        actorUidHash: sha(actor.uid),
        actorEmailHash: actor.emailHash,
        activeRole: actor.activeRole,
        advisorIdHash: sha(advisorId),
        targetUidHash: user ? sha(user.uid) : '',
        targetEmailHash: sha(desired.email),
        requestId,
        reason: reason || '',
        authCreated: authResolution.created,
        authChanged,
        membershipChanged,
        rollbackAvailable: true,
        createdAt: FieldValue.serverTimestamp(),
        containsPII: false,
        containsSecrets: false
      });
    });
    return publicResult({
      operation,
      advisor: desired,
      user,
      authCreated: authResolution.created,
      membershipChanged,
      state: finalState,
      invitationState,
      requestId,
      idempotentReplay: false
    });
  } catch (error) {
    await rollbackAuth(authBefore || { disabled: false, displayName: '' }, user, authResolution.created);
    throw error;
  }
}

exports.orbit360ProvisionTeamAccess = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 5,
    concurrency: 10
  },
  executeProvision
);

exports._test = {
  normalizeEmail,
  canonicalRole,
  rolesFrom,
  countriesFrom,
  scopeMap,
  sanitizeAdvisor,
  membershipShape,
  digest
};
