#!/usr/bin/env node
'use strict';

const VIEW_ROLE_CANDIDATES = Object.freeze({
  'Dirección': Object.freeze(['Dirección', 'SuperAdmin']),
  'Operativo': Object.freeze(['Operativo']),
  'Asesor': Object.freeze(['Asesor'])
});

const clean = value => String(value == null ? '' : value).trim();

export function candidatesForView(viewRole) {
  const key = clean(viewRole);
  return [...(VIEW_ROLE_CANDIDATES[key] || [key])];
}

export function resolveCanonicalRoleForView(allowedRoles, viewRole) {
  const allowed = new Set([].concat(allowedRoles || []).map(clean).filter(Boolean));
  return candidatesForView(viewRole).find(role => allowed.has(role)) || '';
}

export function requiredViewsPresent(allowedRoles, requiredViews = ['Dirección', 'Operativo', 'Asesor']) {
  const resolved = {};
  for (const view of requiredViews) {
    const canonicalRole = resolveCanonicalRoleForView(allowedRoles, view);
    if (!canonicalRole) return { ok: false, missing: view, resolved };
    resolved[view] = canonicalRole;
  }
  return { ok: true, missing: '', resolved };
}

export const ROLE_VIEW_CONTRACT_VERSION = 'F2_ROLE_VIEW_CANONICAL_VISUAL_V1';
export const VIEW_ROLE_CANDIDATES_EXPORT = VIEW_ROLE_CANDIDATES;
