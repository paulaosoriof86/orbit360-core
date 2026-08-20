# CHECKPOINT — F2 continuity ordinal-free / single-writer PASS — 2026-08-20

## Bloque
`F2_CONTINUITY_ANTI_LOOP_ROOT_CAUSE_CLOSURE`

## Clasificación cerrada
`PIPELINE_MECHANISM_FAILURE` con tres causas estructurales verificadas:
1. `CONTINUITY_REQUEST_ORDINAL_CURRENT_STATE_COUPLING`;
2. `MULTIPLE_COMPETING_CONTINUITY_WRITERS`;
3. `EVIDENCE_PROPAGATION_GAP`.

## Evidencia causal
La auditoría reprodujo la divergencia real: la evidencia source-only cerró el defecto funcional de Pólizas, mientras índice/lifecycle/PR permanecieron en una frontera anterior. El primer audit v2 detectó 24 writers independientes. Tras retirarlos, el segundo audit cerró `ORBIT360_CONTINUITY_LIVE_STATE_AUDIT_PASS` con `writerOffenders=[]` y todos los checks PASS.

## Solución durable
- `orbit360-continuity-ledger-v20260820.json` v2 es la autoridad única y usa `ORBIT360-F2-CONTINUITY-CURRENT`; ningún ordinal de Request define el estado activo.
- Los ordinales de Request quedan exclusivamente en `history` como evidencia sellada/no-replay.
- `orbit360-continuity-writer-registry-v20260820.json` registra un solo owner lógico de proyección.
- `tools/orbit360-continuity-sync-v20260820.mjs` proyecta ledger → live-state/index/lifecycle/README/CHANGELOG/PR-state.
- `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml` es el único workflow canónico de proyección.
- 24 writers históricos fueron retirados a stubs manuales read-only; su historia permanece en Git.
- `tools/orbit360-f2-continuity-invariant-v20260820.mjs` falla si reaparece RequestN/RN en estado activo o si un workflow independiente escribe una proyección.

## Estado funcional F2
Causa funcional Pólizas cerrada source-only como `FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`. Rootfix protegido: `cache.find -> clone(foundRow)`, con API/aislamiento preservados y writes bloqueados.

El artifact histórico `9387820198` no es reutilizable para el runtime sucesor. No existe autorización runtime activa. No se materializa ningún nuevo Request hasta contar con candidata sucesora source-only certificada y autorización explícita fresca.

## Seguridad / alcance
Este cierre no ejecutó runtime, browser, secrets, Firestore ni datos; writes/deploy/publicación/producción/main/merge = 0.

## Siguiente acción exacta
`PREPARE_VALIDATE_SUCCESSOR_F2_SOURCEONLY_CANDIDATE`.
