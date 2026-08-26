# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield; el estado operativo vigente se mantiene en la rama obligatoria y PR #5 draft/open, sin merge ni producción salvo autorización explícita.

## [CONTROL-PLANE-SINGLE-STATE] — 2026-08-26
### Changed
- El ledger queda como única autoridad mutable del estado operativo.
- Package, boundary, lifecycles, live-state, current-index, checkpoint, PR-state, README y esta sección current dejan de replicar estado vivo.
- El PR técnico se retira como transporte de ejecución; se adopta rama efímera + un único commit de intent.
- Toda transición con riesgo reclama primero el ledger por CAS; solo después puede acceder a capacidades privilegiadas.
- Projection core/atomic quedan como compatibilidad sin mutación.
### Current-state rule
El estado vivo debe leerse exclusivamente desde `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json` y el HEAD vivo de PR #5. No se duplica aquí.

## [F2-CONTINUITY-R12] — 2026-08-20 UTC · StateVersion `F2-R12-CONSUMED-ROOTCAUSE-OPEN-20260820-01`
### Verified
- Request12 ejecutado exactamente una vez: run `32332301619`, artifact terminal `9393486955`.
- Request12 y autorización sellados: `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.
- Integridad before/after PASS; cross-tenant denied PASS; write guard PASS; Firestore/Auth/operational writes `0/0/0`.
- Fallo observado: `F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE` en Dirección desktop → Pólizas, elapsed `64680 ms`, captura final visible.
### Root cause
- Estado causal histórico: `OPEN_SECOND_SAME_FAMILY_FAILURE`.
- No se asume clasificación final hasta separar `FUNCTIONAL_DEFECT:F2_ROUTE_MAIN_THREAD_BLOCKING_POLIZAS` de `VALIDATOR_STALE:F2_ROUTE_READINESS_WAITER_MISSED_VISIBLE_STATE` mediante instrumentación source-only.
- Causa del bucle documental registrada: `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT`.

## [F1.3] — 2026-08-18 GT · Membership email ownership rootfix source-only PASS
### Root cause
- La observación read-only consumida `32175674293` aisló `membership_invalid:email_invalido` dentro del bootstrap productivo.
- Clasificación final: `VALIDATOR_STALE / MEMBERSHIP_EMAIL_REQUIRED_STALE_AUTH_IDENTITY_OWNERSHIP`.
### Verified
- Evidencia `runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json`.
- Email ausente PASS; formato inválido BLOCK; email presente igual a Auth PASS; email distinto de Auth BLOCK.

## [M5-5.0.12] — 2026-07-29 UTC · Access/membership projection + RC ae6bb2a3
### Verified
- Verificación final run `30460202680`, job `90603978220`, artifact `8727238222`.
- Workflow safety 13/13; preflight 36/36; fixture membership 23/23.

## [M4-4.2.11] — 2026-07-28 · Corrección durable 61 clientes GT/GTQ + cierre M4
### Verified
- Preflight 27/27; contrato 43/43; run `30397573914` SUCCESS.
- Conteos preservados: 414 clientes / 26 aseguradoras.

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93
