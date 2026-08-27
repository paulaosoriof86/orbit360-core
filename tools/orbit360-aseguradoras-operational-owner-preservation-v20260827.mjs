#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OWNER_REL = 'orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js';
const BOOTSTRAP_REL = 'orbit360-platform/core/router-tenant-config-bootstrap.js';
const INDEX_REL = 'orbit360-platform/index.html';
const LEGACY_REL = 'orbit360-platform/modules/aseguradoras-v1202-resources-bridge.js';
const EXPECTED_VERSION = '20260723.2';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
}
function has(text, needle) { return text.includes(needle); }
function check(id, ok, evidence) { return { id, ok: !!ok, evidence }; }

let owner = '', bootstrap = '', index = '', legacy = '';
const missing = [];
for (const rel of [OWNER_REL, BOOTSTRAP_REL, INDEX_REL, LEGACY_REL]) {
  if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
}
if (!missing.length) {
  owner = read(OWNER_REL);
  bootstrap = read(BOOTSTRAP_REL);
  index = read(INDEX_REL);
  legacy = read(LEGACY_REL);
}

const checks = missing.length ? [check('required-files-present', false, missing)] : [
  check('owner-version-final', has(owner, "var VERSION = '20260723.2';") && has(owner, 'version: VERSION'), EXPECTED_VERSION),
  check('owner-id-canonical', has(owner, "ownerId: 'clientInsurerOperationalDirectoryOwner'"), 'clientInsurerOperationalDirectoryOwner'),
  check('owner-supersedes-legacy-bank-platform-sections', has(owner, "supersedesBankAndPortalSectionsOf: 'client-insurer-visual-contract-v20260720'"), 'explicit supersession'),
  check('username-operational-visible', has(owner, 'usernameOperationalVisible: true') && has(owner, 'data-od-credential-user'), 'username visible in operational directory'),
  check('password-protected-temporary-reveal', has(owner, 'passwordProtectedTemporaryReveal: true') && has(owner, "secret.textContent = 'Oculta'") && has(owner, 'revealCredential('), 'password remains secret and temporary'),
  check('bank-number-operational-visible', has(owner, 'bankNumberOperationalVisible: true') && has(owner, 'data-od-bank-number'), 'bank number visible directly'),
  check('bank-no-reveal-dependency', has(owner, 'bankRevealDependency: false'), 'accountRef/reveal not required for bank visibility'),
  check('bank-copy-direct', has(owner, 'bankCopyDirect: true') && has(owner, 'data-od-bank-copy-all') && has(owner, 'Copiar datos completos'), 'direct complete bank copy'),
  check('bank-copy-fields-exact', has(owner, "bankCopyFields: ['banco','tipo','numero','moneda','titular']") && has(owner, 'bankCopyExcludesUse: true'), 'banco,tipo,numero,moneda,titular; excludes use'),
  check('owner-no-store-writes', has(owner, 'writesStore: false'), 'read/render owner only'),
  check('owner-no-reimport', has(owner, 'reimportsData: false'), 'no data reimport'),
  check('bootstrap-requests-final-owner', has(bootstrap, "operationalDirectoryOwnerVersion: '20260723.2'") && has(bootstrap, 'operationalDirectoryOwnerRequested: true'), EXPECTED_VERSION),
  check('bootstrap-loads-final-owner-source', has(bootstrap, 'client-insurer-operational-directory-owner-v20260722.js?v=20260723-2') && has(bootstrap, "data-orbit-operational-directory-owner"), OWNER_REL),
  check('bootstrap-readiness-requires-final-version', has(bootstrap, "Orbit.clientInsurerOperationalDirectoryOwnerV20260722.version === '20260723.2'"), 'loadOperationalOwner fail-closed version check'),
  check('bootstrap-owner-before-tenant-config-and-router', has(bootstrap, 'function loadOperationalOwner()') && has(bootstrap, 'loadOperationalOwner,') && has(index, 'core/router-tenant-config-bootstrap.js') && has(index, 'core/router.js'), 'owner requested by bootstrap before router.js executes'),
  check('legacy-bridge-not-authority', has(legacy, 'credentialRef') && !has(legacy, 'ownerId: \'clientInsurerOperationalDirectoryOwner\''), 'legacy consumer may exist but cannot be canonical owner')
];

const failed = checks.filter(x => !x.ok);
const payload = {
  schemaVersion: 'orbit360-aseguradoras-operational-owner-preservation-v1',
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
