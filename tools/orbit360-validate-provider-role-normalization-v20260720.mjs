#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const OWNER = 'functions/index.js';
const DIAGNOSTIC = 'tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs';
const REQUIRED_FUNCTIONS = ['clean', 'normalize', 'unique', 'rolesFrom'];
const INPUT_ROLES = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Asesor', 'Operativo'];
const EXPECTED_ROLES = ['admintenant', 'asesor', 'direccion', 'operativo', 'superadmin'];

function source(path) {
  return fs.readFileSync(path, 'utf8');
}

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`ROLE_NORMALIZATION_FUNCTION_NOT_FOUND:${name}`);
  const braceStart = text.indexOf('{', start);
  if (braceStart < 0) throw new Error(`ROLE_NORMALIZATION_FUNCTION_BODY_NOT_FOUND:${name}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = braceStart; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error(`ROLE_NORMALIZATION_FUNCTION_BODY_UNCLOSED:${name}`);
}

function evaluate(path) {
  const text = source(path);
  if (/\.map\(\s*clean\s*\)/.test(text)) throw new Error(`UNSAFE_MAP_CALLBACK:${path}`);
  if (!text.includes('.map((value) => clean(value))')) throw new Error(`SAFE_MAP_CALLBACK_MISSING:${path}`);

  const definitions = REQUIRED_FUNCTIONS.map(name => extractFunction(text, name)).join('\n\n');
  const sandbox = { result: null };
  vm.createContext(sandbox);
  vm.runInContext(`${definitions}
    result = Array.from(new Set(rolesFrom({
      roles: ${JSON.stringify(INPUT_ROLES)},
      role: 'Dirección',
      defaultRole: 'Dirección',
      activeRole: 'Dirección'
    }))).sort();
  `, sandbox, { filename: path, timeout: 1000 });

  const roles = Array.from(sandbox.result || []);
  for (const role of EXPECTED_ROLES) {
    if (!roles.includes(role)) throw new Error(`ROLE_TRUNCATED:${path}:${role}:${roles.join(',')}`);
  }
  const forbiddenPrefixes = ['d', 'di', 'dir', 'dire', 'direc', 'direcc', 's', 'supe', 'ope'];
  for (const prefix of forbiddenPrefixes) {
    if (roles.includes(prefix)) throw new Error(`PREFIX_ROLE_PRESENT:${path}:${prefix}`);
  }
  if (roles.length !== EXPECTED_ROLES.length) {
    throw new Error(`ROLE_SET_DRIFT:${path}:${roles.join(',')}`);
  }
  return roles;
}

const ownerRoles = evaluate(OWNER);
const diagnosticRoles = evaluate(DIAGNOSTIC);
if (JSON.stringify(ownerRoles) !== JSON.stringify(diagnosticRoles)) {
  throw new Error('OWNER_DIAGNOSTIC_ROLE_NORMALIZATION_DRIFT');
}

console.log(JSON.stringify({
  schemaVersion: 'orbit360-provider-role-normalization-regression-v2',
  owner: OWNER,
  diagnostic: DIAGNOSTIC,
  roles: ownerRoles,
  inputCount: INPUT_ROLES.length,
  outputCount: ownerRoles.length,
  unsafeMapCallbackPresent: false,
  ok: true,
  containsPII: false,
  containsSecrets: false
}, null, 2));
console.log('ORBIT360_PROVIDER_ROLE_NORMALIZATION_OK');
