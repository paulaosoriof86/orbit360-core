#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {
  milestoneKind,
  assertReleaseMilestoneFrozen,
  assertFollowupConsistency,
  assertStaticGateContractParity
} from './orbit360-single-state-contract-v20260827.mjs';

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const A = p => path.join(ROOT, p);
const T = p => fs.readFileSync(A(p), 'utf8').replace(/^\uFEFF/, '');
const J = p => JSON.parse(T(p));

const LEDGER = 'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REG = 'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const WF = '.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const CAN = 'orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json';
const SEM = 'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json';
const PRODUCT_REG = 'orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const PRODUCT_GUARD = 'tools/orbit360-certified-product-preservation-v20260827.mjs';
const ASEG_REG = 'orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const BASELINE = 'orbit360-platform/docs/orbit360-control-plane-frozen-baseline-v20260827.json';
const OWNER = 'tools/orbit360-single-state-ledger-owner-v20260827.mjs';
const STATE = 'tools/orbit360-single-state-contract-v20260827.mjs';
const SELF = 'tools/orbit360-single-state-invariant-v20260827.mjs';
const PUBLISHER = 'tools/orbit360-control-plane-publication-preflight-v20260825.mjs';
const ROOTFIX_HANDLER = 'tools/orbit360-semantic-single-state-rootfix-handler-v20260827.mjs';
const args = process.argv.slice(2);

const fail = (code, detail = {}) => {
  console.error(JSON.stringify({
    ok: false,
    status: 'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_FAIL',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    code,
    ...detail,
    containsPII: false,
    containsSecrets: false
  }));
  process.exit(41);
};

function gitBlobSha(buf) {
  return createHash('sha1').update(Buffer.from(`blob ${buf.length}\0`)).update(buf).digest('hex');
}

