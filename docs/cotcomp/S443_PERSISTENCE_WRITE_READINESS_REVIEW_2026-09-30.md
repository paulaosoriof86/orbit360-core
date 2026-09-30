# CotComp S4.43 · Persistence / Write Readiness Review

**Date:** 2026-09-30  
**Status:** `SOURCE-ONLY REVIEW / S4.42 FUNCTIONAL BASELINE PRESERVED / PERSISTENCE OFF / WRITES OFF / REAL DATA OFF / PRODUCTION OFF`

## Objective

Review exactly what would be required before CotComp may perform its first controlled persistence write.

S4.43 does **not** authorize or execute writes.

## Evidence baseline

S4.42 is frozen as the functional LAB baseline:
- four LAB callables live;
- valid App Check invocation PASS;
- replay-protected Submit/Select PASS;
- secure debug-token custody;
- least-privilege token-verifier IAM;
- 283/283 QA at the S4.42 evidence head;
- persistence OFF;
- app-data writes 0;
- real data 0;
- production untouched.

## Source capabilities already present

- canonical entities: quoteCases, proposals, comparisonSets, selections, caseAccess, idempotency, events;
- deterministic case/correlation/workflow IDs;
- idempotency replay-conflict semantics;
- hash-only case-access token persistence;
- explicit-user-choice selection truth;
- dry-run persistence compiler;
- storage path allowlist;
- secure writer envelope;
- negative-security harness;
- canonical Gravicentra source support for cotcompRef.

## Source alignment remediated in S4.43

1. Runtime PII retention metadata no longer says `GOVERNANCE_LEGAL_DECISION_REQUIRED`.
   It now points to the already-frozen Owner internal S4.26 policy:
   - inactive draft: 30 days;
   - submitted/not converted: 12 months;
   - case access: 7 days;
   - raw token persistence forbidden;
   - converted case -> Gravicentra client/policy governance;
   - legalComplianceVerified remains false.

2. Workflow-extension contract now binds to canonical S4.20 owner blob:
   `73e09a4404cb4298dc34c9c38e26ad1f960d3170`.

This source binding does not claim that the exact owner blob has been deployed to the future CotComp workflow-projection runtime.

## Material blockers before any write

1. Storage adapter:
   `READY=false`, `EXECUTION_ENABLED=false`, `WRITES_ENABLED=false`, `DRIVER_CALLS_ALLOWED=false`.

2. Writer:
   execution, writes and dependency calls remain false.

3. No concrete Firestore CotComp storage driver is bound.

4. No concrete CotComp audit adapter has been runtime-bound.

5. Exact S4.20 workflow owner runtime deployment has not been independently proven for CotComp projection.

6. Initial handoff spans multiple atomic groups.
   A durable saga/resume/compensation contract is required so partial success can never be reported as full success.

7. No CotComp controlled-write proof has yet demonstrated:
   create -> exact readback -> same-payload retry -> conflicting-payload deny -> cleanup -> final absence.

8. Notification provider side effects must be disabled for persistence proof.

9. No Owner write authorization exists.

10. No persistence deploy authorization exists.

## Staged release model

### W0 — SOURCE_ONLY_CURRENT
Current state. No writes.

### W1 — SYNTHETIC_CORE_COMMIT
Future separate gate:
- idempotency;
- quoteCase;
- caseAccess hash only;
- event;
- exact readback;
- idempotent retry;
- conflict deny;
- cleanup;
- final absence.

Explicitly excludes workflow projection, provider notifications, real data and production.

### W2 — SYNTHETIC_WORKFLOW_PROJECTION
Only after exact workflow owner runtime proof.
Synthetic lead + ops projection only.

### W3 — SYNTHETIC_PROPOSAL_VERSIONING
Synthetic proposal/version/current-validity persistence proof.
No provider/rater calls.

### W4 — SYNTHETIC_SELECTION
Synthetic explicit-user-choice persistence.
Must preserve:
`NOT_ISSUED / NOT_BOUND / NOT_CONFIRMED`.

### W5 — REAL_DATA_PILOT
Separate future Owner gate only after W1-W4 physical PASS.
Never inferred from synthetic success.

## Required saga states

- CORE_PENDING
- CORE_COMMITTED
- WORKFLOW_PENDING
- WORKFLOW_COMMITTED
- EVENT_OUTBOX_PENDING
- COMPLETE
- PARTIAL_RETRYABLE
- COMPENSATION_REQUIRED
- ROLLED_BACK_SYNTHETIC

## S4.43 closure criterion

S4.43 closes when:
- source staleness is remediated;
- readiness matrix is frozen;
- staged release model is frozen;
- all source QA passes;
- no persistence/write/deploy occurs.

## Next safe block

Build source-only:
- concrete LAB storage driver interface implementation candidate;
- audit adapter candidate;
- saga/resume/compensation contract;
- controlled-write rollback harness.

All must stay execution-disabled.

Only after those pass should Owner be asked for a **W1 synthetic controlled-write authorization**.
