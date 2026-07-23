#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const files = {
  editOwner: read('core/client-insurer-edit-owner-v20260722.js'),
  barrier: read('core/client-insurer-visual-stability-barrier-v20260721.js'),
  editCss: read('styles/client-insurer-edit-mode-v20260722.css'),
  bootstrap: read('core/router-tenant-config-bootstrap.js'),
  tenant: read('data/tenant-alianzas-soluciones-insurers-p10.js'),
  academy: read('data/academia-v1230-operational-directory-v20260722.js'),
  visual: read('core/client-insurer-visual-contract-v20260720.js')
};
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: Boolean(ok), detail: detail || '' }); }
function has(file, token) { return files[file].includes(token); }
check('EDIT_OWNER_PRESENT', has('editOwner', "version: VERSION") && has('editOwner', "editModeReady: true"));
check('EDIT_OWNER_PRESERVES_CREDENTIAL_REF', has('editOwner', 'preservesCredentialRef: true') && has('editOwner', 'merged.credentialRef = previous.credentialRef'));
check('EDIT_OWNER_PRESERVES_ACCOUNT_REF', has('editOwner', 'preservesAccountRef: true') && has('editOwner', 'merged.accountRef ='));
check('EDIT_OWNER_MERGES_STABLE_IDENTITY', has('editOwner', 'mergeByStableIdentity: true') && has('editOwner', 'stableKey('));
check('EDIT_OWNER_USERNAME_OPERATIONAL', has('editOwner', 'usernameOperationalEditable: true') && has('editOwner', 'data-od-editor-user'));
check('EDIT_OWNER_PASSWORD_FORBIDDEN', has('editOwner', 'passwordInputForbidden: true') && has('editOwner', 'delete merged.password'));
check('EDIT_OWNER_USE_REMOVED', has('editOwner', 'bankUseFieldRemoved: true') && has('editOwner', 'delete merged.uso') && has('editCss', '[data-cuso]{display:none'));
check('EDIT_OWNER_RANDOM_MASK_FORBIDDEN', has('editOwner', 'randomMaskedAccountForbidden: true') && has('editOwner', '/^\\*{4}\\d{4}$/'));
check('BARRIER_EDIT_AWARE', has('barrier', 'editModeAware: true') && has('barrier', "editModeStatus: 'EDIT_MODE_READY'") && has('barrier', 'if (editMode(view)) return editModeReady(view)'));
check('BARRIER_NEVER_BLANKS_FOREVER', has('barrier', 'failVisible: true') && has('barrier', "releaseStableView(reason + ':max-passes'"));
check('SEMANTIC_TITLES', has('editOwner', "title.classList.add('od-page-title')") && has('editCss', '.od-page-title') && has('editCss', 'overflow-wrap:anywhere'));
check('MOBILE_BREAKPOINTS', has('editCss', '@media(max-width:760px)') && has('editCss', '@media(max-width:430px)'));
check('BOOTSTRAP_LOADS_EDIT_OWNER', has('bootstrap', 'client-insurer-edit-owner-v20260722.js') && has('bootstrap', 'data-orbit-insurer-edit-owner'));
check('BOOTSTRAP_LOADS_EDIT_STYLE', has('bootstrap', 'client-insurer-edit-mode-v20260722.css') && has('bootstrap', 'data-orbit-m1-edit-style'));
check('TENANT_ALL_ACTIVE_DEFAULT', has('tenant', 'insurersDefaultActive: true') && has('tenant', "insurerDeactivationPolicy: 'manual_with_reason_only'"));
check('ACADEMY_1231', has('academy', "VERSION = '1.231'") && has('academy', 'allAysInsurersActive: true') && has('academy', 'manualDeactivationOnly: true'));
check('CONTACT_ACTIONS_DERIVED', has('visual', "phone?'<a class=\"btn ghost sm\" href=\"'+esc(safeHref(phone,'phone'))+'\">Llamar</a>'") && has('visual', "wa?'<a class=\"btn ghost sm\" href=\"'+esc(wa)+'\""));
const failed = checks.filter(c => !c.ok);
const result = {
  schemaVersion: 'orbit360-m1-edit-mode-root-contract-v1',
  contractVersion: '1.0.39',
  status: failed.length ? 'FAIL' : 'PASS',
  checksPassed: checks.length - failed.length,
  checksTotal: checks.length,
  failedCheckIds: failed.map(c => c.id),
  checks,
  productWrites: 0,
  firestoreRead: false,
  operationalWrites: 0,
  deploy: false,
  containsPII: false,
  containsSecrets: false
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
if (failed.length) process.exit(1);
