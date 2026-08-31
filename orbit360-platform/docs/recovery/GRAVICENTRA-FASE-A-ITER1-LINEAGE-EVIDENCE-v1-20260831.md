# Gravicentra Insurance Fase A — Iteración 1 · Evidencia de lineage

Fecha: 2026-08-31  
Rama rectora: `recovery/fase-a-clean-20260831`  
Origen forense: `9c95f31461f2eabe9804625b5659bee772f5602a`  
Clasificación: `ITERATION_1_LINEAGE_EVIDENCE`  
Estado de este documento: `PASS_15_OF_15_UNIQUE_LINEAGE_IDENTIFIED`

## 1. Regla de decisión aplicada

Se aplicó `latestApprovedEvidenceWins`. La existencia de un archivo más reciente no equivale a aprobación. El artifact histórico certificado `9504702901`, source `8c9668d6d423e82826b0295431ec699390d79b4b`, se usa como evidencia de baseline aceptado, no como source final automático. Los únicos cambios de producto posteriores al baseline que entran al lineage son deltas con aceptación objetiva explícita. La composición `baseline + overlays` queda prohibida como mecanismo de release final; Iteración 2 debe materializar directamente el clean source.

Cadena probatoria común:

1. Artifact histórico `9504702901` / source `8c9668…`, F2 browser read-only PASS run `33029077881`, con rutas Inicio, Cliente 360, Aseguradoras, Ops, Leads, Pólizas y Cobros, tres roles/viewport, y relaciones cliente↔póliza↔vehículo verificadas.
2. Macro-2 source acceptance commit `842f762f199f4c7dbf13062a33ca220d92398c51`, que fija los deltas aprobados de `ui`, `queries`, proyección Cliente 360, `ciclo`, store, Inicio, Cliente 360, Aseguradoras y Cobros.
3. Cliente 360: cierre específico `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`, blob `fa50bae659ed03909a220d720fc0305838c75b31`, self-test PASS run `33116493744`.
4. Aseguradoras directorio: owner `20260829.1`, blob `9a3578a4297584274392030697a674585b53c5e0`, bootstrap blob `41c4a7c8ba46b243581f643bc057b780d03f4a00`, aceptación run `33284848913`, perfil `ASEGURADORAS_AUTHORIZED_REVEAL_V2`.
5. Startup/runtime chain: aceptación run `33315372521`, perfil `PRODUCT_VISUAL_RUNTIME_CHAIN_ROOTFIX_V1`, con hydration `15825fbe43ecd350e897d562f9e4e239bd667beb`, PWA `c7fd770b714746ade10a4d44d9853d68930da68f`, router `480f4083634d71798e4ca4ea29377c1e15c55a35`, readonly store `98b75ec3e271e1f1f659a81db080002ef023cefc` y SW `195b6909ae93769a97db375448988aa0d58d4475`.

## 2. Matriz 15/15

### 2.1 LOGIN_AND_ACCESS
- **approvalEvidence / run:** baseline artifact `9504702901` + F2 `33029077881`; runtime chain successor accepted in `33315372521`.
- **finalSourceFiles / blob:** `core/auth-product-runtime-p0.js` `8fb5586a924c91a7bf954c07c99d49191d48026e`; `core/product-runtime-browser-providers-p0.js` `4dae6c7a4fe7bf4ea668cdf8e63467bf21982d4a`; `core/product-app-p0.js` `bcffad48bcb8fef8453f04bb816ff515c042a80b`; plus accepted startup chain below.
- **finalOwner:** `core/auth-product-runtime-p0.js` (`Orbit.auth`).
- **runtimeDependencies:** Firebase Auth provider → verified human identity → membership → required server snapshots → router/app. No demo identity and no localStorage session.
- **allowedRoles:** authenticated active membership; scopes/roles resolved by membership/access contract.
- **expectedVisibleBehavior:** credential login, friendly failure, verified account, shell only after activation.
- **writeSemantics / writeRoles:** auth-session operation only; `writeAuthorized:false`; no operational Firestore write owned by Login.
- **acceptanceTest:** F2 authenticated, email verified, tenant bound, required roles resolved.
- **discarded alternatives:** legacy `core/auth.js`, demo/local identity, URL tenant, source index as authority.

