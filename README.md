# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA — FUENTE VIVA ÚNICA

StateVersion canónica: `F2-R12-CONSUMED-ROOTCAUSE-OPEN-20260820-01`.

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. reglas maestras y addenda vigentes;
2. `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`;
3. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
4. `orbit360-platform/docs/orbit360-live-state-v1.json`;
5. `orbit360-platform/docs/CHECKPOINT-F2-REQUEST12-CONTINUITY-ANTIBUCLE-ROOT-CAUSE-OPEN-20260820.md`;
6. `orbit360-platform/runtime-gate-crm-v20260716/f2-continuity-audit-v20260820.json`;
7. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5.

La autoridad operativa actual es el continuity ledger. Si PR, live-state, index, lifecycle, README, CHANGELOG o checkpoint divergen de su `stateVersion`, clasificar `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT` y no avanzar.

## Estado vivo F2

- F1: `CLOSED_PASS`.
- F2 source-only: `CLOSED_PASS`.
- Candidata congelada: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`, 194 archivos.
- Request12 consumed/no-replay: run `32332301619`, artifact terminal `9393486955`.
- Request12 y su autorización: `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.
- Integridad before/after PASS; cross-tenant denied PASS; write guard PASS; Firestore/Auth/operational writes `0/0/0`.
- Fallo observado: `F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE` en `desktopDirection:polizas`, `64680 ms`, captura final visible.

## Causa raíz actual

`OPEN_SECOND_SAME_FAMILY_FAILURE`.

No se asume que el fallo sea únicamente `VALIDATOR_STALE`. Antes de cualquier sucesor se debe distinguir:

- `FUNCTIONAL_DEFECT:F2_ROUTE_MAIN_THREAD_BLOCKING_POLIZAS`; o
- `VALIDATOR_STALE:F2_ROUTE_READINESS_WAITER_MISSED_VISIBLE_STATE`.

La siguiente acción exacta es instrumentación source-only de event-loop → navegación → mount/render → readiness/poll → captura.

## Stop-retry

- Request11: no replay.
- Request12: no replay.
- Request13: no autorizado y no puede materializarse antes de prueba causal + auditoría de continuidad PASS.
- No aumentar timeout para forzar PASS.
- No modificar Pólizas antes de prueba causal.
- No deploy, publicación, producción, main ni merge bajo este bloque.

## Plan congelado

Ruta inmediata a producción: 50% cerrada hasta F2 terminal PASS. Programa integral: 25% cerrado. Estos porcentajes no se incrementan por documentación, preparación o diagnóstico.

## Gate de continuidad

`node tools/orbit360-f2-continuity-invariant-v20260820.mjs`

Solo `F2_CONTINUITY_ANTI_LOOP_AUDIT_PASS` habilita la siguiente acción técnica source-only. El historial vive en checkpoints/evidencias/requests/autorizaciones; no debe duplicarse como estado actual en múltiples owners.

<!-- ORBIT360_CURRENT_STATE_START -->
## Estado operativo vivo — autoridad única

- StateVersion: `ORBIT360-F2-CONTINUITY-CURRENT` (sin ordinal de Request).
- Fase: `F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ROOTFIX_VERIFIED`.
- Estado: `ROOTFIX_SOURCEONLY_VERIFIED_PENDING_SUCCESSOR_CANDIDATE`.
- Causa funcional: `FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`, verificada source-only.
- Artifact histórico `9387820198`: no reutilizable para runtime sucesor.
- No existe autorización runtime activa; cualquier sucesor exige candidata nueva certificada + autorización explícita fresca.
- Autoridad: `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`; writers: `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`; proyección: `tools/orbit360-continuity-sync-v20260820.mjs`.
- Los ordinales de Request pertenecen únicamente al historial/evidencia sellada.
- Siguiente acción: `PREPARE_VALIDATE_SUCCESSOR_F2_SOURCEONLY_CANDIDATE`.
<!-- ORBIT360_CURRENT_STATE_END -->
