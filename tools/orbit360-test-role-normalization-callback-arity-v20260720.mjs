#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const CASES = [
  {
    id: 'provider_handler',
    path: 'functions/index.js',
    functions: ['clean', 'normalize', 'unique', 'rolesFrom', 'permissionsFrom'],
    testsPermissions: true
  },
  {
    id: 'provider_diagnostic_v2',
    path: 'tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs',
    functions: ['clean', 'normalize', 'unique', 'rolesFrom'],
    testsPermissions: false
  }
];
const RETIRED_V1 = 'tools/orbit360-diagnose-credential-provider-auth-v20260720.mjs';
const EXPECTED_ROLES = ['admintenant', 'asesor', 'direccion', 'operativo', 'superadmin'];
const INPUT_ROLES = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Asesor', 'Operativo'];
const INPUT_PERMISSIONS = ['credentials_import', 'credentials_view'];

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`FUNCTION_NOT_FOUND:${name}`);
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) throw new Error(`FUNCTION_BODY_NOT_FOUND:${name}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
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
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`FUNCTION_BODY_UNCLOSED:${name}`);
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const results = [];
for (const row of CASES) {
  const source = fs.readFileSync(row.path, 'utf8');
  if (/\.map\(\s*clean\s*\)/.test(source)) throw new Error(`DIRECT_MAP_CLEAN_REMAINS:${row.path}`);
  if (!source.includes('.map((value) => clean(value))')) throw new Error(`SAFE_CLEAN_WRAPPER_MISSING:${row.path}`);

  const definitions = row.functions.map(name => extractFunction(source, name)).join('\n\n');
  const sandbox = { result: null };
  const member = {
    roles: INPUT_ROLES,
    role: 'Dirección',
    defaultRole: 'Dirección',
    activeRole: 'Dirección',
    permisosExtra: INPUT_PERMISSIONS
  };
  const advisor = {
    roles: INPUT_ROLES,
    rol: 'Dirección',
    rolDefault: 'Dirección',
    permissions: INPUT_PERMISSIONS
  };
  const permissionExpression = row.testsPermissions
    ? `result.permissions = unique(permissionsFrom(member).concat(permissionsFrom(advisor))).sort();`
    : `result.permissions = [];`;
  const program = `${definitions}
    const member = ${JSON.stringify(member)};
    const advisor = ${JSON.stringify(advisor)};
    result = {};
    result.memberRoles = Array.from(new Set(rolesFrom(member))).sort();
    result.advisorRoles = Array.from(new Set(rolesFrom(advisor))).sort();
    result.assignedRoles = Array.from(new Set(rolesFrom(member).concat(rolesFrom(advisor)))).sort();
    result.uniqueRaw = unique(${JSON.stringify(INPUT_ROLES)});
    ${permissionExpression}
  `;
  vm.runInNewContext(program, sandbox, { filename: row.path, timeout: 1000 });

  const actual = sandbox.result;
  if (!arraysEqual(actual.memberRoles, EXPECTED_ROLES)) {
    throw new Error(`MEMBER_ROLES_TRUNCATED:${row.id}:${JSON.stringify(actual.memberRoles)}`);
  }
  if (!arraysEqual(actual.advisorRoles, EXPECTED_ROLES)) {
    throw new Error(`ADVISOR_ROLES_TRUNCATED:${row.id}:${JSON.stringify(actual.advisorRoles)}`);
  }
  if (!arraysEqual(actual.assignedRoles, EXPECTED_ROLES)) {
    throw new Error(`ASSIGNED_ROLES_TRUNCATED:${row.id}:${JSON.stringify(actual.assignedRoles)}`);
  }
  if (!arraysEqual(actual.uniqueRaw, INPUT_ROLES)) {
    throw new Error(`UNIQUE_VALUES_TRUNCATED:${row.id}:${JSON.stringify(actual.uniqueRaw)}`);
  }
  if (row.testsPermissions && !arraysEqual(actual.permissions, INPUT_PERMISSIONS)) {
    throw new Error(`PERMISSIONS_TRUNCATED:${row.id}:${JSON.stringify(actual.permissions)}`);
  }
  results.push({
    id: row.id,
    rolesInputCount: INPUT_ROLES.length,
    rolesOutputCount: actual.assignedRoles.length,
    canonicalRolesPreserved: arraysEqual(actual.assignedRoles, EXPECTED_ROLES),
    rawValuesPreserved: arraysEqual(actual.uniqueRaw, INPUT_ROLES),
    permissionsPreserved: row.testsPermissions ? arraysEqual(actual.permissions, INPUT_PERMISSIONS) : true,
    directMapCleanResidual: false
  });
}

if (fs.existsSync(RETIRED_V1)) throw new Error('OBSOLETE_DIAGNOSTIC_V1_STILL_PRESENT');
const diagnosticV2 = fs.readFileSync('tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs', 'utf8');
if (!diagnosticV2.includes("iamReadMethod: 'GET'")) throw new Error('IAM_GET_CONTRACT_MISSING');
if (/getIamPolicy[^\n]*method:\s*'POST'/.test(diagnosticV2)) throw new Error('IAM_POST_METHOD_REINTRODUCED');

const report = {
  schemaVersion: 'orbit360-role-normalization-callback-arity-test-v1',
  classification: 'FUNCTIONAL_DEFECT_CORRECTED',
  defectCode: 'CALLBACK_ARITY_TRUNCATION_IN_ROLE_NORMALIZATION',
  results,
  expectedRoles: EXPECTED_ROLES,
  obsoleteDiagnosticRetired: true,
  iamGetContract: true,
  passed: results.length,
  failed: 0,
  ok: true
};
console.log(JSON.stringify(report, null, 2));
console.log('ORBIT360_ROLE_NORMALIZATION_CALLBACK_ARITY_OK');
