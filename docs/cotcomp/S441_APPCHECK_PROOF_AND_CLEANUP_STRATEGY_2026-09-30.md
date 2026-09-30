# CotComp S4.41 · App Check synthetic proof strategy + Artifact Registry cleanup candidate

**Date:** 2026-09-30  
**Status:** `SOURCE-ONLY / LAB BASELINE FROZEN / NO DEPLOY / NO FIREBASE CONFIG WRITE / NO APP-DATA WRITE / NO PRODUCTION`

## 1. Frozen LAB baseline

S4.41 inherits the proven S4.40 runtime baseline:

- project: `ays-orbit-360-lab`
- region: `us-central1`
- deployed source SHA: `17d599e884d5b834b73b9499d8cef177575d56f9`
- exact four callables ACTIVE
- persistence off
- app-data writes 0
- real data 0
- production untouched

S4.41 does not redeploy or modify those functions.

## 2. Why a valid App Check proof needs a Firebase client path

Firebase callable functions with `enforceAppCheck:true` reject missing/invalid App Check tokens. Firebase's callable client SDK automatically attaches App Check tokens when available.

For CI environments, Firebase documents the App Check debug provider as the supported development/test mechanism. A registered debug token must be kept in CI secret storage and must never be committed or shipped in a production build.

Therefore the proof strategy is:

1. use an existing LAB Firebase Web App;
2. resolve its SDK config read-only from Firebase;
3. use the Firebase Web client SDK;
4. inject a registered App Check debug token only from an encrypted CI secret;
5. invoke only the four synthetic-gated LAB callables;
6. preserve zero persistence / zero app-data writes;
7. record a sanitized receipt, never the token or raw SDK configuration.

No raw HTTP bypass and no App Check weakening are allowed.

## 3. Required preflight

The live synthetic invocation is blocked unless all are true:

- exact project `ays-orbit-360-lab`;
- one explicitly selected LAB Web App;
- Web SDK config resolvable;
- encrypted `FIREBASE_APPCHECK_DEBUG_TOKEN` secret present;
- deployed source baseline still matches S4.40;
- persistence remains off;
- production is not targeted.

If any condition fails, S4.41 must stop rather than disable App Check.

## 4. Intended live proof

The proof should use a browser client in CI and call:

1. `cotcompValidateDraft`
2. `cotcompSubmitHandoff`
3. `cotcompFetchComparableProposals`
4. `cotcompSelectProposal`

All requests must carry the existing synthetic gate. No real customer/prospect values are allowed.

Success does not mean persistence or production release. It means only:
- callable endpoint reachable;
- valid App Check token accepted;
- synthetic runtime logic responds;
- zero app-data writes remain true.

## 5. Artifact Registry cleanup

Firebase documents that function deployment container images are stored in Artifact Registry and can accumulate storage cost. Firebase CLI supports `functions:artifacts:setpolicy`; its default policy deletes images older than 1 day.

S4.41 recommendation, not execution:
- LAB location: `us-central1`
- candidate retention: **7 days**
- rationale: preserve a short forensic inspection window while keeping GitHub artifacts as the long-term evidence source.

Candidate command:

`firebase functions:artifacts:setpolicy --days 7 --location us-central1 --project ays-orbit-360-lab`

This command is **not authorized for execution** in S4.41 and requires a separate explicit Owner gate.

## 6. Non-goals

S4.41 does not authorize:
- App Check debug-token creation/registration;
- secret creation;
- redeploy;
- persistence;
- Firestore writes;
- real data;
- production;
- cleanup-policy mutation.

## 7. Closure criterion

S4.41 closes when:
- source contracts/tests pass;
- LAB Web App/App Check preflight is observed read-only;
- blockers are recorded;
- no security weakening, Firebase config write or app-data write occurs.


## 8. Observed read-only preflight

Workflow:
`36768717761`

Conclusion:
`SUCCESS`

Evidence artifact:
`11122917298`

Digest:
`sha256:764270f2c918e3ecb09ac4ca7981626b03e48210a2467734b984ca5efd09db5e`

Observed:
- exactly one LAB Web App: `Orbit360 LAB Web`;
- Firebase App ID: `1:646761409743:web:2ec4595ee9160f9d945bba`;
- SDK config resolvable read-only: `true`;
- GitHub Actions secret `FIREBASE_APPCHECK_DEBUG_TOKEN` present: `false`;
- Firebase config writes executed: `0`;
- app-data writes executed: `0`;
- deploy executed: `false`;
- production touched: `false`.

Therefore:

`readyForValidAppCheckSyntheticInvocation=false`

Sole blocker:

`APPCHECK_DEBUG_TOKEN_SECRET_REQUIRED`

This blocker must be resolved by registering a LAB App Check debug token and storing it in encrypted CI secret storage. S4.41 does not authorize that security-configuration write.

## 9. Observable QA

Exact preflight-head QA:

- run: `36768717270`
- tests: `275`
- pass: `275`
- fail: `0`

## 10. S4.41 closure

S4.41 is closed as:

`SOURCE CONTRACTS PASS / LAB WEB APP FOUND / SDK CONFIG RESOLVABLE / DEBUG TOKEN SECRET ABSENT / VALID-APPCHECK LIVE INVOCATION BLOCKED / NO SECURITY WEAKENING / NO FIREBASE CONFIG WRITE / NO APP-DATA WRITE / NO DEPLOY / NO PRODUCTION`

Next gated action requires explicit Owner authorization to create/register a LAB-only App Check debug token and store it as an encrypted GitHub Actions secret. No persistence or production gate is implied.