### 2.2 INICIO_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** Macro-2 `842f762…` + F2 `33029077881`.
- **finalSourceFiles / blob:** `modules/inicio.js` `b1bfb0ce131848ee0892cd6aaff55b1bde2b7cd4`; `core/queries.js` `341b0da2b9671c2791a091bee737b36a25bf81a2`; accepted store blob `98b75…`.
- **finalOwner:** `modules/inicio.js`.
- **runtimeDependencies:** `Orbit.q`, `Orbit.store`, UI/kit, router.
- **allowedRoles:** module visibility/scope delegated to active membership and `Orbit.access`.
- **expectedVisibleBehavior:** lightweight CRM dashboard, KPIs, goals, renewals, overdue collections and advisor progress from live store data.
- **writeSemantics / writeRoles:** read/projection only in this capability; no persistent business mutation owned by Inicio.
- **acceptanceTest:** F2 route rendered on Dirección/Operativo/Asesor without technical copy/NaN.
- **discarded alternatives:** pre-Macro2 Inicio/read-model variants and any source newer without acceptance.

### 2.3 CLIENTE360_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** `842f762…`; dedicated closure run `33116493744`; F2 `33029077881`.
- **finalSourceFiles / blob:** `modules/cliente360.js` `fa50bae659ed03909a220d720fc0305838c75b31`; `core/client-canonical-view-projection-v20260716.js` `3681e56bc11951ee8418479cca2f0e51f4630cfc`; `core/queries.js` `341b0d…`; accepted store/hydration/router chain.
- **finalOwner:** `modules/cliente360.js`; canonical read projection owner `core/client-canonical-view-projection-v20260716.js`.
- **runtimeDependencies:** clientes/pólizas/vehículos/cobros/recibos/asesores + policy/vehicle detail guard.
- **allowedRoles:** `Orbit.access` scope: all/team/own according active role, tenant config and restrictions.
- **expectedVisibleBehavior:** client list + master-detail with policies, vehicles, collections, receipts, renewals, claims, commissions and history.
- **writeSemantics:** capability contains approved client/activity CRUD and invokes policy/collection operations; clean persistent write transport must be reconstituted under the Iteration-2 write contract instead of relying on the certified read-only store.
- **writeRoles:** authority is `Orbit.access`; ALL_ROLES may edit when permitted, Operativo may edit/create, advisor/commercial limited to explicitly permitted `complete`/own-scope operations; restrictions/extras override.
- **acceptanceTest:** source lineage closure + F2 client data/route and integrated relationship checks.
- **discarded alternatives:** using certified read-only runtime as proof that writes are closed; older Cliente360 blob; direct unscoped legacy store behavior as final write contract.

### 2.4 ASEGURADORAS_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** Macro-2 `842f762…` + F2 `33029077881` + accepted post-baseline Aseguradoras owner/bootstrap evidence.
- **finalSourceFiles / blob:** `modules/aseguradoras.js` `9c0ea8d7b160619c74a8c5ee150a1d7e89df8c23`; UX bridge `8a48a5d43dde06031803c668c0ec004d17454d24`; import bridge `fd23b68763ad6787d03d24e6251a6ee7f8344903`; resources bridge `45c2d5d5c8fa8afb11a9ff4d6aa1fb376afea509`.
- **finalOwner:** visual/CRUD owner `modules/aseguradoras.js`; edit compatibility owner delegates CRUD and does not replace it.
- **runtimeDependencies:** `Orbit.access`, store, tenant config, import contracts, operational-directory final owner.
- **allowedRoles:** view/edit by `Orbit.access`; administrator-family roles and Operativo have edit/create by canonical access unless explicitly restricted; Advisor no full operational directory.
- **expectedVisibleBehavior:** searchable/filterable insurer directory, editable ficha, controlled draft/save/cancel, linked products/docs/commissions/resources.
- **writeSemantics:** CRUD of insurer records, activation/deactivation with reason/audit, draft→save; credential secret mutation is not owned by ordinary store write.
- **writeRoles:** canonical authority `Orbit.access`, not the local fallback list. Admin/AdminTenant/SuperAdmin/Dirección + Operativo are operationally authorized subject to restrictions; Advisor only with explicit later permission and never full directory by default.
- **acceptanceTest:** F2 route/role visibility plus explicit latest operational owner acceptance.
- **discarded alternatives:** local fallback role list as authority; old credentialRef-only presentation as final operational-directory semantics.

