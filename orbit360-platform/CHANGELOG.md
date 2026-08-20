# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [F2-CONTINUITY-R12] — 2026-08-20 UTC · StateVersion `F2-R12-CONSUMED-ROOTCAUSE-OPEN-20260820-01`
### Verified
- Request12 ejecutado exactamente una vez: run `32332301619`, artifact terminal `9393486955`.
- Request12 y autorización sellados: `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.
- Integridad before/after PASS; cross-tenant denied PASS; write guard PASS; Firestore/Auth/operational writes `0/0/0`.
- Fallo observado: `F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE` en Dirección desktop → Pólizas, elapsed `64680 ms`, captura final visible.
### Root cause
- Estado causal: `OPEN_SECOND_SAME_FAMILY_FAILURE`.
- No se asume clasificación final hasta separar `FUNCTIONAL_DEFECT:F2_ROUTE_MAIN_THREAD_BLOCKING_POLIZAS` de `VALIDATOR_STALE:F2_ROUTE_READINESS_WAITER_MISSED_VISIBLE_STATE` mediante instrumentación source-only.
- Causa del bucle documental: `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT`; ledger, live-state, index, lifecycle, README, CHANGELOG y PR deben compartir la misma StateVersion.
### State
- Candidata `9387820198` congelada y sin cambios funcionales por Request11/12.
- No Request11/12 replay; no Request13 antes de prueba causal + continuity audit PASS; no aumento de timeout; no mutación Pólizas; no deploy/publicación/producción/main/merge.
- Siguiente acción exacta: instrumentación source-only event-loop → navegación → mount/render → readiness/poll → captura.

## [F1.3] — 2026-08-18 GT · Membership email ownership rootfix source-only PASS
### Root cause
- La observación read-only consumida `32175674293` aisló `membership_invalid:email_invalido` dentro del bootstrap productivo, después de Auth/membership/tenant PASS y antes de runtime/store/router.
- Clasificación final: `VALIDATOR_STALE / MEMBERSHIP_EMAIL_REQUIRED_STALE_AUTH_IDENTITY_OWNERSHIP`.
- El contrato base de membership exigía correo obligatorio, aunque la identidad de correo canónica pertenece a Auth y el reconciliador vigente solo compara `email/correo` de membership cuando el campo existe.
### Fixed
- `core/membership-multirol-contract-p0.js`: email de membership pasa a opcional; si existe conserva validación de formato; Auth queda declarado owner de identidad email.
- `core/backend-product-readonly-bootstrap-p0.js`: si membership trae email debe coincidir con Auth; si lo omite no se inventa ni se escribe.
- `tools/orbit360-validar-membership-multirol-p0.mjs`: fixture source-only cubre email ausente, formato inválido, match y mismatch con Auth.
- Workflow existente de membership amplía su alcance a contrato efectivo + bootstrap y persiste evidencia sanitizada; no se creó gate paralelo.
### Verified
- Evidencia `runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json`.
- `F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS`; `failed=[]`; `staticViolations=[]`.
- Email ausente PASS; formato inválido BLOCK; email presente igual a Auth PASS; email distinto de Auth BLOCK.
- F1.3: browser/runtime/secrets/Firebase/data access = 0; Firestore/Auth/operational writes = 0; deploy/rebuild/reset/usuarios/membership/data changes = 0.
### State
- F1.1 CLOSED; F1.2A CLOSED; F1.2B CLOSED/CONSUMED; F1.3 CLOSED/PASS; F1.4 pendiente de autorización runtime/browser.
- F1 = 80% interno por 4/5 hitos; ruta inmediata cerrada permanece 20% y programa integral 10% hasta cerrar F1.
- Siguiente frontera histórica: `F1_4_SINGLE_RUNTIME_ROOTFIX_CONFIRMATION`.

## [M5-5.0.12] — 2026-07-29 UTC · Access/membership projection + RC ae6bb2a3
### Fixed
- `core/access-role-session-owner-v20260728.js` v`20260729.3` proyecta membership LAB desde `tenants/{tenantId}/members/{authenticatedUid}` usando tenant del runtime y UID Firebase autenticado.
- La proyección se instala únicamente en `Orbit.auth.productUser`; no sobrescribe `Orbit.auth.user()`.
- Missing/invalid membership permanece fail-closed; no se restauró el fallback legado de rol/asesor hardcodeados.
- Sin tenant, UID, asesor, correo ni rol fallback hardcodeados.
### Verified
- Verificación final run `30460202680`, job `90603978220`, artifact `8727238222`, digest `sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378`.
- Workflow safety 13/13; preflight 36/36; fixture membership 23/23.
- Fixture válida, inexistente e inválida; cero escrituras Firestore y operativas.
### State
- `M5_MEMBERSHIP_PROJECTION_512_STATIC_CLOSED_NEW_RC_READY_FOR_HOSTING`.

## [M4-4.2.11] — 2026-07-28 · Corrección durable 61 clientes GT/GTQ + cierre M4
### Changed
- Aplicadas exactamente 61 correcciones autorizadas: `pais=GT`, `moneda=GTQ`.
- Los otros 353 clientes conservaron digest idéntico antes/después.
### Verified
- Preflight 27/27; contrato 43/43; run `30397573914` SUCCESS.
- Conteos preservados: 414 clientes / 26 aseguradoras; moneda faltante 0; target-only 0/0.
### State
- M4: `M4_CLOSED_SUCCESS`.
- Pólizas permanece bloqueado y requiere fuente real vigente específica.

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93

<!-- ORBIT360_CURRENT_STATE_START -->
## [F2-CONTINUITY-CURRENT] — 2026-08-20 UTC · `ORBIT360-F2-CONTINUITY-CURRENT`
- Estado activo ordinal-free y guards desacoplados de Request/artifact histórico.
- Rootfix source-only verificado: `F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`.
- Candidata sucesora source-only: CERTIFICADA artifact `9395391426`, 194 archivos, rehash completo.
- Runtime consumido y artifact previo permanecen como historia sellada; no replay/reuse.
- Un solo owner de proyección: `tools/orbit360-continuity-sync-v20260820.mjs`.
<!-- ORBIT360_CURRENT_STATE_END -->
