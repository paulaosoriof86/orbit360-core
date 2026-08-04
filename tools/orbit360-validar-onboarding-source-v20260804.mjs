#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';

const ROOT = process.cwd();
const files = {
  backend: path.join(ROOT, 'functions/user-onboarding.js'),
  bootstrap: path.join(ROOT, 'functions/bootstrap.js'),
  package: path.join(ROOT, 'functions/package.json'),
  frontend: path.join(ROOT, 'orbit360-platform/core/user-onboarding.js'),
  bridge: path.join(ROOT, 'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js'),
  init: path.join(ROOT, 'orbit360-platform/core/backend-lab-init.js')
};
const read = key => fs.readFileSync(files[key], 'utf8');
const checks = {};
const add = (name, value) => { checks[name] = Boolean(value); };

for (const [key, file] of Object.entries(files)) add(`file_${key}`, fs.existsSync(file) && fs.statSync(file).size > 0);
const backend = read('backend');
const bootstrap = read('bootstrap');
const packageJson = JSON.parse(read('package'));
const frontend = read('frontend');
const bridge = read('bridge');
const init = read('init');

add('backend_callable_export', /exports\.orbit360ProvisionTeamAccess\s*=\s*onCall/.test(backend));
add('backend_admin_sdk', /getAuth/.test(backend) && /getFirestore/.test(backend));
add('backend_generic_tenant', /const tenantId = text\(input\.tenantId/.test(backend) && !/const TENANT_ID\s*=/.test(backend));
add('backend_no_person_names', !/(Paula|Carlos Castro|Samuel Daza)/i.test(backend));
add('backend_no_email_literal', !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(backend));
add('backend_membership_fields', ['roles','defaultRole','activeRole','advisorId','countries','dataScopes','modulesExtra','modulesRestricted'].every(field => backend.includes(field)));
add('backend_operations', ['provision','sync','deactivate','reactivate','mark_invitation_sent'].every(op => backend.includes(`'${op}'`)));
add('backend_idempotency', /payloadDigest/.test(backend) && /requestId/.test(backend) && /idempotentReplay/.test(backend));
add('backend_transaction', /runTransaction/.test(backend));
add('backend_auth_compensation', /rollbackAuth/.test(backend) && /deleteUser/.test(backend));
add('backend_no_password_generation', !/(generatePassword|temporaryPassword\s*=|tempPassword\s*=|password\s*:\s*['"`])/i.test(backend));
add('backend_no_action_link', /containsActionLink:\s*false/.test(backend) && !/generatePasswordResetLink/.test(backend));
add('backend_scope_confirmation', /confirmScopeAll/.test(backend) && /apertura de alcance total/i.test(backend));
add('backend_audit', /auditEvents/.test(backend) && /team_access\./.test(backend));
add('bootstrap_order', bootstrap.indexOf("require('./user-onboarding')") < bootstrap.indexOf("require('./index')"));
add('package_check_includes_backend', String(packageJson.scripts?.check || '').includes('node --check user-onboarding.js'));
add('frontend_protected_call', /Authorization|authorization/.test(frontend) && /getIdToken/.test(frontend));
add('frontend_secure_invitation', /sendPasswordResetEmail/.test(frontend));
add('frontend_no_password_ui', !/(temporary password|contraseña temporal).*(input|return|value)/i.test(frontend));
add('bridge_integrates_equipo', /Orbit\.modules\.equipo/.test(bridge) && /originalRender/.test(bridge) && /originalEdit/.test(bridge));
add('bridge_reinforced_all_scope', /CONFIRMAR TODOS/.test(bridge));
add('bridge_honest_states', ['Pendiente','Habilitando','Invitado','Activo','Bloqueado'].every(label => frontend.includes(label)));
add('init_loads_core', /core\/user-onboarding\.js/.test(init));
add('init_loads_bridge_after_window_load', /window\.addEventListener\('load', mountBridge/.test(init) && /equipo-onboarding-v20260804-bridge\.js/.test(init));

const originalLoad = Module._load;
class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } }
const fakeDb = { collection(){ return { doc(){ return { collection(){ return { doc(){ return {}; } }; } }; } }; } };
Module._load = function(request, parent, isMain) {
  if (request === 'firebase-admin/app') return { getApps: () => [{}], initializeApp: () => ({}) };
  if (request === 'firebase-admin/auth') return { getAuth: () => ({}) };
  if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => 'ts' }, getFirestore: () => fakeDb };
  if (request === 'firebase-functions/v2/https') return { HttpsError, onCall: (options, handler) => ({ options, handler }) };
  return originalLoad(request, parent, isMain);
};
try {
  const backendModule = await import(`file://${files.backend}?v=${Date.now()}`);
  const test = backendModule.default?._test || backendModule._test;
  add('synthetic_test_exports', !!test);
  if (test) {
    add('synthetic_email_normalization', test.normalizeEmail(' User@Example.COM ') === 'user@example.com');
    add('synthetic_role_mapping', test.canonicalRole('Dirección') === 'SuperAdmin' && test.canonicalRole('Operativo') === 'Operativo');
    const advisor = test.sanitizeAdvisor({ nombre:'Persona Prueba', email:'test@example.com', roles:['Asesor','Operativo'], rolDefault:'Asesor', paises:['GT'], scopeDatos:'propios' }, 'ase-test');
    const member = test.membershipShape('tenant-test', 'uid-test', advisor);
    add('synthetic_membership_shape', member.tenantId === 'tenant-test' && member.advisorId === 'ase-test' && member.roles.includes('Asesor') && member.dataScopes.clientes === 'propios');
  }
} finally {
  Module._load = originalLoad;
}

const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const result = {
  schemaVersion: 'orbit360-onboarding-source-validator-v1',
  classification: failed.length ? 'DATA_CONTRACT_FAILURE' : 'GO_GENERIC_ONBOARDING_SOURCE_ONLY',
  sourceOnly: true,
  cloudCalls: 0,
  firestoreReads: 0,
  firestoreWrites: 0,
  authReads: 0,
  authWrites: 0,
  deployExecuted: false,
  rulesChanged: false,
  productionTouched: false,
  checks,
  passed: Object.keys(checks).length - failed.length,
  failed: failed.length,
  failedChecks: failed,
  ok: failed.length === 0
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(41);
