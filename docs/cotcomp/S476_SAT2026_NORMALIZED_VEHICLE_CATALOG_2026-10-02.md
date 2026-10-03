# CotComp · S4.76 · SAT 2026 normalized vehicle catalog

**Fecha:** 2026-10-02  
**Estado inicial:** `PARSER READY / PHYSICAL NORMALIZATION PENDING / NO DEPLOY`

## Objective

Transform the exact S4.75 SAT snapshot into a versioned, non-PII identity catalog without carrying tax values into the public CotComp data model.

Pinned source:
- SAT file 91646;
- raw SHA-256 `ea15f79900e013bc3c397c23a154802fc2f62f8de3bf056b53003e03b85ec373`.

## Parser contract

A valid source row must contain exactly:
- Tipo;
- Marca;
- Línea;
- C.C./cilindraje;
- cylinders;
- doors;
- fuel code;
- seats;
- 16 value columns (2025..2011 + Resto de años).

The parser uses the PDF's multi-space column boundaries and rejects non-data headers/footers.

## Catalog projection

Public identity projection excludes tax amounts.

Each unique:
`Tipo + Marca + Línea`
becomes one catalog entry with:
- stable type id;
- stable brand id;
- stable model id;
- source row count;
- unique technical spec variants;
- SAT source id/hash/version provenance.

Duplicate SAT rows for the same type/brand/line are merged only at identity level; technical variants remain visible.

## Quality gates frozen from the pinned snapshot

Expected metrics:
- parsed source rows = 3,679;
- unique type/brand/line identities = 3,436;
- duplicate source rows merged = 243;
- vehicle types = 31;
- unique brands = 223;
- unique brand/line pairs = 3,289;
- brand/line pairs appearing under multiple vehicle types = 101.

Regression probes:
- Toyota Corolla exact identity must exist;
- Toyota Yaris exact identity must exist;
- Mazda CX-5 must have SAT candidates under CAMIONETA;
- Honda CRV must surface CR-V candidates through punctuation-insensitive alias detection;
- Bajaj Pulsar is allowed to remain absent and therefore demonstrates the need for the reviewed A&S alias/addition layer.

## Important semantic limit

SAT identity presence does not prove:
- insurer acceptance;
- insurer online-rater availability;
- exact model-year existence;
- insurance premium/cobertura.

Those remain separate layers.

## Next after physical normalization

If S4.76 passes:
- persist normalized snapshot in project Library;
- freeze digest/metrics;
- proceed to S4.77 alias + public dropdown adapter readiness;
- keep provider eligibility separate.

No deployment occurs in S4.76.
