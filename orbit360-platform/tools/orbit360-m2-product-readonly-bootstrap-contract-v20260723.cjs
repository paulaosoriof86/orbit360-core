#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/m2-product-readonly-static-sanitized.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const checks = [];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function executable(rel) {
  let source = read(rel);
  if (/\.(?:js|mjs|cjs)$/i.test(rel)) source = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/\.html?$/i.test(rel)) source = source.replace(/<!--[\s\S]*?-->/g, '');
  if (/\.ya?ml$/i.test(rel)) source = source.replace(/^\s*#.*$/gm, '');
  return source;
}

function check(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail: String(detail || '') });
}

function has(rel, token) {
  return exists(rel) && executable(rel).includes(token);
}

function lacks(rel, token) {
  return exists(rel) && !executable(rel).includes(token);
}

const files = {
  taxonomy: 'orbit360-platform/core/product-role-taxonomy-p0.js',
  membership: 'orbit360-platform/core/membership-multirol-effective-p0.js',
  access: 'orbit360-platform/core/tenant-access-policy-product-p0.js',
  bootstrap: 'orbit360-platform/core/backend-product-readonly-bootstrap-p0.js',
  entry: 'orbit360-platform/product-readonly.html',
  academy: 'orbit360-platform/data/academia-v1233-product-readonly-bootstrap.js',
  docs: 'orbit360-platform/docs/IMPLEMENTACION-M2-BOOTSTRAP-PRODUCTIVO-READONLY-20260723.md',
  extension: 'tools/orbit360-gate-contract-registry-extension-m2-v20260723.json',
  overlay: 'tools/orbit360-gate-contract-overlay-m2-v20260723.json',
  lifecycle: 'tools/orbit360-validator-lifecycle-contract-m2-v20260723.json',
  freeze: 'tools/orbit360-incident-freeze-v20260721.json',
  workflow: '.github/workflows/orbit360-m2-product-readonly-static-gate-v20260723.yml',
  entrypoint: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
  engine: 'tools/orbit360-validar-gate-contracts-engine-m2-v20260723.mjs'
};

Object.entries(files).forEach(([id, rel]) => check(`FILE_EXISTS:${id}`, exists(rel), rel));

check('TAXONOMY_CANONICAL_ROLES', has(files.taxonomy, "'Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo'"), files.taxonomy);
check('TAXONOMY_READ_ALIASES_ONLY', has(files.taxonomy, 'persistedRoleAliasesAllowed: false') && has(files.taxonomy, 'readAliasesAllowed: true'), files.taxonomy);
check('TAXONOMY_ADMIN_ALIAS', has(files.taxonomy, "'admin': 'AdminTenant'"), files.taxonomy);
check('TAXONOMY_SUPERADMIN_ALIAS', has(files.taxonomy, "'superadmin': 'SuperAdmin'"), files.taxonomy);
check('MEMBERSHIP_USES_TAXONOMY', has(files.membership, 'productRoleTaxonomyP0') && has(files.membership, 'canonicalInput'), files.membership);
check('MEMBERSHIP_COMPAT_OWNER', has(files.membership, 'membershipMultirolContractP0 = api'), files.membership);
check('MEMBERSHIP_NO_WRITES', has(files.membership, 'writesStore: false'), files.membership);
check('ACCESS_USES_TAXONOMY', has(files.access, 'canonicalMembership') && has(files.access, 'productRoleTaxonomyP0'), files.access);
check('ACCESS_READONLY', has(files.access, 'writesAuthorized: false') && has(files.access, 'writeAuthorized: false'), files.access);
check('ACCESS_TENANT_MEMBERSHIP', has(files.access, "tenantSource: 'membership_only'"), files.access);

check('BOOTSTRAP_OWNER_EXPLICIT', has(files.bootstrap, 'backendProductReadOnlyBootstrapP0'), files.bootstrap);
check('BOOTSTRAP_TENANT_MEMBERSHIP_ONLY', has(files.bootstrap, "TENANT_SOURCE = 'membership_only'") && has(files.bootstrap, 'deriveTenantFromMembership'), files.bootstrap);
check('BOOTSTRAP_QUERY_TENANT_FORBIDDEN', has(files.bootstrap, 'queryStringTenantAllowed: false'), files.bootstrap);
check('BOOTSTRAP_NO_AUTOSTART', has(files.bootstrap, 'autoStart: false'), files.bootstrap);
check('BOOTSTRAP_WRITE_LOCK', has(files.bootstrap, 'WRITE_AUTHORIZED = false') && has(files.bootstrap, 'writesAuthorized: false'), files.bootstrap);
check('BOOTSTRAP_NO_FALLBACK', has(files.bootstrap, 'noFallback: true'), files.bootstrap);
check('BOOTSTRAP_REQUIRES_MEMBERSHIP_PROVIDER', has(files.bootstrap, "'membershipProvider'") && has(files.bootstrap, 'getByUid'), files.bootstrap);
check('BOOTSTRAP_INSTALLS_PRODUCT_STORE', has(files.bootstrap, 'createFirestoreProductReadOnlyStoreP0') && has(files.bootstrap, 'window.Orbit.store = store'), files.bootstrap);
check('BOOTSTRAP_READINESS_BEFORE_ATTACH', has(files.bootstrap, 'backendProductReadinessP0.readiness') && executable(files.bootstrap).indexOf('backendProductReadinessP0.readiness') < executable(files.bootstrap).indexOf('store._attachSnapshots()'), files.bootstrap);
check('BOOTSTRAP_NO_URL_TENANT', lacks(files.bootstrap, 'location.search') && lacks(files.bootstrap, 'URLSearchParams') && lacks(files.bootstrap, 'window.location'), files.bootstrap);
check('BOOTSTRAP_NO_ALT_STORAGE', lacks(files.bootstrap, 'localStorage') && lacks(files.bootstrap, 'Orbit.SEED'), files.bootstrap);
check('BOOTSTRAP_NO_ENV_VALUES', lacks(files.bootstrap, 'apiKey:') && lacks(files.bootstrap, 'projectId:'), files.bootstrap);

