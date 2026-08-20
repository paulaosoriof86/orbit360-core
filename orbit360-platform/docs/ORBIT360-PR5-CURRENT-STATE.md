# ESTADO VIVO CANÓNICO — F2 rootfix source-only verificado · continuidad viva

**StateVersion:** `ORBIT360-F2-CONTINUITY-CURRENT`  
Rama: `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open · sin main/merge/deploy/producción.

## Autoridad de reanudación
1. reglas maestras/addenda vigentes;
2. `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
3. `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`;
4. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
5. `orbit360-platform/docs/orbit360-live-state-v1.json`;
6. `orbit360-platform/docs/CHECKPOINT-F2-CONTINUITY-ORDINAL-FREE-SINGLE-WRITER-PASS-20260820.md`;
7. evidencia de continuidad + HEAD real.

El estado activo **no depende del ordinal de ningún Request ni de una candidata histórica**. Ambos existen solo como evidencia histórica sellada.

## Estado actual
- `F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ROOTFIX_VERIFIED` / `ROOTFIX_SOURCEONLY_VERIFIED_PENDING_SUCCESSOR_CANDIDATE`.
- Causa raíz funcional cerrada source-only: `FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`.
- Implementación: `cache.find -> clone(foundRow)`; API/aislamiento preservados y writes bloqueados.
- No existe candidata runtime sucesora certificada todavía.
- No hay autorización runtime activa ni carry-forward.

## Historial sellado
- Último runtime consumido: Request 12, run `32332301619`, no replay, cero writes.
- Artifact histórico `9387820198`: no reutilizable.

## Continuidad antibucle
- ledger único: `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
- registry de writers: `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`;
- proyección única: `tools/orbit360-continuity-sync-v20260820.mjs`;
- invariant: `tools/orbit360-f2-continuity-invariant-v20260820.mjs`.
Cualquier writer independiente, ordinal de Request o binding a candidata histórica dentro del estado/guards activos = `PIPELINE_MECHANISM_FAILURE` y bloqueo fail-closed.

## Siguiente acción exacta
`PREPARE_VALIDATE_SUCCESSOR_F2_SOURCEONLY_CANDIDATE`: Prepare and validate a new source-only F2 candidate containing the verified protected-store rootfix; do not reuse the historical artifact and do not authorize/materialize runtime until candidate certification and a fresh explicit authorization.

Ruta inmediata a producción: **50%**. Programa integral: **25%**. No aumentan por documentación.
