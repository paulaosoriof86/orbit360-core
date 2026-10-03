# CotComp · S4.73 · Canonical vehicle risk identity + dropdown catalog readiness

**Fecha:** 2026-10-02  
**Estado:** `SOURCE-ONLY / CONTRACT READY / AUTHORITATIVE VEHICLE CATALOG STILL REQUIRED / NO APP DATA`

## 1. Trigger

S4.72A proved that a free-text/hardcoded risk-family assumption can associate the wrong documentary cluster to a real QuoteCase.

Owner then confirmed the actual W5 intake as:
- Toyota;
- Corolla 2006.

The frozen 16-PDF corpus contains no exact Corolla 2006 insurer quotation.

## 2. Root-cause correction

The original GT Auto/Moto completion contract uses:
- `brand` as text;
- `lineModel` as text.

That is backward-compatible but too ambiguous for the future public journey.

S4.73 defines the target public control model:
- Marca = searchable dropdown;
- Línea/modelo = searchable dropdown dependent on Marca;
- Año = separate dropdown;
- optional "Otro / no encuentro" remains a review state, not a silently canonical value.

## 3. Canonical risk identity

Target identity:
- country;
- product;
- brand;
- model;
- year;
- catalog version;
- catalog digest.

Existing fields remain available as a compatibility bridge:
- `brand`;
- `lineModel`.

A catalog-backed submission additionally persists:
- `vehicleYear`;
- `vehicleIdentity.brandId`;
- `vehicleIdentity.brandLabel`;
- `vehicleIdentity.modelId`;
- `vehicleIdentity.modelLabel`;
- `vehicleIdentity.year`;
- `vehicleIdentity.catalogVersion`;
- `vehicleIdentity.catalogDigestSha256`.

This avoids breaking current downstream contracts while removing identity ambiguity for future intakes.

## 4. Corpus correction

The prior source fixture incorrectly kept:
`GT_AUTO_YARIS_2008_37500.currentW5Case=true`.

S4.73 retires that marker.

Current corpus state:
- 5 historical/documentary clusters;
- 0 clusters marked as current W5;
- current W5 = Toyota Corolla 2006;
- exact current W5 corpus matches = 0.

## 5. Gravisentra reuse boundary

Read-only review of the existing Gravisentra vehicle model shows reusable canonical field semantics:
- `marca`;
- `linea`;
- `anioModelo`;
- honest quality/pending states when source fields are incomplete.

S4.73 reuses those semantic boundaries but does **not** duplicate or expose Gravisentra's operational vehicle records as a public catalog.

A public dropdown needs a dedicated authoritative/versioned catalog source.

## 6. Evidence fixture is not production catalog

The 16-PDF corpus can derive a small test fixture containing the brands/models/years evidenced by those files.

That fixture is useful for:
- parsing tests;
- dependent-dropdown tests;
- exact-match tests;
- regression tests.

It is explicitly:
- non-authoritative;
- incomplete;
- not public-release ready.

It must not be promoted to a Guatemala vehicle master catalog merely because it exists.

## 7. Current release gate

Prepared:
- canonical risk identity contract;
- dropdown UI contract;
- legacy compatibility bridge;
- exact corpus matching;
- stale Yaris current-W5 marker removal;
- evidence fixture catalog.

Still required before public dropdown release:
`AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED`.

## 8. Physical boundaries

- app-data reads = 0;
- app-data writes = 0;
- production = 0;
- provider/rater = 0;
- deployment = 0;
- current W5 QuoteCase unchanged.

## 9. Next independent action

Select and govern the authoritative Guatemala Auto/Moto make-model-year catalog source, then implement the catalog adapter and only afterward replace free-text controls in the public CotComp journey.

The Corolla 2006 Proposal/ComparisonSet proof remains separately blocked by:
`MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED`.
