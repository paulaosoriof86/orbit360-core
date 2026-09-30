# CotComp Runtime Export Delta + LAB Readback Manifest · S4.38 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / FUTURE DIFF + READBACK CONTRACT / NOT APPLIED / NOT DEPLOYED / WRITES OFF

## Future bootstrap delta

Target:
`functions/bootstrap.js`

Proposed future import:
`./cotcomp-runtime-entry-s438`

Exact callable exports:
- cotcompValidateDraft
- cotcompSubmitHandoff
- cotcompFetchComparableProposals
- cotcompSelectProposal

The delta is descriptive only:
- APPLY_ALLOWED=false
- DEPLOY_ALLOWED=false
- WRITES_ALLOWED=false
- effectiveApplyAllowed=false

## Exact LAB readback manifest

Expected target:
- project: ays-orbit-360-lab
- environment: LAB
- region: us-central1

All four callables:
- App Check enforced.

Replay protection:
- ValidateDraft: false
- SubmitHandoff: true
- FetchComparableProposals: false
- SelectProposal: true

Data/runtime constraints:
- persistenceEnabled=false
- writesExpected=0
- syntheticOnly=true
- productionTouched=false
- dataTouched=false

## Truth

This manifest is a future acceptance contract.

It is not proof that:
- functions are exported;
- functions are deployed;
- runtime is reachable;
- readback has occurred.

Current code truth:
- DEPLOYED=false
- RUNTIME_VERIFIED=false

## Next

S4.39 should freeze the future evidence receipt schema that will bind source SHA/tree, artifact digest and exact readback results if Owner later authorizes a LAB deploy.
