// One evidence-backed finding transition. This contract neither accepts the
// transversal authorization matrix nor advances B4-003 or a deployment gate.
export const institutionalGoalsClosureContract = Object.freeze({
  controlKey: 'b4003InstitutionalGoalsClosure20261030',
  findingId: 'B4-003-P0-20261012-INSTITUTIONAL-GOALS',
  status: 'RESOLVED_AUTHENTICATED_RUNTIME_PASS',
  scope: 'INSTITUTIONAL_GOALS_FUNCTIONAL_ONLY',
  authorityBaseHead: '7c8946fa8a8bf63f50a292f81c2d1005361f43f2',
  ledgerPath: 'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json',
  carryPath: 'artifacts/orbit360-recovery/release-control/I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  receiptPath: 'artifacts/orbit360-recovery/release-control/I6_5_B4_003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_20261030.json',
  ledgerBeforeBlob: '0a6544398da91784da5c331680866a8ec1491449',
  carryBeforeBlob: '2b935d0f0859075cc951a2e0a6cfcd0a8d958a02',
  guardPath: 'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  guardBeforeBlob: '6855387553ba493c6919e73b745fb8a567518c57',
  validatorPath: 'tools/gravicentra-b4-003-institutional-goals-closure.mjs',
  testPath: 'tools/gravicentra-b4-003-institutional-goals-closure.test.mjs',
  buildId: 'gi-i65-b4-a6e403119d9f-57f234755dc1',
  gtPath: 'artifacts/orbit360-recovery/release-control/I6_5_B4_003_METAS_UI_DIAGNOSTIC_RUNTIME_UAT_GT_20261030.json',
  gtBlob: '2bdee68026a99da098741852b32414340dd78f96',
  coPath: 'artifacts/orbit360-recovery/release-control/I6_5_B4_003_METAS_UI_DIAGNOSTIC_RUNTIME_UAT_CO_20261030.json',
  coBlob: '76164eca65b96b5fce2cd2135821e6ef23abdedb',
  carlosPath: 'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CARLOS_AUTHENTICATED_CONTINUITY_UAT_20261030.json'
});

const stable = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const need = (ok, code) => { if (!ok) throw new Error('B4_003_METAS_CLOSURE_' + code); };
const sha = value => /^[0-9a-f]{40}$/.test(String(value || ''));
const coreIds = ['01_identity_and_baseline', '02_server_inspect', '03_probe_and_start',
  '04_create_production_fixture', '05_edit_production_fixture', '06_create_collection_fixture',
  '07_reload_recovery', '08_audit_writes', '09_restore', '10_reload_after_restore',
  '11_audit_restore_survives', '12_real_data_unchanged'];
const falseBoundaries = ['realGoalConfigurationApplied', 'wholeDatabaseEqualityAsserted',
  'backendNegativeAuthenticatedAccepted', 'paulaVisualAcceptanceGranted', 'inicioFindingClosed',
  'personalCollectionFindingClosed', 'freelancerFindingClosed', 'b4003Closed', 'b4004Authorized',
  'productionAccepted', 'newPreviewDeployed', 'authIamRulesChanged', 'historicalReceiptsChanged'];

export function buildInstitutionalGoalsClosureLedger(baselineLedger, receiptBlobSha) {
  const k = institutionalGoalsClosureContract;
  const next = structuredClone(baselineLedger);
  const row = next.findings.find(item => item.id === k.findingId);
  Object.assign(row, {status: k.status, blocking: false, closureProof: {
    receiptPath: k.receiptPath, receiptBlobSha,
    previousStatus: 'OPEN_P0_NOT_ACCEPTED', previousBlocking: true, scope: k.scope
  }});
  next.countsSnapshotBeforeInstitutionalGoalsClosure20261030 = {
    recordType: 'HISTORICAL_COUNTS_SNAPSHOT',
    asOf: baselineLedger.counts.lastReconciledAt,
    sourceCommit: k.authorityBaseHead, sourceLedgerBlobSha: k.ledgerBeforeBlob,
    counts: structuredClone(baselineLedger.counts)
  };
  next.counts.currentBlocking = null;
  next.counts.currentBlockingB4003 = null;
  next.counts.currentBlockingStatus = 'NOT_DETERMINABLE_FROM_CURRENT_ADJUDICATED_CRITERIA';
  next.counts.currentBlockingScopeNote = 'The 12-Oct counts are preserved in the dated snapshot. This successor adjudicates one of six priority P0 findings only; it does not recompute the full ledger or reopen sealed B2/B3 gates.';
  next.currentSixPriorityP0Closure = {
    scope: 'SIX_PRIORITY_P0_FINDINGS_FROZEN_20261012_ONLY',
    findingIds: [...baselineLedger.p0Freeze20261012.addedFindingIds], total: 6, resolved: 1, open: 5,
    resolvedFindingIds: [k.findingId],
    openFindingIds: baselineLedger.p0Freeze20261012.addedFindingIds.filter(id => id !== k.findingId),
    receiptPath: k.receiptPath, receiptBlobSha,
    fullLedgerAcceptanceReconciled: false, b4003Closed: false,
    overallImplementationPercent: null, formalI6ProgressPercent: 50
  };
  return next;
}