### 2.5 ASEGURADORAS_OPERATIONAL_DIRECTORY
- **approvalEvidence / run:** `33284848913`, `ASEGURADORAS_AUTHORIZED_REVEAL_V2`.
- **finalSourceFiles / blob:** `core/client-insurer-operational-directory-owner-v20260722.js` `9a3578a4297584274392030697a674585b53c5e0`; `core/router-tenant-config-product-bootstrap-p0.js` `41c4a7c8ba46b243581f643bc057b780d03f4a00`; field policy `1812d867863a19c0d51404de73cf734dd1d15868`; secure target bridge + secure resource field dependencies from certified package.
- **finalOwner:** `clientInsurerOperationalDirectoryOwner`, version `20260829.1`.
- **runtimeDependencies:** insurer record/direct credential values or provider reference, field policy, role/access policy, bootstrap reachability.
- **allowedRoles:** **Operativo, Admin, AdminTenant, SuperAdmin, Dirección** full visibility. Advisor: not authorized unless explicitly approved later.
- **expectedVisibleBehavior:** full portal/account directory; username visible/copyable; password temporarily revealable/copyable then rehidden; bank account details visible/copyable for authorized roles.
- **writeSemantics / writeRoles:** this owner is read/reveal (`writesStore:false`, `reimportsData:false`); insurer CRUD remains with Aseguradoras primary; secure credential mutation must use the secure write contract.
- **acceptanceTest:** exact owner+bootstrap blob acceptance in run `33284848913`.
- **discarded alternatives:** restored baseline owner blob, UI hiding as security, Advisor full visibility, historical overlay transport as final release mechanism.

### 2.6 OPS_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** baseline/F2 `33029077881`; Phase-A Ops/Leads source gate evidence; shared `ciclo` included in Macro-2 `842f762…`.
- **finalSourceFiles / blob:** `modules/ops.js` `c7fc79145d2cf54563ead5d68df131e009381dd5`; `core/ciclo.js` `1809ff73e8cdbceb908aa65b3aaf177f5ebee908`; domain client `6344f4c32e2a312c5e0807047ad090632aa79fdb`; domain bridge `571213009bba65b0af59d03675179a6a6fed3d9a`; workflow bridge `de8af1c093edeea995b065b17295b811a9c609a0`.
- **finalOwner:** projection `modules/ops.js`; business-cycle owner `core/ciclo.js`; durable command adapter `core/ops-leads-domain-client.js` when feature-gated backend is active.
- **runtimeDependencies:** shared `negocios` + `gestiones`, `Orbit.access`, clients/insurers/advisors, router/store.
- **allowedRoles:** Dirección/administrators/Operativo according scope; Advisor sees only related own-scope processes.
- **expectedVisibleBehavior:** operational Kanban for quotes/inspections/emissions + administrative management; live synchronization with Leads.
- **writeSemantics:** create/update/archive businesses and managements, transitions/assignment/resolve/reopen; durable backend command mapping when enabled.
- **writeRoles:** canonical `Orbit.access`: ALL_ROLES when permitted; Operativo edit/create/complete; Advisor only explicitly allowed completion within own scope.
- **acceptanceTest:** F2 route on three role/viewports; historical Phase-A source gate checks Ops+Leads+Cliente360 and zero unintended writes during validation.
- **discarded alternatives:** independent Ops store or separate duplicated business entity; historical mutable gate as current authority.

### 2.7 LEADS_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** same shared-cycle evidence as Ops; F2 `33029077881`; `842f762…` for `core/ciclo.js`.
- **finalSourceFiles / blob:** `modules/leads.js` `e25b6ea1660a415e3ebdba3c22ccfcd8e1236765`; `core/ciclo.js` `1809ff…`; domain client/bridge as above.
- **finalOwner:** projection `modules/leads.js`; business owner `core/ciclo.js`.
- **runtimeDependencies:** same `negocios` records used by Ops; assigned-management projection; access/session.
- **allowedRoles:** scoped by active membership; Advisor own pipeline; broader roles according configured scope.
- **expectedVisibleBehavior:** commercial pipeline with mirrored operational stages, cadences and live Ops synchronization.
- **writeSemantics:** create/update lead/business, stage transition, lost/archive/close; emission creates linked client exactly once.
- **writeRoles:** must be enforced through the Iteration-2 canonical access/write contract; administrator/Operativo according permission and Advisors only within own permitted workflow.
- **acceptanceTest:** F2 Leads route + shared-cycle source gate.
- **discarded alternatives:** duplicated Leads persistence separate from Ops; UI-only role assumptions as security.

