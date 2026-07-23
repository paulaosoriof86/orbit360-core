#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readRepo = rel => fs.readFileSync(path.join(repo, rel), 'utf8');
const jsonRepo = rel => JSON.parse(readRepo(rel));
const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: !!ok, detail: detail || '' });

const policy = read('core/operational-directory-field-policy-v20260722.js');
const owner = read('core/client-insurer-operational-directory-owner-v20260722.js');
const router = read('core/router-tenant-config-bootstrap.js');
const academy = read('data/academia-v1230-operational-directory-v20260722.js');
const addendum = read('docs/ADDENDUM-MAESTRO-DIRECTORIO-OPERATIVO-USUARIOS-CUENTAS-20260722.md');
const workflow = readRepo('.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml');
const freeze = jsonRepo('tools/orbit360-incident-freeze-v20260721.json');
const overlay = jsonRepo('tools/orbit360-gate-contract-overlay-v20260718.json');

check('POLICY_VERSION', policy.includes("var VERSION = '20260722.1'"));
check('POLICY_OPERATIONAL_FIELDS', policy.includes("operationalFields: ['usuario', 'numero']") && policy.includes('usernameOperational: true') && policy.includes('bankNumberOperational: true'));
check('POLICY_PASSWORD_ONLY_SECRET', policy.includes("protectedFields: ['password', 'contrasena']") && policy.includes('passwordProtectedOnly: true') && policy.includes('passwordWrites: 0'));
check('POLICY_WRITES_AFTER_REMOTE_SUCCESS', policy.includes('var result = await current(payload);') && policy.indexOf('applyOperationalFields(enriched, result)') > policy.indexOf('var result = await current(payload);'));
check('POLICY_PRESERVES_REFERENCES', policy.includes('accountRefBackupOnly: true') && policy.includes('credentialRefPasswordOnly: true') && policy.includes('providerMappingsPreserved: true'));
check('POLICY_NO_PASSWORD_PERSISTENCE', !policy.includes('portals[portalIndex].password') && !policy.includes('portals[portalIndex].contrasena') && !policy.includes('accounts[accountIndex].password') && !policy.includes('password: clean(item'));
check('POLICY_SCRUBS_TEMPORARY_VALUES', policy.includes("item.password = ''") && policy.includes("item.accountNumber = ''") && policy.includes("item.username = ''"));

check('OWNER_VERSION', owner.includes("var VERSION = '20260722.1'"));
check('OWNER_USERNAME_VISIBLE', owner.includes('data-od-credential-user') && owner.includes("user || 'Sin usuario registrado'") && owner.includes('usernameOperationalVisible: true'));
check('OWNER_PASSWORD_TEMPORARY', owner.includes('data-od-credential-secret') && owner.includes("secret.textContent = 'Oculta'") && owner.includes('passwordProtectedTemporaryReveal: true'));
check('OWNER_BANK_VISIBLE', owner.includes('data-od-bank-number') && owner.includes('bankNumberOperationalVisible: true'));
check('OWNER_BANK_NO_REVEAL', !owner.includes('data-m1-bank-reveal') && !owner.includes("fieldType:'bank_account'") && !owner.includes('revealBankAccount') && owner.includes('bankRevealDependency: false'));
check('OWNER_BANK_COPY_DIRECT', owner.includes('data-od-bank-copy-all') && owner.includes("'Cuenta: ' + number") && owner.includes('bankCopyDirect: true'));
check('OWNER_BANK_EXCLUDES_USE', owner.includes('bankCopyExcludesUse: true') && !owner.includes("'Uso: '"));
check('OWNER_HOLDER_FALLBACK', owner.includes("clean(account && account.titular) || clean(insurer && insurer.nombre) || 'Sin registrar'"));
check('OWNER_STOPS_LEGACY_CLICK', owner.includes("document.addEventListener('click', onClick, true)") && owner.includes('event.stopPropagation()'));
check('OWNER_NO_STORE_WRITES', owner.includes('writesStore: false') && !owner.includes("Orbit.store.update('aseguradoras'"));

const policyIndex = router.indexOf('data-orbit-operational-directory-policy');
const baseIndex = router.indexOf('data-orbit-m1-visual-contract');
const ownerIndex = router.indexOf('data-orbit-operational-directory-owner');
const academyIndex = router.indexOf('data-orbit-operational-directory-academy');
check('ROUTER_LOADS_ALL', policyIndex >= 0 && baseIndex >= 0 && ownerIndex >= 0 && academyIndex >= 0);
check('ROUTER_ORDER', policyIndex < baseIndex && baseIndex < ownerIndex && ownerIndex < academyIndex, `${policyIndex},${baseIndex},${ownerIndex},${academyIndex}`);
check('ROUTER_SAME_ORIGIN', router.includes('safeSameOrigin') && router.includes('/core/operational-directory-field-policy-v20260722.js') && router.includes('/core/client-insurer-operational-directory-owner-v20260722.js'));
check('ROUTER_RELEASE', router.includes('block1-critical-runtime-20260722-6') && router.includes("visualContractDeliveryRevision: '20260722.6'"));

check('ACADEMY_1230', academy.includes('version: VERSION') && academy.includes("contentVersion: '1.230'") && academy.includes('operationalDirectorySemantics: true'));
check('ACADEMY_FIELD_CLASSIFICATION', academy.includes('usernameOperational: true') && academy.includes('bankNumberOperational: true') && academy.includes('passwordOnlySecret: true'));
check('ACADEMY_ROLES', academy.includes("['Dirección','Operativo','Asesor']"));

check('ADDENDUM_BINDING', addendum.includes('Usuario del portal') && addendum.includes('Número de cuenta bancaria') && addendum.includes('Es el único campo secreto'));
check('OVERLAY_1038', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.38' && String(overlay.contractRevision || '').startsWith('1.0.38'));
check('OVERLAY_OWNERS', (overlay.canonicalOwners || []).some(x => x.id === 'operationalDirectoryFieldPolicy') && (overlay.canonicalOwners || []).some(x => x.id === 'clientInsurerOperationalDirectoryOwner'));
check('FREEZE_STATIC_ONLY', freeze.stateClarification && freeze.stateClarification.operationalDirectoryStaticPatch === 'READY_FOR_VALIDATION' && freeze.stateClarification.operationalDirectoryDryRun === 'NOT_AUTHORIZED' && freeze.stateClarification.operationalDirectoryApply === 'NOT_AUTHORIZED');
check('WORKFLOW_VALIDATION_ONLY', workflow.includes('VALIDATION_ONLY') && !workflow.includes('orbit360-reparar-directorio-operativo-estructural') && !workflow.includes('orbit360-aplicar-correccion-directorio-operativo') && !workflow.includes('git commit') && !workflow.includes('git push'));
check('WORKFLOW_NO_DATA_ACCESS', !workflow.toLowerCase().includes('firestore') && !workflow.includes('GOOGLE_APPLICATION_CREDENTIALS') && !workflow.includes('FIREBASE_SERVICE_ACCOUNT') && !workflow.includes('Secret Manager'));

const failed = checks.filter(x => !x.ok);
const result = {
  schemaVersion: 'orbit360-m1-operational-directory-contract-v1',
  contractVersion: '1.0.38',
  revision: '20260722.1',
  classification: 'DATA_CONTRACT_FAILURE',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
  dataAccess: false,
  secretAccess: false,
  writes: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
