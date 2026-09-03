# Gravicentra Insurance — I1 Financial Lineage Ledger

**Scope:** Recibos Esperados → Cartera Primas → Cobros  
**Gate:** I1 — LINEAGE_GLOBAL  
**Status:** IN_PROGRESS / FAIL_CLOSED  
**Branch authority:** `recovery/fase-a-clean-20260831`  
**Repository:** `paulaosoriof86/orbit360-core`  
**Forensic origin:** `9c95f31461f2eabe9804625b5659bee772f5602a`  
**Pre-ledger branch HEAD verified:** `afe6c82086cbc8dc40b713369b249e21f4cc61cd`  
**Pre-ledger tree verified:** `f2c83c4379604bac903b03b664a284b3c2bab3fe`  
**Ledger creation commit:** `dc7c3acc1521b65c32796aa3f3307172a0b276d9`  
**Ledger creation tree:** `ca5645e7e54bddf3cecfc661edd84ab30ea012f8`  
**Data cutoff for I0–I5:** `2026-07-31`  

## 1. Continuity decision

The literal filename intended in the interrupted prior execution could not be recovered from preserved conversation context. A previous readback for the intended ledger returned `404`, therefore no prior ledger is credited as physically created.

- `FILENAME_RECOVERED = false`
- `PRIOR_LEDGER_PHYSICAL_EXISTENCE = NOT_PROVEN`
- Canonical filename: `artifacts/orbit360-recovery/i1-lineage/FINANCIAL_LINEAGE_LEDGER_RECIBOS_CARTERA_COBROS.md`
- This naming decision does not change product semantics, gate structure, source, runtime, data, Firebase, build, Preview, or production.

## 2. Governing semantic boundary

Recibos Esperados, Cartera Primas and Cobros are three semantically distinct capabilities/read-model domains and MUST NOT be fused or simplified for technical convenience.

The lineage contract must prove separately for each domain:

1. functional meaning;
2. canonical read collection(s);
3. canonical write collection(s);
4. entity identifiers and joins;
5. owner and effective runtime owner;
6. bridges/projectors/facades/dependencies;
7. read/write semantics;
8. states and authorized transitions;
9. roles/scopes;
10. approved UI and primary actions;
11. persistence/reload behavior;
12. relations to Pólizas, Cliente, Aseguradora and financial evidence;
13. latest approved acceptance evidence;
14. exact source/blob SHA of that approved version.

## 3. Acceptance binding resolution — 2026-09-03

`LATEST_APPROVED_ACCEPTANCE_BINDING_FOR_FINANCIAL_TRIPLE = RESOLVED_COMPOSITE_ACCEPTANCE`

The repository does **not** support treating v1199, v9.1, v9.2, 10.9 or any other single filename/version as the latest approved integrated financial runtime merely because it exists or is newer. Positive OWNER evidence establishes a **composite lineage**:

- Recibos/Cartera has an approved 9.1.0 write/semantic closure, later explicitly preserved as reusable.
- Cobros has a later and separate 10.10.2 durable-ledger closure.
- Cobros 10.10.2 does not supersede, rewrite or fuse Recibos/Cartera.
- The latest OWNER marker requires fresh/current read-only reconciliation of Recibos/Cartera after Cobros and classifies the prior Comisiones linkage as stale relative to the newer Cobros universe.
- Therefore there is no evidence yet for a single monolithic `LATEST_APPROVED_VERSION` of the integrated runtime/UI triple. The accepted atoms are bound below; integration/runtime composition remains an I1 field to prove, not permission to invent a replacement model.

### 3.1 Recibos Esperados + Cartera Primas — accepted atom

**Positive OWNER acceptance:** GitHub issue comment `5242343353`, 2026-08-10, OWNER `paulaosoriof86`.

It explicitly states:

