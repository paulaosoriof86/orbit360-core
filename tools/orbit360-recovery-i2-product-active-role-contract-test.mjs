#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const { explicitAssignedRoles, resolveProductActiveRole } = require(path.join(root, 'functions', 'product-active-role-contract.js'));

function pass(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}
function fail(name, code, fn) {
  try {
    fn();
    throw new Error(`${name}: expected ${code}`);
  } catch (error) {
    if (error && error.code === code) {
      console.log(`PASS ${name} -> ${code}`);
      return;
    }
    throw error;
  }
}
function contains(file, pattern, code) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (!pattern.test(text)) throw new Error(code || `${file}: pattern missing`);
}

pass('explicit-assigned-only', () => {
  const roles = explicitAssignedRoles({ roles:['Asesor'], activeRole:'SuperAdmin', defaultRole:'Admin' });
  if (JSON.stringify(roles) !== JSON.stringify(['asesor'])) throw new Error(`unexpected assigned roles: ${roles}`);
});

pass('requested-assigned-role', () => {
  const out = resolveProductActiveRole({ roles:['Asesor','Operativo'], activeRole:'Asesor' }, 'Operativo');
  if (out.activeRole !== 'operativo') throw new Error('assigned requested role not resolved');
});

pass('assigned-active-fallback', () => {
  const out = resolveProductActiveRole({ roles:['Asesor','Operativo'], activeRole:'Operativo' });
  if (out.activeRole !== 'operativo') throw new Error('assigned active role not resolved');
});

pass('assigned-default-fallback', () => {
  const out = resolveProductActiveRole({ roles:['Asesor','Operativo'], defaultRole:'Operativo' });
  if (out.activeRole !== 'operativo') throw new Error('assigned default role not resolved');
});

fail('drifted-active-not-assigned', 'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED', () =>
  resolveProductActiveRole({ roles:['Asesor'], activeRole:'SuperAdmin' })
);
fail('drifted-default-not-assigned', 'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED', () =>
  resolveProductActiveRole({ roles:['Asesor'], defaultRole:'Admin' })
);
fail('forged-requested-role-not-assigned', 'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED', () =>
  resolveProductActiveRole({ roles:['Asesor'], activeRole:'Asesor' }, 'SuperAdmin')
);
fail('no-explicit-assigned-roles', 'PRODUCT_ASSIGNED_ROLES_MISSING', () =>
  resolveProductActiveRole({ activeRole:'SuperAdmin', defaultRole:'SuperAdmin' })
);

pass('server-owners-use-shared-role-contract', () => {
  [
    'functions/product-operational-domain.js',
    'functions/product-ops-leads-domain.js',
    'functions/product-insurer-credentials.js',
    'functions/cobros-reconciliation-domain.js'
  ].forEach(file => contains(file, /resolveProductActiveRole/, `${file}: role contract missing`));
});

pass('clients-propagate-active-role', () => {
  contains('orbit360-platform/core/ops-leads-domain-client.js', /activeRole:activeRole\(\)/, 'Ops/Leads client activeRole missing');
  contains('orbit360-platform/core/cobros-reconciliation-domain-client.js', /activeRole:activeRole\(\)/, 'Cobros client activeRole missing');
  contains('orbit360-platform/data/store-firestore-product-operational-p0.js', /WORKFLOW_COMMAND,\{tenantId:m\.tenantId,activeRole:m\.activeRole,/, 'Operational facade activeRole missing');
});

console.log('PRODUCT_ACTIVE_ROLE_SERVER_CONTRACT_PASS');