### 2.8 POLIZAS_PRIMARY_RUNTIME
- **approvalEvidence / run:** certified baseline/F2 `33029077881` with full-page policy; policy/receipt engine is a certified direct dependency.
- **finalSourceFiles / blob:** `modules/polizas.js` `46b197a77c162c88af498b5a89a759386a36e9e7`; `core/policy-receipts-engine.js` `1309383f483017285c6e406cab060fbe512e10fd`; refinements `99e83216837438db3f2f637020c931cec399ef2a`; bridge `a71a953568ab300d32b353b5b20ef85cbc5214c9`; detail guard `3f4f935409d18d47aebb239e718a9db3e34c4b2c`.
- **finalOwner:** UI `modules/polizas.js`; transactional write owner `Orbit.policyReceipts`.
- **runtimeDependencies:** clientes, aseguradoras, recibos/cobros, vehicle relation, access, primas.
- **allowedRoles:** scoped read through access.
- **expectedVisibleBehavior:** policy list/detail, exact premium semantics, linked customer/insurer/vehicle/receipts.
- **writeSemantics:** idempotent/non-destructive create/update policy + receipt synchronization; active states generate cartera; paid receipts preserved; critical post-payment changes require controlled endoso/motive.
- **writeRoles:** Dirección, SuperAdmin, AdminTenant, Admin, Operativo or explicit `polizas_editar`; explicit restrictions deny.
- **acceptanceTest:** F2 policy route/full-page + source engine contract.
- **discarded alternatives:** destructive receipt regeneration, independent receipt numbering, direct legacy policy writes as final contract.

### 2.9 VEHICULOS_PRIMARY_RUNTIME
- **approvalEvidence / run:** certified baseline/F2 `33029077881` integrated check (`hasVehicle`, policy/client relation match, vehicle full-page).
- **finalSourceFiles / blob:** `modules/policy-receipts-v1199-detail-guard.js` `3f4f935409d18d47aebb239e718a9db3e34c4b2c`; `core/policy-receipts-engine.js` `130938…`; `modules/cliente360.js` `fa50bae…`; `modules/polizas.js` `46b197…`.
- **finalOwner:** canonical policy/vehicle read-model + full-page detail guard; creation/update occurs as part of policy workflow.
- **runtimeDependencies:** `vehiculos`, `polizas`, `clientes`, insurer, access/store.
- **allowedRoles:** inherited record scope from policy/client via `Orbit.access`.
- **expectedVisibleBehavior:** complete vehicle page, normalized plate/year/chassis/motor/use, linked policy and customer, responsive detail.
- **writeSemantics / writeRoles:** vehicle mutation is subordinate to authorized policy workflow; no independent competing vehicle store owner.
- **acceptanceTest:** F2 integrated relationship + vehicle full-page PASS.
- **discarded alternatives:** nonexistent standalone `vehiculos.js` as required owner; vehicle records detached from policy/client lineage.

### 2.10 RECIBOS_CARTERA_PRIMARY_RUNTIME
- **approvalEvidence / run:** certified baseline/F2 `33029077881`, `recibosEsperados:true`; policy-receipt engine certified package member.
- **finalSourceFiles / blob:** `core/policy-receipts-engine.js` `130938…`; `core/policy-receipts-v1199-refinements.js` `99e832…`; bridge `a71a953…`; detail guard `3f4f935…`.
- **finalOwner:** `Orbit.policyReceipts` for generation/sync; detail guard for canonical read model.
- **runtimeDependencies:** policy state/premium/frequency, cobros store, client/advisor/insurer links.
- **allowedRoles:** read by record scope; mutations through policy/payment permissions.
- **expectedVisibleBehavior:** active-policy receipt schedule, chronological detail, cartera states, totals preserving paid history.
- **writeSemantics:** idempotent sync; reuse/update pending receipts, preserve paid/conciliated, annul duplicate non-paid rather than destructive deletion; inactive policies do not create active cartera.
- **writeRoles:** policy managers for schedule-changing policy operations; reconciliation roles for payment application.
- **acceptanceTest:** F2 integrated receipt expectation + engine invariants.
- **discarded alternatives:** destructive delete/recreate; treating reported payment as reconciled; standalone receipt module not present in accepted composition.

