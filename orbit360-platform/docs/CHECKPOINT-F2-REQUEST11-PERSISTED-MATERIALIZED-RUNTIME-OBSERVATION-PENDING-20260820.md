# CHECKPOINT CANÓNICO — F2 Request11 persistido y materializado · runtime/observación pendiente

Fecha canónica: 2026-08-20 UTC.

## Autoridad operativa de este corte

- Repositorio: `paulaosoriof86/orbit360-core`.
- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open, sin merge a `main`.
- F1: `CLOSED_PASS`.
- F2 SOURCE: `CLOSED_PASS`.
- Candidata congelada: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`, 194 archivos.
- Request10: consumido una sola vez en run `32318415706`; replay prohibido.

## Causa raíz de la reincidencia Request11

Clasificación combinada:

`PIPELINE_MECHANISM_FAILURE / DOCUMENTATION_STATE_DRIFT / AUTHORIZATION_PERSISTENCE_GAP / REQUEST_MATERIALIZATION_GAP`.

La sincronización anterior de Request10 verificó solo un subconjunto de campos y permitió que espejos internos de `orbit360-live-state-v1.json` conservaran referencias antiguas. La autorización humana de Request11 quedó además únicamente en conversación y nunca se materializó en el repositorio. Por eso sesiones posteriores podían volver a declarar Request11 pendiente aunque la usuaria ya lo hubiese autorizado.

## Solución definitiva implementada

1. Autorización canónica persistida en:
   `.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json`
2. SHA256 canónico del registro:
   `d7e6bf2a110b1fc83357f7b6420f9164f77048cfae25146df15dd8cad01e1698`
3. Commit de persistencia: `e9c18005d6a3c9493249dc9db18e56b3e5cbbb0a`.
4. Gate F2 endurecido para exigir registro persistido, digest, ordinal 11, candidata exacta y alcance read-only: commit `4edb1ad1cbcec744f745191de1817626ec03f46a`.
5. Self-test `VALIDATOR_STALE` actualizado para la nueva autoridad persistida: commit `9f3857d60a16a34ffd84edc6fce7038533602eda`.
6. Request11 materializado como commit de un solo archivo: `1809552cc6dceacae1527be34299ef17b32bff98`.
7. Request11 enlaza explícitamente el registro de autorización y su SHA256; `parentHead` es exactamente `9f3857d60a16a34ffd84edc6fce7038533602eda`.
8. Request11 mantiene `writes=false`, `authWrites=false`, `membershipWrites=false`, `dataWrites=false`, `operationalWrites=false`, `deploy=false`, `publication=false`, `production=false`, `main=false`, `merge=false`.

## Regla de no regresión

Mientras exista el registro canónico anterior y Request11 físico `1809552c...`, **no volver a pedir autorización humana para Request11 y no crear Request12 como sustituto**. La autorización narrativa de `orbit360-live-state-v1.json` no es autoridad de ejecución; el contrato `F2_STABLE_BOUNDARY` ya la trata como narrativa no autoritativa. El gate runtime exige ahora la dupla `registro persistido + request inmutable`.

Los campos narrativos antiguos del `live-state` y del cuerpo previo del PR se consideran `DOCUMENTATION_STATE_DRIFT` hasta la reconciliación terminal posterior a Request11; no deben usarse para retroceder la frontera ni reabrir Request10, Pólizas, autenticación, HostDime o reimportaciones.

## Observación runtime

- Request11 target commit: `1809552cc6dceacae1527be34299ef17b32bff98`.
- Workflow target: `Orbit360 F2 Productive Acceptance Runtime Browser Readonly 20260818`.
- Observer source reutilizado y ligado a Request11; no reejecuta runtime.
- Estado en este checkpoint: `RUNTIME_TERMINAL_EVIDENCE_PENDING_OBSERVATION`.

Hasta disponer de evidencia terminal no declarar PASS/FAIL de F2, no modificar producto y no consumir otra autorización.

## Carriles

- A — frontend/UX: `FROZEN_CANDIDATE_9387820198`.
- B — backend/security/gates: `REQUEST11_PERSISTED_MATERIALIZED_RUNTIME_OBSERVATION_PENDING`.
- C — datos reales A&S: `UNTOUCHED_ZERO_CHANGES`.

## Producción

Deploy, publicación, producción, main y merge continúan no autorizados. Request11 es exclusivamente runtime/browser read-only. La autorización de F3 go-live será independiente si F2 cierra PASS.
