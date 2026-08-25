# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

## ROOTFIX — F2 AUTH PUBLICATION MACHINE PROTOCOL — 2026-08-25

**Run:** `32887741144`  
**Job:** `97932059504`  
**PR:** #114, transport-only, closed without merge  
**Classification:** `PIPELINE_MECHANISM_FAILURE`  
**Failure family:** `MACHINE_READABLE_CLI_BOUNDARY`  
**Candidate:** artifact `9504702901`, unchanged  
**Product/data defect:** none demonstrated

### Observed behavior

The source-only pre-authorization mechanism gate passed. The one-shot authorization/request/attempt was then accepted and the accepted-state transaction was prepared. Before the semantic F2 gate could run, the auth-publication step attempted to parse a file built by redirecting both stdout and stderr from `PUBLISH_VALIDATED` into one JSON capture. `jq` rejected that combined stream. Provider, browser, secrets and Firestore were therefore not reached.

The run was terminally reconciled as `PIPELINE_MECHANISM_FAILURE`, with zero Firestore/Auth/operational writes, zero deploy and zero production touch. The accepted and terminal states were published and the authorization/request were sealed consumed with `replayAllowed:false`.

### Root cause

The publication transaction had one physical mutation owner, but its CLI protocol still had asymmetric channels: success JSON on stdout and failure JSON on stderr. The workflow's auth-publication consumer merged those channels using `2>&1`. That made the machine-readable boundary vulnerable to any stderr diagnostic and allowed a valid publication result stream to become non-JSON before the semantic F2 gate.

### Definitive rootfix

1. `PUBLISH_VALIDATED` now returns both PASS and FAIL contracts as exactly one JSON document on stdout.
2. Git subprocesses are explicitly captured rather than allowed to leak machine-irrelevant stderr into the protocol.
3. A dedicated behavioral probe invokes a failing `PUBLISH_VALIDATED` call and requires: non-zero exit, one JSON on stdout, empty stderr, and the merged stream still parseable as exactly one JSON.
4. Macro3 executes that probe before authorization can be consumed.
5. The semantic contract and writer registry make the single-JSON publication CLI contract mandatory.
6. The canonical transition owner may reopen control-plane from a sealed F2 `PIPELINE_MECHANISM_FAILURE` only when the latest consumed run matches durable evidence, replay is false, active auth/request are cleared, and all forbidden side effects remain zero.

### Recovery contract

This incident does not authorize replay and does not create a new candidate. Recovery must use the existing generic `CONTROL_PLANE_REGRESSION_REOPEN → CONTROL_PLANE_SELFTEST → CONTROL_PLANE_HARDENING_CLOSE` path. Only after fresh source-only closure may a new explicit F2 authorization be requested.

**Carril A:** product frozen; no frontend change.  
**Carril B:** control-plane publication protocol rootfix.  
**Carril C:** frozen; no migration/import.  
**Academia:** distinguish a product defect from a machine-protocol/control-plane defect; one-shot remains consumed even when runtime/browser never execute.  
**Claude classification:** `BACKEND_PROTEGIDO_NO_CLAUDE`.
