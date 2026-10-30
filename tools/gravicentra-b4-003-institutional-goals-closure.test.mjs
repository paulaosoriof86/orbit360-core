import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {institutionalGoalsClosureContract as k,
  validateInstitutionalGoalsClosure as validate,
  buildInstitutionalGoalsClosureLedger, buildInstitutionalGoalsClosureCarry}
  from './gravicentra-b4-003-institutional-goals-closure.mjs';

// These cases exercise a governance validator with synthetic Carlos observations.
// They do not constitute authenticated UAT, acceptance, a deployment or data writes.
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const encode = object => JSON.stringify(object, null, 2) + '\n';
const blob = value => {
  const bytes = Buffer.from(typeof value === 'string' ? value : encode(value));
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};
const controlPath = 'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const baseFromFile = path => read(path);

function fixture() {
  const baselineControl = baseFromFile(controlPath);
  delete baselineControl[k.controlKey];
  const baselineLedger = baseFromFile(k.ledgerPath);
  if (baselineLedger.countsSnapshotBeforeInstitutionalGoalsClosure20261030)
    baselineLedger.counts = structuredClone(baselineLedger.countsSnapshotBeforeInstitutionalGoalsClosure20261030.counts);
  delete baselineLedger.countsSnapshotBeforeInstitutionalGoalsClosure20261030;
  delete baselineLedger.currentSixPriorityP0Closure;
  const before = baselineLedger.findings.find(row => row.id === k.findingId);
  // The test remains useful after the real closure is integrated: reconstruct
  // exactly the three fields this single transition is allowed to change.
  before.status = 'OPEN_P0_NOT_ACCEPTED'; before.blocking = true; delete before.closureProof;
  const baselineCarry = baseFromFile(k.carryPath);
  delete baselineCarry.currentSixPriorityP0Closure;
  delete baselineCarry.attentionCountInterpretation;
  baselineCarry.inventory[baselineCarry.inventory.findIndex(row => row.id === k.findingId)] = structuredClone(before);
  baselineCarry.expectedLedgerNextBlobSha = k.ledgerBeforeBlob;
  const evidence = {gt: read(k.gtPath), co: read(k.coPath), carlos: {
    testFixtureOnly: true,
    institutionalGoalsRoleBoundary: {
      independentAuthenticatedIdentity: true, actor: 'Carlos Castro', buildId: k.buildId,
      cases: ['Operativo', 'Asesor'].flatMap(role => ['GT', 'CO', 'TODOS'].map(country => ({
        role, country, observedAtUtc: '2026-10-30T23:00:00.000Z', uiAccessDenied: true,
        qaControlsAbsent: true, backendDenialTested: false
      })))
    }
  }};
  const receipt = {
    schema: 'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_V1',
    status: k.status, findingId: k.findingId, gate: 'I6.5/B4-003', scope: k.scope,
    authorityBaseHead: k.authorityBaseHead, parentHead: k.authorityBaseHead,
    baseLedgerBlobSha: k.ledgerBeforeBlob, baseCarryBlobSha: k.carryBeforeBlob,
    evidence: {gt: {path: k.gtPath, blobSha: k.gtBlob}, co: {path: k.coPath, blobSha: k.coBlob},
      carlos: {path: k.carlosPath, blobSha: ''}},
    governanceSources: {
      guard: {path:k.guardPath,beforeBlobSha:k.guardBeforeBlob,blobSha:blob(fs.readFileSync(k.guardPath,'utf8'))},
      validator: {path:k.validatorPath,blobSha:blob(fs.readFileSync(k.validatorPath,'utf8'))},
      test: {path:k.testPath,blobSha:blob(fs.readFileSync(k.testPath,'utf8'))}
    },
    accepted: {adminCorePassed: 24, adminCoreTotal: 24, adminCountries: ['GT', 'CO'],
      carlosUiRoleCasesPassed: 6, carlosUiRoleCasesTotal: 6, individualGoalsPreserved: true,
      restoreAuditDurable: true},
    boundaries: Object.fromEntries(['realGoalConfigurationApplied', 'wholeDatabaseEqualityAsserted',
      'backendNegativeAuthenticatedAccepted', 'paulaVisualAcceptanceGranted', 'inicioFindingClosed',
      'personalCollectionFindingClosed', 'freelancerFindingClosed', 'b4003Closed', 'b4004Authorized',
      'productionAccepted', 'newPreviewDeployed', 'authIamRulesChanged', 'historicalReceiptsChanged']
      .map(key => [key, false]))
  };
  const input = {control: structuredClone(baselineControl), baselineControl,
    ledger: structuredClone(baselineLedger), carry: structuredClone(baselineCarry),
    baselineLedger, baselineCarry, receipt, evidence, parentBindingVerified: true};
  input.ledger = buildInstitutionalGoalsClosureLedger(baselineLedger, '');
  const revised = input.ledger.findings.find(row => row.id === k.findingId);
  input.carry = buildInstitutionalGoalsClosureCarry(baselineCarry, input.ledger, '');
  input.control[k.controlKey] = {schema: 'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_CLOSURE_POINTER_V1',
    status: k.status, findingId: k.findingId, authorityBaseHead: k.authorityBaseHead,
    parentHead: k.authorityBaseHead, receiptPath: k.receiptPath, receiptBlobSha: '', ledgerBlobSha: '',
    carryBlobSha: '', priorityFindingClosuresGranted: 1, b4003Closed: false, productionAccepted: false};
  const refresh = () => {
    receipt.evidence.carlos.blobSha = blob(evidence.carlos);
    const pointer = input.control[k.controlKey];
    pointer.receiptBlobSha = blob(receipt); revised.closureProof.receiptBlobSha = pointer.receiptBlobSha;
    input.ledger.currentSixPriorityP0Closure.receiptBlobSha = pointer.receiptBlobSha;
    pointer.ledgerBlobSha = blob(input.ledger);
    input.carry.inventory[input.carry.inventory.findIndex(row => row.id === k.findingId)] = structuredClone(revised);
    input.carry.currentSixPriorityP0Closure = structuredClone(input.ledger.currentSixPriorityP0Closure);
    input.carry.expectedLedgerNextBlobSha = pointer.ledgerBlobSha;
    pointer.carryBlobSha = blob(input.carry);
  };
  input.blobAtPath = path => ({[k.ledgerPath]: blob(input.ledger), [k.carryPath]: blob(input.carry),
    [k.receiptPath]: blob(receipt), [k.gtPath]: k.gtBlob, [k.coPath]: k.coBlob,
    [k.carlosPath]: blob(evidence.carlos)})[path] ?? blob(fs.readFileSync(path,'utf8'));
  refresh();
  return {input, refresh};
}

