#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OWNER_REL = 'orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const PRODUCT_BOOTSTRAP_REL = 'orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js';
const LEGACY_REL = 'orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js';
const EXPECTED_VERSION = '20260829.1';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
}
function has(text, needle) { return text.includes(needle); }
function check(id, ok, evidence) { return { id, ok: !!ok, evidence }; }

let owner = '', bootstrap = '', legacy = '';
const missing = [];
for (const rel of [OWNER_REL, PRODUCT_BOOTSTRAP_REL, LEGACY_REL]) {
  if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
}
if (!missing.length) {
  owner = read(OWNER_REL);
  bootstrap = read(PRODUCT_BOOTSTRAP_REL);
  legacy = read(LEGACY_REL);
}

const checks = missing.length ? [check('required-files-present', false, missing)] : [
  check('owner-version-final', has(owner, "var VERSION = '20260829.1';") && has(owner, 'version: VERSION'), EXPECTED_VERSION),
  check('owner-id-canonical', has(owner, "ownerId: 'clientInsurerOperationalDirectoryOwner'"), 'clientInsurerOperationalDirectoryOwner'),
  check('owner-supersedes-legacy-bank-platform-sections', has(owner, "supersedesBankAndPortalSectionsOf: 'client-insurer-visual-contract-v20260720'"), 'explicit supersession'),
  check('username-operational-visible', has(owner, 'usernameOperationalVisible: true') && has(owner, 'data-od-credential-user'), 'username visible in operational directory'),
  check('password-authorized-reveal', has(owner, 'passwordProtectedTemporaryReveal: true') && has(owner, 'credentialRecordFallbackForAuthorizedRoles: true') && has(owner, 'function credentialAccessAllowed()') && has(owner, 'function inlineCredential(portal)'), 'authorized roles/extra permission gate direct record reveal'),
  check('password-provider-fallback-preserved', has(owner, 'credentialProviderFallbackPreserved: true') && has(owner, 'Orbit.secureResources.revealCredential'), 'provider remains secondary fallback'),
  check('password-rehides-after-reveal', has(owner, "secret.textContent = 'Oculta'") && has(owner, 'setTimeout(function ()'), 'temporary UI reveal'),
  check('bank-number-operational-visible', has(owner, 'bankNumberOperationalVisible: true') && has(owner, 'data-od-bank-number'), 'bank number visible directly'),
  check('bank-no-reveal-dependency', has(owner, 'bankRevealDependency: false'), 'accountRef/reveal not required for bank visibility'),
  check('bank-copy-direct', has(owner, 'bankCopyDirect: true') && has(owner, 'data-od-bank-copy-all') && has(owner, 'Copiar datos completos'), 'direct complete bank copy'),
  check('bank-copy-fields-exact', has(owner, "bankCopyFields: ['banco','tipo','numero','moneda','titular']") && has(owner, 'bankCopyExcludesUse: true'), 'banco,tipo,numero,moneda,titular; excludes use'),
  check('owner-no-store-writes', has(owner, 'writesStore: false'), 'read/render owner only'),
  check('owner-no-reimport', has(owner, 'reimportsData: false'), 'no data reimport'),
  check('product-bootstrap-loads-final-owner', has(bootstrap, 'client-insurer-operational-directory-owner-v20260722.js?v=20260829-1') && has(bootstrap, "operationalOwner:['core/client-insurer-operational-directory-owner-v20260722.js"), OWNER_REL),
  check('product-bootstrap-no-lab-provider', !has(bootstrap, "credentialProvider:['core/aseguradoras-credentials-provider-lab-v20260720.js") && !has(bootstrap, 'backend-lab') && !has(bootstrap, 'firestore-lab'), 'product bootstrap excludes LAB credential provider'),
  check('product-bootstrap-readonly', has(bootstrap, "mode:'product-readonly'") && has(bootstrap, 'writeAuthorized:false') && has(bootstrap, 'queryTenantAllowed:false'), 'product read-only boundary'),
  check(
    'legacy-bridge-explicit-post-router-consumer',
    has(legacy, "mod.__resourcesRuntimeOwnershipV20260718 = { phase: 'post-router-render', autoloadsBeforeRouter: false };") &&
      has(legacy, 'mod.__resourcesV1202 = { originalRender, loadAysRuntime };'),
    'legacy bridge explicitly declares post-router-render and no pre-router autoload ownership'
  )
];

const failed = checks.filter(x => !x.ok);
const payload = {
  schemaVersion: 'orbit360-aseguradoras-operational-owner-preservation-v3-authorized-reveal',
  validatorId: 'aseguradoras-operational-owner-preservation-v20260827',
  module: 'Aseguradoras',
  classificationOnFailure: 'VALIDATOR_STALE',
  expectedOwnerVersion: EXPECTED_VERSION,
  sourceOnly: true,
  secrets: false,
  firestoreRead: false,
  writes: false,
  runtime: false,
  browser: false,
  deploy: false,
  productionTouched: false,
  ok: failed.length === 0,
  status: failed.length === 0 ? 'ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS' : 'ASEGURADORAS_FINAL_OWNER_PRESERVATION_FAIL',
  checks,
  failedCheckIds: failed.map(x => x.id)
};

process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
process.exitCode = payload.ok ? 0 : 2;
