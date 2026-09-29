# CotComp Public → Orbit360 Bridge · S4.7 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / DEFAULT-DENY / NO RUNTIME SIDE EFFECTS

## Purpose

Align the approved public CotComp experience with the executable Orbit360 CotComp contracts already present on this branch, without claiming or enabling runtime integration.

## Backend contracts used

- GT Auto/Moto → `GT_AUTO_MOTO_HYBRID`
- GT Gastos Médicos → `GT_GASTOS_MEDICOS_HYBRID`
- CO Transporte → `CO_TRANSPORTE_CONSULTATIVE_HYBRID`
- CO RC Profesional → `CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID`

The existing PREIMPL-03 evidence reports 27/27 PASS for contract/validator tests.

## S4.7 semantic locks

- No hidden scoring.
- No automatic winner.
- `rankingPolicy = NONE_BY_DEFAULT`.
- `noSilentWeighting = true`.
- MISSING is not NOT_COVERED.
- Only validated/current proposals may become comparable.
- User selection is explicit.
- AUTO_READY remains false.
- Runtime/provider side effects remain false.

## Mapping policy

The bridge maps only exact, supportable public fields. It does not infer dates from ages, silently broaden geographic scope, infer product eligibility, or invent missing contact/consent data.

If the public route lacks all backend submit requirements, the result remains `readyForBackendValidation=false`.

## Current boundary

This source does not expose an HTTP endpoint, call Orbit.store, invoke provider adapters, deploy, or touch production.

Next gate: define authenticated transport and complete missing public fields or a deferred-contact handoff contract before any runtime connection.