function structural() {
  const required = [
    LEDGER, REG, WF, CAN, SEM, PRODUCT_REG, PRODUCT_GUARD, ASEG_REG,
    BASELINE, OWNER, STATE, SELF, PUBLISHER, ROOTFIX_HANDLER
  ];
  for (const p of required) {
    if (!fs.existsSync(A(p))) throw new Error(`SINGLE_STATE_DEPENDENCY_MISSING:${p}`);
  }

  assertStaticGateContractParity(ROOT, c => { throw new Error(c); });

  const L = J(LEDGER);
  const R = J(REG);
  const C = J(CAN);
  const S = J(SEM);
  const P = J(PRODUCT_REG);
  const AR = J(ASEG_REG);
  const B = J(BASELINE);
  const wf = T(WF);

  if (
    R.schemaVersion !== 'orbit360-continuity-writer-registry-v29-source-only-orphan-recovery' ||
    R.active !== true || R.stateBearing !== false || R.dynamicStateForbidden !== true ||
    R.sourceOfTruth !== LEDGER ||
    JSON.stringify(R.stateBearingFiles) !== JSON.stringify([LEDGER]) ||
    R.projectionTargets?.length !== 0
  ) throw new Error('SINGLE_STATE_WRITER_REGISTRY_STATIC_CONTRACT_INVALID');

  if (
    R.policies?.ledgerIsSoleSemanticOperationalState !== true ||
    R.policies?.dynamicModuleStateInStaticRegistriesForbidden !== true ||
    R.policies?.functionalAcceptanceInProductPreservationForbidden !== true ||
    R.policies?.moduleSpecificAssertionsInGlobalWorkflowForbidden !== true ||
    R.policies?.antiStaleSelftestRequired !== true ||
    R.policies?.sourceOnlyOrphanClaimRecoveryMustNotCreateSecondClaim !== true ||
    R.policies?.sourceOnlyOrphanClaimRecoveryMustReduceOriginalClaim !== true
  ) throw new Error('SINGLE_STATE_SEMANTIC_POLICIES_INVALID');

  if (
    R.transitionOwner !== OWNER || R.singleStateInvariant !== SELF ||
    R.stateContract !== STATE || R.publicationTransactionOwner !== PUBLISHER ||
    R.canonicalWorkflow !== WF || R.frozenBaseline !== BASELINE
  ) throw new Error('SINGLE_STATE_ACTIVE_BINDING_INVALID');

  if (
    P.schemaVersion !== 'orbit360-certified-product-preservation-registry-v3-static-integrity' ||
    P.stateBearing !== false || P.dynamicStateForbidden !== true ||
    P.dynamicOperationalStateAuthority !== LEDGER
  ) throw new Error('PRODUCT_REGISTRY_NOT_STATIC');

  const productRules = P.preservationRule || {};
  if (
    productRules.functionalAcceptanceStateForbiddenHere !== true ||
    productRules.moduleLineageStateForbiddenHere !== true ||
    productRules.productMutationOnGuardFailure !== false ||
    productRules.dataMutationOnGuardFailure !== false ||
    productRules.goLiveReopenOnGuardFailure !== false
  ) throw new Error('PRODUCT_PRESERVATION_STATIC_POLICY_INVALID');

  const forbiddenOperationalKeys = [
    'moduleLineage', 'liveVisualStatus', 'visualPass', 'openDelta',
    'visualValidationSequence', 'candidateToHeadLastSuccessfulRunId',
    'candidateWideRecheckRunId', 'lastCausalGuardRunId'
  ];
  const productRegistrySerialized = JSON.stringify(P);
  const duplicatedKeys = forbiddenOperationalKeys.filter(k => productRegistrySerialized.includes(`"${k}"`));
  if (duplicatedKeys.length) {
    throw new Error(`PRODUCT_REGISTRY_OPERATIONAL_STATE_DUPLICATION:${duplicatedKeys.join(',')}`);
  }

  // Do not grep PRODUCT_GUARD source for words such as "moduleLineage" or "visualPass".
  // A validator must be allowed to name forbidden concepts while enforcing that they are absent
  // from the structured registry. The guard itself is validated by its static contract, execution
  // output in the canonical workflow, and frozen source identity below.

  if (
    AR.schemaVersion !== 'orbit360-aseguradoras-preservation-registry-v2-static-owner-contract' ||
    AR.stateBearing !== false || AR.dynamicStateForbidden !== true ||
    AR.dynamicOperationalStateAuthority !== LEDGER ||
    AR.domainPreservationValidator?.globalControlPlaneDependency !== false
  ) throw new Error('ASEGURADORAS_REGISTRY_NOT_STATIC');

  if (/ORBIT360_ASEGURADORAS_PRESERVATION|ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS|aseguradorasLineageStatus|cliente360LineageStatus|cliente360LineageProofStatus/.test(wf)) {
    throw new Error('GLOBAL_WORKFLOW_CONTAINS_MODULE_SPECIFIC_STATE');
  }
  if (
    !wf.includes('CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS') ||
    !wf.includes('v3-static-product-integrity') ||
    !wf.includes('SINGLE_STATE_ANTI_STALE_SELFTEST_PASS')
  ) throw new Error('GLOBAL_WORKFLOW_GENERIC_PRECHECK_INCOMPLETE');

  if (
    C.canonicalPlan !== 'orbit360-platform/docs/PLAN-MAESTRO-DEFINITIVO-PRODUCCION-POSTPRODUCCION-ANTI-LOOP-ORBIT360-AYS-20260826.md' ||
    C.singleMutableOperationalState !== LEDGER ||
    C.rules?.allDynamicOperationalStateMustLiveInLedger !== true ||
    C.rules?.moduleSpecificGlobalWorkflowAssertionsForbidden !== true
  ) throw new Error('CANONICALITY_SEMANTIC_SINGLE_STATE_INVALID');

  if (
    S.singleMutableOperationalState !== LEDGER || S.dynamicStateMustBeReadFromLedger !== true ||
    S.behavioralContractPolicy?.dynamicModuleStateInStaticRegistriesForbidden !== true ||
    S.behavioralContractPolicy?.preservationGuardFunctionalAcceptanceForbidden !== true ||
    S.behavioralContractPolicy?.antiStaleSelftestRequired !== true
  ) throw new Error('SEMANTIC_CONTRACT_SINGLE_STATE_INVALID');

  if (
    B.schemaVersion !== 'orbit360-control-plane-frozen-baseline-v7-semantic-single-state-static-identities' ||
    B.stateBearing !== false || B.dynamicStateForbidden !== true ||
    B.currentOperationalStateAuthority !== LEDGER ||
    B.supersedes !== 'orbit360-platform/docs/orbit360-control-plane-frozen-baseline-v20260826.json'
  ) throw new Error('CONTROL_PLANE_STATIC_BASELINE_INVALID');

  for (const [p, sha] of Object.entries(B.sourceIdentities || {})) {
    if (!fs.existsSync(A(p))) throw new Error(`CONTROL_PLANE_BASELINE_SOURCE_MISSING:${p}`);
    const actual = gitBlobSha(fs.readFileSync(A(p)));
    if (actual !== sha) throw new Error(`CONTROL_PLANE_BASELINE_SOURCE_DRIFT:${p}`);
  }

  if (!milestoneKind(L)) throw new Error('SINGLE_STATE_LEDGER_CURRENT_MILESTONE_INVALID');
  assertReleaseMilestoneFrozen(L, c => { throw new Error(c); });
  assertFollowupConsistency(L, c => { throw new Error(c); });
  if (
    L.activeState?.phase === 'PRODUCTION_SMOKE_PASS' &&
    L.activeState?.status === 'PRODUCTION_GO_LIVE_PASS' &&
    Number(L.progress?.productionRouteProgressPct) !== 100
  ) throw new Error('GO_LIVE_RELEASE_PROGRESS_REGRESSION');

  const e = L.continuityControl?.latestDurableEvidence;
  if (L.progress?.f2TerminalPass === true && e?.path && fs.existsSync(A(e.path))) {
    const E = J(e.path);
    if (
      E.ok !== true || E.classification !== 'PASS' ||
      Number(E.firestoreWrites) !== 0 || Number(E.authWrites) !== 0 ||
      Number(E.operationalWrites) !== 0
    ) throw new Error('SINGLE_STATE_TERMINAL_EVIDENCE_INVALID');
  }

  const rootfix = R.executionTransitions?.POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL;
  if (
    !rootfix || rootfix.capabilityClass !== 'SOURCE_ONLY' ||
    rootfix.operationalStatePatch !== true || rootfix.freezeProductDuringClaim !== true ||
    rootfix.freezeDataDuringClaim !== true || rootfix.handler !== ROOTFIX_HANDLER ||
    rootfix.handlerReady !== true
  ) throw new Error('SEMANTIC_SINGLE_STATE_ROOTFIX_TRANSITION_INVALID');

  const orphanRecovery = R.executionTransitions?.CONTROL_PLANE_RECOVER_ORPHANED_SOURCE_ONLY_TERMINAL;
  if (
    !orphanRecovery || orphanRecovery.capabilityClass !== 'SOURCE_ONLY' ||
    orphanRecovery.stateMutation !== 'NONE' || orphanRecovery.recoveryOnly !== true ||
    orphanRecovery.handler !== ROOTFIX_HANDLER || orphanRecovery.handlerReady !== true ||
    orphanRecovery.recoveryContract?.activeClaimRequired !== true ||
    orphanRecovery.recoveryContract?.claimedCapabilityClass !== 'SOURCE_ONLY' ||
    orphanRecovery.recoveryContract?.privilegedRiskForbidden !== true ||
    orphanRecovery.recoveryContract?.authorizationConsumptionForbidden !== true ||
    orphanRecovery.recoveryContract?.statePatchDigestMustMatchActiveClaim !== true ||
    orphanRecovery.recoveryContract?.terminalReducedByCanonicalOwner !== true ||
    orphanRecovery.recoveryContract?.ledgerOnlyPublication !== true ||
    orphanRecovery.recoveryContract?.productMutation !== false ||
    orphanRecovery.recoveryContract?.dataMutation !== false ||
    orphanRecovery.recoveryContract?.runtime !== false ||
    orphanRecovery.recoveryContract?.browser !== false ||
    orphanRecovery.recoveryContract?.secrets !== false ||
    orphanRecovery.recoveryContract?.firestoreRead !== false ||
    orphanRecovery.recoveryContract?.deploy !== false ||
    orphanRecovery.recoveryContract?.production !== false
  ) throw new Error('SOURCE_ONLY_ORPHAN_RECOVERY_CONTRACT_INVALID');

  return {L};
}

