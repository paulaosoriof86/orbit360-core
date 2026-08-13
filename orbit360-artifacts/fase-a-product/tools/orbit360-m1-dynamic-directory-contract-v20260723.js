#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const checks = [];
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail || '' }); }
function has(src, token) { return src.indexOf(token) >= 0; }

const mod = read('modules/aseguradoras.js');
const readOwner = read('core/client-insurer-operational-directory-owner-v20260722.js');
const editOwner = read('core/client-insurer-edit-owner-v20260722.js');
const academy = read('data/academia-v1230-operational-directory-v20260722.js');
const bootstrap = read('core/router-tenant-config-bootstrap.js');

check('CANONICAL_MODULE_OWNS_CRUD', has(editOwner, 'delegatesCrudToCanonicalModule: true') && has(editOwner, 'replacesEditableDom: false') && has(editOwner, 'wrapsStore: false'));
check('READ_OWNER_SKIPS_EDIT_MODE', has(readOwner, "root.querySelector('#af-guardar')") && has(readOwner, 'skipsEditMode: true'));
check('BANK_ADD_BLANK_DYNAMIC', has(mod, "id: 'account_' + Date.now().toString(36)") && has(mod, "numero: ''"));
check('NO_RANDOM_MASKED_ACCOUNT', !/Math\.random\(\)[\s\S]{0,80}numero/.test(mod) && !has(mod, "numero: '****' + Math.floor"));
check('BANK_SNAPSHOT_SAFE', has(mod, "Object.assign({}, previous[idx] || {}, { banco:") && !has(mod, "r.querySelector('[data-cuso]').value"));
check('PORTAL_NATIVE_USERNAME', has(mod, 'data-puser') && has(mod, "usuario: r.querySelector('[data-puser]').value"));
check('PASSWORD_NATIVE_EPHEMERAL', has(mod, 'data-ppass type="password"') && has(mod, 'st.credentialDrafts') && !/password\s*:\s*r\.querySelector\([^\n]+draft\.portales/.test(mod));
check('SECURE_PROVIDER_MUTATION', has(mod, 'Orbit.secureImport.importInsurerDirectory') && has(mod, 'persistSecureCredentialChanges'));
check('PASSWORD_NOT_IN_STORE_CONTRACT', has(editOwner, 'securePasswordMutationRequired: true') && has(editOwner, 'passwordInputForbidden: false'));
check('CURRENT_TAB_FORCED_BEFORE_SAVE', has(mod, "if (typeof st.snapshotCurrent === 'function') st.snapshotCurrent();"));
check('TAB_SWITCH_SNAPSHOTS', has(mod, 'currentState.tab !== t') && has(mod, 'currentState.snapshotCurrent()'));
check('BACKEND_WRITE_ACK', has(mod, 'waitBackendWrite') && has(mod, "orbit:backend:write-ok") && has(mod, "orbit:backend:write-error"));
check('EDIT_REMAINS_OPEN_ON_FAILURE', has(mod, 'La edición continúa abierta para corregir o reintentar'));
check('AUTHORIZED_ROLES', ['direccion','admin','superadmin','superadministrador','operativo'].every(role => has(mod, `'${role}'`)));
check('ADVISOR_NOT_IN_EDIT_ROLES', !/\['direccion'[^\]]*'asesor'/.test(mod));
check('STABLE_NEW_RESOURCE_IDS', has(mod, "id: 'portal_' + Date.now().toString(36)") && has(mod, "id: 'contact_' + Date.now().toString(36)"));
check('ACADEMY_1232', has(academy, "var VERSION = '1.232'") && has(academy, 'dynamicCrud: true') && has(academy, 'backendWriteAcknowledgement: true') && has(academy, 'operationalValuesInCode: false'));
check('BOOTSTRAP_VERSIONS', has(bootstrap, "editOwnerVersion: '20260723.2'") && has(bootstrap, "operationalDirectoryOwnerVersion: '20260723.2'") && has(bootstrap, "operationalDirectoryAcademyVersion: '1.232'"));
check('NO_OPERATIONAL_VALUES_ADDED_TO_PATCH', has(editOwner, 'operationalValuesInCode: false'));

const failed = checks.filter(item => !item.ok);
const report = {
  schemaVersion: 'orbit360-m1-dynamic-directory-contract-v1',
  contractVersion: '1.0.40',
  status: failed.length ? 'DYNAMIC_DIRECTORY_CONTRACT_FAILED' : 'DYNAMIC_DIRECTORY_CONTRACT_PASS',
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  capabilities: { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false },
  containsPII:false,
  containsSecrets:false
};
const out = path.join(ROOT, 'runtime-gate-crm-v20260716/dynamic-directory-contract-sanitized.json');
fs.mkdirSync(path.dirname(out), { recursive:true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 41 : 0);
