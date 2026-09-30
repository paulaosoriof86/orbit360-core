# CotComp S4.42 · Valid-App-Check synthetic invocation contract

**Date:** 2026-09-30  
**Status:** `AUTHORIZED / LAB-ONLY / DEBUG TOKEN REGISTRATION + SECURE CUSTODY IF PERMITTED / FOUR-CALLABLE SYNTHETIC PROOF / PERSISTENCE OFF / WRITES 0 / REAL DATA 0 / PRODUCTION FORBIDDEN`

## Owner authorization

Owner authorized S4.42 to:

- create/register an App Check debug token exclusively for `Orbit360 LAB Web`;
- keep it encrypted in CI/Secret Manager if existing permissions allow;
- execute the synthetic proof against the four S4.40 LAB callables;
- keep persistence off;
- execute zero app-data writes;
- use no real data;
- keep App Check enforced;
- avoid production.

## Exact target

- project: `ays-orbit-360-lab`
- project number: `646761409743`
- region: `us-central1`
- Web App: `Orbit360 LAB Web`
- App ID: `1:646761409743:web:2ec4595ee9160f9d945bba`
- deployed source: `17d599e884d5b834b73b9499d8cef177575d56f9`

## Required invocation sequence

1. cotcompValidateDraft
2. cotcompSubmitHandoff
3. cotcompFetchComparableProposals
4. cotcompSelectProposal

## Security controls

- debug token UUID4;
- token never committed;
- token never printed;
- Firebase Web client SDK required;
- no raw HTTP callable bypass;
- App Check remains enforced;
- if Secret Manager custody is unavailable, token may be used ephemerally for this proof and must then be revoked;
- proof artifacts must be sanitized.

## Pass criteria

All four callables must return successfully through the Firebase client callable protocol with valid App Check.

Additionally:
- syntheticOnly=true;
- persistenceEnabled=false;
- appDataWritesExecuted=0;
- realDataUsed=false;
- productionTouched=false.

A S4.42 PASS does not authorize persistence, real-data writes, provider/rater integration, issuance, payment or production.


## Executed result

Final proof workflow:
`36774479211`

Conclusion:
`SUCCESS`

Evidence artifact:
`11124713611`

Digest:
`sha256:ceb3ac6efb7c02b44251c2dfde765b1c90c925e002c14c4bb53a982861a6c172`

All four callable invocations passed through the Firebase Web callable SDK with App Check enforced:

- cotcompValidateDraft = PASS
- cotcompSubmitHandoff = PASS
- cotcompFetchComparableProposals = PASS
- cotcompSelectProposal = PASS

Replay-protected functions used limited-use App Check tokens.

## Secure token custody

The LAB debug token is registered only for `Orbit360 LAB Web` and is stored in Google Secret Manager:

`projects/646761409743/secrets/cotcomp-s442-appcheck-debug-token`

Observed secret version:
`versions/1`

The token value was:
- not committed;
- not written into the evidence artifact;
- not printed in workflow output.

Custody mode:
`GOOGLE_SECRET_MANAGER_REUSE`.

## Replay-protection IAM

A preceding read-only diagnostic identified the runtime verifier permission required by replay protection.

The exact least-privilege grant was then applied only in LAB:

- runtime service account: `orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com`
- role: `roles/firebaseappcheck.tokenVerifier`
- permission: `firebaseappcheck.appCheckTokens.verify`

IAM workflow:
`36774411951 = SUCCESS`

Artifact:
`11125950250`

Digest:
`sha256:968d9b0b3c5c8a81165afdf8d6c4f800225b18dee18a6a741b845cec2c80aae7`

This strengthened replay verification and did not weaken App Check.

## Final source QA

Exact-head source QA associated with the successful proof lineage:

`36774479299`

- tests: 283
- PASS: 283
- FAIL: 0

## Data and release truth

- syntheticOnly = true
- persistenceEnabled = false
- appDataWritesExecuted = 0
- realDataUsed = false
- productionTouched = false
- validAppCheckSyntheticInvocationPass = true
- persistenceReleased = false
- writesReleased = false
- realDataReleased = false
- productionReleased = false

## S4.42 closure

`VALID APPCHECK FOUR-CALLABLE SYNTHETIC INVOCATION PASS / SECRET MANAGER CUSTODY PASS / REPLAY-PROTECTION IAM LEAST-PRIVILEGE PASS / 283/283 SOURCE QA PASS / PERSISTENCE OFF / WRITES 0 / REAL DATA 0 / PRODUCTION UNTOUCHED`
