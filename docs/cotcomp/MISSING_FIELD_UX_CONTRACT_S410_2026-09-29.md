# CotComp Missing-Field UX Contract · S4.10

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / UX CONTRACT FROZEN / NO RUNTIME

## Purpose

Keep the public journey visually light while collecting every backend-required field before the operation that actually needs it.

## Two completion moments

### JOURNEY_COMPLETION
Collect technical risk fields required by the canonical CotComp journey before backend validation/submission.

### HANDOFF_CONTACT
Collect identity/contact/consent only when the user asks A&S to continue the request.

This avoids forcing contact data at the first exploratory step and avoids inventing technical values merely to satisfy the backend.

## Journey decisions

- GT Auto/Moto: add brand + line/model before validation.
- GT Health: exact DOB replaces age as the contractual value; spouse/dependent DOBs only when applicable. Geography preference remains optional because the canonical backend contract does not require it.
- CO Transport: explicitly collect specific-shipment vs annual-program mode, transport modes, and the conditional values required by that choice.
- CO RC Profesional: explicitly collect trigger, applicant type and professional activity; business name only for legal entities.

## Public UX rule

The completion surface should be a compact, premium “Datos para continuar” section/drawer, not a technical debug form. Fields should use natural Spanish labels; backend enum values remain internal.

## Truth rule

A user may explore without completing HANDOFF_CONTACT. No QuoteCase/Lead/Ops persistence is claimed or enabled until a separate runtime contract and release gate exist.