- `Recibos/cartera 9.1.0`;
- `RECEIPTS_PORTFOLIO_WRITE_CLOSED_REUSABLE`;
- control-plane run `31403410005` = PASS in all four checkpoints;
- validated source HEAD `1f7b86b60edb8e3c61da55fa5073214f7d52cdbd`;
- artifact `9068589195`;
- digest `sha256:52896dc18bfc3fe326a73d5b12f7b134379fe83899b79711f4a8b6c988f5fc71`;
- preserved closures: Recibos `1293`, Cartera `673`.

**Exact source/evidence binding:**

| Element | Exact binding |
|---|---|
| Accepted source/control-plane commit | `1f7b86b60edb8e3c61da55fa5073214f7d52cdbd` |
| Control-plane workflow | `.github/workflows/orbit360-control-plane-route-critical-source-v20260810.yml` |
| Workflow blob SHA | `16b2d1710617a60cb5d1bce359435b5e50968387` |
| Lifecycle contract | `tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json` |
| Lifecycle contract blob SHA | `a3dc0c9db7d6ea4b3808613da7e861cb09cc1423` |
| Write closure | `orbit360-platform/docs/CIERRE-WRITE-RECIBOS-CARTERA-AYS-V910-20260730.md` |
| Write closure blob SHA | `6b30ae72e74820556edaec9b18fd01f9af165ea9` |
| Immutable write request commit | `b91435847e126676e7f070bc0671ad1aa1f96cd8` |
| Successful write run | `30603384289` |
| Write artifact | `8782716350` |
| Write artifact digest | `sha256:42df5bb30cb1332187a3f0731265821f34cfadcb76b83cdf70d532314b319d85` |

**Canonical operational writes proven by the accepted closure:**

- `recibosEsperados`: `1293`;
- `carteraPrimas`: `673`;
- `cobros`: `0` in this closure;
- `finmovs`: `0` in this closure.

**Approved semantic contract proven:**

- `pago_reportado` does **not** create a Cobro automatically;
- a single evidence source cannot auto-reconcile payment;
- a pending insurer balance does not prove payment;
- exact matching between two authoritative payment sources may reconcile;
- authoritative payment sources: `cobros_realizados_crm` and `reporte_cobros_aseguradora`;
- minimum reconciliation keys include aseguradora, póliza, moneda, monto and recibo/canonical equivalent;
- conflicts require validation;
- bank evidence does not create a Cobro by inference;
- matcher is one-to-one, installment-aware, receipt-aware and date-disambiguated;
- payment reconciliation may materialize a reconciled Cobro;
- balance reconciliation marks cartera reconciled and does **not** create a payment;
- historical rows do not create a new schedule or reactivate a policy.

**Canonical owner/dependency evidence present in the accepted contract:**

- `orbit360-platform/core/importa-cartera-p0.js`;
- `orbit360-platform/core/importa-cartera-p0-wire.js`;
- `orbit360-platform/core/importa-identity-upsert-v20260731.js`;
- `orbit360-platform/core/importa-identity-dryrun-wire-v20260731.js`;
- `orbit360-platform/core/importa-identity-writer-wire-v20260731.js`;
- `orbit360-platform/core/importa-transversal-p0-bootstrap-v20260731.js`;
- parent domain: `polizas`.

**Important boundary:** the 2026-07-30 write closure itself required a subsequent visual review before Cobros. The current recovery therefore credits the accepted semantic/write closure but does not falsely convert it into proof of the latest effective UI/runtime asset.

### 3.2 Cobros — accepted atom

**Positive OWNER acceptance:** GitHub issue comment `5269330317`, 2026-08-12, OWNER `paulaosoriof86`, canonical live continuity marker.

It freezes:

- Cobros `10.10.2`;
- `COBROS_REAL_LEDGER_COMPLETE`;
- `1,098/1,098` expected writes;
- consumed/frozen request;
- `0` writes to Pólizas/Recibos/finmovs;
- `NO REEJECUTAR`.

**Exact source/evidence binding:**

