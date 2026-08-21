# Checkpoint F2 — pre-gate register semantic validator

Fecha: 2026-08-20
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Clasificación: `VALIDATOR_STALE`.

## Evidencia
El workflow-dispatch F2 nació correctamente en run `32435362415`. La verificación V2 del request pasó hasta el self-test, que falló con `F2_REGISTER_NOT_V2`. El register vigente sí contiene request V2, `MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT`, binding por `authorizationIdentityDigest`, status runtime transitorio V2 y guard `CANONICAL_REQUEST_NOT_ACTIVE_V2`.

La causa fue un literal obsoleto del self-test que buscaba un nombre anterior de status. Register, gate, artifact, secrets, Firestore y browser quedaron sin ejecutar; la autorización permanece no consumida.

## Corrección
El self-test valida ahora las propiedades semánticas del register V2 y no una cadena de status histórica. Reachability exige esta validación semántica dentro de `F2-RUNTIME-PREFLIGHT`.

## Alcance
Cero cambios de producto o datos. Cero reimportaciones. Cero nuevo request runtime. Cero deploy/producción/main/merge.
