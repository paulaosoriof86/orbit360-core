#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const F2_GATE_ID = 'f2-productive-acceptance-exact-successor-v20260818';
const AUTHORITY_REL = 'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const REGISTRY_REL = 'tools/orbit360-gate-contract-registry-v20260717.json';
const SOURCE_LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json';
const RUNTIME_LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const PREFLIGHT_REL = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const REQUEST14_REL = '.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260820-14.json';
const AUTH14_REL = '.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request14-v20260820.json';
const PACKAGE_REL = 'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json';
const LEDGER_REL = 'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const WRITER_REL = 'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const EXPECTED_VERSION = '2.2.0';
const EXPECTED_ARTIFACT = 9395391426;
const EXPECTED_SOURCE = '6af0c029aebb1bfecd05569452c814584110ae4c';
const EXPECTED_DIGEST = 'c089ea81672225876f643399b970d1e50e7d9cdc084dfc75973e00ed8581c53c';

const authority = readJson(AUTHORITY_REL);
const registry = readJson(REGISTRY_REL);
const source = readJson(SOURCE_LIFECYCLE_REL);
const runtime = readJson(RUNTIME_LIFECYCLE_REL);
const request14 = readJson(REQUEST14_REL);
const auth14 = readJson(AUTH14_REL);
const pkg = readJson(PACKAGE_REL);
const ledger = readJson(LEDGER_REL);
const writer = readJson(WRITER_REL);
const preflight = readText(PREFLIGHT_REL);
const f2Registry = (registry.gates || []).find(g => g.gateId === F2_GATE_ID);
const failures = [];
const requireCheck = (ok, code) => { if (!ok) failures.push(code); };

requireCheck(authority.gateId === F2_GATE_ID, 'AUTHORITY_GATE_ID');
requireCheck(authority.gateContractVersion === EXPECTED_VERSION, 'AUTHORITY_VERSION');
requireCheck(authority.candidate?.artifactId === EXPECTED_ARTIFACT, 'AUTHORITY_ARTIFACT');
requireCheck(authority.candidate?.sourceHead === EXPECTED_SOURCE, 'AUTHORITY_SOURCE_HEAD');
requireCheck(authority.candidate?.artifactDigest === EXPECTED_DIGEST, 'AUTHORITY_DIGEST');
requireCheck(authority.requestBinding?.defaultRequest === null, 'AUTHORITY_DEFAULT_REQUEST_MUST_BE_NULL');
requireCheck(authority.requestBinding?.requestOrdinalHasOperationalSemantics === false, 'AUTHORITY_ORDINAL_MUST_BE_NON_OPERATIONAL');

requireCheck(!!f2Registry, 'REGISTRY_F2_MISSING');
requireCheck(f2Registry?.contractVersion === EXPECTED_VERSION, 'REGISTRY_VERSION');
requireCheck(f2Registry?.canonicalContractAuthority === AUTHORITY_REL, 'REGISTRY_AUTHORITY_BINDING');
requireCheck(f2Registry?.candidate?.artifactId === EXPECTED_ARTIFACT, 'REGISTRY_ARTIFACT');
requireCheck(f2Registry?.candidate?.sourceHead === EXPECTED_SOURCE, 'REGISTRY_SOURCE_HEAD');

for (const [name, lifecycle] of [['SOURCE', source], ['RUNTIME', runtime]]) {
  requireCheck(lifecycle.gateId === F2_GATE_ID, `${name}_GATE_ID`);
  requireCheck(lifecycle.gateContractVersion === EXPECTED_VERSION, `${name}_VERSION`);
  requireCheck(lifecycle.canonicalContractAuthority === AUTHORITY_REL, `${name}_AUTHORITY_BINDING`);
}
requireCheck(source.guards?.candidateArtifactId === EXPECTED_ARTIFACT, 'SOURCE_ACTIVE_ARTIFACT');
requireCheck(source.guards?.candidateSourceHead === EXPECTED_SOURCE, 'SOURCE_ACTIVE_SOURCE_HEAD');
requireCheck(!JSON.stringify(source.guards || {}).includes('9387820198'), 'SOURCE_ACTIVE_HISTORICAL_ARTIFACT');
requireCheck(runtime.guards?.successorCandidateArtifactId === EXPECTED_ARTIFACT, 'RUNTIME_ACTIVE_ARTIFACT');
requireCheck(runtime.guards?.successorCandidateSourceHead === EXPECTED_SOURCE, 'RUNTIME_ACTIVE_SOURCE_HEAD');

