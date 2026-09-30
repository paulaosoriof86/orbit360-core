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
