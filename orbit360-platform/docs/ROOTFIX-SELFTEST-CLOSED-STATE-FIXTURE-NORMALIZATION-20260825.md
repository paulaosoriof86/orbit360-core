# ROOTFIX — SELFTEST CLOSED-STATE FIXTURE NORMALIZATION — 2026-08-25

**Classification:** `VALIDATOR_STALE / HARNESS_STATE_NORMALIZATION_MISSING_AFTER_CONTROL_PLANE_CLOSE`  
**Observed run:** `32886855602` / job `97929213973` / PR #112  
**Stage:** `Source-only mechanism gates before authorization consumption`  
**Runtime attempt consumed:** no  
**Secrets / Firestore / browser:** not reached  
**Product/data changes:** none

## Root cause

The canonical ledger was correctly closed at revision/package `43/37` with state `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION`. The behavioral selftest accepts both an open and a closed canonical control-plane state, but its scratch simulation cloned the closed ledger verbatim and then attempted to exercise the `CONTROL_PLANE_HARDENING_CLOSE` transition using a synthetic scratch handshake.

The canonical transition owner correctly treated that cloned state as already closed and required the existing canonical handshake path. The scratch handshake path therefore failed with `CONTROL_PLANE_CLOSED_HANDSHAKE_PATH_MISMATCH` before any F2 authorization/request/attempt materialization.

## Fix

When the canonical input is already closed, the behavioral selftest now normalizes **only its detached scratch worktree** to a synthetic open control-plane fixture before exercising the open→close→authorization→request→attempt→gate→terminal sequence. It projects and commits that synthetic fixture inside the scratch worktree so subsequent behavioral assertions start from a clean repository.

The canonical ledger, owner, workflow, candidate, authorization event and production state are not relaxed or rewritten by this normalization.

## Expected invariant

`CONTROL_PLANE_SELFTEST` must produce the same behavioral result whether invoked before control-plane closure or after closure at the pre-authorization F2 gate. A closed canonical ledger must not make the scratch open→close simulation depend on the historical canonical handshake path.

## Continuity

The explicit user authorization event `a6a804bfea7d` remains unconsumed. PR #112 failed before `F2_RUNTIME_ATTEMPT_ACCEPT`, so no runtime replay occurred and no fresh user authorization is required solely because of this pre-consumption validator failure.

**Claude classification:** `BACKEND_PROTEGIDO_NO_CLAUDE`.
