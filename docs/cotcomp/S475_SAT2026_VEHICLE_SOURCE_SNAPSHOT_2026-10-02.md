# CotComp · S4.75 · SAT Guatemala 2026 vehicle source snapshot

**Fecha:** 2026-10-02  
**Estado inicial:** `SOURCE CONTRACT READY / PHYSICAL FETCH PENDING / NO APP DATA`

## Objective

Materialize and hash the official SAT Guatemala 2026 vehicle table selected in S4.74, without yet converting it into the public dropdown catalog.

Official source:
`https://portal.sat.gob.gt/portal/descarga/1895/legislacion-aduanera/91646/tabla-de-valores-iva-iprima-2026`

Expected authority:
- SAT Guatemala;
- file id 91646;
- 2026 table for used motor vehicles;
- table structure includes `Tipo`, `Marca`, `Línea`.

## Physical proof requirements

The workflow must:
1. fetch the exact official URL;
2. require HTTP 200;
3. verify PDF magic;
4. compute raw SHA-256;
5. extract text with a deterministic PDF text tool;
6. compute text SHA-256;
7. verify the official 2026 title;
8. verify the Tipo/Marca/Línea header;
9. verify at least one known identity row: Toyota Corolla;
10. record PDF byte size and page count;
11. upload the raw public-source PDF, extracted text, and sanitized receipt as build artifacts.

## Deliberate limit

S4.75 does **not** claim:
- normalized make/model catalog built;
- every SAT row parsed correctly;
- model-year existence proven;
- insurer quote eligibility;
- dropdown deployed.

Next after physical snapshot:
`S4.76 SAT SNAPSHOT NORMALIZATION + QUALITY METRICS`.

## Boundaries

- app-data reads = 0;
- app-data writes = 0;
- provider/rater = 0;
- production = 0;
- deploy = 0.
