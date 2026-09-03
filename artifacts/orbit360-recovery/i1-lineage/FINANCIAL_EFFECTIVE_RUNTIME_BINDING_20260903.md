# Gravicentra Insurance — I1 Financial Effective Runtime Binding

**Gate:** I1 — LINEAGE_GLOBAL  
**Scope:** Recibos Esperados → Cartera Primas → Cobros  
**Binding result:** `FINANCIAL_EFFECTIVE_RUNTIME_OWNER_BRIDGE_ASSET_BINDING = CLOSED_FAIL_CURRENT_COMPOSITION`  
**Product changes:** NONE  
**Data changes:** NONE  
**Production changes:** NONE  
**Evidence HEAD before this evidence commit:** `141fcf76f1557d77399bc81c661ae1551d281b27`  
**Evidence tree:** `79d51472e7558e858055463dc0c52a915e71e4e8`

## 1. Accepted target preserved

The existing financial lineage ledger already binds the approved composite target:

- Recibos/Cartera `9.1.0` accepted semantic/write closure.
- Cobros `10.10.2` accepted durable-ledger closure.
- They are separate accepted atoms and MUST NOT be fused.

This runtime binding does not reopen that acceptance decision. It traces what the current canonical product actually executes and compares it against those bound semantics.

## 2. Canonical current entrypoint and load chain

Canonical product entrypoint at the evidence HEAD:

- `orbit360-platform/index.html`
- blob SHA `5206cc86c2775680e04b210f4fbfc9dbf09bae34`

Relevant direct load order:

1. `product-runtime-config.js`
2. `core/product-prebootstrap-store-p0.js`
3. `data/store-firestore-product-readonly-p0.js`
4. `core/product-hydration-required-optional-p0.js`
5. `core/queries.js`
6. `core/policy-receipts-engine.js`
7. `core/policy-receipts-v1199-refinements.js`
8. `core/cobros-reconciliation-domain-client.js`
9. router/bootstrap
10. `modules/polizas.js`
11. `modules/cobros.js`
12. `modules/conciliaciones.js`
13. `modules/importar.js`
14. `modules/policy-receipts-v1199-bridge.js`
15. `modules/policy-receipts-v1199-detail-guard.js`
16. `data/store-firestore-product-operational-p0.js`
17. `core/product-app-p0.js`
18. `core/auth-product-runtime-p0.js`

The product therefore physically executes v1199-era receipt/cobro owners and bridges in the current entrypoint. File recency or load presence does not convert them into the accepted 9.1.0/10.10.2 target.

## 3. Current canonical store lifecycle

### 3.1 Prebootstrap store

`core/product-prebootstrap-store-p0.js` — blob `37ca9521443e7e4b292dc1a2d7b18828c3ecf95e`

- installs `Orbit.store` immediately;
- volatile only;
- allows only explicitly static Academia content;
- business writes are blocked.

### 3.2 Product Firestore read authority

`data/store-firestore-product-readonly-p0.js` — blob `1459384f334ee9bdf8f21dd3deb2f43e22e6396b`

- reads canonical tenant paths through the path contract;
- exact configured collections are cached in-memory from Firestore snapshots;
- browser writes are fail-closed;
- no business fallback.

`core/product-hydration-required-optional-p0.js` — blob `c2c1b8d566d2f736e83db9f17ef4e65d35c0833b`

- required collections gate readiness;
- optional collections are deferred/degradable.

`product-runtime-config.js` — blob `eb3e49ea97205a52858376bddd16944821792b91`

Current hydration contract:

- required: `clientes`, `polizas`, `cobros`, `aseguradoras`;
- optional includes `recibosEsperados`, `carteraPrimas`;
- DOES NOT include `estadosCuentaAseguradora`, `recibosAseguradora`, `conciliacionesPrimas`, `conciliaciones`, `pagosReportados`, `evidenciasCobro`, `propuestasConciliacion`, `conciliacionHolds`, `cobrosLedgerRuns` or `cobrosLedgerControl`.

This makes `cobros` startup-authoritative while the separate accepted Recibos/Cartera read models are deferred and several accepted reconciliation/ledger collections are not hydrated at all.

### 3.3 Store replacement after authentication

`core/backend-product-readonly-bootstrap-p0.js` — blob `eb3faa38a1e146089264a147cf6ef5879e9c985e`

After authenticated membership and authoritative snapshots, it executes:

`window.Orbit.store = store`

`core/product-app-p0.js` — blob `89dbf69b80e053568b1ff372bc3734cede4acc0a`

Then installs the operational writer on that new read store.

### 3.4 Product durable-write facade

`data/store-firestore-product-operational-p0.js` — blob `013aa5e472f76c58f5ef3cef053948ad1eab0ce4`

Its collection surface includes:

- `recibosEsperados → polizas`
- `carteraPrimas → polizas`
- `cobros → cobros`

Durable writes use server-owned Firebase Functions. This facade is transport/security infrastructure, not proof of the accepted financial semantic owner.

The facade does NOT authorize the 9.1.0 supporting collections `estadosCuentaAseguradora`, `recibosAseguradora` or `conciliacionesPrimas`.

Additionally, its browser API is optimistic: `insert/update/remove` mutate the pending overlay and return before the durable Functions call resolves; failed server writes are reverted asynchronously. Current v1199 business actions consume the synchronous return as success and do not await a durable ACK.

## 4. Current Recibos effective owners

### 4.1 Legacy/current v1199 generator collapses expected receipts into `cobros`

`core/policy-receipts-engine.js` — blob `1309383f483017285c6e406cab060fbe512e10fd`

`expectedReceipts(policy)` creates receipt-shaped rows, but `syncReceipts(policy)` reads and mutates:

- `S().where('cobros', ...)`
- `S().update('cobros', ...)`
- `S().insert('cobros', ...)`

It does NOT write its generated expected schedule to `recibosEsperados`.

`core/policy-receipts-v1199-refinements.js` — blob `99e83216837438db3f2f637020c931cec399ef2a`

- wraps the v1199 engine;
- does not redirect the base expected-receipt write from `cobros` to `recibosEsperados`.

### 4.2 UI bridge also treats `cobros` as receipt/portfolio surface

`modules/policy-receipts-v1199-bridge.js` — blob `a71a953568ab300d32b353b5b20ef85cbc5214c9`

It overrides current Cobros/Polizas/Cliente360 behavior. Relevant facts:

- `openPayment(receiptId)` gets the receipt from `cobros`;
- payment delegates to `Orbit.policyReceipts.applyPayment`;
- reconciliation proposal delegates to the same v1199 engine;
- Cobros KPIs are computed from `S().all('cobros')` as Pagado/Pendiente/Vencido/Por conciliar.

### 4.3 Detail guard partially uses the separated read model

`modules/policy-receipts-v1199-detail-guard.js` — blob `3f4f935409d18d47aebb239e718a9db3e34c4b2c`

This later guard creates a split runtime:

- policy receipt schedule reads `recibosEsperados`;
- applied payments read `cobros`;
- when expected receipts exist, detail uses them; otherwise it can fall back to applied rows.

Thus some policy/detail UI uses the separated collection while the base generator, global Cobros screen and aggregate queries still use `cobros` as the receipt/portfolio universe.

## 5. Current Cartera effective owner

### 5.1 Global portfolio projector is `cobros`, not `carteraPrimas`

`core/queries.js` — blob `341b0da2b9671c2791a091bee737b36a25bf81a2`

`carteraGlobal()` reads only `S().all('cobros')` and derives Pagado/Pendiente/Vencido totals. `agingVencido()`, Cliente360 summaries and related metrics also derive portfolio status from `cobros`.

`modules/cobros.js` — blob `4c2daaf9420a166583af84d00a682253ee5fef22`

The module labels itself “Cobros y cartera” and uses the same `cobros` rows plus `q.carteraGlobal()`/`q.agingVencido()`.

Therefore `carteraPrimas` is hydrated but is not the current global portfolio read owner.

### 5.2 Accepted 9.1.0 Cartera owner physically exists

`core/importa-cartera-p0.js` — blob `58d1f795c54ad06eb536e31d15597a4d1b0a5a1a`

It explicitly separates:

- insurer account status;
- insurer receipt;
- premium portfolio;
- premium reconciliation;
- payment.

Its `carteraSeed()` creates `prima_pendiente` / `cartera_primas`, explicitly `esCxCFinanciera:false`, and single-source evidence does not create payment.

`core/importa-cartera-p0-wire.js` — blob `acc9681970f7df4bef9193ab9a30ebd84bc15144`

It routes insurer statements into separate collections in this order:

1. `estadosCuentaAseguradora`
2. `recibosAseguradora`
3. `carteraPrimas`
4. `conciliacionesPrimas`