| Element | Exact binding |
|---|---|
| Canonical closure HEAD | `78a71453dce7e6d1e626f5b9c46a57be6216d774` |
| Lifecycle contract | `tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-lab-v20260805.json` |
| Lifecycle contract blob SHA | `d4aa1e9b4f8b74a4071c6358e14d7abc39a5bc42` |
| Contract version | `10.10.2` |
| Effective ledger owner | `orbit360-cobros-full-ledger-write-lab-v20260805` |
| Owner version | `20260811.2-canonical-router-registered` |
| Rootfix source commit | `6d6c199017969dbbc1de6c02d9df6519328d920d` |
| Runtime request commit | `e5243806e6faa5267992c511c6080f7c8238189d` |
| Runtime closure run | `31554583971` |
| Forward writes | `1098` |
| Result | `COBROS_REAL_LEDGER_COMPLETE / POST_VERIFIED` |

**Approved durable-ledger topology:**

- run manifest: `tenants/{tenantId}/data/cobrosLedgerRuns/items/{runId}`;
- stage subcollections under the run: `pagosReportados`, `evidenciasCobro`, `propuestasConciliacion`, `conciliacionHolds`;
- active pointer: `tenants/{tenantId}/data/cobrosLedgerControl/items/active`;
- isolated run stage then pointer activation transaction;
- direct visible collection stage writes prohibited.

**Approved write semantics:**

- planned stage writes: `365 pagosReportados + 365 evidenciasCobro + 132 propuestasConciliacion + 233 conciliacionHolds`;
- manifest/pointer writes complete the `1098` total;
- `cobros`: `0` direct business writes in this closure;
- `receipts`: `0`;
- `policies`: `0`;
- `finmovs`: `0`;
- proposals and HOLDs are not Cobros;
- existing operational Cobros remain protected;
- replay is forbidden after consumed PASS.

### 3.3 Composite acceptance decision

The financial acceptance target for recovery is therefore **not** “choose one version number.” It is:

`RECIBOS/CARTERA 9.1.0 ACCEPTED SEMANTICS + COBROS 10.10.2 ACCEPTED LEDGER SEMANTICS + PROVE CURRENT EFFECTIVE RUNTIME/UI COMPOSITION WITHOUT FUSION`

Consequences:

1. v1199 cannot be selected merely because it remains connected.
2. v9.2 cannot be selected merely because it is later than v9.1.
3. 10.9 is superseded for Cobros by the positive 10.10.2 closure.
4. A July 4 frontend acceptance remains valid historical evidence but is superseded for the latest financial write/ledger semantics by the August OWNER closures.
5. Cobros 10.10.2 does not authorize creating Cobros from commission evidence, debt disappearance, proposal, HOLD or one-source inference.
6. The August 12 OWNER marker explicitly says Recibos/Cartera must be reconciled read-only against the current Cobros state and that the older Comisiones linkage is stale relative to the newer Cobros universe.

## 4. Evidence ledger after acceptance binding

| Evidence item | Current classification | What is proven / preserved | What remains pending before the financial I1 contract can be credited complete |
|---|---|---|---|
| Semantic separation of `recibosEsperados`, `carteraPrimas`, `cobros` | `CREDITABLE_EVIDENCE` | Required by recovery authority and reinforced by accepted contracts. | Bind effective current runtime owner/assets without fusion. |
| Recibos/Cartera 9.1.0 semantic/write acceptance | `LATEST_APPROVED_ACCEPTANCE_BOUND` | Positive OWNER acceptance + exact commit/blobs + write closure + semantic contract. | Effective UI/runtime owner, route and asset lineage in the product composition. |
| Cobros 10.10.2 durable-ledger acceptance | `LATEST_APPROVED_ACCEPTANCE_BOUND` | Positive OWNER canonical marker + exact closure HEAD + owner/contract + durable topology. | Effective UI/runtime consumer/projector/route binding in the product composition. |
| Current runtime composition drift | `CREDITABLE_EVIDENCE_PENDING_EXACT_ASSET_BINDING` | Prior recovery evidence found cartera/recibos materialized from `cobros`, inconsistent with accepted separation. | Exact effective owner/asset/path/blob SHA causing the drift. |
| v1199 vs later wiring | `CREDITABLE_PRIOR_EVIDENCE_PENDING_PATH_READBACK` | Existing files do not determine acceptance. | Exact current path/blob/owner chain only insofar as needed to prove the effective runtime. |
| Multi-evidence reconciliation | `ACCEPTED_SEMANTIC_CORE_WITH_CURRENT_LINKAGE_RECONCILIATION_REQUIRED` | Dual-authoritative matching, validation on conflicts and no one-source Cobro inference are bound. | Current post-10.10.2 read-only reconciliation of linkage/consumer semantics. |
| Latest approved candidate | `RESOLVED_AS_COMPOSITE_NOT_MONOLITHIC` | Recibos/Cartera 9.1.0 + Cobros 10.10.2 accepted atoms. | No integrated runtime/UI PASS yet. |
| I2 owner/read-model to recompose | `PENDING_EFFECTIVE_RUNTIME_BINDING` | I2 must preserve the accepted semantics above. | Bind current effective owners/bridges/projectors/assets before I2. |

