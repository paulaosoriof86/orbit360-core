#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const PRIVATE = process.env.ORBIT360_AUTH_PRIVATE_STATE || '';
const OUT = process.env.ORBIT360_ACTOR_PARITY_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-actor-parity-sanitized-v6-20260805.json';
const PRIVILEGED_ROLES = new Set(['superadmin', 'admintenant']);
const MANAGE_PERMISSIONS = new Set(['equipo_gestionar_acceso','equipo_acceso_administrar','team_access_manage','users_manage']);

const text = (value, max = 500) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const roleNorm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const permissionNorm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const statusNorm = value => text(value, 80).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const list = value => [...new Set([].concat(value || []).map(item => text(item, 160)).filter(Boolean))];
const write = value => { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive:true }); fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n', 'utf8'); };

try {
  if (!PRIVATE || !fs.existsSync(PRIVATE)) throw new Error('PIPELINE_MECHANISM_FAILURE:PRIVATE_CENSUS_STATE_MISSING');
  const state = JSON.parse(fs.readFileSync(PRIVATE, 'utf8'));
  const actor = state.actor || {};
  const member = actor.member || {};
  const roles = list(member.roles || member.rolesAsignados || member.assignedRoles || member.role || member.rol);
  const activeRole = text(actor.activeRole || member.activeRole || member.defaultRole || roles[0], 100);
  const permissions = list(member.permissions || member.permisosExtra || member.extraPermissions || member.extras).map(permissionNorm);
  const status = statusNorm(member.status || member.estado);
  const tenantMatch = text(member.tenantId, 160) === TENANT;
  const statusActive = ['active','activo'].includes(status);
  const activeRoleAssigned = roles.some(role => roleNorm(role) === roleNorm(activeRole));
  const roleAuthorized = PRIVILEGED_ROLES.has(roleNorm(activeRole));
  const permissionAuthorized = permissions.some(permission => MANAGE_PERMISSIONS.has(permission));
  const actorIdentityPresent = !!text(actor.uid, 160) && !!text(actor.email, 320);
  const ok = tenantMatch && statusActive && activeRoleAssigned && (roleAuthorized || permissionAuthorized) && actorIdentityPresent;
  const checks = {
    tenantMatch,
    statusActive,
    activeRoleAssigned,
    roleOrPermissionAuthorized: roleAuthorized || permissionAuthorized,
    actorIdentityPresent
  };
  write({
    schemaVersion:'orbit360-auth-access-actor-parity-sanitized-v6',
    stage:ok?'AUTH_ACCESS_ACTOR_PARITY_PASS':'STOP_RETRY_ACTOR_AUTHORIZATION_PARITY',
    decision:ok?'GO_CALL_ONBOARDING':'STOP_RETRY',
    classification:ok?'AUTHORIZATION_CONTRACT_PARITY':'DATA_CONTRACT_FAILURE',
    actorUidHash:actor.uid ? sha(actor.uid) : '',
    actorEmailHash:actor.email ? sha(String(actor.email).toLowerCase()) : '',
    activeRole,
    authorizationPath:roleAuthorized?'privileged_role':(permissionAuthorized?'explicit_permission':'none'),
    checks,
    firestoreReads:0,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    containsPII:false,
    containsSecrets:false,
    ok
  });
  if (!ok) process.exitCode = 41;
} catch (error) {
  write({
    schemaVersion:'orbit360-auth-access-actor-parity-sanitized-v6',
    stage:'STOP_RETRY_ACTOR_AUTHORIZATION_PARITY',
    decision:'STOP_RETRY',
    classification:String(error?.message || error).startsWith('DATA_CONTRACT_FAILURE') ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE',
    errorCode:text(String(error?.message || error).split(':')[1] || 'ACTOR_PARITY_PRECHECK_FAILED', 180),
    firestoreReads:0,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    containsPII:false,
    containsSecrets:false,
    ok:false
  });
  process.exitCode = 41;
}
