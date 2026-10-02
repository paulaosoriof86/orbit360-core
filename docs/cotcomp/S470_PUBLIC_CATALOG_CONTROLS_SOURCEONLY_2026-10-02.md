# CotComp · S4.70 · Public catalog controls · source-only

**Fecha:** 2026-10-02  
**Estado:** `SOURCE-ONLY / DROPDOWN REQUIREMENT FROZEN / CATALOG BINDING DEPENDENCY / NO DEPLOY / NO RELEASE`

## 1. Purpose

S4.70 advances an independent F8-G4 workstream while the real-Proposal dependency remains external.

It resolves the presentation ambiguity exposed by the temporary S4.67 intake:

S4.67 used text inputs because it was a one-time minimal pilot surface.
Those text inputs are not the UI authority for the definitive public CotComp.

## 2. Public GT Auto/Moto control truth

The definitive `GT_AUTO_MOTO_HYBRID` presentation contract is catalog-first.

Frozen controls:
- route → segmented/select;
- protection goal → dependent select;
- vehicle type → catalog select;
- vehicle use → catalog select;
- brand → catalog select;
- line/model → dependent catalog select;
- model year → year select;
- insured value → money;
- name → text;
- WhatsApp → tel;
- email → email;
- request-management consent → checkbox.

Brand and line/model are therefore explicitly dropdown-based.

Line/model depends on:
`route + brand`.

## 3. Completion vs presentation

The existing completion contract continues to define minimum data completion only.

It is not the presentation authority.

Frozen semantic:
`MINIMUM_COMPLETION_ONLY_NOT_PRESENTATION_AUTHORITY`.

This prevents the temporary S4.67 text controls from becoming the permanent public UX by inheritance.

## 4. Catalog dependency

S4.70 does not invent vehicle catalog values.

Required governed catalog bindings:
- `GT_AUTO_MOTO_VEHICLE_TYPE`;
- `GT_AUTO_MOTO_VEHICLE_USE`;
- `GT_AUTO_MOTO_BRAND`;
- `GT_AUTO_MOTO_LINE_MODEL`;
- `GT_AUTO_MOTO_MODEL_YEAR`.

Before public UI release, each catalog must have:
- status = BOUND;
- version;
- source reference;
- governed source confirmation.

Until then:
`PUBLIC_CATALOG_BINDING_REQUIRED`.

## 5. Release truth

S4.70 is source-only.

It does not:
- deploy UI;
- populate a catalog;
- enable AUTO;
- release CotComp;
- touch application data;
- call provider/rater;
- touch production.

## 6. Next action

The catalog presentation requirement is now frozen.

A later G4 gate must bind the five governed catalog sources before the definitive public GT Auto/Moto UI can be release-ready.

This work is independent from the W3 real-Proposal dependency.
