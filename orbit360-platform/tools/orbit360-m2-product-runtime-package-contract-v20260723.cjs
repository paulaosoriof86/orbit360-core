#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const checks = [];

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function json(rel) { return JSON.parse(read(rel)); }
function check(id, ok, detail) { checks.push({ id, ok: Boolean(ok), detail: String(detail || '') }); }
function has(rel, token) { return exists(rel) && read(rel).includes(token); }

const provider = 'orbit360-platform/core/product-runtime-provider-contracts-p0.js';
const pack = 'tools/orbit360-m2-product-readonly-runtime-authorization-package-v20260723.json';
const docs = 'orbit360-platform/docs/PREPARACION-AUTORIZACION-M2-RUNTIME-PRODUCTIVO-READONLY-20260723.md';
const academy = 'orbit360-platform/data/academia-v1234-product-runtime-preparation.js';

[provider, pack, docs, academy].forEach(rel => check('FILE:' + rel, exists(rel), rel));
check('PROVIDER_NO_VALUES', has(provider, 'containsValues: false') && has(provider, 'containsSecrets: false'), provider);
check('PROVIDER_NO_AUTOSTART', has(provider, 'autoStart: false') && has(provider, 'writeAuthorized: false'), provider);
check('PROVIDER_BOUNDARIES', has(provider, 'describePublicConfig') && has(provider, 'initializeFromEnvironment') && has(provider, 'waitForAuthenticatedUser') && has(provider, 'getByUid'), provider);

let request = null;
try { request = json(pack); } catch (error) { check('PACKAGE_JSON', false, error.message); }
check('PACKAGE_NOT_AUTHORIZED', !!(request && request.status === 'PREPARED_NOT_AUTHORIZED' && request.nextActionRequiresExplicitAuthorization === true), pack);
check('PACKAGE_STATIC_PREREQUISITE', !!(request && request.prerequisiteEvidence && request.prerequisiteEvidence.m2StaticStatus === 'M2_PRODUCT_READONLY_STATIC_VALIDATED'), pack);
check('PACKAGE_TENANT_MEMBERSHIP', !!(request && request.identityAndMembership && request.identityAndMembership.tenantSource === 'membership_only' && request.identityAndMembership.queryStringTenantAllowed === false), pack);
check('PACKAGE_WRITE_BLOCKED', !!(request && request.requiredExplicitAuthorizations && request.requiredExplicitAuthorizations.enableOperationalWrites === false), pack);
check('PACKAGE_RULES_PLAN', !!(request && request.readOnlyRulesPlan && request.readOnlyRulesPlan.firestore.denyAllCreates === true && request.readOnlyRulesPlan.firestore.denyAllUpdates === true && request.readOnlyRulesPlan.firestore.denyAllDeletes === true), pack);
check('PACKAGE_STORAGE_LOCK', !!(request && request.readOnlyRulesPlan && request.readOnlyRulesPlan.storage.denyAllUploads === true && request.readOnlyRulesPlan.storage.denyAllUpdates === true && request.readOnlyRulesPlan.storage.denyAllDeletes === true), pack);
check('PACKAGE_ZERO_CAPABILITIES_NOW', !!(request && request.capabilitiesNow && Object.values(request.capabilitiesNow).every(value => value === false)), pack);
check('PACKAGE_STOP_CONDITIONS', !!(request && Array.isArray(request.stopConditions) && request.stopConditions.length >= 10), pack);
check('PACKAGE_ROLLBACK', !!(request && request.rollbackPlan && request.rollbackPlan.detachProductSnapshots === true && request.rollbackPlan.restorePreviousReadOnlyRulesVersion === true), pack);

check('DOCS_EXPLICIT_AUTH', has(docs, 'Autorizaciones explícitas necesarias') && has(docs, 'Este documento no autoriza ni ejecuta la conexión.'), docs);
check('DOCS_NO_POLICIES', has(docs, 'Pólizas;') && has(docs, 'M3;'), docs);
check('ACADEMY_VERSION', has(academy, "version: '1.234'"), academy);
check('ACADEMY_PREPARED_ONLY', has(academy, 'packagePreparedOnly: true') && has(academy, 'productConnectionExecuted: false'), academy);
check('ACADEMY_CLAUDE', has(academy, 'REPLICABLE_CLAUDE_ACUMULADO'), academy);

const failed = checks.filter(item => !item.ok);
const output = {
  schemaVersion: 'orbit360-m2-product-runtime-package-contract-v1',
  status: failed.length ? 'M2_PRODUCT_RUNTIME_PACKAGE_FAIL' : 'M2_PRODUCT_RUNTIME_PACKAGE_PREPARED',
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  productConnectionExecuted: false,
  secretAccess: false,
  firebaseProductiveAccess: false,
  firestoreRead: false,
  writes: false,
  runtime: false,
  browser: false,
  rules: false,
  deploy: false,
  production: false,
  containsPII: false,
  containsSecrets: false
};
console.log(JSON.stringify(output, null, 2));
process.exit(failed.length ? 41 : 0);
