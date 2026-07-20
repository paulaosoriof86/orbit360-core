#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const OWNER = 'functions/index.js';
const DIAGNOSTIC = 'tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs';

function source(path) {
  return fs.readFileSync(path, 'utf8');
}

function extractFunctions(text) {
  const cleanStart = text.indexOf('function clean(');
  const stableRefStart = text.indexOf('function stableRef(');
  if (cleanStart < 0 || stableRefStart < 0 || stableRefStart <= cleanStart) {
    throw new Error('ROLE_NORMALIZATION_FUNCTIONS_NOT_FOUND');
  }
  return text.slice(cleanStart, stableRefStart);
}

function evaluate(path) {
  const text = source(path);
  if (text.includes('.map(clean)')) throw new Error(`UNSAFE_MAP_CALLBACK:${path}`);
  if (!text.includes('.map((value) => clean(value))')) throw new Error(`SAFE_MAP_CALLBACK_MISSING:${path}`);

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunctions(text)}\nthis.__test = { unique, rolesFrom, normalize };`, sandbox);
  const api = sandbox.__test;
  const roles = Array.from(api.rolesFrom({
    roles: ['Dirección', 'SuperAdmin', 'AdminTenant', 'Asesor', 'Operativo'],
    role: 'Dirección',
    defaultRole: 'Dirección',
    activeRole: 'Dirección'
  }));
  const expected = ['direccion', 'superadmin', 'admintenant', 'asesor', 'operativo'];
  for (const role of expected) {
    if (!roles.includes(role)) throw new Error(`ROLE_TRUNCATED:${path}:${role}:${roles.join(',')}`);
  }
  const forbiddenPrefixes = ['d', 'di', 'dir', 'dire', 'direc', 'direcc', 's', 'supe', 'ope'];
  for (const prefix of forbiddenPrefixes) {
    if (roles.includes(prefix)) throw new Error(`PREFIX_ROLE_PRESENT:${path}:${prefix}`);
  }
  return roles;
}

const ownerRoles = evaluate(OWNER);
const diagnosticRoles = evaluate(DIAGNOSTIC);
if (JSON.stringify(ownerRoles.slice().sort()) !== JSON.stringify(diagnosticRoles.slice().sort())) {
  throw new Error('OWNER_DIAGNOSTIC_ROLE_NORMALIZATION_DRIFT');
}

console.log(JSON.stringify({
  schemaVersion: 'orbit360-provider-role-normalization-regression-v1',
  owner: OWNER,
  diagnostic: DIAGNOSTIC,
  roles: ownerRoles.slice().sort(),
  unsafeMapCallbackPresent: false,
  ok: true,
  containsPII: false,
  containsSecrets: false
}, null, 2));
