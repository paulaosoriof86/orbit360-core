# CotComp · S4.74 · Guatemala vehicle catalog source governance

**Fecha:** 2026-10-02  
**Estado:** `SOURCE GOVERNANCE READY / SAT PRIMARY / SNAPSHOT NOT YET MATERIALIZED / NO DEPLOY`

## Objective

Resolve the S4.73 blocker:
`AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED`.

This gate selects source roles and precedence. It does not yet ingest or publish a catalog.

## External primary evidence reviewed

### Guatemala SAT

Official SAT materials currently expose:
- 2026 vehicle tax-value tables;
- vehicle-registration/RFV procedures;
- brand and/or line registration as a vehicle-registry procedure;
- official vehicle requirements;
- annual Guatemala vehicle tables whose structure includes vehicle type, make/brand and line.

SAT's 2024 institutional report also documents RFV modernization through homologation of importer vehicle brand/type catalogs.

Architecture decision:
SAT is the **primary Guatemala-local baseline** for canonical vehicle identity.

Important limitation:
SAT tax-value tables are not interpreted as insurer quote-eligibility rules.

### NHTSA vPIC

The official NHTSA vPIC API exposes manufacturer/make/model/vehicle-type and make/year/model queries based on manufacturer submissions.

Architecture decision:
vPIC is a **secondary normalization/cross-check source**, useful for model/VIN standardization, but not the authority for Guatemala-market availability.

## Source precedence

1. `SAT_GT_2026` — primary local identity baseline.
2. `AYS_REVIEWED_ALIASES` — governed local exception/alias layer with provenance.
3. `NHTSA_VPIC` — secondary normalization/cross-check.
4. `INSURER_PROVIDER_CATALOGS` — quote-eligibility overlays.

Provider catalogs must remain separate from canonical identity. A carrier may not quote a vehicle that still exists in the canonical catalog.

## Year handling

S4.74 intentionally keeps **Año** as a separate controlled field.

The SAT tables may group older years or represent years as valuation columns; this must not be misread as proof that every brand-line combination exists for every year.

Therefore:
- dropdown identity = brand + line/model;
- year = separate numeric selector;
- exact model-year existence is not hard-rejected solely from SAT;
- optional vPIC/provider evidence may enrich or validate;
- unknown/ambiguous combinations route to `OTHER_REQUIRES_REVIEW`, not silent rejection or fabrication.

## Public catalog safety

Forbidden sources for the public dropdown master:
- raw Gravisentra client vehicle records;
- the 16-PDF quote corpus by itself;
- provider-specific availability treated as canonical identity.

Allowed:
- versioned local snapshot with SAT provenance;
- reviewed alias additions;
- secondary vPIC normalization metadata;
- provider eligibility stored as a separate overlay.

## Current state

Ready:
- source precedence;
- authority roles;
- separation identity vs quote eligibility;
- alias governance;
- year strategy.

Not ready:
- materialized SAT 2026 snapshot;
- public dropdown release.

Current blocker:
`SAT_2026_CATALOG_SNAPSHOT_INGESTION_REQUIRED`.

## Boundaries

- provider/rater calls = 0;
- app-data reads = 0;
- app-data writes = 0;
- deployment = 0;
- production = 0.