and intercepts insurer-statement inserts that otherwise target `cobros`.

### 5.3 Current product lifecycle does not reliably bind that owner to the final store

`modules/importar.js` — blob `9741c455a9d332ea90231ad59053b57452b822eb`

At module evaluation it dynamically injects the P0 policy/cartera source and wire scripts. The injected scripts are not bound to the later authenticated store installation lifecycle.

Both P0 wires call `wireStore()` immediately. Because the prebootstrap `Orbit.store` already exposes `insert/update`, their `ready()` condition succeeds against the temporary store; after success they do not subscribe for a future replacement.

Later, authenticated bootstrap replaces `window.Orbit.store` with the Firestore product store, and product-app then wraps that new store with the operational facade.

Consequences:

- if the P0 wire attaches before authenticated store replacement, its interceptor is discarded with the old store;
- if it attaches after replacement, behavior depends on timing;
- therefore the canonical product has a store-binding race rather than an immutable owner chain.

For Cartera there is a second hard incompatibility: if `importa-cartera-p0-wire.js` wraps the final operational facade, its first supporting writes target collections not authorized by `COLLECTION_MODULE/SURFACE`, so the accepted four-collection route cannot complete through the current product write facade.

`CURRENT_CARTERA_PRIMAS_SEMANTIC_OWNER_REACHABILITY = BROKEN_NONDETERMINISTIC_AND_WRITE_CONTRACT_INCOMPATIBLE`

## 6. Current import path can regress expected receipts back to `cobros`

`core/importa.js` — current importer source — still creates imported policy installments with:

`Orbit.store.insert('cobros', { id: 'cob_imp_...' ... estado:'Pendiente' ... })`

`core/importa-polizas-p0-wire.js` — blob `99da0e0310ee3d6ed185e77829f57decf4fd97d5`

is the owner that redirects these imported rows from `cobros` to `recibosEsperados`.

Because this wire is subject to the same prebootstrap/final-store attachment race, the current import behavior is not compositionally deterministic.

## 7. Current Cobros and reconciliation binding

### 7.1 v1199 direct Cobro lifecycle

`core/policy-receipts-engine.js` currently:

- looks up a “receipt” in `cobros`;
- changes the same row to `Pagado`;
- records payment data on that same row;
- creates a proposal in `conciliaciones`;
- updates the same `cobros` row with reconciliation proposal state.

This is incompatible with the accepted separation in which expected receipt, evidence/proposal/HOLD and real Cobro are not the same entity.

### 7.2 Product reconciliation domain is richer but not the accepted 10.10.2 ledger consumer

`core/cobros-reconciliation-domain-client.js` — blob `51d8c67cfda33adc8be61729da4822fde7add89d`

calls `orbit360CobrosReconciliationCommand`.

`functions/cobros-reconciliation-domain.js` — blob `ca184ec6ae64d78b893e4b3886e19fc81ad952c9`

physically proves multi-evidence semantics:

- previews against `recibosEsperados` + `evidenciasCobro`;
- direct insurer payment evidence may reconcile;
- commission recognition on an identified later installment may infer earlier installments as high-confidence evidence;
- complete insurer portfolio snapshots may support sequence inference;
- conflicts/insufficient identity do not auto-apply;
- confirmation writes a new canonical `cobros` record linked by `reciboId` and updates the `recibosEsperados` receipt as paid/conciliated.

The function is exported by the deployed Functions main `bootstrap.js` (blob `e364fdb5334e0a8363937ef53cab0403cba0df66`); `functions/package.json` (blob `bae38c0ae84a5d4f1b654899df02cd56cb6ea7fa`) sets `bootstrap.js` as `main`.

However, the accepted Cobros 10.10.2 lifecycle contract (`d4aa1e9b4f8b74a4071c6358e14d7abc39a5bc42`) requires an isolated run-scoped ledger:

- `cobrosLedgerRuns/{runId}`
- stage subcollections `pagosReportados`, `evidenciasCobro`, `propuestasConciliacion`, `conciliacionHolds`
- active pointer `cobrosLedgerControl/items/active`
- no direct visible-stage business writes.

The current reconciliation function does not resolve the 10.10.2 active pointer/run-scoped stage as its read source. It queries canonical top-level `evidenciasCobro` and `recibosEsperados` instead.

Therefore the accepted 10.10.2 durable ledger is not proven as the effective current Cobros consumer/read owner.