check('ENTRY_PRODUCT_EXPLICIT', has(files.entry, 'data-orbit-entrypoint="product-readonly"') && has(files.entry, "mode: 'product'"), files.entry);
check('ENTRY_FAIL_CLOSED', has(files.entry, 'blocked-until-authorized-runtime') && has(files.entry, 'autoStart: false'), files.entry);
check('ENTRY_MEMBERSHIP_TENANT', has(files.entry, "tenantSource: 'membership_only'") && has(files.entry, 'queryStringTenantAllowed: false'), files.entry);
check('ENTRY_LOADS_PRODUCT_OWNERS', has(files.entry, 'backend-product-readonly-bootstrap-p0.js') && has(files.entry, 'store-firestore-product-readonly-p0.js'), files.entry);
check('ENTRY_NO_TEST_ENV_LOADERS', lacks(files.entry, 'backend-lab-loader') && lacks(files.entry, 'store-firestore-lab') && lacks(files.entry, 'data/store.js') && lacks(files.entry, 'data/seed.js'), files.entry);
check('ENTRY_NO_TENANT_QUERY', lacks(files.entry, 'URLSearchParams') && lacks(files.entry, 'location.search') && lacks(files.entry, 'tenant='), files.entry);

check('ACADEMY_VERSION', has(files.academy, "version: '1.233'"), files.academy);
check('ACADEMY_MEMBERSHIP_FIRST', has(files.academy, 'tenantFromMembershipOnly: true'), files.academy);
check('ACADEMY_CLAUDE_CLASSIFICATION', has(files.academy, "claudeClassification: 'REPLICABLE_CLAUDE_ACUMULADO'"), files.academy);
check('DOCS_GATE_ID', has(files.docs, 'block2-product-readonly-bootstrap-v20260723'), files.docs);
check('DOCS_ZERO_CAPABILITIES', has(files.docs, 'cero Firebase productivo') && has(files.docs, 'cero writes'), files.docs);

check('REGISTRY_M2_GATE', has(files.extension, 'block2-product-readonly-bootstrap-v20260723') && has(files.extension, '"block": 2'), files.extension);
check('REGISTRY_PLAN_PATCH', has(files.extension, '"activeBlock": 2'), files.extension);
check('OVERLAY_M2_GATE', has(files.overlay, 'block2-product-readonly-bootstrap-v20260723') && has(files.overlay, '"phase":"STATIC_PREFLIGHT"'), files.overlay);
check('LIFECYCLE_M2_GATE', has(files.lifecycle, 'block2-product-readonly-bootstrap-v20260723') && has(files.lifecycle, '"gateContractVersion":"2.0.0"'), files.lifecycle);
check('FREEZE_M2_STATIC_AUTH', has(files.freeze, 'M2_PRODUCT_READONLY_STATIC_PATCH_AUTHORIZED_ONCE') && has(files.freeze, '"m1Closed":true') && has(files.freeze, '"m3Authorized":false'), files.freeze);
check('CANONICAL_ENTRYPOINT_ROUTES_M2', has(files.entrypoint, 'block2-product-readonly-bootstrap-v20260723') && has(files.entrypoint, 'orbit360-validar-gate-contracts-engine-m2-v20260723.mjs'), files.entrypoint);
check('M2_ENGINE_STATIC_ONLY', has(files.engine, 'STATIC_PREFLIGHT') && has(files.engine, 'M2_STATIC_PATCH_AUTHORIZED'), files.engine);
check('WORKFLOW_VALIDATION_ONLY', has(files.workflow, 'VALIDATION_ONLY') && has(files.workflow, 'block2-product-readonly-bootstrap-v20260723'), files.workflow);
check('WORKFLOW_NO_REPOSITORY_WRITE', lacks(files.workflow, 'git commit') && lacks(files.workflow, 'git push'), files.workflow);
check('WORKFLOW_NO_EXTERNAL_CAPABILITIES', lacks(files.workflow, 'secrets.') && lacks(files.workflow, 'firebase deploy') && lacks(files.workflow, 'playwright') && lacks(files.workflow, 'firestore'), files.workflow);
check('WORKFLOW_RUNS_CANONICAL_PREFLIGHT', has(files.workflow, 'orbit360-validar-gate-contracts-v20260717.mjs') && has(files.workflow, 'GO_GATE_CONTRACT'), files.workflow);
check('WORKFLOW_RUNS_ROOT_CONTRACT', has(files.workflow, 'orbit360-m2-product-readonly-bootstrap-contract-v20260723.cjs') && has(files.workflow, 'M2_PRODUCT_READONLY_BOOTSTRAP_CONTRACT_PASS'), files.workflow);

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-m2-product-readonly-bootstrap-static-contract-v1',
  gateId: 'block2-product-readonly-bootstrap-v20260723',
  contractVersion: '2.0.0',
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'M2_PRODUCT_READONLY_BOOTSTRAP_CONTRACT_FAIL' : 'M2_PRODUCT_READONLY_BOOTSTRAP_CONTRACT_PASS',
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  tenantFromMembershipOnly: true,
  queryStringTenantAllowed: false,
  writeAuthorized: false,
  secretAccess: false,
  firebaseProductiveAccess: false,
  firestoreRead: false,
  runtimeExecuted: false,
  browserExecuted: false,
  rulesApplied: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false
};

fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(payload, null, 2));
process.exit(failed.length ? 41 : 0);