### 2.11 COBROS_PRIMARY_RUNTIME
- **approvalEvidence / runOrCommit:** Macro-2 `842f762…`; F2 `33029077881`.
- **finalSourceFiles / blob:** `modules/cobros.js` `4c2daaf9420a166583af84d00a682253ee5fef22`; `core/policy-receipts-engine.js` `130938…`; `core/cobros-reconciliation-domain-client.js` `990a6541c1f657a5116a7ffc67cfea0e519986e1`.
- **finalOwner:** UI `modules/cobros.js`; payment state owner `Orbit.policyReceipts.applyPayment`; reconciliation adapter for durable reconciliation workflow.
- **runtimeDependencies:** policy active state, receipts/cobros, access, reconciliation/audit.
- **allowedRoles:** read by scope.
- **expectedVisibleBehavior:** pending/vencido/pagado/conciliado semantics remain distinct; no automatic financial movement from payment confirmation.
- **writeSemantics:** idempotent apply payment; requires pending/vencido + active policy; reported payment requires validation; reconciliation proposal is separate and audited.
- **writeRoles:** Dirección, SuperAdmin, AdminTenant, Admin, Operativo, Finanzas or explicit `cobros_aplicar`; restrictions deny.
- **acceptanceTest:** F2 Cobros route + certified engine contract.
- **discarded alternatives:** payment report=payment application; payment=bank reconciliation; write path that also invents `finmovs`.

### 2.12 ROLE_SCOPE_RUNTIME
- **approvalEvidence / run:** certified baseline + F2 role matrix `33029077881`.
- **finalSourceFiles / blob:** `core/access-scope.js` `ea36eb157a0a5b1f3011cdcdb770fcad62e1b7c6`; `core/access-role-session-owner-v20260728.js` `3101898f8551c55d23db6d09b633f3132896502c`; `core/access-ceilings-v1199.js` `729058513f335001d9b1c0124855a0a99a95aa0b`; `core/product-role-taxonomy-p0.js` `ddce22ef21ba546a6f9f8ec20f3b4e83976946e4`; membership contract/effective blobs `3b041af…` / `3b2a8e…`.
- **finalOwner:** `Orbit.access`; session active-role owner supplies the active role.
- **runtimeDependencies:** auth/membership, tenant role matrix, advisor extras/restrictions, record relations.
- **allowedRoles:** ALL_ROLES=`Dirección, SuperAdmin, AdminTenant, Admin`; team roles include Operativo; own roles include Asesor-family. Exact module visibility still respects tenant/restrictions.
- **expectedVisibleBehavior:** fail-closed module/country/scope/record filtering; AdminTenant receives all-scope ceiling; Advisor receives own-scope ceiling unless explicit narrower/extra contract.
- **writeSemantics:** permission decision, not an independent business-data writer.
- **writeRoles:** ALL_ROLES edit by default when module visible; Operativo edit/create/complete/manage_documents; Advisor/Comercial only `complete`; matrix/extras/restrictions can override and deny wins.
- **acceptanceTest:** F2 roles resolved and cross-tenant denied.
- **discarded alternatives:** UI hiding as security; module-local fallback role lists as final authority.

### 2.13 CROSS_MODULE_RELATIONSHIPS
- **approvalEvidence / run:** F2 `33029077881` verified client exists, vehicle-policy match and vehicle-client match; shared Ops↔Leads cycle evidence.
- **finalSourceFiles / blob:** `core/ciclo.js` `1809ff…`; `core/queries.js` `341b0d…`; policy engine `130938…`; detail guard `3f4f935…`; Cliente360 `fa50bae…`.
- **finalOwner:** no independent duplicate store; relations are owned by their domain owners: commercial cycle for Ops↔Leads, policy engine for policy↔receipt/payment, canonical read model for client↔policy↔vehicle.
- **runtimeDependencies:** stable IDs and tenant/scope relations across clientes, negocios, gestiones, polizas, vehiculos, cobros/recibos.
- **allowedRoles:** inherited from each domain's `Orbit.access` permission and record scope.
- **expectedVisibleBehavior:** one business reflected in Ops/Leads; issuance links/creates client once; policy/vehicle/client links remain consistent; receipts stay attached to policy.
- **writeSemantics:** writes are delegated atomically/idempotently to domain owners; relationship capability does not own a second write path.
- **writeRoles:** inherited per domain.
- **acceptanceTest:** F2 integrated relation checks plus shared-cycle source contract.
- **discarded alternatives:** duplicate Ops/Leads records; independent vehicle/receipt owners; repair by reimport.

