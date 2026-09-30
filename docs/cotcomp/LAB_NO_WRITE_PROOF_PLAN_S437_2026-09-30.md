# CotComp LAB No-write Runtime Proof Plan · S4.37 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY PROOF PLAN / NO DEPLOY / NO WRITES / SYNTHETIC-ONLY FUTURE PROOF

## Objective

Prepare the deterministic proof/readback sequence for a future separately authorized CotComp LAB runtime deployment.

This block does not export or deploy functions.

## Expected callable surface

Exactly:
- cotcompValidateDraft
- cotcompSubmitHandoff
- cotcompFetchComparableProposals
- cotcompSelectProposal

## Planned proof phases

1. SOURCE_IDENTITY
2. BUILD_AND_ARTIFACT
3. EXPORT_SHAPE_READBACK
4. LAB_DEPLOY_IF_SEPARATELY_AUTHORIZED
5. RUNTIME_READBACK
6. ZERO_WRITE_SECURITY_SMOKE
7. EVIDENCE_RECEIPT

## Required future evidence

- source SHA and tree;
- artifact ID and digest;
- backend source digest;
- exact function set;
- App Check settings;
- replay-protection settings;
- exact runtime readback;
- writesExecuted=0;
- syntheticOnly=true;
- productionTouched=false;
- dataTouched=false.

## Expected security settings

App Check:
all four callables = true.

Replay protection:
- ValidateDraft = false
- SubmitHandoff = true
- FetchComparableProposals = false
- SelectProposal = true

## Hard locks

- EXECUTION_ALLOWED=false
- DEPLOY_EXECUTION_ALLOWED=false
- WRITES_ALLOWED=false
- REAL_DATA_ALLOWED=false
- effectiveDeployAllowed=false

The plan may be reviewed and QA'd now.

Actual LAB deployment remains a separate explicit Owner authorization.
