# Gravicentra Insurance — I1 Financial Lineage Ledger

**Scope:** Recibos Esperados → Cartera Primas → Cobros  
**Gate:** I1 — LINEAGE_GLOBAL  
**Status:** IN_PROGRESS / FAIL_CLOSED  
**Branch authority:** `recovery/fase-a-clean-20260831`  
**Repository:** `paulaosoriof86/orbit360-core`  
**Forensic origin:** `9c95f31461f2eabe9804625b5659bee772f5602a`  
**Pre-ledger branch HEAD verified:** `afe6c82086cbc8dc40b713369b249e21f4cc61cd`  
**Pre-ledger tree verified:** `f2c83c4379604bac903b03b664a284b3c2bab3fe`  
**Data cutoff for I0–I5:** `2026-07-31`  

## 1. Continuity decision

The literal filename intended in the interrupted prior execution could not be recovered from preserved conversation context. A previous readback for the intended ledger returned `404`, therefore no prior ledger is credited as physically created.

- `FILENAME_RECOVERED = false`
- `PRIOR_LEDGER_PHYSICAL_EXISTENCE = NOT_PROVEN`
- Canonical filename adopted now: `artifacts/orbit360-recovery/i1-lineage/FINANCIAL_LINEAGE_LEDGER_RECIBOS_CARTERA_COBROS.md`
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

## 3. Evidence ledger

| Evidence item | Current classification | What is proven / preserved | What remains pending before I1 PASS |
|---|---|---|---|
| Semantic separation of `recibosEsperados`, `carteraPrimas`, `cobros` | `CREDITABLE_EVIDENCE` | The recovery authority and prior forensic work require them to remain separate. | Exact accepted source/owner contract per domain. |
| Physical operational collections are distinct | `CREDITABLE_EVIDENCE` | Prior forensic probes identified separate operational data in `recibosEsperados`, `carteraPrimas` and `cobros`. | Rebind each collection to the exact latest-approved owner/read-model. |
| Current runtime composition drift | `CREDITABLE_EVIDENCE_PENDING_EXACT_ASSET_BINDING` | Prior forensic work found parts of the runtime materializing cartera/recibos from `cobros`, inconsistent with the separated semantic contract. | Exact effective owner/asset/path/blob SHA causing the drift. |
| v1199 vs later v9.1/v9.2 wiring | `CREDITABLE_PRIOR_EVIDENCE_PENDING_PATH_READBACK` | Prior I1 work reported retained v1199 components while later v9.1/v9.2 owners were outside canonical composition; v9.2 reportedly declares Recibos/Cartera/Cobros separate. | Physical path + blob SHA + commit lineage for each candidate and proof of which candidate was accepted last. |
| Multi-evidence reconciliation | `HISTORICAL_ACCEPTANCE_CLAIM_PENDING_SOURCE_PROOF` | Previously developed work includes insurer commission worksheets, insurer account statements, receipts per policy, pending/collected states and traceability. | Source/blob SHA and explicit acceptance evidence. |
| Commission / disappearance-of-debt semantics | `CREDITABLE_PRIOR_EVIDENCE_PENDING_ACCEPTANCE_PROOF` | Prior lineage work determined these signals were evidence of collection, not automatic creation of fictitious Cobros; insufficient direct evidence required validation/authorization. | Locate exact implementation and acceptance event defining the latest approved semantics. |
| Cartera reconciliation matcher | `CREDITABLE_PRIOR_EVIDENCE_PENDING_ACCEPTANCE_PROOF` | Prior lineage work reported evolution to a one-to-one matcher using two authoritative evidence sources. | Exact source/blob SHA, dependencies and latest acceptance proof. |
| Latest approved candidate | `PENDING_SOURCE_ACCEPTANCE_PROOF` | No PASS is credited from “latest file” or from historical memory alone. | Locate positive acceptance evidence and bind it to exact source/blob SHA. |
| I2 owner/read-model to recompose | `PENDING_I1_ACCEPTANCE_RESOLUTION` | I2 must recompose the owner/read-model selected by I1, not invent a new financial model. | Resolve latest approved candidate first. |

## 4. Acceptance search protocol for this block

The next I1 action is limited to locating and binding positive acceptance evidence for the financial triple. Search must distinguish:

- implementation evidence from acceptance evidence;
- newest repository file from latest approved version;
- historical context from authoritative source proof;
- owner definition from owner actually executed by the canonical product composition.

Minimum acceptance binding required:

`ACCEPTANCE EVIDENCE → EXACT COMMIT/BLOB → OWNER/BRIDGES → READ/WRITE COLLECTIONS → APPROVED SEMANTICS → RUNTIME COMPOSITION TARGET`

Until this chain is closed:

- `RECIBOS_CARTERA_PRIMARY_RUNTIME = LINEAGE_IN_PROGRESS`
- `COBROS_PRIMARY_RUNTIME = LINEAGE_IN_PROGRESS`
- `LATEST_APPROVED_VERSION = PENDING`
- `I1 = IN_PROGRESS`

## 5. Hard preserves / exclusions

- No data reimport to fix runtime, visualization, routing, composition, permissions or validator defects.
- No Firebase migration or new Firebase project.
- No production change in I1.
- No product-source patch in this ledger commit.
- No baseline-historical-plus-overlay release strategy.
- No fusion of Recibos Esperados, Cartera Primas and Cobros.
- No inference from commission evidence may be converted into a direct Cobro unless the approved contract explicitly proves that behavior.
- No PASS without positive acceptance evidence linked to exact source/blob SHA.

## 6. Physical-change declaration

This ledger is recovery evidence/documentation only. It does **not** modify product runtime source, Firebase, operational data, build artifact, Preview or production.

## 7. Next field to close

`PENDING: LATEST_APPROVED_ACCEPTANCE_BINDING_FOR_FINANCIAL_TRIPLE`

Once proven, record here:

- acceptance evidence identifier;
- accepted commit SHA;
- accepted blob SHA(s);
- owner(s);
- bridges/projectors/facades;
- canonical reads/writes;
- joins/identifiers;
- approved states and reconciliation semantics;
- UI/actions/roles;
- I2 recomposition target.

**Do not advance to another capability until this financial block is resolved or a documented evidence boundary proves that a specific acceptance artifact is unavailable after exhaustive repository search.**
