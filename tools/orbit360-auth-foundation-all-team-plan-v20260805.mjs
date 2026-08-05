#!/usr/bin/env node
'use strict';

import crypto from 'node:crypto';

const VALID_SCOPES = new Set(['propios', 'equipo', 'todos', 'ninguno']);
const PRIVILEGED_ROLES = new Set(['SuperAdmin', 'AdminTenant']);
const ROLE_ALIASES = new Map([
  ['direccion', 'SuperAdmin'], ['directora', 'SuperAdmin'], ['director', 'SuperAdmin'], ['superadmin', 'SuperAdmin'],
  ['admin', 'AdminTenant'], ['administracion', 'AdminTenant'], ['administrador', 'AdminTenant'], ['admintenant', 'AdminTenant'],
  ['operativo', 'Operativo'], ['operaciones', 'Operativo'],
  ['asesor', 'Asesor'], ['asesora', 'Asesor'], ['advisor', 'Asesor'], ['vendedor', 'Asesor'],
  ['finanzas', 'Finanzas'], ['marketing', 'Marketing'], ['asistente', 'Asistente']
]);

const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];

function canonicalRole(value) {
  const key = normalized(value).replace(/_/g, '');
  return ROLE_ALIASES.get(key) || text(value);
}

function rolesFrom(record = {}) {
  return unique([
    ...(Array.isArray(record.roles) ? record.roles : []),
    ...(Array.isArray(record.rolesAsignados) ? record.rolesAsignados : []),
    record.role,
    record.rol,
    record.defaultRole,
    record.rolDefault,
    record.activeRole
  ].filter(Boolean).map(canonicalRole));
}

function countriesFrom(record = {}) {
  return unique([
    ...(Array.isArray(record.countries) ? record.countries : []),
    ...(Array.isArray(record.paises) ? record.paises : []),
    record.country,
    record.pais,
    record.countryDefault,
    record.paisDefault
  ].filter(Boolean).map(value => text(value).toUpperCase()));
}

function scopesFrom(record = {}, roles = rolesFrom(record)) {
  const explicit = record.dataScopes;
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const out = {};
    for (const [domain, value] of Object.entries(explicit)) {
      const scope = normalized(value);
      if (VALID_SCOPES.has(scope)) out[normalized(domain)] = scope;
    }
    if (Object.keys(out).length) return out;
  }
  let scope = normalized(record.scopeDatos || record.dataScope);
  if (!VALID_SCOPES.has(scope)) {
    if (roles.some(role => ['SuperAdmin', 'AdminTenant', 'Operativo'].includes(role))) scope = 'todos';
    else if (roles.includes('Asesor')) scope = 'propios';
    else scope = 'ninguno';
  }
  return Object.fromEntries(['clientes', 'polizas', 'vehiculos', 'recibos', 'cartera', 'cobros', 'comisiones', 'gestiones', 'leads'].map(domain => [domain, scope]));
}

function active(record = {}) {
  return !(record.inactivo === true || record.activo === false || normalized(record.estado) === 'inactivo');
}

function normalizeTeamRecord(record = {}) {
  const id = text(record.id || record.advisorId || record.asesorId || record.uid);
  const email = text(record.email || record.correo || record.userEmail).toLowerCase().replace(/\s+/g, '');
  const roles = rolesFrom(record);
  const defaultRoleCandidate = canonicalRole(record.defaultRole || record.rolDefault || record.activeRole || record.rol || roles[0]);
  const defaultRole = roles.includes(defaultRoleCandidate) ? defaultRoleCandidate : '';
  const activeRoleCandidate = canonicalRole(record.activeRole || defaultRole);
  const activeRole = roles.includes(activeRoleCandidate) ? activeRoleCandidate : '';
  const countries = countriesFrom(record);
  const dataScopes = scopesFrom(record, roles);
  return {
    id,
    displayName: text(record.nombre || record.name || record.displayName),
    email,
    roles,
    defaultRole,
    activeRole,
    countries,
    dataScopes,
    currentAuthUid: text(record.authUid || record.uid || record.userId),
    active: active(record)
  };
}

