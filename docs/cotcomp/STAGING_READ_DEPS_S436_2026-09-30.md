# CotComp Read-only Staging Dependencies Candidate · S4.36 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / READ-ONLY DEPENDENCY CONTRACT / READY=false / DRIVER READS OFF / WRITES OFF / NO DEPLOY

## Why S4.36

The older S4.13 staging dependency placeholder intentionally had no implemented case-access/proposal read adapters.

Now that Owner has chosen the no-counsel technical-continuation path, source-only work can continue without treating legal compliance as verified.

S4.36 defines the future **read-only** dependency boundary only.

## Candidate capabilities

Future server-side driver shape:
- `getCaseAccess`
- `listProposalsForCase`

Canonical preview paths:
- `tenants/alianzas-soluciones/cotcomp/caseAccess/items/{caseId}`
- `tenants/alianzas-soluciones/cotcomp/proposals/items/{proposalId}`

Cross-tenant paths fail through the S4.23 storage policy.

## Hard locks

- `READY=false`
- `PERSISTENCE_ENABLED=false`
- `WRITES_ENABLED=false`
- `DRIVER_READS_ALLOWED=false`
- `SERVER_SIDE_ONLY=true`

Runtime methods throw:
`COTCOMP_STAGING_READ_DEPS_NOT_READY`
before any injected driver call.

## Important distinction

This block prepares a read-only LAB dependency contract.

It does not:
- enable the S4.13 runtime entry;
- export callables;
- deploy;
- read Firestore;
- write Firestore;
- claim legal compliance.

## Next

S4.37 should define the deterministic LAB no-write runtime proof/readback plan around the four candidate callable surfaces, still without exporting or deploying them.