## 5. Acceptance search conclusion

The prior pending field is closed:

`LATEST_APPROVED_ACCEPTANCE_BINDING_FOR_FINANCIAL_TRIPLE = RESOLVED_COMPOSITE_ACCEPTANCE`

This does **not** mean the financial capability has I1 PASS. It means the acceptance ambiguity that blocked further lineage has been removed without inventing a monolithic version.

The next field is a required part of the already-frozen I1 capability contract, not a new gate or iteration:

`PENDING: FINANCIAL_EFFECTIVE_RUNTIME_OWNER_BRIDGE_ASSET_BINDING`

Required chain now:

`ACCEPTED ATOMS → CURRENT EFFECTIVE OWNER/BRIDGES/PROJECTORS → ROUTE/ASSET/BLOB → READ COLLECTIONS → UI/ACTIONS/ROLES → PERSISTENCE/RELOAD → EXACT I2 RECOMPOSITION TARGET`

Until that chain is physically bound:

- `RECIBOS_CARTERA_PRIMARY_RUNTIME = LINEAGE_IN_PROGRESS`
- `COBROS_PRIMARY_RUNTIME = LINEAGE_IN_PROGRESS`
- `LATEST_APPROVED_INTEGRATED_RUNTIME = NOT_PROVEN`
- `I1 = IN_PROGRESS`
- `I2 = NOT_AUTHORIZED`

## 6. Hard preserves / exclusions

- No data reimport to fix runtime, visualization, routing, composition, permissions or validator defects.
- No Firebase migration or new Firebase project.
- No production change in I1.
- No product-source patch in this ledger commit.
- No baseline-historical-plus-overlay release strategy.
- No fusion of Recibos Esperados, Cartera Primas and Cobros.
- No inference from commission evidence may be converted into a direct Cobro unless the accepted contract explicitly proves that behavior; the bound contract currently forbids one-source/inferential creation.
- No replay of consumed financial write requests.
- No PASS from a control-plane/write closure alone when the effective UI/runtime asset has not been bound.

## 7. Physical-change declaration

This ledger update is recovery evidence/documentation only. It does **not** modify product runtime source, Firebase, operational data, build artifact, Preview or production.

## 8. Next field to close

`PENDING: FINANCIAL_EFFECTIVE_RUNTIME_OWNER_BRIDGE_ASSET_BINDING`

The next I1 action is limited to physically tracing the current/candidate product composition for the financial triple and binding:

- exact runtime entrypoint and route;
- executed owners;
- bridges/projectors/facades;
- exact asset paths + blob SHAs;
- read collections and joins;
- UI/actions/roles;
- reload/persistence semantics;
- mismatch between accepted 9.1.0/10.10.2 semantics and the currently connected runtime;
- exact clean-tree target I2 must recompose.

**Do not advance to another capability or to I2 until this financial runtime binding is resolved or a documented evidence boundary proves a specific artifact unavailable after exhaustive repository search.**
