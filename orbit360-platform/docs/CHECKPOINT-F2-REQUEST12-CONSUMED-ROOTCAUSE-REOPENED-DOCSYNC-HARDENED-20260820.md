# CHECKPOINT F2 — Request12 consumido · causa raíz reabierta · documentación viva endurecida

Fecha canónica: 2026-08-20
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Estado que prevalece

- F1: `CLOSED_PASS`.
- F2 source-only: `CLOSED_PASS`.
- Candidata congelada e inmutable: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`, ZIP SHA256 `58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc`, manifest SHA256 `b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb`, 194 archivos.
- Request11: consumido/no replayable. Su causa `VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_LITERAL_ADJACENCY_STALE` fue corregida con self-test semántico y gate de autorización dinámica.
- Control source-only posterior: `preflight=true`, `coherence=true`, `synthetic=true`.
- Request12: ejecutado exactamente una vez, run `32332301619`, artifact terminal `9393486955`, digest `sha256:6681ed2d681c0cf23dd06e047f56988cc93ef08f5c3bc33c3cf1c39923662ed6`.
- Request12 y su autorización: `CONSUMED_FAIL_VALIDATOR_STALE`, `allowedExecutions=0`, `consumed=true`, `replayAllowed=false`.
- Request12 alcanzó browser e integridad. Cross-tenant denegado, write-guard bloqueó escrituras e integridad before/after PASS.
- Único fallo observado: `F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE` en `desktopDirection:polizas`, tiempo observado `64680 ms`, contrato capturado visible.

## Clasificación vigente

No se declara cerrada la causa raíz de Pólizas.

Estado: `ROOT_CAUSE_REOPENED_PER_SECOND_SAME_FAMILY_FAILURE`.

Deben distinguirse antes de otro runtime:

1. `FUNCTIONAL_DEFECT` — bloqueo/rendimiento real del hilo principal o ruta Pólizas; o
2. `VALIDATOR_STALE` — waiter/readiness defectuoso que no observa un estado visible.

Está prohibido aumentar el timeout, reejecutar Request12 o crear Request13 antes de esa separación causal y de un control source-only PASS.

## Hallazgo forense de documentación

Durante la auditoría posterior a Request12 se comprobó que:

- `orbit360-platform/docs/orbit360-live-state-v1.json` todavía declaraba Request10 consumido / Request11 autorización pendiente.
- `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json` todavía apuntaba a Request10/Request11 pendiente.
- PR #5 todavía describía Request11 y su segundo control source-only como barrera actual.

Clasificación: `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_CURRENT_STATE_DUPLICATION_AND_STALE_MIRRORS`.

Este hallazgo explica por qué una conversación nueva podía reabrir etapas ya ejecutadas: las fuentes de reanudación conservaban múltiples copias contradictorias del estado actual.

## Rootfix documental

La política desde este checkpoint es:

- `orbit360-live-state-v1.json` contiene únicamente estado vivo actual; no reenumera toda la historia.
- `ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json` enlaza fuentes y estado actual mínimo; no duplica una cronología completa.
- El historial permanece en checkpoints, evidencias, requests y autorizaciones selladas.
- Request12 + autorización Request12 son la evidencia de consumo vigente.
- Cualquier continuidad debe ejecutar `node tools/orbit360-validar-current-documentation-coherence-v20260820.mjs` antes de crear un request sucesor.
- El validador debe fallar si reaparece como vigente Request10/Request11 pendiente, si Request12 deja de constar consumido/no-replayable, o si live-state e index divergen.

## Carriles

- A — producto/UX: `FROZEN_CANDIDATE_9387820198_UNTOUCHED`.
- B — backend/gates: `F2_REQUEST12_CONSUMED_ROOT_CAUSE_REOPENED_DOCSYNC_HARDENING`.
- C — datos A&S: `UNTOUCHED_ZERO_CHANGES`.

## Autorizaciones y seguridad

No existe autorización para Request13, deploy, publicación, producción, main o merge.

## Siguiente acción exacta

1. cerrar coherencia documental con validador PASS;
2. instrumentar source-only tiempos de navegación/event-loop/mount/render/readiness de Pólizas;
3. clasificar `FUNCTIONAL_DEFECT` vs `VALIDATOR_STALE` con evidencia;
4. solo después decidir si procede un sucesor runtime.

No avanzar a otro bloque mientras esta causa siga abierta.
