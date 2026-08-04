#!/usr/bin/env node
'use strict';

import crypto from 'node:crypto';

export const ONBOARDING_SCHEMA = 'orbit360-user-access-onboarding-v1';
export const ONBOARDING_STATES = Object.freeze([
  'pending',
  'provisioning',
  'invited',
  'active',
  'blocked',
  'error'
]);
export const RECONCILIATION_ACTIONS = Object.freeze([
  'link',
  'create_access',
  'update_membership',
  'skip',
  'requires_validation'
]);

const text = value => String(value == null ? '' : value).trim();
const clean = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const unique = values => [...new Set((Array.isArray(values) ? values : [values]).map(text).filter(Boolean))];
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');

export function normalizeEmail(value) {
  const email = clean(value).replace(/\s+/g, '');
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

export function canonicalRole(value) {
  const role = clean(value).replace(/[^a-z0-9]+/g, '');
  if (['direccion', 'director', 'directora', 'superadmin', 'superadministrator'].includes(role)) return 'SuperAdmin';
  if (['admin', 'administracion', 'admintenant', 'administrador'].includes(role)) return 'AdminTenant';
  if (['operativo', 'operaciones'].includes(role)) return 'Operativo';
  if (['asesor', 'advisor', 'comercial', 'vendedor'].includes(role)) return 'Asesor';
  if (['finanzas', 'finance'].includes(role)) return 'Finanzas';
  if (['marketing', 'mercadeo'].includes(role)) return 'Marketing';
  if (['asistente', 'assistant'].includes(role)) return 'Asistente';
  return text(value);
}

export function rolesFrom(record = {}) {
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

export function countriesFrom(record = {}) {
  return unique([
    ...(Array.isArray(record.countries) ? record.countries : []),
    ...(Array.isArray(record.paises) ? record.paises : []),
    record.country,
    record.pais,
    record.countryDefault,
    record.paisDefault
  ].filter(Boolean).map(value => text(value).toUpperCase()));
}

export function dataScopesFrom(record = {}, roles = rolesFrom(record)) {
  if (record.dataScopes && typeof record.dataScopes === 'object' && !Array.isArray(record.dataScopes)) {
    return { ...record.dataScopes };
  }
  const scope = text(record.scopeDatos || record.dataScope || '').toLowerCase();
  if (scope === 'ninguno') return { clientes: 'ninguno', polizas: 'ninguno', cobros: 'ninguno' };
  if (scope === 'propios') return { clientes: 'propios', polizas: 'propios', cobros: roles.includes('Asesor') ? 'propios' : 'ninguno' };
  if (scope === 'equipo') return { clientes: 'equipo', polizas: 'equipo', cobros: roles.includes('Operativo') ? 'equipo' : 'ninguno' };
  if (scope === 'todos') return { clientes: 'todos', polizas: 'todos', cobros: roles.includes('Operativo') || roles.includes('SuperAdmin') || roles.includes('AdminTenant') ? 'todos' : 'ninguno' };
  if (roles.includes('SuperAdmin') || roles.includes('AdminTenant')) return { clientes: 'todos', polizas: 'todos', cobros: 'todos' };
  if (roles.includes('Operativo')) return { clientes: 'todos', polizas: 'todos', cobros: 'todos' };
  if (roles.includes('Asesor')) return { clientes: 'propios', polizas: 'propios', cobros: 'ninguno' };
  return {};
}

export function buildMembership({ tenantId, advisorId, uid = '', advisor = {}, status = 'active' } = {}) {
  const roles = rolesFrom(advisor);
  const defaultRoleCandidate = canonicalRole(advisor.defaultRole || advisor.rolDefault || advisor.activeRole || advisor.rol || roles[0]);
  const defaultRole = roles.includes(defaultRoleCandidate) ? defaultRoleCandidate : roles[0] || '';
  const countries = countriesFrom(advisor);
  return {
    schemaVersion: 'orbit360-tenant-membership-v2',
    uid: text(uid),
    tenantId: text(tenantId),
    status: text(status) || 'active',
    roles,
    defaultRole,
    activeRole: defaultRole,
    advisorId: text(advisorId),
    countries,
    dataScopes: dataScopesFrom(advisor, roles),
    modulesExtra: unique(advisor.modulesExtra || advisor.modulosExtra || []),
    modulesRestricted: unique(advisor.modulesRestricted || advisor.modulosRestringidos || []),
    onboardingVersion: ONBOARDING_SCHEMA
  };
}

export function validateAdvisorForAccess({ tenantId, advisorId, advisor = {} } = {}) {
  const errors = [];
  const email = normalizeEmail(advisor.email || advisor.correo || advisor.userEmail);
  const roles = rolesFrom(advisor);
  const countries = countriesFrom(advisor);
  if (!text(tenantId)) errors.push('TENANT_REQUIRED');
  if (!text(advisorId)) errors.push('ADVISOR_ID_REQUIRED');
  if (!email) errors.push('VALID_EMAIL_REQUIRED');
  if (!roles.length) errors.push('ROLE_REQUIRED');
  const defaultRole = canonicalRole(advisor.defaultRole || advisor.rolDefault || advisor.activeRole || advisor.rol || roles[0]);
  if (!defaultRole || !roles.includes(defaultRole)) errors.push('DEFAULT_ROLE_MUST_BE_ASSIGNED');
  if (!countries.length) errors.push('COUNTRY_REQUIRED');
  if (advisor.inactivo === true || advisor.activo === false || clean(advisor.estado) === 'inactivo') errors.push('ADVISOR_INACTIVE');
  return { ok: errors.length === 0, errors, email, roles, countries, defaultRole };
}

export function onboardingRequestId({ tenantId, advisorId, email } = {}) {
  return `onb_${sha(`${text(tenantId)}|${text(advisorId)}|${normalizeEmail(email)}`).slice(0, 32)}`;
}

export function buildOnboardingRequest({ tenantId, advisorId, advisor = {}, actor = {}, reason = '' } = {}) {
  const validation = validateAdvisorForAccess({ tenantId, advisorId, advisor });
  if (!validation.ok) {
    const error = new Error(`ONBOARDING_REQUEST_INVALID:${validation.errors.join(',')}`);
    error.code = 'ONBOARDING_REQUEST_INVALID';
    error.details = validation.errors;
    throw error;
  }
  const membership = buildMembership({ tenantId, advisorId, advisor, status: 'active' });
  return {
    schemaVersion: ONBOARDING_SCHEMA,
    requestId: onboardingRequestId({ tenantId, advisorId, email: validation.email }),
    tenantId: text(tenantId),
    advisorId: text(advisorId),
    email: validation.email,
    requestedOperation: 'create_or_link',
    desiredMembership: membership,
    invitationMode: 'secure_password_setup',
    state: 'pending',
    reason: text(reason),
    actor: {
      uid: text(actor.uid),
      activeRole: canonicalRole(actor.activeRole || actor.rol),
      tenantId: text(actor.tenantId)
    },
    idempotencyKey: sha(`${ONBOARDING_SCHEMA}|${text(tenantId)}|${text(advisorId)}|${validation.email}|${JSON.stringify(membership)}`),
    containsPassword: false,
    containsTemporaryPassword: false
  };
}

export function comparableMembership(value = {}) {
  return {
    tenantId: text(value.tenantId),
    status: text(value.status).toLowerCase(),
    roles: unique(value.roles || []).map(canonicalRole).sort(),
    defaultRole: canonicalRole(value.defaultRole || value.rolDefault),
    activeRole: canonicalRole(value.activeRole || value.defaultRole || value.rolDefault),
    advisorId: text(value.advisorId || value.asesorId),
    countries: unique(value.countries || value.paises || []).map(x => text(x).toUpperCase()).sort(),
    dataScopes: value.dataScopes && typeof value.dataScopes === 'object' ? value.dataScopes : {},
    modulesExtra: unique(value.modulesExtra || value.modulosExtra || []).sort(),
    modulesRestricted: unique(value.modulesRestricted || value.modulosRestringidos || []).sort()
  };
}

export function sameMembership(current, desired) {
  return JSON.stringify(comparableMembership(current)) === JSON.stringify(comparableMembership(desired));
}

export function classifyLegacyRecord({ advisor, advisorId, tenantId, authUsers = [], membership = null } = {}) {
  const validation = validateAdvisorForAccess({ advisor, advisorId, tenantId });
  if (!validation.ok) return { action: 'requires_validation', reasons: validation.errors };
  const matches = authUsers.filter(user => normalizeEmail(user.email) === validation.email);
  if (matches.length > 1) return { action: 'requires_validation', reasons: ['AUTH_EMAIL_AMBIGUOUS'] };
  if (!matches.length) return { action: 'create_access', reasons: ['AUTH_IDENTITY_MISSING'] };
  const authUser = matches[0];
  const desired = buildMembership({ tenantId, advisorId, uid: authUser.uid, advisor, status: 'active' });
  if (!membership) return { action: 'link', reasons: ['MEMBERSHIP_MISSING'], authUser, desiredMembership: desired };
  if (!sameMembership(membership, desired)) return { action: 'update_membership', reasons: ['MEMBERSHIP_DIFF'], authUser, desiredMembership: desired };
  return { action: 'skip', reasons: ['ACCESS_ALREADY_CANONICAL'], authUser, desiredMembership: desired };
}