function validateTeamRecord(record) {
  const errors = [];
  if (!record.id) errors.push('TEAM_ID_REQUIRED');
  if (!record.displayName) errors.push('DISPLAY_NAME_REQUIRED');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(record.email)) errors.push('VALID_EMAIL_REQUIRED');
  if (!record.roles.length) errors.push('ROLE_REQUIRED');
  if (!record.defaultRole || !record.roles.includes(record.defaultRole)) errors.push('DEFAULT_ROLE_MUST_BE_ASSIGNED');
  if (!record.activeRole || !record.roles.includes(record.activeRole)) errors.push('ACTIVE_ROLE_MUST_BE_ASSIGNED');
  if (!record.countries.length) errors.push('COUNTRY_REQUIRED');
  if (!Object.keys(record.dataScopes || {}).length) errors.push('DATA_SCOPES_REQUIRED');
  if (Object.values(record.dataScopes || {}).some(scope => !VALID_SCOPES.has(scope))) errors.push('DATA_SCOPE_INVALID');
  return errors;
}

function authIndex(authUsers = []) {
  const byEmail = new Map();
  const byUid = new Map();
  for (const user of authUsers) {
    const uid = text(user.uid);
    const email = text(user.email).toLowerCase();
    if (uid) byUid.set(uid, user);
    if (email) {
      const rows = byEmail.get(email) || [];
      rows.push(user);
      byEmail.set(email, rows);
    }
  }
  return { byEmail, byUid };
}

function membershipIndex(memberships = []) {
  return new Map(memberships.map(row => [text(row.uid || row.id), row]));
}

function desiredMembership(tenantId, record, uid) {
  return {
    uid,
    tenantId,
    status: 'active',
    roles: record.roles,
    defaultRole: record.defaultRole,
    activeRole: record.activeRole,
    advisorId: record.id,
    countries: record.countries,
    dataScopes: record.dataScopes,
    onboardingVersion: 'orbit360-auth-foundation-all-team-v1'
  };
}

function actionFor(record, indexes, tenantId) {
  const direct = record.currentAuthUid ? indexes.byUid.get(record.currentAuthUid) : null;
  const emailMatches = indexes.byEmail.get(record.email) || [];
  if (emailMatches.length > 1) return { status: 'blocked', errorCode: 'AUTH_EMAIL_AMBIGUOUS' };
  const user = direct || emailMatches[0] || null;
  if (direct && emailMatches[0] && direct.uid !== emailMatches[0].uid) return { status: 'blocked', errorCode: 'AUTH_UID_EMAIL_COLLISION' };
  const uid = text(user && user.uid);
  const membership = uid ? indexes.memberships.get(uid) || null : null;
  return {
    status: 'ready',
    operation: user ? 'link_existing_identity' : 'create_missing_identity',
    membershipOperation: membership ? 'reconcile_membership' : 'create_membership',
    passwordOperation: user && user.emailVerified ? 'send_password_recovery' : 'send_password_setup',
    uid,
    desiredMembership: uid ? desiredMembership(tenantId, record, uid) : null,
    public: {
      teamIdHash: sha(record.id),
      emailHash: sha(record.email),
      existingIdentity: Boolean(user),
      existingMembership: Boolean(membership),
      roleCount: record.roles.length,
      countryCount: record.countries.length,
      scopeCount: Object.keys(record.dataScopes).length
    }
  };
}