try {
  const snapshot = structural();
  if (args.includes('--anti-stale-selftest')) {
    const mutated = structuredClone(snapshot.L);
    mutated.functionalValidation = {
      status: 'SYNTHETIC_NEW_EVIDENCE',
      revision: (Number(mutated.functionalValidation?.revision) || 0) + 1,
      containsPII: false,
      containsSecrets: false
    };
    if (!milestoneKind(mutated)) throw new Error('ANTI_STALE_LEDGER_MILESTONE_REJECTED_DYNAMIC_EVIDENCE');
    assertReleaseMilestoneFrozen(mutated, c => { throw new Error(c); });
    assertFollowupConsistency(mutated, c => { throw new Error(c); });
    console.log(JSON.stringify({
      ok: true,
      status: 'SINGLE_STATE_ANTI_STALE_SELFTEST_PASS',
      classification: 'PASS',
      dynamicEvidenceMutationRequiresStaticConsumerEdit: false,
      syntheticLedgerEvidenceMutationAccepted: true,
      structuralInvariantReused: true,
      validatorSelfReferenceFalsePositiveBlocked: true,
      orphanSourceOnlyRecoveryContractValidated: true,
      runtimeExecuted: false,
      browserExecuted: false,
      secretAccess: false,
      firestoreRead: false,
      deployExecuted: false,
      productionTouched: false,
      containsPII: false,
      containsSecrets: false
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      ok: true,
      status: 'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS',
      classification: 'PASS',
      semanticSingleState: true,
      staticRegistries: true,
      genericWorkflow: true,
      pureProductPreservation: true,
      baselineIdentityValidated: true,
      validatorSelfReferenceFalsePositiveBlocked: true,
      orphanSourceOnlyRecoveryContractValidated: true,
      runtimeExecuted: false,
      browserExecuted: false,
      secretAccess: false,
      firestoreRead: false,
      deployExecuted: false,
      productionTouched: false,
      containsPII: false,
      containsSecrets: false
    }, null, 2));
  }
} catch (error) {
  fail(String(error?.message || error));
}