requireCheck(preflight.includes(`const F2_CONTRACT_AUTHORITY_REL = '${AUTHORITY_REL}'`), 'PREFLIGHT_AUTHORITY_CONSTANT');
requireCheck(preflight.includes('GATE_ID === F2_GATE_ID ? f2CanonicalConfig()'), 'PREFLIGHT_DERIVES_AUTHORITY');
requireCheck(!preflight.includes("['f2-productive-acceptance-exact-successor-v20260818']: {\n    contractVersion: '2.1.0'"), 'PREFLIGHT_STALE_F2_CONFIG');
requireCheck(!preflight.includes('f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-01.json'), 'PREFLIGHT_HISTORICAL_DEFAULT_REQUEST');

for (const [name, record] of [['REQUEST14', request14], ['AUTH14', auth14]]) {
  requireCheck(record.status === 'CONSUMED_FAIL_VALIDATOR_STALE', `${name}_STATUS`);
  requireCheck(record.allowedExecutions === 0, `${name}_ALLOWED_EXECUTIONS`);
  requireCheck(record.consumed === true, `${name}_CONSUMED`);
  requireCheck(record.authorizationFrozen === true, `${name}_FROZEN`);
  requireCheck(record.replayAllowed === false, `${name}_REPLAY`);
}

const cp01 = (pkg.steps || []).find(s => s.id === 'CP-01');
const cp02 = (pkg.steps || []).find(s => s.id === 'CP-02');
requireCheck(pkg.revision === 2, 'PACKAGE_REVISION');
requireCheck(cp01?.status === 'PASS', 'PACKAGE_CP01');
requireCheck(cp02?.status === 'PASS', 'PACKAGE_CP02');
requireCheck(pkg.resumeProtocol?.firstIncompleteStep === 'CP-03', 'PACKAGE_NEXT_CP03');
requireCheck(ledger.productionReopeningPackage?.revision === 2, 'LEDGER_PACKAGE_REVISION');
requireCheck(ledger.productionReopeningPackage?.firstIncompleteStep === 'CP-03', 'LEDGER_NEXT_CP03');
requireCheck(ledger.history?.latestSealedConsumedRuntime?.requestOrdinal === 14, 'LEDGER_REQUEST14_LATEST');
requireCheck(writer.canonicalF2ContractAuthority === AUTHORITY_REL, 'WRITER_AUTHORITY_BINDING');
requireCheck(writer.nextHardeningStep === 'CP-03', 'WRITER_NEXT_CP03');

requireCheck(Array.isArray(f2Registry?.history ? Object.keys(f2Registry.history) : []), 'REGISTRY_HISTORY_SHAPE');
requireCheck((registry.canonicalOwners || []).some(o => o.id === 'router' && (o.requiredTokens || []).includes('script.async = false')), 'REGISTRY_BLOCK1_ROUTER_PRESERVED');
requireCheck((f2Registry?.history?.priorSourceLifecycleCandidateArtifactId ?? 0) === 9387820198, 'REGISTRY_HISTORICAL_BOUNDARY_PRESERVED');

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? 'CP01_CP02_CONTRACT_AUTHORITY_AUDIT_PASS' : 'CP01_CP02_CONTRACT_AUTHORITY_AUDIT_FAIL',
  failures,
  gateId: F2_GATE_ID,
  gateContractVersion: EXPECTED_VERSION,
  candidateArtifactId: EXPECTED_ARTIFACT,
  candidateSourceHead: EXPECTED_SOURCE,
  firstIncompleteStep: pkg.resumeProtocol?.firstIncompleteStep || null,
  runtimeAllowed: false,
  secretAccess: false,
  firestoreRead: false,
  browserExecuted: false,
  writes: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
