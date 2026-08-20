# ESTADO VIVO CANÓNICO — F2 sucesor source-only certificado

**StateVersion:** `ORBIT360-F2-CONTINUITY-CURRENT`  
Rama: `ays/backend-tenant-lab-v99-20260703` · PR #5 draft/open · sin main/merge/deploy/producción.

## Autoridad de reanudación
1. reglas maestras/addenda vigentes;
2. `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
3. `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`;
4. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
5. `orbit360-platform/docs/orbit360-live-state-v1.json`;
6. `orbit360-platform/docs/CHECKPOINT-F2-SUCCESSOR-SOURCEONLY-CANDIDATE-CERTIFIED-20260820.md`;
7. evidencia de continuidad + HEAD real.

El estado activo **no depende del ordinal de ningún Request ni de una candidata histórica**. Ambos existen solo como evidencia histórica sellada.

## Estado actual
- `F2_PRODUCTIVE_ACCEPTANCE_SUCCESSOR_SOURCE_CANDIDATE_CERTIFIED` / `SUCCESSOR_SOURCEONLY_CANDIDATE_CERTIFIED_PENDING_FRESH_RUNTIME_AUTHORIZATION`.
- Causa raíz funcional cerrada source-only: `FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`.
- Implementación: `cache.find -> clone(foundRow)`; API/aislamiento preservados y writes bloqueados.
- Candidata sucesora certificada: artifact `9395391426`; source `6af0c029aebb1bfecd05569452c814584110ae4c`; ZIP SHA-256 `e1a711806d4ffd78004dbe5a30ebf8c5db59aaf23d2b8cd65e78b291cedc53d0`; manifest SHA-256 `44dee7cebb174dfd630641d1e16ac649edffec18af688b62e05ceff4dc5812a5`; 194 archivos; deltas exactos: router readiness + protected-store get rootfix.
- La certificación confirmó que el artifact histórico `9387820198` no fue utilizado.
- No hay autorización runtime activa ni carry-forward.

## Historial sellado
- Último runtime consumido: ordinal histórico 12, run `32332301619`, no replay, cero writes.
- Artifact histórico `9387820198`: no reutilizable.

## Continuidad antibucle
- ledger único: `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
- registry de writers: `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`;
- proyección única: `tools/orbit360-continuity-sync-v20260820.mjs`;
- invariant: `tools/orbit360-f2-continuity-invariant-v20260820.mjs`.
Cualquier writer independiente, ordinal de Request o binding al artifact histórico dentro del estado/guards activos = `PIPELINE_MECHANISM_FAILURE` y bloqueo fail-closed.

## Siguiente acción exacta
`AWAIT_FRESH_EXPLICIT_AUTHORIZATION_FOR_CERTIFIED_F2_SUCCESSOR_RUNTIME`: The new F2 successor candidate is certified source-only. Preserve it frozen and await a fresh explicit authorization before creating or materializing any runtime request; no authorization carry-forward, replay, deploy, publication or production action is allowed.

Ruta inmediata a producción: **50%**. Programa integral: **25%**. No aumentan por certificación source-only.
