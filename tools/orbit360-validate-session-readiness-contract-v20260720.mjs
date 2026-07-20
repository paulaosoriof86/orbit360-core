#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.env.ORBIT360_VALIDATION_ROOT || process.cwd();
const CONTRACT_REL = 'orbit360-platform/core/session-readiness-contract-v20260720.js';
const CONTRACT_PATH = path.join(ROOT, CONTRACT_REL);
const OUTPUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/session-readiness-static-sanitized.json';
const OUTPUT_PATH = path.join(ROOT, OUTPUT_REL);

function result(id, ok, detail = '') { return { id, ok: Boolean(ok), detail }; }
function write(payload) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const checks = [];
if (!fs.existsSync(CONTRACT_PATH)) {
  write({ schemaVersion: 'orbit360-session-readiness-static-v1', ok: false, checks: [result('CONTRACT_EXISTS', false, CONTRACT_REL)], containsPII: false, containsSecrets: false });
  process.exit(71);
}

const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
checks.push(result('VERSION', source.includes("var VERSION = '20260720.1'")));
checks.push(result('AUTH_REQUIRED', source.includes('requiresAuthBeforeActionableClick: true')));
checks.push(result('ROLE_REQUIRED', source.includes('requiresActiveRoleBeforeActionableClick: true')));
checks.push(result('TENANT_REQUIRED', source.includes('requiresTenantBeforeActionableClick: true')));
checks.push(result('LEGAL_REQUIRED', source.includes('requiresLegalGateBeforeActionableClick: true')));
checks.push(result('NO_LEGAL_MUTATION_MARKER', source.includes('neverMutatesLegalAcceptance: true')));
checks.push(result('NO_OPERATIONAL_CLICK_MARKER', source.includes('neverClicksOperationalUi: true')));
checks.push(result('NO_STORE_WRITES_MARKER', source.includes('writesStore: false')));
checks.push(result('NO_SET_ITEM', !source.includes('.setItem(')));
checks.push(result('NO_CLICK_CALL', !source.includes('.click(')));
checks.push(result('NO_STORE_REFERENCE', !source.includes('Orbit.store')));

let storageWrites = 0;
globalThis.location = { search: '?tenant=alianzas-soluciones' };
globalThis.localStorage = {
  getItem() { return null; },
  setItem() { storageWrites += 1; throw new Error('WRITE_FORBIDDEN'); }
};
let overlays = [];
globalThis.document = {
  readyState: 'loading',
  body: { dataset: { authStage: 'inside' } },
  addEventListener() {},
  querySelectorAll(selector) { return selector === '[data-legal-gate]' ? overlays : []; },
  getElementById() { return null; },
  documentElement: null
};
globalThis.Orbit = {};

const contract = require(CONTRACT_PATH);
checks.push(result('MODULE_VERSION', contract.version === '20260720.1', contract.version));

function setScenario({ authenticated, role, tenant, accepted, overlayOpen, stage = 'inside' }) {
  const email = authenticated ? 'fixture@example.invalid' : '';
  globalThis.document.body.dataset.authStage = stage;
  overlays = overlayOpen ? [{ getAttribute: () => 'user:fixture@example.invalid' }] : [];
  globalThis.Orbit.auth = {
    authed: () => authenticated,
    user: () => authenticated ? { uid: 'fixture_uid', email, rol: role || '' } : null
  };
  globalThis.Orbit.session = { rol: () => role || '' };
  globalThis.Orbit.access = { tenantId: () => tenant || '' };
  globalThis.Orbit.legal = { yaAcepto: () => accepted === true };
  return contract.snapshot();
}

const unauthenticated = setScenario({ authenticated: false, role: '', tenant: '', accepted: false, overlayOpen: false, stage: 'login-ready' });
checks.push(result('SCENARIO_UNAUTHENTICATED_BLOCKED', unauthenticated.ready === false && unauthenticated.blockingCode === 'AUTH_NOT_READY', unauthenticated.blockingCode));

const legalPending = setScenario({ authenticated: true, role: 'Dirección', tenant: 'alianzas-soluciones', accepted: false, overlayOpen: true });
checks.push(result('SCENARIO_LEGAL_PENDING_BLOCKED', legalPending.ready === false && legalPending.blockingCode === 'LEGAL_GATE_PENDING' && legalPending.predicates.legalOverlayOpen === true, legalPending.blockingCode));

const overlayStillOpen = setScenario({ authenticated: true, role: 'Dirección', tenant: 'alianzas-soluciones', accepted: true, overlayOpen: true });
checks.push(result('SCENARIO_ACCEPTED_OVERLAY_OPEN_BLOCKED', overlayStillOpen.ready === false && overlayStillOpen.blockingCode === 'LEGAL_GATE_PENDING', overlayStillOpen.blockingCode));

const ready = setScenario({ authenticated: true, role: 'Dirección', tenant: 'alianzas-soluciones', accepted: true, overlayOpen: false });
checks.push(result('SCENARIO_READY', ready.ready === true && ready.blockingCode === '' && ready.predicates.legalGateSatisfied === true, ready.blockingCode));
checks.push(result('SANITIZED_NO_PII', contract.sanitized(ready).containsPII === false));
checks.push(result('SANITIZED_NO_SECRETS', contract.sanitized(ready).containsSecrets === false));
checks.push(result('NO_STORAGE_WRITES_DURING_SCENARIOS', storageWrites === 0, String(storageWrites)));

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-session-readiness-static-v1',
  contractVersion: contract.version,
  generatedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  ok: failed.length === 0,
  containsPII: false,
  containsSecrets: false
};
write(payload);
console.log(JSON.stringify(payload, null, 2));
process.exit(failed.length ? 71 : 0);
