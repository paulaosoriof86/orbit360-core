# CHECKPOINT — CONTROL PLANE HARDENING / PRODUCTION REOPENING PACKAGE

Fecha: 2026-08-20  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `OPEN_FAIL_CLOSED`

## Regla de reanudación obligatoria

Mientras `orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json` no esté en `CLOSED_PASS`, **este checkpoint y el package prevalecen sobre cualquier checkpoint anterior, proyección antigua o cuerpo del PR que contradiga el HEAD más nuevo**.

Una conversación nueva debe leer reglas maestras/addenda → ledger → production reopening package → este checkpoint → `tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json` → HEAD/PR y continuar exactamente desde `firstIncompleteStep`.

No se reabren pasos PASS sin evidencia nueva. No se solicita runtime, no se crea un nuevo ordinal y no se usa autorización histórica mientras el package esté abierto.

## Estado congelado

- Candidata F2 certificada: artifact `9395391426`.
- Candidate source HEAD: `6af0c029aebb1bfecd05569452c814584110ae4c`.
- Artifact digest: `c089ea81672225876f643399b970d1e50e7d9cdc084dfc75973e00ed8581c53c`.
- Producto y datos: congelados.
- Ruta inmediata a producción: 50%.
- Programa integral: 25%.

## Causa raíz sistémica

`PIPELINE_MECHANISM_FAILURE:CONTROL_PLANE_NOT_FULLY_ATOMIC`

Componente `VALIDATOR_STALE:CONTRACT_VERSION_DRIFT`: **cerrado source-only en CP-01/CP-02**.

La autoridad activa F2 es ahora únicamente:

`tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json`

con `gateContractVersion=2.2.0`, candidata `9395391426`, source HEAD `6af0c029...` y sin `defaultRequest`/ordinal activo.

El registry F2, lifecycle source, lifecycle runtime y preflight obligatorio quedaron re-vinculados a esa autoridad. El preflight ya no contiene una versión F2 hard-codeada: la deriva del archivo canónico.

## Request14 — sellado

Run `32344210222`: `VALIDATOR_STALE:F2_ACTIVE_PIPELINE_HISTORICAL_CANDIDATE_LITERAL`, pre-gate, cero writes, sin browser/runtime efectivo, sin secrets/Firestore.

Request14 y su autorización quedaron reconciliados como `CONSUMED_FAIL_VALIDATOR_STALE`, `allowedExecutions:0`, `consumed:true`, `authorizationFrozen:true`, `replayAllowed:false`. No hay carry-forward.

## Secuencia obligatoria

- CP-00 — PASS: lock + candidata congelada.
- CP-01 — PASS: autoridad única F2 + Request14 reconciliado.
- CP-02 — PASS: preflight deriva contrato F2 desde autoridad canónica y no desde copia hard-codeada.
- CP-03 — PENDING: writer único del ledger con `expectedRevision`.
- CP-04 — PENDING: proyección atómica; eliminar publicación posterior a rebase silencioso.
- CP-05 — PENDING: composite invariant del control plane completo.
- CP-06 — PENDING: synthetic transversal de amplificación `Orbit.store`.
- CP-07 — PENDING: aislar superficie legacy de workflows.
- CP-08 — PENDING: una auditoría integral source-only/sintética.
- CP-09 — PENDING: readback independiente del control plane.
- CP-10 — PENDING: cerrar package solo con todos los PASS.
- CP-11 — BLOCKED por CP-10: frontera para futura autorización runtime.

## Siguiente acción exacta

`CP-03_CREATE_SINGLE_REVISIONED_LEDGER_MUTATION_OWNER`

No corresponde pedir autorización runtime ni crear Request15.

## Límites

`runtime=false` · `browser=false` · `secrets=false` · `firestoreRead=false` · `writes=0` · `deploy=false` · `publication=false` · `production=false` · `main=false` · `merge=false`.

## Presupuesto

Hardening: macroiteración 2 de 3 objetivo completada al cerrar CP-01/CP-02. Techo de hardening: 4. Camino limpio posterior hasta go-live: 3 macroiteraciones. Techo metodológico total desde CP-00: 8.