export function buildFoundationPlan({ tenantId, teamRecords, authUsers = [], memberships = [], expectedActiveCount = 7 }) {
  tenantId = text(tenantId);
  if (!tenantId) return { ok: false, classification: 'DATA_CONTRACT_FAILURE', errorCode: 'TENANT_REQUIRED' };
  const normalizedRows = (Array.isArray(teamRecords) ? teamRecords : []).map(normalizeTeamRecord).filter(row => row.active);
  const errors = [];
  if (normalizedRows.length !== expectedActiveCount) errors.push(`ACTIVE_TEAM_COUNT_EXPECTED_${expectedActiveCount}_FOUND_${normalizedRows.length}`);
  const ids = normalizedRows.map(row => row.id);
  const emails = normalizedRows.map(row => row.email);
  if (new Set(ids).size !== ids.length) errors.push('TEAM_ID_DUPLICATE');
  if (new Set(emails).size !== emails.length) errors.push('TEAM_EMAIL_DUPLICATE');
  const perRecord = normalizedRows.map(record => ({ record, errors: validateTeamRecord(record) }));
  for (const item of perRecord) for (const code of item.errors) errors.push(`${sha(item.record.id).slice(0, 12)}:${code}`);
  const admins = normalizedRows.filter(record => record.roles.some(role => PRIVILEGED_ROLES.has(role)));
  if (!admins.length) errors.push('BOOTSTRAP_ADMIN_REQUIRED');
  if (errors.length) {
    return {
      ok: false,
      classification: 'DATA_CONTRACT_FAILURE',
      errorCode: 'TEAM_ROSTER_NOT_READY',
      errors,
      activeTeamCount: normalizedRows.length,
      expectedActiveCount,
      functionalProfilesCovered: 0,
      allCurrentUsersCovered: false,
      futureUserPathSupported: true,
      containsPII: false
    };
  }
  const indexes = authIndex(authUsers);
  indexes.memberships = membershipIndex(memberships);
  const actions = normalizedRows.map(record => ({ record, action: actionFor(record, indexes, tenantId) }));
  const blocked = actions.filter(item => item.action.status !== 'ready');
  if (blocked.length) {
    return {
      ok: false,
      classification: 'DATA_CONTRACT_FAILURE',
      errorCode: blocked[0].action.errorCode,
      activeTeamCount: normalizedRows.length,
      expectedActiveCount,
      blockedCount: blocked.length,
      containsPII: false
    };
  }
  const roleProfiles = new Set();
  if (normalizedRows.some(row => row.roles.some(role => PRIVILEGED_ROLES.has(role)))) roleProfiles.add('direccion');
  if (normalizedRows.some(row => row.roles.includes('Operativo'))) roleProfiles.add('operativo');
  if (normalizedRows.some(row => row.roles.includes('Asesor'))) roleProfiles.add('asesor');
  const bootstrapAdmin = admins.sort((a, b) => a.id.localeCompare(b.id))[0];
  return {
    ok: roleProfiles.size === 3,
    classification: roleProfiles.size === 3 ? 'GO_AUTH_FOUNDATION_ALL_TEAM' : 'DATA_CONTRACT_FAILURE',
    errorCode: roleProfiles.size === 3 ? '' : 'FUNCTIONAL_ROLE_COVERAGE_INCOMPLETE',
    tenantIdHash: sha(tenantId),
    activeTeamCount: normalizedRows.length,
    expectedActiveCount,
    allCurrentUsersCovered: normalizedRows.length === expectedActiveCount,
    functionalProfilesCovered: roleProfiles.size,
    functionalProfiles: [...roleProfiles].sort(),
    bootstrapAdmin: { teamIdHash: sha(bootstrapAdmin.id), emailHash: sha(bootstrapAdmin.email) },
    actions: actions.map(({ action }) => action.public),
    createsPlanned: actions.filter(item => item.action.operation === 'create_missing_identity').length,
    linksPlanned: actions.filter(item => item.action.operation === 'link_existing_identity').length,
    membershipsPlanned: actions.length,
    passwordEmailsPlanned: actions.length,
    futureUserPathSupported: true,
    genericOwnerUsesNames: false,
    containsPII: false
  };
}

export function validateFutureUserPath({ tenantId, record }) {
  const normalizedRecord = normalizeTeamRecord(record);
  const errors = validateTeamRecord(normalizedRecord);
  return {
    ok: Boolean(text(tenantId)) && errors.length === 0,
    errorCode: errors[0] || (!text(tenantId) ? 'TENANT_REQUIRED' : ''),
    operation: errors.length ? 'blocked' : 'normal_onboarding_callable_after_bootstrap',
    requiresExistingAdminMembership: true,
    containsPII: false
  };
}

export const _test = { canonicalRole, rolesFrom, countriesFrom, scopesFrom, normalizeTeamRecord, validateTeamRecord, desiredMembership, sha };