### 2.14 SINGLE_PRODUCT_ENTRYPOINT
- **approvalEvidence:** certified artifact physical `index.html`, artifact `9504702901`, index SHA-256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4`, direct asset inventory 115.
- **finalSourceFiles / owner:** **reference identified, source must be reconstituted in Iteration 2** from the certified direct-asset inventory with accepted successor replacements. `index.html` at forensic source (`dec0aaba…`) is explicitly not the product-entrypoint authority.
- **runtimeDependencies:** exactly the certified product assets, with final owners above and accepted successor blobs substituted directly in clean source.
- **allowedRoles:** N/A; entrypoint loads access/auth owners, which enforce roles.
- **expectedVisibleBehavior:** one canonical production `index.html`; no LAB/seeds/auth-LAB entrypoint; all required owners reachable.
- **writeSemantics / writeRoles:** N/A.
- **acceptanceTest:** artifact index/manifest physically inspected; 115 direct assets reconstructed.
- **discarded alternatives:** source historical index as authority; baseline+overlay runtime composition; package membership without reachability.
- **lineage state:** `UNIQUE_APPROVED_REFERENCE_IDENTIFIED_RECONSTITUTE_ITERATION_2`.

### 2.15 STARTUP_PERFORMANCE
- **approvalEvidence / run:** accepted rootfix run `33315372521`, stage source manifest `product-visual-runtime-rootfix-v6-20260830`.
- **finalSourceFiles / blob:** hydration `15825fbe43ecd350e897d562f9e4e239bd667beb`; PWA `c7fd770b714746ade10a4d44d9853d68930da68f`; router `480f4083634d71798e4ca4ea29377c1e15c55a35`; readonly store `98b75ec3e271e1f1f659a81db080002ef023cefc`; `sw.js` `195b6909ae93769a97db375448988aa0d58d4475`; auth/provider/app as Login lineage.
- **finalOwner:** startup chain is multi-owner by contract: auth → membership/backend bootstrap → required hydration → router/app; PWA/SW are non-blocking ancillary owners.
- **runtimeDependencies:** provider, auth, membership, required server snapshots, router, app; PWA must not gate router.
- **allowedRoles:** N/A until authenticated membership; role resolution occurs in access chain.
- **expectedVisibleBehavior:** login/first render do not wait for service worker or nonessential modules; server-confirmed required hydration; network-first runtime contract with cache fallback.
- **writeSemantics / writeRoles:** startup itself does not own business writes.
- **acceptanceTest:** exact five rootfix blobs accepted by run `33315372521`; runtime/performance proof must be rerun on clean composition in later gates.
- **discarded alternatives:** historical 30/120-second wait success path; PWA-gated router; cache-only required readiness.
- **lineage state:** `UNIQUE_APPROVED_REFERENCE_IDENTIFIED_RECONSTITUTE_ITERATION_2`.

## 3. Resultado del gate

- Capabilities requeridas por manifiesto: **15**.
- Lineage único identificado: **15/15**.
- `LINEAGE_CONFLICT`: **0**.
- Capability Fase A adicional formalmente aprobada fuera del manifiesto prevalente encontrada durante esta reconstrucción: **0**.
- Producción tocada: **NO**.
- Firebase/datos tocados: **NO**.
- Source de producto modificado: **NO**.
- Build/deploy ejecutado: **NO**.
- Overlay histórico adoptado como release final: **NO**.

## 4. Frontera del siguiente gate

Iteración 1 puede cerrarse `PASS` porque se alcanzó el criterio `100% capabilities con lineage único`.

Esto **no** declara PREVIEW_PASS, LIVE_PASS ni PRODUCTION_ACCEPTED. Tampoco declara que el runtime read-only histórico pruebe las escrituras aprobadas. Iteración 2 debe materializar el clean tree directamente —sin overlays—, reconstituir el único entrypoint, asegurar reachability de los owners finales, reconectar/validar contratos de escritura y corregir startup/performance antes de construir el artifact inmutable.