export function buildInstitutionalGoalsClosureCarry(baselineCarry, ledger, ledgerBlobSha) {
  const k = institutionalGoalsClosureContract;
  const next = structuredClone(baselineCarry);
  const at = next.inventory.findIndex(row => row.id === k.findingId);
  need(at >= 0, 'BASE_CARRY_FINDING_MISSING');
  next.inventory[at] = structuredClone(ledger.findings.find(row => row.id === k.findingId));
  next.expectedLedgerNextBlobSha = ledgerBlobSha;
  next.currentSixPriorityP0Closure = structuredClone(ledger.currentSixPriorityP0Closure);
  next.attentionCountInterpretation = 'FOLLOW_UP_INVENTORY_COUNT_NOT_CURRENT_OPEN_FINDING_COUNT';
  return next;
}

export function validateInstitutionalGoalsClosure(input) {
  const k = institutionalGoalsClosureContract;
  const { control, baselineControl, ledger, carry, baselineLedger, baselineCarry,
    receipt, evidence, blobAtPath, parentBindingVerified } = input;
  const pointer = control[k.controlKey];
  if (!pointer) {
    need(blobAtPath(k.ledgerPath) === k.ledgerBeforeBlob &&
      blobAtPath(k.carryPath) === k.carryBeforeBlob, 'MISSING_SUCCESSOR_FOR_CHANGED_REGISTERS');
    return false;
  }
  need(parentBindingVerified === true, 'PARENT_NOT_VERIFIED');
  need(pointer.schema === 'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_CLOSURE_POINTER_V1' &&
    pointer.status === k.status && pointer.findingId === k.findingId &&
    pointer.authorityBaseHead === k.authorityBaseHead && sha(pointer.parentHead) &&
    pointer.receiptPath === k.receiptPath && sha(pointer.receiptBlobSha) &&
    pointer.receiptBlobSha === blobAtPath(k.receiptPath) &&
    pointer.ledgerBlobSha === blobAtPath(k.ledgerPath) &&
    pointer.carryBlobSha === blobAtPath(k.carryPath) &&
    pointer.priorityFindingClosuresGranted === 1 && pointer.b4003Closed === false &&
    pointer.productionAccepted === false, 'POINTER_INVALID');
  need(Object.keys(baselineControl).every(key => same(control[key], baselineControl[key])),
    'PRIOR_CONTROL_PLANE_KEY_CHANGED');
  need(receipt.schema === 'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_V1' &&
    receipt.status === k.status && receipt.findingId === k.findingId &&
    receipt.gate === 'I6.5/B4-003' && receipt.scope === k.scope &&
    receipt.authorityBaseHead === k.authorityBaseHead && receipt.parentHead === pointer.parentHead &&
    receipt.baseLedgerBlobSha === k.ledgerBeforeBlob && receipt.baseCarryBlobSha === k.carryBeforeBlob,
    'RECEIPT_IDENTITY_INVALID');
  need(falseBoundaries.every(key => receipt.boundaries?.[key] === false), 'SCOPE_EXPANDED');
  for (const [name, path] of [['guard', k.guardPath], ['validator', k.validatorPath], ['test', k.testPath]]) {
    const binding = receipt.governanceSources?.[name];
    need(binding?.path === path && sha(binding.blobSha) && binding.blobSha === blobAtPath(path) &&
      (name !== 'guard' || binding.beforeBlobSha === k.guardBeforeBlob),
      'GOVERNANCE_SOURCE_BLOB_INVALID_' + name.toUpperCase());
  }
  const accepted = receipt.accepted || {};
  need(accepted.adminCorePassed === 24 && accepted.adminCoreTotal === 24 &&
    same(accepted.adminCountries, ['GT', 'CO']) && accepted.carlosUiRoleCasesPassed === 6 &&
    accepted.carlosUiRoleCasesTotal === 6 && accepted.individualGoalsPreserved === true &&
    accepted.restoreAuditDurable === true, 'ACCEPTED_SCOPE_INVALID');
  for (const [name, path, pinned] of [['gt', k.gtPath, k.gtBlob], ['co', k.coPath, k.coBlob],
    ['carlos', k.carlosPath, null]]) {
    const ref = receipt.evidence?.[name];
    need(ref?.path === path && sha(ref.blobSha) && ref.blobSha === blobAtPath(path) &&
      (!pinned || ref.blobSha === pinned), 'EVIDENCE_BLOB_INVALID_' + name.toUpperCase());
  }
  for (const [name, country, currency, realInputs] of [['gt', 'GT', 'GTQ', 20], ['co', 'CO', 'COP', 14]]) {
    const doc = evidence[name], flow = doc.authenticatedUat, comparison = doc.realDataComparison;
    need(doc.identity?.buildId === k.buildId && flow?.country === country && flow.currency === currency &&
      flow.effectiveRole === 'SuperAdmin' && flow.calendarMonth === '2026-10' &&
      flow.reservedQaPeriod === 'QA-B4-003' && flow.coreStepsPassed === 12 && flow.coreStepsTotal === 12 &&
      flow.coreStepsFailed === 0 && Array.isArray(flow.coreSteps) && flow.coreSteps.length === 12 &&
      same(flow.coreSteps.map(row => row.id).sort(), [...coreIds].sort()) &&
      flow.coreSteps.every(row => row.status === 'PASS') &&
      flow.matchingVisibleWriteAuditRows === 3 && flow.matchingVisibleRestoreAuditRows === 1 &&
      flow.restorationAfterActualWritesConfirmedInUi === true &&
      flow.restoredSessionAbsentAfterReloadInUi === true && flow.restorationAccepted === true &&
      comparison?.realInputCount === realInputs && comparison.matchingValueCount === realInputs &&
      comparison.matchingAttributeCount === realInputs && comparison.visibleTotalCountCompared === 3 &&
      comparison.visibleTotalsUnchanged === true && comparison.globalDatabaseEqualityProven === false,
      'ADMIN_CORE_OR_PRESERVATION_INVALID_' + country);
  }
  const carlos = evidence.carlos?.institutionalGoalsRoleBoundary;
  const expectedPairs = ['Operativo:GT', 'Operativo:CO', 'Operativo:TODOS',
    'Asesor:GT', 'Asesor:CO', 'Asesor:TODOS'].sort();
  need(carlos?.independentAuthenticatedIdentity === true && carlos.actor === 'Carlos Castro' &&
    carlos.buildId === k.buildId && Array.isArray(carlos.cases) && carlos.cases.length === 6 &&
    same(carlos.cases.map(row => row.role + ':' + row.country).sort(), expectedPairs) &&
    carlos.cases.every(row => row.uiAccessDenied === true && row.qaControlsAbsent === true &&
      row.backendDenialTested === false && /^2026-10-3[01]T/.test(String(row.observedAtUtc || '')) &&
      Number.isFinite(Date.parse(row.observedAtUtc))), 'CARLOS_UI_BOUNDARY_INCOMPLETE');

  const target = baselineLedger.findings?.find(row => row.id === k.findingId);
  need(target?.status === 'OPEN_P0_NOT_ACCEPTED' && target.blocking === true &&
    baselineLedger.findings.length === 295 && baselineCarry.inventory?.length === 295,
    'BASE_FINDING_INVALID');
  const expectedLedger = buildInstitutionalGoalsClosureLedger(baselineLedger, pointer.receiptBlobSha);
  need(same(ledger, expectedLedger), 'LEDGER_DELTA_NOT_EXACT_ONE_FINDING');
  const expectedCarry = buildInstitutionalGoalsClosureCarry(baselineCarry, expectedLedger, pointer.ledgerBlobSha);
  need(same(carry, expectedCarry), 'CARRY_DELTA_NOT_EXACT_ONE_FINDING');
  return true;
}