## 8. Conciliaciones UI is also compositionally disconnected

`modules/conciliaciones.js` — blob `cc8684af6f7d7d1e967cf1d4b4459ee28ebc5bf8`

is a read-only owner that projects `conciliaciones` + `conciliacionesPrimas` and states that payments remain separated from receipts/cartera/financial movements.

But neither `conciliaciones` nor `conciliacionesPrimas` is present in the current hydration contract. The router reactive dependency set for the `conciliaciones` route also omits both collections.

Thus this source exists and is routed, but its required read model is not bound into the canonical hydrated product store.

## 9. Exact root-cause closure for the financial runtime binding

### Symptom

- operational Firestore contains separate `recibosEsperados`, `carteraPrimas`, and `cobros` universes;
- current UI/runtime can show little/empty portfolio or payment data and can conflate expected receipts with Cobros;
- previously observed records such as `AUTO39012` cannot be trusted to project consistently through the current financial surfaces.

### Layer

`RELEASE-COMPOSITION + CANONICAL_READ_MODEL + OWNER_BINDING + WRITE_CONTRACT`

### Physical root cause

The current canonical entrypoint composes mutually inconsistent financial generations:

1. v1199 receipt generation and global portfolio UI still use `cobros` as expected-receipt + cartera + payment universe;
2. later detail UI partially reads `recibosEsperados`;
3. accepted 9.1.0 P0 import owners that separate `recibosEsperados`/`carteraPrimas` exist but are dynamically attached to `Orbit.store` before the final authenticated store is installed, creating a store-replacement race;
4. the current operational write facade cannot execute the complete accepted 9.1.0 Cartera supporting-collection route;
5. current hydration omits several required reconciliation/ledger collections;
6. current reconciliation UI expects collections that are not hydrated;
7. current product reconciliation backend contains strong multi-evidence logic but does not consume the accepted 10.10.2 active run-scoped ledger topology;
8. current v1199 actions return UI success from optimistic `Orbit.store` mutations without awaiting durable server ACK.

### Root-cause classification

`FINANCIAL_RUNTIME_DRIFT = PROVEN`

`DATA_CORRUPTION_AS_CAUSE = NOT_PROVEN`

`DATA_REIMPORT_AS_FIX = FORBIDDEN`

`REBUILD_FROM_ZERO = FORBIDDEN`

## 10. I2 recomposition target now fixed by I1 evidence

When I1 as a whole closes and I2 becomes authorized, the financial correction MUST be source/composition-only and preserve the accepted atoms:

1. bind one deterministic final-store lifecycle; no dynamic owner race;
2. preserve separate canonical meanings:
   - `recibosEsperados` = schedule/expected obligation;
   - `carteraPrimas` = insurer-reported/validated premium receivable state;
   - `cobros` = real/confirmed collection events only;
3. remove v1199 write paths that create expected receipts directly in `cobros` from effective product ownership;
4. make global Cartera projections consume the accepted separated read model rather than `cobros` alone;
5. bind all required reconciliation read collections into the canonical hydration/query contract;
6. reconcile the accepted 10.10.2 active ledger/pointer consumer with the product reconciliation domain; do not replay its consumed write request;
7. preserve multi-evidence rules and `requiere_validacion`/HOLD behavior; no one-source fictitious Cobro;
8. route durable writes through the server-owned write boundary and make business success depend on remote ACK where persistence is required;
9. keep `finmovs` separate from commercial collection;
10. preserve `AUTO39012` as regression invariant (`primaNeta = Q 1,800`, `primaTotal = Q 2,678.53`).

## 11. Binding verdict

`FINANCIAL_EFFECTIVE_RUNTIME_OWNER_BRIDGE_ASSET_BINDING = CLOSED`

`CURRENT_FINANCIAL_RUNTIME = FAIL_COMPOSITION`

`LATEST_APPROVED_FINANCIAL_TARGET = RECIBOS_CARTERA_9_1_0_PLUS_COBROS_10_10_2_COMPOSITE`

`FINANCIAL_I2_RECOMPOSITION_TARGET = PROVEN`

This closes the pending **financial runtime binding field inside I1**. It does NOT declare the financial capability Preview PASS, does NOT authorize I2 yet, and does NOT close global I1. The next valid action is to reconcile the remaining Fase A capability lineage fields against already-creditable evidence, without restarting global diagnosis.