test('one scoped functional closure is accepted without accepting R04, visual or LIVE', () => {
  const {input} = fixture(); assert.equal(validate(input), true);
  assert.equal(input.receipt.boundaries.backendNegativeAuthenticatedAccepted, false);
  assert.equal(input.receipt.boundaries.b4003Closed, false);
});
test('duplicating one Carlos case cannot replace another role/country case', () => {
  const {input, refresh} = fixture();
  input.evidence.carlos.institutionalGoalsRoleBoundary.cases[5] = structuredClone(input.evidence.carlos.institutionalGoalsRoleBoundary.cases[4]);
  refresh(); assert.throws(() => validate(input), /CARLOS_UI_BOUNDARY_INCOMPLETE/);
});
test('same-identity role switching cannot become independent Carlos acceptance', () => {
  const {input, refresh} = fixture(); input.evidence.carlos.institutionalGoalsRoleBoundary.independentAuthenticatedIdentity = false;
  refresh(); assert.throws(() => validate(input), /CARLOS_UI_BOUNDARY_INCOMPLETE/);
});
test('UI denial cannot be mislabeled as authenticated backend denial', () => {
  const {input, refresh} = fixture(); input.evidence.carlos.institutionalGoalsRoleBoundary.cases[0].backendDenialTested = true;
  refresh(); assert.throws(() => validate(input), /CARLOS_UI_BOUNDARY_INCOMPLETE/);
});
test('a new artifact cannot silently reuse the completed actor matrix', () => {
  const {input, refresh} = fixture(); input.evidence.carlos.institutionalGoalsRoleBoundary.buildId += '-changed';
  refresh(); assert.throws(() => validate(input), /CARLOS_UI_BOUNDARY_INCOMPLETE/);
});
test('a missing restore audit cannot close the finding', () => {
  const {input} = fixture(); input.evidence.co.authenticatedUat.matchingVisibleRestoreAuditRows = 0;
  assert.throws(() => validate(input), /ADMIN_CORE_OR_PRESERVATION_INVALID_CO/);
});
test('individual goal preservation is necessary', () => {
  const {input} = fixture(); input.evidence.gt.realDataComparison.matchingValueCount = 19;
  assert.throws(() => validate(input), /ADMIN_CORE_OR_PRESERVATION_INVALID_GT/);
});
test('changing another finding still fails even with internally updated document hashes', () => {
  const {input, refresh} = fixture(); input.ledger.findings.find(row => row.id !== k.findingId).status = k.status;
  refresh(); assert.throws(() => validate(input), /LEDGER_DELTA_NOT_EXACT_ONE_FINDING/);
});
test('removing an inventory item cannot be hidden by rehashing carry', () => {
  const {input, refresh} = fixture(); input.carry.inventory.splice(0, 1);
  refresh(); assert.throws(() => validate(input), /CARRY_DELTA_NOT_EXACT_ONE_FINDING/);
});
test('historical metadata and receipt references remain unchanged', () => {
  const {input, refresh} = fixture(); input.ledger.p0Freeze20261012.status = 'PASS';
  refresh(); assert.throws(() => validate(input), /LEDGER_DELTA_NOT_EXACT_ONE_FINDING/);
});
test('prior control-plane authority cannot be changed by this additive closure', () => {
  const {input} = fixture(); input.control.i6Execution.livePromotionAuthorized = true;
  assert.throws(() => validate(input), /PRIOR_CONTROL_PLANE_KEY_CHANGED/);
});
test('a closure cannot grant production acceptance', () => {
  const {input, refresh} = fixture(); input.receipt.boundaries.productionAccepted = true;
  refresh(); assert.throws(() => validate(input), /SCOPE_EXPANDED/);
});
test('an unverified Git parent blocks the transition', () => {
  const {input} = fixture(); input.parentBindingVerified = false;
  assert.throws(() => validate(input), /PARENT_NOT_VERIFIED/);
});
test('register changes without the explicit successor pointer fail closed', () => {
  const {input} = fixture(); delete input.control[k.controlKey];
  assert.throws(() => validate(input), /MISSING_SUCCESSOR_FOR_CHANGED_REGISTERS/);
});
test('historical counts remain available without pretending to be a current blocker total', () => {
  const {input} = fixture(); assert.equal(validate(input), true);
  assert.equal(input.ledger.counts.currentBlocking, null);
  assert.equal(input.ledger.counts.currentBlockingB4003, null);
  assert.deepEqual(input.ledger.countsSnapshotBeforeInstitutionalGoalsClosure20261030.counts, input.baselineLedger.counts);
  assert.equal(input.ledger.counts.lastReconciledAt, input.baselineLedger.counts.lastReconciledAt);
  assert.deepEqual(input.ledger.currentSixPriorityP0Closure.resolvedFindingIds, [k.findingId]);
  assert.equal(input.ledger.currentSixPriorityP0Closure.openFindingIds.length, 5);
  assert.equal(input.carry.attentionCount, input.carry.attentionIds.length);
});
test('a guessed global blocker count is rejected even when all hashes are updated', () => {
  const {input, refresh} = fixture(); input.ledger.counts.currentBlocking = 116;
  refresh(); assert.throws(() => validate(input), /LEDGER_DELTA_NOT_EXACT_ONE_FINDING/);
});
test('a governance source change needs its own exact blob binding', () => {
  const {input, refresh} = fixture(); input.receipt.governanceSources.guard.blobSha = '0'.repeat(40);
  refresh(); assert.throws(() => validate(input), /GOVERNANCE_SOURCE_BLOB_INVALID_GUARD/);
});
