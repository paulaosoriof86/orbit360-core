'use strict';

const normalizeRole = value => String(value == null ? '' : value)
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

function unique(values) {
  return Array.from(new Set([].concat(values || []).map(normalizeRole).filter(Boolean)));
}

function explicitAssignedRoles(member) {
  member = member || {};
  return unique([
    ...(Array.isArray(member.roles) ? member.roles : []),
    ...(Array.isArray(member.rolesAsignados) ? member.rolesAsignados : []),
    ...(Array.isArray(member.assignedRoles) ? member.assignedRoles : []),
    ...(Array.isArray(member.rolesDisponibles) ? member.rolesDisponibles : [])
  ]);
}

function resolveProductActiveRole(member, requestedRole) {
  member = member || {};
  const assignedRoles = explicitAssignedRoles(member);
  if (!assignedRoles.length) {
    const error = new Error('PRODUCT_ASSIGNED_ROLES_MISSING');
    error.code = 'PRODUCT_ASSIGNED_ROLES_MISSING';
    throw error;
  }
  const candidate = normalizeRole(
    requestedRole || member.activeRole || member.rolActivo || member.defaultRole || member.rolDefault || member.rol || assignedRoles[0]
  );
  if (!candidate || !assignedRoles.includes(candidate)) {
    const error = new Error('PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED');
    error.code = 'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED';
    throw error;
  }
  return Object.freeze({ activeRole: candidate, assignedRoles: assignedRoles.slice() });
}

module.exports = Object.freeze({ normalizeRole, explicitAssignedRoles, resolveProductActiveRole });
