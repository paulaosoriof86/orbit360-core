#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const LEDGER_REL = 'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const PACKAGE_REL = 'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json';
const abs = rel => path.join(ROOT, rel);
const readText = rel => fs.readFileSync(abs(rel), 'utf8').replace(/^\uFEFF/, '');
const readJson = rel => JSON.parse(readText(rel));
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const writeAtomic = (rel, value) => {
  const target = abs(rel);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  const tmp = `${target}.orbit360-tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, target);
};

const args = process.argv.slice(2);
const valueOf = flag => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const expectedRevision = Number(valueOf('--expected-revision'));
const expectedPackageRevision = Number(valueOf('--expected-package-revision'));
const transitionId = String(valueOf('--transition') || '');
const dryRun = args.includes('--dry-run');
if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error('EXPECTED_REVISION_REQUIRED');
if (!Number.isInteger(expectedPackageRevision) || expectedPackageRevision < 0) throw new Error('EXPECTED_PACKAGE_REVISION_REQUIRED');
if (!transitionId) throw new Error('TRANSITION_ID_REQUIRED');

const ledgerTextBefore = readText(LEDGER_REL);
const packageTextBefore = readText(PACKAGE_REL);
const ledger = JSON.parse(ledgerTextBefore);
const pkg = JSON.parse(packageTextBefore);
if (ledger.revision !== expectedRevision) throw new Error(`EXPECTED_REVISION_MISMATCH:${expectedRevision}:${ledger.revision}`);
if (pkg.revision !== expectedPackageRevision) throw new Error(`EXPECTED_PACKAGE_REVISION_MISMATCH:${expectedPackageRevision}:${pkg.revision}`);
if (ledger.productionReopeningPackage?.revision !== pkg.revision) throw new Error('LEDGER_PACKAGE_REVISION_DRIFT');
if (ledger.productionReopeningPackage?.firstIncompleteStep !== pkg.resumeProtocol?.firstIncompleteStep) throw new Error('LEDGER_PACKAGE_STEP_DRIFT');

const transitions = {
  'CP03_PASS_TO_CP04': {from:'CP-03', pass:'CP-03', to:'CP-04', next:'CP-04_MAKE_CONTINUITY_PROJECTION_ATOMIC', root:'CP03_PASS_CP04_PENDING'},
  'CP04_PASS_TO_CP05': {from:'CP-04', pass:'CP-04', to:'CP-05', next:'CP-05_EXPAND_COMPOSITE_CONTROL_PLANE_INVARIANT', root:'CP04_PASS_CP05_PENDING'},
  'CP05_PASS_TO_CP06': {from:'CP-05', pass:'CP-05', to:'CP-06', next:'CP-06_ADD_TRANSVERSAL_STORE_AMPLIFICATION_SYNTHETIC', root:'CP05_PASS_CP06_PENDING'},
  'CP06_PASS_TO_CP07': {from:'CP-06', pass:'CP-06', to:'CP-07', next:'CP-07_ISOLATE_LEGACY_WORKFLOW_OPERATIONAL_SURFACE', root:'CP06_PASS_CP07_PENDING'},
  'CP07_PASS_TO_CP08': {from:'CP-07', pass:'CP-07', to:'CP-08', next:'CP-08_RUN_INTEGRATED_SOURCE_ONLY_SYNTHETIC_AUDIT', root:'CP07_PASS_CP08_PENDING'},
  'CP08_PASS_TO_CP09': {from:'CP-08', pass:'CP-08', to:'CP-09', next:'CP-09_INDEPENDENT_CONTROL_PLANE_READBACK', root:'CP08_PASS_CP09_PENDING'},
  'CP09_PASS_TO_CP10': {from:'CP-09', pass:'CP-09', to:'CP-10', next:'CP-10_CLOSE_PRODUCTION_REOPENING_PACKAGE', root:'CP09_PASS_CP10_PENDING'}
};
const t = transitions[transitionId];
if (!t) throw new Error('TRANSITION_NOT_ALLOWED');
if (pkg.status !== 'OPEN_FAIL_CLOSED') throw new Error('PACKAGE_MUST_BE_OPEN_FAIL_CLOSED');
if (pkg.resumeProtocol?.firstIncompleteStep !== t.from) throw new Error(`TRANSITION_FROM_MISMATCH:${t.from}:${pkg.resumeProtocol?.firstIncompleteStep}`);
const step = (pkg.steps || []).find(s => s.id === t.pass);
if (!step || step.status !== 'PENDING') throw new Error(`TRANSITION_STEP_NOT_PENDING:${t.pass}`);

step.status = 'PASS';
step.completedBy = 'tools/orbit360-continuity-transition-owner-v20260820.mjs';
pkg.revision += 1;
pkg.updatedAtUtc = new Date().toISOString();
pkg.resumeProtocol.firstIncompleteStep = t.to;
pkg.resumeProtocol.nextActionExact = t.next;
pkg.iterationBudget = pkg.iterationBudget || {};

ledger.revision += 1;
ledger.updatedAtUtc = pkg.updatedAtUtc;
ledger.activeState.rootCauseStatus = t.root;
ledger.productionReopeningPackage.revision = pkg.revision;
ledger.productionReopeningPackage.firstIncompleteStep = t.to;
ledger.productionReopeningPackage.nextActionExact = t.next;
ledger.nextAction = {id:t.next, description:`Continue production reopening package from ${t.to}.`, runtimeAllowed:false};
ledger.lanes.B_backend_security_gates = `CONTROL_PLANE_HARDENING_${t.to.replace('-','')}_REQUIRED_FAIL_CLOSED`;

const ledgerTextCheck = readText(LEDGER_REL);
const packageTextCheck = readText(PACKAGE_REL);
if (digest(ledgerTextCheck) !== digest(ledgerTextBefore) || digest(packageTextCheck) !== digest(packageTextBefore)) throw new Error('LOCAL_CONCURRENT_MUTATION_DETECTED');

const result = {
  ok:true,
  status:'ORBIT360_CONTINUITY_TRANSITION_PREPARED',
  transitionId,
  fromLedgerRevision:expectedRevision,
  toLedgerRevision:ledger.revision,
  fromPackageRevision:expectedPackageRevision,
  toPackageRevision:pkg.revision,
  firstIncompleteStep:t.to,
  dryRun,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
if (!dryRun) {
  writeAtomic(PACKAGE_REL, pkg);
  writeAtomic(LEDGER_REL, ledger);
}
console.log(JSON.stringify(result, null, 2));
