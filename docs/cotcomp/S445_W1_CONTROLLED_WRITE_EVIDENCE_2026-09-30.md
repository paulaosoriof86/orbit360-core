# CotComp S4.45 / W1 · LAB synthetic controlled-write evidence

**Date:** 2026-09-30  
**Status:** `W1 PHYSICAL PASS / SYNTHETIC CORE WRITE+READBACK+RETRY+CONFLICT-DENY+CLEANUP+FINAL-ABSENCE PASS / PROOF FUNCTION REMOVED / REAL DATA 0 / PRODUCTION UNTOUCHED`

## Owner-authorized scope

S4.45 authorized only:
- idempotency;
- quoteCase;
- caseAccess hash-only;
- CotComp event;
- exact readback;
- same-payload retry without duplicate;
- conflicting-payload deny;
- mandatory cleanup;
- final absence.

Explicitly excluded:
- workflow Lead/Ops projection;
- provider notifications;
- proposal persistence;
- selection persistence;
- real data;
- production.

## Isolated source

Branch:
`ays/cotcomp-w1-s445-lab-20260930`

Authorized/deployed source SHA:
`fa55f4ce6185656bf00600e8dd41b44b3d13a370`

Source tree:
`fc8d136e559eea787d139a9fb0f4c4e4bd58f556`

## Source QA

Run:
`36783783932`

Pre-deploy suite:
- tests: 307
- pass: 307
- fail: 0

## Deploy/readback nuance

The Firebase CLI deploy command returned exit code `1`, but the workflow did not infer deployment from that command.

It immediately performed function inventory readback and observed the isolated proof function as:
- ACTIVE;
- us-central1;
- gcfv2;
- nodejs22.

Therefore the material deployment state was proven by runtime inventory before the proof proceeded.

No claim is made here about the specific reason for the CLI non-zero code.

## Physical W1 proof

Proof run ID:
`s445-36783783932`

Created only four synthetic documents:
1. idempotency
2. quoteCase
3. caseAccess hash-only
4. CotComp event

Observed:
- first exact readback = PASS
- same-payload retry = PASS
- retry writes = 0
- duplicate created on retry = false
- conflicting payload denied = PASS
- conflict writes = 0
- raw case-access token persisted = false
- cleanup deleted = 4
- final absence = PASS

Independent second callable read:
- VERIFY_ABSENCE = PASS
- writes = 0

## Write accounting

This block **did perform authorized synthetic app-data mutations**:

- create writes: 4
- retry writes: 0
- conflict writes: 0
- delete writes: 4
- total app-data mutations: 8
- net persistent documents after proof: 0

Therefore S4.45 must not be described as a zero-write block.

## Teardown

The isolated callable:
`cotcompSyntheticCoreWriteProof`

was deleted after evidence capture.

Final function inventory check:
`absentAfterTeardown=true`.

## Evidence

Source upload artifact:
`11129200783`

GitHub artifact digest:
`sha256:557156f6dce2c58f5dd5584a021fcdf70e868b19671ac1bb89ac69a11b0b4c68`

Internal source tar digest:
`sha256:3bc6d17d137f99c58542846ec754ff6d237601ca6cd4c355bad7debd97e3f745`

Proof artifact:
`11128643714`

GitHub artifact digest:
`sha256:177aff0b3d906e7b39a44506929ad5ccf88b8dc24825d1d8390c9d267f308130`

Backend source digest:
`9eb7b1a4f9389bb00c0d0446fd4987404bb53b7a1a4eceb17b44358275194fcb`

## Release truth

Proven now:
- valid App Check callable path;
- physical synthetic CotComp core persistence;
- exact readback;
- idempotent retry;
- conflict deny;
- hash-only case access;
- controlled cleanup;
- independent final absence.

Still not released:
- general persistence;
- workflow projection;
- proposal persistence;
- selection persistence;
- real data;
- production.

## Next safe block

S4.46 should be source-only/read-only:
- freeze W1 as physical LAB baseline;
- independently verify the Gravicentra S4.20 workflow owner in LAB runtime;
- prepare W2 synthetic workflow-projection candidate with execution OFF.

No W2 write should occur without a separate Owner gate.
